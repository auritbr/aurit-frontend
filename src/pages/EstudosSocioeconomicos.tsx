import { ROTA_PERFIL_SOCIOECONOMICO } from "@/config/rotas";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Coins,
  CircleCheck,
  HandCoins,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/FieldLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { QuickFilterCards } from "@/components/list/QuickFilterCards";
import { SortableTh, type SortDir } from "@/components/list/SortableTh";
import { DataTablePagination } from "@/components/DataTablePagination";
import { TableCellText } from "@/components/TableCellText";
import { FormSearchableSelect } from "@/components/FormSearchableSelect";
import {
  FAIXAS_RENDA,
  faixaRendaDe,
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  media,
  mediana,
  temBeneficioSocial,
} from "@/lib/perfilSocioeconomico";
import { usePagination } from "@/hooks/usePagination";
import { getOrganizacaoSelecionadaId } from "@/lib/configuracaoEmpresaStore";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  usuarioTemPermissao,
} from "@/lib/permissoes";
import {
  dataBR,
  concluirEstudo,
  formatBRL,
  inativarEstudo,
  listarEstudos,
  obterDetalhesEstudos,
  reabrirEstudo,
  type ResumoEstudo,
} from "@/lib/estudosSocioeconomicos";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";

const colunas = [
  { key: "nomeParticipante", header: "Nome do participante" },
  { key: "dataEstudo", header: "Data do estudo" },
  { key: "quantidadePessoasFamilia", header: "Pessoas na família" },
  { key: "rendaFamiliar", header: "Renda familiar" },
  { key: "rendaPerCapita", header: "Renda per capita" },
  { key: "ativo", header: "Situação" },
] as const;

type Coluna = (typeof colunas)[number]["key"];
type Situacao = "RASCUNHO" | "CONCLUIDO" | "todos";
const filtrosIniciais = {
  situacao: "todos" as Situacao,
  ano: "todos",
  pessoas: "todos",
  renda: "todos",
  composicao: "todos",
  rendaPerCapita: "todos",
};
const filtrosSelecao = [
  { key: "ano", label: "Ano do estudo" },
  { key: "pessoas", label: "Pessoas na família" },
  { key: "renda", label: "Faixa de renda familiar" },
  { key: "composicao", label: "Composição familiar" },
  { key: "rendaPerCapita", label: "Renda per capita" },
] as const;
const opcao = (value: string, label = value) => ({ value, label });

const situacaoLabel = (estudo: ResumoEstudo) =>
  estudo.situacao === "CONCLUIDO" ? "Concluído" : "Rascunho";
const renda = (valor: number | null) =>
  valor === null ? "Não informada" : formatBRL(valor);
const perCapita = (valor: number | null) =>
  valor === null ? "Não calculada" : formatBRL(valor);
const estiloCampo =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";
const estiloCelula =
  "whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground";

export default function EstudosSocioeconomicos() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const participanteId = params.get("participante") ?? "";
  const org = getOrganizacaoSelecionadaId();
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [rascunho, setRascunho] = useState(filtrosIniciais);
  const [participanteRascunho, setParticipanteRascunho] = useState<
    string | null
  >(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "estudos-socioeconomicos:pesquisa-avancada",
    !!participanteId,
  );
  const [sort, setSort] = useState<{ key: Coluna; dir: SortDir }>({
    key: "dataEstudo",
    dir: "desc",
  });
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const client = useQueryClient();
  const { data: permissoes = permissoesVazias } = useQuery({
    queryKey: ["permissoes-estudos", org],
    queryFn: () =>
      getPermissoesUsuarioLogadoPorModulo("ESTUDOS_SOCIOECONOMICOS"),
  });
  const acessoRelatorios = useQuery({
    queryKey: ["acesso-relatorios-perfil", org],
    queryFn: () => usuarioTemPermissao("RELATORIOS", "VISUALIZAR"),
  });
  const lista = useQuery({
    queryKey: ["estudos-socioeconomicos", org, "lista"],
    queryFn: ({ signal }) =>
      listarEstudos({
        incluirInativos: true,
        signal,
      }),
    gcTime: 0,
  });
  const urlNovo =
    `${ROTA_PERFIL_SOCIOECONOMICO}/novo` +
    (participanteId
      ? "?" + new URLSearchParams({ participante: participanteId })
      : "");
  const { participantes, anos, quantidades } = useMemo(() => {
    const nomes = new Map<string, string>();
    const anos = new Set<string>();
    const quantidades = new Set<number>();
    for (const estudo of lista.data ?? []) {
      const id = String(estudo.participanteId);
      if (!nomes.has(id)) nomes.set(id, estudo.nomeParticipante);
      if (estudo.dataEstudo) anos.add(estudo.dataEstudo.slice(0, 4));
      quantidades.add(estudo.quantidadePessoasFamilia);
    }
    return {
      participantes: [...nomes]
        .map(([id, nome]) => opcao(id, nome))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
      anos: [...anos]
        .sort()
        .reverse()
        .map((ano) => opcao(ano)),
      quantidades: [...quantidades]
        .sort((a, b) => a - b)
        .map((n) => opcao(String(n), n === 1 ? "1 pessoa" : n + " pessoas")),
    };
  }, [lista.data]);

  const opcoes = {
    ano: [...anos, opcao("sem-data", "Data não informada")],
    pessoas: quantidades,
    renda: [
      ...FAIXAS_RENDA.map((faixa) => opcao(faixa)),
      opcao("sem-renda", "Não informada"),
    ],
    composicao: [
      opcao("confirmada", "Confirmada"),
      opcao("incompleta", "Incompleta"),
    ],
    rendaPerCapita: [
      opcao("calculada", "Calculada"),
      opcao("nao-calculada", "Não calculada"),
    ],
  };

  const base = useMemo(
    () =>
      (lista.data ?? []).filter(
        (estudo) =>
          !participanteId || String(estudo.participanteId) === participanteId,
      ),
    [lista.data, participanteId],
  );
  const rows = useMemo(() => {
    return base
      .filter((estudo) => {
        const ano = estudo.dataEstudo?.slice(0, 4) ?? "sem-data";
        const faixa =
          estudo.rendaFamiliar === null
            ? "sem-renda"
            : faixaRendaDe(estudo.rendaFamiliar);
        return (
          (filtros.situacao === "todos" ||
            estudo.situacao === filtros.situacao) &&
          (filtros.ano === "todos" || filtros.ano === ano) &&
          (filtros.pessoas === "todos" ||
            filtros.pessoas === String(estudo.quantidadePessoasFamilia)) &&
          (filtros.renda === "todos" || filtros.renda === faixa) &&
          (filtros.composicao === "todos" ||
            estudo.composicaoFamiliarCompleta ===
              (filtros.composicao === "confirmada")) &&
          (filtros.rendaPerCapita === "todos" ||
            (estudo.rendaPerCapita !== null) ===
              (filtros.rendaPerCapita === "calculada"))
        );
      })
      .sort((a, b) => {
        const x = sort.key === "ativo" ? situacaoLabel(a) : a[sort.key];
        const y = sort.key === "ativo" ? situacaoLabel(b) : b[sort.key];
        if (x == null) return y == null ? 0 : 1;
        if (y == null) return -1;
        const ordem =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y), "pt-BR");
        return sort.dir === "asc" ? ordem : -ordem;
      });
  }, [base, filtros, sort]);
  const total = base.length;
  const estudosRecentes = useMemo(() => {
    const idsFiltrados = new Set(rows.map((estudo) => estudo.id));
    const porParticipante = new Map<number, ResumoEstudo>();
    // A API ordena por data do estudo e usa a criação para desempatar.
    for (const estudo of base) {
      if (
        idsFiltrados.has(estudo.id) &&
        !porParticipante.has(estudo.participanteId)
      ) {
        porParticipante.set(estudo.participanteId, estudo);
      }
    }
    return [...porParticipante.values()];
  }, [base, rows]);
  const idsRecentes = estudosRecentes.map((estudo) => estudo.id);
  const beneficios = useQuery({
    queryKey: [
      "estudos-socioeconomicos",
      org,
      "beneficios-dos-estudos-recentes",
      idsRecentes,
    ],
    queryFn: async ({ signal }) => {
      const estudos = await obterDetalhesEstudos(idsRecentes, signal);
      const respostas = estudos
        .map(temBeneficioSocial)
        .filter((valor) => valor !== null);
      const recebem = respostas.filter((valor) => valor === true).length;
      return {
        validas: respostas.length,
        percentual: respostas.length
          ? (recebem / respostas.length) * 100
          : null,
      };
    },
    enabled: idsRecentes.length > 0,
  });
  const tamanhosFamilia = estudosRecentes
    .filter((estudo) => estudo.composicaoFamiliarCompleta)
    .map((estudo) => estudo.quantidadePessoasFamilia);
  const rendasFamiliares = estudosRecentes
    .map((estudo) => estudo.rendaFamiliar)
    .filter((valor) => valor !== null);
  const rendasPerCapita = estudosRecentes
    .map((estudo) => estudo.rendaPerCapita)
    .filter((valor) => valor !== null);
  const baseIndicador = (quantidade: number) =>
    `${quantidade.toLocaleString("pt-BR")} de ${estudosRecentes.length.toLocaleString("pt-BR")} estudos`;
  const { paginated, currentPage, pageSize, setCurrentPage, setPageSize } =
    usePagination(rows, 25, JSON.stringify([participanteId, filtros, sort]));

  function aplicar(next: typeof filtros) {
    setFiltros(next);
    setRascunho(next);
  }

  function selecionarParticipante(id: string) {
    setParticipanteRascunho(null);
    if (id !== (participanteId || "todos")) {
      setParams((atual) => {
        const params = new URLSearchParams(atual);
        if (id === "todos") params.delete("participante");
        else params.set("participante", id);
        return params;
      });
    }
  }

  function limpar() {
    aplicar(filtrosIniciais);
    selecionarParticipante("todos");
  }

  const activeFilters: ActiveFilterItem[] = [];
  if (participanteId)
    activeFilters.push({
      id: "participante",
      label: "Participante",
      value:
        participantes.find((p) => p.value === participanteId)?.label ??
        "Selecionado",
      onRemove: () => selecionarParticipante("todos"),
    });
  for (const { key, label } of filtrosSelecao) {
    if (filtros[key] === "todos") continue;
    activeFilters.push({
      id: key,
      label,
      value:
        opcoes[key].find((item) => item.value === filtros[key])?.label ??
        filtros[key],
      onRemove: () => aplicar({ ...filtros, [key]: "todos" }),
    });
  }

  const acoes = (estudo: ResumoEstudo) => (
    <RowActionsDropdown
      viewTo={`${ROTA_PERFIL_SOCIOECONOMICO}/${estudo.id}`}
      reportEndpoint={
        permissoes.GERAR_PDF
          ? `/estudos-socioeconomicos/${estudo.id}/relatorio`
          : undefined
      }
      reportFilename={`estudo-socioeconomico-${estudo.id}.pdf`}
      editTo={
        estudo.ativo && permissoes.EDITAR
          ? `${ROTA_PERFIL_SOCIOECONOMICO}/${estudo.id}/editar`
          : undefined
      }
      extraItems={
        estudo.ativo && permissoes.EDITAR
          ? [
              {
                label:
                  estudo.situacao === "CONCLUIDO"
                    ? "Reabrir estudo"
                    : "Marcar como concluído",
                icon: estudo.situacao === "CONCLUIDO" ? RotateCcw : CircleCheck,
                onClick: async () => {
                  try {
                    await (estudo.situacao === "CONCLUIDO"
                      ? reabrirEstudo(estudo.id)
                      : concluirEstudo(estudo.id));
                    await client.invalidateQueries({
                      queryKey: ["estudos-socioeconomicos", org],
                    });
                    toast.success(
                      estudo.situacao === "CONCLUIDO"
                        ? "Estudo reaberto como rascunho."
                        : "Estudo marcado como concluído.",
                    );
                  } catch (erro) {
                    toast.error(
                      erro instanceof Error
                        ? erro.message
                        : "Não foi possível atualizar a situação do estudo.",
                    );
                  }
                },
              },
            ]
          : []
      }
    />
  );

  async function confirmar() {
    if (!confirmacao || salvando) return;
    setSalvando(true);
    try {
      await inativarEstudo(confirmacao);
      await client.invalidateQueries({
        queryKey: ["estudos-socioeconomicos", org],
      });
      setConfirmacao(null);
      toast.success("Estudo socioeconômico inativado.");
    } catch (erro) {
      toast.error(
        erro instanceof Error
          ? erro.message
          : "Não foi possível inativar o estudo.",
      );
    } finally {
      setSalvando(false);
    }
  }
  return (
    <AppLayout>
      <div
        data-mobile-data-page="people"
        className="container max-w-7xl py-6 sm:py-8"
      >
        <ListPageHeader
          title="Estudos Socioeconômicos"
          tooltip="Nesta página são cadastrados e consultados os estudos socioeconômicos dos participantes da organização. Cada estudo reúne informações sobre composição familiar, condições de moradia, infraestrutura, transporte, benefícios sociais, renda e despesas mensais. Os estudos ficam vinculados aos participantes e preservam as informações registradas na data de sua realização, permitindo consultar avaliações anteriores e acompanhar mudanças nas condições socioeconômicas ao longo do tempo."
          objective="Cadastre e acompanhe os estudos socioeconômicos dos participantes, registrando informações sobre suas condições familiares, habitacionais e financeiras. Utilize esses dados para conhecer melhor a realidade do público atendido, identificar necessidades e apoiar o planejamento e a avaliação das ações desenvolvidas pela organização."
          actions={
            permissoes.CRIAR ? (
              <Button
                type="button"
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate(urlNovo)}
              >
                <Plus className="h-4 w-4" />
                Cadastrar perfil
              </Button>
            ) : undefined
          }
        />
        {lista.data && (
          <QuickFilterCards
            cards={[
              {
                key: "pessoas-por-familia",
                label: "Pessoas por família",
                count: tamanhosFamilia.length,
                valor: formatarNumero(media(tamanhosFamilia)),
                descricao: baseIndicador(tamanhosFamilia.length),
                icon: UsersRound,
              },
              {
                key: "renda-familiar-mediana",
                label: "Renda familiar mediana",
                count: rendasFamiliares.length,
                valor: formatarMoeda(mediana(rendasFamiliares)),
                descricao: baseIndicador(rendasFamiliares.length),
                icon: Wallet,
              },
              {
                key: "renda-per-capita-mediana",
                label: "Renda per capita mediana",
                count: rendasPerCapita.length,
                valor: formatarMoeda(mediana(rendasPerCapita)),
                descricao: baseIndicador(rendasPerCapita.length),
                icon: Coins,
              },
              {
                key: "beneficios-sociais",
                label: "Recebem benefícios sociais",
                count: beneficios.data?.validas ?? 0,
                valor:
                  idsRecentes.length && beneficios.isPending
                    ? "Carregando…"
                    : beneficios.isError
                      ? "Indisponível"
                      : formatarPercentual(beneficios.data?.percentual ?? null),
                descricao:
                  beneficios.data || !idsRecentes.length
                    ? baseIndicador(beneficios.data?.validas ?? 0)
                    : undefined,
                icon: HandCoins,
              },
            ]}
          />
        )}

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={
              activeFilters.length + Number(filtros.situacao !== "todos")
            }
          >
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                aplicar(rascunho);
                if (participanteRascunho !== null)
                  selecionarParticipante(participanteRascunho);
              }}
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="perfil-participante">
                    Participante
                  </FieldLabel>
                  <FormSearchableSelect
                    id="perfil-participante"
                    className={estiloCampo}
                    options={[
                      opcao("todos", "Todos os participantes"),
                      ...participantes,
                    ]}
                    value={participanteRascunho ?? (participanteId || "todos")}
                    onChange={setParticipanteRascunho}
                    placeholder="Selecione um participante"
                    searchPlaceholder="Buscar participante..."
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="situacao-estudo">
                    Situação do registro
                  </FieldLabel>
                  <Select
                    value={rascunho.situacao}
                    onValueChange={(value) =>
                      setRascunho((atual) => ({
                        ...atual,
                        situacao: value as Situacao,
                      }))
                    }
                  >
                    <SelectTrigger id="situacao-estudo" className={estiloCampo}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RASCUNHO">Rascunhos</SelectItem>
                      <SelectItem value="CONCLUIDO">Concluídos</SelectItem>
                      <SelectItem value="todos">Todas as situações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filtrosSelecao.map(({ key, label }) => (
                  <div key={key}>
                    <FieldLabel htmlFor={`perfil-${key}`}>{label}</FieldLabel>
                    <Select
                      value={rascunho[key]}
                      onValueChange={(value) =>
                        setRascunho((atual) => ({ ...atual, [key]: value }))
                      }
                    >
                      <SelectTrigger
                        id={`perfil-${key}`}
                        className={estiloCampo}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {opcoes[key].map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={limpar}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                >
                  <Search className="h-4 w-4" />
                  Pesquisar
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>
          <ActiveFilters items={activeFilters} onClearAll={limpar} />
          <DataTableCard>
            <DataTableToolbar
              total={rows.length}
              reportTo={
                acessoRelatorios.data
                  ? "/relatorios/perfil-sociodemografico"
                  : undefined
              }
              exportColumns={[...colunas]}
              getExportData={() =>
                rows.map((estudo) => ({
                  ...estudo,
                  dataEstudo: dataBR(estudo.dataEstudo),
                  ativo: situacaoLabel(estudo),
                }))
              }
              exportFilename="perfil-socioeconomico"
              canExport={permissoes.BAIXAR}
            />
            {lista.isPending ? (
              <p
                role="status"
                className="p-10 text-center text-sm text-muted-foreground"
              >
                Carregando registros...
              </p>
            ) : lista.isError ? (
              <div role="alert" className="space-y-2 p-10 text-center text-sm">
                <p>Não foi possível carregar os registros.</p>
                <Button
                  variant="glassSecondary"
                  onClick={() => void lista.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum estudo socioeconômico cadastrado."
                activeCount={
                  activeFilters.length +
                  Number(filtros.situacao !== "todos" && total > 0)
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th
                          scope="col"
                          className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Ações
                        </th>
                        {colunas.map((coluna) => (
                          <SortableTh
                            key={coluna.key}
                            sortKey={coluna.key}
                            activeKey={sort.key}
                            dir={sort.dir}
                            onSort={(key) =>
                              setSort((atual) => ({
                                key,
                                dir:
                                  atual.key === key && atual.dir === "asc"
                                    ? "desc"
                                    : "asc",
                              }))
                            }
                          >
                            {coluna.header}
                          </SortableTh>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((estudo) => (
                        <tr
                          key={estudo.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            {acoes(estudo)}
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={estudo.nomeParticipante} bold>
                              {estudo.nomeParticipante}
                            </TableCellText>
                          </td>
                          <td className={estiloCelula}>
                            {dataBR(estudo.dataEstudo) || "—"}
                          </td>
                          <td className={estiloCelula}>
                            {estudo.quantidadePessoasFamilia}
                          </td>
                          <td className={estiloCelula}>
                            {renda(estudo.rendaFamiliar)}
                          </td>
                          <td className={estiloCelula}>
                            {perCapita(estudo.rendaPerCapita)}
                          </td>
                          <td className={estiloCelula}>
                            <StatusPill status={situacaoLabel(estudo)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DataTablePagination
                  totalItems={rows.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="registro"
                  entityLabelPlural="registros"
                  pageSizeLabel="Registros por página"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>
      <AlertDialog
        open={!!confirmacao}
        onOpenChange={(aberto) => {
          if (!aberto && !salvando) setConfirmacao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar estudo?</AlertDialogTitle>
            <AlertDialogDescription>
              O estudo ficará disponível para consulta no histórico e sairá do
              perfil sociodemográfico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              onClick={(e) => {
                e.preventDefault();
                void confirmar();
              }}
            >
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Estudos Socioeconômicos"
        href="/wiki/pessoas/estudos-socioeconomicos"
      />
    </AppLayout>
  );
}

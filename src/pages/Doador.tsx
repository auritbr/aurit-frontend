import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { DataTablePagination } from "@/components/DataTablePagination";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { ConvertConfirmDialog } from "@/components/ConvertConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SortableTh } from "@/components/list/SortableTh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
import {
  deleteDoador,
  doadorObjetivo,
  doadorTooltip,
  getDoadores,
  origemDoadorLabel,
  origemDoadorOptions,
  situacaoDoadorLabel,
  situacaoDoadorOptions,
  tipoPessoaDoador,
  tipoPessoaLabel,
  tipoPessoaOptions,
  type Doador,
} from "@/data/doadores";

type SortBy = "doador" | "tipoPessoa" | "origem" | "situacao";
type SortDir = "asc" | "desc";
interface Filtros {
  busca: string;
  tipoPessoa: string[];
  origem: string[];
  situacao: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}
const initial: Filtros = {
  busca: "",
  tipoPessoa: [],
  origem: [],
  situacao: [],
  sortBy: "doador",
  sortDir: "asc",
};
const sortOptions = [
  { value: "doador", label: "Doador" },
  { value: "tipoPessoa", label: "Tipo de pessoa" },
  { value: "origem", label: "Origem" },
  { value: "situacao", label: "Situação" },
] as const;
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const labelOf = (
  opts: readonly { value: string; label: string }[],
  v: string,
) => opts.find((o) => o.value === v)?.label ?? v;

type ConversionTarget =
  | "Colaborador"
  | "Integrante"
  | "Participante"
  | "Parceiro"
  | "Fornecedor";

export default function DoadoresPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Doador[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [convertItem, setConvertItem] = useState<Doador | null>(null);
  const [conversionTarget, setConversionTarget] =
    useState<ConversionTarget | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "doadores:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState(initial);
  const [filtros, setFiltros] = useState(initial);

  const carregar = async () => {
    try {
      setLoading(true);
      setItems(await getDoadores());
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao carregar doadores.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void carregar();
  }, []);

  const aplicar = (f: Filtros) => {
    setDraft(f);
    setFiltros(f);
    setCurrentPage(1);
  };
  const filtered = useMemo(() => {
    const busca = normalize(filtros.busca);
    const result = items.filter(
      (d) =>
        (!busca || normalize(d.nomeDoador).includes(busca)) &&
        (!filtros.tipoPessoa.length ||
          filtros.tipoPessoa.includes(tipoPessoaDoador(d))) &&
        (!filtros.origem.length || filtros.origem.includes(d.origemDoador)) &&
        (!filtros.situacao.length || filtros.situacao.includes(d.status)),
    );
    const value = (d: Doador) =>
      filtros.sortBy === "tipoPessoa"
        ? tipoPessoaLabel(tipoPessoaDoador(d))
        : filtros.sortBy === "origem"
          ? origemDoadorLabel(d.origemDoador)
          : filtros.sortBy === "situacao"
            ? situacaoDoadorLabel(d.status)
            : d.nomeDoador;
    return [...result].sort(
      (a, b) =>
        value(a).localeCompare(value(b), "pt-BR") *
        (filtros.sortDir === "asc" ? 1 : -1),
    );
  }, [items, filtros]);
  const filtersKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtersKey);
  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.busca)
      list.push({
        id: "busca",
        label: "Pesquisa",
        value: filtros.busca,
        onRemove: () => aplicar({ ...filtros, busca: "" }),
      });
    (["tipoPessoa", "origem", "situacao"] as const).forEach((key) =>
      filtros[key].forEach((v) => {
        const opts =
          key === "tipoPessoa"
            ? tipoPessoaOptions
            : key === "origem"
              ? origemDoadorOptions
              : situacaoDoadorOptions;
        list.push({
          id: `${key}-${v}`,
          label:
            key === "tipoPessoa"
              ? "Tipo de pessoa"
              : key === "origem"
                ? "Origem"
                : "Situação",
          value: labelOf(opts, v),
          onRemove: () =>
            aplicar({ ...filtros, [key]: filtros[key].filter((x) => x !== v) }),
        });
      }),
    );
    return list;
  }, [filtros]);
  const indicadores = {
    total: items.length,
    ativos: items.filter((d) => d.status === "ATIVO").length,
    fisicas: items.filter((d) => tipoPessoaDoador(d) === "PESSOA_FISICA")
      .length,
    juridicas: items.filter((d) => tipoPessoaDoador(d) === "PESSOA_JURIDICA")
      .length,
  };
  const toggleSort = (key: SortBy) =>
    aplicar({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoador(confirmDelete);
      toast.success("Doador excluído com sucesso.");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir doador.");
    } finally {
      setConfirmDelete(null);
    }
  };
  const iniciarConversao = (doador: Doador, destino: ConversionTarget) => {
    if (
      doador.tipoPessoa === "PESSOA_JURIDICA" &&
      ["Colaborador", "Participante"].includes(destino)
    ) {
      toast.error(`${destino} aceita somente pessoa física.`);
      return;
    }
    setConvertItem(doador);
    setConversionTarget(destino);
  };
  const confirmarConversao = () => {
    if (!convertItem || !conversionTarget) return;
    const doador = convertItem;
    const pessoaFisica = doador.pessoaFisica;
    const dataNascimento = pessoaFisica?.dataNascimento
      ? pessoaFisica.dataNascimento.split("-").reverse().join("/")
      : "";
    const dadosComuns = {
      tipoPessoa: doador.tipoPessoa,
      pessoaFisica: doador.pessoaFisica ?? {
        nomeCompleto: "",
        dataNascimento: "",
        cpf: "",
        rg: "",
        telefone: "",
        email: "",
      },
      pessoaJuridica: doador.pessoaJuridica ?? {
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        dataFundacao: "",
        telefone: "",
        email: "",
      },
      endereco: doador.endereco ?? {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
      status: doador.status,
      observacao: doador.observacao,
    };
    const destinos: Record<ConversionTarget, { rota: string; data: object }> = {
      Colaborador: {
        rota: "/colaboradores/novo",
        data: {
          nomeCompleto: pessoaFisica?.nomeCompleto ?? "",
          dataNascimento: pessoaFisica?.dataNascimento ?? "",
          cpf: pessoaFisica?.cpf ?? "",
          rg: pessoaFisica?.rg ?? "",
          telefone: pessoaFisica?.telefone ?? "",
          email: pessoaFisica?.email ?? "",
          ...(doador.endereco ?? {}),
          status: doador.status,
          tipoVinculo: "PESSOA_FISICA",
          organizacaoId: doador.organizacaoId,
        },
      },
      Integrante: {
        rota: "/integrantes/novo",
        data: {
          tipoPessoaIntegrante: doador.tipoPessoa,
          nomeCompleto: pessoaFisica?.nomeCompleto ?? "",
          dataNascimento,
          cpf: pessoaFisica?.cpf ?? "",
          rg: pessoaFisica?.rg ?? "",
          cnpj: doador.pessoaJuridica?.cnpj ?? "",
          nomeSocial: doador.pessoaJuridica?.razaoSocial ?? "",
          nomeFantasia: doador.pessoaJuridica?.nomeFantasia ?? "",
          telefone: doador.telefone,
          email: doador.email,
          ...(doador.endereco ?? {}),
          status: doador.status,
          organizacaoId: doador.organizacaoId,
        },
      },
      Participante: {
        rota: "/participantes/novo",
        data: {
          nomeCompleto: pessoaFisica?.nomeCompleto ?? "",
          dataNascimento,
          cpf: pessoaFisica?.cpf ?? "",
          rg: pessoaFisica?.rg ?? "",
          telefone: pessoaFisica?.telefone ?? "",
          email: pessoaFisica?.email ?? "",
          ...(doador.endereco ?? {}),
          status: doador.status,
          organizacaoId: doador.organizacaoId,
        },
      },
      Parceiro: { rota: "/parceiros/novo", data: dadosComuns },
      Fornecedor: { rota: "/fornecedores/novo", data: dadosComuns },
    };
    const destino = destinos[conversionTarget];
    setConvertItem(null);
    setConversionTarget(null);
    navigate(destino.rota, {
      state: { conversionSeed: { origem: "Doadores", data: destino.data } },
    });
    toast.success("Dados carregados. Revise o cadastro e clique em Salvar.");
  };
  const acoesConversao = (doador: Doador) =>
    (["Colaborador", "Integrante", "Participante", "Parceiro", "Fornecedor"] as const).map(
      (destino) => ({
        label: `Converter em ${destino}`,
        icon: UserPlus,
        onClick: () => iniciarConversao(doador, destino),
      }),
    );
  const exportColumns = [
    { header: "Doador", key: "nome" },
    { header: "Tipo", key: "tipo" },
    { header: "Origem", key: "origem" },
    { header: "Situação", key: "situacao" },
    { header: "Observações", key: "observacao" },
  ];
  const exportData = () =>
    filtered.map((d) => ({
      nome: d.nomeDoador,
      tipo: tipoPessoaLabel(tipoPessoaDoador(d)),
      origem: origemDoadorLabel(d.origemDoador),
      situacao: situacaoDoadorLabel(d.status),
      observacao: d.observacao || "—",
    }));
  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Doadores"
          tooltip={doadorTooltip}
          objective={doadorObjetivo}
          actions={
            <Button
              variant="glassPrimary"
              className="h-9 gap-2 px-4"
              onClick={() => navigate("/doadores/novo")}
            >
              <Plus className="h-4 w-4" />
              Cadastrar doador
            </Button>
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de doadores"
            value={indicadores.total}
            icon={Users}
          />
          <SummaryStatCard
            title="Doadores ativos"
            value={indicadores.ativos}
            icon={UserCheck}
            variant="success"
          />
          <SummaryStatCard
            title="Pessoas físicas"
            value={indicadores.fisicas}
            icon={UserRound}
            variant="info"
          />
          <SummaryStatCard
            title="Pessoas jurídicas"
            value={indicadores.juridicas}
            icon={Building2}
            variant="neutral"
          />
        </div>
        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                aplicar(draft);
              }}
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroBusca">Pesquisa</FieldLabel>
                  <Input
                    id="filtroBusca"
                    className={inputClass}
                    value={draft.busca}
                    onChange={(e) =>
                      setDraft({ ...draft, busca: e.target.value })
                    }
                    placeholder="Nome do doador"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipo">Tipo de pessoa</FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipo"
                    options={[...tipoPessoaOptions]}
                    value={draft.tipoPessoa}
                    onChange={(v) => setDraft({ ...draft, tipoPessoa: v })}
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroOrigem">Origem</FieldLabel>
                  <FilterMultiSelect
                    id="filtroOrigem"
                    options={[...origemDoadorOptions]}
                    value={draft.origem}
                    onChange={(v) => setDraft({ ...draft, origem: v })}
                    placeholder="Todas as origens"
                    summaryNoun="origens selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={[...situacaoDoadorOptions]}
                    value={draft.situacao}
                    onChange={(v) => setDraft({ ...draft, situacao: v })}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ordenar">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(v) =>
                      setDraft({ ...draft, sortBy: v as SortBy })
                    }
                  >
                    <SelectTrigger id="ordenar" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="ordem">Ordem</FieldLabel>
                  <Select
                    value={draft.sortDir}
                    onValueChange={(v) =>
                      setDraft({ ...draft, sortDir: v as SortDir })
                    }
                  >
                    <SelectTrigger id="ordem" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A–Z</SelectItem>
                      <SelectItem value="desc">Z–A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => aplicar(initial)}
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
          <ActiveFilters
            items={activeFilters}
            onClearAll={() => aplicar(initial)}
          />
          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/doadores"
              exportColumns={exportColumns}
              getExportData={exportData}
              exportFilename="doadores"
            />
            {loading ? (
              <DataTableEmptyState
                emptyTitle="Carregando doadores..."
                emptyDescription="Aguarde enquanto os dados são consultados."
                activeCount={0}
              />
            ) : !filtered.length ? (
              <DataTableEmptyState
                emptyTitle="Nenhum doador encontrado."
                emptyDescription="Cadastre uma pessoa ou instituição doadora."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45">
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="doador"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Doador
                        </SortableTh>
                        <SortableTh
                          sortKey="tipoPessoa"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo
                        </SortableTh>
                        <SortableTh
                          sortKey="origem"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Origem
                        </SortableTh>
                        <SortableTh
                          sortKey="situacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-border/50 hover:bg-muted/25"
                        >
                          <td className="px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/doadores/${d.id}/relatorio`}
                              reportFilename={`doador-${d.id}.pdf`}
                              viewTo={`/doadores/${d.id}`}
                              editTo={`/doadores/${d.id}/editar`}
                              onDelete={() => setConfirmDelete(d.id)}
                              extraItems={acoesConversao(d)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={d.nomeDoador} bold>
                              {d.nomeDoador}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {tipoPessoaLabel(tipoPessoaDoador(d))}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={d.origemDoador}
                              ariaLabelPrefix="Origem do doador"
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <StatusPill status={d.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="doador"
                  entityLabelPlural="doadores"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir doador?</AlertDialogTitle>
            <AlertDialogDescription>
              O vínculo de doador será removido. A pessoa permanecerá cadastrada
              no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConvertConfirmDialog
        open={!!convertItem && !!conversionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setConvertItem(null);
            setConversionTarget(null);
          }
        }}
        sourceLabel="Doador"
        targetLabel={conversionTarget ?? "Cadastro"}
        onConfirm={confirmarConversao}
      />
      <WikiFloatingButton
        pageTitle="Doadores"
        href="/wiki/financeiro/doadores"
      />
    </AppLayout>
  );
}

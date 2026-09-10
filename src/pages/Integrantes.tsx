import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw, Search, UserPlus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { DataTablePagination } from "@/components/DataTablePagination";
import { GerarDocumentoButton } from "@/components/GerarDocumentoButton";
import { ConvertConfirmDialog } from "@/components/ConvertConfirmDialog";
import { FieldLabel } from "@/components/FieldLabel";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { maskCNPJ, maskCPF } from "@/lib/masks";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteIntegrante,
  getIntegrantes,
  getOrganizacoes,
  statusValueToLabel,
  tipoPessoaIntegranteValueToLabel,
  tipoVinculoIntegranteValueToLabel,
  type Integrante,
  type OrganizacaoOption,
} from "@/data/integrantes";
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
import { toast } from "sonner";

type SortBy = "nome" | "funcao" | "tipoVinculo" | "organizacao" | "status";
type SortDir = "asc" | "desc";

interface Filtros {
  nome: string;
  funcao: string;
  status: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  nome: "",
  funcao: "",
  status: "",
  sortBy: "nome",
  sortDir: "asc",
};

const statusOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
];

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "funcao", label: "Função / atuação" },
  { value: "tipoVinculo", label: "Tipo de vínculo" },
  { value: "organizacao", label: "Organização" },
  { value: "status", label: "Status" },
];

const NEXT_STEP_KEY = "aurit:integrantes:next-step-card";

interface NextStepData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

export default function Integrantes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Integrante[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [convertItem, setConvertItem] = useState<Integrante | null>(null);
  const [nextStep, setNextStep] = useState<NextStepData | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "integrantes:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("INTEGRANTES")
      .then((data) => active && setPermissoes(data))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStep(JSON.parse(raw) as NextStepData);
    } catch {
      setNextStep(null);
    }
    sessionStorage.removeItem(NEXT_STEP_KEY);
    const timer = window.setTimeout(() => setNextStep(null), 60_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;
    if (!podeVisualizar) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void Promise.all([getIntegrantes(), getOrganizacoes()])
      .then(([registros, orgs]) => {
        if (!active) return;
        setItems(registros);
        setOrganizacoes(orgs);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar integrantes.",
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const organizacaoNome = (item: Integrante) =>
    !item.organizacaoId
      ? "Não se aplica"
      : (organizacoes.find(
          (org) => String(org.id) === String(item.organizacaoId),
        )?.nomeOrganizacao ?? `Organização ${item.organizacaoId}`);

  const nome = (item: Integrante) =>
    item.tipoPessoaIntegrante === "PESSOA_JURIDICA"
      ? item.nomeSocial || item.nomeFantasia || "—"
      : item.nomeCompleto || "—";

  const documento = (item: Integrante) =>
    item.tipoPessoaIntegrante === "PESSOA_JURIDICA"
      ? item.cnpj
        ? maskCNPJ(item.cnpj)
        : "—"
      : item.cpf
        ? maskCPF(item.cpf)
        : "—";

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setSearching(true);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const filtered = useMemo(() => {
    const nomeBusca = filtros.nome.toLowerCase().trim();
    const funcaoBusca = filtros.funcao.toLowerCase().trim();
    const result = items.filter((item) => {
      if (nomeBusca && !nome(item).toLowerCase().includes(nomeBusca))
        return false;
      if (
        funcaoBusca &&
        !(item.funcaoIntegrante ?? "").toLowerCase().includes(funcaoBusca)
      ) {
        return false;
      }
      return !filtros.status || item.status === filtros.status;
    });

    const value = (item: Integrante) => {
      switch (filtros.sortBy) {
        case "funcao":
          return item.funcaoIntegrante ?? "";
        case "tipoVinculo":
          return tipoVinculoIntegranteValueToLabel(item.tipoVinculoIntegrante);
        case "organizacao": {
          if (!item.organizacaoId) return "Não se aplica";
          return (
            organizacoes.find(
              (org) => String(org.id) === String(item.organizacaoId),
            )?.nomeOrganizacao ?? `Organização ${item.organizacaoId}`
          );
        }
        case "status":
          return statusValueToLabel(item.status);
        default:
          return nome(item);
      }
    };
    return [...result].sort((a, b) => {
      const compared = String(value(a)).localeCompare(
        String(value(b)),
        "pt-BR",
        {
          sensitivity: "base",
        },
      );
      return filtros.sortDir === "asc" ? compared : -compared;
    });
  }, [filtros, items, organizacoes]);

  const activeFilters: ActiveFilterItem[] = (() => {
    const result: ActiveFilterItem[] = [];
    if (filtros.nome.trim())
      result.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    if (filtros.funcao.trim())
      result.push({
        id: "funcao",
        label: "Função",
        value: filtros.funcao.trim(),
        onRemove: () => applyFiltros({ ...filtros, funcao: "" }),
      });
    if (filtros.status)
      result.push({
        id: "status",
        label: "Status",
        value: statusValueToLabel(filtros.status),
        onRemove: () => applyFiltros({ ...filtros, status: "" }),
      });
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      result.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${sortOptions.find((option) => option.value === filtros.sortBy)?.label} · ${filtros.sortDir === "asc" ? "A–Z" : "Z–A"}`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return result;
  })();

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  async function handleDelete() {
    if (confirmDelete == null || !podeExcluir) return;
    try {
      await deleteIntegrante(confirmDelete);
      setItems((current) =>
        current.filter((item) => item.id !== confirmDelete),
      );
      toast.success("Integrante excluído com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir integrante.",
      );
    } finally {
      setConfirmDelete(null);
    }
  }

  const handleConvert = () => {
    if (!convertItem) return;
    if (convertItem.tipoPessoaIntegrante === "PESSOA_JURIDICA") {
      toast.error("A conversão está disponível apenas para Pessoa Física.");
      setConvertItem(null);
      return;
    }

    const integrante = convertItem;
    setConvertItem(null);
    navigate("/colaboradores/novo", {
      state: {
        conversionSeed: {
          origem: "Integrantes",
          data: {
            nomeCompleto: integrante.nomeCompleto,
            dataNascimento: integrante.dataNascimento,
            cpf: integrante.cpf,
            rg: integrante.rg,
            telefone: integrante.telefone,
            email: integrante.email,
            racaCor: integrante.racaCor,
            genero: integrante.genero,
            tipoDeficiencia: integrante.tipoDeficiencia,
            cep: integrante.cep,
            logradouro: integrante.logradouro,
            numero: integrante.numero,
            complemento: integrante.complemento,
            bairro: integrante.bairro,
            cidade: integrante.cidade,
            estado: integrante.estado,
            dataInicioVinculo: integrante.dataEntrada,
            dataFimVinculo: integrante.dataSaida,
            funcaoColaborador: integrante.funcaoIntegrante,
            status: integrante.status,
            organizacaoId:
              integrante.organizacaoId === ""
                ? ""
                : String(integrante.organizacaoId),
          },
        },
      },
    });
    toast.success("Dados carregados. Revise o cadastro e clique em Salvar.");
  };

  const exportColumns = [
    { header: "Nome", key: "nome" },
    { header: "CPF/CNPJ", key: "documento" },
    { header: "Função / atuação", key: "funcao" },
    { header: "Tipo de vínculo", key: "vinculo" },
    { header: "Status", key: "status" },
  ];
  const getExportData = () =>
    filtered.map((item) => ({
      nome: nome(item),
      documento: documento(item),
      funcao: item.funcaoIntegrante,
      vinculo: tipoVinculoIntegranteValueToLabel(item.tipoVinculoIntegrante),
      status: statusValueToLabel(item.status),
    }));

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Integrantes"
          tooltip="Nesta página são cadastrados os integrantes vinculados à organização, como artistas, grupos, parceiros culturais, pareceristas ou pessoas envolvidas em projetos, ações e atividades. Também podem ser registrados o tipo de vínculo, a função exercida, o período de participação e a situação atual de cada integrante."
          objective="Registre os integrantes vinculados à organização, aos grupos ou às ações desenvolvidas. Mantenha essas informações atualizadas para facilitar o acompanhamento da participação, dos vínculos, das funções exercidas e dos períodos de atuação."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/integrantes/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" /> Cadastrar integrante
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroNome">Nome</FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(e) =>
                      setDraft({ ...draft, nome: e.target.value })
                    }
                    placeholder="Digite o nome do integrante"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroFuncao">
                    Função / atuação
                  </FieldLabel>
                  <Input
                    id="filtroFuncao"
                    value={draft.funcao}
                    onChange={(e) =>
                      setDraft({ ...draft, funcao: e.target.value })
                    }
                    placeholder="Digite a função ou atuação"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroStatus">Status</FieldLabel>
                  <Select
                    value={draft.status || "todos"}
                    onValueChange={(value) =>
                      setDraft({
                        ...draft,
                        status: value === "todos" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger
                      id="filtroStatus"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) =>
                      setDraft({ ...draft, sortBy: value as SortBy })
                    }
                  >
                    <SelectTrigger
                      id="filtroSortBy"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortDir">Ordem</FieldLabel>
                  <Select
                    value={draft.sortDir}
                    onValueChange={(value) =>
                      setDraft({ ...draft, sortDir: value as SortDir })
                    }
                  >
                    <SelectTrigger
                      id="filtroSortDir"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
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
                  onClick={() => applyFiltros(emptyFiltros)}
                >
                  <RotateCcw className="h-4 w-4" /> Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {searching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>

          <ActiveFilters
            items={activeFilters}
            onClearAll={() => applyFiltros(emptyFiltros)}
          />

          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/integrantes"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="integrantes"
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum integrante cadastrado."
                createLabel="Cadastrar integrante"
                onCreate={
                  podeCriar ? () => navigate("/integrantes/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={() => applyFiltros(emptyFiltros)}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1260px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="nome"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome
                        </SortableTh>
                        <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          CPF/CNPJ
                        </th>
                        <SortableTh
                          sortKey="funcao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Função / atuação
                        </SortableTh>
                        <SortableTh
                          sortKey="tipoVinculo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de vínculo
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>
                        {podeGerarPdf && (
                          <th className="w-[130px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Contrato
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                        >
                          <td className="px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/integrantes/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`integrante-${item.id}.pdf`}
                              viewTo={`/integrantes/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/integrantes/${item.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item.id)
                                  : undefined
                              }
                              extraItems={
                                podeCriar
                                  ? [
                                      {
                                        label: "Converter em colaborador",
                                        icon: UserPlus,
                                        onClick: () => setConvertItem(item),
                                      },
                                    ]
                                  : undefined
                              }
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={nome(item)} bold>
                              {nome(item)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={documento(item)} muted>
                              {documento(item)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={item.funcaoIntegrante || "—"}
                              muted={!item.funcaoIntegrante}
                            >
                              {item.funcaoIntegrante || "—"}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={tipoVinculoIntegranteValueToLabel(
                                item.tipoVinculoIntegrante,
                              )}
                            >
                              {tipoVinculoIntegranteValueToLabel(
                                item.tipoVinculoIntegrante,
                              )}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusValueToLabel(item.status)}
                            />
                          </td>
                          {podeGerarPdf && (
                            <td className="whitespace-nowrap px-6 py-2.5">
                              {item.tipoVinculoIntegrante === "PARECERISTA" ? (
                                <GerarDocumentoButton
                                  label="Contrato"
                                  compacto
                                  tipoDestinatario="INTEGRANTE"
                                  destinatarioId={item.id}
                                />
                              ) : (
                                <TableCellText text="—" muted>
                                  —
                                </TableCellText>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {paginated.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/integrantes/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`integrante-${item.id}.pdf`}
                          viewTo={`/integrantes/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/integrantes/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                          extraItems={
                            podeCriar
                              ? [
                                  {
                                    label: "Converter em colaborador",
                                    icon: UserPlus,
                                    onClick: () => setConvertItem(item),
                                  },
                                ]
                              : undefined
                          }
                        />
                        {podeGerarPdf &&
                          item.tipoVinculoIntegrante === "PARECERISTA" && (
                            <GerarDocumentoButton
                              label="Contrato"
                              compacto
                              tipoDestinatario="INTEGRANTE"
                              destinatarioId={item.id}
                            />
                          )}
                      </div>
                      <p className="font-medium text-foreground">
                        {nome(item)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {documento(item)}
                      </p>
                      {item.funcaoIntegrante && (
                        <p className="mt-2 text-sm">{item.funcaoIntegrante}</p>
                      )}
                      <div className="mt-2">
                        <StatusPill status={statusValueToLabel(item.status)} />
                      </div>
                    </div>
                  ))}
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
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
        open={confirmDelete != null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir integrante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Vínculos existentes podem impedir
              a exclusão para preservar o histórico.
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
        open={!!convertItem}
        onOpenChange={(open) => !open && setConvertItem(null)}
        targetLabel="Colaborador"
        sourceLabel="Integrante"
        onConfirm={handleConvert}
      />

      <WikiFloatingButton
        pageTitle="Integrantes"
        href="/wiki/pessoas/integrantes"
      />
    </AppLayout>
  );
}

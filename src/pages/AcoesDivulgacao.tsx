import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, Loader2, Plus, RotateCcw, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
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
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SortableTh } from "@/components/list/SortableTh";
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
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadAcaoDivulgacaoReport as exportAcaoDivulgacaoPdf } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteAcaoDivulgacao,
  editalNomeAcao,
  getAcoesDivulgacao,
  getPropostasEditaisOptions,
  projetoNomeAcao,
  propostaNomeAcao,
  statusAcao,
  statusValueToLabel,
  type AcaoDivulgacao,
  type PropostaEditalOption,
} from "@/data/acoesDivulgacao";
import { getProjetosOptions, type SimpleOption } from "@/data/propostasEdital";
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

const NEXT_STEP_KEY = "aurit:acoes-divulgacao:next-step-card";
type SortBy = "nome" | "proposta" | "edital" | "projeto" | "status";
type SortDir = "asc" | "desc";
interface Filtros {
  nome: string;
  propostas: string[];
  projetos: string[];
  status: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}
interface NextStepData {
  titulo: string;
  acaoLabel?: string;
  acaoUrl?: string;
  variante?: "pendente" | "atencao" | "concluido";
}
const emptyFiltros: Filtros = {
  nome: "",
  propostas: [],
  projetos: [],
  status: [],
  sortBy: "nome",
  sortDir: "asc",
};
const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "nome", label: "Nome da ação" },
  { value: "proposta", label: "Proposta de edital" },
  { value: "edital", label: "Edital" },
  { value: "projeto", label: "Projeto" },
  { value: "status", label: "Status" },
];
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function AcoesDivulgacao() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AcaoDivulgacao[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [projetos, setProjetos] = useState<SimpleOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<NextStepData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "acoes-divulgacao:pesquisa-avancada",
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

  const propostaNome = useCallback(
    (item: AcaoDivulgacao) =>
      propostaNomeAcao(item.propostaEditalId, propostas, item),
    [propostas],
  );
  const editalNome = useCallback(
    (item: AcaoDivulgacao) =>
      editalNomeAcao(item.propostaEditalId, propostas, item),
    [propostas],
  );
  const projetoNome = useCallback(
    (item: AcaoDivulgacao) =>
      item.nomeProjeto ||
      projetos.find((projeto) => String(projeto.id) === item.projetoId)?.nome ||
      projetoNomeAcao(item.propostaEditalId, propostas, item),
    [projetos, propostas],
  );

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("ACOES_DIVULGACAO")
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
    async function load() {
      try {
        setLoading(true);
        setAccessDenied(null);
        const [acoes, propostasData, projetosData] = await Promise.all([
          getAcoesDivulgacao(),
          getPropostasEditaisOptions(),
          getProjetosOptions(),
        ]);
        if (active) {
          setItems(acoes);
          setPropostas(propostasData);
          setProjetos(projetosData);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as ações de divulgação.";
        if (isPlanoAccessDenied(message)) setAccessDenied(message);
        else toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setSearching(true);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const result = items.filter((item) => {
      if (
        nome &&
        !normalize(
          `${item.nomeAcao} ${item.descricaoAcao} ${item.objetivoAcao}`,
        ).includes(nome)
      )
        return false;
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(item.propostaEditalId)
      )
        return false;
      if (filtros.projetos.length && !filtros.projetos.includes(item.projetoId))
        return false;
      if (filtros.status.length && !filtros.status.includes(item.status))
        return false;
      return true;
    });
    const value = (item: AcaoDivulgacao) => {
      if (filtros.sortBy === "proposta") return propostaNome(item);
      if (filtros.sortBy === "edital") return editalNome(item);
      if (filtros.sortBy === "projeto") return projetoNome(item);
      if (filtros.sortBy === "status") return statusValueToLabel(item.status);
      return item.nomeAcao;
    };
    return [...result].sort((a, b) => {
      const compared = value(a).localeCompare(value(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compared : -compared;
    });
  }, [items, filtros, propostaNome, editalNome, projetoNome]);

  const activeFilters: ActiveFilterItem[] = [];
  if (filtros.nome.trim())
    activeFilters.push({
      id: "nome",
      label: "Nome da ação",
      value: filtros.nome.trim(),
      onRemove: () => applyFiltros({ ...filtros, nome: "" }),
    });
  const pushList = (
    key: "propostas" | "projetos" | "status",
    label: string,
    values: string[],
    getLabel: (value: string) => string,
  ) =>
    values.forEach((value) =>
      activeFilters.push({
        id: `${key}-${value}`,
        label,
        value: getLabel(value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            [key]: filtros[key].filter((item) => item !== value),
          }),
      }),
    );
  pushList(
    "propostas",
    "Proposta",
    filtros.propostas,
    (id) => propostas.find((p) => p.id === id)?.nome ?? id,
  );
  pushList(
    "projetos",
    "Projeto",
    filtros.projetos,
    (id) => projetos.find((projeto) => String(projeto.id) === id)?.nome ?? id,
  );
  pushList("status", "Status", filtros.status, (value) =>
    statusValueToLabel(value),
  );

  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };
  const clear = () => applyFiltros(emptyFiltros);
  const sort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteAcaoDivulgacao(Number(confirmDelete));
      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Ação de divulgação excluída com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir ação de divulgação.";
      if (isPlanoAccessDenied(message)) setAccessDenied(message);
      else toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  function exportPdf(item: AcaoDivulgacao) {
    if (!podeGerarPdf)
      return toast.error("Você não possui permissão para gerar PDF.");
    void exportAcaoDivulgacaoPdf({
      ...item,
      propostaEdital: propostaNome(item),
      edital: editalNome(item),
      projeto: projetoNome(item),
    });
  }

  const propostaOptions = propostas.map((p) => ({
    value: p.id,
    label: p.nome,
  }));
  const projetoOptions = projetos.map((projeto) => ({
    value: String(projeto.id),
    label: projeto.nome,
  }));
  const exportColumns = [
    { header: "Nome da ação", key: "nomeAcao" },
    { header: "Proposta", key: "proposta" },
    { header: "Edital", key: "edital" },
    { header: "Projeto", key: "projeto" },
    { header: "Status", key: "statusLabel" },
  ];
  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      proposta: propostaNome(item),
      edital: editalNome(item),
      projeto: projetoNome(item),
      statusLabel: statusValueToLabel(item.status),
    }));

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDenied)
    return (
      <AppLayout>
        <AccessDenied message={accessDenied} />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Ações de Divulgação"
          tooltip="Nesta página são registradas e acompanhadas as ações de divulgação do projeto apresentado ao edital, com informações sobre sua finalidade, forma de realização, acessibilidade, resultados esperados, produtos previstos e situação atual."
          objective="Planeje e acompanhe as ações utilizadas para divulgar o projeto apresentado ao edital e alcançar seu público, registrando como cada ação será realizada, quais medidas de acessibilidade serão adotadas, os resultados esperados e os materiais ou conteúdos previstos."
          actions={
            podeCriar ? (
              <Button
                variant="glassPrimary"
                onClick={() => navigate("/acoes-divulgacao/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar ação
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
                <FilterText
                  id="filtroNome"
                  label="Nome da ação"
                  value={draft.nome}
                  onChange={(v) => setDraftField("nome", v)}
                />
                <FilterField label="Proposta de edital">
                  <FilterMultiSelect
                    id="filtroProposta"
                    options={propostaOptions}
                    value={draft.propostas}
                    onChange={(v) => setDraftField("propostas", v)}
                    placeholder="Todas as propostas"
                    searchable
                    summaryNoun="propostas selecionadas"
                  />
                </FilterField>
                <FilterField label="Projeto">
                  <FilterMultiSelect
                    id="filtroProjeto"
                    options={projetoOptions}
                    value={draft.projetos}
                    onChange={(v) => setDraftField("projetos", v)}
                    placeholder="Todos os projetos"
                    searchable
                    summaryNoun="projetos selecionados"
                  />
                </FilterField>
                <FilterField label="Status">
                  <FilterMultiSelect
                    id="filtroStatus"
                    options={statusAcao}
                    value={draft.status}
                    onChange={(v) => setDraftField("status", v)}
                    placeholder="Todos os status"
                    summaryNoun="status selecionados"
                  />
                </FilterField>
                <FilterField label="Ordenar por">
                  <Select
                    value={draft.sortBy}
                    onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
                  >
                    <SelectTrigger className="h-9 rounded-[10px]">
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
                </FilterField>
                <FilterField label="Ordem">
                  <Select
                    value={draft.sortDir}
                    onValueChange={(v) =>
                      setDraftField("sortDir", v as SortDir)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A–Z</SelectItem>
                      <SelectItem value="desc">Z–A</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={clear}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
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
          <ActiveFilters items={activeFilters} onClearAll={clear} />
          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/acoes-divulgacao"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="acoes-divulgacao"
              canExport={podeGerarPdf}
            />
            {loading ? (
              <div className="flex justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando ações...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma ação de divulgação cadastrada."
                createLabel="Cadastrar ação"
                onCreate={
                  podeCriar
                    ? () => navigate("/acoes-divulgacao/novo")
                    : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={clear}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="nome"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={sort}
                        >
                          Nome da ação
                        </SortableTh>
                        <SortableTh
                          sortKey="proposta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={sort}
                        >
                          Proposta de edital
                        </SortableTh>
                        <SortableTh
                          sortKey="projeto"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={sort}
                        >
                          Projeto
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={sort}
                        >
                          Status
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/acoes-divulgacao/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`acao-divulgacao-${item.id}.pdf`}
                              viewTo={`/acoes-divulgacao/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/acoes-divulgacao/${item.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item.id)
                                  : undefined
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.nomeAcao} bold>
                              {item.nomeAcao}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={propostaNome(item)}>
                              {propostaNome(item)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={projetoNome(item)}>
                              {projetoNome(item)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusValueToLabel(item.status)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {paginated.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/acoes-divulgacao/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`acao-divulgacao-${item.id}.pdf`}
                          viewTo={`/acoes-divulgacao/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/acoes-divulgacao/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                        />
                        {podeGerarPdf && (
                          <DocumentActionButton
                            label="Gerar PDF"
                            icon={FileDown}
                            aria-label={`Gerar PDF da ação ${item.nomeAcao}`}
                            onClick={() => exportPdf(item)}
                          />
                        )}
                      </div>
                      <p className="font-medium">{item.nomeAcao}</p>
                      <p className="mt-1 text-sm">{propostaNome(item)}</p>
                      <p className="text-xs text-muted-foreground">
                        {editalNome(item)} · {projetoNome(item)}
                      </p>
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
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ação de divulgação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WikiFloatingButton
        pageTitle="Ações de Divulgação"
        href="https://www.aurit.com.br/wiki/editais/acoes-de-divulgacao"
      />
    </AppLayout>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
function FilterText({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite o nome da ação"
        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
      />
    </div>
  );
}

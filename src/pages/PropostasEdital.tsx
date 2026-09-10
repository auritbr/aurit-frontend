import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { DataTablePagination } from "@/components/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
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
import {
  deletePropostaEdital,
  formatBRLNumber,
  formatDateBr,
  getAgentesOptions,
  getEditaisOptions,
  getOrganizacoesOptions,
  getProjetosOptions,
  getPropostasEditais,
  statusPropostaEditalLabel,
  statusPropostaEditalOptions,
  type PropostaEdital,
  type SimpleOption,
} from "@/data/propostasEdital";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";

const fieldClass = "h-9";
const propostaEditalTooltip =
  "Nesta página são cadastradas e acompanhadas as propostas que serão apresentadas aos editais, reunindo as informações necessárias para estruturar o projeto, demonstrar sua relevância, planejar sua execução e acompanhar sua participação no processo seletivo. Também podem ser registrados os valores previstos, a equipe envolvida, os responsáveis e as informações de submissão e resultado.";
const propostaEditalObjetivo =
  "Cadastre e acompanhe as propostas apresentadas aos editais, mantendo organizadas as informações necessárias para sua elaboração, submissão e acompanhamento ao longo do processo seletivo. Registre também os valores, a equipe, os responsáveis e a situação atual de cada proposta.";
const PROPOSTA_EDITAL_NEXT_STEP_KEY = "aurit:propostas-edital:next-step-card";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "proposta", label: "Proposta" },
  { value: "edital", label: "Edital" },
  { value: "projeto", label: "Projeto base" },
  { value: "submissao", label: "Data de submissão" },
  { value: "situacao", label: "Situação da proposta" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  editais: string[];
  projetos: string[];
  responsaveis: string[];
  situacoes: string[];
  submissaoDe: string;
  submissaoAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  editais: [],
  projetos: [],
  responsaveis: [],
  situacoes: [],
  submissaoDe: "",
  submissaoAte: "",
  sortBy: "submissao",
  sortDir: "desc",
};

export default function PropostasEdital() {
  const navigate = useNavigate();

  const [items, setItems] = useState<PropostaEdital[]>([]);
  const [agentes, setAgentes] = useState<SimpleOption[]>([]);
  const [projetos, setProjetos] = useState<SimpleOption[]>([]);
  const [editais, setEditais] = useState<SimpleOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<SimpleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [nextStepCard, setNextStepCard] = useState<{
    titulo: string;
    descricao?: string;
    acaoLabel?: string;
    acaoUrl?: string;
    variante?: "pendente" | "atencao" | "concluido" | "prioridade";
  } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<PropostaEdital | null>(
    null,
  );

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeExportar = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("PROPOSTAS_EDITAL")
      .then((d) => active && setPermissoes(d))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const raw = sessionStorage.getItem(PROPOSTA_EDITAL_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw));
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(PROPOSTA_EDITAL_NEXT_STEP_KEY);
    const timer = window.setTimeout(() => setNextStepCard(null), 60000);
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
    Promise.all([
      getPropostasEditais(),
      getAgentesOptions(),
      getProjetosOptions(),
      getEditaisOptions(),
      getOrganizacoesOptions(),
    ])
      .then(([a, b, c, d, e]) => {
        if (!active) return;
        setItems(a);
        setAgentes(b);
        setProjetos(c);
        setEditais(d);
        setOrganizacoes(e);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar propostas de edital.";
        if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
        else toast.error(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const organizacaoNome = useCallback(
    (id?: string) =>
      organizacoes.find((o) => String(o.id) === String(id))?.nome ?? "—",
    [organizacoes],
  );
  const editalNomeById = useCallback(
    (id?: string) =>
      editais.find((o) => String(o.id) === String(id))?.nome ?? "—",
    [editais],
  );
  const projetoNomeById = useCallback(
    (id?: string) =>
      projetos.find((o) => String(o.id) === String(id))?.nome ?? "—",
    [projetos],
  );
  const agenteNomeById = useCallback(
    (id?: string) =>
      agentes.find((o) => String(o.id) === String(id))?.nome ?? "—",
    [agentes],
  );
  const resumoMetasProposta = (_propostaId?: string) => "—";
  const textoOuTraco = (value?: string | null) => value?.trim() || "—";

  const editalFilterOptions = useMemo(
    () => editais.map((o) => ({ value: String(o.id), label: o.nome })),
    [editais],
  );
  const projetoFilterOptions = useMemo(
    () => projetos.map((o) => ({ value: String(o.id), label: o.nome })),
    [projetos],
  );
  const responsavelFilterOptions = useMemo(
    () => agentes.map((o) => ({ value: String(o.id), label: o.nome })),
    [agentes],
  );

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);
    const list = items.filter((item) => {
      if (termo) {
        const haystack = normalize(
          [
            item.tituloProjeto,
            editalNomeById(item.edital),
            organizacaoNome(item.organizacao),
            projetoNomeById(item.projeto),
            agenteNomeById(item.agente),
            statusPropostaEditalLabel(item.statusPropostaEdital),
          ].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (filtros.editais.length && !filtros.editais.includes(item.edital))
        return false;
      if (filtros.projetos.length && !filtros.projetos.includes(item.projeto))
        return false;
      if (
        filtros.responsaveis.length &&
        !filtros.responsaveis.includes(item.agente)
      )
        return false;
      if (
        filtros.situacoes.length &&
        !filtros.situacoes.includes(item.statusPropostaEdital)
      )
        return false;
      if (
        filtros.submissaoDe &&
        (!item.dataSubmissao || item.dataSubmissao < filtros.submissaoDe)
      )
        return false;
      if (
        filtros.submissaoAte &&
        (!item.dataSubmissao || item.dataSubmissao > filtros.submissaoAte)
      )
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "edital":
          return (
            editalNomeById(a.edital).localeCompare(
              editalNomeById(b.edital),
              "pt-BR",
            ) * dir
          );
        case "projeto":
          return (
            projetoNomeById(a.projeto).localeCompare(
              projetoNomeById(b.projeto),
              "pt-BR",
            ) * dir
          );
        case "submissao":
          return (
            (a.dataSubmissao ?? "").localeCompare(b.dataSubmissao ?? "") * dir
          );
        case "situacao":
          return (
            statusPropostaEditalLabel(a.statusPropostaEdital).localeCompare(
              statusPropostaEditalLabel(b.statusPropostaEdital),
              "pt-BR",
            ) * dir
          );
        default:
          return a.tituloProjeto.localeCompare(b.tituloProjeto, "pt-BR") * dir;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filtros, organizacoes]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const indicadores = useMemo(() => {
    const count = (...status: string[]) =>
      filtered.filter((i) => status.includes(i.statusPropostaEdital)).length;
    return {
      total: filtered.length,
      emPreparacao: count("RASCUNHO", "EM_PREENCHIMENTO", "PRONTA_PARA_ENVIO"),
      enviadas: count("ENVIADA"),
      aprovadas: count("APROVADA", "CLASSIFICADA"),
    };
  }, [filtered]);

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.editais.length ? 1 : 0) +
    (filtros.projetos.length ? 1 : 0) +
    (filtros.responsaveis.length ? 1 : 0) +
    (filtros.situacoes.length ? 1 : 0) +
    (filtros.submissaoDe || filtros.submissaoAte ? 1 : 0);

  const activeFilters: ActiveFilterItem[] = [];
  if (filtros.termo.trim()) {
    activeFilters.push({
      id: "termo",
      label: "Pesquisa",
      value: filtros.termo.trim(),
      onRemove: () => {
        setDraftField("termo", "");
        setFiltros((prev) => ({ ...prev, termo: "" }));
      },
    });
  }
  filtros.editais.forEach((editalId) => {
    activeFilters.push({
      id: `edital-${editalId}`,
      label: "Edital",
      value: editalNomeById(editalId),
      onRemove: () => {
        const next = filtros.editais.filter((e) => e !== editalId);
        setDraftField("editais", next);
        setFiltros((prev) => ({ ...prev, editais: next }));
      },
    });
  });
  filtros.projetos.forEach((projetoId) => {
    activeFilters.push({
      id: `projeto-${projetoId}`,
      label: "Projeto base",
      value: projetoNomeById(projetoId),
      onRemove: () => {
        const next = filtros.projetos.filter((p) => p !== projetoId);
        setDraftField("projetos", next);
        setFiltros((prev) => ({ ...prev, projetos: next }));
      },
    });
  });
  filtros.responsaveis.forEach((agenteId) => {
    activeFilters.push({
      id: `responsavel-${agenteId}`,
      label: "Responsável pela proposta",
      value: agenteNomeById(agenteId),
      onRemove: () => {
        const next = filtros.responsaveis.filter((a) => a !== agenteId);
        setDraftField("responsaveis", next);
        setFiltros((prev) => ({ ...prev, responsaveis: next }));
      },
    });
  });
  filtros.situacoes.forEach((status) => {
    activeFilters.push({
      id: `situacao-${status}`,
      label: "Situação da proposta",
      value: statusPropostaEditalLabel(status),
      onRemove: () => {
        const next = filtros.situacoes.filter((s) => s !== status);
        setDraftField("situacoes", next);
        setFiltros((prev) => ({ ...prev, situacoes: next }));
      },
    });
  });
  if (filtros.submissaoDe || filtros.submissaoAte) {
    activeFilters.push({
      id: "submissao",
      label: "Data de submissão",
      value: `${formatDateBr(filtros.submissaoDe)} a ${formatDateBr(filtros.submissaoAte)}`,
      onRemove: () => {
        setDraftField("submissaoDe", "");
        setDraftField("submissaoAte", "");
        setFiltros((prev) => ({ ...prev, submissaoDe: "", submissaoAte: "" }));
      },
    });
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearching(true);
    window.setTimeout(() => {
      setFiltros((prev) => ({
        ...draft,
        sortBy: prev.sortBy,
        sortDir: prev.sortDir,
      }));
      setSearching(false);
    }, 400);
  };

  const handleClearFiltros = () => {
    setDraft(filtrosIniciais);
    setFiltros((prev) => ({
      ...filtrosIniciais,
      sortBy: prev.sortBy,
      sortDir: prev.sortDir,
    }));
  };

  const toggleSort = (key: string) => {
    setFiltros((prev) => ({
      ...prev,
      sortBy: key as SortBy,
      sortDir: prev.sortBy === key && prev.sortDir === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (!podeExcluir) return;
    try {
      await deletePropostaEdital(Number(confirmDelete.id));
      setItems((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      toast.success("Proposta de edital removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover proposta.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    }
  };

  const exportColumns = [
    { header: "Proposta", key: "proposta" },
    { header: "Edital", key: "edital" },
    { header: "Organização proponente", key: "organizacao" },
    { header: "Projeto base", key: "projeto" },
    { header: "Responsável pela proposta", key: "responsavel" },
    { header: "Valor solicitado", key: "valorSolicitado" },
    { header: "Valor de contrapartida", key: "valorContrapartida" },
    { header: "Data de submissão", key: "dataSubmissao" },
    { header: "Situação da proposta", key: "situacao" },
    { header: "Metas vinculadas", key: "metas" },
    { header: "Observações internas", key: "observacoes" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      proposta: item.tituloProjeto,
      edital: editalNomeById(item.edital),
      organizacao: organizacaoNome(item.organizacao),
      projeto: projetoNomeById(item.projeto),
      responsavel: agenteNomeById(item.agente),
      valorSolicitado: formatBRLNumber(item.valorSolicitado),
      valorContrapartida: formatBRLNumber(item.valorContrapartida),
      dataSubmissao: formatDateBr(item.dataSubmissao),
      situacao: statusPropostaEditalLabel(item.statusPropostaEdital),
      metas: resumoMetasProposta(item.id),
      observacoes: textoOuTraco(item.observacoesInternas),
    }));

  const rowActions = (item: PropostaEdital) => [
    {
      label: "Gerenciar equipe",
      icon: Users,
      onClick: () => navigate(`/equipe-edital?proposta=${item.id}`),
    },
    {
      label: "Ver habilitação",
      icon: ClipboardCheck,
      onClick: () => navigate(`/habilitacao?proposta=${item.id}`),
    },
  ];

  if (!loadingPermissoes && !podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDeniedMessage)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Propostas de Edital"
          tooltip={propostaEditalTooltip}
          objective={propostaEditalObjetivo}
          actions={
            <>
              {podeCriar && (
                <Button
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                  onClick={() => navigate("/propostas-edital/novo")}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Cadastrar proposta
                </Button>
              )}
            </>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de propostas"
            value={indicadores.total}
            icon={FileSignature}
            variant="neutral"
          />
          <SummaryStatCard
            title="Em preparação"
            value={indicadores.emPreparacao}
            icon={ClipboardCheck}
            variant="warning"
          />
          <SummaryStatCard
            title="Enviadas"
            value={indicadores.enviadas}
            icon={Send}
            variant="info"
          />
          <SummaryStatCard
            title="Aprovadas"
            value={indicadores.aprovadas}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeCount}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroTermo">Pesquisa</FieldLabel>
                  <Input
                    id="filtroTermo"
                    value={draft.termo}
                    onChange={(e) => setDraftField("termo", e.target.value)}
                    placeholder="Digite um termo"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroEditais">Edital</FieldLabel>
                  <FilterMultiSelect
                    id="filtroEditais"
                    options={editalFilterOptions}
                    value={draft.editais}
                    onChange={(value) => setDraftField("editais", value)}
                    placeholder="Todos os editais"
                    summaryNoun="editais selecionados"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroProjetos">Projeto base</FieldLabel>
                  <FilterMultiSelect
                    id="filtroProjetos"
                    options={projetoFilterOptions}
                    value={draft.projetos}
                    onChange={(value) => setDraftField("projetos", value)}
                    placeholder="Todos os projetos"
                    summaryNoun="projetos selecionados"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroResponsaveis">
                    Agente responsável
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroResponsaveis"
                    options={responsavelFilterOptions}
                    value={draft.responsaveis}
                    onChange={(value) => setDraftField("responsaveis", value)}
                    placeholder="Todos os responsáveis"
                    summaryNoun="responsáveis selecionados"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacoes">
                    Situação da proposta
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacoes"
                    options={statusPropostaEditalOptions.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                    value={draft.situacoes}
                    onChange={(value) => setDraftField("situacoes", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSubmissaoDe">
                    Submissão de
                  </FieldLabel>
                  <Input
                    id="filtroSubmissaoDe"
                    type="date"
                    value={draft.submissaoDe}
                    onChange={(e) =>
                      setDraftField("submissaoDe", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSubmissaoAte">
                    Submissão até
                  </FieldLabel>
                  <Input
                    id="filtroSubmissaoAte"
                    type="date"
                    value={draft.submissaoAte}
                    onChange={(e) =>
                      setDraftField("submissaoAte", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={handleClearFiltros}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                  aria-busy={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden />
                  )}
                  {searching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>

          <ActiveFilters
            items={activeFilters}
            onClearAll={handleClearFiltros}
          />

          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/propostas-editais"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="propostas-de-edital"
              canExport={podeExportar}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando propostas de edital...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma proposta de edital cadastrada."
                emptyDescription="Cadastre uma proposta para organizar as informações do projeto e acompanhar sua participação no edital."
                noResultsTitle="Nenhuma proposta encontrada com os filtros selecionados."
                createLabel="Cadastrar proposta"
                onCreate={() => navigate("/propostas-edital/novo")}
                activeCount={activeCount}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="proposta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Proposta
                        </SortableTh>
                        <SortableTh
                          sortKey="edital"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Edital
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Organização proponente
                        </th>
                        <SortableTh
                          sortKey="projeto"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Projeto base
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Valor solicitado
                        </th>
                        <SortableTh
                          sortKey="submissao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de submissão
                        </SortableTh>
                        <SortableTh
                          sortKey="situacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação da proposta
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeExportar
                                  ? `/propostas-editais/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`proposta-edital-${item.id}.pdf`}
                              viewTo={`/propostas-edital/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/propostas-edital/${item.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item)
                                  : undefined
                              }
                              extraItems={rowActions(item)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={item.tituloProjeto} bold>
                              {item.tituloProjeto}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={editalNomeById(item.edital)}
                              muted
                            >
                              {editalNomeById(item.edital)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={organizacaoNome(item.organizacao)}
                              muted
                            >
                              {organizacaoNome(item.organizacao)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={projetoNomeById(item.projeto)}
                              muted
                            >
                              {projetoNomeById(item.projeto)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-medium tabular-nums text-foreground">
                            {formatBRLNumber(item.valorSolicitado)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBr(item.dataSubmissao)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.statusPropostaEdital}
                              context="proposta-edital"
                              ariaLabelPrefix="Situação da proposta"
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
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeExportar
                              ? `/propostas-editais/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`proposta-edital-${item.id}.pdf`}
                          viewTo={`/propostas-edital/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/propostas-edital/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item)
                              : undefined
                          }
                          extraItems={rowActions(item)}
                        />
                        <StatusPill
                          status={item.statusPropostaEdital}
                          context="proposta-edital"
                          ariaLabelPrefix="Situação da proposta"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {item.tituloProjeto}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {editalNomeById(item.edital)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-muted-foreground">
                            Organização proponente
                          </p>
                          <p className="text-foreground">
                            {organizacaoNome(item.organizacao)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Projeto base</p>
                          <p className="text-foreground">
                            {projetoNomeById(item.projeto)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Valor solicitado
                          </p>
                          <p className="font-medium tabular-nums text-foreground">
                            {formatBRLNumber(item.valorSolicitado)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Data de submissão
                          </p>
                          <p className="text-foreground">
                            {formatDateBr(item.dataSubmissao)}
                          </p>
                        </div>
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
                  entityLabel="proposta"
                  entityLabelPlural="propostas"
                  pageSizeLabel="Propostas por página"
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
            <AlertDialogTitle>Remover proposta de edital?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A proposta{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.tituloProjeto}
              </span>{" "}
              será removida da listagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Propostas de Edital"
        href="https://www.aurit.com.br/wiki/editais/propostas-de-edital"
      />
    </AppLayout>
  );
}

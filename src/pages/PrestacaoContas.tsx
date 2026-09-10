import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FileDown,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Search,
  Target,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
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
  formatDateBr,
  getAgentesOptions,
  getPrestacaoMetasOptions,
  getPrestacoesContas,
  getPropostasEditalOptions,
  deletePrestacaoContas,
  produtoGeradoLabel,
  statusPrestacaoContasLabel,
  statusPrestacaoContasOptions,
  type AgenteOption,
  type PrestacaoMetaOption,
  type PrestacaoContas,
  type PropostaEditalOption,
} from "@/data/prestacaoContas";
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadPrestacaoContasReport as exportPrestacaoContasPdf } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";

const fieldClass = "h-9";
const prestacaoContasTooltip =
  "Nesta página são registradas e acompanhadas as informações da prestação de contas, reunindo os dados necessários para demonstrar a execução, os resultados alcançados e o cumprimento das metas.";
const prestacaoContasObjetivo =
  "Registre e organize as informações necessárias para apresentar a prestação de contas da proposta, demonstrando o que foi executado, os resultados alcançados e o cumprimento das metas. Mantenha também atualizados os dados de entrega e, quando houver, o resultado da análise.";
const PRESTACAO_CONTAS_NEXT_STEP_KEY = "aurit:prestacao-contas:next-step-card";

interface NextStepData {
  titulo: string;
  descricao?: string;
  acaoLabel?: string;
  acaoUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "proposta", label: "Proposta" },
  { value: "responsavel", label: "Responsável" },
  { value: "entrega", label: "Data de entrega" },
  { value: "situacao", label: "Situação da prestação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  propostas: string[];
  responsaveis: string[];
  situacoes: string[];
  entregaDe: string;
  entregaAte: string;
  analiseDe: string;
  analiseAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  propostas: [],
  responsaveis: [],
  situacoes: [],
  entregaDe: "",
  entregaAte: "",
  analiseDe: "",
  analiseAte: "",
  sortBy: "entrega",
  sortDir: "desc",
};

export default function PrestacaoContasPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<PrestacaoContas[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [prestacaoMetas, setPrestacaoMetas] = useState<PrestacaoMetaOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<PrestacaoContas | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] = useState<NextStepData | null>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeExportar = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("PRESTACAO_CONTAS")
      .then((data) => active && setPermissoes(data))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw) as NextStepData);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);
    const timer = window.setTimeout(() => setNextStepCard(null), 60_000);
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
    setAccessDeniedMessage(null);
    Promise.all([
      getPrestacoesContas(),
      getPropostasEditalOptions(),
      getAgentesOptions(),
      getPrestacaoMetasOptions(),
    ])
      .then(([itemsData, propostasData, agentesData, metasData]) => {
        if (!active) return;
        setItems(itemsData);
        setPropostas(propostasData);
        setAgentes(agentesData);
        setPrestacaoMetas(metasData);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar prestações de contas.";
        if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
        else toast.error(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const propostaEditalNome = useCallback(
    (id?: string) =>
      propostas.find((item) => String(item.id) === String(id))?.nome ?? "—",
    [propostas],
  );
  const responsavelNome = useCallback(
    (id?: string) =>
      agentes.find((item) => String(item.id) === String(id))?.nome ?? "—",
    [agentes],
  );
  const metasAvaliadasResumo = (item: PrestacaoContas) => {
    const total = item.prestacaoMetas?.length ?? 0;
    return total ? `${total} ${total === 1 ? "meta" : "metas"}` : "—";
  };
  const produtosGeradosResumo = (values?: string[]) => {
    const total = values?.length ?? 0;
    return total ? `${total} ${total === 1 ? "produto" : "produtos"}` : "—";
  };
  const textoOuTraco = (value?: string | null) => value?.trim() || "—";

  const handleExportPdf = async (item: PrestacaoContas) => {
    if (!podeExportar) return;
    await exportPrestacaoContasPdf({
      id: item.id,
      propostaEdital: propostaEditalNome(item.propostaEdital),
      agente: responsavelNome(item.agente),
      dataEntrega: item.dataEntrega,
      produtosGerados: item.produtosGerados.map(produtoGeradoLabel),
      outrosProdutosGerados: item.outrosProdutosGerados,
      prestacaoMetas: item.prestacaoMetas.map(
        (meta) =>
          prestacaoMetas.find((entry) => String(entry.id) === String(meta.id))
            ?.nome ?? `Prestação de meta ${meta.id}`,
      ),
      disponibilizacaoProdutosPublico: item.disponibilizacaoProdutosPublico,
      resultadosGeradosProjeto: item.resultadosGeradosProjeto,
      resumoResultados: item.resumoResultados,
    });
  };

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const propostaFilterOptions = useMemo(
    () => propostas.map((p) => ({ value: String(p.id), label: p.nome })),
    [propostas],
  );

  const responsavelFilterOptions = useMemo(
    () => agentes.map((a) => ({ value: String(a.id), label: a.nome })),
    [agentes],
  );

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);
    const list = items.filter((item) => {
      if (termo) {
        const haystack = normalize(
          [
            propostaEditalNome(item.propostaEdital),
            responsavelNome(item.agente),
            statusPrestacaoContasLabel(item.statusPrestacaoContas),
            item.resumoResultados ?? "",
            item.resultadosGeradosProjeto ?? "",
            item.outrosProdutosGerados ?? "",
            (item.produtosGerados ?? []).map(produtoGeradoLabel).join(" "),
          ].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(item.propostaEdital)
      )
        return false;
      if (
        filtros.responsaveis.length &&
        !filtros.responsaveis.includes(item.agente)
      )
        return false;
      if (
        filtros.situacoes.length &&
        !filtros.situacoes.includes(item.statusPrestacaoContas)
      )
        return false;
      if (
        filtros.entregaDe &&
        (!item.dataEntrega || item.dataEntrega < filtros.entregaDe)
      )
        return false;
      if (
        filtros.entregaAte &&
        (!item.dataEntrega || item.dataEntrega > filtros.entregaAte)
      )
        return false;
      if (
        filtros.analiseDe &&
        (!item.dataAnalise || item.dataAnalise < filtros.analiseDe)
      )
        return false;
      if (
        filtros.analiseAte &&
        (!item.dataAnalise || item.dataAnalise > filtros.analiseAte)
      )
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "responsavel":
          return (
            responsavelNome(a.agente).localeCompare(
              responsavelNome(b.agente),
              "pt-BR",
            ) * dir
          );
        case "entrega":
          return (a.dataEntrega ?? "").localeCompare(b.dataEntrega ?? "") * dir;
        case "situacao":
          return (
            statusPrestacaoContasLabel(a.statusPrestacaoContas).localeCompare(
              statusPrestacaoContasLabel(b.statusPrestacaoContas),
              "pt-BR",
            ) * dir
          );
        default:
          return (
            propostaEditalNome(a.propostaEdital).localeCompare(
              propostaEditalNome(b.propostaEdital),
              "pt-BR",
            ) * dir
          );
      }
    });
  }, [items, filtros, propostaEditalNome, responsavelNome]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.propostas.length ? 1 : 0) +
    (filtros.responsaveis.length ? 1 : 0) +
    (filtros.situacoes.length ? 1 : 0) +
    (filtros.entregaDe || filtros.entregaAte ? 1 : 0) +
    (filtros.analiseDe || filtros.analiseAte ? 1 : 0);

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
  filtros.propostas.forEach((propostaId) => {
    activeFilters.push({
      id: `proposta-${propostaId}`,
      label: "Proposta de edital",
      value: propostaEditalNome(propostaId),
      onRemove: () => {
        const next = filtros.propostas.filter((p) => p !== propostaId);
        setDraftField("propostas", next);
        setFiltros((prev) => ({ ...prev, propostas: next }));
      },
    });
  });
  filtros.responsaveis.forEach((agenteId) => {
    activeFilters.push({
      id: `responsavel-${agenteId}`,
      label: "Responsável",
      value: responsavelNome(agenteId),
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
      label: "Situação da prestação",
      value: statusPrestacaoContasLabel(status),
      onRemove: () => {
        const next = filtros.situacoes.filter((s) => s !== status);
        setDraftField("situacoes", next);
        setFiltros((prev) => ({ ...prev, situacoes: next }));
      },
    });
  });
  if (filtros.entregaDe || filtros.entregaAte) {
    activeFilters.push({
      id: "entrega",
      label: "Data de entrega",
      value: `${formatDateBr(filtros.entregaDe)} a ${formatDateBr(filtros.entregaAte)}`,
      onRemove: () => {
        setDraftField("entregaDe", "");
        setDraftField("entregaAte", "");
        setFiltros((prev) => ({ ...prev, entregaDe: "", entregaAte: "" }));
      },
    });
  }
  if (filtros.analiseDe || filtros.analiseAte) {
    activeFilters.push({
      id: "analise",
      label: "Data da análise",
      value: `${formatDateBr(filtros.analiseDe)} a ${formatDateBr(filtros.analiseAte)}`,
      onRemove: () => {
        setDraftField("analiseDe", "");
        setDraftField("analiseAte", "");
        setFiltros((prev) => ({ ...prev, analiseDe: "", analiseAte: "" }));
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
    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para excluir prestação de contas.",
      );
      return;
    }
    try {
      await deletePrestacaoContas(Number(confirmDelete.id));
      setItems((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      toast.success("Prestação de contas removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover prestação de contas.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    }
  };

  const exportColumns = [
    { header: "Proposta", key: "proposta" },
    { header: "Responsável", key: "responsavel" },
    { header: "Data de entrega", key: "dataEntrega" },
    { header: "Situação", key: "situacao" },
    { header: "Resumo dos resultados", key: "resumo" },
    { header: "Resultados gerados", key: "resultados" },
    { header: "Produtos gerados", key: "produtos" },
    { header: "Outros produtos gerados", key: "outrosProdutos" },
    { header: "Disponibilização ao público", key: "disponibilizacao" },
    { header: "Data da análise", key: "dataAnalise" },
    { header: "Parecer", key: "parecer" },
    { header: "Observação da análise", key: "observacaoAnalise" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      proposta: propostaEditalNome(item.propostaEdital),
      responsavel: responsavelNome(item.agente),
      dataEntrega: formatDateBr(item.dataEntrega),
      situacao: statusPrestacaoContasLabel(item.statusPrestacaoContas),
      resumo: textoOuTraco(item.resumoResultados),
      resultados: textoOuTraco(item.resultadosGeradosProjeto),
      produtos:
        (item.produtosGerados ?? []).map(produtoGeradoLabel).join(", ") || "—",
      outrosProdutos: textoOuTraco(item.outrosProdutosGerados),
      disponibilizacao: textoOuTraco(item.disponibilizacaoProdutosPublico),
      dataAnalise: formatDateBr(item.dataAnalise),
      parecer: textoOuTraco(item.parecerPrestacaoContas),
      observacaoAnalise: textoOuTraco(item.observacaoAnalise),
    }));

  if (!loadingPermissoes && !podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Prestação de Contas"
          tooltip={prestacaoContasTooltip}
          objective={prestacaoContasObjetivo}
          actions={
            <>
              {podeCriar && (
                <Button
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                  onClick={() => navigate("/prestacao-contas/novo")}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Cadastrar prestação
                </Button>
              )}
            </>
          }
        />

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
                  <FieldLabel htmlFor="filtroPropostas">
                    Proposta de edital
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroPropostas"
                    options={propostaFilterOptions}
                    value={draft.propostas}
                    onChange={(value) => setDraftField("propostas", value)}
                    placeholder="Todas as propostas"
                    summaryNoun="propostas selecionadas"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroResponsaveis">
                    Responsável
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
                    Situação da prestação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacoes"
                    options={statusPrestacaoContasOptions.map((o) => ({
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
                  <FieldLabel htmlFor="filtroEntregaDe">Entrega de</FieldLabel>
                  <Input
                    id="filtroEntregaDe"
                    type="date"
                    value={draft.entregaDe}
                    onChange={(e) => setDraftField("entregaDe", e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroEntregaAte">
                    Entrega até
                  </FieldLabel>
                  <Input
                    id="filtroEntregaAte"
                    type="date"
                    value={draft.entregaAte}
                    onChange={(e) =>
                      setDraftField("entregaAte", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAnaliseDe">Análise de</FieldLabel>
                  <Input
                    id="filtroAnaliseDe"
                    type="date"
                    value={draft.analiseDe}
                    onChange={(e) => setDraftField("analiseDe", e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAnaliseAte">
                    Análise até
                  </FieldLabel>
                  <Input
                    id="filtroAnaliseAte"
                    type="date"
                    value={draft.analiseAte}
                    onChange={(e) =>
                      setDraftField("analiseAte", e.target.value)
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
              reportTo="/relatorios/prestacoes-contas"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="prestacao-de-contas"
              canExport={podeExportar}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando prestações de contas...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma prestação de contas cadastrada."
                emptyDescription="Registre a prestação de contas para consolidar os resultados, metas, produtos e informações finais da execução da proposta."
                noResultsTitle="Nenhuma prestação encontrada com os filtros selecionados."
                createLabel="Cadastrar prestação"
                onCreate={() => navigate("/prestacao-contas/novo")}
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
                          sortKey="responsavel"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Responsável
                        </SortableTh>
                        <SortableTh
                          sortKey="entrega"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de entrega
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Metas avaliadas
                        </th>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Produtos gerados
                        </th>
                        <SortableTh
                          sortKey="situacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação da prestação
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => {
                        const proposta = propostaEditalNome(
                          item.propostaEdital,
                        );
                        const responsavel = responsavelNome(item.agente);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeExportar
                                    ? `/prestacoes-contas/${item.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`prestacao-contas-${item.id}.pdf`}
                                viewTo={`/prestacao-contas/${item.id}`}
                                editTo={
                                  podeEditar
                                    ? `/prestacao-contas/${item.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(item)
                                    : undefined
                                }
                              />
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={proposta} bold>
                                {proposta}
                              </TableCellText>
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={responsavel} muted>
                                {responsavel}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {formatDateBr(item.dataEntrega)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {metasAvaliadasResumo(item)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {produtosGeradosResumo(item.produtosGerados)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={item.statusPrestacaoContas}
                                context="prestacao-contas"
                                ariaLabelPrefix="Situação da prestação"
                              />
                            </td>
                          </tr>
                        );
                      })}
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
                              ? `/prestacoes-contas/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`prestacao-contas-${item.id}.pdf`}
                          viewTo={`/prestacao-contas/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/prestacao-contas/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item)
                              : undefined
                          }
                        />
                        <StatusPill
                          status={item.statusPrestacaoContas}
                          context="prestacao-contas"
                          ariaLabelPrefix="Situação da prestação"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {propostaEditalNome(item.propostaEdital)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {responsavelNome(item.agente)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Entrega: {formatDateBr(item.dataEntrega)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" aria-hidden />
                          {metasAvaliadasResumo(item)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" aria-hidden />
                          {produtosGeradosResumo(item.produtosGerados)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="prestação"
                  entityLabelPlural="prestações"
                  pageSizeLabel="Prestações por página"
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
            <AlertDialogTitle>
              Remover esta prestação de contas?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A prestação de contas da proposta “
              {confirmDelete
                ? propostaEditalNome(confirmDelete.propostaEdital)
                : ""}
              ” será removida. Esta ação não pode ser desfeita.
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
        pageTitle="Prestação de Contas"
        href="https://www.aurit.com.br/wiki/prestacao-de-contas/prestacao-de-contas"
      />
    </AppLayout>
  );
}

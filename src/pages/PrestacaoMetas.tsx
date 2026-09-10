import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileDown, Loader2, Plus, RotateCcw, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
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
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadPrestacaoMetaReport as exportPrestacaoMetasPdf } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deletePrestacaoMeta,
  formatQuantidadeExecutada,
  getEvidenciasExecucaoOptions,
  getMetasProjetoOptions,
  getPrestacaoMetas,
  statusCumprimentoLabel,
  statusCumprimentoOptions,
  type EvidenciaOption,
  type MetaProjetoOption,
  type PrestacaoMeta,
} from "@/data/prestacaoMetas";

const cumprimentoMetasTooltip =
  "Nesta página é registrado e avaliado o cumprimento das metas previstas no projeto, comparando o que foi planejado com os resultados alcançados. Também podem ser vinculadas evidências já cadastradas para comprovar a execução e os resultados de cada meta.";
const cumprimentoMetasObjetivo =
  "Registre os resultados alcançados em cada meta do projeto, avalie seu cumprimento, informe as justificativas necessárias e selecione as evidências já cadastradas que comprovam sua execução.";

const formatPercentualExecutado = (value?: number) =>
  value == null || Number.isNaN(value)
    ? "—"
    : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const fieldClass = "h-9";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "meta", label: "Meta" },
  { value: "quantidade", label: "Quantidade executada" },
  { value: "percentual", label: "Percentual executado" },
  { value: "situacao", label: "Situação do cumprimento" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  metas: string[];
  situacoes: string[];
  evidencias: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  metas: [],
  situacoes: [],
  evidencias: "",
  sortBy: "meta",
  sortDir: "asc",
};

const evidenciasFilterOptions = [
  { value: "COM", label: "Com evidências" },
  { value: "SEM", label: "Sem evidências" },
];

const PRESTACAO_META_NEXT_STEP_KEY = "aurit:prestacao-metas:next-step-card";

export default function PrestacaoMetasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prestacaoContexto = searchParams.get("prestacaoContasId") ?? "";

  const [items, setItems] = useState<PrestacaoMeta[]>([]);
  const [metas, setMetas] = useState<MetaProjetoOption[]>([]);
  const [evidenciasDisponiveis, setEvidenciasDisponiveis] = useState<
    EvidenciaOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [nextStepCard, setNextStepCard] = useState<{
    titulo: string;
    descricao: string;
    acaoLabel: string;
    acaoUrl: string;
    variante?: "pendente" | "atencao" | "concluido";
  } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<PrestacaoMeta | null>(
    null,
  );

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("PRESTACAO_METAS")
      .then((data) => active && setPermissoes(data))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(PRESTACAO_META_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        titulo: string;
        descricao: string;
        acaoLabel: string;
        acaoUrl: string;
        variante?: "pendente" | "atencao" | "concluido";
      };
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(PRESTACAO_META_NEXT_STEP_KEY);
    const timer = window.setTimeout(() => setNextStepCard(null), 60_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;
    if (!podeVisualizar) {
      setLoading(false);
      return;
    }
    void carregarDados();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const [registros, metasData, evidenciasData] = await Promise.all([
        getPrestacaoMetas(),
        getMetasProjetoOptions(),
        getEvidenciasExecucaoOptions(),
      ]);
      setItems(registros);
      setMetas(metasData);
      setEvidenciasDisponiveis(evidenciasData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar cumprimentos de metas.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const metaProjetoNome = (id?: string) =>
    id
      ? (metas.find((meta) => String(meta.id) === String(id))?.tituloMeta ??
        `Meta ${id}`)
      : "—";
  const metaProjetoDescricao = (_id?: string) => "";
  const evidenciaNome = (id?: string) =>
    id
      ? (evidenciasDisponiveis.find((item) => String(item.id) === String(id))
          ?.tituloEvidencia ?? `Evidência vinculada #${id}`)
      : "—";
  const evidenciasLabelCurto = (ids: string[]) =>
    ids.length === 0
      ? "Nenhuma"
      : `${ids.length} ${ids.length === 1 ? "evidência" : "evidências"}`;

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const metaFilterOptions = useMemo(
    () => metas.map((m) => ({ value: String(m.id), label: m.tituloMeta })),
    [metas],
  );

  const escopo = items;

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);
    const list = escopo.filter((item) => {
      if (termo) {
        const haystack = normalize(
          [
            metaProjetoNome(item.metaProjeto),
            metaProjetoDescricao(item.metaProjeto),
            item.quantidadeExecutada ?? "",
            statusCumprimentoLabel(item.statusCumprimentoMeta),
            item.observacaoCumprimento ?? "",
          ].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (filtros.metas.length && !filtros.metas.includes(item.metaProjeto))
        return false;
      if (
        filtros.situacoes.length &&
        !filtros.situacoes.includes(item.statusCumprimentoMeta)
      )
        return false;
      if (filtros.evidencias === "COM" && (item.evidencias?.length ?? 0) === 0)
        return false;
      if (filtros.evidencias === "SEM" && (item.evidencias?.length ?? 0) > 0)
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "quantidade":
          return (
            normalize(a.quantidadeExecutada ?? "").localeCompare(
              normalize(b.quantidadeExecutada ?? ""),
              "pt-BR",
            ) * dir
          );
        case "percentual":
          return (
            ((a.percentualExecutado ?? -1) - (b.percentualExecutado ?? -1)) *
            dir
          );
        case "situacao":
          return (
            statusCumprimentoLabel(a.statusCumprimentoMeta).localeCompare(
              statusCumprimentoLabel(b.statusCumprimentoMeta),
              "pt-BR",
            ) * dir
          );
        default:
          return (
            metaProjetoNome(a.metaProjeto).localeCompare(
              metaProjetoNome(b.metaProjeto),
              "pt-BR",
            ) * dir
          );
      }
    });
  }, [escopo, filtros]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.metas.length ? 1 : 0) +
    (filtros.situacoes.length ? 1 : 0) +
    (filtros.evidencias ? 1 : 0);

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
  filtros.metas.forEach((metaId) => {
    activeFilters.push({
      id: `meta-${metaId}`,
      label: "Meta do projeto",
      value: metaProjetoNome(metaId),
      onRemove: () => {
        const next = filtros.metas.filter((m) => m !== metaId);
        setDraftField("metas", next);
        setFiltros((prev) => ({ ...prev, metas: next }));
      },
    });
  });
  filtros.situacoes.forEach((status) => {
    activeFilters.push({
      id: `situacao-${status}`,
      label: "Situação do cumprimento",
      value: statusCumprimentoLabel(status),
      onRemove: () => {
        const next = filtros.situacoes.filter((s) => s !== status);
        setDraftField("situacoes", next);
        setFiltros((prev) => ({ ...prev, situacoes: next }));
      },
    });
  });
  if (filtros.evidencias) {
    activeFilters.push({
      id: "evidencias",
      label: "Evidências",
      value:
        evidenciasFilterOptions.find((o) => o.value === filtros.evidencias)
          ?.label ?? filtros.evidencias,
      onRemove: () => {
        setDraftField("evidencias", "");
        setFiltros((prev) => ({ ...prev, evidencias: "" }));
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
        "Você não possui permissão para excluir cumprimento de metas.",
      );
      return;
    }
    try {
      await deletePrestacaoMeta(Number(confirmDelete.id));
      setItems((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      toast.success("Registro de cumprimento removido com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover cumprimento de metas.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    }
  };

  const handleExportPdf = async (item: PrestacaoMeta) => {
    if (!podeGerarPdf) return;
    await exportPrestacaoMetasPdf({
      id: item.id,
      metaProjeto: metaProjetoNome(item.metaProjeto),
      quantidadeExecutada: formatQuantidadeExecutada(item.quantidadeExecutada),
      observacaoCumprimento: item.observacaoCumprimento,
      statusCumprimentoMeta: statusCumprimentoLabel(item.statusCumprimentoMeta),
      evidencias: item.evidencias.map(evidenciaNome),
    });
  };

  const novoHref = prestacaoContexto
    ? `/prestacao-metas/novo?prestacaoContasId=${prestacaoContexto}`
    : "/prestacao-metas/novo";

  const exportColumns = [
    { header: "Meta", key: "meta" },
    { header: "Quantidade executada", key: "quantidade" },
    { header: "Percentual executado", key: "percentual" },
    { header: "Situação do cumprimento", key: "situacao" },
    { header: "Evidências", key: "evidencias" },
    { header: "Observação sobre o cumprimento", key: "observacao" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      meta: metaProjetoNome(item.metaProjeto),
      quantidade: formatQuantidadeExecutada(item.quantidadeExecutada),
      percentual: formatPercentualExecutado(item.percentualExecutado),
      situacao: statusCumprimentoLabel(item.statusCumprimentoMeta),
      evidencias: evidenciasLabelCurto(item.evidencias ?? []),
      observacao: item.observacaoCumprimento?.trim() || "—",
    }));

  const metasDisponiveis = metas.filter(
    (meta) =>
      !items.some((item) => String(item.metaProjeto) === String(meta.id)),
  );

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
          title="Cumprimento de Metas"
          tooltip={cumprimentoMetasTooltip}
          objective={cumprimentoMetasObjetivo}
          actions={
            <>
              {podeCriar && (
                <Button
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                  onClick={() => navigate(novoHref)}
                  disabled={metasDisponiveis.length === 0}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Cadastrar cumprimento
                </Button>
              )}
            </>
          }
        />

        {metasDisponiveis.length === 0 && !loading && (
          <p className="mb-4 rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            Todas as metas disponíveis já possuem registro de cumprimento.
          </p>
        )}

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
                  <FieldLabel htmlFor="filtroMetas">Meta do projeto</FieldLabel>
                  <FilterMultiSelect
                    id="filtroMetas"
                    options={metaFilterOptions}
                    value={draft.metas}
                    onChange={(value) => setDraftField("metas", value)}
                    placeholder="Todas as metas"
                    summaryNoun="metas selecionadas"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacoes">
                    Situação do cumprimento
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacoes"
                    options={statusCumprimentoOptions.map((o) => ({
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
                  <FieldLabel htmlFor="filtroEvidencias">Evidências</FieldLabel>
                  <FilterMultiSelect
                    id="filtroEvidencias"
                    options={evidenciasFilterOptions}
                    value={draft.evidencias ? [draft.evidencias] : []}
                    onChange={(value) =>
                      setDraftField("evidencias", value[value.length - 1] ?? "")
                    }
                    placeholder="Todos os registros"
                    summaryNoun="opções selecionadas"
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
              reportTo="/relatorios/prestacoes-metas"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="cumprimento-de-metas"
              canExport={podeGerarPdf}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando cumprimento de metas...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma meta avaliada."
                emptyDescription="Registre o cumprimento das metas do projeto para comparar os resultados alcançados com o que foi previsto."
                noResultsTitle="Nenhum registro encontrado com os filtros selecionados."
                createLabel="Cadastrar cumprimento"
                onCreate={() => navigate(novoHref)}
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
                          sortKey="meta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Meta
                        </SortableTh>
                        <SortableTh
                          sortKey="quantidade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Quantidade executada
                        </SortableTh>
                        <SortableTh
                          sortKey="percentual"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Percentual executado
                        </SortableTh>
                        <SortableTh
                          sortKey="situacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação do cumprimento
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => {
                        const titulo = metaProjetoNome(item.metaProjeto);
                        const descricao = metaProjetoDescricao(
                          item.metaProjeto,
                        );
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                viewTo={`/prestacao-metas/${item.id}`}
                                reportEndpoint={`/prestacao-metas/${item.id}/relatorio`}
                                editTo={
                                  podeEditar
                                    ? `/prestacao-metas/${item.id}/editar`
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
                              <TableCellText text={titulo} bold>
                                {titulo}
                              </TableCellText>
                              {descricao && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {descricao}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {formatQuantidadeExecutada(
                                item.quantidadeExecutada,
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-semibold text-foreground">
                              {formatPercentualExecutado(
                                item.percentualExecutado,
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={item.statusCumprimentoMeta}
                                context="cumprimento-meta"
                                ariaLabelPrefix="Situação do cumprimento"
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
                          viewTo={`/prestacao-metas/${item.id}`}
                          reportEndpoint={`/prestacao-metas/${item.id}/relatorio`}
                          editTo={
                            podeEditar
                              ? `/prestacao-metas/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item)
                              : undefined
                          }
                        />
                        <StatusPill
                          status={item.statusCumprimentoMeta}
                          context="cumprimento-meta"
                          ariaLabelPrefix="Situação do cumprimento"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {metaProjetoNome(item.metaProjeto)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Executado:{" "}
                        {formatQuantidadeExecutada(item.quantidadeExecutada)} ·{" "}
                        {formatPercentualExecutado(item.percentualExecutado)}
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
            <AlertDialogTitle>
              Remover este registro de cumprimento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O cumprimento registrado para a meta “
              {confirmDelete ? metaProjetoNome(confirmDelete.metaProjeto) : ""}”
              será removido. Esta ação não pode ser desfeita.
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
        pageTitle="Cumprimento de Metas"
        href="https://www.aurit.com.br/wiki/prestacao-de-contas/cumprimento-de-metas"
      />
    </AppLayout>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Award,
  CheckCircle2,
  FileDown,
  Hourglass,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadResultadoPropostaReport as exportResultadoPropostaPdf } from "@/lib/individualReportDownload";
import { getTipoPlanoAtual } from "@/lib/plano";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteResultadoProposta,
  editalNomeResultado,
  formatDateBr,
  formatPontuacao,
  getPropostasEditalOptions,
  getResultadosPropostas,
  propostaNomeResultado,
  statusResultadoPropostaOptions,
  statusResultadoPropostaLabel,
  type PropostaEditalOption,
  type ResultadoProposta,
} from "@/data/resultadosPropostas";
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
import type { ExportColumn } from "@/utils/exportUtils";

type SortKey =
  | "proposta"
  | "edital"
  | "status"
  | "pontuacao"
  | "dataResultado"
  | "recurso";

interface ResultadoFiltros {
  termo: string;
  propostas: string[];
  editais: string[];
  resultados: string[];
  dataInicio: string;
  dataFim: string;
}

const filtrosIniciais: ResultadoFiltros = {
  termo: "",
  propostas: [],
  editais: [],
  resultados: [],
  dataInicio: "",
  dataFim: "",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function ResultadosPropostas() {
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<ResultadoFiltros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<ResultadoFiltros>(filtrosIniciais);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<ResultadoProposta[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);
        setAccessDeniedMessage(null);

        const data =
          await getPermissoesUsuarioLogadoPorModulo("RESULTADO_PROPOSTA");

        if (!active) return;

        setPermissoes(data);

        const tipoPlano = await getTipoPlanoAtual();

        if (!active) return;

        if (tipoPlano === "PLANO_GRATUITO") {
          setAccessDeniedMessage(
            "Este módulo está disponível apenas no plano pago.",
          );
          return;
        }

        if (!data.VISUALIZAR) {
          return;
        }
      } catch (error) {
        console.error(error);

        if (!active) return;

        const message =
          error instanceof Error
            ? error.message
            : "Erro ao verificar acesso aos resultados da proposta.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (accessDeniedMessage) {
      setLoading(false);
      return;
    }

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregarDados();
  }, [accessDeniedMessage, loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [resultadosData, propostasData] = await Promise.all([
        getResultadosPropostas(),
        getPropostasEditalOptions(),
      ]);

      setItems(resultadosData);
      setPropostas(propostasData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar Resultados da Proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaNome = useCallback(
    (item: ResultadoProposta) =>
      propostaNomeResultado(
        item.propostaEdital,
        propostas,
        item.nomePropostaEdital,
      ),
    [propostas],
  );

  const editalNome = useCallback(
    (item: ResultadoProposta) =>
      editalNomeResultado(item.propostaEdital, propostas, item.nomeEdital),
    [propostas],
  );

  const getDataEnvioRecurso = (item: ResultadoProposta) =>
    item.dataEnvioRecurso || null;

  const getDescricaoRecurso = (item: ResultadoProposta) =>
    item.descricaoRecurso || null;

  const getDocumentoRecurso = (item: ResultadoProposta) =>
    item.urlDocumentoRecurso || null;

  const propostaFilterOptions = useMemo(
    () => propostas.map((item) => ({ value: item.id, label: item.nome })),
    [propostas],
  );

  const editalFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    propostas.forEach((item) => {
      if (item.editalId)
        options.set(
          item.editalId,
          item.nomeEdital || `Edital ${item.editalId}`,
        );
    });
    items.forEach((item) => {
      if (item.edital) options.set(item.edital, editalNome(item));
    });
    return Array.from(options, ([value, label]) => ({ value, label })).sort(
      (a, b) =>
        a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
  }, [editalNome, items, propostas]);

  const resultadoFilterOptions = useMemo(
    () => statusResultadoPropostaOptions.map((item) => ({ ...item })),
    [],
  );

  const setDraftField = <K extends keyof ResultadoFiltros>(
    key: K,
    value: ResultadoFiltros[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));

  const filtered = useMemo(() => {
    const term = normalize(filtros.termo);

    return items.filter((item) => {
      if (
        term &&
        !normalize(
          [
            propostaNome(item),
            editalNome(item),
            statusResultadoPropostaLabel(item.statusResultadoProposta),
            formatPontuacao(item.pontuacao),
            formatDateBr(item.dataResultado),
            item.recursoInterposto ? "sim recurso" : "não sem recurso",
            item.urlRelatorioAvaliacao ? "anexado relatório" : "sem relatório",
            item.observacoes,
          ].join(" "),
        ).includes(term)
      )
        return false;
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(item.propostaEdital)
      )
        return false;
      if (filtros.editais.length && !filtros.editais.includes(item.edital))
        return false;
      if (
        filtros.resultados.length &&
        !filtros.resultados.includes(item.statusResultadoProposta)
      )
        return false;
      if (
        filtros.dataInicio &&
        (!item.dataResultado || item.dataResultado < filtros.dataInicio)
      )
        return false;
      if (
        filtros.dataFim &&
        (!item.dataResultado || item.dataResultado > filtros.dataFim)
      )
        return false;
      return true;
    });
  }, [filtros, items, propostaNome, editalNome]);

  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "proposta":
          return propostaNome(item);
        case "edital":
          return editalNome(item);
        case "status":
          return statusResultadoPropostaLabel(item.statusResultadoProposta);
        case "pontuacao":
          return Number(item.pontuacao || 0);
        case "dataResultado":
          return item.dataResultado ?? "";
        case "recurso":
          return item.recursoInterposto;
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, JSON.stringify(filtros));

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searching) return;
    setSearching(true);
    setFiltros(draft);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const applyFiltros = (next: ResultadoFiltros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
  };

  const handleClearFiltros = () => applyFiltros(filtrosIniciais);

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para excluir Resultado da Proposta.",
      );
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteResultadoProposta(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Resultado da Proposta excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir Resultado da Proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  async function handleExportPdf(item: ResultadoProposta) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    try {
      setGeneratingPdfId(item.id);
      await exportResultadoPropostaPdf({
        id: item.id,
        propostaEdital: propostaNome(item),
        statusResultadoProposta: statusResultadoPropostaLabel(
          item.statusResultadoProposta,
        ),
        dataResultado: item.dataResultado,
        pontuacao: item.pontuacao,

        abriuRecurso: item.recursoInterposto,
        recursoAberto: item.recursoInterposto,

        dataEnvioRecurso: getDataEnvioRecurso(item),
        descricaoRecurso: getDescricaoRecurso(item),
        documentoRecurso: getDocumentoRecurso(item),

        observacoes: item.observacoes,
      });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a ficha do resultado da proposta.");
    } finally {
      setGeneratingPdfId(null);
    }
  }

  const indicadores = {
    total: filtered.length,
    aprovados: filtered.filter(
      (item) => item.statusResultadoProposta === "APROVADO",
    ).length,
    suplentes: filtered.filter(
      (item) => item.statusResultadoProposta === "SUPLENTE",
    ).length,
    naoClassificados: filtered.filter(
      (item) => item.statusResultadoProposta === "NAO_CLASSIFICADO",
    ).length,
  };

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.termo.trim())
      list.push({
        id: "termo",
        label: "Pesquisa",
        value: filtros.termo.trim(),
        onRemove: () => applyFiltros({ ...filtros, termo: "" }),
      });
    filtros.propostas.forEach((value) =>
      list.push({
        id: `proposta-${value}`,
        label: "Proposta de edital",
        value:
          propostaFilterOptions.find((item) => item.value === value)?.label ||
          value,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            propostas: filtros.propostas.filter((item) => item !== value),
          }),
      }),
    );
    filtros.editais.forEach((value) =>
      list.push({
        id: `edital-${value}`,
        label: "Edital",
        value:
          editalFilterOptions.find((item) => item.value === value)?.label ||
          value,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            editais: filtros.editais.filter((item) => item !== value),
          }),
      }),
    );
    filtros.resultados.forEach((value) =>
      list.push({
        id: `resultado-${value}`,
        label: "Resultado da proposta",
        value: statusResultadoPropostaLabel(value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            resultados: filtros.resultados.filter((item) => item !== value),
          }),
      }),
    );
    if (filtros.dataInicio)
      list.push({
        id: "dataInicio",
        label: "Resultado a partir de",
        value: formatDateBr(filtros.dataInicio),
        onRemove: () => applyFiltros({ ...filtros, dataInicio: "" }),
      });
    if (filtros.dataFim)
      list.push({
        id: "dataFim",
        label: "Resultado até",
        value: formatDateBr(filtros.dataFim),
        onRemove: () => applyFiltros({ ...filtros, dataFim: "" }),
      });
    return list;
  }, [editalFilterOptions, filtros, propostaFilterOptions]);

  const exportColumns: ExportColumn[] = [
    { header: "Proposta", key: "proposta" },
    { header: "Edital", key: "edital" },
    { header: "Resultado", key: "resultado" },
    { header: "Data do resultado", key: "dataResultado" },
    { header: "Pontuação", key: "pontuacao" },
    { header: "Recurso", key: "recurso" },
  ];

  const getExportData = () =>
    sortedItems.map((item) => ({
      proposta: propostaNome(item),
      edital: editalNome(item),
      resultado: statusResultadoPropostaLabel(item.statusResultadoProposta),
      dataResultado: formatDateBr(item.dataResultado),
      pontuacao: formatPontuacao(item.pontuacao),
      recurso: item.recursoInterposto ? "Sim" : "Não",
    }));

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Resultado da Proposta"
          tooltip="Nesta página são registrados e acompanhados os resultados divulgados para os projetos apresentados aos editais, incluindo a situação obtida no processo seletivo, a pontuação e, quando disponíveis, os documentos de avaliação e as informações relacionadas a eventual recurso."
          objective="Registre e acompanhe os resultados dos projetos apresentados aos editais, mantendo organizadas as informações sobre classificação, pontuação, avaliação recebida e, quando houver, os recursos apresentados pela organização."
          actions={
            podeCriar ? (
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate("/resultados-propostas/novo")}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Registrar resultado
              </Button>
            ) : undefined
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Resultados registrados"
            value={indicadores.total}
            icon={Award}
            variant="neutral"
          />
          <SummaryStatCard
            title="Propostas aprovadas"
            value={indicadores.aprovados}
            icon={CheckCircle2}
            variant="success"
          />
          <SummaryStatCard
            title="Propostas suplentes"
            value={indicadores.suplentes}
            icon={Hourglass}
            variant="warning"
          />
          <SummaryStatCard
            title="Não classificadas"
            value={indicadores.naoClassificados}
            icon={XCircle}
            variant="info"
          />
        </div>

        <div className="mb-4 space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroResultado">Pesquisa</FieldLabel>
                  <Input
                    id="filtroResultado"
                    value={draft.termo}
                    onChange={(event) =>
                      setDraftField("termo", event.target.value)
                    }
                    placeholder="Digite um termo"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
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
                  <FieldLabel htmlFor="filtroResultados">
                    Resultado da proposta
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroResultados"
                    options={resultadoFilterOptions}
                    value={draft.resultados}
                    onChange={(value) => setDraftField("resultados", value)}
                    placeholder="Todos os resultados"
                    summaryNoun="resultados selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataInicio">
                    Resultado a partir de
                  </FieldLabel>
                  <Input
                    id="filtroDataInicio"
                    type="date"
                    value={draft.dataInicio}
                    onChange={(event) =>
                      setDraftField("dataInicio", event.target.value)
                    }
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataFim">Resultado até</FieldLabel>
                  <Input
                    id="filtroDataFim"
                    type="date"
                    value={draft.dataFim}
                    onChange={(event) =>
                      setDraftField("dataFim", event.target.value)
                    }
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
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
        </div>

        <DataTableCard>
          <DataTableToolbar
            total={filtered.length}
            reportTo="/relatorios/resultados-propostas"
            exportColumns={exportColumns}
            getExportData={getExportData}
            exportFilename="resultados-das-propostas"
            canExport={podeGerarPdf}
          />

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando os
              resultados das propostas...
            </div>
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              emptyTitle="Nenhum resultado registrado."
              emptyDescription="Registre os resultados divulgados para acompanhar o desfecho das propostas apresentadas aos editais."
              noResultsTitle="Nenhum resultado encontrado com a pesquisa informada."
              activeCount={activeFilters.length}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1040px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                      <th
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        data-no-copy
                      >
                        Ações
                      </th>

                      <SortableHeader
                        label="Proposta"
                        sortKey="proposta"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Edital"
                        sortKey="edital"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Data do resultado"
                        sortKey="dataResultado"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Pontuação"
                        sortKey="pontuacao"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Recurso"
                        sortKey="recurso"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {paginated.map((item) => {
                      const proposta = propostaNome(item);
                      const edital = editalNome(item);

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <div className="flex items-center gap-1">
                              <RowActionsDropdown
                                viewTo={`/resultados-propostas/${item.id}`}
                                reportEndpoint={`/resultados-propostas/${item.id}/relatorio`}
                                editTo={
                                  podeEditar
                                    ? `/resultados-propostas/${item.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(item.id)
                                    : undefined
                                }
                              />
                            </div>
                          </td>

                          <td className="px-6 py-2.5">
                            <TableCellText text={proposta} bold>
                              {proposta}
                            </TableCellText>
                          </td>

                          <td className="px-6 py-2.5">
                            <TableCellText text={edital} muted>
                              {edital}
                            </TableCellText>
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={formatDateBr(item.dataResultado)}
                              muted
                            >
                              {formatDateBr(item.dataResultado)}
                            </TableCellText>
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.statusResultadoProposta}
                              context="resultado-proposta"
                              ariaLabelPrefix="Resultado da proposta"
                            />
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <span className="text-sm font-medium text-foreground">
                              {formatPontuacao(item.pontuacao)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <span className="text-sm text-foreground">
                              {item.recursoInterposto ? "Sim" : "Não"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />

                          <p className="mt-3 text-sm text-muted-foreground">
                            Nenhum Resultado da Proposta cadastrado.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border md:hidden">
                {paginated.length === 0 ? (
                  <div className="p-10 text-center">
                    <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />

                    <p className="mt-3 text-sm text-muted-foreground">
                      Nenhum Resultado da Proposta cadastrado.
                    </p>
                  </div>
                ) : (
                  paginated.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <RowActionsDropdown
                            viewTo={`/resultados-propostas/${item.id}`}
                            reportEndpoint={`/resultados-propostas/${item.id}/relatorio`}
                            editTo={
                              podeEditar
                                ? `/resultados-propostas/${item.id}/editar`
                                : undefined
                            }
                            onDelete={
                              podeExcluir
                                ? () => setConfirmDelete(item.id)
                                : undefined
                            }
                          />
                        </div>

                        <StatusPill
                          status={item.statusResultadoProposta}
                          context="resultado-proposta"
                          ariaLabelPrefix="Resultado da proposta"
                        />
                      </div>

                      <p className="font-medium text-foreground">
                        {propostaNome(item)}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {editalNome(item)}
                      </p>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground">Pontuação</p>

                          <p className="font-medium text-foreground">
                            {formatPontuacao(item.pontuacao)}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Resultado</p>

                          <p className="text-foreground">
                            {formatDateBr(item.dataResultado)}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Recurso</p>

                          <p className="text-foreground">
                            {item.recursoInterposto ? "Sim" : "Não"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <DataTablePagination
                totalItems={sortedItems.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                entityLabel="resultado"
                entityLabelPlural="resultados"
                pageSizeLabel="Resultados por página"
              />
            </>
          )}
        </DataTableCard>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Resultado da Proposta?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O resultado, a pontuação e os
              vínculos com relatório de avaliação e recurso deixarão de aparecer
              no acompanhamento da proposta.
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
        pageTitle="Resultado da Proposta"
        href="https://www.aurit.com.br/wiki/editais/resultado-da-proposta"
      />
    </AppLayout>
  );
}

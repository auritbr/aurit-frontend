import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Megaphone,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/FieldLabel";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
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
import { SummaryStatCard } from "@/components/SummaryStatCard";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePlanoComunicacao,
  estrategiaLabel,
  estrategiasDivulgacao,
  getPlanosComunicacao,
  getPropostasEditalOptions,
  statusPlanoComunicacaoLabel,
  statusPlanoComunicacaoOptions,
  type EstrategiaDivulgacao,
  type PlanoComunicacao as PlanoComunicacaoData,
} from "@/data/planoComunicacao";

interface Referencia {
  id: string;
  nome?: string;
  organizacao?: Referencia;
}
interface PlanoComunicacao {
  id: string;
  nomePlano: string;
  objetivoComunicacao: string;
  publicoAlvoComunicacao: string;
  quantidade: string;
  localCirculacaoComunicacao: string;
  formatoPlanoComunicacao: string;
  dataInicio: string;
  dataFim: string;
  statusPlanoComunicacao: PlanoComunicacaoData["status"];
  estrategiasDivulgacao: EstrategiaDivulgacao[];
  propostaEdital?: Referencia;
  organizacao?: Referencia;
}
const estrategiaDivulgacaoOpcoes = estrategiasDivulgacao.map((item) => ({
  value: item.value,
  label: item.label,
}));
const statusPlanoComunicacaoOpcoes = statusPlanoComunicacaoOptions.map(
  (item) => ({
    value: item.value,
    label: item.label,
  }),
);
const planoComunicacaoTooltip =
  "Nesta página é elaborado o plano de comunicação do projeto apresentado ao edital, definindo o que se pretende alcançar com a comunicação, o público a ser atingido, os formatos e estratégias de divulgação, a quantidade prevista, os canais e locais de divulgação, o período de execução e a situação atual do plano.";
const planoComunicacaoObjetivo =
  "Planeje como o projeto apresentado ao edital será divulgado ao público, definindo o que a comunicação pretende alcançar, quem deverá ser atingido, quais estratégias e formatos serão utilizados, onde a divulgação acontecerá e em que período as ações serão realizadas.";
const textoOuTraco = (value?: string | null) => value?.trim() || "—";
const estrategiaDivulgacaoLabel = (value: string) => estrategiaLabel(value);
const propostaEditalLabel = (value?: Referencia) =>
  value?.nome || (value?.id ? `Proposta ${value.id}` : "—");
const organizacaoLabel = (value?: Referencia) =>
  value?.nome || (value?.id ? `Organização ${value.id}` : "—");
const situacaoPlano = (plano: PlanoComunicacao) => plano.statusPlanoComunicacao;
const situacaoPlanoLabel = (plano: PlanoComunicacao) =>
  statusPlanoComunicacaoLabel(plano.statusPlanoComunicacao);
const periodoPlano = (plano: PlanoComunicacao) => {
  const formatar = (data: string) =>
    data ? data.split("-").reverse().join("/") : "—";
  return `${formatar(plano.dataInicio)} a ${formatar(plano.dataFim)}`;
};
const listarPlanosComunicacao = async (): Promise<PlanoComunicacao[]> =>
  (await getPlanosComunicacao()).map((plano) => ({
    id: plano.id,
    nomePlano: plano.nomePlano,
    objetivoComunicacao: plano.objetivoComunicacao,
    publicoAlvoComunicacao: plano.publicoAlvoComunicacao,
    quantidade: plano.quantidade,
    localCirculacaoComunicacao: plano.localCirculacaoComunicacao,
    formatoPlanoComunicacao: plano.formatoPlanoComunicacao,
    dataInicio: plano.dataInicio,
    dataFim: plano.dataFim,
    statusPlanoComunicacao: plano.status,
    estrategiasDivulgacao: plano.estrategiasDivulgacao,
    propostaEdital: plano.propostaEdital
      ? { id: plano.propostaEdital, nome: plano.nomePropostaEdital }
      : undefined,
    organizacao: plano.organizacao ? { id: plano.organizacao } : undefined,
  }));
const excluirPlanoComunicacao = (id: string | number) =>
  deletePlanoComunicacao(Number(id));
const listarPropostasEdital = async () =>
  (await getPropostasEditalOptions()).map((item) => ({
    id: item.id,
    nome: item.nome,
  }));

const fieldClass = "h-9";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "plano", label: "Plano" },
  { value: "proposta", label: "Proposta de edital" },
  { value: "periodo", label: "Período" },
  { value: "situacao", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  propostas: string[];
  estrategias: string[];
  situacoes: string[];
  dataInicial: string;
  dataFinal: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  propostas: [],
  estrategias: [],
  situacoes: [],
  dataInicial: "",
  dataFinal: "",
  sortBy: "plano",
  sortDir: "asc",
};

export default function PlanoComunicacaoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const propostaContexto = searchParams.get("proposta") ?? "";

  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<PlanoComunicacao | null>(
    null,
  );

  const {
    data: planos = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PlanoComunicacao[]>({
    queryKey: ["planos-comunicacao"],
    queryFn: listarPlanosComunicacao,
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas-edital"],
    queryFn: listarPropostasEdital,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isError)
      toast.error("Não foi possível carregar os planos de comunicação.");
  }, [isError]);

  const deleteMutation = useMutation({
    mutationFn: excluirPlanoComunicacao,
    onSuccess: () => {
      toast.success("Plano de comunicação excluído com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["planos-comunicacao"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) =>
      toast.error(
        e.message || "Não foi possível excluir o plano de comunicação.",
      ),
  });

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const propostaFilterOptions = useMemo(
    () =>
      propostas.map((p) => ({
        value: String(p.id),
        label: propostaEditalLabel(p),
      })),
    [propostas],
  );

  const propostaNomeById = useCallback(
    (id?: string) => {
      if (!id) return "—";
      const encontrada = propostas.find((p) => String(p.id) === String(id));
      if (encontrada) return propostaEditalLabel(encontrada);
      const noPlano = planos.find(
        (p) => String(p.propostaEdital?.id) === String(id),
      );
      return noPlano
        ? propostaEditalLabel(noPlano.propostaEdital)
        : `Proposta ${id}`;
    },
    [planos, propostas],
  );

  const propostaNomeDoPlano = useCallback(
    (item: PlanoComunicacao) => propostaNomeById(item.propostaEdital?.id),
    [propostaNomeById],
  );

  const novoPlanoUrl = propostaContexto
    ? `/plano-comunicacao/novo?proposta=${propostaContexto}`
    : "/plano-comunicacao/novo";

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);

    const list = planos.filter((item) => {
      if (
        propostaContexto &&
        String(item.propostaEdital?.id) !== propostaContexto
      )
        return false;
      if (termo) {
        const haystack = normalize(
          [
            item.nomePlano,
            propostaNomeDoPlano(item),
            item.quantidade,
            item.formatoPlanoComunicacao,
            item.localCirculacaoComunicacao,
            item.objetivoComunicacao,
            item.publicoAlvoComunicacao,
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(String(item.propostaEdital?.id))
      )
        return false;
      if (
        filtros.estrategias.length &&
        !(item.estrategiasDivulgacao || []).some((e) =>
          filtros.estrategias.includes(e),
        )
      )
        return false;
      if (filtros.situacoes.length) {
        const s = situacaoPlano(item);
        if (!s || !filtros.situacoes.includes(s)) return false;
      }
      if (
        filtros.dataInicial &&
        (item.dataFim || item.dataInicio) < filtros.dataInicial
      )
        return false;
      if (
        filtros.dataFinal &&
        (item.dataInicio || item.dataFim) > filtros.dataFinal
      )
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "proposta":
          return (
            propostaNomeDoPlano(a).localeCompare(
              propostaNomeDoPlano(b),
              "pt-BR",
            ) * dir
          );
        case "periodo":
          return (a.dataInicio || "").localeCompare(b.dataInicio || "") * dir;
        case "situacao":
          return (
            situacaoPlanoLabel(a).localeCompare(
              situacaoPlanoLabel(b),
              "pt-BR",
            ) * dir
          );
        default:
          return (
            (a.nomePlano || "").localeCompare(b.nomePlano || "", "pt-BR") * dir
          );
      }
    });
  }, [planos, filtros, propostaContexto, propostaNomeDoPlano]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify({ filtros, propostaContexto }));

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.propostas.length ? 1 : 0) +
    (filtros.estrategias.length ? 1 : 0) +
    (filtros.situacoes.length ? 1 : 0) +
    (filtros.dataInicial ? 1 : 0) +
    (filtros.dataFinal ? 1 : 0);

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
      value: propostaNomeById(propostaId),
      onRemove: () => {
        const next = filtros.propostas.filter((p) => p !== propostaId);
        setDraftField("propostas", next);
        setFiltros((prev) => ({ ...prev, propostas: next }));
      },
    });
  });
  filtros.estrategias.forEach((estrategia) => {
    activeFilters.push({
      id: `estrategia-${estrategia}`,
      label: "Estratégia de divulgação",
      value: estrategiaDivulgacaoLabel(estrategia),
      onRemove: () => {
        const next = filtros.estrategias.filter((e) => e !== estrategia);
        setDraftField("estrategias", next);
        setFiltros((prev) => ({ ...prev, estrategias: next }));
      },
    });
  });
  filtros.situacoes.forEach((situacao) => {
    activeFilters.push({
      id: `situacao-${situacao}`,
      label: "Situação do plano",
      value:
        statusPlanoComunicacaoOpcoes.find((s) => s.value === situacao)?.label ??
        situacao,
      onRemove: () => {
        const next = filtros.situacoes.filter((s) => s !== situacao);
        setDraftField("situacoes", next);
        setFiltros((prev) => ({ ...prev, situacoes: next }));
      },
    });
  });
  if (filtros.dataInicial) {
    activeFilters.push({
      id: "dataInicial",
      label: "Período a partir de",
      value: filtros.dataInicial.split("-").reverse().join("/"),
      onRemove: () => {
        setDraftField("dataInicial", "");
        setFiltros((prev) => ({ ...prev, dataInicial: "" }));
      },
    });
  }
  if (filtros.dataFinal) {
    activeFilters.push({
      id: "dataFinal",
      label: "Período até",
      value: filtros.dataFinal.split("-").reverse().join("/"),
      onRemove: () => {
        setDraftField("dataFinal", "");
        setFiltros((prev) => ({ ...prev, dataFinal: "" }));
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
    }, 350);
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

  const exportColumns = [
    { header: "Plano", key: "plano" },
    ...(!propostaContexto
      ? [{ header: "Proposta de edital", key: "proposta" }]
      : []),
    { header: "Estratégias", key: "estrategias" },
    { header: "Quantidade prevista", key: "quantidade" },
    { header: "Período", key: "periodo" },
    { header: "Situação", key: "situacao" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      plano: textoOuTraco(item.nomePlano),
      quantidade: textoOuTraco(item.quantidade),
      estrategias:
        (item.estrategiasDivulgacao || [])
          .map(estrategiaDivulgacaoLabel)
          .join(", ") || "—",
      periodo: periodoPlano(item),
      situacao: situacaoPlanoLabel(item),
      proposta: propostaNomeDoPlano(item),
    }));

  const propostaTituloContexto = propostaContexto
    ? propostaNomeById(propostaContexto)
    : "";

  const indicadores = {
    total: filtered.length,
    planejados: filtered.filter(
      (item) => item.statusPlanoComunicacao === "PLANEJADO",
    ).length,
    emExecucao: filtered.filter(
      (item) => item.statusPlanoComunicacao === "EM_EXECUCAO",
    ).length,
    concluidos: filtered.filter(
      (item) => item.statusPlanoComunicacao === "CONCLUIDO",
    ).length,
  };

  const renderEstrategias = (item: PlanoComunicacao) => {
    const lista = item.estrategiasDivulgacao || [];
    if (!lista.length)
      return <span className="text-[13px] text-muted-foreground">—</span>;

    return (
      <div className="flex min-w-[220px] max-w-[360px] flex-nowrap gap-1.5">
        {lista.slice(0, 2).map((estrategia) => (
          <StatusPill
            key={estrategia}
            status={estrategia}
            ariaLabelPrefix="Estratégia de divulgação"
          />
        ))}
        {lista.length > 2 && (
          <span
            className="status-pill status-na"
            title={lista.slice(2).map(estrategiaDivulgacaoLabel).join(", ")}
          >
            +{lista.length - 2}
          </span>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Plano de Comunicação"
          tooltip={planoComunicacaoTooltip}
          objective={planoComunicacaoObjetivo}
          actions={
            <>
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate(novoPlanoUrl)}
              >
                <Plus className="h-4 w-4" aria-hidden /> Cadastrar plano
              </Button>
            </>
          }
        />

        {propostaContexto && (
          <div className="mb-5 flex flex-col gap-2 rounded-[14px] border border-border/70 bg-card/70 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">
              Exibindo apenas os planos da proposta{" "}
              <span className="font-medium text-foreground">
                {propostaTituloContexto}
              </span>
              .
            </p>
            <Button
              type="button"
              variant="glassSecondary"
              className="h-8 self-start px-3 text-[12px] sm:self-auto"
              onClick={() => navigate("/plano-comunicacao")}
            >
              Ver planos de todas as propostas
            </Button>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Planos de comunicação"
            value={indicadores.total}
            icon={Megaphone}
            variant="neutral"
          />
          <SummaryStatCard
            title="Planejados"
            value={indicadores.planejados}
            icon={CalendarClock}
            variant="info"
          />
          <SummaryStatCard
            title="Em execução"
            value={indicadores.emExecucao}
            icon={PlayCircle}
            variant="warning"
          />
          <SummaryStatCard
            title="Concluídos"
            value={indicadores.concluidos}
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
                {!propostaContexto && (
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
                )}
                <div>
                  <FieldLabel htmlFor="filtroEstrategias">
                    Estratégia de divulgação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroEstrategias"
                    options={estrategiaDivulgacaoOpcoes}
                    value={draft.estrategias}
                    onChange={(value) => setDraftField("estrategias", value)}
                    placeholder="Todas as estratégias"
                    summaryNoun="estratégias selecionadas"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacoes">
                    Situação do plano
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacoes"
                    options={statusPlanoComunicacaoOpcoes}
                    value={draft.situacoes}
                    onChange={(value) => setDraftField("situacoes", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataInicial">
                    Período a partir de
                  </FieldLabel>
                  <Input
                    id="filtroDataInicial"
                    type="date"
                    value={draft.dataInicial}
                    onChange={(e) =>
                      setDraftField("dataInicial", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataFinal">Período até</FieldLabel>
                  <Input
                    id="filtroDataFinal"
                    type="date"
                    value={draft.dataFinal}
                    onChange={(e) => setDraftField("dataFinal", e.target.value)}
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
              reportTo="/relatorios/planos-comunicacao"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="plano-de-comunicacao"
            />

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando os planos de comunicação...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar os planos de comunicação.
                </p>
                <p className="max-w-md text-[13px] text-muted-foreground">
                  Verifique sua conexão com a internet e tente novamente.
                </p>
                <Button
                  variant="glassSecondary"
                  className="h-9 px-4"
                  onClick={() => refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum plano de comunicação cadastrado."
                emptyDescription="Cadastre um plano para organizar os objetivos, o público, as estratégias e os canais de comunicação previstos para a proposta."
                noResultsTitle="Nenhum plano encontrado com os filtros selecionados."
                createLabel="Cadastrar plano"
                onCreate={() => navigate(novoPlanoUrl)}
                activeCount={activeCount}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table
                    className={`w-full table-fixed ${propostaContexto ? "min-w-[1080px]" : "min-w-[1320px]"}`}
                  >
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          className="w-[270px]"
                          sortKey="plano"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Plano
                        </SortableTh>
                        {!propostaContexto && (
                          <SortableTh
                            className="w-[280px]"
                            sortKey="proposta"
                            activeKey={filtros.sortBy}
                            dir={filtros.sortDir}
                            onSort={toggleSort}
                          >
                            Proposta de edital
                          </SortableTh>
                        )}
                        <th className="w-[220px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Estratégias
                        </th>
                        <th className="w-[180px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Quantidade prevista
                        </th>
                        <SortableTh
                          className="w-[170px]"
                          sortKey="periodo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Período
                        </SortableTh>
                        <SortableTh
                          className="w-[150px]"
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
                      {paginated.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              viewTo={`/plano-comunicacao/${item.id}`}
                              reportEndpoint={`/planos-comunicacao/${item.id}/relatorio`}
                              editTo={`/plano-comunicacao/${item.id}/editar`}
                              onDelete={() => setConfirmDelete(item)}
                            />
                          </td>
                          <td className="w-[270px] overflow-hidden px-6 py-2.5">
                            <TableCellText text={item.nomePlano || "—"} bold>
                              {textoOuTraco(item.nomePlano)}
                            </TableCellText>
                          </td>
                          {!propostaContexto && (
                            <td className="w-[280px] overflow-hidden px-6 py-2.5">
                              <TableCellText
                                text={propostaNomeDoPlano(item)}
                                muted
                              >
                                {propostaNomeDoPlano(item)}
                              </TableCellText>
                            </td>
                          )}
                          <td className="w-[220px] overflow-hidden px-6 py-2.5">
                            {renderEstrategias(item)}
                          </td>
                          <td className="w-[180px] overflow-hidden px-6 py-2.5">
                            <TableCellText
                              text={textoOuTraco(item.quantidade)}
                              muted
                            >
                              {textoOuTraco(item.quantidade)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] tabular-nums text-muted-foreground">
                            {periodoPlano(item)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill status={situacaoPlanoLabel(item)} />
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
                          viewTo={`/plano-comunicacao/${item.id}`}
                          reportEndpoint={`/planos-comunicacao/${item.id}/relatorio`}
                          editTo={`/plano-comunicacao/${item.id}/editar`}
                          onDelete={() => setConfirmDelete(item)}
                        />
                        <StatusPill status={situacaoPlanoLabel(item)} />
                      </div>
                      <p className="font-medium text-foreground">
                        {textoOuTraco(item.nomePlano)}
                      </p>
                      {!propostaContexto && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {propostaNomeDoPlano(item)}
                        </p>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-muted-foreground">
                            Quantidade prevista
                          </p>
                          <p className="text-foreground">
                            {textoOuTraco(item.quantidade)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Período</p>
                          <p className="tabular-nums text-foreground">
                            {periodoPlano(item)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(item.estrategiasDivulgacao || []).map((e) => (
                          <StatusPill
                            key={e}
                            status={e}
                            ariaLabelPrefix="Estratégia de divulgação"
                          />
                        ))}
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
            <AlertDialogTitle>Excluir plano de comunicação?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.nomePlano}
              </span>{" "}
              será removido definitivamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDelete && deleteMutation.mutate(confirmDelete.id)
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Plano de Comunicação"
        href="https://www.aurit.com.br/wiki/editais/plano-de-comunicacao"
      />
    </AppLayout>
  );
}

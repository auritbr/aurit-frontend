import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Inbox,
  Percent,
  RotateCcw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { StatusPill } from "@/components/StatusPill";
import { RelatorioExportButtons } from "@/components/relatorios/RelatorioExportButtons";
import { ColumnSelector } from "@/components/relatorios/ColumnSelector";
import {
  ReportChartCard,
  ReportChartGrid,
  ReportComparisonBarChart,
  ReportPieChart,
  type ChartDatum,
  type ComparisonChartDatum,
} from "@/components/relatorios/ReportKit";
import { TablePagination } from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  aplicarFiltros,
  booleanFiltroLabel,
  booleanFiltroOptions,
  filtrosIniciais,
  getRelatorioParticipantes,
  statusParticipanteLabel,
  statusParticipanteOptions,
  tipoDeficienciasRelatorioLabel,
  tipoDeficienciaRelatorioOptions,
  tipoNeurodivergenciasRelatorioLabel,
  tipoNeurodivergenciaRelatorioOptions,
  tipoPresencaOptions,
  type BooleanFiltro,
  type FiltrosRelatorioParticipantes,
  type LinhaRelatorioParticipante,
  type StatusParticipanteRelatorio,
  type TipoPresencaFiltro,
} from "@/data/relatorioParticipantes";
import {
  tipoDeficienciaParticipanteValueToLabel,
  tipoNeurodivergenciaValueToLabel,
  type AtividadeOption,
  type TipoDeficienciaParticipante,
  type TipoNeurodivergencia,
  type TurmaOption,
} from "@/data/participantes";
import { usePagination } from "@/hooks/usePagination";
import type { RelatorioColumn } from "@/lib/relatorioExports";
import { downloadGeneralReportPdf } from "@/lib/generalReportPdf";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";

type SortKey = "nome" | "status" | "atividade" | "turma" | "percentual";
type SortDir = "asc" | "desc";

function StatusBadge({ status }: { status: string }) {
  return (
    <StatusPill
      status={status}
      context="matricula-participante"
      ariaLabelPrefix="Status do participante"
    />
  );
}

function formatDataBR(iso?: string): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

interface ResumoCardProps {
  icon: ElementType;
  label: string;
  valor: string;
  tone: "primary" | "success" | "danger" | "info";
}

function ResumoCard({ icon: Icon, label, valor, tone }: ResumoCardProps) {
  const tones: Record<ResumoCardProps["tone"], string> = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    danger:
      "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  };

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/75 px-3.5 py-3 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums text-foreground">
          {valor}
        </p>
      </div>
    </div>
  );
}

function SortableHead({
  children,
  active,
  dir,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <TableHead className="text-xs">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${active ? "font-semibold text-foreground" : ""}`}
      >
        {children}
        <ArrowUpDown
          className={`h-3 w-3 transition-transform ${active ? "opacity-90" : "opacity-40"} ${active && dir === "desc" ? "rotate-180" : ""}`}
        />
      </button>
    </TableHead>
  );
}

export default function RelatorioParticipantes() {
  const [filtros, setFiltros] =
    useState<FiltrosRelatorioParticipantes>(filtrosIniciais);
  const [aplicados, setAplicados] =
    useState<FiltrosRelatorioParticipantes>(filtrosIniciais);
  const [linhas, setLinhas] = useState<LinhaRelatorioParticipante[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "relatorio-participantes:search:v2",
    false,
  );
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleKeys, setVisibleKeys] = useState<string[]>([
    "nome",
    "status",
    "atividade",
    "turma",
    "presencas",
    "ausencias",
    "percentual",
    "ultima",
  ]);

  const statusToLabel = (value: StatusParticipanteRelatorio) =>
    statusParticipanteOptions.find((option) => option.value === value)?.label ??
    value;
  const presencaToLabel = (value: TipoPresencaFiltro) =>
    tipoPresencaOptions.find((option) => option.value === value)?.label ??
    value;
  const neurodivergenciaToLabel = (value: TipoNeurodivergencia) =>
    tipoNeurodivergenciaValueToLabel(value);
  const deficienciaToLabel = (value: TipoDeficienciaParticipante) =>
    tipoDeficienciaParticipanteValueToLabel(value);

  const turmasDisponiveis = useMemo(
    () =>
      filtros.atividadeId === "TODOS" || filtros.atividadeId === "SELECIONE"
        ? turmas
        : turmas.filter((turma) => turma.atividadeId === filtros.atividadeId),
    [filtros.atividadeId, turmas],
  );

  useEffect(() => {
    if (
      filtros.turmaId !== "TODOS" &&
      filtros.turmaId !== "SELECIONE" &&
      !turmasDisponiveis.some((turma) => turma.id === filtros.turmaId)
    ) {
      setFiltros((current) => ({ ...current, turmaId: "SELECIONE" }));
    }
  }, [filtros.turmaId, turmasDisponiveis]);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const data = await getRelatorioParticipantes();
      setLinhas(data.linhas);
      setAtividades(data.atividades);
      setTurmas(data.turmas);
    } catch (error) {
      console.error(error);
      setErro(
        "Não foi possível carregar o relatório de participantes. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const refresh = () => void carregar();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const filtradas = useMemo(
    () => aplicarFiltros(linhas, { ...aplicados, busca }),
    [linhas, aplicados, busca],
  );
  const ordenadas = useMemo(
    () =>
      [...filtradas].sort((a, b) => {
        const values: Record<SortKey, [string | number, string | number]> = {
          nome: [
            a.participanteNome.toLocaleLowerCase("pt-BR"),
            b.participanteNome.toLocaleLowerCase("pt-BR"),
          ],
          status: [
            statusParticipanteLabel(a.status),
            statusParticipanteLabel(b.status),
          ],
          atividade: [
            a.atividadeNome.toLocaleLowerCase("pt-BR"),
            b.atividadeNome.toLocaleLowerCase("pt-BR"),
          ],
          turma: [
            (a.turmaNome ?? "").toLocaleLowerCase("pt-BR"),
            (b.turmaNome ?? "").toLocaleLowerCase("pt-BR"),
          ],
          percentual: [a.percentualPresenca, b.percentualPresenca],
        };
        const [left, right] = values[sortKey];
        const result = left < right ? -1 : left > right ? 1 : 0;
        return sortDir === "asc" ? result : -result;
      }),
    [filtradas, sortKey, sortDir],
  );

  const pagination = usePagination(
    ordenadas,
    25,
    JSON.stringify({ aplicados, busca, sortKey, sortDir }),
  );
  const totalLinhas = ordenadas.length;
  const totalPresencas = ordenadas.reduce(
    (sum, linha) => sum + linha.presencas,
    0,
  );
  const totalAusencias = ordenadas.reduce(
    (sum, linha) => sum + linha.ausencias,
    0,
  );
  const pctMedio = totalLinhas
    ? ordenadas.reduce((sum, linha) => sum + linha.percentualPresenca, 0) /
      totalLinhas
    : 0;
  const frequenciaPorParticipante = useMemo<ComparisonChartDatum[]>(() => {
    const agrupado = new Map<
      string,
      { nome: string; presencas: number; ausencias: number }
    >();

    ordenadas.forEach((linha) => {
      const atual = agrupado.get(linha.participanteId) ?? {
        nome: linha.participanteNome,
        presencas: 0,
        ausencias: 0,
      };
      atual.presencas += linha.presencas;
      atual.ausencias += linha.ausencias;
      agrupado.set(linha.participanteId, atual);
    });

    return [...agrupado.values()]
      .sort((a, b) => b.presencas + b.ausencias - (a.presencas + a.ausencias))
      .slice(0, 10)
      .map((item) => ({
        name: item.nome,
        presencas: item.presencas,
        ausencias: item.ausencias,
      }));
  }, [ordenadas]);
  const participantesPorSituacao = useMemo<ChartDatum[]>(() => {
    const participantes = new Map<string, string>();
    ordenadas.forEach((linha) =>
      participantes.set(linha.participanteId, linha.status),
    );

    const totais = new Map<string, number>();
    participantes.forEach((status) => {
      const label = statusParticipanteLabel(status);
      totais.set(label, (totais.get(label) ?? 0) + 1);
    });

    return [...totais.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ordenadas]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey)
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const limpar = () => {
    setFiltros(filtrosIniciais);
    setAplicados(filtrosIniciais);
    setBusca("");
    setBuscaInput("");
  };
  const filtrar = (event?: React.FormEvent) => {
    event?.preventDefault();
    setAplicados(filtros);
    setBusca(buscaInput);
    toast.success("Filtros aplicados.");
  };

  const atividadeAplicadaLabel =
    aplicados.atividadeId === "TODOS"
      ? "Todas"
      : aplicados.atividadeId === "SELECIONE"
        ? "Não selecionada"
        : (atividades.find((item) => item.id === aplicados.atividadeId)
            ?.nomeAtividade ?? aplicados.atividadeId);
  const turmaAplicadaLabel =
    aplicados.turmaId === "TODOS"
      ? "Todas"
      : aplicados.turmaId === "SELECIONE"
        ? "Não selecionada"
        : (turmas.find((item) => item.id === aplicados.turmaId)?.nomeTurma ??
          aplicados.turmaId);
  const mostrar = (key: string) => visibleKeys.includes(key);
  const mostrarStatus = mostrar("status");
  const mostrarAtividade = mostrar("atividade");
  const mostrarTurma = mostrar("turma");
  const mostrarPresencas = mostrar("presencas");
  const mostrarAusencias = mostrar("ausencias");
  const mostrarFeriados = mostrar("feriados");
  const mostrarSemAula = mostrar("semAula");
  const mostrarPercentual = mostrar("percentual");
  const mostrarNeurodivergencias = mostrar("tipoNeurodivergencias");
  const mostrarDeficiencias = mostrar("tipoDeficiencias");
  const mostrarCadunico = mostrar("possuiCadunico");
  const mostrarBolsaFamilia = mostrar("possuiBolsaFamilia");

  const todasColunas: RelatorioColumn<LinhaRelatorioParticipante>[] = [
    {
      key: "nome",
      label: "Participante",
      accessor: (row) => row.participanteNome,
    },
    {
      key: "tipoNeurodivergencias",
      label: "Tipos de Neurodivergências",
      accessor: (row) =>
        tipoNeurodivergenciasRelatorioLabel(row.tipoNeurodivergencias),
      hiddenByDefault: true,
    },
    {
      key: "tipoDeficiencias",
      label: "Tipo de Deficiência",
      accessor: (row) => tipoDeficienciasRelatorioLabel(row.tipoDeficiencias),
      hiddenByDefault: true,
    },
    {
      key: "possuiCadunico",
      label: "CadÚnico",
      accessor: (row) => (row.possuiCadunico ? "Sim" : "Não"),
      hiddenByDefault: true,
    },
    {
      key: "possuiBolsaFamilia",
      label: "Bolsa Família",
      accessor: (row) => (row.possuiBolsaFamilia ? "Sim" : "Não"),
      hiddenByDefault: true,
    },
    {
      key: "status",
      label: "Status",
      accessor: (row) => statusParticipanteLabel(row.status),
    },
    {
      key: "atividade",
      label: "Atividade",
      accessor: (row) => row.atividadeNome,
    },
    { key: "turma", label: "Turma", accessor: (row) => row.turmaNome ?? "—" },
    { key: "presencas", label: "Presenças", accessor: (row) => row.presencas },
    { key: "ausencias", label: "Ausências", accessor: (row) => row.ausencias },
    {
      key: "feriados",
      label: "Feriados",
      accessor: (row) => row.feriados,
      hiddenByDefault: true,
    },
    {
      key: "semAula",
      label: "Não teve aula",
      accessor: (row) => row.semAula,
      hiddenByDefault: true,
    },
    {
      key: "percentual",
      label: "% Presença",
      accessor: (row) => `${row.percentualPresenca.toFixed(1)}%`,
    },
    {
      key: "ultima",
      label: "Última presença",
      accessor: (row) => formatDataBR(row.ultimaPresenca),
    },
  ];
  const colunasExport = todasColunas.filter((column) =>
    visibleKeys.includes(column.key),
  );
  const pdfColumnByTableColumn: Record<string, string> = {
    nome: "participante",
    tipoNeurodivergencias: "tipoNeurodivergencias",
    tipoDeficiencias: "tipoDeficiencias",
    possuiCadunico: "cadUnico",
    possuiBolsaFamilia: "bolsaFamilia",
    status: "status",
    atividade: "atividade",
    turma: "turma",
    presencas: "presencas",
    ausencias: "ausencias",
    feriados: "feriados",
    semAula: "semAula",
    percentual: "percentualPresenca",
    ultima: "ultimaPresenca",
  };
  const indicadoresPdf = [
    {
      label: "Status",
      valor: aplicados.status.length
        ? aplicados.status.map(statusToLabel).join(", ")
        : "Todos",
    },
    { label: "Atividade", valor: atividadeAplicadaLabel },
    { label: "Turma", valor: turmaAplicadaLabel },
    {
      label: "Presença",
      valor: aplicados.presencas.length
        ? aplicados.presencas.map(presencaToLabel).join(", ")
        : "Todas",
    },
    {
      label: "Tipos de Neurodivergências",
      valor: aplicados.tipoNeurodivergencias.length
        ? aplicados.tipoNeurodivergencias
            .map(neurodivergenciaToLabel)
            .join(", ")
        : "Todas",
    },
    {
      label: "Tipo de Deficiência",
      valor: aplicados.tipoDeficiencias.length
        ? aplicados.tipoDeficiencias.map(deficienciaToLabel).join(", ")
        : "Todos",
    },
    {
      label: "CadÚnico",
      valor: aplicados.possuiCadunico.length
        ? aplicados.possuiCadunico.map(booleanFiltroLabel).join(", ")
        : "Todos",
    },
    {
      label: "Bolsa Família",
      valor: aplicados.possuiBolsaFamilia.length
        ? aplicados.possuiBolsaFamilia.map(booleanFiltroLabel).join(", ")
        : "Todos",
    },
    { label: "Total de Participantes", valor: String(totalLinhas) },
    { label: "Presenças", valor: String(totalPresencas) },
    { label: "Ausências", valor: String(totalAusencias) },
    { label: "% Médio", valor: `${pctMedio.toFixed(1)}%` },
  ];

  const activeFilters: ActiveFilterItem[] = [];
  if (busca.trim())
    activeFilters.push({
      id: "busca",
      label: "Participante",
      value: busca.trim(),
      onRemove: () => {
        setBusca("");
        setBuscaInput("");
      },
    });
  aplicados.status.forEach((value) =>
    activeFilters.push({
      id: `status-${value}`,
      label: "Status",
      value: statusToLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          status: aplicados.status.filter((item) => item !== value),
        }),
    }),
  );
  if (
    aplicados.atividadeId !== "SELECIONE" &&
    aplicados.atividadeId !== "TODOS"
  )
    activeFilters.push({
      id: "atividade",
      label: "Atividade",
      value: atividadeAplicadaLabel,
      onRemove: () =>
        setAplicados({
          ...aplicados,
          atividadeId: "SELECIONE",
          turmaId: "SELECIONE",
        }),
    });
  if (aplicados.turmaId !== "SELECIONE" && aplicados.turmaId !== "TODOS")
    activeFilters.push({
      id: "turma",
      label: "Turma",
      value: turmaAplicadaLabel,
      onRemove: () => setAplicados({ ...aplicados, turmaId: "SELECIONE" }),
    });
  aplicados.presencas.forEach((value) =>
    activeFilters.push({
      id: `presenca-${value}`,
      label: "Presença",
      value: presencaToLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          presencas: aplicados.presencas.filter((item) => item !== value),
        }),
    }),
  );
  aplicados.tipoNeurodivergencias.forEach((value) =>
    activeFilters.push({
      id: `neuro-${value}`,
      label: "Neurodivergência",
      value: neurodivergenciaToLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          tipoNeurodivergencias: aplicados.tipoNeurodivergencias.filter(
            (item) => item !== value,
          ),
        }),
    }),
  );
  aplicados.tipoDeficiencias.forEach((value) =>
    activeFilters.push({
      id: `deficiencia-${value}`,
      label: "Deficiência",
      value: deficienciaToLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          tipoDeficiencias: aplicados.tipoDeficiencias.filter(
            (item) => item !== value,
          ),
        }),
    }),
  );
  aplicados.possuiCadunico.forEach((value) =>
    activeFilters.push({
      id: `cadunico-${value}`,
      label: "CadÚnico",
      value: booleanFiltroLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          possuiCadunico: aplicados.possuiCadunico.filter(
            (item) => item !== value,
          ),
        }),
    }),
  );
  aplicados.possuiBolsaFamilia.forEach((value) =>
    activeFilters.push({
      id: `bolsa-${value}`,
      label: "Bolsa Família",
      value: booleanFiltroLabel(value),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          possuiBolsaFamilia: aplicados.possuiBolsaFamilia.filter(
            (item) => item !== value,
          ),
        }),
    }),
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Relatório de Participação"
          tooltip="Nesta página são consultadas informações dos participantes a partir de seus vínculos com atividades e turmas, registros de presença e características sociais e de acessibilidade. Os filtros permitem analisar diferentes perfis e recortes do público atendido pela organização."
        />
        <PageObjective
          className="mb-4"
          description="Analise os participantes considerando seus vínculos com atividades e turmas, situação, presença e características como neurodivergências, deficiência, CadÚnico e Bolsa Família. Combine os filtros para obter recortes específicos do público atendido conforme a necessidade da organização."
        />

        <div className="mb-5 space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
            title="Pesquisa avançada"
          >
            <form onSubmit={filtrar} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="f-busca">Participante</FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="f-busca"
                      value={buscaInput}
                      onChange={(event) => setBuscaInput(event.target.value)}
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 pl-8 backdrop-blur-sm"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-status"
                    tooltip="Filtre pelo status da matrícula do participante."
                  >
                    Status
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-status"
                    placeholder="Todos os status"
                    selectAllLabel="Todos"
                    summaryNoun="status selecionados"
                    options={statusParticipanteOptions}
                    value={filtros.status}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        status: values as StatusParticipanteRelatorio[],
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-ativ"
                    tooltip="Filtre os participantes por atividade."
                  >
                    Atividade
                  </FieldLabel>
                  <Select
                    value={filtros.atividadeId}
                    onValueChange={(value) =>
                      setFiltros((current) => ({
                        ...current,
                        atividadeId: value,
                        turmaId: "SELECIONE",
                      }))
                    }
                  >
                    <SelectTrigger
                      id="f-ativ"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELECIONE">Selecione</SelectItem>
                      <SelectItem value="TODOS">Todas</SelectItem>
                      {atividades.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nomeAtividade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-turma"
                    tooltip="Selecione a turma vinculada à atividade."
                  >
                    Turma
                  </FieldLabel>
                  <Select
                    value={filtros.turmaId}
                    onValueChange={(value) =>
                      setFiltros((current) => ({ ...current, turmaId: value }))
                    }
                  >
                    <SelectTrigger
                      id="f-turma"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELECIONE">Selecione</SelectItem>
                      <SelectItem value="TODOS">Todas</SelectItem>
                      {turmasDisponiveis.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nomeTurma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-presenca"
                    tooltip="Filtre pelos tipos de registro de presença."
                  >
                    Presença
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-presenca"
                    placeholder="Todas as situações"
                    selectAllLabel="Todas"
                    summaryNoun="situações selecionadas"
                    options={tipoPresencaOptions}
                    value={filtros.presencas}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        presencas: values as TipoPresencaFiltro[],
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-neurodivergencias"
                    tooltip="Selecione um ou mais tipos de neurodivergência."
                  >
                    Tipos de Neurodivergências
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-neurodivergencias"
                    placeholder="Todas as neurodivergências"
                    selectAllLabel="Todas"
                    summaryNoun="tipos selecionados"
                    options={tipoNeurodivergenciaRelatorioOptions.map(
                      (value) => ({
                        value,
                        label: neurodivergenciaToLabel(value),
                      }),
                    )}
                    value={filtros.tipoNeurodivergencias}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        tipoNeurodivergencias: values as TipoNeurodivergencia[],
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-deficiencias"
                    tooltip="Selecione um ou mais tipos de deficiência."
                  >
                    Tipo de Deficiência
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-deficiencias"
                    placeholder="Todas as deficiências"
                    selectAllLabel="Todas"
                    summaryNoun="tipos selecionados"
                    options={tipoDeficienciaRelatorioOptions.map((value) => ({
                      value,
                      label: deficienciaToLabel(value),
                    }))}
                    value={filtros.tipoDeficiencias}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        tipoDeficiencias:
                          values as TipoDeficienciaParticipante[],
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-cadunico"
                    tooltip="Filtre pela participação no CadÚnico."
                  >
                    CadÚnico
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-cadunico"
                    placeholder="Todas as situações"
                    selectAllLabel="Todos"
                    summaryNoun="situações selecionadas"
                    options={booleanFiltroOptions}
                    value={filtros.possuiCadunico}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        possuiCadunico: values as BooleanFiltro[],
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="f-bolsa-familia"
                    tooltip="Filtre pela participação no Bolsa Família."
                  >
                    Bolsa Família
                  </FieldLabel>
                  <FilterMultiSelect
                    id="f-bolsa-familia"
                    placeholder="Todas as situações"
                    selectAllLabel="Todos"
                    summaryNoun="situações selecionadas"
                    options={booleanFiltroOptions}
                    value={filtros.possuiBolsaFamilia}
                    onChange={(values) =>
                      setFiltros((current) => ({
                        ...current,
                        possuiBolsaFamilia: values as BooleanFiltro[],
                      }))
                    }
                  />
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  onClick={limpar}
                  className="h-9 gap-2 px-4"
                >
                  <RotateCcw className="h-4 w-4" /> Limpar
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                >
                  <Search className="h-4 w-4" /> Buscar
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>
          <ActiveFilters items={activeFilters} onClearAll={limpar} />
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ResumoCard
            icon={Users}
            tone="primary"
            label="Participantes"
            valor={String(totalLinhas)}
          />
          <ResumoCard
            icon={CheckCircle2}
            tone="success"
            label="Presenças"
            valor={String(totalPresencas)}
          />
          <ResumoCard
            icon={XCircle}
            tone="danger"
            label="Ausências"
            valor={String(totalAusencias)}
          />
          <ResumoCard
            icon={Percent}
            tone="info"
            label="% Médio"
            valor={`${pctMedio.toFixed(1)}%`}
          />
        </section>

        {!loading && !erro && totalLinhas > 0 && (
          <ReportChartGrid>
            <ReportChartCard
              title="Presenças e ausências por participante"
              description="Compara os dez participantes com mais registros de frequência nos resultados filtrados."
            >
              <ReportComparisonBarChart
                data={frequenciaPorParticipante}
                series={[
                  { key: "presencas", label: "Presenças" },
                  { key: "ausencias", label: "Ausências" },
                ]}
                reportKey="participantes-frequencia"
              />
            </ReportChartCard>
            <ReportChartCard
              title="Participantes por situação"
              description="Distribuição dos participantes únicos conforme a situação da matrícula."
            >
              <ReportPieChart
                data={participantesPorSituacao}
                reportKey="participantes-situacao"
              />
            </ReportChartCard>
          </ReportChartGrid>
        )}

        <section className="overflow-hidden rounded-[14px] border border-border/70 bg-card/75 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">
                Participantes encontrados
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Resultados consideram os filtros aplicados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <RelatorioExportButtons
                rows={ordenadas}
                columns={colunasExport}
                reportName="participantes"
                dataGeracao={new Date().toLocaleDateString("pt-BR")}
                indicadoresPdf={indicadoresPdf}
                disabled={!totalLinhas || loading || !colunasExport.length}
                showPdf
                showCopy={false}
                compact
                onPdf={() =>
                  downloadGeneralReportPdf({
                    slug: "participacao",
                    columns: colunasExport.map(
                      (column) => pdfColumnByTableColumn[column.key],
                    ),
                    filters: {
                      busca: busca.trim() || undefined,
                      atividadeId:
                        aplicados.atividadeId === "TODOS" ||
                        aplicados.atividadeId === "SELECIONE"
                          ? undefined
                          : aplicados.atividadeId,
                      turmaId:
                        aplicados.turmaId === "TODOS" ||
                        aplicados.turmaId === "SELECIONE"
                          ? undefined
                          : aplicados.turmaId,
                      status: aplicados.status,
                      presencas: aplicados.presencas,
                      tipoNeurodivergencias: aplicados.tipoNeurodivergencias,
                      tipoDeficiencias: aplicados.tipoDeficiencias,
                      possuiCadunico: aplicados.possuiCadunico,
                      possuiBolsaFamilia: aplicados.possuiBolsaFamilia,
                    },
                  })
                }
              />
              <ColumnSelector
                columns={todasColunas}
                visibleKeys={visibleKeys}
                onChange={setVisibleKeys}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                Carregando participantes...
              </div>
            ) : erro ? (
              <div className="px-5 py-12 text-center">
                <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive">{erro}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void carregar()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : !totalLinhas ? (
              <div className="px-5 py-12 text-center">
                <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum participante encontrado com os filtros selecionados.
                </p>
              </div>
            ) : (
              <Table className="min-w-max [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      active={sortKey === "nome"}
                      dir={sortDir}
                      onClick={() => toggleSort("nome")}
                    >
                      Participante
                    </SortableHead>
                    {mostrarNeurodivergencias && (
                      <TableHead className="text-xs">
                        Tipos de Neurodivergências
                      </TableHead>
                    )}
                    {mostrarDeficiencias && (
                      <TableHead className="text-xs">
                        Tipo de Deficiência
                      </TableHead>
                    )}
                    {mostrarCadunico && (
                      <TableHead className="text-xs">CadÚnico</TableHead>
                    )}
                    {mostrarBolsaFamilia && (
                      <TableHead className="text-xs">Bolsa Família</TableHead>
                    )}
                    {mostrarStatus && (
                      <SortableHead
                        active={sortKey === "status"}
                        dir={sortDir}
                        onClick={() => toggleSort("status")}
                      >
                        Status
                      </SortableHead>
                    )}
                    {mostrarAtividade && (
                      <SortableHead
                        active={sortKey === "atividade"}
                        dir={sortDir}
                        onClick={() => toggleSort("atividade")}
                      >
                        Atividade
                      </SortableHead>
                    )}
                    {mostrarTurma && (
                      <SortableHead
                        active={sortKey === "turma"}
                        dir={sortDir}
                        onClick={() => toggleSort("turma")}
                      >
                        Turma
                      </SortableHead>
                    )}
                    {mostrarPresencas && (
                      <TableHead className="text-right text-xs">
                        Presenças
                      </TableHead>
                    )}
                    {mostrarAusencias && (
                      <TableHead className="text-right text-xs">
                        Ausências
                      </TableHead>
                    )}
                    {mostrarFeriados && (
                      <TableHead className="text-right text-xs">
                        Feriados
                      </TableHead>
                    )}
                    {mostrarSemAula && (
                      <TableHead className="text-right text-xs">
                        Não teve aula
                      </TableHead>
                    )}
                    {mostrarPercentual && (
                      <SortableHead
                        active={sortKey === "percentual"}
                        dir={sortDir}
                        onClick={() => toggleSort("percentual")}
                      >
                        % Presença
                      </SortableHead>
                    )}
                    {mostrar("ultima") && (
                      <TableHead className="text-xs">Última presença</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginated.map((linha) => (
                    <TableRow key={linha.id}>
                      <TableCell className="text-xs font-medium text-foreground">
                        {linha.participanteNome}
                      </TableCell>
                      {mostrarNeurodivergencias && (
                        <TableCell className="text-xs">
                          {tipoNeurodivergenciasRelatorioLabel(
                            linha.tipoNeurodivergencias,
                          )}
                        </TableCell>
                      )}
                      {mostrarDeficiencias && (
                        <TableCell className="text-xs">
                          {tipoDeficienciasRelatorioLabel(
                            linha.tipoDeficiencias,
                          )}
                        </TableCell>
                      )}
                      {mostrarCadunico && (
                        <TableCell className="text-xs">
                          {linha.possuiCadunico ? "Sim" : "Não"}
                        </TableCell>
                      )}
                      {mostrarBolsaFamilia && (
                        <TableCell className="text-xs">
                          {linha.possuiBolsaFamilia ? "Sim" : "Não"}
                        </TableCell>
                      )}
                      {mostrarStatus && (
                        <TableCell className="text-xs">
                          <StatusBadge status={linha.status} />
                        </TableCell>
                      )}
                      {mostrarAtividade && (
                        <TableCell className="text-xs">
                          {linha.atividadeNome}
                        </TableCell>
                      )}
                      {mostrarTurma && (
                        <TableCell className="text-xs">
                          {linha.turmaNome ?? "—"}
                        </TableCell>
                      )}
                      {mostrarPresencas && (
                        <TableCell className="text-right text-xs tabular-nums">
                          {linha.presencas}
                        </TableCell>
                      )}
                      {mostrarAusencias && (
                        <TableCell className="text-right text-xs tabular-nums">
                          {linha.ausencias}
                        </TableCell>
                      )}
                      {mostrarFeriados && (
                        <TableCell className="text-right text-xs tabular-nums">
                          {linha.feriados}
                        </TableCell>
                      )}
                      {mostrarSemAula && (
                        <TableCell className="text-right text-xs tabular-nums">
                          {linha.semAula}
                        </TableCell>
                      )}
                      {mostrarPercentual && (
                        <TableCell className="text-xs tabular-nums">
                          {linha.percentualPresenca.toFixed(1)}%
                        </TableCell>
                      )}
                      {mostrar("ultima") && (
                        <TableCell className="text-xs tabular-nums">
                          {formatDataBR(linha.ultimaPresenca)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {!loading && !erro && totalLinhas > 0 && (
            <TablePagination
              totalItems={totalLinhas}
              currentPage={pagination.currentPage}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              showCopy={false}
            />
          )}
        </section>
      </div>
    </AppLayout>
  );
}

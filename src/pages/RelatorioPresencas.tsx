import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  Percent,
  Inbox,
  AlertCircle,
  RotateCcw,
  Search,
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
import { DataTableCard } from "@/components/list/DataTableCard";
import { StatusPill } from "@/components/StatusPill";
import { TablePagination } from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { RelatorioColumn } from "@/lib/relatorioExports";
import { downloadFilteredPresenceReport } from "@/lib/individualReportDownload";
import {
  anosDisponiveisPresenca,
  mesesDisponiveisPresenca,
  getRelatorioPresencasData,
  statusPresencaOptions,
  type RegistroPresenca,
  type RelatorioOption,
  type StatusPresenca,
} from "@/data/relatorioPresencas";
import { RelatorioExportButtons } from "@/components/relatorios/RelatorioExportButtons";
import { ColumnSelector } from "@/components/relatorios/ColumnSelector";

type Filtros = {
  participante: string;
  atividadeId: string;
  turmaId: string;
  data: string;
  mes: string;
  ano: string;
  status: string[];
};

const SELECIONE = "SELECIONE";

const FILTROS_INICIAIS: Filtros = {
  participante: "",
  atividadeId: "TODOS",
  turmaId: "TODOS",
  data: "",
  mes: "TODOS",
  ano: "TODOS",
  status: [],
};

const FILTROS_PESQUISA_INICIAIS: Filtros = {
  ...FILTROS_INICIAIS,
  atividadeId: SELECIONE,
  turmaId: SELECIONE,
  mes: SELECIONE,
  ano: SELECIONE,
};

function normalizarFiltros(filtros: Filtros): Filtros {
  return {
    ...filtros,
    atividadeId:
      filtros.atividadeId === SELECIONE ? "TODOS" : filtros.atividadeId,
    turmaId: filtros.turmaId === SELECIONE ? "TODOS" : filtros.turmaId,
    mes: filtros.mes === SELECIONE ? "TODOS" : filtros.mes,
    ano: filtros.ano === SELECIONE ? "TODOS" : filtros.ano,
  };
}

const mesesOptions = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const statusLabel = (status: StatusPresenca) =>
  statusPresencaOptions.find((option) => option.value === status)?.label ??
  status;

function StatusBadge({ status }: { status: StatusPresenca }) {
  return (
    <StatusPill
      status={status}
      context="presenca"
      ariaLabelPrefix="Status de presença"
    />
  );
}

function formatDataBR(iso: string): string {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
}

function mesLabel(value: string): string {
  if (value === "TODOS") return "Todos";

  return mesesOptions.find((item) => item.value === value)?.label ?? value;
}

function aplicarFiltros(
  registros: RegistroPresenca[],
  filtros: Filtros,
): RegistroPresenca[] {
  return registros.filter((registro) => {
    const participante = filtros.participante.trim().toLocaleLowerCase("pt-BR");

    if (
      participante &&
      !registro.participanteNome
        .toLocaleLowerCase("pt-BR")
        .includes(participante)
    ) {
      return false;
    }

    if (
      filtros.atividadeId !== "TODOS" &&
      registro.atividadeId !== filtros.atividadeId
    ) {
      return false;
    }

    if (filtros.turmaId !== "TODOS" && registro.turmaId !== filtros.turmaId) {
      return false;
    }

    if (filtros.data && registro.data !== filtros.data) {
      return false;
    }

    if (filtros.mes !== "TODOS" && registro.data.slice(5, 7) !== filtros.mes) {
      return false;
    }

    if (filtros.ano !== "TODOS" && registro.data.slice(0, 4) !== filtros.ano) {
      return false;
    }

    if (
      filtros.status.length > 0 &&
      !filtros.status.includes(registro.status)
    ) {
      return false;
    }

    return true;
  });
}

interface ResumoCardProps {
  icon: ElementType;
  label: string;
  valor: string;
  tone: "primary" | "success" | "danger" | "info";
}

function ResumoCard({ icon: Icon, label, valor, tone }: ResumoCardProps) {
  const tones: Record<ResumoCardProps["tone"], string> = {
    primary: "bg-primary-soft border-primary/15 text-primary",
    success:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    danger:
      "border-rose-200/70 bg-rose-50/70 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
    info: "border-sky-200/70 bg-sky-50/70 text-sky-600 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
  };

  return (
    <div className="flex items-center gap-3 rounded-[15px] border border-border/70 bg-card/75 p-3.5 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[11px] border ${tones[tone]}`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="text-[22px] font-semibold leading-tight tabular-nums text-foreground">
          {valor}
        </p>
      </div>
    </div>
  );
}

export default function RelatorioPresencas() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PESQUISA_INICIAIS);
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_INICIAIS);
  const [registros, setRegistros] = useState<RegistroPresenca[]>([]);
  const [atividades, setAtividades] = useState<RelatorioOption[]>([]);
  const [turmasTodas, setTurmasTodas] = useState<RelatorioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "relatorio-presencas:search:v2",
    false,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleKeys, setVisibleKeys] = useState([
    "participanteNome",
    "atividadeNome",
    "turmaNome",
    "data",
    "status",
    "observacao",
  ]);

  const anos = useMemo(() => anosDisponiveisPresenca(registros), [registros]);

  const meses = useMemo(() => {
    const disponiveis = mesesDisponiveisPresenca(registros);

    return mesesOptions.filter((mes) => disponiveis.includes(mes.value));
  }, [registros]);

  const turmas = useMemo(() => {
    if (filtros.atividadeId === "TODOS" || filtros.atividadeId === SELECIONE) {
      return [];
    }

    return turmasTodas.filter(
      (turma) => String(turma.atividadeId) === String(filtros.atividadeId),
    );
  }, [filtros.atividadeId, turmasTodas]);

  useEffect(() => {
    if (
      filtros.turmaId !== "TODOS" &&
      filtros.turmaId !== SELECIONE &&
      !turmas.find((turma) => turma.id === filtros.turmaId)
    ) {
      setFiltros((prev) => ({ ...prev, turmaId: "TODOS" }));
    }
  }, [turmas, filtros.turmaId]);

  async function carregar() {
    setLoading(true);
    setErro(null);

    try {
      const data = await getRelatorioPresencasData();

      setRegistros(data.registros);
      setAtividades(data.atividades);
      setTurmasTodas(data.turmas);
    } catch (error) {
      console.error(error);

      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o relatório de presenças. Tente novamente.";

      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const resultado = useMemo(
    () => aplicarFiltros(registros, aplicados),
    [registros, aplicados],
  );

  const total = resultado.length;
  const presentes = resultado.filter(
    (item) => item.status === "PRESENTE",
  ).length;
  const ausentes = resultado.filter((item) => item.status === "AUSENTE").length;
  const naoTeveAula = resultado.filter(
    (item) => item.status === "NAO_TEVE_AULA",
  ).length;
  const feriados = resultado.filter((item) => item.status === "FERIADO").length;
  const pctPresenca = total > 0 ? (presentes / total) * 100 : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagina = resultado.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const atividadeAplicadaLabel =
    aplicados.atividadeId === "TODOS"
      ? "Todas"
      : (atividades.find((atividade) => atividade.id === aplicados.atividadeId)
          ?.nome ?? aplicados.atividadeId);

  const turmaAplicadaLabel =
    aplicados.turmaId === "TODOS"
      ? "Todas"
      : (turmasTodas.find((turma) => turma.id === aplicados.turmaId)?.nome ??
        aplicados.turmaId);

  const todasColunasPresenca: RelatorioColumn<RegistroPresenca>[] = [
    {
      key: "participanteNome",
      label: "Participante",
      accessor: (registro) => registro.participanteNome,
    },
    {
      key: "atividadeNome",
      label: "Atividade",
      accessor: (registro) => registro.atividadeNome,
    },
    {
      key: "turmaNome",
      label: "Turma",
      accessor: (registro) => registro.turmaNome ?? "—",
    },
    {
      key: "data",
      label: "Data",
      accessor: (registro) => formatDataBR(registro.data),
    },
    {
      key: "status",
      label: "Status",
      accessor: (registro) => statusLabel(registro.status),
    },
    {
      key: "observacao",
      label: "Observações",
      accessor: (registro) => registro.observacao ?? "",
    },
  ];
  const colunasExport = todasColunasPresenca.filter((column) =>
    visibleKeys.includes(column.key),
  );

  async function handleGerarPdf() {
    if (resultado.length === 0) {
      toast.warning("Não há registros de presença para exportar.");
      return;
    }

    await downloadFilteredPresenceReport({
      participante: aplicados.participante.trim() || null,
      atividadeId:
        aplicados.atividadeId === "TODOS"
          ? null
          : Number(aplicados.atividadeId),
      turmaId: aplicados.turmaId === "TODOS" ? null : Number(aplicados.turmaId),
      data: aplicados.data || null,
      mes: aplicados.mes === "TODOS" ? null : Number(aplicados.mes),
      ano: aplicados.ano === "TODOS" ? null : Number(aplicados.ano),
      status: aplicados.status,
    });
  }

  function limpar() {
    setFiltros(FILTROS_PESQUISA_INICIAIS);
    setAplicados(FILTROS_INICIAIS);
    setCurrentPage(1);
  }

  function filtrar() {
    setAplicados(normalizarFiltros(filtros));
    setCurrentPage(1);
    toast.success("Filtros aplicados.");
  }

  const activeFilters: ActiveFilterItem[] = [];
  if (aplicados.participante.trim())
    activeFilters.push({
      id: "participante",
      label: "Participante",
      value: aplicados.participante.trim(),
      onRemove: () => setAplicados({ ...aplicados, participante: "" }),
    });
  if (aplicados.atividadeId !== "TODOS")
    activeFilters.push({
      id: "atividade",
      label: "Atividade",
      value: atividadeAplicadaLabel,
      onRemove: () =>
        setAplicados({ ...aplicados, atividadeId: "TODOS", turmaId: "TODOS" }),
    });
  if (aplicados.turmaId !== "TODOS")
    activeFilters.push({
      id: "turma",
      label: "Turma",
      value: turmaAplicadaLabel,
      onRemove: () => setAplicados({ ...aplicados, turmaId: "TODOS" }),
    });
  if (aplicados.data)
    activeFilters.push({
      id: "data",
      label: "Data",
      value: formatDataBR(aplicados.data),
      onRemove: () => setAplicados({ ...aplicados, data: "" }),
    });
  if (aplicados.mes !== "TODOS")
    activeFilters.push({
      id: "mes",
      label: "Mês",
      value: mesLabel(aplicados.mes),
      onRemove: () => setAplicados({ ...aplicados, mes: "TODOS" }),
    });
  if (aplicados.ano !== "TODOS")
    activeFilters.push({
      id: "ano",
      label: "Ano",
      value: aplicados.ano,
      onRemove: () => setAplicados({ ...aplicados, ano: "TODOS" }),
    });
  aplicados.status.forEach((status) =>
    activeFilters.push({
      id: `status-${status}`,
      label: "Status",
      value: statusLabel(status as StatusPresenca),
      onRemove: () =>
        setAplicados({
          ...aplicados,
          status: aplicados.status.filter((item) => item !== status),
        }),
    }),
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Relatório de Presenças"
          tooltip="Nesta página são consultados os registros de presença dos participantes nas atividades e turmas da organização. Os filtros permitem acompanhar a frequência do público em diferentes períodos e identificar presenças, faltas e outras situações registradas, apoiando o acompanhamento das atividades, relatórios e prestações de contas."
        />

        <PageObjective
          className="mb-4"
          description="Analise a frequência dos participantes nas atividades e turmas da organização, utilizando os filtros para consultar registros por atividade, turma, participante, situação e período. Os resultados podem ser exportados quando necessário para acompanhamento da execução, relatórios e prestações de contas."
        />

        <div className="mb-5 space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
            title="Pesquisa avançada"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                filtrar();
              }}
              noValidate
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="pesquisa-atividade">
                    Atividade
                  </FieldLabel>
                  <Select
                    value={filtros.atividadeId}
                    onValueChange={(value) =>
                      setFiltros((previous) => ({
                        ...previous,
                        atividadeId: value,
                        turmaId: SELECIONE,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="pesquisa-atividade"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECIONE} disabled>
                        Selecione
                      </SelectItem>
                      <SelectItem value="TODOS">Todas</SelectItem>
                      {atividades.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="pesquisa-turma">Turma</FieldLabel>
                  <Select
                    value={filtros.turmaId}
                    onValueChange={(value) =>
                      setFiltros((previous) => ({
                        ...previous,
                        turmaId: value,
                      }))
                    }
                    disabled={
                      filtros.atividadeId === "TODOS" ||
                      filtros.atividadeId === SELECIONE ||
                      turmas.length === 0
                    }
                  >
                    <SelectTrigger
                      id="pesquisa-turma"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECIONE} disabled>
                        Selecione
                      </SelectItem>
                      <SelectItem value="TODOS">Todas</SelectItem>
                      {turmas.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel
                    htmlFor="pesquisa-participante"
                    tooltip="Digite parte do nome do participante."
                  >
                    Participante
                  </FieldLabel>
                  <Input
                    id="pesquisa-participante"
                    value={filtros.participante}
                    onChange={(event) =>
                      setFiltros((previous) => ({
                        ...previous,
                        participante: event.target.value,
                      }))
                    }
                    placeholder="Digite o nome do participante"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pesquisa-status">Status</FieldLabel>
                  <FilterMultiSelect
                    id="pesquisa-status"
                    options={statusPresencaOptions.map((item) => ({
                      value: item.value,
                      label: item.label,
                    }))}
                    value={filtros.status}
                    onChange={(value) =>
                      setFiltros((previous) => ({ ...previous, status: value }))
                    }
                    placeholder="Selecione os status"
                    summaryNoun="status selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pesquisa-data">Data</FieldLabel>
                  <Input
                    id="pesquisa-data"
                    type="date"
                    value={filtros.data}
                    onChange={(event) =>
                      setFiltros((previous) => ({
                        ...previous,
                        data: event.target.value,
                      }))
                    }
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pesquisa-mes">Mês</FieldLabel>
                  <Select
                    value={filtros.mes}
                    onValueChange={(value) =>
                      setFiltros((previous) => ({ ...previous, mes: value }))
                    }
                  >
                    <SelectTrigger
                      id="pesquisa-mes"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECIONE} disabled>
                        Selecione
                      </SelectItem>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {(meses.length ? meses : mesesOptions).map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="pesquisa-ano">Ano</FieldLabel>
                  <Select
                    value={filtros.ano}
                    onValueChange={(value) =>
                      setFiltros((previous) => ({ ...previous, ano: value }))
                    }
                  >
                    <SelectTrigger
                      id="pesquisa-ano"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECIONE} disabled>
                        Selecione
                      </SelectItem>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {anos.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={limpar}
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

        <section className="hidden">
          <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
            Filtros do relatório
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="f-participante">Participante</Label>

              <Input
                id="f-participante"
                value={filtros.participante}
                onChange={(event) =>
                  setFiltros((prev) => ({
                    ...prev,
                    participante: event.target.value,
                  }))
                }
                placeholder="Digite o nome do participante"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-ativ">Atividade</Label>

              <Select
                value={filtros.atividadeId}
                onValueChange={(value) =>
                  setFiltros((prev) => ({
                    ...prev,
                    atividadeId: value,
                    turmaId: "TODOS",
                  }))
                }
              >
                <SelectTrigger id="f-ativ">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="max-h-72">
                  <SelectItem value="TODOS">Todas</SelectItem>

                  {atividades.map((atividade) => (
                    <SelectItem key={atividade.id} value={atividade.id}>
                      {atividade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-turma">Turma</Label>

              <Select
                value={filtros.turmaId}
                onValueChange={(value) =>
                  setFiltros((prev) => ({ ...prev, turmaId: value }))
                }
                disabled={
                  filtros.atividadeId === "TODOS" || turmas.length === 0
                }
              >
                <SelectTrigger id="f-turma">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>

                <SelectContent className="max-h-72">
                  <SelectItem value="TODOS">Todas</SelectItem>

                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-data">Data</Label>

              <Input
                id="f-data"
                type="date"
                value={filtros.data}
                onChange={(event) =>
                  setFiltros((prev) => ({ ...prev, data: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-mes">Mês</Label>

              <Select
                value={filtros.mes}
                onValueChange={(value) =>
                  setFiltros((prev) => ({ ...prev, mes: value }))
                }
              >
                <SelectTrigger id="f-mes">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>

                  {(meses.length > 0 ? meses : mesesOptions).map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-ano">Ano</Label>

              <Select
                value={filtros.ano}
                onValueChange={(value) =>
                  setFiltros((prev) => ({ ...prev, ano: value }))
                }
              >
                <SelectTrigger id="f-ano">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>

                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-end gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={limpar}
              className="w-full sm:w-auto"
            >
              Limpar filtros
            </Button>

            <Button onClick={filtrar} className="w-full sm:w-auto">
              Filtrar
            </Button>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResumoCard
            icon={CalendarCheck2}
            tone="primary"
            label="Registros"
            valor={String(total)}
          />

          <ResumoCard
            icon={CheckCircle2}
            tone="success"
            label="Presenças"
            valor={String(presentes)}
          />

          <ResumoCard
            icon={XCircle}
            tone="danger"
            label="Ausências"
            valor={String(ausentes)}
          />

          <ResumoCard
            icon={Percent}
            tone="info"
            label="% Presença"
            valor={`${pctPresenca.toFixed(2)}%`}
          />
        </section>

        <DataTableCard>
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Registros de presença
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {naoTeveAula > 0 && `${naoTeveAula} sem aula • `}
                {feriados > 0 && `${feriados} feriado(s) • `}
                Atualizado conforme filtros aplicados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <RelatorioExportButtons
                rows={resultado}
                columns={colunasExport}
                reportName="presencas"
                dataGeracao={new Date().toLocaleDateString("pt-BR")}
                disabled={loading || !colunasExport.length}
                showPdf
                onPdf={handleGerarPdf}
                pdfDisabled={resultado.length === 0}
                showCopy={false}
                compact
              />
              <ColumnSelector
                columns={todasColunasPresenca}
                visibleKeys={visibleKeys}
                onChange={setVisibleKeys}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                Carregando registros...
              </div>
            ) : erro ? (
              <div className="px-5 py-12 text-center">
                <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />

                <p className="text-sm text-destructive">{erro}</p>

                <Button
                  variant="glassSecondary"
                  className="mt-3 h-8 rounded-[10px] px-3 text-[12px] font-semibold"
                  onClick={() => void carregar()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : total === 0 ? (
              <div className="px-5 py-12 text-center">
                <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />

                <p className="text-sm font-medium text-foreground">
                  Nenhum registro de presença encontrado.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste os filtros ou consulte outro período.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleKeys.includes("participanteNome") && (
                      <TableHead className="text-xs">Participante</TableHead>
                    )}
                    {visibleKeys.includes("atividadeNome") && (
                      <TableHead className="text-xs">Atividade</TableHead>
                    )}
                    {visibleKeys.includes("turmaNome") && (
                      <TableHead className="text-xs">Turma</TableHead>
                    )}
                    {visibleKeys.includes("data") && (
                      <TableHead className="text-xs">Data</TableHead>
                    )}
                    {visibleKeys.includes("status") && (
                      <TableHead className="text-xs">Status</TableHead>
                    )}
                    {visibleKeys.includes("observacao") && (
                      <TableHead className="text-xs">Observações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pagina.map((registro) => (
                    <TableRow key={registro.id}>
                      {visibleKeys.includes("participanteNome") && (
                        <TableCell className="text-xs font-medium text-foreground">
                          {registro.participanteNome}
                        </TableCell>
                      )}

                      {visibleKeys.includes("atividadeNome") && (
                        <TableCell className="text-xs">
                          {registro.atividadeNome}
                        </TableCell>
                      )}

                      {visibleKeys.includes("turmaNome") && (
                        <TableCell className="text-xs">
                          {registro.turmaNome ?? "—"}
                        </TableCell>
                      )}

                      {visibleKeys.includes("data") && (
                        <TableCell className="text-xs tabular-nums">
                          {formatDataBR(registro.data)}
                        </TableCell>
                      )}

                      {visibleKeys.includes("status") && (
                        <TableCell className="text-xs">
                          <StatusBadge status={registro.status} />
                        </TableCell>
                      )}

                      {visibleKeys.includes("observacao") && (
                        <TableCell className="text-xs text-muted-foreground">
                          {registro.observacao ?? "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {!loading && !erro && total > 0 && (
            <TablePagination
              totalItems={total}
              currentPage={safePage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[25, 50, 100, 200, 500, 1000]}
              showCopy={false}
            />
          )}
        </DataTableCard>
      </div>
    </AppLayout>
  );
}

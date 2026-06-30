import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Inbox,
  Percent,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { MultiSelect } from "@/components/MultiSelect";
import { PageTitle } from "@/components/PageTitle";
import { RelatorioExportButtons } from "@/components/relatorios/RelatorioExportButtons";
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
import type { RelatorioColumn } from "@/lib/relatorioExporters";

type SortKey = "nome" | "status" | "atividade" | "turma" | "percentual";
type SortDir = "asc" | "desc";

const statusBadgeClass: Record<string, string> = {
  MATRICULADO: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  PENDENTE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  DESISTENTE: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  CONCLUIDO: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  INATIVO: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
  EM_ESPERA: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  CANCELADO: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass[status] ?? statusBadgeClass.INATIVO}`}>
      {statusParticipanteLabel(status)}
    </span>
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
    primary: "border-primary/15 bg-primary-soft text-primary",
    success: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    danger: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    info: "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="tabular-nums text-2xl font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}

function SortableHead({ children, active, dir, onClick }: { children: ReactNode; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <TableHead className="text-xs">
      <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${active ? "font-semibold text-foreground" : ""}`}>
        {children}
        <ArrowUpDown className={`h-3 w-3 transition-transform ${active ? "opacity-90" : "opacity-40"} ${active && dir === "desc" ? "rotate-180" : ""}`} />
      </button>
    </TableHead>
  );
}

export default function RelatorioParticipantes() {
  const [filtros, setFiltros] = useState<FiltrosRelatorioParticipantes>(filtrosIniciais);
  const [aplicados, setAplicados] = useState<FiltrosRelatorioParticipantes>(filtrosIniciais);
  const [linhas, setLinhas] = useState<LinhaRelatorioParticipante[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const statusLabels = statusParticipanteOptions.map((option) => option.label);
  const presencaLabels = tipoPresencaOptions.map((option) => option.label);
  const cadunicoLabels = booleanFiltroOptions.map((option) => option.label);
  const bolsaFamiliaLabels = booleanFiltroOptions.map((option) => option.label);
  const statusToLabel = (value: StatusParticipanteRelatorio) => statusParticipanteOptions.find((option) => option.value === value)?.label ?? value;
  const statusByLabel = (label: string) => statusParticipanteOptions.find((option) => option.label === label)?.value ?? "ATIVO";
  const presencaToLabel = (value: TipoPresencaFiltro) => tipoPresencaOptions.find((option) => option.value === value)?.label ?? value;
  const presencaByLabel = (label: string) => tipoPresencaOptions.find((option) => option.label === label)?.value ?? "PRESENTE";
  const neurodivergenciaToLabel = (value: TipoNeurodivergencia) => tipoNeurodivergenciaValueToLabel(value);
  const neurodivergenciaByLabel = (label: string) => tipoNeurodivergenciaRelatorioOptions.find((option) => tipoNeurodivergenciaValueToLabel(option) === label) ?? "TEA";
  const deficienciaToLabel = (value: TipoDeficienciaParticipante) => tipoDeficienciaParticipanteValueToLabel(value);
  const deficienciaByLabel = (label: string) => tipoDeficienciaRelatorioOptions.find((option) => tipoDeficienciaParticipanteValueToLabel(option) === label) ?? "NAO_INFORMADO";
  const booleanByLabel = (label: string): BooleanFiltro => booleanFiltroOptions.find((option) => option.label === label)?.value ?? "SIM";

  const turmasDisponiveis = useMemo(
    () => filtros.atividadeId === "TODOS" ? turmas : turmas.filter((turma) => turma.atividadeId === filtros.atividadeId),
    [filtros.atividadeId, turmas],
  );

  useEffect(() => {
    if (filtros.turmaId !== "TODOS" && !turmasDisponiveis.some((turma) => turma.id === filtros.turmaId)) {
      setFiltros((current) => ({ ...current, turmaId: "TODOS" }));
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
      setErro("Não foi possível carregar o relatório de participantes. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  const filtradas = useMemo(() => aplicarFiltros(linhas, { ...aplicados, busca }), [linhas, aplicados, busca]);
  const ordenadas = useMemo(() => [...filtradas].sort((a, b) => {
    const values: Record<SortKey, [string | number, string | number]> = {
      nome: [a.participanteNome.toLocaleLowerCase("pt-BR"), b.participanteNome.toLocaleLowerCase("pt-BR")],
      status: [statusParticipanteLabel(a.status), statusParticipanteLabel(b.status)],
      atividade: [a.atividadeNome.toLocaleLowerCase("pt-BR"), b.atividadeNome.toLocaleLowerCase("pt-BR")],
      turma: [(a.turmaNome ?? "").toLocaleLowerCase("pt-BR"), (b.turmaNome ?? "").toLocaleLowerCase("pt-BR")],
      percentual: [a.percentualPresenca, b.percentualPresenca],
    };
    const [left, right] = values[sortKey];
    const result = left < right ? -1 : left > right ? 1 : 0;
    return sortDir === "asc" ? result : -result;
  }), [filtradas, sortKey, sortDir]);

  const pagination = usePagination(ordenadas, 25, JSON.stringify({ aplicados, busca, sortKey, sortDir }));
  const totalLinhas = ordenadas.length;
  const totalPresencas = ordenadas.reduce((sum, linha) => sum + linha.presencas, 0);
  const totalAusencias = ordenadas.reduce((sum, linha) => sum + linha.ausencias, 0);
  const pctMedio = totalLinhas ? ordenadas.reduce((sum, linha) => sum + linha.percentualPresenca, 0) / totalLinhas : 0;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const limpar = () => { setFiltros(filtrosIniciais); setAplicados(filtrosIniciais); setBusca(""); };
  const filtrar = () => { setAplicados(filtros); toast.success("Filtros aplicados."); };

  const atividadeAplicadaLabel = aplicados.atividadeId === "TODOS" ? "Todas" : atividades.find((item) => item.id === aplicados.atividadeId)?.nomeAtividade ?? aplicados.atividadeId;
  const turmaAplicadaLabel = aplicados.turmaId === "TODOS" ? "Todas" : turmas.find((item) => item.id === aplicados.turmaId)?.nomeTurma ?? aplicados.turmaId;
  const mostrarStatus = aplicados.status.length > 0;
  const mostrarAtividade = aplicados.atividadeId !== "TODOS";
  const mostrarTurma = aplicados.turmaId !== "TODOS";
  const mostrarPresencas = aplicados.presencas.includes("PRESENTE");
  const mostrarAusencias = aplicados.presencas.includes("AUSENTE");
  const mostrarFeriados = aplicados.presencas.includes("FERIADO");
  const mostrarSemAula = aplicados.presencas.includes("NAO_TEVE_AULA");
  const mostrarPercentual = mostrarPresencas || mostrarAusencias;

  const colunasExport: RelatorioColumn<LinhaRelatorioParticipante>[] = [
    { key: "nome", label: "Participante", accessor: (row) => row.participanteNome },
    {
      key: "tipoNeurodivergencias",
      label: "Neurodivergências",
      accessor: (row) =>
        tipoNeurodivergenciasRelatorioLabel(row.tipoNeurodivergencias),
    },
    {
      key: "tipoDeficiencias",
      label: "Tipo de deficiência",
      accessor: (row) => tipoDeficienciasRelatorioLabel(row.tipoDeficiencias),
    },
    {
      key: "possuiCadunico",
      label: "CadÚnico",
      accessor: (row) => (row.possuiCadunico ? "Sim" : "Não"),
    },
    {
      key: "possuiBolsaFamilia",
      label: "Bolsa Família",
      accessor: (row) => (row.possuiBolsaFamilia ? "Sim" : "Não"),
    },
  ];

  if (mostrarStatus) {
    colunasExport.push({
      key: "status",
      label: "Status",
      accessor: (row) => statusParticipanteLabel(row.status),
    });
  }

  if (mostrarAtividade) {
    colunasExport.push({
      key: "atividade",
      label: "Atividade",
      accessor: (row) => row.atividadeNome,
    });
  }

  if (mostrarTurma) {
    colunasExport.push({
      key: "turma",
      label: "Turma",
      accessor: (row) => row.turmaNome ?? "—",
    });
  }

  if (mostrarAusencias) {
    colunasExport.push({
      key: "ausencias",
      label: "Ausências",
      accessor: (row) => row.ausencias,
    });
  }

  if (mostrarFeriados) {
    colunasExport.push({
      key: "feriados",
      label: "Feriados",
      accessor: (row) => row.feriados,
    });
  }

  if (mostrarSemAula) {
    colunasExport.push({
      key: "semAula",
      label: "Não teve aula",
      accessor: (row) => row.semAula,
    });
  }

  if (mostrarPresencas) {
    colunasExport.push(
      { key: "presencas", label: "Presenças", accessor: (row) => row.presencas },
      {
        key: "ultima",
        label: "Última presença",
        accessor: (row) => formatDataBR(row.ultimaPresenca),
      },
    );
  }

  if (mostrarPercentual) {
    colunasExport.push({
      key: "percentual",
      label: "% Presença",
      accessor: (row) => `${row.percentualPresenca.toFixed(1)}%`,
    });
  }
  const indicadoresPdf = [
    { label: "Status", valor: aplicados.status.length ? aplicados.status.map(statusToLabel).join(", ") : "Todos" },
    { label: "Atividade", valor: atividadeAplicadaLabel },
    { label: "Turma", valor: turmaAplicadaLabel },
    { label: "Presença", valor: aplicados.presencas.length ? aplicados.presencas.map(presencaToLabel).join(", ") : "Todas" },
    { label: "Tipos de Neurodivergências", valor: aplicados.tipoNeurodivergencias.length ? aplicados.tipoNeurodivergencias.map(neurodivergenciaToLabel).join(", ") : "Todas" },
    { label: "Tipo de Deficiência", valor: aplicados.tipoDeficiencias.length ? aplicados.tipoDeficiencias.map(deficienciaToLabel).join(", ") : "Todos" },
    { label: "CadÚnico", valor: aplicados.possuiCadunico.length ? aplicados.possuiCadunico.map(booleanFiltroLabel).join(", ") : "Todos" },
    { label: "Bolsa Família", valor: aplicados.possuiBolsaFamilia.length ? aplicados.possuiBolsaFamilia.map(booleanFiltroLabel).join(", ") : "Todos" },
    { label: "Total de Participantes", valor: String(totalLinhas) },
    { label: "Presenças", valor: String(totalPresencas) },
    { label: "Ausências", valor: String(totalAusencias) },
    { label: "% Médio", valor: `${pctMedio.toFixed(1)}%` },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle title="Relatório de Participantes" tooltip="Consulte participantes por status, atividade, turma e registros de presença." />
        <p className="-mt-2 mb-5 text-sm text-muted-foreground">Consulte participantes por status, atividade, turma e registros de presença.</p>

        <section className="mb-5 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">Filtros do Relatório</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-status">Status</Label>
              <MultiSelect id="f-status" placeholder="Todos" options={statusLabels} value={filtros.status.map(statusToLabel)} onChange={(values) => setFiltros((current) => ({ ...current, status: values.map(statusByLabel) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-ativ">Atividade</Label>
              <Select value={filtros.atividadeId} onValueChange={(value) => setFiltros((current) => ({ ...current, atividadeId: value, turmaId: "TODOS" }))}>
                <SelectTrigger id="f-ativ"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="TODOS">Todas</SelectItem>{atividades.map((item) => <SelectItem key={item.id} value={item.id}>{item.nomeAtividade}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-turma">Turma</Label>
              <Select value={filtros.turmaId} onValueChange={(value) => setFiltros((current) => ({ ...current, turmaId: value }))}>
                <SelectTrigger id="f-turma"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="TODOS">Todas</SelectItem>{turmasDisponiveis.map((item) => <SelectItem key={item.id} value={item.id}>{item.nomeTurma}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-presenca">Presença</Label>
              <MultiSelect id="f-presenca" placeholder="Todas" options={presencaLabels} value={filtros.presencas.map(presencaToLabel)} onChange={(values) => setFiltros((current) => ({ ...current, presencas: values.map(presencaByLabel) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-neurodivergencias">Tipos de Neurodivergências</Label>
              <MultiSelect
                id="f-neurodivergencias"
                placeholder="Todas"
                options={tipoNeurodivergenciaRelatorioOptions.map(neurodivergenciaToLabel)}
                value={filtros.tipoNeurodivergencias.map(neurodivergenciaToLabel)}
                onChange={(values) =>
                  setFiltros((current) => ({
                    ...current,
                    tipoNeurodivergencias: values.map(neurodivergenciaByLabel),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-deficiencias">Tipo de Deficiência</Label>
              <MultiSelect
                id="f-deficiencias"
                placeholder="Todos"
                options={tipoDeficienciaRelatorioOptions.map(deficienciaToLabel)}
                value={filtros.tipoDeficiencias.map(deficienciaToLabel)}
                onChange={(values) =>
                  setFiltros((current) => ({
                    ...current,
                    tipoDeficiencias: values.map(deficienciaByLabel),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cadunico">CadÚnico</Label>
              <MultiSelect
                id="f-cadunico"
                placeholder="Todos"
                options={cadunicoLabels}
                value={filtros.possuiCadunico.map(booleanFiltroLabel)}
                onChange={(values) =>
                  setFiltros((current) => ({
                    ...current,
                    possuiCadunico: values.map(booleanByLabel),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-bolsa-familia">Bolsa Família</Label>
              <MultiSelect
                id="f-bolsa-familia"
                placeholder="Todos"
                options={bolsaFamiliaLabels}
                value={filtros.possuiBolsaFamilia.map(booleanFiltroLabel)}
                onChange={(values) =>
                  setFiltros((current) => ({
                    ...current,
                    possuiBolsaFamilia: values.map(booleanByLabel),
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-col justify-end gap-2 sm:flex-row">
            <Button variant="outline" onClick={limpar} className="w-full sm:w-auto">Limpar filtros</Button>
            <Button onClick={filtrar} className="w-full sm:w-auto">Filtrar relatório</Button>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResumoCard icon={Users} tone="primary" label="Participantes" valor={String(totalLinhas)} />
          <ResumoCard icon={CheckCircle2} tone="success" label="Presenças" valor={String(totalPresencas)} />
          <ResumoCard icon={XCircle} tone="danger" label="Ausências" valor={String(totalAusencias)} />
          <ResumoCard icon={Percent} tone="info" label="% Médio" valor={`${pctMedio.toFixed(1)}%`} />
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-sm font-semibold text-foreground">Participantes encontrados</h2><p className="mt-0.5 text-xs text-muted-foreground">Resultados consideram os filtros aplicados.</p></div>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full sm:w-72"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por nome..." className="h-9 pl-8 text-xs" /></div>
              <RelatorioExportButtons rows={ordenadas} columns={colunasExport} reportName="participantes" dataGeracao={new Date().toLocaleDateString("pt-BR")} indicadoresPdf={indicadoresPdf} disabled={!totalLinhas || loading} showPdf />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">Carregando participantes...</div> : erro ? (
              <div className="px-5 py-12 text-center"><AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" /><p className="text-sm text-destructive">{erro}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void carregar()}>Tentar novamente</Button></div>
            ) : !totalLinhas ? (
              <div className="px-5 py-12 text-center"><Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum participante encontrado com os filtros selecionados.</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <SortableHead active={sortKey === "nome"} dir={sortDir} onClick={() => toggleSort("nome")}>Participante</SortableHead>
                  <TableHead className="text-xs">Tipos de Neurodivergências</TableHead>
                  <TableHead className="text-xs">Tipo de Deficiência</TableHead>
                  <TableHead className="text-xs">CadÚnico</TableHead>
                  <TableHead className="text-xs">Bolsa Família</TableHead>
                  {mostrarStatus && <SortableHead active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")}>Status</SortableHead>}
                  {mostrarAtividade && <SortableHead active={sortKey === "atividade"} dir={sortDir} onClick={() => toggleSort("atividade")}>Atividade</SortableHead>}
                  {mostrarTurma && <SortableHead active={sortKey === "turma"} dir={sortDir} onClick={() => toggleSort("turma")}>Turma</SortableHead>}
                  {mostrarPresencas && <TableHead className="text-right text-xs">Presenças</TableHead>}
                  {mostrarAusencias && <TableHead className="text-right text-xs">Ausências</TableHead>}
                  {mostrarFeriados && <TableHead className="text-right text-xs">Feriados</TableHead>}
                  {mostrarSemAula && <TableHead className="text-right text-xs">Não teve aula</TableHead>}
                  {mostrarPercentual && <SortableHead active={sortKey === "percentual"} dir={sortDir} onClick={() => toggleSort("percentual")}>% Presença</SortableHead>}
                  {mostrarPresencas && <TableHead className="text-xs">Última presença</TableHead>}
                </TableRow></TableHeader>
                <TableBody>{pagination.paginated.map((linha) => <TableRow key={linha.id}>
                  <TableCell className="text-xs font-medium text-foreground">{linha.participanteNome}</TableCell>
                  <TableCell className="text-xs">{tipoNeurodivergenciasRelatorioLabel(linha.tipoNeurodivergencias)}</TableCell>
                  <TableCell className="text-xs">{tipoDeficienciasRelatorioLabel(linha.tipoDeficiencias)}</TableCell>
                  <TableCell className="text-xs">{linha.possuiCadunico ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-xs">{linha.possuiBolsaFamilia ? "Sim" : "Não"}</TableCell>
                  {mostrarStatus && <TableCell className="text-xs"><StatusBadge status={linha.status} /></TableCell>}
                  {mostrarAtividade && <TableCell className="text-xs">{linha.atividadeNome}</TableCell>}
                  {mostrarTurma && <TableCell className="text-xs">{linha.turmaNome ?? "—"}</TableCell>}
                  {mostrarPresencas && <TableCell className="text-right text-xs tabular-nums">{linha.presencas}</TableCell>}
                  {mostrarAusencias && <TableCell className="text-right text-xs tabular-nums">{linha.ausencias}</TableCell>}
                  {mostrarFeriados && <TableCell className="text-right text-xs tabular-nums">{linha.feriados}</TableCell>}
                  {mostrarSemAula && <TableCell className="text-right text-xs tabular-nums">{linha.semAula}</TableCell>}
                  {mostrarPercentual && <TableCell className="text-xs tabular-nums">{linha.percentualPresenca.toFixed(1)}%</TableCell>}
                  {mostrarPresencas && <TableCell className="text-xs tabular-nums">{formatDataBR(linha.ultimaPresenca)}</TableCell>}
                </TableRow>)}</TableBody>
              </Table>
            )}
          </div>
          {!loading && !erro && totalLinhas > 0 && <TablePagination totalItems={totalLinhas} currentPage={pagination.currentPage} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} showCopy={false} />}
        </section>
      </div>
    </AppLayout>
  );
}

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
    CalendarCheck2,
    CheckCircle2,
    XCircle,
    Percent,
    Inbox,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
import type { RelatorioColumn } from "@/lib/relatorioExporters";
import { exportPdf } from "@/lib/relatorioExporters";
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

type Filtros = {
    atividadeId: string;
    turmaId: string;
    data: string;
    mes: string;
    ano: string;
};

const FILTROS_INICIAIS: Filtros = {
    atividadeId: "TODOS",
    turmaId: "TODOS",
    data: "",
    mes: "TODOS",
    ano: "TODOS",
};

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

const statusBadgeClass: Record<StatusPresenca, string> = {
    PRESENTE:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    AUSENTE:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    NAO_TEVE_AULA:
        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-900",
    FERIADO:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
};

const statusLabel = (status: StatusPresenca) =>
    statusPresencaOptions.find((option) => option.value === status)?.label ??
    status;

function StatusBadge({ status }: { status: StatusPresenca }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass[status]}`}
        >
            {statusLabel(status)}
        </span>
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
            "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
        danger:
            "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300",
        info: "bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-300",
    };

    return (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg border ${tones[tone]}`}
            >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>

                <p className="tabular-nums text-2xl font-semibold text-foreground">
                    {valor}
                </p>
            </div>
        </div>
    );
}

export default function RelatorioPresencas() {
    const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
    const [aplicados, setAplicados] = useState<Filtros>(FILTROS_INICIAIS);
    const [registros, setRegistros] = useState<RegistroPresenca[]>([]);
    const [atividades, setAtividades] = useState<RelatorioOption[]>([]);
    const [turmasTodas, setTurmasTodas] = useState<RelatorioOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const anos = useMemo(() => anosDisponiveisPresenca(registros), [registros]);

    const meses = useMemo(() => {
        const disponiveis = mesesDisponiveisPresenca(registros);

        return mesesOptions.filter((mes) => disponiveis.includes(mes.value));
    }, [registros]);

    const turmas = useMemo(() => {
        if (filtros.atividadeId === "TODOS") {
            return [];
        }

        return turmasTodas.filter(
            (turma) => String(turma.atividadeId) === String(filtros.atividadeId),
        );
    }, [filtros.atividadeId, turmasTodas]);

    useEffect(() => {
        if (
            filtros.turmaId !== "TODOS" &&
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
    const presentes = resultado.filter((item) => item.status === "PRESENTE").length;
    const ausentes = resultado.filter((item) => item.status === "AUSENTE").length;
    const naoTeveAula = resultado.filter(
        (item) => item.status === "NAO_TEVE_AULA",
    ).length;
    const feriados = resultado.filter((item) => item.status === "FERIADO").length;
    const pctPresenca = total > 0 ? (presentes / total) * 100 : 0;

    const atividadeAplicadaLabel =
        aplicados.atividadeId === "TODOS"
            ? "Todas"
            : atividades.find((atividade) => atividade.id === aplicados.atividadeId)
                ?.nome ?? aplicados.atividadeId;

    const turmaAplicadaLabel =
        aplicados.turmaId === "TODOS"
            ? "Todas"
            : turmasTodas.find((turma) => turma.id === aplicados.turmaId)?.nome ??
            aplicados.turmaId;

    const colunasExport: RelatorioColumn<RegistroPresenca>[] = [
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

    const indicadoresPdf = [
        { label: "Atividade", valor: atividadeAplicadaLabel },
        { label: "Turma", valor: turmaAplicadaLabel },
        {
            label: "Data",
            valor: aplicados.data ? formatDataBR(aplicados.data) : "Todas",
        },
        { label: "Mês", valor: mesLabel(aplicados.mes) },
        { label: "Ano", valor: aplicados.ano === "TODOS" ? "Todos" : aplicados.ano },
        { label: "Total de registros", valor: String(total) },
        { label: "Presenças", valor: String(presentes) },
        { label: "Ausências", valor: String(ausentes) },
        { label: "Não teve aula", valor: String(naoTeveAula) },
        { label: "Feriados", valor: String(feriados) },
        { label: "% Presença", valor: `${pctPresenca.toFixed(2)}%` },
    ];

    function limpar() {
        setFiltros(FILTROS_INICIAIS);
        setAplicados(FILTROS_INICIAIS);
    }

    function filtrar() {
        setAplicados(filtros);
        toast.success("Filtros aplicados.");
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <PageTitle
                    title="Relatório de Presenças"
                    tooltip="Consulte, filtre e exporte os registros de presença das atividades e turmas da organização."
                />

                <p className="-mt-2 mb-5 text-sm text-muted-foreground">
                    Consulte, filtre e exporte os registros de presença das atividades e
                    turmas da organização.
                </p>

                <section className="mb-5 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
                    <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
                        Filtros do relatório
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                                disabled={filtros.atividadeId === "TODOS" || turmas.length === 0}
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

                <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                <section className="rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
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

                        <RelatorioExportButtons
                            rows={resultado}
                            columns={colunasExport}
                            reportName="presencas"
                            dataGeracao={new Date().toLocaleDateString("pt-BR")}
                            indicadoresPdf={indicadoresPdf}
                            disabled={loading}
                            showPdf
                        />
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
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => void carregar()}
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        ) : total === 0 ? (
                            <div className="px-5 py-12 text-center">
                                <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />

                                <p className="text-sm text-muted-foreground">
                                    Nenhum registro de presença encontrado para os filtros
                                    selecionados.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Participante</TableHead>
                                        <TableHead className="text-xs">Atividade</TableHead>
                                        <TableHead className="text-xs">Turma</TableHead>
                                        <TableHead className="text-xs">Data</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Observações</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {resultado.map((registro) => (
                                        <TableRow key={registro.id}>
                                            <TableCell className="text-xs font-medium text-foreground">
                                                {registro.participanteNome}
                                            </TableCell>

                                            <TableCell className="text-xs">
                                                {registro.atividadeNome}
                                            </TableCell>

                                            <TableCell className="text-xs">
                                                {registro.turmaNome ?? "—"}
                                            </TableCell>

                                            <TableCell className="text-xs tabular-nums">
                                                {formatDataBR(registro.data)}
                                            </TableCell>

                                            <TableCell className="text-xs">
                                                <StatusBadge status={registro.status} />
                                            </TableCell>

                                            <TableCell className="text-xs text-muted-foreground">
                                                {registro.observacao ?? "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
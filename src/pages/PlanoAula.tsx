import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Calendar,
    ClipboardList,
    CheckCircle,
    FileSignature,
} from "lucide-react";

import { exportPlanoAulaPdf } from "@/lib/pdfExporters";
import { Card as UICard } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { StatusPill } from "@/components/StatusPill";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { isPlanoAccessDenied } from "@/lib/access";
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
    deletePlanoAula,
    getAtividadesPlanoAulaOptions,
    getColaboradoresPlanoAulaOptions,
    getPlanosAula,
    getTurmasPlanoAulaOptions,
    statusPlanoAulaValueToLabel,
    type AtividadeOption,
    type ColaboradorOption,
    type PlanoAula,
    type TurmaOption,
} from "@/data/planosAula";

type SortKey = "nomePlanoAula" | "atividade" | "turmas" | "colaborador" | "inicio" | "fim" | "status" | "conteudo";

function formatDateBR(value?: string | null) {
    if (!value) return "—";

    const date = value.length >= 10 ? value.slice(0, 10) : value;
    const [year, month, day] = date.split("-");

    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
}

export default function PlanosAula() {
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<PlanoAula[]>([]);
    const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
    const [turmas, setTurmas] = useState<TurmaOption[]>([]);
    const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

    useEffect(() => {
        void loadAll();
    }, []);

    async function loadAll() {
        try {
            setLoading(true);
            setAccessDeniedMessage(null);

            const [
                planosData,
                atividadesData,
                turmasData,
                colaboradoresData,
            ] = await Promise.all([
                getPlanosAula(),
                getAtividadesPlanoAulaOptions(),
                getTurmasPlanoAulaOptions(),
                getColaboradoresPlanoAulaOptions(),
            ]);

            setItems(planosData);
            setAtividades(atividadesData);
            setTurmas(turmasData);
            setColaboradores(colaboradoresData);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os planos de aula.";

            if (isPlanoAccessDenied(message)) {
                setAccessDeniedMessage(message);
                return;
            }

            console.error(error);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    const atividadeNome = (id?: string | null) => {
        if (!id) return "—";

        return (
            atividades.find((atividade) => String(atividade.id) === String(id))
                ?.nomeAtividade ?? `Atividade ${id}`
        );
    };

    const turmaNome = (id?: string | null, fallback?: string | null) => {
        if (!id) return fallback || "—";

        return (
            fallback ||
            turmas.find((turma) => String(turma.id) === String(id))?.nomeTurma ||
            `Turma ${id}`
        );
    };

    const planoTurmasNome = (plano: PlanoAula) => {
        const ids = plano.turmaIds?.length
            ? plano.turmaIds
            : plano.turmaId
                ? [plano.turmaId]
                : [];

        if (ids.length) {
            const nomes = ids.map((id, index) =>
                turmaNome(
                    id,
                    plano.turmaNomes?.[index] ||
                    plano.turmas?.find((turma) => String(turma.id) === String(id))
                        ?.nomeTurma,
                ),
            );

            return nomes.join(", ");
        }

        if (plano.turmaNomes?.length) {
            return plano.turmaNomes.join(", ");
        }

        return plano.turmaNome || "—";
    };

    const colaboradorNome = (id?: string | null) => {
        if (!id) return "—";

        return (
            colaboradores.find(
                (colaborador) => String(colaborador.id) === String(id),
            )?.nome ?? `Colaborador ${id}`
        );
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase().trim();

        if (!s) return items;

        return items.filter((plano) => {
            const atividade = atividadeNome(plano.atividadeId).toLowerCase();
            const turmasPlano = planoTurmasNome(plano).toLowerCase();
            const colaborador = colaboradorNome(plano.colaboradorId).toLowerCase();
            const status = statusPlanoAulaValueToLabel(
                plano.statusPlanoAula,
            ).toLowerCase();

            return [
                plano.nomePlanoAula,
                plano.conteudo,
                plano.observacao ?? "",
                atividade,
                turmasPlano,
                colaborador,
                status,
                formatDateBR(plano.dataInicio),
                formatDateBR(plano.dataFim),
            ]
                .join(" ")
                .toLowerCase()
                .includes(s);
        });
    }, [search, items, atividades, turmas, colaboradores]);


    const { sortConfig, sortedItems, handleSort } = useSortableData(
        filtered,
        (plano, key: SortKey) => {
            switch (key) {
                case "nomePlanoAula":
                    return plano.nomePlanoAula ?? "";
                case "atividade":
                    return atividadeNome(plano.atividadeId);
                case "turmas":
                    return planoTurmasNome(plano);
                case "colaborador":
                    return colaboradorNome(plano.colaboradorId);
                case "inicio":
                    return plano.dataInicio ?? "";
                case "fim":
                    return plano.dataFim ?? "";
                case "status":
                    return statusPlanoAulaValueToLabel(plano.statusPlanoAula);
                case "conteudo":
                    return plano.conteudo ?? "";
                default:
                    return "";
            }
        },
    );

    const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
        usePagination(sortedItems, 25, search);

    const handleDelete = async () => {
        if (!confirmDelete) return;

        try {
            setDeleting(true);

            await deletePlanoAula(Number(confirmDelete));

            setItems((prev) =>
                prev.filter((plano) => String(plano.id) !== String(confirmDelete)),
            );

            toast.success("Plano de aula excluído com sucesso.");
            setConfirmDelete(null);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível excluir o plano de aula.";

            if (isPlanoAccessDenied(message)) {
                setAccessDeniedMessage(message);
                setConfirmDelete(null);
                return;
            }

            console.error(error);
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    const handleFicha = async (id: string) => {
        const plano = items.find((item) => String(item.id) === String(id));

        if (!plano) {
            toast.error("Plano de aula não encontrado.");
            return;
        }

        try {
            await exportPlanoAulaPdf({
                id: plano.id,

                nomePlanoAula: plano.nomePlanoAula,

                atividade: atividadeNome(plano.atividadeId),
                turma: planoTurmasNome(plano),
                colaborador: colaboradorNome(plano.colaboradorId),

                dataInicio: plano.dataInicio,
                dataFim: plano.dataFim,

                aulaReposicao: plano.aulaReposicao,
                statusPlanoAula: plano.statusPlanoAula,

                conteudo: plano.conteudo,
                observacao: plano.observacao,
            });

            toast.success("Ficha do plano de aula gerada em PDF.");
        } catch (error) {
            console.error(error);
            toast.error("Não foi possível gerar a ficha do plano de aula.");
        }
    };

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
                <PageTitle
                    title="Plano de Aula"
                    tooltip="Organize os conteúdos, períodos e responsáveis pelas aulas, oficinas e atividades da organização."
                />

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total de planos"
                        value={items.length}
                        icon={ClipboardList}
                        color="text-primary"
                    />

                    <StatCard
                        title="Planejados"
                        value={
                            items.filter(
                                (plano) => plano.statusPlanoAula === "PLANEJADO",
                            ).length
                        }
                        icon={Calendar}
                        color="text-blue-500"
                    />

                    <StatCard
                        title="Concluídos"
                        value={
                            items.filter(
                                (plano) => plano.statusPlanoAula === "REALIZADO",
                            ).length
                        }
                        icon={CheckCircle}
                        color="text-green-500"
                    />

                    <StatCard
                        title="Reposições"
                        value={items.filter((plano) => plano.aulaReposicao).length}
                        icon={Plus}
                        color="text-orange-500"
                    />
                </div>

                <div className="rounded border border-border bg-card">
                    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="h-9 pl-9"
                            />
                        </div>

                        <Button asChild className="h-9 gap-2">
                            <Link to="/planos-aula/novo">
                                <Plus className="h-4 w-4" />
                                Novo plano de aula
                            </Link>
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Ações
                                    </th>

                                    <SortableHeader
                                        label="Plano de Aula"
                                        sortKey="nomePlanoAula"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    />

                                    <SortableHeader
                                        label="Atividade"
                                        sortKey="atividade"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    />

                                    <SortableHeader
                                        label="Turmas"
                                        sortKey="turmas"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    />

                                    <SortableHeader
                                        label="Colaborador"
                                        sortKey="colaborador"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    />

                                    <SortableHeader
                                        label="Início"
                                        sortKey="inicio"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    />

                                    <SortableHeader
                                        label="Fim"
                                        sortKey="fim"
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

                                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Documento
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-10 text-center text-sm text-muted-foreground"
                                        >
                                            Carregando...
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    paginated.map((plano) => {
                                        const atividade = atividadeNome(plano.atividadeId);
                                        const turmasPlano = planoTurmasNome(plano);
                                        const colaborador = colaboradorNome(plano.colaboradorId);
                                        const statusLabel = statusPlanoAulaValueToLabel(
                                            plano.statusPlanoAula,
                                        );

                                        return (
                                            <tr
                                                key={plano.id}
                                                className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                                            >
                                                <td className="whitespace-nowrap px-6 py-2.5">
                                                    <div className="flex gap-1">
                                                        <TableActionIcon
                                                            icon={Eye}
                                                            label="Visualizar"
                                                            to={`/planos-aula/${plano.id}`}
                                                        />

                                                        <TableActionIcon
                                                            icon={Pencil}
                                                            label="Editar"
                                                            to={`/planos-aula/${plano.id}/editar`}
                                                        />

                                                        <TableActionIcon
                                                            icon={Trash2}
                                                            label="Excluir"
                                                            variant="danger"
                                                            onClick={() => setConfirmDelete(plano.id)}
                                                        />
                                                    </div>
                                                </td>

                                                <td className="px-6 py-2.5">
                                                    <TableCellText text={plano.nomePlanoAula || "—"}>
                                                        {plano.nomePlanoAula || "—"}
                                                    </TableCellText>
                                                </td>

                                                <td className="px-6 py-2.5">
                                                    <TableCellText text={atividade}>
                                                        {atividade}
                                                    </TableCellText>
                                                </td>

                                                <td className="px-6 py-2.5">
                                                    <TableCellText text={turmasPlano}>{turmasPlano}</TableCellText>
                                                </td>

                                                <td className="px-6 py-2.5">
                                                    <TableCellText text={colaborador}>
                                                        {colaborador}
                                                    </TableCellText>
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                                                    {formatDateBR(plano.dataInicio)}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                                                    {formatDateBR(plano.dataFim)}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-2.5">
                                                    <StatusPill status={statusLabel as any} />
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-2.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFicha(plano.id)}
                                                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                                                    >
                                                        <FileSignature className="h-3.5 w-3.5" />
                                                        Gerar ficha
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                {!loading && paginated.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-10 text-center text-sm text-muted-foreground"
                                        >
                                            Nenhum plano de aula encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TablePagination
                        totalItems={sortedItems.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            </div>

            <AlertDialog
                open={!!confirmDelete}
                onOpenChange={(open) => {
                    if (!open) setConfirmDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir plano de aula?</AlertDialogTitle>

                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            Cancelar
                        </AlertDialogCancel>

                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Excluindo..." : "Sim, excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WikiFloatingButton
                pageTitle="Plano de Aula"
                href="https://www.aurit.com.br/wiki/execucao/plano-aula"
            />
        </AppLayout>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    color,
}: {
    title: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    color: string;
}) {
    return (
        <UICard className="flex items-center gap-4 p-4">
            <div className={`rounded-full bg-muted p-2 ${color}`}>
                <Icon className="h-5 w-5" />
            </div>

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </p>

                <p className="text-2xl font-bold">{value}</p>
            </div>
        </UICard>
    );
}
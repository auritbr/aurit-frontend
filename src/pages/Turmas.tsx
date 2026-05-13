import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { NextStepCard } from "@/components/NextStepCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteTurma,
  diaLabel,
  getAtividadesOptions,
  getColaboradoresOptions,
  getTurmas,
  statusTurmaLabel,
  type Turma,
} from "@/data/turmas";
import { exportTurmaPdf } from "@/lib/pdfExporters";
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

const NEXT_STEP_DURATION_MS = 60_000;

interface TurmaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const turmaNextStepCard: TurmaNextStepCardData = {
  titulo: "Após organizar as turmas, registre as presenças dos participantes",
  descricao:
    "As presenças ajudam a acompanhar a participação nas atividades e turmas, comprovar encontros realizados e manter um histórico confiável para relatórios, evidências e prestações de contas.",
  acaoLabel: "Cadastrar presenças",
  acaoUrl: "/presencas",
  acaoSecundariaLabel: "Ver turmas",
  acaoSecundariaUrl: "/turmas",
  variante: "pendente",
};

function normalizeTime(value?: string): string {
  if (!value) return "—";

  return value.length >= 5 ? value.slice(0, 5) : value;
}

export default function Turmas() {
  const navigate = useNavigate();
  const location = useLocation();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Turma[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [nextStepCard, setNextStepCard] =
    useState<TurmaNextStepCardData | null>(null);
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
    const state = location.state as { showNextStepCard?: boolean } | null;

    if (state?.showNextStepCard) {
      setNextStepCard(turmaNextStepCard);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!nextStepCard) return;

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nextStepCard]);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("TURMAS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

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

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [turmasData, atividadesData, colaboradoresData] =
        await Promise.all([
          getTurmas(),
          getAtividadesOptions(),
          getColaboradoresOptions(),
        ]);

      const atividadesMap = new Map(
        atividadesData.map((atividade) => [
          String(atividade.id),
          atividade.nome,
        ]),
      );

      const colaboradoresMap = new Map(
        colaboradoresData.map((colaborador) => [
          String(colaborador.id),
          colaborador.nome,
        ]),
      );

      const mapped: Turma[] = turmasData.map((turma) => ({
        ...turma,
        horarioInicio: normalizeTime(turma.horarioInicio),
        horarioFim: normalizeTime(turma.horarioFim),
        atividadeNome:
          turma.atividadeNome ||
          (turma.atividadeId
            ? atividadesMap.get(String(turma.atividadeId)) ?? "—"
            : "—"),
        colaboradoresNomes:
          turma.colaboradoresNomes.length > 0
            ? turma.colaboradoresNomes
            : turma.colaboradoresIds.map(
                (idColaborador) =>
                  colaboradoresMap.get(String(idColaborador)) ??
                  `Colaborador ${idColaborador}`,
              ),
      }));

      setItems(mapped);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as turmas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((turma) =>
      [
        turma.nomeTurma,
        turma.descricaoTurma,
        turma.atividadeNome,
        diaLabel(turma.diaAtividade),
        statusTurmaLabel(turma.status),
        String(turma.quantidadeVagas ?? ""),
        turma.horarioInicio,
        turma.horarioFim,
        turma.colaboradoresNomes.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, items]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, search);

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir turmas.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteTurma(Number(confirmDelete));

      setItems((prev) => prev.filter((turma) => turma.id !== confirmDelete));
      toast.success("Turma excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a turma.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  const handleExport = async (turma: Turma) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportTurmaPdf({
      ...turma,
      horarioInicio: normalizeTime(turma.horarioInicio),
      horarioFim: normalizeTime(turma.horarioFim),
      diaAtividade: diaLabel(turma.diaAtividade),
      status: statusTurmaLabel(turma.status),
    } as any);
  };
  
  if (!podeVisualizar) {
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
        <PageTitle
          title="Turmas"
          tooltip="Cadastre turmas vinculadas às atividades do projeto. Use esta página para organizar grupos por horário, dia, faixa etária, nível, território ou responsável, facilitando o acompanhamento de participantes, presenças e execução das ações."
        />

        {nextStepCard && (
          <NextStepCard
            titulo={nextStepCard.titulo}
            descricao={nextStepCard.descricao}
            acaoLabel={nextStepCard.acaoLabel}
            acaoUrl={nextStepCard.acaoUrl}
            acaoSecundariaLabel={nextStepCard.acaoSecundariaLabel}
            acaoSecundariaUrl={nextStepCard.acaoSecundariaUrl}
            variante={nextStepCard.variante ?? "pendente"}
            onDismiss={() => setNextStepCard(null)}
          />
        )}

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar turma"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/turmas/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Turma
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome da turma
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Atividade
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Dia da atividade
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Horário de início
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Horário de término
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vagas
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Colaboradores
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((turma) => {
                  const colabsTxt = turma.colaboradoresNomes.join(", ");

                  return (
                    <tr
                      key={turma.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/turmas/${turma.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/turmas/${turma.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(turma.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={turma.nomeTurma} bold>
                          {turma.nomeTurma}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={turma.atividadeNome ?? "—"}>
                          {turma.atividadeNome ?? "—"}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={diaLabel(turma.diaAtividade)}>
                          {diaLabel(turma.diaAtividade)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={turma.horarioInicio}>
                          {turma.horarioInicio}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={turma.horarioFim}>
                          {turma.horarioFim}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {turma.quantidadeVagas ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusPill
                          status={statusTurmaLabel(turma.status) as any}
                        />
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        {colabsTxt ? (
                          <TableCellText text={colabsTxt} muted>
                            {colabsTxt}
                          </TableCellText>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExport(turma)}
                            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Gerar ficha
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeGerarPdf ? 10 : 9}
                      className="px-5 py-16 text-center"
                    >
                      <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma turma encontrada.
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
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma turma encontrada.
                </p>
              </div>
            ) : (
              paginated.map((turma) => (
                <div key={turma.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/turmas/${turma.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/turmas/${turma.id}/editar`)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(turma.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExport(turma)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {turma.nomeTurma}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {turma.atividadeNome ?? "—"}
                  </p>

                  <p className="mt-2 text-sm text-foreground">
                    {diaLabel(turma.diaAtividade)} • {turma.horarioInicio} –{" "}
                    {turma.horarioFim}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill
                      status={statusTurmaLabel(turma.status) as any}
                    />

                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      • {turma.quantidadeVagas ?? "Sem vagas informadas"} vagas
                    </span>

                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      •{" "}
                      {turma.colaboradoresNomes.join(", ") ||
                        "Sem colaboradores"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <TablePagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onCopy={handleCopy}
          />
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso a turma esteja vinculada a
              participantes, presenças ou outros registros, o backend pode
              impedir a exclusão para preservar o histórico.
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

      <WikiFloatingButton pageTitle="Turmas" />
    </AppLayout>
  );
}
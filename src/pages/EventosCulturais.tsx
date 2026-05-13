import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarRange,
  FileDown,
} from "lucide-react";

import { exportEventoCulturalPdf } from "@/lib/pdfExporters";
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
  deleteEventoCultural,
  enrichEventoCultural,
  formatPeriodo,
  getColaboradoresOptions,
  getEventosCulturais,
  getProjetosOptions,
  statusValueToLabel,
  tipoEventoLabel,
  type ColaboradorOption,
  type EventoCulturalView,
  type ProjetoOption,
} from "@/data/eventosCulturais";
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

const EVENTO_CULTURAL_NEXT_STEP_KEY = "aurit:eventos-culturais:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface EventoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function EventosCulturais() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<EventoCulturalView[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<EventoNextStepCardData | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo(
          "EVENTOS_CULTURAIS",
        );

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
    const raw = sessionStorage.getItem(EVENTO_CULTURAL_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as EventoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EVENTO_CULTURAL_NEXT_STEP_KEY);

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
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

      const [eventosData, projetosData, colaboradoresData] = await Promise.all([
        getEventosCulturais(),
        getProjetosOptions(),
        getColaboradoresOptions(),
      ]);

      setProjetos(projetosData);
      setColaboradores(colaboradoresData);

      setItems(
        eventosData.map((evento) =>
          enrichEventoCultural(evento, projetosData, colaboradoresData),
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar eventos culturais.";

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

    return items.filter((evento) => {
      const texto = [
        evento.nomeEvento,
        evento.descricaoEvento,
        evento.objetivoEvento,
        evento.localEvento,
        evento.produtoGerado,
        evento.resultadoEsperado,
        evento.acoesAcessibilidade,
        evento.projetoNome,
        tipoEventoLabel(evento.tipoEvento),
        statusValueToLabel(evento.status),
        evento.colaboradoresNomes.join(" "),
        formatPeriodo(evento.dataEvento, evento.dataFim),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(term);
    });
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

  async function handleDelete() {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir eventos culturais.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEventoCultural(Number(confirmDelete));

      setItems((prev) => prev.filter((evento) => evento.id !== confirmDelete));
      toast.success("Evento cultural excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir evento cultural.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  function handleExportPdf(evento: EventoCulturalView) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    exportEventoCulturalPdf({
      id: evento.id,
      nomeEvento: evento.nomeEvento,
      descricaoEvento: evento.descricaoEvento,
      objetivoEvento: evento.objetivoEvento,
      localEvento: evento.localEvento,
      acoesAcessibilidade: evento.acoesAcessibilidade,
      resultadoEsperado: evento.resultadoEsperado,
      produtoGerado: evento.produtoGerado,
      dataEvento: evento.dataEvento,
      dataFim: evento.dataFim,
      tipoEvento: tipoEventoLabel(evento.tipoEvento),
      status: statusValueToLabel(evento.status),
      projeto: evento.projetoNome,
      colaboradores: evento.colaboradoresNomes,
    } as any);
  }

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
          title="Eventos Culturais"
          tooltip="Cadastre eventos culturais vinculados ao projeto, como apresentações, mostras, festivais, exposições, encontros ou ações públicas. Informe objetivo, local, período, acessibilidade, resultados esperados e produtos gerados para organizar a execução, gerar evidências e apoiar relatórios e prestações de contas."
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
                aria-label="Buscar evento cultural"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/eventos-culturais/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Evento
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome do evento
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de evento
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Período
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Projeto
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
                {paginated.map((evento) => {
                  const colaboradoresTexto =
                    evento.colaboradoresNomes.join(", ");
                  const tipoTexto = tipoEventoLabel(evento.tipoEvento);
                  const periodo = formatPeriodo(
                    evento.dataEvento,
                    evento.dataFim,
                  );

                  return (
                    <tr
                      key={evento.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() =>
                              navigate(`/eventos-culturais/${evento.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/eventos-culturais/${evento.id}/editar`,
                                )
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(evento.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={evento.nomeEvento} bold>
                          {evento.nomeEvento}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={tipoTexto}>
                          {tipoTexto}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {periodo}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusPill status={statusValueToLabel(evento.status)} />
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={evento.projetoNome}>
                          {evento.projetoNome}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        {colaboradoresTexto ? (
                          <TableCellText text={colaboradoresTexto} muted>
                            {colaboradoresTexto}
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
                            onClick={() => handleExportPdf(evento)}
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
                  <EmptyRow colSpan={podeGerarPdf ? 8 : 7} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarRange className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum evento cultural encontrado.
                </p>
              </div>
            ) : (
              paginated.map((evento) => (
                <div key={evento.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() =>
                          navigate(`/eventos-culturais/${evento.id}`)
                        }
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(
                              `/eventos-culturais/${evento.id}/editar`,
                            )
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(evento.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPdf(evento)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {evento.nomeEvento}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tipoEventoLabel(evento.tipoEvento)} ·{" "}
                    {formatPeriodo(evento.dataEvento, evento.dataFim)}
                  </p>

                  <p className="mt-2 text-sm text-foreground">
                    {evento.projetoNome}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={statusValueToLabel(evento.status)} />

                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      •{" "}
                      {evento.colaboradoresNomes.join(", ") ||
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
            <AlertDialogTitle>Excluir evento cultural?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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

      <WikiFloatingButton pageTitle="Eventos Culturais" />
    </AppLayout>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <CalendarRange className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum evento cultural encontrado.
        </p>
      </td>
    </tr>
  );
}
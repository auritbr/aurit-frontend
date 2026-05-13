import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ClipboardCheck,
  Paperclip,
  Wallet,
  Eye,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpTooltip } from "@/components/HelpTooltip";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportPrestacaoContasPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  getPrestacoesContas,
  deletePrestacaoContas,
  getPropostasEditalOptions,
  getPlanejamentosFinanceirosOptions,
  statusPrestacaoContasLabel,
  statusPrestacaoContasTone,
  formatDateBr,
  type PrestacaoContas,
  type PropostaEditalOption,
  type PlanejamentoFinanceiroOption,
} from "@/data/prestacaoContas";
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

const PRESTACAO_CONTAS_NEXT_STEP_KEY =
  "aurit:prestacao-contas:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PrestacaoContasNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))] border-[hsl(var(--status-pending-fg)/0.3)]",
  success:
    "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))] border-[hsl(var(--status-active-fg)/0.3)]",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

function StatusBadge({ value }: { value: string }) {
  const tone = statusPrestacaoContasTone(value);

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        toneClass[tone] ?? toneClass.neutral
      }`}
    >
      {statusPrestacaoContasLabel(value)}
    </span>
  );
}

export default function PrestacaoContasPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PrestacaoContas[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [planejamentos, setPlanejamentos] = useState<
    PlanejamentoFinanceiroOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PrestacaoContasNextStepCardData | null>(null);
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

        const data =
          await getPermissoesUsuarioLogadoPorModulo("PRESTACAO_CONTAS");

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
    const raw = sessionStorage.getItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PrestacaoContasNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);

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

      const [prestacoesData, propostasData, planejamentosData] =
        await Promise.all([
          getPrestacoesContas(),
          getPropostasEditalOptions(),
          getPlanejamentosFinanceirosOptions(),
        ]);

      setItems(prestacoesData);
      setPropostas(propostasData);
      setPlanejamentos(planejamentosData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar prestações de contas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaEditalNome = (id?: string) =>
    id
      ? propostas.find((item) => String(item.id) === String(id))?.nome ?? "—"
      : "—";

  const planejamentoFinanceiroNome = (id?: string) =>
    id
      ? planejamentos.find((item) => String(item.id) === String(id))?.nome ??
        `#${id}`
      : "—";

  const planejamentosFinanceirosNomes = (ids?: string[]) => {
    if (!ids || ids.length === 0) return "—";

    return ids.map((id) => planejamentoFinanceiroNome(id)).join(", ");
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((item) => {
      const proposta = propostaEditalNome(item.propostaEdital).toLowerCase();
      const planejamentosTexto = planejamentosFinanceirosNomes(
        item.planejamentosFinanceiros,
      ).toLowerCase();

      return (
        proposta.includes(s) ||
        planejamentosTexto.includes(s) ||
        statusPrestacaoContasLabel(item.statusPrestacaoContas)
          .toLowerCase()
          .includes(s) ||
        formatDateBr(item.periodoInicio).toLowerCase().includes(s) ||
        formatDateBr(item.periodoFim).toLowerCase().includes(s) ||
        formatDateBr(item.dataEnvio).toLowerCase().includes(s) ||
        formatDateBr(item.dataAprovacao).toLowerCase().includes(s) ||
        (item.observacoesGerais ?? "").toLowerCase().includes(s) ||
        (item.parecerInterno ?? "").toLowerCase().includes(s) ||
        (item.parecerExterno ?? "").toLowerCase().includes(s)
      );
    });
  }, [search, items, propostas, planejamentos]);

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
      toast.error("Você não possui permissão para excluir prestação de contas.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePrestacaoContas(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Prestação de contas removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover prestação de contas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  async function handleExportPdf(item: PrestacaoContas) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const proposta = propostaEditalNome(item.propostaEdital);

    const planejamentosPdf =
      item.planejamentosFinanceiros?.length > 0
        ? item.planejamentosFinanceiros.map((id) =>
            planejamentoFinanceiroNome(id),
          )
        : [];

    const status = statusPrestacaoContasLabel(item.statusPrestacaoContas);

    await exportPrestacaoContasPdf({
      id: item.id,
      propostaEdital: proposta,
      planejamentosFinanceiros: planejamentosPdf,
      periodoInicio: item.periodoInicio,
      periodoFim: item.periodoFim,
      dataEnvio: item.dataEnvio,
      dataAprovacao: item.dataAprovacao,
      statusPrestacaoContas: status,
      parecerInterno: item.parecerInterno,
      parecerExterno: item.parecerExterno,
      observacoesGerais: item.observacoesGerais,
    });
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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Prestação de Contas
              </h1>

              <HelpTooltip
                text="Organize o acompanhamento da prestação de contas do projeto, registrando período, datas de envio e aprovação, pareceres, observações e vínculos com proposta e planejamento financeiro. Esta página ajuda a controlar a situação da prestação e manter o histórico do processo atualizado."
                label="Prestação de Contas"
                size="md"
                side="bottom"
                align="start"
              />
            </div>
          </div>
        </div>

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

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Use esta página para acompanhar o processo de prestação de contas do
          projeto. Registre períodos, datas importantes, pareceres, observações
          e mantenha o status atualizado para facilitar conferências,
          comprovações e histórico do processo.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar prestação de contas"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/prestacao-contas/novo")}
                className="h-9 gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Prestação
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Ações",
                    "Proposta de edital",
                    "Planejamentos financeiros",
                    "Período inicial",
                    "Período final",
                    "Data de envio",
                    "Data de aprovação",
                    "Status da prestação",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy={header === "Ações" ? true : undefined}
                    >
                      {header}
                    </th>
                  ))}

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
                {paginated.map((item) => {
                  const proposta = propostaEditalNome(item.propostaEdital);
                  const planejamentosTexto = planejamentosFinanceirosNomes(
                    item.planejamentosFinanceiros,
                  );

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() =>
                              navigate(`/prestacao-contas/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/prestacao-contas/${item.id}/editar`,
                                )
                              }
                            />
                          )}

                          <TableActionIcon
                            icon={ClipboardCheck}
                            label="Ver metas prestadas"
                            onClick={() => navigate("/prestacao-metas")}
                          />

                          <TableActionIcon
                            icon={Paperclip}
                            label="Ver evidências"
                            onClick={() => navigate("/evidencias")}
                          />

                          <TableActionIcon
                            icon={Wallet}
                            label="Ver planejamento financeiro"
                            onClick={() =>
                              navigate("/planejamento-financeiro")
                            }
                          />

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(item.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={proposta} bold>
                          {proposta}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={planejamentosTexto} muted>
                          {planejamentosTexto}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.periodoInicio)}
                          muted
                        >
                          {formatDateBr(item.periodoInicio)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.periodoFim)}
                          muted
                        >
                          {formatDateBr(item.periodoFim)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.dataEnvio)}
                          muted
                        >
                          {formatDateBr(item.dataEnvio)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.dataAprovacao)}
                          muted
                        >
                          {formatDateBr(item.dataAprovacao)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusBadge value={item.statusPrestacaoContas} />
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(item)}
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
                      colSpan={podeGerarPdf ? 9 : 8}
                      className="px-5 py-16 text-center"
                    >
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma prestação de contas cadastrada.
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
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma prestação encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/prestacao-contas/${item.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/prestacao-contas/${item.id}/editar`)
                          }
                        />
                      )}

                      <TableActionIcon
                        icon={ClipboardCheck}
                        label="Ver metas"
                        onClick={() => navigate("/prestacao-metas")}
                      />

                      <TableActionIcon
                        icon={Paperclip}
                        label="Ver evidências"
                        onClick={() => navigate("/evidencias")}
                      />

                      <TableActionIcon
                        icon={Wallet}
                        label="Ver planejamento"
                        onClick={() => navigate("/planejamento-financeiro")}
                      />

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(item.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(item)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {propostaEditalNome(item.propostaEdital)}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {planejamentosFinanceirosNomes(
                      item.planejamentosFinanceiros,
                    )}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge value={item.statusPrestacaoContas} />

                    <span className="text-xs text-muted-foreground">
                      Período:{" "}
                      <span className="text-foreground">
                        {formatDateBr(item.periodoInicio)} →{" "}
                        {formatDateBr(item.periodoFim)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      Envio:{" "}
                      <span className="text-foreground">
                        {formatDateBr(item.dataEnvio)}
                      </span>
                    </span>

                    <span>
                      Aprovação:{" "}
                      <span className="text-foreground">
                        {formatDateBr(item.dataAprovacao)}
                      </span>
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
            <AlertDialogTitle>Remover prestação de contas?</AlertDialogTitle>

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
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton pageTitle="Prestação de Contas" />
    </AppLayout>
  );
}
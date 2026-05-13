import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  ShieldCheck,
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
import { exportPrestacaoMetasPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  getPrestacaoMetas,
  deletePrestacaoMeta,
  getPrestacoesContasOptions,
  getMetasProjetoOptions,
  statusCumprimentoLabel,
  statusCumprimentoTone,
  formatQuantidadeExecutada,
  getEvidenciasExecucaoOptions,
  type EvidenciaOption,
  type PrestacaoMeta,
  type PrestacaoContasOption,
  type MetaProjetoOption,
} from "@/data/prestacaoMetas";
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

const PRESTACAO_META_NEXT_STEP_KEY = "aurit:prestacao-metas:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PrestacaoMetaNextStepCardData {
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
  const tone = statusCumprimentoTone(value);

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        toneClass[tone] ?? toneClass.neutral
      }`}
    >
      {statusCumprimentoLabel(value)}
    </span>
  );
}

export default function PrestacaoMetasPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PrestacaoMeta[]>([]);
  const [prestacoes, setPrestacoes] = useState<PrestacaoContasOption[]>([]);
  const [metas, setMetas] = useState<MetaProjetoOption[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PrestacaoMetaNextStepCardData | null>(null);
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
          await getPermissoesUsuarioLogadoPorModulo("PRESTACAO_METAS");

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
    const raw = sessionStorage.getItem(PRESTACAO_META_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PrestacaoMetaNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PRESTACAO_META_NEXT_STEP_KEY);

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

      const [prestacaoMetasData, prestacoesData, metasData, evidenciasData] =
        await Promise.all([
          getPrestacaoMetas(),
          getPrestacoesContasOptions(),
          getMetasProjetoOptions(),
          getEvidenciasExecucaoOptions(),
        ]);

      setItems(prestacaoMetasData);
      setPrestacoes(prestacoesData);
      setMetas(metasData);
      setEvidencias(evidenciasData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar cumprimentos de metas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const prestacaoContasNome = (id?: string) =>
    id ? prestacoes.find((p) => p.id === id)?.label ?? "—" : "—";

  const metaProjetoNome = (id?: string) =>
    id ? metas.find((m) => m.id === id)?.tituloMeta ?? "—" : "—";

  const evidenciaNome = (id?: string) =>
    id
      ? evidencias.find((e) => String(e.id) === String(id))?.tituloEvidencia ??
        `Evidência vinculada #${id}`
      : "—";

  const evidenciasNomes = (ids?: string[]) => {
    if (!ids || ids.length === 0) return "—";

    return ids.map((id) => evidenciaNome(id)).join(", ");
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((m) => {
      const prestacao = prestacaoContasNome(m.prestacaoContas).toLowerCase();
      const meta = metaProjetoNome(m.metaProjeto).toLowerCase();
      const evidenciasTexto = evidenciasNomes(m.evidencias).toLowerCase();

      return (
        prestacao.includes(s) ||
        meta.includes(s) ||
        evidenciasTexto.includes(s) ||
        statusCumprimentoLabel(m.statusCumprimentoMeta)
          .toLowerCase()
          .includes(s) ||
        formatQuantidadeExecutada(m.quantidadeExecutada)
          .toLowerCase()
          .includes(s) ||
        (m.observacaoCumprimento ?? "").toLowerCase().includes(s) ||
        (m.justificativaNaoCumprimentoIntegral ?? "")
          .toLowerCase()
          .includes(s)
      );
    });
  }, [search, items, prestacoes, metas, evidencias]);

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
      toast.error("Você não possui permissão para excluir cumprimento de metas.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePrestacaoMeta(Number(confirmDelete));

      setItems((prev) => prev.filter((m) => m.id !== confirmDelete));
      toast.success("Cumprimento de metas removido com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover cumprimento de metas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  async function handleExportPdf(m: PrestacaoMeta) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const prestacao = prestacaoContasNome(m.prestacaoContas);
    const meta = metaProjetoNome(m.metaProjeto);
    const quantidadeExecutada = formatQuantidadeExecutada(m.quantidadeExecutada);
    const status = statusCumprimentoLabel(m.statusCumprimentoMeta);

    const evidenciasPdf =
      m.evidencias?.length > 0
        ? m.evidencias.map((id) => evidenciaNome(id))
        : [];

    await exportPrestacaoMetasPdf({
      id: m.id,
      prestacaoContas: prestacao,
      metaProjeto: meta,
      quantidadeExecutada,
      observacaoCumprimento: m.observacaoCumprimento,
      statusCumprimentoMeta: status,
      evidencias: evidenciasPdf,
    });
  }

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando cumprimento de metas...
          </p>
        </div>
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
        <div className="mb-5 rounded-lg border border-border bg-secondary/40 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                Prestação de Contas
              </span>

              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Cumprimento de Metas
                </h1>

                <HelpTooltip
                  text="Acompanhe o cumprimento das metas previstas no projeto, comparando o que foi planejado com o que foi executado. Informe a quantidade realizada, o status de cumprimento, observações e evidências que comprovem a execução."
                  label="Cumprimento de metas"
                  size="md"
                  side="bottom"
                  align="start"
                />
              </div>
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
          Use esta página{" "}
          <span className="font-semibold">
            apenas quando o projeto estiver vinculado a metas formais
          </span>
          , geralmente em casos de{" "}
          <span className="font-semibold">edital</span>, convênio, termo de
          fomento ou parceria. Aqui você compara a meta prevista com o que foi
          executado, informa o resultado alcançado e vincula evidências que
          comprovem a execução.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar cumprimento de metas"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/prestacao-metas/novo")}
                className="h-9 gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Cumprimento
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Ações",
                    "Prestação de contas",
                    "Meta do projeto",
                    "Quantidade executada",
                    "Status de cumprimento",
                    "Evidências",
                    "Observação",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy={h === "Ações" ? true : undefined}
                    >
                      {h}
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
                {paginated.map((m) => {
                  const prestacao = prestacaoContasNome(m.prestacaoContas);
                  const meta = metaProjetoNome(m.metaProjeto);
                  const qtd = formatQuantidadeExecutada(m.quantidadeExecutada);
                  const obs = m.observacaoCumprimento?.trim() || "—";
                  const evidCount = m.evidencias?.length ?? 0;
                  const evidLabel =
                    evidCount === 0
                      ? "—"
                      : `${evidCount} ${
                          evidCount === 1 ? "evidência" : "evidências"
                        }`;

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/prestacao-metas/${m.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/prestacao-metas/${m.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(m.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={prestacao} bold>
                          {prestacao}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={meta} muted>
                          {meta}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={qtd} bold>
                          {qtd}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusBadge value={m.statusCumprimentoMeta} />
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={evidLabel} muted>
                          {evidLabel}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={obs} muted>
                          {obs}
                        </TableCellText>
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(m)}
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
                      colSpan={podeGerarPdf ? 8 : 7}
                      className="px-5 py-16 text-center"
                    >
                      <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum cumprimento de metas cadastrado.
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
                <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum cumprimento encontrado.
                </p>
              </div>
            ) : (
              paginated.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/prestacao-metas/${m.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/prestacao-metas/${m.id}/editar`)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(m.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(m)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {metaProjetoNome(m.metaProjeto)}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {prestacaoContasNome(m.prestacaoContas)}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge value={m.statusCumprimentoMeta} />

                    <span className="text-xs text-muted-foreground">
                      Executado:{" "}
                      <span className="font-medium text-foreground">
                        {formatQuantidadeExecutada(m.quantidadeExecutada)}
                      </span>
                    </span>
                  </div>

                  {m.evidencias.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {m.evidencias.length}{" "}
                      {m.evidencias.length === 1 ? "evidência" : "evidências"}{" "}
                      vinculada{m.evidencias.length === 1 ? "" : "s"}
                    </p>
                  )}

                  {m.observacaoCumprimento && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {m.observacaoCumprimento}
                    </p>
                  )}
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cumprimento de metas?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Cumprimento de Metas" />
    </AppLayout>
  );
}
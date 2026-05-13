import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Download,
  AlertTriangle,
  Eye,
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
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
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
import {
  getDocumentos,
  deleteDocumento,
  isDocumentoVencido,
  statusDocumentoLabels,
  statusDocumentoTone,
  tipoDocumentoLabels,
  getOrganizacoesDocumento,
  getDocumentoDownloadUrl,
  formatDateBR,
  type Documento,
  type OrganizacaoOption,
} from "@/data/documentos";
import { toast } from "sonner";

const DOCUMENTO_NEXT_STEP_KEY = "aurit:documentos:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface DocumentoNextStepCardData {
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
  danger:
    "bg-red-100 text-red-800 border-red-300 shadow-[0_0_0_1px_hsl(0_72%_51%_/_0.05)]",
};

const expiredRowClass =
  "border-l-[6px] border-l-red-600 bg-red-100/80 hover:bg-red-100";

const expiredDateClass =
  "inline-flex rounded-md border border-red-300 bg-red-200/80 px-2 py-0.5 text-xs font-bold text-red-900 shadow-sm";

const expiredMobileCardClass =
  "border-l-[6px] border-l-red-600 bg-red-100/80";

function StatusBadge({ doc }: { doc: Documento }) {
  const vencido =
    doc.statusDocumento !== "NAO_SE_APLICA" && isDocumentoVencido(doc);

  const label = vencido
    ? "Vencido"
    : statusDocumentoLabels[doc.statusDocumento] ?? doc.statusDocumento;

  const tone = vencido ? "danger" : statusDocumentoTone(doc.statusDocumento);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${toneClass[tone] ?? toneClass.neutral
        }`}
    >
      {label}
    </span>
  );
}

export default function DocumentosPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Documento[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<DocumentoNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("DOCUMENTOS");

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
    const raw = sessionStorage.getItem(DOCUMENTO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DocumentoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(DOCUMENTO_NEXT_STEP_KEY);

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

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [documentosData, organizacoesData] = await Promise.all([
        getDocumentos(),
        getOrganizacoesDocumento(),
      ]);

      setItems(documentosData);
      setOrganizacoes(organizacoesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar documentos.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const getOrganizacaoNome = (organizacaoId: number | null) => {
    if (!organizacaoId) return "—";

    const organizacao = organizacoes.find((item) => item.id === organizacaoId);

    return organizacao?.nome ?? "—";
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((documento) => {
      const tipo =
        tipoDocumentoLabels[documento.tipoDocumento] ??
        documento.tipoDocumento;

      const organizacao = getOrganizacaoNome(documento.organizacaoId);

      const status =
        statusDocumentoLabels[documento.statusDocumento] ??
        documento.statusDocumento;

      return [
        tipo,
        organizacao,
        documento.orgaoEmissor ?? "",
        formatDateBR(documento.dataEmissao),
        formatDateBR(documento.dataValidade),
        status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, items, organizacoes]);

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

  const handleAbrirArquivo = async (documento: Documento) => {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para abrir documentos.");
      return;
    }

    if (!documento.urlDocumento) {
      toast.info("Nenhum arquivo disponível para este documento.");
      return;
    }

    try {
      const urlTemporaria = await getDocumentoDownloadUrl(documento.id);
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir documento.",
      );
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para remover documentos.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteDocumento(confirmDelete);

      setItems((prev) =>
        prev.filter((documento) => documento.id !== confirmDelete),
      );
      window.dispatchEvent(new Event("documentos:changed"));

      toast.success("Documento removido com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover documento.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  const vencidosCount = items.filter(
    (documento) =>
      documento.statusDocumento !== "NAO_SE_APLICA" &&
      isDocumentoVencido(documento),
  ).length;

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando documentos...
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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Documentos
              </h1>

              <HelpTooltip
                text="Cadastre e acompanhe os documentos da organização, controlando arquivos, datas de emissão, prazos de validade e situação atual de cada documento."
                label="Documentos"
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
          Cadastre os documentos da organização e acompanhe sua situação.
          Documentos vencidos, pendentes ou que precisam de revisão podem
          comprometer inscrições em editais, habilitações e prestações de contas.
        </div>

        {vencidosCount > 0 && (
          <div className="mb-5 flex items-start gap-2.5 rounded border border-red-300/80 bg-red-50/80 px-4 py-3 text-[13px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />

            <div>
              <p className="font-semibold text-red-800">
                {vencidosCount} documento{vencidosCount > 1 ? "s" : ""} vencido
                {vencidosCount > 1 ? "s" : ""}
              </p>

              <p className="mt-0.5 text-red-900/75">
                Atualize os documentos da organização para evitar pendências em
                editais e prestação de contas.
              </p>
            </div>
          </div>
        )}

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar documento"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/documentos/novo")}
                className="h-9 gap-2 self-start"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Documento
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
                    Tipo de Documento
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organização
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Órgão Emissor
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data de Emissão
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data de Validade
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  {podeBaixar && (
                    <th
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Arquivo
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((documento) => {
                  const vencido =
                    documento.statusDocumento !== "NAO_SE_APLICA" &&
                    isDocumentoVencido(documento);

                  const tipo =
                    tipoDocumentoLabels[documento.tipoDocumento] ??
                    documento.tipoDocumento;

                  const organizacaoNome = getOrganizacaoNome(
                    documento.organizacaoId,
                  );

                  return (
                    <tr
                      key={documento.id}
                      className={`border-b border-border/70 transition-colors last:border-0 ${vencido ? expiredRowClass : "hover:bg-muted/30"
                        }`}
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() =>
                              navigate(`/documentos/${documento.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/documentos/${documento.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(documento.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={tipo} bold>
                          {tipo}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText
                          text={organizacaoNome}
                          muted={organizacaoNome === "—"}
                        >
                          {organizacaoNome}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText
                          text={documento.orgaoEmissor || "—"}
                          muted={!documento.orgaoEmissor}
                        >
                          {documento.orgaoEmissor || "—"}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBR(documento.dataEmissao)}
                          muted={!documento.dataEmissao}
                        >
                          {formatDateBR(documento.dataEmissao)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        {vencido ? (
                          <span className={expiredDateClass}>
                            {formatDateBR(documento.dataValidade)}
                          </span>
                        ) : (
                          <TableCellText
                            text={formatDateBR(documento.dataValidade)}
                            muted={!documento.dataValidade}
                          >
                            {formatDateBR(documento.dataValidade)}
                          </TableCellText>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusBadge doc={documento} />
                      </td>

                      {podeBaixar && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          {documento.urlDocumento ? (
                            <button
                              type="button"
                              onClick={() => void handleAbrirArquivo(documento)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Ver Arquivo
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <EmptyRow
                    colSpan={podeBaixar ? 8 : 7}
                    message="Nenhum documento encontrado."
                  />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum documento encontrado.
                </p>
              </div>
            ) : (
              paginated.map((documento) => {
                const vencido =
                  documento.statusDocumento !== "NAO_SE_APLICA" &&
                  isDocumentoVencido(documento);

                const tipo =
                  tipoDocumentoLabels[documento.tipoDocumento] ??
                  documento.tipoDocumento;

                const organizacaoNome = getOrganizacaoNome(
                  documento.organizacaoId,
                );

                return (
                  <div
                    key={documento.id}
                    className={`p-4 ${vencido ? expiredMobileCardClass : ""}`}
                  >
                    <div className="mb-3 flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/documentos/${documento.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/documentos/${documento.id}/editar`)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(documento.id)}
                        />
                      )}
                    </div>

                    <p className="font-medium text-foreground">{tipo}</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {organizacaoNome}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge doc={documento} />

                      <span className="text-xs text-muted-foreground">
                        Validade: {" "}
                        {vencido ? (
                          <span className={expiredDateClass}>
                            {formatDateBR(documento.dataValidade)}
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            {formatDateBR(documento.dataValidade)}
                          </span>
                        )}
                      </span>
                    </div>

                    {documento.orgaoEmissor && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Órgão emissor: {" "}
                        <span className="text-foreground">
                          {documento.orgaoEmissor}
                        </span>
                      </p>
                    )}

                    {podeBaixar && documento.urlDocumento && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => void handleAbrirArquivo(documento)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Ver arquivo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
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
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Documentos" />
    </AppLayout>
  );
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </td>
    </tr>
  );
}
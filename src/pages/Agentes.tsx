import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  UserCog,
  FileSignature,
} from "lucide-react";
import { exportTermoAgentePdf } from "@/lib/pdfExporters";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  getAgentes,
  getAgenteDetalhadoById,
  deleteAgente,
  tipoAgenteLabels,
  type Agente,
} from "@/data/agentes";
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

const AGENTE_NEXT_STEP_KEY = "aurit:agentes:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface AgenteNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length !== 11) {
    return value || "—";
  }

  return digits.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    "$1.$2.$3-$4",
  );
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length !== 14) {
    return value || "—";
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function formatDocumentoAgente(value?: string | null) {
  const documento = value ?? "";
  const digits = onlyDigits(documento);

  if (!digits) {
    return "—";
  }

  if (digits.length === 11) {
    return formatCpf(digits);
  }

  if (digits.length === 14) {
    return formatCnpj(digits);
  }

  return documento;
}

export default function Agentes() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Agente[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<AgenteNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const tableRef = useRef<HTMLTableElement>(null);

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
          "AGENTES_CULTURAIS",
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
    const raw = sessionStorage.getItem(AGENTE_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AgenteNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(AGENTE_NEXT_STEP_KEY);

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

    void loadAgentes();
  }, [loadingPermissoes, podeVisualizar]);

  async function loadAgentes() {
    try {
      setLoading(true);

      const data = await getAgentes();
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar agentes.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    const sDigits = onlyDigits(s);

    if (!s) return items;

    return items.filter((a) => {
      const documentoOriginal = a.documento ?? "";
      const documentoFormatado = formatDocumentoAgente(documentoOriginal);
      const documentoDigits = onlyDigits(documentoOriginal);

      return (
        a.nomePrincipal.toLowerCase().includes(s) ||
        (a.representante ?? "").toLowerCase().includes(s) ||
        documentoOriginal.toLowerCase().includes(s) ||
        documentoFormatado.toLowerCase().includes(s) ||
        (!!sDigits && documentoDigits.includes(sDigits)) ||
        (tipoAgenteLabels[a.tipo] ?? "").toLowerCase().includes(s)
      );
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

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir agentes culturais.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteAgente(Number(confirmDelete));

      setItems((prev) => prev.filter((a) => a.id !== confirmDelete));
      setConfirmDelete(null);

      toast.success("Agente excluído com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir agente.",
      );
    }
  };

  const handleGerarPdfAgente = async (id: string) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF do agente.");
      return;
    }

    try {
      setGeneratingPdfId(id);

      const agenteDetalhado = await getAgenteDetalhadoById(Number(id));
      exportTermoAgentePdf(agenteDetalhado);

      toast.success("Termo do agente gerado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar PDF do agente.",
      );
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <PageTitle
          title="Agente Cultural"
          tooltip="Cadastre o agente cultural responsável pela iniciativa. Esse cadastro identifica quem representa a ação cultural no sistema e pode ser utilizado em projetos, editais, documentos e prestações de contas."
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
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar agente"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/agentes/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Agente
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[150px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de agente
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome / Razão Social
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Representante
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documento
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[170px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Gerar
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/agentes/${a.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() => navigate(`/agentes/${a.id}/editar`)}
                          />
                        )}

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(a.id)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                      {tipoAgenteLabels[a.tipo]}
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={a.nomePrincipal} bold>
                        {a.nomePrincipal}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      {a.representante ? (
                        <TableCellText text={a.representante}>
                          {a.representante}
                        </TableCellText>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                      {formatDocumentoAgente(a.documento)}
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleGerarPdfAgente(a.id)}
                          disabled={generatingPdfId === a.id}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <FileSignature className="h-3.5 w-3.5" />
                          {generatingPdfId === a.id
                            ? "Gerando..."
                            : "Gerar termo"}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeGerarPdf ? 6 : 5}
                      className="px-5 py-16 text-center"
                    >
                      <UserCog className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum agente encontrado.
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
                <UserCog className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum agente encontrado.
                </p>
              </div>
            ) : (
              paginated.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/agentes/${a.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() => navigate(`/agentes/${a.id}/editar`)}
                        />
                      )}

                      <TableActionIcon
                        icon={FileText}
                        label="Abrir contrato"
                        onClick={() => navigate(`/agentes/${a.id}/contratos`)}
                      />

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(a.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleGerarPdfAgente(a.id)}
                        disabled={generatingPdfId === a.id}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        {generatingPdfId === a.id ? "Gerando..." : "Termo"}
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {tipoAgenteLabels[a.tipo]}
                  </p>

                  <p className="mt-0.5 font-medium text-foreground">
                    {a.nomePrincipal}
                  </p>

                  {a.representante && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rep.: {a.representante}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDocumentoAgente(a.documento)}
                  </p>
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
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>

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

      <WikiFloatingButton
        pageTitle="Agentes Culturais"
        href="https://www.aurit.com.br/wiki/institucional/agentes-culturais"
      />
    </AppLayout>
  );
}
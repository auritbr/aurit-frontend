import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Package,
  FileDown,
  Download,
} from "lucide-react";

import { exportPatrimonioPdf } from "@/lib/pdfExporters";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
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
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deletePatrimonio,
  getOrganizacoesPatrimonio,
  getPatrimonios,
  getProjetosPatrimonio,
  getPatrimonioNotaFiscalDownloadUrl,
  tipoPatrimonioLabel,
  estadoConservacaoLabel,
  statusPatrimonioLabel,
  type OrganizacaoOption,
  type Patrimonio as PatrimonioItem,
  type ProjetoOption,
} from "@/data/patrimonio";
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

const PATRIMONIO_NEXT_STEP_KEY = "aurit:patrimonio:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PatrimonioNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const formatCurrency = (value?: number) =>
  value == null
    ? "—"
    : value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

const statusClass = (status: string) => {
  switch (status) {
    case "DISPONIVEL":
      return "status-pill status-active";
    case "EMPRESTADO":
    case "EM_MANUTENCAO":
      return "status-pill status-pending";
    case "BAIXADO":
      return "status-pill status-inactive";
    default:
      return "status-pill status-inactive";
  }
};

const conservacaoClass = (status: string) => {
  switch (status) {
    case "NOVO":
      return "status-pill status-active";
    case "USADO":
      return "status-pill status-done";
    case "DANIFICADO":
      return "status-pill status-pending";
    case "INUTILIZADO":
      return "status-pill status-inactive";
    default:
      return "status-pill status-inactive";
  }
};

export default function Patrimonio() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PatrimonioNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("PATRIMONIO");

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
    const raw = sessionStorage.getItem(PATRIMONIO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PatrimonioNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PATRIMONIO_NEXT_STEP_KEY);

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

    void carregarPatrimonios();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarPatrimonios() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [patrimoniosData, organizacoesData, projetosData] =
        await Promise.all([
          getPatrimonios(),
          getOrganizacoesPatrimonio(),
          getProjetosPatrimonio(),
        ]);

      setItems(patrimoniosData);
      setOrganizacoes(organizacoesData);
      setProjetos(projetosData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar patrimônios.";

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

  const nomeOrganizacao = (id?: number | null) =>
    id ? organizacoes.find((o) => o.id === id)?.nome ?? "—" : "—";

  const nomeProjeto = (id?: number | null) =>
    id ? projetos.find((p) => p.id === id)?.nome ?? "—" : "—";

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((item) => {
      const organizacao = nomeOrganizacao(item.organizacaoId).toLowerCase();
      const projeto = nomeProjeto(item.projetoId).toLowerCase();
      const tipo = tipoPatrimonioLabel(item.tipoPatrimonio).toLowerCase();
      const conservacao = estadoConservacaoLabel(
        item.estadoConservacao,
      ).toLowerCase();
      const status = statusPatrimonioLabel(
        item.statusPatrimonio,
      ).toLowerCase();

      return [
        item.numeroPatrimonio,
        item.nomePatrimonio,
        tipo,
        conservacao,
        status,
        item.marca ?? "",
        item.modelo ?? "",
        item.numeroSerie ?? "",
        organizacao,
        projeto,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [search, items, organizacoes, projetos]);

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
      toast.error("Você não possui permissão para excluir patrimônios.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePatrimonio(confirmDelete);

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Patrimônio excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir patrimônio.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  }

  const handleAbrirNotaFiscal = async (item: PatrimonioItem) => {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para baixar notas fiscais.");
      return;
    }

    if (!item.urlNotaFiscal) {
      toast.info("Nenhuma nota fiscal disponível para este patrimônio.");
      return;
    }

    try {
      const urlTemporaria = await getPatrimonioNotaFiscalDownloadUrl(item.id);
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao abrir a nota fiscal.",
      );
    }
  };

  const handleExportPdf = async (item: PatrimonioItem) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar ficha.");
      return;
    }

    let urlNotaFiscal = item.urlNotaFiscal ?? "";

    if (item.urlNotaFiscal) {
      try {
        urlNotaFiscal = await getPatrimonioNotaFiscalDownloadUrl(item.id);
      } catch {
        urlNotaFiscal = "";
      }
    }

    exportPatrimonioPdf({
      ...item,
      urlNotaFiscal,
      tipoPatrimonio: tipoPatrimonioLabel(item.tipoPatrimonio),
      estadoConservacao: estadoConservacaoLabel(item.estadoConservacao),
      statusPatrimonio: statusPatrimonioLabel(item.statusPatrimonio),
      organizacao: nomeOrganizacao(item.organizacaoId),
      projeto: nomeProjeto(item.projetoId),
      valorPatrimonio: formatCurrency(item.valorPatrimonio),
    } as any);
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando patrimônios...
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
        <PageTitle
          title="Patrimônio"
          tooltip="Cadastre e acompanhe os bens da organização, como equipamentos, instrumentos, mobiliários e materiais permanentes. Mantenha as informações atualizadas para garantir controle, conservação, rastreabilidade e apoio à prestação de contas."
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
                aria-label="Buscar patrimônio"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/patrimonio/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Patrimônio
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1350px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Número
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Marca / Modelo
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nº de série
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organização
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Conservação
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Aquisição
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor
                  </th>

                  {podeBaixar && (
                    <th
                      className="w-[150px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Nota Fiscal
                    </th>
                  )}

                  {podeGerarPdf && (
                    <th
                      className="w-[160px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/patrimonio/${item.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/patrimonio/${item.id}/editar`)
                            }
                          />
                        )}

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

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText text={item.numeroPatrimonio} bold>
                        {item.numeroPatrimonio}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText text={item.nomePatrimonio}>
                        {item.nomePatrimonio}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={tipoPatrimonioLabel(item.tipoPatrimonio)}
                      >
                        {tipoPatrimonioLabel(item.tipoPatrimonio)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={`${item.marca || "—"} / ${item.modelo || "—"}`}
                      >
                        {item.marca || "—"} / {item.modelo || "—"}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={item.numeroSerie || "—"}
                        muted={!item.numeroSerie}
                      >
                        {item.numeroSerie || "—"}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={nomeOrganizacao(item.organizacaoId)}
                        muted={nomeOrganizacao(item.organizacaoId) === "—"}
                      >
                        {nomeOrganizacao(item.organizacaoId)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <span className={conservacaoClass(item.estadoConservacao)}>
                        {estadoConservacaoLabel(item.estadoConservacao)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <span className={statusClass(item.statusPatrimonio)}>
                        {statusPatrimonioLabel(item.statusPatrimonio)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText text={item.dataAquisicao || "—"}>
                        {item.dataAquisicao || "—"}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-right">
                      <TableCellText
                        text={formatCurrency(item.valorPatrimonio)}
                        muted={item.valorPatrimonio == null}
                      >
                        {formatCurrency(item.valorPatrimonio)}
                      </TableCellText>
                    </td>

                    {podeBaixar && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        {item.urlNotaFiscal ? (
                          <button
                            type="button"
                            onClick={() => void handleAbrirNotaFiscal(item)}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Abrir nota
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    )}

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
                ))}

                {paginated.length === 0 && (
                  <EmptyRow colspan={11 + (podeBaixar ? 1 : 0) + (podeGerarPdf ? 1 : 0)} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum patrimônio encontrado.
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
                        onClick={() => navigate(`/patrimonio/${item.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/patrimonio/${item.id}/editar`)
                          }
                        />
                      )}

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
                        Ficha
                      </Button>
                    )}
                  </div>

                  <p className="font-mono text-xs text-muted-foreground">
                    {item.numeroPatrimonio}
                  </p>

                  <p className="mt-0.5 font-medium text-foreground">
                    {item.nomePatrimonio}
                  </p>

                  <p className="mt-2 text-sm text-foreground">
                    {tipoPatrimonioLabel(item.tipoPatrimonio)}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Organização: {nomeOrganizacao(item.organizacaoId)}
                  </p>

                  {(item.marca || item.modelo || item.numeroSerie) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.marca || "Sem marca"} /{" "}
                      {item.modelo || "Sem modelo"}
                      {item.numeroSerie ? ` · Série: ${item.numeroSerie}` : ""}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={conservacaoClass(item.estadoConservacao)}>
                      {estadoConservacaoLabel(item.estadoConservacao)}
                    </span>

                    <span className={statusClass(item.statusPatrimonio)}>
                      {statusPatrimonioLabel(item.statusPatrimonio)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Aquisição: {item.dataAquisicao || "—"}</span>

                    <span className="font-medium text-foreground">
                      {formatCurrency(item.valorPatrimonio)}
                    </span>
                  </div>

                  {podeBaixar && item.urlNotaFiscal && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => void handleAbrirNotaFiscal(item)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Abrir nota fiscal
                      </button>
                    </div>
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
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir patrimônio?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso este bem esteja vinculado a
              empréstimos, prestações de contas ou outros registros, o backend
              pode impedir a exclusão para preservar o histórico.
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

      <WikiFloatingButton pageTitle="Patrimônio" />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum patrimônio encontrado.
        </p>
      </td>
    </tr>
  );
}
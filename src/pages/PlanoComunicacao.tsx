import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Eye,
  FileDown,
} from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpTooltip } from "@/components/HelpTooltip";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill, type Status } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportPlanoComunicacaoPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deletePlanoComunicacao,
  getAcoesDivulgacaoOptions,
  getOrganizacoesOptions,
  getPlanosComunicacao,
  statusPlanoComunicacaoLabel,
  type AcaoDivulgacaoOption,
  type OrganizacaoOption,
  type PlanoComunicacao,
} from "@/data/planoComunicacao";
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

const EXECUCAO_DIVULGACAO_NEXT_STEP_KEY =
  "aurit:plano-comunicacao:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface ExecucaoDivulgacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const formatDateBR = (iso: string) => {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
};

export default function PlanoComunicacaoPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PlanoComunicacao[]>([]);
  const [acoes, setAcoes] = useState<AcaoDivulgacaoOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<ExecucaoDivulgacaoNextStepCardData | null>(null);
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
          await getPermissoesUsuarioLogadoPorModulo("PLANO_COMUNICACAO");

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
    const raw = sessionStorage.getItem(EXECUCAO_DIVULGACAO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ExecucaoDivulgacaoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EXECUCAO_DIVULGACAO_NEXT_STEP_KEY);

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

      const [execucoesData, acoesData, organizacoesData] = await Promise.all([
        getPlanosComunicacao(),
        getAcoesDivulgacaoOptions(),
        getOrganizacoesOptions(),
      ]);

      setItems(execucoesData);
      setAcoes(acoesData);
      setOrganizacoes(organizacoesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar Execuções da Divulgação.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const acaoNome = (id: string) =>
    id ? acoes.find((acao) => acao.id === id)?.nome ?? "—" : "—";

  const organizacaoNome = (id: string) =>
    id
      ? organizacoes.find((organizacao) => organizacao.id === id)?.nome ?? "—"
      : "—";

  const statusLabel = (status?: PlanoComunicacao["status"]) => {
    if (!status) return null;

    const label = statusPlanoComunicacaoLabel(status);

    return label === "—" ? null : label;
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) =>
      [
        item.quantidade,
        item.formatoPlanoComunicacao,
        item.localCirculacaoComunicacao,
        acaoNome(item.acaoDivulgacao),
        organizacaoNome(item.organizacao),
        statusPlanoComunicacaoLabel(item.status),
        formatDateBR(item.dataInicio),
        formatDateBR(item.dataFim),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, items, acoes, organizacoes]);

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
      toast.error(
        "Você não possui permissão para excluir Execução da Divulgação.",
      );
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePlanoComunicacao(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Execução da Divulgação excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir Execução da Divulgação.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  async function handleExportPdf(item: PlanoComunicacao) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportPlanoComunicacaoPdf({
      id: item.id,
      quantidade: item.quantidade,
      formatoPlanoComunicacao: item.formatoPlanoComunicacao,
      localCirculacaoComunicacao: item.localCirculacaoComunicacao,
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
      acaoDivulgacao: acaoNome(item.acaoDivulgacao),
      organizacao: organizacaoNome(item.organizacao),
      status: statusLabel(item.status) ?? "—",
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
        <PageTitle
          title="Execução da Divulgação"
          tooltip="Registre como a ação de divulgação será executada na prática, informando formato, quantidade, período, local de circulação, ação vinculada, organização responsável e situação atual do registro."
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

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Esta área organiza os registros de execução da comunicação do projeto.
          Use para acompanhar materiais produzidos, canais utilizados, locais de
          circulação, períodos e situação de cada ação de divulgação.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar Execução da Divulgação"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/plano-comunicacao/novo")}
                className="h-9 gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Cadastrar execução
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1320px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Ações",
                    "Quantidade",
                    "Formato",
                    "Local de circulação",
                    "Data início",
                    "Data fim",
                    "Status",
                    "Ação de divulgação",
                    "Organização",
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
                  const acao = acaoNome(item.acaoDivulgacao);
                  const organizacao = organizacaoNome(item.organizacao);
                  const status = statusLabel(item.status);

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
                              navigate(`/plano-comunicacao/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/plano-comunicacao/${item.id}/editar`,
                                )
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

                      <td className="px-6 py-2.5">
                        <TableCellText text={item.quantidade} bold>
                          {item.quantidade}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={item.formatoPlanoComunicacao}>
                          {item.formatoPlanoComunicacao}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText
                          text={item.localCirculacaoComunicacao}
                          muted
                        >
                          {item.localCirculacaoComunicacao}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={formatDateBR(item.dataInicio)}>
                          {formatDateBR(item.dataInicio)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={formatDateBR(item.dataFim)}>
                          {formatDateBR(item.dataFim)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        {status ? (
                          <StatusPill status={status as Status} />
                        ) : (
                          <span className="text-[13px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={acao} muted>
                          {acao}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={organizacao} muted>
                          {organizacao}
                        </TableCellText>
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
                      colSpan={podeGerarPdf ? 10 : 9}
                      className="px-5 py-16 text-center"
                    >
                      <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma Execução da Divulgação encontrada.
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
                <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma Execução da Divulgação encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => {
                const status = statusLabel(item.status);

                return (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() =>
                            navigate(`/plano-comunicacao/${item.id}`)
                          }
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/plano-comunicacao/${item.id}/editar`)
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
                          PDF
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {item.formatoPlanoComunicacao} · {item.quantidade}
                    </p>

                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.localCirculacaoComunicacao}
                    </p>

                    <p className="mt-2 text-sm text-foreground">
                      {acaoNome(item.acaoDivulgacao)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {organizacaoNome(item.organizacao)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {status ? (
                        <StatusPill status={status as Status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Status não informado
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {formatDateBR(item.dataInicio)} →{" "}
                        {formatDateBR(item.dataFim)}
                      </span>
                    </div>
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
            <AlertDialogTitle>Excluir Execução da Divulgação?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso este registro esteja
              vinculado a evidências, prestações de contas ou outros registros,
              o backend pode impedir a exclusão para preservar o histórico.
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

      <WikiFloatingButton pageTitle="Execução da Divulgação" />
    </AppLayout>
  );
}
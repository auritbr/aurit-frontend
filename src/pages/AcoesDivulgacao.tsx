import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Megaphone,
  FileDown,
} from "lucide-react";
import { exportAcaoDivulgacaoPdf } from "@/lib/pdfExporters";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill, type Status } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  colaboradoresTextoAcao,
  deleteAcaoDivulgacao,
  estrategiasTexto,
  formatDateBr,
  getAcoesDivulgacao,
  getColaboradoresOptions,
  getProjetosOptions,
  projetoNomeAcao,
  statusValueToLabel,
  type AcaoDivulgacao,
  type ColaboradorOption,
  type ProjetoOption,
} from "@/data/acoesDivulgacao";
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
import { toast } from "sonner";

const ACAO_DIVULGACAO_NEXT_STEP_KEY =
  "aurit:acoes-divulgacao:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface AcaoDivulgacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function AcoesDivulgacao() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AcaoDivulgacao[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<AcaoDivulgacaoNextStepCardData | null>(null);
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
          "ACOES_DIVULGACAO",
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
    const raw = sessionStorage.getItem(ACAO_DIVULGACAO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AcaoDivulgacaoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(ACAO_DIVULGACAO_NEXT_STEP_KEY);

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

      const [acoesData, projetosData, colaboradoresData] = await Promise.all([
        getAcoesDivulgacao(),
        getProjetosOptions(),
        getColaboradoresOptions(),
      ]);

      setItems(acoesData);
      setProjetos(projetosData);
      setColaboradores(colaboradoresData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as ações de divulgação.";

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

  const projetoNome = (projetoId: string) =>
    projetoNomeAcao(projetoId, projetos);

  const colaboradoresTexto = (ids: string[]) =>
    colaboradoresTextoAcao(ids, colaboradores);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) => {
      const estrategias = estrategiasTexto(
        item.estrategiasDivulgacao,
      ).toLowerCase();

      const projeto = projetoNome(item.projetoId).toLowerCase();
      const colabs = colaboradoresTexto(item.colaboradoresIds).toLowerCase();
      const status = statusValueToLabel(item.status).toLowerCase();

      return [
        item.nomeAcao,
        item.descricaoAcao,
        item.realizacaoAcao,
        item.objetivoAcao,
        item.acoesAcessibilidade,
        item.resultadoEsperado,
        item.produtosGerados,
        formatDateBr(item.dataInicio),
        formatDateBr(item.dataFim),
        estrategias,
        projeto,
        colabs,
        status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, items, projetos, colaboradores]);

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
      toast.error("Você não possui permissão para excluir ações de divulgação.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteAcaoDivulgacao(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Ação de divulgação excluída com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir ação de divulgação.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  function handleExportPdf(item: AcaoDivulgacao) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const projeto = projetoNome(item.projetoId);
    const colaboradoresFormatados = colaboradoresTexto(item.colaboradoresIds);

    exportAcaoDivulgacaoPdf({
      ...item,
      projeto,
      colaboradores: colaboradoresFormatados
        ? colaboradoresFormatados.split(", ")
        : [],
      estrategiaDivulgacao: item.estrategiasDivulgacao,
      estrategiasDivulgacao: item.estrategiasDivulgacao,
      registroDocumentacao: [],
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
          title="Ações de Divulgação"
          tooltip="Cadastre as ações de divulgação do projeto, detalhando como serão realizadas, quais objetivos serão alcançados e quais registros e resultados serão gerados. Essas informações são essenciais para visibilidade e prestação de contas."
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
                aria-label="Buscar ação de divulgação"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/acoes-divulgacao/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Ação
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
                    Nome da ação
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Início
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Término
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Estratégias
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
                {paginated.map((item) => {
                  const estrategias = estrategiasTexto(
                    item.estrategiasDivulgacao,
                  );
                  const projeto = projetoNome(item.projetoId);
                  const colabs = colaboradoresTexto(item.colaboradoresIds);
                  const status = statusValueToLabel(item.status) as Status;

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
                              navigate(`/acoes-divulgacao/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/acoes-divulgacao/${item.id}/editar`)
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
                        <TableCellText text={item.nomeAcao} bold>
                          {item.nomeAcao}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(item.dataInicio)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(item.dataFim)}
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={estrategias} muted>
                          {estrategias || "—"}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusPill status={status} />
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={projeto}>{projeto}</TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        {colabs ? (
                          <TableCellText text={colabs} muted>
                            {colabs}
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
                            onClick={() => handleExportPdf(item)}
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
                  <EmptyRow colSpan={podeGerarPdf ? 9 : 8} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma ação de divulgação encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => {
                const projeto = projetoNome(item.projetoId);
                const colabs = colaboradoresTexto(item.colaboradoresIds);
                const estrategias = estrategiasTexto(
                  item.estrategiasDivulgacao,
                );
                const status = statusValueToLabel(item.status) as Status;

                return (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() =>
                            navigate(`/acoes-divulgacao/${item.id}`)
                          }
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/acoes-divulgacao/${item.id}/editar`)
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
                          onClick={() => handleExportPdf(item)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {item.nomeAcao}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateBr(item.dataInicio)} —{" "}
                      {formatDateBr(item.dataFim)}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {estrategias || "Sem estratégias informadas"}
                    </p>

                    <p className="mt-2 text-sm text-foreground">{projeto}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill status={status} />

                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        • {colabs || "Sem colaboradores"}
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
            <AlertDialogTitle>Excluir ação de divulgação?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Ações de Divulgação" />
    </AppLayout>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma ação de divulgação encontrada.
        </p>
      </td>
    </tr>
  );
}
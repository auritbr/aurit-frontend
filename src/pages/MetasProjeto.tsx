import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Target,
  Eye,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NextStepCard } from "@/components/NextStepCard";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportMetaProjetoPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteMetaProjeto,
  formatQuantidade,
  getMetasProjeto,
  getProjetosOptions,
  getPropostasEditalOptions,
  projetoNomeMeta,
  propostaNomeMeta,
  type MetaProjeto,
  type ProjetoOption,
  type PropostaEditalOption,
} from "@/data/metasProjeto";
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

type SortKey = "titulo" | "quantidade" | "projeto" | "proposta" | "comprovacao";

const META_PROJETO_NEXT_STEP_KEY = "aurit:metas-projeto:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface MetaProjetoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function MetasProjetoPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MetaProjeto[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [nextStepCard, setNextStepCard] =
    useState<MetaProjetoNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("METAS_PROJETO");

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
    const raw = sessionStorage.getItem(META_PROJETO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as MetaProjetoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(META_PROJETO_NEXT_STEP_KEY);

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

      const [metasData, projetosData, propostasData] = await Promise.all([
        getMetasProjeto(),
        getProjetosOptions(),
        getPropostasEditalOptions(),
      ]);

      setItems(metasData);
      setProjetos(projetosData);
      setPropostas(propostasData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar metas.";

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

    const sorted = [...items].sort(
      (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0),
    );

    if (!term) return sorted;

    return sorted.filter((meta) => {
      const projeto = projetoNomeMeta(meta.projeto, projetos);
      const proposta = propostaNomeMeta(meta.propostaEdital, propostas);

      return [
        meta.tituloMeta,
        meta.descricaoMeta,
        meta.formaComprovacao,
        formatQuantidade(meta.quantidadePrevista),
        String(meta.ordem),
        projeto,
        proposta,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, items, projetos, propostas]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "titulo":
          return item.tituloMeta;
        case "quantidade":
          return Number(item.quantidadePrevista || 0);
        case "projeto":
          return projetoNomeMeta(item.projeto, projetos);
        case "proposta":
          return propostaNomeMeta(item.propostaEdital, propostas);
        case "comprovacao":
          return item.formaComprovacao ?? "";
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

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
      toast.error("Você não possui permissão para remover metas.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteMetaProjeto(Number(confirmDelete));

      setItems((prev) => prev.filter((meta) => meta.id !== confirmDelete));
      toast.success("Meta removida com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover meta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  };

  async function handleExportPdf(meta: MetaProjeto) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar ficha.");
      return;
    }

    const projeto = projetoNomeMeta(meta.projeto, projetos);
    const proposta = propostaNomeMeta(meta.propostaEdital, propostas);

    await exportMetaProjetoPdf({
      id: meta.id,
      tituloMeta: meta.tituloMeta,
      descricaoMeta: meta.descricaoMeta,
      quantidadePrevista: formatQuantidade(meta.quantidadePrevista),
      formaComprovacao: meta.formaComprovacao,
      projeto,
      propostaEdital: proposta,
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
          title="Metas do Projeto"
          tooltip="Cadastre as metas previstas para o projeto, definindo entregas concretas, quantidades esperadas e formas de comprovação. Essas informações ajudam a acompanhar a execução, organizar evidências e preparar relatórios e prestações de contas."
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
                aria-label="Buscar meta"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/metas-projeto/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Meta
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

                  <SortableHeader
                    label="Título da meta"
                    sortKey="titulo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Quantidade prevista"
                    sortKey="quantidade"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Projeto"
                    sortKey="projeto"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Proposta de edital"
                    sortKey="proposta"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Forma de comprovação"
                    sortKey="comprovacao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

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
                {paginated.map((meta) => {
                  const projeto = projetoNomeMeta(meta.projeto, projetos);
                  const proposta = propostaNomeMeta(
                    meta.propostaEdital,
                    propostas,
                  );
                  const comprovacao = meta.formaComprovacao?.trim() || "—";

                  return (
                    <tr
                      key={meta.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() =>
                              navigate(`/metas-projeto/${meta.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/metas-projeto/${meta.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(meta.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={meta.tituloMeta} bold>
                          {meta.tituloMeta}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatQuantidade(meta.quantidadePrevista)}
                          bold
                        >
                          {formatQuantidade(meta.quantidadePrevista)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={projeto} muted>
                          {projeto}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={proposta} muted>
                          {proposta}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={comprovacao} muted>
                          {comprovacao}
                        </TableCellText>
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(meta)}
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
                  <EmptyRow colspan={podeGerarPdf ? 7 : 6} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma meta encontrada.
                </p>
              </div>
            ) : (
              paginated.map((meta) => (
                <div key={meta.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/metas-projeto/${meta.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/metas-projeto/${meta.id}/editar`)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(meta.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(meta)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Ficha
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {meta.tituloMeta}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ordem:{" "}
                    <span className="font-medium text-foreground">
                      {meta.ordem}
                    </span>{" "}
                    · Quantidade prevista:{" "}
                    <span className="font-medium text-foreground">
                      {formatQuantidade(meta.quantidadePrevista)}
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-foreground">
                    {projetoNomeMeta(meta.projeto, projetos)}
                  </p>

                  {meta.propostaEdital && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {propostaNomeMeta(meta.propostaEdital, propostas)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <TablePagination
            totalItems={sortedItems.length}
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
            <AlertDialogTitle>Remover meta?</AlertDialogTitle>

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

      <WikiFloatingButton
        pageTitle="Metas do Projeto"
        href="https://www.aurit.com.br/wiki/projetos/metas-do-projeto"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma meta cadastrada.
        </p>
      </td>
    </tr>
  );
}
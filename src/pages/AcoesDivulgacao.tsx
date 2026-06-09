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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  deleteAcaoDivulgacao,
  editalNomeAcao,
  getAcoesDivulgacao,
  getPropostasEditaisOptions,
  projetoNomeAcao,
  propostaNomeAcao,
  statusValueToLabel,
  type AcaoDivulgacao,
  type PropostaEditalOption,
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

type SortKey = "nomeAcao" | "propostaEdital" | "status";
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

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
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
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
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

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

      const [acoesData, propostasData] = await Promise.all([
        getAcoesDivulgacao(),
        getPropostasEditaisOptions(),
      ]);

      setItems(acoesData);
      setPropostas(propostasData);
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

  const propostaNome = (item: AcaoDivulgacao) =>
    propostaNomeAcao(item.propostaEditalId, propostas, item);

  const editalNome = (item: AcaoDivulgacao) =>
    editalNomeAcao(item.propostaEditalId, propostas, item);

  const projetoNome = (item: AcaoDivulgacao) =>
    projetoNomeAcao(item.propostaEditalId, propostas, item);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) => {
      const proposta = propostaNome(item).toLowerCase();
      const edital = editalNome(item).toLowerCase();
      const projeto = projetoNome(item).toLowerCase();
      const status = statusValueToLabel(item.status).toLowerCase();

      return [
        item.nomeAcao,
        item.descricaoAcao,
        item.realizacaoAcao,
        item.objetivoAcao,
        item.acoesAcessibilidade,
        item.resultadoEsperado,
        item.produtosGerados,
        proposta,
        edital,
        projeto,
        status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, items, propostas]);

  const sorted = useMemo(() => {
    if (!sortConfig) return filtered;

    const getSortableValue = (item: AcaoDivulgacao, key: SortKey) => {
      switch (key) {
        case "nomeAcao":
          return item.nomeAcao ?? "";

        case "propostaEdital":
          return propostaNomeAcao(item.propostaEditalId, propostas, item);

        case "status":
          return statusValueToLabel(item.status);

        default:
          return "";
      }
    };

    const direction = sortConfig.direction === "asc" ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const valueA = getSortableValue(a, sortConfig.key);
      const valueB = getSortableValue(b, sortConfig.key);

      return (
        valueA.localeCompare(valueB, "pt-BR", {
          sensitivity: "base",
          numeric: true,
        }) * direction
      );
    });
  }, [filtered, propostas, sortConfig]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sorted, 25, search);

  function handleSort(key: SortKey) {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });

    setCurrentPage(1);
  }

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

    exportAcaoDivulgacaoPdf({
      ...item,
      propostaEdital: propostaNome(item),
      edital: editalNome(item),
      projeto: projetoNome(item),
      registroDocumentacao: [],
    } as any);
  }

  if (loadingPermissoes) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando permissões...
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
          title="Ações de Divulgação"
          tooltip="Cadastre as ações de divulgação da proposta de edital, detalhando como serão realizadas, quais objetivos serão alcançados e quais registros e resultados serão gerados. Essas informações são essenciais para visibilidade e prestação de contas."
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

                  <SortableHeader
                    label="Nome da ação"
                    sortKey="nomeAcao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />

                  <SortableHeader
                    label="Proposta de edital"
                    sortKey="propostaEdital"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />

                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sortConfig={sortConfig}
                    onSort={handleSort}
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
                {loading ? (
                  <LoadingRow colSpan={podeGerarPdf ? 5 : 4} />
                ) : (
                  paginated.map((item) => {
                    const proposta = propostaNome(item);
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
                                  navigate(
                                    `/acoes-divulgacao/${item.id}/editar`,
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
                          <TableCellText text={item.nomeAcao} bold>
                            {item.nomeAcao}
                          </TableCellText>
                        </td>

                        <td className="px-6 py-2.5">
                          <TableCellText text={proposta}>
                            {proposta}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <StatusPill status={status} />
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
                  })
                )}

                {!loading && paginated.length === 0 && (
                  <EmptyRow colSpan={podeGerarPdf ? 5 : 4} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {loading ? (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Carregando ações de divulgação...
                </p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma ação de divulgação encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => {
                const proposta = propostaNome(item);
                const edital = editalNome(item);
                const projeto = projetoNome(item);
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

                    <p className="mt-1 text-sm text-foreground">{proposta}</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {edital}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {projeto}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill status={status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <TablePagination
            totalItems={sorted.length}
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

      <WikiFloatingButton
        pageTitle="Ações de Divulgação"
        href="https://www.aurit.com.br/wiki/acoes-culturais/acoes-de-divulgacao"
      />
    </AppLayout>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
}

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
}: SortableHeaderProps) {
  const active = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-ml-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-left uppercase tracking-wider transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>

        <Icon
          className={
            active
              ? "h-3.5 w-3.5 text-foreground"
              : "h-3.5 w-3.5 text-muted-foreground/70"
          }
        />
      </button>
    </th>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Carregando ações de divulgação...
        </p>
      </td>
    </tr>
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
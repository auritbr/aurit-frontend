import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Download,
} from "lucide-react";

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
import { SortableHeader } from "@/components/SortableHeader";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteCurriculo,
  getCurriculos,
  type CurriculoListItem,
} from "@/data/curriculos";
import { exportCurriculoPdf } from "@/lib/pdfExporters";
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

type SortKey = "colaborador" | "formacao" | "atuacao" | "experiencias";

const CURRICULO_NEXT_STEP_KEY = "aurit:curriculos:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface CurriculoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function summarize(items: string[]): string {
  const list = (items ?? []).map((s) => s.trim()).filter(Boolean);

  if (list.length === 0) return "—";
  if (list.length === 1) return list[0];

  return `${list[0]} (+${list.length - 1})`;
}

function countLabel(items: string[]): string {
  const n = (items ?? []).filter((s) => s.trim()).length;
  return `${n} ${n === 1 ? "registro" : "registros"}`;
}

export default function Curriculos() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CurriculoListItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<CurriculoNextStepCardData | null>(null);
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
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("CURRICULOS");

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
    const raw = sessionStorage.getItem(CURRICULO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CurriculoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(CURRICULO_NEXT_STEP_KEY);

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

    void carregarCurriculos();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarCurriculos() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const data = await getCurriculos();

      setItems(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar currículos.";

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
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((c) => {
      const texto = [
        c.nomeCompleto,
        c.email,
        c.telefone,
        c.enderecoCompleto,
        ...c.formacaoAcademica,
        ...c.atuacaoProfissional,
        ...c.experienciasRelevantes,
        ...c.atividadesFormativasParticipacoes,
        ...c.habilidadesCompetencias,
        ...c.atuacaoSociocultural,
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(s);
    });
  }, [search, items]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "colaborador":
          return item.nomeCompleto;
        case "formacao":
          return summarize(item.formacaoAcademica);
        case "atuacao":
          return summarize(item.atuacaoProfissional);
        case "experiencias":
          return summarize(item.experienciasRelevantes);
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

  async function handleDelete() {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir currículos.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteCurriculo(Number(confirmDelete));

      setItems((prev) => prev.filter((c) => c.id !== confirmDelete));
      toast.success("Currículo excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir currículo.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  function handleExport(item: CurriculoListItem) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para exportar currículos.");
      return;
    }

    exportCurriculoPdf(item);
    toast.success("Currículo exportado em PDF.");
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
          title="Currículos"
          tooltip="Organize a trajetória do colaborador, reunindo formação, experiências, competências e atuações relevantes para projetos, editais e documentos institucionais."
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
                aria-label="Buscar currículo"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/curriculos/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Currículo
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[140px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <SortableHeader
                    label="Colaborador"
                    sortKey="colaborador"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Formação acadêmica"
                    sortKey="formacao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Atuação profissional"
                    sortKey="atuacao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Experiências"
                    sortKey="experiencias"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  {podeGerarPdf && (
                    <th
                      className="w-[180px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/curriculos/${c.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/curriculos/${c.id}/editar`)
                            }
                          />
                        )}

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(c.id)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={c.nomeCompleto} bold>
                        {c.nomeCompleto}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={summarize(c.formacaoAcademica)}
                        muted
                      >
                        {summarize(c.formacaoAcademica)}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={summarize(c.atuacaoProfissional)}
                        muted
                      >
                        {summarize(c.atuacaoProfissional)}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={summarize(c.experienciasRelevantes)}
                        muted
                      >
                        {summarize(c.experienciasRelevantes)}
                      </TableCellText>
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(c)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Gerar currículo
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {paginated.length === 0 && (
                  <EmptyRow colspan={podeGerarPdf ? 6 : 5} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.map((c) => (
              <div key={c.id} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <TableActionIcon
                      icon={Eye}
                      label="Visualizar"
                      onClick={() => navigate(`/curriculos/${c.id}`)}
                    />

                    {podeEditar && (
                      <TableActionIcon
                        icon={Pencil}
                        label="Editar"
                        onClick={() => navigate(`/curriculos/${c.id}/editar`)}
                      />
                    )}

                    {podeExcluir && (
                      <TableActionIcon
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                        onClick={() => setConfirmDelete(c.id)}
                      />
                    )}
                  </div>

                  {podeGerarPdf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(c)}
                      className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar
                    </Button>
                  )}
                </div>

                <p className="font-medium text-foreground">{c.nomeCompleto}</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Formação: {countLabel(c.formacaoAcademica)}
                </p>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  Atuação: {countLabel(c.atuacaoProfissional)}
                </p>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  Experiências: {countLabel(c.experienciasRelevantes)}
                </p>
              </div>
            ))}

            {paginated.length === 0 && (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum currículo encontrado.
                </p>
              </div>
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
            <AlertDialogTitle>Excluir currículo?</AlertDialogTitle>

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
        pageTitle="Currículos"
        href="https://www.aurit.com.br/wiki/trajetorias/curriculos"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum currículo encontrado.
        </p>
      </td>
    </tr>
  );
}
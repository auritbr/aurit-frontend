import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Compass,
  FileDown,
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
  deleteTrajetoriaCultural,
  getColaboradorNome,
  getTrajetoriasCulturais,
  type TrajetoriaCultural,
} from "@/data/trajetoriasCulturais";
import { exportTrajetoriaCulturalPdf } from "@/lib/pdfExporters";
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

const TRAJETORIA_NEXT_STEP_KEY = "aurit:trajetorias-culturais:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface TrajetoriaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export const PERGUNTAS_GUIA = [
  "Como começou sua atuação cultural?",
  "Com quem aprendeu ou onde se formou na prática?",
  "Em quais grupos, coletivos, instituições ou projetos atuou?",
  "Quais linguagens culturais desenvolve?",
  "Com quais públicos trabalha?",
  "Quais resultados, impactos ou contribuições já alcançou?",
  "Como sua atuação fortalece cultura, comunidade ou território?",
];

function situacaoTexto(texto: string): {
  label: string;
  preenchido: boolean;
  chars: number;
} {
  const textoNormalizado = (texto ?? "").trim();

  return {
    label:
      textoNormalizado.length > 0
        ? `Preenchido (${textoNormalizado.length} caracteres)`
        : "Não preenchido",
    preenchido: textoNormalizado.length > 0,
    chars: textoNormalizado.length,
  };
}

export default function TrajetoriasCulturais() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TrajetoriaCultural[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<TrajetoriaNextStepCardData | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo(
          "TRAJETORIAS_CULTURAIS",
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
    const raw = sessionStorage.getItem(TRAJETORIA_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as TrajetoriaNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(TRAJETORIA_NEXT_STEP_KEY);

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

      const data = await getTrajetoriasCulturais();

      setItems(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar trajetórias culturais.";

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

    if (!term) return items;

    return items.filter((item) => {
      const colaborador = getColaboradorNome(item).toLowerCase();
      const situacao = situacaoTexto(item.textoTrajetoria).label.toLowerCase();
      const texto = (item.textoTrajetoria ?? "").toLowerCase();

      return (
        colaborador.includes(term) ||
        situacao.includes(term) ||
        texto.includes(term)
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
      toast.error("Você não possui permissão para excluir trajetórias culturais.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteTrajetoriaCultural(confirmDelete);

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Trajetória cultural excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir trajetória cultural.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  const handleExport = (id: number) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const trajetoria = items.find((item) => item.id === id);

    if (!trajetoria) {
      toast.error("Trajetória cultural não encontrada.");
      return;
    }

    if (!trajetoria.textoTrajetoria.trim()) {
      toast.error("Não há texto de trajetória para gerar PDF.");
      return;
    }

    exportTrajetoriaCulturalPdf(trajetoria);
    toast.success("Trajetória cultural exportada em PDF.");
  };

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
          title="Trajetórias Culturais"
          tooltip="Escreva a trajetória cultural do colaborador em formato narrativo, destacando sua história com a cultura, saberes aprendidos, práticas desenvolvidas, linguagens de atuação, vínculos com grupos ou territórios e contribuições geradas ao longo do tempo."
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
          Esta área reúne as trajetórias culturais dos colaboradores,
          registrando histórias, saberes, práticas, linguagens e contribuições
          construídas ao longo do tempo. Esses textos podem apoiar currículos,
          portfólios, propostas de edital, comprovação de experiência e
          relatórios institucionais.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar trajetória cultural"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/trajetorias-culturais/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Trajetória
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[140px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Colaborador
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Situação do texto
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[160px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((item) => {
                  const situacao = situacaoTexto(item.textoTrajetoria);

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
                              navigate(`/trajetorias-culturais/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/trajetorias-culturais/${item.id}/editar`,
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
                        <TableCellText text={getColaboradorNome(item)} bold>
                          {getColaboradorNome(item)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        {situacao.preenchido ? (
                          <TableCellText text={situacao.label} muted>
                            {situacao.label}
                          </TableCellText>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/70">
                            Não preenchido
                          </span>
                        )}
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(item.id)}
                            disabled={!situacao.preenchido}
                            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Gerar trajetória
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <EmptyRow colspan={podeGerarPdf ? 4 : 3} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Compass className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma trajetória cultural encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => {
                const situacao = situacaoTexto(item.textoTrajetoria);

                return (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() =>
                            navigate(`/trajetorias-culturais/${item.id}`)
                          }
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(
                                `/trajetorias-culturais/${item.id}/editar`,
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

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(item.id)}
                          disabled={!situacao.preenchido}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Exportar
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {getColaboradorNome(item)}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {situacao.label}
                    </p>
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
            <AlertDialogTitle>Excluir trajetória cultural?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Trajetórias Culturais" />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <Compass className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma trajetória cultural encontrada.
        </p>
      </td>
    </tr>
  );
}
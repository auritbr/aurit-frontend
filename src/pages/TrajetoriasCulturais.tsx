import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FileDown, Loader2, RotateCcw } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FieldLabel } from "@/components/FieldLabel";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
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
import { downloadIndividualReport } from "@/lib/individualReportDownload";
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

type SortBy = "colaborador" | "situacao";
type SortDir = "asc" | "desc";

interface TrajetoriasFiltros {
  nome: string;
  linguagem: string;
  grupo: string;
  situacao: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: TrajetoriasFiltros = {
  nome: "",
  linguagem: "",
  grupo: "",
  situacao: "",
  sortBy: "colaborador",
  sortDir: "asc",
};

const sortByOptions = [
  { value: "colaborador", label: "Colaborador" },
  { value: "situacao", label: "Situação do texto" },
] as const;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const TRAJETORIA_NEXT_STEP_KEY = "aurit:trajetorias-culturais:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface TrajetoriaNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

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
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "trajetorias:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<TrajetoriasFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<TrajetoriasFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [gerandoTrajetoriaId, setGerandoTrajetoriaId] = useState<number | null>(
    null,
  );

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

  const setDraftField = <K extends keyof TrajetoriasFiltros>(
    key: K,
    value: TrajetoriasFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: TrajetoriasFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const linguagem = normalize(filtros.linguagem);
    const grupo = normalize(filtros.grupo);

    const result = items.filter((item) => {
      const texto = normalize(item.textoTrajetoria ?? "");
      if (nome && !normalize(getColaboradorNome(item)).includes(nome))
        return false;
      if (linguagem && !texto.includes(linguagem)) return false;
      if (grupo && !texto.includes(grupo)) return false;
      if (filtros.situacao) {
        const preenchido = situacaoTexto(item.textoTrajetoria).preenchido;
        if (filtros.situacao === "preenchido" && !preenchido) return false;
        if (filtros.situacao === "pendente" && preenchido) return false;
      }
      return true;
    });

    const sortValue = (item: TrajetoriaCultural) =>
      filtros.sortBy === "situacao"
        ? situacaoTexto(item.textoTrajetoria).label
        : getColaboradorNome(item);

    return [...result].sort((a, b) => {
      const compare = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [filtros, items]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const active: ActiveFilterItem[] = [];
    const addText = (key: "nome" | "linguagem" | "grupo", label: string) => {
      if (!filtros[key].trim()) return;
      active.push({
        id: key,
        label,
        value: filtros[key].trim(),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };

    addText("nome", "Colaborador");
    addText("linguagem", "Linguagem cultural");
    addText("grupo", "Grupo ou instituição");

    if (filtros.situacao)
      active.push({
        id: "situacao",
        label: "Situação do texto",
        value:
          filtros.situacao === "preenchido" ? "Preenchido" : "Não preenchido",
        onRemove: () => applyFiltros({ ...filtros, situacao: "" }),
      });
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      active.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${
          sortByOptions.find((option) => option.value === filtros.sortBy)
            ?.label ?? filtros.sortBy
        } · ${filtros.sortDir === "asc" ? "A–Z" : "Z–A"}`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });

    return active;
  }, [filtros]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const toggleSort = (sortBy: SortBy) => {
    setCurrentPage(1);
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para excluir trajetórias culturais.",
      );
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

  const handleExport = async (id: number) => {
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

    try {
      setGerandoTrajetoriaId(trajetoria.id);
      await downloadIndividualReport(
        `/trajetorias-culturais/${encodeURIComponent(String(trajetoria.id))}/relatorio`,
        "trajetoria-cultural.pdf",
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a trajetória cultural em PDF.");
    } finally {
      setGerandoTrajetoriaId(null);
    }
  };

  const exportColumns = [
    { header: "Colaborador", key: "colaboradorNome" },
    { header: "Texto da trajetória", key: "textoTrajetoria" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      colaboradorNome: getColaboradorNome(item),
      textoTrajetoria: item.textoTrajetoria,
    }));

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
        <ListPageHeader
          title="Trajetórias Culturais"
          tooltip="Nesta página é registrada, em formato narrativo, a trajetória profissional e cultural do colaborador, desde o início de sua atuação até o momento atual. O texto pode destacar experiências, áreas de atuação, projetos, realizações, públicos envolvidos e a evolução de sua atuação ao longo do tempo."
          objective="Registre e organize as trajetórias profissionais e culturais dos colaboradores, apresentando suas experiências, áreas de atuação, realizações e contribuições ao longo do tempo. Essas informações podem ser utilizadas em projetos, editais, relatórios e comprovações de trajetória."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/trajetorias-culturais/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar trajetória
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroNome">
                    Nome do colaborador
                  </FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortDir">Ordem</FieldLabel>
                  <Select
                    value={draft.sortDir}
                    onValueChange={(value) =>
                      setDraftField("sortDir", value as SortDir)
                    }
                  >
                    <SelectTrigger
                      id="filtroSortDir"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A–Z</SelectItem>
                      <SelectItem value="desc">Z–A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={handleClearFiltros}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                  aria-busy={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden />
                  )}
                  {searching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>

          <ActiveFilters
            items={activeFilters}
            onClearAll={handleClearFiltros}
          />

          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="trajetorias-culturais"
              canExport={podeGerarPdf}
              showExports={false}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma trajetória cadastrada."
                emptyDescription="Cadastre a primeira trajetória para registrar a história e a atuação cultural das pessoas vinculadas à organização."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="colaborador"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Colaborador
                        </SortableTh>
                        {podeGerarPdf && (
                          <th className="w-[180px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                viewTo={`/trajetorias-culturais/${item.id}`}
                                editTo={
                                  podeEditar
                                    ? `/trajetorias-culturais/${item.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(item.id)
                                    : undefined
                                }
                              />
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText
                                text={getColaboradorNome(item)}
                                bold
                              >
                                {getColaboradorNome(item)}
                              </TableCellText>
                            </td>
                            {podeGerarPdf && (
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <DocumentActionButton
                                  label="Gerar trajetória"
                                  icon={FileDown}
                                  disabled={
                                    !situacao.preenchido ||
                                    (gerandoTrajetoriaId !== null &&
                                      gerandoTrajetoriaId !== item.id)
                                  }
                                  loading={gerandoTrajetoriaId === item.id}
                                  aria-label={`Gerar trajetória de ${getColaboradorNome(item)}`}
                                  onClick={() => void handleExport(item.id)}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {paginated.map((item) => {
                    const situacao = situacaoTexto(item.textoTrajetoria);
                    return (
                      <div key={item.id} className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <RowActionsDropdown
                            viewTo={`/trajetorias-culturais/${item.id}`}
                            editTo={
                              podeEditar
                                ? `/trajetorias-culturais/${item.id}/editar`
                                : undefined
                            }
                            onDelete={
                              podeExcluir
                                ? () => setConfirmDelete(item.id)
                                : undefined
                            }
                          />
                          {podeGerarPdf && (
                            <DocumentActionButton
                              label="Gerar trajetória"
                              icon={FileDown}
                              disabled={
                                !situacao.preenchido ||
                                (gerandoTrajetoriaId !== null &&
                                  gerandoTrajetoriaId !== item.id)
                              }
                              loading={gerandoTrajetoriaId === item.id}
                              onClick={() => void handleExport(item.id)}
                            />
                          )}
                        </div>
                        <p className="font-medium text-foreground">
                          {getColaboradorNome(item)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="registro"
                  entityLabelPlural="registros"
                  pageSizeLabel="Registros por página"
                  loading={loading}
                />
              </>
            )}
          </DataTableCard>
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

      <WikiFloatingButton
        pageTitle="Trajetórias Culturais"
        href="/wiki/pessoas/trajetorias-culturais"
      />
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, Loader2, Search, Plus, RotateCcw } from "lucide-react";

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
  deleteCurriculo,
  getCurriculos,
  type CurriculoListItem,
} from "@/data/curriculos";
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

type SortBy = "colaborador" | "formacao" | "atuacao";
type SortDir = "asc" | "desc";

interface CurriculosFiltros {
  nome: string;
  formacao: string;
  experiencia: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: CurriculosFiltros = {
  nome: "",
  formacao: "",
  experiencia: "",
  sortBy: "colaborador",
  sortDir: "asc",
};

const sortByOptions = [
  { value: "colaborador", label: "Pessoa" },
  { value: "formacao", label: "Formação acadêmica" },
  { value: "atuacao", label: "Atuação profissional" },
] as const;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const CURRICULO_NEXT_STEP_KEY = "aurit:curriculos:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface CurriculoNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

function summarize(items: string[]): string {
  const list = (items ?? []).map((s) => s.trim()).filter(Boolean);

  if (list.length === 0) return "—";
  if (list.length === 1) return list[0];

  return `${list[0]} (+${list.length - 1})`;
}

export default function Curriculos() {
  const navigate = useNavigate();

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
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "curriculos:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<CurriculosFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<CurriculosFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [gerandoCurriculoId, setGerandoCurriculoId] = useState<string | null>(
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

  const setDraftField = <K extends keyof CurriculosFiltros>(
    key: K,
    value: CurriculosFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: CurriculosFiltros) => {
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
    const formacao = normalize(filtros.formacao);
    const experiencia = normalize(filtros.experiencia);

    const result = items.filter((curriculo) => {
      if (nome && !normalize(curriculo.nomeCompleto).includes(nome))
        return false;
      if (
        formacao &&
        !curriculo.formacaoAcademica.some((item) =>
          normalize(item).includes(formacao),
        )
      )
        return false;
      if (
        experiencia &&
        ![
          ...curriculo.experienciasRelevantes,
          ...curriculo.atuacaoProfissional,
        ].some((item) => normalize(item).includes(experiencia))
      )
        return false;
      return true;
    });

    const sortValue = (curriculo: CurriculoListItem) => {
      if (filtros.sortBy === "formacao")
        return summarize(curriculo.formacaoAcademica);
      if (filtros.sortBy === "atuacao")
        return summarize(curriculo.atuacaoProfissional);
      return curriculo.nomeCompleto;
    };

    return [...result].sort((a, b) => {
      const compare = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [filtros, items]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const active: ActiveFilterItem[] = [];

    if (filtros.nome.trim())
      active.push({
        id: "nome",
        label: "Pessoa",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    if (filtros.formacao.trim())
      active.push({
        id: "formacao",
        label: "Formação",
        value: filtros.formacao.trim(),
        onRemove: () => applyFiltros({ ...filtros, formacao: "" }),
      });
    if (filtros.experiencia.trim())
      active.push({
        id: "experiencia",
        label: "Experiência",
        value: filtros.experiencia.trim(),
        onRemove: () => applyFiltros({ ...filtros, experiencia: "" }),
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

  async function handleExport(item: CurriculoListItem) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para exportar currículos.");
      return;
    }

    const curriculoId = String(item.id ?? "").trim();
    if (!curriculoId) {
      toast.error("Não foi possível identificar o currículo selecionado.");
      return;
    }

    try {
      setGerandoCurriculoId(curriculoId);
      await downloadIndividualReport(
        `/curriculos/${encodeURIComponent(curriculoId)}/relatorio`,
        "curriculo.pdf",
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o currículo em PDF.");
    } finally {
      setGerandoCurriculoId(null);
    }
  }

  const exportColumns = [
    { header: "Pessoa", key: "nomeCompleto" },
    { header: "Formação acadêmica", key: "formacaoAcademica" },
    { header: "Atuação profissional", key: "atuacaoProfissional" },
    { header: "Experiências relevantes", key: "experienciasRelevantes" },
    { header: "Habilidades e competências", key: "habilidadesCompetencias" },
    { header: "Atuação sociocultural", key: "atuacaoSociocultural" },
  ];

  const getExportData = () =>
    filtered.map((curriculo) => ({
      nomeCompleto: curriculo.nomeCompleto,
      formacaoAcademica: curriculo.formacaoAcademica.join(" | "),
      atuacaoProfissional: curriculo.atuacaoProfissional.join(" | "),
      experienciasRelevantes: curriculo.experienciasRelevantes.join(" | "),
      habilidadesCompetencias: curriculo.habilidadesCompetencias.join(" | "),
      atuacaoSociocultural: curriculo.atuacaoSociocultural.join(" | "),
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
          title="Currículos"
          tooltip="Nesta página é preenchido o currículo do colaborador com informações sobre formação acadêmica, atuação profissional, experiências socioculturais, atividades formativas e competências. Esses dados ajudam a demonstrar sua trajetória e experiência em projetos, editais e outras ações da organização."
          objective="Cadastre e organize as formações, atuações profissionais, experiências socioculturais, atividades formativas e competências dos colaboradores da organização. Esses registros ajudam na elaboração de projetos, editais, relatórios e comprovações de trajetória."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/curriculos/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar currículo
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
                  <FieldLabel htmlFor="filtroNome">Nome da pessoa</FieldLabel>
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
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Limpar filtros
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
              exportFilename="curriculos"
              canExport={podeGerarPdf}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum currículo cadastrado."
                emptyDescription="Cadastre o primeiro currículo para reunir formações, atuações e experiências das pessoas vinculadas à organização."
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
                      {paginated.map((curriculo) => (
                        <tr
                          key={curriculo.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              viewTo={`/curriculos/${curriculo.id}`}
                              editTo={
                                podeEditar
                                  ? `/curriculos/${curriculo.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(curriculo.id)
                                  : undefined
                              }
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={curriculo.nomeCompleto} bold>
                              {curriculo.nomeCompleto}
                            </TableCellText>
                          </td>
                          {podeGerarPdf && (
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <DocumentActionButton
                                label="Gerar currículo"
                                icon={FileDown}
                                aria-label={`Gerar currículo de ${curriculo.nomeCompleto}`}
                                onClick={() => void handleExport(curriculo)}
                                loading={gerandoCurriculoId === curriculo.id}
                                disabled={
                                  gerandoCurriculoId !== null &&
                                  gerandoCurriculoId !== curriculo.id
                                }
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((curriculo) => (
                    <div key={curriculo.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          viewTo={`/curriculos/${curriculo.id}`}
                          editTo={
                            podeEditar
                              ? `/curriculos/${curriculo.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(curriculo.id)
                              : undefined
                          }
                        />
                        {podeGerarPdf && (
                          <DocumentActionButton
                            label="Gerar currículo"
                            icon={FileDown}
                            aria-label={`Gerar currículo de ${curriculo.nomeCompleto}`}
                            onClick={() => void handleExport(curriculo)}
                            loading={gerandoCurriculoId === curriculo.id}
                            disabled={
                              gerandoCurriculoId !== null &&
                              gerandoCurriculoId !== curriculo.id
                            }
                          />
                        )}
                      </div>
                      <p className="font-medium text-foreground">
                        {curriculo.nomeCompleto}
                      </p>
                    </div>
                  ))}
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
        href="/wiki/pessoas/curriculos"
      />
    </AppLayout>
  );
}

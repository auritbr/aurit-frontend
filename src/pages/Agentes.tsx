import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FileSignature, RotateCcw, Loader2 } from "lucide-react";
import { downloadAgenteReport } from "@/lib/individualReportDownload";
import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
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
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { FieldLabel } from "@/components/FieldLabel";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type TipoAgente,
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

const tipoAgenteOptions = (Object.keys(tipoAgenteLabels) as TipoAgente[]).map(
  (value) => ({
    value,
    label: tipoAgenteLabels[value],
  }),
);

const sortByOptions = [
  { value: "nomePrincipal", label: "Nome / Razão social" },
  { value: "documento", label: "CPF/CNPJ" },
  { value: "representante", label: "Representante" },
  { value: "tipo", label: "Vínculo (tipo de agente)" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = { asc: "A–Z", desc: "Z–A" };

interface AgentesFiltros {
  nome: string;
  documento: string;
  representante: string;
  tipo: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: AgentesFiltros = {
  nome: "",
  documento: "",
  representante: "",
  tipo: [],
  sortBy: "nomePrincipal",
  sortDir: "asc",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label || value;

const AGENTE_NEXT_STEP_KEY = "aurit:agentes:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface AgenteNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length !== 11) {
    return value || "—";
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
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

  const [items, setItems] = useState<Agente[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "agentes:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<AgentesFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<AgentesFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [nextStepCard, setNextStepCard] =
    useState<AgenteNextStepCardData | null>(null);
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
          await getPermissoesUsuarioLogadoPorModulo("AGENTES_CULTURAIS");

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

  const setDraftField = <K extends keyof AgentesFiltros>(
    key: K,
    value: AgentesFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: AgentesFiltros) => {
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
    const documento = onlyDigits(filtros.documento);
    const representante = normalize(filtros.representante);

    const result = items.filter((agente) => {
      if (nome && !normalize(agente.nomePrincipal).includes(nome)) return false;
      if (documento && !onlyDigits(agente.documento).includes(documento))
        return false;
      if (
        representante &&
        !normalize(agente.representante ?? "").includes(representante)
      )
        return false;
      if (filtros.tipo.length && !filtros.tipo.includes(agente.tipo))
        return false;
      return true;
    });

    const sortValue = (agente: Agente) => {
      switch (filtros.sortBy) {
        case "documento":
          return agente.documento ?? "";
        case "representante":
          return agente.representante ?? "";
        case "tipo":
          return labelOf(tipoAgenteOptions, agente.tipo);
        default:
          return agente.nomePrincipal ?? "";
      }
    };

    return [...result].sort((a, b) => {
      const compare = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        {
          sensitivity: "base",
        },
      );
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const removeText = (key: "nome" | "documento" | "representante") =>
      applyFiltros({ ...filtros, [key]: "" });

    if (filtros.nome.trim()) {
      list.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => removeText("nome"),
      });
    }
    if (filtros.documento.trim()) {
      list.push({
        id: "documento",
        label: "CPF/CNPJ",
        value: filtros.documento.trim(),
        onRemove: () => removeText("documento"),
      });
    }
    if (filtros.representante.trim()) {
      list.push({
        id: "representante",
        label: "Função/responsabilidade",
        value: filtros.representante.trim(),
        onRemove: () => removeText("representante"),
      });
    }
    filtros.tipo.forEach((value) => {
      list.push({
        id: `tipo-${value}`,
        label: "Vínculo",
        value: labelOf(tipoAgenteOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            tipo: filtros.tipo.filter((item) => item !== value),
          }),
      });
    });
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    ) {
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${sortDirLabels[filtros.sortDir]}`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    }
    return list;
  }, [filtros]);

  const activeCount = activeFilters.length;
  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const toggleSort = (key: SortBy) => {
    setCurrentPage(1);
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  };

  const exportColumns = [
    { header: "Tipo de agente", key: "tipoLabel" },
    { header: "Nome / Razão social", key: "nomePrincipal" },
    { header: "Representante", key: "representante" },
    { header: "Documento", key: "documentoFormatado" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      tipoLabel: tipoAgenteLabels[item.tipo],
      documentoFormatado: formatDocumentoAgente(item.documento),
    }));

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
      await downloadAgenteReport(agenteDetalhado);

      toast.success("PDF do agente gerado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar PDF do agente.",
      );
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (loadingPermissoes) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          text-justify
          title="Agentes Culturais"
          tooltip="Nesta página é cadastrado o agente cultural responsável pela iniciativa ou atuação cultural. O agente pode ser uma pessoa, grupo ou organização e pode representar a iniciativa, participar da execução de projetos e responder pelas informações e prestações de contas."
          objective="Cadastre o agente cultural responsável pela iniciativa ou atuação cultural. Esses dados poderão ser utilizados em projetos, editais, prestações de contas e outras áreas do sistema."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/agentes/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar agente
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeCount}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroNome">
                    Nome / Razão social
                  </FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome ou razão social"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDocumento">CPF/CNPJ</FieldLabel>
                  <Input
                    id="filtroDocumento"
                    value={draft.documento}
                    onChange={(event) =>
                      setDraftField("documento", event.target.value)
                    }
                    placeholder="Digite o CPF ou CNPJ"
                    inputMode="numeric"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroRepresentante">
                    Representante
                  </FieldLabel>
                  <Input
                    id="filtroRepresentante"
                    value={draft.representante}
                    onChange={(event) =>
                      setDraftField("representante", event.target.value)
                    }
                    placeholder="Digite o nome do representante"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipo">Vínculo</FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipo"
                    options={tipoAgenteOptions}
                    value={draft.tipo}
                    onChange={(value) => setDraftField("tipo", value)}
                    placeholder="Todos os vínculos"
                    summaryNoun="vínculos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) =>
                      setDraftField("sortBy", value as SortBy)
                    }
                  >
                    <SelectTrigger
                      id="filtroSortBy"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortByOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="asc">{sortDirLabels.asc}</SelectItem>
                      <SelectItem value="desc">{sortDirLabels.desc}</SelectItem>
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
              reportTo="/relatorios/agentes"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="agentes-culturais"
              canExport={permissoes.BAIXAR}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum agente cultural cadastrado."
                createLabel="Cadastrar agente"
                onCreate={
                  podeCriar ? () => navigate("/agentes/novo") : undefined
                }
                activeCount={activeCount}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
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
                          sortKey="tipo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de agente
                        </SortableTh>
                        <SortableTh
                          sortKey="nomePrincipal"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome / Razão social
                        </SortableTh>
                        <SortableTh
                          sortKey="representante"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Representante
                        </SortableTh>
                        <SortableTh
                          sortKey="documento"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Documento
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((agente) => (
                        <tr
                          key={agente.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/agentes/${agente.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`agente-${agente.id}.pdf`}
                              viewTo={`/agentes/${agente.id}`}
                              editTo={
                                podeEditar
                                  ? `/agentes/${agente.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(agente.id)
                                  : undefined
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={tipoAgenteLabels[agente.tipo]}>
                              {tipoAgenteLabels[agente.tipo]}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={agente.nomePrincipal} bold>
                              {agente.nomePrincipal}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            {agente.representante ? (
                              <TableCellText text={agente.representante}>
                                {agente.representante}
                              </TableCellText>
                            ) : (
                              <span className="text-[13px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                            {formatDocumentoAgente(agente.documento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((agente) => (
                    <div key={agente.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/agentes/${agente.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`agente-${agente.id}.pdf`}
                          viewTo={`/agentes/${agente.id}`}
                          editTo={
                            podeEditar
                              ? `/agentes/${agente.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(agente.id)
                              : undefined
                          }
                        />
                      </div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {tipoAgenteLabels[agente.tipo]}
                      </p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {agente.nomePrincipal}
                      </p>
                      {agente.representante && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Rep.: {agente.representante}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDocumentoAgente(agente.documento)}
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
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Agentes Culturais"
        href="/wiki/institucional/agentes-culturais"
      />
    </AppLayout>
  );
}

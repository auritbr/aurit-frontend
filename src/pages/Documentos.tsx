import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Download } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { StatusPill } from "@/components/StatusPill";
import { StatusCountBadge } from "@/components/StatusCountBadge";
import { TableCellText } from "@/components/TableCellText";
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
import { usePagination } from "@/hooks/usePagination";
import { RotateCcw, Search, Loader2 } from "lucide-react";
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
import {
  getDocumentos,
  deleteDocumento,
  isDocumentoVencido,
  statusDocumentoLabels,
  tipoDocumentoLabels,
  getOrganizacoesDocumento,
  getDocumentoDownloadUrl,
  formatDateBR,
  type Documento,
  type OrganizacaoOption,
  type StatusDocumento,
  type TipoDocumento,
} from "@/data/documentos";
import { toast } from "sonner";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";

function StatusBadge({ doc }: { doc: Documento }) {
  return (
    <StatusPill status={statusDocumentoLabels[doc.statusDocumento]} tooltip />
  );
}

const tipoOptions = (
  Object.entries(tipoDocumentoLabels) as [TipoDocumento, string][]
).map(([value, label]) => ({ value, label }));
const statusOptions = (
  Object.entries(statusDocumentoLabels) as [StatusDocumento, string][]
).map(([value, label]) => ({ value, label }));

const sortByOptions = [
  { value: "tipo", label: "Tipo de documento" },
  { value: "organizacao", label: "Organização" },
  { value: "orgaoEmissor", label: "Órgão emissor" },
  { value: "dataEmissao", label: "Data de emissão" },
  { value: "dataValidade", label: "Data de validade" },
  { value: "status", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface DocumentosFiltros {
  nome: string;
  tipo: string[];
  situacao: string[];
  vencimento: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: DocumentosFiltros = {
  nome: "",
  tipo: [],
  situacao: [],
  vencimento: "",
  sortBy: "tipo",
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

const DOCUMENTO_NEXT_STEP_KEY = "aurit:documentos:next-step-card";

interface DocumentoNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const parseDateBr = (value?: string) => {
  if (!value) return 0;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
};

export default function DocumentosPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Documento[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "documentos:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<DocumentosFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<DocumentosFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [nextStepCard, setNextStepCard] =
    useState<DocumentoNextStepCardData | null>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;

  const carregar = async () => {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const [documentos, orgs] = await Promise.all([
        getDocumentos(),
        getOrganizacoesDocumento(),
      ]);
      setItems(documentos);
      setOrganizacoes(orgs);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar documentos.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("DOCUMENTOS")
      .then((value) => {
        if (!active) return;
        setPermissoes(value);
        if (value.VISUALIZAR) void carregar();
        else setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => void carregar();
    window.addEventListener("documentos:changed", sync);
    return () => window.removeEventListener("documentos:changed", sync);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(DOCUMENTO_NEXT_STEP_KEY);
    if (!raw) return;

    try {
      setNextStepCard(JSON.parse(raw) as DocumentoNextStepCardData);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(DOCUMENTO_NEXT_STEP_KEY);
    const timer = window.setTimeout(() => setNextStepCard(null), 60_000);
    return () => window.clearTimeout(timer);
  }, []);

  const getOrganizacaoNome = useCallback(
    (id: number | null) =>
      organizacoes.find((item) => item.id === id)?.nome ?? "—",
    [organizacoes],
  );

  const handleAbrirArquivo = async (documento: Documento) => {
    if (!podeBaixar)
      return toast.error("Você não possui permissão para abrir documentos.");
    if (!documento.urlDocumento)
      return toast.info("Nenhum arquivo disponível para este documento.");
    try {
      window.open(
        await getDocumentoDownloadUrl(documento.id),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir documento.",
      );
    }
  };

  const setDraftField = <K extends keyof DocumentosFiltros>(
    key: K,
    value: DocumentosFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: DocumentosFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (!podeExcluir)
      return toast.error("Você não possui permissão para remover documentos.");
    try {
      await deleteDocumento(confirmDelete);
      setItems((current) =>
        current.filter((item) => item.id !== confirmDelete),
      );
      toast.success("Documento removido com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover documento.",
      );
    }
  };

  // ATENÇÃO: indicador de documentos vencidos — não alterar cálculo, posição, texto, cor ou estilo.
  const vencidosCount = items.filter(
    (d) => d.statusDocumento !== "NAO_SE_APLICA" && isDocumentoVencido(d),
  ).length;

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const vencimento = normalize(filtros.vencimento);

    const result = items.filter((d) => {
      if (
        nome &&
        ![
          tipoDocumentoLabels[d.tipoDocumento],
          getOrganizacaoNome(d.organizacaoId),
          d.orgaoEmissor,
          statusDocumentoLabels[d.statusDocumento],
        ]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(nome))
      ) {
        return false;
      }
      if (filtros.tipo.length && !filtros.tipo.includes(d.tipoDocumento))
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(d.statusDocumento)
      )
        return false;
      if (vencimento && !normalize(d.dataValidade || "").includes(vencimento))
        return false;
      return true;
    });

    const sortValue = (d: Documento) => {
      switch (filtros.sortBy) {
        case "organizacao":
          return getOrganizacaoNome(d.organizacaoId);
        case "orgaoEmissor":
          return d.orgaoEmissor || "";
        case "dataEmissao":
          return parseDateBr(d.dataEmissao);
        case "dataValidade":
          return parseDateBr(d.dataValidade);
        case "status":
          return statusDocumentoLabels[d.statusDocumento];
        default:
          return tipoDocumentoLabels[d.tipoDocumento] || d.tipoDocumento;
      }
    };

    return [...result].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      const compare =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros, getOrganizacaoNome]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.nome.trim())
      list.push({
        id: "nome",
        label: "Documento",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    if (filtros.vencimento.trim())
      list.push({
        id: "vencimento",
        label: "Vencimento",
        value: filtros.vencimento.trim(),
        onRemove: () => applyFiltros({ ...filtros, vencimento: "" }),
      });
    filtros.tipo.forEach((value) =>
      list.push({
        id: `tipo-${value}`,
        label: "Tipo",
        value: labelOf(tipoOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            tipo: filtros.tipo.filter((v) => v !== value),
          }),
      }),
    );
    filtros.situacao.forEach((value) =>
      list.push({
        id: `situacao-${value}`,
        label: "Situação",
        value: labelOf(statusOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            situacao: filtros.situacao.filter((v) => v !== value),
          }),
      }),
    );
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    ) {
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${filtros.sortDir === "asc" ? "Crescente" : "Decrescente"}`,
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
    { header: "Tipo de documento", key: "tipoLabel" },
    { header: "Organização", key: "organizacaoNome" },
    { header: "Órgão emissor", key: "orgaoEmissor" },
    { header: "Data de emissão", key: "dataEmissao" },
    { header: "Data de validade", key: "dataValidade" },
    { header: "Situação", key: "statusLabel" },
  ];

  const getExportData = () =>
    filtered.map((d) => ({
      ...d,
      tipoLabel: tipoDocumentoLabels[d.tipoDocumento] || d.tipoDocumento,
      organizacaoNome: getOrganizacaoNome(d.organizacaoId),
      statusLabel: statusDocumentoLabels[d.statusDocumento],
    }));

  if (!podeVisualizar && !loading) {
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
          title="Documentos"
          tooltip="Nesta página são cadastrados e acompanhados os documentos da organização, com informações sobre tipo, vínculo institucional, órgão emissor, datas de emissão e validade, situação e arquivo. Esses dados ajudam a manter a documentação institucional organizada e podem ser utilizados em projetos, editais, relatórios e outras áreas do sistema."
          objective="Cadastre e acompanhe os documentos da organização, seus prazos de validade e sua situação. Manter essas informações atualizadas ajuda a evitar pendências em editais, habilitações e prestações de contas."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/documentos/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar documento
              </Button>
            ) : undefined
          }
        />

        {vencidosCount > 0 && (
          <div className="alert-expired-glass mb-5 rounded-xl px-4 py-3 text-[13px] flex items-start gap-2.5">
            <div className="space-y-1">
              <StatusCountBadge
                count={vencidosCount}
                label={`documento${vencidosCount > 1 ? "s" : ""} vencido${vencidosCount > 1 ? "s" : ""}`}
                aria-label={`${vencidosCount} documento${vencidosCount > 1 ? "s" : ""} vencido${vencidosCount > 1 ? "s" : ""}`}
              />
              <p className="text-muted-foreground">
                Atualize o documento vencido para manter a documentação da
                organização em dia e evitar pendências em editais, habilitações
                e prestações de contas.
              </p>
            </div>
          </div>
        )}

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
                    Nome do documento
                  </FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(e) => setDraftField("nome", e.target.value)}
                    placeholder="Digite o tipo, organização ou órgão emissor"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipo">
                    Tipo de documento
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipo"
                    options={tipoOptions}
                    value={draft.tipo}
                    onChange={(value) => setDraftField("tipo", value)}
                    placeholder="Todos os tipos"
                    searchable
                    searchPlaceholder="Pesquisar tipo"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroVencimento">Vencimento</FieldLabel>
                  <Input
                    id="filtroVencimento"
                    value={draft.vencimento}
                    onChange={(e) =>
                      setDraftField("vencimento", e.target.value)
                    }
                    placeholder="dd/mm/aaaa"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
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
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
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
              reportTo="/relatorios/documentos"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="documentos"
              canExport={podeBaixar}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum documento cadastrado."
                createLabel="Cadastrar documento"
                onCreate={
                  podeCriar ? () => navigate("/documentos/novo") : undefined
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
                        <th className="w-[100px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="tipo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de documento
                        </SortableTh>
                        <SortableTh
                          sortKey="orgaoEmissor"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Órgão emissor
                        </SortableTh>
                        <SortableTh
                          sortKey="dataEmissao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de emissão
                        </SortableTh>
                        <SortableTh
                          sortKey="dataValidade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de validade
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Arquivo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((d) => {
                        const vencido =
                          d.statusDocumento !== "NAO_SE_APLICA" &&
                          isDocumentoVencido(d);
                        const tipo =
                          tipoDocumentoLabels[d.tipoDocumento] ??
                          d.tipoDocumento;
                        return (
                          <tr
                            key={d.id}
                            className={`border-b border-border/50 last:border-0 transition-colors ${
                              vencido
                                ? "bg-destructive/[0.035] hover:bg-destructive/[0.06]"
                                : "hover:bg-muted/25"
                            }`}
                          >
                            <td
                              className={`whitespace-nowrap py-2.5 ${
                                vencido
                                  ? "border-l-[3px] border-l-destructive/45 pl-[21px] pr-6"
                                  : "px-6"
                              }`}
                            >
                              <RowActionsDropdown
                                viewTo={`/documentos/${d.id}`}
                                editTo={
                                  podeEditar
                                    ? `/documentos/${d.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(d.id)
                                    : undefined
                                }
                              />
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={tipo} bold>
                                {tipo}
                              </TableCellText>
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={d.orgaoEmissor ?? "—"} muted>
                                {d.orgaoEmissor ?? "—"}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={formatDateBR(d.dataEmissao)}
                                muted
                              >
                                {formatDateBR(d.dataEmissao)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={formatDateBR(d.dataValidade)}
                                muted
                              >
                                {formatDateBR(d.dataValidade)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusBadge doc={d} />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              {podeBaixar && d.urlDocumento ? (
                                <DocumentActionButton
                                  label="Ver arquivo"
                                  icon={Download}
                                  onClick={() => void handleAbrirArquivo(d)}
                                  title="Ver arquivo"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((d) => {
                    const vencido =
                      d.statusDocumento !== "NAO_SE_APLICA" &&
                      isDocumentoVencido(d);
                    return (
                      <div
                        key={d.id}
                        className={`p-4 ${vencido ? "border-l-[3px] border-l-destructive/45 bg-destructive/[0.035]" : ""}`}
                      >
                        <div className="mb-3 flex items-center gap-1">
                          <RowActionsDropdown
                            viewTo={`/documentos/${d.id}`}
                            editTo={
                              podeEditar
                                ? `/documentos/${d.id}/editar`
                                : undefined
                            }
                            onDelete={
                              podeExcluir
                                ? () => setConfirmDelete(d.id)
                                : undefined
                            }
                          />
                        </div>
                        <p className="font-medium text-foreground">
                          {tipoDocumentoLabels[d.tipoDocumento]}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge doc={d} />
                          {d.dataValidade && (
                            <span className="text-xs text-muted-foreground">
                              Validade:{" "}
                              <span className="font-medium text-foreground">
                                {formatDateBR(d.dataValidade)}
                              </span>
                            </span>
                          )}
                        </div>
                        {podeBaixar && d.urlDocumento && (
                          <div className="mt-3">
                            <DocumentActionButton
                              label="Ver arquivo"
                              icon={Download}
                              onClick={() => void handleAbrirArquivo(d)}
                              title="Ver arquivo"
                            />
                          </div>
                        )}
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Documentos"
        href="/wiki/institucional/documentos"
      />
    </AppLayout>
  );
}

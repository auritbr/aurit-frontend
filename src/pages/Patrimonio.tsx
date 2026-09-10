import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Download,
  FileDown,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { AppLayout } from "@/components/AppLayout";
import { DataTablePagination } from "@/components/DataTablePagination";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SortableTh } from "@/components/list/SortableTh";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deletePatrimonio,
  estadoConservacaoLabel,
  getOrganizacoesPatrimonio,
  getPatrimonioNotaFiscalDownloadUrl,
  getPatrimonios,
  getProjetosPatrimonio,
  statusPatrimonioLabel,
  statusPatrimonioOptions,
  tipoPatrimonioLabel,
  tipoPatrimonioOptions,
  type OrganizacaoOption,
  type Patrimonio as PatrimonioItem,
  type ProjetoOption,
} from "@/data/patrimonio";
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import { maskDate } from "@/lib/masks";
import { downloadPatrimonioReport as exportPatrimonioPdf } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { toast } from "sonner";

const PATRIMONIO_NEXT_STEP_KEY = "aurit:patrimonio:next-step-card";

const sortByOptions = [
  { value: "nomePatrimonio", label: "Nome do bem" },
  { value: "numeroPatrimonio", label: "Número de identificação" },
  { value: "tipoPatrimonio", label: "Categoria" },
  { value: "statusPatrimonio", label: "Situação" },
  { value: "dataAquisicao", label: "Data de aquisição" },
  { value: "valorPatrimonio", label: "Valor" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface PatrimonioFiltros {
  bem: string;
  numero: string;
  categoria: string[];
  situacao: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

interface NextStepData {
  titulo: string;
  descricao?: string;
  acaoLabel?: string;
  acaoUrl?: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const emptyFiltros: PatrimonioFiltros = {
  bem: "",
  numero: "",
  categoria: [],
  situacao: [],
  sortBy: "nomePatrimonio",
  sortDir: "asc",
};

const sortDirLabels: Record<SortDir, string> = {
  asc: "A–Z",
  desc: "Z–A",
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
) => options.find((option) => option.value === value)?.label ?? value;

const formatCurrency = (value?: number) =>
  value == null
    ? "—"
    : value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

export default function Patrimonio() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nextStep, setNextStep] = useState<NextStepData | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "patrimonio:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<PatrimonioFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<PatrimonioFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    getPermissoesUsuarioLogadoPorModulo("PATRIMONIO")
      .then((data) => active && setPermissoes(data))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(PATRIMONIO_NEXT_STEP_KEY);
    if (!raw) return;

    try {
      setNextStep(JSON.parse(raw) as NextStepData);
    } catch {
      setNextStep(null);
    }

    sessionStorage.removeItem(PATRIMONIO_NEXT_STEP_KEY);
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;
    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      getPatrimonios(),
      getOrganizacoesPatrimonio(),
      getProjetosPatrimonio(),
    ])
      .then(([patrimonios, organizacoesData, projetosData]) => {
        if (!active) return;
        setItems(
          patrimonios.map((item) => ({
            ...item,
            dataAquisicao: maskDate(item.dataAquisicao),
          })),
        );
        setOrganizacoes(organizacoesData);
        setProjetos(projetosData);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar patrimônios.";

        if (isPlanoAccessDenied(message)) {
          setAccessDenied(true);
          return;
        }

        toast.error(message);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const filtered = useMemo(() => {
    const bem = normalize(filtros.bem);
    const numero = normalize(filtros.numero);

    const result = items.filter((item) => {
      if (bem && !normalize(item.nomePatrimonio).includes(bem)) return false;
      if (numero && !normalize(item.numeroPatrimonio).includes(numero)) {
        return false;
      }
      if (
        filtros.categoria.length &&
        !filtros.categoria.includes(item.tipoPatrimonio)
      ) {
        return false;
      }
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(item.statusPatrimonio)
      ) {
        return false;
      }
      return true;
    });

    const sortValue = (item: PatrimonioItem): string | number => {
      switch (filtros.sortBy) {
        case "numeroPatrimonio":
          return item.numeroPatrimonio;
        case "tipoPatrimonio":
          return tipoPatrimonioLabel(item.tipoPatrimonio);
        case "statusPatrimonio":
          return statusPatrimonioLabel(item.statusPatrimonio);
        case "dataAquisicao": {
          const [day, month, year] = item.dataAquisicao.split("/");
          return `${year ?? ""}${month ?? ""}${day ?? ""}`;
        }
        case "valorPatrimonio":
          return item.valorPatrimonio ?? -1;
        default:
          return item.nomePatrimonio;
      }
    };

    return [...result].sort((a, b) => {
      const valueA = sortValue(a);
      const valueB = sortValue(b);
      const comparison =
        typeof valueA === "number" && typeof valueB === "number"
          ? valueA - valueB
          : String(valueA).localeCompare(String(valueB), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? comparison : -comparison;
    });
  }, [items, filtros]);

  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const applyFiltros = (next: PatrimonioFiltros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
    setSearching(true);
    window.setTimeout(() => setSearching(false), 180);
  };

  const setDraftField = <K extends keyof PatrimonioFiltros>(
    key: K,
    value: PatrimonioFiltros[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));

  const activeFilters: ActiveFilterItem[] = [];
  if (filtros.bem.trim()) {
    activeFilters.push({
      id: "bem",
      label: "Bem",
      value: filtros.bem.trim(),
      onRemove: () => applyFiltros({ ...filtros, bem: "" }),
    });
  }
  if (filtros.numero.trim()) {
    activeFilters.push({
      id: "numero",
      label: "Número de identificação",
      value: filtros.numero.trim(),
      onRemove: () => applyFiltros({ ...filtros, numero: "" }),
    });
  }
  filtros.categoria.forEach((value) =>
    activeFilters.push({
      id: `categoria-${value}`,
      label: "Categoria",
      value: labelOf(tipoPatrimonioOptions, value),
      onRemove: () =>
        applyFiltros({
          ...filtros,
          categoria: filtros.categoria.filter((item) => item !== value),
        }),
    }),
  );
  filtros.situacao.forEach((value) =>
    activeFilters.push({
      id: `situacao-${value}`,
      label: "Situação",
      value: labelOf(statusPatrimonioOptions, value),
      onRemove: () =>
        applyFiltros({
          ...filtros,
          situacao: filtros.situacao.filter((item) => item !== value),
        }),
    }),
  );
  if (
    filtros.sortBy !== emptyFiltros.sortBy ||
    filtros.sortDir !== emptyFiltros.sortDir
  ) {
    activeFilters.push({
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

  const toggleSort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const organizacaoNome = (id?: number | null) =>
    organizacoes.find((item) => Number(item.id) === Number(id))?.nome ?? "—";

  const projetoNome = (id?: number | null) =>
    projetos.find((item) => Number(item.id) === Number(id))?.nome ?? "—";

  const exportColumns = [
    { header: "Número", key: "numeroPatrimonio" },
    { header: "Nome do bem", key: "nomePatrimonio" },
    { header: "Categoria", key: "categoriaLabel" },
    { header: "Conservação", key: "conservacaoLabel" },
    { header: "Situação", key: "situacaoLabel" },
    { header: "Data de aquisição", key: "dataAquisicao" },
    { header: "Valor", key: "valorLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      categoriaLabel: tipoPatrimonioLabel(item.tipoPatrimonio),
      conservacaoLabel: estadoConservacaoLabel(item.estadoConservacao),
      situacaoLabel: statusPatrimonioLabel(item.statusPatrimonio),
      valorLabel: formatCurrency(item.valorPatrimonio),
    }));

  async function abrirNotaFiscal(item: PatrimonioItem) {
    try {
      const url = await getPatrimonioNotaFiscalDownloadUrl(item.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a nota fiscal.",
      );
    }
  }

  async function gerarPdf(item: PatrimonioItem) {
    let notaFiscalUrl = "";
    if (item.urlNotaFiscal) {
      try {
        notaFiscalUrl = await getPatrimonioNotaFiscalDownloadUrl(item.id);
      } catch {
        notaFiscalUrl = "";
      }
    }

    const pdfData = {
      ...item,
      urlNotaFiscal: notaFiscalUrl,
      tipoPatrimonio: tipoPatrimonioLabel(item.tipoPatrimonio),
      estadoConservacao: estadoConservacaoLabel(item.estadoConservacao),
      statusPatrimonio: statusPatrimonioLabel(item.statusPatrimonio),
      organizacao: organizacaoNome(item.organizacaoId),
      projeto: projetoNome(item.projetoId),
    };

    await exportPatrimonioPdf(pdfData);
  }

  async function handleDelete() {
    if (!confirmDelete) return;

    try {
      await deletePatrimonio(confirmDelete);
      setItems((previous) =>
        previous.filter((item) => item.id !== confirmDelete),
      );
      toast.success("Patrimônio excluído com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir patrimônio.",
      );
    } finally {
      setConfirmDelete(null);
    }
  }

  const rowActions = (item: PatrimonioItem) => (
    <RowActionsDropdown
      reportEndpoint={
        podeGerarPdf ? `/patrimonios/${item.id}/relatorio` : undefined
      }
      reportFilename={`patrimonio-${item.id}.pdf`}
      viewTo={`/patrimonio/${item.id}`}
      editTo={podeEditar ? `/patrimonio/${item.id}/editar` : undefined}
      onDelete={podeExcluir ? () => setConfirmDelete(item.id) : undefined}
      extraItems={[
        ...(podeCriar
          ? [
              {
                label: "Duplicar",
                icon: Copy,
                onClick: () => navigate(`/patrimonio/novo?duplicar=${item.id}`),
              },
            ]
          : []),
        ...(podeBaixar && item.urlNotaFiscal
          ? [
              {
                label: "Abrir nota fiscal",
                icon: Download,
                onClick: () => void abrirNotaFiscal(item),
              },
            ]
          : []),
      ]}
    />
  );

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

  if (accessDenied) {
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
          title="Patrimônios"
          tooltip="Nesta página são cadastrados e acompanhados os bens patrimoniais da organização, como equipamentos, instrumentos, mobiliário e outros materiais permanentes. Os registros reúnem informações de identificação, características, aquisição, vínculo institucional, estado de conservação e situação atual, apoiando o controle, os inventários, os relatórios e as prestações de contas."
          objective="Cadastre e mantenha atualizadas as informações dos bens patrimoniais da organização, acompanhando sua identificação, aquisição, vínculo, estado de conservação e situação atual. Esse controle apoia a gestão do patrimônio, os inventários, os relatórios e as prestações de contas."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/patrimonio/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar patrimônio
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyFiltros(draft);
              }}
              noValidate
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroBem">Patrimônio</FieldLabel>
                  <Input
                    id="filtroBem"
                    value={draft.bem}
                    onChange={(event) =>
                      setDraftField("bem", event.target.value)
                    }
                    placeholder="Digite o nome do bem"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="filtroNumero">
                    Número de identificação
                  </FieldLabel>
                  <Input
                    id="filtroNumero"
                    value={draft.numero}
                    onChange={(event) =>
                      setDraftField("numero", event.target.value)
                    }
                    placeholder="Ex.: PAT-001"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="filtroCategoria">Categoria</FieldLabel>
                  <FilterMultiSelect
                    id="filtroCategoria"
                    options={tipoPatrimonioOptions}
                    value={draft.categoria}
                    onChange={(value) => setDraftField("categoria", value)}
                    placeholder="Todas as categorias"
                    summaryNoun="categorias selecionadas"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusPatrimonioOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
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
                  onClick={() => applyFiltros(emptyFiltros)}
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
                  <Search className="h-4 w-4" aria-hidden />
                  {searching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>

          <ActiveFilters
            items={activeFilters}
            onClearAll={() => applyFiltros(emptyFiltros)}
          />

          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/patrimonios"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="patrimonio"
              canExport={podeBaixar}
            />

            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Carregando patrimônios...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum bem cadastrado."
                createLabel="Cadastrar bem"
                onCreate={
                  podeCriar ? () => navigate("/patrimonio/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={() => applyFiltros(emptyFiltros)}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1120px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="numeroPatrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Número
                        </SortableTh>
                        <SortableTh
                          sortKey="nomePatrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome
                        </SortableTh>
                        <SortableTh
                          sortKey="tipoPatrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Categoria
                        </SortableTh>
                        <SortableTh
                          sortKey="dataAquisicao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Aquisição
                        </SortableTh>
                        <SortableTh
                          sortKey="valorPatrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                          className="text-right"
                        >
                          Valor
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Conservação
                        </th>
                        <SortableTh
                          sortKey="statusPatrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                      </tr>
                    </thead>

                    <tbody>
                      {paginated.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            {rowActions(item)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.numeroPatrimonio} bold>
                              {item.numeroPatrimonio}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={item.nomePatrimonio}>
                              {item.nomePatrimonio}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={tipoPatrimonioLabel(item.tipoPatrimonio)}
                            >
                              {tipoPatrimonioLabel(item.tipoPatrimonio)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.dataAquisicao}>
                              {item.dataAquisicao}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-right">
                            <TableCellText
                              text={formatCurrency(item.valorPatrimonio)}
                              muted={item.valorPatrimonio == null}
                            >
                              {formatCurrency(item.valorPatrimonio)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.estadoConservacao}
                              ariaLabelPrefix="Estado de conservação"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.statusPatrimonio}
                              context="patrimonio"
                              ariaLabelPrefix="Situação do bem"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        {rowActions(item)}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.numeroPatrimonio}
                      </p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {item.nomePatrimonio}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {tipoPatrimonioLabel(item.tipoPatrimonio)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill
                          status={item.estadoConservacao}
                          ariaLabelPrefix="Estado de conservação"
                        />
                        <StatusPill
                          status={item.statusPatrimonio}
                          context="patrimonio"
                          ariaLabelPrefix="Situação do bem"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Aquisição: {item.dataAquisicao}</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(item.valorPatrimonio)}
                        </span>
                      </div>
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
            <AlertDialogTitle>Excluir patrimônio?</AlertDialogTitle>
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
        pageTitle="Patrimônio"
        href="https://www.aurit.com.br/wiki/patrimonio/patrimonio"
      />
    </AppLayout>
  );
}

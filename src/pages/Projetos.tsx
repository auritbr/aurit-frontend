import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileDown,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { downloadProjetoReport as exportProjetoPdf } from "@/lib/individualReportDownload";
import { getColaboradores, type Colaborador } from "@/data/colaboradores";
import {
  areaAtuacaoOptions,
  areasAtuacaoLabel,
  deleteProjeto,
  getOrganizacoes,
  getProjetos,
  origemProjetoLabel,
  origemProjetoOptions,
  statusProjetoLabel,
  statusProjetoOptions,
  type OrganizacaoOption,
  type Projeto,
} from "@/data/projetos";
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

type SortBy =
  | "nome"
  | "area"
  | "origem"
  | "status"
  | "organizacao"
  | "dataInicio"
  | "dataFim";
type SortDir = "asc" | "desc";

interface ProjetoFiltros {
  nome: string;
  organizacao: string;
  status: string[];
  areas: string[];
  origens: string[];
  dataInicio: string;
  dataFim: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

interface ProjetoNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const PROJETO_NEXT_STEP_KEY = "aurit:projetos:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

const sortByOptions: { value: SortBy; label: string }[] = [
  { value: "nome", label: "Nome do projeto" },
  { value: "area", label: "Área de atuação" },
  { value: "origem", label: "Origem" },
  { value: "status", label: "Situação" },
  { value: "organizacao", label: "Organização" },
  { value: "dataInicio", label: "Data de início" },
  { value: "dataFim", label: "Data de término" },
];

const emptyFiltros: ProjetoFiltros = {
  nome: "",
  organizacao: "",
  status: [],
  areas: [],
  origens: [],
  dataInicio: "",
  dataFim: "",
  sortBy: "nome",
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
) => options.find((option) => option.value === value)?.label ?? value;

function comparableDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function sortDirLabel(sortBy: SortBy, dir: SortDir) {
  if (sortBy === "dataInicio" || sortBy === "dataFim") {
    return dir === "asc" ? "Mais antigos primeiro" : "Mais recentes primeiro";
  }
  return dir === "asc" ? "A–Z" : "Z–A";
}

export default function Projetos() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Projeto[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<ProjetoNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "projetos:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<ProjetoFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<ProjetoFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

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
        const data = await getPermissoesUsuarioLogadoPorModulo("PROJETOS");
        if (active) setPermissoes(data);
      } catch (error) {
        console.error(error);
        if (active) setPermissoes(permissoesVazias);
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
    const raw = sessionStorage.getItem(PROJETO_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw) as ProjetoNextStepCardData);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(PROJETO_NEXT_STEP_KEY);
    const timer = window.setTimeout(
      () => setNextStepCard(null),
      NEXT_STEP_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
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
      const [projetosData, organizacoesData, colaboradoresData] =
        await Promise.all([
          getProjetos(),
          getOrganizacoes(),
          getColaboradores(),
        ]);
      setItems(projetosData);
      setOrganizacoes(organizacoesData);
      setColaboradores(colaboradoresData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar projetos.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const nomeOrganizacao = useCallback(
    (organizacaoId: number | null) =>
      organizacaoId
        ? (organizacoes.find(
            (item) => Number(item.id) === Number(organizacaoId),
          )?.nome ?? "—")
        : "—",
    [organizacoes],
  );

  const nomesColaboradores = (ids: number[] = []) =>
    ids
      .map(
        (id) =>
          colaboradores.find((item) => String(item.id) === String(id))
            ?.nomeCompleto,
      )
      .filter((nome): nome is string => Boolean(nome));

  const setDraftField = <K extends keyof ProjetoFiltros>(
    key: K,
    value: ProjetoFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = useCallback((next: ProjetoFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    window.setTimeout(() => setSearching(false), 180);
  }, []);

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const organizacao = normalize(filtros.organizacao);
    const inicio = comparableDate(filtros.dataInicio);
    const fim = comparableDate(filtros.dataFim);

    const result = items.filter((item) => {
      if (nome && !normalize(item.nomeProjeto).includes(nome)) return false;
      if (
        organizacao &&
        !normalize(nomeOrganizacao(item.organizacaoId)).includes(organizacao)
      )
        return false;
      if (filtros.status.length && !filtros.status.includes(item.status))
        return false;
      if (
        filtros.areas.length &&
        !item.areasAtuacao.some((area) => filtros.areas.includes(area))
      )
        return false;
      if (
        filtros.origens.length &&
        !filtros.origens.includes(item.origemProjeto)
      )
        return false;
      if (inicio && comparableDate(item.dataInicio) < inicio) return false;
      if (fim && comparableDate(item.dataFim) > fim) return false;
      return true;
    });

    const sortValue = (item: Projeto) => {
      switch (filtros.sortBy) {
        case "area":
          return areasAtuacaoLabel(item.areasAtuacao);
        case "origem":
          return origemProjetoLabel(item.origemProjeto);
        case "status":
          return statusProjetoLabel(item.status);
        case "organizacao":
          return nomeOrganizacao(item.organizacaoId);
        case "dataInicio":
          return comparableDate(item.dataInicio);
        case "dataFim":
          return comparableDate(item.dataFim);
        default:
          return item.nomeProjeto;
      }
    };

    return [...result].sort((a, b) => {
      const compare = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [filtros, items, nomeOrganizacao]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const removeText = (
      key: "nome" | "organizacao" | "dataInicio" | "dataFim",
    ) => applyFiltros({ ...filtros, [key]: "" });
    const removeList = (key: "status" | "areas" | "origens", value: string) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((item) => item !== value),
      });

    if (filtros.nome.trim())
      list.push({
        id: "nome",
        label: "Nome do projeto",
        value: filtros.nome.trim(),
        onRemove: () => removeText("nome"),
      });
    if (filtros.organizacao.trim())
      list.push({
        id: "organizacao",
        label: "Organização",
        value: filtros.organizacao.trim(),
        onRemove: () => removeText("organizacao"),
      });
    if (filtros.dataInicio)
      list.push({
        id: "inicio",
        label: "Início a partir de",
        value: filtros.dataInicio,
        onRemove: () => removeText("dataInicio"),
      });
    if (filtros.dataFim)
      list.push({
        id: "fim",
        label: "Término até",
        value: filtros.dataFim,
        onRemove: () => removeText("dataFim"),
      });
    filtros.status.forEach((value) =>
      list.push({
        id: `status-${value}`,
        label: "Situação",
        value: labelOf(statusProjetoOptions, value),
        onRemove: () => removeList("status", value),
      }),
    );
    filtros.areas.forEach((value) =>
      list.push({
        id: `area-${value}`,
        label: "Área",
        value: labelOf(areaAtuacaoOptions, value),
        onRemove: () => removeList("areas", value),
      }),
    );
    filtros.origens.forEach((value) =>
      list.push({
        id: `origem-${value}`,
        label: "Origem",
        value: labelOf(origemProjetoOptions, value),
        onRemove: () => removeList("origens", value),
      }),
    );
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${sortDirLabel(
          filtros.sortBy,
          filtros.sortDir,
        )}`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return list;
  }, [applyFiltros, filtros]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  async function handleDelete() {
    if (!confirmDelete) return;
    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir projetos.");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteProjeto(confirmDelete);
      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Projeto excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir projeto.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const projetoPdfData = (item: Projeto) => ({
    id: String(item.id),
    nomeProjeto: item.nomeProjeto,
    descricao: item.descricao,
    objetivoGeral: item.objetivoGeral,
    publicoAlvo: item.publicoAlvo,
    acoesAcessibilidade: item.acoesAcessibilidade,
    localExecucao: item.localExecucao,
    dataInicio: item.dataInicio,
    dataFim: item.dataFim,
    status: statusProjetoLabel(item.status),
    areaAtuacao: areasAtuacaoLabel(item.areasAtuacao),
    origemProjeto: origemProjetoLabel(item.origemProjeto),
    organizacao: nomeOrganizacao(item.organizacaoId),
    colaboradores: nomesColaboradores(item.colaboradoresIds),
    objetivosEspecificos: item.objetivos.map(
      (objetivo) => objetivo.objetivoEspecifico,
    ),
  });

  async function handleExportPdf(item: Projeto) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }
    await exportProjetoPdf(projetoPdfData(item));
  }

  const exportColumns = [
    { header: "Nome do projeto", key: "nomeProjeto" },
    { header: "Área de atuação", key: "areaLabel" },
    { header: "Origem", key: "origemLabel" },
    { header: "Data de início", key: "dataInicio" },
    { header: "Data de término", key: "dataFim" },
    { header: "Situação", key: "statusLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      areaLabel: areasAtuacaoLabel(item.areasAtuacao),
      origemLabel: origemProjetoLabel(item.origemProjeto),
      statusLabel: statusProjetoLabel(item.status),
    }));

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDeniedMessage)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Projetos"
          tooltip="Nesta página são cadastrados e acompanhados os projetos da organização, com informações sobre identificação, proposta, objetivos, público-alvo, acessibilidade, local e período de execução, situação atual, organização responsável e equipe envolvida. Esses dados apoiam o planejamento, a execução, o acompanhamento e a prestação de contas dos projetos."
          objective="Cadastre e acompanhe os projetos da organização, reunindo as informações necessárias para planejar sua execução, definir objetivos e públicos, organizar responsáveis e equipe, acompanhar prazos e registrar dados utilizados em relatórios e prestações de contas."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/projetos/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar projeto
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
                <FilterInput
                  id="filtroNome"
                  label="Nome do projeto"
                  value={draft.nome}
                  placeholder="Digite o nome do projeto"
                  onChange={(value) => setDraftField("nome", value)}
                />
                <div>
                  <FieldLabel htmlFor="filtroStatus">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroStatus"
                    options={statusProjetoOptions}
                    value={draft.status}
                    onChange={(value) => setDraftField("status", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAreas">Área de atuação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroAreas"
                    options={areaAtuacaoOptions}
                    value={draft.areas}
                    onChange={(value) => setDraftField("areas", value)}
                    placeholder="Todas as áreas"
                    searchable
                    searchPlaceholder="Pesquisar área"
                    summaryNoun="áreas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroOrigem">Origem</FieldLabel>
                  <FilterMultiSelect
                    id="filtroOrigem"
                    options={origemProjetoOptions}
                    value={draft.origens}
                    onChange={(value) => setDraftField("origens", value)}
                    placeholder="Todas as origens"
                    summaryNoun="origens selecionadas"
                  />
                </div>
                <FilterInput
                  id="filtroDataInicio"
                  label="Início a partir de"
                  type="date"
                  value={draft.dataInicio}
                  onChange={(value) => setDraftField("dataInicio", value)}
                />
                <FilterInput
                  id="filtroDataFim"
                  label="Término até"
                  type="date"
                  value={draft.dataFim}
                  onChange={(value) => setDraftField("dataFim", value)}
                />
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
                      <SelectItem value="asc">
                        {sortDirLabel(draft.sortBy, "asc")}
                      </SelectItem>
                      <SelectItem value="desc">
                        {sortDirLabel(draft.sortBy, "desc")}
                      </SelectItem>
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
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
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
              reportTo="/relatorios/projetos"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="projetos"
              canExport={podeGerarPdf}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum projeto cadastrado."
                createLabel={podeCriar ? "Cadastrar projeto" : undefined}
                onCreate={
                  podeCriar ? () => navigate("/projetos/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1180px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="nome"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome do projeto
                        </SortableTh>
                        <SortableTh
                          sortKey="area"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Área de atuação
                        </SortableTh>
                        <SortableTh
                          sortKey="origem"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Origem
                        </SortableTh>
                        <SortableTh
                          sortKey="dataInicio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de início
                        </SortableTh>
                        <SortableTh
                          sortKey="dataFim"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de término
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
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
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/projetos/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`projeto-${item.id}.pdf`}
                              viewTo={`/projetos/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/projetos/${item.id}/editar`
                                  : undefined
                              }
                              extraItems={[
                                {
                                  label: "Plano de Trabalho",
                                  to: `/projetos/${item.id}/plano-trabalho`,
                                  icon: ClipboardList,
                                },
                              ]}
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item.id)
                                  : undefined
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.nomeProjeto} bold>
                              {item.nomeProjeto}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <div className="flex flex-nowrap gap-1.5">
                              {item.areasAtuacao.slice(0, 2).map((area) => (
                                <StatusPill
                                  key={area}
                                  status={area}
                                  ariaLabelPrefix="Área de atuação"
                                />
                              ))}
                              {item.areasAtuacao.length > 2 && (
                                <span
                                  className="status-pill status-na"
                                  title={areasAtuacaoLabel(
                                    item.areasAtuacao.slice(2),
                                  )}
                                >
                                  +{item.areasAtuacao.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.origemProjeto}
                              ariaLabelPrefix="Origem do projeto"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {item.dataInicio || "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {item.dataFim || "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusProjetoLabel(item.status)}
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
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/projetos/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`projeto-${item.id}.pdf`}
                          viewTo={`/projetos/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/projetos/${item.id}/editar`
                              : undefined
                          }
                          extraItems={[
                            {
                              label: "Plano de Trabalho",
                              to: `/projetos/${item.id}/plano-trabalho`,
                              icon: ClipboardList,
                            },
                          ]}
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {item.nomeProjeto}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {areasAtuacaoLabel(item.areasAtuacao)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={statusProjetoLabel(item.status)} />
                        <StatusPill
                          status={item.origemProjeto}
                          ariaLabelPrefix="Origem do projeto"
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.dataInicio || "—"} — {item.dataFim || "—"}
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
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o projeto esteja vinculado a
              outros registros, o sistema pode impedir a exclusão para preservar
              o histórico.
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
        pageTitle="Projetos"
        href="https://www.aurit.com.br/wiki/projetos/projetos"
      />
    </AppLayout>
  );
}

function FilterInput({
  id,
  label,
  value,
  placeholder,
  type,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
      />
    </div>
  );
}

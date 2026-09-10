import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Copy,
  Loader2,
  Plus,
  Repeat,
  RotateCcw,
  Search,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
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
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
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
  deletePlanoAula,
  getAtividadesPlanoAulaOptions,
  getColaboradoresPlanoAulaOptions,
  getPlanosAula,
  getTurmasPlanoAulaOptions,
  statusPlanoAulaOptions,
  statusPlanoAulaValueToLabel,
  type AtividadeOption,
  type ColaboradorOption,
  type PlanoAula,
  type TurmaOption,
} from "@/data/planosAula";
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
  | "nomePlanoAula"
  | "atividade"
  | "turmas"
  | "colaborador"
  | "inicio"
  | "fim"
  | "status"
  | "conteudo";
type SortDir = "asc" | "desc";

interface PlanoFiltros {
  texto: string;
  atividades: string[];
  turmas: string[];
  responsaveis: string[];
  status: string[];
  dataDe: string;
  dataAte: string;
  reposicao: "todos" | "sim" | "nao";
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: PlanoFiltros = {
  texto: "",
  atividades: [],
  turmas: [],
  responsaveis: [],
  status: [],
  dataDe: "",
  dataAte: "",
  reposicao: "todos",
  sortBy: "inicio",
  sortDir: "asc",
};

const sortByOptions: Array<{ value: SortBy; label: string }> = [
  { value: "nomePlanoAula", label: "Plano de aula" },
  { value: "atividade", label: "Atividade" },
  { value: "turmas", label: "Turmas" },
  { value: "colaborador", label: "Responsável" },
  { value: "inicio", label: "Data de início" },
  { value: "fim", label: "Data de fim" },
  { value: "status", label: "Status" },
  { value: "conteudo", label: "Conteúdo" },
];

const reposicaoLabels: Record<PlanoFiltros["reposicao"], string> = {
  todos: "Todas",
  sim: "Somente reposições",
  nao: "Sem reposição",
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

function formatDateBR(value?: string | null) {
  if (!value) return "—";
  const date = value.length >= 10 ? value.slice(0, 10) : value;
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function PlanosAula() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanoAula[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "planos-aula:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<PlanoFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<PlanoFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const [planosData, atividadesData, turmasData, colaboradoresData] =
        await Promise.all([
          getPlanosAula(),
          getAtividadesPlanoAulaOptions(),
          getTurmasPlanoAulaOptions(),
          getColaboradoresPlanoAulaOptions(),
        ]);
      setItems(planosData);
      setAtividades(atividadesData);
      setTurmas(turmasData);
      setColaboradores(colaboradoresData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os planos de aula.";
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

  const atividadeNome = useCallback(
    (id?: string | null) => {
      if (!id) return "—";
      return (
        atividades.find((item) => String(item.id) === String(id))
          ?.nomeAtividade ?? `Atividade ${id}`
      );
    },
    [atividades],
  );

  const turmaNome = useCallback(
    (id?: string | null, fallback?: string | null) => {
      if (!id) return fallback || "—";
      return (
        fallback ||
        turmas.find((item) => String(item.id) === String(id))?.nomeTurma ||
        `Turma ${id}`
      );
    },
    [turmas],
  );

  const planoTurmasNome = useCallback(
    (plano: PlanoAula) => {
      const ids = plano.turmaIds?.length
        ? plano.turmaIds
        : plano.turmaId
          ? [plano.turmaId]
          : [];
      if (ids.length) {
        return ids
          .map((id, index) =>
            turmaNome(
              id,
              plano.turmaNomes?.[index] ||
                plano.turmas?.find((turma) => String(turma.id) === String(id))
                  ?.nomeTurma,
            ),
          )
          .join(", ");
      }
      return plano.turmaNomes?.join(", ") || plano.turmaNome || "—";
    },
    [turmaNome],
  );

  const colaboradorNome = useCallback(
    (id?: string | null) => {
      if (!id) return "—";
      return (
        colaboradores.find((item) => String(item.id) === String(id))?.nome ??
        `Colaborador ${id}`
      );
    },
    [colaboradores],
  );

  const atividadeOptions = useMemo(
    () =>
      atividades.map((item) => ({
        value: item.id,
        label: item.nomeAtividade,
      })),
    [atividades],
  );
  const turmaOptions = useMemo(
    () => turmas.map((item) => ({ value: item.id, label: item.nomeTurma })),
    [turmas],
  );
  const responsavelOptions = useMemo(
    () => colaboradores.map((item) => ({ value: item.id, label: item.nome })),
    [colaboradores],
  );

  const setDraftField = <K extends keyof PlanoFiltros>(
    key: K,
    value: PlanoFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = useCallback((next: PlanoFiltros) => {
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
    const texto = normalize(filtros.texto);
    const result = items.filter((plano) => {
      if (
        texto &&
        !normalize(
          [
            plano.nomePlanoAula,
            plano.conteudo,
            plano.observacao ?? "",
            atividadeNome(plano.atividadeId),
            planoTurmasNome(plano),
            colaboradorNome(plano.colaboradorId),
          ].join(" "),
        ).includes(texto)
      )
        return false;
      if (
        filtros.atividades.length &&
        !filtros.atividades.includes(plano.atividadeId)
      )
        return false;
      const idsTurma = plano.turmaIds?.length
        ? plano.turmaIds
        : plano.turmaId
          ? [plano.turmaId]
          : [];
      if (
        filtros.turmas.length &&
        !idsTurma.some((id) => filtros.turmas.includes(id))
      )
        return false;
      if (
        filtros.responsaveis.length &&
        !filtros.responsaveis.includes(plano.colaboradorId)
      )
        return false;
      if (
        filtros.status.length &&
        !filtros.status.includes(plano.statusPlanoAula)
      )
        return false;
      const dataInicio = plano.dataInicio?.slice(0, 10) ?? "";
      if (filtros.dataDe && dataInicio < filtros.dataDe) return false;
      if (filtros.dataAte && dataInicio > filtros.dataAte) return false;
      if (filtros.reposicao === "sim" && !plano.aulaReposicao) return false;
      if (filtros.reposicao === "nao" && plano.aulaReposicao) return false;
      return true;
    });

    const sortValue = (plano: PlanoAula) => {
      switch (filtros.sortBy) {
        case "atividade":
          return atividadeNome(plano.atividadeId);
        case "turmas":
          return planoTurmasNome(plano);
        case "colaborador":
          return colaboradorNome(plano.colaboradorId);
        case "fim":
          return plano.dataFim ?? "";
        case "status":
          return statusPlanoAulaValueToLabel(plano.statusPlanoAula);
        case "conteudo":
          return plano.conteudo ?? "";
        case "nomePlanoAula":
          return plano.nomePlanoAula ?? "";
        default:
          return plano.dataInicio ?? "";
      }
    };

    return [...result].sort((a, b) => {
      const comparison = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        { sensitivity: "base" },
      );
      return filtros.sortDir === "asc" ? comparison : -comparison;
    });
  }, [atividadeNome, colaboradorNome, filtros, items, planoTurmasNome]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.texto.trim())
      list.push({
        id: "texto",
        label: "Plano de aula",
        value: filtros.texto.trim(),
        onRemove: () => applyFiltros({ ...filtros, texto: "" }),
      });
    const addList = (
      key: "atividades" | "turmas" | "responsaveis" | "status",
      label: string,
      options: readonly { value: string; label: string }[],
    ) =>
      filtros[key].forEach((value) =>
        list.push({
          id: `${key}-${value}`,
          label,
          value: labelOf(options, value),
          onRemove: () =>
            applyFiltros({
              ...filtros,
              [key]: filtros[key].filter((item) => item !== value),
            }),
        }),
      );
    addList("atividades", "Atividade", atividadeOptions);
    addList("turmas", "Turma", turmaOptions);
    addList("responsaveis", "Responsável", responsavelOptions);
    addList("status", "Status", statusPlanoAulaOptions);
    if (filtros.dataDe)
      list.push({
        id: "dataDe",
        label: "A partir de",
        value: formatDateBR(filtros.dataDe),
        onRemove: () => applyFiltros({ ...filtros, dataDe: "" }),
      });
    if (filtros.dataAte)
      list.push({
        id: "dataAte",
        label: "Até",
        value: formatDateBR(filtros.dataAte),
        onRemove: () => applyFiltros({ ...filtros, dataAte: "" }),
      });
    if (filtros.reposicao !== "todos")
      list.push({
        id: "reposicao",
        label: "Reposição",
        value: reposicaoLabels[filtros.reposicao],
        onRemove: () => applyFiltros({ ...filtros, reposicao: "todos" }),
      });
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${
          filtros.sortDir === "asc" ? "A–Z" : "Z–A"
        }`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return list;
  }, [
    atividadeOptions,
    applyFiltros,
    filtros,
    responsavelOptions,
    turmaOptions,
  ]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deletePlanoAula(Number(confirmDelete));
      setItems((prev) =>
        prev.filter((item) => String(item.id) !== String(confirmDelete)),
      );
      toast.success("Plano de aula excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o plano de aula.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }
      console.error(error);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const exportColumns = [
    { header: "Plano de aula", key: "nomePlanoAula" },
    { header: "Atividade", key: "atividadeLabel" },
    { header: "Turmas", key: "turmasLabel" },
    { header: "Responsável", key: "responsavelLabel" },
    { header: "Data de início", key: "dataInicioLabel" },
    { header: "Data de fim", key: "dataFimLabel" },
    { header: "Status", key: "statusLabel" },
  ];

  const getExportData = () =>
    filtered.map((plano) => ({
      ...plano,
      atividadeLabel: atividadeNome(plano.atividadeId),
      turmasLabel: planoTurmasNome(plano),
      responsavelLabel: colaboradorNome(plano.colaboradorId),
      dataInicioLabel: formatDateBR(plano.dataInicio),
      dataFimLabel: formatDateBR(plano.dataFim),
      statusLabel: statusPlanoAulaValueToLabel(plano.statusPlanoAula),
    }));

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Planos de Aula"
          tooltip="Nesta página são cadastrados e organizados os planos de aula vinculados às atividades e turmas, com informações sobre conteúdo previsto, período de realização, situação e colaborador responsável. Esses registros ajudam a planejar o que será desenvolvido nos encontros e a acompanhar a realização das aulas."
          objective="Organize o planejamento das aulas, definindo onde o plano será aplicado, o conteúdo previsto, o período de realização, o responsável e sua situação. Esses registros ajudam a orientar a execução dos encontros e a manter o planejamento das atividades organizado e atualizado."
          actions={
            <Button
              type="button"
              variant="glassPrimary"
              onClick={() => navigate("/planos-aula/novo")}
              className="h-9 gap-2 px-4"
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              Cadastrar plano de aula
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de planos"
            value={items.length}
            icon={ClipboardList}
            variant="neutral"
          />
          <SummaryStatCard
            title="Planejados"
            value={
              items.filter((item) => item.statusPlanoAula === "PLANEJADO")
                .length
            }
            icon={CalendarDays}
            variant="info"
          />
          <SummaryStatCard
            title="Concluídos"
            value={
              items.filter((item) => item.statusPlanoAula === "REALIZADO")
                .length
            }
            icon={CheckCircle}
            variant="success"
          />
          <SummaryStatCard
            title="Reposições"
            value={items.filter((item) => item.aulaReposicao).length}
            icon={Repeat}
            variant="warning"
          />
        </div>

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroTexto">Plano de aula</FieldLabel>
                  <Input
                    id="filtroTexto"
                    value={draft.texto}
                    onChange={(event) =>
                      setDraftField("texto", event.target.value)
                    }
                    placeholder="Digite o plano, conteúdo ou responsável"
                    className={inputClass}
                  />
                </div>
                <FilterField
                  id="filtroAtividade"
                  label="Atividade"
                  options={atividadeOptions}
                  value={draft.atividades}
                  onChange={(value) => setDraftField("atividades", value)}
                  placeholder="Todas as atividades"
                  searchable
                />
                <FilterField
                  id="filtroTurma"
                  label="Turmas"
                  options={turmaOptions}
                  value={draft.turmas}
                  onChange={(value) => setDraftField("turmas", value)}
                  placeholder="Todas as turmas"
                  searchable
                />
                <FilterField
                  id="filtroResponsavel"
                  label="Responsável"
                  options={responsavelOptions}
                  value={draft.responsaveis}
                  onChange={(value) => setDraftField("responsaveis", value)}
                  placeholder="Todos os responsáveis"
                  searchable
                />
                <FilterField
                  id="filtroStatus"
                  label="Status"
                  options={statusPlanoAulaOptions}
                  value={draft.status}
                  onChange={(value) => setDraftField("status", value)}
                  placeholder="Todos os status"
                />
                <div>
                  <FieldLabel htmlFor="filtroReposicao">Reposição</FieldLabel>
                  <Select
                    value={draft.reposicao}
                    onValueChange={(value) =>
                      setDraftField(
                        "reposicao",
                        value as PlanoFiltros["reposicao"],
                      )
                    }
                  >
                    <SelectTrigger id="filtroReposicao" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">
                        {reposicaoLabels.todos}
                      </SelectItem>
                      <SelectItem value="sim">{reposicaoLabels.sim}</SelectItem>
                      <SelectItem value="nao">{reposicaoLabels.nao}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DateFilter
                  id="filtroDataDe"
                  label="Início a partir de"
                  value={draft.dataDe}
                  onChange={(value) => setDraftField("dataDe", value)}
                  className={inputClass}
                />
                <DateFilter
                  id="filtroDataAte"
                  label="Início até"
                  value={draft.dataAte}
                  onChange={(value) => setDraftField("dataAte", value)}
                  className={inputClass}
                />
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) =>
                      setDraftField("sortBy", value as SortBy)
                    }
                  >
                    <SelectTrigger id="filtroSortBy" className={inputClass}>
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
                    <SelectTrigger id="filtroSortDir" className={inputClass}>
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
              reportTo="/relatorios/planos-aula"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="planos-aula"
            />
            {loading ? (
              <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum plano de aula cadastrado."
                emptyDescription="Cadastre o primeiro plano para organizar os conteúdos e etapas das aulas."
                createLabel="Cadastrar plano de aula"
                onCreate={() => navigate("/planos-aula/novo")}
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1280px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="nomePlanoAula"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Plano de aula
                        </SortableTh>
                        <SortableTh
                          sortKey="atividade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Atividade
                        </SortableTh>
                        <SortableTh
                          sortKey="turmas"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Turmas
                        </SortableTh>
                        <SortableTh
                          sortKey="colaborador"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Responsável
                        </SortableTh>
                        <SortableTh
                          sortKey="inicio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Início
                        </SortableTh>
                        <SortableTh
                          sortKey="fim"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Fim
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((plano) => (
                        <tr
                          key={plano.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/planos-aula/${plano.id}/relatorio`}
                              reportFilename={`plano-aula-${plano.id}.pdf`}
                              viewTo={`/planos-aula/${plano.id}`}
                              editTo={`/planos-aula/${plano.id}/editar`}
                              onDelete={() => setConfirmDelete(plano.id)}
                              extraItems={[
                                {
                                  label: "Duplicar",
                                  icon: Copy,
                                  onClick: () =>
                                    navigate(
                                      `/planos-aula/novo?duplicar=${plano.id}`,
                                    ),
                                },
                              ]}
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={plano.nomePlanoAula || "—"}
                              bold
                            >
                              {plano.nomePlanoAula || "—"}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={atividadeNome(plano.atividadeId)}
                            >
                              {atividadeNome(plano.atividadeId)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={planoTurmasNome(plano)} muted>
                              {planoTurmasNome(plano)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={colaboradorNome(plano.colaboradorId)}
                            >
                              {colaboradorNome(plano.colaboradorId)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBR(plano.dataInicio)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBR(plano.dataFim)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusPlanoAulaValueToLabel(
                                plano.statusPlanoAula,
                              )}
                              context="plano-aula"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((plano) => (
                    <div key={plano.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={`/planos-aula/${plano.id}/relatorio`}
                          reportFilename={`plano-aula-${plano.id}.pdf`}
                          viewTo={`/planos-aula/${plano.id}`}
                          editTo={`/planos-aula/${plano.id}/editar`}
                          onDelete={() => setConfirmDelete(plano.id)}
                          extraItems={[
                            {
                              label: "Duplicar",
                              icon: Copy,
                              onClick: () =>
                                navigate(
                                  `/planos-aula/novo?duplicar=${plano.id}`,
                                ),
                            },
                          ]}
                        />
                        <StatusPill
                          status={statusPlanoAulaValueToLabel(
                            plano.statusPlanoAula,
                          )}
                          context="plano-aula"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {plano.nomePlanoAula || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {atividadeNome(plano.atividadeId)} ·{" "}
                        {planoTurmasNome(plano)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Início: {formatDateBR(plano.dataInicio)}
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
            <AlertDialogTitle>Excluir plano de aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Plano de Aula"
        href="/wiki/execucao/plano-de-aula"
      />
    </AppLayout>
  );
}

function FilterField({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  searchable,
}: {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FilterMultiSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchable={searchable}
        summaryNoun={`${label.toLowerCase()} selecionados`}
      />
    </div>
  );
}

function DateFilter({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Loader2, Plus, RotateCcw, Search } from "lucide-react";

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
import {
  deleteTurma,
  diaLabel,
  diasSemana,
  getAtividadesOptions,
  getColaboradoresOptions,
  getTurmas,
  nivelTurmaLabel,
  statusTurma,
  statusTurmaLabel,
  type Turma,
} from "@/data/turmas";
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
  | "atividade"
  | "dia"
  | "nivel"
  | "inicio"
  | "fim"
  | "vagas"
  | "status"
  | "colaboradores";
type SortDir = "asc" | "desc";

interface TurmasFiltros {
  nome: string;
  atividade: string;
  responsavel: string;
  situacao: string[];
  periodo: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: TurmasFiltros = {
  nome: "",
  atividade: "",
  responsavel: "",
  situacao: [],
  periodo: [],
  sortBy: "nome",
  sortDir: "asc",
};

const sortByOptions: Array<{ value: SortBy; label: string }> = [
  { value: "nome", label: "Nome da turma" },
  { value: "atividade", label: "Atividade" },
  { value: "colaboradores", label: "Responsáveis" },
  { value: "status", label: "Situação" },
  { value: "dia", label: "Dia da atividade" },
  { value: "nivel", label: "Nível" },
  { value: "inicio", label: "Horário de início" },
  { value: "fim", label: "Horário de término" },
  { value: "vagas", label: "Vagas" },
];

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

const NEXT_STEP_DURATION_MS = 60_000;

interface TurmaNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const turmaNextStepCard: TurmaNextStepCardData = {
  titulo: "Após organizar as turmas, registre as presenças dos participantes",
  acaoLabel: "Cadastrar presenças",
  acaoUrl: "/presencas",
  variante: "pendente",
};

function normalizeTime(value?: string): string {
  if (!value) return "—";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

const horariosDaTurma = (turma: Turma) =>
  turma.horarios.length > 0
    ? turma.horarios
    : [
        {
          id: "legado",
          diaAtividade: turma.diaAtividade,
          horarioInicio: turma.horarioInicio,
          horarioFim: turma.horarioFim,
        },
      ];

const diasTurmaTexto = (turma: Turma) =>
  horariosDaTurma(turma)
    .map((horario) => diaLabel(horario.diaAtividade))
    .join(" · ");

const iniciosTurmaTexto = (turma: Turma) =>
  horariosDaTurma(turma)
    .map((horario) => normalizeTime(horario.horarioInicio))
    .join(" · ");

const finsTurmaTexto = (turma: Turma) =>
  horariosDaTurma(turma)
    .map((horario) => normalizeTime(horario.horarioFim))
    .join(" · ");

const horariosTurmaIntervalosTexto = (turma: Turma) =>
  horariosDaTurma(turma)
    .map(
      (horario) =>
        `${normalizeTime(horario.horarioInicio)} – ${normalizeTime(horario.horarioFim)}`,
    )
    .join(" · ");

const horariosTurmaTexto = (turma: Turma) =>
  horariosDaTurma(turma)
    .map(
      (horario) =>
        `${diaLabel(horario.diaAtividade)} • ${normalizeTime(horario.horarioInicio)} – ${normalizeTime(horario.horarioFim)}`,
    )
    .join(" · ");

export default function Turmas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Turma[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [nextStepCard, setNextStepCard] =
    useState<TurmaNextStepCardData | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "turmas:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<TurmasFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<TurmasFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    const state = location.state as { showNextStepCard?: boolean } | null;
    if (state?.showNextStepCard) {
      setNextStepCard(turmaNextStepCard);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!nextStepCard) return;
    const timer = window.setTimeout(
      () => setNextStepCard(null),
      NEXT_STEP_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [nextStepCard]);

  useEffect(() => {
    let active = true;
    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);
        const data = await getPermissoesUsuarioLogadoPorModulo("TURMAS");
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
    if (loadingPermissoes) return;
    if (!podeVisualizar) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const [turmasData, atividadesData, colaboradoresData] = await Promise.all(
        [getTurmas(), getAtividadesOptions(), getColaboradoresOptions()],
      );
      const atividadesMap = new Map(
        atividadesData.map((item) => [String(item.id), item.nome]),
      );
      const colaboradoresMap = new Map(
        colaboradoresData.map((item) => [String(item.id), item.nome]),
      );
      setItems(
        turmasData.map((turma) => ({
          ...turma,
          horarioInicio: normalizeTime(turma.horarioInicio),
          horarioFim: normalizeTime(turma.horarioFim),
          atividadeNome:
            turma.atividadeNome ||
            atividadesMap.get(String(turma.atividadeId)) ||
            "—",
          colaboradoresNomes:
            turma.colaboradoresNomes.length > 0
              ? turma.colaboradoresNomes
              : turma.colaboradoresIds.map(
                  (id) =>
                    colaboradoresMap.get(String(id)) ?? `Colaborador ${id}`,
                ),
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as turmas.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const setDraftField = <K extends keyof TurmasFiltros>(
    key: K,
    value: TurmasFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = useCallback((next: TurmasFiltros) => {
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
    const atividade = normalize(filtros.atividade);
    const responsavel = normalize(filtros.responsavel);
    const result = items.filter((turma) => {
      if (nome && !normalize(turma.nomeTurma).includes(nome)) return false;
      if (
        atividade &&
        !normalize(turma.atividadeNome ?? "").includes(atividade)
      )
        return false;
      if (
        responsavel &&
        !turma.colaboradoresNomes.some((nomeColaborador) =>
          normalize(nomeColaborador).includes(responsavel),
        )
      )
        return false;
      if (filtros.situacao.length && !filtros.situacao.includes(turma.status))
        return false;
      if (
        filtros.periodo.length &&
        !horariosDaTurma(turma).some((horario) =>
          filtros.periodo.includes(horario.diaAtividade),
        )
      )
        return false;
      return true;
    });

    const sortValue = (turma: Turma): string | number => {
      switch (filtros.sortBy) {
        case "atividade":
          return turma.atividadeNome ?? "";
        case "colaboradores":
          return turma.colaboradoresNomes.join(", ");
        case "status":
          return statusTurmaLabel(turma.status);
        case "dia":
          return diasTurmaTexto(turma);
        case "nivel":
          return nivelTurmaLabel(turma.nivelTurma);
        case "inicio":
          return iniciosTurmaTexto(turma);
        case "fim":
          return finsTurmaTexto(turma);
        case "vagas":
          return turma.quantidadeVagas ?? 0;
        default:
          return turma.nomeTurma;
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
  }, [filtros, items]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const textFilter = (
      key: "nome" | "atividade" | "responsavel",
      label: string,
    ) => {
      if (!filtros[key].trim()) return;
      list.push({
        id: key,
        label,
        value: filtros[key].trim(),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };
    textFilter("nome", "Nome da turma");
    textFilter("atividade", "Atividade");
    textFilter("responsavel", "Responsável");
    const listFilter = (
      key: "situacao" | "periodo",
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
    listFilter("situacao", "Situação", statusTurma);
    listFilter("periodo", "Período", diasSemana);
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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir turmas.");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteTurma(Number(confirmDelete));
      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Turma excluída com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a turma.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportColumns = [
    { header: "Nome da turma", key: "nomeTurma" },
    { header: "Atividade", key: "atividadeNome" },
    { header: "Dia da atividade", key: "diaLabel" },
    { header: "Nível", key: "nivelLabel" },
    { header: "Horário de início", key: "horarioInicio" },
    { header: "Horário de término", key: "horarioFim" },
    { header: "Vagas", key: "quantidadeVagas" },
    { header: "Situação", key: "statusLabel" },
    { header: "Colaboradores", key: "colaboradoresLabel" },
  ];

  const getExportData = () =>
    filtered.map((turma) => ({
      ...turma,
      diaLabel: diasTurmaTexto(turma),
      horarioInicio: iniciosTurmaTexto(turma),
      horarioFim: finsTurmaTexto(turma),
      nivelLabel: nivelTurmaLabel(turma.nivelTurma),
      statusLabel: statusTurmaLabel(turma.status),
      colaboradoresLabel: turma.colaboradoresNomes.join(", "),
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

  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Turmas"
          tooltip="Nesta página são cadastradas e acompanhadas as turmas vinculadas às atividades dos projetos, com informações sobre identificação, nível, quantidade de vagas, dias e horários de realização, situação atual e equipe responsável. Esses registros ajudam a organizar os participantes, acompanhar os encontros e presenças e apoiar a execução das atividades."
          objective="Cadastre e organize as turmas vinculadas às atividades, definindo suas características, nível, vagas, dias e horários de funcionamento, situação atual e equipe responsável. Esses registros ajudam a organizar os participantes e acompanhar os encontros, presenças e o desenvolvimento das atividades."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/turmas/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar turma
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
                <TextFilter
                  id="filtroNome"
                  label="Nome da turma"
                  value={draft.nome}
                  onChange={(value) => setDraftField("nome", value)}
                  placeholder="Digite o nome da turma"
                  className={inputClass}
                />
                <TextFilter
                  id="filtroAtividade"
                  label="Atividade"
                  value={draft.atividade}
                  onChange={(value) => setDraftField("atividade", value)}
                  placeholder="Digite o nome da atividade"
                  className={inputClass}
                />
                <TextFilter
                  id="filtroResponsavel"
                  label="Responsável"
                  value={draft.responsavel}
                  onChange={(value) => setDraftField("responsavel", value)}
                  placeholder="Digite o nome do responsável"
                  className={inputClass}
                />
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusTurma}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroPeriodo">Período</FieldLabel>
                  <FilterMultiSelect
                    id="filtroPeriodo"
                    options={diasSemana}
                    value={draft.periodo}
                    onChange={(value) => setDraftField("periodo", value)}
                    placeholder="Todos os períodos"
                    summaryNoun="períodos selecionados"
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
              reportTo="/relatorios/turmas"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="turmas"
              canExport={podeGerarPdf}
            />
            {loading ? (
              <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma turma cadastrada."
                createLabel={podeCriar ? "Cadastrar turma" : undefined}
                onCreate={
                  podeCriar ? () => navigate("/turmas/novo") : undefined
                }
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
                          sortKey="nome"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome da Turma
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
                          sortKey="nivel"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nível
                        </SortableTh>
                        <SortableTh
                          sortKey="dia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Período
                        </SortableTh>
                        <SortableTh
                          sortKey="inicio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Horário
                        </SortableTh>
                        <SortableTh
                          sortKey="vagas"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Vagas
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                        <SortableTh
                          sortKey="colaboradores"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Responsáveis
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((turma) => {
                        const colaboradoresTexto =
                          turma.colaboradoresNomes.join(", ");
                        return (
                          <tr
                            key={turma.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/turmas/${turma.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`turma-${turma.id}.pdf`}
                                viewTo={`/turmas/${turma.id}`}
                                editTo={
                                  podeEditar
                                    ? `/turmas/${turma.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(turma.id)
                                    : undefined
                                }
                                extraItems={
                                  podeCriar
                                    ? [
                                        {
                                          label: "Duplicar",
                                          icon: Copy,
                                          onClick: () =>
                                            navigate(
                                              `/turmas/novo?duplicar=${turma.id}`,
                                            ),
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={turma.nomeTurma} bold>
                                {turma.nomeTurma}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={turma.atividadeNome ?? "—"}>
                                {turma.atividadeNome ?? "—"}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={nivelTurmaLabel(turma.nivelTurma)}
                                ariaLabelPrefix="Nível da turma"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-normal leading-5 text-foreground">
                              {diasTurmaTexto(turma)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {horariosTurmaIntervalosTexto(turma)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px]">
                              {turma.quantidadeVagas ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={statusTurmaLabel(turma.status)}
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              {colaboradoresTexto ? (
                                <TableCellText text={colaboradoresTexto} muted>
                                  {colaboradoresTexto}
                                </TableCellText>
                              ) : (
                                <span className="text-[13px] text-muted-foreground/60">
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
                  {paginated.map((turma) => (
                    <div key={turma.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/turmas/${turma.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`turma-${turma.id}.pdf`}
                          viewTo={`/turmas/${turma.id}`}
                          editTo={
                            podeEditar
                              ? `/turmas/${turma.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(turma.id)
                              : undefined
                          }
                          extraItems={
                            podeCriar
                              ? [
                                  {
                                    label: "Duplicar",
                                    icon: Copy,
                                    onClick: () =>
                                      navigate(
                                        `/turmas/novo?duplicar=${turma.id}`,
                                      ),
                                  },
                                ]
                              : undefined
                          }
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {turma.nomeTurma}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {turma.atividadeNome ?? "—"}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {horariosTurmaTexto(turma)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={statusTurmaLabel(turma.status)} />
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          •{" "}
                          {turma.colaboradoresNomes.join(", ") ||
                            "Sem colaboradores"}
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
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso a turma esteja vinculada a
              participantes ou presenças, a exclusão poderá ser impedida.
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
        pageTitle="Turmas"
        href="https://www.aurit.com.br/wiki/execucao/turmas"
      />
    </AppLayout>
  );
}

function TextFilter({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

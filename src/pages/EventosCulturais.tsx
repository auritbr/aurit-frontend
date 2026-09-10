import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Loader2, Plus, RotateCcw, Search } from "lucide-react";

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
  deleteEventoCultural,
  enrichEventoCultural,
  formatPeriodo,
  getColaboradoresOptions,
  getEventosCulturais,
  getProjetosOptions,
  statusEvento,
  statusValueToLabel,
  tipoEventoLabel,
  tiposEvento,
  type EventoCulturalView,
  type ProjetoOption,
} from "@/data/eventosCulturais";
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

const EVENTO_CULTURAL_NEXT_STEP_KEY = "aurit:eventos-culturais:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

type SortBy =
  | "nome"
  | "tipo"
  | "periodo"
  | "status"
  | "projeto"
  | "colaboradores";
type SortDir = "asc" | "desc";

interface EventosFiltros {
  nome: string;
  projetos: string[];
  tipos: string[];
  status: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

interface EventoNextStepCardData {
  titulo: string;
  acaoLabel?: string;
  acaoUrl?: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const emptyFiltros: EventosFiltros = {
  nome: "",
  projetos: [],
  tipos: [],
  status: [],
  sortBy: "nome",
  sortDir: "asc",
};

const sortByOptions: Array<{ value: SortBy; label: string }> = [
  { value: "nome", label: "Nome do evento" },
  { value: "projeto", label: "Projeto" },
  { value: "tipo", label: "Tipo de evento" },
  { value: "status", label: "Status" },
  { value: "periodo", label: "Data do evento" },
  { value: "colaboradores", label: "Colaboradores" },
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

const sortDirLabels: Record<SortDir, string> = {
  asc: "A–Z",
  desc: "Z–A",
};

export default function EventosCulturais() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EventoCulturalView[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<EventoNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "eventos-culturais:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<EventosFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<EventosFiltros>(emptyFiltros);
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
        const data =
          await getPermissoesUsuarioLogadoPorModulo("EVENTOS_CULTURAIS");
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
    const raw = sessionStorage.getItem(EVENTO_CULTURAL_NEXT_STEP_KEY);
    if (!raw) return;

    try {
      setNextStepCard(JSON.parse(raw) as EventoNextStepCardData);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EVENTO_CULTURAL_NEXT_STEP_KEY);
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

    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);
        const [eventosData, projetosData, colaboradoresData] =
          await Promise.all([
            getEventosCulturais(),
            getProjetosOptions(),
            getColaboradoresOptions(),
          ]);

        if (!active) return;
        setProjetos(projetosData);
        setItems(
          eventosData.map((evento) =>
            enrichEventoCultural(evento, projetosData, colaboradoresData),
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar eventos culturais.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarDados();
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const setDraftField = <K extends keyof EventosFiltros>(
    key: K,
    value: EventosFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: EventosFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const result = items.filter((evento) => {
      if (
        nome &&
        !normalize(
          `${evento.nomeEvento} ${evento.descricaoEvento} ${evento.localEvento}`,
        ).includes(nome)
      )
        return false;
      if (
        filtros.projetos.length &&
        !evento.projetosIds.some((id) => filtros.projetos.includes(String(id)))
      )
        return false;
      if (filtros.tipos.length && !filtros.tipos.includes(evento.tipoEvento))
        return false;
      if (filtros.status.length && !filtros.status.includes(evento.status))
        return false;
      return true;
    });

    const sortValue = (evento: EventoCulturalView) => {
      switch (filtros.sortBy) {
        case "projeto":
          return evento.projetoNome;
        case "tipo":
          return tipoEventoLabel(evento.tipoEvento);
        case "status":
          return statusValueToLabel(evento.status);
        case "periodo":
          return evento.dataEvento;
        case "colaboradores":
          return evento.colaboradoresNomes.join(", ");
        default:
          return evento.nomeEvento;
      }
    };

    return [...result].sort((a, b) => {
      const compare = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        { sensitivity: "base" },
      );
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros]);

  const activeFilters: ActiveFilterItem[] = (() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.nome.trim()) {
      list.push({
        id: "nome",
        label: "Nome do evento",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    }
    filtros.projetos.forEach((value) =>
      list.push({
        id: `projeto-${value}`,
        label: "Projeto",
        value:
          projetos.find((projeto) => String(projeto.id) === value)?.nome ??
          value,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            projetos: filtros.projetos.filter((item) => item !== value),
          }),
      }),
    );
    filtros.tipos.forEach((value) =>
      list.push({
        id: `tipo-${value}`,
        label: "Tipo de evento",
        value: labelOf(tiposEvento, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            tipos: filtros.tipos.filter((item) => item !== value),
          }),
      }),
    );
    filtros.status.forEach((value) =>
      list.push({
        id: `status-${value}`,
        label: "Status",
        value: labelOf(statusEvento, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            status: filtros.status.filter((item) => item !== value),
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
  })();

  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const toggleSort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  async function handleDelete() {
    if (!confirmDelete) return;
    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir eventos culturais.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEventoCultural(Number(confirmDelete));
      setItems((prev) => prev.filter((evento) => evento.id !== confirmDelete));
      toast.success("Evento cultural excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir evento cultural.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const projetoOptions = projetos.map((projeto) => ({
    value: String(projeto.id),
    label: projeto.nome,
  }));
  const exportColumns = [
    { header: "Nome do evento", key: "nomeEvento" },
    { header: "Tipo de evento", key: "tipoLabel" },
    { header: "Status", key: "statusLabel" },
    { header: "Projetos", key: "projetoNome" },
    { header: "Período", key: "periodo" },
    { header: "Colaboradores", key: "colaboradoresLabel" },
  ];
  const getExportData = () =>
    filtered.map((evento) => ({
      ...evento,
      tipoLabel: tipoEventoLabel(evento.tipoEvento),
      statusLabel: statusValueToLabel(evento.status),
      periodo: formatPeriodo(evento.dataEvento, evento.dataFim),
      colaboradoresLabel: evento.colaboradoresNomes.join(", "),
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
          title="Eventos Culturais"
          tooltip="Nesta página são cadastrados e acompanhados os eventos culturais realizados pela organização, como apresentações, mostras, festivais, exposições, encontros e outras ações públicas. Os registros permitem organizar informações sobre realização, período, situação, projetos relacionados e equipe envolvida, apoiando o acompanhamento dos eventos, a produção de evidências, os relatórios e as prestações de contas."
          objective="Cadastre e acompanhe os eventos culturais da organização, mantendo organizadas as informações necessárias para sua realização e acompanhamento. Esses registros ajudam a relacionar os eventos aos projetos, organizar a equipe envolvida, reunir evidências e apoiar relatórios e prestações de contas."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/eventos-culturais/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar evento
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
                  <FieldLabel htmlFor="filtroNomeEvento">
                    Nome do evento
                  </FieldLabel>
                  <Input
                    id="filtroNomeEvento"
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome do evento"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroProjeto">Projeto</FieldLabel>
                  <FilterMultiSelect
                    id="filtroProjeto"
                    options={projetoOptions}
                    value={draft.projetos}
                    onChange={(value) => setDraftField("projetos", value)}
                    placeholder="Todos os projetos"
                    searchable
                    summaryNoun="projetos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipoEvento">
                    Tipo de evento
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipoEvento"
                    options={tiposEvento}
                    value={draft.tipos}
                    onChange={(value) => setDraftField("tipos", value)}
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroStatus">Status</FieldLabel>
                  <FilterMultiSelect
                    id="filtroStatus"
                    options={statusEvento}
                    value={draft.status}
                    onChange={(value) => setDraftField("status", value)}
                    placeholder="Todos os status"
                    summaryNoun="status selecionados"
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
                  aria-busy={searching}
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
              reportTo="/relatorios/eventos-culturais"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="eventos-culturais"
              canExport={podeGerarPdf}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando eventos...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum evento cultural cadastrado."
                createLabel="Cadastrar evento"
                onCreate={
                  podeCriar
                    ? () => navigate("/eventos-culturais/novo")
                    : undefined
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
                          Nome do evento
                        </SortableTh>
                        <SortableTh
                          sortKey="tipo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de evento
                        </SortableTh>
                        <SortableTh
                          sortKey="projeto"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Projetos
                        </SortableTh>
                        <SortableTh
                          sortKey="periodo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Período
                        </SortableTh>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>
                        <SortableTh
                          sortKey="colaboradores"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Colaboradores
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((evento) => {
                        const periodo = formatPeriodo(
                          evento.dataEvento,
                          evento.dataFim,
                        );
                        const colaboradores =
                          evento.colaboradoresNomes.join(", ");
                        return (
                          <tr
                            key={evento.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/eventos-culturais/${evento.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`evento-cultural-${evento.id}.pdf`}
                                viewTo={`/eventos-culturais/${evento.id}`}
                                editTo={
                                  podeEditar
                                    ? `/eventos-culturais/${evento.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(evento.id)
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
                                              `/eventos-culturais/novo?duplicar=${evento.id}`,
                                            ),
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={evento.nomeEvento} bold>
                                {evento.nomeEvento}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={evento.tipoEvento}
                                ariaLabelPrefix="Tipo de evento"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={evento.projetoNome}>
                                {evento.projetoNome}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {periodo}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={statusValueToLabel(evento.status)}
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              {colaboradores ? (
                                <TableCellText text={colaboradores} muted>
                                  {colaboradores}
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
                  {paginated.map((evento) => (
                    <div key={evento.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/eventos-culturais/${evento.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`evento-cultural-${evento.id}.pdf`}
                          viewTo={`/eventos-culturais/${evento.id}`}
                          editTo={
                            podeEditar
                              ? `/eventos-culturais/${evento.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(evento.id)
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
                                        `/eventos-culturais/novo?duplicar=${evento.id}`,
                                      ),
                                  },
                                ]
                              : undefined
                          }
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {evento.nomeEvento}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          status={evento.tipoEvento}
                          ariaLabelPrefix="Tipo de evento"
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatPeriodo(evento.dataEvento, evento.dataFim)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {evento.projetoNome}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill
                          status={statusValueToLabel(evento.status)}
                        />
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          •{" "}
                          {evento.colaboradoresNomes.join(", ") ||
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
            <AlertDialogTitle>Excluir evento cultural?</AlertDialogTitle>
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
        pageTitle="Eventos Culturais"
        href="/wiki/execucao/eventos-culturais"
      />
    </AppLayout>
  );
}

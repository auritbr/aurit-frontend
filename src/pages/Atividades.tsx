import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  FileDown,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
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
import { downloadAtividadeReport as exportAtividadePdf } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteAtividade,
  formatDateBr,
  getAtividades,
  getColaboradoresOptions,
  getProjetosOptions,
  statusAtividade,
  statusValueToLabel,
  tipoLabel,
  type Atividade,
  type ColaboradorOption,
  type ProjetoOption,
} from "@/data/atividades";
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
  | "nomeAtividade"
  | "tipoAtividade"
  | "dataInicio"
  | "dataFim"
  | "status"
  | "projeto"
  | "colaboradores";
type SortDir = "asc" | "desc";

interface Filtros {
  nome: string;
  projetos: string[];
  status: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  nome: "",
  projetos: [],
  status: [],
  sortBy: "nomeAtividade",
  sortDir: "asc",
};

const sortByOptions: Array<{ value: SortBy; label: string }> = [
  { value: "nomeAtividade", label: "Nome da atividade" },
  { value: "tipoAtividade", label: "Tipo de atividade" },
  { value: "projeto", label: "Projeto" },
  { value: "status", label: "Status" },
  { value: "dataInicio", label: "Data de início" },
  { value: "dataFim", label: "Data de término" },
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

const sortDirLabels = (sortBy: SortBy): Record<SortDir, string> =>
  sortBy === "dataInicio" || sortBy === "dataFim"
    ? { asc: "Mais próximos primeiro", desc: "Mais distantes primeiro" }
    : { asc: "A–Z", desc: "Z–A" };

const ATIVIDADE_NEXT_STEP_KEY = "aurit:atividades:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface AtividadeNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

export default function Atividades() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Atividade[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [nextStepCard, setNextStepCard] =
    useState<AtividadeNextStepCardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [podeCadastrarParticipantes, setPodeCadastrarParticipantes] =
    useState(false);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "atividades:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
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
        const [atividadePermissoes, participantePermissoes] = await Promise.all([
          getPermissoesUsuarioLogadoPorModulo("ATIVIDADES"),
          getPermissoesUsuarioLogadoPorModulo("PARTICIPANTES"),
        ]);
        if (active) {
          setPermissoes(atividadePermissoes);
          setPodeCadastrarParticipantes(participantePermissoes.CRIAR);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setPermissoes(permissoesVazias);
          setPodeCadastrarParticipantes(false);
        }
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
    const raw = sessionStorage.getItem(ATIVIDADE_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw) as AtividadeNextStepCardData);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(ATIVIDADE_NEXT_STEP_KEY);
    const timer = window.setTimeout(
      () => setNextStepCard(null),
      NEXT_STEP_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (loadingPermissoes) return;
    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    async function carregar() {
      try {
        setLoading(true);
        const [atividadesData, projetosData, colaboradoresData] =
          await Promise.all([
            getAtividades(),
            getProjetosOptions(),
            getColaboradoresOptions(),
          ]);
        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);
        const projetosMap = new Map(projetosData.map((p) => [p.id, p.nome]));
        const colaboradoresMap = new Map(
          colaboradoresData.map((c) => [c.id, c.nome]),
        );
        setItems(
          atividadesData.map((atividade) => ({
            ...atividade,
            projetoNome: projetosMap.get(atividade.projetoId) ?? "—",
            colaboradoresNomes: atividade.colaboradoresIds.map(
              (colaboradorId) =>
                colaboradoresMap.get(colaboradorId) ?? `ID ${colaboradorId}`,
            ),
          })),
        );
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as atividades.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void carregar();
    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const projetoOptions = useMemo(
    () =>
      projetos.map((projeto) => ({ value: projeto.id, label: projeto.nome })),
    [projetos],
  );

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = useCallback((next: Filtros) => {
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
    const result = items.filter((atividade) => {
      if (
        nome &&
        !normalize(
          `${atividade.nomeAtividade} ${tipoLabel(atividade.tipoAtividade)}`,
        ).includes(nome)
      )
        return false;
      if (
        filtros.projetos.length &&
        !filtros.projetos.includes(atividade.projetoId)
      )
        return false;
      if (filtros.status.length && !filtros.status.includes(atividade.status))
        return false;
      return true;
    });

    const sortValue = (atividade: Atividade) => {
      switch (filtros.sortBy) {
        case "tipoAtividade":
          return tipoLabel(atividade.tipoAtividade);
        case "projeto":
          return atividade.projetoNome ?? "";
        case "status":
          return statusValueToLabel(atividade.status);
        case "dataInicio":
          return atividade.dataInicio ?? "";
        case "dataFim":
          return atividade.dataFim ?? "";
        case "colaboradores":
          return atividade.colaboradoresNomes.join(", ");
        default:
          return atividade.nomeAtividade;
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
  }, [filtros, items]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.nome.trim())
      list.push({
        id: "nome",
        label: "Nome/tipo",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    filtros.projetos.forEach((value) =>
      list.push({
        id: `projeto-${value}`,
        label: "Projeto",
        value: labelOf(projetoOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            projetos: filtros.projetos.filter((item) => item !== value),
          }),
      }),
    );
    filtros.status.forEach((value) =>
      list.push({
        id: `status-${value}`,
        label: "Status",
        value: statusValueToLabel(value),
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
    )
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${
          sortDirLabels(filtros.sortBy)[filtros.sortDir]
        }`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return list;
  }, [applyFiltros, filtros, projetoOptions]);

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
      toast.error("Você não possui permissão para excluir atividades.");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteAtividade(Number(confirmDelete));
      setItems((prev) =>
        prev.filter((atividade) => atividade.id !== confirmDelete),
      );
      toast.success("Atividade excluída com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a atividade.",
      );
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleExportPdf = async (atividade: Atividade) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }
    await exportAtividadePdf({
      id: atividade.id,
      nomeAtividade: atividade.nomeAtividade,
      tipoAtividade: atividade.tipoAtividade,
      status: atividade.status,
      projeto: atividade.projetoNome ?? "—",
      local: atividade.localAtividade,
      dataInicio: atividade.dataInicio,
      dataFim: atividade.dataFim,
      quantidadeVagas: atividade.quantidadeVagas,
      publicoBeneficiadoAtividade: atividade.publicoBeneficiadoAtividade,
      descricao: atividade.descricaoAtividade,
      colaboradores: atividade.colaboradoresNomes ?? [],
    });
  };

  const exportColumns = [
    { header: "Nome da atividade", key: "nomeAtividade" },
    { header: "Tipo de atividade", key: "tipoLabel" },
    { header: "Data de início", key: "dataInicio" },
    { header: "Data de término", key: "dataFim" },
    { header: "Status", key: "statusLabel" },
    { header: "Projeto", key: "projetoNome" },
    { header: "Colaboradores", key: "colaboradoresTxt" },
  ];

  const getExportData = () =>
    filtered.map((atividade) => ({
      ...atividade,
      tipoLabel: tipoLabel(atividade.tipoAtividade),
      statusLabel: statusValueToLabel(atividade.status),
      colaboradoresTxt: atividade.colaboradoresNomes.join(", "),
    }));

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
          title="Atividades"
          tooltip="Nesta página são cadastradas e acompanhadas as atividades vinculadas aos projetos da organização, com informações sobre identificação, tipo, descrição, público atendido, local, período de realização, quantidade de vagas, situação atual e equipe envolvida. Esses dados ajudam a organizar a execução das atividades e apoiam o registro de participantes, presenças, evidências, relatórios e prestações de contas."
          objective="Cadastre e acompanhe as atividades dos projetos, definindo suas principais características, público atendido, local, período de realização, vagas, situação e equipe envolvida. Esses registros servem de base para organizar participantes, turmas, presenças, evidências e relatórios relacionados às atividades."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/atividades/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar atividade
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
                  <FieldLabel htmlFor="filtroNome">Nome ou tipo</FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome ou tipo da atividade"
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
                  <FieldLabel htmlFor="filtroStatus">Status</FieldLabel>
                  <FilterMultiSelect
                    id="filtroStatus"
                    options={statusAtividade}
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
                      <SelectItem value="asc">
                        {sortDirLabels(draft.sortBy).asc}
                      </SelectItem>
                      <SelectItem value="desc">
                        {sortDirLabels(draft.sortBy).desc}
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
              reportTo="/relatorios/atividades"
              additionalActions={
                podeCadastrarParticipantes ? (
                  <Button
                    type="button"
                    variant="glassSecondary"
                    onClick={() => navigate("/participantes")}
                    className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Cadastrar matrícula
                  </Button>
                ) : undefined
              }
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="atividades"
              canExport={podeGerarPdf}
            />

            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma atividade cadastrada."
                createLabel={podeCriar ? "Cadastrar atividade" : undefined}
                onCreate={
                  podeCriar ? () => navigate("/atividades/novo") : undefined
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
                          sortKey="nomeAtividade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome da atividade
                        </SortableTh>
                        <SortableTh
                          sortKey="tipoAtividade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de atividade
                        </SortableTh>
                        <SortableTh
                          sortKey="projeto"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Projeto
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
                      {paginated.map((atividade) => {
                        const colaboradoresTexto =
                          atividade.colaboradoresNomes.join(", ");
                        return (
                          <tr
                            key={atividade.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/atividades/${atividade.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`atividade-${atividade.id}.pdf`}
                                viewTo={`/atividades/${atividade.id}`}
                                editTo={
                                  podeEditar
                                    ? `/atividades/${atividade.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(atividade.id)
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
                                              `/atividades/novo?duplicar=${atividade.id}`,
                                            ),
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={atividade.nomeAtividade}
                                bold
                              >
                                {atividade.nomeAtividade}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={atividade.tipoAtividade}
                                ariaLabelPrefix="Tipo de atividade"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={atividade.projetoNome ?? "—"}
                                muted
                              >
                                {atividade.projetoNome ?? "—"}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {formatDateBr(atividade.dataInicio)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {formatDateBr(atividade.dataFim)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={statusValueToLabel(atividade.status)}
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
                  {paginated.map((atividade) => (
                    <div key={atividade.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/atividades/${atividade.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`atividade-${atividade.id}.pdf`}
                          viewTo={`/atividades/${atividade.id}`}
                          editTo={
                            podeEditar
                              ? `/atividades/${atividade.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(atividade.id)
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
                                        `/atividades/novo?duplicar=${atividade.id}`,
                                      ),
                                  },
                                ]
                              : undefined
                          }
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {atividade.nomeAtividade}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          status={atividade.tipoAtividade}
                          ariaLabelPrefix="Tipo de atividade"
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatDateBr(atividade.dataInicio)} –{" "}
                          {formatDateBr(atividade.dataFim)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {atividade.projetoNome ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill
                          status={statusValueToLabel(atividade.status)}
                        />
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          •{" "}
                          {atividade.colaboradoresNomes.join(", ") ||
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
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
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
        pageTitle="Atividades"
        href="https://www.aurit.com.br/wiki/execucao/atividades"
      />
    </AppLayout>
  );
}

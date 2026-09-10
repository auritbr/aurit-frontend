import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, RotateCcw, Search } from "lucide-react";

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
  deleteMetaProjeto,
  formatQuantidade,
  getMetasProjeto,
  getProjetosOptions,
  getPropostasEditalOptions,
  projetoNomeMeta,
  propostaNomeMeta,
  type MetaProjeto,
  type ProjetoOption,
  type PropostaEditalOption,
} from "@/data/metasProjeto";
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
  | "titulo"
  | "quantidade"
  | "projeto"
  | "proposta"
  | "comprovacao"
  | "ordem";
type SortDir = "asc" | "desc";

interface Filtros {
  projetos: string[];
  propostas: string[];
  descricao: string;
  comprovacao: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

interface MetaProjetoNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const META_PROJETO_NEXT_STEP_KEY = "aurit:metas-projeto:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

const sortByOptions: { value: SortBy; label: string }[] = [
  { value: "titulo", label: "Título da meta" },
  { value: "quantidade", label: "Quantidade prevista" },
  { value: "projeto", label: "Projeto" },
  { value: "proposta", label: "Proposta de edital" },
  { value: "comprovacao", label: "Forma de comprovação" },
  { value: "ordem", label: "Ordem" },
];

const emptyFiltros: Filtros = {
  projetos: [],
  propostas: [],
  descricao: "",
  comprovacao: "",
  sortBy: "ordem",
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

export default function MetasProjetoPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MetaProjeto[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [nextStepCard, setNextStepCard] =
    useState<MetaProjetoNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "metas-projeto:pesquisa-avancada",
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
        const data = await getPermissoesUsuarioLogadoPorModulo("METAS_PROJETO");
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
    const raw = sessionStorage.getItem(META_PROJETO_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw) as MetaProjetoNextStepCardData);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(META_PROJETO_NEXT_STEP_KEY);
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
      const [metasData, projetosData, propostasData] = await Promise.all([
        getMetasProjeto(),
        getProjetosOptions(),
        getPropostasEditalOptions(),
      ]);
      setItems(metasData);
      setProjetos(projetosData);
      setPropostas(propostasData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar metas.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const projetoOptions = useMemo(
    () =>
      projetos.map((item) => ({
        value: String(item.id),
        label: item.nome,
      })),
    [projetos],
  );
  const propostaOptions = useMemo(
    () =>
      propostas.map((item) => ({
        value: String(item.id),
        label: item.nome,
      })),
    [propostas],
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
    const descricao = normalize(filtros.descricao);
    const comprovacao = normalize(filtros.comprovacao);
    const result = items.filter((item) => {
      if (
        descricao &&
        !normalize(`${item.tituloMeta} ${item.descricaoMeta}`).includes(
          descricao,
        )
      )
        return false;
      if (
        comprovacao &&
        !normalize(item.formaComprovacao ?? "").includes(comprovacao)
      )
        return false;
      if (
        filtros.projetos.length &&
        !filtros.projetos.includes(String(item.projeto ?? ""))
      )
        return false;
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(String(item.propostaEdital ?? ""))
      )
        return false;
      return true;
    });

    const sortValue = (item: MetaProjeto): string | number => {
      switch (filtros.sortBy) {
        case "quantidade":
          return Number(item.quantidadePrevista || 0);
        case "projeto":
          return projetoNomeMeta(item.projeto, projetos);
        case "proposta":
          return propostaNomeMeta(item.propostaEdital, propostas);
        case "comprovacao":
          return item.formaComprovacao ?? "";
        case "ordem":
          return Number(item.ordem || 0);
        default:
          return item.tituloMeta;
      }
    };

    return [...result].sort((a, b) => {
      const left = sortValue(a);
      const right = sortValue(b);
      const compare =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [filtros, items, projetos, propostas]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.descricao.trim())
      list.push({
        id: "descricao",
        label: "Meta",
        value: filtros.descricao.trim(),
        onRemove: () => applyFiltros({ ...filtros, descricao: "" }),
      });
    if (filtros.comprovacao.trim())
      list.push({
        id: "comprovacao",
        label: "Comprovação",
        value: filtros.comprovacao.trim(),
        onRemove: () => applyFiltros({ ...filtros, comprovacao: "" }),
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
    filtros.propostas.forEach((value) =>
      list.push({
        id: `proposta-${value}`,
        label: "Proposta",
        value: labelOf(propostaOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            propostas: filtros.propostas.filter((item) => item !== value),
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
          filtros.sortDir === "asc" ? "Crescente" : "Decrescente"
        }`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return list;
  }, [applyFiltros, filtros, projetoOptions, propostaOptions]);

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
      toast.error("Você não possui permissão para remover metas.");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteMetaProjeto(Number(confirmDelete));
      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Meta removida com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover meta.";
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
    { header: "Título da meta", key: "tituloMeta" },
    { header: "Descrição da meta", key: "descricaoMeta" },
    { header: "Quantidade prevista", key: "quantidadeFmt" },
    { header: "Projeto", key: "projetoNome" },
    { header: "Proposta de edital", key: "propostaNome" },
    { header: "Forma de comprovação", key: "formaComprovacao" },
  ];
  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      quantidadeFmt: formatQuantidade(item.quantidadePrevista),
      projetoNome: projetoNomeMeta(item.projeto, projetos),
      propostaNome: propostaNomeMeta(item.propostaEdital, propostas),
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
          title="Metas do Projeto"
          tooltip="Nesta página são cadastradas e acompanhadas as metas dos projetos, com a definição do resultado ou entrega esperada, da quantidade prevista e da forma de comprovação. Cada meta fica vinculada ao projeto correspondente e, quando aplicável, a uma proposta de edital."
          objective="Registre as metas previstas para cada projeto, definindo o que deverá ser alcançado, em qual quantidade e como o resultado poderá ser comprovado. Mantenha essas informações atualizadas para acompanhar o cumprimento das metas durante a execução do projeto."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/metas-projeto/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar meta
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
                  <FieldLabel htmlFor="filtroProposta">
                    Proposta de edital
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroProposta"
                    options={propostaOptions}
                    value={draft.propostas}
                    onChange={(value) => setDraftField("propostas", value)}
                    placeholder="Todas as propostas"
                    searchable
                    summaryNoun="propostas selecionadas"
                  />
                </div>
                <FilterInput
                  id="filtroDescricao"
                  label="Título ou descrição"
                  value={draft.descricao}
                  placeholder="Digite o título ou a descrição"
                  onChange={(value) => setDraftField("descricao", value)}
                />
                <FilterInput
                  id="filtroComprovacao"
                  label="Forma de comprovação"
                  value={draft.comprovacao}
                  placeholder="Digite a forma de comprovação"
                  onChange={(value) => setDraftField("comprovacao", value)}
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
                  <RotateCcw className="h-4 w-4" /> Limpar filtros
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
              reportTo="/relatorios/metas-projeto"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="metas-projeto"
              canExport={podeGerarPdf}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma meta cadastrada."
                createLabel={podeCriar ? "Cadastrar meta" : undefined}
                onCreate={
                  podeCriar ? () => navigate("/metas-projeto/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="titulo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Título da meta
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
                          sortKey="proposta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Proposta de edital
                        </SortableTh>
                        <SortableTh
                          sortKey="quantidade"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Quantidade prevista
                        </SortableTh>
                        <SortableTh
                          sortKey="comprovacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Forma de comprovação
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => {
                        const projeto = projetoNomeMeta(item.projeto, projetos);
                        const proposta = propostaNomeMeta(
                          item.propostaEdital,
                          propostas,
                        );
                        const comprovacao =
                          item.formaComprovacao?.trim() || "—";
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/metas-projeto/${item.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`meta-projeto-${item.id}.pdf`}
                                viewTo={`/metas-projeto/${item.id}`}
                                editTo={
                                  podeEditar
                                    ? `/metas-projeto/${item.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(item.id)
                                    : undefined
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={item.tituloMeta} bold>
                                {item.tituloMeta}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={projeto} muted>
                                {projeto}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={proposta} muted>
                                {proposta}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={formatQuantidade(item.quantidadePrevista)}
                              >
                                {formatQuantidade(item.quantidadePrevista)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText text={comprovacao} muted>
                                {comprovacao}
                              </TableCellText>
                            </td>
                          </tr>
                        );
                      })}
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
                              ? `/metas-projeto/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`meta-projeto-${item.id}.pdf`}
                          viewTo={`/metas-projeto/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/metas-projeto/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {item.tituloMeta}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Quantidade prevista:{" "}
                        <span className="font-medium text-foreground">
                          {formatQuantidade(item.quantidadePrevista)}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {projetoNomeMeta(item.projeto, projetos)}
                      </p>
                      {item.propostaEdital && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {propostaNomeMeta(item.propostaEdital, propostas)}
                        </p>
                      )}
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
            <AlertDialogTitle>Remover meta?</AlertDialogTitle>
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
        pageTitle="Metas do Projeto"
        href="https://www.aurit.com.br/wiki/projetos/metas-do-projeto"
      />
    </AppLayout>
  );
}

function FilterInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
      />
    </div>
  );
}

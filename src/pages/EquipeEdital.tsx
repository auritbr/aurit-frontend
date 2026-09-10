import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/FieldLabel";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { DataTablePagination } from "@/components/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
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
import {
  deleteEquipeEdital,
  getEquipesEditais,
  formatBRL,
  getColaboradoresOptions,
  getIntegrantesOptions,
  getPropostasEditalOptions,
  tipoPessoaLabel,
  type EquipeEdital,
  type PessoaOption,
  type PropostaEditalOption,
} from "@/data/equipeEdital";

const fieldClass = "h-9";
const equipeEditalTooltip =
  "Nesta página são cadastradas as pessoas que farão parte da equipe do projeto apresentado ao edital, com informações sobre sua vinculação, atuação, carga horária, valor previsto e experiência. Esses registros ajudam a demonstrar quem participará da execução do projeto e como cada pessoa contribuirá para sua realização.";
const equipeEditalObjetivo =
  "Organize a equipe do projeto apresentado ao edital, definindo quem participará de sua execução, a função de cada pessoa, a carga horária, os valores previstos e as informações que justificam sua participação.";
const tipoPessoaEquipeOptions = [
  { value: "COLABORADOR", label: "Colaborador" },
  { value: "INTEGRANTE", label: "Integrante" },
] as const;
const formatHoras = (value?: number) =>
  `${Number(value || 0).toLocaleString("pt-BR")}h`;
const textoOuTraco = (value?: string | number | null) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "—"
    : String(value);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "integrante", label: "Integrante" },
  { value: "funcao", label: "Função no projeto" },
  { value: "proposta", label: "Proposta de edital" },
  { value: "carga", label: "Carga horária" },
  { value: "valor", label: "Valor previsto" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  propostas: string[];
  tipos: string[];
  funcao: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  propostas: [],
  tipos: [],
  funcao: "",
  sortBy: "integrante",
  sortDir: "asc",
};

export default function EquipeEditalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propostaContexto = searchParams.get("proposta") ?? "";

  const [items, setItems] = useState<EquipeEdital[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [colaboradores, setColaboradores] = useState<PessoaOption[]>([]);
  const [integrantes, setIntegrantes] = useState<PessoaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<EquipeEdital | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      getEquipesEditais(),
      getPropostasEditalOptions(),
      getColaboradoresOptions(),
      getIntegrantesOptions(),
    ])
      .then(([data, propostasData, colaboradoresData, integrantesData]) => {
        if (!active) return;
        setItems(data);
        setPropostas(propostasData);
        setColaboradores(colaboradoresData);
        setIntegrantes(integrantesData);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar equipe da proposta.",
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const propostaEquipeNomeById = (id?: string) =>
    propostas.find((p) => String(p.id) === String(id))?.nome ?? "—";
  const pessoaEquipeNome = (item: EquipeEdital) =>
    item.tipoPessoa === "COLABORADOR"
      ? (colaboradores.find((p) => String(p.id) === String(item.colaborador))
          ?.nome ?? "—")
      : (integrantes.find((p) => String(p.id) === String(item.integrante))
          ?.nome ?? "—");
  const pessoaEquipeDetalhe = (item: EquipeEdital) =>
    tipoPessoaLabel(item.tipoPessoa);
  const propostaFilterOptions = useMemo(
    () => propostas.map((p) => ({ value: String(p.id), label: p.nome })),
    [propostas],
  );
  const tipoFilterOptions = useMemo(
    () =>
      tipoPessoaEquipeOptions.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const novoIntegranteUrl = propostaContexto
    ? `/equipe-edital/novo?proposta=${propostaContexto}`
    : "/equipe-edital/novo";

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);
    const funcaoTermo = normalize(filtros.funcao);

    const list = items.filter((item) => {
      if (propostaContexto && item.propostaEdital !== propostaContexto)
        return false;
      if (termo) {
        const haystack = normalize(
          [
            pessoaEquipeNome(item),
            pessoaEquipeDetalhe(item),
            item.funcaoProjeto,
            propostaEquipeNomeById(item.propostaEdital),
            tipoPessoaLabel(item.tipoPessoa),
          ].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (funcaoTermo && !normalize(item.funcaoProjeto).includes(funcaoTermo))
        return false;
      if (
        filtros.propostas.length &&
        !filtros.propostas.includes(item.propostaEdital)
      )
        return false;
      if (filtros.tipos.length && !filtros.tipos.includes(item.tipoPessoa))
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "funcao":
          return a.funcaoProjeto.localeCompare(b.funcaoProjeto, "pt-BR") * dir;
        case "proposta":
          return (
            propostaEquipeNomeById(a.propostaEdital).localeCompare(
              propostaEquipeNomeById(b.propostaEdital),
              "pt-BR",
            ) * dir
          );
        case "carga":
          return (a.cargaHorariaPrevista - b.cargaHorariaPrevista) * dir;
        case "valor":
          return (a.valorPrevisto - b.valorPrevisto) * dir;
        default:
          return (
            pessoaEquipeNome(a).localeCompare(pessoaEquipeNome(b), "pt-BR") *
            dir
          );
      }
    });
  }, [items, filtros, propostaContexto]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify({ filtros, propostaContexto }));

  const indicadores = useMemo(() => {
    const funcoes = new Set(
      filtered
        .map((i) => normalize(i.funcaoProjeto))
        .filter((f) => f.length > 0),
    );
    return {
      total: filtered.length,
      funcoes: funcoes.size,
      cargaTotal: filtered.reduce(
        (acc, i) => acc + (i.cargaHorariaPrevista || 0),
        0,
      ),
      valorTotal: filtered.reduce((acc, i) => acc + (i.valorPrevisto || 0), 0),
    };
  }, [filtered]);

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.funcao.trim() ? 1 : 0) +
    (filtros.propostas.length ? 1 : 0) +
    (filtros.tipos.length ? 1 : 0);

  const activeFilters: ActiveFilterItem[] = [];
  if (filtros.termo.trim()) {
    activeFilters.push({
      id: "termo",
      label: "Pesquisa",
      value: filtros.termo.trim(),
      onRemove: () => {
        setDraftField("termo", "");
        setFiltros((prev) => ({ ...prev, termo: "" }));
      },
    });
  }
  if (filtros.funcao.trim()) {
    activeFilters.push({
      id: "funcao",
      label: "Função no projeto",
      value: filtros.funcao.trim(),
      onRemove: () => {
        setDraftField("funcao", "");
        setFiltros((prev) => ({ ...prev, funcao: "" }));
      },
    });
  }
  filtros.propostas.forEach((propostaId) => {
    activeFilters.push({
      id: `proposta-${propostaId}`,
      label: "Proposta de edital",
      value: propostaEquipeNomeById(propostaId),
      onRemove: () => {
        const next = filtros.propostas.filter((p) => p !== propostaId);
        setDraftField("propostas", next);
        setFiltros((prev) => ({ ...prev, propostas: next }));
      },
    });
  });
  filtros.tipos.forEach((tipo) => {
    activeFilters.push({
      id: `tipo-${tipo}`,
      label: "Tipo de integrante",
      value: tipoPessoaLabel(tipo as EquipeEdital["tipoPessoa"]),
      onRemove: () => {
        const next = filtros.tipos.filter((t) => t !== tipo);
        setDraftField("tipos", next);
        setFiltros((prev) => ({ ...prev, tipos: next }));
      },
    });
  });

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearching(true);
    window.setTimeout(() => {
      setFiltros((prev) => ({
        ...draft,
        sortBy: prev.sortBy,
        sortDir: prev.sortDir,
      }));
      setSearching(false);
    }, 400);
  };

  const handleClearFiltros = () => {
    setDraft(filtrosIniciais);
    setFiltros((prev) => ({
      ...filtrosIniciais,
      sortBy: prev.sortBy,
      sortDir: prev.sortDir,
    }));
  };

  const toggleSort = (key: string) => {
    setFiltros((prev) => ({
      ...prev,
      sortBy: key as SortBy,
      sortDir: prev.sortBy === key && prev.sortDir === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEquipeEdital(Number(confirmDelete.id));
      setItems((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      toast.success("Integrante da equipe removido com sucesso.");
    } catch {
      toast.error("Não foi possível excluir o integrante.");
    }
    setConfirmDelete(null);
  };

  const exportColumns = [
    { header: "Integrante", key: "integrante" },
    { header: "Tipo de integrante", key: "tipo" },
    { header: "Função no projeto", key: "funcao" },
    { header: "Proposta de edital", key: "proposta" },
    { header: "Carga horária prevista", key: "carga" },
    { header: "Valor previsto", key: "valor" },
    { header: "Ordem de exibição", key: "ordem" },
    { header: "Justificativa da função", key: "justificativa" },
    { header: "Mini biografia", key: "miniBiografia" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      integrante: pessoaEquipeNome(item),
      tipo: tipoPessoaLabel(item.tipoPessoa),
      funcao: textoOuTraco(item.funcaoProjeto),
      proposta: propostaEquipeNomeById(item.propostaEdital),
      carga: formatHoras(item.cargaHorariaPrevista),
      valor: formatBRL(item.valorPrevisto),
      ordem: textoOuTraco(item.ordem),
      justificativa: textoOuTraco(item.justificativaFuncao),
      miniBiografia: textoOuTraco(item.miniBiografia),
    }));

  const propostaTituloContexto = propostaContexto
    ? propostaEquipeNomeById(propostaContexto)
    : "";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Equipe da Proposta"
          tooltip={equipeEditalTooltip}
          objective={equipeEditalObjetivo}
          actions={
            <>
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate(novoIntegranteUrl)}
              >
                <Plus className="h-4 w-4" aria-hidden /> Cadastrar equipe
              </Button>
            </>
          }
        />

        {propostaContexto && (
          <div className="mb-5 flex flex-col gap-2 rounded-[14px] border border-border/70 bg-card/70 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">
              Exibindo apenas a equipe da proposta{" "}
              <span className="font-medium text-foreground">
                {propostaTituloContexto}
              </span>
              .
            </p>
            <Button
              type="button"
              variant="glassSecondary"
              className="h-8 self-start px-3 text-[12px] sm:self-auto"
              onClick={() => navigate("/equipe-edital")}
            >
              Ver equipe de todas as propostas
            </Button>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Integrantes da equipe"
            value={indicadores.total}
            icon={Users}
            variant="neutral"
          />
          <SummaryStatCard
            title="Funções cadastradas"
            value={indicadores.funcoes}
            icon={Briefcase}
            variant="info"
          />
          <SummaryStatCard
            title="Carga horária prevista"
            value={formatHoras(indicadores.cargaTotal)}
            icon={Clock}
            variant="warning"
          />
          <SummaryStatCard
            title="Valor previsto da equipe"
            value={formatBRL(indicadores.valorTotal)}
            icon={Wallet}
            variant="success"
          />
        </div>

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeCount}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroTermo">Pesquisa</FieldLabel>
                  <Input
                    id="filtroTermo"
                    value={draft.termo}
                    onChange={(e) => setDraftField("termo", e.target.value)}
                    placeholder="Digite um termo"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroFuncao">
                    Função no projeto
                  </FieldLabel>
                  <Input
                    id="filtroFuncao"
                    value={draft.funcao}
                    onChange={(e) => setDraftField("funcao", e.target.value)}
                    placeholder="Informe a função"
                    className={fieldClass}
                  />
                </div>
                {!propostaContexto && (
                  <div>
                    <FieldLabel htmlFor="filtroPropostas">
                      Proposta de edital
                    </FieldLabel>
                    <FilterMultiSelect
                      id="filtroPropostas"
                      options={propostaFilterOptions}
                      value={draft.propostas}
                      onChange={(value) => setDraftField("propostas", value)}
                      placeholder="Todas as propostas"
                      summaryNoun="propostas selecionadas"
                      searchable
                    />
                  </div>
                )}
                <div>
                  <FieldLabel htmlFor="filtroTipos">
                    Tipo de integrante
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipos"
                    options={tipoFilterOptions}
                    value={draft.tipos}
                    onChange={(value) => setDraftField("tipos", value)}
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
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
              reportTo="/relatorios/equipe-edital"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="equipe-da-proposta"
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando a equipe da proposta...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum integrante cadastrado."
                emptyDescription="Cadastre as pessoas que farão parte da equipe da proposta e informe suas funções na execução do projeto."
                noResultsTitle="Nenhum integrante encontrado com os filtros selecionados."
                createLabel="Cadastrar integrante"
                onCreate={() => navigate(novoIntegranteUrl)}
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
                          sortKey="integrante"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Integrante
                        </SortableTh>
                        {!propostaContexto && (
                          <SortableTh
                            sortKey="proposta"
                            activeKey={filtros.sortBy}
                            dir={filtros.sortDir}
                            onSort={toggleSort}
                          >
                            Proposta de edital
                          </SortableTh>
                        )}
                        <SortableTh
                          sortKey="funcao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Função no projeto
                        </SortableTh>
                        <SortableTh
                          sortKey="carga"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Carga horária
                        </SortableTh>
                        <SortableTh
                          sortKey="valor"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Valor previsto
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => {
                        const nome = pessoaEquipeNome(item);
                        const detalhe = pessoaEquipeDetalhe(item);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                viewTo={`/equipe-edital/${item.id}`}
                                reportEndpoint={`/equipes-editais/${item.id}/relatorio`}
                                editTo={`/equipe-edital/${item.id}/editar`}
                                onDelete={() => setConfirmDelete(item)}
                              />
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={nome} bold>
                                {nome}
                              </TableCellText>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {tipoPessoaLabel(item.tipoPessoa)}
                                {detalhe ? ` · ${detalhe}` : ""}
                              </p>
                            </td>

                            {!propostaContexto && (
                              <td className="px-6 py-2.5">
                                <TableCellText
                                  text={propostaEquipeNomeById(
                                    item.propostaEdital,
                                  )}
                                  muted
                                >
                                  {propostaEquipeNomeById(item.propostaEdital)}
                                </TableCellText>
                              </td>
                            )}
                            <td className="max-w-[260px] px-6 py-2.5">
                              <TableCellText text={item.funcaoProjeto} muted>
                                {item.funcaoProjeto}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] tabular-nums text-muted-foreground">
                              {formatHoras(item.cargaHorariaPrevista)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-medium tabular-nums text-foreground">
                              {formatBRL(item.valorPrevisto)}
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
                          viewTo={`/equipe-edital/${item.id}`}
                          reportEndpoint={`/equipes-editais/${item.id}/relatorio`}
                          editTo={`/equipe-edital/${item.id}/editar`}
                          onDelete={() => setConfirmDelete(item)}
                        />
                        <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                          {tipoPessoaLabel(item.tipoPessoa)}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">
                        {pessoaEquipeNome(item)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.funcaoProjeto}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        {!propostaContexto && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">
                              Proposta de edital
                            </p>
                            <p className="text-foreground">
                              {propostaEquipeNomeById(item.propostaEdital)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Carga horária</p>
                          <p className="tabular-nums text-foreground">
                            {formatHoras(item.cargaHorariaPrevista)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Valor previsto
                          </p>
                          <p className="font-medium tabular-nums text-foreground">
                            {formatBRL(item.valorPrevisto)}
                          </p>
                        </div>
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
                  entityLabel="integrante"
                  entityLabelPlural="integrantes"
                  pageSizeLabel="Integrantes por página"
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
            <AlertDialogTitle>Remover integrante da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.{" "}
              <span className="font-medium text-foreground">
                {confirmDelete ? pessoaEquipeNome(confirmDelete) : ""}
              </span>{" "}
              deixará de compor a equipe desta proposta.
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
        pageTitle="Equipe da Proposta"
        href="https://www.aurit.com.br/wiki/editais/equipe-da-proposta"
      />
    </AppLayout>
  );
}

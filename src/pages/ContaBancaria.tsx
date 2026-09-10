import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Landmark,
  Loader2,
  PiggyBank,
  Plus,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/StatusPill";
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
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { FieldLabel } from "@/components/FieldLabel";
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
  deleteContaBancaria,
  getContasBancarias,
  nomeBancoLabel,
  nomeBancoOptions,
  statusContaBancariaLabel,
  statusContaBancariaOptions,
  tipoContaBancariaLabel,
  tipoContaBancariaOptions,
  type ContaBancariaData,
} from "@/data/contasBancarias";

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

const sortByOptions = [
  { value: "nomeConta", label: "Nome da conta" },
  { value: "nomeBanco", label: "Banco" },
  { value: "agencia", label: "Agência" },
  { value: "numeroConta", label: "Número da conta" },
  { value: "tipoContaBancaria", label: "Tipo de conta" },
  { value: "statusContaBancaria", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = { asc: "A–Z", desc: "Z–A" };

interface Filtros {
  nomeConta: string;
  banco: string[];
  tipo: string[];
  situacao: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  nomeConta: "",
  banco: [],
  tipo: [],
  situacao: [],
  sortBy: "nomeConta",
  sortDir: "asc",
};

export default function ContasBancarias() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContaBancariaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContaBancariaData | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "contas-bancarias:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await getContasBancarias());
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as contas bancárias.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nomeConta);

    const result = items.filter((i) => {
      if (nome && !normalize(i.nomeConta).includes(nome)) return false;
      if (filtros.banco.length && !filtros.banco.includes(i.nomeBanco))
        return false;
      if (filtros.tipo.length && !filtros.tipo.includes(i.tipoContaBancaria))
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(i.statusContaBancaria)
      )
        return false;
      return true;
    });

    const sortValue = (item: ContaBancariaData) => {
      switch (filtros.sortBy) {
        case "nomeBanco":
          return nomeBancoLabel(item.nomeBanco);
        case "agencia":
          return item.agencia || "";
        case "numeroConta":
          return item.numeroConta || "";
        case "tipoContaBancaria":
          return tipoContaBancariaLabel(item.tipoContaBancaria);
        case "statusContaBancaria":
          return statusContaBancariaLabel(item.statusContaBancaria);
        default:
          return item.nomeConta || "";
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

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const removeFromList = (
      key: "banco" | "tipo" | "situacao",
      value: string,
    ) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((v) => v !== value),
      });

    if (filtros.nomeConta.trim())
      list.push({
        id: "nomeConta",
        label: "Nome da conta",
        value: filtros.nomeConta.trim(),
        onRemove: () => applyFiltros({ ...filtros, nomeConta: "" }),
      });
    filtros.banco.forEach((value) =>
      list.push({
        id: `banco-${value}`,
        label: "Banco",
        value: labelOf(nomeBancoOptions, value),
        onRemove: () => removeFromList("banco", value),
      }),
    );
    filtros.tipo.forEach((value) =>
      list.push({
        id: `tipo-${value}`,
        label: "Tipo de conta",
        value: labelOf(tipoContaBancariaOptions, value),
        onRemove: () => removeFromList("tipo", value),
      }),
    );
    filtros.situacao.forEach((value) =>
      list.push({
        id: `situacao-${value}`,
        label: "Situação",
        value: labelOf(statusContaBancariaOptions, value),
        onRemove: () => removeFromList("situacao", value),
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
  }, [filtros]);

  const activeCount = activeFilters.length;
  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const toggleSort = (key: SortBy) => {
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteContaBancaria(confirmDelete.id);
      setItems((current) =>
        current.filter((item) => item.id !== confirmDelete.id),
      );
      toast.success("Conta bancária excluída com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a conta bancária.",
      );
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportColumns = [
    { header: "Nome da conta", key: "nomeConta" },
    { header: "Banco", key: "bancoLabel" },
    { header: "Agência", key: "agencia" },
    { header: "Número da conta", key: "numeroConta" },
    { header: "Tipo de conta", key: "tipoLabel" },
    { header: "Situação", key: "situacaoLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      bancoLabel: nomeBancoLabel(item.nomeBanco),
      tipoLabel: tipoContaBancariaLabel(item.tipoContaBancaria),
      situacaoLabel: statusContaBancariaLabel(item.statusContaBancaria),
    }));

  const totalContas = items.length;
  const contasAtivas = items.filter(
    (i) => i.statusContaBancaria === "ATIVO",
  ).length;
  const contasCorrentes = items.filter(
    (i) => i.tipoContaBancaria === "CORRENTE",
  ).length;
  const contasPoupanca = items.filter(
    (i) => i.tipoContaBancaria === "POUPANCA",
  ).length;

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Contas Bancárias"
          tooltip="Nesta página são cadastradas e acompanhadas as contas bancárias da organização. Esses registros permitem utilizar as contas nas diferentes rotinas financeiras da Aurit, como contas a pagar, contas a receber, fluxo de caixa e conciliação, mantendo seus dados e sua situação sempre atualizados."
          objective="Cadastre e mantenha atualizadas as contas bancárias utilizadas pela organização para que possam ser vinculadas corretamente aos registros e movimentações financeiras realizados na Aurit."
          actions={
            <Button
              type="button"
              variant="glassPrimary"
              onClick={() => navigate("/contas-bancarias/novo")}
              className="h-9 gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Cadastrar conta bancária
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de contas"
            value={totalContas}
            icon={Landmark}
            variant="neutral"
          />
          <SummaryStatCard
            title="Contas ativas"
            value={contasAtivas}
            icon={Wallet}
            variant="success"
          />
          <SummaryStatCard
            title="Contas correntes"
            value={contasCorrentes}
            icon={Building2}
            variant="info"
          />
          <SummaryStatCard
            title="Contas poupança"
            value={contasPoupanca}
            icon={PiggyBank}
            variant="warning"
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
                  <FieldLabel htmlFor="filtroNomeConta">
                    Nome da conta
                  </FieldLabel>
                  <Input
                    id="filtroNomeConta"
                    value={draft.nomeConta}
                    onChange={(e) => setDraftField("nomeConta", e.target.value)}
                    placeholder="Digite o nome da conta"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroBanco">Banco</FieldLabel>
                  <FilterMultiSelect
                    id="filtroBanco"
                    options={nomeBancoOptions}
                    value={draft.banco}
                    onChange={(value) => setDraftField("banco", value)}
                    placeholder="Todos os bancos"
                    summaryNoun="bancos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipo">Tipo de conta</FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipo"
                    options={tipoContaBancariaOptions}
                    value={draft.tipo}
                    onChange={(value) => setDraftField("tipo", value)}
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusContaBancariaOptions}
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
                    onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
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
                    onValueChange={(v) =>
                      setDraftField("sortDir", v as SortDir)
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
              reportTo="/relatorios/saldos-contas-bancarias"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="contas-bancarias"
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando contas bancárias...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar as contas bancárias.
                </p>
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Ocorreu um erro ao buscar os registros. Tente novamente.
                </p>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={load}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma conta bancária cadastrada."
                noResultsTitle="Nenhuma conta bancária encontrada com os filtros aplicados."
                createLabel="Cadastrar conta bancária"
                onCreate={() => navigate("/contas-bancarias/novo")}
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
                          sortKey="nomeConta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome da conta
                        </SortableTh>
                        <SortableTh
                          sortKey="nomeBanco"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Banco
                        </SortableTh>
                        <SortableTh
                          sortKey="agencia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Agência
                        </SortableTh>
                        <SortableTh
                          sortKey="numeroConta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Número da conta
                        </SortableTh>
                        <SortableTh
                          sortKey="tipoContaBancaria"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo de conta
                        </SortableTh>
                        <SortableTh
                          sortKey="statusContaBancaria"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((i) => (
                        <tr
                          key={i.id}
                          className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/contas-bancarias/${i.id}/relatorio`}
                              reportFilename={`conta-bancaria-${i.id}.pdf`}
                              viewTo={`/contas-bancarias/${i.id}`}
                              editTo={`/contas-bancarias/${i.id}/editar`}
                              onDelete={() => setConfirmDelete(i)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={i.nomeConta} bold>
                              {i.nomeConta}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={i.nomeBanco}
                              ariaLabelPrefix="Banco"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={i.agencia || "—"}
                              muted={!i.agencia}
                            >
                              {i.agencia || "—"}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={i.numeroConta || "—"}
                              muted={!i.numeroConta}
                            >
                              {i.numeroConta || "—"}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={i.tipoContaBancaria}
                              ariaLabelPrefix="Tipo de conta"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusContaBancariaLabel(
                                i.statusContaBancaria,
                              )}
                              ariaLabelPrefix="Situação da conta"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((i) => (
                    <div key={i.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={`/contas-bancarias/${i.id}/relatorio`}
                          reportFilename={`conta-bancaria-${i.id}.pdf`}
                          viewTo={`/contas-bancarias/${i.id}`}
                          editTo={`/contas-bancarias/${i.id}/editar`}
                          onDelete={() => setConfirmDelete(i)}
                        />
                        <StatusPill
                          status={statusContaBancariaLabel(
                            i.statusContaBancaria,
                          )}
                          ariaLabelPrefix="Situação da conta"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {i.nomeConta}
                      </p>
                      <div className="mt-1">
                        <StatusPill
                          status={i.nomeBanco}
                          ariaLabelPrefix="Banco"
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Agência {i.agencia || "—"} · Conta{" "}
                        {i.numeroConta || "—"}
                      </p>
                      <div className="mt-1">
                        <StatusPill
                          status={i.tipoContaBancaria}
                          ariaLabelPrefix="Tipo de conta"
                        />
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a conta “
              {confirmDelete?.nomeConta}”? Esta ação não pode ser desfeita.
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
        pageTitle="Contas Bancárias"
        href="/wiki/financeiro/contas-bancarias"
      />
    </AppLayout>
  );
}

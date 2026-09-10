import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  deleteTransferencia,
  formaTransferenciaLabel,
  formaTransferenciaOptions,
  formatCurrency,
  formatDate,
  getTransferencias,
  parseMoney,
  statusTransferenciaLabel,
  statusTransferenciaOptions,
  type TransferenciaBancariaData,
} from "@/data/transferenciaBancaria";
import {
  getContasBancarias,
  nomeBancoLabel,
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
  { value: "nomeTransferencia", label: "Transferência" },
  { value: "contaOrigem", label: "Conta de origem" },
  { value: "contaDestino", label: "Conta de destino" },
  { value: "dataTransferencia", label: "Data da transferência" },
  { value: "dataEfetivacao", label: "Data de efetivação" },
  { value: "valorTransferencia", label: "Valor da transferência" },
  { value: "formaPagamento", label: "Forma da transferência" },
  { value: "statusTransferencia", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = {
  asc: "Crescente",
  desc: "Decrescente",
};

interface Filtros {
  nomeTransferencia: string;
  contaOrigem: string[];
  contaDestino: string[];
  formaPagamento: string[];
  situacao: string[];
  transferenciaDe: string;
  transferenciaAte: string;
  efetivacaoDe: string;
  efetivacaoAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  nomeTransferencia: "",
  contaOrigem: [],
  contaDestino: [],
  formaPagamento: [],
  situacao: [],
  transferenciaDe: "",
  transferenciaAte: "",
  efetivacaoDe: "",
  efetivacaoAte: "",
  sortBy: "dataTransferencia",
  sortDir: "desc",
};

const dateFieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

export default function TransferenciasBancarias() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TransferenciaBancariaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmDelete, setConfirmDelete] =
    useState<TransferenciaBancariaData | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "transferencias-bancarias:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const [contasBancarias, setContasBancarias] = useState<ContaBancariaData[]>(
    [],
  );

  const contaOptions = useMemo(
    () =>
      contasBancarias.map((c) => ({
        value: c.id,
        label: `${c.nomeConta || "Conta sem nome"} · ${nomeBancoLabel(c.nomeBanco)}`,
      })),
    [contasBancarias],
  );

  const contaLabel = (id: string) =>
    contaOptions.find((o) => o.value === id)?.label || "—";

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [transferencias, contas] = await Promise.all([
        getTransferencias(),
        getContasBancarias(),
      ]);
      setItems(transferencias);
      setContasBancarias(contas);
    } catch {
      setLoadError(true);
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
    const nome = normalize(filtros.nomeTransferencia);

    const inRange = (value: string, de: string, ate: string) => {
      if (de && (!value || value < de)) return false;
      if (ate && (!value || value > ate)) return false;
      return true;
    };

    const result = items.filter((i) => {
      if (nome && !normalize(i.nomeTransferencia).includes(nome)) return false;
      if (
        filtros.contaOrigem.length &&
        !filtros.contaOrigem.includes(i.contaOrigemId)
      )
        return false;
      if (
        filtros.contaDestino.length &&
        !filtros.contaDestino.includes(i.contaDestinoId)
      )
        return false;
      if (
        filtros.formaPagamento.length &&
        !filtros.formaPagamento.includes(i.formaPagamento)
      )
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(i.statusTransferenciaBancaria)
      )
        return false;
      if (
        !inRange(
          i.dataTransferencia,
          filtros.transferenciaDe,
          filtros.transferenciaAte,
        )
      )
        return false;
      if (
        !inRange(
          i.dataEfetivacaoTransferencia,
          filtros.efetivacaoDe,
          filtros.efetivacaoAte,
        )
      )
        return false;
      return true;
    });

    const sortValue = (item: TransferenciaBancariaData): string | number => {
      switch (filtros.sortBy) {
        case "contaOrigem":
          return contaLabel(item.contaOrigemId);
        case "contaDestino":
          return contaLabel(item.contaDestinoId);
        case "dataTransferencia":
          return item.dataTransferencia || "";
        case "dataEfetivacao":
          return item.dataEfetivacaoTransferencia || "";
        case "valorTransferencia":
          return parseMoney(item.valorTransferencia);
        case "formaPagamento":
          return formaTransferenciaLabel(item.formaPagamento);
        case "statusTransferencia":
          return statusTransferenciaLabel(item.statusTransferenciaBancaria);
        default:
          return item.nomeTransferencia || "";
      }
    };

    return [...result].sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      const compare =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros, contaOptions]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    type MultiKey =
      | "contaOrigem"
      | "contaDestino"
      | "formaPagamento"
      | "situacao";
    const removeFromList = (key: MultiKey, value: string) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((v) => v !== value),
      });

    if (filtros.nomeTransferencia.trim()) {
      list.push({
        id: "nomeTransferencia",
        label: "Nome da transferência",
        value: filtros.nomeTransferencia.trim(),
        onRemove: () => applyFiltros({ ...filtros, nomeTransferencia: "" }),
      });
    }

    const pushMulti = (
      key: MultiKey,
      label: string,
      resolve: (value: string) => string,
    ) =>
      filtros[key].forEach((value) =>
        list.push({
          id: `${key}-${value}`,
          label,
          value: resolve(value),
          onRemove: () => removeFromList(key, value),
        }),
      );

    pushMulti("contaOrigem", "Conta de origem", (v) => contaLabel(v));
    pushMulti("contaDestino", "Conta de destino", (v) => contaLabel(v));
    pushMulti("formaPagamento", "Forma da transferência", (v) =>
      labelOf(formaTransferenciaOptions, v),
    );
    pushMulti("situacao", "Situação", (v) =>
      labelOf(statusTransferenciaOptions, v),
    );

    const pushDate = (key: keyof Filtros, label: string) => {
      const value = filtros[key] as string;
      if (!value) return;
      list.push({
        id: String(key),
        label,
        value: formatDate(value),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };

    pushDate("transferenciaDe", "Transferência inicial");
    pushDate("transferenciaAte", "Transferência final");
    pushDate("efetivacaoDe", "Efetivação inicial");
    pushDate("efetivacaoAte", "Efetivação final");

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
  }, [filtros, contaOptions]);

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
      await deleteTransferencia(confirmDelete.id);
      setItems((current) =>
        current.filter((item) => item.id !== confirmDelete.id),
      );
      toast.success("Transferência bancária excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a transferência bancária.",
      );
    }
  };

  const exportColumns = [
    { header: "Transferência", key: "nomeTransferencia" },
    { header: "Conta de origem", key: "contaOrigemLabel" },
    { header: "Conta de destino", key: "contaDestinoLabel" },
    { header: "Data da transferência", key: "dataTransferenciaLabel" },
    { header: "Data de efetivação", key: "dataEfetivacaoLabel" },
    { header: "Valor da transferência", key: "valorLabel" },
    { header: "Forma da transferência", key: "formaLabel" },
    { header: "Situação", key: "situacaoLabel" },
    { header: "Número do documento", key: "numeroDocumento" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      contaOrigemLabel: contaLabel(item.contaOrigemId),
      contaDestinoLabel: contaLabel(item.contaDestinoId),
      dataTransferenciaLabel: formatDate(item.dataTransferencia),
      dataEfetivacaoLabel: formatDate(item.dataEfetivacaoTransferencia),
      valorLabel: formatCurrency(parseMoney(item.valorTransferencia)),
      formaLabel: formaTransferenciaLabel(item.formaPagamento),
      situacaoLabel: statusTransferenciaLabel(item.statusTransferenciaBancaria),
    }));

  const realizadas = items.filter(
    (i) => i.statusTransferenciaBancaria === "REALIZADO",
  );
  const agendadas = items.filter(
    (i) => i.statusTransferenciaBancaria === "AGENDADO",
  ).length;
  const canceladas = items.filter(
    (i) => i.statusTransferenciaBancaria === "CANCELADO",
  ).length;
  const totalTransferido = realizadas.reduce(
    (acc, i) => acc + parseMoney(i.valorTransferencia),
    0,
  );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Transferências Bancárias"
          tooltip="Nesta página são cadastradas e acompanhadas as transferências de valores entre as contas bancárias da organização. Esses registros permitem acompanhar de onde o recurso saiu, para qual conta foi enviado, o valor movimentado, a situação da transferência e o histórico dessas movimentações entre contas."
          objective="Cadastre e acompanhe as transferências realizadas entre as contas bancárias da organização para manter organizado o histórico das movimentações internas e facilitar o controle dos valores transferidos entre as contas."
          actions={
            <Button
              type="button"
              variant="glassPrimary"
              onClick={() => navigate("/transferencias-bancarias/novo")}
              className="h-9 gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Cadastrar transferência bancária
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total transferido"
            value={formatCurrency(totalTransferido)}
            icon={ArrowLeftRight}
            variant="info"
          />
          <SummaryStatCard
            title="Agendados"
            value={agendadas}
            icon={Clock}
            variant="warning"
          />
          <SummaryStatCard
            title="Realizadas"
            value={realizadas.length}
            icon={CheckCircle2}
            variant="success"
          />
          <SummaryStatCard
            title="Canceladas"
            value={canceladas}
            icon={Ban}
            variant="danger"
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
                  <FieldLabel htmlFor="filtroNomeTransferencia">
                    Nome da transferência
                  </FieldLabel>
                  <Input
                    id="filtroNomeTransferencia"
                    value={draft.nomeTransferencia}
                    onChange={(e) =>
                      setDraftField("nomeTransferencia", e.target.value)
                    }
                    placeholder="Digite o nome da transferência"
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroContaOrigem">
                    Conta de origem
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroContaOrigem"
                    options={contaOptions}
                    value={draft.contaOrigem}
                    onChange={(value) => setDraftField("contaOrigem", value)}
                    placeholder="Todas as contas"
                    summaryNoun="contas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroContaDestino">
                    Conta de destino
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroContaDestino"
                    options={contaOptions}
                    value={draft.contaDestino}
                    onChange={(value) => setDraftField("contaDestino", value)}
                    placeholder="Todas as contas"
                    summaryNoun="contas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroFormaTransferencia">
                    Forma da transferência
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroFormaTransferencia"
                    options={formaTransferenciaOptions}
                    value={draft.formaPagamento}
                    onChange={(value) => setDraftField("formaPagamento", value)}
                    placeholder="Todas as formas"
                    summaryNoun="formas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusTransferenciaOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTransferenciaDe">
                    Data inicial da transferência
                  </FieldLabel>
                  <Input
                    id="filtroTransferenciaDe"
                    type="date"
                    value={draft.transferenciaDe}
                    onChange={(e) =>
                      setDraftField("transferenciaDe", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTransferenciaAte">
                    Data final da transferência
                  </FieldLabel>
                  <Input
                    id="filtroTransferenciaAte"
                    type="date"
                    value={draft.transferenciaAte}
                    onChange={(e) =>
                      setDraftField("transferenciaAte", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroEfetivacaoDe">
                    Data inicial de efetivação
                  </FieldLabel>
                  <Input
                    id="filtroEfetivacaoDe"
                    type="date"
                    value={draft.efetivacaoDe}
                    onChange={(e) =>
                      setDraftField("efetivacaoDe", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroEfetivacaoAte">
                    Data final de efetivação
                  </FieldLabel>
                  <Input
                    id="filtroEfetivacaoAte"
                    type="date"
                    value={draft.efetivacaoAte}
                    onChange={(e) =>
                      setDraftField("efetivacaoAte", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
                  >
                    <SelectTrigger id="filtroSortBy" className={dateFieldClass}>
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
                      className={dateFieldClass}
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
              reportTo="/relatorios/transferencias-bancarias"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="transferencias-bancarias"
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando transferências bancárias...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar as transferências bancárias.
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
                emptyTitle="Nenhuma transferência bancária cadastrada."
                noResultsTitle="Nenhuma transferência bancária encontrada com os filtros aplicados."
                createLabel="Cadastrar transferência bancária"
                onCreate={() => navigate("/transferencias-bancarias/novo")}
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
                          sortKey="nomeTransferencia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Transferência
                        </SortableTh>
                        <SortableTh
                          sortKey="contaOrigem"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Conta de origem
                        </SortableTh>
                        <SortableTh
                          sortKey="contaDestino"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Conta de destino
                        </SortableTh>
                        <SortableTh
                          sortKey="dataTransferencia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data
                        </SortableTh>
                        <SortableTh
                          sortKey="valorTransferencia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Valor
                        </SortableTh>
                        <SortableTh
                          sortKey="formaPagamento"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Forma
                        </SortableTh>
                        <SortableTh
                          sortKey="statusTransferencia"
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
                              reportEndpoint={`/transferencias-bancarias/${i.id}/relatorio`}
                              reportFilename={`transferencia-bancaria-${i.id}.pdf`}
                              viewTo={`/transferencias-bancarias/${i.id}`}
                              editTo={`/transferencias-bancarias/${i.id}/editar`}
                              onDelete={() => setConfirmDelete(i)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={i.nomeTransferencia} bold>
                              {i.nomeTransferencia}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={contaLabel(i.contaOrigemId)}>
                              {contaLabel(i.contaOrigemId)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={contaLabel(i.contaDestinoId)}>
                              {contaLabel(i.contaDestinoId)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={formatDate(i.dataTransferencia)}
                            >
                              {formatDate(i.dataTransferencia)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-right md:text-left">
                            <TableCellText
                              text={formatCurrency(
                                parseMoney(i.valorTransferencia),
                              )}
                              bold
                            >
                              {formatCurrency(parseMoney(i.valorTransferencia))}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={i.formaPagamento}
                              ariaLabelPrefix="Forma da transferência"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusTransferenciaLabel(
                                i.statusTransferenciaBancaria,
                              )}
                              ariaLabelPrefix="Situação da transferência"
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
                          reportEndpoint={`/transferencias-bancarias/${i.id}/relatorio`}
                          reportFilename={`transferencia-bancaria-${i.id}.pdf`}
                          viewTo={`/transferencias-bancarias/${i.id}`}
                          editTo={`/transferencias-bancarias/${i.id}/editar`}
                          onDelete={() => setConfirmDelete(i)}
                        />
                        <StatusPill
                          status={statusTransferenciaLabel(
                            i.statusTransferenciaBancaria,
                          )}
                          ariaLabelPrefix="Situação da transferência"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {i.nomeTransferencia}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {contaLabel(i.contaOrigemId)} →{" "}
                        {contaLabel(i.contaDestinoId)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatCurrency(parseMoney(i.valorTransferencia))}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Transferência {formatDate(i.dataTransferencia)}
                        {i.dataEfetivacaoTransferencia
                          ? ` · Efetivação ${formatDate(i.dataEfetivacaoTransferencia)}`
                          : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-border/70 bg-background/60 font-medium backdrop-blur-sm"
                        >
                          {formaTransferenciaLabel(i.formaPagamento)}
                        </Badge>
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
            <AlertDialogTitle>Excluir transferência bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a transferência “
              {confirmDelete?.nomeTransferencia}”? Esta ação não pode ser
              desfeita.
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
        pageTitle="Transferências Bancárias"
        href="/wiki/financeiro/transferencia-bancaria"
      />
    </AppLayout>
  );
}

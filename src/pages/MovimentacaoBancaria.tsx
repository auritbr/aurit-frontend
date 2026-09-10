import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  Landmark,
  ListOrdered,
  Loader2,
  RotateCcw,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getContasBancarias,
  nomeBancoLabel,
  statusContaBancariaLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import {
  formatCurrency,
  formatDate,
  getExtratoBancario,
  getMovimentacoesBancarias,
  getSaldoContaBancaria,
  origemMovimentacaoLabel,
  origemMovimentacaoOptions,
  reconciliarMovimentacoesBancarias,
  tipoMovimentacaoOptions,
  totalEntradas,
  totalSaidas,
  type MovimentacaoBancaria,
} from "@/data/movimentacaoBancaris";
import { FINANCIAL_DATA_INVALIDATED_EVENT } from "@/lib/financialDataInvalidation";

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

const fieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

const sortByOptions = [
  { value: "dataMovimentacao", label: "Data da movimentação" },
  { value: "historico", label: "Histórico" },
  { value: "contaBancaria", label: "Conta bancária" },
  { value: "origemMovimentacao", label: "Origem da movimentação" },
  { value: "valor", label: "Valor" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = {
  asc: "Crescente",
  desc: "Decrescente",
};

interface Filtros {
  historico: string;
  contaBancaria: string;
  tipoMovimentacao: string[];
  origemMovimentacao: string[];
  dataDe: string;
  dataAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  historico: "",
  contaBancaria: "",
  tipoMovimentacao: [],
  origemMovimentacao: [],
  dataDe: "",
  dataAte: "",
  sortBy: "dataMovimentacao",
  sortDir: "desc",
};

/** Seleção única com pesquisa — mesmo acabamento dos selects do módulo Financeiro. */
function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return options;
    return options.filter((option) => normalize(option.label).includes(term));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 text-left text-[13px] backdrop-blur-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            "h-9",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[260px] rounded-[13px] border-border/70 bg-popover/90 p-2 backdrop-blur-xl"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar conta bancária"
          className="mb-2 h-8 rounded-[9px] text-[13px]"
        />
        <div className="max-h-64 overflow-y-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] hover:bg-muted/70"
          >
            <Check
              className={cn("h-3.5 w-3.5", value ? "opacity-0" : "opacity-100")}
              aria-hidden
            />
            {placeholder}
          </button>
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] hover:bg-muted/70"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  value === option.value ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-[13px] text-muted-foreground">
              Nenhuma conta encontrada.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ExtratoBancario() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contaParam = searchParams.get("contaBancariaId") || "";

  const [items, setItems] = useState<MovimentacaoBancaria[]>([]);
  const [contas, setContas] = useState<ContaBancariaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [saldoSelecionado, setSaldoSelecionado] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "extrato-bancario:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>({
    ...emptyFiltros,
    contaBancaria: contaParam,
  });
  const [filtros, setFiltros] = useState<Filtros>({
    ...emptyFiltros,
    contaBancaria: contaParam,
  });
  const [searching, setSearching] = useState(false);
  const reconciliado = useRef(false);

  const load = useCallback(async (scope: Filtros) => {
    setLoading(true);
    setLoadError(false);
    setAccessDeniedMessage(null);
    try {
      if (!reconciliado.current) {
        reconciliado.current = true;
        try {
          await reconciliarMovimentacoesBancarias();
        } catch (error) {
          reconciliado.current = false;
          throw error;
        }
      }
      const [contasResponse, movimentacoesResponse, saldoResponse] =
        await Promise.all([
          getContasBancarias(),
          scope.contaBancaria
            ? getExtratoBancario(
                scope.contaBancaria,
                scope.dataDe && scope.dataAte ? scope.dataDe : undefined,
                scope.dataDe && scope.dataAte ? scope.dataAte : undefined,
              )
            : getMovimentacoesBancarias(),
          scope.contaBancaria
            ? getSaldoContaBancaria(scope.contaBancaria)
            : Promise.resolve(null),
        ]);
      setContas(contasResponse);
      setItems(movimentacoesResponse);
      setSaldoSelecionado(saldoResponse);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o extrato bancário.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      setLoadError(true);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filtros);
    // Recarrega o extrato quando muda o escopo aceito pelo endpoint do backend.
  }, [filtros, load]);

  useEffect(() => {
    const refresh = () => void load(filtros);
    window.addEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
  }, [filtros, load]);

  const contaOptions = useMemo(
    () =>
      contas.map((conta) => {
        const detalhes = [
          nomeBancoLabel(conta.nomeBanco),
          conta.agencia ? `Ag. ${conta.agencia}` : "",
          conta.numeroConta ? `Conta ${conta.numeroConta}` : "",
        ].filter(Boolean);
        return {
          value: conta.id,
          label: [conta.nomeConta || "Conta sem nome", ...detalhes].join(" · "),
        };
      }),
    [contas],
  );

  const contaLabel = (id: string) =>
    contaOptions.find((option) => option.value === id)?.label || "—";
  const contaNome = (id: string) =>
    contas.find((conta) => conta.id === id)?.nomeConta || "—";
  const contaSelecionada = contas.find(
    (conta) => conta.id === filtros.contaBancaria,
  );

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (next.contaBancaria) params.set("contaBancariaId", next.contaBancaria);
    else params.delete("contaBancariaId");
    setSearchParams(params, { replace: true });
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (searching) return;
    if ((draft.dataDe && !draft.dataAte) || (!draft.dataDe && draft.dataAte)) {
      toast.error(
        "Informe a data inicial e a data final para filtrar o período.",
      );
      return;
    }
    if (draft.dataDe && draft.dataAte && draft.dataDe > draft.dataAte) {
      toast.error("A data inicial não pode ser posterior à data final.");
      return;
    }
    applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const historico = normalize(filtros.historico);

    const result = items.filter((item) => {
      if (historico && !normalize(item.historico).includes(historico))
        return false;
      if (
        filtros.contaBancaria &&
        item.contaBancariaId !== filtros.contaBancaria
      )
        return false;
      if (
        filtros.tipoMovimentacao.length &&
        !filtros.tipoMovimentacao.includes(item.tipoMovimentacao)
      )
        return false;
      if (
        filtros.origemMovimentacao.length &&
        !filtros.origemMovimentacao.includes(item.origemMovimentacao)
      )
        return false;
      if (
        filtros.dataDe &&
        (!item.dataMovimentacao || item.dataMovimentacao < filtros.dataDe)
      )
        return false;
      if (
        filtros.dataAte &&
        (!item.dataMovimentacao || item.dataMovimentacao > filtros.dataAte)
      )
        return false;
      return true;
    });

    const sortValue = (item: MovimentacaoBancaria): string | number => {
      switch (filtros.sortBy) {
        case "historico":
          return item.historico || "";
        case "contaBancaria":
          return contaLabel(item.contaBancariaId);
        case "origemMovimentacao":
          return origemMovimentacaoLabel(item.origemMovimentacao);
        case "valor":
          return item.valor;
        default:
          return `${item.dataMovimentacao || ""}${item.criadoEm || ""}`;
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
    type MultiKey = "tipoMovimentacao" | "origemMovimentacao";

    if (filtros.historico.trim()) {
      list.push({
        id: "historico",
        label: "Histórico",
        value: filtros.historico.trim(),
        onRemove: () => applyFiltros({ ...filtros, historico: "" }),
      });
    }

    if (filtros.contaBancaria) {
      list.push({
        id: "contaBancaria",
        label: "Conta bancária",
        value: contaLabel(filtros.contaBancaria),
        onRemove: () => applyFiltros({ ...filtros, contaBancaria: "" }),
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
          onRemove: () =>
            applyFiltros({
              ...filtros,
              [key]: filtros[key].filter((v) => v !== value),
            }),
        }),
      );

    pushMulti("tipoMovimentacao", "Tipo de movimentação", (v) =>
      labelOf(tipoMovimentacaoOptions, v),
    );
    pushMulti("origemMovimentacao", "Origem da movimentação", (v) =>
      labelOf(origemMovimentacaoOptions, v),
    );

    const pushDate = (key: "dataDe" | "dataAte", label: string) => {
      if (!filtros[key]) return;
      list.push({
        id: key,
        label,
        value: formatDate(filtros[key]),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };

    pushDate("dataDe", "Data inicial");
    pushDate("dataAte", "Data final");

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

  const entradas = totalEntradas(filtered);
  const saidas = totalSaidas(filtered);
  const saldoCalculado = useMemo(() => {
    const escopo = items.filter(
      (item) =>
        !filtros.contaBancaria ||
        item.contaBancariaId === filtros.contaBancaria,
    );
    return totalEntradas(escopo) - totalSaidas(escopo);
  }, [items, filtros.contaBancaria]);
  const saldoConta =
    filtros.contaBancaria && saldoSelecionado !== null
      ? saldoSelecionado
      : saldoCalculado;

  const exportColumns = [
    { header: "Data", key: "dataLabel" },
    { header: "Conta bancária", key: "contaLabel" },
    { header: "Histórico", key: "historico" },
    { header: "Origem", key: "origemLabel" },
    { header: "Tipo", key: "tipoLabel" },
    { header: "Entrada", key: "entradaLabel" },
    { header: "Saída", key: "saidaLabel" },
    { header: "Registro de origem", key: "registroOrigem" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      dataLabel: formatDate(item.dataMovimentacao),
      contaLabel: contaLabel(item.contaBancariaId),
      origemLabel: origemMovimentacaoLabel(item.origemMovimentacao),
      tipoLabel: item.tipoMovimentacao === "ENTRADA" ? "Entrada" : "Saída",
      entradaLabel:
        item.tipoMovimentacao === "ENTRADA" ? formatCurrency(item.valor) : "",
      saidaLabel:
        item.tipoMovimentacao === "SAIDA" ? formatCurrency(item.valor) : "",
      registroOrigem:
        item.contaPagarId ||
        item.contaReceberId ||
        item.transferenciaBancariaId ||
        item.movimentacaoEstornadaId ||
        "",
    }));

  const estornoPorOriginalId = useMemo(() => {
    const mapa = new Map<string, MovimentacaoBancaria>();
    items.forEach((item) => {
      if (
        item.origemMovimentacao === "ESTORNO" &&
        item.movimentacaoEstornadaId
      ) {
        mapa.set(item.movimentacaoEstornadaId, item);
      }
    });
    return mapa;
  }, [items]);

  const estornoDaMovimentacao = (item: MovimentacaoBancaria) =>
    estornoPorOriginalId.get(item.id);

  const origemRoute = (item: MovimentacaoBancaria) => {
    if (item.contaPagarId) return `/contas-pagar/${item.contaPagarId}`;
    if (item.contaReceberId) return `/contas-receber/${item.contaReceberId}`;
    if (item.transferenciaBancariaId)
      return `/transferencias-bancarias/${item.transferenciaBancariaId}`;
    return "";
  };

  const rowActions = (item: MovimentacaoBancaria) => {
    const route = origemRoute(item);
    const extraItems = [];
    if (route) extraItems.push({ label: "Ver origem", to: route });
    if (item.movimentacaoEstornadaId) {
      extraItems.push({
        label: "Ver movimentação original",
        onClick: () => applyFiltros({ ...filtros, historico: "" }),
      });
    }
    return extraItems;
  };

  const valorEntrada = (item: MovimentacaoBancaria) =>
    item.tipoMovimentacao === "ENTRADA"
      ? formatCurrency(item.valor)
      : "R$ 0,00";
  const valorSaida = (item: MovimentacaoBancaria) =>
    item.tipoMovimentacao === "SAIDA" ? formatCurrency(item.valor) : "R$ 0,00";

  const semContas = !loading && !loadError && contas.length === 0;

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
          title="Movimentações Bancárias"
          tooltip="Nesta página são apresentadas as movimentações registradas nas contas bancárias da organização, geradas a partir de pagamentos, recebimentos, transferências e outros registros financeiros. Utilize os filtros para consultar o extrato de cada conta, acompanhar entradas e saídas e conferir como cada movimentação foi registrada no sistema."
          objective="Acompanhe as movimentações das contas bancárias da organização e consulte a origem de cada entrada ou saída. Esses registros ajudam a conferir o fluxo financeiro, os saldos das contas e a movimentação dos recursos ao longo do tempo."
        />

        <div className="mb-4 grid grid-cols-1 gap-4 rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <FieldLabel htmlFor="filtroContaExtrato">Conta bancária</FieldLabel>
            <SearchableSelect
              id="filtroContaExtrato"
              options={contaOptions}
              value={draft.contaBancaria}
              onChange={(value) =>
                applyFiltros({ ...draft, contaBancaria: value })
              }
              placeholder="Todas as contas bancárias"
            />
          </div>
          <div>
            <FieldLabel htmlFor="filtroDataDeTopo">Data inicial</FieldLabel>
            <Input
              id="filtroDataDeTopo"
              type="date"
              value={draft.dataDe}
              onChange={(event) =>
                applyFiltros({ ...draft, dataDe: event.target.value })
              }
              className={fieldClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="filtroDataAteTopo">Data final</FieldLabel>
            <Input
              id="filtroDataAteTopo"
              type="date"
              value={draft.dataAte}
              onChange={(event) =>
                applyFiltros({ ...draft, dataAte: event.target.value })
              }
              className={fieldClass}
            />
          </div>
        </div>

        {contaSelecionada && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-border/60 bg-muted/25 px-4 py-2.5 backdrop-blur-sm">
            <span className="text-[13px] font-semibold text-foreground">
              {contaSelecionada.nomeConta || "Conta sem nome"}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {nomeBancoLabel(contaSelecionada.nomeBanco)}
              {contaSelecionada.agencia
                ? ` · Agência ${contaSelecionada.agencia}`
                : ""}
              {contaSelecionada.numeroConta
                ? ` · Conta ${contaSelecionada.numeroConta}`
                : ""}
            </span>
            <StatusPill
              status={statusContaBancariaLabel(
                contaSelecionada.statusContaBancaria,
              )}
              ariaLabelPrefix="Situação da conta"
            />
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[70px] rounded-[16px]" />
            ))
          ) : (
            <>
              <SummaryStatCard
                title="Saldo atual"
                value={formatCurrency(saldoConta)}
                icon={Wallet}
                variant="neutral"
              />
              <SummaryStatCard
                title="Entradas"
                value={formatCurrency(entradas)}
                icon={ArrowDownLeft}
                variant="success"
              />
              <SummaryStatCard
                title="Saídas"
                value={formatCurrency(saidas)}
                icon={ArrowUpRight}
                variant="danger"
              />
              <SummaryStatCard
                title="Movimentações"
                value={filtered.length}
                icon={ListOrdered}
                variant="info"
              />
            </>
          )}
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
                  <FieldLabel htmlFor="filtroHistorico">Histórico</FieldLabel>
                  <Input
                    id="filtroHistorico"
                    value={draft.historico}
                    onChange={(event) =>
                      setDraftField("historico", event.target.value)
                    }
                    placeholder="Digite parte do histórico"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroContaAvancada">
                    Conta bancária
                  </FieldLabel>
                  <SearchableSelect
                    id="filtroContaAvancada"
                    options={contaOptions}
                    value={draft.contaBancaria}
                    onChange={(value) => setDraftField("contaBancaria", value)}
                    placeholder="Todas as contas bancárias"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipoMovimentacao">
                    Tipo de movimentação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipoMovimentacao"
                    options={tipoMovimentacaoOptions}
                    value={draft.tipoMovimentacao}
                    onChange={(value) =>
                      setDraftField("tipoMovimentacao", value)
                    }
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroOrigemMovimentacao">
                    Origem da movimentação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroOrigemMovimentacao"
                    options={origemMovimentacaoOptions}
                    value={draft.origemMovimentacao}
                    onChange={(value) =>
                      setDraftField("origemMovimentacao", value)
                    }
                    placeholder="Todas as origens"
                    summaryNoun="origens selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataDe">Data inicial</FieldLabel>
                  <Input
                    id="filtroDataDe"
                    type="date"
                    value={draft.dataDe}
                    onChange={(event) =>
                      setDraftField("dataDe", event.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataAte">Data final</FieldLabel>
                  <Input
                    id="filtroDataAte"
                    type="date"
                    value={draft.dataAte}
                    onChange={(event) =>
                      setDraftField("dataAte", event.target.value)
                    }
                    className={fieldClass}
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
                    <SelectTrigger id="filtroSortBy" className={fieldClass}>
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
                    <SelectTrigger id="filtroSortDir" className={fieldClass}>
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
              reportTo="/relatorios/movimentacoes-financeiras"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="extrato-bancario"
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando extrato bancário...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar o extrato bancário.
                </p>
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Ocorreu um erro ao buscar as movimentações. Tente novamente.
                </p>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => void load(filtros)}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
                </Button>
              </div>
            ) : semContas ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                  <Landmark className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma conta bancária cadastrada.
                </p>
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Cadastre uma conta bancária para acompanhar saldos e
                  movimentações no extrato.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma movimentação bancária registrada."
                emptyDescription="As movimentações serão exibidas automaticamente quando pagamentos, recebimentos ou transferências forem efetivados."
                noResultsTitle="Nenhuma movimentação encontrada com os filtros aplicados."
                activeCount={activeCount}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full w-max whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="dataMovimentacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data
                        </SortableTh>
                        <SortableTh
                          sortKey="contaBancaria"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Conta bancária
                        </SortableTh>
                        <SortableTh
                          sortKey="historico"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Histórico
                        </SortableTh>
                        <SortableTh
                          sortKey="origemMovimentacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Origem
                        </SortableTh>
                        <SortableTh
                          sortKey="valor"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                          className="text-right"
                        >
                          Entrada
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Saída
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => {
                        const estorno = estornoDaMovimentacao(item);
                        const foiEstornada = Boolean(estorno);
                        const ehEstorno = item.origemMovimentacao === "ESTORNO";
                        return (
                          <tr
                            id={`movimentacao-${item.id}`}
                            key={item.id}
                            className={cn(
                              "border-b border-border/50 last:border-0 transition-colors",
                              foiEstornada &&
                                "bg-muted/40 text-muted-foreground hover:bg-muted/55",
                              ehEstorno &&
                                "bg-rose-50/60 hover:bg-rose-50/80 dark:bg-rose-950/15 dark:hover:bg-rose-950/25",
                              !foiEstornada &&
                                !ehEstorno &&
                                "hover:bg-muted/25",
                            )}
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                extraItems={rowActions(item)}
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={formatDate(item.dataMovimentacao)}
                              >
                                {formatDate(item.dataMovimentacao)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <TableCellText
                                text={contaNome(item.contaBancariaId)}
                              >
                                {contaNome(item.contaBancariaId)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[13px] font-medium",
                                    foiEstornada &&
                                      "line-through decoration-rose-500/70 decoration-2",
                                  )}
                                >
                                  {item.historico}
                                </span>
                                {foiEstornada && (
                                  <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                    Estornada pela movimentação #{estorno?.id}
                                  </span>
                                )}
                                {ehEstorno && item.movimentacaoEstornadaId && (
                                  <span className="text-[11px] text-rose-700 dark:text-rose-300">
                                    Referente à movimentação #
                                    {item.movimentacaoEstornadaId}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              {foiEstornada ? (
                                <Badge
                                  variant="outline"
                                  className="gap-1 whitespace-nowrap border-rose-300/80 bg-rose-50/80 font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                                >
                                  <Undo2 className="h-3 w-3" aria-hidden />{" "}
                                  Estornada
                                </Badge>
                              ) : (
                                <StatusPill
                                  status={item.origemMovimentacao}
                                  ariaLabelPrefix="Origem da movimentação"
                                />
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-right">
                              <span
                                className={cn(
                                  "text-[13px] leading-snug",
                                  item.tipoMovimentacao === "ENTRADA"
                                    ? "font-medium text-emerald-700"
                                    : "text-muted-foreground",
                                  foiEstornada &&
                                    "line-through decoration-rose-500/70 decoration-2 text-muted-foreground",
                                )}
                              >
                                {valorEntrada(item)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-right">
                              <span
                                className={cn(
                                  "text-[13px] leading-snug",
                                  item.tipoMovimentacao === "SAIDA"
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground",
                                  foiEstornada &&
                                    "line-through decoration-rose-500/70 decoration-2 text-muted-foreground",
                                )}
                              >
                                {valorSaida(item)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((item) => {
                    const estorno = estornoDaMovimentacao(item);
                    const foiEstornada = Boolean(estorno);
                    const ehEstorno = item.origemMovimentacao === "ESTORNO";
                    return (
                      <div
                        id={`movimentacao-mobile-${item.id}`}
                        key={item.id}
                        className={cn(
                          "p-4",
                          foiEstornada && "bg-muted/40 text-muted-foreground",
                          ehEstorno && "bg-rose-50/60 dark:bg-rose-950/15",
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <RowActionsDropdown extraItems={rowActions(item)} />
                          {foiEstornada ? (
                            <StatusPill
                              status="Estornada"
                              ariaLabelPrefix="Origem da movimentação"
                            />
                          ) : (
                            <StatusPill
                              status={item.origemMovimentacao}
                              ariaLabelPrefix="Origem da movimentação"
                            />
                          )}
                        </div>
                        <p
                          className={cn(
                            "font-medium text-foreground",
                            foiEstornada &&
                              "line-through decoration-rose-500/70 decoration-2 text-muted-foreground",
                          )}
                        >
                          {item.historico}
                        </p>
                        {foiEstornada && (
                          <p className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                            Estornada pela movimentação #{estorno?.id}
                          </p>
                        )}
                        {ehEstorno && item.movimentacaoEstornadaId && (
                          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                            Referente à movimentação #
                            {item.movimentacaoEstornadaId}
                          </p>
                        )}
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatDate(item.dataMovimentacao)} ·{" "}
                          {contaNome(item.contaBancariaId)}
                        </p>
                        <p
                          className={cn(
                            "mt-2 text-sm font-semibold",
                            item.tipoMovimentacao === "ENTRADA"
                              ? "text-emerald-700"
                              : "text-foreground",
                            foiEstornada &&
                              "line-through decoration-rose-500/70 decoration-2 text-muted-foreground",
                          )}
                        >
                          {item.tipoMovimentacao === "ENTRADA"
                            ? "Entrada"
                            : "Saída"}{" "}
                          · {formatCurrency(item.valor)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <DataTablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>
      <WikiFloatingButton
        pageTitle="Movimentações Bancárias"
        href="/wiki/financeiro/movimentacao-bancaria"
      />
    </AppLayout>
  );
}

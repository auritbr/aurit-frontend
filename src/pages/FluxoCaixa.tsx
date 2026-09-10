import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  Loader2,
  PiggyBank,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { StatusPill } from "@/components/StatusPill";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
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
import { getOrganizacoes, getProjetos, type Projeto } from "@/data/projetos";
import {
  getContasBancarias,
  nomeBancoLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import {
  agrupamentoOptions,
  formatCurrency,
  formatDate,
  formatPeriodoCompleto,
  formatPeriodoLabel,
  getFluxoCaixaConsolidado,
  isEntrada,
  isPrevisto,
  origemFluxoLabel,
  origemFluxoOptions,
  periodoPadrao,
  tipoLancamentoLabel,
  tipoLancamentoOptions,
  type AgrupamentoFluxo,
  type FluxoCaixaDTO,
  type FluxoCaixaLancamentoDTO,
} from "@/data/fluxoCaixa";
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

const tipoExibicao = (item: FluxoCaixaLancamentoDTO) =>
  item.origem === "TRANSFERENCIA"
    ? isEntrada(item.tipo)
      ? "Entrada de transferência"
      : "Saída de transferência"
    : tipoLancamentoLabel(item.tipo);

const fieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

interface Filtros {
  dataInicial: string;
  dataFinal: string;
  contaBancaria: string;
  projeto: string;
  agrupamento: AgrupamentoFluxo;
  tipos: string[];
  origens: string[];
  historico: string;
}

/** Seleção única com pesquisa — mesmo acabamento dos selects do módulo Financeiro. */
function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}: {
  id?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
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
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 text-left text-[13px] backdrop-blur-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
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
          placeholder={searchPlaceholder}
          className="mb-2 h-8 rounded-[9px] text-[13px]"
        />
        <div className="pointer-events-auto max-h-64 overflow-y-auto">
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
              {emptyMessage}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function FluxoCaixa() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const padrao = useMemo(() => periodoPadrao(), []);

  const initial: Filtros = {
    dataInicial: searchParams.get("dataInicial") || padrao.dataInicial,
    dataFinal: searchParams.get("dataFinal") || padrao.dataFinal,
    contaBancaria: searchParams.get("contaBancariaId") || "",
    projeto: searchParams.get("projetoId") || "",
    agrupamento: "DIARIO",
    tipos: [],
    origens: [],
    historico: "",
  };

  const [contas, setContas] = useState<ContaBancariaData[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [fluxo, setFluxo] = useState<FluxoCaixaDTO | null>(null);
  const [lancamentos, setLancamentos] = useState<FluxoCaixaLancamentoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [lancamentosError, setLancamentosError] = useState(false);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "fluxo-caixa:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(initial);
  const [filtros, setFiltros] = useState<Filtros>(initial);
  const [searching, setSearching] = useState(false);

  const periodoInvalido = Boolean(
    filtros.dataInicial &&
      filtros.dataFinal &&
      filtros.dataInicial > filtros.dataFinal,
  );

  const load = useCallback(async (aplicados: Filtros) => {
    setLoading(true);
    setLoadError(false);
    setAccessDeniedMessage(null);
    setLancamentosError(false);
    try {
      const [organizacoesResponse, contasResponse, projetosResponse] =
        await Promise.all([
          getOrganizacoes(),
          getContasBancarias(),
          getProjetos(),
        ]);
      const organizacao = organizacoesResponse[0];
      if (!organizacao)
        throw new Error(
          "Nenhuma organização cadastrada para a empresa logada.",
        );
      const orgId = String(organizacao.id);
      setContas(contasResponse);
      setProjetos(
        projetosResponse.filter(
          (projeto) => String(projeto.organizacaoId) === orgId,
        ),
      );
      const consulta = {
        organizacaoId: orgId,
        dataInicial: aplicados.dataInicial,
        dataFinal: aplicados.dataFinal,
        contaBancariaId: aplicados.contaBancaria,
        projetoId: aplicados.projeto,
        agrupamento: aplicados.agrupamento,
      };
      try {
        const resultado = await getFluxoCaixaConsolidado(
          consulta,
          contasResponse
            .filter((conta) => String(conta.organizacaoId) === orgId)
            .map((conta) => conta.id),
        );
        setFluxo(resultado.fluxo);
        setLancamentos(resultado.lancamentos);
      } catch (error) {
        setFluxo(null);
        setLancamentos([]);
        setLancamentosError(true);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os lançamentos.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o fluxo de caixa.";
      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }
      setLoadError(true);
      setFluxo(null);
      setLancamentos([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!filtros.dataInicial || !filtros.dataFinal || periodoInvalido) {
      setLoading(false);
      return;
    }
    void load(filtros);
  }, [filtros, load, periodoInvalido]);

  useEffect(() => {
    const refresh = () => {
      if (!periodoInvalido) void load(filtros);
    };
    window.addEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
  }, [filtros, load, periodoInvalido]);

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

  const projetoOptions = useMemo(
    () =>
      projetos.map((projeto) => ({
        value: String(projeto.id),
        label: projeto.nomeProjeto,
      })),
    [projetos],
  );
  const contaLabel = (id: string) =>
    contaOptions.find((option) => option.value === id)?.label || "—";
  const contaNome = (id: string) =>
    contas.find((conta) => conta.id === id)?.nomeConta || "—";
  const projetoNome = (id: string) =>
    projetoOptions.find((p) => p.value === id)?.label || "—";
  const contaSelecionada = contas.find(
    (conta) => conta.id === filtros.contaBancaria,
  );
  const projetoSelecionado = filtros.projeto
    ? projetoNome(filtros.projeto)
    : "";

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    const sync = (key: string, value: string) =>
      value ? params.set(key, value) : params.delete(key);
    sync("dataInicial", next.dataInicial);
    sync("dataFinal", next.dataFinal);
    sync("contaBancariaId", next.contaBancaria);
    sync("projetoId", next.projeto);
    setSearchParams(params, { replace: true });
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (searching) return;
    if (!draft.dataInicial || !draft.dataFinal) {
      toast.error("Informe a data inicial e a data final.");
      return;
    }
    if (draft.dataInicial > draft.dataFinal) {
      toast.error("A data inicial não pode ser posterior à data final.");
      return;
    }
    applyFiltros(draft);
  };

  const alterarData = (campo: "dataInicial" | "dataFinal", valor: string) => {
    const next = { ...draft, [campo]: valor };
    setDraft(next);
    if (
      next.dataInicial &&
      next.dataFinal &&
      next.dataInicial <= next.dataFinal
    ) {
      applyFiltros(next);
    }
  };

  const handleClearFiltros = () =>
    applyFiltros({
      dataInicial: padrao.dataInicial,
      dataFinal: padrao.dataFinal,
      contaBancaria: "",
      projeto: "",
      agrupamento: "DIARIO",
      tipos: [],
      origens: [],
      historico: "",
    });

  const lancamentosFiltrados = useMemo(() => {
    const historico = normalize(filtros.historico);
    return lancamentos.filter((item) => {
      if (historico && !normalize(item.historico).includes(historico))
        return false;
      if (filtros.tipos.length && !filtros.tipos.includes(item.tipo))
        return false;
      if (filtros.origens.length && !filtros.origens.includes(item.origem))
        return false;
      return true;
    });
  }, [lancamentos, filtros.historico, filtros.tipos, filtros.origens]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];

    if (filtros.historico.trim()) {
      list.push({
        id: "historico",
        label: "Histórico",
        value: filtros.historico.trim(),
        onRemove: () => applyFiltros({ ...filtros, historico: "" }),
      });
    }

    const pushMulti = (
      key: "tipos" | "origens",
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

    pushMulti("tipos", "Tipo de lançamento", (v) =>
      labelOf(tipoLancamentoOptions, v),
    );
    pushMulti("origens", "Origem", (v) => labelOf(origemFluxoOptions, v));

    return list;
  }, [filtros]);

  const activeCount = activeFilters.length;
  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(lancamentosFiltrados, 25, filtrosKey);

  const chartData = useMemo(
    () =>
      (fluxo?.periodos || []).map((periodo) => ({
        name: formatPeriodoLabel(periodo.periodo, filtros.agrupamento),
        entradasRealizadas: periodo.entradasRealizadas,
        saidasRealizadas: periodo.saidasRealizadas,
        entradasPrevistas: periodo.entradasPrevistas,
        saidasPrevistas: periodo.saidasPrevistas,
        saldoAcumulado: periodo.saldoAcumulado,
        saldoProjetado: periodo.saldoProjetado,
      })),
    [fluxo, filtros.agrupamento],
  );

  const chartLabels: Record<string, string> = {
    saldoAcumulado: "Saldo acumulado",
    saldoProjetado: "Saldo projetado",
    entradasRealizadas: "Entradas realizadas",
    saidasRealizadas: "Saídas realizadas",
    entradasPrevistas: "Entradas previstas",
    saidasPrevistas: "Saídas previstas",
  };

  // A tabela não agrega entradas e saídas na mesma linha: isso deixa explícito
  // cada lado de uma transferência feita no mesmo dia.
  const evolucaoRows = useMemo(
    () =>
      (fluxo?.periodos ?? []).flatMap((periodo) => {
        const movimentos = [
          periodo.entradasRealizadas > 0 && {
            tipo: "Entrada realizada",
            entradasRealizadas: periodo.entradasRealizadas,
          },
          periodo.saidasRealizadas > 0 && {
            tipo: "Saída realizada",
            saidasRealizadas: periodo.saidasRealizadas,
          },
          periodo.entradasPrevistas > 0 && {
            tipo: "Entrada prevista",
            entradasPrevistas: periodo.entradasPrevistas,
          },
          periodo.saidasPrevistas > 0 && {
            tipo: "Saída prevista",
            saidasPrevistas: periodo.saidasPrevistas,
          },
        ].filter(Boolean) as Array<{
          tipo: string;
          entradasRealizadas?: number;
          saidasRealizadas?: number;
          entradasPrevistas?: number;
          saidasPrevistas?: number;
        }>;
        const linhas = movimentos.length
          ? movimentos
          : [{ tipo: "Sem movimentação" }];
        return linhas.map((movimento, index) => ({
          ...movimento,
          periodo: periodo.periodo,
          saldoAcumulado:
            index === linhas.length - 1 ? periodo.saldoAcumulado : undefined,
          saldoProjetado:
            index === linhas.length - 1 ? periodo.saldoProjetado : undefined,
        }));
      }),
    [fluxo?.periodos],
  );

  const exportColumns = [
    { header: "Data", key: "dataLabel" },
    { header: "Histórico", key: "historico" },
    { header: "Origem", key: "origemLabel" },
    { header: "Conta bancária", key: "contaLabel" },
    { header: "Tipo", key: "tipoLabel" },
    { header: "Valor", key: "valorLabel" },
  ];

  const getExportData = () =>
    lancamentosFiltrados.map((item) => ({
      ...item,
      dataLabel: formatDate(item.data),
      origemLabel: origemFluxoLabel(item.origem),
      contaLabel: contaLabel(item.contaBancariaId),
      tipoLabel: tipoExibicao(item),
      valorLabel: formatCurrency(item.valor),
    }));

  const origemRoute = (item: FluxoCaixaLancamentoDTO) => {
    if (item.contaPagarId) return `/contas-pagar/${item.contaPagarId}`;
    if (item.contaReceberId) return `/contas-receber/${item.contaReceberId}`;
    if (item.transferenciaBancariaId)
      return `/transferencias-bancarias/${item.transferenciaBancariaId}`;
    return "";
  };

  const rowActions = (item: FluxoCaixaLancamentoDTO) => {
    const route = origemRoute(item);
    return route
      ? [{ label: "Ver origem", onClick: () => navigate(route) }]
      : [];
  };

  const semContas = !loading && !loadError && contas.length === 0;
  const semDados =
    !loading && !loadError && fluxo !== null && lancamentos.length === 0;
  const saldoAtual = fluxo?.saldoAtual ?? 0;
  const saldoProjetado = fluxo?.saldoProjetado ?? 0;

  const insight =
    !fluxo || lancamentos.length === 0
      ? ""
      : saldoProjetado < saldoAtual
        ? "O saldo projetado é inferior ao saldo atual no período selecionado."
        : saldoProjetado > saldoAtual
          ? "O saldo projetado apresenta crescimento em relação ao saldo atual."
          : "";

  const cardSkeleton = (quantidade: number) =>
    Array.from({ length: quantidade }).map((_, index) => (
      <Skeleton key={index} className="h-[70px] rounded-[16px]" />
    ));

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
          title="Fluxo de Caixa"
          tooltip="Nesta página são acompanhadas as entradas e saídas já realizadas e os valores previstos para os próximos períodos. O fluxo de caixa ajuda a entender como os recursos da organização estão se movimentando e como essas movimentações podem afetar o saldo ao longo do tempo."
          objective="Acompanhe o fluxo financeiro da organização, comparando o que já entrou e saiu com os valores ainda previstos. Utilize os filtros para analisar o comportamento do caixa por período, conta bancária ou projeto e visualizar a evolução do saldo realizado e projetado."
        />

        {/* Filtros principais */}
        <div className="mb-4 grid grid-cols-1 gap-4 rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <FieldLabel
              htmlFor="fluxoDataInicial"
              tooltip="Informe a primeira data do período que deseja analisar. As movimentações e previsões serão consideradas a partir desta data."
            >
              Data inicial
            </FieldLabel>

            <Input
              id="fluxoDataInicial"
              type="date"
              value={draft.dataInicial}
              max={draft.dataFinal || undefined}
              onChange={(event) =>
                alterarData("dataInicial", event.target.value)
              }
              className={fieldClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="fluxoDataFinal"
              tooltip="Informe a última data do período que deseja analisar. As movimentações e previsões serão consideradas até esta data."
            >
              Data final
            </FieldLabel>

            <Input
              id="fluxoDataFinal"
              type="date"
              value={draft.dataFinal}
              min={draft.dataInicial || undefined}
              onChange={(event) => alterarData("dataFinal", event.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="fluxoConta"
              tooltip="Selecione uma conta bancária para analisar somente as movimentações e previsões relacionadas a ela. Se nenhuma conta for selecionada, serão consideradas todas as contas."
            >
              Conta bancária
            </FieldLabel>

            <SearchableSelect
              id="fluxoConta"
              options={contaOptions}
              value={draft.contaBancaria}
              onChange={(value) =>
                applyFiltros({
                  ...draft,
                  contaBancaria: value,
                })
              }
              placeholder="Todas as contas bancárias"
              searchPlaceholder="Pesquisar conta bancária"
              emptyMessage="Nenhuma conta encontrada."
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="fluxoProjeto"
              tooltip="Selecione um projeto para analisar somente as entradas, saídas e previsões relacionadas a ele. Se nenhum projeto for selecionado, serão considerados todos os projetos."
            >
              Projeto
            </FieldLabel>

            <SearchableSelect
              id="fluxoProjeto"
              options={projetoOptions}
              value={draft.projeto}
              onChange={(value) =>
                applyFiltros({
                  ...draft,
                  projeto: value,
                })
              }
              placeholder="Todos os projetos"
              searchPlaceholder="Pesquisar projeto"
              emptyMessage="Nenhum projeto encontrado."
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="fluxoAgrupamento"
              tooltip="Defina como os valores do período serão organizados na evolução do fluxo. Por dia apresenta o detalhamento diário; por mês reúne os valores de cada mês."
            >
              Agrupamento
            </FieldLabel>

            <Select
              value={draft.agrupamento}
              onValueChange={(value) =>
                applyFiltros({
                  ...draft,
                  agrupamento: value as AgrupamentoFluxo,
                })
              }
            >
              <SelectTrigger id="fluxoAgrupamento" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {agrupamentoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {periodoInvalido && (
          <div className="mb-4 rounded-[12px] border border-amber-200/70 bg-amber-50/60 px-4 py-2.5 text-[13px] text-amber-800 backdrop-blur-sm">
            A data inicial não pode ser posterior à data final.
          </div>
        )}

        {(contaSelecionada || projetoSelecionado) && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-border/60 bg-muted/25 px-4 py-2.5 backdrop-blur-sm">
            {contaSelecionada && (
              <>
                <span className="text-[13px] font-semibold text-foreground">
                  {contaSelecionada.nomeConta || "Conta sem nome"}
                </span>

                <span className="text-[12.5px] text-muted-foreground">
                  {nomeBancoLabel(contaSelecionada.nomeBanco)}
                  {contaSelecionada.agencia
                    ? ` · Ag. ${contaSelecionada.agencia}`
                    : ""}
                  {contaSelecionada.numeroConta
                    ? ` · Conta ${contaSelecionada.numeroConta}`
                    : ""}
                </span>
              </>
            )}

            {projetoSelecionado && (
              <span className="text-[12.5px] text-muted-foreground">
                Projeto: {projetoSelecionado}
              </span>
            )}
          </div>
        )}

        {loadError ? (
          <div className="mb-4 flex flex-col items-center gap-2.5 rounded-[14px] border border-border/70 bg-card/75 px-6 py-11 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-foreground">
              Não foi possível carregar o fluxo de caixa.
            </p>

            <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
              Ocorreu um erro ao consultar os dados do período. Tente novamente.
            </p>

            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 gap-2 px-4"
              onClick={() => void load(filtros)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* Indicadores do realizado */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Realizado
            </p>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                cardSkeleton(4)
              ) : (
                <>
                  <SummaryStatCard
                    title="Saldo inicial"
                    value={formatCurrency(fluxo?.saldoInicial ?? 0)}
                    icon={PiggyBank}
                    variant="neutral"
                    tooltip="Saldo existente antes da data inicial do período consultado. Ele representa o valor disponível antes das entradas e saídas exibidas no fluxo."
                  />

                  <SummaryStatCard
                    title="Entradas realizadas"
                    value={formatCurrency(fluxo?.entradasRealizadas ?? 0)}
                    icon={ArrowDownLeft}
                    variant="success"
                    tooltip="Valores efetivamente recebidos no período consultado."
                  />

                  <SummaryStatCard
                    title="Saídas realizadas"
                    value={formatCurrency(fluxo?.saidasRealizadas ?? 0)}
                    icon={ArrowUpRight}
                    variant="danger"
                    tooltip="Valores efetivamente pagos no período consultado."
                  />

                  <SummaryStatCard
                    title="Saldo atual"
                    value={formatCurrency(saldoAtual)}
                    icon={Wallet}
                    variant="neutral"
                    tooltip="Saldo resultante do período consultado, considerando o saldo inicial, as entradas recebidas e as saídas pagas."
                    className={cn(
                      "ring-1 ring-primary/20",
                      saldoAtual < 0 &&
                        "border-destructive/40 ring-destructive/25",
                    )}
                  />
                </>
              )}
            </div>

            {/* Indicadores da projeção */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Projeção
            </p>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                cardSkeleton(3)
              ) : (
                <>
                  <SummaryStatCard
                    title="Entradas previstas"
                    value={formatCurrency(fluxo?.entradasPrevistas ?? 0)}
                    icon={TrendingUp}
                    variant="info"
                    tooltip="Valores de contas a receber que ainda não foram recebidos e possuem vencimento dentro do período consultado."
                  />

                  <SummaryStatCard
                    title="Saídas previstas"
                    value={formatCurrency(fluxo?.saidasPrevistas ?? 0)}
                    icon={TrendingDown}
                    variant="danger"
                    tooltip="Valores de contas a pagar que ainda não foram pagos e possuem vencimento dentro do período consultado."
                  />

                  <SummaryStatCard
                    title="Saldo projetado"
                    value={formatCurrency(saldoProjetado)}
                    icon={Wallet}
                    variant="neutral"
                    tooltip="Valor estimado para o saldo após considerar, além do que já foi realizado, as entradas e saídas ainda previstas para o período."
                    className={cn(
                      "ring-1 ring-primary/25",
                      saldoProjetado < 0 &&
                        "border-destructive/40 ring-destructive/25",
                    )}
                  />
                </>
              )}
            </div>

            {!loading && saldoProjetado < 0 && (
              <div className="mb-4 rounded-[12px] border border-amber-200/70 bg-amber-50/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[13px] font-semibold text-amber-900">
                  Saldo projetado negativo
                </p>

                <p className="mt-0.5 text-[12.5px] leading-relaxed text-amber-800">
                  Com base nas entradas e saídas previstas para o período, o
                  saldo poderá ficar negativo.
                </p>
              </div>
            )}

            {!loading && insight && (
              <p className="mb-4 text-[12.5px] text-muted-foreground">
                {insight}
              </p>
            )}

            <div className="space-y-4">
              {/* Gráfico */}
              <SectionCard
                title="Evolução do fluxo"
                description="Acompanhe a variação do saldo realizado e projetado ao longo do período."
              >
                {loading ? (
                  <Skeleton className="h-[240px] rounded-[12px]" />
                ) : chartData.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-[12.5px] text-muted-foreground">
                    Sem dados para exibir com os filtros aplicados.
                  </div>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 8,
                          right: 12,
                          left: -8,
                          bottom: 4,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 10,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          tick={{
                            fontSize: 10,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={78}
                          tickFormatter={(value: number) =>
                            formatCurrency(value)
                          }
                        />

                        <ChartTooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                            fontSize: 12,
                          }}
                          formatter={(value: number, key: string) => [
                            formatCurrency(value),
                            chartLabels[key] || key,
                          ]}
                        />

                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="saldoAcumulado"
                          name="Saldo acumulado"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="saldoProjetado"
                          name="Saldo projetado"
                          stroke="hsl(200 70% 45%)"
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionCard>

              {/* Tabela de evolução */}
              <SectionCard
                title="Evolução por período"
                description="Compare os valores realizados e previstos em cada período consultado."
              >
                {loading ? (
                  <Skeleton className="h-[160px] rounded-[12px]" />
                ) : evolucaoRows.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                    Sem dados para exibir com os filtros aplicados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                          {[
                            "Período",
                            "Movimentação",
                            "Entradas realizadas",
                            "Saídas realizadas",
                            "Entradas previstas",
                            "Saídas previstas",
                            "Saldo acumulado",
                            "Saldo projetado",
                          ].map((header, index) => (
                            <th
                              key={header}
                              className={cn(
                                "whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                                index === 0 ? "text-left" : "text-right",
                              )}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {evolucaoRows.map((periodo, index) => (
                          <tr
                            key={`${periodo.periodo}-${periodo.tipo}-${index}`}
                            className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-4 py-2.5 text-[13px] font-medium text-foreground">
                              {formatPeriodoCompleto(
                                periodo.periodo,
                                filtros.agrupamento,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-muted-foreground">
                              {periodo.tipo}
                            </td>

                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-emerald-700">
                              {formatCurrency(periodo.entradasRealizadas ?? 0)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-rose-700 dark:text-rose-300">
                              {formatCurrency(periodo.saidasRealizadas ?? 0)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-emerald-700/80 dark:text-emerald-300/80">
                              {formatCurrency(periodo.entradasPrevistas ?? 0)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-rose-600/80 dark:text-rose-300/80">
                              {formatCurrency(periodo.saidasPrevistas ?? 0)}
                            </td>

                            <td
                              className={cn(
                                "whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-medium",
                                periodo.saldoAcumulado < 0
                                  ? "text-destructive"
                                  : "text-foreground",
                              )}
                            >
                              {periodo.saldoAcumulado === undefined
                                ? "—"
                                : formatCurrency(periodo.saldoAcumulado)}
                            </td>

                            <td
                              className={cn(
                                "whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-medium",
                                periodo.saldoProjetado < 0
                                  ? "text-destructive"
                                  : "text-foreground",
                              )}
                            >
                              {periodo.saldoProjetado === undefined
                                ? "—"
                                : formatCurrency(periodo.saldoProjetado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Lançamentos do fluxo */}
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">
                  Lançamentos do fluxo
                </h2>

                <p className="mb-3 mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  Consulte os registros que compõem as entradas e saídas
                  realizadas e previstas do período.
                </p>

                <div className="space-y-4">
                  <AdvancedSearchPanel
                    open={panelOpen}
                    onOpenChange={setPanelOpen}
                    activeCount={activeCount}
                  >
                    <form onSubmit={handleSearch} noValidate>
                      <SearchFilterGrid>
                        <div>
                          <FieldLabel
                            htmlFor="fluxoHistorico"
                            tooltip="Digite parte do nome ou da descrição do lançamento que deseja localizar."
                          >
                            Histórico
                          </FieldLabel>

                          <Input
                            id="fluxoHistorico"
                            value={draft.historico}
                            onChange={(event) =>
                              setDraftField("historico", event.target.value)
                            }
                            placeholder="Digite parte do histórico"
                            className={fieldClass}
                          />
                        </div>

                        <div>
                          <FieldLabel
                            htmlFor="fluxoTipos"
                            tooltip="Selecione um ou mais tipos para visualizar somente os lançamentos correspondentes."
                          >
                            Tipo de lançamento
                          </FieldLabel>

                          <FilterMultiSelect
                            id="fluxoTipos"
                            options={tipoLancamentoOptions}
                            value={draft.tipos}
                            onChange={(value) => setDraftField("tipos", value)}
                            placeholder="Todos os tipos"
                            summaryNoun="tipos selecionados"
                          />
                        </div>

                        <div>
                          <FieldLabel
                            htmlFor="fluxoOrigens"
                            tooltip="Selecione de onde os lançamentos foram gerados no sistema para consultar somente as origens desejadas."
                          >
                            Origem
                          </FieldLabel>

                          <FilterMultiSelect
                            id="fluxoOrigens"
                            options={origemFluxoOptions}
                            value={draft.origens}
                            onChange={(value) =>
                              setDraftField("origens", value)
                            }
                            placeholder="Todas as origens"
                            summaryNoun="origens selecionadas"
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
                          <RotateCcw className="h-4 w-4" aria-hidden /> Limpar
                          filtros
                        </Button>
                        <Button
                          type="submit"
                          variant="glassPrimary"
                          className="h-9 gap-2 px-5"
                          disabled={searching}
                          aria-busy={searching}
                        >
                          {searching ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden
                            />
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
                      total={lancamentosFiltrados.length}
                      reportTo="/relatorios/fluxo-caixa"
                      exportColumns={exportColumns}
                      getExportData={getExportData}
                      exportFilename="fluxo-de-caixa"
                    />

                    {loading ? (
                      <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Carregando lançamentos do fluxo...
                      </div>
                    ) : lancamentosError ? (
                      <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          Não foi possível carregar os lançamentos do fluxo.
                        </p>
                        <Button
                          type="button"
                          variant="glassSecondary"
                          className="h-9 gap-2 px-4"
                          onClick={() => void load(filtros)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden /> Tentar
                          novamente
                        </Button>
                      </div>
                    ) : semDados ? (
                      <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          Nenhuma movimentação encontrada para o período.
                        </p>
                        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                          Altere os filtros ou registre contas a pagar, contas a
                          receber e movimentações financeiras para acompanhar o
                          fluxo de caixa.
                        </p>
                      </div>
                    ) : lancamentosFiltrados.length === 0 ? (
                      <DataTableEmptyState
                        emptyTitle="Nenhuma movimentação encontrada para o período."
                        emptyDescription="Altere os filtros ou registre contas a pagar, contas a receber e movimentações financeiras para acompanhar o fluxo de caixa."
                        noResultsTitle="Nenhum lançamento encontrado com os filtros aplicados."
                        activeCount={activeCount}
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
                                {[
                                  "Data",
                                  "Histórico",
                                  "Origem",
                                  "Conta bancária",
                                  "Tipo",
                                ].map((header) => (
                                  <th
                                    key={header}
                                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                  >
                                    {header}
                                  </th>
                                ))}
                                <th className="whitespace-nowrap px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Valor
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((item) => (
                                <tr
                                  key={`${item.id}-${item.contaBancariaId}-${item.tipo}`}
                                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                                >
                                  <td className="whitespace-nowrap px-6 py-2.5">
                                    <RowActionsDropdown
                                      extraItems={rowActions(item)}
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-2.5">
                                    <TableCellText text={formatDate(item.data)}>
                                      {formatDate(item.data)}
                                    </TableCellText>
                                  </td>
                                  <td className="px-6 py-2.5">
                                    <TableCellText text={item.historico} bold>
                                      {item.historico}
                                    </TableCellText>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-2.5">
                                    <StatusPill
                                      status={item.origem}
                                      ariaLabelPrefix="Origem do lançamento"
                                    />
                                  </td>
                                  <td className="px-6 py-2.5">
                                    <TableCellText
                                      text={contaNome(item.contaBancariaId)}
                                    >
                                      {contaNome(item.contaBancariaId)}
                                    </TableCellText>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-2.5">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "whitespace-nowrap font-medium backdrop-blur-sm",
                                        isPrevisto(item.tipo)
                                          ? "border-dashed border-border/70 bg-muted/40 text-muted-foreground"
                                          : isEntrada(item.tipo)
                                            ? "border-emerald-300/60 bg-emerald-50/70 text-emerald-700"
                                            : "border-border/70 bg-background/60 text-foreground",
                                      )}
                                    >
                                      {tipoExibicao(item)}
                                    </Badge>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-2.5 text-right">
                                    <span
                                      className={cn(
                                        "text-[13px] font-medium leading-snug",
                                        isPrevisto(item.tipo)
                                          ? "text-muted-foreground"
                                          : isEntrada(item.tipo)
                                            ? "text-emerald-700"
                                            : "text-foreground",
                                      )}
                                    >
                                      {formatCurrency(item.valor)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="divide-y divide-border md:hidden">
                          {paginated.map((item) => (
                            <div
                              key={`${item.id}-${item.contaBancariaId}-${item.tipo}`}
                              className="p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <RowActionsDropdown
                                  extraItems={rowActions(item)}
                                />
                                <StatusPill
                                  status={item.origem}
                                  ariaLabelPrefix="Origem do lançamento"
                                />
                              </div>
                              <p className="font-medium text-foreground">
                                {item.historico}
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {formatDate(item.data)} ·{" "}
                                {contaNome(item.contaBancariaId)}
                              </p>
                              <p
                                className={cn(
                                  "mt-2 text-sm font-semibold",
                                  isPrevisto(item.tipo)
                                    ? "text-muted-foreground"
                                    : isEntrada(item.tipo)
                                      ? "text-emerald-700"
                                      : "text-foreground",
                                )}
                              >
                                {tipoExibicao(item)} ·{" "}
                                {formatCurrency(item.valor)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <DataTablePagination
                          currentPage={currentPage}
                          pageSize={pageSize}
                          totalItems={lancamentosFiltrados.length}
                          onPageChange={setCurrentPage}
                          onPageSizeChange={setPageSize}
                        />
                      </>
                    )}
                  </DataTableCard>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <WikiFloatingButton
        pageTitle="Fluxo de Caixa"
        href="/wiki/financeiro/fluxo-de-caixa"
      />
    </AppLayout>
  );
}

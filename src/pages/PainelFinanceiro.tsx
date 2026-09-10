import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChartLine,
  ChartSpline,
  CircleDollarSign,
  FolderKanban,
  HandCoins,
  Landmark,
  Plus,
  ReceiptText,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Tags,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { cn } from "@/lib/utils";
import { getProjetos, type Projeto } from "@/data/projetos";
import { usuarioPodeCriar } from "@/lib/permissoes";
import {
  getContasBancarias,
  nomeBancoLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import { statusFinanceiroLabel as statusPagarLabel } from "@/data/contasPagar";
import { classificacaoLabel as classificacaoContaPagarLabel } from "@/data/contasPagar";
import { statusFinanceiroLabel as statusReceberLabel } from "@/data/contasReceber";
import { formatPeriodoLabel } from "@/data/fluxoCaixa";
import {
  DIAS_PROXIMO_VENCIMENTO,
  LIMITE_PROXIMOS,
  formatCurrency,
  formatDate,
  formatPercent,
  getPainelFinanceiro,
  periodoPadraoPainel,
  type PainelDistribuicaoItem,
  type PainelFinanceiroDTO,
  type PainelLancamentoPrevisto,
} from "@/data/painelFinanceiro";

const fieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

const TODAS_CONTAS = "TODAS";
const TODOS_PROJETOS = "TODOS";

interface Filtros {
  dataInicial: string;
  dataFinal: string;
  contaBancaria: string;
  projeto: string;
}

/** Seção padronizada da página — mesmo acabamento das demais telas financeiras. */
function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof Wallet;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-primary/20 bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex flex-wrap items-center gap-2">{action}</div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Bloco compacto de alerta: quantidade de registros + valor total. */
function AlertaCard({
  title,
  quantidade,
  valor,
  tooltip,
  destaque,
}: {
  title: string;
  quantidade: number;
  valor: number;
  tooltip: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border/70 bg-card/75 p-3.5 backdrop-blur-md supports-[backdrop-filter]:bg-card/60",
        destaque && quantidade > 0 && "border-amber-300/70 bg-amber-50/60",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border",
            destaque && quantidade > 0
              ? "border-amber-300/60 bg-amber-100/70 text-amber-700"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
          aria-hidden
        >
          <TriangleAlert className="h-[17px] w-[17px]" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium leading-tight text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-[18px] font-semibold leading-tight tabular-nums text-foreground">
            {formatCurrency(valor)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {quantidade === 1 ? "1 registro" : `${quantidade} registros`}
          </p>
        </div>
      </div>
      <p className="sr-only">{tooltip}</p>
    </div>
  );
}

/** Lista de distribuição com barras horizontais acessíveis (valor + percentual). */
function DistribuicaoLista({
  items,
  vazio,
  limite = 6,
}: {
  items: PainelDistribuicaoItem[];
  vazio: string;
  limite?: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? items : items.slice(0, limite);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[12.5px] text-muted-foreground">
        {vazio}
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {visiveis.map((item) => (
          <li key={item.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {item.label}
              </span>
              <span className="text-[13px] tabular-nums text-foreground">
                {formatCurrency(item.valor)}
              </span>
              <span className="w-[52px] text-right text-[12px] tabular-nums text-muted-foreground">
                {formatPercent(item.percentual)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60"
              role="img"
              aria-label={`${item.label}: ${formatCurrency(item.valor)}, ${formatPercent(item.percentual)} do total`}
            >
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.max(item.percentual, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {items.length > limite && (
        <Button
          type="button"
          variant="glassSecondary"
          className="mt-3 h-8 px-3 text-[12.5px]"
          onClick={() => setExpandido((prev) => !prev)}
        >
          {expandido ? "Mostrar menos" : `Ver todas (${items.length})`}
        </Button>
      )}
    </div>
  );
}

/** Tabela compacta de previsões — vira lista em telas pequenas. */
function PrevistosLista({
  items,
  vazio,
  rotuloPessoa,
  statusLabel,
  onSelect,
}: {
  items: PainelLancamentoPrevisto[];
  vazio: string;
  rotuloPessoa: string;
  statusLabel: (status: string) => string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[12.5px] text-muted-foreground">
        {vazio}
      </p>
    );
  }

  return (
    <>
      {/* Desktop e tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px]">
          <caption className="sr-only">
            Registros previstos para os próximos {DIAS_PROXIMO_VENCIMENTO} dias
          </caption>
          <thead>
            <tr className="border-b border-border/60 bg-muted/45">
              {[
                "Descrição",
                rotuloPessoa,
                "Projeto",
                "Vencimento",
                "Valor",
                "Situação",
              ].map((coluna) => (
                <th
                  key={coluna}
                  scope="col"
                  className="px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40"
                onClick={() => onSelect(item.id)}
              >
                <td className="px-3 py-2.5 text-[13px] text-foreground">
                  {item.descricao}
                </td>
                <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                  {item.pessoa || "—"}
                </td>
                <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                  {item.projeto || "—"}
                </td>
                <td className="px-3 py-2.5 text-[13px] tabular-nums text-muted-foreground">
                  {formatDate(item.vencimento)}
                </td>
                <td className="px-3 py-2.5 text-[13px] tabular-nums text-foreground">
                  {formatCurrency(item.valor)}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill
                    status={statusLabel(item.situacao)}
                    ariaLabelPrefix="Situação"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-2.5 md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="w-full rounded-[12px] border border-border/60 bg-background/60 p-3 text-left backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  {item.descricao}
                </span>
                <StatusPill
                  status={statusLabel(item.situacao)}
                  size="sm"
                  ariaLabelPrefix="Situação"
                />
              </div>
              {item.pessoa && (
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {rotuloPessoa}: {item.pessoa}
                </p>
              )}
              {item.projeto && (
                <p className="text-[12.5px] text-muted-foreground">
                  Projeto: {item.projeto}
                </p>
              )}
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                Vencimento:{" "}
                <span className="tabular-nums">
                  {formatDate(item.vencimento)}
                </span>
              </p>
              <p className="text-[15px] font-semibold tabular-nums text-foreground">
                {formatCurrency(item.valor)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PainelFinanceiro() {
  const navigate = useNavigate();
  const padrao = useMemo(() => periodoPadraoPainel(), []);

  const filtrosPadrao: Filtros = {
    dataInicial: padrao.dataInicial,
    dataFinal: padrao.dataFinal,
    contaBancaria: TODAS_CONTAS,
    projeto: TODOS_PROJETOS,
  };

  const [draft, setDraft] = useState<Filtros>(filtrosPadrao);
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  const [contas, setContas] = useState<ContaBancariaData[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [painel, setPainel] = useState<PainelFinanceiroDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const [podeCriarFinanceiro, setPodeCriarFinanceiro] = useState(false);
  const periodoInvalido = Boolean(
    filtros.dataInicial &&
      filtros.dataFinal &&
      filtros.dataInicial > filtros.dataFinal,
  );

  const load = async (aplicados: Filtros) => {
    setLoading(true);
    setErro(false);
    try {
      const [contasData, projetosData, painelData] = await Promise.all([
        getContasBancarias(),
        getProjetos(),
        getPainelFinanceiro({
          dataInicial: aplicados.dataInicial,
          dataFinal: aplicados.dataFinal,
          contaBancariaId:
            aplicados.contaBancaria === TODAS_CONTAS
              ? ""
              : aplicados.contaBancaria,
          projetoId:
            aplicados.projeto === TODOS_PROJETOS ? "" : aplicados.projeto,
        }),
      ]);
      setContas(contasData);
      setProjetos(projetosData);
      setPainel({
        ...painelData,
        despesasPorCategoria: painelData.despesasPorCategoria.map((item) => ({
          ...item,
          label:
            item.id === "SEM_CATEGORIA"
              ? "Sem categoria"
              : classificacaoContaPagarLabel(item.id),
        })),
      });
    } catch {
      setErro(true);
      setPainel(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (periodoInvalido || !filtros.dataInicial || !filtros.dataFinal) {
      setLoading(false);
      return;
    }
    void load(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  useEffect(() => {
    let active = true;

    void usuarioPodeCriar("FINANCEIRO")
      .then((permitido) => {
        if (active) setPodeCriarFinanceiro(permitido);
      })
      .catch(() => {
        if (active) setPodeCriarFinanceiro(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const contaOptions = useMemo(
    () =>
      contas.map((conta) => ({
        value: conta.id,
        label: [
          conta.nomeConta || "Conta sem nome",
          conta.nomeBanco ? nomeBancoLabel(conta.nomeBanco) : "",
          [
            conta.agencia ? `Ag. ${conta.agencia}` : "",
            conta.numeroConta ? `Conta ${conta.numeroConta}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        ]
          .filter(Boolean)
          .join(" · "),
      })),
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

  const aplicarFiltros = (event?: React.FormEvent) => {
    event?.preventDefault();
    setFiltros(draft);
  };

  const limparFiltros = () => {
    setDraft(filtrosPadrao);
    setFiltros(filtrosPadrao);
  };

  const periodoQuery = `?dataInicial=${filtros.dataInicial}&dataFinal=${filtros.dataFinal}${
    filtros.contaBancaria !== TODAS_CONTAS
      ? `&contaBancariaId=${filtros.contaBancaria}`
      : ""
  }${filtros.projeto !== TODOS_PROJETOS ? `&projetoId=${filtros.projeto}` : ""}`;

  const chartEvolucao = useMemo(
    () =>
      (painel?.periodos || []).map((periodo) => ({
        name: formatPeriodoLabel(
          periodo.periodo,
          painel?.agrupamento ?? "DIARIO",
        ),
        entradasRealizadas: periodo.entradasRealizadas,
        saidasRealizadas: periodo.saidasRealizadas,
        saldoAcumulado: periodo.saldoAcumulado,
        saldoProjetado: periodo.saldoProjetado,
      })),
    [painel],
  );

  const chartComparativo = useMemo(
    () => [
      { name: "Entradas realizadas", valor: painel?.entradasRealizadas ?? 0 },
      { name: "Saídas realizadas", valor: painel?.saidasRealizadas ?? 0 },
    ],
    [painel],
  );

  const chartLabels: Record<string, string> = {
    entradasRealizadas: "Entradas realizadas",
    saidasRealizadas: "Saídas realizadas",
    saldoAcumulado: "Saldo realizado",
    saldoProjetado: "Saldo projetado",
    valor: "Valor",
  };

  const resultado = painel?.resultadoPeriodo ?? 0;
  const skeletons = (quantidade: number, altura = "h-[70px]") =>
    Array.from({ length: quantidade }).map((_, index) => (
      <Skeleton key={index} className={cn(altura, "rounded-[16px]")} />
    ));

  const semDados = !loading && !erro && painel?.semMovimentacao;

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Painel Financeiro"
          tooltip="Nesta página são apresentados os principais indicadores financeiros da organização em uma visão resumida. Utilize os filtros para acompanhar saldos, entradas, saídas, valores previstos, contas pendentes e a evolução financeira de um período específico."
          objective="Acompanhe de forma consolidada a situação financeira da organização ou iniciativa, consultando os valores disponíveis, as entradas e saídas realizadas, os valores previstos, os próximos vencimentos e a movimentação dos recursos ao longo do período selecionado."
        />

        {/* 2. Filtros */}
        <form onSubmit={aplicarFiltros} className="mb-5">
          <SectionCard
            title="Filtros"
            description="Defina o período que deseja analisar e, quando necessário, selecione uma conta bancária ou projeto para consultar somente as informações relacionadas."
            icon={SlidersHorizontal}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel
                  htmlFor="painelDataInicial"
                  tooltip="Informe a data inicial do período que deseja analisar."
                >
                  Data inicial
                </FieldLabel>
                <Input
                  id="painelDataInicial"
                  type="date"
                  required
                  value={draft.dataInicial}
                  max={draft.dataFinal || undefined}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataInicial: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="painelDataFinal"
                  tooltip="Informe a data final do período que deseja analisar."
                >
                  Data final
                </FieldLabel>
                <Input
                  id="painelDataFinal"
                  type="date"
                  required
                  value={draft.dataFinal}
                  min={draft.dataInicial || undefined}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataFinal: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="painelConta"
                  tooltip="Selecione uma conta bancária para visualizar somente as movimentações relacionadas a ela. Mantenha 'Todas as contas bancárias' para considerar todas as contas da organização."
                >
                  Conta bancária
                </FieldLabel>
                <Select
                  value={draft.contaBancaria}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, contaBancaria: value }))
                  }
                >
                  <SelectTrigger id="painelConta" className={fieldClass}>
                    <SelectValue placeholder="Todas as contas bancárias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS_CONTAS}>
                      Todas as contas bancárias
                    </SelectItem>
                    {contaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel
                  htmlFor="painelProjeto"
                  tooltip="Selecione um projeto para visualizar somente as informações financeiras vinculadas a ele. Mantenha 'Todos os projetos' para considerar todos os projetos."
                >
                  Projeto
                </FieldLabel>
                <Select
                  value={draft.projeto}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, projeto: value }))
                  }
                >
                  <SelectTrigger id="painelProjeto" className={fieldClass}>
                    <SelectValue placeholder="Todos os projetos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS_PROJETOS}>
                      Todos os projetos
                    </SelectItem>
                    {projetoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {periodoInvalido && (
              <p className="mt-3 text-[12.5px] text-destructive">
                A data inicial não pode ser posterior à data final.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" variant="glassPrimary" className="h-9 px-4">
                Aplicar filtros
              </Button>
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 gap-2 px-4"
                onClick={limparFiltros}
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Limpar filtros
              </Button>
            </div>
          </SectionCard>
        </form>

        {erro ? (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] border border-border/70 bg-card/75 px-6 py-12 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-foreground">
              Não foi possível carregar as informações financeiras. Tente
              novamente.
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
        ) : semDados ? (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] border border-border/70 bg-card/75 px-6 py-12 text-center backdrop-blur-md">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-primary/20 bg-primary/10 text-primary"
              aria-hidden
            >
              <Wallet className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Ainda não há movimentações financeiras para apresentar neste
              período.
            </p>
            <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground">
              Cadastre contas a pagar, contas a receber ou outras movimentações
              financeiras para começar a acompanhar os resultados por aqui.
            </p>
            {podeCriarFinanceiro && (
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                  onClick={() => navigate("/contas-receber/novo")}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Nova conta a receber
                </Button>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => navigate("/contas-pagar/novo")}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Nova conta a pagar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* 3. Visão geral */}
            <SectionCard
              title="Visão geral"
              description="Consulte os principais valores financeiros da organização ou iniciativa no período selecionado, incluindo entradas e saídas já realizadas, o resultado do período e o saldo disponível."
              icon={Wallet}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                  skeletons(4)
                ) : (
                  <>
                    <SummaryStatCard
                      title="Saldo atual"
                      value={formatCurrency(painel?.saldoAtual ?? 0)}
                      icon={Wallet}
                      variant="neutral"
                      tooltip="Consulte o saldo disponível atualmente e os principais valores de entradas e saídas registrados no período selecionado."
                    />
                    <SummaryStatCard
                      title="Entradas realizadas"
                      value={formatCurrency(painel?.entradasRealizadas ?? 0)}
                      icon={ArrowDownToLine}
                      variant="info"
                      tooltip="Total de valores que efetivamente entraram no período selecionado."
                    />
                    <SummaryStatCard
                      title="Saídas realizadas"
                      value={formatCurrency(painel?.saidasRealizadas ?? 0)}
                      icon={ArrowUpFromLine}
                      variant="neutral"
                      tooltip="Total de valores que efetivamente saíram no período selecionado."
                    />
                    <SummaryStatCard
                      title={
                        resultado >= 0
                          ? "Resultado do período (positivo)"
                          : "Resultado do período (negativo)"
                      }
                      value={formatCurrency(resultado)}
                      icon={resultado >= 0 ? Scale : CircleDollarSign}
                      variant={resultado >= 0 ? "success" : "warning"}
                      tooltip="Resultado obtido pela diferença entre as entradas e as saídas realizadas no período selecionado."
                    />
                  </>
                )}
              </div>
            </SectionCard>

            {/* 4. Projeção */}
            <SectionCard
              title="Projeção"
              description="Consulte os valores que ainda estão previstos para entrar ou sair e veja como eles podem alterar o saldo disponível caso sejam realizados. Esses valores ainda não representam movimentações concluídas."
              icon={ChartSpline}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  skeletons(3)
                ) : (
                  <>
                    <SummaryStatCard
                      title="Entradas previstas"
                      value={formatCurrency(painel?.entradasPrevistas ?? 0)}
                      icon={TrendingUp}
                      variant="info"
                      tooltip="Total de valores com recebimento previsto e ainda não realizado no período selecionado."
                      className="border-dashed"
                    />
                    <SummaryStatCard
                      title="Saídas previstas"
                      value={formatCurrency(painel?.saidasPrevistas ?? 0)}
                      icon={TrendingDown}
                      variant="warning"
                      tooltip="Total de valores com pagamento previsto e ainda não realizado no período selecionado."
                      className="border-dashed"
                    />
                    <SummaryStatCard
                      title="Saldo projetado (estimativa)"
                      value={formatCurrency(painel?.saldoProjetado ?? 0)}
                      icon={ChartSpline}
                      variant="neutral"
                      tooltip="Estimativa do saldo considerando o saldo atual, as entradas previstas e as saídas previstas ainda não realizadas."
                      className="border-dashed ring-1 ring-primary/20"
                    />
                  </>
                )}
              </div>
            </SectionCard>

            {/* 5. Atenção financeira */}
            <SectionCard
              title="Atenção financeira"
              description="Identifique valores a receber e a pagar que já venceram ou possuem vencimento próximo, para acompanhar o que ainda precisa ser recebido ou pago."
              icon={TriangleAlert}
              action={
                <>
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-8 px-3 text-[12.5px]"
                    onClick={() => navigate("/contas-receber")}
                  >
                    Ver contas a receber
                  </Button>
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-8 px-3 text-[12.5px]"
                    onClick={() => navigate("/contas-pagar")}
                  >
                    Ver contas a pagar
                  </Button>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                  skeletons(4, "h-[104px]")
                ) : (
                  <>
                    <AlertaCard
                      title="Contas a receber vencidas"
                      quantidade={painel?.receberVencidas.quantidade ?? 0}
                      valor={painel?.receberVencidas.valor ?? 0}
                      tooltip="Valores que deveriam ter sido recebidos até a data atual e continuam pendentes."
                      destaque
                    />
                    <AlertaCard
                      title="Contas a pagar vencidas"
                      quantidade={painel?.pagarVencidas.quantidade ?? 0}
                      valor={painel?.pagarVencidas.valor ?? 0}
                      tooltip="Valores que deveriam ter sido pagos até a data atual e continuam pendentes."
                      destaque
                    />
                    <AlertaCard
                      title={`Recebimentos próximos do vencimento (${DIAS_PROXIMO_VENCIMENTO} dias)`}
                      quantidade={painel?.receberProximas.quantidade ?? 0}
                      valor={painel?.receberProximas.valor ?? 0}
                      tooltip="Valores com recebimento previsto para os próximos 7 dias."
                    />
                    <AlertaCard
                      title={`Pagamentos próximos do vencimento (${DIAS_PROXIMO_VENCIMENTO} dias)`}
                      quantidade={painel?.pagarProximas.quantidade ?? 0}
                      valor={painel?.pagarProximas.valor ?? 0}
                      tooltip="Valores com pagamento previsto para os próximos 7 dias."
                    />
                  </>
                )}
              </div>
            </SectionCard>

            {/* 6. Evolução financeira */}
            <SectionCard
              title="Evolução financeira"
              description="Acompanhe como o saldo realizado evoluiu ao longo do período e compare essa evolução com o saldo projetado a partir dos valores previstos."
              icon={ChartLine}
              action={
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-8 px-3 text-[12.5px]"
                  onClick={() => navigate(`/fluxo-caixa${periodoQuery}`)}
                >
                  Ver fluxo de caixa
                </Button>
              }
            >
              {loading ? (
                <Skeleton className="h-[260px] rounded-[12px]" />
              ) : chartEvolucao.length === 0 ? (
                <p className="py-10 text-center text-[12.5px] text-muted-foreground">
                  Nenhuma movimentação foi encontrada para os filtros
                  selecionados.
                </p>
              ) : (
                <>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartEvolucao}
                        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
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
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          dataKey="saldoAcumulado"
                          name="Saldo realizado"
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
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    A linha contínua mostra o saldo já realizado e a linha
                    tracejada mostra o saldo projetado. No período selecionado,
                    entraram {formatCurrency(painel?.entradasRealizadas ?? 0)} e
                    saíram {formatCurrency(painel?.saidasRealizadas ?? 0)}.
                  </p>
                </>
              )}
            </SectionCard>

            {/* 7. Entradas e saídas */}
            <SectionCard
              title="Entradas e saídas"
              description="Compare os valores recebidos e pagos durante o período selecionado."
              icon={HandCoins}
            >
              {loading ? (
                <Skeleton className="h-[220px] rounded-[12px]" />
              ) : (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartComparativo}
                        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 11,
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
                          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Valor",
                          ]}
                        />
                        <Bar
                          dataKey="valor"
                          name="Valor"
                          fill="hsl(var(--primary))"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-[12px] border border-border/60 bg-background/60 px-3 py-2">
                      <dt className="text-[12.5px] text-muted-foreground">
                        Entradas realizadas
                      </dt>
                      <dd className="text-[15px] font-semibold tabular-nums text-foreground">
                        {formatCurrency(painel?.entradasRealizadas ?? 0)}
                      </dd>
                    </div>
                    <div className="rounded-[12px] border border-border/60 bg-background/60 px-3 py-2">
                      <dt className="text-[12.5px] text-muted-foreground">
                        Saídas realizadas
                      </dt>
                      <dd className="text-[15px] font-semibold tabular-nums text-foreground">
                        {formatCurrency(painel?.saidasRealizadas ?? 0)}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </SectionCard>

            {/* 8. Despesas por categoria */}
            <SectionCard
              title="Despesas por categoria"
              description="Veja como as despesas realizadas estão distribuídas entre as categorias financeiras para entender em quais tipos de gastos os recursos foram utilizados."
              icon={Tags}
            >
              {loading ? (
                <Skeleton className="h-[160px] rounded-[12px]" />
              ) : (
                <DistribuicaoLista
                  items={painel?.despesasPorCategoria ?? []}
                  vazio="Nenhuma despesa foi encontrada para os filtros selecionados."
                />
              )}
            </SectionCard>

            {/* 9. Despesas por projeto */}
            <SectionCard
              title="Despesas por projeto"
              description="Acompanhe quanto dos recursos foi utilizado em cada projeto durante o período selecionado."
              icon={FolderKanban}
              action={
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-8 px-3 text-[12.5px]"
                  onClick={() => navigate("/projetos")}
                >
                  Ver projetos
                </Button>
              }
            >
              {loading ? (
                <Skeleton className="h-[160px] rounded-[12px]" />
              ) : (
                <DistribuicaoLista
                  items={painel?.despesasPorProjeto ?? []}
                  vazio="Nenhuma despesa vinculada a projetos foi encontrada para os filtros selecionados."
                />
              )}
            </SectionCard>

            {/* 11 e 12. Próximos recebimentos e pagamentos */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <SectionCard
                title="Próximos recebimentos"
                description="Confira os valores que estão previstos para entrar nos próximos dias."
                icon={HandCoins}
                action={
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-8 px-3 text-[12.5px]"
                    onClick={() => navigate("/contas-receber")}
                  >
                    Ver todas as contas a receber
                  </Button>
                }
              >
                {loading ? (
                  <Skeleton className="h-[160px] rounded-[12px]" />
                ) : (
                  <PrevistosLista
                    items={(painel?.proximosRecebimentos ?? []).slice(
                      0,
                      LIMITE_PROXIMOS,
                    )}
                    vazio="Não há recebimentos previstos para os próximos dias."
                    rotuloPessoa="Pagador"
                    statusLabel={statusReceberLabel}
                    onSelect={(id) => navigate(`/contas-receber/${id}`)}
                  />
                )}
              </SectionCard>

              <SectionCard
                title="Próximos pagamentos"
                description="Confira os pagamentos previstos para os próximos dias."
                icon={ReceiptText}
                action={
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-8 px-3 text-[12.5px]"
                    onClick={() => navigate("/contas-pagar")}
                  >
                    Ver todas as contas a pagar
                  </Button>
                }
              >
                {loading ? (
                  <Skeleton className="h-[160px] rounded-[12px]" />
                ) : (
                  <PrevistosLista
                    items={(painel?.proximosPagamentos ?? []).slice(
                      0,
                      LIMITE_PROXIMOS,
                    )}
                    vazio="Não há pagamentos previstos para os próximos dias."
                    rotuloPessoa="Fornecedor"
                    statusLabel={statusPagarLabel}
                    onSelect={(id) => navigate(`/contas-pagar/${id}`)}
                  />
                )}
              </SectionCard>
            </div>

            {/* 13. Contas bancárias */}
            <SectionCard
              title="Contas bancárias"
              description="Consulte como o saldo disponível da organização ou iniciativa está distribuído entre as contas bancárias cadastradas."
              icon={Landmark}
              action={
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-8 px-3 text-[12.5px]"
                  onClick={() => navigate("/contas-bancarias")}
                >
                  Ver contas bancárias
                </Button>
              }
            >
              {loading ? (
                <Skeleton className="h-[140px] rounded-[12px]" />
              ) : (painel?.contas.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                  Nenhuma conta bancária foi encontrada para os filtros
                  selecionados.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 rounded-[12px] border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5">
                    <span className="text-[12.5px] font-medium text-muted-foreground">
                      Saldo total
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(painel?.saldoTotalContas ?? 0)}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(painel?.contas ?? []).map((conta) => (
                      <li
                        key={conta.id}
                        className="rounded-[12px] border border-border/60 bg-background/60 px-3.5 py-3 backdrop-blur-sm"
                      >
                        <p className="text-[13px] font-medium text-foreground">
                          {conta.nomeConta}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {[
                            conta.banco ? nomeBancoLabel(conta.banco) : "",
                            conta.identificacao,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"}
                        </p>
                        <p className="mt-1.5 text-[16px] font-semibold tabular-nums text-foreground">
                          {formatCurrency(conta.saldo)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionCard>
          </div>
        )}
      </div>
      <WikiFloatingButton
        pageTitle="Painel Financeiro"
        href="/wiki/financeiro/painel-financeiro"
      />
    </AppLayout>
  );
}

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  FileSpreadsheet,
  Gift,
  GitCompareArrows,
  HandCoins,
  HeartHandshake,
  Landmark,
  Layers,
  ListOrdered,
  Package,
  Percent,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  GraficoFinanceiro,
  IndicadorFinanceiro,
  LinhaFinanceira,
} from "@/lib/relatoriosFinanceirosApi";
import {
  ratio,
  reportNumber,
  sumReportField,
} from "@/lib/reportComparisonIndicators";
import type { StatTone } from "./ReportKit";

type StatStyle = [LucideIcon, StatTone];

type CardDefinition = {
  key: string;
  label: string;
  style: StatStyle;
};

const card = (
  key: string,
  label: string,
  icon: LucideIcon,
  tone: StatTone,
): CardDefinition => ({ key, label, style: [icon, tone] });

const accountCards = (payable: boolean) => [
  card(
    "valor_total",
    payable ? "Total a pagar" : "Total a receber",
    payable ? Receipt : HandCoins,
    "primary",
  ),
  card(
    "total_liquidado",
    payable ? "Total pago" : "Total recebido",
    CheckCircle2,
    "success",
  ),
  card("total_pendente", "Total pendente", Clock, "warning"),
  card("valor_vencido", "Total vencido", AlertTriangle, "danger"),
];

const referenceCards: Record<string, CardDefinition[]> = {
  "fluxo-caixa": [
    card("saldoInicial", "Saldo inicial", PiggyBank, "neutral"),
    card("entradas_realizadas", "Total de entradas", ArrowUpCircle, "success"),
    card("saidas_realizadas", "Total de saídas", ArrowDownCircle, "danger"),
    card("resultado_periodo", "Resultado do período", Scale, "info"),
    card("saldo_atual", "Saldo final", Wallet, "primary"),
  ],
  "movimentacoes-financeiras": [
    card("total_movimentado", "Total movimentado", Repeat, "primary"),
    card("valor_entradas", "Total de entradas", ArrowUpCircle, "success"),
    card("valor_saidas", "Total de saídas", ArrowDownCircle, "danger"),
    card("movimentacoes", "Movimentações", ListOrdered, "info"),
  ],
  "receitas-despesas-categoria": [
    card("receitas", "Total de receitas", ArrowUpCircle, "success"),
    card("despesas", "Total de despesas", ArrowDownCircle, "danger"),
    card("resultado_periodo", "Resultado do período", Scale, "info"),
    card(
      "categorias_movimentadas",
      "Categorias movimentadas",
      Layers,
      "primary",
    ),
  ],
  "saldos-contas-bancarias": [
    card("saldo_consolidado", "Saldo total", Wallet, "primary"),
    card("total_entradas", "Total de entradas", ArrowUpCircle, "success"),
    card("total_saidas", "Total de saídas", ArrowDownCircle, "danger"),
    card("contas", "Contas bancárias", Landmark, "info"),
  ],
  "contas-pagar": accountCards(true),
  "contas-receber": accountCards(false),
  "conciliacao-bancaria": [
    card("conciliacoes", "Conciliações", GitCompareArrows, "primary"),
    card("movimentacoes", "Lançamentos importados", FileSpreadsheet, "info"),
    card("conciliadas", "Lançamentos conciliados", CheckCircle2, "success"),
    card("progresso", "Progresso geral", Percent, "warning"),
  ],
  "transferencias-bancarias": [
    card("valor_transferido", "Total transferido", ArrowLeftRight, "primary"),
    card("concluidas", "Efetivadas", CheckCircle2, "success"),
    card("agendadas", "Pendentes", Clock, "warning"),
    card("transferencias", "Transferências", Building2, "info"),
  ],
  "doacoes-recebidas": [
    card(
      "valor_financeiro_recebido",
      "Total em doações financeiras",
      HeartHandshake,
      "success",
    ),
    card("doacoes_financeiras", "Doações financeiras", Gift, "primary"),
    card("doacoes_nao_financeiras", "Doações não financeiras", Package, "info"),
    card("doadores", "Doadores distintos", Users, "neutral"),
  ],
  "fornecedores-pagamentos": [
    card("valor_pago", "Total pago", Coins, "success"),
    card("valor_pendente", "Total em aberto", Clock, "warning"),
    card("pagamentos", "Pagamentos realizados", Truck, "primary"),
    card("fornecedores", "Fornecedores", Users, "info"),
  ],
};

export function financialReportIndicators(
  slug: string,
  rows: LinhaFinanceira[],
  existing: IndicadorFinanceiro[],
): (IndicadorFinanceiro & { style?: StatStyle; hint?: string })[] {
  const definitions = referenceCards[slug];
  if (!definitions || !existing.length) return existing;

  const base = new Map(existing.map((item) => [item.chave, item]));
  const amount = (chave: string, valor: number) =>
    base.set(chave, { chave, label: "", valor, quantidade: null });
  const count = (chave: string, quantidade: number) =>
    base.set(chave, { chave, label: "", valor: null, quantidade });
  const indicatorAmount = (key: string) => base.get(key)?.valor ?? 0;
  const hints: Record<string, string> = {};
  const moeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  switch (slug) {
    case "fluxo-caixa":
      amount(
        "resultado_periodo",
        indicatorAmount("entradas_realizadas") -
          indicatorAmount("saidas_realizadas"),
      );
      break;
    case "movimentacoes-financeiras":
      amount(
        "total_movimentado",
        indicatorAmount("valor_entradas") + indicatorAmount("valor_saidas"),
      );
      break;
    case "receitas-despesas-categoria":
      count("categorias_movimentadas", rows.length);
      break;
    case "saldos-contas-bancarias":
      amount("total_entradas", sumReportField(rows, "entradas"));
      amount("total_saidas", sumReportField(rows, "saidas"));
      break;
    case "contas-pagar":
    case "contas-receber": {
      const pagas = rows.filter((row) => row.statusCodigo === "LIQUIDADO");
      const vencidas = rows.filter((row) => row.statusCodigo === "VENCIDO");
      const pendentes = rows.filter((row) => row.statusCodigo !== "LIQUIDADO");
      amount("total_liquidado", sumReportField(rows, "valorPago"));
      amount("total_pendente", sumReportField(pendentes, "valorPendente"));
      hints.total_liquidado = `${pagas.length} conta(s) liquidada(s)`;
      hints.total_pendente = `${pendentes.length} conta(s) em aberto`;
      hints.valor_vencido = `${vencidas.length} conta(s) vencida(s)`;
      break;
    }
    case "conciliacao-bancaria": {
      const progress = ratio(
        sumReportField(rows, "conciliadas"),
        sumReportField(rows, "total"),
      );
      base.set("progresso", {
        chave: "progresso",
        label: "",
        quantidade: null,
        valor: progress,
        texto:
          progress === null
            ? "—"
            : `${progress.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      });
      hints.conciliadas = `${sumReportField(rows, "pendentes") + sumReportField(rows, "divergencias")} aguardando revisão`;
      break;
    }
    case "transferencias-bancarias": {
      const agendadas = rows.filter((row) => row.statusCodigo === "AGENDADO");
      count("agendadas", agendadas.length);
      hints.concluidas = moeda(
        sumReportField(
          rows.filter((row) => row.statusCodigo === "REALIZADO"),
          "valor",
        ),
      );
      hints.agendadas = moeda(sumReportField(agendadas, "valor"));
      break;
    }
    case "doacoes-recebidas":
      hints.doacoes_nao_financeiras = "Bens, serviços e outras naturezas";
      break;
  }

  return definitions.flatMap(({ key, label, style }) => {
    const indicator = base.get(key);
    if (!indicator) return [];
    const tone =
      key === "resultado_periodo" && (indicator.valor ?? 0) < 0
        ? "warning"
        : key === "progresso" && indicator.valor === 100
          ? "success"
          : style[1];
    return [{ ...indicator, label, style: [style[0], tone], hint: hints[key] }];
  });
}

const route = (row: LinhaFinanceira) =>
  `${row.contaOrigem ?? "—"} → ${row.contaDestino ?? "—"}`;
const reconciliation = (row: LinhaFinanceira) =>
  `${row.conta ?? "—"} · ${row.periodoFinal ?? row.periodoInicial ?? "—"} · #${row.id}`;
const documentName = (row: LinhaFinanceira) =>
  row.arquivo && row.arquivo !== "—" ? row.arquivo : row.conta;

type ChartSelection = {
  label: string;
  value: (row: LinhaFinanceira) => string | number | boolean | null | undefined;
};

const category = {
  label: "Categoria",
  value: (row: LinhaFinanceira) => row.categoria,
};
const situation = {
  label: "Situação",
  value: (row: LinhaFinanceira) => row.situacao,
};
const supplier = {
  label: "Fornecedor",
  value: (row: LinhaFinanceira) => row.fornecedor,
};
export const financialChartSelections: Record<
  string,
  Record<string, ChartSelection>
> = {
  "receitas-despesas-categoria": {
    receitas: {
      ...category,
      value: (row) =>
        row.tipoCodigo === "ENTRADA" ? row.categoria : undefined,
    },
    despesas: {
      ...category,
      value: (row) => (row.tipoCodigo === "SAIDA" ? row.categoria : undefined),
    },
  },
  "contas-pagar": { classificacao: category, situacao: situation },
  "contas-receber": { classificacao: category, situacao: situation },
  "saldos-contas-bancarias": {
    saldos: { label: "Conta", value: (row) => row.nomeConta },
  },
  "fornecedores-pagamentos": {
    "pagamentos-por-fornecedor": supplier,
    "a-pagar-por-fornecedor": supplier,
  },
  "transferencias-bancarias": {
    rotas: { label: "Origem e destino", value: route },
  },
  "doacoes-recebidas": {
    doacoes: { label: "Tipo", value: (row) => row.tipo },
    "por-doador": { label: "Doador", value: (row) => row.doador },
    "por-destinacao": { label: "Destinação", value: (row) => row.destinacao },
  },
  "conciliacao-bancaria": {
    "situacao-conciliacoes": situation,
    "conferencia-movimentacoes": { label: "Extrato", value: documentName },
    progresso: { label: "Conciliação", value: reconciliation },
  },
};

function groupedChart(
  chave: string,
  titulo: string,
  rows: LinhaFinanceira[],
  group: (row: LinhaFinanceira) => string,
): GraficoFinanceiro {
  const values = new Map<string, number>();
  for (const row of rows) {
    const label = group(row);
    values.set(label, (values.get(label) ?? 0) + reportNumber(row.valor));
  }
  return {
    chave,
    titulo,
    dados: Array.from(values, ([label, valor]) => ({
      label,
      valor,
      entradas: null,
      saidas: null,
      saldo: null,
    }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8),
  };
}

export function financialExtraCharts(
  slug: string,
  rows: LinhaFinanceira[],
): GraficoFinanceiro[] {
  if (slug === "transferencias-bancarias") {
    return [
      groupedChart("rotas", "Valores por trajeto entre contas", rows, route),
    ];
  }
  if (slug === "doacoes-recebidas") {
    const financial = rows.filter(
      (row) => row.financeira && row.statusCodigo === "RECEBIDA",
    );
    return [
      groupedChart("por-doador", "Maiores doadores", financial, (row) =>
        String(row.doador ?? "—"),
      ),
      groupedChart(
        "por-destinacao",
        "Destinação das doações",
        financial,
        (row) => String(row.destinacao ?? "—"),
      ),
    ];
  }
  if (slug === "conciliacao-bancaria") {
    return [
      {
        chave: "progresso",
        titulo: "Progresso por conciliação",
        dados: rows.map((row) => ({
          label: reconciliation(row),
          valor:
            reportNumber(row.total) > 0
              ? (100 * reportNumber(row.conciliadas)) / reportNumber(row.total)
              : 0,
          entradas: null,
          saidas: null,
          saldo: null,
        })),
      },
    ];
  }
  return [];
}

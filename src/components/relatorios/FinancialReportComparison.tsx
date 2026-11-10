import { useCallback } from "react";
import { getPagamentosDosFornecedores } from "@/data/relatorioFornecedoresPagamentos";
import {
  buscarRelatorioFinanceiro,
  type FiltrosFinanceiros,
  type LinhaFinanceira,
} from "@/lib/relatoriosFinanceirosApi";
import {
  countDistinct,
  countRows,
  ratio,
  reportDate,
  sumField,
  sumReportField,
  type ReportRow,
} from "@/lib/reportComparisonIndicators";
import {
  ComparacaoPeriodos,
  type IndicadorComparavel,
} from "./ComparacaoPeriodos";

const movements = [
  sumField("Total de entradas", "entrada", "moeda"),
  sumField("Total de saídas", "saida", "moeda"),
];

const net = (
  label: string,
  multiplier: 1 | -1,
): IndicadorComparavel<ReportRow> => ({
  label,
  tipo: "moeda",
  calc: (rows) =>
    sumReportField(rows, "entrada") +
    multiplier * sumReportField(rows, "saida"),
});

const comparisons: Record<
  string,
  { reference: string; indicators: IndicadorComparavel<ReportRow>[] }
> = {
  "fluxo-caixa": {
    reference: "data da movimentação",
    indicators: [
      ...movements,
      net("Resultado do período", -1),
      countRows("Movimentações"),
    ],
  },
  "movimentacoes-financeiras": {
    reference: "data da movimentação",
    indicators: [
      ...movements,
      net("Total movimentado", 1),
      countRows("Movimentações"),
    ],
  },
  "saldos-contas-bancarias": {
    reference:
      "data da movimentação nas contas selecionadas (exclui transferências internas)",
    indicators: [...movements, countRows("Movimentações")],
  },
  "receitas-despesas-categoria": {
    reference: "data da movimentação (exclui transferências internas)",
    indicators: [
      sumField("Total de receitas", "entrada", "moeda"),
      sumField("Total de despesas", "saida", "moeda"),
      net("Resultado do período", -1),
      countDistinct("Categorias movimentadas", "categoria"),
    ],
  },
  "transferencias-bancarias": {
    reference: "data da transferência",
    indicators: [
      sumField("Total transferido", "valor", "moeda"),
      countRows("Efetivadas", (row) => row.statusCodigo === "REALIZADO"),
      countRows("Agendadas", (row) => row.statusCodigo === "AGENDADO"),
      countRows("Transferências"),
    ],
  },
  "doacoes-recebidas": {
    reference: "data da doação",
    indicators: [
      {
        label: "Total financeiro recebido",
        tipo: "moeda",
        calc: (rows) =>
          sumReportField(
            rows.filter(
              (row) => row.financeira && row.statusCodigo === "RECEBIDA",
            ),
            "valor",
          ),
      },
      countRows("Doações financeiras", (row) => row.financeira === true),
      countRows("Doações não financeiras", (row) => row.financeira === false),
      countDistinct("Doadores distintos", "doadorId"),
    ],
  },
  "fornecedores-pagamentos": {
    reference:
      "data de pagamento ou vencimento, quando ainda não houve pagamento",
    indicators: [
      sumField("Total pago", "valorPago", "moeda"),
      sumField("Total em aberto", "valorPendente", "moeda"),
      countRows("Pagamentos realizados", (row) => Boolean(row.dataPagamento)),
      countDistinct("Fornecedores com contas", "fornecedorId"),
    ],
  },
  "conciliacao-bancaria": {
    reference:
      "fim do período do extrato (início quando o fim estiver ausente)",
    indicators: [
      sumField("Lançamentos importados", "total"),
      sumField("Lançamentos conciliados", "conciliadas"),
      {
        label: "Progresso da conciliação",
        tipo: "percentual",
        calc: (rows) =>
          ratio(
            sumReportField(rows, "conciliadas"),
            sumReportField(rows, "total"),
          ),
      },
      countRows("Conciliações"),
    ],
  },
};

const isTransfer = (row: LinhaFinanceira) =>
  row.origemCodigo === "TRANSFERENCIA";

export function FinancialReportComparison({
  slug,
  filters,
  currentRows,
}: {
  slug: string;
  filters: FiltrosFinanceiros;
  currentRows: LinhaFinanceira[];
}) {
  const isPayable = slug === "contas-pagar";
  const isAccount = isPayable || slug === "contas-receber";
  const bySettlement =
    filters.baseData === "PAGAMENTO" || filters.baseData === "RECEBIMENTO";
  const accountDate = bySettlement
    ? "dataEfetivacao"
    : filters.baseData === "COMPETENCIA"
      ? "competencia"
      : "vencimento";
  const config = isAccount
    ? {
        reference: bySettlement
          ? isPayable
            ? "data de pagamento"
            : "data de recebimento"
          : accountDate === "competencia"
            ? "competência"
            : "vencimento",
        indicators: [
          sumField(
            isPayable ? "Total a pagar" : "Total a receber",
            "valor",
            "moeda",
          ),
          countRows(
            isPayable ? "Contas pagas" : "Contas recebidas",
            (row) => row.statusCodigo === "LIQUIDADO",
          ),
          countRows("Contas vencidas", (row) => row.statusCodigo === "VENCIDO"),
          countRows("Contas"),
        ],
      }
    : comparisons[slug];

  const loadRows = useCallback(async (): Promise<ReportRow[]> => {
    const { dataInicial, dataFinal, ...nonDateFilters } = filters;
    if (slug === "fornecedores-pagamentos") {
      const response = await buscarRelatorioFinanceiro(slug, nonDateFilters);
      const suppliers = new Set(response.linhas.map((row) => String(row.id)));
      if (!suppliers.size) return [];
      return (await getPagamentosDosFornecedores(nonDateFilters)).filter(
        (row) => suppliers.has(row.fornecedorId),
      );
    }

    if (slug === "saldos-contas-bancarias") {
      const accounts = new Set(currentRows.map((row) => String(row.id)));
      if (!accounts.size) return [];
      const response = await buscarRelatorioFinanceiro(
        "movimentacoes-financeiras",
        { contaId: filters.contaId },
      );
      return response.linhas.filter(
        (row) => accounts.has(String(row.contaBancariaId)) && !isTransfer(row),
      );
    }
    if (slug === "receitas-despesas-categoria") {
      const response = await buscarRelatorioFinanceiro(
        "movimentacoes-financeiras",
        nonDateFilters,
      );
      return response.linhas.filter((row) => !isTransfer(row));
    }
    if (!dataInicial && !dataFinal) return currentRows;
    return (await buscarRelatorioFinanceiro(slug, nonDateFilters)).linhas;
  }, [currentRows, filters, slug]);

  if (!config) return null;
  return (
    <ComparacaoPeriodos
      id={slug}
      rows={currentRows}
      loadRows={loadRows}
      getData={(row) =>
        reportDate(
          isAccount
            ? row[accountDate]
            : slug === "conciliacao-bancaria"
              ? row.periodoFinal || row.periodoInicial
              : row.data,
        )
      }
      indicadores={config.indicators}
      referencia={config.reference}
      periodo={
        filters.dataInicial && filters.dataFinal
          ? { inicio: filters.dataInicial, fim: filters.dataFinal }
          : undefined
      }
    />
  );
}

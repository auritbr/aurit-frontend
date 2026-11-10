import { getContasPagar, parseMoney } from "@/data/contasPagar";
import type {
  FiltrosFinanceiros,
  RelatorioFinanceiroResponse,
} from "@/lib/relatoriosFinanceirosApi";
import { dataISO } from "@/lib/periodComparison";

export async function getPagamentosDosFornecedores(
  filters: FiltrosFinanceiros,
) {
  const hoje = new Date().toLocaleDateString("sv-SE");
  return (await getContasPagar()).flatMap((conta) => {
    const vencimento = dataISO(conta.dataVencimento);
    const dataPagamento = dataISO(conta.dataPagamento);
    const data = dataPagamento ?? vencimento;
    const status =
      conta.statusFinanceiro === "PENDENTE" && vencimento && vencimento < hoje
        ? "VENCIDO"
        : conta.statusFinanceiro;

    if (!conta.fornecedorId) return [];
    if (
      filters.categoria &&
      filters.categoria !== "TODAS" &&
      conta.classificacaoContaPagar !== filters.categoria
    )
      return [];
    if (
      filters.projetoId &&
      filters.projetoId !== "TODOS" &&
      conta.projetoId !== filters.projetoId
    )
      return [];
    if (
      filters.status &&
      filters.status !== "TODOS" &&
      status !== filters.status
    )
      return [];
    if (filters.dataInicial && (!data || data < filters.dataInicial)) return [];
    if (filters.dataFinal && (!data || data > filters.dataFinal)) return [];

    const valorPago = parseMoney(conta.valorPago);
    return [
      {
        fornecedorId: conta.fornecedorId,
        data,
        dataPagamento,
        valorPago,
        valorPendente: Math.max(0, parseMoney(conta.valorAPagar) - valorPago),
      },
    ];
  });
}

function temRecorteDePagamento(filters: FiltrosFinanceiros) {
  return Boolean(
    filters.dataInicial ||
    filters.dataFinal ||
    (filters.categoria && filters.categoria !== "TODAS") ||
    (filters.projetoId && filters.projetoId !== "TODOS") ||
    (filters.status && filters.status !== "TODOS"),
  );
}

export async function recortarPagamentosPorFornecedor(
  response: RelatorioFinanceiroResponse,
  filters: FiltrosFinanceiros,
): Promise<RelatorioFinanceiroResponse> {
  const recorteAtivo = temRecorteDePagamento(filters);
  const pagamentos = await getPagamentosDosFornecedores(filters).catch(
    (error: unknown) => {
      if (recorteAtivo) throw error;
      return null;
    },
  );
  if (!pagamentos)
    return {
      ...response,
      indicadores: response.indicadores.map((item) =>
        item.chave === "pagamentos" ? { ...item, texto: "—" } : item,
      ),
    };
  const porFornecedor = new Map<string, typeof pagamentos>();
  for (const pagamento of pagamentos) {
    const registros = porFornecedor.get(pagamento.fornecedorId) ?? [];
    registros.push(pagamento);
    porFornecedor.set(pagamento.fornecedorId, registros);
  }
  const linhas = response.linhas.flatMap((row) => {
    const registros = porFornecedor.get(String(row.id)) ?? [];
    if (recorteAtivo && !registros.length) return [];
    const pagos = registros.filter((item) => item.dataPagamento);
    return [
      {
        ...row,
        fornecedor: row.fornecedor,
        quantidadePagamentos: pagos.length,
        valorPago: registros.reduce((total, item) => total + item.valorPago, 0),
        valorPendente: registros.reduce(
          (total, item) => total + item.valorPendente,
          0,
        ),
        ultimoPagamento:
          pagos
            .map((item) => item.dataPagamento)
            .sort()
            .at(-1) ?? null,
      },
    ];
  });
  const indicadores = response.indicadores.map((item) => {
    switch (item.chave) {
      case "fornecedores":
        return { ...item, quantidade: linhas.length };
      case "pagamentos":
        return {
          ...item,
          quantidade: linhas.reduce(
            (total, row) => total + row.quantidadePagamentos,
            0,
          ),
        };
      case "valor_pago":
        return {
          ...item,
          valor: linhas.reduce((total, row) => total + row.valorPago, 0),
        };
      case "valor_pendente":
        return {
          ...item,
          valor: linhas.reduce((total, row) => total + row.valorPendente, 0),
        };
      default:
        return item;
    }
  });
  const graficos = response.graficos.map((grafico) => {
    const field =
      grafico.chave === "pagamentos-por-fornecedor"
        ? "valorPago"
        : "valorPendente";
    const values = new Map<string, number>();
    for (const row of linhas) {
      const name = String(row.fornecedor ?? "—");
      values.set(name, (values.get(name) ?? 0) + row[field]);
    }
    const dados = Array.from(values, ([label, valor]) => ({
      label,
      valor,
      entradas: null,
      saidas: null,
      saldo: null,
    }))
      .filter(({ valor }) => valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
    return { ...grafico, dados };
  });
  return { ...response, linhas, indicadores, graficos };
}

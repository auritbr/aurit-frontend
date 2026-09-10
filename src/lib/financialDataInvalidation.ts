import { invalidateReportData } from "@/lib/reportDataInvalidation";

export const FINANCIAL_DATA_INVALIDATED_EVENT =
  "aurit:financial-data-invalidated";

export type FinancialDataSource =
  | "conta-pagar"
  | "conta-receber"
  | "conta-bancaria"
  | "transferencia-bancaria"
  | "movimentacao-bancaria"
  | "financeiro"
  | "planejamento-financeiro"
  | "prestacao-contas"
  | "doacao"
  | "doador"
  | "fornecedor"
  | "parceiro";

export function invalidateFinancialData(source: FinancialDataSource) {
  invalidateReportData(source);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FINANCIAL_DATA_INVALIDATED_EVENT, {
      detail: { source, timestamp: Date.now() },
    }),
  );
}

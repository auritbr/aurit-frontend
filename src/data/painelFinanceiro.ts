import { getJsonHeaders } from "@/lib/apiHeaders";
import type { AgrupamentoFluxo, FluxoCaixaPeriodoDTO } from "@/data/fluxoCaixa";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const DIAS_PROXIMO_VENCIMENTO = 7;
export const LIMITE_PROXIMOS = 5;

export interface PainelResumoValor {
  quantidade: number;
  valor: number;
}
export interface PainelDistribuicaoItem {
  id: string;
  label: string;
  valor: number;
  percentual: number;
}
export interface PainelLancamentoPrevisto {
  id: string;
  descricao: string;
  pessoa: string;
  projeto: string;
  vencimento: string;
  valor: number;
  situacao: string;
}
export interface PainelContaResumo {
  id: string;
  nomeConta: string;
  banco: string;
  identificacao: string;
  saldo: number;
}

export interface PainelFinanceiroDTO {
  dataInicial: string;
  dataFinal: string;
  agrupamento: AgrupamentoFluxo;
  saldoAtual: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  resultadoPeriodo: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoProjetado: number;
  receberVencidas: PainelResumoValor;
  pagarVencidas: PainelResumoValor;
  receberProximas: PainelResumoValor;
  pagarProximas: PainelResumoValor;
  periodos: FluxoCaixaPeriodoDTO[];
  despesasPorCategoria: PainelDistribuicaoItem[];
  despesasPorProjeto: PainelDistribuicaoItem[];
  proximosRecebimentos: PainelLancamentoPrevisto[];
  proximosPagamentos: PainelLancamentoPrevisto[];
  contas: PainelContaResumo[];
  saldoTotalContas: number;
  semMovimentacao: boolean;
}

export interface PainelFinanceiroFiltros {
  dataInicial: string;
  dataFinal: string;
  contaBancariaId?: string;
  projetoId?: string;
}

export const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );
export const formatPercent = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
export function periodoPadraoPainel() {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    dataInicial: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    dataFinal: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { message?: string };
    return data.message ?? text;
  } catch {
    return text || `Erro ${response.status}`;
  }
}

export async function getPainelFinanceiro(
  filtros: PainelFinanceiroFiltros,
): Promise<PainelFinanceiroDTO> {
  const params = new URLSearchParams({
    dataInicial: filtros.dataInicial,
    dataFinal: filtros.dataFinal,
  });
  if (filtros.contaBancariaId)
    params.set("contaBancariaId", filtros.contaBancariaId);
  if (filtros.projetoId) params.set("projetoId", filtros.projetoId);
  const response = await fetch(`${API_URL}/painel-financeiro?${params}`, {
    cache: "no-store",
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as PainelFinanceiroDTO & {
    periodos?: Array<FluxoCaixaPeriodoDTO & { data?: string }>;
  };
  return {
    ...data,
    periodos: (data.periodos ?? []).map((item) => ({
      ...item,
      periodo: item.periodo || item.data || "",
    })),
    contas: (data.contas ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
    proximosRecebimentos: (data.proximosRecebimentos ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
    proximosPagamentos: (data.proximosPagamentos ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
  };
}

import { apiFetch } from "@/lib/api";

export interface IndicadorFinanceiro {
  chave: string;
  label: string;
  valor: number | null;
  quantidade: number | null;
  texto?: string | null;
}
export interface PontoGraficoFinanceiro {
  label: string;
  valor: number | null;
  entradas: number | null;
  saidas: number | null;
  saldo: number | null;
}
export interface GraficoFinanceiro {
  chave: string;
  titulo: string;
  dados: PontoGraficoFinanceiro[];
}
export interface OpcaoFinanceira {
  value: string;
  label: string;
}
export interface OpcoesFinanceiras {
  contas: OpcaoFinanceira[];
  projetos: OpcaoFinanceira[];
  categorias: OpcaoFinanceira[];
  origens: OpcaoFinanceira[];
  doadores: OpcaoFinanceira[];
  fornecedores: OpcaoFinanceira[];
}
/** Alguns relatórios criam linhas derivadas, como as duas pontas de uma transferência. */
export type LinhaFinanceira = Record<
  string,
  string | number | boolean | null
> & { id?: number | string; chave?: string };
export interface RelatorioFinanceiroResponse {
  indicadores: IndicadorFinanceiro[];
  graficos: GraficoFinanceiro[];
  linhas: LinhaFinanceira[];
  opcoes: OpcoesFinanceiras;
}

export interface FiltrosFinanceiros {
  busca?: string;
  dataInicial?: string;
  dataFinal?: string;
  contaId?: string;
  contaOrigemId?: string;
  contaDestinoId?: string;
  projetoId?: string;
  doadorId?: string;
  fornecedorId?: string;
  categoria?: string;
  tipo?: string;
  origem?: string;
  status?: string;
  baseData?: string;
}

export async function buscarRelatorioFinanceiro(
  slug: string,
  filtros: FiltrosFinanceiros,
) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor && !["TODOS", "TODAS"].includes(valor)) params.set(chave, valor);
  });
  const query = params.toString();
  return apiFetch<RelatorioFinanceiroResponse>(
    `/relatorios/financeiros/${slug}${query ? `?${query}` : ""}`,
  );
}

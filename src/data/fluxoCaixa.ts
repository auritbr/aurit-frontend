import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type AgrupamentoFluxo = "DIARIO" | "MENSAL";
export type TipoFluxoCaixa =
  | "ENTRADA_REALIZADA"
  | "SAIDA_REALIZADA"
  | "ENTRADA_PREVISTA"
  | "SAIDA_PREVISTA";

export interface FluxoCaixaPeriodoDTO {
  periodo: string;
  entradasRealizadas: number;
  saidasRealizadas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoAcumulado: number;
  saldoProjetado: number;
}

export interface FluxoCaixaDTO {
  dataInicial: string;
  dataFinal: string;
  saldoInicial: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoAtual: number;
  saldoProjetado: number;
  periodos: FluxoCaixaPeriodoDTO[];
}

export interface FluxoCaixaLancamentoDTO {
  id: string;
  data: string;
  historico: string;
  valor: number;
  tipo: TipoFluxoCaixa;
  origem: string;
  contaBancariaId: string;
  contaPagarId: string;
  contaReceberId: string;
  transferenciaBancariaId: string;
}

export interface FluxoCaixaConsulta {
  organizacaoId: string | number;
  contaBancariaId?: string;
  projetoId?: string;
  dataInicial: string;
  dataFinal: string;
  agrupamento?: AgrupamentoFluxo;
  tipo?: TipoFluxoCaixa;
}

export const agrupamentoOptions = [
  { value: "DIARIO", label: "Diário" },
  { value: "MENSAL", label: "Mensal" },
] as const;

export const tipoLancamentoOptions = [
  { value: "ENTRADA_REALIZADA", label: "Entrada realizada" },
  { value: "ENTRADA_PREVISTA", label: "Entrada prevista" },
  { value: "SAIDA_REALIZADA", label: "Saída realizada" },
  { value: "SAIDA_PREVISTA", label: "Saída prevista" },
] as const;

export const origemFluxoOptions = [
  { value: "AJUSTE", label: "Ajuste" },
  { value: "CONTA_PAGAR", label: "Conta a pagar" },
  { value: "CONTA_RECEBER", label: "Conta a receber" },
  { value: "ESTORNO", label: "Estorno" },
  { value: "TRANSFERENCIA", label: "Transferência bancária" },
] as const;

export const tipoLancamentoLabel = (value?: string) =>
  tipoLancamentoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";
export const origemFluxoLabel = (value?: string) =>
  origemFluxoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const isEntrada = (tipo?: string) =>
  tipo?.startsWith("ENTRADA") ?? false;
export const isPrevisto = (tipo?: string) =>
  tipo?.endsWith("PREVISTA") ?? false;

export const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function formatPeriodoLabel(
  value: string,
  agrupamento: AgrupamentoFluxo,
) {
  if (agrupamento === "MENSAL") {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  }
  return formatDate(value).slice(0, 5);
}

export function formatPeriodoCompleto(
  value: string,
  agrupamento: AgrupamentoFluxo,
) {
  if (agrupamento === "MENSAL") {
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return formatDate(value);
}

export function periodoPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const isoLocal = (data: Date) => {
    const y = data.getFullYear();
    const m = String(data.getMonth() + 1).padStart(2, "0");
    const d = String(data.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return {
    dataInicial: isoLocal(new Date(ano, mes, 1)),
    dataFinal: isoLocal(new Date(ano, mes + 1, 0)),
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  if (!text) return `Erro ${response.status}`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message ?? body.error ?? text;
  } catch {
    return text;
  }
}

function paramsFrom(consulta: FluxoCaixaConsulta, includeAgrupamento: boolean) {
  if (!consulta.dataInicial || !consulta.dataFinal) {
    throw new Error("Informe a data inicial e a data final.");
  }
  const params = new URLSearchParams({
    organizacaoId: String(consulta.organizacaoId),
    dataInicial: consulta.dataInicial,
    dataFinal: consulta.dataFinal,
  });
  if (consulta.contaBancariaId)
    params.set("contaBancariaId", consulta.contaBancariaId);
  if (consulta.projetoId) params.set("projetoId", consulta.projetoId);
  if (includeAgrupamento)
    params.set("agrupamento", consulta.agrupamento ?? "DIARIO");
  if (!includeAgrupamento && consulta.tipo) params.set("tipo", consulta.tipo);
  return params.toString();
}

async function request(path: string) {
  const response = await fetch(`${API_URL}/fluxo-caixa${path}`, {
    cache: "no-store",
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response;
}

const numberValue = (value: unknown) => Number(value ?? 0);
const idValue = (value: unknown) => (value == null ? "" : String(value));

export async function getFluxoCaixa(
  consulta: FluxoCaixaConsulta,
): Promise<FluxoCaixaDTO> {
  const response = await request(`?${paramsFrom(consulta, true)}`);
  const dto = (await response.json()) as Record<string, unknown> & {
    periodos?: Array<Record<string, unknown>>;
  };
  return {
    dataInicial: String(dto.dataInicial ?? ""),
    dataFinal: String(dto.dataFinal ?? ""),
    saldoInicial: numberValue(dto.saldoInicial),
    entradasRealizadas: numberValue(dto.entradasRealizadas),
    saidasRealizadas: numberValue(dto.saidasRealizadas),
    entradasPrevistas: numberValue(dto.entradasPrevistas),
    saidasPrevistas: numberValue(dto.saidasPrevistas),
    saldoAtual: numberValue(dto.saldoAtual),
    saldoProjetado: numberValue(dto.saldoProjetado),
    periodos: (dto.periodos ?? []).map((periodo) => ({
      periodo: String(periodo.data ?? ""),
      entradasRealizadas: numberValue(periodo.entradasRealizadas),
      saidasRealizadas: numberValue(periodo.saidasRealizadas),
      entradasPrevistas: numberValue(periodo.entradasPrevistas),
      saidasPrevistas: numberValue(periodo.saidasPrevistas),
      saldoAcumulado: numberValue(periodo.saldoAcumulado),
      saldoProjetado: numberValue(periodo.saldoProjetado),
    })),
  };
}

export async function getFluxoCaixaLancamentos(
  consulta: FluxoCaixaConsulta,
): Promise<FluxoCaixaLancamentoDTO[]> {
  const response = await request(`/lancamentos?${paramsFrom(consulta, false)}`);
  const data = (await response.json()) as Array<Record<string, unknown>>;
  return data.map((item) => ({
    id: idValue(item.id),
    data: String(item.data ?? ""),
    historico: String(item.descricao ?? ""),
    valor: numberValue(item.valor),
    tipo: item.tipoFluxoCaixa as TipoFluxoCaixa,
    origem: String(item.origem ?? ""),
    contaBancariaId: idValue(item.contaBancariaId),
    contaPagarId: idValue(item.contaPagarId),
    contaReceberId: idValue(item.contaReceberId),
    transferenciaBancariaId: idValue(item.transferenciaBancariaId),
  }));
}

/**
 * O endpoint consolidado ainda pode omitir transferências quando não recebe uma
 * conta específica. Para a visão "todas as contas", consolida as respostas por
 * conta: assim cada lado da transferência (saída e entrada) participa do caixa.
 */
export async function getFluxoCaixaConsolidado(
  consulta: FluxoCaixaConsulta,
  contaIds: string[],
): Promise<{ fluxo: FluxoCaixaDTO; lancamentos: FluxoCaixaLancamentoDTO[] }> {
  if (consulta.contaBancariaId || contaIds.length === 0) {
    const [fluxo, lancamentos] = await Promise.all([
      getFluxoCaixa(consulta),
      getFluxoCaixaLancamentos(consulta),
    ]);
    return { fluxo, lancamentos };
  }

  const consultas = contaIds.map((contaBancariaId) => ({
    ...consulta,
    contaBancariaId,
  }));
  const resultados = await Promise.all(
    consultas.map(async (consultaConta) => ({
      fluxo: await getFluxoCaixa(consultaConta),
      lancamentos: await getFluxoCaixaLancamentos(consultaConta),
    })),
  );

  const periodos = new Map<string, FluxoCaixaPeriodoDTO>();
  for (const { fluxo } of resultados) {
    for (const periodo of fluxo.periodos) {
      const atual = periodos.get(periodo.periodo) ?? {
        periodo: periodo.periodo,
        entradasRealizadas: 0,
        saidasRealizadas: 0,
        entradasPrevistas: 0,
        saidasPrevistas: 0,
        saldoAcumulado: 0,
        saldoProjetado: 0,
      };
      atual.entradasRealizadas += periodo.entradasRealizadas;
      atual.saidasRealizadas += periodo.saidasRealizadas;
      atual.entradasPrevistas += periodo.entradasPrevistas;
      atual.saidasPrevistas += periodo.saidasPrevistas;
      atual.saldoAcumulado += periodo.saldoAcumulado;
      atual.saldoProjetado += periodo.saldoProjetado;
      periodos.set(periodo.periodo, atual);
    }
  }

  const somar = (
    campo: keyof Omit<FluxoCaixaDTO, "dataInicial" | "dataFinal" | "periodos">,
  ) => resultados.reduce((total, item) => total + Number(item.fluxo[campo]), 0);
  return {
    fluxo: {
      dataInicial: consulta.dataInicial,
      dataFinal: consulta.dataFinal,
      saldoInicial: somar("saldoInicial"),
      entradasRealizadas: somar("entradasRealizadas"),
      saidasRealizadas: somar("saidasRealizadas"),
      entradasPrevistas: somar("entradasPrevistas"),
      saidasPrevistas: somar("saidasPrevistas"),
      saldoAtual: somar("saldoAtual"),
      saldoProjetado: somar("saldoProjetado"),
      periodos: Array.from(periodos.values()).sort((a, b) =>
        a.periodo.localeCompare(b.periodo),
      ),
    },
    lancamentos: resultados.flatMap((item) => item.lancamentos),
  };
}

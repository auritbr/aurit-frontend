import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type TipoMovimentacaoBancaria = "ENTRADA" | "SAIDA";
export type OrigemMovimentacaoBancaria =
  | "CONTA_PAGAR"
  | "CONTA_RECEBER"
  | "TRANSFERENCIA"
  | "ESTORNO"
  | "AJUSTE";

export interface MovimentacaoBancaria {
  id: string;
  dataMovimentacao: string;
  valor: number;
  tipoMovimentacao: TipoMovimentacaoBancaria;
  origemMovimentacao: OrigemMovimentacaoBancaria;
  criadoEm: string;
  contaBancariaId: string;
  organizacaoId: string;
  contaPagarId: string;
  contaReceberId: string;
  transferenciaBancariaId: string;
  movimentacaoEstornadaId: string;
  historico: string;
}

export const tipoMovimentacaoOptions = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
] as const;

export const origemMovimentacaoOptions = [
  { value: "CONTA_PAGAR", label: "Conta a pagar" },
  { value: "CONTA_RECEBER", label: "Conta a receber" },
  { value: "ESTORNO", label: "Estorno" },
  { value: "TRANSFERENCIA", label: "Transferência bancária" },
  { value: "AJUSTE", label: "Ajuste" },
] as const;

export const origemMovimentacaoLabel = (value?: string) =>
  origemMovimentacaoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export const totalEntradas = (items: readonly MovimentacaoBancaria[]) =>
  items.reduce(
    (total, item) =>
      total + (item.tipoMovimentacao === "ENTRADA" ? item.valor : 0),
    0,
  );

export const totalSaidas = (items: readonly MovimentacaoBancaria[]) =>
  items.reduce(
    (total, item) =>
      total + (item.tipoMovimentacao === "SAIDA" ? item.valor : 0),
    0,
  );

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

async function request(path = "", init?: RequestInit) {
  const response = await fetch(`${API_URL}/movimentacoes-bancarias${path}`, {
    ...init,
    cache: "no-store",
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response;
}

type MovimentacaoDTO = Partial<Omit<MovimentacaoBancaria, "id" | "valor">> & {
  id?: string | number;
  valor?: string | number;
  contaBancariaId?: string | number | null;
  organizacaoId?: string | number | null;
  contaPagarId?: string | number | null;
  contaReceberId?: string | number | null;
  transferenciaBancariaId?: string | number | null;
  movimentacaoEstornadaId?: string | number | null;
};

const idString = (value?: string | number | null) =>
  value == null ? "" : String(value);

function historicoMovimentacao(dto: MovimentacaoDTO) {
  if (dto.origemMovimentacao === "CONTA_PAGAR")
    return `Pagamento da conta a pagar #${idString(dto.contaPagarId) || "—"}`;
  if (dto.origemMovimentacao === "CONTA_RECEBER")
    return `Recebimento da conta a receber #${idString(dto.contaReceberId) || "—"}`;
  if (dto.origemMovimentacao === "TRANSFERENCIA")
    return `Transferência bancária #${idString(dto.transferenciaBancariaId) || "—"}`;
  if (dto.origemMovimentacao === "ESTORNO")
    return `Estorno da movimentação #${idString(dto.movimentacaoEstornadaId) || "—"}`;
  if (dto.origemMovimentacao === "AJUSTE") return "Ajuste bancário";
  return origemMovimentacaoLabel(dto.origemMovimentacao);
}

function mapMovimentacao(dto: MovimentacaoDTO): MovimentacaoBancaria {
  return {
    id: idString(dto.id),
    dataMovimentacao: dto.dataMovimentacao ?? "",
    valor: Number(dto.valor ?? 0),
    tipoMovimentacao: dto.tipoMovimentacao as TipoMovimentacaoBancaria,
    origemMovimentacao: dto.origemMovimentacao as OrigemMovimentacaoBancaria,
    criadoEm: dto.criadoEm ?? "",
    contaBancariaId: idString(dto.contaBancariaId),
    organizacaoId: idString(dto.organizacaoId),
    contaPagarId: idString(dto.contaPagarId),
    contaReceberId: idString(dto.contaReceberId),
    transferenciaBancariaId: idString(dto.transferenciaBancariaId),
    movimentacaoEstornadaId: idString(dto.movimentacaoEstornadaId),
    historico: historicoMovimentacao(dto),
  };
}

async function readList(path = "") {
  const response = await request(path);
  return ((await response.json()) as MovimentacaoDTO[]).map(mapMovimentacao);
}

export const getMovimentacoesBancarias = () => readList();

export async function reconciliarMovimentacoesBancarias() {
  const response = await request("/reconciliar", { method: "POST" });
  return Number(await response.json());
}

export async function getMovimentacaoBancaria(id: string | number) {
  const response = await request(`/${id}`);
  return mapMovimentacao((await response.json()) as MovimentacaoDTO);
}

export function getExtratoBancario(
  contaBancariaId: string | number,
  dataInicial?: string,
  dataFinal?: string,
) {
  const params = new URLSearchParams();
  if (dataInicial && dataFinal) {
    params.set("dataInicial", dataInicial);
    params.set("dataFinal", dataFinal);
  }
  const query = params.size ? `?${params.toString()}` : "";
  return readList(`/conta/${contaBancariaId}/extrato${query}`);
}

async function readNumber(path: string) {
  const response = await request(path);
  return Number(await response.json());
}

export const getSaldoContaBancaria = (contaBancariaId: string | number) =>
  readNumber(`/conta/${contaBancariaId}/saldo`);

function periodoQuery(dataInicial: string, dataFinal: string) {
  const params = new URLSearchParams({ dataInicial, dataFinal });
  return params.toString();
}

export const getEntradasContaBancaria = (
  contaBancariaId: string | number,
  dataInicial: string,
  dataFinal: string,
) =>
  readNumber(
    `/conta/${contaBancariaId}/entradas?${periodoQuery(dataInicial, dataFinal)}`,
  );

export const getSaidasContaBancaria = (
  contaBancariaId: string | number,
  dataInicial: string,
  dataFinal: string,
) =>
  readNumber(
    `/conta/${contaBancariaId}/saidas?${periodoQuery(dataInicial, dataFinal)}`,
  );

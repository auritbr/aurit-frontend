import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";
export {
  formatCurrency,
  formatDate,
  maskMoney,
  parseMoney,
} from "@/data/contasPagar";
import {
  formaPagamentoLabel,
  formaPagamentoOptions,
  parseMoney,
} from "@/data/contasPagar";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const formaTransferenciaOptions = formaPagamentoOptions;
export const formaTransferenciaLabel = formaPagamentoLabel;
export const statusTransferenciaOptions = [
  { value: "AGENDADO", label: "Agendado" },
  { value: "REALIZADO", label: "Realizado" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;
export const statusTransferenciaLabel = (value?: string) =>
  statusTransferenciaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export interface TransferenciaBancariaData {
  id: string;
  nomeTransferencia: string;
  descricaoTransferencia: string;
  dataTransferencia: string;
  dataEfetivacaoTransferencia: string;
  valorTransferencia: string;
  numeroDocumento: string;
  urlComprovante: string;
  nomeComprovante: string;
  statusTransferenciaBancaria: string;
  formaPagamento: string;
  contaOrigemId: string;
  contaDestinoId: string;
  organizacaoId: string;
  comprovanteFile?: File;
  removerComprovante?: boolean;
}

type TransferenciaDTO = Partial<Omit<TransferenciaBancariaData, "id">> & {
  id?: string | number;
  valorTransferencia?: string | number | null;
  organizacaoId?: string | number | null;
};

export function createEmptyTransferencia(): TransferenciaBancariaData {
  return {
    id: "",
    nomeTransferencia: "",
    descricaoTransferencia: "",
    dataTransferencia: "",
    dataEfetivacaoTransferencia: "",
    valorTransferencia: "",
    numeroDocumento: "",
    urlComprovante: "",
    nomeComprovante: "",
    statusTransferenciaBancaria: "",
    formaPagamento: "",
    contaOrigemId: "",
    contaDestinoId: "",
    organizacaoId: "",
    removerComprovante: false,
  };
}

const text = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);
const idText = (value: unknown) => (value == null ? "" : String(value));
const moneyText = (value: unknown) =>
  value == null
    ? ""
    : Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

function mapTransferencia(dto: TransferenciaDTO): TransferenciaBancariaData {
  return {
    ...createEmptyTransferencia(),
    ...dto,
    id: idText(dto.id),
    nomeTransferencia: text(dto.nomeTransferencia),
    descricaoTransferencia: text(dto.descricaoTransferencia),
    dataTransferencia: text(dto.dataTransferencia),
    valorTransferencia: moneyText(dto.valorTransferencia),
    statusTransferenciaBancaria: text(dto.statusTransferenciaBancaria),
    formaPagamento: text(dto.formaPagamento),
    contaOrigemId: idText(dto.contaOrigemId),
    contaDestinoId: idText(dto.contaDestinoId),
    organizacaoId: idText(dto.organizacaoId),
    urlComprovante: text(dto.urlComprovante),
    nomeComprovante: dto.urlComprovante ? "Comprovante anexado" : "",
  } as TransferenciaBancariaData;
}

function payload(item: TransferenciaBancariaData) {
  return {
    nomeTransferencia: text(item.nomeTransferencia).trim(),
    descricaoTransferencia: text(item.descricaoTransferencia).trim(),
    dataTransferencia: item.dataTransferencia,
    valorTransferencia: parseMoney(item.valorTransferencia),
    statusTransferenciaBancaria: item.statusTransferenciaBancaria,
    formaPagamento: item.formaPagamento,
    contaOrigemId: item.contaOrigemId ? Number(item.contaOrigemId) : null,
    contaDestinoId: item.contaDestinoId ? Number(item.contaDestinoId) : null,
    urlComprovante: text(item.urlComprovante).startsWith("blob:")
      ? null
      : text(item.urlComprovante).trim() || null,
    removerComprovante: Boolean(item.removerComprovante),
  };
}

async function errorMessage(response: Response) {
  const body = await response.text();
  if (!body) return `Erro ${response.status}`;
  try {
    const data = JSON.parse(body) as { message?: string; error?: string };
    return data.message ?? data.error ?? body;
  } catch {
    return body;
  }
}
async function request(path = "", init?: RequestInit) {
  const response = await fetch(`${API_URL}/transferencias-bancarias${path}`, {
    ...init,
    headers:
      init?.body instanceof FormData ? getMultipartHeaders() : getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response;
}

export async function getTransferencias() {
  const response = await request();
  return ((await response.json()) as TransferenciaDTO[]).map(mapTransferencia);
}
export async function getTransferencia(id: string | number) {
  const response = await request(`/${id}`);
  return mapTransferencia(await response.json());
}
export async function saveTransferencia(item: TransferenciaBancariaData) {
  const dados = payload(item);
  let body: BodyInit;
  if (item.comprovanteFile) {
    const formData = new FormData();
    formData.append("dados", JSON.stringify(dados));
    formData.append("comprovante", item.comprovanteFile);
    body = formData;
  } else body = JSON.stringify(dados);
  const response = await request(item.id ? `/${item.id}` : "", {
    method: item.id ? "PUT" : "POST",
    body,
  });
  const transferencia = mapTransferencia(await response.json());
  invalidateFinancialData("transferencia-bancaria");
  return transferencia;
}
export async function deleteTransferencia(id: string | number) {
  await request(`/${id}`, { method: "DELETE" });
  invalidateFinancialData("transferencia-bancaria");
}
export async function getTransferenciaComprovanteUrl(id: string | number) {
  const response = await request(`/${id}/download`);
  const body = await response.text();
  try {
    return JSON.parse(body) as string;
  } catch {
    return body;
  }
}

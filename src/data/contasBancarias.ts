import { getJsonHeaders } from "@/lib/apiHeaders";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";
import { maskBankAccount, maskBankAgency } from "@/lib/masks";
import { sortOptionsByLabel } from "@/lib/sortOptions";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type StatusContaBancaria = "ATIVO" | "INATIVO";
export type TipoContaBancaria = "CORRENTE" | "POUPANCA";

export const nomeBancoValues = [
  "BANCO_DO_BRASIL",
  "CAIXA_ECONOMICA_FEDERAL",
  "BANCO_DO_NORDESTE",
  "BANCO_DA_AMAZONIA",
  "BRB",
  "BANRISUL",
  "BANESTES",
  "ITAU_UNIBANCO",
  "BRADESCO",
  "SANTANDER",
  "SAFRA",
  "BTG_PACTUAL",
  "NUBANK",
  "BANCO_INTER",
  "C6_BANK",
  "BANCO_PAN",
  "BANCO_BMG",
  "BANCO_BV",
  "AGIBANK",
  "BANCO_DIGIMAIS",
  "BANCO_DAYCOVAL",
  "BANCO_TOPAZIO",
  "BANCO_RENDIMENTO",
  "BANCO_PINE",
  "BANCO_ABC_BRASIL",
  "CORA",
  "PICPAY",
  "MERCADO_PAGO",
  "PAGBANK",
  "NEON",
  "SICOOB",
  "SICREDI",
  "CRESOL",
  "UNICRED",
  "AILOS",
  "BANCO_MODAL",
  "BANCO_RABOBANK",
  "BANCO_MERCANTIL_DO_BRASIL",
  "BANCO_INDUSTRIAL_DO_BRASIL",
  "BANCO_RIBEIRAO_PRETO",
  "BANCO_SOFISA",
  "BANCO_FIBRA",
  "BANCO_CREFISA",
  "CITIBANK",
  "JPMORGAN",
  "BNP_PARIBAS",
  "DEUTSCHE_BANK",
  "GOLDMAN_SACHS",
  "MORGAN_STANLEY",
  "MUFG_BANK",
  "OUTRO",
] as const;

export type NomeBanco = (typeof nomeBancoValues)[number];

export interface ContaBancariaData {
  id: string;
  nomeConta: string;
  agencia: string;
  numeroConta: string;
  nomeBanco: NomeBanco | "";
  statusContaBancaria: StatusContaBancaria | "";
  tipoContaBancaria: TipoContaBancaria | "";
  organizacaoId: string;
}

export interface ContaBancariaPayload {
  nomeConta: string;
  agencia: string;
  numeroConta: string;
  nomeBanco: NomeBanco;
  statusContaBancaria: StatusContaBancaria;
  tipoContaBancaria: TipoContaBancaria;
  organizacaoId?: number;
}

const bancoLabels: Record<NomeBanco, string> = {
  BANCO_DO_BRASIL: "Banco do Brasil",
  CAIXA_ECONOMICA_FEDERAL: "Caixa Econômica Federal",
  BANCO_DO_NORDESTE: "Banco do Nordeste",
  BANCO_DA_AMAZONIA: "Banco da Amazônia",
  BRB: "BRB",
  BANRISUL: "Banrisul",
  BANESTES: "Banestes",
  ITAU_UNIBANCO: "Itaú Unibanco",
  BRADESCO: "Bradesco",
  SANTANDER: "Santander",
  SAFRA: "Safra",
  BTG_PACTUAL: "BTG Pactual",
  NUBANK: "Nubank",
  BANCO_INTER: "Banco Inter",
  C6_BANK: "C6 Bank",
  BANCO_PAN: "Banco Pan",
  BANCO_BMG: "Banco BMG",
  BANCO_BV: "Banco BV",
  AGIBANK: "Agibank",
  BANCO_DIGIMAIS: "Banco Digimais",
  BANCO_DAYCOVAL: "Banco Daycoval",
  BANCO_TOPAZIO: "Banco Topázio",
  BANCO_RENDIMENTO: "Banco Rendimento",
  BANCO_PINE: "Banco Pine",
  BANCO_ABC_BRASIL: "Banco ABC Brasil",
  CORA: "Cora",
  PICPAY: "PicPay",
  MERCADO_PAGO: "Mercado Pago",
  PAGBANK: "PagBank",
  NEON: "Neon",
  SICOOB: "Sicoob",
  SICREDI: "Sicredi",
  CRESOL: "Cresol",
  UNICRED: "Unicred",
  AILOS: "Ailos",
  BANCO_MODAL: "Banco Modal",
  BANCO_RABOBANK: "Banco Rabobank",
  BANCO_MERCANTIL_DO_BRASIL: "Banco Mercantil do Brasil",
  BANCO_INDUSTRIAL_DO_BRASIL: "Banco Industrial do Brasil",
  BANCO_RIBEIRAO_PRETO: "Banco Ribeirão Preto",
  BANCO_SOFISA: "Banco Sofisa",
  BANCO_FIBRA: "Banco Fibra",
  BANCO_CREFISA: "Banco Crefisa",
  CITIBANK: "Citibank",
  JPMORGAN: "JPMorgan",
  BNP_PARIBAS: "BNP Paribas",
  DEUTSCHE_BANK: "Deutsche Bank",
  GOLDMAN_SACHS: "Goldman Sachs",
  MORGAN_STANLEY: "Morgan Stanley",
  MUFG_BANK: "MUFG Bank",
  OUTRO: "Outro",
};

export const nomeBancoOptions = sortOptionsByLabel(
  nomeBancoValues.map((value) => ({ value, label: bancoLabels[value] })),
);
export const statusContaBancariaOptions = [
  { value: "ATIVO", label: "Ativa" },
  { value: "INATIVO", label: "Inativa" },
] as const;
export const tipoContaBancariaOptions = [
  { value: "CORRENTE", label: "Conta corrente" },
  { value: "POUPANCA", label: "Conta poupança" },
] as const;
export const nomeBancoLabel = (value?: string) =>
  nomeBancoOptions.find((item) => item.value === value)?.label ?? value ?? "—";
export const statusContaBancariaLabel = (value?: string) =>
  statusContaBancariaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";
export const tipoContaBancariaLabel = (value?: string) =>
  tipoContaBancariaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export function createEmptyContaBancaria(): ContaBancariaData {
  return {
    id: "",
    nomeConta: "",
    agencia: "",
    numeroConta: "",
    nomeBanco: "",
    statusContaBancaria: "",
    tipoContaBancaria: "",
    organizacaoId: "",
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  if (!text) return `Erro ${response.status}`;
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message ?? json.error ?? text;
  } catch {
    return text;
  }
}

function mapConta(
  dto: Partial<ContaBancariaData> & {
    id?: string | number;
    organizacaoId?: string | number;
  },
): ContaBancariaData {
  return {
    ...createEmptyContaBancaria(),
    ...dto,
    id: dto.id == null ? "" : String(dto.id),
    agencia: maskBankAgency(dto.agencia ?? ""),
    numeroConta: maskBankAccount(dto.numeroConta ?? ""),
    organizacaoId: dto.organizacaoId == null ? "" : String(dto.organizacaoId),
  } as ContaBancariaData;
}

export function buildContaBancariaPayload(
  conta: ContaBancariaData,
): ContaBancariaPayload {
  return {
    nomeConta: conta.nomeConta.trim(),
    agencia: conta.agencia.trim(),
    numeroConta: conta.numeroConta.trim(),
    nomeBanco: conta.nomeBanco as NomeBanco,
    statusContaBancaria: conta.statusContaBancaria as StatusContaBancaria,
    tipoContaBancaria: conta.tipoContaBancaria as TipoContaBancaria,
    ...(conta.organizacaoId
      ? { organizacaoId: Number(conta.organizacaoId) }
      : {}),
  };
}

async function request(path = "", init?: RequestInit) {
  const response = await fetch(`${API_URL}/contas-bancarias${path}`, {
    ...init,
    cache: "no-store",
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response;
}

export async function getContasBancarias() {
  const response = await request();
  return ((await response.json()) as ContaBancariaData[]).map(mapConta);
}
export async function getContaBancaria(id: string | number) {
  const response = await request(`/${id}`);
  return mapConta(await response.json());
}
export async function createContaBancaria(payload: ContaBancariaPayload) {
  const response = await request("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const conta = mapConta(await response.json());
  invalidateFinancialData("conta-bancaria");
  return conta;
}
export async function updateContaBancaria(
  id: string | number,
  payload: ContaBancariaPayload,
) {
  const response = await request(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const conta = mapConta(await response.json());
  invalidateFinancialData("conta-bancaria");
  return conta;
}
export async function deleteContaBancaria(id: string | number) {
  await request(`/${id}`, { method: "DELETE" });
  invalidateFinancialData("conta-bancaria");
}

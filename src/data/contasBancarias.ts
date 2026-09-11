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
  "BANCO_BS2",
  "BANCO_ORIGINAL",
  "BANCO_MASTER",
  "BANCO_BARI",
  "PARANA_BANCO",
  "BANCO_RODOBENS",
  "BANCO_AFINZ",
  "BANCO_BRADESCARD",
  "BANCO_SENFF",
  "BANCO_CEDULA",
  "BANCO_PAULISTA",
  "BANCO_GUANABARA",
  "BANCO_SEMEAR",
  "BANCO_INBURSA",
  "BANCO_LUSO_BRASILEIRO",
  "BANCO_ARBI",
  "BANCO_MAXIMA",
  "BANCO_CLASSICO",
  "BANCO_CAPITAL",
  "BANCO_LA_NACION_ARGENTINA",
  "BANCO_PROVINCIA_DE_BUENOS_AIRES",
  "BANCO_REPUBLICA_ORIENTAL_DEL_URUGUAI",
  "BANCO_TRAVELEX",
  "BANCO_CONFIDENCE",
  "OURIBANK",
  "BANCO_WESTERN_UNION",
  "EBURY_BANCO_DE_CAMBIO",
  "BANK_OF_AMERICA",
  "MERRILL_LYNCH",
  "MIZUHO_BANK",
  "SOCIETE_GENERALE",
  "HSBC",
  "NOVE_NOVE_PAY",
  "NATIXIS",
  "CREDIT_SUISSE",
  "UBS",
  "BANCO_SUMITOMO_MITSUI_BRASILEIRO",
  "ASAAS",
  "STONE",
  "SUMUP",
  "RECARGAPAY",
  "INFINITEPAY",
  "CLOUDWALK",
  "AME_DIGITAL",
  "MAGALUPAY",
  "CLARO_PAY",
  "IUGU",
  "CELCOIN",
  "ZOOP",
  "DOCK",
  "BMP",
  "QI_TECH",
  "STARK_BANK",
  "NEXT",
  "WILL_BANK",
  "BANCO_NEON",
  "SUPERDIGITAL",
  "BANQI",
  "DIGIO",
  "DM",
  "CARUANA",
  "FITBANK",
  "XP",
  "GENIAL_INVESTIMENTOS",
  "UNIPRIME",
  "CREHNOR",
  "COOPERFORTE",
  "NU_FINANCEIRA",
  "CREDITAS",
  "GERU",
  "SIMPLIC",
  "PORTOCRED",
  "FACTA",
  "LECCA",
  "PARATI",
  "ZEMA_CREDITO",
  "MIDWAY",
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
  BANCO_BS2: "Banco BS2",
  BANCO_ORIGINAL: "Banco Original",
  BANCO_MASTER: "Banco Master",
  BANCO_BARI: "Banco Bari",
  PARANA_BANCO: "Paraná Banco",
  BANCO_RODOBENS: "Banco Rodobens",
  BANCO_AFINZ: "Banco Afinz",
  BANCO_BRADESCARD: "Banco Bradescard",
  BANCO_SENFF: "Banco Senff",
  BANCO_CEDULA: "Banco Cédula",
  BANCO_PAULISTA: "Banco Paulista",
  BANCO_GUANABARA: "Banco Guanabara",
  BANCO_SEMEAR: "Banco Semear",
  BANCO_INBURSA: "Banco Inbursa",
  BANCO_LUSO_BRASILEIRO: "Banco Luso Brasileiro",
  BANCO_ARBI: "Banco Arbi",
  BANCO_MAXIMA: "Banco Máxima",
  BANCO_CLASSICO: "Banco Clássico",
  BANCO_CAPITAL: "Banco Capital",
  BANCO_LA_NACION_ARGENTINA: "Banco de la Nación Argentina",
  BANCO_PROVINCIA_DE_BUENOS_AIRES: "Banco de la Provincia de Buenos Aires",
  BANCO_REPUBLICA_ORIENTAL_DEL_URUGUAI: "Banco República Oriental del Uruguay",
  BANCO_TRAVELEX: "Banco Travelex",
  BANCO_CONFIDENCE: "Banco Confidence",
  OURIBANK: "Ouribank",
  BANCO_WESTERN_UNION: "Banco Western Union",
  EBURY_BANCO_DE_CAMBIO: "Ebury Banco de Câmbio",
  BANK_OF_AMERICA: "Bank of America",
  MERRILL_LYNCH: "Merrill Lynch",
  MIZUHO_BANK: "Mizuho Bank",
  SOCIETE_GENERALE: "Société Générale",
  HSBC: "HSBC",
  NOVE_NOVE_PAY: "99Pay",
  NATIXIS: "Natixis",
  CREDIT_SUISSE: "Credit Suisse",
  UBS: "UBS",
  BANCO_SUMITOMO_MITSUI_BRASILEIRO: "Banco Sumitomo Mitsui Brasileiro",
  ASAAS: "Asaas",
  STONE: "Stone",
  SUMUP: "SumUp",
  RECARGAPAY: "RecargaPay",
  INFINITEPAY: "InfinitePay",
  CLOUDWALK: "CloudWalk",
  AME_DIGITAL: "Ame Digital",
  MAGALUPAY: "MagaluPay",
  CLARO_PAY: "Claro Pay",
  IUGU: "Iugu",
  CELCOIN: "Celcoin",
  ZOOP: "Zoop",
  DOCK: "Dock",
  BMP: "BMP",
  QI_TECH: "QI Tech",
  STARK_BANK: "Stark Bank",
  NEXT: "Next",
  WILL_BANK: "Will Bank",
  BANCO_NEON: "Banco Neon",
  SUPERDIGITAL: "Superdigital",
  BANQI: "BanQi",
  DIGIO: "Digio",
  DM: "DM",
  CARUANA: "Caruana",
  FITBANK: "Fitbank",
  XP: "XP",
  GENIAL_INVESTIMENTOS: "Genial Investimentos",
  UNIPRIME: "Uniprime",
  CREHNOR: "Crehnor",
  COOPERFORTE: "Cooperforte",
  NU_FINANCEIRA: "Nu Financeira",
  CREDITAS: "Creditas",
  GERU: "Geru",
  SIMPLIC: "Simplic",
  PORTOCRED: "Portocred",
  FACTA: "Facta",
  LECCA: "Lecca",
  PARATI: "Parati",
  ZEMA_CREDITO: "Zema Crédito",
  MIDWAY: "Midway",
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

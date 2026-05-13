import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export const formasPagamento = [
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDITO", label: "Crédito" },
  { value: "DEBITO", label: "Débito" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const aplicacoesFinanceiro = [
  { value: "RECURSOS_HUMANOS", label: "Recursos Humanos" },
  { value: "SERVICO", label: "Serviço" },
  { value: "MATERIAL_CONSUMO", label: "Material de Consumo" },
  { value: "MATERIAL_PERMANENTE", label: "Material Permanente" },
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "INFRAESTRUTURA", label: "Infraestrutura" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "COMUNICACAO", label: "Comunicação" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "LOCACAO", label: "Locação" },
  { value: "TAXA_BANCARIA", label: "Taxa Bancária" },
  { value: "DOACAO", label: "Doação" },
  { value: "OUTROS", label: "Outros" },
] as const;

export const statusFinanceiro = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "LIQUIDADO", label: "Liquidado" },
  { value: "VENCIDO", label: "Vencido" },
] as const;

export const tiposOperacao = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
] as const;

export type TipoOperacaoFinanceira = "ENTRADA" | "SAIDA";

export type FormaPagamento = (typeof formasPagamento)[number]["value"];
export type AplicacaoFinanceiro =
  (typeof aplicacoesFinanceiro)[number]["value"];
export type StatusFinanceiro = (typeof statusFinanceiro)[number]["value"];

export interface FinanceiroDTO {
  id?: number;

  numeroDocumento?: string | null;
  descricao?: string | null;

  dataPagamento?: string | null;
  dataVencimento?: string | null;

  nomePessoa?: string | null;
  cpfCnpj?: string | null;
  cpfCNPJ?: string | null;

  valor: number;
  observacao?: string | null;

  urlComprovante?: string | null;
  removerComprovante?: boolean | null;

  formaPagamento: FormaPagamento | string;
  aplicacaoFinanceiro: AplicacaoFinanceiro | string;
  statusFinanceiro: StatusFinanceiro | string;
  tipoOperacaoFinanceira: TipoOperacaoFinanceira;

  organizacaoId?: number | string | null;
  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;

  projetoId?: number | string | null;
  projeto?: {
    id?: number | string | null;
    nomeProjeto?: string | null;
    nome?: string | null;
  } | null;

  atividadeId?: number | string | null;
  atividade?: {
    id?: number | string | null;
    nomeAtividade?: string | null;
    nome?: string | null;
  } | null;

  colaboradorId?: number | string | null;
  colaborador?: {
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
    cpf?: string | null;
  } | null;

  eventoCulturalId?: number | string | null;
  eventoCultural?: {
    id?: number | string | null;
    nomeEvento?: string | null;
    nome?: string | null;
  } | null;

  acaoDivulgacaoId?: number | string | null;
  acaoDivulgacao?: {
    id?: number | string | null;
    nomeAcao?: string | null;
    nome?: string | null;
  } | null;

  planejamentoFinanceiroId?: number | string | null;
  planejamentoId?: number | string | null;
  planejamentoFinanceiro?: {
    id?: number | string | null;
    nomePlanejamento?: string | null;
    itemPlanejamento?: string | null;
    nome?: string | null;
  } | null;
}

export interface FinanceiroPayloadDTO {
  id?: number;

  numeroDocumento?: string | null;
  descricao?: string | null;

  dataPagamento?: string | null;
  dataVencimento?: string | null;

  nomePessoa?: string | null;
  cpfCnpj?: string | null;

  valor: number;
  observacao?: string | null;

  urlComprovante?: string | null;
  removerComprovante?: boolean | null;

  formaPagamento: string;
  aplicacaoFinanceiro: string;
  statusFinanceiro: string;
  tipoOperacaoFinanceira: TipoOperacaoFinanceira;

  organizacaoId?: number | null;
  projetoId?: number | null;
  atividadeId?: number | null;
  colaboradorId?: number | null;
  eventoCulturalId?: number | null;
  acaoDivulgacaoId?: number | null;
  planejamentoFinanceiroId?: number | null;
}

export interface Financeiro {
  id: string;

  numeroDocumento: string;
  descricao: string;

  dataPagamento: string;
  dataVencimento: string;

  nomePessoa: string;
  cpfCnpj: string;

  valor: number;
  observacao: string;

  urlComprovante: string;

  formaPagamento: string;
  aplicacaoFinanceiro: string;
  statusFinanceiro: string;
  tipoOperacaoFinanceira: TipoOperacaoFinanceira;

  organizacaoId: string;
  projetoId: string;
  atividadeId: string;
  colaboradorId: string;
  eventoCulturalId: string;
  acaoDivulgacaoId: string;
  planejamentoFinanceiroId: string;
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }

    return "";
  }

  return String(value);
}

function normalizeText(value?: string | null): string {
  return value?.trim() ?? "";
}

function normalizeDate(value?: string | null): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return value.length >= 10 ? value.slice(0, 10) : value;
}

function normalizeMoney(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function mapFinanceiro(dto: FinanceiroDTO): Financeiro {
  return {
    id: normalizeId(dto.id),

    numeroDocumento: normalizeText(dto.numeroDocumento),
    descricao: normalizeText(dto.descricao),

    dataPagamento: normalizeDate(dto.dataPagamento),
    dataVencimento: normalizeDate(dto.dataVencimento),

    nomePessoa: normalizeText(dto.nomePessoa),
    cpfCnpj: normalizeText(dto.cpfCnpj ?? dto.cpfCNPJ),

    valor: normalizeMoney(dto.valor),
    observacao: normalizeText(dto.observacao),

    urlComprovante: normalizeText(dto.urlComprovante),

    formaPagamento: normalizeText(String(dto.formaPagamento ?? "")),
    aplicacaoFinanceiro: normalizeText(String(dto.aplicacaoFinanceiro ?? "")),
    statusFinanceiro: normalizeText(String(dto.statusFinanceiro ?? "")),
    tipoOperacaoFinanceira:
      dto.tipoOperacaoFinanceira === "ENTRADA" ? "ENTRADA" : "SAIDA",

    organizacaoId: normalizeId(dto.organizacaoId ?? dto.organizacao),
    projetoId: normalizeId(dto.projetoId ?? dto.projeto),
    atividadeId: normalizeId(dto.atividadeId ?? dto.atividade),
    colaboradorId: normalizeId(dto.colaboradorId ?? dto.colaborador),
    eventoCulturalId: normalizeId(
      dto.eventoCulturalId ?? dto.eventoCultural,
    ),
    acaoDivulgacaoId: normalizeId(
      dto.acaoDivulgacaoId ?? dto.acaoDivulgacao,
    ),
    planejamentoFinanceiroId: normalizeId(
      dto.planejamentoFinanceiroId ??
        dto.planejamentoId ??
        dto.planejamentoFinanceiro,
    ),
  };
}

export function createEmptyFinanceiro(): Financeiro {
  return {
    id: "",

    numeroDocumento: "",
    descricao: "",

    dataPagamento: "",
    dataVencimento: "",

    nomePessoa: "",
    cpfCnpj: "",

    valor: 0,
    observacao: "",

    urlComprovante: "",

    formaPagamento: "",
    aplicacaoFinanceiro: "",
    statusFinanceiro: "",
    tipoOperacaoFinanceira: "SAIDA",

    organizacaoId: "",
    projetoId: "",
    atividadeId: "",
    colaboradorId: "",
    eventoCulturalId: "",
    acaoDivulgacaoId: "",
    planejamentoFinanceiroId: "",
  };
}

export function buildFinanceiroPayload(
  data: Financeiro,
): FinanceiroPayloadDTO {
  return {
    id: data.id ? Number(data.id) : undefined,

    numeroDocumento: data.numeroDocumento.trim() || null,
    descricao: data.descricao.trim() || null,

    dataPagamento: data.dataPagamento || null,
    dataVencimento: data.dataVencimento || null,

    nomePessoa: data.nomePessoa.trim() || null,
    cpfCnpj: data.cpfCnpj.replace(/\D/g, "") || null,

    valor: Number(data.valor || 0),
    observacao: data.observacao.trim() || null,

    urlComprovante: data.urlComprovante.trim() || null,

    formaPagamento: data.formaPagamento,
    aplicacaoFinanceiro: data.aplicacaoFinanceiro,
    statusFinanceiro: data.statusFinanceiro,
    tipoOperacaoFinanceira: data.tipoOperacaoFinanceira,

    organizacaoId: data.organizacaoId ? Number(data.organizacaoId) : null,
    projetoId: data.projetoId ? Number(data.projetoId) : null,
    atividadeId: data.atividadeId ? Number(data.atividadeId) : null,
    colaboradorId: data.colaboradorId ? Number(data.colaboradorId) : null,
    eventoCulturalId: data.eventoCulturalId
      ? Number(data.eventoCulturalId)
      : null,
    acaoDivulgacaoId: data.acaoDivulgacaoId
      ? Number(data.acaoDivulgacaoId)
      : null,
    planejamentoFinanceiroId: data.planejamentoFinanceiroId
      ? Number(data.planejamentoFinanceiroId)
      : null,
  };
}

export async function getFinanceiros(): Promise<Financeiro[]> {
  const response = await fetch(`${API_URL}/financeiros`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: FinanceiroDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapFinanceiro);
}

export async function getFinanceiroById(id: number): Promise<Financeiro> {
  const response = await fetch(`${API_URL}/financeiros/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: FinanceiroDTO = await response.json();

  return mapFinanceiro(data);
}

export async function getFinanceiroComprovanteDownloadUrl(
  id: number | string,
): Promise<string> {
  const response = await fetch(`${API_URL}/financeiros/${id}/download`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const urlTemporaria = await response.text();

  return urlTemporaria.replace(/^"|"$/g, "").trim();
}

export async function createFinanceiro(
  payload: FinanceiroPayloadDTO,
  comprovante?: File | null,
): Promise<Financeiro> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (comprovante) {
    formData.append("comprovante", comprovante);
  }

  const response = await fetch(`${API_URL}/financeiros`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: FinanceiroDTO = await response.json();

  return mapFinanceiro(data);
}

export async function updateFinanceiro(
  id: number,
  payload: FinanceiroPayloadDTO,
  comprovante?: File | null,
): Promise<Financeiro> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (comprovante) {
    formData.append("comprovante", comprovante);
  }

  const response = await fetch(`${API_URL}/financeiros/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: FinanceiroDTO = await response.json();

  return mapFinanceiro(data);
}

export async function deleteFinanceiro(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/financeiros/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export const labelFromList = (
  list: readonly { value: string; label: string }[],
  value?: string,
) => list.find((item) => item.value === value)?.label ?? value ?? "—";

export const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const formatDateBR = (iso?: string) => {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
};

export function buildArquivoUrl(urlArquivo?: string) {
  if (!urlArquivo?.trim()) return "";

  if (/^https?:\/\//i.test(urlArquivo)) {
    return urlArquivo;
  }

  return urlArquivo;
}
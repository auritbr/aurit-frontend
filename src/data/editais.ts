const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

export const esferaEditalOptions = [
  { value: "MUNICIPAL", label: "Municipal" },
  { value: "ESTADUAL", label: "Estadual" },
  { value: "FEDERAL", label: "Federal" },
  { value: "PRIVADO", label: "Privado" },
  { value: "INTERNACIONAL", label: "Internacional" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const statusEditalOptions = [
  { value: "MAPEADO", label: "Mapeado" },
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANALISE", label: "Em Análise" },
  { value: "RESULTADO_PUBLICADO", label: "Resultado Publicado" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "ARQUIVADO", label: "Arquivado" },
] as const;

export type EsferaEdital = (typeof esferaEditalOptions)[number]["value"];
export type StatusEdital = (typeof statusEditalOptions)[number]["value"];

export interface EditalDTO {
  id?: number;

  nomeEdital?: string | null;
  orgaoResponsavel?: string | null;

  anoEdital?: number | null;
  ano?: number | null;

  dataAbertura?: string | null;
  dataEncerramento?: string | null;
  dataSubmissao?: string | null;
  dataResultado?: string | null;

  valorTotalDisponivel?: number | null;

  numeroEdital?: string | null;
  numeroInscricao?: string | null;
  linkEdital?: string | null;

  motivoReprovacao?: string | null;
  observacao?: string | null;

  esferaEdital?: EsferaEdital | null;
  statusEdital?: StatusEdital | null;

  organizacaoId?: number | string | null;
  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;

  agenteId?: number | string | null;
  agente?: {
    id?: number | string | null;
    nome?: string | null;
    nomeCompleto?: string | null;
    nomeFantasia?: string | null;
    razaoSocial?: string | null;
  } | null;

  projetoId?: number | string | null;
  projeto?: {
    id?: number | string | null;
    nomeProjeto?: string | null;
    nome?: string | null;
  } | null;
}

export interface EditalPayloadDTO {
  id?: number;

  nomeEdital: string;
  orgaoResponsavel: string;
  anoEdital: number;

  dataAbertura: string | null;
  dataEncerramento: string | null;
  dataResultado: string | null;

  valorTotalDisponivel: number | null;

  numeroEdital: string | null;
  numeroInscricao: string | null;
  linkEdital: string | null;

  observacao: string | null;

  esferaEdital: EsferaEdital;
  statusEdital: StatusEdital;

  organizacaoId: number;
  agenteId: number;
}

export interface EditalData {
  id: string;

  nomeEdital: string;
  orgaoResponsavel: string;
  anoEdital: string;

  dataAbertura: string;
  dataEncerramento: string;
  dataResultado: string;

  valorTotalDisponivel: string;

  numeroEdital: string;
  numeroInscricao: string;
  linkEdital: string;

  observacao: string;

  esferaEdital: string;
  statusEdital: string;

  organizacaoId: string;
  agenteId: string;
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

export const esferaEditalLabel = (value: string) =>
  esferaEditalOptions.find((item) => item.value === value)?.label ?? value;

export const statusEditalLabel = (value: string) =>
  statusEditalOptions.find((item) => item.value === value)?.label ?? value;

const formatCurrencyInput = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyToNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
};

export function createEmptyEdital(): EditalData {
  return {
    id: "",

    nomeEdital: "",
    orgaoResponsavel: "",
    anoEdital: "",

    dataAbertura: "",
    dataEncerramento: "",
    dataResultado: "",

    valorTotalDisponivel: "",

    numeroEdital: "",
    numeroInscricao: "",
    linkEdital: "",

    observacao: "",

    esferaEdital: "",
    statusEdital: "",

    organizacaoId: "",
    agenteId: "",
  };
}

export function mapEdital(dto: EditalDTO): EditalData {
  const organizacaoId = normalizeId(dto.organizacaoId ?? dto.organizacao);
  const agenteId = normalizeId(dto.agenteId ?? dto.agente);

  return {
    id: String(dto.id ?? ""),

    nomeEdital: normalizeText(dto.nomeEdital),
    orgaoResponsavel: normalizeText(dto.orgaoResponsavel),
    anoEdital:
      dto.anoEdital !== null && dto.anoEdital !== undefined
        ? String(dto.anoEdital)
        : dto.ano !== null && dto.ano !== undefined
          ? String(dto.ano)
          : "",

    dataAbertura: dto.dataAbertura ?? dto.dataSubmissao ?? "",
    dataEncerramento: dto.dataEncerramento ?? "",
    dataResultado: dto.dataResultado ?? "",

    valorTotalDisponivel: formatCurrencyInput(dto.valorTotalDisponivel),

    numeroEdital: normalizeText(dto.numeroEdital),
    numeroInscricao: normalizeText(dto.numeroInscricao),
    linkEdital: normalizeText(dto.linkEdital),

    observacao: normalizeText(dto.observacao),

    esferaEdital: dto.esferaEdital ?? "",
    statusEdital: dto.statusEdital ?? "",

    organizacaoId,
    agenteId,
  };
}

export function buildEditalPayload(data: EditalData): EditalPayloadDTO {
  return {
    id: data.id ? Number(data.id) : undefined,

    nomeEdital: data.nomeEdital.trim(),
    orgaoResponsavel: data.orgaoResponsavel.trim(),
    anoEdital: Number(data.anoEdital),

    dataAbertura: data.dataAbertura || null,
    dataEncerramento: data.dataEncerramento || null,
    dataResultado: data.dataResultado || null,

    valorTotalDisponivel: parseCurrencyToNumber(data.valorTotalDisponivel),

    numeroEdital: data.numeroEdital.trim() || null,
    numeroInscricao: data.numeroInscricao.trim() || null,
    linkEdital: data.linkEdital.trim() || null,

    observacao: data.observacao.trim() || null,

    esferaEdital: data.esferaEdital as EsferaEdital,
    statusEdital: data.statusEdital as StatusEdital,

    organizacaoId: Number(data.organizacaoId),
    agenteId: Number(data.agenteId),
  };
}

export async function getEditais(): Promise<EditalData[]> {
  const response = await fetch(`${API_URL}/editais`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EditalDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapEdital);
}

export async function getEditalById(id: number): Promise<EditalData> {
  const response = await fetch(`${API_URL}/editais/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EditalDTO = await response.json();

  return mapEdital(data);
}

export async function createEdital(
  payload: EditalPayloadDTO,
): Promise<EditalData> {
  const response = await fetch(`${API_URL}/editais`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EditalDTO = await response.json();

  return mapEdital(data);
}

export async function updateEdital(
  id: number,
  payload: EditalPayloadDTO,
): Promise<EditalData> {
  const response = await fetch(`${API_URL}/editais/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EditalDTO = await response.json();

  return mapEdital(data);
}

export async function deleteEdital(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/editais/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
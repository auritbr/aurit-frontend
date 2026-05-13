const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type IntegranteStatusApi =
  | "ATIVO"
  | "INATIVO"
  | "PENDENTE"
  | "CONCLUIDO";

export type IntegranteStatusLabel =
  | "Ativo"
  | "Inativo"
  | "Pendente"
  | "Concluído";

export interface IntegranteDTO {
  id?: number | string;
  nomeCompleto?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  funcaoIntegrante?: string | null;
  dataEntrada?: string | null;
  dataSaida?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  status?: IntegranteStatusApi | string | null;
  organizacaoId?: number | string | null;
  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;
}

export interface Integrante {
  id: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;

  funcaoIntegrante: string;
  dataEntrada: string;
  dataSaida: string;

  cep: string;
  logradouro: string;
  numero: number | "";
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  status: IntegranteStatusApi;
  organizacaoId: number | "";
}

export interface OrganizacaoOption {
  id: number;
  nomeOrganizacao: string;
}

interface OrganizacaoApiDTO {
  id?: number | string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
  cnpj?: string | null;
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

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

function normalizeStatus(value?: string | null): IntegranteStatusApi {
  const allowed: IntegranteStatusApi[] = [
    "ATIVO",
    "INATIVO",
    "PENDENTE",
    "CONCLUIDO",
  ];

  return allowed.includes(value as IntegranteStatusApi)
    ? (value as IntegranteStatusApi)
    : "ATIVO";
}

export function statusValueToLabel(
  status: IntegranteStatusApi | string,
): IntegranteStatusLabel {
  const map: Record<IntegranteStatusApi, IntegranteStatusLabel> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[status as IntegranteStatusApi] ?? "Ativo";
}

export function mapIntegrante(dto: IntegranteDTO): Integrante {
  const organizacaoId = normalizeId(dto.organizacaoId ?? dto.organizacao);

  return {
    id: Number(dto.id ?? 0),
    nomeCompleto: normalizeText(dto.nomeCompleto),
    dataNascimento: normalizeText(dto.dataNascimento),
    cpf: normalizeText(dto.cpf),
    rg: normalizeText(dto.rg),
    telefone: normalizeText(dto.telefone),
    email: normalizeText(dto.email),

    funcaoIntegrante: normalizeText(dto.funcaoIntegrante),
    dataEntrada: normalizeText(dto.dataEntrada),
    dataSaida: normalizeText(dto.dataSaida),

    cep: normalizeText(dto.cep),
    logradouro: normalizeText(dto.logradouro),
    numero: dto.numero != null ? Number(dto.numero) : "",
    complemento: normalizeText(dto.complemento),
    bairro: normalizeText(dto.bairro),
    cidade: normalizeText(dto.cidade),
    estado: normalizeText(dto.estado),

    status: normalizeStatus(dto.status),
    organizacaoId: organizacaoId ? Number(organizacaoId) : "",
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

export async function getOrganizacoes(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((org) => org.id !== null && org.id !== undefined)
    .map((org) => ({
      id: Number(org.id),
      nomeOrganizacao:
        org.razaoSocial?.trim() ||
        org.nomeFantasia?.trim() ||
        org.nomeOrganizacao?.trim() ||
        org.nome?.trim() ||
        `Organização ${org.id}`,
    }))
    .filter((org) => Number.isFinite(org.id));
}

export async function getIntegrantes(): Promise<Integrante[]> {
  const response = await fetch(`${API_URL}/integrantes`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: IntegranteDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapIntegrante);
}

export async function getIntegranteById(id: number): Promise<Integrante> {
  const response = await fetch(`${API_URL}/integrantes/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: IntegranteDTO = await response.json();

  return mapIntegrante(data);
}

export async function createIntegrante(
  payload: IntegranteDTO,
): Promise<Integrante> {
  const response = await fetch(`${API_URL}/integrantes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: IntegranteDTO = await response.json();

  return mapIntegrante(data);
}

export async function updateIntegrante(
  id: number,
  payload: IntegranteDTO,
): Promise<Integrante> {
  const response = await fetch(`${API_URL}/integrantes/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: IntegranteDTO = await response.json();

  return mapIntegrante(data);
}

export async function deleteIntegrante(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/integrantes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
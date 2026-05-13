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
    return text || `Erro ${response.status} ao processar requisição.`;
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export const cargosDiretoria = [
  { value: "PRESIDENTE", label: "Presidente" },
  { value: "VICE_PRESIDENTE", label: "Vice-Presidente" },
  { value: "SECRETARIO", label: "Secretário" },
  { value: "VICE_SECRETARIO", label: "Vice-Secretário" },
  { value: "TESOUREIRO", label: "Tesoureiro" },
  { value: "VICE_TESOUREIRO", label: "Vice-Tesoureiro" },
  { value: "CONSELHEIRO", label: "Conselheiro" },
  { value: "DIRETOR_GERAL", label: "Diretor Geral" },
  { value: "DIRETOR_ADMINISTRATIVO", label: "Diretor Administrativo" },
  { value: "DIRETOR_FINANCEIRO", label: "Diretor Financeiro" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const statusDiretoriaOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "AFASTADO", label: "Afastado" },
  { value: "INATIVO", label: "Inativo" },
] as const;

export type CargoDiretoria = (typeof cargosDiretoria)[number]["value"];
export type StatusDiretoria = (typeof statusDiretoriaOptions)[number]["value"];

export interface DiretoriaDTO {
  id?: number;

  nomeCompleto?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  cargoDiretoria?: CargoDiretoria | string | null;
  dataInicioMandato?: string | null;
  dataFimMandato?: string | null;
  dataAfastamento?: string | null;
  observacao?: string | null;
  statusDiretoria?: StatusDiretoria | string | null;

  organizacaoId?: number | null;
}

export interface DiretoriaData {
  id: string;

  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;

  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  cargoDiretoria: string;
  dataInicioMandato: string;
  dataFimMandato: string;
  dataAfastamento: string;
  observacao: string;
  statusDiretoria: string;

  organizacaoId: string;
}

export interface OrganizacaoDiretoriaOption {
  id: string;
  nome: string;
}

interface OrganizacaoApiDTO {
  id?: number | string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function toIdString(value?: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

export const cargoDiretoriaLabel = (value?: string) =>
  cargosDiretoria.find((item) => item.value === value)?.label ?? value ?? "—";

export const statusDiretoriaLabel = (value?: string) =>
  statusDiretoriaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export function formatDateBR(value?: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function createEmptyDiretoria(): DiretoriaData {
  return {
    id: "",

    nomeCompleto: "",
    dataNascimento: "",
    cpf: "",
    rg: "",
    telefone: "",
    email: "",

    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",

    cargoDiretoria: "",
    dataInicioMandato: "",
    dataFimMandato: "",
    dataAfastamento: "",
    observacao: "",
    statusDiretoria: "",

    organizacaoId: "",
  };
}

export function mapDiretoria(dto: DiretoriaDTO): DiretoriaData {
  return {
    id: toIdString(dto.id),

    nomeCompleto: dto.nomeCompleto ?? "",
    dataNascimento: dto.dataNascimento ?? "",
    cpf: dto.cpf ?? "",
    rg: dto.rg ?? "",
    telefone: dto.telefone ?? "",
    email: dto.email ?? "",

    cep: dto.cep ?? "",
    logradouro: dto.logradouro ?? "",
    numero: dto.numero != null ? String(dto.numero) : "",
    complemento: dto.complemento ?? "",
    bairro: dto.bairro ?? "",
    cidade: dto.cidade ?? "",
    estado: dto.estado ?? "",

    cargoDiretoria: dto.cargoDiretoria ?? "",
    dataInicioMandato: dto.dataInicioMandato ?? "",
    dataFimMandato: dto.dataFimMandato ?? "",
    dataAfastamento: dto.dataAfastamento ?? "",
    observacao: dto.observacao ?? "",
    statusDiretoria: dto.statusDiretoria ?? "",

    organizacaoId: toIdString(dto.organizacaoId),
  };
}

export function buildDiretoriaPayload(form: DiretoriaData): DiretoriaDTO {
  return {
    id: form.id ? Number(form.id) : undefined,

    nomeCompleto: form.nomeCompleto.trim(),
    dataNascimento: form.dataNascimento || null,
    cpf: onlyDigits(form.cpf),
    rg: form.rg.trim() || null,
    telefone: form.telefone.trim(),
    email: form.email.trim() || null,

    cep: onlyDigits(form.cep),
    logradouro: form.logradouro.trim(),
    numero: form.numero.trim() ? Number(form.numero) : null,
    complemento: form.complemento.trim() || null,
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado.trim(),

    cargoDiretoria: form.cargoDiretoria,
    dataInicioMandato: form.dataInicioMandato || null,
    dataFimMandato: form.dataFimMandato || null,
    dataAfastamento: form.dataAfastamento || null,
    observacao: form.observacao.trim() || null,
    statusDiretoria: form.statusDiretoria,

    organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
  };
}

export async function getDiretorias(): Promise<DiretoriaData[]> {
  const response = await fetch(`${API_URL}/diretorias`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DiretoriaDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapDiretoria);
}

export async function getDiretoriaById(id: number): Promise<DiretoriaData> {
  const response = await fetch(`${API_URL}/diretorias/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DiretoriaDTO = await response.json();

  return mapDiretoria(data);
}

export async function createDiretoria(
  payload: DiretoriaDTO,
): Promise<DiretoriaData> {
  const response = await fetch(`${API_URL}/diretorias`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DiretoriaDTO = await response.json();

  return mapDiretoria(data);
}

export async function updateDiretoria(
  id: number,
  payload: DiretoriaDTO,
): Promise<DiretoriaData> {
  const response = await fetch(`${API_URL}/diretorias/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DiretoriaDTO = await response.json();

  return mapDiretoria(data);
}

export async function deleteDiretoria(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/diretorias/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoesDiretoria(): Promise<
  OrganizacaoDiretoriaOption[]
> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => ({
      id: String(item.id),
      nome:
        pickText(
          item.razaoSocial,
          item.nomeFantasia,
          item.nomeOrganizacao,
          item.nome,
        ) || `Organização ${item.id}`,
    }));
}
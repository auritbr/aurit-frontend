import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      if (typeof json === "string") {
        return json;
      }

      if (json.message) {
        return json.message;
      }

      if (json.error) {
        return json.error;
      }

      return text;
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export const estadosBrasil = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
];

export const statusColaboradorOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const tipoVinculoOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa Física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa Jurídica" },
  { value: "MEI", label: "MEI" },
  { value: "VOLUNTARIO", label: "Voluntário" },
] as const;

export type ColaboradorStatusApi =
  (typeof statusColaboradorOptions)[number]["value"];

export type TipoVinculoApi = (typeof tipoVinculoOptions)[number]["value"];

export interface ColaboradorDTO {
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

  dataInicioVinculo?: string | null;
  dataFimVinculo?: string | null;
  funcaoColaborador?: string | null;
  status?: ColaboradorStatusApi | string | null;
  tipoVinculo?: TipoVinculoApi | string | null;
  cargaHorariaSemanal?: number | null;
  descricaoAtuacao?: string | null;

  organizacaoId?: number | string | null;
  organizacao?: { id?: number | string | null } | number | string | null;
  projetosIds?: Array<number | string> | null;
  projetoIds?: Array<number | string> | null;
  projetos?: Array<{ id?: number | string | null } | number | string> | null;
}

export interface Colaborador {
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

  dataInicioVinculo: string;
  dataFimVinculo: string;
  funcaoColaborador: string;
  status: string;
  tipoVinculo: string;
  cargaHorariaSemanal: string;
  descricaoAtuacao: string;

  organizacaoId: string;
  projetosIds: string[];
}

export interface OrganizacaoOption {
  id: string;
  nomeOrganizacao: string;
}

interface OrganizacaoApiDTO {
  id?: number | string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
  cnpj?: string | null;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function toIdString(value?: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }

    if (record.value !== null && record.value !== undefined) {
      return String(record.value);
    }

    return "";
  }

  return String(value);
}

function normalizeIdsList(value?: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map(toIdString).filter(Boolean);
}

export type StatusLabel = "Ativo" | "Inativo" | "Pendente" | "Concluído";

export function statusValueToLabel(status?: string): StatusLabel {
  const map: Record<string, StatusLabel> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[status ?? ""] ?? "Pendente";
}

export type TipoVinculoLabel =
  | "Pessoa Física"
  | "Pessoa Jurídica"
  | "MEI"
  | "Voluntário";

export function tipoVinculoValueToLabel(
  tipo?: string,
): TipoVinculoLabel | string {
  const map: Record<string, TipoVinculoLabel> = {
    PESSOA_FISICA: "Pessoa Física",
    PESSOA_JURIDICA: "Pessoa Jurídica",
    MEI: "MEI",
    VOLUNTARIO: "Voluntário",
  };

  return map[tipo ?? ""] ?? tipo ?? "—";
}

export function formatDateBR(value?: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function mapColaborador(dto: ColaboradorDTO): Colaborador {
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

    dataInicioVinculo: dto.dataInicioVinculo ?? "",
    dataFimVinculo: dto.dataFimVinculo ?? "",
    funcaoColaborador: dto.funcaoColaborador ?? "",
    status: dto.status ?? "",
    tipoVinculo: dto.tipoVinculo ?? "",
    cargaHorariaSemanal:
      dto.cargaHorariaSemanal != null ? String(dto.cargaHorariaSemanal) : "",
    descricaoAtuacao: dto.descricaoAtuacao ?? "",

    organizacaoId: toIdString(dto.organizacaoId ?? dto.organizacao),
    projetosIds: normalizeIdsList(
      dto.projetosIds ?? dto.projetoIds ?? dto.projetos ?? [],
    ),
  };
}

export function buildColaboradorPayload(form: Colaborador): ColaboradorDTO {
  return {
    id: form.id ? Number(form.id) : undefined,

    nomeCompleto: form.nomeCompleto.trim(),
    dataNascimento: form.dataNascimento || null,
    cpf: form.cpf.replace(/\D/g, ""),
    rg: form.rg.trim() || null,
    telefone: form.telefone.trim(),
    email: form.email.trim() || null,

    cep: form.cep.replace(/\D/g, ""),
    logradouro: form.logradouro.trim(),
    numero: form.numero.trim() ? Number(form.numero) : null,
    complemento: form.complemento.trim() || null,
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado.trim(),

    dataInicioVinculo: form.dataInicioVinculo || null,
    dataFimVinculo: form.dataFimVinculo || null,
    funcaoColaborador: form.funcaoColaborador.trim(),
    status: form.status,
    tipoVinculo: form.tipoVinculo,
    cargaHorariaSemanal: form.cargaHorariaSemanal
      ? Number(form.cargaHorariaSemanal)
      : null,
    descricaoAtuacao: form.descricaoAtuacao.trim(),

    organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
    projetosIds: (form.projetosIds ?? [])
      .filter(
        (id) => id !== null && id !== undefined && String(id).trim() !== "",
      )
      .map(Number),
  };
}

export function createEmptyColaborador(): Colaborador {
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

    dataInicioVinculo: "",
    dataFimVinculo: "",
    funcaoColaborador: "",
    status: "",
    tipoVinculo: "",
    cargaHorariaSemanal: "",
    descricaoAtuacao: "",

    organizacaoId: "",
    projetosIds: [],
  };
}

export async function getOrganizacoes(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((org) => org.id !== null && org.id !== undefined)
    .map((org) => ({
      id: String(org.id),
      nomeOrganizacao:
        pickText(
          org.razaoSocial,
          org.nomeFantasia,
          org.nomeOrganizacao,
          org.nome,
        ) || `Organização ${org.id}`,
    }));
}

export async function getColaboradores(): Promise<Colaborador[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapColaborador);
}

export async function getColaboradorById(id: number): Promise<Colaborador> {
  const response = await fetch(`${API_URL}/colaboradores/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorDTO = await response.json();

  return mapColaborador(data);
}

export async function createColaborador(
  payload: ColaboradorDTO,
): Promise<Colaborador> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorDTO = await response.json();

  return mapColaborador(data);
}

export async function updateColaborador(
  id: number,
  payload: ColaboradorDTO,
): Promise<Colaborador> {
  const response = await fetch(`${API_URL}/colaboradores/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorDTO = await response.json();

  return mapColaborador(data);
}

export async function deleteColaborador(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/colaboradores/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

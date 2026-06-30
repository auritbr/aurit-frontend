import { getJsonHeaders } from "@/lib/apiHeaders";

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

export const cargosDiretoria = [
  { value: "PRESIDENTE", label: "Presidente" },
  { value: "VICE_PRESIDENTE", label: "Vice-presidente" },

  { value: "SECRETARIO", label: "Secretário" },
  { value: "VICE_SECRETARIO", label: "Vice-secretário" },
  { value: "PRIMEIRO_SECRETARIO", label: "Primeiro secretário" },
  { value: "SEGUNDO_SECRETARIO", label: "Segundo secretário" },

  { value: "TESOUREIRO", label: "Tesoureiro" },
  { value: "VICE_TESOUREIRO", label: "Vice-tesoureiro" },
  { value: "PRIMEIRO_TESOUREIRO", label: "Primeiro tesoureiro" },
  { value: "SEGUNDO_TESOUREIRO", label: "Segundo tesoureiro" },

  { value: "CONSELHEIRO", label: "Conselheiro" },
  { value: "CONSELHEIRO_FISCAL", label: "Conselheiro fiscal" },
  {
    value: "CONSELHEIRO_FISCAL_TITULAR",
    label: "Conselheiro fiscal titular",
  },
  {
    value: "CONSELHEIRO_FISCAL_SUPLENTE",
    label: "Conselheiro fiscal suplente",
  },
  {
    value: "PRESIDENTE_CONSELHO_FISCAL",
    label: "Presidente do conselho fiscal",
  },
  { value: "MEMBRO_CONSELHO_FISCAL", label: "Membro do conselho fiscal" },

  { value: "CONSELHEIRO_CONSULTIVO", label: "Conselheiro consultivo" },
  {
    value: "PRESIDENTE_CONSELHO_CONSULTIVO",
    label: "Presidente do conselho consultivo",
  },
  {
    value: "MEMBRO_CONSELHO_CONSULTIVO",
    label: "Membro do conselho consultivo",
  },

  { value: "DIRETOR_GERAL", label: "Diretor geral" },
  { value: "DIRETOR_EXECUTIVO", label: "Diretor executivo" },
  { value: "DIRETOR_ADMINISTRATIVO", label: "Diretor administrativo" },
  { value: "DIRETOR_FINANCEIRO", label: "Diretor financeiro" },
  { value: "DIRETOR_JURIDICO", label: "Diretor jurídico" },
  { value: "DIRETOR_CULTURAL", label: "Diretor cultural" },
  { value: "DIRETOR_ARTISTICO", label: "Diretor artístico" },
  { value: "DIRETOR_SOCIAL", label: "Diretor social" },
  { value: "DIRETOR_DE_PROJETOS", label: "Diretor de projetos" },
  { value: "DIRETOR_DE_COMUNICACAO", label: "Diretor de comunicação" },
  { value: "DIRETOR_DE_MARKETING", label: "Diretor de marketing" },
  { value: "DIRETOR_DE_EVENTOS", label: "Diretor de eventos" },
  { value: "DIRETOR_DE_PATRIMONIO", label: "Diretor de patrimônio" },
  {
    value: "DIRETOR_DE_RELACOES_INSTITUCIONAIS",
    label: "Diretor de relações institucionais",
  },
  {
    value: "DIRETOR_DE_CAPTACAO_DE_RECURSOS",
    label: "Diretor de captação de recursos",
  },
  { value: "DIRETOR_DE_FORMACAO", label: "Diretor de formação" },
  { value: "DIRETOR_PEDAGOGICO", label: "Diretor pedagógico" },
  { value: "DIRETOR_TECNICO", label: "Diretor técnico" },

  { value: "COORDENADOR_GERAL", label: "Coordenador geral" },
  { value: "COORDENADOR_EXECUTIVO", label: "Coordenador executivo" },
  { value: "COORDENADOR_ADMINISTRATIVO", label: "Coordenador administrativo" },
  { value: "COORDENADOR_FINANCEIRO", label: "Coordenador financeiro" },
  { value: "COORDENADOR_CULTURAL", label: "Coordenador cultural" },
  { value: "COORDENADOR_ARTISTICO", label: "Coordenador artístico" },
  { value: "COORDENADOR_DE_PROJETOS", label: "Coordenador de projetos" },
  { value: "COORDENADOR_DE_COMUNICACAO", label: "Coordenador de comunicação" },
  { value: "COORDENADOR_DE_EVENTOS", label: "Coordenador de eventos" },
  { value: "COORDENADOR_PEDAGOGICO", label: "Coordenador pedagógico" },
  { value: "COORDENADOR_TECNICO", label: "Coordenador técnico" },

  { value: "REPRESENTANTE_LEGAL", label: "Representante legal" },
  { value: "PROCURADOR", label: "Procurador" },
  { value: "FUNDADOR", label: "Fundador" },
  { value: "ASSOCIADO_FUNDADOR", label: "Associado fundador" },

  { value: "MEMBRO_DA_DIRETORIA", label: "Membro da diretoria" },
  { value: "MEMBRO_SUPLENTE", label: "Membro suplente" },
  { value: "SUPLENTE", label: "Suplente" },

  { value: "OUTRO", label: "Outro" },
] as const;

export const statusDiretoriaOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "AFASTADO", label: "Afastado" },
  { value: "INATIVO", label: "Inativo" },
] as const;

export const racasCoresDiretoria = [
  { value: "BRANCA", label: "Branca" },
  { value: "PRETA", label: "Preta" },
  { value: "PARDA", label: "Parda" },
  { value: "AMARELA", label: "Amarela" },
  { value: "INDIGENA", label: "Indígena" },
  { value: "PREFERE_NAO_INFORMAR", label: "Prefere não informar" },
] as const;

export const generosDiretoria = [
  { value: "FEMININO", label: "Feminino" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "NAO_BINARIO", label: "Não binário" },
  { value: "OUTRO", label: "Outro" },
  { value: "PREFERE_NAO_INFORMAR", label: "Prefere não informar" },
] as const;

export const tiposDeficienciaDiretoria = [
  { value: "NAO_POSSUI", label: "Não possui" },
  { value: "FISICA", label: "Física" },
  { value: "AUDITIVA", label: "Auditiva" },
  { value: "VISUAL", label: "Visual" },
  { value: "INTELECTUAL", label: "Intelectual" },
  { value: "PSICOSSOCIAL", label: "Psicossocial" },
  { value: "MULTIPLA", label: "Múltipla" },
  {
    value: "TRANSTORNO_ESPECTRO_AUTISTA",
    label: "Transtorno do Espectro Autista",
  },
  { value: "OUTRA", label: "Outra" },
  { value: "NAO_INFORMADO", label: "Não informado" },
] as const;

export type CargoDiretoria = (typeof cargosDiretoria)[number]["value"];
export type StatusDiretoria = (typeof statusDiretoriaOptions)[number]["value"];
export type RacaCorApi = (typeof racasCoresDiretoria)[number]["value"];
export type GeneroApi = (typeof generosDiretoria)[number]["value"];
export type TipoDeficienciaApi =
  (typeof tiposDeficienciaDiretoria)[number]["value"];

type DateApiValue =
  | string
  | number[]
  | {
      year?: number;
      month?: number;
      day?: number;
      monthValue?: number;
      dayOfMonth?: number;
    }
  | null
  | undefined;

export interface DiretoriaDTO {
  id?: number | string | null;

  nomeCompleto?: string | null;
  dataNascimento?: DateApiValue;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  racaCor?: RacaCorApi | string | null;
  genero?: GeneroApi | string | null;
  tipoDeficiencia?: TipoDeficienciaApi | string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: number | string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  cargoDiretoria?: CargoDiretoria | string | null;

  dataInicioMandato?: DateApiValue;
  dataFimMandato?: DateApiValue;
  dataTerminoMandato?: DateApiValue;
  dataEncerramentoMandato?: DateApiValue;

  dataAfastamento?: DateApiValue;
  observacao?: string | null;
  statusDiretoria?: StatusDiretoria | string | null;

  organizacaoId?: number | string | null;
  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;
}

export interface DiretoriaData {
  id: string;

  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;

  racaCor: string;
  genero: string;
  tipoDeficiencia: string;

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

function normalizeDateInput(value: DateApiValue): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    const [year, month, day] = value;

    if (!year || !month || !day) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}`;
  }

  if (typeof value === "object") {
    const year = value.year;
    const month = value.monthValue ?? value.month;
    const day = value.dayOfMonth ?? value.day;

    if (!year || !month || !day) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}`;
  }

  const clean = String(value).trim();

  if (!clean) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    return clean.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split("/");
    return `${year}-${month}-${day}`;
  }

  return clean;
}

function normalizeDateOutput(value?: string | null): string | null {
  const normalized = normalizeDateInput(value);

  return normalized || null;
}

function resolveOrganizacaoId(dto: DiretoriaDTO): string {
  return toIdString(dto.organizacaoId ?? dto.organizacao?.id ?? null);
}

export const cargoDiretoriaLabel = (value?: string) =>
  cargosDiretoria.find((item) => item.value === value)?.label ?? value ?? "—";

export const statusDiretoriaLabel = (value?: string) =>
  statusDiretoriaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const racaCorDiretoriaLabel = (value?: string | null) =>
  racasCoresDiretoria.find((item) => item.value === value)?.label ?? "—";

export const generoDiretoriaLabel = (value?: string | null) =>
  generosDiretoria.find((item) => item.value === value)?.label ?? "—";

export const tipoDeficienciaDiretoriaLabel = (value?: string | null) =>
  tiposDeficienciaDiretoria.find((item) => item.value === value)?.label ?? "—";

export function formatDateBR(value?: string) {
  if (!value) return "—";

  const normalized = normalizeDateInput(value);

  const [year, month, day] = normalized.split("-");

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

    racaCor: "",
    genero: "",
    tipoDeficiencia: "",

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
  const dataFimMandato =
    dto.dataFimMandato ??
    dto.dataTerminoMandato ??
    dto.dataEncerramentoMandato ??
    null;

  return {
    id: toIdString(dto.id),

    nomeCompleto: dto.nomeCompleto ?? "",
    dataNascimento: normalizeDateInput(dto.dataNascimento),
    cpf: dto.cpf ?? "",
    rg: dto.rg ?? "",
    telefone: dto.telefone ?? "",
    email: dto.email ?? "",

    racaCor: dto.racaCor ?? "",
    genero: dto.genero ?? "",
    tipoDeficiencia: dto.tipoDeficiencia ?? "",

    cep: dto.cep ?? "",
    logradouro: dto.logradouro ?? "",
    numero: dto.numero != null ? String(dto.numero) : "",
    complemento: dto.complemento ?? "",
    bairro: dto.bairro ?? "",
    cidade: dto.cidade ?? "",
    estado: dto.estado ?? "",

    cargoDiretoria: dto.cargoDiretoria ?? "",
    dataInicioMandato: normalizeDateInput(dto.dataInicioMandato),
    dataFimMandato: normalizeDateInput(dataFimMandato),
    dataAfastamento: normalizeDateInput(dto.dataAfastamento),
    observacao: dto.observacao ?? "",
    statusDiretoria: dto.statusDiretoria ?? "",

    organizacaoId: resolveOrganizacaoId(dto),
  };
}

export function buildDiretoriaPayload(form: DiretoriaData): DiretoriaDTO {
  return {
    id: form.id ? Number(form.id) : undefined,

    nomeCompleto: form.nomeCompleto.trim(),
    dataNascimento: normalizeDateOutput(form.dataNascimento),
    cpf: onlyDigits(form.cpf),
    rg: form.rg.trim() || null,
    telefone: form.telefone.trim(),
    email: form.email.trim() || null,

    racaCor: form.racaCor,
    genero: form.genero,
    tipoDeficiencia: form.tipoDeficiencia,

    cep: onlyDigits(form.cep),
    logradouro: form.logradouro.trim(),
    numero: form.numero.trim() ? Number(form.numero) : null,
    complemento: form.complemento.trim() || null,
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado.trim(),

    cargoDiretoria: form.cargoDiretoria,
    dataInicioMandato: normalizeDateOutput(form.dataInicioMandato),
    dataFimMandato: normalizeDateOutput(form.dataFimMandato),
    dataAfastamento: normalizeDateOutput(form.dataAfastamento),
    observacao: form.observacao.trim() || null,
    statusDiretoria: form.statusDiretoria,

    organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
  };
}

export async function getDiretorias(): Promise<DiretoriaData[]> {
  const response = await fetch(`${API_URL}/diretorias`, {
    method: "GET",
    headers: getJsonHeaders(),
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
    headers: getJsonHeaders(),
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
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DiretoriaDTO = await response.json();

  return mapDiretoria(data);
}

export async function converterColaboradorParaDiretoria(
  colaboradorId: number | string,
): Promise<DiretoriaData> {
  const response = await fetch(
    `${API_URL}/diretorias/converter-de-colaborador/${colaboradorId}`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

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
    headers: getJsonHeaders(),
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
    headers: getJsonHeaders(),
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
    headers: getJsonHeaders(),
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

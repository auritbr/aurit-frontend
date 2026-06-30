import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type ParticipanteStatus =
  | "ATIVO"
  | "INATIVO"
  | "PENDENTE"
  | "CONCLUIDO";

export type StatusMatricula =
  | "MATRICULADO"
  | "EM_ESPERA"
  | "CANCELADO"
  | "DESISTENTE"
  | "CONCLUIDO";

export type Genero =
  | "FEMININO"
  | "MASCULINO"
  | "NAO_BINARIO"
  | "OUTRO"
  | "PREFERE_NAO_INFORMAR";

export type RacaCor =
  | "BRANCA"
  | "PRETA"
  | "PARDA"
  | "AMARELA"
  | "INDIGENA"
  | "PREFERE_NAO_INFORMAR";

export type FaixaRenda =
  | "SEM_RENDA"
  | "ATE_1_SALARIO"
  | "DE_1_A_2_SALARIOS"
  | "DE_2_A_3_SALARIOS"
  | "ACIMA_DE_3_SALARIOS"
  | "PREFERE_NAO_INFORMAR";

export type TipoDocumentoParticipante =
  | "RG"
  | "CPF"
  | "CERTIDAO_NASCIMENTO"
  | "COMPROVANTE_RESIDENCIA"
  | "COMPROVANTE_ESCOLAR"
  | "DOCUMENTO_RESPONSAVEL"
  | "AUTORIZACAO_RESPONSAVEL"
  | "TERMO_AUTORIZACAO_IMAGEM"
  | "TERMO_AUTORIZACAO_PARTICIPACAO"
  | "LAUDO_MEDICO"
  | "RELATORIO_MEDICO"
  | "RELATORIO_PSICOLOGICO"
  | "RELATORIO_PEDAGOGICO"
  | "CADUNICO"
  | "COMPROVANTE_BOLSA_FAMILIA"
  | "NIS"
  | "OUTRO";

export type TipoNeurodivergencia =
  | "TEA"
  | "ASPERGER"
  | "TDAH"
  | "TOD"
  | "DISLEXIA"
  | "DISCALCULIA"
  | "DISGRAFIA"
  | "DISPRAXIA"
  | "TOURETTE"
  | "TOC"
  | "ALTAS_HABILIDADES_SUPERDOTACAO"
  | "TRANSTORNO_PROCESSAMENTO_SENSORIAL"
  | "TRANSTORNO_PROCESSAMENTO_AUDITIVO"
  | "OUTRA";

export type TipoDeficienciaParticipante =
  | "NAO_POSSUI"
  | "FISICA"
  | "AUDITIVA"
  | "VISUAL"
  | "INTELECTUAL"
  | "PSICOSSOCIAL"
  | "MULTIPLA"
  | "TRANSTORNO_ESPECTRO_AUTISTA"
  | "OUTRA"
  | "NAO_INFORMADO";

export const generoOptions = [
  { value: "FEMININO", label: "Feminino" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "NAO_BINARIO", label: "Não binário" },
  { value: "OUTRO", label: "Outro" },
  { value: "PREFERE_NAO_INFORMAR", label: "Prefere não informar" },
] as const;

export const racaCorOptions = [
  { value: "BRANCA", label: "Branca" },
  { value: "PRETA", label: "Preta" },
  { value: "PARDA", label: "Parda" },
  { value: "AMARELA", label: "Amarela" },
  { value: "INDIGENA", label: "Indígena" },
  { value: "PREFERE_NAO_INFORMAR", label: "Prefere não informar" },
] as const;

export const faixaRendaOptions = [
  { value: "SEM_RENDA", label: "Sem renda" },
  { value: "ATE_1_SALARIO", label: "Até 1 salário mínimo" },
  { value: "DE_1_A_2_SALARIOS", label: "De 1 a 2 salários mínimos" },
  { value: "DE_2_A_3_SALARIOS", label: "De 2 a 3 salários mínimos" },
  { value: "ACIMA_DE_3_SALARIOS", label: "Acima de 3 salários mínimos" },
  { value: "PREFERE_NAO_INFORMAR", label: "Prefere não informar" },
] as const;

export const tipoDocumentoParticipanteOptions = [
  { value: "RG", label: "RG" },
  { value: "CPF", label: "CPF" },
  { value: "CERTIDAO_NASCIMENTO", label: "Certidão de nascimento" },
  { value: "COMPROVANTE_RESIDENCIA", label: "Comprovante de residência" },
  { value: "COMPROVANTE_ESCOLAR", label: "Comprovante escolar" },
  { value: "DOCUMENTO_RESPONSAVEL", label: "Documento do responsável" },
  { value: "AUTORIZACAO_RESPONSAVEL", label: "Autorização do responsável" },
  { value: "TERMO_AUTORIZACAO_IMAGEM", label: "Termo de autorização de imagem" },
  {
    value: "TERMO_AUTORIZACAO_PARTICIPACAO",
    label: "Termo de autorização de participação",
  },
  { value: "LAUDO_MEDICO", label: "Laudo médico" },
  { value: "RELATORIO_MEDICO", label: "Relatório médico" },
  { value: "RELATORIO_PSICOLOGICO", label: "Relatório psicológico" },
  { value: "RELATORIO_PEDAGOGICO", label: "Relatório pedagógico" },
  { value: "CADUNICO", label: "CadÚnico" },
  { value: "COMPROVANTE_BOLSA_FAMILIA", label: "Comprovante Bolsa Família" },
  { value: "NIS", label: "NIS" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const tipoNeurodivergenciaOptions = [
  { value: "TEA", label: "TEA" },
  { value: "ASPERGER", label: "Asperger" },
  { value: "TDAH", label: "TDAH" },
  { value: "TOD", label: "TOD" },
  { value: "DISLEXIA", label: "Dislexia" },
  { value: "DISCALCULIA", label: "Discalculia" },
  { value: "DISGRAFIA", label: "Disgrafia" },
  { value: "DISPRAXIA", label: "Dispraxia" },
  { value: "TOURETTE", label: "Tourette" },
  { value: "TOC", label: "TOC" },
  {
    value: "ALTAS_HABILIDADES_SUPERDOTACAO",
    label: "Altas habilidades/superdotação",
  },
  {
    value: "TRANSTORNO_PROCESSAMENTO_SENSORIAL",
    label: "Transtorno do processamento sensorial",
  },
  {
    value: "TRANSTORNO_PROCESSAMENTO_AUDITIVO",
    label: "Transtorno do processamento auditivo",
  },
  { value: "OUTRA", label: "Outra" },
] as const;

export const tipoDeficienciaParticipanteOptions = [
  { value: "NAO_POSSUI", label: "Não possui" },
  { value: "FISICA", label: "Física" },
  { value: "AUDITIVA", label: "Auditiva" },
  { value: "VISUAL", label: "Visual" },
  { value: "INTELECTUAL", label: "Intelectual" },
  { value: "PSICOSSOCIAL", label: "Psicossocial" },
  { value: "MULTIPLA", label: "Múltipla" },
  { value: "TRANSTORNO_ESPECTRO_AUTISTA", label: "Transtorno do Espectro Autista" },
  { value: "OUTRA", label: "Outra" },
  { value: "NAO_INFORMADO", label: "Não informado" },
] as const;

export const statusParticipante = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const statusMatriculaOptions = [
  { value: "MATRICULADO", label: "Matriculado" },
  { value: "EM_ESPERA", label: "Em Espera" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "DESISTENTE", label: "Desistente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const niveisTurmaOptions = [
  { value: "INICIANTE", label: "Iniciante" },
  { value: "INTERMEDIARIO", label: "Intermediário" },
  { value: "AVANCADO", label: "Avançado" },
] as const;

export const statusValueToLabel = (v?: string) =>
  statusParticipante.find((s) => s.value === v)?.label ?? v ?? "—";

export const statusMatriculaValueToLabel = (v?: string) =>
  statusMatriculaOptions.find((s) => s.value === v)?.label ?? v ?? "—";

export const nivelTurmaValueToLabel = (v?: string | null) =>
  v ? niveisTurmaOptions.find((nivel) => nivel.value === v)?.label ?? v : "—";

export const tipoDocumentoParticipanteValueToLabel = (v?: string | null) =>
  v
    ? tipoDocumentoParticipanteOptions.find((item) => item.value === v)
      ?.label ?? v
    : "—";

export const tipoNeurodivergenciaValueToLabel = (v?: string | null) =>
  v
    ? tipoNeurodivergenciaOptions.find((item) => item.value === v)?.label ?? v
    : "—";

export const tipoDeficienciaParticipanteValueToLabel = (v?: string | null) =>
  v
    ? tipoDeficienciaParticipanteOptions.find((item) => item.value === v)
      ?.label ?? v
    : "—";

export const tipoNeurodivergenciasValueToLabel = (
  values?: Array<TipoNeurodivergencia | string> | TipoNeurodivergencia | string | null,
) => {
  const lista = normalizeEnumList(values);

  return lista.length
    ? lista.map((item) => tipoNeurodivergenciaValueToLabel(item)).join(", ")
    : "—";
};

export const tipoDeficienciasParticipanteValueToLabel = (
  values?:
    | Array<TipoDeficienciaParticipante | string>
    | TipoDeficienciaParticipante
    | string
    | null,
) => {
  const lista = normalizeEnumList(values);

  return lista.length
    ? lista.map((item) => tipoDeficienciaParticipanteValueToLabel(item)).join(", ")
    : "—";
};

export interface ParticipanteVinculo {
  id?: string;
  atividadeId: string;
  turmaId?: string;
  dataMatricula: string;
  nivelTurma?: string;
  statusMatricula: string;
}

export interface Participante {
  id: string;
  nomeCompleto: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  email?: string;

  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;

  nomeResponsavel?: string;
  cpfResponsavel?: string;
  rgResponsavel?: string;
  telefoneResponsavel?: string;

  status: string;
  organizacaoId: string;
  organizacaoNome?: string;
  genero?: string;
  racaCor?: string;
  faixaRenda?: string;
  tipoDocumentoParticipante?: TipoDocumentoParticipante | string;
  urlDocumento?: string;
  removerDocumento?: boolean;
  possuiCadunico?: boolean;
  possuiBolsaFamilia?: boolean;
  tipoNeurodivergencias?: Array<TipoNeurodivergencia | string>;
  tipoDeficiencias?: Array<TipoDeficienciaParticipante | string>;
  vinculos: ParticipanteVinculo[];
}

export interface AtividadeOption {
  id: string;
  nomeAtividade: string;
}

export interface TurmaOption {
  id: string;
  nomeTurma: string;
  atividadeId: string;
  nivelTurma?: string;
}

export interface OrganizacaoOption {
  id: string;
  nome: string;
}

export interface ParticipanteAtividadeApiDTO {
  id?: number;
  dataMatricula?: string | null;
  nivelTurma?: string | null;
  atividadeId?: number | string | null;
  turmaId?: number | string | null;
  statusMatricula?: string | null;

  atividade?: {
    id?: number | string | null;
    nomeAtividade?: string | null;
    nome?: string | null;
  } | null;

  turma?: {
    id?: number | string | null;
    nomeTurma?: string | null;
    nome?: string | null;
  } | null;
}

export interface ParticipanteApiDTO {
  id?: number;
  nomeCompleto?: string | null;
  nome?: string | null;

  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  nomeResponsavel?: string | null;
  cpfResponsavel?: string | null;
  rgResponsavel?: string | null;
  telefoneResponsavel?: string | null;

  status?: string | null;
  organizacaoId?: number | string | null;
  organizacaoNome?: string | null;
  genero?: string | null;
  racaCor?: string | null;
  faixaRenda?: string | null;
  tipoDocumentoParticipante?: TipoDocumentoParticipante | string | null;
  urlDocumento?: string | null;
  removerDocumento?: boolean | null;
  possuiCadunico?: boolean | null;
  possuiBolsaFamilia?: boolean | null;
  tipoNeurodivergencias?:
    | Array<TipoNeurodivergencia | string>
    | TipoNeurodivergencia
    | string
    | null;
  tipoDeficiencias?:
    | Array<TipoDeficienciaParticipante | string>
    | TipoDeficienciaParticipante
    | string
    | null;

  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;

  vinculos?: ParticipanteAtividadeApiDTO[] | null;
  atividades?: ParticipanteAtividadeApiDTO[] | null;
  participanteAtividades?: ParticipanteAtividadeApiDTO[] | null;
  vinculosAtividades?: ParticipanteAtividadeApiDTO[] | null;
}

export interface ParticipantePayloadDTO {
  id?: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string | null;
  rg?: string | null;
  telefone: string;
  email?: string | null;

  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  estado: string;

  nomeResponsavel?: string | null;
  cpfResponsavel?: string | null;
  rgResponsavel?: string | null;
  telefoneResponsavel?: string | null;
  genero?: string | null;
  racaCor?: string | null;
  faixaRenda?: string | null;
  tipoDocumentoParticipante?: TipoDocumentoParticipante | string | null;
  urlDocumento?: string | null;
  removerDocumento?: boolean | null;
  possuiCadunico?: boolean | null;
  possuiBolsaFamilia?: boolean | null;
  tipoNeurodivergencias?: Array<TipoNeurodivergencia | string> | null;
  tipoDeficiencias?: Array<TipoDeficienciaParticipante | string> | null;

  status: string;
  organizacaoId?: number | null;

  vinculos: {
    id?: number;
    dataMatricula: string;
    nivelTurma?: string | null;
    atividadeId: number;
    turmaId?: number | null;
    statusMatricula: string;
  }[];
}

interface AtividadeApiDTO {
  id?: number | string | null;
  nomeAtividade?: string | null;
  nome?: string | null;
}

interface TurmaApiDTO {
  id?: number | string | null;
  nomeTurma?: string | null;
  nome?: string | null;
  nivelTurma?: string | null;
  atividadeId?: number | string | null;
  atividade?: {
    id?: number | string | null;
  } | null;
}

interface OrganizacaoApiDTO {
  id?: number | string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
}

export async function parseError(response: Response): Promise<string> {
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

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeEnumList(
  values?: Array<string | null | undefined> | string | null,
) {
  if (Array.isArray(values)) {
    return values.filter(
      (item): item is string => typeof item === "string" && !!item.trim(),
    );
  }

  if (typeof values === "string" && values.trim()) {
    return [values.trim()];
  }

  return [];
}

export function formatIsoToBR(iso?: string | null) {
  if (!iso) return "";

  const value = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
}

export function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function brToIso(date: string) {
  const digits = onlyDigits(date);

  if (digits.length !== 8) return "";

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return `${year}-${month}-${day}`;
}

export function isValidBrDate(date: string) {
  const iso = brToIso(date);

  if (!iso) return false;

  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function getVinculos(dto: ParticipanteApiDTO): ParticipanteAtividadeApiDTO[] {
  return (
    dto.vinculos ??
    dto.atividades ??
    dto.participanteAtividades ??
    dto.vinculosAtividades ??
    []
  );
}

function resolveOrganizacaoNome(dto: ParticipanteApiDTO) {
  return pickText(
    dto.organizacaoNome,
    dto.organizacao?.razaoSocial,
    dto.organizacao?.nomeFantasia,
    dto.organizacao?.nomeOrganizacao,
    dto.organizacao?.nome,
  );
}

export function mapParticipante(dto: ParticipanteApiDTO): Participante {
  return {
    id: normalizeId(dto.id),
    nomeCompleto: pickText(dto.nomeCompleto, dto.nome),
    dataNascimento: formatIsoToBR(dto.dataNascimento),
    cpf: dto.cpf ?? "",
    rg: dto.rg ?? "",
    telefone: dto.telefone ?? "",
    email: dto.email ?? "",
    genero: dto.genero ?? "",
    racaCor: dto.racaCor ?? "",
    faixaRenda: dto.faixaRenda ?? "",
    tipoDocumentoParticipante: dto.tipoDocumentoParticipante ?? "",
    urlDocumento: dto.urlDocumento ?? "",
    removerDocumento: Boolean(dto.removerDocumento),
    possuiCadunico: Boolean(dto.possuiCadunico),
    possuiBolsaFamilia: Boolean(dto.possuiBolsaFamilia),
    tipoNeurodivergencias: normalizeEnumList(dto.tipoNeurodivergencias),
    tipoDeficiencias: normalizeEnumList(dto.tipoDeficiencias),

    cep: dto.cep ?? "",
    logradouro: dto.logradouro ?? "",
    numero: dto.numero ?? "",
    complemento: dto.complemento ?? "",
    bairro: dto.bairro ?? "",
    cidade: dto.cidade ?? "",
    estado: dto.estado ?? "",

    nomeResponsavel: dto.nomeResponsavel ?? "",
    cpfResponsavel: dto.cpfResponsavel ?? "",
    rgResponsavel: dto.rgResponsavel ?? "",
    telefoneResponsavel: dto.telefoneResponsavel ?? "",

    status: dto.status ?? "",
    organizacaoId: normalizeId(dto.organizacaoId ?? dto.organizacao),
    organizacaoNome: resolveOrganizacaoNome(dto),

    vinculos: getVinculos(dto).map((v) => ({
      id: normalizeId(v.id) || undefined,
      atividadeId: normalizeId(v.atividadeId ?? v.atividade),
      turmaId: normalizeId(v.turmaId ?? v.turma) || undefined,
      dataMatricula: formatIsoToBR(v.dataMatricula),
      nivelTurma: v.nivelTurma ?? "",
      statusMatricula: v.statusMatricula ?? "",
    })),
  };
}

export function buildParticipantePayload(
  participante: Participante,
): ParticipantePayloadDTO {
  return {
    id: participante.id ? Number(participante.id) : undefined,

    nomeCompleto: participante.nomeCompleto.trim(),
    dataNascimento: brToIso(participante.dataNascimento ?? ""),

    cpf: onlyDigits(participante.cpf) || null,
    rg: participante.rg?.trim() || null,
    telefone: participante.telefone?.trim() || "",
    email: participante.email?.trim() || null,
    genero: participante.genero || null,
    racaCor: participante.racaCor || null,
    faixaRenda: participante.faixaRenda || null,
    tipoDocumentoParticipante: participante.tipoDocumentoParticipante || null,
    urlDocumento: participante.urlDocumento || null,
    removerDocumento: Boolean(participante.removerDocumento),
    possuiCadunico: Boolean(participante.possuiCadunico),
    possuiBolsaFamilia: Boolean(participante.possuiBolsaFamilia),
    tipoNeurodivergencias: participante.tipoNeurodivergencias?.length
      ? participante.tipoNeurodivergencias
      : null,
    tipoDeficiencias: participante.tipoDeficiencias?.length
      ? participante.tipoDeficiencias
      : null,

    cep: onlyDigits(participante.cep),
    logradouro: participante.logradouro?.trim() || "",
    numero: participante.numero?.trim() || "",
    complemento: participante.complemento?.trim() || null,
    bairro: participante.bairro?.trim() || null,
    cidade: participante.cidade?.trim() || "",
    estado: participante.estado?.trim() || "",

    nomeResponsavel: participante.nomeResponsavel?.trim() || null,
    cpfResponsavel: onlyDigits(participante.cpfResponsavel) || null,
    rgResponsavel: participante.rgResponsavel?.trim() || null,
    telefoneResponsavel: participante.telefoneResponsavel?.trim() || null,

    status: participante.status,
    organizacaoId: participante.organizacaoId
      ? Number(participante.organizacaoId)
      : null,

    vinculos: participante.vinculos.map((v) => ({
      id: v.id ? Number(v.id) : undefined,
      dataMatricula: brToIso(v.dataMatricula),
      nivelTurma: v.nivelTurma || null,
      atividadeId: Number(v.atividadeId),
      turmaId: v.turmaId ? Number(v.turmaId) : null,
      statusMatricula: v.statusMatricula,
    })),
  };
}

export async function getParticipantes(): Promise<Participante[]> {
  const response = await fetch(`${API_URL}/participantes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ParticipanteApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapParticipante);
}

export async function getParticipanteById(id: number): Promise<Participante> {
  const response = await fetch(`${API_URL}/participantes/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ParticipanteApiDTO = await response.json();

  return mapParticipante(data);
}

export async function createParticipante(
  payload: ParticipantePayloadDTO,
  documento?: File | null,
): Promise<Participante> {
  const body = buildParticipanteRequestBody(payload, documento);
  const response = await fetch(`${API_URL}/participantes`, {
    method: "POST",
    headers: documento ? getMultipartHeaders() : getJsonHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ParticipanteApiDTO = await response.json();

  return mapParticipante(data);
}

export async function updateParticipante(
  id: number,
  payload: ParticipantePayloadDTO,
  documento?: File | null,
): Promise<Participante> {
  const usarMultipart = Boolean(documento);
  const body = buildParticipanteRequestBody(payload, documento);
  const response = await fetch(`${API_URL}/participantes/${id}`, {
    method: "PUT",
    headers: usarMultipart ? getMultipartHeaders() : getJsonHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ParticipanteApiDTO = await response.json();

  return mapParticipante(data);
}

function buildParticipanteRequestBody(
  payload: ParticipantePayloadDTO,
  documento?: File | null,
) {
  if (!documento) return JSON.stringify(payload);

  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));
  formData.append("documento", documento);

  return formData;
}

export async function getParticipanteDocumentoDownloadUrl(
  id: number,
): Promise<string> {
  const response = await fetch(`${API_URL}/participantes/${id}/documento/download`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const url = await response.text();

  if (!url?.trim()) {
    throw new Error("Link do documento não retornado pelo servidor.");
  }

  return url;
}

export async function deleteParticipante(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/participantes/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getAtividadesOptions(): Promise<AtividadeOption[]> {
  const response = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      id: normalizeId(item.id),
      nomeAtividade:
        pickText(item.nomeAtividade, item.nome) || `Atividade ${item.id}`,
    }))
    .filter((item) => item.id);
}

export async function getTurmasOptions(): Promise<TurmaOption[]> {
  const response = await fetch(`${API_URL}/turmas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TurmaApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      id: normalizeId(item.id),
      nomeTurma: pickText(item.nomeTurma, item.nome) || `Turma ${item.id}`,
      atividadeId: normalizeId(item.atividadeId ?? item.atividade),
      nivelTurma: item.nivelTurma ?? "",
    }))
    .filter((item) => item.id);
}

export async function getOrganizacoesParticipante(): Promise<
  OrganizacaoOption[]
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
    .map((item) => ({
      id: normalizeId(item.id),
      nome:
        pickText(
          item.razaoSocial,
          item.nomeFantasia,
          item.nomeOrganizacao,
          item.nome,
        ) || `Organização ${item.id}`,
    }))
    .filter((item) => item.id);
}

export interface IndicadorItem {
  categoria: string;
  total: number;
  percentual: number;
}

export interface IndicadoresSociodemograficos {
  totalParticipantes: number;
  porGenero: IndicadorItem[];
  porRacaCor: IndicadorItem[];
  porFaixaRenda: IndicadorItem[];
  porFaixaEtaria: IndicadorItem[];
  porTipoDeficiencia?: IndicadorItem[];
  porTipoNeurodivergencia?: IndicadorItem[];
  porCadunico?: IndicadorItem[];
  porBolsaFamilia?: IndicadorItem[];
}

export interface IndicadoresSociodemograficosFiltros {
  ano?: string;
  atividadeId?: string;
  turmaId?: string;
  statusMatricula?: string;
}

export async function getIndicadoresSociodemograficos(
  filtros: IndicadoresSociodemograficosFiltros = {},
): Promise<IndicadoresSociodemograficos> {
  const params = new URLSearchParams();

  if (filtros.ano) params.set("ano", filtros.ano);
  if (filtros.atividadeId) params.set("atividadeId", filtros.atividadeId);
  if (filtros.turmaId) params.set("turmaId", filtros.turmaId);
  if (filtros.statusMatricula) {
    params.set("statusMatricula", filtros.statusMatricula);
  }

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/participantes/indicadores-sociodemograficos${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

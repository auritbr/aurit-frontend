import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type StatusPlanoAula = "PLANEJADO" | "REALIZADO" | "CANCELADO";

export const statusPlanoAulaOptions = [
  { value: "PLANEJADO", label: "Planejado" },
  { value: "REALIZADO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;

export const statusPlanoAulaValueToLabel = (value?: string | null) =>
  statusPlanoAulaOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export interface AtividadeResumo {
  id: string;
  nomeAtividade?: string;
  nome?: string;
  titulo?: string;
}

export interface TurmaResumo {
  id: string;
  nomeTurma?: string;
  nome?: string;
  atividadeId?: string;
}

export interface ColaboradorResumo {
  id: string;
  nome?: string;
  nomeCompleto?: string;
}

export interface PlanoAula {
  id: string;

  nomePlanoAula: string;

  atividadeId: string;
  atividadeNome?: string;
  atividade?: AtividadeResumo;

  turmaId?: string;
  turmaNome?: string;
  turma?: TurmaResumo | null;

  turmaIds: string[];
  turmaNomes?: string[];
  turmas?: TurmaResumo[];

  colaboradorId: string;
  colaboradorNome?: string;
  colaborador?: ColaboradorResumo;

  organizacaoId?: string;

  dataInicio: string;
  dataFim?: string;
  aulaReposicao: boolean;
  statusPlanoAula: StatusPlanoAula;

  conteudo: string;
  observacao?: string;
}

export interface PlanoAulaPayloadDTO {
  id?: number;

  nomePlanoAula: string;

  atividadeId: number;

  turmaId?: number | null;
  turmaIds: number[];

  colaboradorId: number;
  organizacaoId?: number | null;

  dataInicio: string;
  dataFim?: string | null;
  aulaReposicao: boolean;
  statusPlanoAula: StatusPlanoAula;

  conteudo: string;
  observacao?: string | null;
}

export interface PlanoAulaApiDTO {
  id?: number | string | null;

  nomePlanoAula?: string | null;

  atividadeId?: number | string | null;

  turmaId?: number | string | null;
  turmaIds?: Array<number | string | null> | null;

  colaboradorId?: number | string | null;
  organizacaoId?: number | string | null;

  dataInicio?: string | null;
  dataFim?: string | null;
  aulaReposicao?: boolean | null;
  statusPlanoAula?: StatusPlanoAula | "CONCLUIDO" | "EM_ANDAMENTO" | string | null;

  conteudo?: string | null;
  observacao?: string | null;

  atividade?: {
    id?: number | string | null;
    nomeAtividade?: string | null;
    titulo?: string | null;
    nome?: string | null;
  } | null;

  turma?: {
    id?: number | string | null;
    nomeTurma?: string | null;
    nome?: string | null;
    atividadeId?: number | string | null;
    atividade?: {
      id?: number | string | null;
    } | null;
  } | null;

  turmas?:
  | Array<{
    id?: number | string | null;
    nomeTurma?: string | null;
    nome?: string | null;
    atividadeId?: number | string | null;
    atividade?: {
      id?: number | string | null;
    } | null;
  } | null>
  | null;

  colaborador?: {
    id?: number | string | null;
    nome?: string | null;
    nomeCompleto?: string | null;
    agente?: {
      nome?: string | null;
      nomeCompleto?: string | null;
    } | null;
  } | null;

  organizacao?: {
    id?: number | string | null;
  } | null;
}

export interface AtividadeOption {
  id: string;
  nomeAtividade: string;
}

export interface TurmaOption {
  id: string;
  nomeTurma: string;
  atividadeId: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
}

interface AtividadeApiDTO {
  id?: number | string | null;
  nomeAtividade?: string | null;
  titulo?: string | null;
  nome?: string | null;
}

interface TurmaApiDTO {
  id?: number | string | null;
  nomeTurma?: string | null;
  nome?: string | null;
  atividadeId?: number | string | null;
  atividade?: {
    id?: number | string | null;
  } | null;
}

interface ColaboradorApiDTO {
  id?: number | string | null;
  nome?: string | null;
  nomeCompleto?: string | null;
  agente?: {
    nome?: string | null;
    nomeCompleto?: string | null;
  } | null;
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

function normalizeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(values.map((value) => normalizeId(value)).filter(Boolean)),
  );
}

function toNumberIds(values: string[]): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeIsoDate(value?: string | null) {
  if (!value) return "";

  return value.length >= 10 ? value.slice(0, 10) : value;
}

function normalizeStatusPlanoAula(value?: string | null): StatusPlanoAula {
  if (value === "PLANEJADO") return "PLANEJADO";
  if (value === "REALIZADO") return "REALIZADO";
  if (value === "CANCELADO") return "CANCELADO";

  if (value === "CONCLUIDO") return "REALIZADO";

  return "PLANEJADO";
}

function mapTurmaResumo(turma?: PlanoAulaApiDTO["turma"]): TurmaResumo | null {
  if (!turma) return null;

  const id = normalizeId(turma.id);

  if (!id) return null;

  const nomeTurma = pickText(turma.nomeTurma, turma.nome);
  const atividadeId = normalizeId(turma.atividadeId ?? turma.atividade);

  return {
    id,
    nomeTurma,
    nome: nomeTurma,
    atividadeId: atividadeId || undefined,
  };
}

export function mapPlanoAula(dto: PlanoAulaApiDTO): PlanoAula {
  const atividadeId = normalizeId(dto.atividadeId ?? dto.atividade);
  const colaboradorId = normalizeId(dto.colaboradorId ?? dto.colaborador);

  const turmasFromArray = (Array.isArray(dto.turmas) ? dto.turmas : [])
    .map((turma) => mapTurmaResumo(turma))
    .filter((turma): turma is TurmaResumo => Boolean(turma));

  const turmaUnica = mapTurmaResumo(dto.turma);

  const turmas = turmasFromArray.length
    ? turmasFromArray
    : turmaUnica
      ? [turmaUnica]
      : [];

  const turmaIds = Array.from(
    new Set([
      ...normalizeIds(dto.turmaIds),
      ...turmas.map((turma) => turma.id).filter(Boolean),
      normalizeId(dto.turmaId),
    ].filter(Boolean)),
  );

  const turmaNomes = turmas
    .map((turma) => pickText(turma.nomeTurma, turma.nome))
    .filter(Boolean);

  const turmaId = turmaIds[0] || undefined;
  const turmaNome = turmaNomes[0] || pickText(dto.turma?.nomeTurma, dto.turma?.nome);

  const atividadeNome = pickText(
    dto.atividade?.nomeAtividade,
    dto.atividade?.titulo,
    dto.atividade?.nome,
  );

  const colaboradorNome = pickText(
    dto.colaborador?.nome,
    dto.colaborador?.nomeCompleto,
    dto.colaborador?.agente?.nome,
    dto.colaborador?.agente?.nomeCompleto,
  );

  return {
    id: normalizeId(dto.id),

    nomePlanoAula: dto.nomePlanoAula ?? "",

    atividadeId,
    atividadeNome,
    atividade: atividadeId
      ? {
        id: atividadeId,
        nomeAtividade: atividadeNome,
        nome: atividadeNome,
        titulo: atividadeNome,
      }
      : undefined,

    turmaId,
    turmaNome,
    turma: turmaId
      ? {
        id: turmaId,
        nomeTurma: turmaNome,
        nome: turmaNome,
      }
      : null,

    turmaIds,
    turmaNomes,
    turmas,

    colaboradorId,
    colaboradorNome,
    colaborador: colaboradorId
      ? {
        id: colaboradorId,
        nome: colaboradorNome,
        nomeCompleto: colaboradorNome,
      }
      : undefined,

    organizacaoId: normalizeId(dto.organizacaoId ?? dto.organizacao) || undefined,

    dataInicio: normalizeIsoDate(dto.dataInicio),
    dataFim: normalizeIsoDate(dto.dataFim) || undefined,
    aulaReposicao: Boolean(dto.aulaReposicao),
    statusPlanoAula: normalizeStatusPlanoAula(dto.statusPlanoAula),

    conteudo: dto.conteudo ?? "",
    observacao: dto.observacao ?? "",
  };
}

export function buildPlanoAulaPayload(
  planoAula: PlanoAula,
): PlanoAulaPayloadDTO {
  const turmaIds = toNumberIds(
    planoAula.turmaIds?.length
      ? planoAula.turmaIds
      : planoAula.turmaId
        ? [planoAula.turmaId]
        : [],
  );

  return {
    id: planoAula.id ? Number(planoAula.id) : undefined,

    nomePlanoAula: planoAula.nomePlanoAula.trim(),

    atividadeId: Number(planoAula.atividadeId),
    turmaId: turmaIds[0] ?? null,
    turmaIds,
    colaboradorId: Number(planoAula.colaboradorId),
    organizacaoId: planoAula.organizacaoId
      ? Number(planoAula.organizacaoId)
      : null,

    dataInicio: planoAula.dataInicio,
    dataFim: planoAula.dataFim || null,
    aulaReposicao: Boolean(planoAula.aulaReposicao),
    statusPlanoAula: planoAula.statusPlanoAula,

    conteudo: planoAula.conteudo.trim(),
    observacao: planoAula.observacao?.trim() || null,
  };
}

export async function getPlanosAula(filtros?: {
  atividadeId?: string;
  turmaId?: string;
}): Promise<PlanoAula[]> {
  const params = new URLSearchParams();

  if (filtros?.atividadeId) {
    params.set("atividadeId", filtros.atividadeId);
  }

  if (filtros?.turmaId) {
    params.set("turmaId", filtros.turmaId);
  }

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/planos-aula${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoAulaApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapPlanoAula);
}

export async function getPlanoAulaById(id: number): Promise<PlanoAula> {
  const response = await fetch(`${API_URL}/planos-aula/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoAulaApiDTO = await response.json();

  return mapPlanoAula(data);
}

export async function createPlanoAula(
  payload: PlanoAulaPayloadDTO,
): Promise<PlanoAula> {
  const response = await fetch(`${API_URL}/planos-aula`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoAulaApiDTO = await response.json();

  return mapPlanoAula(data);
}

export async function updatePlanoAula(
  id: number,
  payload: PlanoAulaPayloadDTO,
): Promise<PlanoAula> {
  const response = await fetch(`${API_URL}/planos-aula/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoAulaApiDTO = await response.json();

  return mapPlanoAula(data);
}

export async function deletePlanoAula(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/planos-aula/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getAtividadesPlanoAulaOptions(): Promise<
  AtividadeOption[]
> {
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
        pickText(item.nomeAtividade, item.titulo, item.nome) ||
        `Atividade ${item.id}`,
    }))
    .filter((item) => item.id);
}

export async function getTurmasPlanoAulaOptions(): Promise<TurmaOption[]> {
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
    }))
    .filter((item) => item.id);
}

export async function getColaboradoresPlanoAulaOptions(): Promise<
  ColaboradorOption[]
> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      id: normalizeId(item.id),
      nome:
        pickText(
          item.nome,
          item.nomeCompleto,
          item.agente?.nome,
          item.agente?.nomeCompleto,
        ) || `Colaborador ${item.id}`,
    }))
    .filter((item) => item.id);
}
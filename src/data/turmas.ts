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

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

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

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function normalizeTime(value?: string | null): string {
  if (!value) return "";

  return value.length >= 5 ? value.slice(0, 5) : value;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export const statusTurma = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const diasSemana = [
  { value: "SEGUNDA_FEIRA", label: "Segunda-Feira" },
  { value: "TERCA_FEIRA", label: "Terça-Feira" },
  { value: "QUARTA_FEIRA", label: "Quarta-Feira" },
  { value: "QUINTA_FEIRA", label: "Quinta-Feira" },
  { value: "SEXTA_FEIRA", label: "Sexta-Feira" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
] as const;

export type StatusTurma = (typeof statusTurma)[number]["value"];
export type DiaSemana = (typeof diasSemana)[number]["value"];

export const statusTurmaLabel = (value?: string) =>
  statusTurma.find((status) => status.value === value)?.label ?? value ?? "—";

export const diaLabel = (value?: string) =>
  diasSemana.find((dia) => dia.value === value)?.label ?? value ?? "—";

export interface TurmaDTO {
  id?: number | string;
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas?: number | string | null;
  diaAtividade: string;
  status: string;

  atividadeId?: number | string | null;
  atividade?: {
    id?: number | string | null;
    nomeAtividade?: string | null;
    nome?: string | null;
  } | null;

  colaboradoresIds?: Array<number | string> | null;
  colaboradores?: Array<{
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  }> | null;
}

export interface Turma {
  id: string;
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas: number | null;
  diaAtividade: string;
  status: string;
  atividadeId: string;
  atividadeNome?: string;
  colaboradoresIds: string[];
  colaboradoresNomes: string[];
}

export interface TurmaPayload {
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas?: number | null;
  diaAtividade: string;
  status: string;
  atividadeId: number;
  colaboradoresIds: number[];
}

export interface TurmaFormPayloadSource {
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas?: string;
  diaAtividade: string;
  status: string;
  atividadeId: string;
  colaboradores: string[];
}

export interface AtividadeOption {
  id: string;
  nome: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
}

interface AtividadeApiDTO {
  id?: number | string | null;
  nomeAtividade?: string | null;
  nome?: string | null;
  titulo?: string | null;
}

interface ColaboradorApiDTO {
  id?: number | string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
}

function extractColaboradoresIds(dto: TurmaDTO): string[] {
  if (Array.isArray(dto.colaboradoresIds)) {
    return dto.colaboradoresIds.map(normalizeId).filter(Boolean);
  }

  if (Array.isArray(dto.colaboradores)) {
    return dto.colaboradores
      .map((colaborador) => normalizeId(colaborador.id))
      .filter(Boolean);
  }

  return [];
}

function extractColaboradoresNomes(dto: TurmaDTO): string[] {
  if (!Array.isArray(dto.colaboradores)) return [];

  return dto.colaboradores
    .map((colaborador) =>
      pickText(colaborador.nomeCompleto, colaborador.nome),
    )
    .filter(Boolean);
}

export function mapTurma(dto: TurmaDTO): Turma {
  const atividadeId = normalizeId(dto.atividadeId ?? dto.atividade?.id);

  return {
    id: normalizeId(dto.id),
    nomeTurma: dto.nomeTurma ?? "",
    descricaoTurma: dto.descricaoTurma ?? "",
    horarioInicio: normalizeTime(dto.horarioInicio),
    horarioFim: normalizeTime(dto.horarioFim),
    quantidadeVagas: normalizeNumber(dto.quantidadeVagas),
    diaAtividade: dto.diaAtividade ?? "",
    status: dto.status ?? "",
    atividadeId,
    atividadeNome: pickText(dto.atividade?.nomeAtividade, dto.atividade?.nome),
    colaboradoresIds: extractColaboradoresIds(dto),
    colaboradoresNomes: extractColaboradoresNomes(dto),
  };
}

export function buildTurmaPayload(
  data: TurmaFormPayloadSource,
): TurmaPayload {
  return {
    nomeTurma: data.nomeTurma.trim(),
    descricaoTurma: data.descricaoTurma.trim(),
    horarioInicio: data.horarioInicio,
    horarioFim: data.horarioFim,
    quantidadeVagas: data.quantidadeVagas?.trim()
      ? Number(data.quantidadeVagas)
      : null,
    diaAtividade: data.diaAtividade,
    status: data.status,
    atividadeId: Number(data.atividadeId),
    colaboradoresIds: data.colaboradores
      .map(Number)
      .filter((id) => Number.isFinite(id)),
  };
}

export async function getTurmas(): Promise<Turma[]> {
  const response = await fetch(`${API_URL}/turmas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TurmaDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapTurma);
}

export async function getTurmaById(id: number): Promise<Turma> {
  const response = await fetch(`${API_URL}/turmas/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TurmaDTO = await response.json();

  return mapTurma(data);
}

export async function createTurma(payload: TurmaPayload): Promise<Turma> {
  const response = await fetch(`${API_URL}/turmas`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TurmaDTO = await response.json();

  return mapTurma(data);
}

export async function updateTurma(
  id: number,
  payload: TurmaPayload,
): Promise<Turma> {
  const response = await fetch(`${API_URL}/turmas/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TurmaDTO = await response.json();

  return mapTurma(data);
}

export async function deleteTurma(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/turmas/${id}`, {
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
    .map((atividade) => {
      const id = normalizeId(atividade.id);

      return {
        id,
        nome:
          pickText(
            atividade.nomeAtividade,
            atividade.nome,
            atividade.titulo,
          ) || `Atividade ${id}`,
      };
    })
    .filter((atividade) => atividade.id)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getColaboradoresOptions(): Promise<ColaboradorOption[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((colaborador) => {
      const id = normalizeId(colaborador.id);

      return {
        id,
        nome:
          pickText(colaborador.nomeCompleto, colaborador.nome) ||
          `Colaborador ${id}`,
      };
    })
    .filter((colaborador) => colaborador.id)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
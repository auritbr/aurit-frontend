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

function normalizeId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return normalizeId(record.id);
    }

    if (record.value !== null && record.value !== undefined) {
      return normalizeId(record.value);
    }

    return undefined;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : undefined;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

function normalizeString(value: unknown): string {
  return normalizeText(value).trim();
}

export interface TrajetoriaCulturalDTO {
  id?: number | string;
  textoTrajetoria?: string | null;

  colaboradorId?: number | string | null;
  idColaborador?: number | string | null;
  nomeCompleto?: string | null;
  nomeColaborador?: string | null;
  colaboradorNome?: string | null;

  colaborador?: {
    id?: number | string | null;
    colaboradorId?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  } | null;

  pessoa?: {
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  } | null;
}

export interface TrajetoriaCulturalPayload {
  colaboradorId: number;
  textoTrajetoria: string;
}

export interface TrajetoriaCultural {
  id: number;
  colaboradorId?: number;
  nomeCompleto: string;
  textoTrajetoria: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
}

interface ColaboradorApi {
  id?: number | string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
}

export function mapTrajetoria(
  dto: TrajetoriaCulturalDTO,
): TrajetoriaCultural {
  const colaboradorId =
    normalizeId(dto.colaboradorId) ??
    normalizeId(dto.idColaborador) ??
    normalizeId(dto.colaborador?.id) ??
    normalizeId(dto.colaborador?.colaboradorId) ??
    normalizeId(dto.pessoa?.id);

  const nomeCompleto =
    normalizeString(dto.nomeCompleto) ||
    normalizeString(dto.nomeColaborador) ||
    normalizeString(dto.colaboradorNome) ||
    normalizeString(dto.colaborador?.nomeCompleto) ||
    normalizeString(dto.colaborador?.nome) ||
    normalizeString(dto.pessoa?.nomeCompleto) ||
    normalizeString(dto.pessoa?.nome) ||
    "";

  return {
    id: Number(dto.id ?? 0),
    colaboradorId,
    nomeCompleto,
    textoTrajetoria: normalizeText(dto.textoTrajetoria),
  };
}

export function getColaboradorNome(item: TrajetoriaCultural): string {
  return item.nomeCompleto?.trim() || "—";
}

export async function getTrajetoriasCulturais(): Promise<
  TrajetoriaCultural[]
> {
  const response = await fetch(`${API_URL}/trajetorias-culturais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TrajetoriaCulturalDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapTrajetoria);
}

export async function getTrajetoriaCulturalById(
  id: number,
): Promise<TrajetoriaCultural> {
  const response = await fetch(`${API_URL}/trajetorias-culturais/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TrajetoriaCulturalDTO = await response.json();

  return mapTrajetoria(data);
}

export async function createTrajetoriaCultural(
  payload: TrajetoriaCulturalPayload,
): Promise<TrajetoriaCultural> {
  const response = await fetch(`${API_URL}/trajetorias-culturais`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TrajetoriaCulturalDTO = await response.json();

  return mapTrajetoria(data);
}

export async function updateTrajetoriaCultural(
  id: number,
  payload: TrajetoriaCulturalPayload,
): Promise<TrajetoriaCultural> {
  const response = await fetch(`${API_URL}/trajetorias-culturais/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: TrajetoriaCulturalDTO = await response.json();

  return mapTrajetoria(data);
}

export async function deleteTrajetoriaCultural(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/trajetorias-culturais/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getColaboradoresOptions(): Promise<ColaboradorOption[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter(
      (colaborador) =>
        colaborador.id !== null && colaborador.id !== undefined,
    )
    .map((colaborador) => ({
      id: String(colaborador.id),
      nome:
        normalizeString(colaborador.nomeCompleto) ||
        normalizeString(colaborador.nome) ||
        `Colaborador ${colaborador.id}`,
    }));
}
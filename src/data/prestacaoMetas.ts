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

function pickFirstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
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
  }

  return String(value);
}

function normalizeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  const normalized =
    typeof value === "string" ? value.replace(",", ".") : value;

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value).trim();
}

function normalizeEvidenciasIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => {
          if (item === null || item === undefined) return "";

          if (typeof item === "object") {
            const record = item as Record<string, unknown>;

            if (record.id !== null && record.id !== undefined) {
              return String(record.id);
            }

            if (
              record.evidenciaId !== null &&
              record.evidenciaId !== undefined
            ) {
              return String(record.evidenciaId);
            }

            if (
              record.evidenciaExecucaoId !== null &&
              record.evidenciaExecucaoId !== undefined
            ) {
              return String(record.evidenciaExecucaoId);
            }
          }

          return String(item);
        })
        .filter(Boolean),
    ),
  );
}

export const statusCumprimentoOptions = [
  { value: "CUMPRIDA_INTEGRALMENTE", label: "Cumprida integralmente" },
  { value: "CUMPRIDA_PARCIALMENTE", label: "Cumprida parcialmente" },
  { value: "NAO_CUMPRIDA", label: "Não cumprida" },
  { value: "NAO_SE_APLICA", label: "Não se aplica" },
] as const;

export type StatusCumprimentoMeta =
  (typeof statusCumprimentoOptions)[number]["value"];

export const statusCumprimentoLabel = (value?: string | null) =>
  statusCumprimentoOptions.find((item) => item.value === value)?.label ?? "—";

export const statusCumprimentoTone = (
  value?: string | null,
): "neutral" | "info" | "warning" | "success" | "danger" => {
  switch (value) {
    case "CUMPRIDA_INTEGRALMENTE":
      return "success";

    case "CUMPRIDA_PARCIALMENTE":
      return "warning";

    case "NAO_CUMPRIDA":
      return "danger";

    case "NAO_SE_APLICA":
      return "neutral";

    default:
      return "neutral";
  }
};

export interface PrestacaoMetaDTO {
  id?: number | string;

  metaProjetoId?: number | string | null;
  metaProjeto?:
    | number
    | string
    | {
        id?: number | string | null;
        tituloMeta?: string | null;
        descricaoMeta?: string | null;
        quantidadePrevista?: number | string | null;
        formaComprovacao?: string | null;
        ordem?: number | null;
        projetoId?: number | string | null;
        propostaEditalId?: number | string | null;
      }
    | null;
  metaId?: number | string | null;
  meta?: number | string | { id?: number | string | null } | null;

  statusCumprimentoMeta?: StatusCumprimentoMeta | null;
  quantidadeExecutada?: string | number | null;
  percentualExecutado?: number | string | null;
  observacaoCumprimento?: string | null;
  justificativaNaoCumprimentoIntegral?: string | null;

  evidenciasIds?: Array<number | string> | null;
  evidenciasExecucaoIds?: Array<number | string> | null;
  evidencias?:
    | Array<
        | number
        | string
        | {
            id?: number | string | null;
            evidenciaId?: number | string | null;
            evidenciaExecucaoId?: number | string | null;
            tituloEvidencia?: string | null;
            titulo?: string | null;
            descricaoEvidencia?: string | null;
            observacaoEvidencia?: string | null;
            nomeEvidencia?: string | null;
          }
      >
    | null;
}

export interface PrestacaoMeta {
  id: string;
  metaProjeto: string;
  quantidadeExecutada: string;
  percentualExecutado?: number;
  observacaoCumprimento: string;
  statusCumprimentoMeta: StatusCumprimentoMeta | "";
  justificativaNaoCumprimentoIntegral: string;
  evidencias: string[];
}

export interface MetaProjetoOption {
  id: string;
  tituloMeta: string;
}

export interface EvidenciaOption {
  id: string;
  tituloEvidencia: string;
}

interface MetaProjetoApiItem {
  id?: number | string | null;
  tituloMeta?: string | null;
  descricaoMeta?: string | null;
  nome?: string | null;
}

interface EvidenciaApiItem {
  id?: number | string | null;
  tituloEvidencia?: string | null;
  titulo?: string | null;
  descricaoEvidencia?: string | null;
  observacaoEvidencia?: string | null;
  nomeEvidencia?: string | null;
}

export function createEmptyPrestacaoMeta(): PrestacaoMeta {
  return {
    id: "",
    metaProjeto: "",
    quantidadeExecutada: "",
    percentualExecutado: undefined,
    observacaoCumprimento: "",
    statusCumprimentoMeta: "",
    justificativaNaoCumprimentoIntegral: "",
    evidencias: [],
  };
}

export function formatQuantidadeExecutada(value?: string | number | null) {
  if (value === null || value === undefined) return "—";

  if (typeof value === "number") {
    if (Number.isNaN(value)) return "—";

    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  const text = value.trim();

  return text || "—";
}

export function mapPrestacaoMeta(dto: PrestacaoMetaDTO): PrestacaoMeta {
  const metaProjetoId = normalizeId(
    dto.metaProjetoId ?? dto.metaProjeto ?? dto.metaId ?? dto.meta,
  );

  const evidencias =
    dto.evidenciasIds ?? dto.evidenciasExecucaoIds ?? dto.evidencias ?? [];

  return {
    id: normalizeId(dto.id),
    metaProjeto: metaProjetoId,
    quantidadeExecutada: normalizeText(dto.quantidadeExecutada),
    percentualExecutado: normalizeNumber(dto.percentualExecutado),
    observacaoCumprimento: dto.observacaoCumprimento ?? "",
    statusCumprimentoMeta: dto.statusCumprimentoMeta ?? "",
    justificativaNaoCumprimentoIntegral:
      dto.justificativaNaoCumprimentoIntegral ?? "",
    evidencias: normalizeEvidenciasIds(evidencias),
  };
}

export function buildPrestacaoMetaPayload(
  item: PrestacaoMeta,
): PrestacaoMetaDTO {
  return {
    id: item.id ? Number(item.id) : undefined,

    metaProjetoId: item.metaProjeto ? Number(item.metaProjeto) : null,

    statusCumprimentoMeta: item.statusCumprimentoMeta as StatusCumprimentoMeta,

    quantidadeExecutada: item.quantidadeExecutada?.trim() || null,

    percentualExecutado:
      item.percentualExecutado == null ||
      Number.isNaN(Number(item.percentualExecutado))
        ? null
        : Number(item.percentualExecutado),

    observacaoCumprimento: item.observacaoCumprimento?.trim() || null,

    justificativaNaoCumprimentoIntegral:
      item.justificativaNaoCumprimentoIntegral?.trim() || null,

    evidenciasIds: (item.evidencias ?? [])
      .filter(Boolean)
      .map(Number)
      .filter((id) => Number.isFinite(id)),
  };
}

export async function getPrestacaoMetas(): Promise<PrestacaoMeta[]> {
  const response = await fetch(`${API_URL}/prestacao-metas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoMetaDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapPrestacaoMeta);
}

export async function getPrestacaoMetaById(
  id: number,
): Promise<PrestacaoMeta> {
  const response = await fetch(`${API_URL}/prestacao-metas/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoMetaDTO = await response.json();

  return mapPrestacaoMeta(data);
}

export async function createPrestacaoMeta(
  payload: PrestacaoMetaDTO,
): Promise<PrestacaoMeta> {
  const response = await fetch(`${API_URL}/prestacao-metas`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoMetaDTO = await response.json();

  return mapPrestacaoMeta(data);
}

export async function updatePrestacaoMeta(
  id: number,
  payload: PrestacaoMetaDTO,
): Promise<PrestacaoMeta> {
  const response = await fetch(`${API_URL}/prestacao-metas/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoMetaDTO = await response.json();

  return mapPrestacaoMeta(data);
}

export async function deletePrestacaoMeta(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prestacao-metas/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getMetasProjetoOptions(): Promise<MetaProjetoOption[]> {
  const response = await fetch(`${API_URL}/metas-projeto`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoApiItem[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        tituloMeta:
          pickFirstText(item.tituloMeta, item.descricaoMeta, item.nome) ||
          `Meta ${id || item.id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getEvidenciasExecucaoOptions(): Promise<
  EvidenciaOption[]
> {
  const response = await fetch(`${API_URL}/evidencias-execucao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EvidenciaApiItem[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        tituloEvidencia:
          pickFirstText(
            item.tituloEvidencia,
            item.nomeEvidencia,
            item.titulo,
            item.descricaoEvidencia,
            item.observacaoEvidencia,
          ) || `Evidência ${id || item.id}`,
      };
    })
    .filter((item) => item.id);
}
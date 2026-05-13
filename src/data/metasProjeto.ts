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

function pickText(...values: Array<unknown>) {
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

    return "";
  }

  return String(value);
}

export interface MetaProjetoDTO {
  id?: number;
  tituloMeta?: string | null;
  descricaoMeta?: string | null;
  quantidadePrevista?: number | string | null;
  formaComprovacao?: string | null;
  ordem?: number | string | null;

  projetoId?: number | string | null;
  projeto?: {
    id?: number | string | null;
    nomeProjeto?: string | null;
    nome?: string | null;
  } | null;

  propostaEditalId?: number | string | null;
  propostaEdital?: {
    id?: number | string | null;
    tituloProjeto?: string | null;
    tituloProposta?: string | null;
    nomeProposta?: string | null;
    nome?: string | null;
  } | null;
}

export interface MetaProjetoPayloadDTO {
  id?: number;
  tituloMeta: string;
  descricaoMeta: string;
  quantidadePrevista: number;
  formaComprovacao: string | null;
  ordem: number;
  projetoId: number;
  propostaEditalId: number | null;
}

export interface MetaProjeto {
  id: string;
  tituloMeta: string;
  descricaoMeta: string;
  quantidadePrevista: number;
  formaComprovacao: string;
  ordem: number;
  projeto: string;
  propostaEdital: string;
}

export interface ProjetoOption {
  id: string;
  nome: string;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
  projetoId?: string;
}

interface ProjetoApiResponse {
  id?: number | string | null;
  nomeProjeto?: string | null;
  nome?: string | null;
}

interface PropostaApiResponse {
  id?: number | string | null;
  tituloProjeto?: string | null;
  tituloProposta?: string | null;
  nomeProposta?: string | null;
  nome?: string | null;
  projetoId?: number | string | null;
  projeto?: {
    id?: number | string | null;
  } | null;
}

function parseQuantidadeValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function mapMetaProjeto(dto: MetaProjetoDTO): MetaProjeto {
  const projetoId = normalizeId(dto.projetoId ?? dto.projeto);
  const propostaEditalId = normalizeId(
    dto.propostaEditalId ?? dto.propostaEdital,
  );

  return {
    id: String(dto.id ?? ""),
    tituloMeta: dto.tituloMeta ?? "",
    descricaoMeta: dto.descricaoMeta ?? "",
    quantidadePrevista: parseQuantidadeValue(dto.quantidadePrevista),
    formaComprovacao: dto.formaComprovacao ?? "",
    ordem: Number(dto.ordem ?? 0),
    projeto: projetoId,
    propostaEdital: propostaEditalId,
  };
}

export function buildMetaProjetoPayload(
  meta: MetaProjeto,
): MetaProjetoPayloadDTO {
  return {
    id: meta.id ? Number(meta.id) : undefined,
    tituloMeta: meta.tituloMeta.trim(),
    descricaoMeta: meta.descricaoMeta.trim(),
    quantidadePrevista: Number(meta.quantidadePrevista),
    formaComprovacao: meta.formaComprovacao.trim() || null,
    ordem: Number(meta.ordem),
    projetoId: Number(meta.projeto),
    propostaEditalId: meta.propostaEdital ? Number(meta.propostaEdital) : null,
  };
}

export async function getMetasProjeto(): Promise<MetaProjeto[]> {
  const response = await fetch(`${API_URL}/metas-projeto`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapMetaProjeto);
}

export async function getMetasProjetoByProjeto(
  projetoId: number,
): Promise<MetaProjeto[]> {
  const response = await fetch(`${API_URL}/metas-projeto/projeto/${projetoId}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapMetaProjeto);
}

export async function getMetasProjetoByProposta(
  propostaEditalId: number,
): Promise<MetaProjeto[]> {
  const response = await fetch(
    `${API_URL}/metas-projeto/proposta/${propostaEditalId}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapMetaProjeto);
}

export async function getMetaProjetoById(id: number): Promise<MetaProjeto> {
  const response = await fetch(`${API_URL}/metas-projeto/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO = await response.json();

  return mapMetaProjeto(data);
}

export async function createMetaProjeto(
  payload: MetaProjetoPayloadDTO,
): Promise<MetaProjeto> {
  const response = await fetch(`${API_URL}/metas-projeto`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO = await response.json();

  return mapMetaProjeto(data);
}

export async function updateMetaProjeto(
  id: number,
  payload: MetaProjetoPayloadDTO,
): Promise<MetaProjeto> {
  const response = await fetch(`${API_URL}/metas-projeto/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: MetaProjetoDTO = await response.json();

  return mapMetaProjeto(data);
}

export async function deleteMetaProjeto(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/metas-projeto/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getProjetosOptions(): Promise<ProjetoOption[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome: pickText(item.nomeProjeto, item.nome) || `Projeto ${item.id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getPropostasEditalOptions(): Promise<
  PropostaEditalOption[]
> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.tituloProjeto,
            item.tituloProposta,
            item.nomeProposta,
            item.nome,
          ) || `Proposta ${item.id}`,
        projetoId:
          item.projetoId != null
            ? String(item.projetoId)
            : item.projeto?.id != null
              ? String(item.projeto.id)
              : undefined,
      };
    })
    .filter((item) => item.id);
}

export const projetoNomeMeta = (
  id?: string,
  projetos: ProjetoOption[] = [],
) => (id ? projetos.find((p) => p.id === id)?.nome ?? "—" : "—");

export const propostaNomeMeta = (
  id?: string,
  propostas: PropostaEditalOption[] = [],
) => (id ? propostas.find((p) => p.id === id)?.nome ?? "—" : "—");

export const formatQuantidade = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
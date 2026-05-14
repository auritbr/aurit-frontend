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

export type AtividadeStatus = "Ativo" | "Inativo" | "Pendente" | "Concluído";

export type StatusAtividadeValue =
  | "ATIVO"
  | "INATIVO"
  | "PENDENTE"
  | "CONCLUIDO";

export type TipoAtividadeValue =
  | "OFICINA"
  | "CURSO"
  | "WORKSHOP"
  | "PALESTRA"
  | "SEMINARIO"
  | "FORMACAO_CONTINUADA"
  | "ATIVIDADE_EDUCATIVA"
  | "INTEGRACAO_COMUNITARIA"
  | "CAPACITACAO_TECNICA"
  | "RODA_DE_CONVERSA"
  | "OUTRO";

export const tiposAtividade = [
  { value: "OFICINA", label: "Oficina" },
  { value: "CURSO", label: "Curso" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "PALESTRA", label: "Palestra" },
  { value: "SEMINARIO", label: "Seminário" },
  { value: "FORMACAO_CONTINUADA", label: "Formação Continuada" },
  { value: "ATIVIDADE_EDUCATIVA", label: "Atividade Educativa" },
  { value: "INTEGRACAO_COMUNITARIA", label: "Integração Comunitária" },
  { value: "CAPACITACAO_TECNICA", label: "Capacitação Técnica" },
  { value: "RODA_DE_CONVERSA", label: "Roda de Conversa" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const statusAtividade = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const statusValueToLabel = (v: string): AtividadeStatus => {
  const map: Record<string, AtividadeStatus> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[v] ?? "Ativo";
};

export const tipoLabel = (v: string) =>
  tiposAtividade.find((t) => t.value === v)?.label ?? v;

export interface AtividadeDTO {
  id?: number | string;
  nomeAtividade: string;
  descricaoAtividade: string;
  publicoBeneficiadoAtividade: string;
  quantidadeVagas: number | string | null;
  dataInicio: string;
  dataFim: string | null;
  localAtividade: string | null;
  tipoAtividade: string;
  status: string;

  projetoId?: number | string | null;
  projetoNome?: string | null;
  projeto?:
    | {
        id?: number | string | null;
        nomeProjeto?: string | null;
        nome?: string | null;
        titulo?: string | null;
      }
    | number
    | string
    | null;

  colaboradoresIds?: Array<number | string> | null;
  colaboradores?: Array<{
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  }> | null;
}

export interface Atividade {
  id: string;
  nomeAtividade: string;
  descricaoAtividade: string;
  publicoBeneficiadoAtividade: string;
  tipoAtividade: string;
  status: string;
  projetoId: string;
  projetoNome?: string;
  colaboradoresIds: string[];
  colaboradoresNomes: string[];
  dataInicio: string;
  dataFim: string;
  quantidadeVagas: string;
  localAtividade: string;
}

export interface ProjetoOption {
  id: string;
  nome: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
}

interface ProjetoApiDTO {
  id?: number | string | null;
  nomeProjeto?: string | null;
  nome?: string | null;
  titulo?: string | null;
}

interface ColaboradorApiDTO {
  id?: number | string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
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

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractColaboradoresIds(dto: AtividadeDTO): string[] {
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

function extractColaboradoresNomes(dto: AtividadeDTO): string[] {
  if (!Array.isArray(dto.colaboradores)) return [];

  return dto.colaboradores
    .map((colaborador) => pickText(colaborador.nomeCompleto, colaborador.nome))
    .filter(Boolean);
}

export function formatDateBr(iso?: string) {
  if (!iso) return "—";

  const [y, m, d] = iso.split("-");

  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function mapAtividade(dto: AtividadeDTO): Atividade {
  const projetoId = normalizeId(dto.projetoId ?? dto.projeto);
  const projetoRecord =
    dto.projeto && typeof dto.projeto === "object"
      ? (dto.projeto as Record<string, unknown>)
      : null;

  return {
    id: normalizeId(dto.id),
    nomeAtividade: dto.nomeAtividade ?? "",
    descricaoAtividade: dto.descricaoAtividade ?? "",
    publicoBeneficiadoAtividade: dto.publicoBeneficiadoAtividade ?? "",
    tipoAtividade: dto.tipoAtividade ?? "",
    status: dto.status ?? "",
    projetoId,
    projetoNome:
      pickText(
        dto.projetoNome,
        projetoRecord?.nomeProjeto,
        projetoRecord?.nome,
        projetoRecord?.titulo,
      ) || undefined,
    colaboradoresIds: extractColaboradoresIds(dto),
    colaboradoresNomes: extractColaboradoresNomes(dto),
    dataInicio: dto.dataInicio ?? "",
    dataFim: dto.dataFim ?? "",
    quantidadeVagas:
      dto.quantidadeVagas != null ? String(dto.quantidadeVagas) : "",
    localAtividade: dto.localAtividade ?? "",
  };
}

export function buildAtividadePayload(data: Atividade): AtividadeDTO {
  return {
    id: data.id ? Number(data.id) : undefined,
    nomeAtividade: data.nomeAtividade.trim(),
    descricaoAtividade: data.descricaoAtividade.trim(),
    publicoBeneficiadoAtividade: data.publicoBeneficiadoAtividade.trim(),
    quantidadeVagas: data.quantidadeVagas.trim()
      ? Number(data.quantidadeVagas)
      : null,
    dataInicio: data.dataInicio,
    dataFim: data.dataFim || null,
    localAtividade: data.localAtividade.trim() || null,
    tipoAtividade: data.tipoAtividade,
    status: data.status,
    projetoId: Number(data.projetoId),
    colaboradoresIds: (data.colaboradoresIds ?? [])
      .filter(
        (id) => id !== null && id !== undefined && String(id).trim() !== "",
      )
      .map(Number),
  };
}

export async function getAtividades(): Promise<Atividade[]> {
  const response = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeDTO[] = await response.json();

  return (data ?? []).map(mapAtividade);
}

export async function getAtividadeById(id: number): Promise<Atividade> {
  const response = await fetch(`${API_URL}/atividades/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeDTO = await response.json();

  return mapAtividade(data);
}

export async function getAtividadesByProjeto(
  projetoId: number,
): Promise<Atividade[]> {
  const response = await fetch(`${API_URL}/atividades/projeto/${projetoId}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeDTO[] = await response.json();

  return (data ?? []).map(mapAtividade);
}

export async function createAtividade(
  payload: AtividadeDTO,
): Promise<Atividade> {
  const response = await fetch(`${API_URL}/atividades`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeDTO = await response.json();

  return mapAtividade(data);
}

export async function updateAtividade(
  id: number,
  payload: AtividadeDTO,
): Promise<Atividade> {
  const response = await fetch(`${API_URL}/atividades/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeDTO = await response.json();

  return mapAtividade(data);
}

export async function deleteAtividade(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/atividades/${id}`, {
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

  const data: ProjetoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((projeto) => {
      const id = normalizeId(projeto.id);

      return {
        id,
        nome:
          pickText(projeto.nomeProjeto, projeto.nome, projeto.titulo) ||
          `Projeto ${id}`,
      };
    })
    .filter((projeto) => projeto.id);
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
    .filter((colaborador) => colaborador.id);
}

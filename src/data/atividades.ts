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
  id?: number;
  nomeAtividade: string;
  descricaoAtividade: string;
  publicoBeneficiadoAtividade: string;
  quantidadeVagas: number | null;
  dataInicio: string;
  dataFim: string | null;
  localAtividade: string | null;
  tipoAtividade: string;
  status: string;
  projetoId: number;
  colaboradoresIds: number[];
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
  id?: number;
  nomeProjeto?: string;
}

interface ColaboradorApiDTO {
  id?: number;
  nomeCompleto?: string;
}

export function formatDateBr(iso?: string) {
  if (!iso) return "—";

  const [y, m, d] = iso.split("-");

  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function mapAtividade(dto: AtividadeDTO): Atividade {
  return {
    id: String(dto.id ?? ""),
    nomeAtividade: dto.nomeAtividade ?? "",
    descricaoAtividade: dto.descricaoAtividade ?? "",
    publicoBeneficiadoAtividade: dto.publicoBeneficiadoAtividade ?? "",
    tipoAtividade: dto.tipoAtividade ?? "",
    status: dto.status ?? "",
    projetoId: dto.projetoId != null ? String(dto.projetoId) : "",
    colaboradoresIds: (dto.colaboradoresIds ?? []).map(String),
    colaboradoresNomes: [],
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
      .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
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

  return (data ?? [])
    .filter((p) => p.id != null)
    .map((p) => ({
      id: String(p.id),
      nome: p.nomeProjeto?.trim() || `Projeto ${p.id}`,
    }));
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

  return (data ?? [])
    .filter((c) => c.id != null)
    .map((c) => ({
      id: String(c.id),
      nome: c.nomeCompleto?.trim() || `Colaborador ${c.id}`,
    }));
}
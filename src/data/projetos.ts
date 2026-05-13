const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type StatusProjeto = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";

export type AreaAtuacao =
  | "CULTURA_ARTE"
  | "EDUCACAO"
  | "ASSISTENCIA_SOCIAL"
  | "ESPORTE"
  | "MEIO_AMBIENTE"
  | "ECONOMIA"
  | "DIREITOS_HUMANOS"
  | "SAUDE"
  | "TECNOLOGIA"
  | "OUTRO";

export type OrigemProjeto =
  | "EDITAL"
  | "RECURSO_PROPRIO"
  | "PARCERIA"
  | "PATROCINIO"
  | "DOACAO"
  | "VOLUNTARIO"
  | "INSTITUCIONAL"
  | "OUTRO";

export const statusProjetoOptions: { value: StatusProjeto; label: string }[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
];

export const areaAtuacaoOptions: { value: AreaAtuacao; label: string }[] = [
  { value: "CULTURA_ARTE", label: "Cultura e Arte" },
  { value: "EDUCACAO", label: "Educação" },
  { value: "ASSISTENCIA_SOCIAL", label: "Assistência Social" },
  { value: "ESPORTE", label: "Esporte" },
  { value: "MEIO_AMBIENTE", label: "Meio Ambiente" },
  { value: "ECONOMIA", label: "Economia" },
  { value: "DIREITOS_HUMANOS", label: "Direitos Humanos" },
  { value: "SAUDE", label: "Saúde" },
  { value: "TECNOLOGIA", label: "Tecnologia" },
  { value: "OUTRO", label: "Outro" },
];

export const origemProjetoOptions: { value: OrigemProjeto; label: string }[] = [
  { value: "EDITAL", label: "Edital" },
  { value: "RECURSO_PROPRIO", label: "Recurso Próprio" },
  { value: "PARCERIA", label: "Parceria" },
  { value: "PATROCINIO", label: "Patrocínio" },
  { value: "DOACAO", label: "Doação" },
  { value: "VOLUNTARIO", label: "Voluntário" },
  { value: "INSTITUCIONAL", label: "Institucional" },
  { value: "OUTRO", label: "Outro" },
];

export const statusProjetoLabel = (v?: StatusProjeto | string) =>
  statusProjetoOptions.find((s) => s.value === v)?.label ?? v ?? "—";

export const areaAtuacaoLabel = (v?: AreaAtuacao | string) =>
  areaAtuacaoOptions.find((a) => a.value === v)?.label ?? v ?? "—";

export const origemProjetoLabel = (v?: OrigemProjeto | string) =>
  origemProjetoOptions.find((o) => o.value === v)?.label ?? v ?? "—";

function isoToBr(date?: string | null) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function brToIso(date?: string | null) {
  if (!date) return "";

  const clean = date.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const [day, month, year] = clean.split("/");

  if (!day || !month || !year) {
    return clean;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

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

function normalizeId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      const id = Number(record.id);
      return Number.isFinite(id) ? id : null;
    }
  }

  const id = Number(value);

  return Number.isFinite(id) ? id : null;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export interface ObjetivoDTO {
  id?: number;
  objetivoEspecifico: string;
  projetoId?: number;
}

export interface ProjetoDTO {
  id?: number;
  nomeProjeto: string;
  descricao: string;
  objetivoGeral: string;
  publicoAlvo: string;
  acoesAcessibilidade: string;
  localExecucao: string;
  dataInicio: string;
  dataFim: string;
  areaAtuacao: AreaAtuacao;
  status: StatusProjeto;
  origemProjeto: OrigemProjeto;
  organizacaoId: number;
  objetivos: ObjetivoDTO[];
  colaboradoresIds: number[];
}

export interface Projeto {
  id: number;
  nomeProjeto: string;
  descricao: string;
  objetivoGeral: string;
  publicoAlvo: string;
  acoesAcessibilidade: string;
  localExecucao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusProjeto;
  areaAtuacao: AreaAtuacao;
  origemProjeto: OrigemProjeto;
  organizacaoId: number | null;
  colaboradoresIds: number[];
  objetivos: ObjetivoDTO[];
}

export interface OrganizacaoOption {
  id: number;
  nome: string;
}

interface OrganizacaoApiResponse {
  id?: number;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
}

export function mapProjeto(dto: ProjetoDTO): Projeto {
  const organizacaoId = normalizeId(dto.organizacaoId);

  return {
    id: Number(dto.id ?? 0),
    nomeProjeto: dto.nomeProjeto ?? "",
    descricao: dto.descricao ?? "",
    objetivoGeral: dto.objetivoGeral ?? "",
    publicoAlvo: dto.publicoAlvo ?? "",
    acoesAcessibilidade: dto.acoesAcessibilidade ?? "",
    localExecucao: dto.localExecucao ?? "",
    dataInicio: isoToBr(dto.dataInicio),
    dataFim: isoToBr(dto.dataFim),
    status: dto.status ?? "ATIVO",
    areaAtuacao: dto.areaAtuacao ?? "OUTRO",
    origemProjeto: dto.origemProjeto ?? "OUTRO",
    organizacaoId,
    colaboradoresIds: (dto.colaboradoresIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id)),
    objetivos: (dto.objetivos ?? []).map((objetivo) => ({
      id: objetivo.id,
      objetivoEspecifico: objetivo.objetivoEspecifico ?? "",
      projetoId: objetivo.projetoId,
    })),
  };
}

export function buildProjetoPayload(projeto: Projeto): ProjetoDTO {
  if (projeto.organizacaoId === null || projeto.organizacaoId === undefined) {
    throw new Error("Organização é obrigatória.");
  }

  return {
    id: projeto.id ? Number(projeto.id) : undefined,
    nomeProjeto: projeto.nomeProjeto.trim(),
    descricao: projeto.descricao.trim(),
    objetivoGeral: projeto.objetivoGeral.trim(),
    publicoAlvo: projeto.publicoAlvo.trim(),
    acoesAcessibilidade: projeto.acoesAcessibilidade.trim(),
    localExecucao: projeto.localExecucao.trim(),
    dataInicio: brToIso(projeto.dataInicio),
    dataFim: brToIso(projeto.dataFim),
    status: projeto.status,
    areaAtuacao: projeto.areaAtuacao,
    origemProjeto: projeto.origemProjeto,
    organizacaoId: Number(projeto.organizacaoId),
    objetivos: (projeto.objetivos ?? [])
      .map((objetivo) => ({
        id: objetivo.id,
        objetivoEspecifico: objetivo.objetivoEspecifico.trim(),
        projetoId: objetivo.projetoId,
      }))
      .filter((objetivo) => objetivo.objetivoEspecifico),
    colaboradoresIds: (projeto.colaboradoresIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id)),
  };
}

export async function getProjetos(): Promise<Projeto[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapProjeto);
}

export async function getProjetoById(id: number): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoDTO = await response.json();

  return mapProjeto(data);
}

export async function createProjeto(payload: ProjetoDTO): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoDTO = await response.json();

  return mapProjeto(data);
}

export async function updateProjeto(
  id: number,
  payload: ProjetoDTO,
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoDTO = await response.json();

  return mapProjeto(data);
}

export async function deleteProjeto(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoes(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => ({
      id: Number(item.id),
      nome:
        pickText(
          item.razaoSocial,
          item.nomeFantasia,
          item.nomeOrganizacao,
          item.nome,
        ) || `Organização ${item.id}`,
    }));
}
import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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

export const areasAtuacaoLabel = (values?: Array<AreaAtuacao | string>) => {
  const areas = Array.from(new Set(values ?? [])).filter(Boolean);

  if (areas.length === 0) {
    return "—";
  }

  return areas.map((area) => areaAtuacaoLabel(area)).join(", ");
};

export const origemProjetoLabel = (v?: OrigemProjeto | string) =>
  origemProjetoOptions.find((o) => o.value === v)?.label ?? v ?? "—";

function isoToBr(date?: string | null) {
  if (!date) return "";

  const clean = String(date).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return clean;

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
        json?.message || json?.error || json?.detail || json?.mensagem || text
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

function resolveOrganizacaoId(dto: ProjetoApiResponse): number | null {
  return normalizeId(
    dto.organizacaoId ??
    dto.idOrganizacao ??
    dto.organizacao_id ??
    dto.organizacaoID ??
    dto.organizacao ??
    dto.empresaId ??
    dto.configuracaoEmpresaId,
  );
}

function resolveColaboradoresIds(dto: ProjetoApiResponse): number[] {
  const raw =
    dto.colaboradoresIds ??
    dto.colaboradorIds ??
    dto.colaboradores_ids ??
    dto.colaboradores ??
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => normalizeId(item))
    .filter((id): id is number => id !== null);
}

function resolveObjetivos(dto: ProjetoApiResponse): ObjetivoDTO[] {
  const raw = dto.objetivos ?? dto.objetivosEspecificos ?? [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((objetivo) => {
      if (typeof objetivo === "string") {
        return {
          objetivoEspecifico: objetivo,
        };
      }

      const record = objetivo as Record<string, unknown>;

      return {
        id: normalizeId(record.id) ?? undefined,
        objetivoEspecifico: pickText(
          record.objetivoEspecifico,
          record.descricao,
          record.texto,
          record.nome,
        ),
        projetoId: normalizeId(record.projetoId ?? record.projeto) ?? undefined,
      };
    })
    .filter((objetivo) => objetivo.objetivoEspecifico.trim());
}

function normalizeAreaAtuacao(value: unknown): AreaAtuacao | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return clean as AreaAtuacao;
}

function resolveAreasAtuacao(dto: ProjetoApiResponse): AreaAtuacao[] {
  const raw = dto.areasAtuacao ?? dto.areas_atuacao ?? dto.areaAtuacao ?? [];
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return Array.from(
    new Set(
      values
        .map((item) => normalizeAreaAtuacao(item))
        .filter((item): item is AreaAtuacao => item !== null),
    ),
  );
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
  areasAtuacao: AreaAtuacao[];
  status: StatusProjeto;
  origemProjeto: OrigemProjeto;
  organizacaoId: number;
  objetivos: ObjetivoDTO[];
  colaboradoresIds: number[];
}

interface ProjetoApiResponse {
  id?: number | string;

  nomeProjeto?: string | null;
  descricao?: string | null;
  objetivoGeral?: string | null;
  publicoAlvo?: string | null;
  acoesAcessibilidade?: string | null;
  localExecucao?: string | null;

  dataInicio?: string | null;
  dataFim?: string | null;

  areasAtuacao?: unknown;
  areas_atuacao?: unknown;
  areaAtuacao?: AreaAtuacao | string | null;
  status?: StatusProjeto | string | null;
  origemProjeto?: OrigemProjeto | string | null;

  organizacaoId?: number | string | null;
  idOrganizacao?: number | string | null;
  organizacao_id?: number | string | null;
  organizacaoID?: number | string | null;
  organizacao?: unknown;
  empresaId?: number | string | null;
  configuracaoEmpresaId?: number | string | null;

  objetivos?: unknown[];
  objetivosEspecificos?: unknown[];

  colaboradoresIds?: unknown[];
  colaboradorIds?: unknown[];
  colaboradores_ids?: unknown[];
  colaboradores?: unknown[];
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
  areasAtuacao: AreaAtuacao[];
  /** Compatibilidade com registros antigos que ainda possam chegar com uma única área. */
  areaAtuacao?: AreaAtuacao;
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
  id?: number | string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
}

export function mapProjeto(dto: ProjetoApiResponse): Projeto {
  const organizacaoId = resolveOrganizacaoId(dto);

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
    status: (dto.status ?? "ATIVO") as StatusProjeto,
    areasAtuacao: resolveAreasAtuacao(dto),
    areaAtuacao: resolveAreasAtuacao(dto)[0],
    origemProjeto: (dto.origemProjeto ?? "OUTRO") as OrigemProjeto,
    organizacaoId,
    colaboradoresIds: resolveColaboradoresIds(dto),
    objetivos: resolveObjetivos(dto),
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
    areasAtuacao: Array.from(new Set(projeto.areasAtuacao ?? [])).filter(Boolean),
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
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapProjeto);
}

export async function getProjetoById(id: number): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse = await response.json();

  return mapProjeto(data);
}

export async function createProjeto(payload: ProjetoDTO): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse = await response.json();

  return mapProjeto(data);
}

export async function updateProjeto(
  id: number,
  payload: ProjetoDTO,
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse = await response.json();

  return mapProjeto(data);
}

export async function deleteProjeto(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/projetos/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoes(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
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
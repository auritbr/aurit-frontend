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

      if (response.status === 409) {
        return "Já existe um registro com essas informações.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      if (typeof json === "string") {
        return json;
      }

      const message =
        json?.message ||
        json?.mensagem ||
        json?.erro ||
        json?.error ||
        json?.detail ||
        json?.title;

      if (message) {
        return String(message);
      }

      if (Array.isArray(json?.errors) && json.errors.length > 0) {
        const firstError = json.errors[0];

        if (typeof firstError === "string") {
          return firstError;
        }

        return (
          firstError?.message ||
          firstError?.defaultMessage ||
          firstError?.field ||
          "Erro de validação nos dados enviados."
        );
      }

      return text;
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export type TipoSecaoCurriculo =
  | "FORMACAO_ACADEMICA"
  | "ATUACAO_PROFISSIONAL"
  | "EXPERIENCIAS"
  | "ATIVIDADES_FORMATIVAS_PARTICIPACOES"
  | "HABILIDADES_COMPETENCIAS"
  | "ATUACAO_SOCIOCULTURAL";

export interface CurriculoItemDTO {
  id?: number;
  tipoSecaoCurriculo: TipoSecaoCurriculo;
  textoItem: string;
  ordem?: number | null;
}

export interface CurriculoDTO {
  id?: number;
  colaboradorId: number;
  colaboradorNome?: string;
  nomeCompleto?: string;
  email?: string;
  telefone?: string;
  enderecoCompleto?: string;
  cidadeAssinatura?: string;
  estadoAssinatura?: string;
  dataAssinaturaTexto?: string;
  nomeAssinatura?: string;
  itens: CurriculoItemDTO[];
}

interface CurriculoUpdatePayload {
  colaboradorId: number;
  itens: CurriculoItemDTO[];
}

export interface CurriculoFormData {
  colaboradorId: string;
  colaboradorNome: string;
  formacaoAcademica: string[];
  atuacaoProfissional: string[];
  experienciasRelevantes: string[];
  atividadesFormativasParticipacoes: string[];
  habilidadesCompetencias: string[];
  atuacaoSociocultural: string[];
}

export interface CurriculoListItem {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  enderecoCompleto: string;
  cidadeAssinatura: string;
  estadoAssinatura: string;
  dataAssinaturaTexto: string;
  nomeAssinatura: string;
  formacaoAcademica: string[];
  atuacaoProfissional: string[];
  experienciasRelevantes: string[];
  atividadesFormativasParticipacoes: string[];
  habilidadesCompetencias: string[];
  atuacaoSociocultural: string[];
}

export interface ColaboradorCurriculoOption {
  id: string;
  nome: string;
}

export const TIPOS_SECAO = {
  formacaoAcademica: "FORMACAO_ACADEMICA",
  atuacaoProfissional: "ATUACAO_PROFISSIONAL",
  experienciasRelevantes: "EXPERIENCIAS",
  atividadesFormativasParticipacoes: "ATIVIDADES_FORMATIVAS_PARTICIPACOES",
  habilidadesCompetencias: "HABILIDADES_COMPETENCIAS",
  atuacaoSociocultural: "ATUACAO_SOCIOCULTURAL",
} as const;

const SECOES_FORM = [
  "formacaoAcademica",
  "atuacaoProfissional",
  "experienciasRelevantes",
  "atividadesFormativasParticipacoes",
  "habilidadesCompetencias",
  "atuacaoSociocultural",
] as const;

type SecaoFormKey = (typeof SECOES_FORM)[number];

export const initialCurriculoFormData: CurriculoFormData = {
  colaboradorId: "",
  colaboradorNome: "",
  formacaoAcademica: [],
  atuacaoProfissional: [],
  experienciasRelevantes: [],
  atividadesFormativasParticipacoes: [],
  habilidadesCompetencias: [],
  atuacaoSociocultural: [],
};

export function cleanList(arr: string[]): string[] {
  return (arr ?? []).map((s) => s.trim()).filter(Boolean);
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }

    return "";
  }

  return String(value);
}

function pickText(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getTipoBySecao(secao: SecaoFormKey): TipoSecaoCurriculo {
  return TIPOS_SECAO[secao];
}

function getExistingItemId(
  existing: CurriculoDTO | undefined,
  tipo: TipoSecaoCurriculo,
  index: number,
): number | undefined {
  if (!existing?.itens?.length) {
    return undefined;
  }

  const itensDaSecao = existing.itens
    .filter((item) => item.tipoSecaoCurriculo === tipo)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return itensDaSecao[index]?.id;
}

function resolveNomeColaborador(dto?: CurriculoDTO | null): string {
  if (!dto) return "";

  return pickText(dto.colaboradorNome, dto.nomeCompleto, dto.nomeAssinatura);
}

export function dtoToForm(dto: CurriculoDTO): CurriculoFormData {
  const grouped: Record<SecaoFormKey, string[]> = {
    formacaoAcademica: [],
    atuacaoProfissional: [],
    experienciasRelevantes: [],
    atividadesFormativasParticipacoes: [],
    habilidadesCompetencias: [],
    atuacaoSociocultural: [],
  };

  const itensOrdenados = [...(dto.itens ?? [])].sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
  );

  for (const item of itensOrdenados) {
    switch (item.tipoSecaoCurriculo) {
      case "FORMACAO_ACADEMICA":
        grouped.formacaoAcademica.push(item.textoItem);
        break;

      case "ATUACAO_PROFISSIONAL":
        grouped.atuacaoProfissional.push(item.textoItem);
        break;

      case "EXPERIENCIAS":
        grouped.experienciasRelevantes.push(item.textoItem);
        break;

      case "ATIVIDADES_FORMATIVAS_PARTICIPACOES":
        grouped.atividadesFormativasParticipacoes.push(item.textoItem);
        break;

      case "HABILIDADES_COMPETENCIAS":
        grouped.habilidadesCompetencias.push(item.textoItem);
        break;

      case "ATUACAO_SOCIOCULTURAL":
        grouped.atuacaoSociocultural.push(item.textoItem);
        break;
    }
  }

  return {
    colaboradorId: normalizeId(dto.colaboradorId),
    colaboradorNome: resolveNomeColaborador(dto),
    ...grouped,
  };
}

export function formToDto(
  form: CurriculoFormData,
  existing?: CurriculoDTO,
): CurriculoDTO {
  const itens: CurriculoItemDTO[] = [];
  let ordemAtual = 1;

  const pushSection = (
    secao: SecaoFormKey,
    tipo: TipoSecaoCurriculo,
    values: string[],
  ) => {
    cleanList(values).forEach((textoItem, index) => {
      itens.push({
        id: getExistingItemId(existing, tipo, index),
        tipoSecaoCurriculo: tipo,
        textoItem,
        ordem: ordemAtual,
      });

      ordemAtual += 1;
    });
  };

  for (const secao of SECOES_FORM) {
    pushSection(secao, getTipoBySecao(secao), form[secao]);
  }

  const colaboradorId = Number(
    form.colaboradorId || existing?.colaboradorId || 0,
  );

  return {
    id: existing?.id,
    colaboradorId,
    colaboradorNome:
      form.colaboradorNome ||
      existing?.colaboradorNome ||
      existing?.nomeCompleto ||
      undefined,
    itens,
  };
}

function buildUpdatePayload(payload: CurriculoDTO): CurriculoUpdatePayload {
  return {
    colaboradorId: Number(payload.colaboradorId),
    itens: (payload.itens ?? [])
      .map((item, index) => ({
        ...(item.id != null ? { id: Number(item.id) } : {}),
        tipoSecaoCurriculo: item.tipoSecaoCurriculo,
        textoItem: item.textoItem?.trim() ?? "",
        ordem: Number(item.ordem ?? index + 1),
      }))
      .filter((item) => item.tipoSecaoCurriculo && item.textoItem),
  };
}

function maskAuthorizationHeader(value?: string) {
  if (!value) return null;

  const token = value.replace(/^Bearer\s+/i, "");

  return `Bearer ${token.slice(0, 12)}...${token.slice(-8)} (${token.length} chars)`;
}

function logCurriculoUpdateRequest(
  url: string,
  headers: Record<string, string>,
  payload: CurriculoUpdatePayload,
) {
  console.info("[curriculos] PUT request", {
    method: "PUT",
    url,
    headers: {
      "Content-Type": headers["Content-Type"] ?? null,
      Authorization: maskAuthorizationHeader(headers.Authorization),
      "X-Tenant-Slug": headers["X-Tenant-Slug"] ?? null,
    },
    payload,
  });
}

export function dtoToListItem(dto: CurriculoDTO): CurriculoListItem {
  const form = dtoToForm(dto);
  const nomeColaborador = resolveNomeColaborador(dto);

  return {
    id: normalizeId(dto.id),
    colaboradorId: normalizeId(dto.colaboradorId),
    colaboradorNome: nomeColaborador,
    nomeCompleto: nomeColaborador || "—",
    email: dto.email ?? "",
    telefone: dto.telefone ?? "",
    enderecoCompleto: dto.enderecoCompleto ?? "",
    cidadeAssinatura: dto.cidadeAssinatura ?? "",
    estadoAssinatura: dto.estadoAssinatura ?? "",
    dataAssinaturaTexto: dto.dataAssinaturaTexto ?? "",
    nomeAssinatura: dto.nomeAssinatura ?? nomeColaborador,
    formacaoAcademica: form.formacaoAcademica,
    atuacaoProfissional: form.atuacaoProfissional,
    experienciasRelevantes: form.experienciasRelevantes,
    atividadesFormativasParticipacoes: form.atividadesFormativasParticipacoes,
    habilidadesCompetencias: form.habilidadesCompetencias,
    atuacaoSociocultural: form.atuacaoSociocultural,
  };
}

function listItemToDto(item: CurriculoListItem): CurriculoDTO {
  const itens: CurriculoItemDTO[] = [];
  let ordemAtual = 1;

  const pushSection = (
    values: string[],
    tipoSecaoCurriculo: TipoSecaoCurriculo,
  ) => {
    cleanList(values).forEach((textoItem) => {
      itens.push({
        tipoSecaoCurriculo,
        textoItem,
        ordem: ordemAtual,
      });

      ordemAtual += 1;
    });
  };

  pushSection(item.formacaoAcademica, "FORMACAO_ACADEMICA");
  pushSection(item.atuacaoProfissional, "ATUACAO_PROFISSIONAL");
  pushSection(item.experienciasRelevantes, "EXPERIENCIAS");
  pushSection(
    item.atividadesFormativasParticipacoes,
    "ATIVIDADES_FORMATIVAS_PARTICIPACOES",
  );
  pushSection(item.habilidadesCompetencias, "HABILIDADES_COMPETENCIAS");
  pushSection(item.atuacaoSociocultural, "ATUACAO_SOCIOCULTURAL");

  return {
    id: Number(item.id),
    colaboradorId: Number(item.colaboradorId),
    colaboradorNome: item.colaboradorNome,
    nomeCompleto: item.nomeCompleto,
    email: item.email,
    telefone: item.telefone,
    enderecoCompleto: item.enderecoCompleto,
    cidadeAssinatura: item.cidadeAssinatura,
    estadoAssinatura: item.estadoAssinatura,
    dataAssinaturaTexto: item.dataAssinaturaTexto,
    nomeAssinatura: item.nomeAssinatura,
    itens,
  };
}

export async function getCurriculos(): Promise<CurriculoListItem[]> {
  const response = await fetch(`${API_URL}/curriculos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CurriculoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(dtoToListItem);
}

export async function getCurriculoById(id: number): Promise<CurriculoDTO> {
  const response = await fetch(`${API_URL}/curriculos/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    if (response.status === 403) {
      const curriculos = await getCurriculos();
      const curriculo = curriculos.find((item) => Number(item.id) === id);

      if (curriculo) {
        return listItemToDto(curriculo);
      }
    }

    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function createCurriculo(
  payload: CurriculoDTO,
): Promise<CurriculoDTO> {
  const response = await fetch(`${API_URL}/curriculos`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function updateCurriculo(
  id: number,
  payload: CurriculoDTO,
): Promise<CurriculoDTO> {
  const url = `${API_URL}/curriculos/${id}`;
  const headers = getJsonHeaders();
  const updatePayload = buildUpdatePayload(payload);

  logCurriculoUpdateRequest(url, headers, updatePayload);

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function deleteCurriculo(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/curriculos/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getColaboradoresCurriculo(): Promise<
  ColaboradorCurriculoOption[]
> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: Array<{
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  }> = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((c) => ({
      id: normalizeId(c.id),
      nome: pickText(c.nomeCompleto, c.nome) || `Colaborador ${c.id}`,
    }))
    .filter((c) => c.id);
}

import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `Erro ${response.status} ao processar requisição.`;
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

export interface CurriculoFormData {
  colaboradorId: string;
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
    colaboradorId: String(dto.colaboradorId ?? ""),
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

  return {
    id: existing?.id,
    colaboradorId: Number(form.colaboradorId),
    itens,
  };
}

export function dtoToListItem(dto: CurriculoDTO): CurriculoListItem {
  const form = dtoToForm(dto);

  return {
    id: String(dto.id ?? ""),
    colaboradorId: String(dto.colaboradorId ?? ""),
    nomeCompleto: dto.nomeCompleto ?? "—",
    email: dto.email ?? "",
    telefone: dto.telefone ?? "",
    enderecoCompleto: dto.enderecoCompleto ?? "",
    cidadeAssinatura: dto.cidadeAssinatura ?? "",
    estadoAssinatura: dto.estadoAssinatura ?? "",
    dataAssinaturaTexto: dto.dataAssinaturaTexto ?? "",
    nomeAssinatura: dto.nomeAssinatura ?? dto.nomeCompleto ?? "",
    formacaoAcademica: form.formacaoAcademica,
    atuacaoProfissional: form.atuacaoProfissional,
    experienciasRelevantes: form.experienciasRelevantes,
    atividadesFormativasParticipacoes: form.atividadesFormativasParticipacoes,
    habilidadesCompetencias: form.habilidadesCompetencias,
    atuacaoSociocultural: form.atuacaoSociocultural,
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

  return (data ?? []).map(dtoToListItem);
}

export async function getCurriculoById(id: number): Promise<CurriculoDTO> {
  const response = await fetch(`${API_URL}/curriculos/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
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
  const response = await fetch(`${API_URL}/curriculos/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
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

  const data: Array<{ id: number; nomeCompleto?: string }> =
    await response.json();

  return (data ?? [])
    .filter((c) => c.id != null)
    .map((c) => ({
      id: String(c.id),
      nome: c.nomeCompleto?.trim() || `Colaborador ${c.id}`,
    }));
}
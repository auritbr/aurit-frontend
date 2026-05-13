import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const tipoPatrimonioOptions = [
  { value: "INSTRUMENTO_MUSICAL", label: "Instrumento Musical" },
  { value: "EQUIPAMENTO_SOM", label: "Equipamento de Som" },
  { value: "EQUIPAMENTO_ILUMINACAO", label: "Equipamento de Iluminação" },
  { value: "EQUIPAMENTO_AUDIOVISUAL", label: "Equipamento Audiovisual" },
  { value: "EQUIPAMENTO_INFORMATICA", label: "Equipamento de Informática" },
  { value: "MOBILIARIO", label: "Mobiliário" },
  { value: "FIGURINO", label: "Figurino" },
  { value: "MATERIAL_CENICO", label: "Material Cênico" },
  { value: "MATERIAL_PEDAGOGICO", label: "Material Pedagógico" },
  { value: "MATERIAL_ESCRITORIO", label: "Material de Escritório" },
  { value: "VEICULO", label: "Veículo" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const estadoConservacaoOptions = [
  { value: "NOVO", label: "Novo" },
  { value: "USADO", label: "Usado" },
  { value: "DANIFICADO", label: "Danificado" },
  { value: "INUTILIZADO", label: "Inutilizado" },
] as const;

export const statusPatrimonioOptions = [
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "EMPRESTADO", label: "Emprestado" },
  { value: "EM_MANUTENCAO", label: "Em Manutenção" },
  { value: "BAIXADO", label: "Baixado" },
] as const;

export type TipoPatrimonioApi =
  | "INSTRUMENTO_MUSICAL"
  | "EQUIPAMENTO_SOM"
  | "EQUIPAMENTO_ILUMINACAO"
  | "EQUIPAMENTO_AUDIOVISUAL"
  | "EQUIPAMENTO_INFORMATICA"
  | "MOBILIARIO"
  | "FIGURINO"
  | "MATERIAL_CENICO"
  | "MATERIAL_PEDAGOGICO"
  | "MATERIAL_ESCRITORIO"
  | "VEICULO"
  | "OUTRO";

export type EstadoConservacaoApi =
  | "NOVO"
  | "USADO"
  | "DANIFICADO"
  | "INUTILIZADO";

export type StatusPatrimonioApi =
  | "DISPONIVEL"
  | "EMPRESTADO"
  | "EM_MANUTENCAO"
  | "BAIXADO";

export interface PatrimonioDTO {
  id?: number;

  numeroPatrimonio?: string | null;
  nomePatrimonio?: string | null;
  dataAquisicao?: string | null;
  descricaoPatrimonio?: string | null;
  valorPatrimonio?: number | null;

  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  urlNotaFiscal?: string | null;

  tipoPatrimonio?: TipoPatrimonioApi | null;
  estadoConservacao?: EstadoConservacaoApi | null;
  statusPatrimonio?: StatusPatrimonioApi | null;

  organizacaoId?: number | string | null;
  organizacao?: {
    id?: number | string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
    nomeOrganizacao?: string | null;
    nome?: string | null;
  } | null;

  projetoId?: number | string | null;
  projeto?: {
    id?: number | string | null;
    nomeProjeto?: string | null;
    nome?: string | null;
    titulo?: string | null;
  } | null;
}

export interface PatrimonioPayloadDTO {
  id?: number;

  numeroPatrimonio: string;
  nomePatrimonio: string;
  dataAquisicao: string;
  descricaoPatrimonio: string;
  valorPatrimonio?: number | null;

  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  urlNotaFiscal?: string | null;

  tipoPatrimonio: TipoPatrimonioApi;
  estadoConservacao: EstadoConservacaoApi;
  statusPatrimonio: StatusPatrimonioApi;

  organizacaoId?: number | null;
  projetoId?: number | null;
}

export interface Patrimonio {
  id: number;

  numeroPatrimonio: string;
  nomePatrimonio: string;
  dataAquisicao: string;
  descricaoPatrimonio: string;
  valorPatrimonio?: number;

  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  urlNotaFiscal?: string;

  tipoPatrimonio: TipoPatrimonioApi;
  estadoConservacao: EstadoConservacaoApi;
  statusPatrimonio: StatusPatrimonioApi;

  organizacaoId: number | null;
  projetoId?: number | null;
}

export interface OrganizacaoOption {
  id: number;
  nome: string;
}

export interface ProjetoOption {
  id: number;
  nome: string;
}

interface ProjetoPatrimonioApiDTO {
  id?: number | string | null;
  nomeProjeto?: string | null;
  nome?: string | null;
  titulo?: string | null;
}

interface OrganizacaoApiDTO {
  id?: number | string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
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

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeNumberId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      const parsed = Number(record.id);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isoToBr(date?: string | null) {
  if (!date) return "";

  const value = date.length >= 10 ? date.slice(0, 10) : date;
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function brToIso(date?: string | null) {
  if (!date) return "";

  const clean = date.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const [day, month, year] = clean.split("/");

  if (!day || !month || !year) return clean;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export const tipoPatrimonioLabel = (v?: string | null) =>
  tipoPatrimonioOptions.find((o) => o.value === v)?.label ?? v ?? "—";

export const estadoConservacaoLabel = (v?: string | null) =>
  estadoConservacaoOptions.find((o) => o.value === v)?.label ?? v ?? "—";

export const statusPatrimonioLabel = (v?: string | null) =>
  statusPatrimonioOptions.find((o) => o.value === v)?.label ?? v ?? "—";

export function mapPatrimonio(dto: PatrimonioDTO): Patrimonio {
  return {
    id: Number(dto.id ?? 0),

    numeroPatrimonio: dto.numeroPatrimonio ?? "",
    nomePatrimonio: dto.nomePatrimonio ?? "",
    dataAquisicao: isoToBr(dto.dataAquisicao),
    descricaoPatrimonio: dto.descricaoPatrimonio ?? "",
    valorPatrimonio:
      dto.valorPatrimonio == null ? undefined : Number(dto.valorPatrimonio),

    marca: dto.marca ?? "",
    modelo: dto.modelo ?? "",
    numeroSerie: dto.numeroSerie ?? "",
    urlNotaFiscal: dto.urlNotaFiscal ?? "",

    tipoPatrimonio: dto.tipoPatrimonio ?? "OUTRO",
    estadoConservacao: dto.estadoConservacao ?? "USADO",
    statusPatrimonio: dto.statusPatrimonio ?? "DISPONIVEL",

    organizacaoId: normalizeNumberId(dto.organizacaoId ?? dto.organizacao),
    projetoId: normalizeNumberId(dto.projetoId ?? dto.projeto),
  };
}

export function buildPatrimonioPayload(
  form: Omit<Patrimonio, "id"> | Patrimonio,
): PatrimonioPayloadDTO {
  const id = "id" in form && form.id ? Number(form.id) : undefined;

  return {
    id,

    numeroPatrimonio: form.numeroPatrimonio.trim(),
    nomePatrimonio: form.nomePatrimonio.trim(),
    dataAquisicao: brToIso(form.dataAquisicao),
    descricaoPatrimonio: form.descricaoPatrimonio.trim(),
    valorPatrimonio:
      form.valorPatrimonio == null || Number.isNaN(Number(form.valorPatrimonio))
        ? null
        : Number(form.valorPatrimonio),

    marca: form.marca?.trim() || null,
    modelo: form.modelo?.trim() || null,
    numeroSerie: form.numeroSerie?.trim() || null,
    urlNotaFiscal: form.urlNotaFiscal?.trim() || null,

    tipoPatrimonio: form.tipoPatrimonio,
    estadoConservacao: form.estadoConservacao,
    statusPatrimonio: form.statusPatrimonio,

    organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
    projetoId: form.projetoId ? Number(form.projetoId) : null,
  };
}

export async function getPatrimonios(): Promise<Patrimonio[]> {
  const response = await fetch(`${API_URL}/patrimonios`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PatrimonioDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapPatrimonio);
}

export async function getPatrimonioById(id: number): Promise<Patrimonio> {
  const response = await fetch(`${API_URL}/patrimonios/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PatrimonioDTO = await response.json();

  return mapPatrimonio(data);
}

export async function createPatrimonio(
  payload: PatrimonioPayloadDTO,
  notaFiscal?: File | null,
): Promise<Patrimonio> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (notaFiscal) {
    formData.append("notaFiscal", notaFiscal);
  }

  const response = await fetch(`${API_URL}/patrimonios`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PatrimonioDTO = await response.json();

  return mapPatrimonio(data);
}

export async function updatePatrimonio(
  id: number,
  payload: PatrimonioPayloadDTO,
  notaFiscal?: File | null,
): Promise<Patrimonio> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (notaFiscal) {
    formData.append("notaFiscal", notaFiscal);
  }

  const response = await fetch(`${API_URL}/patrimonios/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PatrimonioDTO = await response.json();

  return mapPatrimonio(data);
}

export async function deletePatrimonio(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/patrimonios/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoesPatrimonio(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((o) => ({
      id: Number(o.id),
      nome:
        pickText(o.razaoSocial, o.nomeFantasia, o.nomeOrganizacao, o.nome) ||
        `Organização ${o.id}`,
    }))
    .filter((o) => Number.isFinite(o.id));
}

export async function getProjetosPatrimonio(): Promise<ProjetoOption[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoPatrimonioApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((p) => ({
      id: Number(p.id),
      nome: pickText(p.nomeProjeto, p.nome, p.titulo) || `Projeto ${p.id}`,
    }))
    .filter((p) => Number.isFinite(p.id));
}

export function getNomeArquivoPatrimonio(url?: string | null): string {
  if (!url?.trim()) return "";

  try {
    const cleanUrl = url.split("?")[0];
    const partes = cleanUrl.split("/");
    const nome = partes[partes.length - 1] ?? "";

    return decodeURIComponent(nome);
  } catch {
    const partes = url.split("/");
    return partes[partes.length - 1] ?? "";
  }
}

export async function getPatrimonioNotaFiscalDownloadUrl(
  id: number,
): Promise<string> {
  const response = await fetch(`${API_URL}/patrimonios/${id}/download`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const url = await response.text();

  if (!url?.trim()) {
    throw new Error("Link da nota fiscal não retornado pelo servidor.");
  }

  return url;
}

export function getNotaFiscalUrl(url?: string | null): string {
  if (!url?.trim()) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
import { apiFetch } from "@/lib/api";

export type TipoPlanoApi = "PLANO_GRATUITO" | "PLANO_PAGO";

export interface EnderecoDTO {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ConfiguracaoEmpresaResponseDTO {
  id: number;
  nomeEmpresa: string;
  slug?: string | null;
  caminhoLogo?: string | null;
  emailContato?: string | null;
  telefoneContato?: string | null;
  documentoIdentificacao: string;
  tipoPlano: TipoPlanoApi;
  limiteUsuarios: number;
  endereco?: EnderecoDTO | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export interface ConfiguracaoEmpresaRequestDTO {
  nomeEmpresa: string;
  slug?: string | null;
  caminhoLogo?: string | null;
  emailContato: string;
  telefoneContato: string;
  documentoIdentificacao: string;
  tipoPlano: TipoPlanoApi;
  limiteUsuarios: number;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
}

export interface ConfiguracaoEmpresaData {
  id?: number | null;
  nomeEmpresa: string;
  slug: string;
  documentoIdentificacao: string;
  emailContato: string;
  telefoneContato: string;
  tipoPlano: TipoPlanoApi | "";
  limiteUsuarios: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  caminhoLogo: string | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export interface OrganizacaoData {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
}

const STORAGE_KEY = "configuracao-empresa-cache";

const DEFAULT_DATA: ConfiguracaoEmpresaData = {
  id: null,
  nomeEmpresa: "",
  slug: "",
  documentoIdentificacao: "",
  emailContato: "",
  telefoneContato: "",
  tipoPlano: "",
  limiteUsuarios: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  caminhoLogo: null,
  dataCriacao: "",
  dataAtualizacao: "",
};

function mapResponseToData(
  dto: ConfiguracaoEmpresaResponseDTO,
): ConfiguracaoEmpresaData {
  return {
    id: dto.id ?? null,
    nomeEmpresa: dto.nomeEmpresa ?? "",
    slug: dto.slug ?? "",
    documentoIdentificacao: dto.documentoIdentificacao ?? "",
    emailContato: dto.emailContato ?? "",
    telefoneContato: dto.telefoneContato ?? "",
    tipoPlano: dto.tipoPlano ?? "",
    limiteUsuarios:
      dto.limiteUsuarios != null ? String(dto.limiteUsuarios) : "",
    cep: dto.endereco?.cep ?? "",
    logradouro: dto.endereco?.logradouro ?? "",
    numero: dto.endereco?.numero ?? "",
    complemento: dto.endereco?.complemento ?? "",
    bairro: dto.endereco?.bairro ?? "",
    cidade: dto.endereco?.cidade ?? "",
    estado: dto.endereco?.estado ?? "",
    caminhoLogo: dto.caminhoLogo ?? null,
    dataCriacao: dto.dataCriacao ?? "",
    dataAtualizacao: dto.dataAtualizacao ?? "",
  };
}

function readCache(): ConfiguracaoEmpresaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_DATA;
    }

    return {
      ...DEFAULT_DATA,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_DATA;
  }
}

function writeCache(data: ConfiguracaoEmpresaData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignora erro de storage
  }
}

function buildMultipartBody(
  payload: ConfiguracaoEmpresaRequestDTO,
  logo?: File | null,
) {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (logo) {
    formData.append("logo", logo);
  }

  return formData;
}

export function getConfiguracaoEmpresa(): ConfiguracaoEmpresaData {
  return readCache();
}

export function saveConfiguracaoEmpresa(
  data: Partial<ConfiguracaoEmpresaData>,
): ConfiguracaoEmpresaData {
  const current = readCache();

  const next = {
    ...current,
    ...data,
  };

  writeCache(next);

  return next;
}

export async function fetchConfiguracaoEmpresa(): Promise<ConfiguracaoEmpresaData> {
  const data = await apiFetch<ConfiguracaoEmpresaResponseDTO[]>(
    "/configuracoes-empresa",
    {
      method: "GET",
    },
  );

  const first = data?.[0];

  if (!first) {
    writeCache(DEFAULT_DATA);
    return DEFAULT_DATA;
  }

  const mapped = mapResponseToData(first);

  writeCache(mapped);

  return mapped;
}

export async function fetchConfiguracaoEmpresaById(
  id: number,
): Promise<ConfiguracaoEmpresaData> {
  if (!id || Number.isNaN(id)) {
    throw new Error("ID da configuração da empresa inválido.");
  }

  const data = await apiFetch<ConfiguracaoEmpresaResponseDTO>(
    `/configuracoes-empresa/${id}`,
    {
      method: "GET",
    },
  );

  const mapped = mapResponseToData(data);

  writeCache(mapped);

  return mapped;
}

export async function fetchConfiguracaoEmpresaLogoUrl(
  id?: number | null,
): Promise<string | null> {
  if (!id || Number.isNaN(id)) {
    return null;
  }

  try {
    const url = await apiFetch<string>(`/configuracoes-empresa/${id}/logo`, {
      method: "GET",
    });

    return url?.trim() || null;
  } catch {
    return null;
  }
}

export async function createOrUpdateConfiguracaoEmpresa(
  payload: ConfiguracaoEmpresaRequestDTO,
  id?: number | null,
  logo?: File | null,
): Promise<ConfiguracaoEmpresaData> {
  const path = id ? `/configuracoes-empresa/${id}` : "/configuracoes-empresa";
  const method = id ? "PUT" : "POST";

  const saved = await apiFetch<ConfiguracaoEmpresaResponseDTO>(path, {
    method,
    body: logo ? buildMultipartBody(payload, logo) : JSON.stringify(payload),
  });

  const mapped = mapResponseToData(saved);

  writeCache(mapped);

  return mapped;
}

export async function updateConfiguracaoEmpresaById(
  id: number,
  payload: ConfiguracaoEmpresaRequestDTO,
  logo?: File | null,
): Promise<ConfiguracaoEmpresaData> {
  if (!id || Number.isNaN(id)) {
    throw new Error("ID da configuração da empresa inválido.");
  }

  const saved = await apiFetch<ConfiguracaoEmpresaResponseDTO>(
    `/configuracoes-empresa/${id}`,
    {
      method: "PUT",
      body: logo ? buildMultipartBody(payload, logo) : JSON.stringify(payload),
    },
  );

  const mapped = mapResponseToData(saved);

  writeCache(mapped);

  return mapped;
}

export async function refreshConfiguracaoEmpresa(): Promise<ConfiguracaoEmpresaData> {
  return fetchConfiguracaoEmpresa();
}

export function getOrganizacoes(): OrganizacaoData[] {
  const config = readCache();

  if (!config.id) {
    return [];
  }

  return [
    {
      id: String(config.id),
      razaoSocial: config.nomeEmpresa ?? "",
      nomeFantasia: config.nomeEmpresa ?? "",
    },
  ];
}

export function getOrganizacaoSelecionadaId(): string | null {
  const config = readCache();

  return config.id ? String(config.id) : null;
}

export function setOrganizacaoSelecionada(_id: string) {
  // compatibilidade com telas antigas
}

export function deleteOrganizacao(_id: string) {
  localStorage.removeItem(STORAGE_KEY);
}
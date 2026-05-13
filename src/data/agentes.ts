import { maskCPF, maskDate, maskPhone, maskRG, maskCEP } from "@/lib/masks";
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

function toIsoDate(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return trimmed;
  }

  const [, day, month, year] = match;

  return `${year}-${month}-${day}`;
}

function toDisplayDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;

  return `${day}/${month}/${year}`;
}

export type TipoAgente =
  | "PESSOA_FISICA"
  | "MEI"
  | "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS"
  | "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS"
  | "GRUPO_COLETIVO";

export const tipoAgenteLabels: Record<TipoAgente, string> = {
  PESSOA_FISICA: "Pessoa Física",
  MEI: "MEI",
  PESSOA_JURIDICA_COM_FINS_LUCRATIVOS: "Pessoa Jurídica com Fins Lucrativos",
  PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS: "Pessoa Jurídica sem Fins Lucrativos",
  GRUPO_COLETIVO: "Grupo / Coletivo",
};

export const tipoAgenteDescricoes: Record<TipoAgente, string> = {
  PESSOA_FISICA:
    "Pessoa que atua individualmente na cultura, sem CNPJ, como artista, produtor, educador, oficineiro ou profissional cultural.",
  MEI:
    "Microempreendedor Individual com CNPJ próprio, utilizado para formalizar atividades culturais de forma simplificada.",
  PESSOA_JURIDICA_COM_FINS_LUCRATIVOS:
    "Empresa com CNPJ e finalidade lucrativa, como produtora, agência cultural, escola livre, prestadora de serviço ou negócio criativo.",
  PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS:
    "Organização com CNPJ voltada a atividades sociais, culturais, educativas ou comunitárias, sem distribuição de lucro. Ex.: ONGs, associações, institutos ou pontos de cultura.",
  GRUPO_COLETIVO:
    "Grupo de pessoas que realiza ações culturais de forma coletiva, geralmente sem CNPJ formalizado. Ex.: coletivo cultural, grupo artístico, companhia, roda, movimento ou rede comunitária.",
};

export interface AgenteResponseDTO {
  id: number;
  tipoAgente: TipoAgente;
  nomePrincipal: string;
  representante?: string | null;
  documento: string;
}

export interface AgenteDetalhadoResponseDTO {
  id: number;
  tipoAgente: TipoAgente;

  nomeCompleto?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  dataFundacao?: string | null;

  nomeColetivo?: string | null;
  dataCriacaoColetivo?: string | null;

  nomeRepresentante?: string | null;
  dataNascimentoRepresentante?: string | null;
  cpfRepresentante?: string | null;
  rgRepresentante?: string | null;
  telefoneRepresentante?: string | null;
  emailRepresentante?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface EnderecoRequestDTO {
  cep: string;
  logradouro: string;
  numero: number | null;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface PessoaFisicaRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
}

export interface PessoaJuridicaRequestDTO {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
}

export interface ColetivoRequestDTO {
  nome: string;
  dataCriacao: string;
}

export interface AgenteRequestDTO {
  tipoAgente: TipoAgente;
  pessoaFisica?: PessoaFisicaRequestDTO;
  pessoaJuridica?: PessoaJuridicaRequestDTO;
  coletivo?: ColetivoRequestDTO;
  representante?: PessoaFisicaRequestDTO;
  endereco?: EnderecoRequestDTO;
}

export interface Agente {
  id: string;
  tipo: TipoAgente;
  nomePrincipal: string;
  representante?: string;
  documento: string;
}

export function mapAgente(dto: AgenteResponseDTO): Agente {
  return {
    id: String(dto.id),
    tipo: dto.tipoAgente,
    nomePrincipal: dto.nomePrincipal ?? "",
    representante: dto.representante ?? "",
    documento: dto.documento ?? "—",
  };
}

function normalizeNullable(value?: string | null): string {
  return value ?? "";
}

export function mapAgenteDetalhado(
  dto: AgenteDetalhadoResponseDTO,
): AgenteDetalhadoResponseDTO {
  return {
    ...dto,
    nomeCompleto: normalizeNullable(dto.nomeCompleto),
    dataNascimento: toDisplayDate(dto.dataNascimento),
    cpf: normalizeNullable(dto.cpf),
    rg: normalizeNullable(dto.rg),
    telefone: normalizeNullable(dto.telefone),
    email: normalizeNullable(dto.email),

    razaoSocial: normalizeNullable(dto.razaoSocial),
    nomeFantasia: normalizeNullable(dto.nomeFantasia),
    cnpj: normalizeNullable(dto.cnpj),
    dataFundacao: toDisplayDate(dto.dataFundacao),

    nomeColetivo: normalizeNullable(dto.nomeColetivo),
    dataCriacaoColetivo: toDisplayDate(dto.dataCriacaoColetivo),

    nomeRepresentante: normalizeNullable(dto.nomeRepresentante),
    dataNascimentoRepresentante: toDisplayDate(dto.dataNascimentoRepresentante),
    cpfRepresentante: normalizeNullable(dto.cpfRepresentante),
    rgRepresentante: normalizeNullable(dto.rgRepresentante),
    telefoneRepresentante: normalizeNullable(dto.telefoneRepresentante),
    emailRepresentante: normalizeNullable(dto.emailRepresentante),

    cep: normalizeNullable(dto.cep),
    logradouro: normalizeNullable(dto.logradouro),
    numero: normalizeNullable(dto.numero),
    complemento: normalizeNullable(dto.complemento),
    bairro: normalizeNullable(dto.bairro),
    cidade: normalizeNullable(dto.cidade),
    estado: normalizeNullable(dto.estado),
  };
}

export async function getAgentes(): Promise<Agente[]> {
  const response = await fetch(`${API_URL}/agentes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteResponseDTO[] = await response.json();
  return (data ?? []).map(mapAgente);
}

export async function getAgenteById(id: number): Promise<Agente> {
  const response = await fetch(`${API_URL}/agentes/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteResponseDTO = await response.json();
  return mapAgente(data);
}

export async function getAgenteDetalhadoById(
  id: number,
): Promise<AgenteDetalhadoResponseDTO> {
  const response = await fetch(`${API_URL}/agentes/${id}/detalhado`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteDetalhadoResponseDTO = await response.json();
  return mapAgenteDetalhado(data);
}

export async function createAgente(
  payload: AgenteRequestDTO,
): Promise<Agente> {
  const response = await fetch(`${API_URL}/agentes`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteResponseDTO = await response.json();
  return mapAgente(data);
}

export async function updateAgente(
  id: number,
  payload: AgenteRequestDTO,
): Promise<Agente> {
  const response = await fetch(`${API_URL}/agentes/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteResponseDTO = await response.json();
  return mapAgente(data);
}

export async function deleteAgente(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/agentes/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export function sanitizePessoaFisicaInput(input: {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
}): PessoaFisicaRequestDTO {
  return {
    nomeCompleto: input.nomeCompleto.trim(),
    dataNascimento: toIsoDate(input.dataNascimento),
    cpf: input.cpf.trim(),
    rg: input.rg.trim(),
    telefone: input.telefone.trim(),
    email: input.email.trim(),
  };
}

export function sanitizePessoaJuridicaInput(input: {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
}): PessoaJuridicaRequestDTO {
  return {
    razaoSocial: input.razaoSocial.trim(),
    nomeFantasia: input.nomeFantasia.trim(),
    cnpj: input.cnpj.trim(),
    dataFundacao: toIsoDate(input.dataFundacao),
  };
}

export function sanitizeColetivoInput(input: {
  nome: string;
  dataCriacao: string;
}): ColetivoRequestDTO {
  return {
    nome: input.nome.trim(),
    dataCriacao: toIsoDate(input.dataCriacao),
  };
}

export function sanitizeEnderecoInput(input: {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}): EnderecoRequestDTO {
  return {
    cep: input.cep.trim(),
    logradouro: input.logradouro.trim(),
    numero: input.numero.trim() ? Number(input.numero) : null,
    complemento: input.complemento.trim(),
    bairro: input.bairro.trim(),
    cidade: input.cidade.trim(),
    estado: input.estado.trim(),
  };
}

export const inputMasks = {
  cpf: maskCPF,
  rg: maskRG,
  phone: maskPhone,
  cep: maskCEP,
  date: maskDate,
};
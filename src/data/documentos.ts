import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

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

export type StatusDocumento =
  | "PENDENTE"
  | "ATUALIZADO"
  | "VENCIDO"
  | "NAO_SE_APLICA"
  | "EM_ANALISE"
  | "NECESSITA_REVISAO";

export const statusDocumentoLabels: Record<StatusDocumento, string> = {
  PENDENTE: "Pendente",
  ATUALIZADO: "Atualizado",
  VENCIDO: "Vencido",
  NAO_SE_APLICA: "Não se Aplica",
  EM_ANALISE: "Em Análise",
  NECESSITA_REVISAO: "Necessita Revisão",
};

export type TipoDocumento =
  | "CPF_REPRESENTANTE"
  | "DOCUMENTO_IDENTIFICACAO_REPRESENTANTE_FRENTE_VERSO"
  | "CNPJ"
  | "CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS"
  | "CERTIDAO_DEBITOS_TRIBUTARIOS_FAZENDA_ESTADUAL"
  | "CERTIDAO_DEBITOS_TRIBUTARIOS_FEDERAIS_DIVIDA_ATIVA_UNIAO"
  | "CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS"
  | "CERTIDAO_REGULARIDADE_FGTS"
  | "EXTRATO_ZERADO_CONTA_BANCARIA"
  | "COMPROVANTE_ENDERECO"
  | "CONTRATO_SOCIAL"
  | "CERTIDAO_FALENCIA_E_CONCORDATA"
  | "COMPROVANTE_SOLICITACAO_INGRESSO_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA"
  | "COPIA_ESTATUTO_SOCIAL_ATUALIZADO"
  | "PORTFOLIO_INSTITUCIONAL"
  | "CURRICULO_INSTITUCIONAL"
  | "ESTATUTO_SOCIAL"
  | "ATA_FUNDACAO"
  | "ATA_ELEICAO_DIRETORIA"
  | "ATA_POSSE_DIRETORIA"
  | "OUTROS";

export const tipoDocumentoLabels: Record<TipoDocumento, string> = {
  CPF_REPRESENTANTE: "CPF do Representante",
  DOCUMENTO_IDENTIFICACAO_REPRESENTANTE_FRENTE_VERSO:
    "Documento de identificação do Representante (frente e verso)",
  CNPJ: "CNPJ",
  CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS:
    "Certidão Negativa de Débitos Municipais",
  CERTIDAO_DEBITOS_TRIBUTARIOS_FAZENDA_ESTADUAL:
    "Certidão de Débitos Tributários da Fazenda Estadual",
  CERTIDAO_DEBITOS_TRIBUTARIOS_FEDERAIS_DIVIDA_ATIVA_UNIAO:
    "Certidão de Débitos Tributários Federais e Dívida Ativa da União",
  CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS:
    "Certidão Negativa de Débitos Trabalhistas",
  CERTIDAO_REGULARIDADE_FGTS: "Certidão de Regularidade do FGTS",
  EXTRATO_ZERADO_CONTA_BANCARIA: "Extrato zerado da conta bancária",
  COMPROVANTE_ENDERECO: "Comprovante de Endereço",
  CONTRATO_SOCIAL: "Contrato Social",
  CERTIDAO_FALENCIA_E_CONCORDATA: "Certidão de Falência e Concordata",
  COMPROVANTE_SOLICITACAO_INGRESSO_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA:
    "Comprovante de Solicitação de Ingresso no Cadastro Nacional de Pontos e Pontões de Cultura",
  COPIA_ESTATUTO_SOCIAL_ATUALIZADO: "Cópia do Estatuto Social Atualizado",
  PORTFOLIO_INSTITUCIONAL: "Portfólio Institucional",
  CURRICULO_INSTITUCIONAL: "Currículo Institucional",
  ESTATUTO_SOCIAL: "Estatuto Social",
  ATA_FUNDACAO: "Ata de Fundação",
  ATA_ELEICAO_DIRETORIA: "Ata de Eleição da Diretoria",
  ATA_POSSE_DIRETORIA: "Ata de Posse da Diretoria",
  OUTROS: "Outros",
};

export interface DocumentoDTO {
  id?: number;
  dataEmissao?: string | null;
  dataValidade?: string | null;
  urlDocumento?: string | null;
  tipoDocumento: TipoDocumento;
  statusDocumento: StatusDocumento;
  orgaoEmissor?: string | null;
  observacao?: string | null;
  organizacaoId: number | null;
  arquivoKey?: string | null;
  vencido?: boolean | null;
  mensagemVencimento?: string | null;
  removerArquivo?: boolean | null;
}

export interface Documento {
  id: number;
  dataEmissao: string;
  dataValidade: string;
  urlDocumento: string;
  tipoDocumento: TipoDocumento;
  statusDocumento: StatusDocumento;
  orgaoEmissor: string;
  observacao: string;
  organizacaoId: number | null;
  arquivoKey: string;
  vencido: boolean;
  mensagemVencimento: string;
  removerArquivo?: boolean;
}

export interface OrganizacaoOption {
  id: number;
  nome: string;
}

function toIsoDate(value?: string | null): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (br) {
    const [, dd, mm, yyyy] = br;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function formatDateBR(value?: string | null): string {
  if (!value) return "—";

  const iso = toIsoDate(value);
  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function getNomeArquivoDocumento(url?: string | null): string {
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

export function getArquivoUrl(url?: string | null): string {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function mapDocumento(dto: DocumentoDTO): Documento {
  return {
    id: Number(dto.id ?? 0),
    dataEmissao: toIsoDate(dto.dataEmissao),
    dataValidade: toIsoDate(dto.dataValidade),
    urlDocumento: dto.urlDocumento ?? "",
    tipoDocumento: dto.tipoDocumento,
    statusDocumento: dto.statusDocumento,
    orgaoEmissor: dto.orgaoEmissor ?? "",
    observacao: dto.observacao ?? "",
    organizacaoId: dto.organizacaoId ?? null,
    arquivoKey: dto.arquivoKey ?? "",
    vencido: Boolean(dto.vencido),
    mensagemVencimento: dto.mensagemVencimento ?? "",
    removerArquivo: Boolean(dto.removerArquivo),
  };
}

export function buildDocumentoPayload(doc: Documento): DocumentoDTO {
  return {
    id: doc.id || undefined,
    dataEmissao: doc.dataEmissao || null,
    dataValidade: doc.dataValidade || null,
    urlDocumento: doc.urlDocumento?.trim() || null,
    tipoDocumento: doc.tipoDocumento,
    statusDocumento: doc.statusDocumento,
    orgaoEmissor: doc.orgaoEmissor?.trim() || null,
    observacao: doc.observacao?.trim() || null,
    organizacaoId: doc.organizacaoId,
    arquivoKey: doc.arquivoKey?.trim() || null,
    removerArquivo: doc.removerArquivo ?? false,
  };
}

export async function getDocumentos(): Promise<Documento[]> {
  const response = await fetch(`${API_URL}/documentos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO[] = await response.json();

  return (data ?? []).map(mapDocumento);
}

export async function getDocumentosByOrganizacao(
  organizacaoId: number,
): Promise<Documento[]> {
  const response = await fetch(
    `${API_URL}/documentos/organizacao/${organizacaoId}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO[] = await response.json();

  return (data ?? []).map(mapDocumento);
}

export async function getDocumentoById(id: number): Promise<Documento> {
  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function getDocumentoDownloadUrl(id: number): Promise<string> {
  const response = await fetch(`${API_URL}/documentos/${id}/download`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const url = await response.text();

  if (!url?.trim()) {
    throw new Error("Link do arquivo não retornado pelo servidor.");
  }

  return url;
}

export async function createDocumento(
  payload: DocumentoDTO,
  arquivo?: File | null,
): Promise<Documento> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/documentos`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function updateDocumento(
  id: number,
  payload: DocumentoDTO,
  arquivo?: File | null,
): Promise<Documento> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function deleteDocumento(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoesDocumento(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item: any) => ({
      id: Number(item.id),
      nome:
        item.razaoSocial?.trim() ||
        item.nomeFantasia?.trim() ||
        item.nomeOrganizacao?.trim() ||
        item.nome?.trim() ||
        `Organização ${item.id}`,
    }))
    .filter((item) => Number.isFinite(item.id));
}

export function isDocumentoVencido(doc: Documento): boolean {
  if (doc.statusDocumento === "NAO_SE_APLICA") return false;
  if (doc.vencido) return true;
  if (doc.statusDocumento === "VENCIDO") return true;
  if (!doc.dataValidade) return false;

  const iso = toIsoDate(doc.dataValidade);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return false;

  const [, yyyy, mm, dd] = match;

  const validade = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  validade.setHours(0, 0, 0, 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return validade < hoje;
}

export function contarDocumentosVencidos(documentos: Documento[]): number {
  return documentos.filter(
    (doc) => doc.statusDocumento !== "NAO_SE_APLICA" && isDocumentoVencido(doc),
  ).length;
}

export const statusDocumentoTone = (
  status: StatusDocumento,
): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "ATUALIZADO":
      return "success";

    case "VENCIDO":
      return "danger";

    case "PENDENTE":
    case "NECESSITA_REVISAO":
      return "warning";

    case "EM_ANALISE":
      return "info";

    case "NAO_SE_APLICA":
    default:
      return "neutral";
  }
};
import type { Status } from "@/components/StatusPill";
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

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }
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

export type EstrategiaDivulgacao =
  | "MATERIAIS_IMPRESSOS"
  | "CARTAZES"
  | "PANFLETOS"
  | "FAIXAS"
  | "BANNERS"
  | "ZINES_E_CATALOGOS"
  | "REDES_SOCIAIS"
  | "SITES"
  | "BLOG"
  | "E_MAIL_MARKETING"
  | "MIDIA_LOCAL"
  | "RADIO"
  | "TV"
  | "ASSESSORIA_DE_IMPRENSA"
  | "ANUNCIOS_PATROCINADOS"
  | "PARCERIAS_VEICULOS_COMUNICACAO"
  | "PARCERIAS_ORGAOS_PUBLICOS"
  | "PARCERIAS_INSTITUICOES_CULTURAIS"
  | "ARTICULACAO_COM_ATORES_LOCAIS"
  | "INFLUENCIADORES_E_EMBAIXADORES"
  | "MOBILIZACAO_COMUNITARIA";

export const estrategiasDivulgacao = [
  { value: "MATERIAIS_IMPRESSOS", label: "Materiais Impressos" },
  { value: "CARTAZES", label: "Cartazes" },
  { value: "PANFLETOS", label: "Panfletos" },
  { value: "FAIXAS", label: "Faixas" },
  { value: "BANNERS", label: "Banners" },
  { value: "ZINES_E_CATALOGOS", label: "Zines e Catálogos" },
  { value: "REDES_SOCIAIS", label: "Redes Sociais" },
  { value: "SITES", label: "Sites" },
  { value: "BLOG", label: "Blog" },
  { value: "E_MAIL_MARKETING", label: "E-mail Marketing" },
  { value: "MIDIA_LOCAL", label: "Mídia Local" },
  { value: "RADIO", label: "Rádio" },
  { value: "TV", label: "TV" },
  { value: "ASSESSORIA_DE_IMPRENSA", label: "Assessoria de Imprensa" },
  { value: "ANUNCIOS_PATROCINADOS", label: "Anúncios Patrocinados" },
  {
    value: "PARCERIAS_VEICULOS_COMUNICACAO",
    label: "Parcerias com Veículos de Comunicação",
  },
  {
    value: "PARCERIAS_ORGAOS_PUBLICOS",
    label: "Parcerias com Órgãos Públicos",
  },
  {
    value: "PARCERIAS_INSTITUICOES_CULTURAIS",
    label: "Parcerias com Instituições Culturais",
  },
  {
    value: "ARTICULACAO_COM_ATORES_LOCAIS",
    label: "Articulação com Atores Locais",
  },
  {
    value: "INFLUENCIADORES_E_EMBAIXADORES",
    label: "Influenciadores e Embaixadores",
  },
  { value: "MOBILIZACAO_COMUNITARIA", label: "Mobilização Comunitária" },
] as const;

export const estrategiaLabel = (value: string) =>
  estrategiasDivulgacao.find((item) => item.value === value)?.label ?? value;

export function estrategiasPlanoComunicacaoTexto(
  values: Array<EstrategiaDivulgacao | string> = [],
) {
  return values.map(estrategiaLabel).join(", ");
}

export type StatusPlanoComunicacao =
  | "ATIVO"
  | "INATIVO"
  | "PENDENTE"
  | "CONCLUIDO";

export interface PlanoComunicacaoDTO {
  id?: number;
  nomePlano: string;
  quantidade: string;
  localCirculacaoComunicacao: string;
  formatoPlanoComunicacao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusPlanoComunicacao;
  estrategiasDivulgacao?: Array<EstrategiaDivulgacao | string>;
  propostaEditalId: number | null;
  nomePropostaEdital?: string | null;
  editalId?: number | null;
  nomeEdital?: string | null;
  organizacaoId?: number | null;
}

export interface PlanoComunicacao {
  id: string;
  nomePlano: string;
  quantidade: string;
  localCirculacaoComunicacao: string;
  formatoPlanoComunicacao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusPlanoComunicacao | "";
  estrategiasDivulgacao: EstrategiaDivulgacao[];
  propostaEdital: string;
  nomePropostaEdital: string;
  edital: string;
  nomeEdital: string;
  organizacao: string;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
  editalId?: string;
  nomeEdital?: string;
}

export interface OrganizacaoOption {
  id: string;
  nome: string;
}

interface PropostaEditalApiResponse {
  id?: number | string;
  tituloProjeto?: string;
  nomeProposta?: string;
  nomeEdital?: string;
  titulo?: string;
  nome?: string;
  editalId?: number | string;
}

interface OrganizacaoApiResponse {
  id?: number | string;
  nomeOrganizacao?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  nome?: string;
}

export const statusPlanoComunicacaoOptions: {
  value: StatusPlanoComunicacao;
  label: Status;
}[] = [
    { value: "ATIVO", label: "Ativo" },
    { value: "INATIVO", label: "Inativo" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "CONCLUIDO", label: "Concluído" },
  ];

export const statusPlanoComunicacaoLabel = (
  value?: StatusPlanoComunicacao | "" | null,
): Status | "—" =>
  statusPlanoComunicacaoOptions.find((item) => item.value === value)?.label ??
  "—";

export const formatosComunicacaoOptions = [
  "Material gráfico",
  "Redes sociais",
  "Cartazes",
  "Cards digitais",
  "Vídeo",
  "Rádio",
  "Site institucional",
  "WhatsApp",
  "Imprensa local",
  "E-mail marketing",
  "Outro",
] as const;

export function createEmptyPlanoComunicacao(): PlanoComunicacao {
  return {
    id: "",
    nomePlano: "",
    quantidade: "",
    localCirculacaoComunicacao: "",
    formatoPlanoComunicacao: "",
    dataInicio: "",
    dataFim: "",
    status: "",
    estrategiasDivulgacao: [],
    propostaEdital: "",
    nomePropostaEdital: "",
    edital: "",
    nomeEdital: "",
    organizacao: "",
  };
}

export function mapPlanoComunicacao(dto: PlanoComunicacaoDTO): PlanoComunicacao {
  const estrategias = Array.isArray(dto.estrategiasDivulgacao)
    ? dto.estrategiasDivulgacao
    : [];

  return {
    id: String(dto.id ?? ""),
    nomePlano: dto.nomePlano ?? "",
    quantidade: dto.quantidade ?? "",
    localCirculacaoComunicacao: dto.localCirculacaoComunicacao ?? "",
    formatoPlanoComunicacao: dto.formatoPlanoComunicacao ?? "",
    dataInicio: dto.dataInicio ?? "",
    dataFim: dto.dataFim ?? "",
    status: dto.status ?? "",
    estrategiasDivulgacao: estrategias as EstrategiaDivulgacao[],
    propostaEdital:
      dto.propostaEditalId != null ? String(dto.propostaEditalId) : "",
    nomePropostaEdital: dto.nomePropostaEdital ?? "",
    edital: dto.editalId != null ? String(dto.editalId) : "",
    nomeEdital: dto.nomeEdital ?? "",
    organizacao: dto.organizacaoId != null ? String(dto.organizacaoId) : "",
  };
}

export function buildPlanoComunicacaoPayload(
  value: PlanoComunicacao,
): PlanoComunicacaoDTO {
  return {
    id: value.id ? Number(value.id) : undefined,
    nomePlano: value.nomePlano.trim(),
    quantidade: value.quantidade.trim(),
    localCirculacaoComunicacao: value.localCirculacaoComunicacao.trim(),
    formatoPlanoComunicacao: value.formatoPlanoComunicacao.trim(),
    dataInicio: value.dataInicio,
    dataFim: value.dataFim,
    status: value.status as StatusPlanoComunicacao,
    estrategiasDivulgacao: value.estrategiasDivulgacao,
    propostaEditalId: value.propostaEdital ? Number(value.propostaEdital) : null,
    organizacaoId: value.organizacao ? Number(value.organizacao) : null,
  };
}

export function formatDateBr(iso?: string) {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

export async function getPlanosComunicacao(): Promise<PlanoComunicacao[]> {
  const response = await fetch(`${API_URL}/planos-comunicacao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoComunicacaoDTO[] = await response.json();

  return (data ?? []).map(mapPlanoComunicacao);
}

export async function getPlanoComunicacaoById(
  id: number,
): Promise<PlanoComunicacao> {
  const response = await fetch(`${API_URL}/planos-comunicacao/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoComunicacaoDTO = await response.json();

  return mapPlanoComunicacao(data);
}

export async function createPlanoComunicacao(
  payload: PlanoComunicacaoDTO,
): Promise<PlanoComunicacao> {
  const response = await fetch(`${API_URL}/planos-comunicacao`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoComunicacaoDTO = await response.json();

  return mapPlanoComunicacao(data);
}

export async function updatePlanoComunicacao(
  id: number,
  payload: PlanoComunicacaoDTO,
): Promise<PlanoComunicacao> {
  const response = await fetch(`${API_URL}/planos-comunicacao/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanoComunicacaoDTO = await response.json();

  return mapPlanoComunicacao(data);
}

export async function deletePlanoComunicacao(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/planos-comunicacao/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getPropostasEditalOptions(): Promise<
  PropostaEditalOption[]
> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalApiResponse[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.tituloProjeto,
            item.nomeProposta,
            item.nomeEdital,
            item.titulo,
            item.nome,
          ) || `Proposta ${id}`,
        editalId: normalizeId(item.editalId),
        nomeEdital: item.nomeEdital ?? "",
      };
    })
    .filter((item) => item.id);
}

export async function getOrganizacoesOptions(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApiResponse[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomeOrganizacao,
            item.razaoSocial,
            item.nomeFantasia,
            item.nome,
          ) || `Organização ${id}`,
      };
    })
    .filter((item) => item.id);
}
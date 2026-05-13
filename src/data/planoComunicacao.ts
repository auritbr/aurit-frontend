import type { Status } from "@/components/StatusPill";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

export type StatusPlanoComunicacao =
  | "ATIVO"
  | "INATIVO"
  | "PENDENTE"
  | "CONCLUIDO";

export interface PlanoComunicacaoDTO {
  id?: number;
  quantidade: string;
  localCirculacaoComunicacao: string;
  formatoPlanoComunicacao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusPlanoComunicacao;
  acaoDivulgacaoId: number | null;
  organizacaoId: number | null;
}

export interface PlanoComunicacao {
  id: string;
  quantidade: string;
  localCirculacaoComunicacao: string;
  formatoPlanoComunicacao: string;
  dataInicio: string;
  dataFim: string;
  acaoDivulgacao: string;
  organizacao: string;
  status: StatusPlanoComunicacao | "";
}

export interface AcaoDivulgacaoOption {
  id: string;
  nome: string;
}

export interface OrganizacaoOption {
  id: string;
  nome: string;
}

interface AcaoDivulgacaoApiResponse {
  id?: number | string;
  nomeAcao?: string;
  tituloAcao?: string;
  nome?: string;
  descricao?: string;
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
    quantidade: "",
    localCirculacaoComunicacao: "",
    formatoPlanoComunicacao: "",
    dataInicio: "",
    dataFim: "",
    acaoDivulgacao: "",
    organizacao: "",
    status: "",
  };
}

export function mapPlanoComunicacao(dto: PlanoComunicacaoDTO): PlanoComunicacao {
  return {
    id: String(dto.id ?? ""),
    quantidade: dto.quantidade ?? "",
    localCirculacaoComunicacao: dto.localCirculacaoComunicacao ?? "",
    formatoPlanoComunicacao: dto.formatoPlanoComunicacao ?? "",
    dataInicio: dto.dataInicio ?? "",
    dataFim: dto.dataFim ?? "",
    acaoDivulgacao:
      dto.acaoDivulgacaoId != null ? String(dto.acaoDivulgacaoId) : "",
    organizacao: dto.organizacaoId != null ? String(dto.organizacaoId) : "",
    status: dto.status ?? "",
  };
}

export function buildPlanoComunicacaoPayload(
  value: PlanoComunicacao,
): PlanoComunicacaoDTO {
  return {
    id: value.id ? Number(value.id) : undefined,
    quantidade: value.quantidade.trim(),
    localCirculacaoComunicacao: value.localCirculacaoComunicacao.trim(),
    formatoPlanoComunicacao: value.formatoPlanoComunicacao.trim(),
    dataInicio: value.dataInicio,
    dataFim: value.dataFim,
    status: value.status as StatusPlanoComunicacao,
    acaoDivulgacaoId: value.acaoDivulgacao
      ? Number(value.acaoDivulgacao)
      : null,
    organizacaoId: value.organizacao ? Number(value.organizacao) : null,
  };
}

export async function getPlanosComunicacao(): Promise<PlanoComunicacao[]> {
  const response = await fetch(`${API_URL}/planos-comunicacao`, {
    method: "GET",
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getAcoesDivulgacaoOptions(): Promise<
  AcaoDivulgacaoOption[]
> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoApiResponse[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomeAcao,
            item.tituloAcao,
            item.nome,
            item.descricao,
          ) || `Ação ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getOrganizacoesOptions(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getAuthHeaders(),
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
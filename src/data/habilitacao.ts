import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const statusHabilitacaoOptions = [
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "EM_PREPARACAO", label: "Em preparação" },
  { value: "DOCUMENTACAO_PENDENTE", label: "Documentação pendente" },
  { value: "DOCUMENTACAO_ENVIADA", label: "Documentação enviada" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "HABILITADO", label: "Habilitado" },
  { value: "INABILITADO", label: "Inabilitado" },
  { value: "RECURSO_ENVIADO", label: "Recurso enviado" },
  { value: "HABILITADA_APOS_RECURSO", label: "Habilitada após recurso" },
  { value: "INABILITADA_DEFINITIVO", label: "Inabilitada definitivamente" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "REGULARIZADO", label: "Regularizado" },
  { value: "EM_REGULARIZACAO", label: "Em regularização" },
] as const;

export type StatusHabilitacao =
  (typeof statusHabilitacaoOptions)[number]["value"];

export interface HabilitacaoPropostaDTO {
  id?: number;

  propostaEditalId?: number | null;
  propostaEdital?: {
    id?: number | string | null;
    tituloProjeto?: string | null;
    tituloProposta?: string | null;
    nomeProposta?: string | null;
    nomeEdital?: string | null;
    titulo?: string | null;
    nome?: string | null;
  } | null;
  nomePropostaEdital?: string | null;

  agenteId?: number | null;
  agente?: {
    id?: number | string | null;
    nomePrincipal?: string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
    nomeFantasia?: string | null;
    razaoSocial?: string | null;
    nomeColetivo?: string | null;
  } | null;
  nomeAgente?: string | null;

  dataInicioHabilitacao?: string | null;
  dataLimiteHabilitacao?: string | null;
  dataEnvioDocumentacao?: string | null;
  dataRetornoAnalise?: string | null;
  dataRegularizacao?: string | null;
  dataConclusaoHabilitacao?: string | null;

  exigenciaOuPendencia?: string | null;
  providenciaTomada?: string | null;
  motivoInabilitacao?: string | null;
  observacoes?: string | null;

  statusHabilitacao: StatusHabilitacao;
}

export interface HabilitacaoPayloadDTO {
  id?: number;

  propostaEditalId: number | null;
  agenteId: number | null;

  dataInicioHabilitacao: string | null;
  dataLimiteHabilitacao: string | null;
  dataEnvioDocumentacao: string | null;
  dataRetornoAnalise: string | null;
  dataRegularizacao: string | null;
  dataConclusaoHabilitacao: string | null;

  exigenciaOuPendencia: string | null;
  providenciaTomada: string | null;
  motivoInabilitacao: string | null;
  observacoes: string | null;

  statusHabilitacao: StatusHabilitacao;
}

export interface Habilitacao {
  id: string;

  propostaEdital: string;
  nomePropostaEdital: string;

  agente: string;
  nomeAgente: string;

  dataInicioHabilitacao: string;
  dataLimiteHabilitacao: string;
  dataEnvioDocumentacao: string;
  dataRetornoAnalise: string;
  dataRegularizacao: string;
  dataConclusaoHabilitacao: string;

  exigenciaOuPendencia: string;
  providenciaTomada: string;
  motivoInabilitacao: string;
  observacoes: string;

  statusHabilitacao: StatusHabilitacao;
}

export interface PropostaOption {
  id: string;
  nome: string;
}

export interface AgenteOption {
  id: string;
  nome: string;
}

interface PropostaApiResponse {
  id?: number | string | null;
  tituloProjeto?: string | null;
  tituloProposta?: string | null;
  nomeProposta?: string | null;
  nomeEdital?: string | null;
  titulo?: string | null;
  nome?: string | null;
}

interface AgenteApiResponse {
  id?: number | string | null;
  nomePrincipal?: string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  nomeColetivo?: string | null;
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

function pickText(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
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

async function fetchJsonWithFallback<T>(
  urls: string[],
  options: RequestInit,
): Promise<T> {
  let lastError = "";

  for (const url of urls) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response.json();
    }

    lastError = await parseError(response);
  }

  throw new Error(lastError || "Erro ao carregar dados.");
}

export function mapHabilitacao(dto: HabilitacaoPropostaDTO): Habilitacao {
  const propostaId = normalizeId(dto.propostaEditalId ?? dto.propostaEdital);
  const agenteId = normalizeId(dto.agenteId ?? dto.agente);

  return {
    id: normalizeId(dto.id),

    propostaEdital: propostaId,
    nomePropostaEdital:
      dto.nomePropostaEdital ??
      pickText(
        dto.propostaEdital?.tituloProjeto,
        dto.propostaEdital?.tituloProposta,
        dto.propostaEdital?.nomeProposta,
        dto.propostaEdital?.nomeEdital,
        dto.propostaEdital?.titulo,
        dto.propostaEdital?.nome,
      ),

    agente: agenteId,
    nomeAgente:
      dto.nomeAgente ??
      pickText(
        dto.agente?.nomePrincipal,
        dto.agente?.nomeCompleto,
        dto.agente?.razaoSocial,
        dto.agente?.nomeFantasia,
        dto.agente?.nomeColetivo,
        dto.agente?.nome,
      ),

    dataInicioHabilitacao: dto.dataInicioHabilitacao ?? "",
    dataLimiteHabilitacao: dto.dataLimiteHabilitacao ?? "",
    dataEnvioDocumentacao: dto.dataEnvioDocumentacao ?? "",
    dataRetornoAnalise: dto.dataRetornoAnalise ?? "",
    dataRegularizacao: dto.dataRegularizacao ?? "",
    dataConclusaoHabilitacao: dto.dataConclusaoHabilitacao ?? "",

    exigenciaOuPendencia: dto.exigenciaOuPendencia ?? "",
    providenciaTomada: dto.providenciaTomada ?? "",
    motivoInabilitacao: dto.motivoInabilitacao ?? "",
    observacoes: dto.observacoes ?? "",

    statusHabilitacao: dto.statusHabilitacao ?? "NAO_INICIADO",
  };
}

export function buildHabilitacaoPayload(
  form: Habilitacao,
): HabilitacaoPayloadDTO {
  return {
    id: form.id ? Number(form.id) : undefined,

    propostaEditalId: form.propostaEdital ? Number(form.propostaEdital) : null,
    agenteId: form.agente ? Number(form.agente) : null,

    dataInicioHabilitacao: form.dataInicioHabilitacao || null,
    dataLimiteHabilitacao: form.dataLimiteHabilitacao || null,
    dataEnvioDocumentacao: form.dataEnvioDocumentacao || null,
    dataRetornoAnalise: form.dataRetornoAnalise || null,
    dataRegularizacao: form.dataRegularizacao || null,
    dataConclusaoHabilitacao: form.dataConclusaoHabilitacao || null,

    exigenciaOuPendencia: form.exigenciaOuPendencia.trim() || null,
    providenciaTomada: form.providenciaTomada.trim() || null,
    motivoInabilitacao: form.motivoInabilitacao.trim() || null,
    observacoes: form.observacoes.trim() || null,

    statusHabilitacao: form.statusHabilitacao,
  };
}

export async function getHabilitacoes(): Promise<Habilitacao[]> {
  const response = await fetch(`${API_URL}/habilitacoes-propostas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: HabilitacaoPropostaDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapHabilitacao);
}

export async function getHabilitacaoById(id: number): Promise<Habilitacao> {
  const response = await fetch(`${API_URL}/habilitacoes-propostas/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: HabilitacaoPropostaDTO = await response.json();

  return mapHabilitacao(data);
}

export async function createHabilitacao(
  payload: HabilitacaoPayloadDTO,
): Promise<Habilitacao> {
  const response = await fetch(`${API_URL}/habilitacoes-propostas`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: HabilitacaoPropostaDTO = await response.json();

  return mapHabilitacao(data);
}

export async function updateHabilitacao(
  id: number,
  payload: HabilitacaoPayloadDTO,
): Promise<Habilitacao> {
  const response = await fetch(`${API_URL}/habilitacoes-propostas/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: HabilitacaoPropostaDTO = await response.json();

  return mapHabilitacao(data);
}

export async function deleteHabilitacao(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/habilitacoes-propostas/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getPropostasEditalOptions(): Promise<PropostaOption[]> {
  const data = await fetchJsonWithFallback<PropostaApiResponse[]>(
    [`${API_URL}/propostas-editais`, `${API_URL}/propostas-edital`],
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.tituloProjeto,
            item.tituloProposta,
            item.nomeProposta,
            item.nomeEdital,
            item.titulo,
            item.nome,
          ) || `Proposta ${item.id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getAgentesOptions(): Promise<AgenteOption[]> {
  const response = await fetch(`${API_URL}/agentes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomePrincipal,
            item.nomeCompleto,
            item.razaoSocial,
            item.nomeFantasia,
            item.nomeColetivo,
            item.nome,
          ) || `Agente ${item.id}`,
      };
    })
    .filter((item) => item.id);
}

export const propostaNomeHabilitacao = (
  id?: string,
  propostas: PropostaOption[] = [],
  fallback?: string,
) => {
  if (!id) return fallback?.trim() || "—";

  return (
    propostas.find((proposta) => String(proposta.id) === String(id))?.nome ??
    fallback?.trim() ??
    "—"
  );
};

export const agenteNomeHabilitacao = (
  id?: string,
  agentes: AgenteOption[] = [],
  fallback?: string,
) => {
  if (!id) return fallback?.trim() || "—";

  return (
    agentes.find((agente) => String(agente.id) === String(id))?.nome ??
    fallback?.trim() ??
    "—"
  );
};

export const formatDateBr = (iso?: string | null) => {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
};

export const statusHabilitacaoLabel = (value?: string) =>
  statusHabilitacaoOptions.find((option) => option.value === value)?.label ??
  "—";

export const statusHabilitacaoTone = (
  value?: string,
): "neutral" | "info" | "warning" | "success" | "danger" => {
  switch (value) {
    case "HABILITADO":
    case "HABILITADA_APOS_RECURSO":
    case "REGULARIZADO":
    case "FINALIZADO":
      return "success";

    case "INABILITADO":
    case "INABILITADA_DEFINITIVO":
    case "CANCELADO":
      return "danger";

    case "NAO_INICIADO":
    case "EM_PREPARACAO":
    case "DOCUMENTACAO_PENDENTE":
    case "EM_REGULARIZACAO":
      return "warning";

    case "DOCUMENTACAO_ENVIADA":
    case "EM_ANALISE":
    case "RECURSO_ENVIADO":
      return "info";

    default:
      return "neutral";
  }
};
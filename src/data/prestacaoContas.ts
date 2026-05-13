const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

export const statusPrestacaoContasOptions = [
  { value: "NAO_INICIADA", label: "Não iniciada" },
  { value: "EM_ELABORACAO", label: "Em elaboração" },
  { value: "AGUARDANDO_DOCUMENTOS", label: "Aguardando documentos" },
  { value: "PRONTA_PARA_ENVIO", label: "Pronta para envio" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "APROVADA_COM_RESSALVAS", label: "Aprovada com ressalvas" },
  { value: "REPROVADA", label: "Reprovada" },
] as const;

export type StatusPrestacaoContas =
  (typeof statusPrestacaoContasOptions)[number]["value"];

export const statusPrestacaoContasLabel = (value?: string | null) =>
  statusPrestacaoContasOptions.find((item) => item.value === value)?.label ??
  "—";

export const statusPrestacaoContasTone = (
  value?: string | null,
): "neutral" | "info" | "warning" | "success" | "danger" => {
  switch (value) {
    case "APROVADA":
      return "success";

    case "APROVADA_COM_RESSALVAS":
      return "warning";

    case "REPROVADA":
      return "danger";

    case "ENVIADA":
    case "EM_ANALISE":
    case "PRONTA_PARA_ENVIO":
      return "info";

    case "NAO_INICIADA":
    case "EM_ELABORACAO":
    case "AGUARDANDO_DOCUMENTOS":
      return "warning";

    default:
      return "neutral";
  }
};

export interface PrestacaoContasDTO {
  id?: number;
  periodoInicio?: string | null;
  periodoFim?: string | null;
  dataEnvio?: string | null;
  dataAprovacao?: string | null;
  parecerInterno?: string | null;
  parecerExterno?: string | null;
  observacoesGerais?: string | null;
  statusPrestacaoContas?: StatusPrestacaoContas | null;

  propostaEditalId?: number | string | null;
  planejamentosFinanceirosIds?: Array<number | string> | null;

  // Compatibilidade com nomes antigos/alternativos.
  planejamentoFinanceiroIds?: Array<number | string> | null;
  planejamentoFinanceiroId?: number | string | null;

  propostaEdital?: {
    id?: number | string | null;
    tituloProjeto?: string | null;
    nomeProjeto?: string | null;
    nomeProposta?: string | null;
    tituloProposta?: string | null;
    nomeEdital?: string | null;
    titulo?: string | null;
    nome?: string | null;
  } | null;

  planejamentosFinanceiros?: Array<{
    id?: number | string | null;
    itemPlanejamento?: string | null;
    nomePlanejamento?: string | null;
    nome?: string | null;
    descricao?: string | null;
  }> | null;

  planejamentoFinanceiro?: {
    id?: number | string | null;
    itemPlanejamento?: string | null;
    nomePlanejamento?: string | null;
    nome?: string | null;
    descricao?: string | null;
  } | null;
}

export interface PrestacaoContas {
  id: string;
  propostaEdital: string;
  planejamentosFinanceiros: string[];
  periodoInicio: string;
  periodoFim: string;
  dataEnvio: string;
  dataAprovacao: string;
  statusPrestacaoContas: StatusPrestacaoContas | "";
  parecerInterno: string;
  parecerExterno: string;
  observacoesGerais: string;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
}

export interface PlanejamentoFinanceiroOption {
  id: string;
  nome: string;
}

interface PropostaEditalApiResponse {
  id?: number | string | null;
  tituloProjeto?: string | null;
  nomeProjeto?: string | null;
  nomeProposta?: string | null;
  tituloProposta?: string | null;
  nomeEdital?: string | null;
  titulo?: string | null;
  nome?: string | null;
}

interface PlanejamentoFinanceiroApiResponse {
  id?: number | string | null;
  itemPlanejamento?: string | null;
  nomePlanejamento?: string | null;
  nome?: string | null;
  descricao?: string | null;
}

function isoOrEmpty(value?: string | null) {
  return value ?? "";
}

function toIdString(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pickFirstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeNumberList(values: string[]) {
  return values
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

export function createEmptyPrestacaoContas(): PrestacaoContas {
  return {
    id: "",
    propostaEdital: "",
    planejamentosFinanceiros: [],
    periodoInicio: "",
    periodoFim: "",
    dataEnvio: "",
    dataAprovacao: "",
    statusPrestacaoContas: "",
    parecerInterno: "",
    parecerExterno: "",
    observacoesGerais: "",
  };
}

export function formatDateBr(iso?: string | null) {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function extractPlanejamentosIds(dto: PrestacaoContasDTO): string[] {
  const fromIds =
    dto.planejamentosFinanceirosIds ??
    dto.planejamentoFinanceiroIds ??
    null;

  if (Array.isArray(fromIds)) {
    return uniqueStrings(fromIds.map(toIdString));
  }

  if (Array.isArray(dto.planejamentosFinanceiros)) {
    return uniqueStrings(
      dto.planejamentosFinanceiros.map((item) => toIdString(item.id)),
    );
  }

  const fallbackId =
    dto.planejamentoFinanceiroId ?? dto.planejamentoFinanceiro?.id ?? null;

  return fallbackId ? [toIdString(fallbackId)] : [];
}

export function mapPrestacao(dto: PrestacaoContasDTO): PrestacaoContas {
  const propostaId = dto.propostaEditalId ?? dto.propostaEdital?.id ?? null;

  return {
    id: toIdString(dto.id),
    propostaEdital: toIdString(propostaId),
    planejamentosFinanceiros: extractPlanejamentosIds(dto),
    periodoInicio: isoOrEmpty(dto.periodoInicio),
    periodoFim: isoOrEmpty(dto.periodoFim),
    dataEnvio: isoOrEmpty(dto.dataEnvio),
    dataAprovacao: isoOrEmpty(dto.dataAprovacao),
    statusPrestacaoContas: dto.statusPrestacaoContas ?? "",
    parecerInterno: dto.parecerInterno ?? "",
    parecerExterno: dto.parecerExterno ?? "",
    observacoesGerais: dto.observacoesGerais ?? "",
  };
}

export function buildPrestacaoPayload(
  prestacao: PrestacaoContas,
): PrestacaoContasDTO {
  const planejamentosIds = normalizeNumberList(
    prestacao.planejamentosFinanceiros,
  );

  return {
    id: prestacao.id ? Number(prestacao.id) : undefined,
    periodoInicio: prestacao.periodoInicio || null,
    periodoFim: prestacao.periodoFim || null,
    dataEnvio: prestacao.dataEnvio || null,
    dataAprovacao: prestacao.dataAprovacao || null,
    parecerInterno: prestacao.parecerInterno?.trim() || null,
    parecerExterno: prestacao.parecerExterno?.trim() || null,
    observacoesGerais: prestacao.observacoesGerais?.trim() || null,
    statusPrestacaoContas:
      prestacao.statusPrestacaoContas as StatusPrestacaoContas,
    propostaEditalId: prestacao.propostaEdital
      ? Number(prestacao.propostaEdital)
      : null,
    planejamentosFinanceirosIds: planejamentosIds,
  };
}

export async function getPrestacoesContas(): Promise<PrestacaoContas[]> {
  const response = await fetch(`${API_URL}/prestacoes-contas`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapPrestacao);
}

export async function getPrestacaoContasById(
  id: number,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function createPrestacaoContas(
  payload: PrestacaoContasDTO,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function updatePrestacaoContas(
  id: number,
  payload: PrestacaoContasDTO,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function deletePrestacaoContas(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = String(item.id);

      return {
        id,
        nome:
          pickFirstText(
            item.nomeProposta,
            item.tituloProposta,
            item.nomeProjeto,
            item.tituloProjeto,
            item.nomeEdital,
            item.titulo,
            item.nome,
          ) || `Proposta ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getPlanejamentosFinanceirosOptions(): Promise<
  PlanejamentoFinanceiroOption[]
> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanejamentoFinanceiroApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = String(item.id);

      return {
        id,
        nome:
          pickFirstText(
            item.itemPlanejamento,
            item.nomePlanejamento,
            item.nome,
            item.descricao,
          ) || `Planejamento ${id}`,
      };
    })
    .filter((item) => item.id);
}
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

function getMultipartHeaders() {
  const token = getToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const statusResultadoPropostaOptions = [
  { value: "APROVADO", label: "Aprovado" },
  { value: "SUPLENTE", label: "Suplente" },
  { value: "NAO_CLASSIFICADO", label: "Não classificado" },
] as const;

export type StatusResultadoProposta =
  (typeof statusResultadoPropostaOptions)[number]["value"];

export interface ResultadoPropostaDTO {
  id?: number;

  dataResultado?: string | null;
  pontuacao?: number | string | null;

  urlRelatorioAvaliacao?: string | null;

  recursoInterposto?: boolean | null;
  dataEnvioRecurso?: string | null;
  descricaoRecurso?: string | null;
  urlDocumentoRecurso?: string | null;

  observacoes?: string | null;

  propostaEditalId?: number | null;
  nomePropostaEdital?: string | null;

  editalId?: number | null;
  nomeEdital?: string | null;

  statusResultadoProposta?: StatusResultadoProposta | null;
}

export interface ResultadoPropostaPayloadDTO {
  id?: number;

  dataResultado: string | null;
  pontuacao: number | null;

  urlRelatorioAvaliacao: string | null;

  recursoInterposto: boolean;
  dataEnvioRecurso: string | null;
  descricaoRecurso: string | null;
  urlDocumentoRecurso: string | null;

  observacoes: string | null;

  propostaEditalId: number | null;

  statusResultadoProposta: StatusResultadoProposta | null;
}

export interface ResultadoProposta {
  id: string;

  propostaEdital: string;
  nomePropostaEdital: string;

  edital: string;
  nomeEdital: string;

  dataResultado: string;

  pontuacao: number | null;

  urlRelatorioAvaliacao: string;
  nomeRelatorioAvaliacao: string;

  recursoInterposto: boolean;

  dataEnvioRecurso: string;
  descricaoRecurso: string;

  urlDocumentoRecurso: string;
  nomeDocumentoRecurso: string;

  observacoes: string;

  statusResultadoProposta: StatusResultadoProposta;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
  editalId?: string;
  nomeEdital?: string;
}

interface PropostaEditalApiResponse {
  id?: number | string | null;
  tituloProjeto?: string | null;
  tituloProposta?: string | null;
  nomeProposta?: string | null;
  nomeEdital?: string | null;
  titulo?: string | null;
  nome?: string | null;

  editalId?: number | string | null;
  edital?: {
    id?: number | string | null;
    nomeEdital?: string | null;
    nome?: string | null;
    titulo?: string | null;
  } | null;
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

function getFileNameFromUrl(url?: string | null) {
  if (!url) return "";

  const clean = url.split("?")[0];
  const parts = clean.split("/");
  const last = parts[parts.length - 1];

  return decodeURIComponent(last || "");
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

export function mapResultadoProposta(
  dto: ResultadoPropostaDTO,
): ResultadoProposta {
  const urlRelatorioAvaliacao = dto.urlRelatorioAvaliacao ?? "";
  const urlDocumentoRecurso = dto.urlDocumentoRecurso ?? "";

  return {
    id: normalizeId(dto.id),

    propostaEdital: normalizeId(dto.propostaEditalId),
    nomePropostaEdital: dto.nomePropostaEdital ?? "",

    edital: normalizeId(dto.editalId),
    nomeEdital: dto.nomeEdital ?? "",

    dataResultado: dto.dataResultado ?? "",

    pontuacao:
      dto.pontuacao === null || dto.pontuacao === undefined
        ? null
        : Number(dto.pontuacao),

    urlRelatorioAvaliacao,
    nomeRelatorioAvaliacao: getFileNameFromUrl(urlRelatorioAvaliacao),

    recursoInterposto: Boolean(dto.recursoInterposto),

    dataEnvioRecurso: dto.dataEnvioRecurso ?? "",
    descricaoRecurso: dto.descricaoRecurso ?? "",

    urlDocumentoRecurso,
    nomeDocumentoRecurso: getFileNameFromUrl(urlDocumentoRecurso),

    observacoes: dto.observacoes ?? "",

    statusResultadoProposta:
      dto.statusResultadoProposta ?? "NAO_CLASSIFICADO",
  };
}

export function buildResultadoPropostaPayload(
  form: ResultadoProposta,
): ResultadoPropostaPayloadDTO {
  const recursoInterposto = Boolean(form.recursoInterposto);

  return {
    id: form.id ? Number(form.id) : undefined,

    propostaEditalId: form.propostaEdital ? Number(form.propostaEdital) : null,

    dataResultado: form.dataResultado || null,

    pontuacao:
      form.pontuacao === null || form.pontuacao === undefined
        ? null
        : Number(form.pontuacao),

    urlRelatorioAvaliacao: form.urlRelatorioAvaliacao || null,

    recursoInterposto,

    dataEnvioRecurso: recursoInterposto ? form.dataEnvioRecurso || null : null,

    descricaoRecurso: recursoInterposto
      ? form.descricaoRecurso.trim() || null
      : null,

    urlDocumentoRecurso: recursoInterposto
      ? form.urlDocumentoRecurso || null
      : null,

    observacoes: form.observacoes.trim() || null,

    statusResultadoProposta: form.statusResultadoProposta || null,
  };
}

function buildResultadoFormData(
  payload: ResultadoPropostaPayloadDTO,
  relatorioAvaliacao?: File | null,
  documentoRecurso?: File | null,
) {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (relatorioAvaliacao) {
    formData.append("relatorioAvaliacao", relatorioAvaliacao);
  }

  if (documentoRecurso) {
    formData.append("documentoRecurso", documentoRecurso);
  }

  return formData;
}

export async function getResultadosPropostas(): Promise<ResultadoProposta[]> {
  const response = await fetch(`${API_URL}/resultados-propostas`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ResultadoPropostaDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapResultadoProposta);
}

export async function getResultadoPropostaById(
  id: number,
): Promise<ResultadoProposta> {
  const response = await fetch(`${API_URL}/resultados-propostas/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ResultadoPropostaDTO = await response.json();

  return mapResultadoProposta(data);
}

export async function createResultadoProposta(
  payload: ResultadoPropostaPayloadDTO,
  relatorioAvaliacao?: File | null,
  documentoRecurso?: File | null,
): Promise<ResultadoProposta> {
  const formData = buildResultadoFormData(
    payload,
    relatorioAvaliacao,
    documentoRecurso,
  );

  const response = await fetch(`${API_URL}/resultados-propostas`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ResultadoPropostaDTO = await response.json();

  return mapResultadoProposta(data);
}

export async function updateResultadoProposta(
  id: number,
  payload: ResultadoPropostaPayloadDTO,
  relatorioAvaliacao?: File | null,
  documentoRecurso?: File | null,
): Promise<ResultadoProposta> {
  const formData = buildResultadoFormData(
    payload,
    relatorioAvaliacao,
    documentoRecurso,
  );

  const response = await fetch(`${API_URL}/resultados-propostas/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ResultadoPropostaDTO = await response.json();

  return mapResultadoProposta(data);
}

export async function deleteResultadoProposta(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/resultados-propostas/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getRelatorioAvaliacaoDownloadUrl(
  id: number,
): Promise<string> {
  const response = await fetch(
    `${API_URL}/resultados-propostas/${id}/relatorio-avaliacao/download`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.text();
}

export async function getDocumentoRecursoDownloadUrl(
  id: number,
): Promise<string> {
  const response = await fetch(
    `${API_URL}/resultados-propostas/${id}/documento-recurso/download`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.text();
}

export async function getPropostasEditalOptions(): Promise<
  PropostaEditalOption[]
> {
  const data = await fetchJsonWithFallback<PropostaEditalApiResponse[]>(
    [`${API_URL}/propostas-editais`, `${API_URL}/propostas-edital`],
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);
      const editalId = normalizeId(item.editalId ?? item.edital);

      const nomeEdital =
        pickText(
          item.edital?.nomeEdital,
          item.edital?.nome,
          item.edital?.titulo,
          item.nomeEdital,
        ) || "";

      return {
        id,
        nome:
          pickText(
            item.tituloProjeto,
            item.tituloProposta,
            item.nomeProposta,
            item.titulo,
            item.nome,
          ) || `Proposta ${id}`,
        editalId,
        nomeEdital,
      };
    })
    .filter((item) => item.id);
}

export const propostaNomeResultado = (
  id?: string,
  propostas: PropostaEditalOption[] = [],
  fallback?: string,
) => {
  if (!id) return fallback?.trim() || "—";

  return (
    propostas.find((proposta) => String(proposta.id) === String(id))?.nome ??
    fallback?.trim() ??
    "—"
  );
};

export const editalNomeResultado = (
  propostaId?: string,
  propostas: PropostaEditalOption[] = [],
  fallback?: string,
) => {
  if (fallback?.trim()) return fallback.trim();

  if (!propostaId) return "—";

  return (
    propostas.find((proposta) => String(proposta.id) === String(propostaId))
      ?.nomeEdital || "—"
  );
};

export const statusResultadoPropostaLabel = (value?: string) =>
  statusResultadoPropostaOptions.find((option) => option.value === value)
    ?.label ?? "—";

export const statusResultadoPropostaTone = (
  value?: string,
): "neutral" | "info" | "warning" | "success" | "danger" => {
  switch (value) {
    case "APROVADO":
      return "success";

    case "SUPLENTE":
      return "warning";

    case "NAO_CLASSIFICADO":
      return "danger";

    default:
      return "neutral";
  }
};

export const formatDateBr = (iso?: string | null) => {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
};

export const formatPontuacao = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export const parsePontuacao = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;

  return parsed;
};
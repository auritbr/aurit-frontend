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

export const tipoDestinatarioOptions = [
  { value: "COLABORADOR", label: "Colaborador" },
  { value: "PARTICIPANTE", label: "Participante" },
  { value: "INTEGRANTE", label: "Integrante" },
  { value: "DESTINATARIO_EXTERNO", label: "Destinatário Externo" },
] as const;

export const estadoConservacaoEmprestimoOptions = [
  { value: "NOVO", label: "Novo" },
  { value: "USADO", label: "Usado" },
  { value: "DANIFICADO", label: "Danificado" },
  { value: "INUTILIZADO", label: "Inutilizado" },
] as const;

export const estadoDevolucaoOptions = [
  { value: "CONSERVADO", label: "Conservado" },
  { value: "DANIFICADO", label: "Danificado" },
  { value: "INUTILIZADO", label: "Inutilizado" },
] as const;

export const statusEmprestimoOptions = [
  { value: "EM_ANDAMENTO", label: "Em Andamento" },
  { value: "DEVOLVIDO", label: "Devolvido" },
  { value: "ATRASADO", label: "Atrasado" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;

export type TipoDestinatarioEmprestimo =
  (typeof tipoDestinatarioOptions)[number]["value"];

export type EstadoConservacaoEmprestimo =
  (typeof estadoConservacaoEmprestimoOptions)[number]["value"];

export type EstadoDevolucao = (typeof estadoDevolucaoOptions)[number]["value"];

export type StatusEmprestimo = (typeof statusEmprestimoOptions)[number]["value"];

export const tipoDestinatarioLabel = (value?: string) =>
  tipoDestinatarioOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const estadoConservacaoEmprestimoLabel = (value?: string) =>
  estadoConservacaoEmprestimoOptions.find((item) => item.value === value)
    ?.label ??
  value ??
  "—";

export const estadoDevolucaoLabel = (value?: string) =>
  estadoDevolucaoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const statusEmprestimoLabel = (value?: string) =>
  statusEmprestimoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export interface EmprestimoDTO {
  id?: number;

  patrimonioId: number;

  dataEmprestimo: string;
  dataPrevistaDevolucao?: string | null;
  dataDevolucao?: string | null;

  observacaoEmprestimo?: string | null;
  observacaoDevolucao?: string | null;

  destinatarioExterno?: string | null;

  estadoConservacao: string;
  estadoDevolucao?: string | null;

  tipoDestinatarioEmprestimo: string;
  statusEmprestimo: string;

  colaboradorId?: number | null;
  participanteId?: number | null;
  integranteId?: number | null;

  projetoId?: number | null;
  propostaEditalId?: number | null;
  atividadeId?: number | null;
  eventoCulturalId?: number | null;
}

export interface Emprestimo {
  id: string;

  patrimonioId: string;

  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string;

  observacaoEmprestimo: string;
  observacaoDevolucao: string;

  tipoDestinatario: string;

  colaboradorId: string;
  participanteId: string;
  integranteId: string;
  destinatarioExterno: string;

  estadoConservacao: string;
  estadoDevolucao: string;

  statusEmprestimo: string;

  projetoId: string;
  propostaEditalId: string;
  atividadeId: string;
  eventoCulturalId: string;
}

function isoToBr(date?: string | null) {
  if (!date) return "";

  const clean = date.trim();

  if (!clean) return "";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) {
    return clean;
  }

  return `${day}/${month}/${year}`;
}

function brToIso(date?: string | null) {
  if (!date) return "";

  const clean = date.trim();

  if (!clean) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const [day, month, year] = clean.split("/");

  if (!day || !month || !year) {
    return clean;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function idOrNull(value?: string) {
  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function mapEmprestimo(dto: EmprestimoDTO): Emprestimo {
  return {
    id: String(dto.id ?? ""),

    patrimonioId: dto.patrimonioId != null ? String(dto.patrimonioId) : "",

    dataEmprestimo: isoToBr(dto.dataEmprestimo),
    dataPrevistaDevolucao: isoToBr(dto.dataPrevistaDevolucao),
    dataDevolucao: isoToBr(dto.dataDevolucao),

    observacaoEmprestimo: dto.observacaoEmprestimo ?? "",
    observacaoDevolucao: dto.observacaoDevolucao ?? "",

    tipoDestinatario: dto.tipoDestinatarioEmprestimo ?? "",

    colaboradorId:
      dto.colaboradorId !== null && dto.colaboradorId !== undefined
        ? String(dto.colaboradorId)
        : "",

    participanteId:
      dto.participanteId !== null && dto.participanteId !== undefined
        ? String(dto.participanteId)
        : "",

    integranteId:
      dto.integranteId !== null && dto.integranteId !== undefined
        ? String(dto.integranteId)
        : "",

    destinatarioExterno: dto.destinatarioExterno ?? "",

    estadoConservacao: dto.estadoConservacao ?? "",
    estadoDevolucao: dto.estadoDevolucao ?? "",

    statusEmprestimo: dto.statusEmprestimo ?? "",

    projetoId:
      dto.projetoId !== null && dto.projetoId !== undefined
        ? String(dto.projetoId)
        : "",

    propostaEditalId:
      dto.propostaEditalId !== null && dto.propostaEditalId !== undefined
        ? String(dto.propostaEditalId)
        : "",

    atividadeId:
      dto.atividadeId !== null && dto.atividadeId !== undefined
        ? String(dto.atividadeId)
        : "",

    eventoCulturalId:
      dto.eventoCulturalId !== null && dto.eventoCulturalId !== undefined
        ? String(dto.eventoCulturalId)
        : "",
  };
}

export function buildEmprestimoPayload(form: Emprestimo): EmprestimoDTO {
  const devolvido = form.statusEmprestimo === "DEVOLVIDO";

  return {
    id: form.id ? Number(form.id) : undefined,

    patrimonioId: Number(form.patrimonioId),

    dataEmprestimo: brToIso(form.dataEmprestimo),

    dataPrevistaDevolucao: form.dataPrevistaDevolucao
      ? brToIso(form.dataPrevistaDevolucao)
      : null,

    dataDevolucao:
      devolvido && form.dataDevolucao ? brToIso(form.dataDevolucao) : null,

    observacaoEmprestimo: emptyToNull(form.observacaoEmprestimo),

    observacaoDevolucao: devolvido
      ? emptyToNull(form.observacaoDevolucao)
      : null,

    destinatarioExterno:
      form.tipoDestinatario === "DESTINATARIO_EXTERNO"
        ? emptyToNull(form.destinatarioExterno)
        : null,

    estadoConservacao: form.estadoConservacao,

    estadoDevolucao: devolvido ? form.estadoDevolucao || null : null,

    tipoDestinatarioEmprestimo: form.tipoDestinatario,

    statusEmprestimo: form.statusEmprestimo,

    colaboradorId:
      form.tipoDestinatario === "COLABORADOR"
        ? idOrNull(form.colaboradorId)
        : null,

    participanteId:
      form.tipoDestinatario === "PARTICIPANTE"
        ? idOrNull(form.participanteId)
        : null,

    integranteId:
      form.tipoDestinatario === "INTEGRANTE"
        ? idOrNull(form.integranteId)
        : null,

    projetoId: idOrNull(form.projetoId),
    propostaEditalId: idOrNull(form.propostaEditalId),
    atividadeId: idOrNull(form.atividadeId),
    eventoCulturalId: idOrNull(form.eventoCulturalId),
  };
}

export async function getEmprestimos(): Promise<Emprestimo[]> {
  const response = await fetch(`${API_URL}/emprestimos`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EmprestimoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapEmprestimo);
}

export async function getEmprestimoById(id: number): Promise<Emprestimo> {
  const response = await fetch(`${API_URL}/emprestimos/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EmprestimoDTO = await response.json();

  return mapEmprestimo(data);
}

export async function createEmprestimo(
  payload: EmprestimoDTO,
): Promise<Emprestimo> {
  const response = await fetch(`${API_URL}/emprestimos`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EmprestimoDTO = await response.json();

  return mapEmprestimo(data);
}

export async function updateEmprestimo(
  id: number,
  payload: EmprestimoDTO,
): Promise<Emprestimo> {
  const response = await fetch(`${API_URL}/emprestimos/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EmprestimoDTO = await response.json();

  return mapEmprestimo(data);
}

export async function deleteEmprestimo(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/emprestimos/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
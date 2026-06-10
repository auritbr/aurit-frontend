import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type StatusPresenca =
  | "PRESENTE"
  | "AUSENTE"
  | "NAO_TEVE_AULA"
  | "FERIADO";

export const statusPresencaOptions: { value: StatusPresenca; label: string }[] =
  [
    { value: "PRESENTE", label: "Presente" },
    { value: "AUSENTE", label: "Ausente" },
    { value: "NAO_TEVE_AULA", label: "Não teve aula" },
    { value: "FERIADO", label: "Feriado" },
  ];

export interface RelatorioOption {
  id: string;
  nome: string;
  atividadeId?: string;
}

export interface RegistroPresenca {
  id: string;
  presencaId: string;
  participanteId: string;
  participanteNome: string;
  atividadeId: string;
  atividadeNome: string;
  turmaId?: string;
  turmaNome?: string;
  data: string;
  status: StatusPresenca;
  observacao?: string;
}

interface PresencaParticipanteApiDTO {
  id?: number | string | null;
  participanteId?: number | string | null;
  statusPresenca?: StatusPresenca | string | null;
}

interface PresencaApiDTO {
  id?: number | string | null;
  ano?: number | null;
  dataPresenca?: DateApiValue;
  observacaoAula?: string | null;
  atividadeId?: number | string | null;
  turmaId?: number | string | null;
  planoAulaId?: number | string | null;
  participantes?: PresencaParticipanteApiDTO[] | null;
}

interface AtividadeApiDTO {
  id?: number | string | null;
  nomeAtividade?: string | null;
  nome?: string | null;
  titulo?: string | null;
  descricao?: string | null;
}

interface TurmaApiDTO {
  id?: number | string | null;
  nome?: string | null;
  nomeTurma?: string | null;
  descricao?: string | null;
  atividadeId?: number | string | null;
  atividade?: {
    id?: number | string | null;
  } | null;
}

interface ParticipanteApiDTO {
  id?: number | string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
  participanteNome?: string | null;
}

type DateApiValue =
  | string
  | number[]
  | {
      year?: number;
      month?: number;
      day?: number;
      monthValue?: number;
      dayOfMonth?: number;
    }
  | null
  | undefined;

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

async function getApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function getApiListSafe<T>(path: string): Promise<T[]> {
  try {
    const data = await getApi<T[]>(path);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function toIdString(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") {
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

function normalizeDateInput(value: DateApiValue): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    const [year, month, day] = value;

    if (!year || !month || !day) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}`;
  }

  if (typeof value === "object") {
    const year = value.year;
    const month = value.monthValue ?? value.month;
    const day = value.dayOfMonth ?? value.day;

    if (!year || !month || !day) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}`;
  }

  const clean = String(value).trim();

  if (!clean) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    return clean.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split("/");
    return `${year}-${month}-${day}`;
  }

  return clean;
}

function normalizarStatus(value?: string | null): StatusPresenca {
  const status = String(value ?? "").toUpperCase();

  if (
    status === "PRESENTE" ||
    status === "AUSENTE" ||
    status === "NAO_TEVE_AULA" ||
    status === "FERIADO"
  ) {
    return status;
  }

  return "AUSENTE";
}

function mapAtividades(data: AtividadeApiDTO[]): RelatorioOption[] {
  return data
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomeAtividade,
            item.nome,
            item.titulo,
            item.descricao,
          ) || `Atividade ${id}`,
      };
    });
}

function mapTurmas(data: TurmaApiDTO[]): RelatorioOption[] {
  return data
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);
      const atividadeId = toIdString(item.atividadeId ?? item.atividade?.id);

      return {
        id,
        atividadeId,
        nome: pickText(item.nome, item.nomeTurma, item.descricao) || `Turma ${id}`,
      };
    });
}

function mapParticipantes(data: ParticipanteApiDTO[]): RelatorioOption[] {
  return data
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);

      return {
        id,
        nome:
          pickText(item.nomeCompleto, item.nome, item.participanteNome) ||
          `Participante ${id}`,
      };
    });
}

function montarRegistrosPresenca(params: {
  presencas: PresencaApiDTO[];
  atividades: RelatorioOption[];
  turmas: RelatorioOption[];
  participantes: RelatorioOption[];
}): RegistroPresenca[] {
  const atividadeNomePorId = new Map(
    params.atividades.map((item) => [item.id, item.nome]),
  );

  const turmaNomePorId = new Map(params.turmas.map((item) => [item.id, item.nome]));

  const participanteNomePorId = new Map(
    params.participantes.map((item) => [item.id, item.nome]),
  );

  return params.presencas.flatMap((presenca) => {
    const presencaId = toIdString(presenca.id);
    const atividadeId = toIdString(presenca.atividadeId);
    const turmaId = toIdString(presenca.turmaId);
    const data = normalizeDateInput(presenca.dataPresenca);
    const participantes = presenca.participantes ?? [];

    return participantes.map((participante, index) => {
      const participanteId = toIdString(participante.participanteId);
      const participanteRegistroId = toIdString(participante.id);

      return {
        id: participanteRegistroId || `${presencaId}-${participanteId || index}`,
        presencaId,
        participanteId,
        participanteNome:
          participanteNomePorId.get(participanteId) ||
          `Participante ${participanteId || "não informado"}`,
        atividadeId,
        atividadeNome:
          atividadeNomePorId.get(atividadeId) ||
          `Atividade ${atividadeId || "não informada"}`,
        turmaId: turmaId || undefined,
        turmaNome: turmaId
          ? turmaNomePorId.get(turmaId) || `Turma ${turmaId}`
          : undefined,
        data,
        status: normalizarStatus(participante.statusPresenca),
        observacao: presenca.observacaoAula?.trim() || undefined,
      };
    });
  });
}

export async function getRelatorioPresencasData(): Promise<{
  registros: RegistroPresenca[];
  atividades: RelatorioOption[];
  turmas: RelatorioOption[];
}> {
  const [presencas, atividadesRaw, turmasRaw, participantesRaw] =
    await Promise.all([
      getApi<PresencaApiDTO[]>("/presencas"),
      getApiListSafe<AtividadeApiDTO>("/atividades"),
      getApiListSafe<TurmaApiDTO>("/turmas"),
      getApiListSafe<ParticipanteApiDTO>("/participantes"),
    ]);

  const atividades = mapAtividades(atividadesRaw);
  const turmas = mapTurmas(turmasRaw);
  const participantes = mapParticipantes(participantesRaw);

  const registros = montarRegistrosPresenca({
    presencas: Array.isArray(presencas) ? presencas : [],
    atividades,
    turmas,
    participantes,
  });

  return {
    registros,
    atividades,
    turmas,
  };
}

export async function getRegistrosPresenca(): Promise<RegistroPresenca[]> {
  const data = await getRelatorioPresencasData();

  return data.registros;
}

export function anosDisponiveisPresenca(registros: RegistroPresenca[]): string[] {
  const set = new Set<string>();

  registros.forEach((registro) => {
    if (registro.data) {
      set.add(registro.data.slice(0, 4));
    }
  });

  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

export function mesesDisponiveisPresenca(registros: RegistroPresenca[]): string[] {
  const set = new Set<string>();

  registros.forEach((registro) => {
    if (registro.data && registro.data.length >= 7) {
      set.add(registro.data.slice(5, 7));
    }
  });

  return Array.from(set).sort((a, b) => Number(a) - Number(b));
}
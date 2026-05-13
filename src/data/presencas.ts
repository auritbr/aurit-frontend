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

export const statusPresenca = [
    { value: "PRESENTE", label: "Presente" },
    { value: "AUSENTE", label: "Ausente" },
    { value: "NAO_TEVE_AULA", label: "Não teve aula" },
    { value: "FERIADO", label: "Feriado" },
] as const;

export type StatusPresencaValue = (typeof statusPresenca)[number]["value"];

export type StatusMatricula =
    | "MATRICULADO"
    | "EM_ESPERA"
    | "CANCELADO"
    | "DESISTENTE"
    | "CONCLUIDO";

export interface AtividadeApiDTO {
    id?: number | string;
    nomeAtividade?: string | null;
    nome?: string | null;
}

export interface TurmaApiDTO {
    id?: number | string;
    nomeTurma?: string | null;
    nome?: string | null;
    atividadeId?: number | string | null;
    atividade?: {
        id?: number | string | null;
    } | null;
}

export interface ParticipanteAtividadeApiDTO {
    id?: number | string;
    dataMatricula?: string | null;
    atividadeExercida?: string | null;
    atividadeId?: number | string | null;
    turmaId?: number | string | null;
    statusMatricula?: StatusMatricula | string | null;

    atividade?: {
        id?: number | string | null;
        nomeAtividade?: string | null;
        nome?: string | null;
    } | null;

    turma?: {
        id?: number | string | null;
        nomeTurma?: string | null;
        nome?: string | null;
    } | null;
}

export interface ParticipanteApiDTO {
    id?: number | string;
    nomeCompleto?: string | null;
    nome?: string | null;

    vinculos?: ParticipanteAtividadeApiDTO[] | null;
    atividades?: ParticipanteAtividadeApiDTO[] | null;
    participanteAtividades?: ParticipanteAtividadeApiDTO[] | null;
    vinculosAtividades?: ParticipanteAtividadeApiDTO[] | null;
}

export interface AtividadeOption {
    id: string;
    nomeAtividade: string;
}

export interface TurmaOption {
    id: string;
    nomeTurma: string;
    atividadeId: string;
}

export interface ParticipanteRow {
    id: string;
    nome: string;
    status: StatusPresencaValue;
}

export interface PresencaParticipantePayload {
    participanteId: number;
    statusPresenca: StatusPresencaValue;
}

export interface PresencaPayload {
    ano: number;
    dataPresenca: string;
    observacaoAula: string;
    atividadeId: number;
    turmaId: number | null;
    participantes: PresencaParticipantePayload[];
}

function normalizeId(value: unknown): string {
    if (value === null || value === undefined || value === "") return "";

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;

        if (record.id !== null && record.id !== undefined) {
            return String(record.id);
        }

        return "";
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

function compareByName<T extends { nomeAtividade?: string; nomeTurma?: string }>(
    a: T,
    b: T,
) {
    const nomeA = a.nomeAtividade ?? a.nomeTurma ?? "";
    const nomeB = b.nomeAtividade ?? b.nomeTurma ?? "";

    return nomeA.localeCompare(nomeB, "pt-BR");
}

export function matriculaPermitePresenca(statusMatricula?: string | null) {
    const status = statusMatricula || "MATRICULADO";

    return status === "MATRICULADO" || status === "CONCLUIDO";
}

export function getVinculosParticipante(
    participante: ParticipanteApiDTO,
): ParticipanteAtividadeApiDTO[] {
    return (
        participante.vinculos ??
        participante.atividades ??
        participante.participanteAtividades ??
        participante.vinculosAtividades ??
        []
    );
}

export function mapAtividadeOption(dto: AtividadeApiDTO): AtividadeOption {
    const id = normalizeId(dto.id);

    return {
        id,
        nomeAtividade:
            pickText(dto.nomeAtividade, dto.nome) || `Atividade ${id || ""}`.trim(),
    };
}

export function mapTurmaOption(dto: TurmaApiDTO): TurmaOption {
    const id = normalizeId(dto.id);
    const atividadeId = normalizeId(dto.atividadeId ?? dto.atividade);

    return {
        id,
        atividadeId,
        nomeTurma: pickText(dto.nomeTurma, dto.nome) || `Turma ${id || ""}`.trim(),
    };
}

export function getParticipantesVinculadosPresenca(params: {
    participantes: ParticipanteApiDTO[];
    atividadeId: string;
    turmaId?: string;
}): ParticipanteRow[] {
    const { participantes, atividadeId, turmaId } = params;

    const vinculados = participantes.filter((participante) =>
        getVinculosParticipante(participante).some((vinculo) => {
            const vinculoAtividadeId = normalizeId(
                vinculo.atividadeId ?? vinculo.atividade,
            );

            const vinculoTurmaId = normalizeId(vinculo.turmaId ?? vinculo.turma);

            const mesmaAtividade = vinculoAtividadeId === atividadeId;

            if (!mesmaAtividade) return false;

            if (!matriculaPermitePresenca(vinculo.statusMatricula)) {
                return false;
            }

            if (turmaId) {
                return vinculoTurmaId === turmaId;
            }

            return !vinculoTurmaId;
        }),
    );

    const rowsMap = new Map<string, ParticipanteRow>();

    for (const participante of vinculados) {
        const id = normalizeId(participante.id);

        if (!id) continue;

        rowsMap.set(id, {
            id,
            nome:
                pickText(participante.nomeCompleto, participante.nome) ||
                `Participante ${id}`,
            status: "PRESENTE",
        });
    }

    return Array.from(rowsMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

export async function getAtividadesPresenca(): Promise<AtividadeOption[]> {
    const response = await fetch(`${API_URL}/atividades`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    const data: AtividadeApiDTO[] = await response.json();

    return (Array.isArray(data) ? data : [])
        .map(mapAtividadeOption)
        .filter((item) => item.id)
        .sort(compareByName);
}

export async function getTurmasPresenca(): Promise<TurmaOption[]> {
    const response = await fetch(`${API_URL}/turmas`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    const data: TurmaApiDTO[] = await response.json();

    return (Array.isArray(data) ? data : [])
        .map(mapTurmaOption)
        .filter((item) => item.id)
        .sort(compareByName);
}

export async function getParticipantesPresenca(): Promise<ParticipanteApiDTO[]> {
    const response = await fetch(`${API_URL}/participantes`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    const data: ParticipanteApiDTO[] = await response.json();

    return Array.isArray(data) ? data : [];
}

export async function createPresenca(payload: PresencaPayload): Promise<void> {
    const response = await fetch(`${API_URL}/presencas`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }
}

export async function getPresencasBaseData(): Promise<{
    atividades: AtividadeOption[];
    turmas: TurmaOption[];
    participantes: ParticipanteApiDTO[];
}> {
    const [atividades, turmas, participantes] = await Promise.all([
        getAtividadesPresenca(),
        getTurmasPresenca(),
        getParticipantesPresenca(),
    ]);

    return {
        atividades,
        turmas,
        participantes,
    };
}
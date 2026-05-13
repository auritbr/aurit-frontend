const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface DashboardResponse<T> {
  data: T | null;
  unavailable: boolean;
  accessDeniedMessage?: string;
}

export interface DistribuicaoItem {
  label: string;
  valor: number;
}

export interface ParticipanteAtividadeRaw {
  id?: number | string;
  participanteId?: number | string;
  atividadeId?: number | string;
  turmaId?: number | string;
  atividadeExercida?: string;
  statusMatricula?: string;
  dataMatricula?: string;

  atividade?: {
    id?: number | string;
    nomeAtividade?: string;
    nome?: string;
  };

  turma?: {
    id?: number | string;
    nomeTurma?: string;
    nome?: string;
  };
}

export interface ParticipanteRaw {
  id?: number | string;
  nomeCompleto?: string;
  nome?: string;
  status?: string;

  atividades?: ParticipanteAtividadeRaw[];
  participanteAtividades?: ParticipanteAtividadeRaw[];
  vinculos?: ParticipanteAtividadeRaw[];
  vinculosAtividades?: ParticipanteAtividadeRaw[];
}

export interface AtividadeRaw {
  id?: number | string;
  nomeAtividade?: string;
  nome?: string;
  tipoAtividade?: string;
  tipo?: string;
  status?: string;
}

export interface ProjetoRaw {
  id?: number | string;
  nomeProjeto?: string;
  nome?: string;
  areaAtuacao?: string;
  status?: string;
}

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `Erro ${response.status} ao processar requisição.`;
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

function isAccessDeniedMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("access denied") ||
    normalized.includes("acesso negado") ||
    normalized.includes("permissão") ||
    normalized.includes("permissao") ||
    normalized.includes("plano") ||
    normalized.includes("403")
  );
}

async function fetchList<T>(path: string): Promise<DashboardResponse<T[]>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseError(response);

      if (response.status === 403 || isAccessDeniedMessage(message)) {
        return {
          data: null,
          unavailable: false,
          accessDeniedMessage: message,
        };
      }

      return {
        data: null,
        unavailable: true,
      };
    }

    const data = await response.json();

    return {
      data: Array.isArray(data) ? data : [],
      unavailable: false,
    };
  } catch {
    return {
      data: null,
      unavailable: true,
    };
  }
}

export async function getParticipantesList(): Promise<
  DashboardResponse<ParticipanteRaw[]>
> {
  return fetchList<ParticipanteRaw>("/participantes");
}

export async function getAtividadesList(): Promise<
  DashboardResponse<AtividadeRaw[]>
> {
  return fetchList<AtividadeRaw>("/atividades");
}

export async function getProjetosList(): Promise<
  DashboardResponse<ProjetoRaw[]>
> {
  return fetchList<ProjetoRaw>("/projetos");
}

export function fmtNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR");
}

export function labelStatus(value?: string | null) {
  const map: Record<string, string> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
    CONCLUIDA: "Concluída",
    EM_ANDAMENTO: "Em andamento",
    CANCELADO: "Cancelado",
    ATRASADO: "Atrasado",
  };

  if (!value) return "Não informado";

  return map[value] ?? value;
}

export function labelTipoAtividade(value?: string | null) {
  const map: Record<string, string> = {
    OFICINA: "Oficina",
    CURSO: "Curso",
    WORKSHOP: "Workshop",
    PALESTRA: "Palestra",
    SEMINARIO: "Seminário",
    FORMACAO_CONTINUADA: "Formação continuada",
    ATIVIDADE_EDUCATIVA: "Atividade educativa",
    INTEGRACAO_COMUNITARIA: "Integração comunitária",
    CAPACITACAO_TECNICA: "Capacitação técnica",
    RODA_DE_CONVERSA: "Roda de conversa",
    EVENTO: "Evento",
    PROJETO: "Projeto",
    OUTRO: "Outro",
  };

  if (!value) return "Não informado";

  return map[value] ?? value;
}

export function labelAreaAtuacao(value?: string | null) {
  const map: Record<string, string> = {
    CULTURA_ARTE: "Cultura e arte",
    EDUCACAO: "Educação",
    ASSISTENCIA_SOCIAL: "Assistência social",
    ESPORTE: "Esporte",
    MEIO_AMBIENTE: "Meio ambiente",
    ECONOMIA: "Economia",
    DIREITOS_HUMANOS: "Direitos humanos",
    SAUDE: "Saúde",
    TECNOLOGIA: "Tecnologia",
    OUTRO: "Outro",
  };

  if (!value) return "Não informado";

  return map[value] ?? value;
}

export function countByStatus<T extends { status?: string }>(
  list: T[] | null | undefined,
  status: string,
) {
  return (list ?? []).filter((item) => item.status === status).length;
}

export function groupByField<T extends Record<string, any>>(
  list: T[],
  field: keyof T,
  labelFn?: (value: string) => string,
): DistribuicaoItem[] {
  const map = new Map<string, number>();

  list.forEach((item) => {
    const raw = item[field];

    const key =
      raw === null || raw === undefined || raw === ""
        ? "NÃO_INFORMADO"
        : String(raw);

    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({
      label:
        key === "NÃO_INFORMADO" ? "Não informado" : labelFn ? labelFn(key) : key,
      valor: value,
    }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
}

function getVinculosParticipante(
  participante: ParticipanteRaw,
): ParticipanteAtividadeRaw[] {
  return (
    participante.atividades ??
    participante.participanteAtividades ??
    participante.vinculos ??
    participante.vinculosAtividades ??
    []
  );
}

export function groupParticipantesPorAtividade(
  participantes?: ParticipanteRaw[] | null,
  atividadesNomeMap?: Map<string, string>,
): DistribuicaoItem[] {
  const participantesPorAtividade = new Map<string, Set<string>>();
  const nomesAtividades = new Map<string, string>();

  (participantes ?? []).forEach((participante) => {
    const participanteId =
      participante.id != null
        ? String(participante.id)
        : participante.nomeCompleto?.trim() ||
        participante.nome?.trim() ||
        crypto.randomUUID();

    const vinculos = getVinculosParticipante(participante);

    vinculos.forEach((vinculo) => {
      const atividadeId =
        vinculo.atividadeId != null
          ? String(vinculo.atividadeId)
          : vinculo.atividade?.id != null
            ? String(vinculo.atividade.id)
            : "";

      if (!atividadeId) return;

      const nomeAtividade =
        vinculo.atividade?.nomeAtividade?.trim() ||
        vinculo.atividade?.nome?.trim() ||
        atividadesNomeMap?.get(atividadeId) ||
        vinculo.atividadeExercida?.trim() ||
        `Atividade ${atividadeId}`;

      nomesAtividades.set(atividadeId, nomeAtividade);

      if (!participantesPorAtividade.has(atividadeId)) {
        participantesPorAtividade.set(atividadeId, new Set<string>());
      }

      participantesPorAtividade.get(atividadeId)?.add(participanteId);
    });
  });

  return Array.from(participantesPorAtividade.entries())
    .map(([atividadeId, participantesSet]) => ({
      label:
        atividadesNomeMap?.get(atividadeId) ??
        nomesAtividades.get(atividadeId) ??
        `Atividade ${atividadeId}`,
      valor: participantesSet.size,
    }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
}
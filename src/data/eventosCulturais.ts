import { getJsonHeaders } from "@/lib/apiHeaders";

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

export const tiposEvento = [
  { value: "APRESENTACAO", label: "Apresentação" },
  { value: "ESPETACULO", label: "Espetáculo" },
  { value: "SHOW", label: "Show" },
  { value: "CONCERTO", label: "Concerto" },
  { value: "RECITAL", label: "Recital" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "INTERVENCAO_ARTISTICA", label: "Intervenção Artística" },
  { value: "EXPOSICAO", label: "Exposição" },
  { value: "MOSTRA", label: "Mostra" },
  { value: "MOSTRA_CULTURAL", label: "Mostra Cultural" },
  { value: "MOSTRA_AUDIOVISUAL", label: "Mostra Audiovisual" },
  { value: "EXIBICAO_AUDIOVISUAL", label: "Exibição Audiovisual" },
  { value: "CINECLUBE", label: "Cineclube" },
  { value: "SESSAO_DE_CINEMA", label: "Sessão de Cinema" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "FEIRA", label: "Feira" },
  { value: "FEIRA_CULTURAL", label: "Feira Cultural" },
  { value: "FEIRA_DE_ARTESANATO", label: "Feira de Artesanato" },
  { value: "FEIRA_LITERARIA", label: "Feira Literária" },
  { value: "FEIRA_GASTRONOMICA", label: "Feira Gastronômica" },
  { value: "SARAU", label: "Sarau" },
  { value: "BAILE", label: "Baile" },
  { value: "DESFILE", label: "Desfile" },
  { value: "CORTEJO", label: "Cortejo" },
  { value: "BLOCO_CARNAVALESCO", label: "Bloco Carnavalesco" },
  { value: "CARNAVAL", label: "Carnaval" },
  { value: "FESTA_POPULAR", label: "Festa Popular" },
  { value: "FESTA_JUNINA", label: "Festa Junina" },
  { value: "FOLIA_DE_REIS", label: "Folia de Reis" },
  { value: "RODA_DE_CAPOEIRA", label: "Roda de Capoeira" },
  { value: "RODA_DE_SAMBA", label: "Roda de Samba" },
  { value: "BATALHA_DE_RIMA", label: "Batalha de Rima" },
  { value: "JAM_SESSION", label: "Jam Session" },
  { value: "ENSAIO_ABERTO", label: "Ensaio Aberto" },
  { value: "TEMPORADA", label: "Temporada" },
  { value: "CIRCUITO_CULTURAL", label: "Circuito Cultural" },
  { value: "OCUPACAO_CULTURAL", label: "Ocupação Cultural" },

  { value: "OFICINA", label: "Oficina" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "CURSO", label: "Curso" },
  { value: "MINICURSO", label: "Minicurso" },
  { value: "CAPACITACAO", label: "Capacitação" },
  { value: "TREINAMENTO", label: "Treinamento" },
  { value: "AULA_ABERTA", label: "Aula Aberta" },
  { value: "MASTERCLASS", label: "Masterclass" },
  { value: "VIVENCIA", label: "Vivência" },
  { value: "IMERSAO", label: "Imersão" },
  { value: "RESIDENCIA_ARTISTICA", label: "Residência Artística" },
  { value: "LABORATORIO", label: "Laboratório" },
  { value: "FORMACAO", label: "Formação" },
  { value: "CONTACAO_DE_HISTORIAS", label: "Contação de Histórias" },
  { value: "LANCAMENTO", label: "Lançamento" },

  { value: "PALESTRA", label: "Palestra" },
  { value: "SEMINARIO", label: "Seminário" },
  { value: "CONFERENCIA", label: "Conferência" },
  { value: "CONGRESSO", label: "Congresso" },
  { value: "SIMPOSIO", label: "Simpósio" },
  { value: "FORUM", label: "Fórum" },
  { value: "ENCONTRO", label: "Encontro" },
  { value: "RODA_DE_CONVERSA", label: "Roda de Conversa" },
  { value: "MESA_REDONDA", label: "Mesa Redonda" },
  { value: "DEBATE", label: "Debate" },
  { value: "AUDIENCIA_PUBLICA", label: "Audiência Pública" },
  { value: "CONSULTA_PUBLICA", label: "Consulta Pública" },
  { value: "PLENARIA", label: "Plenária" },
  { value: "ASSEMBLEIA", label: "Assembleia" },
  { value: "REUNIAO", label: "Reunião" },
  { value: "REUNIAO_COMUNITARIA", label: "Reunião Comunitária" },

  { value: "CERTIFICACAO", label: "Certificação" },
  { value: "FORMATURA", label: "Formatura" },
  { value: "PREMIACAO", label: "Premiação" },
  { value: "HOMENAGEM", label: "Homenagem" },
  { value: "INAUGURACAO", label: "Inauguração" },
  { value: "POSSE", label: "Posse" },
  { value: "SOLENIDADE", label: "Solenidade" },
  { value: "CERIMONIA", label: "Cerimônia" },
  { value: "COMEMORACAO", label: "Comemoração" },
  { value: "ANIVERSARIO_INSTITUCIONAL", label: "Aniversário Institucional" },
  { value: "PRESTACAO_DE_CONTAS", label: "Prestação de Contas" },
  { value: "APRESENTACAO_DE_RESULTADOS", label: "Apresentação de Resultados" },
  { value: "REUNIAO_DE_ALINHAMENTO", label: "Reunião de Alinhamento" },
  { value: "REUNIAO_DE_PLANEJAMENTO", label: "Reunião de Planejamento" },

  { value: "EVENTO_COMUNITARIO", label: "Evento Comunitário" },
  { value: "ACAO_SOCIAL", label: "Ação Social" },
  { value: "MUTIRAO", label: "Mutirão" },
  { value: "CAMPANHA", label: "Campanha" },
  { value: "CAMPANHA_DE_ARRECADACAO", label: "Campanha de Arrecadação" },
  { value: "CAMPANHA_EDUCATIVA", label: "Campanha Educativa" },
  { value: "ATIVIDADE_RECREATIVA", label: "Atividade Recreativa" },
  { value: "ATIVIDADE_LUDICA", label: "Atividade Lúdica" },
  { value: "PIQUENIQUE", label: "Piquenique" },
  { value: "CONFRATERNIZACAO", label: "Confraternização" },
  { value: "CELEBRACAO", label: "Celebração" },
  { value: "ENCONTRO_DE_FAMILIAS", label: "Encontro de Famílias" },

  { value: "COLETIVA_DE_IMPRENSA", label: "Coletiva de Imprensa" },
  { value: "LIVE", label: "Live" },
  { value: "TRANSMISSAO_ONLINE", label: "Transmissão Online" },
  { value: "PODCAST_AO_VIVO", label: "Podcast ao Vivo" },
  { value: "WEBINARIO", label: "Webinário" },
  { value: "DIVULGACAO_PUBLICA", label: "Divulgação Pública" },
  { value: "MOBILIZACAO_COMUNITARIA", label: "Mobilização Comunitária" },
  { value: "PANFLETAGEM", label: "Panfletagem" },
  { value: "ACAO_ITINERANTE", label: "Ação Itinerante" },

  { value: "REUNIAO_COM_PARCEIROS", label: "Reunião com Parceiros" },
  { value: "REUNIAO_COM_PATROCINADORES", label: "Reunião com Patrocinadores" },
  { value: "ASSINATURA_DE_TERMO", label: "Assinatura de Termo" },
  { value: "LANCAMENTO_DE_PROJETO", label: "Lançamento de Projeto" },
  { value: "APRESENTACAO_DE_PROJETO", label: "Apresentação de Projeto" },
  { value: "VISITA_TECNICA", label: "Visita Técnica" },
  { value: "VISITA_INSTITUCIONAL", label: "Visita Institucional" },

  { value: "OUTRO", label: "Outro" },
] as const;

export type TipoEventoValue = (typeof tiposEvento)[number]["value"];

export type StatusEventoValue = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";

export const statusEvento = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export type StatusEventoLabel = "Ativo" | "Inativo" | "Pendente" | "Concluído";

export function statusValueToLabel(status?: string): StatusEventoLabel {
  const map: Record<string, StatusEventoLabel> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[status ?? ""] ?? "Ativo";
}

export const tipoEventoLabel = (value?: string) =>
  tiposEvento.find((item) => item.value === value)?.label ?? value ?? "—";

interface ProjetoApiDTO {
  id?: number | string;
  nomeProjeto?: string | null;
  nome?: string | null;
}

interface ColaboradorApiDTO {
  id?: number | string;
  nomeCompleto?: string | null;
  nome?: string | null;
}

export interface EventoCulturalDTO {
  id?: number | string;
  nomeEvento?: string | null;
  descricaoEvento?: string | null;
  localEvento?: string | null;
  dataEvento?: string | null;
  dataFim?: string | null;
  tipoEvento?: TipoEventoValue | string | null;
  status?: StatusEventoValue | string | null;

  projetoId?: number | string | ProjetoApiDTO | null;
  projetosIds?: Array<number | string | ProjetoApiDTO> | null;
  projeto?: ProjetoApiDTO | null;
  projetos?: ProjetoApiDTO[] | null;

  colaboradoresIds?: Array<number | string | ColaboradorApiDTO> | null;
  colaboradores?: ColaboradorApiDTO[] | null;
}

export interface EventoCulturalPayloadDTO {
  id?: number;
  nomeEvento: string;
  descricaoEvento: string;
  localEvento: string;
  dataEvento: string;
  dataFim: string | null;
  tipoEvento: TipoEventoValue;
  status: StatusEventoValue;
  projetoId: number | null;
  projetosIds: number[];
  colaboradoresIds: number[];
}

export interface EventoCultural {
  id: string;
  nomeEvento: string;
  descricaoEvento: string;
  localEvento: string;
  dataEvento: string;
  dataFim: string;
  tipoEvento: TipoEventoValue | "";
  status: StatusEventoValue | "";
  projetoId: string;
  projetosIds: string[];
  colaboradoresIds: string[];
}

export interface EventoCulturalView extends EventoCultural {
  projetoNome: string;
  projetosNomes: string[];
  colaboradoresNomes: string[];
}

export interface ProjetoOption {
  id: string;
  nome: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
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

function normalizeIds(values?: Array<unknown> | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(normalizeId).filter((value) => value !== "");
}

function normalizeText(value?: string | null): string {
  return value?.trim() ?? "";
}

function toInputDate(value?: string | null): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isTipoEventoValue(value: unknown): value is TipoEventoValue {
  return tiposEvento.some((item) => item.value === value);
}

function isStatusEventoValue(value: unknown): value is StatusEventoValue {
  return statusEvento.some((item) => item.value === value);
}

function normalizeTipoEvento(value?: string | null): TipoEventoValue | "" {
  if (!value) {
    return "";
  }

  return isTipoEventoValue(value) ? value : "";
}

function normalizeStatusEvento(value?: string | null): StatusEventoValue | "" {
  if (!value) {
    return "";
  }

  return isStatusEventoValue(value) ? value : "";
}

function getProjetosIdsFromDto(dto: EventoCulturalDTO): string[] {
  const projetosIds = normalizeIds(dto.projetosIds);

  if (projetosIds.length > 0) {
    return projetosIds;
  }

  const projetos = normalizeIds(dto.projetos);

  if (projetos.length > 0) {
    return projetos;
  }

  const projetoId = normalizeId(dto.projetoId);

  if (projetoId) {
    return [projetoId];
  }

  const projeto = normalizeId(dto.projeto);

  if (projeto) {
    return [projeto];
  }

  return [];
}

function getColaboradoresIdsFromDto(dto: EventoCulturalDTO): string[] {
  const colaboradoresIds = normalizeIds(dto.colaboradoresIds);

  if (colaboradoresIds.length > 0) {
    return colaboradoresIds;
  }

  const colaboradores = normalizeIds(dto.colaboradores);

  if (colaboradores.length > 0) {
    return colaboradores;
  }

  return [];
}

export function formatDateBR(value?: string | null) {
  if (!value) return "—";

  const iso = toInputDate(value);
  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function formatPeriodo(dataEvento?: string, dataFim?: string) {
  if (!dataEvento) return "—";

  if (!dataFim || dataFim === dataEvento) {
    return formatDateBR(dataEvento);
  }

  return `${formatDateBR(dataEvento)} a ${formatDateBR(dataFim)}`;
}

export function createEmptyEventoCultural(): EventoCultural {
  return {
    id: "",
    nomeEvento: "",
    descricaoEvento: "",
    localEvento: "",
    dataEvento: "",
    dataFim: "",
    tipoEvento: "",
    status: "",
    projetoId: "",
    projetosIds: [],
    colaboradoresIds: [],
  };
}

export function mapEventoCultural(dto: EventoCulturalDTO): EventoCultural {
  const projetosIds = getProjetosIdsFromDto(dto);
  const projetoId = projetosIds[0] || "";

  return {
    id: normalizeId(dto.id),
    nomeEvento: normalizeText(dto.nomeEvento),
    descricaoEvento: normalizeText(dto.descricaoEvento),
    localEvento: normalizeText(dto.localEvento),
    dataEvento: toInputDate(dto.dataEvento),
    dataFim: toInputDate(dto.dataFim),
    tipoEvento: normalizeTipoEvento(dto.tipoEvento),
    status: normalizeStatusEvento(dto.status),
    projetoId,
    projetosIds,
    colaboradoresIds: getColaboradoresIdsFromDto(dto),
  };
}

export function buildEventoCulturalPayload(
  evento: EventoCultural,
): EventoCulturalPayloadDTO {
  const projetosIds = (
    evento.projetosIds?.length
      ? evento.projetosIds
      : evento.projetoId
        ? [evento.projetoId]
        : []
  )
    .map(Number)
    .filter(Number.isFinite);

  const colaboradoresIds = evento.colaboradoresIds
    .map(Number)
    .filter(Number.isFinite);

  return {
    id: evento.id ? Number(evento.id) : undefined,
    nomeEvento: evento.nomeEvento.trim(),
    descricaoEvento: evento.descricaoEvento.trim(),
    localEvento: evento.localEvento.trim(),
    dataEvento: evento.dataEvento,
    dataFim: evento.dataFim || null,
    tipoEvento: evento.tipoEvento as TipoEventoValue,
    status: evento.status as StatusEventoValue,
    projetoId: projetosIds[0] ?? null,
    projetosIds,
    colaboradoresIds,
  };
}

export function enrichEventoCultural(
  evento: EventoCultural,
  projetos: ProjetoOption[],
  colaboradores: ColaboradorOption[],
): EventoCulturalView {
  const projetosIds = evento.projetosIds?.length
    ? evento.projetosIds
    : evento.projetoId
      ? [evento.projetoId]
      : [];

  const projetosNomes = projetosIds.map(
    (id) =>
      projetos.find((projeto) => projeto.id === id)?.nome ??
      `#${id}`,
  );

  return {
    ...evento,
    projetoNome: projetosNomes.join(", ") || "—",
    projetosNomes,
    colaboradoresNomes: evento.colaboradoresIds.map(
      (id) =>
        colaboradores.find((colaborador) => colaborador.id === id)?.nome ??
        `#${id}`,
    ),
  };
}

export async function getEventosCulturais(): Promise<EventoCultural[]> {
  const response = await fetch(`${API_URL}/eventos-culturais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EventoCulturalDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapEventoCultural);
}

export async function getEventoCulturalById(
  id: number,
): Promise<EventoCultural> {
  const response = await fetch(`${API_URL}/eventos-culturais/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EventoCulturalDTO = await response.json();

  return mapEventoCultural(data);
}

export async function createEventoCultural(
  payload: EventoCulturalPayloadDTO,
): Promise<EventoCultural> {
  const response = await fetch(`${API_URL}/eventos-culturais`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EventoCulturalDTO = await response.json();

  return mapEventoCultural(data);
}

export async function updateEventoCultural(
  id: number,
  payload: EventoCulturalPayloadDTO,
): Promise<EventoCultural> {
  const response = await fetch(`${API_URL}/eventos-culturais/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EventoCulturalDTO = await response.json();

  return mapEventoCultural(data);
}

export async function deleteEventoCultural(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/eventos-culturais/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getProjetosOptions(): Promise<ProjetoOption[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((projeto) => {
      const id = normalizeId(projeto.id);

      return {
        id,
        nome:
          pickText(projeto.nomeProjeto, projeto.nome) || `Projeto ${projeto.id}`,
      };
    })
    .filter((projeto) => projeto.id);
}

export async function getColaboradoresOptions(): Promise<ColaboradorOption[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApiDTO[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((colaborador) => {
      const id = normalizeId(colaborador.id);

      return {
        id,
        nome:
          pickText(colaborador.nomeCompleto, colaborador.nome) ||
          `Colaborador ${colaborador.id}`,
      };
    })
    .filter((colaborador) => colaborador.id);
}
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

export type TipoEventoValue =
  | "FESTIVAL"
  | "MOSTRA"
  | "EXPOSICAO"
  | "APRESENTACAO_TEATRAL"
  | "APRESENTACAO_MUSICAL"
  | "APRESENTACAO_DE_DANCA"
  | "APRESENTACAO_CIRCENSE"
  | "EXIBICAO_AUDIOVISUAL"
  | "FEIRA_CULTURAL"
  | "SARAU"
  | "LANCAMENTO"
  | "CORTEJO"
  | "INTERVENCAO_ARTISTICA"
  | "CONCURSO_PREMIACAO"
  | "OUTRO";

export type StatusEventoValue = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";

export const tiposEvento = [
  { value: "FESTIVAL", label: "Festival" },
  { value: "MOSTRA", label: "Mostra" },
  { value: "EXPOSICAO", label: "Exposição" },
  { value: "APRESENTACAO_TEATRAL", label: "Apresentação Teatral" },
  { value: "APRESENTACAO_MUSICAL", label: "Apresentação Musical" },
  { value: "APRESENTACAO_DE_DANCA", label: "Apresentação de Dança" },
  { value: "APRESENTACAO_CIRCENSE", label: "Apresentação Circense" },
  { value: "EXIBICAO_AUDIOVISUAL", label: "Exibição Audiovisual" },
  { value: "FEIRA_CULTURAL", label: "Feira Cultural" },
  { value: "SARAU", label: "Sarau" },
  { value: "LANCAMENTO", label: "Lançamento" },
  { value: "CORTEJO", label: "Cortejo" },
  { value: "INTERVENCAO_ARTISTICA", label: "Intervenção Artística" },
  { value: "CONCURSO_PREMIACAO", label: "Concurso / Premiação" },
  { value: "OUTRO", label: "Outro" },
] as const;

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

export interface EventoCulturalDTO {
  id?: number;
  nomeEvento?: string | null;
  descricaoEvento?: string | null;
  objetivoEvento?: string | null;
  produtoGerado?: string | null;
  localEvento?: string | null;
  acoesAcessibilidade?: string | null;
  resultadoEsperado?: string | null;
  dataEvento?: string | null;
  dataFim?: string | null;
  tipoEvento?: TipoEventoValue | null;
  status?: StatusEventoValue | null;
  projetoId?: number | null;
  colaboradoresIds?: number[] | null;
}

export interface EventoCulturalPayloadDTO {
  id?: number;
  nomeEvento: string;
  descricaoEvento: string;
  objetivoEvento: string;
  produtoGerado: string;
  localEvento: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  dataEvento: string;
  dataFim: string | null;
  tipoEvento: TipoEventoValue;
  status: StatusEventoValue;
  projetoId: number;
  colaboradoresIds: number[];
}

export interface EventoCultural {
  id: string;
  nomeEvento: string;
  descricaoEvento: string;
  objetivoEvento: string;
  produtoGerado: string;
  localEvento: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  dataEvento: string;
  dataFim: string;
  tipoEvento: TipoEventoValue | "";
  status: StatusEventoValue | "";
  projetoId: string;
  colaboradoresIds: string[];
}

export interface EventoCulturalView extends EventoCultural {
  projetoNome: string;
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
    objetivoEvento: "",
    produtoGerado: "",
    localEvento: "",
    acoesAcessibilidade: "",
    resultadoEsperado: "",
    dataEvento: "",
    dataFim: "",
    tipoEvento: "",
    status: "",
    projetoId: "",
    colaboradoresIds: [],
  };
}

export function mapEventoCultural(dto: EventoCulturalDTO): EventoCultural {
  return {
    id: normalizeId(dto.id),
    nomeEvento: normalizeText(dto.nomeEvento),
    descricaoEvento: normalizeText(dto.descricaoEvento),
    objetivoEvento: normalizeText(dto.objetivoEvento),
    produtoGerado: normalizeText(dto.produtoGerado),
    localEvento: normalizeText(dto.localEvento),
    acoesAcessibilidade: normalizeText(dto.acoesAcessibilidade),
    resultadoEsperado: normalizeText(dto.resultadoEsperado),
    dataEvento: toInputDate(dto.dataEvento),
    dataFim: toInputDate(dto.dataFim),
    tipoEvento: dto.tipoEvento ?? "",
    status: dto.status ?? "",
    projetoId: dto.projetoId != null ? String(dto.projetoId) : "",
    colaboradoresIds: (dto.colaboradoresIds ?? []).map(String),
  };
}

export function buildEventoCulturalPayload(
  evento: EventoCultural,
): EventoCulturalPayloadDTO {
  return {
    id: evento.id ? Number(evento.id) : undefined,
    nomeEvento: evento.nomeEvento.trim(),
    descricaoEvento: evento.descricaoEvento.trim(),
    objetivoEvento: evento.objetivoEvento.trim(),
    produtoGerado: evento.produtoGerado.trim(),
    localEvento: evento.localEvento.trim(),
    acoesAcessibilidade: evento.acoesAcessibilidade.trim(),
    resultadoEsperado: evento.resultadoEsperado.trim(),
    dataEvento: evento.dataEvento,
    dataFim: evento.dataFim || null,
    tipoEvento: evento.tipoEvento as TipoEventoValue,
    status: evento.status as StatusEventoValue,
    projetoId: Number(evento.projetoId),
    colaboradoresIds: evento.colaboradoresIds.map(Number),
  };
}

export function enrichEventoCultural(
  evento: EventoCultural,
  projetos: ProjetoOption[],
  colaboradores: ColaboradorOption[],
): EventoCulturalView {
  return {
    ...evento,
    projetoNome:
      projetos.find((projeto) => projeto.id === evento.projetoId)?.nome ?? "—",
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
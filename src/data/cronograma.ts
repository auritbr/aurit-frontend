import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      if (typeof json === "string") {
        return json;
      }

      if (json.message) {
        return json.message;
      }

      if (json.error) {
        return json.error;
      }

      return text;
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export const cronogramaTitleTooltip =
  "Estruture o cronograma do projeto detalhando etapas, períodos e vínculos com atividades, eventos culturais ou ações de divulgação. Um cronograma bem preenchido facilita o planejamento, o acompanhamento da execução, a organização de evidências e a prestação de contas.";

export const cronogramaDateError =
  "A data de término deve ser posterior à data de início.";

export const etapaCronogramaOptions = [
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "PRE_PRODUCAO", label: "Pré-produção" },
  { value: "PRODUCAO", label: "Produção" },
  { value: "DIVULGACAO", label: "Divulgação" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "POS_PRODUCAO", label: "Pós-produção" },
  { value: "PRESTACAO_CONTAS", label: "Prestação de contas" },
] as const;

export type EtapaCronograma = (typeof etapaCronogramaOptions)[number]["value"];

export const etapaCronogramaLabel = (value?: string | null) =>
  etapaCronogramaOptions.find((item) => item.value === value)?.label ??
  value ??
  "";

export const statusCronogramaOptions = [
  { value: "PLANEJADO", label: "Planejado" },
  { value: "EM_ANDAMENTO", label: "Em Andamento" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "ATRASADO", label: "Atrasado" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;

export type StatusCronograma =
  (typeof statusCronogramaOptions)[number]["value"];

export const statusCronogramaLabel = (value: string) =>
  statusCronogramaOptions.find((item) => item.value === value)?.label ?? value;

export interface CronogramaDTO {
  id?: number;
  nomeEtapa: string;
  descricaoEtapa: string;
  etapaCronograma: EtapaCronograma;
  dataInicioEtapa: string;
  dataFimEtapa: string;
  statusCronograma: StatusCronograma;
  projetoId?: number | null;
  atividadeId?: number | null;
  eventoCulturalId?: number | null;
  acaoDivulgacaoId?: number | null;
}

export interface CronogramaData {
  id: string;
  nomeEtapa: string;
  descricaoEtapa: string;
  etapaCronograma: string;
  dataInicioEtapa: string;
  dataFimEtapa: string;
  statusCronograma: string;
  projetoId: string;
  atividadeId: string;
  eventoCulturalId: string;
  acaoDivulgacaoId: string;
}

export interface ProjetoOption {
  id: string;
  nome: string;
}

export interface AtividadeOption {
  id: string;
  nome: string;
  projetoId?: string;
}

export interface EventoOption {
  id: string;
  nome: string;
  projetoId?: string;
  projetosIds: string[];
}

export interface AcaoOption {
  id: string;
  nome: string;
  projetoId?: string;
}

interface ProjetoApiDTO {
  id?: number;
  nomeProjeto?: string;
}

interface AtividadeApiDTO {
  id?: number;
  nomeAtividade?: string;
  projetoId?: number | null;
  projeto?: {
    id?: number | null;
  } | null;
}

interface EventoApiDTO {
  id?: number;
  nomeEvento?: string;
  projetoId?: number | null;
  projetosIds?: Array<number | string> | null;
  projeto?: {
    id?: number | null;
  } | null;
}

interface AcaoApiDTO {
  id?: number;
  nomeAcao?: string;
  projetoId?: number | null;
  projeto?: {
    id?: number | null;
  } | null;
}

export function createEmptyCronograma(): CronogramaData {
  return {
    id: "",
    nomeEtapa: "",
    descricaoEtapa: "",
    etapaCronograma: "",
    dataInicioEtapa: "",
    dataFimEtapa: "",
    statusCronograma: "",
    projetoId: "",
    atividadeId: "",
    eventoCulturalId: "",
    acaoDivulgacaoId: "",
  };
}

export function mapCronograma(dto: CronogramaDTO): CronogramaData {
  return {
    id: String(dto.id ?? ""),
    nomeEtapa: dto.nomeEtapa ?? "",
    descricaoEtapa: dto.descricaoEtapa ?? "",
    etapaCronograma: dto.etapaCronograma ?? "",
    dataInicioEtapa: dto.dataInicioEtapa ?? "",
    dataFimEtapa: dto.dataFimEtapa ?? "",
    statusCronograma: dto.statusCronograma ?? "",
    projetoId: dto.projetoId != null ? String(dto.projetoId) : "",
    atividadeId: dto.atividadeId != null ? String(dto.atividadeId) : "",
    eventoCulturalId:
      dto.eventoCulturalId != null ? String(dto.eventoCulturalId) : "",
    acaoDivulgacaoId:
      dto.acaoDivulgacaoId != null ? String(dto.acaoDivulgacaoId) : "",
  };
}

export function buildCronogramaPayload(data: CronogramaData): CronogramaDTO {
  return {
    id: data.id ? Number(data.id) : undefined,
    nomeEtapa: data.nomeEtapa.trim(),
    descricaoEtapa: data.descricaoEtapa.trim(),
    etapaCronograma: data.etapaCronograma as EtapaCronograma,
    dataInicioEtapa: data.dataInicioEtapa,
    dataFimEtapa: data.dataFimEtapa,
    statusCronograma: data.statusCronograma as StatusCronograma,
    projetoId: data.projetoId ? Number(data.projetoId) : null,
    atividadeId: data.atividadeId ? Number(data.atividadeId) : null,
    eventoCulturalId: data.eventoCulturalId
      ? Number(data.eventoCulturalId)
      : null,
    acaoDivulgacaoId: data.acaoDivulgacaoId
      ? Number(data.acaoDivulgacaoId)
      : null,
  };
}

function sortCronogramas(items: CronogramaData[]) {
  return [...items].sort(
    (a, b) =>
      (a.dataInicioEtapa || "").localeCompare(b.dataInicioEtapa || "") ||
      etapaCronogramaLabel(a.etapaCronograma).localeCompare(
        etapaCronogramaLabel(b.etapaCronograma),
      ) ||
      (a.nomeEtapa || "").localeCompare(b.nomeEtapa || ""),
  );
}

export async function getCronogramas(): Promise<CronogramaData[]> {
  const response = await fetch(`${API_URL}/cronogramas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CronogramaDTO[] = await response.json();

  return sortCronogramas((data ?? []).map(mapCronograma));
}

export async function getCronogramaById(id: number): Promise<CronogramaData> {
  const response = await fetch(`${API_URL}/cronogramas/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CronogramaDTO = await response.json();

  return mapCronograma(data);
}

export async function getCronogramasByProjeto(
  projetoId: number,
): Promise<CronogramaData[]> {
  const response = await fetch(`${API_URL}/cronogramas/projeto/${projetoId}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CronogramaDTO[] = await response.json();

  return sortCronogramas((data ?? []).map(mapCronograma));
}

export async function createCronograma(
  payload: CronogramaDTO,
): Promise<CronogramaData> {
  const response = await fetch(`${API_URL}/cronogramas`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CronogramaDTO = await response.json();

  return mapCronograma(data);
}

export async function updateCronograma(
  id: number,
  payload: CronogramaDTO,
): Promise<CronogramaData> {
  const response = await fetch(`${API_URL}/cronogramas/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: CronogramaDTO = await response.json();

  return mapCronograma(data);
}

export async function deleteCronograma(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/cronogramas/${id}`, {
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

  return (data ?? [])
    .filter((projeto) => projeto.id != null)
    .map((projeto) => ({
      id: String(projeto.id),
      nome: projeto.nomeProjeto?.trim() || `Projeto ${projeto.id}`,
    }));
}

export async function getAtividadesOptions(): Promise<AtividadeOption[]> {
  const response = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AtividadeApiDTO[] = await response.json();

  return (data ?? [])
    .filter((atividade) => atividade.id != null)
    .map((atividade) => ({
      id: String(atividade.id),
      nome: atividade.nomeAtividade?.trim() || `Atividade ${atividade.id}`,
      projetoId:
        atividade.projetoId != null
          ? String(atividade.projetoId)
          : atividade.projeto?.id != null
            ? String(atividade.projeto.id)
            : undefined,
    }));
}

export async function getEventosOptions(): Promise<EventoOption[]> {
  const response = await fetch(`${API_URL}/eventos-culturais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EventoApiDTO[] = await response.json();

  return (data ?? [])
    .filter((evento) => evento.id != null)
    .map((evento) => {
      const projetosIds =
        Array.isArray(evento.projetosIds) && evento.projetosIds.length > 0
          ? evento.projetosIds.map(String)
          : evento.projetoId != null
            ? [String(evento.projetoId)]
            : evento.projeto?.id != null
              ? [String(evento.projeto.id)]
              : [];

      return {
        id: String(evento.id),
        nome: evento.nomeEvento?.trim() || `Evento ${evento.id}`,
        projetoId: projetosIds[0],
        projetosIds,
      };
    });
}

export async function getAcoesOptions(): Promise<AcaoOption[]> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoApiDTO[] = await response.json();

  return (data ?? [])
    .filter((acao) => acao.id != null)
    .map((acao) => ({
      id: String(acao.id),
      nome: acao.nomeAcao?.trim() || `Ação ${acao.id}`,
      projetoId:
        acao.projetoId != null
          ? String(acao.projetoId)
          : acao.projeto?.id != null
            ? String(acao.projeto.id)
            : undefined,
    }));
}
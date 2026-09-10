import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

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
        json?.message || json?.error || json?.detail || json?.mensagem || text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export type TipoEvidencia =
  | "FOTO"
  | "VIDEO"
  | "LINK_PUBLICACAO"
  | "PRINT_REDE_SOCIAL"
  | "LISTA_PRESENCA"
  | "RELATORIO"
  | "MATERIAL_GRAFICO"
  | "CLIPPING"
  | "CERTIFICADO"
  | "DOCUMENTO"
  | "OUTRO";

export type TipoVinculoEvidencia =
  | "PROPOSTA_EDITAL"
  | "PLANO_AULA"
  | "ATIVIDADE"
  | "TURMA"
  | "EVENTO_CULTURAL"
  | "ACAO_DIVULGACAO"
  | "PRESENCA";

export const tiposEvidencia: { value: TipoEvidencia; label: string }[] = [
  { value: "FOTO", label: "Foto" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "LINK_PUBLICACAO", label: "Link de Publicação" },
  { value: "PRINT_REDE_SOCIAL", label: "Print de Rede Social" },
  { value: "LISTA_PRESENCA", label: "Lista de Presença" },
  { value: "RELATORIO", label: "Relatório" },
  { value: "MATERIAL_GRAFICO", label: "Material Gráfico" },
  { value: "CLIPPING", label: "Clipping" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "DOCUMENTO", label: "Documento" },
  { value: "OUTRO", label: "Outro" },
];

export const tiposVinculoEvidencia: {
  value: TipoVinculoEvidencia;
  label: string;
}[] = [
  { value: "PROPOSTA_EDITAL", label: "Proposta de Edital" },
  { value: "PLANO_AULA", label: "Plano de Aula" },
  { value: "ATIVIDADE", label: "Atividade" },
  { value: "TURMA", label: "Turma" },
  { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
  { value: "ACAO_DIVULGACAO", label: "Ação de Divulgação" },
  { value: "PRESENCA", label: "Presença" },
];

export const tipoEvidenciaLabel = (value?: TipoEvidencia | string) =>
  tiposEvidencia.find((item) => item.value === value)?.label ?? value ?? "—";

export const tipoVinculoLabel = (value?: TipoVinculoEvidencia | string) =>
  tiposVinculoEvidencia.find((item) => item.value === value)?.label ??
  value ??
  "—";

export const tipoVinculoEvidenciaLabel = tipoVinculoLabel;

export function normalizePublicationUrl(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export interface EvidenciaExecucaoDTO {
  id?: number;
  tituloEvidencia?: string | null;
  observacaoEvidencia?: string | null;
  urlArquivo?: string | null;
  urlPublicacao?: string | null;
  tipoEvidencia: TipoEvidencia;
  tipoVinculoEvidencia: TipoVinculoEvidencia;

  projetoId: number;
  propostaEditalId?: number | null;
  planoAulaId?: number | null;
  atividadeId?: number | null;
  turmaId?: number | null;
  eventoCulturalId?: number | null;
  acaoDivulgacaoId?: number | null;
  presencaId?: number | null;
}

export interface Evidencia {
  id: string;
  tituloEvidencia: string;
  observacaoEvidencia: string;
  urlArquivo: string;
  urlPublicacao: string;
  tipoEvidencia: TipoEvidencia | "";
  tipoVinculoEvidencia: TipoVinculoEvidencia | "";

  projeto: string;
  propostaEdital: string;
  planoAula: string;
  atividade: string;
  turma: string;
  eventoCultural: string;
  acaoDivulgacao: string;
  presenca: string;
}

export interface OptionItem {
  id: string;
  nome: string;
  projetoId?: string;
}

function mapId(value: number | string | null | undefined) {
  return value !== null && value !== undefined && value !== ""
    ? String(value)
    : "";
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

type ApiOptionRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiOptionRecord {
  return value && typeof value === "object" ? (value as ApiOptionRecord) : {};
}

function pickProjetoId(item: ApiOptionRecord): string | undefined {
  const projeto = asRecord(item.projeto);
  const value =
    item.projetoId ?? projeto.id ?? projeto.projetoId ?? item.idProjeto;

  return value !== null && value !== undefined && value !== ""
    ? String(value)
    : undefined;
}

function normalizeOptionList(
  data: ApiOptionRecord[],
  fallback: string,
): OptionItem[] {
  return (Array.isArray(data) ? data : [])
    .filter((item) => item?.id !== null && item?.id !== undefined)
    .map((item) => ({
      id: String(item.id),
      nome:
        pickText(
          item.nome,
          item.nomeProjeto,
          item.tituloProjeto,
          item.nomeAtividade,
          item.nomeTurma,
          item.nomeEvento,
          item.nomeAcao,
          item.label,
          item.descricao,
          item.dataPresenca,
        ) || `${fallback} ${item.id}`,
      projetoId: pickProjetoId(item),
    }));
}

export function createEmptyEvidencia(): Evidencia {
  return {
    id: "",
    tituloEvidencia: "",
    observacaoEvidencia: "",
    urlArquivo: "",
    urlPublicacao: "",
    tipoEvidencia: "",
    tipoVinculoEvidencia: "",

    projeto: "",
    propostaEdital: "",
    planoAula: "",
    atividade: "",
    turma: "",
    eventoCultural: "",
    acaoDivulgacao: "",
    presenca: "",
  };
}

export function mapEvidencia(dto: EvidenciaExecucaoDTO): Evidencia {
  return {
    id: String(dto.id ?? ""),
    tituloEvidencia: dto.tituloEvidencia ?? "",
    observacaoEvidencia: dto.observacaoEvidencia ?? "",
    urlArquivo: dto.urlArquivo ?? "",
    urlPublicacao: dto.urlPublicacao ?? "",
    tipoEvidencia: dto.tipoEvidencia ?? "",
    tipoVinculoEvidencia: dto.tipoVinculoEvidencia ?? "",

    projeto: mapId(dto.projetoId),
    propostaEdital: mapId(dto.propostaEditalId),
    planoAula: mapId(dto.planoAulaId),
    atividade: mapId(dto.atividadeId),
    turma: mapId(dto.turmaId),
    eventoCultural: mapId(dto.eventoCulturalId),
    acaoDivulgacao: mapId(dto.acaoDivulgacaoId),
    presenca: mapId(dto.presencaId),
  };
}

export function buildEvidenciaPayload(form: Evidencia): EvidenciaExecucaoDTO {
  return {
    id: form.id ? Number(form.id) : undefined,
    tituloEvidencia: form.tituloEvidencia.trim() || null,
    observacaoEvidencia: form.observacaoEvidencia.trim() || null,
    urlArquivo: form.urlArquivo.trim() || null,
    urlPublicacao: form.urlPublicacao.trim() || null,
    tipoEvidencia: form.tipoEvidencia as TipoEvidencia,
    tipoVinculoEvidencia: form.tipoVinculoEvidencia as TipoVinculoEvidencia,

    projetoId: Number(form.projeto),
    propostaEditalId: form.propostaEdital ? Number(form.propostaEdital) : null,
    planoAulaId: form.planoAula ? Number(form.planoAula) : null,
    atividadeId: form.atividade ? Number(form.atividade) : null,
    turmaId: form.turma ? Number(form.turma) : null,
    eventoCulturalId: form.eventoCultural ? Number(form.eventoCultural) : null,
    acaoDivulgacaoId: form.acaoDivulgacao ? Number(form.acaoDivulgacao) : null,
    presencaId: form.presenca ? Number(form.presenca) : null,
  };
}

export async function getEvidenciasExecucao(): Promise<Evidencia[]> {
  const response = await fetch(`${API_URL}/evidencias-execucao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EvidenciaExecucaoDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapEvidencia);
}

export async function getEvidenciaExecucaoById(id: number): Promise<Evidencia> {
  const response = await fetch(`${API_URL}/evidencias-execucao/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EvidenciaExecucaoDTO = await response.json();

  return mapEvidencia(data);
}

export async function createEvidenciaExecucao(
  payload: EvidenciaExecucaoDTO,
  arquivo?: File | null,
): Promise<Evidencia> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/evidencias-execucao`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EvidenciaExecucaoDTO = await response.json();

  return mapEvidencia(data);
}

export async function updateEvidenciaExecucao(
  id: number,
  payload: EvidenciaExecucaoDTO,
  arquivo?: File | null,
): Promise<Evidencia> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/evidencias-execucao/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EvidenciaExecucaoDTO = await response.json();

  return mapEvidencia(data);
}

export async function deleteEvidenciaExecucao(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/evidencias-execucao/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getProjetosOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return normalizeOptionList(data, "Projeto").map((item) => ({
    ...item,
    nome: pickText(item.nome) || `Projeto ${item.id}`,
  }));
}

export async function getPropostasEditalOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome:
      pickText(
        item.tituloProjeto,
        item.nomeProjeto,
        item.tituloProposta,
        item.nomeProposta,
        item.titulo,
        item.nome,
      ) || `Proposta ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export async function getAtividadesOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome: pickText(item.nomeAtividade, item.nome) || `Atividade ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export async function getTurmasOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/turmas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome: pickText(item.nomeTurma, item.nome) || `Turma ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export async function getEventosCulturaisOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/eventos-culturais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome: pickText(item.nomeEvento, item.nome) || `Evento ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export async function getAcoesDivulgacaoOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome: pickText(item.nomeAcao, item.nome) || `Ação ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export async function getPresencasOptions(): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/presencas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : []).map((item: ApiOptionRecord) => ({
    id: String(item.id),
    nome:
      pickText(
        item.label,
        item.nome,
        item.nomePresenca,
        item.descricao,
        item.dataPresenca,
      ) || `Presença ${item.id}`,
    projetoId: pickProjetoId(item),
  }));
}

export const optionName = (items: OptionItem[], id?: string) =>
  id ? (items.find((item) => item.id === id)?.nome ?? "—") : "—";

export function vinculoRelacionadoTexto(
  evidencia: Evidencia,
  options: {
    propostasEdital: OptionItem[];
    atividades: OptionItem[];
    turmas: OptionItem[];
    eventos: OptionItem[];
    acoes: OptionItem[];
    presencas: OptionItem[];
  },
): string {
  switch (evidencia.tipoVinculoEvidencia) {
    case "PROPOSTA_EDITAL":
      return optionName(options.propostasEdital, evidencia.propostaEdital);

    case "ATIVIDADE":
      return optionName(options.atividades, evidencia.atividade);

    case "TURMA":
      return optionName(options.turmas, evidencia.turma);

    case "EVENTO_CULTURAL":
      return optionName(options.eventos, evidencia.eventoCultural);

    case "ACAO_DIVULGACAO":
      return optionName(options.acoes, evidencia.acaoDivulgacao);

    case "PRESENCA":
      return optionName(options.presencas, evidencia.presenca);

    default:
      return "—";
  }
}

export async function getEvidenciaArquivoDownloadUrl(
  id: number,
): Promise<string> {
  const response = await fetch(
    `${API_URL}/evidencias-execucao/${id}/download`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const url = await response.text();

  if (!url?.trim()) {
    throw new Error("Link do arquivo não retornado pelo servidor.");
  }

  return url;
}

export function getNomeArquivoEvidencia(urlArquivo?: string | null): string {
  if (!urlArquivo?.trim()) return "";

  try {
    const cleanUrl = urlArquivo.split("?")[0];
    const partes = cleanUrl.split("/");
    const nome = partes[partes.length - 1] ?? "";

    return decodeURIComponent(nome);
  } catch {
    const partes = urlArquivo.split("/");
    return partes[partes.length - 1] ?? "";
  }
}

export function buildArquivoUrl(urlArquivo?: string) {
  if (!urlArquivo?.trim()) return "";

  if (/^https?:\/\//i.test(urlArquivo)) {
    return urlArquivo;
  }

  return `${API_URL}${urlArquivo.startsWith("/") ? "" : "/"}${urlArquivo}`;
}

export type ContextoEvidencia = "AULA" | "EVENTO_CULTURAL";

export interface EvidenciaReferencia {
  id: number;
  nome: string;
}

export interface EvidenciaPlanoAula {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim?: string | null;
  atividadeId: number;
  atividadeNome: string;
  turmas: EvidenciaReferencia[];
}

export interface EvidenciaEventoCultural {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim?: string | null;
  descricao?: string | null;
  local?: string | null;
  status?: string | null;
  projetos: EvidenciaReferencia[];
}

export interface EvidenciaImagem {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanho: number;
  ordem: number;
  downloadUrl: string;
  /** URL temporária resolvida pelo frontend para visualização autenticada. */
  visualizacaoUrl?: string;
}

export interface EvidenciaLink {
  id?: number;
  titulo?: string | null;
  url: string;
  ordem?: number;
}

export interface EvidenciaFotografica {
  id: number;
  titulo: string;
  contexto: ContextoEvidencia;
  tipoEvidencia: TipoEvidencia;
  projeto: EvidenciaReferencia;
  atividade?: EvidenciaReferencia | null;
  turma?: EvidenciaReferencia | null;
  planoAula?: EvidenciaPlanoAula | null;
  eventoCultural?: EvidenciaEventoCultural | null;
  descricao?: string | null;
  imagens: EvidenciaImagem[];
  links: EvidenciaLink[];
  quantidadeImagens: number;
  quantidadeLinks: number;
  dataReferencia?: string | null;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface EvidenciaFotograficaRequest {
  tituloEvidencia?: string | null;
  contexto: ContextoEvidencia;
  tipoEvidencia: TipoEvidencia;
  projetoId: number;
  atividadeId?: number | null;
  turmaId?: number | null;
  planoAulaId?: number | null;
  eventoCulturalId?: number | null;
  descricao?: string | null;
  links: Array<{ titulo?: string | null; url: string }>;
  removerImagemIds: number[];
}

export interface EvidenciaFotograficaFiltros {
  projetoId?: number;
  atividadeId?: number;
  turmaId?: number;
  planoAulaId?: number;
  eventoCulturalId?: number;
  contexto?: ContextoEvidencia;
  dataInicio?: string;
  dataFim?: string;
}

export interface PlanoAulaEvidenciaOption extends OptionItem {
  dataInicio: string;
  dataFim?: string;
  turmaIds: string[];
}

export interface EventoCulturalEvidenciaOption extends OptionItem {
  dataInicio: string;
  dataFim?: string;
  descricao?: string;
  local?: string;
  status?: string;
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: unknown,
) {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
}

export async function getEvidenciasFotograficas(
  filtros: EvidenciaFotograficaFiltros = {},
): Promise<EvidenciaFotografica[]> {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) =>
    appendQueryValue(params, key, value),
  );
  const query = params.toString();
  const response = await fetch(
    `${API_URL}/evidencias-execucao/fotograficas${query ? `?${query}` : ""}`,
    { headers: getJsonHeaders(), cache: "no-store" },
  );
  if (!response.ok) throw new Error(await parseError(response));
  const data: EvidenciaFotografica[] = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getEvidenciaFotograficaById(
  id: number,
): Promise<EvidenciaFotografica> {
  const response = await fetch(
    `${API_URL}/evidencias-execucao/${id}/detalhes`,
    {
      headers: getJsonHeaders(),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<EvidenciaFotografica>;
}

async function salvarEvidenciaFotografica(
  method: "POST" | "PUT",
  payload: EvidenciaFotograficaRequest,
  imagens: File[],
  id?: number,
): Promise<EvidenciaFotografica> {
  const formData = new FormData();
  formData.append("dados", JSON.stringify(payload));
  imagens.forEach((imagem) => formData.append("imagens", imagem));
  const response = await fetch(
    `${API_URL}/evidencias-execucao${id ? `/${id}` : ""}`,
    { method, headers: getMultipartHeaders(), body: formData },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<EvidenciaFotografica>;
}

export function createEvidenciaFotografica(
  payload: EvidenciaFotograficaRequest,
  imagens: File[],
) {
  return salvarEvidenciaFotografica("POST", payload, imagens);
}

export function updateEvidenciaFotografica(
  id: number,
  payload: EvidenciaFotograficaRequest,
  imagens: File[],
) {
  return salvarEvidenciaFotografica("PUT", payload, imagens, id);
}

export async function getEvidenciaImagemUrl(
  evidenciaId: number,
  imagemId: number,
): Promise<string> {
  const response = await fetch(
    `${API_URL}/evidencias-execucao/${evidenciaId}/imagens/${imagemId}/download`,
    { headers: getJsonHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  const url = await response.text();
  if (!url.trim())
    throw new Error("URL da imagem não retornada pelo servidor.");
  return url;
}

export async function getAtividadesEvidenciaOptions(
  projetoId: number,
): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/atividades/projeto/${projetoId}`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data: ApiOptionRecord[] = await response.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id),
    nome: pickText(item.nomeAtividade, item.nome) || `Atividade ${item.id}`,
    projetoId: String(projetoId),
  }));
}

export async function getTurmasEvidenciaOptions(
  atividadeId: number,
): Promise<OptionItem[]> {
  const response = await fetch(`${API_URL}/turmas/atividade/${atividadeId}`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data: ApiOptionRecord[] = await response.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id),
    nome: pickText(item.nomeTurma, item.nome) || `Turma ${item.id}`,
  }));
}

export async function getPlanosAulaEvidenciaOptions(
  atividadeId: number,
  turmaId: number,
): Promise<PlanoAulaEvidenciaOption[]> {
  const params = new URLSearchParams({
    atividadeId: String(atividadeId),
    turmaId: String(turmaId),
  });
  const response = await fetch(`${API_URL}/planos-aula?${params}`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data: ApiOptionRecord[] = await response.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id),
    nome: pickText(item.nomePlanoAula, item.nome) || `Plano de aula ${item.id}`,
    dataInicio: pickText(item.dataInicio),
    dataFim: pickText(item.dataFim),
    turmaIds: Array.isArray(item.turmaIds)
      ? item.turmaIds.map(String)
      : Array.isArray(item.turmas)
        ? item.turmas.map((turma) => String(asRecord(turma).id)).filter(Boolean)
        : [],
  }));
}

export async function getEventosEvidenciaOptions(
  projetoId: number,
): Promise<EventoCulturalEvidenciaOption[]> {
  const response = await fetch(
    `${API_URL}/eventos-culturais/projeto/${projetoId}`,
    {
      headers: getJsonHeaders(),
    },
  );
  if (!response.ok) throw new Error(await parseError(response));
  const data: ApiOptionRecord[] = await response.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id),
    nome: pickText(item.nomeEvento, item.nome) || `Evento ${item.id}`,
    projetoId: String(projetoId),
    dataInicio: pickText(item.dataEvento, item.dataInicio),
    dataFim: pickText(item.dataFim),
    descricao: pickText(item.descricaoEvento, item.descricao),
    local: pickText(item.localEvento, item.local),
    status: pickText(item.status),
  }));
}

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

function pickProjetoId(item: any): string | undefined {
  const value =
    item?.projetoId ??
    item?.projeto?.id ??
    item?.projeto?.projetoId ??
    item?.idProjeto;

  return value !== null && value !== undefined && value !== ""
    ? String(value)
    : undefined;
}

function normalizeOptionList(data: any[], fallback: string): OptionItem[] {
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
    atividadeId: form.atividade ? Number(form.atividade) : null,
    turmaId: form.turma ? Number(form.turma) : null,
    eventoCulturalId: form.eventoCultural ? Number(form.eventoCultural) : null,
    acaoDivulgacaoId: form.acaoDivulgacao
      ? Number(form.acaoDivulgacao)
      : null,
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

export async function getEvidenciaExecucaoById(
  id: number,
): Promise<Evidencia> {
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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

  return (Array.isArray(data) ? data : []).map((item: any) => ({
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
  id ? items.find((item) => item.id === id)?.nome ?? "—" : "—";

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
  const response = await fetch(`${API_URL}/evidencias-execucao/${id}/download`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

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
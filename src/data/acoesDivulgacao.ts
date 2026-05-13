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

export type AcaoStatusApi = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";
export type AcaoStatusLabel = "Ativo" | "Inativo" | "Pendente" | "Concluído";

export type EstrategiaDivulgacao =
  | "MATERIAIS_IMPRESSOS"
  | "CARTAZES"
  | "PANFLETOS"
  | "FAIXAS"
  | "BANNERS"
  | "ZINES_E_CATALOGOS"
  | "REDES_SOCIAIS"
  | "SITES"
  | "BLOG"
  | "E_MAIL_MARKETING"
  | "MIDIA_LOCAL"
  | "RADIO"
  | "TV"
  | "ASSESSORIA_DE_IMPRENSA"
  | "ANUNCIOS_PATROCINADOS"
  | "PARCERIAS_VEICULOS_COMUNICACAO"
  | "PARCERIAS_ORGAOS_PUBLICOS"
  | "PARCERIAS_INSTITUICOES_CULTURAIS"
  | "ARTICULACAO_COM_ATORES_LOCAIS"
  | "INFLUENCIADORES_E_EMBAIXADORES"
  | "MOBILIZACAO_COMUNITARIA";

export const estrategiasDivulgacao = [
  { value: "MATERIAIS_IMPRESSOS", label: "Materiais Impressos" },
  { value: "CARTAZES", label: "Cartazes" },
  { value: "PANFLETOS", label: "Panfletos" },
  { value: "FAIXAS", label: "Faixas" },
  { value: "BANNERS", label: "Banners" },
  { value: "ZINES_E_CATALOGOS", label: "Zines e Catálogos" },
  { value: "REDES_SOCIAIS", label: "Redes Sociais" },
  { value: "SITES", label: "Sites" },
  { value: "BLOG", label: "Blog" },
  { value: "E_MAIL_MARKETING", label: "E-mail Marketing" },
  { value: "MIDIA_LOCAL", label: "Mídia Local" },
  { value: "RADIO", label: "Rádio" },
  { value: "TV", label: "TV" },
  { value: "ASSESSORIA_DE_IMPRENSA", label: "Assessoria de Imprensa" },
  { value: "ANUNCIOS_PATROCINADOS", label: "Anúncios Patrocinados" },
  {
    value: "PARCERIAS_VEICULOS_COMUNICACAO",
    label: "Parcerias com Veículos de Comunicação",
  },
  {
    value: "PARCERIAS_ORGAOS_PUBLICOS",
    label: "Parcerias com Órgãos Públicos",
  },
  {
    value: "PARCERIAS_INSTITUICOES_CULTURAIS",
    label: "Parcerias com Instituições Culturais",
  },
  {
    value: "ARTICULACAO_COM_ATORES_LOCAIS",
    label: "Articulação com Atores Locais",
  },
  {
    value: "INFLUENCIADORES_E_EMBAIXADORES",
    label: "Influenciadores e Embaixadores",
  },
  { value: "MOBILIZACAO_COMUNITARIA", label: "Mobilização Comunitária" },
] as const;

export const statusAcao = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export interface AcaoDivulgacaoDTO {
  id?: number;
  nomeAcao: string;
  descricaoAcao: string;
  realizacaoAcao: string;
  objetivoAcao: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;
  dataInicio: string;
  dataFim: string;
  estrategiasDivulgacao: string[];
  status: AcaoStatusApi;
  projetoId: number;
  colaboradoresIds?: number[];
}

export interface AcaoDivulgacao {
  id: string;
  nomeAcao: string;
  descricaoAcao: string;
  realizacaoAcao: string;
  objetivoAcao: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;
  dataInicio: string;
  dataFim: string;
  estrategiasDivulgacao: string[];
  status: AcaoStatusApi;
  projetoId: string;
  colaboradoresIds: string[];
}

export interface ProjetoOption {
  id: string;
  nome: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
}

interface ProjetoApiResponse {
  id?: number;
  nomeProjeto?: string;
}

interface ColaboradorApiResponse {
  id?: number;
  nomeCompleto?: string;
}

export function mapAcaoDivulgacao(dto: AcaoDivulgacaoDTO): AcaoDivulgacao {
  return {
    id: String(dto.id ?? ""),
    nomeAcao: dto.nomeAcao ?? "",
    descricaoAcao: dto.descricaoAcao ?? "",
    realizacaoAcao: dto.realizacaoAcao ?? "",
    objetivoAcao: dto.objetivoAcao ?? "",
    acoesAcessibilidade: dto.acoesAcessibilidade ?? "",
    resultadoEsperado: dto.resultadoEsperado ?? "",
    produtosGerados: dto.produtosGerados ?? "",
    dataInicio: dto.dataInicio ?? "",
    dataFim: dto.dataFim ?? "",
    estrategiasDivulgacao: dto.estrategiasDivulgacao ?? [],
    status: dto.status ?? "ATIVO",
    projetoId: dto.projetoId != null ? String(dto.projetoId) : "",
    colaboradoresIds: (dto.colaboradoresIds ?? []).map(String),
  };
}

export function buildAcaoDivulgacaoPayload(
  acao: AcaoDivulgacao,
): AcaoDivulgacaoDTO {
  return {
    id: acao.id ? Number(acao.id) : undefined,
    nomeAcao: acao.nomeAcao.trim(),
    descricaoAcao: acao.descricaoAcao.trim(),
    realizacaoAcao: acao.realizacaoAcao.trim(),
    objetivoAcao: acao.objetivoAcao.trim(),
    acoesAcessibilidade: acao.acoesAcessibilidade.trim(),
    resultadoEsperado: acao.resultadoEsperado.trim(),
    produtosGerados: acao.produtosGerados.trim(),
    dataInicio: acao.dataInicio,
    dataFim: acao.dataFim,
    estrategiasDivulgacao: acao.estrategiasDivulgacao,
    status: acao.status,
    projetoId: Number(acao.projetoId),
    colaboradoresIds: acao.colaboradoresIds.map(Number),
  };
}

export function statusValueToLabel(
  status: AcaoStatusApi | string,
): AcaoStatusLabel {
  const map: Record<AcaoStatusApi, AcaoStatusLabel> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[status as AcaoStatusApi] ?? "Ativo";
}

export const estrategiaLabel = (value: string) =>
  estrategiasDivulgacao.find((item) => item.value === value)?.label ?? value;

export function formatDateBr(iso?: string) {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return iso;

  return `${day}/${month}/${year}`;
}

export function estrategiasTexto(values: string[]) {
  return values.map(estrategiaLabel).join(", ");
}

export const projetoNomeAcao = (
  id?: string,
  projetos: ProjetoOption[] = [],
) => (id ? projetos.find((item) => item.id === id)?.nome ?? "—" : "—");

export const colaboradoresTextoAcao = (
  ids: string[] = [],
  colaboradores: ColaboradorOption[] = [],
) =>
  ids
    .map((id) => colaboradores.find((item) => item.id === id)?.nome ?? id)
    .filter(Boolean)
    .join(", ");

export async function getAcoesDivulgacao(): Promise<AcaoDivulgacao[]> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO[] = await response.json();

  return (data ?? []).map(mapAcaoDivulgacao);
}

export async function getAcaoDivulgacaoById(
  id: number,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function createAcaoDivulgacao(
  payload: AcaoDivulgacaoDTO,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      nomeAcao: payload.nomeAcao,
      descricaoAcao: payload.descricaoAcao,
      realizacaoAcao: payload.realizacaoAcao,
      objetivoAcao: payload.objetivoAcao,
      acoesAcessibilidade: payload.acoesAcessibilidade,
      resultadoEsperado: payload.resultadoEsperado,
      produtosGerados: payload.produtosGerados,
      dataInicio: payload.dataInicio,
      dataFim: payload.dataFim,
      estrategiasDivulgacao: payload.estrategiasDivulgacao,
      status: payload.status,
      projetoId: payload.projetoId,
      colaboradoresIds: payload.colaboradoresIds ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function updateAcaoDivulgacao(
  id: number,
  payload: AcaoDivulgacaoDTO,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      nomeAcao: payload.nomeAcao,
      descricaoAcao: payload.descricaoAcao,
      realizacaoAcao: payload.realizacaoAcao,
      objetivoAcao: payload.objetivoAcao,
      acoesAcessibilidade: payload.acoesAcessibilidade,
      resultadoEsperado: payload.resultadoEsperado,
      produtosGerados: payload.produtosGerados,
      dataInicio: payload.dataInicio,
      dataFim: payload.dataFim,
      estrategiasDivulgacao: payload.estrategiasDivulgacao,
      status: payload.status,
      projetoId: payload.projetoId,
      colaboradoresIds: payload.colaboradoresIds ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function deleteAcaoDivulgacao(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getProjetosOptions(): Promise<ProjetoOption[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApiResponse[] = await response.json();

  return (data ?? [])
    .filter((item) => item.id != null)
    .map((item) => ({
      id: String(item.id),
      nome: item.nomeProjeto?.trim() || `Projeto ${item.id}`,
    }));
}

export async function getColaboradoresOptions(): Promise<ColaboradorOption[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApiResponse[] = await response.json();

  return (data ?? [])
    .filter((item) => item.id != null)
    .map((item) => ({
      id: String(item.id),
      nome: item.nomeCompleto?.trim() || `Colaborador ${item.id}`,
    }));
}
import { getJsonHeaders } from "@/lib/apiHeaders";
import {
  getUsuarioLogado,
  type UsuarioLogado,
} from "@/lib/usuarioService";
import { isPlanoGratuitoAtual } from "@/lib/plano";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface InicioDados {
  nomeUsuario: string;
  nomeOrganizacao: string;
  hasOrganizacao: boolean;

  totalOrganizacoes: number;
  totalAgentes: number;
  totalDiretoria: number;

  totalParticipantes: number;
  totalColaboradores: number;
  totalIntegrantes: number;

  totalProjetos: number;
  totalMetasProjeto: number;
  totalAtividades: number;
  totalPlanosAula: number,

  totalTurmas: number;
  totalPresencas: number;
  totalCronogramas: number;

  totalEventos: number;
  totalAcoesDivulgacao: number;
  totalPlanosComunicacao: number;

  totalEvidencias: number;

  totalFinanceiros: number;
  totalPlanejamentosFinanceiros: number;

  totalEditais: number;
  totalPropostasEditais: number;
  totalResultadosPropostas: number;
  totalHabilitacoesPropostas: number;
  totalEquipesEditais: number;

  totalPrestacoesContas: number;
  totalPrestacoesMetas: number;

  totalPatrimonios: number;
  totalEmprestimos: number;

  totalCurriculos: number;
  totalTrajetoriasCulturais: number;

  totalDocumentos: number;
  documentosAtualizados: number;
  documentosVencidos: number;
  documentosPendentes: number;
}

interface DocumentoLike {
  statusDocumento?: string | null;
  vencido?: boolean | null;
}

interface OrganizacaoLike {
  id?: number | string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  nomeOrganizacao?: string | null;
  nome?: string | null;
  cnpj?: string | null;
}

interface PageResponse<T> {
  content?: T[];
  data?: T[];
  items?: T[];
  results?: T[];
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

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPlanoOuPermissaoMessage(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.includes("plano") ||
    normalized.includes("permissao") ||
    normalized.includes("nao tem permissao") ||
    normalized.includes("acesso negado") ||
    normalized.includes("disponivel apenas no plano pago") ||
    normalized.includes("este modulo esta disponivel apenas no plano pago") ||
    normalized.includes("access denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("403")
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const record = data as PageResponse<T>;

    if (Array.isArray(record.content)) {
      return record.content;
    }

    if (Array.isArray(record.data)) {
      return record.data;
    }

    if (Array.isArray(record.items)) {
      return record.items;
    }

    if (Array.isArray(record.results)) {
      return record.results;
    }
  }

  return [];
}

async function fetchListSafe<T = unknown>(path: string): Promise<T[]> {
  try {
    const data = await fetchJson<unknown>(path);

    return extractList<T>(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar dados.";

    if (isPlanoOuPermissaoMessage(message)) {
      return [];
    }

    throw error;
  }
}

async function fetchFirstAvailableList<T = unknown>(
  paths: string[],
): Promise<T[]> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await fetchListSafe<T>(path);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    const message = lastError.message;

    if (isPlanoOuPermissaoMessage(message)) {
      return [];
    }
  }

  return [];
}

async function fetchPaidListSafe<T = unknown>(
  path: string,
  isFreePlan: boolean,
): Promise<T[]> {
  return isFreePlan ? [] : fetchListSafe<T>(path);
}

async function fetchPaidFirstAvailableList<T = unknown>(
  paths: string[],
  isFreePlan: boolean,
): Promise<T[]> {
  return isFreePlan ? [] : fetchFirstAvailableList<T>(paths);
}

function count(list: unknown[] | null | undefined) {
  return Array.isArray(list) ? list.length : 0;
}

function getNomeUsuario(usuario?: UsuarioLogado | null): string {
  return usuario?.name?.trim() || "Usuário";
}

async function getUsuarioLogadoNome(): Promise<string> {
  try {
    const usuario = await getUsuarioLogado();

    return getNomeUsuario(usuario);
  } catch (error) {
    console.error("Erro ao buscar usuário logado na página inicial:", error);

    return "Usuário";
  }
}

function getNomeOrganizacao(organizacoes: OrganizacaoLike[]) {
  const org = organizacoes[0];

  return (
    org?.razaoSocial?.trim() ||
    org?.nomeFantasia?.trim() ||
    org?.nomeOrganizacao?.trim() ||
    org?.nome?.trim() ||
    "sua organização"
  );
}

function hasOrganizacaoValida(organizacoes: OrganizacaoLike[]) {
  const org = organizacoes[0];

  if (!org) return false;

  return Boolean(
    org.razaoSocial?.trim() ||
    org.nomeFantasia?.trim() ||
    org.nomeOrganizacao?.trim() ||
    org.nome?.trim() ||
    org.cnpj?.trim(),
  );
}

function contarDocumentos(documentos: DocumentoLike[]) {
  const documentosAtualizados = documentos.filter(
    (d) => d.statusDocumento === "ATUALIZADO",
  ).length;

  const documentosVencidos = documentos.filter(
    (d) => d.statusDocumento === "VENCIDO" || d.vencido === true,
  ).length;

  const documentosPendentes = documentos.filter(
    (d) =>
      d.statusDocumento === "PENDENTE" ||
      d.statusDocumento === "NECESSITA_REVISAO" ||
      d.statusDocumento === "EM_ANALISE",
  ).length;

  return {
    documentosAtualizados,
    documentosVencidos,
    documentosPendentes,
  };
}

export async function getInicioDados(): Promise<InicioDados> {
  const isFreePlan = await isPlanoGratuitoAtual();

  const [
    nomeUsuario,

    organizacoes,
    diretoria,
    documentos,
    agentes,

    colaboradores,
    integrantes,
    participantes,

    curriculos,
    trajetoriasCulturais,

    projetos,
    metasProjeto,
    cronogramas,

    atividades,
    planoAula,
    turmas,
    presencas,

    eventos,
    acoesDivulgacao,
    planosComunicacao,

    financeiros,

    editais,
    propostasEditais,
    resultadosPropostas,
    habilitacoesPropostas,
    equipesEditais,
    planejamentosFinanceiros,

    evidenciasExecucao,

    prestacoesContas,
    prestacoesMetas,

    patrimonios,
    emprestimos,
  ] = await Promise.all([
    getUsuarioLogadoNome(),

    fetchListSafe<OrganizacaoLike>("/organizacoes"),
    fetchFirstAvailableList(["/diretorias", "/diretoria"]),
    fetchPaidListSafe<DocumentoLike>("/documentos", isFreePlan),
    fetchFirstAvailableList(["/agentes", "/agentes-culturais"]),

    fetchListSafe("/colaboradores"),
    fetchListSafe("/integrantes"),
    fetchListSafe("/participantes"),

    fetchPaidListSafe("/curriculos", isFreePlan),
    fetchPaidListSafe("/trajetorias-culturais", isFreePlan),

    fetchListSafe("/projetos"),
    fetchPaidFirstAvailableList(
      ["/metas-projeto", "/metas-projetos"],
      isFreePlan,
    ),
    fetchFirstAvailableList(["/cronogramas", "/cronograma"]),

    fetchListSafe("/atividades"),
    fetchListSafe("/planos-aula"),
    fetchListSafe("/turmas"),
    fetchListSafe("/presencas"),

    fetchListSafe("/eventos-culturais"),
    fetchListSafe("/acoes-divulgacao"),
    fetchPaidFirstAvailableList(
      ["/planos-comunicacao", "/plano-comunicacao", "/planoComunicacao"],
      isFreePlan,
    ),

    fetchPaidFirstAvailableList(["/financeiros", "/financeiro"], isFreePlan),

    fetchPaidListSafe("/editais", isFreePlan),
    fetchPaidFirstAvailableList(
      ["/propostas-editais", "/propostas-edital"],
      isFreePlan,
    ),
    fetchPaidFirstAvailableList(
      [
        "/resultados-propostas",
        "/resultado-propostas",
        "/resultados",
        "/resultado-proposta",
      ],
      isFreePlan,
    ),
    fetchPaidFirstAvailableList(
      [
        "/habilitacoes-propostas",
        "/habilitacao-propostas",
        "/habilitacoes",
        "/habilitacao",
      ],
      isFreePlan,
    ),
    fetchPaidFirstAvailableList(
      ["/equipes-editais", "/equipe-edital"],
      isFreePlan,
    ),
    fetchPaidFirstAvailableList(
      ["/planejamentos-financeiros", "/planejamento-financeiro"],
      isFreePlan,
    ),

    fetchPaidFirstAvailableList(
      ["/evidencias-execucao", "/evidencias"],
      isFreePlan,
    ),

    fetchPaidFirstAvailableList(
      ["/prestacoes-contas", "/prestacao-contas"],
      isFreePlan,
    ),
    fetchPaidFirstAvailableList(
      ["/prestacao-metas", "/prestacoes-metas"],
      isFreePlan,
    ),

    fetchPaidFirstAvailableList(["/patrimonios", "/patrimonio"], isFreePlan),
    fetchPaidFirstAvailableList(
      ["/emprestimos", "/emprestimos-patrimonio"],
      isFreePlan,
    ),
  ]);

  const { documentosAtualizados, documentosVencidos, documentosPendentes } =
    contarDocumentos(documentos);

  return {
    nomeUsuario,
    nomeOrganizacao: getNomeOrganizacao(organizacoes),
    hasOrganizacao: hasOrganizacaoValida(organizacoes),

    totalOrganizacoes: count(organizacoes),
    totalAgentes: count(agentes),
    totalDiretoria: count(diretoria),

    totalParticipantes: count(participantes),
    totalColaboradores: count(colaboradores),
    totalIntegrantes: count(integrantes),

    totalProjetos: count(projetos),
    totalMetasProjeto: count(metasProjeto),
    totalAtividades: count(atividades),
    totalPlanosAula: count(planoAula),
    totalTurmas: count(turmas),
    totalPresencas: count(presencas),
    totalCronogramas: count(cronogramas),

    totalEventos: count(eventos),
    totalAcoesDivulgacao: count(acoesDivulgacao),
    totalPlanosComunicacao: count(planosComunicacao),

    totalEvidencias: count(evidenciasExecucao),

    totalFinanceiros: count(financeiros),
    totalPlanejamentosFinanceiros: count(planejamentosFinanceiros),

    totalEditais: count(editais),
    totalPropostasEditais: count(propostasEditais),
    totalResultadosPropostas: count(resultadosPropostas),
    totalHabilitacoesPropostas: count(habilitacoesPropostas),
    totalEquipesEditais: count(equipesEditais),

    totalPrestacoesContas: count(prestacoesContas),
    totalPrestacoesMetas: count(prestacoesMetas),

    totalPatrimonios: count(patrimonios),
    totalEmprestimos: count(emprestimos),

    totalCurriculos: count(curriculos),
    totalTrajetoriasCulturais: count(trajetoriasCulturais),

    totalDocumentos: count(documentos),
    documentosAtualizados,
    documentosVencidos,
    documentosPendentes,
  };
}

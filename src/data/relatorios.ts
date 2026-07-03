import {
  getPlanosAula,
  statusPlanoAulaValueToLabel,
  type PlanoAula,
} from "@/data/planosAula";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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
  const fallback =
    "Não foi possível carregar o relatório. Tente novamente em instantes.";

  try {
    const text = await response.text();

    if (!text) return fallback;

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        (typeof json === "string" ? json : fallback)
      );
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface Indicador {
  chave: string;
  label: string;
  valor: unknown;
}

export interface GrupoRelatorio {
  titulo: string;
  indicadores: Indicador[];
}

export interface LinhaRelatorio {
  titulo: string;
  descricao?: string;
  indicadores: Indicador[];
}

interface RelatorioBase {
  tipoRelatorio: string;
  nomeEmpresa: string;
  organizacaoId: number;
  dataGeracao: string;
}

export interface RelatorioGeral extends RelatorioBase {
  tipoRelatorio: "RELATORIO_GERAL";
  grupos: GrupoRelatorio[];
}

export interface RelatorioParticipacaoPresenca extends RelatorioBase {
  resumo: GrupoRelatorio[];
  atividades?: LinhaRelatorio[];
  turmas?: LinhaRelatorio[];
  presencas?: LinhaRelatorio[];
}

export interface RelatorioProjetosExecucao extends RelatorioBase {
  resumo: GrupoRelatorio[];
  projetos?: LinhaRelatorio[];
  cronogramas?: LinhaRelatorio[];
  eventosCulturais?: LinhaRelatorio[];
  propostasEditais?: LinhaRelatorio[];
  resultadosPropostas?: LinhaRelatorio[];
  prestacoesContas?: LinhaRelatorio[];
}

export interface RelatorioFinanceiroPatrimonio extends RelatorioBase {
  resumo: GrupoRelatorio[];
  movimentacoesFinanceiras?: LinhaRelatorio[];
  planejamentosFinanceiros?: LinhaRelatorio[];
  patrimonios?: LinhaRelatorio[];
  emprestimos?: LinhaRelatorio[];
}

export interface RelatorioInstitucionalDocumental extends RelatorioBase {
  resumo: GrupoRelatorio[];
  documentos?: LinhaRelatorio[];
  colaboradores?: LinhaRelatorio[];
  integrantes?: LinhaRelatorio[];
  trajetoriasCulturais?: LinhaRelatorio[];
}

export function getRelatorioGeral() {
  return getJson<RelatorioGeral>("/relatorios/geral");
}

export function getRelatorioParticipacaoPresenca() {
  return getJson<RelatorioParticipacaoPresenca>(
    "/relatorios/participacao-presenca",
  );
}

export function getRelatorioProjetosExecucao() {
  return getJson<RelatorioProjetosExecucao>("/relatorios/projetos-execucao");
}

export function getRelatorioFinanceiroPatrimonio() {
  return getJson<RelatorioFinanceiroPatrimonio>(
    "/relatorios/financeiro-patrimonio",
  );
}

export function getRelatorioInstitucionalDocumental() {
  return getJson<RelatorioInstitucionalDocumental>(
    "/relatorios/institucional-documental",
  );
}

export type RelatorioColunaTipo =
  | "texto"
  | "numero"
  | "moeda"
  | "data"
  | "hora"
  | "booleano"
  | "percentual"
  | string;

export interface RelatorioColunaMeta {
  chave: string;
  label: string;
  visivelPorPadrao?: boolean;
  tipo?: RelatorioColunaTipo;
}

export interface RelatorioDetalhadoResponse<T = Record<string, unknown>> {
  tipoRelatorio?: string;
  titulo?: string;
  descricao?: string;
  nomeEmpresa?: string;
  organizacaoId?: number;
  dataGeracao?: string;
  total?: number;
  resumo?: GrupoRelatorio[];
  colunas?: RelatorioColunaMeta[];
  registros: T[];
  linhas?: T[];
}

export class RelatorioIndisponivelError extends Error {
  constructor(slug: string) {
    super(`O endpoint real deste relatório ainda não está disponível: ${slug}.`);
    this.name = "RelatorioIndisponivelError";
  }
}

const RELATORIO_SLUGS_OPERACIONAIS = [
  "organizacao",
  "agentes",
  "participantes",
  "colaboradores",
  "integrantes",
  "diretoria",
  "projetos",
  "metas-projeto",
  "cronogramas",
  "atividades",
  "turmas",
  "planos-aula",
  "presencas",
  "eventos-culturais",
  "acoes-divulgacao",
  "planos-comunicacao",
  "evidencias",
  "editais",
  "propostas-editais",
  "resultados-propostas",
  "equipe-edital",
  "habilitacoes-propostas",
  "financeiro",
  "aplicacao-de-recursos",
  "planejamento-financeiro",
  "prestacoes-contas",
  "prestacoes-metas",
  "patrimonios",
  "emprestimos",
  "documentos",
  "curriculos",
  "trajetorias-culturais",
] as const;

const RELATORIO_SLUGS_OPERACIONAIS_SET = new Set<string>(
  RELATORIO_SLUGS_OPERACIONAIS,
);

export const RELATORIO_SLUG_ALIASES: Record<string, string> = {
  organizacoes: "organizacao",

  "agentes-culturais": "agentes",

  "participantes-geral": "participantes",

  metas: "metas-projeto",

  cronograma: "cronogramas",

  "planos-de-aula": "planos-aula",

  "plano-comunicacao": "planos-comunicacao",

  financeiros: "financeiro",

  "propostas-edital": "propostas-editais",

  "resultados-proposta": "resultados-propostas",
  "resultado-proposta": "resultados-propostas",
  resultados: "resultados-propostas",

  "aplicacao-de-recursos": "aplicacao-de-recursos",
  "planejamento-financeiro": "aplicacao-de-recursos",
  "planejamentos-financeiros": "aplicacao-de-recursos",

  "prestacao-contas": "prestacoes-contas",
  "prestacao-metas": "prestacoes-metas",

  habilitacao: "habilitacoes-propostas",
  habilitacoes: "habilitacoes-propostas",

  "equipes-editais": "equipe-edital",

  "evidencias-execucao": "evidencias",

  patrimonio: "patrimonios",
};

export function resolveRelatorioSlug(slug: string): string {
  return RELATORIO_SLUG_ALIASES[slug] ?? slug;
}

function getRelatorioEndpointCandidates(slugInput: string): string[] {
  const slug = resolveRelatorioSlug(slugInput);

  if (!RELATORIO_SLUGS_OPERACIONAIS_SET.has(slug)) {
    return [];
  }

  const candidates = new Set<string>([slug]);

  if (slug === "aplicacao-de-recursos") {
    candidates.add("aplicacao-de-recursos");
    candidates.add("planejamento-financeiro");
  }

  Object.entries(RELATORIO_SLUG_ALIASES).forEach(([alias, canonical]) => {
    if (canonical === slug) {
      candidates.add(alias);
    }
  });

  if (slugInput !== slug) {
    candidates.add(slugInput);
  }

  return Array.from(candidates);
}

const RELATORIO_TITULOS: Record<string, string> = {
  organizacao: "Organização",
  diretoria: "Diretoria",
  documentos: "Documentos",
  agentes: "Agentes Culturais",

  colaboradores: "Colaboradores",
  integrantes: "Integrantes",
  participantes: "Participantes",

  curriculos: "Currículos",
  "trajetorias-culturais": "Trajetórias Culturais",

  projetos: "Projetos",
  "metas-projeto": "Metas do Projeto",
  cronogramas: "Cronograma",

  atividades: "Atividades",
  turmas: "Turmas",
  "planos-aula": "Planos de Aula",
  presencas: "Presenças",

  "eventos-culturais": "Eventos Culturais",
  "acoes-divulgacao": "Ações de Divulgação",
  "planos-comunicacao": "Planos de Comunicação",

  financeiro: "Financeiro",

  editais: "Editais",
  "propostas-editais": "Propostas de Edital",
  "resultados-propostas": "Resultados da Proposta",
  "habilitacoes-propostas": "Habilitação Documental",
  "equipe-edital": "Equipe da Proposta",
  "planejamento-financeiro": "Aplicação de Recursos",
  "aplicacao-de-recursos": "Aplicação de Recursos",

  evidencias: "Evidências de Execução",

  "prestacoes-contas": "Prestação de Contas",
  "prestacoes-metas": "Cumprimento de Metas",

  patrimonios: "Patrimônio",
  emprestimos: "Empréstimos",
};

const RELATORIO_DESCRICOES: Record<string, string> = {
  organizacao:
    "Consulte os dados institucionais da organização, incluindo identificação, contatos, área de atuação, histórico, território e endereço cadastrado.",

  diretoria:
    "Acompanhe os membros da diretoria, seus cargos, período de mandato, contatos, endereço e situação atual na representação institucional.",

  documentos:
    "Consulte os documentos institucionais cadastrados, verificando tipo, status, órgão emissor, datas de emissão e validade, vencimento e arquivo vinculado.",

  agentes:
    "Consulte os agentes culturais cadastrados no sistema, incluindo pessoas físicas, pessoas jurídicas, MEIs e coletivos vinculados à atuação institucional.",

  colaboradores:
    "Acompanhe os colaboradores da organização, com dados de contato, função, vínculo, carga horária, período de atuação, endereço e situação atual.",

  integrantes:
    "Consulte os integrantes formais da organização, com dados pessoais, função, período de entrada e saída, endereço e status do vínculo.",

  participantes:
    "Consulte os participantes cadastrados, incluindo dados pessoais, responsáveis, contatos, endereço completo e situação atual no sistema.",

  curriculos:
    "Consulte os currículos cadastrados para colaboradores, organizados por seções de formação, experiências, competências e atuação sociocultural.",

  "trajetorias-culturais":
    "Consulte as trajetórias culturais registradas para colaboradores, reunindo narrativas de atuação, experiências e contribuições no campo cultural.",

  projetos:
    "Acompanhe os projetos cadastrados, incluindo objetivos, público-alvo, acessibilidade, local de execução, período, área de atuação e status.",

  "metas-projeto":
    "Consulte as metas planejadas para projetos ou propostas, com descrição, quantidade prevista, forma de comprovação e vínculo correspondente.",

  cronogramas:
    "Acompanhe as etapas do cronograma dos projetos, com datas, descrição, status e vínculos com atividades, eventos ou ações de divulgação.",

  atividades:
    "Consulte as atividades vinculadas aos projetos, incluindo descrição, público beneficiado, local, período, vagas, tipo e situação de execução.",

  turmas:
    "Acompanhe as turmas cadastradas nas atividades, com horários, dias de realização, descrição, status e vínculo com projeto.",

  "planos-aula":
    "Consulte os planos de aula cadastrados para atividades e turmas, incluindo conteúdo, objetivos, metodologia, recursos, período e responsável.",

  presencas:
    "Consulte os registros de presença por atividade, turma e participante, apoiando o controle de frequência e a comprovação das ações realizadas.",

  "eventos-culturais":
    "Consulte os eventos culturais vinculados aos projetos, com local, período, acessibilidade, objetivo, resultado esperado, produto gerado e status.",

  "acoes-divulgacao":
    "Acompanhe as ações de divulgação vinculadas aos projetos, incluindo objetivos, estratégias, período, acessibilidade, produtos gerados e status.",

  "planos-comunicacao":
    "Consulte os planos de comunicação vinculados às ações de divulgação, com formato, quantidade, período, local de circulação e status.",

  financeiro:
    "Consulte as movimentações financeiras da organização, com entradas, saídas, valores, datas, formas de pagamento, comprovantes e vínculos com projetos ou ações.",

  editais:
    "Acompanhe os editais cadastrados pela organização, incluindo órgão responsável, número, ano, datas, valores, esfera, status e observações.",

  "propostas-editais":
    "Consulte as propostas de edital cadastradas, com textos principais, valores, data de submissão, status, edital e projeto vinculado.",

  "resultados-propostas":
    "Consulte os resultados das propostas inscritas em editais, incluindo status, pontuação, data do resultado, relatório de avaliação e informações de recurso quando houver.",

  "habilitacoes-propostas":
    "Acompanhe a fase de habilitação das propostas, incluindo agente responsável, prazos, envio de documentação, pendências, regularizações e status.",

  "equipe-edital":
    "Consulte a equipe vinculada às propostas de edital, com função, carga horária, valor previsto, justificativa, mini biografia e pessoa associada.",

  "planejamento-financeiro":
    "Consulte os itens previstos para aplicação de recursos da proposta, com justificativa, quantidade, unidade de medida, valores e vínculos com equipe ou edital.",
  "aplicacao-de-recursos":
    "Consulte os itens previstos para aplicação de recursos da proposta, com justificativa, quantidade, unidade de medida, valores e vínculos com equipe ou edital.",

  evidencias:
    "Consulte as evidências de execução cadastradas para comprovar atividades, turmas, eventos culturais, ações de divulgação, presenças ou propostas.",

  "prestacoes-contas":
    "Acompanhe as prestações de contas, com período, datas de envio e aprovação, status, pareceres, observações e proposta vinculada.",

  "prestacoes-metas":
    "Consulte o cumprimento das metas prestadas, comparando quantidade executada, status, justificativas, observações e vínculo com a prestação de contas.",

  patrimonios:
    "Consulte os bens patrimoniais cadastrados, incluindo identificação, tipo, estado de conservação, valor, nota fiscal, marca, modelo e status.",

  emprestimos:
    "Acompanhe os empréstimos de bens patrimoniais, com destinatário, datas, contexto de uso, estado inicial, devolução e status.",
};

function getDescricaoRelatorio(slug: string): string {
  return (
    RELATORIO_DESCRICOES[slug] ??
    `Relatório detalhado com dados reais cadastrados no sistema.`
  );
}

export async function getRelatorioDetalhado<T = Record<string, unknown>>(
  slugInput: string,
): Promise<RelatorioDetalhadoResponse<T>> {
  const slug = resolveRelatorioSlug(slugInput);
  const endpointCandidates = getRelatorioEndpointCandidates(slugInput)
    .map((candidate) => `/relatorios/${candidate}/detalhado`);

  if (!endpointCandidates.length) {
    throw new RelatorioIndisponivelError(slug);
  }

  let response: Response | null = null;

  for (const endpoint of endpointCandidates) {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (response.status !== 404) {
      break;
    }
  }

  if (!response || response.status === 404) {
    throw new RelatorioIndisponivelError(slug);
  }

  if (!response.ok) {
    const message = await parseError(response);

    if (slug === "planos-aula") {
      return getRelatorioPlanosAulaFallback<T>(message);
    }

    throw new Error(message);
  }

  const raw = await response.json();

  const registros = extractRows<Record<string, unknown>>(raw).map((row) =>
    normalizarRegistroRelatorio(slug, row),
  ) as T[];

  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<RelatorioDetalhadoResponse<T>>)
      : {};

  return {
    tipoRelatorio:
      obj.tipoRelatorio ??
      `RELATORIO_${slug.toUpperCase().replace(/-/g, "_")}`,
    titulo: obj.titulo ?? RELATORIO_TITULOS[slug] ?? "Relatório",
    descricao: getDescricaoRelatorio(slug),
    nomeEmpresa: obj.nomeEmpresa,
    organizacaoId: obj.organizacaoId,
    dataGeracao: obj.dataGeracao ?? hojeLocalISO(),
    total: obj.total ?? registros.length,
    resumo: obj.resumo ?? buildResumoFromRows(registros.length),
    colunas: obj.colunas,
    registros,
    linhas: registros,
  };
}

async function getRelatorioPlanosAulaFallback<T>(
  originalMessage: string,
): Promise<RelatorioDetalhadoResponse<T>> {
  try {
    const planos = await getPlanosAula();
    const registrosBase = planos.map(mapPlanoAulaToRelatorioRow);
    const registros = registrosBase as T[];

    return {
      tipoRelatorio: "RELATORIO_PLANOS_AULA",
      titulo: RELATORIO_TITULOS["planos-aula"] ?? "Planos de Aula",
      descricao: getDescricaoRelatorio("planos-aula"),
      dataGeracao: hojeLocalISO(),
      total: registros.length,
      resumo: buildResumoFromRows(registros.length),
      colunas: getColunasRelatorio("planos-aula", registrosBase),
      registros,
      linhas: registros,
    };
  } catch (fallbackError) {
    console.error("Erro no fallback do relatório de planos de aula:", fallbackError);
    throw new Error(originalMessage);
  }
}

function mapPlanoAulaToRelatorioRow(plano: PlanoAula): Record<string, unknown> {
  const turmas = plano.turmaNomes?.length
    ? plano.turmaNomes
    : plano.turmas
      ?.map((turma) => turma.nomeTurma || turma.nome)
      .filter(Boolean);

  return {
    atividade: plano.atividadeNome || plano.atividade?.nomeAtividade || "—",
    turmas: turmas?.length ? turmas.join(", ") : plano.turmaNome || "—",
    colaborador: plano.colaboradorNome || plano.colaborador?.nome || "—",
    data_inicio: plano.dataInicio,
    data_fim: plano.dataFim || null,
    aula_reposicao: plano.aulaReposicao,
    status: statusPlanoAulaValueToLabel(plano.statusPlanoAula),
    conteudo: plano.conteudo,
    observacao: plano.observacao || null,
  };
}

export function getRelatorioTabela<T = Record<string, unknown>>(slug: string) {
  return getRelatorioDetalhado<T>(slug);
}

function extractRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.registros)) return obj.registros as T[];
  if (Array.isArray(obj.linhas)) return obj.linhas as T[];
  if (Array.isArray(obj.content)) return obj.content as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];

  return [];
}

function normalizarRegistroRelatorio(
  slug: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...row };

  const slugsComAgente = new Set([
    "editais",
    "propostas-editais",
    "resultados-propostas",
    "habilitacoes-propostas",
    "equipe-edital",
    "planejamento-financeiro",
    "aplicacao-de-recursos",
  ]);

  if (slugsComAgente.has(slug)) {
    const agente =
      row.agente ??
      row.agente_responsavel ??
      row.agenteResponsavel ??
      row.nome_agente ??
      row.nomeAgente ??
      row.agente_cultural ??
      row.agenteCultural;

    if (agente !== null && agente !== undefined && String(agente).trim()) {
      normalized.agente = agente;
    }
  }

  if (slug === "editais") {
    const numeroInscricao =
      row.numero_inscricao ??
      row.numeroInscricao ??
      row.inscricao ??
      row.numero_de_inscricao ??
      row.numeroDeInscricao;

    if (
      numeroInscricao !== null &&
      numeroInscricao !== undefined &&
      String(numeroInscricao).trim()
    ) {
      normalized.numero_inscricao = numeroInscricao;
    }
  }

  if (slug === "participantes") {
    normalizarVinculosParticipante(row, normalized);
  }

  return normalized;
}

function normalizarVinculosParticipante(
  row: Record<string, unknown>,
  normalized: Record<string, unknown>,
) {
  [
    "vinculos",
    "participanteAtividades",
    "vinculosAtividades",
    "participante_atividades",
    "vinculos_atividades",
    "matriculas",
  ].forEach((key) => {
    delete normalized[key];
  });

  const vinculos = getArrayValue(
    row.vinculos,
    row.atividades,
    row.participanteAtividades,
    row.vinculosAtividades,
    row.participante_atividades,
    row.vinculos_atividades,
    row.matriculas,
  );

  const vinculosNormalizados = vinculos
    .map((vinculo) => normalizeVinculoParticipante(vinculo))
    .filter(
      (vinculo) =>
        vinculo.atividade ||
        vinculo.turma ||
        vinculo.nivelTurma ||
        vinculo.statusMatricula ||
        vinculo.dataMatricula,
    );

  const atividades = joinUnique(
    firstTextValue(row.atividades, row.atividade, row.nome_atividade) ||
    joinUnique(vinculosNormalizados.map((vinculo) => vinculo.atividade)),
  );

  const turmas = joinUnique(
    firstTextValue(row.turmas, row.turma, row.nome_turma) ||
    joinUnique(vinculosNormalizados.map((vinculo) => vinculo.turma)),
  );

  const niveis = joinUnique(
    firstTextValue(row.niveis_turma, row.nivel_turma, row.nivelTurma) ||
    joinUnique(vinculosNormalizados.map((vinculo) => vinculo.nivelTurma)),
  );

  const statusMatriculas = joinUnique(
    firstTextValue(
      row.status_matriculas,
      row.status_matricula,
      row.statusMatricula,
    ) ||
    joinUnique(vinculosNormalizados.map((vinculo) => vinculo.statusMatricula)),
  );

  const datasMatricula = joinUnique(
    firstTextValue(
      row.datas_matricula,
      row.data_matricula,
      row.dataMatricula,
    ) ||
    joinUnique(
      vinculosNormalizados.map((vinculo) =>
        vinculo.dataMatricula ? formatDateBR(vinculo.dataMatricula) : "",
      ),
    ),
  );

  const resumoVinculos = joinUnique(
    firstTextValue(row.vinculos_participante, row.vinculos_texto) ||
    vinculosNormalizados.map(formatVinculoParticipante).filter(Boolean),
  );

  if (resumoVinculos) normalized.vinculos_participante = resumoVinculos;
  if (atividades) normalized.atividades = atividades;
  if (turmas) normalized.turmas = turmas;
  if (niveis) normalized.nivel_turma = niveis;
  if (statusMatriculas) normalized.status_matricula = statusMatriculas;
  if (datasMatricula) normalized.data_matricula = datasMatricula;
}

function normalizeVinculoParticipante(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      atividade: "",
      turma: "",
      nivelTurma: "",
      statusMatricula: "",
      dataMatricula: "",
    };
  }

  const record = value as Record<string, unknown>;
  const atividade = asRecord(record.atividade);
  const turma = asRecord(record.turma);

  return {
    atividade: firstTextValue(
      record.atividadeNome,
      record.nomeAtividade,
      record.atividade_exercida,
      record.atividadeExercida,
      atividade?.nomeAtividade,
      atividade?.nome,
      atividade?.titulo,
      record.atividade,
    ),
    turma: firstTextValue(
      record.turmaNome,
      record.nomeTurma,
      turma?.nomeTurma,
      turma?.nome,
      turma?.titulo,
      record.turma,
    ),
    nivelTurma: firstTextValue(
      record.nivelTurma,
      record.nivel_turma,
      turma?.nivelTurma,
      turma?.nivel_turma,
    ),
    statusMatricula: firstTextValue(
      record.statusMatricula,
      record.status_matricula,
      record.status,
    ),
    dataMatricula: firstTextValue(
      record.dataMatricula,
      record.data_matricula,
      record.data,
    ),
  };
}

function formatVinculoParticipante(vinculo: {
  atividade: string;
  turma: string;
  nivelTurma: string;
  statusMatricula: string;
  dataMatricula: string;
}) {
  const base = [vinculo.atividade, vinculo.turma].filter(Boolean).join(" / ");
  const detalhes = [
    vinculo.nivelTurma,
    vinculo.statusMatricula,
    vinculo.dataMatricula ? formatDateBR(vinculo.dataMatricula) : "",
  ].filter(Boolean);

  if (!base) return detalhes.join(" - ");
  if (!detalhes.length) return base;

  return `${base} (${detalhes.join(" - ")})`;
}

function getArrayValue(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
}

function firstTextValue(...values: unknown[]): string {
  for (const value of values) {
    const text = textValue(value);

    if (text) return text;
  }

  return "";
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return joinUnique(value.map((item) => textValue(item)));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return firstTextValue(
      record.nome,
      record.nomeCompleto,
      record.nomeAtividade,
      record.nomeTurma,
      record.titulo,
      record.descricao,
      record.label,
    );
  }

  return String(value).trim();
}

function joinUnique(values: unknown[] | string): string {
  if (typeof values === "string") return values.trim();

  const unique = new Set<string>();

  values.forEach((value) => {
    const text = textValue(value);

    if (text) unique.add(text);
  });

  return Array.from(unique).join(", ");
}

function buildResumoFromRows(total: number): GrupoRelatorio[] {
  return [
    {
      titulo: "Resumo",
      indicadores: [
        {
          chave: "total_registros",
          label: "Total de registros",
          valor: total,
        },
      ],
    },
  ];
}

function hojeLocalISO(): string {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function getColunasRelatorio(
  slugInput: string,
  registros: Record<string, unknown>[],
): RelatorioColunaMeta[] {
  const slug = resolveRelatorioSlug(slugInput);

  const colunasPorSlug: Record<string, RelatorioColunaMeta[]> = {
    participantes: [
      { chave: "nome_completo", label: "Nome Completo" },
      { chave: "data_nascimento", label: "Data de Nascimento", tipo: "data" },
      { chave: "cpf", label: "CPF" },
      { chave: "rg", label: "RG", visivelPorPadrao: false },
      { chave: "telefone", label: "Telefone" },
      { chave: "email", label: "E-mail" },
      { chave: "status", label: "Status" },

      { chave: "nome_responsavel", label: "Responsável" },
      { chave: "cpf_responsavel", label: "CPF do Responsável" },
      {
        chave: "rg_responsavel",
        label: "RG do Responsável",
        visivelPorPadrao: false,
      },
      {
        chave: "telefone_responsavel",
        label: "Telefone do Responsável",
      },

      { chave: "cep", label: "CEP" },
      { chave: "logradouro", label: "Logradouro" },
      { chave: "numero", label: "Número" },
      { chave: "complemento", label: "Complemento" },
      { chave: "bairro", label: "Bairro" },
      { chave: "cidade", label: "Cidade" },
      { chave: "estado", label: "Estado" },

      { chave: "organizacao", label: "Organização", visivelPorPadrao: false },
      { chave: "atividades", label: "Atividades" },
      { chave: "turmas", label: "Turmas" },
      { chave: "nivel_turma", label: "Nível" },
      {
        chave: "status_matricula",
        label: "Status da Matrícula",
      },
      {
        chave: "data_matricula",
        label: "Data da Matrícula",
        tipo: "data",
      },
    ],

    colaboradores: [
      { chave: "nome_completo", label: "Nome Completo" },
      {
        chave: "data_nascimento",
        label: "Data de Nascimento",
        tipo: "data",
        visivelPorPadrao: false,
      },
      { chave: "cpf", label: "CPF" },
      { chave: "rg", label: "RG", visivelPorPadrao: false },
      { chave: "telefone", label: "Telefone" },
      { chave: "email", label: "E-mail" },
      { chave: "funcao_colaborador", label: "Função" },
      { chave: "tipo_vinculo", label: "Tipo de Vínculo" },
      {
        chave: "carga_horaria_semanal",
        label: "Carga Horária Semanal",
        tipo: "numero",
      },
      {
        chave: "descricao_atuacao",
        label: "Descrição da Atuação",
        visivelPorPadrao: false,
      },
      {
        chave: "data_inicio_vinculo",
        label: "Início do Vínculo",
        tipo: "data",
      },
      {
        chave: "data_fim_vinculo",
        label: "Fim do Vínculo",
        tipo: "data",
        visivelPorPadrao: false,
      },
      { chave: "status", label: "Status" },
      { chave: "cep", label: "CEP", visivelPorPadrao: false },
      { chave: "logradouro", label: "Logradouro" },
      { chave: "numero", label: "Número" },
      { chave: "complemento", label: "Complemento" },
      { chave: "bairro", label: "Bairro" },
      { chave: "cidade", label: "Cidade" },
      { chave: "estado", label: "Estado" },
      { chave: "organizacao", label: "Organização", visivelPorPadrao: false },
    ],

    integrantes: [
      { chave: "nome_completo", label: "Nome Completo" },
      {
        chave: "data_nascimento",
        label: "Data de Nascimento",
        tipo: "data",
        visivelPorPadrao: false,
      },
      { chave: "cpf", label: "CPF" },
      { chave: "rg", label: "RG", visivelPorPadrao: false },
      { chave: "telefone", label: "Telefone" },
      { chave: "email", label: "E-mail" },
      { chave: "funcao_integrante", label: "Função" },
      { chave: "data_entrada", label: "Data de Entrada", tipo: "data" },
      {
        chave: "data_saida",
        label: "Data de Saída",
        tipo: "data",
        visivelPorPadrao: false,
      },
      { chave: "status", label: "Status" },
      { chave: "cep", label: "CEP", visivelPorPadrao: false },
      { chave: "logradouro", label: "Logradouro" },
      { chave: "numero", label: "Número" },
      { chave: "complemento", label: "Complemento" },
      { chave: "bairro", label: "Bairro" },
      { chave: "cidade", label: "Cidade" },
      { chave: "estado", label: "Estado" },
      { chave: "organizacao", label: "Organização", visivelPorPadrao: false },
    ],

    "metas-projeto": [
      { chave: "titulo_meta", label: "Meta" },
      { chave: "descricao_meta", label: "Descrição" },
      {
        chave: "quantidade_prevista",
        label: "Quantidade Prevista",
        tipo: "numero",
      },
      { chave: "forma_comprovacao", label: "Forma de Comprovação" },
      { chave: "projeto", label: "Projeto" },
      {
        chave: "proposta_edital",
        label: "Proposta de Edital",
        visivelPorPadrao: false,
      },
    ],

    financeiro: [
      { chave: "descricao", label: "Descrição" },
      { chave: "tipo_operacao_financeira", label: "Tipo" },
      { chave: "valor", label: "Valor", tipo: "moeda" },
      { chave: "status_financeiro", label: "Status" },
      { chave: "forma_pagamento", label: "Forma de Pagamento" },
      { chave: "aplicacao_financeiro", label: "Aplicação" },
      { chave: "data_pagamento", label: "Data de Pagamento", tipo: "data" },
      { chave: "data_vencimento", label: "Data de Vencimento", tipo: "data" },
      { chave: "nome_pessoa", label: "Pessoa/Fornecedor" },
      { chave: "cpf_cnpj", label: "CPF/CNPJ", visivelPorPadrao: false },
      {
        chave: "numero_documento",
        label: "Nº Documento",
        visivelPorPadrao: false,
      },
      { chave: "projeto", label: "Projeto" },
      { chave: "atividade", label: "Atividade", visivelPorPadrao: false },
      { chave: "colaborador", label: "Colaborador", visivelPorPadrao: false },
      {
        chave: "evento_cultural",
        label: "Evento Cultural",
        visivelPorPadrao: false,
      },
      {
        chave: "acao_divulgacao",
        label: "Ação de Divulgação",
        visivelPorPadrao: false,
      },
      {
        chave: "planejamento_financeiro",
        label: "Aplicação de Recursos",
        visivelPorPadrao: false,
      },
      {
        chave: "url_comprovante",
        label: "Comprovante",
        visivelPorPadrao: false,
      },
      { chave: "observacao", label: "Observação", visivelPorPadrao: false },
    ],

    patrimonios: [
      { chave: "numero_patrimonio", label: "Nº Patrimônio" },
      { chave: "nome_patrimonio", label: "Bem" },
      { chave: "tipo_patrimonio", label: "Tipo" },
      { chave: "estado_conservacao", label: "Conservação" },
      { chave: "status_patrimonio", label: "Status" },
      { chave: "projeto_origem", label: "Projeto" },
      { chave: "valor_patrimonio", label: "Valor", tipo: "moeda" },
      { chave: "data_aquisicao", label: "Data de Aquisição", tipo: "data" },
      { chave: "marca", label: "Marca" },
      { chave: "modelo", label: "Modelo" },
      { chave: "numero_serie", label: "Nº Série", visivelPorPadrao: false },
      {
        chave: "url_nota_fiscal",
        label: "Nota Fiscal",
        visivelPorPadrao: false,
      },
      {
        chave: "descricao_patrimonio",
        label: "Descrição",
        visivelPorPadrao: false,
      },
      { chave: "organizacao", label: "Organização", visivelPorPadrao: false },
    ],

    editais: [
      { chave: "nome_edital", label: "Edital" },
      { chave: "numero_edital", label: "Número" },
      { chave: "numero_inscricao", label: "Nº Inscrição" },
      { chave: "ano_edital", label: "Ano", tipo: "numero" },
      { chave: "orgao_responsavel", label: "Órgão Responsável" },
      { chave: "agente", label: "Agente Responsável" },
      { chave: "esfera_edital", label: "Esfera" },
      { chave: "status_edital", label: "Status" },
      {
        chave: "valor_total_disponivel",
        label: "Valor Total Disponível",
        tipo: "moeda",
      },
      {
        chave: "data_abertura",
        label: "Data de Abertura",
        tipo: "data",
        visivelPorPadrao: false,
      },
      {
        chave: "data_encerramento",
        label: "Data de Encerramento",
        tipo: "data",
        visivelPorPadrao: false,
      },
      {
        chave: "data_resultado",
        label: "Data de Resultado",
        tipo: "data",
        visivelPorPadrao: false,
      },
      { chave: "link_edital", label: "Link do Edital", visivelPorPadrao: false },
      { chave: "observacao", label: "Observação", visivelPorPadrao: false },
      { chave: "organizacao", label: "Organização", visivelPorPadrao: false },
    ],

    "propostas-editais": [
      { chave: "titulo_projeto", label: "Título do Projeto" },
      { chave: "edital", label: "Edital" },
      { chave: "projeto", label: "Projeto Base" },
      { chave: "agente", label: "Agente Responsável" },
      { chave: "valor_solicitado", label: "Valor Solicitado", tipo: "moeda" },
      {
        chave: "valor_contrapartida",
        label: "Valor de Contrapartida",
        tipo: "moeda",
      },
      { chave: "data_submissao", label: "Data de Submissão", tipo: "data" },
      { chave: "status_proposta_edital", label: "Status" },
      { chave: "resumo_projeto", label: "Resumo", visivelPorPadrao: false },
      {
        chave: "justificativa_projeto",
        label: "Justificativa",
        visivelPorPadrao: false,
      },
      {
        chave: "metodologia_execucao",
        label: "Metodologia",
        visivelPorPadrao: false,
      },
      {
        chave: "democratizacao_acesso",
        label: "Democratização de Acesso",
        visivelPorPadrao: false,
      },
      {
        chave: "acoes_acessibilidade",
        label: "Ações de Acessibilidade",
        visivelPorPadrao: false,
      },
      {
        chave: "impacto_esperado",
        label: "Impacto Esperado",
        visivelPorPadrao: false,
      },
      {
        chave: "motivo_reprovacao",
        label: "Motivo de Reprovação",
        visivelPorPadrao: false,
      },
      {
        chave: "observacoes_internas",
        label: "Observações Internas",
        visivelPorPadrao: false,
      },
    ],

    "resultados-propostas": [
      { chave: "proposta_edital", label: "Proposta de Edital" },
      { chave: "titulo_projeto", label: "Proposta de Edital" },
      { chave: "edital", label: "Edital" },
      { chave: "data_resultado", label: "Data do Resultado", tipo: "data" },
      { chave: "pontuacao", label: "Pontuação", tipo: "numero" },
      {
        chave: "status_resultado_proposta",
        label: "Status do Resultado",
      },
      {
        chave: "url_relatorio_avaliacao",
        label: "Relatório de Avaliação",
        visivelPorPadrao: false,
      },
      {
        chave: "recurso_interposto",
        label: "Recurso Interposto",
        tipo: "booleano",
      },
      {
        chave: "data_envio_recurso",
        label: "Data de Envio do Recurso",
        tipo: "data",
      },
      {
        chave: "descricao_recurso",
        label: "Descrição do Recurso",
        visivelPorPadrao: false,
      },
      {
        chave: "url_documento_recurso",
        label: "Documento do Recurso",
        visivelPorPadrao: false,
      },
      {
        chave: "observacoes",
        label: "Observações",
        visivelPorPadrao: false,
      },
    ],

    "habilitacoes-propostas": [
      { chave: "proposta_edital", label: "Proposta de Edital" },
      { chave: "agente", label: "Agente Responsável" },
      {
        chave: "documento_agente",
        label: "Documento do Agente",
        visivelPorPadrao: false,
      },
      {
        chave: "data_inicio_habilitacao",
        label: "Data de Início",
        tipo: "data",
      },
      {
        chave: "data_limite_habilitacao",
        label: "Data Final do Envio",
        tipo: "data",
      },
      {
        chave: "data_envio_documentacao",
        label: "Data de Envio",
        tipo: "data",
      },
      { chave: "status_habilitacao", label: "Status da Habilitação" },
      {
        chave: "data_retorno_analise",
        label: "Data de Retorno da Análise",
        tipo: "data",
        visivelPorPadrao: false,
      },
      {
        chave: "exigencia_ou_pendencia",
        label: "Exigência ou Pendência",
        visivelPorPadrao: false,
      },
      {
        chave: "providencia_tomada",
        label: "Providência Tomada",
        visivelPorPadrao: false,
      },
      {
        chave: "data_regularizacao",
        label: "Data de Regularização",
        tipo: "data",
        visivelPorPadrao: false,
      },
      {
        chave: "data_conclusao_habilitacao",
        label: "Data de Conclusão",
        tipo: "data",
        visivelPorPadrao: false,
      },
      {
        chave: "motivo_inabilitacao",
        label: "Motivo de Inabilitação",
        visivelPorPadrao: false,
      },
      { chave: "observacoes", label: "Observações", visivelPorPadrao: false },
    ],

    "equipe-edital": [
      { chave: "proposta_edital", label: "Proposta de Edital" },
      { chave: "agente", label: "Agente Responsável" },
      { chave: "colaborador", label: "Colaborador" },
      { chave: "integrante", label: "Integrante" },
      { chave: "pessoa", label: "Pessoa" },
      { chave: "tipo_pessoa", label: "Tipo de Pessoa" },
      { chave: "funcao_projeto", label: "Função no Projeto" },
      {
        chave: "carga_horaria_prevista",
        label: "Carga Horária",
        tipo: "numero",
      },
      { chave: "valor_previsto", label: "Valor Previsto", tipo: "moeda" },
      {
        chave: "coordenador_projeto",
        label: "Coordenador",
        visivelPorPadrao: false,
      },
      {
        chave: "responsavel_tecnico",
        label: "Responsável Técnico",
        visivelPorPadrao: false,
      },
      {
        chave: "justificativa_funcao",
        label: "Justificativa da Função",
        visivelPorPadrao: false,
      },
      {
        chave: "mini_biografia",
        label: "Mini Biografia",
        visivelPorPadrao: false,
      },
    ],

    "planejamento-financeiro": [
      { chave: "nome_planejamento", label: "Nome Planejamento" },
      { chave: "quantidade", label: "Quantidade", tipo: "numero" },
      { chave: "unidade_medida", label: "Unidade Medida" },
      { chave: "valor_unitario", label: "Valor Unitário", tipo: "moeda" },
      { chave: "valor_total", label: "Valor Total", tipo: "moeda" },
      { chave: "funcao_equipe", label: "Função Equipe" },
      { chave: "colaborador", label: "Colaborador" },
    ],

    "aplicacao-de-recursos": [
      { chave: "nome_planejamento", label: "Nome Planejamento" },
      { chave: "quantidade", label: "Quantidade", tipo: "numero" },
      { chave: "unidade_medida", label: "Unidade Medida" },
      { chave: "valor_unitario", label: "Valor Unitário", tipo: "moeda" },
      { chave: "valor_total", label: "Valor Total", tipo: "moeda" },
      { chave: "funcao_equipe", label: "Função Equipe" },
      { chave: "colaborador", label: "Colaborador" },
    ],

    "planos-aula": [
      { chave: "atividade", label: "Atividade" },
      { chave: "turmas", label: "Turmas" },
      { chave: "colaborador", label: "Colaborador" },
      { chave: "data_inicio", label: "Data de Início", tipo: "data" },
      { chave: "data_fim", label: "Data de Fim", tipo: "data" },
      { chave: "aula_reposicao", label: "Aula de Reposição" },
      { chave: "status", label: "Status" },
      { chave: "conteudo", label: "Conteúdo" },
      {
        chave: "observacao",
        label: "Observação",
        visivelPorPadrao: false,
      },
    ],
  };

  if (colunasPorSlug[slug]) {
    return filtrarColunasExistentes(colunasPorSlug[slug], registros);
  }

  const sample = registros[0];

  if (!sample) return [];

  return Object.keys(sample)
    .filter((key) => !isCampoTecnico(key))
    .map((key) => ({
      chave: key,
      label: prettyLabelRelatorio(key),
      visivelPorPadrao: visivelPorPadrao(key),
      tipo: inferirTipoColuna(key),
    }));
}

function filtrarColunasExistentes(
  colunas: RelatorioColunaMeta[],
  registros: Record<string, unknown>[],
): RelatorioColunaMeta[] {
  if (!registros.length) return colunas;

  const keys = new Set<string>();

  registros.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });

  return colunas.filter((coluna) => keys.has(coluna.chave));
}

function isCampoTecnico(key: string): boolean {
  const k = key.toLowerCase();

  if (k === "id") return true;
  if (k.endsWith("_id")) return true;
  if (k.endsWith("ids")) return true;

  return false;
}

function visivelPorPadrao(key: string): boolean {
  const k = key.toLowerCase();

  if (isCampoTecnico(k)) return false;
  if (k.includes("url_")) return false;
  if (k === "rg") return false;
  if (k.includes("observacao")) return false;

  return true;
}

function inferirTipoColuna(key: string): RelatorioColunaTipo {
  const k = key.toLowerCase();

  if (k.includes("data")) return "data";
  if (k.includes("valor") || k.includes("saldo")) return "moeda";
  if (
    k.includes("quantidade") ||
    k.includes("total") ||
    k.includes("carga") ||
    k.includes("ano")
  ) {
    return "numero";
  }
  if (k.includes("possui") || k.includes("vencido")) return "booleano";

  return "texto";
}

const MONETARIO_KEYS = new Set([
  "valor",
  "valor_total",
  "valor_unitario",
  "total_entradas",
  "total_saidas",
  "saldo",
  "planejado",
  "pendentes",
  "valor_patrimonio",
  "valor_solicitado",
  "valor_contrapartida",
  "entradas",
  "saidas",
  "valor_previsto",
  "valor_pago",
  "valor_aquisicao",
  "valor_total_disponivel",
]);

const PERCENTUAL_KEYS = new Set(["percentual_presenca", "percentual", "taxa"]);

const DATE_ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;

const numberFormatter = new Intl.NumberFormat("pt-BR");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatDateBR(value?: string | null): string {
  if (!value) return "—";

  const match = String(value).match(DATE_ISO_REGEX);

  if (!match) return String(value);

  const [, y, m, d] = match;

  return `${d}/${m}/${y}`;
}

function isMonetaryKey(chave?: string): boolean {
  if (!chave) return false;

  return MONETARIO_KEYS.has(chave.toLowerCase());
}

function isPercentualKey(chave?: string): boolean {
  if (!chave) return false;

  return PERCENTUAL_KEYS.has(chave.toLowerCase());
}

export function formatValorRelatorio(valor: unknown, chave?: string): string {
  if (valor === null || valor === undefined || valor === "") return "—";

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  if (typeof valor === "number") {
    if (isMonetaryKey(chave)) return currencyFormatter.format(valor);

    if (isPercentualKey(chave)) {
      return `${numberFormatter.format(valor)}%`;
    }

    return numberFormatter.format(valor);
  }

  if (typeof valor === "string") {
    if (DATE_ISO_REGEX.test(valor)) return formatDateBR(valor);

    if (isMonetaryKey(chave)) {
      const num = Number(valor.replace(",", "."));

      if (!Number.isNaN(num)) return currencyFormatter.format(num);
    }

    if (isPercentualKey(chave)) {
      const num = Number(valor.replace(",", "."));

      if (!Number.isNaN(num)) return `${numberFormatter.format(num)}%`;
    }

    return formatEnum(valor);
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";

    return formatArrayValue(valor);
  }

  if (typeof valor === "object") {
    return "Ver detalhes";
  }

  return String(valor);
}

function formatArrayValue(values: unknown[]): string {
  const formattedValues = values
    .map((item) => {
      if (item === null || item === undefined || item === "") return "";

      if (typeof item === "string") return formatEnumList(item);
      if (typeof item === "number") return numberFormatter.format(item);
      if (typeof item === "boolean") return item ? "Sim" : "Não";

      if (typeof item === "object") {
        const record = item as Record<string, unknown>;
        const label =
          record.nome ??
          record.nomeCompleto ??
          record.titulo ??
          record.descricao ??
          record.label;

        if (label !== null && label !== undefined) {
          return formatValorRelatorio(label);
        }
      }

      return String(item);
    })
    .filter(Boolean);

  return formattedValues.length > 0 ? formattedValues.join(", ") : "—";
}

function formatEnumList(value: string): string {
  if (!value.includes(",")) return formatEnum(value);

  return value
    .split(",")
    .map((part) => formatEnum(part.trim()))
    .join(", ");
}

const ENUM_LABEL_OVERRIDES: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  RG: "RG",
  MEI: "MEI",
};

function formatEnum(value: string): string {
  const normalized = value.trim();

  if (ENUM_LABEL_OVERRIDES[normalized]) {
    return ENUM_LABEL_OVERRIDES[normalized];
  }

  if (!/^[A-ZÀ-Ú0-9_]+$/.test(normalized)) {
    return value;
  }

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function prettyLabelRelatorio(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

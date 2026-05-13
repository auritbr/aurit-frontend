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

export const RELATORIO_SLUG_ALIASES: Record<string, string> = {
  organizacoes: "organizacao",

  "agentes-culturais": "agentes",

  metas: "metas-projeto",

  patrimonios: "patrimonio",

  cronogramas: "cronograma",

  "propostas-editais": "propostas-edital",

  "resultados-proposta": "resultados-propostas",
  "resultado-proposta": "resultados-propostas",
  resultados: "resultados-propostas",

  "planejamentos-financeiros": "planejamento-financeiro",

  "prestacoes-contas": "prestacao-contas",
  "prestacoes-metas": "prestacao-metas",

  habilitacoes: "habilitacao",
  "habilitacoes-propostas": "habilitacao",

  "evidencias-execucao": "evidencias",
};

export function resolveRelatorioSlug(slug: string): string {
  return RELATORIO_SLUG_ALIASES[slug] ?? slug;
}

const RELATORIO_DETALHADO_ENDPOINTS: Record<string, string> = {
  organizacao: "/relatorios/organizacao/detalhado",
  agentes: "/relatorios/agentes/detalhado",
  diretoria: "/relatorios/diretoria/detalhado",
  documentos: "/relatorios/documentos/detalhado",

  colaboradores: "/relatorios/colaboradores/detalhado",
  integrantes: "/relatorios/integrantes/detalhado",
  participantes: "/relatorios/participantes/detalhado",

  curriculos: "/relatorios/curriculos/detalhado",
  "trajetorias-culturais": "/relatorios/trajetorias-culturais/detalhado",

  projetos: "/relatorios/projetos/detalhado",
  "metas-projeto": "/relatorios/metas-projeto/detalhado",
  cronograma: "/relatorios/cronogramas/detalhado",

  atividades: "/relatorios/atividades/detalhado",
  turmas: "/relatorios/turmas/detalhado",
  presencas: "/relatorios/presencas/detalhado",

  "eventos-culturais": "/relatorios/eventos-culturais/detalhado",
  "acoes-divulgacao": "/relatorios/acoes-divulgacao/detalhado",
  "plano-comunicacao": "/relatorios/plano-comunicacao/detalhado",

  financeiro: "/relatorios/financeiro/detalhado",

  editais: "/relatorios/editais/detalhado",
  "propostas-edital": "/relatorios/propostas-editais/detalhado",
  "resultados-propostas": "/relatorios/resultados-propostas/detalhado",
  habilitacao: "/relatorios/habilitacoes-propostas/detalhado",
  "equipe-edital": "/relatorios/equipe-edital/detalhado",
  "planejamento-financeiro": "/relatorios/planejamentos-financeiros/detalhado",

  evidencias: "/relatorios/evidencias/detalhado",

  "prestacao-contas": "/relatorios/prestacoes-contas/detalhado",
  "prestacao-metas": "/relatorios/prestacao-metas/detalhado",

  patrimonio: "/relatorios/patrimonios/detalhado",
  emprestimos: "/relatorios/emprestimos/detalhado",
};

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
  cronograma: "Cronograma",

  atividades: "Atividades",
  turmas: "Turmas",
  presencas: "Presenças",

  "eventos-culturais": "Eventos Culturais",
  "acoes-divulgacao": "Ações de Divulgação",
  "plano-comunicacao": "Plano de Comunicação",

  financeiro: "Financeiro",

  editais: "Editais",
  "propostas-edital": "Propostas de Edital",
  "resultados-propostas": "Resultados da Proposta",
  habilitacao: "Habilitação Documental",
  "equipe-edital": "Equipe da Proposta",
  "planejamento-financeiro": "Orçamento da Proposta",

  evidencias: "Evidências de Execução",

  "prestacao-contas": "Prestação de Contas",
  "prestacao-metas": "Cumprimento de Metas",

  patrimonio: "Patrimônio",
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

  cronograma:
    "Acompanhe as etapas do cronograma dos projetos, com datas, descrição, status e vínculos com atividades, eventos ou ações de divulgação.",

  atividades:
    "Consulte as atividades vinculadas aos projetos, incluindo descrição, público beneficiado, local, período, vagas, tipo e situação de execução.",

  turmas:
    "Acompanhe as turmas cadastradas nas atividades, com horários, dias de realização, descrição, status e vínculo com projeto.",

  presencas:
    "Consulte os registros de presença por atividade, turma e participante, apoiando o controle de frequência e a comprovação das ações realizadas.",

  "eventos-culturais":
    "Consulte os eventos culturais vinculados aos projetos, com local, período, acessibilidade, objetivo, resultado esperado, produto gerado e status.",

  "acoes-divulgacao":
    "Acompanhe as ações de divulgação vinculadas aos projetos, incluindo objetivos, estratégias, período, acessibilidade, produtos gerados e status.",

  "plano-comunicacao":
    "Consulte os planos de comunicação vinculados às ações de divulgação, com formato, quantidade, período, local de circulação e status.",

  financeiro:
    "Consulte as movimentações financeiras da organização, com entradas, saídas, valores, datas, formas de pagamento, comprovantes e vínculos com projetos ou ações.",

  editais:
    "Acompanhe os editais cadastrados pela organização, incluindo órgão responsável, número, ano, datas, valores, esfera, status e observações.",

  "propostas-edital":
    "Consulte as propostas de edital cadastradas, com textos principais, valores, data de submissão, status, edital e projeto vinculado.",

  "resultados-propostas":
    "Consulte os resultados das propostas inscritas em editais, incluindo status, pontuação, data do resultado, relatório de avaliação e informações de recurso quando houver.",

  habilitacao:
    "Acompanhe a fase de habilitação das propostas, incluindo agente responsável, prazos, envio de documentação, pendências, regularizações e status.",

  "equipe-edital":
    "Consulte a equipe vinculada às propostas de edital, com função, carga horária, valor previsto, justificativa, mini biografia e pessoa associada.",

  "planejamento-financeiro":
    "Consulte os itens do planejamento financeiro das propostas, com justificativa, quantidade, unidade, valores e vínculo com equipe ou agente.",

  evidencias:
    "Consulte as evidências de execução cadastradas para comprovar atividades, turmas, eventos culturais, ações de divulgação, presenças ou propostas.",

  "prestacao-contas":
    "Acompanhe as prestações de contas, com período, datas de envio e aprovação, status, pareceres, observações e proposta vinculada.",

  "prestacao-metas":
    "Consulte o cumprimento das metas prestadas, comparando quantidade executada, status, justificativas, observações e vínculo com a prestação de contas.",

  patrimonio:
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
  const endpoint = RELATORIO_DETALHADO_ENDPOINTS[slug];

  if (!endpoint) {
    throw new RelatorioIndisponivelError(slug);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (response.status === 404) {
    throw new RelatorioIndisponivelError(slug);
  }

  if (!response.ok) {
    const message = await parseError(response);
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
    "propostas-edital",
    "resultados-propostas",
    "habilitacao",
    "equipe-edital",
    "planejamento-financeiro",
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

  return normalized;
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
        label: "Planejamento Financeiro",
        visivelPorPadrao: false,
      },
      {
        chave: "url_comprovante",
        label: "Comprovante",
        visivelPorPadrao: false,
      },
      { chave: "observacao", label: "Observação", visivelPorPadrao: false },
    ],

    patrimonio: [
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

    "propostas-edital": [
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

    habilitacao: [
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
      { chave: "nome_planejamento", label: "Item do Planejamento" },
      { chave: "proposta_edital", label: "Proposta de Edital" },
      { chave: "edital", label: "Edital", visivelPorPadrao: false },
      {
        chave: "funcao_equipe",
        label: "Função da Equipe",
        visivelPorPadrao: false,
      },
      { chave: "colaborador", label: "Colaborador", visivelPorPadrao: false },
      { chave: "integrante", label: "Integrante", visivelPorPadrao: false },
      { chave: "agente", label: "Agente Responsável", visivelPorPadrao: false },
      { chave: "quantidade", label: "Quantidade", tipo: "numero" },
      { chave: "unidade_medida", label: "Unidade de Medida" },
      { chave: "valor_unitario", label: "Valor Unitário", tipo: "moeda" },
      { chave: "valor_total", label: "Valor Total", tipo: "moeda" },
      {
        chave: "justificativa_planejamento",
        label: "Justificativa",
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

    return `${valor.length} registro(s)`;
  }

  if (typeof valor === "object") {
    return "Ver detalhes";
  }

  return String(valor);
}

function formatEnum(value: string): string {
  if (!/^[A-Z0-9_]+$/.test(value)) {
    return value;
  }

  return value
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
import { reportFieldLabel } from "./reportFieldLabels";
export type GenericReportColumnConfig = {
  defaultColumns: string[];
  removedColumns?: string[];
};

type BackendColumnMeta = {
  chave: string;
  visivelPorPadrao?: boolean;
  tipo?: string;
};

export const GENERIC_REPORT_COLUMNS: Record<string, GenericReportColumnConfig> =
  {
    organizacao: {
      defaultColumns: [
        "razao_social",
        "nome_fantasia",
        "cnpj",
        "tipo_agente",
        "tipo_iniciativa_cultural",
        "area_atuacao",
      ],
    },
    diretoria: {
      defaultColumns: [
        "nome_completo",
        "cargo_diretoria",
        "data_inicio_mandato",
        "data_fim_mandato",
        "status_diretoria",
      ],
    },
    documentos: {
      defaultColumns: [
        "tipo_documento",
        "orgao_emissor",
        "data_emissao",
        "data_validade",
        "status_documento",
      ],
      removedColumns: [
        "arquivo",
        "url_arquivo",
        "url_documento",
        "urlDocumento",
        "arquivo_documento",
        "arquivoDocumento",
        "possui_arquivo",
      ],
    },
    agentes: {
      defaultColumns: [
        "tipo_agente",
        "nome_principal",
        "representante",
        "documento",
      ],
    },
    colaboradores: {
      defaultColumns: [
        "nome_completo",
        "funcao_colaborador",
        "tipo_vinculo",
        "status",
        "cpf",
      ],
    },
    integrantes: {
      defaultColumns: [
        "nome_completo",
        "cpf",
        "cnpj",
        "funcao_integrante",
        "tipo_vinculo_integrante",
        "status",
      ],
    },
    "participantes-geral": {
      defaultColumns: [
        "nome_completo",
        "status",
        "telefone",
        "nome_responsavel",
        "atividades",
        "tipo_documento_participante",
      ],
      removedColumns: ["vinculos", "vínculos"],
    },
    curriculos: {
      defaultColumns: [
        "colaborador",
        "funcao_colaborador",
        "tipo_secao_curriculo",
        "texto_item",
      ],
    },
    "trajetorias-culturais": {
      defaultColumns: ["colaborador", "texto_trajetoria"],
    },
    projetos: {
      defaultColumns: [
        "nome_projeto",
        "area_atuacao",
        "origem_projeto",
        "data_inicio",
        "data_fim",
        "status",
      ],
      removedColumns: ["objetivos_especificos", "objetivos_json"],
    },
    "metas-projeto": {
      defaultColumns: [
        "titulo_meta",
        "projeto",
        "proposta_edital",
        "quantidade_prevista",
        "quantidade_executada",
        "percentual_executado",
        "status_cumprimento_meta",
        "forma_comprovacao",
        "valor_estimado",
        "data_inicio_planejamento",
        "data_termino_planejamento",
      ],
    },
    cronogramas: {
      defaultColumns: [
        "projeto",
        "nome_etapa",
        "etapa_cronograma",
        "data_inicio_etapa",
        "data_fim_etapa",
        "tipo_vinculo",
        "status_cronograma",
      ],
    },
    atividades: {
      defaultColumns: [
        "nome_atividade",
        "tipo_atividade",
        "projeto",
        "data_inicio",
        "data_fim",
        "status",
        "colaboradores",
      ],
    },
    turmas: {
      defaultColumns: [
        "nome_turma",
        "atividade",
        "nivel_turma",
        "horarios",
        "quantidade_vagas",
        "status",
        "colaboradores",
      ],
    },
    "planos-aula": {
      defaultColumns: [
        "nome_plano_aula",
        "atividade",
        "turmas",
        "colaborador",
        "data_inicio",
        "data_fim",
        "status_plano_aula",
      ],
    },
    presencas: {
      defaultColumns: [
        "participante",
        "atividade",
        "turma",
        "status_presenca",
        "data_presenca",
        "plano_aula",
      ],
    },
    "eventos-culturais": {
      defaultColumns: [
        "nome_evento",
        "tipo_evento",
        "projeto",
        "data_evento",
        "data_fim",
        "status",
        "colaboradores",
      ],
    },
    evidencias: {
      defaultColumns: [
        "titulo_evidencia",
        "tipo_evidencia",
        "tipo_vinculo_evidencia",
        "projeto",
        "proposta_edital",
        "plano_aula",
        "atividade",
        "turma",
        "evento_cultural",
        "acao_divulgacao",
        "presenca",
        "situacao",
      ],
      removedColumns: ["url_arquivo", "url_publicacao"],
    },
    editais: {
      defaultColumns: [
        "nome_edital",
        "orgao_responsavel",
        "esfera_edital",
        "data_abertura",
        "data_encerramento",
        "valor_total_disponivel",
        "status_edital",
      ],
    },
    "propostas-editais": {
      defaultColumns: [
        "titulo_projeto",
        "edital",
        "organizacao",
        "projeto",
        "valor_solicitado",
        "data_submissao",
        "status_proposta_edital",
      ],
    },
    "equipe-edital": {
      defaultColumns: [
        "colaborador",
        "integrante",
        "proposta_edital",
        "funcao_projeto",
        "carga_horaria_prevista",
        "valor_previsto",
      ],
    },
    "planos-comunicacao": {
      defaultColumns: [
        "nome_plano",
        "proposta_edital",
        "estrategias_divulgacao",
        "quantidade",
        "data_inicio",
        "data_fim",
        "status_plano_comunicacao",
      ],
    },
    "acoes-divulgacao": {
      defaultColumns: ["nome_acao", "proposta_edital", "projeto", "status"],
    },
    "aplicacao-de-recursos": {
      defaultColumns: [
        "nome_planejamento",
        "proposta_edital",
        "classificacao_planejamento_financeiro",
        "quantidade",
        "valor_unitario",
        "valor_total",
        "data_inicio",
        "data_fim",
        "funcao_equipe",
      ],
    },
    "habilitacoes-propostas": {
      defaultColumns: [
        "proposta_edital",
        "agente",
        "documentos_habilitacao",
        "data_envio_documentacao",
        "status_habilitacao",
      ],
    },
    "resultados-propostas": {
      defaultColumns: [
        "proposta_edital",
        "edital",
        "data_resultado",
        "status_resultado_proposta",
        "pontuacao",
        "recurso_interposto",
      ],
      removedColumns: ["url_relatorio_avaliacao"],
    },
    financeiro: {
      defaultColumns: [
        "data_pagamento",
        "tipo_operacao_financeira",
        "descricao",
        "aplicacao_financeiro",
        "projeto",
        "valor",
        "status_financeiro",
      ],
    },
    "contas-bancarias": {
      defaultColumns: [
        "nome_conta",
        "nome_banco",
        "agencia",
        "numero_conta",
        "tipo_conta_bancaria",
        "status_conta_bancaria",
      ],
    },
    "contas-pagar": {
      defaultColumns: [
        "nome_conta_pagar",
        "nome_credor",
        "classificacao_conta_pagar",
        "data_competencia",
        "data_vencimento",
        "valor_a_pagar",
        "forma_pagamento",
        "status_financeiro",
      ],
    },
    "contas-receber": {
      defaultColumns: [
        "nome_conta_receber",
        "nome_pagador",
        "classificacao_conta_receber",
        "data_competencia",
        "data_vencimento",
        "valor_a_receber",
        "forma_pagamento",
        "status_financeiro",
      ],
    },
    "transferencias-bancarias": {
      defaultColumns: [
        "nome_transferencia",
        "conta_origem",
        "conta_destino",
        "data_transferencia",
        "valor_transferencia",
        "forma_pagamento",
        "status_transferencia_bancaria",
      ],
    },
    "prestacoes-metas": {
      defaultColumns: [
        "titulo_meta",
        "quantidade_executada",
        "percentual_executado",
        "status_cumprimento_meta",
      ],
    },
    "prestacoes-contas": {
      defaultColumns: [
        "proposta_edital",
        "agente",
        "data_entrega",
        "metas_avaliadas",
        "produtos_gerados",
        "status_prestacao_contas",
      ],
    },
    patrimonios: {
      defaultColumns: [
        "numero_patrimonio",
        "nome_patrimonio",
        "tipo_patrimonio",
        "data_aquisicao",
        "valor_patrimonio",
        "estado_conservacao",
        "status_patrimonio",
      ],
    },
    emprestimos: {
      defaultColumns: [
        "patrimonio",
        "destinatario_externo",
        "colaborador",
        "participante",
        "integrante",
        "data_emprestimo",
        "data_prevista_devolucao",
        "estado_conservacao",
        "estado_devolucao",
        "status_emprestimo",
      ],
    },
  };

const SLUG_ALIASES: Record<string, string> = {
  organizacoes: "organizacao",
  participantes: "participantes-geral",
  participante: "participantes-geral",
  "agentes-culturais": "agentes",
  "plano-aula": "planos-aula",
  "plano-de-aula": "planos-aula",
  "planos-de-aula": "planos-aula",
  presenca: "presencas",
  "plano-comunicacao": "planos-comunicacao",
  "propostas-edital": "propostas-editais",
  habilitacao: "habilitacoes-propostas",
  habilitacoes: "habilitacoes-propostas",
  "planejamento-financeiro": "aplicacao-de-recursos",
  "planejamentos-financeiros": "aplicacao-de-recursos",
  "conta-bancaria": "contas-bancarias",
  "conta-pagar": "contas-pagar",
  "conta-receber": "contas-receber",
  "transferencia-bancaria": "transferencias-bancarias",
  "prestacao-metas": "prestacoes-metas",
  "prestacao-contas": "prestacoes-contas",
  patrimonio: "patrimonios",
};

/** Campos de pesquisa essenciais; a tabela continua oferecendo todas as colunas. */
export const GENERIC_REPORT_ESSENTIAL_FILTERS: Record<
  string,
  readonly string[]
> = {
  organizacao: [],
  diretoria: [
    "nome_completo",
    "genero",
    "raca_cor",
    "tipo_deficiencia",
    "bairro",
    "logradouro",
    "cidade",
    "estado",
    "cargo_diretoria",
    "status_diretoria",
    "data_inicio_mandato",
    "data_fim_mandato",
  ],
  documentos: [
    "tipo_documento",
    "orgao_emissor",
    "status_documento",
    "data_validade",
  ],
  agentes: [],
  colaboradores: [
    "nome_completo",
    "genero",
    "raca_cor",
    "tipo_deficiencia",
    "bairro",
    "logradouro",
    "cidade",
    "estado",
    "funcao_colaborador",
    "tipo_vinculo",
    "status",
    "data_inicio_vinculo",
    "data_fim_vinculo",
  ],
  integrantes: [
    "tipo_pessoa_integrante",
    "nome_completo",
    "genero",
    "raca_cor",
    "tipo_deficiencia",
    "bairro",
    "logradouro",
    "cidade",
    "estado",
    "funcao_integrante",
    "tipo_vinculo_integrante",
    "status",
    "data_entrada",
    "data_saida",
  ],
  "participantes-geral": [
    "nome_completo",
    "genero",
    "raca_cor",
    "faixa_renda",
    "possui_deficiencia",
    "possui_cadunico",
    "possui_bolsa_familia",
    "tipo_neurodivergencias",
    "tipo_deficiencias",
    "bairro",
    "logradouro",
    "cidade",
    "estado",
    "status",
    "status_matricula",
    "atividades",
    "turmas",
  ],
  curriculos: ["colaborador", "tipo_secao_curriculo"],
  projetos: [
    "nome_projeto",
    "area_atuacao",
    "origem_projeto",
    "data_inicio",
    "data_fim",
    "status",
    "colaboradores",
  ],
  "metas-projeto": ["projeto", "proposta_edital", "titulo_meta"],
  cronogramas: [
    "status_cronograma",
    "data_inicio_etapa",
    "data_fim_etapa",
    "etapa_cronograma",
    "nome_etapa",
    "projeto",
    "tipo_vinculo",
    "atividade",
    "evento_cultural",
    "acao_divulgacao",
  ],
  atividades: [
    "projeto",
    "nome_atividade",
    "data_inicio",
    "data_fim",
    "tipo_atividade",
    "status",
    "colaboradores",
  ],
  "planos-aula": [
    "atividade",
    "turmas",
    "nome_plano_aula",
    "data_inicio",
    "data_fim",
    "aula_reposicao",
    "status_plano_aula",
  ],
  presencas: [
    "participante",
    "atividade",
    "turma",
    "status_presenca",
    "data_presenca",
  ],
  "eventos-culturais": [
    "projeto",
    "nome_evento",
    "tipo_evento",
    "data_evento",
    "data_fim",
    "status",
    "colaboradores",
  ],
  evidencias: [
    "titulo_evidencia",
    "tipo_vinculo_evidencia",
    "projeto",
    "proposta_edital",
    "situacao",
  ],
  editais: [
    "nome_edital",
    "orgao_responsavel",
    "status_edital",
    "data_encerramento",
  ],
  "propostas-editais": ["titulo_projeto", "edital", "status_proposta_edital"],
  "equipe-edital": [
    "proposta_edital",
    "colaborador",
    "integrante",
    "funcao_projeto",
  ],
  "planos-comunicacao": [
    "nome_plano",
    "proposta_edital",
    "status_plano_comunicacao",
    "data_inicio",
  ],
  "acoes-divulgacao": ["nome_acao", "proposta_edital", "projeto", "status"],
  "aplicacao-de-recursos": [
    "nome_planejamento",
    "proposta_edital",
    "classificacao_planejamento_financeiro",
    "data_inicio",
  ],
  "habilitacoes-propostas": ["proposta_edital", "agente", "status_habilitacao"],
  "resultados-propostas": [
    "proposta_edital",
    "edital",
    "status_resultado_proposta",
  ],
  financeiro: [
    "descricao",
    "tipo_operacao_financeira",
    "projeto",
    "status_financeiro",
    "data_pagamento",
  ],
  "contas-bancarias": [
    "nome_conta",
    "nome_banco",
    "tipo_conta_bancaria",
    "status_conta_bancaria",
  ],
  "contas-pagar": [
    "nome_conta_pagar",
    "nome_credor",
    "status_financeiro",
    "data_vencimento",
  ],
  "contas-receber": [
    "nome_conta_receber",
    "nome_pagador",
    "status_financeiro",
    "data_vencimento",
  ],
  "transferencias-bancarias": [
    "nome_transferencia",
    "conta_origem",
    "conta_destino",
    "status_transferencia_bancaria",
    "data_transferencia",
  ],
  "prestacoes-metas": ["titulo_meta", "status_cumprimento_meta"],
  "prestacoes-contas": [
    "proposta_edital",
    "agente",
    "status_prestacao_contas",
    "data_entrega",
  ],
  patrimonios: [
    "projeto_origem",
    "numero_patrimonio",
    "nome_patrimonio",
    "tipo_patrimonio",
    "marca",
    "modelo",
    "data_aquisicao",
    "estado_conservacao",
    "status_patrimonio",
  ],
  emprestimos: [
    "patrimonio",
    "status_emprestimo",
    "data_emprestimo",
    "data_prevista_devolucao",
  ],
  "trajetorias-culturais": ["colaborador"],
  turmas: [
    "atividade",
    "nivel_turma",
    "nome_turma",
    "dias",
    "horario_inicio",
    "horario_fim",
    "status",
  ],
};

const CUSTOM_REPORT_FILTERS = new Set([
  "organizacao",
  "agentes",
  "diretoria",
  "colaboradores",
  "integrantes",
  "participantes-geral",
  "projetos",
  "metas-projeto",
  "cronogramas",
  "atividades",
  "planos-aula",
  "eventos-culturais",
  "turmas",
  "patrimonios",
]);
const REPORT_COLLECTION_FILTERS: Record<string, readonly string[]> = {
  "eventos-culturais": ["projeto", "colaboradores"],
  "planos-aula": ["turmas"],
  turmas: ["dias"],
  atividades: ["colaboradores"],
  projetos: ["area_atuacao", "colaboradores"],
  "participantes-geral": ["tipo_neurodivergencias", "tipo_deficiencias"],
};
export function getEssentialGenericReportFilters<T extends BackendColumnMeta>(
  slug: string,
  columns: T[],
): T[] {
  const normalizedSlug = SLUG_ALIASES[slug] ?? slug;
  const keys =
    GENERIC_REPORT_ESSENTIAL_FILTERS[normalizedSlug] ??
    GENERIC_REPORT_COLUMNS[normalizedSlug]?.defaultColumns.slice(0, 4) ??
    columns.slice(0, 4).map((column) => column.chave);
  const byKey = new Map(columns.map((column) => [column.chave, column]));
  return keys.flatMap((key) => {
    const column = byKey.get(key);
    if (!column) return [];
    const label = reportFieldLabel(
      normalizedSlug,
      key,
      (column as T & { label?: string }).label ?? key,
    );
    if (!CUSTOM_REPORT_FILTERS.has(normalizedSlug))
      return [{ ...column, label }];
    return [
      {
        ...column,
        label,
        filterType: key.startsWith("data_")
          ? ("date" as const)
          : key.startsWith("horario_")
            ? ("time" as const)
            : ("multi" as const),
        valueSeparator: REPORT_COLLECTION_FILTERS[normalizedSlug]?.includes(key)
          ? ", "
          : undefined,
      },
    ];
  });
}

function isTechnicalColumn(column: BackendColumnMeta): boolean {
  const key = column.chave.toLowerCase();
  const type = column.tipo?.toLowerCase();
  return (
    key === "id" ||
    key.endsWith("_id") ||
    type === "json" ||
    type === "objeto" ||
    type === "object"
  );
}

export function configureGenericReportColumns<T extends BackendColumnMeta>(
  slug: string,
  backendColumns: T[],
  rows: Array<Record<string, unknown>> = [],
): T[] {
  const normalizedSlug = SLUG_ALIASES[slug] ?? slug;
  const config = GENERIC_REPORT_COLUMNS[normalizedSlug];
  const removed = new Set(config?.removedColumns ?? []);
  const available = backendColumns.filter((column) => {
    if (removed.has(column.chave) || isTechnicalColumn(column)) return false;
    return !rows.some((row) => {
      const value = row[column.chave];
      return value !== null && value !== undefined && typeof value === "object";
    });
  });

  if (!config) return available;

  const byKey = new Map(available.map((column) => [column.chave, column]));
  const defaults = config.defaultColumns
    .map((key) => byKey.get(key))
    .filter((column): column is T => Boolean(column));
  const defaultKeys = new Set(defaults.map((column) => column.chave));
  const optional = available.filter((column) => !defaultKeys.has(column.chave));
  return [...defaults, ...optional];
}

export function isDefaultGenericReportColumn(
  slug: string,
  key: string,
  backendDefault = true,
): boolean {
  const normalizedSlug = SLUG_ALIASES[slug] ?? slug;
  const config = GENERIC_REPORT_COLUMNS[normalizedSlug];
  return config ? config.defaultColumns.includes(key) : backendDefault;
}

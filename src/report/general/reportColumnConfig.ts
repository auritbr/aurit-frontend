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
        "forma_comprovacao",
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

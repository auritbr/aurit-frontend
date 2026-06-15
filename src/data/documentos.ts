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

export type StatusDocumento =
  | "PENDENTE"
  | "ATUALIZADO"
  | "VENCIDO"
  | "NAO_SE_APLICA"
  | "EM_ANALISE"
  | "NECESSITA_REVISAO";

export const statusDocumentoLabels: Record<StatusDocumento, string> = {
  PENDENTE: "Pendente",
  ATUALIZADO: "Atualizado",
  VENCIDO: "Vencido",
  NAO_SE_APLICA: "Não se Aplica",
  EM_ANALISE: "Em Análise",
  NECESSITA_REVISAO: "Necessita Revisão",
};

export const tipoDocumentoValues = [
  "CNPJ",
  "COMPROVANTE_INSCRICAO_SITUACAO_CADASTRAL_CNPJ",
  "QSA_QUADRO_SOCIETARIO_ADMINISTRADORES",
  "NIRE",
  "INSCRICAO_ESTADUAL",
  "INSCRICAO_MUNICIPAL",
  "ALVARA_FUNCIONAMENTO",
  "LICENCA_FUNCIONAMENTO",
  "CERTIFICADO_CONDICAO_MICROEMPREENDEDOR_INDIVIDUAL",
  "CONTRATO_SOCIAL",
  "REQUERIMENTO_EMPRESARIO",
  "CERTIFICADO_MEI",
  "ESTATUTO_SOCIAL",
  "COPIA_ESTATUTO_SOCIAL_ATUALIZADO",
  "REGIMENTO_INTERNO",
  "ATA_FUNDACAO",
  "ATA_CONSTITUICAO",
  "ATA_ELEICAO_DIRETORIA",
  "ATA_POSSE_DIRETORIA",
  "ATA_ALTERACAO_ESTATUTARIA",
  "ATA_ASSEMBLEIA_GERAL",
  "ATA_ASSEMBLEIA_ORDINARIA",
  "ATA_ASSEMBLEIA_EXTRAORDINARIA",
  "ATA_APROVACAO_CONTAS",
  "ATA_APROVACAO_PLANO_TRABALHO",
  "ATA_CONSELHO_FISCAL",
  "ATA_CONSELHO_ADMINISTRATIVO",
  "TERMO_POSSE_DIRETORIA",
  "RELACAO_DIRETORIA_ATUAL",
  "RELACAO_CONSELHO_FISCAL",
  "RELACAO_ASSOCIADOS",
  "LIVRO_ATAS",
  "LIVRO_REGISTRO_ASSOCIADOS",
  "DECLARACAO_NAO_REMUNERACAO_DIRETORIA",
  "DECLARACAO_REMUNERACAO_DIRETORIA",
  "DECLARACAO_INEXISTENCIA_CONFLITO_INTERESSES",
  "CPF_REPRESENTANTE",
  "RG_REPRESENTANTE",
  "CNH_REPRESENTANTE",
  "DOCUMENTO_IDENTIFICACAO_REPRESENTANTE",
  "DOCUMENTO_IDENTIFICACAO_REPRESENTANTE_FRENTE_VERSO",
  "COMPROVANTE_ENDERECO_REPRESENTANTE",
  "COMPROVANTE_RESIDENCIA_REPRESENTANTE",
  "CERTIDAO_NASCIMENTO_REPRESENTANTE",
  "CERTIDAO_CASAMENTO_REPRESENTANTE",
  "PROCURACAO_REPRESENTANTE",
  "TERMO_NOMEACAO_REPRESENTANTE",
  "DECLARACAO_REPRESENTANTE_LEGAL",
  "CARTA_INDICACAO_REPRESENTANTE_COLETIVO",
  "COMPROVANTE_ENDERECO",
  "COMPROVANTE_SEDE",
  "CONTRATO_LOCACAO",
  "TERMO_CESSAO_USO_ESPACO",
  "DECLARACAO_CESSAO_ESPACO",
  "DECLARACAO_FUNCIONAMENTO_NO_ENDERECO",
  "IPTU_IMOVEL",
  "CONTA_AGUA",
  "CONTA_LUZ",
  "CONTA_TELEFONE_INTERNET",
  "CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS",
  "CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_MUNICIPAIS",
  "CERTIDAO_DEBITOS_TRIBUTARIOS_FAZENDA_ESTADUAL",
  "CERTIDAO_NEGATIVA_DEBITOS_ESTADUAIS",
  "CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_ESTADUAIS",
  "CERTIDAO_DEBITOS_TRIBUTARIOS_FEDERAIS_DIVIDA_ATIVA_UNIAO",
  "CERTIDAO_NEGATIVA_DEBITOS_FEDERAIS",
  "CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_FEDERAIS",
  "CERTIDAO_REGULARIDADE_FISCAL_RECEITA_FEDERAL_PGFN",
  "CERTIDAO_DIVIDA_ATIVA_MUNICIPAL",
  "CERTIDAO_DIVIDA_ATIVA_ESTADUAL",
  "CERTIDAO_DIVIDA_ATIVA_UNIAO",
  "COMPROVANTE_SITUACAO_FISCAL",
  "RELATORIO_SITUACAO_FISCAL",
  "CERTIDAO_CADIN_MUNICIPAL",
  "CERTIDAO_CADIN_ESTADUAL",
  "CERTIDAO_CADIN_FEDERAL",
  "CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS",
  "CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_TRABALHISTAS",
  "CERTIDAO_REGULARIDADE_FGTS",
  "CERTIFICADO_REGULARIDADE_FGTS",
  "COMPROVANTE_ESOCIAL",
  "COMPROVANTE_DCTFWEB",
  "COMPROVANTE_GFIP_SEFIP",
  "COMPROVANTE_INSS",
  "GUIA_RECOLHIMENTO_FGTS",
  "GUIA_RECOLHIMENTO_INSS",
  "CERTIDAO_FALENCIA_E_CONCORDATA",
  "CERTIDAO_FALENCIA_RECUPERACAO_JUDICIAL_EXTRAJUDICIAL",
  "CERTIDAO_DISTRIBUICAO_CIVEL",
  "CERTIDAO_DISTRIBUICAO_CRIMINAL",
  "CERTIDAO_EXECUCAO_FISCAL",
  "CERTIDAO_IMPROBIDADE_ADMINISTRATIVA_CNJ",
  "CERTIDAO_INIDONEIDADE_TCU",
  "CERTIDAO_CEIS",
  "CERTIDAO_CNEP",
  "CERTIDAO_CORRECIONAL_CGU",
  "DECLARACAO_INEXISTENCIA_IMPEDIMENTO",
  "DECLARACAO_NAO_INIDONEIDADE",
  "DECLARACAO_NAO_EMPREGAR_MENOR",
  "DECLARACAO_CUMPRIMENTO_ARTIGO_7_CONSTITUICAO",
  "UTILIDADE_PUBLICA_MUNICIPAL",
  "UTILIDADE_PUBLICA_ESTADUAL",
  "UTILIDADE_PUBLICA_FEDERAL",
  "DECLARACAO_UTILIDADE_PUBLICA",
  "TITULO_UTILIDADE_PUBLICA",
  "OSCIP",
  "CERTIFICADO_OSCIP",
  "ORGANIZACAO_SOCIAL",
  "CERTIFICADO_ORGANIZACAO_SOCIAL",
  "CERTIFICADO_PONTO_DE_CULTURA",
  "CERTIFICADO_PONTAO_DE_CULTURA",
  "CERTIFICADO_CULTURA_VIVA",
  "COMPROVANTE_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA",
  "COMPROVANTE_SOLICITACAO_INGRESSO_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA",
  "CERTIFICADO_ASSISTENCIA_SOCIAL",
  "CERTIFICADO_ENTIDADE_BENEFICENTE_ASSISTENCIA_SOCIAL",
  "CEBAS",
  "CERTIFICADO_CEBAS",
  "COMPROVANTE_PROTOCOLO_CEBAS",
  "COMPROVANTE_RENOVACAO_CEBAS",
  "COMPROVANTE_CNEAS",
  "INSCRICAO_CMAS",
  "COMPROVANTE_INSCRICAO_CMAS",
  "RENOVACAO_INSCRICAO_CMAS",
  "INSCRICAO_CMDCA",
  "COMPROVANTE_INSCRICAO_CMDCA",
  "INSCRICAO_CONSELHO_IDOSO",
  "COMPROVANTE_INSCRICAO_CONSELHO_IDOSO",
  "INSCRICAO_CONSELHO_CULTURA",
  "COMPROVANTE_INSCRICAO_CONSELHO_CULTURA",
  "INSCRICAO_CONSELHO_DIREITOS_PESSOA_DEFICIENCIA",
  "INSCRICAO_CONSELHO_SAUDE",
  "INSCRICAO_CONSELHO_EDUCACAO",
  "CADASTUR",
  "CNEA_CADASTRO_NACIONAL_ENTIDADES_AMBIENTALISTAS",
  "PORTFOLIO_INSTITUCIONAL",
  "PORTFOLIO_CULTURAL",
  "CURRICULO_INSTITUCIONAL",
  "HISTORICO_INSTITUCIONAL",
  "RELATORIO_ATIVIDADES",
  "RELATORIO_ATIVIDADES_12_MESES",
  "RELATORIO_ATIVIDADES_24_MESES",
  "RELATORIO_ATIVIDADES_ANUAL",
  "COMPROVANTE_ATUACAO_CULTURAL",
  "COMPROVANTE_ATUACAO_COMUNITARIA",
  "CARTA_RECOMENDACAO",
  "CARTA_RECOMENDACAO_COMUNITARIA",
  "CARTA_ANUENCIA",
  "CARTA_APOIO",
  "DECLARACAO_RECONHECIMENTO_COMUNIDADE",
  "DECLARACAO_EXISTENCIA_COLETIVO",
  "AUTODECLARACAO_COLETIVO",
  "LISTA_INTEGRANTES_COLETIVO",
  "DECLARACAO_ANUENCIA_INTEGRANTES_COLETIVO",
  "TERMO_COMPROMETIMENTO_PNCV",
  "TERMO_VERACIDADE_INFORMACOES",
  "TERMO_ADESAO_PNCV",
  "TERMO_USO_PRIVACIDADE_PNCV",
  "FORMULARIO_INSCRICAO_CULTURA_VIVA",
  "COMPROVANTE_INSCRICAO_CULTURA_VIVA",
  "COMPROVANTE_MAPA_CULTURA",
  "PERFIL_MAPA_CULTURA",
  "CLIPPING",
  "FOTOS_ATIVIDADES",
  "VIDEOS_ATIVIDADES",
  "LINKS_COMPROBATORIOS",
  "MATERIAL_GRAFICO_DIVULGACAO",
  "RELEASE_INSTITUCIONAL",
  "RELEASE_PROJETO",
  "FICHA_TECNICA_PROJETO",
  "CURRICULO_EQUIPE_TECNICA",
  "MINI_BIO_EQUIPE",
  "COMPROVANTE_REALIZACAO_EVENTO",
  "CERTIFICADOS_OFICINAS",
  "DECLARACAO_PARTICIPACAO_EVENTOS",
  "PRESTACAO_CONTAS_PROJETO_CULTURAL",
  "EDITAL",
  "PROPOSTA_EDITAL",
  "FORMULARIO_INSCRICAO_EDITAL",
  "PLANO_TRABALHO",
  "PLANO_ACAO",
  "PLANO_APLICACAO_RECURSOS",
  "PLANO_EXECUCAO",
  "CRONOGRAMA_EXECUCAO",
  "CRONOGRAMA_FISICO_FINANCEIRO",
  "ORCAMENTO_PROJETO",
  "PLANILHA_ORCAMENTARIA",
  "MEMORIA_CALCULO_ORCAMENTO",
  "PROJETO_TECNICO",
  "PROJETO_BASICO",
  "TERMO_REFERENCIA",
  "TERMO_FOMENTO",
  "TERMO_COLABORACAO",
  "ACORDO_COOPERACAO",
  "TERMO_PARCERIA",
  "CONVENIO",
  "CONTRATO_REPASSE",
  "TERMO_ADITIVO",
  "PLANO_COMUNICACAO",
  "PLANO_MOBILIZACAO",
  "PLANO_ACESSIBILIDADE",
  "DECLARACAO_ACESSIBILIDADE",
  "DECLARACAO_CONTRAPARTIDA",
  "DECLARACAO_CAPACIDADE_TECNICA_OPERACIONAL",
  "DECLARACAO_CAPACIDADE_ADMINISTRATIVA",
  "DECLARACAO_CAPACIDADE_FINANCEIRA",
  "DECLARACAO_EXPERIENCIA_PREVIA",
  "COMPROVANTE_EXPERIENCIA_PREVIA",
  "DECLARACAO_CIENCIA_EDITAL",
  "DECLARACAO_ACEITE_CONDICOES_EDITAL",
  "DECLARACAO_RESPONSABILIDADE_INFORMACOES",
  "RESULTADO_HABILITACAO",
  "RESULTADO_CLASSIFICACAO",
  "RESULTADO_FINAL",
  "RECURSO_ADMINISTRATIVO",
  "CONTRARRAZOES_RECURSO",
  "PARECER_TECNICO",
  "PARECER_JURIDICO",
  "EXTRATO_ZERADO_CONTA_BANCARIA",
  "EXTRATO_BANCARIO",
  "EXTRATO_CONTA_CORRENTE",
  "EXTRATO_CONTA_POUPANCA",
  "COMPROVANTE_CONTA_BANCARIA",
  "DECLARACAO_CONTA_BANCARIA",
  "TERMO_ABERTURA_CONTA_BANCARIA",
  "COMPROVANTE_AGENCIA_CONTA",
  "RELATORIO_FINANCEIRO",
  "RELATORIO_EXECUCAO_FINANCEIRA",
  "BALANCO_PATRIMONIAL",
  "BALANCETE",
  "DEMONSTRACAO_RESULTADO_EXERCICIO",
  "DRE",
  "DEMONSTRACAO_FLUXO_CAIXA",
  "LIVRO_DIARIO",
  "LIVRO_RAZAO",
  "RECIBO",
  "NOTA_FISCAL",
  "CUPOM_FISCAL",
  "COMPROVANTE_PAGAMENTO",
  "COMPROVANTE_TRANSFERENCIA",
  "COMPROVANTE_PIX",
  "COMPROVANTE_DEPOSITO",
  "COMPROVANTE_DESPESA",
  "RELACAO_PAGAMENTOS",
  "RELACAO_RECEITAS",
  "RELACAO_DESPESAS",
  "CONCILIACAO_BANCARIA",
  "RELATORIO_PRESTACAO_CONTAS",
  "DEMONSTRATIVO_RECEITAS_DESPESAS",
  "DECLARACAO_ISENCAO_IMPOSTO_RENDA",
  "DECLARACAO_IMPOSTO_RENDA_PESSOA_JURIDICA",
  "ECF_ESCRITURACAO_CONTABIL_FISCAL",
  "ECD_ESCRITURACAO_CONTABIL_DIGITAL",
  "PLANO_ASSISTENCIA_SOCIAL",
  "PLANO_TRABALHO_ASSISTENCIA_SOCIAL",
  "PLANO_ACAO_ASSISTENCIA_SOCIAL",
  "RELATORIO_ATIVIDADES_ASSISTENCIA_SOCIAL",
  "RELATORIO_SOCIOASSISTENCIAL",
  "COMPROVANTE_OFERTA_SOCIOASSISTENCIAL",
  "INSCRICAO_SERVICO_PROGRAMA_PROJETO_BENEFICIO_SOCIOASSISTENCIAL",
  "DECLARACAO_GRATUIDADE_ATENDIMENTO",
  "DECLARACAO_UNIVERSALIDADE_ATENDIMENTO",
  "DECLARACAO_CONTINUIDADE_ATENDIMENTO",
  "DECLARACAO_PLANEJAMENTO_PERMANENCIA",
  "COMPROVANTE_VINCULO_SUAS",
  "COMPROVANTE_CADASTRO_REDE_SOCIOASSISTENCIAL",
  "CONTRATO_TRABALHO",
  "CONTRATO_PRESTACAO_SERVICOS",
  "TERMO_VOLUNTARIADO",
  "TERMO_ADESAO_VOLUNTARIO",
  "FICHA_CADASTRAL_COLABORADOR",
  "DOCUMENTO_IDENTIFICACAO_COLABORADOR",
  "CPF_COLABORADOR",
  "COMPROVANTE_ENDERECO_COLABORADOR",
  "CURRICULO_COLABORADOR",
  "CERTIFICADO_FORMACAO_COLABORADOR",
  "DECLARACAO_VINCULO_COLABORADOR",
  "FOLHA_PAGAMENTO",
  "HOLERITE",
  "RECIBO_PAGAMENTO_AUTONOMO",
  "RPA",
  "CONTRATO_OFICINEIRO",
  "TERMO_RESPONSABILIDADE_OFICINEIRO",
  "FICHA_INSCRICAO_PARTICIPANTE",
  "FICHA_MATRICULA_PARTICIPANTE",
  "DOCUMENTO_IDENTIFICACAO_PARTICIPANTE",
  "CPF_PARTICIPANTE",
  "CERTIDAO_NASCIMENTO_PARTICIPANTE",
  "COMPROVANTE_ENDERECO_PARTICIPANTE",
  "AUTORIZACAO_RESPONSAVEL_LEGAL",
  "DOCUMENTO_RESPONSAVEL_LEGAL",
  "TERMO_USO_IMAGEM",
  "TERMO_AUTORIZACAO_VOZ_IMAGEM",
  "TERMO_CONSENTIMENTO_LGPD",
  "LISTA_PRESENCA",
  "CONTROLE_FREQUENCIA",
  "DECLARACAO_PARTICIPACAO",
  "CERTIFICADO_PARTICIPACAO",
  "AUTORIZACAO_EVENTO",
  "ALVARA_EVENTO",
  "LICENCA_EVENTO",
  "OFICIO_SOLICITACAO_ESPACO",
  "AUTORIZACAO_USO_ESPACO",
  "TERMO_CESSAO_ESPACO_EVENTO",
  "PLANO_SEGURANCA_EVENTO",
  "AVCB",
  "CLCB",
  "LAUDO_CORPO_BOMBEIROS",
  "AUTORIZACAO_ECAD",
  "COMPROVANTE_PAGAMENTO_ECAD",
  "AUTORIZACAO_DIREITOS_AUTORAIS",
  "TERMO_CESSAO_DIREITOS_AUTORAIS",
  "TERMO_CESSAO_DIREITOS_IMAGEM",
  "CLASSIFICACAO_INDICATIVA",
  "LAUDO_ACESSIBILIDADE",
  "RELATORIO_EVENTO",
  "REGISTRO_FOTOGRAFICO_EVENTO",
  "REGISTRO_AUDIOVISUAL_EVENTO",
  "INVENTARIO_PATRIMONIAL",
  "TERMO_DOACAO",
  "TERMO_RECEBIMENTO_BEM",
  "TERMO_EMPRESTIMO_BEM",
  "TERMO_DEVOLUCAO_BEM",
  "NOTA_FISCAL_BEM",
  "COMPROVANTE_AQUISICAO_BEM",
  "RELACAO_BENS_PATRIMONIAIS",
  "TERMO_RESPONSABILIDADE_PATRIMONIAL",
  "LAUDO_AVALIACAO_BEM",
  "POLITICA_PRIVACIDADE",
  "TERMO_USO",
  "POLITICA_PROTECAO_DADOS",
  "POLITICA_SEGURANCA_INFORMACAO",
  "TERMO_CONFIDENCIALIDADE",
  "TERMO_CONSENTIMENTO_DADOS",
  "RELATORIO_IMPACTO_PROTECAO_DADOS",
  "DECLARACAO_TRATAMENTO_DADOS",
  "OFICIO",
  "REQUERIMENTO",
  "DECLARACAO",
  "COMUNICADO",
  "MEMORANDO",
  "PARECER",
  "RELATORIO",
  "CERTIFICADO",
  "COMPROVANTE",
  "OUTROS",
] as const;

export type TipoDocumento = (typeof tipoDocumentoValues)[number];

export const tipoDocumentoLabels: Record<TipoDocumento, string> = {
  CNPJ: "CNPJ",
  COMPROVANTE_INSCRICAO_SITUACAO_CADASTRAL_CNPJ: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
  QSA_QUADRO_SOCIETARIO_ADMINISTRADORES: "QSA - Quadro de Sócios e Administradores",
  NIRE: "NIRE",
  INSCRICAO_ESTADUAL: "Inscrição Estadual",
  INSCRICAO_MUNICIPAL: "Inscrição Municipal",
  ALVARA_FUNCIONAMENTO: "Alvará Funcionamento",
  LICENCA_FUNCIONAMENTO: "Licença Funcionamento",
  CERTIFICADO_CONDICAO_MICROEMPREENDEDOR_INDIVIDUAL: "Certificado da Condição de Microempreendedor Individual",
  CONTRATO_SOCIAL: "Contrato Social",
  REQUERIMENTO_EMPRESARIO: "Requerimento Empresário",
  CERTIFICADO_MEI: "Certificado MEI",
  ESTATUTO_SOCIAL: "Estatuto Social",
  COPIA_ESTATUTO_SOCIAL_ATUALIZADO: "Cópia do Estatuto Social Atualizado",
  REGIMENTO_INTERNO: "Regimento Interno",
  ATA_FUNDACAO: "Ata Fundação",
  ATA_CONSTITUICAO: "Ata Constituição",
  ATA_ELEICAO_DIRETORIA: "Ata de Eleição da Diretoria",
  ATA_POSSE_DIRETORIA: "Ata de Posse da Diretoria",
  ATA_ALTERACAO_ESTATUTARIA: "Ata de Alteração Estatutária",
  ATA_ASSEMBLEIA_GERAL: "Ata Assembleia Geral",
  ATA_ASSEMBLEIA_ORDINARIA: "Ata Assembleia Ordinária",
  ATA_ASSEMBLEIA_EXTRAORDINARIA: "Ata Assembleia Extraordinaria",
  ATA_APROVACAO_CONTAS: "Ata de Aprovação de Contas",
  ATA_APROVACAO_PLANO_TRABALHO: "Ata de Aprovação do Plano de Trabalho",
  ATA_CONSELHO_FISCAL: "Ata Conselho Fiscal",
  ATA_CONSELHO_ADMINISTRATIVO: "Ata Conselho Administrativo",
  TERMO_POSSE_DIRETORIA: "Termo de Posse da Diretoria",
  RELACAO_DIRETORIA_ATUAL: "Relação da Diretoria Atual",
  RELACAO_CONSELHO_FISCAL: "Relação do Conselho Fiscal",
  RELACAO_ASSOCIADOS: "Relação Associados",
  LIVRO_ATAS: "Livro Atas",
  LIVRO_REGISTRO_ASSOCIADOS: "Livro de Registro de Associados",
  DECLARACAO_NAO_REMUNERACAO_DIRETORIA: "Declaração Nao Remuneração Diretoria",
  DECLARACAO_REMUNERACAO_DIRETORIA: "Declaração Remuneração Diretoria",
  DECLARACAO_INEXISTENCIA_CONFLITO_INTERESSES: "Declaração de Inexistência de Conflito de Interesses",
  CPF_REPRESENTANTE: "CPF do Representante",
  RG_REPRESENTANTE: "RG do Representante",
  CNH_REPRESENTANTE: "CNH do Representante",
  DOCUMENTO_IDENTIFICACAO_REPRESENTANTE: "Documento de Identificação do Representante",
  DOCUMENTO_IDENTIFICACAO_REPRESENTANTE_FRENTE_VERSO: "Documento de Identificação do Representante (Frente e Verso)",
  COMPROVANTE_ENDERECO_REPRESENTANTE: "Comprovante de Endereço do Representante",
  COMPROVANTE_RESIDENCIA_REPRESENTANTE: "Comprovante de Residência do Representante",
  CERTIDAO_NASCIMENTO_REPRESENTANTE: "Certidão de Nascimento do Representante",
  CERTIDAO_CASAMENTO_REPRESENTANTE: "Certidão de Casamento do Representante",
  PROCURACAO_REPRESENTANTE: "Procuração do Representante",
  TERMO_NOMEACAO_REPRESENTANTE: "Termo de Nomeação do Representante",
  DECLARACAO_REPRESENTANTE_LEGAL: "Declaração do Representante Legal",
  CARTA_INDICACAO_REPRESENTANTE_COLETIVO: "Carta de Indicação do Representante do Coletivo",
  COMPROVANTE_ENDERECO: "Comprovante de Endereço",
  COMPROVANTE_SEDE: "Comprovante Sede",
  CONTRATO_LOCACAO: "Contrato Locação",
  TERMO_CESSAO_USO_ESPACO: "Termo de Cessão de Uso de Espaço",
  DECLARACAO_CESSAO_ESPACO: "Declaração de Cessão de Espaço",
  DECLARACAO_FUNCIONAMENTO_NO_ENDERECO: "Declaração de Funcionamento no Endereço",
  IPTU_IMOVEL: "IPTU Imovel",
  CONTA_AGUA: "Conta de Água",
  CONTA_LUZ: "Conta de Luz",
  CONTA_TELEFONE_INTERNET: "Conta de Telefone/Internet",
  CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS: "Certidão Negativa de Débitos Municipais",
  CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_MUNICIPAIS: "Certidão Positiva com Efeitos de Negativa de Débitos Municipais",
  CERTIDAO_DEBITOS_TRIBUTARIOS_FAZENDA_ESTADUAL: "Certidão de Débitos Tributários da Fazenda Estadual",
  CERTIDAO_NEGATIVA_DEBITOS_ESTADUAIS: "Certidão Negativa de Débitos Estaduais",
  CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_ESTADUAIS: "Certidão Positiva com Efeitos de Negativa de Débitos Estaduais",
  CERTIDAO_DEBITOS_TRIBUTARIOS_FEDERAIS_DIVIDA_ATIVA_UNIAO: "Certidão de Débitos Tributários Federais e Dívida Ativa da União",
  CERTIDAO_NEGATIVA_DEBITOS_FEDERAIS: "Certidão Negativa de Débitos Federais",
  CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_FEDERAIS: "Certidão Positiva com Efeitos de Negativa de Débitos Federais",
  CERTIDAO_REGULARIDADE_FISCAL_RECEITA_FEDERAL_PGFN: "Certidão de Regularidade Fiscal da Receita Federal e PGFN",
  CERTIDAO_DIVIDA_ATIVA_MUNICIPAL: "Certidão de Dívida Ativa Municipal",
  CERTIDAO_DIVIDA_ATIVA_ESTADUAL: "Certidão de Dívida Ativa Estadual",
  CERTIDAO_DIVIDA_ATIVA_UNIAO: "Certidão de Dívida Ativa da União",
  COMPROVANTE_SITUACAO_FISCAL: "Comprovante de Situação Fiscal",
  RELATORIO_SITUACAO_FISCAL: "Relatório de Situação Fiscal",
  CERTIDAO_CADIN_MUNICIPAL: "Certidão CADIN Municipal",
  CERTIDAO_CADIN_ESTADUAL: "Certidão CADIN Estadual",
  CERTIDAO_CADIN_FEDERAL: "Certidão CADIN Federal",
  CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS: "Certidão Negativa de Débitos Trabalhistas",
  CERTIDAO_POSITIVA_EFEITOS_NEGATIVA_DEBITOS_TRABALHISTAS: "Certidão Positiva com Efeitos de Negativa de Débitos Trabalhistas",
  CERTIDAO_REGULARIDADE_FGTS: "Certidão de Regularidade do FGTS",
  CERTIFICADO_REGULARIDADE_FGTS: "Certificado de Regularidade do FGTS",
  COMPROVANTE_ESOCIAL: "Comprovante eSocial",
  COMPROVANTE_DCTFWEB: "Comprovante DCTFWeb",
  COMPROVANTE_GFIP_SEFIP: "Comprovante GFIP/SEFIP",
  COMPROVANTE_INSS: "Comprovante INSS",
  GUIA_RECOLHIMENTO_FGTS: "Guia de Recolhimento do FGTS",
  GUIA_RECOLHIMENTO_INSS: "Guia de Recolhimento do INSS",
  CERTIDAO_FALENCIA_E_CONCORDATA: "Certidão de Falência e Concordata",
  CERTIDAO_FALENCIA_RECUPERACAO_JUDICIAL_EXTRAJUDICIAL: "Certidão de Falência, Recuperação Judicial e Extrajudicial",
  CERTIDAO_DISTRIBUICAO_CIVEL: "Certidão de Distribuição Cível",
  CERTIDAO_DISTRIBUICAO_CRIMINAL: "Certidão de Distribuição Criminal",
  CERTIDAO_EXECUCAO_FISCAL: "Certidão de Execução Fiscal",
  CERTIDAO_IMPROBIDADE_ADMINISTRATIVA_CNJ: "Certidão de Improbidade Administrativa - CNJ",
  CERTIDAO_INIDONEIDADE_TCU: "Certidão de Inidoneidade - TCU",
  CERTIDAO_CEIS: "Certidão CEIS",
  CERTIDAO_CNEP: "Certidão CNEP",
  CERTIDAO_CORRECIONAL_CGU: "Certidão Correcional - CGU",
  DECLARACAO_INEXISTENCIA_IMPEDIMENTO: "Declaração Inexistência Impedimento",
  DECLARACAO_NAO_INIDONEIDADE: "Declaração de Não Inidoneidade",
  DECLARACAO_NAO_EMPREGAR_MENOR: "Declaração de Não Empregar Menor",
  DECLARACAO_CUMPRIMENTO_ARTIGO_7_CONSTITUICAO: "Declaração de Cumprimento do Artigo 7º da Constituição",
  UTILIDADE_PUBLICA_MUNICIPAL: "Utilidade Pública Municipal",
  UTILIDADE_PUBLICA_ESTADUAL: "Utilidade Pública Estadual",
  UTILIDADE_PUBLICA_FEDERAL: "Utilidade Pública Federal",
  DECLARACAO_UTILIDADE_PUBLICA: "Declaração de Utilidade Pública",
  TITULO_UTILIDADE_PUBLICA: "Título de Utilidade Pública",
  OSCIP: "OSCIP",
  CERTIFICADO_OSCIP: "Certificado OSCIP",
  ORGANIZACAO_SOCIAL: "Organização Social",
  CERTIFICADO_ORGANIZACAO_SOCIAL: "Certificado Organização Social",
  CERTIFICADO_PONTO_DE_CULTURA: "Certificado de Ponto de Cultura",
  CERTIFICADO_PONTAO_DE_CULTURA: "Certificado de Pontão de Cultura",
  CERTIFICADO_CULTURA_VIVA: "Certificado Cultura Viva",
  COMPROVANTE_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA: "Comprovante de Cadastro Nacional de Pontos e Pontões de Cultura",
  COMPROVANTE_SOLICITACAO_INGRESSO_CADASTRO_NACIONAL_PONTOS_PONTOES_CULTURA: "Comprovante de Solicitação de Ingresso no Cadastro Nacional de Pontos e Pontões de Cultura",
  CERTIFICADO_ASSISTENCIA_SOCIAL: "Certificado de Assistência Social",
  CERTIFICADO_ENTIDADE_BENEFICENTE_ASSISTENCIA_SOCIAL: "Certificado de Entidade Beneficente de Assistência Social",
  CEBAS: "CEBAS",
  CERTIFICADO_CEBAS: "Certificado CEBAS",
  COMPROVANTE_PROTOCOLO_CEBAS: "Comprovante Protocolo CEBAS",
  COMPROVANTE_RENOVACAO_CEBAS: "Comprovante Renovação CEBAS",
  COMPROVANTE_CNEAS: "Comprovante CNEAS",
  INSCRICAO_CMAS: "Inscrição no CMAS",
  COMPROVANTE_INSCRICAO_CMAS: "Comprovante de Inscrição no CMAS",
  RENOVACAO_INSCRICAO_CMAS: "Renovação Inscrição CMAS",
  INSCRICAO_CMDCA: "Inscrição no CMDCA",
  COMPROVANTE_INSCRICAO_CMDCA: "Comprovante de Inscrição no CMDCA",
  INSCRICAO_CONSELHO_IDOSO: "Inscrição no Conselho do Idoso",
  COMPROVANTE_INSCRICAO_CONSELHO_IDOSO: "Comprovante de Inscrição no Conselho do Idoso",
  INSCRICAO_CONSELHO_CULTURA: "Inscrição no Conselho de Cultura",
  COMPROVANTE_INSCRICAO_CONSELHO_CULTURA: "Comprovante de Inscrição no Conselho de Cultura",
  INSCRICAO_CONSELHO_DIREITOS_PESSOA_DEFICIENCIA: "Inscrição no Conselho dos Direitos da Pessoa com Deficiência",
  INSCRICAO_CONSELHO_SAUDE: "Inscrição no Conselho de Saúde",
  INSCRICAO_CONSELHO_EDUCACAO: "Inscrição no Conselho de Educação",
  CADASTUR: "CADASTUR",
  CNEA_CADASTRO_NACIONAL_ENTIDADES_AMBIENTALISTAS: "CNEA - Cadastro Nacional de Entidades Ambientalistas",
  PORTFOLIO_INSTITUCIONAL: "Portfólio Institucional",
  PORTFOLIO_CULTURAL: "Portfólio Cultural",
  CURRICULO_INSTITUCIONAL: "Currículo Institucional",
  HISTORICO_INSTITUCIONAL: "Histórico Institucional",
  RELATORIO_ATIVIDADES: "Relatório de Atividades",
  RELATORIO_ATIVIDADES_12_MESES: "Relatório de Atividades - 12 Meses",
  RELATORIO_ATIVIDADES_24_MESES: "Relatório de Atividades - 24 Meses",
  RELATORIO_ATIVIDADES_ANUAL: "Relatório Anual de Atividades",
  COMPROVANTE_ATUACAO_CULTURAL: "Comprovante de Atuação Cultural",
  COMPROVANTE_ATUACAO_COMUNITARIA: "Comprovante de Atuação Comunitária",
  CARTA_RECOMENDACAO: "Carta de Recomendação",
  CARTA_RECOMENDACAO_COMUNITARIA: "Carta de Recomendação Comunitária",
  CARTA_ANUENCIA: "Carta Anuência",
  CARTA_APOIO: "Carta Apoio",
  DECLARACAO_RECONHECIMENTO_COMUNIDADE: "Declaração de Reconhecimento da Comunidade",
  DECLARACAO_EXISTENCIA_COLETIVO: "Declaração de Existência do Coletivo",
  AUTODECLARACAO_COLETIVO: "Autodeclaração Coletivo",
  LISTA_INTEGRANTES_COLETIVO: "Lista de Integrantes do Coletivo",
  DECLARACAO_ANUENCIA_INTEGRANTES_COLETIVO: "Declaração de Anuência dos Integrantes do Coletivo",
  TERMO_COMPROMETIMENTO_PNCV: "Termo de Comprometimento - PNCV",
  TERMO_VERACIDADE_INFORMACOES: "Termo de Veracidade das Informações",
  TERMO_ADESAO_PNCV: "Termo de Adesão - PNCV",
  TERMO_USO_PRIVACIDADE_PNCV: "Termo de Uso e Privacidade - PNCV",
  FORMULARIO_INSCRICAO_CULTURA_VIVA: "Formulário de Inscrição Cultura Viva",
  COMPROVANTE_INSCRICAO_CULTURA_VIVA: "Comprovante de Inscrição Cultura Viva",
  COMPROVANTE_MAPA_CULTURA: "Comprovante do Mapa da Cultura",
  PERFIL_MAPA_CULTURA: "Perfil no Mapa da Cultura",
  CLIPPING: "Clipping",
  FOTOS_ATIVIDADES: "Fotos das Atividades",
  VIDEOS_ATIVIDADES: "Vídeos das Atividades",
  LINKS_COMPROBATORIOS: "Links Comprobatórios",
  MATERIAL_GRAFICO_DIVULGACAO: "Material Gráfico de Divulgação",
  RELEASE_INSTITUCIONAL: "Release Institucional",
  RELEASE_PROJETO: "Release Projeto",
  FICHA_TECNICA_PROJETO: "Ficha Técnica do Projeto",
  CURRICULO_EQUIPE_TECNICA: "Currículo da Equipe Técnica",
  MINI_BIO_EQUIPE: "Mini Bio da Equipe",
  COMPROVANTE_REALIZACAO_EVENTO: "Comprovante de Realização de Evento",
  CERTIFICADOS_OFICINAS: "Certificados de Oficinas",
  DECLARACAO_PARTICIPACAO_EVENTOS: "Declaração de Participação em Eventos",
  PRESTACAO_CONTAS_PROJETO_CULTURAL: "Prestação de Contas de Projeto Cultural",
  EDITAL: "Edital",
  PROPOSTA_EDITAL: "Proposta Edital",
  FORMULARIO_INSCRICAO_EDITAL: "Formulário de Inscrição em Edital",
  PLANO_TRABALHO: "Plano Trabalho",
  PLANO_ACAO: "Plano Ação",
  PLANO_APLICACAO_RECURSOS: "Plano de Aplicação de Recursos",
  PLANO_EXECUCAO: "Plano Execução",
  CRONOGRAMA_EXECUCAO: "Cronograma Execução",
  CRONOGRAMA_FISICO_FINANCEIRO: "Cronograma Físico-Financeiro",
  ORCAMENTO_PROJETO: "Orçamento do Projeto",
  PLANILHA_ORCAMENTARIA: "Planilha Orçamentária",
  MEMORIA_CALCULO_ORCAMENTO: "Memória de Cálculo do Orçamento",
  PROJETO_TECNICO: "Projeto Técnico",
  PROJETO_BASICO: "Projeto Básico",
  TERMO_REFERENCIA: "Termo de Referência",
  TERMO_FOMENTO: "Termo de Fomento",
  TERMO_COLABORACAO: "Termo de Colaboração",
  ACORDO_COOPERACAO: "Acordo de Cooperação",
  TERMO_PARCERIA: "Termo de Parceria",
  CONVENIO: "Convenio",
  CONTRATO_REPASSE: "Contrato de Repasse",
  TERMO_ADITIVO: "Termo Aditivo",
  PLANO_COMUNICACAO: "Plano de Comunicação",
  PLANO_MOBILIZACAO: "Plano Mobilização",
  PLANO_ACESSIBILIDADE: "Plano de Acessibilidade",
  DECLARACAO_ACESSIBILIDADE: "Declaração Acessibilidade",
  DECLARACAO_CONTRAPARTIDA: "Declaração Contrapartida",
  DECLARACAO_CAPACIDADE_TECNICA_OPERACIONAL: "Declaração de Capacidade Técnica e Operacional",
  DECLARACAO_CAPACIDADE_ADMINISTRATIVA: "Declaração Capacidade Administrativa",
  DECLARACAO_CAPACIDADE_FINANCEIRA: "Declaração Capacidade Financeira",
  DECLARACAO_EXPERIENCIA_PREVIA: "Declaração de Experiência Prévia",
  COMPROVANTE_EXPERIENCIA_PREVIA: "Comprovante de Experiência Prévia",
  DECLARACAO_CIENCIA_EDITAL: "Declaração de Ciência do Edital",
  DECLARACAO_ACEITE_CONDICOES_EDITAL: "Declaração de Aceite das Condições do Edital",
  DECLARACAO_RESPONSABILIDADE_INFORMACOES: "Declaração de Responsabilidade pelas Informações",
  RESULTADO_HABILITACAO: "Resultado de Habilitação",
  RESULTADO_CLASSIFICACAO: "Resultado Classificacao",
  RESULTADO_FINAL: "Resultado Final",
  RECURSO_ADMINISTRATIVO: "Recurso Administrativo",
  CONTRARRAZOES_RECURSO: "Contrarrazões de Recurso",
  PARECER_TECNICO: "Parecer Técnico",
  PARECER_JURIDICO: "Parecer Jurídico",
  EXTRATO_ZERADO_CONTA_BANCARIA: "Extrato Zerado da Conta Bancária",
  EXTRATO_BANCARIO: "Extrato Bancário",
  EXTRATO_CONTA_CORRENTE: "Extrato de Conta Corrente",
  EXTRATO_CONTA_POUPANCA: "Extrato de Conta Poupança",
  COMPROVANTE_CONTA_BANCARIA: "Comprovante de Conta Bancária",
  DECLARACAO_CONTA_BANCARIA: "Declaração de Conta Bancária",
  TERMO_ABERTURA_CONTA_BANCARIA: "Termo de Abertura de Conta Bancária",
  COMPROVANTE_AGENCIA_CONTA: "Comprovante de Agência e Conta",
  RELATORIO_FINANCEIRO: "Relatório Financeiro",
  RELATORIO_EXECUCAO_FINANCEIRA: "Relatório de Execução Financeira",
  BALANCO_PATRIMONIAL: "Balanço Patrimonial",
  BALANCETE: "Balancete",
  DEMONSTRACAO_RESULTADO_EXERCICIO: "Demonstração do Resultado do Exercício",
  DRE: "DRE",
  DEMONSTRACAO_FLUXO_CAIXA: "Demonstração do Fluxo de Caixa",
  LIVRO_DIARIO: "Livro Diário",
  LIVRO_RAZAO: "Livro Razão",
  RECIBO: "Recibo",
  NOTA_FISCAL: "Nota Fiscal",
  CUPOM_FISCAL: "Cupom Fiscal",
  COMPROVANTE_PAGAMENTO: "Comprovante Pagamento",
  COMPROVANTE_TRANSFERENCIA: "Comprovante Transferência",
  COMPROVANTE_PIX: "Comprovante Pix",
  COMPROVANTE_DEPOSITO: "Comprovante Depósito",
  COMPROVANTE_DESPESA: "Comprovante Despesa",
  RELACAO_PAGAMENTOS: "Relação de Pagamentos",
  RELACAO_RECEITAS: "Relação de Receitas",
  RELACAO_DESPESAS: "Relação de Despesas",
  CONCILIACAO_BANCARIA: "Conciliação Bancária",
  RELATORIO_PRESTACAO_CONTAS: "Relatório de Prestação de Contas",
  DEMONSTRATIVO_RECEITAS_DESPESAS: "Demonstrativo de Receitas e Despesas",
  DECLARACAO_ISENCAO_IMPOSTO_RENDA: "Declaração de Isenção de Imposto de Renda",
  DECLARACAO_IMPOSTO_RENDA_PESSOA_JURIDICA: "Declaração de Imposto de Renda Pessoa Jurídica",
  ECF_ESCRITURACAO_CONTABIL_FISCAL: "ECF - Escrituração Contábil Fiscal",
  ECD_ESCRITURACAO_CONTABIL_DIGITAL: "ECD - Escrituração Contábil Digital",
  PLANO_ASSISTENCIA_SOCIAL: "Plano de Assistência Social",
  PLANO_TRABALHO_ASSISTENCIA_SOCIAL: "Plano de Trabalho de Assistência Social",
  PLANO_ACAO_ASSISTENCIA_SOCIAL: "Plano de Ação de Assistência Social",
  RELATORIO_ATIVIDADES_ASSISTENCIA_SOCIAL: "Relatório de Atividades de Assistência Social",
  RELATORIO_SOCIOASSISTENCIAL: "Relatório Socioassistencial",
  COMPROVANTE_OFERTA_SOCIOASSISTENCIAL: "Comprovante de Oferta Socioassistencial",
  INSCRICAO_SERVICO_PROGRAMA_PROJETO_BENEFICIO_SOCIOASSISTENCIAL: "Inscrição de Serviço, Programa, Projeto ou Benefício Socioassistencial",
  DECLARACAO_GRATUIDADE_ATENDIMENTO: "Declaração de Gratuidade do Atendimento",
  DECLARACAO_UNIVERSALIDADE_ATENDIMENTO: "Declaração de Universalidade do Atendimento",
  DECLARACAO_CONTINUIDADE_ATENDIMENTO: "Declaração de Continuidade do Atendimento",
  DECLARACAO_PLANEJAMENTO_PERMANENCIA: "Declaração de Planejamento e Permanência",
  COMPROVANTE_VINCULO_SUAS: "Comprovante de Vínculo com o SUAS",
  COMPROVANTE_CADASTRO_REDE_SOCIOASSISTENCIAL: "Comprovante de Cadastro na Rede Socioassistencial",
  CONTRATO_TRABALHO: "Contrato Trabalho",
  CONTRATO_PRESTACAO_SERVICOS: "Contrato de Prestação de Serviços",
  TERMO_VOLUNTARIADO: "Termo Voluntariado",
  TERMO_ADESAO_VOLUNTARIO: "Termo de Adesão de Voluntário",
  FICHA_CADASTRAL_COLABORADOR: "Ficha Cadastral do Colaborador",
  DOCUMENTO_IDENTIFICACAO_COLABORADOR: "Documento Identificação Colaborador",
  CPF_COLABORADOR: "CPF do Colaborador",
  COMPROVANTE_ENDERECO_COLABORADOR: "Comprovante de Endereço do Colaborador",
  CURRICULO_COLABORADOR: "Currículo do Colaborador",
  CERTIFICADO_FORMACAO_COLABORADOR: "Certificado de Formação do Colaborador",
  DECLARACAO_VINCULO_COLABORADOR: "Declaração de Vínculo do Colaborador",
  FOLHA_PAGAMENTO: "Folha Pagamento",
  HOLERITE: "Holerite",
  RECIBO_PAGAMENTO_AUTONOMO: "Recibo de Pagamento Autônomo",
  RPA: "RPA",
  CONTRATO_OFICINEIRO: "Contrato Oficineiro",
  TERMO_RESPONSABILIDADE_OFICINEIRO: "Termo de Responsabilidade do Oficineiro",
  FICHA_INSCRICAO_PARTICIPANTE: "Ficha de Inscrição do Participante",
  FICHA_MATRICULA_PARTICIPANTE: "Ficha de Matrícula do Participante",
  DOCUMENTO_IDENTIFICACAO_PARTICIPANTE: "Documento Identificação Participante",
  CPF_PARTICIPANTE: "CPF do Participante",
  CERTIDAO_NASCIMENTO_PARTICIPANTE: "Certidão de Nascimento do Participante",
  COMPROVANTE_ENDERECO_PARTICIPANTE: "Comprovante de Endereço do Participante",
  AUTORIZACAO_RESPONSAVEL_LEGAL: "Autorização do Responsável Legal",
  DOCUMENTO_RESPONSAVEL_LEGAL: "Documento do Responsável Legal",
  TERMO_USO_IMAGEM: "Termo de Uso de Imagem",
  TERMO_AUTORIZACAO_VOZ_IMAGEM: "Termo de Autorização de Voz e Imagem",
  TERMO_CONSENTIMENTO_LGPD: "Termo de Consentimento LGPD",
  LISTA_PRESENCA: "Lista de Presença",
  CONTROLE_FREQUENCIA: "Controle de Frequência",
  DECLARACAO_PARTICIPACAO: "Declaração de Participação",
  CERTIFICADO_PARTICIPACAO: "Certificado de Participação",
  AUTORIZACAO_EVENTO: "Autorização de Evento",
  ALVARA_EVENTO: "Alvará de Evento",
  LICENCA_EVENTO: "Licença de Evento",
  OFICIO_SOLICITACAO_ESPACO: "Ofício de Solicitação de Espaço",
  AUTORIZACAO_USO_ESPACO: "Autorização de Uso de Espaço",
  TERMO_CESSAO_ESPACO_EVENTO: "Termo de Cessão de Espaço para Evento",
  PLANO_SEGURANCA_EVENTO: "Plano de Segurança do Evento",
  AVCB: "AVCB",
  CLCB: "CLCB",
  LAUDO_CORPO_BOMBEIROS: "Laudo do Corpo de Bombeiros",
  AUTORIZACAO_ECAD: "Autorização ECAD",
  COMPROVANTE_PAGAMENTO_ECAD: "Comprovante de Pagamento ECAD",
  AUTORIZACAO_DIREITOS_AUTORAIS: "Autorização Direitos Autorais",
  TERMO_CESSAO_DIREITOS_AUTORAIS: "Termo de Cessão de Direitos Autorais",
  TERMO_CESSAO_DIREITOS_IMAGEM: "Termo de Cessão de Direitos de Imagem",
  CLASSIFICACAO_INDICATIVA: "Classificacao Indicativa",
  LAUDO_ACESSIBILIDADE: "Laudo Acessibilidade",
  RELATORIO_EVENTO: "Relatório do Evento",
  REGISTRO_FOTOGRAFICO_EVENTO: "Registro Fotográfico do Evento",
  REGISTRO_AUDIOVISUAL_EVENTO: "Registro Audiovisual do Evento",
  INVENTARIO_PATRIMONIAL: "Inventario Patrimonial",
  TERMO_DOACAO: "Termo Doação",
  TERMO_RECEBIMENTO_BEM: "Termo de Recebimento de Bem",
  TERMO_EMPRESTIMO_BEM: "Termo de Empréstimo de Bem",
  TERMO_DEVOLUCAO_BEM: "Termo de Devolução de Bem",
  NOTA_FISCAL_BEM: "Nota Fiscal do Bem",
  COMPROVANTE_AQUISICAO_BEM: "Comprovante de Aquisição do Bem",
  RELACAO_BENS_PATRIMONIAIS: "Relação de Bens Patrimoniais",
  TERMO_RESPONSABILIDADE_PATRIMONIAL: "Termo de Responsabilidade Patrimonial",
  LAUDO_AVALIACAO_BEM: "Laudo de Avaliação do Bem",
  POLITICA_PRIVACIDADE: "Política de Privacidade",
  TERMO_USO: "Termo Uso",
  POLITICA_PROTECAO_DADOS: "Política de Proteção de Dados",
  POLITICA_SEGURANCA_INFORMACAO: "Política de Segurança da Informação",
  TERMO_CONFIDENCIALIDADE: "Termo Confidencialidade",
  TERMO_CONSENTIMENTO_DADOS: "Termo de Consentimento de Dados",
  RELATORIO_IMPACTO_PROTECAO_DADOS: "Relatório de Impacto à Proteção de Dados",
  DECLARACAO_TRATAMENTO_DADOS: "Declaração de Tratamento de Dados",
  OFICIO: "Oficio",
  REQUERIMENTO: "Requerimento",
  DECLARACAO: "Declaração",
  COMUNICADO: "Comunicado",
  MEMORANDO: "Memorando",
  PARECER: "Parecer",
  RELATORIO: "Relatório",
  CERTIFICADO: "Certificado",
  COMPROVANTE: "Comprovante",
  OUTROS: "Outros",
};

export interface DocumentoDTO {
  id?: number;
  dataEmissao?: string | null;
  dataValidade?: string | null;
  urlDocumento?: string | null;
  tipoDocumento: TipoDocumento;
  statusDocumento: StatusDocumento;
  orgaoEmissor?: string | null;
  observacao?: string | null;
  organizacaoId: number | null;
  arquivoKey?: string | null;
  vencido?: boolean | null;
  mensagemVencimento?: string | null;
  removerArquivo?: boolean | null;
}

export interface Documento {
  id: number;
  dataEmissao: string;
  dataValidade: string;
  urlDocumento: string;
  tipoDocumento: TipoDocumento;
  statusDocumento: StatusDocumento;
  orgaoEmissor: string;
  observacao: string;
  organizacaoId: number | null;
  arquivoKey: string;
  vencido: boolean;
  mensagemVencimento: string;
  removerArquivo?: boolean;
}

export interface OrganizacaoOption {
  id: number;
  nome: string;
}

function toIsoDate(value?: string | null): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (br) {
    const [, dd, mm, yyyy] = br;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function formatDateBR(value?: string | null): string {
  if (!value) return "—";

  const iso = toIsoDate(value);
  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function getNomeArquivoDocumento(url?: string | null): string {
  if (!url?.trim()) return "";

  try {
    const cleanUrl = url.split("?")[0];
    const partes = cleanUrl.split("/");
    const nome = partes[partes.length - 1] ?? "";

    return decodeURIComponent(nome);
  } catch {
    const partes = url.split("/");
    return partes[partes.length - 1] ?? "";
  }
}

export function getArquivoUrl(url?: string | null): string {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function mapDocumento(dto: DocumentoDTO): Documento {
  return {
    id: Number(dto.id ?? 0),
    dataEmissao: toIsoDate(dto.dataEmissao),
    dataValidade: toIsoDate(dto.dataValidade),
    urlDocumento: dto.urlDocumento ?? "",
    tipoDocumento: dto.tipoDocumento,
    statusDocumento: dto.statusDocumento,
    orgaoEmissor: dto.orgaoEmissor ?? "",
    observacao: dto.observacao ?? "",
    organizacaoId: dto.organizacaoId ?? null,
    arquivoKey: dto.arquivoKey ?? "",
    vencido: Boolean(dto.vencido),
    mensagemVencimento: dto.mensagemVencimento ?? "",
    removerArquivo: Boolean(dto.removerArquivo),
  };
}

export function buildDocumentoPayload(doc: Documento): DocumentoDTO {
  return {
    id: doc.id || undefined,
    dataEmissao: doc.dataEmissao || null,
    dataValidade: doc.dataValidade || null,
    urlDocumento: doc.urlDocumento?.trim() || null,
    tipoDocumento: doc.tipoDocumento,
    statusDocumento: doc.statusDocumento,
    orgaoEmissor: doc.orgaoEmissor?.trim() || null,
    observacao: doc.observacao?.trim() || null,
    organizacaoId: doc.organizacaoId,
    arquivoKey: doc.arquivoKey?.trim() || null,
    removerArquivo: doc.removerArquivo ?? false,
  };
}

export async function getDocumentos(): Promise<Documento[]> {
  const response = await fetch(`${API_URL}/documentos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO[] = await response.json();

  return (data ?? []).map(mapDocumento);
}

export async function getDocumentosByOrganizacao(
  organizacaoId: number,
): Promise<Documento[]> {
  const response = await fetch(
    `${API_URL}/documentos/organizacao/${organizacaoId}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO[] = await response.json();

  return (data ?? []).map(mapDocumento);
}

export async function getDocumentoById(id: number): Promise<Documento> {
  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function getDocumentoDownloadUrl(id: number): Promise<string> {
  const response = await fetch(`${API_URL}/documentos/${id}/download`, {
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

export async function createDocumento(
  payload: DocumentoDTO,
  arquivo?: File | null,
): Promise<Documento> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/documentos`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function updateDocumento(
  id: number,
  payload: DocumentoDTO,
  arquivo?: File | null,
): Promise<Documento> {
  const formData = new FormData();

  formData.append("dados", JSON.stringify(payload));

  if (arquivo) {
    formData.append("arquivo", arquivo);
  }

  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: DocumentoDTO = await response.json();

  return mapDocumento(data);
}

export async function deleteDocumento(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/documentos/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getOrganizacoesDocumento(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item: any) => ({
      id: Number(item.id),
      nome:
        item.razaoSocial?.trim() ||
        item.nomeFantasia?.trim() ||
        item.nomeOrganizacao?.trim() ||
        item.nome?.trim() ||
        `Organização ${item.id}`,
    }))
    .filter((item) => Number.isFinite(item.id));
}

export function isDocumentoVencido(doc: Documento): boolean {
  if (doc.statusDocumento === "NAO_SE_APLICA") return false;
  if (doc.vencido) return true;
  if (doc.statusDocumento === "VENCIDO") return true;
  if (!doc.dataValidade) return false;

  const iso = toIsoDate(doc.dataValidade);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return false;

  const [, yyyy, mm, dd] = match;

  const validade = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  validade.setHours(0, 0, 0, 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return validade < hoje;
}

export function contarDocumentosVencidos(documentos: Documento[]): number {
  return documentos.filter(
    (doc) => doc.statusDocumento !== "NAO_SE_APLICA" && isDocumentoVencido(doc),
  ).length;
}

export const statusDocumentoTone = (
  status: StatusDocumento,
): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "ATUALIZADO":
      return "success";

    case "VENCIDO":
      return "danger";

    case "PENDENTE":
    case "NECESSITA_REVISAO":
      return "warning";

    case "EM_ANALISE":
      return "info";

    case "NAO_SE_APLICA":
    default:
      return "neutral";
  }
};
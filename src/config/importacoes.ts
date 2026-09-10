import type { ImportFieldRule } from "@/lib/importDataApplicator";
import { areaAtuacaoOptions } from "@/data/projetos";
import {
  produtoGeradoOptions,
  statusPrestacaoContasOptions,
} from "@/data/prestacaoContas";
import {
  tipoDeficienciaParticipanteOptions,
  tipoNeurodivergenciaOptions,
} from "@/data/participantes";
import {
  classificacaoOptions,
  formaPagamentoOptions,
  statusFinanceiroOptions,
} from "@/data/contasPagar";
import { classificacaoOptions as classificacaoContaReceberOptions } from "@/data/contasReceber";
import { classificacaoPlanejamentoOptions } from "@/data/planejamentoFinanceiro";
import { esferaEditalOptions, statusEditalOptions } from "@/data/editais";
import type { ModuloPermissao } from "@/lib/permissoes";

export interface ImportRelationship {
  field: string;
  label: string;
  endpoint: string;
  required?: boolean;
}

export interface ImportModuleConfig {
  module: string;
  entity: string;
  routes: string[];
  createEndpoint: string;
  createRoute?: string;
  requiredFields: string[];
  relationships?: ImportRelationship[];
  transport?: "json" | "multipartDados";
  permissionModule: ModuloPermissao;
  supportsFormFill?: boolean;
  fieldRules?: Record<string, ImportFieldRule>;
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;
}

const IMPORT_PERMISSION_MODULES: Record<string, ModuloPermissao> = {
  organizacoes: "ORGANIZACAO",
  agentes: "AGENTES_CULTURAIS",
  participantes: "PARTICIPANTES",
  colaboradores: "COLABORADORES",
  integrantes: "INTEGRANTES",
  diretoria: "DIRETORIA",
  projetos: "PROJETOS",
  atividades: "ATIVIDADES",
  turmas: "TURMAS",
  "eventos-culturais": "EVENTOS_CULTURAIS",
  "acoes-divulgacao": "ACOES_DIVULGACAO",
  evidencias: "EVIDENCIAS",
  "planos-aula": "PLANOS_AULA",
  "planos-comunicacao": "PLANO_COMUNICACAO",
  cronogramas: "CRONOGRAMA",
  patrimonios: "PATRIMONIO",
  emprestimos: "EMPRESTIMOS",
  financeiros: "FINANCEIRO",
  "contas-bancarias": "CONTAS_BANCARIAS",
  "contas-pagar": "CONTAS_PAGAR",
  "contas-receber": "CONTAS_RECEBER",
  "transferencias-bancarias": "TRANSFERENCIAS_BANCARIAS",
  documentos: "DOCUMENTOS",
  editais: "EDITAIS",
  "propostas-editais": "PROPOSTAS_EDITAL",
  "equipe-edital": "EQUIPE_EDITAL",
  "metas-projeto": "METAS_PROJETO",
  "planejamentos-financeiros": "PLANEJAMENTO_FINANCEIRO",
  "prestacoes-contas": "PRESTACAO_CONTAS",
  "prestacoes-metas": "PRESTACAO_METAS",
  "habilitacoes-proposta": "HABILITACAO",
  "resultados-proposta": "RESULTADO_PROPOSTA",
  presencas: "PRESENCAS",
  curriculos: "CURRICULOS",
  "trajetorias-culturais": "TRAJETORIAS_CULTURAIS",
  doadores: "DOADORES",
  doacoes: "DOACOES",
  fornecedores: "FORNECEDORES",
  parceiros: "PARCEIROS",
};

const config = (
  module: string,
  entity: string,
  route: string,
  requiredFields: string[],
  options: Partial<ImportModuleConfig> = {},
): ImportModuleConfig => ({
  module,
  entity,
  routes: [route],
  createRoute: `${route}/novo`,
  createEndpoint: route,
  requiredFields,
  permissionModule: IMPORT_PERMISSION_MODULES[module],
  transform: (data) => ({ ...data }),
  ...options,
});

const relationship = (
  field: string,
  label: string,
  endpoint: string,
  required = false,
): ImportRelationship => ({ field, label, endpoint, required });

export const IMPORT_MODULE_CONFIGS: ImportModuleConfig[] = [
  config("organizacoes", "Organizações", "/organizacoes", ["razaoSocial"], {
    createRoute: "/organizacoes",
    fieldRules: {
      areasAtuacao: { kind: "enum-array", options: areaAtuacaoOptions },
    },
    transform: (data) => ({
      ...data,
      areasAtuacao: Array.isArray(data.areasAtuacao)
        ? data.areasAtuacao
        : data.areaAtuacao
          ? [data.areaAtuacao]
          : [],
    }),
  }),
  config("agentes", "Agentes culturais", "/agentes", ["tipoAgente"], {
    createRoute: "/agentes/novo",
  }),
  config(
    "participantes",
    "Participantes",
    "/participantes",
    ["nomeCompleto", "dataNascimento"],
    {
      fieldRules: {
        tipoNeurodivergencias: {
          kind: "enum-array",
          options: [...tipoNeurodivergenciaOptions],
        },
        tipoDeficiencias: {
          kind: "enum-array",
          options: [...tipoDeficienciaParticipanteOptions],
        },
      },
      relationships: [
        relationship("organizacaoId", "Organização", "/organizacoes"),
      ],
    },
  ),
  config("colaboradores", "Colaboradores", "/colaboradores", ["nomeCompleto"], {
    relationships: [
      relationship("organizacaoId", "Organização", "/organizacoes"),
    ],
  }),
  config("integrantes", "Integrantes", "/integrantes", ["nomeCompleto"], {
    relationships: [
      relationship("organizacaoId", "Organização", "/organizacoes"),
    ],
  }),
  config(
    "diretoria",
    "Diretoria",
    "/diretoria",
    ["nomeCompleto", "cargoDiretoria"],
    {
      createEndpoint: "/diretorias",
      createRoute: "/diretoria",
      relationships: [
        relationship("organizacaoId", "Organização", "/organizacoes", true),
      ],
    },
  ),
  config("projetos", "Projetos", "/projetos", ["nomeProjeto"], {
    fieldRules: {
      areasAtuacao: { kind: "enum-array", options: areaAtuacaoOptions },
      colaboradoresIds: { kind: "relationship-array" },
    },
    relationships: [
      relationship("organizacaoId", "Organização", "/organizacoes"),
      relationship("colaboradoresIds", "Colaboradores", "/colaboradores"),
    ],
  }),
  config("atividades", "Atividades", "/atividades", ["nomeAtividade"], {
    fieldRules: {
      colaboradoresIds: {
        kind: "relationship-array",
        targetField: "colaboradores",
      },
    },
    relationships: [
      relationship("projetoId", "Projeto", "/projetos"),
      relationship("colaboradoresIds", "Colaboradores", "/colaboradores"),
    ],
  }),
  config("turmas", "Turmas", "/turmas", ["nomeTurma", "atividadeId"], {
    fieldRules: {
      colaboradoresIds: {
        kind: "relationship-array",
        targetField: "colaboradores",
      },
    },
    relationships: [
      relationship("atividadeId", "Atividade", "/atividades", true),
      relationship("colaboradoresIds", "Colaboradores", "/colaboradores"),
    ],
  }),
  config(
    "eventos-culturais",
    "Eventos culturais",
    "/eventos-culturais",
    ["nomeEvento"],
    {
      fieldRules: { colaboradoresIds: { kind: "relationship-array" } },
      relationships: [
        relationship("projetoId", "Projeto", "/projetos"),
        relationship("colaboradoresIds", "Colaboradores", "/colaboradores"),
      ],
    },
  ),
  config(
    "acoes-divulgacao",
    "Ações de divulgação",
    "/acoes-divulgacao",
    ["descricao"],
    { relationships: [relationship("projetoId", "Projeto", "/projetos")] },
  ),
  config("evidencias", "Evidências", "/evidencias", ["contexto", "projetoId"], {
    createEndpoint: "/evidencias-execucao",
    transport: "multipartDados",
    fieldRules: {
      contexto: {
        kind: "enum",
        options: [
          { value: "AULA", label: "Aula" },
          { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
        ],
      },
    },
    relationships: [
      relationship("projetoId", "Projeto", "/projetos", true),
      relationship("atividadeId", "Atividade", "/atividades"),
      relationship("turmaId", "Turma", "/turmas"),
      relationship("planoAulaId", "Plano de aula", "/planos-aula"),
      relationship("eventoCulturalId", "Evento cultural", "/eventos-culturais"),
    ],
  }),
  config("planos-aula", "Planos de aula", "/planos-aula", ["tema"], {
    relationships: [
      relationship("atividadeId", "Atividade", "/atividades", true),
      relationship("turmaId", "Turma", "/turmas"),
    ],
  }),
  config(
    "planos-comunicacao",
    "Planos de comunicação",
    "/plano-comunicacao",
    ["nomePlano", "propostaEdital"],
    {
      createEndpoint: "/planos-comunicacao",
      relationships: [
        relationship("propostaEdital", "Proposta", "/propostas-editais", true),
      ],
    },
  ),
  config("cronogramas", "Cronogramas", "/cronograma", ["nomeEtapa"], {
    createEndpoint: "/cronogramas",
    createRoute: "/cronograma",
    relationships: [relationship("projetoId", "Projeto", "/projetos", true)],
  }),
  config("patrimonios", "Patrimônios", "/patrimonio", ["nome"], {
    createEndpoint: "/patrimonios",
    transport: "multipartDados",
    relationships: [
      relationship("organizacaoId", "Organização", "/organizacoes"),
    ],
  }),
  config(
    "emprestimos",
    "Empréstimos",
    "/emprestimos",
    ["patrimonioId", "dataEmprestimo"],
    {
      relationships: [
        relationship("patrimonioId", "Patrimônio", "/patrimonios", true),
      ],
    },
  ),
  config(
    "financeiros",
    "Lançamentos financeiros",
    "/financeiro",
    ["tipoOperacaoFinanceira", "valor"],
    {
      createEndpoint: "/financeiros",
      transport: "multipartDados",
      relationships: [
        relationship("organizacaoId", "Organização", "/organizacoes"),
        relationship("projetoId", "Projeto", "/projetos"),
      ],
    },
  ),
  config("contas-bancarias", "Contas bancárias", "/contas-bancarias", [
    "nomeConta",
    "agencia",
    "numeroConta",
    "nomeBanco",
    "statusContaBancaria",
    "tipoContaBancaria",
  ]),
  config(
    "contas-pagar",
    "Contas a pagar",
    "/contas-pagar",
    [
      "nomeContaPagar",
      "descricaoContaPagar",
      "dataVencimento",
      "dataCompetencia",
      "valorAPagar",
      "statusFinanceiro",
      "formaPagamento",
      "classificacaoContaPagar",
    ],
    {
      transport: "multipartDados",
      fieldRules: {
        classificacaoContaPagar: {
          kind: "enum",
          options: [...classificacaoOptions],
        },
        formaPagamento: { kind: "enum", options: [...formaPagamentoOptions] },
        statusFinanceiro: {
          kind: "enum",
          options: [...statusFinanceiroOptions],
        },
      },
      relationships: [
        relationship("contaBancariaId", "Conta bancária", "/contas-bancarias"),
        relationship("colaboradorId", "Colaborador", "/colaboradores"),
        relationship("participanteId", "Participante", "/participantes"),
        relationship("integranteId", "Integrante", "/integrantes"),
        relationship(
          "eventoCulturalId",
          "Evento cultural",
          "/eventos-culturais",
        ),
        relationship(
          "acaoDivulgacaoId",
          "Ação de divulgação",
          "/acoes-divulgacao",
        ),
        relationship("projetoId", "Projeto", "/projetos"),
        relationship("atividadeId", "Atividade", "/atividades"),
      ],
    },
  ),
  config(
    "contas-receber",
    "Contas a receber",
    "/contas-receber",
    [
      "nomeContaReceber",
      "descricaoContaReceber",
      "dataVencimento",
      "dataCompetencia",
      "valorAReceber",
      "statusFinanceiro",
      "formaPagamento",
      "classificacaoContaReceber",
    ],
    {
      transport: "multipartDados",
      fieldRules: {
        classificacaoContaReceber: {
          kind: "enum",
          options: [...classificacaoContaReceberOptions],
        },
        formaPagamento: { kind: "enum", options: [...formaPagamentoOptions] },
        statusFinanceiro: {
          kind: "enum",
          options: [...statusFinanceiroOptions],
        },
      },
      relationships: [
        relationship("contaBancariaId", "Conta bancária", "/contas-bancarias"),
        relationship("colaboradorId", "Colaborador", "/colaboradores"),
        relationship("participanteId", "Participante", "/participantes"),
        relationship("integranteId", "Integrante", "/integrantes"),
        relationship(
          "eventoCulturalId",
          "Evento cultural",
          "/eventos-culturais",
        ),
        relationship(
          "acaoDivulgacaoId",
          "Ação de divulgação",
          "/acoes-divulgacao",
        ),
        relationship("projetoId", "Projeto", "/projetos"),
        relationship("atividadeId", "Atividade", "/atividades"),
      ],
    },
  ),
  config(
    "transferencias-bancarias",
    "Transferências bancárias",
    "/transferencias-bancarias",
    [
      "nomeTransferencia",
      "descricaoTransferencia",
      "dataTransferencia",
      "valorTransferencia",
      "statusTransferenciaBancaria",
      "formaPagamento",
      "contaOrigemId",
      "contaDestinoId",
    ],
    {
      transport: "multipartDados",
      relationships: [
        relationship(
          "contaOrigemId",
          "Conta de origem",
          "/contas-bancarias",
          true,
        ),
        relationship(
          "contaDestinoId",
          "Conta de destino",
          "/contas-bancarias",
          true,
        ),
      ],
    },
  ),
  config("documentos", "Documentos", "/documentos", ["tipoDocumento"], {
    createRoute: "/documentos/novo",
    transport: "multipartDados",
    relationships: [
      relationship("organizacaoId", "Organização", "/organizacoes", true),
    ],
  }),
  config(
    "editais",
    "Editais",
    "/editais",
    [
      "nomeEdital",
      "orgaoResponsavel",
      "anoEdital",
      "esferaEdital",
      "organizacaoId",
      "agenteId",
      "statusEdital",
    ],
    {
      createRoute: "/editais",
      fieldRules: {
        esferaEdital: { kind: "enum", options: [...esferaEditalOptions] },
        statusEdital: { kind: "enum", options: [...statusEditalOptions] },
      },
      relationships: [
        relationship("organizacaoId", "Organização", "/organizacoes", true),
        relationship(
          "agenteId",
          "Responsável pelo acompanhamento",
          "/agentes",
          true,
        ),
      ],
    },
  ),
  config(
    "propostas-editais",
    "Propostas de editais",
    "/propostas-edital",
    ["nome", "edital"],
    {
      createEndpoint: "/propostas-editais",
      relationships: [relationship("edital", "Edital", "/editais", true)],
    },
  ),
  config(
    "equipe-edital",
    "Equipe do edital",
    "/equipe-edital",
    ["propostaEdital", "tipoPessoa"],
    {
      createEndpoint: "/equipes-editais",
      relationships: [
        relationship("propostaEdital", "Proposta", "/propostas-editais", true),
      ],
    },
  ),
  config(
    "metas-projeto",
    "Metas do projeto",
    "/metas-projeto",
    ["descricaoMeta"],
    {
      relationships: [relationship("projetoId", "Projeto", "/projetos", true)],
    },
  ),
  config(
    "planejamentos-financeiros",
    "Planejamentos financeiros",
    "/aplicacao-de-recursos",
    [
      "nomePlanejamento",
      "classificacaoPlanejamentoFinanceiro",
      "propostaEditalId",
    ],
    {
      createEndpoint: "/planejamentos-financeiros",
      createRoute: "/aplicacao-de-recursos",
      fieldRules: {
        classificacaoPlanejamentoFinanceiro: {
          kind: "enum",
          options: [...classificacaoPlanejamentoOptions],
        },
      },
      relationships: [
        relationship(
          "propostaEditalId",
          "Proposta",
          "/propostas-editais",
          true,
        ),
      ],
    },
  ),
  config(
    "prestacoes-contas",
    "Prestações de contas",
    "/prestacao-contas",
    ["propostaEdital", "statusPrestacaoContas"],
    {
      fieldRules: {
        produtosGerados: { kind: "enum-array", options: produtoGeradoOptions },
        statusPrestacaoContas: {
          kind: "enum",
          options: [...statusPrestacaoContasOptions],
        },
      },
      relationships: [
        relationship("propostaEdital", "Proposta", "/propostas-editais", true),
      ],
    },
  ),
  config(
    "prestacoes-metas",
    "Prestações de metas",
    "/prestacao-metas",
    ["metaProjeto"],
    {
      relationships: [
        relationship("metaProjeto", "Meta", "/metas-projeto", true),
      ],
    },
  ),
  config(
    "habilitacoes-proposta",
    "Habilitações de proposta",
    "/habilitacoes-propostas",
    ["propostaEdital"],
    {
      relationships: [
        relationship("propostaEdital", "Proposta", "/propostas-editais", true),
      ],
    },
  ),
  config(
    "resultados-proposta",
    "Resultados de proposta",
    "/resultados-propostas",
    ["propostaEdital", "statusResultadoProposta"],
    {
      transport: "multipartDados",
      relationships: [
        relationship("propostaEdital", "Proposta", "/propostas-editais", true),
      ],
    },
  ),
  config(
    "presencas",
    "Presenças",
    "/presencas",
    ["participanteId", "atividadeId", "data", "status"],
    {
      createRoute: "/presencas",
      supportsFormFill: false,
      relationships: [
        relationship("participanteId", "Participante", "/participantes", true),
        relationship("atividadeId", "Atividade", "/atividades", true),
        relationship("turmaId", "Turma", "/turmas"),
      ],
    },
  ),
  config("curriculos", "Currículos", "/curriculos", ["colaboradorId"], {
    relationships: [
      relationship("colaboradorId", "Colaborador", "/colaboradores", true),
    ],
  }),
  config(
    "trajetorias-culturais",
    "Trajetórias culturais",
    "/trajetorias-culturais",
    ["titulo"],
    {
      relationships: [
        relationship("colaboradorId", "Colaborador", "/colaboradores"),
        relationship("integranteId", "Integrante", "/integrantes"),
      ],
    },
  ),
  config("doadores", "Doadores", "/doadores", ["tipoPessoa"]),
  config("doacoes", "Doações", "/doacoes", [
    "nomeDoacao",
    "tipoDoacao",
    "dataDoacao",
  ]),
  config("fornecedores", "Fornecedores", "/fornecedores", [
    "tipoPessoa",
    "tipoFornecedor",
  ]),
  config("parceiros", "Parceiros", "/parceiros", [
    "tipoPessoa",
    "tipoParcerias",
    "dataInicioParceria",
  ]),
];

export function getImportConfigForPath(pathname: string) {
  return IMPORT_MODULE_CONFIGS.find((item) =>
    item.routes.some(
      (route) =>
        pathname === route ||
        pathname === `${route}/novo` ||
        new RegExp(
          `^${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/editar$`,
        ).test(pathname),
    ),
  );
}

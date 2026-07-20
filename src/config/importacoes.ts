import type { ImportFieldRule } from "@/lib/importDataApplicator";
import { areaAtuacaoOptions } from "@/data/projetos";
import { produtoGeradoOptions } from "@/data/prestacaoContas";
import { tipoDeficienciaParticipanteOptions, tipoNeurodivergenciaOptions } from "@/data/participantes";
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
  participantes: "PARTICIPANTES",
  colaboradores: "COLABORADORES",
  integrantes: "INTEGRANTES",
  diretoria: "DIRETORIA",
  projetos: "PROJETOS",
  atividades: "ATIVIDADES",
  turmas: "TURMAS",
  "eventos-culturais": "EVENTOS_CULTURAIS",
  "acoes-divulgacao": "ACOES_DIVULGACAO",
  "planos-aula": "ATIVIDADES",
  "planos-comunicacao": "PLANO_COMUNICACAO",
  cronogramas: "CRONOGRAMA",
  patrimonios: "PATRIMONIO",
  emprestimos: "EMPRESTIMOS",
  financeiros: "FINANCEIRO",
  documentos: "DOCUMENTOS",
  editais: "EDITAIS",
  "propostas-editais": "PROPOSTAS_EDITAL",
  "equipe-edital": "EQUIPE_EDITAL",
  "metas-projeto": "METAS_PROJETO",
  "planejamentos-financeiros": "PLANEJAMENTO_FINANCEIRO",
  "prestacoes-contas": "PRESTACAO_CONTAS",
  "prestacoes-metas": "PRESTACAO_METAS",
  "habilitacoes-proposta": "HABILITACOES_PROPOSTAS",
  "resultados-proposta": "RESULTADO_PROPOSTA",
  presencas: "PRESENCAS",
  curriculos: "CURRICULOS",
  "trajetorias-culturais": "TRAJETORIAS_CULTURAIS",
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

const relationship = (field: string, label: string, endpoint: string, required = false): ImportRelationship => ({ field, label, endpoint, required });

export const IMPORT_MODULE_CONFIGS: ImportModuleConfig[] = [
  config("organizacoes", "Organizações", "/organizacoes", ["razaoSocial"], { createRoute: "/organizacoes", fieldRules: { areasAtuacao: { kind: "enum-array", options: areaAtuacaoOptions } } }),
  config("participantes", "Participantes", "/participantes", ["nomeCompleto", "dataNascimento"], { fieldRules: { tipoNeurodivergencias: { kind: "enum-array", options: [...tipoNeurodivergenciaOptions] }, tipoDeficiencias: { kind: "enum-array", options: [...tipoDeficienciaParticipanteOptions] } }, relationships: [relationship("organizacaoId", "Organização", "/organizacoes")] }),
  config("colaboradores", "Colaboradores", "/colaboradores", ["nomeCompleto"], { relationships: [relationship("organizacaoId", "Organização", "/organizacoes")] }),
  config("integrantes", "Integrantes", "/integrantes", ["nomeCompleto"], { relationships: [relationship("organizacaoId", "Organização", "/organizacoes")] }),
  config("diretoria", "Diretoria", "/diretoria", ["nomeCompleto", "cargoDiretoria"], { createEndpoint: "/diretorias", createRoute: "/diretoria", relationships: [relationship("organizacaoId", "Organização", "/organizacoes", true)] }),
  config("projetos", "Projetos", "/projetos", ["nomeProjeto"], { fieldRules: { areasAtuacao: { kind: "enum-array", options: areaAtuacaoOptions }, colaboradoresIds: { kind: "relationship-array" } }, relationships: [relationship("organizacaoId", "Organização", "/organizacoes"), relationship("colaboradoresIds", "Colaboradores", "/colaboradores")] }),
  config("atividades", "Atividades", "/atividades", ["nomeAtividade"], { fieldRules: { colaboradoresIds: { kind: "relationship-array", targetField: "colaboradores" } }, relationships: [relationship("projetoId", "Projeto", "/projetos"), relationship("colaboradoresIds", "Colaboradores", "/colaboradores")] }),
  config("turmas", "Turmas", "/turmas", ["nomeTurma", "atividadeId"], { fieldRules: { colaboradoresIds: { kind: "relationship-array", targetField: "colaboradores" } }, relationships: [relationship("atividadeId", "Atividade", "/atividades", true), relationship("colaboradoresIds", "Colaboradores", "/colaboradores")] }),
  config("eventos-culturais", "Eventos culturais", "/eventos-culturais", ["nomeEvento"], { fieldRules: { colaboradoresIds: { kind: "relationship-array" } }, relationships: [relationship("projetoId", "Projeto", "/projetos"), relationship("colaboradoresIds", "Colaboradores", "/colaboradores")] }),
  config("acoes-divulgacao", "Ações de divulgação", "/acoes-divulgacao", ["descricao"], { relationships: [relationship("projetoId", "Projeto", "/projetos")] }),
  config("planos-aula", "Planos de aula", "/planos-aula", ["tema"], { relationships: [relationship("atividadeId", "Atividade", "/atividades", true), relationship("turmaId", "Turma", "/turmas")] }),
  config("planos-comunicacao", "Planos de comunicação", "/plano-comunicacao", ["nomePlano", "propostaEdital"], { createEndpoint: "/planos-comunicacao", relationships: [relationship("propostaEdital", "Proposta", "/propostas-editais", true)] }),
  config("cronogramas", "Cronogramas", "/cronograma", ["nomeEtapa"], { createEndpoint: "/cronogramas", createRoute: "/cronograma", relationships: [relationship("projetoId", "Projeto", "/projetos", true)] }),
  config("patrimonios", "Patrimônios", "/patrimonio", ["nome"], { createEndpoint: "/patrimonios", transport: "multipartDados", relationships: [relationship("organizacaoId", "Organização", "/organizacoes")] }),
  config("emprestimos", "Empréstimos", "/emprestimos", ["patrimonioId", "dataEmprestimo"], { relationships: [relationship("patrimonioId", "Patrimônio", "/patrimonios", true)] }),
  config("financeiros", "Lançamentos financeiros", "/financeiro", ["tipoOperacaoFinanceira", "valor"], { createEndpoint: "/financeiros", transport: "multipartDados", relationships: [relationship("organizacaoId", "Organização", "/organizacoes"), relationship("projetoId", "Projeto", "/projetos")] }),
  config("documentos", "Documentos", "/documentos", ["tipoDocumento"], { transport: "multipartDados", relationships: [relationship("organizacaoId", "Organização", "/organizacoes", true)] }),
  config("editais", "Editais", "/editais", ["nomeEdital"], { createRoute: "/editais" }),
  config("propostas-editais", "Propostas de editais", "/propostas-edital", ["nome", "edital"], { createEndpoint: "/propostas-editais", relationships: [relationship("edital", "Edital", "/editais", true)] }),
  config("equipe-edital", "Equipe do edital", "/equipe-edital", ["propostaEdital", "tipoPessoa"], { createEndpoint: "/equipes-editais", relationships: [relationship("propostaEdital", "Proposta", "/propostas-editais", true)] }),
  config("metas-projeto", "Metas do projeto", "/metas-projeto", ["descricaoMeta"], { relationships: [relationship("projetoId", "Projeto", "/projetos", true)] }),
  config("planejamentos-financeiros", "Planejamentos financeiros", "/aplicacao-de-recursos", ["nomePlanejamento", "propostaEditalId"], { createEndpoint: "/planejamentos-financeiros", createRoute: "/aplicacao-de-recursos", relationships: [relationship("propostaEditalId", "Proposta", "/propostas-editais", true)] }),
  config("prestacoes-contas", "Prestações de contas", "/prestacao-contas", ["propostaEdital"], { fieldRules: { produtosGerados: { kind: "enum-array", options: produtoGeradoOptions } }, relationships: [relationship("propostaEdital", "Proposta", "/propostas-editais", true)] }),
  config("prestacoes-metas", "Prestações de metas", "/prestacao-metas", ["metaProjeto"], { relationships: [relationship("metaProjeto", "Meta", "/metas-projeto", true)] }),
  config("habilitacoes-proposta", "Habilitações de proposta", "/habilitacoes-propostas", ["propostaEdital"], { relationships: [relationship("propostaEdital", "Proposta", "/propostas-editais", true)] }),
  config("resultados-proposta", "Resultados de proposta", "/resultados-propostas", ["propostaEdital", "statusResultadoProposta"], { transport: "multipartDados", relationships: [relationship("propostaEdital", "Proposta", "/propostas-editais", true)] }),
  config("presencas", "Presenças", "/presencas", ["participanteId", "atividadeId", "data", "status"], { createRoute: "/presencas", supportsFormFill: false, relationships: [relationship("participanteId", "Participante", "/participantes", true), relationship("atividadeId", "Atividade", "/atividades", true), relationship("turmaId", "Turma", "/turmas")] }),
  config("curriculos", "Currículos", "/curriculos", ["colaboradorId"], { relationships: [relationship("colaboradorId", "Colaborador", "/colaboradores", true)] }),
  config("trajetorias-culturais", "Trajetórias culturais", "/trajetorias-culturais", ["titulo"], { relationships: [relationship("colaboradorId", "Colaborador", "/colaboradores"), relationship("integranteId", "Integrante", "/integrantes")] }),
];

export function getImportConfigForPath(pathname: string) {
  return IMPORT_MODULE_CONFIGS.find((item) => item.routes.some((route) =>
    pathname === route || pathname === `${route}/novo` || new RegExp(`^${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/editar$`).test(pathname),
  ));
}

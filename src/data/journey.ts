import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  FilePenLine,
  FolderKanban,
  ReceiptText,
  UserRoundCog,
  Warehouse,
} from "lucide-react";

import type { InicioDados } from "@/data/inicio";

export type JourneyItemState =
  | "CONCLUIDO"
  | "EM_ANDAMENTO"
  | "PENDENCIA"
  | "REVISAO"
  | "NAO_INICIADO"
  | "NAO_SE_APLICA";

export type JourneyModuleState =
  | "CONCLUIDO"
  | "EM_ANDAMENTO"
  | "COM_PENDENCIAS"
  | "PRECISA_ATENCAO"
  | "NAO_INICIADO";

export interface JourneyItem {
  label: string;
  route: string;
  state: JourneyItemState;
}

export interface JourneyModule {
  key: string;
  title: string;
  description: string;
  helper: string;
  icon: LucideIcon;
  items: JourneyItem[];
  state: JourneyModuleState;
  percentual: number;
  etapasConcluidas: number;
  etapasTotal: number;
}

export interface DocumentosResumo {
  total: number;
  atualizados: number;
  vencidos: number;
  pendentes: number;
}

/* ============================================================
   HELPERS
   ============================================================ */

const createModule = (
  base: Omit<
    JourneyModule,
    "state" | "percentual" | "etapasConcluidas" | "etapasTotal"
  >,
  attention = false,
): JourneyModule => {
  const completed = base.items.filter(
    (item) => item.state === "CONCLUIDO",
  ).length;

  const pending = base.items.some(
    (item) => item.state === "PENDENCIA" || item.state === "REVISAO",
  );

  const total = base.items.filter(
    (item) => item.state !== "NAO_SE_APLICA",
  ).length;

  const state: JourneyModuleState = attention
    ? "PRECISA_ATENCAO"
    : pending
      ? "COM_PENDENCIAS"
      : completed === 0
        ? "NAO_INICIADO"
        : completed === total
          ? "CONCLUIDO"
          : "EM_ANDAMENTO";

  return {
    ...base,
    state,
    percentual: total > 0 ? Math.round((completed / total) * 100) : 0,
    etapasConcluidas: completed,
    etapasTotal: total,
  };
};

const item = (label: string, route: string, done: boolean): JourneyItem => ({
  label,
  route,
  state: done ? "CONCLUIDO" : "NAO_INICIADO",
});

/* ============================================================
   DOCUMENTOS
   ============================================================ */

export function getDocumentosResumo(dados: InicioDados): DocumentosResumo {
  return {
    total: dados.totalDocumentos,
    atualizados: dados.documentosAtualizados,
    vencidos: dados.documentosVencidos,
    pendentes: dados.documentosPendentes,
  };
}

/* ============================================================
   JORNADA DA ORGANIZAÇÃO
   ============================================================ */

export function buildJourneyModules(d: InicioDados): JourneyModule[] {
  const documentosOk =
    d.totalDocumentos > 0 &&
    d.documentosVencidos === 0 &&
    d.documentosPendentes === 0;

  const possuiMovimentacaoFinanceira =
    d.totalContasBancarias > 0 ||
    d.totalContasPagar > 0 ||
    d.totalContasReceber > 0 ||
    d.totalDoacoes > 0 ||
    d.totalTransferenciasBancarias > 0 ||
    d.totalMovimentacoesBancarias > 0;

  return [
    /* ========================================================
       INSTITUCIONAL
       ======================================================== */

    createModule(
      {
        key: "institucional",
        title: "Institucional",
        description:
          "Organize as principais informações institucionais da organização.",
        helper:
          "Esses registros formam a base utilizada em projetos, editais, documentos, relatórios e outras áreas do sistema.",
        icon: Building2,
        items: [
          item(
            "Dados Institucionais",
            "/organizacoes",
            d.hasOrganizacao || d.totalOrganizacoes > 0,
          ),

          item("Diretoria", "/diretoria", d.totalDiretoria > 0),

          {
            ...item("Documentos", "/documentos", documentosOk),
            state:
              d.documentosVencidos > 0
                ? "REVISAO"
                : d.documentosPendentes > 0
                  ? "PENDENCIA"
                  : documentosOk
                    ? "CONCLUIDO"
                    : "NAO_INICIADO",
          },

          item("Agentes Culturais", "/agentes", d.totalAgentes > 0),
        ],
      },
      d.documentosVencidos > 0,
    ),

    /* ========================================================
       PESSOAS E TRAJETÓRIAS
       ======================================================== */

    createModule({
      key: "pessoas-trajetorias",
      title: "Pessoas e Trajetórias",
      description:
        "Organize as pessoas vinculadas e as trajetórias dos colaboradores.",
      helper:
        "Cadastre colaboradores, integrantes e participantes e registre, para os colaboradores, seus currículos e trajetórias culturais.",
      icon: UserRoundCog,
      items: [
        item("Colaboradores", "/colaboradores", d.totalColaboradores > 0),

        item("Integrantes", "/integrantes", d.totalIntegrantes > 0),

        item("Participantes", "/participantes", d.totalParticipantes > 0),

        item("Currículos", "/curriculos", d.totalCurriculos > 0),

        item(
          "Trajetórias Culturais",
          "/trajetorias-culturais",
          d.totalTrajetoriasCulturais > 0,
        ),
      ],
    }),

    /* ========================================================
       PROJETOS E PLANEJAMENTO
       ======================================================== */

    createModule({
      key: "projetos-planejamento",
      title: "Projetos e Planejamento",
      description: "Estruture os projetos e acompanhe metas, etapas e prazos.",
      helper:
        "Defina os projetos, suas metas e o cronograma para organizar os resultados esperados, as etapas e os períodos de execução.",
      icon: FolderKanban,
      items: [
        item("Projetos", "/projetos", d.totalProjetos > 0),

        item("Metas do Projeto", "/metas-projeto", d.totalMetasProjeto > 0),

        item("Cronograma do Projeto", "/cronograma", d.totalCronogramas > 0),
      ],
    }),

    /* ========================================================
       EXECUÇÃO
       ======================================================== */

    createModule({
      key: "execucao",
      title: "Execução",
      description: "Acompanhe as ações realizadas e a participação do público.",
      helper:
        "Registre atividades, turmas, planos de aula, presenças e eventos culturais para manter organizado o histórico do que foi realizado.",
      icon: Activity,
      items: [
        item("Atividades", "/atividades", d.totalAtividades > 0),

        item("Turmas", "/turmas", d.totalTurmas > 0),

        item("Plano de Aula", "/planos-aula", d.totalPlanosAula > 0),

        item("Presenças", "/presencas", d.totalPresencas > 0),

        item("Eventos Culturais", "/eventos-culturais", d.totalEventos > 0),
      ],
    }),

    /* ========================================================
       EVIDÊNCIAS
       ======================================================== */

    createModule({
      key: "evidencias",
      title: "Evidências",
      description:
        "Reúna registros que comprovam a execução das ações e projetos.",
      helper:
        "Reúna fotos, documentos, vídeos, links e outros registros para preservar evidências do que foi realizado e apoiar relatórios e prestações de contas.",
      icon: BadgeCheck,
      items: [
        item("Evidências de Execução", "/evidencias", d.totalEvidencias > 0),
      ],
    }),

    /* ========================================================
       EDITAIS E PROPOSTAS
       ======================================================== */

    createModule({
      key: "editais-propostas",
      title: "Editais e Propostas",
      description: "Acompanhe editais, propostas e as etapas de cada processo.",
      helper:
        "Reúna em um mesmo fluxo o edital, a proposta, sua equipe, comunicação, aplicação de recursos, habilitação e resultado.",
      icon: FilePenLine,
      items: [
        item("Editais", "/editais", d.totalEditais > 0),

        item(
          "Propostas de Edital",
          "/propostas-edital",
          d.totalPropostasEditais > 0,
        ),

        item("Equipe da Proposta", "/equipe-edital", d.totalEquipesEditais > 0),

        item(
          "Plano de Comunicação",
          "/plano-comunicacao",
          d.totalPlanosComunicacao > 0,
        ),

        item(
          "Ações de Divulgação",
          "/acoes-divulgacao",
          d.totalAcoesDivulgacao > 0,
        ),

        item(
          "Aplicação de Recursos",
          "/aplicacao-de-recursos",
          d.totalPlanejamentosFinanceiros > 0,
        ),

        item(
          "Habilitação Documental",
          "/habilitacoes-propostas",
          d.totalHabilitacoesPropostas > 0,
        ),

        item(
          "Resultado da Proposta",
          "/resultados-propostas",
          d.totalResultadosPropostas > 0,
        ),
      ],
    }),

    /* ========================================================
       FINANCEIRO
       ======================================================== */

    createModule({
      key: "financeiro",
      title: "Financeiro",
      description:
        "Acompanhe os recursos, compromissos e movimentações financeiras.",
      helper:
        "Organize contas, recebimentos, pagamentos, doações e movimentações bancárias para acompanhar o fluxo financeiro e conferir os registros das contas.",
      icon: CircleDollarSign,
      items: [
        item(
          "Contas Bancárias",
          "/contas-bancarias",
          d.totalContasBancarias > 0,
        ),

        item("Doadores", "/doadores", d.totalDoadores > 0),

        item("Doações", "/doacoes", d.totalDoacoes > 0),

        item("Fornecedores", "/fornecedores", d.totalFornecedores > 0),

        item("Parceiros", "/parceiros", d.totalParceiros > 0),

        item("Contas a Pagar", "/contas-pagar", d.totalContasPagar > 0),

        item("Contas a Receber", "/contas-receber", d.totalContasReceber > 0),

        item(
          "Transferências Bancárias",
          "/transferencias-bancarias",
          d.totalTransferenciasBancarias > 0,
        ),

        item(
          "Movimentações Bancárias",
          "/movimentacoes-bancarias",
          d.totalMovimentacoesBancarias > 0,
        ),

        item(
          "Conciliação Bancária",
          "/conciliacao-bancaria",
          d.totalConciliacoesBancarias > 0,
        ),

        item(
          "Fluxo de Caixa",
          "/fluxo-caixa",
          d.totalMovimentacoesBancarias > 0 ||
            d.totalContasPagar > 0 ||
            d.totalContasReceber > 0,
        ),
      ],
    }),

    /* ========================================================
       PRESTAÇÃO DE CONTAS
       ======================================================== */

    createModule({
      key: "prestacao-contas",
      title: "Prestação de Contas",
      description: "Acompanhe os resultados e organize a prestação de contas.",
      helper:
        "Registre o cumprimento das metas e reúna as informações que demonstram como o projeto foi executado e quais resultados foram alcançados.",
      icon: ReceiptText,
      items: [
        item(
          "Cumprimento de Metas",
          "/prestacao-metas",
          d.totalPrestacoesMetas > 0,
        ),

        item(
          "Prestação de Contas",
          "/prestacao-contas",
          d.totalPrestacoesContas > 0,
        ),
      ],
    }),

    /* ========================================================
       PATRIMÔNIO
       ======================================================== */

    createModule({
      key: "patrimonio",
      title: "Patrimônio",
      description:
        "Acompanhe os bens da organização, sua situação e utilização.",
      helper:
        "Mantenha organizado o histórico dos bens patrimoniais e de seus empréstimos, incluindo utilização, devolução e condições de conservação.",
      icon: Warehouse,
      items: [
        item("Patrimônio", "/patrimonio", d.totalPatrimonios > 0),

        item("Empréstimos", "/emprestimos", d.totalEmprestimos > 0),
      ],
    }),
  ];
}

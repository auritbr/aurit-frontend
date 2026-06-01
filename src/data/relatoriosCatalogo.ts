import {
  FileBarChart2,
  Building2,
  UserCog,
  ScrollText,
  Users,
  UsersRound,
  FolderKanban,
  CalendarRange,
  GraduationCap,
  ClipboardCheck,
  Megaphone,
  ImageIcon,
  FileSignature,
  FileText,
  UsersIcon,
  MessageSquare,
  Wallet,
  PiggyBank,
  Target,
  FileCheck2,
  Boxes,
  PackageOpen,
  BookUser,
  Sparkles,
  ShieldCheck,
  Award,
  type LucideIcon,
} from "lucide-react";

export type RelatorioPlano = "gratis" | "pago";

export interface RelatorioCatalogoItem {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  plano: RelatorioPlano;
  tooltip: string;
  searchPlaceholder?: string;
}

export interface RelatorioCatalogoGrupo {
  id: string;
  titulo: string;
  itens: RelatorioCatalogoItem[];
}

export const RELATORIOS_CATALOGO: RelatorioCatalogoGrupo[] = [
  {
    id: "visao-geral",
    titulo: "Visão Geral",
    itens: [
      {
        slug: "geral",
        title: "Relatório Geral",
        description:
          "Reúne os principais indicadores da organização em uma visão única, facilitando a leitura rápida da estrutura, execução, documentação, financeiro, editais, prestação de contas e patrimônio.",
        icon: FileBarChart2,
        plano: "pago",
        tooltip:
          "Use este relatório para ter uma visão ampla da organização e identificar rapidamente o volume de cadastros, atividades, documentos, movimentações, editais e registros institucionais.",
      },
    ],
  },
  {
    id: "institucional",
    titulo: "Institucional",
    itens: [
      {
        slug: "organizacao",
        title: "Organização",
        description:
          "Apresenta os dados institucionais cadastrados, como razão social, CNPJ, contatos, território de atuação, histórico, endereço e classificações culturais.",
        icon: Building2,
        plano: "pago",
        tooltip:
          "Use este relatório para revisar as informações institucionais que identificam a organização e apoiam cadastros, editais, documentos oficiais e prestações de contas.",
        searchPlaceholder: "Buscar por razão social, CNPJ, cidade...",
      },
      {
        slug: "diretoria",
        title: "Diretoria",
        description:
          "Lista os membros da diretoria, seus cargos, contatos, período de mandato, situação atual e observações registradas.",
        icon: UserCog,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar quem representa formalmente a organização, verificar mandatos e manter dados de contato e cargos atualizados.",
        searchPlaceholder: "Buscar por nome, cargo, status...",
      },
      {
        slug: "documentos",
        title: "Documentos",
        description:
          "Organiza os documentos institucionais por tipo, status, emissão, validade, órgão emissor e arquivo vinculado.",
        icon: ScrollText,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a situação documental da organização, identificar documentos vencidos, pendentes ou sem arquivo e se preparar melhor para editais e habilitações.",
        searchPlaceholder: "Buscar por tipo, status, órgão emissor...",
      },
      {
        slug: "agentes",
        title: "Agentes Culturais",
        description:
          "Apresenta os agentes culturais cadastrados, incluindo pessoas físicas, pessoas jurídicas, MEIs e coletivos, com dados de identificação, contato e endereço.",
        icon: UsersIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar os agentes culturais que podem ser vinculados a projetos, propostas, habilitações, equipes e processos institucionais.",
        searchPlaceholder: "Buscar por nome, documento, tipo...",
      },
    ],
  },
  {
    id: "pessoas",
    titulo: "Pessoas",
    itens: [
      {
        slug: "colaboradores",
        title: "Colaboradores",
        description:
          "Apresenta colaboradores vinculados à organização, com função, carga horária, tipo de vínculo, atuação, contatos, endereço e status.",
        icon: UserCog,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a equipe colaboradora, conferir vínculos ativos, funções, carga horária e dados que podem apoiar projetos, propostas e comprovação de capacidade técnica.",
        searchPlaceholder: "Buscar por nome, função, e-mail, status...",
      },
      {
        slug: "integrantes",
        title: "Integrantes",
        description:
          "Lista os integrantes formais da organização, com dados pessoais, função, entrada, saída, contatos, endereço e situação atual.",
        icon: UsersRound,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar quem compõe formalmente a organização, verificar funções, períodos de participação e situação de cada integrante.",
        searchPlaceholder: "Buscar por nome, função, cidade, status...",
      },
      {
        slug: "participantes",
        title: "Participantes",
        description:
          "Reúne participantes cadastrados, com dados pessoais, contatos, responsáveis, endereço e status de acompanhamento.",
        icon: Users,
        plano: "gratis",
        tooltip:
          "Use este relatório para consultar o público atendido pela organização, apoiar registros de participação e manter dados de contato, responsáveis e endereço organizados.",
        searchPlaceholder: "Buscar por nome, CPF, cidade, bairro, status...",
      },
    ],
  },
  {
    id: "trajetorias",
    titulo: "Trajetórias",
    itens: [
      {
        slug: "curriculos",
        title: "Currículos",
        description:
          "Organiza os currículos dos colaboradores por seções, experiências, formações, competências e atuações relevantes.",
        icon: BookUser,
        plano: "pago",
        tooltip:
          "Use este relatório para reunir informações curriculares da equipe e fortalecer propostas, editais, portfólios institucionais e comprovação de capacidade de execução.",
        searchPlaceholder: "Buscar por colaborador, formação, competência...",
      },
      {
        slug: "trajetorias-culturais",
        title: "Trajetórias Culturais",
        description:
          "Apresenta as trajetórias culturais registradas, destacando experiências, linguagens, vivências, aprendizados e contribuições territoriais.",
        icon: Sparkles,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar narrativas de trajetória cultural e apoiar a apresentação institucional da equipe em projetos, editais e materiais de credibilidade.",
        searchPlaceholder: "Buscar por colaborador, área, território...",
      },
    ],
  },
  {
    id: "projetos",
    titulo: "Projetos",
    itens: [
      {
        slug: "projetos",
        title: "Projetos",
        description:
          "Apresenta os projetos cadastrados, com objetivos, público-alvo, acessibilidade, local de execução, período, área de atuação e status.",
        icon: FolderKanban,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar a carteira de projetos da organização, acompanhar dados estratégicos e verificar a situação geral de cada iniciativa.",
        searchPlaceholder: "Buscar por nome, status, área de atuação...",
      },
      {
        slug: "metas-projeto",
        title: "Metas do Projeto",
        description:
          "Lista as metas previstas para projetos ou propostas, com descrição, quantidade esperada, forma de comprovação e vínculo correspondente.",
        icon: Target,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar o que foi planejado, conferir metas previstas e organizar informações que ajudam na execução e na prestação de contas.",
        searchPlaceholder: "Buscar por meta, projeto, proposta...",
      },
      {
        slug: "cronograma",
        title: "Cronograma",
        description:
          "Organiza as etapas de cronograma vinculadas a projetos, atividades, eventos culturais e ações de divulgação.",
        icon: CalendarRange,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar prazos, etapas e status do planejamento, facilitando a visualização do que precisa ser executado e quando.",
        searchPlaceholder: "Buscar por etapa, projeto, status...",
      },
    ],
  },
  {
    id: "execucao",
    titulo: "Execução",
    itens: [
      {
        slug: "atividades",
        title: "Atividades",
        description:
          "Lista as atividades vinculadas aos projetos, com descrição, público beneficiado, local, período, vagas, tipo e status.",
        icon: CalendarRange,
        plano: "gratis",
        tooltip:
          "Use este relatório para acompanhar as ações executadas ou planejadas nos projetos, conferindo local, período, público, vagas e situação de cada atividade.",
        searchPlaceholder: "Buscar por atividade, projeto, status...",
      },
      {
        slug: "turmas",
        title: "Turmas",
        description:
          "Apresenta as turmas criadas para as atividades, com nome, descrição, dias de realização, horários, atividade vinculada, projeto e status.",
        icon: GraduationCap,
        plano: "gratis",
        tooltip:
          "Use este relatório para organizar os grupos de atendimento, acompanhar horários e verificar a distribuição das turmas dentro das atividades.",
        searchPlaceholder: "Buscar por turma, atividade, projeto...",
      },
      {
        slug: "presencas",
        title: "Presenças",
        description:
          "Reúne os registros de presença por data, atividade, turma, participante e situação de frequência.",
        icon: ClipboardCheck,
        plano: "gratis",
        tooltip:
          "Use este relatório para acompanhar a frequência dos participantes, comprovar realização de encontros, apoiar relatórios de execução e fortalecer prestações de contas.",
        searchPlaceholder: "Buscar por participante, turma, data...",
      },
    ],
  },
  {
    id: "acoes-culturais",
    titulo: "Ações Culturais",
    itens: [
      {
        slug: "eventos-culturais",
        title: "Eventos Culturais",
        description:
          "Lista eventos culturais vinculados aos projetos, com local, período, objetivo, acessibilidade, resultado esperado, produto gerado e status.",
        icon: CalendarRange,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a programação cultural da organização, consultar eventos realizados ou planejados e organizar dados de execução e resultado.",
        searchPlaceholder: "Buscar por evento, projeto, local, status...",
      },
      {
        slug: "acoes-divulgacao",
        title: "Ações de Divulgação",
        description:
          "Apresenta ações de divulgação vinculadas aos projetos, com objetivo, estratégias, período, acessibilidade, produtos gerados e status.",
        icon: Megaphone,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar como os projetos estão sendo comunicados, quais estratégias foram planejadas e quais materiais ou produtos foram gerados.",
        searchPlaceholder: "Buscar por ação, estratégia, projeto...",
      },
      {
        slug: "plano-comunicacao",
        title: "Plano de Comunicação",
        description:
          "Organiza os registros do plano de comunicação, incluindo formato, quantidade, local de circulação, período, status e ação de divulgação vinculada.",
        icon: MessageSquare,
        plano: "pago",
        tooltip:
          "Use este relatório para detalhar a execução da comunicação dos projetos, acompanhando formatos, entregas previstas, locais de circulação e situação dos registros.",
        searchPlaceholder: "Buscar por formato, local, status...",
      },
    ],
  },
  {
    id: "financeiro",
    titulo: "Financeiro",
    itens: [
      {
        slug: "financeiro",
        title: "Financeiro",
        description:
          "Apresenta movimentações financeiras com tipo de operação, valor, status, forma de pagamento, pessoa ou fornecedor, comprovante e vínculos com projetos, atividades, eventos ou ações.",
        icon: Wallet,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar receitas e despesas, verificar comprovantes, consultar vínculos financeiros e apoiar a organização de prestações de contas.",
        searchPlaceholder: "Buscar por descrição, pessoa, documento, status...",
      },
    ],
  },
  {
    id: "editais",
    titulo: "Editais",
    itens: [
      {
        slug: "editais",
        title: "Editais",
        description:
          "Lista editais acompanhados pela organização, com nome, número, órgão responsável, datas, valores, esfera, status e observações.",
        icon: FileSignature,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar oportunidades e processos seletivos cadastrados, verificando status, prazos, resultados e dados essenciais de cada edital.",
        searchPlaceholder: "Buscar por nome, órgão, status...",
      },
      {
        slug: "propostas-edital",
        title: "Propostas de Edital",
        description:
          "Apresenta propostas vinculadas a editais, com título, resumo, justificativa, metodologia, acessibilidade, impacto esperado, valores e status.",
        icon: FileText,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar propostas submetidas ou planejadas, consultar informações centrais do projeto e verificar vínculos com edital e projeto base.",
        searchPlaceholder: "Buscar por título, edital, status...",
      },
      {
        slug: "resultados-propostas",
        title: "Resultados da Proposta",
        description:
          "Apresenta os resultados das propostas inscritas em editais, com status, pontuação, relatório de avaliação e informações de recurso quando houver.",
        icon: Award,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a situação final das propostas, conferir pontuação, consultar relatório de avaliação e organizar recursos interpostos.",
        searchPlaceholder: "Buscar por proposta, edital, status, pontuação...",
      },
      {
        slug: "habilitacao",
        title: "Habilitação Documental",
        description:
          "Organiza a etapa de habilitação documental das propostas, com agente responsável, prazos, envio de documentação, status e observações.",
        icon: ShieldCheck,
        plano: "pago",
        tooltip:
          "Use este relatório para controlar a fase documental após a proposta, acompanhar prazos de habilitação e reduzir riscos de pendências em editais.",
        searchPlaceholder: "Buscar por proposta, agente, status...",
      },
      {
        slug: "equipe-edital",
        title: "Equipe da Proposta",
        description:
          "Lista a equipe vinculada às propostas de edital, com função no projeto, carga horária, valor previsto, justificativa e mini biografia.",
        icon: UsersIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para revisar a composição da equipe das propostas, conferir funções, dedicação prevista, valores e informações úteis para editais.",
        searchPlaceholder: "Buscar por nome, função, proposta...",
      },
      {
        slug: "planejamento-financeiro",
        title: "Orçamento da Proposta",
        description:
          "Apresenta itens previstos no orçamento da proposta, com justificativa, quantidade, unidade de medida, valor unitário, valor total e vínculos com equipe ou edital.",
        icon: PiggyBank,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar o orçamento planejado das propostas, revisar valores previstos e apoiar a coerência entre equipe, itens e execução financeira.",
        searchPlaceholder: "Buscar por item, proposta, equipe...",
      },
    ],
  },
  {
    id: "evidencias",
    titulo: "Evidências",
    itens: [
      {
        slug: "evidencias",
        title: "Evidências de Execução",
        description:
          "Reúne evidências como arquivos, links, fotos, vídeos, documentos, publicações e vínculos com propostas, atividades, turmas, eventos, ações de divulgação ou presenças.",
        icon: ImageIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para localizar e organizar comprovações de execução, facilitando relatórios institucionais, prestação de contas e demonstração de resultados.",
        searchPlaceholder: "Buscar por título, tipo, projeto, vínculo...",
      },
    ],
  },
  {
    id: "prestacao-contas",
    titulo: "Prestação de Contas",
    itens: [
      {
        slug: "prestacao-contas",
        title: "Prestação de Contas",
        description:
          "Apresenta prestações de contas vinculadas a propostas, com período, datas de envio e aprovação, status, pareceres e observações gerais.",
        icon: FileCheck2,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar o andamento das prestações de contas, verificar prazos, status, pareceres e informações necessárias para controle institucional.",
        searchPlaceholder: "Buscar por proposta, status, período...",
      },
      {
        slug: "prestacao-metas",
        title: "Cumprimento de Metas",
        description:
          "Organiza o cumprimento das metas, comparando quantidade prevista e executada, status, justificativas e informações de comprovação.",
        icon: Target,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar resultados entregues, identificar metas cumpridas ou pendentes e apoiar a comprovação objetiva da execução do projeto.",
        searchPlaceholder: "Buscar por meta, status, prestação...",
      },
    ],
  },
  {
    id: "patrimonio",
    titulo: "Patrimônio",
    itens: [
      {
        slug: "patrimonio",
        title: "Patrimônio",
        description:
          "Lista bens patrimoniais cadastrados, com número de patrimônio, descrição, aquisição, valor, marca, modelo, série, nota fiscal, conservação e status.",
        icon: Boxes,
        plano: "pago",
        tooltip:
          "Use este relatório para controlar os bens da organização, acompanhar estado de conservação, documentação, valor estimado e situação de uso.",
        searchPlaceholder: "Buscar por nome, nº patrimonial, marca, modelo...",
      },
      {
        slug: "emprestimos",
        title: "Empréstimos",
        description:
          "Apresenta empréstimos de bens patrimoniais, com patrimônio vinculado, destinatário, datas, contexto de uso, estado inicial, devolução e status.",
        icon: PackageOpen,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a saída temporária de bens, identificar responsáveis, controlar devoluções e registrar a conservação antes e depois do empréstimo.",
        searchPlaceholder: "Buscar por bem, destinatário, status...",
      },
    ],
  },
];

export const RELATORIOS_FLAT: RelatorioCatalogoItem[] =
  RELATORIOS_CATALOGO.flatMap((grupo) => grupo.itens);

export function findRelatorioBySlug(
  slug: string,
): RelatorioCatalogoItem | undefined {
  return RELATORIOS_FLAT.find((relatorio) => relatorio.slug === slug);
}
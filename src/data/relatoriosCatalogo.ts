import {
  Building2,
  UserCog,
  ScrollText,
  Users,
  UsersRound,
  FolderKanban,
  CalendarDays,
  GraduationCap,
  ClipboardCheck,
  Megaphone,
  ImageIcon,
  FileSignature,
  UserRoundCog,
  FileText,
  UsersIcon,
  MessageSquare,
  PiggyBank,
  Target,
  FileCheck2,
  Boxes,
  PackageOpen,
  CalendarClock,
  ShieldCheck,
  Award,
  Activity,
  ArrowRightLeft,
  Banknote,
  CircleDollarSign,
  HandCoins,
  HeartHandshake,
  Landmark,
  Receipt,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { resolveRelatorioSlug } from "@/data/relatorios";

export type RelatorioPlano = "gratis" | "pago";

export interface RelatorioCatalogoItem {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  plano: RelatorioPlano;
  tooltip: string;
}

export interface RelatorioCatalogoGrupo {
  id: string;
  titulo: string;
  descricao: string;
  itens: RelatorioCatalogoItem[];
}

export const RELATORIOS_CATALOGO: RelatorioCatalogoGrupo[] = [
  {
    id: "institucional",
    titulo: "Institucional",
    descricao:
      "Informações relacionadas à identificação institucional, representação, documentação e agentes culturais vinculados à organização ou iniciativa.",
    itens: [
      // TODO: adicionar "Dados Institucionais" quando o relatório estiver implementado.

      {
        slug: "diretoria",
        title: "Diretoria",
        description:
          "Reúne os membros cadastrados na diretoria e permite consultar seus cargos, períodos de mandato, situação, contatos e demais informações registradas.",
        icon: UserCog,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar quem faz ou fez parte da diretoria, qual cargo cada pessoa ocupa ou ocupou e durante qual período esteve vinculada à administração.",
      },
      {
        slug: "documentos",
        title: "Documentos",
        description:
          "Reúne os documentos institucionais cadastrados e permite consultar seu tipo, órgão emissor, datas de emissão e validade e situação.",
        icon: ScrollText,
        plano: "pago",
        tooltip:
          "Use este relatório para localizar documentos, acompanhar seus períodos de validade e identificar registros que precisam ser atualizados ou consultados em processos institucionais.",
      },
      {
        slug: "agentes",
        title: "Agentes Culturais",
        description:
          "Reúne os agentes culturais cadastrados, sejam pessoas, organizações, MEIs ou coletivos, e apresenta suas principais informações de identificação, contato e localização.",
        icon: UsersIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para localizar os agentes culturais registrados no sistema e consultar os dados utilizados quando eles são vinculados a projetos, propostas e outros processos.",
      },
    ],
  },

  {
    id: "pessoas-trajetorias",
    titulo: "Pessoas e Trajetórias",
    descricao:
      "Informações cadastrais, de vínculo, participação e trajetória das pessoas relacionadas à organização ou iniciativa.",
    itens: [
      {
        slug: "colaboradores",
        title: "Colaboradores",
        description:
          "Reúne os colaboradores cadastrados e permite consultar suas funções, tipos de vínculo, períodos de atuação, carga horária, contatos e situação atual.",
        icon: UserRoundCog,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar quem trabalha ou presta serviços, identificar a função exercida e consultar como e durante qual período cada colaborador está vinculado.",
      },
      {
        slug: "integrantes",
        title: "Integrantes",
        description:
          "Reúne os integrantes cadastrados e permite consultar suas funções, tipos de vínculo, períodos de participação, contatos e situação.",
        icon: UsersRound,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar quem faz parte da organização ou iniciativa, identificar como cada integrante participa de sua atuação e consultar seus períodos e tipos de vínculo.",
      },
      {
        slug: "participantes-geral",
        title: "Participantes",
        description:
          "Reúne os dados cadastrais das pessoas atendidas, incluindo informações pessoais, contatos, responsáveis, endereço, documentos e situação.",
        icon: Users,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar o cadastro do público atendido e localizar informações dos participantes e de seus responsáveis, quando houver.",
      },

      // TODO: adicionar "Currículos" quando o relatório estiver implementado.
      // TODO: adicionar "Trajetórias Culturais" quando o relatório estiver implementado.
    ],
  },

  {
    id: "projetos-planejamento",
    titulo: "Projetos e Planejamento",
    descricao:
      "Informações para acompanhar o planejamento dos projetos, os resultados pretendidos e as etapas previstas para sua realização.",
    itens: [
      {
        slug: "projetos",
        title: "Projetos",
        description:
          "Reúne os projetos cadastrados e permite consultar suas informações de identificação, objetivos, público, acessibilidade, local de realização, período, área de atuação e situação.",
        icon: FolderKanban,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar o planejamento geral de cada projeto e acompanhar o que será realizado, quem pretende atender, onde acontecerá, durante qual período e em que situação se encontra.",
      },
      {
        slug: "metas-projeto",
        title: "Metas do Projeto",
        description:
          "Reúne as metas definidas para os projetos e permite consultar o que deve ser realizado, a quantidade prevista e a forma estabelecida para comprovar seu cumprimento.",
        icon: Target,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar quais resultados foram definidos para cada projeto e como o cumprimento de cada meta deverá ser acompanhado e comprovado.",
      },
      {
        slug: "cronogramas",
        title: "Cronograma do Projeto",
        description:
          "Reúne as etapas previstas para a execução dos projetos e permite consultar seus períodos, situação e vínculos com atividades, eventos e ações de divulgação.",
        icon: CalendarClock,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a sequência prevista do projeto, verificar quando cada etapa deve ocorrer e identificar quais ações estão relacionadas a ela.",
      },
    ],
  },

  {
    id: "execucao",
    titulo: "Execução",
    descricao:
      "Informações para acompanhar como as ações planejadas são organizadas e realizadas durante a execução dos projetos.",
    itens: [
      {
        slug: "atividades",
        title: "Atividades",
        description:
          "Reúne as atividades cadastradas e permite consultar o projeto relacionado, tipo de atividade, público previsto, local, período de realização, quantidade de vagas e situação.",
        icon: Activity,
        plano: "gratis",
        tooltip:
          "Use este relatório para acompanhar as atividades planejadas ou realizadas e verificar a qual projeto pertencem, quando e onde acontecem e para qual público foram organizadas.",
      },
      {
        slug: "turmas",
        title: "Turmas",
        description:
          "Reúne as turmas vinculadas às atividades e permite consultar seus períodos de funcionamento, horários, dias de realização, quantidade de vagas, responsáveis e situação.",
        icon: GraduationCap,
        plano: "gratis",
        tooltip:
          "Use este relatório para acompanhar como o atendimento está organizado em turmas, consultar horários e vagas e identificar quem é responsável por sua realização.",
      },
      {
        slug: "planos-aula",
        title: "Plano de Aula",
        description:
          "Reúne os planos de aula vinculados às atividades e turmas e permite consultar conteúdos previstos, responsáveis, períodos de realização, reposições e situação.",
        icon: ClipboardCheck,
        plano: "gratis",
        tooltip:
          "Use este relatório para acompanhar o planejamento das aulas, identificar em qual atividade e turma cada plano será utilizado e verificar quando e por quem deverá ser realizado.",
      },

      // TODO: adicionar "Presenças" quando o relatório estiver implementado.

      {
        slug: "eventos-culturais",
        title: "Eventos Culturais",
        description:
          "Reúne os eventos culturais cadastrados e permite consultar projetos relacionados, período e local de realização, público, recursos de acessibilidade, resultados e situação.",
        icon: CalendarDays,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar os eventos culturais planejados ou realizados, verificar quando e onde aconteceram, quais projetos estão relacionados e quais resultados foram registrados.",
      },
    ],
  },

  {
    id: "evidencias",
    titulo: "Evidências",
    descricao:
      "Materiais registrados para demonstrar e comprovar a realização das ações desenvolvidas pela organização ou iniciativa.",
    itens: [
      {
        slug: "evidencias",
        title: "Evidências",
        description:
          "Reúne arquivos, links e outros materiais utilizados como comprovação e permite identificar a qual projeto, atividade, turma, evento, ação de divulgação ou outro registro cada evidência está vinculada.",
        icon: ImageIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para localizar os materiais que demonstram a realização das ações e verificar a qual parte da execução cada evidência foi relacionada.",
      },
    ],
  },

  {
    id: "editais-propostas",
    titulo: "Editais e Propostas",
    descricao:
      "Informações para acompanhar oportunidades, projetos apresentados, equipes, planejamento, habilitação e resultados dos processos de seleção.",
    itens: [
      {
        slug: "editais",
        title: "Editais",
        description:
          "Reúne os editais cadastrados e permite consultar órgãos responsáveis, esfera, períodos de inscrição, valores disponíveis e situação de cada oportunidade.",
        icon: FileSignature,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar oportunidades de interesse, consultar seus prazos e valores e verificar a situação de cada edital cadastrado.",
      },
      {
        slug: "propostas-editais",
        title: "Propostas de Edital",
        description:
          "Reúne os projetos apresentados aos editais e permite consultar suas informações de planejamento, organização proponente, projeto de referência, valores solicitados, data de submissão e situação.",
        icon: FileText,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar os projetos preparados ou apresentados aos editais, verificar a qual oportunidade estão relacionados, quanto foi solicitado e em que situação se encontram.",
      },
      {
        slug: "equipe-edital",
        title: "Equipe da Proposta",
        description:
          "Reúne as pessoas vinculadas às equipes dos projetos apresentados aos editais e permite consultar suas funções, carga horária prevista, valores e informações relacionadas à experiência de cada integrante.",
        icon: UsersIcon,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar quem compõe a equipe de cada proposta, qual função foi prevista para cada pessoa, sua dedicação e os valores relacionados à participação no projeto.",
      },
      {
        slug: "planos-comunicacao",
        title: "Plano de Comunicação",
        description:
          "Reúne os planos de comunicação vinculados aos projetos apresentados aos editais e permite consultar estratégias, públicos, períodos, quantidades previstas e situação.",
        icon: MessageSquare,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar como a comunicação de cada projeto foi planejada, quais estratégias estão previstas, para quais públicos e em quais períodos deverão ser realizadas.",
      },
      {
        slug: "acoes-divulgacao",
        title: "Ações de Divulgação",
        description:
          "Reúne as ações utilizadas para divulgar projetos e propostas e permite consultar sua realização, estratégias, recursos de acessibilidade, materiais produzidos, resultados e situação.",
        icon: Megaphone,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar como cada projeto está sendo divulgado, verificar os meios utilizados e consultar os materiais e resultados registrados em cada ação.",
      },
      {
        slug: "aplicacao-de-recursos",
        title: "Aplicação de Recursos",
        description:
          "Reúne os itens previstos para utilização dos recursos dos projetos apresentados aos editais e permite consultar classificação, quantidade, valores, período previsto e vínculos com integrantes da equipe.",
        icon: PiggyBank,
        plano: "pago",
        tooltip:
          "Use este relatório para entender como os recursos de cada proposta foram planejados, consultar os itens previstos e verificar quanto foi destinado a cada tipo de gasto.",
      },
      {
        slug: "habilitacoes-propostas",
        title: "Habilitação Documental",
        description:
          "Reúne o acompanhamento da documentação exigida nos processos de habilitação das propostas e permite consultar responsáveis, documentos, datas de envio, situação e demais registros do processo.",
        icon: ShieldCheck,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar os documentos exigidos em cada processo de habilitação, verificar o que foi enviado e identificar registros ou providências que ainda precisam de acompanhamento.",
      },
      {
        slug: "resultados-propostas",
        title: "Resultado da Proposta",
        description:
          "Reúne os resultados dos projetos apresentados aos editais e permite consultar situação, pontuação, avaliação, data do resultado e informações sobre recurso quando houver.",
        icon: Award,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar o resultado de cada proposta, consultar a avaliação recebida e acompanhar informações sobre recurso quando houver.",
      },
    ],
  },

  {
    id: "financeiro",
    titulo: "Financeiro",
    descricao:
      "Informações para acompanhar os recursos da organização ou iniciativa, desde o controle das contas até pagamentos, recebimentos, doações, movimentações e conferências bancárias.",
    itens: [
      // TODO: adicionar "Controle Financeiro" quando o relatório estiver implementado.

      {
        slug: "saldos-contas-bancarias",
        title: "Contas Bancárias",
        description:
          "Reúne as contas bancárias cadastradas e apresenta o saldo de cada uma conforme as entradas, saídas e transferências registradas no sistema.",
        icon: Landmark,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar as contas bancárias utilizadas pela organização e entender como os recursos estão distribuídos entre elas.",
      },
      {
        slug: "fornecedores-pagamentos",
        title: "Fornecedores",
        description:
          "Relaciona os fornecedores cadastrados com os pagamentos registrados para cada um deles e permite acompanhar valores, datas e informações das despesas relacionadas.",
        icon: HandCoins,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar os fornecedores cadastrados e verificar movimentações financeiras e pagamentos relacionados a cada um deles.",
      },
      {
        slug: "doadores",
        title: "Doadores",
        description:
          "Relaciona os doadores cadastrados com as doações registradas e permite acompanhar a quantidade de contribuições, os tipos de doação e os valores ou itens recebidos.",
        icon: HeartHandshake,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar o histórico de contribuições de cada doador e acompanhar quem tem apoiado a organização ou iniciativa por meio de doações.",
      },
      {
        slug: "parceiros",
        title: "Parceiros",
        description:
          "Relaciona os parceiros cadastrados com os registros financeiros vinculados às parcerias e permite consultar valores recebidos ou pagamentos realizados.",
        icon: UsersRound,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar os parceiros e verificar quais valores recebidos ou pagos foram relacionados a cada parceria.",
      },
      {
        slug: "contas-pagar",
        title: "Contas a Pagar",
        description:
          "Reúne as despesas cadastradas e permite acompanhar valores, datas de vencimento, pagamentos realizados e situações pendentes ou vencidas.",
        icon: Receipt,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar o que ainda precisa ser pago, identificar despesas próximas do vencimento ou vencidas e consultar pagamentos já realizados.",
      },
      {
        slug: "contas-receber",
        title: "Contas a Receber",
        description:
          "Reúne as receitas cadastradas e permite acompanhar valores, datas de vencimento, recebimentos realizados e situações pendentes ou vencidas.",
        icon: Banknote,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar os valores que ainda precisam ser recebidos, identificar recebimentos próximos do vencimento ou vencidos e consultar o que já entrou.",
      },
      {
        slug: "doacoes-recebidas",
        title: "Doações",
        description:
          "Reúne as doações financeiras e não financeiras cadastradas e permite consultar doadores, valores ou quantidades, datas de recebimento, destinação e situação.",
        icon: HeartHandshake,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar as doações recebidas, identificar quem realizou cada contribuição e verificar os valores, itens ou serviços e suas respectivas destinações.",
      },
      {
        slug: "transferencias-bancarias",
        title: "Transferências Bancárias",
        description:
          "Reúne as transferências realizadas entre contas bancárias e permite consultar conta de origem, conta de destino, data, valor, forma e situação.",
        icon: WalletCards,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar os valores movimentados entre as próprias contas e verificar de onde cada recurso saiu e para onde foi transferido.",
      },
      {
        slug: "movimentacoes-financeiras",
        title: "Movimentações Bancárias",
        description:
          "Reúne as entradas e saídas registradas nas contas bancárias e permite identificar a conta movimentada, a data, o valor e a origem de cada registro.",
        icon: ArrowRightLeft,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar o histórico das movimentações bancárias e identificar a origem de cada entrada e saída registrada.",
      },
      {
        slug: "conciliacao-bancaria",
        title: "Conciliação Bancária",
        description:
          "Reúne as conciliações realizadas entre as movimentações registradas na Aurit e os extratos bancários e apresenta o que já foi conferido e o que ainda precisa de revisão.",
        icon: ClipboardCheck,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a conferência das contas bancárias e identificar movimentações que ainda precisam ser verificadas para confirmar se os registros correspondem aos extratos.",
      },
      {
        slug: "fluxo-caixa",
        title: "Fluxo de Caixa",
        description:
          "Relaciona as entradas e saídas já realizadas com os valores previstos para os próximos períodos e apresenta como essas movimentações alteram o saldo ao longo do tempo.",
        icon: CircleDollarSign,
        plano: "pago",
        tooltip:
          "Use este relatório para comparar o que já entrou e saiu com os valores que ainda estão previstos e acompanhar como essas movimentações podem afetar o saldo.",
      },
    ],
  },

  {
    id: "prestacao-contas",
    titulo: "Prestação de Contas",
    descricao:
      "Informações para acompanhar a preparação das prestações de contas e demonstrar a execução dos projetos, o cumprimento das metas e os resultados alcançados.",
    itens: [
      {
        slug: "prestacoes-metas",
        title: "Cumprimento de Metas",
        description:
          "Relaciona as metas previstas com as quantidades efetivamente realizadas e apresenta seu percentual de execução, situação de cumprimento e informações registradas para demonstrar os resultados.",
        icon: Target,
        plano: "pago",
        tooltip:
          "Use este relatório para comparar o que foi previsto com o que foi realizado em cada meta e identificar resultados cumpridos, parcialmente cumpridos ou que ainda precisam de acompanhamento ou justificativa.",
      },
      {
        slug: "prestacoes-contas",
        title: "Prestação de Contas",
        description:
          "Reúne as prestações de contas cadastradas e permite consultar propostas relacionadas, responsáveis, datas de entrega, metas avaliadas, produtos apresentados, análises e situação.",
        icon: FileCheck2,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar a preparação e a situação das prestações de contas e consultar os registros utilizados para demonstrar a execução e os resultados dos projetos.",
      },
    ],
  },

  {
    id: "patrimonio",
    titulo: "Patrimônio",
    descricao:
      "Informações para acompanhar os bens da organização ou iniciativa, suas características, situação, conservação e os empréstimos realizados.",
    itens: [
      {
        slug: "patrimonios",
        title: "Patrimônios",
        description:
          "Reúne os bens patrimoniais cadastrados e permite consultar sua identificação, características, data e valor de aquisição, estado de conservação e situação atual.",
        icon: Boxes,
        plano: "pago",
        tooltip:
          "Use este relatório para localizar os bens cadastrados, consultar suas principais características e acompanhar valor, conservação e situação atual.",
      },
      {
        slug: "emprestimos",
        title: "Empréstimos",
        description:
          "Reúne os empréstimos de bens patrimoniais e permite consultar destinatários, datas de retirada e devolução, finalidade de utilização, condições de conservação e situação.",
        icon: PackageOpen,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar quais bens foram emprestados, quem está responsável por cada um, quando devem ser devolvidos e em quais condições foram entregues ou recebidos de volta.",
      },
    ],
  },

  /*
   * =============================================================
   * RELATÓRIOS GERENCIAIS
   *
   * Ficam por último porque são análises transversais que cruzam
   * informações dos módulos anteriores.
   * =============================================================
   */

  {
    id: "relatorios-gerenciais",
    titulo: "Relatórios Gerenciais",
    descricao:
      "Análises consolidadas que relacionam informações de diferentes áreas para acompanhar o planejamento, a execução, o público atendido, os resultados e a regularidade da organização ou iniciativa.",
    itens: [
      {
        slug: "geral-projetos",
        title: "Geral de Projetos",
        description:
          "Reúne os projetos em uma visão consolidada, relacionando situação, período de execução, áreas de atuação, responsáveis, metas, atividades e eventos vinculados.",
        icon: FolderKanban,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar vários projetos em conjunto, comparar o andamento de cada um e identificar o que está planejado, em execução ou concluído.",
      },
      {
        slug: "execucao-atividades",
        title: "Execução das Atividades",
        description:
          "Relaciona as atividades com os projetos, turmas, vagas disponíveis, participantes vinculados, registros de frequência e colaboradores envolvidos em sua realização.",
        icon: Activity,
        plano: "pago",
        tooltip:
          "Use este relatório para verificar como as atividades estão sendo executadas, quantas pessoas estão vinculadas, quanto das vagas disponíveis está preenchido e como está a frequência dos participantes.",
      },
      {
        slug: "turmas-atendimento",
        title: "Turmas e Atendimento",
        description:
          "Relaciona as turmas com suas atividades, equipe responsável, participantes, vagas disponíveis, percentual de vagas preenchidas, horários e registros de presença.",
        icon: GraduationCap,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar o atendimento realizado em cada turma, verificar quantas vagas estão disponíveis ou preenchidas e entender como os participantes estão distribuídos entre as atividades.",
      },
      {
        slug: "metas-resultados",
        title: "Metas e Resultados",
        description:
          "Relaciona as metas previstas nos projetos com as quantidades executadas, o percentual alcançado, a situação de cumprimento e os registros utilizados para demonstrar os resultados.",
        icon: Target,
        plano: "pago",
        tooltip:
          "Use este relatório para comparar o que foi planejado com o que foi realizado e identificar metas cumpridas, parcialmente cumpridas ou que ainda precisam de acompanhamento.",
      },
      {
        slug: "cronograma-prazos",
        title: "Cronograma e Prazos",
        description:
          "Reúne as etapas previstas nos cronogramas dos projetos e relaciona seus períodos, vínculos e situação ao longo da execução.",
        icon: CalendarClock,
        plano: "pago",
        tooltip:
          "Use este relatório para acompanhar quando cada etapa está prevista, verificar o que já começou ou foi concluído e identificar prazos que precisam de atenção.",
      },
      {
        slug: "impacto-social-cultural",
        title: "Impacto Social e Cultural",
        description:
          "Relaciona informações do público atendido com sua participação nas atividades, turmas e demais ações, considerando características sociais e registros de frequência.",
        icon: UsersRound,
        plano: "pago",
        tooltip:
          "Use este relatório para compreender quem está sendo atendido, como esse público participa das ações e qual é o alcance social e cultural da organização ou iniciativa.",
      },
      {
        slug: "institucional-organizacao",
        title: "Institucional da Organização",
        description:
          "Reúne informações institucionais com dados sobre a estrutura administrativa, a composição da diretoria, os cargos e os períodos de mandato registrados.",
        icon: Building2,
        plano: "pago",
        tooltip:
          "Use este relatório para consultar em uma única visão as principais informações institucionais e, quando houver diretoria cadastrada, acompanhar quem exerce cada função e durante qual período.",
      },
      {
        slug: "regularidade-documental",
        title: "Regularidade Documental",
        description:
          "Reúne os documentos institucionais e permite acompanhar suas datas de emissão e validade, situação atual e demais informações registradas.",
        icon: ShieldCheck,
        plano: "pago",
        tooltip:
          "Use este relatório para identificar documentos válidos, próximos do vencimento ou vencidos e acompanhar quais registros precisam de atualização.",
      },
      {
        slug: "receitas-despesas-categoria",
        title: "Receitas e Despesas por Categoria",
        description:
          "Agrupa as entradas e saídas conforme suas classificações financeiras e permite comparar quanto foi recebido ou utilizado em cada categoria.",
        icon: PiggyBank,
        plano: "pago",
        tooltip:
          "Use este relatório para entender de onde vêm os recursos e em quais tipos de despesas os valores da organização ou iniciativa estão sendo utilizados.",
      },
    ],
  },
];

export const RELATORIOS_FLAT: RelatorioCatalogoItem[] =
  RELATORIOS_CATALOGO.flatMap((grupo) => grupo.itens);

export function findRelatorioBySlug(
  slug: string,
): RelatorioCatalogoItem | undefined {
  const resolvedSlug = resolveRelatorioSlug(slug);

  return RELATORIOS_FLAT.find(
    (relatorio) =>
      relatorio.slug === slug ||
      relatorio.slug === resolvedSlug ||
      resolveRelatorioSlug(relatorio.slug) === resolvedSlug,
  );
}

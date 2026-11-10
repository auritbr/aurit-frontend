import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  CalendarRange,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  FolderKanban,
  GraduationCap,
  Landmark,
  Percent,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  Target,
  Users,
  Users2,
} from "lucide-react";

import type { BackendReportConfig } from "@/components/relatorios/BackendReportPage";
import { reportEnumLabel } from "@/data/relatoriosEspecializados";
import {
  buscarRelatorioFinanceiro,
  type FiltrosFinanceiros,
} from "@/lib/relatoriosFinanceirosApi";

const search = (placeholder: string) => ({
  key: "busca",
  label: "Busca",
  tooltip:
    "Digite uma informação relacionada ao registro que deseja localizar neste relatório.",
  type: "search" as const,
  placeholder,
  options: () => [],
});

const enumOptions = (path: string) => (data: Record<string, unknown> | null) =>
  ((data?.[path] as string[] | undefined) ?? []).map((value) => ({
    value,
    label: reportEnumLabel(value),
  }));

const entityOptions =
  (path: string) => (data: Record<string, unknown> | null) =>
    ((data?.[path] as { id: number; nome: string }[] | undefined) ?? []).map(
      (item) => ({
        value: String(item.id),
        label: item.nome,
      }),
    );

const reportFilter = (
  key: string,
  label: string,
  type: "multi" | "select",
  options: BackendReportConfig["filters"][number]["options"],
) => ({
  key,
  label,
  type,
  options,
  tooltip: `Filtre os registros por ${label.toLowerCase()}.`,
});

const carregarFinanceiroGenerico =
  (slug: string) => async (filters: Record<string, unknown>) =>
    (await buscarRelatorioFinanceiro(slug, {
      busca: String(filters.busca ?? ""),
    } as FiltrosFinanceiros)) as unknown as Record<string, unknown>;

const colunasContato = [
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
] as const;

const colunasEndereco = [
  { key: "cep", label: "CEP" },
  { key: "logradouro", label: "Logradouro" },
  { key: "numero", label: "Número" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
] as const;

export const doadoresConfig: BackendReportConfig = {
  endpoint: "financeiros/doadores",
  pdfSlug: "doadores",
  loader: carregarFinanceiroGenerico("doadores"),
  title: "Doadores",
  tooltip:
    "Nesta página são reunidos os doadores cadastrados e as doações financeiras relacionadas a cada um deles. Consulte os dados cadastrais, a quantidade de doações e os valores registrados para acompanhar o histórico de contribuições recebidas pela organização.",
  objective:
    "Acompanhe os doadores cadastrados pela organização e consulte suas informações, a quantidade de doações relacionadas e o total financeiro registrado para cada doador.",
  tableTitle: "Doadores e doações",
  rowsPath: "linhas",
  filters: [search("Buscar doador...")],
  stats: [
    {
      label: "Total doado",
      path: "indicadores.4.valor",
      icon: CircleDollarSign,
      tone: "success",
      format: "currency",
    },
    {
      label: "Doadores",
      path: "indicadores.0.quantidade",
      icon: Users,
      tone: "info",
    },
    {
      label: "Doações",
      path: "indicadores.2.quantidade",
      icon: BadgeCheck,
      tone: "warning",
    },
  ],
  charts: [
    {
      title: "Valores doados por doador",
      description:
        "Compare o total financeiro registrado em doações para cada doador.",
      path: "graficos.0.dados",
      type: "bar",
      nameKey: "label",
      valueKey: "valor",
      currency: true,
    },
    {
      title: "Valores por tipo de doação",
      description:
        "Veja como os valores das doações financeiras estão distribuídos entre os tipos de doação registrados.",
      path: "graficos.1.dados",
      type: "pie",
      nameKey: "label",
      valueKey: "valor",
      currency: true,
    },
  ],
  columns: [
    { key: "doador", label: "Doador" },
    { key: "documento", label: "Documento" },
    { key: "quantidade", label: "Doações" },
    { key: "valor", label: "Total doado" },
    {
      key: "tipoPessoa",
      label: "Tipo de pessoa",
      format: "enum",
      hiddenByDefault: true,
    },
    {
      key: "situacao",
      label: "Situação",
      format: "enum",
      hiddenByDefault: true,
    },
    {
      key: "origem",
      label: "Origem",
      format: "enum",
      hiddenByDefault: true,
    },
    ...colunasContato.map((column) => ({
      ...column,
      hiddenByDefault: true,
    })),
    {
      key: "observacao",
      label: "Observação",
      hiddenByDefault: true,
    },
  ],
  emptyMessage: "Nenhum doador encontrado com os filtros selecionados.",
};

export const parceirosConfig: BackendReportConfig = {
  endpoint: "financeiros/parceiros",
  pdfSlug: "parceiros",
  loader: carregarFinanceiroGenerico("parceiros"),
  title: "Parceiros",
  tooltip:
    "Nesta página são reunidos os parceiros cadastrados e os registros financeiros relacionados às parcerias. Consulte os dados cadastrais e acompanhe valores recebidos, valores a receber, pagamentos realizados e valores ainda a pagar.",
  objective:
    "Acompanhe os parceiros cadastrados pela organização e consulte seus dados, períodos de parceria, contribuições e valores financeiros relacionados a cada vínculo.",
  tableTitle: "Parceiros e movimentações",
  rowsPath: "linhas",
  filters: [search("Buscar parceiro...")],
  stats: [
    {
      label: "Recebido de parceiros",
      path: "indicadores.2.valor",
      icon: CircleDollarSign,
      tone: "success",
      format: "currency",
    },
    {
      label: "Pago a parceiros",
      path: "indicadores.3.valor",
      icon: CircleDollarSign,
      tone: "warning",
      format: "currency",
    },
    {
      label: "Parceiros",
      path: "indicadores.0.quantidade",
      icon: Users,
      tone: "info",
    },
  ],
  charts: [
    {
      title: "Valores recebidos de parceiros",
      description:
        "Compare os valores recebidos pela organização que foram relacionados a cada parceiro.",
      path: "graficos.0.dados",
      type: "bar",
      nameKey: "label",
      valueKey: "valor",
      currency: true,
    },
    {
      title: "Valores pagos a parceiros",
      description:
        "Compare os valores pagos pela organização que foram relacionados a cada parceiro.",
      path: "graficos.1.dados",
      type: "bar",
      nameKey: "label",
      valueKey: "valor",
      currency: true,
    },
  ],
  columns: [
    { key: "fornecedor", label: "Parceiro" },
    { key: "documento", label: "Documento" },
    { key: "valorPago", label: "Recebido do parceiro" },
    { key: "valorPendente", label: "A receber do parceiro" },
    { key: "valorRecebido", label: "Pago ao parceiro" },
    { key: "valorAReceber", label: "A pagar ao parceiro" },
    {
      key: "tipoPessoa",
      label: "Tipo de pessoa",
      format: "enum",
      hiddenByDefault: true,
    },
    {
      key: "situacao",
      label: "Situação",
      format: "enum",
      hiddenByDefault: true,
    },
    {
      key: "tipo",
      label: "Tipos de parceria",
      hiddenByDefault: true,
    },
    {
      key: "dataInicio",
      label: "Início",
      format: "date",
      hiddenByDefault: true,
    },
    {
      key: "dataFim",
      label: "Fim",
      format: "date",
      hiddenByDefault: true,
    },
    ...colunasContato.map((column) => ({
      ...column,
      hiddenByDefault: true,
    })),
    ...colunasEndereco.map((column) => ({
      ...column,
      hiddenByDefault: true,
    })),
    {
      key: "descricaoParceria",
      label: "Descrição da parceria",
      hiddenByDefault: true,
    },
    {
      key: "contribuicaoParceiro",
      label: "Contribuição do parceiro",
      hiddenByDefault: true,
    },
    {
      key: "contribuicaoOrganizacao",
      label: "Contribuição da organização",
      hiddenByDefault: true,
    },
    {
      key: "observacao",
      label: "Observação",
      hiddenByDefault: true,
    },
  ],
  emptyMessage: "Nenhum parceiro encontrado com os filtros selecionados.",
};

export const execucaoAtividadesConfig: BackendReportConfig = {
  endpoint: "execucao-atividades",
  title: "Execução das Atividades",
  tooltip:
    "Nesta página são relacionadas as atividades com suas turmas, vagas disponíveis, participantes vinculados e registros de presença. O percentual de vagas preenchidas mostra quanto das vagas disponíveis já possui participantes vinculados.",
  objective:
    "Acompanhe como as atividades estão sendo executadas, verificando suas turmas, a quantidade de vagas disponíveis, quantos participantes estão vinculados e a frequência registrada. Compare também o preenchimento das vagas com a presença dos participantes em cada atividade.",
  tableTitle: "Execução das atividades",
  rowsPath: "atividades",
  filters: [
    search("Buscar atividade..."),
    reportFilter("status", "Status", "multi", enumOptions("statusDisponiveis")),
    reportFilter(
      "tipos",
      "Tipo de atividade",
      "multi",
      enumOptions("tiposDisponiveis"),
    ),
    reportFilter(
      "projetoId",
      "Projeto",
      "select",
      entityOptions("projetosDisponiveis"),
    ),
  ],
  stats: [
    {
      label: "Atividades",
      path: "totalAtividades",
      icon: CalendarRange,
    },
    {
      label: "Turmas",
      path: "totalTurmas",
      icon: GraduationCap,
      tone: "info",
    },
    {
      label: "Participantes",
      path: "totalParticipantes",
      icon: Users,
      tone: "success",
    },
    {
      label: "% Presença média",
      path: "percentualPresencaMedio",
      icon: Percent,
      tone: "warning",
      format: "percent",
    },
  ],
  charts: [
    {
      title: "Vagas preenchidas x frequência por atividade",
      selection: { label: "Atividade", values: (row) => row.atividade },
      description:
        "Compare o percentual de vagas preenchidas por participantes vinculados com o percentual de presença efetivamente registrado em cada atividade.",
      path: "atividades",
      type: "comparison",
      nameKey: "atividade",
      series: [
        {
          key: "ocupacao",
          label: "% Vagas preenchidas",
        },
        {
          key: "percentualPresenca",
          label: "% Presença",
        },
      ],
    },
    {
      title: "Atividades por tipo",
      description:
        "Veja quantas atividades foram registradas em cada tipo e como elas estão distribuídas entre os diferentes formatos de realização.",
      path: "atividadesPorTipo",
      selection: { label: "Tipo", values: (row) => row.tipo },
      type: "bar",
    },
    {
      title: "Atividades por status",
      description: "Distribuição dos registros filtrados.",
      path: "atividadesPorStatus",
      type: "pie",
      selection: { label: "Status", values: (row) => row.status },
    },
  ],
  columns: [
    { key: "atividade", label: "Atividade" },
    { key: "tipo", label: "Tipo", format: "enum" },
    {
      key: "status",
      label: "Status",
      format: "enum",
      statusContext: "atividade",
    },
    { key: "projeto", label: "Projeto" },
    { key: "inicio", label: "Início", format: "date" },
    { key: "fim", label: "Término", format: "date" },
    { key: "turmas", label: "Turmas" },
    { key: "vagas", label: "Vagas" },
    { key: "participantes", label: "Participantes" },
    {
      key: "ocupacao",
      label: "% Vagas preenchidas",
      format: "percent",
    },
    {
      key: "percentualPresenca",
      label: "% Presença",
      format: "percent",
    },
    { key: "colaboradores", label: "Colaboradores" },
  ],
  emptyMessage: "Nenhuma atividade encontrada com os filtros selecionados.",
};

export const geralProjetosConfig: BackendReportConfig = {
  endpoint: "geral-projetos",
  title: "Geral de Projetos",
  tooltip:
    "Nesta página são reunidas informações dos projetos da organização para comparar sua situação, áreas de atuação, agentes vinculados, períodos e quantidade de atividades, eventos e metas relacionadas.",
  objective:
    "Acompanhe os projetos da organização em uma visão consolidada e compare seus vínculos, períodos, situação e principais registros de execução.",
  tableTitle: "Projetos da organização",
  rowsPath: "projetos",
  filters: [
    search("Buscar projeto..."),
    reportFilter("status", "Status", "multi", enumOptions("statusDisponiveis")),
    reportFilter(
      "areas",
      "Área de atuação",
      "multi",
      enumOptions("areasDisponiveis"),
    ),
    reportFilter(
      "agenteId",
      "Agente responsável",
      "select",
      entityOptions("agentesDisponiveis"),
    ),
  ],
  stats: [
    {
      label: "Projetos",
      path: "totalProjetos",
      icon: FolderKanban,
    },
    {
      label: "Em execução",
      path: "projetosEmExecucao",
      icon: PlayCircle,
      tone: "success",
    },
    {
      label: "Concluídos",
      path: "projetosConcluidos",
      icon: CheckCircle2,
      tone: "info",
    },
    {
      label: "Metas vinculadas",
      path: "totalMetas",
      icon: Target,
      tone: "warning",
    },
  ],
  charts: [
    {
      title: "Estrutura de execução por projeto",
      selection: { label: "Projeto", values: (row) => row.projeto },
      description:
        "Compare a quantidade de atividades, eventos e metas vinculados a cada projeto para visualizar como sua execução está estruturada.",
      path: "projetos",
      type: "comparison",
      nameKey: "projeto",
      series: [
        { key: "atividades", label: "Atividades" },
        { key: "eventos", label: "Eventos" },
        { key: "metas", label: "Metas" },
      ],
    },
    {
      title: "Projetos por área",
      description:
        "Veja como os projetos estão distribuídos entre as diferentes áreas de atuação registradas pela organização.",
      path: "projetosPorArea",
      selection: { label: "Área", values: (row) => row.areas },
      type: "bar",
    },
    {
      title: "Projetos por status",
      description: "Distribuição dos registros filtrados.",
      path: "projetosPorStatus",
      type: "pie",
      selection: { label: "Status", values: (row) => row.status },
    },
  ],
  columns: [
    { key: "projeto", label: "Projeto" },
    {
      key: "status",
      label: "Status",
      format: "enum",
      statusContext: "projeto",
    },
    { key: "areas", label: "Áreas", format: "array" },
    { key: "agente", label: "Agente" },
    { key: "local", label: "Local" },
    { key: "inicio", label: "Início", format: "date" },
    { key: "fim", label: "Término", format: "date" },
    { key: "atividades", label: "Atividades" },
    { key: "eventos", label: "Eventos" },
    { key: "metas", label: "Metas" },
    { key: "colaboradores", label: "Colaboradores" },
  ],
  emptyMessage: "Nenhum projeto encontrado com os filtros selecionados.",
};

export const turmasAtendimentoConfig: BackendReportConfig = {
  endpoint: "turmas-atendimento",
  title: "Turmas e Atendimento",
  tooltip:
    "Nesta página são relacionadas as turmas com suas atividades, horários, vagas disponíveis, participantes vinculados e registros de presença. O percentual de vagas preenchidas mostra quanto das vagas de cada turma já possui participantes vinculados.",
  objective:
    "Acompanhe o atendimento realizado em cada turma, verificando a atividade vinculada, os horários, a quantidade de vagas disponíveis, quantos participantes estão vinculados e a frequência registrada.",
  tableTitle: "Turmas e atendimento",
  rowsPath: "turmas",
  filters: [
    search("Buscar turma..."),
    reportFilter(
      "atividadeId",
      "Atividade",
      "select",
      entityOptions("atividadesDisponiveis"),
    ),
    reportFilter("status", "Status", "multi", enumOptions("statusDisponiveis")),
    reportFilter(
      "dias",
      "Dia da atividade",
      "multi",
      enumOptions("diasDisponiveis"),
    ),
  ],
  stats: [
    {
      label: "Turmas",
      path: "totalTurmas",
      icon: GraduationCap,
    },
    {
      label: "Participantes",
      path: "totalParticipantes",
      icon: Users,
      tone: "success",
    },
    {
      label: "Ocupação média",
      path: "ocupacaoMedia",
      icon: CalendarClock,
      tone: "info",
      format: "percent",
    },
    {
      label: "% Presença média",
      path: "percentualPresencaMedio",
      icon: Percent,
      tone: "warning",
      format: "percent",
    },
  ],
  charts: [
    {
      title: "Participantes por turma",
      description: "Volume de atendimento em cada turma.",
      path: "participantesPorTurma",
      type: "bar",
      label: (value) => value,
      selection: { label: "Turma", values: (row) => row.turma },
    },
    {
      title: "Vagas preenchidas x frequência por turma",
      selection: { label: "Turma", values: (row) => row.turma },
      description:
        "Compare o percentual de vagas preenchidas por participantes vinculados com o percentual de presença efetivamente registrado em cada turma.",
      path: "turmas",
      type: "comparison",
      nameKey: "turma",
      series: [
        {
          key: "percentualOcupacao",
          label: "% Vagas preenchidas",
        },
        {
          key: "percentualPresenca",
          label: "% Presença",
        },
      ],
    },
    {
      title: "Participantes x vagas por turma",
      selection: { label: "Turma", values: (row) => row.turma },
      description:
        "Compare a quantidade de participantes vinculados com o número de vagas disponíveis para identificar turmas que ainda possuem vagas ou que ultrapassaram a quantidade prevista.",
      path: "turmas",
      type: "comparison",
      nameKey: "turma",
      series: [
        {
          key: "participantes",
          label: "Participantes",
        },
        {
          key: "vagas",
          label: "Vagas",
        },
      ],
    },
    {
      title: "Turmas por status",
      description: "Distribuição dos registros filtrados.",
      path: "turmasPorStatus",
      type: "pie",
      selection: { label: "Status", values: (row) => row.status },
    },
  ],
  columns: [
    { key: "turma", label: "Turma" },
    { key: "atividade", label: "Atividade" },
    {
      key: "status",
      label: "Status",
      format: "enum",
      statusContext: "turma",
    },
    {
      key: "dias",
      label: "Dias",
      format: "enum",
    },
    { key: "horarios", label: "Dias e horários" },
    { key: "participantes", label: "Participantes" },
    { key: "vagas", label: "Vagas" },
    {
      key: "percentualOcupacao",
      label: "% Vagas preenchidas",
      format: "percent",
    },
    { key: "registrosPresenca", label: "Registros de presença" },
    {
      key: "percentualPresenca",
      label: "% Presença",
      format: "percent",
    },
    { key: "equipeResponsavel", label: "Equipe responsável" },
  ],
  emptyMessage: "Nenhuma turma encontrada com os filtros selecionados.",
};

export const regularidadeDocumentalConfig: BackendReportConfig = {
  endpoint: "regularidade-documental",
  title: "Regularidade Documental",
  tooltip:
    "Nesta página são reunidos os documentos institucionais para acompanhar datas de emissão e validade, situação atual, pendências e arquivos anexados.",
  objective:
    "Acompanhe a situação dos documentos institucionais e identifique quais estão vigentes, vencidos ou aguardando alguma providência, facilitando a atualização da documentação da organização.",
  tableTitle: "Documentos institucionais",
  tableDescription: (data) =>
    `${Number(data?.documentosPendentes ?? 0)} documento(s) entre os resultados filtrados ainda precisa(m) de alguma providência.`,
  rowsPath: "documentos",
  filters: [
    search("Buscar documento..."),
    reportFilter(
      "tipos",
      "Tipo de documento",
      "multi",
      enumOptions("tiposDisponiveis"),
    ),
    reportFilter("status", "Status", "multi", enumOptions("statusDisponiveis")),
    reportFilter(
      "situacao",
      "Situação",
      "select",
      enumOptions("situacoesDisponiveis"),
    ),
  ],
  stats: [
    {
      label: "Documentos",
      path: "totalDocumentos",
      icon: FileCheck2,
    },
    {
      label: "Regulares",
      path: "documentosRegulares",
      icon: ShieldCheck,
      tone: "success",
    },
    {
      label: "Vencidos",
      path: "documentosVencidos",
      icon: FileWarning,
      tone: "danger",
    },
    {
      label: "% Regularidade",
      path: "percentualRegularidade",
      icon: Percent,
      tone: "warning",
      format: "percent",
    },
  ],
  charts: [
    {
      title: "Documentos por status",
      description:
        "Veja quantos documentos estão registrados em cada status para identificar a situação dos cadastros institucionais.",
      path: "documentosPorStatus",
      selection: { label: "Status", values: (row) => row.status },
      type: "bar",
    },
    {
      title: "Situação de vigência",
      description:
        "Veja quantos documentos estão vigentes, vencidos ou não possuem validade aplicável.",
      path: "documentosPorSituacao",
      selection: { label: "Vigência", values: (row) => row.situacao },
      type: "pie",
    },
  ],
  columns: [
    {
      key: "tipo",
      label: "Tipo de documento",
      format: "enum",
    },
    { key: "orgaoEmissor", label: "Órgão emissor" },
    {
      key: "dataEmissao",
      label: "Emissão",
      format: "date",
    },
    {
      key: "dataValidade",
      label: "Validade",
      format: "date",
    },
    {
      key: "situacao",
      label: "Situação",
      format: "enum",
      statusContext: "validade-documento",
    },
    {
      key: "status",
      label: "Status",
      format: "enum",
      statusContext: "documento",
    },
    {
      key: "arquivoAnexado",
      label: "Arquivo",
      accessor: (row) => (row.arquivoAnexado ? "Anexado" : "Não anexado"),
    },
    { key: "organizacao", label: "Organização" },
  ],
  emptyMessage: "Nenhum documento encontrado com os filtros selecionados.",
};

export const metasResultadosConfig: BackendReportConfig = {
  endpoint: "metas-resultados",
  title: "Metas e Resultados",
  tooltip:
    "Nesta página são comparadas as metas previstas com os resultados registrados para acompanhar quanto foi executado, a situação de cumprimento e as evidências disponíveis.",
  objective:
    "Acompanhe o cumprimento das metas comparando o que foi previsto com o que foi efetivamente realizado e consulte as informações e evidências registradas para demonstrar os resultados alcançados.",
  tableTitle: "Metas e resultados",
  rowsPath: "metas",
  filters: [
    search("Buscar meta..."),
    reportFilter(
      "projetoId",
      "Projeto",
      "select",
      entityOptions("projetosDisponiveis"),
    ),
    reportFilter(
      "situacoes",
      "Situação",
      "multi",
      enumOptions("situacoesDisponiveis"),
    ),
    reportFilter(
      "cumprimentos",
      "Cumprimento",
      "multi",
      enumOptions("cumprimentosDisponiveis"),
    ),
  ],
  stats: [
    {
      label: "Metas",
      path: "totalMetas",
      icon: Target,
    },
    {
      label: "Executado",
      path: "totalExecutado",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Não cumpridas",
      path: "metasNaoCumpridas",
      icon: AlertTriangle,
      tone: "danger",
    },
    {
      label: "% Execução",
      path: "percentualExecucao",
      icon: Percent,
      tone: "info",
      format: "percent",
    },
  ],
  charts: [
    {
      title: "Previsto x executado por meta",
      selection: { label: "Meta", values: (row) => row.meta },
      description:
        "Compare a quantidade prevista para cada meta com a quantidade efetivamente realizada para visualizar o avanço dos resultados.",
      path: "metas",
      type: "comparison",
      nameKey: "meta",
      series: [
        { key: "previsto", label: "Previsto" },
        { key: "executado", label: "Executado" },
      ],
    },
    {
      title: "% de execução por meta",
      description:
        "Veja o percentual alcançado em cada meta para identificar resultados abaixo, dentro ou acima da quantidade prevista.",
      path: "percentualExecucaoPorMeta",
      selection: { label: "Meta", values: (row) => row.meta },
      type: "bar",
      nameKey: "nome",
      valueKey: "valor",
      label: (value) => value,
    },
    {
      title: "Metas por nível de cumprimento",
      description: "Distribuição dos registros filtrados.",
      path: "metasPorCumprimento",
      type: "pie",
      selection: { label: "Cumprimento", values: (row) => row.cumprimento },
    },
  ],
  columns: [
    { key: "meta", label: "Meta" },
    { key: "projeto", label: "Projeto" },
    { key: "proposta", label: "Proposta" },
    {
      key: "situacao",
      label: "Situação",
      format: "enum",
      statusContext: "meta-resultado",
    },
    {
      key: "cumprimento",
      label: "Cumprimento",
      format: "enum",
    },
    { key: "previsto", label: "Previsto" },
    { key: "executado", label: "Executado" },
    {
      key: "percentualExecucao",
      label: "% Execução",
      format: "percent",
    },
    {
      key: "prazoProjeto",
      label: "Prazo",
      format: "date",
    },
    { key: "evidencias", label: "Evidências" },
  ],
  emptyMessage: "Nenhuma meta encontrada com os filtros selecionados.",
};

export const institucionalOrganizacaoConfig: BackendReportConfig = {
  endpoint: "institucional-organizacao",
  title: "Institucional da Organização",
  tooltip:
    "Nesta página são reunidas informações sobre a composição da diretoria para acompanhar seus membros, cargos, períodos de mandato e situação dos vínculos institucionais.",
  objective:
    "Consulte a estrutura administrativa da organização e acompanhe quem integra ou integrou a diretoria, os cargos exercidos, os períodos de mandato e a situação de cada vínculo.",
  tableTitle: "Membros da diretoria",
  rowsPath: "membros",
  filters: [
    search("Buscar membro..."),
    reportFilter(
      "organizacaoId",
      "Organização",
      "select",
      entityOptions("organizacoesDisponiveis"),
    ),
    reportFilter("cargos", "Cargo", "multi", enumOptions("cargosDisponiveis")),
    reportFilter("status", "Status", "multi", enumOptions("statusDisponiveis")),
  ],
  stats: [
    {
      label: "Organizações",
      path: "totalOrganizacoes",
      icon: Landmark,
    },
    {
      label: "Diretoria",
      path: "totalMembrosDiretoria",
      icon: Users2,
      tone: "info",
    },
    {
      label: "Mandatos ativos",
      path: "mandatosAtivos",
      icon: BadgeCheck,
      tone: "success",
    },
    {
      label: "Documentos vencidos",
      path: "documentosVencidos",
      icon: ScrollText,
      tone: "danger",
    },
  ],
  charts: [
    {
      title: "Membros por cargo",
      description:
        "Veja como os membros da diretoria estão distribuídos entre os diferentes cargos registrados.",
      path: "membrosPorCargo",
      selection: { label: "Cargo", values: (row) => row.cargo },
      type: "bar",
    },
    {
      title: "Membros por status",
      description:
        "Veja como os membros da diretoria estão distribuídos conforme a situação de seus mandatos.",
      path: "membrosPorStatus",
      selection: { label: "Status", values: (row) => row.status },
      type: "pie",
    },
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "cargo", label: "Cargo", format: "enum" },
    {
      key: "status",
      label: "Status",
      format: "enum",
      statusContext: "diretoria",
    },
    {
      key: "inicioMandato",
      label: "Início do mandato",
      format: "date",
    },
    {
      key: "fimMandato",
      label: "Fim do mandato",
      format: "date",
    },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "organizacao", label: "Organização" },
  ],
  emptyMessage: "Nenhum membro encontrado com os filtros selecionados.",
};

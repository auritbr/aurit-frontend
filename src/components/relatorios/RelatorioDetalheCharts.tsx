import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportComparisonBarChart,
  ReportFunnelChart,
  ReportHorizontalBarChart,
  ReportLineChart,
  ReportPieChart,
  ReportProgressChart,
  ReportTimelineChart,
  type ChartDatum,
} from "@/components/relatorios/ReportKit";
import { formatValorRelatorio } from "@/data/relatorios";

type Row = Record<string, unknown>;
type ChartKind =
  | "bar"
  | "horizontal"
  | "donut"
  | "line"
  | "funnel"
  | "timeline"
  | "progress"
  | "comparison";
interface Spec {
  title: string;
  description: string;
  kind: ChartKind;
  category?: string[];
  date?: string[];
  label?: string[];
  value?: string[];
  values?: Array<{ keys: string[]; label: string }>;
  hideXAxis?: boolean;
}

const PARTICIPANTES_CHARTS: [Spec, Spec] = [
  {
    title: "Participantes por perfil social",
    description:
      "Compare como os participantes estão distribuídos conforme a faixa de renda ou a raça/cor informada no cadastro.",
    kind: "horizontal",
    category: ["faixa_renda", "faixaRenda", "raca_cor", "racaCor"],
  },

  {
    title: "Participantes por gênero",
    description:
      "Veja como os participantes estão distribuídos conforme o gênero informado no cadastro.",
    kind: "donut",
    category: ["genero", "gênero"],
  },
];

const C: Record<string, [Spec, Spec]> = {
  diretoria: [
    {
      title: "Composição por cargo ou função",
      description:
        "Compare quantos membros estão registrados em cada cargo ou função da diretoria.",
      kind: "horizontal",
      category: ["cargo_diretoria", "cargo"],
    },
    {
      title: "Situação dos mandatos",
      description:
        "Veja como os mandatos da diretoria estão distribuídos conforme sua situação atual.",
      kind: "donut",
      category: ["status_diretoria", "status"],
    },
  ],

  documentos: [
    {
      title: "Situação documental",
      description:
        "Veja como os documentos institucionais estão distribuídos conforme sua situação atual.",
      kind: "donut",
      category: ["status_documento", "status", "situacao"],
    },
    {
      title: "Documentos por tipo",
      description:
        "Compare a quantidade de documentos cadastrados em cada tipo.",
      kind: "horizontal",
      category: ["tipo_documento", "tipo"],
    },
  ],

  agentes: [
    {
      title: "Agentes por área de atuação",
      description:
        "Compare quantos agentes culturais estão relacionados a cada área de atuação.",
      kind: "horizontal",
      category: ["area_atuacao", "areas_atuacao"],
    },
    {
      title: "Tipos de agente",
      description:
        "Veja como os agentes culturais estão distribuídos entre os diferentes tipos cadastrados.",
      kind: "donut",
      category: ["tipo_agente", "tipo_pessoa"],
    },
  ],

  colaboradores: [
    {
      title: "Colaboradores por função",
      description:
        "Compare quantos colaboradores estão registrados em cada função ou cargo.",
      kind: "horizontal",
      category: ["funcao_colaborador", "funcao", "cargo"],
    },
    {
      title: "Tipos de vínculo",
      description:
        "Veja como os colaboradores estão distribuídos conforme o tipo de vínculo cadastrado.",
      kind: "donut",
      category: ["tipo_vinculo"],
    },
  ],

  integrantes: [
    {
      title: "Integrantes por função ou grupo",
      description:
        "Compare quantos integrantes estão relacionados a cada função ou grupo registrado.",
      kind: "horizontal",
      category: ["funcao_integrante", "funcao", "grupo"],
    },
    {
      title: "Situação dos integrantes",
      description:
        "Veja como os integrantes estão distribuídos conforme sua situação atual.",
      kind: "donut",
      category: ["status", "situacao"],
    },
  ],

  "participantes-geral": PARTICIPANTES_CHARTS,
  participantes: PARTICIPANTES_CHARTS,

  projetos: [
    {
      title: "Projetos por situação",
      description:
        "Compare quantos projetos estão registrados em cada situação.",
      kind: "horizontal",
      category: ["status"],
    },
    {
      title: "Projetos por área",
      description:
        "Veja como os projetos estão distribuídos entre as diferentes áreas de atuação.",
      kind: "donut",
      category: ["area_atuacao"],
    },
  ],

  "metas-projeto": [
    {
      title: "Progresso por meta",
      description:
        "Acompanhe o percentual realizado de cada meta em relação à quantidade prevista.",
      kind: "progress",
      label: ["titulo_meta"],
      value: ["percentual_executado"],
    },
    {
      title: "Situação geral das metas",
      description:
        "Veja como as metas estão distribuídas conforme sua situação de cumprimento.",
      kind: "donut",
      category: ["status_cumprimento_meta", "status"],
    },
  ],

  cronogramas: [
    {
      title: "Linha do tempo do projeto",
      description:
        "Visualize quando cada etapa do cronograma está prevista para começar e terminar.",
      kind: "timeline",
      label: ["nome_etapa"],
      date: ["data_inicio_etapa"],
      value: ["data_fim_etapa"],
    },
    {
      title: "Etapas por período",
      description:
        "Acompanhe quantas etapas do cronograma têm início previsto em cada período.",
      kind: "line",
      date: ["data_inicio_etapa"],
    },
  ],

  atividades: [
    {
      title: "Atividades por situação",
      description:
        "Compare quantas atividades estão registradas em cada situação.",
      kind: "horizontal",
      category: ["status"],
    },
    {
      title: "Atividades por período",
      description:
        "Acompanhe a quantidade de atividades iniciadas ao longo dos períodos.",
      kind: "line",
      date: ["data_inicio"],
    },
  ],

  turmas: [
    {
      title: "Participantes por turma",
      description:
        "Compare a quantidade de participantes vinculados ou de vagas disponíveis em cada turma.",
      kind: "horizontal",
      label: ["nome_turma"],
      value: ["quantidade_participantes", "participantes", "quantidade_vagas"],
    },
    {
      title: "Situação das turmas",
      description:
        "Veja como as turmas estão distribuídas conforme sua situação atual.",
      kind: "donut",
      category: ["status"],
    },
  ],

  "planos-aula": [
    {
      title: "Aulas por atividade ou tema",
      description:
        "Compare a quantidade de planos de aula relacionados a cada atividade ou conteúdo registrado.",
      kind: "horizontal",
      category: ["atividade", "conteudo"],
    },
    {
      title: "Aulas por período",
      description:
        "Acompanhe a quantidade de planos de aula iniciados ao longo dos períodos.",
      kind: "line",
      date: ["data_inicio"],
    },
  ],

  "eventos-culturais": [
    {
      title: "Eventos por mês",
      description:
        "Acompanhe a quantidade de eventos culturais realizados ou previstos ao longo dos meses.",
      kind: "line",
      date: ["data_evento"],
    },
    {
      title: "Eventos por tipo",
      description: "Compare quantos eventos estão registrados em cada tipo.",
      kind: "horizontal",
      category: ["tipo_evento"],
    },
  ],

  evidencias: [
    {
      title: "Evidências por tipo",
      description:
        "Compare a quantidade de evidências registradas em cada tipo de comprovação.",
      kind: "horizontal",
      category: ["tipo_evidencia"],
    },
    {
      title: "Vínculos das evidências",
      description:
        "Veja como as evidências estão distribuídas conforme o tipo de registro ao qual foram vinculadas.",
      kind: "donut",
      category: ["tipo_vinculo_evidencia"],
    },
  ],

  editais: [
    {
      title: "Editais por situação",
      description:
        "Compare quantos editais estão registrados em cada situação.",
      kind: "horizontal",
      category: ["status_edital"],
    },
    {
      title: "Prazos dos editais",
      description:
        "Acompanhe a distribuição dos prazos de encerramento dos editais ao longo dos meses.",
      kind: "line",
      date: ["data_encerramento"],
    },
  ],

  "propostas-editais": [
    {
      title: "Funil de propostas",
      description:
        "Visualize quantas propostas estão em cada etapa ou situação do processo de participação nos editais.",
      kind: "funnel",
      category: ["status_proposta_edital"],
    },
    {
      title: "Situação das propostas",
      description:
        "Veja como as propostas estão distribuídas conforme sua situação atual.",
      kind: "donut",
      category: ["status_proposta_edital"],
    },
  ],

  "equipe-edital": [
    {
      title: "Equipe por função",
      description:
        "Compare quantas pessoas estão previstas em cada função da equipe do projeto.",
      kind: "horizontal",
      category: ["funcao_projeto"],
    },
    {
      title: "Vínculo ou papel da equipe",
      description:
        "Veja como as pessoas da equipe estão distribuídas conforme o vínculo ou papel registrado.",
      kind: "donut",
      category: ["__papel_equipe"],
    },
  ],

  "planos-comunicacao": [
    {
      title: "Linha do tempo das ações previstas",
      description:
        "Visualize o período previsto para a realização de cada ação ou plano de comunicação.",
      kind: "timeline",
      label: ["nome_plano"],
      date: ["data_inicio"],
      value: ["data_fim"],
    },
    {
      title: "Ações por canal",
      description:
        "Compare as ações previstas conforme os formatos, canais ou estratégias de divulgação registrados.",
      kind: "horizontal",
      category: ["formato_plano_comunicacao", "estrategias_divulgacao"],
    },
  ],

  "acoes-divulgacao": [
    {
      title: "Ações por proposta",
      description:
        "Compare quantas ações de divulgação estão vinculadas a cada proposta de edital.",
      kind: "horizontal",
      category: ["proposta_edital"],
    },
    {
      title: "Ações por período",
      description:
        "Acompanhe a distribuição das ações de divulgação conforme seus períodos de referência.",
      kind: "line",
      date: ["periodo_referencia"],
    },
  ],

  "aplicacao-de-recursos": [
    {
      title: "Orçamento x realizado por categoria",
      description:
        "Compare os valores previstos no orçamento com os valores efetivamente realizados em cada item ou categoria.",
      kind: "comparison",
      label: ["nome_planejamento", "categoria"],
      values: [
        {
          keys: ["valor_total", "valor_previsto"],
          label: "Orçado",
        },
        {
          keys: ["valor_realizado", "valor_pago", "valor"],
          label: "Realizado",
        },
      ],
      hideXAxis: true,
    },
    {
      title: "Distribuição dos recursos",
      description:
        "Veja como os valores previstos estão distribuídos entre as classificações disponíveis no planejamento dos recursos.",
      kind: "donut",
      category: ["unidade_medida", "funcao_equipe", "categoria"],
    },
  ],

  "resultados-propostas": [
    {
      title: "Resultado das propostas",
      description:
        "Veja como as propostas estão distribuídas conforme o resultado registrado.",
      kind: "donut",
      category: ["status_resultado_proposta"],
    },
    {
      title: "Resultados por edital",
      description:
        "Compare a quantidade de resultados registrados para cada edital.",
      kind: "horizontal",
      category: ["edital", "ano_edital"],
    },
  ],

  "habilitacoes-propostas": [
    {
      title: "Situação da habilitação",
      description:
        "Veja como os processos de habilitação estão distribuídos conforme sua situação atual.",
      kind: "donut",
      category: ["status_habilitacao"],
    },
    {
      title: "Tipos de pendência",
      description:
        "Compare as pendências, exigências ou motivos de inabilitação registrados nos processos de habilitação.",
      kind: "horizontal",
      category: ["exigencia_ou_pendencia", "motivo_inabilitacao"],
    },
  ],

  "prestacoes-metas": [
    {
      title: "Cumprimento por meta",
      description:
        "Acompanhe o percentual realizado de cada meta em relação ao que foi previsto.",
      kind: "progress",
      label: ["titulo_meta"],
      value: ["percentual_executado"],
    },
    {
      title: "Cumprimento geral",
      description:
        "Veja como as metas estão distribuídas conforme sua situação de cumprimento.",
      kind: "donut",
      category: ["status_cumprimento_meta"],
    },
  ],

  "prestacoes-contas": [
    {
      title: "Situação das prestações de contas",
      description:
        "Veja como as prestações de contas estão distribuídas conforme sua situação atual.",
      kind: "donut",
      category: ["status_prestacao_contas", "status"],
    },
    {
      title: "Prestações por período",
      description:
        "Acompanhe a quantidade de prestações de contas entregues ao longo dos períodos.",
      kind: "line",
      date: ["data_entrega"],
    },
  ],

  patrimonios: [
    {
      title: "Bens por categoria",
      description:
        "Compare quantos bens patrimoniais estão registrados em cada categoria.",
      kind: "horizontal",
      category: ["tipo_patrimonio"],
    },
    {
      title: "Conservação dos bens",
      description:
        "Veja como os bens patrimoniais estão distribuídos conforme seu estado de conservação.",
      kind: "donut",
      category: ["estado_conservacao", "status_patrimonio"],
    },
  ],

  emprestimos: [
    {
      title: "Situação dos empréstimos",
      description:
        "Veja como os empréstimos estão distribuídos conforme sua situação atual.",
      kind: "donut",
      category: ["status_emprestimo"],
    },
    {
      title: "Devoluções previstas por período",
      description:
        "Acompanhe quantos bens possuem devolução prevista ao longo dos períodos para identificar quando os empréstimos deverão ser encerrados.",
      kind: "line",
      date: ["data_devolucao_prevista"],
    },
  ],
};

const firstKey = (rows: Row[], keys: string[] = []) =>
  keys.find((key) =>
    rows.some(
      (row) => row[key] !== null && row[key] !== undefined && row[key] !== "",
    ),
  );
const label = (value: unknown) => formatValorRelatorio(value);
const categories = (rows: Row[], keys?: string[]): ChartDatum[] => {
  const key = firstKey(rows, keys);
  if (!key) return [];
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const raw: unknown =
      key === "__papel_equipe"
        ? row.colaborador
          ? "COLABORADOR"
          : row.integrante
            ? "INTEGRANTE"
            : row.agente
              ? "AGENTE"
              : "OUTRO"
        : row[key];
    String(raw ?? "NÃO_INFORMADO")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((value) =>
        totals.set(label(value), (totals.get(label(value)) ?? 0) + 1),
      );
  });
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
};
const months = (rows: Row[], keys?: string[]): ChartDatum[] => {
  const key = firstKey(rows, keys);
  if (!key) return [];
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const match = String(row[key] ?? "").match(/^(\d{4})-(\d{2})/);
    if (!match) return;
    const monthKey = `${match[1]}-${match[2]}`;
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + 1);
  });
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, value]) => {
      const [year, month] = monthKey.split("-");
      return { name: `${month}/${year}`, value };
    });
};

export function RelatorioDetalheCharts({
  slug,
  rows,
}: {
  slug: string;
  rows: Row[];
}) {
  const specs = C[slug];
  if (!specs) return null;
  return (
    <ReportChartGrid>
      {specs.map((spec) => (
        <ReportChartCard
          key={spec.title}
          title={spec.title}
          description={spec.description}
        >
          {render(spec, rows, slug)}
        </ReportChartCard>
      ))}
    </ReportChartGrid>
  );
}

function render(spec: Spec, rows: Row[], reportKey: string) {
  if (spec.kind === "donut")
    return (
      <ReportPieChart
        data={categories(rows, spec.category)}
        reportKey={reportKey}
      />
    );
  if (spec.kind === "line")
    return (
      <ReportLineChart
        data={
          spec.date ? months(rows, spec.date) : categories(rows, spec.category)
        }
        reportKey={reportKey}
      />
    );
  if (spec.kind === "funnel")
    return (
      <ReportFunnelChart
        data={categories(rows, spec.category)}
        reportKey={reportKey}
      />
    );
  if (spec.kind === "bar" || spec.kind === "horizontal") {
    const labelKey = firstKey(rows, spec.label);
    const valueKey = firstKey(rows, spec.value);
    const data =
      labelKey && valueKey
        ? rows.slice(0, 12).map((row) => ({
            name: label(row[labelKey]),
            value: Number(row[valueKey]) || 0,
          }))
        : categories(rows, spec.category);
    return spec.kind === "horizontal" ? (
      <ReportHorizontalBarChart data={data} reportKey={reportKey} />
    ) : (
      <ReportBarChart data={data} reportKey={reportKey} />
    );
  }
  if (spec.kind === "timeline") {
    const nameKey = firstKey(rows, spec.label),
      startKey = firstKey(rows, spec.date),
      endKey = firstKey(rows, spec.value);
    const valid =
      nameKey && startKey && endKey
        ? rows
            .flatMap((row) => {
              const start = Date.parse(String(row[startKey]));
              const end = Date.parse(String(row[endKey]));
              return Number.isFinite(start) && Number.isFinite(end)
                ? [
                    {
                      name: label(row[nameKey]),
                      inicio: start / 86400000,
                      duracao: Math.max(1, (end - start) / 86400000),
                    },
                  ]
                : [];
            })
            .slice(0, 12)
        : [];
    return <ReportTimelineChart data={valid} reportKey={reportKey} />;
  }
  if (spec.kind === "progress") {
    const nameKey = firstKey(rows, spec.label),
      valueKey = firstKey(rows, spec.value);
    const data = nameKey
      ? rows.slice(0, 12).map((row) => {
          const pct = Math.max(
            0,
            Math.min(100, Number(valueKey ? row[valueKey] : 0) || 0),
          );
          return {
            name: label(row[nameKey]),
            concluido: pct,
            restante: 100 - pct,
          };
        })
      : [];
    return <ReportProgressChart data={data} reportKey={reportKey} />;
  }
  const nameKey = firstKey(rows, spec.label);
  const series = (spec.values ?? []).map((v, i) => ({
    key: `v${i}`,
    label: v.label,
    source: firstKey(rows, v.keys),
  }));
  const data = nameKey
    ? rows.slice(0, 12).map((row) => ({
        name: label(row[nameKey]),
        ...Object.fromEntries(
          series.map((s) => [s.key, Number(s.source ? row[s.source] : 0) || 0]),
        ),
      }))
    : [];
  return (
    <ReportComparisonBarChart
      data={data}
      series={series.map(({ key, label: seriesLabel }) => ({
        key,
        label: seriesLabel,
      }))}
      reportKey={reportKey}
      hideXAxis={spec.hideXAxis}
    />
  );
}

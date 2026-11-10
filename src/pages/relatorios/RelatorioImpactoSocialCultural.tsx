import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Layers,
  Percent,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import { AppLayout } from "@/components/AppLayout";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ComparacaoResumo,
  FilteredByBanner,
  IndisponivelInfo,
  PeriodoComparacaoFields,
  comparacaoInicial,
} from "@/components/relatorios/AnalyticsKit";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportLineChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
  type StatTone,
} from "@/components/relatorios/ReportKit";
import {
  ReportFilterMultiSelect,
  ReportSelectContent,
} from "@/components/relatorios/ReportSelectFields";
import {
  ComparativoResultados,
  formatarMetrica,
} from "@/components/relatorios/ComparativoBackend";
import {
  escopoAnalitico,
  compararRelatorio,
  exportarImpacto,
  getImpacto,
  type Analise,
  type Categoria,
  type FiltroApi,
  type MatriculaImpacto,
  type Metrica,
  type OpcoesImpacto,
  type Pagina,
  type Participacao,
  type Perfil,
  type Resultados,
  type Serie,
  type VisaoGeral,
} from "@/data/analitico";
import {
  faixaRendaOptions,
  generoOptions,
  racaCorOptions,
  statusMatriculaOptions,
} from "@/data/participantes";
import { reportEnumLabel } from "@/data/relatoriosEspecializados";
import { ApiError } from "@/lib/api";
import { formatarPeriodo, periodoValido } from "@/lib/periodComparison";

const inicial = {
  busca: "",
  atividadeId: "",
  turmaId: "",
  statusMatricula: [] as string[],
  generos: [] as string[],
  racasCores: [] as string[],
  faixasRenda: [] as string[],
  periodo: { inicio: "", fim: "" },
  comparacao: comparacaoInicial,
};
type Filtros = typeof inicial;

const abas = [
  ["visao-geral", "Visão geral"],
  ["perfil-publico", "Perfil do público"],
  ["participacao", "Participação"],
  ["analises-cruzadas", "Análises cruzadas"],
  ["resultados-impacto", "Resultados de impacto"],
] as const;
type Aba = (typeof abas)[number][0];

const dimensoes: Record<string, string> = {
  GENERO: "Gênero",
  RACA_COR: "Raça/cor",
  FAIXA_ETARIA: "Faixa etária",
  FAIXA_RENDA: "Faixa de renda",
  CADUNICO: "CadÚnico",
  BOLSA_FAMILIA: "Bolsa Família",
  ATIVIDADE: "Atividade",
  TURMA: "Turma",
  CIDADE: "Cidade",
  BAIRRO: "Bairro",
  STATUS_MATRICULA: "Status da matrícula",
};
const indicadores: Record<string, string> = {
  PARTICIPANTES: "Participantes únicos",
  TAXA_FREQUENCIA: "Taxa de frequência",
  TOTAL_PRESENCAS: "Presenças",
  AUSENCIAS: "Ausências",
  PERMANENCIA: "Permanência",
  MATRICULAS: "Matrículas",
  PARTICIPANTES_ATIVOS: "Participantes ativos",
};
const cards: Record<string, string> = {
  ATIVOS: "Participantes ativos",
  COM_TURMA: "Turmas vinculadas",
  COM_PRESENCA: "Presenças",
  AUSENCIAS_CONSECUTIVAS: "Ausências consecutivas",
};
const etiquetas: Record<string, string> = {
  participantes: "Participantes únicos",
  novos: "Novos participantes",
  ativos: "Participantes ativos",
  concluidos: "Participantes com matrícula concluída",
  atividades: "Atividades vinculadas",
  turmas: "Turmas vinculadas",
  presencas: "Presenças",
  ausencias: "Ausências",
  taxa_frequencia: "Taxa geral de frequência",
  media_simples_frequencia: "Média de frequência por pessoa",
  eventos_culturais: "Eventos culturais",
  eventos_realizados: "Eventos realizados",
  atividades_realizadas: "Atividades realizadas",
  turmas_desenvolvidas: "Turmas com frequência registrada",
  encontros: "Encontros registrados",
  continuidade: "Pessoas com presença em mais de um dia",
  multiplas_atividades: "Pessoas em mais de uma atividade",
  variacao_publico: "Variação de público",
  permanencia: "Permanência",
  conclusoes_no_periodo: "Conclusões no período",
};
const estilosIndicadores: Record<string, readonly [LucideIcon, StatTone]> = {
  participantes: [Users, "primary"],
  novos: [UserPlus, "neutral"],
  ativos: [UserCheck, "success"],
  atividades: [CalendarDays, "info"],
  turmas: [Layers, "info"],
  eventos_culturais: [Sparkles, "warning"],
  presencas: [CheckCircle2, "success"],
  taxa_frequencia: [Percent, "primary"],
  media_simples_frequencia: [Percent, "info"],
  permanencia: [TrendingUp, "info"],
  conclusoes_no_periodo: [Trophy, "neutral"],
  atividades_realizadas: [CalendarDays, "info"],
  turmas_desenvolvidas: [Layers, "info"],
  eventos_realizados: [Sparkles, "warning"],
  encontros: [ClipboardList, "info"],
  continuidade: [TrendingUp, "primary"],
  multiplas_atividades: [Layers, "neutral"],
  variacao_publico: [BarChart3, "info"],
};
const destaques: Record<string, string> = {
  ATIVIDADE_PUBLICO: "Maior público por atividade",
  TURMA_FREQUENCIA: "Maior frequência por turma",
  CIDADE_PUBLICO: "Maior público por cidade",
  BAIRRO_PUBLICO: "Maior público por bairro",
  MES_PRESENCAS: "Mais presenças no mês",
  CRESCIMENTO_PUBLICO: "Crescimento de público",
  REDUCAO_PUBLICO: "Redução de público",
};
const labelEnum = (valor: string) =>
  valor === "NAO_INFORMADO" ? "Não informado" : reportEnumLabel(valor);
const booleano = (valor: boolean | null) =>
  valor == null ? "Não informado" : valor ? "Sim" : "Não";
const pct = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const coluna: ReportTableColumn<MatriculaImpacto>[] = [
  { key: "participante", label: "Participante" },
  { key: "atividade", label: "Atividade" },
  { key: "turma", label: "Turma" },
  {
    key: "genero",
    label: "Gênero",
    accessor: (l) => labelEnum(l.genero),
    notSortable: true,
  },
  {
    key: "racaCor",
    label: "Raça/cor",
    accessor: (l) => labelEnum(l.racaCor),
    notSortable: true,
  },
  {
    key: "faixaRenda",
    label: "Faixa de renda",
    accessor: (l) => labelEnum(l.faixaRenda),
    notSortable: true,
  },
  {
    key: "cadUnico",
    label: "CadÚnico",
    accessor: (l) => booleano(l.cadUnico),
    notSortable: true,
  },
  {
    key: "bolsaFamilia",
    label: "Bolsa Família",
    accessor: (l) => booleano(l.bolsaFamilia),
    notSortable: true,
  },
  {
    key: "status",
    label: "Status",
    render: (l) => <DomainStatusPill domain="participante" status={l.status} />,
    notSortable: true,
  },
  { key: "presencas", label: "Presenças" },
  { key: "registros", label: "Registros" },
  {
    key: "percentualPresenca",
    label: "% Presença",
    accessor: (l) =>
      l.percentualPresenca == null ? "—" : pct(l.percentualPresenca),
  },
  { key: "ausencias", label: "Ausências", hiddenByDefault: true },
  {
    key: "feriados",
    label: "Feriados",
    hiddenByDefault: true,
    notSortable: true,
  },
  {
    key: "semAula",
    label: "Não teve aula",
    hiddenByDefault: true,
    notSortable: true,
  },
  {
    key: "ultimaPresenca",
    label: "Última presença",
    hiddenByDefault: true,
    notSortable: true,
  },
  {
    key: "tipoNeurodivergencias",
    label: "Tipos de neurodivergências",
    hiddenByDefault: true,
    notSortable: true,
  },
  {
    key: "tipoDeficiencias",
    label: "Tipos de deficiência",
    hiddenByDefault: true,
    notSortable: true,
  },
];
function toApi(filtros: Filtros): FiltroApi {
  const { periodo, comparacao: _, ...resto } = filtros;
  return { ...resto, ...periodo };
}

function MetricCards({
  metrics,
  keys,
  card,
  onCard,
}: {
  metrics: Record<string, Metrica>;
  keys: string[];
  card?: string;
  onCard?: (key: string) => void;
}) {
  return (
    <ReportStatGrid>
      {keys.map((key) => {
        const metric = metrics[key];
        const [icon, tone] = estilosIndicadores[key] ?? [BarChart3, "neutral"];
        const filtro = (
          {
            ativos: "ATIVOS",
            turmas: "COM_TURMA",
            presencas: "COM_PRESENCA",
          } as Record<string, string>
        )[key];
        return (
          <ReportStatCard
            key={key}
            icon={icon}
            tone={tone}
            label={etiquetas[key] ?? labelEnum(key)}
            valor={formatarMetrica(metric)}
            hint={metric?.motivo ?? undefined}
            active={!!filtro && filtro === card}
            onClick={
              onCard && filtro && !!metric?.valor
                ? () => onCard(filtro)
                : undefined
            }
          />
        );
      })}
    </ReportStatGrid>
  );
}

function GraficoCategoria({
  title,
  analysis,
  onSelect,
}: {
  title: string;
  analysis: Analise;
  onSelect: (categoria: Categoria) => void;
}) {
  const percent = analysis.unidade === "PERCENTUAL";
  const nomes = new Map<string, number>();
  analysis.resultados.forEach(({ label }) =>
    nomes.set(label, (nomes.get(label) ?? 0) + 1),
  );
  const items = analysis.resultados.flatMap((item) =>
    item.valor == null
      ? []
      : [
          {
            item,
            name:
              (nomes.get(item.label) ?? 0) > 1
                ? `${item.label} (#${item.categoria})`
                : item.label,
            value: item.valor,
          },
        ],
  );
  return (
    <ReportChartCard
      title={title}
      clickable={items.length > 0}
      description={
        analysis.totalCategorias > analysis.resultados.length
          ? `${analysis.totalCategorias} categorias no recorte`
          : undefined
      }
    >
      {!analysis.disponivel || !items.length ? (
        <IndisponivelInfo
          titulo="Sem dados para exibir"
          motivo={
            analysis.motivo ?? "Nenhum registro com os filtros aplicados."
          }
        />
      ) : (
        <ReportBarChart
          data={items}
          reportKey="impacto-social-cultural"
          percent={percent}
          showZero={percent}
          onSelect={(name) => {
            const entry = items.find((item) => item.name === name);
            if (entry) onSelect(entry.item);
          }}
        />
      )}
    </ReportChartCard>
  );
}

function Evolucao({
  series,
  campo,
  title,
  label,
}: {
  series: Serie[];
  campo: "participantes" | "presencas" | "taxaFrequencia";
  title: string;
  label: string;
}) {
  return (
    <ReportChartCard title={title}>
      <ReportLineChart
        data={series.map((mes) => ({
          name: mes.periodo.replace(/^(\d{4})-(\d{2})$/, "$2/$1"),
          value: mes[campo],
        }))}
        reportKey="impacto-social-cultural"
        name={label}
        percent={campo === "taxaFrequencia"}
        showZero
      />
    </ReportChartCard>
  );
}

export default function RelatorioImpactoSocialCultural() {
  const [draft, setDraft] = useState(inicial);
  const [filtros, setFiltros] = useState(inicial);
  const [aba, setAba] = useState<Aba>("visao-geral");
  const [card, setCard] = useState("");
  const [grupo, setGrupo] = useState<{ dimensao: string; item: Categoria }>();
  const [indicador, setIndicador] = useState("PARTICIPANTES");
  const [dimensao, setDimensao] = useState("FAIXA_ETARIA");
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(25);
  const [cruzadaPagina, setCruzadaPagina] = useState(0);
  const [ausenciasPagina, setAusenciasPagina] = useState(0);
  const [sort, setSort] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const params = toApi(filtros);
  const prefixo = ["impacto-analitico", escopoAnalitico()];
  const opcoes = useQuery({
    queryKey: [...prefixo, "opcoes"],
    queryFn: () => getImpacto<OpcoesImpacto>("opcoes"),
  });
  const visao = useQuery({
    queryKey: [...prefixo, "visao-geral", params],
    queryFn: () =>
      getImpacto<VisaoGeral>("visao-geral", { ...params, tamanho: 200 }),
  });
  const perfil = useQuery({
    queryKey: [...prefixo, "perfil-publico", params],
    queryFn: () =>
      getImpacto<Perfil>("perfil-publico", { ...params, tamanho: 200 }),
    enabled: aba === "perfil-publico",
  });
  const participacao = useQuery({
    queryKey: [...prefixo, "participacao", params, ausenciasPagina],
    queryFn: () =>
      getImpacto<Participacao>("participacao", {
        ...params,
        pagina: ausenciasPagina,
      }),
    enabled: aba === "participacao",
  });
  const cruzada = useQuery({
    queryKey: [
      ...prefixo,
      "analises-cruzadas",
      params,
      indicador,
      dimensao,
      cruzadaPagina,
    ],
    queryFn: () =>
      getImpacto<Analise>("analises-cruzadas", {
        ...params,
        indicador,
        dimensao,
        pagina: cruzadaPagina,
      }),
    enabled: aba === "analises-cruzadas",
  });
  const resultados = useQuery({
    queryKey: [...prefixo, "resultados-impacto", params],
    queryFn: () =>
      getImpacto<Resultados>("resultados-impacto", { ...params, tamanho: 200 }),
    enabled: aba === "resultados-impacto",
  });
  const comparativo = useQuery({
    queryKey: [...prefixo, "comparacao", params, filtros.comparacao],
    queryFn: () =>
      compararRelatorio(
        "impacto-social-cultural",
        filtros.periodo,
        filtros.comparacao,
        params,
      ),
    enabled: filtros.comparacao.ativo && periodoValido(filtros.periodo),
  });
  const tabelaFiltros: FiltroApi = {
    ...params,
    card,
    dimensaoFiltro: grupo?.dimensao,
    categoriaFiltro: grupo?.item.categoria,
    ordenacao:
      sort.key === "percentualPresenca"
        ? "frequencia"
        : sort.key === "participante"
          ? "nome"
          : (sort.key ?? "nome"),
    direcao: sort.direction,
  };
  const tabela = useQuery({
    queryKey: [...prefixo, "tabela", tabelaFiltros, pagina, tamanho],
    queryFn: () =>
      getImpacto<Pagina<MatriculaImpacto>>("tabela", {
        ...tabelaFiltros,
        pagina: pagina - 1,
        tamanho,
      }),
  });
  const aplicar = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setCard("");
    setGrupo(undefined);
    setPagina(1);
    setCruzadaPagina(0);
    setAusenciasPagina(0);
  };
  const irParaTabela = () =>
    window.requestAnimationFrame(() =>
      document
        .getElementById("tabela-impacto")
        ?.scrollIntoView({ block: "start" }),
    );
  const mudarCard = (key: string) => {
    setCard(card === key ? "" : key);
    setPagina(1);
    if (card !== key) irParaTabela();
  };
  const selecionar = (key: string) => (item: Categoria) => {
    setGrupo(
      grupo?.dimensao === key && grupo.item.categoria === item.categoria
        ? undefined
        : { dimensao: key, item },
    );
    setPagina(1);
    irParaTabela();
  };
  const chips: ActiveFilterItem[] = [];
  const chip = (
    id: string,
    label: string,
    value: string,
    changes: Partial<Filtros>,
  ) => {
    if (value)
      chips.push({
        id,
        label,
        value,
        onRemove: () => aplicar({ ...filtros, ...changes }),
      });
  };
  chip("busca", "Participante", filtros.busca, { busca: "" });
  chip(
    "atividade",
    "Atividade",
    opcoes.data?.atividades.find(
      (item) => String(item.id) === filtros.atividadeId,
    )?.nome ?? filtros.atividadeId,
    { atividadeId: "", turmaId: "" },
  );
  chip(
    "turma",
    "Turma",
    opcoes.data?.turmas.find((item) => String(item.id) === filtros.turmaId)
      ?.nome ?? filtros.turmaId,
    { turmaId: "" },
  );
  for (const [key, label, options] of [
    ["statusMatricula", "Status da matrícula", statusMatriculaOptions],
    ["generos", "Gênero", generoOptions],
    ["racasCores", "Raça/cor", racaCorOptions],
    ["faixasRenda", "Faixa de renda", faixaRendaOptions],
  ] as const) {
    chip(
      key,
      label,
      filtros[key]
        .map(
          (value) =>
            options.find((o) => o.value === value)?.label ?? labelEnum(value),
        )
        .join(", "),
      { [key]: [] },
    );
  }
  if (periodoValido(filtros.periodo))
    chip("periodo", "Período", formatarPeriodo(filtros.periodo), {
      periodo: inicial.periodo,
      comparacao: comparacaoInicial,
    });
  if (filtros.comparacao.ativo)
    chip(
      "comparacao",
      "Comparação",
      comparativo.data ? formatarPeriodo(comparativo.data.comparado) : "Ativa",
      { comparacao: comparacaoInicial },
    );
  const active = {
    "visao-geral": visao,
    "perfil-publico": perfil,
    participacao,
    "analises-cruzadas": cruzada,
    "resultados-impacto": resultados,
  }[aba];
  if (visao.error instanceof ApiError && visao.error.status === 403)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  return (
    <ReportShell
      title="Impacto Social e Cultural"
      tooltip="Cruza dados sociodemográficos com atividades, turmas, eventos e frequência."
      objective="Acompanhe o perfil do público, a participação e os resultados das ações culturais e sociais."
    >
      <ReportFilterPanel
        storageKey="relatorio-impacto-social"
        activeFilters={chips}
        onClear={() => aplicar(inicial)}
        onSubmit={() => {
          const { periodo, comparacao } = draft;
          if (
            (periodo.inicio || periodo.fim || comparacao.ativo) &&
            !periodoValido(periodo)
          )
            return void toast.error("Informe o início e o fim do período.");
          if (
            comparacao.ativo &&
            comparacao.modo === "personalizado" &&
            !periodoValido(comparacao.personalizado)
          )
            return void toast.error("Informe o período de comparação.");
          aplicar(draft);
        }}
      >
        <div>
          <FieldLabel htmlFor="impacto-busca">Participante</FieldLabel>
          <Input
            id="impacto-busca"
            className={filterFieldClass}
            value={draft.busca}
            onChange={(e) => setDraft({ ...draft, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="impacto-atividade">Atividade</FieldLabel>
          <Select
            value={draft.atividadeId || "TODOS"}
            onValueChange={(v) =>
              setDraft({
                ...draft,
                atividadeId: v === "TODOS" ? "" : v,
                turmaId: "",
              })
            }
          >
            <SelectTrigger id="impacto-atividade" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <ReportSelectContent>
              <SelectItem value="TODOS">Todas</SelectItem>
              {opcoes.data?.atividades.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome}
                </SelectItem>
              ))}
            </ReportSelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="impacto-turma">Turma</FieldLabel>
          <Select
            value={draft.turmaId || "TODOS"}
            onValueChange={(v) =>
              setDraft({ ...draft, turmaId: v === "TODOS" ? "" : v })
            }
          >
            <SelectTrigger id="impacto-turma" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <ReportSelectContent>
              <SelectItem value="TODOS">Todas</SelectItem>
              {opcoes.data?.turmas
                .filter(
                  (item) =>
                    !draft.atividadeId ||
                    String(item.atividadeId) === draft.atividadeId,
                )
                .map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.nome}
                  </SelectItem>
                ))}
            </ReportSelectContent>
          </Select>
        </div>
        {(
          [
            ["statusMatricula", "Status da matrícula", statusMatriculaOptions],
            ["generos", "Gênero", generoOptions],
            ["racasCores", "Raça/cor", racaCorOptions],
            ["faixasRenda", "Faixa de renda", faixaRendaOptions],
          ] as const
        ).map(([key, label, options]) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <ReportFilterMultiSelect
              options={[...options]}
              value={draft[key]}
              onChange={(value) => setDraft({ ...draft, [key]: value })}
            />
          </div>
        ))}
        <PeriodoComparacaoFields
          idPrefix="impacto"
          periodo={draft.periodo}
          comparacao={draft.comparacao}
          onPeriodoChange={(periodo) => setDraft({ ...draft, periodo })}
          onComparacaoChange={(comparacao) =>
            setDraft({ ...draft, comparacao })
          }
        />
      </ReportFilterPanel>
      {opcoes.isError && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar atividades e turmas.
        </p>
      )}
      <ComparacaoResumo
        principal={
          comparativo.data?.principal ??
          (periodoValido(filtros.periodo) ? filtros.periodo : null)
        }
        comparado={comparativo.data?.comparado ?? null}
      />
      {filtros.comparacao.ativo && (
        <ComparativoResultados
          data={comparativo.data}
          error={comparativo.error}
          labels={etiquetas}
        />
      )}
      <Tabs
        value={aba}
        onValueChange={(value) => setAba(value as Aba)}
        className="mb-5"
      >
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max gap-1 rounded-[12px] border border-border/60 bg-card/60">
            {abas.map(([key, label]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-[9px] px-3 py-1.5 text-[12.5px]"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {aba === "analises-cruzadas" && (
        <div className="mb-4 flex flex-wrap gap-3">
          {(
            [
              ["Indicador", indicador, indicadores, setIndicador],
              ["Dimensão", dimensao, dimensoes, setDimensao],
            ] as const
          ).map(([label, value, options, setValue]) => (
            <div key={label} className="min-w-44">
              <FieldLabel>{label}</FieldLabel>
              <Select
                value={value}
                onValueChange={(next) => {
                  setValue(next);
                  setCruzadaPagina(0);
                }}
              >
                <SelectTrigger aria-label={label} className={filterFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <ReportSelectContent>
                  {Object.entries(options).map(([key, text]) => (
                    <SelectItem key={key} value={key}>
                      {text}
                    </SelectItem>
                  ))}
                </ReportSelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
      {active.isPending ? (
        <p role="status" className="py-5 text-sm text-muted-foreground">
          Carregando indicadores...
        </p>
      ) : active.isError ? (
        <p role="alert" className="py-5 text-sm text-destructive">
          {active.error.message}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void active.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      ) : null}
      {aba === "visao-geral" && visao.data && (
        <>
          <MetricCards
            metrics={visao.data.indicadores}
            keys={[
              "participantes",
              "novos",
              "ativos",
              "atividades",
              "turmas",
              "eventos_culturais",
              "presencas",
              "taxa_frequencia",
            ]}
            card={card}
            onCard={mudarCard}
          />
          <ReportChartGrid>
            <GraficoCategoria
              title="Participantes por atividade"
              analysis={visao.data.participantesPorAtividade}
              onSelect={selecionar("ATIVIDADE")}
            />
            <Evolucao
              series={visao.data.evolucaoMensal}
              campo="participantes"
              title="Participantes por mês"
              label="Participantes"
            />
          </ReportChartGrid>
        </>
      )}
      {aba === "perfil-publico" && perfil.data && (
        <ReportChartGrid>
          {Object.entries(perfil.data.distribuicoes).map(([key, analysis]) => (
            <GraficoCategoria
              key={key}
              title={dimensoes[key]}
              analysis={analysis}
              onSelect={selecionar(key)}
            />
          ))}
        </ReportChartGrid>
      )}
      {aba === "participacao" && participacao.data && (
        <>
          <MetricCards
            metrics={{
              taxa_frequencia: participacao.data.taxaGeral,
              media_simples_frequencia: participacao.data.mediaSimples,
              permanencia: participacao.data.permanencia,
              conclusoes_no_periodo: participacao.data.conclusoes,
            }}
            keys={[
              "taxa_frequencia",
              "media_simples_frequencia",
              "permanencia",
              "conclusoes_no_periodo",
            ]}
          />
          <ReportChartGrid>
            <GraficoCategoria
              title="Frequência por atividade"
              analysis={participacao.data.frequenciaPorAtividade}
              onSelect={selecionar("ATIVIDADE")}
            />
            <GraficoCategoria
              title="Frequência por turma"
              analysis={participacao.data.frequenciaPorTurma}
              onSelect={selecionar("TURMA")}
            />
            <GraficoCategoria
              title="Situações de matrícula"
              analysis={participacao.data.situacoesMatricula}
              onSelect={selecionar("STATUS_MATRICULA")}
            />
            <Evolucao
              series={participacao.data.evolucaoMensal}
              campo="taxaFrequencia"
              title="Frequência por mês"
              label="Frequência"
            />
          </ReportChartGrid>
          <ReportChartCard
            title="Ausências consecutivas"
            description="Sequências de 3 ou mais faltas recentes por atividade e turma."
          >
            <Button
              variant="glassSecondary"
              className="mt-2"
              disabled={!participacao.data.ausenciasConsecutivas.total}
              onClick={() => mudarCard("AUSENCIAS_CONSECUTIVAS")}
            >
              {participacao.data.ausenciasConsecutivas.total} sequência(s) ·
              Filtrar tabela
            </Button>
            {participacao.data.ausenciasConsecutivas.total > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {participacao.data.ausenciasConsecutivas.registros.map(
                  (item) => (
                    <li
                      key={`${item.participante_id}-${item.atividade_id}-${item.turma_id}`}
                    >
                      {item.participante} · {item.ausencias_consecutivas} faltas
                    </li>
                  ),
                )}
              </ul>
            )}
            <PaginadorCategorias
              pagina={ausenciasPagina}
              tamanho={25}
              total={participacao.data.ausenciasConsecutivas.total}
              onChange={setAusenciasPagina}
            />
          </ReportChartCard>
        </>
      )}
      {aba === "analises-cruzadas" && cruzada.data && (
        <>
          <GraficoCategoria
            title={`${indicadores[indicador]} por ${dimensoes[dimensao].toLocaleLowerCase("pt-BR")}`}
            analysis={cruzada.data}
            onSelect={selecionar(dimensao)}
          />
          <PaginadorCategorias
            pagina={cruzadaPagina}
            tamanho={25}
            total={cruzada.data.totalCategorias}
            onChange={setCruzadaPagina}
          />
        </>
      )}
      {aba === "resultados-impacto" && resultados.data && (
        <>
          <MetricCards
            metrics={resultados.data.indicadores}
            keys={[
              "atividades_realizadas",
              "turmas_desenvolvidas",
              "eventos_realizados",
              "encontros",
              "continuidade",
              "multiplas_atividades",
              "variacao_publico",
            ]}
          />
          <ReportChartCard
            title="Destaques"
            description={resultados.data.interpretacao}
          >
            <ul className="mt-2 space-y-1 text-sm">
              {resultados.data.destaques.map((item) => (
                <li key={`${item.tipo}:${item.categoria}`}>
                  <strong>
                    {destaques[item.tipo] ?? labelEnum(item.tipo)}
                  </strong>{" "}
                  · {item.label} ·{" "}
                  {item.unidade === "PERCENTUAL"
                    ? pct(item.valor)
                    : item.valor.toLocaleString("pt-BR")}
                  {item.truncado && ` (${item.totalEmpatados} empatados)`}
                </li>
              ))}
            </ul>
          </ReportChartCard>
          <ReportChartGrid>
            <GraficoCategoria
              title="Alcance por cidade"
              analysis={resultados.data.cidades}
              onSelect={selecionar("CIDADE")}
            />
            <GraficoCategoria
              title="Alcance por bairro"
              analysis={resultados.data.bairros}
              onSelect={selecionar("BAIRRO")}
            />
            <Evolucao
              series={resultados.data.evolucaoAlcance}
              campo="presencas"
              title="Presenças por mês"
              label="Presenças"
            />
          </ReportChartGrid>
        </>
      )}
      <div className="mt-6" id="tabela-impacto">
        <FilteredByBanner
          label={card ? cards[card] : null}
          count={tabela.data?.total ?? 0}
          onClear={() => mudarCard(card)}
        />
        <FilteredByBanner
          label={
            grupo ? `${dimensoes[grupo.dimensao]}: ${grupo.item.label}` : null
          }
          count={tabela.data?.total ?? 0}
          onClear={() => {
            setGrupo(undefined);
            setPagina(1);
          }}
        />
        {tabela.isError && (
          <p role="alert" className="text-sm text-destructive">
            {tabela.error.message}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void tabela.refetch()}
            >
              Tentar novamente
            </button>
          </p>
        )}
        <ReportTable
          title="Participantes e impacto"
          description="Uma linha por matrícula. Os três formatos exportam o mesmo recorte e as colunas selecionadas."
          reportName="impacto-social-cultural"
          rows={tabela.data?.registros ?? []}
          columns={coluna}
          rowKey={(row) => row.id}
          emptyMessage={
            tabela.isPending
              ? "Carregando participantes..."
              : "Nenhum registro com os filtros aplicados."
          }
          remote={{
            total: tabela.data?.total ?? 0,
            currentPage: pagina,
            pageSize: tamanho,
            sortKey: sort.key,
            direction: sort.direction,
            loading: tabela.isFetching,
            onPageChange: setPagina,
            onPageSizeChange: (size) => {
              setTamanho(size);
              setPagina(1);
            },
            onSort: (key, direction) => {
              setSort({ key, direction });
              setPagina(1);
            },
          }}
          onExport={(formato, cols) =>
            exportarImpacto(formato, tabelaFiltros, cols)
          }
        />
      </div>
    </ReportShell>
  );
}

function PaginadorCategorias({
  pagina,
  tamanho,
  total,
  onChange,
}: {
  pagina: number;
  tamanho: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= tamanho) return null;
  return (
    <div className="my-2 flex items-center gap-2 text-sm">
      <Button
        variant="glassSecondary"
        size="sm"
        disabled={pagina === 0}
        onClick={() => onChange(pagina - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {pagina + 1} de {Math.ceil(total / tamanho)}
      </span>
      <Button
        variant="glassSecondary"
        size="sm"
        disabled={(pagina + 1) * tamanho >= total}
        onClick={() => onChange(pagina + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}

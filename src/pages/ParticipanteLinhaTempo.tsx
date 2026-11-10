import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDownUp,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  FileDown,
  FileQuestion,
  Layers,
  Loader2,
  Percent,
  ShieldQuestion,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import {
  filterFieldClass,
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportComparisonBarChart,
  ReportLineChart,
  ReportStatCard,
} from "@/components/relatorios/ReportKit";
import { statusMatriculaValueToLabel } from "@/data/participantes";
import { escopoAnalitico } from "@/data/analitico";
import { ApiError } from "@/lib/api";
import { downloadIndividualReport } from "@/lib/individualReportDownload";
import { maskCEP } from "@/lib/masks";
import { getPermissoesUsuarioLogadoPorModulo } from "@/lib/permissoes";
import {
  agruparFrequencia,
  consultarResumoTrajetoria,
  consultarTrajetoria,
  dataHoraTrajetoria,
  formatarDataBR,
  indicadoresTrajetoria,
  resumoFrequencia,
  vinculosTrajetoria,
  type CategoriaFiltro,
  type EventoTrajetoria,
  type TipoEvento,
  type FrequenciaTrajetoria,
} from "@/lib/trajetoriaParticipante";
import { cn } from "@/lib/utils";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MES_CURTO = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const ICONE: Record<TipoEvento, { icon: LucideIcon; cls: string }> = {
  cadastro: {
    icon: Users,
    cls: "text-primary bg-primary/10 border-primary/20",
  },
  matricula: {
    icon: CalendarCheck,
    cls: "text-primary bg-primary/10 border-primary/20",
  },
  vinculo: {
    icon: Layers,
    cls: "text-sky-600 dark:text-sky-300 bg-sky-500/10 border-sky-500/20",
  },
  presenca: {
    icon: UserCheck,
    cls: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  ausencia: {
    icon: UserX,
    cls: "text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
  },
  justificada: {
    icon: ShieldQuestion,
    cls: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
  encontro: {
    icon: CalendarCheck,
    cls: "text-muted-foreground bg-muted/50 border-border/70",
  },
  encerramento: {
    icon: CheckCircle2,
    cls: "text-muted-foreground bg-muted/50 border-border/70",
  },
};

type Periodo = "todos" | "ano" | "anterior" | "custom";

function intervalo(periodo: Periodo, ini: string, fim: string) {
  const ano = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format();
  if (periodo === "ano") return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
  if (periodo === "anterior")
    return {
      inicio: `${Number(ano) - 1}-01-01`,
      fim: `${Number(ano) - 1}-12-31`,
    };
  return periodo === "custom"
    ? { inicio: ini || undefined, fim: fim || undefined }
    : {};
}
const intervaloValido = ({ inicio, fim }: { inicio?: string; fim?: string }) =>
  !inicio || !fim || inicio <= fim;

const pct = (v: number | null) =>
  v == null ? "—" : `${v.toFixed(1).replace(".", ",")}%`;

const seletorGlassClass = buttonVariants({
  variant: "glassSecondary",
  className:
    "h-auto min-h-9 min-w-0 w-full justify-between px-3 py-1.5 text-left [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words",
});
const opcoesGlassClass =
  "rounded-[13px] border-border/70 bg-popover/95 backdrop-blur-md";
const abaGlassClass =
  "rounded-[9px] border border-transparent hover:bg-muted/50 data-[state=active]:border-border/60 data-[state=active]:bg-background/70 data-[state=active]:backdrop-blur-md";

function PeriodoFields({
  periodo,
  setPeriodo,
  ini,
  setIni,
  fim,
  setFim,
  idPrefix,
}: {
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
  ini: string;
  setIni: (v: string) => void;
  fim: string;
  setFim: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel htmlFor={`${idPrefix}-periodo`}>Período</FieldLabel>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger
            id={`${idPrefix}-periodo`}
            className={seletorGlassClass}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={opcoesGlassClass}>
            <SelectItem value="todos">Todo o histórico</SelectItem>
            <SelectItem value="ano">Este ano</SelectItem>
            <SelectItem value="anterior">Ano anterior</SelectItem>
            <SelectItem value="custom">Período personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {periodo === "custom" && (
        <>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${idPrefix}-ini`}>De</FieldLabel>
            <Input
              id={`${idPrefix}-ini`}
              type="date"
              className={filterFieldClass}
              value={ini}
              onChange={(e) => setIni(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${idPrefix}-fim`}>Até</FieldLabel>
            <Input
              id={`${idPrefix}-fim`}
              type="date"
              className={filterFieldClass}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </>
      )}
    </>
  );
}

function Vazio({
  icon: Icon = FileQuestion,
  titulo,
  texto,
}: {
  icon?: LucideIcon;
  titulo: string;
  texto?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {texto && (
        <p className="max-w-md text-[13px] text-muted-foreground">{texto}</p>
      )}
    </div>
  );
}

function TimelineTrajetoria({ eventos }: { eventos: EventoTrajetoria[] }) {
  const anos = new Map<string, Map<string, EventoTrajetoria[]>>();
  for (const evento of eventos) {
    const ano = evento.data?.slice(0, 4) ?? "";
    const mes = evento.data?.slice(5, 7) ?? "";
    const meses = anos.get(ano) ?? new Map<string, EventoTrajetoria[]>();
    const lista = meses.get(mes) ?? [];
    lista.push(evento);
    meses.set(mes, lista);
    anos.set(ano, meses);
  }
  const grupos = Array.from(
    anos,
    ([ano, meses]) => [ano, Array.from(meses)] as const,
  );

  return (
    <div className="min-w-0 space-y-6">
      {grupos.map(([ano, meses]) => (
        <section
          key={ano}
          aria-label={ano ? `Ano ${ano}` : "Sem data registrada"}
          className="space-y-4"
        >
          <h3 className="text-base font-semibold text-foreground">
            {ano || "Sem data registrada"}
          </h3>
          {meses.map(([mes, lista]) => (
            <div key={mes}>
              {mes && (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {MESES[Number(mes) - 1]}
                </p>
              )}
              <ol className="relative ml-3 border-l border-border/70">
                {lista.map((e) => {
                  const { icon: Icon, cls } = ICONE[e.tipo];
                  const dataHora = dataHoraTrajetoria(e);
                  return (
                    <li key={e.id} className="relative pb-4 pl-7 last:pb-0">
                      <span
                        className={cn(
                          "absolute -left-[13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border",
                          cls,
                        )}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 break-words rounded-xl border border-border/60 bg-card/60 px-3.5 py-2.5">
                        {dataHora && (
                          <p className="text-xs text-muted-foreground">
                            <time dateTime={dataHora}>
                              {formatarDataBR(dataHora)}
                            </time>
                            {dataHora.includes("T") &&
                              ` às ${dataHora.slice(11, 16)}`}
                          </p>
                        )}
                        <p className="text-sm font-medium text-foreground">
                          {e.titulo}
                        </p>
                        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted-foreground">
                          {e.atividadeNome && (
                            <div>
                              <dt className="inline">Atividade: </dt>
                              <dd className="inline text-foreground/90">
                                {e.atividadeNome}
                              </dd>
                            </div>
                          )}
                          {e.turmaNome && (
                            <div>
                              <dt className="inline">Turma: </dt>
                              <dd className="inline text-foreground/90">
                                {e.turmaNome}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {e.complemento && (
                          <p className="mt-1 text-[13px] text-muted-foreground">
                            {e.complemento}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const vazio: FrequenciaTrajetoria[] = [];

export default function ParticipanteLinhaTempo() {
  const { id = "" } = useParams<{ id: string }>();
  return <Trajetoria key={id} id={id} />;
}

function Trajetoria({ id }: { id: string }) {
  const valido = /^[1-9]\d*$/.test(id);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [aba, setAba] = useState("timeline");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [ini, setIni] = useState("");
  const [fim, setFim] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFiltro>("todos");
  const [atividadeF, setAtividadeF] = useState("todas");
  const [turmaF, setTurmaF] = useState("todas");
  const [ordem, setOrdem] = useState<"desc" | "asc">("desc");
  const [fPeriodo, setFPeriodo] = useState<Periodo>("todos");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");

  async function baixarPdf() {
    if (gerandoPdf) return;
    setGerandoPdf(true);
    try {
      await downloadIndividualReport(
        `/participantes/${encodeURIComponent(id)}/linha-do-tempo/relatorio`,
        `linha-do-tempo-participante-${id}.pdf`,
      );
    } catch (erro) {
      toast.error(
        erro instanceof Error
          ? erro.message
          : "Não foi possível gerar o relatório da linha do tempo.",
      );
    } finally {
      setGerandoPdf(false);
    }
  }

  const escopo = escopoAnalitico();
  const prefixo = ["trajetoria-participante", escopo, id];
  const permissoes = useQuery({
    queryKey: ["permissoes", escopo, "PARTICIPANTES"],
    queryFn: () => getPermissoesUsuarioLogadoPorModulo("PARTICIPANTES"),
    enabled: valido,
    retry: false,
  });
  const resumo = useQuery({
    queryKey: [...prefixo, "resumo"],
    queryFn: ({ signal }) => consultarResumoTrajetoria(id, {}, signal),
    enabled: valido,
    retry: false,
  });

  const periodoTimeline = intervalo(periodo, ini, fim);
  const datasTimelineValidas = intervaloValido(periodoTimeline);
  const filtros = {
    ...periodoTimeline,
    tipo: categoria,
    atividadeId: atividadeF === "todas" ? undefined : atividadeF,
    turmaId: turmaF === "todas" ? undefined : turmaF,
    ordem,
  };
  const timeline = useInfiniteQuery({
    queryKey: [...prefixo, "eventos", filtros],
    queryFn: ({ pageParam, signal }) =>
      consultarTrajetoria(id, filtros, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: ({ page, size, totalElements }) =>
      (page + 1) * size < totalElements ? page + 1 : undefined,
    enabled:
      valido && resumo.isSuccess && datasTimelineValidas && aba === "timeline",
    retry: false,
  });

  const periodoFrequencia = intervalo(fPeriodo, fIni, fFim);
  const datasFrequenciaValidas = intervaloValido(periodoFrequencia);
  const temRecorte = Boolean(periodoFrequencia.inicio || periodoFrequencia.fim);
  const frequenciaFiltrada = useQuery({
    queryKey: [...prefixo, "resumo", periodoFrequencia],
    queryFn: ({ signal }) =>
      consultarResumoTrajetoria(id, periodoFrequencia, signal),
    enabled:
      valido &&
      Boolean(resumo.data?.frequenciaDisponivel) &&
      aba === "frequencia" &&
      datasFrequenciaValidas &&
      temRecorte,
    retry: false,
  });

  const filtrosAtivos =
    periodo !== "todos" ||
    categoria !== "todos" ||
    atividadeF !== "todas" ||
    turmaF !== "todas";
  const limparFiltros = () => {
    setPeriodo("todos");
    setIni("");
    setFim("");
    setCategoria("todos");
    setAtividadeF("todas");
    setTurmaF("todas");
  };

  if (valido && resumo.isPending) {
    return (
      <AppLayout>
        <div
          data-mobile-data-page="people"
          className="container max-w-4xl py-6 sm:py-8"
        >
          <BackButton to="/participantes" className="max-md:min-h-11" />
          <div
            className="space-y-4"
            aria-busy="true"
            aria-label="Carregando linha do tempo"
          >
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!resumo.data) {
    const ausente =
      !valido ||
      (resumo.error instanceof ApiError && resumo.error.status === 404);
    return (
      <AppLayout>
        <div
          data-mobile-data-page="people"
          className="container max-w-4xl py-6 sm:py-8"
        >
          <BackButton to="/participantes" className="max-md:min-h-11" />
          <Vazio
            titulo={
              ausente
                ? "Participante não encontrado"
                : "Não foi possível carregar a linha do tempo"
            }
            texto={
              ausente
                ? "Confira o registro na sua organização."
                : resumo.error?.message
            }
          />
          {!ausente && (
            <Button
              variant="glassSecondary"
              className="mt-4"
              onClick={() => void resumo.refetch()}
            >
              Tentar novamente
            </Button>
          )}
        </div>
      </AppLayout>
    );
  }

  const { participante, frequenciaDisponivel } = resumo.data;
  const ind = indicadoresTrajetoria(resumo.data);
  const { frequencia } = ind;
  const primeiraMatricula = formatarDataBR(ind.primeiroVinculo);
  const cep = maskCEP(participante.cep ?? "");
  const endereco = [
    participante.logradouro,
    participante.numero,
    participante.complemento,
    participante.bairro,
    [participante.cidade, participante.estado]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(" / "),
    cep ? `CEP ${cep}` : null,
  ]
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(", ");
  const vinculos = vinculosTrajetoria(resumo.data);
  const emAndamento = vinculos.filter((v) => v.status !== null);
  const anteriores = vinculos.filter((v) => v.status === null);
  const opcoesAtividade = Array.from(
    new Map(vinculos.map((v) => [v.atividadeId, v.atividadeNome])),
  );
  const opcoesTurma = Array.from(
    new Map(
      vinculos.flatMap((v) =>
        v.turmaId && (atividadeF === "todas" || v.atividadeId === atividadeF)
          ? [[v.turmaId, v.turmaNome ?? v.turmaId] as const]
          : [],
      ),
    ),
  );
  const eventos = timeline.data?.pages.flatMap((page) => page.content) ?? [];
  const totalEventos = timeline.data?.pages[0]?.totalElements;

  const regsFreq =
    (temRecorte
      ? frequenciaFiltrada.data?.frequencia
      : resumo.data.frequencia) ?? vazio;
  const freq = resumoFrequencia(regsFreq);
  const porMes = Array.from(agruparFrequencia(regsFreq, (r) => r.mes))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, registros]) => {
      const f = resumoFrequencia(registros);
      return {
        name: `${MES_CURTO[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`,
        frequencia:
          f.percentual === null ? null : Number(f.percentual.toFixed(1)),
        Presenças: f.presencas,
        Ausências: f.ausencias,
      };
    });
  const agrupar = (
    chave: (r: FrequenciaTrajetoria) => string | null,
    rotulo: (r: FrequenciaTrajetoria) => string,
  ) => {
    const nomes = new Map<string, number>();
    const grupos = Array.from(
      agruparFrequencia(regsFreq, chave),
      ([id, registros]) => {
        const name = rotulo(registros[0]);
        nomes.set(name, (nomes.get(name) ?? 0) + 1);
        return {
          id,
          name,
          value: Number(
            (resumoFrequencia(registros).percentual ?? 0).toFixed(1),
          ),
        };
      },
    );
    return grupos.map(({ id, name, value }) => ({
      name: (nomes.get(name) ?? 0) > 1 ? `${name} (#${id})` : name,
      value,
    }));
  };
  const porAtividade = agrupar(
    (r) => r.atividadeId,
    (r) => r.atividadeNome,
  );
  const porTurma = agrupar(
    (r) => r.turmaId,
    (r) => r.turmaNome ?? "Turma",
  );

  return (
    <AppLayout>
      <div
        data-mobile-data-page="people"
        className="container max-w-4xl py-6 sm:py-8"
      >
        <BackButton to="/participantes" className="max-md:min-h-11" />
        <ListPageHeader
          title="Linha do Tempo"
          tooltip="Consulte o histórico de participação nas atividades da organização, reunindo automaticamente informações sobre matrículas, turmas, frequência e outros registros vinculados ao participante."
          objective={`Apresentar de forma cronológica e integrada a trajetória de ${participante.nomeCompleto} na organização, permitindo acompanhar suas atividades, vínculos com turmas, registros de presença e ausência e a evolução de sua participação ao longo do tempo.`}
          actionsRequireCreatePermission={false}
          actions={
            permissoes.data?.GERAR_PDF && (
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={baixarPdf}
                disabled={gerandoPdf}
                aria-busy={gerandoPdf}
                title="Baixar o relatório completo do participante"
              >
                {gerandoPdf ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <FileDown aria-hidden />
                )}
                {gerandoPdf ? "Gerando PDF..." : "Gerar PDF"}
              </Button>
            )
          }
        />

        <div className="min-w-0 space-y-5">
          <section
            aria-label="Identificação do participante"
            className="rounded-[16px] border border-border/70 bg-card/70 p-4 backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 break-words text-base font-semibold text-foreground">
                {participante.nomeCompleto}
              </p>
              <StatusPill status={participante.status} />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3 sm:max-w-3xl">
              <div>
                <dt className="text-muted-foreground">
                  Data da primeira matrícula
                </dt>
                <dd className="text-foreground">
                  {primeiraMatricula ?? "Não registrada"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vínculos atuais</dt>
                <dd className="text-foreground">
                  {resumo.data.vinculos.length || "Nenhum"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Endereço</dt>
                <dd className="break-words text-foreground">
                  {endereco || "Não informado"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-label="Resumo da trajetória"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <ReportStatCard
              icon={Layers}
              label="Atividades"
              valor={String(ind.atividades)}
              hint="Atividades distintas"
            />
            <ReportStatCard
              icon={Users}
              label="Turmas"
              valor={String(ind.turmas)}
              hint="Turmas distintas"
              tone="info"
            />
            <ReportStatCard
              icon={UserCheck}
              label="Presenças"
              valor={frequenciaDisponivel ? String(frequencia.presencas) : "—"}
              hint="Registradas"
              tone="success"
            />
            <ReportStatCard
              icon={Percent}
              label="Frequência média"
              valor={pct(frequencia.percentual)}
              hint={
                !frequenciaDisponivel
                  ? "Consulta indisponível"
                  : frequencia.validos
                    ? `${frequencia.validos} registros válidos`
                    : "Sem registros de frequência"
              }
              tone="warning"
            />
            <ReportStatCard
              icon={CalendarClock}
              label="Primeiro vínculo"
              valor={primeiraMatricula ?? "Indisponível"}
              hint={
                ind.primeiroVinculo
                  ? "Primeira matrícula registrada"
                  : "Sem data de matrícula"
              }
              tone="neutral"
            />
            <ReportStatCard
              icon={Clock}
              label="Última participação"
              valor={formatarDataBR(ind.ultimaPresenca) ?? "Indisponível"}
              hint={
                ind.ultimaPresenca
                  ? "Último comparecimento"
                  : "Nenhuma presença registrada"
              }
              tone="neutral"
            />
          </section>

          <Tabs value={aba} onValueChange={setAba}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="h-auto w-max gap-1 rounded-[12px] border border-border/60 bg-card/60 p-1 backdrop-blur-md">
                <TabsTrigger value="timeline" className={abaGlassClass}>
                  Linha do Tempo
                </TabsTrigger>
                <TabsTrigger value="vinculos" className={abaGlassClass}>
                  Atividades e Turmas
                </TabsTrigger>
                <TabsTrigger value="frequencia" className={abaGlassClass}>
                  Frequência
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="timeline" className="mt-4 space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-[16px] border border-border/70 bg-card/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <PeriodoFields
                  idPrefix="tl"
                  periodo={periodo}
                  setPeriodo={setPeriodo}
                  ini={ini}
                  setIni={setIni}
                  fim={fim}
                  setFim={setFim}
                />
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="tl-tipo">
                    Tipo de acontecimento
                  </FieldLabel>
                  <Select
                    value={categoria}
                    onValueChange={(v) => setCategoria(v as CategoriaFiltro)}
                  >
                    <SelectTrigger id="tl-tipo" className={seletorGlassClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={opcoesGlassClass}>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="cadastros">
                        Cadastros e matrículas
                      </SelectItem>
                      <SelectItem value="atividades">
                        Atividades e turmas
                      </SelectItem>
                      <SelectItem value="presencas">Presenças</SelectItem>
                      <SelectItem value="ausencias">Ausências</SelectItem>
                      <SelectItem value="encontro">
                        Feriados e dias sem aula
                      </SelectItem>
                      <SelectItem value="encerramentos">
                        Encerramentos e conclusões
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="tl-ativ">Atividade</FieldLabel>
                  <Select
                    value={atividadeF}
                    onValueChange={(value) => {
                      setAtividadeF(value);
                      setTurmaF("todas");
                    }}
                  >
                    <SelectTrigger id="tl-ativ" className={seletorGlassClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={opcoesGlassClass}>
                      <SelectItem value="todas">Todas</SelectItem>
                      {opcoesAtividade.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="tl-turma">Turma</FieldLabel>
                  <Select value={turmaF} onValueChange={setTurmaF}>
                    <SelectTrigger id="tl-turma" className={seletorGlassClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={opcoesGlassClass}>
                      <SelectItem value="todas">Todas</SelectItem>
                      {opcoesTurma.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3 sm:col-span-2 xl:col-span-4">
                  <Button
                    variant="glassSecondary"
                    className="h-9 gap-2"
                    onClick={() =>
                      setOrdem((o) => (o === "desc" ? "asc" : "desc"))
                    }
                    aria-label="Alternar ordenação"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                    {ordem === "desc"
                      ? "Mais recentes primeiro"
                      : "Mais antigos primeiro"}
                  </Button>
                  {filtrosAtivos && (
                    <Button
                      variant="glassSecondary"
                      className="h-9"
                      onClick={limparFiltros}
                    >
                      Limpar filtros
                    </Button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {totalEventos !== undefined &&
                      `${totalEventos} acontecimento(s)`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                O histórico reúne cadastros, matrículas, alterações,
                encerramentos e lançamentos de frequência.
                {!frequenciaDisponivel &&
                  " Seu acesso não inclui os registros de frequência."}
              </p>

              {!datasTimelineValidas ? (
                <p role="alert" className="text-sm text-destructive">
                  A data inicial deve ser anterior ou igual à final.
                </p>
              ) : timeline.isPending ? (
                <Skeleton
                  className="h-40 w-full rounded-2xl"
                  aria-label="Carregando acontecimentos"
                />
              ) : timeline.isError && !timeline.data ? (
                <div className="space-y-3">
                  <Vazio titulo="Não foi possível consultar os acontecimentos" />
                  <Button
                    variant="glassSecondary"
                    onClick={() => void timeline.refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : eventos.length === 0 ? (
                <Vazio
                  icon={CalendarX}
                  titulo={
                    filtrosAtivos
                      ? "Nenhum acontecimento corresponde aos filtros"
                      : "Nenhum acontecimento registrado"
                  }
                />
              ) : (
                <>
                  <TimelineTrajetoria eventos={eventos} />
                  {timeline.hasNextPage && (
                    <Button
                      variant="glassSecondary"
                      disabled={timeline.isFetchingNextPage}
                      onClick={() => void timeline.fetchNextPage()}
                    >
                      {timeline.isFetchingNextPage
                        ? "Carregando..."
                        : "Carregar mais acontecimentos"}
                    </Button>
                  )}
                  {timeline.isFetchNextPageError && (
                    <p role="alert" className="text-sm text-destructive">
                      Não foi possível carregar mais acontecimentos. Tente
                      novamente.
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="vinculos" className="mt-4 space-y-6">
              {vinculos.length === 0 ? (
                <Vazio
                  titulo="Nenhum vínculo encontrado"
                  texto="O participante não possui matrículas em atividades ou turmas."
                />
              ) : (
                (
                  [
                    ["Vínculos no cadastro", emAndamento],
                    ["Vínculos encontrados apenas na frequência", anteriores],
                  ] as const
                ).map(
                  ([titulo, lista]) =>
                    lista.length > 0 && (
                      <section key={titulo} className="space-y-3">
                        <h2 className="text-sm font-semibold text-foreground">
                          {titulo as string}
                        </h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
                          {lista.map((v) => (
                            <article
                              key={`${v.atividadeId}|${v.turmaId}`}
                              className="rounded-2xl border border-border/70 bg-card/70 p-4"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <Link
                                    to={`/atividades/${v.atividadeId}`}
                                    className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:underline"
                                  >
                                    {v.atividadeNome}
                                  </Link>
                                  <p className="text-[13px] text-muted-foreground">
                                    {v.turmaNome
                                      ? `Turma: ${v.turmaNome}`
                                      : "Sem turma"}
                                  </p>
                                </div>
                                {v.status ? (
                                  <StatusPill
                                    status={statusMatriculaValueToLabel(
                                      v.status,
                                    )}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Sem situação no cadastro
                                  </span>
                                )}
                              </div>
                              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                                <div>
                                  <dt className="text-muted-foreground">
                                    Matrícula
                                  </dt>
                                  <dd>
                                    {formatarDataBR(v.dataMatricula) ??
                                      "Data não registrada"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    Primeiro registro
                                  </dt>
                                  <dd>{formatarDataBR(v.primeiro) ?? "—"}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    Presenças
                                  </dt>
                                  <dd>
                                    {frequenciaDisponivel
                                      ? v.freq.presencas
                                      : "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    Registros válidos
                                  </dt>
                                  <dd>
                                    {frequenciaDisponivel
                                      ? v.freq.validos
                                      : "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    Frequência
                                  </dt>
                                  <dd>{pct(v.freq.percentual)}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    Encerramento
                                  </dt>
                                  <dd>Não registrado</dd>
                                </div>
                              </dl>
                            </article>
                          ))}
                        </div>
                      </section>
                    ),
                )
              )}
            </TabsContent>

            <TabsContent value="frequencia" className="mt-4 space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-[16px] border border-border/70 bg-card/60 p-4 sm:grid-cols-3">
                <PeriodoFields
                  idPrefix="fq"
                  periodo={fPeriodo}
                  setPeriodo={setFPeriodo}
                  ini={fIni}
                  setIni={setFIni}
                  fim={fFim}
                  setFim={setFFim}
                />
              </div>
              {!frequenciaDisponivel ? (
                <Vazio
                  titulo="Frequência indisponível"
                  texto="Seu acesso não inclui os registros de frequência."
                />
              ) : !datasFrequenciaValidas ? (
                <p role="alert" className="text-sm text-destructive">
                  A data inicial deve ser anterior ou igual à final.
                </p>
              ) : temRecorte && frequenciaFiltrada.isPending ? (
                <Skeleton
                  className="h-40 w-full rounded-2xl"
                  aria-label="Carregando frequência"
                />
              ) : temRecorte && frequenciaFiltrada.isError ? (
                <div className="space-y-3">
                  <Vazio titulo="Não foi possível carregar a frequência" />
                  <Button
                    variant="glassSecondary"
                    onClick={() => void frequenciaFiltrada.refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <>
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ReportStatCard
                      icon={UserCheck}
                      label="Presenças"
                      valor={String(freq.presencas)}
                      tone="success"
                    />
                    <ReportStatCard
                      icon={UserX}
                      label="Ausências"
                      valor={String(freq.ausencias)}
                      tone="danger"
                    />
                    <ReportStatCard
                      icon={CalendarCheck}
                      label="Registros válidos"
                      valor={String(freq.validos)}
                      tone="info"
                    />
                    <ReportStatCard
                      icon={Percent}
                      label="Frequência geral"
                      valor={pct(freq.percentual)}
                      hint="Presenças ÷ registros lançados"
                      tone="warning"
                    />
                  </section>
                  <p className="text-xs text-muted-foreground">
                    A frequência considera apenas presenças e ausências
                    registradas. Feriados e dias sem aula ficam fora do cálculo.
                  </p>
                  {freq.validos === 0 ? (
                    <Vazio
                      titulo="Sem registros de frequência no período"
                      texto="Selecione outro período ou aguarde novos lançamentos."
                    />
                  ) : (
                    <ReportChartGrid>
                      <ReportChartCard
                        title="Evolução da frequência"
                        description="Percentual de presença por mês"
                      >
                        <ReportLineChart
                          data={porMes.map(({ name, frequencia }) => ({
                            name,
                            value: frequencia,
                          }))}
                          reportKey="presencas"
                          name="Frequência"
                          type="linear"
                          percent
                        />
                      </ReportChartCard>
                      <ReportChartCard
                        title="Presenças e ausências por mês"
                        description="Quantidade de registros lançados"
                      >
                        <ReportComparisonBarChart
                          data={porMes.map(
                            ({ name, Presenças, Ausências }) => ({
                              name,
                              Presenças,
                              Ausências,
                            }),
                          )}
                          series={[
                            { key: "Presenças", label: "Presenças" },
                            { key: "Ausências", label: "Ausências" },
                          ]}
                          reportKey="presencas"
                          stacked
                          allowDecimals={false}
                        />
                      </ReportChartCard>
                      <ReportChartCard
                        title="Frequência por atividade"
                        description="Percentual de presença"
                      >
                        <ReportBarChart
                          data={porAtividade}
                          showZero
                          reportKey="presencas"
                          percent
                        />
                      </ReportChartCard>
                      <ReportChartCard
                        title="Frequência por turma"
                        description="Percentual de presença"
                      >
                        {porTurma.length ? (
                          <ReportBarChart
                            data={porTurma}
                            showZero
                            reportKey="presencas"
                            percent
                          />
                        ) : (
                          <Vazio titulo="Registros sem turma" />
                        )}
                      </ReportChartCard>
                    </ReportChartGrid>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

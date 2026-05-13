import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Layers,
  Lock,
  PauseCircle,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  countByStatus,
  fmtNumber,
  getAtividadesList,
  getParticipantesList,
  getProjetosList,
  groupByField,
  groupParticipantesPorAtividade,
  labelAreaAtuacao,
  labelStatus,
  labelTipoAtividade,
  type AtividadeRaw,
  type DashboardResponse,
  type DistribuicaoItem,
  type ParticipanteRaw,
  type ProjetoRaw,
} from "@/data/dashboard";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(217 91% 60%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 60%)",
  "hsl(280 70% 60%)",
];

type Tone = "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";

const TONE_BG: Record<Tone, string> = {
  blue: "bg-blue-50 border-blue-100",
  violet: "bg-violet-50 border-violet-100",
  emerald: "bg-emerald-50 border-emerald-100",
  amber: "bg-amber-50 border-amber-100",
  rose: "bg-rose-50 border-rose-100",
  slate: "bg-slate-50 border-slate-100",
};

const TONE_ICON: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  loading?: boolean;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
  loading,
}: KpiCardProps) {
  return (
    <Card className={`border ${TONE_BG[tone]} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone]}`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>

            {loading ? (
              <Skeleton className="mt-1 h-6 w-20" />
            ) : (
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {value}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompactTooltipPayload {
  name?: string | number;
  value?: number | string;
  payload?: { label?: string };
}

function CompactTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: CompactTooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];

  const itemLabel =
    (typeof label === "string" || typeof label === "number"
      ? String(label)
      : null) ??
    item.payload?.label ??
    (item.name !== undefined ? String(item.name) : "");

  const rawValue = item.value;

  const formattedValue =
    typeof rawValue === "number" ? fmtNumber(rawValue) : String(rawValue ?? "");

  return (
    <div
      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-sm"
      style={{ maxWidth: 220 }}
    >
      {itemLabel && (
        <p className="truncate font-medium text-foreground">{itemLabel}</p>
      )}

      <p className="tabular-nums text-muted-foreground">{formattedValue}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {isEmpty ? (
          <div className="flex h-56 items-center justify-center rounded border border-dashed border-border bg-muted/20">
            <p className="px-6 text-center text-xs text-muted-foreground">
              {emptyMessage ??
                "Ainda não há dados suficientes para gerar este gráfico."}
            </p>
          </div>
        ) : (
          <div className="h-56">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionUnavailable({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
      <BarChart3 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />

      <p className="text-sm font-medium text-foreground">
        Indicadores ainda não disponíveis
      </p>

      <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground">
        {message ??
          "Esta visão será preenchida automaticamente assim que o backend expor o endpoint correspondente. Nenhum dado fictício é exibido."}
      </p>
    </div>
  );
}

function SectionAccessDenied({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <Lock className="mx-auto mb-2 h-5 w-5 text-amber-700" />

      <p className="text-sm font-medium text-amber-900">
        Conteúdo restrito ao plano
      </p>

      <p className="mx-auto mt-1.5 max-w-md text-xs text-amber-800">
        {message}
      </p>
    </div>
  );
}

const hasDistribuicao = (data?: DistribuicaoItem[]) =>
  Array.isArray(data) && data.some((item) => Number(item.valor) > 0);

export default function Dashboard() {
  const [participantes, setParticipantes] = useState<
    DashboardResponse<ParticipanteRaw[]>
  >({
    data: null,
    unavailable: false,
  });

  const [atividades, setAtividades] = useState<
    DashboardResponse<AtividadeRaw[]>
  >({
    data: null,
    unavailable: false,
  });

  const [projetos, setProjetos] = useState<DashboardResponse<ProjetoRaw[]>>({
    data: null,
    unavailable: false,
  });

  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      const [participantesData, atividadesData, projetosData] =
        await Promise.all([
          getParticipantesList(),
          getAtividadesList(),
          getProjetosList(),
        ]);

      setParticipantes(participantesData);
      setAtividades(atividadesData);
      setProjetos(projetosData);

      if (
        participantesData.unavailable &&
        atividadesData.unavailable &&
        projetosData.unavailable
      ) {
        toast.error("Não foi possível carregar os indicadores do dashboard.");
      }
    } catch {
      toast.error("Não foi possível carregar os indicadores do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("DASHBOARD");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void fetchAll();
  }, [loadingPermissoes, podeVisualizar, fetchAll]);

  const partList = participantes.data;
  const atList = atividades.data;
  const prjList = projetos.data;

  const atividadesNomeMap = useMemo(() => {
    const map = new Map<string, string>();

    (atList ?? []).forEach((atividade) => {
      if (atividade.id == null) return;

      const nome =
        atividade.nomeAtividade?.trim() ||
        atividade.nome?.trim() ||
        `Atividade ${atividade.id}`;

      map.set(String(atividade.id), nome);
    });

    return map;
  }, [atList]);

  const participantesAgg = useMemo(() => {
    const total = partList?.length ?? 0;
    const ativos = countByStatus(partList, "ATIVO");
    const concluidos = countByStatus(partList, "CONCLUIDO");
    const pendentes = countByStatus(partList, "PENDENTE");
    const inativos = countByStatus(partList, "INATIVO");
    const inativosOuPendentes = pendentes + inativos;

    const porStatus = groupByField(partList ?? [], "status", labelStatus);

    const porAtividade = groupParticipantesPorAtividade(
      partList,
      atividadesNomeMap,
    );

    return {
      total,
      ativos,
      concluidos,
      pendentes,
      inativos,
      inativosOuPendentes,
      porStatus,
      porAtividade,
    };
  }, [partList, atividadesNomeMap]);

  const atividadesAgg = useMemo(() => {
    const total = atList?.length ?? 0;
    const ativos = countByStatus(atList, "ATIVO");
    const concluidos = countByStatus(atList, "CONCLUIDO");
    const pendentes = countByStatus(atList, "PENDENTE");
    const inativos = countByStatus(atList, "INATIVO");
    const pendentesOuInativos = pendentes + inativos;

    const porStatus = groupByField(atList ?? [], "status", labelStatus);

    const normalizadas = (atList ?? []).map((atividade) => ({
      tipo: atividade.tipoAtividade ?? atividade.tipo ?? "",
    }));

    const porTipo = groupByField(normalizadas, "tipo", labelTipoAtividade);

    return {
      total,
      ativos,
      concluidos,
      pendentes,
      inativos,
      pendentesOuInativos,
      porStatus,
      porTipo,
    };
  }, [atList]);

  const projetosAgg = useMemo(() => {
    const total = prjList?.length ?? 0;
    const ativos = countByStatus(prjList, "ATIVO");
    const concluidos = countByStatus(prjList, "CONCLUIDO");
    const pendentes = countByStatus(prjList, "PENDENTE");
    const inativos = countByStatus(prjList, "INATIVO");
    const pendentesOuInativos = pendentes + inativos;

    const porStatus = groupByField(prjList ?? [], "status", labelStatus);
    const porArea = groupByField(
      prjList ?? [],
      "areaAtuacao",
      labelAreaAtuacao,
    );

    return {
      total,
      ativos,
      concluidos,
      pendentes,
      inativos,
      pendentesOuInativos,
      porStatus,
      porArea,
    };
  }, [prjList]);

  const showPart4 = participantesAgg.inativosOuPendentes > 0;
  const showAt4 = atividadesAgg.pendentesOuInativos > 0;
  const showPrj4 = projetosAgg.pendentesOuInativos > 0;

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Carregando dashboard...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Dashboard"
          tooltip="Acompanhe, em uma visão geral, os principais dados da organização, como projetos, pessoas, atividades, documentos, financeiro e prestação de contas."
          description="Use esta página para visualizar rapidamente a situação da organização e identificar pendências, avanços e áreas que precisam de atenção."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAll}
              disabled={loading}
              className="h-9 gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          }
        />

        <Tabs defaultValue="participantes" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="participantes" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Participantes
            </TabsTrigger>

            <TabsTrigger value="atividades" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Atividades
            </TabsTrigger>

            <TabsTrigger value="projetos" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" />
              Projetos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participantes" className="space-y-4">
            {participantes.accessDeniedMessage ? (
              <SectionAccessDenied message={participantes.accessDeniedMessage} />
            ) : participantes.unavailable && !partList ? (
              <SectionUnavailable />
            ) : (
              <>
                <div
                  className={
                    showPart4
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-3"
                  }
                >
                  <KpiCard
                    icon={Users}
                    label="Total"
                    value={fmtNumber(participantesAgg.total)}
                    tone="blue"
                    loading={loading}
                  />

                  <KpiCard
                    icon={Activity}
                    label="Ativos"
                    value={fmtNumber(participantesAgg.ativos)}
                    tone="emerald"
                    loading={loading}
                  />

                  <KpiCard
                    icon={CheckCircle2}
                    label="Concluídos"
                    value={fmtNumber(participantesAgg.concluidos)}
                    tone="violet"
                    loading={loading}
                  />

                  {showPart4 && (
                    <KpiCard
                      icon={
                        participantesAgg.pendentes > 0 ? Clock : PauseCircle
                      }
                      label={
                        participantesAgg.pendentes > 0
                          ? "Pendentes"
                          : "Inativos"
                      }
                      value={fmtNumber(
                        participantesAgg.pendentes > 0
                          ? participantesAgg.pendentes
                          : participantesAgg.inativos,
                      )}
                      tone="amber"
                      loading={loading}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <ChartCard
                    title="Participantes por status"
                    isEmpty={!hasDistribuicao(participantesAgg.porStatus)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participantesAgg.porStatus}>
                        <XAxis dataKey="label" stroke="#888" fontSize={11} />

                        <YAxis
                          stroke="#888"
                          fontSize={11}
                          allowDecimals={false}
                        />

                        <RTooltip
                          content={<CompactTooltip />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        />

                        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                          {participantesAgg.porStatus.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Participantes por atividade"
                    description="Mostra cada atividade e o total de participantes vinculados."
                    isEmpty={!hasDistribuicao(participantesAgg.porAtividade)}
                    emptyMessage="Nenhum participante vinculado a atividades foi encontrado."
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={participantesAgg.porAtividade}
                        layout="vertical"
                        margin={{ top: 5, right: 16, left: 16, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          stroke="#888"
                          fontSize={11}
                          allowDecimals={false}
                        />

                        <YAxis
                          type="category"
                          dataKey="label"
                          stroke="#888"
                          fontSize={11}
                          width={140}
                        />

                        <RTooltip
                          content={<CompactTooltip />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        />

                        <Bar dataKey="valor" radius={[4, 4, 4, 4]}>
                          {participantesAgg.porAtividade.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="atividades" className="space-y-4">
            {atividades.accessDeniedMessage ? (
              <SectionAccessDenied message={atividades.accessDeniedMessage} />
            ) : atividades.unavailable && !atList ? (
              <SectionUnavailable />
            ) : (
              <>
                <div
                  className={
                    showAt4
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-3"
                  }
                >
                  <KpiCard
                    icon={ClipboardCheck}
                    label="Total"
                    value={fmtNumber(atividadesAgg.total)}
                    tone="blue"
                    loading={loading}
                  />

                  <KpiCard
                    icon={Activity}
                    label="Ativas"
                    value={fmtNumber(atividadesAgg.ativos)}
                    tone="emerald"
                    loading={loading}
                  />

                  <KpiCard
                    icon={CheckCircle2}
                    label="Concluídas"
                    value={fmtNumber(atividadesAgg.concluidos)}
                    tone="violet"
                    loading={loading}
                  />

                  {showAt4 && (
                    <KpiCard
                      icon={atividadesAgg.pendentes > 0 ? Clock : PauseCircle}
                      label={
                        atividadesAgg.pendentes > 0 ? "Pendentes" : "Inativas"
                      }
                      value={fmtNumber(
                        atividadesAgg.pendentes > 0
                          ? atividadesAgg.pendentes
                          : atividadesAgg.inativos,
                      )}
                      tone="amber"
                      loading={loading}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <ChartCard
                    title="Atividades por tipo"
                    isEmpty={!hasDistribuicao(atividadesAgg.porTipo)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={atividadesAgg.porTipo}
                          dataKey="valor"
                          nameKey="label"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {atividadesAgg.porTipo.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <RTooltip content={<CompactTooltip />} />

                        <Legend
                          wrapperStyle={{ fontSize: "11px" }}
                          iconType="circle"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Atividades por status"
                    isEmpty={!hasDistribuicao(atividadesAgg.porStatus)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={atividadesAgg.porStatus}>
                        <XAxis dataKey="label" stroke="#888" fontSize={11} />

                        <YAxis
                          stroke="#888"
                          fontSize={11}
                          allowDecimals={false}
                        />

                        <RTooltip
                          content={<CompactTooltip />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        />

                        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                          {atividadesAgg.porStatus.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="projetos" className="space-y-4">
            {projetos.accessDeniedMessage ? (
              <SectionAccessDenied message={projetos.accessDeniedMessage} />
            ) : projetos.unavailable && !prjList ? (
              <SectionUnavailable />
            ) : (
              <>
                <div
                  className={
                    showPrj4
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-3"
                  }
                >
                  <KpiCard
                    icon={FolderKanban}
                    label="Total"
                    value={fmtNumber(projetosAgg.total)}
                    tone="violet"
                    loading={loading}
                  />

                  <KpiCard
                    icon={Activity}
                    label="Ativos"
                    value={fmtNumber(projetosAgg.ativos)}
                    tone="emerald"
                    loading={loading}
                  />

                  <KpiCard
                    icon={CheckCircle2}
                    label="Concluídos"
                    value={fmtNumber(projetosAgg.concluidos)}
                    tone="blue"
                    loading={loading}
                  />

                  {showPrj4 && (
                    <KpiCard
                      icon={projetosAgg.pendentes > 0 ? Clock : PauseCircle}
                      label={
                        projetosAgg.pendentes > 0 ? "Pendentes" : "Inativos"
                      }
                      value={fmtNumber(
                        projetosAgg.pendentes > 0
                          ? projetosAgg.pendentes
                          : projetosAgg.inativos,
                      )}
                      tone="amber"
                      loading={loading}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <ChartCard
                    title="Projetos por área de atuação"
                    isEmpty={!hasDistribuicao(projetosAgg.porArea)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projetosAgg.porArea}
                          dataKey="valor"
                          nameKey="label"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {projetosAgg.porArea.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <RTooltip content={<CompactTooltip />} />

                        <Legend
                          wrapperStyle={{ fontSize: "11px" }}
                          iconType="circle"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Projetos por status"
                    isEmpty={!hasDistribuicao(projetosAgg.porStatus)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projetosAgg.porStatus}>
                        <XAxis dataKey="label" stroke="#888" fontSize={11} />

                        <YAxis
                          stroke="#888"
                          fontSize={11}
                          allowDecimals={false}
                        />

                        <RTooltip
                          content={<CompactTooltip />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        />

                        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                          {projetosAgg.porStatus.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        Áreas de atuação
                      </p>

                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {fmtNumber(projetosAgg.porArea.length)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WikiFloatingButton pageTitle="Dashboard" />
    </AppLayout>
  );
}
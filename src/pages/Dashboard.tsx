import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Boxes,
  CalendarClock,
  FolderKanban,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SectionRestricted } from "@/components/dashboard/DashboardKit";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardPendencias } from "@/components/dashboard/DashboardPendencias";
import { DashboardAgenda } from "@/components/dashboard/DashboardAgenda";
import { DashboardProjetos } from "@/components/dashboard/DashboardProjetos";
import { DashboardExecucao } from "@/components/dashboard/DashboardExecucao";
import { DashboardPublico } from "@/components/dashboard/DashboardPublico";
import { DashboardImpacto } from "@/components/dashboard/DashboardImpacto";
import { DashboardRegularidade } from "@/components/dashboard/DashboardRegularidade";
import { DashboardPatrimonio } from "@/components/dashboard/DashboardPatrimonio";
import { useModuleAccess } from "@/lib/dashboardPermissions";
import {
  getDashboardResumo,
  type DashboardResumoDTO,
} from "@/lib/dashboardService";
import {
  loadDashboardCentral,
  type DashboardCentralSnapshot,
} from "@/data/dashboardCentral";
import type { ModuloPermissao } from "@/data/usuarios";

interface SectionDef {
  id: string;
  label: string;
  icon: LucideIcon;
  modulos: ModuloPermissao[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "visao-geral",
    label: "Visão geral",
    icon: LayoutDashboard,
    modulos: ["DASHBOARD"],
  },
  {
    id: "pendencias",
    label: "Pendências",
    icon: AlertTriangle,
    modulos: [
      "DOCUMENTOS",
      "PROJETOS",
      "CRONOGRAMA",
      "EVIDENCIAS",
      "PRESENCAS",
      "EMPRESTIMOS",
      "PARTICIPANTES",
      "DIRETORIA",
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarClock,
    modulos: [
      "PROJETOS",
      "CRONOGRAMA",
      "ATIVIDADES",
      "EVENTOS_CULTURAIS",
      "EDITAIS",
      "DOCUMENTOS",
      "EMPRESTIMOS",
    ],
  },
  {
    id: "projetos",
    label: "Projetos",
    icon: FolderKanban,
    modulos: ["PROJETOS"],
  },
  {
    id: "execucao",
    label: "Execução",
    icon: Activity,
    modulos: ["ATIVIDADES", "TURMAS", "PRESENCAS"],
  },
  { id: "publico", label: "Público", icon: Users, modulos: ["PARTICIPANTES"] },
  {
    id: "impacto",
    label: "Impacto",
    icon: Sparkles,
    modulos: ["EVIDENCIAS", "ATIVIDADES", "EVENTOS_CULTURAIS", "RELATORIOS"],
  },
  {
    id: "regularidade",
    label: "Regularidade",
    icon: ShieldCheck,
    modulos: ["DOCUMENTOS"],
  },
  {
    id: "patrimonio",
    label: "Patrimônio",
    icon: Boxes,
    modulos: ["PATRIMONIO", "EMPRESTIMOS"],
  },
];

function DashboardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Skeleton className="h-36 rounded-[14px]" />
      <Skeleton className="h-36 rounded-[14px]" />
      <Skeleton className="h-72 rounded-[14px] md:col-span-2" />
    </div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const access = useModuleAccess();
  const [snapshot, setSnapshot] = useState<DashboardCentralSnapshot | null>(
    null,
  );
  const [resumo, setResumo] = useState<DashboardResumoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAny = access.canAny;
  const secoes = useMemo(
    () =>
      SECTIONS.filter(
        (section) => section.id === "visao-geral" || canAny(section.modulos),
      ),
    [canAny],
  );

  const requested = params.get("secao") ?? "";
  const active = secoes.some((section) => section.id === requested)
    ? requested
    : SECTIONS.some((section) => section.id === requested)
      ? requested
      : (secoes[0]?.id ?? "visao-geral");

  useEffect(() => {
    if (!requested) {
      const next = new URLSearchParams(params);
      next.set("secao", active);
      setParams(next, { replace: true });
    }
  }, [requested, active, params, setParams]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [centralResult, overviewResult] = await Promise.allSettled([
        loadDashboardCentral(),
        getDashboardResumo(),
      ]);
      if (centralResult.status === "rejected") throw centralResult.reason;
      setSnapshot(centralResult.value);
      if (overviewResult.status === "fulfilled") {
        setResumo(overviewResult.value);
      } else {
        console.warn(
          "Resumo complementar do dashboard indisponível.",
          overviewResult.reason,
        );
        setResumo(null);
      }
    } catch (cause) {
      setSnapshot(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os dados do dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!access.loading) void carregar();
  }, [access.loading, carregar]);

  const navigateTo = useCallback(
    (section: string) => {
      const next = new URLSearchParams(params);
      next.set("secao", section);
      setParams(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [params, setParams],
  );

  const permitido = secoes.some((section) => section.id === active);

  const renderSection = () => {
    if (access.loading || loading) return <DashboardSkeleton />;
    if (!permitido) return <SectionRestricted />;
    if (error || !snapshot) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[14px] border border-destructive/20 bg-destructive/5 px-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            Não foi possível carregar o dashboard.
          </p>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="glassSecondary"
            className="mt-4 h-9 gap-2 px-4"
            onClick={() => void carregar()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Tentar novamente
          </Button>
        </div>
      );
    }

    switch (active) {
      case "pendencias":
        return <DashboardPendencias pendencias={snapshot.pendencias} />;
      case "agenda":
        return <DashboardAgenda agenda={snapshot.agenda} />;
      case "projetos":
        return <DashboardProjetos projetos={snapshot.projetos} />;
      case "execucao":
        return <DashboardExecucao execucao={snapshot.execucao} />;
      case "publico":
        return (
          <DashboardPublico
            resumo={snapshot.publico}
            atividades={snapshot.atividades}
          />
        );
      case "impacto":
        return <DashboardImpacto impacto={snapshot.impacto} />;
      case "regularidade":
        return <DashboardRegularidade regularidade={snapshot.regularidade} />;
      case "patrimonio":
        return <DashboardPatrimonio patrimonio={snapshot.patrimonio} />;
      default:
        return (
          <DashboardOverview
            pendencias={snapshot.pendencias}
            agenda={snapshot.agenda}
            projetos={snapshot.projetos}
            regularidade={snapshot.regularidade}
            resumo={snapshot.visaoGeral}
            resumoOrganizacao={resumo}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Dashboard"
          tooltip="Nesta página são reunidas informações já registradas em diferentes áreas da Aurit para facilitar o acompanhamento da organização. Consulte a execução dos projetos, pendências, compromissos, público atendido, resultados, documentos e patrimônio a partir de uma visão consolidada."
        />
        <PageObjective
          className="mb-4"
          description="Acompanhe de forma consolidada a situação da organização e consulte informações que ajudam a identificar o que está acontecendo, o que precisa de atenção, os próximos compromissos e os resultados das ações realizadas. Use as abas para analisar diferentes áreas sem precisar consultar cada cadastro separadamente."
        />

        <nav
          aria-label="Seções da central de acompanhamento"
          className="thin-scrollbar mb-5 overflow-x-auto rounded-[14px] border border-border/70 bg-card/70 p-1.5 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/55"
        >
          <ul className="flex min-w-max items-center gap-1">
            {secoes.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === active;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => navigateTo(section.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
                      isActive
                        ? "border border-primary/20 bg-primary/10 text-primary shadow-[0_1px_6px_-4px_hsl(215_28%_17%_/_0.25)]"
                        : "border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {renderSection()}
      </div>
      <WikiFloatingButton />
    </AppLayout>
  );
}

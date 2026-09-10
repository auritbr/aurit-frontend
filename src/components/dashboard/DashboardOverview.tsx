import {
  AlertTriangle,
  CalendarClock,
  FileCheck2,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportPieChart,
  ReportStatCard,
  ReportStatGrid,
} from "@/components/relatorios/ReportKit";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import {
  DistributionList,
  GlassPanel,
  ModuleLink,
  PrioridadeBadge,
  ProgressBar,
  SectionHeader,
} from "@/components/dashboard/DashboardKit";
import {
  fmtData,
  hoje,
  type AgendaItem,
  type Pendencia,
  type ProjetoResumo,
  type RegularidadeItem,
  type VisaoGeralResumo,
} from "@/data/dashboardCentral";
import type { DashboardResumoDTO } from "@/lib/dashboardService";

export function DashboardOverview({
  pendencias,
  agenda,
  projetos,
  regularidade,
  resumo,
  resumoOrganizacao,
  onNavigate,
}: {
  pendencias: Pendencia[];
  agenda: AgendaItem[];
  projetos: ProjetoResumo[];
  regularidade: RegularidadeItem[];
  resumo: VisaoGeralResumo;
  resumoOrganizacao: DashboardResumoDTO | null;
  onNavigate: (section: string) => void;
}) {
  const ref = hoje();
  const proximos = agenda.filter((a) => a.data >= ref).slice(0, 6);
  const criticas = pendencias
    .filter((p) => p.prioridade === "CRITICA")
    .slice(0, 6);
  const totalPendencias = resumo.pendenciasTotal;

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={LayoutDashboard}
        title="Visão geral da organização"
        description="Consulte um resumo das principais informações da organização, incluindo o andamento dos projetos e atividades, situações que precisam de atenção e compromissos previstos para os próximos 30 dias."
      />

      <ReportStatGrid>
        <ReportStatCard
          icon={FolderKanban}
          label="Projetos ativos"
          valor={`${resumo.projetosAtivos}/${resumoOrganizacao?.totalProjetos ?? resumo.projetosTotal}`}
        />
        <ReportStatCard
          icon={Users}
          label="Participantes ativos"
          valor={String(resumo.participantesAtivos)}
          tone="info"
        />
        <ReportStatCard
          icon={AlertTriangle}
          label="Pendências críticas"
          valor={String(resumo.pendenciasCriticas)}
          tone={resumo.pendenciasCriticas > 0 ? "danger" : "success"}
        />
        <ReportStatCard
          icon={CalendarClock}
          label="Compromissos (30 dias)"
          valor={String(resumo.compromissos30Dias)}
          tone="warning"
        />
        <ReportStatCard
          icon={Gauge}
          label="Progresso médio"
          valor={`${resumo.progressoMedio}%`}
          tone="primary"
        />
        <ReportStatCard
          icon={FileCheck2}
          label="Documentos vigentes"
          valor={`${resumo.documentosVigentes}`}
          tone="success"
        />
        <ReportStatCard
          icon={FileCheck2}
          label="Documentos vencidos"
          valor={String(
            resumoOrganizacao?.totalDocumentosVencidos ??
              resumo.documentosVencidos,
          )}
          tone={
            (resumoOrganizacao?.totalDocumentosVencidos ??
              resumo.documentosVencidos) > 0
              ? "danger"
              : "success"
          }
        />
        <ReportStatCard
          icon={Package}
          label="Bens emprestados"
          valor={String(resumo.bensEmprestados)}
          tone="neutral"
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Projetos por status"
          description="Distribuição conforme os status oficiais do módulo de Projetos."
        >
          <ReportPieChart data={resumo.statusProjetos} reportKey="projetos" />
        </ReportChartCard>
        <ReportChartCard
          title="Pendências por módulo"
          description="Onde estão concentradas as ações que exigem atenção."
        >
          <ReportBarChart
            data={resumo.pendenciasPorModulo.slice(0, 8)}
            reportKey="institucional-organizacao"
          />
        </ReportChartCard>
      </ReportChartGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-foreground">
              Pendências críticas
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("pendencias")}
              className="text-[11.5px] font-medium text-primary hover:underline"
            >
              Ver todas ({totalPendencias})
            </button>
          </div>
          {criticas.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              Nenhuma pendência crítica registrada no momento.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {criticas.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-border/60 bg-background/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {p.registro}
                    </p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {p.modulo} · {p.descricao}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PrioridadeBadge prioridade={p.prioridade} />
                    <ModuleLink to={p.href} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-foreground">
              Próximos compromissos
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("agenda")}
              className="text-[11.5px] font-medium text-primary hover:underline"
            >
              Abrir agenda
            </button>
          </div>
          {proximos.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              Nenhum compromisso futuro cadastrado.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {proximos.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-border/60 bg-background/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {a.titulo}
                    </p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {fmtData(a.data)} · {a.modulo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.domain && a.status && (
                      <DomainStatusPill domain={a.domain} status={a.status} />
                    )}
                    <ModuleLink to={a.href} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Execução por projeto
          </h3>
          <ul className="space-y-3">
            {projetos.slice(0, 6).map((p) => (
              <li key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] text-foreground">
                    {p.nome}
                  </span>
                  <DomainStatusPill domain="projeto" status={p.status} />
                </div>
                <ProgressBar value={p.progresso} />
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Concentração de pendências
          </h3>
          <DistributionList
            items={resumo.pendenciasPorModulo.slice(0, 6)}
            total={totalPendencias}
            emptyLabel="Nenhuma pendência registrada."
          />
        </GlassPanel>
      </div>
    </div>
  );
}

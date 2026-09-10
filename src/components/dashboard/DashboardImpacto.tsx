import {
  Award,
  CalendarCheck2,
  Image,
  Percent,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportPieChart,
  ReportStatCard,
  ReportStatGrid,
} from "@/components/relatorios/ReportKit";
import {
  DistributionList,
  GlassPanel,
  ProgressBar,
  SectionHeader,
} from "@/components/dashboard/DashboardKit";
import type { ImpactoResumo } from "@/data/dashboardCentral";

export function DashboardImpacto({ impacto }: { impacto: ImpactoResumo }) {
  const cumprimento = impacto.metasTotal
    ? Math.round((impacto.metasCumpridas / impacto.metasTotal) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Sparkles}
        title="Impacto social e cultural"
        description="Acompanhe os resultados alcançados pela organização a partir do público atendido, das atividades e eventos realizados, do cumprimento das metas e das evidências registradas para demonstrar a execução."
      />

      <ReportStatGrid>
        <ReportStatCard
          icon={Award}
          label="Público atendido"
          valor={String(impacto.participantesAtendidos)}
        />
        <ReportStatCard
          icon={CalendarCheck2}
          label="Atividades realizadas"
          valor={String(impacto.atividadesRealizadas)}
          tone="info"
        />
        <ReportStatCard
          icon={CalendarCheck2}
          label="Eventos culturais"
          valor={String(impacto.eventosRealizados)}
          tone="info"
        />
        <ReportStatCard
          icon={Sparkles}
          label="Ações de divulgação"
          valor={String(impacto.acoesDivulgacao)}
          tone="neutral"
        />
        <ReportStatCard
          icon={Image}
          label="Evidências"
          valor={String(impacto.evidencias)}
          tone="success"
        />
        <ReportStatCard
          icon={Percent}
          label="Frequência média"
          valor={
            impacto.frequenciaMedia === null
              ? "—"
              : `${impacto.frequenciaMedia}%`
          }
          tone="success"
        />
        <ReportStatCard
          icon={Target}
          label="Metas cumpridas"
          valor={`${impacto.metasCumpridas}/${impacto.metasTotal}`}
          tone={cumprimento >= 50 ? "success" : "warning"}
        />
        <ReportStatCard
          icon={Target}
          label="Cumprimento"
          valor={`${cumprimento}%`}
          tone="primary"
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Evidências por tipo"
          description="Comprovações registradas no módulo de Evidências."
        >
          <ReportPieChart
            data={impacto.porTipoEvidencia}
            reportKey="evidencias"
          />
        </ReportChartCard>
        <ReportChartCard title="Atividades por tipo">
          <ReportBarChart
            data={impacto.porTipoAtividade}
            reportKey="atividades"
          />
        </ReportChartCard>
      </ReportChartGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Cumprimento de metas
          </h3>
          <ProgressBar value={cumprimento} />
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {impacto.metasCumpridas} de {impacto.metasTotal} metas com
            cumprimento integral registrado no módulo de Metas do projeto.
          </p>
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Comprovação por tipo
          </h3>
          <DistributionList
            items={impacto.porTipoEvidencia}
            total={impacto.evidencias}
          />
        </GlassPanel>
      </div>
    </div>
  );
}

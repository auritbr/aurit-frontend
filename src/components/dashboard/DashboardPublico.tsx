import { useEffect, useState } from "react";
import { HeartHandshake, IdCard, Users, UserCheck } from "lucide-react";
import { FieldLabel } from "@/components/FieldLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportPieChart,
  ReportStatCard,
  ReportStatGrid,
  filterFieldClass,
} from "@/components/relatorios/ReportKit";
import {
  DistributionList,
  GlassPanel,
  SectionHeader,
} from "@/components/dashboard/DashboardKit";
import {
  loadPublicoAtividade,
  type PublicoResumo,
} from "@/data/dashboardCentral";
import { toast } from "sonner";

interface Filtros {
  atividade: string;
}

const inicial: Filtros = { atividade: "TODAS" };

export function DashboardPublico({
  resumo,
  atividades,
}: {
  resumo: PublicoResumo;
  atividades: { id: string; nome: string }[];
}) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);
  const [filtrado, setFiltrado] = useState<PublicoResumo>(resumo);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (aplicados.atividade === "TODAS") {
      setFiltrado(resumo);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    void loadPublicoAtividade(aplicados.atividade)
      .then((result) => {
        if (active) setFiltrado(result);
      })
      .catch((error) => {
        if (active)
          toast.error(
            error instanceof Error
              ? error.message
              : "Erro ao carregar o público da atividade.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [aplicados.atividade, resumo]);

  const aplicar = (next: Filtros) => {
    setFiltros(next);
    setAplicados(next);
  };

  const activeFilters: ActiveFilterItem[] = [];
  if (aplicados.atividade !== "TODAS")
    activeFilters.push({
      id: "atividade",
      label: "Atividade",
      value:
        atividades.find((a) => a.id === aplicados.atividade)?.nome ??
        aplicados.atividade,
      onRemove: () => aplicar(inicial),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={Users}
        title="Público atendido"
        description="Conheça o perfil das pessoas atendidas pela organização e analise características do público vinculado às atividades, como faixa etária, gênero, raça/cor, renda, deficiência, neurodivergência e participação em programas sociais."
      />

      <ReportFilterPanel
        storageKey="dashboard:publico"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Atividade</FieldLabel>
          <Select
            value={filtros.atividade}
            onValueChange={(v) => setFiltros({ atividade: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as atividades</SelectItem>
              {atividades.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportFilterPanel>

      <ReportStatGrid>
        <ReportStatCard
          icon={Users}
          label="Participantes"
          valor={loading ? "…" : String(filtrado.total)}
        />
        <ReportStatCard
          icon={UserCheck}
          label="Ativos"
          valor={String(filtrado.ativos)}
          tone="success"
        />
        <ReportStatCard
          icon={IdCard}
          label="Com CadÚnico"
          valor={String(filtrado.comCadUnico)}
          tone="info"
        />
        <ReportStatCard
          icon={HeartHandshake}
          label="Com Bolsa Família"
          valor={String(filtrado.comBolsaFamilia)}
          tone="warning"
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard title="Distribuição por gênero">
          <ReportPieChart
            data={filtrado.porGenero}
            reportKey="indicadores-sociodemograficos"
          />
        </ReportChartCard>
        <ReportChartCard title="Distribuição por raça/cor">
          <ReportBarChart
            data={filtrado.porRaca}
            reportKey="indicadores-sociodemograficos"
          />
        </ReportChartCard>
      </ReportChartGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Faixa etária
          </h3>
          <DistributionList
            items={filtrado.porFaixaEtaria}
            total={filtrado.total}
          />
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">
            Faixa de renda
          </h3>
          <DistributionList items={filtrado.porRenda} total={filtrado.total} />
        </GlassPanel>
      </div>
    </div>
  );
}

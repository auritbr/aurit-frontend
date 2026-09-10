import { useMemo, useState } from "react";
import { Activity, CheckCircle2, Image, Percent } from "lucide-react";
import { FieldLabel } from "@/components/FieldLabel";
import { Input } from "@/components/ui/input";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
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
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import { ModuleLink, SectionHeader } from "@/components/dashboard/DashboardKit";
import { domainStatusOptions } from "@/data/status";
import { fmtData, type ExecucaoItem } from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  status: string[];
  projeto: string;
  evidencia: string;
}

const inicial: Filtros = {
  busca: "",
  status: [],
  projeto: "TODOS",
  evidencia: "TODAS",
};

const evidenciaOptions = [
  { value: "TODAS", label: "Todas as atividades" },
  { value: "COM", label: "Com evidência anexada" },
  { value: "SEM", label: "Sem evidência anexada" },
];

export function DashboardExecucao({ execucao }: { execucao: ExecucaoItem[] }) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const projetos = useMemo(
    () => Array.from(new Set(execucao.map((e) => e.projeto))).sort(),
    [execucao],
  );

  const filtradas = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return execucao.filter((e) => {
      if (
        termo &&
        ![e.atividade, e.tipo, e.projeto].some((v) =>
          v.toLowerCase().includes(termo),
        )
      )
        return false;
      if (aplicados.status.length && !aplicados.status.includes(e.status))
        return false;
      if (aplicados.projeto !== "TODOS" && e.projeto !== aplicados.projeto)
        return false;
      if (aplicados.evidencia === "COM" && e.evidencias === 0) return false;
      if (aplicados.evidencia === "SEM" && e.evidencias > 0) return false;
      return true;
    });
  }, [execucao, aplicados]);

  const totalParticipantes = filtradas.reduce((s, e) => s + e.participantes, 0);
  const comFrequencia = filtradas.filter((e) => e.frequencia !== null);
  const frequenciaMedia = comFrequencia.length
    ? Math.round(
        comFrequencia.reduce((s, e) => s + (e.frequencia ?? 0), 0) /
          comFrequencia.length,
      )
    : null;

  const porStatus = useMemo(
    () =>
      domainStatusOptions("atividade").map((s) => ({
        name: s.label,
        value: filtradas.filter((e) => e.status === s.value).length,
      })),
    [filtradas],
  );

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    filtradas.forEach((e) => map.set(e.tipo, (map.get(e.tipo) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [filtradas]);

  const columns: ReportTableColumn<ExecucaoItem>[] = [
    { key: "atividade", label: "Atividade", accessor: (r) => r.atividade },
    { key: "tipo", label: "Tipo", accessor: (r) => r.tipo },
    { key: "projeto", label: "Projeto", accessor: (r) => r.projeto },
    {
      key: "status",
      label: "Status",
      accessor: (r) => r.status,
      render: (r) => <DomainStatusPill domain="atividade" status={r.status} />,
    },
    { key: "turmas", label: "Turmas", accessor: (r) => r.turmas },
    {
      key: "participantes",
      label: "Participantes",
      accessor: (r) => r.participantes,
    },
    {
      key: "presencas",
      label: "Registros de presença",
      accessor: (r) => r.presencas,
    },
    {
      key: "frequencia",
      label: "Frequência",
      accessor: (r) => (r.frequencia === null ? "—" : `${r.frequencia}%`),
      sortValue: (r) => r.frequencia ?? -1,
    },
    { key: "evidencias", label: "Evidências", accessor: (r) => r.evidencias },
    {
      key: "periodo",
      label: "Período",
      accessor: (r) => `${fmtData(r.inicio)} a ${fmtData(r.fim)}`,
      sortValue: (r) => r.inicio?.getTime() ?? 0,
    },
    {
      key: "acao",
      label: "Ação",
      notSortable: true,
      accessor: () => "",
      render: (r) => <ModuleLink to={r.href} />,
    },
  ];

  const aplicar = (next: Filtros) => {
    setFiltros(next);
    setAplicados(next);
  };

  const activeFilters: ActiveFilterItem[] = [];
  if (aplicados.busca.trim())
    activeFilters.push({
      id: "busca",
      label: "Busca",
      value: aplicados.busca,
      onRemove: () => aplicar({ ...aplicados, busca: "" }),
    });
  aplicados.status.forEach((s) =>
    activeFilters.push({
      id: `status-${s}`,
      label: "Status",
      value:
        domainStatusOptions("atividade").find((o) => o.value === s)?.label ?? s,
      onRemove: () =>
        aplicar({
          ...aplicados,
          status: aplicados.status.filter((x) => x !== s),
        }),
    }),
  );
  if (aplicados.projeto !== "TODOS")
    activeFilters.push({
      id: "projeto",
      label: "Projeto",
      value: aplicados.projeto,
      onRemove: () => aplicar({ ...aplicados, projeto: "TODOS" }),
    });
  if (aplicados.evidencia !== "TODAS")
    activeFilters.push({
      id: "evidencia",
      label: "Evidências",
      value:
        evidenciaOptions.find((o) => o.value === aplicados.evidencia)?.label ??
        aplicados.evidencia,
      onRemove: () => aplicar({ ...aplicados, evidencia: "TODAS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={Activity}
        title="Execução das atividades"
        description="Acompanhe como cada atividade está sendo executada, consultando suas turmas, público vinculado, registros de frequência e evidências relacionadas à realização das ações."
      />

      <ReportFilterPanel
        storageKey="dashboard:execucao"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Atividade, tipo ou projeto"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <FilterMultiSelect
            options={domainStatusOptions("atividade")}
            value={filtros.status}
            onChange={(v) => setFiltros({ ...filtros, status: v })}
            placeholder="Todos os status"
          />
        </div>
        <div>
          <FieldLabel>Projeto</FieldLabel>
          <Select
            value={filtros.projeto}
            onValueChange={(v) => setFiltros({ ...filtros, projeto: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Comprovação</FieldLabel>
          <Select
            value={filtros.evidencia}
            onValueChange={(v) => setFiltros({ ...filtros, evidencia: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {evidenciaOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportFilterPanel>

      <ReportStatGrid>
        <ReportStatCard
          icon={Activity}
          label="Atividades listadas"
          valor={String(filtradas.length)}
        />
        <ReportStatCard
          icon={CheckCircle2}
          label="Público vinculado"
          valor={String(totalParticipantes)}
          tone="info"
        />
        <ReportStatCard
          icon={Percent}
          label="Frequência média"
          valor={frequenciaMedia === null ? "—" : `${frequenciaMedia}%`}
          tone="success"
        />
        <ReportStatCard
          icon={Image}
          label="Sem evidência"
          valor={String(filtradas.filter((e) => e.evidencias === 0).length)}
          tone={
            filtradas.some((e) => e.evidencias === 0) ? "warning" : "success"
          }
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Atividades por status"
          description="Status oficiais do módulo de Atividades."
        >
          <ReportPieChart data={porStatus} reportKey="atividades" />
        </ReportChartCard>
        <ReportChartCard title="Atividades por tipo">
          <ReportBarChart data={porTipo} reportKey="atividades" />
        </ReportChartCard>
      </ReportChartGrid>

      <ReportTable
        nowrap
        title="Execução detalhada"
        rows={filtradas}
        columns={columns}
        reportName="Central de acompanhamento — Execução"
        rowKey={(r) => r.id}
        emptyMessage="Nenhuma atividade encontrada com os filtros selecionados."
      />
    </div>
  );
}

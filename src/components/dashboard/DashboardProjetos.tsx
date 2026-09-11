import { useMemo, useState } from "react";
import { CheckCircle2, FolderKanban, Gauge, Target } from "lucide-react";
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
import {
  ModuleLink,
  ProgressBar,
  SectionHeader,
} from "@/components/dashboard/DashboardKit";
import { domainStatusOptions } from "@/data/status";
import { areaAtuacaoOptions } from "@/data/projetos";
import { fmtData, type ProjetoResumo } from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  status: string[];
  area: string;
  situacao: string;
}

const inicial: Filtros = {
  busca: "",
  status: [],
  area: "TODAS",
  situacao: "TODAS",
};

const situacaoOptions = [
  { value: "TODAS", label: "Todas as situações" },
  { value: "ATRASADOS", label: "Com prazo encerrado" },
  { value: "VIGENTES", label: "Dentro do prazo" },
];

export function DashboardProjetos({ projetos }: { projetos: ProjetoResumo[] }) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const filtrados = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return projetos.filter((p) => {
      if (
        termo &&
        ![p.nome, p.area].some((v) => v.toLowerCase().includes(termo))
      )
        return false;
      if (aplicados.status.length && !aplicados.status.includes(p.status))
        return false;
      if (aplicados.area !== "TODAS" && p.area !== aplicados.area) return false;
      if (aplicados.situacao === "ATRASADOS" && !p.atrasado) return false;
      if (aplicados.situacao === "VIGENTES" && p.atrasado) return false;
      return true;
    });
  }, [projetos, aplicados]);

  const metasTotal = filtrados.reduce((s, p) => s + p.metas, 0);
  const metasConcluidas = filtrados.reduce((s, p) => s + p.metasConcluidas, 0);
  const progressoMedio = filtrados.length
    ? Math.round(
        filtrados.reduce((s, p) => s + p.progresso, 0) / filtrados.length,
      )
    : 0;

  const porStatus = useMemo(
    () =>
      domainStatusOptions("projeto").map((s) => ({
        name: s.label,
        value: filtrados.filter((p) => p.status === s.value).length,
      })),
    [filtrados],
  );

  const porArea = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach((projeto) => {
      projeto.area
        .split(",")
        .map((area) => area.trim())
        .filter((area) => area && area !== "—")
        .forEach((area) => map.set(area, (map.get(area) ?? 0) + 1));
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [filtrados]);

  const columns: ReportTableColumn<ProjetoResumo>[] = [
    { key: "nome", label: "Projeto", accessor: (r) => r.nome },
    {
      key: "status",
      label: "Status",
      accessor: (r) => r.status,
      render: (r) => <DomainStatusPill domain="projeto" status={r.status} />,
    },
    { key: "area", label: "Área de atuação", accessor: (r) => r.area },
    {
      key: "inicio",
      label: "Início",
      accessor: (r) => fmtData(r.inicio),
      sortValue: (r) => r.inicio?.getTime() ?? 0,
    },
    {
      key: "fim",
      label: "Término",
      accessor: (r) => fmtData(r.fim),
      sortValue: (r) => r.fim?.getTime() ?? 0,
      render: (r) => (
        <span
          className={
            r.atrasado
              ? "font-medium text-rose-600 dark:text-rose-300"
              : undefined
          }
        >
          {fmtData(r.fim)}
        </span>
      ),
    },
    {
      key: "metas",
      label: "Metas",
      accessor: (r) => `${r.metasConcluidas}/${r.metas}`,
      sortValue: (r) => r.metas,
    },
    { key: "atividades", label: "Atividades", accessor: (r) => r.atividades },
    { key: "turmas", label: "Turmas", accessor: (r) => r.turmas },
    {
      key: "participantes",
      label: "Participantes",
      accessor: (r) => r.participantes,
    },
    {
      key: "progresso",
      label: "Progresso",
      accessor: (r) => `${r.progresso}%`,
      sortValue: (r) => r.progresso,
      className: "min-w-[150px]",
      render: (r) => <ProgressBar value={r.progresso} />,
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
        domainStatusOptions("projeto").find((o) => o.value === s)?.label ?? s,
      onRemove: () =>
        aplicar({
          ...aplicados,
          status: aplicados.status.filter((x) => x !== s),
        }),
    }),
  );
  if (aplicados.area !== "TODAS")
    activeFilters.push({
      id: "area",
      label: "Área",
      value: aplicados.area,
      onRemove: () => aplicar({ ...aplicados, area: "TODAS" }),
    });
  if (aplicados.situacao !== "TODAS")
    activeFilters.push({
      id: "situacao",
      label: "Situação",
      value:
        situacaoOptions.find((o) => o.value === aplicados.situacao)?.label ??
        aplicados.situacao,
      onRemove: () => aplicar({ ...aplicados, situacao: "TODAS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={FolderKanban}
        title="Projetos da organização"
        description="Acompanhe cada projeto a partir de suas metas, atividades, turmas e público atendido, consultando de forma consolidada como sua execução está avançando."
      />

      <ReportFilterPanel
        storageKey="dashboard:projetos"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Nome do projeto ou área"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <FilterMultiSelect
            options={domainStatusOptions("projeto")}
            value={filtros.status}
            onChange={(v) => setFiltros({ ...filtros, status: v })}
            placeholder="Todos os status"
          />
        </div>
        <div>
          <FieldLabel>Área de atuação</FieldLabel>
          <Select
            value={filtros.area}
            onValueChange={(v) => setFiltros({ ...filtros, area: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as áreas</SelectItem>
              {areaAtuacaoOptions.map((a) => (
                <SelectItem key={a.value} value={a.label}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Situação do prazo</FieldLabel>
          <Select
            value={filtros.situacao}
            onValueChange={(v) => setFiltros({ ...filtros, situacao: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {situacaoOptions.map((o) => (
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
          icon={FolderKanban}
          label="Projetos listados"
          valor={String(filtrados.length)}
        />
        <ReportStatCard
          icon={Gauge}
          label="Progresso médio"
          valor={`${progressoMedio}%`}
          tone="info"
        />
        <ReportStatCard
          icon={Target}
          label="Metas concluídas"
          valor={`${metasConcluidas}/${metasTotal}`}
          tone="success"
        />
        <ReportStatCard
          icon={CheckCircle2}
          label="Com prazo encerrado"
          valor={String(filtrados.filter((p) => p.atrasado).length)}
          tone={filtrados.some((p) => p.atrasado) ? "danger" : "success"}
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Projetos por status"
          description="Status oficiais do módulo de Projetos."
        >
          <ReportPieChart data={porStatus} reportKey="projetos" />
        </ReportChartCard>
        <ReportChartCard title="Projetos por área de atuação">
          <ReportBarChart data={porArea} reportKey="projetos" />
        </ReportChartCard>
      </ReportChartGrid>

      <ReportTable
        nowrap
        title="Carteira de projetos"
        rows={filtrados}
        columns={columns}
        reportName="Central de acompanhamento — Projetos"
        showPdf={false}
        rowKey={(r) => r.id}
        emptyMessage="Nenhum projeto encontrado com os filtros selecionados."
      />
    </div>
  );
}

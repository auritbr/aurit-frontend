import { useMemo, useState } from "react";
import {
  Boxes,
  CircleDollarSign,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";
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
import { statusPatrimonioOptions } from "@/data/patrimonio";
import { fmtData, type PatrimonioItem } from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  status: string[];
  tipo: string;
  atraso: string;
}

const inicial: Filtros = {
  busca: "",
  status: [],
  tipo: "TODOS",
  atraso: "TODOS",
};

const atrasoOptions = [
  { value: "TODOS", label: "Todos os bens" },
  { value: "ATRASADOS", label: "Devolução em atraso" },
  { value: "EMPRESTADOS", label: "Somente emprestados" },
];

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

export function DashboardPatrimonio({
  patrimonio,
}: {
  patrimonio: PatrimonioItem[];
}) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const tipos = useMemo(
    () =>
      Array.from(new Set(patrimonio.map((p) => p.tipo)))
        .filter(Boolean)
        .sort(),
    [patrimonio],
  );

  const filtrados = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return patrimonio.filter((p) => {
      if (
        termo &&
        ![p.nome, p.numero, p.emprestadoPara].some((v) =>
          v.toLowerCase().includes(termo),
        )
      )
        return false;
      if (aplicados.status.length && !aplicados.status.includes(p.status))
        return false;
      if (aplicados.tipo !== "TODOS" && p.tipo !== aplicados.tipo) return false;
      if (aplicados.atraso === "ATRASADOS" && !p.atrasado) return false;
      if (aplicados.atraso === "EMPRESTADOS" && p.status !== "EMPRESTADO")
        return false;
      return true;
    });
  }, [patrimonio, aplicados]);

  const valorTotal = filtrados.reduce((s, p) => s + p.valor, 0);
  const emprestados = filtrados.filter((p) => p.status === "EMPRESTADO").length;
  const atrasados = filtrados.filter((p) => p.atrasado).length;

  const porStatus = useMemo(
    () =>
      statusPatrimonioOptions.map((s) => ({
        name: s.label,
        value: filtrados.filter((p) => p.status === s.value).length,
      })),
    [filtrados],
  );

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach((p) =>
      map.set(
        p.tipo || "Não informado",
        (map.get(p.tipo || "Não informado") ?? 0) + 1,
      ),
    );
    return Array.from(map, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [filtrados]);

  const columns: ReportTableColumn<PatrimonioItem>[] = [
    { key: "numero", label: "Nº patrimônio", accessor: (r) => r.numero },
    { key: "nome", label: "Bem", accessor: (r) => r.nome },
    { key: "tipo", label: "Tipo", accessor: (r) => r.tipo || "—" },
    {
      key: "estado",
      label: "Estado de conservação",
      accessor: (r) => r.estado || "—",
    },
    {
      key: "status",
      label: "Status",
      accessor: (r) => r.status,
      render: (r) => <DomainStatusPill domain="patrimonio" status={r.status} />,
    },
    {
      key: "valor",
      label: "Valor",
      accessor: (r) => moeda(r.valor),
      sortValue: (r) => r.valor,
    },
    {
      key: "emprestadoPara",
      label: "Em posse de",
      accessor: (r) => r.emprestadoPara || "—",
    },
    {
      key: "devolucao",
      label: "Devolução prevista",
      accessor: (r) => fmtData(r.devolucao),
      sortValue: (r) => r.devolucao?.getTime() ?? Number.MAX_SAFE_INTEGER,
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
      value: statusPatrimonioOptions.find((o) => o.value === s)?.label ?? s,
      onRemove: () =>
        aplicar({
          ...aplicados,
          status: aplicados.status.filter((x) => x !== s),
        }),
    }),
  );
  if (aplicados.tipo !== "TODOS")
    activeFilters.push({
      id: "tipo",
      label: "Tipo",
      value: aplicados.tipo,
      onRemove: () => aplicar({ ...aplicados, tipo: "TODOS" }),
    });
  if (aplicados.atraso !== "TODOS")
    activeFilters.push({
      id: "atraso",
      label: "Situação",
      value:
        atrasoOptions.find((o) => o.value === aplicados.atraso)?.label ??
        aplicados.atraso,
      onRemove: () => aplicar({ ...aplicados, atraso: "TODOS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={Boxes}
        title="Patrimônio e empréstimos"
        description="Acompanhe os bens patrimoniais da organização, seus valores e condições de conservação, além dos empréstimos em andamento e das devoluções previstas."
      />

      <ReportFilterPanel
        storageKey="dashboard:patrimonio"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Bem, nº patrimônio ou responsável"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <FilterMultiSelect
            options={statusPatrimonioOptions}
            value={filtros.status}
            onChange={(v) => setFiltros({ ...filtros, status: v })}
            placeholder="Todos os status"
          />
        </div>
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <Select
            value={filtros.tipo}
            onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Situação do empréstimo</FieldLabel>
          <Select
            value={filtros.atraso}
            onValueChange={(v) => setFiltros({ ...filtros, atraso: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {atrasoOptions.map((o) => (
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
          icon={Boxes}
          label="Bens listados"
          valor={String(filtrados.length)}
        />
        <ReportStatCard
          icon={CircleDollarSign}
          label="Valor total"
          valor={moeda(valorTotal)}
          tone="info"
        />
        <ReportStatCard
          icon={PackageCheck}
          label="Emprestados"
          valor={String(emprestados)}
          tone="warning"
        />
        <ReportStatCard
          icon={AlertTriangle}
          label="Devolução em atraso"
          valor={String(atrasados)}
          tone={atrasados > 0 ? "danger" : "success"}
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Bens por status"
          description="Status oficiais do módulo de Patrimônio."
        >
          <ReportPieChart data={porStatus} reportKey="patrimonios" />
        </ReportChartCard>
        <ReportChartCard title="Bens por tipo">
          <ReportBarChart data={porTipo} reportKey="patrimonios" />
        </ReportChartCard>
      </ReportChartGrid>

      <ReportTable
        nowrap
        title="Inventário patrimonial"
        rows={filtrados}
        columns={columns}
        reportName="Central de acompanhamento — Patrimônio"
        showPdf={false}
        rowKey={(r) => r.id}
        emptyMessage="Nenhum bem encontrado com os filtros selecionados."
      />
    </div>
  );
}

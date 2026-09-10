import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListChecks } from "lucide-react";
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
  ReportFilterPanel,
  ReportStatCard,
  ReportStatGrid,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import {
  ModuleLink,
  PrioridadeBadge,
  SectionHeader,
} from "@/components/dashboard/DashboardKit";
import {
  fmtData,
  prioridadeLabel,
  type Pendencia,
  type Prioridade,
} from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  prioridades: string[];
  modulo: string;
  prazo: string;
}

const inicial: Filtros = {
  busca: "",
  prioridades: [],
  modulo: "TODOS",
  prazo: "TODOS",
};

const prazoOptions = [
  { value: "TODOS", label: "Todos os prazos" },
  { value: "VENCIDOS", label: "Com prazo vencido" },
  { value: "30", label: "Próximos 30 dias" },
  { value: "SEM", label: "Sem prazo definido" },
];

export function DashboardPendencias({
  pendencias,
}: {
  pendencias: Pendencia[];
}) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const modulos = useMemo(
    () => Array.from(new Set(pendencias.map((p) => p.modulo))).sort(),
    [pendencias],
  );

  const hojeMs = useMemo(() => new Date().setHours(0, 0, 0, 0), []);

  const filtradas = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return pendencias.filter((p) => {
      if (
        termo &&
        ![p.registro, p.descricao, p.modulo, p.responsavel].some((v) =>
          v.toLowerCase().includes(termo),
        )
      )
        return false;
      if (
        aplicados.prioridades.length &&
        !aplicados.prioridades.includes(prioridadeLabel[p.prioridade])
      )
        return false;
      if (aplicados.modulo !== "TODOS" && p.modulo !== aplicados.modulo)
        return false;
      if (aplicados.prazo === "SEM" && p.prazo) return false;
      if (
        aplicados.prazo === "VENCIDOS" &&
        !(p.prazo && p.prazo.getTime() < hojeMs)
      )
        return false;
      if (aplicados.prazo === "30") {
        if (!p.prazo) return false;
        const dias = Math.round((p.prazo.getTime() - hojeMs) / 86400000);
        if (dias < 0 || dias > 30) return false;
      }
      return true;
    });
  }, [pendencias, aplicados, hojeMs]);

  const conta = (prioridade: Prioridade) =>
    filtradas.filter((p) => p.prioridade === prioridade).length;

  const columns: ReportTableColumn<Pendencia>[] = [
    { key: "registro", label: "Registro", accessor: (r) => r.registro },
    { key: "modulo", label: "Módulo", accessor: (r) => r.modulo },
    { key: "descricao", label: "Pendência", accessor: (r) => r.descricao },
    {
      key: "prioridade",
      label: "Prioridade",
      accessor: (r) => prioridadeLabel[r.prioridade],
      render: (r) => <PrioridadeBadge prioridade={r.prioridade} />,
    },
    {
      key: "status",
      label: "Status de origem",
      accessor: (r) => r.status ?? "",
      render: (r) =>
        r.domain && r.status ? (
          <DomainStatusPill domain={r.domain} status={r.status} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "prazo",
      label: "Prazo",
      accessor: (r) => (r.prazo ? fmtData(r.prazo) : ""),
      sortValue: (r) => r.prazo?.getTime() ?? Number.MAX_SAFE_INTEGER,
      render: (r) => (
        <span className="tabular-nums">{r.prazo ? fmtData(r.prazo) : "—"}</span>
      ),
    },
    {
      key: "responsavel",
      label: "Responsável / vínculo",
      accessor: (r) => r.responsavel,
    },
    {
      key: "acao",
      label: "Ação",
      notSortable: true,
      accessor: () => "",
      render: (r) => <ModuleLink to={r.href} label="Resolver" />,
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
  aplicados.prioridades.forEach((p) =>
    activeFilters.push({
      id: `prio-${p}`,
      label: "Prioridade",
      value: p,
      onRemove: () =>
        aplicar({
          ...aplicados,
          prioridades: aplicados.prioridades.filter((x) => x !== p),
        }),
    }),
  );
  if (aplicados.modulo !== "TODOS")
    activeFilters.push({
      id: "modulo",
      label: "Módulo",
      value: aplicados.modulo,
      onRemove: () => aplicar({ ...aplicados, modulo: "TODOS" }),
    });
  if (aplicados.prazo !== "TODOS")
    activeFilters.push({
      id: "prazo",
      label: "Prazo",
      value:
        prazoOptions.find((o) => o.value === aplicados.prazo)?.label ??
        aplicados.prazo,
      onRemove: () => aplicar({ ...aplicados, prazo: "TODOS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={ListChecks}
        title="Pendências"
        description="Consulte registros e situações que precisam de acompanhamento em diferentes áreas da organização, como documentos, diretoria, projetos, metas, execução e patrimônio."
      />

      <ReportFilterPanel
        storageKey="dashboard:pendencias"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Registro, pendência ou responsável"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Prioridade</FieldLabel>
          <FilterMultiSelect
            options={(Object.keys(prioridadeLabel) as Prioridade[]).map(
              (p) => ({
                value: prioridadeLabel[p],
                label: prioridadeLabel[p],
              }),
            )}
            value={filtros.prioridades}
            onChange={(v) => setFiltros({ ...filtros, prioridades: v })}
            placeholder="Todas as prioridades"
          />
        </div>
        <div>
          <FieldLabel>Módulo</FieldLabel>
          <Select
            value={filtros.modulo}
            onValueChange={(v) => setFiltros({ ...filtros, modulo: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os módulos</SelectItem>
              {modulos.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Prazo</FieldLabel>
          <Select
            value={filtros.prazo}
            onValueChange={(v) => setFiltros({ ...filtros, prazo: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {prazoOptions.map((o) => (
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
          icon={AlertTriangle}
          label="Críticas"
          valor={String(conta("CRITICA"))}
          tone="danger"
        />
        <ReportStatCard
          icon={Clock}
          label="Alta prioridade"
          valor={String(conta("ALTA"))}
          tone="warning"
        />
        <ReportStatCard
          icon={ListChecks}
          label="Média prioridade"
          valor={String(conta("MEDIA"))}
          tone="info"
        />
        <ReportStatCard
          icon={CheckCircle2}
          label="Baixa prioridade"
          valor={String(conta("BAIXA"))}
          tone="neutral"
        />
      </ReportStatGrid>

      <ReportTable
        nowrap
        title="Pendências consolidadas"
        description="Ordene por prioridade ou prazo e acesse o módulo de origem para resolver."
        rows={filtradas}
        columns={columns}
        reportName="Central de acompanhamento — Pendências"
        rowKey={(r) => r.id}
        emptyMessage="Nenhuma pendência encontrada com os filtros selecionados."
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  History,
} from "lucide-react";
import { FieldLabel } from "@/components/FieldLabel";
import { Input } from "@/components/ui/input";
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
import { ModuleLink, SectionHeader } from "@/components/dashboard/DashboardKit";
import { fmtData, type AgendaItem } from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  modulo: string;
  periodo: string;
  ano: string;
}

const inicial: Filtros = {
  busca: "",
  modulo: "TODOS",
  periodo: "PROXIMOS",
  ano: "TODOS",
};

const periodoOptions = [
  { value: "PROXIMOS", label: "Próximos compromissos" },
  { value: "7", label: "Próximos 7 dias" },
  { value: "30", label: "Próximos 30 dias" },
  { value: "PASSADOS", label: "Compromissos realizados" },
  { value: "TODOS", label: "Todo o período" },
];

export function DashboardAgenda({ agenda }: { agenda: AgendaItem[] }) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const hojeMs = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const modulos = useMemo(
    () => Array.from(new Set(agenda.map((a) => a.modulo))).sort(),
    [agenda],
  );
  const anos = useMemo(
    () =>
      Array.from(new Set(agenda.map((a) => String(a.data.getFullYear())))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    [agenda],
  );

  const filtradas = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return agenda.filter((a) => {
      if (
        termo &&
        ![a.titulo, a.vinculo, a.tipo, a.responsavel].some((v) =>
          v.toLowerCase().includes(termo),
        )
      )
        return false;
      if (aplicados.modulo !== "TODOS" && a.modulo !== aplicados.modulo)
        return false;
      if (
        aplicados.ano !== "TODOS" &&
        String(a.data.getFullYear()) !== aplicados.ano
      )
        return false;
      const dias = Math.round((a.data.getTime() - hojeMs) / 86400000);
      if (aplicados.periodo === "PROXIMOS" && dias < 0) return false;
      if (aplicados.periodo === "PASSADOS" && dias >= 0) return false;
      if (aplicados.periodo === "7" && (dias < 0 || dias > 7)) return false;
      if (aplicados.periodo === "30" && (dias < 0 || dias > 30)) return false;
      return true;
    });
  }, [agenda, aplicados, hojeMs]);

  const emAtraso = agenda.filter((a) => a.data.getTime() < hojeMs).length;
  const proximos7 = agenda.filter((a) => {
    const dias = Math.round((a.data.getTime() - hojeMs) / 86400000);
    return dias >= 0 && dias <= 7;
  }).length;
  const proximos30 = agenda.filter((a) => {
    const dias = Math.round((a.data.getTime() - hojeMs) / 86400000);
    return dias >= 0 && dias <= 30;
  }).length;

  const columns: ReportTableColumn<AgendaItem>[] = [
    {
      key: "data",
      label: "Data",
      accessor: (r) => fmtData(r.data),
      sortValue: (r) => r.data.getTime(),
      render: (r) => <span className="tabular-nums">{fmtData(r.data)}</span>,
    },
    { key: "titulo", label: "Compromisso", accessor: (r) => r.titulo },
    { key: "tipo", label: "Tipo", accessor: (r) => r.tipo },
    { key: "modulo", label: "Módulo", accessor: (r) => r.modulo },
    { key: "vinculo", label: "Vínculo", accessor: (r) => r.vinculo },
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
      key: "responsavel",
      label: "Responsável",
      accessor: (r) => r.responsavel,
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
  if (aplicados.modulo !== "TODOS")
    activeFilters.push({
      id: "modulo",
      label: "Módulo",
      value: aplicados.modulo,
      onRemove: () => aplicar({ ...aplicados, modulo: "TODOS" }),
    });
  if (aplicados.periodo !== inicial.periodo)
    activeFilters.push({
      id: "periodo",
      label: "Período",
      value:
        periodoOptions.find((o) => o.value === aplicados.periodo)?.label ??
        aplicados.periodo,
      onRemove: () => aplicar({ ...aplicados, periodo: inicial.periodo }),
    });
  if (aplicados.ano !== "TODOS")
    activeFilters.push({
      id: "ano",
      label: "Ano",
      value: aplicados.ano,
      onRemove: () => aplicar({ ...aplicados, ano: "TODOS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={CalendarDays}
        title="Agenda institucional"
        description="Acompanhe compromissos, prazos e vencimentos relacionados às atividades, eventos, etapas dos projetos, metas, documentos, empréstimos e editais da organização."
      />

      <ReportFilterPanel
        storageKey="dashboard:agenda"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Compromisso, vínculo ou responsável"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
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
          <FieldLabel>Período</FieldLabel>
          <Select
            value={filtros.periodo}
            onValueChange={(v) => setFiltros({ ...filtros, periodo: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Ano</FieldLabel>
          <Select
            value={filtros.ano}
            onValueChange={(v) => setFiltros({ ...filtros, ano: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportFilterPanel>

      <ReportStatGrid>
        <ReportStatCard
          icon={CalendarClock}
          label="Próximos 7 dias"
          valor={String(proximos7)}
          tone="warning"
        />
        <ReportStatCard
          icon={CalendarCheck2}
          label="Próximos 30 dias"
          valor={String(proximos30)}
          tone="info"
        />
        <ReportStatCard
          icon={History}
          label="Datas já passadas"
          valor={String(emAtraso)}
          tone="neutral"
        />
        <ReportStatCard
          icon={CalendarDays}
          label="Compromissos listados"
          valor={String(filtradas.length)}
        />
      </ReportStatGrid>

      <ReportTable
        nowrap
        title="Compromissos"
        description="Datas planejadas cruzadas de todos os módulos de execução e regularidade."
        rows={filtradas}
        columns={columns}
        reportName="Central de acompanhamento — Agenda"
        rowKey={(r) => r.id}
        emptyMessage="Nenhum compromisso encontrado com os filtros selecionados."
      />
    </div>
  );
}

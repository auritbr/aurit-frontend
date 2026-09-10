import { useMemo, useState } from "react";
import {
  FileCheck2,
  FileWarning,
  ShieldCheck,
  MinusCircle,
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
import { domainStatusOptions } from "@/data/status";
import { fmtData, type RegularidadeItem } from "@/data/dashboardCentral";

interface Filtros {
  busca: string;
  status: string[];
  situacao: string;
  arquivo: string;
}

const inicial: Filtros = {
  busca: "",
  status: [],
  situacao: "TODAS",
  arquivo: "TODOS",
};

const arquivoOptions = [
  { value: "TODOS", label: "Todos os documentos" },
  { value: "COM", label: "Com arquivo anexado" },
  { value: "SEM", label: "Sem arquivo anexado" },
];
const validadeDocumentoOptions = [
  { value: "VIGENTE", label: "Vigente" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "SEM_VALIDADE", label: "Sem validade" },
];

export function DashboardRegularidade({
  regularidade,
}: {
  regularidade: RegularidadeItem[];
}) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);

  const filtrados = useMemo(() => {
    const termo = aplicados.busca.trim().toLowerCase();
    return regularidade.filter((d) => {
      if (termo && !d.tipo.toLowerCase().includes(termo)) return false;
      if (aplicados.status.length && !aplicados.status.includes(d.status))
        return false;
      if (aplicados.situacao !== "TODAS" && d.situacao !== aplicados.situacao)
        return false;
      if (aplicados.arquivo === "COM" && !d.arquivo) return false;
      if (aplicados.arquivo === "SEM" && d.arquivo) return false;
      return true;
    });
  }, [regularidade, aplicados]);

  const conta = (situacao: RegularidadeItem["situacao"]) =>
    filtrados.filter((d) => d.situacao === situacao).length;

  const porStatus = useMemo(
    () =>
      domainStatusOptions("documento").map((s) => ({
        name: s.label,
        value: filtrados.filter((d) => d.status === s.value).length,
      })),
    [filtrados],
  );

  const porSituacao = useMemo(
    () =>
      validadeDocumentoOptions.map((s) => ({
        name: s.label,
        value: filtrados.filter((d) => d.situacao === s.value).length,
      })),
    [filtrados],
  );

  const columns: ReportTableColumn<RegularidadeItem>[] = [
    { key: "tipo", label: "Documento", accessor: (r) => r.tipo },
    {
      key: "status",
      label: "Status do cadastro",
      accessor: (r) => r.status,
      render: (r) => <DomainStatusPill domain="documento" status={r.status} />,
    },
    {
      key: "situacao",
      label: "Situação da validade",
      accessor: (r) => r.situacao,
      render: (r) => (
        <DomainStatusPill domain="validade-documento" status={r.situacao} />
      ),
    },
    {
      key: "validade",
      label: "Validade",
      accessor: (r) => fmtData(r.validade),
      sortValue: (r) => r.validade?.getTime() ?? Number.MAX_SAFE_INTEGER,
    },
    {
      key: "dias",
      label: "Dias restantes",
      accessor: (r) =>
        r.diasRestantes === null ? "—" : String(r.diasRestantes),
      sortValue: (r) => r.diasRestantes ?? Number.MAX_SAFE_INTEGER,
    },
    {
      key: "arquivo",
      label: "Arquivo",
      accessor: (r) => (r.arquivo ? "Anexado" : "Sem arquivo"),
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
        domainStatusOptions("documento").find((o) => o.value === s)?.label ?? s,
      onRemove: () =>
        aplicar({
          ...aplicados,
          status: aplicados.status.filter((x) => x !== s),
        }),
    }),
  );
  if (aplicados.situacao !== "TODAS")
    activeFilters.push({
      id: "situacao",
      label: "Validade",
      value:
        validadeDocumentoOptions.find((o) => o.value === aplicados.situacao)
          ?.label ?? aplicados.situacao,
      onRemove: () => aplicar({ ...aplicados, situacao: "TODAS" }),
    });
  if (aplicados.arquivo !== "TODOS")
    activeFilters.push({
      id: "arquivo",
      label: "Arquivo",
      value:
        arquivoOptions.find((o) => o.value === aplicados.arquivo)?.label ??
        aplicados.arquivo,
      onRemove: () => aplicar({ ...aplicados, arquivo: "TODOS" }),
    });

  return (
    <div className="space-y-1">
      <SectionHeader
        icon={ShieldCheck}
        title="Regularidade documental"
        description="Acompanhe a situação dos documentos institucionais, suas datas de validade e os arquivos registrados, identificando documentos válidos, próximos do vencimento, vencidos ou que precisam de atualização."
      />

      <ReportFilterPanel
        storageKey="dashboard:regularidade"
        activeFilters={activeFilters}
        onSubmit={() => setAplicados(filtros)}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel>Busca</FieldLabel>
          <Input
            className={filterFieldClass}
            placeholder="Tipo de documento"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Status do cadastro</FieldLabel>
          <FilterMultiSelect
            options={domainStatusOptions("documento")}
            value={filtros.status}
            onChange={(v) => setFiltros({ ...filtros, status: v })}
            placeholder="Todos os status"
          />
        </div>
        <div>
          <FieldLabel>Situação da validade</FieldLabel>
          <Select
            value={filtros.situacao}
            onValueChange={(v) => setFiltros({ ...filtros, situacao: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as situações</SelectItem>
              {validadeDocumentoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Arquivo</FieldLabel>
          <Select
            value={filtros.arquivo}
            onValueChange={(v) => setFiltros({ ...filtros, arquivo: v })}
          >
            <SelectTrigger className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {arquivoOptions.map((o) => (
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
          icon={FileCheck2}
          label="Documentos"
          valor={String(filtrados.length)}
        />
        <ReportStatCard
          icon={ShieldCheck}
          label="Vigentes"
          valor={String(conta("VIGENTE"))}
          tone="success"
        />
        <ReportStatCard
          icon={FileWarning}
          label="Vencidos"
          valor={String(conta("VENCIDO"))}
          tone={conta("VENCIDO") > 0 ? "danger" : "success"}
        />
        <ReportStatCard
          icon={MinusCircle}
          label="Sem validade"
          valor={String(conta("SEM_VALIDADE"))}
          tone="neutral"
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Documentos por status"
          description="Status oficiais do módulo de Documentos."
        >
          <ReportPieChart data={porStatus} reportKey="documentos" />
        </ReportChartCard>
        <ReportChartCard title="Situação da validade">
          <ReportBarChart data={porSituacao} reportKey="documentos" />
        </ReportChartCard>
      </ReportChartGrid>

      <ReportTable
        nowrap
        title="Documentos institucionais"
        rows={filtrados}
        columns={columns}
        reportName="Central de acompanhamento — Regularidade"
        rowKey={(r) => r.id}
        emptyMessage="Nenhum documento encontrado com os filtros selecionados."
      />
    </div>
  );
}

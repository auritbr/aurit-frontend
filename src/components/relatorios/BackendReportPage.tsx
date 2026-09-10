import { useCallback, useMemo, type ReactNode } from "react";
import { Search, type LucideIcon } from "lucide-react";

import { AccessDenied } from "@/components/AccessDenied";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { AppLayout } from "@/components/AppLayout";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import {
  ReportBarChart,
  ReportComparisonBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportPieChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportStatSkeleton,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
  type StatTone,
} from "@/components/relatorios/ReportKit";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRelatorio,
  reportEnumLabel,
  type ReportFilters,
} from "@/data/relatoriosEspecializados";
import { useBackendReport } from "@/hooks/useBackendReport";
import type { StatusContext } from "@/components/StatusPill";
import { formatValorRelatorio } from "@/data/relatorios";

type DataRecord = Record<string, unknown>;

export interface BackendFilter {
  key: string;
  label: string;
  tooltip: string;
  type: "search" | "select" | "multi";
  placeholder?: string;
  options: (data: DataRecord | null) => { value: string; label: string }[];
}

export interface BackendStat {
  label: string;
  path: string;
  icon: LucideIcon;
  tone?: StatTone;
  format?: "number" | "percent" | "currency";
}

export interface BackendChart {
  title: string;
  description: string;
  path: string;
  type: "bar" | "pie" | "comparison";
  label?: (value: string) => string;
  nameKey?: string;
  valueKey?: string;
  series?: { key: string; label: string }[];
  currency?: boolean;
}

export interface BackendColumn {
  key: string;
  label: string;
  path?: string;
  format?: "date" | "percent" | "enum" | "boolean" | "array" | "timeRange";
  statusContext?: StatusContext;
  notSortable?: boolean;
  hiddenByDefault?: boolean;
  accessor?: (row: DataRecord) => string | number;
}

export interface BackendReportConfig {
  endpoint: string;
  title: string;
  tooltip: string;
  objective: string;
  tableTitle: string;
  tableDescription?: (data: DataRecord | null) => string;
  rowsPath: string;
  filters: BackendFilter[];
  stats: BackendStat[];
  charts: BackendChart[];
  columns: BackendColumn[];
  emptyMessage: string;
  /** Fonte alternativa para relatórios que possuem endpoint próprio, mas usam a mesma apresentação genérica. */
  loader?: (filters: ReportFilters) => Promise<DataRecord>;
  /** Slug usado na exportação PDF quando difere do endpoint de consulta. */
  pdfSlug?: string;
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as DataRecord)[key];
  }, source);
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: unknown) {
  return `${numberValue(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const parts = String(value).split("-");
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(value);
}

function formatCell(column: BackendColumn, row: DataRecord): string | number {
  if (column.accessor) return column.accessor(row);
  const value = getPath(row, column.path ?? column.key);

  switch (column.format) {
    case "date":
      return formatDate(value);
    case "percent":
      return formatPercent(value);
    case "enum":
      return reportEnumLabel(String(value ?? ""));
    case "boolean":
      return value ? "Sim" : "Não";
    case "array":
      return Array.isArray(value)
        ? value.map(String).map(reportEnumLabel).join(", ")
        : "—";
    case "timeRange":
      return `${String(row.horarioInicio ?? "—").slice(0, 5)} às ${String(row.horarioFim ?? "—").slice(0, 5)}`;
    default:
      return formatValorRelatorio(value, column.key);
  }
}

export function BackendReportPage({ config }: { config: BackendReportConfig }) {
  const initialFilters = useMemo(
    () =>
      Object.fromEntries(
        config.filters.map((filter) => [
          filter.key,
          filter.type === "multi"
            ? []
            : filter.type === "select"
              ? "TODOS"
              : "",
        ]),
      ) as ReportFilters,
    [config.filters],
  );

  const loader = useCallback(
    (filters: ReportFilters) => {
      const requestFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          value === "TODOS" ? undefined : value,
        ]),
      );
      return config.loader
        ? config.loader(requestFilters)
        : getRelatorio<DataRecord>(config.endpoint, requestFilters);
    },
    [config],
  );

  const { filters, setFilters, applied, data, loading, accessDenied, apply } =
    useBackendReport(initialFilters, loader);

  const rows =
    (getPath(data, config.rowsPath) as DataRecord[] | undefined) ?? [];

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const result: ActiveFilterItem[] = [];
    config.filters.forEach((filter) => {
      const value = applied[filter.key];
      const options = filter.options(data);
      const remove = (next: string | string[]) =>
        apply({ ...applied, [filter.key]: next });

      if (Array.isArray(value)) {
        value.forEach((item) =>
          result.push({
            id: `${filter.key}-${item}`,
            label: filter.label,
            value:
              options.find((option) => option.value === String(item))?.label ??
              String(item),
            onRemove: () =>
              remove(value.filter((current) => current !== item) as string[]),
          }),
        );
      } else if (value && value !== "TODOS") {
        result.push({
          id: filter.key,
          label: filter.label,
          value:
            options.find((option) => option.value === String(value))?.label ??
            String(value),
          onRemove: () => remove(filter.type === "select" ? "TODOS" : ""),
        });
      }
    });
    return result;
  }, [applied, apply, config.filters, data]);

  const columns = useMemo<ReportTableColumn<DataRecord>[]>(
    () =>
      config.columns.map((column) => ({
        key: column.key,
        label: column.label,
        hiddenByDefault: column.hiddenByDefault,
        accessor: (row) => formatCell(column, row),
        notSortable: column.notSortable,
        render: column.statusContext
          ? (row): ReactNode => (
              <DomainStatusPill
                domain={column.statusContext!}
                status={String(getPath(row, column.path ?? column.key) ?? "")}
              />
            )
          : undefined,
      })),
    [config.columns],
  );

  if (accessDenied) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <ReportShell
      title={config.title}
      tooltip={config.tooltip}
      objective={config.objective}
    >
      <ReportFilterPanel
        storageKey={`relatorio-${config.endpoint}`}
        activeFilters={activeFilters}
        onSubmit={() => apply(filters, true)}
        onClear={() => apply(initialFilters)}
        hidden
      >
        {config.filters.map((filter) => {
          const options = filter.options(data);
          const value = filters[filter.key];
          return (
            <div key={filter.key}>
              <FieldLabel
                htmlFor={`filter-${filter.key}`}
                tooltip={filter.tooltip}
              >
                {filter.label}
              </FieldLabel>
              {filter.type === "search" ? (
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id={`filter-${filter.key}`}
                    value={String(value ?? "")}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        [filter.key]: event.target.value,
                      }))
                    }
                    placeholder={filter.placeholder}
                    className={`${filterFieldClass} pl-8`}
                  />
                </div>
              ) : filter.type === "multi" ? (
                <FilterMultiSelect
                  id={`filter-${filter.key}`}
                  options={options}
                  value={(value as string[]) ?? []}
                  onChange={(next) =>
                    setFilters((current) => ({
                      ...current,
                      [filter.key]: next,
                    }))
                  }
                  placeholder={
                    filter.placeholder ??
                    `Todos os ${filter.label.toLowerCase()}`
                  }
                  summaryNoun="opções selecionadas"
                  searchable
                />
              ) : (
                <Select
                  value={String(value ?? "TODOS")}
                  onValueChange={(next) =>
                    setFilters((current) => ({
                      ...current,
                      [filter.key]: next,
                    }))
                  }
                >
                  <SelectTrigger
                    id={`filter-${filter.key}`}
                    className={filterFieldClass}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </ReportFilterPanel>

      <ReportStatGrid>
        {loading && !data ? (
          <ReportStatSkeleton count={config.stats.length} />
        ) : (
          config.stats.map((stat) => (
            <ReportStatCard
              key={stat.path}
              icon={stat.icon}
              tone={stat.tone}
              label={stat.label}
              valor={
                stat.format === "currency"
                  ? formatValorRelatorio(getPath(data, stat.path), "valor")
                  : stat.format === "percent"
                    ? formatPercent(getPath(data, stat.path))
                    : String(numberValue(getPath(data, stat.path)))
              }
            />
          ))
        )}
      </ReportStatGrid>

      <ReportChartGrid>
        {config.charts.map((chart) => {
          const raw =
            (getPath(data, chart.path) as DataRecord[] | undefined) ?? [];
          const chartData = raw.map((item) => {
            const name = String(item[chart.nameKey ?? "status"] ?? "—");
            return {
              name: chart.label ? chart.label(name) : reportEnumLabel(name),
              value: numberValue(item[chart.valueKey ?? "total"]),
            };
          });
          return (
            <ReportChartCard
              key={chart.path}
              title={chart.title}
              description={chart.description}
            >
              {chart.type === "comparison" ? (
                <ReportComparisonBarChart
                  data={raw.slice(0, 12).map((item) => ({
                    name: String(
                      item[chart.nameKey ?? "nome"] ??
                        item.atividade ??
                        item.turma ??
                        item.projeto ??
                        item.meta ??
                        "—",
                    ),
                    ...(chart.series ?? []).reduce<Record<string, number>>(
                      (values, series) => {
                        values[series.key] = numberValue(item[series.key]);
                        return values;
                      },
                      {},
                    ),
                  }))}
                  series={chart.series ?? []}
                  reportKey={config.endpoint}
                  currency={chart.currency}
                />
              ) : chart.type === "pie" ? (
                <ReportPieChart
                  data={chartData}
                  reportKey={config.endpoint}
                  currency={chart.currency}
                />
              ) : (
                <ReportBarChart
                  data={chartData}
                  reportKey={config.endpoint}
                  currency={chart.currency}
                />
              )}
            </ReportChartCard>
          );
        })}
      </ReportChartGrid>

      <ReportTable
        title={config.tableTitle}
        description={config.tableDescription?.(data)}
        rows={rows}
        columns={columns}
        reportName={config.endpoint}
        nowrap
        pdfExport={{
          slug: config.pdfSlug ?? config.endpoint,
          filters: Object.fromEntries(
            Object.entries(applied).filter(([, value]) =>
              Array.isArray(value)
                ? value.length > 0
                : Boolean(value && value !== "TODOS"),
            ),
          ),
          filterLabels: activeFilters.map((filter) => ({
            label: filter.label,
            value: filter.value,
          })),
        }}
        rowKey={(row) => String(row.id)}
        emptyMessage={
          loading && !data ? "Carregando relatório..." : config.emptyMessage
        }
      />
    </ReportShell>
  );
}

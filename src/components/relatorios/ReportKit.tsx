// =============================================================================
// Kit visual compartilhado das páginas de relatório da Aurit.
// Padrão liquid glass: cabeçalho + objetivo, pesquisa avançada (Limpar/Buscar),
// cards de indicadores, gráficos e tabela com exportações e paginação.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  RotateCcw,
  Search,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Funnel,
  FunnelChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { RelatorioExportButtons } from "@/components/relatorios/RelatorioExportButtons";
import { MobileReportSort } from "@/components/relatorios/MobileReportSort";
import { ColumnSelector } from "@/components/relatorios/ColumnSelector";
import {
  downloadGeneralReportPdf,
  type GeneralReportPdfFilter,
} from "@/lib/generalReportPdf";
import type { RelatorioColumn } from "@/lib/relatorioExports";
import { cn } from "@/lib/utils";
import { getChartColor, getReportChartTheme } from "@/lib/reportChartTheme";

/* ───────────────────────── Shell ───────────────────────── */

export function ReportShell({
  title,
  tooltip,
  objective,
  children,
}: {
  title: string;
  tooltip: string;
  objective: string;
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <div
        data-mobile-data-page="reports"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <BackButton to="/relatorios" />
        <PageTitle title={title} tooltip={tooltip} />
        <PageObjective className="mb-4" description={objective} />
        {children}
      </div>
    </AppLayout>
  );
}

/* ───────────────────── Pesquisa avançada ───────────────────── */

export function ReportFilterPanel({
  storageKey,
  activeFilters,
  loading = false,
  onSubmit,
  onClear,
  children,
  hidden = false,
}: {
  storageKey: string;
  activeFilters: ActiveFilterItem[];
  loading?: boolean;
  onSubmit: () => void;
  onClear: () => void;
  children: React.ReactNode;
  /** Permite ocultar o painel em visualizações que não oferecem pesquisa. */
  hidden?: boolean;
}) {
  const [open, setOpen] = useSessionBoolean(`${storageKey}:search:v2`, false);

  if (hidden) return null;

  return (
    <div className="mb-5 space-y-4">
      <AdvancedSearchPanel
        open={open}
        onOpenChange={setOpen}
        activeCount={activeFilters.length}
        title="Pesquisa avançada"
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <SearchFilterGrid>{children}</SearchFilterGrid>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 gap-2 px-4"
              onClick={onClear}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Limpar
            </Button>
            <Button
              type="submit"
              variant="glassPrimary"
              className="h-9 gap-2 px-4"
              disabled={loading}
              aria-busy={loading}
            >
              <Search className="h-4 w-4" aria-hidden />{" "}
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </form>
      </AdvancedSearchPanel>

      <ActiveFilters items={activeFilters} onClearAll={onClear} />
    </div>
  );
}

/* ───────────────────── Cards de indicadores ───────────────────── */

export type StatTone =
  "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const statTones: Record<StatTone, string> = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  success:
    "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  warning:
    "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300",
  danger: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300",
  info: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-300",
  neutral: "bg-muted/50 border-border/70 text-muted-foreground",
};

export function ReportStatCard({
  icon: Icon,
  label,
  valor,
  tone = "primary",
  onClick,
  selected,
  active,
  hint,
  comparacao,
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
  tone?: StatTone;
  onClick?: () => void;
  selected?: boolean;
  active?: boolean;
  hint?: string;
  comparacao?: React.ReactNode;
}) {
  const CardTag = onClick ? "button" : "div";
  return (
    <CardTag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? (active ?? selected) : undefined}
      className={cn(
        "flex w-full items-center gap-3 text-left rounded-[14px] border border-border/70 bg-card/75 px-3.5 py-3 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60",
        onClick &&
          "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        (active ?? selected) && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border",
          statTones[tone],
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="break-words text-lg font-semibold tabular-nums text-foreground">
          {valor}
        </p>
        {hint && (
          <p
            className="truncate text-[11px] text-muted-foreground"
            title={hint}
          >
            {hint}
          </p>
        )}
        {comparacao}
      </div>
    </CardTag>
  );
}

export function ReportStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {children}
    </section>
  );
}

/** Evita apresentar zero como dado enquanto os indicadores reais carregam. */
export function ReportStatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-[62px] animate-pulse rounded-[14px] border border-border/70 bg-muted/35"
          aria-hidden
        />
      ))}
    </>
  );
}

/* ───────────────────── Badge simples ───────────────────── */

export function ReportBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        statTones[tone],
      )}
    >
      {label}
    </span>
  );
}

/* ───────────────────────── Gráficos ───────────────────────── */

export interface ChartDatum {
  name: string;
  value: number;
}

export interface ComparisonChartDatum {
  name: string;
  [series: string]: string | number;
}

export function ReportChartCard({
  title,
  description,
  children,
  clickable,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  clickable?: boolean;
}) {
  return (
    <section className="rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {description}
        </p>
      )}
      {clickable && (
        <p className="mt-1 text-[11px] text-primary">
          Selecione uma categoria para filtrar a tabela.
        </p>
      )}
      <div className="mt-3 h-[220px]">{children}</div>
    </section>
  );
}

const emptyChart = (
  <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
    Sem dados para exibir com os filtros aplicados.
  </div>
);

const compactTooltipProps = {
  isAnimationActive: false,
  allowEscapeViewBox: { x: false, y: false },
  wrapperStyle: { zIndex: 20, maxWidth: 260, outline: "none" },
} as const;

const compactLegendProps = {
  iconSize: 8,
  wrapperStyle: { fontSize: 10.5, lineHeight: "16px" },
} as const;

/** Mantém o eixo legível sem perder o conteúdo, que permanece disponível no balão. */
const compactChartLabel = (value: unknown, maxLength = 24) => {
  const label = String(value ?? "").trim();
  return label.length > maxLength
    ? `${label.slice(0, maxLength - 1).trimEnd()}…`
    : label;
};

function ReportCategoryLegend({
  data,
  reportKey,
}: {
  data: ChartDatum[];
  reportKey?: string;
}) {
  return (
    <div className="flex h-[34px] items-start justify-center gap-x-3 gap-y-1 overflow-hidden px-2 pt-1 text-[10.5px] leading-4 text-muted-foreground">
      {data.map((item, index) => (
        <span
          key={`${item.name}-${index}`}
          className="inline-flex min-w-0 max-w-[150px] items-center gap-1.5"
          title={item.name}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-[1px]"
            style={{
              backgroundColor: getChartColor(reportKey, index, item.name),
            }}
          />
          <span className="truncate">{compactChartLabel(item.name, 23)}</span>
        </span>
      ))}
    </div>
  );
}

const formatCurrency = (value: number | string) =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

const formatChartPercent = (value: number | string) =>
  `${Number(value).toLocaleString("pt-BR")}%`;

type ChartTooltipEntry = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: { name?: string | number };
};

function ReportChartTooltipContent({
  active,
  label,
  payload,
  currency = false,
  percent = false,
  duration = false,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipEntry[];
  currency?: boolean;
  percent?: boolean;
  duration?: boolean;
}) {
  const items = (payload ?? []).filter(
    (item) => String(item.dataKey ?? "") !== "inicio",
  );
  if (!active || items.length === 0) return null;

  const formatValue = (value: string | number | undefined) => {
    if (duration) return `${value ?? 0} dia(s)`;
    if (percent) return formatChartPercent(value ?? 0);
    return currency
      ? formatCurrency(value ?? 0)
      : Number(value ?? 0).toLocaleString("pt-BR");
  };

  return (
    <div className="max-w-[260px] rounded-[10px] border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] leading-snug text-popover-foreground shadow-lg">
      <p className="mb-1 max-w-[238px] whitespace-normal break-all font-semibold">
        {String(label ?? items[0]?.payload?.name ?? "Dados do gráfico")}
      </p>
      {items.map((item, index) => (
        <div
          key={`${item.dataKey ?? item.name ?? "valor"}-${index}`}
          className="flex items-start justify-between gap-3 py-0.5"
        >
          <span className="min-w-0 break-all text-muted-foreground">
            {item.color && (
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {String(item.name ?? "Total")}
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportBarChart({
  data,
  reportKey,
  categorical = true,
  currency = false,
  percent = false,
  onSelect,
  formatValue,
  layout = "vertical",
  compareData,
  labelAtual = "Período principal",
  labelComparado = "Período comparado",
  showZero = false,
}: {
  data: ChartDatum[];
  reportKey?: string;
  categorical?: boolean;
  currency?: boolean;
  percent?: boolean;
  onSelect?: (name: string) => void;
  formatValue?: (value: number) => string;
  layout?: "vertical" | "horizontal";
  compareData?: ChartDatum[] | null;
  labelAtual?: string;
  labelComparado?: string;
  showZero?: boolean;
}) {
  const categorias = Array.from(
    new Set([
      ...data.map((d) => d.name),
      ...(compareData ?? []).map((d) => d.name),
    ]),
  );
  const values = new Map(data.map((d) => [d.name, d.value]));
  const compared = new Map((compareData ?? []).map((d) => [d.name, d.value]));
  const rows = categorias.map((name) => ({
    name,
    value: values.get(name) ?? 0,
    comparado: compared.get(name) ?? 0,
  }));
  if (
    !rows.length ||
    (!showZero && !rows.some((d) => d.value !== 0 || d.comparado !== 0))
  )
    return emptyChart;
  const horizontal = layout === "horizontal";
  const fmt =
    formatValue ??
    (percent ? formatChartPercent : currency ? formatCurrency : undefined);
  const select = onSelect
    ? (datum: { name?: string }) => {
        if (datum.name) onSelect(datum.name);
      }
    : undefined;
  const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{
          top: 6,
          right: 8,
          left: horizontal ? 8 : currency ? 12 : -18,
          bottom: horizontal ? 4 : 14,
        }}
      >
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={tick}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={128}
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => compactChartLabel(value)}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              tick={tick}
              interval={0}
              tickLine={false}
              axisLine={false}
              height={56}
              angle={-24}
              textAnchor="end"
              tickFormatter={(value) => compactChartLabel(value)}
            />
            <YAxis
              allowDecimals={false}
              width={currency ? 82 : undefined}
              tick={tick}
              tickFormatter={fmt}
              tickLine={false}
              axisLine={false}
            />
          </>
        )}
        {formatValue ? (
          <ChartTooltip
            {...compactTooltipProps}
            formatter={(value: number, name: string) => [
              formatValue(value),
              name,
            ]}
          />
        ) : (
          <ChartTooltip
            {...compactTooltipProps}
            content={
              <ReportChartTooltipContent
                currency={currency}
                percent={percent}
              />
            }
          />
        )}
        {compareData && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Bar
          dataKey="value"
          name={compareData ? labelAtual : "Total"}
          radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
          cursor={onSelect ? "pointer" : undefined}
          onClick={select}
        >
          {rows.map((row, i) => (
            <Cell
              key={row.name}
              fill={
                categorical
                  ? getChartColor(reportKey, i, row.name)
                  : getReportChartTheme(reportKey).primary
              }
            />
          ))}
        </Bar>
        {compareData && (
          <Bar
            dataKey="comparado"
            name={labelComparado}
            fill="hsl(var(--muted-foreground))"
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            cursor={onSelect ? "pointer" : undefined}
            onClick={select}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportHorizontalBarChart({
  data,
  reportKey,
}: {
  data: ChartDatum[];
  reportKey?: string;
}) {
  if (!data.some((d) => d.value > 0)) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 18, left: 22, bottom: 4 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => compactChartLabel(value, 21)}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent />}
        />
        <Bar dataKey="value" name="Total" radius={[0, 6, 6, 0]}>
          {data.map((item, index) => (
            <Cell
              key={`${item.name}-${index}`}
              fill={getChartColor(reportKey, index, item.name)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportLineChart({
  data,
  reportKey,
  percent = false,
  showZero = false,
  name = "Total",
  type = "monotone",
}: {
  data: { name: string; value: number | null }[];
  reportKey?: string;
  percent?: boolean;
  showZero?: boolean;
  name?: string;
  type?: "linear" | "monotone";
}) {
  if (
    !data.some(
      ({ value }) => value !== null && (percent || showZero || value > 0),
    )
  )
    return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: -16, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border) / 0.55)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => compactChartLabel(value)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={percent ? [0, 100] : undefined}
          tickFormatter={percent ? formatChartPercent : undefined}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent percent={percent} />}
        />
        <Line
          type={type}
          dataKey="value"
          name={name}
          stroke={getReportChartTheme(reportKey).primary}
          strokeWidth={2.5}
          dot={{ r: 3, fill: getReportChartTheme(reportKey).primary }}
          activeDot={{ r: 5, fill: getReportChartTheme(reportKey).primary }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReportFunnelChart({
  data,
  reportKey,
}: {
  data: ChartDatum[];
  reportKey?: string;
}) {
  if (!data.some((d) => d.value > 0)) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent />}
        />
        <Funnel
          dataKey="value"
          nameKey="name"
          data={data}
          isAnimationActive
          fill={getReportChartTheme(reportKey).primary}
        >
          {data.map((item, index) => (
            <Cell
              key={`${item.name}-${index}`}
              fill={getChartColor(reportKey, index, item.name)}
            />
          ))}
        </Funnel>
        <Legend
          verticalAlign="bottom"
          height={34}
          content={<ReportCategoryLegend data={data} reportKey={reportKey} />}
        />
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export function ReportProgressChart({
  data,
  reportKey,
}: {
  data: Array<{ name: string; concluido: number; restante: number }>;
  reportKey?: string;
}) {
  if (!data.length) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        stackOffset="expand"
        margin={{ top: 4, right: 12, left: 28, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => compactChartLabel(value, 21)}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent percent />}
        />
        <Legend {...compactLegendProps} />
        <Bar
          dataKey="concluido"
          name="Executado"
          stackId="p"
          fill={getChartColor(reportKey, 0, "Executado")}
        />
        <Bar
          dataKey="restante"
          name="Pendente"
          stackId="p"
          fill={getChartColor(reportKey, 1, "Pendente")}
          radius={[0, 6, 6, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportTimelineChart({
  data,
  reportKey,
}: {
  data: Array<{ name: string; inicio: number; duracao: number }>;
  reportKey?: string;
}) {
  if (!data.length) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 15, left: 28, bottom: 4 }}
      >
        <XAxis type="number" hide domain={["dataMin", "dataMax"]} />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => compactChartLabel(value, 21)}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent duration />}
        />
        <Bar
          dataKey="inicio"
          stackId="timeline"
          fill="transparent"
          legendType="none"
        />
        <Bar
          dataKey="duracao"
          name="Duração"
          stackId="timeline"
          fill={getReportChartTheme(reportKey).primary}
          radius={[6, 6, 6, 6]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportComparisonBarChart({
  data,
  series,
  reportKey,
  currency = false,
  stacked = false,
  allowDecimals = true,
  hideXAxis = false,
  onSelect,
}: {
  data: ComparisonChartDatum[];
  series: { key: string; label: string }[];
  reportKey?: string;
  currency?: boolean;
  stacked?: boolean;
  allowDecimals?: boolean;
  onSelect?: (name: string) => void;
  /** Oculta apenas os rótulos visíveis das categorias; dados e tooltip permanecem. */
  hideXAxis?: boolean;
}) {
  const hasData = data.some((item) =>
    series.some(({ key }) => Number(item[key] ?? 0) !== 0),
  );
  if (!hasData) return emptyChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 6, right: 8, left: -12, bottom: hideXAxis ? 0 : 16 }}
      >
        <XAxis
          dataKey="name"
          hide={hideXAxis}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval={0}
          tickLine={false}
          axisLine={false}
          height={56}
          angle={-24}
          textAnchor="end"
          tickFormatter={(value) => compactChartLabel(value)}
        />
        <YAxis
          allowDecimals={allowDecimals}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={currency ? formatCurrency : undefined}
          tickLine={false}
          axisLine={false}
        />
        <Legend
          {...compactLegendProps}
          wrapperStyle={{
            ...compactLegendProps.wrapperStyle,
            maxWidth: "92%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent currency={currency} />}
        />
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            stackId={stacked ? "series" : undefined}
            fill={getChartColor(reportKey, index, item.label)}
            radius={!stacked || index === series.length - 1 ? [5, 5, 0, 0] : 0}
            cursor={onSelect ? "pointer" : undefined}
            onClick={
              onSelect
                ? (datum: { name?: string }) => {
                    if (datum.name) onSelect(datum.name);
                  }
                : undefined
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportPieChart({
  data,
  onSelect,
  reportKey,
  currency = false,
}: {
  data: ChartDatum[];
  onSelect?: (name: string) => void;
  reportKey?: string;
  currency?: boolean;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          cursor={onSelect ? "pointer" : undefined}
          onClick={
            onSelect
              ? (datum: { name?: string }) => {
                  if (datum.name) onSelect(datum.name);
                }
              : undefined
          }
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={44}
          outerRadius={72}
          paddingAngle={2}
        >
          {filtered.map((_, i) => (
            <Cell
              key={i}
              fill={getChartColor(reportKey, i, filtered[i]?.name)}
              stroke="hsl(var(--card))"
            />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          height={34}
          content={
            <ReportCategoryLegend data={filtered} reportKey={reportKey} />
          }
        />
        <ChartTooltip
          {...compactTooltipProps}
          content={<ReportChartTooltipContent currency={currency} />}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ReportChartGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-5 grid gap-3 lg:grid-cols-2">{children}</section>
  );
}

/* ───────────────────────── Tabela ───────────────────────── */

export interface ReportTableColumn<T> extends RelatorioColumn<T> {
  /** Chave do contrato Jasper quando a coluna da tela usa uma chave de apresentação. */
  pdfKey?: string | false;
  /** Valor usado na ordenação (default: accessor). */
  sortValue?: (row: T) => string | number;
  /** Desabilita ordenação nesta coluna. */
  notSortable?: boolean;
  className?: string;
}

export function ReportTable<T>({
  title,
  description,
  rows,
  columns,
  reportName,
  organizacaoNome,
  indicadoresPdf,
  emptyMessage = "Nenhum registro encontrado com os filtros selecionados.",
  rowKey,
  nowrap = false,
  showPdf = true,
  pdfExport,
  sortResetKey,
  remote,
  onExport,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: ReportTableColumn<T>[];
  reportName: string;
  organizacaoNome?: string;
  indicadoresPdf?: { label: string; valor: string }[];
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string;
  nowrap?: boolean;
  /** Reaplica a ordem externa sem perder as colunas escolhidas na tabela. */
  sortResetKey?: string;
  /** Oculta somente a ação PDF, preservando as exportações Excel e CSV. */
  showPdf?: boolean;
  remote?: {
    total: number;
    currentPage: number;
    pageSize: number;
    sortKey: string | null;
    direction: "asc" | "desc";
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onSort: (key: string | null, direction: "asc" | "desc") => void;
  };
  onExport?: (
    formato: "PDF" | "CSV" | "XLSX",
    columns: string[],
  ) => Promise<void>;
  pdfExport?: {
    slug: string;
    /** Chaves específicas do contrato Jasper, quando diferem da tabela exibida. */
    columns?: string[];
    filters?: Record<string, unknown>;
    filterLabels?: GeneralReportPdfFilter[];
  };
}) {
  const [localKey, setSortKey] = useState<string | null>(null);
  const [localDirection, setSortDir] = useState<"asc" | "desc">("asc");
  const sortKey = remote ? remote.sortKey : localKey;
  const sortDir = remote ? remote.direction : localDirection;
  const ordenar = (key: string | null, direction: "asc" | "desc") => {
    if (remote) remote.onSort(key, direction);
    else {
      setSortKey(key);
      setSortDir(direction);
    }
  };
  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
  }, [sortResetKey]);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    columns
      .filter((column) => !column.hiddenByDefault)
      .map((column) => column.key),
  );

  useEffect(() => {
    setVisibleKeys((current) => {
      const valid = current.filter((key) =>
        columns.some((column) => column.key === key),
      );
      const defaults = columns
        .filter(
          (column) => !column.hiddenByDefault && !current.includes(column.key),
        )
        .map((column) => column.key);
      return [...valid, ...defaults];
    });
  }, [columns]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [columns, visibleKeys],
  );

  const sorted = useMemo(() => {
    if (remote || !sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const value = (row: T) => {
      if (col.sortValue) return col.sortValue(row);
      const raw = col.accessor
        ? col.accessor(row)
        : (row as Record<string, unknown>)[col.key];
      if (typeof raw === "number") return raw;
      return String(raw ?? "").toLowerCase();
    };
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, columns, sortKey, sortDir, remote]);

  const localPage = usePagination(
    sorted,
    25,
    `${sortKey}-${sortDir}-${rows.length}`,
  );
  const paginated = remote ? rows : localPage.paginated;

  const pdfColumns =
    pdfExport?.columns ??
    visibleColumns
      .filter((column) => column.pdfKey !== false)
      .map((column) => column.pdfKey || column.key);
  const sortedPdfColumn = visibleColumns.find(
    (column) => column.key === sortKey,
  );
  const pdfSortKey =
    sortedPdfColumn?.pdfKey === false
      ? undefined
      : sortedPdfColumn?.pdfKey || sortedPdfColumn?.key;
  const toggle = (key: string) =>
    ordenar(key, sortKey === key && sortDir === "asc" ? "desc" : "asc");

  return (
    <section className="overflow-hidden rounded-[16px] border border-border/70 bg-card/75 shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {description ?? "Resultados consideram os filtros aplicados."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <RelatorioExportButtons
            rows={sorted}
            columns={visibleColumns}
            reportName={reportName}
            organizacaoNome={organizacaoNome}
            dataGeracao={new Date().toLocaleDateString("pt-BR")}
            indicadoresPdf={indicadoresPdf}
            disabled={
              !!remote?.loading ||
              sorted.length === 0 ||
              visibleColumns.length === 0
            }
            showCopy={false}
            showPdf={showPdf && (!pdfExport || pdfColumns.length > 0)}
            onCsv={onExport ? () => onExport("CSV", pdfColumns) : undefined}
            onXlsx={onExport ? () => onExport("XLSX", pdfColumns) : undefined}
            onPdf={
              onExport
                ? () => onExport("PDF", pdfColumns)
                : pdfExport
                  ? () =>
                      downloadGeneralReportPdf({
                        slug: pdfExport.slug,
                        columns: pdfColumns,
                        filters: pdfExport.filters,
                        filterLabels: pdfExport.filterLabels,
                        sortKey:
                          pdfSortKey && pdfColumns.includes(pdfSortKey)
                            ? pdfSortKey
                            : undefined,
                        sortDirection: sortDir,
                      })
                  : undefined
            }
          />
          <ColumnSelector
            columns={columns}
            visibleKeys={visibleKeys}
            onChange={setVisibleKeys}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {visibleColumns.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Selecione ao menos uma coluna em &quot;Colunas&quot; para exibir
              os dados.
            </p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox
              className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="md:hidden">
              <MobileReportSort
                title={title}
                value={sortKey}
                direction={sortDir}
                options={columns.filter((column) => !column.notSortable)}
                onChange={(key) => ordenar(key, "asc")}
                onReverse={() =>
                  ordenar(sortKey, sortDir === "asc" ? "desc" : "asc")
                }
              />
              <div className="divide-y divide-border">
                {paginated.map((row, index) => (
                  <dl
                    key={rowKey ? rowKey(row, index) : index}
                    className="space-y-3 p-4"
                  >
                    {visibleColumns.map((column) => {
                      const raw = column.accessor
                        ? column.accessor(row)
                        : (row as Record<string, unknown>)[column.key];
                      const text =
                        raw === null || raw === undefined || raw === ""
                          ? "—"
                          : String(raw);
                      return (
                        <div key={column.key} className="min-w-0">
                          <dt className="text-xs text-muted-foreground">
                            {column.label}
                          </dt>
                          <dd className="mt-1 text-sm text-foreground">
                            {column.render ? column.render(row) : text}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                ))}
              </div>
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((c) => (
                      <TableHead
                        key={c.key}
                        className={cn("whitespace-nowrap text-xs", c.className)}
                      >
                        {c.notSortable ? (
                          c.label
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggle(c.key)}
                            className={cn(
                              "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                              sortKey === c.key &&
                                "font-semibold text-foreground",
                            )}
                          >
                            {c.label}
                            <ArrowUpDown
                              className={cn(
                                "h-3 w-3 transition-transform",
                                sortKey === c.key ? "opacity-90" : "opacity-40",
                                sortKey === c.key &&
                                  sortDir === "desc" &&
                                  "rotate-180",
                              )}
                              aria-hidden
                            />
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((row, i) => (
                    <TableRow key={rowKey ? rowKey(row, i) : i}>
                      {visibleColumns.map((c) => {
                        const raw = c.accessor
                          ? c.accessor(row)
                          : (row as Record<string, unknown>)[c.key];
                        const text =
                          raw === null || raw === undefined || raw === ""
                            ? "—"
                            : String(raw);

                        return (
                          <TableCell
                            key={c.key}
                            className={cn(
                              "whitespace-nowrap text-xs",
                              c.className,
                            )}
                          >
                            {c.render ? c.render(row) : text}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <TablePagination
        totalItems={remote?.total ?? sorted.length}
        currentPage={remote?.currentPage ?? localPage.currentPage}
        pageSize={remote?.pageSize ?? localPage.pageSize}
        onPageChange={remote?.onPageChange ?? localPage.setCurrentPage}
        onPageSizeChange={remote?.onPageSizeChange ?? localPage.setPageSize}
        showCopy={false}
      />
    </section>
  );
}

/* ───────────────────── Campos de filtro ───────────────────── */

export const filterFieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

export const SERIE_COLORS = {
  entradas: "hsl(160 60% 40%)",
  saidas: "hsl(350 70% 52%)",
  saldo: "hsl(var(--primary))",
} as const;

export interface SerieDatum {
  name: string;
  entradas: number;
  saidas: number;
  saldo?: number;
}

const serieTooltip = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: 12,
  },
} as const;

const eixoX = {
  tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
  tickLine: false,
  axisLine: false,
} as const;

const temDados = (data: SerieDatum[]) =>
  data.some((d) => d.entradas !== 0 || d.saidas !== 0 || (d.saldo ?? 0) !== 0);

/** Evolução temporal: entradas, saídas e saldo acumulado. */
export function ReportSerieLineChart({
  data,
  formatValue,
  showSaldo = true,
}: {
  data: SerieDatum[];
  formatValue?: (value: number) => string;
  showSaldo?: boolean;
}) {
  if (!temDados(data)) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 6, right: 10, left: -6, bottom: 4 }}
      >
        <XAxis dataKey="name" {...eixoX} />
        <YAxis
          {...eixoX}
          width={70}
          tickFormatter={(v) =>
            formatValue ? formatValue(Number(v)) : String(v)
          }
        />
        <ChartTooltip
          {...serieTooltip}
          formatter={(value: number | string) =>
            formatValue ? formatValue(Number(value)) : String(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="entradas"
          name="Entradas"
          stroke={SERIE_COLORS.entradas}
          strokeWidth={2}
          dot={{ r: 2.5 }}
        />
        <Line
          type="monotone"
          dataKey="saidas"
          name="Saídas"
          stroke={SERIE_COLORS.saidas}
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 2.5 }}
        />
        {showSaldo && (
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo acumulado"
            stroke={SERIE_COLORS.saldo}
            strokeWidth={2.4}
            dot={{ r: 2.5 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Barras agrupadas de entradas e saídas por período. */
export function ReportSerieBarChart({
  data,
  formatValue,
}: {
  data: SerieDatum[];
  formatValue?: (value: number) => string;
}) {
  if (!temDados(data)) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 10, left: -6, bottom: 4 }}>
        <XAxis dataKey="name" {...eixoX} />
        <YAxis
          {...eixoX}
          width={70}
          tickFormatter={(v) =>
            formatValue ? formatValue(Number(v)) : String(v)
          }
        />
        <ChartTooltip
          {...serieTooltip}
          formatter={(value: number | string) =>
            formatValue ? formatValue(Number(value)) : String(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="entradas"
          name="Entradas"
          fill={SERIE_COLORS.entradas}
          radius={[5, 5, 0, 0]}
        />
        <Bar
          dataKey="saidas"
          name="Saídas"
          fill={SERIE_COLORS.saidas}
          radius={[5, 5, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras simples com formatação monetária (uma série por categoria). */
export function ReportValueBarChart({
  data,
  formatValue,
  onSelect,
}: {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  /** Ao informar, cada barra fica clicável e filtra a tabela pela categoria. */
  onSelect?: (name: string) => void;
}) {
  if (!data.some((d) => d.value > 0)) return emptyChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 6, right: 16, left: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          {...eixoX}
          tickFormatter={(v) =>
            formatValue ? formatValue(Number(v)) : String(v)
          }
        />
        <YAxis type="category" dataKey="name" {...eixoX} width={128} />
        <ChartTooltip
          {...serieTooltip}
          formatter={(value: number | string) =>
            formatValue ? formatValue(Number(value)) : String(value)
          }
        />
        <Bar
          dataKey="value"
          name="Total"
          radius={[0, 5, 5, 0]}
          cursor={onSelect ? "pointer" : undefined}
          onClick={
            onSelect
              ? (d: { name?: string }) => d?.name && onSelect(d.name)
              : undefined
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={getChartColor(undefined, i, data[i]?.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

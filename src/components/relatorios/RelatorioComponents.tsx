import { ReactNode } from "react";
import { RefreshCw, Inbox, ChartNoAxesColumn } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { RelatorioDataTable } from "@/components/relatorios/RelatorioDataTable";
import {
  ReportChartCard,
  ReportChartGrid,
  ReportComparisonBarChart,
  type ComparisonChartDatum,
} from "@/components/relatorios/ReportKit";
import type { RelatorioColumn } from "@/lib/relatorioExports";
import {
  formatValorRelatorio,
  type GrupoRelatorio,
  type Indicador,
  type LinhaRelatorio,
} from "@/data/relatorios";

interface RelatorioHeaderProps {
  title: string;
  tooltip: string;
  description: string;
  nomeEmpresa?: string;
  dataGeracao?: string;
  onRefresh: () => void;
  loading?: boolean;
  extraActions?: ReactNode;
}

export function RelatorioHeader({
  title,
  tooltip,
  description,
  extraActions,
}: RelatorioHeaderProps) {
  return (
    <>
      <BackButton to="/relatorios" />

      <PageTitle title={title} tooltip={tooltip} actions={extraActions} />

      <PageObjective className="mb-4" description={description} />
    </>
  );
}

interface IndicadorCardProps {
  indicador: Indicador;
}

export function IndicadorCard({ indicador }: IndicadorCardProps) {
  const valor = formatValorRelatorio(indicador.valor, indicador.chave);

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/75 px-3.5 py-3 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-primary/20 bg-primary/10 text-primary"
        aria-hidden
      >
        <ChartNoAxesColumn className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {indicador.label}
        </p>
        <p className="break-words text-lg font-semibold tabular-nums text-foreground">
          {valor}
        </p>
      </div>
    </div>
  );
}

interface GrupoIndicadoresProps {
  grupo: GrupoRelatorio;
}

export function GrupoIndicadores({ grupo }: GrupoIndicadoresProps) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-[13px] font-semibold tracking-tight text-foreground">
        {grupo.titulo}
      </h2>

      {grupo.indicadores.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum indicador disponível.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {grupo.indicadores.map((ind, i) => (
            <IndicadorCard key={`${ind.chave}-${i}`} indicador={ind} />
          ))}
        </div>
      )}
    </section>
  );
}

interface LinhaRelatorioCardProps {
  linha: LinhaRelatorio;
  highlight?: boolean;
}

export function LinhaRelatorioCard({
  linha,
  highlight,
}: LinhaRelatorioCardProps) {
  return (
    <div
      className={`rounded-[16px] border bg-card/75 p-4 shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.18)] backdrop-blur-md transition-colors hover:bg-card/90 ${
        highlight ? "border-destructive/40" : "border-border"
      }`}
    >
      <h3
        className={`text-sm font-semibold tracking-tight ${
          highlight ? "text-destructive" : "text-foreground"
        }`}
      >
        {linha.titulo}
      </h3>

      {linha.descricao && (
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
          {linha.descricao}
        </p>
      )}

      {linha.indicadores?.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {linha.indicadores.map((ind, i) => (
            <div
              key={`${ind.chave}-${i}`}
              className="rounded-[10px] border border-border/60 bg-background/60 px-2.5 py-1.5"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {ind.label}
              </p>

              <p className="break-words text-xs font-medium text-foreground">
                {formatValorRelatorio(ind.valor, ind.chave)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SecaoLinhasRelatorioProps {
  titulo: string;
  items?: LinhaRelatorio[];
  emptyMessage?: string;
  highlight?: (linha: LinhaRelatorio) => boolean;
}

export function SecaoLinhasRelatorio({
  titulo,
  items,
  emptyMessage = "Nenhum registro encontrado para esta seção.",
  highlight,
}: SecaoLinhasRelatorioProps) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-sm font-semibold tracking-tight text-foreground">
        {titulo}
      </h2>

      {!items || items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border/70 bg-card/60 p-8 text-center shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md">
          <Inbox className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />

          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((linha, i) => (
            <LinhaRelatorioCard
              key={i}
              linha={linha}
              highlight={highlight?.(linha)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function TabelaLinhasRelatorio({
  titulo,
  items = [],
  nomeEmpresa,
  dataGeracao,
}: {
  titulo: string;
  items?: LinhaRelatorio[];
  nomeEmpresa?: string;
  dataGeracao?: string;
}) {
  type Row = Record<string, unknown>;
  const rows: Row[] = items.map((item) => ({
    titulo: item.titulo,
    descricao: item.descricao ?? "",
    ...Object.fromEntries(
      (item.indicadores ?? []).map((indicador) => [
        indicador.chave,
        indicador.valor,
      ]),
    ),
  }));

  const indicatorColumns = new Map<string, string>();
  items.forEach((item) =>
    (item.indicadores ?? []).forEach((indicador) => {
      if (!indicatorColumns.has(indicador.chave)) {
        indicatorColumns.set(indicador.chave, indicador.label);
      }
    }),
  );

  const columns: RelatorioColumn<Row>[] = [
    {
      key: "titulo",
      label: "Registro",
      accessor: (row) => String(row.titulo ?? ""),
      alwaysVisible: true,
    },
    {
      key: "descricao",
      label: "Descrição",
      accessor: (row) => String(row.descricao ?? ""),
      hiddenByDefault: true,
    },
    ...Array.from(indicatorColumns, ([key, label]) => ({
      key,
      label,
      accessor: (row: Row) => formatValorRelatorio(row[key], key),
    })),
  ];
  const numericIndicators = Array.from(indicatorColumns.keys())
    .filter((key) => {
      const values = rows
        .map((row) => Number(row[key]))
        .filter(Number.isFinite);
      return (
        values.length >= Math.min(2, rows.length) && new Set(values).size > 1
      );
    })
    .slice(0, 3);
  const chartData: ComparisonChartDatum[] = rows.slice(0, 12).map((row) => ({
    name: String(row.titulo ?? "—"),
    ...Object.fromEntries(
      numericIndicators.map((key) => [key, Number(row[key]) || 0]),
    ),
  }));

  return (
    <div className="mb-5">
      <h2 className="mb-2.5 text-sm font-semibold tracking-tight text-foreground">
        {titulo}
      </h2>
      {numericIndicators.length >= 2 && rows.length >= 2 && (
        <ReportChartGrid>
          <ReportChartCard
            title={`Comparativo — ${titulo}`}
            description="Compara os principais indicadores entre os registros desta seção."
          >
            <ReportComparisonBarChart
              data={chartData}
              reportKey={titulo.toLowerCase()}
              series={numericIndicators.map((key) => ({
                key,
                label: indicatorColumns.get(key) ?? key,
              }))}
            />
          </ReportChartCard>
        </ReportChartGrid>
      )}
      <RelatorioDataTable
        reportName={titulo}
        organizacaoNome={nomeEmpresa}
        dataGeracao={dataGeracao}
        rows={rows}
        columns={columns}
        searchPlaceholder={`Buscar em ${titulo.toLocaleLowerCase("pt-BR")}...`}
        emptyMessage={`Nenhum registro encontrado em ${titulo.toLocaleLowerCase("pt-BR")}.`}
      />
    </div>
  );
}

export function RelatorioLoading({
  children = "Carregando relatório...",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-border/70 bg-card/75 px-6 py-14 text-center shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />

      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function RelatorioFooterNote() {
  return null;
}

export { AppLayout };

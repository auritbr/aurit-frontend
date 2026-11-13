import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportChartTooltipContent } from "@/components/relatorios/ReportKit";
import { coresCumprimento as COR } from "@/lib/cumprimentoMetas";
import { getChartColor } from "@/lib/reportChartTheme";

const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
const tooltipProps = {
  isAnimationActive: false,
  wrapperStyle: { zIndex: 20, maxWidth: 260, outline: "none" },
  allowEscapeViewBox: { x: false, y: false },
} as const;
const legendProps = {
  iconType: "circle",
  iconSize: 8,
  wrapperStyle: { fontSize: 10.5, lineHeight: "16px" },
} as const;
const grade = "hsl(var(--border) / 0.55)";
const fundoCursor = "hsl(var(--muted) / 0.4)";
const rotuloCurto = (nome: string) =>
  nome.length > 21 ? nome.slice(0, 20).trimEnd() + "…" : nome;
const tema = "prestacoes-metas";

interface Serie {
  key: string;
  name: string;
  color: string;
}
type Linha = {
  name: string;
  full?: string;
  [k: string]: number | string | undefined;
};
interface Ponto {
  name: string;
  full?: string;
  value: number;
  detalhe: string[];
  cor?: string;
}
type Formato = (valor: number) => string;
const padrao: Formato = (valor) => valor.toLocaleString("pt-BR");

export function StackedHBar({
  data,
  series,
  expand,
  fmt = padrao,
  tooltipFormat = fmt,
}: {
  data: Linha[];
  series: Serie[];
  expand?: boolean;
  fmt?: Formato;
  tooltipFormat?: Formato;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        stackOffset={expand ? "expand" : "sign"}
        margin={{ top: 6, right: 18, left: 0, bottom: 3 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={grade}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={expand ? [0, 1] : undefined}
          ticks={expand ? [0, 0.25, 0.5, 0.75, 1] : undefined}
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) =>
            expand ? `${Math.round(Number(v) * 100)}%` : fmt(Number(v))
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={rotuloCurto}
        />
        <Tooltip<number, string>
          {...tooltipProps}
          cursor={{ fill: fundoCursor }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as Linha | undefined;
            const details =
              typeof row?.extra === "string" ? [row.extra] : undefined;
            return (
              <ReportChartTooltipContent
                active={active}
                label={row?.full ?? row?.name}
                payload={payload}
                formatter={tooltipFormat}
                details={details}
              />
            );
          }}
        />
        <Legend {...legendProps} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="valores"
            fill={s.color}
            maxBarSize={20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DivergingHBar({
  data,
  fmt,
  tooltipFormat = fmt,
  legenda,
  mostrarZero = true,
}: {
  data: Ponto[];
  fmt: Formato;
  tooltipFormat?: Formato;
  legenda: string;
  mostrarZero?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 6, right: 18, bottom: 6 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={grade}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmt(Number(v))}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={rotuloCurto}
        />
        {mostrarZero && (
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground) / 0.45)" />
        )}
        <Tooltip<number, string>
          {...tooltipProps}
          cursor={{ fill: fundoCursor }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as Ponto | undefined;
            return (
              <ReportChartTooltipContent
                active={active}
                label={row?.full ?? row?.name}
                payload={payload}
                formatter={tooltipFormat}
                details={row?.detalhe}
              />
            );
          }}
        />
        <Bar dataKey="value" name={legenda} radius={4} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell
              key={`${d.name}-${i}`}
              fill={d.cor ?? (d.value < 0 ? COR.parcial : COR.info)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleHBar({
  data,
  fmt,
  tooltipFormat,
}: {
  data: Ponto[];
  fmt: Formato;
  tooltipFormat?: Formato;
}) {
  return (
    <DivergingHBar
      data={data.map((d, index) => ({ ...d, cor: getChartColor(tema, index) }))}
      fmt={fmt}
      tooltipFormat={tooltipFormat}
      legenda="Orçamento previsto"
      mostrarZero={false}
    />
  );
}

export function MensalAcumuladoLine({
  data,
  fmt,
  tooltipFormat = fmt,
  nomeValor,
  nomeAcumulado,
}: {
  data: { name: string; valor: number; acumulado: number }[];
  fmt: Formato;
  tooltipFormat?: Formato;
  nomeValor: string;
  nomeAcumulado: string;
}) {
  const series = [
    { key: "valor", nome: nomeValor, cor: getChartColor(tema, 0, nomeValor) },
    { key: "acumulado", nome: nomeAcumulado, cor: getChartColor(tema, 1) },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grade} vertical={false} />
        <XAxis
          dataKey="name"
          minTickGap={12}
          tick={tick}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={65}
          tickFormatter={(v) => fmt(Number(v))}
        />
        <Tooltip<number, string>
          {...tooltipProps}
          content={<ReportChartTooltipContent formatter={tooltipFormat} />}
        />
        <Legend {...legendProps} />
        {series.map(({ key, nome, cor }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={nome}
            stroke={cor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: cor }}
            activeDot={{ r: 5, fill: cor }}
            strokeDasharray={key === "acumulado" ? "5 3" : undefined}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

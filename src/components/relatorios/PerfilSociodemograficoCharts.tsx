import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/estudosSocioeconomicos";

const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
const tooltip = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};
const principal = "hsl(var(--primary))";
const secundario = "hsl(205 55% 47%)";
const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  currency: "BRL",
  style: "currency",
});
const vazio = (
  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
    Sem dados suficientes para este gráfico.
  </div>
);

export function EvolucaoEstudosChart({
  data,
}: {
  data: { name: string; estudos: number; participantes: number }[];
}) {
  if (!data.length) return vazio;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis
          allowDecimals={false}
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <Tooltip contentStyle={tooltip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="estudos"
          name="Estudos realizados"
          stroke={principal}
          strokeWidth={2.4}
          dot={{ r: 2.5 }}
        />
        <Line
          type="monotone"
          dataKey="participantes"
          name="Participantes distintos"
          stroke={secundario}
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 2.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function TransporteAgrupadoChart({
  data,
}: {
  data: { name: string; participantes: number; familias: number }[];
}) {
  if (!data.some((d) => d.participantes || d.familias)) return vazio;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={tick}
          tickLine={false}
          axisLine={false}
          interval={0}
          height={44}
          angle={-18}
          textAnchor="end"
        />
        <YAxis
          allowDecimals={false}
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={tooltip}
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="participantes"
          name="Participantes"
          fill={principal}
          radius={[5, 5, 0, 0]}
        />
        <Bar
          dataKey="familias"
          name="Famílias"
          fill={secundario}
          radius={[5, 5, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function EvolucaoRendaChart({
  data,
}: {
  data: { name: string; renda: number; respostas: number }[];
}) {
  if (!data.length) return vazio;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 12, left: 2, bottom: 4 }}>
        <CartesianGrid
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={76}
          tickFormatter={(v) => moedaCompacta.format(v)}
        />
        <Tooltip
          contentStyle={tooltip}
          formatter={(valor: number, _nome, item) => [
            formatBRL(valor),
            "Renda média (" + item.payload.respostas + " respostas)",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="renda"
          name="Renda familiar média declarada"
          stroke={principal}
          strokeWidth={2.4}
          dot={{ r: 2.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

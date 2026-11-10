import { useEffect, useMemo, useState } from "react";
import {
  calcularVariacao,
  dataISO,
  dentroDoPeriodo,
  formatarPeriodo,
  periodoComparacao,
  periodoValido,
  type Periodo,
  type SentidoIndicador,
} from "@/lib/periodComparison";
import { ReportChartCard } from "./ReportKit";
import {
  AvisoComparacao,
  avisoPeriodoPrincipal,
  comparacaoInicial,
  PainelComparacao,
  ReferenciaComparacao,
  ReportComparedLineChart,
} from "./AnalyticsKit";
export interface IndicadorComparavel<T> {
  label: string;
  calc: (rows: T[]) => number | null;
  tipo?: "numero" | "percentual" | "moeda";
  sentido?: SentidoIndicador;
}
const fmt = (v: number, tipo?: string) =>
  tipo === "moeda"
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${tipo === "percentual" ? "%" : ""}`;
function meses(p: Periodo) {
  const result: string[] = [];
  let [a, m] = p.inicio.split("-").map(Number);
  const fim = p.fim.slice(0, 7);
  while (`${a}-${String(m).padStart(2, "0")}` <= fim) {
    result.push(`${a}-${String(m).padStart(2, "0")}`);
    if (++m > 12) {
      m = 1;
      a++;
    }
  }
  return result;
}
export function ComparacaoPeriodos<T>({
  id,
  rows,
  getData,
  indicadores,
  periodo,
  referencia,
  loadRows,
}: {
  id: string;
  rows: T[];
  getData: (row: T) => string | null | undefined;
  indicadores: IndicadorComparavel<T>[];
  periodo?: Periodo;
  referencia: string;
  loadRows?: () => Promise<T[]>;
}) {
  const [comparacao, setComparacao] = useState(comparacaoInicial);
  const [proprio, setProprio] = useState<Periodo>({ inicio: "", fim: "" });
  const principal = periodo ?? proprio,
    principalOk = periodoValido(principal) ? principal : null;
  const comparado = comparacao.ativo
    ? periodoComparacao(principalOk, comparacao.modo, comparacao.personalizado)
    : null;
  const [loaded, setLoaded] = useState<{
    source: () => Promise<T[]>;
    rows?: T[];
    error?: string;
  }>();
  const shouldLoad = Boolean(principalOk && comparado);
  useEffect(() => {
    if (!shouldLoad || !loadRows) return;
    let current = true;
    loadRows().then(
      (rows) => {
        if (current) setLoaded({ source: loadRows, rows });
      },
      (error: unknown) => {
        if (current)
          setLoaded({
            source: loadRows,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar a comparação.",
          });
      },
    );
    return () => {
      current = false;
    };
  }, [shouldLoad, loadRows]);
  const response = loaded?.source === loadRows ? loaded : undefined;
  const comparisonRows = loadRows ? response?.rows : rows;
  const resultado = useMemo(() => {
    if (!principalOk || !comparado || !comparisonRows || !indicadores.length)
      return null;
    const a = comparisonRows.filter((r) =>
      dentroDoPeriodo(getData(r) ?? "", principalOk),
    );
    const b = comparisonRows.filter((r) =>
      dentroDoPeriodo(getData(r) ?? "", comparado),
    );
    const ma = meses(principalOk),
      mb = meses(comparado);
    const serie = Array.from(
      { length: Math.max(ma.length, mb.length) },
      (_, i) => ({
        name: ma[i] ?? `Mês ${i + 1}`,
        atual: ma[i]
          ? indicadores[0].calc(
              a.filter((r) => dataISO(getData(r))?.startsWith(ma[i])),
            )
          : null,
        comparado: mb[i]
          ? indicadores[0].calc(
              b.filter((r) => dataISO(getData(r))?.startsWith(mb[i])),
            )
          : null,
      }),
    );
    return { a, b, serie };
  }, [comparisonRows, principalOk, comparado, indicadores, getData]);
  return (
    <PainelComparacao
      className="mb-5"
      idPrefix={id}
      comparacao={comparacao}
      onChange={setComparacao}
      principal={
        periodo ? undefined : { periodo: proprio, onChange: setProprio }
      }
    >
      <ReferenciaComparacao referencia={referencia} />
      {!principalOk ? (
        <AvisoComparacao>{avisoPeriodoPrincipal}</AvisoComparacao>
      ) : !comparado ? (
        <AvisoComparacao>
          Informe um período de comparação válido.
        </AvisoComparacao>
      ) : response?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {response.error}
        </p>
      ) : !resultado ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando dados da comparação...
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Comparando <strong>{formatarPeriodo(principalOk)}</strong> (
            {resultado.a.length} registro(s)) com{" "}
            <strong>{formatarPeriodo(comparado)}</strong> ({resultado.b.length}{" "}
            registro(s)).
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((ind) => {
              const a = ind.calc(resultado.a),
                b = ind.calc(resultado.b),
                v =
                  a !== null && b !== null
                    ? calcularVariacao(a, b, ind.sentido)
                    : null;
              return (
                <div
                  key={ind.label}
                  className="rounded-[12px] border border-border/60 bg-background/50 px-3 py-2.5"
                >
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    {ind.label}
                  </p>
                  <p className="text-base font-semibold">
                    {a === null ? "—" : fmt(a, ind.tipo)}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    Comparação: {b === null ? "sem dados" : fmt(b, ind.tipo)}
                  </p>
                  {v && (
                    <p
                      className={`text-[11.5px] ${v.tom === "positivo" ? "text-emerald-700 dark:text-emerald-300" : v.tom === "negativo" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"}`}
                    >
                      Diferença: {v.diferenca > 0 ? "+" : ""}
                      {fmt(
                        v.diferenca,
                        ind.tipo === "percentual" ? "numero" : ind.tipo,
                      )}
                      {ind.tipo === "percentual"
                        ? " p.p."
                        : v.percentual === null
                          ? " · sem base para variação %"
                          : ` · ${v.percentual > 0 ? "+" : ""}${fmt(v.percentual, "percentual")}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <ReportChartCard
            title={`${indicadores[0].label} por mês`}
            description="Linha contínua: período principal · tracejada: comparação. Os valores respeitam os dias de início e fim."
          >
            <ReportComparedLineChart
              data={resultado.serie}
              labelAtual={formatarPeriodo(principalOk)}
              labelComparado={formatarPeriodo(comparado)}
              formatValue={(v) => fmt(v, indicadores[0].tipo)}
            />
          </ReportChartCard>
        </>
      )}
    </PainelComparacao>
  );
}

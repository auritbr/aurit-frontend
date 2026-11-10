import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  escopoAnalitico,
  compararRelatorio,
  getRecursosComparacao,
  type Comparativo,
  type FiltroApi,
  type Metrica,
} from "@/data/analitico";
import { reportEnumLabel } from "@/data/relatoriosEspecializados";
import {
  formatarPeriodo,
  periodoValido,
  type Periodo,
} from "@/lib/periodComparison";
import {
  AvisoComparacao,
  avisoPeriodoPrincipal,
  comparacaoInicial,
  ComparacaoResumo,
  IndisponivelInfo,
  PainelComparacao,
  ReferenciaComparacao,
  ReportComparedLineChart,
} from "./AnalyticsKit";
import { ReportChartCard } from "./ReportKit";

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const nome = (value: string) => reportEnumLabel(value.replace(/-/g, "_"));
const referencias: Record<string, string> = {
  "geral-projetos": "início do projeto",
  "execucao-atividades": "início da atividade",
  "cronograma-prazos": "início da etapa",
  "regularidade-documental": "data de emissão do documento",
  "institucional-organizacao": "início do mandato",
  "fluxo-caixa": "data da movimentação",
  "movimentacoes-financeiras": "data da movimentação",
  "receitas-despesas-categoria": "data da movimentação",
  "transferencias-bancarias": "data da transferência",
  "doacoes-recebidas": "data da doação",
  "turmas-atendimento": "data do registro de frequência",
  presencas: "data do registro de frequência",
};

export function formatarMetrica(metrica?: Metrica | null) {
  if (!metrica?.disponivel || metrica.valor == null) return "—";
  if (metrica.unidade === "MOEDA") return moeda.format(metrica.valor);
  return (
    numero.format(metrica.valor) +
    (metrica.unidade === "PERCENTUAL"
      ? "%"
      : metrica.unidade === "DIAS"
        ? " dias"
        : "")
  );
}

function mesesDoPeriodo(periodo: Periodo) {
  const fim = periodo.fim.slice(0, 7);
  const meses: string[] = [];
  let [ano, mes] = periodo.inicio.split("-").map(Number);
  for (let i = 0; i <= 121; i++) {
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;
    if (chave > fim) break;
    meses.push(chave);
    if (++mes === 13) {
      mes = 1;
      ano++;
    }
  }
  return meses;
}
export function ComparativoResultados({
  data,
  error,
  labels = {},
}: {
  data?: Comparativo;
  error?: Error | null;
  labels?: Record<string, string>;
}) {
  if (error)
    return (
      <p role="alert" className="my-3 text-sm text-destructive">
        {error.message}
      </p>
    );
  if (!data)
    return (
      <p role="status" className="my-3 text-sm text-muted-foreground">
        Carregando comparação...
      </p>
    );
  if (!data.disponivel)
    return (
      <IndisponivelInfo
        titulo="Comparação indisponível"
        motivo={data.motivo ?? "O relatório não possui dados suficientes."}
      />
    );

  // Pontos de distribuição, como situação e categoria, não formam uma série mensal.
  const mensal = (serie: Comparativo["seriePrincipal"]) =>
    serie.filter((ponto) => /^\d{4}-\d{2}$/.test(ponto.periodo));
  const a = mensal(data.seriePrincipal),
    b = mensal(data.serieComparada);
  const exemplos = a[0]?.indicadores ?? b[0]?.indicadores ?? {};
  const chave =
    "participantes" in exemplos ? "participantes" : Object.keys(exemplos)[0];
  const mesesA = mesesDoPeriodo(data.principal),
    mesesB = mesesDoPeriodo(data.comparado);
  const porMesA = new Map(
    a.map((ponto) => [ponto.periodo, ponto.indicadores[chave]?.valor ?? null]),
  );
  const porMesB = new Map(
    b.map((ponto) => [ponto.periodo, ponto.indicadores[chave]?.valor ?? null]),
  );
  const serie = chave
    ? Array.from(
        { length: Math.max(mesesA.length, mesesB.length) },
        (_, index) => ({
          name: mesesA[index] ?? `Mês ${index + 1}`,
          atual: porMesA.get(mesesA[index]) ?? null,
          comparado: porMesB.get(mesesB[index]) ?? null,
        }),
      )
    : [];

  return (
    <div className="my-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.indicadores.map((item) => (
          <div
            key={item.indicador}
            className="rounded-xl border border-border/60 p-3"
          >
            <h3 className="text-xs font-semibold">
              {labels[item.indicador] ?? nome(item.indicador)}
            </h3>
            <p className="text-lg font-semibold">
              {formatarMetrica(item.principal)}
            </p>
            <p className="text-xs text-muted-foreground">
              Comparado: {formatarMetrica(item.comparado)}
            </p>
            {item.disponivel &&
              item.diferencaAbsoluta != null &&
              item.principal && (
                <p className="mt-1 text-xs">
                  Diferença: {item.diferencaAbsoluta > 0 ? "+" : ""}
                  {item.pontosPercentuais != null
                    ? `${numero.format(item.pontosPercentuais)} p.p.`
                    : formatarMetrica({
                        ...item.principal,
                        valor: item.diferencaAbsoluta,
                      })}
                  {item.variacaoPercentual != null &&
                    ` (${numero.format(item.variacaoPercentual)}%)`}
                </p>
              )}
            {item.motivo && (
              <p className="mt-1 text-xs text-muted-foreground">
                {item.motivo}
              </p>
            )}
          </div>
        ))}
      </div>
      {serie.length > 0 && (
        <ReportChartCard title={`${labels[chave] ?? nome(chave)} por mês`}>
          <div className="h-64">
            <ReportComparedLineChart
              data={serie}
              labelAtual={formatarPeriodo(data.principal)}
              labelComparado={formatarPeriodo(data.comparado)}
              formatValue={(valor) =>
                formatarMetrica({ ...exemplos[chave], valor })
              }
            />
          </div>
        </ReportChartCard>
      )}
    </div>
  );
}

export function ComparativoBackend({
  slug,
  filtros,
  inicial,
  financeiro = false,
}: {
  slug: string;
  filtros?: FiltroApi;
  inicial?: Periodo;
  financeiro?: boolean;
}) {
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [config, setConfig] = useState(comparacaoInicial);
  const selecionado = periodo ?? inicial ?? { inicio: "", fim: "" };
  const principalValido = periodoValido(selecionado);
  const valido =
    principalValido &&
    (config.modo !== "personalizado" || periodoValido(config.personalizado));
  const tenant = escopoAnalitico();
  const recursos = useQuery({
    queryKey: ["recursos-comparacao", tenant],
    queryFn: () => getRecursosComparacao(),
  });
  const compativel = recursos.data?.includes(slug) ?? false;
  const resultado = useQuery({
    queryKey: [
      "comparativo-backend",
      tenant,
      slug,
      filtros,
      selecionado,
      config,
      financeiro,
    ],
    queryFn: () =>
      compararRelatorio(slug, selecionado, config, filtros, financeiro),
    enabled: compativel && config.ativo && valido,
  });
  if (!compativel) return null;
  return (
    <PainelComparacao
      className="mb-5"
      idPrefix={slug}
      comparacao={config}
      onChange={setConfig}
      principal={{ periodo: selecionado, onChange: setPeriodo }}
    >
      <ReferenciaComparacao
        referencia={referencias[slug] ?? "data considerada no relatório"}
      />
      {valido ? (
        <div>
          <ComparacaoResumo
            principal={resultado.data?.principal ?? null}
            comparado={resultado.data?.comparado ?? null}
          />
          <ComparativoResultados
            data={resultado.data}
            error={resultado.error}
          />
        </div>
      ) : (
        <AvisoComparacao>
          {principalValido
            ? "Informe um período de comparação válido."
            : avisoPeriodoPrincipal}
        </AvisoComparacao>
      )}
    </PainelComparacao>
  );
}

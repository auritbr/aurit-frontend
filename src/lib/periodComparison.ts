export type ModoComparacao = "anterior" | "anoAnterior" | "personalizado";
export type SentidoIndicador = "maiorMelhor" | "menorMelhor" | "neutro";
export interface Periodo {
  inicio: string;
  fim: string;
}
const DIA = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);
export function dataISO(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  const iso = br
    ? `${br[3]}-${br[2]}-${br[1]}`
    : /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(raw)
      ? raw.slice(0, 10)
      : "";
  const time = toTime(iso);
  return iso && Number.isFinite(time) && toIso(time) === iso ? iso : null;
}
export const periodoValido = (p?: Partial<Periodo> | null): p is Periodo =>
  !!p && !!dataISO(p.inicio) && !!dataISO(p.fim) && p.inicio! <= p.fim!;
export const dentroDoPeriodo = (data: string, p: Periodo) => {
  const iso = dataISO(data);
  return !!iso && iso >= p.inicio && iso <= p.fim;
};
function menosUmAno(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a - 1, m, 0)).getUTCDate();
  return toIso(Date.UTC(a - 1, m - 1, Math.min(d, ultimo)));
}
export function periodoComparacao(
  principal: Partial<Periodo> | null | undefined,
  modo: ModoComparacao,
  personalizado?: Partial<Periodo> | null,
): Periodo | null {
  if (modo === "personalizado")
    return periodoValido(personalizado) ? personalizado : null;
  if (!periodoValido(principal)) return null;
  if (modo === "anoAnterior")
    return {
      inicio: menosUmAno(principal.inicio),
      fim: menosUmAno(principal.fim),
    };
  const [anoInicio, mesInicio, diaInicio] = principal.inicio
    .split("-")
    .map(Number);
  const [anoFim, mesFim, diaFim] = principal.fim.split("-").map(Number);
  const fim = toTime(principal.inicio) - DIA;
  if (
    diaInicio === 1 &&
    diaFim === new Date(Date.UTC(anoFim, mesFim, 0)).getUTCDate()
  ) {
    const meses = (anoFim - anoInicio) * 12 + mesFim - mesInicio + 1;
    return {
      inicio: toIso(Date.UTC(anoInicio, mesInicio - 1 - meses, 1)),
      fim: toIso(fim),
    };
  }
  const dias =
    Math.round((toTime(principal.fim) - toTime(principal.inicio)) / DIA) + 1;
  return { inicio: toIso(fim - (dias - 1) * DIA), fim: toIso(fim) };
}
export interface Variacao {
  atual: number;
  anterior: number;
  diferenca: number;
  percentual: number | null;
  tendencia: "alta" | "queda" | "estavel";
  tom: "positivo" | "negativo" | "neutro";
}
export function calcularVariacao(
  atual: number,
  anterior: number,
  sentido: SentidoIndicador = "neutro",
): Variacao {
  const a = Number.isFinite(atual) ? atual : 0,
    b = Number.isFinite(anterior) ? anterior : 0;
  const diferenca = Math.round((a - b) * 100) / 100;
  const tendencia =
    diferenca === 0 ? "estavel" : diferenca > 0 ? "alta" : "queda";
  const melhor =
    sentido === "maiorMelhor" ? tendencia === "alta" : tendencia === "queda";
  return {
    atual: a,
    anterior: b,
    diferenca,
    percentual: b === 0 ? null : ((a - b) / Math.abs(b)) * 100,
    tendencia,
    tom:
      tendencia === "estavel" || sentido === "neutro"
        ? "neutro"
        : melhor
          ? "positivo"
          : "negativo",
  };
}
const nf = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export function textoVariacao(
  v: Variacao,
  tipo: "numero" | "percentual" = "numero",
) {
  if (v.tendencia === "estavel") return "Estável";
  const valor = `${v.diferenca > 0 ? "+" : "−"}${nf(Math.abs(v.diferenca))}`;
  if (tipo === "percentual") return `${valor} p.p.`;
  return `${valor} (${v.percentual === null ? "sem base anterior" : `${v.percentual > 0 ? "+" : ""}${nf(v.percentual)}%`})`;
}
export const formatarPeriodo = (p: Periodo) =>
  `${p.inicio.split("-").reverse().join("/")} a ${p.fim.split("-").reverse().join("/")}`;

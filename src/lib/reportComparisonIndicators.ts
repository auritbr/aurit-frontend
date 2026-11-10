import type { IndicadorComparavel } from "@/components/relatorios/ComparacaoPeriodos";

export type ReportRow = Record<string, unknown>;

export const reportNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export const sumReportField = (rows: ReportRow[], field: string) =>
  rows.reduce((total, row) => total + reportNumber(row[field]), 0);

export const reportDate = (value: unknown) =>
  typeof value === "string" ? value : undefined;

export const countRows = (
  label: string,
  filter?: (row: ReportRow) => boolean,
): IndicadorComparavel<ReportRow> => ({
  label,
  calc: (rows) => (filter ? rows.filter(filter).length : rows.length),
});

export const countDistinct = (
  label: string,
  field: string,
): IndicadorComparavel<ReportRow> => ({
  label,
  calc: (rows) =>
    new Set(
      rows
        .map((row) => row[field])
        .filter((value) => value != null && value !== "" && value !== "—"),
    ).size,
});

export const sumField = (
  label: string,
  field: string,
  tipo: "numero" | "moeda" = "numero",
): IndicadorComparavel<ReportRow> => ({
  label,
  tipo,
  calc: (rows) => sumReportField(rows, field),
});

export const ratio = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : null;

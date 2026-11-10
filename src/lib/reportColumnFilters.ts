export interface ReportColumnFilter {
  text?: string;
  values?: string[];
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  separator?: string;
}
export type ReportColumnFilters = Record<string, ReportColumnFilter>;
export interface ReportFilterColumn {
  chave: string;
  label: string;
  tipo?: string;
  filterType?: "date" | "number" | "multi" | "text" | "time";
  optionLabelKey?: string;
  valueSeparator?: string;
}
const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const reportFilterValues = (
  value: unknown,
  separator?: string,
): string[] =>
  (Array.isArray(value) ? value.flat(Infinity) : [value])
    .filter((item) => item !== null && item !== undefined && item !== "")
    .flatMap((item) =>
      separator
        ? String(item)
            .split(separator)
            .map((value) => value.trim())
            .filter(Boolean)
        : [String(item)],
    );
export function reportFilterNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const raw = String(value).trim();
  const number = Number(
    raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw,
  );
  return Number.isFinite(number) ? number : null;
}
export function reportFilterDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  return br
    ? `${br[3]}-${br[2]}-${br[1]}`
    : /^\d{4}-\d{2}-\d{2}/.test(raw)
      ? raw.slice(0, 10)
      : "";
}
export function cleanReportColumnFilters(
  filters: ReportColumnFilters,
): ReportColumnFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, filter]) => [
        key,
        Object.fromEntries(
          Object.entries(filter).filter(
            ([field, value]) =>
              (field !== "separator" || !!filter.values?.length) &&
              (Array.isArray(value)
                ? value.length > 0
                : typeof value === "string" && value.trim() !== ""),
          ),
        ),
      ])
      .filter(([, filter]) => Object.keys(filter).length > 0),
  );
}
export function matchesReportColumnFilters(
  row: Record<string, unknown>,
  filters: ReportColumnFilters,
): boolean {
  return Object.entries(filters).every(([key, filter]) => {
    const value = row[key];
    if (
      filter.text &&
      !normalize(reportFilterValues(value).join(" ")).includes(
        normalize(filter.text),
      )
    )
      return false;
    if (
      filter.values?.length &&
      !reportFilterValues(value, filter.separator).some((item) =>
        filter.values!.some(
          (selected) => normalize(selected) === normalize(item),
        ),
      )
    )
      return false;
    if (filter.from || filter.to) {
      const date = reportFilterDate(value);
      if (
        !date ||
        (filter.from && date < filter.from) ||
        (filter.to && date > filter.to)
      )
        return false;
    }
    if (filter.min || filter.max) {
      const number = reportFilterNumber(value);
      const min = reportFilterNumber(filter.min);
      const max = reportFilterNumber(filter.max);
      if (
        number === null ||
        (min !== null && number < min) ||
        (max !== null && number > max)
      )
        return false;
    }
    return true;
  });
}
export function reportColumnFilterType(
  column: ReportFilterColumn,
): "date" | "number" | "multi" | "text" | "time" {
  if (column.filterType) return column.filterType;
  const tipo = normalize(column.tipo);
  if (["data", "date"].includes(tipo)) return "date";
  if (
    ["numero", "number", "moeda", "money", "percentual", "percent"].includes(
      tipo,
    )
  )
    return "number";
  if (
    ["booleano", "boolean", "enum"].includes(tipo) ||
    /(?:status|situacao|situação|tipo|genero|gênero|raca|raça|nivel|nível|cargo|origem|etapa|projeto|atividade|turma|categoria|organizacao)/i.test(
      column.chave,
    )
  )
    return "multi";
  return "text";
}
export function invalidReportColumnFilter(filter: ReportColumnFilter): boolean {
  return !!(
    (filter.from && filter.to && filter.from > filter.to) ||
    (filter.min && reportFilterNumber(filter.min) === null) ||
    (filter.max && reportFilterNumber(filter.max) === null) ||
    (filter.min &&
      filter.max &&
      reportFilterNumber(filter.min)! > reportFilterNumber(filter.max)!)
  );
}

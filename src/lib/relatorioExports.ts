import * as XLSX from "xlsx";
import type { ReactNode } from "react";

export interface RelatorioColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  alwaysVisible?: boolean;
  hiddenByDefault?: boolean;
}

const formatCell = <T>(row: T, col: RelatorioColumn<T>): string => {
  const raw = col.accessor
    ? col.accessor(row)
    : (row as Record<string, unknown>)[col.key];

  if (raw === null || raw === undefined) return "";
  return String(raw);
};

const sanitizeFileBase = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function buildFileName(reportName: string, ext: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `relatorio-${sanitizeFileBase(reportName)}-${today}.${ext}`;
}

export function buildTsv<T>(rows: T[], cols: RelatorioColumn<T>[]): string {
  const header = cols.map((column) => column.label).join("\t");
  const body = rows
    .map((row) =>
      cols
        .map((column) => formatCell(row, column).replace(/[\t\n\r]+/g, " "))
        .join("\t"),
    )
    .join("\n");
  return body ? `${header}\n${body}` : header;
}

const escapeCsv = (value: string) =>
  value.includes(";") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;

export function exportCsv<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  reportName: string,
) {
  const header = cols.map((column) => escapeCsv(column.label)).join(";");
  const body = rows
    .map((row) =>
      cols.map((column) => escapeCsv(formatCell(row, column))).join(";"),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, buildFileName(reportName, "csv"));
}

export function exportXlsx<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  reportName: string,
) {
  const data = rows.map((row) =>
    Object.fromEntries(
      cols.map((column) => [column.label, formatCell(row, column)]),
    ),
  );
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: cols.map((column) => column.label),
  });
  worksheet["!cols"] = cols.map((column) => {
    const width = rows.reduce(
      (maximum, row) => Math.max(maximum, formatCell(row, column).length),
      column.label.length,
    );
    return { wch: Math.min(Math.max(width + 2, 10), 50) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, buildFileName(reportName, "xlsx"));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

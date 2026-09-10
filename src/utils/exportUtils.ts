import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
}
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  fileName: string,
) {
  const rows = data.map((item) =>
    Object.fromEntries(
      columns.map((column) => [column.header, item[column.key] ?? ""]),
    ),
  );
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Dados");
  XLSX.writeFile(book, `${fileName}.xlsx`);
}
export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  fileName: string,
) {
  const rows = data.map((item) =>
    Object.fromEntries(
      columns.map((column) => [column.header, item[column.key] ?? ""]),
    ),
  );
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows), {
    FS: ";",
  });
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

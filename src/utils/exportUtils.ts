import { downloadFile, XLSX_MIME } from "@/lib/downloadFile";
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
  return downloadFile(
    new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })], {
      type: XLSX_MIME,
    }),
    `${fileName}.xlsx`,
  );
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
  return downloadFile(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    `${fileName}.csv`,
  );
}

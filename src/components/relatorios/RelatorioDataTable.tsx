import { useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { ColumnSelector } from "./ColumnSelector";
import { RelatorioExportButtons } from "./RelatorioExportButtons";
import type { RelatorioColumn } from "@/lib/relatorioExporters";

interface RelatorioDataTableProps<T> {
  reportName: string;
  organizacaoNome?: string;
  dataGeracao?: string;
  rows: T[];
  columns: RelatorioColumn<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  indicadoresPdf?: { label: string; valor: string }[];
  enablePdfExport?: boolean;
}

function getCellRawValue<T>(row: T, column: RelatorioColumn<T>): unknown {
  if (column.accessor) {
    return column.accessor(row);
  }

  return (row as Record<string, unknown>)[column.key];
}

function formatCellDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

const matches = <T,>(row: T, term: string, cols: RelatorioColumn<T>[]) => {
  if (!term) return true;

  const normalizedTerm = term.toLowerCase();

  return cols.some((column) => {
    const value = getCellRawValue(row, column);

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(normalizedTerm);
  });
};

export function RelatorioDataTable<T>({
  reportName,
  organizacaoNome,
  dataGeracao,
  rows,
  columns,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum registro encontrado para este relatório.",
  indicadoresPdf,
  enablePdfExport = false,
}: RelatorioDataTableProps<T>) {
  const [search, setSearch] = useState("");

  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    columns
      .filter((column) => !column.hiddenByDefault)
      .map((column) => column.key),
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [columns, visibleKeys],
  );

  const filtered = useMemo(
    () => rows.filter((row) => matches(row, search, visibleColumns)),
    [rows, search, visibleColumns],
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, search);

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <RelatorioExportButtons
            rows={filtered}
            columns={visibleColumns}
            reportName={reportName}
            organizacaoNome={organizacaoNome}
            dataGeracao={dataGeracao}
            indicadoresPdf={indicadoresPdf}
            showPdf={enablePdfExport}
          />

          <ColumnSelector
            columns={columns}
            visibleKeys={visibleKeys}
            onChange={setVisibleKeys}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {visibleColumns.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Selecione ao menos uma coluna em "Colunas" para exibir os dados.
            </p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />

            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    className="max-w-[260px] whitespace-nowrap text-xs"
                    title={column.label}
                  >
                    <span className="block truncate">{column.label}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginated.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {visibleColumns.map((column) => {
                    const rawValue = getCellRawValue(row, column);
                    const displayValue = column.render
                      ? column.render(row)
                      : formatCellDisplayValue(rawValue);

                    const titleValue = formatCellDisplayValue(rawValue);

                    return (
                      <TableCell
                        key={column.key}
                        className="max-w-[260px] text-xs align-top"
                        title={titleValue}
                      >
                        <span className="block max-w-[260px] truncate">
                          {displayValue}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <TablePagination
        totalItems={filtered.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        showCopy={false}
      />
    </section>
  );
}
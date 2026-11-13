import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Inbox, ArrowUpDown } from "lucide-react";
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
import type { RelatorioColumn } from "@/lib/relatorioExports";
import { downloadGeneralReportPdf } from "@/lib/generalReportPdf";

interface RelatorioDataTableProps<T> {
  reportName: string;
  organizacaoNome?: string;
  dataGeracao?: string;
  rows: T[];
  columns: RelatorioColumn<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  indicadoresPdf?: { label: string; valor: string }[];
  allowExport?: boolean;
  sortable?: boolean;
  showColumns?: boolean;
  enablePdfExport?: boolean;
  onPdf?: (
    rows: T[],
    columns: RelatorioColumn<T>[],
    search: string,
  ) => Promise<void>;
  appliedFilters?: Record<string, unknown>;
  filterLabels?: { label: string; value: string }[];
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
  allowExport = true,
  sortable = false,
  showColumns = true,
  enablePdfExport = false,
  onPdf,
  appliedFilters,
  filterLabels,
}: RelatorioDataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    columns
      .filter((column) => !column.hiddenByDefault)
      .map((column) => column.key),
  );
  const initializedReport = useRef<string | null>(null);

  useEffect(() => {
    if (!columns.length || initializedReport.current === reportName) return;

    initializedReport.current = reportName;
    setVisibleKeys(
      columns
        .filter((column) => !column.hiddenByDefault)
        .map((column) => column.key),
    );
  }, [columns, reportName]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [columns, visibleKeys],
  );

  const exportColumns = visibleColumns.filter(
    (column) => column.exportable !== false,
  );

  const filtered = useMemo(() => {
    const result = rows.filter((row) => matches(row, search, visibleColumns));
    const column = sortable && visibleColumns.find((c) => c.key === sort?.key);
    if (!column || !sort) return result;
    return result.sort((a, b) => {
      const x = getCellRawValue(a, column);
      const y = getCellRawValue(b, column);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      const comparison =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "pt-BR", { numeric: true });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [rows, search, visibleColumns, sort, sortable]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(
      filtered,
      25,
      `${search}:${JSON.stringify(sort)}:${JSON.stringify(appliedFilters ?? {})}`,
    );

  return (
    <section className="overflow-hidden rounded-[16px] border border-border/70 bg-card/75 shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-[10px] border-border/70 bg-background/70 pl-8 text-sm backdrop-blur-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(allowExport || onPdf) && (
            <RelatorioExportButtons
              rows={filtered}
              columns={exportColumns}
              reportName={reportName}
              organizacaoNome={organizacaoNome}
              dataGeracao={dataGeracao}
              indicadoresPdf={indicadoresPdf}
              showPdf={!!onPdf || enablePdfExport}
              showDataExports={allowExport}
              showCopy={false}
              onPdf={
                onPdf
                  ? () => onPdf(filtered, exportColumns, search)
                  : enablePdfExport
                    ? () =>
                        downloadGeneralReportPdf({
                          slug: reportName,
                          columns: exportColumns.map((column) => column.key),
                          search,
                          filters: appliedFilters,
                          filterLabels,
                        })
                    : undefined
              }
            />
          )}

          {showColumns && (
            <ColumnSelector
              columns={columns}
              visibleKeys={visibleKeys}
              onChange={setVisibleKeys}
            />
          )}
        </div>
      </div>

      <div className="min-w-0">
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
          <Table className="max-md:min-w-max">
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    className="max-w-[260px] whitespace-nowrap text-xs"
                    title={column.label}
                    aria-sort={
                      sort?.key === column.key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable && !column.alwaysVisible ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5"
                        onClick={() =>
                          setSort((prev) => ({
                            key: column.key,
                            direction:
                              prev?.key === column.key &&
                              prev.direction === "asc"
                                ? "desc"
                                : "asc",
                          }))
                        }
                      >
                        {column.label}
                        <ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    ) : (
                      <span className="block truncate">{column.label}</span>
                    )}
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
                        className="max-w-[260px] whitespace-nowrap align-top text-xs md:whitespace-normal"
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

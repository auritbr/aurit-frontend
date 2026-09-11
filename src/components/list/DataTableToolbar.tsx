import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportToCSV,
  exportToExcel,
  type ExportColumn,
} from "@/utils/exportUtils";
import { toast } from "sonner";

interface DataTableToolbarProps {
  total: number;
  reportTo?: string;
  documentLayoutsTo?: string;
  exportColumns: ExportColumn[];
  getExportData: () => Record<string, unknown>[];
  exportFilename: string;
  canExport?: boolean;
  showExports?: boolean;
  /** Ações contextuais da página que compartilham a barra da tabela. */
  additionalActions?: ReactNode;
}

export function DataTableToolbar({
  total,
  reportTo,
  documentLayoutsTo,
  exportColumns,
  getExportData,
  exportFilename,
  canExport = true,
  showExports = true,
  additionalActions,
}: DataTableToolbarProps) {
  const navigate = useNavigate();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const exportExcel = () => {
    try {
      setExportingExcel(true);
      exportToExcel(getExportData(), exportColumns, exportFilename);
      toast.success("Arquivo Excel gerado com sucesso.");
    } finally {
      setExportingExcel(false);
    }
  };

  const exportCSV = () => {
    try {
      setExportingCSV(true);
      exportToCSV(getExportData(), exportColumns, exportFilename);
      toast.success("Arquivo CSV gerado com sucesso.");
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p
        className="text-[12px] text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {total === 0
          ? "Nenhum registro encontrado"
          : `${total} ${total === 1 ? "registro encontrado" : "registros encontrados"}`}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {additionalActions}
        {reportTo && (
          <Button
            type="button"
            variant="glassSecondary"
            onClick={() => navigate(reportTo)}
            className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Ver relatórios
          </Button>
        )}
        {documentLayoutsTo && (
          <Button
            type="button"
            variant="glassSecondary"
            onClick={() => navigate(documentLayoutsTo)}
            className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            Ver layouts de impressão
          </Button>
        )}
        {showExports && canExport && (
          <>
            <Button
              type="button"
              variant="glassSecondary"
              onClick={exportExcel}
              disabled={total === 0 || exportingExcel}
              className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
            >
              {exportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              )}
              {exportingExcel ? "Gerando..." : "Excel"}
            </Button>
            <Button
              type="button"
              variant="glassSecondary"
              onClick={exportCSV}
              disabled={total === 0 || exportingCSV}
              className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
            >
              {exportingCSV ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 text-blue-600" />
              )}
              {exportingCSV ? "Gerando..." : "CSV"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import { Copy, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildTsv,
  exportCsv,
  exportPdf,
  exportXlsx,
  type RelatorioColumn,
} from "@/lib/relatorioExporters";

interface RelatorioExportButtonsProps<T> {
  rows: T[];
  columns: RelatorioColumn<T>[];
  reportName: string;
  organizacaoNome?: string;
  dataGeracao?: string;
  indicadoresPdf?: { label: string; valor: string }[];
  disabled?: boolean;
  showPdf?: boolean;
}

export function RelatorioExportButtons<T>({
  rows,
  columns,
  reportName,
  organizacaoNome,
  dataGeracao,
  indicadoresPdf,
  disabled,
  showPdf = false,
}: RelatorioExportButtonsProps<T>) {
  const guard = () => {
    if (!rows.length) {
      toast.warning("Não há registros para exportar.");
      return false;
    }

    if (!columns.length) {
      toast.warning("Selecione ao menos uma coluna.");
      return false;
    }

    return true;
  };

  const handleCopy = async () => {
    if (!guard()) return;

    try {
      await navigator.clipboard.writeText(buildTsv(rows, columns));
      toast.success("Dados copiados para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar os dados.");
    }
  };

  const handleCsv = () => {
    if (!guard()) return;

    try {
      exportCsv(rows, columns, reportName);
      toast.success("CSV gerado com sucesso.");
    } catch {
      toast.error("Falha ao gerar CSV.");
    }
  };

  const handleXlsx = () => {
    if (!guard()) return;

    try {
      exportXlsx(rows, columns, reportName);
      toast.success("Excel gerado com sucesso.");
    } catch {
      toast.error("Falha ao gerar Excel.");
    }
  };

  const handlePdf = async () => {
    if (!guard()) return;

    try {
      await exportPdf(rows, columns, {
        reportName,
        organizacaoNome,
        dataGeracao,
        indicadores: indicadoresPdf,
      });

      toast.success("PDF gerado com sucesso.");
    } catch {
      toast.error("Falha ao gerar PDF.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 text-xs"
        onClick={handleCopy}
        disabled={disabled}
      >
        <Copy className="h-3.5 w-3.5" />
        Copiar
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 text-xs"
        onClick={handleCsv}
        disabled={disabled}
      >
        <FileDown className="h-3.5 w-3.5" />
        CSV
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 text-xs"
        onClick={handleXlsx}
        disabled={disabled}
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Excel
      </Button>

      {showPdf && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={handlePdf}
          disabled={disabled}
        >
          <FileText className="h-3.5 w-3.5" />
          PDF
        </Button>
      )}
    </div>
  );
}

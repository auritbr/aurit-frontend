import { useState } from "react";
import {
  Copy,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildTsv,
  exportCsv,
  exportXlsx,
  type RelatorioColumn,
} from "@/lib/relatorioExports";

interface RelatorioExportButtonsProps<T> {
  rows: T[];
  columns: RelatorioColumn<T>[];
  reportName: string;
  organizacaoNome?: string;
  dataGeracao?: string;
  indicadoresPdf?: { label: string; valor: string }[];
  disabled?: boolean;
  /** Exibe o botão "Copiar" (padrão: true). */
  showCopy?: boolean;
  /** Exibe a exportação em PDF (padrão: true). */
  showPdf?: boolean;
  /** Geração oficial do PDF pelo backend/Jasper. */
  onPdf?: () => Promise<void>;
  onCsv?: () => Promise<void>;
  onXlsx?: () => Promise<void>;
  /** Desabilita apenas a ação PDF, preservando Excel e CSV. */
  pdfDisabled?: boolean;
  /** Mantém compatibilidade com barras compactas de relatórios. */
  compact?: boolean;
}

export function RelatorioExportButtons<T>({
  rows,
  columns,
  reportName,
  organizacaoNome,
  dataGeracao,
  indicadoresPdf,
  disabled,
  showCopy = false,
  showPdf = true,
  onPdf,
  onCsv,
  onXlsx,
  pdfDisabled = false,
  compact = false,
}: RelatorioExportButtonsProps<T>) {
  const [exporting, setExporting] = useState<string | null>(null);
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

  const exportar = async (
    formato: string,
    action?: () => void | Promise<void>,
  ) => {
    if (!guard() || !action) return;
    try {
      setExporting(formato);
      await action();
      toast.success(`${formato} gerado com sucesso.`);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : `Não foi possível gerar ${formato}.`,
      );
    } finally {
      setExporting(null);
    }
  };

  const actionClass = compact
    ? "h-8 gap-1 rounded-[10px] px-2 text-[11.5px] font-semibold"
    : "h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCopy && (
        <Button
          type="button"
          variant="glassSecondary"
          className={actionClass}
          onClick={handleCopy}
          disabled={disabled}
          aria-label="Copiar dados do relatório"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copiar
        </Button>
      )}
      <Button
        type="button"
        variant="glassSecondary"
        className={actionClass}
        onClick={() =>
          void exportar(
            "Excel",
            onXlsx ?? (() => exportXlsx(rows, columns, reportName)),
          )
        }
        disabled={disabled || !!exporting}
        aria-label="Exportar relatório para Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
        Excel
      </Button>
      <Button
        type="button"
        variant="glassSecondary"
        className={actionClass}
        onClick={() =>
          void exportar(
            "CSV",
            onCsv ?? (() => exportCsv(rows, columns, reportName)),
          )
        }
        disabled={disabled || !!exporting}
        aria-label="Exportar relatório para CSV"
      >
        <FileDown className="h-3.5 w-3.5" aria-hidden />
        CSV
      </Button>
      {showPdf && (
        <Button
          type="button"
          variant="glassSecondary"
          className={actionClass}
          onClick={() =>
            onPdf
              ? void exportar("PDF", onPdf)
              : toast.error(
                  "A exportação em PDF está indisponível para este relatório.",
                )
          }
          disabled={disabled || pdfDisabled || !!exporting}
          aria-busy={exporting === "PDF"}
          aria-label="Exportar relatório para PDF"
        >
          {exporting === "PDF" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden />
          )}
          {exporting === "PDF" ? "Gerando PDF..." : "PDF"}
        </Button>
      )}
    </div>
  );
}

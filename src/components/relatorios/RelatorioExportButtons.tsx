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
  pdfDisabled = false,
  compact = false,
}: RelatorioExportButtonsProps<T>) {
  const [exportingPdf, setExportingPdf] = useState(false);
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
    if (!onPdf) {
      toast.error("A exportação em PDF está indisponível para este relatório.");
      return;
    }
    try {
      setExportingPdf(true);
      await onPdf();
      toast.success("PDF gerado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível gerar o relatório em PDF.",
      );
    } finally {
      setExportingPdf(false);
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
        onClick={handleXlsx}
        disabled={disabled}
        aria-label="Exportar relatório para Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
        Excel
      </Button>
      <Button
        type="button"
        variant="glassSecondary"
        className={actionClass}
        onClick={handleCsv}
        disabled={disabled}
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
          onClick={() => void handlePdf()}
          disabled={disabled || pdfDisabled || exportingPdf}
          aria-busy={exportingPdf}
          aria-label="Exportar relatório para PDF"
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden />
          )}
          {exportingPdf ? "Gerando PDF..." : "PDF"}
        </Button>
      )}
    </div>
  );
}

import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { DocumentActionButton } from "@/components/DocumentActionButton";
import { downloadIndividualReport } from "@/lib/individualReportDownload";

interface GerarReciboButtonProps {
  endpoint: string;
  filename: string;
  label?: string;
  successMessage: string;
  errorMessage: string;
}

/**
 * Ação compacta para recibos oficiais. Mantém o mesmo visual dos contratos e
 * demais documentos exibidos diretamente nas tabelas de cadastro.
 */
export function GerarReciboButton({
  endpoint,
  filename,
  label = "Gerar recibo",
  successMessage,
  errorMessage,
}: GerarReciboButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await downloadIndividualReport(endpoint, filename);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DocumentActionButton
      label={label}
      icon={FileDown}
      loading={loading}
      onClick={() => void handleClick()}
    />
  );
}

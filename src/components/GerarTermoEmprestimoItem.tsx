import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { downloadIndividualReport } from "@/lib/individualReportDownload";

export function GerarTermoEmprestimoButton({
  emprestimoId,
}: {
  emprestimoId: string | number;
}) {
  const [loading, setLoading] = useState(false);
  const gerar = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await downloadIndividualReport(
        `/emprestimos/${emprestimoId}/termo`,
        `termo-emprestimo-${emprestimoId}.pdf`,
      );
      toast.success("Termo de empréstimo gerado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o termo de empréstimo.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <DocumentActionButton
      label="Contrato"
      icon={FileDown}
      loading={loading}
      onClick={() => void gerar()}
      aria-label="Gerar termo de empréstimo"
    />
  );
}

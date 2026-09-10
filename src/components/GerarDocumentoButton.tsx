import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DocumentActionButton } from "@/components/DocumentActionButton";
import { Button } from "@/components/ui/button";
import {
  baixarDocumentoGerado,
  buscarModelosCompativeis,
  gerarDocumento,
  type TipoDestinatarioDocumento,
} from "@/data/documentosGerados";

export function GerarDocumentoButton({
  tipoDestinatario,
  destinatarioId,
  label = "Gerar documento",
  compacto = false,
}: {
  tipoDestinatario: TipoDestinatarioDocumento;
  destinatarioId?: number | null;
  label?: string;
  compacto?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!destinatarioId || loading) return;

    try {
      setLoading(true);
      const modelos = await buscarModelosCompativeis(
        tipoDestinatario,
        destinatarioId,
      );

      if (modelos.length === 0) {
        toast.error(
          "Nenhum modelo de documento está disponível para este cadastro.",
        );
        return;
      }

      const documento = await gerarDocumento(
        modelos[0].id,
        tipoDestinatario,
        destinatarioId,
      );
      await baixarDocumentoGerado(documento);
      toast.success("Documento gerado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o documento.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (compacto) {
    return (
      <DocumentActionButton
        label={label}
        icon={FileDown}
        loading={loading}
        disabled={!destinatarioId}
        onClick={handleClick}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="glassSecondary"
      className="h-9 gap-2 px-4"
      disabled={!destinatarioId || loading}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <FileDown className="h-4 w-4" aria-hidden />
      )}
      {loading ? "Gerando..." : label}
    </Button>
  );
}

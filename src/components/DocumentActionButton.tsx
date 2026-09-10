import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DocumentActionButtonProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  title?: string;
}

/**
 * Botão padrão para geração de documentos (ficha, contrato, termo, declaração...).
 * Visual liquid glass compacto — mesmo acabamento em todas as páginas.
 */
export function DocumentActionButton({
  label,
  icon: Icon,
  onClick,
  loading = false,
  disabled = false,
  className,
  title,
  ...rest
}: DocumentActionButtonProps) {
  return (
    <Button
      type="button"
      variant="glassDocumentAction"
      onClick={onClick}
      disabled={disabled || loading}
      title={title ?? label}
      aria-label={rest["aria-label"] ?? label}
      aria-busy={loading || undefined}
      className={cn(
        "h-8 w-auto gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-semibold",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-[15px] w-[15px] animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="h-[15px] w-[15px]" aria-hidden />
      )}
      {loading ? "Gerando..." : label}
    </Button>
  );
}

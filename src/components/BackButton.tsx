import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  /** Rota de destino. Quando ausente, volta para a página anterior. */
  to?: string;
  /** Handler personalizado (ex.: fechar formulário inline). */
  onClick?: () => void;
  className?: string;
}

/**
 * Botão "Voltar" padrão da Aurit — ghost glass discreto, sempre acima do título.
 */
export function BackButton({ to, onClick, className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) return onClick();
    if (to) return navigate(to);
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Voltar"
      className={cn(
        "mb-4 inline-flex items-center gap-1.5 rounded-[10px] px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Voltar
    </button>
  );
}

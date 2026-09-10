import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indicação discreta de que a seção é consolidada pelo sistema.
 * Usada apenas no cabeçalho das seções automáticas, nunca em cada item.
 */
export function DadosAutomaticosHint({
  text = "Dados consolidados automaticamente a partir dos cadastros do sistema.",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11.5px] leading-tight text-muted-foreground",
        className,
      )}
    >
      <Sparkles
        className="h-3 w-3 shrink-0 text-primary"
        strokeWidth={2.2}
        aria-hidden
      />
      {text}
    </p>
  );
}

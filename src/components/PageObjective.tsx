import { FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageObjectiveProps {
  /** Rótulo em destaque, exibido antes da descrição. */
  label?: string;
  /** Texto descritivo do bloco. */
  description: string;
  icon?: LucideIcon;
  className?: string;
  /** Largura máxima do texto (evita linhas longas em telas grandes). */
  maxWidth?: string;
  /** Variante visual: glass (padrão), primary (glass com tom da marca) ou plain. */
  variant?: "glass" | "primary" | "plain";
}

/**
 * Bloco compacto "Objetivo da página" — acabamento liquid glass sutil,
 * altura automática (o texto nunca é cortado) e tom institucional.
 */
export function PageObjective({
  label = "Objetivo da página:",
  description,
  icon: Icon = FileText,
  className,
  maxWidth = "92ch",
  variant = "glass",
}: PageObjectiveProps) {
  return (
    <section
      aria-label={label.replace(/:$/, "")}
      className={cn(
        "flex w-full items-start gap-3 overflow-visible rounded-[15px] border px-4 py-3 sm:gap-3.5 sm:px-5",
        variant === "glass" &&
          "border-border/60 bg-card/70 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60",
        variant === "primary" &&
          "border-primary/20 bg-primary-soft/80 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.07),inset_0_1px_0_0_hsl(0_0%_100%_/_0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-primary-soft/65",
        variant === "plain" && "border-border/60 bg-muted/30",
        className,
      )}
    >
      <span
        className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border border-primary/20 bg-primary/10 text-primary supports-[backdrop-filter]:bg-primary/[0.09]"
        aria-hidden
      >
        <Icon className="h-3 w-3" strokeWidth={2.1} />
      </span>
      <p
        className="min-w-0 flex-1 whitespace-normal break-words text-[12px] leading-[1.45] text-muted-foreground [overflow-wrap:anywhere] sm:text-[12.5px] lg:text-[13px]"
        style={{ maxWidth }}
      >
        <span className="font-semibold text-foreground text-[12.5px] sm:text-[13px] lg:text-[13.5px]">
          {label}{" "}
        </span>
        {description}
      </p>
    </section>
  );
}

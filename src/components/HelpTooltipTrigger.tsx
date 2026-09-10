import { forwardRef } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HelpTooltipTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Rótulo acessível do botão de ajuda. */
  label?: string;
  /** Renderiza apenas o visual (sem interação), para uso em legendas. */
  decorative?: boolean;
}

/**
 * Gatilho circular padronizado de ajuda — acabamento "liquid glass" sutil,
 * círculo visível de 19px dentro de uma área de toque de 30px.
 */
export const HelpTooltipTrigger = forwardRef<
  HTMLButtonElement,
  HelpTooltipTriggerProps
>(
  (
    { className, label = "Abrir ajuda sobre este campo", decorative, ...props },
    ref,
  ) => {
    const circle = (
      <span
        className={cn(
          "flex h-[19px] w-[19px] items-center justify-center rounded-full",
          "border border-primary/25 bg-primary/10 text-primary shadow-[0_1px_2px_hsl(215_28%_17%_/_0.10)]",
          "backdrop-blur-[2px] supports-[backdrop-filter]:bg-primary/[0.08]",
          "transition-colors duration-150 motion-reduce:transition-none",
          !decorative &&
            "group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground group-active:scale-95",
        )}
      >
        <HelpCircle
          className="h-[11px] w-[11px]"
          strokeWidth={2.6}
          aria-hidden
        />
      </span>
    );

    if (decorative) {
      return (
        <span
          className={cn(
            "inline-flex h-[19px] w-[19px] items-center justify-center",
            className,
          )}
          aria-hidden
        >
          {circle}
        </span>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "group -m-[5.5px] inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      >
        {circle}
      </button>
    );
  },
);
HelpTooltipTrigger.displayName = "HelpTooltipTrigger";

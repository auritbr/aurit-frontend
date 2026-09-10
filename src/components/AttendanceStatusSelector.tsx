import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttendanceStatusOption<T extends string = string> {
  value: T;
  label: string;
}

export interface AttendanceStatusSelectorProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly AttendanceStatusOption<T>[];
  /** Nome usado para acessibilidade (ex.: nome do participante). */
  ariaLabel: string;
  className?: string;
}

/**
 * Barra segmentada (single-select) para escolher a situação da presença.
 * Não substitui o StatusPill — apenas o controle de seleção.
 */
export function AttendanceStatusSelector<T extends string = string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: AttendanceStatusSelectorProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full flex-wrap items-center gap-1 rounded-[14px] border border-border/60 bg-background/65 p-1 shadow-[0_1px_3px_-2px_hsl(215_28%_17%_/_0.12),inset_0_1px_0_0_hsl(0_0%_100%_/_0.4)] backdrop-blur-md supports-[backdrop-filter]:bg-background/50",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-8 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none",
              selected
                ? "border border-primary/30 bg-primary/10 text-primary shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.5)]"
                : "border border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { JourneyModuleState } from "@/data/journey";

const barColor: Record<JourneyModuleState, string> = {
  CONCLUIDO: "bg-[hsl(var(--status-active-fg))]",
  EM_ANDAMENTO: "bg-[hsl(var(--status-done-fg))]",
  COM_PENDENCIAS: "bg-[hsl(var(--status-pending-fg))]",
  PRECISA_ATENCAO: "bg-[hsl(var(--destructive))]",
  NAO_INICIADO: "bg-muted-foreground/40",
};

export interface ModuleProgressBarProps {
  value: number;
  state: JourneyModuleState;
  label: string;
  className?: string;
}

/** Barra de progresso leve com acabamento glass sutil. */
export function ModuleProgressBar({
  value,
  state,
  label,
  className,
}: ModuleProgressBarProps) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full border border-border/50 bg-background/70 shadow-[inset_0_1px_1px_hsl(var(--foreground)/0.06)]",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          barColor[state],
        )}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

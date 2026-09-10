import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  journeyStateBadge,
  journeyStateLabel,
} from "@/components/journey/journeyStatus";
import type { JourneyModuleState } from "@/data/journey";

export interface JourneyModuleCardProps {
  step: string;
  icon: LucideIcon;
  title: string;
  shortDescription: string;
  percentage: number;
  status: JourneyModuleState;
  onOpen: () => void;
}

/** Card fechado de um módulo da jornada. O card inteiro abre o modal de detalhes. */
export function JourneyModuleCard({
  step,
  icon: Icon,
  title,
  shortDescription,
  percentage,
  status,
  onOpen,
}: JourneyModuleCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Abrir módulo ${title} — etapa ${step}, ${percentage}% preenchido, ${
        journeyStateLabel[status]
      }.`}
      className={cn(
        "journey-glass group flex h-full w-full cursor-pointer flex-col gap-2 rounded-[20px] p-5 text-left transition-all duration-200",
        "hover:-translate-y-[1px] hover:border-border hover:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.7),0_12px_26px_-20px_hsl(var(--foreground)/0.26)]",
        "active:translate-y-0 active:shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.08)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-[11px] border border-border/70 bg-primary-soft text-primary"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground tabular-nums">
            {step}
          </span>
        </span>
      </span>

      <span className="text-[15px] font-semibold leading-tight text-foreground">
        {title}
      </span>

      <span className="line-clamp-2 text-[13px] leading-[1.45] text-muted-foreground">
        {shortDescription}
      </span>

      <span className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-foreground tabular-nums">
            {percentage}%
          </span>
          <span
            className={cn(
              "truncate rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold",
              journeyStateBadge[status],
            )}
          >
            {journeyStateLabel[status]}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

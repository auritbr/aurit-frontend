import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDashed,
  Clock,
  MinusCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { JourneyItem, JourneyItemState } from "@/data/journey";

const config: Record<
  JourneyItemState,
  { label: string; icon: LucideIcon; className: string }
> = {
  CONCLUIDO: {
    label: "Concluído",
    icon: Check,
    className:
      "text-[hsl(var(--status-active-fg))] bg-[hsl(var(--status-active-bg))]",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    icon: Clock,
    className:
      "text-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-bg))]",
  },
  PENDENCIA: {
    label: "Com pendência",
    icon: AlertTriangle,
    className:
      "text-[hsl(var(--status-pending-fg))] bg-[hsl(var(--status-pending-bg))]",
  },
  REVISAO: {
    label: "Precisa de revisão",
    icon: RefreshCw,
    className:
      "text-[hsl(var(--status-review-fg))] bg-[hsl(var(--status-review-bg))]",
  },
  NAO_INICIADO: {
    label: "Não iniciado",
    icon: CircleDashed,
    className: "text-muted-foreground bg-muted/60",
  },
  NAO_SE_APLICA: {
    label: "Não se aplica",
    icon: MinusCircle,
    className: "text-muted-foreground bg-muted/50",
  },
};

export interface JourneyPageLinkProps {
  item: JourneyItem;
  /** Número da etapa dentro do módulo (01, 02, ...). */
  step: string;
  onNavigate: (route: string) => void;
}

/** Linha compacta e clicável de uma página interna do módulo. */
export function JourneyPageLink({
  item,
  step,
  onNavigate,
}: JourneyPageLinkProps) {
  const cfg = config[item.state];
  const Icon = cfg.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(item.route)}
        aria-label={`Etapa ${step} — ${item.label}, ${cfg.label}. Abrir página.`}
        className="journey-item-glass group flex w-full items-center gap-2 rounded-[12px] px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <span className="w-[17px] flex-shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums">
          {step}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full",
            cfg.className,
          )}
        >
          <Icon className="h-[11px] w-[11px]" strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-foreground">
            {item.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground">
            {cfg.label}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </li>
  );
}

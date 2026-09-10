import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldTooltip } from "@/components/FieldTooltip";

export type SummaryStatVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface SummaryStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: SummaryStatVariant;
  /** Explicação opcional do indicador. */
  tooltip?: string;
  className?: string;
}

const variantStyles: Record<
  SummaryStatVariant,
  { card: string; badge: string }
> = {
  neutral: {
    card: "border-border/70 bg-card/75 supports-[backdrop-filter]:bg-card/60",
    badge: "border-primary/20 bg-primary/10 text-primary",
  },
  info: {
    card: "border-sky-200/70 bg-sky-50/60 supports-[backdrop-filter]:bg-sky-50/45",
    badge: "border-sky-300/50 bg-sky-100/70 text-sky-700",
  },
  success: {
    card: "border-emerald-200/70 bg-emerald-50/60 supports-[backdrop-filter]:bg-emerald-50/45",
    badge: "border-emerald-300/50 bg-emerald-100/70 text-emerald-700",
  },
  warning: {
    card: "border-amber-200/70 bg-amber-50/60 supports-[backdrop-filter]:bg-amber-50/45",
    badge: "border-amber-300/50 bg-amber-100/70 text-amber-700",
  },
  danger: {
    card: "border-rose-200/70 bg-rose-50/60 supports-[backdrop-filter]:bg-rose-50/45 dark:border-rose-900/60 dark:bg-rose-950/25",
    badge:
      "border-rose-300/50 bg-rose-100/70 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

/**
 * Card de resumo compacto com acabamento liquid glass leve.
 * Reutilizável em listagens — mesma estrutura para todos os indicadores.
 */
export function SummaryStatCard({
  title,
  value,
  icon: Icon,
  variant = "neutral",
  tooltip,
  className,
}: SummaryStatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[16px] border px-4 py-3 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md",
        styles.card,
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border",
          styles.badge,
        )}
        aria-hidden
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-2 text-[12.5px] font-medium leading-tight text-muted-foreground [overflow-wrap:anywhere]">
            {title}
          </p>
          {tooltip && (
            <FieldTooltip text={tooltip} fieldLabel={title} side="top" />
          )}
        </div>
        <p className="mt-1 whitespace-nowrap text-[19px] font-semibold leading-tight tabular-nums text-foreground sm:text-[21px]">
          {value}
        </p>
      </div>
    </div>
  );
}

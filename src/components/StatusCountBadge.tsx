import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusCountBadgeProps {
  count: number;
  /** "expired" destaca pendência crítica; "neutral" informa; "success" indica regularidade. */
  variant?: "expired" | "neutral" | "success";
  /** Texto opcional após o número (ex.: "vencidos"). */
  label?: string;
  showIcon?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Badge compacto e reutilizável para contagens de status (ex.: documentos vencidos).
 * Acabamento liquid glass discreto, coerente com o StatusPill "Vencido".
 * Não define font-size — herda o tamanho do contexto onde é usado.
 */
export function StatusCountBadge({
  count,
  variant = "expired",
  label,
  showIcon = true,
  interactive = false,
  onClick,
  className,
  "aria-label": ariaLabel,
}: StatusCountBadgeProps) {
  const content = (
    <>
      {showIcon && (
        <AlertTriangle
          aria-hidden="true"
          className="h-3.5 w-3.5 flex-shrink-0"
        />
      )}
      <span>
        {count}
        {label ? ` ${label}` : ""}
      </span>
    </>
  );

  const classes = cn(
    "status-count-badge",
    variant === "neutral" && "status-count-badge-neutral",
    variant === "success" && "status-count-badge-success",
    interactive && "status-count-badge-interactive",
    className,
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={classes}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} aria-label={ariaLabel}>
      {content}
    </span>
  );
}

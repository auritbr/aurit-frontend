import { type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: "danger";
}

export function TableActionIcon({
  icon: Icon,
  label,
  to,
  onClick,
  variant,
}: Props) {
  const navigate = useNavigate();

  const className = `h-6 w-6 rounded inline-flex items-center justify-center transition-colors ${
    variant === "danger"
      ? "text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
      : "text-muted-foreground/70 hover:text-primary hover:bg-muted"
  }`;

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!to) return;

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        {to ? (
          <a
            href={to}
            onClick={handleLinkClick}
            aria-label={label}
            title={label}
            className={className}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        ) : (
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={className}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </TooltipTrigger>

      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
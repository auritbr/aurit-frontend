import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: "danger";
}

export function TableActionIcon({ icon: Icon, label, onClick, variant }: Props) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={`h-6 w-6 rounded inline-flex items-center justify-center transition-colors ${
            variant === "danger"
              ? "text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground/70 hover:text-primary hover:bg-muted"
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

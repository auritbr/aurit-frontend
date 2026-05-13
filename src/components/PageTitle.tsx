import { HelpTooltip } from "@/components/HelpTooltip";

interface PageTitleProps {
  title: string;
  tooltip: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageTitle({ title, tooltip, description, actions }: PageTitleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <HelpTooltip text={tooltip} label={title} size="md" side="bottom" align="start" />
        </div>
        {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

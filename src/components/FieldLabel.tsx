import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/HelpTooltip";

interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
}

export function FieldLabel({ htmlFor, children, tooltip, required }: FieldLabelProps) {
  const label = typeof children === "string" ? children : "este campo";
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
        {required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
      </Label>
      {tooltip && <HelpTooltip text={tooltip} label={label} />}
    </div>
  );
}

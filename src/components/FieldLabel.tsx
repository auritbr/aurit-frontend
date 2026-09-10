import { Label } from "@/components/ui/label";
import { FieldTooltip } from "@/components/FieldTooltip";

interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
}

export function FieldLabel({
  htmlFor,
  children,
  tooltip,
  required,
}: FieldLabelProps) {
  const label = typeof children === "string" ? children : "este campo";
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-snug text-foreground"
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {tooltip && <FieldTooltip text={tooltip} fieldLabel={label} />}
    </div>
  );
}

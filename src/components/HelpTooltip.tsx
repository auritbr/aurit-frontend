import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Renders the tooltip body. Splits "Ex.:" examples to a separate
 * styled line so they're easier to read.
 */
function TooltipBody({ text }: { text: string }) {
  const match = text.match(/^(.*?)(Ex\.\s*:\s*.+)$/s);
  if (!match) {
    return <p className="text-foreground">{text}</p>;
  }
  const [, main, example] = match;
  return (
    <div className="space-y-1.5">
      <p className="text-foreground">{main.trim()}</p>
      <p className="text-[12px] font-medium text-primary bg-primary-soft border border-primary/15 rounded px-2 py-1 inline-block">
        {example.trim()}
      </p>
    </div>
  );
}

/**
 * Standardized help tooltip — a small "?" badge with a hover/tap
 * card explaining the adjacent element. Used across page titles,
 * section headers and form field labels for visual consistency.
 */
export function HelpTooltip({
  text,
  label = "este item",
  size = "sm",
  side = "top",
  align = "start",
  className,
}: HelpTooltipProps) {
  const dim = size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]";
  const icon = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Ajuda sobre ${label}`}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-primary-soft text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            dim,
            className,
          )}
        >
          <HelpCircle className={icon} strokeWidth={2.4} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        <TooltipBody text={text} />
      </TooltipContent>
    </Tooltip>
  );
}

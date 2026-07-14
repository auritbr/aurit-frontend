import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  getOptionLabel?: (option: string) => string;
  selectAllLabel?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "",
  id,
  getOptionLabel,
  selectAllLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const resolveLabel = (option: string) =>
    getOptionLabel ? getOptionLabel(option) : option;

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const remove = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  };

  const allSelected = options.length > 0 && options.every((option) => value.includes(option));

  const toggleAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "w-full min-h-10 px-3 py-1.5 rounded-md border border-input bg-background text-sm",
            "flex items-center justify-between gap-2 hover:border-primary/40 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 text-left">
            {value.length === 0 ? (
              <span className="text-muted-foreground py-1">{placeholder}</span>
            ) : allSelected && selectAllLabel ? (
              <Badge variant="secondary" className="bg-primary-soft text-primary hover:bg-primary-soft">
                {selectAllLabel}
              </Badge>
            ) : (
              value.map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="bg-primary-soft text-primary hover:bg-primary-soft gap-1 pr-1"
                >
                  {resolveLabel(v)}
                  <button
                    type="button"
                    onClick={(e) => remove(v, e)}
                    className="hover:bg-primary/10 rounded-full p-0.5"
                    aria-label={`Remover ${resolveLabel(v)}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {selectAllLabel && (
            <button
              type="button"
              onClick={toggleAll}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted text-left transition-colors"
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                  allSelected ? "bg-primary border-primary" : "border-input"
                )}
              >
                {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span>{selectAllLabel}</span>
            </button>
          )}
          {options.map((opt) => {
            const selected = value.includes(opt);

            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted text-left transition-colors"
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    selected ? "bg-primary border-primary" : "border-input"
                  )}
                >
                  {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>

                <span>{resolveLabel(opt)}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterMultiSelectProps {
  id?: string;
  options: readonly FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Label used in the summary, e.g. "áreas selecionadas" */
  summaryNoun?: string;
  summaryThreshold?: number;
  selectAllLabel?: string;
}

export function FilterMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Selecione",
  searchable = false,
  searchPlaceholder = "Pesquisar...",
  summaryNoun = "itens selecionados",
  summaryThreshold = 2,
  selectAllLabel,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, query]);

  const toggle = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const allSelected =
    options.length > 0 &&
    options.every((option) => value.includes(option.value));

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((option) => option.value));
  };

  const summary = useMemo(() => {
    if (value.length === 0) return null;
    if (value.length > summaryThreshold)
      return `${value.length} ${summaryNoun}`;
    return value
      .map((v) => options.find((option) => option.value === v)?.label || v)
      .join(", ");
  }, [value, options, summaryNoun, summaryThreshold]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 text-left text-sm backdrop-blur-sm transition-colors",
            "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <span className={cn("truncate", !summary && "text-muted-foreground")}>
            {summary ?? placeholder}
          </span>
          <ChevronDown
            className="h-4 w-4 flex-shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1"
        align="start"
      >
        {searchable && (
          <div className="relative p-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 rounded-[8px] pl-8 text-[13px]"
            />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto">
          {selectAllLabel && options.length > 0 && (
            <button
              type="button"
              role="checkbox"
              aria-checked={allSelected}
              onClick={toggleAll}
              className="flex w-full items-center gap-2 rounded-md border-b border-border/60 px-2 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span
                className={cn(
                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                  allSelected ? "border-primary bg-primary" : "border-input",
                )}
                aria-hidden
              >
                {allSelected && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </span>
              <span className="truncate">{selectAllLabel}</span>
            </button>
          )}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              Nenhuma opção encontrada.
            </p>
          )}
          {filtered.map((option) => {
            const selected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                    selected ? "border-primary bg-primary" : "border-input",
                  )}
                  aria-hidden
                >
                  {selected && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

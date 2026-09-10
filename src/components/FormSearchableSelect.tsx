import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FormSearchableSelectOption {
  value: string;
  label: string;
}

interface FormSearchableSelectProps {
  id?: string;
  options: readonly FormSearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Seletor único pesquisável no padrão liquid glass dos formulários. */
export function FormSearchableSelect({
  id,
  options,
  value = "",
  onChange,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  className,
}: FormSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = normalize(query);
    return term
      ? options.filter((option) => normalize(option.label).includes(term))
      : options;
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 py-2 text-left text-sm backdrop-blur-sm transition-colors",
            "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted/30 disabled:opacity-100",
            className,
          )}
        >
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {selected?.label ?? (disabled ? "—" : placeholder)}
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1"
        align="start"
      >
        <div className="relative p-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && event.preventDefault()
            }
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 rounded-[8px] pl-8 text-[13px]"
          />
        </div>
        <div className="max-h-60 overflow-y-auto" role="listbox">
          {!filtered.length && (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  option.value === value ? "text-primary" : "invisible",
                )}
                aria-hidden
              />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

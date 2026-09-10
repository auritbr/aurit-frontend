import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FormMultiSelectOption {
  value: string;
  label: string;
}

interface FormMultiSelectProps {
  id?: string;
  options: readonly FormMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Accessible description of the multiple-selection behaviour */
  ariaDescription?: string;
}

/**
 * Campo de seleção múltipla para formulários (padrão liquid glass da Aurit).
 * Exibe chips compactos, permite remover item a item, limpar tudo, pesquisar e navegar por teclado.
 */
export function FormMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Selecione uma ou mais opções",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  ariaDescription = "Campo de seleção múltipla. Use Enter ou Espaço para marcar e desmarcar opções.",
}: FormMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const descriptionId = useRef(`${id ?? "multi"}-description`).current;

  const labelOf = (v: string) =>
    options.find((option) => option.value === v)?.label || v;

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

  const remove = (optionValue: string) =>
    onChange(value.filter((v) => v !== optionValue));

  if (disabled) {
    return (
      <div
        id={id}
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-sm backdrop-blur-sm"
        aria-readonly
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[12px] text-foreground"
            >
              {labelOf(v)}
            </span>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-describedby={descriptionId}
            className={cn(
              "flex min-h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 py-1.5 text-left text-sm backdrop-blur-sm transition-colors",
              "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <span className="flex flex-1 flex-wrap items-center gap-1.5">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                value.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[12px] text-foreground"
                  >
                    {labelOf(v)}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remover ${labelOf(v)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          remove(v);
                        }
                      }}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </span>
                  </span>
                ))
              )}
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
          <div
            className="max-h-60 overflow-y-auto"
            role="listbox"
            aria-multiselectable
          >
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                {emptyMessage}
              </p>
            )}
            {filtered.map((option) => {
              const selected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
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
          {value.length > 0 && (
            <div className="border-t border-border/60 p-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-md px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Limpar todas as opções
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <p id={descriptionId} className="sr-only">
        {ariaDescription} {value.length} opção(ões) selecionada(s)
        {value.length > 0 ? `: ${value.map(labelOf).join(", ")}` : ""}.
      </p>
    </div>
  );
}

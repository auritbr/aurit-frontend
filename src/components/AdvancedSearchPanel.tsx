import { useId, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedSearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount?: number;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdvancedSearchPanel({
  open,
  onOpenChange,
  activeCount = 0,
  title = "Pesquisa avançada",
  children,
  className,
}: AdvancedSearchPanelProps) {
  const contentId = useId();

  return (
    <section
      className={cn(
        "rounded-[14px] border border-border/70 bg-card/75 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60",
        className,
      )}
    >
      <h2>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={contentId}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[14px] px-4 py-2.5 text-left transition-colors",
            "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <SlidersHorizontal
            className="h-3.5 w-3.5 flex-shrink-0 text-primary"
            strokeWidth={2.2}
          />
          <span className="text-[13px] font-medium text-foreground">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
              {activeCount}{" "}
              {activeCount === 1 ? "filtro ativo" : "filtros ativos"}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">
              {open ? "Recolher" : "Expandir"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>
      </h2>

      <div
        id={contentId}
        hidden={!open}
        className="animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
      >
        <div className="border-t border-border/60 px-4 py-4">{children}</div>
      </div>
    </section>
  );
}

export function SearchFilterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

export function useSessionBoolean(key: string, initial = false) {
  const [value, setValue] = useState<boolean>(initial);

  const update = (next: boolean) => {
    setValue(next);
  };

  void key;

  return [value, update] as const;
}

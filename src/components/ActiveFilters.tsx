import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilterItem {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterChip({
  label,
  value,
  onRemove,
}: Omit<ActiveFilterItem, "id">) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 py-1 pl-2.5 pr-1 text-[12px] text-foreground backdrop-blur-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}: ${value}`}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}

export function ActiveFilters({
  items,
  onClearAll,
  className,
}: {
  items: ActiveFilterItem[];
  onClearAll: () => void;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-[12px] font-medium text-muted-foreground">
        Filtros ativos:
      </span>
      {items.map((item) => (
        <FilterChip
          key={item.id}
          label={item.label}
          value={item.value}
          onRemove={item.onRemove}
        />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-full px-2 py-1 text-[12px] font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        Limpar todos
      </button>
    </div>
  );
}

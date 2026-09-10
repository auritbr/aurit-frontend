import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface SortableThProps<K extends string = string> {
  sortKey: K;
  activeKey: K;
  dir: SortDir;
  onSort: (key: K) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho de coluna ordenável — mesmo indicador visual e comportamento
 * aprovados na página "Dados Institucionais".
 */
export function SortableTh<K extends string = string>({
  sortKey,
  activeKey,
  dir,
  onSort,
  children,
  className,
}: SortableThProps<K>) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      className={cn(
        "whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        active && "bg-muted/40 text-foreground",
        className,
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title="Ordenar por esta coluna"
        className="inline-flex items-center gap-1.5 rounded-[6px] uppercase tracking-wider transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {children}
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            active
              ? "text-foreground opacity-90"
              : "text-muted-foreground/60 opacity-70",
          )}
          aria-hidden
        />
      </button>
    </th>
  );
}

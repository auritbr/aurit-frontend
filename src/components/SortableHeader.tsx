import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortConfig } from "@/hooks/useSortableData";

interface SortableHeaderProps<K extends string> {
    label: string;
    sortKey: K;
    sortConfig: SortConfig<K> | null;
    onSort: (key: K) => void;
    className?: string;
    align?: "left" | "right";
}

export function SortableHeader<K extends string>({
    label,
    sortKey,
    sortConfig,
    onSort,
    className,
    align = "left",
}: SortableHeaderProps<K>) {
    const active = sortConfig?.key === sortKey;
    const direction = sortConfig?.direction;

    const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

    const defaultClassName =
        "whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

    return (
        <th
            className={className ?? defaultClassName}
            aria-sort={
                active ? (direction === "asc" ? "ascending" : "descending") : "none"
            }
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 uppercase tracking-wider transition-colors hover:bg-muted hover:text-foreground ${align === "right" ? "ml-auto text-right" : "-ml-2 text-left"
                    }`}
                aria-label={`Ordenar por ${label}`}
            >
                <span>{label}</span>

                <Icon
                    className={
                        active
                            ? "h-3.5 w-3.5 text-foreground"
                            : "h-3.5 w-3.5 text-muted-foreground/70"
                    }
                />
            </button>
        </th>
    );
}

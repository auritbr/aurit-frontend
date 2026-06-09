import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig<K extends string = string> {
    key: K;
    direction: SortDirection;
}

type SortableValue = string | number | boolean | Date | null | undefined;

function normalizeSortableValue(value: SortableValue): string | number {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    return String(value ?? "").trim();
}

function compareSortableValues(a: SortableValue, b: SortableValue) {
    const valueA = normalizeSortableValue(a);
    const valueB = normalizeSortableValue(b);

    if (typeof valueA === "number" && typeof valueB === "number") {
        return valueA - valueB;
    }

    return String(valueA).localeCompare(String(valueB), "pt-BR", {
        numeric: true,
        sensitivity: "base",
    });
}

export function useSortableData<T, K extends string>(
    items: T[],
    getValue: (item: T, key: K) => SortableValue,
) {
    const [sortConfig, setSortConfig] = useState<SortConfig<K> | null>(null);

    const sortedItems = useMemo(() => {
        if (!sortConfig) return items;

        const direction = sortConfig.direction === "asc" ? 1 : -1;

        return [...items].sort(
            (a, b) =>
                compareSortableValues(
                    getValue(a, sortConfig.key),
                    getValue(b, sortConfig.key),
                ) * direction,
        );
    }, [items, getValue, sortConfig]);

    const handleSort = useCallback((key: K) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            }

            return {
                key,
                direction: "asc",
            };
        });
    }, []);

    return {
        sortConfig,
        sortedItems,
        handleSort,
    };
}
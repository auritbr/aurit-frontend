import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import { formatValorRelatorio } from "@/data/relatorios";
import {
  cleanReportColumnFilters,
  invalidReportColumnFilter,
  matchesReportColumnFilters,
  type ReportColumnFilter,
  type ReportColumnFilters,
  type ReportFilterColumn,
} from "@/lib/reportColumnFilters";

export function useReportColumnFilters(
  scope: string,
  columns: ReportFilterColumn[],
  rows: Record<string, unknown>[],
) {
  const [state, setState] = useState<{
    scope: string;
    draft: ReportColumnFilters;
    applied: ReportColumnFilters;
  }>({ scope, draft: {}, applied: {} });
  const draft =
    state.scope === scope
      ? Object.fromEntries(
          Object.entries(state.draft).filter(([key]) =>
            columns.some((column) => column.chave === key),
          ),
        )
      : {};
  const applied = useMemo(
    () =>
      state.scope === scope
        ? Object.fromEntries(
            Object.entries(state.applied).filter(([key]) =>
              columns.some((column) => column.chave === key),
            ),
          )
        : {},
    [state.scope, state.applied, scope, columns],
  );
  const setField = (key: string, value: ReportColumnFilter) =>
    setState((current) => ({
      scope,
      applied: current.scope === scope ? current.applied : {},
      draft: {
        ...(current.scope === scope ? current.draft : {}),
        [key]: value,
      },
    }));
  const apply = () => {
    const invalid = Object.entries(draft).find(([, filter]) =>
      invalidReportColumnFilter(filter),
    );
    if (invalid) {
      toast.error(
        `Revise o intervalo de ${columns.find((column) => column.chave === invalid[0])?.label ?? invalid[0]}. O início não pode ser maior que o fim.`,
      );
      return;
    }
    setState({ scope, draft, applied: cleanReportColumnFilters(draft) });
  };
  const clear = () => setState({ scope, draft: {}, applied: {} });
  const filterLabels = Object.entries(applied).map(([key, filter]) => ({
    label: columns.find((column) => column.chave === key)?.label ?? key,
    value: filter.values?.length
      ? filter.values
          .map((value) => {
            const column = columns.find((column) => column.chave === key);
            if (column?.optionLabelKey)
              return String(
                rows.find((row) => String(row[key]) === value)?.[
                  column.optionLabelKey
                ] ?? value,
              );
            return formatValorRelatorio(
              value === "true" ? true : value === "false" ? false : value,
              key,
            );
          })
          .join(", ")
      : filter.text ||
        [
          filter.from ? `De ${formatValorRelatorio(filter.from, key)}` : "",
          filter.to ? `Até ${formatValorRelatorio(filter.to, key)}` : "",
          filter.min ? `Mínimo ${filter.min}` : "",
          filter.max ? `Máximo ${filter.max}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
  }));
  const activeFilters: ActiveFilterItem[] = Object.keys(applied).map(
    (key, index) => ({
      id: key,
      label: filterLabels[index].label,
      value: filterLabels[index].value,
      onRemove: () => {
        const next = { ...applied };
        delete next[key];
        setState({ scope, draft: next, applied: next });
      },
    }),
  );
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesReportColumnFilters(row, applied)),
    [rows, applied],
  );
  return {
    draft,
    applied,
    setField,
    apply,
    clear,
    filterLabels,
    activeFilters,
    filteredRows,
  };
}

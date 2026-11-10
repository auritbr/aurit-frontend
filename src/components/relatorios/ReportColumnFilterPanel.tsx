import { ReportFilterMultiSelect as FilterMultiSelect } from "@/components/relatorios/ReportSelectFields";
import { useId } from "react";
import { FieldLabel } from "@/components/FieldLabel";

import { Input } from "@/components/ui/input";
import { ReportFilterPanel, filterFieldClass } from "./ReportKit";
import { formatValorRelatorio } from "@/data/relatorios";
import {
  reportColumnFilterType,
  reportFilterValues,
  type ReportFilterColumn,
} from "@/lib/reportColumnFilters";
import type { useReportColumnFilters } from "@/hooks/useReportColumnFilters";

export function ReportColumnFilterPanel({
  scope,
  columns,
  rows,
  filters,
  loading = false,
}: {
  scope: string;
  columns: ReportFilterColumn[];
  rows: Record<string, unknown>[];
  filters: ReturnType<typeof useReportColumnFilters>;
  loading?: boolean;
}) {
  const prefix = useId();
  return (
    <ReportFilterPanel
      storageKey={`cadastro-${scope}`}
      activeFilters={filters.activeFilters}
      loading={loading}
      onSubmit={filters.apply}
      onClear={filters.clear}
    >
      {columns.map((column) => {
        const type = reportColumnFilterType(column);
        const value = filters.draft[column.chave] ?? {};
        const id = `${prefix}-${column.chave}`;
        if (type === "date" || type === "number")
          return (
            <div key={column.chave}>
              <p className="mb-1.5 text-sm font-medium">{column.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  type === "date" ? "from" : "min",
                  type === "date" ? "to" : "max",
                ].map((field, index) => (
                  <div key={field}>
                    <FieldLabel htmlFor={`${id}-${field}`}>
                      {index === 0
                        ? type === "date"
                          ? "De"
                          : "Mínimo"
                        : type === "date"
                          ? "Até"
                          : "Máximo"}
                    </FieldLabel>
                    <Input
                      id={`${id}-${field}`}
                      aria-label={`${column.label} — ${index === 0 ? (type === "date" ? "De" : "Mínimo") : type === "date" ? "Até" : "Máximo"}`}
                      type={type === "date" ? "date" : "number"}
                      step={type === "number" ? "any" : undefined}
                      value={
                        (value[field as keyof typeof value] as string) ?? ""
                      }
                      onChange={(event) =>
                        filters.setField(column.chave, {
                          ...value,
                          [field]: event.target.value,
                        })
                      }
                      className={filterFieldClass}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        const options =
          type === "multi"
            ? Array.from(
                new Set(
                  rows.flatMap((row) =>
                    reportFilterValues(
                      row[column.chave],
                      column.valueSeparator,
                    ),
                  ),
                ),
              )
                .map((raw) => ({
                  value: raw,
                  label: column.optionLabelKey
                    ? String(
                        rows.find((row) =>
                          reportFilterValues(
                            row[column.chave],
                            column.valueSeparator,
                          ).includes(raw),
                        )?.[column.optionLabelKey] ?? raw,
                      )
                    : formatValorRelatorio(
                        raw === "true" ? true : raw === "false" ? false : raw,
                        column.chave,
                      ),
                }))
                .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
            : [];
        return (
          <div key={column.chave}>
            <FieldLabel htmlFor={id}>{column.label}</FieldLabel>
            {type === "multi" ? (
              <FilterMultiSelect
                id={id}
                options={options}
                value={value.values ?? []}
                onChange={(values) =>
                  filters.setField(column.chave, {
                    ...value,
                    values,
                    ...(column.valueSeparator
                      ? { separator: column.valueSeparator }
                      : {}),
                  })
                }
                placeholder="Todos"
                searchable
                searchPlaceholder={`Pesquisar ${column.label.toLowerCase()}`}
                summaryNoun="opções selecionadas"
              />
            ) : (
              <Input
                id={id}
                type={type === "time" ? "time" : "text"}
                value={value.text ?? ""}
                onChange={(event) =>
                  filters.setField(column.chave, {
                    ...value,
                    text: event.target.value,
                  })
                }
                placeholder={`Pesquisar ${column.label.toLowerCase()}`}
                className={filterFieldClass}
                disabled={loading}
              />
            )}
          </div>
        );
      })}
    </ReportFilterPanel>
  );
}

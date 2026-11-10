import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  contextos,
  emptyEvidenceSearch,
  sortByOptions,
  type EvidenceSearchFilters,
} from "@/lib/evidenceSearch";
import type { ActiveFilterItem } from "@/components/ActiveFilters";

type Row = Record<string, string | number>;
const normalize = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function useEvidenceReportFilters(rows: Row[]) {
  const [draft, setDraft] = useState(emptyEvidenceSearch);
  const [applied, setApplied] = useState(emptyEvidenceSearch);
  const setDraftField = <K extends keyof EvidenceSearchFilters>(
    key: K,
    value: EvidenceSearchFilters[K],
  ) =>
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "projeto"
        ? { atividade: [], turma: [], evento: [] }
        : key === "atividade"
          ? { turma: [] }
          : {}),
    }));
  const options = (key: string, label: string) =>
    Array.from(
      new Map(
        rows
          .filter((row) => row[key] !== "" && row[key] != null)
          .map((row) => [
            String(row[key]),
            { value: String(row[key]), label: String(row[label] ?? row[key]) },
          ]),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const optionGroups = {
    contexto: [...contextos],
    projeto: options("projeto_id", "projeto"),
    atividade: options("atividade_id", "atividade"),
    turma: options("turma_id", "turma"),
    evento: options("evento_id", "evento"),
  };
  const filteredRows = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (!applied.busca ||
              normalize(row.pesquisa).includes(normalize(applied.busca))) &&
            (
              ["contexto", "projeto", "atividade", "turma", "evento"] as const
            ).every(
              (key) =>
                !applied[key].length ||
                applied[key].includes(
                  String(row[key === "contexto" ? key : `${key}_id`]),
                ),
            ) &&
            (!applied.dataInicio ||
              (!!row.data && String(row.data) >= applied.dataInicio)) &&
            (!applied.dataFim ||
              (!!row.data && String(row.data) <= applied.dataFim)),
        )
        .sort((a, b) => {
          const key = applied.sortBy;
          const av =
            key === "imagens" ? Number(a.imagens) : String(a[key] ?? "");
          const bv =
            key === "imagens" ? Number(b.imagens) : String(b[key] ?? "");
          const comparison =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), "pt-BR");
          return comparison * (applied.sortDir === "asc" ? 1 : -1);
        }),
    [rows, applied],
  );
  const activeFilters: ActiveFilterItem[] = [];
  const remove = <K extends keyof EvidenceSearchFilters>(
    key: K,
    value: EvidenceSearchFilters[K],
  ) => {
    setApplied((current) => ({ ...current, [key]: value }));
    setDraft((current) => ({ ...current, [key]: value }));
  };
  if (applied.busca)
    activeFilters.push({
      id: "busca",
      label: "Pesquisa",
      value: applied.busca,
      onRemove: () => remove("busca", ""),
    });
  for (const [key, label] of [
    ["contexto", "Contexto"],
    ["projeto", "Projeto"],
    ["atividade", "Atividade"],
    ["turma", "Turma"],
    ["evento", "Evento cultural"],
  ] as const) {
    if (applied[key].length)
      activeFilters.push({
        id: key,
        label,
        value: applied[key]
          .map(
            (id) =>
              optionGroups[key].find((option) => option.value === id)?.label ??
              id,
          )
          .join(", "),
        onRemove: () => remove(key, []),
      });
  }
  for (const [key, label] of [
    ["dataInicio", "Período — de"],
    ["dataFim", "Período — até"],
  ] as const) {
    if (applied[key])
      activeFilters.push({
        id: key,
        label,
        value: applied[key].split("-").reverse().join("/"),
        onRemove: () => remove(key, ""),
      });
  }
  const apply = () => {
    if (draft.dataInicio && draft.dataFim && draft.dataInicio > draft.dataFim) {
      toast.error("O início do período não pode ser maior que o fim.");
      return;
    }
    setApplied({ ...draft });
  };
  const clear = () => {
    setDraft(emptyEvidenceSearch);
    setApplied(emptyEvidenceSearch);
  };
  const filterLabels = [
    ...activeFilters.map(({ label, value }) => ({ label, value })),
    {
      label: "Ordenar por",
      value:
        sortByOptions.find((option) => option.value === applied.sortBy)
          ?.label ?? "Data",
    },
    {
      label: "Ordem",
      value: applied.sortDir === "asc" ? "Crescente" : "Decrescente",
    },
  ];
  return {
    draft,
    applied,
    setDraftField,
    optionGroups,
    filteredRows,
    activeFilters,
    apply,
    clear,
    filterLabels,
  };
}

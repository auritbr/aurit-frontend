export function sortOptionsByLabel<T extends { label: string }>(
  options: readonly T[],
): T[] {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
  );
}

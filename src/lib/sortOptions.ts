export function sortOptionsByLabel<T extends { label: string }>(
  options: readonly T[],
): T[] {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
  );
}

export function sortOptionsByName<T>(
  options: readonly T[],
  getName: (option: T) => string,
): T[] {
  return [...options].sort((a, b) =>
    getName(a).localeCompare(getName(b), "pt-BR", { sensitivity: "base" }),
  );
}

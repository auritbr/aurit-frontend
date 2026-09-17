type DateLike =
  | string
  | number
  | Array<number | string>
  | {
      year?: number | string | null;
      ano?: number | string | null;
      date?: string | null;
      dataInicio?: string | null;
    }
  | null
  | undefined;

export function extractYear(...values: DateLike[]): string {
  for (const value of values) {
    if (value == null || value === "") continue;

    if (Array.isArray(value)) {
      const year = String(value[0] ?? "");
      if (/^(19|20)\d{2}$/.test(year)) return year;
      continue;
    }

    if (typeof value === "object") {
      const year = extractYear(
        value.year ?? undefined,
        value.ano ?? undefined,
        value.date ?? undefined,
        value.dataInicio ?? undefined,
      );
      if (year) return year;
      continue;
    }

    const text = String(value).trim();
    const match = text.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
    if (match?.[1]) return match[1];
  }

  return "";
}

export function nameWithYear(name: string, ...values: DateLike[]): string {
  const cleanName = name.trim();
  const year = extractYear(...values);

  if (!year || new RegExp(`(?:^|\\D)${year}(?:\\D|$)`).test(cleanName)) {
    return cleanName;
  }

  return `${cleanName} - ${year}`;
}

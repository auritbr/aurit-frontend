export type CopyColumn<T> = {
  label: string;
  accessor: (row: T) => string | number | null | undefined;
};

export function buildTableTSV<T>(columns: CopyColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => c.label).join("\t");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = c.accessor(row);
        if (v === null || v === undefined) return "";
        return String(v).replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
      })
      .join("\t"),
  );
  return [header, ...lines].join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyTableData<T>(
  columns: CopyColumn<T>[],
  rows: T[],
): Promise<boolean> {
  if (!rows || rows.length === 0) return false;
  const text = buildTableTSV(columns, rows);
  return copyToClipboard(text);
}
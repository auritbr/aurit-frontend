import { copyToClipboard } from "./copyTableData";

/**
 * Extracts visible table data from a DOM <table> element.
 * Skips columns with data-no-copy attribute (use on Ações / action columns).
 * Returns TSV string (tabs + newlines) suitable for spreadsheets.
 */
export function extractTableTSV(table: HTMLTableElement | null): string {
  if (!table) return "";

  const headRow = table.querySelector("thead tr");
  if (!headRow) return "";

  const headerCells = Array.from(headRow.children) as HTMLElement[];
  const skipIndexes = new Set<number>();
  const headers: string[] = [];
  headerCells.forEach((th, idx) => {
    if (th.hasAttribute("data-no-copy")) {
      skipIndexes.add(idx);
      return;
    }
    headers.push((th.textContent || "").trim().replace(/\s+/g, " "));
  });

  const bodyRows = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
  const lines: string[] = [headers.join("\t")];

  bodyRows.forEach((tr) => {
    // Skip empty-state rows (single cell with colspan)
    const cells = Array.from(tr.children) as HTMLElement[];
    if (cells.length === 1 && cells[0].hasAttribute("colspan")) return;
    const values: string[] = [];
    cells.forEach((td, idx) => {
      if (skipIndexes.has(idx)) return;
      const text = (td.textContent || "").trim().replace(/\s+/g, " ");
      values.push(text);
    });
    if (values.some((v) => v.length > 0)) lines.push(values.join("\t"));
  });

  return lines.join("\n");
}

export async function copyTableFromRef(
  table: HTMLTableElement | null,
): Promise<{ ok: boolean; rows: number }> {
  const tsv = extractTableTSV(table);
  const rows = tsv ? tsv.split("\n").length - 1 : 0; // minus header
  if (!tsv || rows <= 0) return { ok: false, rows: 0 };
  const ok = await copyToClipboard(tsv);
  return { ok, rows };
}
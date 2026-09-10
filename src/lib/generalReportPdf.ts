import { apiFetchResponse } from "@/lib/api";

export interface GeneralReportPdfFilter {
  label: string;
  value: string;
}

export interface GeneralReportPdfRequest {
  slug: string;
  columns: string[];
  filters?: Record<string, unknown>;
  filterLabels?: GeneralReportPdfFilter[];
  search?: string;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
}

const safeFilename = (value: string) =>
  [...value.replace(/[\\/:*?"<>|]/g, "-")]
    .map((char) => (char.charCodeAt(0) < 32 ? "-" : char))
    .join("")
    .trim();

const responseFilename = (header: string | null, fallback: string) => {
  const match = header?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return safeFilename((match?.[1] ?? match?.[2] ?? fallback).trim());
};

export async function downloadGeneralReportPdf(
  request: GeneralReportPdfRequest,
) {
  const response = await apiFetchResponse(`/relatorios/${request.slug}/pdf`, {
    method: "POST",
    headers: { Accept: "application/pdf" },
    body: JSON.stringify({
      columns: request.columns,
      filters: request.filters ?? {},
      filterLabels: request.filterLabels ?? [],
      search: request.search || undefined,
      sortKey: request.sortKey || undefined,
      sortDirection: request.sortDirection || undefined,
    }),
  });
  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/pdf"))
    throw new Error("O servidor não retornou um PDF válido.");
  const blob = await response.blob();
  if (!blob.size) throw new Error("O relatório retornado está vazio.");
  const filename = responseFilename(
    response.headers.get("Content-Disposition"),
    `relatorio-${request.slug}.pdf`,
  );
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

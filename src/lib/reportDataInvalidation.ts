export const REPORT_DATA_INVALIDATED_EVENT = "aurit:report-data-invalidated";

export function isDataMutation(method?: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    (method ?? "GET").toUpperCase(),
  );
}

export function invalidateReportData(source?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REPORT_DATA_INVALIDATED_EVENT, {
      detail: { source, timestamp: Date.now() },
    }),
  );
}

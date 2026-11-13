export const REPORT_DATA_INVALIDATED_EVENT = "aurit:report-data-invalidated";

export function isDataMutation(method?: string, path = "") {
  const verb = (method ?? "GET").toUpperCase();
  const pathname = path.split("?", 1)[0];
  if (verb === "POST" && /^\/relatorios\/.+\/pdf\/?$/.test(pathname)) {
    return false;
  }
  return ["POST", "PUT", "PATCH", "DELETE"].includes(verb);
}

export function invalidateReportData(source?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REPORT_DATA_INVALIDATED_EVENT, {
      detail: { source, timestamp: Date.now() },
    }),
  );
}

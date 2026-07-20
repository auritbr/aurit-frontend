import type { ImportPreviewRow } from "@/data/importacoes";

export interface ImportReviewQueue {
  module: string;
  entity: string;
  fileName?: string;
  rows: ImportPreviewRow[];
  currentIndex: number;
  createRoute?: string;
  resumeAfterSave?: boolean;
}

const key = (module: string) => `aurit:import-review:${module}`;
const KEY_PREFIX = "aurit:import-review:";

export function hasActiveImportReviewQueue() {
  return Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
    .some((item) => item?.startsWith(KEY_PREFIX));
}

export function getImportReviewQueue(module: string): ImportReviewQueue | null {
  try {
    const value = sessionStorage.getItem(key(module));
    return value ? JSON.parse(value) as ImportReviewQueue : null;
  } catch {
    return null;
  }
}

export function saveImportReviewQueue(queue: ImportReviewQueue) {
  sessionStorage.setItem(key(queue.module), JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("aurit:import-review-change", { detail: queue }));
}

export function clearImportReviewQueue(module: string) {
  sessionStorage.removeItem(key(module));
  window.dispatchEvent(new CustomEvent("aurit:import-review-change", { detail: { module } }));
}

export function advanceImportReviewQueue(module: string) {
  const queue = getImportReviewQueue(module);
  if (!queue) return null;
  if (queue.currentIndex >= queue.rows.length - 1) {
    clearImportReviewQueue(module);
    return null;
  }
  const next = { ...queue, currentIndex: queue.currentIndex + 1, resumeAfterSave: true };
  saveImportReviewQueue(next);
  return next;
}

export function removeCurrentImportReviewItem(module: string) {
  const queue = getImportReviewQueue(module);
  if (!queue) return null;
  const rows = queue.rows.filter((_, index) => index !== queue.currentIndex);
  if (!rows.length) {
    clearImportReviewQueue(module);
    return null;
  }
  const next = { ...queue, rows, currentIndex: Math.min(queue.currentIndex, rows.length - 1) };
  saveImportReviewQueue(next);
  return next;
}

export function notifyImportReviewSaveSuccess(module: string) {
  window.dispatchEvent(new CustomEvent("aurit:import-review-save-success", { detail: { module } }));
}

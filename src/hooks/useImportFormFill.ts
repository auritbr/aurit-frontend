import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { advanceImportReviewQueue, getImportReviewQueue } from "@/lib/importReviewQueue";
import { applyImportedData, isImportValueEmpty, type ImportFieldRule } from "@/lib/importDataApplicator";

interface ImportFillDetail {
  module: string;
  data: Record<string, unknown>;
  requiredFields?: string[];
  fieldRules?: Record<string, ImportFieldRule>;
}

export function useImportFormFill<T extends object>(
  module: string,
  setForm: Dispatch<SetStateAction<T>>,
) {
  const submitted = useRef(false);

  useEffect(() => {
    const handleFill = (event: Event) => {
      const detail = (event as CustomEvent<ImportFillDetail>).detail;
      if (detail?.module !== module || !detail.data) return;
      setForm((current) => {
        const result = applyImportedData(current, detail.data, detail.fieldRules);
        const next = result.data as Record<string, unknown>;
        window.dispatchEvent(new CustomEvent("aurit:import-apply-result", {
          detail: { module, warnings: result.warnings, appliedFields: result.appliedFields, preservedFields: result.preservedFields },
        }));
        window.setTimeout(() => {
          for (const field of detail.requiredFields ?? []) {
            const element = document.getElementById(field);
            if (!element || !isImportValueEmpty(next[field])) continue;
            element.setAttribute("aria-invalid", "true");
            element.classList.add("border-amber-500", "ring-1", "ring-amber-300");
          }
        }, 0);
        return next as T;
      });
    };
    const handleSubmit = () => {
      if (getImportReviewQueue(module)) submitted.current = true;
    };
    const handleSaveSuccess = (event: Event) => {
      const detail = (event as CustomEvent<{ module: string }>).detail;
      if (detail?.module !== module) return;
      advanceImportReviewQueue(module);
      submitted.current = false;
    };
    window.addEventListener("aurit:import-fill-form", handleFill);
    window.addEventListener("aurit:import-review-save-success", handleSaveSuccess);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      window.removeEventListener("aurit:import-fill-form", handleFill);
      window.removeEventListener("aurit:import-review-save-success", handleSaveSuccess);
      document.removeEventListener("submit", handleSubmit, true);
      if (submitted.current) advanceImportReviewQueue(module);
    };
  }, [module, setForm]);
}

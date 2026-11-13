import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  advanceImportReviewQueue,
  getImportReviewQueue,
  type ImportReviewQueue,
} from "@/lib/importReviewQueue";
import {
  applyImportedData,
  isImportValueEmpty,
  type ImportFieldRule,
} from "@/lib/importDataApplicator";

interface ImportFillDetail {
  module: string;
  data: Record<string, unknown>;
  requiredFields: string[];
  fieldRules: Record<string, ImportFieldRule>;
}

export function useImportReviewProgress(module: string, active = true) {
  const [applied, setApplied] = useState<ImportReviewQueue | null>(null);

  useEffect(() => {
    if (!active) {
      setApplied(null);
      return;
    }
    const handleFill = (event: Event) => {
      const detail = (event as CustomEvent<ImportFillDetail>).detail;
      if (detail?.module === module) {
        setApplied(getImportReviewQueue(module));
      }
    };
    window.addEventListener("aurit:import-fill-form", handleFill);
    return () => {
      window.removeEventListener("aurit:import-fill-form", handleFill);
    };
  }, [active, module]);

  return useCallback(() => {
    const queue = getImportReviewQueue(module);
    if (
      !active ||
      !applied ||
      !queue ||
      applied.reviewId !== queue.reviewId ||
      applied.currentIndex !== queue.currentIndex
    )
      return;

    advanceImportReviewQueue(module);
    setApplied((current) => (current === applied ? null : current));
  }, [active, applied, module]);
}

export function useImportFormFill<T extends object>(
  module: string,
  form: T,
  setForm: Dispatch<SetStateAction<T>>,
  active = true,
) {
  const formRef = useRef(form);
  formRef.current = form;
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const confirmSave = useImportReviewProgress(module, active);

  useEffect(() => {
    if (!active) {
      setRequiredFields([]);
      return;
    }

    const handleFill = (event: Event) => {
      const detail = (event as CustomEvent<ImportFillDetail>).detail;
      if (detail?.module !== module) return;

      const result = applyImportedData(
        formRef.current,
        detail.data,
        detail.fieldRules,
        true,
      );
      const fields = detail.requiredFields.map(
        (field) => detail.fieldRules[field]?.targetField ?? field,
      );
      const next = result.data as Record<string, unknown>;
      setForm(result.data);
      setRequiredFields(fields);
      window.dispatchEvent(
        new CustomEvent("aurit:import-apply-result", {
          detail: {
            module,
            warnings: result.warnings,
            missingFields: fields.filter((field) =>
              isImportValueEmpty(next[field]),
            ),
          },
        }),
      );
    };

    window.addEventListener("aurit:import-fill-form", handleFill);
    return () =>
      window.removeEventListener("aurit:import-fill-form", handleFill);
  }, [active, module, setForm]);

  useEffect(() => {
    if (!active || !requiredFields.length) return;
    const marked = requiredFields.flatMap((field) => {
      if (!isImportValueEmpty((form as Record<string, unknown>)[field]))
        return [];
      const element = document.getElementById(field);
      if (!element || element.getAttribute("aria-invalid") === "true")
        return [];
      element.setAttribute("aria-invalid", "true");
      return [
        { element, previous: element.classList.contains("border-amber-500") },
      ];
    });
    for (const { element } of marked) element.classList.add("border-amber-500");
    return () => {
      for (const { element, previous } of marked) {
        element.removeAttribute("aria-invalid");
        if (!previous) element.classList.remove("border-amber-500");
      }
    };
  }, [active, form, requiredFields]);

  return confirmSave;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { isPlanoAccessDenied } from "@/lib/access";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";

export function useBackendReport<TFilters, TData>(
  initialFilters: TFilters,
  loader: (filters: TFilters) => Promise<TData>,
) {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const requestId = useRef(0);
  const appliedRef = useRef(initialFilters);

  const load = useCallback(
    async (next: TFilters, successMessage?: string) => {
      const currentRequest = ++requestId.current;
      try {
        setLoading(true);
        const response = await loader(next);
        if (currentRequest !== requestId.current) return false;
        setData(response);
        setApplied(next);
        appliedRef.current = next;
        setAccessDenied(false);
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (error) {
        if (currentRequest !== requestId.current) return false;
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o relatório.";
        if (isPlanoAccessDenied(message)) setAccessDenied(true);
        else toast.error(message);
        return false;
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    void load(initialFilters);
  }, [initialFilters, load]);

  useEffect(() => {
    const refresh = () => void load(appliedRef.current);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const apply = useCallback(
    (next: TFilters, showSuccess = false) => {
      setFilters(next);
      void load(next, showSuccess ? "Filtros aplicados." : undefined);
    },
    [load],
  );

  return {
    filters,
    setFilters,
    applied,
    data,
    loading,
    accessDenied,
    apply,
  };
}

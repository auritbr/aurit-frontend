import { toast } from "sonner";
import { emitNextStepPopup, nextStepMessage } from "@/lib/nextStepPopup";

export interface NextStep {
  label: string;
  to: string;
}

export function toastSuccessNext(
  message: string,
  navigate: (to: string) => void,
  listUrl: string,
  next?: NextStep,
): void {
  toast.success(message);

  window.setTimeout(() => {
    if (next) {
      emitNextStepPopup({
        message: nextStepMessage(next.label),
        buttonLabel: next.label,
        to: next.to,
      });
    }
    navigate(listUrl);
  }, 700);
}

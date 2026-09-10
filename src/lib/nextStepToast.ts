import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

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
    if (next) emitJourneyNextStep();
    navigate(listUrl);
  }, 700);
}

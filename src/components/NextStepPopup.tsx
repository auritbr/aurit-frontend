import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, Route, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  nextStepMessage,
  subscribeNextStepPopup,
  type NextStepPopupPayload,
} from "@/lib/nextStepPopup";

const NEXT_STEP_POPUP_DURATION_MS = 60_000;

// A aplicação de recursos passou a emitir diretamente o evento global. Chaves
// antigas dessa tela não representam uma habilitação concluída e não podem abrir
// um segundo popup depois que a pessoa navega para o formulário de habilitação.
const OBSOLETE_NEXT_STEP_STORAGE_KEYS = new Set([
  "aurit:planejamento-financeiro:next-step-card",
]);

interface NextStepPopupProps {
  open: boolean;
  /** Frase curta da próxima ação. */
  message: string;
  /** Texto do botão principal. */
  buttonLabel: string;
  onContinue: () => void;
  onClose: () => void;
  className?: string;
}

/**
 * Popup leve e refinado de orientação da próxima etapa da jornada.
 * Apresentação apenas — a lógica que define QUAL é a próxima etapa vive fora do componente.
 */
export function NextStepPopup({
  open,
  message,
  buttonLabel,
  onContinue,
  onClose,
  className,
}: NextStepPopupProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-foreground/18 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "next-step-glass fixed left-1/2 top-[45%] z-50 w-[calc(100%-2rem)] max-w-[19rem] -translate-x-1/2 -translate-y-1/2",
            "rounded-[26px] p-6 text-center",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-1",
            className,
          )}
        >
          <DialogPrimitive.Close
            aria-label="Fechar"
            title="Fechar"
            className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/55 transition-all hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </DialogPrimitive.Close>

          <span
            aria-hidden="true"
            className="next-step-icon mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[15px]"
          >
            <Route className="h-[19px] w-[19px]" strokeWidth={2} />
          </span>

          <DialogPrimitive.Title className="mx-auto max-w-[15rem] text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {message}
          </DialogPrimitive.Title>

          <button
            type="button"
            onClick={onContinue}
            className={cn(
              "next-step-action mt-5 inline-flex h-10 w-full items-center justify-center gap-2",
              "rounded-xl px-4 text-[13px] font-semibold",
            )}
          >
            {buttonLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Host global: escuta os eventos de próxima etapa emitidos após um
 * salvamento bem-sucedido e exibe o popup uma única vez por evento.
 */
export function NextStepPopupHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = React.useState<NextStepPopupPayload | null>(null);

  React.useEffect(() => {
    return subscribeNextStepPopup(setStep);
  }, []);

  // Mantém compatibilidade com formulários que ainda transportam a próxima
  // etapa pelo sessionStorage durante a navegação até a página de listagem.
  React.useLayoutEffect(() => {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key || !key.includes("next-step")) continue;

      if (OBSOLETE_NEXT_STEP_STORAGE_KEYS.has(key)) {
        sessionStorage.removeItem(key);
        index -= 1;
        continue;
      }

      const raw = sessionStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          acaoLabel?: string;
          acaoUrl?: string;
          label?: string;
          to?: string;
        };
        const buttonLabel = parsed.acaoLabel ?? parsed.label;
        const to = parsed.acaoUrl ?? parsed.to;

        if (buttonLabel && to) {
          setStep({
            message: nextStepMessage(buttonLabel),
            buttonLabel,
            to,
          });
          sessionStorage.removeItem(key);
          break;
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (!step) return;

    const timer = window.setTimeout(
      () => setStep(null),
      NEXT_STEP_POPUP_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [step]);

  if (!step) return null;

  return (
    <NextStepPopup
      open
      message={step.message}
      buttonLabel={step.buttonLabel}
      onContinue={() => {
        setStep(null);
        navigate(step.to);
      }}
      onClose={() => setStep(null)}
    />
  );
}

export default NextStepPopup;

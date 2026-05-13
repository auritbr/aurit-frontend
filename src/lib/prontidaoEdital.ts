import { toast } from "sonner";

export interface NextStep {
  label: string;
  to: string;
}

interface ToastSuccessNextOptions {
  delayRedirectMs?: number;
  autoRedirectWhenNext?: boolean;
}

/**
 * Exibe um toast de sucesso e oferece uma próxima ação recomendada.
 *
 * Regra:
 * - Sem next step: volta para a listagem normalmente.
 * - Com next step: mostra botão "Ir agora" e evita redirecionamento agressivo.
 */
export function toastSuccessNext(
  message: string,
  navigate: (to: string) => void,
  listUrl: string,
  next?: NextStep,
  options?: ToastSuccessNextOptions,
): void {
  const delayRedirectMs = options?.delayRedirectMs ?? 2800;
  const autoRedirectWhenNext = options?.autoRedirectWhenNext ?? false;

  let timer: ReturnType<typeof setTimeout> | null = null;

  if (next) {
    toast.success(message, {
      description: `Próximo passo sugerido: ${next.label}`,
      action: {
        label: "Ir agora",
        onClick: () => {
          if (timer) clearTimeout(timer);
          navigate(next.to);
        },
      },
      duration: 7000,
    });

    if (autoRedirectWhenNext) {
      timer = setTimeout(() => navigate(listUrl), delayRedirectMs);
    }

    return;
  }

  toast.success(message);
  timer = setTimeout(() => navigate(listUrl), delayRedirectMs);
}
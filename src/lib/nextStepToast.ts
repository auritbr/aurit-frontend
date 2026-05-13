import { toast } from "sonner";

export interface NextStep {
  label: string;
  to: string;
}

export interface NextStepRecommendation {
  id: string;
  modulo: string;
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  acaoUrl?: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
  label?: string;
  createdAt: string;
}

interface ToastSuccessNextOptions {
  delayRedirectMs?: number;
  recommendation?: Omit<NextStepRecommendation, "id" | "createdAt">;
}

const NEXT_STEP_STORAGE_KEY = "aurit:next-step-recommendation";

export function saveNextStepRecommendation(
  recommendation: Omit<NextStepRecommendation, "id" | "createdAt">,
): void {
  const payload: NextStepRecommendation = {
    ...recommendation,
    id: `${recommendation.modulo}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  sessionStorage.setItem(NEXT_STEP_STORAGE_KEY, JSON.stringify(payload));
}

export function getNextStepRecommendation(): NextStepRecommendation | null {
  const raw = sessionStorage.getItem(NEXT_STEP_STORAGE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NextStepRecommendation;

    if (!parsed?.id || !parsed?.modulo || !parsed?.createdAt) {
      sessionStorage.removeItem(NEXT_STEP_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(NEXT_STEP_STORAGE_KEY);
    return null;
  }
}

export function clearNextStepRecommendation(): void {
  sessionStorage.removeItem(NEXT_STEP_STORAGE_KEY);
}

/**
 * Exibe toast de sucesso e volta para a listagem.
 *
 * Quando houver próxima ação recomendada:
 * - salva a recomendação no sessionStorage;
 * - volta para a listagem;
 * - a página de listagem exibe o card temporário.
 */
export function toastSuccessNext(
  message: string,
  navigate: (to: string) => void,
  listUrl: string,
  next?: NextStep,
  options?: ToastSuccessNextOptions,
): void {
  const delayRedirectMs = options?.delayRedirectMs ?? 900;

  if (options?.recommendation) {
    saveNextStepRecommendation(options.recommendation);
  }

  let redirectTimer: ReturnType<typeof setTimeout> | null = null;

  toast.success(message, {
    description: next ? `Próximo passo sugerido: ${next.label}` : undefined,
    action: next
      ? {
          label: "Ir agora",
          onClick: () => {
            if (redirectTimer) {
              clearTimeout(redirectTimer);
            }

            navigate(next.to);
          },
        }
      : undefined,
    duration: next ? 6000 : 4000,
  });

  redirectTimer = setTimeout(() => {
    navigate(listUrl);
  }, delayRedirectMs);
}
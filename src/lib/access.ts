export function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isPlanoAccessDenied(message?: string | null) {
  if (!message) return false;

  const normalized = normalizeMessage(message);

  return (
    normalized.includes("plano profissional") ||
    normalized.includes("modulo faz parte do plano") ||
    normalized.includes("modulo faz parte do plano profissional") ||
    normalized.includes("modulo esta disponivel apenas no plano") ||
    normalized.includes("modulo disponivel apenas no plano") ||
    normalized.includes("upgrade de plano") ||
    normalized.includes("recurso disponivel apenas no plano") ||
    normalized.includes("funcionalidade disponivel apenas no plano") ||
    normalized.includes("disponivel apenas no plano pago") ||
    normalized.includes("apenas no plano pago")
  );
}

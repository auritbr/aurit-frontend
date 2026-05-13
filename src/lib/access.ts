export function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isPlanoAccessDenied(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.includes("plano pago") ||
    normalized.includes("disponivel apenas no plano pago") ||
    normalized.includes("disponivel somente no plano pago") ||
    normalized.includes("este modulo esta disponivel apenas no plano pago") ||
    normalized.includes("este recurso esta disponivel apenas no plano pago") ||
    normalized.includes("antes de acessar este modulo") ||
    normalized.includes("configure os dados da empresa antes de acessar") ||
    normalized.includes("configure a empresa antes de acessar") ||
    normalized.includes("configuracao da empresa nao encontrada")
  );
}
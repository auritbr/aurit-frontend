import { getAuthHeaders } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type TipoPlano =
  | "PLANO_GRATUITO"
  | "PLANO_PAGO"
  | "PLANO_CORTESIA"
  | string;

export const LIMITE_USUARIOS_PLANO_GRATUITO = 3;

// Mesma matriz aplicada à navegação. Mantê-la aqui permite que uma URL direta
// receba o bloqueio de plano antes mesmo de montar a página protegida.
const MODULOS_EXCLUSIVOS_PLANO_PAGO = new Set<string>([
  "DOCUMENTOS",
  "CURRICULOS",
  "TRAJETORIAS_CULTURAIS",
  "METAS_PROJETO",
  "CRONOGRAMA",
  "PLANOS_AULA",
  "EVIDENCIAS",
  "EDITAIS",
  "PROPOSTAS_EDITAL",
  "EQUIPE_EDITAL",
  "PLANO_COMUNICACAO",
  "ACOES_DIVULGACAO",
  "PLANEJAMENTO_FINANCEIRO",
  "RESULTADO_PROPOSTA",
  "HABILITACAO",
  "FINANCEIRO",
  "PAINEL_FINANCEIRO",
  "CONTAS_BANCARIAS",
  "FORNECEDORES",
  "DOADORES",
  "DOACOES",
  "PARCEIROS",
  "CONTAS_PAGAR",
  "CONTAS_RECEBER",
  "TRANSFERENCIAS_BANCARIAS",
  "MOVIMENTACOES_BANCARIAS",
  "FLUXO_CAIXA",
  "CONCILIACOES_BANCARIAS",
  "PRESTACAO_CONTAS",
  "PRESTACAO_METAS",
  "PATRIMONIO",
  "EMPRESTIMOS",
]);

interface PlanoAtualDTO {
  tipoPlano?: TipoPlano | null;
}

export async function getTipoPlanoAtual(): Promise<TipoPlano | null> {
  const response = await fetch(`${API_URL}/configuracoes-empresa/me/plano`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PlanoAtualDTO;
  return data?.tipoPlano ?? null;
}

export async function isPlanoGratuitoAtual() {
  return (await getTipoPlanoAtual()) === "PLANO_GRATUITO";
}

export function isPlanoPagoOuCortesia(tipoPlano?: TipoPlano | null): boolean {
  return tipoPlano === "PLANO_PAGO" || tipoPlano === "PLANO_CORTESIA";
}

export function moduloExigePlanoPago(modulo?: string): boolean {
  return !!modulo && MODULOS_EXCLUSIVOS_PLANO_PAGO.has(modulo);
}

export function getPlanoLabel(tipoPlano?: TipoPlano | null): string {
  if (tipoPlano === "PLANO_GRATUITO") return "Gratuito";
  if (tipoPlano === "PLANO_PAGO") return "Pago";
  if (tipoPlano === "PLANO_CORTESIA") return "Cortesia";

  return tipoPlano ?? "";
}

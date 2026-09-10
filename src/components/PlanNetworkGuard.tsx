import { useLayoutEffect } from "react";
import { getTipoPlanoAtual, isPlanoPagoOuCortesia } from "@/lib/plano";

/** Endpoints que não podem sequer ser consultados pelo plano gratuito. */
const PAID_API_PREFIXES = [
  "/dashboard",
  "/documentos",
  "/curriculos",
  "/trajetorias-culturais",
  "/metas-projeto",
  "/metas-projetos",
  "/cronogramas",
  "/planos-aula",
  "/evidencias-execucao",
  "/evidencias",
  "/editais",
  "/propostas-editais",
  "/propostas-edital",
  "/equipes-editais",
  "/equipe-edital",
  "/planos-comunicacao",
  "/plano-comunicacao",
  "/acoes-divulgacao",
  "/planejamentos-financeiros",
  "/planejamento-financeiro",
  "/resultados-propostas",
  "/resultado-propostas",
  "/habilitacoes-propostas",
  "/habilitacao-propostas",
  "/financeiros",
  "/financeiro",
  "/painel-financeiro",
  "/contas-bancarias",
  "/fornecedores",
  "/doadores",
  "/doacoes",
  "/parceiros",
  "/contas-pagar",
  "/contas-receber",
  "/transferencias-bancarias",
  "/movimentacoes-bancarias",
  "/conciliacoes-bancarias",
  "/fluxo-caixa",
  "/prestacoes-contas",
  "/prestacao-contas",
  "/prestacao-metas",
  "/prestacoes-metas",
  "/patrimonios",
  "/patrimonio",
  "/emprestimos",
] as const;

function apiPath(input: RequestInfo | URL) {
  const url = input instanceof Request ? input.url : String(input);
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return "";
  }
}

function exigePlanoPago(path: string) {
  return PAID_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Última barreira do cliente: evita chamadas HTTP de módulos pagos feitas por
 * componentes montados durante uma transição de rota. A API segue protegendo
 * os dados como fonte definitiva de autorização.
 */
export function PlanNetworkGuard() {
  useLayoutEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    let planoPromise: Promise<boolean> | null = null;
    const possuiPlanoPago = () => {
      planoPromise ??= getTipoPlanoAtual()
        .then(isPlanoPagoOuCortesia)
        .catch(() => false);
      return planoPromise;
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!exigePlanoPago(apiPath(input)) || (await possuiPlanoPago()))
        return nativeFetch(input, init);

      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      // Páginas de listagem podem ser montadas brevemente durante a troca de
      // rota. Para leituras, uma lista vazia impede a exceção no componente e
      // não cria uma entrada de erro no inspetor.
      if (method === "GET") {
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          message: "Este módulo está disponível apenas no plano pago.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}

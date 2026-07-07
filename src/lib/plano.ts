import { getAuthHeaders, getUsuarioLogadoStorage } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type TipoPlano =
  | "PLANO_GRATUITO"
  | "PLANO_PAGO"
  | "PLANO_CORTESIA"
  | string;

export const LIMITE_USUARIOS_PLANO_GRATUITO = 3;

interface ConfiguracaoEmpresaDTO {
  id?: number;
  tipoPlano?: TipoPlano | null;
}

export async function getTipoPlanoAtual(): Promise<TipoPlano | null> {
  const usuario = getUsuarioLogadoStorage();
  const configuracaoEmpresaId =
    usuario?.configuracaoEmpresaId != null
      ? String(usuario.configuracaoEmpresaId)
      : "";

  const response = await fetch(`${API_URL}/configuracoes-empresa`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const data: ConfiguracaoEmpresaDTO[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  if (configuracaoEmpresaId) {
    const found = data.find(
      (item) => String(item.id) === configuracaoEmpresaId,
    );

    if (found?.tipoPlano) {
      return found.tipoPlano;
    }
  }

  return data[0]?.tipoPlano ?? null;
}

export async function isPlanoGratuitoAtual() {
  return (await getTipoPlanoAtual()) === "PLANO_GRATUITO";
}

export function isPlanoPagoOuCortesia(tipoPlano?: TipoPlano | null): boolean {
  return tipoPlano === "PLANO_PAGO" || tipoPlano === "PLANO_CORTESIA";
}

export function getPlanoLabel(tipoPlano?: TipoPlano | null): string {
  if (tipoPlano === "PLANO_GRATUITO") return "Gratuito";
  if (tipoPlano === "PLANO_PAGO") return "Pago";
  if (tipoPlano === "PLANO_CORTESIA") return "Cortesia";

  return tipoPlano ?? "";
}

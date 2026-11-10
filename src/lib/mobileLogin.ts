import {
  aplicarRespostaLogin,
  limparSessaoUsuario,
  normalizarTenantSlug,
  setMobileTenantSlug,
  type LoginResponseDTO,
} from "@/lib/auth";
import { isNativeApp } from "@/lib/native";

export interface OrganizacaoMobile {
  nome: string;
  slug: string;
}
export interface MobileLoginResponse extends LoginResponseDTO {
  empresaSlug?: string | null;
  organizacoes?: OrganizacaoMobile[];
}
export type CredenciaisMobile =
  | { tipo: "senha"; identificador: string; senha: string }
  | { tipo: "google"; idToken: string };

export const MOBILE_LOGIN_TIMEOUT_MS = 45_000;

/** Descoberta não envia o tenant de uma sessão anterior nem credenciais em URL/storage. */
export async function autenticarMobile(
  credenciais: CredenciaisMobile,
  organizacaoSlug?: string,
): Promise<MobileLoginResponse> {
  if (!isNativeApp()) throw new Error("Acesso indisponível.");
  const path =
    credenciais.tipo === "senha"
      ? "/usuarios/mobile/login"
      : "/usuarios/mobile/login/google";
  const body =
    credenciais.tipo === "senha"
      ? {
          identificador: credenciais.identificador.trim(),
          password: credenciais.senha,
          organizacaoSlug,
        }
      : { idToken: credenciais.idToken, organizacaoSlug };
  let response: Response;
  let data: MobileLoginResponse | null;
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    MOBILE_LOGIN_TIMEOUT_MS,
  );
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_URL ?? "http://localhost:8080"}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    data = await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return null;
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error("O servidor demorou para responder. Tente novamente.");
    }
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok || !data) {
    throw new Error(
      "Não foi possível acessar com essas credenciais. Confira os dados e tente novamente.",
    );
  }
  return data as MobileLoginResponse;
}

export function organizacoesParaEscolha(
  data: MobileLoginResponse,
): OrganizacaoMobile[] {
  if (data.token) return [];
  const organizacoes = data.organizacoes;
  if (
    !Array.isArray(organizacoes) ||
    organizacoes.length < 2 ||
    organizacoes.some((o) => !o.nome?.trim() || !normalizarTenantSlug(o.slug))
  ) {
    throw new Error("Não foi possível concluir o acesso. Tente novamente.");
  }
  return organizacoes;
}

export function aplicarLoginMobile(data: MobileLoginResponse) {
  const usuario = data.user ?? data.usuario;
  const slug = normalizarTenantSlug(data.empresaSlug);
  if (
    !data.token ||
    !usuario ||
    (usuario.userRole !== "ADMIN_PROPRIETARIO" && !slug)
  ) {
    throw new Error(
      "Não foi possível identificar sua organização. Tente novamente.",
    );
  }
  limparSessaoUsuario();
  setMobileTenantSlug(slug);
  return aplicarRespostaLogin(data);
}

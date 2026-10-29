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
      },
    );
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  const data = await response.json().catch(() => null);
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

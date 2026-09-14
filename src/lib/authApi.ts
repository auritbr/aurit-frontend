import {
  getTenantSlug,
  normalizarToken,
  type EtapaPrimeiroAcesso,
  type LoginResponseDTO,
  type UsuarioLogado,
} from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface PoliticaSenha {
  minimoCaracteres: number;
  exigeMaiuscula: boolean;
  exigeMinuscula: boolean;
  exigeNumero: boolean;
  exigeEspecial: boolean;
}

// Espelho da política validada em UsuarioService. O backend não publica uma
// política dinâmica neste contrato; esta constante evita o cliente aceitar uma
// senha que o servidor rejeitaria.
export const politicaSenhaBackend: PoliticaSenha = {
  minimoCaracteres: 8,
  exigeMaiuscula: true,
  exigeMinuscula: true,
  exigeNumero: true,
  exigeEspecial: true,
};

export interface RespostaAutenticacao extends LoginResponseDTO {
  token: string;
  usuario: UsuarioLogado;
  primeiroAcessoPendente: boolean;
  etapa?: EtapaPrimeiroAcesso;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function headers(token?: string): HeadersInit {
  const tenantSlug = getTenantSlug();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${normalizarToken(token)}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
  };
}

async function mensagemErro(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return "Não foi possível concluir a solicitação.";
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      error?: string;
      detail?: string;
    };
    return parsed.message ?? parsed.error ?? parsed.detail ?? text;
  } catch {
    return text;
  }
}

async function requisicao<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      "Não foi possível conectar ao servidor. Tente novamente.",
      0,
    );
  }

  if (!response.ok) {
    throw new AuthApiError(await mensagemErro(response), response.status);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export function solicitarConfirmacaoEmail(email: string, token: string) {
  return requisicao<{ message: string }>(
    "/usuarios/confirmacao-email/solicitar",
    { email },
    token,
  );
}

export function confirmarCodigoEmail(codigo: string, token: string) {
  return requisicao<RespostaAutenticacao>(
    "/usuarios/confirmacao-email/confirmar",
    { codigo },
    token,
  );
}

export function definirSenhaPrimeiroAcesso(
  novaSenha: string,
  confirmarNovaSenha: string,
  token: string,
) {
  return requisicao<RespostaAutenticacao>(
    "/usuarios/primeiro-acesso/definir-senha",
    { novaSenha, confirmarNovaSenha },
    token,
  );
}

export function esqueciSenha(email: string) {
  return requisicao<{ message: string }>("/usuarios/esqueci-senha", { email });
}

export function validarTokenAtivacao(token: string) {
  return requisicao<{ valido: boolean }>("/usuarios/ativacao/validar", {
    token,
  });
}

export function ativarConta(
  token: string,
  novaSenha: string,
  confirmarNovaSenha: string,
) {
  return requisicao<{ message: string }>("/usuarios/ativacao/definir-senha", {
    token,
    novaSenha,
    confirmarNovaSenha,
  });
}

export function validarTokenRedefinicao(token: string) {
  return requisicao<{ valido: boolean }>("/usuarios/redefinir-senha/validar", {
    token,
  });
}

export function redefinirSenha(
  token: string,
  novaSenha: string,
  confirmarNovaSenha: string,
) {
  return requisicao<{ message: string }>("/usuarios/redefinir-senha", {
    token,
    novaSenha,
    confirmarNovaSenha,
  });
}

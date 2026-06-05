const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface UsuarioLogado {
  id?: number;
  name?: string;
  login?: string;
  userRole?: "USER" | "ADMIN" | "ADMIN_PROPRIETARIO" | string;
  statusUsuario?: "ATIVO" | "INATIVO" | string;
  configuracaoEmpresaId?: number | null;
}

interface LoginResponseDTO {
  token?: string;
  usuario?: UsuarioLogado;
  user?: UsuarioLogado;

  userRole?: string;
  name?: string;
  login?: string;
  id?: number;
  statusUsuario?: string;
  configuracaoEmpresaId?: number | null;
}

const TOKEN_KEYS = ["token", "authToken", "accessToken"];
const USER_KEY = "usuarioLogado";
const USER_ROLE_KEY = "userRole";
const USER_NAME_KEY = "userName";

function getTenantSlug() {
  const hostname = window.location.hostname;

  if (hostname === "localhost") {
    return "";
  }

  if (!hostname.endsWith(".aurit.com.br")) {
    return "";
  }

  const slug = hostname.replace(".aurit.com.br", "");

  if (!slug || slug.includes(".")) {
    return "";
  }

  if (["www", "admin", "api", "mail", "webmail", "cpanel"].includes(slug)) {
    return "";
  }

  return slug;
}

export function normalizarToken(token?: string | null): string {
  if (!token) return "";

  return token
    .trim()
    .replace(/^(Bearer\s+)+/i, "")
    .trim();
}

export function getStoredToken(): string {
  for (const key of TOKEN_KEYS) {
    const localToken = localStorage.getItem(key);

    if (localToken) {
      return normalizarToken(localToken);
    }

    const sessionToken = sessionStorage.getItem(key);

    if (sessionToken) {
      return normalizarToken(sessionToken);
    }
  }

  return "";
}

export function getStoredUserRole(): string {
  return (
    localStorage.getItem(USER_ROLE_KEY) ||
    sessionStorage.getItem(USER_ROLE_KEY) ||
    getUsuarioLogadoStorage()?.userRole ||
    ""
  );
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
  };
}

function removeSessionFromStorage(storage: Storage) {
  TOKEN_KEYS.forEach((key) => storage.removeItem(key));
  storage.removeItem(USER_KEY);
  storage.removeItem(USER_ROLE_KEY);
  storage.removeItem(USER_NAME_KEY);
}

export function salvarSessaoUsuario(
  token: string,
  usuario: UsuarioLogado,
  _persistir = true,
) {
  removeSessionFromStorage(localStorage);
  removeSessionFromStorage(sessionStorage);

  const tokenLimpo = normalizarToken(token);

  if (!tokenLimpo) {
    throw new Error("Token inválido ao salvar sessão do usuário.");
  }

  localStorage.setItem("token", tokenLimpo);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));

  if (usuario.userRole) {
    localStorage.setItem(USER_ROLE_KEY, usuario.userRole);
  }

  if (usuario.name) {
    localStorage.setItem(USER_NAME_KEY, usuario.name);
  }
}

export function limparSessaoUsuario() {
  removeSessionFromStorage(localStorage);
  removeSessionFromStorage(sessionStorage);
}

export async function logoutUsuario(redirect = true): Promise<void> {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  try {
    if (token) {
      await fetch(`${API_URL}/usuarios/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
        },
      });
    }
  } catch (error) {
    console.error("Erro ao registrar logout:", error);
  } finally {
    limparSessaoUsuario();

    if (redirect) {
      window.location.href = "/login";
    }
  }
}

export function getUsuarioLogadoStorage(): UsuarioLogado | null {
  const raw =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as UsuarioLogado;
  } catch {
    limparSessaoUsuario();
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const tokenLimpo = normalizarToken(token);
    const payload = tokenLimpo.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalizedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    return JSON.parse(atob(normalizedBase64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) return true;

  if (!payload.exp) return false;

  return Date.now() >= Number(payload.exp) * 1000;
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();

  if (!token) return false;

  if (isJwtExpired(token)) {
    limparSessaoUsuario();
    return false;
  }

  return true;
}

export async function getUsuarioLogado(): Promise<UsuarioLogado> {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  if (isJwtExpired(token)) {
    limparSessaoUsuario();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const usuario = getUsuarioLogadoStorage();

  if (!usuario?.id) {
    limparSessaoUsuario();
    throw new Error(
      "Dados do usuário logado não encontrados. Faça login novamente.",
    );
  }

  if (usuario.statusUsuario === "INATIVO") {
    limparSessaoUsuario();
    throw new Error("Usuário inativo. Entre em contato com o administrador.");
  }

  return usuario;
}

function extrairUsuarioDaResposta(data: LoginResponseDTO): UsuarioLogado | null {
  if (data.usuario) {
    return data.usuario;
  }

  if (data.user) {
    return data.user;
  }

  if (data.id || data.login || data.name || data.userRole) {
    return {
      id: data.id,
      name: data.name,
      login: data.login,
      userRole: data.userRole,
      statusUsuario: data.statusUsuario,
      configuracaoEmpresaId: data.configuracaoEmpresaId,
    };
  }

  return null;
}

export async function loginUsuario(
  login: string,
  password: string,
  persistir = true,
): Promise<{ token: string; usuario: UsuarioLogado }> {
  const tenantSlug = getTenantSlug();

  const response = await fetch(`${API_URL}/usuarios/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
    },
    body: JSON.stringify({
      login: login.trim(),
      password,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Erro ao realizar login.");
  }

  let data: LoginResponseDTO;

  try {
    data = JSON.parse(text) as LoginResponseDTO;
  } catch {
    throw new Error("Resposta inválida do servidor ao realizar login.");
  }

  const tokenLimpo = normalizarToken(data.token);

  if (!tokenLimpo) {
    throw new Error("Token não retornado no login.");
  }

  const usuario = extrairUsuarioDaResposta(data);

  if (!usuario) {
    throw new Error("Dados do usuário não retornados corretamente no login.");
  }

  if (!usuario.userRole && data.userRole) {
    usuario.userRole = data.userRole;
  }

  if (!usuario.name && data.name) {
    usuario.name = data.name;
  }

  if (!usuario.login && data.login) {
    usuario.login = data.login;
  }

  if (!usuario.id && data.id) {
    usuario.id = data.id;
  }

  if (usuario.statusUsuario === "INATIVO") {
    limparSessaoUsuario();
    throw new Error("Usuário inativo. Entre em contato com o administrador.");
  }

  if (!usuario.userRole) {
    throw new Error("Perfil do usuário não retornado no login.");
  }

  salvarSessaoUsuario(tokenLimpo, usuario, persistir);

  return {
    token: tokenLimpo,
    usuario,
  };
}

export async function refreshUsuarioLogadoFromStorage() {
  return getUsuarioLogado();
}

/**
 * Mantido aqui por compatibilidade com arquivos antigos,
 * como usuarioService.ts.
 *
 * Para novas telas, prefira usar getUsuarios de "@/data/usuarios".
 */
export async function getUsuarios() {
  const response = await fetch(`${API_URL}/usuarios`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const text = await response.text();

  if (response.status === 401 || response.status === 403) {
    limparSessaoUsuario();
    throw new Error(text || "Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    throw new Error(text || "Erro ao buscar usuários.");
  }

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface UsuarioLogado {
  id?: number;
  name?: string;
  login?: string;
  userRole?: "USER" | "ADMIN" | "ADMIN_PROPRIETARIO" | string;
  statusUsuario?: "ATIVO" | "INATIVO" | string;
  configuracaoEmpresaId?: number | null;
  email?: string | null;
  emailConfirmado?: boolean;
  contaAtivada?: boolean;
}

export type EtapaPrimeiroAcesso = "CONFIRMAR_EMAIL" | "CONFIRMAR_CODIGO";

export interface PrimeiroAcessoState {
  etapa: EtapaPrimeiroAcesso;
  email?: string;
}

export interface LoginResponseDTO {
  token?: string;
  usuario?: UsuarioLogado;
  user?: UsuarioLogado;

  userRole?: string;
  name?: string;
  login?: string;
  id?: number;
  statusUsuario?: string;
  configuracaoEmpresaId?: number | null;
  primeiroAcessoPendente?: boolean;
  etapa?: EtapaPrimeiroAcesso | null;
}

const TOKEN_KEYS = ["token", "authToken", "accessToken"];
const USER_KEY = "usuarioLogado";
const USER_ROLE_KEY = "userRole";
const USER_NAME_KEY = "userName";
const FIRST_ACCESS_KEY = "primeiroAcesso";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "mail",
  "webmail",
  "cpanel",
  "auth",
]);

export function normalizarTenantSlug(value?: string | null): string {
  const slug = value?.trim().toLowerCase() ?? "";
  return TENANT_SLUG_PATTERN.test(slug) && !RESERVED_SUBDOMAINS.has(slug)
    ? slug
    : "";
}

export function isLocalhost(): boolean {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function isAuthCentralHost(): boolean {
  return window.location.hostname === "auth.aurit.com.br";
}

export function getAuthCentralOrigin(): string {
  return isLocalhost() ? window.location.origin : "https://auth.aurit.com.br";
}

export function getTenantOrigin(tenantSlug: string): string | null {
  const tenant = normalizarTenantSlug(tenantSlug);
  if (!tenant) return null;
  return isLocalhost()
    ? window.location.origin
    : `https://${tenant}.aurit.com.br`;
}

export function getTenantSlug() {
  const hostname = window.location.hostname.toLowerCase();

  if (isLocalhost()) {
    return normalizarTenantSlug(
      new URLSearchParams(window.location.search).get("tenant"),
    );
  }

  if (!hostname.endsWith(".aurit.com.br")) {
    return "";
  }

  return normalizarTenantSlug(hostname.replace(".aurit.com.br", ""));
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
  return normalizarUserRole(
    localStorage.getItem(USER_ROLE_KEY) ||
      sessionStorage.getItem(USER_ROLE_KEY) ||
      getUsuarioLogadoStorage()?.userRole ||
      "",
  );
}

export function normalizarUserRole(role?: string | null): string {
  return (role ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

export function usuarioLogadoEhAdmin(): boolean {
  const role = getStoredUserRole();
  if (role === "ADMIN" || role === "ADMIN_PROPRIETARIO") return true;

  const payload = decodeJwtPayload(getStoredToken());
  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  return roles.some((item) => {
    const roleToken = normalizarUserRole(typeof item === "string" ? item : "");
    return roleToken === "ADMIN" || roleToken === "ADMIN_PROPRIETARIO";
  });
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
  storage.removeItem(FIRST_ACCESS_KEY);
}

export function salvarSessaoUsuario(
  token: string,
  usuario: UsuarioLogado,
  _persistir = true,
) {
  removeSessionFromStorage(localStorage);
  removeSessionFromStorage(sessionStorage);

  const tokenLimpo = normalizarToken(token);
  const roleNormalizada = normalizarUserRole(usuario.userRole);
  if (roleNormalizada) usuario.userRole = roleNormalizada;

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

export function salvarSessaoPrimeiroAcesso(
  token: string,
  usuario: UsuarioLogado,
  primeiroAcesso: PrimeiroAcessoState,
) {
  salvarSessaoUsuario(token, usuario);
  localStorage.setItem(FIRST_ACCESS_KEY, JSON.stringify(primeiroAcesso));
}

export function getPrimeiroAcessoStorage(): PrimeiroAcessoState | null {
  const raw = localStorage.getItem(FIRST_ACCESS_KEY);
  const scope = getTokenScope(getStoredToken());
  const etapaDoToken =
    scope === "EMAIL_CONFIRMATION" ? "CONFIRMAR_EMAIL" : null;
  if (!raw) return etapaDoToken ? { etapa: etapaDoToken } : null;

  try {
    const state = JSON.parse(raw) as PrimeiroAcessoState;
    if (
      state.etapa !== "CONFIRMAR_EMAIL" &&
      state.etapa !== "CONFIRMAR_CODIGO"
    ) {
      return null;
    }
    return etapaDoToken ? { ...state, etapa: etapaDoToken } : state;
  } catch {
    return null;
  }
}

export function atualizarPrimeiroAcessoStorage(
  patch: Partial<PrimeiroAcessoState>,
) {
  const atual = getPrimeiroAcessoStorage() ?? {
    etapa: "CONFIRMAR_EMAIL" as const,
  };
  localStorage.setItem(
    FIRST_ACCESS_KEY,
    JSON.stringify({ ...atual, ...patch }),
  );
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
    const usuario = JSON.parse(raw) as UsuarioLogado;
    const roleNormalizada = normalizarUserRole(usuario.userRole);
    if (roleNormalizada) usuario.userRole = roleNormalizada;
    return usuario;
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

function getTokenScope(token: string): string | null {
  const scope = decodeJwtPayload(token)?.scope;
  return typeof scope === "string" ? scope : null;
}

export function isFirstAccessPending(): boolean {
  const token = getStoredToken();
  if (!token || isJwtExpired(token)) return false;
  return getTokenScope(token) === "EMAIL_CONFIRMATION";
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();

  if (!token) return false;

  if (isJwtExpired(token)) {
    limparSessaoUsuario();
    return false;
  }

  return !isFirstAccessPending();
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

  if (isFirstAccessPending()) {
    throw new Error("Conclua o primeiro acesso antes de utilizar o sistema.");
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

function extrairUsuarioDaResposta(
  data: LoginResponseDTO,
): UsuarioLogado | null {
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

export function aplicarRespostaAutenticacao(
  data: LoginResponseDTO,
  primeiroAcesso?: Partial<PrimeiroAcessoState>,
): {
  token: string;
  usuario: UsuarioLogado;
  primeiroAcessoPendente: boolean;
  etapa?: EtapaPrimeiroAcesso;
} {
  const token = normalizarToken(data.token);
  const usuario = extrairUsuarioDaResposta(data);
  if (!token || !usuario) {
    throw new Error("Resposta de autenticação inválida do servidor.");
  }

  const primeiroAcessoPendente = Boolean(data.primeiroAcessoPendente);
  const etapa =
    data.etapa ?? (primeiroAcessoPendente ? "CONFIRMAR_EMAIL" : undefined);
  if (primeiroAcessoPendente && etapa) {
    salvarSessaoPrimeiroAcesso(token, usuario, { etapa, ...primeiroAcesso });
  } else {
    salvarSessaoUsuario(token, usuario);
  }

  return { token, usuario, primeiroAcessoPendente, etapa };
}

type ResultadoLogin = {
  token: string;
  usuario: UsuarioLogado;
  primeiroAcessoPendente: boolean;
  etapa?: EtapaPrimeiroAcesso;
};

async function requisitarLogin(
  path: string,
  body: Record<string, string>,
  mensagemPadrao: string,
  tenantSobrescrito?: string,
): Promise<LoginResponseDTO> {
  const tenantSlug =
    tenantSobrescrito === undefined
      ? getTenantSlug()
      : normalizarTenantSlug(tenantSobrescrito);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }

  const text = await response.text();

  if (!response.ok) {
    let mensagem = text;
    try {
      const body = JSON.parse(text) as { message?: string; error?: string };
      mensagem = body.message ?? body.error ?? text;
    } catch {
      // Respostas legadas podem ser texto simples.
    }
    throw new Error(mensagem || mensagemPadrao);
  }

  let data: LoginResponseDTO;

  try {
    data = JSON.parse(text) as LoginResponseDTO;
  } catch {
    throw new Error("Resposta inválida do servidor ao realizar login.");
  }

  return data;
}

export function aplicarRespostaLogin(data: LoginResponseDTO): ResultadoLogin {
  const usuario = extrairUsuarioDaResposta(data);

  if (!usuario) {
    throw new Error("Dados do usuário não retornados corretamente no login.");
  }

  if (!usuario.userRole && data.userRole) usuario.userRole = data.userRole;
  if (!usuario.name && data.name) usuario.name = data.name;
  if (!usuario.login && data.login) usuario.login = data.login;
  if (!usuario.id && data.id) usuario.id = data.id;

  if (usuario.statusUsuario === "INATIVO") {
    limparSessaoUsuario();
    throw new Error("Usuário inativo. Entre em contato com o administrador.");
  }

  if (!usuario.userRole) {
    throw new Error("Perfil do usuário não retornado no login.");
  }

  return aplicarRespostaAutenticacao(data);
}

export async function loginUsuario(
  identificador: string,
  password: string,
  persistir = true,
): Promise<ResultadoLogin> {
  const data = await requisitarLogin(
    "/usuarios/login",
    { identificador: identificador.trim(), password },
    "Login ou senha inválidos.",
  );

  // Mantém o parâmetro histórico por compatibilidade; o fluxo de autenticação
  // atual usa armazenamento persistente para sobreviver ao refresh.
  void persistir;
  return aplicarRespostaLogin(data);
}

/**
 * O código OAuth do Google é enviado uma única vez ao backend e descartado.
 * A sessão persistida a seguir contém somente o JWT emitido pela Aurit.
 */
export async function loginComGoogle(
  codigoAutorizacao: string,
  tenantSobrescrito?: string,
): Promise<LoginResponseDTO> {
  if (!codigoAutorizacao || !codigoAutorizacao.trim()) {
    throw new Error("Não foi possível entrar com o Google. Tente novamente.");
  }

  return requisitarLogin(
    "/usuarios/login/google",
    { code: codigoAutorizacao },
    "Não foi possível acessar esta organização com essa conta.",
    tenantSobrescrito,
  );
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

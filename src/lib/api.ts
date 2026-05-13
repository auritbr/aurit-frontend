import { getStoredToken, limparSessaoUsuario } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function isFormData(body: RequestInit["body"]) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

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

  if (
    ["www", "admin", "api", "mail", "webmail", "cpanel"].includes(slug)
  ) {
    return "";
  }

  return slug;
}

async function readErrorMessage(response: Response, path: string) {
  try {
    const text = await response.text();

    if (!text) {
      return `Erro ${response.status} ao acessar ${path}`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao acessar ${path}`;
  }
}

function redirectToLogin() {
  limparSessaoUsuario();

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

function shouldLogoutByForbiddenMessage(message: string) {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    normalized.includes("empresa inativa") ||
    normalized.includes("sem acesso ao sistema") ||
    normalized.includes("usuario inativo") ||
    normalized.includes("token invalido") ||
    normalized.includes("token expirado") ||
    normalized.includes("sessao expirada")
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  const headers: HeadersInit = {
    ...(isFormData(options.body) ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const message = await readErrorMessage(response, path);

    redirectToLogin();

    throw new Error(
      message || "Token inválido ou expirado. Faça login novamente.",
    );
  }

  if (response.status === 403) {
    const message = await readErrorMessage(response, path);

    if (shouldLogoutByForbiddenMessage(message)) {
      redirectToLogin();
    }

    throw new Error(
      message || "Você não possui permissão para acessar esta área.",
    );
  }

  if (!response.ok) {
    const message = await readErrorMessage(response, path);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function buildArquivoUrl(urlArquivo?: string) {
  if (!urlArquivo?.trim()) return "";

  if (urlArquivo.startsWith("http://") || urlArquivo.startsWith("https://")) {
    return urlArquivo;
  }

  return `${API_URL}${urlArquivo.startsWith("/") ? urlArquivo : `/${urlArquivo}`}`;
}
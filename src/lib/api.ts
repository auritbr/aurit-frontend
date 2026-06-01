import { getStoredToken, limparSessaoUsuario } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  url: string;
  path: string;
  body: string;

  constructor({
    message,
    status,
    url,
    path,
    body,
  }: {
    message: string;
    status: number;
    url: string;
    path: string;
    body: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.path = path;
    this.body = body;
  }
}

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

  if (["www", "admin", "api", "mail", "webmail", "cpanel"].includes(slug)) {
    return "";
  }

  return slug;
}

async function readErrorPayload(response: Response, path: string) {
  try {
    const text = await response.text();

    if (!text) {
      const fallback = `Erro ${response.status} ao acessar ${path}`;

      return {
        body: "",
        message: fallback,
      };
    }

    try {
      const json = JSON.parse(text);

      return {
        body: text,
        message:
          json?.message ||
          json?.error ||
          json?.detail ||
          json?.mensagem ||
          text,
      };
    } catch {
      return {
        body: text,
        message: text,
      };
    }
  } catch {
    const fallback = `Erro ${response.status} ao acessar ${path}`;

    return {
      body: "",
      message: fallback,
    };
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
    normalized.includes("sessao expirada") ||
    normalized.includes("sessao nao encontrada") ||
    normalized.includes("sessao encerrada") ||
    normalized.includes("ja encerrada") ||
    normalized.includes("nao autenticado")
  );
}

function buildHeaders(options: RequestInit = {}) {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  const headers: HeadersInit = {
    ...(isFormData(options.body) ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
    ...(options.headers ?? {}),
  };

  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });

  if (response.status === 401) {
    const { body, message } = await readErrorPayload(response, path);

    redirectToLogin();

    throw new ApiError({
      status: response.status,
      url,
      path,
      body,
      message: message || "Token inválido ou expirado. Faça login novamente.",
    });
  }

  if (response.status === 403) {
    const { body, message } = await readErrorPayload(response, path);

    if (shouldLogoutByForbiddenMessage(message)) {
      redirectToLogin();
    }

    throw new ApiError({
      status: response.status,
      url,
      path,
      body,
      message: message || "Você não possui permissão para acessar esta área.",
    });
  }

  if (!response.ok) {
    const { body, message } = await readErrorPayload(response, path);

    throw new ApiError({
      status: response.status,
      url,
      path,
      body,
      message,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export function buildArquivoUrl(urlArquivo?: string) {
  if (!urlArquivo?.trim()) return "";

  if (urlArquivo.startsWith("http://") || urlArquivo.startsWith("https://")) {
    return urlArquivo;
  }

  return `${API_URL}${urlArquivo.startsWith("/") ? urlArquivo : `/${urlArquivo}`}`;
}

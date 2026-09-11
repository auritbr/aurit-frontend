import { getStoredToken, getTenantSlug, limparSessaoUsuario } from "@/lib/auth";
import {
  invalidateReportData,
  isDataMutation,
} from "@/lib/reportDataInvalidation";

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

async function readErrorPayload(response: Response, path: string) {
  try {
    const text = await response.text();

    if (!text) {
      const fallback = publicErrorMessage(response.status, path);

      return {
        body: "",
        message: fallback,
      };
    }

    try {
      const json = JSON.parse(text);

      return {
        body: text,
        message: publicErrorMessage(
          response.status,
          path,
          json?.message ||
            json?.error ||
            json?.detail ||
            json?.mensagem ||
            text,
        ),
      };
    } catch {
      return {
        body: text,
        message: publicErrorMessage(response.status, path, text),
      };
    }
  } catch {
    const fallback = publicErrorMessage(response.status, path);

    return {
      body: "",
      message: fallback,
    };
  }
}

function publicErrorMessage(status: number, path: string, rawMessage?: unknown) {
  const message = String(rawMessage ?? "").trim();
  const normalized = message.toLowerCase();
  const isTechnicalMessage =
    !message ||
    message.startsWith("<") ||
    /^(error|bad request|unauthorized|forbidden|not found|internal server error|external server error|service unavailable)$/i.test(
      message,
    ) ||
    /whitelabel|exception|stack trace|org\.springframework|hibernate|postgres|sqlstate|constraint.*violation/.test(
      normalized,
    );

  if (!isTechnicalMessage) {
    return message;
  }

  if (status === 0) {
    return "Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.";
  }
  if (status === 400) {
    return "Os dados informados são inválidos. Revise os campos e tente novamente.";
  }
  if (status === 401) {
    return "Sua sessão expirou. Faça login novamente para continuar.";
  }
  if (status === 403) {
    return "Você não possui permissão para realizar esta ação.";
  }
  if (status === 404) {
    return "O registro solicitado não foi encontrado.";
  }
  if (status === 409) {
    return "Não foi possível concluir a operação porque já existe um registro com esses dados.";
  }
  if (status >= 500) {
    return "Não foi possível concluir esta operação agora. Revise os dados e tente novamente.";
  }

  return `Não foi possível concluir a operação em ${path}. Tente novamente.`;
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

export async function apiFetchResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      cache: options.cache ?? "no-store",
      headers: buildHeaders(options),
    });
  } catch {
    throw new ApiError({
      status: 0,
      url,
      path,
      body: "",
      message: publicErrorMessage(0, path),
    });
  }

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

  if (isDataMutation(options.method)) {
    invalidateReportData(path);
  }

  return response;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetchResponse(path, options);

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

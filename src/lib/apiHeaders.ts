import { getStoredToken } from "@/lib/auth";

export function getTenantSlug() {
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

export function getJsonHeaders() {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
  };
}

export function getMultipartHeaders() {
  const token = getStoredToken();
  const tenantSlug = getTenantSlug();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
  };
}
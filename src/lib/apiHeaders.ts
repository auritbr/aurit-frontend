import { getStoredToken, getTenantSlug } from "@/lib/auth";

export { getTenantSlug };

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

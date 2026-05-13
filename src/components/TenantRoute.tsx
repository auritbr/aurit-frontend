import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getStoredUserRole, isAuthenticated } from "@/lib/auth";

export default function TenantRoute({
  children,
}: {
  children: ReactNode;
}) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = getStoredUserRole();

  if (role === "ADMIN_PROPRIETARIO") {
    return <Navigate to="/controle-proprietario/empresas" replace />;
  }

  return <>{children}</>;
}
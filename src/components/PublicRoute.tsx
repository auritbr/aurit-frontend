import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getStoredUserRole, isAuthenticated } from "@/lib/auth";

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  if (isAuthenticated()) {
    const role = getStoredUserRole();

    if (role === "ADMIN_PROPRIETARIO") {
      return <Navigate to="/controle-proprietario/empresas" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getStoredUserRole, isAuthenticated } from "@/lib/auth";
import {
  usuarioTemPermissao,
  type AcaoPermissao,
  type ModuloPermissao,
} from "@/lib/permissoes";

import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";

export interface RequiredPermission {
  modulo: ModuloPermissao;
  acao: AcaoPermissao;
}

interface ProtectedRouteWithPermissionProps {
  children: ReactNode;
  requiredPermission?: RequiredPermission;
  allowedRoles?: string[];
}

export default function ProtectedRouteWithPermission({
  children,
  requiredPermission,
  allowedRoles,
}: ProtectedRouteWithPermissionProps) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    let active = true;

    async function verificarAcesso() {
      try {
        const authenticated = isAuthenticated();

        if (!active) return;

        setLogged(authenticated);

        if (!authenticated) {
          setAllowed(false);
          return;
        }

        const userRole = getStoredUserRole();

        if (allowedRoles && allowedRoles.length > 0) {
          if (!userRole || !allowedRoles.includes(userRole)) {
            setAllowed(false);
            return;
          }
        }

        if (!requiredPermission) {
          setAllowed(true);
          return;
        }

        const permitido = await usuarioTemPermissao(
          requiredPermission.modulo,
          requiredPermission.acao,
        );

        if (!active) return;

        setAllowed(permitido);
      } catch (error) {
        console.error("Erro ao verificar permissão:", error);

        if (!active) return;

        setAllowed(false);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void verificarAcesso();

    return () => {
      active = false;
    };
  }, [
    requiredPermission?.modulo,
    requiredPermission?.acao,
    allowedRoles?.join(","),
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">Verificando permissões...</p>
      </div>
    );
  }

  if (!logged) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowed === false) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return <>{children}</>;
}

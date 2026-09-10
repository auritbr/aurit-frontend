import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getStoredUserRole, isAuthenticated } from "@/lib/auth";
import {
  getTipoPlanoAtual,
  isPlanoPagoOuCortesia,
  moduloExigePlanoPago,
} from "@/lib/plano";
import {
  usuarioTemPermissao,
  type AcaoPermissao,
  type ModuloPermissao,
} from "@/lib/permissoes";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
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
  const requiredModule = requiredPermission?.modulo;
  const requiredAction = requiredPermission?.acao;
  const allowedRolesKey = allowedRoles?.join(",") ?? "";

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [blockedByPlan, setBlockedByPlan] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    let active = true;

    async function verificarAcesso() {
      try {
        setBlockedByPlan(false);
        const authenticated = isAuthenticated();

        if (!active) return;

        setLogged(authenticated);

        if (!authenticated) {
          setAllowed(false);
          return;
        }

        const userRole = getStoredUserRole();

        const perfisPermitidos = allowedRolesKey.split(",").filter(Boolean);

        if (perfisPermitidos.length > 0) {
          if (!userRole || !perfisPermitidos.includes(userRole)) {
            setAllowed(false);
            return;
          }
        }

        if (!requiredModule || !requiredAction) {
          setAllowed(true);
          return;
        }

        if (moduloExigePlanoPago(requiredModule)) {
          const plano = await getTipoPlanoAtual();

          if (!active) return;

          // Falha fechada: sem confirmação de plano pago/cortesia, o recurso
          // restrito não é montado e nenhuma chamada da página é disparada.
          if (!isPlanoPagoOuCortesia(plano)) {
            setBlockedByPlan(true);
            setAllowed(false);
            return;
          }
        }

        const permitido = await usuarioTemPermissao(
          requiredModule,
          requiredAction,
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
  }, [requiredModule, requiredAction, allowedRolesKey]);

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
        {blockedByPlan ? <AccessNotPermitted /> : <AccessDenied />}
      </AppLayout>
    );
  }

  return <>{children}</>;
}

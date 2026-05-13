import { type ReactNode } from "react";
import {
  type AcaoPermissao,
  type ModuloPermissao,
} from "@/data/usuarios";
import { usePermissao } from "@/hooks/usePermissao";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";

interface PermissionGuardProps {
  modulo: ModuloPermissao;
  acao?: AcaoPermissao;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  modulo,
  acao = "VISUALIZAR",
  children,
  fallback,
}: PermissionGuardProps) {
  const { permitido, loading } = usePermissao(modulo, acao);

  if (loading) {
    return (
      <div className="container py-8">
        <p className="text-sm text-muted-foreground">
          Verificando permissões...
        </p>
      </div>
    );
  }

  if (!permitido) {
    return <>{fallback ?? <AccessNotPermitted />}</>;
  }

  return <>{children}</>;
}
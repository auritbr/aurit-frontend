import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  GoogleLoginButton,
  GoogleLoginMessageType,
} from "@/components/auth/GoogleLoginButton";
import {
  getTenantOrigin,
  isLocalhost,
  loginComGoogle,
  normalizarTenantSlug,
} from "@/lib/auth";

/**
 * Superfície técnica do domínio auth. Não contém branding ou um segundo botão:
 * o Google Identity Services é iniciado automaticamente pelo gesto que abriu
 * este popup a partir do tenant.
 */
export default function LoginGoogle() {
  const [params] = useSearchParams();
  const tenant = useMemo(
    () => normalizarTenantSlug(params.get("tenant")),
    [params],
  );
  const local = isLocalhost();
  const origemTenant = tenant
    ? getTenantOrigin(tenant)
    : local
      ? window.location.origin
      : null;
  const [erro, setErro] = useState<string | null>(
    origemTenant ? null : "Não foi possível iniciar o login com Google.",
  );
  const [carregando, setCarregando] = useState(false);

  const avisar = (type: string, payload?: Record<string, unknown>) => {
    if (window.opener && origemTenant)
      window.opener.postMessage({ type, ...payload }, origemTenant);
  };

  async function receberCodigoAutorizacao(codigo: string) {
    if ((!tenant && !local) || !origemTenant || carregando) return;
    setCarregando(true);
    try {
      const auth = await loginComGoogle(codigo, tenant || undefined);
      avisar(GoogleLoginMessageType.SUCCESS, { auth });
      window.close();
    } catch {
      const mensagem =
        "Não foi possível acessar esta organização com essa conta.";
      avisar(GoogleLoginMessageType.ERROR, { message: mensagem });
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  const cancelar = () => {
    avisar(GoogleLoginMessageType.CANCELLED);
    window.close();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <GoogleLoginButton
        processando={carregando}
        tenant={tenant}
        onAuthorizationCode={receberCodigoAutorizacao}
        onErro={setErro}
        onCancelado={cancelar}
        abrirAutomaticamente
        tecnico
      />
      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {carregando ? "Entrando com Google..." : "Conectando ao Google..."}
        </div>
      )}
    </main>
  );
}

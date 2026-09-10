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
 * Superfície técnica do domínio auth. O clique neste botão é necessário para
 * que o navegador autorize o popup OAuth oficial do Google nessa origem.
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
      <div className="w-full max-w-[320px]">
        <GoogleLoginButton
          processando={carregando}
          tenant={tenant}
          onAuthorizationCode={receberCodigoAutorizacao}
          onErro={setErro}
          onCancelado={cancelar}
          exibirSeparador={false}
        />
        {erro ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {erro}
          </p>
        ) : carregando ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Entrando com Google...
          </div>
        ) : null}
      </div>
    </main>
  );
}

import { Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleLoginButton";

interface Props {
  processando: boolean;
  desabilitado: boolean;
  onClick: () => Promise<void>;
}

export function NativeGoogleLoginButton({
  processando,
  desabilitado,
  onClick,
}: Props) {
  return (
    <>
      <div className="mt-4 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border/70" />
        <span className="text-[11px] text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border/70" />
      </div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={processando || desabilitado}
        aria-busy={processando || undefined}
        className="login-google-button mt-3 inline-flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[8px] text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
      >
        {processando ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        <span>
          {processando ? "Entrando com Google..." : "Continuar com Google"}
        </span>
      </button>
    </>
  );
}

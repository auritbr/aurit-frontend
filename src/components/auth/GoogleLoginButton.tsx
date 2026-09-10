import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getAuthCentralOrigin,
  getTenantSlug,
  isAuthCentralHost,
  isLocalhost,
  normalizarTenantSlug,
  type LoginResponseDTO,
} from "@/lib/auth";
import type {
  GoogleCodeResponse,
  GoogleCodeClient,
} from "@/types/google-identity";

const GSI_SRC = "https://accounts.google.com/gsi/client";
const GSI_SCRIPT_ID = "aurit-google-identity-services";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_LOGIN_CLIENT_ID as
  | string
  | undefined;
const SUCCESS = "AURIT_GOOGLE_LOGIN_SUCCESS";
const ERROR = "AURIT_GOOGLE_LOGIN_ERROR";
const CANCELLED = "AURIT_GOOGLE_LOGIN_CANCELLED";

let gsiPromise: Promise<void> | null = null;

function carregarGsi(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise<void>((resolve, reject) => {
    const existente = document.getElementById(
      GSI_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existente ?? document.createElement("script");
    script.addEventListener(
      "load",
      () =>
        window.google?.accounts?.oauth2
          ? resolve()
          : reject(new Error("GIS indisponível.")),
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error("Falha ao carregar o Google.")),
      { once: true },
    );

    if (!existente) {
      script.id = GSI_SCRIPT_ID;
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    gsiPromise = null;
    throw error;
  });

  return gsiPromise;
}

function GoogleIcon() {
  return (
    <svg
      className="h-[17px] w-[17px]"
      viewBox="0 0 18 18"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

interface Props {
  processando: boolean;
  desabilitado?: boolean;
  /** Recebe somente o authorization code efêmero do OAuth popup. */
  onAuthorizationCode?: (code: string) => Promise<void> | void;
  onSucessoPopup?: (auth: LoginResponseDTO) => Promise<void> | void;
  onErro?: (mensagem: string) => void;
  onCancelado?: () => void;
  tenant?: string;
  abrirAutomaticamente?: boolean;
  tecnico?: boolean;
}

export function GoogleLoginButton({
  processando,
  desabilitado = false,
  onAuthorizationCode,
  onSucessoPopup,
  onErro,
  onCancelado,
  tenant,
  abrirAutomaticamente = false,
  tecnico = false,
}: Props) {
  const central =
    (isAuthCentralHost() || isLocalhost()) && Boolean(onAuthorizationCode);
  const tenantSlug = normalizarTenantSlug(tenant ?? getTenantSlug());
  const [pronto, setPronto] = useState(false);
  const [aguardando, setAguardando] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const codigoEmUso = useRef(false);
  const fluxoAutomaticoIniciado = useRef(false);
  const codeClientRef = useRef<GoogleCodeClient | null>(null);
  const abrirPopupRef = useRef<(() => void) | undefined>(undefined);
  const authorizationCodeRef = useRef(onAuthorizationCode);
  const sucessoRef = useRef(onSucessoPopup);
  const erroRef = useRef(onErro);
  const canceladoRef = useRef(onCancelado);
  authorizationCodeRef.current = onAuthorizationCode;
  sucessoRef.current = onSucessoPopup;
  erroRef.current = onErro;
  canceladoRef.current = onCancelado;

  useEffect(() => {
    if (!central || !CLIENT_ID) return;

    let ativo = true;
    carregarGsi()
      .then(() => {
        if (!ativo || !window.google?.accounts?.oauth2) return;

        codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          // Força a interface oficial completa de escolha de conta.
          select_account: true,
          callback: (response: GoogleCodeResponse) => {
            setAguardando(false);
            if (!response.code || codigoEmUso.current) {
              if (response.error) {
                erroRef.current?.(
                  "Não foi possível entrar com o Google. Tente novamente.",
                );
              }
              return;
            }

            codigoEmUso.current = true;
            void Promise.resolve(
              authorizationCodeRef.current?.(response.code),
            ).finally(() => {
              codigoEmUso.current = false;
            });
          },
          error_callback: (error) => {
            setAguardando(false);
            if (error.type === "popup_closed") {
              canceladoRef.current?.();
              return;
            }
            erroRef.current?.(
              "Não foi possível abrir o login com Google. Tente novamente.",
            );
          },
        });
        setPronto(true);
      })
      .catch(
        () =>
          ativo &&
          erroRef.current?.(
            "Não foi possível carregar o acesso com Google. Tente novamente.",
          ),
      );

    return () => {
      ativo = false;
      codeClientRef.current = null;
    };
  }, [central]);

  useEffect(() => {
    if (central) return;

    const origemAuth = getAuthCentralOrigin();
    let timer: number | undefined;
    const limpar = () => {
      window.removeEventListener("message", receber);
      if (timer) window.clearInterval(timer);
      timer = undefined;
      popupRef.current = null;
      setAguardando(false);
    };
    const receber = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== origemAuth ||
        event.source !== popupRef.current ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      const data = event.data as {
        type?: string;
        auth?: LoginResponseDTO;
        message?: string;
      };
      if (data.type === SUCCESS && data.auth) {
        limpar();
        void Promise.resolve(sucessoRef.current?.(data.auth)).catch(() =>
          erroRef.current?.(
            "Não foi possível concluir o acesso. Tente novamente.",
          ),
        );
      } else if (data.type === ERROR) {
        limpar();
        erroRef.current?.(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível acessar esta organização com essa conta.",
        );
      } else if (data.type === CANCELLED) {
        limpar();
        canceladoRef.current?.();
      }
    };

    abrirPopupRef.current = () => {
      if (!tenantSlug && !isLocalhost()) {
        erroRef.current?.(
          "Não foi possível identificar a organização para o login com Google.",
        );
        return;
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.focus();
        return;
      }

      const largura = 500;
      const altura = 650;
      const esquerda = Math.max(
        0,
        Math.round(window.screenX + (window.outerWidth - largura) / 2),
      );
      const topo = Math.max(
        0,
        Math.round(window.screenY + (window.outerHeight - altura) / 2),
      );
      const queryTenant = tenantSlug
        ? `?tenant=${encodeURIComponent(tenantSlug)}`
        : "";
      const popup = window.open(
        `${origemAuth}/login/google${queryTenant}`,
        "auritGoogleLogin",
        `popup=yes,width=${largura},height=${altura},left=${esquerda},top=${topo},noopener=no`,
      );
      if (!popup) {
        erroRef.current?.(
          "Não foi possível abrir o login com Google. Verifique se o navegador bloqueou a janela.",
        );
        return;
      }

      popupRef.current = popup;
      window.addEventListener("message", receber);
      setAguardando(true);
      timer = window.setInterval(() => {
        if (popup.closed) {
          limpar();
          canceladoRef.current?.();
        }
      }, 500);
    };

    return limpar;
  }, [central, tenantSlug]);

  const abrir = useCallback(() => {
    if (processando || desabilitado) return;
    if (!central) {
      abrirPopupRef.current?.();
      return;
    }
    if (!codeClientRef.current || !pronto) return;

    setAguardando(true);
    // API OAuth Code Model oficial: abre a janela completa de seleção de conta.
    codeClientRef.current.requestCode();
  }, [central, desabilitado, processando, pronto]);

  useEffect(() => {
    if (
      !abrirAutomaticamente ||
      !central ||
      !pronto ||
      fluxoAutomaticoIniciado.current
    )
      return;
    fluxoAutomaticoIniciado.current = true;
    abrir();
  }, [abrir, abrirAutomaticamente, central, pronto]);

  const semConfiguracao = central && !CLIENT_ID;
  const ocupado = processando || aguardando;
  if (tecnico) return null;

  return (
    <>
      <div className="mt-4 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border/70" />
        <span className="text-[11px] text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border/70" />
      </div>
      <button
        type="button"
        onClick={abrir}
        disabled={
          ocupado || desabilitado || semConfiguracao || (central && !pronto)
        }
        aria-busy={processando || undefined}
        title={
          semConfiguracao
            ? "Login com Google aguardando configuração."
            : undefined
        }
        className="login-google-button mt-3 inline-flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[8px] text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
      >
        {processando ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        <span>
          {processando
            ? "Entrando com Google..."
            : aguardando && !central
              ? "Aguardando Google..."
              : "Continuar com Google"}
        </span>
      </button>
    </>
  );
}

export const GoogleLoginMessageType = { SUCCESS, ERROR, CANCELLED } as const;

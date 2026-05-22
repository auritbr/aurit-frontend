import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentos, isDocumentoVencido } from "@/data/documentos";
import { isPlanoAccessDenied } from "@/lib/access";
import { isPlanoGratuitoAtual } from "@/lib/plano";

const SESSION_KEY = "documentos.vencidos.dismissed";

export function DocumentosVencidosNotifier() {
  const location = useLocation();
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        if (await isPlanoGratuitoAtual()) {
          if (mounted) {
            setCount(0);
          }

          return;
        }

        const documentos = await getDocumentos();

        const vencidos = documentos.filter(
          (doc) =>
            doc.statusDocumento !== "NAO_SE_APLICA" &&
            isDocumentoVencido(doc),
        ).length;

        if (mounted) {
          setCount(vencidos);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao buscar documentos.";

        if (!isPlanoAccessDenied(message)) {
          console.error("Erro ao buscar documentos vencidos:", error);
        }

        if (mounted) {
          setCount(0);
        }
      }
    }

    void refresh();

    const handleChanged = () => {
      void refresh();
    };

    window.addEventListener("documentos:changed", handleChanged);

    return () => {
      mounted = false;
      window.removeEventListener("documentos:changed", handleChanged);
    };
  }, []);

  const onDocumentosPage = location.pathname.startsWith("/documentos");
  const onLogin = location.pathname.startsWith("/login");
  const onControleProprietario = location.pathname.startsWith(
    "/controle-proprietario",
  );

  if (
    dismissed ||
    count === 0 ||
    onDocumentosPage ||
    onLogin ||
    onControleProprietario
  ) {
    return null;
  }

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignora erro de storage
    }

    setDismissed(true);
  };

  const handleGo = () => {
    handleDismiss();
    navigate("/documentos");
  };

  return (
    <div
      role="alert"
      className="
        fixed bottom-4 right-4 z-50
        w-[min(390px,calc(100vw-2rem))]
        overflow-hidden rounded-xl
        border border-red-200/80
        bg-white
        shadow-[0_18px_45px_-24px_hsl(215_28%_17%_/_0.28),0_0_0_1px_hsl(0_72%_45%_/_0.04)]
        animate-in slide-in-from-bottom-4 fade-in duration-300
      "
    >
      <div className="h-1 w-full bg-red-500" />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="
              flex h-9 w-9 flex-shrink-0 items-center justify-center
              rounded-full border border-red-200
              bg-red-50 text-red-600
            "
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              Há documentos vencidos na organização.
            </p>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Atualize esses documentos para manter a organização preparada para
              editais, relatórios e prestações de contas.
            </p>

            <span
              className="
                mt-2 inline-flex items-center rounded-md
                border border-red-200 bg-red-50/70
                px-2 py-1 text-xs font-semibold text-red-700
              "
            >
              {count} documento{count > 1 ? "s" : ""} vencido
              {count > 1 ? "s" : ""}.
            </span>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleGo}
                className="
                  h-8 bg-red-600 text-white
                  shadow-sm shadow-red-900/10
                  hover:bg-red-700
                  focus-visible:ring-red-500
                "
              >
                Ver documentos
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="
                  h-8 text-slate-600
                  hover:bg-slate-100 hover:text-slate-900
                "
              >
                Mais tarde
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar notificação"
            className="
              flex-shrink-0 rounded-md p-1
              text-slate-400 transition-colors
              hover:bg-slate-100 hover:text-slate-700
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

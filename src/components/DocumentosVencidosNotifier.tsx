import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDateBR,
  getDocumentos,
  isDocumentoVencido,
  tipoDocumentoLabels,
  type Documento,
} from "@/data/documentos";
import { isPlanoAccessDenied } from "@/lib/access";
import { isPlanoGratuitoAtual } from "@/lib/plano";

const SESSION_KEY = "documentos.vencidos.dismissed";

interface DocumentosVencidosNotifierProps {
  onHeightChange?: (height: number) => void;
}

export function DocumentosVencidosNotifier({
  onHeightChange,
}: DocumentosVencidosNotifierProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const notifierRef = useRef<HTMLDivElement>(null);

  const [documentosVencidos, setDocumentosVencidos] = useState<Documento[]>([]);
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
            setDocumentosVencidos([]);
          }

          return;
        }

        const documentos = await getDocumentos();

        const vencidos = (Array.isArray(documentos) ? documentos : []).filter(
          (doc) =>
            doc.statusDocumento !== "NAO_SE_APLICA" &&
            isDocumentoVencido(doc),
        );

        if (mounted) {
          setDocumentosVencidos(vencidos);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao buscar documentos.";

        if (!isPlanoAccessDenied(message)) {
          console.error("Erro ao buscar documentos vencidos:", error);
        }

        if (mounted) {
          setDocumentosVencidos([]);
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

  const visible = !(
    dismissed ||
    documentosVencidos.length === 0 ||
    onDocumentosPage ||
    onLogin ||
    onControleProprietario
  );

  useLayoutEffect(() => {
    const element = notifierRef.current;

    if (!visible || !element) {
      onHeightChange?.(0);
      return;
    }

    const updateHeight = () => {
      onHeightChange?.(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => {
      observer.disconnect();
      onHeightChange?.(0);
    };
  }, [onHeightChange, visible]);

  if (!visible) {
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

  const itensTopo = documentosVencidos.slice(0, 2);
  const count = documentosVencidos.length;

  return (
    <div
      ref={notifierRef}
      role="alert"
      className="fixed bottom-4 right-4 z-50 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-rose-200 bg-rose-50/80 shadow-md animate-in slide-in-from-bottom-4 fade-in duration-300 dark:border-rose-900/50 dark:bg-rose-950/30"
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-1 bg-rose-400 dark:bg-rose-500"
        aria-hidden
      />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar alerta"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="py-4 pl-5 pr-10">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            Prazo vencido
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-900/40">
            <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">
              Documentos vencidos
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Atualize esses documentos para manter a organização preparada para
              editais, relatórios e prestações de contas.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 rounded-md border border-border/60 bg-background/70 px-3 py-2">
          {itensTopo.map((documento) => (
            <div key={documento.id} className="space-y-0.5 text-[12px]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground">Documento:</span>
                <span className="truncate font-medium text-foreground">
                  {tipoDocumentoLabels[documento.tipoDocumento] ??
                    documento.tipoDocumento}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground">Validade:</span>
                <span className="text-foreground">
                  {formatDateBR(documento.dataValidade)}
                </span>
              </div>
            </div>
          ))}
          {count > itensTopo.length && (
            <p className="border-t border-border/60 pt-1 text-[11px] text-muted-foreground">
              +{count - itensTopo.length} outro
              {count - itensTopo.length > 1 ? "s itens" : " item"} na lista
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={handleGo} className="h-8">
            Ver documentos
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}

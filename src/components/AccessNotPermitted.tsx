import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessNotPermittedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

/**
 * Reusable "AccessNotPermitted" screen. Use as the rendered content
 * of any page/module when the current user lacks permission or the current plan does not include the feature.
 */
export function AccessNotPermitted({
  title = "Funcionalidade indisponível para o seu acesso atual.",
  message = "Esta funcionalidade pode não estar incluída no plano da organização ou pode exigir permissões específicas de acesso. Caso precise utilizar este recurso, entre em contato com o administrador.",
  showBackButton = true,
}: AccessNotPermittedProps) {
  const navigate = useNavigate();

  return (
    <section
      role="region"
      aria-label="Funcionalidade indisponível"
      className="px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-[18px] border border-border/70 bg-card/75 p-8 text-center shadow-[0_2px_14px_-10px_hsl(215_28%_17%_/_0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60 sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary-soft/60 backdrop-blur-sm supports-[backdrop-filter]:bg-primary-soft/45">
            <ShieldAlert className="h-7 w-7 text-primary" strokeWidth={2} />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {message}
          </p>

          {showBackButton && (
            <div className="mt-7 flex items-center justify-center">
              <Button
                variant="glassSecondary"
                onClick={() => navigate(-1)}
                className="h-9 gap-2 px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

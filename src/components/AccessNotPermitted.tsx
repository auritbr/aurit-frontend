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
      className="px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-primary-soft">
            <ShieldAlert className="h-7 w-7 text-primary" strokeWidth={2} />
          </div>

          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h1>

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>

          {showBackButton && (
            <div className="mt-7 flex items-center justify-center">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="gap-2"
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
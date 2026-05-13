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
 * of any page/module when the current user lacks permission.
 */
export function AccessNotPermitted({
  title = "Acesso não disponível.",
  message = "Você não possui permissão para acessar esta funcionalidade no momento. Se precisar, entre em contato com o administrador.",
  showBackButton = true,
}: AccessNotPermittedProps) {
  const navigate = useNavigate();

  return (
    <section
      role="region"
      aria-label="Acesso negado"
      className="px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-border bg-card p-8 sm:p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft border border-primary/15">
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

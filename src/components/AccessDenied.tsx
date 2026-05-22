import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

/**
 * Aviso reutilizável para bloqueio de acesso por plano.
 * Deve ser renderizado dentro do conteúdo da página, preferencialmente dentro do AppLayout.
 */
export function AccessDenied({
  title = "Este módulo faz parte do Plano Profissional.",
  message = "Entre em contato com nossa equipe para saber como ativar e acessar todas as funcionalidades.",
  showBackButton = true,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div
      role="region"
      aria-label="Módulo indisponível no plano atual"
      className="rounded-lg border border-border bg-card px-6 py-12 text-center shadow-sm"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-primary-soft">
        <ShieldAlert className="h-7 w-7 text-primary" strokeWidth={2} />
      </div>

      <h2 className="mx-auto max-w-2xl text-xl font-semibold text-foreground sm:text-2xl">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
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
  );
}
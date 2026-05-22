import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

/**
 * Componente reutilizável para telas de acesso restrito.
 * Use quando o usuário não tiver permissão ou quando o módulo
 * não estiver disponível para o plano atual.
 */
export function AccessDenied({
  title = "Acesso não disponível para este módulo.",
  message = "O acesso a esta funcionalidade pode depender das permissões do seu usuário ou do plano contratado pela organização. Caso precise utilizar este módulo, entre em contato com o administrador da conta ou com a equipe da Aurit.",
  showBackButton = true,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <section
      role="region"
      aria-label="Acesso restrito"
      className="px-4 py-10 sm:px-6 lg:px-8"
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
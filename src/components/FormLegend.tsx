import { HelpTooltipTrigger } from "@/components/HelpTooltipTrigger";

interface FormLegendProps {
  className?: string;
}

/**
 * Bloco informativo exibido acima dos formulários, com orientações
 * sobre campos obrigatórios e sobre o ícone de ajuda.
 */
export function FormLegend({ className = "" }: FormLegendProps) {
  return (
    <div
      className={`mb-5 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-destructive" aria-hidden>
          *
        </span>
        Campos com{" "}
        <span className="font-semibold text-destructive" aria-hidden>
          *
        </span>{" "}
        são obrigatórios.
      </span>
      <span className="flex items-center gap-2">
        <HelpTooltipTrigger decorative />O ícone de ajuda apresenta orientações
        para o preenchimento de cada campo.
      </span>
    </div>
  );
}

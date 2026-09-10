import { CircleHelpIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WikiFloatingButtonProps {
  pageTitle?: string;
  /** Mantido por compatibilidade com chamadas existentes. */
  sections?: { title: string; content: string }[];
  /** URL da central de ajuda. Caminhos /wiki são resolvidos no site da Aurit. */
  href?: string;
}

/**
 * Botão flutuante da Wiki — liquid glass leve, fixo no meio da borda direita.
 * Diâmetro visível: 44px (mobile) / 46px (tablet) / 48px (desktop).
 */
export function WikiFloatingButton({
  pageTitle,
  href = "https://www.aurit.com.br/wiki",
}: WikiFloatingButtonProps) {
  const resolvedHref = href.startsWith("/wiki")
    ? `https://www.aurit.com.br${href}`
    : href;

  function handleOpenWiki() {
    window.open(resolvedHref, "_blank", "noopener,noreferrer");
  }

  const accessibleLabel = pageTitle
    ? `Acessar ajuda sobre ${pageTitle}`
    : "Acessar central de ajuda";

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleOpenWiki}
          aria-label={accessibleLabel}
          className="group fixed right-3 top-[40%] z-40 -translate-y-1/2 sm:right-4 flex items-center justify-center rounded-full p-1.5 [padding-bottom:max(0.375rem,env(safe-area-inset-bottom))] focus-visible:outline-none"
        >
          <span className="wiki-fab-glass flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 group-hover:-translate-y-[1px] group-active:translate-y-0 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:h-[46px] sm:w-[46px] lg:h-12 lg:w-12">
            <CircleHelpIcon
              className="h-5 w-5 sm:h-[22px] sm:w-[22px]"
              strokeWidth={2.1}
            />
          </span>
          <span className="sr-only">{accessibleLabel}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {pageTitle ? `Ajuda: ${pageTitle}` : "Acessar central de ajuda"}
      </TooltipContent>
    </Tooltip>
  );
}

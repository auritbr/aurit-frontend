import { MessageCircleQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WikiFloatingButtonProps {
  pageTitle?: string;
  sections?: { title: string; content: string }[];
  href?: string;
}

/**
 * Botão flutuante de ajuda.
 * Abre a página específica da Wiki em nova aba.
 */
export function WikiFloatingButton({
  pageTitle,
  href = "https://www.aurit.com.br/wiki",
}: WikiFloatingButtonProps) {
  function handleOpenWiki() {
    console.log("Abrindo Wiki:", href);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleOpenWiki}
          aria-label={
            pageTitle
              ? `Acessar ajuda sobre ${pageTitle}`
              : "Acessar central de ajuda"
          }
          className="group fixed right-4 sm:right-5 top-1/2 -translate-y-1/2 z-[9999] h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary-hover transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 border border-primary-hover/30 pointer-events-auto"
        >
          <MessageCircleQuestion
            className="h-5 w-5 sm:h-6 sm:w-6"
            strokeWidth={2.2}
          />

          <span className="sr-only">
            {pageTitle
              ? `Acessar ajuda sobre ${pageTitle}`
              : "Acessar central de ajuda"}
          </span>
        </button>
      </TooltipTrigger>

      <TooltipContent side="left">
        {pageTitle ? `Ajuda: ${pageTitle}` : "Acessar central de ajuda"}
      </TooltipContent>
    </Tooltip>
  );
}
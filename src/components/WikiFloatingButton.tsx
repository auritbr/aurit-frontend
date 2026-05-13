import { MessageCircleQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WikiFloatingButtonProps {
  /**
   * Nome da página atual.
   * Usado para gerar uma mensagem contextual no WhatsApp.
   * Ex.: "Participantes", "Projetos", "Financeiro".
   */
  pageTitle?: string;

  /** Mantido por compatibilidade com chamadas existentes. */
  sections?: { title: string; content: string }[];

  /**
   * URL alternativa.
   * Se informado, o botão usa esse href diretamente.
   * Caso contrário, gera o link do WhatsApp.
   */
  href?: string;

  /**
   * Número do WhatsApp com DDI e DDD, sem espaços, traços ou parênteses.
   * Ex.: 5532999999999
   */
  whatsappNumber?: string;
}

/**
 * Botão flutuante de ajuda.
 *
 * Por padrão, gera um link contextual para WhatsApp com base na página atual.
 * Caso a propriedade href seja informada, usa o href diretamente.
 */
export function WikiFloatingButton({
  pageTitle,
  href,
  whatsappNumber = "5532999168570",
}: WikiFloatingButtonProps) {
  const mensagem = pageTitle
    ? `Olá! Estou usando o sistema Aurit e preciso de ajuda na página ${pageTitle}. Minha dúvida é sobre:`
    : "Olá! Estou usando o sistema Aurit e preciso de ajuda. Minha dúvida é sobre:";

  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    mensagem
  )}`;

  const finalHref = href ?? whatsappHref;

  const isExternal = /^https?:\/\//i.test(finalHref);

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <a
          href={finalHref}
          target="_blank"
          rel={isExternal ? "noopener noreferrer" : "noopener"}
          aria-label={
            pageTitle
              ? `Solicitar ajuda sobre a página ${pageTitle}`
              : "Solicitar ajuda pelo WhatsApp"
          }
          className="group fixed right-4 sm:right-5 top-1/2 -translate-y-1/2 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary-hover transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 border border-primary-hover/30 wiki-bubble"
        >
          <MessageCircleQuestion
            className="h-5 w-5 sm:h-6 sm:w-6"
            strokeWidth={2.2}
          />
          <span className="sr-only">
            {pageTitle
              ? `Solicitar ajuda sobre a página ${pageTitle}`
              : "Solicitar ajuda pelo WhatsApp"}
          </span>
        </a>
      </TooltipTrigger>

      <TooltipContent side="left">
        {pageTitle ? `Dúvida sobre ${pageTitle}?` : "Precisa de ajuda?"}
      </TooltipContent>
    </Tooltip>
  );
}
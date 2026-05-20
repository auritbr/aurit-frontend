import { BookOpenText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * Botão flutuante de ajuda/wiki.
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
    mensagem,
  )}`;

  const finalHref = href ?? whatsappHref;
  const isExternal = /^https?:\/\//i.test(finalHref);

  const ariaLabel = pageTitle
    ? `Acessar ajuda sobre a página ${pageTitle}`
    : "Acessar ajuda da Aurit";

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <a
          href={finalHref}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          aria-label={ariaLabel}
          className="
  group fixed right-4 sm:right-5 top-[70%] z-40
  flex h-11 w-11 sm:h-12 sm:w-12
  -translate-y-1/2 items-center justify-center
  rounded-full border border-white/10
  bg-[#0D3821]
  text-white
  shadow-[0_12px_30px_-16px_rgba(13,56,33,0.85)]
  transition-all duration-200
  hover:-translate-y-[calc(50%+2px)]
  hover:bg-[#123F27]
  hover:shadow-[0_16px_36px_-18px_rgba(13,56,33,0.95)]
  active:scale-95
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-primary/30
  wiki-bubble
"
        >
          <BookOpenText
            className="h-[18px] w-[18px] sm:h-5 sm:w-5"
            strokeWidth={2.1}
          />

          <span className="sr-only">{ariaLabel}</span>
        </a>
      </TooltipTrigger>

      <TooltipContent side="left">
        {pageTitle ? `Ajuda sobre ${pageTitle}` : "Ajuda da Aurit"}
      </TooltipContent>
    </Tooltip>
  );
}
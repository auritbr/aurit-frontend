import { cn } from "@/lib/utils";

interface SectionDescriptionProps {
  text: string;
  /** Classe de largura máxima (ex.: "max-w-2xl"). */
  maxWidth?: string;
  className?: string;
}

/**
 * Descrição curta exibida abaixo do título de uma seção de formulário.
 * Sem fundo próprio, tipografia secundária e espaçamento padronizado.
 */
export function SectionDescription({
  text,
  maxWidth = "max-w-2xl",
  className,
}: SectionDescriptionProps) {
  return (
    <p
      className={cn(
        "text-[12.5px] leading-relaxed text-muted-foreground",
        maxWidth,
        className,
      )}
    >
      {text}
    </p>
  );
}

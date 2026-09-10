import { useCallback, useId, useRef, useState } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpTooltipTrigger } from "@/components/HelpTooltipTrigger";

interface FieldTooltipProps {
  /** Conteúdo da orientação de preenchimento. */
  text: string;
  /** Nome do campo, usado no aria-label do ícone. */
  fieldLabel?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  /** Id do elemento de conteúdo, para uso com aria-describedby no campo. */
  id?: string;
}

/** Largura máxima usada para decidir se há espaço lateral suficiente. */
const TOOLTIP_WIDTH = 300;

/**
 * Ícone de ajuda circular padronizado + tooltip em estilo "liquid glass" refinado.
 *
 * Abre no hover, no foco por teclado e no clique/toque (mobile),
 * fecha com Escape ou clique fora, e permanece aberto quando o cursor
 * se move para o conteúdo. Reposiciona-se automaticamente para não
 * ultrapassar os limites da tela.
 *
 * Dentro de dialogs/modais o tooltip abre à direita do ícone (ou abaixo,
 * quando não há espaço lateral) para nunca invadir o cabeçalho do modal.
 */
export function FieldTooltip({
  text,
  fieldLabel,
  side,
  align = "start",
  className,
  id,
}: FieldTooltipProps) {
  const autoId = useId();
  const contentId = id ?? `tooltip-${autoId}`;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [autoSide, setAutoSide] = useState<"top" | "right" | "bottom" | "left">(
    "top",
  );
  const [insideDialog, setInsideDialog] = useState(false);

  const resolvePlacement = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const inDialog = !!el.closest('[role="dialog"], [role="alertdialog"]');
    setInsideDialog(inDialog);
    if (!inDialog) return;
    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    setAutoSide(spaceRight >= TOOLTIP_WIDTH + 16 ? "right" : "bottom");
  }, []);

  const resolvedSide = side ?? (insideDialog ? autoSide : "top");
  const resolvedAlign =
    insideDialog && !side ? (autoSide === "right" ? "center" : "start") : align;

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const el = triggerRef.current;
          // Ignora aberturas por foco programático (ex.: foco inicial de um Dialog).
          // Só abre com hover, clique/toque ou foco por teclado (:focus-visible).
          if (el && !el.matches(":hover") && !el.matches(":focus-visible"))
            return;
          resolvePlacement();
        }
        setOpen(next);
      }}
      delayDuration={120}
      disableHoverableContent={false}
    >
      <TooltipTrigger asChild>
        <HelpTooltipTrigger
          ref={triggerRef}
          label={
            fieldLabel
              ? `Abrir ajuda sobre ${fieldLabel}`
              : "Abrir ajuda sobre este campo"
          }
          aria-describedby={open ? contentId : undefined}
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault();
            resolvePlacement();
            setOpen((prev) => !prev);
          }}
          className={className}
        />
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent
          id={contentId}
          role="tooltip"
          side={resolvedSide}
          align={resolvedAlign}
          sideOffset={8}
          collisionPadding={12}
          avoidCollisions
          className="z-[60] max-w-[min(18.75rem,calc(100vw-2.5rem))] rounded-[13px] border border-border/50 bg-card/90 px-3 py-2 shadow-[0_8px_22px_-12px_hsl(215_28%_17%_/_0.25),0_1px_4px_-2px_hsl(215_28%_17%_/_0.10)] backdrop-blur-md duration-150 supports-[backdrop-filter]:bg-card/80 motion-reduce:animate-none motion-reduce:transition-none"
        >
          <p className="whitespace-normal break-words text-[12.5px] leading-relaxed text-foreground">
            {text}
          </p>
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}

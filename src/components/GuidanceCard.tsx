import { Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuidanceCardProps {
  /** Título principal do card. */
  title?: string;
  /** Texto introdutório da orientação. */
  description: string;
  /** Subtítulo exibido antes da lista. */
  listTitle?: string;
  /** Itens da lista de orientação (perguntas, passos, lembretes). */
  items?: string[];
  icon?: LucideIcon;
  className?: string;
}

/**
 * Card de orientação — mesmo acabamento liquid glass das demais seções,
 * com tonalidade azul-lilás muito suave para diferenciar orientação de
 * alerta ou erro. Reutilizável em formulários longos.
 */
export function GuidanceCard({
  title = "Objetivo da página",
  description,
  listTitle,
  items,
  icon: Icon = Lightbulb,
  className,
}: GuidanceCardProps) {
  return (
    <section
      aria-labelledby="guidance-card-title"
      className={cn(
        "rounded-[18px] border border-primary/20 bg-primary/[0.05] px-[18px] py-[18px] shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.07),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/[0.045] sm:px-5 sm:py-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-primary/25 bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="guidance-card-title"
            className="text-[13.5px] font-semibold leading-tight text-foreground"
          >
            {title}
          </h2>
          <p className="mt-1.5 whitespace-normal break-words text-[13px] leading-[1.55] text-muted-foreground sm:text-[13.5px]">
            {description}
          </p>

          {listTitle && items && items.length > 0 && (
            <>
              <h3 className="mt-3.5 text-[12px] font-semibold uppercase tracking-wide text-foreground/80">
                {listTitle}
              </h3>
              <ul className="mt-2 grid list-disc gap-1 pl-4 text-[13px] leading-[1.5] text-muted-foreground marker:text-primary/50 sm:text-[13.5px]">
                {items.map((item) => (
                  <li key={item} className="[overflow-wrap:anywhere]">
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

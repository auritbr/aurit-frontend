import { X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleProgressBar } from "@/components/journey/ModuleProgressBar";
import { JourneyPageLink } from "@/components/journey/JourneyPageLink";
import {
  journeyStateBadge,
  journeyStateLabel,
  stepLabel,
} from "@/components/journey/journeyStatus";
import { cn } from "@/lib/utils";
import type { JourneyModule } from "@/data/journey";

export interface JourneyModuleModalProps {
  module: JourneyModule | null;
  step: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (route: string) => void;
}

/** Modal compacto com os detalhes e as páginas internas de um módulo da jornada. */
export function JourneyModuleModal({
  module,
  step,
  open,
  onOpenChange,
  onNavigate,
}: JourneyModuleModalProps) {
  if (!module) return null;

  const Icon = module.icon;
  const label = journeyStateLabel[module.state];
  const etapasTexto = `${module.etapasConcluidas} de ${module.etapasTotal} ${
    module.etapasTotal === 1 ? "etapa" : "etapas"
  } ${module.etapasConcluidas === 1 ? "concluída" : "concluídas"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-modal="true"
        className="journey-glass max-h-[80vh] w-[calc(100vw-2rem)] max-w-[640px] gap-0 overflow-y-auto rounded-[22px] border-border/70 p-5 shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.35)] [&>button]:hidden"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] border border-border/70 bg-primary-soft text-primary"
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground tabular-nums">
              {step}
            </p>
            <DialogTitle className="text-[16px] font-semibold leading-tight text-foreground">
              {module.title}
            </DialogTitle>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[12.5px] font-semibold text-foreground tabular-nums">
                {module.percentual}%
              </span>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold",
                  journeyStateBadge[module.state],
                )}
              >
                {label}
              </span>
            </p>
          </div>

          <DialogClose
            aria-label="Fechar detalhes do módulo"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        <div className="mt-4 space-y-1.5">
          <ModuleProgressBar
            value={module.percentual}
            state={module.state}
            label={`${module.title}: ${module.percentual}% preenchido — ${label}`}
          />
          <p className="text-[11.5px] font-medium text-muted-foreground tabular-nums">
            {etapasTexto}
          </p>
        </div>

        <DialogDescription className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">
          {module.helper}
        </DialogDescription>

        <ul
          className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
          aria-label={`Etapas do módulo ${module.title}`}
        >
          {module.items.map((item, index) => (
            <JourneyPageLink
              key={item.route + item.label}
              item={item}
              step={stepLabel(index)}
              onNavigate={(route) => {
                onOpenChange(false);
                onNavigate(route);
              }}
            />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

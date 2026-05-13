import { CheckCircle2, ChevronRight, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

interface JourneyStageCardProps {
  title: string;
  description: string;
  modules: string[];
  microcopy: string;
  cta: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast: boolean;
  stepNumber: number;
  route: string;
  accentColor: string;
  borderColor: string;
  surfaceColor: string;
  onNavigate: (route: string) => void;
}

export function JourneyStageCard({
  title,
  description,
  modules,
  microcopy,
  cta,
  icon: Icon,
  isCompleted,
  isCurrent,
  isLast,
  stepNumber,
  route,
  accentColor,
  borderColor,
  surfaceColor,
  onNavigate,
}: JourneyStageCardProps) {
  const statusLabel = isCompleted ? "Concluída" : isCurrent ? "Etapa atual" : "Ainda não iniciada";

  return (
    <div className="relative pl-14 sm:pl-16">
      {!isLast && <div className="absolute left-[1.1rem] top-11 h-[calc(100%+1rem)] w-px bg-border sm:left-[1.35rem]" />}

      <div
        className="absolute left-0 top-5 flex h-9 w-9 items-center justify-center rounded-full border bg-card text-sm font-semibold sm:h-11 sm:w-11"
        style={{ borderColor, color: accentColor }}
      >
        {isCompleted ? <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={2.2} /> : stepNumber}
      </div>

      <article
        className="rounded-lg border p-5 shadow-sm transition-colors"
        style={{
          backgroundColor: isCurrent ? surfaceColor : "hsl(var(--card))",
          borderColor: isCurrent ? borderColor : "hsl(var(--border))",
          opacity: isCompleted ? 0.86 : 1,
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md border bg-background"
                  style={{ borderColor, color: accentColor }}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>

                <span
                  className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: isCurrent ? "hsl(var(--card) / 0.84)" : surfaceColor,
                    borderColor,
                    color: accentColor,
                  }}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>

            <Button variant={isCurrent ? "default" : "outline"} onClick={() => onNavigate(route)}>
              {cta}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulos relacionados</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {modules.map((module) => (
                  <li key={module} className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                    {module}
                  </li>
                ))}
              </ul>
            </div>

            {!isCompleted && !isCurrent && (
              <div
                className="rounded-md border px-3 py-3 text-sm leading-6"
                style={{ backgroundColor: surfaceColor, borderColor, color: accentColor }}
              >
                Você ainda não começou esta etapa. Ela é essencial para participar de editais e organizar sua atuação.
              </div>
            )}

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Target className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
              <p>{microcopy}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
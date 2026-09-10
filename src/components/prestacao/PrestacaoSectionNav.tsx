import { Check, CircleDashed, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type PrestacaoSectionState = "completa" | "pendente" | "vazia";

export interface PrestacaoSectionItem {
  id: string;
  label: string;
  state: PrestacaoSectionState;
}

const stateIcon = {
  completa: Check,
  pendente: TriangleAlert,
  vazia: CircleDashed,
} as const;

const stateBadge: Record<PrestacaoSectionState, string> = {
  completa: "border-emerald-300/50 bg-emerald-100/70 text-emerald-700",
  pendente: "border-amber-300/50 bg-amber-100/70 text-amber-700",
  vazia: "border-border/60 bg-muted/50 text-muted-foreground",
};

const stateText: Record<PrestacaoSectionState, string> = {
  completa: "Concluída",
  pendente: "Pendente",
  vazia: "Não iniciada",
};

export interface PrestacaoSectionNavProps {
  sections: PrestacaoSectionItem[];
  activeId?: string;
  progresso: number;
  onNavigate: (id: string) => void;
}

/**
 * Índice de seções com indicação de progresso — navegação livre (não é wizard).
 * Fica fixo na coluna lateral em telas grandes e vira barra rolável no mobile.
 */
export function PrestacaoSectionNav({
  sections,
  activeId,
  progresso,
  onNavigate,
}: PrestacaoSectionNavProps) {
  return (
    <nav
      aria-label="Seções da prestação de contas"
      className="min-w-0 max-w-full rounded-[16px] border border-border/70 bg-card/75 p-3 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60"
    >
      <div className="px-1 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Prestação organizada
          </p>
          <span className="text-[13px] font-semibold text-foreground">
            {progresso}%
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da organização da prestação"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <ul className="-mx-1 flex min-w-0 max-w-full snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {sections.map((s) => {
          const Icon = stateIcon[s.state];
          const ativo = activeId === s.id;
          return (
            <li
              key={s.id}
              className="shrink-0 snap-start lg:shrink lg:snap-align-none"
            >
              <button
                type="button"
                onClick={() => onNavigate(s.id)}
                aria-current={ativo ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[11px] px-2.5 py-2 text-left text-[12.5px] leading-tight transition-colors",
                  ativo
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border",
                    stateBadge[s.state],
                  )}
                  aria-hidden
                >
                  <Icon className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap lg:whitespace-normal">
                  {s.label}
                </span>
                <span className="sr-only">{stateText[s.state]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

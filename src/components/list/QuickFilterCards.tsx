import { useState } from "react";
import { Filter, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export interface QuickFilterCard {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  filtravel?: boolean;
  valor?: string;
  descricao?: string;
}
export function useQuickFilter<K extends string = string>() {
  const [ativo, setAtivo] = useState<K | null>(null);
  return {
    ativo,
    alternar: (k: K) => setAtivo((a) => (a === k ? null : k)),
    limpar: () => setAtivo(null),
  };
}
export function QuickFilterCards({
  cards,
  ativo = null,
  onToggle,
  onClear,
  totalFiltrado,
}: {
  cards: QuickFilterCard[];
  ativo?: string | null;
  onToggle?: (key: string) => void;
  onClear?: () => void;
  totalFiltrado?: number;
}) {
  const label = cards.find((c) => c.key === ativo)?.label;
  return (
    <div className="mb-4 space-y-2">
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores"
      >
        {cards.map((c) => {
          const Icon = c.icon,
            selecionado = ativo === c.key;
          const body = (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-primary/20 bg-primary/10 text-primary"
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </span>
                <span className="block text-lg font-semibold tabular-nums">
                  {c.valor ?? c.count.toLocaleString("pt-BR")}
                </span>
                {c.descricao && (
                  <span className="block text-[11px] text-muted-foreground">
                    {c.descricao}
                  </span>
                )}
              </span>
            </>
          );
          const base =
            "flex min-h-[64px] items-center gap-3 rounded-[14px] border border-border/70 bg-card/75 px-3.5 py-3 text-left backdrop-blur-md";
          return !onToggle ||
            c.filtravel === false ||
            (!c.count && !selecionado) ? (
            <div key={c.key} className={base}>
              {body}
            </div>
          ) : (
            <button
              key={c.key}
              type="button"
              aria-pressed={selecionado}
              title={
                selecionado
                  ? "Remover filtro rápido"
                  : `Filtrar a tabela: ${c.label}`
              }
              onClick={() => onToggle(c.key)}
              className={cn(
                base,
                "w-full transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selecionado && "border-primary/50 ring-1 ring-primary/30",
              )}
            >
              {body}
            </button>
          );
        })}
      </section>
      {label && onClear && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-primary/25 bg-primary/5 px-3 py-2 text-[12.5px]"
        >
          <span className="inline-flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-primary" aria-hidden />
            Filtro rápido: <strong>{label}</strong>
            {typeof totalFiltrado === "number" &&
              ` · ${totalFiltrado} registro(s)`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[12px]"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar filtro rápido
          </Button>
        </div>
      )}
    </div>
  );
}

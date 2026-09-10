// =============================================================================
// Kit visual da central de acompanhamento (/dashboard).
// Mantém o padrão liquid glass do sistema: navegação interna, cabeçalhos de
// seção, cards de indicadores e blocos de conteúdo.
// =============================================================================

import { Link } from "react-router-dom";
import { ArrowUpRight, ShieldAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prioridadeLabel, type Prioridade } from "@/data/dashboardCentral";

/* ───────────── Cabeçalho de seção ───────────── */

export function SectionHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/20 bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/* ───────────── Bloco de conteúdo ───────────── */

export function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/60",
        className,
      )}
    >
      {children}
    </section>
  );
}

/* ───────────── Prioridade ───────────── */

const prioridadeTone: Record<Prioridade, string> = {
  CRITICA: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  ALTA: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  MEDIA: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  BAIXA: "border-border/70 bg-muted/50 text-muted-foreground",
};

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        prioridadeTone[prioridade],
      )}
    >
      {prioridade === "CRITICA" && (
        <ShieldAlert className="h-3 w-3" aria-hidden />
      )}
      {prioridadeLabel[prioridade]}
    </span>
  );
}

/* ───────────── Link para o módulo de origem ───────────── */

export function ModuleLink({
  to,
  label = "Abrir",
}: {
  to: string;
  label?: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
    >
      {label}
      <ArrowUpRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}

/* ───────────── Barra de progresso ───────────── */

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full min-w-[72px] overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-full bg-primary/80 transition-all"
          style={{ width: `${safe}%` }}
        />
      </div>
      <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-muted-foreground">
        {safe}%
      </span>
    </div>
  );
}

/* ───────────── Lista de distribuição ───────────── */

export function DistributionList({
  items,
  total,
  emptyLabel = "Sem dados disponíveis.",
}: {
  items: { name: string; value: number }[];
  total: number;
  emptyLabel?: string;
}) {
  if (!items.length)
    return <p className="text-[12.5px] text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.name} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="truncate text-foreground">{item.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {item.value}
              {total > 0 && ` (${Math.round((item.value / total) * 100)}%)`}
            </span>
          </div>
          <ProgressBar
            value={total > 0 ? Math.round((item.value / total) * 100) : 0}
          />
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Bloqueio por permissão ───────────── */

export function SectionRestricted() {
  return (
    <GlassPanel className="py-10 text-center">
      <ShieldAlert
        className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm font-semibold text-foreground">
        Seção indisponível
      </p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
        Seu perfil de acesso não possui permissão de visualização para os
        módulos desta seção. Solicite a liberação ao administrador da
        organização.
      </p>
    </GlassPanel>
  );
}

import type { JourneyModuleState } from "@/data/journey";

export const journeyStateLabel: Record<JourneyModuleState, string> = {
  CONCLUIDO: "Concluído",
  EM_ANDAMENTO: "Em andamento",
  COM_PENDENCIAS: "Com pendências",
  PRECISA_ATENCAO: "Precisa de atenção",
  NAO_INICIADO: "Não iniciado",
};

export const journeyStateBadge: Record<JourneyModuleState, string> = {
  CONCLUIDO:
    "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))] border-[hsl(var(--status-active-fg)/0.28)]",
  EM_ANDAMENTO:
    "bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))] border-[hsl(var(--status-done-fg)/0.28)]",
  COM_PENDENCIAS:
    "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))] border-[hsl(var(--status-pending-fg)/0.28)]",
  PRECISA_ATENCAO: "bg-destructive/10 text-destructive border-destructive/25",
  NAO_INICIADO: "bg-muted/70 text-muted-foreground border-border/70",
};

/** Número da etapa formatado (01, 02, ...). */
export const stepLabel = (index: number) => String(index + 1).padStart(2, "0");

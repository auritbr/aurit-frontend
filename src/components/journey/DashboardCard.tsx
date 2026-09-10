import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Superfície-base compartilhada com os cards dos módulos da jornada
 * (mesmo fundo, borda, blur, reflexo interno, sombra e raio).
 */
export function DashboardCard({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("journey-glass min-w-0 rounded-[20px]", className)}
      {...props}
    />
  );
}

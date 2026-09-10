import { cn } from "@/lib/utils";

/**
 * Container da tabela em liquid glass leve — padrão de "Dados Institucionais".
 */
export function DataTableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "data-table-card min-w-0 overflow-hidden rounded-[14px] border border-border/70 bg-card/75 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65",
        className,
      )}
    >
      {children}
    </div>
  );
}

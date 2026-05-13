import { cn } from "@/lib/utils";

interface TableCellTextProps {
  children: React.ReactNode;
  text: string;
  className?: string;
  muted?: boolean;
  bold?: boolean;
}

/**
 * Célula de tabela com conteúdo em uma única linha.
 * Trunca com elipse se necessário e exibe tooltip com o conteúdo completo ao passar o mouse.
 */
export function TableCellText({ children, text, className, muted, bold }: TableCellTextProps) {
  return (
    <span
      className={cn(
        "block whitespace-nowrap text-[13px] leading-snug",
        muted ? "text-muted-foreground" : "text-foreground",
        bold && "font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

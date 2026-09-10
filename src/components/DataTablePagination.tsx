import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DataTablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  /** Nome da entidade no singular, ex.: "organização". */
  entityLabel?: string;
  /** Nome da entidade no plural, ex.: "organizações". */
  entityLabelPlural?: string;
  /** Rótulo do seletor de quantidade. */
  pageSizeLabel?: string;
  loading?: boolean;
  className?: string;
}

const DEFAULT_OPTIONS = [25, 50, 100, 200, 500];

/**
 * Paginação padronizada para tabelas, com acabamento liquid glass discreto.
 * Não renderiza nada quando não há registros.
 */
export function DataTablePagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  entityLabel = "registro",
  entityLabelPlural = "registros",
  pageSizeLabel,
  loading = false,
  className,
}: DataTablePaginationProps) {
  // Removed early return to show summary even when empty

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  const plural = entityLabelPlural;

  const summary = `Mostrando ${totalItems === 0 ? 0 : start} até ${totalItems === 0 ? 0 : end} de ${totalItems} ${plural}`;

  const navButton =
    "h-8 w-8 rounded-[10px] border-border/70 bg-background/60 backdrop-blur-sm supports-[backdrop-filter]:bg-background/50 hover:bg-accent hover:text-accent-foreground transition-colors";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-muted/15 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex items-center gap-1.5">
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          )}
          {summary}
        </span>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap" id="page-size-label">
            {pageSizeLabel ?? "Registros por página"}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
            disabled={loading}
          >
            <SelectTrigger
              className="h-8 w-[74px] rounded-[10px] border-border/70 bg-background/60 text-xs backdrop-blur-sm supports-[backdrop-filter]:bg-background/50"
              aria-labelledby="page-size-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="whitespace-nowrap">
          Página <span className="font-medium text-foreground">{safePage}</span>{" "}
          de <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(navButton, "hidden md:inline-flex")}
            onClick={() => onPageChange(1)}
            disabled={loading || safePage <= 1}
            aria-label="Ir para a primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={navButton}
            onClick={() => onPageChange(safePage - 1)}
            disabled={loading || safePage <= 1}
            aria-label="Ir para a página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={navButton}
            onClick={() => onPageChange(safePage + 1)}
            disabled={loading || safePage >= totalPages}
            aria-label="Ir para a próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(navButton, "hidden md:inline-flex")}
            onClick={() => onPageChange(totalPages)}
            disabled={loading || safePage >= totalPages}
            aria-label="Ir para a última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

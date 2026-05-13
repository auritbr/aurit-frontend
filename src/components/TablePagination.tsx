import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  onCopy?: () => void;
  disabled?: boolean;
  showCopy?: boolean;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100, 200];

export function TablePagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  onCopy,
  disabled = false,
  showCopy = true,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const rangeText =
    totalItems === 0
      ? "Mostrando 0 registros"
      : `Mostrando ${start} até ${end} de ${totalItems} registros`;

  return (
    <div className="px-5 py-3 border-t border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between text-xs text-muted-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span>{rangeText}</span>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Registros por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[78px] text-xs">
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
          {showCopy && onCopy && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onCopy}
              disabled={disabled}
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">
          Página <span className="font-medium text-foreground">{safePage}</span> de{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(safePage - 1)}
            disabled={disabled || safePage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(safePage + 1)}
            disabled={disabled || safePage >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface UsePaginationResult {
  currentPage: number;
  pageSize: number;
  setCurrentPage: (n: number) => void;
  setPageSize: (n: number) => void;
}
import { Check, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RelatorioColumn } from "@/lib/relatorioExports";

interface ColumnSelectorProps<T> {
  /** `group` é opcional para manter todos os relatórios existentes inalterados. */
  columns: Array<RelatorioColumn<T> & { group?: string }>;
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  minVisibleColumns?: number;
}

export function ColumnSelector<T>({
  columns,
  visibleKeys,
  onChange,
  minVisibleColumns = 0,
}: ColumnSelectorProps<T>) {
  const toggle = (key: string, checked: boolean) => {
    if (checked) {
      onChange([...visibleKeys, key]);
    } else {
      onChange(visibleKeys.filter((k) => k !== key));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="glassSecondary"
          size="sm"
          className="h-8 gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-64 max-w-[calc(100vw-1.5rem)] flex-col rounded-[14px] border-border/70 bg-popover p-2 shadow-[0_14px_32px_-18px_hsl(var(--foreground)/0.35)]"
      >
        <p className="shrink-0 px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Colunas visíveis
        </p>
        <div className="min-h-0 max-h-72 overflow-y-auto overscroll-contain">
          {columns.map((col, index) => {
            const checked = visibleKeys.includes(col.key);
            const disabled =
              col.alwaysVisible ||
              (checked && visibleKeys.length <= minVisibleColumns);
            const previousGroup =
              index > 0 ? columns[index - 1]?.group : undefined;
            const showGroup = col.group && col.group !== previousGroup;
            return (
              <div key={col.key}>
                {showGroup && (
                  <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.group}
                  </p>
                )}
                <label
                  className={`flex min-h-11 items-center gap-2 rounded-[9px] px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 md:min-h-0 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => toggle(col.key, event.target.checked)}
                  />
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary text-transparent peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    {col.label}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

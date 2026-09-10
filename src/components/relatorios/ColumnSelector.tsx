import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { RelatorioColumn } from "@/lib/relatorioExports";

interface ColumnSelectorProps<T> {
  /** `group` é opcional para manter todos os relatórios existentes inalterados. */
  columns: Array<RelatorioColumn<T> & { group?: string }>;
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

export function ColumnSelector<T>({
  columns,
  visibleKeys,
  onChange,
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
        className="w-64 rounded-[14px] border-border/70 bg-popover/90 p-2 shadow-[0_14px_32px_-18px_hsl(var(--foreground)/0.35)] backdrop-blur-xl"
      >
        <p className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Colunas visíveis
        </p>
        <div className="max-h-72 overflow-y-auto">
          {columns.map((col, index) => {
            const checked = visibleKeys.includes(col.key);
            const disabled = col.alwaysVisible;
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
                  className={`flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => toggle(col.key, Boolean(v))}
                  />
                  <span className="flex-1 truncate">{col.label}</span>
                </label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

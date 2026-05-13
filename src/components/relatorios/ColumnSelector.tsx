import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { RelatorioColumn } from "@/lib/relatorioExporters";

interface ColumnSelectorProps<T> {
  columns: RelatorioColumn<T>[];
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
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Columns3 className="h-3.5 w-3.5" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Colunas visíveis
        </p>
        <div className="max-h-72 overflow-y-auto">
          {columns.map((col) => {
            const checked = visibleKeys.includes(col.key);
            const disabled = col.alwaysVisible;
            return (
              <label
                key={col.key}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40 ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => toggle(col.key, Boolean(v))}
                />
                <span className="flex-1 truncate">{col.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
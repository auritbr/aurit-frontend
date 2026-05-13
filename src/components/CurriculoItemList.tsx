import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurriculoItemListProps {
  id: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function CurriculoItemList({
  id,
  values,
  onChange,
  placeholder = "Digite uma informação...",
  maxLength = 5000,
  disabled = false,
}: CurriculoItemListProps) {
  const list = values.length === 0 ? [""] : values;

  const updateAt = (idx: number, value: string) => {
    if (disabled) return;

    const next = [...list];
    next[idx] = value;

    onChange(next);
  };

  const removeAt = (idx: number) => {
    if (disabled) return;

    const next = list.filter((_, i) => i !== idx);

    onChange(next.length === 0 ? [] : next);
  };

  const add = () => {
    if (disabled) return;

    onChange([...list, ""]);
  };

  return (
    <div className="space-y-3">
      {list.map((value, idx) => {
        const textareaId = idx === 0 ? id : `${id}-${idx}`;

        return (
          <div key={`${id}-${idx}`} className="space-y-1.5">
            <div className="flex items-start gap-2">
              <textarea
                id={textareaId}
                value={value}
                onChange={(e) => updateAt(idx, e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={disabled}
                readOnly={disabled}
                rows={4}
                className="min-h-[96px] flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled || (list.length === 1 && !value)}
                aria-label="Remover item"
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {!disabled && (
              <p className="text-right text-[11px] text-muted-foreground">
                {value.length}/{maxLength} caracteres
              </p>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
        className="h-8 gap-1.5 border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </Button>
    </div>
  );
}
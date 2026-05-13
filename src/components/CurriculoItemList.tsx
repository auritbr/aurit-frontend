import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  maxLength = 200,
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
    <div className="space-y-2">
      {list.map((value, idx) => (
        <div key={`${id}-${idx}`} className="flex items-center gap-2">
          <Input
            id={idx === 0 ? id : undefined}
            value={value}
            onChange={(e) => updateAt(idx, e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            readOnly={disabled}
            className="h-9 flex-1"
          />

          <button
            type="button"
            onClick={() => removeAt(idx)}
            disabled={disabled || (list.length === 1 && !value)}
            aria-label="Remover item"
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
        className="h-8 gap-1.5 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </Button>
    </div>
  );
}
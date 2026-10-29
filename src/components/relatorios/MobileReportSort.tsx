import { useId } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MobileReportSort({
  title,
  options,
  value,
  direction,
  allowOriginal = true,
  onChange,
  onReverse,
}: {
  title: string;
  options: { key: string; label: string }[];
  value: string | null;
  direction: "asc" | "desc";
  allowOriginal?: boolean;
  onChange: (key: string | null) => void;
  onReverse: () => void;
}) {
  const id = useId();
  if (!options.length) return null;
  return (
    <div className="space-y-2 border-b border-border/60 p-4">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Ordenar por
      </label>
      <Select
        value={value ?? "__original__"}
        onValueChange={(key) => onChange(key === "__original__" ? null : key)}
      >
        <SelectTrigger
          id={id}
          aria-label={`Ordenar ${title}`}
          className="min-w-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowOriginal && (
            <SelectItem value="__original__">Ordem original</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="glassSecondary"
        className="w-full gap-2"
        disabled={!value}
        onClick={onReverse}
        aria-label={`Inverter ordem de ${title}`}
      >
        <ArrowUpDown className="h-4 w-4" aria-hidden />
        {direction === "asc" ? "Crescente" : "Decrescente"}
      </Button>
    </div>
  );
}

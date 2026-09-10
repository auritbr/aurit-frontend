// =============================================================================
// Campos de filtro dos Relatórios Financeiros.
// Composições finas sobre os componentes já existentes (FieldLabel, Input,
// Select e FilterMultiSelect) para manter os filtros idênticos aos demais
// relatórios sem duplicar comportamento.
// =============================================================================

import { Search } from "lucide-react";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterFieldClass } from "@/components/relatorios/ReportKit";

export interface Opcao {
  value: string;
  label: string;
}

export function FiltroBusca({
  id,
  label = "Busca",
  tooltip,
  placeholder = "Buscar...",
  value,
  onChange,
}: {
  id: string;
  label?: string;
  tooltip: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${filterFieldClass} pl-8`}
        />
      </div>
    </div>
  );
}

export function FiltroData({
  id,
  label,
  tooltip,
  value,
  onChange,
}: {
  id: string;
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={filterFieldClass}
      />
    </div>
  );
}

export function FiltroSelect({
  id,
  label,
  tooltip,
  value,
  onChange,
  options,
  todosLabel = "Todos",
  todosValue = "TODOS",
  incluirTodos = true,
}: {
  id: string;
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string) => void;
  options: Opcao[];
  todosLabel?: string;
  todosValue?: string;
  /** Desative quando o campo for uma escolha obrigatória (sem opção "Todos"). */
  incluirTodos?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className={filterFieldClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {incluirTodos && (
            <SelectItem value={todosValue}>{todosLabel}</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FiltroMulti({
  id,
  label,
  tooltip,
  placeholder,
  summaryNoun,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  tooltip: string;
  placeholder: string;
  summaryNoun: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: Opcao[];
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <FilterMultiSelect
        id={id}
        placeholder={placeholder}
        summaryNoun={summaryNoun}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

import {
  ReportFilterMultiSelect as FilterMultiSelect,
  ReportSelectContent as SelectContent,
} from "@/components/relatorios/ReportSelectFields";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";

import {
  sortByOptions,
  type EvidenceSearchFilters,
  type SortBy,
  type SortDir,
} from "@/lib/evidenceSearch";
type Option = { value: string; label: string };
export function EvidenceSearchFields({
  draft,
  setDraftField,
  contextoOptions,
  projetoOptions,
  atividadeOptions,
  turmaOptions,
  eventoOptions,
  inputClass,
  loading = false,
}: {
  draft: EvidenceSearchFilters;
  setDraftField: <K extends keyof EvidenceSearchFilters>(
    key: K,
    value: EvidenceSearchFilters[K],
  ) => void;
  contextoOptions: Option[];
  projetoOptions: Option[];
  atividadeOptions: Option[];
  turmaOptions: Option[];
  eventoOptions: Option[];
  inputClass: string;
  loading?: boolean;
}) {
  return (
    <>
      <Field id="filtroBusca" label="Pesquisa">
        <Input
          id="filtroBusca"
          value={draft.busca}
          onChange={(e) => setDraftField("busca", e.target.value)}
          placeholder="Projeto, atividade, turma, evento ou descrição"
          className={inputClass}
        />
      </Field>
      <Multi
        id="filtroContexto"
        label="Contexto"
        options={contextoOptions}
        value={draft.contexto}
        onChange={(v) => setDraftField("contexto", v)}
        placeholder="Todos os contextos"
      />
      <Multi
        id="filtroProjeto"
        label="Projeto"
        options={projetoOptions}
        value={draft.projeto}
        onChange={(v) => setDraftField("projeto", v)}
        placeholder={loading ? "Carregando projetos..." : "Todos os projetos"}
      />
      <Multi
        id="filtroAtividade"
        label="Atividade"
        options={atividadeOptions}
        value={draft.atividade}
        onChange={(v) => setDraftField("atividade", v)}
        placeholder={
          loading ? "Carregando atividades..." : "Todas as atividades"
        }
      />
      <Multi
        id="filtroTurma"
        label="Turma"
        options={turmaOptions}
        value={draft.turma}
        onChange={(v) => setDraftField("turma", v)}
        placeholder={loading ? "Carregando turmas..." : "Todas as turmas"}
      />
      <Multi
        id="filtroEvento"
        label="Evento cultural"
        options={eventoOptions}
        value={draft.evento}
        onChange={(v) => setDraftField("evento", v)}
        placeholder={loading ? "Carregando eventos..." : "Todos os eventos"}
      />
      <Field id="filtroDataInicio" label="Período — de">
        <Input
          id="filtroDataInicio"
          type="date"
          value={draft.dataInicio}
          onChange={(e) => setDraftField("dataInicio", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field id="filtroDataFim" label="Período — até">
        <Input
          id="filtroDataFim"
          type="date"
          value={draft.dataFim}
          onChange={(e) => setDraftField("dataFim", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field id="filtroSortBy" label="Ordenar por">
        <Select
          value={draft.sortBy}
          onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
        >
          <SelectTrigger id="filtroSortBy" className={inputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortByOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="filtroSortDir" label="Ordem">
        <Select
          value={draft.sortDir}
          onValueChange={(v) => setDraftField("sortDir", v as SortDir)}
        >
          <SelectTrigger id="filtroSortDir" className={inputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Crescente</SelectItem>
            <SelectItem value="desc">Decrescente</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </div>
  );
}
function Multi({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <Field id={id} label={label}>
      <FilterMultiSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        summaryNoun="itens selecionados"
        searchable
      />
    </Field>
  );
}

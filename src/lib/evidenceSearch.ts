export const contextos = [
  { value: "AULA", label: "Aula" },
  { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
] as const;
export const sortByOptions = [
  { value: "data", label: "Data" },
  { value: "contexto", label: "Contexto" },
  { value: "projeto", label: "Projeto" },
  { value: "referencia", label: "Referência" },
  { value: "imagens", label: "Quantidade de arquivos" },
] as const;
export type SortBy = (typeof sortByOptions)[number]["value"];
export type SortDir = "asc" | "desc";
export interface EvidenceSearchFilters {
  busca: string;
  contexto: string[];
  projeto: string[];
  atividade: string[];
  turma: string[];
  evento: string[];
  dataInicio: string;
  dataFim: string;
  sortBy: SortBy;
  sortDir: SortDir;
}
export const emptyEvidenceSearch: EvidenceSearchFilters = {
  busca: "",
  contexto: [],
  projeto: [],
  atividade: [],
  turma: [],
  evento: [],
  dataInicio: "",
  dataFim: "",
  sortBy: "data",
  sortDir: "desc",
};

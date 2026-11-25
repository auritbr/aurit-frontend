export const contextos = [
  { value: "ARTICULACAO_INSTITUCIONAL", label: "Articulação Institucional" },
  { value: "ASSEMBLEIA", label: "Assembleia" },
  { value: "AULA", label: "Aula" },
  { value: "CAPACITACAO", label: "Capacitação" },
  { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
  { value: "GESTAO_ADMINISTRATIVA", label: "Gestão Administrativa" },
  { value: "MONITORAMENTO_E_AVALIACAO", label: "Monitoramento e Avaliação" },
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "PRESTACAO_DE_CONTAS", label: "Prestação de Contas" },
  {
    value: "REPRESENTACAO_INSTITUCIONAL",
    label: "Representação Institucional",
  },
  { value: "REUNIAO", label: "Reunião" },
  { value: "VISITA_TECNICA", label: "Visita Técnica" },
  { value: "OUTROS", label: "Outros" },
] as const;
export const sortByOptions = [
  { value: "data", label: "Data" },
  { value: "contexto", label: "Contexto" },
  { value: "projeto", label: "Projeto" },
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

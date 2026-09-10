import { apiFetch } from "@/lib/api";

export type SituacaoCronogramaPrazo =
  | "NAO_INICIADA"
  | "EM_ANDAMENTO"
  | "PRAZO_ENCERRADO";

export interface RelatorioOpcao {
  id: number;
  nome: string;
}
export interface RelatorioResumo {
  status: string;
  total: number;
}
export interface RelatorioCronogramaItem {
  id: number;
  etapa: string;
  atividadeId: number | null;
  atividade: string;
  projetoId: number;
  projeto: string;
  inicio: string;
  fim: string;
  situacao: SituacaoCronogramaPrazo;
  duracaoDias: number;
  descricao: string | null;
}

export interface RelatorioCronogramaPrazosDTO {
  totalEtapas: number;
  etapasEmAndamento: number;
  etapasNaoIniciadas: number;
  etapasPrazoEncerrado: number;
  situacoesDisponiveis: SituacaoCronogramaPrazo[];
  projetosDisponiveis: RelatorioOpcao[];
  etapasPorSituacao: RelatorioResumo[];
  etapasPorProjeto: RelatorioResumo[];
  etapas: RelatorioCronogramaItem[];
}

export async function getRelatorioCronogramaPrazos(filtros?: {
  busca?: string;
  projetoId?: string;
  situacoes?: string[];
  de?: string;
  ate?: string;
}): Promise<RelatorioCronogramaPrazosDTO> {
  const params = new URLSearchParams();
  if (filtros?.busca?.trim()) params.set("busca", filtros.busca.trim());
  if (filtros?.projetoId && filtros.projetoId !== "TODOS")
    params.set("projetoId", filtros.projetoId);
  filtros?.situacoes?.forEach((situacao) =>
    params.append("situacoes", situacao),
  );
  if (filtros?.de) params.set("de", filtros.de);
  if (filtros?.ate) params.set("ate", filtros.ate);

  const query = params.toString();
  return apiFetch<RelatorioCronogramaPrazosDTO>(
    `/relatorios/cronograma-prazos${query ? `?${query}` : ""}`,
  );
}

export const situacaoCronogramaLabel = (value: string) =>
  ({
    NAO_INICIADA: "Não iniciada",
    EM_ANDAMENTO: "Em andamento",
    PRAZO_ENCERRADO: "Prazo encerrado",
  })[value] ?? value;

export const formatDateBr = (value?: string | null) => {
  if (!value) return "—";
  const [ano, mes, dia] = value.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : value;
};

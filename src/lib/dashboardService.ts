import { apiFetch } from "@/lib/api";

export interface DashboardDistribuicaoDTO {
  label: string;
  valor: number;
}

export interface DashboardPessoasDTO {
  totalParticipantes: number;
  totalColaboradores: number;
  totalIntegrantes: number;
  pessoasPorTipo: DashboardDistribuicaoDTO[];
}

export interface DashboardProjetosDTO {
  totalProjetos: number;
  totalAtividades: number;
  totalTurmas: number;
  totalEventosCulturais: number;
  totalAcoesDivulgacao: number;
  totalEvidencias: number;
  projetosPorStatus: DashboardDistribuicaoDTO[];
  atividadesPorStatus: DashboardDistribuicaoDTO[];
  eventosPorStatus: DashboardDistribuicaoDTO[];
}

export interface DashboardFinanceiroDTO {
  totalMovimentacoesFinanceiras: number;
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  movimentacoesPorStatus: DashboardDistribuicaoDTO[];
  movimentacoesPorFormaPagamento: DashboardDistribuicaoDTO[];
}

export interface DashboardResumoDTO {
  nomeOrganizacao: string;
  possuiOrganizacao: boolean;
  possuiEquipe: boolean;
  possuiProjetos: boolean;
  possuiExecucao: boolean;
  documentosProntos: boolean;
  possuiFinanceiro: boolean;
  prontoParaEdital: boolean;
  prontoParaPrestacao: boolean;
  totalParticipantes: number;
  totalColaboradores: number;
  totalIntegrantes: number;
  totalProjetos: number;
  totalAtividades: number;
  totalEventosCulturais: number;
  totalAcoesDivulgacao: number;
  totalFinanceiros: number;
  totalDocumentosAtualizados: number;
  totalDocumentosVencidos: number;
}

export const getDashboardPessoas = () =>
  apiFetch<DashboardPessoasDTO>("/dashboard/pessoas", { cache: "no-store" });

export const getDashboardProjetos = () =>
  apiFetch<DashboardProjetosDTO>("/dashboard/projetos", { cache: "no-store" });

export const getDashboardFinanceiro = () =>
  apiFetch<DashboardFinanceiroDTO>("/dashboard/financeiro", {
    cache: "no-store",
  });

export const getDashboardResumo = () =>
  apiFetch<DashboardResumoDTO>("/dashboard/resumo", { cache: "no-store" });

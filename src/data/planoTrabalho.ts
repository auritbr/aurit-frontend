import { apiFetch } from "@/lib/api";

export type PlanoTrabalho = {
  identificacao: {
    projetoId: number;
    projeto: string;
    propostaId?: number | null;
    proposta?: string | null;
    editalId?: number | null;
    edital?: string | null;
    organizacao: string;
    documentoOrganizacao?: string | null;
    responsavel?: string | null;
    inicioPrevisto?: string | null;
    fimPrevisto?: string | null;
    valorPrevisto?: number | null;
    situacao?: string | null;
  };
  objeto?: string | null;
  justificativa?: string | null;
  objetivoGeral?: string | null;
  objetivosEspecificos: string[];
  metas: Array<{
    id: number;
    titulo: string;
    descricao?: string | null;
    quantidadePrevista?: number | null;
    unidadeMedida?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    formaComprovacao?: string | null;
    situacao?: string | null;
  }>;
  cronograma: Array<{
    id: number;
    etapa: string;
    descricao?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    vinculo?: string | null;
    situacao?: string | null;
  }>;
  atividades: Array<{
    id: number;
    nome: string;
    descricao?: string | null;
    meta?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    publico?: string | null;
    vagas?: number | null;
    local?: string | null;
    tipo?: string | null;
    situacao?: string | null;
  }>;
  turmas: Array<{
    id: number;
    nome: string;
    atividade?: string | null;
    vagas?: number | null;
    horario?: string | null;
    nivel?: string | null;
    situacao?: string | null;
  }>;
  eventosCulturais: Array<{
    id: number;
    nome: string;
    descricao?: string | null;
    local?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    tipo?: string | null;
    situacao?: string | null;
  }>;
  evidencias: Array<{
    id: number;
    contexto: string;
    referencia?: string | null;
    turma?: string | null;
    planoAula?: string | null;
    dataReferencia?: string | null;
    descricao?: string | null;
    imagens: Array<{
      id: number;
      nome?: string | null;
      ordem?: number | null;
      downloadUrl: string;
    }>;
    links: Array<{
      id: number;
      titulo?: string | null;
      url: string;
      ordem?: number | null;
    }>;
  }>;
  colaboradores: Array<{
    id: number;
    nome?: string | null;
    funcao?: string | null;
    tipoVinculo?: string | null;
    cargaHorariaSemanal?: number | null;
    inicioVinculo?: string | null;
    fimVinculo?: string | null;
    situacao?: string | null;
    descricaoAtuacao?: string | null;
  }>;
  contrapartidas: Array<{
    id: number;
    titulo?: string | null;
    tipo?: string | null;
    descricao?: string | null;
  }>;
  contasPagar: Array<{
    id: number;
    titulo: string;
    descricao?: string | null;
    classificacao?: string | null;
    vencimento?: string | null;
    valorPrevisto?: number | null;
    valorRealizado?: number | null;
    situacao?: string | null;
    pessoa?: string | null;
  }>;
  contasReceber: Array<{
    id: number;
    titulo: string;
    descricao?: string | null;
    classificacao?: string | null;
    vencimento?: string | null;
    valorPrevisto?: number | null;
    valorRealizado?: number | null;
    situacao?: string | null;
    pessoa?: string | null;
  }>;
  resumoFinanceiro: {
    totalContasPagar: number;
    totalContasReceber: number;
    quantidadeContasPagar: number;
    quantidadeContasReceber: number;
  };
};

export function getPlanoTrabalho(projetoId: string | number) {
  return apiFetch<PlanoTrabalho>(`/projetos/${projetoId}/plano-trabalho`);
}

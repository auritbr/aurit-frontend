import { apiFetch } from "@/lib/api";

export interface RelatorioOpcao {
  id: number;
  nome: string;
}

export interface RelatorioOpcaoVinculada extends RelatorioOpcao {
  vinculoId: number;
}

export interface RelatorioResumo {
  status: string;
  total: number;
}

export interface RelatorioGraficoValor {
  nome: string;
  valor: number;
}

export type ReportFilters = Record<
  string,
  string | number | string[] | number[] | null | undefined
>;

export async function getRelatorio<T>(
  endpoint: string,
  filters: ReportFilters = {},
): Promise<T> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });

  const query = params.toString();
  return apiFetch<T>(`/relatorios/${endpoint}${query ? `?${query}` : ""}`);
}

export interface RelatorioTurmaAtendimentoItem {
  id: number;
  turma: string;
  atividadeId: number;
  atividade: string;
  status: string;
  dia: string;
  horarioInicio: string;
  horarioFim: string;
  dias: string;
  horarios: string;
  participantes: number;
  vagas: number;
  percentualOcupacao: number;
  presencas: number;
  registrosPresenca: number;
  percentualPresenca: number;
  colaboradores: number;
}

export interface RelatorioTurmasAtendimento {
  totalTurmas: number;
  totalParticipantes: number;
  ocupacaoMedia: number;
  percentualPresencaMedio: number;
  statusDisponiveis: string[];
  diasDisponiveis: string[];
  atividadesDisponiveis: RelatorioOpcao[];
  participantesPorTurma: RelatorioResumo[];
  turmasPorStatus: RelatorioResumo[];
  turmas: RelatorioTurmaAtendimentoItem[];
}

export interface RelatorioRegularidadeDocumentoItem {
  id: number;
  tipo: string;
  status: string;
  situacao: string;
  dataEmissao: string | null;
  dataValidade: string | null;
  orgaoEmissor: string | null;
  organizacaoId: number;
  organizacao: string;
  arquivoAnexado: boolean;
  arquivoKey: string | null;
}

export interface RelatorioRegularidadeDocumental {
  totalDocumentos: number;
  documentosRegulares: number;
  documentosVencidos: number;
  documentosPendentes: number;
  percentualRegularidade: number;
  tiposDisponiveis: string[];
  statusDisponiveis: string[];
  situacoesDisponiveis: string[];
  documentosPorStatus: RelatorioResumo[];
  documentosPorSituacao: RelatorioResumo[];
  documentos: RelatorioRegularidadeDocumentoItem[];
}

export interface RelatorioMetaResultadoItem {
  id: number;
  meta: string;
  projetoId: number;
  projeto: string;
  propostaId: number | null;
  proposta: string | null;
  situacao: string;
  cumprimento: string;
  previsto: number;
  executado: number;
  percentualExecucao: number;
  prazoProjeto: string | null;
  evidencias: number;
}

export interface RelatorioMetasResultados {
  totalMetas: number;
  totalPrevisto: number;
  totalExecutado: number;
  metasNaoCumpridas: number;
  percentualExecucao: number;
  situacoesDisponiveis: string[];
  cumprimentosDisponiveis: string[];
  projetosDisponiveis: RelatorioOpcao[];
  metasPorCumprimento: RelatorioResumo[];
  percentualExecucaoPorMeta: RelatorioGraficoValor[];
  metas: RelatorioMetaResultadoItem[];
}

export interface RelatorioInstitucionalMembro {
  id: number;
  nome: string;
  cargo: string;
  status: string;
  inicioMandato: string | null;
  fimMandato: string | null;
  email: string | null;
  telefone: string | null;
  organizacaoId: number;
  organizacao: string;
}

export interface RelatorioInstitucionalOrganizacao {
  totalOrganizacoes: number;
  totalMembrosDiretoria: number;
  mandatosAtivos: number;
  documentosVencidos: number;
  cargosDisponiveis: string[];
  statusDisponiveis: string[];
  organizacoesDisponiveis: RelatorioOpcao[];
  membrosPorCargo: RelatorioResumo[];
  membrosPorStatus: RelatorioResumo[];
  membros: RelatorioInstitucionalMembro[];
}

export interface RelatorioImpactoSocialItem {
  id: string;
  participanteId: number;
  participante: string;
  atividadeId: number;
  atividade: string;
  turmaId: number | null;
  turma: string | null;
  genero: string;
  racaCor: string;
  faixaRenda: string;
  cadUnico: boolean;
  bolsaFamilia: boolean;
  status: string;
  presencas: number;
  registros: number;
  percentualPresenca: number;
}

export interface RelatorioImpactoSocial {
  totalParticipantes: number;
  totalAtividades: number;
  totalEventosCulturais: number;
  percentualPresencaMedio: number;
  statusDisponiveis: string[];
  generosDisponiveis: string[];
  racasCoresDisponiveis: string[];
  faixasRendaDisponiveis: string[];
  atividadesDisponiveis: RelatorioOpcao[];
  turmasDisponiveis: RelatorioOpcaoVinculada[];
  participantesPorGenero: RelatorioResumo[];
  participantesPorRacaCor: RelatorioResumo[];
  participantes: RelatorioImpactoSocialItem[];
}

export interface RelatorioGeralProjetoItem {
  id: number;
  projeto: string;
  status: string;
  areas: string[];
  agente: string;
  local: string;
  inicio: string;
  fim: string;
  atividades: number;
  eventos: number;
  metas: number;
  colaboradores: number;
}

export interface RelatorioGeralProjetos {
  totalProjetos: number;
  projetosEmExecucao: number;
  projetosConcluidos: number;
  totalMetas: number;
  statusDisponiveis: string[];
  areasDisponiveis: string[];
  agentesDisponiveis: RelatorioOpcao[];
  projetosPorStatus: RelatorioResumo[];
  projetosPorArea: RelatorioResumo[];
  projetos: RelatorioGeralProjetoItem[];
}

export interface RelatorioExecucaoAtividadeItem {
  id: number;
  atividade: string;
  tipo: string;
  status: string;
  projetoId: number;
  projeto: string;
  inicio: string;
  fim: string;
  vagas: number;
  turmas: number;
  participantes: number;
  ocupacao: number;
  percentualPresenca: number;
  colaboradores: number;
}

export interface RelatorioExecucaoAtividades {
  totalAtividades: number;
  totalTurmas: number;
  totalParticipantes: number;
  percentualPresencaMedio: number;
  statusDisponiveis: string[];
  tiposDisponiveis: string[];
  projetosDisponiveis: RelatorioOpcao[];
  atividadesPorTipo: RelatorioResumo[];
  atividadesPorStatus: RelatorioResumo[];
  atividades: RelatorioExecucaoAtividadeItem[];
}

export const formatReportDate = (value?: string | null) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export const formatReportPercent = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

export const reportEnumLabel = (value?: string | null) => {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "—";

  // Os gráficos também recebem nomes de pessoas, projetos, contas e categorias
  // já formatados pelo backend. Só convertemos códigos de enum para não alterar
  // a grafia desses nomes próprios (ex.: "Circuito 14 — Formação e Criação").
  if (!/^[A-Z0-9_]+$/.test(normalized)) return normalized;

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

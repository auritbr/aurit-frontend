import { downloadFile } from "@/lib/downloadFile";
import { apiFetch, apiFetchResponse } from "@/lib/api";
import { getTenantSlug, getUsuarioLogadoStorage } from "@/lib/auth";
import type { ComparacaoConfig } from "@/components/relatorios/AnalyticsKit";
import type { Periodo } from "@/lib/periodComparison";

export type FiltroApi = Record<
  string,
  string | number | boolean | string[] | number[] | undefined
>;
export type Pagina<T> = {
  registros: T[];
  total: number;
  pagina: number;
  tamanho: number;
};
export type Metrica = {
  valor: number | null;
  unidade: "QUANTIDADE" | "PERCENTUAL" | "MOEDA" | "DIAS";
  disponivel: boolean;
  motivo: string | null;
  natureza: string;
};
export type Categoria = {
  categoria: string;
  label: string;
  quantidade: number;
  valor: number | null;
  percentual: number | null;
};
export type Analise = {
  resultados: Categoria[];
  totalCategorias: number;
  totalParticipantes: number;
  unidade: Metrica["unidade"];
  disponivel: boolean;
  motivo: string | null;
};
export type Serie = {
  periodo: string;
  participantes: number;
  presencas: number;
  ausencias: number;
  taxaFrequencia: number | null;
};
export type VisaoGeral = {
  indicadores: Record<string, Metrica>;
  evolucaoMensal: Serie[];
  participantesPorAtividade: Analise;
};
export type Perfil = { distribuicoes: Record<string, Analise> };
export type Ausencia = {
  participante_id: number;
  participante: string;
  atividade_id: number;
  turma_id: number | null;
  ausencias_consecutivas: number;
};
export type Participacao = {
  frequenciaPorAtividade: Analise;
  frequenciaPorTurma: Analise;
  evolucaoMensal: Serie[];
  situacoesMatricula: Analise;
  mediaSimples: Metrica;
  taxaGeral: Metrica;
  ausenciasConsecutivas: Pagina<Ausencia>;
  permanencia: Metrica;
  conclusoes: Metrica;
};
export type Resultados = {
  indicadores: Record<string, Metrica>;
  destaques: {
    tipo: string;
    categoria: string;
    label: string;
    valor: number;
    unidade: Metrica["unidade"];
    totalEmpatados: number;
    truncado: boolean;
  }[];
  cidades: Analise;
  bairros: Analise;
  evolucaoAlcance: Serie[];
  interpretacao: string;
};
export type MatriculaImpacto = {
  id: string;
  participanteId: number;
  participante: string;
  atividadeId: number | null;
  atividade: string;
  turmaId: number | null;
  turma: string;
  genero: string;
  racaCor: string;
  faixaRenda: string;
  cadUnico: boolean | null;
  bolsaFamilia: boolean | null;
  status: string;
  presencas: number;
  ausencias: number;
  feriados: number;
  semAula: number;
  registros: number;
  percentualPresenca: number | null;
  tipoNeurodivergencias: string;
  tipoDeficiencias: string;
  ultimaPresenca: string | null;
};
type Opcao = { id: number; nome: string; atividadeId: number | null };
export type OpcoesImpacto = { atividades: Opcao[]; turmas: Opcao[] };
export type Comparativo = {
  principal: Periodo;
  comparado: Periodo;
  disponivel: boolean;
  motivo: string | null;
  indicadores: {
    indicador: string;
    principal: Metrica | null;
    comparado: Metrica | null;
    diferencaAbsoluta: number | null;
    variacaoPercentual: number | null;
    pontosPercentuais: number | null;
    disponivel: boolean;
    motivo: string | null;
  }[];
  seriePrincipal: { periodo: string; indicadores: Record<string, Metrica> }[];
  serieComparada: { periodo: string; indicadores: Record<string, Metrica> }[];
};

export function queryAnalitica(filtros: FiltroApi) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    for (const item of Array.isArray(valor) ? valor : [valor]) {
      if (item !== undefined && item !== "") params.append(chave, String(item));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const impactoPath = "/relatorios/impacto-social-cultural";
export function getImpacto<T>(recurso: string, filtros: FiltroApi = {}) {
  return apiFetch<T>(`${impactoPath}/${recurso}${queryAnalitica(filtros)}`);
}

export function compararRelatorio(
  slug: string,
  periodo: Periodo,
  config: ComparacaoConfig,
  filtros: FiltroApi = {},
  financeiro = false,
) {
  const prefixo = financeiro ? "/relatorios/financeiros" : "/relatorios";
  return apiFetch<Comparativo>(
    `${prefixo}/${encodeURIComponent(slug)}/comparacao${queryAnalitica({
      ...filtros,
      ...periodo,
      modo: config.modo,
      inicioComparado:
        config.modo === "personalizado"
          ? config.personalizado.inicio
          : undefined,
      fimComparado:
        config.modo === "personalizado" ? config.personalizado.fim : undefined,
    })}`,
  );
}

export async function exportarImpacto(
  formato: "PDF" | "XLSX" | "CSV",
  filtros: FiltroApi,
  colunas: string[],
) {
  const sufixo = formato === "PDF" ? "pdf" : `exportacao?formato=${formato}`;
  const response = await apiFetchResponse(
    `${impactoPath}/participantes/${sufixo}`,
    {
      method: "POST",
      body: JSON.stringify({ filtros, colunas, agrupamento: "MATRICULA" }),
    },
  );
  const blob = await response.blob();
  if (!blob.size) throw new Error("O arquivo da exportação está vazio.");
  await downloadFile(blob, `impacto-social-cultural.${formato.toLowerCase()}`);
}

export function getRecursosComparacao() {
  return apiFetch<string[]>("/relatorios/comparacoes/recursos");
}

export function escopoAnalitico() {
  const usuario = getUsuarioLogadoStorage();
  return [
    getTenantSlug(),
    usuario?.configuracaoEmpresaId,
    usuario?.id ?? usuario?.login,
  ];
}

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";

export const situacaoCumprimentoOptions = [
  { value: "CUMPRIDA_INTEGRALMENTE", label: "Cumprida integralmente" },
  { value: "CUMPRIDA_PARCIALMENTE", label: "Cumprida parcialmente" },
  { value: "NAO_CUMPRIDA", label: "Não cumprida" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "AGUARDANDO_AVALIACAO", label: "Aguardando avaliação" },
] as const;
export type SituacaoCumprimento =
  (typeof situacaoCumprimentoOptions)[number]["value"];
export const situacaoCumprimentoLabel = (valor: string) =>
  situacaoCumprimentoOptions.find(({ value }) => value === valor)?.label ??
  "Aguardando avaliação";

interface Projeto {
  id: number;
  nomeProjeto: string;
  dataInicio: string | null;
  dataFim: string | null;
  status: string;
}

interface Totais {
  valorPrevisto: number | null;
  execucao: {
    valorPago: number;
    valorComprometido: number;
    saldoOrcamentario: number | null;
    percentualExecucaoFinanceira: number | null;
    valorPagoNoPeriodo: number | null;
  } | null;
}

interface Entrega {
  id: number;
  tipo: string;
  nome: string;
  concluido: boolean;
  data: string | null;
}

interface MetaApi {
  projeto: Projeto;
  meta: {
    id: number;
    ordem: number;
    tituloMeta: string;
    descricaoMeta: string;
    quantidadePrevista: number;
    tituloPropostaEdital?: string;
  };
  inicio: string | null;
  termino: string | null;
  executada: number | null;
  percentualFisico: number | null;
  situacao: SituacaoCumprimento;
  entregas: Entrega[];
  totais: Totais;
  itens: {
    item: {
      id: number;
      ativo: boolean;
      dados: {
        descricao: string;
        quantidadePrevista: number;
        unidadeMedida: string;
        valorUnitarioPrevisto: number;
      };
    };
    totais: Totais;
  }[];
}

interface PainelApi {
  organizacao: string;
  dataReferencia: string;
  projetos: Projeto[];
  metas: MetaApi[];
  pagamentos: { metaId: number; mes: string; valor: number }[];
}

export const percentualSeguro = (parte: number, total: number) =>
  total > 0 ? (parte / total) * 100 : null;
export const formatarMes = (mes: string) =>
  `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
export const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function mapMeta(registro: MetaApi) {
  const { meta, projeto, totais, executada } = registro;
  const itens = registro.itens.map(({ item, totais }) => ({
    id: String(item.id),
    ativo: item.ativo,
    nome: item.dados.descricao,
    quantidade: `${item.dados.quantidadePrevista.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${item.dados.unidadeMedida}`,
    valorUnitario: item.dados.valorUnitarioPrevisto,
    previsto: totais.valorPrevisto,
    pago: totais.execucao?.valorPago ?? null,
    comprometido: totais.execucao?.valorComprometido ?? null,
    saldo: totais.execucao?.saldoOrcamentario ?? null,
    percentual: totais.execucao?.percentualExecucaoFinanceira ?? null,
  }));
  return {
    meta: { ...meta, id: String(meta.id), prazo: registro.termino },
    projeto: { ...projeto, id: String(projeto.id) },
    numero: meta.ordem,
    inicio: registro.inicio,
    termino: registro.termino,
    quantidadePrevista: meta.quantidadePrevista,
    quantidadeExecutada: executada,
    diferenca: executada === null ? null : executada - meta.quantidadePrevista,
    percentualFisico: registro.percentualFisico,
    situacao: registro.situacao,
    entregas: registro.entregas,
    orcamentoPrevisto: totais.valorPrevisto,
    valorPago: totais.execucao?.valorPago ?? null,
    valorComprometido: totais.execucao?.valorComprometido ?? null,
    saldo: totais.execucao?.saldoOrcamentario ?? null,
    percentualFinanceiro: totais.execucao?.percentualExecucaoFinanceira ?? null,
    itens,
  };
}

export type MetaCalc = ReturnType<typeof mapMeta>;

async function buscarPainel(
  relatorio: boolean,
  projetoId: string,
  inicio: string,
  fim: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams();
  if (projetoId && projetoId !== "TODOS") params.set("projetoId", projetoId);
  if (inicio) params.set("inicio", inicio);
  if (fim) params.set("fim", fim);
  const rota = relatorio
    ? "/relatorios/cumprimento-metas"
    : "/prestacao-metas/painel";
  const resposta = await apiFetch<PainelApi>(`${rota}?${params}`, { signal });
  return {
    ...resposta,
    projetos: resposta.projetos.map((p) => ({ ...p, id: String(p.id) })),
    metas: resposta.metas.map(mapMeta),
  };
}

export type PainelProjeto = Awaited<ReturnType<typeof buscarPainel>>;

export function usePainelCumprimento(
  relatorio: boolean,
  projetoId = "",
  inicio = "",
  fim = "",
) {
  const [versao, setVersao] = useState(0);
  const [projetos, setProjetos] = useState<PainelProjeto["projetos"]>([]);
  const [metasDoCatalogo, setMetasDoCatalogo] = useState<
    PainelProjeto["metas"]
  >([]);
  const chave = JSON.stringify([relatorio, projetoId, inicio, fim, versao]);
  const [resposta, setResposta] = useState<{
    chave: string;
    painel?: PainelProjeto;
    erro?: string;
  }>();
  useEffect(() => {
    const atualizar = () => setVersao((v) => v + 1);
    window.addEventListener(REPORT_DATA_INVALIDATED_EVENT, atualizar);
    return () =>
      window.removeEventListener(REPORT_DATA_INVALIDATED_EVENT, atualizar);
  }, []);
  const invertido = Boolean(inicio && fim && fim < inicio);
  useEffect(() => {
    if (invertido) return;
    const controller = new AbortController();
    void buscarPainel(relatorio, projetoId, inicio, fim, controller.signal)
      .then((painel) => {
        if (controller.signal.aborted) return;
        setProjetos(painel.projetos);
        if (relatorio && projetoId === "TODOS")
          setMetasDoCatalogo(painel.metas);
        setResposta({ chave, painel });
      })
      .catch((erro: unknown) => {
        if (!controller.signal.aborted)
          setResposta({
            chave,
            erro:
              erro instanceof Error
                ? erro.message
                : "Não foi possível carregar o cumprimento de metas.",
          });
      });
    return () => controller.abort();
  }, [relatorio, projetoId, inicio, fim, chave, invertido]);
  const atual = resposta?.chave === chave ? resposta : undefined;
  return {
    painel: atual?.painel,
    projetos,
    metasDoCatalogo,
    erro: invertido
      ? "O período final não pode ser anterior ao inicial."
      : atual?.erro,
    carregando: !invertido && !atual,
    recarregar: () => setVersao((v) => v + 1),
  };
}

export function somarApurado(valores: (number | null)[]) {
  return valores.some((valor) => valor !== null)
    ? valores.reduce((soma, valor) => soma + (valor ?? 0), 0)
    : null;
}

export const coresCumprimento = {
  sucesso: "hsl(160 60% 40%)",
  parcial: "hsl(38 92% 50%)",
  perigo: "hsl(350 70% 52%)",
  info: "hsl(205 80% 50%)",
  neutro: "hsl(var(--muted-foreground) / 0.45)",
  primaria: "hsl(var(--primary))",
};

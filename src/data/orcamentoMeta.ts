import { apiFetchResponse } from "@/lib/api";

export interface DadosItemOrcamentoMeta {
  descricao: string;
  unidadeMedida: string;
  quantidadePrevista: number;
  valorUnitarioPrevisto: number;
  dataInicioPrevista: string | null;
  dataTerminoPrevista: string | null;
  observacoes: string | null;
  ordem: number | null;
}

export interface ItemOrcamentoMeta {
  id: number;
  ativo: boolean;
  dados: DadosItemOrcamentoMeta;
  valorTotalPrevisto: string;
}

interface OrcamentoMeta {
  totais: { valorPrevisto: string | null };
  itens: { item: ItemOrcamentoMeta }[];
}

const rotaMeta = (metaId: string) => `/metas-projeto/${metaId}/orcamento`;

async function buscarComTotaisExatos<T>(path: string, init: RequestInit) {
  const response = await apiFetchResponse(path, init);
  const json = await response.text();
  // Os totais vêm em decimais com duas casas e podem exceder a precisão de Number.
  // O padrão consome também as demais strings para ignorar ocorrências dentro de textos.
  return JSON.parse(
    json.replace(
      /"(?:[^"\\]|\\.)*"(?:\s*:\s*(\d+(?:\.\d+)?))?/g,
      (token, valor: string | undefined) =>
        valor && /^"valor(?:Total)?Previsto"/.test(token)
          ? token.slice(0, -valor.length) + JSON.stringify(valor)
          : token,
    ),
  ) as T;
}

export function getOrcamentoMeta(metaId: string, signal?: AbortSignal) {
  return buscarComTotaisExatos<OrcamentoMeta>(rotaMeta(metaId), { signal });
}

export function salvarItemOrcamentoMeta(
  metaId: string,
  dados: DadosItemOrcamentoMeta,
  itemId?: number,
) {
  const rota = `${rotaMeta(metaId)}/itens`;
  return buscarComTotaisExatos<ItemOrcamentoMeta>(
    itemId == null ? rota : `${rota}/${itemId}`,
    {
      method: itemId == null ? "POST" : "PUT",
      body: JSON.stringify(dados),
    },
  );
}

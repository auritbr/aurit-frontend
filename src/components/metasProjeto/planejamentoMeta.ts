import type {
  DadosItemOrcamentoMeta,
  ItemOrcamentoMeta,
} from "@/data/orcamentoMeta";
import { parseCurrencyInput } from "@/data/planejamentoFinanceiro";

export interface PlanejamentoMeta {
  valorEstimado: string;
  inicio: string;
  termino: string;
}

export const planejamentoVazio: PlanejamentoMeta = {
  valorEstimado: "",
  inicio: "",
  termino: "",
};

export function carregarPlanejamento(
  itens: ItemOrcamentoMeta[],
  total: string | null,
): PlanejamentoMeta {
  if (!itens.length) return planejamentoVazio;
  const [inteira, centavos = "00"] = (total ?? "").split(".");
  const inicio = itens[0].dados.dataInicioPrevista ?? "";
  const termino = itens[0].dados.dataTerminoPrevista ?? "";
  return {
    valorEstimado: inteira
      ? `${inteira.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos.padEnd(2, "0")}`
      : "",
    inicio: itens.every(
      ({ dados }) => (dados.dataInicioPrevista ?? "") === inicio,
    )
      ? inicio
      : "",
    termino: itens.every(
      ({ dados }) => (dados.dataTerminoPrevista ?? "") === termino,
    )
      ? termino
      : "",
  };
}

export function validarPlanejamento(
  { valorEstimado, inicio, termino }: PlanejamentoMeta,
  valorLegado: boolean,
) {
  const centavos = valorEstimado.replace(/\D/g, "");
  if (!valorLegado && (!centavos || centavos.length > 15))
    return "Informe um valor estimado válido.";
  if (inicio && termino && termino < inicio)
    return "A data de término não pode ser anterior à data de início.";
}

export function dadosPlanejamento(
  planejamento: PlanejamentoMeta,
  item?: ItemOrcamentoMeta,
): DadosItemOrcamentoMeta {
  return {
    // O backend representa o planejamento único como um item de quantidade 1.
    ...(item?.dados ?? {
      descricao: "Planejamento Financeiro da Meta",
      unidadeMedida: "Unidade",
      quantidadePrevista: 1,
      observacoes: null,
      ordem: null,
    }),
    valorUnitarioPrevisto:
      item && item.dados.quantidadePrevista !== 1
        ? item.dados.valorUnitarioPrevisto
        : parseCurrencyInput(planejamento.valorEstimado),
    dataInicioPrevista: planejamento.inicio || null,
    dataTerminoPrevista: planejamento.termino || null,
  };
}

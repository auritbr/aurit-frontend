import type { TimelineItem } from "@/components/Timeline";
import type { Patrimonio } from "@/data/patrimonio";
import type { Emprestimo } from "@/data/emprestimos";
import { buildEmprestimoHistorico, dataHistoricoISO } from "./emprestimo";
export function buildPatrimonioHistorico(
  p: Patrimonio,
  emprestimos: readonly Emprestimo[],
): TimelineItem[] {
  const data = dataHistoricoISO(p.dataAquisicao);
  const items: TimelineItem[] = data
    ? [
        {
          id: `pat-${p.id}-aquisicao`,
          data,
          titulo: "Aquisição do bem",
          descricao: p.nomePatrimonio,
        },
      ]
    : [];
  return [
    ...items,
    ...emprestimos
      .filter((e) => e.patrimonioId === String(p.id))
      .flatMap(buildEmprestimoHistorico),
  ];
}
export const observacaoPatrimonioHistorico =
  "Baseado nas datas de aquisição e nos empréstimos registrados. Mudanças de situação sem data registrada não aparecem como acontecimentos.";

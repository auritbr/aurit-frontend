import type { TimelineItem } from "@/components/Timeline";
import type { Emprestimo } from "@/data/emprestimos";
import { dataISO } from "@/lib/periodComparison";
export const dataHistoricoISO = dataISO;
export function buildEmprestimoHistorico(e: Emprestimo): TimelineItem[] {
  const items: TimelineItem[] = [];
  const add = (
    suffix: string,
    valor: string,
    titulo: string,
    descricao?: string,
    tipo: TimelineItem["tipo"] = "realizado",
  ) => {
    const data = dataISO(valor);
    if (data)
      items.push({
        id: `emp-${e.id}-${suffix}`,
        data,
        titulo,
        descricao,
        tipo,
        href: `/emprestimos/${e.id}`,
      });
  };
  add(
    "saida",
    e.dataEmprestimo,
    "Empréstimo registrado",
    e.observacaoEmprestimo,
  );
  add(
    "prevista",
    e.dataPrevistaDevolucao,
    "Devolução prevista",
    undefined,
    "previsto",
  );
  if (e.dataDevolucao)
    add(
      "devolucao",
      e.dataDevolucao,
      "Devolução registrada",
      e.observacaoDevolucao,
    );
  return items;
}
export const observacaoEmprestimoHistorico = (_e?: Emprestimo) =>
  "Baseado nas datas de empréstimo e devolução registradas. A previsão de devolução não comprova uma devolução realizada.";

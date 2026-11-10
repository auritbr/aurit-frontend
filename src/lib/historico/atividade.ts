import { CalendarCheck, Flag, Play } from "lucide-react";
import type { TimelineItem } from "@/components/Timeline";
import type { Atividade } from "@/data/atividades";
import type { RegistroPresenca } from "@/data/relatorioPresencas";
import { statusPresencaOptions } from "@/data/relatorioPresencas";
import type { PlanoAula } from "@/data/planosAula";
import { dataHistoricoISO } from "./emprestimo";
export const hojeISO = () => new Date().toLocaleDateString("sv-SE");
export function itensFrequencia(
  registros: readonly RegistroPresenca[],
  prefixo: string,
): TimelineItem[] {
  const grupos = new Map<string, RegistroPresenca[]>();
  registros.forEach((r) => {
    const data = dataHistoricoISO(r.data);
    if (data) grupos.set(data, [...(grupos.get(data) ?? []), r]);
  });
  return Array.from(grupos, ([data, rows]) => ({
    id: `${prefixo}-freq-${data}`,
    data,
    titulo: "Registro de frequência",
    icon: CalendarCheck,
    descricao: statusPresencaOptions
      .map((o) => {
        const n = rows.filter((r) => r.status === o.value).length;
        return n ? `${o.label}: ${n}` : "";
      })
      .filter(Boolean)
      .join(" · "),
    href: "/presencas",
  }));
}
export function itensEncontros(
  planos: readonly PlanoAula[],
  prefixo: string,
): TimelineItem[] {
  return planos.flatMap((p) => {
    const data = dataHistoricoISO(p.dataInicio);
    return data && p.statusPlanoAula === "REALIZADO"
      ? [
          {
            id: `${prefixo}-plano-${p.id}`,
            data,
            titulo: "Encontro realizado (plano de aula concluído)",
            descricao: p.conteudo,
            href: `/planos-aula/${p.id}`,
          },
        ]
      : [];
  });
}
export function construirHistoricoAtividade(
  a: Atividade,
  registros: readonly RegistroPresenca[],
  planos: readonly PlanoAula[],
): TimelineItem[] {
  const items: TimelineItem[] = [],
    hoje = hojeISO();
  const inicio = dataHistoricoISO(a.dataInicio),
    fim = dataHistoricoISO(a.dataFim);
  if (inicio)
    items.push({
      id: `at-${a.id}-inicio`,
      data: inicio,
      titulo: "Início informado da atividade",
      icon: Play,
      tipo: inicio > hoje ? "previsto" : "realizado",
    });
  if (fim)
    items.push({
      id: `at-${a.id}-fim`,
      data: fim,
      titulo: "Término informado da atividade",
      icon: Flag,
      tipo: a.status === "CONCLUIDO" && fim <= hoje ? "realizado" : "previsto",
    });
  return [
    ...items,
    ...itensFrequencia(
      registros.filter((r) => r.atividadeId === String(a.id)),
      `at-${a.id}`,
    ),
    ...itensEncontros(
      planos.filter((p) => p.atividadeId === String(a.id)),
      `at-${a.id}`,
    ),
  ];
}

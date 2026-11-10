import { Camera, Flag, Layers, Play, Sparkles } from "lucide-react";
import type { TimelineItem } from "@/components/Timeline";
import type { Projeto } from "@/data/projetos";
import type { Atividade } from "@/data/atividades";
import type { EventoCultural } from "@/data/eventosCulturais";
import type { EvidenciaFotografica } from "@/data/evidencias";
import { dataHistoricoISO } from "./emprestimo";
import { hojeISO } from "./atividade";
export function construirHistoricoProjeto(
  p: Projeto,
  atividades: readonly Atividade[],
  eventos: readonly EventoCultural[],
  evidencias: readonly EvidenciaFotografica[],
): TimelineItem[] {
  const items: TimelineItem[] = [],
    hoje = hojeISO();
  const add = (
    id: string,
    valor: string | undefined | null,
    titulo: string,
    icon: TimelineItem["icon"],
    href?: string,
    tipo?: TimelineItem["tipo"],
    descricao?: string,
  ) => {
    const data = dataHistoricoISO(valor);
    if (data)
      items.push({
        id,
        data,
        titulo,
        icon,
        href,
        descricao,
        tipo: tipo ?? (data > hoje ? "previsto" : "realizado"),
      });
  };
  add(`pj-${p.id}-ini`, p.dataInicio, "Início informado do projeto", Play);
  const fim = dataHistoricoISO(p.dataFim);
  add(
    `pj-${p.id}-fim`,
    fim,
    "Término informado do projeto",
    Flag,
    undefined,
    p.status === "CONCLUIDO" && fim && fim <= hoje ? "realizado" : "previsto",
  );
  atividades
    .filter((a) => a.projetoId === String(p.id))
    .forEach((a) =>
      add(
        `pj-at-${a.id}`,
        a.dataInicio,
        `Início da atividade: ${a.nomeAtividade}`,
        Layers,
        `/atividades/${a.id}`,
      ),
    );
  eventos
    .filter(
      (e) =>
        (e.projetosIds ?? []).map(String).includes(String(p.id)) ||
        e.projetoId === String(p.id),
    )
    .forEach((e) => {
      const data = dataHistoricoISO(e.dataEvento);
      add(
        `pj-ev-${e.id}`,
        data,
        `Evento cultural: ${e.nomeEvento}`,
        Sparkles,
        `/eventos-culturais/${e.id}`,
        e.status === "CONCLUIDO" && data && data <= hoje
          ? "realizado"
          : "previsto",
      );
    });
  evidencias
    .filter((e) => String(e.projeto.id) === String(p.id))
    .forEach((e) =>
      add(
        `pj-evd-${e.id}`,
        e.dataCriacao,
        "Evidência de execução cadastrada",
        Camera,
        `/evidencias/${e.id}`,
        "realizado",
        e.descricao ?? undefined,
      ),
    );
  return items;
}

import type { ParticipanteVinculo } from "@/data/participantes";

interface FiltrosDeMatricula {
  atividade: readonly string[];
  turma: readonly string[];
  statusMatricula: readonly string[];
}

export function participanteAtendeFiltrosDeMatricula(
  vinculos: readonly ParticipanteVinculo[],
  filtros: FiltrosDeMatricula,
): boolean {
  if (
    !filtros.atividade.length &&
    !filtros.turma.length &&
    !filtros.statusMatricula.length
  )
    return true;

  return vinculos.some(
    (vinculo) =>
      (!filtros.atividade.length ||
        filtros.atividade.includes(vinculo.atividadeId)) &&
      (!filtros.turma.length ||
        (!!vinculo.turmaId && filtros.turma.includes(vinculo.turmaId))) &&
      (!filtros.statusMatricula.length ||
        filtros.statusMatricula.includes(vinculo.statusMatricula ?? "")),
  );
}

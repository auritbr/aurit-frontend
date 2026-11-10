import type { TimelineItem } from "@/components/Timeline";
import type { Turma } from "@/data/turmas";
import type { RegistroPresenca } from "@/data/relatorioPresencas";
import type { PlanoAula } from "@/data/planosAula";
import {
  statusMatriculaValueToLabel,
  type ParticipanteAtividadeApiDTO,
} from "@/data/participantes";
import { itensEncontros, itensFrequencia } from "./atividade";
import { dataHistoricoISO } from "./emprestimo";
export function construirHistoricoTurma(
  t: Turma,
  registros: readonly RegistroPresenca[],
  planos: readonly PlanoAula[],
  matriculas: readonly ParticipanteAtividadeApiDTO[],
): TimelineItem[] {
  return [
    ...matriculas
      .filter((matricula) => String(matricula.turmaId) === String(t.id))
      .map((matricula): TimelineItem => {
        const data = dataHistoricoISO(matricula.dataMatricula);
        return {
          id: `tu-${t.id}-matricula-${matricula.id ?? matricula.participanteId}`,
          data: data ?? "",
          titulo: data ? "Matrícula registrada" : "Matrícula vinculada à turma",
          descricao: [
            matricula.participanteId &&
              `Participante nº ${matricula.participanteId}`,
            matricula.statusMatricula &&
              `Situação atual: ${statusMatriculaValueToLabel(matricula.statusMatricula)}`,
          ]
            .filter(Boolean)
            .join(" · "),
          href: matricula.participanteId
            ? `/participantes/${encodeURIComponent(matricula.participanteId)}`
            : undefined,
        };
      }),
    ...itensFrequencia(
      registros.filter(
        (r) =>
          r.atividadeId === String(t.atividadeId) && r.turmaId === String(t.id),
      ),
      `tu-${t.id}`,
    ),
    ...itensEncontros(
      planos.filter(
        (p) =>
          p.atividadeId === String(t.atividadeId) &&
          (p.turmaIds ?? [p.turmaId]).some((id) => String(id) === String(t.id)),
      ),
      `tu-${t.id}`,
    ),
  ];
}

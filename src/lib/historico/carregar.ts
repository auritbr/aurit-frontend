import type { TimelineItem } from "@/components/Timeline";
import { getAtividadesByProjeto, type Atividade } from "@/data/atividades";
import { getEmprestimos, type Emprestimo } from "@/data/emprestimos";
import { getEventosCulturais } from "@/data/eventosCulturais";
import { getEvidenciasFotograficas } from "@/data/evidencias";
import type { ParticipanteAtividadeApiDTO } from "@/data/participantes";
import type { Patrimonio } from "@/data/patrimonio";
import { getPlanosAula } from "@/data/planosAula";
import type { Projeto } from "@/data/projetos";
import { getRegistrosPresencaPorVinculo } from "@/data/relatorioPresencas";
import { getTurmas, type Turma } from "@/data/turmas";
import { apiFetch } from "@/lib/api";
import { construirHistoricoAtividade } from "./atividade";
import { buildEmprestimoHistorico } from "./emprestimo";
import {
  consultarTrajetoria,
  dataHoraTrajetoria,
} from "@/lib/trajetoriaParticipante";
import { buildPatrimonioHistorico } from "./patrimonio";
import { construirHistoricoProjeto } from "./projeto";
import { construirHistoricoTurma } from "./turma";

export type RecursoHistorico =
  | "atividades"
  | "turmas"
  | "participantes"
  | "patrimonios"
  | "projetos"
  | "emprestimos";

export type ResultadoHistorico = {
  items: TimelineItem[];
  indisponiveis?: string[];
  observacao?: string;
  proximaPagina?: number;
};

function historicoComFontes(
  items: TimelineItem[],
  fontes: [string, PromiseSettledResult<unknown>][],
): ResultadoHistorico {
  const indisponiveis = fontes.flatMap(([nome, fonte]) =>
    fonte.status === "rejected" ? [nome] : [],
  );
  if (
    !items.length &&
    fontes.length &&
    indisponiveis.length === fontes.length
  ) {
    throw new Error("Não foi possível consultar os registros relacionados.");
  }
  return { items, indisponiveis };
}

const registros = <T>(fonte: PromiseSettledResult<T[]>) =>
  fonte.status === "fulfilled" ? fonte.value : [];

export async function carregarHistoricoAtividade(
  atividade: Atividade,
): Promise<ResultadoHistorico> {
  const [frequencia, planos, turmas] = await Promise.allSettled([
    getRegistrosPresencaPorVinculo("atividade", atividade.id),
    getPlanosAula({ atividadeId: atividade.id }),
    getTurmas(),
  ]);
  return historicoComFontes(
    [
      ...construirHistoricoAtividade(
        atividade,
        registros(frequencia),
        registros(planos),
      ),
      ...registros(turmas)
        .filter((turma) => String(turma.atividadeId) === String(atividade.id))
        .map((turma): TimelineItem => ({
          id: `at-${atividade.id}-turma-${turma.id}`,
          data: "",
          titulo: "Turma vinculada",
          descricao: turma.nomeTurma,
          href: `/turmas/${encodeURIComponent(turma.id)}`,
        })),
    ],
    [
      ["frequências", frequencia],
      ["planos de aula", planos],
      ["turmas vinculadas", turmas],
    ],
  );
}

export async function carregarHistoricoTurma(
  turma: Turma,
): Promise<ResultadoHistorico> {
  const [frequencia, planos, matriculas] = await Promise.allSettled([
    getRegistrosPresencaPorVinculo("turma", turma.id),
    getPlanosAula({
      atividadeId: turma.atividadeId,
      turmaId: String(turma.id),
    }),
    apiFetch<ParticipanteAtividadeApiDTO[]>(
      `/participantes/turma/${encodeURIComponent(turma.id)}`,
    ),
  ]);
  return historicoComFontes(
    construirHistoricoTurma(
      turma,
      registros(frequencia),
      registros(planos),
      registros(matriculas),
    ),
    [
      ["frequências", frequencia],
      ["planos de aula", planos],
      ["matrículas", matriculas],
    ],
  );
}

export async function carregarHistoricoParticipante(
  id: string | number,
  pagina: number,
  signal: AbortSignal,
): Promise<ResultadoHistorico> {
  const resposta = await consultarTrajetoria(
    String(id),
    { tipo: "todos", ordem: "desc" },
    pagina,
    signal,
  );
  return {
    items: resposta.content.map((evento) => ({
      id: evento.id,
      data: dataHoraTrajetoria(evento),
      titulo: evento.titulo,
      descricao: [evento.atividadeNome, evento.turmaNome, evento.complemento]
        .filter(Boolean)
        .join(" · "),
    })),
    proximaPagina:
      (pagina + 1) * resposta.size < resposta.totalElements
        ? pagina + 1
        : undefined,
  };
}

export async function carregarHistoricoPatrimonio(
  patrimonio: Patrimonio,
): Promise<ResultadoHistorico> {
  const [emprestimos] = await Promise.allSettled([
    getEmprestimos(patrimonio.id),
  ]);
  return historicoComFontes(
    buildPatrimonioHistorico(patrimonio, registros(emprestimos)),
    [["empréstimos", emprestimos]],
  );
}

export async function carregarHistoricoProjeto(
  projeto: Projeto,
): Promise<ResultadoHistorico> {
  const id = Number(projeto.id);
  const [atividades, eventos, evidencias] = await Promise.allSettled([
    getAtividadesByProjeto(id),
    getEventosCulturais(),
    getEvidenciasFotograficas({ projetoId: id }),
  ]);
  return historicoComFontes(
    construirHistoricoProjeto(
      projeto,
      registros(atividades),
      registros(eventos),
      registros(evidencias),
    ),
    [
      ["atividades", atividades],
      ["eventos culturais", eventos],
      ["evidências", evidencias],
    ],
  );
}

export function carregarHistoricoEmprestimo(
  emprestimo: Emprestimo,
): ResultadoHistorico {
  return { items: buildEmprestimoHistorico(emprestimo) };
}

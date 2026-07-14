import {
  getAtividadesOptions,
  getParticipantes,
  getTurmasOptions,
  tipoDeficienciasParticipanteValueToLabel,
  tipoDeficienciaParticipanteOptions,
  tipoNeurodivergenciasValueToLabel,
  tipoNeurodivergenciaOptions,
  type AtividadeOption,
  type Participante,
  type TipoDeficienciaParticipante,
  type TipoNeurodivergencia,
  type TurmaOption,
} from "@/data/participantes";
import {
  getRelatorioPresencasData,
  type RegistroPresenca,
  type StatusPresenca,
} from "@/data/relatorioPresencas";

export type StatusParticipanteRelatorio =
  | "MATRICULADO"
  | "ATIVO"
  | "PENDENTE"
  | "DESISTENTE"
  | "CONCLUIDO"
  | "INATIVO"
  | "EM_ESPERA"
  | "CANCELADO";

export const statusParticipanteOptions: Array<{
  value: StatusParticipanteRelatorio;
  label: string;
}> = [
  { value: "MATRICULADO", label: "Matriculado" },
  { value: "ATIVO", label: "Ativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "DESISTENTE", label: "Desistente" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "INATIVO", label: "Inativo" },
  { value: "EM_ESPERA", label: "Em espera" },
  { value: "CANCELADO", label: "Cancelado" },
];

export const statusParticipanteLabel = (status: string) =>
  statusParticipanteOptions.find((option) => option.value === status)?.label ??
  status;

export type TipoPresencaFiltro = StatusPresenca;
export type BooleanFiltro = "SIM" | "NAO";

export const tipoPresencaOptions: Array<{
  value: TipoPresencaFiltro;
  label: string;
}> = [
  { value: "PRESENTE", label: "Presente" },
  { value: "AUSENTE", label: "Ausente" },
  { value: "FERIADO", label: "Feriado" },
  { value: "NAO_TEVE_AULA", label: "Não teve aula" },
];

export interface LinhaRelatorioParticipante {
  id: string;
  participanteId: string;
  participanteNome: string;
  tipoNeurodivergencias: TipoNeurodivergencia[];
  tipoDeficiencias: TipoDeficienciaParticipante[];
  possuiCadunico: boolean;
  possuiBolsaFamilia: boolean;
  status: string;
  atividadeId: string;
  atividadeNome: string;
  turmaId?: string;
  turmaNome?: string;
  presencas: number;
  ausencias: number;
  feriados: number;
  semAula: number;
  totalRegistros: number;
  percentualPresenca: number;
  ultimaPresenca?: string;
  registros: RegistroPresenca[];
}

export interface FiltrosRelatorioParticipantes {
  status: StatusParticipanteRelatorio[];
  atividadeId: string;
  turmaId: string;
  presencas: TipoPresencaFiltro[];
  tipoNeurodivergencias: TipoNeurodivergencia[];
  tipoDeficiencias: TipoDeficienciaParticipante[];
  possuiCadunico: BooleanFiltro[];
  possuiBolsaFamilia: BooleanFiltro[];
  busca?: string;
}

export interface RelatorioParticipantesData {
  linhas: LinhaRelatorioParticipante[];
  atividades: AtividadeOption[];
  turmas: TurmaOption[];
}

export const filtrosIniciais: FiltrosRelatorioParticipantes = {
  status: [],
  atividadeId: "SELECIONE",
  turmaId: "SELECIONE",
  presencas: [],
  tipoNeurodivergencias: [],
  tipoDeficiencias: [],
  possuiCadunico: [],
  possuiBolsaFamilia: [],
  busca: "",
};

export const booleanFiltroOptions: Array<{ value: BooleanFiltro; label: string }> = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
];

export const tipoNeurodivergenciaRelatorioOptions = tipoNeurodivergenciaOptions.map(
  (option) => option.value,
);

export const tipoDeficienciaRelatorioOptions =
  tipoDeficienciaParticipanteOptions.map((option) => option.value);

export const booleanFiltroLabel = (value: BooleanFiltro) =>
  booleanFiltroOptions.find((option) => option.value === value)?.label ?? value;

export const tipoNeurodivergenciasRelatorioLabel = (
  values?: TipoNeurodivergencia[],
) => tipoNeurodivergenciasValueToLabel(values ?? []);

export const tipoDeficienciasRelatorioLabel = (
  values?: TipoDeficienciaParticipante[],
) => tipoDeficienciasParticipanteValueToLabel(values ?? []);

function registrosDoVinculo(
  registros: RegistroPresenca[],
  participante: Participante,
  atividadeId: string,
  turmaId?: string,
) {
  return registros.filter(
    (registro) =>
      registro.participanteId === participante.id &&
      registro.atividadeId === atividadeId &&
      (turmaId ? registro.turmaId === turmaId : !registro.turmaId),
  );
}

function contarStatus(registros: RegistroPresenca[], status: StatusPresenca) {
  return registros.filter((registro) => registro.status === status).length;
}

export async function getRelatorioParticipantes(): Promise<RelatorioParticipantesData> {
  const [participantes, atividades, turmas, presencasData] = await Promise.all([
    getParticipantes(),
    getAtividadesOptions(),
    getTurmasOptions(),
    getRelatorioPresencasData(),
  ]);

  const atividadeNomePorId = new Map(
    atividades.map((atividade) => [atividade.id, atividade.nomeAtividade]),
  );
  const turmaNomePorId = new Map(
    turmas.map((turma) => [turma.id, turma.nomeTurma]),
  );
  const linhas: LinhaRelatorioParticipante[] = [];

  for (const participante of participantes) {
    participante.vinculos.forEach((vinculo, index) => {
      if (!vinculo.atividadeId) return;

      const registros = registrosDoVinculo(
        presencasData.registros,
        participante,
        vinculo.atividadeId,
        vinculo.turmaId,
      );
      const presencas = contarStatus(registros, "PRESENTE");
      const ausencias = contarStatus(registros, "AUSENTE");
      const feriados = contarStatus(registros, "FERIADO");
      const semAula = contarStatus(registros, "NAO_TEVE_AULA");
      const basePercentual = presencas + ausencias;
      const ultimaPresenca = registros
        .filter((registro) => registro.status === "PRESENTE")
        .map((registro) => registro.data)
        .filter(Boolean)
        .sort()
        .pop();

      linhas.push({
        id: `${participante.id}-${vinculo.atividadeId}-${vinculo.turmaId ?? "sem-turma"}-${vinculo.id ?? index}`,
        participanteId: participante.id,
        participanteNome: participante.nomeCompleto,
        tipoNeurodivergencias:
          (participante.tipoNeurodivergencias ?? []) as TipoNeurodivergencia[],
        tipoDeficiencias:
          (participante.tipoDeficiencias ?? []) as TipoDeficienciaParticipante[],
        possuiCadunico: Boolean(participante.possuiCadunico),
        possuiBolsaFamilia: Boolean(participante.possuiBolsaFamilia),
        status: vinculo.statusMatricula || participante.status,
        atividadeId: vinculo.atividadeId,
        atividadeNome:
          atividadeNomePorId.get(vinculo.atividadeId) ||
          `Atividade ${vinculo.atividadeId}`,
        turmaId: vinculo.turmaId,
        turmaNome: vinculo.turmaId
          ? turmaNomePorId.get(vinculo.turmaId) || `Turma ${vinculo.turmaId}`
          : undefined,
        presencas,
        ausencias,
        feriados,
        semAula,
        totalRegistros: registros.length,
        percentualPresenca:
          basePercentual > 0 ? (presencas / basePercentual) * 100 : 0,
        ultimaPresenca,
        registros,
      });
    });
  }

  return { linhas, atividades, turmas };
}

export function aplicarFiltros(
  linhas: LinhaRelatorioParticipante[],
  filtros: FiltrosRelatorioParticipantes,
): LinhaRelatorioParticipante[] {
  const busca = filtros.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";

  return linhas.filter((linha) => {
    if (
      filtros.status.length > 0 &&
      filtros.status.length < statusParticipanteOptions.length &&
      !filtros.status.includes(linha.status as StatusParticipanteRelatorio)
    ) {
      return false;
    }

    if (
      filtros.atividadeId !== "TODOS" &&
      filtros.atividadeId !== "SELECIONE" &&
      linha.atividadeId !== filtros.atividadeId
    ) {
      return false;
    }

    if (filtros.turmaId !== "TODOS" && filtros.turmaId !== "SELECIONE" && linha.turmaId !== filtros.turmaId) {
      return false;
    }

    if (
      filtros.presencas.length > 0 &&
      filtros.presencas.length < tipoPresencaOptions.length &&
      !filtros.presencas.some((status) =>
        linha.registros.some((registro) => registro.status === status),
      )
    ) {
      return false;
    }

    if (
      filtros.tipoNeurodivergencias.length > 0 &&
      filtros.tipoNeurodivergencias.length < tipoNeurodivergenciaRelatorioOptions.length &&
      !filtros.tipoNeurodivergencias.some((tipo) =>
        linha.tipoNeurodivergencias.includes(tipo),
      )
    ) {
      return false;
    }

    if (
      filtros.tipoDeficiencias.length > 0 &&
      filtros.tipoDeficiencias.length < tipoDeficienciaRelatorioOptions.length &&
      !filtros.tipoDeficiencias.some((tipo) =>
        linha.tipoDeficiencias.includes(tipo),
      )
    ) {
      return false;
    }

    if (
      filtros.possuiCadunico.length > 0 &&
      filtros.possuiCadunico.length < booleanFiltroOptions.length &&
      !filtros.possuiCadunico.includes(linha.possuiCadunico ? "SIM" : "NAO")
    ) {
      return false;
    }

    if (
      filtros.possuiBolsaFamilia.length > 0 &&
      filtros.possuiBolsaFamilia.length < booleanFiltroOptions.length &&
      !filtros.possuiBolsaFamilia.includes(
        linha.possuiBolsaFamilia ? "SIM" : "NAO",
      )
    ) {
      return false;
    }

    if (
      busca &&
      ![
        linha.participanteNome,
        tipoNeurodivergenciasRelatorioLabel(linha.tipoNeurodivergencias),
        tipoDeficienciasRelatorioLabel(linha.tipoDeficiencias),
        linha.possuiCadunico ? "cadunico cadúnico sim" : "cadunico cadúnico não",
        linha.possuiBolsaFamilia
          ? "bolsa familia bolsa família sim"
          : "bolsa familia bolsa família não",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(busca)
    ) {
      return false;
    }

    return true;
  });
}

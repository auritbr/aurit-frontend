import { apiFetch } from "@/lib/api";
import { queryAnalitica } from "@/data/analitico";
import { dataISO } from "@/lib/periodComparison";

export type TipoEvento =
  | "cadastro"
  | "matricula"
  | "vinculo"
  | "presenca"
  | "ausencia"
  | "justificada"
  | "encontro"
  | "encerramento";
export type CategoriaFiltro =
  | "todos"
  | "cadastros"
  | "atividades"
  | "presencas"
  | "ausencias"
  | "encontro"
  | "encerramentos";

type AtividadeTurma = {
  atividadeId: string;
  atividadeNome: string;
  turmaId: string | null;
  turmaNome: string | null;
};

export interface EventoTrajetoria extends AtividadeTurma {
  id: string;
  data: string | null;
  hora?: string | null;
  tipo: TipoEvento;
  titulo: string;
  complemento: string | null;
}

interface Vinculo extends AtividadeTurma {
  id: string;
  dataMatricula: string | null;
  statusMatricula: string;
}

export interface FrequenciaTrajetoria extends AtividadeTurma {
  mes: string;
  presencas: number;
  ausencias: number;
  primeiroRegistro: string;
  ultimaPresenca: string | null;
}

interface ResumoTrajetoria {
  participante: {
    nomeCompleto: string;
    status: string;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cep?: string | null;
    cidade: string | null;
    estado: string | null;
  };
  vinculos: Vinculo[];
  frequencia: FrequenciaTrajetoria[];
  frequenciaDisponivel: boolean;
}

export type FiltrosTrajetoria = {
  inicio?: string;
  fim?: string;
  tipo: CategoriaFiltro;
  atividadeId?: string;
  turmaId?: string;
  ordem: "asc" | "desc";
};

export function consultarTrajetoria(
  id: string,
  filtros: FiltrosTrajetoria,
  page: number,
  signal: AbortSignal,
) {
  return apiFetch<{
    content: EventoTrajetoria[];
    totalElements: number;
    page: number;
    size: number;
  }>(
    `/participantes/${encodeURIComponent(id)}/linha-do-tempo${queryAnalitica({ ...filtros, page, size: 30 })}`,
    { signal },
  );
}

export function dataHoraTrajetoria(evento: EventoTrajetoria) {
  return evento.data && evento.hora
    ? `${evento.data}T${evento.hora}`
    : (evento.data ?? "");
}

export function consultarResumoTrajetoria(
  id: string,
  periodo: { inicio?: string; fim?: string },
  signal: AbortSignal,
) {
  return apiFetch<ResumoTrajetoria>(
    `/participantes/${encodeURIComponent(id)}/linha-do-tempo/resumo${queryAnalitica(periodo)}`,
    { signal },
  );
}

export function resumoFrequencia(regs: readonly FrequenciaTrajetoria[]) {
  const presencas = regs.reduce((soma, item) => soma + item.presencas, 0);
  const ausencias = regs.reduce((soma, item) => soma + item.ausencias, 0);
  const validos = presencas + ausencias;
  return {
    presencas,
    ausencias,
    validos,
    percentual: validos ? (presencas / validos) * 100 : null,
  };
}

export function indicadoresTrajetoria(resumo: ResumoTrajetoria) {
  const fontes = [...resumo.vinculos, ...resumo.frequencia];
  const datasMatricula = resumo.vinculos
    .flatMap((v) => (v.dataMatricula ? [v.dataMatricula] : []))
    .sort();
  const datasPresenca = resumo.frequencia
    .flatMap((v) => (v.ultimaPresenca ? [v.ultimaPresenca] : []))
    .sort();
  return {
    atividades: new Set(fontes.map((v) => v.atividadeId)).size,
    turmas: new Set(fontes.flatMap((v) => (v.turmaId ? [v.turmaId] : []))).size,
    primeiroVinculo: datasMatricula[0] ?? null,
    ultimaPresenca: datasPresenca.at(-1) ?? null,
    frequencia: resumoFrequencia(resumo.frequencia),
  };
}

export function agruparFrequencia(
  regs: readonly FrequenciaTrajetoria[],
  chave: (r: FrequenciaTrajetoria) => string | null,
) {
  const grupos = new Map<string, FrequenciaTrajetoria[]>();
  for (const registro of regs) {
    const key = chave(registro);
    if (!key) continue;
    const grupo = grupos.get(key) ?? [];
    grupo.push(registro);
    grupos.set(key, grupo);
  }
  return grupos;
}

export function vinculosTrajetoria(resumo: ResumoTrajetoria) {
  const chave = (r: AtividadeTurma) => `${r.atividadeId}:${r.turmaId ?? ""}`;
  const frequencias = agruparFrequencia(resumo.frequencia, chave);
  const vinculos = new Map<
    string,
    AtividadeTurma & { dataMatricula: string | null; status: string | null }
  >();
  for (const v of resumo.vinculos) {
    const key = chave(v);
    const atual = vinculos.get(key);
    if (
      !atual ||
      (v.dataMatricula && v.dataMatricula >= (atual.dataMatricula ?? ""))
    ) {
      vinculos.set(key, { ...v, status: v.statusMatricula });
    }
  }
  for (const registro of resumo.frequencia) {
    const key = chave(registro);
    if (!vinculos.has(key))
      vinculos.set(key, { ...registro, dataMatricula: null, status: null });
  }
  return Array.from(vinculos, ([key, vinculo]) => {
    const frequencia = frequencias.get(key) ?? [];
    const datas = frequencia.map((r) => r.primeiroRegistro).sort();
    return {
      ...vinculo,
      freq: resumoFrequencia(frequencia),
      primeiro: datas[0] ?? null,
    };
  });
}

export function formatarDataBR(value: string | null | undefined) {
  return dataISO(value)?.split("-").reverse().join("/") ?? null;
}

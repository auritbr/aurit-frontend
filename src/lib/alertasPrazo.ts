import { getEditais, type EditalData } from "@/data/editais";
import { getEmprestimos, type Emprestimo } from "@/data/emprestimos";
import { getPatrimonios } from "@/data/patrimonio";
import {
  getRelatorioPresencasData,
  type RegistroPresenca,
} from "@/data/relatorioPresencas";
import {
  getAtividadesPresenca,
  getParticipantesPresenca,
  getTurmasPresenca,
} from "@/data/presencas";
import { getJsonHeaders } from "@/lib/apiHeaders";
import { isPlanoAccessDenied } from "@/lib/access";
import { isPlanoGratuitoAtual } from "@/lib/plano";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type AlertaSeveridade = "vencido" | "hoje" | "proximo";

export interface AlertaItem<T> {
  item: T;
  dias: number;
}

export interface AlertaResumo<T> {
  vencidos: AlertaItem<T>[];
  hoje: AlertaItem<T>[];
  proximos: AlertaItem<T>[];
  total: number;
  topo: AlertaSeveridade;
}

export interface AusenciaConsecutiva {
  participanteId: string;
  participanteNome: string;
  atividadeId: string;
  atividadeNome: string;
  turmaId?: string;
  turmaNome?: string;
  quantidade: number;
  ultimaAusencia: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const clean = value.trim().slice(0, 10);
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    [year, month, day] = clean.split("-").map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    [day, month, year] = clean.split("/").map(Number);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calendarDayValue(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(value: string, today = new Date()): number | null {
  const date = parseDate(value);

  if (!date) return null;

  return Math.round(
    (calendarDayValue(date) - calendarDayValue(today)) / MS_PER_DAY,
  );
}

function buildResumo<T>(items: AlertaItem<T>[]): AlertaResumo<T> | null {
  if (items.length === 0) return null;

  const vencidos = items.filter(({ dias }) => dias < 0);
  const hoje = items.filter(({ dias }) => dias === 0);
  const proximos = items
    .filter(({ dias }) => dias === 5 || dias === 10)
    .sort((a, b) => a.dias - b.dias);

  return {
    vencidos,
    hoje,
    proximos,
    total: items.length,
    topo: vencidos.length ? "vencido" : hoje.length ? "hoje" : "proximo",
  };
}

export function montarAlertasEmprestimos(
  emprestimos: Emprestimo[],
  today = new Date(),
): AlertaResumo<Emprestimo> | null {
  const items = emprestimos.flatMap((emprestimo) => {
    if (
      emprestimo.statusEmprestimo === "DEVOLVIDO" ||
      emprestimo.statusEmprestimo === "CANCELADO"
    ) {
      return [];
    }

    const dias = daysUntil(emprestimo.dataPrevistaDevolucao, today);

    return dias !== null &&
      (dias < 0 || dias === 0 || dias === 5 || dias === 10)
      ? [{ item: emprestimo, dias }]
      : [];
  });

  return buildResumo(items);
}

export function montarAlertasEditais(
  editais: EditalData[],
  today = new Date(),
): AlertaResumo<EditalData> | null {
  const items = editais.flatMap((edital) => {
    if (
      edital.statusEdital === "CANCELADO" ||
      edital.statusEdital === "ARQUIVADO"
    ) {
      return [];
    }

    const dias = daysUntil(edital.dataEncerramento, today);

    return dias !== null &&
      (dias < 0 || dias === 0 || dias === 5 || dias === 10)
      ? [{ item: edital, dias }]
      : [];
  });

  return buildResumo(items);
}

type AnyRecord = Record<string, unknown>;

interface DadosEnriquecimentoPresenca {
  participanteNomePorId?: Record<string, string>;
  atividadeNomePorId?: Record<string, string>;
  turmaNomePorId?: Record<string, string>;
}

interface RegistroPresencaNormalizado {
  participanteId: string;
  participanteNome: string;
  atividadeId: string;
  atividadeNome: string;
  turmaId: string;
  turmaNome: string;
  data: string;
  status: string;
}

export function montarAlertasAusencias(
  registros: RegistroPresenca[],
  enriquecimento: DadosEnriquecimentoPresenca = {},
): AusenciaConsecutiva[] {
  const grupos = new Map<string, RegistroPresencaNormalizado[]>();

  for (const registro of registros) {
    const normalizado = normalizarRegistroPresenca(registro, enriquecimento);

    if (!normalizado.data) continue;

    if (normalizado.status !== "PRESENTE" && normalizado.status !== "AUSENTE") {
      continue;
    }

    const participanteKey =
      normalizado.participanteId ||
      normalizarChave(normalizado.participanteNome);

    const atividadeKey =
      normalizado.atividadeId || normalizarChave(normalizado.atividadeNome);

    const turmaKey =
      normalizado.turmaId ||
      normalizarChave(normalizado.turmaNome) ||
      "__sem_turma__";

    if (!participanteKey || !atividadeKey) continue;

    const key = JSON.stringify([participanteKey, atividadeKey, turmaKey]);

    const grupo = grupos.get(key) ?? [];
    grupo.push(normalizado);
    grupos.set(key, grupo);
  }

  const alertas: AusenciaConsecutiva[] = [];

  for (const grupo of grupos.values()) {
    const registrosPorData = new Map<string, RegistroPresencaNormalizado>();

    for (const registro of grupo) {
      const existente = registrosPorData.get(registro.data);

      if (!existente || registro.status === "AUSENTE") {
        registrosPorData.set(registro.data, registro);
      }
    }

    const aulas = Array.from(registrosPorData.values()).sort((a, b) =>
      b.data.localeCompare(a.data),
    );

    if (aulas.length < 3) continue;

    let melhorSequencia: RegistroPresencaNormalizado[] = [];
    let sequenciaAtual: RegistroPresencaNormalizado[] = [];

    for (const aula of aulas) {
      if (aula.status === "AUSENTE") {
        sequenciaAtual.push(aula);
        continue;
      }

      if (sequenciaAtual.length >= 3) {
        melhorSequencia = sequenciaAtual;
        break;
      }

      sequenciaAtual = [];
    }

    if (melhorSequencia.length === 0 && sequenciaAtual.length >= 3) {
      melhorSequencia = sequenciaAtual;
    }

    if (melhorSequencia.length < 3) continue;

    const ultima = melhorSequencia[0];

    alertas.push({
      participanteId:
        ultima.participanteId || normalizarChave(ultima.participanteNome),
      participanteNome:
        ultima.participanteNome ||
        (ultima.participanteId
          ? `Participante #${ultima.participanteId}`
          : "Participante não identificado"),
      atividadeId: ultima.atividadeId || normalizarChave(ultima.atividadeNome),
      atividadeNome:
        ultima.atividadeNome ||
        (ultima.atividadeId
          ? `Atividade #${ultima.atividadeId}`
          : "Atividade não identificada"),
      turmaId: ultima.turmaId || undefined,
      turmaNome: ultima.turmaNome || undefined,
      quantidade: melhorSequencia.length,
      ultimaAusencia: ultima.data,
    });
  }

  return alertas.sort((a, b) => {
    const dataCompare = b.ultimaAusencia.localeCompare(a.ultimaAusencia);

    if (dataCompare !== 0) return dataCompare;

    return a.participanteNome.localeCompare(b.participanteNome, "pt-BR");
  });
}

async function getPresencasDiretas(): Promise<RegistroPresenca[]> {
  const response = await fetch(`${API_URL}/presencas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return expandirRegistrosPresenca(data);
}

function expandirRegistrosPresenca(data: unknown): RegistroPresenca[] {
  if (Array.isArray(data)) {
    return data.flatMap((item) => expandirRegistroPresenca(item));
  }

  const record = getRecord(data);

  if (!record) return [];

  const possibleArrays = [
    "registros",
    "content",
    "items",
    "data",
    "presencas",
    "results",
    "lista",
  ];

  for (const key of possibleArrays) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).flatMap((item) =>
        expandirRegistroPresenca(item),
      );
    }
  }

  return expandirRegistroPresenca(record);
}

function expandirRegistroPresenca(item: unknown): RegistroPresenca[] {
  const aula = getRecord(item);

  if (!aula) return [];

  const participantes = pickArray(
    aula.participantes,
    aula.participantesPresenca,
    aula.presencasParticipantes,
    aula.presencaParticipantes,
    aula.registrosParticipantes,
    aula.frequencias,
    aula.itens,
    aula.chamada,
    aula.alunos,
  );

  if (participantes.length === 0) {
    return [aula as unknown as RegistroPresenca];
  }

  return participantes.flatMap((participanteItem) => {
    const participanteRegistro = getRecord(participanteItem);

    if (!participanteRegistro) {
      const participanteId = pickId(participanteItem);

      if (!participanteId) return [];

      const registroExpandido: AnyRecord = {
        ...aula,
        participanteId,
        data: pickText(aula.data, aula.dataPresenca, aula.dataAula),
        dataPresenca: pickText(aula.dataPresenca, aula.data, aula.dataAula),
        status: pickText(aula.status, aula.statusPresenca, aula.situacao),
        statusPresenca: pickText(
          aula.statusPresenca,
          aula.status,
          aula.situacao,
        ),
      };

      return [registroExpandido as unknown as RegistroPresenca];
    }

    const participanteObj = getRecord(
      participanteRegistro.participante ??
      participanteRegistro.aluno ??
      participanteRegistro.pessoa ??
      participanteRegistro.integrante,
    );

    const atividadeObj = getRecord(
      aula.atividade ?? participanteRegistro.atividade,
    );

    const turmaObj = getRecord(aula.turma ?? participanteRegistro.turma);

    const registroExpandido: AnyRecord = {
      ...aula,
      ...participanteRegistro,

      data: pickText(
        participanteRegistro.data,
        participanteRegistro.dataPresenca,
        participanteRegistro.dataAula,
        aula.data,
        aula.dataPresenca,
        aula.dataAula,
      ),

      dataPresenca: pickText(
        participanteRegistro.dataPresenca,
        participanteRegistro.data,
        aula.dataPresenca,
        aula.data,
        aula.dataAula,
      ),

      status: pickText(
        participanteRegistro.status,
        participanteRegistro.statusPresenca,
        participanteRegistro.situacao,
        participanteRegistro.presenca,
        participanteRegistro.statusFrequencia,
        aula.status,
        aula.statusPresenca,
      ),

      statusPresenca: pickText(
        participanteRegistro.statusPresenca,
        participanteRegistro.status,
        participanteRegistro.situacao,
        participanteRegistro.presenca,
        participanteRegistro.statusFrequencia,
        aula.statusPresenca,
        aula.status,
      ),

      participante: participanteObj ?? participanteRegistro.participante,

      participanteId: pickId(
        participanteRegistro.participanteId,
        participanteRegistro.idParticipante,
        participanteRegistro.alunoId,
        participanteRegistro.pessoaId,
        participanteRegistro.participante,
        participanteRegistro.aluno,
        participanteRegistro.pessoa,
        participanteObj?.id,
      ),

      participanteNome: pickText(
        participanteRegistro.participanteNome,
        participanteRegistro.nomeParticipante,
        participanteRegistro.nomeCompletoParticipante,
        participanteRegistro.nomeCompleto,
        participanteRegistro.nome,
        participanteRegistro.nomeAluno,
        participanteRegistro.nomePessoa,
        participanteObj?.nomeCompleto,
        participanteObj?.nome,
      ),

      atividade: atividadeObj ?? aula.atividade,

      atividadeId: pickId(
        aula.atividadeId,
        aula.idAtividade,
        aula.atividade,
        atividadeObj?.id,
        participanteRegistro.atividadeId,
        participanteRegistro.idAtividade,
        participanteRegistro.atividade,
      ),

      atividadeNome: pickText(
        aula.atividadeNome,
        aula.nomeAtividade,
        atividadeObj?.nomeAtividade,
        atividadeObj?.nome,
        participanteRegistro.atividadeNome,
        participanteRegistro.nomeAtividade,
      ),

      turma: turmaObj ?? aula.turma,

      turmaId: pickId(
        aula.turmaId,
        aula.idTurma,
        aula.turma,
        turmaObj?.id,
        participanteRegistro.turmaId,
        participanteRegistro.idTurma,
        participanteRegistro.turma,
      ),

      turmaNome: pickText(
        aula.turmaNome,
        aula.nomeTurma,
        turmaObj?.nomeTurma,
        turmaObj?.nome,
        participanteRegistro.turmaNome,
        participanteRegistro.nomeTurma,
      ),
    };

    return [registroExpandido as unknown as RegistroPresenca];
  });
}

function normalizarRegistroPresenca(
  registro: RegistroPresenca,
  enriquecimento: DadosEnriquecimentoPresenca,
): RegistroPresencaNormalizado {
  const item = registro as unknown as AnyRecord;

  const participante = getRecord(item.participante);
  const atividade = getRecord(item.atividade);
  const turma = getRecord(item.turma);

  const participanteId = pickId(
    item.participanteId,
    item.idParticipante,
    item.alunoId,
    item.pessoaId,
    item.participante,
    item.aluno,
    item.pessoa,
    participante?.id,
  );

  const atividadeId = pickId(
    item.atividadeId,
    item.idAtividade,
    item.atividade,
    atividade?.id,
  );

  const turmaId = pickId(item.turmaId, item.idTurma, item.turma, turma?.id);

  const participanteNome = pickText(
    item.participanteNome,
    item.nomeParticipante,
    item.nomeCompletoParticipante,
    item.nomeCompleto,
    item.nome,
    item.nomeAluno,
    item.nomePessoa,
    participante?.nomeCompleto,
    participante?.nome,
    enriquecimento.participanteNomePorId?.[participanteId],
  );

  const atividadeNome = pickText(
    item.atividadeNome,
    item.nomeAtividade,
    atividade?.nomeAtividade,
    atividade?.nome,
    enriquecimento.atividadeNomePorId?.[atividadeId],
  );

  const turmaNome = pickText(
    item.turmaNome,
    item.nomeTurma,
    turma?.nomeTurma,
    turma?.nome,
    enriquecimento.turmaNomePorId?.[turmaId],
  );

  const data = pickText(
    item.data,
    item.dataPresenca,
    item.dataAula,
    item.date,
  ).slice(0, 10);

  const status = normalizarStatusPresenca(
    pickText(
      item.status,
      item.statusPresenca,
      item.situacao,
      item.presenca,
      item.statusFrequencia,
    ),
  );

  return {
    participanteId,
    participanteNome,
    atividadeId,
    atividadeNome,
    turmaId,
    turmaNome,
    data,
    status,
  };
}

function deduplicarRegistrosPresenca(
  registros: RegistroPresenca[],
  enriquecimento: DadosEnriquecimentoPresenca,
): RegistroPresenca[] {
  const map = new Map<string, RegistroPresenca>();

  for (const registro of registros) {
    const normalizado = normalizarRegistroPresenca(registro, enriquecimento);

    const participanteKey =
      normalizado.participanteId ||
      normalizarChave(normalizado.participanteNome);

    const atividadeKey =
      normalizado.atividadeId || normalizarChave(normalizado.atividadeNome);

    const turmaKey =
      normalizado.turmaId ||
      normalizarChave(normalizado.turmaNome) ||
      "__sem_turma__";

    if (
      !participanteKey ||
      !atividadeKey ||
      !normalizado.data ||
      !normalizado.status
    ) {
      continue;
    }

    const key = JSON.stringify([
      participanteKey,
      atividadeKey,
      turmaKey,
      normalizado.data,
      normalizado.status,
    ]);

    map.set(key, registro);
  }

  return Array.from(map.values());
}

function getRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" ? (value as AnyRecord) : null;
}

function pickArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }

  return "";
}

function pickId(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    if (typeof value === "object") {
      const record = value as AnyRecord;
      const id = pickId(record.id);
      if (id) return id;
      continue;
    }

    return String(value).trim();
  }

  return "";
}

function normalizarStatusPresenca(value: string): string {
  const status = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .trim()
    .toLocaleUpperCase("pt-BR");

  if (status === "FALTA") return "AUSENTE";
  if (status === "FALTOU") return "AUSENTE";
  if (status === "AUSENCIA") return "AUSENTE";
  if (status === "AUSENTE") return "AUSENTE";

  if (status === "PRESENCA") return "PRESENTE";
  if (status === "PRESENTE") return "PRESENTE";
  if (status === "COMPARECEU") return "PRESENTE";

  if (status === "NAO_TEVE_AULA") return "NAO_TEVE_AULA";
  if (status === "NAO_HOUVE_AULA") return "NAO_TEVE_AULA";
  if (status === "FERIADO") return "FERIADO";

  return status;
}

function normalizarTexto(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizarId(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "";

  return String(value).trim();
}

function normalizarChave(value?: string | null): string {
  return normalizarTexto(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message || json?.error || json?.detail || json?.mensagem || text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export interface AlertasPrazoCarregados {
  emprestimos: AlertaResumo<Emprestimo> | null;
  patrimonioNomePorId: Record<string, string>;
  editais: AlertaResumo<EditalData> | null;
  ausencias: AusenciaConsecutiva[];
}

async function buscarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  const planoGratuito = await isPlanoGratuitoAtual();
  const [
    emprestimos,
    patrimonios,
    editais,
    relatorioPresencas,
    presencasDiretas,
    atividadesPresenca,
    turmasPresenca,
    participantesPresenca,
  ] = await Promise.allSettled([
    planoGratuito ? Promise.resolve([]) : getEmprestimos(),
    planoGratuito ? Promise.resolve([]) : getPatrimonios(),
    planoGratuito ? Promise.resolve([]) : getEditais(),
    getRelatorioPresencasData(),
    getPresencasDiretas(),
    getAtividadesPresenca(),
    getTurmasPresenca(),
    getParticipantesPresenca(),
  ]);

  if (emprestimos.status === "rejected") {
    const message =
      emprestimos.reason instanceof Error ? emprestimos.reason.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar alertas de empréstimos:",
        emprestimos.reason,
      );
    }
  }

  if (editais.status === "rejected") {
    const message =
      editais.reason instanceof Error ? editais.reason.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error("Erro ao carregar alertas de editais:", editais.reason);
    }
  }

  if (patrimonios.status === "rejected") {
    const message =
      patrimonios.reason instanceof Error ? patrimonios.reason.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar nomes dos patrimônios:",
        patrimonios.reason,
      );
    }
  }

  if (relatorioPresencas.status === "rejected") {
    const message =
      relatorioPresencas.reason instanceof Error
        ? relatorioPresencas.reason.message
        : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar relatório para alertas de ausências:",
        relatorioPresencas.reason,
      );
    }
  }

  if (presencasDiretas.status === "rejected") {
    const message =
      presencasDiretas.reason instanceof Error
        ? presencasDiretas.reason.message
        : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar presenças diretas para alertas de ausências:",
        presencasDiretas.reason,
      );
    }
  }

  if (atividadesPresenca.status === "rejected") {
    console.error(
      "Erro ao carregar atividades para alertas de presença:",
      atividadesPresenca.reason,
    );
  }

  if (turmasPresenca.status === "rejected") {
    console.error(
      "Erro ao carregar turmas para alertas de presença:",
      turmasPresenca.reason,
    );
  }

  if (participantesPresenca.status === "rejected") {
    console.error(
      "Erro ao carregar participantes para alertas de presença:",
      participantesPresenca.reason,
    );
  }

  const enriquecimento: DadosEnriquecimentoPresenca = {
    participanteNomePorId:
      participantesPresenca.status === "fulfilled"
        ? Object.fromEntries(
          participantesPresenca.value.flatMap((participante) => {
            const id = normalizarId(participante.id);
            const nome = pickText(
              participante.nomeCompleto,
              participante.nome,
            );

            return id && nome ? [[id, nome]] : [];
          }),
        )
        : {},

    atividadeNomePorId:
      atividadesPresenca.status === "fulfilled"
        ? Object.fromEntries(
          atividadesPresenca.value.flatMap((atividade) =>
            atividade.id && atividade.nomeAtividade
              ? [[atividade.id, atividade.nomeAtividade]]
              : [],
          ),
        )
        : {},

    turmaNomePorId:
      turmasPresenca.status === "fulfilled"
        ? Object.fromEntries(
          turmasPresenca.value.flatMap((turma) =>
            turma.id && turma.nomeTurma ? [[turma.id, turma.nomeTurma]] : [],
          ),
        )
        : {},
  };

  const registrosRelatorio =
    relatorioPresencas.status === "fulfilled"
      ? expandirRegistrosPresenca(relatorioPresencas.value.registros)
      : [];

  const registrosDiretos =
    presencasDiretas.status === "fulfilled" ? presencasDiretas.value : [];

  const registrosPresenca = deduplicarRegistrosPresenca(
    [...registrosRelatorio, ...registrosDiretos],
    enriquecimento,
  );

  return {
    emprestimos:
      emprestimos.status === "fulfilled"
        ? montarAlertasEmprestimos(emprestimos.value)
        : null,

    patrimonioNomePorId:
      patrimonios.status === "fulfilled"
        ? Object.fromEntries(
          patrimonios.value.map((item) => [item.id, item.nomePatrimonio]),
        )
        : {},

    editais:
      editais.status === "fulfilled"
        ? montarAlertasEditais(editais.value)
        : null,

    ausencias: montarAlertasAusencias(registrosPresenca, enriquecimento),
  };
}

export function carregarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  return buscarAlertasPrazo();
}

export function formatDateBR(value: string): string {
  const date = parseDate(value);

  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : value || "—";
}

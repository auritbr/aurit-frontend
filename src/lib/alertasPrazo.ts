import { getEditais, type EditalData } from "@/data/editais";
import { getEmprestimos, type Emprestimo } from "@/data/emprestimos";
import { getPatrimonios } from "@/data/patrimonio";
import {
  getRelatorioPresencasData,
  type RegistroPresenca,
} from "@/data/relatorioPresencas";
import { isPlanoAccessDenied } from "@/lib/access";
import { getJsonHeaders } from "@/lib/apiHeaders";

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

export function montarAlertasAusencias(
  registros: RegistroPresenca[],
): AusenciaConsecutiva[] {
  const grupos = new Map<string, RegistroPresenca[]>();

  for (const registro of registros) {
    const participanteId = normalizarId(registro.participanteId);
    const participanteNome = normalizarTexto(registro.participanteNome);
    const atividadeId = normalizarId(registro.atividadeId);
    const atividadeNome = normalizarTexto(registro.atividadeNome);
    const turmaId = normalizarId(registro.turmaId);
    const turmaNome = normalizarTexto(registro.turmaNome);
    const data = normalizarTexto(registro.data);

    const participanteKey = participanteId || normalizarChave(participanteNome);
    const atividadeKey = atividadeId || normalizarChave(atividadeNome);
    const turmaKey = turmaId || normalizarChave(turmaNome) || "__sem_turma__";

    if (!participanteKey || !atividadeKey || !data) {
      continue;
    }

    const key = JSON.stringify([participanteKey, atividadeKey, turmaKey]);
    const grupo = grupos.get(key) ?? [];
    grupo.push(registro);
    grupos.set(key, grupo);
  }

  const alertas: AusenciaConsecutiva[] = [];

  for (const grupo of grupos.values()) {
    const registrosPorData = new Map<string, RegistroPresenca>();

    for (const registro of grupo) {
      if (registro.status !== "PRESENTE" && registro.status !== "AUSENTE") {
        continue;
      }

      const data = normalizarTexto(registro.data);

      if (!data) continue;

      registrosPorData.set(data, registro);
    }

    const aulas = Array.from(registrosPorData.values()).sort((a, b) =>
      normalizarTexto(b.data).localeCompare(normalizarTexto(a.data)),
    );

    if (aulas.length < 3 || aulas[0].status !== "AUSENTE") continue;

    let quantidade = 0;

    for (const aula of aulas) {
      if (aula.status !== "AUSENTE") break;

      quantidade += 1;
    }

    if (quantidade < 3) continue;

    const ultima = aulas[0];
    const participanteNome = normalizarTexto(ultima.participanteNome);
    const atividadeNome = normalizarTexto(ultima.atividadeNome);
    const turmaId = normalizarId(ultima.turmaId);
    const turmaNome = normalizarTexto(ultima.turmaNome);

    alertas.push({
      participanteId:
        normalizarId(ultima.participanteId) ||
        normalizarChave(participanteNome),
      participanteNome: participanteNome || "Participante sem nome",
      atividadeId:
        normalizarId(ultima.atividadeId) || normalizarChave(atividadeNome),
      atividadeNome: atividadeNome || "Atividade sem nome",
      turmaId: turmaId || undefined,
      turmaNome: turmaNome || undefined,
      quantidade,
      ultimaAusencia: normalizarTexto(ultima.data),
    });
  }

  return alertas.sort((a, b) => {
    const dataCompare = b.ultimaAusencia.localeCompare(a.ultimaAusencia);

    if (dataCompare !== 0) return dataCompare;

    return a.participanteNome.localeCompare(b.participanteNome, "pt-BR");
  });
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

export interface AlertasPrazoCarregados {
  emprestimos: AlertaResumo<Emprestimo> | null;
  patrimonioNomePorId: Record<string, string>;
  editais: AlertaResumo<EditalData> | null;
  ausencias: AusenciaConsecutiva[];
}


type RegistroPresencaNormalizado = RegistroPresenca & {
  turmaId?: string | number | null;
  turmaNome?: string | null;
};

type AnyRecord = Record<string, unknown>;

function isObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readObject(value: unknown): AnyRecord | null {
  return isObject(value) ? value : null;
}

function pickUnknown(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return undefined;
}

function pickStringDeep(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);

    const obj = readObject(value);
    if (obj) {
      const text = pickStringDeep(
        obj.nomeCompleto,
        obj.nomeParticipante,
        obj.nomeAtividade,
        obj.nomeTurma,
        obj.nome,
        obj.titulo,
        obj.descricao,
        obj.label,
      );

      if (text) return text;
    }
  }

  return "";
}

function pickIdDeep(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);

    const obj = readObject(value);
    if (obj) {
      const id = pickIdDeep(obj.id, obj.codigo, obj.value);
      if (id) return id;
    }
  }

  return "";
}

function normalizarStatusPresenca(value: unknown): RegistroPresenca["status"] | "" {
  const raw = pickStringDeep(value).toUpperCase();

  if (!raw) return "";

  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  if (clean.includes("AUSENTE") || clean === "FALTA") return "AUSENTE";
  if (clean.includes("PRESENTE")) return "PRESENTE";
  if (clean.includes("FERIADO")) return "FERIADO" as RegistroPresenca["status"];
  if (clean.includes("NAO_TEVE_AULA") || clean.includes("NAO_HOUVE_AULA")) {
    return "NAO_TEVE_AULA" as RegistroPresenca["status"];
  }

  return "";
}

function normalizarDataPresenca(...values: unknown[]): string {
  const value = pickStringDeep(...values);
  if (!value) return "";

  const clean = value.trim().slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const br = value.trim().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(br)) {
    const [day, month, year] = br.split("/");
    return `${year}-${month}-${day}`;
  }

  return clean;
}

function montarRegistroNormalizado(params: {
  base?: unknown;
  presenca?: unknown;
  participanteItem?: unknown;
}): RegistroPresencaNormalizado | null {
  const base = readObject(params.base) ?? {};
  const presenca = readObject(params.presenca) ?? base;
  const participanteItem = readObject(params.participanteItem) ?? presenca;

  const participanteObj = readObject(
    pickUnknown(
      participanteItem.participante,
      participanteItem.aluno,
      participanteItem.pessoa,
      participanteItem.integrante,
      presenca.participante,
      base.participante,
    ),
  );

  const atividadeObj = readObject(
    pickUnknown(presenca.atividade, base.atividade, participanteItem.atividade),
  );
  const turmaObj = readObject(
    pickUnknown(presenca.turma, base.turma, participanteItem.turma),
  );

  const data = normalizarDataPresenca(
    presenca.data,
    presenca.dataPresenca,
    presenca.dataAula,
    base.data,
    base.dataPresenca,
    base.dataAula,
  );

  const status = normalizarStatusPresenca(
    pickUnknown(
      participanteItem.status,
      participanteItem.statusPresenca,
      participanteItem.presenca,
      presenca.status,
      presenca.statusPresenca,
    ),
  );

  const participanteId = pickIdDeep(
    participanteItem.participanteId,
    participanteItem.idParticipante,
    participanteObj,
    presenca.participanteId,
  );
  const participanteNome = pickStringDeep(
    participanteItem.participanteNome,
    participanteItem.nomeParticipante,
    participanteItem.nomeCompleto,
    participanteItem.nome,
    participanteObj,
    presenca.participanteNome,
  );
  const atividadeId = pickIdDeep(
    presenca.atividadeId,
    presenca.idAtividade,
    atividadeObj,
    base.atividadeId,
  );
  const atividadeNome = pickStringDeep(
    presenca.atividadeNome,
    presenca.nomeAtividade,
    atividadeObj,
    base.atividadeNome,
    base.nomeAtividade,
  );
  const turmaId = pickIdDeep(
    presenca.turmaId,
    presenca.idTurma,
    turmaObj,
    base.turmaId,
    participanteItem.turmaId,
  );
  const turmaNome = pickStringDeep(
    presenca.turmaNome,
    presenca.nomeTurma,
    turmaObj,
    base.turmaNome,
    base.nomeTurma,
    participanteItem.turmaNome,
  );

  if (!data || !status || (!participanteId && !participanteNome) || (!atividadeId && !atividadeNome)) {
    return null;
  }

  return {
    participanteId,
    participanteNome,
    atividadeId,
    atividadeNome,
    turmaId,
    turmaNome,
    data,
    status,
  } as RegistroPresencaNormalizado;
}

function extrairRegistrosPresenca(data: unknown): RegistroPresencaNormalizado[] {
  const root = readObject(data);
  const listaBase = Array.isArray(data)
    ? data
    : asArray(root?.registros).length
      ? asArray(root?.registros)
      : asArray(root?.content).length
        ? asArray(root?.content)
        : asArray(root?.items).length
          ? asArray(root?.items)
          : asArray(root?.data).length
            ? asArray(root?.data)
            : asArray(root?.presencas);

  const registros: RegistroPresencaNormalizado[] = [];

  for (const item of listaBase) {
    const presenca = readObject(item);
    if (!presenca) continue;

    const participantes = [
      ...asArray(presenca.participantes),
      ...asArray(presenca.participantesPresenca),
      ...asArray(presenca.presencasParticipantes),
      ...asArray(presenca.registros),
      ...asArray(presenca.chamada),
    ];

    if (participantes.length > 0) {
      for (const participanteItem of participantes) {
        const registro = montarRegistroNormalizado({
          base: presenca,
          presenca,
          participanteItem,
        });

        if (registro) registros.push(registro);
      }
    } else {
      const registro = montarRegistroNormalizado({ presenca });
      if (registro) registros.push(registro);
    }
  }

  return registros;
}

function dedupeRegistrosPresenca(
  registros: RegistroPresencaNormalizado[],
): RegistroPresencaNormalizado[] {
  const map = new Map<string, RegistroPresencaNormalizado>();

  for (const registro of registros) {
    const key = JSON.stringify([
      registro.participanteId || normalizarChave(registro.participanteNome),
      registro.atividadeId || normalizarChave(registro.atividadeNome),
      registro.turmaId || normalizarChave(registro.turmaNome ?? "") || "__sem_turma__",
      registro.data,
    ]);

    map.set(key, registro);
  }

  return Array.from(map.values());
}

async function buscarPresencasRaw(): Promise<RegistroPresencaNormalizado[]> {
  const response = await fetch(`${API_URL}/presencas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao carregar presenças.`);
  }

  const data: unknown = await response.json();

  return extrairRegistrosPresenca(data);
}

async function buscarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  const [emprestimos, patrimonios, editais, presencasRelatorio, presencasRaw] =
    await Promise.allSettled([
      getEmprestimos(),
      getPatrimonios(),
      getEditais(),
      getRelatorioPresencasData(),
      buscarPresencasRaw(),
    ]);

  if (emprestimos.status === "rejected") {
    console.error(
      "Erro ao carregar alertas de empréstimos:",
      emprestimos.reason,
    );
  }

  if (editais.status === "rejected") {
    console.error("Erro ao carregar alertas de editais:", editais.reason);
  }

  if (patrimonios.status === "rejected") {
    console.error(
      "Erro ao carregar nomes dos patrimônios:",
      patrimonios.reason,
    );
  }

  if (presencasRelatorio.status === "rejected") {
    const message =
      presencasRelatorio.reason instanceof Error
        ? presencasRelatorio.reason.message
        : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar alertas de ausências pelo relatório:",
        presencasRelatorio.reason,
      );
    }
  }

  if (presencasRaw.status === "rejected") {
    const message =
      presencasRaw.reason instanceof Error ? presencasRaw.reason.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error(
        "Erro ao carregar alertas de ausências pela lista de presenças:",
        presencasRaw.reason,
      );
    }
  }

  const registrosPresenca = dedupeRegistrosPresenca([
    ...(presencasRelatorio.status === "fulfilled"
      ? extrairRegistrosPresenca(presencasRelatorio.value)
      : []),
    ...(presencasRaw.status === "fulfilled" ? presencasRaw.value : []),
  ]);

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
    ausencias: montarAlertasAusencias(registrosPresenca),
  };
}

export function carregarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  return buscarAlertasPrazo();
}

export function formatDateBR(value: string): string {
  const date = parseDate(value);

  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : value || "—";
}
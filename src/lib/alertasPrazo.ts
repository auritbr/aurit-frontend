import { getEditais, type EditalData } from "@/data/editais";
import { getEmprestimos, type Emprestimo } from "@/data/emprestimos";
import { getPatrimonios } from "@/data/patrimonio";
import {
  getRelatorioPresencasData,
  type RegistroPresenca,
} from "@/data/relatorioPresencas";
import { isPlanoAccessDenied } from "@/lib/access";

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

    return dias !== null && (dias < 0 || dias === 0 || dias === 5 || dias === 10)
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
    if (edital.statusEdital === "CANCELADO" || edital.statusEdital === "ARQUIVADO") {
      return [];
    }

    const dias = daysUntil(edital.dataEncerramento, today);

    return dias !== null && (dias < 0 || dias === 0 || dias === 5 || dias === 10)
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
    const participanteKey = registro.participanteNome
      .trim()
      .toLocaleLowerCase("pt-BR");
    const atividadeKey = registro.atividadeNome
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!participanteKey || !atividadeKey || !registro.data) {
      continue;
    }

    const key = JSON.stringify([participanteKey, atividadeKey]);
    const grupo = grupos.get(key) ?? [];
    grupo.push(registro);
    grupos.set(key, grupo);
  }

  const alertas: AusenciaConsecutiva[] = [];

  for (const grupo of grupos.values()) {
    const registrosPorData = new Map<string, RegistroPresenca>();

    for (const registro of grupo) {
      if (registro.status === "PRESENTE" || registro.status === "AUSENTE") {
        registrosPorData.set(registro.data, registro);
      }
    }

    const aulas = Array.from(registrosPorData.values())
      .sort((a, b) => b.data.localeCompare(a.data));

    if (aulas.length < 3 || aulas[0].status !== "AUSENTE") continue;

    const ausenciasConsecutivas = aulas.findIndex(
      (registro) => registro.status === "PRESENTE",
    );
    const quantidade =
      ausenciasConsecutivas === -1 ? aulas.length : ausenciasConsecutivas;

    if (quantidade < 3) continue;

    const ultima = aulas[0];
    alertas.push({
      participanteId:
        ultima.participanteId ||
        ultima.participanteNome.trim().toLocaleLowerCase("pt-BR"),
      participanteNome: ultima.participanteNome,
      atividadeId:
        ultima.atividadeId ||
        ultima.atividadeNome.trim().toLocaleLowerCase("pt-BR"),
      atividadeNome: ultima.atividadeNome,
      turmaNome: ultima.turmaNome,
      quantidade,
      ultimaAusencia: ultima.data,
    });
  }

  return alertas.sort((a, b) =>
    b.ultimaAusencia.localeCompare(a.ultimaAusencia),
  );
}

export interface AlertasPrazoCarregados {
  emprestimos: AlertaResumo<Emprestimo> | null;
  patrimonioNomePorId: Record<string, string>;
  editais: AlertaResumo<EditalData> | null;
  ausencias: AusenciaConsecutiva[];
}

async function buscarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  const [emprestimos, patrimonios, editais, presencas] = await Promise.allSettled([
    getEmprestimos(),
    getPatrimonios(),
    getEditais(),
    getRelatorioPresencasData(),
  ]);

  if (emprestimos.status === "rejected") {
    console.error("Erro ao carregar alertas de empréstimos:", emprestimos.reason);
  }

  if (editais.status === "rejected") {
    console.error("Erro ao carregar alertas de editais:", editais.reason);
  }

  if (patrimonios.status === "rejected") {
    console.error("Erro ao carregar nomes dos patrimônios:", patrimonios.reason);
  }

  if (presencas.status === "rejected") {
    const message =
      presencas.reason instanceof Error ? presencas.reason.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error("Erro ao carregar alertas de ausências:", presencas.reason);
    }
  }

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
      editais.status === "fulfilled" ? montarAlertasEditais(editais.value) : null,
    ausencias:
      presencas.status === "fulfilled"
        ? montarAlertasAusencias(presencas.value.registros)
        : [],
  };
}

let buscaEmAndamento: Promise<AlertasPrazoCarregados> | null = null;

export function carregarAlertasPrazo(): Promise<AlertasPrazoCarregados> {
  if (buscaEmAndamento) {
    return buscaEmAndamento;
  }

  buscaEmAndamento = buscarAlertasPrazo().finally(() => {
    buscaEmAndamento = null;
  });

  return buscaEmAndamento;
}

export function formatDateBR(value: string): string {
  const date = parseDate(value);

  return date
    ? new Intl.DateTimeFormat("pt-BR").format(date)
    : value || "—";
}

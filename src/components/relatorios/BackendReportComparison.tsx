import type { Periodo } from "@/lib/periodComparison";
import { useCallback } from "react";
import { getRegistrosPresenca } from "@/data/relatorioPresencas";
import { getTurmas } from "@/data/turmas";
import {
  countDistinct,
  countRows,
  ratio,
  reportDate,
  sumField,
  sumReportField,
  type ReportRow,
} from "@/lib/reportComparisonIndicators";
import {
  ComparacaoPeriodos,
  type IndicadorComparavel,
} from "./ComparacaoPeriodos";

const attendance = {
  date: "data",
  reference: "data do registro de frequência",
  indicators: [
    countRows("Registros de frequência"),
    countRows("Presenças", (row) => row.status === "PRESENTE"),
    countRows("Ausências", (row) => row.status === "AUSENTE"),
    {
      label: "% Presença",
      tipo: "percentual" as const,
      sentido: "maiorMelhor" as const,
      calc: (rows: ReportRow[]) =>
        ratio(
          rows.filter((row) => row.status === "PRESENTE").length,
          rows.length,
        ),
    },
  ],
};

const comparisons: Record<
  string,
  {
    date: string;
    reference: string;
    indicators: IndicadorComparavel<ReportRow>[];
  }
> = {
  "cronograma-prazos": {
    date: "inicio",
    reference: "início da etapa",
    indicators: [
      countRows("Etapas"),
      countDistinct("Projetos com etapas", "projetoId"),
    ],
  },
  "turmas-atendimento": attendance,
  "geral-projetos": {
    date: "inicio",
    reference:
      "início do projeto (vínculos contabilizados conforme o cadastro atual)",
    indicators: [
      countRows("Projetos iniciados"),
      sumField("Atividades", "atividades"),
      sumField("Eventos", "eventos"),
      sumField("Metas vinculadas", "metas"),
    ],
  },
  "execucao-atividades": {
    date: "inicio",
    reference: "início da atividade (turmas e vagas do cadastro atual)",
    indicators: [
      countRows("Atividades iniciadas"),
      sumField("Turmas", "quantidadeTurmas"),
      sumField("Vagas", "vagas"),
    ],
  },
  "regularidade-documental": {
    date: "dataValidade",
    reference: "data de validade do documento",
    indicators: [
      countRows("Documentos com validade no período"),
      countDistinct("Órgãos emissores", "orgaoEmissor"),
    ],
  },
  "metas-resultados": {
    date: "prazoProjeto",
    reference: "prazo da meta (execução registrada até hoje)",
    indicators: [
      countRows("Metas com prazo no período"),
      sumField("Previsto", "previsto"),
      sumField("Executado", "executado"),
      {
        label: "% Execução",
        tipo: "percentual",
        sentido: "maiorMelhor",
        calc: (rows) =>
          ratio(
            sumReportField(rows, "executado"),
            sumReportField(rows, "previsto"),
          ),
      },
    ],
  },
  "institucional-organizacao": {
    date: "inicioMandato",
    reference: "início do mandato",
    indicators: [
      countRows("Mandatos iniciados"),
      countDistinct("Cargos distintos", "cargo"),
    ],
  },
};

export function BackendReportComparison({
  endpoint,
  rows,
  periodo,
  loadRows,
}: {
  endpoint: string;
  rows: ReportRow[];
  periodo?: Periodo;
  loadRows?: () => Promise<ReportRow[]>;
}) {
  const config = comparisons[endpoint];
  const needsDetail = ["execucao-atividades", "turmas-atendimento"].includes(
    endpoint,
  );
  const loadDetailRows = useCallback(async (): Promise<ReportRow[]> => {
    if (!rows.length) return [];

    if (endpoint === "execucao-atividades") {
      const totals = new Map<string, number>();
      for (const turma of await getTurmas()) {
        totals.set(turma.atividadeId, (totals.get(turma.atividadeId) ?? 0) + 1);
      }
      return rows.map((row) => ({
        ...row,
        quantidadeTurmas: totals.get(String(row.id)) ?? 0,
      }));
    }

    const turmaIds = new Set(rows.map((row) => String(row.id)));
    return (await getRegistrosPresenca())
      .filter((registro) => registro.turmaId && turmaIds.has(registro.turmaId))
      .map(({ data, status }) => ({ data, status }));
  }, [endpoint, rows]);

  return config ? (
    <ComparacaoPeriodos
      id={endpoint}
      rows={rows}
      loadRows={needsDetail ? loadDetailRows : loadRows}
      periodo={periodo}
      getData={(row) => reportDate(row[config.date])}
      indicadores={config.indicators}
      referencia={config.reference}
    />
  ) : null;
}

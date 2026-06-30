import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReactNode } from "react";
import { getConfiguracaoEmpresa } from "./configuracaoEmpresaStore";

export interface RelatorioColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  alwaysVisible?: boolean;
  hiddenByDefault?: boolean;
}

interface RelatorioGeralPdfGrupo {
  titulo: string;
  indicadores: {
    chave: string;
    label: string;
    valor: unknown;
  }[];
}

interface RelatorioGeralPdfOptions {
  reportName: string;
  nomeEmpresa?: string;
  dataGeracao?: string;
  grupos: RelatorioGeralPdfGrupo[];
}

interface PdfOptions {
  reportName: string;
  organizacaoNome?: string;
  dataGeracao?: string;
  indicadores?: { label: string; valor: string }[];
}

interface IndicadoresSociodemograficosPdfOptions {
  filtros: {
    ano: string;
    atividade: string;
    turma: string;
    status: string;
  };
  total: number;
  indicadores: {
    title: string;
    itens: {
      label: string;
      count: number;
      percentual: number;
    }[];
  }[];
}

type RGB = [number, number, number];

type LoadedLogo =
  | {
    dataUrl: string;
    format: "PNG" | "JPEG";
  }
  | null;

type EmpresaPdfData = {
  id?: number | null;
  nomeEmpresa?: string | null;
  caminhoLogo?: string | null;
  caminho_logo?: string | null;
  logo?: string | null;
  logoUrl?: string | null;
  emailContato?: string | null;
  telefoneContato?: string | null;
  documentoIdentificacao?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | number | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
};

type OrganizacaoPdfData = {
  id?: number | null;
  razaoSocial?: string | null;
  razao_social?: string | null;
  nomeFantasia?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefoneInstitucional?: string | null;
  telefone_institucional?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | number | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
};

type PdfContext = {
  empresa: EmpresaPdfData;
  organizacao: OrganizacaoPdfData;
  logo: LoadedLogo;
};

type HeaderOptions = {
  title: string;
  documentNumber: string;
};

type StatusPresencaPdf = "P" | "F" | "NTA" | "FE" | "";

type AlunoPresencaPdf = {
  nome: string;
  presencasPorData: Record<string, StatusPresencaPdf>;
  totalFaltas: number;
  totalPresencas: number;
  totalNaoTeveAula: number;
  totalFeriados: number;
  percentual: number;
};

type PdfEssentialRule = {
  label: string;
  aliases: string[];
  accessor?: <T>(row: T) => string | number | null | undefined;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const MARGIN_LEFT = 30;
const MARGIN_RIGHT = 20;
const HEADER_HEIGHT = 35;
const FOOTER_HEIGHT = 24;

const BODY_START_Y = HEADER_HEIGHT + 8;

const LOGO_W = 28;
const LOGO_H = 22;
const ORG_W = 48;
const HEADER_GAP = 4;

const VERDE_RELATORIO: RGB = [24, 83, 75];

const CINZA_HEAD: RGB = [238, 241, 241];
const CINZA_HEAD_TEXTO: RGB = [35, 45, 45];
const CINZA_BORDA: RGB = [214, 220, 220];
const CINZA_TEXTO: RGB = [90, 100, 100];
const CINZA_RESUMO: RGB = [242, 245, 245];
const FUNDO_VAZIO: RGB = [252, 253, 253];

const AZUL_CLARO: RGB = [231, 242, 252];
const AZUL_TEXTO: RGB = [28, 90, 145];

const VERMELHO_CLARO: RGB = [252, 235, 229];
const VERMELHO_TEXTO: RGB = [160, 60, 45];

const CINZA_STATUS_CLARO: RGB = [239, 241, 243];
const CINZA_STATUS_TEXTO: RGB = [90, 96, 105];

const AMARELO_CLARO: RGB = [255, 246, 214];
const AMARELO_TEXTO: RGB = [140, 95, 20];

const formatCell = <T,>(row: T, col: RelatorioColumn<T>): string => {
  const raw = col.accessor
    ? col.accessor(row)
    : (row as Record<string, unknown>)[col.key];

  if (raw === null || raw === undefined) return "";

  return String(raw);
};

const sanitizeFileBase = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function buildFileName(reportName: string, ext: string): string {
  const today = new Date().toISOString().slice(0, 10);

  return `relatorio-${sanitizeFileBase(reportName)}-${today}.${ext}`;
}

export function buildTsv<T>(rows: T[], cols: RelatorioColumn<T>[]): string {
  const header = cols.map((c) => c.label).join("\t");

  const body = rows
    .map((r) =>
      cols
        .map((c) => formatCell(r, c).replace(/[\t\n\r]+/g, " "))
        .join("\t"),
    )
    .join("\n");

  return body ? `${header}\n${body}` : header;
}

const escapeCsv = (s: string) => {
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
};

export function exportCsv<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  reportName: string,
) {
  const header = cols.map((c) => escapeCsv(c.label)).join(";");

  const body = rows
    .map((r) => cols.map((c) => escapeCsv(formatCell(r, c))).join(";"))
    .join("\n");

  const csv = `\uFEFF${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  triggerDownload(blob, buildFileName(reportName, "csv"));
}

export function exportXlsx<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  reportName: string,
) {
  const data = rows.map((r) => {
    const o: Record<string, string> = {};

    cols.forEach((c) => {
      o[c.label] = formatCell(r, c);
    });

    return o;
  });

  const ws = XLSX.utils.json_to_sheet(data, {
    header: cols.map((c) => c.label),
  });

  ws["!cols"] = cols.map((c) => {
    const maxContent = rows.reduce((m, r) => {
      const v = formatCell(r, c);

      return Math.max(m, v.length);
    }, c.label.length);

    return { wch: Math.min(Math.max(maxContent + 2, 10), 50) };
  });

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, buildFileName(reportName, "xlsx"));
}

export async function exportPdf<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  options: PdfOptions,
) {
  const reportSlug = sanitizeFileBase(options.reportName);

  const isPdfBlocked =
    reportSlug.includes("curriculo") ||
    reportSlug.includes("curriculum") ||
    reportSlug.includes("trajetoria") ||
    reportSlug.includes("meta-do-projeto") ||
    reportSlug.includes("metas-do-projeto") ||
    reportSlug.includes("meta-projeto") ||
    reportSlug.includes("metas-projeto");

  if (isPdfBlocked) {
    console.warn(
      `Exportação em PDF bloqueada para o relatório: ${options.reportName}`,
    );
    return;
  }

  const isPresencas = isRelatorioPresencas(reportSlug, cols);

  if (isPresencas) {
    await exportPresencasPdf(rows as Record<string, unknown>[], options);
    return;
  }

  if (isRelatorioParticipantes(reportSlug)) {
    await exportRelatorioParticipantesPdf(
      rows as Record<string, unknown>[],
      cols as RelatorioColumn<Record<string, unknown>>[],
      options,
    );
    return;
  }

  await exportRelatorioTabelaPdf(rows, cols, options);
}

function isRelatorioParticipantes(reportSlug: string) {
  return (
    reportSlug === "participantes" ||
    reportSlug === "relatorio-participantes" ||
    reportSlug === "relatorio-de-participantes"
  );
}

const statusParticipantePdfLabel: Record<string, string> = {
  MATRICULADO: "Matriculado",
  ATIVO: "Ativo",
  PENDENTE: "Pendente",
  DESISTENTE: "Desistente",
  CONCLUIDO: "Concluído",
  INATIVO: "Inativo",
  EM_ESPERA: "Em espera",
  CANCELADO: "Cancelado",
};

const tipoNeurodivergenciaParticipantePdfLabel: Record<string, string> = {
  TEA: "TEA",
  ASPERGER: "Asperger",
  TDAH: "TDAH",
  TOD: "TOD",
  DISLEXIA: "Dislexia",
  DISCALCULIA: "Discalculia",
  DISGRAFIA: "Disgrafia",
  DISPRAXIA: "Dispraxia",
  TOURETTE: "Tourette",
  TOC: "TOC",
  ALTAS_HABILIDADES_SUPERDOTACAO: "Altas habilidades/superdotação",
  TRANSTORNO_PROCESSAMENTO_SENSORIAL:
    "Transtorno do processamento sensorial",
  TRANSTORNO_PROCESSAMENTO_AUDITIVO: "Transtorno do processamento auditivo",
  OUTRA: "Outra",
};

const tipoDeficienciaParticipantePdfLabel: Record<string, string> = {
  NAO_POSSUI: "Não possui",
  FISICA: "Física",
  AUDITIVA: "Auditiva",
  VISUAL: "Visual",
  INTELECTUAL: "Intelectual",
  PSICOSSOCIAL: "Psicossocial",
  MULTIPLA: "Múltipla",
  TRANSTORNO_ESPECTRO_AUTISTA: "Transtorno do Espectro Autista",
  OUTRA: "Outra",
  NAO_INFORMADO: "Não informado",
};

function formatarListaEnumRelatorioParticipantesPdf(
  value: unknown,
  labels: Record<string, string>,
) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const formatted = values
    .map((item) => texto(item))
    .filter(Boolean)
    .map((item) => labels[item] ?? item);

  return formatted.length ? formatted.join(", ") : "—";
}

const colunasRelatorioParticipantesPdf: RelatorioColumn<
  Record<string, unknown>
>[] = [
  {
    key: "nome",
    label: "Participante",
    accessor: (row) => texto(row.participanteNome) || "—",
  },
  {
    key: "tipoNeurodivergencias",
    label: "Neurodivergências",
    accessor: (row) =>
      formatarListaEnumRelatorioParticipantesPdf(
        row.tipoNeurodivergencias,
        tipoNeurodivergenciaParticipantePdfLabel,
      ),
  },
  {
    key: "tipoDeficiencias",
    label: "Tipo de deficiência",
    accessor: (row) =>
      formatarListaEnumRelatorioParticipantesPdf(
        row.tipoDeficiencias,
        tipoDeficienciaParticipantePdfLabel,
      ),
  },
  {
    key: "possuiCadunico",
    label: "CadÚnico",
    accessor: (row) => (row.possuiCadunico ? "Sim" : "Não"),
  },
  {
    key: "possuiBolsaFamilia",
    label: "Bolsa Família",
    accessor: (row) => (row.possuiBolsaFamilia ? "Sim" : "Não"),
  },
  {
    key: "status",
    label: "Status",
    accessor: (row) => {
      const status = texto(row.status);
      return statusParticipantePdfLabel[status] || status || "—";
    },
  },
  {
    key: "atividade",
    label: "Atividade",
    accessor: (row) => texto(row.atividadeNome) || "—",
  },
  {
    key: "turma",
    label: "Turma",
    accessor: (row) => texto(row.turmaNome) || "—",
  },
  {
    key: "presencas",
    label: "Presenças",
    accessor: (row) => String(row.presencas ?? 0),
  },
  {
    key: "ausencias",
    label: "Ausências",
    accessor: (row) => String(row.ausencias ?? 0),
  },
  {
    key: "feriados",
    label: "Feriados",
    accessor: (row) => String(row.feriados ?? 0),
  },
  {
    key: "semAula",
    label: "Não teve aula",
    accessor: (row) => String(row.semAula ?? 0),
  },
  {
    key: "percentual",
    label: "% Presença",
    accessor: (row) => {
      const percentual = Number(row.percentualPresenca ?? 0);
      return `${Number.isFinite(percentual) ? percentual.toFixed(1) : "0.0"}%`;
    },
  },
  {
    key: "ultima",
    label: "Última presença",
    accessor: (row) => formatarDataRelatorioParticipantesPdf(row.ultimaPresenca),
  },
];

function formatarDataRelatorioParticipantesPdf(value: unknown) {
  const iso = normalizarDataPresenca(value);

  if (!iso) return "—";

  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

async function exportRelatorioParticipantesPdf(
  rows: Record<string, unknown>[],
  colunasSelecionadas: RelatorioColumn<Record<string, unknown>>[],
  options: PdfOptions,
) {
  const chavesSelecionadas = new Set(
    colunasSelecionadas.map((coluna) => coluna.key),
  );
  const colunasPdf = colunasRelatorioParticipantesPdf.filter((coluna) =>
    chavesSelecionadas.has(coluna.key),
  );

  await exportRelatorioTabelaPdf(rows, colunasPdf, options, true);
}

function isRelatorioPresencas<T>(
  reportSlug: string,
  cols: RelatorioColumn<T>[],
) {
  if (reportSlug.includes("presenca") || reportSlug.includes("frequencia")) {
    return true;
  }

  const normalizedColumnKeys = new Set(
    cols.map((col) => sanitizeFileBase(`${col.key} ${col.label}`)),
  );

  const hasStatusPresenca = Array.from(normalizedColumnKeys).some(
    (key) =>
      key.includes("status-presenca") ||
      key.includes("status-frequencia") ||
      key.includes("presenca-status") ||
      key.includes("frequencia-status"),
  );

  const hasDataPresenca = Array.from(normalizedColumnKeys).some(
    (key) =>
      key.includes("data-presenca") ||
      key.includes("data-frequencia") ||
      key.includes("presenca-data") ||
      key.includes("frequencia-data"),
  );

  return hasStatusPresenca && hasDataPresenca;
}

async function exportRelatorioTabelaPdf<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  options: PdfOptions,
  preservarColunasSelecionadas = false,
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const ctx = await resolvePdfContext();

  const headerOptions: HeaderOptions = {
    title: formatReportTitle(options.reportName || "Relatório"),
    documentNumber: buildRelatorioDocumentNumber(options.reportName || "Relatório"),
  };

  drawHeader(doc, headerOptions, ctx);

  let cursor = BODY_START_Y;

  cursor = drawSectionTitle(
    doc,
    "Identificação do Relatório",
    cursor,
    headerOptions,
    ctx,
  );

  cursor = drawGridFields(
    doc,
    buildCamposResumoRelatorio(rows, options, ctx),
    cursor,
    headerOptions,
    ctx,
  );

  cursor += 3;

  cursor = drawSectionTitle(
    doc,
    "Registros do Relatório",
    cursor,
    headerOptions,
    ctx,
  );

  const colunasEssenciais = preservarColunasSelecionadas
    ? cols
    : selecionarColunasEssenciaisParaPdf(rows, cols, options.reportName);

  const body = rows.map((row) =>
    colunasEssenciais.map((col) => formatPdfTableCell(row, col)),
  );

  autoTable(doc, {
    startY: cursor,
    head: [colunasEssenciais.map((c) => c.label)],
    body,
    theme: "grid",
    margin: {
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT,
      bottom: FOOTER_HEIGHT + 8,
    },
    styles: {
      font: "helvetica",
      fontSize: colunasEssenciais.length > 12 ? 6.2 : 7.1,
      cellPadding: colunasEssenciais.length > 12 ? 1.3 : 2,
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0.12,
      lineColor: CINZA_BORDA,
      textColor: [35, 45, 45],
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: CINZA_HEAD,
      textColor: CINZA_HEAD_TEXTO,
      fontStyle: "bold",
      fontSize: colunasEssenciais.length > 12 ? 5.9 : 6.8,
      cellPadding: colunasEssenciais.length > 12 ? 1.2 : 1.8,
      minCellHeight: 8,
      valign: "middle",
      halign: "left",
      lineColor: CINZA_BORDA,
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: buildRelatorioColumnStyles(colunasEssenciais),
    didParseCell: (data) => {
      if (data.section !== "body") return;

      const col = colunasEssenciais[data.column.index];

      if (!col) return;

      const normalizedColumn = normalizeLabel(`${col.key} ${col.label}`);
      const value = String(data.cell.raw ?? "");
      const normalizedValue = normalizeLabel(value);

      if (normalizedColumn.includes("status")) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.halign = "center";

        if (
          normalizedValue.includes("ativo") ||
          normalizedValue.includes("concluido") ||
          normalizedValue.includes("aprovado") ||
          normalizedValue.includes("regular") ||
          normalizedValue.includes("presente") ||
          normalizedValue.includes("pago")
        ) {
          data.cell.styles.fillColor = AZUL_CLARO;
          data.cell.styles.textColor = AZUL_TEXTO;
        } else if (
          normalizedValue.includes("desistente") ||
          normalizedValue.includes("inativo") ||
          normalizedValue.includes("cancelado") ||
          normalizedValue.includes("vencido") ||
          normalizedValue.includes("reprovado") ||
          normalizedValue.includes("afastado") ||
          normalizedValue.includes("atrasado")
        ) {
          data.cell.styles.fillColor = VERMELHO_CLARO;
          data.cell.styles.textColor = VERMELHO_TEXTO;
        } else if (
          normalizedValue.includes("pendente") ||
          normalizedValue.includes("andamento") ||
          normalizedValue.includes("analise") ||
          normalizedValue.includes("aguardando") ||
          normalizedValue.includes("parcial")
        ) {
          data.cell.styles.fillColor = AMARELO_CLARO;
          data.cell.styles.textColor = AMARELO_TEXTO;
        } else {
          data.cell.styles.fillColor = CINZA_STATUS_CLARO;
          data.cell.styles.textColor = CINZA_STATUS_TEXTO;
        }
      }
    },
    didDrawPage: () => {
      drawHeader(doc, headerOptions, ctx);
    },
  });

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, total, ctx);
  }

  doc.save(buildFileName(options.reportName || "Relatório", "pdf"));
}

function buildRelatorioDocumentNumber(reportName: string): string {
  const prefix =
    sanitizeFileBase(reportName)
      .slice(0, 3)
      .toUpperCase() || "REL";

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return `${prefix}-${today}`;
}

function formatReportTitle(reportName: string): string {
  const clean = reportName?.trim() || "Relatório";

  if (normalizeLabel(clean).startsWith("relatorio")) {
    return clean;
  }

  return `Relatório de ${clean}`;
}

function buildCamposResumoRelatorio<T>(
  rows: T[],
  options: PdfOptions,
  ctx: PdfContext,
) {
  const fields: {
    label: string;
    value: string | number | null | undefined;
  }[] = [
      {
        label: "Organização",
        value: options.organizacaoNome || getNomeInstitucional(ctx),
      },
      {
        label: "Relatório",
        value: options.reportName || "Relatório",
      },
      {
        label: getResumoLabel(options.reportName || "Relatório"),
        value: rows.length,
      },
      {
        label: "Data de geração",
        value: options.dataGeracao || new Date().toLocaleDateString("pt-BR"),
      },
    ];

  if (options.indicadores?.length) {
    options.indicadores.slice(0, 4).forEach((indicador) => {
      fields.push({
        label: indicador.label,
        value: indicador.valor,
      });
    });
  }

  return fields;
}

function getResumoLabel(reportName: string) {
  const normalized = normalizeLabel(reportName);

  if (normalized.includes("organizacao") || normalized.includes("organização")) return "Total de organizações";
  if (normalized.includes("diretoria")) return "Total de membros da diretoria";
  if (normalized.includes("participante")) return "Total de participantes";
  if (normalized.includes("aluno")) return "Total de alunos";
  if (normalized.includes("colaborador")) return "Total de colaboradores";
  if (normalized.includes("integrante")) return "Total de integrantes";
  if (normalized.includes("agente")) return "Total de agentes culturais";
  if (normalized.includes("projeto")) return "Total de projetos";
  if (normalized.includes("cronograma")) return "Total de etapas";
  if (normalized.includes("atividade")) return "Total de atividades";
  if (normalized.includes("oficina")) return "Total de oficinas";
  if (normalized.includes("turma")) return "Total de turmas";
  if (normalized.includes("evento")) return "Total de eventos culturais";
  if (normalized.includes("execucao") || normalized.includes("execução")) return "Total de execuções";
  if (normalized.includes("divulgacao") || normalized.includes("divulgação")) return "Total de ações de divulgação";
  if (normalized.includes("documento")) return "Total de documentos";
  if (
    normalized.includes("planejamento financeiro") ||
    normalized.includes("aplicacao financeira") ||
    normalized.includes("aplicação financeira") ||
    normalized.includes("aplicacao de recursos") ||
    normalized.includes("aplicação de recursos")
  ) {
    return "Total de aplicações de recursos";
  }
  if (normalized.includes("financeiro")) return "Total de registros financeiros";
  if (normalized.includes("patrimonio")) return "Total de patrimônios";
  if (normalized.includes("evidencia")) return "Total de evidências";
  if (normalized.includes("edital")) return "Total de editais";
  if (normalized.includes("proposta")) return "Total de propostas";
  if (normalized.includes("habilitacao")) return "Total de itens de habilitação";
  if (normalized.includes("prestacao")) return "Total de registros de prestação";

  return "Total de registros";
}

function selecionarColunasEssenciaisParaPdf<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  reportName: string,
): RelatorioColumn<T>[] {
  const normalizedReport = normalizeLabel(reportName || "");

  const available = cols.filter((col) => {
    const label = texto(col.label);

    if (!label) return false;

    const normalized = normalizeColumnIdentifier(`${col.key} ${col.label}`);

    const camposInternos = [
      "uuid",
      "created",
      "updated",
      "criado",
      "atualizado",
      "identificador interno",
    ];

    const isId =
      normalized === "id" ||
      normalized.endsWith(" id") ||
      normalized.includes(" id interno") ||
      normalized.includes("identificador interno");

    const isCampoInterno = camposInternos.some((term) =>
      normalized.includes(term),
    );

    return !isId && !isCampoInterno;
  });

  const rules = getRegrasCamposEssenciais(normalizedReport);

  const selected: RelatorioColumn<T>[] = [];
  const missing: string[] = [];

  rules.forEach((rule) => {
    if (rule.accessor) {
      selected.push({
        key: sanitizeFileBase(rule.label),
        label: rule.label,
        accessor: rule.accessor,
      });

      return;
    }

    const foundFromColumns = findStrictColumnMatch(available, selected, rule);

    if (foundFromColumns) {
      selected.push({
        ...foundFromColumns,
        label: rule.label,
      });

      return;
    }

    const virtualColumn = createVirtualColumnFromRows(rows, rule);

    if (virtualColumn) {
      selected.push(virtualColumn);
      return;
    }

    missing.push(rule.label);
  });

  if (missing.length > 0) {
    console.warn(
      `Campos não encontrados para o relatório "${reportName}":`,
      missing,
      {
        colunasDisponiveis: available.map((col) => ({
          key: col.key,
          label: col.label,
        })),
        chavesDisponiveisNasLinhas: getAvailableRowKeys(rows),
      },
    );
  }

  if (selected.length > 0) {
    return selected;
  }

  return available.slice(0, 12);

}

function findStrictColumnMatch<T>(
  available: RelatorioColumn<T>[],
  selected: RelatorioColumn<T>[],
  rule: PdfEssentialRule,
): RelatorioColumn<T> | undefined {
  const selectedKeys = selected.map((item) => item.key);

  const candidates = available
    .filter((col) => !selectedKeys.includes(col.key))
    .map((col) => {
      const normalizedLabel = normalizeColumnIdentifier(col.label);
      const normalizedKey = normalizeColumnIdentifier(col.key);
      const normalizedFull = normalizeColumnIdentifier(`${col.key} ${col.label}`);

      let score = 0;

      rule.aliases.forEach((alias, aliasIndex) => {
        const normalizedAlias = normalizeColumnIdentifier(alias);

        if (normalizedLabel === normalizedAlias) score += 10000 - aliasIndex;
        if (normalizedKey === normalizedAlias) score += 9500 - aliasIndex;

        if (removeSpaces(normalizedLabel) === removeSpaces(normalizedAlias)) {
          score += 9000 - aliasIndex;
        }

        if (removeSpaces(normalizedKey) === removeSpaces(normalizedAlias)) {
          score += 8500 - aliasIndex;
        }

        if (normalizedLabel.startsWith(`${normalizedAlias} `)) {
          score += 5000 - aliasIndex;
        }

        if (normalizedKey.startsWith(`${normalizedAlias} `)) {
          score += 4500 - aliasIndex;
        }

        if (normalizedLabel.includes(normalizedAlias)) {
          score += 3000 - aliasIndex;
        }

        if (normalizedKey.includes(normalizedAlias)) {
          score += 2600 - aliasIndex;
        }

        if (removeSpaces(normalizedLabel).includes(removeSpaces(normalizedAlias))) {
          score += 2200 - aliasIndex;
        }

        if (removeSpaces(normalizedKey).includes(removeSpaces(normalizedAlias))) {
          score += 2000 - aliasIndex;
        }

        if (normalizedFull.includes(normalizedAlias)) {
          score += 1400 - aliasIndex;
        }

        if (removeSpaces(normalizedFull).includes(removeSpaces(normalizedAlias))) {
          score += 1200 - aliasIndex;
        }

        if (hasAllAliasWords(normalizedLabel, normalizedAlias)) {
          score += 700 - aliasIndex;
        }

        if (hasAllAliasWords(normalizedKey, normalizedAlias)) {
          score += 650 - aliasIndex;
        }
      });

      return {
        col,
        score: penalizeWrongGenericMatch(col, rule, score),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.col;
}

function createVirtualColumnFromRows<T>(
  rows: T[],
  rule: PdfEssentialRule,
): RelatorioColumn<T> | null {
  const rowKeys = getAvailableRowKeys(rows);

  const matchedKey = findBestRowKeyMatch(rowKeys, rule);

  if (!matchedKey) return null;

  return {
    key: matchedKey,
    label: rule.label,
    accessor: (row: T) => {
      const value = getNestedValue(row as Record<string, unknown>, matchedKey);

      return formatVirtualColumnValue(value);
    },
  };
}

function getAvailableRowKeys<T>(rows: T[]): string[] {
  const keys = new Set<string>();

  rows.slice(0, 20).forEach((row) => {
    collectRowKeys(row as Record<string, unknown>, "", keys);
  });

  return Array.from(keys);
}

function collectRowKeys(
  value: Record<string, unknown>,
  prefix: string,
  keys: Set<string>,
) {
  if (!value || typeof value !== "object") return;

  Object.entries(value).forEach(([key, item]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    keys.add(fullKey);

    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      !(item instanceof Date)
    ) {
      collectRowKeys(item as Record<string, unknown>, fullKey, keys);
    }
  });
}

function findBestRowKeyMatch(
  rowKeys: string[],
  rule: PdfEssentialRule,
): string | null {
  const candidates = rowKeys
    .map((key) => {
      const normalizedKey = normalizeColumnIdentifier(key);

      let score = 0;

      rule.aliases.forEach((alias, aliasIndex) => {
        const normalizedAlias = normalizeColumnIdentifier(alias);

        if (normalizedKey === normalizedAlias) {
          score += 10000 - aliasIndex;
        }

        if (normalizedKey.endsWith(` ${normalizedAlias}`)) {
          score += 9000 - aliasIndex;
        }

        if (normalizedKey.endsWith(normalizedAlias)) {
          score += 8500 - aliasIndex;
        }

        if (removeSpaces(normalizedKey) === removeSpaces(normalizedAlias)) {
          score += 8000 - aliasIndex;
        }

        if (hasAllAliasWords(normalizedKey, normalizedAlias)) {
          score += 4500 - aliasIndex;
        }

        if (normalizedKey.includes(normalizedAlias)) {
          score += 3000 - aliasIndex;
        }
      });

      return {
        key,
        score: penalizeWrongRowKeyMatch(key, rule, score),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.key ?? null;
}

function normalizeColumnIdentifier(value: string): string {
  return normalizeLabel(
    value
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_./-]+/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function removeSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

function hasAllAliasWords(target: string, alias: string): boolean {
  const words = alias
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return false;

  return words.every((word) => target.includes(word));
}

function getNestedValue(
  row: Record<string, unknown>,
  path: string,
): unknown {
  const keys = path.split(".");

  let current: unknown = row;

  for (const key of keys) {
    if (
      current &&
      typeof current === "object" &&
      key in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

function formatVirtualColumnValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          return (
            texto(obj.nome) ||
            texto(obj.nomeCompleto) ||
            texto(obj.nome_completo) ||
            texto(obj.titulo) ||
            texto(obj.descricao) ||
            JSON.stringify(obj)
          );
        }

        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return (
      texto(obj.nome) ||
      texto(obj.nomeCompleto) ||
      texto(obj.nome_completo) ||
      texto(obj.razaoSocial) ||
      texto(obj.razao_social) ||
      texto(obj.nomeFantasia) ||
      texto(obj.nome_fantasia) ||
      texto(obj.titulo) ||
      texto(obj.descricao) ||
      JSON.stringify(obj)
    );
  }

  return String(value);
}

function getFirstExistingValue<T>(
  row: T,
  keys: string[],
): string | number | null | undefined {
  for (const key of keys) {
    const value = getNestedValue(row as Record<string, unknown>, key);

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return formatVirtualColumnValue(value);
    }
  }

  return "—";
}

function penalizeWrongGenericMatch<T>(
  col: RelatorioColumn<T>,
  rule: PdfEssentialRule,
  score: number,
): number {
  if (score <= 0) return score;

  const normalized = normalizeColumnIdentifier(`${col.key} ${col.label}`);

  return penalizeWrongMatchByRule(normalized, rule, score);
}

function penalizeWrongRowKeyMatch(
  key: string,
  rule: PdfEssentialRule,
  score: number,
): number {
  if (score <= 0) return score;

  const normalized = normalizeColumnIdentifier(key);

  return penalizeWrongMatchByRule(normalized, rule, score);
}

function penalizeWrongMatchByRule(
  normalizedTarget: string,
  rule: PdfEssentialRule,
  score: number,
): number {
  const normalizedRule = normalizeColumnIdentifier(rule.label);

  const blockersByRule: Record<string, string[]> = {
    "nome da atividade": ["descricao", "publico", "local"],
    "data de inicio da atividade": ["termino", "fim", "evento", "acao"],
    "data de termino da atividade": ["inicio", "evento", "acao"],
    "tipo de atividade": ["publico", "local", "descricao"],
    "status da atividade": ["matricula", "participante"],
    "nome da turma": ["atividade", "colaborador", "responsavel"],
    "nome do evento": ["tipo", "status", "data"],
    "nome da acao": ["estrategia", "data", "status", "projeto"],
    "nome do edital": ["numero", "ano", "orgao", "status"],
    "numero do edital": ["inscricao"],
    "numero de inscricao": ["edital"],
    "titulo do projeto": ["resumo", "justificativa", "metodologia", "impacto"],
    "proposta de edital": ["status", "data", "valor"],
    "item do planejamento": ["justificativa"],
    "nome planejamento": ["justificativa", "periodo", "valor", "quantidade"],
    "valor unitario": ["total"],
    "valor total": ["unitario"],
    "tipo evidencia": ["vinculo"],
    "tipo vinculo evidencia": ["arquivo", "link", "descricao"],
    "nome do projeto": ["status", "origem", "area", "data"],
    "nome completo": ["responsavel", "mae", "pai"],
    "cpf": ["responsavel"],
    "rg": ["responsavel"],
  };

  const blockers = blockersByRule[normalizedRule] ?? [];

  if (blockers.some((term) => normalizedTarget.includes(term))) {
    return score - 100000;
  }

  return score;
}

function getRegrasCamposEssenciais(normalizedReport: string): PdfEssentialRule[] {
  if (
    normalizedReport.includes("organizacao") ||
    normalizedReport.includes("organização") ||
    normalizedReport.includes("dados da organizacao") ||
    normalizedReport.includes("dados da organização")
  ) {
    return [
      { label: "Razão Social", aliases: ["razao social", "razão social", "razaoSocial", "razao_social"] },
      { label: "Nome Fantasia", aliases: ["nome fantasia", "nomeFantasia", "nome_fantasia"] },
      { label: "CNPJ", aliases: ["cnpj"] },
      { label: "Data de Fundação", aliases: ["data de fundacao", "data de fundação", "dataFundacao", "data_fundacao", "fundacao", "fundação"] },
      { label: "Nome do Representante Legal", aliases: ["nome do representante legal", "representante legal", "nomeRepresentanteLegal", "representanteLegal", "nome_representante_legal"] },
      { label: "Tipo de Agente", aliases: ["tipo de agente", "tipoAgente", "tipo_agente", "agente cultural"] },
      { label: "Tipo de Iniciativa Cultural", aliases: ["tipo de iniciativa cultural", "tipoIniciativaCultural", "tipo_iniciativa_cultural", "iniciativa cultural"] },
      { label: "Área de Atuação", aliases: ["area de atuacao", "área de atuação", "areaAtuacao", "area_atuacao"] },
    ];
  }

  if (normalizedReport.includes("indicadores sociodemograficos")) {
    return [
      { label: "Indicador", aliases: ["indicador"] },
      { label: "Categoria", aliases: ["categoria"] },
      { label: "Quantidade", aliases: ["quantidade"] },
      { label: "Percentual", aliases: ["percentual"] },
    ];
  }

  if (normalizedReport.includes("diretoria")) {
    return [
      { label: "Nome Completo", aliases: ["nome completo", "nomeCompleto", "nome_completo", "nome"] },
      { label: "Data de Nascimento", aliases: ["data de nascimento", "dataNascimento", "data_nascimento", "nascimento"] },
      { label: "CPF", aliases: ["cpf"] },
      { label: "RG", aliases: ["rg"] },
      { label: "Cargo na Diretoria", aliases: ["cargo na diretoria", "cargoDiretoria", "cargo_diretoria", "cargo"] },
      { label: "Status da Diretoria", aliases: ["status da diretoria", "statusDiretoria", "status_diretoria", "status"] },
      { label: "Data de Início do Mandato", aliases: ["data de inicio do mandato", "data de início do mandato", "dataInicioMandato", "data_inicio_mandato", "inicioMandato", "inicio_mandato"] },
      { label: "Data de Fim do Mandato", aliases: ["data de fim do mandato", "dataFimMandato", "data_fim_mandato", "dataTerminoMandato", "data_termino_mandato", "fimMandato", "fim_mandato", "terminoMandato"] },
      { label: "Data de Afastamento", aliases: ["data de afastamento", "dataAfastamento", "data_afastamento", "afastamento"] },
    ];
  }

  if (normalizedReport.includes("documento")) {
    return [
      { label: "Tipo de Documento", aliases: ["tipo de documento", "tipoDocumento", "tipo_documento"] },
      { label: "Status do Documento", aliases: ["status do documento", "statusDocumento", "status_documento", "status"] },
      { label: "Emissão e Validade", aliases: ["emissao e validade", "emissão e validade", "emissaoValidade", "emissao_validade"] },
      { label: "Data de Emissão", aliases: ["data de emissao", "data de emissão", "dataEmissao", "data_emissao", "emissao", "emissão"] },
      { label: "Data de Validade", aliases: ["data de validade", "dataValidade", "data_validade", "validade", "vencimento"] },
      { label: "Órgão Emissor", aliases: ["orgao emissor", "órgão emissor", "orgaoEmissor", "orgao_emissor", "emissor"] },
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
    ];
  }

  if (normalizedReport.includes("colaborador")) {
    return [
      { label: "Nome Completo", aliases: ["nome completo", "nomeCompleto", "nome_completo", "nome"] },
      { label: "Data de Nascimento", aliases: ["data de nascimento", "dataNascimento", "data_nascimento", "nascimento"] },
      { label: "CPF", aliases: ["cpf"] },
      { label: "RG", aliases: ["rg"] },
      { label: "Função do Colaborador", aliases: ["funcao do colaborador", "função do colaborador", "funcaoColaborador", "funcao_colaborador", "funcao", "função", "cargo"] },
      { label: "Carga Horária Semanal", aliases: ["carga horaria semanal", "carga horária semanal", "cargaHorariaSemanal", "carga_horaria_semanal", "cargaHoraria", "carga_horaria"] },
      { label: "Data de Início do Vínculo", aliases: ["data de inicio do vinculo", "data de início do vínculo", "dataInicioVinculo", "data_inicio_vinculo", "inicioVinculo"] },
      { label: "Data de Término do Vínculo", aliases: ["data de termino do vinculo", "data de término do vínculo", "dataTerminoVinculo", "data_termino_vinculo", "dataFimVinculo", "fimVinculo"] },
      { label: "Status do Colaborador", aliases: ["status do colaborador", "statusColaborador", "status_colaborador", "status"] },
      { label: "Tipo de Vínculo", aliases: ["tipo de vinculo", "tipo de vínculo", "tipoVinculo", "tipo_vinculo", "vinculo", "vínculo"] },
    ];
  }

  if (normalizedReport.includes("agente cultural") || normalizedReport.includes("agentes culturais")) {
    return [
      {
        label: "Nome / Razão Social",
        aliases: [
          "nome",
          "nome completo",
          "nomeCompleto",
          "nome_completo",
          "nomePrincipal",
          "nome_principal",
          "nomeFantasia",
          "nome_fantasia",
          "razaoSocial",
          "razao_social",
        ],
      },
      { label: "Tipo de Pessoa", aliases: ["tipo de pessoa", "tipoPessoa", "tipo_pessoa", "tipo de agente", "tipoAgente", "tipo_agente"] },
      { label: "CPF/CNPJ", aliases: ["cpf/cnpj", "cpfCnpj", "cpf_cnpj", "cpf", "cnpj", "documento"] },
      { label: "E-mail", aliases: ["email", "e-mail"] },
      { label: "Telefone", aliases: ["telefone", "celular"] },
      { label: "Área de Atuação", aliases: ["area de atuacao", "área de atuação", "areaAtuacao", "area_atuacao"] },
      { label: "Cidade", aliases: ["cidade", "municipio", "município"] },
      { label: "Estado", aliases: ["estado", "uf"] },
      { label: "Status", aliases: ["status", "situacao", "situação"] },
    ];
  }

  if (normalizedReport.includes("integrante")) {
    return [
      { label: "Nome Completo", aliases: ["nome completo", "nomeCompleto", "nome_completo", "nome"] },
      { label: "Data de Nascimento", aliases: ["data de nascimento", "dataNascimento", "data_nascimento", "nascimento"] },
      { label: "CPF", aliases: ["cpf"] },
      { label: "RG", aliases: ["rg"] },
      { label: "Telefone", aliases: ["telefone", "celular"] },
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
      { label: "Função / Atuação", aliases: ["funcao atuacao", "função atuação", "funcaoAtuacao", "funcao_atuacao", "funcao", "função", "atuacao", "atuação"] },
      { label: "Data de Entrada", aliases: ["data de entrada", "dataEntrada", "data_entrada", "entrada"] },
      { label: "Status do Integrante", aliases: ["status do integrante", "statusIntegrante", "status_integrante", "status"] },
    ];
  }

  if (normalizedReport.includes("participante") || normalizedReport.includes("aluno")) {
    return [
      { label: "Nome Completo", aliases: ["nome completo", "nomeCompleto", "nome_completo", "nome"] },
      { label: "Data de Nascimento", aliases: ["data de nascimento", "dataNascimento", "data_nascimento", "nascimento"] },
      { label: "CPF", aliases: ["cpf"] },
      { label: "RG", aliases: ["rg"] },
      { label: "Nome do Responsável", aliases: ["nome do responsavel", "nome do responsável", "nomeResponsavel", "nome_responsavel", "responsavel", "responsável"] },
      { label: "Status do Participante", aliases: ["status do participante", "statusParticipante", "status_participante", "status"] },
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
      { label: "Atividade", aliases: ["atividade", "atividade.nome", "atividade.nomeAtividade", "nomeAtividade"] },
      { label: "Data da Matrícula", aliases: ["data da matricula", "data da matrícula", "dataMatricula", "data_matricula", "matricula", "matrícula"] },
      { label: "Status da Matrícula", aliases: ["status da matricula", "status da matrícula", "statusMatricula", "status_matricula"] },
    ];
  }

  if (normalizedReport.includes("cronograma")) {
    return [
      { label: "Nome da Etapa", aliases: ["nome da etapa", "nomeEtapa", "nome_etapa", "etapa", "nome"] },
      { label: "Data de Início", aliases: ["data de inicio", "data de início", "dataInicio", "data_inicio", "inicio", "início"] },
      { label: "Data de Término", aliases: ["data de termino", "data de término", "dataTermino", "data_termino", "dataFim", "data_fim", "fim"] },
      { label: "Status do Cronograma", aliases: ["status do cronograma", "statusCronograma", "status_cronograma", "status"] },
      { label: "Projeto", aliases: ["projeto", "projeto.nome", "nomeProjeto", "nome_projeto"] },
      { label: "Vínculo Específico", aliases: ["vinculo especifico", "vínculo específico", "vinculoEspecifico", "vinculo_especifico", "referencia", "referência"] },
    ];
  }

  if (normalizedReport.includes("atividade") || normalizedReport.includes("oficina")) {
    return [
      { label: "Nome da Atividade", aliases: ["nome da atividade", "nome atividade", "nomeAtividade", "nome_atividade", "tituloAtividade"] },
      { label: "Data de Início da Atividade", aliases: ["data de inicio da atividade", "data de início da atividade", "dataInicioAtividade", "data_inicio_atividade", "dataInicio", "data_inicio"] },
      { label: "Data de Término da Atividade", aliases: ["data de termino da atividade", "data de término da atividade", "dataTerminoAtividade", "data_termino_atividade", "dataFimAtividade", "data_fim_atividade", "dataFim"] },
      { label: "Qtde Vagas", aliases: ["quantidade de vagas", "quantidadeVagas", "quantidade_vagas", "qtdVagas", "qtd_vagas", "vagas"] },
      { label: "Tipo de Atividade", aliases: ["tipo de atividade", "tipoAtividade", "tipo_atividade"] },
      { label: "Status da Atividade", aliases: ["status da atividade", "statusAtividade", "status_atividade", "status"] },
      { label: "Vínculos e Equipe", aliases: ["vinculos e equipe", "vínculos e equipe", "vinculosEquipe", "vinculos_equipe", "vinculoEquipe", "equipe"] },
      { label: "Projeto", aliases: ["projeto", "projeto.nome", "nomeProjeto", "nome_projeto", "projetoVinculado"] },
      { label: "Colaboradores", aliases: ["colaboradores", "colaborador", "colaboradores.nome", "colaboradores.nomeCompleto", "equipe colaboradora", "responsaveis", "responsáveis"] },
    ];
  }

  if (normalizedReport.includes("turma")) {
    return [
      { label: "Nome da Turma", aliases: ["nome da turma", "nomeTurma", "nome_turma", "turma", "nome"] },
      { label: "Horário de Início da Aula", aliases: ["horario de inicio da aula", "horário de início da aula", "horarioInicioAula", "horario_inicio_aula", "horaInicio", "hora_inicio"] },
      { label: "Horário de Término da Aula", aliases: ["horario de termino da aula", "horário de término da aula", "horarioTerminoAula", "horario_termino_aula", "horaFim", "hora_fim"] },
      { label: "Dia da Atividade", aliases: ["dia da atividade", "diaAtividade", "dia_atividade", "dia"] },
      { label: "Status da Turma", aliases: ["status da turma", "statusTurma", "status_turma", "status"] },
      { label: "Quantidade de Vagas", aliases: ["quantidade de vagas", "quantidadeVagas", "quantidade_vagas", "qtdVagas", "vagas"] },
      { label: "Atividade", aliases: ["atividade", "atividade.nome", "atividade.nomeAtividade", "nomeAtividade"] },
      { label: "Colaboradores", aliases: ["colaboradores", "colaborador", "colaboradores.nome", "colaboradores.nomeCompleto", "equipe"] },
    ];
  }

  if (normalizedReport.includes("evento cultural") || normalizedReport.includes("eventos culturais") || normalizedReport.includes("evento")) {
    return [
      { label: "Nome do Evento", aliases: ["nome do evento", "nomeEvento", "nome_evento", "evento", "nome"] },
      { label: "Data do Evento", aliases: ["data do evento", "dataEvento", "data_evento", "data"] },
      { label: "Data de Término do Evento", aliases: ["data de termino do evento", "data de término do evento", "dataTerminoEvento", "data_termino_evento", "dataFimEvento", "data_fim_evento"] },
      { label: "Tipo de Evento", aliases: ["tipo de evento", "tipoEvento", "tipo_evento"] },
      { label: "Status do Evento", aliases: ["status do evento", "statusEvento", "status_evento", "status"] },
      { label: "Projeto", aliases: ["projeto", "projeto.nome", "nomeProjeto", "nome_projeto"] },
      { label: "Colaboradores", aliases: ["colaboradores", "colaborador", "colaboradores.nome", "colaboradores.nomeCompleto", "equipe"] },
    ];
  }

  if (
    normalizedReport.includes("propostas de edital") ||
    normalizedReport.includes("proposta de edital")
  ) {
    return [
      { label: "Título do Projeto", aliases: ["titulo do projeto", "título do projeto", "tituloProjeto", "titulo_projeto", "nomeProposta", "nome_proposta"] },
      { label: "Edital", aliases: ["edital", "nomeEdital", "nome_edital"] },
      { label: "Projeto Base", aliases: ["projeto base", "projetoBase", "projeto_base", "projeto"] },
      { label: "Agente Responsável", aliases: ["agente responsavel", "agente responsável", "agente", "agenteResponsavel", "agente_responsavel"] },
      { label: "Valor Solicitado", aliases: ["valor solicitado", "valorSolicitado", "valor_solicitado", "valor"] },
      { label: "Valor de Contrapartida", aliases: ["valor de contrapartida", "valorContrapartida", "valor_contrapartida", "contrapartida"] },
      { label: "Data de Submissão", aliases: ["data de submissao", "data de submissão", "dataSubmissao", "data_submissao", "submissao", "submissão"] },
      { label: "Status da Proposta", aliases: ["status da proposta", "statusPropostaEdital", "status_proposta_edital", "status"] },
      { label: "Resumo", aliases: ["resumo", "resumoProjeto", "resumo_projeto"] },
      { label: "Impacto Esperado", aliases: ["impacto esperado", "impactoEsperado", "impacto_esperado"] },
    ];
  }

  if (
    normalizedReport.includes("equipe da proposta") ||
    normalizedReport.includes("equipe do edital") ||
    normalizedReport.includes("equipe edital")
  ) {
    return [
      { label: "Proposta de Edital", aliases: ["proposta de edital", "propostaEdital", "proposta_edital", "proposta"] },
      { label: "Pessoa", aliases: ["pessoa", "nome", "nomeCompleto", "nome_completo", "colaborador", "integrante"] },
      { label: "Tipo de Pessoa", aliases: ["tipo de pessoa", "tipoPessoa", "tipo_pessoa"] },
      { label: "Função no Projeto", aliases: ["funcao no projeto", "função no projeto", "funcaoProjeto", "funcao_projeto", "funcao", "função"] },
      { label: "Carga Horária", aliases: ["carga horaria", "carga horária", "cargaHorariaPrevista", "carga_horaria_prevista", "carga"] },
      { label: "Valor Previsto", aliases: ["valor previsto", "valorPrevisto", "valor_previsto", "valor"] },
      { label: "Coordenador", aliases: ["coordenador", "coordenadorProjeto", "coordenador_projeto"] },
      { label: "Responsável Técnico", aliases: ["responsavel tecnico", "responsável técnico", "responsavelTecnico", "responsavel_tecnico"] },
      { label: "Justificativa da Função", aliases: ["justificativa da funcao", "justificativa da função", "justificativaFuncao", "justificativa_funcao"] },
      { label: "Mini Biografia", aliases: ["mini biografia", "miniBiografia", "mini_biografia", "biografia"] },
    ];
  }

  if (
    normalizedReport.includes("plano de comunicacao") ||
    normalizedReport.includes("plano de comunicação") ||
    normalizedReport.includes("planos de comunicacao") ||
    normalizedReport.includes("planos de comunicação")
  ) {
    return [
      { label: "Plano", aliases: ["plano", "nomePlano", "nome_plano", "nome"] },
      { label: "Proposta de Edital", aliases: ["proposta de edital", "propostaEdital", "proposta_edital", "proposta", "nomePropostaEdital", "nome_proposta_edital"] },
      { label: "Edital", aliases: ["edital", "nomeEdital", "nome_edital"] },
      { label: "Formato", aliases: ["formato", "formatoPlanoComunicacao", "formato_plano_comunicacao", "formatoComunicacao", "formato_comunicacao"] },
      { label: "Quantidade", aliases: ["quantidade"] },
      { label: "Local de Circulação", aliases: ["local de circulacao", "local de circulação", "localCirculacaoComunicacao", "local_circulacao_comunicacao", "localCirculacao", "local_circulacao"] },
      { label: "Estratégias de Divulgação", aliases: ["estrategias de divulgacao", "estratégias de divulgação", "estrategiasDivulgacao", "estrategias_divulgacao"] },
      { label: "Data de Início", aliases: ["data de inicio", "data de início", "dataInicio", "data_inicio"] },
      { label: "Data de Fim", aliases: ["data de fim", "dataFim", "data_fim"] },
      { label: "Status", aliases: ["status"] },
    ];
  }

  if (normalizedReport.includes("execucao de divulgacao") || normalizedReport.includes("execução de divulgação") || normalizedReport.includes("execucoes de divulgacao") || normalizedReport.includes("execuções de divulgação")) {
    return [
      { label: "Quantidade", aliases: ["quantidade"] },
      { label: "Formato da Comunicação", aliases: ["formato da comunicacao", "formato da comunicação", "formatoComunicacao", "formato_comunicacao", "formato"] },
      { label: "Local de Circulação", aliases: ["local de circulacao", "local de circulação", "localCirculacao", "local_circulacao", "local"] },
      { label: "Data de Início", aliases: ["data de inicio", "data de início", "dataInicio", "data_inicio"] },
      { label: "Data de Fim", aliases: ["data de fim", "dataFim", "data_fim", "fim"] },
      { label: "Ação de Divulgação", aliases: ["acao de divulgacao", "ação de divulgação", "acaoDivulgacao", "acao_divulgacao"] },
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
      { label: "Status do Registro", aliases: ["status do registro", "statusRegistro", "status_registro", "status"] },
    ];
  }

  if (normalizedReport.includes("acao de divulgacao") || normalizedReport.includes("ação de divulgação") || normalizedReport.includes("acoes de divulgacao") || normalizedReport.includes("ações de divulgação")) {
    return [
      { label: "Nome da Ação", aliases: ["nome da acao", "nome da ação", "nomeAcao", "nome_acao", "acao", "ação"] },
      { label: "Proposta de Edital", aliases: ["proposta de edital", "propostaEdital", "proposta_edital", "nomePropostaEdital", "nome_proposta_edital", "proposta"] },
      { label: "Edital", aliases: ["edital", "nomeEdital", "nome_edital"] },
      { label: "Projeto", aliases: ["projeto", "projeto.nome", "nomeProjeto", "nome_projeto"] },
      { label: "Realização", aliases: ["realizacao", "realização", "realizacaoAcao", "realizacao_acao"] },
      { label: "Objetivo", aliases: ["objetivo", "objetivoAcao", "objetivo_acao"] },
      { label: "Acessibilidade", aliases: ["acessibilidade", "acoesAcessibilidade", "acoes_acessibilidade", "ações de acessibilidade"] },
      { label: "Resultado Esperado", aliases: ["resultado esperado", "resultadoEsperado", "resultado_esperado"] },
      { label: "Produtos Gerados", aliases: ["produtos gerados", "produtosGerados", "produtos_gerados"] },
      { label: "Status", aliases: ["status"] },
    ];
  }

  if (
    normalizedReport.includes("planejamento financeiro") ||
    normalizedReport.includes("planejamentos financeiros") ||
    normalizedReport.includes("aplicacao financeira") ||
    normalizedReport.includes("aplicação financeira") ||
    normalizedReport.includes("aplicacoes financeiras") ||
    normalizedReport.includes("aplicações financeiras") ||
    normalizedReport.includes("aplicacao de recursos") ||
    normalizedReport.includes("aplicação de recursos") ||
    normalizedReport.includes("orcamento da proposta") ||
    normalizedReport.includes("orçamento da proposta")
  ) {
    return [
      {
        label: "Nome Planejamento",
        aliases: [
          "nome planejamento",
          "nomePlanejamento",
          "nome_planejamento",
          "item do planejamento",
          "item de aplicacao",
          "item de aplicação",
          "item da aplicacao",
          "item da aplicação",
          "planejamento",
          "nome",
          "titulo",
          "título",
          "item",
        ],
      },
      { label: "Quantidade", aliases: ["quantidade", "qtd"] },
      {
        label: "Unidade Medida",
        aliases: [
          "unidade medida",
          "unidade de medida",
          "unidadeMedida",
          "unidade_medida",
          "unidade",
        ],
      },
      {
        label: "Valor Unitário",
        aliases: [
          "valor unitario",
          "valor unitário",
          "valorUnitario",
          "valor_unitario",
        ],
      },
      {
        label: "Valor Total",
        aliases: ["valor total", "valorTotal", "valor_total", "total"],
      },
      {
        label: "Função Equipe",
        aliases: [
          "funcao equipe",
          "função equipe",
          "funcao da equipe",
          "função da equipe",
          "funcaoEquipe",
          "funcao_equipe",
          "equipe.funcao",
          "equipe.funcaoEquipe",
        ],
      },
      {
        label: "Colaborador",
        aliases: [
          "colaborador",
          "colaborador.nome",
          "colaborador.nomeCompleto",
          "colaborador.nome_completo",
          "nomeColaborador",
          "nome_colaborador",
          "equipe.colaborador",
          "equipe.colaborador.nome",
          "equipe.colaborador.nomeCompleto",
        ],
      },
    ];
  }

  if (normalizedReport.includes("financeiro")) {
    return [
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
      { label: "Número do Documento", aliases: ["numero do documento", "número do documento", "numeroDocumento", "numero_documento"] },
      { label: "Data do Pagamento", aliases: ["data do pagamento", "dataPagamento", "data_pagamento"] },
      { label: "Data de Vencimento", aliases: ["data de vencimento", "dataVencimento", "data_vencimento", "vencimento"] },
      { label: "Colaborador", aliases: ["colaborador", "colaborador.nome", "colaborador.nomeCompleto", "nomeColaborador"] },
      { label: "Nome da Pessoa", aliases: ["nome da pessoa", "nomePessoa", "nome_pessoa", "pessoa", "favorecido", "beneficiario", "beneficiário"] },
      { label: "CPF/CNPJ", aliases: ["cpf/cnpj", "cpfCnpj", "cpf_cnpj", "cpf", "cnpj"] },
      { label: "Valor", aliases: ["valor"] },
      { label: "Tipo de Operação", aliases: ["tipo de operacao", "tipo de operação", "tipoOperacao", "tipo_operacao", "operacao", "operação"] },
      { label: "Forma de Pagamento", aliases: ["forma de pagamento", "formaPagamento", "forma_pagamento"] },
      { label: "Aplicação Financeira", aliases: ["aplicacao financeira", "aplicação financeira", "aplicacaoFinanceira", "aplicacao_financeira"] },
      { label: "Status Financeiro", aliases: ["status financeiro", "statusFinanceiro", "status_financeiro", "status"] },
      { label: "Aplicação de Recursos", aliases: ["orcamento da proposta", "orçamento da proposta", "orcamentoProposta", "orcamento_proposta"] },
      { label: "Projeto", aliases: ["projeto", "projeto.nome", "nomeProjeto", "nome_projeto"] },
      { label: "Atividade", aliases: ["atividade", "atividade.nome", "atividade.nomeAtividade", "nomeAtividade"] },
      { label: "Evento Cultural", aliases: ["evento cultural", "eventoCultural", "evento_cultural", "evento", "evento.nome", "nomeEvento"] },
      { label: "Ação de Divulgação", aliases: ["acao de divulgacao", "ação de divulgação", "acaoDivulgacao", "acao_divulgacao"] },
    ];
  }

  if (normalizedReport.includes("edital") || normalizedReport.includes("editais")) {
    return [
      { label: "Nome do Edital", aliases: ["nome do edital", "nomeEdital", "nome_edital", "edital", "nome"] },
      { label: "Número do Edital", aliases: ["numero do edital", "número do edital", "numeroEdital", "numero_edital"] },
      { label: "Número de Inscrição", aliases: ["numero de inscricao", "número de inscrição", "numeroInscricao", "numero_inscricao", "inscricao", "inscrição"] },
      { label: "Ano do Edital", aliases: ["ano do edital", "anoEdital", "ano_edital", "ano"] },
      { label: "Órgão Responsável", aliases: ["orgao responsavel", "órgão responsável", "orgaoResponsavel", "orgao_responsavel"] },
      { label: "Data de Abertura", aliases: ["data de abertura", "dataAbertura", "data_abertura", "abertura"] },
      { label: "Data de Encerramento", aliases: ["data de encerramento", "dataEncerramento", "data_encerramento", "encerramento"] },
      { label: "Data do Resultado", aliases: ["data do resultado", "dataResultado", "data_resultado", "resultado"] },
      { label: "Valor Total Disponível", aliases: ["valor total disponivel", "valor total disponível", "valorTotalDisponivel", "valor_total_disponivel", "valorTotal"] },
      { label: "Esfera do Edital", aliases: ["esfera do edital", "esferaEdital", "esfera_edital", "esfera"] },
      { label: "Status do Edital", aliases: ["status do edital", "statusEdital", "status_edital", "status"] },
      { label: "Organização", aliases: ["organizacao", "organização", "organizacao.nome", "organizacao.razaoSocial", "organizacao.nomeFantasia"] },
      { label: "Agente Responsável", aliases: ["agente responsavel", "agente responsável", "agenteResponsavel", "agente_responsavel", "responsavel", "responsável"] },
    ];
  }

  if (normalizedReport.includes("projeto")) {
    return [
      { label: "Nome do Projeto", aliases: ["nome do projeto", "nomeProjeto", "nome_projeto", "nome", "titulo", "título", "projeto"] },
      { label: "Data de Início do Projeto", aliases: ["data de inicio do projeto", "data de início do projeto", "dataInicioProjeto", "data_inicio_projeto", "dataInicio", "data_inicio"] },
      { label: "Data de Término do Projeto", aliases: ["data de termino do projeto", "data de término do projeto", "dataTerminoProjeto", "data_termino_projeto", "dataFimProjeto", "data_fim_projeto", "dataFim"] },
      { label: "Status do Projeto", aliases: ["status do projeto", "statusProjeto", "status_projeto", "status"] },
      { label: "Área de Atuação", aliases: ["area de atuacao", "área de atuação", "areaAtuacao", "area_atuacao"] },
      { label: "Origem do Projeto", aliases: ["origem do projeto", "origemProjeto", "origem_projeto", "origem"] },
      { label: "Colaboradores", aliases: ["colaboradores", "colaborador", "equipe"] },
    ];
  }

  if (normalizedReport.includes("patrimonio")) {
    return [
      { label: "Nome", aliases: ["nome", "item", "bem", "patrimonio", "patrimônio"] },
      { label: "Código", aliases: ["codigo", "código", "tombamento", "identificacao", "identificação"] },
      { label: "Categoria", aliases: ["categoria", "tipo"] },
      { label: "Estado de Conservação", aliases: ["estado", "conservacao", "conservação"] },
      { label: "Localização", aliases: ["localizacao", "localização", "local"] },
      { label: "Responsável", aliases: ["responsavel", "responsável"] },
      { label: "Status", aliases: ["status", "situacao", "situação"] },
      { label: "Observação", aliases: ["observacao", "observação"] },
    ];
  }

  if (
    normalizedReport.includes("evidencia de execucao") ||
    normalizedReport.includes("evidência de execução") ||
    normalizedReport.includes("evidencias de execucao") ||
    normalizedReport.includes("evidências de execução") ||
    normalizedReport.includes("evidencia")
  ) {
    return [
      {
        label: "Título Evidência",
        aliases: [
          "titulo evidencia",
          "título evidência",
          "tituloEvidencia",
          "titulo_evidencia",
          "titulo",
          "título",
          "evidencia",
          "evidência",
        ],
      },
      {
        label: "Tipo Evidência",
        aliases: [
          "tipo evidencia",
          "tipo evidência",
          "tipoEvidencia",
          "tipo_evidencia",
          "tipo",
          "categoria",
        ],
      },
      {
        label: "Tipo Vínculo Evidência",
        aliases: [
          "tipo vinculo evidencia",
          "tipo vínculo evidência",
          "tipoVinculoEvidencia",
          "tipo_vinculo_evidencia",
          "tipoVinculo",
          "tipo_vinculo",
          "vinculoEvidencia",
          "vinculo_evidencia",
          "vínculo evidência",
          "vinculo",
          "vínculo",
        ],
      },
      {
        label: "Projeto",
        aliases: [
          "projeto",
          "projeto.nome",
          "projeto.nomeProjeto",
          "projeto.titulo",
          "nomeProjeto",
          "nome_projeto",
        ],
      },
    ];
  }

  if (normalizedReport.includes("proposta")) {
    return [
      { label: "Nome", aliases: ["nome", "titulo", "título", "proposta"] },
      { label: "Edital", aliases: ["edital"] },
      { label: "Projeto", aliases: ["projeto"] },
      { label: "Status", aliases: ["status", "situacao", "situação"] },
      { label: "Responsável", aliases: ["responsavel", "responsável", "proponente"] },
      { label: "Valor", aliases: ["valor"] },
      { label: "Data / Prazo", aliases: ["data", "prazo"] },
      { label: "Etapa", aliases: ["etapa"] },
    ];
  }

  if (normalizedReport.includes("habilitacao")) {
    return [
      { label: "Documento / Requisito", aliases: ["documento", "requisito", "item"] },
      { label: "Edital", aliases: ["edital"] },
      { label: "Proposta", aliases: ["proposta"] },
      { label: "Status", aliases: ["status", "situacao", "situação"] },
      { label: "Validade", aliases: ["validade", "vencimento"] },
      { label: "Responsável", aliases: ["responsavel", "responsável"] },
      { label: "Pendência / Observação", aliases: ["observacao", "observação", "pendencia", "pendência"] },
      { label: "Arquivo", aliases: ["arquivo"] },
    ];
  }

  if (normalizedReport.includes("prestacao")) {
    return [
      { label: "Proposta de Edital", aliases: ["proposta de edital", "propostaEdital", "proposta_edital", "proposta"] },
      { label: "Agente Responsável", aliases: ["agente responsavel", "agente responsável", "agente", "agenteResponsavel", "agente_responsavel"] },
      { label: "Data de Entrega", aliases: ["data de entrega", "dataEntrega", "data_entrega", "entrega", "data"] },
      { label: "Produtos Gerados", aliases: ["produtos gerados", "produtosGerados", "produtos_gerados"] },
      { label: "Metas Prestadas", aliases: ["metas prestadas", "prestacaoMetas", "prestacao_metas", "metas"] },
      { label: "Equipe do Projeto", aliases: ["equipe do projeto", "equipeProjeto", "equipe_projeto", "equipe"] },
      { label: "Ações de Divulgação", aliases: ["acoes de divulgacao", "ações de divulgação", "acoesDivulgacao", "acoes_divulgacao"] },
      { label: "Resultados Gerados", aliases: ["resultados gerados", "resultadosGeradosProjeto", "resultados_gerados_projeto"] },
      { label: "Resumo dos Resultados", aliases: ["resumo dos resultados", "resumoResultados", "resumo_resultados", "resumo"] },
      { label: "Disponibilização ao Público", aliases: ["disponibilizacao ao publico", "disponibilização ao público", "disponibilizacaoProdutosPublico", "disponibilizacao_produtos_publico"] },
    ];
  }

  return [
    { label: "Nome", aliases: ["nome", "titulo", "título", "descricao", "descrição"] },
    { label: "Status", aliases: ["status", "situacao", "situação"] },
    { label: "Responsável", aliases: ["responsavel", "responsável"] },
    { label: "Data", aliases: ["data"] },
    { label: "Valor", aliases: ["valor"] },
    { label: "Tipo", aliases: ["tipo", "categoria"] },
    { label: "Projeto", aliases: ["projeto"] },
    { label: "Observação", aliases: ["observacao", "observação"] },
  ];
}

function buildRelatorioColumnStyles<T>(cols: RelatorioColumn<T>[]) {
  const styles: Record<number, Record<string, unknown>> = {};

  const totalCols = cols.length;
  const compact = totalCols > 8;
  const veryCompact = totalCols > 12;

  cols.forEach((col, index) => {
    const normalized = normalizeLabel(`${col.key} ${col.label}`);

    if (
      normalized.includes("nome completo") ||
      normalized.includes("razao social") ||
      normalized.includes("razão social") ||
      normalized.includes("nome fantasia") ||
      normalized.includes("nome do projeto") ||
      normalized.includes("nome do edital") ||
      normalized.includes("nome do evento") ||
      normalized.includes("nome da atividade") ||
      normalized.includes("nome da turma") ||
      normalized.includes("nome da acao") ||
      normalized.includes("nome da ação") ||
      normalized.includes("participante") ||
      normalized.includes("titulo") ||
      normalized.includes("título") ||
      normalized.includes("descricao") ||
      normalized.includes("descrição")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 23 : compact ? 31 : 44,
        halign: "left",
        fontStyle: "bold",
      };
      return;
    }

    if (
      normalized.includes("responsavel") ||
      normalized.includes("responsável") ||
      normalized.includes("representante") ||
      normalized.includes("organizacao") ||
      normalized.includes("organização") ||
      normalized.includes("instituicao") ||
      normalized.includes("instituição") ||
      normalized.includes("oficina") ||
      normalized.includes("atividade") ||
      normalized.includes("colaboradores") ||
      normalized.includes("colaborador") ||
      normalized.includes("equipe") ||
      normalized.includes("projeto")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 21 : compact ? 27 : 38,
        halign: "left",
      };
      return;
    }

    if (
      normalized.includes("telefone") ||
      normalized.includes("celular") ||
      normalized.includes("cpf") ||
      normalized.includes("cnpj") ||
      normalized.includes("rg") ||
      normalized.includes("numero") ||
      normalized.includes("número")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 18 : compact ? 22 : 28,
        halign: "left",
      };
      return;
    }

    if (
      normalized.includes("status") ||
      normalized.includes("situacao") ||
      normalized.includes("situação")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 18 : compact ? 22 : 25,
        halign: "center",
      };
      return;
    }

    if (
      normalized.includes("data") ||
      normalized.includes("inicio") ||
      normalized.includes("início") ||
      normalized.includes("fim") ||
      normalized.includes("termino") ||
      normalized.includes("término") ||
      normalized.includes("validade") ||
      normalized.includes("vencimento") ||
      normalized.includes("emissao") ||
      normalized.includes("emissão") ||
      normalized.includes("abertura") ||
      normalized.includes("encerramento") ||
      normalized.includes("resultado") ||
      normalized.includes("pagamento") ||
      normalized.includes("horario") ||
      normalized.includes("horário") ||
      normalized.includes("dia da atividade")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 18 : compact ? 22 : 25,
        halign: "center",
      };
      return;
    }

    if (
      normalized.includes("valor") ||
      normalized.includes("orcamento") ||
      normalized.includes("orçamento") ||
      normalized.includes("recurso")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 20 : compact ? 24 : 27,
        halign: "right",
      };
      return;
    }

    if (
      normalized.includes("area") ||
      normalized.includes("área") ||
      normalized.includes("tipo") ||
      normalized.includes("funcao") ||
      normalized.includes("função") ||
      normalized.includes("cargo") ||
      normalized.includes("vinculo") ||
      normalized.includes("vínculo") ||
      normalized.includes("esfera") ||
      normalized.includes("formato") ||
      normalized.includes("local") ||
      normalized.includes("estrategia") ||
      normalized.includes("estratégia") ||
      normalized.includes("aplicacao") ||
      normalized.includes("aplicação")
    ) {
      styles[index] = {
        cellWidth: veryCompact ? 20 : compact ? 25 : 32,
        halign: "left",
      };
      return;
    }

    styles[index] = {
      cellWidth: "auto",
      halign: "left",
    };
  });

  return styles;
}

function formatPdfTableCell<T>(row: T, col: RelatorioColumn<T>): string {
  const value = formatCell(row, col);

  if (!value) return "—";

  const normalized = normalizeLabel(`${col.key} ${col.label}`);

  if (normalized.includes("cpf/cnpj")) {
    return maskCpfCnpj(value);
  }

  if (normalized.includes("cnpj")) {
    return maskCNPJ(value);
  }

  if (normalized.includes("cpf")) {
    return maskCPF(value);
  }

  if (
    normalized.includes("valor") ||
    normalized.includes("orcamento") ||
    normalized.includes("orçamento") ||
    normalized.includes("recurso") ||
    normalized.includes("saldo")
  ) {
    const parsed = Number(
      value
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    );

    if (!Number.isNaN(parsed)) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(parsed);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");

    return `${day}/${month}/${year}`;
  }

  return value;
}

async function exportPresencasPdf(
  rows: Record<string, unknown>[],
  options: PdfOptions,
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const ctx = await resolvePdfContext();

  const headerOptions: HeaderOptions = {
    title: options.reportName || "Relatório de Presenças",
    documentNumber: "PRES-001",
  };

  const info = obterInfoCabecalho(rows, options);
  const grupos = agruparPresencasPorMes(rows);

  drawHeader(doc, headerOptions, ctx);

  let cursor = BODY_START_Y;

  cursor = drawSectionTitle(
    doc,
    "Identificação da Lista de Presença",
    cursor,
    headerOptions,
    ctx,
  );

  cursor = drawGridFields(
    doc,
    [
      {
        label: "Organização",
        value: options.organizacaoNome || getNomeInstitucional(ctx),
      },
      {
        label: "Atividade",
        value: info.atividade || "—",
      },
      {
        label: "Turma",
        value: info.turma || "—",
      },
      {
        label: "Colaborador",
        value: info.colaboradorResponsavel || "—",
      },
      {
        label: "Total de registros",
        value: rows.length,
      },
    ],
    cursor,
    headerOptions,
    ctx,
  );

  grupos.forEach((grupo, index) => {
    if (index > 0) {
      doc.addPage();
      drawHeader(doc, headerOptions, ctx);
      cursor = BODY_START_Y;
    } else {
      cursor += 3;
    }

    const mapa = montarMapaPresencas(grupo.rows);
    const mesAno = obterMesAno(mapa.datas);

    cursor = drawMesAnoDestaque(doc, mesAno, cursor, headerOptions, ctx);
    cursor = drawLegendaPresencas(doc, cursor, headerOptions, ctx);

    drawTabelaPresencas(
      doc,
      mapa.alunos,
      mapa.datas,
      cursor,
      headerOptions,
      ctx,
    );
  });

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, total, ctx);
  }

  doc.save(buildFileName(options.reportName || "Presenças", "pdf"));
}

function agruparPresencasPorMes(rows: Record<string, unknown>[]) {
  const grupos = new Map<string, Record<string, unknown>[]>();

  rows.forEach((row) => {
    const data = normalizarDataPresenca(
      row.data ??
      row.dataPresenca ??
      row.data_presenca ??
      row.dataChamada ??
      row.data_chamada,
    );

    const chave = data && data.length >= 7 ? data.slice(0, 7) : "sem-data";

    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }

    grupos.get(chave)?.push(row);
  });

  return Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, linhas]) => ({
      chave,
      rows: linhas,
    }));
}

function drawMesAnoDestaque(
  doc: jsPDF,
  mesAno: { mes: string; ano: string },
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 18, opts, ctx);

  const pageWidth = getPageWidth(doc);
  const contentWidth = getContentWidth(doc);
  const x = MARGIN_LEFT;
  const y = cursor;
  const h = 11;

  doc.setFillColor(238, 240, 243);
  doc.setDrawColor(225, 228, 232);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, contentWidth, h, 1.6, 1.6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(24, 38, 56);
  doc.text(`FREQUÊNCIA - ${mesAno.mes.toUpperCase()} ${mesAno.ano}`, pageWidth / 2, y + 7.4, {
    align: "center",
  });

  doc.setTextColor(0);

  return cursor + h + 5;
}

function drawTabelaPresencas(
  doc: jsPDF,
  alunos: AlunoPresencaPdf[],
  datas: string[],
  cursor: number,
  headerOptions: HeaderOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 45, headerOptions, ctx);

  const pageWidth = getPageWidth(doc);
  const tableMarginLeft = MARGIN_LEFT;
  const tableMarginRight = MARGIN_RIGHT;

  const fixedW = {
    numero: 8,
    aluno: 60,
    falta: 10,
    presenca: 10,
    naoTeveAula: 12,
    feriado: 11,
    percentual: 10,
  };

  const availableW = pageWidth - tableMarginLeft - tableMarginRight;

  const resumoW =
    fixedW.falta +
    fixedW.presenca +
    fixedW.naoTeveAula +
    fixedW.feriado +
    fixedW.percentual;

  const datasW = availableW - fixedW.numero - fixedW.aluno - resumoW;

  const dataColW =
    datas.length > 0
      ? Math.max(3.75, Math.min(6.5, datasW / datas.length))
      : 4.5;

  const head = [
    [
      "Nº",
      "Participante",
      ...datas.map((data) => formatDiaNumeroTabela(data)),
      "F",
      "P",
      "NTA",
      "FE",
      "%",
    ],
  ];

  const body = alunos.map((aluno, index) => {
    const cells = datas.map((data) => aluno.presencasPorData[data] ?? "");

    return [
      String(index + 1),
      aluno.nome,
      ...cells,
      String(aluno.totalFaltas),
      String(aluno.totalPresencas),
      String(aluno.totalNaoTeveAula),
      String(aluno.totalFeriados),
      `${aluno.percentual}%`,
    ];
  });

  autoTable(doc, {
    startY: cursor,
    head,
    body,
    theme: "grid",
    margin: {
      left: tableMarginLeft,
      right: tableMarginRight,
      bottom: FOOTER_HEIGHT + 8,
    },
    styles: {
      font: "helvetica",
      fontSize: 6.3,
      cellPadding: 0.8,
      halign: "center",
      valign: "middle",
      lineWidth: 0.12,
      lineColor: CINZA_BORDA,
      minCellHeight: 4.5,
      overflow: "ellipsize",
      textColor: [35, 45, 45],
    },
    headStyles: {
      fillColor: CINZA_HEAD,
      textColor: CINZA_HEAD_TEXTO,
      fontStyle: "bold",
      fontSize: 5.6,
      cellPadding: 0.6,
      minCellHeight: 7,
      valign: "middle",
      halign: "center",
      lineColor: CINZA_BORDA,
      overflow: "ellipsize",
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: {
      0: {
        cellWidth: fixedW.numero,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.8,
      },
      1: {
        cellWidth: fixedW.aluno,
        halign: "left",
        textColor: [35, 45, 45],
        fontStyle: "normal",
        fontSize: 6.3,
      },
      [datas.length + 2]: {
        cellWidth: fixedW.falta,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.7,
      },
      [datas.length + 3]: {
        cellWidth: fixedW.presenca,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.7,
      },
      [datas.length + 4]: {
        cellWidth: fixedW.naoTeveAula,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.4,
      },
      [datas.length + 5]: {
        cellWidth: fixedW.feriado,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.4,
      },
      [datas.length + 6]: {
        cellWidth: fixedW.percentual,
        fillColor: CINZA_RESUMO,
        textColor: [35, 45, 45],
        fontStyle: "bold",
        fontSize: 5.5,
      },
    },
    didParseCell: (data) => {
      const colIndex = data.column.index;
      const isDataColumn = colIndex >= 2 && colIndex < datas.length + 2;

      if (data.section === "head") {
        if (isDataColumn) {
          data.cell.styles.cellWidth = dataColW;
          data.cell.styles.fontSize = 5.3;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.cellPadding = 0.35;
          data.cell.styles.minCellHeight = 6.5;
          data.cell.styles.overflow = "ellipsize";
        }

        return;
      }

      if (data.section !== "body") return;

      if (isDataColumn) {
        data.cell.styles.cellWidth = dataColW;
        data.cell.styles.cellPadding = 0.35;
        data.cell.styles.fontSize = 5.8;
        data.cell.styles.minCellHeight = 5;
        data.cell.styles.overflow = "ellipsize";

        const valor = String(data.cell.raw ?? "");

        if (valor === "P") {
          data.cell.styles.fillColor = AZUL_CLARO;
          data.cell.styles.textColor = AZUL_TEXTO;
          data.cell.styles.fontStyle = "bold";
        } else if (valor === "F") {
          data.cell.styles.fillColor = VERMELHO_CLARO;
          data.cell.styles.textColor = VERMELHO_TEXTO;
          data.cell.styles.fontStyle = "bold";
        } else if (valor === "NTA") {
          data.cell.styles.fillColor = CINZA_STATUS_CLARO;
          data.cell.styles.textColor = CINZA_STATUS_TEXTO;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 4.2;
        } else if (valor === "FE") {
          data.cell.styles.fillColor = AMARELO_CLARO;
          data.cell.styles.textColor = AMARELO_TEXTO;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 5.2;
        } else {
          data.cell.styles.fillColor = FUNDO_VAZIO;
          data.cell.styles.textColor = CINZA_TEXTO;
        }
      }

      if (colIndex === 0) {
        data.cell.styles.fillColor = CINZA_RESUMO;
        data.cell.styles.textColor = [35, 45, 45];
        data.cell.styles.fontStyle = "bold";
      }

      if (
        colIndex === datas.length + 2 ||
        colIndex === datas.length + 3 ||
        colIndex === datas.length + 4 ||
        colIndex === datas.length + 5 ||
        colIndex === datas.length + 6
      ) {
        data.cell.styles.fillColor = CINZA_RESUMO;
        data.cell.styles.textColor = [35, 45, 45];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      drawHeader(doc, headerOptions, ctx);
    },
  });
}

function drawLegendaPresencas(
  doc: jsPDF,
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 9, opts, ctx);

  const legendas = [
    { sigla: "P", texto: "Presente", fill: AZUL_CLARO, color: AZUL_TEXTO },
    { sigla: "F", texto: "Falta", fill: VERMELHO_CLARO, color: VERMELHO_TEXTO },
    {
      sigla: "NTA",
      texto: "Não Teve Aula",
      fill: CINZA_STATUS_CLARO,
      color: CINZA_STATUS_TEXTO,
    },
    {
      sigla: "FE",
      texto: "Feriado",
      fill: AMARELO_CLARO,
      color: AMARELO_TEXTO,
    },
  ];

  let x = MARGIN_LEFT;
  const y = cursor;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(90);
  doc.text("Legenda:", x, y + 4.2);

  x += 15;

  legendas.forEach((item) => {
    const boxW = item.sigla.length > 2 ? 9.5 : 7.5;

    doc.setFillColor(...item.fill);
    doc.setDrawColor(...CINZA_BORDA);
    doc.roundedRect(x, y, boxW, 5.5, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(...item.color);
    doc.text(item.sigla, x + boxW / 2, y + 3.9, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(90);
    doc.text(item.texto, x + boxW + 2, y + 4.2);

    x += doc.getTextWidth(item.texto) + boxW + 13;
  });

  doc.setTextColor(0);

  return cursor + 9;
}

function montarMapaPresencas(rows: Record<string, unknown>[]) {
  const datasRegistradas = Array.from(
    new Set(
      rows
        .map((row) =>
          normalizarDataPresenca(
            row.data ??
            row.dataPresenca ??
            row.data_presenca ??
            row.dataChamada ??
            row.data_chamada,
          ),
        )
        .filter(Boolean),
    ),
  ).sort();

  const referencia = obterReferenciaMes(datasRegistradas);
  const datas = gerarDatasDoMes(referencia.ano, referencia.mes);

  const alunosMap = new Map<string, AlunoPresencaPdf>();

  rows.forEach((row) => {
    const participanteId = texto(row.participanteId ?? row.participante_id);
    const nome =
      texto(row.participanteNome) ||
      texto(row.participante_nome) ||
      texto(row.participante) ||
      (participanteId ? `Participante ${participanteId}` : "Participante não informado");

    const data = normalizarDataPresenca(
      row.data ??
      row.dataPresenca ??
      row.data_presenca ??
      row.dataChamada ??
      row.data_chamada,
    );

    if (!data) return;

    const status = normalizarStatusPresenca(
      row.status ??
      row.statusPresenca ??
      row.status_presenca ??
      row.statusDaPresenca ??
      row.status_da_presenca,
    );

    if (!alunosMap.has(nome)) {
      alunosMap.set(nome, {
        nome,
        presencasPorData: {},
        totalFaltas: 0,
        totalPresencas: 0,
        totalNaoTeveAula: 0,
        totalFeriados: 0,
        percentual: 0,
      });
    }

    const aluno = alunosMap.get(nome);

    if (!aluno) return;

    aluno.presencasPorData[data] = status;
  });

  const alunos = Array.from(alunosMap.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  alunos.forEach((aluno) => {
    let presentes = 0;
    let faltas = 0;
    let naoTeveAula = 0;
    let feriados = 0;

    datas.forEach((data) => {
      const status = aluno.presencasPorData[data] ?? "";

      if (status === "P") presentes += 1;
      if (status === "F") faltas += 1;
      if (status === "NTA") naoTeveAula += 1;
      if (status === "FE") feriados += 1;
    });

    const totalConsiderado = presentes + faltas;

    aluno.totalPresencas = presentes;
    aluno.totalFaltas = faltas;
    aluno.totalNaoTeveAula = naoTeveAula;
    aluno.totalFeriados = feriados;
    aluno.percentual =
      totalConsiderado > 0 ? Math.round((presentes / totalConsiderado) * 100) : 0;
  });

  return {
    datas,
    alunos,
  };
}

function normalizarStatusPresenca(value: unknown): StatusPresencaPdf {
  const status = texto(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  if (
    status === "PRESENTE" ||
    status === "PRESENCA" ||
    status === "COMPARECEU" ||
    status === "P"
  ) {
    return "P";
  }

  if (
    status === "AUSENTE" ||
    status === "FALTA" ||
    status === "FALTOU" ||
    status === "F" ||
    status === "JUSTIFICADO" ||
    status === "JUSTIFICADA" ||
    status === "JUSTIFICATIVA" ||
    status === "J"
  ) {
    return "F";
  }

  if (
    status === "NAO_TEVE_AULA" ||
    status === "NAO TEVE AULA" ||
    status === "NAOTEVEAULA" ||
    status === "SEM_AULA" ||
    status === "SEM AULA" ||
    status === "SEMAULA" ||
    status === "NTA" ||
    status === "NA"
  ) {
    return "NTA";
  }

  if (status === "FERIADO" || status === "FERIADOS" || status === "FE") {
    return "FE";
  }

  return "";
}

function obterInfoCabecalho(rows: Record<string, unknown>[], options: PdfOptions) {
  const first = rows[0] ?? {};

  return {
    atividade:
      texto(first.atividadeNome) ||
      texto(first.nomeAtividade) ||
      texto(first.atividade) ||
      options.reportName ||
      "Presenças",

    turma:
      texto(first.turmaNome) ||
      texto(first.nomeTurma) ||
      texto(first.turma) ||
      "",

    colaboradorResponsavel:
      texto(first.colaborador_responsavel) ||
      texto(first.colaboradorResponsavel) ||
      texto(first.responsavel_turma) ||
      texto(first.responsavelTurma) ||
      texto(first.colaborador_turma) ||
      texto(first.colaboradorTurma) ||
      texto(first.colaborador) ||
      texto(first.professor) ||
      texto(first.instrutor) ||
      "",
  };
}

function obterMesAno(datas: string[]) {
  const referencia = obterReferenciaMes(datas);

  return {
    mes: nomeMes(referencia.mes - 1),
    ano: String(referencia.ano),
  };
}

function obterReferenciaMes(datas: string[]) {
  const primeira = datas[0];

  if (!primeira) {
    const hoje = new Date();

    return {
      ano: hoje.getFullYear(),
      mes: hoje.getMonth() + 1,
    };
  }

  const [ano, mes] = primeira.slice(0, 10).split("-").map(Number);

  return {
    ano: ano || new Date().getFullYear(),
    mes: mes || new Date().getMonth() + 1,
  };
}

function gerarDatasDoMes(ano: number, mes: number): string[] {
  const ultimoDia = new Date(ano, mes, 0).getDate();

  return Array.from({ length: ultimoDia }, (_, index) => {
    const dia = index + 1;

    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  });
}

function normalizarDataPresenca(value: unknown): string {
  const raw = texto(value);

  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return raw.slice(0, 10);
}

function nomeMes(index: number): string {
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return meses[index] ?? "";
}

function formatDiaSemana(dataISO: string): string {
  const [ano, mes, dia] = dataISO.slice(0, 10).split("-").map(Number);

  if (!ano || !mes || !dia) return dataISO;

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

function formatDiaNumeroTabela(dataISO: string): string {
  const [, , dia] = dataISO.slice(0, 10).split("-").map(Number);

  if (!dia) return dataISO;

  return String(dia);
}

function getTenantSlug() {
  const hostname = window.location.hostname;

  if (hostname === "localhost") {
    return "";
  }

  if (!hostname.endsWith(".aurit.com.br")) {
    return "";
  }

  const slug = hostname.replace(".aurit.com.br", "");

  if (!slug || slug.includes(".")) {
    return "";
  }

  if (["www", "admin", "api", "mail", "webmail", "cpanel"].includes(slug)) {
    return "";
  }

  return slug;
}

function normalizarToken(token?: string | null): string {
  if (!token) return "";

  return token
    .trim()
    .replace(/^(Bearer\s+)+/i, "")
    .trim();
}

function getAuthHeaders() {
  const rawToken =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  const token = normalizarToken(rawToken);
  const tenantSlug = getTenantSlug();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
  };
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeEmpresaEndereco(data: any): EmpresaPdfData {
  const endereco = data?.endereco ?? {};

  return {
    ...data,
    cep: data?.cep ?? endereco?.cep ?? null,
    logradouro: data?.logradouro ?? endereco?.logradouro ?? null,
    numero: data?.numero ?? endereco?.numero ?? null,
    complemento: data?.complemento ?? endereco?.complemento ?? null,
    bairro: data?.bairro ?? endereco?.bairro ?? null,
    cidade: data?.cidade ?? endereco?.cidade ?? null,
    estado: data?.estado ?? endereco?.estado ?? null,
  };
}

function normalizeOrganizacaoEndereco(data: any): OrganizacaoPdfData {
  const endereco = data?.endereco ?? {};

  return {
    ...data,
    cep: data?.cep ?? endereco?.cep ?? null,
    logradouro: data?.logradouro ?? endereco?.logradouro ?? null,
    numero: data?.numero ?? endereco?.numero ?? null,
    complemento: data?.complemento ?? endereco?.complemento ?? null,
    bairro: data?.bairro ?? endereco?.bairro ?? null,
    cidade: data?.cidade ?? endereco?.cidade ?? null,
    estado: data?.estado ?? endereco?.estado ?? null,
  };
}

async function buscarEmpresaPrincipal(): Promise<EmpresaPdfData> {
  const local = getConfiguracaoEmpresa();

  try {
    const response = await fetch(`${API_URL}/configuracoes-empresa`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return normalizeEmpresaEndereco(local);
    }

    const data = await parseJsonSafe<any[]>(response);
    const empresa = Array.isArray(data) ? data[0] : null;

    return normalizeEmpresaEndereco(empresa ?? local);
  } catch (error) {
    console.error("Erro ao buscar configuração da empresa para o PDF:", error);
    return normalizeEmpresaEndereco(local);
  }
}

async function buscarOrganizacaoPrincipal(): Promise<OrganizacaoPdfData> {
  try {
    const response = await fetch(`${API_URL}/organizacoes`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return {};
    }

    const data = await parseJsonSafe<OrganizacaoPdfData[]>(response);

    if (!Array.isArray(data) || data.length === 0) {
      return {};
    }

    return normalizeOrganizacaoEndereco(data[0]);
  } catch (error) {
    console.error("Erro ao buscar organização para o PDF:", error);
    return {};
  }
}

function isR2ObjectKey(value: string): boolean {
  return (
    value.startsWith("empresas/") ||
    value.startsWith("logos/") ||
    value.startsWith("configuracoes-empresa/")
  );
}

function normalizeImageUrl(path?: string | null): string | null {
  if (!path) return null;

  const value = path.trim().replace(/^"|"$/g, "");

  if (!value) return null;

  if (
    value.startsWith("data:image/") ||
    value.startsWith("data:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (isR2ObjectKey(value)) {
    return null;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;

  return `${API_URL}${normalized}`;
}

function guessImageFormat(src: string, mime?: string): "PNG" | "JPEG" {
  const lower = src.toLowerCase();
  const m = mime?.toLowerCase() ?? "";

  if (m.includes("jpeg") || m.includes("jpg")) return "JPEG";
  if (m.includes("png")) return "PNG";

  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) {
    return "JPEG";
  }

  if (lower.startsWith("data:image/png")) {
    return "PNG";
  }

  if (lower.includes(".jpg") || lower.includes(".jpeg")) {
    return "JPEG";
  }

  return "PNG";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(blob);
  });
}

async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 420,
  maxHeight = 420,
  quality = 0.86,
): Promise<{ dataUrl: string; format: "PNG" | "JPEG" }> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const ratio = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1,
      );

      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve({
          dataUrl,
          format: guessImageFormat(dataUrl),
        });
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      let hasTransparency = false;

      try {
        const imageData = ctx.getImageData(0, 0, width, height).data;

        for (let i = 3; i < imageData.length; i += 4) {
          if (imageData[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
      } catch {
        hasTransparency = dataUrl.startsWith("data:image/png");
      }

      try {
        if (hasTransparency) {
          resolve({
            dataUrl: canvas.toDataURL("image/png"),
            format: "PNG",
          });
          return;
        }

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          format: "JPEG",
        });
      } catch {
        resolve({
          dataUrl,
          format: guessImageFormat(dataUrl),
        });
      }
    };

    image.onerror = () =>
      resolve({
        dataUrl,
        format: guessImageFormat(dataUrl),
      });

    image.src = dataUrl;
  });
}

async function loadImageAsDataUrl(src: string): Promise<LoadedLogo> {
  try {
    if (src.startsWith("data:")) {
      const compressed = await compressImageDataUrl(src);

      return {
        dataUrl: compressed.dataUrl,
        format: compressed.format,
      };
    }

    const response = await fetch(src, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error("Erro ao carregar logo para PDF:", response.status);
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const compressed = await compressImageDataUrl(dataUrl);

    return {
      dataUrl: compressed.dataUrl,
      format: compressed.format,
    };
  } catch (error) {
    console.error("Erro ao converter logo para PDF:", error);
    return null;
  }
}

function inferImageMimeFromBase64(base64: string): string {
  const clean = base64.trim();

  if (clean.startsWith("/9j/")) {
    return "image/jpeg";
  }

  if (clean.startsWith("iVBOR")) {
    return "image/png";
  }

  if (clean.startsWith("UklGR")) {
    return "image/webp";
  }

  return "image/png";
}

function normalizeBase64Image(value?: string | null): string {
  if (!value) return "";

  const clean = value.trim().replace(/^"|"$/g, "");

  if (!clean) return "";

  if (clean.startsWith("data:image/")) {
    return clean;
  }

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  const mime = inferImageMimeFromBase64(clean);

  return `data:${mime};base64,${clean}`;
}

function extractLogoFromJson(data: unknown): string {
  if (!data) return "";

  if (typeof data === "string") {
    return data.trim();
  }

  if (typeof data !== "object") {
    return "";
  }

  const record = data as Record<string, unknown>;

  const possibleKeys = [
    "base64",
    "logoBase64",
    "logo_base64",
    "dataUrl",
    "dataURL",
    "url",
    "logoUrl",
    "logo_url",
    "caminhoLogo",
    "caminho_logo",
    "logo",
    "imagem",
    "imagemBase64",
    "content",
    "conteudo",
  ];

  for (const key of possibleKeys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

async function responseImageToLoadedLogo(
  response: Response,
  source = "logo",
): Promise<LoadedLogo> {
  try {
    const blob = await response.blob();

    if (!blob.size) {
      console.error(`Resposta de ${source} veio vazia.`);
      return null;
    }

    const dataUrl = await blobToDataUrl(blob);
    const compressed = await compressImageDataUrl(dataUrl);

    return {
      dataUrl: compressed.dataUrl,
      format: compressed.format,
    };
  } catch (error) {
    console.error(`Erro ao converter resposta de ${source} para imagem:`, error);
    return null;
  }
}

async function buscarLogoBase64Empresa(
  empresa: EmpresaPdfData,
): Promise<LoadedLogo> {
  if (!empresa?.id) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/configuracoes-empresa/${empresa.id}/logo-base64`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      console.error("Erro ao buscar logo em base64:", response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      contentType.startsWith("image/") ||
      contentType.includes("octet-stream")
    ) {
      return await responseImageToLoadedLogo(response, "logo-base64");
    }

    let rawLogo = "";

    if (contentType.includes("application/json")) {
      const data = await parseJsonSafe<unknown>(response);
      rawLogo = extractLogoFromJson(data);
    } else {
      rawLogo = (await response.text()).trim();
    }

    const normalizedLogo = normalizeBase64Image(rawLogo);

    if (!normalizedLogo) {
      console.error("Logo em base64 vazia.");
      return null;
    }

    if (normalizedLogo.startsWith("http://") || normalizedLogo.startsWith("https://")) {
      return await loadImageAsDataUrl(normalizedLogo);
    }

    if (!normalizedLogo.startsWith("data:image/")) {
      console.error("Logo em base64 inválida.");
      return null;
    }

    const compressed = await compressImageDataUrl(normalizedLogo);

    return {
      dataUrl: compressed.dataUrl,
      format: compressed.format,
    };
  } catch (error) {
    console.error("Erro ao carregar logo em base64 para o PDF:", error);
    return null;
  }
}

async function buscarLogoUrlEmpresa(
  empresa: EmpresaPdfData,
): Promise<LoadedLogo> {
  if (!empresa?.id) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/configuracoes-empresa/${empresa.id}/logo`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      console.error("Erro ao buscar URL temporária da logo:", response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      contentType.startsWith("image/") ||
      contentType.includes("octet-stream")
    ) {
      return await responseImageToLoadedLogo(response, "logo");
    }

    let logoUrl = "";

    if (contentType.includes("application/json")) {
      const data = await parseJsonSafe<unknown>(response);
      logoUrl = extractLogoFromJson(data);
    } else {
      logoUrl = (await response.text()).replace(/^"|"$/g, "").trim();
    }

    if (!logoUrl) {
      return null;
    }

    const cleanLogoUrl = logoUrl.trim().replace(/^"|"$/g, "");

    if (isR2ObjectKey(cleanLogoUrl)) {
      console.error(
        "O backend retornou uma chave interna do R2 em vez de uma URL temporária ou base64:",
        cleanLogoUrl,
      );
      return null;
    }

    const normalizedUrl = normalizeImageUrl(cleanLogoUrl);

    if (!normalizedUrl) {
      return null;
    }

    return await loadImageAsDataUrl(normalizedUrl);
  } catch (error) {
    console.error("Erro ao carregar URL temporária da logo para o PDF:", error);
    return null;
  }
}

async function resolvePdfContext(): Promise<PdfContext> {
  const empresa = await buscarEmpresaPrincipal();
  const organizacao = await buscarOrganizacaoPrincipal();

  let logo: LoadedLogo = null;

  const caminhoLogo =
    empresa.caminhoLogo ||
    empresa.caminho_logo ||
    empresa.logo ||
    empresa.logoUrl ||
    null;

  if (empresa.id) {
    logo = await buscarLogoBase64Empresa(empresa);
  }

  if (!logo && empresa.id) {
    logo = await buscarLogoUrlEmpresa(empresa);
  }

  if (!logo) {
    const logoUrl = normalizeImageUrl(caminhoLogo);
    logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  }

  return {
    empresa,
    organizacao,
    logo,
  };
}

function safeText(value?: string | number | null): string {
  if (value === null || value === undefined) return "—";

  const text = String(value).trim();

  return text || "—";
}

function maskCNPJ(value?: string | number | null): string {
  if (value === null || value === undefined) return "—";

  const digits = String(value).replace(/\D/g, "").slice(0, 14);

  if (!digits) return "—";

  if (digits.length !== 14) {
    return String(value).trim() || "—";
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCPF(value?: string | number | null): string {
  if (value === null || value === undefined) return "—";

  const digits = String(value).replace(/\D/g, "").slice(0, 11);

  if (!digits) return "—";

  if (digits.length !== 11) {
    return String(value).trim() || "—";
  }

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCpfCnpj(value?: string | number | null): string {
  if (value === null || value === undefined) return "—";

  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 14) return maskCNPJ(digits);
  if (digits.length === 11) return maskCPF(digits);

  return String(value).trim() || "—";
}

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatValueByLabel(label: string, value: string): string {
  const normalizedLabel = normalizeLabel(label);

  if (
    normalizedLabel.includes("cpf/cnpj") ||
    normalizedLabel.includes("cnpj") ||
    normalizedLabel.includes("documento")
  ) {
    return maskCpfCnpj(value);
  }

  if (normalizedLabel.includes("cpf")) {
    return maskCPF(value);
  }

  return value;
}

function getNomeInstitucional(ctx: PdfContext) {
  return (
    ctx.organizacao.razaoSocial ||
    ctx.organizacao.razao_social ||
    ctx.organizacao.nomeFantasia ||
    ctx.organizacao.nome_fantasia ||
    ctx.empresa.nomeEmpresa ||
    "—"
  );
}

function getDocumentoInstitucional(ctx: PdfContext) {
  return maskCpfCnpj(
    ctx.organizacao.cnpj || ctx.empresa.documentoIdentificacao || "—",
  );
}

function getTelefoneInstitucional(ctx: PdfContext) {
  return (
    ctx.organizacao.telefoneInstitucional ||
    ctx.organizacao.telefone_institucional ||
    ctx.empresa.telefoneContato ||
    ""
  );
}

function getEnderecoInstitucional(ctx: PdfContext) {
  const o = ctx.organizacao;

  return [o.logradouro, o.numero ? `nº ${o.numero}` : "", o.bairro]
    .filter(Boolean)
    .join(", ");
}

function getCidadeEstadoCepInstitucional(ctx: PdfContext) {
  const o = ctx.organizacao;

  return [
    [o.cidade, o.estado].filter(Boolean).join(" - "),
    o.cep ? `CEP ${o.cep}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function getPageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

function getPageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function getContentWidth(doc: jsPDF): number {
  return getPageWidth(doc) - MARGIN_LEFT - MARGIN_RIGHT;
}

function getBodyEndY(doc: jsPDF): number {
  return getPageHeight(doc) - FOOTER_HEIGHT - 6;
}

function drawImageContained(
  doc: jsPDF,
  dataUrl: string,
  format: "PNG" | "JPEG",
  x: number,
  y: number,
  boxW: number,
  boxH: number,
) {
  try {
    const props = doc.getImageProperties(dataUrl);

    const originalW = props.width || boxW;
    const originalH = props.height || boxH;
    const ratio = Math.min(boxW / originalW, boxH / originalH);

    const drawW = originalW * ratio;
    const drawH = originalH * ratio;
    const drawX = x + (boxW - drawW) / 2;
    const drawY = y + (boxH - drawH) / 2;

    doc.addImage(dataUrl, format, drawX, drawY, drawW, drawH);
  } catch (error) {
    console.error("Erro ao inserir imagem preservando proporção:", error);
    doc.addImage(dataUrl, format, x, y, boxW, boxH);
  }
}

function drawHeader(doc: jsPDF, opts: HeaderOptions, ctx: PdfContext) {
  const pageWidth = getPageWidth(doc);

  const centerLeft = MARGIN_LEFT + LOGO_W + HEADER_GAP;
  const centerRight = pageWidth - MARGIN_RIGHT - ORG_W - HEADER_GAP;
  const centerX = (centerLeft + centerRight) / 2;
  const centerW = centerRight - centerLeft;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");

  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, HEADER_HEIGHT, pageWidth - MARGIN_RIGHT, HEADER_HEIGHT);

  if (ctx.logo?.dataUrl) {
    drawImageContained(
      doc,
      ctx.logo.dataUrl,
      ctx.logo.format,
      MARGIN_LEFT,
      8,
      LOGO_W,
      LOGO_H,
    );
  } else {
    drawLogoPlaceholder(doc);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(30);

  const titleLines = doc.splitTextToSize(opts.title.toUpperCase(), centerW);
  const tl = titleLines.slice(0, 2);
  const titleY = tl.length > 1 ? 13 : 16;

  doc.text(tl, centerX, titleY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Documento nº: ${opts.documentNumber}`, centerX, titleY + 7, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(60);

  const nomeOrganizacao = safeText(getNomeInstitucional(ctx));
  const orgLines = doc.splitTextToSize(nomeOrganizacao, ORG_W);

  doc.text(orgLines.slice(0, 2), pageWidth - MARGIN_RIGHT, 11, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(90);

  const cnpj = getDocumentoInstitucional(ctx);

  if (cnpj && cnpj !== "—") {
    doc.text(`CNPJ: ${cnpj}`, pageWidth - MARGIN_RIGHT, 21, {
      align: "right",
    });
  }
}

function drawLogoPlaceholder(doc: jsPDF) {
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_LEFT, 8, LOGO_W, LOGO_H);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("LOGO", MARGIN_LEFT + LOGO_W / 2, 20, { align: "center" });
}

function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  ctx: PdfContext,
) {
  const pageWidth = getPageWidth(doc);
  const pageHeight = getPageHeight(doc);
  const y = pageHeight - FOOTER_HEIGHT;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, y - 2, pageWidth, FOOTER_HEIGHT + 2, "F");

  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, pageWidth - MARGIN_RIGHT, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(60);

  const nome = safeText(getNomeInstitucional(ctx));
  const documento = safeText(getDocumentoInstitucional(ctx));

  doc.text(`${nome} - CNPJ: ${documento}`, pageWidth / 2, y + 5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);

  const endereco = getEnderecoInstitucional(ctx);

  if (endereco) {
    doc.text(endereco, pageWidth / 2, y + 9.5, { align: "center" });
  }

  const cidadeEstadoCep = getCidadeEstadoCepInstitucional(ctx);

  if (cidadeEstadoCep) {
    doc.text(cidadeEstadoCep, pageWidth / 2, y + 13.5, {
      align: "center",
    });
  }

  const telefone = getTelefoneInstitucional(ctx);

  if (telefone) {
    doc.text(`Tel: ${telefone}`, pageWidth / 2, y + 17.5, {
      align: "center",
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    pageWidth - MARGIN_RIGHT,
    pageHeight - 6,
    {
      align: "right",
    },
  );
}

function ensureSpace(
  doc: jsPDF,
  cursor: number,
  needed: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  if (cursor + needed > getBodyEndY(doc)) {
    doc.addPage();
    drawHeader(doc, opts, ctx);
    return BODY_START_Y;
  }

  return cursor;
}

function drawSectionTitle(
  doc: jsPDF,
  title: string,
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 14, opts, ctx);

  const pageWidth = getPageWidth(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(title.toUpperCase(), MARGIN_LEFT, cursor + 1);

  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, cursor + 3, pageWidth - MARGIN_RIGHT, cursor + 3);

  return cursor + 9;
}

function drawGridFields(
  doc: jsPDF,
  fields: { label: string; value: string | number | null | undefined }[],
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  const validFields = fields
    .filter(
      (f) =>
        f.value !== undefined &&
        f.value !== null &&
        String(f.value).trim() !== "",
    )
    .map((f) => ({
      label: f.label,
      value: String(f.value),
    }));

  if (validFields.length === 0) return cursor;

  const contentWidth = getContentWidth(doc);

  const PAD_X = 5;
  const PAD_Y = 5;
  const COL_W = (contentWidth - PAD_X * 2) / 2;
  const COL_GAP = 4;
  const innerW = COL_W - COL_GAP / 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const wrapped = validFields.map((f) => {
    const labelText = `${f.label}: `;

    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(labelText);

    doc.setFont("helvetica", "normal");

    const formattedValue = formatValueByLabel(f.label, f.value);
    const valueLines = doc.splitTextToSize(formattedValue, innerW - labelW);

    return {
      ...f,
      value: formattedValue,
      labelW,
      valueLines,
    };
  });

  const rows: typeof wrapped[] = [];

  for (let i = 0; i < wrapped.length; i += 2) {
    rows.push(wrapped.slice(i, i + 2));
  }

  const rowHeights = rows.map(
    (r) => Math.max(...r.map((c) => c.valueLines.length)) * 4.6 + 1.5,
  );

  const totalH = rowHeights.reduce((a, b) => a + b, 0) + PAD_Y * 2;

  cursor = ensureSpace(doc, cursor, totalH + 2, opts, ctx);

  doc.setFillColor(245, 246, 248);
  doc.setDrawColor(225);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_LEFT, cursor, contentWidth, totalH, 1.5, 1.5, "FD");

  let y = cursor + PAD_Y + 3;

  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = MARGIN_LEFT + PAD_X + ci * COL_W;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60);

      const labelText = `${cell.label}: `;
      doc.text(labelText, x, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(35);
      doc.text(cell.valueLines, x + cell.labelW, y);
    });

    y += rowHeights[ri];
  });

  return cursor + totalH + 3;
}

function texto(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value).trim();
}

export async function exportRelatorioGeralPdf(options: RelatorioGeralPdfOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const ctx = await resolvePdfContext();

  const reportName = options.reportName || "Relatório Geral";

  const headerOptions: HeaderOptions = {
    title: formatReportTitle(reportName),
    documentNumber: buildRelatorioDocumentNumber(reportName),
  };

  drawHeader(doc, headerOptions, ctx);

  let cursor = BODY_START_Y;

  const totalIndicadores = options.grupos.reduce(
    (total, grupo) => total + grupo.indicadores.length,
    0,
  );

  cursor = drawSectionTitle(
    doc,
    "Identificação do Relatório",
    cursor,
    headerOptions,
    ctx,
  );

  cursor = drawGridFields(
    doc,
    [
      {
        label: "Organização",
        value: options.nomeEmpresa || getNomeInstitucional(ctx),
      },
      {
        label: "Relatório",
        value: reportName,
      },
      {
        label: "Total de grupos",
        value: options.grupos.length,
      },
      {
        label: "Total de indicadores",
        value: totalIndicadores,
      },
      {
        label: "Data de geração",
        value: options.dataGeracao || new Date().toLocaleDateString("pt-BR"),
      },
    ],
    cursor,
    headerOptions,
    ctx,
  );

  cursor += 3;

  cursor = drawSectionTitle(
    doc,
    "Visão Consolidada da Organização",
    cursor,
    headerOptions,
    ctx,
  );

  cursor = drawRelatorioGeralTexto(
    doc,
    "Este documento reúne os principais indicadores institucionais, operacionais, financeiros, documentais e de prestação de contas cadastrados na plataforma.",
    cursor,
    headerOptions,
    ctx,
  );

  cursor += 2;

  for (const grupo of options.grupos) {
    cursor = drawRelatorioGeralGrupo(
      doc,
      grupo,
      cursor,
      headerOptions,
      ctx,
    );
  }

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, total, ctx);
  }

  doc.save(buildFileName(reportName, "pdf"));
}

function drawRelatorioGeralTexto(
  doc: jsPDF,
  text: string,
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  const contentWidth = getContentWidth(doc);
  const lines = doc.splitTextToSize(text, contentWidth);

  const boxHeight = lines.length * 4.6 + 8;

  cursor = ensureSpace(doc, cursor, boxHeight + 3, opts, ctx);

  doc.setFillColor(252, 253, 253);
  doc.setDrawColor(...CINZA_BORDA);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_LEFT, cursor, contentWidth, boxHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(...CINZA_TEXTO);
  doc.text(lines, MARGIN_LEFT + 5, cursor + 6.5);

  return cursor + boxHeight + 4;
}

function drawRelatorioGeralGrupo(
  doc: jsPDF,
  grupo: RelatorioGeralPdfGrupo,
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  if (!grupo.indicadores.length) return cursor;

  cursor = ensureSpace(doc, cursor, 36, opts, ctx);

  cursor = drawRelatorioGeralTituloGrupo(doc, grupo.titulo, cursor, opts, ctx);

  const contentWidth = getContentWidth(doc);
  const gap = 5;
  const cardsPerRow = 2;
  const cardW = (contentWidth - gap) / cardsPerRow;
  const cardH = 24;
  const rowGap = 5;

  grupo.indicadores.forEach((indicador, index) => {
    const col = index % cardsPerRow;

    if (col === 0) {
      const before = cursor;

      cursor = ensureSpace(doc, cursor, cardH + rowGap, opts, ctx);

      if (cursor < before) {
        cursor = drawRelatorioGeralTituloGrupo(
          doc,
          `${grupo.titulo} — continuação`,
          cursor,
          opts,
          ctx,
        );
      }
    }

    const x = MARGIN_LEFT + col * (cardW + gap);

    drawRelatorioGeralCard(
      doc,
      x,
      cursor,
      cardW,
      cardH,
      indicador.label,
      formatPdfValue(indicador.valor, indicador.chave),
    );

    if (col === cardsPerRow - 1 || index === grupo.indicadores.length - 1) {
      cursor += cardH + rowGap;
    }
  });

  return cursor + 2;
}

function drawRelatorioGeralTituloGrupo(
  doc: jsPDF,
  title: string,
  cursor: number,
  opts: HeaderOptions,
  ctx: PdfContext,
) {
  const contentWidth = getContentWidth(doc);
  const titleHeight = 10;

  cursor = ensureSpace(doc, cursor, titleHeight + 4, opts, ctx);

  doc.setFillColor(...CINZA_HEAD);
  doc.setDrawColor(...CINZA_BORDA);
  doc.setLineWidth(0.2);
  doc.roundedRect(
    MARGIN_LEFT,
    cursor,
    contentWidth,
    titleHeight,
    1.5,
    1.5,
    "FD",
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...CINZA_HEAD_TEXTO);
  doc.text(title.toUpperCase(), MARGIN_LEFT + 4, cursor + 6.6);

  return cursor + titleHeight + 4;
}

function drawRelatorioGeralCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...CINZA_BORDA);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 1.8, 1.8, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...CINZA_TEXTO);

  const labelLines = doc.splitTextToSize(label, width - 8);
  doc.text(labelLines.slice(0, 2), x + 4, y + 5.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.8);
  doc.setTextColor(35, 45, 45);

  const valueText = value && String(value).trim() ? String(value) : "—";
  const valueLines = doc.splitTextToSize(valueText, width - 8);

  doc.text(valueLines.slice(0, 2), x + 4, y + 17);
}

function formatPdfValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (typeof value === "number") {
    if (isMoneyKey(key)) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }

    return new Intl.NumberFormat("pt-BR").format(value);
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [, month, day] = value.slice(0, 10).split("-");

      return `${day}/${month}/${value.slice(0, 4)}`;
    }

    if (isMoneyKey(key)) {
      const parsed = Number(value.replace(",", "."));

      if (!Number.isNaN(parsed)) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(parsed);
      }
    }

    return value;
  }

  return String(value);
}

function isMoneyKey(key?: string) {
  if (!key) return false;

  const normalized = key.toLowerCase();

  return (
    normalized.includes("valor") ||
    normalized.includes("saldo") ||
    normalized.includes("entrada") ||
    normalized.includes("saida") ||
    normalized.includes("planejado") ||
    normalized.includes("pendente")
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export async function exportIndicadoresSociodemograficosPdf(
  data: IndicadoresSociodemograficosPdfOptions,
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const ctx = await resolvePdfContext();

  const headerOptions: HeaderOptions = {
    title: formatReportTitle("Indicadores Sociodemográficos"),
    documentNumber: buildRelatorioDocumentNumber(
      "Indicadores Sociodemográficos",
    ),
  };

  drawHeader(doc, headerOptions, ctx);

  let cursor = BODY_START_Y;

  cursor = drawSectionTitle(
    doc,
    "Identificação do Relatório",
    cursor,
    headerOptions,
    ctx,
  );

  cursor = drawGridFields(
    doc,
    [
      {
        label: "Organização",
        value: getNomeInstitucional(ctx),
      },
      {
        label: "Relatório",
        value: "Indicadores Sociodemográficos",
      },
      {
        label: "Total de participantes",
        value: data.total,
      },
      {
        label: "Data de geração",
        value: new Date().toLocaleDateString("pt-BR"),
      },
      {
        label: "Ano",
        value: data.filtros.ano,
      },
      {
        label: "Atividade",
        value: data.filtros.atividade,
      },
      {
        label: "Turma",
        value: data.filtros.turma,
      },
      {
        label: "Status da matrícula",
        value: data.filtros.status,
      },
    ],
    cursor,
    headerOptions,
    ctx,
  );

  cursor += 3;

  cursor = drawSectionTitle(
    doc,
    "Registros do Relatório",
    cursor,
    headerOptions,
    ctx,
  );

  for (const grupo of data.indicadores) {
    cursor = ensureSpace(doc, cursor, 38, headerOptions, ctx);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(35, 45, 45);
    doc.text(grupo.title, MARGIN_LEFT, cursor);

    autoTable(doc, {
      startY: cursor + 4,
      head: [["Categoria", "Quantidade", "Percentual"]],
      body: grupo.itens.map((item) => [
        item.label,
        String(item.count),
        `${Number(item.percentual ?? 0).toFixed(2)}%`,
      ]),
      theme: "grid",
      margin: {
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
        bottom: FOOTER_HEIGHT + 8,
      },
      styles: {
        font: "helvetica",
        fontSize: 7.1,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
        lineWidth: 0.12,
        lineColor: CINZA_BORDA,
        textColor: [35, 45, 45],
        minCellHeight: 8,
      },
      headStyles: {
        fillColor: CINZA_HEAD,
        textColor: CINZA_HEAD_TEXTO,
        fontStyle: "bold",
        fontSize: 6.8,
        cellPadding: 1.8,
        minCellHeight: 8,
        valign: "middle",
        halign: "left",
        lineColor: CINZA_BORDA,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },
      columnStyles: {
        0: {
          cellWidth: 120,
          fontStyle: "bold",
          halign: "left",
        },
        1: {
          cellWidth: 40,
          halign: "center",
        },
        2: {
          cellWidth: 40,
          halign: "center",
        },
      },
      didDrawPage: () => {
        drawHeader(doc, headerOptions, ctx);
      },
    });

    cursor = (doc as any).lastAutoTable.finalY + 8;
  }

  const totalPaginas = doc.getNumberOfPages();

  for (let i = 1; i <= totalPaginas; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, totalPaginas, ctx);
  }

  doc.save(buildFileName("Indicadores Sociodemográficos", "pdf"));
}

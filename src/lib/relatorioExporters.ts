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
  const isPresencas =
    sanitizeFileBase(options.reportName).includes("presenca") ||
    cols.some((c) => c.key === "status_presenca") ||
    cols.some((c) => c.key === "statusPresenca") ||
    cols.some((c) => c.key === "participante");

  if (isPresencas) {
    await exportPresencasPdf(rows as Record<string, unknown>[], options);
    return;
  }

  exportRelatorioTabelaPdf(rows, cols, options);
}

function exportRelatorioTabelaPdf<T>(
  rows: T[],
  cols: RelatorioColumn<T>[],
  options: PdfOptions,
) {
  const orientation = cols.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...VERDE_RELATORIO);
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(options.organizacaoNome ?? "Organização", 40, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(options.reportName, 40, 62);

  doc.setFontSize(8.5);
  doc.text(
    options.dataGeracao
      ? `Data de geração: ${options.dataGeracao}`
      : `Data de geração: ${new Date().toLocaleDateString("pt-BR")}`,
    40,
    80,
  );

  doc.text("Sistema Aurit", pageWidth - 40, 80, { align: "right" });

  doc.setTextColor(0);

  let cursorY = 118;

  if (options.indicadores?.length) {
    doc.setFontSize(9);

    const total = Math.min(options.indicadores.length, 8);
    const columns = 4;
    const gap = 8;
    const blockW = (pageWidth - 80 - gap * (columns - 1)) / columns;

    options.indicadores.slice(0, total).forEach((ind, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = 40 + col * (blockW + gap);
      const y = cursorY + row * 42;

      doc.setFillColor(248, 250, 249);
      doc.setDrawColor(224, 229, 226);
      doc.roundedRect(x, y, blockW, 34, 5, 5, "FD");

      doc.setFont("helvetica", "normal");
      doc.setTextColor(105);
      doc.text(ind.label.slice(0, 30), x + 9, y + 13);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...VERDE_RELATORIO);
      doc.text(ind.valor.slice(0, 22), x + 9, y + 27);
    });

    const linhas = Math.ceil(total / columns);
    cursorY += linhas * 42 + 12;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [cols.map((c) => c.label)],
    body: rows.map((r) => cols.map((c) => formatCell(r, c))),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: VERDE_RELATORIO,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 249],
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = doc.getCurrentPageInfo().pageNumber;
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        "Aurit — Gestão para organizações culturais e sociais",
        40,
        pageHeight - 20,
      );
      doc.text(
        `Página ${current} de ${pageCount}`,
        pageWidth - 40,
        pageHeight - 20,
        {
          align: "right",
        },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(buildFileName(options.reportName, "pdf"));
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

  drawHeader(doc, headerOptions, ctx);

  const mapa = montarMapaPresencas(rows);
  const mesAno = obterMesAno(mapa.datas);
  const info = obterInfoCabecalho(rows, options);

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
        label: "Total de participantes",
        value: mapa.alunos.length,
      },
    ],
    cursor,
    headerOptions,
    ctx,
  );

  cursor += 3;

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

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, total, ctx);
  }

  doc.save(buildFileName(options.reportName || "Presenças", "pdf"));
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
        .map((row) => normalizarDataPresenca(row.data_presenca ?? row.dataPresenca))
        .filter(Boolean),
    ),
  ).sort();

  const referencia = obterReferenciaMes(datasRegistradas);
  const datas = gerarDatasDoMes(referencia.ano, referencia.mes);

  const alunosMap = new Map<string, AlunoPresencaPdf>();

  rows.forEach((row) => {
    const nome = texto(row.participante) || "Participante não informado";
    const data = normalizarDataPresenca(row.data_presenca ?? row.dataPresenca);

    if (!data) return;

    const status = normalizarStatusPresenca(
      row.status_presenca ?? row.statusPresenca,
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
    status === "F"
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
    atividade: texto(first.atividade) || options.reportName || "Presenças",
    turma: texto(first.turma) || "",
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

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function normalizeImageUrl(path?: string | null): string | null {
  if (!path) return null;

  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

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

async function resolvePdfContext(): Promise<PdfContext> {
  const empresa = await buscarEmpresaPrincipal();
  const organizacao = await buscarOrganizacaoPrincipal();

  const caminhoLogo =
    empresa.caminhoLogo ||
    empresa.caminho_logo ||
    empresa.logo ||
    empresa.logoUrl ||
    null;

  const logoUrl = normalizeImageUrl(caminhoLogo);
  const logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;

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

export function exportRelatorioGeralPdf(options: RelatorioGeralPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margem = 42;
  const verde = [24, 83, 75] as const;
  const verdeClaro = [232, 242, 238] as const;
  const cinzaTexto = [94, 105, 101] as const;
  const borda = [221, 228, 225] as const;

  doc.setFillColor(...verde);
  doc.rect(0, 0, pageWidth, 132, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(options.reportName, margem, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(options.nomeEmpresa || "Organização", margem, 72);

  doc.setFontSize(9);
  doc.text(
    options.dataGeracao
      ? `Gerado em ${options.dataGeracao}`
      : `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    margem,
    91,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Sistema Aurit", pageWidth - margem, 91, { align: "right" });

  doc.setTextColor(0);

  let y = 158;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...verde);
  doc.text("Visão consolidada da organização", margem, y);

  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...cinzaTexto);

  const intro =
    "Este documento reúne os principais indicadores institucionais, operacionais, financeiros, documentais e de prestação de contas cadastrados na plataforma.";

  const introLines = doc.splitTextToSize(intro, pageWidth - margem * 2);
  doc.text(introLines, margem, y);

  y += introLines.length * 13 + 18;

  options.grupos.forEach((grupo, groupIndex) => {
    if (y > pageHeight - 140) {
      addFooter(doc);
      doc.addPage();
      y = 52;
    }

    doc.setFillColor(...verdeClaro);
    doc.setDrawColor(...borda);
    doc.roundedRect(margem, y, pageWidth - margem * 2, 34, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...verde);
    doc.text(grupo.titulo, margem + 12, y + 22);

    y += 48;

    const cardsPerRow = 2;
    const gap = 12;
    const cardW = (pageWidth - margem * 2 - gap) / cardsPerRow;
    const cardH = 58;

    grupo.indicadores.forEach((indicador, index) => {
      if (y > pageHeight - 110) {
        addFooter(doc);
        doc.addPage();
        y = 52;
      }

      const col = index % cardsPerRow;
      const x = margem + col * (cardW + gap);

      if (index > 0 && col === 0) {
        y += cardH + gap;
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...borda);
      doc.roundedRect(x, y, cardW, cardH, 7, 7, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...cinzaTexto);

      const labelLines = doc.splitTextToSize(indicador.label, cardW - 22);
      doc.text(labelLines.slice(0, 2), x + 11, y + 17);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(29, 36, 33);

      const valor = formatPdfValue(indicador.valor, indicador.chave);
      const valorLines = doc.splitTextToSize(valor, cardW - 22);
      doc.text(valorLines.slice(0, 1), x + 11, y + 44);
    });

    y += cardH + 26;

    if (groupIndex < options.grupos.length - 1) {
      doc.setDrawColor(235, 238, 237);
      doc.line(margem, y - 8, pageWidth - margem, y - 8);
    }
  });

  addFooter(doc);

  doc.save(buildFileName(options.reportName, "pdf"));

  function addFooter(documento: jsPDF) {
    const total = documento.getNumberOfPages();

    for (let i = 1; i <= total; i += 1) {
      documento.setPage(i);

      documento.setDrawColor(229, 234, 232);
      documento.line(margem, pageHeight - 42, pageWidth - margem, pageHeight - 42);

      documento.setFont("helvetica", "normal");
      documento.setFontSize(8);
      documento.setTextColor(120);

      documento.text(
        "Aurit — Relatório institucional gerado automaticamente",
        margem,
        pageHeight - 24,
      );

      documento.text(
        `Página ${i} de ${total}`,
        pageWidth - margem,
        pageHeight - 24,
        {
          align: "right",
        },
      );
    }
  }
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
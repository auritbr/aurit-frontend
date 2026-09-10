import { apiFetchResponse } from "@/lib/api";

function sanitizeFilename(value: string) {
  return [...value.replace(/[\\/:*?"<>|]/g, "-")]
    .map((char) => (char.charCodeAt(0) < 32 ? "-" : char))
    .join("")
    .trim();
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return "";

  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return sanitizeFilename(
        decodeURIComponent(encoded.replace(/^"|"$/g, "")),
      );
    } catch {
      // Tenta o filename simples abaixo quando o valor codificado for inválido.
    }
  }

  const plain = value.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return sanitizeFilename((plain?.[1] ?? plain?.[2] ?? "").trim());
}

async function downloadPdf(
  endpoint: string,
  fallbackFilename: string,
  options: RequestInit,
) {
  const response = await apiFetchResponse(endpoint, {
    headers: { Accept: "application/pdf" },
    cache: "no-store",
    ...options,
  });

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("O servidor não retornou um arquivo PDF válido.");
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error("O relatório retornado está vazio.");

  const filename =
    filenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
    ) ||
    sanitizeFilename(fallbackFilename) ||
    "relatorio.pdf";
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.toLowerCase().endsWith(".pdf")
      ? filename
      : `${filename}.pdf`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function downloadIndividualReport(
  endpoint: string,
  fallbackFilename = "relatorio.pdf",
) {
  return downloadPdf(endpoint, fallbackFilename, { method: "GET" });
}

export const downloadDeclaracaoCargoDiretoria = (id: string | number) =>
  downloadIndividualReport(
    `/diretorias/${id}/declaracao-cargo`,
    `declaracao-cargo-diretoria-${id}.pdf`,
  );

export const downloadDeclaracaoParticipacao = (id: string | number) =>
  downloadIndividualReport(
    `/participantes/${id}/declaracao-participacao`,
    `declaracao-participacao-${id}.pdf`,
  );

export async function downloadFilteredPresenceReport(
  filters: Record<string, unknown>,
) {
  return downloadPdf("/presencas/relatorio", "listas-presenca.pdf", {
    method: "POST",
    headers: {
      Accept: "application/pdf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters),
  });
}

/** Somente o id é necessário para solicitar o PDF individual. */
type ReportRecord = { id: string | number };

function downloadReportForRecord<T extends ReportRecord>(
  resource: string,
  record: T,
  filename: string,
) {
  return downloadIndividualReport(
    `/${resource}/${record.id}/relatorio`,
    filename,
  );
}

export const downloadPatrimonioReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("patrimonios", record, `patrimonio-${record.id}.pdf`);
export const downloadPrestacaoContasReport = <T extends ReportRecord>(
  record: T,
) =>
  downloadReportForRecord(
    "prestacoes-contas",
    record,
    `prestacao-contas-${record.id}.pdf`,
  );
export const downloadAtividadeReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("atividades", record, `atividade-${record.id}.pdf`);
export const downloadOrganizacaoReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord(
    "organizacoes",
    record,
    `organizacao-${record.id}.pdf`,
  );
export const downloadEmprestimoReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("emprestimos", record, `emprestimo-${record.id}.pdf`);
export const downloadAgenteReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("agentes", record, `agente-${record.id}.pdf`);
export const downloadIntegranteReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("integrantes", record, `integrante-${record.id}.pdf`);
export const downloadResultadoPropostaReport = <T extends ReportRecord>(
  record: T,
) =>
  downloadReportForRecord(
    "resultados-propostas",
    record,
    `resultado-proposta-${record.id}.pdf`,
  );
export const downloadPlanejamentoFinanceiroReport = <T extends ReportRecord>(
  record: T,
) =>
  downloadReportForRecord(
    "planejamentos-financeiros",
    record,
    `planejamento-financeiro-${record.id}.pdf`,
  );
export const downloadDiretoriaReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("diretorias", record, `diretoria-${record.id}.pdf`);
export const downloadCronogramaReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("cronogramas", record, `cronograma-${record.id}.pdf`);
export const downloadPrestacaoMetaReport = <T extends ReportRecord>(
  record: T,
) =>
  downloadReportForRecord(
    "prestacao-metas",
    record,
    `prestacao-meta-${record.id}.pdf`,
  );
export const downloadAcaoDivulgacaoReport = <T extends ReportRecord>(
  record: T,
) =>
  downloadReportForRecord(
    "acoes-divulgacao",
    record,
    `acao-divulgacao-${record.id}.pdf`,
  );
export const downloadFinanceiroReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("financeiros", record, `financeiro-${record.id}.pdf`);
export const downloadProjetoReport = <T extends ReportRecord>(record: T) =>
  downloadReportForRecord("projetos", record, `projeto-${record.id}.pdf`);

import jsPDF from "jspdf";
import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type PdfTextValue = string | number | null | undefined;

interface EmpresaLogoDTO {
  id?: number | string;
  caminhoLogo?: string | null;
}

export interface ProjetoPdfData {
  id?: string;
  nomeProjeto?: string;
  descricao?: string;
  objetivoGeral?: string;
  publicoAlvo?: string;
  acoesAcessibilidade?: string;
  localExecucao?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  areaAtuacao?: string;
  origemProjeto?: string;
  organizacao?: string;
  colaboradores?: string[];
  objetivosEspecificos?: string[];
}

export interface CurriculoPdfData {
  id?: string;
  nomeCompleto?: string;
  email?: string;
  telefone?: string;
  enderecoCompleto?: string;
  cidadeAssinatura?: string;
  estadoAssinatura?: string;
  dataAssinaturaTexto?: string;
  nomeAssinatura?: string;
  formacaoAcademica?: string[];
  atuacaoProfissional?: string[];
  experienciasRelevantes?: string[];
  atividadesFormativasParticipacoes?: string[];
  habilidadesCompetencias?: string[];
  atuacaoSociocultural?: string[];
}

export interface TrajetoriaCulturalPdfData {
  id?: string;
  nomeCompleto?: string;
  titulo?: string;
  textoTrajetoria?: string;
  resumo?: string;
  principaisAtuacoes?: string[];
  reconhecimentos?: string[];
  cidadeAssinatura?: string;
  estadoAssinatura?: string;
  dataAssinaturaTexto?: string;
  nomeAssinatura?: string;
}

export interface PessoaTermoPdfData {
  id?: string | number;
  nomeCompleto?: string;
  nomePrincipal?: string;
  representante?: string;
  documento?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  email?: string;
  enderecoCompleto?: string;
  endereco?: string;
  funcaoColaborador?: string;
  tipoVinculo?: string;
  status?: string;
  cidadeAssinatura?: string;
  estadoAssinatura?: string;
  dataAssinaturaTexto?: string;
  nomeAssinatura?: string;
  [key: string]: unknown;
}

async function getEmpresaAtualIdParaLogo(): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}/configuracoes-empresa`, {
      method: "GET",
      headers: getJsonHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data: EmpresaLogoDTO[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const empresaComLogo =
      data.find((empresa) => {
        const logo = empresa.caminhoLogo;

        return typeof logo === "string" && logo.trim().length > 0;
      }) ?? data[0];

    const id = Number(empresaComLogo?.id);

    return Number.isFinite(id) ? id : null;
  } catch (error) {
    console.warn("Não foi possível localizar a empresa para buscar a logo:", error);
    return null;
  }
}

async function getLogoUrlTemporaria(): Promise<string | null> {
  try {
    const empresaId = await getEmpresaAtualIdParaLogo();

    if (!empresaId) {
      return null;
    }

    const response = await fetch(`${API_URL}/configuracoes-empresa/${empresaId}/logo`, {
      method: "GET",
      headers: getJsonHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const url = await response.text();

    return url?.trim() || null;
  } catch (error) {
    console.warn("Não foi possível gerar a URL temporária da logo:", error);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Não foi possível converter a logo para base64."));
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler a logo."));
    };

    reader.readAsDataURL(blob);
  });
}

async function getLogoDataUrl(): Promise<string | null> {
  try {
    const urlTemporaria = await getLogoUrlTemporaria();

    if (!urlTemporaria) {
      return null;
    }

    const response = await fetch(urlTemporaria, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      return null;
    }

    return await blobToDataUrl(blob);
  } catch (error) {
    console.warn("Logo não carregada para o PDF:", error);
    return null;
  }
}

function getImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.includes("image/png")) {
    return "PNG";
  }

  if (dataUrl.includes("image/webp")) {
    return "WEBP";
  }

  return "JPEG";
}

async function addLogoPdf(
  doc: jsPDF,
  options?: {
    x?: number;
    y?: number;
    maxWidth?: number;
    maxHeight?: number;
  },
): Promise<void> {
  const logoDataUrl = await getLogoDataUrl();

  if (!logoDataUrl) {
    return;
  }

  try {
    const x = options?.x ?? 15;
    const y = options?.y ?? 10;
    const maxWidth = options?.maxWidth ?? 34;
    const maxHeight = options?.maxHeight ?? 18;

    const imageProps = doc.getImageProperties(logoDataUrl);

    const ratio = Math.min(
      maxWidth / imageProps.width,
      maxHeight / imageProps.height,
    );

    const width = imageProps.width * ratio;
    const height = imageProps.height * ratio;

    doc.addImage(
      logoDataUrl,
      getImageFormat(logoDataUrl),
      x,
      y,
      width,
      height,
    );
  } catch (error) {
    console.warn("Não foi possível inserir a logo no PDF:", error);
  }
}

function safeText(value: PdfTextValue, fallback = "—"): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}

function sanitizeFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function addHeader(doc: jsPDF, title: string, subtitle?: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 105, 18, { align: "center" });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, 105, 24, { align: "center" });
  }

  doc.setDrawColor(210);
  doc.line(15, 31, 195, 31);

  return 39;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);

    doc.text(
      `Página ${i} de ${pageCount}`,
      195,
      287,
      { align: "right" },
    );

    doc.text(
      "Documento gerado pelo sistema Aurit.",
      15,
      287,
    );
  }

  doc.setTextColor(0);
}

function ensureSpace(doc: jsPDF, y: number, needed = 18): number {
  if (y + needed <= 275) {
    return y;
  }

  doc.addPage();

  return 20;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25);

  doc.text(title, 15, y);

  doc.setDrawColor(225);
  doc.line(15, y + 2.5, 195, y + 2.5);

  doc.setTextColor(0);

  return y + 9;
}

function addLabelValue(
  doc: jsPDF,
  label: string,
  value: PdfTextValue,
  y: number,
): number {
  y = ensureSpace(doc, y, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${label}:`, 15, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const valueText = safeText(value);
  const lines = doc.splitTextToSize(valueText, 130);

  doc.text(lines, 58, y);

  return y + Math.max(6, lines.length * 5);
}

function addParagraph(
  doc: jsPDF,
  text: PdfTextValue,
  y: number,
  options?: {
    left?: number;
    width?: number;
    fontSize?: number;
    lineHeight?: number;
    align?: "left" | "justify";
  },
): number {
  const left = options?.left ?? 15;
  const width = options?.width ?? 180;
  const fontSize = options?.fontSize ?? 10;
  const lineHeight = options?.lineHeight ?? 5.2;

  const content = safeText(text, "");

  if (!content) {
    return y;
  }

  const paragraphs = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, width);
    y = ensureSpace(doc, y, lines.length * lineHeight + 4);

    doc.text(lines, left, y, {
      maxWidth: width,
      align: options?.align ?? "left",
      lineHeightFactor: 1.15,
    });

    y += lines.length * lineHeight + 3;
  }

  return y;
}

function addBulletList(
  doc: jsPDF,
  items: string[] | undefined,
  y: number,
): number {
  const list = (items ?? [])
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  if (list.length === 0) {
    return addParagraph(doc, "—", y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of list) {
    const lines = doc.splitTextToSize(item, 172);
    y = ensureSpace(doc, y, lines.length * 5.2 + 4);

    doc.text("•", 18, y);
    doc.text(lines, 24, y, {
      maxWidth: 168,
      lineHeightFactor: 1.15,
    });

    y += lines.length * 5.2 + 2;
  }

  return y;
}

function addSignature(
  doc: jsPDF,
  data?: {
    cidadeAssinatura?: string;
    estadoAssinatura?: string;
    dataAssinaturaTexto?: string;
    nomeAssinatura?: string;
  },
): void {
  let y = 238;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const cidade = safeText(data?.cidadeAssinatura, "");
  const estado = safeText(data?.estadoAssinatura, "");
  const dataTexto = safeText(data?.dataAssinaturaTexto, "");

  const localData = [cidade, estado].filter(Boolean).join(" - ");

  if (localData || dataTexto) {
    doc.text(
      `${localData}${localData && dataTexto ? ", " : ""}${dataTexto}`,
      105,
      y,
      { align: "center" },
    );

    y += 20;
  } else {
    y += 14;
  }

  doc.line(55, y, 155, y);

  doc.setFont("helvetica", "bold");
  doc.text(safeText(data?.nomeAssinatura, ""), 105, y + 6, {
    align: "center",
  });
}

export async function exportProjetoPdf(data: ProjetoPdfData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  await addLogoPdf(doc);

  let y = addHeader(
    doc,
    "Ficha do Projeto",
    "Informações gerais do projeto cultural",
  );

  y = addSectionTitle(doc, "Identificação", y);
  y = addLabelValue(doc, "Nome do projeto", data.nomeProjeto, y);
  y = addLabelValue(doc, "Organização", data.organizacao, y);
  y = addLabelValue(doc, "Área de atuação", data.areaAtuacao, y);
  y = addLabelValue(doc, "Origem", data.origemProjeto, y);
  y = addLabelValue(doc, "Status", data.status, y);
  y = addLabelValue(doc, "Período", `${safeText(data.dataInicio)} a ${safeText(data.dataFim)}`, y);
  y = addLabelValue(doc, "Local de execução", data.localExecucao, y);

  y += 3;
  y = addSectionTitle(doc, "Descrição", y);
  y = addParagraph(doc, data.descricao, y);

  y = addSectionTitle(doc, "Objetivo geral", y);
  y = addParagraph(doc, data.objetivoGeral, y);

  y = addSectionTitle(doc, "Objetivos específicos", y);
  y = addBulletList(doc, data.objetivosEspecificos, y);

  y = addSectionTitle(doc, "Público-alvo", y);
  y = addParagraph(doc, data.publicoAlvo, y);

  y = addSectionTitle(doc, "Ações de acessibilidade", y);
  y = addParagraph(doc, data.acoesAcessibilidade, y);

  y = addSectionTitle(doc, "Equipe vinculada", y);
  y = addBulletList(doc, data.colaboradores, y);

  addFooter(doc);

  const filename = sanitizeFilename(data.nomeProjeto || "projeto") || "projeto";
  doc.save(`${filename}.pdf`);
}

export async function exportCurriculoPdf(data: CurriculoPdfData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  await addLogoPdf(doc);

  let y = addHeader(
    doc,
    "Currículo",
    "Registro de formação, experiências e atuação cultural",
  );

  y = addSectionTitle(doc, "Identificação", y);
  y = addLabelValue(doc, "Nome", data.nomeCompleto, y);
  y = addLabelValue(doc, "E-mail", data.email, y);
  y = addLabelValue(doc, "Telefone", data.telefone, y);
  y = addLabelValue(doc, "Endereço", data.enderecoCompleto, y);

  y += 3;
  y = addSectionTitle(doc, "Formação acadêmica", y);
  y = addBulletList(doc, data.formacaoAcademica, y);

  y = addSectionTitle(doc, "Atuação profissional", y);
  y = addBulletList(doc, data.atuacaoProfissional, y);

  y = addSectionTitle(doc, "Experiências relevantes", y);
  y = addBulletList(doc, data.experienciasRelevantes, y);

  y = addSectionTitle(doc, "Atividades formativas e participações", y);
  y = addBulletList(doc, data.atividadesFormativasParticipacoes, y);

  y = addSectionTitle(doc, "Habilidades e competências", y);
  y = addBulletList(doc, data.habilidadesCompetencias, y);

  y = addSectionTitle(doc, "Atuação sociocultural", y);
  y = addBulletList(doc, data.atuacaoSociocultural, y);

  addFooter(doc);

  const filename = sanitizeFilename(data.nomeCompleto || "curriculo") || "curriculo";
  doc.save(`${filename}.pdf`);
}

export async function exportTrajetoriaCulturalPdf(
  data: TrajetoriaCulturalPdfData,
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  await addLogoPdf(doc);

  let y = addHeader(
    doc,
    "Trajetória Cultural",
    "Registro da atuação, história e contribuição cultural",
  );

  y = addSectionTitle(doc, "Identificação", y);
  y = addLabelValue(doc, "Nome", data.nomeCompleto, y);
  y = addLabelValue(doc, "Título", data.titulo, y);

  y += 3;

  if (data.resumo) {
    y = addSectionTitle(doc, "Resumo", y);
    y = addParagraph(doc, data.resumo, y);
  }

  y = addSectionTitle(doc, "Trajetória", y);
  y = addParagraph(doc, data.textoTrajetoria, y, {
    lineHeight: 4.9,
    align: "left",
  });

  if (data.principaisAtuacoes?.length) {
    y = addSectionTitle(doc, "Principais atuações", y);
    y = addBulletList(doc, data.principaisAtuacoes, y);
  }

  if (data.reconhecimentos?.length) {
    y = addSectionTitle(doc, "Reconhecimentos", y);
    y = addBulletList(doc, data.reconhecimentos, y);
  }

  addFooter(doc);

  const filename =
    sanitizeFilename(data.nomeCompleto || data.titulo || "trajetoria-cultural") ||
    "trajetoria-cultural";

  doc.save(`${filename}.pdf`);
}

export async function exportTermoColaboradorPdf(
  data: PessoaTermoPdfData,
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  await addLogoPdf(doc);

  let y = addHeader(
    doc,
    "Termo do Colaborador",
    "Documento de identificação e vínculo institucional",
  );

  y = addSectionTitle(doc, "Dados do colaborador", y);
  y = addLabelValue(doc, "Nome", data.nomeCompleto, y);
  y = addLabelValue(doc, "CPF", data.cpf, y);
  y = addLabelValue(doc, "RG", data.rg, y);
  y = addLabelValue(doc, "Telefone", data.telefone, y);
  y = addLabelValue(doc, "E-mail", data.email, y);
  y = addLabelValue(doc, "Endereço", data.enderecoCompleto ?? data.endereco, y);

  y += 3;
  y = addSectionTitle(doc, "Vínculo", y);
  y = addLabelValue(doc, "Função", data.funcaoColaborador as string, y);
  y = addLabelValue(doc, "Tipo de vínculo", data.tipoVinculo as string, y);
  y = addLabelValue(doc, "Status", data.status as string, y);

  y += 5;
  y = addSectionTitle(doc, "Declaração", y);
  y = addParagraph(
    doc,
    "Declaro, para os devidos fins, que as informações acima identificam o colaborador vinculado à organização, podendo este documento ser utilizado para controle interno, organização institucional, projetos, editais e demais registros administrativos.",
    y,
  );

  addSignature(doc, {
    cidadeAssinatura: data.cidadeAssinatura,
    estadoAssinatura: data.estadoAssinatura,
    dataAssinaturaTexto: data.dataAssinaturaTexto,
    nomeAssinatura: data.nomeAssinatura || data.nomeCompleto,
  });

  addFooter(doc);

  const filename =
    sanitizeFilename(String(data.nomeCompleto || "termo-colaborador")) ||
    "termo-colaborador";

  doc.save(`${filename}.pdf`);
}

export async function exportTermoAgentePdf(
  data: PessoaTermoPdfData,
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  await addLogoPdf(doc);

  let y = addHeader(
    doc,
    "Termo do Agente Cultural",
    "Documento de identificação do agente cultural",
  );

  y = addSectionTitle(doc, "Dados do agente", y);
  y = addLabelValue(doc, "Nome / Razão Social", data.nomePrincipal ?? data.nomeCompleto, y);
  y = addLabelValue(doc, "Representante", data.representante, y);
  y = addLabelValue(doc, "Documento", data.documento ?? data.cpf, y);
  y = addLabelValue(doc, "RG", data.rg, y);
  y = addLabelValue(doc, "Telefone", data.telefone, y);
  y = addLabelValue(doc, "E-mail", data.email, y);
  y = addLabelValue(doc, "Endereço", data.enderecoCompleto ?? data.endereco, y);

  y += 5;
  y = addSectionTitle(doc, "Declaração", y);
  y = addParagraph(
    doc,
    "Declaro, para os devidos fins, que as informações acima identificam o agente cultural responsável pela iniciativa, podendo este documento ser utilizado para organização institucional, projetos, editais, habilitações e demais registros administrativos.",
    y,
  );

  addSignature(doc, {
    cidadeAssinatura: data.cidadeAssinatura,
    estadoAssinatura: data.estadoAssinatura,
    dataAssinaturaTexto: data.dataAssinaturaTexto,
    nomeAssinatura:
      data.nomeAssinatura ||
      data.representante ||
      data.nomePrincipal ||
      data.nomeCompleto,
  });

  addFooter(doc);

  const filename =
    sanitizeFilename(
      String(data.nomePrincipal || data.nomeCompleto || "termo-agente"),
    ) || "termo-agente";

  doc.save(`${filename}.pdf`);
}
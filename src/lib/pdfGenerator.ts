import jsPDF from "jspdf";
import { getConfiguracaoEmpresa } from "./configuracaoEmpresaStore";

export type PdfClause = {
  titulo: string;
  itens: string[];
};

export type PdfSection = {
  title?: string;
  fields?: { label: string; value?: string | number | null }[];
  gridFields?: { label: string; value?: string | number | null }[];
  list?: { label?: string; items: string[] };
  paragraphs?: string[];
  centeredHeading?: string;
  justifiedParagraphs?: string[];
  rightAlignedLine?: string;
  signature?: { nome: string; cpf?: string; rotulo?: string };
  signatures?: { rotulo: string; linhas: string[] }[];
  clauses?: PdfClause[];
};

export interface PdfOptions {
  title: string;
  documentNumber: string;
  sections: PdfSection[];
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

const MARGIN_LEFT = 30;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const HEADER_HEIGHT = 35;
const FOOTER_HEIGHT = 24;

const BODY_START_Y = HEADER_HEIGHT + 8;
const BODY_END_Y = PAGE_HEIGHT - FOOTER_HEIGHT - 6;

const LOGO_W = 28;
const LOGO_H = 22;
const ORG_W = 48;
const HEADER_GAP = 4;

const CENTER_LEFT = MARGIN_LEFT + LOGO_W + HEADER_GAP;
const CENTER_RIGHT = PAGE_WIDTH - MARGIN_RIGHT - ORG_W - HEADER_GAP;
const CENTER_X = (CENTER_LEFT + CENTER_RIGHT) / 2;
const CENTER_W = CENTER_RIGHT - CENTER_LEFT;

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
  tipoPlano?: string | null;
  limiteUsuarios?: number | string | null;
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
  nomeFantasia?: string | null;
  cnpj?: string | null;
  dataFundacao?: string | null;
  emailInstitucional?: string | null;
  telefoneInstitucional?: string | null;
  site?: string | null;
  territorioAtuacao?: string | null;
  historicoAtuacao?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

type PdfContext = {
  empresa: EmpresaPdfData;
  organizacao: OrganizacaoPdfData;
  logo: LoadedLogo;
};

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

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

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

    return data[0];
  } catch (error) {
    console.error("Erro ao buscar organização para o PDF:", error);
    return {};
  }
}

function normalizeImageUrl(path?: string | null): string | null {
  if (!path) return null;

  const value = path.trim();

  if (!value) return null;

  if (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("empresas/")) {
    return null;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;

  return `${API_URL}${normalized}`;
}

function isApiUrl(url: string): boolean {
  return url.startsWith(API_URL);
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

  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "JPEG";

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

async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.82,
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
    if (!src) {
      return null;
    }

    if (src.startsWith("data:image/")) {
      const compressed = await compressImageDataUrl(src);

      return {
        dataUrl: compressed.dataUrl,
        format: compressed.format,
      };
    }

    const response = await fetch(src, {
      method: "GET",
      headers: isApiUrl(src) ? getAuthHeaders() : {},
    });

    if (!response.ok) {
      console.error("Erro ao carregar logo para PDF:", response.status);
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      console.error("Resposta da logo não é imagem:", blob.type);
      return null;
    }

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

    const normalizedUrl = normalizeImageUrl(logoUrl) ?? logoUrl;

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

  if (empresa.id && caminhoLogo) {
    logo = await buscarLogoBase64Empresa(empresa);
  }

  if (!logo && empresa.id && caminhoLogo) {
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

function normalizeParagraphBlocks(values?: string[]): string[] {
  return (values ?? [])
    .flatMap((value) =>
      String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split(/\n{2,}/g),
    )
    .map((text) =>
      text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
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
    ctx.organizacao.nomeFantasia ||
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

function getMunicipioUFDocumento(ctx: PdfContext) {
  return [ctx.organizacao.cidade, ctx.organizacao.estado]
    .filter(Boolean)
    .join(" - ");
}

function aplicarCidadeNaData(line: string, ctx: PdfContext) {
  const municipioUF = getMunicipioUFDocumento(ctx);

  if (!municipioUF) return line;

  if (!line.includes(",")) return line;

  return line.replace(/^.*?,\s*/, `${municipioUF}, `);
}

function drawLogoPlaceholder(doc: jsPDF) {
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_LEFT, 8, LOGO_W, LOGO_H);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("LOGO", MARGIN_LEFT + LOGO_W / 2, 19, { align: "center" });
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

    const safeFormat: "PNG" | "JPEG" =
      dataUrl.startsWith("data:image/jpeg") ||
        dataUrl.startsWith("data:image/jpg")
        ? "JPEG"
        : dataUrl.startsWith("data:image/png")
          ? "PNG"
          : format;

    doc.addImage(dataUrl, safeFormat, drawX, drawY, drawW, drawH);
  } catch (error) {
    console.error("Erro ao inserir imagem preservando proporção:", error);

    try {
      const safeFormat: "PNG" | "JPEG" =
        dataUrl.startsWith("data:image/jpeg") ||
          dataUrl.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG";

      doc.addImage(dataUrl, safeFormat, x, y, boxW, boxH);
    } catch (fallbackError) {
      console.error("Erro ao inserir imagem no fallback:", fallbackError);
      drawLogoPlaceholder(doc);
    }
  }
}

function drawHeader(doc: jsPDF, opts: PdfOptions, ctx: PdfContext) {
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, HEADER_HEIGHT, PAGE_WIDTH - MARGIN_RIGHT, HEADER_HEIGHT);

  if (ctx.logo?.dataUrl) {
    try {
      drawImageContained(
        doc,
        ctx.logo.dataUrl,
        ctx.logo.format,
        MARGIN_LEFT,
        8,
        LOGO_W,
        LOGO_H,
      );
    } catch (error) {
      console.error("Erro ao inserir logo no PDF:", error);
      drawLogoPlaceholder(doc);
    }
  } else {
    drawLogoPlaceholder(doc);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(30);

  const titleLines = doc.splitTextToSize(opts.title.toUpperCase(), CENTER_W);
  const tl = titleLines.slice(0, 2);
  const titleY = tl.length > 1 ? 13 : 16;

  doc.text(tl, CENTER_X, titleY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Documento nº: ${opts.documentNumber}`,
    CENTER_X,
    titleY + (tl.length > 1 ? 9 : 6),
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(60);

  const nomeOrganizacao = safeText(getNomeInstitucional(ctx));
  const orgLines = doc.splitTextToSize(nomeOrganizacao, ORG_W);

  doc.text(orgLines.slice(0, 2), PAGE_WIDTH - MARGIN_RIGHT, 11, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(90);

  const cnpj = getDocumentoInstitucional(ctx);

  if (cnpj && cnpj !== "—") {
    doc.text(`CNPJ: ${cnpj}`, PAGE_WIDTH - MARGIN_RIGHT, 21, {
      align: "right",
    });
  }
}

function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  ctx: PdfContext,
) {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT;

  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(60);

  const nome = safeText(getNomeInstitucional(ctx));
  const documento = safeText(getDocumentoInstitucional(ctx));

  const linha1 = `${nome} - CNPJ: ${documento}`;
  doc.text(linha1, PAGE_WIDTH / 2, y + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);

  const endereco = getEnderecoInstitucional(ctx);

  if (endereco) {
    doc.text(endereco, PAGE_WIDTH / 2, y + 9.5, { align: "center" });
  }

  const cidadeEstadoCep = getCidadeEstadoCepInstitucional(ctx);

  if (cidadeEstadoCep) {
    doc.text(cidadeEstadoCep, PAGE_WIDTH / 2, y + 13.5, {
      align: "center",
    });
  }

  const telefone = getTelefoneInstitucional(ctx);

  if (telefone) {
    doc.text(`Tel: ${telefone}`, PAGE_WIDTH / 2, y + 17.5, {
      align: "center",
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    PAGE_WIDTH - MARGIN_RIGHT,
    PAGE_HEIGHT - 6,
    { align: "right" },
  );
}

function ensureSpace(
  doc: jsPDF,
  cursor: number,
  needed: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  if (cursor + needed > BODY_END_Y) {
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
  opts: PdfOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 14, opts, ctx);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(title.toUpperCase(), MARGIN_LEFT, cursor + 1);

  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, cursor + 3, PAGE_WIDTH - MARGIN_RIGHT, cursor + 3);

  return cursor + 9;
}

function drawGridFields(
  doc: jsPDF,
  fields: { label: string; value: string }[],
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  if (fields.length === 0) return cursor;

  const PAD_X = 5;
  const PAD_Y = 5;
  const COL_W = (CONTENT_WIDTH - PAD_X * 2) / 2;
  const COL_GAP = 4;
  const innerW = COL_W - COL_GAP / 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const wrapped = fields.map((f) => {
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
  doc.roundedRect(MARGIN_LEFT, cursor, CONTENT_WIDTH, totalH, 1.5, 1.5, "FD");

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

function drawField(
  doc: jsPDF,
  label: string,
  value: string,
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  const formattedValue = formatValueByLabel(label, value);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60);

  const labelText = `${label}: `;
  const labelWidth = doc.getTextWidth(labelText);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40);

  const valueLines = doc.splitTextToSize(
    formattedValue,
    CONTENT_WIDTH - labelWidth,
  );

  const needed = valueLines.length * 4.5 + 2;

  cursor = ensureSpace(doc, cursor, needed, opts, ctx);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(labelText, MARGIN_LEFT, cursor);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(valueLines, MARGIN_LEFT + labelWidth, cursor);

  return cursor + needed;
}

function drawList(
  doc: jsPDF,
  label: string | undefined,
  items: string[],
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  if (label) {
    cursor = ensureSpace(doc, cursor, 6, opts, ctx);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`${label}:`, MARGIN_LEFT, cursor);

    cursor += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40);

  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 6);
    const needed = lines.length * 4.5 + 1.5;

    cursor = ensureSpace(doc, cursor, needed, opts, ctx);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text("•", MARGIN_LEFT + 1, cursor);
    doc.text(lines, MARGIN_LEFT + 6, cursor);

    cursor += needed;
  }

  return cursor + 1;
}

function drawSingleSignature(
  doc: jsPDF,
  signature: { nome: string; cpf?: string; rotulo?: string },
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  cursor = ensureSpace(doc, cursor, 42, opts, ctx);

  cursor += 18;

  doc.setDrawColor(80);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT + 20, cursor, PAGE_WIDTH - MARGIN_RIGHT - 20, cursor);

  cursor += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(signature.rotulo ?? "AUTORIZANTE", PAGE_WIDTH / 2, cursor, {
    align: "center",
  });

  cursor += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`Nome: ${signature.nome}`, PAGE_WIDTH / 2, cursor, {
    align: "center",
  });

  cursor += 4.5;

  if (signature.cpf) {
    doc.text(`CPF: ${maskCPF(signature.cpf)}`, PAGE_WIDTH / 2, cursor, {
      align: "center",
    });

    cursor += 4.5;
  }

  return cursor + 4;
}

function drawSideBySideSignatures(
  doc: jsPDF,
  signatures: { rotulo: string; linhas: string[] }[],
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  if (signatures.length === 0) return cursor;

  const COL_GAP = 10;
  const COL_W =
    signatures.length === 1 ? CONTENT_WIDTH : (CONTENT_WIDTH - COL_GAP) / 2;
  const leftX = MARGIN_LEFT;
  const rightX = MARGIN_LEFT + COL_W + COL_GAP;

  const pairCount =
    signatures.length === 1 ? 1 : Math.ceil(signatures.length / 2);

  for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
    const pair =
      signatures.length === 1
        ? signatures
        : signatures.slice(pairIndex * 2, pairIndex * 2 + 2);

    const maxLinhas = Math.max(
      ...pair.map((sig) => sig.linhas.filter(Boolean).length),
    );

    const blockHeight = 34 + maxLinhas * 5;

    cursor = ensureSpace(doc, cursor, blockHeight, opts, ctx);
    cursor += 18;

    pair.forEach((sig, index) => {
      const x = signatures.length === 1 ? leftX : index === 0 ? leftX : rightX;
      const center = x + COL_W / 2;
      const lineY = cursor;

      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.line(x + 8, lineY, x + COL_W - 8, lineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.7);
      doc.setTextColor(40);
      doc.text(sig.rotulo.toUpperCase(), center, lineY + 6, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(60);

      let y = lineY + 11;

      sig.linhas
        .map((linha) => linha?.trim())
        .filter(Boolean)
        .forEach((linha) => {
          const lines = doc.splitTextToSize(linha, COL_W - 16);

          doc.text(lines.slice(0, 2), center, y, {
            align: "center",
          });

          y += lines.length > 1 ? 8 : 5;
        });
    });

    cursor += blockHeight;
  }

  return cursor + 4;
}

function drawTextLinesPaginated(
  doc: jsPDF,
  lines: string[],
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
  config?: {
    fontSize?: number;
    lineHeight?: number;
    textColor?: number | [number, number, number];
    align?: "left" | "justify";
    indentX?: number;
  },
) {
  const fontSize = config?.fontSize ?? 10;
  const lineHeight = config?.lineHeight ?? 5.2;
  const indentX = config?.indentX ?? 0;
  const align = config?.align ?? "left";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  if (Array.isArray(config?.textColor)) {
    doc.setTextColor(...config.textColor);
  } else {
    doc.setTextColor(config?.textColor ?? 35);
  }

  for (const line of lines) {
    cursor = ensureSpace(doc, cursor, lineHeight + 1, opts, ctx);

    doc.text(line, MARGIN_LEFT + indentX, cursor, {
      align,
      maxWidth: CONTENT_WIDTH - indentX,
    });

    cursor += lineHeight;
  }

  return cursor;
}

function drawParagraphPaginated(
  doc: jsPDF,
  text: string,
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
  config?: {
    fontSize?: number;
    lineHeight?: number;
    align?: "left" | "justify";
    spacingAfter?: number;
  },
) {
  const fontSize = config?.fontSize ?? 10;
  const lineHeight = config?.lineHeight ?? 5.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);

  cursor = drawTextLinesPaginated(doc, lines, cursor, opts, ctx, {
    fontSize,
    lineHeight,
    textColor: 35,
    align: config?.align ?? "left",
  });

  return cursor + (config?.spacingAfter ?? 2);
}

function drawClauseTitle(
  doc: jsPDF,
  title: string,
  cursor: number,
  opts: PdfOptions,
  ctx: PdfContext,
) {
  const titleLines = doc.splitTextToSize(title.toUpperCase(), CONTENT_WIDTH);
  const titleHeight = titleLines.length * 5 + 2;

  cursor = ensureSpace(doc, cursor, titleHeight + 6, opts, ctx);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(25);
  doc.text(titleLines, MARGIN_LEFT, cursor);

  return cursor + titleHeight;
}

export async function generateInstitutionalPdf(opts: PdfOptions) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const ctx = await resolvePdfContext();

  drawHeader(doc, opts, ctx);

  let cursor = BODY_START_Y;

  for (const section of opts.sections) {
    const fields = (section.fields ?? []).filter(
      (f) =>
        f.value !== undefined &&
        f.value !== null &&
        String(f.value).trim() !== "",
    );

    const gridFields = (section.gridFields ?? [])
      .filter(
        (f) =>
          f.value !== undefined &&
          f.value !== null &&
          String(f.value).trim() !== "",
      )
      .map((f) => ({ label: f.label, value: String(f.value) }));

    const listItems = (section.list?.items ?? [])
      .map((s) => s?.trim())
      .filter(Boolean) as string[];

    const paragraphs = normalizeParagraphBlocks(section.paragraphs);

    const justifiedParagraphs = normalizeParagraphBlocks(
      section.justifiedParagraphs,
    );

    const clauses = (section.clauses ?? []).filter(
      (c) => c.titulo && c.itens.some((i) => i?.trim()),
    );

    const signatures = section.signatures ?? [];

    const hasContent =
      fields.length > 0 ||
      gridFields.length > 0 ||
      listItems.length > 0 ||
      paragraphs.length > 0 ||
      justifiedParagraphs.length > 0 ||
      clauses.length > 0 ||
      signatures.length > 0 ||
      !!section.centeredHeading ||
      !!section.rightAlignedLine ||
      !!section.signature;

    if (!hasContent) continue;

    if (section.title) {
      cursor = drawSectionTitle(doc, section.title, cursor, opts, ctx);
    }

    if (section.centeredHeading) {
      cursor = ensureSpace(doc, cursor, 14, opts, ctx);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(25);

      const headingLines = doc.splitTextToSize(
        section.centeredHeading.toUpperCase(),
        CONTENT_WIDTH,
      );

      doc.text(headingLines, PAGE_WIDTH / 2, cursor + 2, {
        align: "center",
      });

      cursor += headingLines.length * 6 + 4;
    }

    if (section.rightAlignedLine) {
      const line = aplicarCidadeNaData(section.rightAlignedLine, ctx);

      cursor = ensureSpace(doc, cursor, 8, opts, ctx);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text(line, PAGE_WIDTH - MARGIN_RIGHT, cursor, {
        align: "right",
      });

      cursor += 8;
    }

    if (gridFields.length > 0) {
      cursor = drawGridFields(doc, gridFields, cursor, opts, ctx);
    }

    for (const f of fields) {
      cursor = drawField(doc, f.label, String(f.value), cursor, opts, ctx);
    }

    if (listItems.length > 0) {
      cursor = drawList(doc, section.list?.label, listItems, cursor, opts, ctx);
    }

    for (const p of paragraphs) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(40);

      const lines = doc.splitTextToSize(p, CONTENT_WIDTH);
      const needed = lines.length * 5 + 3;

      cursor = ensureSpace(doc, cursor, needed, opts, ctx);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(40);
      doc.text(lines, MARGIN_LEFT, cursor);

      cursor += needed;
    }

    for (const p of justifiedParagraphs) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(35);

      const lines = doc.splitTextToSize(p, CONTENT_WIDTH);
      const lineHeight = 5;
      const paragraphSpacing = 3;
      const needed = lines.length * lineHeight + paragraphSpacing;

      cursor = ensureSpace(doc, cursor, needed, opts, ctx);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(35);

      doc.text(lines, MARGIN_LEFT, cursor, {
        align: "justify",
        maxWidth: CONTENT_WIDTH,
        lineHeightFactor: 1.15,
      });

      cursor += lines.length * lineHeight + paragraphSpacing;
    }

    for (const cl of clauses) {
      cursor = ensureSpace(doc, cursor, 14, opts, ctx);
      cursor += 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25);

      const titleLines = doc.splitTextToSize(
        cl.titulo.toUpperCase(),
        CONTENT_WIDTH,
      );

      const titleNeeded = titleLines.length * 5 + 2;

      cursor = ensureSpace(doc, cursor, titleNeeded, opts, ctx);
      doc.text(titleLines, MARGIN_LEFT, cursor);

      cursor += titleNeeded;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(35);

      for (const item of cl.itens.filter((i) => i?.trim())) {
        const lines = doc.splitTextToSize(item, CONTENT_WIDTH);
        const needed = lines.length * 5.2 + 2.5;

        cursor = ensureSpace(doc, cursor, needed, opts, ctx);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(35);
        doc.text(lines, MARGIN_LEFT, cursor, {
          align: "justify",
          maxWidth: CONTENT_WIDTH,
        });

        cursor += needed;
      }

      cursor += 2;
    }

    if (section.signature) {
      cursor = drawSingleSignature(doc, section.signature, cursor, opts, ctx);
    }

    if (signatures.length > 0) {
      cursor = drawSideBySideSignatures(doc, signatures, cursor, opts, ctx);
    }

    cursor += 3;
  }

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, ctx);
  }

  const safeName = opts.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  doc.save(`${safeName}-${opts.documentNumber}.pdf`);
}

export const fmtList = (arr?: string[]) =>
  (arr ?? []).map((s) => s.trim()).filter(Boolean);
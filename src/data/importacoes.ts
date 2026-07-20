import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface ImportPreviewRow {
  linha: number;
  dados: Record<string, unknown>;
  avisos: string[];
}

export interface ImportPreview {
  modulo: string;
  nomeArquivo: string;
  colunasReconhecidas: Record<string, string>;
  colunasIgnoradas: string[];
  linhas: ImportPreviewRow[];
}

async function responseError(response: Response) {
  const text = await response.text();
  if (!text) return `Erro ${response.status} ao processar a importação.`;
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    return String(body.message ?? body.mensagem ?? body.error ?? body.detail ?? text);
  } catch {
    return text;
  }
}

export async function getImportModules(): Promise<string[]> {
  const response = await fetch(`${API_URL}/importacoes/modulos`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const body: unknown = await response.json();
  if (Array.isArray(body)) {
    return body.map((item) => typeof item === "string" ? item : String((item as Record<string, unknown>).modulo ?? "")).filter(Boolean);
  }
  const modules = (body as { modulos?: unknown[] } | null)?.modulos ?? [];
  return modules.map((item) => typeof item === "string" ? item : String((item as Record<string, unknown>).modulo ?? "")).filter(Boolean);
}

export async function previewImport(module: string, file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("arquivo", file);
  const response = await fetch(`${API_URL}/importacoes/${encodeURIComponent(module)}/preview`, {
    method: "POST",
    headers: getMultipartHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error(await responseError(response));
  return response.json() as Promise<ImportPreview>;
}

export async function getImportRelationshipOptions(endpoint: string) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const response = await fetch(url, { headers: getJsonHeaders() });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  const items = Array.isArray(body) ? body : ((body as { content?: unknown[] } | null)?.content ?? []);
  return items.map((item) => {
    const record = item as Record<string, unknown>;
    const id = record.id ?? record.value;
    const label = record.nomeCompleto ?? record.nome ?? record.nomeOrganizacao ?? record.razaoSocial ?? record.nomeProjeto ?? record.nomeAtividade ?? record.nomeTurma ?? record.descricao ?? `#${String(id)}`;
    return { value: String(id ?? ""), label: String(label) };
  }).filter((item) => item.value);
}

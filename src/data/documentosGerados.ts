import { apiFetch, apiFetchResponse } from "@/lib/api";

export type TipoDestinatarioDocumento =
  | "COLABORADOR"
  | "INTEGRANTE"
  | "PARTICIPANTE"
  | "EMPRESTIMO";

export interface ModeloDocumentoCompativel {
  id: number;
  nome: string;
  titulo: string;
  tipoModeloDocumento: string;
}

export interface DocumentoGerado {
  id: number;
  titulo: string;
}

export function buscarModelosCompativeis(
  tipoDestinatario: TipoDestinatarioDocumento,
  destinatarioId: number,
) {
  const params = new URLSearchParams({
    tipoDestinatario,
    destinatarioId: String(destinatarioId),
  });

  return apiFetch<ModeloDocumentoCompativel[]>(
    `/documentos-gerados/modelos-compativeis?${params.toString()}`,
  );
}

export function gerarDocumento(
  modeloDocumentoId: number,
  tipoDestinatarioDocumento: TipoDestinatarioDocumento,
  destinatarioId: number,
) {
  return apiFetch<DocumentoGerado>("/documentos-gerados", {
    method: "POST",
    body: JSON.stringify({
      modeloDocumentoId,
      tipoDestinatarioDocumento,
      destinatarioId,
    }),
  });
}

function nomeSeguro(valor: string) {
  const nome = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${nome || "documento"}.pdf`;
}

export async function baixarDocumentoGerado(documento: DocumentoGerado) {
  const response = await apiFetchResponse(
    `/documentos-gerados/${documento.id}/download`,
  );
  const blob = await response.blob();
  if (!blob.size) throw new Error("O PDF gerado está vazio.");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeSeguro(documento.titulo);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

import { apiFetch } from "@/lib/api";

const ENDPOINT = "/alertas-email/destinatarios";

export interface DestinatarioAlerta {
  id: number;
  email: string;
  ativo: boolean;
}

export interface DestinatarioAlertaPayload {
  email: string;
  ativo: boolean;
}

export class AlertasEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlertasEmailError";
  }
}

async function executar<T>(
  operacao: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await operacao();
  } catch (error) {
    throw new AlertasEmailError(
      error instanceof Error && error.message.trim() ? error.message : fallback,
    );
  }
}

export function listarDestinatarios(): Promise<DestinatarioAlerta[]> {
  return executar(
    () => apiFetch<DestinatarioAlerta[]>(ENDPOINT, { cache: "no-store" }),
    "Não foi possível carregar os destinatários dos alertas.",
  );
}

export function criarDestinatario(
  payload: DestinatarioAlertaPayload,
): Promise<DestinatarioAlerta> {
  return executar(
    () =>
      apiFetch<DestinatarioAlerta>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    "Não foi possível cadastrar o destinatário.",
  );
}

export function atualizarDestinatario(
  id: string | number,
  payload: DestinatarioAlertaPayload,
): Promise<DestinatarioAlerta> {
  return executar(
    () =>
      apiFetch<DestinatarioAlerta>(`${ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    "Não foi possível atualizar o destinatário.",
  );
}

export function excluirDestinatario(id: string | number): Promise<void> {
  return executar(
    () => apiFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    "Não foi possível excluir o destinatário.",
  );
}

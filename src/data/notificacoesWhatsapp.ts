import { apiFetch } from "@/lib/api";
import { maskPhone } from "@/lib/masks";

const ENDPOINT = "/configuracoes/notificacoes";

export interface ConfiguracaoWhatsapp {
  id: number | null;
  nomeResponsavel: string;
  telefoneWhatsapp: string;
  ativo: boolean;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
}

export interface ConfiguracaoWhatsappPayload {
  nomeResponsavel: string;
  telefoneWhatsapp: string;
  ativo: boolean;
}

export interface DestinatarioWhatsapp {
  id: number;
  nome: string;
  telefoneWhatsapp: string;
  ativo: boolean;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
}

export interface DestinatarioWhatsappPayload {
  nome: string;
  telefoneWhatsapp: string;
  ativo: boolean;
}

export type SituacaoNotificacao = "ENVIANDO" | "ENVIADA" | "ERRO";

export interface NotificacaoEnviada {
  id: number;
  dataEnvio?: string | null;
  dataTentativa?: string | null;
  tipoNotificacao: string;
  tipoNotificacaoDescricao: string;
  referencia: string;
  situacao: SituacaoNotificacao;
  situacaoDescricao: string;
}

export class NotificacoesWhatsappError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificacoesWhatsappError";
  }
}

async function executar<T>(
  operacao: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await operacao();
  } catch (error) {
    throw new NotificacoesWhatsappError(
      error instanceof Error && error.message.trim() ? error.message : fallback,
    );
  }
}

export function telefoneWhatsappValido(value: string): boolean {
  let digits = value.replace(/\D/g, "");
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }
  return digits.length === 10 || digits.length === 11;
}

export function formatarTelefoneWhatsapp(value?: string | null): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }
  return maskPhone(digits);
}

export function formatarDataEnvio(value?: string | null): string {
  if (!value) return "—";
  const possuiFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  // A API devolve os instantes em UTC, mas em alguns casos sem o sufixo "Z".
  // Sem ele, o navegador interpreta a data como horário local e deixa de aplicar
  // a conversão para o fuso de São Paulo.
  const date = new Date(possuiFuso ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function getConfiguracaoWhatsapp(): Promise<ConfiguracaoWhatsapp> {
  return executar(
    () => apiFetch<ConfiguracaoWhatsapp>(ENDPOINT, { cache: "no-store" }),
    "Não foi possível carregar as configurações de notificações.",
  );
}

export function salvarConfiguracaoWhatsapp(
  payload: ConfiguracaoWhatsappPayload,
): Promise<ConfiguracaoWhatsapp> {
  return executar(
    () =>
      apiFetch<ConfiguracaoWhatsapp>(ENDPOINT, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    "Não foi possível salvar as configurações de notificações.",
  );
}

export function enviarMensagemTeste(
  nomeResponsavel: string,
  telefoneWhatsapp: string,
): Promise<NotificacaoEnviada> {
  return executar(
    () =>
      apiFetch<NotificacaoEnviada>(`${ENDPOINT}/teste`, {
        method: "POST",
        body: JSON.stringify({ nomeResponsavel, telefoneWhatsapp }),
      }),
    "Não foi possível enviar a mensagem de teste.",
  );
}

export function getHistoricoNotificacoes(
  limite = 20,
): Promise<NotificacaoEnviada[]> {
  return executar(
    () =>
      apiFetch<NotificacaoEnviada[]>(`${ENDPOINT}/historico?limite=${limite}`, {
        cache: "no-store",
      }),
    "Não foi possível carregar o histórico de notificações.",
  );
}

export function getDestinatariosWhatsapp(): Promise<DestinatarioWhatsapp[]> {
  return executar(
    () => apiFetch<DestinatarioWhatsapp[]>(`${ENDPOINT}/destinatarios`, { cache: "no-store" }),
    "Não foi possível carregar os destinatários adicionais.",
  );
}

export function adicionarDestinatarioWhatsapp(
  payload: DestinatarioWhatsappPayload,
): Promise<DestinatarioWhatsapp> {
  return executar(
    () => apiFetch<DestinatarioWhatsapp>(`${ENDPOINT}/destinatarios`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Não foi possível adicionar o destinatário.",
  );
}

export function atualizarDestinatarioWhatsapp(
  id: number,
  payload: DestinatarioWhatsappPayload,
): Promise<DestinatarioWhatsapp> {
  return executar(
    () => apiFetch<DestinatarioWhatsapp>(`${ENDPOINT}/destinatarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Não foi possível atualizar o destinatário.",
  );
}

export function removerDestinatarioWhatsapp(id: number): Promise<void> {
  return executar(
    () => apiFetch<void>(`${ENDPOINT}/destinatarios/${id}`, { method: "DELETE" }),
    "Não foi possível remover o destinatário.",
  );
}

import { apiFetch } from "@/lib/api";

export type TipoPlano = "PLANO_GRATUITO" | "PLANO_PAGO" | "PLANO_CORTESIA";

export type StatusAssinatura =
  | "ATIVO"
  | "INATIVO"
  | "SUSPENSO"
  | "CANCELADO"
  | "GRATUITO"
  | "TRIAL";

export type StatusMensalidade = "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO";

export interface Assinatura {
  id: number;
  configuracaoEmpresaId: number;
  empresa: string;
  tipoPlano: TipoPlano;
  status: StatusAssinatura;
  valorMensalidade: number | null;
  dataCriacao: string | null;
  diaVencimento: number | null;
  proximaCobranca: string | null;
  cobrancaAutomatica: boolean | null;
  isentoCobranca: boolean | null;
  motivoIsencao: string | null;
  dataEncerramento: string | null;
  observacaoInterna: string | null;
}

export interface Mensalidade {
  id: number;
  competencia: string;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: StatusMensalidade;
  formaPagamento: string | null;
  coraInvoiceId: string | null;
  dataCriacao: string | null;
}

export interface DadosPagamento {
  invoiceId: number;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  status: StatusMensalidade;
  pix: {
    copyPaste: string | null;
    qrCode: string | null;
  } | null;
  boleto: {
    digitableLine: string | null;
    barcode: string | null;
    url: string | null;
  } | null;
}

export const centralClienteKeys = {
  all: ["central-cliente"] as const,
  subscription: () => ["central-cliente", "assinatura"] as const,
  invoices: () => ["central-cliente", "mensalidades"] as const,
  invoice: (id: number) => ["central-cliente", "mensalidade", id] as const,
};

export const statusAssinaturaLabels: Record<StatusAssinatura, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
  GRATUITO: "Gratuito",
  TRIAL: "Teste",
};

export const statusMensalidadeLabels: Record<StatusMensalidade, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

export const formaPagamentoLabels: Record<string, string> = {
  PIX: "Pix",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
};

export function assinaturaGratuita(assinatura: Assinatura): boolean {
  return (
    assinatura.tipoPlano === "PLANO_GRATUITO" ||
    assinatura.tipoPlano === "PLANO_CORTESIA" ||
    assinatura.status === "GRATUITO" ||
    assinatura.isentoCobranca === true
  );
}

export function mensalidadePagavel(status: StatusMensalidade): boolean {
  return status === "PENDENTE" || status === "ATRASADO";
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Datas LocalDate do backend não passam pelo construtor Date para não mudar de dia no fuso local. */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export function formatReferencia(value?: string | null): string {
  if (!value) return "—";
  const [year, month] = value.split("-");
  const monthNumber = Number(month);
  if (
    !year ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return value;
  }
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(Number(year), monthNumber - 1, 1),
  );
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}/${year}`;
}

export function formatReferenciaCurta(value?: string | null): string {
  if (!value) return "—";
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}

export async function getMySubscription(): Promise<Assinatura> {
  return apiFetch<Assinatura>("/cobrancas/minha-assinatura");
}

export async function getMyInvoices(): Promise<Mensalidade[]> {
  return apiFetch<Mensalidade[]>("/cobrancas/minhas-mensalidades");
}

export async function getMyInvoice(id: number): Promise<Mensalidade> {
  return apiFetch<Mensalidade>(`/cobrancas/minhas-mensalidades/${id}`);
}

/** A operação é idempotente no backend: emite somente quando a cobrança ainda não existe. */
export async function getInvoicePayment(id: number): Promise<DadosPagamento> {
  return apiFetch<DadosPagamento>(
    `/cobrancas/minhas-mensalidades/${id}/pagamento`,
    {
      method: "POST",
    },
  );
}

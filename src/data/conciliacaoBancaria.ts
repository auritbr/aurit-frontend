import { getContasBancarias } from "@/data/contasBancarias";
import { apiFetch } from "@/lib/api";

const BASE_PATH = "/conciliacoes-bancarias";

export type StatusConciliacaoBancaria =
  | "EM_ANDAMENTO"
  | "CONCLUIDA"
  | "CANCELADA";
export type StatusConciliacaoMovimentacao =
  | "PENDENTE"
  | "SUGERIDA"
  | "CONCILIADA"
  | "DIVERGENTE"
  | "IGNORADA";
export type TipoMovimentacao = "ENTRADA" | "SAIDA";

export interface TotaisConciliacao {
  total: number;
  conciliadas: number;
  pendentes: number;
  sugeridas: number;
  divergentes: number;
  ignoradas: number;
}

export interface RegistroAurit {
  id: string;
  dataMovimentacao: string;
  valor: number;
  historico: string;
  origemMovimentacao: string;
  contaBancariaId?: string;
  contaPagarId?: string;
  contaReceberId?: string;
  transferenciaBancariaId?: string;
  pontuacao?: number;
  diferencaDias?: number;
  diferencaValor?: number;
}

export interface MovimentacaoExtrato {
  id: string;
  conciliacaoBancariaId: string;
  dataMovimentacao: string;
  valor: number;
  tipoMovimentacao: TipoMovimentacao;
  historicoBancario: string;
  numeroDocumento?: string;
  identificadorBancario?: string;
  statusConciliacao: StatusConciliacaoMovimentacao;
  movimentacaoVinculada?: RegistroAurit;
  movimentacaoSugerida?: RegistroAurit;
  diferencaValor?: number;
  diferencaDias?: number;
}

export interface ConciliacaoBancaria {
  id: string;
  periodoInicio: string;
  periodoFim: string;
  saldoInicial?: number;
  saldoFinal?: number;
  arquivoNome: string;
  arquivoUrl?: string;
  statusConciliacaoBancaria: StatusConciliacaoBancaria;
  dataImportacao: string;
  dataConclusao?: string;
  contaBancariaId: string;
  contaBancariaLabel: string;
  organizacaoId: string;
  totais: TotaisConciliacao;
}

interface ConciliacaoDTO {
  id: number;
  dataInicial: string;
  dataFinal: string;
  saldoInicial?: number | null;
  saldoFinal?: number | null;
  nomeArquivo?: string | null;
  urlArquivo?: string | null;
  statusConciliacaoBancaria: "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";
  criadoEm: string;
  concluidoEm?: string | null;
  contaBancariaId: number;
  organizacaoId: number;
  totalMovimentacoes: number;
  totalConciliadas: number;
  totalPendentes: number;
  totalSugeridas: number;
  totalDivergentes: number;
  totalIgnoradas: number;
}

interface MovimentacaoDTO {
  id: number;
  dataMovimentacao: string;
  valor: number;
  tipoMovimentacao: TipoMovimentacao;
  descricao?: string | null;
  numeroDocumento?: string | null;
  identificadorBancario?: string | null;
  statusConciliacao: StatusConciliacaoMovimentacao;
  conciliacaoBancariaId: number;
  movimentacaoBancariaId?: number | null;
  historicoMovimentacaoBancaria?: string | null;
  origemMovimentacaoBancaria?: string | null;
  valorMovimentacaoBancaria?: number | null;
  dataMovimentacaoBancaria?: string | null;
  diferencaValor?: number | null;
  diferencaDias?: number | null;
}

interface SugestaoDTO {
  movimentacaoBancariaId: number;
  dataMovimentacao: string;
  valor: number;
  historico?: string | null;
  origemMovimentacao?: string | null;
  pontuacao: number;
  diferencaDias: number;
  diferencaValor: number;
}

export interface ResultadoImportacao {
  conciliacaoId: string;
  totalLidas: number;
  totalImportadas: number;
  totalJaExistentes: number;
  totalSugeridas: number;
  totalPendentes: number;
  totalDivergentes: number;
}

const conciliacaoPorMovimentacao = new Map<string, string>();

async function request<T>(path = "", init?: RequestInit): Promise<T> {
  return apiFetch<T>(`${BASE_PATH}${path}`, { ...init, cache: "no-store" });
}

function mapStatus(
  value: ConciliacaoDTO["statusConciliacaoBancaria"],
): StatusConciliacaoBancaria {
  if (value === "CONCLUIDO") return "CONCLUIDA";
  if (value === "CANCELADO") return "CANCELADA";
  return "EM_ANDAMENTO";
}

function mapConciliacao(
  dto: ConciliacaoDTO,
  contaLabel = `Conta ${dto.contaBancariaId}`,
): ConciliacaoBancaria {
  return {
    id: String(dto.id),
    periodoInicio: dto.dataInicial,
    periodoFim: dto.dataFinal,
    saldoInicial: dto.saldoInicial ?? undefined,
    saldoFinal: dto.saldoFinal ?? undefined,
    arquivoNome: dto.nomeArquivo?.trim() || "Extrato OFX",
    arquivoUrl: dto.urlArquivo ?? undefined,
    statusConciliacaoBancaria: mapStatus(dto.statusConciliacaoBancaria),
    dataImportacao: dto.criadoEm,
    dataConclusao: dto.concluidoEm ?? undefined,
    contaBancariaId: String(dto.contaBancariaId),
    contaBancariaLabel: contaLabel,
    organizacaoId: String(dto.organizacaoId),
    totais: {
      total: dto.totalMovimentacoes ?? 0,
      conciliadas: dto.totalConciliadas ?? 0,
      pendentes: dto.totalPendentes ?? 0,
      sugeridas: dto.totalSugeridas ?? 0,
      divergentes: dto.totalDivergentes ?? 0,
      ignoradas: dto.totalIgnoradas ?? 0,
    },
  };
}

function mapRegistro(dto: MovimentacaoDTO): RegistroAurit | undefined {
  if (!dto.movimentacaoBancariaId) return undefined;
  return {
    id: String(dto.movimentacaoBancariaId),
    dataMovimentacao: dto.dataMovimentacaoBancaria ?? "",
    valor: Number(dto.valorMovimentacaoBancaria ?? 0),
    historico:
      dto.historicoMovimentacaoBancaria?.trim() ||
      `Movimentação ${dto.movimentacaoBancariaId}`,
    origemMovimentacao: dto.origemMovimentacaoBancaria ?? "AJUSTE",
  };
}

function mapMovimentacao(dto: MovimentacaoDTO): MovimentacaoExtrato {
  const registro = mapRegistro(dto);
  const item: MovimentacaoExtrato = {
    id: String(dto.id),
    conciliacaoBancariaId: String(dto.conciliacaoBancariaId),
    dataMovimentacao: dto.dataMovimentacao,
    valor: Number(dto.valor ?? 0),
    tipoMovimentacao: dto.tipoMovimentacao,
    historicoBancario: dto.descricao?.trim() || "Movimentação bancária",
    numeroDocumento: dto.numeroDocumento ?? undefined,
    identificadorBancario: dto.identificadorBancario ?? undefined,
    statusConciliacao: dto.statusConciliacao,
    diferencaValor: dto.diferencaValor ?? undefined,
    diferencaDias: dto.diferencaDias ?? undefined,
  };
  if (dto.statusConciliacao === "CONCILIADA")
    item.movimentacaoVinculada = registro;
  else if (registro) item.movimentacaoSugerida = registro;
  conciliacaoPorMovimentacao.set(item.id, item.conciliacaoBancariaId);
  return item;
}

export const statusConciliacaoBancariaLabels: Record<
  StatusConciliacaoBancaria,
  string
> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};
export const statusConciliacaoLabels: Record<
  StatusConciliacaoMovimentacao,
  string
> = {
  PENDENTE: "Pendente",
  SUGERIDA: "Sugerida",
  CONCILIADA: "Conciliada",
  DIVERGENTE: "Divergente",
  IGNORADA: "Ignorada",
};
export const tipoMovimentacaoLabels: Record<TipoMovimentacao, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
};
export const origemMovimentacaoLabels: Record<string, string> = new Proxy(
  {},
  {
    get: (_, key) =>
      String(key)
        .toLowerCase()
        .split("_")
        .join(" ")
        .replace(/^./, (c) => c.toUpperCase()),
  },
);

export async function listarConciliacoes(contaBancariaId?: string) {
  const query = contaBancariaId
    ? `?contaBancariaId=${encodeURIComponent(contaBancariaId)}`
    : "";
  const [dtos, contas] = await Promise.all([
    request<ConciliacaoDTO[]>(query),
    getContasBancarias(),
  ]);
  const labels = new Map(
    contas.map((conta) => [conta.id, conta.nomeConta || `Conta ${conta.id}`]),
  );
  return dtos.map((dto) =>
    mapConciliacao(dto, labels.get(String(dto.contaBancariaId))),
  );
}

export async function buscarConciliacao(id: string) {
  const [dto, contas] = await Promise.all([
    request<ConciliacaoDTO>(`/${id}`),
    getContasBancarias(),
  ]);
  const conta = contas.find((item) => item.id === String(dto.contaBancariaId));
  return mapConciliacao(dto, conta?.nomeConta);
}

export async function listarMovimentacoesExtrato(id: string) {
  return (await request<MovimentacaoDTO[]>(`/${id}/movimentacoes`)).map(
    mapMovimentacao,
  );
}

export async function listarSugestoes(
  movimentacaoId: string,
): Promise<RegistroAurit[]> {
  const dtos = await request<SugestaoDTO[]>(
    `/movimentacoes/${movimentacaoId}/sugestoes`,
  );
  return dtos.map((dto) => ({
    id: String(dto.movimentacaoBancariaId),
    dataMovimentacao: dto.dataMovimentacao,
    valor: Number(dto.valor),
    historico:
      dto.historico?.trim() || `Movimentação ${dto.movimentacaoBancariaId}`,
    origemMovimentacao: dto.origemMovimentacao ?? "AJUSTE",
    pontuacao: dto.pontuacao,
    diferencaDias: dto.diferencaDias,
    diferencaValor: Number(dto.diferencaValor),
  }));
}

async function executarMovimentacao(id: string, path: string) {
  await request<void>(`/movimentacoes/${id}/${path}`, { method: "POST" });
  const conciliacaoId = conciliacaoPorMovimentacao.get(id);
  if (!conciliacaoId)
    throw new Error("Conciliação da movimentação não identificada.");
  const itens = await listarMovimentacoesExtrato(conciliacaoId);
  const atualizada = itens.find((item) => item.id === id);
  if (!atualizada)
    throw new Error("Movimentação não encontrada após a atualização.");
  return atualizada;
}

export async function conciliarMovimentacao(
  id: string,
  movimentacaoBancariaId?: string,
) {
  let internaId = movimentacaoBancariaId;
  if (!internaId) {
    const conciliacaoId = conciliacaoPorMovimentacao.get(id);
    const atual = conciliacaoId
      ? (await listarMovimentacoesExtrato(conciliacaoId)).find(
          (item) => item.id === id,
        )
      : undefined;
    internaId = atual?.movimentacaoSugerida?.id;
  }
  if (!internaId)
    throw new Error("Selecione uma movimentação da Aurit para conciliar.");
  return executarMovimentacao(id, `conciliar/${internaId}`);
}
export const desfazerConciliacao = (id: string) =>
  executarMovimentacao(id, "desconciliar");
export const ignorarMovimentacao = (id: string) =>
  executarMovimentacao(id, "ignorar");
export const reavaliarMovimentacao = (id: string) =>
  executarMovimentacao(id, "reavaliar");

export async function conciliarCorrespondenciasExatas(id: string) {
  const conciliadas = await request<number>(`/${id}/conciliar-exatas`, {
    method: "POST",
  });
  return { conciliadas };
}
export const concluirConciliacao = (id: string) =>
  request<void>(`/${id}/concluir`, { method: "POST" });
export const cancelarConciliacao = (id: string) =>
  request<void>(`/${id}/cancelar`, { method: "POST" });
export const excluirConciliacao = (id: string) =>
  request<void>(`/${id}`, { method: "DELETE" });

export async function importarExtrato(
  contaBancariaId: string,
  arquivo: File,
): Promise<ResultadoImportacao> {
  const form = new FormData();
  form.append("contaBancariaId", contaBancariaId);
  form.append("arquivo", arquivo);
  const dto = await request<{
    conciliacaoId: number;
    totalLidas: number;
    totalImportadas: number;
    totalJaExistentes: number;
    totalSugeridas: number;
    totalPendentes: number;
    totalDivergentes: number;
  }>("/importar", { method: "POST", body: form });
  if (!dto.conciliacaoId) {
    throw new Error(
      "O extrato foi processado, mas a conciliação criada não foi identificada.",
    );
  }
  return { ...dto, conciliacaoId: String(dto.conciliacaoId) };
}

export const resolvidas = (totais: TotaisConciliacao) =>
  totais.conciliadas + totais.ignoradas;
export const pendentesDeRevisao = (totais: TotaisConciliacao) =>
  totais.pendentes + totais.sugeridas + totais.divergentes;
export const progressoConciliacao = (totais: TotaisConciliacao) =>
  totais.total ? Math.round((resolvidas(totais) / totais.total) * 100) : 0;
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const formatSignedCurrency = (value: number, tipo: TipoMovimentacao) =>
  `${tipo === "ENTRADA" ? "+" : "−"} ${formatCurrency(Math.abs(value))}`;
export const formatDate = (value?: string) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
export const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

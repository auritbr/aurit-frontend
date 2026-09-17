import { getJsonHeaders } from "@/lib/apiHeaders";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";
import type { StatusContext } from "@/components/StatusPill";
import { nameWithYear } from "@/lib/entityYear";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface RegistroCampo {
  label: string;
  value: string;
}
export interface RegistroExecucao {
  id: string;
  titulo: string;
  campos: RegistroCampo[];
  status?: string;
  statusContext?: StatusContext;
  foraDoPeriodo?: boolean;
}
export interface ParticipacaoIndicadores {
  pessoasUnicas: number;
  participantes: number;
  presencasRegistradas: number;
  frequenciaMedia: string;
  vagasOfertadas: number;
  turmasConsideradas: number;
  atividadesConsideradas: number;
  detalhe: Array<{
    id: string;
    atividade: string;
    presencas: number;
    presentes: number;
    frequencia: string;
  }>;
}
export interface EvidenciaResumoItem {
  id: string;
  titulo: string;
  tipo: string;
  vinculo: string;
  relacionado: string;
}
export interface EvidenciasConsolidadas {
  total: number;
  metasComEvidencia: number;
  metasSemEvidencia: number;
  atividadesComEvidencia: number;
  eventosComEvidencia: number;
  itens: EvidenciaResumoItem[];
}
export interface FinanceiroCategoriaLinha {
  categoria: string;
  previsto: number;
  executado: number;
}
export interface FinanceiroRegistro {
  tipo: string;
  quantidade: number;
  valor: number;
}
export interface FinanceiroExecucao {
  possuiDados: boolean;
  valorAReceber: number;
  valorRecebido: number;
  totalPago: number;
  totalPendente: number;
  registros: FinanceiroRegistro[];
}
export interface MetaExecucao {
  id: string;
  cumprimentoId?: string;
  titulo: string;
  descricao: string;
  quantidadePrevista: string;
  unidade: string;
  prazo: string;
  formaComprovacao: string;
  situacao: string;
  quantidadeExecutada?: string;
  percentualExecutado?: number;
  observacaoCumprimento?: string;
  justificativaNaoCumprimentoIntegral?: string;
  evidenciaIds: string[];
  evidenciasDisponiveis: Array<{ value: string; label: string }>;
}
export interface ExecucaoProjeto {
  projeto: RegistroExecucao;
  resumo: RegistroCampo[];
  atividades: RegistroExecucao[];
  turmas: RegistroExecucao[];
  planosAula: RegistroExecucao[];
  planosAulaSomenteLeitura: boolean;
  eventos: RegistroExecucao[];
  cronograma: RegistroExecucao[];
  colaboradores: RegistroExecucao[];
  participacao: ParticipacaoIndicadores;
  metas: MetaExecucao[];
  evidencias: EvidenciasConsolidadas;
  financeiro: FinanceiroExecucao;
  avisos: string[];
}
export interface ExecucaoFiltro {
  projetoId: string;
  dataInicio?: string;
  dataFim?: string;
}
export interface ProjetoOptionPrestacao {
  value: string;
  label: string;
  dataInicio?: string;
  dataFim?: string;
}
export interface PrestacaoDetalhada {
  id: string;
  dataInicio: string;
  dataFim: string;
  dataEntrega: string;
  projeto: RegistroExecucao;
  responsavel: RegistroExecucao | null;
  atividades: RegistroExecucao[];
  turmas: RegistroExecucao[];
  planosAula: RegistroExecucao[];
  eventos: RegistroExecucao[];
  cronograma: RegistroExecucao[];
  colaboradores: RegistroExecucao[];
  cumprimentosMetas: RegistroExecucao[];
  produtosGerados: string[];
  outrosProdutosGerados: string;
  disponibilizacaoProdutosPublico: string;
  descricaoExecucao: string;
  resultadosAlcancados: string;
  avaliacaoPublicoAlcancado: string;
  diferencasPlanejadoRealizado: string;
  dificuldadesEncontradas: string;
  providenciasAdotadas: string;
  consideracoesFinais: string;
  statusPrestacaoContas: string;
  parecerPrestacaoContas: string;
  observacaoAnalise: string;
  dataAnalise: string;
}
export interface PrestacaoAtualizacao {
  dataInicio: string;
  dataFim: string;
  dataEntrega?: string | null;
  agenteId?: string | null;
  atividadeIds: string[];
  turmaIds: string[];
  planoAulaIds: string[];
  eventoCulturalIds: string[];
  cronogramaIds: string[];
  colaboradorIds: string[];
  cumprimentoMetaIds: string[];
  metas: PrestacaoMetaInput[];
  produtosGerados: string[];
  descricaoExecucao: string;
  resultadosAlcancados: string;
  avaliacaoPublicoAlcancado: string;
  diferencasPlanejadoRealizado: string;
  dificuldadesEncontradas: string;
  providenciasAdotadas: string;
  consideracoesFinais: string;
  disponibilizacaoProdutosPublico: string;
  outrosProdutosGerados: string;
  parecerPrestacaoContas: string;
  observacaoAnalise: string;
  dataAnalise?: string | null;
  statusPrestacaoContas: string;
}

type ItemApi = {
  id?: number | string | null;
  nome?: string | null;
  status?: string | null;
  inicio?: string | null;
  fim?: string | null;
  campos?: Record<string, unknown> | null;
  foraDoPeriodo?: boolean | null;
};
type MetaApi = {
  metaProjetoId?: number | string | null;
  cumprimentoId?: number | string | null;
  titulo?: string | null;
  descricao?: string | null;
  quantidadePrevista?: number | string | null;
  formaComprovacao?: string | null;
  statusCumprimentoMeta?: string | null;
  quantidadeExecutada?: string | null;
  percentualExecutado?: number | string | null;
  observacaoCumprimento?: string | null;
  justificativaNaoCumprimentoIntegral?: string | null;
  evidenciaIds?: Array<number | string> | null;
};
type EvidenciaApi = {
  id?: number | string | null;
  titulo?: string | null;
  tipo?: string | null;
  vinculo?: string | null;
  relacionado?: string | null;
};
type FinanceiroApi = {
  previsto?: number | string | null;
  executado?: number | string | null;
  saldo?: number | string | null;
  totalPago?: number | string | null;
  totalPendente?: number | string | null;
  registros?: Array<{
    tipo?: string | null;
    quantidade?: number | string | null;
    valor?: number | string | null;
  }>;
};
type ParticipacaoApi = {
  pessoasUnicas?: number;
  presencasRegistradas?: number;
  frequenciaMedia?: number;
  vagasOfertadas?: number;
  turmasConsideradas?: number;
  atividadesConsideradas?: number;
  detalhe?: Array<{
    id?: number | string;
    atividade?: string;
    presencas?: number;
    presentes?: number;
    frequencia?: number;
  }>;
};
type RegistrosApi = {
  projeto?: ItemApi;
  atividades?: ItemApi[];
  turmas?: ItemApi[];
  planosAula?: ItemApi[];
  eventosCulturais?: ItemApi[];
  cronogramas?: ItemApi[];
  metas?: MetaApi[];
  colaboradores?: ItemApi[];
  evidencias?: EvidenciaApi[];
  participacao?: ParticipacaoApi;
  financeiro?: FinanceiroApi;
};
export interface PrestacaoMetaInput {
  metaProjetoId: string;
  statusCumprimentoMeta: string;
  quantidadeExecutada: string;
  observacaoCumprimento: string;
  justificativaNaoCumprimentoIntegral: string;
  evidenciaIds: string[];
}

async function parseError(response: Response) {
  const text = await response.text();
  if (!text)
    return response.status === 403
      ? "Acesso negado."
      : `Erro ${response.status} ao processar a requisição.`;
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    return String(body.message ?? body.mensagem ?? body.error ?? text);
  } catch {
    return text;
  }
}

const asNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—";
const period = (inicio?: string | null, fim?: string | null) =>
  inicio || fim
    ? inicio === fim
      ? formatDate(inicio)
      : `${formatDate(inicio)} a ${formatDate(fim)}`
    : "—";
const humanize = (value?: string | null) =>
  value
    ? value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^./, (char) => char.toUpperCase())
    : "—";
const moeda = (value: unknown) =>
  asNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const campoFormatado = (label: string, value: unknown) => {
  const texto = String(value).trim();
  if (
    /(valor|total|saldo|recebido|pago)/i.test(label) &&
    /^-?\d+(?:[.,]\d+)?$/.test(texto)
  )
    return moeda(texto.replace(",", "."));
  const semColchetes = texto.replace(/^\[|\]$/g, "");
  if (
    /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ_ , -]+$/.test(semColchetes) &&
    /[A-Z_]/.test(semColchetes)
  ) {
    return semColchetes
      .split(",")
      .map((item) => humanize(item.trim()))
      .join(", ");
  }
  return texto;
};

function mapItem(item: ItemApi): RegistroExecucao {
  const campos = Object.entries(item.campos ?? {})
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value: campoFormatado(label, value) }));
  if (item.inicio || item.fim)
    campos.unshift({ label: "Período", value: period(item.inicio, item.fim) });
  return {
    id: String(item.id ?? ""),
    titulo: item.nome?.trim() || "Registro sem identificação",
    status: item.status ?? undefined,
    foraDoPeriodo: Boolean(item.foraDoPeriodo),
    campos,
  };
}

function mapItemWithYear(item: ItemApi): RegistroExecucao {
  const mapped = mapItem(item);
  return {
    ...mapped,
    titulo: nameWithYear(mapped.titulo, item.inicio),
  };
}

function toIdList(values: string[]) {
  return values.map(Number).filter(Number.isFinite);
}
function mapDetalhada(raw: Record<string, unknown>): PrestacaoDetalhada {
  const list = (key: string) =>
    Array.isArray(raw[key]) ? (raw[key] as ItemApi[]).map(mapItem) : [];
  return {
    id: String(raw.id ?? ""),
    dataInicio: String(raw.dataInicio ?? ""),
    dataFim: String(raw.dataFim ?? ""),
    dataEntrega: String(raw.dataEntrega ?? ""),
    projeto: mapItem((raw.projeto ?? {}) as ItemApi),
    responsavel: raw.responsavel ? mapItem(raw.responsavel as ItemApi) : null,
    atividades: Array.isArray(raw.atividades)
      ? (raw.atividades as ItemApi[]).map(mapItemWithYear)
      : [],
    turmas: Array.isArray(raw.turmas)
      ? (raw.turmas as ItemApi[]).map(mapItemWithYear)
      : [],
    planosAula: list("planosAula"),
    eventos: list("eventosCulturais"),
    cronograma: list("cronogramas"),
    colaboradores: list("colaboradoresExecucao"),
    cumprimentosMetas: list("cumprimentosMetas"),
    produtosGerados: Array.isArray(raw.produtosGerados)
      ? raw.produtosGerados.map(String)
      : [],
    outrosProdutosGerados: String(raw.outrosProdutosGerados ?? ""),
    disponibilizacaoProdutosPublico: String(
      raw.disponibilizacaoProdutosPublico ?? "",
    ),
    descricaoExecucao: String(raw.descricaoExecucao ?? ""),
    resultadosAlcancados: String(raw.resultadosAlcancados ?? ""),
    avaliacaoPublicoAlcancado: String(raw.avaliacaoPublicoAlcancado ?? ""),
    diferencasPlanejadoRealizado: String(
      raw.diferencasPlanejadoRealizado ?? "",
    ),
    dificuldadesEncontradas: String(raw.dificuldadesEncontradas ?? ""),
    providenciasAdotadas: String(raw.providenciasAdotadas ?? ""),
    consideracoesFinais: String(raw.consideracoesFinais ?? ""),
    statusPrestacaoContas: String(raw.status ?? "NAO_INICIADA"),
    parecerPrestacaoContas: String(raw.parecerPrestacaoContas ?? ""),
    observacaoAnalise: String(raw.observacaoAnalise ?? ""),
    dataAnalise: String(raw.dataAnalise ?? ""),
  };
}

export async function carregarExecucaoProjeto(
  filtro: ExecucaoFiltro,
): Promise<ExecucaoProjeto> {
  if (!filtro.projetoId || !filtro.dataInicio || !filtro.dataFim)
    throw new Error(
      "Informe o projeto e o período da prestação para carregar os registros.",
    );
  const query = new URLSearchParams({
    dataInicio: filtro.dataInicio,
    dataFim: filtro.dataFim,
  });
  const response = await fetch(
    `${API_URL}/prestacoes-contas/projetos/${filtro.projetoId}/registros?${query}`,
    { headers: getJsonHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as RegistrosApi;
  const projeto = mapItem(data.projeto ?? {});
  const evidencias = (data.evidencias ?? []).map((item) => ({
    id: String(item.id ?? ""),
    titulo: item.titulo?.trim() || "Evidência sem identificação",
    tipo: humanize(item.tipo),
    vinculo: humanize(item.vinculo),
    relacionado: item.relacionado?.trim() || "—",
  }));
  const evidenciaOptions = evidencias.map((item) => ({
    value: item.id,
    label: item.titulo,
  }));
  const metas = (data.metas ?? []).map((item) => ({
    id: String(item.metaProjetoId ?? ""),
    cumprimentoId:
      item.cumprimentoId == null ? undefined : String(item.cumprimentoId),
    titulo: item.titulo?.trim() || "Meta sem identificação",
    descricao: item.descricao?.trim() || "—",
    quantidadePrevista: asNumber(item.quantidadePrevista).toLocaleString(
      "pt-BR",
      { maximumFractionDigits: 2 },
    ),
    unidade: "Não se aplica",
    prazo: "Não se aplica",
    formaComprovacao: item.formaComprovacao?.trim() || "—",
    situacao: item.statusCumprimentoMeta || "PENDENTE",
    quantidadeExecutada: item.quantidadeExecutada ?? undefined,
    percentualExecutado:
      item.percentualExecutado == null
        ? undefined
        : asNumber(item.percentualExecutado),
    observacaoCumprimento: item.observacaoCumprimento ?? "",
    justificativaNaoCumprimentoIntegral:
      item.justificativaNaoCumprimentoIntegral ?? "",
    evidenciaIds: (item.evidenciaIds ?? []).map(String),
    evidenciasDisponiveis: evidenciaOptions,
  }));
  const participacao = data.participacao ?? {};
  const financeiro = data.financeiro ?? {};
  return {
    projeto,
    resumo: [
      { label: "Projeto", value: projeto.titulo },
      ...projeto.campos,
      {
        label: "Período da prestação",
        value: period(filtro.dataInicio, filtro.dataFim),
      },
    ],
    atividades: (data.atividades ?? []).map(mapItemWithYear),
    turmas: (data.turmas ?? []).map(mapItemWithYear),
    planosAula: (data.planosAula ?? []).map(mapItem),
    planosAulaSomenteLeitura: false,
    eventos: (data.eventosCulturais ?? []).map(mapItem),
    cronograma: (data.cronogramas ?? []).map(mapItem),
    colaboradores: (data.colaboradores ?? []).map(mapItem),
    participacao: {
      pessoasUnicas: asNumber(participacao.pessoasUnicas),
      participantes: asNumber(participacao.pessoasUnicas),
      presencasRegistradas: asNumber(participacao.presencasRegistradas),
      frequenciaMedia: `${asNumber(participacao.frequenciaMedia).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
      vagasOfertadas: asNumber(participacao.vagasOfertadas),
      turmasConsideradas: asNumber(participacao.turmasConsideradas),
      atividadesConsideradas: asNumber(participacao.atividadesConsideradas),
      detalhe: (participacao.detalhe ?? []).map((item) => ({
        id: String(item.id ?? ""),
        atividade: item.atividade?.trim() || "Atividade sem identificação",
        presencas: asNumber(item.presencas),
        presentes: asNumber(item.presentes),
        frequencia: `${asNumber(item.frequencia).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
      })),
    },
    metas,
    evidencias: {
      total: evidencias.length,
      metasComEvidencia: metas.filter((meta) => meta.evidenciaIds.length > 0)
        .length,
      metasSemEvidencia: metas.filter((meta) => meta.evidenciaIds.length === 0)
        .length,
      atividadesComEvidencia: evidencias.filter((item) =>
        item.vinculo.toLowerCase().includes("atividade"),
      ).length,
      eventosComEvidencia: evidencias.filter((item) =>
        item.vinculo.toLowerCase().includes("evento"),
      ).length,
      itens: evidencias,
    },
    financeiro: {
      possuiDados: (financeiro.registros ?? []).some(
        (item) => asNumber(item.quantidade) > 0 || asNumber(item.valor) > 0,
      ),
      valorAReceber: asNumber(financeiro.previsto),
      valorRecebido: asNumber(financeiro.executado),
      totalPago: asNumber(financeiro.totalPago),
      totalPendente: asNumber(financeiro.totalPendente),
      registros: (financeiro.registros ?? []).map((item) => ({
        tipo: humanize(item.tipo),
        quantidade: asNumber(item.quantidade),
        valor: asNumber(item.valor),
      })),
    },
    avisos: [],
  };
}

export async function projetoOptionsPrestacao(): Promise<
  ProjetoOptionPrestacao[]
> {
  const response = await fetch(`${API_URL}/projetos`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as Array<{
    id?: number | string;
    nomeProjeto?: string;
    nome?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
  return (Array.isArray(data) ? data : []).flatMap((item) => {
    const id = item.id == null ? "" : String(item.id);
    return id
      ? [
          {
            value: id,
            label:
              item.nomeProjeto?.trim() || item.nome?.trim() || `Projeto ${id}`,
            dataInicio: item.dataInicio?.slice(0, 10),
            dataFim: item.dataFim?.slice(0, 10),
          },
        ]
      : [];
  });
}

export async function responsavelOptionsPrestacao(): Promise<
  ProjetoOptionPrestacao[]
> {
  const response = await fetch(`${API_URL}/agentes`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as Array<{
    id?: number | string;
    nomePrincipal?: string;
  }>;
  return (Array.isArray(data) ? data : []).flatMap((item) => {
    const id = item.id == null ? "" : String(item.id);
    return id
      ? [{ value: id, label: item.nomePrincipal?.trim() || `Agente ${id}` }]
      : [];
  });
}

export async function iniciarPrestacaoContas(projetoId: string) {
  const response = await fetch(`${API_URL}/prestacoes-contas/iniciar`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ projetoId: Number(projetoId) }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const prestacao = mapDetalhada(
    (await response.json()) as Record<string, unknown>,
  );
  invalidateFinancialData("prestacao-contas");
  return prestacao;
}

export async function buscarPrestacaoContasDetalhada(id: string) {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}/detalhes`, {
    headers: getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return mapDetalhada((await response.json()) as Record<string, unknown>);
}

export async function atualizarPrestacaoContasDetalhada(
  id: string,
  value: PrestacaoAtualizacao,
) {
  const payload = {
    ...value,
    dataInicio: value.dataInicio || null,
    dataFim: value.dataFim || null,
    agenteId: value.agenteId ? Number(value.agenteId) : null,
    atividadeIds: toIdList(value.atividadeIds),
    turmaIds: toIdList(value.turmaIds),
    planoAulaIds: toIdList(value.planoAulaIds),
    eventoCulturalIds: toIdList(value.eventoCulturalIds),
    cronogramaIds: toIdList(value.cronogramaIds),
    colaboradorIds: toIdList(value.colaboradorIds),
    cumprimentoMetaIds: toIdList(value.cumprimentoMetaIds),
    // Metas são consolidadas no módulo Cumprimento de Meta. Não envie entradas
    // vazias: uma string vazia não é um valor válido para o enum do backend.
    metas: value.metas
      .filter(
        (meta) =>
          Boolean(meta.metaProjetoId) && Boolean(meta.statusCumprimentoMeta),
      )
      .map((meta) => ({
        ...meta,
        metaProjetoId: Number(meta.metaProjetoId),
        evidenciaIds: toIdList(meta.evidenciaIds),
      })),
  };
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}/detalhes`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const prestacao = mapDetalhada(
    (await response.json()) as Record<string, unknown>,
  );
  invalidateFinancialData("prestacao-contas");
  return prestacao;
}

export const formatMoeda = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const percentualTexto = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : "—";

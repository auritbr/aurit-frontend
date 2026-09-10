import { apiFetch } from "@/lib/api";
import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";
import { getProjetos } from "@/data/projetos";
import { getAtividades } from "@/data/atividades";
import { getEventosCulturais } from "@/data/eventosCulturais";
import { getContasBancarias } from "@/data/contasBancarias";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const doacaoObjetivo =
  "Registre e acompanhe as doações recebidas ou previstas pela organização, mantendo organizadas as informações necessárias para controlar as contribuições, sua destinação, recebimento e comprovação.";
export const doacaoTooltip =
  "Nesta página são cadastradas e acompanhadas as doações recebidas ou previstas pela organização, sejam elas financeiras, materiais, serviços, equipamentos, alimentos ou outros tipos de contribuição. Os registros ajudam a identificar a origem da doação, acompanhar seu recebimento, sua destinação e, quando necessário, os comprovantes e registros financeiros relacionados.";

export const tiposDoacao = [
  { value: "FINANCEIRA", label: "Financeira" },
  { value: "MATERIAL", label: "Material" },
  { value: "SERVICO", label: "Serviço" },
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "ALIMENTO", label: "Alimento" },
  { value: "OUTRO", label: "Outro" },
] as const;
export const statusDoacaoOptions = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "RECEBIDA", label: "Recebida" },
  { value: "CANCELADA", label: "Cancelada" },
] as const;
export type TipoDoacao = (typeof tiposDoacao)[number]["value"];
export type StatusDoacao = (typeof statusDoacaoOptions)[number]["value"];
export const tiposComQuantidadeObrigatoria: TipoDoacao[] = [
  "MATERIAL",
  "SERVICO",
  "EQUIPAMENTO",
  "ALIMENTO",
];
export const mostraQuantidade = (tipo?: string) =>
  !!tipo && tipo !== "FINANCEIRA";
export const tipoDoacaoLabel = (value?: string) =>
  tiposDoacao.find((item) => item.value === value)?.label ?? value ?? "—";
export const statusDoacaoLabel = (value?: string) =>
  statusDoacaoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export interface Doacao {
  id: string;
  nomeDoacao: string;
  tipoDoacao: TipoDoacao;
  dataDoacao: string;
  descricaoDoacao: string;
  valorDoacao: string;
  quantidade: string;
  unidadeMedida: string;
  urlComprovante: string;
  observacao: string;
  statusDoacao: StatusDoacao;
  organizacao: string;
  doador: string;
  nomeDoador: string;
  contasReceber: string;
  projeto: string;
  nomeProjeto?: string;
  atividade: string;
  nomeAtividade?: string;
  eventoCultural: string;
  nomeEventoCultural?: string;
  contaBancaria: string;
}
export interface DoacaoPayload
  extends Omit<
    Doacao,
    "id" | "nomeDoador" | "nomeProjeto" | "nomeAtividade" | "nomeEventoCultural"
  > {
  id?: string;
  comprovanteFile?: File;
  removerComprovante?: boolean;
}
export interface Option {
  id: string;
  nome: string;
  projetoId?: string;
  /** Eventos culturais podem estar vinculados a mais de um projeto. */
  projetosIds?: string[];
  /** Identificação complementar das contas bancárias. */
  nomeBanco?: string;
}

interface DoacaoDTO {
  id?: number;
  nomeDoacao?: string;
  tipoDoacao?: TipoDoacao;
  dataDoacao?: string;
  descricaoDoacao?: string;
  valorDoacao?: number;
  quantidade?: number;
  unidadeMedida?: string;
  urlComprovante?: string;
  observacao?: string;
  statusDoacao?: StatusDoacao;
  organizacaoId?: number;
  doadorId?: number;
  doador?: number | { id?: number; nomeDoador?: string; nome?: string };
  nomeDoador?: string;
  contasReceberId?: number;
  contaBancariaId?: number;
  projetoId?: number | { id?: number; nomeProjeto?: string; nome?: string };
  /** Compatibilidade com respostas antigas que ainda expõem a relação diretamente. */
  projeto?: number | { id?: number; nomeProjeto?: string; nome?: string };
  nomeProjeto?: string;
  atividadeId?: number | { id?: number; nomeAtividade?: string; nome?: string };
  atividade?: number | { id?: number; nomeAtividade?: string; nome?: string };
  nomeAtividade?: string;
  eventoCulturalId?:
    | number
    | { id?: number; nomeEvento?: string; nome?: string };
  eventoCultural?: number | { id?: number; nomeEvento?: string; nome?: string };
  nomeEventoCultural?: string;
}
const id = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);
const decimal = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);
const decimalDisplay = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  const raw = String(value).trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
};
const doadorIdFromDto = (dto: DoacaoDTO) =>
  dto.doadorId ??
  (typeof dto.doador === "number" ? dto.doador : dto.doador?.id);
const doadorNomeFromDto = (dto: DoacaoDTO) =>
  dto.nomeDoador ??
  (typeof dto.doador === "object"
    ? (dto.doador?.nomeDoador ?? dto.doador?.nome)
    : "") ??
  "";
const relationId = (
  primary: number | { id?: number } | null | undefined,
  fallback: number | { id?: number } | null | undefined,
) => {
  const value = primary ?? fallback;
  return id(value && typeof value === "object" ? value.id : value);
};
const relationName = (
  explicit: string | undefined,
  relation: unknown,
  ...keys: string[]
) => {
  if (explicit?.trim()) return explicit;
  if (!relation || typeof relation !== "object") return "";
  const record = relation as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};
const mapDoacaoDTO = (dto: DoacaoDTO): Doacao => ({
  id: id(dto.id),
  nomeDoacao: dto.nomeDoacao ?? "",
  tipoDoacao: dto.tipoDoacao ?? "FINANCEIRA",
  dataDoacao: dto.dataDoacao ?? "",
  descricaoDoacao: dto.descricaoDoacao ?? "",
  valorDoacao: decimalDisplay(dto.valorDoacao),
  quantidade: decimal(dto.quantidade),
  unidadeMedida: dto.unidadeMedida ?? "",
  urlComprovante: dto.urlComprovante ?? "",
  observacao: dto.observacao ?? "",
  statusDoacao: dto.statusDoacao ?? "PENDENTE",
  organizacao: id(dto.organizacaoId),
  doador: id(doadorIdFromDto(dto)),
  nomeDoador: doadorNomeFromDto(dto),
  contasReceber: id(dto.contasReceberId),
  contaBancaria: id(dto.contaBancariaId),
  projeto: relationId(dto.projetoId, dto.projeto),
  nomeProjeto:
    relationName(dto.nomeProjeto, dto.projetoId, "nomeProjeto", "nome") ||
    relationName(undefined, dto.projeto, "nomeProjeto", "nome"),
  atividade: relationId(dto.atividadeId, dto.atividade),
  nomeAtividade:
    relationName(dto.nomeAtividade, dto.atividadeId, "nomeAtividade", "nome") ||
    relationName(undefined, dto.atividade, "nomeAtividade", "nome"),
  eventoCultural: relationId(dto.eventoCulturalId, dto.eventoCultural),
  nomeEventoCultural:
    relationName(
      dto.nomeEventoCultural,
      dto.eventoCulturalId,
      "nomeEvento",
      "nome",
    ) || relationName(undefined, dto.eventoCultural, "nomeEvento", "nome"),
});
const numberOrNull = (value: string) => (value ? Number(value) : null);
const numberDecimal = (value: string) => {
  if (!value) return null;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

async function errorMessage(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.message ?? data.error ?? text;
  } catch {
    return text || `Erro ${response.status}`;
  }
}
async function request(path = "", init: RequestInit = {}) {
  const response = await fetch(`${API_URL}/doacoes${path}`, {
    ...init,
    cache: "no-store",
    headers:
      init.body instanceof FormData ? getMultipartHeaders() : getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response;
}
export async function getDoacoes() {
  return ((await (await request()).json()) as DoacaoDTO[]).map(mapDoacaoDTO);
}
export async function getDoacaoById(value: string | number) {
  return mapDoacaoDTO(await (await request(`/${value}`)).json());
}
export async function saveDoacao(form: DoacaoPayload) {
  const dados = {
    nomeDoacao: form.nomeDoacao.trim(),
    tipoDoacao: form.tipoDoacao,
    dataDoacao: form.dataDoacao,
    descricaoDoacao: form.descricaoDoacao.trim(),
    valorDoacao: numberDecimal(form.valorDoacao),
    quantidade: numberDecimal(form.quantidade),
    unidadeMedida: form.unidadeMedida.trim() || null,
    urlComprovante:
      form.urlComprovante && !form.comprovanteFile ? form.urlComprovante : null,
    removerComprovante: Boolean(form.removerComprovante),
    observacao: form.observacao.trim() || null,
    statusDoacao: form.statusDoacao,
    doadorId: numberOrNull(form.doador),
    contaBancariaId: numberOrNull(form.contaBancaria),
    projetoId: numberOrNull(form.projeto),
    atividadeId: numberOrNull(form.atividade),
    eventoCulturalId: numberOrNull(form.eventoCultural),
  };
  const body = new FormData();
  body.append("dados", JSON.stringify(dados));
  if (form.comprovanteFile) body.append("comprovante", form.comprovanteFile);
  const doacao = mapDoacaoDTO(
    await (
      await request(form.id ? `/${form.id}` : "", {
        method: form.id ? "PUT" : "POST",
        body,
      })
    ).json(),
  );
  invalidateFinancialData("doacao");
  return doacao;
}
export async function deleteDoacao(value: string | number) {
  await request(`/${value}`, { method: "DELETE" });
  invalidateFinancialData("doacao");
}
export async function getDoacaoDownloadUrl(value: string | number) {
  const response = await request(`/${value}/download`);
  const text = await response.text();
  try {
    return JSON.parse(text) as string;
  } catch {
    return text;
  }
}

interface DoadorDTO {
  id?: number;
  pessoaFisicaId?: number;
  pessoaJuridicaId?: number;
  nomeDoador?: string | null;
}
export async function getDoadoresOptions(): Promise<Option[]> {
  const doadores = await apiFetch<DoadorDTO[]>("/doadores", {
    cache: "no-store",
  });
  return doadores.map((item) => ({
    id: id(item.id),
    nome: item.nomeDoador?.trim() || `Doador ${item.id}`,
  }));
}
export async function getDoacaoOptions() {
  const [projetos, atividades, eventos, doadores, contasBancarias] =
    await Promise.all([
      getProjetos(),
      getAtividades(),
      getEventosCulturais(),
      getDoadoresOptions(),
      getContasBancarias(),
    ]);
  return {
    doadores,
    projetos: projetos.map((p) => ({ id: String(p.id), nome: p.nomeProjeto })),
    atividades: atividades.map((a) => ({
      id: String(a.id),
      nome: a.nomeAtividade,
      projetoId: String(a.projetoId ?? ""),
    })),
    eventos: eventos.map((e) => ({
      id: String(e.id),
      nome: e.nomeEvento,
      projetoId: String(e.projetoId ?? ""),
      projetosIds: (e.projetosIds ?? []).map(String),
    })),
    contasBancarias: contasBancarias
      .filter((conta) => conta.statusContaBancaria === "ATIVO")
      .map((conta) => ({
        id: String(conta.id),
        nome: conta.nomeConta,
        nomeBanco: conta.nomeBanco,
      })),
  };
}
export const doadorNome = (doacao: Pick<Doacao, "nomeDoador" | "doador">) =>
  doacao.nomeDoador || `Doador ${doacao.doador}`;
export const formatarData = (value?: string) =>
  value ? value.split("-").reverse().join("/") : "—";
export const valorFormatado = (value?: string) => {
  const parsed = numberDecimal(value ?? "");
  return parsed === null
    ? "—"
    : parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
export const valorOuQuantidadeTexto = (d: Doacao) =>
  d.tipoDoacao === "FINANCEIRA"
    ? valorFormatado(d.valorDoacao)
    : [d.quantidade, d.unidadeMedida].filter(Boolean).join(" ") ||
      (d.valorDoacao ? valorFormatado(d.valorDoacao) : "—");

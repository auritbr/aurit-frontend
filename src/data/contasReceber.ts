import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";
import { sortOptionsByLabel } from "@/lib/sortOptions";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";
export {
  formatCurrency,
  formatDate,
  maskMoney,
  parseMoney,
  formaPagamentoOptions,
  formaPagamentoLabel,
  statusFinanceiroOptions,
  statusFinanceiroLabel,
} from "@/data/contasPagar";
export {
  formaPagamentoOptions as formaRecebimentoOptions,
  formaPagamentoLabel as formaRecebimentoLabel,
} from "@/data/contasPagar";
import { parseMoney } from "@/data/contasPagar";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const classificacaoValues = `
RECEITA_DE_PRODUTOS RECEITA_DE_SERVICOS RECEITA_DE_EVENTOS RECEITA_DE_CURSOS RECEITA_DE_OFICINAS
RECEITA_DE_INSCRICOES RECEITA_DE_INGRESSOS RECEITA_DE_LOCACOES RECEITA_DE_VENDA_DE_MATERIAIS
RECEITA_DE_CONSULTORIA RECEITA_DE_CAPACITACAO CONTRIBUICAO_ASSOCIATIVA CONTRIBUICAO_DE_ASSOCIADO
CONTRIBUICAO_VOLUNTARIA CONTRIBUICAO_INSTITUCIONAL MENSALIDADE ANUIDADE TAXA_DE_INSCRICAO
TAXA_DE_PARTICIPACAO DOACAO DOACAO_PESSOA_FISICA DOACAO_PESSOA_JURIDICA DOACAO_RECORRENTE
DOACAO_INTERNACIONAL DOACAO_VINCULADA_A_PROJETO CAMPANHA_DE_ARRECADACAO CROWDFUNDING
ARRECADACAO_SOLIDARIA PATROCINIO PATROCINIO_PRIVADO PATROCINIO_PUBLICO APOIO_FINANCEIRO APOIO_CULTURAL
RECURSO_DE_EDITAL EDITAL_PUBLICO EDITAL_PRIVADO EDITAL_MUNICIPAL EDITAL_ESTADUAL EDITAL_FEDERAL PREMIO
PREMIACAO_CULTURAL BOLSA AUXILIO INCENTIVO TERMO_DE_FOMENTO TERMO_DE_COLABORACAO ACORDO_DE_COOPERACAO
CONVENIO CONTRATO_DE_REPASSE CONTRATO_ADMINISTRATIVO TERMO_DE_COMPROMISSO TERMO_DE_EXECUCAO_CULTURAL
TRANSFERENCIA_PUBLICA TRANSFERENCIA_PUBLICA_MUNICIPAL TRANSFERENCIA_PUBLICA_ESTADUAL
TRANSFERENCIA_PUBLICA_FEDERAL TRANSFERENCIA_FUNDO_A_FUNDO REPASSE_PUBLICO SUBVENCAO_PUBLICA SUBVENCAO_SOCIAL
AUXILIO_PUBLICO CONTRIBUICAO_PUBLICA EMENDA_PARLAMENTAR EMENDA_PARLAMENTAR_MUNICIPAL
EMENDA_PARLAMENTAR_ESTADUAL EMENDA_PARLAMENTAR_FEDERAL EMENDA_INDIVIDUAL EMENDA_DE_BANCADA
EMENDA_DE_COMISSAO INCENTIVO_FISCAL LEI_DE_INCENTIVO LEI_ROUANET LEI_ALDIR_BLANC
POLITICA_NACIONAL_ALDIR_BLANC LEI_PAULO_GUSTAVO FUNDO_DE_CULTURA FUNDO_MUNICIPAL_DE_CULTURA
FUNDO_ESTADUAL_DE_CULTURA FUNDO_NACIONAL_DE_CULTURA RECURSO_DE_PROJETO RECURSO_DE_PROGRAMA
RECURSO_DE_PROJETO_SOCIAL RECURSO_DE_PROJETO_CULTURAL RECURSO_DE_PROJETO_ESPORTIVO
RECURSO_DE_PROJETO_EDUCACIONAL RECURSO_DE_PROJETO_AMBIENTAL RECURSO_DE_COOPERACAO COFINANCIAMENTO
RECURSO_DE_FUNDACAO RECURSO_DE_INSTITUTO RECURSO_DE_ORGANIZACAO_PRIVADA
RECURSO_DE_ORGANISMO_INTERNACIONAL COOPERACAO_INTERNACIONAL RENDIMENTO_DE_APLICACAO_FINANCEIRA
RENDIMENTO_DE_POUPANCA RENDIMENTO_DE_INVESTIMENTO JUROS_RECEBIDOS CORRECAO_MONETARIA_RECEBIDA
DESCONTO_FINANCEIRO_OBTIDO BONIFICACAO_FINANCEIRA REEMBOLSO RESSARCIMENTO RESTITUICAO
DEVOLUCAO_DE_VALORES DEVOLUCAO_DE_ADIANTAMENTO DEVOLUCAO_DE_DESPESA RECUPERACAO_DE_DESPESA
RECUPERACAO_DE_CREDITO CREDITO_TRIBUTARIO CREDITO_DE_IMPOSTO CREDITO_PIS CREDITO_COFINS CREDITO_ICMS
CREDITO_ISS CREDITO_IRPJ CREDITO_CSLL COMPENSACAO_TRIBUTARIA VENDA_DE_BEM VENDA_DE_PATRIMONIO
VENDA_DE_EQUIPAMENTO VENDA_DE_VEICULO VENDA_DE_IMOVEL ALIENACAO_DE_ATIVO RECEITA_DE_ALUGUEL
RECEITA_DE_LOCACAO_DE_EQUIPAMENTO RECEITA_DE_LOCACAO_DE_ESPACO RECEITA_DE_CESSAO_DE_USO
DIREITOS_AUTORAIS ROYALTIES LICENCIAMENTO CESSAO_DE_DIREITOS INDENIZACAO INDENIZACAO_DE_SEGURO
SINISTRO_DE_SEGURO COMPENSACAO_RECEBIDA ADIANTAMENTO_RECEBIDO CAUCAO_RECEBIDA RATEIO_RECEBIDO
AJUSTE_FINANCEIRO RECEITA_EXTRAORDINARIA RECEITA_EVENTUAL OUTRAS_RECEITAS
`
  .trim()
  .split(/\s+/);

const labelWords: Record<string, string> = {
  arrecadacao: "arrecadação",
  associativa: "associativa",
  capacitacao: "capacitação",
  caucao: "caução",
  cessao: "cessão",
  comissao: "comissão",
  compensacao: "compensação",
  contribuicao: "contribuição",
  cooperacao: "cooperação",
  correcao: "correção",
  credito: "crédito",
  devolucao: "devolução",
  doacao: "doação",
  execucao: "execução",
  fisica: "física",
  inscricao: "inscrição",
  inscricoes: "inscrições",
  instituicao: "instituição",
  internacional: "internacional",
  juridica: "jurídica",
  locacao: "locação",
  locacoes: "locações",
  monetaria: "monetária",
  organizacao: "organização",
  participacao: "participação",
  patrimonio: "patrimônio",
  premio: "prêmio",
  premiacao: "premiação",
  publica: "pública",
  publico: "público",
  recebida: "recebida",
  servicos: "serviços",
  tributario: "tributário",
  veiculo: "veículo",
};

const classificacaoLabelFromValue = (value: string) => {
  const words = value
    .toLowerCase()
    .split("_")
    .map((word) => labelWords[word] ?? word);
  return words.join(" ").replace(/^./, (letter) => letter.toUpperCase());
};

const classificacaoBase = classificacaoValues.map((value) => ({
  value,
  label: classificacaoLabelFromValue(value),
}));

export const classificacaoOptions = sortOptionsByLabel(classificacaoBase);
export const classificacaoGrupos = [
  { label: "", options: classificacaoOptions },
];
export const classificacaoLabel = (value?: string) =>
  classificacaoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export interface ContaReceberData {
  id: string;
  nomeContaReceber: string;
  descricaoContaReceber: string;
  dataVencimento: string;
  dataCompetencia: string;
  dataRecebimento: string;
  valorAReceber: string;
  valorRecebido: string;
  juros: string;
  multa: string;
  desconto: string;
  nomePagador: string;
  documentoPagador: string;
  numeroDocumento: string;
  urlComprovante: string;
  nomeComprovante: string;
  statusFinanceiro: string;
  formaPagamento: string;
  classificacaoContaReceber: string;
  contaBancariaId: string;
  organizacaoId: string;
  colaboradorId: string;
  participanteId: string;
  integranteId: string;
  fornecedorId: string;
  parceiroId: string;
  eventoCulturalId: string;
  acaoDivulgacaoId: string;
  projetoId: string;
  atividadeId: string;
  comprovanteFile?: File;
  removerComprovante?: boolean;
}

type ContaReceberDTO = Partial<Omit<ContaReceberData, "id">> & {
  id?: string | number;
  valorAReceber?: string | number | null;
  valorRecebido?: string | number | null;
  juros?: string | number | null;
  multa?: string | number | null;
  desconto?: string | number | null;
  organizacaoId?: string | number | null;
};

export function createEmptyContaReceber(): ContaReceberData {
  return {
    id: "",
    nomeContaReceber: "",
    descricaoContaReceber: "",
    dataVencimento: "",
    dataCompetencia: "",
    dataRecebimento: "",
    valorAReceber: "",
    valorRecebido: "",
    juros: "",
    multa: "",
    desconto: "",
    nomePagador: "",
    documentoPagador: "",
    numeroDocumento: "",
    urlComprovante: "",
    nomeComprovante: "",
    statusFinanceiro: "",
    formaPagamento: "",
    classificacaoContaReceber: "",
    contaBancariaId: "",
    organizacaoId: "",
    colaboradorId: "",
    participanteId: "",
    integranteId: "",
    fornecedorId: "",
    parceiroId: "",
    eventoCulturalId: "",
    acaoDivulgacaoId: "",
    projetoId: "",
    atividadeId: "",
    removerComprovante: false,
  };
}

const idString = (value: unknown) => (value == null ? "" : String(value));
const textString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);
const moneyString = (value: unknown) =>
  value == null
    ? ""
    : Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

function mapConta(dto: ContaReceberDTO): ContaReceberData {
  return {
    ...createEmptyContaReceber(),
    ...dto,
    id: idString(dto.id),
    nomeContaReceber: textString(dto.nomeContaReceber),
    descricaoContaReceber: textString(dto.descricaoContaReceber),
    dataVencimento: textString(dto.dataVencimento),
    dataCompetencia: textString(dto.dataCompetencia),
    dataRecebimento: textString(dto.dataRecebimento),
    nomePagador: textString(dto.nomePagador),
    documentoPagador: textString(dto.documentoPagador),
    numeroDocumento: textString(dto.numeroDocumento),
    statusFinanceiro: textString(dto.statusFinanceiro),
    formaPagamento: textString(dto.formaPagamento),
    classificacaoContaReceber: textString(dto.classificacaoContaReceber),
    valorAReceber: moneyString(dto.valorAReceber),
    valorRecebido: moneyString(dto.valorRecebido),
    juros: moneyString(dto.juros),
    multa: moneyString(dto.multa),
    desconto: moneyString(dto.desconto),
    contaBancariaId: idString(dto.contaBancariaId),
    organizacaoId: idString(dto.organizacaoId),
    colaboradorId: idString(dto.colaboradorId),
    participanteId: idString(dto.participanteId),
    integranteId: idString(dto.integranteId),
    eventoCulturalId: idString(dto.eventoCulturalId),
    fornecedorId: idString(dto.fornecedorId),
    parceiroId: idString(dto.parceiroId),
    acaoDivulgacaoId: idString(dto.acaoDivulgacaoId),
    projetoId: idString(dto.projetoId),
    atividadeId: idString(dto.atividadeId),
    urlComprovante: dto.urlComprovante ?? "",
    nomeComprovante: dto.urlComprovante ? "Comprovante anexado" : "",
  } as ContaReceberData;
}

const nullableId = (value: string) => (value ? Number(value) : null);
const nullableText = (value: unknown) =>
  typeof value === "string" ? value.trim() || null : null;
const nullableMoney = (value: string) => (value ? parseMoney(value) : null);

function payload(conta: ContaReceberData) {
  return {
    nomeContaReceber: textString(conta.nomeContaReceber).trim(),
    descricaoContaReceber: textString(conta.descricaoContaReceber).trim(),
    dataVencimento: conta.dataVencimento,
    dataCompetencia: conta.dataCompetencia,
    dataRecebimento: conta.dataRecebimento || null,
    valorAReceber: parseMoney(conta.valorAReceber),
    valorRecebido: nullableMoney(conta.valorRecebido),
    juros: nullableMoney(conta.juros),
    multa: nullableMoney(conta.multa),
    desconto: nullableMoney(conta.desconto),
    nomePagador: nullableText(conta.nomePagador),
    documentoPagador: nullableText(conta.documentoPagador),
    numeroDocumento: nullableText(conta.numeroDocumento),
    urlComprovante: textString(conta.urlComprovante).startsWith("blob:")
      ? null
      : nullableText(conta.urlComprovante),
    statusFinanceiro: conta.statusFinanceiro,
    formaPagamento: conta.formaPagamento,
    classificacaoContaReceber: conta.classificacaoContaReceber,
    contaBancariaId: nullableId(conta.contaBancariaId),
    colaboradorId: nullableId(conta.colaboradorId),
    participanteId: nullableId(conta.participanteId),
    integranteId: nullableId(conta.integranteId),
    fornecedorId: nullableId(conta.fornecedorId),
    parceiroId: nullableId(conta.parceiroId),
    eventoCulturalId: nullableId(conta.eventoCulturalId),
    acaoDivulgacaoId: nullableId(conta.acaoDivulgacaoId),
    projetoId: nullableId(conta.projetoId),
    atividadeId: nullableId(conta.atividadeId),
    removerComprovante: Boolean(conta.removerComprovante),
  };
}

async function errorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `Erro ${response.status}`;
  try {
    const data = JSON.parse(text) as { message?: string; error?: string };
    return data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

async function request(path = "", init?: RequestInit) {
  const response = await fetch(`${API_URL}/contas-receber${path}`, {
    ...init,
    cache: "no-store",
    headers:
      init?.body instanceof FormData ? getMultipartHeaders() : getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response;
}

export async function getContasReceber() {
  const response = await request();
  return ((await response.json()) as ContaReceberDTO[]).map(mapConta);
}
export async function getContaReceber(id: string | number) {
  const response = await request(`/${id}`);
  return mapConta(await response.json());
}
export async function saveContaReceber(conta: ContaReceberData) {
  const dados = payload(conta);
  const body = new FormData();
  body.append("dados", JSON.stringify(dados));
  if (conta.comprovanteFile) {
    body.append("comprovante", conta.comprovanteFile);
  }
  const response = await request(conta.id ? `/${conta.id}` : "", {
    method: conta.id ? "PUT" : "POST",
    body,
  });
  const contaSalva = mapConta(await response.json());
  invalidateFinancialData("conta-receber");
  return contaSalva;
}
export async function deleteContaReceber(id: string | number) {
  await request(`/${id}`, { method: "DELETE" });
  invalidateFinancialData("conta-receber");
}
export async function getContaReceberComprovanteUrl(id: string | number) {
  const response = await request(`/${id}/download`);
  const text = await response.text();
  try {
    return JSON.parse(text) as string;
  } catch {
    return text;
  }
}

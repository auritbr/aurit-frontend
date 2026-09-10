import { getJsonHeaders, getMultipartHeaders } from "@/lib/apiHeaders";
import { sortOptionsByLabel } from "@/lib/sortOptions";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const statusFinanceiroOptions = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "LIQUIDADO", label: "Liquidado" },
  { value: "VENCIDO", label: "Vencido" },
] as const;

export const formaPagamentoOptions = [
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDITO", label: "Cartão de crédito" },
  { value: "DEBITO", label: "Cartão de débito" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "TRANSFERENCIA", label: "Transferência bancária" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const classificacaoGrupos = [
  {
    label: "Pessoal e encargos",
    options: [
      { value: "SALARIO", label: "Salário" },
      { value: "PRO_LABORE", label: "Pró-labore" },
      { value: "BOLSA", label: "Bolsa" },
      { value: "DIARIA", label: "Diária" },
      { value: "AJUDA_DE_CUSTO", label: "Ajuda de custo" },
      { value: "VALE_TRANSPORTE", label: "Vale-transporte" },
      { value: "VALE_ALIMENTACAO", label: "Vale-alimentação" },
      { value: "ENCARGOS_TRABALHISTAS", label: "Encargos trabalhistas" },
      { value: "INSS", label: "INSS" },
      { value: "FGTS", label: "FGTS" },
      { value: "FERIAS", label: "Férias" },
      { value: "DECIMO_TERCEIRO", label: "Décimo terceiro" },
    ],
  },
  {
    label: "Serviços profissionais",
    options: [
      { value: "SERVICO_DE_TERCEIRO", label: "Serviço de terceiro" },
      { value: "HONORARIOS", label: "Honorários" },
      { value: "CONSULTORIA", label: "Consultoria" },
      { value: "ASSESSORIA", label: "Assessoria" },
      { value: "CONTABILIDADE", label: "Contabilidade" },
      { value: "ADVOCACIA", label: "Advocacia" },
      { value: "DESIGN", label: "Design" },
      { value: "COMUNICACAO", label: "Comunicação" },
      { value: "MARKETING", label: "Marketing" },
      { value: "FOTOGRAFIA", label: "Fotografia" },
      { value: "FILMAGEM", label: "Filmagem" },
      { value: "PRODUCAO", label: "Produção" },
      { value: "LOCACAO_DE_MAO_DE_OBRA", label: "Locação de mão de obra" },
    ],
  },
  {
    label: "Estrutura e serviços essenciais",
    options: [
      { value: "ALUGUEL", label: "Aluguel" },
      { value: "CONDOMINIO", label: "Condomínio" },
      { value: "ENERGIA_ELETRICA", label: "Energia elétrica" },
      { value: "AGUA", label: "Água" },
      { value: "INTERNET", label: "Internet" },
      { value: "TELEFONE", label: "Telefone" },
      { value: "GAS", label: "Gás" },
      { value: "MANUTENCAO", label: "Manutenção" },
      { value: "REPARO", label: "Reparo" },
      { value: "LIMPEZA", label: "Limpeza" },
      { value: "SEGURANCA", label: "Segurança" },
      { value: "VIGILANCIA", label: "Vigilância" },
    ],
  },
  {
    label: "Materiais",
    options: [
      { value: "MATERIAL_DE_ESCRITORIO", label: "Material de escritório" },
      { value: "MATERIAL_DE_LIMPEZA", label: "Material de limpeza" },
      { value: "MATERIAL_PEDAGOGICO", label: "Material pedagógico" },
      { value: "MATERIAL_ARTISTICO", label: "Material artístico" },
      { value: "MATERIAL_CULTURAL", label: "Material cultural" },
      { value: "MATERIAL_ESPORTIVO", label: "Material esportivo" },
      { value: "MATERIAL_DE_CONSUMO", label: "Material de consumo" },
      { value: "MATERIAL_DE_EXPEDIENTE", label: "Material de expediente" },
      { value: "MATERIAL_GRAFICO", label: "Material gráfico" },
      { value: "MATERIAL_DE_DIVULGACAO", label: "Material de divulgação" },
    ],
  },
  {
    label: "Bens e equipamentos",
    options: [
      { value: "EQUIPAMENTO", label: "Equipamento" },
      {
        value: "EQUIPAMENTO_DE_INFORMATICA",
        label: "Equipamento de informática",
      },
      { value: "EQUIPAMENTO_DE_SOM", label: "Equipamento de som" },
      {
        value: "EQUIPAMENTO_DE_ILUMINACAO",
        label: "Equipamento de iluminação",
      },
      { value: "EQUIPAMENTO_AUDIOVISUAL", label: "Equipamento audiovisual" },
      { value: "MOBILIARIO", label: "Mobiliário" },
      { value: "VEICULO", label: "Veículo" },
      { value: "AQUISICAO_DE_BEM", label: "Aquisição de bem" },
      { value: "AQUISICAO_DE_PATRIMONIO", label: "Aquisição de patrimônio" },
    ],
  },
  {
    label: "Atividades, eventos e deslocamentos",
    options: [
      { value: "DESPESA_DE_EVENTO", label: "Despesa de evento" },
      { value: "DESPESA_DE_ATIVIDADE", label: "Despesa de atividade" },
      { value: "DESPESA_DE_OFICINA", label: "Despesa de oficina" },
      { value: "DESPESA_DE_CURSO", label: "Despesa de curso" },
      { value: "DESPESA_DE_APRESENTACAO", label: "Despesa de apresentação" },
      { value: "DESPESA_DE_PRODUCAO", label: "Despesa de produção" },
      { value: "CACHÊ", label: "Cachê" },
      { value: "PREMIACAO", label: "Premiação" },
      { value: "ALIMENTACAO", label: "Alimentação" },
      { value: "HOSPEDAGEM", label: "Hospedagem" },
      { value: "TRANSPORTE", label: "Transporte" },
      { value: "PASSAGEM", label: "Passagem" },
      { value: "COMBUSTIVEL", label: "Combustível" },
      { value: "PEDAGIO", label: "Pedágio" },
      { value: "ESTACIONAMENTO", label: "Estacionamento" },
    ],
  },
  {
    label: "Comunicação e divulgação",
    options: [
      { value: "PUBLICIDADE", label: "Publicidade" },
      { value: "IMPRESSAO", label: "Impressão" },
      { value: "GRAFICA", label: "Gráfica" },
      { value: "MIDIA_SOCIAL", label: "Mídia social" },
      { value: "IMPULSIONAMENTO", label: "Impulsionamento" },
      { value: "SITE", label: "Site" },
      { value: "DOMINIO", label: "Domínio" },
      { value: "HOSPEDAGEM_DE_SITE", label: "Hospedagem de site" },
    ],
  },
  {
    label: "Financeiro",
    options: [
      { value: "TARIFA_BANCARIA", label: "Tarifa bancária" },
      { value: "JUROS_PAGOS", label: "Juros pagos" },
      { value: "MULTA_PAGA", label: "Multa paga" },
      { value: "IOF", label: "IOF" },
      { value: "TAXA_DE_CARTAO", label: "Taxa de cartão" },
      { value: "TAXA_DE_BOLETO", label: "Taxa de boleto" },
      { value: "TAXA_DE_PLATAFORMA", label: "Taxa de plataforma" },
      { value: "TAXA_DE_INTERMEDIACAO", label: "Taxa de intermediação" },
    ],
  },
  {
    label: "Impostos e taxas públicas",
    options: [
      { value: "IMPOSTO", label: "Imposto" },
      { value: "ISS", label: "ISS" },
      { value: "IRRF", label: "IRRF" },
      { value: "IRPJ", label: "IRPJ" },
      { value: "CSLL", label: "CSLL" },
      { value: "PIS", label: "PIS" },
      { value: "COFINS", label: "COFINS" },
      { value: "ICMS", label: "ICMS" },
      { value: "IPTU", label: "IPTU" },
      { value: "IPVA", label: "IPVA" },
      { value: "TAXA_PUBLICA", label: "Taxa pública" },
    ],
  },
  {
    label: "Projetos, repasses e apoios",
    options: [
      { value: "DESPESA_DE_PROJETO", label: "Despesa de projeto" },
      { value: "CONTRAPARTIDA", label: "Contrapartida" },
      { value: "REPASSE", label: "Repasse" },
      { value: "SUBVENCAO_CONCEDIDA", label: "Subvenção concedida" },
      {
        value: "APOIO_FINANCEIRO_CONCEDIDO",
        label: "Apoio financeiro concedido",
      },
    ],
  },
  {
    label: "Reembolsos e devoluções",
    options: [
      { value: "REEMBOLSO", label: "Reembolso" },
      { value: "RESSARCIMENTO", label: "Ressarcimento" },
      { value: "DEVOLUCAO_DE_RECURSO", label: "Devolução de recurso" },
      { value: "DEVOLUCAO_DE_SALDO", label: "Devolução de saldo" },
      { value: "ESTORNO", label: "Estorno" },
    ],
  },
  {
    label: "Outras despesas",
    options: [
      { value: "SEGURO", label: "Seguro" },
      { value: "LICENCA", label: "Licença" },
      { value: "ASSINATURA", label: "Assinatura" },
      { value: "SOFTWARE", label: "Software" },
      { value: "SISTEMA", label: "Sistema" },
      { value: "CAPACITACAO", label: "Capacitação" },
      { value: "TREINAMENTO", label: "Treinamento" },
      { value: "DESPESA_ADMINISTRATIVA", label: "Despesa administrativa" },
      { value: "DESPESA_OPERACIONAL", label: "Despesa operacional" },
      { value: "DESPESA_EXTRAORDINARIA", label: "Despesa extraordinária" },
      { value: "OUTRAS_DESPESAS", label: "Outras despesas" },
    ],
  },
] as const;

type ClassificacaoOption =
  (typeof classificacaoGrupos)[number]["options"][number];

export const classificacaoOptions = sortOptionsByLabel<ClassificacaoOption>(
  classificacaoGrupos.flatMap<ClassificacaoOption>((group) => [
    ...group.options,
  ]),
);
export const classificacaoGruposOrdenados = [
  { label: "", options: classificacaoOptions },
];

export interface ContaPagarData {
  id: string;
  nomeContaPagar: string;
  descricaoContaPagar: string;
  dataVencimento: string;
  dataCompetencia: string;
  dataAgendamento: string;
  dataPagamento: string;
  valorAPagar: string;
  valorPago: string;
  juros: string;
  multa: string;
  desconto: string;
  nomeCredor: string;
  documentoCredor: string;
  numeroDocumento: string;
  urlComprovante: string;
  nomeComprovante: string;
  statusFinanceiro: string;
  formaPagamento: string;
  classificacaoContaPagar: string;
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

type ContaPagarDTO = Partial<Omit<ContaPagarData, "id">> & {
  id?: string | number;
  valorAPagar?: string | number | null;
  valorPago?: string | number | null;
  juros?: string | number | null;
  multa?: string | number | null;
  desconto?: string | number | null;
  organizacaoId?: string | number | null;
};

export function createEmptyContaPagar(): ContaPagarData {
  return {
    id: "",
    nomeContaPagar: "",
    descricaoContaPagar: "",
    dataVencimento: "",
    dataCompetencia: "",
    dataAgendamento: "",
    dataPagamento: "",
    valorAPagar: "",
    valorPago: "",
    juros: "",
    multa: "",
    desconto: "",
    nomeCredor: "",
    documentoCredor: "",
    numeroDocumento: "",
    urlComprovante: "",
    nomeComprovante: "",
    statusFinanceiro: "",
    formaPagamento: "",
    classificacaoContaPagar: "",
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

export const maskMoney = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseMoney = (value?: string | number | null) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatDate = (value?: string) =>
  value ? value.split("-").reverse().join("/") : "—";
export const classificacaoLabel = (value?: string) =>
  classificacaoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";
export const formaPagamentoLabel = (value?: string) =>
  formaPagamentoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";
export const statusFinanceiroLabel = (value?: string) =>
  statusFinanceiroOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

const stringId = (value: unknown) => (value == null ? "" : String(value));
const textToForm = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);
const moneyToForm = (value: unknown) =>
  value == null
    ? ""
    : Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

function mapConta(dto: ContaPagarDTO): ContaPagarData {
  return {
    ...createEmptyContaPagar(),
    ...dto,
    nomeContaPagar: textToForm(dto.nomeContaPagar),
    descricaoContaPagar: textToForm(dto.descricaoContaPagar),
    dataVencimento: textToForm(dto.dataVencimento),
    dataCompetencia: textToForm(dto.dataCompetencia),
    dataAgendamento: textToForm(dto.dataAgendamento),
    dataPagamento: textToForm(dto.dataPagamento),
    nomeCredor: textToForm(dto.nomeCredor),
    documentoCredor: textToForm(dto.documentoCredor),
    numeroDocumento: textToForm(dto.numeroDocumento),
    statusFinanceiro: textToForm(dto.statusFinanceiro),
    formaPagamento: textToForm(dto.formaPagamento),
    classificacaoContaPagar: textToForm(dto.classificacaoContaPagar),
    id: stringId(dto.id),
    valorAPagar: moneyToForm(dto.valorAPagar),
    valorPago: moneyToForm(dto.valorPago),
    juros: moneyToForm(dto.juros),
    multa: moneyToForm(dto.multa),
    desconto: moneyToForm(dto.desconto),
    contaBancariaId: stringId(dto.contaBancariaId),
    organizacaoId: stringId(dto.organizacaoId),
    colaboradorId: stringId(dto.colaboradorId),
    participanteId: stringId(dto.participanteId),
    integranteId: stringId(dto.integranteId),
    eventoCulturalId: stringId(dto.eventoCulturalId),
    fornecedorId: stringId(dto.fornecedorId),
    parceiroId: stringId(dto.parceiroId),
    acaoDivulgacaoId: stringId(dto.acaoDivulgacaoId),
    projetoId: stringId(dto.projetoId),
    atividadeId: stringId(dto.atividadeId),
    urlComprovante: dto.urlComprovante ?? "",
    nomeComprovante: dto.urlComprovante ? "Comprovante anexado" : "",
  } as ContaPagarData;
}

const nullableId = (value: string) => (value ? Number(value) : null);
const nullableText = (value: unknown) =>
  typeof value === "string" ? value.trim() || null : null;
const nullableMoney = (value: string) => (value ? parseMoney(value) : null);

function buildPayload(conta: ContaPagarData) {
  return {
    nomeContaPagar: textToForm(conta.nomeContaPagar).trim(),
    descricaoContaPagar: textToForm(conta.descricaoContaPagar).trim(),
    dataVencimento: conta.dataVencimento,
    dataCompetencia: conta.dataCompetencia,
    dataAgendamento: conta.dataAgendamento || null,
    dataPagamento: conta.dataPagamento || null,
    valorAPagar: parseMoney(conta.valorAPagar),
    valorPago: nullableMoney(conta.valorPago),
    juros: nullableMoney(conta.juros),
    multa: nullableMoney(conta.multa),
    desconto: nullableMoney(conta.desconto),
    nomeCredor: nullableText(conta.nomeCredor),
    documentoCredor: nullableText(conta.documentoCredor),
    numeroDocumento: nullableText(conta.numeroDocumento),
    urlComprovante: textToForm(conta.urlComprovante).startsWith("blob:")
      ? null
      : nullableText(conta.urlComprovante),
    statusFinanceiro: conta.statusFinanceiro,
    formaPagamento: conta.formaPagamento,
    classificacaoContaPagar: conta.classificacaoContaPagar,
    contaBancariaId: nullableId(conta.contaBancariaId),
    colaboradorId: nullableId(conta.colaboradorId),
    participanteId: nullableId(conta.participanteId),
    integranteId: nullableId(conta.integranteId),
    eventoCulturalId: nullableId(conta.eventoCulturalId),
    fornecedorId: nullableId(conta.fornecedorId),
    parceiroId: nullableId(conta.parceiroId),
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
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message ?? json.error ?? text;
  } catch {
    return text;
  }
}

async function request(path = "", init?: RequestInit) {
  const response = await fetch(`${API_URL}/contas-pagar${path}`, {
    ...init,
    cache: "no-store",
    headers:
      init?.body instanceof FormData ? getMultipartHeaders() : getJsonHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response;
}

export async function getContasPagar() {
  const response = await request();
  return ((await response.json()) as ContaPagarDTO[]).map(mapConta);
}
export async function getContaPagar(id: string | number) {
  const response = await request(`/${id}`);
  return mapConta(await response.json());
}

export async function saveContaPagar(conta: ContaPagarData) {
  const payload = buildPayload(conta);
  const body = new FormData();
  body.append("dados", JSON.stringify(payload));
  if (conta.comprovanteFile) {
    body.append("comprovante", conta.comprovanteFile);
  }
  const response = await request(conta.id ? `/${conta.id}` : "", {
    method: conta.id ? "PUT" : "POST",
    body,
  });
  const contaSalva = mapConta(await response.json());
  invalidateFinancialData("conta-pagar");
  return contaSalva;
}

export async function deleteContaPagar(id: string | number) {
  await request(`/${id}`, { method: "DELETE" });
  invalidateFinancialData("conta-pagar");
}

export async function getContaPagarComprovanteUrl(id: string | number) {
  const response = await request(`/${id}/download`);
  const text = await response.text();
  try {
    return JSON.parse(text) as string;
  } catch {
    return text;
  }
}

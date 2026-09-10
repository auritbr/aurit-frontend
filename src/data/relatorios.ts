import { ApiError, apiFetch } from "@/lib/api";

async function getJson<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export interface Indicador {
  chave: string;
  label: string;
  valor: unknown;
}

export interface GrupoRelatorio {
  titulo: string;
  indicadores: Indicador[];
}

export interface LinhaRelatorio {
  titulo: string;
  descricao?: string;
  indicadores: Indicador[];
}

interface RelatorioBase {
  tipoRelatorio: string;
  nomeEmpresa: string;
  organizacaoId: number;
  dataGeracao: string;
}

export interface RelatorioGeral extends RelatorioBase {
  tipoRelatorio: "RELATORIO_GERAL";
  grupos: GrupoRelatorio[];
}

export interface RelatorioParticipacaoPresenca extends RelatorioBase {
  resumo: GrupoRelatorio[];
  atividades?: LinhaRelatorio[];
  turmas?: LinhaRelatorio[];
  presencas?: LinhaRelatorio[];
}

export interface RelatorioProjetosExecucao extends RelatorioBase {
  resumo: GrupoRelatorio[];
  projetos?: LinhaRelatorio[];
  cronogramas?: LinhaRelatorio[];
  eventosCulturais?: LinhaRelatorio[];
  propostasEditais?: LinhaRelatorio[];
  resultadosPropostas?: LinhaRelatorio[];
  prestacoesContas?: LinhaRelatorio[];
}

export interface RelatorioFinanceiroPatrimonio extends RelatorioBase {
  resumo: GrupoRelatorio[];
  movimentacoesFinanceiras?: LinhaRelatorio[];
  planejamentosFinanceiros?: LinhaRelatorio[];
  patrimonios?: LinhaRelatorio[];
  emprestimos?: LinhaRelatorio[];
}

export interface RelatorioInstitucionalDocumental extends RelatorioBase {
  resumo: GrupoRelatorio[];
  documentos?: LinhaRelatorio[];
  colaboradores?: LinhaRelatorio[];
  integrantes?: LinhaRelatorio[];
  trajetoriasCulturais?: LinhaRelatorio[];
}

export function getRelatorioGeral() {
  return getJson<RelatorioGeral>("/relatorios/geral");
}

export function getRelatorioParticipacaoPresenca() {
  return getJson<RelatorioParticipacaoPresenca>(
    "/relatorios/participacao-presenca",
  );
}

export function getRelatorioProjetosExecucao() {
  return getJson<RelatorioProjetosExecucao>("/relatorios/projetos-execucao");
}

export function getRelatorioFinanceiroPatrimonio() {
  return getJson<RelatorioFinanceiroPatrimonio>(
    "/relatorios/financeiro-patrimonio",
  );
}

export function getRelatorioInstitucionalDocumental() {
  return getJson<RelatorioInstitucionalDocumental>(
    "/relatorios/institucional-documental",
  );
}

export type RelatorioColunaTipo =
  | "texto"
  | "numero"
  | "moeda"
  | "data"
  | "hora"
  | "booleano"
  | "percentual"
  | string;

export interface RelatorioColunaMeta {
  chave: string;
  label: string;
  visivelPorPadrao?: boolean;
  tipo?: RelatorioColunaTipo;
}

export interface RelatorioDetalhadoResponse<T = Record<string, unknown>> {
  tipoRelatorio?: string;
  titulo?: string;
  nomeEmpresa?: string;
  organizacaoId?: number;
  dataGeracao?: string;
  total?: number;
  resumo?: GrupoRelatorio[];
  colunas?: RelatorioColunaMeta[];
  registros: T[];
  linhas?: T[];
}

export class RelatorioIndisponivelError extends Error {
  constructor(slug: string) {
    super(
      `O endpoint real deste relatório ainda não está disponível: ${slug}.`,
    );
    this.name = "RelatorioIndisponivelError";
  }
}

const RELATORIO_SLUGS_OPERACIONAIS = [
  "organizacao",
  "agentes",
  "participantes",
  "colaboradores",
  "integrantes",
  "diretoria",
  "projetos",
  "metas-projeto",
  "cronogramas",
  "atividades",
  "turmas",
  "planos-aula",
  "presencas",
  "eventos-culturais",
  "acoes-divulgacao",
  "planos-comunicacao",
  "evidencias",
  "editais",
  "propostas-editais",
  "resultados-propostas",
  "equipe-edital",
  "habilitacoes-propostas",
  "financeiro",
  "aplicacao-de-recursos",
  "planejamento-financeiro",
  "prestacoes-contas",
  "prestacoes-metas",
  "patrimonios",
  "emprestimos",
  "documentos",
  "curriculos",
  "trajetorias-culturais",
] as const;

const RELATORIO_SLUGS_OPERACIONAIS_SET = new Set<string>(
  RELATORIO_SLUGS_OPERACIONAIS,
);

export const RELATORIO_SLUG_ALIASES: Record<string, string> = {
  organizacoes: "organizacao",

  "agentes-culturais": "agentes",

  "participantes-geral": "participantes",

  metas: "metas-projeto",

  cronograma: "cronogramas",

  "planos-de-aula": "planos-aula",

  "plano-comunicacao": "planos-comunicacao",

  financeiros: "financeiro",

  "propostas-edital": "propostas-editais",

  "resultados-proposta": "resultados-propostas",
  "resultado-proposta": "resultados-propostas",
  resultados: "resultados-propostas",

  "aplicacao-de-recursos": "aplicacao-de-recursos",
  "planejamento-financeiro": "aplicacao-de-recursos",
  "planejamentos-financeiros": "aplicacao-de-recursos",

  "prestacao-contas": "prestacoes-contas",
  "prestacao-metas": "prestacoes-metas",

  habilitacao: "habilitacoes-propostas",
  habilitacoes: "habilitacoes-propostas",

  "equipes-editais": "equipe-edital",

  "evidencias-execucao": "evidencias",

  patrimonio: "patrimonios",
};

export function resolveRelatorioSlug(slug: string): string {
  return RELATORIO_SLUG_ALIASES[slug] ?? slug;
}

function getRelatorioEndpointCandidates(slugInput: string): string[] {
  const slug = resolveRelatorioSlug(slugInput);

  if (!RELATORIO_SLUGS_OPERACIONAIS_SET.has(slug)) {
    return [];
  }

  const candidates = new Set<string>([slug]);

  if (slug === "aplicacao-de-recursos") {
    candidates.add("aplicacao-de-recursos");
    candidates.add("planejamento-financeiro");
  }

  Object.entries(RELATORIO_SLUG_ALIASES).forEach(([alias, canonical]) => {
    if (canonical === slug) {
      candidates.add(alias);
    }
  });

  if (slugInput !== slug) {
    candidates.add(slugInput);
  }

  return Array.from(candidates);
}

const RELATORIO_TITULOS: Record<string, string> = {
  organizacao: "Organização",
  diretoria: "Diretoria",
  documentos: "Documentos",
  agentes: "Agentes Culturais",

  colaboradores: "Colaboradores",
  integrantes: "Integrantes",
  participantes: "Participantes",

  curriculos: "Currículos",
  "trajetorias-culturais": "Trajetórias Culturais",

  projetos: "Projetos",
  "metas-projeto": "Metas do Projeto",
  cronogramas: "Cronograma",

  atividades: "Atividades",
  turmas: "Turmas",
  "planos-aula": "Planos de Aula",
  presencas: "Presenças",

  "eventos-culturais": "Eventos Culturais",
  "acoes-divulgacao": "Ações de Divulgação",
  "planos-comunicacao": "Planos de Comunicação",

  financeiro: "Financeiro",

  editais: "Editais",
  "propostas-editais": "Propostas de Edital",
  "resultados-propostas": "Resultados da Proposta",
  "habilitacoes-propostas": "Habilitação Documental",
  "equipe-edital": "Equipe da Proposta",
  "planejamento-financeiro": "Aplicação de Recursos",
  "aplicacao-de-recursos": "Aplicação de Recursos",

  evidencias: "Evidências de Execução",

  "prestacoes-contas": "Prestação de Contas",
  "prestacoes-metas": "Cumprimento de Metas",

  patrimonios: "Patrimônios",
  emprestimos: "Empréstimos",
};

const RELATORIO_DESCRICOES: Record<string, string> = {
  organizacao:
    "Consulte as principais informações institucionais da organização para acompanhar sua identificação, atuação, contatos, território, histórico e demais dados que compõem seu cadastro.",

  diretoria:
    "Acompanhe a composição da diretoria da organização, identificando seus membros, cargos, períodos de mandato e situação atual na representação institucional.",

  documentos:
    "Consulte os documentos institucionais da organização para acompanhar sua emissão, validade e situação em cada cadastro.",

  agentes:
    "Consulte os agentes culturais cadastrados e suas principais informações de identificação, permitindo localizar pessoas, organizações, MEIs e coletivos utilizados nos diferentes registros da organização.",

  colaboradores:
    "Acompanhe os colaboradores da organização e consulte informações sobre suas funções, vínculos, períodos de atuação, carga horária, contato e situação atual.",

  integrantes:
    "Consulte os integrantes da organização para acompanhar suas funções, tipos de vínculo, períodos de participação e situação atual.",

  participantes:
    "Consulte os dados cadastrais dos participantes da organização, incluindo suas informações pessoais, contatos, responsáveis, endereço e situação atual.",

  curriculos:
    "Consulte os currículos cadastrados e acompanhe as informações de formação, experiências, competências e atuação profissional e sociocultural registradas para cada pessoa.",

  "trajetorias-culturais":
    "Consulte as trajetórias culturais registradas e acompanhe o histórico de atuação, experiências, realizações e contribuições de cada pessoa no campo cultural.",

  projetos:
    "Acompanhe os projetos da organização e consulte suas principais informações de planejamento, público, execução, período, área de atuação e situação.",

  "metas-projeto":
    "Consulte as metas definidas para os projetos e acompanhe o que foi planejado, a quantidade prevista e a forma estabelecida para comprovar seu cumprimento.",

  cronogramas:
    "Acompanhe as etapas previstas nos cronogramas dos projetos, seus períodos, situação e vínculos com outras partes da execução.",

  atividades:
    "Consulte as atividades realizadas ou previstas nos projetos e acompanhe informações sobre público, local, período, vagas, tipo e situação de execução.",

  turmas:
    "Acompanhe as turmas organizadas para as atividades, consultando seus períodos, horários, dias de realização, responsáveis e situação.",

  "planos-aula":
    "Consulte os planos de aula vinculados às atividades e turmas para acompanhar o conteúdo planejado, período, responsável e demais informações necessárias à realização das aulas.",

  presencas:
    "Consulte os registros de presença dos participantes nas atividades e turmas para acompanhar a frequência do público e apoiar a comprovação das ações realizadas.",

  "eventos-culturais":
    "Consulte os eventos culturais vinculados aos projetos e acompanhe suas informações de realização, público, acessibilidade, resultados e situação.",

  "acoes-divulgacao":
    "Acompanhe as ações de divulgação dos projetos e propostas, consultando como foram planejadas ou realizadas, as estratégias utilizadas, os resultados e sua situação.",

  "planos-comunicacao":
    "Consulte os planos de comunicação vinculados aos projetos apresentados aos editais e acompanhe suas estratégias, público, período, quantidade prevista e situação.",

  financeiro:
    "Consulte as movimentações financeiras da organização para acompanhar entradas, saídas, valores, datas, formas de pagamento ou recebimento e seus vínculos com projetos e ações.",

  editais:
    "Acompanhe os editais cadastrados pela organização para consultar oportunidades, prazos, valores, órgãos responsáveis e a situação de cada processo.",

  "propostas-editais":
    "Consulte os projetos apresentados aos editais e acompanhe suas principais informações, valores solicitados, vínculos, data de submissão e situação ao longo do processo.",

  "resultados-propostas":
    "Consulte os resultados dos projetos apresentados aos editais e acompanhe a situação alcançada, pontuação, avaliação e eventuais recursos registrados.",

  "habilitacoes-propostas":
    "Acompanhe a habilitação documental dos projetos apresentados aos editais, consultando responsáveis, documentos enviados, prazos, pendências e situação do processo.",

  "equipe-edital":
    "Consulte as pessoas vinculadas às equipes dos projetos apresentados aos editais e acompanhe suas funções, carga horária, valores previstos e informações relacionadas à atuação de cada integrante.",

  "planejamento-financeiro":
    "Consulte os itens previstos para a aplicação dos recursos dos projetos apresentados aos editais e acompanhe como o orçamento foi distribuído entre gastos, valores, períodos e integrantes da equipe.",

  "aplicacao-de-recursos":
    "Consulte os itens previstos para a aplicação dos recursos dos projetos apresentados aos editais e acompanhe como o orçamento foi distribuído entre gastos, valores, períodos e integrantes da equipe.",

  evidencias:
    "Consulte as evidências registradas para comprovar a execução dos projetos e localize os materiais relacionados às atividades, turmas, eventos, ações de divulgação, presenças e outros registros.",

  "prestacoes-contas":
    "Acompanhe as prestações de contas dos projetos e consulte informações sobre responsáveis, entregas, metas, produtos, análises e situação de cada prestação.",

  "prestacoes-metas":
    "Consulte os resultados registrados para as metas e acompanhe quanto foi executado, sua situação de cumprimento e as informações utilizadas para justificar e comprovar os resultados.",

  patrimonios:
    "Consulte os bens patrimoniais da organização e acompanhe suas informações de identificação, aquisição, valor, características, estado de conservação e situação atual.",

  emprestimos:
    "Acompanhe os empréstimos dos bens patrimoniais, identificando destinatários, períodos de utilização, devoluções e as condições de conservação registradas antes e depois do empréstimo.",
};

function getDescricaoRelatorio(slug: string): string {
  return (
    RELATORIO_DESCRICOES[slug] ??
    `Relatório detalhado com dados reais cadastrados no sistema.`
  );
}

export async function getRelatorioDetalhado<T = Record<string, unknown>>(
  slugInput: string,
): Promise<RelatorioDetalhadoResponse<T>> {
  const slug = resolveRelatorioSlug(slugInput);
  const endpointCandidates = getRelatorioEndpointCandidates(slugInput).map(
    (candidate) => `/relatorios/${candidate}/detalhado`,
  );

  if (!endpointCandidates.length) {
    throw new RelatorioIndisponivelError(slug);
  }

  let raw: unknown = null;
  let found = false;

  for (const endpoint of endpointCandidates) {
    try {
      raw = await apiFetch<unknown>(endpoint);
      found = true;
      break;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) continue;

      throw error;
    }
  }

  if (!found) {
    throw new RelatorioIndisponivelError(slug);
  }

  const registros = extractRows<T>(raw);

  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<RelatorioDetalhadoResponse<T>>)
      : {};

  return {
    tipoRelatorio:
      obj.tipoRelatorio ?? `RELATORIO_${slug.toUpperCase().replace(/-/g, "_")}`,
    titulo: obj.titulo ?? RELATORIO_TITULOS[slug] ?? "Relatório",
    nomeEmpresa: obj.nomeEmpresa,
    organizacaoId: obj.organizacaoId,
    dataGeracao: obj.dataGeracao ?? hojeLocalISO(),
    total: obj.total ?? registros.length,
    resumo: obj.resumo ?? [],
    colunas: obj.colunas ?? [],
    registros,
    linhas: registros,
  };
}

export function getRelatorioTabela<T = Record<string, unknown>>(slug: string) {
  return getRelatorioDetalhado<T>(slug);
}

function extractRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.registros)) return obj.registros as T[];
  if (Array.isArray(obj.linhas)) return obj.linhas as T[];
  if (Array.isArray(obj.content)) return obj.content as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];

  return [];
}

function buildResumoFromRows(total: number): GrupoRelatorio[] {
  return [
    {
      titulo: "Resumo",
      indicadores: [
        {
          chave: "total_registros",
          label: "Total de registros",
          valor: total,
        },
      ],
    },
  ];
}

function hojeLocalISO(): string {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

const MONETARIO_KEYS = new Set([
  "valor",
  "valor_total",
  "valor_unitario",
  "total_entradas",
  "total_saidas",
  "saldo",
  "planejado",
  "pendentes",
  "valor_patrimonio",
  "valor_solicitado",
  "valor_contrapartida",
  "entradas",
  "saidas",
  "valor_previsto",
  "valor_pago",
  "valor_aquisicao",
  "valor_total_disponivel",
  "valor_disponivel",
  "valor_final",
  "valor_a_pagar",
  "valor_a_receber",
  "valor_recebido",
  "juros",
  "multa",
  "desconto",
]);

const PERCENTUAL_KEYS = new Set([
  "percentual_presenca",
  "percentual",
  "taxa",
  "ocupacao_vagas",
]);

const DATE_ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;

const numberFormatter = new Intl.NumberFormat("pt-BR");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatDateBR(value?: string | null): string {
  if (!value) return "—";

  const match = String(value).match(DATE_ISO_REGEX);

  if (!match) return String(value);

  const [, y, m, d] = match;

  return `${d}/${m}/${y}`;
}

function isMonetaryKey(chave?: string): boolean {
  if (!chave) return false;

  return MONETARIO_KEYS.has(
    chave.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(),
  );
}

function isPercentualKey(chave?: string): boolean {
  if (!chave) return false;

  return PERCENTUAL_KEYS.has(chave.toLowerCase());
}

export function formatValorRelatorio(valor: unknown, chave?: string): string {
  if (valor === null || valor === undefined || valor === "") return "—";

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  if (typeof valor === "number") {
    if (isMonetaryKey(chave)) return currencyFormatter.format(valor);

    if (isPercentualKey(chave)) {
      return `${numberFormatter.format(valor)}%`;
    }

    return numberFormatter.format(valor);
  }

  if (typeof valor === "string") {
    if (DATE_ISO_REGEX.test(valor)) return formatDateBR(valor);

    const chaveNormalizada = chave?.toLowerCase().replace(/[_-]/g, "") ?? "";
    const digitos = valor.replace(/\D/g, "");
    if (
      (chaveNormalizada.includes("cpf") ||
        chaveNormalizada.includes("cnpj") ||
        chaveNormalizada.includes("documentoidentificacao")) &&
      (digitos.length === 11 || digitos.length === 14)
    ) {
      return maskCpfCnpj(valor);
    }
    if (
      (chaveNormalizada.includes("telefone") ||
        chaveNormalizada.includes("celular") ||
        chaveNormalizada.includes("whatsapp")) &&
      (digitos.length === 10 || digitos.length === 11)
    ) {
      return maskPhone(valor);
    }
    if (/(^|\.)(rg|rgresponsavel|rgrepresentante)$/.test(chaveNormalizada)) {
      return maskRGFlex(valor);
    }

    if (isMonetaryKey(chave)) {
      const num = Number(valor.replace(",", "."));

      if (!Number.isNaN(num)) return currencyFormatter.format(num);
    }

    if (isPercentualKey(chave)) {
      const num = Number(valor.replace(",", "."));

      if (!Number.isNaN(num)) return `${numberFormatter.format(num)}%`;
    }

    return formatEnum(valor);
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";

    return formatArrayValue(valor);
  }

  if (typeof valor === "object") {
    return "Ver detalhes";
  }

  return String(valor);
}

function formatArrayValue(values: unknown[]): string {
  const formattedValues = values
    .map((item) => {
      if (item === null || item === undefined || item === "") return "";

      if (typeof item === "string") return formatEnumList(item);
      if (typeof item === "number") return numberFormatter.format(item);
      if (typeof item === "boolean") return item ? "Sim" : "Não";

      if (typeof item === "object") {
        const record = item as Record<string, unknown>;
        const label =
          record.nome ??
          record.nomeCompleto ??
          record.titulo ??
          record.descricao ??
          record.label;

        if (label !== null && label !== undefined) {
          return formatValorRelatorio(label);
        }
      }

      return String(item);
    })
    .filter(Boolean);

  return formattedValues.length > 0 ? formattedValues.join(", ") : "—";
}

function formatEnumList(value: string): string {
  if (!value.includes(",")) return formatEnum(value);

  return value
    .split(",")
    .map((part) => formatEnum(part.trim()))
    .join(", ");
}

const ENUM_LABEL_OVERRIDES: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  RG: "RG",
  MEI: "MEI",
};

function formatEnum(value: string): string {
  const normalized = value.trim();

  if (ENUM_LABEL_OVERRIDES[normalized]) {
    return ENUM_LABEL_OVERRIDES[normalized];
  }

  if (!/^[A-ZÀ-Ú0-9_]+$/.test(normalized)) {
    return value;
  }

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
import { maskCpfCnpj, maskPhone, maskRGFlex } from "@/lib/masks";

export interface ReportChartTheme {
  primary: string;
  palette: readonly string[];
}

const hsl = (value: string) => `hsl(${value})`;

const DISTINCT_SERIES = [
  "27 78% 54%", // laranja
  "271 55% 58%", // violeta
  "174 58% 41%", // turquesa
  "345 62% 56%", // coral
  "42 72% 50%", // dourado
  "198 66% 48%", // ciano/azul
  "326 55% 56%", // rosa
  "215 24% 52%", // azul acinzentado
] as const;

const makeTheme = (primary: string, accents: string[]): ReportChartTheme => {
  const palette = [primary, ...accents, ...DISTINCT_SERIES]
    .filter((color, index, all) => all.indexOf(color) === index)
    .slice(0, 8)
    .map(hsl);
  return { primary: hsl(primary), palette };
};

const THEMES = {
  institucional: makeTheme("198 55% 42%", [
    "215 62% 52%",
    "38 72% 52%",
    "265 48% 58%",
    "174 52% 43%",
    "330 48% 56%",
  ]),
  diretoria: makeTheme("215 62% 52%", [
    "198 55% 42%",
    "245 52% 60%",
    "38 72% 52%",
    "174 52% 43%",
    "330 48% 56%",
  ]),
  documentos: makeTheme("38 72% 52%", [
    "28 68% 45%",
    "215 58% 54%",
    "265 48% 58%",
    "174 52% 43%",
    "345 55% 56%",
  ]),
  agentes: makeTheme("265 48% 58%", [
    "194 58% 48%",
    "318 42% 54%",
    "174 55% 43%",
    "38 68% 52%",
    "218 58% 56%",
  ]),
  colaboradores: makeTheme("194 58% 48%", [
    "215 58% 54%",
    "174 55% 43%",
    "265 48% 58%",
    "38 68% 52%",
    "345 55% 56%",
  ]),
  integrantes: makeTheme("174 55% 43%", [
    "194 58% 48%",
    "265 48% 58%",
    "215 58% 54%",
    "38 68% 52%",
    "330 50% 56%",
  ]),
  participantes: makeTheme("276 50% 58%", [
    "234 52% 60%",
    "174 55% 43%",
    "194 58% 48%",
    "330 50% 56%",
    "38 68% 52%",
  ]),
  projetos: makeTheme("218 62% 54%", [
    "245 52% 60%",
    "27 76% 54%",
    "166 52% 43%",
    "345 58% 57%",
    "194 58% 48%",
  ]),
  metas: makeTheme("27 76% 54%", [
    "38 72% 52%",
    "218 62% 54%",
    "245 52% 60%",
    "166 52% 43%",
    "345 58% 57%",
  ]),
  cronogramas: makeTheme("245 52% 60%", [
    "218 62% 54%",
    "194 58% 48%",
    "27 76% 54%",
    "174 55% 43%",
    "330 50% 56%",
  ]),
  atividades: makeTheme("166 52% 43%", [
    "190 62% 47%",
    "235 52% 60%",
    "345 58% 57%",
    "27 76% 54%",
    "218 62% 54%",
  ]),
  planosAula: makeTheme("235 52% 60%", [
    "218 62% 54%",
    "166 52% 43%",
    "190 62% 47%",
    "27 76% 54%",
    "276 50% 58%",
  ]),
  turmas: makeTheme("190 62% 47%", [
    "166 52% 43%",
    "235 52% 60%",
    "276 50% 58%",
    "27 76% 54%",
    "345 58% 57%",
  ]),
  presencas: makeTheme("146 52% 43%", [
    "190 62% 47%",
    "215 58% 54%",
    "38 68% 52%",
    "276 50% 58%",
    "345 55% 56%",
  ]),
  eventos: makeTheme("345 58% 57%", [
    "27 76% 54%",
    "276 50% 58%",
    "218 62% 54%",
    "174 55% 43%",
    "38 68% 52%",
  ]),
  evidencias: makeTheme("278 45% 52%", [
    "245 52% 60%",
    "318 42% 54%",
    "194 58% 48%",
    "38 68% 52%",
    "345 55% 56%",
  ]),
  editais: makeTheme("210 62% 52%", [
    "263 52% 58%",
    "330 52% 56%",
    "24 76% 54%",
    "42 68% 50%",
    "196 55% 43%",
  ]),
  propostas: makeTheme("263 52% 58%", [
    "210 62% 52%",
    "330 52% 56%",
    "24 76% 54%",
    "42 68% 50%",
    "174 54% 43%",
  ]),
  equipeProposta: makeTheme("174 54% 43%", [
    "194 58% 48%",
    "263 52% 58%",
    "210 62% 52%",
    "38 68% 52%",
    "330 52% 56%",
  ]),
  recursos: makeTheme("42 68% 50%", [
    "27 76% 54%",
    "146 50% 43%",
    "4 58% 56%",
    "215 58% 54%",
    "263 52% 58%",
  ]),
  resultado: makeTheme("236 56% 58%", [
    "146 50% 43%",
    "4 58% 56%",
    "38 68% 52%",
    "194 58% 48%",
    "330 52% 56%",
  ]),
  habilitacao: makeTheme("196 55% 43%", [
    "146 50% 43%",
    "38 68% 52%",
    "4 58% 56%",
    "215 58% 54%",
    "263 52% 58%",
  ]),
  comunicacao: makeTheme("330 52% 56%", [
    "276 50% 58%",
    "24 76% 54%",
    "194 58% 48%",
    "42 68% 50%",
    "218 62% 54%",
  ]),
  financeiro: makeTheme("195 52% 42%", [
    "146 50% 43%",
    "4 58% 56%",
    "215 58% 54%",
    "176 52% 43%",
    "38 68% 52%",
  ]),
  pagar: makeTheme("4 58% 56%", [
    "345 55% 58%",
    "24 70% 54%",
    "38 68% 52%",
    "215 58% 54%",
    "195 52% 42%",
  ]),
  receber: makeTheme("146 50% 43%", [
    "163 50% 43%",
    "194 58% 48%",
    "215 58% 54%",
    "38 68% 52%",
    "276 48% 56%",
  ]),
  prestacao: makeTheme("238 52% 58%", [
    "28 72% 53%",
    "146 50% 43%",
    "38 68% 52%",
    "194 58% 48%",
    "345 55% 56%",
  ]),
  patrimonio: makeTheme("30 42% 48%", [
    "205 36% 52%",
    "38 55% 54%",
    "176 45% 43%",
    "215 45% 56%",
    "276 42% 58%",
  ]),
  sociodemografico: makeTheme("276 50% 58%", [
    "194 58% 48%",
    "38 72% 52%",
    "345 58% 57%",
    "146 52% 43%",
    "218 62% 54%",
    "27 76% 54%",
  ]),
} as const;

const REPORT_THEME_KEYS: Record<string, keyof typeof THEMES> = {
  "institucional-organizacao": "institucional",
  "institucional-documental": "institucional",
  diretoria: "diretoria",
  documentos: "documentos",
  "regularidade-documental": "documentos",
  agentes: "agentes",
  colaboradores: "colaboradores",
  integrantes: "integrantes",
  "participantes-geral": "participantes",
  participantes: "participantes",
  participacao: "participantes",
  "indicadores-sociodemograficos": "sociodemografico",
  "impacto-social-cultural": "sociodemografico",
  projetos: "projetos",
  "geral-projetos": "projetos",
  "projetos-execucao": "projetos",
  "metas-projeto": "metas",
  "metas-resultados": "metas",
  "prestacoes-metas": "metas",
  cronogramas: "cronogramas",
  "cronograma-prazos": "cronogramas",
  atividades: "atividades",
  "execucao-atividades": "atividades",
  "planos-aula": "planosAula",
  turmas: "turmas",
  "turmas-atendimento": "turmas",
  "participacao-presenca": "turmas",
  presencas: "presencas",
  "eventos-culturais": "eventos",
  evidencias: "evidencias",
  editais: "editais",
  "propostas-editais": "propostas",
  "equipe-edital": "equipeProposta",
  "resultados-propostas": "resultado",
  "habilitacoes-propostas": "habilitacao",
  "aplicacao-de-recursos": "recursos",
  "planos-comunicacao": "comunicacao",
  "acoes-divulgacao": "comunicacao",
  financeiro: "financeiro",
  "financeiro-patrimonio": "financeiro",
  "contas-bancarias": "financeiro",
  "movimentacoes-bancarias": "financeiro",
  "transferencias-bancarias": "financeiro",
  "conciliacao-bancaria": "financeiro",
  "fluxo-caixa": "financeiro",
  "movimentacoes-financeiras": "financeiro",
  "receitas-despesas-categoria": "financeiro",
  "saldos-contas-bancarias": "financeiro",
  "doacoes-recebidas": "financeiro",
  "fornecedores-pagamentos": "financeiro",
  "contas-pagar": "pagar",
  "contas-receber": "receber",
  doadores: "participantes",
  doacoes: "comunicacao",
  fornecedores: "documentos",
  parceiros: "integrantes",
  "prestacoes-contas": "prestacao",
  patrimonios: "patrimonio",
  emprestimos: "patrimonio",
  "movimentações financeiras": "financeiro",
  "planejamentos financeiros": "financeiro",
  patrimônios: "patrimonio",
  empréstimos: "patrimonio",
  "eventos culturais": "eventos",
  "propostas de edital": "editais",
  "prestações de contas": "prestacao",
  "trajetórias culturais": "participantes",
  presenças: "presencas",
};

const SEMANTIC: Array<[RegExp, string]> = [
  [
    /vencid|atrasad|inabilitad|reprovad|n[aã]o aprovad|irregular|diverg|problema|sa[ií]da|despesa|negativo/i,
    "hsl(var(--status-expired-fg))",
  ],
  [
    /inativo|cancelad|ignorada|ausente|n[aã]o iniciad|n[aã]o se aplica|n[aã]o informado|sem informa/i,
    "hsl(var(--status-inactive-fg))",
  ],
  [/pendente|vencendo|aten[cç][aã]o/i, "hsl(var(--status-pending-fg))"],
  [/aguardando/i, "hsl(43 72% 48%)"],
  [/previst|projetad|or[cç]ad/i, "hsl(210 34% 52%)"],
  [
    /(^|\s)ativo($|\s)|regular|aprovad|presente|entrada|receita|positivo|comprovad|recebid|pago/i,
    "hsl(var(--status-active-fg))",
  ],
  [
    /conclu[ií]d|finalizad|executado|realizado/i,
    "hsl(var(--status-complete-fg))",
  ],
  [/andamento|em execu[cç][aã]o|aberto/i, "hsl(var(--status-done-fg))"],
  [/an[aá]lise|habilita[cç][aã]o|sugerida/i, "hsl(var(--status-analysis-fg))"],
  [/conciliad/i, "hsl(var(--status-active-fg))"],
  [/saldo|resultado/i, "hsl(190 48% 38%)"],
  [/transfer[eê]ncia/i, "hsl(var(--status-analysis-fg))"],
];

const FALLBACK: ReportChartTheme = {
  primary: "hsl(var(--primary))",
  palette: [
    "hsl(var(--primary))",
    hsl("215 58% 54%"),
    hsl("276 50% 58%"),
    hsl("38 68% 52%"),
    hsl("174 52% 43%"),
    hsl("345 55% 56%"),
  ],
};

export function getReportChartTheme(reportKey?: string): ReportChartTheme {
  const normalized = String(reportKey ?? "")
    .replace(/^\/+|\/+$|^relatorios\//g, "")
    .toLowerCase();
  return THEMES[REPORT_THEME_KEYS[normalized]] ?? FALLBACK;
}

export function getSemanticChartColor(label: unknown): string | undefined {
  const value = String(label ?? "").replace(/_/g, " ");
  return SEMANTIC.find(([pattern]) => pattern.test(value))?.[1];
}

export function getChartColor(
  reportKey: string | undefined,
  index = 0,
  label?: unknown,
): string {
  const semantic = getSemanticChartColor(label);
  if (semantic) return semantic;

  const palette = getReportChartTheme(reportKey).palette;
  const normalizedLabel = String(label ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  if (!normalizedLabel) return palette[index % palette.length];

  // Categorias mantêm a mesma cor entre renderizações, sem depender da ordem recebida.
  let hash = 0;
  for (let position = 0; position < normalizedLabel.length; position += 1) {
    hash = ((hash << 5) - hash + normalizedLabel.charCodeAt(position)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

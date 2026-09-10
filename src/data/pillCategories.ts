import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  CreditCard,
  FileText,
  Flame,
  Gift,
  Globe,
  Gauge,
  GraduationCap,
  Handshake,
  HandCoins,
  Heart,
  Landmark,
  Laptop,
  Layers,
  Megaphone,
  Music,
  Network,
  Package,
  PartyPopper,
  RefreshCw,
  Rocket,
  Route,
  Scale,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Stethoscope,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { classificacaoGrupos as gruposPagar } from "@/data/contasPagar";
import { classificacaoGrupos as gruposReceber } from "@/data/contasReceber";

/**
 * Configuração central de CATEGORIAS (não são situações/status).
 * Usada pelo StatusPill para exibir enums descritivos com label amigável
 * em português e uma variante visual discreta.
 *
 * Nada aqui altera valores enviados/recebidos pela API — é só apresentação.
 */
export type CategoryTone =
  | "success"
  | "successSoft"
  | "na"
  | "dangerSoft"
  | "special"
  | "indigo"
  | "teal"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "purple"
  | "cyan"
  | "orange"
  | "pink";

export interface CategoryPill {
  label: string;
  tone: CategoryTone;
  icon: LucideIcon;
}

/** Entrada: apenas o enum (label humanizado) ou par [enum, label]. */
type Entry = string | [string, string];

const normalizeKey = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const humanize = (raw: string) => {
  const t = normalizeKey(raw);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

const group = (tone: CategoryTone, icon: LucideIcon, entries: Entry[]) =>
  entries.map((entry) => {
    const [value, label] = Array.isArray(entry)
      ? entry
      : [entry, humanize(entry)];
    return [
      normalizeKey(value),
      { label, tone, icon } satisfies CategoryPill,
    ] as const;
  });

/* ── 3. Área de atuação ─────────────────────────────────────── */
const areasAtuacao = [
  ...group("purple", Sparkles, [
    ["CULTURA_ARTE", "Cultura e arte"],
    ["PATRIMONIO_CULTURAL", "Patrimônio cultural"],
    ["CULTURA_POPULAR", "Cultura popular"],
    ["TRADICOES_DE_MATRIZ_AFRICANA", "Tradições de matriz africana"],
    ["RELIGIOSIDADE_E_ESPIRITUALIDADE", "Religiosidade e espiritualidade"],
    ["POVOS_E_COMUNIDADES_TRADICIONAIS", "Povos e comunidades tradicionais"],
  ]),
  ...group("info", Users, [
    ["EDUCACAO", "Educação"],
    ["ASSISTENCIA_SOCIAL", "Assistência social"],
    "ESPORTE",
    ["SAUDE", "Saúde"],
    ["DIREITOS_HUMANOS", "Direitos humanos"],
    ["IGUALDADE_RACIAL", "Igualdade racial"],
    "MULHERES",
    "JUVENTUDE",
    ["CRIANCA_E_ADOLESCENTE", "Criança e adolescente"],
    "IDOSOS",
    ["PESSOAS_COM_DEFICIENCIA", "Pessoas com deficiência"],
    ["LGBTQIAPN", "LGBTQIAPN+"],
    "CIDADANIA",
  ]),
  ...group("cyan", Landmark, [
    ["MEIO_AMBIENTE", "Meio ambiente"],
    "TECNOLOGIA",
    "ECONOMIA",
    "EMPREENDEDORISMO",
    ["GERACAO_DE_RENDA", "Geração de renda"],
    ["SEGURANCA_ALIMENTAR", "Segurança alimentar"],
    ["HABITACAO", "Habitação"],
    ["PROTECAO_ANIMAL", "Proteção animal"],
    ["COMUNICACAO", "Comunicação"],
    "TURISMO",
    "PESQUISA",
    ["DESENVOLVIMENTO_COMUNITARIO", "Desenvolvimento comunitário"],
    ["POLITICAS_PUBLICAS", "Políticas públicas"],
  ]),
  ...group("neutral", Tag, [
    ["OUTRO", "Outro"],
    ["OUTROS", "Outros"],
  ]),
];

/* ── 4. Tipo de atividade ───────────────────────────────────── */
const tiposAtividade = [
  ...group("info", BookOpen, [
    "OFICINA",
    "CURSO",
    "WORKSHOP",
    "PALESTRA",
    ["SEMINARIO", "Seminário"],
    ["ATIVIDADE_EDUCATIVA", "Atividade educativa"],
  ]),
  ...group("purple", GraduationCap, [
    ["FORMACAO_CONTINUADA", "Formação continuada"],
    ["CAPACITACAO_TECNICA", "Capacitação técnica"],
  ]),
  ...group("cyan", Users, [
    ["INTEGRACAO_COMUNITARIA", "Integração comunitária"],
    ["RODA_DE_CONVERSA", "Roda de conversa"],
  ]),
];

/* ── 5. Nível da turma ──────────────────────────────────────── */
const niveisTurma = [
  ...group("info", Gauge, [["INICIANTE", "Iniciante"]]),
  ...group("warning", Gauge, [["INTERMEDIARIO", "Intermediário"]]),
  ...group("purple", Gauge, [["AVANCADO", "Avançado"]]),
];

/* ── 6. Tipo de evento ──────────────────────────────────────── */
const tiposEvento = [
  ...group("purple", Music, [
    ["APRESENTACAO", "Apresentação"],
    ["ESPETACULO", "Espetáculo"],
    "SHOW",
    "CONCERTO",
    "RECITAL",
    "PERFORMANCE",
    ["INTERVENCAO_ARTISTICA", "Intervenção artística"],
    ["EXPOSICAO", "Exposição"],
    "MOSTRA",
    ["MOSTRA_CULTURAL", "Mostra cultural"],
    ["MOSTRA_AUDIOVISUAL", "Mostra audiovisual"],
    ["EXIBICAO_AUDIOVISUAL", "Exibição audiovisual"],
    "CINECLUBE",
    ["SESSAO_DE_CINEMA", "Sessão de cinema"],
    "FESTIVAL",
    "SARAU",
    "BAILE",
    "DESFILE",
    "CORTEJO",
    ["BLOCO_CARNAVALESCO", "Bloco carnavalesco"],
    "CARNAVAL",
    ["FESTA_POPULAR", "Festa popular"],
    ["FESTA_JUNINA", "Festa junina"],
    ["FOLIA_DE_REIS", "Folia de reis"],
    ["RODA_DE_CAPOEIRA", "Roda de capoeira"],
    ["RODA_DE_SAMBA", "Roda de samba"],
    ["BATALHA_DE_RIMA", "Batalha de rima"],
    ["JAM_SESSION", "Jam session"],
    ["ENSAIO_ABERTO", "Ensaio aberto"],
    "TEMPORADA",
    ["CIRCUITO_CULTURAL", "Circuito cultural"],
    ["OCUPACAO_CULTURAL", "Ocupação cultural"],
  ]),
  ...group("cyan", GraduationCap, [
    "MINICURSO",
    ["CAPACITACAO", "Capacitação"],
    "TREINAMENTO",
    ["AULA_ABERTA", "Aula aberta"],
    "MASTERCLASS",
    ["VIVENCIA", "Vivência"],
    ["IMERSAO", "Imersão"],
    ["RESIDENCIA_ARTISTICA", "Residência artística"],
    ["LABORATORIO", "Laboratório"],
    ["FORMACAO", "Formação"],
    ["CONTACAO_DE_HISTORIAS", "Contação de histórias"],
  ]),
  ...group("info", Users, [
    ["CONFERENCIA", "Conferência"],
    "CONGRESSO",
    ["SIMPOSIO", "Simpósio"],
    ["FORUM", "Fórum"],
    "ENCONTRO",
    ["MESA_REDONDA", "Mesa redonda"],
    "DEBATE",
    ["AUDIENCIA_PUBLICA", "Audiência pública"],
    ["CONSULTA_PUBLICA", "Consulta pública"],
    ["PLENARIA", "Plenária"],
    "ASSEMBLEIA",
    ["REUNIAO", "Reunião"],
    ["REUNIAO_COMUNITARIA", "Reunião comunitária"],
  ]),
  ...group("cyan", Award, [
    ["CERTIFICACAO", "Certificação"],
    "FORMATURA",
    ["PREMIACAO", "Premiação"],
    "HOMENAGEM",
    ["INAUGURACAO", "Inauguração"],
    "POSSE",
  ]),
  ...group("neutral", Building2, [
    "SOLENIDADE",
    ["CERIMONIA", "Cerimônia"],
    ["COMEMORACAO", "Comemoração"],
    ["ANIVERSARIO_INSTITUCIONAL", "Aniversário institucional"],
    ["PRESTACAO_DE_CONTAS", "Prestação de contas"],
    ["APRESENTACAO_DE_RESULTADOS", "Apresentação de resultados"],
    ["REUNIAO_DE_ALINHAMENTO", "Reunião de alinhamento"],
    ["REUNIAO_DE_PLANEJAMENTO", "Reunião de planejamento"],
  ]),
  ...group("success", Heart, [
    ["EVENTO_COMUNITARIO", "Evento comunitário"],
    ["ACAO_SOCIAL", "Ação social"],
    ["MUTIRAO", "Mutirão"],
    "CAMPANHA",
    ["CAMPANHA_DE_ARRECADACAO", "Campanha de arrecadação"],
    ["CAMPANHA_EDUCATIVA", "Campanha educativa"],
    ["ATIVIDADE_RECREATIVA", "Atividade recreativa"],
    ["ATIVIDADE_LUDICA", "Atividade lúdica"],
    "PIQUENIQUE",
    ["CONFRATERNIZACAO", "Confraternização"],
    ["CELEBRACAO", "Celebração"],
    ["ENCONTRO_DE_FAMILIAS", "Encontro de famílias"],
  ]),
  ...group("pink", Megaphone, [
    ["COLETIVA_DE_IMPRENSA", "Coletiva de imprensa"],
    "LIVE",
    ["TRANSMISSAO_ONLINE", "Transmissão online"],
    ["PODCAST_AO_VIVO", "Podcast ao vivo"],
    ["WEBINARIO", "Webinário"],
    ["DIVULGACAO_PUBLICA", "Divulgação pública"],
    ["MOBILIZACAO_COMUNITARIA", "Mobilização comunitária"],
    "PANFLETAGEM",
    ["ACAO_ITINERANTE", "Ação itinerante"],
  ]),
  ...group("orange", Handshake, [
    ["REUNIAO_COM_PARCEIROS", "Reunião com parceiros"],
    ["REUNIAO_COM_PATROCINADORES", "Reunião com patrocinadores"],
    ["ASSINATURA_DE_TERMO", "Assinatura de termo"],
    ["LANCAMENTO_DE_PROJETO", "Lançamento de projeto"],
    ["APRESENTACAO_DE_PROJETO", "Apresentação de projeto"],
    ["VISITA_TECNICA", "Visita técnica"],
    ["VISITA_INSTITUCIONAL", "Visita institucional"],
  ]),
];

/* ── 7. Tipo de evidência ───────────────────────────────────── */
const tiposEvidencia = [
  ...group("purple", Camera, [
    ["FOTO", "Foto"],
    ["VIDEO", "Vídeo"],
  ]),
  ...group("info", Megaphone, [
    ["LINK_PUBLICACAO", "Link de publicação"],
    ["PRINT_REDE_SOCIAL", "Print de rede social"],
    ["CLIPPING", "Clipping"],
  ]),
  ...group("cyan", Users, [["LISTA_PRESENCA", "Lista de presença"]]),
  ...group("neutral", FileText, [
    ["RELATORIO", "Relatório"],
    ["DOCUMENTO", "Documento"],
  ]),
  ...group("pink", Package, [["MATERIAL_GRAFICO", "Material gráfico"]]),
  ...group("success", Award, [["CERTIFICADO", "Certificado"]]),
];

const vinculosEvidencia = [
  ...group("indigo", FileText, [["PROPOSTA_EDITAL", "Proposta de edital"]]),
  ...group("info", ClipboardCheck, [["ATIVIDADE", "Atividade"]]),
  ...group("cyan", Users, [["TURMA", "Turma"]]),
  ...group("purple", PartyPopper, [["EVENTO_CULTURAL", "Evento cultural"]]),
  ...group("pink", Megaphone, [["ACAO_DIVULGACAO", "Ação de divulgação"]]),
  ...group("success", CheckCircle2, [["PRESENCA", "Presença"]]),
];

/* ── 8. Estratégia de divulgação ────────────────────────────── */
const estrategiasDivulgacao = [
  ...group("cyan", Package, [
    ["MATERIAIS_IMPRESSOS", "Materiais impressos"],
    "CARTAZES",
    "PANFLETOS",
    "FAIXAS",
    "BANNERS",
    ["ZINES_E_CATALOGOS", "Zines e catálogos"],
  ]),
  ...group("info", Megaphone, [
    ["REDES_SOCIAIS", "Redes sociais"],
    "SITES",
    "BLOG",
    ["E_MAIL_MARKETING", "E-mail marketing"],
    ["MIDIA_LOCAL", "Mídia local"],
    ["RADIO", "Rádio"],
    ["TV", "TV"],
    ["ASSESSORIA_DE_IMPRENSA", "Assessoria de imprensa"],
    ["ANUNCIOS_PATROCINADOS", "Anúncios patrocinados"],
  ]),
  ...group("orange", Handshake, [
    ["PARCERIAS_VEICULOS_COMUNICACAO", "Parcerias com veículos de comunicação"],
    ["PARCERIAS_ORGAOS_PUBLICOS", "Parcerias com órgãos públicos"],
    [
      "PARCERIAS_INSTITUICOES_CULTURAIS",
      "Parcerias com instituições culturais",
    ],
    ["ARTICULACAO_COM_ATORES_LOCAIS", "Articulação com atores locais"],
    ["INFLUENCIADORES_E_EMBAIXADORES", "Influenciadores e embaixadores"],
  ]),
];

/* ── 9/10. Conservação e devolução ──────────────────────────── */
const conservacao = [
  ...group("success", Package, [
    ["NOVO", "Novo"],
    ["CONSERVADO", "Conservado"],
  ]),
  ...group("info", Package, [["USADO", "Usado"]]),
  ...group("warning", Package, [["DANIFICADO", "Danificado"]]),
  ...group("danger", Package, [["INUTILIZADO", "Inutilizado"]]),
];

/* ── 11. Tipo de conta bancária ─────────────────────────────── */
const tiposConta = [
  ...group("info", Landmark, [["CORRENTE", "Conta corrente"]]),
  ...group("purple", Wallet, [["POUPANCA", "Conta poupança"]]),
];

/* ── 12. Forma de pagamento/recebimento ─────────────────────── */
const formasPagamento = [
  ...group("info", CreditCard, [
    "BOLETO",
    ["CREDITO", "Crédito"],
    ["DEBITO", "Débito"],
    ["PIX", "PIX"],
    ["TRANSFERENCIA", "Transferência"],
  ]),
  ...group("neutral", Banknote, [["DINHEIRO", "Dinheiro"]]),
];

/* ── 13. Classificação do planejamento financeiro ───────────── */
const classificacaoPlanejamento = [
  ...group("info", Users, [
    ["RECURSOS_HUMANOS", "Recursos humanos"],
    ["CACHES", "Cachês"],
    ["SERVICOS_DE_TERCEIROS", "Serviços de terceiros"],
    "ENCARGOS",
  ]),
  ...group("cyan", Package, [
    ["MATERIAL_DE_CONSUMO", "Material de consumo"],
    "EQUIPAMENTOS",
    ["LOCACAO", "Locação"],
  ]),
  ...group("neutral", CalendarDays, [
    "TRANSPORTE",
    "HOSPEDAGEM",
    ["ALIMENTACAO", "Alimentação"],
    ["ACESSIBILIDADE", "Acessibilidade"],
  ]),
  ...group("pink", Megaphone, [["DIVULGACAO", "Divulgação"]]),
];

const tiposParceria = [
  ...group("teal", Building2, [["INSTITUCIONAL", "Institucional"]]),
  ...group("info", Wrench, [["TECNICA", "Técnica"]]),
  ...group("purple", Sparkles, [["CULTURAL", "Cultural"]]),
  ...group("cyan", GraduationCap, [["EDUCACIONAL", "Educacional"]]),
  ...group("pink", Heart, [["SOCIAL", "Social"]]),
  ...group("na", Building2, [["COMERCIAL", "Comercial"]]),
  ...group("info", Handshake, [["APOIO", "Apoio"]]),
  ...group("indigo", Network, [["COOPERACAO", "Cooperação"]]),
  ...group("teal", Landmark, [
    ["CESSAO_DE_ESPACO", "Cessão de Espaço"],
    ["CESSAO_DE_EQUIPAMENTO", "Cessão de Equipamento"],
  ]),
  ...group("success", Users, [["VOLUNTARIADO", "Voluntariado"]]),
  ...group("neutral", Tag, [["OUTRA", "Outra"]]),
];

const tiposFornecedor = [
  ...group("warning", Utensils, [
    "ALIMENTACAO",
    "HOSPEDAGEM",
    "GENEROS_ALIMENTICIOS",
  ]),
  ...group("info", Truck, [
    "TRANSPORTE",
    "FRETE_E_LOGISTICA",
    "COMBUSTIVEL",
    "VEICULOS",
    "PASSAGENS",
  ]),
  ...group("teal", Landmark, [
    "LOCACAO_DE_ESPACO",
    "LOCACAO_DE_EQUIPAMENTOS",
    "PALCO_E_ESTRUTURA",
    "MOBILIARIO",
    "UTENSILIOS",
  ]),
  ...group("cyan", Package, [
    "MATERIAL_DE_CONSUMO",
    "MATERIAL_DE_ESCRITORIO",
    "MATERIAL_PEDAGOGICO",
    "MATERIAL_GRAFICO",
    "MATERIAL_DE_LIMPEZA",
    "MATERIAL_DE_CONSTRUCAO",
    "UNIFORMES_E_VESTUARIO",
    "BRINDES_E_MATERIAIS_PROMOCIONAIS",
  ]),
  ...group("indigo", Laptop, [
    "EQUIPAMENTOS",
    "INFORMATICA",
    "TECNOLOGIA",
    "INTERNET_E_TELECOMUNICACOES",
    "SOFTWARE_E_SISTEMAS",
  ]),
  ...group("purple", Scale, [
    "SERVICOS_CONTABEIS",
    "SERVICOS_JURIDICOS",
    "CONSULTORIA",
    "ASSESSORIA",
    "SERVICOS_TECNICOS",
    "SERVICOS_ADMINISTRATIVOS",
  ]),
  ...group("pink", Megaphone, [
    "COMUNICACAO",
    "PUBLICIDADE_E_PROPAGANDA",
    "DESIGN_GRAFICO",
    "FOTOGRAFIA",
    "AUDIOVISUAL",
    "IMPRESSAO_E_GRAFICA",
  ]),
  ...group("success", Music, [
    "PRODUCAO_CULTURAL",
    "PRODUCAO_DE_EVENTOS",
    "SONORIZACAO",
    "ILUMINACAO",
    "DECORACAO",
    "ARTISTAS_E_PROFISSIONAIS_DA_CULTURA",
  ]),
  ...group("na", Wrench, [
    "SEGURANCA",
    "LIMPEZA",
    "MANUTENCAO",
    "SERVICOS_ELETRICOS",
    "SERVICOS_HIDRAULICOS",
    "SERVICOS_DE_CONSTRUCAO",
  ]),
  ...group("teal", Landmark, ["SERVICOS_BANCARIOS", "SEGUROS"]),
  ...group("cyan", Stethoscope, ["SAUDE", "EDUCACAO_E_CAPACITACAO"]),
];

/* ── 14/15. Classificações financeiras (reaproveita os stores) ─ */
const tonePorGrupoReceber: Record<string, CategoryTone> = {
  "Receitas de atividades e serviços": "info",
  "Contribuições e mensalidades": "cyan",
  "Doações e campanhas": "success",
  "Patrocínios e apoios": "purple",
  "Editais, prêmios e incentivos": "purple",
  "Parcerias e instrumentos jurídicos": "info",
  "Transferências e recursos públicos": "cyan",
  "Emendas parlamentares": "purple",
  "Incentivos e fundos culturais": "purple",
  "Projetos e programas": "info",
  "Fundações, institutos e cooperação": "cyan",
  "Rendimentos financeiros": "success",
  "Reembolsos e restituições": "neutral",
  "Créditos tributários": "neutral",
  "Venda de bens e patrimônio": "orange",
  "Locações e cessões de uso": "info",
  "Direitos e licenciamento": "purple",
  "Indenizações e seguros": "neutral",
  "Outras receitas": "neutral",
};

const tonePorGrupoPagar: Record<string, CategoryTone> = {
  "Pessoal e benefícios": "info",
  "Serviços profissionais": "purple",
  "Infraestrutura e manutenção": "neutral",
  Materiais: "cyan",
  "Equipamentos e patrimônio": "orange",
  "Projetos, atividades e eventos": "purple",
  "Comunicação e divulgação": "pink",
  "Tarifas e despesas financeiras": "warning",
  Tributos: "warning",
  "Projetos e repasses": "info",
  "Devoluções e ajustes": "neutral",
  "Outras despesas": "neutral",
};

const fromStore = (
  grupos: readonly {
    readonly label: string;
    readonly options: readonly {
      readonly value: string;
      readonly label: string;
    }[];
  }[],
  tones: Record<string, CategoryTone>,
  icon: LucideIcon,
) =>
  grupos.flatMap((g) =>
    g.options.map(
      (opt) =>
        [
          normalizeKey(opt.value),
          {
            label: opt.label,
            tone: tones[g.label] ?? "neutral",
            icon,
          } satisfies CategoryPill,
        ] as const,
    ),
  );

const tiposIniciativaCultural = [
  ...group("success", Sparkles, [
    ["PONTO_DE_CULTURA", "Ponto de Cultura"],
    ["PONTAO_DE_CULTURA", "Pontão de Cultura"],
  ]),
  ...group("teal", Building2, [
    "ONG_CULTURAL",
    "ASSOCIACAO_CULTURAL",
    "INSTITUTO",
    "FUNDACAO",
    "OSC",
    "OSCIP",
  ]),
  ...group("purple", Users, [
    "COLETIVO_CULTURAL",
    "GRUPO_ARTISTICO",
    "GRUPO_DE_CULTURA_POPULAR",
    "GRUPO_DE_CAPOEIRA",
    "GRUPO_DE_DANCA",
    "GRUPO_DE_TEATRO",
    "GRUPO_MUSICAL",
    "CORAL",
    "FANFARRA",
    "ORQUESTRA",
  ]),
  ...group("warning", Briefcase, [
    "PRODUTORA_CULTURAL",
    "EMPRESA_CULTURAL",
    "AGENCIA_CULTURAL",
    "MICROEMPREENDEDOR_CULTURAL",
  ]),
  ...group("cyan", Landmark, [
    "ESPACO_CULTURAL",
    "CENTRO_CULTURAL",
    "CASA_DE_CULTURA",
    "EQUIPAMENTO_CULTURAL",
    "MUSEU",
    "BIBLIOTECA_COMUNITARIA",
    "PONTO_DE_LEITURA",
    "CINECLUBE",
    "TEATRO",
    "CIRCO",
    "GALERIA_DE_ARTE",
  ]),
  ...group("pink", PartyPopper, [
    "ESCOLA_DE_SAMBA",
    "BLOCO_CARNAVALESCO",
    "FOLIA_DE_REIS",
    "CONGADO",
    "MARACATU",
  ]),
  ...group("special", Flame, [
    "TERREIRO_DE_MATRIZ_AFRICANA",
    "ORGANIZACAO_RELIGIOSA",
    "COMUNIDADE_TRADICIONAL",
  ]),
  ...group("indigo", Network, [
    "PROJETO_CULTURAL_INDEPENDENTE",
    "REDE_CULTURAL",
    "FORUM_CULTURAL",
    "MOVIMENTO_CULTURAL",
  ]),
];

const origensProjeto = [
  ...group("info", FileText, [["EDITAL", "Edital"]]),
  ...group("teal", Wallet, [["RECURSO_PROPRIO", "Recurso Próprio"]]),
  ...group("purple", Handshake, [["PARCERIA", "Parceria"]]),
  ...group("warning", Award, [["PATROCINIO", "Patrocínio"]]),
  ...group("success", Gift, [["DOACAO", "Doação"]]),
  ...group("cyan", Users, [["VOLUNTARIO", "Voluntário"]]),
  ...group("na", Building2, [["INSTITUCIONAL_PROJETO", "Institucional"]]),
];

const etapasCronograma = [
  ...group("info", CircleDashed, [["PLANEJAMENTO", "Planejamento"]]),
  ...group("cyan", Layers, [["PRE_PRODUCAO", "Pré-produção"]]),
  ...group("indigo", Route, [["PRODUCAO", "Produção"]]),
  ...group("purple", Megaphone, [["DIVULGACAO", "Divulgação"]]),
  ...group("success", Rocket, [["EXECUCAO", "Execução"]]),
  ...group("warning", ClipboardCheck, [["POS_PRODUCAO", "Pós-produção"]]),
  ...group("teal", FileText, [["PRESTACAO_CONTAS", "Prestação de Contas"]]),
];

const nomesBanco = [
  ...group("info", Landmark, [
    "BANCO_DO_BRASIL",
    "CAIXA_ECONOMICA_FEDERAL",
    "BANCO_DO_NORDESTE",
    "BANCO_DA_AMAZONIA",
    "BRB",
    "BANRISUL",
    "BANESTES",
  ]),
  ...group("teal", Building2, [
    "ITAU_UNIBANCO",
    "BRADESCO",
    "SANTANDER",
    "SAFRA",
    "BANCO_PAN",
    "BANCO_BMG",
    "BANCO_BV",
    "BANCO_DAYCOVAL",
    "BANCO_TOPAZIO",
    "BANCO_RENDIMENTO",
    "BANCO_PINE",
    "BANCO_ABC_BRASIL",
    "BANCO_MERCANTIL_DO_BRASIL",
    "BANCO_INDUSTRIAL_DO_BRASIL",
    "BANCO_RIBEIRAO_PRETO",
    "BANCO_SOFISA",
    "BANCO_FIBRA",
    "BANCO_CREFISA",
    "BANCO_DIGIMAIS",
  ]),
  ...group("purple", Smartphone, [
    "NUBANK",
    "BANCO_INTER",
    "C6_BANK",
    "AGIBANK",
    "CORA",
    "PICPAY",
    "MERCADO_PAGO",
    "PAGBANK",
    "NEON",
  ]),
  ...group("success", Users, [
    "SICOOB",
    "SICREDI",
    "CRESOL",
    "UNICRED",
    "AILOS",
  ]),
  ...group("indigo", Globe, [
    "BTG_PACTUAL",
    "BANCO_MODAL",
    "BANCO_RABOBANK",
    "CITIBANK",
    "JPMORGAN",
    "BNP_PARIBAS",
    "DEUTSCHE_BANK",
    "GOLDMAN_SACHS",
    "MORGAN_STANLEY",
    "MUFG_BANK",
  ]),
];

const origensDoador = [
  ...group("info", Globe, [["SITE", "Site"]]),
  ...group("neutral", UserPlus, [["CADASTRO_MANUAL", "Cadastro Manual"]]),
  ...group("cyan", Upload, [["IMPORTACAO", "Importação"]]),
  ...group("purple", CalendarDays, [["EVENTO", "Evento"]]),
  ...group("warning", Megaphone, [["CAMPANHA", "Campanha"]]),
  ...group("success", Heart, [["INDICACAO", "Indicação"]]),
  ...group("pink", Share2, [["REDES_SOCIAIS", "Redes Sociais"]]),
  ...group("teal", Handshake, [["PARCEIRO", "Parceiro"]]),
];

const tiposDoacaoPill = [
  ...group("success", HandCoins, [["FINANCEIRA", "Financeira"]]),
  ...group("info", Package, [["MATERIAL", "Material"]]),
  ...group("purple", Wrench, [["SERVICO", "Serviço"]]),
  ...group("teal", Laptop, [["EQUIPAMENTO", "Equipamento"]]),
  ...group("warning", Utensils, [["ALIMENTO", "Alimento"]]),
];

const origensMovimentacao = [
  ...group("danger", ArrowUpCircle, [
    ["CONTA_PAGAR", "Conta a Pagar"],
    ["CONTA_A_PAGAR", "Conta a Pagar"],
  ]),
  ...group("success", ArrowDownCircle, [
    ["CONTA_RECEBER", "Conta a Receber"],
    ["CONTA_A_RECEBER", "Conta a Receber"],
  ]),
  ...group("teal", ArrowLeftRight, [["TRANSFERENCIA", "Transferência"]]),
  ...group("warning", RefreshCw, [["ESTORNO", "Estorno"]]),
  ...group("na", SlidersHorizontal, [["AJUSTE", "Ajuste"]]),
];

const tiposFluxoCaixa = [
  ...group("success", TrendingUp, [["ENTRADA_REALIZADA", "Entrada Realizada"]]),
  ...group("danger", TrendingDown, [["SAIDA_REALIZADA", "Saída Realizada"]]),
  ...group("successSoft", CircleDashed, [
    ["ENTRADA_PREVISTA", "Entrada Prevista"],
  ]),
  ...group("dangerSoft", CircleDashed, [["SAIDA_PREVISTA", "Saída Prevista"]]),
];

/** Mapa único consultado pelo StatusPill (chaves normalizadas). */
export const categoryPills: Record<string, CategoryPill> = Object.fromEntries([
  ...fromStore(gruposReceber, tonePorGrupoReceber, Banknote),
  ...fromStore(gruposPagar, tonePorGrupoPagar, Wallet),
  ...areasAtuacao,
  ...tiposAtividade,
  ...niveisTurma,
  ...tiposEvento,
  ...tiposEvidencia,
  ...vinculosEvidencia,
  ...estrategiasDivulgacao,
  ...conservacao,
  ...tiposConta,
  ...formasPagamento,
  ...classificacaoPlanejamento,
  ...tiposParceria,
  ...tiposFornecedor,
  ...tiposIniciativaCultural,
  ...origensProjeto,
  ...etapasCronograma,
  ...nomesBanco,
  ...origensDoador,
  ...tiposDoacaoPill,
  ...origensMovimentacao,
  ...tiposFluxoCaixa,
  ...group("neutral", Tag, [
    ["OUTRO", "Outro"],
    ["OUTROS", "Outros"],
    ["OUTRA", "Outra"],
  ]),
]);

/** Label amigável de uma categoria (fallback humanizado). */
export const categoryLabel = (value?: string | null) => {
  if (!value) return "—";
  return categoryPills[normalizeKey(value)]?.label ?? humanize(value);
};

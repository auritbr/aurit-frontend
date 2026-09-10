import {
  AlertTriangle,
  Ban,
  CalendarX,
  Check,
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  CircleOff,
  Clock,
  Eye,
  FileSearch,
  FileWarning,
  Flag,
  HelpCircle,
  Hourglass,
  MinusCircle,
  Pause,
  PencilLine,
  PlayCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryPills } from "@/data/pillCategories";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ────────────────────────────────────────────────────────────
   Tons semânticos — apenas apresentação (liquid glass suave)
   ──────────────────────────────────────────────────────────── */
export type StatusTone =
  | "success" // verde — positivo/ativo/regular
  | "successSoft" // verde suave — entrada prevista/estimada
  | "complete" // índigo — concluído/confirmação final
  | "indigo" // alias de complete para categorias estruturantes
  | "info" // azul — em andamento/análise/execução
  | "warning" // âmbar — atenção/pendência/espera
  | "orange" // laranja — necessita ajuste/divergência
  | "danger" // vermelho/rosa suave — erro/atraso/não cumprimento
  | "dangerSoft" // vermelho suave — saída prevista/estimada
  | "neutral" // cinza — encerrado/cancelado/inativo
  | "na" // cinza azulado — não se aplica/não aplicável
  | "special" // roxo/índigo suave — condição especial
  | "purple" // roxo — categorias culturais/artísticas
  | "cyan" // turquesa — categorias formativas/materiais
  | "teal" // petróleo — categorias institucionais/estruturais
  | "pink"; // rosa — categorias de comunicação

const toneClass: Record<StatusTone, string> = {
  success: "status-active",
  successSoft: "status-active-soft",
  complete: "status-complete",
  indigo: "status-complete",
  info: "status-done",
  warning: "status-pending",
  orange: "status-review",
  danger: "status-expired",
  dangerSoft: "status-expired-soft",
  neutral: "status-inactive",
  na: "status-na",
  special: "status-special",
  purple: "status-special",
  cyan: "status-cyan",
  teal: "status-teal",
  pink: "status-pink",
};

type Variant = {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
  hint?: string;
};

/** Contextos de status (usados só quando o mesmo texto muda de significado visual). */
export type StatusContext =
  | "resultado-proposta"
  | "proposta-edital"
  | "prestacao-contas"
  | "presenca"
  | "plano-aula"
  | "patrimonio"
  | "pagamento-empresa"
  | "matricula-participante"
  | "habilitacao"
  | "financeiro"
  | "emprestimo"
  | "edital"
  | "diretoria"
  | "cumprimento-meta"
  | "cronograma"
  | "atividade"
  | "projeto"
  | "turma"
  | "validade-documento"
  | "meta-resultado"
  | "participante"
  | "controle-proprietario"
  | "conferencia-prestacao-contas"
  | "checklist-habilitacao"
  | "documento";

/** Normaliza acentos, caixa, underscores, hífens e espaços — apenas para lookup. */
const normalize = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Humaniza um valor não mapeado: EM_ANALISE → "Em análise" (sem acento inferido). */
const humanize = (raw: string) => {
  const words = normalize(raw).split(" ").filter(Boolean);
  if (!words.length) return "";
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
};

const v = (
  label: string,
  tone: StatusTone,
  icon: LucideIcon,
  hint?: string,
): Variant => ({
  label,
  tone,
  icon,
  hint,
});

/* ────────────────────────────────────────────────────────────
   Mapa global de status (chaves normalizadas)
   ──────────────────────────────────────────────────────────── */
const globalVariants: Record<string, Variant> = {
  /* Genéricos */
  ativo: v("Ativo", "success", Check),
  ativa: v("Ativa", "success", Check),
  inativo: v("Inativo", "neutral", Pause),
  inativa: v("Inativa", "neutral", Pause),
  concluido: v("Concluído", "complete", CheckCircle2),
  concluida: v("Concluída", "complete", CheckCircle2),
  finalizado: v("Finalizado", "success", Flag),
  finalizada: v("Finalizada", "success", Flag),
  realizado: v("Realizado", "success", CheckCircle2),
  realizada: v("Realizada", "success", CheckCircle2),
  cancelado: v("Cancelado", "neutral", Ban),
  cancelada: v("Cancelada", "neutral", Ban),
  encerrado: v("Encerrado", "neutral", CircleOff),
  encerrada: v("Encerrada", "neutral", CircleOff),
  arquivado: v("Arquivado", "neutral", CircleOff),
  arquivada: v("Arquivada", "neutral", CircleOff),
  baixado: v("Baixado", "neutral", MinusCircle),
  afastado: v("Afastado", "warning", Pause),
  aberto: v("Aberto", "success", PlayCircle),
  aberta: v("Aberta", "success", PlayCircle),
  mapeado: v("Mapeado", "info", Eye),
  mapeada: v("Mapeada", "info", Eye),
  planejado: v("Planejado", "info", CircleDashed),
  planejada: v("Planejada", "info", CircleDashed),
  agendado: v("Agendado", "warning", Clock),
  agendada: v("Agendada", "warning", Clock),
  novo: v("Novo", "success", CheckCircle2),
  nova: v("Nova", "success", CheckCircle2),
  usado: v("Usado", "info", Eye),
  usada: v("Usada", "info", Eye),
  conservado: v("Conservado", "success", ShieldCheck),
  conservada: v("Conservada", "success", ShieldCheck),
  danificado: v("Danificado", "warning", AlertTriangle),
  danificada: v("Danificada", "warning", AlertTriangle),
  inutilizado: v("Inutilizado", "neutral", CircleOff),
  inutilizada: v("Inutilizada", "neutral", CircleOff),

  disponivel: v("Disponível", "success", CheckCircle2),
  emprestado: v("Emprestado", "info", Clock),
  "em manutencao": v("Em manutenção", "warning", AlertTriangle),
  "em andamento": v("Em andamento", "info", PlayCircle),
  "em execucao": v("Em execução", "info", PlayCircle),
  "em preparacao": v("Em preparação", "info", CircleDashed),
  "em elaboracao": v("Em elaboração", "info", PencilLine),
  "em habilitacao": v("Em habilitação", "info", FileSearch),
  "em prestacao de contas": v("Em prestação de contas", "info", FileSearch),
  "em diligencia": v("Em diligência", "warning", FileWarning),
  "em regularizacao": v("Em regularização", "warning", Hourglass),
  "em espera": v("Em espera", "warning", Hourglass),
  regularizado: v("Regularizado", "success", ShieldCheck),
  regularizada: v("Regularizada", "success", ShieldCheck),
  submetida: v("Submetida", "info", Send),
  submetido: v("Submetido", "info", Send),
  enviada: v("Enviada", "info", Send),
  enviado: v("Enviado", "info", Send),
  enviando: v("Enviando", "info", Clock),
  erro: v("Erro", "danger", XCircle),
  "documentacao enviada": v("Documentação enviada", "info", Send),
  "documentacao pendente": v("Documentação pendente", "warning", FileWarning),
  "recurso enviado": v("Recurso enviado", "info", Send),
  "aguardando documentos": v("Aguardando documentos", "warning", Hourglass),
  "pronta para envio": v("Pronta para envio", "info", Send),
  "nao iniciada": v("Não iniciada", "neutral", CircleDashed),
  "nao iniciado": v("Não iniciado", "neutral", CircleDashed),
  anexado: v("Anexado", "success", CheckCircle2),
  anexada: v("Anexada", "success", CheckCircle2),
  matriculado: v("Matriculado", "success", CheckCircle2),
  matriculada: v("Matriculada", "success", CheckCircle2),
  desistente: v("Desistente", "danger", XCircle),
  presente: v("Presente", "success", CheckCircle2),
  ausente: v("Ausente", "danger", XCircle),
  "nao teve aula": v("Não teve aula", "na", CircleOff),
  feriado: v("Feriado", "special", Sun),
  devolvido: v("Devolvido", "success", CheckCheck),
  devolvida: v("Devolvida", "success", CheckCheck),
  atrasado: v("Atrasado", "danger", AlertTriangle),
  atrasada: v("Atrasada", "danger", AlertTriangle),
  pago: v("Pago", "success", CheckCircle2),
  paga: v("Paga", "success", CheckCircle2),
  liquidado: v("Liquidado", "success", CheckCircle2),
  liquidada: v("Liquidada", "success", CheckCircle2),
  recebido: v("Recebido", "success", CheckCircle2),
  recebida: v("Recebida", "success", CheckCircle2),
  aprovado: v("Aprovado", "success", CheckCircle2),
  aprovada: v("Aprovada", "success", CheckCircle2),
  "aprovada com ressalvas": v("Aprovada com ressalvas", "special", Sparkles),
  "aprovado com ressalvas": v("Aprovado com ressalvas", "special", Sparkles),
  reprovado: v("Reprovado", "danger", XCircle),
  reprovada: v("Reprovada", "danger", XCircle),
  suplente: v("Suplente", "warning", Hourglass),
  "nao classificado": v("Não classificado", "danger", XCircle),
  "nao classificada": v("Não classificada", "danger", XCircle),
  habilitado: v("Habilitado", "success", ShieldCheck),
  habilitada: v("Habilitada", "success", ShieldCheck),
  inabilitado: v("Inabilitado", "danger", XCircle),
  inabilitada: v("Inabilitada", "danger", XCircle),
  "habilitada apos recurso": v("Habilitada após recurso", "special", Sparkles),
  "habilitado apos recurso": v("Habilitado após recurso", "special", Sparkles),
  "inabilitada definitivo": v("Inabilitada definitivamente", "danger", XCircle),
  "inabilitada definitiva": v("Inabilitada definitivamente", "danger", XCircle),
  "inabilitada definitivamente": v(
    "Inabilitada definitivamente",
    "danger",
    XCircle,
  ),
  "resultado publicado": v("Resultado publicado", "special", Sparkles),
  "cumprida integralmente": v("Cumprida integralmente", "success", CheckCheck),
  "cumprida parcialmente": v("Cumprida parcialmente", "warning", AlertTriangle),
  "nao cumprida": v("Não cumprida", "danger", XCircle),
  "com divergencia": v("Com divergência", "orange", FileWarning),
  "necessita ajuste": v("Necessita ajuste", "orange", PencilLine),
  "necessita revisao": v(
    "Necessita revisão",
    "warning",
    PencilLine,
    "O documento precisa ser revisto ou corrigido.",
  ),
  "nao se aplica": v(
    "Não se aplica",
    "na",
    MinusCircle,
    "Este item não é necessário para este cadastro.",
  ),
  "nao aplicavel": v("Não aplicável", "na", MinusCircle),

  /* Documentais */
  pendente: v(
    "Pendente",
    "warning",
    Clock,
    "Ainda possui informações ou ações pendentes.",
  ),
  /* Conciliação bancária */
  conciliada: v(
    "Conciliada",
    "success",
    CheckCircle2,
    "Vinculada a um registro financeiro da Aurit.",
  ),
  conciliado: v("Conciliado", "success", CheckCircle2),
  sugerida: v(
    "Sugestão encontrada",
    "info",
    Search,
    "A Aurit encontrou uma possível correspondência.",
  ),
  "sugestao encontrada": v("Sugestão encontrada", "info", Search),
  divergente: v(
    "Divergente",
    "orange",
    AlertTriangle,
    "Os dados do extrato não correspondem ao registro.",
  ),
  ignorada: v(
    "Ignorada",
    "neutral",
    MinusCircle,
    "Marcada para não ser conciliada.",
  ),
  ignorado: v("Ignorado", "neutral", MinusCircle),
  "precisa de revisao": v("Precisa de revisão", "warning", Clock),

  atualizado: v(
    "Atualizado",
    "success",
    CheckCircle2,
    "O documento está válido e atualizado.",
  ),
  atualizada: v("Atualizada", "success", CheckCircle2),
  vencido: v(
    "Vencido",
    "danger",
    CalendarX,
    "O prazo de validade já terminou.",
  ),
  vencida: v("Vencida", "danger", CalendarX),
  vigente: v("Vigente", "success", ShieldCheck, "Dentro do prazo de validade."),
  "sem validade": v(
    "Sem validade",
    "na",
    MinusCircle,
    "Documento sem data de validade cadastrada.",
  ),
  justificado: v(
    "Justificado",
    "warning",
    FileWarning,
    "Ausência justificada.",
  ),
  justificada: v("Justificada", "warning", FileWarning),
  "sem prazo": v(
    "Sem prazo",
    "na",
    CircleDashed,
    "Sem datas planejadas cadastradas.",
  ),
  "prazo encerrado": v(
    "Prazo encerrado",
    "neutral",
    CalendarX,
    "A data final planejada já passou.",
  ),
  "nao informado": v("Não informado", "na", HelpCircle),
  "em analise": v("Em análise", "info", Search, "O item está sendo analisado."),
};

/** Sobrescritas por contexto — só quando o significado visual muda. */
const contextVariants: Partial<
  Record<StatusContext, Record<string, Partial<Variant>>>
> = {
  edital: {
    aberto: { tone: "success", icon: PlayCircle },
    mapeado: { tone: "info", icon: Eye },
    arquivado: { tone: "na", icon: CircleOff },
  },
  presenca: {
    feriado: { tone: "special", icon: Sun },
    "nao teve aula": { tone: "na", icon: CircleOff },
  },
  "checklist-habilitacao": {
    anexado: { tone: "success", icon: CheckCircle2 },
    "necessita ajuste": { tone: "orange", icon: PencilLine },
  },
  "conferencia-prestacao-contas": {
    "com divergencia": { tone: "orange", icon: FileWarning },
  },
  "prestacao-contas": {
    "pronta para envio": { tone: "info", icon: Send },
  },
  diretoria: {
    afastado: { tone: "warning", icon: Pause },
  },
  cronograma: {
    "em andamento": { tone: "info", icon: PlayCircle },
  },
};

function resolve(status: string, context?: StatusContext): Variant | undefined {
  const key = normalize(status);
  const base = globalVariants[key];
  const override = context ? contextVariants[context]?.[key] : undefined;
  const category = !base && !override ? categoryPills[key] : undefined;
  if (category)
    return { label: category.label, tone: category.tone, icon: category.icon };
  if (!base && !override) return undefined;
  return {
    ...(base ?? { label: humanize(status), tone: "neutral", icon: HelpCircle }),
    ...override,
  };
}

/** Texto humanizado de um status — use em exportações, relatórios e filtros. */
export function statusLabel(
  status?: string | null,
  context?: StatusContext,
): string {
  if (!status) return "—";
  return resolve(status, context)?.label ?? humanize(status);
}

/** Tom semântico de um status (para casos raros de estilização derivada). */
export function statusTone(
  status?: string | null,
  context?: StatusContext,
): StatusTone {
  if (!status) return "neutral";
  return resolve(status, context)?.tone ?? "neutral";
}

export interface StatusPillProps {
  status: string;
  context?: StatusContext;
  size?: "sm" | "md";
  className?: string;
  /** `false` esconde o ícone; ou passe um ícone Lucide próprio. */
  icon?: boolean | LucideIcon;
  /** Compatibilidade retroativa. */
  showIcon?: boolean;
  /** `true` usa a dica padrão da variante; string define um texto próprio. */
  tooltip?: string | boolean;
  /** Rótulo acessível: "Status: X" por padrão. */
  ariaLabelPrefix?: string;
  interactive?: boolean;
  /** Permite quebra controlada para rótulos extensos em cards e painéis. */
  wrap?: boolean;
  onClick?: () => void;
}

const warned = new Set<string>();

export function StatusPill({
  status,
  context,
  size = "sm",
  className,
  icon,
  showIcon = true,
  tooltip,
  ariaLabelPrefix = "Status",
  interactive = false,
  wrap = false,
  onClick,
}: StatusPillProps) {
  const variant = resolve(status, context);

  if (!variant && status && import.meta.env.DEV) {
    const key = `${context ?? "global"}:${normalize(status)}`;
    if (!warned.has(key)) {
      warned.add(key);
      // eslint-disable-next-line no-console
      console.warn(
        `[StatusPill] status não mapeado: "${status}"${context ? ` (contexto: ${context})` : ""}`,
      );
    }
  }

  const label = variant?.label ?? (status ? humanize(status) : "Não informado");
  const tone = toneClass[variant?.tone ?? "neutral"];
  const CustomIcon = typeof icon === "function" ? icon : undefined;
  const Icon = CustomIcon ?? variant?.icon ?? HelpCircle;
  const visible = icon === false ? false : showIcon;
  const tooltipText =
    typeof tooltip === "string"
      ? tooltip
      : tooltip === true
        ? (variant?.hint ?? label)
        : undefined;

  const content = (
    <>
      {visible && (
        <Icon
          aria-hidden="true"
          className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"}
          strokeWidth={2.25}
        />
      )}
      {label}
    </>
  );

  const classes = cn(
    "status-pill",
    tone,
    size === "md" && "status-pill-md",
    interactive && "status-pill-interactive",
    wrap && "status-pill-wrap",
    className,
  );
  const ariaLabel = `${ariaLabelPrefix}: ${label}`;

  const pill = interactive ? (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  ) : (
    <span className={classes} aria-label={ariaLabel}>
      {content}
    </span>
  );

  if (!tooltipText) return pill;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

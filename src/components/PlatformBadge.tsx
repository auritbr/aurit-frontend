import {
  PLANO_LABELS,
  ROLE_LABELS,
  STATUS_EMPRESA_LABELS,
  STATUS_PAGAMENTO_LABELS,
  STATUS_USUARIO_LABELS,
  TIPO_LOG_LABELS,
  type StatusControleProprietario,
  type StatusPagamento,
  type StatusUsuarioPlataforma,
  type TipoLogAcesso,
  type TipoPlano,
  type UserRoleEmpresa,
} from "@/data/controleProprietario";

function BadgeBase({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const variants = {
    neutral: "bg-muted text-muted-foreground border-border",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    danger:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900",
  };

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function PlanoBadge({ plano }: { plano: TipoPlano }) {
  return (
    <BadgeBase variant={plano === "PLANO_PAGO" ? "info" : "neutral"}>
      {PLANO_LABELS[plano] ?? plano}
    </BadgeBase>
  );
}

export function StatusEmpresaBadge({
  status,
}: {
  status: StatusControleProprietario;
}) {
  return (
    <BadgeBase variant={status === "ATIVO" ? "success" : "danger"}>
      {STATUS_EMPRESA_LABELS[status] ?? status}
    </BadgeBase>
  );
}

export function RoleBadge({ role }: { role: UserRoleEmpresa }) {
  return (
    <BadgeBase variant={role === "ADMIN" ? "info" : "neutral"}>
      {ROLE_LABELS[role] ?? role}
    </BadgeBase>
  );
}

export function StatusUsuarioBadge({
  status,
}: {
  status: StatusUsuarioPlataforma;
}) {
  return (
    <BadgeBase variant={status === "ATIVO" ? "success" : "danger"}>
      {STATUS_USUARIO_LABELS[status] ?? status}
    </BadgeBase>
  );
}

export function StatusPagamentoBadge({
  status,
}: {
  status: StatusPagamento;
}) {
  const variant =
    status === "PAGO"
      ? "success"
      : status === "ATRASADO"
        ? "danger"
        : status === "CANCELADO"
          ? "neutral"
          : "warning";

  return (
    <BadgeBase variant={variant}>
      {STATUS_PAGAMENTO_LABELS[status] ?? status}
    </BadgeBase>
  );
}

export function TipoLogBadge({
  tipo,
}: {
  tipo: TipoLogAcesso | string | null | undefined;
}) {
  const variant =
    tipo === "LOGIN_SUCESSO"
      ? "success"
      : tipo === "LOGIN_FALHA"
        ? "danger"
        : tipo === "LOGOUT"
          ? "neutral"
          : tipo === "CRIACAO"
            ? "success"
            : tipo === "EDICAO"
              ? "warning"
              : tipo === "EXCLUSAO"
                ? "danger"
                : tipo === "VISUALIZACAO"
                  ? "info"
                  : tipo === "ALTERACAO_STATUS"
                    ? "warning"
                    : tipo === "GERACAO_DOCUMENTO"
                      ? "info"
                      : tipo === "ACESSO_NEGADO"
                        ? "danger"
                        : tipo === "TOKEN_INVALIDO"
                          ? "danger"
                          : "neutral";

  const label =
    tipo && tipo in TIPO_LOG_LABELS
      ? TIPO_LOG_LABELS[tipo as TipoLogAcesso]
      : tipo || "—";

  return <BadgeBase variant={variant}>{label}</BadgeBase>;
}
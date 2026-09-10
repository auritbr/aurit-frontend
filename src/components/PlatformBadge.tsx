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
  type TipoPlanoVisual,
  type UserRoleEmpresa,
} from "@/data/controleProprietario";

function BadgeBase({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "danger" | "warning" | "info" | "purple";
}) {
  const variants = {
    neutral: "status-inactive",
    success: "status-active",
    danger: "status-expired",
    warning: "status-pending",
    info: "status-done",
    purple: "status-special",
  };

  return <span className={`status-pill ${variants[variant]}`}>{children}</span>;
}

export function PlanoBadge({ plano }: { plano: TipoPlanoVisual }) {
  const variant =
    plano === "PLANO_CORTESIA"
      ? "purple"
      : plano === "PLANO_PAGO"
        ? "info"
        : "neutral";

  return (
    <BadgeBase variant={variant}>{PLANO_LABELS[plano] ?? plano}</BadgeBase>
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

export function StatusPagamentoBadge({ status }: { status: StatusPagamento }) {
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

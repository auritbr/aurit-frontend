import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  PackageOpen,
  UserRoundX,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  carregarAlertasPrazo,
  formatDateBR,
  type AlertaResumo,
  type AlertaSeveridade,
  type AusenciaConsecutiva,
} from "@/lib/alertasPrazo";

type Tone = "danger" | "warning";

const toneBySev: Record<AlertaSeveridade, Tone> = {
  vencido: "danger",
  hoje: "warning",
  proximo: "warning",
};

const toneStyles: Record<
  Tone,
  {
    card: string;
    accent: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  danger: {
    card: "border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/30",
    accent: "bg-rose-400 dark:bg-rose-500",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-100 dark:bg-rose-900/40",
    badgeText: "text-rose-700 dark:text-rose-300",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30",
    accent: "bg-amber-400 dark:bg-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-800 dark:text-amber-300",
  },
};

const statusLabel: Record<AlertaSeveridade, string> = {
  vencido: "Prazo vencido",
  hoje: "Vence hoje",
  proximo: "Atenção ao prazo",
};

interface PopupProps {
  title: string;
  description: string;
  icon: LucideIcon;
  severity: AlertaSeveridade;
  statusText?: string;
  ctaLabel: string;
  ctaPath: string;
  itemLabel: string;
  dateLabel: string;
  items: Array<{
    name: string;
    date: string;
    details?: Array<{ label: string; value: string }>;
  }>;
  total: number;
  showAllItems?: boolean;
  onDismiss: () => void;
}

function PopupCard({
  title,
  description,
  icon: Icon,
  severity,
  statusText,
  ctaLabel,
  ctaPath,
  itemLabel,
  dateLabel,
  items,
  total,
  showAllItems = false,
  onDismiss,
}: PopupProps) {
  const navigate = useNavigate();
  const tone = toneStyles[toneBySev[severity]];
  const StatusIcon = severity === "vencido" ? AlertTriangle : Clock;
  const visibleItems = showAllItems ? items : items.slice(0, 2);

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-lg border shadow-md animate-in slide-in-from-bottom-4 fade-in duration-300 ${tone.card}`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-1 ${tone.accent}`}
        aria-hidden
      />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar alerta"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="py-4 pl-5 pr-10">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${tone.badgeBg} ${tone.badgeText}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusText ?? statusLabel[severity]}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${tone.iconBg}`}
          >
            <Icon className={`h-4 w-4 ${tone.iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {visibleItems.length > 0 && (
          <div
            className={`mt-3 space-y-1.5 rounded-md border border-border/60 bg-background/70 px-3 py-2 ${showAllItems ? "max-h-[260px] overflow-y-auto pr-2" : ""
              }`}
          >
            {visibleItems.map((item, index) => (
              <div
                key={`${item.name}-${item.date}-${index}`}
                className="space-y-0.5 border-b border-border/50 pb-1.5 text-[12px] last:border-b-0 last:pb-0"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-muted-foreground">
                    {itemLabel}:
                  </span>
                  <span className="min-w-0 break-words font-medium text-foreground">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-muted-foreground">
                    {dateLabel}:
                  </span>
                  <span className="min-w-0 break-words text-foreground">
                    {item.date}
                  </span>
                </div>
                {item.details?.map((detail) => (
                  <div
                    key={`${detail.label}-${detail.value}`}
                    className="flex items-baseline gap-1.5"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {detail.label}:
                    </span>
                    <span className="min-w-0 break-words text-foreground">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!showAllItems && total > visibleItems.length && (
              <p className="border-t border-border/60 pt-1 text-[11px] text-muted-foreground">
                +{total - visibleItems.length} outro
                {total - visibleItems.length > 1 ? "s itens" : " item"} na lista
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-8"
            onClick={() => {
              onDismiss();
              navigate(ctaPath);
            }}
          >
            {ctaLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_ALERTS = {
  emprestimos: null,
  patrimonioNomePorId: {} as Record<string, string>,
  editais: null,
  ausencias: [] as AusenciaConsecutiva[],
};

const SK_AUSENCIAS = "alertas.ausencias.v3";

function resumoSignature<T extends { id: string }>(
  resumo: AlertaResumo<T> | null,
) {
  if (!resumo) return "";

  return [...resumo.vencidos, ...resumo.hoje, ...resumo.proximos]
    .map(({ item, dias }) => `${item.id}:${dias}`)
    .sort()
    .join("|");
}

function readDismissed(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeDismissed(key: string, signature: string) {
  try {
    sessionStorage.setItem(key, signature);
  } catch {
    // O alerta continua funcionando quando o storage não está disponível.
  }
}

function prazoMessage(r: AlertaResumo<unknown>, tipo: "emprestimo" | "edital") {
  if (r.vencidos.length) {
    return tipo === "emprestimo"
      ? "Há empréstimos cuja devolução já venceu e que ainda não foram marcados como devolvidos."
      : "Há editais cujo prazo de encerramento já terminou.";
  }

  if (r.hoje.length) {
    return tipo === "emprestimo"
      ? "Há empréstimos com devolução prevista para hoje."
      : "Há editais cujo prazo se encerra hoje.";
  }

  const temCincoDias = r.proximos.some(({ dias }) => dias === 5);
  const dias = temCincoDias ? 5 : 10;
  return tipo === "emprestimo"
    ? `Há empréstimos com devolução prevista para daqui a ${dias} dias.`
    : `Há editais cujo prazo se encerra daqui a ${dias} dias.`;
}

interface AlertasPrazoNotifierProps {
  documentosNotifierHeight?: number;
}

export function AlertasPrazoNotifier({
  documentosNotifierHeight = 0,
}: AlertasPrazoNotifierProps) {
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const [alerts, setAlerts] = useState(EMPTY_ALERTS);
  const [dismissed, setDismissed] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener("presencas:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("presencas:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void carregarAlertasPrazo().then((result) => {
      if (mounted) setAlerts(result);
    });

    return () => {
      mounted = false;
    };
  }, [location.pathname, tick]);

  const empSignature = useMemo(
    () => resumoSignature(alerts.emprestimos),
    [alerts.emprestimos],
  );
  const editalSignature = useMemo(
    () => resumoSignature(alerts.editais),
    [alerts.editais],
  );
  const ausenciaSignature = useMemo(
    () =>
      alerts.ausencias
        .map(
          (item) =>
            `${item.participanteId}:${item.atividadeId}:${item.turmaId ?? item.turmaNome ?? "sem-turma"
            }:${item.quantidade}:${item.ultimaAusencia}`,
        )
        .sort()
        .join("|"),
    [alerts.ausencias],
  );

  const isDismissed = (key: string, signature: string) =>
    Boolean(signature) && (dismissed[key] ?? readDismissed(key)) === signature;

  const dismiss = (key: string, signature: string) => {
    writeDismissed(key, signature);
    setDismissed((current) => ({ ...current, [key]: signature }));
  };

  const showEmp =
    alerts.emprestimos &&
    !location.pathname.startsWith("/emprestimos") &&
    !isDismissed("alertas.emprestimos", empSignature);
  const showEdital =
    alerts.editais &&
    !location.pathname.startsWith("/editais") &&
    !isDismissed("alertas.editais", editalSignature);
  const showAusencias =
    alerts.ausencias.length > 0 &&
    !isDismissed(SK_AUSENCIAS, ausenciaSignature);

  if (!showEmp && !showEdital && !showAusencias) return null;

  const emprestimoItems = alerts.emprestimos
    ? [
      ...alerts.emprestimos.vencidos,
      ...alerts.emprestimos.hoje,
      ...alerts.emprestimos.proximos,
    ]
    : [];
  const editalItems = alerts.editais
    ? [
      ...alerts.editais.vencidos,
      ...alerts.editais.hoje,
      ...alerts.editais.proximos,
    ]
    : [];

  const bottom =
    16 + (documentosNotifierHeight > 0 ? documentosNotifierHeight + 12 : 0);

  return (
    <div
      className="pointer-events-none fixed right-4 z-50 flex flex-col-reverse items-end gap-3 overflow-y-auto"
      style={{
        bottom,
        maxHeight: `calc(100vh - ${bottom + 16}px)`,
      }}
    >
      {showEmp && alerts.emprestimos && (
        <PopupCard
          title="Devolução de empréstimo"
          description={prazoMessage(alerts.emprestimos, "emprestimo")}
          icon={PackageOpen}
          severity={alerts.emprestimos.topo}
          ctaLabel="Ver empréstimos"
          ctaPath="/emprestimos"
          itemLabel="Item"
          dateLabel="Data de devolução"
          items={emprestimoItems.map(({ item }) => ({
            name:
              alerts.patrimonioNomePorId[item.patrimonioId] ||
              `Empréstimo #${item.id}`,
            date: formatDateBR(item.dataPrevistaDevolucao),
          }))}
          total={alerts.emprestimos.total}
          onDismiss={() => dismiss("alertas.emprestimos", empSignature)}
        />
      )}

      {showEdital && alerts.editais && (
        <PopupCard
          title="Prazo de edital"
          description={prazoMessage(alerts.editais, "edital")}
          icon={CalendarClock}
          severity={alerts.editais.topo}
          ctaLabel="Ver editais"
          ctaPath="/editais"
          itemLabel="Edital"
          dateLabel="Data de encerramento"
          items={editalItems.map(({ item }) => ({
            name: item.nomeEdital || "Edital sem nome",
            date: formatDateBR(item.dataEncerramento),
          }))}
          total={alerts.editais.total}
          onDismiss={() => dismiss("alertas.editais", editalSignature)}
        />
      )}

      {showAusencias && (
        <PopupCard
          title="Ausências consecutivas"
          description="Há participantes com 3 ou mais ausências consecutivas na mesma atividade."
          icon={UserRoundX}
          severity="vencido"
          statusText="Requer atenção"
          ctaLabel="Ver presenças"
          ctaPath="/presencas"
          itemLabel="Participante"
          dateLabel="Atividade"
          items={alerts.ausencias.map((item) => ({
            name: item.participanteNome,
            date: item.atividadeNome,
            details: [
              ...(item.turmaNome
                ? [{ label: "Turma", value: item.turmaNome }]
                : []),
              {
                label: "Ausências",
                value: `${item.quantidade} consecutivas`,
              },
            ],
          }))}
          total={alerts.ausencias.length}
          showAllItems
          onDismiss={() => dismiss(SK_AUSENCIAS, ausenciaSignature)}
        />
      )}
    </div>
  );
}
import { useEffect, useState, type ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  FileText,
  PackageOpen,
  UserRoundX,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatDateBR as formatDocumentoDateBR,
  getDocumentos,
  isDocumentoVencido,
  tipoDocumentoLabels,
} from "@/data/documentos";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  carregarAlertasPrazo,
  formatDateBR,
  type AlertasPrazoCarregados,
  type AlertaSeveridade,
} from "@/lib/alertasPrazo";
import { isPlanoGratuitoAtual } from "@/lib/plano";

type AlertaTipo = "edital" | "emprestimo" | "documento" | "presenca";
type SeveridadePopover = AlertaSeveridade | "atencao";

interface AlertaItem {
  id: string;
  tipo: AlertaTipo;
  titulo: string;
  itemLabel: string;
  itemValue: string;
  dataLabel: string;
  dataValue: string;
  severidade: SeveridadePopover;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

const severidadeLabel: Record<SeveridadePopover, string> = {
  vencido: "Vencido",
  hoje: "Vence hoje",
  proximo: "Próximo do vencimento",
  atencao: "Requer atenção",
};

const severidadeStyle: Record<SeveridadePopover, string> = {
  vencido: "bg-destructive/10 text-destructive",
  hoje: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  proximo: "bg-primary/10 text-primary",
  atencao: "bg-destructive/10 text-destructive",
};

function severidadePrazo(dias: number): AlertaSeveridade {
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoje";
  return "proximo";
}

function buildAlertasPrazo(data: AlertasPrazoCarregados): AlertaItem[] {
  const out: AlertaItem[] = [];

  if (data.editais) {
    const items = [
      ...data.editais.vencidos,
      ...data.editais.hoje,
      ...data.editais.proximos,
    ];

    for (const { item, dias } of items) {
      out.push({
        id: `ed-${item.id}`,
        tipo: "edital",
        titulo: "Prazo de edital",
        itemLabel: "Edital",
        itemValue: item.nomeEdital || "Edital sem nome",
        dataLabel: dias < 0 ? "Encerrado em" : "Encerramento",
        dataValue: formatDateBR(item.dataEncerramento),
        severidade: severidadePrazo(dias),
        to: "/editais",
        icon: CalendarClock,
      });
    }
  }

  if (data.emprestimos) {
    const items = [
      ...data.emprestimos.vencidos,
      ...data.emprestimos.hoje,
      ...data.emprestimos.proximos,
    ];

    for (const { item, dias } of items) {
      out.push({
        id: `emp-${item.id}`,
        tipo: "emprestimo",
        titulo: "Devolução de empréstimo",
        itemLabel: "Item",
        itemValue:
          data.patrimonioNomePorId[item.patrimonioId] ||
          `Item #${item.patrimonioId}`,
        dataLabel: "Devolução",
        dataValue: formatDateBR(item.dataPrevistaDevolucao),
        severidade: severidadePrazo(dias),
        to: "/emprestimos",
        icon: PackageOpen,
      });
    }
  }

  for (const item of data.ausencias) {
    out.push({
      id: `presenca-${item.participanteId}-${item.atividadeId}`,
      tipo: "presenca",
      titulo: "Ausências consecutivas",
      itemLabel: "Participante",
      itemValue: item.participanteNome,
      dataLabel: "Atividade",
      dataValue: `${item.atividadeNome} · ${item.quantidade} ausências`,
      severidade: "atencao",
      to: "/presencas",
      icon: UserRoundX,
    });
  }

  return out;
}

async function getDocumentosAlertas(): Promise<AlertaItem[]> {
  try {
    if (await isPlanoGratuitoAtual()) return [];

    const documentos = await getDocumentos();

    return documentos
      .filter(
        (documento) =>
          documento.statusDocumento !== "NAO_SE_APLICA" &&
          isDocumentoVencido(documento),
      )
      .map((documento) => ({
        id: `doc-${documento.id}`,
        tipo: "documento" as const,
        titulo: "Documento vencido",
        itemLabel: "Documento",
        itemValue:
          tipoDocumentoLabels[documento.tipoDocumento] ??
          documento.tipoDocumento,
        dataLabel: "Validade",
        dataValue: formatDocumentoDateBR(documento.dataValidade),
        severidade: "vencido" as const,
        to: "/documentos",
        icon: FileText,
      }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!isPlanoAccessDenied(message)) {
      console.error("Erro ao carregar alertas de documentos:", error);
    }

    return [];
  }
}

const severidadeOrder: Record<SeveridadePopover, number> = {
  vencido: 0,
  atencao: 0,
  hoje: 1,
  proximo: 2,
};

export function AlertasPopover() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener("documentos:changed", refresh);
    window.addEventListener("presencas:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("documentos:changed", refresh);
      window.removeEventListener("presencas:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAlertas() {
      setLoading(true);

      const [prazos, documentos] = await Promise.all([
        carregarAlertasPrazo(),
        getDocumentosAlertas(),
      ]);

      if (!active) return;

      const todos = [...buildAlertasPrazo(prazos), ...documentos];
      todos.sort(
        (a, b) => severidadeOrder[a.severidade] - severidadeOrder[b.severidade],
      );

      setAlertas(todos);
      setLoading(false);
    }

    void loadAlertas();

    return () => {
      active = false;
    };
  }, [location.pathname, tick]);

  const total = alertas.length;

  const handleClick = (alerta: AlertaItem) => {
    setOpen(false);
    navigate(alerta.to);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Alertas pendentes"
          className="relative flex h-9 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          {total > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-1.5rem))] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Alertas pendentes
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {loading
                ? "Carregando alertas..."
                : total === 0
                  ? "Tudo em dia"
                  : `${total} ${total === 1 ? "item precisa" : "itens precisam"} da sua atenção`}
            </p>
          </div>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </div>

        {!loading && total === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Nenhum alerta pendente
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Você será notificado quando surgir algo novo.
            </p>
          </div>
        ) : loading ? (
          <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
            Carregando alertas...
          </div>
        ) : (
          <ScrollArea className="max-h-[360px] w-full">
            <ul className="w-full min-w-0 divide-y divide-border overflow-hidden">
              {alertas.map((alerta) => {
                const Icon = alerta.icon;

                return (
                  <li key={alerta.id} className="w-full min-w-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleClick(alerta)}
                      className="w-full min-w-0 max-w-full overflow-hidden px-4 py-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <p className="min-w-0 break-words text-[13px] font-medium text-foreground">
                              {alerta.titulo}
                            </p>
                            <span
                              className={`flex-shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${severidadeStyle[alerta.severidade]}`}
                            >
                              {severidadeLabel[alerta.severidade]}
                            </span>
                          </div>
                          <p className="mt-0.5 whitespace-normal break-words text-[11px] text-muted-foreground">
                            <span className="text-foreground/80">
                              {alerta.itemLabel}:
                            </span>{" "}
                            {alerta.itemValue}
                          </p>
                          <p className="mt-0.5 whitespace-normal break-words text-[11px] text-muted-foreground">
                            <span className="text-foreground/80">
                              {alerta.dataLabel}:
                            </span>{" "}
                            {alerta.dataValue}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

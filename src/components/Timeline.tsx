import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, History, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dataISO } from "@/lib/periodComparison";
export interface TimelineItem {
  id: string;
  data: string;
  titulo: string;
  descricao?: string;
  icon?: LucideIcon;
  tipo?: "realizado" | "previsto";
  href?: string;
}
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export function Timeline({
  items,
  pageSize = 20,
  emptyMessage = "Nenhum acontecimento identificável nos registros disponíveis.",
  ordem = "desc",
  paginacaoLocal = true,
}: {
  items: TimelineItem[];
  pageSize?: number;
  emptyMessage?: string;
  ordem?: "asc" | "desc";
  paginacaoLocal?: boolean;
}) {
  const tamanho = Math.max(1, Math.floor(pageSize) || 20);
  const [limite, setLimite] = useState(tamanho);
  const ordenados = useMemo(
    () =>
      items
        .filter((i) => i.data === "" || !!dataISO(i.data))
        .sort((a, b) => {
          if (!a.data || !b.data) return Number(!a.data) - Number(!b.data);
          return ordem === "desc"
            ? b.data.localeCompare(a.data)
            : a.data.localeCompare(b.data);
        }),
    [items, ordem],
  );
  const grupos = new Map<string, TimelineItem[]>();
  (paginacaoLocal ? ordenados.slice(0, limite) : ordenados).forEach((item) => {
    const k = item.data.slice(0, 7);
    grupos.set(k, [...(grupos.get(k) ?? []), item]);
  });
  if (!ordenados.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-border/70 px-4 py-8 text-center">
        <History className="h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-[12.5px] text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  return (
    <div className="space-y-5">
      {Array.from(grupos, ([mes, lista]) => {
        const [ano, m] = mes.split("-");
        const titulo = mes
          ? `${MESES[Number(m) - 1]} de ${ano}`
          : "Sem data registrada";
        return (
          <section key={mes} aria-label={titulo}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {titulo}
            </h3>
            <ol className="relative ml-3 border-l border-border/70">
              {lista.map((item) => {
                const previsto = item.tipo === "previsto",
                  Icon = previsto ? CalendarClock : (item.icon ?? History);
                return (
                  <li key={item.id} className="relative pb-4 pl-6 last:pb-0">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-[11px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-card",
                        previsto
                          ? "border-dashed border-muted-foreground/50 text-muted-foreground"
                          : "border-primary/30 text-primary",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-[13px] font-medium">{item.titulo}</p>
                      {previsto && (
                        <span className="rounded-full border border-dashed border-border px-1.5 text-[10.5px] text-muted-foreground">
                          Previsto
                        </span>
                      )}
                    </div>
                    {item.data && (
                      <time
                        dateTime={item.data}
                        className="text-[11.5px] text-muted-foreground"
                      >
                        {item.data.slice(0, 10).split("-").reverse().join("/")}
                        {item.data.includes("T")
                          ? ` às ${item.data.slice(11, 16)}`
                          : ""}
                      </time>
                    )}
                    {item.descricao && (
                      <p className="mt-0.5 whitespace-pre-line text-[12px] text-muted-foreground">
                        {item.descricao}
                      </p>
                    )}
                    {item.href && (
                      <Link
                        className="mt-0.5 block w-fit text-[12px] font-medium text-primary hover:underline"
                        to={item.href}
                      >
                        Ver registro
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {paginacaoLocal && limite < ordenados.length && (
        <Button
          type="button"
          variant="glassSecondary"
          className="h-8 w-full text-[12.5px]"
          onClick={() => setLimite((l) => l + tamanho)}
        >
          Carregar mais ({ordenados.length - limite} restantes)
        </Button>
      )}
    </div>
  );
}

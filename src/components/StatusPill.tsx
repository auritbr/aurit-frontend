import { cn } from "@/lib/utils";

export type Status = "Ativo" | "Inativo" | "Pendente" | "Concluído";

const config: Record<Status, string> = {
  Ativo: "status-active",
  Inativo: "status-inactive",
  Pendente: "status-pending",
  Concluído: "status-done",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={cn("status-pill", config[status])}>{status}</span>;
}
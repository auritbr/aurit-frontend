import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDate,
  listarSugestoes,
  origemMovimentacaoLabels,
  type MovimentacaoExtrato,
  type RegistroAurit,
} from "@/data/conciliacaoBancaria";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimentacao: MovimentacaoExtrato | null;
  onConfirm: (registro: RegistroAurit) => void | Promise<void>;
}

export function LocalizarMovimentacaoDialog({
  open,
  onOpenChange,
  movimentacao,
  onConfirm,
}: Props) {
  const [items, setItems] = useState<RegistroAurit[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !movimentacao) return;
    setLoading(true);
    setBusca("");
    setSelected("");
    setErro(null);
    void listarSugestoes(movimentacao.id)
      .then(setItems)
      .catch((error) =>
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível localizar movimentações.",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, movimentacao]);

  const confirmar = async () => {
    const item = items.find((registro) => registro.id === selected);
    if (!item) return void toast.error("Selecione uma movimentação da Aurit.");
    setSalvando(true);
    try {
      await onConfirm(item);
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  const filtrados = useMemo(
    () =>
      items.filter((item) =>
        item.historico
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            busca
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
      ),
    [items, busca],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !salvando && onOpenChange(next)}
    >
      <DialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Localizar movimentação
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Selecione um registro da Aurit correspondente a esta movimentação do
            extrato.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar no histórico"
            className="h-9 rounded-[10px] border-border/70 bg-background/70 pl-9 text-[13px]"
          />
        </div>
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {loading &&
            [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
            ))}
          {!loading && erro && (
            <p className="py-6 text-center text-[13px] text-destructive">
              {erro}
            </p>
          )}
          {!loading &&
            !erro &&
            filtrados.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={cn(
                  "w-full rounded-[12px] border border-border/70 bg-background/60 px-3 py-2.5 text-left shadow-sm backdrop-blur-md transition-all hover:border-primary/40 hover:bg-primary/5",
                  item.id === selected && "border-primary/50 bg-primary/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {item.historico}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {formatDate(item.dataMovimentacao)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold">
                      {formatCurrency(item.valor)}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 rounded-full border-border/70 bg-muted/40 text-[11px] font-normal"
                    >
                      {origemMovimentacaoLabels[item.origemMovimentacao] ??
                        "Ajuste"}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          {!loading && !erro && !filtrados.length && (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Nenhuma movimentação disponível para vincular.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="glassSecondary"
            className="h-9 px-4"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            variant="glassPrimary"
            className="h-9 px-5"
            onClick={() => void confirmar()}
            disabled={!selected || salvando}
          >
            {salvando && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Conciliar com esta movimentação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

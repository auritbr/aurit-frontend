import { useMemo, useState } from "react";
import { Braces, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { agruparVariaveis } from "@/components/editor/variaveisUtils";
import type { VariavelDocumento } from "@/data/modeloDocumento";

export interface VariaveisPickerProps {
  variaveis: VariavelDocumento[];
  carregando?: boolean;
  aviso?: string;
  onInserir: (chave: string) => void;
  trigger: React.ReactNode;
}

/**
 * Popover compacto de variáveis — inserção rápida durante a escrita.
 * Usa a mesma fonte de dados da seção "Variáveis disponíveis".
 */
export function VariaveisPicker({
  variaveis,
  carregando,
  aviso,
  onInserir,
  trigger,
}: VariaveisPickerProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const grupos = useMemo(
    () => agruparVariaveis(variaveis, busca),
    [variaveis, busca],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[min(22rem,var(--radix-popover-content-available-height,22rem))] w-[300px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[14px] border-border/70 bg-popover/90 p-0 shadow-[0_16px_40px_-24px_hsl(215_28%_17%_/_0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-popover/80"
      >
        <div className="shrink-0 border-b border-border/60 p-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar variável"
              aria-label="Buscar variável"
              className="h-11 rounded-[10px] border-border/70 bg-background/60 pl-8 text-base sm:h-8 sm:text-[12.5px]"
            />
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-2">
            {aviso ? (
              <p className="px-1.5 py-4 text-center text-[12.5px] text-muted-foreground">
                {aviso}
              </p>
            ) : carregando ? (
              <p className="px-1.5 py-4 text-center text-[12.5px] text-muted-foreground">
                Carregando variáveis...
              </p>
            ) : grupos.length === 0 ? (
              <p className="px-1.5 py-4 text-center text-[12.5px] text-muted-foreground">
                Nenhuma variável encontrada.
              </p>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.grupo} className="mb-2 last:mb-0">
                  <p className="px-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {grupo.grupo}
                  </p>
                  {grupo.itens.map((item) => (
                    <button
                      key={item.chave}
                      type="button"
                      onClick={() => {
                        onInserir(item.chave);
                        setOpen(false);
                      }}
                      className="flex min-h-11 w-full items-center gap-2 rounded-[10px] sm:min-h-0 px-1.5 py-1.5 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Braces
                        className="h-3.5 w-3.5 shrink-0 text-primary/70"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">
                          {item.nome}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.chave}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

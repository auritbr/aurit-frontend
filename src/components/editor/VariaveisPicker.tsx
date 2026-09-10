import { useMemo, useState } from "react";
import { Braces, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        className="w-[300px] rounded-[14px] border-border/70 bg-popover/90 p-0 shadow-[0_16px_40px_-24px_hsl(215_28%_17%_/_0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-popover/80"
      >
        <div className="border-b border-border/60 p-2.5">
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
              className="h-8 rounded-[10px] border-border/70 bg-background/60 pl-8 text-[12.5px]"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[280px]">
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
                      className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-1.5 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

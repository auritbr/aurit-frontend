import { useMemo, useState } from "react";
import { Braces, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { agruparVariaveis } from "@/components/editor/variaveisUtils";
import type { VariavelDocumento } from "@/data/modeloDocumento";

export interface VariaveisPanelProps {
  variaveis: VariavelDocumento[];
  carregando?: boolean;
  /** Mensagem exibida quando ainda não há tipo de documento selecionado. */
  aviso?: string;
  onInserir: (chave: string) => void;
}

/**
 * Biblioteca de variáveis disponíveis — consulta e descoberta, com busca pelo
 * nome amigável e grupos recolhíveis. Mesma fonte de dados do popover da
 * toolbar; a inserção acontece no ponto atual do cursor do editor.
 */
export function VariaveisPanel({
  variaveis,
  carregando,
  aviso,
  onInserir,
}: VariaveisPanelProps) {
  const [busca, setBusca] = useState("");
  const grupos = useMemo(
    () => agruparVariaveis(variaveis, busca),
    [variaveis, busca],
  );
  const abertos = useMemo(
    () =>
      busca
        ? grupos.map((g) => g.grupo)
        : grupos.slice(0, 1).map((g) => g.grupo),
    [busca, grupos],
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar variável"
          aria-label="Buscar variável"
          className="h-9 rounded-[11px] border-border/70 bg-background/60 pl-9 text-sm"
        />
      </div>

      {aviso ? (
        <p className="rounded-[12px] border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-[13px] text-muted-foreground">
          {aviso}
        </p>
      ) : carregando ? (
        <p className="px-1 py-6 text-center text-[13px] text-muted-foreground">
          Carregando variáveis...
        </p>
      ) : grupos.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-[13px] text-muted-foreground">
          Nenhuma variável encontrada para esta busca.
        </p>
      ) : (
        <Accordion
          key={busca ? "busca" : "padrao"}
          type="multiple"
          defaultValue={abertos}
          className="space-y-2"
        >
          {grupos.map((grupo) => (
            <AccordionItem
              key={grupo.grupo}
              value={grupo.grupo}
              className="overflow-hidden rounded-[13px] border border-border/70 bg-background/45 backdrop-blur-md supports-[backdrop-filter]:bg-background/35"
            >
              <AccordionTrigger className="px-4 py-3 text-[13.5px] font-semibold text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  {grupo.grupo}
                  <span className="rounded-full border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                    {grupo.itens.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {grupo.itens.map((item) => (
                    <li key={item.chave}>
                      <button
                        type="button"
                        onClick={() => onInserir(item.chave)}
                        title={`Inserir ${item.nome} no documento`}
                        aria-label={`Inserir ${item.nome} no documento`}
                        className="group flex w-full items-center gap-2.5 rounded-[11px] border border-transparent px-2.5 py-2 text-left transition-all hover:border-primary/25 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-border/70 bg-background/70 text-primary">
                          <Braces className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {item.nome}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {item.descricao || item.chave}
                          </span>
                        </span>
                        <Plus
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

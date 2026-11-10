import { escopoAnalitico } from "@/data/analitico";
import { useState } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type {
  RecursoHistorico,
  ResultadoHistorico,
} from "@/lib/historico/carregar";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/Timeline";
export interface HistoricoAlvo {
  nome: string;
  tipo: string;
  recurso: RecursoHistorico;
  id: string | number;
  carregar: (
    pagina: number,
    signal: AbortSignal,
  ) => ResultadoHistorico | Promise<ResultadoHistorico>;
  paginado?: boolean;
  observacao?: string;
}
export function useHistorico() {
  const [alvo, setAlvo] = useState<HistoricoAlvo | null>(null);
  return { alvo, abrir: setAlvo, fechar: () => setAlvo(null) };
}
export function HistoricoSheet({
  alvo,
  onClose,
}: {
  alvo: HistoricoAlvo | null;
  onClose: () => void;
}) {
  const consulta = useInfiniteQuery<
    ResultadoHistorico,
    Error,
    InfiniteData<ResultadoHistorico, number>,
    readonly unknown[],
    number
  >({
    queryKey: [
      "historico-registro",
      escopoAnalitico(),
      alvo?.recurso,
      alvo?.id,
    ],
    initialPageParam: 0,
    getNextPageParam: (pagina) => pagina.proximaPagina,
    queryFn: async ({ pageParam, signal }): Promise<ResultadoHistorico> => {
      if (!alvo) throw new Error("Selecione um registro.");
      return alvo.carregar(pageParam, signal);
    },
    enabled: Boolean(alvo),
    retry: false,
  });
  const resultado = consulta.data?.pages[0];
  const indisponiveis = resultado?.indisponiveis ?? [];
  return (
    <Sheet
      open={!!alvo}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <SheetTitle className="text-base">Histórico</SheetTitle>
          <SheetDescription className="text-[12.5px]">
            {alvo?.tipo}:{" "}
            <span className="font-medium text-foreground">{alvo?.nome}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {consulta.isError && !resultado ? (
            <div className="space-y-3 text-center">
              <p role="alert" className="text-[12.5px] text-destructive">
                Não foi possível carregar o histórico deste registro. Verifique
                sua permissão para consultar os registros relacionados.
              </p>
              <Button
                type="button"
                variant="glassSecondary"
                disabled={consulta.isFetching}
                onClick={() => void consulta.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : !resultado ? (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando histórico...
            </div>
          ) : (
            <>
              <Timeline
                key={`${alvo?.recurso}:${alvo?.id}`}
                items={
                  consulta.data?.pages.flatMap((pagina) => pagina.items) ?? []
                }
                paginacaoLocal={!alvo?.paginado}
                emptyMessage={
                  indisponiveis.length
                    ? "Nenhum acontecimento encontrado nas fontes consultadas."
                    : undefined
                }
              />
              {consulta.hasNextPage && (
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="mt-4"
                  disabled={consulta.isFetching}
                  onClick={() => void consulta.fetchNextPage()}
                >
                  {consulta.isFetchingNextPage
                    ? "Carregando..."
                    : "Carregar mais"}
                </Button>
              )}
              {(indisponiveis.length > 0 || consulta.isError) && (
                <div
                  role="status"
                  className="mt-4 space-y-2 text-[12px] text-muted-foreground"
                >
                  <p>
                    {consulta.isError
                      ? "Não foi possível atualizar o histórico."
                      : `Alguns registros não puderam ser consultados: ${indisponiveis.join(", ")}.`}
                  </p>
                  <Button
                    type="button"
                    variant="glassSecondary"
                    disabled={consulta.isFetching}
                    onClick={() => void consulta.refetch()}
                  >
                    {consulta.isFetching ? "Carregando..." : "Tentar novamente"}
                  </Button>
                </div>
              )}
              {resultado.observacao && (
                <p className="mt-4 text-[11.5px] text-muted-foreground">
                  {resultado.observacao}
                </p>
              )}
              {alvo?.observacao && (
                <p className="mt-4 text-[11.5px] text-muted-foreground">
                  {alvo.observacao}
                </p>
              )}
            </>
          )}
        </div>
        <div className="border-t border-border/60 p-3">
          <Button
            type="button"
            variant="glassSecondary"
            className="h-9 w-full"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

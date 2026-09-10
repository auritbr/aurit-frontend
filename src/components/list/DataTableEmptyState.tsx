import { SearchX } from "lucide-react";

export interface DataTableEmptyStateProps {
  /** Título quando não há nenhum registro cadastrado. */
  emptyTitle: string;
  /** Descrição quando não há nenhum registro cadastrado. */
  emptyDescription?: string;
  /** Rótulo do botão principal de cadastro (mantido por compatibilidade). */
  createLabel?: string;
  onCreate?: () => void;
  /** Quantidade de filtros ativos — muda a mensagem para "sem resultados". */
  activeCount?: number;
  onReviewSearch?: () => void;
  onClearFilters?: () => void;
  /** Título quando há filtros ativos e nenhum resultado. */
  noResultsTitle?: string;
}

/**
 * Estado vazio padronizado da tabela — apenas ícone, título e descrição.
 * Nenhum botão de ação é exibido: as ações permanecem no cabeçalho da página
 * e no painel de pesquisa avançada.
 */
export function DataTableEmptyState({
  emptyTitle,
  emptyDescription = "Cadastre o primeiro registro para começar a acompanhar as informações nesta página.",
  activeCount = 0,
  noResultsTitle = "Nenhum resultado encontrado",
}: DataTableEmptyStateProps) {
  const filtered = activeCount > 0;

  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
        <SearchX className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {filtered ? noResultsTitle : emptyTitle}
        </p>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {filtered
            ? "Revise os filtros utilizados ou limpe a pesquisa para visualizar todos os cadastros."
            : emptyDescription}
        </p>
      </div>
    </div>
  );
}

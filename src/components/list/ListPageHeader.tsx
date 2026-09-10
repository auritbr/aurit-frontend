import { FieldTooltip } from "@/components/FieldTooltip";
import { PageObjective } from "@/components/PageObjective";

export interface ListPageHeaderProps {
  title: string;
  /** Tooltip exibido ao lado do título. */
  tooltip: string;
  /** Texto do bloco "Objetivo da página". */
  objective?: string;
  /** Ações principais (botão de cadastro, importar dados). */
  actions?: React.ReactNode;
}

/**
 * Cabeçalho padronizado das páginas: título + tooltip, ações principais
 * e bloco "Objetivo da página" — mesmo layout de "Dados Institucionais".
 */
export function ListPageHeader({
  title,
  tooltip,
  objective,
  actions,
}: ListPageHeaderProps) {
  return (
    <header className="mb-5 border-b border-border pb-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          <FieldTooltip
            text={tooltip}
            fieldLabel={`a página ${title}`}
            side="bottom"
          />
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-start gap-2">
            {actions}
          </div>
        )}
      </div>
      {objective && <PageObjective className="mt-4" description={objective} />}
    </header>
  );
}

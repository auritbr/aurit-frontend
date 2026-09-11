import { FieldTooltip } from "@/components/FieldTooltip";
import { PageObjective } from "@/components/PageObjective";
import { useModulePermissionContext } from "@/contexts/ModulePermissionContext";

export interface ListPageHeaderProps {
  title: string;
  /** Tooltip exibido ao lado do título. */
  tooltip: string;
  /** Texto do bloco "Objetivo da página". */
  objective?: string;
  /** Ações principais (botão de cadastro, importar dados). */
  actions?: React.ReactNode;
  /** Ações de cadastro/importação exigem CRIAR por padrão. */
  actionsRequireCreatePermission?: boolean;
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
  actionsRequireCreatePermission = true,
}: ListPageHeaderProps) {
  const { modulo, carregando, permissoes } = useModulePermissionContext();
  const exibirAcoes =
    Boolean(actions) &&
    (!actionsRequireCreatePermission ||
      !modulo ||
      (!carregando && permissoes.CRIAR));

  return (
    <header className="mb-5 border-b border-border pb-4">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          <FieldTooltip
            text={tooltip}
            fieldLabel={`a página ${title}`}
            side="bottom"
          />
        </div>
        {exibirAcoes && (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-start [&>button]:w-full sm:[&>button]:w-auto">
            {actions}
          </div>
        )}
      </div>
      {objective && <PageObjective className="mt-4" description={objective} />}
    </header>
  );
}

import { HelpTooltip } from "@/components/HelpTooltip";
import { useLocation } from "react-router-dom";
import { ImportDataButton } from "@/components/ImportDataButton";
import { getImportConfigForPath } from "@/config/importacoes";

interface PageTitleProps {
  title: string;
  tooltip: string;
  description?: string;
  actions?: React.ReactNode;
  showImport?: boolean;
}

export function PageTitle({
  title,
  tooltip,
  description,
  actions,
  showImport,
}: PageTitleProps) {
  const { pathname } = useLocation();
  const isFormRoute =
    pathname.endsWith("/novo") || pathname.endsWith("/editar");
  const displayImport = showImport ?? isFormRoute;

  return (
    <div className="flex flex-col gap-3 mb-5 pb-4 border-b border-border">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          <HelpTooltip
            text={tooltip}
            label={title}
            size="md"
            side="bottom"
            align="start"
          />
        </div>
        {description && (
          <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {(actions || displayImport) && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-start [&>button]:w-full sm:[&>button]:w-auto">
          {actions}
          {!actions && <ImportDataTitleAction show={displayImport} />}
        </div>
      )}
    </div>
  );
}

export function ImportDataTitleAction({ show = true }: { show?: boolean }) {
  const { pathname } = useLocation();
  const importConfig = getImportConfigForPath(pathname);

  if (!show || !importConfig) return null;

  return (
    <ImportDataButton
      config={importConfig}
      canFillForm={importConfig.supportsFormFill !== false}
      onCompleted={() => window.location.reload()}
      className="ml-2"
    />
  );
}

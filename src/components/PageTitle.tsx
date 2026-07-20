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

export function PageTitle({ title, tooltip, description, actions, showImport }: PageTitleProps) {
  const { pathname } = useLocation();
  const isFormRoute = pathname.endsWith("/novo") || pathname.endsWith("/editar");
  const displayImport = showImport ?? isFormRoute;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <HelpTooltip text={tooltip} label={title} size="md" side="bottom" align="start" />
          <ImportDataTitleAction show={displayImport} />
        </div>
        {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
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

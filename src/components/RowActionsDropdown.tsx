import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Eye,
  FileDown,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { downloadIndividualReport } from "@/lib/individualReportDownload";
import { useModulePermissionContext } from "@/contexts/ModulePermissionContext";

export interface RowActionItem {
  label: string;
  onClick?: () => void;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  content?: ReactNode;
}

export interface RowActionsDropdownProps {
  viewTo?: string;
  editTo?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Ações específicas do módulo, inseridas após "Editar". */
  extraItems?: RowActionItem[];
  reportEndpoint?: string;
  reportFilename?: string;
  /** Rótulo do botão. Padrão: "Ações". */
  label?: string;
  className?: string;
}

/**
 * Botão "Ações" com menu suspenso (Visualizar, Editar, Excluir).
 * Acabamento liquid glass discreto, reutilizável em qualquer listagem.
 */
export function RowActionsDropdown({
  viewTo,
  editTo,
  onView,
  onEdit,
  onDelete,
  extraItems,
  reportEndpoint,
  reportFilename,

  label = "Ações",
  className,
}: RowActionsDropdownProps) {
  const [generatingReport, setGeneratingReport] = useState(false);
  const { modulo, carregando, permissoes } = useModulePermissionContext();
  const podeEditar = !modulo || (!carregando && permissoes.EDITAR);
  const podeExcluir = !modulo || (!carregando && permissoes.EXCLUIR);
  const podeGerarPdf =
    !modulo || (!carregando && permissoes.GERAR_PDF);

  const handleReport = async () => {
    if (!reportEndpoint || generatingReport) return;
    try {
      setGeneratingReport(true);
      await downloadIndividualReport(reportEndpoint, reportFilename);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Não foi possível gerar o relatório. Tente novamente.",
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[12px] border border-border/70 bg-background/70 px-2.5 text-[13px] font-medium text-foreground shadow-[0_1px_3px_-2px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-background/55 transition-all hover:border-border hover:bg-muted/60 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-muted/70 motion-reduce:transition-none",
          className,
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-[176px] rounded-[13px] border-border/70 bg-popover/90 p-1.5 shadow-[0_10px_30px_-16px_hsl(215_28%_17%_/_0.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-popover/80"
      >
        {viewTo ? (
          <DropdownMenuItem asChild>
            <Link
              to={viewTo}
              className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              Visualizar
            </Link>
          </DropdownMenuItem>
        ) : onView ? (
          <DropdownMenuItem
            onClick={onView}
            className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
          >
            <Eye className="h-4 w-4 text-muted-foreground" /> Visualizar
          </DropdownMenuItem>
        ) : null}
        {podeEditar && editTo ? (
          <DropdownMenuItem asChild>
            <Link
              to={editTo}
              className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Editar
            </Link>
          </DropdownMenuItem>
        ) : podeEditar && onEdit ? (
          <DropdownMenuItem
            onClick={onEdit}
            className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" /> Editar
          </DropdownMenuItem>
        ) : null}
        {extraItems?.map((item) => {
          if (item.content) return <div key={item.label}>{item.content}</div>;
          const Icon = item.icon;
          return item.to ? (
            <DropdownMenuItem key={item.label} asChild disabled={item.disabled}>
              <Link
                to={item.to}
                className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
              >
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                {item.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
            >
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
        {podeGerarPdf && reportEndpoint && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleReport();
            }}
            disabled={generatingReport}
            className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] focus:bg-muted/70"
          >
            {generatingReport ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <FileDown className="h-4 w-4 text-muted-foreground" />
            )}
            {generatingReport ? "Gerando PDF..." : "Gerar PDF"}
          </DropdownMenuItem>
        )}
        {podeExcluir && onDelete && (
          <>
            {(viewTo || editTo || onView || onEdit) && (
              <DropdownMenuSeparator className="my-1 bg-border/60" />
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 rounded-[9px] px-2.5 py-2 text-[13px] text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

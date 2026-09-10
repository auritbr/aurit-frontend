import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileSpreadsheet,
  FileUp,
  Info,
  ListChecks,
  Loader2,
  PlayCircle,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import type { ImportModuleConfig } from "@/config/importacoes";
import {
  getImportModules,
  getImportRelationshipOptions,
  previewImport,
} from "@/data/importacoes";
import type {
  ImportApplyWarning,
  ImportFieldRule,
} from "@/lib/importDataApplicator";
import {
  clearImportReviewQueue,
  getImportReviewQueue,
  saveImportReviewQueue,
  type ImportReviewQueue,
} from "@/lib/importReviewQueue";
import { getPermissoesUsuarioLogadoPorModulo } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

interface ImportDataButtonProps {
  config: ImportModuleConfig;
  className?: string;
  canFillForm?: boolean;
  onCompleted?: () => void;
  /** Variante visual do botão gatilho. */
  variant?: "outline" | "glassSecondary";
}

const ACCEPTED_MIME =
  ".xlsx,.xls,.csv,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/pdf";
const ACCEPTED_EXT = [".xlsx", ".xls", ".csv", ".pdf"];

function isAccepted(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ImportDataButton({
  config,
  className,
  canFillForm = false,
  variant = "glassSecondary",
}: ImportDataButtonProps) {
  const entity = config.entity;
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState<ImportReviewQueue | null>(() =>
    getImportReviewQueue(config.module),
  );
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const pendingFileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setQueue(getImportReviewQueue(config.module));
    window.addEventListener("aurit:import-review-change", refresh);
    return () =>
      window.removeEventListener("aurit:import-review-change", refresh);
  }, [config.module]);

  useEffect(() => {
    if (open) setQueue(getImportReviewQueue(config.module));
  }, [open, config.module]);

  useEffect(() => {
    const receiveWarnings = (event: Event) => {
      const detail = (
        event as CustomEvent<{ module: string; warnings: ImportApplyWarning[] }>
      ).detail;
      if (detail?.module === config.module && detail.warnings?.length) {
        toast({
          title: "Alguns valores precisam de revisão",
          description: `${detail.warnings.length} valor(es) não puderam ser associados automaticamente.`,
        });
      }
    };
    window.addEventListener("aurit:import-apply-result", receiveWarnings);
    return () =>
      window.removeEventListener("aurit:import-apply-result", receiveWarnings);
  }, [config.module]);

  const resetSelection = useCallback(() => {
    setFile(null);
    setError(null);
    setDragActive(false);
    setProcessing(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  async function verifyAccess() {
    const [modules, permissions] = await Promise.all([
      getImportModules(),
      getPermissoesUsuarioLogadoPorModulo(config.permissionModule),
    ]);
    if (!permissions.CRIAR)
      throw new Error(
        "Você não possui permissão para importar registros neste módulo.",
      );
    if (!modules.includes(config.module))
      throw new Error(
        `A importação de ${config.entity} não está habilitada pelo servidor.`,
      );
  }

  async function buildFieldRules() {
    const entries = await Promise.all(
      (config.relationships ?? []).map(
        async (relation) =>
          [
            relation.field,
            await getImportRelationshipOptions(relation.endpoint),
          ] as const,
      ),
    );
    const relationshipOptions = Object.fromEntries(entries);
    const relationshipRules = Object.fromEntries(
      (config.relationships ?? []).map((item) => [
        item.field,
        {
          kind: item.field.endsWith("Ids")
            ? "relationship-array"
            : "relationship",
          options: relationshipOptions[item.field],
        } satisfies ImportFieldRule,
      ]),
    );
    const configuredRules = Object.fromEntries(
      Object.entries(config.fieldRules ?? {}).map(([field, rule]) => [
        field,
        { ...rule, options: rule.options ?? relationshipOptions[field] },
      ]),
    );
    return { ...relationshipRules, ...configuredRules };
  }

  function applyCurrent(
    current: ImportReviewQueue,
    fieldRules: Record<string, ImportFieldRule>,
  ) {
    if (!canFillForm) return;
    const row = current.rows[current.currentIndex];
    if (!row) return;
    window.dispatchEvent(
      new CustomEvent("aurit:import-fill-form", {
        detail: {
          module: config.module,
          data: row.dados,
          line: row.linha,
          requiredFields: [
            ...config.requiredFields,
            ...(config.relationships ?? [])
              .filter((item) => item.required)
              .map((item) => item.field),
          ],
          fieldRules,
        },
      }),
    );
  }

  async function processAndEnqueue(f: File) {
    setFile(f);
    setError(null);
    setProcessing(true);
    setProgress(15);
    try {
      await verifyAccess();
      const [preview, fieldRules] = await Promise.all([
        previewImport(config.module, f),
        buildFieldRules(),
      ]);
      setProgress(80);
      if (!preview.linhas.length) {
        setError("Não foi possível extrair registros do arquivo.");
        setProcessing(false);
        setProgress(0);
        return;
      }
      const state: ImportReviewQueue = {
        module: config.module,
        entity: config.entity,
        fileName: f.name,
        rows: preview.linhas.map((row) => ({
          ...row,
          dados: { ...row.dados },
        })),
        currentIndex: 0,
        createRoute: config.createRoute,
      };
      saveImportReviewQueue(state);
      setQueue(state);
      setProgress(100);
      setProcessing(false);
      setFile(null);
      setOpen(false);
      if (config.createRoute && location.pathname !== config.createRoute) {
        navigate(config.createRoute, {
          state: { applyImportQueueModule: config.module },
        });
      } else {
        applyCurrent(state, fieldRules);
      }
      toast({
        title: `${preview.linhas.length} registro(s) identificado(s)`,
        description:
          "O primeiro registro foi aplicado ao formulário para revisão.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao processar o arquivo.";
      setError(message);
      toast({
        title: "Não foi possível importar",
        description: message,
        variant: "destructive",
      });
      setProcessing(false);
      setProgress(0);
    }
  }

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!isAccepted(f)) {
      setError("Formato não suportado. Envie um arquivo Excel, CSV ou PDF.");
      setFile(null);
      return;
    }
    void processAndEnqueue(f);
  };

  const handleReplaceFileSelected = (f: File | null | undefined) => {
    if (!f) return;
    if (!isAccepted(f)) {
      setError("Formato não suportado. Envie um arquivo Excel, CSV ou PDF.");
      return;
    }
    pendingFileRef.current = f;
    setConfirmReplace(true);
  };

  const confirmReplaceQueue = async () => {
    const f = pendingFileRef.current;
    setConfirmReplace(false);
    if (!f) return;
    await processAndEnqueue(f);
    pendingFileRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const cancelReplaceQueue = () => {
    pendingFileRef.current = null;
    setConfirmReplace(false);
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  async function handleContinue() {
    const current = getImportReviewQueue(config.module);
    if (!current || current.currentIndex >= current.rows.length) return;
    setOpen(false);
    if (config.createRoute && location.pathname !== config.createRoute) {
      saveImportReviewQueue({ ...current, resumeAfterSave: true });
      navigate(config.createRoute, {
        state: { applyImportQueueModule: config.module },
      });
      return;
    }
    setProcessing(true);
    try {
      const fieldRules = await buildFieldRules();
      const resumed = { ...current, resumeAfterSave: false };
      saveImportReviewQueue(resumed);
      applyCurrent(resumed, fieldRules);
      toast({
        title: `Registro ${resumed.currentIndex + 1} de ${resumed.rows.length} carregado`,
        description: "Revise os campos e salve para avançar.",
      });
    } catch (err) {
      toast({
        title: "Não foi possível carregar o registro",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  const continueRef = useRef(handleContinue);
  continueRef.current = handleContinue;
  useEffect(() => {
    const state = location.state as { applyImportQueueModule?: string } | null;
    if (
      state?.applyImportQueueModule !== config.module ||
      location.pathname !== config.createRoute
    )
      return;
    navigate(location.pathname, { replace: true, state: null });
    void continueRef.current();
  }, [
    config.createRoute,
    config.module,
    location.pathname,
    location.state,
    navigate,
  ]);

  const handleClearQueue = () => {
    clearImportReviewQueue(config.module);
    setQueue(null);
    setConfirmClear(false);
    resetSelection();
    toast({
      title: "Fila removida",
      description: "A fila de importação foi limpa.",
    });
  };

  const hasQueue =
    !!queue &&
    Array.isArray(queue.rows) &&
    queue.rows.length > 0 &&
    queue.currentIndex < queue.rows.length;
  const nextNumber = hasQueue ? queue!.currentIndex + 1 : 0;
  const percent = hasQueue
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round((queue!.currentIndex / queue!.rows.length) * 100),
        ),
      )
    : 0;

  return (
    <>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            onClick={() => setOpen(true)}
            aria-label="Importar dados"
            size="compact"
            className={cn(
              "w-auto shrink-0 gap-1.5 self-start whitespace-nowrap",
              className,
            )}
          >
            <FileUp className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Importar dados</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" sideOffset={6}>
          Importe registros por meio de arquivos Excel, CSV ou PDF.
        </TooltipContent>
      </Tooltip>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetSelection();
        }}
      >
        <DialogContent className="overflow-hidden rounded-[18px] border-border/60 bg-background/90 p-0 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5),0_18px_44px_-26px_hsl(215_28%_17%/0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:max-w-lg">
          {/* Cabeçalho */}
          <DialogHeader className="border-b border-border/60 bg-muted/25 px-5 py-3.5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[15px] font-semibold leading-tight">
                  Importar dados
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Envie um arquivo para importar registros para{" "}
                  <span className="font-medium text-foreground">{entity}</span>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {hasQueue ? (
            /* ============ ESTADO 2 — IMPORTAÇÃO EM ANDAMENTO ============ */
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div className="rounded-[13px] border border-border/60 bg-card/70 p-4 backdrop-blur-sm supports-[backdrop-filter]:bg-card/55">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      Importação em andamento
                    </p>
                    {queue?.fileName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {queue.fileName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Próximo registro
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
                      {nextNumber} de {queue!.rows.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Registros percorridos
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
                      {queue!.currentIndex} de {queue!.rows.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <Progress value={percent} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progresso</span>
                    <span className="tabular-nums">{percent}%</span>
                  </div>
                </div>
              </div>

              {/* Ações — hierarquia visual: verde principal, outline secundário, clear discreto */}
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    size="compact"
                    onClick={() => replaceInputRef.current?.click()}
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    <UploadCloud className="h-[15px] w-[15px]" />
                    Selecionar outro arquivo
                  </Button>

                  <Button
                    type="button"
                    variant="glassDanger"
                    size="compact"
                    onClick={() => setConfirmClear(true)}
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                    Limpar fila de importação
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="glassPrimary"
                  size="compact"
                  onClick={handleContinue}
                  className="w-full gap-1.5 sm:w-auto"
                >
                  <PlayCircle className="h-[15px] w-[15px]" />
                  Continuar esta importação
                </Button>

                <input
                  ref={replaceInputRef}
                  type="file"
                  accept={ACCEPTED_MIME}
                  className="hidden"
                  onChange={(e) =>
                    handleReplaceFileSelected(e.target.files?.[0])
                  }
                  aria-label="Selecionar novo arquivo para importação"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  Cada registro será carregado no formulário para revisão antes
                  de ser salvo definitivamente em <strong>{entity}</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* ============ ESTADO 1 — SELEÇÃO DO ARQUIVO (design original) ============ */
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Área de upload de arquivo"
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[13px] border border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    dragActive
                      ? "border-primary/60 bg-primary/[0.06]"
                      : "border-border/70 bg-muted/20 hover:border-primary/45 hover:bg-muted/35",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 ring-1 ring-border/70">
                    <UploadCloud className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excel (.xlsx, .xls), CSV ou PDF — até 10 MB
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_MIME}
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    aria-label="Selecionar arquivo para importação"
                  />
                </div>
              ) : (
                <div className="attachment-file-glass p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)} ·{" "}
                        {processing ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processando arquivo...
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Concluído
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSelection();
                      }}
                      aria-label="Remover arquivo"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{processing ? "Processando" : "Concluído"}</span>
                      <span className="tabular-nums">{progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  Os registros importados passarão por uma etapa de revisão
                  antes de serem salvos definitivamente em{" "}
                  <strong>{entity}</strong>.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação: substituir fila existente */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader icon={null}>
            <AlertDialogTitle>Substituir a importação atual?</AlertDialogTitle>
            <AlertDialogDescription>
              A fila atual possui registros pendentes. Ao selecionar e processar
              outro arquivo, essa fila será substituída. Os campos já
              preenchidos no formulário atual não serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReplaceQueue}>
              Manter importação atual
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplaceQueue}>
              Selecionar outro arquivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação: limpar fila */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar fila de importação?</AlertDialogTitle>
            <AlertDialogDescription>
              A fila de registros pendentes será removida. Os dados que já
              estiverem preenchidos no formulário atual não serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter fila</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearQueue}>
              Limpar fila
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

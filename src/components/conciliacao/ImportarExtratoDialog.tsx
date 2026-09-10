import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  FileUp,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FieldLabel } from "@/components/FieldLabel";
import {
  getContasBancarias,
  nomeBancoLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import { cn } from "@/lib/utils";
import {
  importarExtrato,
  type ResultadoImportacao,
} from "@/data/conciliacaoBancaria";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (resultado: ResultadoImportacao) => void | Promise<void>;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function SearchableSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        normalize(option.label).includes(normalize(query)),
      ),
    [options, query],
  );
  const selected = options.find((option) => option.value === value);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 text-left text-[13px] shadow-sm backdrop-blur-md",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {selected?.label ?? "Selecione a conta bancária"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-2"
      >
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar conta bancária"
          className="mb-2 h-8"
        />
        <div className="max-h-60 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] hover:bg-muted"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  option.value === value ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
          {!filtered.length && (
            <p className="px-2.5 py-3 text-[13px] text-muted-foreground">
              Nenhuma conta encontrada.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ImportarExtratoDialog({
  open,
  onOpenChange,
  onImported,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [contas, setContas] = useState<ContaBancariaData[]>([]);
  const [contaId, setContaId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void getContasBancarias()
      .then((items) =>
        setContas(items.filter((item) => item.statusContaBancaria === "ATIVO")),
      )
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as contas.",
        ),
      );
    setArquivo(null);
    setErro(null);
    setLoading(false);
  }, [open]);

  const enviar = async () => {
    if (!contaId) return void toast.error("Selecione a conta bancária.");
    if (!arquivo) return void toast.error("Selecione o arquivo OFX.");
    if (!arquivo.name.toLowerCase().endsWith(".ofx"))
      return void toast.error("Selecione um arquivo no formato OFX.");
    if (arquivo.size === 0)
      return void toast.error("O arquivo OFX selecionado está vazio.");
    if (arquivo.size > 10 * 1024 * 1024)
      return void toast.error("O arquivo OFX deve ter no máximo 10 MB.");
    try {
      setLoading(true);
      const resultado = await importarExtrato(contaId, arquivo);
      await onImported(resultado);
      toast.success(
        resultado.totalJaExistentes > 0
          ? `${resultado.totalImportadas} movimentações foram importadas; ${resultado.totalJaExistentes} já existiam.`
          : `${resultado.totalImportadas} movimentações foram importadas.`,
      );
      setArquivo(null);
      onOpenChange(false);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o extrato.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[18px] border-border/70 bg-card/90 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar extrato bancário</DialogTitle>
          <DialogDescription>
            Selecione a conta e envie um arquivo OFX de até 10 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <FieldLabel htmlFor="conta-conciliacao" required>
              Conta bancária
            </FieldLabel>
            <SearchableSelect
              value={contaId}
              onChange={setContaId}
              options={contas.map((conta) => ({
                value: conta.id,
                label: `${conta.nomeConta || "Conta bancária"} · ${nomeBancoLabel(conta.nomeBanco)}`,
              }))}
            />
          </div>
          <div>
            <FieldLabel required>Arquivo OFX</FieldLabel>
            {arquivo ? (
              <div className="attachment-file-glass flex items-center gap-2 px-3 py-2.5">
                <FileUp className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {arquivo.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatBytes(arquivo.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="glassDanger"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setArquivo(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                className="flex min-h-28 w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-border/80 bg-muted/25 px-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Upload className="mb-2 h-5 w-5 text-primary" />
                <span className="text-[13px] font-medium text-foreground">
                  Selecionar arquivo OFX
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Somente arquivos .ofx
                </span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".ofx,application/x-ofx"
              className="hidden"
              onChange={(event) => {
                const selecionado = event.target.files?.[0] ?? null;
                if (
                  selecionado &&
                  !selecionado.name.toLowerCase().endsWith(".ofx")
                ) {
                  toast.error("Selecione um arquivo no formato OFX.");
                  setArquivo(null);
                  event.target.value = "";
                  return;
                }
                setArquivo(selecionado);
              }}
            />
          </div>
          {erro && (
            <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
              {erro}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="glassSecondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="glassPrimary"
            onClick={() => void enviar()}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Importar extrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

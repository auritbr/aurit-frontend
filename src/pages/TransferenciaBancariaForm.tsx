import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Receipt,
  Search,
  Upload,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { ImportDataButton } from "@/components/ImportDataButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSectionCard } from "@/components/FormSectionCard";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createEmptyTransferencia,
  formaTransferenciaOptions,
  getTransferencia,
  maskMoney,
  parseMoney,
  saveTransferencia,
  statusTransferenciaOptions,
  type TransferenciaBancariaData,
  getTransferenciaComprovanteUrl,
} from "@/data/transferenciaBancaria";
import {
  getContasBancarias,
  nomeBancoLabel,
  tipoContaBancariaLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

type Option = { value: string; label: string; hint?: string };
type Grupo = { label: string; options: readonly Option[] };

/** Select pesquisável com agrupamento opcional (uso interno desta página). */
function SearchableSelect({
  id,
  groups,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled,
  disabledValues = [],
  disabledHint,
}: {
  id?: string;
  groups: readonly Grupo[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  disabledValues?: string[];
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allOptions = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const selectedLabel = allOptions.find((o) => o.value === value)?.label;

  const filteredGroups = useMemo(() => {
    const term = normalize(query);
    if (!term) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter((o) => normalize(o.label).includes(term)),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);

  if (disabled) {
    return (
      <div
        id={id}
        className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-sm backdrop-blur-sm"
        aria-readonly
      >
        <span
          className={
            selectedLabel ? "text-foreground" : "text-muted-foreground"
          }
        >
          {selectedLabel || "—"}
        </span>
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex min-h-9 min-w-0 w-full max-w-full items-center justify-between gap-2 overflow-hidden rounded-[10px] border border-border/70 bg-background/70 px-3 py-1.5 text-left text-sm backdrop-blur-sm transition-colors",
            "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <span
            className={cn(
              "truncate",
              selectedLabel ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            className="h-4 w-4 flex-shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-1"
        align="start"
      >
        <div className="relative p-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 rounded-[8px] pl-8 text-[13px]"
          />
        </div>
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {filteredGroups.length === 0 && (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          {filteredGroups.map((group) => (
            <div key={group.label} className="pb-1">
              {group.label && (
                <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.options.map((option) => {
                const selected = option.value === value;
                const blocked =
                  disabledValues.includes(option.value) && !selected;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-disabled={blocked}
                    disabled={blocked}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      blocked
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-muted",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        selected ? "text-primary" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    {(blocked ? disabledHint : option.hint) && (
                      <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                        {blocked ? disabledHint : option.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  children,
  full,
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-2" : ""}>{children}</div>;
}

/** Select simples com estado vazio amigável. */
function EntitySelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
}) {
  if (options.length === 0) {
    return (
      <div className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-[13px] text-muted-foreground backdrop-blur-sm">
        {emptyMessage}
      </div>
    );
  }
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function TransferenciaBancariaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const isView = !!id && !pathname.endsWith("/editar");
  const isEdit = !!id && pathname.endsWith("/editar");

  const [form, setForm] = useState<TransferenciaBancariaData>(() =>
    createEmptyTransferencia(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaData[]>(
    [],
  );

  useImportFormFill("transferencias-bancarias", setForm);

  const contaGroups = useMemo<Grupo[]>(() => {
    const describe = (c: (typeof contasBancarias)[number]) =>
      [
        c.nomeConta || "Conta sem nome",
        nomeBancoLabel(c.nomeBanco),
        tipoContaBancariaLabel(c.tipoContaBancaria),
      ]
        .filter(Boolean)
        .join(" · ");

    const ativas = contasBancarias.filter(
      (c) => c.statusContaBancaria === "ATIVO",
    );
    const inativas = contasBancarias.filter(
      (c) => c.statusContaBancaria !== "ATIVO",
    );
    const groups: Grupo[] = [];
    if (ativas.length)
      groups.push({
        label: "Contas ativas",
        options: ativas.map((c) => ({ value: c.id, label: describe(c) })),
      });
    if (inativas.length)
      groups.push({
        label: "Contas inativas",
        options: inativas.map((c) => ({
          value: c.id,
          label: describe(c),
          hint: "Inativa",
        })),
      });
    return groups;
  }, [contasBancarias]);

  const contasDisponiveis = contasBancarias.length;
  const semContasSuficientes = !id && contasDisponiveis < 2;

  useEffect(() => {
    void getContasBancarias()
      .then(setContasBancarias)
      .catch(() =>
        toast.error("Não foi possível carregar as contas bancárias."),
      );
  }, []);

  useEffect(() => {
    if (!id) return;
    void getTransferencia(id)
      .then(setForm)
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Transferência bancária não encontrada.",
        );
        navigate("/transferencias-bancarias");
      });
  }, [id, navigate]);

  const set = <K extends keyof TransferenciaBancariaData>(
    k: K,
    v: TransferenciaBancariaData[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    setForm((p) => ({
      ...p,
      comprovanteFile: file,
      removerComprovante: false,
      urlComprovante: URL.createObjectURL(file),
      nomeComprovante: file.name,
    }));
  };

  const removeFile = () =>
    setForm((p) => ({
      ...p,
      comprovanteFile: undefined,
      removerComprovante: true,
      urlComprovante: "",
      nomeComprovante: "",
    }));

  const openComprovante = async () => {
    try {
      const url = form.comprovanteFile
        ? form.urlComprovante
        : id
          ? await getTransferenciaComprovanteUrl(id)
          : form.urlComprovante;
      if (url) window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o comprovante.",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeTransferencia?.trim())
      return toast.error("Informe o nome da transferência.");
    if (!form.descricaoTransferencia?.trim())
      return toast.error("Informe a descrição da transferência.");
    if (!form.contaOrigemId) return toast.error("Selecione a conta de origem.");
    if (!form.contaDestinoId)
      return toast.error("Selecione a conta de destino.");
    if (form.contaOrigemId === form.contaDestinoId)
      return toast.error(
        "A conta de origem e a conta de destino devem ser diferentes.",
      );
    if (!form.valorTransferencia || parseMoney(form.valorTransferencia) <= 0)
      return toast.error("Informe o valor da transferência.");
    if (!form.dataTransferencia)
      return toast.error("Informe a data da transferência.");
    if (!form.formaPagamento)
      return toast.error("Selecione a forma da transferência.");
    if (!form.statusTransferenciaBancaria)
      return toast.error("Selecione a situação da transferência.");
    try {
      await saveTransferencia(form);
      toast.success(
        isEdit
          ? "Alterações salvas com sucesso."
          : "Transferência bancária salva com sucesso.",
      );
      navigate("/transferencias-bancarias");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a transferência bancária.",
      );
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/transferencias-bancarias" />
        <PageTitle
          title="Transferências Bancárias"
          tooltip="Nesta página são cadastradas e acompanhadas as transferências de valores entre as contas bancárias da organização. Esses registros permitem acompanhar de onde o recurso saiu, para qual conta foi enviado, o valor movimentado, a situação da transferência e o histórico dessas movimentações entre contas."
          actions={
            isView ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/transferencias-bancarias")!}
                canFillForm
              />
            )
          }
        />

        <FormLegend />

        {semContasSuficientes && (
          <div className="mb-5 rounded-[12px] border border-primary/15 bg-primary-soft/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground backdrop-blur-md">
            {contasDisponiveis === 0
              ? "Nenhuma conta bancária disponível. Cadastre pelo menos duas contas bancárias para registrar uma transferência."
              : "Cadastre pelo menos duas contas bancárias para registrar uma transferência."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={isView}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            {/* 1 — Identificação da transferência */}
            <FormSectionCard
              icon={Receipt}
              title="Identificação da transferência"
              description="Registre as informações que permitem reconhecer esta transferência e entender sua finalidade dentro das movimentações financeiras da organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="nomeTransferencia"
                    required
                    tooltip="Informe um nome curto e claro que permita identificar facilmente esta transferência. Ex.: Transferência para conta do projeto ou Transferência entre contas da organização."
                  >
                    Nome da Transferência
                  </FieldLabel>

                  <Input
                    id="nomeTransferencia"
                    value={form.nomeTransferencia}
                    onChange={(e) => set("nomeTransferencia", e.target.value)}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoTransferencia"
                    required
                    tooltip="Descreva o motivo ou a finalidade da transferência e, quando necessário, registre outras informações importantes sobre essa movimentação."
                  >
                    Descrição da Transferência
                  </FieldLabel>

                  <Textarea
                    id="descricaoTransferencia"
                    value={form.descricaoTransferencia}
                    onChange={(e) =>
                      set("descricaoTransferencia", e.target.value)
                    }
                    rows={3}
                  />
                </Field>
              </div>
            </FormSectionCard>

            {/* 2 — Contas e valor */}
            <FormSectionCard
              icon={ArrowLeftRight}
              title="Contas e valor"
              description="Defina de qual conta o dinheiro sairá, para qual conta será enviado e qual valor será movimentado entre elas."
            >
              {contaGroups.length === 0 ? (
                <div className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-[13px] text-muted-foreground backdrop-blur-sm">
                  Nenhuma conta bancária disponível.
                </div>
              ) : (
                <div className="grid min-w-0 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <FieldLabel
                      htmlFor="contaOrigemId"
                      required
                      tooltip="Selecione a conta bancária da qual o valor será retirado para realizar esta transferência."
                    >
                      Conta de Origem
                    </FieldLabel>

                    <SearchableSelect
                      id="contaOrigemId"
                      groups={contaGroups}
                      value={form.contaOrigemId}
                      onChange={(v) => set("contaOrigemId", v)}
                      placeholder="Selecione a conta de origem"
                      searchPlaceholder="Pesquisar conta bancária..."
                      emptyMessage="Nenhuma conta bancária encontrada."
                      disabled={isView}
                      disabledValues={
                        form.contaDestinoId ? [form.contaDestinoId] : []
                      }
                      disabledHint="Conta de destino"
                    />
                  </div>

                  <div className="hidden items-center justify-center pb-2 sm:flex">
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                  </div>

                  <div className="min-w-0">
                    <FieldLabel
                      htmlFor="contaDestinoId"
                      required
                      tooltip="Selecione a conta bancária que receberá o valor desta transferência."
                    >
                      Conta de Destino
                    </FieldLabel>

                    <SearchableSelect
                      id="contaDestinoId"
                      groups={contaGroups}
                      value={form.contaDestinoId}
                      onChange={(v) => set("contaDestinoId", v)}
                      placeholder="Selecione a conta de destino"
                      searchPlaceholder="Pesquisar conta bancária..."
                      emptyMessage="Nenhuma conta bancária encontrada."
                      disabled={isView}
                      disabledValues={
                        form.contaOrigemId ? [form.contaOrigemId] : []
                      }
                      disabledHint="Conta de origem"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="valorTransferencia"
                    required
                    tooltip="Informe o valor que será transferido da conta de origem para a conta de destino."
                  >
                    Valor da Transferência
                  </FieldLabel>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                      R$
                    </span>

                    <Input
                      id="valorTransferencia"
                      inputMode="numeric"
                      value={form.valorTransferencia}
                      onChange={(e) =>
                        set("valorTransferencia", maskMoney(e.target.value))
                      }
                      className="pl-9"
                    />
                  </div>
                </Field>
              </div>
            </FormSectionCard>

            {/* 3 — Data, forma e situação */}
            <FormSectionCard
              icon={CalendarClock}
              title="Data, forma e situação"
              description="Acompanhe quando e como a transferência será realizada e mantenha atualizada sua situação até a conclusão da movimentação."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataTransferencia"
                    required
                    tooltip="Informe a data prevista para a transferência ou, se ela já tiver sido realizada, a data em que o valor foi efetivamente movimentado entre as contas."
                  >
                    Data da Transferência
                  </FieldLabel>

                  <Input
                    id="dataTransferencia"
                    type="date"
                    value={form.dataTransferencia}
                    onChange={(e) => set("dataTransferencia", e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="formaPagamento"
                    required
                    tooltip="Selecione a forma que será utilizada para realizar a transferência ou, se ela já tiver ocorrido, a forma efetivamente utilizada."
                  >
                    Forma da Transferência
                  </FieldLabel>

                  <Select
                    value={form.formaPagamento}
                    onValueChange={(v) => set("formaPagamento", v)}
                    disabled={isView}
                  >
                    <SelectTrigger id="formaPagamento">
                      <SelectValue placeholder="Selecione a forma da transferência" />
                    </SelectTrigger>

                    <SelectContent>
                      {formaTransferenciaOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusTransferenciaBancaria"
                    required
                    tooltip="Selecione a situação atual da transferência para indicar se ela ainda será realizada, está em andamento, foi concluída ou se encontra em outra situação disponível no cadastro."
                  >
                    Situação da Transferência
                  </FieldLabel>

                  <Select
                    value={form.statusTransferenciaBancaria}
                    onValueChange={(v) => set("statusTransferenciaBancaria", v)}
                    disabled={isView}
                  >
                    <SelectTrigger id="statusTransferenciaBancaria">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusTransferenciaOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            {/* 4 — Comprovante da transferência */}
            <FormSectionCard
              icon={FileText}
              title="Comprovante da transferência"
              description="Mantenha anexado, quando disponível, o documento que comprova a transferência realizada entre as contas."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="comprovante"
                    tooltip="Anexe o comprovante emitido pela instituição financeira ou outro documento que comprove a realização desta transferência, quando disponível."
                  >
                    Comprovante da Transferência
                  </FieldLabel>

                  {form.urlComprovante || form.nomeComprovante ? (
                    <div className="attachment-file-glass flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                          aria-hidden
                        />

                        <span className="truncate text-sm text-foreground">
                          {form.nomeComprovante || "Comprovante anexado"}
                        </span>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        {form.urlComprovante && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => void openComprovante()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            Abrir
                          </Button>
                        )}

                        {!isView && (
                          <>
                            <Button
                              type="button"
                              variant="glassSecondary"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Substituir
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={removeFile}
                              aria-label="Remover comprovante"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : isView ? (
                    <div className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-[13px] text-muted-foreground backdrop-blur-sm">
                      Nenhum comprovante anexado.
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" aria-hidden />
                      Selecionar arquivo
                    </Button>
                  )}

                  <input
                    ref={fileInputRef}
                    id="comprovante"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.ofx"
                    className="hidden"
                    onChange={handleFile}
                  />

                  {!isView && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Formatos aceitos: PDF, PNG, JPG, JPEG, WEBP ou OFX.
                      Tamanho máximo: 10 MB.
                    </p>
                  )}
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          {!isView ? (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/transferencias-bancarias")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={semContasSuficientes}
              >
                Salvar
              </Button>
            </div>
          ) : (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/transferencias-bancarias")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Transferências Bancárias"
        href="/wiki/financeiro/transferencia-bancaria"
      />
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronDown,
  Landmark,
  Search,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { ImportDataButton } from "@/components/ImportDataButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { cn } from "@/lib/utils";
import { maskBankAccount, maskBankAgency } from "@/lib/masks";
import { toast } from "sonner";
import {
  createEmptyContaBancaria,
  getContaBancaria,
  buildContaBancariaPayload,
  createContaBancaria,
  nomeBancoOptions,
  statusContaBancariaOptions,
  tipoContaBancariaOptions,
  updateContaBancaria,
  type ContaBancariaData,
  type NomeBanco,
  type StatusContaBancaria,
  type TipoContaBancaria,
} from "@/data/contasBancarias";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Select pesquisável (uso interno desta página, para a lista extensa de bancos). */
function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled,
}: {
  id?: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return options;
    return options.filter((o) => normalize(o.label).includes(term));
  }, [options, query]);

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
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 py-1.5 text-left text-sm backdrop-blur-sm transition-colors",
            "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <span
            className={
              selectedLabel ? "text-foreground" : "text-muted-foreground"
            }
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
        className="w-[--radix-popover-trigger-width] p-1"
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
        <div className="max-h-60 overflow-y-auto" role="listbox">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          {filtered.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0",
                    selected ? "text-primary" : "opacity-0",
                  )}
                  aria-hidden
                />
                {option.label}
              </button>
            );
          })}
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

export default function ContaBancariaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const isView = !!id && !pathname.endsWith("/editar");
  const isEdit = !!id && pathname.endsWith("/editar");

  const [form, setForm] = useState<ContaBancariaData>(() =>
    createEmptyContaBancaria(),
  );
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useImportFormFill("contas-bancarias", setForm);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getContaBancaria(id)
      .then((found) => active && setForm(found))
      .catch((error) => {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Conta bancária não encontrada.",
        );
        navigate("/contas-bancarias");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof ContaBancariaData>(
    k: K,
    v: ContaBancariaData[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeConta.trim()) {
      toast.error("Informe o nome da conta.");
      return;
    }
    if (!form.nomeBanco) {
      toast.error("Selecione o banco.");
      return;
    }
    if (!form.tipoContaBancaria) {
      toast.error("Selecione o tipo de conta.");
      return;
    }
    if (!form.agencia.trim()) {
      toast.error("Informe a agência.");
      return;
    }
    if (!form.numeroConta.trim()) {
      toast.error("Informe o número da conta.");
      return;
    }
    if (!form.statusContaBancaria) {
      toast.error("Selecione a situação da conta.");
      return;
    }

    try {
      setSaving(true);
      const payload = buildContaBancariaPayload(form);
      if (isEdit && id) await updateContaBancaria(id, payload);
      else await createContaBancaria(payload);
      window.dispatchEvent(
        new CustomEvent("aurit:import-review-save-success", {
          detail: { module: "contas-bancarias" },
        }),
      );
      toast.success(
        isEdit
          ? "Alterações salvas com sucesso."
          : "Conta bancária salva com sucesso.",
      );
      navigate("/contas-bancarias");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a conta bancária.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/contas-bancarias" />
        <PageTitle
          title="Contas Bancárias"
          tooltip="Nesta página são cadastradas e acompanhadas as contas bancárias da organização. Esses registros permitem utilizar as contas nas diferentes rotinas financeiras da Aurit, como contas a pagar, contas a receber, fluxo de caixa e conciliação, mantendo seus dados e sua situação sempre atualizados."
          actions={
            isView ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/contas-bancarias")!}
                canFillForm
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={isView || loading || saving}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={Wallet}
              title="Identificação da conta"
              description="Defina como esta conta será identificada dentro da Aurit para facilitar seu uso nas rotinas financeiras da organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomeConta"
                    required
                    tooltip="Informe um nome interno para facilitar a identificação da conta. Ex.: Conta principal, Conta de projetos ou Conta do projeto Cultura Viva."
                  >
                    Nome da Conta
                  </FieldLabel>

                  <Input
                    id="nomeConta"
                    value={form.nomeConta}
                    onChange={(e) => set("nomeConta", e.target.value)}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Landmark}
              title="Dados bancários"
              description="Cadastre os dados que permitem identificar corretamente a conta bancária que será utilizada nas movimentações financeiras da organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomeBanco"
                    required
                    tooltip="Selecione a instituição financeira onde esta conta está cadastrada."
                  >
                    Banco
                  </FieldLabel>

                  <SearchableSelect
                    id="nomeBanco"
                    options={nomeBancoOptions}
                    value={form.nomeBanco}
                    onChange={(v) => set("nomeBanco", v as NomeBanco)}
                    placeholder="Selecione o banco"
                    searchPlaceholder="Pesquisar banco..."
                    emptyMessage="Nenhum banco encontrado."
                    disabled={isView}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="agencia"
                    required
                    tooltip="Informe o número da agência vinculada à conta, incluindo o dígito quando fizer parte da identificação."
                  >
                    Agência
                  </FieldLabel>

                  <Input
                    id="agencia"
                    value={form.agencia}
                    onChange={(e) =>
                      set("agencia", maskBankAgency(e.target.value))
                    }
                    inputMode="numeric"
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoContaBancaria"
                    required
                    tooltip="Selecione o tipo desta conta bancária, conforme informado pela instituição financeira."
                  >
                    Tipo de Conta
                  </FieldLabel>

                  <Select
                    value={form.tipoContaBancaria}
                    onValueChange={(v) =>
                      set("tipoContaBancaria", v as TipoContaBancaria)
                    }
                    disabled={isView}
                  >
                    <SelectTrigger id="tipoContaBancaria">
                      <SelectValue placeholder="Selecione o tipo de conta" />
                    </SelectTrigger>

                    <SelectContent>
                      {tipoContaBancariaOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="numeroConta"
                    required
                    tooltip="Informe o número da conta bancária, incluindo o dígito verificador quando houver."
                  >
                    Número da Conta
                  </FieldLabel>

                  <Input
                    id="numeroConta"
                    value={form.numeroConta}
                    onChange={(e) =>
                      set("numeroConta", maskBankAccount(e.target.value))
                    }
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Building2}
              title="Situação da conta"
              description="Defina se esta conta estará disponível para uso nas rotinas financeiras da Aurit ou se deverá permanecer apenas para consulta de registros anteriores."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="statusContaBancaria"
                    required
                    tooltip="Selecione a situação atual da conta. Uma conta ativa pode ser utilizada nas operações financeiras da organização; uma conta inativa permanece cadastrada para consulta, mas não deve ser utilizada em novos lançamentos."
                  >
                    Situação da Conta
                  </FieldLabel>

                  <Select
                    value={form.statusContaBancaria}
                    onValueChange={(v) =>
                      set("statusContaBancaria", v as StatusContaBancaria)
                    }
                    disabled={isView}
                  >
                    <SelectTrigger id="statusContaBancaria">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusContaBancariaOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                onClick={() => navigate("/contas-bancarias")}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="glassPrimary" className="h-9 px-5">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          ) : (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/contas-bancarias")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Contas Bancárias"
        href="/wiki/financeiro/contas-bancarias"
      />
    </AppLayout>
  );
}

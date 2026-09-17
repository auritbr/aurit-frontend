import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Link2,
  Receipt,
  Search,
  CalendarDays,
  Upload,
  Users,
  Wallet,
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
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { invalidateFinancialData } from "@/lib/financialDataInvalidation";
import { maskCpfCnpj } from "@/lib/masks";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  classificacaoGruposOrdenados,
  createEmptyContaPagar,
  formaPagamentoOptions,
  formatCurrency,
  getContaPagar,
  maskMoney,
  parseMoney,
  saveContaPagar,
  statusFinanceiroOptions,
  type ContaPagarData,
  getContaPagarComprovanteUrl,
} from "@/data/contasPagar";
import {
  getContasBancarias,
  nomeBancoLabel,
  tipoContaBancariaLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import { getColaboradores } from "@/data/colaboradores";
import { getParticipantes } from "@/data/participantes";
import { getIntegrantes } from "@/data/integrantes";
import { getFornecedores } from "@/data/fornecedores";
import { getParceiros } from "@/data/parceiros";
import { getProjetos } from "@/data/projetos";
import { getAtividades } from "@/data/atividades";
import { nameWithYear } from "@/lib/entityYear";
import { getEventosCulturais } from "@/data/eventosCulturais";
import { getAcoesDivulgacao } from "@/data/acoesDivulgacao";

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
}: {
  id?: string;
  groups: readonly Grupo[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
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
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border/70 bg-background/70 px-3 py-1.5 text-left text-sm backdrop-blur-sm transition-colors",
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
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                        {option.hint}
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

type TipoCredor =
  | "COLABORADOR"
  | "PARTICIPANTE"
  | "INTEGRANTE"
  | "FORNECEDOR"
  | "PARCEIRO"
  | "EXTERNO"
  | "";
type TipoAcao = "NENHUMA" | "ATIVIDADE" | "EVENTO" | "ACAO";

const tipoCredorOptions = [
  { value: "COLABORADOR", label: "Colaborador" },
  { value: "PARTICIPANTE", label: "Participante" },
  { value: "INTEGRANTE", label: "Integrante" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "PARCEIRO", label: "Parceiro" },
  { value: "EXTERNO", label: "Credor externo" },
];

const tipoAcaoOptions = [
  { value: "NENHUMA", label: "Nenhuma" },
  { value: "ATIVIDADE", label: "Atividade" },
  { value: "EVENTO", label: "Evento cultural" },
  { value: "ACAO", label: "Ação de divulgação" },
];

export default function ContaPagarForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const isView = !!id && !pathname.endsWith("/editar");
  const isEdit = !!id && pathname.endsWith("/editar");

  const [form, setForm] = useState<ContaPagarData>(() =>
    createEmptyContaPagar(),
  );
  const [tipoCredor, setTipoCredor] = useState<TipoCredor>("");
  const [tipoAcao, setTipoAcao] = useState<TipoAcao>("NENHUMA");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contasBancarias, setContasBancarias] = useState<ContaBancariaData[]>(
    [],
  );
  const [colaboradorOptions, setColaboradorOptions] = useState<Option[]>([]);
  const [participanteOptions, setParticipanteOptions] = useState<Option[]>([]);
  const [integranteOptions, setIntegranteOptions] = useState<Option[]>([]);
  const [fornecedorOptions, setFornecedorOptions] = useState<Option[]>([]);
  const [parceiroOptions, setParceiroOptions] = useState<Option[]>([]);
  const [projetoOptions, setProjetoOptions] = useState<Option[]>([]);
  const [atividadeRecords, setAtividadeRecords] = useState<
    Array<Option & { projetoId: string }>
  >([]);
  const [eventoRecords, setEventoRecords] = useState<
    Array<Option & { projetoId: string }>
  >([]);
  const [acaoRecords, setAcaoRecords] = useState<
    Array<Option & { projetoId: string }>
  >([]);

  useImportFormFill("contas-pagar", setForm);

  const contaBancariaGroups = useMemo<Grupo[]>(() => {
    const describe = (c: (typeof contasBancarias)[number]) =>
      [
        c.nomeConta || "Conta sem nome",
        nomeBancoLabel(c.nomeBanco),
        c.agencia ? `Ag. ${c.agencia}` : "",
        c.numeroConta ? `Conta ${c.numeroConta}` : "",
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

  const atividadeOptions = useMemo<Option[]>(() => {
    const list = form.projetoId
      ? atividadeRecords.filter((item) => item.projetoId === form.projetoId)
      : atividadeRecords;
    return list.map(({ value, label }) => ({ value, label }));
  }, [atividadeRecords, form.projetoId]);

  const eventoOptions = useMemo<Option[]>(() => {
    const list = form.projetoId
      ? eventoRecords.filter((item) => item.projetoId === form.projetoId)
      : eventoRecords;
    return list.map(({ value, label }) => ({ value, label }));
  }, [eventoRecords, form.projetoId]);

  const acaoOptions = useMemo<Option[]>(() => {
    const list = form.projetoId
      ? acaoRecords.filter((item) => item.projetoId === form.projetoId)
      : acaoRecords;
    return list.map(({ value, label }) => ({ value, label }));
  }, [acaoRecords, form.projetoId]);

  useEffect(() => {
    void Promise.all([
      getContasBancarias(),
      getColaboradores(),
      getParticipantes(),
      getIntegrantes(),
      getFornecedores(),
      getParceiros(),
      getProjetos(),
      getAtividades(),
      getEventosCulturais(),
      getAcoesDivulgacao(),
    ])
      .then(
        ([
          bancos,
          colaboradores,
          participantes,
          integrantes,
          fornecedores,
          parceiros,
          projetos,
          atividades,
          eventos,
          acoes,
        ]) => {
          setContasBancarias(bancos);
          setColaboradorOptions(
            colaboradores.map((item) => ({
              value: item.id,
              label: item.nomeCompleto,
            })),
          );
          setParticipanteOptions(
            participantes.map((item) => ({
              value: item.id,
              label: item.nomeCompleto,
            })),
          );
          setIntegranteOptions(
            integrantes.map((item) => ({
              value: String(item.id),
              label: item.nomeCompleto,
            })),
          );
          setFornecedorOptions(
            fornecedores.map((item) => ({
              value: item.id,
              label: item.nomeFornecedor,
            })),
          );
          setParceiroOptions(
            parceiros.map((item) => ({
              value: item.id,
              label: item.nomeParceiro,
            })),
          );
          setProjetoOptions(
            projetos.map((item) => ({
              value: String(item.id),
              label: item.nomeProjeto,
            })),
          );
          setAtividadeRecords(
            atividades.map((item) => ({
              value: item.id,
              label: nameWithYear(item.nomeAtividade, item.dataInicio),
              projetoId: item.projetoId,
            })),
          );
          setEventoRecords(
            eventos.map((item) => ({
              value: item.id,
              label: item.nomeEvento,
              projetoId: item.projetoId || item.projetosIds[0] || "",
            })),
          );
          setAcaoRecords(
            acoes.map((item) => ({
              value: item.id,
              label: item.nomeAcao,
              projetoId: item.projetoId,
            })),
          );
        },
      )
      .catch(() =>
        toast.error(
          "Não foi possível carregar todos os vínculos da conta a pagar.",
        ),
      );
  }, []);

  useEffect(() => {
    if (!id) return;
    void getContaPagar(id)
      .then((found) => {
        setForm(found);
        setTipoCredor(
          found.colaboradorId
            ? "COLABORADOR"
            : found.participanteId
              ? "PARTICIPANTE"
              : found.integranteId
                ? "INTEGRANTE"
                : found.fornecedorId
                  ? "FORNECEDOR"
                  : found.parceiroId
                    ? "PARCEIRO"
                    : found.nomeCredor
                      ? "EXTERNO"
                      : "",
        );
        setTipoAcao(
          found.atividadeId
            ? "ATIVIDADE"
            : found.eventoCulturalId
              ? "EVENTO"
              : found.acaoDivulgacaoId
                ? "ACAO"
                : "NENHUMA",
        );
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Conta a pagar não encontrada.",
        );
        navigate("/contas-pagar");
      });
  }, [id, navigate]);

  const set = <K extends keyof ContaPagarData>(k: K, v: ContaPagarData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setMoney = (k: keyof ContaPagarData, v: string) =>
    setForm((p) => ({ ...p, [k]: maskMoney(v) }));

  const handleTipoCredor = (value: TipoCredor) => {
    setTipoCredor(value);
    setForm((p) => ({
      ...p,
      colaboradorId: "",
      participanteId: "",
      integranteId: "",
      fornecedorId: "",
      parceiroId: "",
      nomeCredor: value === "EXTERNO" ? p.nomeCredor : "",
      documentoCredor: value === "EXTERNO" ? p.documentoCredor : "",
    }));
  };

  const handleTipoAcao = (value: TipoAcao) => {
    setTipoAcao(value);
    setForm((p) => ({
      ...p,
      atividadeId: "",
      eventoCulturalId: "",
      acaoDivulgacaoId: "",
    }));
  };

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
          ? await getContaPagarComprovanteUrl(id)
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

  const isLiquidado = form.statusFinanceiro === "LIQUIDADO";

  const valorFinal =
    parseMoney(form.valorAPagar) +
    parseMoney(form.juros) +
    parseMoney(form.multa) -
    parseMoney(form.desconto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeContaPagar?.trim())
      return toast.error("Informe o nome da conta.");
    if (!form.descricaoContaPagar?.trim())
      return toast.error("Informe a descrição da conta.");
    if (!form.classificacaoContaPagar)
      return toast.error("Selecione a classificação da despesa.");
    if (!form.dataCompetencia)
      return toast.error("Informe a data de competência.");
    if (!form.dataVencimento)
      return toast.error("Informe a data de vencimento.");
    if (!tipoCredor) return toast.error("Selecione o tipo de credor.");
    if (tipoCredor === "COLABORADOR" && !form.colaboradorId)
      return toast.error("Selecione o colaborador.");
    if (tipoCredor === "PARTICIPANTE" && !form.participanteId)
      return toast.error("Selecione o participante.");
    if (tipoCredor === "INTEGRANTE" && !form.integranteId)
      return toast.error("Selecione o integrante.");
    if (tipoCredor === "FORNECEDOR" && !form.fornecedorId)
      return toast.error("Selecione o fornecedor.");
    if (tipoCredor === "PARCEIRO" && !form.parceiroId)
      return toast.error("Selecione o parceiro.");
    if (tipoCredor === "EXTERNO" && !form.nomeCredor?.trim())
      return toast.error("Informe o nome do credor.");
    if (!form.valorAPagar || parseMoney(form.valorAPagar) <= 0)
      return toast.error("Informe o valor a pagar.");
    if (!form.formaPagamento)
      return toast.error("Selecione a forma de pagamento.");
    if (!form.statusFinanceiro)
      return toast.error("Selecione a situação da conta.");
    if (isLiquidado && !form.contaBancariaId)
      return toast.error("Selecione a conta bancária da conta liquidada.");
    if (isLiquidado && !form.dataPagamento)
      return toast.error("Informe a data de pagamento da conta liquidada.");
    if (isLiquidado && (!form.valorPago || parseMoney(form.valorPago) <= 0))
      return toast.error("Informe o valor pago da conta liquidada.");

    try {
      await saveContaPagar(form);
      invalidateFinancialData("conta-pagar");
      if (!isEdit) emitJourneyNextStep();
      toast.success(
        isEdit
          ? "Alterações salvas com sucesso."
          : "Conta a pagar salva com sucesso.",
      );
      navigate("/contas-pagar");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a conta a pagar.",
      );
    }
  };

  const moneyField = (
    key: keyof ContaPagarData,
    label: string,
    tooltip: string,
    required?: boolean,
  ) => (
    <Field>
      <FieldLabel htmlFor={String(key)} required={required} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
          R$
        </span>
        <Input
          id={String(key)}
          inputMode="numeric"
          value={(form[key] as string) || ""}
          onChange={(e) => setMoney(key, e.target.value)}
          className="pl-9"
        />
      </div>
    </Field>
  );

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/contas-pagar" />
        <PageTitle
          title="Contas a Pagar"
          tooltip="Nesta página são cadastradas e acompanhadas as despesas da organização, desde o registro do valor e do vencimento até a realização do pagamento. Também podem ser informados o credor, a forma de pagamento e os projetos ou ações relacionados à despesa."
          actions={
            isView ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/contas-pagar")!}
                canFillForm
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={isView}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            {/* 1 — Identificação da despesa */}
            <FormSectionCard
              icon={Receipt}
              title="Identificação da despesa"
              description="Registre as informações principais da despesa para que ela possa ser identificada e acompanhada no contas a pagar."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="nomeContaPagar"
                    required
                    tooltip="Informe um nome curto e claro que permita reconhecer facilmente a despesa. Ex.: Aluguel do espaço, Serviço de fotografia ou Compra de material pedagógico."
                  >
                    Nome da Despesa
                  </FieldLabel>

                  <Input
                    id="nomeContaPagar"
                    value={form.nomeContaPagar}
                    onChange={(e) => set("nomeContaPagar", e.target.value)}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoContaPagar"
                    required
                    tooltip="Descreva o que será pago e, quando necessário, informe detalhes que ajudem a compreender a origem ou a finalidade da despesa."
                  >
                    Descrição da Despesa
                  </FieldLabel>

                  <Textarea
                    id="descricaoContaPagar"
                    value={form.descricaoContaPagar}
                    onChange={(e) => set("descricaoContaPagar", e.target.value)}
                    rows={3}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="classificacaoContaPagar"
                    required
                    tooltip="Selecione a categoria que melhor representa esta despesa. A classificação ajuda a organizar e analisar os gastos da organização."
                  >
                    Classificação
                  </FieldLabel>

                  <SearchableSelect
                    id="classificacaoContaPagar"
                    groups={classificacaoGruposOrdenados}
                    value={form.classificacaoContaPagar}
                    onChange={(v) => set("classificacaoContaPagar", v)}
                    placeholder="Selecione a classificação"
                    searchPlaceholder="Pesquisar classificação..."
                    emptyMessage="Nenhuma classificação encontrada."
                    disabled={isView}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="numeroDocumento"
                    tooltip="Informe, quando houver, o número da nota fiscal, boleto, recibo, fatura, contrato ou outro documento relacionado à despesa."
                  >
                    Número do Documento
                  </FieldLabel>

                  <Input
                    id="numeroDocumento"
                    value={form.numeroDocumento}
                    onChange={(e) => set("numeroDocumento", e.target.value)}
                  />
                </Field>
              </div>
            </FormSectionCard>

            {/* 2 — Credor */}
            <FormSectionCard
              icon={Users}
              title="Credor"
              description="Identifique quem deverá receber o pagamento desta despesa."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="tipoCredor"
                    required
                    tooltip="Selecione a categoria que representa a pessoa, profissional, empresa ou instituição que receberá o pagamento."
                  >
                    Tipo de Credor
                  </FieldLabel>

                  <Select
                    value={tipoCredor}
                    onValueChange={(v) => handleTipoCredor(v as TipoCredor)}
                    disabled={isView}
                  >
                    <SelectTrigger id="tipoCredor">
                      <SelectValue placeholder="Selecione o tipo de credor" />
                    </SelectTrigger>

                    <SelectContent>
                      {tipoCredorOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {tipoCredor === "COLABORADOR" && (
                  <Field>
                    <FieldLabel
                      htmlFor="colaboradorId"
                      required
                      tooltip="Selecione o colaborador que deverá receber o pagamento desta despesa."
                    >
                      Colaborador
                    </FieldLabel>

                    <EntitySelect
                      id="colaboradorId"
                      value={form.colaboradorId}
                      onChange={(v) => set("colaboradorId", v)}
                      options={colaboradorOptions}
                      placeholder="Selecione o colaborador"
                      emptyMessage="Nenhum colaborador cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoCredor === "PARTICIPANTE" && (
                  <Field>
                    <FieldLabel
                      htmlFor="participanteId"
                      required
                      tooltip="Selecione o participante que deverá receber o pagamento desta despesa."
                    >
                      Participante
                    </FieldLabel>

                    <EntitySelect
                      id="participanteId"
                      value={form.participanteId}
                      onChange={(v) => set("participanteId", v)}
                      options={participanteOptions}
                      placeholder="Selecione o participante"
                      emptyMessage="Nenhum participante cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoCredor === "INTEGRANTE" && (
                  <Field>
                    <FieldLabel
                      htmlFor="integranteId"
                      required
                      tooltip="Selecione o integrante que deverá receber o pagamento desta despesa."
                    >
                      Integrante
                    </FieldLabel>

                    <EntitySelect
                      id="integranteId"
                      value={form.integranteId}
                      onChange={(v) => set("integranteId", v)}
                      options={integranteOptions}
                      placeholder="Selecione o integrante"
                      emptyMessage="Nenhum integrante cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoCredor === "FORNECEDOR" && (
                  <Field>
                    <FieldLabel
                      htmlFor="fornecedorId"
                      required
                      tooltip="Selecione o fornecedor que receberá o pagamento."
                    >
                      Fornecedor
                    </FieldLabel>
                    <EntitySelect
                      id="fornecedorId"
                      value={form.fornecedorId}
                      onChange={(v) => set("fornecedorId", v)}
                      options={fornecedorOptions}
                      placeholder="Selecione o fornecedor"
                      emptyMessage="Nenhum fornecedor cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoCredor === "PARCEIRO" && (
                  <Field>
                    <FieldLabel
                      htmlFor="parceiroId"
                      required
                      tooltip="Selecione o parceiro que receberá o pagamento."
                    >
                      Parceiro
                    </FieldLabel>
                    <EntitySelect
                      id="parceiroId"
                      value={form.parceiroId}
                      onChange={(v) => set("parceiroId", v)}
                      options={parceiroOptions}
                      placeholder="Selecione o parceiro"
                      emptyMessage="Nenhum parceiro cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoCredor === "EXTERNO" && (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor="nomeCredor"
                        required
                        tooltip="Informe o nome da pessoa, profissional, empresa ou instituição que deverá receber o pagamento."
                      >
                        Nome do Credor
                      </FieldLabel>

                      <Input
                        id="nomeCredor"
                        value={form.nomeCredor}
                        onChange={(e) => set("nomeCredor", e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="documentoCredor"
                        tooltip="Informe o CPF, CNPJ ou outro documento utilizado para identificar o credor, quando disponível."
                      >
                        Documento do Credor
                      </FieldLabel>

                      <Input
                        id="documentoCredor"
                        value={maskCpfCnpj(form.documentoCredor)}
                        onChange={(e) =>
                          set("documentoCredor", maskCpfCnpj(e.target.value))
                        }
                      />
                    </Field>
                  </>
                )}
              </div>
            </FormSectionCard>

            {/* 3 — Vínculos da despesa */}
            <FormSectionCard
              icon={Link2}
              title="Vínculos da despesa"
              description="Relacione a despesa a um projeto ou ação, quando houver, para manter os gastos organizados de acordo com sua utilização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="projetoId"
                    tooltip="Selecione o projeto ao qual esta despesa está relacionada, quando houver."
                  >
                    Projeto
                  </FieldLabel>

                  <EntitySelect
                    id="projetoId"
                    value={form.projetoId}
                    onChange={(v) => set("projetoId", v)}
                    options={projetoOptions}
                    placeholder="Selecione o projeto"
                    emptyMessage="Nenhum projeto cadastrado."
                    disabled={isView}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoAcao"
                    tooltip="Selecione o tipo de ação relacionada a esta despesa, quando houver. Depois, escolha a atividade, o evento cultural ou a ação de divulgação correspondente."
                  >
                    Tipo de Ação Relacionada
                  </FieldLabel>

                  <Select
                    value={tipoAcao}
                    onValueChange={(v) => handleTipoAcao(v as TipoAcao)}
                    disabled={isView}
                  >
                    <SelectTrigger id="tipoAcao">
                      <SelectValue placeholder="Selecione o tipo de ação" />
                    </SelectTrigger>

                    <SelectContent>
                      {tipoAcaoOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {tipoAcao === "ATIVIDADE" && (
                  <Field>
                    <FieldLabel
                      htmlFor="atividadeId"
                      tooltip="Selecione a atividade relacionada a esta despesa."
                    >
                      Atividade
                    </FieldLabel>

                    <EntitySelect
                      id="atividadeId"
                      value={form.atividadeId}
                      onChange={(v) => set("atividadeId", v)}
                      options={atividadeOptions}
                      placeholder="Selecione a atividade"
                      emptyMessage="Nenhuma atividade cadastrada."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoAcao === "EVENTO" && (
                  <Field>
                    <FieldLabel
                      htmlFor="eventoCulturalId"
                      tooltip="Selecione o evento cultural relacionado a esta despesa."
                    >
                      Evento Cultural
                    </FieldLabel>

                    <EntitySelect
                      id="eventoCulturalId"
                      value={form.eventoCulturalId}
                      onChange={(v) => set("eventoCulturalId", v)}
                      options={eventoOptions}
                      placeholder="Selecione o evento cultural"
                      emptyMessage="Nenhum evento cultural cadastrado."
                      disabled={isView}
                    />
                  </Field>
                )}

                {tipoAcao === "ACAO" && (
                  <Field>
                    <FieldLabel
                      htmlFor="acaoDivulgacaoId"
                      tooltip="Selecione a ação de divulgação relacionada a esta despesa."
                    >
                      Ação de Divulgação
                    </FieldLabel>

                    <EntitySelect
                      id="acaoDivulgacaoId"
                      value={form.acaoDivulgacaoId}
                      onChange={(v) => set("acaoDivulgacaoId", v)}
                      options={acaoOptions}
                      placeholder="Selecione a ação de divulgação"
                      emptyMessage="Nenhuma ação de divulgação cadastrada."
                      disabled={isView}
                    />
                  </Field>
                )}
              </div>
            </FormSectionCard>

            {/* 4 — Valores e vencimento */}
            <FormSectionCard
              icon={CalendarDays}
              title="Valores e vencimento"
              description="Informe o valor da despesa e as datas necessárias para acompanhar seu prazo de pagamento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {moneyField(
                  "valorAPagar",
                  "Valor a Pagar",
                  "Informe o valor original da despesa, antes da aplicação de juros, multa ou desconto.",
                  true,
                )}

                <Field>
                  <FieldLabel
                    htmlFor="dataCompetencia"
                    required
                    tooltip="Informe a data que indica quando a despesa aconteceu ou a qual período ela se refere, mesmo que seja paga em outra data. Ex.: para uma conta de energia referente ao mês de julho, informe uma data correspondente a esse período."
                  >
                    Data de Competência
                  </FieldLabel>

                  <Input
                    id="dataCompetencia"
                    type="date"
                    value={form.dataCompetencia}
                    onChange={(e) => set("dataCompetencia", e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataVencimento"
                    required
                    tooltip="Informe a data limite para realizar o pagamento desta despesa."
                  >
                    Data de Vencimento
                  </FieldLabel>

                  <Input
                    id="dataVencimento"
                    type="date"
                    value={form.dataVencimento}
                    onChange={(e) => set("dataVencimento", e.target.value)}
                  />
                </Field>

                {moneyField(
                  "juros",
                  "Juros",
                  "Informe o valor dos juros acrescentados à despesa, quando houver.",
                )}

                {moneyField(
                  "multa",
                  "Multa",
                  "Informe o valor da multa acrescentada à despesa, quando houver.",
                )}

                {moneyField(
                  "desconto",
                  "Desconto",
                  "Informe o valor do desconto aplicado à despesa, quando houver.",
                )}

                <Field>
                  <FieldLabel
                    htmlFor="valorFinal"
                    tooltip="Este valor é calculado automaticamente a partir do valor original da despesa, somando juros e multa e descontando o valor informado como desconto."
                  >
                    Valor Final
                  </FieldLabel>

                  <div
                    id="valorFinal"
                    className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm"
                  >
                    {formatCurrency(valorFinal)}
                  </div>
                </Field>
              </div>
            </FormSectionCard>

            {/* 5 — Pagamento e comprovante */}
            <FormSectionCard
              icon={Wallet}
              title="Pagamento e comprovante"
              description="Acompanhe a situação da despesa e registre as informações do pagamento quando ele for realizado."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="statusFinanceiro"
                    required
                    tooltip="Selecione a situação atual da despesa. Pendente indica que o pagamento ainda deve ser realizado; Vencida indica que o prazo de pagamento já passou; Paga indica que o pagamento já foi realizado."
                  >
                    Situação da Despesa
                  </FieldLabel>

                  <Select
                    value={form.statusFinanceiro}
                    onValueChange={(v) => set("statusFinanceiro", v)}
                    disabled={isView}
                  >
                    <SelectTrigger id="statusFinanceiro">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusFinanceiroOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="formaPagamento"
                    required
                    tooltip="Selecione a forma prevista para o pagamento ou, se ele já tiver sido realizado, a forma efetivamente utilizada."
                  >
                    Forma de Pagamento
                  </FieldLabel>

                  <Select
                    value={form.formaPagamento}
                    onValueChange={(v) => set("formaPagamento", v)}
                    disabled={isView}
                  >
                    <SelectTrigger id="formaPagamento">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>

                    <SelectContent>
                      {formaPagamentoOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="contaBancariaId"
                    required={isLiquidado}
                    tooltip="Selecione a conta bancária que será utilizada para pagar esta despesa ou, se o pagamento já tiver sido realizado, a conta da qual o valor foi pago."
                  >
                    Conta Bancária
                  </FieldLabel>

                  {contaBancariaGroups.length === 0 ? (
                    <div className="flex min-h-9 w-full items-center rounded-[10px] border border-border/60 bg-muted/30 px-3 py-1.5 text-[13px] text-muted-foreground backdrop-blur-sm">
                      Nenhuma conta bancária disponível.
                    </div>
                  ) : (
                    <SearchableSelect
                      id="contaBancariaId"
                      groups={contaBancariaGroups}
                      value={form.contaBancariaId}
                      onChange={(v) => set("contaBancariaId", v)}
                      placeholder="Selecione a conta bancária"
                      searchPlaceholder="Pesquisar conta bancária..."
                      emptyMessage="Nenhuma conta bancária encontrada."
                      disabled={isView}
                    />
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataAgendamento"
                    tooltip="Informe a data em que o pagamento foi agendado ou programado para ser realizado, quando houver."
                  >
                    Data de Agendamento
                  </FieldLabel>

                  <Input
                    id="dataAgendamento"
                    type="date"
                    value={form.dataAgendamento}
                    onChange={(e) => set("dataAgendamento", e.target.value)}
                  />
                </Field>

                {isLiquidado && (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor="dataPagamento"
                        required
                        tooltip="Informe a data em que o pagamento desta despesa foi efetivamente realizado."
                      >
                        Data de Pagamento
                      </FieldLabel>

                      <Input
                        id="dataPagamento"
                        type="date"
                        value={form.dataPagamento}
                        onChange={(e) => set("dataPagamento", e.target.value)}
                      />
                    </Field>

                    {moneyField(
                      "valorPago",
                      "Valor pago",
                      "Informe o valor que foi efetivamente pago ao credor.",
                      true,
                    )}

                    <Field full>
                      <FieldLabel
                        htmlFor="comprovante"
                        tooltip="Anexe o comprovante do pagamento realizado, quando disponível."
                      >
                        Comprovante de Pagamento
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
                            {(form.urlComprovante || id) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5"
                                onClick={() => void openComprovante()}
                              >
                                <ExternalLink
                                  className="h-3.5 w-3.5"
                                  aria-hidden
                                />
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
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={handleFile}
                      />

                      {!isView && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Formatos aceitos: PDF, PNG, JPG, JPEG ou WEBP. Tamanho
                          máximo: 10 MB.
                        </p>
                      )}
                    </Field>
                  </>
                )}
              </div>

              {isLiquidado && (
                <div className="mt-4 rounded-[12px] border border-primary/15 bg-primary-soft/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground backdrop-blur-md">
                  Esta despesa está paga. Confira a data, o valor e a conta
                  bancária utilizada e, quando disponível, anexe o comprovante
                  do pagamento.
                </div>
              )}
            </FormSectionCard>
          </fieldset>

          {!isView ? (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/contas-pagar")}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="glassPrimary" className="h-9 px-5">
                Salvar
              </Button>
            </div>
          ) : (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/contas-pagar")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Contas a Pagar"
        href="/wiki/financeiro/contas-a-pagar"
      />
    </AppLayout>
  );
}

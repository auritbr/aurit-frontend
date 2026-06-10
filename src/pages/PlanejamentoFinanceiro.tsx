import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Calculator,
  Eye,
  FileText,
  FolderKanban,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  ShieldCheck,
  Info,
  X,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { HelpTooltip } from "@/components/HelpTooltip";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportPlanejamentoFinanceiroPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
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
  buildPlanejamentoFinanceiroPayload,
  createEmptyPlanejamentoFinanceiro,
  createPlanejamentoFinanceiro,
  deletePlanejamentoFinanceiro,
  formatCurrencyBR,
  formatCurrencyInput,
  formatDateBr,
  getEquipesEditalOptions,
  getPlanejamentosFinanceiros,
  getPropostasEditalOptions,
  parseCurrencyInput,
  planejamentoFinanceiroPeriodoError,
  planejamentoFinanceiroQuantidadeError,
  planejamentoFinanceiroValorTotalError,
  planejamentoFinanceiroValorUnitarioError,
  unidadeMedidaLabel,
  unidadeMedidaOptions,
  updatePlanejamentoFinanceiro,
  type EquipeEditalOption,
  type PlanejamentoFinanceiroData,
  type PropostaEditalOption,
} from "@/data/planejamentoFinanceiro";
import { toast } from "sonner";

type SortKey = "item" | "inicio" | "fim" | "quantidade" | "unidade" | "valorUnitario" | "valorTotal" | "proposta" | "equipe";

type FormMode = "create" | "edit" | "view";

const PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY =
  "aurit:planejamento-financeiro:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PlanejamentoFinanceiroNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function criarProximaAcaoPlanejamentoFinanceiro(): PlanejamentoFinanceiroNextStepCardData {
  return {
    titulo:
      "Após estruturar a aplicação de recursos, registre o resultado da proposta",
    descricao:
      "O resultado da proposta permite acompanhar a situação da candidatura após a análise do edital, registrando se foi aprovada, não classificada ou suplente, além de registrar datas, observações e informações importantes para o histórico institucional.",
    acaoLabel: "Cadastrar resultado",
    acaoUrl: "/resultados-propostas/novo",
    acaoSecundariaLabel: "Ver aplicação de recursos",
    acaoSecundariaUrl: "/planejamento-financeiro",
    variante: "pendente",
  };
}

const requiredFields: Array<[keyof PlanejamentoFinanceiroData, string]> = [
  ["nomePlanejamento", "Item da aplicação"],
  ["justificativaPlanejamento", "Justificativa"],
  ["dataInicio", "Data de início"],
  ["dataFim", "Data de fim"],
  ["quantidade", "Quantidade"],
  ["unidadeMedida", "Unidade de medida"],
  ["valorUnitario", "Valor unitário"],
  ["valorTotal", "Valor total"],
  ["propostaEditalId", "Proposta de edital"],
];

const onlyPositiveInteger = (value: string) =>
  value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

const moneyEqual = (a: number, b: number) => Math.abs(a - b) < 0.01;

const buildTotalValue = (quantidade: string, valorUnitario: string) => {
  const quantidadeNumber = Number(quantidade);
  const valorUnitarioNumber = parseCurrencyInput(valorUnitario);

  if (!quantidadeNumber || !valorUnitarioNumber) return "";

  const total = quantidadeNumber * valorUnitarioNumber;

  return total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function PlanejamentoFinanceiro() {
  const tableRef = useRef<HTMLTableElement>(null);

  const [items, setItems] = useState<PlanejamentoFinanceiroData[]>([]);
  const [propostasEditais, setPropostasEditais] = useState<
    PropostaEditalOption[]
  >([]);
  const [equipesEdital, setEquipesEdital] = useState<EquipeEditalOption[]>([]);
  const [form, setForm] = useState<PlanejamentoFinanceiroData>(() =>
    createEmptyPlanejamentoFinanceiro(),
  );
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PlanejamentoFinanceiroNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const readOnly = mode === "view";
  const isPaginaInicial = !showForm;

  const quantidadeNumero = Number(form.quantidade);
  const valorUnitarioNumero = parseCurrencyInput(form.valorUnitario);
  const valorTotalNumero = parseCurrencyInput(form.valorTotal);
  const calculatedTotal = buildTotalValue(form.quantidade, form.valorUnitario);
  const calculatedTotalNumero = parseCurrencyInput(calculatedTotal);

  const invalidQuantidade =
    !!form.quantidade && (!quantidadeNumero || quantidadeNumero <= 0);

  const invalidValorUnitario =
    !!form.valorUnitario && valorUnitarioNumero <= 0;

  const invalidValorTotal =
    !!form.valorTotal &&
    !!calculatedTotal &&
    !moneyEqual(valorTotalNumero, calculatedTotalNumero);

  const invalidPeriodo =
    !!form.dataInicio && !!form.dataFim && form.dataFim < form.dataInicio;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo(
          "PLANEJAMENTO_FINANCEIRO",
        );

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(
        raw,
      ) as PlanejamentoFinanceiroNextStepCardData;

      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY);

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [planejamentosData, propostasData, equipesData] =
        await Promise.all([
          getPlanejamentosFinanceiros(),
          getPropostasEditalOptions(),
          getEquipesEditalOptions(),
        ]);

      setItems(planejamentosData);
      setPropostasEditais(propostasData);
      setEquipesEdital(equipesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar aplicação de recursos.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const equipesFiltradas = useMemo(() => {
    if (!form.propostaEditalId) return equipesEdital;

    return equipesEdital.filter(
      (equipe) =>
        !equipe.propostaEditalId ||
        equipe.propostaEditalId === form.propostaEditalId,
    );
  }, [equipesEdital, form.propostaEditalId]);

  const setField = <K extends keyof PlanejamentoFinanceiroData>(
    key: K,
    value: PlanejamentoFinanceiroData[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "quantidade" || key === "valorUnitario") {
        next.valorTotal = buildTotalValue(next.quantidade, next.valorUnitario);
      }

      if (key === "propostaEditalId") {
        const equipeContinuaValida = equipesEdital.some(
          (equipe) =>
            equipe.id === next.equipeEditalId &&
            (!equipe.propostaEditalId || equipe.propostaEditalId === value),
        );

        if (!equipeContinuaValida) {
          next.equipeEditalId = "";
        }
      }

      return next;
    });
  };

  const propostaEditalNome = (id?: string) =>
    id
      ? propostasEditais.find((entry) => entry.id === id)?.tituloProjeto ?? "—"
      : "—";

  const equipeNome = (id?: string) => {
    if (!id) return "Sem vínculo com equipe";

    const equipe = equipesEdital.find((entry) => entry.id === id);

    if (!equipe) return "—";

    return equipe.funcao ? `${equipe.nome} — ${equipe.funcao}` : equipe.nome;
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) => {
      const proposta = propostaEditalNome(item.propostaEditalId);
      const equipe = equipeNome(item.equipeEditalId);

      return [
        item.nomePlanejamento,
        item.justificativaPlanejamento,
        formatDateBr(item.dataInicio),
        formatDateBr(item.dataFim),
        item.quantidade,
        unidadeMedidaLabel(item.unidadeMedida),
        item.valorUnitario,
        item.valorTotal,
        proposta,
        equipe,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, propostasEditais, equipesEdital, search]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "item":
          return item.nomePlanejamento;
        case "inicio":
          return item.dataInicio ?? "";
        case "fim":
          return item.dataFim ?? "";
        case "quantidade":
          return Number(item.quantidade || 0);
        case "unidade":
          return unidadeMedidaLabel(item.unidadeMedida);
        case "valorUnitario":
          return parseCurrencyInput(item.valorUnitario);
        case "valorTotal":
          return parseCurrencyInput(item.valorTotal);
        case "proposta":
          return propostaEditalNome(item.propostaEditalId);
        case "equipe":
          return equipeNome(item.equipeEditalId);
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

  const totalPlanejado = useMemo(
    () =>
      filtered.reduce(
        (total, item) => total + parseCurrencyInput(item.valorTotal),
        0,
      ),
    [filtered],
  );

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const handleNew = () => {
    if (!podeCriar) {
      toast.error(
        "Você não possui permissão para cadastrar aplicação de recursos.",
      );
      return;
    }

    setSelectedId(null);
    setForm(createEmptyPlanejamentoFinanceiro());
    setMode("create");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedId(null);
    setMode("create");
    setForm(createEmptyPlanejamentoFinanceiro());
  };

  const openRecord = (
    record: PlanejamentoFinanceiroData,
    nextMode: FormMode,
  ) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar aplicação de recursos.",
      );
      return;
    }

    setSelectedId(record.id);
    setForm(record);
    setMode(nextMode);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (readOnly) return;

    if (mode === "create" && !podeCriar) {
      toast.error(
        "Você não possui permissão para cadastrar aplicação de recursos.",
      );
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar aplicação de recursos.",
      );
      return;
    }

    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? "").trim(),
    );

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return;
    }

    if (invalidPeriodo) {
      toast.error(planejamentoFinanceiroPeriodoError);
      return;
    }

    if (invalidQuantidade) {
      toast.error(planejamentoFinanceiroQuantidadeError);
      return;
    }

    if (invalidValorUnitario) {
      toast.error(planejamentoFinanceiroValorUnitarioError);
      return;
    }

    if (invalidValorTotal) {
      toast.error(planejamentoFinanceiroValorTotalError);
      return;
    }

    try {
      setSaving(true);

      const isCreating = mode === "create";
      const payload = buildPlanejamentoFinanceiroPayload(form);

      const saved =
        mode === "edit" && form.id
          ? await updatePlanejamentoFinanceiro(Number(form.id), payload)
          : await createPlanejamentoFinanceiro(payload);

      setItems((prev) => {
        if (mode === "edit") {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }

        return [saved, ...prev];
      });

      handleCancel();
      setSelectedId(saved.id);

      if (isCreating) {
        const card = criarProximaAcaoPlanejamentoFinanceiro();

        sessionStorage.setItem(
          PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY,
          JSON.stringify(card),
        );

        setNextStepCard(card);

        window.setTimeout(() => {
          setNextStepCard(null);
        }, NEXT_STEP_DURATION_MS);
      }

      toast.success(
        mode === "create"
          ? "Aplicação de recursos cadastrada com sucesso."
          : "Aplicação de recursos salva com sucesso.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar aplicação de recursos.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para excluir aplicação de recursos.",
      );
      setConfirmDeleteId(null);
      return;
    }

    try {
      await deletePlanejamentoFinanceiro(Number(confirmDeleteId));

      setItems((prev) => prev.filter((item) => item.id !== confirmDeleteId));

      if (selectedId === confirmDeleteId) {
        handleCancel();
      }

      setConfirmDeleteId(null);

      toast.success("Aplicação de recursos excluída com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir aplicação de recursos.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDeleteId(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  async function handleExportPdf(item: PlanejamentoFinanceiroData) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportPlanejamentoFinanceiroPdf({
      id: item.id,

      nomePlanejamento: item.nomePlanejamento,
      justificativaPlanejamento: item.justificativaPlanejamento,

      dataInicio: formatDateBr(item.dataInicio),
      dataFim: formatDateBr(item.dataFim),

      quantidade: item.quantidade,
      unidadeMedida: unidadeMedidaLabel(item.unidadeMedida),

      valorUnitario: formatCurrencyBR(parseCurrencyInput(item.valorUnitario)),
      valorTotal: formatCurrencyBR(parseCurrencyInput(item.valorTotal)),

      propostaEdital: propostaEditalNome(item.propostaEditalId),
      equipeEdital: equipeNome(item.equipeEditalId),
    });
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className={`container ${showForm ? "max-w-4xl" : "max-w-7xl"
          } py-6 sm:py-8`}
      >
        {showForm && (
          <button
            type="button"
            onClick={handleCancel}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Aplicação de Recursos
            </h1>

            <HelpTooltip
              text="Organize a aplicação de recursos da proposta de edital, detalhando cada item previsto, sua justificativa, quantidade, unidade de medida, valores, período de aplicação e vínculo opcional com a equipe. Essas informações ajudam na construção do plano de trabalho, no acompanhamento dos recursos e na futura prestação de contas."
              label="Aplicação de recursos"
              size="md"
              side="bottom"
              align="start"
            />
          </div>
        </div>

        {isPaginaInicial && nextStepCard && (
          <NextStepCard
            titulo={nextStepCard.titulo}
            descricao={nextStepCard.descricao}
            acaoLabel={nextStepCard.acaoLabel}
            acaoUrl={nextStepCard.acaoUrl}
            acaoSecundariaLabel={nextStepCard.acaoSecundariaLabel}
            acaoSecundariaUrl={nextStepCard.acaoSecundariaUrl}
            variante={nextStepCard.variante ?? "pendente"}
            onDismiss={() => setNextStepCard(null)}
          />
        )}

        {showForm ? (
          <>
            {readOnly && (
              <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Você está visualizando estas informações. Para fazer alterações,
                clique em <span className="font-semibold">Editar</span> no menu{" "}
                <span className="font-semibold">Ações</span>.
              </div>
            )}

            <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
              <Info
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                strokeWidth={2.2}
              />

              <p className="text-[13px] leading-relaxed text-foreground">
                Use esta página para registrar como os recursos da proposta de
                edital serão aplicados. Cada item deve indicar o que será
                contratado, comprado ou executado, por que é necessário, em qual
                período será realizado, como será medido e qual valor está
                previsto.
              </p>
            </div>

            {!readOnly && <FormLegend />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Section icon={FileText} title="Identificação do item">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel
                      htmlFor="nomePlanejamento"
                      required={!readOnly}
                      tooltip="Informe um nome claro para o item previsto na aplicação de recursos, indicando o que será contratado, adquirido ou executado. Ex.: Professor de violão, material pedagógico, serviço de som, transporte ou divulgação em redes sociais."
                    >
                      Item da Aplicação
                    </FieldLabel>

                    <Input
                      id="nomePlanejamento"
                      value={form.nomePlanejamento}
                      onChange={(e) =>
                        setField("nomePlanejamento", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="justificativaPlanejamento"
                      required={!readOnly}
                      tooltip="Explique por que este item é necessário para a execução da proposta, relacionando sua finalidade às atividades, metas, equipe, público atendido ou resultados previstos."
                    >
                      Justificativa
                    </FieldLabel>

                    <Textarea
                      id="justificativaPlanejamento"
                      value={form.justificativaPlanejamento}
                      onChange={(e) =>
                        setField("justificativaPlanejamento", e.target.value)
                      }
                      rows={4}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={ShieldCheck} title="Período previsto">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="dataInicio"
                      required={!readOnly}
                      tooltip="Informe a data de início prevista para este item da aplicação de recursos."
                    >
                      Data de Início
                    </FieldLabel>

                    <Input
                      id="dataInicio"
                      type="date"
                      value={form.dataInicio}
                      onChange={(e) => setField("dataInicio", e.target.value)}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataFim"
                      required={!readOnly}
                      tooltip="Informe a data de fim prevista para este item da aplicação de recursos. A data de fim não pode ser anterior à data de início."
                    >
                      Data de Fim
                    </FieldLabel>

                    <Input
                      id="dataFim"
                      type="date"
                      value={form.dataFim}
                      onChange={(e) => setField("dataFim", e.target.value)}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  {invalidPeriodo && (
                    <Field full>
                      <p className="text-sm text-destructive">
                        {planejamentoFinanceiroPeriodoError}
                      </p>
                    </Field>
                  )}
                </div>
              </Section>

              <Section icon={Calculator} title="Quantidade e valores">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="quantidade"
                      required={!readOnly}
                      tooltip="Informe apenas o número correspondente à quantidade prevista para este item, de acordo com a unidade de medida selecionada."
                    >
                      Quantidade
                    </FieldLabel>

                    <Input
                      id="quantidade"
                      value={form.quantidade}
                      onChange={(e) =>
                        setField(
                          "quantidade",
                          onlyPositiveInteger(e.target.value),
                        )
                      }
                      inputMode="numeric"
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="unidadeMedida"
                      required={!readOnly}
                      tooltip="Selecione como a quantidade deste item será medida. Ex.: mês, unidade, serviço, hora, diária, oficina, apresentação ou pacote."
                    >
                      Unidade de Medida
                    </FieldLabel>

                    <Select
                      value={form.unidadeMedida}
                      onValueChange={(value) =>
                        setField("unidadeMedida", value)
                      }
                      disabled={readOnly || saving}
                    >
                      <SelectTrigger id="unidadeMedida">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {unidadeMedidaOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="valorUnitario"
                      required={!readOnly}
                      tooltip="Informe o valor de uma unidade deste item, considerando a unidade de medida selecionada."
                    >
                      Valor Unitário
                    </FieldLabel>

                    <Input
                      id="valorUnitario"
                      value={form.valorUnitario}
                      onChange={(e) =>
                        setField(
                          "valorUnitario",
                          formatCurrencyInput(e.target.value),
                        )
                      }
                      inputMode="decimal"
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="valorTotal"
                      required={!readOnly}
                      tooltip="Valor calculado automaticamente com base na quantidade e no valor unitário informados."
                    >
                      Valor Total
                    </FieldLabel>

                    <Input
                      id="valorTotal"
                      value={form.valorTotal}
                      inputMode="decimal"
                      disabled
                    />
                  </Field>

                  {invalidQuantidade && (
                    <Field full>
                      <p className="text-sm text-destructive">
                        {planejamentoFinanceiroQuantidadeError}
                      </p>
                    </Field>
                  )}

                  {invalidValorUnitario && (
                    <Field full>
                      <p className="text-sm text-destructive">
                        {planejamentoFinanceiroValorUnitarioError}
                      </p>
                    </Field>
                  )}

                  {invalidValorTotal && (
                    <Field full>
                      <p className="text-sm text-destructive">
                        {planejamentoFinanceiroValorTotalError}
                      </p>
                    </Field>
                  )}
                </div>
              </Section>

              <Section icon={Landmark} title="Vínculo com proposta de edital">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="propostaEditalId"
                      required={!readOnly}
                      tooltip="Selecione a proposta de edital à qual este item da aplicação de recursos pertence."
                    >
                      Proposta de Edital
                    </FieldLabel>

                    <Select
                      value={form.propostaEditalId}
                      onValueChange={(value) =>
                        setField("propostaEditalId", value)
                      }
                      disabled={readOnly || saving}
                    >
                      <SelectTrigger id="propostaEditalId">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {propostasEditais.length === 0 ? (
                          <SelectItem value="sem-proposta" disabled>
                            Nenhuma proposta disponível
                          </SelectItem>
                        ) : (
                          propostasEditais.map((proposta) => (
                            <SelectItem key={proposta.id} value={proposta.id}>
                              {proposta.tituloProjeto}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Section icon={UsersRound} title="Vínculo opcional com equipe">
                <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                  <Info
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                    strokeWidth={2.2}
                  />

                  <span>
                    Use este vínculo apenas quando o item financeiro representar
                    pagamento, remuneração ou contratação de uma pessoa da
                    equipe. Para itens como material, transporte, alimentação,
                    aluguel, energia, internet ou serviços gerais, deixe sem
                    vínculo.
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="equipeEditalId"
                      tooltip="Selecione o membro da equipe relacionado a este item financeiro, quando houver. Este campo não é obrigatório."
                    >
                      Equipe da Proposta
                    </FieldLabel>

                    <div className="flex gap-2">
                      <Select
                        value={form.equipeEditalId}
                        onValueChange={(value) =>
                          setField("equipeEditalId", value)
                        }
                        disabled={readOnly || saving}
                      >
                        <SelectTrigger id="equipeEditalId">
                          <SelectValue placeholder="Sem vínculo com equipe" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {equipesFiltradas.length === 0 ? (
                            <SelectItem value="sem-equipe" disabled>
                              Nenhum membro disponível
                            </SelectItem>
                          ) : (
                            equipesFiltradas.map((equipe) => (
                              <SelectItem key={equipe.id} value={equipe.id}>
                                {equipe.funcao
                                  ? `${equipe.nome} — ${equipe.funcao}`
                                  : equipe.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      {!readOnly && form.equipeEditalId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setField("equipeEditalId", "")}
                          disabled={saving}
                          aria-label="Remover vínculo com equipe"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                </div>
              </Section>

              {!readOnly && (
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    className="sm:min-w-32"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}

              {readOnly && (
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Voltar
                  </Button>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="rounded border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumo da aplicação de recursos
                </p>

                <p className="mt-1 text-sm text-foreground">
                  Total previsto:{" "}
                  <span className="font-semibold">
                    {formatCurrencyBR(totalPlanejado)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                  aria-label="Buscar aplicação de recursos"
                />
              </div>

              {podeCriar && (
                <Button onClick={handleNew} className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Cadastrar Aplicação
                </Button>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table ref={tableRef} className="w-full min-w-[1380px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Ações
                    </th>

                    <SortableHeader
                      label="Item"
                      sortKey="item"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Início"
                      sortKey="inicio"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Fim"
                      sortKey="fim"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Quantidade"
                      sortKey="quantidade"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Unidade"
                      sortKey="unidade"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Valor unitário"
                      sortKey="valorUnitario"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Valor total"
                      sortKey="valorTotal"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Proposta de Edital"
                      sortKey="proposta"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Equipe"
                      sortKey="equipe"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    {podeGerarPdf && (
                      <th
                        className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        data-no-copy
                      >
                        Documento
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {paginated.map((item) => {
                    const proposta = propostaEditalNome(item.propostaEditalId);
                    const equipe = equipeNome(item.equipeEditalId);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <div className="flex items-center gap-1">
                            <TableActionIcon
                              icon={Eye}
                              label="Visualizar"
                              onClick={() => openRecord(item, "view")}
                            />

                            {podeEditar && (
                              <TableActionIcon
                                icon={Pencil}
                                label="Editar"
                                onClick={() => openRecord(item, "edit")}
                              />
                            )}

                            {podeExcluir && (
                              <TableActionIcon
                                icon={Trash2}
                                label="Excluir"
                                variant="danger"
                                onClick={() => setConfirmDeleteId(item.id)}
                              />
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText text={item.nomePlanejamento} bold>
                            {item.nomePlanejamento}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                          {formatDateBr(item.dataInicio)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                          {formatDateBr(item.dataFim)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                          {item.quantidade}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                          {unidadeMedidaLabel(item.unidadeMedida)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                          {formatCurrencyBR(
                            parseCurrencyInput(item.valorUnitario),
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-medium text-foreground">
                          {formatCurrencyBR(
                            parseCurrencyInput(item.valorTotal),
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText text={proposta}>
                            {proposta}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText
                            text={equipe}
                            muted={!item.equipeEditalId}
                          >
                            {equipe}
                          </TableCellText>
                        </td>

                        {podeGerarPdf && (
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleExportPdf(item)}
                              className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Gerar ficha
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {paginated.length === 0 && (
                    <EmptyRow colSpan={podeGerarPdf ? 11 : 10} />
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {paginated.length === 0 ? (
                <div className="p-10 text-center">
                  <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma aplicação de recursos encontrada.
                  </p>
                </div>
              ) : (
                paginated.map((item) => {
                  const proposta = propostaEditalNome(item.propostaEditalId);
                  const equipe = equipeNome(item.equipeEditalId);

                  return (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => openRecord(item, "view")}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() => openRecord(item, "edit")}
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDeleteId(item.id)}
                            />
                          )}
                        </div>

                        {podeGerarPdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(item)}
                            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        )}
                      </div>

                      <p className="font-medium text-foreground">
                        {item.nomePlanejamento}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateBr(item.dataInicio)} —{" "}
                        {formatDateBr(item.dataFim)}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.justificativaPlanejamento}
                      </p>

                      <div className="mt-3 space-y-1 text-sm text-foreground">
                        <p>
                          {item.quantidade}{" "}
                          {unidadeMedidaLabel(item.unidadeMedida)}
                        </p>

                        <p>
                          Valor unitário:{" "}
                          {formatCurrencyBR(
                            parseCurrencyInput(item.valorUnitario),
                          )}
                        </p>

                        <p className="font-medium">
                          Total:{" "}
                          {formatCurrencyBR(
                            parseCurrencyInput(item.valorTotal),
                          )}
                        </p>

                        <p className="text-muted-foreground">{proposta}</p>
                        <p className="text-muted-foreground">{equipe}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <TablePagination
              totalItems={sortedItems.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              onCopy={handleCopy}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aplicação de recursos?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso este item esteja vinculado a
              prestações de contas ou outros registros, o backend pode impedir a
              exclusão para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Aplicação de Recursos"
        href="https://www.aurit.com.br/wiki/editais/aplicacao-de-recursos"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
          {title}
        </h2>
      </div>

      {children}
    </Card>
  );
}

function Field({
  children,
  full,
  className,
}: {
  children: ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma aplicação de recursos encontrada.
        </p>
      </td>
    </tr>
  );
}
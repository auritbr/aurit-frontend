import {
  useEffect,
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarRange,
  Calculator,
  FileText,
  Landmark,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
  Info,
  X,
  FileDown,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { notifyImportReviewSaveSuccess } from "@/lib/importReviewQueue";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { PageObjective } from "@/components/PageObjective";
import { Button } from "@/components/ui/button";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { StatusPill } from "@/components/StatusPill";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { DataTablePagination } from "@/components/DataTablePagination";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { Badge } from "@/components/ui/badge";
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
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { SortableHeader } from "@/components/SortableHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { isPlanoAccessDenied } from "@/lib/access";
import { getImportConfigForPath } from "@/config/importacoes";
import { downloadPlanejamentoFinanceiroReport as exportPlanejamentoFinanceiroPdf } from "@/lib/individualReportDownload";
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
  classificacaoPlanejamentoLabel,
  classificacaoPlanejamentoOptions,
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
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

type SortKey =
  | "item"
  | "classificacao"
  | "inicio"
  | "fim"
  | "quantidade"
  | "unidade"
  | "valorUnitario"
  | "valorTotal"
  | "proposta"
  | "equipe";

type FormMode = "create" | "edit" | "view";

const PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY =
  "aurit:planejamento-financeiro:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PlanejamentoFinanceiroNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

function criarProximaAcaoPlanejamentoFinanceiro(): PlanejamentoFinanceiroNextStepCardData {
  return {
    titulo: "Registre o resultado da proposta",
    descricao:
      "Depois de estruturar a aplicação dos recursos, informe a situação da proposta após a análise do edital.",
    acaoLabel: "Cadastrar resultado",
    acaoUrl: "/resultados-propostas/novo",
    variante: "pendente",
  };
}

const requiredFields: Array<[keyof PlanejamentoFinanceiroData, string]> = [
  ["nomePlanejamento", "Item da aplicação"],
  ["classificacaoPlanejamentoFinanceiro", "Classificação"],
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
  const [searchInput, setSearchInput] = useState("");
  const [classificacoesFiltro, setClassificacoesFiltro] = useState<string[]>(
    [],
  );
  const [classificacoesAplicadas, setClassificacoesAplicadas] = useState<
    string[]
  >([]);
  const [equipesFiltro, setEquipesFiltro] = useState<string[]>([]);
  const [equipesAplicadas, setEquipesAplicadas] = useState<string[]>([]);
  const [inicioFiltro, setInicioFiltro] = useState("");
  const [inicioAplicado, setInicioAplicado] = useState("");
  const [fimFiltro, setFimFiltro] = useState("");
  const [fimAplicado, setFimAplicado] = useState("");
  const [valorMinFiltro, setValorMinFiltro] = useState("");
  const [valorMinAplicado, setValorMinAplicado] = useState("");
  const [valorMaxFiltro, setValorMaxFiltro] = useState("");
  const [valorMaxAplicado, setValorMaxAplicado] = useState("");
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "aplicacao-recursos:pesquisa-avancada",
    false,
  );
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
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

  const invalidValorUnitario = !!form.valorUnitario && valorUnitarioNumero <= 0;

  const invalidValorTotal =
    !!form.valorTotal &&
    !!calculatedTotal &&
    !moneyEqual(valorTotalNumero, calculatedTotalNumero);

  const invalidPeriodo =
    !!form.dataInicio && !!form.dataFim && form.dataFim < form.dataInicio;

  useImportFormFill("planejamentos-financeiros", setForm);

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
      const parsed = JSON.parse(raw) as PlanejamentoFinanceiroNextStepCardData;

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

      const [planejamentosData, propostasData, equipesData] = await Promise.all(
        [
          getPlanejamentosFinanceiros(),
          getPropostasEditalOptions(),
          getEquipesEditalOptions(),
        ],
      );

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

  const propostaEditalNome = useCallback(
    (id?: string) =>
      id
        ? (propostasEditais.find((entry) => entry.id === id)?.tituloProjeto ??
          "—")
        : "—",
    [propostasEditais],
  );

  const equipeNome = useCallback(
    (id?: string) => {
      if (!id) return "Sem vínculo com equipe";

      const equipe = equipesEdital.find((entry) => entry.id === id);

      if (!equipe) return "—";

      return equipe.funcao ? `${equipe.nome} — ${equipe.funcao}` : equipe.nome;
    },
    [equipesEdital],
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return items.filter((item) => {
      if (
        classificacoesAplicadas.length > 0 &&
        !classificacoesAplicadas.includes(
          item.classificacaoPlanejamentoFinanceiro,
        )
      ) {
        return false;
      }
      if (
        equipesAplicadas.length > 0 &&
        !equipesAplicadas.includes(item.equipeEditalId)
      )
        return false;
      if (inicioAplicado && item.dataInicio < inicioAplicado) return false;
      if (fimAplicado && item.dataFim > fimAplicado) return false;
      const valorTotal = parseCurrencyInput(item.valorTotal);
      if (valorMinAplicado && valorTotal < parseCurrencyInput(valorMinAplicado))
        return false;
      if (valorMaxAplicado && valorTotal > parseCurrencyInput(valorMaxAplicado))
        return false;

      if (!term) return true;

      const proposta = propostaEditalNome(item.propostaEditalId);
      const equipe = equipeNome(item.equipeEditalId);

      return [
        item.nomePlanejamento,
        classificacaoPlanejamentoLabel(
          item.classificacaoPlanejamentoFinanceiro,
        ),
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
  }, [
    items,
    propostaEditalNome,
    equipeNome,
    search,
    classificacoesAplicadas,
    equipesAplicadas,
    inicioAplicado,
    fimAplicado,
    valorMinAplicado,
    valorMaxAplicado,
  ]);

  const aplicarPesquisa = (event?: FormEvent) => {
    event?.preventDefault();
    setSearch(searchInput.trim());
    setClassificacoesAplicadas(classificacoesFiltro);
    setEquipesAplicadas(equipesFiltro);
    setInicioAplicado(inicioFiltro);
    setFimAplicado(fimFiltro);
    setValorMinAplicado(valorMinFiltro);
    setValorMaxAplicado(valorMaxFiltro);
  };

  const limparPesquisa = () => {
    setSearchInput("");
    setSearch("");
    setClassificacoesFiltro([]);
    setClassificacoesAplicadas([]);
    setEquipesFiltro([]);
    setEquipesAplicadas([]);
    setInicioFiltro("");
    setInicioAplicado("");
    setFimFiltro("");
    setFimAplicado("");
    setValorMinFiltro("");
    setValorMinAplicado("");
    setValorMaxFiltro("");
    setValorMaxAplicado("");
  };

  const activeFilters: ActiveFilterItem[] = [];
  if (search) {
    activeFilters.push({
      id: "busca",
      label: "Nome do item",
      value: search,
      onRemove: () => {
        setSearch("");
        setSearchInput("");
      },
    });
  }
  classificacoesAplicadas.forEach((value) =>
    activeFilters.push({
      id: `classificacao-${value}`,
      label: "Classificação",
      value: classificacaoPlanejamentoLabel(value),
      onRemove: () => {
        const next = classificacoesAplicadas.filter((item) => item !== value);
        setClassificacoesAplicadas(next);
        setClassificacoesFiltro(next);
      },
    }),
  );
  equipesAplicadas.forEach((value) =>
    activeFilters.push({
      id: `equipe-${value}`,
      label: "Integrante da equipe",
      value: equipeNome(value),
      onRemove: () => {
        const next = equipesAplicadas.filter((item) => item !== value);
        setEquipesAplicadas(next);
        setEquipesFiltro(next);
      },
    }),
  );
  const addSimpleFilter = (
    id: string,
    label: string,
    value: string,
    display: string,
    clear: () => void,
  ) => {
    if (value)
      activeFilters.push({ id, label, value: display, onRemove: clear });
  };
  addSimpleFilter(
    "inicio",
    "Início a partir de",
    inicioAplicado,
    formatDateBr(inicioAplicado),
    () => {
      setInicioAplicado("");
      setInicioFiltro("");
    },
  );
  addSimpleFilter(
    "fim",
    "Término até",
    fimAplicado,
    formatDateBr(fimAplicado),
    () => {
      setFimAplicado("");
      setFimFiltro("");
    },
  );
  addSimpleFilter(
    "valor-min",
    "Valor total mínimo",
    valorMinAplicado,
    formatCurrencyBR(parseCurrencyInput(valorMinAplicado)),
    () => {
      setValorMinAplicado("");
      setValorMinFiltro("");
    },
  );
  addSimpleFilter(
    "valor-max",
    "Valor total máximo",
    valorMaxAplicado,
    formatCurrencyBR(parseCurrencyInput(valorMaxAplicado)),
    () => {
      setValorMaxAplicado("");
      setValorMaxFiltro("");
    },
  );

  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "item":
          return item.nomePlanejamento;
        case "classificacao":
          return classificacaoPlanejamentoLabel(
            item.classificacaoPlanejamentoFinanceiro,
          );
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

  const exportColumns = [
    { header: "Item", key: "item" },
    { header: "Classificação", key: "classificacao" },
    { header: "Justificativa", key: "justificativa" },
    { header: "Quantidade", key: "quantidade" },
    { header: "Unidade de medida", key: "unidade" },
    { header: "Valor unitário", key: "valorUnitario" },
    { header: "Valor total", key: "valorTotal" },
    { header: "Data de início", key: "inicio" },
    { header: "Data de término", key: "fim" },
    { header: "Proposta", key: "proposta" },
    { header: "Integrante da equipe", key: "equipe" },
  ];

  const getExportData = () =>
    sortedItems.map((item) => ({
      item: item.nomePlanejamento,
      classificacao: classificacaoPlanejamentoLabel(
        item.classificacaoPlanejamentoFinanceiro,
      ),
      justificativa: item.justificativaPlanejamento,
      quantidade: item.quantidade,
      unidade: unidadeMedidaLabel(item.unidadeMedida),
      valorUnitario: formatCurrencyBR(parseCurrencyInput(item.valorUnitario)),
      valorTotal: formatCurrencyBR(parseCurrencyInput(item.valorTotal)),
      inicio: formatDateBr(item.dataInicio),
      fim: formatDateBr(item.dataFim),
      proposta: propostaEditalNome(item.propostaEditalId),
      equipe: equipeNome(item.equipeEditalId),
    }));

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
      notifyImportReviewSaveSuccess("planejamentos-financeiros");

      handleCancel();
      setSelectedId(saved.id);

      if (isCreating) {
        const card = criarProximaAcaoPlanejamentoFinanceiro();

        sessionStorage.setItem(
          PLANEJAMENTO_FINANCEIRO_NEXT_STEP_KEY,
          JSON.stringify(card),
        );

        emitJourneyNextStep();
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

    try {
      setGeneratingPdfId(item.id);

      await exportPlanejamentoFinanceiroPdf({
        id: item.id,

        nomePlanejamento: item.nomePlanejamento,
        classificacaoPlanejamentoFinanceiro: classificacaoPlanejamentoLabel(
          item.classificacaoPlanejamentoFinanceiro,
        ),
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
    } finally {
      setGeneratingPdfId(null);
    }
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
        className={`container ${
          showForm ? "max-w-4xl" : "max-w-7xl"
        } py-6 sm:py-8`}
      >
        {showForm && <BackButton onClick={handleCancel} />}

        <ListPageHeader
          title="Aplicação de Recursos"
          tooltip="Nesta página são organizados os itens previstos no orçamento do projeto apresentado ao edital, registrando como os recursos serão utilizados e distribuídos durante sua execução. Cada item pode reunir informações sobre classificação, justificativa, quantidade, valores, período previsto e, quando aplicável, vínculo com uma pessoa da equipe."
          objective={
            !showForm
              ? "Cadastre e organize os itens previstos na aplicação dos recursos do projeto apresentado ao edital, detalhando os gastos necessários para sua execução, seus valores e períodos e, quando aplicável, relacionando-os à pessoa da equipe correspondente."
              : undefined
          }
          actions={
            !showForm && podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={handleNew}
              >
                <Plus className="h-4 w-4" />
                Cadastrar aplicação
              </Button>
            ) : showForm && !readOnly ? (
              <ImportDataButton
                config={getImportConfigForPath("/aplicacao-de-recursos")!}
                canFillForm
                variant="glassSecondary"
              />
            ) : undefined
          }
        />

        {showForm ? (
          <>
            <FormLegend />

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1 — Vínculo com a proposta */}
              {/* 1 — Vínculo com o projeto */}
              <Section
                icon={Landmark}
                title="Vínculo com o projeto"
                description="Selecione o projeto apresentado ao edital cujo orçamento incluirá este item de aplicação de recursos."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="propostaEditalId"
                      required={!readOnly}
                      tooltip="Selecione o projeto apresentado ao edital ao qual este item de orçamento pertence. Depois da seleção, o sistema poderá mostrar apenas os integrantes da equipe vinculados a esse projeto."
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
                        <SelectValue placeholder="Selecione a proposta" />
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

              {/* 2 — Identificação do item */}
              <Section
                icon={FileText}
                title="Identificação do item"
                description="Defina o que será custeado pelo orçamento, como esse gasto será classificado e por que ele é necessário para a realização do projeto."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="nomePlanejamento"
                      required={!readOnly}
                      tooltip="Informe um nome claro para o item previsto no orçamento. Pode ser uma contratação, compra, serviço ou outro gasto necessário para executar o projeto. Ex.: Serviço de fotografia, material pedagógico ou transporte da equipe."
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

                  <Field>
                    <FieldLabel
                      htmlFor="classificacaoPlanejamentoFinanceiro"
                      required={!readOnly}
                      tooltip="Selecione a categoria que melhor representa este item no orçamento. Por exemplo: recursos humanos para remuneração de pessoas, serviços de terceiros para serviços contratados, material de consumo para itens utilizados durante a execução ou transporte para deslocamentos."
                    >
                      Classificação
                    </FieldLabel>

                    <Select
                      value={
                        form.classificacaoPlanejamentoFinanceiro || undefined
                      }
                      onValueChange={(value) =>
                        setField(
                          "classificacaoPlanejamentoFinanceiro",
                          value as PlanejamentoFinanceiroData["classificacaoPlanejamentoFinanceiro"],
                        )
                      }
                      disabled={readOnly || saving}
                    >
                      <SelectTrigger id="classificacaoPlanejamentoFinanceiro">
                        <SelectValue placeholder="Selecione a classificação" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {classificacaoPlanejamentoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {mode === "edit" &&
                      !form.classificacaoPlanejamentoFinanceiro && (
                        <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                          Este item ainda não possui classificação. Selecione
                          uma opção para continuar.
                        </p>
                      )}
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="justificativaPlanejamento"
                      required={!readOnly}
                      tooltip="Explique por que este gasto é necessário para executar o projeto. Informe como o item será utilizado e de que forma contribuirá para as atividades, metas ou resultados previstos."
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

              {/* 3 — Vínculo com a equipe */}
              <Section
                icon={UsersRound}
                title="Vínculo com a equipe"
                description="Quando este gasto estiver relacionado diretamente ao trabalho de uma pessoa da equipe do projeto, vincule o integrante correspondente."
              >
                <PageObjective
                  className="mb-5"
                  variant="primary"
                  label="Este vínculo é opcional."
                  icon={Info}
                  description="Utilize este campo principalmente quando o item estiver relacionado à contratação, remuneração ou atuação de uma pessoa da equipe. Para materiais, transporte, alimentação, locação, equipamentos e outros gastos gerais, deixe o campo sem vínculo."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="equipeEditalId"
                      tooltip="Selecione a pessoa da equipe diretamente relacionada a este item. Por exemplo, se o orçamento prevê o pagamento de um coordenador, oficineiro, artista ou outro profissional já cadastrado na equipe do projeto, selecione essa pessoa."
                    >
                      Integrante da Equipe
                    </FieldLabel>

                    <div className="flex gap-2">
                      <Select
                        value={form.equipeEditalId}
                        onValueChange={(value) =>
                          setField("equipeEditalId", value)
                        }
                        disabled={readOnly || saving || !form.propostaEditalId}
                      >
                        <SelectTrigger id="equipeEditalId">
                          <SelectValue
                            placeholder={
                              form.propostaEditalId
                                ? "Sem vínculo com a equipe"
                                : "Selecione primeiro a proposta"
                            }
                          />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {equipesFiltradas.length === 0 ? (
                            <SelectItem value="sem-equipe" disabled>
                              Nenhum integrante disponível
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
                          aria-label="Remover vínculo com a equipe"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                </div>
              </Section>

              {/* 4 — Quantidade e valores */}
              <Section
                icon={Calculator}
                title="Quantidade e valores"
                description="Dimensione este item do orçamento, informando a quantidade prevista, a forma de medição e o valor necessário para calcular seu custo total."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="quantidade"
                      required={!readOnly}
                      tooltip="Informe a quantidade prevista deste item de acordo com a unidade de medida escolhida. Ex.: 6 meses, 10 serviços, 20 horas ou 100 unidades."
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
                      tooltip="Selecione como a quantidade será medida. Por exemplo: mês para uma contratação mensal, hora para serviços por hora, diária para hospedagem, unidade para produtos ou apresentação para uma atividade artística."
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
                        <SelectValue placeholder="Selecione a unidade" />
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
                      tooltip="Informe o valor previsto para uma unidade deste item. O sistema utilizará esse valor junto com a quantidade para calcular automaticamente o valor total."
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
                      tooltip="O valor total é calculado automaticamente pela multiplicação da quantidade pelo valor unitário. Não é necessário preencher este campo manualmente."
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

              {/* 5 — Período de execução */}
              <Section
                icon={CalendarRange}
                title="Período de execução"
                description="Defina quando este item estará previsto no projeto, considerando o período em que será utilizado, contratado ou realizado."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="dataInicio"
                      required={!readOnly}
                      tooltip="Informe a data prevista para começar a utilização, contratação ou realização deste item durante a execução do projeto."
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
                      tooltip="Informe a data prevista para finalizar a utilização, contratação ou realização deste item. A data de término não pode ser anterior à data de início."
                    >
                      Data de Término
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

              {!readOnly && (
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 px-4"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    variant="glassPrimary"
                    className="h-9 px-5"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}

              {readOnly && (
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 px-4"
                    onClick={handleCancel}
                  >
                    Voltar
                  </Button>
                </div>
              )}
            </form>
          </>
        ) : (
          <>
            <div className="mb-4 space-y-4">
              <AdvancedSearchPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                activeCount={activeFilters.length}
              >
                <form onSubmit={aplicarPesquisa} noValidate>
                  <SearchFilterGrid>
                    <div>
                      <FieldLabel htmlFor="filtroNome">Nome do item</FieldLabel>
                      <Input
                        id="filtroNome"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Digite o nome do item"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroClassificacao">
                        Classificação
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroClassificacao"
                        options={classificacaoPlanejamentoOptions}
                        value={classificacoesFiltro}
                        onChange={setClassificacoesFiltro}
                        placeholder="Todas as classificações"
                        summaryNoun="classificações selecionadas"
                        searchable
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroEquipe">
                        Integrante da equipe
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroEquipe"
                        options={equipesEdital.map((equipe) => ({
                          value: equipe.id,
                          label: equipe.nome,
                        }))}
                        value={equipesFiltro}
                        onChange={setEquipesFiltro}
                        placeholder="Todos os integrantes"
                        summaryNoun="integrantes selecionados"
                        searchable
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroInicio">
                        Data de início
                      </FieldLabel>
                      <Input
                        id="filtroInicio"
                        type="date"
                        value={inicioFiltro}
                        onChange={(event) =>
                          setInicioFiltro(event.target.value)
                        }
                        className="h-9 rounded-[10px] border-border/70 bg-background/70"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroFim">
                        Data de término
                      </FieldLabel>
                      <Input
                        id="filtroFim"
                        type="date"
                        value={fimFiltro}
                        onChange={(event) => setFimFiltro(event.target.value)}
                        className="h-9 rounded-[10px] border-border/70 bg-background/70"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroValorMin">
                        Valor total mínimo
                      </FieldLabel>
                      <Input
                        id="filtroValorMin"
                        value={valorMinFiltro}
                        onChange={(event) =>
                          setValorMinFiltro(
                            formatCurrencyInput(event.target.value),
                          )
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroValorMax">
                        Valor total máximo
                      </FieldLabel>
                      <Input
                        id="filtroValorMax"
                        value={valorMaxFiltro}
                        onChange={(event) =>
                          setValorMaxFiltro(
                            formatCurrencyInput(event.target.value),
                          )
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70"
                      />
                    </div>
                  </SearchFilterGrid>
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={limparPesquisa}
                    >
                      <RotateCcw className="h-4 w-4" /> Limpar filtros
                    </Button>
                    <Button
                      type="submit"
                      variant="glassPrimary"
                      className="h-9 gap-2 px-5"
                    >
                      <Search className="h-4 w-4" /> Pesquisar
                    </Button>
                  </div>
                </form>
              </AdvancedSearchPanel>
              <ActiveFilters
                items={activeFilters}
                onClearAll={limparPesquisa}
              />
            </div>

            <DataTableCard>
              <DataTableToolbar
                total={sortedItems.length}
                reportTo="/relatorios/aplicacao-de-recursos"
                exportColumns={exportColumns}
                getExportData={getExportData}
                exportFilename="aplicacao-de-recursos"
                canExport={podeGerarPdf}
              />

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1180px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                      <th
                        className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
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
                        label="Proposta de Edital"
                        sortKey="proposta"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Classificação"
                        sortKey="classificacao"
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
                        label="Período"
                        sortKey="inicio"
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
                    </tr>
                  </thead>

                  <tbody>
                    {paginated.map((item) => {
                      const proposta = propostaEditalNome(
                        item.propostaEditalId,
                      );
                      const equipe = equipeNome(item.equipeEditalId);

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/planejamentos-financeiros/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`planejamento-financeiro-${item.id}.pdf`}
                              onView={() => openRecord(item, "view")}
                              onEdit={
                                podeEditar
                                  ? () => openRecord(item, "edit")
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDeleteId(item.id)
                                  : undefined
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.nomePlanejamento} bold>
                              {item.nomePlanejamento}
                            </TableCellText>
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={proposta}>
                              {proposta}
                            </TableCellText>
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.classificacaoPlanejamentoFinanceiro}
                              ariaLabelPrefix="Classificação"
                            />
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                            {item.quantidade}
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

                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBr(item.dataInicio)} a{" "}
                            {formatDateBr(item.dataFim)}
                          </td>

                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={equipe}
                              muted={!item.equipeEditalId}
                            >
                              {equipe}
                            </TableCellText>
                          </td>
                        </tr>
                      );
                    })}

                    {paginated.length === 0 && <EmptyRow colSpan={9} />}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border md:hidden">
                {paginated.length === 0 ? (
                  <DataTableEmptyState
                    emptyTitle="Nenhuma aplicação de recursos cadastrada."
                    emptyDescription="Adicione os itens previstos no orçamento para detalhar como os recursos serão utilizados."
                    noResultsTitle="Nenhuma aplicação encontrada com os filtros selecionados."
                    activeCount={activeFilters.length}
                  />
                ) : (
                  paginated.map((item) => {
                    const proposta = propostaEditalNome(item.propostaEditalId);
                    const equipe = equipeNome(item.equipeEditalId);

                    return (
                      <div key={item.id} className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <RowActionsDropdown
                            reportEndpoint={
                              podeGerarPdf
                                ? `/planejamentos-financeiros/${item.id}/relatorio`
                                : undefined
                            }
                            reportFilename={`planejamento-financeiro-${item.id}.pdf`}
                            onView={() => openRecord(item, "view")}
                            onEdit={
                              podeEditar
                                ? () => openRecord(item, "edit")
                                : undefined
                            }
                            onDelete={
                              podeExcluir
                                ? () => setConfirmDeleteId(item.id)
                                : undefined
                            }
                          />
                        </div>

                        <p className="font-medium text-foreground">
                          {item.nomePlanejamento}
                        </p>

                        <div className="mt-1">
                          <StatusPill
                            status={item.classificacaoPlanejamentoFinanceiro}
                            ariaLabelPrefix="Classificação do planejamento"
                          />
                        </div>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateBr(item.dataInicio)} a{" "}
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

              <DataTablePagination
                totalItems={sortedItems.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                entityLabel="registro"
                entityLabelPlural="registros"
                pageSizeLabel="Registros por página"
              />
            </DataTableCard>
          </>
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
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
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
      <td colSpan={colSpan}>
        <DataTableEmptyState
          emptyTitle="Nenhuma aplicação de recursos cadastrada."
          emptyDescription="Adicione os itens previstos no orçamento para detalhar como os recursos serão utilizados."
        />
      </td>
    </tr>
  );
}

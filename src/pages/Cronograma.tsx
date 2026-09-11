import {
  useEffect,
  useMemo,
  useCallback,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarRange,
  Target,
  FolderKanban,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  type LucideIcon,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { notifyImportReviewSaveSuccess } from "@/lib/importReviewQueue";
import { PageTitle } from "@/components/PageTitle";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
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
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { StatusPill } from "@/components/StatusPill";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
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
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadCronogramaReport as exportCronogramaPdf } from "@/lib/individualReportDownload";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
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
  buildCronogramaPayload,
  createCronograma,
  createEmptyCronograma,
  cronogramaDateError,
  cronogramaTitleTooltip,
  deleteCronograma,
  etapaCronogramaLabel,
  etapaCronogramaOptions,
  getAcoesOptions,
  getAtividadesOptions,
  getCronogramas,
  getEventosOptions,
  getProjetosOptions,
  statusCronogramaLabel,
  statusCronogramaOptions,
  updateCronograma,
  type AcaoOption,
  type AtividadeOption,
  type CronogramaData,
  type EventoOption,
  type ProjetoOption,
} from "@/data/cronograma";
import { toast } from "sonner";

type SortBy = "etapa" | "periodo" | "status" | "projeto" | "vinculo";
type SortDir = "asc" | "desc";

type FormMode = "create" | "edit" | "view";
type LinkType = "NONE" | "ATIVIDADE" | "EVENTO" | "ACAO";

interface Filtros {
  etapa: string;
  descricao: string;
  projetos: string[];
  status: string[];
  tiposEtapa: string[];
  vinculos: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  etapa: "",
  descricao: "",
  projetos: [],
  status: [],
  tiposEtapa: [],
  vinculos: [],
  sortBy: "periodo",
  sortDir: "asc",
};

const sortByOptions: { value: SortBy; label: string }[] = [
  { value: "etapa", label: "Etapa" },
  { value: "periodo", label: "Período" },
  { value: "status", label: "Status" },
  { value: "projeto", label: "Projeto" },
  { value: "vinculo", label: "Vínculo" },
];

const vinculoOptions = [
  { value: "PROJETO", label: "Projeto geral" },
  { value: "ATIVIDADE", label: "Atividade" },
  { value: "EVENTO", label: "Evento cultural" },
  { value: "ACAO", label: "Ação de divulgação" },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label ?? value;

function salvarProximaAcaoCronograma() {
  // O cronograma é salvo na própria tela, sem navegação. Por isso o evento
  // global precisa ser emitido imediatamente; gravar apenas no sessionStorage
  // fazia o próximo passo nunca ser consumido pelo host do popup.
  emitJourneyNextStep("/cronograma");
}

const requiredFields: Array<[keyof CronogramaData, string]> = [
  ["nomeEtapa", "Nome da etapa"],
  ["descricaoEtapa", "Descrição da etapa"],
  ["etapaCronograma", "Etapa"],
  ["dataInicioEtapa", "Data de início"],
  ["dataFimEtapa", "Data de término"],
  ["statusCronograma", "Status do cronograma"],
  ["projetoId", "Projeto"],
];

const formatDate = (value?: string) => {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatDateRange = (start?: string, end?: string) =>
  `${formatDate(start)} → ${formatDate(end)}`;

export default function Cronograma() {
  const [items, setItems] = useState<CronogramaData[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [eventos, setEventos] = useState<EventoOption[]>([]);
  const [acoes, setAcoes] = useState<AcaoOption[]>([]);

  const [form, setForm] = useState<CronogramaData>(() =>
    createEmptyCronograma(),
  );
  const [mode, setMode] = useState<FormMode>("create");
  const [linkType, setLinkType] = useState<LinkType>("NONE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "cronograma:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const readOnly = mode === "view";

  const hasInvalidDateRange =
    !!form.dataInicioEtapa &&
    !!form.dataFimEtapa &&
    form.dataFimEtapa < form.dataInicioEtapa;

  useImportFormFill("cronogramas", setForm);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("CRONOGRAMA");

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
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregarDados();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [
        cronogramasData,
        projetosData,
        atividadesData,
        eventosData,
        acoesData,
      ] = await Promise.all([
        getCronogramas(),
        getProjetosOptions(),
        getAtividadesOptions(),
        getEventosOptions(),
        getAcoesOptions(),
      ]);

      setItems(cronogramasData);
      setProjetos(projetosData);
      setAtividades(atividadesData);
      setEventos(eventosData);
      setAcoes(acoesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar cronograma.";

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

  const projetoNome = (id?: string) =>
    id ? (projetos.find((entry) => entry.id === id)?.nome ?? "—") : "—";

  const atividadeNome = (id?: string) =>
    id ? (atividades.find((entry) => entry.id === id)?.nome ?? "—") : "—";

  const eventoNome = (id?: string) =>
    id ? (eventos.find((entry) => entry.id === id)?.nome ?? "—") : "—";

  const acaoNome = (id?: string) =>
    id ? (acoes.find((entry) => entry.id === id)?.nome ?? "—") : "—";

  const atividadesFiltradas = useMemo(() => {
    if (!form.projetoId) return atividades;

    return atividades.filter(
      (atividade) =>
        !atividade.projetoId || atividade.projetoId === form.projetoId,
    );
  }, [atividades, form.projetoId]);

  const eventosFiltrados = useMemo(() => {
    if (!form.projetoId) return eventos;

    return eventos.filter((evento) => {
      if (evento.projetosIds?.length) {
        return evento.projetosIds.includes(form.projetoId);
      }

      return !evento.projetoId || evento.projetoId === form.projetoId;
    });
  }, [eventos, form.projetoId]);

  const acoesFiltradas = useMemo(() => {
    if (!form.projetoId) return acoes;

    return acoes.filter(
      (acao) => !acao.projetoId || acao.projetoId === form.projetoId,
    );
  }, [acoes, form.projetoId]);

  const vinculoTexto = (item: CronogramaData) => {
    if (item.atividadeId) {
      return `Atividade: ${atividadeNome(item.atividadeId)}`;
    }

    if (item.eventoCulturalId) {
      return `Evento cultural: ${eventoNome(item.eventoCulturalId)}`;
    }

    if (item.acaoDivulgacaoId) {
      return `Ação de divulgação: ${acaoNome(item.acaoDivulgacaoId)}`;
    }

    return "Projeto geral";
  };

  const tipoVinculoTexto = (item: CronogramaData) => {
    if (item.atividadeId) return "Atividade";
    if (item.eventoCulturalId) return "Evento Cultural";
    if (item.acaoDivulgacaoId) return "Ação de Divulgação";

    return "Projeto";
  };

  const vinculoRelacionadoTexto = (item: CronogramaData) => {
    if (item.atividadeId) return atividadeNome(item.atividadeId);
    if (item.eventoCulturalId) return eventoNome(item.eventoCulturalId);
    if (item.acaoDivulgacaoId) return acaoNome(item.acaoDivulgacaoId);

    return projetoNome(item.projetoId);
  };

  const handleExportPdf = async (item: CronogramaData) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    try {
      await exportCronogramaPdf({
        id: item.id,
        nomeEtapa: item.nomeEtapa,
        etapaCronograma: etapaCronogramaLabel(item.etapaCronograma),
        descricaoEtapa: item.descricaoEtapa,
        dataInicio: item.dataInicioEtapa,
        dataTermino: item.dataFimEtapa,
        statusCronograma: statusCronogramaLabel(item.statusCronograma),
        projeto: projetoNome(item.projetoId),
        tipoVinculo: tipoVinculoTexto(item),
        vinculoRelacionado: vinculoRelacionadoTexto(item),
        atividade: item.atividadeId ? atividadeNome(item.atividadeId) : null,
        eventoCultural: item.eventoCulturalId
          ? eventoNome(item.eventoCulturalId)
          : null,
        acaoDivulgacao: item.acaoDivulgacaoId
          ? acaoNome(item.acaoDivulgacaoId)
          : null,
      });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a ficha do cronograma.");
    }
  };

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = useCallback((next: Filtros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    window.setTimeout(() => setSearching(false), 180);
  }, []);

  const handleSearch = (event?: FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const tipoVinculo = (item: CronogramaData) => {
    if (item.atividadeId) return "ATIVIDADE";
    if (item.eventoCulturalId) return "EVENTO";
    if (item.acaoDivulgacaoId) return "ACAO";
    return "PROJETO";
  };

  const filtered = useMemo(() => {
    const etapa = normalize(filtros.etapa);
    const descricao = normalize(filtros.descricao);
    const result = items.filter((item) => {
      if (etapa && !normalize(item.nomeEtapa).includes(etapa)) return false;
      if (descricao && !normalize(item.descricaoEtapa).includes(descricao))
        return false;
      if (filtros.projetos.length && !filtros.projetos.includes(item.projetoId))
        return false;
      if (
        filtros.status.length &&
        !filtros.status.includes(item.statusCronograma)
      )
        return false;
      if (
        filtros.tiposEtapa.length &&
        !filtros.tiposEtapa.includes(item.etapaCronograma)
      )
        return false;
      if (
        filtros.vinculos.length &&
        !filtros.vinculos.includes(tipoVinculo(item))
      )
        return false;
      return true;
    });

    const sortValue = (item: CronogramaData) => {
      switch (filtros.sortBy) {
        case "etapa":
          return item.nomeEtapa;
        case "status":
          return statusCronogramaLabel(item.statusCronograma);
        case "projeto":
          return projetoNome(item.projetoId);
        case "vinculo":
          return vinculoTexto(item);
        default:
          return item.dataInicioEtapa ?? "";
      }
    };
    return [...result].sort((a, b) => {
      const compare = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
    // Helpers de rótulo dependem das coleções abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, items, projetos, atividades, eventos, acoes]);

  const projetoOptions = useMemo(
    () => projetos.map((item) => ({ value: item.id, label: item.nome })),
    [projetos],
  );

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.etapa.trim())
      list.push({
        id: "etapa",
        label: "Etapa",
        value: filtros.etapa.trim(),
        onRemove: () => applyFiltros({ ...filtros, etapa: "" }),
      });
    if (filtros.descricao.trim())
      list.push({
        id: "descricao",
        label: "Descrição",
        value: filtros.descricao.trim(),
        onRemove: () => applyFiltros({ ...filtros, descricao: "" }),
      });
    const addList = (
      key: "projetos" | "status" | "tiposEtapa" | "vinculos",
      label: string,
      options: readonly { value: string; label: string }[],
    ) =>
      filtros[key].forEach((value) =>
        list.push({
          id: `${key}-${value}`,
          label,
          value: labelOf(options, value),
          onRemove: () =>
            applyFiltros({
              ...filtros,
              [key]: filtros[key].filter((item) => item !== value),
            }),
        }),
      );
    addList("projetos", "Projeto", projetoOptions);
    addList("status", "Status", statusCronogramaOptions);
    addList("tiposEtapa", "Tipo de etapa", etapaCronogramaOptions);
    addList("vinculos", "Vínculo", vinculoOptions);
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${
          filtros.sortDir === "asc" ? "Crescente" : "Decrescente"
        }`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return list;
  }, [applyFiltros, filtros, projetoOptions]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const exportColumns = [
    { header: "Etapa", key: "nomeEtapa" },
    { header: "Fase", key: "tipoEtapaLabel" },
    { header: "Descrição", key: "descricaoEtapa" },
    { header: "Data de início", key: "dataInicioEtapa" },
    { header: "Data de término", key: "dataFimEtapa" },
    { header: "Status", key: "statusLabel" },
    { header: "Projeto", key: "projetoLabel" },
    { header: "Vínculo", key: "vinculoLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      tipoEtapaLabel: etapaCronogramaLabel(item.etapaCronograma),
      statusLabel: statusCronogramaLabel(item.statusCronograma),
      projetoLabel: projetoNome(item.projetoId),
      vinculoLabel: vinculoTexto(item),
    }));

  const setField = <K extends keyof CronogramaData>(
    key: K,
    value: CronogramaData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setProjeto = (projetoId: string) => {
    setForm((prev) => ({
      ...prev,
      projetoId,
      atividadeId: "",
      eventoCulturalId: "",
      acaoDivulgacaoId: "",
    }));

    setLinkType("NONE");
  };

  const normalizeFormByLinkType = (): CronogramaData => {
    return {
      ...form,
      atividadeId: linkType === "ATIVIDADE" ? form.atividadeId : "",
      eventoCulturalId: linkType === "EVENTO" ? form.eventoCulturalId : "",
      acaoDivulgacaoId: linkType === "ACAO" ? form.acaoDivulgacaoId : "",
    };
  };

  const handleNew = () => {
    if (!podeCriar) {
      toast.error("Você não possui permissão para criar etapas do cronograma.");
      return;
    }

    setSelectedId(null);
    setForm(createEmptyCronograma());
    setLinkType("NONE");
    setMode("create");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedId(null);
    setMode("create");
    setLinkType("NONE");
    setForm(createEmptyCronograma());
  };

  const detectLinkType = (record: CronogramaData): LinkType => {
    if (record.atividadeId) return "ATIVIDADE";
    if (record.eventoCulturalId) return "EVENTO";
    if (record.acaoDivulgacaoId) return "ACAO";
    return "NONE";
  };

  const openRecord = (record: CronogramaData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar etapas do cronograma.",
      );
      return;
    }

    setSelectedId(record.id);
    setForm(record);
    setLinkType(detectLinkType(record));
    setMode(nextMode);
    setShowForm(true);
  };

  const handleLinkTypeChange = (value: LinkType) => {
    setLinkType(value);

    setForm((prev) => ({
      ...prev,
      atividadeId: "",
      eventoCulturalId: "",
      acaoDivulgacaoId: "",
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (readOnly) return;

    if (mode === "create" && !podeCriar) {
      toast.error("Você não possui permissão para criar etapas do cronograma.");
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar etapas do cronograma.",
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

    if (hasInvalidDateRange) {
      toast.error(cronogramaDateError);
      return;
    }

    if (linkType === "ATIVIDADE" && !form.atividadeId) {
      toast.error("Selecione a atividade relacionada.");
      return;
    }

    if (linkType === "EVENTO" && !form.eventoCulturalId) {
      toast.error("Selecione o evento cultural relacionado.");
      return;
    }

    if (linkType === "ACAO" && !form.acaoDivulgacaoId) {
      toast.error("Selecione a ação de divulgação relacionada.");
      return;
    }

    try {
      setSaving(true);

      const normalizedForm = normalizeFormByLinkType();
      const payload = buildCronogramaPayload(normalizedForm);

      const saved =
        mode === "edit" && form.id
          ? await updateCronograma(Number(form.id), payload)
          : await createCronograma(payload);

      setItems((prev) => {
        if (mode === "edit") {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }

        return [saved, ...prev];
      });
      notifyImportReviewSaveSuccess("cronogramas");

      if (mode === "create") {
        salvarProximaAcaoCronograma();
      }

      handleCancel();

      toast.success(
        mode === "create"
          ? "Etapa cadastrada com sucesso."
          : "Etapa salva com sucesso.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar cronograma.";

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
        "Você não possui permissão para excluir etapas do cronograma.",
      );
      setConfirmDeleteId(null);
      return;
    }

    try {
      await deleteCronograma(Number(confirmDeleteId));

      setItems((prev) => prev.filter((item) => item.id !== confirmDeleteId));

      if (selectedId === confirmDeleteId) {
        handleCancel();
      }

      setConfirmDeleteId(null);
      toast.success("Etapa excluída com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir etapa.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDeleteId(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  if (loadingPermissoes) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando permissões...
          </p>
        </div>
      </AppLayout>
    );
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
        {showForm ? (
          <>
            <BackButton onClick={handleCancel} />

            <PageTitle
              title={
                readOnly
                  ? "Cronograma do Projeto"
                  : mode === "edit"
                    ? "Cronograma do Projeto"
                    : "Cronograma do Projeto"
              }
              tooltip={cronogramaTitleTooltip}
              showImport={!readOnly}
            />

            <FormLegend />

            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset
                disabled={readOnly}
                className="space-y-5 border-0 p-0 disabled:opacity-100"
              >
                <FormSectionCard
                  icon={FolderKanban}
                  title="Vínculos da etapa"
                  description="Informe o projeto ao qual a etapa pertence e indique se ela se refere ao projeto como um todo ou a uma atividade, evento cultural ou ação de divulgação específica."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel
                        htmlFor="projetoId"
                        required={!readOnly}
                        tooltip="Informe o projeto ao qual esta etapa do cronograma pertence."
                      >
                        Projeto
                      </FieldLabel>

                      <Select
                        value={form.projetoId}
                        onValueChange={setProjeto}
                        disabled={readOnly || saving}
                      >
                        <SelectTrigger id="projetoId">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {projetos.map((projeto) => (
                            <SelectItem key={projeto.id} value={projeto.id}>
                              {projeto.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="tipoVinculo"
                        tooltip="Informe se esta etapa pertence ao projeto como um todo ou se está ligada especificamente a uma atividade, evento cultural ou ação de divulgação. Se não houver um vínculo específico, selecione Projeto geral."
                      >
                        Tipo de Vínculo
                      </FieldLabel>

                      <Select
                        value={linkType}
                        onValueChange={(value) =>
                          handleLinkTypeChange(value as LinkType)
                        }
                        disabled={readOnly || saving || !form.projetoId}
                      >
                        <SelectTrigger id="tipoVinculo">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="NONE">Projeto geral</SelectItem>

                          <SelectItem value="ATIVIDADE">Atividade</SelectItem>

                          <SelectItem value="EVENTO">
                            Evento cultural
                          </SelectItem>

                          <SelectItem value="ACAO">
                            Ação de divulgação
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {linkType === "ATIVIDADE" && (
                      <Field>
                        <FieldLabel
                          htmlFor="atividadeId"
                          required={!readOnly}
                          tooltip="Informe a atividade à qual esta etapa do cronograma está relacionada."
                        >
                          Atividade Relacionada
                        </FieldLabel>

                        <Select
                          value={form.atividadeId}
                          onValueChange={(value) =>
                            setField("atividadeId", value)
                          }
                          disabled={readOnly || saving}
                        >
                          <SelectTrigger id="atividadeId">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>

                          <SelectContent className="max-h-72">
                            {atividadesFiltradas.length === 0 ? (
                              <SelectItem value="sem-atividade" disabled>
                                Nenhuma atividade disponível para este projeto
                              </SelectItem>
                            ) : (
                              atividadesFiltradas.map((atividade) => (
                                <SelectItem
                                  key={atividade.id}
                                  value={atividade.id}
                                >
                                  {atividade.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}

                    {linkType === "EVENTO" && (
                      <Field>
                        <FieldLabel
                          htmlFor="eventoCulturalId"
                          required={!readOnly}
                          tooltip="Informe o evento cultural ao qual esta etapa do cronograma está relacionada."
                        >
                          Evento Cultural Relacionado
                        </FieldLabel>

                        <Select
                          value={form.eventoCulturalId}
                          onValueChange={(value) =>
                            setField("eventoCulturalId", value)
                          }
                          disabled={readOnly || saving}
                        >
                          <SelectTrigger id="eventoCulturalId">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>

                          <SelectContent className="max-h-72">
                            {eventosFiltrados.length === 0 ? (
                              <SelectItem value="sem-evento" disabled>
                                Nenhum evento cultural disponível para este
                                projeto
                              </SelectItem>
                            ) : (
                              eventosFiltrados.map((evento) => (
                                <SelectItem key={evento.id} value={evento.id}>
                                  {evento.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}

                    {linkType === "ACAO" && (
                      <Field>
                        <FieldLabel
                          htmlFor="acaoDivulgacaoId"
                          required={!readOnly}
                          tooltip="Informe a ação de divulgação à qual esta etapa do cronograma está relacionada."
                        >
                          Ação de Divulgação Relacionada
                        </FieldLabel>

                        <Select
                          value={form.acaoDivulgacaoId}
                          onValueChange={(value) =>
                            setField("acaoDivulgacaoId", value)
                          }
                          disabled={readOnly || saving}
                        >
                          <SelectTrigger id="acaoDivulgacaoId">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>

                          <SelectContent className="max-h-72">
                            {acoesFiltradas.length === 0 ? (
                              <SelectItem value="sem-acao" disabled>
                                Nenhuma ação de divulgação disponível para este
                                projeto
                              </SelectItem>
                            ) : (
                              acoesFiltradas.map((acao) => (
                                <SelectItem key={acao.id} value={acao.id}>
                                  {acao.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={Target}
                  title="Definição da etapa"
                  description="Informe em qual fase do cronograma esta etapa se encaixa, defina um nome para identificá-la e descreva o que será realizado."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel
                        htmlFor="etapaCronograma"
                        required={!readOnly}
                        tooltip="Selecione a fase do cronograma em que esta etapa será realizada: Planejamento, Pré-produção, Produção, Divulgação, Execução, Pós-produção ou Prestação de contas."
                      >
                        Fase do Cronograma
                      </FieldLabel>

                      <Select
                        value={form.etapaCronograma}
                        onValueChange={(value) =>
                          setField("etapaCronograma", value)
                        }
                        disabled={readOnly || saving}
                      >
                        <SelectTrigger id="etapaCronograma">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent>
                          {etapaCronogramaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="nomeEtapa"
                        required={!readOnly}
                        tooltip="Informe um nome curto e claro que permita identificar facilmente esta etapa do cronograma."
                      >
                        Nome da Etapa
                      </FieldLabel>

                      <Input
                        id="nomeEtapa"
                        value={form.nomeEtapa}
                        onChange={(e) => setField("nomeEtapa", e.target.value)}
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>

                    <Field full>
                      <FieldLabel
                        htmlFor="descricaoEtapa"
                        required={!readOnly}
                        tooltip="Descreva o que será realizado nesta etapa, incluindo as principais ações, entregas ou resultados previstos."
                      >
                        Descrição da Etapa
                      </FieldLabel>

                      <Textarea
                        id="descricaoEtapa"
                        value={form.descricaoEtapa}
                        onChange={(e) =>
                          setField("descricaoEtapa", e.target.value)
                        }
                        rows={4}
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={CalendarRange}
                  title="Período e situação"
                  description="Informe as datas previstas ou efetivas de início e término da etapa e sua situação atual no cronograma."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel
                        htmlFor="dataInicioEtapa"
                        required={!readOnly}
                        tooltip="Informe a data prevista ou efetiva de início desta etapa."
                      >
                        Data de Início
                      </FieldLabel>

                      <Input
                        id="dataInicioEtapa"
                        type="date"
                        value={form.dataInicioEtapa}
                        onChange={(e) =>
                          setField("dataInicioEtapa", e.target.value)
                        }
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="dataFimEtapa"
                        required={!readOnly}
                        tooltip="Informe a data prevista ou efetiva de término desta etapa."
                      >
                        Data de Término
                      </FieldLabel>

                      <Input
                        id="dataFimEtapa"
                        type="date"
                        value={form.dataFimEtapa}
                        onChange={(e) =>
                          setField("dataFimEtapa", e.target.value)
                        }
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>

                    {hasInvalidDateRange && (
                      <Field full>
                        <p className="text-sm text-destructive">
                          {cronogramaDateError}
                        </p>
                      </Field>
                    )}

                    <Field>
                      <FieldLabel
                        htmlFor="statusCronograma"
                        required={!readOnly}
                        tooltip="Informe a situação atual da etapa. Planejado indica uma etapa ainda não iniciada; Em andamento, etapa em execução; Concluído, etapa finalizada; Atrasado, etapa fora do prazo previsto; e Cancelado, etapa que não será realizada."
                      >
                        Situação da Etapa
                      </FieldLabel>

                      <Select
                        value={form.statusCronograma}
                        onValueChange={(value) =>
                          setField("statusCronograma", value)
                        }
                        disabled={readOnly || saving}
                      >
                        <SelectTrigger id="statusCronograma">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent>
                          {statusCronogramaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FormSectionCard>
              </fieldset>

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
                <div className="flex pt-2 sm:justify-end">
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
            <ListPageHeader
              title="Cronograma do Projeto"
              tooltip={cronogramaTitleTooltip}
              objective="Estruture o cronograma dos projetos, organizando suas etapas por fase, período de execução e situação. Quando necessário, relacione cada etapa a uma atividade, evento cultural ou ação de divulgação para facilitar o acompanhamento e a comprovação das ações realizadas."
              actions={
                podeCriar ? (
                  <Button
                    type="button"
                    variant="glassPrimary"
                    onClick={handleNew}
                    className="h-9 gap-2 px-4"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar etapa
                  </Button>
                ) : undefined
              }
            />

            <div className="space-y-4">
              <AdvancedSearchPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                activeCount={activeFilters.length}
              >
                <form onSubmit={handleSearch} noValidate>
                  <SearchFilterGrid>
                    <FilterInput
                      id="filtroEtapa"
                      label="Etapa"
                      value={draft.etapa}
                      placeholder="Digite o nome da etapa"
                      onChange={(value) => setDraftField("etapa", value)}
                    />
                    <FilterInput
                      id="filtroDescricao"
                      label="Descrição"
                      value={draft.descricao}
                      placeholder="Digite parte da descrição"
                      onChange={(value) => setDraftField("descricao", value)}
                    />
                    <FilterField
                      label="Projeto"
                      id="filtroProjeto"
                      options={projetoOptions}
                      value={draft.projetos}
                      onChange={(value) => setDraftField("projetos", value)}
                      placeholder="Todos os projetos"
                      searchable
                    />
                    <FilterField
                      label="Status"
                      id="filtroStatus"
                      options={statusCronogramaOptions}
                      value={draft.status}
                      onChange={(value) => setDraftField("status", value)}
                      placeholder="Todos os status"
                    />
                    <FilterField
                      label="Tipo de etapa"
                      id="filtroTipoEtapa"
                      options={etapaCronogramaOptions}
                      value={draft.tiposEtapa}
                      onChange={(value) => setDraftField("tiposEtapa", value)}
                      placeholder="Todos os tipos"
                    />
                    <FilterField
                      label="Vínculo"
                      id="filtroVinculo"
                      options={vinculoOptions}
                      value={draft.vinculos}
                      onChange={(value) => setDraftField("vinculos", value)}
                      placeholder="Todos os vínculos"
                    />
                    <div>
                      <FieldLabel htmlFor="filtroSortBy">
                        Ordenar por
                      </FieldLabel>
                      <Select
                        value={draft.sortBy}
                        onValueChange={(value) =>
                          setDraftField("sortBy", value as SortBy)
                        }
                      >
                        <SelectTrigger
                          id="filtroSortBy"
                          className="h-9 rounded-[10px] border-border/70 bg-background/70"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sortByOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroSortDir">Ordem</FieldLabel>
                      <Select
                        value={draft.sortDir}
                        onValueChange={(value) =>
                          setDraftField("sortDir", value as SortDir)
                        }
                      >
                        <SelectTrigger
                          id="filtroSortDir"
                          className="h-9 rounded-[10px] border-border/70 bg-background/70"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Crescente</SelectItem>
                          <SelectItem value="desc">Decrescente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </SearchFilterGrid>
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={handleClearFiltros}
                    >
                      <RotateCcw className="h-4 w-4" /> Limpar filtros
                    </Button>
                    <Button
                      type="submit"
                      variant="glassPrimary"
                      className="h-9 gap-2 px-5"
                      disabled={searching}
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {searching ? "Pesquisando..." : "Pesquisar"}
                    </Button>
                  </div>
                </form>
              </AdvancedSearchPanel>

              <ActiveFilters
                items={activeFilters}
                onClearAll={handleClearFiltros}
              />

              <DataTableCard>
                <DataTableToolbar
                  total={filtered.length}
                  reportTo="/relatorios/cronogramas"
                  exportColumns={exportColumns}
                  getExportData={getExportData}
                  exportFilename="cronograma"
                  canExport={podeGerarPdf}
                />
                {filtered.length === 0 ? (
                  <DataTableEmptyState
                    emptyTitle="Nenhuma etapa cadastrada."
                    createLabel={podeCriar ? "Cadastrar etapa" : undefined}
                    onCreate={podeCriar ? handleNew : undefined}
                    activeCount={activeFilters.length}
                    onReviewSearch={() => setPanelOpen(true)}
                    onClearFilters={handleClearFiltros}
                  />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[1180px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th
                              className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                              data-no-copy
                            >
                              Ações
                            </th>

                            <SortableTh
                              sortKey="projeto"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Projeto
                            </SortableTh>

                            <SortableTh
                              sortKey="etapa"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Etapa
                            </SortableTh>

                            <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Fase
                            </th>

                            <SortableTh
                              sortKey="periodo"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Período
                            </SortableTh>

                            <SortableTh
                              sortKey="vinculo"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Vínculo
                            </SortableTh>

                            <SortableTh
                              sortKey="status"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Status
                            </SortableTh>
                          </tr>
                        </thead>

                        <tbody>
                          {paginated.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                            >
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <RowActionsDropdown
                                  reportEndpoint={
                                    podeGerarPdf
                                      ? `/cronogramas/${item.id}/relatorio`
                                      : undefined
                                  }
                                  reportFilename={`cronograma-${item.id}.pdf`}
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

                              <td className="px-6 py-2.5">
                                <TableCellText
                                  text={projetoNome(item.projetoId)}
                                >
                                  {projetoNome(item.projetoId)}
                                </TableCellText>
                              </td>

                              <td className="px-6 py-2.5">
                                <TableCellText text={item.nomeEtapa} bold>
                                  {item.nomeEtapa}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <StatusPill
                                  status={item.etapaCronograma}
                                  ariaLabelPrefix="Etapa do cronograma"
                                />
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                                {formatDateRange(
                                  item.dataInicioEtapa,
                                  item.dataFimEtapa,
                                )}
                              </td>

                              <td className="px-6 py-2.5">
                                <TableCellText text={vinculoTexto(item)} muted>
                                  {vinculoTexto(item)}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <StatusPill
                                  status={statusCronogramaLabel(
                                    item.statusCronograma,
                                  )}
                                  context="cronograma"
                                />
                              </td>
                            </tr>
                          ))}

                          {paginated.length === 0 && <EmptyRow colSpan={7} />}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-border md:hidden">
                      {paginated.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/cronogramas/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`cronograma-${item.id}.pdf`}
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
                            {item.nomeEtapa}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusPill
                              status={item.etapaCronograma}
                              ariaLabelPrefix="Etapa do cronograma"
                            />
                            <span className="text-xs text-muted-foreground">
                              {formatDateRange(
                                item.dataInicioEtapa,
                                item.dataFimEtapa,
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-foreground">
                            {projetoNome(item.projetoId)}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {vinculoTexto(item)}
                          </p>

                          <div className="mt-2">
                            <StatusPill
                              status={statusCronogramaLabel(
                                item.statusCronograma,
                              )}
                              context="cronograma"
                            />
                          </div>
                        </div>
                      ))}

                      {paginated.length === 0 && (
                        <div className="p-10 text-center">
                          <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

                          <p className="mt-3 text-sm text-muted-foreground">
                            Nenhuma etapa encontrada.
                          </p>
                        </div>
                      )}
                    </div>

                    <DataTablePagination
                      totalItems={filtered.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      entityLabel="registro"
                      entityLabelPlural="registros"
                      pageSizeLabel="Registros por página"
                      loading={loading}
                    />
                  </>
                )}
              </DataTableCard>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa do cronograma?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
        pageTitle="Cronograma do Projeto"
        href="https://www.aurit.com.br/wiki/projetos/cronograma-do-projeto"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title}>
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
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma etapa encontrada.
        </p>
      </td>
    </tr>
  );
}

function FilterInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
      />
    </div>
  );
}

function FilterField({
  id,
  label,
  options,
  value,
  placeholder,
  searchable,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  value: string[];
  placeholder: string;
  searchable?: boolean;
  onChange: (value: string[]) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FilterMultiSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchable={searchable}
        summaryNoun="itens selecionados"
      />
    </div>
  );
}

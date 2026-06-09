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
  CalendarRange,
  ClipboardList,
  Eye,
  FileDown,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportCronogramaPdf } from "@/lib/pdfExporters";
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

type SortKey = "etapa" | "periodo" | "status" | "projeto" | "vinculo";

type FormMode = "create" | "edit" | "view";
type LinkType = "NONE" | "ATIVIDADE" | "EVENTO" | "ACAO";

const CRONOGRAMA_NEXT_STEP_KEY = "aurit:cronograma:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface CronogramaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoCronograma() {
  const card: CronogramaNextStepCardData = {
    titulo: "Após organizar o cronograma, cadastre as atividades do projeto",
    descricao:
      "As atividades detalham o que será realizado na prática, com público atendido, local, período, vagas e equipe envolvida. Esses registros ajudam a acompanhar a execução, organizar presenças, gerar evidências e apoiar relatórios e prestações de contas.",
    acaoLabel: "Cadastrar atividades",
    acaoUrl: "/atividades/novo",
    acaoSecundariaLabel: "Ver cronogramas",
    acaoSecundariaUrl: "/cronograma",
    variante: "pendente",
  };

  sessionStorage.setItem(CRONOGRAMA_NEXT_STEP_KEY, JSON.stringify(card));
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

function statusCronogramaClass(value: string) {
  switch (value) {
    case "CONCLUIDO":
      return "status-pill status-active";
    case "EM_ANDAMENTO":
      return "status-pill status-pending";
    case "PLANEJADO":
      return "status-pill status-done";
    case "ATRASADO":
      return "status-pill status-inactive";
    case "CANCELADO":
      return "status-pill status-inactive";
    default:
      return "status-pill status-inactive";
  }
}

function StatusCronogramaBadge({ value }: { value: string }) {
  return (
    <span className={statusCronogramaClass(value)}>
      {statusCronogramaLabel(value)}
    </span>
  );
}

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
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<CronogramaNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const tableRef = useRef<HTMLTableElement>(null);

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
    const raw = sessionStorage.getItem(CRONOGRAMA_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CronogramaNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(CRONOGRAMA_NEXT_STEP_KEY);

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
        error instanceof Error
          ? error.message
          : "Erro ao carregar cronograma.";

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
    id ? projetos.find((entry) => entry.id === id)?.nome ?? "—" : "—";

  const atividadeNome = (id?: string) =>
    id ? atividades.find((entry) => entry.id === id)?.nome ?? "—" : "—";

  const eventoNome = (id?: string) =>
    id ? eventos.find((entry) => entry.id === id)?.nome ?? "—" : "—";

  const acaoNome = (id?: string) =>
    id ? acoes.find((entry) => entry.id === id)?.nome ?? "—" : "—";

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

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    const sorted = [...items].sort(
      (a, b) =>
        a.dataInicioEtapa.localeCompare(b.dataInicioEtapa) ||
        a.nomeEtapa.localeCompare(b.nomeEtapa),
    );

    if (!term) return sorted;

    return sorted.filter((item) => {
      return [
        item.nomeEtapa,
        etapaCronogramaLabel(item.etapaCronograma),
        item.descricaoEtapa,
        item.dataInicioEtapa,
        item.dataFimEtapa,
        statusCronogramaLabel(item.statusCronograma),
        projetoNome(item.projetoId),
        vinculoTexto(item),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, projetos, atividades, eventos, acoes, search]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "etapa":
          return item.nomeEtapa;
        case "periodo":
          return item.dataInicioEtapa ?? "";
        case "status":
          return statusCronogramaLabel(item.statusCronograma);
        case "projeto":
          return projetoNome(item.projetoId);
        case "vinculo":
          return vinculoTexto(item);
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

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
      toast.error("Você não possui permissão para editar etapas do cronograma.");
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
      toast.error("Você não possui permissão para editar etapas do cronograma.");
      return;
    }

    const missing = requiredFields.find(([key]) =>
      !String(form[key] ?? "").trim(),
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
      toast.error("Você não possui permissão para excluir etapas do cronograma.");
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

        <PageTitle
          title="Cronograma do Projeto"
          tooltip={cronogramaTitleTooltip}
        />

        {showForm ? (
          <>
            {readOnly && (
              <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Esta tela está em modo de visualização. Para alterar os dados,
                utilize a opção Editar disponível no menu{" "}
                <span className="font-semibold">Ações</span>.
              </div>
            )}

            {!readOnly && <FormLegend />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Section icon={ClipboardList} title="Identificação da etapa">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel
                      htmlFor="nomeEtapa"
                      required={!readOnly}
                      tooltip="Informe um nome curto e claro para identificar esta etapa do cronograma. Ex.: planejamento, mobilização, execução das oficinas, apresentação final ou elaboração do relatório."
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
                      htmlFor="etapaCronograma"
                      required={!readOnly}
                      tooltip="Classifique a fase do cronograma. Use Planejamento, Pré-produção, Produção, Divulgação, Execução, Pós-produção ou Prestação de contas conforme o momento da etapa."
                    >
                      Etapa
                    </FieldLabel>

                    <Select
                      value={form.etapaCronograma}
                      onValueChange={(value) => setField("etapaCronograma", value)}
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

                  <Field full>
                    <FieldLabel
                      htmlFor="descricaoEtapa"
                      required={!readOnly}
                      tooltip="Descreva o que será realizado nesta etapa, informando ações previstas, responsáveis, entregas, procedimentos ou resultados esperados. Ex.: Nesta etapa serão realizados contatos com escolas parceiras, divulgação das inscrições, organização dos materiais e confirmação dos participantes das oficinas."
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
              </Section>

              <Section icon={CalendarRange} title="Período e status">
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
                      tooltip="Informe a data prevista ou efetiva de encerramento desta etapa."
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

                  <Field full>
                    <FieldLabel
                      htmlFor="statusCronograma"
                      required={!readOnly}
                      tooltip="Indique a situação atual da etapa. Use “Planejado” para etapas ainda previstas, “Em andamento” para etapas em execução, “Concluído” para etapas finalizadas, “Atrasado” para etapas fora do prazo e “Cancelado” para etapas que não serão executadas."
                    >
                      Status do Cronograma
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
              </Section>

              <Section icon={FolderKanban} title="Vínculos da etapa">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel
                      htmlFor="projetoId"
                      required={!readOnly}
                      tooltip="Selecione o projeto ao qual esta etapa pertence. Esse vínculo organiza o cronograma e conecta a etapa ao planejamento, execução, evidências e prestação de contas do projeto."
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

                  <Field full>
                    <FieldLabel
                      htmlFor="tipoVinculo"
                      tooltip="Selecione um vínculo específico apenas quando esta etapa estiver relacionada diretamente a uma atividade, evento cultural ou ação de divulgação. Escolha apenas uma opção por etapa."
                    >
                      Vínculo Específico
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
                        <SelectItem value="NONE">Projeto Geral</SelectItem>
                        <SelectItem value="ATIVIDADE">Atividade</SelectItem>
                        <SelectItem value="EVENTO">Evento Cultural</SelectItem>
                        <SelectItem value="ACAO">Ação de Divulgação</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {linkType === "ATIVIDADE" && (
                    <Field full>
                      <FieldLabel
                        htmlFor="atividadeId"
                        required={!readOnly}
                        tooltip="Selecione a atividade relacionada a esta etapa do cronograma."
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
                    <Field full>
                      <FieldLabel
                        htmlFor="eventoCulturalId"
                        required={!readOnly}
                        tooltip="Selecione o evento cultural relacionado a esta etapa do cronograma."
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
                              Nenhum evento cultural disponível para este projeto
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
                    <Field full>
                      <FieldLabel
                        htmlFor="acaoDivulgacaoId"
                        required={!readOnly}
                        tooltip="Selecione a ação de divulgação relacionada a esta etapa do cronograma."
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
              </Section>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  {readOnly ? "Voltar" : "Cancelar"}
                </Button>

                {!readOnly && (
                  <Button
                    type="submit"
                    className="sm:min-w-32"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                )}
              </div>
            </form>
          </>
        ) : (
          <>
            {nextStepCard && (
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

            <div className="bg-card border border-border rounded">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
                <div className="relative max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9"
                    aria-label="Buscar etapa do cronograma"
                  />
                </div>

                {podeCriar && (
                  <Button
                    onClick={handleNew}
                    className="h-9 gap-2"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar Etapa
                  </Button>
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table ref={tableRef} className="w-full min-w-[1180px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th
                        className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        data-no-copy
                      >
                        Ações
                      </th>

                      <SortableHeader
                        label="Etapa"
                        sortKey="etapa"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Período"
                        sortKey="periodo"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Projeto"
                        sortKey="projeto"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      />

                      <SortableHeader
                        label="Vínculo"
                        sortKey="vinculo"
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
                    {paginated.map((item) => (
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

                        <td className="px-6 py-2.5">
                          <TableCellText text={item.nomeEtapa} bold>
                            {item.nomeEtapa}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                          {formatDateRange(
                            item.dataInicioEtapa,
                            item.dataFimEtapa,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <StatusCronogramaBadge
                            value={item.statusCronograma}
                          />
                        </td>

                        <td className="px-6 py-2.5">
                          <TableCellText text={projetoNome(item.projetoId)}>
                            {projetoNome(item.projetoId)}
                          </TableCellText>
                        </td>

                        <td className="px-6 py-2.5">
                          <TableCellText text={vinculoTexto(item)} muted>
                            {vinculoTexto(item)}
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
                    ))}

                    {paginated.length === 0 && (
                      <EmptyRow colSpan={podeGerarPdf ? 7 : 6} />
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border md:hidden">
                {paginated.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center gap-1">
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

                    <p className="font-medium text-foreground">
                      {item.nomeEtapa}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateRange(item.dataInicioEtapa, item.dataFimEtapa)}
                    </p>

                    <p className="mt-2 text-sm text-foreground">
                      {projetoNome(item.projetoId)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {vinculoTexto(item)}
                    </p>

                    <div className="mt-2">
                      <StatusCronogramaBadge value={item.statusCronograma} />
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(item)}
                        className="mt-3 h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Gerar ficha
                      </Button>
                    )}
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

              <TablePagination
                totalItems={sortedItems.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onCopy={handleCopy}
              />
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
          Nenhuma etapa encontrada.
        </p>
      </td>
    </tr>
  );
}
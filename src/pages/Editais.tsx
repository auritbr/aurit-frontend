import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileStack,
  Landmark,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Timer,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatusPill } from "@/components/StatusPill";
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
import { FormSectionCard } from "@/components/FormSectionCard";
import { BackButton } from "@/components/BackButton";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { DataTablePagination } from "@/components/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { getImportConfigForPath } from "@/config/importacoes";
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
  createEdital,
  buildEditalPayload,
  createEmptyEdital,
  deleteEdital,
  getEditais,
  updateEdital,
  type EditalData,
  esferaEditalLabel,
  esferaEditalOptions,
  statusEditalLabel,
  statusEditalOptions,
} from "@/data/editais";
import {
  getAgentesOptions,
  getOrganizacoesOptions,
  type SimpleOption,
} from "@/data/propostasEdital";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

const editaisTooltip =
  "Nesta página são cadastrados e acompanhados os editais de interesse da organização, permitindo reunir as informações necessárias para avaliar oportunidades, acompanhar prazos e manter atualizado o andamento de cada edital. Também podem ser registrados os dados da publicação, os recursos disponíveis, os responsáveis pelo acompanhamento e, quando houver participação, as informações da inscrição.";
const editaisObjetivo =
  "Cadastre e acompanhe os editais de interesse da organização, mantendo organizadas as informações necessárias para acompanhar oportunidades, prazos, inscrições, responsáveis e a situação de cada edital ao longo do processo.";
const textoOuTraco = (value?: string | null) => value?.trim() || "—";
const formatDataEdital = (value?: string) =>
  value ? value.split("-").reverse().join("/") : "—";
const parseValorEdital = (value?: string) =>
  Number(
    String(value ?? "0")
      .replace(/\./g, "")
      .replace(",", "."),
  ) || 0;
const formatValorEdital = (value?: string) =>
  parseValorEdital(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const periodoInscricoesEdital = (inicio?: string, fim?: string) =>
  `${formatDataEdital(inicio)} a ${formatDataEdital(fim)}`;
const statusEditalEmAndamento = new Set([
  "ABERTO",
  "EM_ANDAMENTO",
  "INSCRICOES_ABERTAS",
]);
const statusEditalEncerrado = new Set([
  "ENCERRADO",
  "FINALIZADO",
  "RESULTADO_PUBLICADO",
]);
const isLinkEditalValido = (value?: string) =>
  /^https?:\/\//i.test(value ?? "");

type FormMode = "create" | "edit" | "view";
type EditalForm = EditalData;

const fieldClass = "h-9";

const requiredFields: Array<[keyof EditalForm, string]> = [
  ["nomeEdital", "Nome do edital"],
  ["orgaoResponsavel", "Órgão responsável"],
  ["anoEdital", "Ano do edital"],
  ["esferaEdital", "Esfera do edital"],
  ["organizacaoId", "Organização"],
  ["agenteId", "Responsável pelo acompanhamento"],
  ["statusEdital", "Situação do edital"],
];

const onlyDigits = (value: string, max = 4) =>
  value.replace(/\D/g, "").slice(0, max);

const maskCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sortByOptions = [
  { value: "edital", label: "Edital" },
  { value: "orgao", label: "Órgão responsável" },
  { value: "esfera", label: "Esfera" },
  { value: "periodo", label: "Período de inscrições" },
  { value: "valor", label: "Valor total" },
  { value: "situacao", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface Filtros {
  termo: string;
  esferas: string[];
  situacoes: string[];
  organizacoes: string[];
  agentes: string[];
  ano: string;
  aberturaDe: string;
  encerramentoAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const filtrosIniciais: Filtros = {
  termo: "",
  esferas: [],
  situacoes: [],
  organizacoes: [],
  agentes: [],
  ano: "",
  aberturaDe: "",
  encerramentoAte: "",
  sortBy: "edital",
  sortDir: "asc",
};

export default function Editais() {
  const [organizacoes, setOrganizacoes] = useState<SimpleOption[]>([]);
  const [agentes, setAgentes] = useState<SimpleOption[]>([]);
  const [items, setItems] = useState<EditalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EditalForm>(() => createEmptyEdital());
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<EditalData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const formTopRef = useRef<HTMLDivElement>(null);

  useImportFormFill<EditalForm>("editais", setForm);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      getEditais(),
      getAgentesOptions(),
      getOrganizacoesOptions(),
    ])
      .then(([editaisData, agentesData, organizacoesData]) => {
        if (!active) return;
        setItems(editaisData);
        setAgentes(agentesData);
        setOrganizacoes(organizacoesData);
      })
      .catch(() => toast.error("Não foi possível carregar os editais."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const readOnly = mode === "view";
  const agentesOptions = useMemo(
    () => agentes.map((item) => ({ value: String(item.id), label: item.nome })),
    [agentes],
  );
  const agenteEditalNome = (id?: string) =>
    agentes.find((item) => String(item.id) === String(id))?.nome ?? "—";
  const organizacaoUnica =
    organizacoes.length === 1 ? organizacoes[0] : undefined;

  const organizacaoNome = (id?: string) =>
    (id ? organizacoes.find((entry) => entry.id === id)?.nome : undefined) ??
    "—";

  const syncItems = async () => {
    setItems(await getEditais());
    setOrganizacoes(await getOrganizacoesOptions());
  };

  const setField = <K extends keyof EditalForm>(key: K, value: EditalForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /* ----------------------------- listagem ----------------------------- */

  const filtered = useMemo(() => {
    const termo = normalize(filtros.termo);

    const list = items.filter((item) => {
      if (termo) {
        const haystack = normalize(
          [item.nomeEdital, item.numeroEdital, item.orgaoResponsavel].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      if (filtros.ano.trim() && item.anoEdital !== filtros.ano.trim())
        return false;
      if (
        filtros.esferas.length &&
        !filtros.esferas.includes(item.esferaEdital)
      )
        return false;
      if (
        filtros.situacoes.length &&
        !filtros.situacoes.includes(item.statusEdital)
      )
        return false;
      if (
        filtros.organizacoes.length &&
        !filtros.organizacoes.includes(item.organizacaoId)
      )
        return false;
      if (filtros.agentes.length && !filtros.agentes.includes(item.agenteId))
        return false;
      if (
        filtros.aberturaDe &&
        (!item.dataAbertura || item.dataAbertura < filtros.aberturaDe)
      )
        return false;
      if (
        filtros.encerramentoAte &&
        (!item.dataEncerramento ||
          item.dataEncerramento > filtros.encerramentoAte)
      )
        return false;
      return true;
    });

    const dir = filtros.sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filtros.sortBy) {
        case "orgao":
          return (
            a.orgaoResponsavel.localeCompare(b.orgaoResponsavel, "pt-BR") * dir
          );
        case "esfera":
          return (
            esferaEditalLabel(a.esferaEdital).localeCompare(
              esferaEditalLabel(b.esferaEdital),
              "pt-BR",
            ) * dir
          );
        case "periodo":
          return (
            (a.dataAbertura || "").localeCompare(b.dataAbertura || "") * dir
          );
        case "valor":
          return (
            (parseValorEdital(a.valorTotalDisponivel) -
              parseValorEdital(b.valorTotalDisponivel)) *
            dir
          );
        case "situacao":
          return (
            statusEditalLabel(a.statusEdital).localeCompare(
              statusEditalLabel(b.statusEdital),
              "pt-BR",
            ) * dir
          );
        default:
          return a.nomeEdital.localeCompare(b.nomeEdital, "pt-BR") * dir;
      }
    });
  }, [items, filtros]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const indicadores = useMemo(
    () => ({
      total: filtered.length,
      emAndamento: filtered.filter((item) =>
        statusEditalEmAndamento.has(item.statusEdital),
      ).length,
      encerrados: filtered.filter((item) =>
        statusEditalEncerrado.has(item.statusEdital),
      ).length,
      valorTotal: filtered.reduce(
        (acc, item) => acc + parseValorEdital(item.valorTotalDisponivel),
        0,
      ),
    }),
    [filtered],
  );

  const activeCount =
    (filtros.termo.trim() ? 1 : 0) +
    (filtros.ano.trim() ? 1 : 0) +
    (filtros.esferas.length ? 1 : 0) +
    (filtros.situacoes.length ? 1 : 0) +
    (filtros.organizacoes.length ? 1 : 0) +
    (filtros.agentes.length ? 1 : 0) +
    (filtros.aberturaDe ? 1 : 0) +
    (filtros.encerramentoAte ? 1 : 0);

  const removerFiltro = (patch: Partial<Filtros>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setFiltros((prev) => ({ ...prev, ...patch }));
  };

  const activeFilters: ActiveFilterItem[] = [];
  if (filtros.termo.trim())
    activeFilters.push({
      id: "termo",
      label: "Pesquisa",
      value: filtros.termo.trim(),
      onRemove: () => removerFiltro({ termo: "" }),
    });
  if (filtros.ano.trim())
    activeFilters.push({
      id: "ano",
      label: "Ano do edital",
      value: filtros.ano.trim(),
      onRemove: () => removerFiltro({ ano: "" }),
    });
  filtros.esferas.forEach((esfera) =>
    activeFilters.push({
      id: `esfera-${esfera}`,
      label: "Esfera",
      value: esferaEditalLabel(esfera),
      onRemove: () =>
        removerFiltro({ esferas: filtros.esferas.filter((e) => e !== esfera) }),
    }),
  );
  filtros.situacoes.forEach((situacao) =>
    activeFilters.push({
      id: `situacao-${situacao}`,
      label: "Situação",
      value: statusEditalLabel(situacao),
      onRemove: () =>
        removerFiltro({
          situacoes: filtros.situacoes.filter((s) => s !== situacao),
        }),
    }),
  );
  filtros.organizacoes.forEach((organizacaoId) =>
    activeFilters.push({
      id: `organizacao-${organizacaoId}`,
      label: "Organização",
      value: organizacaoNome(organizacaoId),
      onRemove: () =>
        removerFiltro({
          organizacoes: filtros.organizacoes.filter((o) => o !== organizacaoId),
        }),
    }),
  );
  filtros.agentes.forEach((agenteId) =>
    activeFilters.push({
      id: `agente-${agenteId}`,
      label: "Responsável pelo acompanhamento",
      value: agenteEditalNome(agenteId),
      onRemove: () =>
        removerFiltro({
          agentes: filtros.agentes.filter((a) => a !== agenteId),
        }),
    }),
  );
  if (filtros.aberturaDe)
    activeFilters.push({
      id: "aberturaDe",
      label: "Abertura a partir de",
      value: formatDataEdital(filtros.aberturaDe),
      onRemove: () => removerFiltro({ aberturaDe: "" }),
    });
  if (filtros.encerramentoAte)
    activeFilters.push({
      id: "encerramentoAte",
      label: "Encerramento até",
      value: formatDataEdital(filtros.encerramentoAte),
      onRemove: () => removerFiltro({ encerramentoAte: "" }),
    });

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearching(true);
    window.setTimeout(() => {
      setFiltros((prev) => ({
        ...draft,
        sortBy: prev.sortBy,
        sortDir: prev.sortDir,
      }));
      setSearching(false);
    }, 350);
  };

  const handleClearFiltros = () => {
    setDraft(filtrosIniciais);
    setFiltros((prev) => ({
      ...filtrosIniciais,
      sortBy: prev.sortBy,
      sortDir: prev.sortDir,
    }));
  };

  const toggleSort = (key: string) =>
    setFiltros((prev) => ({
      ...prev,
      sortBy: key as SortBy,
      sortDir: prev.sortBy === key && prev.sortDir === "asc" ? "desc" : "asc",
    }));

  /* ----------------------------- formulário ----------------------------- */

  const handleNew = () => {
    setSelectedId(null);
    setForm({
      ...createEmptyEdital(),
      organizacaoId: organizacaoUnica?.id ?? "",
    });
    setMode("create");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedId(null);
    setMode("create");
    setForm(createEmptyEdital());
  };

  const openRecord = (record: EditalData, nextMode: FormMode) => {
    setSelectedId(record.id);
    setForm({ ...record });
    setMode(nextMode);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? "").trim(),
    );
    if (missing) {
      toast.error(`Informe o campo: ${missing[1]}.`);
      return;
    }
    if (
      form.dataAbertura &&
      form.dataEncerramento &&
      form.dataEncerramento < form.dataAbertura
    ) {
      toast.error(
        "A data de encerramento não pode ser anterior à data de abertura.",
      );
      return;
    }
    if (
      form.dataAbertura &&
      form.dataResultado &&
      form.dataResultado < form.dataAbertura
    ) {
      toast.error(
        "A data do resultado não pode ser anterior à data de abertura.",
      );
      return;
    }

    try {
      const saved =
        mode === "create"
          ? await createEdital(buildEditalPayload(form))
          : await updateEdital(Number(form.id), buildEditalPayload(form));
      await syncItems();
      if (mode === "create") {
        window.dispatchEvent(
          new CustomEvent("aurit:import-review-save-success", {
            detail: { module: "editais" },
          }),
        );
        emitJourneyNextStep();
      }
      handleCancel();
      setSelectedId(saved.id);
      toast.success(
        mode === "create"
          ? "Edital cadastrado com sucesso."
          : "Edital salvo com sucesso.",
      );
    } catch {
      toast.error("Não foi possível salvar o edital.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEdital(Number(confirmDelete.id));
      await syncItems();
      if (selectedId === confirmDelete.id) handleCancel();
      toast.success("Edital excluído com sucesso.");
    } catch {
      toast.error("Não foi possível excluir o edital.");
    }
    setConfirmDelete(null);
  };

  /* ----------------------------- exportação ----------------------------- */

  const exportColumns = [
    { header: "Nome do edital", key: "nome" },
    { header: "Número do edital", key: "numero" },
    { header: "Órgão responsável", key: "orgao" },
    { header: "Ano", key: "ano" },
    { header: "Data de abertura", key: "abertura" },
    { header: "Data de encerramento", key: "encerramento" },
    { header: "Data do resultado", key: "resultado" },
    { header: "Valor total disponível", key: "valor" },
    { header: "Número de inscrição", key: "inscricao" },
    { header: "Link do edital", key: "link" },
    { header: "Esfera", key: "esfera" },
    { header: "Situação", key: "situacao" },
    { header: "Organização", key: "organizacao" },
    { header: "Responsável pelo acompanhamento", key: "responsavel" },
    { header: "Observações", key: "observacao" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      nome: textoOuTraco(item.nomeEdital),
      numero: textoOuTraco(item.numeroEdital),
      orgao: textoOuTraco(item.orgaoResponsavel),
      ano: textoOuTraco(item.anoEdital),
      abertura: formatDataEdital(item.dataAbertura),
      encerramento: formatDataEdital(item.dataEncerramento),
      resultado: formatDataEdital(item.dataResultado),
      valor: formatValorEdital(item.valorTotalDisponivel),
      inscricao: textoOuTraco(item.numeroInscricao),
      link: textoOuTraco(item.linkEdital),
      esfera: item.esferaEdital ? esferaEditalLabel(item.esferaEdital) : "—",
      situacao: item.statusEdital ? statusEditalLabel(item.statusEdital) : "—",
      organizacao: organizacaoNome(item.organizacaoId),
      responsavel: agenteEditalNome(item.agenteId),
      observacao: textoOuTraco(item.observacao),
    }));

  const tituloFormulario =
    mode === "view" ? "Editais" : mode === "edit" ? "Editais" : "Editais";

  /* ----------------------------- render ----------------------------- */

  return (
    <AppLayout>
      <div
        className={`container ${showForm ? "max-w-4xl" : "max-w-7xl"} py-6 sm:py-8`}
      >
        <div ref={formTopRef} />

        {showForm ? (
          <>
            <BackButton onClick={handleCancel} />
            <ListPageHeader
              title={tituloFormulario}
              tooltip={editaisTooltip}
              actions={
                !readOnly ? (
                  <ImportDataButton
                    config={getImportConfigForPath("/editais")!}
                    canFillForm
                    variant="glassSecondary"
                  />
                ) : undefined
              }
            />

            <FormLegend />

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <fieldset
                disabled={readOnly}
                className="space-y-5 border-0 p-0 disabled:opacity-100"
              >
                {/* 1 — Identificação do edital */}
                <FormSectionCard
                  icon={FileStack}
                  title="Identificação do edital"
                  description="Registre as informações oficiais utilizadas para identificar o edital."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        htmlFor="nomeEdital"
                        required
                        tooltip="Informe o nome oficial ou o título pelo qual o edital é divulgado. Utilize, sempre que possível, o mesmo nome apresentado no documento ou na página oficial."
                      >
                        Nome do Edital
                      </FieldLabel>

                      <Input
                        id="nomeEdital"
                        value={form.nomeEdital}
                        onChange={(e) => setField("nomeEdital", e.target.value)}
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="numeroEdital"
                        tooltip="Informe o número, código ou identificação oficial do edital, quando houver. Ex.: Edital nº 05/2026."
                      >
                        Número do Edital
                      </FieldLabel>

                      <Input
                        id="numeroEdital"
                        value={form.numeroEdital}
                        onChange={(e) =>
                          setField("numeroEdital", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="anoEdital"
                        required
                        tooltip="Informe o ano ao qual o edital pertence ou em que foi publicado. Ex.: 2026."
                      >
                        Ano do Edital
                      </FieldLabel>

                      <Input
                        id="anoEdital"
                        value={form.anoEdital}
                        onChange={(e) =>
                          setField("anoEdital", onlyDigits(e.target.value))
                        }
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={Landmark}
                  title="Publicação do edital"
                  description="Registre o orgão que publicou o edital e a referência oficial onde suas regras, documentos e atualizações podem ser consultados."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        htmlFor="orgaoResponsavel"
                        required
                        tooltip="Informe o nome do órgão, instituição ou empresa responsável pela publicação do edital. Ex.: Secretaria Municipal de Cultura, Fundação Nacional de Artes ou Instituto Cultural."
                      >
                        Órgão Responsável
                      </FieldLabel>

                      <Input
                        id="orgaoResponsavel"
                        value={form.orgaoResponsavel}
                        onChange={(e) =>
                          setField("orgaoResponsavel", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="esferaEdital"
                        required
                        tooltip="Selecione a esfera à qual pertence o órgão responsável pelo edital, como municipal, estadual, federal ou outra opção disponível."
                      >
                        Esfera do Edital
                      </FieldLabel>

                      <Select
                        value={form.esferaEdital}
                        onValueChange={(value) =>
                          setField("esferaEdital", value)
                        }
                      >
                        <SelectTrigger id="esferaEdital">
                          <SelectValue placeholder="Selecione a esfera" />
                        </SelectTrigger>

                        <SelectContent>
                          {esferaEditalOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel
                        htmlFor="linkEdital"
                        tooltip="Informe o endereço da página oficial onde o edital, seus documentos ou suas informações podem ser consultados."
                      >
                        Link do Edital
                      </FieldLabel>

                      {readOnly && isLinkEditalValido(form.linkEdital) ? (
                        <a
                          href={form.linkEdital}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 break-all text-[13px] font-medium text-primary underline-offset-4 hover:underline"
                        >
                          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {form.linkEdital}
                        </a>
                      ) : (
                        <Input
                          id="linkEdital"
                          type="url"
                          value={form.linkEdital}
                          onChange={(e) =>
                            setField("linkEdital", e.target.value)
                          }
                          placeholder="https://..."
                        />
                      )}
                    </div>
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={CalendarRange}
                  title="Prazos e recursos"
                  description="Acompanhe o período disponível para inscrição, a previsão de divulgação do resultado e os recursos ofertados pelo edital."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        htmlFor="dataAbertura"
                        tooltip="Informe a data em que o período de inscrições ou envio de propostas começa."
                      >
                        Data de Abertura
                      </FieldLabel>

                      <Input
                        id="dataAbertura"
                        type="date"
                        value={form.dataAbertura}
                        onChange={(e) =>
                          setField("dataAbertura", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="dataEncerramento"
                        tooltip="Informe o último dia permitido para realizar a inscrição ou enviar a proposta. Essa é a data limite do edital."
                      >
                        Data de Encerramento
                      </FieldLabel>

                      <Input
                        id="dataEncerramento"
                        type="date"
                        value={form.dataEncerramento}
                        onChange={(e) =>
                          setField("dataEncerramento", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="dataResultado"
                        tooltip="Informe a data prevista ou já divulgada para publicação do resultado. Se o edital ainda não informar essa data, deixe o campo em branco."
                      >
                        Data do Resultado
                      </FieldLabel>

                      <Input
                        id="dataResultado"
                        type="date"
                        value={form.dataResultado ?? ""}
                        onChange={(e) =>
                          setField("dataResultado", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="valorTotalDisponivel"
                        tooltip="Informe o valor total disponibilizado pelo edital para apoiar, financiar ou premiar as propostas selecionadas. Não informe aqui apenas o valor solicitado pela organização."
                      >
                        Valor Total Disponível
                      </FieldLabel>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                          R$
                        </span>

                        <Input
                          id="valorTotalDisponivel"
                          className="pl-9 tabular-nums"
                          value={form.valorTotalDisponivel}
                          onChange={(e) =>
                            setField(
                              "valorTotalDisponivel",
                              maskCurrency(e.target.value),
                            )
                          }
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={Landmark}
                  title="Vínculos institucionais"
                  description="Defina qual organização acompanhará este edital na Aurit e quem ficará responsável por monitorar seus prazos, atualizações e demais informações."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        htmlFor="organizacao"
                        required
                        tooltip="Selecione a organização da Aurit que está acompanhando ou pretende participar deste edital."
                      >
                        Organização
                      </FieldLabel>

                      <Select
                        value={form.organizacaoId}
                        onValueChange={(value) =>
                          setField("organizacaoId", value)
                        }
                      >
                        <SelectTrigger id="organizacao">
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {organizacoes.map((organizacao) => (
                            <SelectItem
                              key={organizacao.id}
                              value={organizacao.id}
                            >
                              {organizacao.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="agente"
                        required
                        tooltip="Selecione a pessoa que ficará responsável por acompanhar este edital na organização, observando prazos, atualizações, inscrições e outras informações importantes."
                      >
                        Agente Responsável
                      </FieldLabel>

                      <Select
                        value={form.agenteId}
                        onValueChange={(value) => setField("agenteId", value)}
                      >
                        <SelectTrigger id="agente">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {agentesOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </FormSectionCard>

                <FormSectionCard
                  icon={ClipboardList}
                  title="Situação e inscrição"
                  description="Acompanhe o momento atual do edital e mantenha registrado, quando houver participação da organização, o número recebido após a inscrição."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        htmlFor="statusEdital"
                        required
                        tooltip="Selecione a situação que melhor representa o momento atual do edital. Atualize este campo quando houver mudança, como abertura das inscrições, encerramento ou divulgação do resultado."
                      >
                        Situação do Edital
                      </FieldLabel>

                      <Select
                        value={form.statusEdital}
                        onValueChange={(value) =>
                          setField("statusEdital", value)
                        }
                      >
                        <SelectTrigger id="statusEdital">
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {statusEditalOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {form.statusEdital && (
                        <div className="mt-2">
                          <StatusPill
                            status={form.statusEdital}
                            context="edital"
                            ariaLabelPrefix="Situação do edital"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="numeroInscricao"
                        tooltip="Informe o número, protocolo ou código recebido após a inscrição da organização neste edital, quando houver. Se ainda não houve inscrição, deixe o campo em branco."
                      >
                        Número de Inscrição
                      </FieldLabel>

                      <Input
                        id="numeroInscricao"
                        value={form.numeroInscricao}
                        onChange={(e) =>
                          setField("numeroInscricao", e.target.value)
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel
                        htmlFor="observacao"
                        tooltip="Registre informações que sejam importantes para acompanhar o edital e que não possuam um campo próprio, como alterações publicadas, prorrogações, exigências específicas, pendências ou lembretes internos."
                      >
                        Observações
                      </FieldLabel>

                      <Textarea
                        id="observacao"
                        value={form.observacao}
                        onChange={(e) => setField("observacao", e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </FormSectionCard>
              </fieldset>

              {!readOnly ? (
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 px-4"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="glassPrimary"
                    className="h-9 px-5"
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
              title="Editais"
              tooltip={editaisTooltip}
              objective={editaisObjetivo}
              actions={
                <>
                  <Button
                    variant="glassPrimary"
                    className="h-9 gap-2 px-4"
                    onClick={handleNew}
                  >
                    <Plus className="h-4 w-4" aria-hidden /> Cadastrar edital
                  </Button>
                </>
              }
            />

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryStatCard
                title="Editais cadastrados"
                value={indicadores.total}
                icon={FileStack}
                variant="neutral"
              />
              <SummaryStatCard
                title="Em acompanhamento"
                value={indicadores.emAndamento}
                icon={Timer}
                variant="info"
              />
              <SummaryStatCard
                title="Encerrados"
                value={indicadores.encerrados}
                icon={CheckCircle2}
                variant="success"
              />
              <SummaryStatCard
                title="Valor total disponível"
                value={formatBRL(indicadores.valorTotal)}
                icon={CircleDollarSign}
                variant="warning"
              />
            </div>

            <div className="space-y-4">
              <AdvancedSearchPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                activeCount={activeCount}
              >
                <form onSubmit={handleSearch} noValidate>
                  <SearchFilterGrid>
                    <div>
                      <FieldLabel htmlFor="filtroTermo">Pesquisa</FieldLabel>
                      <Input
                        id="filtroTermo"
                        value={draft.termo}
                        onChange={(e) => setDraftField("termo", e.target.value)}
                        placeholder="Digite um termo"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroAno">Ano do edital</FieldLabel>
                      <Input
                        id="filtroAno"
                        value={draft.ano}
                        onChange={(e) =>
                          setDraftField("ano", onlyDigits(e.target.value))
                        }
                        inputMode="numeric"
                        placeholder="Informe o ano"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroEsferas">
                        Esfera do edital
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroEsferas"
                        options={esferaEditalOptions.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        value={draft.esferas}
                        onChange={(value) => setDraftField("esferas", value)}
                        placeholder="Todas as esferas"
                        summaryNoun="esferas selecionadas"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroSituacoes">
                        Situação do edital
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroSituacoes"
                        options={statusEditalOptions.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        value={draft.situacoes}
                        onChange={(value) => setDraftField("situacoes", value)}
                        placeholder="Todas as situações"
                        summaryNoun="situações selecionadas"
                        searchable
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroOrganizacoes">
                        Organização
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroOrganizacoes"
                        options={organizacoes.map((o) => ({
                          value: o.id,
                          label: o.nome,
                        }))}
                        value={draft.organizacoes}
                        onChange={(value) =>
                          setDraftField("organizacoes", value)
                        }
                        placeholder="Todas as organizações"
                        summaryNoun="organizações selecionadas"
                        searchable
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroAgentes">
                        Responsável pelo acompanhamento
                      </FieldLabel>
                      <FilterMultiSelect
                        id="filtroAgentes"
                        options={agentesOptions}
                        value={draft.agentes}
                        onChange={(value) => setDraftField("agentes", value)}
                        placeholder="Todos os responsáveis"
                        summaryNoun="responsáveis selecionados"
                        searchable
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroAberturaDe">
                        Abertura a partir de
                      </FieldLabel>
                      <Input
                        id="filtroAberturaDe"
                        type="date"
                        value={draft.aberturaDe}
                        onChange={(e) =>
                          setDraftField("aberturaDe", e.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="filtroEncerramentoAte">
                        Encerramento até
                      </FieldLabel>
                      <Input
                        id="filtroEncerramentoAte"
                        type="date"
                        value={draft.encerramentoAte}
                        onChange={(e) =>
                          setDraftField("encerramentoAte", e.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>
                  </SearchFilterGrid>
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={handleClearFiltros}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden /> Limpar
                      filtros
                    </Button>
                    <Button
                      type="submit"
                      variant="glassPrimary"
                      className="h-9 gap-2 px-5"
                      disabled={searching}
                      aria-busy={searching}
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Search className="h-4 w-4" aria-hidden />
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
                  reportTo="/relatorios/editais"
                  exportColumns={exportColumns}
                  getExportData={getExportData}
                  exportFilename="editais"
                />

                {loading ? (
                  <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Carregando os editais...
                  </div>
                ) : filtered.length === 0 ? (
                  <DataTableEmptyState
                    emptyTitle="Nenhum edital cadastrado."
                    emptyDescription="Cadastre os editais de interesse da organização para acompanhar prazos, valores, inscrições e situação."
                    noResultsTitle="Nenhum edital encontrado com os filtros selecionados."
                    createLabel="Cadastrar edital"
                    onCreate={handleNew}
                    activeCount={activeCount}
                    onReviewSearch={() => setPanelOpen(true)}
                    onClearFilters={handleClearFiltros}
                  />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[1340px] table-fixed">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                            <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Ações
                            </th>
                            <SortableTh
                              className="w-[350px]"
                              sortKey="edital"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Edital
                            </SortableTh>
                            <SortableTh
                              className="w-[270px]"
                              sortKey="orgao"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Órgão responsável
                            </SortableTh>
                            <SortableTh
                              className="w-[130px]"
                              sortKey="esfera"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Esfera
                            </SortableTh>
                            <SortableTh
                              className="w-[220px]"
                              sortKey="periodo"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Período de inscrições
                            </SortableTh>
                            <SortableTh
                              className="w-[140px]"
                              sortKey="valor"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Valor total
                            </SortableTh>
                            <SortableTh
                              className="w-[150px]"
                              sortKey="situacao"
                              activeKey={filtros.sortBy}
                              dir={filtros.sortDir}
                              onSort={toggleSort}
                            >
                              Situação
                            </SortableTh>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                            >
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <RowActionsDropdown
                                  reportEndpoint={`/editais/${item.id}/relatorio`}
                                  reportFilename={`edital-${item.id}.pdf`}
                                  onView={() => openRecord(item, "view")}
                                  onEdit={() => openRecord(item, "edit")}
                                  onDelete={() => setConfirmDelete(item)}
                                />
                              </td>
                              <td className="w-[350px] overflow-hidden px-6 py-2.5">
                                <TableCellText text={item.nomeEdital} bold>
                                  {item.nomeEdital}
                                </TableCellText>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {item.numeroEdital
                                    ? `Edital nº ${item.numeroEdital}`
                                    : "Sem número informado"}
                                  {item.anoEdital ? ` · ${item.anoEdital}` : ""}
                                </p>
                              </td>
                              <td className="w-[270px] overflow-hidden px-6 py-2.5">
                                <TableCellText
                                  text={item.orgaoResponsavel}
                                  muted
                                >
                                  {item.orgaoResponsavel}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                  {item.esferaEdital
                                    ? esferaEditalLabel(item.esferaEdital)
                                    : "—"}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                                {periodoInscricoesEdital(
                                  item.dataAbertura,
                                  item.dataEncerramento,
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-medium tabular-nums text-foreground">
                                {formatValorEdital(item.valorTotalDisponivel)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <StatusPill
                                  status={item.statusEdital}
                                  context="edital"
                                  ariaLabelPrefix="Situação do edital"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-border md:hidden">
                      {paginated.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <RowActionsDropdown
                              reportEndpoint={`/editais/${item.id}/relatorio`}
                              reportFilename={`edital-${item.id}.pdf`}
                              onView={() => openRecord(item, "view")}
                              onEdit={() => openRecord(item, "edit")}
                              onDelete={() => setConfirmDelete(item)}
                            />
                            <StatusPill
                              status={item.statusEdital}
                              context="edital"
                              ariaLabelPrefix="Situação do edital"
                            />
                          </div>
                          <p className="font-medium text-foreground">
                            {item.nomeEdital}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.orgaoResponsavel}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <p className="text-muted-foreground">Esfera</p>
                              <p className="text-foreground">
                                {item.esferaEdital
                                  ? esferaEditalLabel(item.esferaEdital)
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Valor total
                              </p>
                              <p className="font-medium tabular-nums text-foreground">
                                {formatValorEdital(item.valorTotalDisponivel)}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">
                                Período de inscrições
                              </p>
                              <p className="text-foreground">
                                {periodoInscricoesEdital(
                                  item.dataAbertura,
                                  item.dataEncerramento,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <DataTablePagination
                      totalItems={filtered.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      entityLabel="edital"
                      entityLabelPlural="editais"
                      pageSizeLabel="Editais por página"
                    />
                  </>
                )}
              </DataTableCard>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir edital?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.nomeEdital}
              </span>{" "}
              deixará de ser acompanhado pela organização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Editais"
        href="https://www.aurit.com.br/wiki/editais/editais"
      />
    </AppLayout>
  );
}

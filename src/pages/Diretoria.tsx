import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  FileText,
  Landmark,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { notifyImportReviewSaveSuccess } from "@/lib/importReviewQueue";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { EmailInput } from "@/components/EmailInput";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { FormSearchableSelect } from "@/components/FormSearchableSelect";
import { ImportDataButton } from "@/components/ImportDataButton";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { ConvertConfirmDialog } from "@/components/ConvertConfirmDialog";
import { DataTablePagination } from "@/components/DataTablePagination";
import { StatusPill } from "@/components/StatusPill";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getImportConfigForPath } from "@/config/importacoes";
import { maskCEP, maskCPF, maskPhone } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import {
  downloadDeclaracaoCargoDiretoria,
  downloadDiretoriaReport as exportDiretoriaPdf,
} from "@/lib/individualReportDownload";
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
  buildDiretoriaPayload,
  cargoDiretoriaLabel,
  cargosDiretoria,
  createDiretoria,
  createEmptyDiretoria,
  deleteDiretoria,
  formatDateBR,
  generoDiretoriaLabel,
  generosDiretoria,
  getDiretorias,
  getOrganizacoesDiretoria,
  racaCorDiretoriaLabel,
  racasCoresDiretoria,
  statusDiretoriaLabel,
  statusDiretoriaOptions,
  tipoDeficienciaDiretoriaLabel,
  tiposDeficienciaDiretoria,
  updateDiretoria,
  type DiretoriaData,
  type GeneroApi,
  type OrganizacaoDiretoriaOption,
  type RacaCorApi,
  type TipoDeficienciaApi,
} from "@/lib/diretoriaStore";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

type SortKey =
  | "nome"
  | "cargo"
  | "inicioMandato"
  | "fimMandato"
  | "afastamento"
  | "status"
  | "organizacao";
type SortDirection = "asc" | "desc";

const sortByOptions: Array<{ value: SortKey; label: string }> = [
  { value: "nome", label: "Nome do integrante" },
  { value: "cargo", label: "Cargo" },
  { value: "inicioMandato", label: "Início do mandato" },
  { value: "status", label: "Situação" },
];

const sortDirLabels: Record<SortDirection, string> = {
  asc: "A–Z",
  desc: "Z–A",
};
const DEFAULT_SORT_BY: SortKey = "nome";
const DEFAULT_SORT_DIR: SortDirection = "asc";

type FormMode = "create" | "edit" | "view";

const NEXT_STEP_DURATION_MS = 60_000;

interface DiretoriaNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  estado?: string;
  erro?: boolean;
}

const requiredFields: Array<[keyof DiretoriaData, string]> = [
  ["nomeCompleto", "Nome Completo"],
  ["dataNascimento", "Data de Nascimento"],
  ["cpf", "CPF"],
  ["racaCor", "Raça/Cor"],
  ["genero", "Gênero"],
  ["tipoDeficiencia", "Deficiência"],
  ["telefone", "Telefone"],
  ["cargoDiretoria", "Cargo na Diretoria"],
  ["dataInicioMandato", "Data de Início do Mandato"],
  ["dataFimMandato", "Data de Fim do Mandato"],
  ["statusDiretoria", "Status da Diretoria"],
  ["cep", "CEP"],
  ["logradouro", "Logradouro"],
  ["numero", "Número"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
];

const estadosPorUf: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function normalizarChave(value?: string | null) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolverEstadoParaSelect(value?: string | null): string {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  const direto = estadosBrasil.find((estado) => estado === raw);

  if (direto) return direto;

  const rawUpper = raw.toUpperCase();

  if (rawUpper.length === 2) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === rawUpper,
    );

    if (opcaoUf) return opcaoUf;

    const nomeEstado = estadosPorUf[rawUpper];

    if (nomeEstado) {
      const opcaoNome = estadosBrasil.find(
        (estado) => normalizarChave(estado) === normalizarChave(nomeEstado),
      );

      if (opcaoNome) return opcaoNome;
    }
  }

  const ufPorNome = Object.entries(estadosPorUf).find(
    ([, nome]) => normalizarChave(nome) === normalizarChave(raw),
  )?.[0];

  if (ufPorNome) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === ufPorNome,
    );

    if (opcaoUf) return opcaoUf;

    const opcaoNome = estadosBrasil.find(
      (estado) =>
        normalizarChave(estado) === normalizarChave(estadosPorUf[ufPorNome]),
    );

    if (opcaoNome) return opcaoNome;
  }

  const porNomeNormalizado = estadosBrasil.find(
    (estado) => normalizarChave(estado) === normalizarChave(raw),
  );

  return porNomeNormalizado ?? "";
}

function maskRGFlex(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";

  if (digits.length <= 7) {
    if (digits.length <= 1) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 1)}-${digits.slice(1)}`;

    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}.${digits.slice(4)}`;
  }

  if (digits.length <= 8) {
    return digits.replace(/^(\d{2})(\d{3})(\d{0,3})$/, (_, a, b, c) =>
      c ? `${a}.${b}.${c}` : `${a}.${b}`,
    );
  }

  if (digits.length === 9) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)$/, "$1.$2.$3-$4");
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
}

const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function limparNumeros(value: string) {
  return value.replace(/\D/g, "");
}

function isStatusEncerrado(status: string) {
  return status?.toUpperCase() === "ENCERRADO";
}

function isStatusAfastado(status: string) {
  return status?.toUpperCase() === "AFASTADO";
}

function criarProximaAcaoDiretoria(): DiretoriaNextStepCardData {
  return {
    titulo: "Após cadastrar a Diretoria, organize os Documentos Institucionais",
    acaoLabel: "Cadastrar documentos",
    acaoUrl: "/documentos",
    variante: "pendente",
  };
}

export default function Diretoria() {
  const navigate = useNavigate();
  const location = useLocation();
  const [organizacoes, setOrganizacoes] = useState<
    OrganizacaoDiretoriaOption[]
  >([]);
  const [registros, setRegistros] = useState<DiretoriaData[]>([]);
  const [form, setForm] = useState<DiretoriaData>(() => createEmptyDiretoria());
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "diretoria:pesquisa-avancada",
    false,
  );
  const emptyFiltros = {
    nome: "",
    cargo: [] as string[],
    situacao: [] as string[],
    sortBy: DEFAULT_SORT_BY,
    sortDir: DEFAULT_SORT_DIR,
  };
  const [draft, setDraft] = useState(emptyFiltros);
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [convertItem, setConvertItem] = useState<DiretoriaData | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<DiretoriaNextStepCardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const readOnly = mode === "view";
  const bloqueado = readOnly || saving;

  const statusEncerrado = isStatusEncerrado(form.statusDiretoria);
  const statusAfastado = isStatusAfastado(form.statusDiretoria);

  useImportFormFill("diretoria", setForm);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("DIRETORIA");

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

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  useEffect(() => {
    if (loading || showForm) return;

    const params = new URLSearchParams(location.search);
    const editarId = params.get("editar");

    if (!editarId) return;

    const record = registros.find((item) => String(item.id) === editarId);

    if (!record) return;

    if (!podeEditar) {
      toast.error(
        "Você não possui permissão para editar registros da diretoria.",
      );
      navigate("/diretoria", { replace: true });
      return;
    }

    setSelectedId(record.id);
    setForm({
      ...record,
      estado: resolverEstadoParaSelect(record.estado),
    });
    setMode("edit");
    setShowForm(true);
    navigate("/diretoria", { replace: true });
  }, [loading, location.search, navigate, podeEditar, registros, showForm]);

  useEffect(() => {
    if (loadingPermissoes || !podeCriar || showForm) return;

    const seed = (
      location.state as {
        conversionSeed?: {
          origem?: string;
          data?: Partial<DiretoriaData>;
        };
      } | null
    )?.conversionSeed;

    if (!seed?.data) return;

    const organizacaoPadrao =
      seed.data.organizacaoId ||
      (organizacoes.length === 1 ? organizacoes[0].id : "");

    setSelectedId(null);
    setForm({
      ...createEmptyDiretoria(),
      ...seed.data,
      id: "",
      cpf: seed.data.cpf ? maskCPF(seed.data.cpf) : "",
      telefone: seed.data.telefone ? maskPhone(seed.data.telefone) : "",
      cep: seed.data.cep ? maskCEP(seed.data.cep) : "",
      rg: seed.data.rg ? maskRGFlex(seed.data.rg) : "",
      estado: resolverEstadoParaSelect(seed.data.estado),
      organizacaoId: organizacaoPadrao,
    });
    setMode("create");
    setShowForm(true);
    navigate("/diretoria", { replace: true, state: null });
  }, [
    loadingPermissoes,
    location.state,
    navigate,
    organizacoes,
    podeCriar,
    showForm,
  ]);

  async function carregar() {
    try {
      setLoading(true);

      const [diretoriasData, organizacoesData] = await Promise.all([
        getDiretorias(),
        getOrganizacoesDiretoria(),
      ]);

      setRegistros(
        diretoriasData.map((item) => ({
          ...item,
          cpf: item.cpf ? maskCPF(item.cpf) : "",
          telefone: item.telefone ? maskPhone(item.telefone) : "",
          cep: item.cep ? maskCEP(item.cep) : "",
          rg: item.rg ? maskRGFlex(item.rg) : "",
          estado: resolverEstadoParaSelect(item.estado),
        })),
      );

      setOrganizacoes(organizacoesData);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os registros da diretoria.",
      );
    } finally {
      setLoading(false);
    }
  }

  const organizacaoNome = useCallback(
    (organizacaoId?: string) =>
      organizacaoId
        ? (organizacoes.find(
            (entry) => String(entry.id) === String(organizacaoId),
          )?.nome ?? "—")
        : "—",
    [organizacoes],
  );

  const filteredRegistros = useMemo(() => {
    const term = filtros.nome.toLowerCase().trim();

    const result = registros.filter((item) => {
      const organizacao = organizacaoNome(item.organizacaoId);

      const matchesTerm =
        !term ||
        [
          item.nomeCompleto,
          item.cpf,
          item.rg,
          item.telefone,
          item.email,
          racaCorDiretoriaLabel(item.racaCor),
          generoDiretoriaLabel(item.genero),
          tipoDeficienciaDiretoriaLabel(item.tipoDeficiencia),
          cargoDiretoriaLabel(item.cargoDiretoria),
          statusDiretoriaLabel(item.statusDiretoria),
          formatDateBR(item.dataInicioMandato),
          formatDateBR(item.dataFimMandato),
          formatDateBR(item.dataAfastamento),
          organizacao,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesCargo =
        filtros.cargo.length === 0 ||
        filtros.cargo.includes(item.cargoDiretoria);
      const matchesSituacao =
        filtros.situacao.length === 0 ||
        filtros.situacao.includes(item.statusDiretoria);

      return matchesTerm && matchesCargo && matchesSituacao;
    });

    const sortValue = (item: DiretoriaData) => {
      switch (key) {
        case "nome":
          return item.nomeCompleto;
        case "cargo":
          return cargoDiretoriaLabel(item.cargoDiretoria);
        case "inicioMandato":
          return item.dataInicioMandato ?? "";
        case "fimMandato":
          return item.dataFimMandato ?? "";
        case "afastamento":
          return item.dataAfastamento ?? "";
        case "status":
          return statusDiretoriaLabel(item.statusDiretoria);
        case "organizacao":
          return organizacaoNome(item.organizacaoId);
        default:
          return "";
      }
    };

    const key = filtros.sortBy;
    const direction = filtros.sortDir === "asc" ? 1 : -1;
    return [...result].sort(
      (a, b) =>
        String(sortValue(a)).localeCompare(String(sortValue(b)), "pt-BR", {
          numeric: true,
          sensitivity: "base",
        }) * direction,
    );
  }, [filtros, organizacaoNome, registros]);

  const sortConfig = {
    key: filtros.sortBy,
    direction: filtros.sortDir,
  };
  const sortedItems = filteredRegistros;
  const handleSort = (key: SortKey) => {
    const nextDirection =
      filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc";
    const next = {
      ...filtros,
      sortBy: key,
      sortDir: nextDirection as SortDirection,
    };
    setDraft(next);
    setFiltros(next);
  };

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, JSON.stringify(filtros));

  const setDraftField = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearching(true);
    setFiltros({ ...draft });
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleClearFiltros = () => {
    setDraft(emptyFiltros);
    setFiltros(emptyFiltros);
  };

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];
    if (filtros.nome) {
      items.push({
        id: "nome",
        label: "Busca",
        value: filtros.nome,
        onRemove: () => {
          setDraft((current) => ({ ...current, nome: "" }));
          setFiltros((current) => ({ ...current, nome: "" }));
        },
      });
    }
    filtros.cargo.forEach((value) =>
      items.push({
        id: `cargo-${value}`,
        label: "Cargo",
        value: cargoDiretoriaLabel(value),
        onRemove: () => {
          setDraft((current) => ({
            ...current,
            cargo: current.cargo.filter((item) => item !== value),
          }));
          setFiltros((current) => ({
            ...current,
            cargo: current.cargo.filter((item) => item !== value),
          }));
        },
      }),
    );
    filtros.situacao.forEach((value) =>
      items.push({
        id: `situacao-${value}`,
        label: "Situação",
        value: statusDiretoriaLabel(value),
        onRemove: () => {
          setDraft((current) => ({
            ...current,
            situacao: current.situacao.filter((item) => item !== value),
          }));
          setFiltros((current) => ({
            ...current,
            situacao: current.situacao.filter((item) => item !== value),
          }));
        },
      }),
    );
    if (
      filtros.sortBy !== DEFAULT_SORT_BY ||
      filtros.sortDir !== DEFAULT_SORT_DIR
    ) {
      items.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${sortByOptions.find((option) => option.value === filtros.sortBy)?.label ?? filtros.sortBy} · ${sortDirLabels[filtros.sortDir]}`,
        onRemove: () => {
          setDraft((current) => ({
            ...current,
            sortBy: DEFAULT_SORT_BY,
            sortDir: DEFAULT_SORT_DIR,
          }));
          setFiltros((current) => ({
            ...current,
            sortBy: DEFAULT_SORT_BY,
            sortDir: DEFAULT_SORT_DIR,
          }));
        },
      });
    }
    return items;
  }, [filtros]);

  const setField = <K extends keyof DiretoriaData>(
    key: K,
    value: DiretoriaData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openRecord = (record: DiretoriaData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar registros da diretoria.",
      );
      return;
    }

    setSelectedId(record.id);
    setForm({
      ...record,
      estado: resolverEstadoParaSelect(record.estado),
    });
    setMode(nextMode);
    setShowForm(true);
  };

  const duplicateRecord = (record: DiretoriaData) => {
    if (!podeCriar) {
      toast.error(
        "Você não possui permissão para criar registros da diretoria.",
      );
      return;
    }

    setSelectedId(null);
    setForm({
      ...record,
      id: "",
      nomeCompleto: `${record.nomeCompleto} (cópia)`,
      cpf: "",
      rg: "",
      email: "",
      telefone: "",
      estado: resolverEstadoParaSelect(record.estado),
    });
    setMode("create");
    setShowForm(true);
  };

  const handleNew = () => {
    if (!podeCriar) {
      toast.error(
        "Você não possui permissão para criar registros da diretoria.",
      );
      return;
    }

    const novo = createEmptyDiretoria();

    if (organizacoes.length === 1) {
      novo.organizacaoId = organizacoes[0].id;
    }

    setSelectedId(null);
    setForm(novo);
    setMode("create");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setMode("create");
    setSelectedId(null);
    setForm(createEmptyDiretoria());
  };

  const exportColumns = [
    { header: "Nome", key: "nomeCompleto" },
    { header: "CPF", key: "cpf" },
    { header: "Cargo na diretoria", key: "cargoLabel" },
    { header: "Data de início do mandato", key: "dataInicioMandatoLabel" },
    { header: "Data de término do mandato", key: "dataFimMandatoLabel" },
    { header: "Data de afastamento", key: "dataAfastamentoLabel" },
    { header: "Status", key: "statusLabel" },
    { header: "Organização", key: "organizacaoNome" },
  ];

  const getExportData = (): Record<string, unknown>[] =>
    filteredRegistros.map((item) => ({
      ...item,
      cargoLabel: cargoDiretoriaLabel(item.cargoDiretoria),
      dataInicioMandatoLabel: formatDateBR(item.dataInicioMandato),
      dataFimMandatoLabel: formatDateBR(item.dataFimMandato),
      dataAfastamentoLabel: formatDateBR(item.dataAfastamento),
      statusLabel: statusDiretoriaLabel(item.statusDiretoria),
      organizacaoNome: organizacaoNome(item.organizacaoId),
    }));

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para excluir registros da diretoria.",
      );
      setConfirmDeleteId(null);
      return;
    }

    try {
      await deleteDiretoria(Number(confirmDeleteId));

      setRegistros((prev) =>
        prev.filter((item) => item.id !== confirmDeleteId),
      );

      if (selectedId === confirmDeleteId) {
        handleCancel();
      }

      setConfirmDeleteId(null);
      toast.success("Registro da diretoria excluído com sucesso.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o registro da diretoria.",
      );
    }
  };

  async function handleExportPdf(item: DiretoriaData) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportDiretoriaPdf({
      id: item.id,

      nomeCompleto: item.nomeCompleto,
      dataNascimento: item.dataNascimento,

      cpf: item.cpf,
      rg: item.rg,
      telefone: item.telefone,
      email: item.email,

      racaCor: racaCorDiretoriaLabel(item.racaCor),
      genero: generoDiretoriaLabel(item.genero),
      tipoDeficiencia: tipoDeficienciaDiretoriaLabel(item.tipoDeficiencia),

      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,

      cargoDiretoria: cargoDiretoriaLabel(item.cargoDiretoria),
      statusDiretoria: statusDiretoriaLabel(item.statusDiretoria),

      dataInicioMandato: item.dataInicioMandato,
      dataFimMandato: item.dataFimMandato,
      dataAfastamento: item.dataAfastamento,

      organizacao: organizacaoNome(item.organizacaoId),
      observacao: item.observacao,
    });
  }

  const gerarDeclaracaoCargo = async (id: string | number) => {
    try {
      await downloadDeclaracaoCargoDiretoria(id);
      toast.success("Declaração de cargo gerada com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a declaração de cargo.",
      );
    }
  };

  function handleConverterParaColaborador(item: DiretoriaData) {
    const status =
      item.statusDiretoria === "ENCERRADO"
        ? "CONCLUIDO"
        : item.statusDiretoria === "AFASTADO"
          ? "INATIVO"
          : item.statusDiretoria;

    setConvertItem(null);
    navigate("/colaboradores/novo", {
      state: {
        conversionSeed: {
          origem: "Diretoria",
          data: {
            nomeCompleto: item.nomeCompleto,
            dataNascimento: item.dataNascimento,
            cpf: item.cpf,
            rg: item.rg,
            telefone: item.telefone,
            email: item.email,
            racaCor: item.racaCor,
            genero: item.genero,
            tipoDeficiencia: item.tipoDeficiencia,
            cep: item.cep,
            logradouro: item.logradouro,
            numero: item.numero,
            complemento: item.complemento,
            bairro: item.bairro,
            cidade: item.cidade,
            estado: item.estado,
            dataInicioVinculo: item.dataInicioMandato,
            dataFimVinculo: item.dataFimMandato,
            funcaoColaborador: cargoDiretoriaLabel(item.cargoDiretoria),
            descricaoAtuacao: item.observacao,
            status,
            organizacaoId: item.organizacaoId,
          },
        },
      },
    });
    toast.success("Dados carregados. Revise o cadastro e clique em Salvar.");
  }

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || readOnly) return;

    try {
      setCepLoading(true);

      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro ?? "",
        complemento: prev.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: resolverEstadoParaSelect(data.uf ?? data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  const validateForm = () => {
    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? "").trim(),
    );

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return false;
    }

    if (limparNumeros(form.cpf).length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return false;
    }

    if (limparNumeros(form.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    if (
      form.dataInicioMandato &&
      form.dataFimMandato &&
      form.dataFimMandato < form.dataInicioMandato
    ) {
      toast.error(
        "A data fim do mandato não pode ser anterior à data de início.",
      );
      return false;
    }

    if (
      form.dataInicioMandato &&
      form.dataAfastamento &&
      form.dataAfastamento < form.dataInicioMandato
    ) {
      toast.error(
        "A data de afastamento não pode ser anterior à data de início do mandato.",
      );
      return false;
    }

    if (isStatusEncerrado(form.statusDiretoria) && !form.dataFimMandato) {
      toast.error(
        "Informe a data fim do mandato quando o status da diretoria for Encerrado.",
      );
      return false;
    }

    if (isStatusAfastado(form.statusDiretoria) && !form.dataAfastamento) {
      toast.error(
        "Informe a data de afastamento quando o status da diretoria for Afastado.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (readOnly) return;

    if (mode === "create" && !podeCriar) {
      toast.error(
        "Você não possui permissão para criar registros da diretoria.",
      );
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar registros da diretoria.",
      );
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);

      const isCreating = mode === "create";
      const payload = buildDiretoriaPayload(form);

      const saved =
        mode === "edit" && form.id
          ? await updateDiretoria(Number(form.id), payload)
          : await createDiretoria(payload);

      const mapped: DiretoriaData = {
        ...saved,
        cpf: saved.cpf ? maskCPF(saved.cpf) : "",
        telefone: saved.telefone ? maskPhone(saved.telefone) : "",
        cep: saved.cep ? maskCEP(saved.cep) : "",
        rg: saved.rg ? maskRGFlex(saved.rg) : "",
        estado: resolverEstadoParaSelect(saved.estado),
      };

      setRegistros((prev) => {
        if (mode === "edit") {
          return prev.map((item) => (item.id === mapped.id ? mapped : item));
        }

        return [mapped, ...prev];
      });
      notifyImportReviewSaveSuccess("diretoria");

      if (isCreating) {
        emitJourneyNextStep();
      }

      handleCancel();

      toast.success(
        isCreating
          ? "Membro da diretoria cadastrado com sucesso."
          : "Registro da diretoria salvo com sucesso.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o registro da diretoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
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
          title="Diretoria"
          tooltip="Nesta página são cadastrados e acompanhados os integrantes da diretoria da organização, com informações sobre dados pessoais, cargo, período de mandato, situação atual e vínculo institucional. Esses dados ajudam a manter a representação institucional atualizada e podem ser utilizados em documentos, editais, relatórios e prestações de contas."
          objective={
            showForm
              ? undefined
              : "Registre e mantenha atualizadas as informações sobre a composição da diretoria, os cargos exercidos, os períodos de mandato e a situação de cada integrante. Esses dados poderão ser utilizados em documentos, editais, relatórios e prestações de contas."
          }
          actions={
            showForm && mode !== "view" ? (
              <ImportDataButton
                config={getImportConfigForPath("/diretoria")!}
                canFillForm
                variant="glassSecondary"
              />
            ) : !showForm && podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={handleNew}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar diretoria
              </Button>
            ) : undefined
          }
        />

        {showForm && <FormLegend />}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section icon={UserRound} title="Dados pessoais">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="nomeCompleto" required={!readOnly}>
                    Nome Completo
                  </FieldLabel>

                  <Input
                    id="nomeCompleto"
                    value={form.nomeCompleto}
                    onChange={(e) => setField("nomeCompleto", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="dataNascimento" required={!readOnly}>
                    Data de Nascimento
                  </FieldLabel>

                  <Input
                    id="dataNascimento"
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => setField("dataNascimento", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="cpf" required={!readOnly}>
                    CPF
                  </FieldLabel>

                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={(e) => setField("cpf", maskCPF(e.target.value))}
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="rg">RG</FieldLabel>

                  <Input
                    id="rg"
                    value={form.rg}
                    onChange={(e) => setField("rg", maskRGFlex(e.target.value))}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="racaCor" required={!readOnly}>
                    Raça/cor
                  </FieldLabel>

                  <Select
                    value={form.racaCor}
                    onValueChange={(value) => {
                      if (readOnly) return;
                      setField("racaCor", value as RacaCorApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="racaCor">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {racasCoresDiretoria.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="genero" required={!readOnly}>
                    Gênero
                  </FieldLabel>

                  <Select
                    value={form.genero}
                    onValueChange={(value) => {
                      if (readOnly) return;
                      setField("genero", value as GeneroApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="genero">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {generosDiretoria.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoDeficiencia"
                    required={!readOnly}
                    tooltip="Informe se o integrante possui alguma deficiência e, em caso positivo, selecione o tipo correspondente. Se não possuir, selecione Não possui. Caso essa informação não tenha sido fornecida ou não seja conhecida, selecione Não informado."
                  >
                    Deficiência
                  </FieldLabel>

                  <Select
                    value={form.tipoDeficiencia}
                    onValueChange={(value) => {
                      if (readOnly) return;
                      setField("tipoDeficiencia", value as TipoDeficienciaApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="tipoDeficiencia">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {tiposDeficienciaDiretoria.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="telefone" required={!readOnly}>
                    Telefone
                  </FieldLabel>

                  <Input
                    id="telefone"
                    value={form.telefone}
                    onChange={(e) =>
                      setField("telefone", maskPhone(e.target.value))
                    }
                    inputMode="tel"
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>

                  <EmailInput
                    id="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    disabled={bloqueado}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={MapPin} title="Endereço">
              <div className="grid gap-4 sm:grid-cols-6">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cep" required={!readOnly}>
                    CEP
                  </FieldLabel>

                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => {
                      if (readOnly) return;

                      const cepFormatado = maskCEP(e.target.value);
                      setField("cep", cepFormatado);

                      const cepLimpo = cepFormatado.replace(/\D/g, "");

                      if (cepLimpo.length === 8) {
                        void buscarEnderecoPorCep(cepFormatado);
                      }
                    }}
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />

                  {cepLoading && !readOnly && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Buscando endereço...
                    </p>
                  )}
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="logradouro" required={!readOnly}>
                    Logradouro
                  </FieldLabel>

                  <Input
                    id="logradouro"
                    value={form.logradouro}
                    onChange={(e) => setField("logradouro", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="numero" required={!readOnly}>
                    Número
                  </FieldLabel>

                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => setField("numero", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                  <Input
                    id="complemento"
                    value={form.complemento}
                    onChange={(e) => setField("complemento", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="bairro" required={!readOnly}>
                    Bairro
                  </FieldLabel>

                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cidade" required={!readOnly}>
                    Cidade
                  </FieldLabel>

                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="estado" required={!readOnly}>
                    Estado
                  </FieldLabel>

                  <Select
                    value={form.estado}
                    onValueChange={(value) => {
                      if (readOnly) return;
                      setField("estado", value);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="estado">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {estadosBrasil.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section icon={FileText} title="Vínculo institucional">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="organizacaoId"
                    tooltip="Informe a organização à qual o cargo ou função do integrante está vinculado."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={form.organizacaoId}
                    onValueChange={(value) => {
                      if (readOnly) return;
                      setField("organizacaoId", value);
                    }}
                    disabled={bloqueado || organizacoes.length === 0}
                  >
                    <SelectTrigger id="organizacaoId">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {organizacoes.map((organizacao) => (
                        <SelectItem key={organizacao.id} value={organizacao.id}>
                          {organizacao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section icon={Landmark} title="Cargo e mandato">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="cargoDiretoria"
                    required={!readOnly}
                    tooltip="Informe o cargo ou função exercida pelo integrante na diretoria da organização, como Presidente, Conselheiro fiscal, Diretor cultural, Coordenador de projetos ou Secretário."
                  >
                    Cargo na Diretoria
                  </FieldLabel>

                  <FormSearchableSelect
                    id="cargoDiretoria"
                    value={form.cargoDiretoria}
                    options={cargosDiretoria}
                    onChange={(value) => {
                      if (!readOnly) setField("cargoDiretoria", value);
                    }}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar cargo na diretoria..."
                    emptyMessage="Nenhum cargo encontrado."
                    disabled={bloqueado}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataInicioMandato"
                    required={!readOnly}
                    tooltip="Informe a data em que o integrante iniciou o mandato ou passou a exercer o cargo, conforme ata, eleição, nomeação ou documento equivalente."
                  >
                    Data de Início do Mandato
                  </FieldLabel>

                  <Input
                    id="dataInicioMandato"
                    type="date"
                    value={form.dataInicioMandato}
                    onChange={(e) =>
                      setField("dataInicioMandato", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataFimMandato"
                    required={!readOnly}
                    tooltip="Informe a data prevista para o término do mandato ou, caso já tenha sido encerrado, a data em que o integrante deixou o cargo."
                  >
                    Data de Fim do Mandato
                  </FieldLabel>

                  <Input
                    id="dataFimMandato"
                    type="date"
                    value={form.dataFimMandato}
                    onChange={(e) => setField("dataFimMandato", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusDiretoria"
                    required={!readOnly}
                    tooltip="Informe a situação atual do integrante na diretoria. Ativo indica mandato em exercício; Encerrado, mandato finalizado; Afastado, afastamento temporário; e Inativo, vínculo que não está mais em exercício."
                  >
                    Status da Diretoria
                  </FieldLabel>

                  <Select
                    value={form.statusDiretoria}
                    onValueChange={(value) => {
                      if (readOnly) return;

                      setForm((prev) => ({
                        ...prev,
                        statusDiretoria: value,
                        dataAfastamento:
                          value.toUpperCase() === "AFASTADO"
                            ? prev.dataAfastamento
                            : "",
                      }));
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="statusDiretoria">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusDiretoriaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {statusAfastado && (
                  <Field>
                    <FieldLabel
                      htmlFor="dataAfastamento"
                      required={!readOnly}
                      tooltip="Informe a data em que o integrante foi afastado temporariamente do exercício do cargo."
                    >
                      Data de Afastamento
                    </FieldLabel>

                    <Input
                      id="dataAfastamento"
                      type="date"
                      value={form.dataAfastamento}
                      onChange={(e) =>
                        setField("dataAfastamento", e.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>
                )}
              </div>
            </Section>

            <Section icon={FileText} title="Observações">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="observacao"
                    tooltip="Registre informações complementares relevantes sobre o cargo, mandato ou vínculo do integrante, como eleição, posse, afastamento, substituição ou recondução."
                  >
                    Observação
                  </FieldLabel>

                  <Input
                    id="observacao"
                    value={form.observacao}
                    onChange={(e) => setField("observacao", e.target.value)}
                    disabled={bloqueado}
                    readOnly={readOnly}
                  />
                </Field>
              </div>
            </Section>

            {mode !== "view" && (
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
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}

            {mode === "view" && (
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
        ) : (
          <div className="space-y-4">
            <AdvancedSearchPanel
              open={panelOpen}
              onOpenChange={setPanelOpen}
              activeCount={activeFilters.length}
            >
              <form onSubmit={handleSearch} noValidate>
                <SearchFilterGrid>
                  <div>
                    <FieldLabel htmlFor="filtroNome">
                      Nome do integrante
                    </FieldLabel>
                    <Input
                      id="filtroNome"
                      value={draft.nome}
                      onChange={(event) =>
                        setDraftField("nome", event.target.value)
                      }
                      placeholder="Digite o nome do integrante"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroCargo">Cargo</FieldLabel>
                    <FilterMultiSelect
                      id="filtroCargo"
                      options={cargosDiretoria}
                      value={draft.cargo}
                      onChange={(value) => setDraftField("cargo", value)}
                      placeholder="Todos os cargos"
                      searchable
                      searchPlaceholder="Pesquisar cargo"
                      summaryNoun="cargos selecionados"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                    <FilterMultiSelect
                      id="filtroSituacao"
                      options={statusDiretoriaOptions}
                      value={draft.situacao}
                      onChange={(value) => setDraftField("situacao", value)}
                      placeholder="Todas as situações"
                      summaryNoun="situações selecionadas"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                    <Select
                      value={draft.sortBy}
                      onValueChange={(value) =>
                        setDraftField("sortBy", value as SortKey)
                      }
                    >
                      <SelectTrigger
                        id="filtroSortBy"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
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
                        setDraftField("sortDir", value as SortDirection)
                      }
                    >
                      <SelectTrigger
                        id="filtroSortDir"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">{sortDirLabels.asc}</SelectItem>
                        <SelectItem value="desc">
                          {sortDirLabels.desc}
                        </SelectItem>
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
                    <RotateCcw className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                  <Button
                    type="submit"
                    variant="glassPrimary"
                    className="h-9 gap-2 px-5"
                    disabled={searching}
                  >
                    <Search className="h-4 w-4" />
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
                total={filteredRegistros.length}
                reportTo="/relatorios/diretoria"
                documentLayoutsTo="/modelos-documento"
                exportColumns={exportColumns}
                getExportData={getExportData}
                exportFilename="diretoria"
                canExport={podeBaixar}
              />

              {filteredRegistros.length === 0 ? (
                <DataTableEmptyState
                  emptyTitle="Nenhum integrante da diretoria cadastrado."
                  createLabel="Cadastrar integrante da diretoria"
                  onCreate={podeCriar ? handleNew : undefined}
                  activeCount={activeFilters.length}
                  onReviewSearch={() => setPanelOpen(true)}
                  onClearFilters={handleClearFiltros}
                />
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1260px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                          <th
                            className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                            data-no-copy
                          >
                            Ações
                          </th>

                          <SortableTh
                            sortKey="nome"
                            activeKey={sortConfig.key}
                            dir={sortConfig.direction}
                            onSort={handleSort}
                          >
                            Nome
                          </SortableTh>
                          <SortableTh
                            sortKey="cargo"
                            activeKey={sortConfig.key}
                            dir={sortConfig.direction}
                            onSort={handleSort}
                          >
                            Cargo na diretoria
                          </SortableTh>
                          <SortableTh
                            sortKey="inicioMandato"
                            activeKey={sortConfig.key}
                            dir={sortConfig.direction}
                            onSort={handleSort}
                          >
                            Data de início do mandato
                          </SortableTh>
                          <SortableTh
                            sortKey="fimMandato"
                            activeKey={sortConfig.key}
                            dir={sortConfig.direction}
                            onSort={handleSort}
                          >
                            Data de término do mandato
                          </SortableTh>
                          <SortableTh
                            sortKey="status"
                            activeKey={sortConfig.key}
                            dir={sortConfig.direction}
                            onSort={handleSort}
                          >
                            Status
                          </SortableTh>
                        </tr>
                      </thead>

                      <tbody>
                        {paginated.map((item) => {
                          const organizacao = organizacaoNome(
                            item.organizacaoId,
                          );

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                            >
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <RowActionsDropdown
                                  reportEndpoint={
                                    podeGerarPdf
                                      ? `/diretorias/${item.id}/relatorio`
                                      : undefined
                                  }
                                  reportFilename={`diretoria-${item.id}.pdf`}
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
                                  extraItems={[
                                    ...(podeCriar
                                      ? [
                                          {
                                            label: "Duplicar",
                                            icon: Copy,
                                            onClick: () =>
                                              duplicateRecord(item),
                                          },
                                          {
                                            label: "Converter em Colaborador",
                                            icon: UserPlus,
                                            onClick: () => setConvertItem(item),
                                          },
                                        ]
                                      : []),
                                    ...(podeGerarPdf
                                      ? [
                                          {
                                            label: "Gerar declaração de cargo",
                                            icon: FileText,
                                            onClick: () =>
                                              void gerarDeclaracaoCargo(
                                                item.id,
                                              ),
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={item.nomeCompleto || "—"}
                                  bold
                                >
                                  {item.nomeCompleto || "—"}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={cargoDiretoriaLabel(
                                    item.cargoDiretoria,
                                  )}
                                >
                                  {cargoDiretoriaLabel(item.cargoDiretoria)}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={formatDateBR(item.dataInicioMandato)}
                                >
                                  {formatDateBR(item.dataInicioMandato)}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={formatDateBR(item.dataFimMandato)}
                                  muted={!item.dataFimMandato}
                                >
                                  {formatDateBR(item.dataFimMandato)}
                                </TableCellText>
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <StatusPill
                                  status={item.statusDiretoria}
                                  context="diretoria"
                                  ariaLabelPrefix="Status na diretoria"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {paginated.map((item) => {
                      const organizacao = organizacaoNome(item.organizacaoId);

                      return (
                        <div key={item.id} className="p-4">
                          <div className="mb-3 flex items-center gap-1">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/diretorias/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`diretoria-${item.id}.pdf`}
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
                              extraItems={[
                                ...(podeCriar
                                  ? [
                                      {
                                        label: "Duplicar",
                                        icon: Copy,
                                        onClick: () => duplicateRecord(item),
                                      },
                                      {
                                        label: "Converter em Colaborador",
                                        icon: UserPlus,
                                        onClick: () => setConvertItem(item),
                                      },
                                    ]
                                  : []),
                                ...(podeGerarPdf
                                  ? [
                                      {
                                        label: "Gerar declaração de cargo",
                                        icon: FileText,
                                        onClick: () =>
                                          void gerarDeclaracaoCargo(item.id),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>

                          <p className="font-medium text-foreground">
                            {item.nomeCompleto || "—"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {cargoDiretoriaLabel(item.cargoDiretoria)}
                            </span>

                            <StatusPill
                              status={item.statusDiretoria}
                              context="diretoria"
                              ariaLabelPrefix="Status na diretoria"
                            />
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>
                              Início: {formatDateBR(item.dataInicioMandato)}
                            </p>
                            <p>Término: {formatDateBR(item.dataFimMandato)}</p>
                            <p>
                              Afastamento: {formatDateBR(item.dataAfastamento)}
                            </p>
                            <p>Organização: {organizacao}</p>
                          </div>
                        </div>
                      );
                    })}
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
                </>
              )}
            </DataTableCard>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro da diretoria?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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

      <ConvertConfirmDialog
        open={!!convertItem}
        onOpenChange={(open) => !open && setConvertItem(null)}
        sourceLabel="Diretoria"
        targetLabel="Colaborador"
        onConfirm={() => {
          if (convertItem) handleConverterParaColaborador(convertItem);
        }}
      />

      <WikiFloatingButton
        pageTitle="Diretoria"
        href="/wiki/institucional/diretoria"
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
  children: React.ReactNode;
}) {
  const descriptions: Record<string, string> = {
    "Dados pessoais":
      "Informe os dados pessoais, de identificação e contato do integrante da diretoria.",

    Endereço:
      "Informe o endereço principal do integrante da diretoria. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente.",

    "Vínculo institucional":
      "Informe a organização à qual o cargo ou função do integrante está vinculado.",

    "Cargo e mandato":
      "Informe o cargo ou função exercida, o período de mandato e a situação atual do integrante na diretoria.",

    Observações:
      "Registre informações complementares sobre o cargo, mandato ou vínculo do integrante, quando necessário.",
  };

  return (
    <FormSectionCard
      icon={Icon}
      title={title}
      description={descriptions[title]}
    >
      {children}
    </FormSectionCard>
  );
}

function Field({
  children,
  full,
  className = "",
}: {
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className}`}>
      {children}
    </div>
  );
}

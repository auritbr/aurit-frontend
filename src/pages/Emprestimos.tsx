import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  ArrowLeftRight,
  RotateCcw,
  FileText,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
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
import { FieldLabel } from "@/components/FieldLabel";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { GerarTermoEmprestimoButton } from "@/components/GerarTermoEmprestimoItem";
import { DataTablePagination } from "@/components/DataTablePagination";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
import { maskDate } from "@/lib/masks";
import { downloadIndividualReport } from "@/lib/individualReportDownload";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  estadoConservacaoEmprestimoLabel,
  statusEmprestimoOptions,
  statusEmprestimoLabel,
  estadoDevolucaoLabel,
  getEmprestimos,
  deleteEmprestimo,
  tipoDestinatarioLabel,
  type Emprestimo,
} from "@/data/emprestimos";
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
import { toast } from "sonner";

const sortByOptions = [
  { value: "patrimonio", label: "Item / bem" },
  { value: "destinatario", label: "Responsável" },
  { value: "status", label: "Situação" },
  { value: "emprestimo", label: "Data do empréstimo" },
  { value: "previsao", label: "Data prevista de devolução" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

interface EmprestimosFiltros {
  item: string;
  responsavel: string;
  situacao: string[];
  dataEmprestimo: string;
  dataDevolucao: string;
  atraso: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: EmprestimosFiltros = {
  item: "",
  responsavel: "",
  situacao: [],
  dataEmprestimo: "",
  dataDevolucao: "",
  atraso: [],
  sortBy: "patrimonio",
  sortDir: "asc",
};

const atrasoOptions = [
  { value: "SIM", label: "Com atraso" },
  { value: "NAO", label: "Sem atraso" },
] as const;

const sortDirLabels: Record<SortDir, string> = {
  asc: "A–Z / mais antigo",
  desc: "Z–A / mais recente",
};

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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message || json?.error || json?.detail || json?.mensagem || text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

interface PatrimonioApiDTO {
  id: number;
  numeroPatrimonio: string;
  nomePatrimonio: string;
}

interface ColaboradorApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ParticipanteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface IntegranteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ProjetoApiDTO {
  id: number;
  nomeProjeto: string;
}

interface PropostaEditalApiDTO {
  id: number;
  tituloProjeto?: string;
  nomeProposta?: string;
  tituloProposta?: string;
  nomeProjeto?: string;
}

interface AtividadeApiDTO {
  id: number;
  nomeAtividade: string;
}

interface EventoCulturalApiDTO {
  id: number;
  nomeEvento: string;
}

interface LookupItem {
  id: string;
  nome: string;
  extra?: string;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export default function Emprestimos() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Emprestimo[]>([]);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "emprestimos:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<EmprestimosFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<EmprestimosFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const [patrimonios, setPatrimonios] = useState<LookupItem[]>([]);
  const [colaboradores, setColaboradores] = useState<LookupItem[]>([]);
  const [participantes, setParticipantes] = useState<LookupItem[]>([]);
  const [integrantes, setIntegrantes] = useState<LookupItem[]>([]);

  const [projetos, setProjetos] = useState<LookupItem[]>([]);
  const [propostasEdital, setPropostasEdital] = useState<LookupItem[]>([]);
  const [atividades, setAtividades] = useState<LookupItem[]>([]);
  const [eventosCulturais, setEventosCulturais] = useState<LookupItem[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("EMPRESTIMOS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) {
          setLoadingPermissoes(false);
        }
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

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [
        emprestimosData,
        patrimoniosRes,
        colaboradoresRes,
        participantesRes,
        integrantesRes,
        projetosRes,
        propostasEditalRes,
        atividadesRes,
        eventosCulturaisRes,
      ] = await Promise.all([
        getEmprestimos(),
        fetch(`${API_URL}/patrimonios`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/colaboradores`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/participantes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/integrantes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/projetos`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/propostas-editais`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/atividades`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/eventos-culturais`, { headers: getAuthHeaders() }),
      ]);

      if (!patrimoniosRes.ok) {
        throw new Error(await parseError(patrimoniosRes));
      }

      if (!colaboradoresRes.ok) {
        throw new Error(await parseError(colaboradoresRes));
      }

      if (!participantesRes.ok) {
        throw new Error(await parseError(participantesRes));
      }

      if (!integrantesRes.ok) {
        throw new Error(await parseError(integrantesRes));
      }

      if (!projetosRes.ok) {
        throw new Error(await parseError(projetosRes));
      }

      if (!propostasEditalRes.ok) {
        throw new Error(await parseError(propostasEditalRes));
      }

      if (!atividadesRes.ok) {
        throw new Error(await parseError(atividadesRes));
      }

      if (!eventosCulturaisRes.ok) {
        throw new Error(await parseError(eventosCulturaisRes));
      }

      const patrimoniosData: PatrimonioApiDTO[] = await patrimoniosRes.json();

      const colaboradoresData: ColaboradorApiDTO[] =
        await colaboradoresRes.json();

      const participantesData: ParticipanteApiDTO[] =
        await participantesRes.json();

      const integrantesData: IntegranteApiDTO[] = await integrantesRes.json();

      const projetosData: ProjetoApiDTO[] = await projetosRes.json();

      const propostasEditalData: PropostaEditalApiDTO[] =
        await propostasEditalRes.json();

      const atividadesData: AtividadeApiDTO[] = await atividadesRes.json();

      const eventosCulturaisData: EventoCulturalApiDTO[] =
        await eventosCulturaisRes.json();

      setItems(emprestimosData);

      setPatrimonios(
        (patrimoniosData ?? []).map((patrimonio) => ({
          id: String(patrimonio.id),
          nome: patrimonio.nomePatrimonio,
          extra: patrimonio.numeroPatrimonio,
        })),
      );

      setColaboradores(
        (colaboradoresData ?? []).map((colaborador) => ({
          id: String(colaborador.id),
          nome: colaborador.nomeCompleto,
        })),
      );

      setParticipantes(
        (participantesData ?? []).map((participante) => ({
          id: String(participante.id),
          nome: participante.nomeCompleto,
        })),
      );

      setIntegrantes(
        (integrantesData ?? []).map((integrante) => ({
          id: String(integrante.id),
          nome: integrante.nomeCompleto,
        })),
      );

      setProjetos(
        (projetosData ?? []).map((projeto) => ({
          id: String(projeto.id),
          nome: projeto.nomeProjeto,
        })),
      );

      setPropostasEdital(
        (propostasEditalData ?? []).map((proposta) => ({
          id: String(proposta.id),
          nome:
            pickText(
              proposta.tituloProjeto,
              proposta.nomeProposta,
              proposta.tituloProposta,
              proposta.nomeProjeto,
            ) || `Proposta ${proposta.id}`,
        })),
      );

      setAtividades(
        (atividadesData ?? []).map((atividade) => ({
          id: String(atividade.id),
          nome: atividade.nomeAtividade,
        })),
      );

      setEventosCulturais(
        (eventosCulturaisData ?? []).map((evento) => ({
          id: String(evento.id),
          nome: evento.nomeEvento,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os empréstimos.";

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

  const patrimonioLabel = (id: string) => {
    const patrimonio = patrimonios.find((item) => item.id === id);

    return patrimonio ? `${patrimonio.extra} — ${patrimonio.nome}` : "—";
  };

  const destinatarioLabel = (emprestimo: Emprestimo): string => {
    switch (emprestimo.tipoDestinatario) {
      case "COLABORADOR":
        return (
          colaboradores.find((item) => item.id === emprestimo.colaboradorId)
            ?.nome ?? "—"
        );

      case "PARTICIPANTE":
        return (
          participantes.find((item) => item.id === emprestimo.participanteId)
            ?.nome ?? "—"
        );

      case "INTEGRANTE":
        return (
          integrantes.find((item) => item.id === emprestimo.integranteId)
            ?.nome ?? "—"
        );

      case "DESTINATARIO_EXTERNO":
        return emprestimo.destinatarioExterno || "—";

      default:
        return "—";
    }
  };

  const projetoLabel = (id: string) =>
    projetos.find((item) => item.id === id)?.nome ?? "";

  const propostaEditalLabel = (id: string) =>
    propostasEdital.find((item) => item.id === id)?.nome ?? "";

  const atividadeLabel = (id: string) =>
    atividades.find((item) => item.id === id)?.nome ?? "";

  const eventoCulturalLabel = (id: string) =>
    eventosCulturais.find((item) => item.id === id)?.nome ?? "";

  const contextoLabel = (emprestimo: Emprestimo) => {
    const partes = [
      emprestimo.projetoId
        ? `Projeto: ${projetoLabel(emprestimo.projetoId)}`
        : "",

      emprestimo.propostaEditalId
        ? `Proposta: ${propostaEditalLabel(emprestimo.propostaEditalId)}`
        : "",

      emprestimo.atividadeId
        ? `Atividade: ${atividadeLabel(emprestimo.atividadeId)}`
        : "",

      emprestimo.eventoCulturalId
        ? `Evento: ${eventoCulturalLabel(emprestimo.eventoCulturalId)}`
        : "",
    ].filter(Boolean);

    return partes.length > 0 ? partes.join(" • ") : "—";
  };

  const filtered = (() => {
    const termoItem = normalize(filtros.item);
    const termoResponsavel = normalize(filtros.responsavel);

    const result = items.filter((item) => {
      if (
        termoItem &&
        !normalize(patrimonioLabel(item.patrimonioId)).includes(termoItem)
      )
        return false;
      if (
        termoResponsavel &&
        !normalize(destinatarioLabel(item)).includes(termoResponsavel)
      )
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(item.statusEmprestimo)
      )
        return false;
      if (
        filtros.dataEmprestimo &&
        item.dataEmprestimo !== filtros.dataEmprestimo
      )
        return false;
      if (
        filtros.dataDevolucao &&
        item.dataPrevistaDevolucao !== filtros.dataDevolucao
      )
        return false;
      if (filtros.atraso.length) {
        const atraso = item.statusEmprestimo === "ATRASADO" ? "SIM" : "NAO";
        if (!filtros.atraso.includes(atraso)) return false;
      }
      return true;
    });

    const sortValue = (item: Emprestimo) => {
      switch (filtros.sortBy) {
        case "destinatario":
          return destinatarioLabel(item);
        case "status":
          return statusEmprestimoLabel(item.statusEmprestimo);
        case "emprestimo":
          return item.dataEmprestimo;
        case "previsao":
          return item.dataPrevistaDevolucao;
        default:
          return patrimonioLabel(item.patrimonioId);
      }
    };

    return [...result].sort((a, b) => {
      const comparison = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        { sensitivity: "base" },
      );
      return filtros.sortDir === "asc" ? comparison : -comparison;
    });
  })();

  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const applyFiltros = (next: EmprestimosFiltros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
    setSearching(true);
    window.setTimeout(() => setSearching(false), 180);
  };

  const setDraftField = <K extends keyof EmprestimosFiltros>(
    key: K,
    value: EmprestimosFiltros[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));

  const activeFilters: ActiveFilterItem[] = [];
  const textFilters: Array<
    ["item" | "responsavel" | "dataEmprestimo" | "dataDevolucao", string]
  > = [
    ["item", "Item/bem"],
    ["responsavel", "Responsável"],
    ["dataEmprestimo", "Data do empréstimo"],
    ["dataDevolucao", "Data prevista de devolução"],
  ];
  textFilters.forEach(([key, label]) => {
    if (filtros[key].trim())
      activeFilters.push({
        id: key,
        label,
        value: filtros[key],
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
  });
  filtros.situacao.forEach((value) =>
    activeFilters.push({
      id: `situacao-${value}`,
      label: "Situação",
      value: labelOf(statusEmprestimoOptions, value),
      onRemove: () =>
        applyFiltros({
          ...filtros,
          situacao: filtros.situacao.filter((item) => item !== value),
        }),
    }),
  );
  filtros.atraso.forEach((value) =>
    activeFilters.push({
      id: `atraso-${value}`,
      label: "Atraso",
      value: labelOf(atrasoOptions, value),
      onRemove: () =>
        applyFiltros({
          ...filtros,
          atraso: filtros.atraso.filter((item) => item !== value),
        }),
    }),
  );
  if (
    filtros.sortBy !== emptyFiltros.sortBy ||
    filtros.sortDir !== emptyFiltros.sortDir
  )
    activeFilters.push({
      id: "ordenacao",
      label: "Ordenação",
      value: `${labelOf(sortByOptions, filtros.sortBy)} · ${sortDirLabels[filtros.sortDir]}`,
      onRemove: () =>
        applyFiltros({
          ...filtros,
          sortBy: emptyFiltros.sortBy,
          sortDir: emptyFiltros.sortDir,
        }),
    });

  const toggleSort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const exportColumns = [
    { header: "Patrimônio", key: "patrimonioLabel" },
    { header: "Responsável", key: "destinatarioLabel" },
    { header: "Data do empréstimo", key: "dataEmprestimo" },
    { header: "Data prevista de devolução", key: "dataPrevistaDevolucao" },
    { header: "Conservação", key: "conservacaoLabel" },
    { header: "Situação", key: "situacaoLabel" },
    { header: "Estado na devolução", key: "estadoDevolucaoLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      patrimonioLabel: patrimonioLabel(item.patrimonioId),
      destinatarioLabel: destinatarioLabel(item),
      conservacaoLabel: estadoConservacaoEmprestimoLabel(
        item.estadoConservacao,
      ),
      situacaoLabel: statusEmprestimoLabel(item.statusEmprestimo),
      estadoDevolucaoLabel: item.estadoDevolucao
        ? estadoDevolucaoLabel(item.estadoDevolucao)
        : "Não devolvido",
    }));

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir empréstimos.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEmprestimo(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Empréstimo excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o empréstimo.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  const gerarRecibo = async (id: string | number) => {
    try {
      await downloadIndividualReport(
        "/emprestimos/" + id + "/recibo",
        "recibo-emprestimo-" + id + ".pdf",
      );
      toast.success("Recibo de empréstimo gerado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o recibo de empréstimo.",
      );
    }
  };

  const gerarReciboDevolucao = async (id: string | number) => {
    try {
      await downloadIndividualReport(
        "/emprestimos/" + id + "/recibo-devolucao",
        "recibo-devolucao-emprestimo-" + id + ".pdf",
      );
      toast.success("Recibo de devolução gerado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o recibo de devolução.",
      );
    }
  };

  const acoesEmprestimo = (item: Emprestimo) =>
    podeGerarPdf
      ? [
          {
            label: "Gerar recibo",
            icon: FileText,
            onClick: () => void gerarRecibo(item.id),
          },
          ...(item.dataDevolucao
            ? [
                {
                  label: "Gerar recibo de devolução",
                  icon: FileText,
                  onClick: () => void gerarReciboDevolucao(item.id),
                },
              ]
            : []),
        ]
      : undefined;

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
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Empréstimos"
          tooltip="Nesta página são registrados e acompanhados os empréstimos de bens patrimoniais da organização, permitindo identificar quem recebeu o bem, em qual contexto ele será utilizado, o período do empréstimo, sua condição na saída e, quando devolvido, as informações do retorno. Esses registros ajudam a controlar a movimentação dos bens, acompanhar sua conservação e manter o histórico dos empréstimos realizados."
          objective="Registre e acompanhe a movimentação dos bens patrimoniais emprestados, mantendo atualizadas as informações sobre responsabilidade, prazo, utilização, conservação e devolução. Esse controle facilita a identificação de empréstimos em andamento ou pendentes e o acompanhamento do retorno dos bens."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/emprestimos/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" /> Cadastrar empréstimo
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyFiltros(draft);
              }}
              noValidate
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel
                    htmlFor="filtroItem"
                    tooltip="Digite o número ou nome do bem emprestado."
                  >
                    Item / bem
                  </FieldLabel>
                  <Input
                    id="filtroItem"
                    value={draft.item}
                    onChange={(event) =>
                      setDraftField("item", event.target.value)
                    }
                    placeholder="Digite o número ou nome do bem"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroResponsavel"
                    tooltip="Digite o nome do responsável pelo empréstimo."
                  >
                    Responsável
                  </FieldLabel>
                  <Input
                    id="filtroResponsavel"
                    value={draft.responsavel}
                    onChange={(event) =>
                      setDraftField("responsavel", event.target.value)
                    }
                    placeholder="Digite o nome do responsável"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroSituacao"
                    tooltip="Selecione a situação atual do empréstimo."
                  >
                    Situação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusEmprestimoOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataEmprestimo">
                    Data do empréstimo
                  </FieldLabel>
                  <Input
                    id="filtroDataEmprestimo"
                    value={draft.dataEmprestimo}
                    onChange={(event) =>
                      setDraftField(
                        "dataEmprestimo",
                        maskDate(event.target.value),
                      )
                    }
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataDevolucao">
                    Data prevista de devolução
                  </FieldLabel>
                  <Input
                    id="filtroDataDevolucao"
                    value={draft.dataDevolucao}
                    onChange={(event) =>
                      setDraftField(
                        "dataDevolucao",
                        maskDate(event.target.value),
                      )
                    }
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAtraso">Atraso</FieldLabel>
                  <FilterMultiSelect
                    id="filtroAtraso"
                    options={atrasoOptions}
                    value={draft.atraso}
                    onChange={(value) => setDraftField("atraso", value)}
                    placeholder="Todos"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) =>
                      setDraftField("sortBy", value as SortBy)
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
                      setDraftField("sortDir", value as SortDir)
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
                      <SelectItem value="desc">{sortDirLabels.desc}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => applyFiltros(emptyFiltros)}
                >
                  <RotateCcw className="h-4 w-4" /> Limpar filtros
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
            onClearAll={() => applyFiltros(emptyFiltros)}
          />

          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/emprestimos"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="emprestimos"
              canExport={podeGerarPdf}
            />
            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Carregando empréstimos...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum empréstimo cadastrado."
                createLabel="Cadastrar empréstimo"
                onCreate={
                  podeCriar ? () => navigate("/emprestimos/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={() => applyFiltros(emptyFiltros)}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1280px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="patrimonio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Patrimônio
                        </SortableTh>
                        <SortableTh
                          sortKey="destinatario"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Destinatário
                        </SortableTh>
                        <SortableTh
                          sortKey="emprestimo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Empréstimo
                        </SortableTh>
                        <SortableTh
                          sortKey="previsao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Devolução prevista
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Conservação
                        </th>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Estado na devolução
                        </th>
                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                        {podeGerarPdf && (
                          <th className="w-[150px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Termo de empréstimo
                          </th>
                        )}
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
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/emprestimos/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`emprestimo-${item.id}.pdf`}
                              viewTo={`/emprestimos/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/emprestimos/${item.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item.id)
                                  : undefined
                              }
                              extraItems={acoesEmprestimo(item)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText
                              text={patrimonioLabel(item.patrimonioId)}
                              bold
                            >
                              {patrimonioLabel(item.patrimonioId)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={destinatarioLabel(item)}>
                              {destinatarioLabel(item)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={item.dataEmprestimo}>
                              {item.dataEmprestimo}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={item.dataPrevistaDevolucao || "—"}
                              muted={!item.dataPrevistaDevolucao}
                            >
                              {item.dataPrevistaDevolucao || "—"}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.estadoConservacao}
                              ariaLabelPrefix="Estado de conservação"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            {item.statusEmprestimo === "DEVOLVIDO" &&
                            item.estadoDevolucao ? (
                              <StatusPill
                                status={item.estadoDevolucao}
                                ariaLabelPrefix="Estado na devolução"
                              />
                            ) : (
                              <TableCellText text="Não devolvido" muted>
                                Não devolvido
                              </TableCellText>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.statusEmprestimo}
                              context="emprestimo"
                              ariaLabelPrefix="Situação do empréstimo"
                            />
                          </td>
                          {podeGerarPdf && (
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <GerarTermoEmprestimoButton
                                emprestimoId={item.id}
                              />
                            </td>
                          )}
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
                          reportEndpoint={
                            podeGerarPdf
                              ? `/emprestimos/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`emprestimo-${item.id}.pdf`}
                          viewTo={`/emprestimos/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/emprestimos/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                          extraItems={acoesEmprestimo(item)}
                        />
                        {podeGerarPdf && (
                          <GerarTermoEmprestimoButton emprestimoId={item.id} />
                        )}
                      </div>
                      <p className="font-medium text-foreground">
                        {patrimonioLabel(item.patrimonioId)}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Para: {destinatarioLabel(item)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill
                          status={item.estadoConservacao}
                          ariaLabelPrefix="Estado de conservação"
                        />
                        <StatusPill
                          status={item.statusEmprestimo}
                          context="emprestimo"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Empréstimo: {item.dataEmprestimo}</span>
                        <span>
                          Previsão: {item.dataPrevistaDevolucao || "—"}
                        </span>
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
                  entityLabel="registro"
                  entityLabelPlural="registros"
                  pageSizeLabel="Registros por página"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle>
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

      <WikiFloatingButton
        pageTitle="Empréstimos"
        href="https://www.aurit.com.br/wiki/patrimonio/emprestimos"
      />
    </AppLayout>
  );
}

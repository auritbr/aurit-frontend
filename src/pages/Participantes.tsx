import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, RotateCcw, Search, FileText } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { GerarDocumentoButton } from "@/components/GerarDocumentoButton";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
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
import { DataTablePagination } from "@/components/DataTablePagination";
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
import { isPlanoAccessDenied } from "@/lib/access";
import { downloadDeclaracaoParticipacao } from "@/lib/individualReportDownload";
import { maskPhone } from "@/lib/masks";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteParticipante,
  getAtividadesOptions,
  getOrganizacoesParticipante,
  getParticipantes,
  getTurmasOptions,
  statusValueToLabel,
  statusMatriculaValueToLabel,
  nivelTurmaValueToLabel,
  generoOptions,
  racaCorOptions,
  faixaRendaOptions,
  tipoDeficienciasParticipanteValueToLabel,
  tipoNeurodivergenciasValueToLabel,
  type AtividadeOption,
  type OrganizacaoOption,
  type Participante,
  type TurmaOption,
} from "@/data/participantes";
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

type SortBy = "nome" | "status" | "responsavel";
type SortDir = "asc" | "desc";

interface ParticipantesFiltros {
  nome: string;
  responsavel: string;
  telefone: string;
  status: string[];
  atividade: string[];
  turma: string[];
  genero: string[];
  raca: string[];
  renda: string[];
  programaSocial: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: ParticipantesFiltros = {
  nome: "",
  responsavel: "",
  telefone: "",
  status: [],
  atividade: [],
  turma: [],
  genero: [],
  raca: [],
  renda: [],
  programaSocial: "",
  sortBy: "nome",
  sortDir: "asc",
};

const statusOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
];

const sortByOptions: { value: SortBy; label: string }[] = [
  { value: "nome", label: "Nome do participante" },
  { value: "status", label: "Status" },
  { value: "responsavel", label: "Responsável" },
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
) => options.find((option) => option.value === value)?.label || value;

const PARTICIPANTE_NEXT_STEP_KEY = "aurit:participantes:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface ParticipanteNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

export default function Participantes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Participante[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<ParticipanteNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "participantes:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<ParticipantesFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<ParticipantesFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

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

        const data = await getPermissoesUsuarioLogadoPorModulo("PARTICIPANTES");

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
    const raw = sessionStorage.getItem(PARTICIPANTE_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ParticipanteNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PARTICIPANTE_NEXT_STEP_KEY);

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

    void loadAll();
  }, [loadingPermissoes, podeVisualizar]);

  async function loadAll() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [participantesData, atividadesData, turmasData, organizacoesData] =
        await Promise.all([
          getParticipantes(),
          getAtividadesOptions(),
          getTurmasOptions(),
          getOrganizacoesParticipante(),
        ]);

      setItems(participantesData);
      setAtividades(atividadesData);
      setTurmas(turmasData);
      setOrganizacoes(organizacoesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os participantes.";

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

  const atividadeNome = (id?: string) =>
    id ? (atividades.find((a) => a.id === id)?.nomeAtividade ?? id) : "";

  const turmaNome = (id?: string) =>
    id ? (turmas.find((t) => t.id === id)?.nomeTurma ?? id) : "";

  const organizacaoNome = (id?: string) =>
    id ? (organizacoes.find((o) => o.id === id)?.nome ?? "—") : "—";

  const generoLabel = (value?: string | null) =>
    value
      ? (generoOptions.find((item) => item.value === value)?.label ?? value)
      : "—";

  const racaCorLabel = (value?: string | null) =>
    value
      ? (racaCorOptions.find((item) => item.value === value)?.label ?? value)
      : "—";

  const simNaoLabel = (value?: boolean | null) => (value ? "Sim" : "Não");

  const formatVinculos = (vs: Participante["vinculos"]) =>
    vs
      .filter((v) => v.atividadeId)
      .map((v) => {
        const atividade = atividadeNome(v.atividadeId);
        const turma = turmaNome(v.turmaId);
        const statusMatricula = v.statusMatricula
          ? statusMatriculaValueToLabel(v.statusMatricula)
          : "";
        const nivel = v.nivelTurma ? nivelTurmaValueToLabel(v.nivelTurma) : "";

        const base = turma ? `${atividade} (${turma})` : atividade;
        const detalhes = [nivel, statusMatricula].filter(Boolean).join(" - ");

        return detalhes ? `${base} - ${detalhes}` : base;
      })
      .join(", ");

  const atividadeOptions = useMemo(
    () =>
      atividades.map((atividade) => ({
        value: atividade.id,
        label: atividade.nomeAtividade,
      })),
    [atividades],
  );
  const turmaOptions = useMemo(
    () =>
      turmas.map((turma) => ({
        value: turma.id,
        label: turma.nomeTurma,
      })),
    [turmas],
  );

  const setDraftField = <K extends keyof ParticipantesFiltros>(
    key: K,
    value: ParticipantesFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: ParticipantesFiltros) => {
    setDraft(next);
    setFiltros(next);
    setSearching(true);
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const responsavel = normalize(filtros.responsavel);
    const telefone = normalize(filtros.telefone);

    const result = items.filter((participante) => {
      if (nome && !normalize(participante.nomeCompleto).includes(nome))
        return false;
      if (
        responsavel &&
        !normalize(participante.nomeResponsavel ?? "").includes(responsavel)
      )
        return false;
      if (
        telefone &&
        !normalize(
          `${participante.telefone ?? ""} ${participante.telefoneResponsavel ?? ""}`,
        ).includes(telefone)
      )
        return false;
      if (
        filtros.status.length &&
        !filtros.status.includes(participante.status)
      )
        return false;
      if (
        filtros.atividade.length &&
        !participante.vinculos.some((vinculo) =>
          filtros.atividade.includes(vinculo.atividadeId),
        )
      )
        return false;
      if (
        filtros.turma.length &&
        !participante.vinculos.some(
          (vinculo) =>
            !!vinculo.turmaId && filtros.turma.includes(vinculo.turmaId),
        )
      )
        return false;
      if (
        filtros.genero.length &&
        !filtros.genero.includes(participante.genero ?? "")
      )
        return false;
      if (
        filtros.raca.length &&
        !filtros.raca.includes(participante.racaCor ?? "")
      )
        return false;
      if (
        filtros.renda.length &&
        !filtros.renda.includes(participante.faixaRenda ?? "")
      )
        return false;
      if (filtros.programaSocial === "cadunico" && !participante.possuiCadunico)
        return false;
      if (
        filtros.programaSocial === "bolsa" &&
        !participante.possuiBolsaFamilia
      )
        return false;
      if (
        filtros.programaSocial === "nenhum" &&
        (participante.possuiCadunico || participante.possuiBolsaFamilia)
      )
        return false;
      return true;
    });

    const sortValue = (participante: Participante) => {
      if (filtros.sortBy === "status")
        return statusValueToLabel(participante.status);
      if (filtros.sortBy === "responsavel")
        return participante.nomeResponsavel ?? "";
      return participante.nomeCompleto;
    };

    return [...result].sort((a, b) => {
      const compared = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compared : -compared;
    });
  }, [filtros, items]);

  const activeFilters: ActiveFilterItem[] = (() => {
    const result: ActiveFilterItem[] = [];
    const removeText = (key: "nome" | "responsavel" | "telefone") =>
      applyFiltros({ ...filtros, [key]: "" });
    const removeList = (
      key: "status" | "atividade" | "turma" | "genero" | "raca" | "renda",
      value: string,
    ) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((item) => item !== value),
      });

    if (filtros.nome.trim())
      result.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => removeText("nome"),
      });
    if (filtros.responsavel.trim())
      result.push({
        id: "responsavel",
        label: "Responsável",
        value: filtros.responsavel.trim(),
        onRemove: () => removeText("responsavel"),
      });
    if (filtros.telefone.trim())
      result.push({
        id: "telefone",
        label: "Telefone",
        value: filtros.telefone.trim(),
        onRemove: () => removeText("telefone"),
      });

    const addList = (
      key: "status" | "atividade" | "turma" | "genero" | "raca" | "renda",
      label: string,
      options: readonly { value: string; label: string }[],
    ) =>
      filtros[key].forEach((value) =>
        result.push({
          id: `${key}-${value}`,
          label,
          value: labelOf(options, value),
          onRemove: () => removeList(key, value),
        }),
      );

    addList("status", "Status", statusOptions);
    addList("atividade", "Atividade", atividadeOptions);
    addList("turma", "Turma", turmaOptions);
    addList("genero", "Gênero", generoOptions);
    addList("raca", "Raça/cor", racaCorOptions);
    addList("renda", "Faixa de renda", faixaRendaOptions);

    if (filtros.programaSocial)
      result.push({
        id: "programaSocial",
        label: "Programa social",
        value:
          filtros.programaSocial === "cadunico"
            ? "Possui CadÚnico"
            : filtros.programaSocial === "bolsa"
              ? "Possui Bolsa Família"
              : "Sem programa social",
        onRemove: () => applyFiltros({ ...filtros, programaSocial: "" }),
      });

    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      result.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${
          filtros.sortDir === "asc" ? "A–Z" : "Z–A"
        }`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    return result;
  })();

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));

  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir participantes.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteParticipante(Number(confirmDelete));

      setItems((prev) => prev.filter((p) => p.id !== confirmDelete));
      toast.success("Participante excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o participante.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  const gerarDeclaracaoParticipacao = async (id: string | number) => {
    try {
      await downloadDeclaracaoParticipacao(id);
      toast.success("Declaração de participação gerada com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a declaração de participação.",
      );
    }
  };

  const acoesDeclaracao = (id: string | number) =>
    podeGerarPdf
      ? [
          {
            label: "Gerar declaração de participação",
            icon: FileText,
            onClick: () => void gerarDeclaracaoParticipacao(id),
          },
        ]
      : undefined;

  const exportColumns = [
    { header: "Nome do participante", key: "nomeCompleto" },
    { header: "Status", key: "statusLabel" },
    { header: "Telefone", key: "telefone" },
    { header: "Responsável", key: "nomeResponsavel" },
    { header: "Atividades vinculadas", key: "vinculosLabel" },
    { header: "Gênero", key: "generoLabel" },
    { header: "Raça/cor", key: "racaCorLabel" },
    { header: "Faixa de renda", key: "faixaRendaLabel" },
  ];

  const getExportData = () =>
    filtered.map((participante) => ({
      nomeCompleto: participante.nomeCompleto,
      statusLabel: statusValueToLabel(participante.status),
      telefone: participante.telefone ? maskPhone(participante.telefone) : "—",
      nomeResponsavel: participante.nomeResponsavel || "—",
      vinculosLabel: formatVinculos(participante.vinculos) || "—",
      generoLabel: generoLabel(participante.genero),
      racaCorLabel: racaCorLabel(participante.racaCor),
      faixaRendaLabel: labelOf(
        faixaRendaOptions,
        participante.faixaRenda ?? "",
      ),
    }));

  if (loadingPermissoes) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Verificando permissões...
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
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Participantes"
          tooltip="Nesta página são cadastrados e acompanhados os participantes da organização, com informações pessoais, sociais, de acessibilidade, endereço, documentos, responsável legal quando menor de idade e vínculo institucional. A associação com atividades e turmas é opcional e deve ser informada apenas quando o participante fizer parte de uma atividade ou turma específica."
          objective="Cadastre, pesquise e acompanhe as pessoas que participam das atividades, oficinas, cursos, projetos e demais ações desenvolvidas pela organização. Mantenha atualizados seus dados, o responsável legal quando o participante for menor de idade e os vínculos com atividades e turmas, quando houver."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/participantes/novo")}
                className="h-9 gap-2 px-4"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar participante
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
                <div>
                  <FieldLabel htmlFor="filtroNome">
                    Nome do participante
                  </FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroResponsavel">
                    Responsável
                  </FieldLabel>
                  <Input
                    id="filtroResponsavel"
                    value={draft.responsavel}
                    onChange={(event) =>
                      setDraftField("responsavel", event.target.value)
                    }
                    placeholder="Digite o responsável"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTelefone">Telefone</FieldLabel>
                  <Input
                    id="filtroTelefone"
                    value={draft.telefone}
                    onChange={(event) =>
                      setDraftField("telefone", event.target.value)
                    }
                    placeholder="Digite o telefone"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroStatus">Status</FieldLabel>
                  <FilterMultiSelect
                    id="filtroStatus"
                    options={statusOptions}
                    value={draft.status}
                    onChange={(value) => setDraftField("status", value)}
                    placeholder="Todos os status"
                    summaryNoun="status selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAtividade">Atividade</FieldLabel>
                  <FilterMultiSelect
                    id="filtroAtividade"
                    options={atividadeOptions}
                    value={draft.atividade}
                    onChange={(value) => setDraftField("atividade", value)}
                    placeholder="Todas as atividades"
                    searchable
                    searchPlaceholder="Pesquisar atividade"
                    summaryNoun="atividades selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTurma">Turma</FieldLabel>
                  <FilterMultiSelect
                    id="filtroTurma"
                    options={turmaOptions}
                    value={draft.turma}
                    onChange={(value) => setDraftField("turma", value)}
                    placeholder="Todas as turmas"
                    searchable
                    searchPlaceholder="Pesquisar turma"
                    summaryNoun="turmas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroGenero">Gênero</FieldLabel>
                  <FilterMultiSelect
                    id="filtroGenero"
                    options={generoOptions}
                    value={draft.genero}
                    onChange={(value) => setDraftField("genero", value)}
                    placeholder="Todos os gêneros"
                    summaryNoun="gêneros selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroRaca">Raça/cor</FieldLabel>
                  <FilterMultiSelect
                    id="filtroRaca"
                    options={racaCorOptions}
                    value={draft.raca}
                    onChange={(value) => setDraftField("raca", value)}
                    placeholder="Todas as opções"
                    summaryNoun="opções selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroRenda">Faixa de renda</FieldLabel>
                  <FilterMultiSelect
                    id="filtroRenda"
                    options={faixaRendaOptions}
                    value={draft.renda}
                    onChange={(value) => setDraftField("renda", value)}
                    placeholder="Todas as faixas"
                    summaryNoun="faixas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroPrograma">
                    Programa social
                  </FieldLabel>
                  <Select
                    value={draft.programaSocial || "todos"}
                    onValueChange={(value) =>
                      setDraftField(
                        "programaSocial",
                        value === "todos" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id="filtroPrograma"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="cadunico">Possui CadÚnico</SelectItem>
                      <SelectItem value="bolsa">
                        Possui Bolsa Família
                      </SelectItem>
                      <SelectItem value="nenhum">
                        Sem programa social
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="asc">A–Z</SelectItem>
                      <SelectItem value="desc">Z–A</SelectItem>
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
              reportTo="/relatorios/participantes-geral"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="participantes"
              canExport={podeGerarPdf}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum participante cadastrado."
                emptyDescription="Cadastre o primeiro participante para vinculá-lo às atividades e turmas do projeto."
                createLabel={podeCriar ? "Cadastrar participante" : undefined}
                onCreate={
                  podeCriar ? () => navigate("/participantes/novo") : undefined
                }
                activeCount={activeFilters.length}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>

                        <SortableTh
                          sortKey="nome"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome do participante
                        </SortableTh>

                        <SortableTh
                          sortKey="status"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>

                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Telefone
                        </th>

                        <SortableTh
                          sortKey="responsavel"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Responsável
                        </SortableTh>

                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Atividades vinculadas
                        </th>

                        {podeGerarPdf && (
                          <th className="w-[180px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Documento
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {paginated.map((p) => {
                        const vinculos = formatVinculos(p.vinculos);

                        return (
                          <tr
                            key={p.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/participantes/${p.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`participante-${p.id}.pdf`}
                                viewTo={`/participantes/${p.id}`}
                                editTo={
                                  podeEditar
                                    ? `/participantes/${p.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(p.id)
                                    : undefined
                                }
                                extraItems={acoesDeclaracao(p.id)}
                              />
                            </td>

                            <td className="px-6 py-2.5">
                              <TableCellText text={p.nomeCompleto} bold>
                                {p.nomeCompleto}
                              </TableCellText>
                            </td>

                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={statusValueToLabel(p.status)}
                              />
                            </td>

                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {p.telefone ? maskPhone(p.telefone) : "—"}
                            </td>

                            <td className="px-6 py-2.5">
                              {p.nomeResponsavel ? (
                                <TableCellText text={p.nomeResponsavel} muted>
                                  {p.nomeResponsavel}
                                </TableCellText>
                              ) : (
                                <span className="text-[13px] text-muted-foreground/60">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-2.5">
                              {vinculos ? (
                                <TableCellText text={vinculos} muted>
                                  {vinculos}
                                </TableCellText>
                              ) : (
                                <span className="text-[13px] text-muted-foreground/60">
                                  —
                                </span>
                              )}
                            </td>

                            {podeGerarPdf && (
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <GerarDocumentoButton
                                  label="Gerar termo"
                                  compacto
                                  tipoDestinatario="PARTICIPANTE"
                                  destinatarioId={Number(p.id)}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((p) => (
                    <div key={p.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={
                            podeGerarPdf
                              ? `/participantes/${p.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`participante-${p.id}.pdf`}
                          viewTo={`/participantes/${p.id}`}
                          editTo={
                            podeEditar
                              ? `/participantes/${p.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(p.id)
                              : undefined
                          }
                          extraItems={acoesDeclaracao(p.id)}
                        />

                        {podeGerarPdf && (
                          <GerarDocumentoButton
                            label="Gerar termo"
                            compacto
                            tipoDestinatario="PARTICIPANTE"
                            destinatarioId={Number(p.id)}
                          />
                        )}
                      </div>

                      <p className="font-medium text-foreground">
                        {p.nomeCompleto}
                      </p>

                      {p.nomeResponsavel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Resp.: {p.nomeResponsavel}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={statusValueToLabel(p.status)} />

                        <span className="text-xs text-muted-foreground">
                          • {formatVinculos(p.vinculos) || "Sem vínculos"}
                        </span>
                      </div>

                      {p.telefone && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Telefone: {maskPhone(p.telefone)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="participante"
                  entityLabelPlural="participantes"
                  pageSizeLabel="Registros por página"
                  loading={loading}
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
            <AlertDialogTitle>Excluir participante?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o participante esteja
              vinculado a presenças, atividades, turmas ou outros registros, o
              backend pode impedir a exclusão para preservar o histórico.
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
        pageTitle="Participantes"
        href="https://www.aurit.com.br/wiki/pessoas/participantes"
      />
    </AppLayout>
  );
}

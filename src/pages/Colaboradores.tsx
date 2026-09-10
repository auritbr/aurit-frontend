import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Landmark,
  RotateCcw,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { GerarDocumentoButton } from "@/components/GerarDocumentoButton";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
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
import { FieldLabel } from "@/components/FieldLabel";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { ConvertConfirmDialog } from "@/components/ConvertConfirmDialog";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { copyTableFromRef } from "@/lib/copyTableDom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteColaborador,
  getColaboradores,
  statusValueToLabel,
  tipoVinculoValueToLabel,
  type Colaborador,
} from "@/data/colaboradores";
import { getProjetosOptions, type ProjetoOption } from "@/data/atividades";
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
  { value: "nome", label: "Nome" },
  { value: "funcao", label: "Função" },
  { value: "tipoVinculo", label: "Vínculo" },
  { value: "status", label: "Status" },
] as const;
type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";
interface ColaboradoresFiltros {
  nome: string;
  cpf: string;
  funcao: string[];
  vinculo: string[];
  status: string[];
  projeto: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}
const emptyFiltros: ColaboradoresFiltros = {
  nome: "",
  cpf: "",
  funcao: [],
  vinculo: [],
  status: [],
  projeto: [],
  sortBy: "nome",
  sortDir: "asc",
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const onlyDigits = (value: string) => value.replace(/\D/g, "");
const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label || value;

const COLABORADOR_NEXT_STEP_KEY = "aurit:colaboradores:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface ColaboradorNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

export default function Colaboradores() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Colaborador[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [convertItem, setConvertItem] = useState<Colaborador | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<ColaboradorNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "colaboradores:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<ColaboradoresFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<ColaboradoresFiltros>(emptyFiltros);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("COLABORADORES");

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
    const raw = sessionStorage.getItem(COLABORADOR_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ColaboradorNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(COLABORADOR_NEXT_STEP_KEY);

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

    void carregarColaboradores();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarColaboradores() {
    try {
      setLoading(true);

      const [data, projetosData] = await Promise.all([
        getColaboradores(),
        getProjetosOptions().catch(() => []),
      ]);

      setItems(data);
      setProjetos(projetosData);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar colaboradores.",
      );
    } finally {
      setLoading(false);
    }
  }

  const funcaoOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.funcaoColaborador).filter(Boolean)),
      ).map((value) => ({ value, label: value })),
    [items],
  );
  const vinculoOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.tipoVinculo).filter(Boolean)),
      ).map((value) => ({ value, label: tipoVinculoValueToLabel(value) })),
    [items],
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.status).filter(Boolean))).map(
        (value) => ({ value, label: statusValueToLabel(value) }),
      ),
    [items],
  );
  const projetoOptions = useMemo(
    () =>
      Array.from(new Set(items.flatMap((item) => item.projetosIds))).map(
        (value) => ({
          value,
          label:
            projetos.find((projeto) => String(projeto.id) === String(value))
              ?.nome ?? `Projeto ${value}`,
        }),
      ),
    [items, projetos],
  );

  const setDraftField = <K extends keyof ColaboradoresFiltros>(
    key: K,
    value: ColaboradoresFiltros[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const applyFiltros = (next: ColaboradoresFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    window.setTimeout(() => setSearching(false), 180);
  };
  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };
  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const cpf = onlyDigits(filtros.cpf);
    const result = items.filter((item) => {
      if (
        nome &&
        ![item.nomeCompleto, item.email].some((field) =>
          normalize(field ?? "").includes(nome),
        )
      )
        return false;
      if (cpf && !onlyDigits(item.cpf).includes(cpf)) return false;
      if (
        filtros.funcao.length &&
        !filtros.funcao.includes(item.funcaoColaborador)
      )
        return false;
      if (filtros.vinculo.length && !filtros.vinculo.includes(item.tipoVinculo))
        return false;
      if (filtros.status.length && !filtros.status.includes(item.status))
        return false;
      if (
        filtros.projeto.length &&
        !item.projetosIds.some((id) => filtros.projeto.includes(id))
      )
        return false;
      return true;
    });
    const value = (item: Colaborador) =>
      filtros.sortBy === "nome"
        ? item.nomeCompleto
        : filtros.sortBy === "funcao"
          ? item.funcaoColaborador
          : filtros.sortBy === "tipoVinculo"
            ? tipoVinculoValueToLabel(item.tipoVinculo)
            : statusValueToLabel(item.status);
    return [...result].sort((a, b) => {
      const compared = value(a).localeCompare(value(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compared : -compared;
    });
  }, [items, filtros]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.nome.trim())
      list.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    if (filtros.cpf.trim())
      list.push({
        id: "cpf",
        label: "CPF",
        value: filtros.cpf.trim(),
        onRemove: () => applyFiltros({ ...filtros, cpf: "" }),
      });
    const add = (
      key: "funcao" | "vinculo" | "status" | "projeto",
      label: string,
      options: { value: string; label: string }[],
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
    add("funcao", "Função", funcaoOptions);
    add("vinculo", "Vínculo", vinculoOptions);
    add("status", "Status", statusOptions);
    add("projeto", "Projeto", projetoOptions);
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    )
      list.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${filtros.sortDir === "asc" ? "Crescente" : "Decrescente"}`,
        onRemove: () =>
          applyFiltros({ ...filtros, sortBy: "nome", sortDir: "asc" }),
      });
    return list;
  }, [filtros, funcaoOptions, vinculoOptions, statusOptions, projetoOptions]);
  const activeCount = activeFilters.length;
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));
  const toggleSort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  const sortedItems = filtered;
  const sortConfig = {
    key: filtros.sortBy === "tipoVinculo" ? "vinculo" : filtros.sortBy,
    direction: filtros.sortDir,
  };
  const handleSort = (key: string) =>
    toggleSort(key === "vinculo" ? "tipoVinculo" : (key as SortBy));
  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);
    if (!ok || rows === 0) toast.error("Não há dados para copiar.");
    else toast.success("Dados copiados com sucesso.");
  };
  const exportColumns = [
    { header: "Nome", key: "nomeCompleto" },
    { header: "Função", key: "funcaoColaborador" },
    { header: "Vínculo", key: "vinculoLabel" },
    { header: "Status", key: "statusLabel" },
  ];
  const getExportData = () =>
    filtered.map((item) => ({
      nomeCompleto: item.nomeCompleto,
      funcaoColaborador: item.funcaoColaborador,
      vinculoLabel: tipoVinculoValueToLabel(item.tipoVinculo),
      statusLabel: statusValueToLabel(item.status),
    }));

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir colaboradores.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteColaborador(Number(confirmDelete));

      setItems((prev) => prev.filter((c) => c.id !== confirmDelete));
      toast.success("Colaborador excluído com sucesso.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir colaborador.",
      );
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleConverterParaDiretoria = (colaborador: Colaborador) => {
    const statusDiretoria =
      colaborador.status === "CONCLUIDO"
        ? "ENCERRADO"
        : colaborador.status === "INATIVO"
          ? "INATIVO"
          : "ATIVO";

    setConvertItem(null);
    navigate("/diretoria", {
      state: {
        conversionSeed: {
          origem: "Colaboradores",
          data: {
            nomeCompleto: colaborador.nomeCompleto,
            dataNascimento: colaborador.dataNascimento,
            cpf: colaborador.cpf,
            rg: colaborador.rg,
            telefone: colaborador.telefone,
            email: colaborador.email,
            racaCor: colaborador.racaCor,
            genero: colaborador.genero,
            tipoDeficiencia: colaborador.tipoDeficiencia,
            cep: colaborador.cep,
            logradouro: colaborador.logradouro,
            numero: colaborador.numero,
            complemento: colaborador.complemento,
            bairro: colaborador.bairro,
            cidade: colaborador.cidade,
            estado: colaborador.estado,
            cargoDiretoria: "OUTRO",
            dataInicioMandato: colaborador.dataInicioVinculo,
            dataFimMandato: colaborador.dataFimVinculo,
            observacao: [
              colaborador.funcaoColaborador,
              colaborador.descricaoAtuacao,
            ]
              .filter(Boolean)
              .join(" — "),
            statusDiretoria,
            organizacaoId: colaborador.organizacaoId,
          },
        },
      },
    });
    toast.success("Dados carregados. Revise o cadastro e clique em Salvar.");
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
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Colaboradores"
          tooltip="Nesta página são cadastrados e acompanhados os colaboradores da organização, com informações pessoais, endereço, tipo de vínculo, período de atuação, situação atual e função exercida. Esses dados ajudam a manter o cadastro da equipe organizado e atualizado."
          objective="Cadastre as pessoas que atuam na organização, informando seus principais dados, vínculos, períodos de atuação e funções exercidas. Esses registros ajudam a organizar a equipe e acompanhar a participação de cada colaborador em projetos, atividades e demais ações da organização."
          actions={
            podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/colaboradores/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar colaborador
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeCount}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="filtroNome">Nome</FieldLabel>
                  <Input
                    id="filtroNome"
                    value={draft.nome}
                    onChange={(e) => setDraftField("nome", e.target.value)}
                    placeholder="Digite o nome ou e-mail"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroCpf">CPF</FieldLabel>
                  <Input
                    id="filtroCpf"
                    value={draft.cpf}
                    onChange={(e) => setDraftField("cpf", e.target.value)}
                    placeholder="Digite o CPF"
                    inputMode="numeric"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroFuncao">Função</FieldLabel>
                  <FilterMultiSelect
                    id="filtroFuncao"
                    options={funcaoOptions}
                    value={draft.funcao}
                    onChange={(value) => setDraftField("funcao", value)}
                    placeholder="Todas as funções"
                    searchable
                    summaryNoun="funções selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroVinculo">Vínculo</FieldLabel>
                  <FilterMultiSelect
                    id="filtroVinculo"
                    options={vinculoOptions}
                    value={draft.vinculo}
                    onChange={(value) => setDraftField("vinculo", value)}
                    placeholder="Todos os vínculos"
                    summaryNoun="vínculos selecionados"
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
                  <FieldLabel htmlFor="filtroProjeto">
                    Projeto relacionado
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroProjeto"
                    options={projetoOptions}
                    value={draft.projeto}
                    onChange={(value) => setDraftField("projeto", value)}
                    placeholder="Todos os projetos"
                    searchable
                    summaryNoun="projetos selecionados"
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
              reportTo="/relatorios/colaboradores"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="colaboradores"
              canExport={permissoes.BAIXAR}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum colaborador cadastrado."
                emptyDescription="Cadastre o primeiro registro para começar a acompanhar as informações nesta página."
                createLabel="Cadastrar colaborador"
                onCreate={
                  podeCriar ? () => navigate("/colaboradores/novo") : undefined
                }
                activeCount={activeCount}
                onReviewSearch={() => setPanelOpen(true)}
                onClearFilters={handleClearFiltros}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table ref={tableRef} className="w-full min-w-[980px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th
                          className="w-[150px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          data-no-copy
                        >
                          Ações
                        </th>

                        <SortableHeader
                          label="Nome"
                          sortKey="nome"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        />

                        <SortableHeader
                          label="Função"
                          sortKey="funcao"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        />

                        <SortableHeader
                          label="Vínculo"
                          sortKey="vinculo"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        />

                        <SortableHeader
                          label="Status"
                          sortKey="status"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        />

                        {podeGerarPdf && (
                          <th
                            className="w-[200px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                            data-no-copy
                          >
                            Documento
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {paginated.map((c) => {
                        const tipoVinculo = tipoVinculoValueToLabel(
                          c.tipoVinculo,
                        );
                        const status = statusValueToLabel(c.status);

                        return (
                          <tr
                            key={c.id}
                            className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={
                                  podeGerarPdf
                                    ? `/colaboradores/${c.id}/relatorio`
                                    : undefined
                                }
                                reportFilename={`colaborador-${c.id}.pdf`}
                                viewTo={`/colaboradores/${c.id}`}
                                editTo={
                                  podeEditar
                                    ? `/colaboradores/${c.id}/editar`
                                    : undefined
                                }
                                onDelete={
                                  podeExcluir
                                    ? () => setConfirmDelete(c.id)
                                    : undefined
                                }
                                extraItems={
                                  podeCriar
                                    ? [
                                        {
                                          label: "Converter em Diretoria",
                                          icon: Landmark,
                                          onClick: () => setConvertItem(c),
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            </td>

                            <td className="px-6 py-2.5">
                              <TableCellText text={c.nomeCompleto || "—"} bold>
                                {c.nomeCompleto || "—"}
                              </TableCellText>
                            </td>

                            <td className="px-6 py-2.5">
                              <TableCellText
                                text={c.funcaoColaborador || "—"}
                                muted={!c.funcaoColaborador}
                              >
                                {c.funcaoColaborador || "—"}
                              </TableCellText>
                            </td>

                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {tipoVinculo}
                            </td>

                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill status={status} />
                            </td>

                            {podeGerarPdf && (
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <GerarDocumentoButton
                                  label={
                                    tipoVinculo === "Voluntário"
                                      ? "Termo voluntário"
                                      : "Contrato"
                                  }
                                  compacto
                                  tipoDestinatario="COLABORADOR"
                                  destinatarioId={Number(c.id)}
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
                  {paginated.length === 0 ? (
                    <div className="p-10 text-center">
                      <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum colaborador encontrado.
                      </p>
                    </div>
                  ) : (
                    paginated.map((c) => {
                      const tipoVinculo = tipoVinculoValueToLabel(
                        c.tipoVinculo,
                      );
                      const status = statusValueToLabel(c.status);

                      return (
                        <div key={c.id} className="p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeGerarPdf
                                  ? `/colaboradores/${c.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`colaborador-${c.id}.pdf`}
                              viewTo={`/colaboradores/${c.id}`}
                              editTo={
                                podeEditar
                                  ? `/colaboradores/${c.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(c.id)
                                  : undefined
                              }
                              extraItems={
                                podeCriar
                                  ? [
                                      {
                                        label: "Converter em Diretoria",
                                        icon: Landmark,
                                        onClick: () => setConvertItem(c),
                                      },
                                    ]
                                  : undefined
                              }
                            />

                            {podeGerarPdf && (
                              <GerarDocumentoButton
                                label={
                                  tipoVinculo === "Voluntário"
                                    ? "Termo"
                                    : "Contrato"
                                }
                                compacto
                                tipoDestinatario="COLABORADOR"
                                destinatarioId={Number(c.id)}
                              />
                            )}
                          </div>

                          <p className="font-medium text-foreground">
                            {c.nomeCompleto || "—"}
                          </p>

                          <p className="mt-2 text-sm text-foreground">
                            {c.funcaoColaborador || "—"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusPill status={status} />

                            <span className="text-xs text-muted-foreground">
                              • {tipoVinculo}
                            </span>
                          </div>

                          {c.email && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          )}
                        </div>
                      );
                    })
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
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>

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

      <ConvertConfirmDialog
        open={!!convertItem}
        onOpenChange={(open) => !open && setConvertItem(null)}
        sourceLabel="Colaborador"
        targetLabel="Diretoria"
        onConfirm={() => {
          if (convertItem) handleConverterParaDiretoria(convertItem);
        }}
      />

      <WikiFloatingButton
        pageTitle="Colaboradores"
        href="https://www.aurit.com.br/wiki/pessoas/colaboradores"
      />
    </AppLayout>
  );
}

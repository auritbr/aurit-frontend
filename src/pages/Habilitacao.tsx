import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck2,
  FileWarning,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { AppLayout } from "@/components/AppLayout";
import { DataTablePagination } from "@/components/DataTablePagination";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SortableTh } from "@/components/list/SortableTh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  agenteNomeHabilitacao,
  deleteHabilitacao,
  formatDateBr,
  getAgentesOptions,
  getDocumentosDisponiveis,
  getHabilitacoes,
  getPropostasEditalOptions,
  propostaNomeHabilitacao,
  statusHabilitacaoLabel,
  statusHabilitacaoOptions,
  type AgenteOption,
  type DocumentoOption,
  type Habilitacao,
  type PropostaOption,
} from "@/data/habilitacao";
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import type { ExportColumn } from "@/utils/exportUtils";
import { toast } from "sonner";

const sortByOptions = [
  { value: "proposta", label: "Proposta de edital" },
  { value: "responsavel", label: "Responsável" },
  { value: "documentos", label: "Documentos vinculados" },
  { value: "dataEnvio", label: "Data de envio" },
  { value: "situacao", label: "Situação" },
] as const;
type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";
const sortDirLabels: Record<SortDir, string> = { asc: "A–Z", desc: "Z–A" };
const inputClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

interface Filtros {
  busca: string;
  proposta: string[];
  responsavel: string[];
  situacao: string[];
  envioInicio: string;
  envioFim: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  busca: "",
  proposta: [],
  responsavel: [],
  situacao: [],
  envioInicio: "",
  envioFim: "",
  sortBy: "proposta",
  sortDir: "asc",
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
) => options.find((item) => item.value === value)?.label ?? value;

const HABILITACAO_NEXT_STEP_KEY = "aurit:habilitacoes-propostas:next-step-card";
interface NextStepData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function HabilitacaoPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Habilitacao[]>([]);
  const [propostas, setPropostas] = useState<PropostaOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] = useState<NextStepData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "habilitacao:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeExportar = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("HABILITACAO")
      .then((data) => {
        if (active) setPermissoes(data);
      })
      .catch(() => {
        if (active) setPermissoes(permissoesVazias);
      })
      .finally(() => {
        if (active) setLoadingPermissoes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(HABILITACAO_NEXT_STEP_KEY);
    if (!raw) return;
    try {
      setNextStepCard(JSON.parse(raw) as NextStepData);
    } catch {
      setNextStepCard(null);
    }
    sessionStorage.removeItem(HABILITACAO_NEXT_STEP_KEY);
  }, []);

  useEffect(() => {
    if (loadingPermissoes || !podeVisualizar) {
      if (!loadingPermissoes) setLoading(false);
      return;
    }
    void carregarDados();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const [habilitacoesData, propostasData, agentesData, documentosData] =
        await Promise.all([
          getHabilitacoes(),
          getPropostasEditalOptions(),
          getAgentesOptions(),
          getDocumentosDisponiveis(),
        ]);
      setItems(habilitacoesData);
      setPropostas(propostasData);
      setAgentes(agentesData);
      setDocumentos(documentosData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar habilitações documentais.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaOptions = useMemo(
    () => propostas.map((item) => ({ value: item.id, label: item.nome })),
    [propostas],
  );
  const responsavelOptions = useMemo(
    () => agentes.map((item) => ({ value: item.id, label: item.nome })),
    [agentes],
  );
  const situacaoOptions = useMemo(
    () =>
      statusHabilitacaoOptions.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );
  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const propostaNome = (item: Habilitacao) =>
    propostaNomeHabilitacao(
      item.propostaEdital,
      propostas,
      item.nomePropostaEdital,
    );
  const agenteNome = (item: Habilitacao) =>
    agenteNomeHabilitacao(item.agente, agentes, item.nomeAgente);
  const documentosTexto = (item: Habilitacao) => {
    const nomes = item.documentoIds
      .map((id) => documentos.find((doc) => doc.id === id)?.nome)
      .filter(Boolean);
    return nomes.length
      ? `${nomes.length} ${nomes.length === 1 ? "documento" : "documentos"}`
      : "—";
  };
  const documentosExportacao = (item: Habilitacao) => {
    const nomes = item.documentoIds
      .map((id) => documentos.find((doc) => doc.id === id)?.nome?.trim())
      .filter((nome): nome is string => Boolean(nome));
    return nomes.length ? nomes.join(" | ") : "—";
  };

  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
    setSearching(true);
    window.setTimeout(() => setSearching(false), 180);
  };
  const handleSearch = (event?: FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };
  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const busca = normalize(filtros.busca);
    const nomeProposta = (item: Habilitacao) =>
      propostaNomeHabilitacao(
        item.propostaEdital,
        propostas,
        item.nomePropostaEdital,
      );
    const nomeAgente = (item: Habilitacao) =>
      agenteNomeHabilitacao(item.agente, agentes, item.nomeAgente);
    const result = items.filter((item) => {
      if (
        busca &&
        !normalize(`${nomeProposta(item)} ${nomeAgente(item)}`).includes(busca)
      )
        return false;
      if (
        filtros.proposta.length &&
        !filtros.proposta.includes(item.propostaEdital)
      )
        return false;
      if (
        filtros.responsavel.length &&
        !filtros.responsavel.includes(item.agente)
      )
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(item.statusHabilitacao)
      )
        return false;
      if (
        filtros.envioInicio &&
        (!item.dataEnvioDocumentacao ||
          item.dataEnvioDocumentacao < filtros.envioInicio)
      )
        return false;
      if (
        filtros.envioFim &&
        (!item.dataEnvioDocumentacao ||
          item.dataEnvioDocumentacao > filtros.envioFim)
      )
        return false;
      return true;
    });
    const value = (item: Habilitacao) =>
      filtros.sortBy === "responsavel"
        ? nomeAgente(item)
        : filtros.sortBy === "documentos"
          ? item.documentoIds.length
          : filtros.sortBy === "dataEnvio"
            ? item.dataEnvioDocumentacao
            : filtros.sortBy === "situacao"
              ? statusHabilitacaoLabel(item.statusHabilitacao)
              : nomeProposta(item);
    return [...result].sort(
      (a, b) =>
        String(value(a)).localeCompare(String(value(b)), "pt-BR", {
          sensitivity: "base",
        }) * (filtros.sortDir === "asc" ? 1 : -1),
    );
  }, [agentes, filtros, items, propostas]);

  const activeFilters: ActiveFilterItem[] = (() => {
    const list: ActiveFilterItem[] = [];
    const remove = (
      key: "proposta" | "responsavel" | "situacao",
      value: string,
    ) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((item) => item !== value),
      });
    if (filtros.busca.trim())
      list.push({
        id: "busca",
        label: "Pesquisa",
        value: filtros.busca.trim(),
        onRemove: () => applyFiltros({ ...filtros, busca: "" }),
      });
    filtros.proposta.forEach((value) =>
      list.push({
        id: `p-${value}`,
        label: "Proposta",
        value: labelOf(propostaOptions, value),
        onRemove: () => remove("proposta", value),
      }),
    );
    filtros.responsavel.forEach((value) =>
      list.push({
        id: `r-${value}`,
        label: "Responsável",
        value: labelOf(responsavelOptions, value),
        onRemove: () => remove("responsavel", value),
      }),
    );
    filtros.situacao.forEach((value) =>
      list.push({
        id: `s-${value}`,
        label: "Situação",
        value: labelOf(situacaoOptions, value),
        onRemove: () => remove("situacao", value),
      }),
    );
    if (filtros.envioInicio)
      list.push({
        id: "inicio",
        label: "Envio a partir de",
        value: formatDateBr(filtros.envioInicio),
        onRemove: () => applyFiltros({ ...filtros, envioInicio: "" }),
      });
    if (filtros.envioFim)
      list.push({
        id: "fim",
        label: "Envio até",
        value: formatDateBr(filtros.envioFim),
        onRemove: () => applyFiltros({ ...filtros, envioFim: "" }),
      });
    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    ) {
      list.push({
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
    }
    return list;
  })();

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));
  const toggleSort = (key: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });

  const indicadores = useMemo(
    () => ({
      total: items.length,
      enviadas: items.filter((item) => !!item.dataEnvioDocumentacao).length,
      atualizadas: items.filter(
        (item) => item.statusHabilitacao === "ATUALIZADO",
      ).length,
      comPendencia: items.filter((item) =>
        ["VENCIDO", "NECESSITA_REVISAO", "PENDENTE"].includes(
          item.statusHabilitacao,
        ),
      ).length,
    }),
    [items],
  );

  async function handleDelete() {
    if (!confirmDelete || !podeExcluir) return;
    try {
      await deleteHabilitacao(Number(confirmDelete));
      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Habilitação documental excluída com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a habilitação.",
      );
    } finally {
      setConfirmDelete(null);
    }
  }

  const exportColumns: ExportColumn[] = [
    { header: "Proposta", key: "proposta" },
    { header: "Responsável", key: "responsavel" },
    { header: "Documentos", key: "documentos" },
    { header: "Data de envio", key: "envio" },
    { header: "Situação", key: "situacao" },
    { header: "Data de início", key: "inicio" },
    { header: "Observações", key: "observacoes" },
  ];
  const getExportData = () =>
    filtered.map((item) => ({
      proposta: propostaNome(item),
      responsavel: agenteNome(item),
      documentos: documentosExportacao(item),
      inicio: formatDateBr(item.dataInicioHabilitacao),
      envio: formatDateBr(item.dataEnvioDocumentacao),
      situacao: statusHabilitacaoLabel(item.statusHabilitacao),
      observacoes: item.observacoes || "—",
    }));

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDeniedMessage)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Habilitação Documental"
          tooltip="Nesta página são organizados e acompanhados os documentos exigidos para a habilitação do projeto apresentado ao edital. Vincule os documentos já cadastrados no sistema, acompanhe a situação de cada um e registre o andamento da preparação, do envio e da análise da documentação."
          objective="Organize e acompanhe a documentação necessária para a habilitação do projeto apresentado ao edital, identificando pendências antes do envio e mantendo atualizado o andamento do processo até sua análise."
          actions={
            podeCriar ? (
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate("/habilitacoes-propostas/novo")}
              >
                <Plus className="h-4 w-4" />
                Cadastrar habilitação
              </Button>
            ) : undefined
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Habilitações"
            value={indicadores.total}
            icon={FileCheck2}
          />
          <SummaryStatCard
            title="Documentação enviada"
            value={indicadores.enviadas}
            icon={Send}
            variant="info"
          />
          <SummaryStatCard
            title="Documentação atualizada"
            value={indicadores.atualizadas}
            icon={ShieldCheck}
            variant="success"
          />
          <SummaryStatCard
            title="Com pendências"
            value={indicadores.comPendencia}
            icon={FileWarning}
            variant="warning"
          />
        </div>

        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <div>
                  <FieldLabel
                    htmlFor="filtroBusca"
                    tooltip="Pesquise pela proposta de edital ou pela pessoa responsável pelo acompanhamento."
                  >
                    Pesquisa
                  </FieldLabel>
                  <Input
                    id="filtroBusca"
                    value={draft.busca}
                    onChange={(e) => setDraftField("busca", e.target.value)}
                    placeholder="Proposta ou responsável"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroProposta"
                    tooltip="Selecione as propostas de edital cujas habilitações deseja visualizar."
                  >
                    Proposta de edital
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroProposta"
                    options={propostaOptions}
                    value={draft.proposta}
                    onChange={(value) => setDraftField("proposta", value)}
                    placeholder="Todas as propostas"
                    summaryNoun="propostas selecionadas"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroResponsavel"
                    tooltip="Selecione quem acompanha a preparação e o envio da documentação."
                  >
                    Responsável
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroResponsavel"
                    options={responsavelOptions}
                    value={draft.responsavel}
                    onChange={(value) => setDraftField("responsavel", value)}
                    placeholder="Todos os responsáveis"
                    summaryNoun="responsáveis selecionados"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroSituacao"
                    tooltip="Selecione a situação atual calculada para a habilitação documental."
                  >
                    Situação da habilitação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={situacaoOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroEnvioInicio"
                    tooltip="Mostra habilitações cuja documentação foi enviada a partir desta data."
                  >
                    Envio a partir de
                  </FieldLabel>
                  <Input
                    id="filtroEnvioInicio"
                    type="date"
                    value={draft.envioInicio}
                    onChange={(e) =>
                      setDraftField("envioInicio", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroEnvioFim"
                    tooltip="Mostra habilitações cuja documentação foi enviada até esta data."
                  >
                    Envio até
                  </FieldLabel>
                  <Input
                    id="filtroEnvioFim"
                    type="date"
                    value={draft.envioFim}
                    onChange={(e) => setDraftField("envioFim", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroSortBy"
                    tooltip="Escolha o campo utilizado para ordenar a lista de resultados."
                  >
                    Ordenar por
                  </FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(value) =>
                      setDraftField("sortBy", value as SortBy)
                    }
                  >
                    <SelectTrigger id="filtroSortBy" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortByOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel
                    htmlFor="filtroSortDir"
                    tooltip="Escolha a direção da ordenação dos resultados."
                  >
                    Ordem
                  </FieldLabel>
                  <Select
                    value={draft.sortDir}
                    onValueChange={(value) =>
                      setDraftField("sortDir", value as SortDir)
                    }
                  >
                    <SelectTrigger id="filtroSortDir" className={inputClass}>
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
                  onClick={handleClearFiltros}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                  aria-busy={searching}
                >
                  <Search className="h-4 w-4" aria-hidden />{" "}
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
              reportTo="/relatorios/habilitacoes-propostas"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="habilitacao-documental"
              canExport={podeExportar}
            />
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando habilitações...
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma habilitação documental cadastrada."
                emptyDescription="Cadastre a primeira habilitação para vincular os documentos exigidos pelo edital."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45">
                        <th className="w-[120px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="proposta"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Proposta
                        </SortableTh>
                        <SortableTh
                          sortKey="responsavel"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Responsável
                        </SortableTh>
                        <SortableTh
                          sortKey="documentos"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Documentos
                        </SortableTh>
                        <SortableTh
                          sortKey="dataEnvio"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data de envio
                        </SortableTh>
                        <SortableTh
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
                          className="border-b border-border/50 last:border-0 hover:bg-muted/25"
                        >
                          <td className="px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeExportar
                                  ? `/habilitacoes-propostas/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`habilitacao-${item.id}.pdf`}
                              viewTo={`/habilitacoes-propostas/${item.id}`}
                              editTo={
                                podeEditar
                                  ? `/habilitacoes-propostas/${item.id}/editar`
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDelete(item.id)
                                  : undefined
                              }
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={propostaNome(item)} bold>
                              {propostaNome(item)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={agenteNome(item)} muted>
                              {agenteNome(item)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {documentosTexto(item)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBr(item.dataEnvioDocumentacao)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={item.statusHabilitacao}
                              context="habilitacao"
                              ariaLabelPrefix="Situação da habilitação"
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
                          reportEndpoint={
                            podeExportar
                              ? `/habilitacoes-propostas/${item.id}/relatorio`
                              : undefined
                          }
                          reportFilename={`habilitacao-${item.id}.pdf`}
                          viewTo={`/habilitacoes-propostas/${item.id}`}
                          editTo={
                            podeEditar
                              ? `/habilitacoes-propostas/${item.id}/editar`
                              : undefined
                          }
                          onDelete={
                            podeExcluir
                              ? () => setConfirmDelete(item.id)
                              : undefined
                          }
                        />
                        <StatusPill
                          status={item.statusHabilitacao}
                          context="habilitacao"
                          ariaLabelPrefix="Situação da habilitação"
                        />
                      </div>
                      <p className="font-medium text-foreground">
                        {propostaNome(item)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {agenteNome(item)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <p className="text-muted-foreground">Documentos</p>
                          <p>{documentosTexto(item)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Data de envio</p>
                          <p>{formatDateBr(item.dataEnvioDocumentacao)}</p>
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
                  entityLabel="habilitação"
                  entityLabelPlural="habilitações"
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
            <AlertDialogTitle>Excluir habilitação documental?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro será removido. Os documentos permanecem cadastrados no
              módulo Documentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WikiFloatingButton
        pageTitle="Habilitação documental"
        href="https://www.aurit.com.br/wiki/editais/habilitacao-documental"
      />
    </AppLayout>
  );
}

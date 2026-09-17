import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  GraduationCap,
  Images,
  Link2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
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
import { FieldLabel } from "@/components/FieldLabel";
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
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { DataTablePagination } from "@/components/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { isPlanoAccessDenied } from "@/lib/access";
import { nameWithYear } from "@/lib/entityYear";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteEvidenciaExecucao,
  getAtividadesEvidenciaOptions,
  getAtividadesOptions,
  getEvidenciasFotograficas,
  getEventosCulturaisOptions,
  getEventosEvidenciaOptions,
  getProjetosOptions,
  getTurmasEvidenciaOptions,
  getTurmasOptions,
  type ContextoEvidencia,
  type EvidenciaFotografica,
  type OptionItem,
} from "@/data/evidencias";

const tooltip =
  "Nesta página são registradas fotografias e links que comprovam a execução das aulas e dos eventos culturais da organização.";
const objetivo =
  "Registre e organize evidências de aulas e eventos culturais, mantendo cada material conectado ao projeto e ao cadastro correspondente.";
const contextos = [
  { value: "AULA", label: "Aula" },
  { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
] as const;
const sortByOptions = [
  { value: "data", label: "Data" },
  { value: "contexto", label: "Contexto" },
  { value: "projeto", label: "Projeto" },
  { value: "referencia", label: "Referência" },
  { value: "imagens", label: "Quantidade de imagens" },
] as const;
type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";
interface Filtros {
  busca: string;
  contexto: string[];
  projeto: string[];
  atividade: string[];
  turma: string[];
  evento: string[];
  dataInicio: string;
  dataFim: string;
  sortBy: SortBy;
  sortDir: SortDir;
}
const emptyFiltros: Filtros = {
  busca: "",
  contexto: [],
  projeto: [],
  atividade: [],
  turma: [],
  evento: [],
  dataInicio: "",
  dataFim: "",
  sortBy: "data",
  sortDir: "desc",
};
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const dataBR = (v?: string | null) => {
  if (!v) return "";
  const [a, m, d] = v.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : v;
};
const contextoLabel = (v: ContextoEvidencia) =>
  v === "AULA" ? "Aula" : "Evento Cultural";
const countText = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;
const refs = (item: EvidenciaFotografica) =>
  item.contexto === "AULA"
    ? ([
        item.atividade?.nome,
        item.turma?.nome,
        item.planoAula
          ? `${dataBR(item.planoAula.dataInicio)} — ${item.planoAula.nome}`
          : "",
      ].filter(Boolean) as string[])
    : ([item.eventoCultural?.nome, item.eventoCultural?.local].filter(
        Boolean,
      ) as string[]);
const filterOption = (item: OptionItem) => ({
  value: String(item.id),
  label: item.nome,
});

export default function EvidenciasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "evidencias:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);

  useEffect(() => {
    let active = true;
    getPermissoesUsuarioLogadoPorModulo("EVIDENCIAS")
      .then((p) => active && setPermissoes(p))
      .catch(() => active && setPermissoes(permissoesVazias))
      .finally(() => active && setLoadingPermissoes(false));
    return () => {
      active = false;
    };
  }, []);
  const podeVisualizar = permissoes.VISUALIZAR;
  const projetoFiltroId =
    draft.projeto.length === 1 ? Number(draft.projeto[0]) : undefined;
  const atividadeFiltroId =
    draft.atividade.length === 1 ? Number(draft.atividade[0]) : undefined;
  const projetosQ = useQuery({
    queryKey: ["evidencias", "projetos"],
    queryFn: getProjetosOptions,
    enabled: podeVisualizar,
    retry: false,
  });
  const atividadesQ = useQuery({
    queryKey: ["evidencias", "atividades", "filtro", projetoFiltroId],
    queryFn: () =>
      projetoFiltroId
        ? getAtividadesEvidenciaOptions(projetoFiltroId)
        : getAtividadesOptions(),
    enabled: podeVisualizar && panelOpen,
    retry: false,
  });
  const turmasQ = useQuery({
    queryKey: ["evidencias", "turmas", "filtro", atividadeFiltroId],
    queryFn: () =>
      atividadeFiltroId
        ? getTurmasEvidenciaOptions(atividadeFiltroId)
        : getTurmasOptions(),
    enabled: podeVisualizar && panelOpen,
    retry: false,
  });
  const eventosQ = useQuery({
    queryKey: ["evidencias", "eventos", "filtro", projetoFiltroId],
    queryFn: () =>
      projetoFiltroId
        ? getEventosEvidenciaOptions(projetoFiltroId)
        : getEventosCulturaisOptions(),
    enabled: podeVisualizar && panelOpen,
    retry: false,
  });
  const evidenciasQ = useQuery({
    queryKey: ["evidencias", "fotograficas", filtros],
    queryFn: () =>
      getEvidenciasFotograficas({
        contexto:
          filtros.contexto.length === 1
            ? (filtros.contexto[0] as ContextoEvidencia)
            : undefined,
        projetoId:
          filtros.projeto.length === 1 ? Number(filtros.projeto[0]) : undefined,
        atividadeId:
          filtros.atividade.length === 1
            ? Number(filtros.atividade[0])
            : undefined,
        turmaId:
          filtros.turma.length === 1 ? Number(filtros.turma[0]) : undefined,
        eventoCulturalId:
          filtros.evento.length === 1 ? Number(filtros.evento[0]) : undefined,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
      }),
    enabled: podeVisualizar,
    retry: false,
  });
  useEffect(() => {
    const error = evidenciasQ.error ?? projetosQ.error;
    if (!error) return;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar as evidências.";
    if (isPlanoAccessDenied(message)) setAccessDenied(true);
    else toast.error(message);
  }, [evidenciasQ.error, projetosQ.error]);

  const projetos = projetosQ.data ?? [];
  const atividades = atividadesQ.data ?? [];
  const turmas = turmasQ.data ?? [];
  const eventos = eventosQ.data ?? [];
  const contextoOptions = contextos.map((c) => ({ ...c }));
  const projetoOptions = projetos.map(filterOption);
  const atividadeOptions = atividades.map(filterOption);
  const turmaOptions = turmas.map((turma) => ({
    value: String(turma.id),
    label: nameWithYear(
      turma.nome,
      atividades.find((atividade) => atividade.id === turma.atividadeId)?.nome,
    ),
  }));
  const eventoOptions = eventos.map(filterOption);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: value } as Filtros;
      if (key === "projeto") {
        next.atividade = [];
        next.turma = [];
        next.evento = [];
      }
      if (key === "atividade") next.turma = [];
      return next;
    });
  const apply = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
  };
  const filtered = useMemo(() => {
    const search = normalize(filtros.busca);
    const base = (evidenciasQ.data ?? []).filter((item) => {
      if (
        search &&
        !normalize(
          `${contextoLabel(item.contexto)} ${item.projeto?.nome ?? ""} ${refs(item).join(" ")} ${item.descricao ?? ""}`,
        ).includes(search)
      )
        return false;
      if (filtros.contexto.length && !filtros.contexto.includes(item.contexto))
        return false;
      if (
        filtros.projeto.length &&
        !filtros.projeto.includes(String(item.projeto?.id))
      )
        return false;
      if (
        filtros.atividade.length &&
        !filtros.atividade.includes(String(item.atividade?.id))
      )
        return false;
      if (
        filtros.turma.length &&
        !filtros.turma.includes(String(item.turma?.id))
      )
        return false;
      if (
        filtros.evento.length &&
        !filtros.evento.includes(String(item.eventoCultural?.id))
      )
        return false;
      return true;
    });
    const value = (item: EvidenciaFotografica): string | number =>
      filtros.sortBy === "contexto"
        ? contextoLabel(item.contexto)
        : filtros.sortBy === "projeto"
          ? (item.projeto?.nome ?? "")
          : filtros.sortBy === "referencia"
            ? refs(item).join(" ")
            : filtros.sortBy === "imagens"
              ? item.quantidadeImagens
              : (item.dataReferencia ?? "");
    return [...base].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const c =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? c : -c;
    });
  }, [evidenciasQ.data, filtros]);
  const stats = useMemo(
    () => ({
      total: filtered.length,
      imagens: filtered.reduce((s, i) => s + i.quantidadeImagens, 0),
      aulas: new Set(
        filtered
          .filter((i) => i.contexto === "AULA")
          .map((i) => i.planoAula?.id),
      ).size,
      eventos: new Set(
        filtered
          .filter((i) => i.contexto === "EVENTO_CULTURAL")
          .map((i) => i.eventoCultural?.id),
      ).size,
    }),
    [filtered],
  );
  const optionsByKey = {
    contexto: contextoOptions,
    projeto: projetoOptions,
    atividade: atividadeOptions,
    turma: turmaOptions,
    evento: eventoOptions,
  };
  const activeFilters = (() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.busca.trim())
      list.push({
        id: "busca",
        label: "Pesquisa",
        value: filtros.busca.trim(),
        onRemove: () => apply({ ...filtros, busca: "" }),
      });
    (Object.keys(optionsByKey) as Array<keyof typeof optionsByKey>).forEach(
      (key) =>
        filtros[key].forEach((v) =>
          list.push({
            id: `${key}-${v}`,
            label:
              key === "evento"
                ? "Evento cultural"
                : `${key[0].toUpperCase()}${key.slice(1)}`,
            value: optionsByKey[key].find((o) => o.value === v)?.label ?? v,
            onRemove: () =>
              apply({ ...filtros, [key]: filtros[key].filter((x) => x !== v) }),
          }),
        ),
    );
    if (filtros.dataInicio || filtros.dataFim)
      list.push({
        id: "periodo",
        label: "Período",
        value: `${dataBR(filtros.dataInicio) || "início"} até ${dataBR(filtros.dataFim) || "hoje"}`,
        onRemove: () => apply({ ...filtros, dataInicio: "", dataFim: "" }),
      });
    return list;
  })() satisfies ActiveFilterItem[];
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));
  const toggleSort = (key: SortBy) =>
    apply({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  const excluir = useMutation({
    mutationFn: deleteEvidenciaExecucao,
    onSuccess: async () => {
      setConfirmDelete(null);
      toast.success("Evidência excluída com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["evidencias"] });
    },
    onError: (e) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir a evidência.",
      ),
  });
  const exportColumns = [
    { header: "Contexto", key: "contexto" },
    { header: "Projeto", key: "projeto" },
    { header: "Referência", key: "referencia" },
    { header: "Data", key: "data" },
    { header: "Imagens", key: "imagens" },
    { header: "Links", key: "links" },
  ];
  const getExportData = () =>
    filtered.map((i) => ({
      contexto: contextoLabel(i.contexto),
      projeto: i.projeto?.nome ?? "—",
      referencia: refs(i).join(" · "),
      data: dataBR(i.dataReferencia) || "—",
      imagens: i.quantidadeImagens,
      links: i.quantidadeLinks,
    }));
  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";
  if (loadingPermissoes)
    return (
      <AppLayout>
        <div className="container py-12 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      </AppLayout>
    );
  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDenied)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Evidências"
          tooltip={tooltip}
          objective={objetivo}
          actions={
            permissoes.CRIAR ? (
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate("/evidencias/novo")}
              >
                <Plus className="h-4 w-4" />
                Nova evidência
              </Button>
            ) : undefined
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Evidências registradas"
            value={stats.total}
            icon={Camera}
          />
          <SummaryStatCard
            title="Registros fotográficos"
            value={stats.imagens}
            icon={Images}
            variant="info"
          />
          <SummaryStatCard
            title="Aulas com evidências"
            value={stats.aulas}
            icon={GraduationCap}
            variant="success"
          />
          <SummaryStatCard
            title="Eventos com evidências"
            value={stats.eventos}
            icon={MapPin}
            variant="warning"
          />
        </div>
        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply(draft);
              }}
            >
              <SearchFilterGrid>
                <Field id="filtroBusca" label="Pesquisa">
                  <Input
                    id="filtroBusca"
                    value={draft.busca}
                    onChange={(e) => setDraftField("busca", e.target.value)}
                    placeholder="Projeto, atividade, turma, evento ou descrição"
                    className={inputClass}
                  />
                </Field>
                <Multi
                  id="filtroContexto"
                  label="Contexto"
                  options={contextoOptions}
                  value={draft.contexto}
                  onChange={(v) => setDraftField("contexto", v)}
                  placeholder="Todos os contextos"
                />
                <Multi
                  id="filtroProjeto"
                  label="Projeto"
                  options={projetoOptions}
                  value={draft.projeto}
                  onChange={(v) => setDraftField("projeto", v)}
                  placeholder={
                    projetosQ.isLoading
                      ? "Carregando projetos..."
                      : "Todos os projetos"
                  }
                />
                <Multi
                  id="filtroAtividade"
                  label="Atividade"
                  options={atividadeOptions}
                  value={draft.atividade}
                  onChange={(v) => setDraftField("atividade", v)}
                  placeholder={
                    atividadesQ.isLoading
                      ? "Carregando atividades..."
                      : "Todas as atividades"
                  }
                />
                <Multi
                  id="filtroTurma"
                  label="Turma"
                  options={turmaOptions}
                  value={draft.turma}
                  onChange={(v) => setDraftField("turma", v)}
                  placeholder={
                    turmasQ.isLoading
                      ? "Carregando turmas..."
                      : "Todas as turmas"
                  }
                />
                <Multi
                  id="filtroEvento"
                  label="Evento cultural"
                  options={eventoOptions}
                  value={draft.evento}
                  onChange={(v) => setDraftField("evento", v)}
                  placeholder={
                    eventosQ.isLoading
                      ? "Carregando eventos..."
                      : "Todos os eventos"
                  }
                />
                <Field id="filtroDataInicio" label="Período — de">
                  <Input
                    id="filtroDataInicio"
                    type="date"
                    value={draft.dataInicio}
                    onChange={(e) =>
                      setDraftField("dataInicio", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
                <Field id="filtroDataFim" label="Período — até">
                  <Input
                    id="filtroDataFim"
                    type="date"
                    value={draft.dataFim}
                    onChange={(e) => setDraftField("dataFim", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field id="filtroSortBy" label="Ordenar por">
                  <Select
                    value={draft.sortBy}
                    onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
                  >
                    <SelectTrigger id="filtroSortBy" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortByOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="filtroSortDir" label="Ordem">
                  <Select
                    value={draft.sortDir}
                    onValueChange={(v) =>
                      setDraftField("sortDir", v as SortDir)
                    }
                  >
                    <SelectTrigger id="filtroSortDir" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => apply(emptyFiltros)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={evidenciasQ.isFetching}
                >
                  <Search className="h-4 w-4" />
                  {evidenciasQ.isFetching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>
          <ActiveFilters
            items={activeFilters}
            onClearAll={() => apply(emptyFiltros)}
          />
          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/evidencias"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="evidencias-de-execucao"
              canExport={permissoes.BAIXAR || permissoes.GERAR_PDF}
            />
            {evidenciasQ.isLoading ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Carregando evidências...
              </div>
            ) : !filtered.length ? (
              <Empty
                filtered={!!activeFilters.length}
                onCreate={
                  permissoes.CRIAR
                    ? () => navigate("/evidencias/novo")
                    : undefined
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45">
                        <th className="w-[110px] px-5 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                          Ações
                        </th>
                        {(
                          [
                            "contexto",
                            "projeto",
                            "referencia",
                            "data",
                            "imagens",
                          ] as SortBy[]
                        ).map((k) => (
                          <SortableTh
                            key={k}
                            sortKey={k}
                            activeKey={filtros.sortBy}
                            dir={filtros.sortDir}
                            onSort={toggleSort}
                          >
                            {k === "referencia"
                              ? "Referência"
                              : k === "imagens"
                                ? "Imagens"
                                : `${k[0].toUpperCase()}${k.slice(1)}`}
                          </SortableTh>
                        ))}
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                          Links
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((i) => (
                        <DesktopRow
                          key={i.id}
                          item={i}
                          navigate={navigate}
                          edit={permissoes.EDITAR}
                          remove={
                            permissoes.EXCLUIR ? setConfirmDelete : undefined
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {paginated.map((i) => (
                    <MobileRow
                      key={i.id}
                      item={i}
                      navigate={navigate}
                      edit={permissoes.EDITAR}
                      remove={permissoes.EXCLUIR ? setConfirmDelete : undefined}
                    />
                  ))}
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="evidência"
                  entityLabelPlural="evidências"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>
      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evidência?</AlertDialogTitle>
            <AlertDialogDescription>
              As fotografias e os links deste registro serão removidos. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluir.isPending}
              onClick={() =>
                confirmDelete !== null && excluir.mutate(confirmDelete)
              }
            >
              {excluir.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>{" "}
      <WikiFloatingButton
        pageTitle="Evidências"
        href="/wiki/evidencias/evidencias-de-execucao"
      />
    </AppLayout>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </div>
  );
}
function Multi({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <Field id={id} label={label}>
      <FilterMultiSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        summaryNoun="itens selecionados"
        searchable
      />
    </Field>
  );
}
function Badge({ value }: { value: ContextoEvidencia }) {
  const Icon = value === "AULA" ? CalendarDays : MapPin;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[12px] font-medium backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {contextoLabel(value)}
    </span>
  );
}
function DesktopRow({
  item,
  navigate,
  edit,
  remove,
}: {
  item: EvidenciaFotografica;
  navigate: ReturnType<typeof useNavigate>;
  edit: boolean;
  remove?: (id: number) => void;
}) {
  const lines = refs(item);
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/25">
      <td className="px-5 py-2.5">
        <RowActionsDropdown
          reportEndpoint={`/evidencias-execucao/${item.id}/relatorio`}
          reportFilename={`evidencia-${item.id}.pdf`}
          onView={() => navigate(`/evidencias/${item.id}`)}
          onEdit={
            edit ? () => navigate(`/evidencias/${item.id}/editar`) : undefined
          }
          onDelete={remove ? () => remove(item.id) : undefined}
        />
      </td>
      <td className="px-5 py-2.5">
        <Badge value={item.contexto} />
      </td>
      <td className="px-5 py-2.5 text-[13px] text-muted-foreground">
        {item.projeto?.nome ?? "—"}
      </td>
      <td className="px-5 py-2.5">
        <p className="text-[13px] font-medium">{lines[0] ?? "—"}</p>
        {lines.slice(1).map((l) => (
          <p key={l} className="text-[12px] text-muted-foreground">
            {l}
          </p>
        ))}
      </td>
      <td className="px-5 py-2.5 text-[13px] text-muted-foreground">
        {dataBR(item.dataReferencia) || "—"}
      </td>
      <td className="px-5 py-2.5 text-[13px] text-muted-foreground">
        {countText(item.quantidadeImagens, "imagem", "imagens")}
      </td>
      <td className="px-5 py-2.5 text-[13px] text-muted-foreground">
        {countText(item.quantidadeLinks, "link", "links")}
      </td>
    </tr>
  );
}
function MobileRow(props: Parameters<typeof DesktopRow>[0]) {
  const { item, navigate, edit, remove } = props;
  const lines = refs(item);
  return (
    <div className="p-4">
      <div className="mb-3 flex justify-between">
        <RowActionsDropdown
          reportEndpoint={`/evidencias-execucao/${item.id}/relatorio`}
          reportFilename={`evidencia-${item.id}.pdf`}
          onView={() => navigate(`/evidencias/${item.id}`)}
          onEdit={
            edit ? () => navigate(`/evidencias/${item.id}/editar`) : undefined
          }
          onDelete={remove ? () => remove(item.id) : undefined}
        />
        <Badge value={item.contexto} />
      </div>
      <p className="text-sm font-medium">{lines[0] ?? "—"}</p>
      {lines.slice(1).map((l) => (
        <p key={l} className="text-xs text-muted-foreground">
          {l}
        </p>
      ))}
      <p className="mt-2 text-xs text-muted-foreground">
        {item.projeto?.nome ?? "—"} · {dataBR(item.dataReferencia) || "—"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {countText(item.quantidadeImagens, "imagem", "imagens")} ·{" "}
        {countText(item.quantidadeLinks, "link", "links")}
      </p>
    </div>
  );
}
function Empty({
  filtered,
  onCreate,
}: {
  filtered: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border bg-muted/40">
        <Camera className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">
          {filtered
            ? "Nenhum resultado encontrado"
            : "Nenhuma evidência registrada"}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {filtered
            ? "Revise os filtros utilizados ou limpe a pesquisa."
            : "Registre fotografias e links relacionados às aulas e eventos culturais."}
        </p>
      </div>
      {onCreate && (
        <Button
          variant="glassPrimary"
          className="h-9 gap-2 px-4"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          Nova evidência
        </Button>
      )}
    </div>
  );
}
const wiki = [
  {
    title: "Para que serve?",
    content:
      "Reunir fotografias e links que comprovam aulas e eventos culturais.",
  },
  {
    title: "Fotografias",
    content: "Até 10 imagens de 5 MB nos formatos JPEG, JPG, PNG ou WEBP.",
  },
];

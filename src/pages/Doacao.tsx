import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RotateCcw,
  Search,
  HandHeart,
  Clock,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { SortableTh } from "@/components/list/SortableTh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TableCellText } from "@/components/TableCellText";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { StatusPill } from "@/components/StatusPill";
import { DataTablePagination } from "@/components/DataTablePagination";
import { GerarReciboButton } from "@/components/GerarReciboButton";
import { usePagination } from "@/hooks/usePagination";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import {
  getDoacoes,
  deleteDoacao,
  getDoacaoOptions,
  tiposDoacao,
  statusDoacaoOptions,
  tipoDoacaoLabel,
  statusDoacaoLabel,
  doadorNome,
  formatarData,
  valorOuQuantidadeTexto,
  doacaoObjetivo,
  doacaoTooltip,
  type Doacao,
  type Option,
} from "@/data/doacoes";
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
  { value: "doacao", label: "Doação" },
  { value: "tipo", label: "Tipo" },
  { value: "doador", label: "Doador" },
  { value: "data", label: "Data da doação" },
  { value: "situacao", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";
const sortDirLabels: Record<SortDir, string> = { asc: "A–Z", desc: "Z–A" };

interface DoacaoFiltros {
  busca: string;
  tipo: string[];
  situacao: string[];
  doador: string[];
  dataInicio: string;
  dataFim: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: DoacaoFiltros = {
  busca: "",
  tipo: [],
  situacao: [],
  doador: [],
  dataInicio: "",
  dataFim: "",
  sortBy: "data",
  sortDir: "desc",
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
) => options.find((option) => option.value === value)?.label || value;

export default function DoacoesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Doacao[]>([]);
  const [doadores, setDoadores] = useState<Option[]>([]);
  const [projetos, setProjetos] = useState<Option[]>([]);
  const [atividades, setAtividades] = useState<Option[]>([]);
  const [eventos, setEventos] = useState<Option[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "doacoes:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<DoacaoFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<DoacaoFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const tipoOptions = useMemo(
    () => tiposDoacao.map((t) => ({ value: t.value, label: t.label })),
    [],
  );
  const situacaoOptions = useMemo(
    () => statusDoacaoOptions.map((s) => ({ value: s.value, label: s.label })),
    [],
  );
  useEffect(() => {
    let active = true;
    Promise.all([getDoacoes(), getDoacaoOptions()])
      .then(([data, options]) => {
        if (active) {
          setItems(data);
          setDoadores(options.doadores);
          setProjetos(options.projetos);
          setAtividades(options.atividades);
          setEventos(options.eventos);
        }
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar doações.",
        ),
      );
    return () => {
      active = false;
    };
  }, []);
  const doadorFilterOptions = useMemo(
    () => doadores.map((item) => ({ value: item.id, label: item.nome })),
    [doadores],
  );
  const optionName = (options: Option[], value: string) =>
    options.find((item) => item.id === value)?.nome ??
    (value ? `Registro ${value}` : "—");

  const setDraftField = <K extends keyof DoacaoFiltros>(
    key: K,
    value: DoacaoFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: DoacaoFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const busca = normalize(filtros.busca);

    const result = items.filter((d) => {
      if (
        busca &&
        !normalize(
          `${d.nomeDoacao ?? ""} ${d.descricaoDoacao ?? ""} ${tipoDoacaoLabel(d.tipoDoacao)} ${doadorNome(d)}`,
        ).includes(busca)
      )
        return false;
      if (filtros.tipo.length && !filtros.tipo.includes(d.tipoDoacao))
        return false;
      if (filtros.situacao.length && !filtros.situacao.includes(d.statusDoacao))
        return false;
      if (filtros.doador.length && !filtros.doador.includes(d.doador ?? ""))
        return false;
      if (filtros.dataInicio && (d.dataDoacao ?? "") < filtros.dataInicio)
        return false;
      if (filtros.dataFim && (d.dataDoacao ?? "") > filtros.dataFim)
        return false;
      return true;
    });

    const sortValue = (item: Doacao) => {
      switch (filtros.sortBy) {
        case "tipo":
          return tipoDoacaoLabel(item.tipoDoacao);
        case "doador":
          return doadorNome(item);
        case "data":
          return item.dataDoacao ?? "";
        case "situacao":
          return statusDoacaoLabel(item.statusDoacao);
        default:
          return item.nomeDoacao?.trim() || "";
      }
    };

    return [...result].sort((a, b) => {
      const compare = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        { sensitivity: "base" },
      );
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros]);

  const indicadores = useMemo(
    () => ({
      total: items.length,
      pendentes: items.filter((d) => d.statusDoacao === "PENDENTE").length,
      recebidas: items.filter((d) => d.statusDoacao === "RECEBIDA").length,
      canceladas: items.filter((d) => d.statusDoacao === "CANCELADA").length,
    }),
    [items],
  );

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const removeFromList = (
      key: "tipo" | "situacao" | "doador",
      value: string,
    ) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((v) => v !== value),
      });

    if (filtros.busca.trim())
      list.push({
        id: "busca",
        label: "Pesquisa",
        value: filtros.busca.trim(),
        onRemove: () => applyFiltros({ ...filtros, busca: "" }),
      });
    filtros.tipo.forEach((value) =>
      list.push({
        id: `tipo-${value}`,
        label: "Tipo",
        value: labelOf(tipoOptions, value),
        onRemove: () => removeFromList("tipo", value),
      }),
    );
    filtros.situacao.forEach((value) =>
      list.push({
        id: `situacao-${value}`,
        label: "Situação",
        value: labelOf(situacaoOptions, value),
        onRemove: () => removeFromList("situacao", value),
      }),
    );
    filtros.doador.forEach((value) =>
      list.push({
        id: `doador-${value}`,
        label: "Doador",
        value: labelOf(doadorFilterOptions, value),
        onRemove: () => removeFromList("doador", value),
      }),
    );
    if (filtros.dataInicio)
      list.push({
        id: "dataInicio",
        label: "Doações a partir de",
        value: formatarData(filtros.dataInicio),
        onRemove: () => applyFiltros({ ...filtros, dataInicio: "" }),
      });
    if (filtros.dataFim)
      list.push({
        id: "dataFim",
        label: "Doações até",
        value: formatarData(filtros.dataFim),
        onRemove: () => applyFiltros({ ...filtros, dataFim: "" }),
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
  }, [filtros, tipoOptions, situacaoOptions, doadorFilterOptions]);

  const activeCount = activeFilters.length;
  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);

  const toggleSort = (key: SortBy) => {
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoacao(confirmDelete);
      setItems((prev) => prev.filter((d) => d.id !== confirmDelete));
      toast.success("Doação excluída com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir doação.",
      );
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportColumns = [
    { header: "Doação", key: "doacaoLabel" },
    { header: "Doador", key: "doadorLabel" },
    { header: "Tipo", key: "tipoLabel" },
    { header: "Data", key: "dataLabel" },
    { header: "Valor / quantidade", key: "valorLabel" },
    { header: "Situação", key: "situacaoLabel" },
    { header: "Projeto", key: "projetoLabel" },
    { header: "Atividade", key: "atividadeLabel" },
    { header: "Evento cultural", key: "eventoLabel" },
    { header: "Descrição", key: "descricaoLabel" },
    { header: "Observações", key: "observacaoLabel" },
  ];

  const getExportData = () =>
    filtered.map((d) => ({
      doacaoLabel: d.nomeDoacao?.trim() || "(Sem nome)",
      tipoLabel: tipoDoacaoLabel(d.tipoDoacao),
      doadorLabel: doadorNome(d),
      dataLabel: formatarData(d.dataDoacao),
      valorLabel: valorOuQuantidadeTexto(d),
      situacaoLabel: statusDoacaoLabel(d.statusDoacao),
      projetoLabel: optionName(projetos, d.projeto),
      atividadeLabel: optionName(atividades, d.atividade),
      eventoLabel: optionName(eventos, d.eventoCultural),
      descricaoLabel: d.descricaoDoacao?.trim() || "—",
      observacaoLabel: d.observacao?.trim() || "—",
    }));

  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Doações"
          tooltip={doacaoTooltip}
          objective={doacaoObjetivo}
          actions={
            <>
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/doacoes/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar doação
              </Button>
            </>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de doações"
            value={indicadores.total}
            icon={HandHeart}
          />
          <SummaryStatCard
            title="Pendentes"
            value={indicadores.pendentes}
            icon={Clock}
            variant="warning"
          />
          <SummaryStatCard
            title="Recebidas"
            value={indicadores.recebidas}
            icon={CheckCircle2}
            variant="success"
          />
          <SummaryStatCard
            title="Canceladas"
            value={indicadores.canceladas}
            icon={Ban}
            variant="neutral"
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
                  <FieldLabel htmlFor="filtroBusca">Pesquisa</FieldLabel>
                  <Input
                    id="filtroBusca"
                    value={draft.busca}
                    onChange={(e) => setDraftField("busca", e.target.value)}
                    placeholder="Nome da doação, tipo ou doador"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroTipo">Tipo</FieldLabel>
                  <FilterMultiSelect
                    id="filtroTipo"
                    options={tipoOptions}
                    value={draft.tipo}
                    onChange={(v) => setDraftField("tipo", v)}
                    placeholder="Todos os tipos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={situacaoOptions}
                    value={draft.situacao}
                    onChange={(v) => setDraftField("situacao", v)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDoador">Doador</FieldLabel>
                  <FilterMultiSelect
                    id="filtroDoador"
                    options={doadorFilterOptions}
                    value={draft.doador}
                    onChange={(v) => setDraftField("doador", v)}
                    placeholder="Todos os doadores"
                    summaryNoun="doadores selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataInicio">
                    Doações a partir de
                  </FieldLabel>
                  <Input
                    id="filtroDataInicio"
                    type="date"
                    value={draft.dataInicio}
                    onChange={(e) =>
                      setDraftField("dataInicio", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroDataFim">Doações até</FieldLabel>
                  <Input
                    id="filtroDataFim"
                    type="date"
                    value={draft.dataFim}
                    onChange={(e) => setDraftField("dataFim", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
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
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortDir">Ordem</FieldLabel>
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
                  <Search className="h-4 w-4" aria-hidden />
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
              reportTo="/relatorios/doacoes-recebidas"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="doacoes"
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma doação cadastrada ainda."
                emptyDescription="Cadastre as contribuições financeiras, materiais, serviços, equipamentos, alimentos ou outros apoios recebidos pela organização."
                activeCount={activeCount}
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
                          sortKey="doacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Doação
                        </SortableTh>
                        <SortableTh
                          sortKey="doador"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Doador
                        </SortableTh>
                        <SortableTh
                          sortKey="tipo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Tipo
                        </SortableTh>
                        <SortableTh
                          sortKey="data"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Data
                        </SortableTh>
                        <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Valor / quantidade
                        </th>
                        <SortableTh
                          sortKey="situacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Situação
                        </SortableTh>
                        <th className="w-[150px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Recibo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((d) => {
                        const nome = d.nomeDoacao?.trim() || "(Sem nome)";
                        return (
                          <tr
                            key={d.id}
                            className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                reportEndpoint={`/doacoes/${d.id}/relatorio`}
                                reportFilename={`doacao-${d.id}.pdf`}
                                viewTo={`/doacoes/${d.id}`}
                                editTo={`/doacoes/${d.id}/editar`}
                                onDelete={() => setConfirmDelete(d.id)}
                              />
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={nome} bold>
                                {nome}
                              </TableCellText>
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText text={doadorNome(d)} muted>
                                {doadorNome(d)}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={d.tipoDoacao}
                                ariaLabelPrefix="Tipo de doação"
                              />
                            </td>

                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {formatarData(d.dataDoacao)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {valorOuQuantidadeTexto(d)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill status={d.statusDoacao} tooltip />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <GerarReciboButton
                                endpoint={`/doacoes/${d.id}/recibo`}
                                filename={`recibo-doacao-${d.id}.pdf`}
                                successMessage="Recibo de doação gerado com sucesso."
                                errorMessage="Não foi possível gerar o recibo de doação."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((d) => (
                    <div key={d.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={`/doacoes/${d.id}/relatorio`}
                          reportFilename={`doacao-${d.id}.pdf`}
                          viewTo={`/doacoes/${d.id}`}
                          editTo={`/doacoes/${d.id}/editar`}
                          onDelete={() => setConfirmDelete(d.id)}
                        />
                        <div className="flex items-center gap-2">
                          <GerarReciboButton
                            endpoint={`/doacoes/${d.id}/recibo`}
                            filename={`recibo-doacao-${d.id}.pdf`}
                            label="Recibo"
                            successMessage="Recibo de doação gerado com sucesso."
                            errorMessage="Não foi possível gerar o recibo de doação."
                          />
                          <StatusPill status={d.statusDoacao} />
                        </div>
                      </div>
                      <p className="font-medium text-foreground">
                        {d.nomeDoacao?.trim() || "(Sem nome)"}
                      </p>
                      <div className="mt-1">
                        <StatusPill
                          status={d.tipoDoacao}
                          ariaLabelPrefix="Tipo de doação"
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <p className="text-muted-foreground">Doador</p>
                          <p className="text-foreground">{doadorNome(d)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Data</p>
                          <p className="text-foreground">
                            {formatarData(d.dataDoacao)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Valor / quantidade
                          </p>
                          <p className="text-foreground">
                            {valorOuQuantidadeTexto(d)}
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
                  entityLabel="doação"
                  entityLabelPlural="doações"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir doação?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro da doação será removido desta lista. Esta ação não pode
              ser desfeita.
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

      <WikiFloatingButton pageTitle="Doações" href="/wiki/financeiro/doacoes" />
    </AppLayout>
  );
}

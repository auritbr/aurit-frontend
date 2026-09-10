import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  Plus,
  RotateCcw,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { DataTablePagination } from "@/components/DataTablePagination";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SortableTh } from "@/components/list/SortableTh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { usePagination } from "@/hooks/usePagination";
import {
  deleteFornecedor,
  fornecedorObjetivo,
  fornecedorTooltip,
  getFornecedores,
  nomeFornecedor,
  situacaoFornecedorLabel,
  situacaoFornecedorOptions,
  tipoFornecedorLabel,
  tipoFornecedorOptions,
  tipoPessoaFornecedor,
  tipoPessoaLabel,
  tipoPessoaOptions,
  type Fornecedor,
} from "@/data/fornecedores";

interface Filtros {
  busca: string;
  tipoPessoa: string[];
  tipoFornecedor: string[];
  situacao: string[];
  sortBy: "fornecedor" | "tipo" | "situacao";
  sortDir: "asc" | "desc";
}
const initial: Filtros = {
  busca: "",
  tipoPessoa: [],
  tipoFornecedor: [],
  situacao: [],
  sortBy: "fornecedor",
  sortDir: "asc",
};
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function FornecedoresPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [open, setOpen] = useSessionBoolean(
    "fornecedores:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState(initial);
  const [filtros, setFiltros] = useState(initial);
  const carregar = async () => {
    try {
      setLoading(true);
      setItems(await getFornecedores());
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao carregar fornecedores.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void carregar();
  }, []);
  const aplicar = (next: Filtros) => {
    setDraft(next);
    setFiltros(next);
    setCurrentPage(1);
  };
  const filtered = useMemo(() => {
    const busca = normalize(filtros.busca);
    const list = items.filter(
      (f) =>
        (!busca ||
          normalize(
            `${nomeFornecedor(f)} ${tipoFornecedorLabel(f.tipoFornecedor)} ${f.telefone} ${f.email}`,
          ).includes(busca)) &&
        (!filtros.tipoPessoa.length ||
          filtros.tipoPessoa.includes(tipoPessoaFornecedor(f))) &&
        (!filtros.tipoFornecedor.length ||
          filtros.tipoFornecedor.includes(f.tipoFornecedor)) &&
        (!filtros.situacao.length || filtros.situacao.includes(f.status)),
    );
    const value = (f: Fornecedor) =>
      filtros.sortBy === "tipo"
        ? tipoFornecedorLabel(f.tipoFornecedor)
        : filtros.sortBy === "situacao"
          ? situacaoFornecedorLabel(f.status)
          : nomeFornecedor(f);
    return [...list].sort(
      (a, b) =>
        value(a).localeCompare(value(b), "pt-BR") *
        (filtros.sortDir === "asc" ? 1 : -1),
    );
  }, [items, filtros]);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, JSON.stringify(filtros));
  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.busca)
      list.push({
        id: "busca",
        label: "Pesquisa",
        value: filtros.busca,
        onRemove: () => aplicar({ ...filtros, busca: "" }),
      });
    const add = (
      key: "tipoPessoa" | "tipoFornecedor" | "situacao",
      label: string,
      options: readonly { value: string; label: string }[],
    ) =>
      filtros[key].forEach((v) =>
        list.push({
          id: `${key}-${v}`,
          label,
          value: options.find((o) => o.value === v)?.label ?? v,
          onRemove: () =>
            aplicar({ ...filtros, [key]: filtros[key].filter((x) => x !== v) }),
        }),
      );
    add("tipoPessoa", "Tipo de pessoa", tipoPessoaOptions);
    add("tipoFornecedor", "Tipo de fornecimento", tipoFornecedorOptions);
    add("situacao", "Situação", situacaoFornecedorOptions);
    return list;
  }, [filtros]);
  const stats = {
    total: items.length,
    ativos: items.filter((f) => f.status === "ATIVO").length,
    fisicas: items.filter((f) => tipoPessoaFornecedor(f) === "PESSOA_FISICA")
      .length,
    juridicas: items.filter(
      (f) => tipoPessoaFornecedor(f) === "PESSOA_JURIDICA",
    ).length,
  };
  const toggleSort = (key: Filtros["sortBy"]) =>
    aplicar({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  const excluir = async () => {
    if (!confirmDelete) return;
    try {
      await deleteFornecedor(confirmDelete);
      toast.success("Fornecedor excluído com sucesso.");
      await carregar();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao excluir fornecedor.",
      );
    } finally {
      setConfirmDelete(null);
    }
  };
  const exportColumns = [
    { header: "Fornecedor", key: "fornecedor" },
    { header: "Tipo de pessoa", key: "pessoa" },
    { header: "Tipo de fornecimento", key: "tipo" },
    { header: "Telefone", key: "telefone" },
    { header: "E-mail", key: "email" },
    { header: "Situação", key: "situacao" },
  ];
  const exportData = () =>
    filtered.map((f) => ({
      fornecedor: nomeFornecedor(f),
      pessoa: tipoPessoaLabel(tipoPessoaFornecedor(f)),
      tipo: tipoFornecedorLabel(f.tipoFornecedor),
      telefone: f.telefone || "—",
      email: f.email || "—",
      situacao: situacaoFornecedorLabel(f.status),
    }));
  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Fornecedores"
          tooltip={fornecedorTooltip}
          objective={fornecedorObjetivo}
          actions={
            <Button
              variant="glassPrimary"
              className="h-9 gap-2 px-4"
              onClick={() => navigate("/fornecedores/novo")}
            >
              <Plus className="h-4 w-4" />
              Cadastrar fornecedor
            </Button>
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de fornecedores"
            value={stats.total}
            icon={Truck}
          />
          <SummaryStatCard
            title="Fornecedores ativos"
            value={stats.ativos}
            icon={BadgeCheck}
            variant="success"
          />
          <SummaryStatCard
            title="Pessoas físicas"
            value={stats.fisicas}
            icon={UserRound}
            variant="info"
          />
          <SummaryStatCard
            title="Pessoas jurídicas"
            value={stats.juridicas}
            icon={Building2}
            variant="neutral"
          />
        </div>
        <div className="space-y-4">
          <AdvancedSearchPanel
            open={open}
            onOpenChange={setOpen}
            activeCount={activeFilters.length}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                aplicar(draft);
              }}
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="busca">Pesquisa</FieldLabel>
                  <Input
                    id="busca"
                    className={inputClass}
                    value={draft.busca}
                    onChange={(e) =>
                      setDraft({ ...draft, busca: e.target.value })
                    }
                    placeholder="Fornecedor ou tipo"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="tipoPessoa">Tipo de pessoa</FieldLabel>
                  <FilterMultiSelect
                    id="tipoPessoa"
                    options={[...tipoPessoaOptions]}
                    value={draft.tipoPessoa}
                    onChange={(v) => setDraft({ ...draft, tipoPessoa: v })}
                    placeholder="Todos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="tipoFornecedor">
                    Tipo de fornecimento
                  </FieldLabel>
                  <FilterMultiSelect
                    id="tipoFornecedor"
                    options={tipoFornecedorOptions}
                    value={draft.tipoFornecedor}
                    onChange={(v) => setDraft({ ...draft, tipoFornecedor: v })}
                    placeholder="Todos"
                    summaryNoun="tipos selecionados"
                    searchable
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="situacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="situacao"
                    options={[...situacaoFornecedorOptions]}
                    value={draft.situacao}
                    onChange={(v) => setDraft({ ...draft, situacao: v })}
                    placeholder="Todas"
                    summaryNoun="situações selecionadas"
                  />
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => aplicar(initial)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                >
                  <Search className="h-4 w-4" />
                  Pesquisar
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>
          <ActiveFilters
            items={activeFilters}
            onClearAll={() => aplicar(initial)}
          />
          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios/fornecedores-pagamentos"
              exportColumns={exportColumns}
              getExportData={exportData}
              exportFilename="fornecedores"
            />
            {loading ? (
              <DataTableEmptyState
                emptyTitle="Carregando fornecedores..."
                emptyDescription="Aguarde enquanto os dados são consultados."
                activeCount={0}
              />
            ) : !filtered.length ? (
              <DataTableEmptyState
                emptyTitle="Nenhum fornecedor encontrado."
                emptyDescription="Cadastre uma pessoa ou empresa fornecedora."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45">
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="fornecedor"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Fornecedor
                        </SortableTh>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Pessoa
                        </th>
                        <SortableTh
                          sortKey="tipo"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Fornecimento
                        </SortableTh>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Telefone
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          E-mail
                        </th>
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
                      {paginated.map((f) => (
                        <tr
                          key={f.id}
                          className="border-b border-border/50 hover:bg-muted/25"
                        >
                          <td className="px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/fornecedores/${f.id}/relatorio`}
                              reportFilename={`fornecedor-${f.id}.pdf`}
                              viewTo={`/fornecedores/${f.id}`}
                              editTo={`/fornecedores/${f.id}/editar`}
                              onDelete={() => setConfirmDelete(f.id)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={nomeFornecedor(f)} bold>
                              {nomeFornecedor(f)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {tipoPessoaLabel(tipoPessoaFornecedor(f))}
                          </td>
                          <td className="px-6 py-2.5">
                            <StatusPill
                              status={f.tipoFornecedor || "OUTRO"}
                              ariaLabelPrefix="Tipo de fornecimento"
                            />
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {f.telefone || "—"}
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {f.email || "—"}
                          </td>
                          <td className="px-6 py-2.5">
                            <StatusPill status={f.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="fornecedor"
                  entityLabelPlural="fornecedores"
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
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              O vínculo será removido, mas a pessoa continuará cadastrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void excluir()}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WikiFloatingButton
        pageTitle="Fornecedores"
        href="/wiki/financeiro/fornecedores"
      />
    </AppLayout>
  );
}

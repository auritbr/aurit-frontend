import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Handshake,
  Plus,
  RotateCcw,
  Search,
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
  deleteParceiro,
  formatDateBr,
  getParceiros,
  nomeParceiro,
  parceiroObjetivo,
  parceiroTooltip,
  situacaoParceiroOptions,
  tipoParceriaLabel,
  tipoParceriaOptions,
  tipoPessoaLabel,
  tipoPessoaOptions,
  tipoPessoaParceiro,
  type Parceiro,
} from "@/data/parceiros";

interface Filtros {
  busca: string;
  tipos: string[];
  pessoas: string[];
  situacoes: string[];
}
const initial: Filtros = { busca: "", tipos: [], pessoas: [], situacoes: [] };
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function ParceirosPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [open, setOpen] = useSessionBoolean(
    "parceiros:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState(initial);
  const [filtros, setFiltros] = useState(initial);
  const carregar = async () => {
    try {
      setLoading(true);
      setItems(await getParceiros());
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao carregar parceiros.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void carregar();
  }, []);
  const aplicar = (f: Filtros) => {
    setDraft(f);
    setFiltros(f);
    setCurrentPage(1);
  };
  const filtered = useMemo(
    () =>
      items.filter(
        (p) =>
          (!filtros.busca ||
            normalize(
              `${nomeParceiro(p)} ${p.descricaoParceria} ${p.telefone} ${p.email}`,
            ).includes(normalize(filtros.busca))) &&
          (!filtros.tipos.length ||
            p.tipoParcerias.some((t) => filtros.tipos.includes(t))) &&
          (!filtros.pessoas.length ||
            filtros.pessoas.includes(tipoPessoaParceiro(p))) &&
          (!filtros.situacoes.length || filtros.situacoes.includes(p.status)),
      ),
    [items, filtros],
  );
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
      key: "tipos" | "pessoas" | "situacoes",
      label: string,
      opts: readonly { value: string; label: string }[],
    ) =>
      filtros[key].forEach((v) =>
        list.push({
          id: `${key}-${v}`,
          label,
          value: opts.find((o) => o.value === v)?.label ?? v,
          onRemove: () =>
            aplicar({ ...filtros, [key]: filtros[key].filter((x) => x !== v) }),
        }),
      );
    add("tipos", "Tipo", tipoParceriaOptions);
    add("pessoas", "Pessoa", tipoPessoaOptions);
    add("situacoes", "Situação", situacaoParceiroOptions);
    return list;
  }, [filtros]);
  const stats = {
    total: items.length,
    ativos: items.filter((p) => p.status === "ATIVO").length,
    fisicas: items.filter((p) => tipoPessoaParceiro(p) === "PESSOA_FISICA")
      .length,
    juridicas: items.filter((p) => tipoPessoaParceiro(p) === "PESSOA_JURIDICA")
      .length,
  };
  const excluir = async () => {
    if (!confirmDelete) return;
    try {
      await deleteParceiro(confirmDelete);
      toast.success("Parceiro excluído com sucesso.");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir parceiro.");
    } finally {
      setConfirmDelete(null);
    }
  };
  const exportColumns = [
    { header: "Parceiro", key: "nome" },
    { header: "Tipo de pessoa", key: "pessoa" },
    { header: "Tipos de parceria", key: "tipos" },
    { header: "Início", key: "inicio" },
    { header: "Fim", key: "fim" },
    { header: "Telefone", key: "telefone" },
    { header: "E-mail", key: "email" },
    { header: "Situação", key: "situacao" },
  ];
  const exportData = () =>
    filtered.map((p) => ({
      nome: nomeParceiro(p),
      pessoa: tipoPessoaLabel(tipoPessoaParceiro(p)),
      tipos: p.tipoParcerias.map(tipoParceriaLabel).join(", "),
      inicio: formatDateBr(p.dataInicioParceria),
      fim: formatDateBr(p.dataFimParceria),
      telefone: p.telefone || "—",
      email: p.email || "—",
      situacao: p.status,
    }));
  const parceriasResumidas = (tipos: string[]) => {
    const labels = tipos.map(tipoParceriaLabel);
    const excedentes = Math.max(0, labels.length - 2);
    return `${labels.slice(0, 2).join(", ")}${excedentes ? ` +${excedentes}` : ""}`;
  };
  const inputClass =
    "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";
  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Parceiros"
          tooltip={parceiroTooltip}
          objective={parceiroObjetivo}
          actions={
            <Button
              variant="glassPrimary"
              className="h-9 gap-2 px-4"
              onClick={() => navigate("/parceiros/novo")}
            >
              <Plus className="h-4 w-4" />
              Cadastrar parceiro
            </Button>
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total de parceiros"
            value={stats.total}
            icon={Handshake}
          />
          <SummaryStatCard
            title="Parceiros ativos"
            value={stats.ativos}
            icon={Handshake}
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
                    placeholder="Parceiro ou descrição"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="tipos">Tipo de parceria</FieldLabel>
                  <FilterMultiSelect
                    id="tipos"
                    options={tipoParceriaOptions}
                    value={draft.tipos}
                    onChange={(v) => setDraft({ ...draft, tipos: v })}
                    placeholder="Todos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pessoas">Tipo de pessoa</FieldLabel>
                  <FilterMultiSelect
                    id="pessoas"
                    options={[...tipoPessoaOptions]}
                    value={draft.pessoas}
                    onChange={(v) => setDraft({ ...draft, pessoas: v })}
                    placeholder="Todos"
                    summaryNoun="tipos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="situacoes">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="situacoes"
                    options={[...situacaoParceiroOptions]}
                    value={draft.situacoes}
                    onChange={(v) => setDraft({ ...draft, situacoes: v })}
                    placeholder="Todas"
                    summaryNoun="situações selecionadas"
                  />
                </div>
              </SearchFilterGrid>
              <div className="mt-4 flex gap-2 justify-end border-t pt-3.5">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2"
                  onClick={() => aplicar(initial)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2"
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
              reportTo="/relatorios/parceiros"
              exportColumns={exportColumns}
              getExportData={exportData}
              exportFilename="parceiros"
            />
            {loading ? (
              <DataTableEmptyState
                emptyTitle="Carregando parceiros..."
                emptyDescription="Aguarde."
                activeCount={0}
              />
            ) : !filtered.length ? (
              <DataTableEmptyState
                emptyTitle="Nenhum parceiro encontrado."
                emptyDescription="Cadastre a primeira parceria da organização."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b bg-muted/45">
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Ações
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Parceiro
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Pessoa
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Parcerias
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Vigência
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Telefone
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          E-mail
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] uppercase text-muted-foreground">
                          Situação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-muted/25">
                          <td className="px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/parceiros/${p.id}/relatorio`}
                              reportFilename={`parceiro-${p.id}.pdf`}
                              viewTo={`/parceiros/${p.id}`}
                              editTo={`/parceiros/${p.id}/editar`}
                              onDelete={() => setConfirmDelete(p.id)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={nomeParceiro(p)} bold>
                              {nomeParceiro(p)}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {tipoPessoaLabel(tipoPessoaParceiro(p))}
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex flex-nowrap gap-1.5">
                              {p.tipoParcerias.slice(0, 2).map((tipo) => (
                                <StatusPill
                                  key={tipo}
                                  status={tipo}
                                  ariaLabelPrefix="Tipo de parceria"
                                />
                              ))}
                              {p.tipoParcerias.length > 2 && (
                                <span
                                  className="status-pill status-na"
                                  title={parceriasResumidas(
                                    p.tipoParcerias.slice(2),
                                  )}
                                >
                                  +{p.tipoParcerias.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {formatDateBr(p.dataInicioParceria)} –{" "}
                            {formatDateBr(p.dataFimParceria)}
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {p.telefone || "—"}
                          </td>
                          <td className="px-6 py-2.5 text-[13px] text-muted-foreground">
                            {p.email || "—"}
                          </td>
                          <td className="px-6 py-2.5">
                            <StatusPill status={p.status} />
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
                  entityLabel="parceiro"
                  entityLabelPlural="parceiros"
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
            <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              O vínculo de parceria será removido.
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
        pageTitle="Parceiros"
        href="/wiki/financeiro/parceiros"
      />
    </AppLayout>
  );
}

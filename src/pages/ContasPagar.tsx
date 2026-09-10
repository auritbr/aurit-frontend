import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { TableCellText } from "@/components/TableCellText";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { DataTablePagination } from "@/components/DataTablePagination";
import { GerarReciboButton } from "@/components/GerarReciboButton";
import { usePagination } from "@/hooks/usePagination";
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
import {
  classificacaoLabel,
  classificacaoOptions,
  deleteContaPagar,
  formaPagamentoLabel,
  formaPagamentoOptions,
  formatCurrency,
  formatDate,
  getContasPagar,
  parseMoney,
  statusFinanceiroLabel,
  statusFinanceiroOptions,
  type ContaPagarData,
} from "@/data/contasPagar";
import { FINANCIAL_DATA_INVALIDATED_EVENT } from "@/lib/financialDataInvalidation";
import {
  getContasBancarias,
  nomeBancoLabel,
  type ContaBancariaData,
} from "@/data/contasBancarias";
import { getColaboradores } from "@/data/colaboradores";
import { getParticipantes } from "@/data/participantes";
import { getIntegrantes } from "@/data/integrantes";
import { getProjetos } from "@/data/projetos";
import { getAtividades } from "@/data/atividades";
import { getEventosCulturais } from "@/data/eventosCulturais";
import { getAcoesDivulgacao } from "@/data/acoesDivulgacao";

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

const sortByOptions = [
  { value: "nomeContaPagar", label: "Conta" },
  { value: "credor", label: "Credor" },
  { value: "classificacao", label: "Classificação" },
  { value: "dataCompetencia", label: "Competência" },
  { value: "dataVencimento", label: "Vencimento" },
  { value: "valorAPagar", label: "Valor a pagar" },
  { value: "formaPagamento", label: "Forma de pagamento" },
  { value: "statusFinanceiro", label: "Situação" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = {
  asc: "Crescente",
  desc: "Decrescente",
};

interface Filtros {
  nomeContaPagar: string;
  credor: string;
  classificacao: string[];
  situacao: string[];
  formaPagamento: string[];
  contaBancaria: string[];
  organizacao: string[];
  projeto: string[];
  atividade: string[];
  eventoCultural: string[];
  acaoDivulgacao: string[];
  competenciaDe: string;
  competenciaAte: string;
  vencimentoDe: string;
  vencimentoAte: string;
  pagamentoDe: string;
  pagamentoAte: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: Filtros = {
  nomeContaPagar: "",
  credor: "",
  classificacao: [],
  situacao: [],
  formaPagamento: [],
  contaBancaria: [],
  organizacao: [],
  projeto: [],
  atividade: [],
  eventoCultural: [],
  acaoDivulgacao: [],
  competenciaDe: "",
  competenciaAte: "",
  vencimentoDe: "",
  vencimentoAte: "",
  pagamentoDe: "",
  pagamentoAte: "",
  sortBy: "dataVencimento",
  sortDir: "asc",
};

const dateFieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

export default function ContasPagar() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContaPagarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContaPagarData | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "contas-pagar:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);

  const [contasBancarias, setContasBancarias] = useState<ContaBancariaData[]>(
    [],
  );
  const [credorNames, setCredorNames] = useState<Record<string, string>>({});
  const [projetoOptions, setProjetoOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [atividadeOptions, setAtividadeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [eventoOptions, setEventoOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [acaoOptions, setAcaoOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const contaBancariaOptions = useMemo(
    () =>
      contasBancarias.map((c) => ({
        value: c.id,
        label: `${c.nomeConta || "Conta sem nome"} · ${nomeBancoLabel(c.nomeBanco)}`,
      })),
    [contasBancarias],
  );

  const organizacaoOptions: { value: string; label: string }[] = [];

  const findLabel = (options: { value: string; label: string }[], id: string) =>
    options.find((o) => o.value === id)?.label || "—";

  const credorLabel = (item: ContaPagarData) => {
    if (item.colaboradorId)
      return credorNames[`c-${item.colaboradorId}`] || "—";
    if (item.participanteId)
      return credorNames[`p-${item.participanteId}`] || "—";
    if (item.integranteId) return credorNames[`i-${item.integranteId}`] || "—";
    return item.nomeCredor?.trim() || "—";
  };

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [
        contas,
        bancos,
        colaboradores,
        participantes,
        integrantes,
        projetos,
        atividades,
        eventos,
        acoes,
      ] = await Promise.all([
        getContasPagar(),
        getContasBancarias(),
        getColaboradores(),
        getParticipantes(),
        getIntegrantes(),
        getProjetos(),
        getAtividades(),
        getEventosCulturais(),
        getAcoesDivulgacao(),
      ]);
      setItems(contas);
      setContasBancarias(bancos);
      setCredorNames(
        Object.fromEntries([
          ...colaboradores.map((item) => [`c-${item.id}`, item.nomeCompleto]),
          ...participantes.map((item) => [`p-${item.id}`, item.nomeCompleto]),
          ...integrantes.map((item) => [`i-${item.id}`, item.nomeCompleto]),
        ]),
      );
      setProjetoOptions(
        projetos.map((item) => ({
          value: String(item.id),
          label: item.nomeProjeto,
        })),
      );
      setAtividadeOptions(
        atividades.map((item) => ({
          value: item.id,
          label: item.nomeAtividade,
        })),
      );
      setEventoOptions(
        eventos.map((item) => ({ value: item.id, label: item.nomeEvento })),
      );
      setAcaoOptions(
        acoes.map((item) => ({ value: item.id, label: item.nomeAcao })),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(FINANCIAL_DATA_INVALIDATED_EVENT, refresh);
  }, []);

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: Filtros) => {
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
    const nome = normalize(filtros.nomeContaPagar);
    const credor = normalize(filtros.credor);

    const inRange = (value: string, de: string, ate: string) => {
      if (de && (!value || value < de)) return false;
      if (ate && (!value || value > ate)) return false;
      return true;
    };

    const result = items.filter((i) => {
      if (nome && !normalize(i.nomeContaPagar).includes(nome)) return false;
      if (credor && !normalize(credorLabel(i)).includes(credor)) return false;
      if (
        filtros.classificacao.length &&
        !filtros.classificacao.includes(i.classificacaoContaPagar)
      )
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(i.statusFinanceiro)
      )
        return false;
      if (
        filtros.formaPagamento.length &&
        !filtros.formaPagamento.includes(i.formaPagamento)
      )
        return false;
      if (
        filtros.contaBancaria.length &&
        !filtros.contaBancaria.includes(i.contaBancariaId)
      )
        return false;
      if (
        filtros.organizacao.length &&
        !filtros.organizacao.includes(i.organizacaoId)
      )
        return false;
      if (filtros.projeto.length && !filtros.projeto.includes(i.projetoId))
        return false;
      if (
        filtros.atividade.length &&
        !filtros.atividade.includes(i.atividadeId)
      )
        return false;
      if (
        filtros.eventoCultural.length &&
        !filtros.eventoCultural.includes(i.eventoCulturalId)
      )
        return false;
      if (
        filtros.acaoDivulgacao.length &&
        !filtros.acaoDivulgacao.includes(i.acaoDivulgacaoId)
      )
        return false;
      if (
        !inRange(
          i.dataCompetencia,
          filtros.competenciaDe,
          filtros.competenciaAte,
        )
      )
        return false;
      if (
        !inRange(i.dataVencimento, filtros.vencimentoDe, filtros.vencimentoAte)
      )
        return false;
      if (!inRange(i.dataPagamento, filtros.pagamentoDe, filtros.pagamentoAte))
        return false;
      return true;
    });

    const sortValue = (item: ContaPagarData): string | number => {
      switch (filtros.sortBy) {
        case "credor":
          return credorLabel(item);
        case "classificacao":
          return classificacaoLabel(item.classificacaoContaPagar);
        case "dataCompetencia":
          return item.dataCompetencia || "";
        case "dataVencimento":
          return item.dataVencimento || "";
        case "valorAPagar":
          return parseMoney(item.valorAPagar);
        case "formaPagamento":
          return formaPagamentoLabel(item.formaPagamento);
        case "statusFinanceiro":
          return statusFinanceiroLabel(item.statusFinanceiro);
        default:
          return item.nomeContaPagar || "";
      }
    };

    return [...result].sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      const compare =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR", {
              sensitivity: "base",
            });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    type MultiKey =
      | "classificacao"
      | "situacao"
      | "formaPagamento"
      | "contaBancaria"
      | "organizacao"
      | "projeto"
      | "atividade"
      | "eventoCultural"
      | "acaoDivulgacao";
    const removeFromList = (key: MultiKey, value: string) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((v) => v !== value),
      });

    const pushText = (key: "nomeContaPagar" | "credor", label: string) => {
      if (!filtros[key].trim()) return;
      list.push({
        id: key,
        label,
        value: filtros[key].trim(),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };

    pushText("nomeContaPagar", "Nome da conta");
    pushText("credor", "Credor");

    const pushMulti = (
      key: MultiKey,
      label: string,
      resolve: (value: string) => string,
    ) =>
      filtros[key].forEach((value) =>
        list.push({
          id: `${key}-${value}`,
          label,
          value: resolve(value),
          onRemove: () => removeFromList(key, value),
        }),
      );

    pushMulti("classificacao", "Classificação", (v) => classificacaoLabel(v));
    pushMulti("situacao", "Situação", (v) =>
      labelOf(statusFinanceiroOptions, v),
    );
    pushMulti("formaPagamento", "Forma de pagamento", (v) =>
      labelOf(formaPagamentoOptions, v),
    );
    pushMulti("contaBancaria", "Conta bancária", (v) =>
      findLabel(contaBancariaOptions, v),
    );
    pushMulti("organizacao", "Organização", (v) =>
      findLabel(organizacaoOptions, v),
    );
    pushMulti("projeto", "Projeto", (v) => findLabel(projetoOptions, v));
    pushMulti("atividade", "Atividade", (v) => findLabel(atividadeOptions, v));
    pushMulti("eventoCultural", "Evento cultural", (v) =>
      findLabel(eventoOptions, v),
    );
    pushMulti("acaoDivulgacao", "Ação de divulgação", (v) =>
      findLabel(acaoOptions, v),
    );

    const pushDate = (key: keyof Filtros, label: string) => {
      const value = filtros[key] as string;
      if (!value) return;
      list.push({
        id: String(key),
        label,
        value: formatDate(value),
        onRemove: () => applyFiltros({ ...filtros, [key]: "" }),
      });
    };

    pushDate("competenciaDe", "Competência inicial");
    pushDate("competenciaAte", "Competência final");
    pushDate("vencimentoDe", "Vencimento inicial");
    pushDate("vencimentoAte", "Vencimento final");
    pushDate("pagamentoDe", "Pagamento inicial");
    pushDate("pagamentoAte", "Pagamento final");

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
  }, [
    filtros,
    contaBancariaOptions,
    organizacaoOptions,
    projetoOptions,
    atividadeOptions,
    eventoOptions,
    acaoOptions,
  ]);

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
      await deleteContaPagar(confirmDelete.id);
      setItems((current) =>
        current.filter((item) => item.id !== confirmDelete.id),
      );
      toast.success("Conta a pagar excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a conta a pagar.",
      );
    }
  };

  const exportColumns = [
    { header: "Conta", key: "nomeContaPagar" },
    { header: "Credor", key: "credorLabel" },
    { header: "Classificação", key: "classificacaoLabelText" },
    { header: "Competência", key: "competenciaLabel" },
    { header: "Vencimento", key: "vencimentoLabel" },
    { header: "Valor a pagar", key: "valorAPagarLabel" },
    { header: "Valor pago", key: "valorPagoLabel" },
    { header: "Forma de pagamento", key: "formaPagamentoLabelText" },
    { header: "Situação", key: "situacaoLabel" },
  ];

  const getExportData = () =>
    filtered.map((item) => ({
      ...item,
      credorLabel: credorLabel(item),
      classificacaoLabelText: classificacaoLabel(item.classificacaoContaPagar),
      competenciaLabel: formatDate(item.dataCompetencia),
      vencimentoLabel: formatDate(item.dataVencimento),
      valorAPagarLabel: formatCurrency(parseMoney(item.valorAPagar)),
      valorPagoLabel: item.valorPago
        ? formatCurrency(parseMoney(item.valorPago))
        : "—",
      formaPagamentoLabelText: formaPagamentoLabel(item.formaPagamento),
      situacaoLabel: statusFinanceiroLabel(item.statusFinanceiro),
    }));

  const totalAPagar = items
    .filter(
      (i) =>
        i.statusFinanceiro === "PENDENTE" || i.statusFinanceiro === "VENCIDO",
    )
    .reduce((acc, i) => acc + parseMoney(i.valorAPagar), 0);
  const pendentes = items.filter(
    (i) => i.statusFinanceiro === "PENDENTE",
  ).length;
  const vencidas = items.filter((i) => i.statusFinanceiro === "VENCIDO").length;
  const liquidadasItens = items.filter(
    (i) => i.statusFinanceiro === "LIQUIDADO",
  );
  const totalPago = liquidadasItens.reduce(
    (acc, i) =>
      acc + (i.valorPago ? parseMoney(i.valorPago) : parseMoney(i.valorAPagar)),
    0,
  );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Contas a Pagar"
          tooltip="Nesta página são cadastradas e acompanhadas as despesas da organização, desde o registro do valor e do vencimento até a realização do pagamento. Também podem ser informados o credor, a forma de pagamento e os projetos ou ações relacionados à despesa."
          objective="Cadastre e acompanhe as despesas da organização para manter organizados os valores a pagar, os vencimentos e os pagamentos realizados. Esses registros ajudam no controle financeiro e também podem ser utilizados no acompanhamento de projetos e nas prestações de contas."
          actions={
            <Button
              type="button"
              variant="glassPrimary"
              onClick={() => navigate("/contas-pagar/novo")}
              className="h-9 gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Cadastrar conta a pagar
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStatCard
            title="Total a pagar"
            value={formatCurrency(totalAPagar)}
            icon={Wallet}
            variant="neutral"
          />
          <SummaryStatCard
            title="Pendentes"
            value={pendentes}
            icon={Clock}
            variant="warning"
          />

          <SummaryStatCard
            title="Vencidas"
            value={vencidas}
            icon={AlertTriangle}
            variant="danger"
          />
          <SummaryStatCard
            title="Liquidadas"
            value={liquidadasItens.length}
            icon={CheckCircle2}
            variant="success"
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
                  <FieldLabel htmlFor="filtroNomeConta">
                    Nome da conta
                  </FieldLabel>
                  <Input
                    id="filtroNomeConta"
                    value={draft.nomeContaPagar}
                    onChange={(e) =>
                      setDraftField("nomeContaPagar", e.target.value)
                    }
                    placeholder="Digite o nome da conta"
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroCredor">Credor</FieldLabel>
                  <Input
                    id="filtroCredor"
                    value={draft.credor}
                    onChange={(e) => setDraftField("credor", e.target.value)}
                    placeholder="Digite o nome do credor"
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroClassificacao">
                    Classificação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroClassificacao"
                    options={classificacaoOptions}
                    value={draft.classificacao}
                    onChange={(value) => setDraftField("classificacao", value)}
                    placeholder="Todas as classificações"
                    summaryNoun="classificações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSituacao">Situação</FieldLabel>
                  <FilterMultiSelect
                    id="filtroSituacao"
                    options={statusFinanceiroOptions}
                    value={draft.situacao}
                    onChange={(value) => setDraftField("situacao", value)}
                    placeholder="Todas as situações"
                    summaryNoun="situações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroForma">
                    Forma de pagamento
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroForma"
                    options={formaPagamentoOptions}
                    value={draft.formaPagamento}
                    onChange={(value) => setDraftField("formaPagamento", value)}
                    placeholder="Todas as formas"
                    summaryNoun="formas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroContaBancaria">
                    Conta bancária
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroContaBancaria"
                    options={contaBancariaOptions}
                    value={draft.contaBancaria}
                    onChange={(value) => setDraftField("contaBancaria", value)}
                    placeholder="Todas as contas"
                    summaryNoun="contas selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroProjeto">Projeto</FieldLabel>
                  <FilterMultiSelect
                    id="filtroProjeto"
                    options={projetoOptions}
                    value={draft.projeto}
                    onChange={(value) => setDraftField("projeto", value)}
                    placeholder="Todos os projetos"
                    summaryNoun="projetos selecionados"
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
                    summaryNoun="atividades selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroEvento">
                    Evento cultural
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroEvento"
                    options={eventoOptions}
                    value={draft.eventoCultural}
                    onChange={(value) => setDraftField("eventoCultural", value)}
                    placeholder="Todos os eventos"
                    summaryNoun="eventos selecionados"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroAcao">
                    Ação de divulgação
                  </FieldLabel>
                  <FilterMultiSelect
                    id="filtroAcao"
                    options={acaoOptions}
                    value={draft.acaoDivulgacao}
                    onChange={(value) => setDraftField("acaoDivulgacao", value)}
                    placeholder="Todas as ações"
                    summaryNoun="ações selecionadas"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroCompetenciaDe">
                    Competência inicial
                  </FieldLabel>
                  <Input
                    id="filtroCompetenciaDe"
                    type="date"
                    value={draft.competenciaDe}
                    onChange={(e) =>
                      setDraftField("competenciaDe", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroCompetenciaAte">
                    Competência final
                  </FieldLabel>
                  <Input
                    id="filtroCompetenciaAte"
                    type="date"
                    value={draft.competenciaAte}
                    onChange={(e) =>
                      setDraftField("competenciaAte", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroVencimentoDe">
                    Vencimento inicial
                  </FieldLabel>
                  <Input
                    id="filtroVencimentoDe"
                    type="date"
                    value={draft.vencimentoDe}
                    onChange={(e) =>
                      setDraftField("vencimentoDe", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroVencimentoAte">
                    Vencimento final
                  </FieldLabel>
                  <Input
                    id="filtroVencimentoAte"
                    type="date"
                    value={draft.vencimentoAte}
                    onChange={(e) =>
                      setDraftField("vencimentoAte", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroPagamentoDe">
                    Pagamento inicial
                  </FieldLabel>
                  <Input
                    id="filtroPagamentoDe"
                    type="date"
                    value={draft.pagamentoDe}
                    onChange={(e) =>
                      setDraftField("pagamentoDe", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroPagamentoAte">
                    Pagamento final
                  </FieldLabel>
                  <Input
                    id="filtroPagamentoAte"
                    type="date"
                    value={draft.pagamentoAte}
                    onChange={(e) =>
                      setDraftField("pagamentoAte", e.target.value)
                    }
                    className={dateFieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                  <Select
                    value={draft.sortBy}
                    onValueChange={(v) => setDraftField("sortBy", v as SortBy)}
                  >
                    <SelectTrigger id="filtroSortBy" className={dateFieldClass}>
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
                    onValueChange={(v) =>
                      setDraftField("sortDir", v as SortDir)
                    }
                  >
                    <SelectTrigger
                      id="filtroSortDir"
                      className={dateFieldClass}
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
              reportTo="/relatorios/contas-pagar"
              documentLayoutsTo="/modelos-documento"
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="contas-a-pagar"
            />

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando contas a pagar...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar as contas a pagar.
                </p>
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Ocorreu um erro ao buscar os registros. Tente novamente.
                </p>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={load}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma conta a pagar cadastrada."
                noResultsTitle="Nenhuma conta a pagar encontrada com os filtros aplicados."
                createLabel="Cadastrar conta a pagar"
                onCreate={() => navigate("/contas-pagar/novo")}
                activeCount={activeCount}
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
                          sortKey="nomeContaPagar"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Conta
                        </SortableTh>
                        <SortableTh
                          sortKey="credor"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Credor
                        </SortableTh>
                        <SortableTh
                          sortKey="classificacao"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Classificação
                        </SortableTh>
                        <SortableTh
                          sortKey="dataCompetencia"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Competência
                        </SortableTh>
                        <SortableTh
                          sortKey="dataVencimento"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Vencimento
                        </SortableTh>
                        <SortableTh
                          sortKey="valorAPagar"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Valor a pagar
                        </SortableTh>
                        <SortableTh
                          sortKey="formaPagamento"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Forma de pagamento
                        </SortableTh>
                        <SortableTh
                          sortKey="statusFinanceiro"
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
                      {paginated.map((i) => (
                        <tr
                          key={i.id}
                          className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              reportEndpoint={`/contas-pagar/${i.id}/relatorio`}
                              reportFilename={`conta-pagar-${i.id}.pdf`}
                              viewTo={`/contas-pagar/${i.id}`}
                              editTo={`/contas-pagar/${i.id}/editar`}
                              onDelete={() => setConfirmDelete(i)}
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={i.nomeContaPagar} bold>
                              {i.nomeContaPagar}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={credorLabel(i)}>
                              {credorLabel(i)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={i.classificacaoContaPagar}
                              ariaLabelPrefix="Classificação"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={formatDate(i.dataCompetencia)}>
                              {formatDate(i.dataCompetencia)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={formatDate(i.dataVencimento)}>
                              {formatDate(i.dataVencimento)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-right md:text-left">
                            <TableCellText
                              text={formatCurrency(parseMoney(i.valorAPagar))}
                              bold
                            >
                              {formatCurrency(parseMoney(i.valorAPagar))}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={i.formaPagamento}
                              ariaLabelPrefix="Forma de pagamento"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusFinanceiroLabel(i.statusFinanceiro)}
                              ariaLabelPrefix="Situação da conta"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <GerarReciboButton
                              endpoint={`/contas-pagar/${i.id}/recibo`}
                              filename={`recibo-pagamento-${i.id}.pdf`}
                              successMessage="Recibo de pagamento gerado com sucesso."
                              errorMessage="Não foi possível gerar o recibo de pagamento."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginated.map((i) => (
                    <div key={i.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          reportEndpoint={`/contas-pagar/${i.id}/relatorio`}
                          reportFilename={`conta-pagar-${i.id}.pdf`}
                          viewTo={`/contas-pagar/${i.id}`}
                          editTo={`/contas-pagar/${i.id}/editar`}
                          onDelete={() => setConfirmDelete(i)}
                        />
                        <div className="flex items-center gap-2">
                          <GerarReciboButton
                            endpoint={`/contas-pagar/${i.id}/recibo`}
                            filename={`recibo-pagamento-${i.id}.pdf`}
                            label="Recibo"
                            successMessage="Recibo de pagamento gerado com sucesso."
                            errorMessage="Não foi possível gerar o recibo de pagamento."
                          />
                          <StatusPill
                            status={statusFinanceiroLabel(i.statusFinanceiro)}
                            ariaLabelPrefix="Situação da conta"
                          />
                        </div>
                      </div>
                      <p className="font-medium text-foreground">
                        {i.nomeContaPagar}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground">
                        {credorLabel(i)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatCurrency(parseMoney(i.valorAPagar))}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Competência {formatDate(i.dataCompetencia)} · Vencimento{" "}
                        {formatDate(i.dataVencimento)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill
                          status={i.classificacaoContaPagar}
                          ariaLabelPrefix="Classificação"
                        />
                        <StatusPill
                          status={i.formaPagamento}
                          ariaLabelPrefix="Forma de pagamento"
                        />
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta a pagar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a conta “
              {confirmDelete?.nomeContaPagar}”? Esta ação não pode ser desfeita.
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
        pageTitle="Contas a Pagar"
        href="/wiki/financeiro/contas-a-pagar"
      />
    </AppLayout>
  );
}

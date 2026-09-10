import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CircleDollarSign,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportComparisonBarChart,
  ReportFilterPanel,
  ReportPieChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportStatSkeleton,
  ReportTable,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import {
  FiltroBusca,
  FiltroData,
  FiltroSelect,
} from "@/components/relatorios/FinanceiroFilterFields";
import {
  buscarRelatorioFinanceiro,
  type FiltrosFinanceiros,
  type LinhaFinanceira,
  type RelatorioFinanceiroResponse,
} from "@/lib/relatoriosFinanceirosApi";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";
import { maskCpfCnpj } from "@/lib/masks";

type Field = {
  key: string;
  label: string;
  kind?: "money" | "date" | "percent" | "number" | "document";
  hidden?: boolean;
};
type Config = {
  title: string;
  tooltip: string;
  objective: string;
  table: string;
  fields: Field[];
  filters?: string[];
};

const money = (v: unknown) =>
  typeof v === "number"
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
const date = (v: unknown) =>
  typeof v === "string" && v
    ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR")
    : "—";
const text = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
const number = (value: unknown) => Number(value ?? 0) || 0;

/** Evita que uma transferência apareça como entrada e saída na mesma linha. */
function separarTransferencias(linhas: LinhaFinanceira[]): LinhaFinanceira[] {
  return linhas.flatMap((linha) => {
    const entrada = number(linha.entrada);
    const saida = number(linha.saida);
    const origem = String(linha.origem ?? "").toUpperCase();
    const transferencia =
      origem.includes("TRANSFERENCIA") || (entrada > 0 && saida > 0);
    if (!transferencia || !entrada || !saida) return [linha];

    const descricao = String(linha.descricao ?? "Transferência bancária");
    const id = String(linha.id ?? linha.chave ?? "transferencia");
    return [
      {
        ...linha,
        id: `${id}-saida`,
        chave: `${id}-saida`,
        descricao: `${descricao} — saída da transferência`,
        tipo: "Saída de transferência",
        entrada: 0,
        saida,
      },
      {
        ...linha,
        id: `${id}-entrada`,
        chave: `${id}-entrada`,
        descricao: `${descricao} — entrada da transferência`,
        tipo: "Entrada de transferência",
        entrada,
        saida: 0,
      },
    ];
  });
}

const CONFIG: Record<string, Config> = {
  "fluxo-caixa": {
    title: "Fluxo de Caixa",
    tooltip:
      "Nesta página são reunidas as entradas e saídas financeiras registradas no período, permitindo acompanhar a movimentação dos recursos e como essas movimentações alteram o saldo disponível ao longo do tempo.",
    objective:
      "Acompanhe as entradas e saídas financeiras da organização ou iniciativa e consulte a evolução do saldo disponível no período selecionado.",
    table: "Movimentações do período",
    filters: ["conta", "categoria", "tipo", "projeto"],
    fields: [
      { key: "data", label: "Data", kind: "date" },
      { key: "descricao", label: "Descrição" },
      { key: "categoria", label: "Categoria" },
      { key: "tipo", label: "Tipo" },
      { key: "conta", label: "Conta bancária" },
      { key: "entrada", label: "Entrada", kind: "money" },
      { key: "saida", label: "Saída", kind: "money" },
      { key: "saldo", label: "Saldo", kind: "money" },
    ],
  },

  "movimentacoes-financeiras": {
    title: "Movimentações Bancárias",
    tooltip:
      "Nesta página são reunidas as entradas e saídas registradas nas contas da organização ou iniciativa, com informações que permitem identificar quando cada movimentação ocorreu, sua origem, classificação, conta bancária e valores envolvidos.",
    objective:
      "Consulte as movimentações financeiras registradas e acompanhe de onde veio cada entrada, a que se refere cada saída e em qual conta bancária os valores foram movimentados.",
    table: "Movimentações registradas",
    filters: ["conta", "categoria", "tipo", "origem", "projeto"],
    fields: [
      { key: "data", label: "Data", kind: "date" },
      { key: "descricao", label: "Descrição" },
      { key: "tipo", label: "Tipo" },
      { key: "categoria", label: "Categoria" },
      { key: "origem", label: "Origem" },
      { key: "conta", label: "Conta" },
      { key: "documento", label: "Documento" },
      { key: "entrada", label: "Entrada", kind: "money" },
      { key: "saida", label: "Saída", kind: "money" },
      { key: "situacao", label: "Situação" },
      { key: "projeto", label: "Projeto" },
    ],
  },

  "receitas-despesas-categoria": {
    title: "Receitas e Despesas por Categoria",
    tooltip:
      "Nesta página as entradas e saídas realizadas são agrupadas pelas categorias financeiras registradas, permitindo visualizar como os recursos recebidos e utilizados estão distribuídos entre diferentes classificações.",
    objective:
      "Analise como as receitas e despesas da organização ou iniciativa estão distribuídas entre as categorias financeiras e identifique quais concentram os maiores valores no período selecionado.",
    table: "Categorias movimentadas",
    filters: ["conta", "tipo", "categoria", "projeto"],
    fields: [
      { key: "categoria", label: "Categoria" },
      { key: "tipo", label: "Tipo" },
      { key: "quantidade", label: "Lançamentos", kind: "number" },
      { key: "valor", label: "Valor", kind: "money" },
      { key: "percentual", label: "Participação", kind: "percent" },
    ],
  },

  "saldos-contas-bancarias": {
    title: "Contas Bancárias",
    tooltip:
      "Nesta página são apresentados os valores movimentados em cada conta bancária, permitindo comparar o saldo inicial, as entradas, as saídas e o saldo resultante no período analisado.",
    objective:
      "Acompanhe como os recursos da organização ou iniciativa estão distribuídos entre as contas bancárias e consulte a movimentação e o saldo apresentado para cada conta.",
    table: "Contas bancárias",
    filters: ["conta", "tipo", "status"],
    fields: [
      { key: "banco", label: "Banco" },
      { key: "agencia", label: "Agência" },
      { key: "numeroConta", label: "Conta" },
      { key: "nomeConta", label: "Nome" },
      { key: "tipoConta", label: "Tipo" },
      { key: "saldoInicial", label: "Saldo inicial", kind: "money" },
      { key: "entradas", label: "Entradas", kind: "money" },
      { key: "saidas", label: "Saídas", kind: "money" },
      { key: "saldoFinal", label: "Saldo final", kind: "money" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "contas-pagar": {
    title: "Contas a Pagar",
    tooltip:
      "Nesta página são reunidas as despesas cadastradas para pagamento, com informações sobre credores, classificação, competência, vencimento, valores pagos, valores pendentes e situação de cada registro.",
    objective:
      "Acompanhe os valores que a organização ou iniciativa precisa pagar, consulte o que já foi pago e identifique contas pendentes ou vencidas que ainda precisam de acompanhamento.",
    table: "Contas a pagar",
    filters: ["basePagamento", "status", "categoria", "conta", "projeto"],
    fields: [
      { key: "descricao", label: "Conta" },
      { key: "credor", label: "Credor" },
      { key: "categoria", label: "Classificação" },
      { key: "competencia", label: "Competência", kind: "date" },
      { key: "vencimento", label: "Vencimento", kind: "date" },
      { key: "valor", label: "Valor", kind: "money" },
      { key: "valorPago", label: "Pago", kind: "money" },
      { key: "valorPendente", label: "Pendente", kind: "money" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "contas-receber": {
    title: "Contas a Receber",
    tooltip:
      "Nesta página são reunidos os valores cadastrados para recebimento, com informações sobre pagadores, classificação, competência, vencimento, valores recebidos, valores pendentes e situação de cada registro.",
    objective:
      "Acompanhe os valores que a organização ou iniciativa tem a receber, consulte o que já foi recebido e identifique registros pendentes ou vencidos que ainda precisam de acompanhamento.",
    table: "Contas a receber",
    filters: ["baseRecebimento", "status", "categoria", "conta", "projeto"],
    fields: [
      { key: "descricao", label: "Conta" },
      { key: "pagador", label: "Pagador" },
      { key: "categoria", label: "Classificação" },
      { key: "competencia", label: "Competência", kind: "date" },
      { key: "vencimento", label: "Vencimento", kind: "date" },
      { key: "valor", label: "Valor", kind: "money" },
      { key: "valorPago", label: "Recebido", kind: "money" },
      { key: "valorPendente", label: "Pendente", kind: "money" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "conciliacao-bancaria": {
    title: "Conciliação Bancária",
    tooltip:
      "Nesta página são reunidas as conciliações realizadas a partir dos extratos bancários importados, permitindo acompanhar o período analisado, as movimentações conciliadas, as pendências, as divergências encontradas e a situação de cada conciliação.",
    objective:
      "Acompanhe a conferência entre os registros financeiros da Aurit e os extratos bancários, verificando o que já foi conciliado e identificando movimentações que ainda precisam de revisão.",
    table: "Conciliações realizadas",
    filters: ["conta", "status"],
    fields: [
      { key: "arquivo", label: "Arquivo" },
      { key: "conta", label: "Conta" },
      { key: "periodoInicial", label: "Início", kind: "date" },
      { key: "periodoFinal", label: "Fim", kind: "date" },
      { key: "conciliadas", label: "Conciliadas", kind: "number" },
      { key: "pendentes", label: "Pendentes", kind: "number" },
      { key: "divergencias", label: "Divergências", kind: "number" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "transferencias-bancarias": {
    title: "Transferências Bancárias",
    tooltip:
      "Nesta página são reunidas as transferências realizadas entre as contas bancárias da organização ou iniciativa, permitindo identificar de qual conta o valor saiu, para qual conta foi enviado, a data, o valor e a situação da transferência.",
    objective:
      "Acompanhe os valores movimentados entre as contas bancárias da organização ou iniciativa e consulte o histórico das transferências realizadas entre elas.",
    table: "Transferências registradas",
    filters: ["origemConta", "destinoConta", "status"],
    fields: [
      { key: "data", label: "Data", kind: "date" },
      { key: "descricao", label: "Transferência" },
      { key: "contaOrigem", label: "Conta de origem" },
      { key: "contaDestino", label: "Conta de destino" },
      { key: "valor", label: "Valor", kind: "money" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "doacoes-recebidas": {
    title: "Doações",
    tooltip:
      "Nesta página são reunidas as doações financeiras e não financeiras registradas pela organização ou iniciativa. Consulte quem realizou cada doação, o tipo, a data, o valor quando aplicável, a destinação e a situação do recebimento. Bens e serviços não são somados aos valores financeiros.",
    objective:
      "Acompanhe as doações recebidas pela organização ou iniciativa, identifique os doadores e consulte o tipo, a destinação e os valores registrados quando se tratar de contribuição financeira.",
    table: "Doações registradas",
    filters: ["tipo", "doador", "projeto", "status"],
    fields: [
      { key: "data", label: "Data", kind: "date" },
      { key: "descricao", label: "Doação" },
      { key: "doador", label: "Doador" },
      { key: "tipo", label: "Tipo" },
      { key: "valor", label: "Valor", kind: "money" },
      { key: "destinacao", label: "Destinação" },
      { key: "situacao", label: "Situação" },
    ],
  },

  "fornecedores-pagamentos": {
    title: "Fornecedores",
    tooltip:
      "Nesta página são relacionados os fornecedores cadastrados com os pagamentos e recebimentos vinculados a cada um deles, permitindo consultar quantidades, valores pagos ou pendentes e as datas das movimentações mais recentes.",
    objective:
      "Acompanhe os fornecedores da organização ou iniciativa e consulte os valores financeiros efetivamente vinculados a cada um, incluindo pagamentos, valores ainda a pagar, recebimentos e valores a receber.",
    table: "Fornecedores e pagamentos",
    filters: ["fornecedor"],
    fields: [
      { key: "fornecedor", label: "Fornecedor" },
      { key: "documento", label: "Documento", kind: "document" },
      { key: "quantidadePagamentos", label: "Pagamentos", kind: "number" },
      { key: "valorPago", label: "Total pago", kind: "money" },
      { key: "valorPendente", label: "A pagar", kind: "money" },
      { key: "ultimoPagamento", label: "Último pagamento", kind: "date" },
      { key: "quantidadeRecebimentos", label: "Recebimentos", kind: "number" },
      { key: "valorRecebido", label: "Total recebido", kind: "money" },
      { key: "valorAReceber", label: "A receber", kind: "money" },
      { key: "ultimoRecebimento", label: "Último recebimento", kind: "date" },
    ],
  },

  doadores: {
    title: "Doadores",
    tooltip:
      "Nesta página são reunidos os doadores cadastrados e as doações relacionadas a cada um deles, permitindo consultar dados de identificação, quantidade de contribuições, valores financeiros registrados e outras informações do cadastro.",
    objective:
      "Acompanhe quem contribui com a organização ou iniciativa e consulte o histórico de doações relacionado a cada doador, incluindo a quantidade de contribuições e o total financeiro registrado.",
    table: "Doadores e doações",
    fields: [
      { key: "doador", label: "Doador" },
      { key: "documento", label: "Documento", kind: "document" },
      { key: "quantidade", label: "Doações", kind: "number" },
      { key: "valor", label: "Total doado", kind: "money" },
      { key: "tipoPessoa", label: "Tipo de pessoa", hidden: true },
      { key: "situacao", label: "Status", hidden: true },
      { key: "origem", label: "Origem", hidden: true },
      { key: "telefone", label: "Telefone", hidden: true },
      { key: "email", label: "E-mail", hidden: true },
      { key: "cep", label: "CEP", hidden: true },
      { key: "logradouro", label: "Logradouro", hidden: true },
      { key: "numero", label: "Número", hidden: true },
      { key: "complemento", label: "Complemento", hidden: true },
      { key: "bairro", label: "Bairro", hidden: true },
      { key: "cidade", label: "Cidade", hidden: true },
      { key: "estado", label: "Estado", hidden: true },
      { key: "observacao", label: "Observação", hidden: true },
    ],
  },

  parceiros: {
    title: "Parceiros",
    tooltip:
      "Nesta página são reunidos os parceiros cadastrados e os registros financeiros relacionados às parcerias, permitindo consultar valores recebidos, valores a receber, pagamentos realizados e valores ainda a pagar, além das informações do vínculo cadastrado.",
    objective:
      "Acompanhe as parcerias da organização ou iniciativa e consulte os valores financeiros relacionados a cada parceiro, identificando o que foi recebido, pago e o que ainda está previsto para receber ou pagar.",
    table: "Parceiros e movimentações",
    fields: [
      { key: "fornecedor", label: "Parceiro" },
      { key: "documento", label: "Documento", kind: "document" },
      { key: "valorPago", label: "Recebido do parceiro", kind: "money" },
      { key: "valorPendente", label: "A receber do parceiro", kind: "money" },
      { key: "valorRecebido", label: "Pago ao parceiro", kind: "money" },
      { key: "valorAReceber", label: "A pagar ao parceiro", kind: "money" },
      { key: "tipoPessoa", label: "Tipo de pessoa", hidden: true },
      { key: "situacao", label: "Status", hidden: true },
      { key: "tipo", label: "Tipos de parceria", hidden: true },
      {
        key: "dataInicio",
        label: "Início da parceria",
        kind: "date",
        hidden: true,
      },
      { key: "dataFim", label: "Fim da parceria", kind: "date", hidden: true },
      { key: "telefone", label: "Telefone", hidden: true },
      { key: "email", label: "E-mail", hidden: true },
      { key: "cep", label: "CEP", hidden: true },
      { key: "logradouro", label: "Logradouro", hidden: true },
      { key: "numero", label: "Número", hidden: true },
      { key: "complemento", label: "Complemento", hidden: true },
      { key: "bairro", label: "Bairro", hidden: true },
      { key: "cidade", label: "Cidade", hidden: true },
      { key: "estado", label: "Estado", hidden: true },
      {
        key: "descricaoParceria",
        label: "Descrição da parceria",
        hidden: true,
      },
      {
        key: "contribuicaoParceiro",
        label: "Contribuição do parceiro",
        hidden: true,
      },
      {
        key: "contribuicaoOrganizacao",
        label: "Contribuição da organização",
        hidden: true,
      },
      { key: "observacao", label: "Observação", hidden: true },
    ],
  },
};

const initial: FiltrosFinanceiros = {
  busca: "",
  dataInicial: "",
  dataFinal: "",
  contaId: "TODOS",
  contaOrigemId: "TODOS",
  contaDestinoId: "TODOS",
  projetoId: "TODOS",
  doadorId: "TODOS",
  fornecedorId: "TODOS",
  categoria: "TODAS",
  tipo: "TODOS",
  origem: "TODAS",
  status: "TODOS",
  baseData: "VENCIMENTO",
};

export function FinancialReportPage({ slug }: { slug: string }) {
  const config = CONFIG[slug];
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [data, setData] = useState<RelatorioFinanceiroResponse>({
    indicadores: [],
    graficos: [],
    linhas: [],
    opcoes: {
      contas: [],
      projetos: [],
      categorias: [],
      origens: [],
      doadores: [],
      fornecedores: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await buscarRelatorioFinanceiro(slug, applied);
      setData(
        slug === "fluxo-caixa"
          ? { ...response, linhas: separarTransferencias(response.linhas) }
          : response,
      );
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar o relatório.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug, applied]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener(REPORT_DATA_INVALIDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const columns = useMemo<ReportTableColumn<LinhaFinanceira>[]>(
    () =>
      config.fields.map((field, index) => ({
        key: field.key,
        label: field.label,
        alwaysVisible: index < 2,
        hiddenByDefault: field.hidden,
        accessor: (row) =>
          field.kind === "money"
            ? money(row[field.key])
            : field.kind === "date"
              ? date(row[field.key])
              : field.kind === "document"
                ? row[field.key]
                  ? maskCpfCnpj(String(row[field.key]))
                  : "—"
                : field.kind === "percent"
                  ? `${Number(row[field.key] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
                  : text(row[field.key]),
        sortValue: (row) => row[field.key] as string | number | null,
        className:
          field.kind === "money" ||
          field.kind === "number" ||
          field.kind === "percent"
            ? "text-right tabular-nums"
            : undefined,
      })),
    [config],
  );
  const activeFilters: ActiveFilterItem[] = Object.entries(applied)
    .filter(
      ([, v]) => v && !["TODOS", "TODAS", "VENCIMENTO"].includes(String(v)),
    )
    .map(([key, value]) => ({
      id: key,
      label:
        key === "dataInicial"
          ? "A partir de"
          : key === "dataFinal"
            ? "Até"
            : "Filtro",
      value: String(value),
      onRemove: () => {
        const next = {
          ...applied,
          [key]: initial[key as keyof FiltrosFinanceiros],
        };
        setDraft(next);
        setApplied(next);
      },
    }));
  const option = (key: string) =>
    key === "conta" || key.endsWith("Conta")
      ? data.opcoes.contas
      : key === "projeto"
        ? data.opcoes.projetos
        : key === "categoria"
          ? data.opcoes.categorias
          : key === "origem"
            ? data.opcoes.origens
            : key === "doador"
              ? data.opcoes.doadores
              : key === "fornecedor"
                ? data.opcoes.fornecedores
                : [];
  const filterValue = (key: string): keyof FiltrosFinanceiros =>
    key === "conta"
      ? "contaId"
      : key === "origemConta"
        ? "contaOrigemId"
        : key === "destinoConta"
          ? "contaDestinoId"
          : key === "projeto"
            ? "projetoId"
            : key === "doador"
              ? "doadorId"
              : key === "fornecedor"
                ? "fornecedorId"
                : key === "basePagamento" || key === "baseRecebimento"
                  ? "baseData"
                  : (key as keyof FiltrosFinanceiros);
  const fixedOptions = (key: string) =>
    key === "status"
      ? [
          { value: "PENDENTE", label: "Pendente" },
          { value: "LIQUIDADO", label: "Liquidado" },
          { value: "VENCIDO", label: "Vencido" },
          { value: "AGENDADO", label: "Agendado" },
          { value: "REALIZADO", label: "Realizado" },
          { value: "RECEBIDA", label: "Recebida" },
          { value: "EM_ANDAMENTO", label: "Em andamento" },
          { value: "CONCLUIDA", label: "Concluída" },
          { value: "CANCELADO", label: "Cancelado" },
          { value: "CANCELADA", label: "Cancelada" },
          { value: "ATIVA", label: "Ativa" },
          { value: "INATIVA", label: "Inativa" },
        ]
      : key === "tipo"
        ? [
            { value: "ENTRADA", label: "Entrada" },
            { value: "SAIDA", label: "Saída" },
            { value: "FINANCEIRA", label: "Financeira" },
            { value: "MATERIAL", label: "Material" },
            { value: "SERVICO", label: "Serviço" },
            { value: "EQUIPAMENTO", label: "Equipamento" },
            { value: "ALIMENTO", label: "Alimento" },
            { value: "OUTRO", label: "Outro" },
          ]
        : key.startsWith("base")
          ? [
              { value: "VENCIMENTO", label: "Vencimento" },
              { value: "COMPETENCIA", label: "Competência" },
              {
                value: key === "basePagamento" ? "PAGAMENTO" : "RECEBIMENTO",
                label: key === "basePagamento" ? "Pagamento" : "Recebimento",
              },
            ]
          : [];

  return (
    <ReportShell
      title={config.title}
      tooltip={config.tooltip}
      objective={config.objective}
    >
      <ReportFilterPanel
        storageKey={`relatorio-financeiro-${slug}`}
        activeFilters={activeFilters}
        onSubmit={() => {
          setApplied({ ...draft });
          toast.success("Filtros aplicados.");
        }}
        onClear={() => {
          setDraft(initial);
          setApplied(initial);
        }}
        hidden
      >
        <FiltroBusca
          id={`${slug}-busca`}
          tooltip="Busque nos campos principais do relatório."
          value={draft.busca ?? ""}
          onChange={(v) => setDraft((f) => ({ ...f, busca: v }))}
        />
        <FiltroData
          id={`${slug}-de`}
          label="A partir de"
          tooltip="Data inicial do período."
          value={draft.dataInicial ?? ""}
          onChange={(v) => setDraft((f) => ({ ...f, dataInicial: v }))}
        />
        <FiltroData
          id={`${slug}-ate`}
          label="Até"
          tooltip="Data final do período."
          value={draft.dataFinal ?? ""}
          onChange={(v) => setDraft((f) => ({ ...f, dataFinal: v }))}
        />
        {(config.filters ?? []).map((key) => {
          const field = filterValue(key);
          return (
            <FiltroSelect
              key={key}
              id={`${slug}-${key}`}
              label={
                key === "conta"
                  ? "Conta bancária"
                  : key === "origemConta"
                    ? "Conta de origem"
                    : key === "destinoConta"
                      ? "Conta de destino"
                      : key === "basePagamento" || key === "baseRecebimento"
                        ? "Data considerada"
                        : key.charAt(0).toUpperCase() + key.slice(1)
              }
              tooltip={`Filtre por ${key}.`}
              value={String(
                draft[field] ??
                  (key.startsWith("base") ? "VENCIMENTO" : "TODOS"),
              )}
              onChange={(v) => setDraft((f) => ({ ...f, [field]: v }))}
              options={option(key).length ? option(key) : fixedOptions(key)}
              incluirTodos={!key.startsWith("base")}
            />
          );
        })}
      </ReportFilterPanel>
      <ReportStatGrid>
        {loading ? (
          <ReportStatSkeleton count={6} />
        ) : (
          data.indicadores.map((i, index) => (
            <ReportStatCard
              key={i.chave}
              icon={
                [
                  CircleDollarSign,
                  ArrowUpCircle,
                  ArrowDownCircle,
                  Scale,
                  BarChart3,
                ][index % 5] ?? BarChart3
              }
              tone={
                (["primary", "success", "danger", "info", "warning"] as const)[
                  index % 5
                ]
              }
              label={i.label}
              valor={
                i.texto ??
                (i.quantidade !== null ? String(i.quantidade) : money(i.valor))
              }
            />
          ))
        )}
      </ReportStatGrid>
      {data.graficos.length > 0 && (
        <ReportChartGrid>
          {data.graficos.map((g) => {
            if (
              slug === "conciliacao-bancaria" &&
              g.chave === "situacao-conciliacoes"
            ) {
              return (
                <ReportChartCard
                  key={g.chave}
                  title="Situação das conciliações"
                  description="Veja como as conciliações bancárias estão distribuídas conforme sua situação atual."
                >
                  <ReportPieChart
                    reportKey={slug}
                    data={g.dados.map((p) => ({
                      name: p.label,
                      value: Number(p.valor ?? 0),
                    }))}
                  />
                </ReportChartCard>
              );
            }
            if (
              slug === "conciliacao-bancaria" &&
              g.chave === "conferencia-movimentacoes"
            ) {
              return (
                <ReportChartCard
                  key={g.chave}
                  title="Conferência das movimentações"
                  description="Compare as movimentações já conciliadas com as que ainda estão pendentes ou apresentam divergências em cada conciliação."
                >
                  <ReportComparisonBarChart
                    reportKey={slug}
                    data={g.dados.map((p) => ({
                      name: p.label,
                      conciliadas: Number(p.entradas ?? 0),
                      pendentes: Number(p.saidas ?? 0),
                      divergencias: Number(p.saldo ?? 0),
                    }))}
                    series={[
                      { key: "conciliadas", label: "Conciliadas" },
                      { key: "pendentes", label: "Pendentes" },
                      { key: "divergencias", label: "Divergências" },
                    ]}
                  />
                </ReportChartCard>
              );
            }
            const multi = g.dados.some(
              (p) =>
                p.entradas !== null || p.saidas !== null || p.saldo !== null,
            );
            return (
              <ReportChartCard key={g.chave} title={g.titulo}>
                {multi ? (
                  <ReportComparisonBarChart
                    reportKey={slug}
                    currency
                    data={g.dados.map((p) => ({
                      name: p.label,
                      entradas: Number(p.entradas ?? 0),
                      saidas: Number(p.saidas ?? 0),
                      saldo: Number(p.saldo ?? 0),
                    }))}
                    series={[
                      { key: "entradas", label: "Entradas" },
                      { key: "saidas", label: "Saídas" },
                      { key: "saldo", label: "Saldo" },
                    ]}
                  />
                ) : (
                  <ReportBarChart
                    reportKey={slug}
                    currency
                    data={g.dados.map((p) => ({
                      name: p.label,
                      value: Number(p.valor ?? 0),
                    }))}
                  />
                )}
              </ReportChartCard>
            );
          })}
        </ReportChartGrid>
      )}
      <ReportTable
        title={config.table}
        description={loading ? "Carregando dados atualizados..." : undefined}
        rows={data.linhas}
        columns={columns}
        reportName={config.title}
        indicadoresPdf={data.indicadores.map((i) => ({
          label: i.label,
          valor:
            i.texto ??
            (i.quantidade !== null ? String(i.quantidade) : money(i.valor)),
        }))}
        pdfExport={{
          slug,
          filters: Object.fromEntries(
            Object.entries(applied).filter(
              ([, value]) =>
                value !== "" &&
                value !== null &&
                value !== undefined &&
                value !== "TODOS" &&
                value !== "TODAS",
            ),
          ),
          filterLabels: activeFilters.map(({ label, value }) => ({
            label,
            value,
          })),
        }}
        rowKey={(r, index) => String(r.id ?? r.chave ?? index)}
        nowrap={slug === "fornecedores-pagamentos"}
        emptyMessage={
          loading
            ? "Carregando..."
            : "Nenhum registro encontrado com os filtros selecionados."
        }
      />
    </ReportShell>
  );
}

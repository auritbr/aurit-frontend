import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  FileDown,
  FileSpreadsheet,
  Hourglass,
  Info,
  PiggyBank,
  Percent,
  Search,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
  Coins,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReportTab, ReportTabsList } from "@/components/relatorios/ReportTabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import {
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import {
  DivergingHBar,
  MensalAcumuladoLine,
  SimpleHBar,
  StackedHBar,
} from "@/components/relatorios/CumprimentoMetasCharts";
import { StatusPill } from "@/components/StatusPill";
import {
  coresCumprimento as COR,
  situacaoCumprimentoOptions,
  usePainelCumprimento,
} from "@/lib/cumprimentoMetas";
import { fetchGeneralReportPdf } from "@/lib/generalReportPdf";
import { downloadFile } from "@/lib/downloadFile";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
} from "@/lib/permissoes";
import {
  brl,
  exportarXlsxCompleto,
  identificacaoProjeto,
  mesLabel,
  montarConsolidado,
  nomeArquivo,
  pctFmt,
  pontosAtencao,
  qtd,
  rotuloMeta,
  tiposRelatorio,
  type Filtros,
  type LinhaMeta,
  type TipoRelatorio,
  type TomPonto,
} from "@/lib/relatorioCumprimentoMetas";
import { cn } from "@/lib/utils";

const inicial: Filtros = {
  projetoId: "TODOS",
  metaId: "TODAS",
  situacoes: [],
  inicio: "",
  fim: "",
  busca: "",
};
const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const tomClasse: Record<TomPonto, string> = {
  danger:
    "border-rose-500/25 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300",
  warning:
    "border-amber-500/30 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300",
  info: "border-sky-500/25 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300",
  success:
    "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300",
};
const tomIcone: Record<TomPonto, typeof XCircle> = {
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};
const secaoTitulo =
  "mb-2.5 mt-6 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground";
const subTitulo =
  "mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground";
const difTxt = (v: number | null) =>
  v === null
    ? "Não apurado"
    : v > 0
      ? `+${v.toLocaleString("pt-BR")} (acima)`
      : v < 0
        ? `${v.toLocaleString("pt-BR")} (abaixo)`
        : "0 (igual ao previsto)";

function Discreto({ texto }: { texto: string }) {
  return (
    <p className="rounded-[14px] border border-dashed border-border/70 bg-card/50 px-4 py-3 text-[12.5px] text-muted-foreground">
      {texto}
    </p>
  );
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-[13px] text-foreground">{valor}</dd>
    </div>
  );
}

export default function RelatorioMetasResultados() {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [aplicados, setAplicados] = useState<Filtros>(inicial);
  const [detalhe, setDetalhe] = useState<LinhaMeta | null>(null);
  const [gerarAberto, setGerarAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoRelatorio>("completo");
  const [preview, setPreview] = useState<string | null>(null);
  const [aba, setAba] = useState("visao-geral");
  const [modoDetalhe, setModoDetalhe] = useState<"fisico" | "financeiro">(
    "fisico",
  );

  const consulta = usePainelCumprimento(
    true,
    aplicados.projetoId,
    aplicados.inicio,
    aplicados.fim,
  );
  const dados = useMemo(
    () => montarConsolidado(consulta.painel, aplicados),
    [consulta.painel, aplicados],
  );
  const { linhas, ind } = dados;
  const [permissoes, setPermissoes] = useState(permissoesVazias);
  const podePdf = permissoes.GERAR_PDF || permissoes.BAIXAR;
  useEffect(() => {
    let ativo = true;
    void getPermissoesUsuarioLogadoPorModulo("RELATORIOS")
      .then((resultado) => {
        if (ativo) setPermissoes(resultado);
      })
      .catch(() => {
        if (ativo) setPermissoes(permissoesVazias);
      });
    return () => {
      ativo = false;
    };
  }, []);
  const multi =
    new Set(linhas.map((l) => l.projetoId)).size > 1 ||
    aplicados.projetoId === "TODOS";
  const org = consulta.painel?.organizacao ?? "Organização";
  const pontos = useMemo(
    () => pontosAtencao(linhas, dados.dataReferencia),
    [linhas, dados.dataReferencia],
  );
  const projetos = consulta.projetos;
  const metasOpcoes = consulta.metasDoCatalogo
    .filter((m) => m.projeto.id === filtros.projetoId)
    .map((m) => m.meta);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const aplicar = (n: Filtros) => {
    setFiltros(n);
    setAplicados(n);
    setDetalhe(null);
    setPreview(null);
    setGerarAberto(false);
  };
  const nomeProjeto = (id: string) =>
    projetos.find((p) => p.id === id)?.nomeProjeto ?? id;

  const activeFilters: ActiveFilterItem[] = [];
  if (aplicados.busca.trim())
    activeFilters.push({
      id: "busca",
      label: "Busca",
      value: aplicados.busca,
      onRemove: () => aplicar({ ...aplicados, busca: "" }),
    });
  if (aplicados.projetoId !== "TODOS")
    activeFilters.push({
      id: "projeto",
      label: "Projeto",
      value: nomeProjeto(aplicados.projetoId),
      onRemove: () =>
        aplicar({ ...aplicados, projetoId: "TODOS", metaId: "TODAS" }),
    });
  if (aplicados.metaId !== "TODAS")
    activeFilters.push({
      id: "meta",
      label: "Meta",
      value:
        consulta.painel?.metas.find((m) => m.meta.id === aplicados.metaId)?.meta
          .tituloMeta ?? aplicados.metaId,
      onRemove: () => aplicar({ ...aplicados, metaId: "TODAS" }),
    });
  if (aplicados.inicio)
    activeFilters.push({
      id: "inicio",
      label: "Período inicial",
      value: dataBR(aplicados.inicio),
      onRemove: () => aplicar({ ...aplicados, inicio: "" }),
    });
  if (aplicados.fim)
    activeFilters.push({
      id: "fim",
      label: "Período final",
      value: dataBR(aplicados.fim),
      onRemove: () => aplicar({ ...aplicados, fim: "" }),
    });
  aplicados.situacoes.forEach((s) =>
    activeFilters.push({
      id: `sit-${s}`,
      label: "Situação",
      value: situacaoCumprimentoOptions.find((o) => o.value === s)?.label ?? s,
      onRemove: () =>
        aplicar({
          ...aplicados,
          situacoes: aplicados.situacoes.filter((x) => x !== s),
        }),
    }),
  );

  const colunasPdf: Record<TipoRelatorio, string[]> = {
    completo: [
      "projeto",
      "meta",
      "previsto",
      "executado",
      "diferenca",
      "percentualExecucao",
      "cumprimento",
      "inicio",
      "termino",
      "orcamentoPrevisto",
      "valorPago",
      "valorComprometido",
      "saldo",
      "percentualFinanceiro",
    ],
    fisico: [
      "projeto",
      "meta",
      "previsto",
      "executado",
      "diferenca",
      "percentualExecucao",
      "cumprimento",
      "inicio",
      "termino",
    ],
    financeiro: [
      "projeto",
      "meta",
      "orcamentoPrevisto",
      "valorPago",
      "valorComprometido",
      "saldo",
      "percentualFinanceiro",
    ],
    resumo: [
      "projeto",
      "meta",
      "cumprimento",
      "percentualExecucao",
      "percentualFinanceiro",
    ],
  };
  const requisicaoPdf = (formato: TipoRelatorio) => ({
    slug: `cumprimento-metas-${formato}`,
    columns: colunasPdf[formato],
    filters: {
      projetoId: aplicados.projetoId === "TODOS" ? null : aplicados.projetoId,
      metaId: aplicados.metaId === "TODAS" ? null : aplicados.metaId,
      situacoes: aplicados.situacoes,
      inicio: aplicados.inicio || null,
      fim: aplicados.fim || null,
    },
    filterLabels: activeFilters.map((f) => ({
      label: f.label,
      value: String(f.value),
    })),
    search: aplicados.busca.trim(),
  });

  /* Gráficos */
  const porSituacao = situacaoCumprimentoOptions.map((o) => ({
    name: o.label,
    value: linhas.filter((l) => l.situacao === o.value).length,
  }));
  const sigla = (n: string) =>
    n
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
  const nomeCurto = (l: LinhaMeta) =>
    multi ? `${sigla(l.projeto)} · Meta ${l.numero}` : `Meta ${l.numero}`;
  const fisico = linhas
    .filter((l) => l.percentualFisico !== null)
    .map((l) => ({
      name: nomeCurto(l),
      value: Number(l.percentualFisico!.toFixed(1)),
    }));
  const comFin = linhas.filter((l) => l.orcamento !== null);
  const entregas = dados.entregasMensais.map((e) => ({
    name: mesLabel(e.mes),
    value: e.valor,
  }));
  const pagamentos = dados.pagamentosMensais.map((e) => ({
    name: mesLabel(e.mes),
    value: e.valor,
  }));
  const brlCurto = (v: number) =>
    v.toLocaleString("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    });

  const metaCol = (
    modo: "fisico" | "financeiro",
  ): ReportTableColumn<LinhaMeta> => ({
    key: "meta",
    label: "Meta",
    accessor: (r) => `${r.numero}. ${r.titulo}`,
    alwaysVisible: true,
    render: (r) => (
      <button
        type="button"
        onClick={() => {
          setModoDetalhe(modo);
          setDetalhe(r);
        }}
        className="text-left font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        title={`Ver detalhamento ${modo === "fisico" ? "físico" : "financeiro"}`}
      >
        {r.numero}. {r.titulo}
      </button>
    ),
  });
  const colunasFisicas: ReportTableColumn<LinhaMeta>[] = [
    { key: "projeto", label: "Projeto", accessor: (r) => r.projeto },
    metaCol("fisico"),
    {
      key: "prevista",
      label: "Quantidade Prevista",
      accessor: (r) => r.prevista,
    },
    {
      key: "executada",
      label: "Quantidade Executada",
      accessor: (r) => qtd(r.executada),
      sortValue: (r) => r.executada ?? -1,
    },
    {
      key: "diferenca",
      label: "Diferença",
      accessor: (r) => difTxt(r.diferenca),
      sortValue: (r) => r.diferenca ?? -1e9,
    },
    {
      key: "percentual",
      label: "Percentual Executado",
      accessor: (r) => pctFmt(r.percentualFisico),
      sortValue: (r) => r.percentualFisico ?? -1,
    },
    {
      key: "situacao",
      label: "Situação",
      accessor: (r) => r.situacaoLabel,
      render: (r) => (
        <StatusPill
          status={r.situacao}
          context="cumprimento-meta"
          ariaLabelPrefix="Situação do cumprimento"
        />
      ),
    },
    {
      key: "inicio",
      label: "Data de Início",
      accessor: (r) => r.inicio || "Não informada",
    },
    {
      key: "termino",
      label: "Data de Término",
      accessor: (r) => r.termino || "Não informada",
      sortValue: (r) => r.termino.split("/").reverse().join(""),
    },
  ];
  const colunasFinanceiras: ReportTableColumn<LinhaMeta>[] = [
    { key: "projeto", label: "Projeto", accessor: (r) => r.projeto },
    metaCol("financeiro"),
    {
      key: "orcamento",
      label: "Orçamento Previsto",
      accessor: (r) => brl(r.orcamento),
      sortValue: (r) => r.orcamento ?? -1,
    },
    {
      key: "pago",
      label: "Valor Pago",
      accessor: (r) => brl(r.pago),
      sortValue: (r) => r.pago ?? -1,
    },
    {
      key: "comprometido",
      label: "Valor Comprometido",
      accessor: (r) => brl(r.comprometido),
      sortValue: (r) => r.comprometido ?? -1,
    },
    {
      key: "saldo",
      label: "Saldo Orçamentário",
      accessor: (r) => brl(r.saldo),
      sortValue: (r) => r.saldo ?? -1e12,
    },
    {
      key: "pctFin",
      label: "Execução Financeira (%)",
      accessor: (r) => pctFmt(r.percentualFinanceiro),
      sortValue: (r) => r.percentualFinanceiro ?? -1,
    },
  ];
  const fis = {
    apuradas: linhas.filter((l) => l.executada !== null).length,
    integral: linhas.filter(
      (l) => l.executada !== null && l.executada === l.prevista,
    ).length,
    parcial: linhas.filter(
      (l) => l.executada !== null && l.executada < l.prevista,
    ).length,
    acima: linhas.filter(
      (l) => l.executada !== null && l.executada > l.prevista,
    ).length,
  };
  const indicadoresFisicosPdf = [
    { label: "Total de metas", valor: String(ind.total) },
    { label: "Com execução apurada", valor: String(fis.apuradas) },
    { label: "Execução integral", valor: String(fis.integral) },
    { label: "Execução parcial", valor: String(fis.parcial) },
    { label: "Acima do previsto", valor: String(fis.acima) },
  ];
  const indicadoresFinanceirosPdf = [
    {
      label: "Metas com orçamento",
      valor: `${ind.metasComOrcamento} de ${ind.total}`,
    },
    { label: "Orçamento previsto", valor: brl(ind.orcamento) },
    { label: "Valor pago", valor: brl(ind.pago) },
    { label: "Comprometido não pago", valor: brl(ind.comprometido) },
    { label: "Saldo orçamentário", valor: brl(ind.saldo) },
    { label: "Execução financeira", valor: pctFmt(ind.pctFinanceiro) },
  ];

  const projetosIds = [...new Set(linhas.map((l) => l.projetoId))];
  const porProjeto = projetosIds.map((id) => ({
    id,
    ls: linhas.filter((l) => l.projetoId === id),
  }));
  const rotProj = (ls: LinhaMeta[]) =>
    multi ? sigla(ls[0].projeto) || ls[0].projeto : ls[0].projeto.slice(0, 18);
  const corSituacao: Record<string, string> = {
    CUMPRIDA_INTEGRALMENTE: COR.sucesso,
    CUMPRIDA_PARCIALMENTE: COR.parcial,
    NAO_CUMPRIDA: COR.perigo,
    EM_ANDAMENTO: COR.info,
    AGUARDANDO_AVALIACAO: COR.neutro,
  };
  const seriesSituacao = situacaoCumprimentoOptions.map((o) => ({
    key: o.value,
    name: o.label,
    color: corSituacao[o.value],
  }));
  const perfilProjeto = porProjeto.map(({ ls }) => ({
    name: rotProj(ls),
    full: ls[0].projeto,
    ...Object.fromEntries(
      situacaoCumprimentoOptions.map((o) => [
        o.value,
        ls.filter((l) => l.situacao === o.value).length,
      ]),
    ),
  }));
  const coberturaProjeto = porProjeto.map(({ ls }) => {
    const a = ls.filter((l) => l.executada !== null).length;
    return {
      name: rotProj(ls),
      full: ls[0].projeto,
      apuradas: a,
      sem: ls.length - a,
    };
  });
  const desempenhoProjeto = porProjeto.map(({ ls }) => ({
    name: rotProj(ls),
    full: ls[0].projeto,
    integral: ls.filter(
      (l) => l.executada !== null && l.executada === l.prevista,
    ).length,
    parcial: ls.filter((l) => l.executada !== null && l.executada < l.prevista)
      .length,
    acima: ls.filter((l) => l.executada !== null && l.executada > l.prevista)
      .length,
    sem: ls.filter((l) => l.executada === null).length,
  }));
  const pctSinal = (v: number) =>
    `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const desvioFisico = linhas
    .filter((l) => l.executada !== null && l.prevista > 0)
    .map((l) => ({
      name: nomeCurto(l),
      full: `${l.projeto} · Meta ${l.numero}. ${l.titulo}`,
      value: Number(
        (((l.executada! - l.prevista) / l.prevista) * 100).toFixed(1),
      ),
      detalhe: [
        `Prevista: ${l.prevista.toLocaleString("pt-BR")}`,
        `Executada: ${qtd(l.executada)}`,
        `Diferença: ${difTxt(l.diferenca)}`,
        `Desvio: ${pctSinal(((l.executada! - l.prevista) / l.prevista) * 100)}`,
      ],
    }));
  const acumular = (xs: { mes: string; valor: number }[]) => {
    let t = 0;
    return xs.map((x) => ({
      name: mesLabel(x.mes),
      valor: x.valor,
      acumulado: (t += x.valor),
    }));
  };
  const entregasSerie = acumular(dados.entregasMensais);
  const pagamentosSerie = acumular(dados.pagamentosMensais);
  const orcTotal = comFin.reduce((s, l) => s + (l.orcamento ?? 0), 0);
  const distribuicao = [...comFin]
    .sort((a, b) => b.orcamento! - a.orcamento!)
    .map((l) => ({
      name: nomeCurto(l),
      full: `${l.projeto} · Meta ${l.numero}. ${l.titulo}`,
      value: l.orcamento!,
      detalhe: [
        `Previsto: ${brl(l.orcamento)}`,
        `Participação: ${pctFmt(orcTotal ? (l.orcamento! / orcTotal) * 100 : null)}`,
      ],
    }));
  const composicao = comFin
    .filter((l) => l.pago !== null)
    .map((l) => {
      const pg = l.pago ?? 0,
        cp = l.comprometido ?? 0,
        orc = l.orcamento!;
      const usoPago = Math.min(pg, orc),
        usoComp = Math.min(cp, Math.max(0, orc - usoPago));
      return {
        name: nomeCurto(l),
        full: `${l.titulo} · Orçamento ${brl(orc)}`,
        pago: usoPago,
        comprometido: usoComp,
        saldo: Math.max(0, orc - pg - cp),
        excesso: Math.max(0, pg + cp - orc),
        extra: `Execução financeira: ${pctFmt(l.percentualFinanceiro)}`,
      };
    });
  const desvioOrc = comFin
    .filter((l) => l.pago !== null)
    .map((l) => {
      const v = (l.pago ?? 0) + (l.comprometido ?? 0) - l.orcamento!;
      return {
        name: nomeCurto(l),
        full: `${l.projeto} · Meta ${l.numero}. ${l.titulo}`,
        value: v,
        cor: v > 0 ? COR.perigo : COR.sucesso,
        detalhe: [
          `Orçamento: ${brl(l.orcamento)}`,
          `Pago + comprometido: ${brl((l.pago ?? 0) + (l.comprometido ?? 0))}`,
          v > 0
            ? `Acima do previsto: ${brl(v)}`
            : `Dentro do orçamento (disponível ${brl(-v)})`,
        ],
      };
    });
  const gruposPontos = (
    [
      ["danger", "Críticos"],
      ["warning", "Atenção"],
      ["info", "Informativos"],
      ["success", "Situações regulares"],
    ] as const
  )
    .map(([tom, titulo]) => ({
      tom,
      titulo,
      itens: pontos.filter((p) => p.tom === tom),
    }))
    .filter((g) => g.itens.length);

  const gerarPreview = () => {
    if (!podePdf || consulta.carregando || !linhas.length)
      return toast.warning(
        "Não há metas para gerar o relatório com os filtros aplicados.",
      );
    void fetchGeneralReportPdf(requisicaoPdf(tipo))
      .then(({ blob }) => {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(blob));
      })
      .catch((erro: unknown) =>
        toast.error(
          erro instanceof Error
            ? erro.message
            : "Não foi possível gerar a prévia do PDF.",
        ),
      );
  };
  const baixarPdf = async (formato = tipo) => {
    if (!podePdf || consulta.carregando || !linhas.length) return;
    const { blob } = await fetchGeneralReportPdf(requisicaoPdf(formato));
    await downloadFile(blob, nomeArquivo(formato, "pdf"));
  };

  const ident =
    aplicados.projetoId !== "TODOS"
      ? identificacaoProjeto(consulta.painel, aplicados.projetoId)
      : null;
  const projetosNoRelatorio = new Set(linhas.map((l) => l.projetoId)).size;

  return (
    <ReportShell
      title="Cumprimento de Metas"
      tooltip="Relatório consolidado da execução física e financeira das metas, calculado com os mesmos critérios da página operacional."
      objective="Analise o cumprimento das metas dos projetos, acompanhe os resultados previstos e alcançados, consulte a execução física e financeira e gere relatórios detalhados para acompanhamento e prestação de contas."
    >
      <ReportFilterPanel
        storageKey="relatorio-cumprimento-metas"
        loading={consulta.carregando}
        activeFilters={activeFilters}
        onSubmit={() => {
          if (filtros.inicio && filtros.fim && filtros.inicio > filtros.fim)
            return toast.error(
              "O período inicial deve ser anterior ao período final.",
            );
          aplicar(filtros);
          toast.success("Filtros aplicados.");
        }}
        onClear={() => aplicar(inicial)}
      >
        <div>
          <FieldLabel
            htmlFor="f-projeto"
            tooltip="Selecione um projeto ou consulte todos os projetos permitidos."
          >
            Projeto
          </FieldLabel>
          <Select
            value={filtros.projetoId}
            onValueChange={(v) =>
              setFiltros((f) => ({ ...f, projetoId: v, metaId: "TODAS" }))
            }
          >
            <SelectTrigger id="f-projeto" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nomeProjeto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor="f-meta"
            tooltip="Disponível após selecionar um projeto."
          >
            Meta
          </FieldLabel>
          <Select
            value={filtros.metaId}
            disabled={filtros.projetoId === "TODOS"}
            onValueChange={(v) => setFiltros((f) => ({ ...f, metaId: v }))}
          >
            <SelectTrigger id="f-meta" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as metas</SelectItem>
              {metasOpcoes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.ordem}. {m.tituloMeta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor="f-situacao"
            tooltip="Filtre pela situação calculada do cumprimento."
          >
            Situação do cumprimento
          </FieldLabel>
          <FilterMultiSelect
            id="f-situacao"
            placeholder="Todas as situações"
            summaryNoun="situações selecionadas"
            options={[...situacaoCumprimentoOptions]}
            value={filtros.situacoes}
            onChange={(v) => setFiltros((f) => ({ ...f, situacoes: v }))}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-inicio"
            tooltip="Considera entregas e pagamentos a partir desta data."
          >
            Período inicial
          </FieldLabel>
          <Input
            id="f-inicio"
            type="date"
            value={filtros.inicio}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, inicio: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-fim"
            tooltip="Considera entregas e pagamentos até esta data."
          >
            Período final
          </FieldLabel>
          <Input
            id="f-fim"
            type="date"
            value={filtros.fim}
            onChange={(e) => setFiltros((f) => ({ ...f, fim: e.target.value }))}
            className={filterFieldClass}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-busca"
            tooltip="Busque por título ou descrição da meta e nome do projeto."
          >
            Busca
          </FieldLabel>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="f-busca"
              value={filtros.busca}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, busca: e.target.value }))
              }
              placeholder="Buscar meta..."
              className={`${filterFieldClass} pl-8`}
            />
          </div>
        </div>
      </ReportFilterPanel>

      <Dialog
        open={gerarAberto}
        onOpenChange={(aberto) => {
          setGerarAberto(aberto);
          if (!aberto) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerar relatório de Cumprimento de Metas</DialogTitle>
            <DialogDescription>
              Selecione as informações que deseja incluir no PDF.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor as TipoRelatorio);
              setPreview(null);
            }}
          >
            {tiposRelatorio.map((opcao) => (
              <label
                key={opcao.value}
                className="flex items-start gap-2 rounded-md border p-3 text-sm"
              >
                <RadioGroupItem value={opcao.value} className="mt-0.5" />
                <span>
                  <strong className="block">{opcao.label}</strong>
                  <span className="text-muted-foreground">
                    {opcao.descricao}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {preview && (
            <iframe
              title="Prévia do PDF de Cumprimento de Metas"
              src={preview}
              className="h-[40vh] w-full rounded-md border"
            />
          )}
          <DialogFooter>
            <Button
              variant="glassSecondary"
              disabled={!linhas.length}
              onClick={gerarPreview}
            >
              Pré-visualizar
            </Button>
            <Button
              variant="glassPrimary"
              disabled={!linhas.length}
              onClick={() =>
                void baixarPdf()
                  .then(() => toast.success("PDF gerado com sucesso."))
                  .catch(() => toast.error("Não foi possível baixar o PDF."))
              }
            >
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {consulta.erro && (
        <div className="space-y-2 py-4" role="alert">
          <p>{consulta.erro}</p>
          <Button variant="glassSecondary" onClick={consulta.recarregar}>
            Tentar novamente
          </Button>
        </div>
      )}
      {consulta.carregando && (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          Carregando cumprimento de metas...
        </p>
      )}
      {consulta.painel && (
        <Tabs value={aba} onValueChange={setAba} className="mb-6 mt-5">
          <ReportTabsList aria-label="Seções do relatório">
            <ReportTab value="visao-geral">Visão Geral</ReportTab>
            <ReportTab value="fisica">Execução Física</ReportTab>
            <ReportTab value="financeira">Execução Financeira</ReportTab>
          </ReportTabsList>

          {/* ───── Visão Geral ───── */}
          <TabsContent
            value="visao-geral"
            forceMount
            className="mt-0 data-[state=inactive]:hidden"
          >
            <h2 className={secaoTitulo + " mt-0"}>
              Visão Geral do Cumprimento
            </h2>
            <ReportStatGrid>
              <ReportStatCard
                wrapText
                icon={Target}
                tone="primary"
                label="Total de Metas"
                valor={String(ind.total)}
              />
              <ReportStatCard
                wrapText
                icon={CheckCircle2}
                tone="success"
                label="Metas Cumpridas"
                valor={String(ind.cumpridas)}
                hint="Cumpridas integralmente"
              />
              <ReportStatCard
                wrapText
                icon={CircleDot}
                tone="warning"
                label="Parcialmente Cumpridas"
                valor={String(ind.parciais)}
              />
              <ReportStatCard
                wrapText
                icon={XCircle}
                tone="danger"
                label="Não Cumpridas"
                valor={String(ind.naoCumpridas)}
              />
              <ReportStatCard
                wrapText
                icon={Clock}
                tone="info"
                label="Em Andamento"
                valor={String(ind.andamento)}
              />
              <ReportStatCard
                wrapText
                icon={Hourglass}
                tone="neutral"
                label="Aguardando Avaliação"
                valor={String(ind.aguardando)}
              />
              <ReportStatCard
                wrapText
                icon={ListChecks}
                tone="info"
                label="% Situação Apurada"
                valor={pctFmt(ind.pctApuradas)}
                hint={`${ind.apuradas} de ${ind.total} metas`}
              />
              <ReportStatCard
                wrapText
                icon={Percent}
                tone="success"
                label="% Cumpridas Integralmente"
                valor={pctFmt(ind.pctCumpridas)}
                hint={`${ind.cumpridas} de ${ind.total} metas`}
              />
            </ReportStatGrid>

            {aba === "visao-geral" &&
              (linhas.length === 0 ? (
                <Discreto texto="Sem metas para os filtros aplicados." />
              ) : (
                <ReportChartGrid>
                  <ReportChartCard
                    title="Perfil de Cumprimento por Projeto"
                    description="Proporção das situações das metas em cada projeto."
                  >
                    <StackedHBar
                      expand
                      data={perfilProjeto}
                      series={seriesSituacao}
                    />
                  </ReportChartCard>
                  <ReportChartCard
                    title="Cobertura da Apuração das Metas"
                    description="Metas com e sem execução apurada por projeto. Sem apuração não significa descumprimento."
                  >
                    <StackedHBar
                      expand
                      data={coberturaProjeto}
                      series={[
                        {
                          key: "apuradas",
                          name: "Com execução apurada",
                          color: COR.sucesso,
                        },
                        {
                          key: "sem",
                          name: "Sem execução apurada",
                          color: COR.neutro,
                        },
                      ]}
                    />
                  </ReportChartCard>
                </ReportChartGrid>
              ))}
            <div className="mt-5">
              <h2 className={secaoTitulo + " mt-0"}>Pontos de Atenção</h2>
              {pontos.length === 0 ? (
                <Discreto texto="Nenhum ponto de atenção identificado com os filtros aplicados." />
              ) : (
                <div className="space-y-4">
                  {gruposPontos.map((g) => (
                    <div key={g.tom}>
                      <p className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">
                        {g.titulo} · {g.itens.length}
                      </p>
                      <ul className="grid gap-2 md:grid-cols-2">
                        {g.itens.map((p) => {
                          const Icone = tomIcone[p.tom];
                          const n = p.metas.split(", ").length;
                          return (
                            <li
                              key={p.titulo}
                              className={cn(
                                "flex gap-2.5 rounded-[12px] border px-3 py-2.5",
                                tomClasse[p.tom],
                                p.tom === "success" && "opacity-80",
                              )}
                            >
                              <Icone
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-semibold">
                                  {p.titulo}{" "}
                                  <span className="font-normal opacity-80">
                                    ({n} {n === 1 ? "meta" : "metas"})
                                  </span>
                                </p>
                                <p className="text-[11.5px] text-foreground/75">
                                  {p.descricao}
                                </p>
                                <p className="mt-0.5 text-[11.5px] font-medium text-foreground/85">
                                  {p.metas}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ───── Execução Física ───── */}
          <TabsContent
            value="fisica"
            forceMount
            className="mt-0 data-[state=inactive]:hidden"
          >
            <h2 className={secaoTitulo + " mt-0"}>
              Indicadores de Execução Física
            </h2>
            <ReportStatGrid>
              <ReportStatCard
                wrapText
                icon={Target}
                tone="primary"
                label="Total de Metas"
                valor={String(ind.total)}
              />
              <ReportStatCard
                wrapText
                icon={ListChecks}
                tone="info"
                label="Metas com Execução Apurada"
                valor={String(fis.apuradas)}
                hint={`${fis.apuradas} de ${ind.total} metas`}
              />
              <ReportStatCard
                wrapText
                icon={Hourglass}
                tone="neutral"
                label="Metas sem Execução Apurada"
                valor={String(ind.total - fis.apuradas)}
                hint="Ainda sem registros de execução"
              />
              <ReportStatCard
                wrapText
                icon={CheckCircle2}
                tone="success"
                label="Metas com Execução Integral"
                valor={String(fis.integral)}
                hint="Executado igual ao previsto"
              />
              <ReportStatCard
                wrapText
                icon={CircleDot}
                tone="warning"
                label="Metas com Execução Parcial"
                valor={String(fis.parcial)}
                hint="Executado abaixo do previsto"
              />
              <ReportStatCard
                wrapText
                icon={TrendingUp}
                tone="info"
                label="Metas com Execução Acima do Previsto"
                valor={String(fis.acima)}
              />
            </ReportStatGrid>
            {aba === "fisica" &&
              (linhas.length === 0 ? (
                <Discreto texto="Sem metas para os filtros aplicados." />
              ) : (
                <ReportChartGrid>
                  <ReportChartCard
                    title="Desvio de Execução por Meta"
                    description={`0% = previsto cumprido; negativo abaixo, positivo acima. ${desvioFisico.length < linhas.length ? `Metas sem apuração não aparecem (${desvioFisico.length} de ${linhas.length}).` : ""}`}
                  >
                    {desvioFisico.length ? (
                      <DivergingHBar
                        data={desvioFisico}
                        fmt={pctSinal}
                        legenda="Desvio de execução"
                      />
                    ) : (
                      <Discreto texto="Nenhuma meta com execução física apurada." />
                    )}
                  </ReportChartCard>
                  <ReportChartCard
                    title="Desempenho das Metas por Projeto"
                    description="Quantidade de metas por classificação (categorias exclusivas)."
                  >
                    <StackedHBar
                      data={desempenhoProjeto}
                      series={[
                        {
                          key: "integral",
                          name: "Execução integral",
                          color: COR.sucesso,
                        },
                        {
                          key: "parcial",
                          name: "Execução parcial",
                          color: COR.parcial,
                        },
                        {
                          key: "acima",
                          name: "Acima do previsto",
                          color: COR.info,
                        },
                        { key: "sem", name: "Sem apuração", color: COR.neutro },
                      ]}
                    />
                  </ReportChartCard>
                  {entregas.length > 0 && (
                    <ReportChartCard
                      title="Evolução das Entregas por Período"
                      description="Registros de entregas concluídas por mês e acumulado (contagem de registros, não soma de unidades)."
                    >
                      <MensalAcumuladoLine
                        data={entregasSerie}
                        fmt={(v) => v.toLocaleString("pt-BR")}
                        nomeValor="Registros no mês"
                        nomeAcumulado="Acumulado"
                      />
                    </ReportChartCard>
                  )}
                </ReportChartGrid>
              ))}
            <h2 className={secaoTitulo}>Demonstrativo de Execução Física</h2>
            <ReportTable
              title="Demonstrativo de Execução Física"
              description="Clique no nome da meta para ver o detalhamento físico."
              rows={linhas}
              columns={colunasFisicas}
              reportName="cumprimento-metas-execucao-fisica"
              organizacaoNome={org}
              indicadoresPdf={indicadoresFisicosPdf}
              showPdf={podePdf}
              onPdf={() => baixarPdf("fisico")}
              rowKey={(r) => `${r.projetoId}-${r.id}`}
              emptyMessage="Nenhuma meta encontrada com os filtros selecionados."
            />
          </TabsContent>

          {/* ───── Execução Financeira ───── */}
          <TabsContent
            value="financeira"
            forceMount
            className="mt-0 data-[state=inactive]:hidden"
          >
            <h2 className={secaoTitulo + " mt-0"}>Indicadores Financeiros</h2>
            {ind.orcamento === null ? (
              <Discreto texto="Nenhuma meta do filtro possui planejamento financeiro vinculado. Os resultados físicos continuam disponíveis na aba Execução Física." />
            ) : (
              <>
                <ReportStatGrid>
                  <ReportStatCard
                    wrapText
                    icon={Wallet}
                    tone="primary"
                    label="Orçamento Previsto"
                    valor={brl(ind.orcamento)}
                    hint={`Metas com orçamento: ${ind.metasComOrcamento} de ${ind.total}`}
                  />
                  <ReportStatCard
                    wrapText
                    icon={Coins}
                    tone="success"
                    label="Valor Pago"
                    valor={brl(ind.pago)}
                    hint="Somente pagamentos quitados"
                  />
                  <ReportStatCard
                    wrapText
                    icon={Hourglass}
                    tone="warning"
                    label="Comprometido não Pago"
                    valor={brl(ind.comprometido)}
                  />
                  <ReportStatCard
                    wrapText
                    icon={PiggyBank}
                    tone={(ind.saldo ?? 0) < 0 ? "danger" : "info"}
                    label="Saldo Orçamentário"
                    valor={brl(ind.saldo)}
                  />
                  <ReportStatCard
                    wrapText
                    icon={TrendingUp}
                    tone="info"
                    label="Execução Financeira"
                    valor={pctFmt(ind.pctFinanceiro)}
                    hint="Valor pago ÷ orçamento"
                  />
                </ReportStatGrid>
                <p className="text-[11px] text-muted-foreground">
                  Os valores financeiros refletem a posição atual. O período
                  filtra as entregas e a evolução mensal de pagamentos.
                </p>
              </>
            )}
            {aba === "financeira" &&
              (comFin.length > 0 || pagamentos.length > 0) && (
                <ReportChartGrid>
                  {comFin.length > 0 && (
                    <ReportChartCard
                      title="Distribuição do Orçamento por Meta"
                      description="Participação de cada meta no orçamento total conhecido."
                    >
                      <SimpleHBar
                        data={distribuicao}
                        fmt={brlCurto}
                        tooltipFormat={brl}
                      />
                    </ReportChartCard>
                  )}
                  {composicao.length > 0 && (
                    <ReportChartCard
                      title="Composição Financeira por Meta"
                      description="Pago, comprometido e saldo disponível; excesso sobre o orçamento em vermelho."
                    >
                      <StackedHBar
                        data={composicao}
                        fmt={brlCurto}
                        tooltipFormat={brl}
                        series={[
                          {
                            key: "pago",
                            name: "Valor pago",
                            color: COR.sucesso,
                          },
                          {
                            key: "comprometido",
                            name: "Comprometido não pago",
                            color: COR.parcial,
                          },
                          {
                            key: "saldo",
                            name: "Saldo disponível",
                            color: COR.neutro,
                          },
                          {
                            key: "excesso",
                            name: "Acima do orçamento",
                            color: COR.perigo,
                          },
                        ]}
                      />
                    </ReportChartCard>
                  )}
                  {desvioOrc.length > 0 && (
                    <ReportChartCard
                      title="Desvios Orçamentários"
                      description={`Pago + comprometido menos o orçamento: vermelho acima do previsto, verde dentro.${linhas.length > comFin.length ? ` ${linhas.length - comFin.length} meta(s) sem orçamento cadastrado não aparecem.` : ""}`}
                    >
                      <DivergingHBar
                        data={desvioOrc}
                        fmt={brlCurto}
                        tooltipFormat={brl}
                        legenda="Desvio orçamentário"
                      />
                    </ReportChartCard>
                  )}
                  {pagamentos.length > 0 && (
                    <ReportChartCard
                      title="Evolução Financeira"
                      description="Pagamentos líquidos de estornos por mês e acumulados no período filtrado."
                    >
                      <MensalAcumuladoLine
                        data={pagamentosSerie}
                        fmt={brlCurto}
                        tooltipFormat={brl}
                        nomeValor="Pago no mês"
                        nomeAcumulado="Pago acumulado"
                      />
                    </ReportChartCard>
                  )}
                </ReportChartGrid>
              )}
            <h2 className={secaoTitulo}>
              Demonstrativo de Execução Financeira
            </h2>
            <ReportTable
              title="Demonstrativo de Execução Financeira"
              rows={linhas}
              columns={colunasFinanceiras}
              reportName="cumprimento-metas-execucao-financeira"
              organizacaoNome={org}
              indicadoresPdf={indicadoresFinanceirosPdf}
              showPdf={podePdf}
              onPdf={() => baixarPdf("financeiro")}
              rowKey={(r) => `${r.projetoId}-${r.id}`}
              emptyMessage="Nenhuma meta encontrada com os filtros selecionados."
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Detalhamento por meta */}
      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Meta {detalhe.numero} — {detalhe.titulo}
                </SheetTitle>
                <SheetDescription>
                  {modoDetalhe === "fisico"
                    ? "Detalhamento físico"
                    : "Detalhamento financeiro"}{" "}
                  · consulta somente leitura, calculada com os registros
                  existentes.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <section>
                  <h3 className={subTitulo}>Identificação</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <Campo label="Projeto" valor={detalhe.projeto} />
                    <Campo label="Número da meta" valor={detalhe.numero} />
                    <Campo label="Título" valor={detalhe.titulo} />
                    <Campo
                      label="Prazo previsto"
                      valor={detalhe.termino || "Não informado"}
                    />
                    {modoDetalhe === "fisico" && (
                      <div className="col-span-2">
                        <Campo
                          label="Descrição"
                          valor={detalhe.descricao || "Não informada"}
                        />
                      </div>
                    )}
                  </dl>
                </section>
                {modoDetalhe === "fisico" ? (
                  <>
                    <section>
                      <h3 className={subTitulo}>Execução física</h3>
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Campo
                          label="Quantidade prevista"
                          valor={detalhe.prevista.toLocaleString("pt-BR")}
                        />
                        <Campo
                          label="Quantidade executada"
                          valor={qtd(detalhe.executada)}
                        />
                        <Campo
                          label="Diferença"
                          valor={difTxt(detalhe.diferenca)}
                        />
                        <Campo
                          label="Percentual executado"
                          valor={pctFmt(detalhe.percentualFisico)}
                        />
                        <Campo
                          label="Situação"
                          valor={
                            <StatusPill
                              status={detalhe.situacao}
                              context="cumprimento-meta"
                              ariaLabelPrefix="Situação do cumprimento"
                            />
                          }
                        />
                      </dl>
                    </section>
                    <section>
                      <h3 className={subTitulo}>Registros de entregas</h3>
                      {detalhe.entregas.length === 0 ? (
                        <Discreto texto="Nenhum registro de entrega vinculado a esta meta no período." />
                      ) : (
                        <ul className="divide-y divide-border/60 rounded-[12px] border border-border/70 text-[12.5px]">
                          {detalhe.entregas.map((e) => (
                            <li
                              key={e.id}
                              className="flex justify-between px-3 py-2"
                            >
                              <span>{e.nome}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {dataBR(e.data)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                ) : (
                  <>
                    <section>
                      <h3 className={subTitulo}>Execução financeira</h3>
                      {detalhe.orcamento === null ? (
                        <Discreto texto="Planejamento financeiro não informado para esta meta." />
                      ) : (
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <Campo
                            label="Orçamento total previsto"
                            valor={brl(detalhe.orcamento)}
                          />
                          <Campo label="Valor pago" valor={brl(detalhe.pago)} />
                          <Campo
                            label="Valor comprometido"
                            valor={brl(detalhe.comprometido)}
                          />
                          <Campo
                            label="Saldo orçamentário"
                            valor={brl(detalhe.saldo)}
                          />
                          <Campo
                            label="Execução financeira"
                            valor={pctFmt(detalhe.percentualFinanceiro)}
                          />
                        </dl>
                      )}
                    </section>
                    <section>
                      <h3 className={subTitulo}>
                        Detalhamento por Item Orçamentário
                      </h3>
                      {detalhe.itens.length === 0 ? (
                        <Discreto texto="Ainda não há itens orçamentários vinculados a esta meta." />
                      ) : (
                        <div className="overflow-x-auto rounded-[12px] border border-border/70">
                          <Table className="text-[13px] [&_th]:h-10 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-xs [&_td]:whitespace-nowrap [&_td]:px-3 [&_td]:py-2.5">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item orçamentário</TableHead>
                                <TableHead className="text-right">
                                  Qtd.
                                </TableHead>
                                <TableHead className="text-right">
                                  Valor unit.
                                </TableHead>
                                <TableHead className="text-right">
                                  Total previsto
                                </TableHead>
                                <TableHead className="text-right">
                                  Pago
                                </TableHead>
                                <TableHead className="text-right">
                                  Comprometido
                                </TableHead>
                                <TableHead className="text-right">
                                  Saldo
                                </TableHead>
                                <TableHead className="text-right">
                                  Execução
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detalhe.itens.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell className="min-w-[150px] whitespace-nowrap">
                                    {it.nome}
                                    {!it.ativo && " (inativo)"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    {it.quantidade || "—"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                                    {it.valorUnitario === null
                                      ? "—"
                                      : brl(it.valorUnitario)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                                    {brl(it.previsto)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                                    {brl(it.pago)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                                    {brl(it.comprometido)}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "whitespace-nowrap text-right tabular-nums",
                                      it.saldo < 0 &&
                                        "text-rose-600 dark:text-rose-300",
                                    )}
                                  >
                                    {brl(it.saldo)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                                    {pctFmt(it.percentual)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/40 font-semibold">
                                <TableCell colSpan={3}>Total</TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                  {brl(detalhe.orcamento)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                  {brl(detalhe.pago)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                  {brl(detalhe.comprometido)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                  {brl(detalhe.saldo)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                  {pctFmt(detalhe.percentualFinanceiro)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ReportShell>
  );
}

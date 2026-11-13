import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Info,
  XCircle,
  ChevronDown,
  Coins,
  Hourglass,
  Inbox,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { StatusPill } from "@/components/StatusPill";
import {
  ReportBarChart,
  ReportChartCard,
  ReportStatCard,
  ReportStatGrid,
  filterFieldClass,
} from "@/components/relatorios/ReportKit";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuantidade } from "@/data/metasProjeto";
import {
  coresCumprimento,
  moeda,
  usePainelCumprimento,
  situacaoCumprimentoOptions,
  type MetaCalc,
} from "@/lib/cumprimentoMetas";
import {
  indicadores,
  linhaDe,
  pontosAtencao,
} from "@/lib/relatorioCumprimentoMetas";
import { cn } from "@/lib/utils";

const brl = moeda;
const brlOu = (v: number | null) => (v === null ? "—" : brl(v));
const pct = (v: number | null) =>
  v === null
    ? "—"
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const dataBR = (iso?: string) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";
const TODAS = "__todas__";
const AGUARDANDO = "Aguardando comprovação";
const secao =
  "overflow-hidden rounded-[14px] border border-border/70 bg-card/75 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65";
const num = "text-right tabular-nums whitespace-nowrap";

function SecaoTitulo({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-4">
      <div>
        <h2 className="text-[13px] font-semibold text-foreground">{titulo}</h2>
        {descricao && (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="px-5 py-8 text-center">
      <Inbox
        className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export default function CumprimentoMetasPage() {
  const [projetoId, setProjetoId] = useState("");
  const [metaFiltro, setMetaFiltro] = useState(TODAS);
  const [situacaoFiltro, setSituacaoFiltro] = useState(TODAS);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const consulta = usePainelCumprimento(false, projetoId, inicio, fim);
  const painel = projetoId ? consulta.painel : undefined;
  const projetos = consulta.projetos;

  const filtrando = metaFiltro !== TODAS || situacaoFiltro !== TODAS;
  const metas = useMemo(
    () =>
      (painel?.metas ?? []).filter(
        (m) =>
          (metaFiltro === TODAS || m.meta.id === metaFiltro) &&
          (situacaoFiltro === TODAS || m.situacao === situacaoFiltro),
      ),
    [painel, metaFiltro, situacaoFiltro],
  );

  const linhas = useMemo(() => metas.map(linhaDe), [metas]);
  const resumo = indicadores(linhas);
  const ind = {
    total: resumo.total,
    integral: resumo.cumpridas,
    parcial: resumo.parciais,
    nao: resumo.naoCumpridas,
    andamento: resumo.andamento,
    aguardando: resumo.aguardando,
    orcamento: resumo.orcamento,
    pago: resumo.pago,
    comprometido: resumo.comprometido,
    saldo: resumo.saldo,
    percentual: resumo.pctFinanceiro,
  };
  const glassField = cn(filterFieldClass, "metas-glass-field");
  const temOrcGrafico = metas.filter(
    (m) => m.orcamentoPrevisto !== null && m.valorPago !== null,
  );
  const escopo =
    "O período recorta as entregas. Os valores financeiros refletem a posição atual.";
  const pontos = pontosAtencao(linhas, painel?.dataReferencia).map(
    ({ tom, ...ponto }) => ({ ...ponto, tone: tom }),
  );
  const valorPagoResumo = ind.pago;
  const compResumo = ind.comprometido;
  const largura =
    ind.percentual === null ? 0 : Math.min(100, Math.max(0, ind.percentual));

  return (
    <AppLayout>
      <div className="metas-page container max-w-7xl space-y-5 py-6 sm:py-8">
        <ListPageHeader
          title="Cumprimento de Metas"
          tooltip="Consulte a execução física e financeira apurada automaticamente com os registros vinculados a cada meta."
          objective="Acompanhe a execução física e financeira das metas do projeto, compare os valores previstos e realizados e identifique os recursos utilizados, os saldos e os resultados alcançados."
        />

        <section aria-label="Filtros" className={cn(secao, "space-y-3 p-4")}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="f-projeto">Projeto</Label>
              <Select
                value={projetoId}
                onValueChange={(v) => {
                  setProjetoId(v);
                  setMetaFiltro(TODAS);
                }}
              >
                <SelectTrigger
                  id="f-projeto"
                  className={cn(glassField, "[&>span]:truncate")}
                >
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent className="metas-glass-menu max-w-[min(92vw,640px)]">
                  {projetos.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="whitespace-normal"
                    >
                      {p.nomeProjeto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="f-meta">Meta</Label>
              <Select
                value={metaFiltro}
                onValueChange={setMetaFiltro}
                disabled={!projetoId}
              >
                <SelectTrigger
                  id="f-meta"
                  className={cn(glassField, "[&>span]:truncate")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="metas-glass-menu max-w-[min(92vw,640px)]">
                  <SelectItem value={TODAS}>Todas as metas</SelectItem>
                  {painel?.metas.map((m) => (
                    <SelectItem
                      key={m.meta.id}
                      value={m.meta.id}
                      className="whitespace-normal leading-snug"
                    >
                      Meta {m.numero} — {m.meta.tituloMeta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0 space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="f-situacao">Situação do Cumprimento</Label>
              <Select
                value={situacaoFiltro}
                onValueChange={setSituacaoFiltro}
                disabled={!projetoId}
              >
                <SelectTrigger
                  id="f-situacao"
                  className={cn(glassField, "[&>span]:truncate")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="metas-glass-menu">
                  <SelectItem value={TODAS}>Todas</SelectItem>
                  {situacaoCumprimentoOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="f-inicio">Período Inicial</Label>
              <Input
                id="f-inicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className={glassField}
                disabled={!projetoId}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="f-fim">Período Final</Label>
              <Input
                id="f-fim"
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className={glassField}
                disabled={!projetoId}
              />
            </div>
            <div className="flex justify-end sm:col-span-2 lg:col-span-1">
              <Button
                variant="glassSecondary"
                className="h-9"
                disabled={!projetoId || !(filtrando || inicio || fim)}
                onClick={() => {
                  setMetaFiltro(TODAS);
                  setSituacaoFiltro(TODAS);
                  setInicio("");
                  setFim("");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </section>

        {consulta.erro ? (
          <div className={cn(secao, "space-y-3 p-4")} role="alert">
            <p>{consulta.erro}</p>
            <Button variant="glassSecondary" onClick={consulta.recarregar}>
              Tentar novamente
            </Button>
          </div>
        ) : consulta.carregando ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando cumprimento de metas...
          </p>
        ) : !painel ? (
          <div className={secao}>
            <DataTableEmptyState
              emptyTitle="Selecione um projeto"
              emptyDescription="O resumo financeiro e o cumprimento das metas serão carregados automaticamente."
            />
          </div>
        ) : painel.metas.length === 0 ? (
          <div className={secao}>
            <DataTableEmptyState
              emptyTitle="Este projeto ainda não possui metas cadastradas"
              emptyDescription="Cadastre as metas em Metas do Projeto para acompanhar sua execução."
            />
          </div>
        ) : (
          <>
            <section aria-labelledby="resumo-fin" className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <h2
                  id="resumo-fin"
                  className="text-[13px] font-semibold text-foreground"
                >
                  Resumo Financeiro
                </h2>
                <p className="text-[11.5px] text-muted-foreground">{escopo}</p>
              </div>
              <ReportStatGrid className="mb-0">
                <ReportStatCard
                  wrapText
                  icon={Wallet}
                  label="Orçamento Previsto"
                  valor={brlOu(ind.orcamento)}
                />
                <ReportStatCard
                  wrapText
                  icon={Coins}
                  label="Valor Pago"
                  valor={brlOu(valorPagoResumo)}
                  tone="success"
                />
                <ReportStatCard
                  wrapText
                  icon={Hourglass}
                  label="Valor Comprometido"
                  valor={brlOu(compResumo)}
                  tone="warning"
                />
                <ReportStatCard
                  wrapText
                  icon={PiggyBank}
                  label="Saldo Orçamentário"
                  valor={brlOu(ind.saldo)}
                  tone="info"
                />
                <ReportStatCard
                  wrapText
                  icon={TrendingUp}
                  label="Execução Financeira"
                  valor={pct(ind.percentual)}
                />
              </ReportStatGrid>
              {ind.percentual !== null ? (
                <div className="flex items-center gap-3 pt-1">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Execução financeira"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(largura)}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${largura}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] tabular-nums text-muted-foreground">
                    {pct(ind.percentual)} executado
                  </span>
                </div>
              ) : (
                ind.orcamento === null && (
                  <p className="text-[11.5px] text-muted-foreground">
                    Orçamento previsto não disponível para este projeto.
                  </p>
                )
              )}
            </section>

            {temOrcGrafico.length > 0 ? (
              <ReportChartCard
                title="Execução Financeira por Meta"
                description={`Valor previsto × valor pago${temOrcGrafico.length < metas.length ? " — metas sem orçamento informado não são exibidas" : ""}.`}
                height={Math.min(
                  360,
                  Math.max(140, temOrcGrafico.length * 48 + 40),
                )}
              >
                <ReportBarChart
                  layout="horizontal"
                  reportKey="financeiro"
                  categorical={false}
                  primaryColor={coresCumprimento.primaria}
                  currency
                  reportTooltip
                  maxBarSize={28}
                  data={temOrcGrafico.map((m) => ({
                    name: `Meta ${m.numero}`,
                    value: m.orcamentoPrevisto ?? 0,
                  }))}
                  compareData={temOrcGrafico.map((m) => ({
                    name: `Meta ${m.numero}`,
                    value: m.valorPago ?? 0,
                  }))}
                  labelAtual="Valor Previsto"
                  labelComparado="Valor Pago"
                  formatValue={brl}
                />
              </ReportChartCard>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">
                Execução Financeira por Meta: sem orçamento por meta disponível
                para comparação.
              </p>
            )}

            <section aria-labelledby="exec-fin" className={secao}>
              <SecaoTitulo
                titulo="Execução Financeira das Metas"
                descricao="Expanda uma meta para consultar o detalhamento por item orçamentário."
                acao={
                  <Button
                    asChild
                    type="button"
                    variant="glassSecondary"
                    className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                  >
                    <Link to="/relatorios/metas-resultados">
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Ver relatório
                    </Link>
                  </Button>
                }
              />
              {metas.length === 0 ? (
                <Vazio texto="Nenhuma meta corresponde aos filtros." />
              ) : (
                <div className="overflow-x-auto">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Meta</TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Orçamento Previsto
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Valor Pago
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Valor Comprometido
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Saldo
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Execução (%)
                        </TableHead>
                        <TableHead className="w-10">
                          <span className="sr-only">Detalhes</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    {metas.map((m) => (
                      <MetaFinanceiro key={m.meta.id} m={m} />
                    ))}
                  </Table>
                </div>
              )}
            </section>

            <section aria-labelledby="cumprimento" className={secao}>
              <SecaoTitulo
                titulo="Cumprimento das Metas"
                descricao="Acompanhe automaticamente os resultados previstos e realizados de cada meta, os percentuais de execução e as diferenças identificadas."
              />
              {metas.length === 0 ? (
                <Vazio texto="Nenhuma meta corresponde aos filtros." />
              ) : (
                <div className="overflow-x-auto">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Meta</TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Quantidade Prevista
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Quantidade Executada
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Diferença
                        </TableHead>
                        <TableHead className={cn("text-xs", num)}>
                          Percentual Executado
                        </TableHead>
                        <TableHead className="text-xs">Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metas.map((m) => {
                        const dif =
                          m.diferenca === null
                            ? null
                            : m.quantidadePrevista -
                              (m.quantidadeExecutada ?? 0);
                        return (
                          <TableRow key={m.meta.id} className="text-[13px]">
                            <TableCell className="min-w-[200px]">
                              <span className="text-muted-foreground">
                                Meta {m.numero} —{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {m.meta.tituloMeta}
                              </span>
                            </TableCell>
                            <TableCell className={num}>
                              {formatQuantidade(m.quantidadePrevista)}
                            </TableCell>
                            <TableCell className={num}>
                              {m.quantidadeExecutada === null
                                ? "—"
                                : formatQuantidade(m.quantidadeExecutada)}
                            </TableCell>
                            <TableCell className={num}>
                              {dif === null
                                ? "—"
                                : dif < 0
                                  ? `+${formatQuantidade(-dif)} excedente`
                                  : formatQuantidade(dif)}
                            </TableCell>
                            <TableCell className={num}>
                              {pct(m.percentualFisico)}
                            </TableCell>
                            <TableCell>
                              <StatusPill
                                status={m.situacao}
                                context="cumprimento-meta"
                                ariaLabelPrefix="Situação do cumprimento"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section aria-labelledby="atencao" className={secao}>
              <SecaoTitulo titulo="Pontos de Atenção" />
              {pontos.filter((p) => p.tone !== "success").length === 0 && (
                <p className="flex items-center gap-2 px-4 pt-3 text-[12.5px] text-muted-foreground">
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden
                  />
                  Nenhum ponto de atenção identificado nos dados disponíveis.
                </p>
              )}
              <ul className="grid gap-2 p-4 md:grid-cols-2">
                {pontos
                  .filter((p) => p.tone !== "success")
                  .map((pt) => (
                    <PontoItem key={pt.titulo} p={pt} />
                  ))}
              </ul>
              {pontos.some((p) => p.tone === "success") && (
                <div className="border-t border-border/60 px-4 py-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Situações regulares
                  </p>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {pontos
                      .filter((p) => p.tone === "success")
                      .map((pt) => (
                        <PontoItem key={pt.titulo} p={pt} />
                      ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

interface Ponto {
  tone: "danger" | "warning" | "info" | "success";
  titulo: string;
  descricao: string;
  metas: string;
}

const pontoTons = {
  danger: {
    box: "border-rose-500/25 bg-rose-500/[0.06]",
    icon: "text-rose-600 dark:text-rose-300",
    Icon: XCircle,
  },
  warning: {
    box: "border-amber-500/30 bg-amber-500/[0.07]",
    icon: "text-amber-600 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  info: {
    box: "border-sky-500/25 bg-sky-500/[0.06]",
    icon: "text-sky-600 dark:text-sky-300",
    Icon: Info,
  },
  success: {
    box: "border-emerald-500/25 bg-emerald-500/[0.06]",
    icon: "text-emerald-600 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
} as const;

function PontoItem({ p }: { p: Ponto }) {
  const t = pontoTons[p.tone];
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5",
        t.box,
      )}
    >
      <t.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0 text-[12.5px]">
        <p className="font-semibold text-foreground">{p.titulo}</p>
        <p className="text-muted-foreground">{p.descricao}</p>
        <p className="mt-0.5 text-[11.5px] font-medium text-foreground/80">
          {p.metas}
        </p>
      </div>
    </li>
  );
}

function MetaFinanceiro({ m }: { m: MetaCalc }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Collapsible open={aberto} onOpenChange={setAberto} asChild>
      <TableBody className="border-b border-border/60 last:border-b-0">
        <TableRow className="text-[13px]">
          <TableCell className="min-w-[220px]">
            <CollapsibleTrigger
              className="text-left hover:text-primary"
              aria-expanded={aberto}
            >
              <span className="text-muted-foreground">Meta {m.numero} — </span>
              <span className="font-medium text-foreground">
                {m.meta.tituloMeta}
              </span>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell className={num}>{brlOu(m.orcamentoPrevisto)}</TableCell>
          <TableCell className={num}>{brlOu(m.valorPago)}</TableCell>
          <TableCell className={num}>{brlOu(m.valorComprometido)}</TableCell>
          <TableCell className={num}>{brlOu(m.saldo)}</TableCell>
          <TableCell className={num}>{pct(m.percentualFinanceiro)}</TableCell>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={
                  aberto ? "Ocultar detalhamento" : "Ver detalhamento"
                }
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    aberto && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={7} className="bg-muted/25 p-0">
              <div className="p-4">
                {m.itens.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    Nenhum item do planejamento financeiro disponível para esta
                    meta.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-[10px] border border-border/70 bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">
                            Item Orçamentário
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Quantidade
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Valor Unitário
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Total Previsto
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Valor Pago
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Valor Comprometido
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Saldo
                          </TableHead>
                          <TableHead className={cn("text-xs", num)}>
                            Execução (%)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {m.itens.map((i) => {
                          return (
                            <TableRow key={i.id} className="text-[13px]">
                              <TableCell className="min-w-[180px] font-medium text-foreground">
                                {i.nome}
                                {!i.ativo && " (inativo)"}
                              </TableCell>
                              <TableCell className={num}>
                                {i.quantidade}
                              </TableCell>
                              <TableCell className={num}>
                                {brlOu(i.valorUnitario)}
                              </TableCell>
                              <TableCell className={num}>
                                {brlOu(i.previsto)}
                              </TableCell>
                              <TableCell className={num}>
                                {brlOu(i.pago)}
                              </TableCell>
                              <TableCell className={num}>
                                {brlOu(i.comprometido)}
                              </TableCell>
                              <TableCell className={num}>
                                {brlOu(i.saldo)}
                              </TableCell>
                              <TableCell className={num}>
                                {pct(i.percentual)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="text-[13px] font-semibold">
                          <TableCell colSpan={3}>Total da meta</TableCell>
                          <TableCell className={num}>
                            {brlOu(m.orcamentoPrevisto)}
                          </TableCell>
                          <TableCell className={num}>
                            {brlOu(m.valorPago)}
                          </TableCell>
                          <TableCell className={num}>
                            {brlOu(m.valorComprometido)}
                          </TableCell>
                          <TableCell className={num}>
                            {brlOu(m.saldo)}
                          </TableCell>
                          <TableCell className={num}>
                            {pct(m.percentualFinanceiro)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </div>
            </td>
          </tr>
        </CollapsibleContent>
      </TableBody>
    </Collapsible>
  );
}

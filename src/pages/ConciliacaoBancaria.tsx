import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  ListChecks,
  Loader2,
  Search,
  Upload,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AccessDenied } from "@/components/AccessDenied";
import { StatusPill } from "@/components/StatusPill";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTablePagination } from "@/components/DataTablePagination";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { TableCellText } from "@/components/TableCellText";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import { FieldLabel } from "@/components/FieldLabel";
import { ImportarExtratoDialog } from "@/components/conciliacao/ImportarExtratoDialog";
import { PainelConciliacao } from "@/components/conciliacao/PainelConciliacao";
import { LocalizarMovimentacaoDialog } from "@/components/conciliacao/LocalizarMovimentacaoDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import { setConciliacaoSeed } from "@/lib/conciliacaoSeed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  cancelarConciliacao,
  concluirConciliacao,
  conciliarCorrespondenciasExatas,
  conciliarMovimentacao,
  desfazerConciliacao,
  excluirConciliacao,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatSignedCurrency,
  ignorarMovimentacao,
  listarConciliacoes,
  listarMovimentacoesExtrato,
  origemMovimentacaoLabels,
  pendentesDeRevisao,
  progressoConciliacao,
  reavaliarMovimentacao,
  resolvidas,
  statusConciliacaoBancariaLabels,
  statusConciliacaoLabels,
  tipoMovimentacaoLabels,
  type ConciliacaoBancaria,
  type MovimentacaoExtrato,
  type RegistroAurit,
  type StatusConciliacaoMovimentacao,
} from "@/data/conciliacaoBancaria";

const OBJETIVO =
  "Compare os registros financeiros da Aurit com o extrato real da conta bancária para confirmar se entradas e saídas estão registradas corretamente. Revise as correspondências encontradas, identifique diferenças e resolva as pendências antes de concluir a conciliação.";

const TOOLTIP =
  "Nesta página são conferidas as movimentações registradas na Aurit com as movimentações do extrato bancário. Importe o arquivo OFX da conta para identificar correspondências, localizar diferenças e acompanhar o que ainda precisa ser revisado antes de concluir a conciliação.";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const fieldClass =
  "h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm";

type FiltroSituacao = "TODAS" | "REVISAO" | StatusConciliacaoMovimentacao;
type FiltroTipo = "TODAS" | "ENTRADA" | "SAIDA";

const situacaoOptions: { value: FiltroSituacao; label: string }[] = [
  { value: "TODAS", label: "Todas" },
  { value: "REVISAO", label: "Precisam de revisão" },
  { value: "PENDENTE", label: "Pendentes" },
  { value: "SUGERIDA", label: "Sugestões" },
  { value: "CONCILIADA", label: "Conciliadas" },
  { value: "DIVERGENTE", label: "Divergentes" },
  { value: "IGNORADA", label: "Ignoradas" },
];

const prioridadeRevisao: StatusConciliacaoMovimentacao[] = [
  "PENDENTE",
  "DIVERGENTE",
  "SUGERIDA",
];

/** Indicador compacto usado na barra de resumo da conciliação. */
function ResumoItem({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="min-w-[92px]">
      <p className="text-[12px] leading-tight text-muted-foreground">
        {rotulo}
      </p>
      <p className="text-[17px] font-semibold leading-tight text-foreground">
        {valor}
      </p>
    </div>
  );
}

export default function ConciliacaoBancaria() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const conciliacaoId = searchParams.get("id") ?? "";

  const [conciliacoes, setConciliacoes] = useState<ConciliacaoBancaria[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoExtrato[]>([]);
  const [carregandoMovimentacoes, setCarregandoMovimentacoes] = useState(false);
  const [acessoNegado, setAcessoNegado] = useState(false);

  const [importarAberto, setImportarAberto] = useState(false);
  const [localizarAberto, setLocalizarAberto] = useState(false);
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  const [confirmarExatas, setConfirmarExatas] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] =
    useState<ConciliacaoBancaria | null>(null);
  const [processando, setProcessando] = useState(false);

  const [selecionadaId, setSelecionadaId] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("TODAS");
  const [tipo, setTipo] = useState<FiltroTipo>("TODAS");
  const [busca, setBusca] = useState("");

  const [buscaAberta, setBuscaAberta] = useSessionBoolean(
    "conciliacao-bancaria-busca",
    false,
  );
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [filtroArquivo, setFiltroArquivo] = useState("");

  const tratarErro = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    if (isPlanoAccessDenied(message)) {
      setAcessoNegado(true);
      return;
    }
    toast.error(message || fallbackMessage);
  }, []);

  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true);
    try {
      setConciliacoes(await listarConciliacoes());
    } catch (error) {
      tratarErro(error, "Não foi possível carregar as conciliações bancárias.");
    } finally {
      setCarregandoHistorico(false);
    }
  }, [tratarErro]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const conciliacao = useMemo(
    () => conciliacoes.find((item) => item.id === conciliacaoId) ?? null,
    [conciliacoes, conciliacaoId],
  );

  const carregarMovimentacoes = useCallback(
    async (id: string) => {
      setCarregandoMovimentacoes(true);
      try {
        const itens = await listarMovimentacoesExtrato(id);
        setMovimentacoes(itens);
        setSelecionadaId((atual) =>
          itens.some((item) => item.id === atual)
            ? atual
            : (itens[0]?.id ?? ""),
        );
      } catch (error) {
        tratarErro(
          error,
          "Não foi possível carregar as movimentações do extrato.",
        );
      } finally {
        setCarregandoMovimentacoes(false);
      }
    },
    [tratarErro],
  );

  useEffect(() => {
    if (carregandoHistorico) return;

    if (!conciliacaoId) {
      setMovimentacoes([]);
      setSelecionadaId("");
      return;
    }

    // Só consulta as movimentações depois de confirmar que a conciliação
    // pertence ao histórico da organização autenticada. Isso evita usar
    // um ID antigo preservado na URL após troca de empresa/sessão.
    if (!conciliacao) {
      setMovimentacoes([]);
      setSelecionadaId("");
      setSearchParams({}, { replace: true });
      return;
    }

    carregarMovimentacoes(conciliacao.id);
  }, [
    carregandoHistorico,
    conciliacaoId,
    conciliacao,
    carregarMovimentacoes,
    setSearchParams,
  ]);

  /* ───────────────── Conciliação selecionada ───────────────── */

  const somenteLeitura =
    conciliacao?.statusConciliacaoBancaria !== "EM_ANDAMENTO";

  const listaFiltrada = useMemo(() => {
    const termo = normalize(busca);
    return movimentacoes.filter((item) => {
      if (
        situacao === "REVISAO" &&
        !prioridadeRevisao.includes(item.statusConciliacao)
      )
        return false;
      if (
        situacao !== "TODAS" &&
        situacao !== "REVISAO" &&
        item.statusConciliacao !== situacao
      )
        return false;
      if (tipo !== "TODAS" && item.tipoMovimentacao !== tipo) return false;
      if (termo && !normalize(item.historicoBancario).includes(termo))
        return false;
      return true;
    });
  }, [movimentacoes, situacao, tipo, busca]);

  const selecionada = useMemo(
    () => movimentacoes.find((item) => item.id === selecionadaId) ?? null,
    [movimentacoes, selecionadaId],
  );

  const totais = conciliacao?.totais;
  const progresso = totais ? progressoConciliacao(totais) : 0;
  const faltaRevisar = totais ? pendentesDeRevisao(totais) : 0;
  const sugeridas = totais?.sugeridas ?? 0;

  /** Após resolver uma movimentação, avança para a próxima que precisa de revisão. */
  const selecionarProxima = useCallback(
    (atualizadas: MovimentacaoExtrato[], atualId: string) => {
      const indiceAtual = atualizadas.findIndex((item) => item.id === atualId);
      const ordenadas = [
        ...atualizadas.slice(indiceAtual + 1),
        ...atualizadas.slice(0, indiceAtual),
      ];
      const proxima =
        prioridadeRevisao
          .map((status) =>
            ordenadas.find((item) => item.statusConciliacao === status),
          )
          .find(Boolean) ?? null;
      if (proxima) setSelecionadaId(proxima.id);
    },
    [],
  );

  const aplicarAtualizacao = useCallback(
    (atualizada: MovimentacaoExtrato, avancar: boolean) => {
      setMovimentacoes((atuais) => {
        const proximas = atuais.map((item) =>
          item.id === atualizada.id ? atualizada : item,
        );
        if (avancar) selecionarProxima(proximas, atualizada.id);
        return proximas;
      });
      carregarHistorico();
    },
    [carregarHistorico, selecionarProxima],
  );

  const executar = useCallback(
    async (
      acao: () => Promise<MovimentacaoExtrato>,
      mensagem: string,
      { avancar = true }: { avancar?: boolean } = {},
    ) => {
      setProcessando(true);
      try {
        const atualizada = await acao();
        aplicarAtualizacao(atualizada, avancar);
        toast.success(mensagem);
      } catch (error) {
        tratarErro(error, "Não foi possível concluir a ação.");
      } finally {
        setProcessando(false);
      }
    },
    [aplicarAtualizacao, tratarErro],
  );

  const handleVerOrigem = (registro: RegistroAurit) => {
    if (registro.contaPagarId)
      return navigate(`/contas-pagar/${registro.contaPagarId}`);
    if (registro.contaReceberId)
      return navigate(`/contas-receber/${registro.contaReceberId}`);
    if (registro.transferenciaBancariaId)
      return navigate(
        `/transferencias-bancarias/${registro.transferenciaBancariaId}`,
      );
    navigate(`/financeiro/extrato-bancario?conta=${registro.contaBancariaId}`);
  };

  const handleCriarRegistro = () => {
    if (!selecionada || !conciliacao) return;
    const alvo =
      selecionada.tipoMovimentacao === "SAIDA"
        ? "conta-pagar"
        : "conta-receber";
    setConciliacaoSeed(alvo, {
      nome: selecionada.historicoBancario,
      valor: selecionada.valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      data: selecionada.dataMovimentacao,
      contaBancariaId: conciliacao.contaBancariaId,
    });
    toast.info(
      "Após salvar o registro, volte à conciliação e reavalie a movimentação.",
    );
    navigate(
      alvo === "conta-pagar" ? "/contas-pagar/novo" : "/contas-receber/novo",
    );
  };

  const handleConciliarExatas = async () => {
    if (!conciliacao) return;
    setProcessando(true);
    try {
      const { conciliadas } = await conciliarCorrespondenciasExatas(
        conciliacao.id,
      );
      await carregarMovimentacoes(conciliacao.id);
      await carregarHistorico();
      toast.success(
        conciliadas === 1
          ? "1 correspondência exata foi conciliada."
          : `${conciliadas} correspondências exatas foram conciliadas.`,
      );
    } catch (error) {
      tratarErro(
        error,
        "Não foi possível conciliar as correspondências exatas.",
      );
    } finally {
      setProcessando(false);
    }
  };

  const handleConcluir = async () => {
    if (!conciliacao) return;
    setProcessando(true);
    try {
      await concluirConciliacao(conciliacao.id);
      await carregarHistorico();
      toast.success("Conciliação concluída com sucesso.");
    } catch (error) {
      tratarErro(error, "Não foi possível concluir a conciliação.");
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelar = async () => {
    if (!conciliacao) return;
    setProcessando(true);
    try {
      await cancelarConciliacao(conciliacao.id);
      await carregarHistorico();
      toast.success(
        "Conciliação cancelada. O histórico da importação foi preservado.",
      );
    } catch (error) {
      tratarErro(error, "Não foi possível cancelar a conciliação.");
    } finally {
      setProcessando(false);
    }
  };

  const handleExcluir = async () => {
    if (!confirmarExcluir) return;

    setProcessando(true);
    try {
      await excluirConciliacao(confirmarExcluir.id);
      setConfirmarExcluir(null);
      await carregarHistorico();
      toast.success("Conciliação excluída com sucesso.");
    } catch (error) {
      tratarErro(error, "Não foi possível excluir a conciliação.");
    } finally {
      setProcessando(false);
    }
  };

  const abrirConciliacao = (id: string) => {
    setSituacao("TODAS");
    setTipo("TODAS");
    setBusca("");
    setSearchParams({ id });
  };

  /* ───────────────── Histórico de conciliações ───────────────── */

  const contasDoHistorico = useMemo(() => {
    const mapa = new Map<string, string>();
    conciliacoes.forEach((item) =>
      mapa.set(item.contaBancariaId, item.contaBancariaLabel),
    );
    return [...mapa.entries()].map(([value, label]) => ({ value, label }));
  }, [conciliacoes]);

  const historicoFiltrado = useMemo(() => {
    const arquivo = normalize(filtroArquivo);
    return conciliacoes.filter((item) => {
      if (filtroConta && item.contaBancariaId !== filtroConta) return false;
      if (filtroSituacao && item.statusConciliacaoBancaria !== filtroSituacao)
        return false;
      if (filtroDataDe && item.periodoFim && item.periodoFim < filtroDataDe)
        return false;
      if (
        filtroDataAte &&
        item.periodoInicio &&
        item.periodoInicio > filtroDataAte
      )
        return false;
      if (arquivo && !normalize(item.arquivoNome).includes(arquivo))
        return false;
      return true;
    });
  }, [
    conciliacoes,
    filtroConta,
    filtroSituacao,
    filtroDataDe,
    filtroDataAte,
    filtroArquivo,
  ]);

  const historicoFiltrosKey = JSON.stringify({
    filtroConta,
    filtroSituacao,
    filtroDataDe,
    filtroDataAte,
    filtroArquivo,
  });
  const {
    currentPage: historicoPagina,
    pageSize: historicoTamanhoPagina,
    setCurrentPage: setHistoricoPagina,
    setPageSize: setHistoricoTamanhoPagina,
    paginated: historicoPaginado,
  } = usePagination(historicoFiltrado, 25, historicoFiltrosKey);

  const filtrosAtivos = [
    filtroConta,
    filtroSituacao,
    filtroDataDe,
    filtroDataAte,
    filtroArquivo,
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setFiltroConta("");
    setFiltroSituacao("");
    setFiltroDataDe("");
    setFiltroDataAte("");
    setFiltroArquivo("");
  };

  const exportData = () =>
    listaFiltrada.map((item) => ({
      data: formatDate(item.dataMovimentacao),
      historico: item.historicoBancario,
      tipo: tipoMovimentacaoLabels[item.tipoMovimentacao],
      valor: formatSignedCurrency(item.valor, item.tipoMovimentacao),
      situacao: statusConciliacaoLabels[item.statusConciliacao],
      registro:
        item.movimentacaoVinculada?.historico ??
        item.movimentacaoSugerida?.historico ??
        "—",
      origem: item.movimentacaoVinculada
        ? origemMovimentacaoLabels[
            item.movimentacaoVinculada.origemMovimentacao
          ]
        : item.movimentacaoSugerida
          ? origemMovimentacaoLabels[
              item.movimentacaoSugerida.origemMovimentacao
            ]
          : "—",
      diferenca:
        item.movimentacaoVinculada && item.statusConciliacao === "DIVERGENTE"
          ? formatCurrency(
              Math.abs(item.valor - item.movimentacaoVinculada.valor),
            )
          : "—",
    }));

  if (acessoNegado) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  const painel = (
    <PainelConciliacao
      movimentacao={selecionada}
      somenteLeitura={somenteLeitura}
      processando={processando}
      onConciliar={() =>
        selecionada &&
        executar(
          () => conciliarMovimentacao(selecionada.id),
          "Movimentação conciliada com sucesso.",
        )
      }
      onIgnorar={() =>
        selecionada &&
        executar(
          () => ignorarMovimentacao(selecionada.id),
          "Movimentação ignorada.",
        )
      }
      onReavaliar={() =>
        selecionada &&
        executar(
          () => reavaliarMovimentacao(selecionada.id),
          "Correspondência reavaliada.",
          {
            avancar: false,
          },
        )
      }
      onDesfazer={() =>
        selecionada &&
        executar(
          () => desfazerConciliacao(selecionada.id),
          "Conciliação desfeita.",
          { avancar: false },
        )
      }
      onLocalizar={() => setLocalizarAberto(true)}
      onVerOrigem={handleVerOrigem}
      onCriarRegistro={handleCriarRegistro}
    />
  );

  return (
    <AppLayout>
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <ListPageHeader
          title="Conciliação Bancária"
          tooltip={TOOLTIP}
          objective={OBJETIVO}
          actions={
            conciliacao ? (
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 gap-2 px-4"
                onClick={() => setSearchParams({})}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Voltar ao histórico
              </Button>
            ) : (
              <Button
                type="button"
                variant="glassPrimary"
                className="h-9 gap-2 px-5"
                onClick={() => setImportarAberto(true)}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Importar extrato
              </Button>
            )
          }
        />

        {conciliacao ? (
          <div className="space-y-4">
            {/* Contexto da conciliação */}
            <section className="rounded-[14px] border border-border/70 bg-card/75 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <Landmark
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden
                    />
                    {conciliacao.contaBancariaLabel}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Período: {formatDate(conciliacao.periodoInicio)} –{" "}
                    {formatDate(conciliacao.periodoFim)} · Arquivo:{" "}
                    {conciliacao.arquivoNome}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {typeof conciliacao.saldoInicial === "number" &&
                      `Saldo inicial: ${formatCurrency(conciliacao.saldoInicial)} · `}
                    {typeof conciliacao.saldoFinal === "number" &&
                      `Saldo final: ${formatCurrency(conciliacao.saldoFinal)} · `}
                    Importado em {formatDateTime(conciliacao.dataImportacao)}
                  </p>
                </div>
                <StatusPill
                  status={
                    statusConciliacaoBancariaLabels[
                      conciliacao.statusConciliacaoBancaria
                    ]
                  }
                  size="md"
                />
              </div>
            </section>

            {conciliacao.statusConciliacaoBancaria === "CONCLUIDA" && (
              <section className="rounded-[14px] border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Conciliação concluída
                </p>
                <p className="mt-0.5 text-[12.5px] text-emerald-900/80">
                  Concluída em{" "}
                  {formatDateTime(conciliacao.dataConclusao ?? undefined)} ·{" "}
                  {conciliacao.totais.conciliadas} movimentações conciliadas ·{" "}
                  {conciliacao.totais.ignoradas} ignoradas.
                </p>
              </section>
            )}

            {/* Resumo + progresso */}
            <section className="rounded-[14px] border border-border/70 bg-card/75 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <ResumoItem
                  rotulo="Movimentações"
                  valor={conciliacao.totais.total}
                />
                <ResumoItem
                  rotulo="Conciliadas"
                  valor={conciliacao.totais.conciliadas}
                />
                <ResumoItem
                  rotulo="Sugestões"
                  valor={conciliacao.totais.sugeridas}
                />
                <ResumoItem
                  rotulo="Pendentes"
                  valor={conciliacao.totais.pendentes}
                />
                <ResumoItem
                  rotulo="Divergentes"
                  valor={conciliacao.totais.divergentes}
                />
                <ResumoItem
                  rotulo="Ignoradas"
                  valor={conciliacao.totais.ignoradas}
                />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                  <span>
                    {resolvidas(conciliacao.totais)} de{" "}
                    {conciliacao.totais.total} movimentações resolvidas
                  </span>
                  <span>{progresso}% concluído</span>
                </div>
                <Progress value={progresso} className="mt-1.5 h-1.5" />
              </div>

              {!somenteLeitura && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="glassSecondary"
                            className="h-9 gap-2 px-4 text-[12.5px] font-semibold"
                            onClick={() => setConfirmarExatas(true)}
                            disabled={processando || sugeridas === 0}
                          >
                            <ListChecks
                              className="mr-1.5 h-3.5 w-3.5"
                              aria-hidden
                            />
                            Conciliar correspondências exatas
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-[12.5px]">
                        Confirma automaticamente as correspondências exatas
                        encontradas entre o extrato bancário e as movimentações
                        da Aurit.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    type="button"
                    variant="glassPrimary"
                    className="h-9 gap-2 px-5 text-[12.5px] font-semibold"
                    onClick={handleConcluir}
                    disabled={processando || faltaRevisar > 0}
                    aria-busy={processando || undefined}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                    Concluir conciliação
                  </Button>
                  <Button
                    variant="glassDanger"
                    className="h-9 gap-2 px-4 text-[12.5px] font-semibold"
                    onClick={() => setConfirmarCancelar(true)}
                    disabled={processando}
                  >
                    Cancelar conciliação
                  </Button>
                  {faltaRevisar > 0 && (
                    <p className="w-full text-[12.5px] text-amber-700">
                      Ainda existem movimentações que precisam ser revisadas.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Filtros da lista */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[190px]">
                <FieldLabel htmlFor="conciliacao-situacao">Situação</FieldLabel>
                <Select
                  value={situacao}
                  onValueChange={(value) =>
                    setSituacao(value as FiltroSituacao)
                  }
                >
                  <SelectTrigger
                    id="conciliacao-situacao"
                    className={fieldClass}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {situacaoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <FieldLabel htmlFor="conciliacao-tipo">Tipo</FieldLabel>
                <Select
                  value={tipo}
                  onValueChange={(value) => setTipo(value as FiltroTipo)}
                >
                  <SelectTrigger id="conciliacao-tipo" className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    <SelectItem value="ENTRADA">Entradas</SelectItem>
                    <SelectItem value="SAIDA">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1">
                <FieldLabel htmlFor="conciliacao-busca">
                  Buscar no histórico
                </FieldLabel>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="conciliacao-busca"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar no histórico"
                    className={cn(fieldClass, "pl-9 text-[13px]")}
                  />
                </div>
              </div>
            </div>

            <DataTableToolbar
              total={listaFiltrada.length}
              reportTo="/relatorios/conciliacao-bancaria"
              exportColumns={[
                { header: "Data", key: "data" },
                { header: "Histórico bancário", key: "historico" },
                { header: "Tipo", key: "tipo" },
                { header: "Valor", key: "valor" },
                { header: "Situação", key: "situacao" },
                { header: "Registro vinculado", key: "registro" },
                { header: "Origem", key: "origem" },
                { header: "Diferença", key: "diferenca" },
              ]}
              getExportData={exportData}
              exportFilename="conciliacao-bancaria"
            />

            {/* Lista + painel */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <DataTableCard className="max-h-[640px] overflow-y-auto">
                {carregandoMovimentacoes ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2, 3, 4].map((item) => (
                      <Skeleton
                        key={item}
                        className="h-16 w-full rounded-[12px]"
                      />
                    ))}
                  </div>
                ) : listaFiltrada.length === 0 ? (
                  <DataTableEmptyState
                    emptyTitle="Nenhuma movimentação no extrato"
                    emptyDescription="Importe um arquivo OFX para visualizar as movimentações do extrato bancário."
                    activeCount={
                      situacao !== "TODAS" || tipo !== "TODAS" || busca ? 1 : 0
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {listaFiltrada.map((item) => {
                      const ativo = item.id === selecionadaId;
                      const entrada = item.tipoMovimentacao === "ENTRADA";
                      const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelecionadaId(item.id);
                              if (isMobile) setPainelMobileAberto(true);
                            }}
                            aria-current={ativo ? "true" : undefined}
                            className={cn(
                              "w-full px-3.5 py-3 text-left transition-colors duration-150 hover:bg-muted/40",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 motion-reduce:transition-none",
                              ativo &&
                                "bg-primary/5 shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.3)] backdrop-blur-sm",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] text-muted-foreground">
                                  {formatDate(item.dataMovimentacao)}
                                </p>
                                <p className="truncate text-[13px] font-medium text-foreground">
                                  {item.historicoBancario}
                                </p>
                                <div className="mt-1">
                                  <StatusPill
                                    status={
                                      statusConciliacaoLabels[
                                        item.statusConciliacao
                                      ]
                                    }
                                  />
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p
                                  className={cn(
                                    "text-[13px] font-semibold",
                                    entrada
                                      ? "text-emerald-700"
                                      : "text-foreground",
                                  )}
                                >
                                  {formatSignedCurrency(
                                    item.valor,
                                    item.tipoMovimentacao,
                                  )}
                                </p>
                                <p className="mt-0.5 flex items-center justify-end gap-1 text-[12px] text-muted-foreground">
                                  <Icone
                                    className={cn(
                                      "h-3 w-3",
                                      entrada
                                        ? "text-emerald-600"
                                        : "text-rose-600",
                                    )}
                                    aria-hidden
                                  />
                                  {
                                    tipoMovimentacaoLabels[
                                      item.tipoMovimentacao
                                    ]
                                  }
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DataTableCard>

              {!isMobile &&
                (carregandoMovimentacoes ? (
                  <Skeleton className="h-[420px] w-full rounded-[14px]" />
                ) : (
                  painel
                ))}
            </div>

            <Sheet
              open={isMobile && painelMobileAberto}
              onOpenChange={setPainelMobileAberto}
            >
              <SheetContent
                side="bottom"
                className="max-h-[88vh] overflow-y-auto rounded-t-[18px]"
              >
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base">
                    Conciliação da movimentação
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Detalhes e ações para conciliar a movimentação bancária
                    selecionada.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-3">{painel}</div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Indicadores do histórico */}
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryStatCard
                title="Conciliações"
                value={conciliacoes.length}
                icon={Wallet}
                tooltip="Total de conciliações bancárias registradas a partir dos extratos importados."
              />

              <SummaryStatCard
                title="Em andamento"
                value={
                  conciliacoes.filter(
                    (item) => item.statusConciliacaoBancaria === "EM_ANDAMENTO",
                  ).length
                }
                icon={Loader2}
                variant="info"
                tooltip="Conciliações que ainda possuem movimentações sendo conferidas ou revisadas."
              />

              <SummaryStatCard
                title="Movimentações a revisar"
                value={conciliacoes
                  .filter(
                    (item) => item.statusConciliacaoBancaria === "EM_ANDAMENTO",
                  )
                  .reduce(
                    (total, item) => total + pendentesDeRevisao(item.totais),
                    0,
                  )}
                icon={ListChecks}
                variant="warning"
                tooltip="Movimentações que ainda precisam ser conferidas para concluir as conciliações em andamento."
              />

              <SummaryStatCard
                title="Concluídas"
                value={
                  conciliacoes.filter(
                    (item) => item.statusConciliacaoBancaria === "CONCLUIDA",
                  ).length
                }
                icon={CheckCircle2}
                variant="success"
                tooltip="Conciliações em que a conferência das movimentações já foi finalizada."
              />
            </div>

            <AdvancedSearchPanel
              open={buscaAberta}
              onOpenChange={setBuscaAberta}
              activeCount={filtrosAtivos}
            >
              <SearchFilterGrid>
                <div>
                  <FieldLabel htmlFor="historico-conta">
                    Conta bancária
                  </FieldLabel>
                  <Select
                    value={filtroConta || "todas"}
                    onValueChange={(value) =>
                      setFiltroConta(value === "todas" ? "" : value)
                    }
                  >
                    <SelectTrigger id="historico-conta" className={fieldClass}>
                      <SelectValue placeholder="Todas as contas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as contas</SelectItem>
                      {contasDoHistorico.map((conta) => (
                        <SelectItem key={conta.value} value={conta.value}>
                          {conta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="historico-situacao">Situação</FieldLabel>
                  <Select
                    value={filtroSituacao || "todas"}
                    onValueChange={(value) =>
                      setFiltroSituacao(value === "todas" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="historico-situacao"
                      className={fieldClass}
                    >
                      <SelectValue placeholder="Todas as situações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as situações</SelectItem>
                      <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                      <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="historico-data-de">
                    Data inicial
                  </FieldLabel>
                  <Input
                    id="historico-data-de"
                    type="date"
                    value={filtroDataDe}
                    onChange={(event) => setFiltroDataDe(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="historico-data-ate">
                    Data final
                  </FieldLabel>
                  <Input
                    id="historico-data-ate"
                    type="date"
                    value={filtroDataAte}
                    onChange={(event) => setFiltroDataAte(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="historico-arquivo">
                    Nome do arquivo
                  </FieldLabel>
                  <Input
                    id="historico-arquivo"
                    value={filtroArquivo}
                    onChange={(event) => setFiltroArquivo(event.target.value)}
                    placeholder="Ex.: extrato-agosto-2026.ofx"
                    className={fieldClass}
                  />
                </div>
              </SearchFilterGrid>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="glassSecondary"
                  size="sm"
                  onClick={limparFiltros}
                  disabled={filtrosAtivos === 0}
                >
                  Limpar filtros
                </Button>
              </div>
            </AdvancedSearchPanel>

            <DataTableCard>
              <DataTableToolbar
                total={historicoFiltrado.length}
                reportTo="/relatorios/conciliacao-bancaria"
                exportColumns={[
                  { header: "Período", key: "periodo" },
                  { header: "Conta bancária", key: "conta" },
                  { header: "Arquivo", key: "arquivo" },
                  { header: "Movimentações", key: "movimentacoes" },
                  { header: "Situação", key: "situacao" },
                  { header: "Data da importação", key: "importacao" },
                ]}
                getExportData={() =>
                  historicoFiltrado.map((item) => ({
                    periodo: `${formatDate(item.periodoInicio)} – ${formatDate(item.periodoFim)}`,
                    conta: item.contaBancariaLabel,
                    arquivo: item.arquivoNome,
                    movimentacoes: item.totais.total,
                    situacao:
                      statusConciliacaoBancariaLabels[
                        item.statusConciliacaoBancaria
                      ],
                    importacao: formatDateTime(item.dataImportacao),
                  }))
                }
                exportFilename="historico-conciliacoes-bancarias"
              />
              {carregandoHistorico ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((item) => (
                    <Skeleton
                      key={item}
                      className="h-12 w-full rounded-[10px]"
                    />
                  ))}
                </div>
              ) : historicoFiltrado.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                    <FileSpreadsheet
                      className="h-[18px] w-[18px]"
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {filtrosAtivos > 0
                        ? "Nenhum resultado encontrado"
                        : "Nenhuma conciliação ancária realizada."}
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                      {filtrosAtivos > 0
                        ? "Revise os filtros utilizados ou limpe a pesquisa para visualizar todas as conciliações."
                        : "Importe um arquivo OFX para comparar o extrato bancário com as movimentações registradas na Aurit."}
                    </p>
                  </div>
                  {filtrosAtivos === 0 && (
                    <Button
                      variant="glassPrimary"
                      size="sm"
                      onClick={() => setImportarAberto(true)}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Importar extrato
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                          <th
                            scope="col"
                            className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Ações
                          </th>
                          <th
                            scope="col"
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Período
                          </th>
                          <th
                            scope="col"
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Conta bancária
                          </th>
                          <th
                            scope="col"
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Movimentações
                          </th>
                          <th
                            scope="col"
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Situação
                          </th>
                          <th
                            scope="col"
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Data da importação
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoPaginado.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                          >
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <RowActionsDropdown
                                extraItems={[
                                  {
                                    label: "Abrir conciliação",
                                    icon: ClipboardCheck,
                                    onClick: () => abrirConciliacao(item.id),
                                  },
                                ]}
                                onDelete={() => setConfirmarExcluir(item)}
                                label="Ações"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {formatDate(item.periodoInicio)} –{" "}
                              {formatDate(item.periodoFim)}
                            </td>
                            <td className="px-6 py-2.5">
                              <TableCellText
                                text={item.contaBancariaLabel}
                                bold
                              >
                                {item.contaBancariaLabel}
                              </TableCellText>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                              {item.totais.total}
                              <span className="ml-1 text-muted-foreground">
                                ({item.totais.conciliadas} conciliadas)
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5">
                              <StatusPill
                                status={
                                  statusConciliacaoBancariaLabels[
                                    item.statusConciliacaoBancaria
                                  ]
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                              {formatDateTime(item.dataImportacao)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {historicoPaginado.map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <RowActionsDropdown
                            extraItems={[
                              {
                                label: "Abrir conciliação",
                                icon: ClipboardCheck,
                                onClick: () => abrirConciliacao(item.id),
                              },
                            ]}
                            onDelete={() => setConfirmarExcluir(item)}
                          />
                          <StatusPill
                            status={
                              statusConciliacaoBancariaLabels[
                                item.statusConciliacaoBancaria
                              ]
                            }
                          />
                        </div>
                        <p className="font-medium text-foreground">
                          {item.contaBancariaLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(item.periodoInicio)} –{" "}
                          {formatDate(item.periodoFim)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.totais.total} movimentações ·{" "}
                          {item.totais.conciliadas} conciliadas
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Importado em {formatDateTime(item.dataImportacao)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <DataTablePagination
                    totalItems={historicoFiltrado.length}
                    currentPage={historicoPagina}
                    pageSize={historicoTamanhoPagina}
                    onPageChange={setHistoricoPagina}
                    onPageSizeChange={setHistoricoTamanhoPagina}
                    entityLabel="conciliação"
                    entityLabelPlural="conciliações"
                    pageSizeLabel="Conciliações por página"
                  />
                </>
              )}
            </DataTableCard>
          </div>
        )}
      </div>

      <ImportarExtratoDialog
        open={importarAberto}
        onOpenChange={setImportarAberto}
        onImported={async (resultado) => {
          await carregarHistorico();
          abrirConciliacao(resultado.conciliacaoId);
        }}
      />

      <LocalizarMovimentacaoDialog
        open={localizarAberto}
        onOpenChange={setLocalizarAberto}
        movimentacao={selecionada}
        onConfirm={async (registro) => {
          if (!selecionada) return;
          await executar(
            () => conciliarMovimentacao(selecionada.id, registro.id),
            "Movimentação conciliada com sucesso.",
          );
        }}
      />

      <AlertDialog open={confirmarExatas} onOpenChange={setConfirmarExatas}>
        <AlertDialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Deseja conciliar todas as correspondências exatas encontradas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              {sugeridas === 1
                ? "1 correspondência exata será conciliada."
                : `${sugeridas} correspondências exatas serão conciliadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConciliarExatas}>
              Conciliar correspondências
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Deseja cancelar esta conciliação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              A conciliação será cancelada, mas o histórico da importação será
              preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelar}>
              Cancelar conciliação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmarExcluir}
        onOpenChange={(aberto) => !aberto && setConfirmarExcluir(null)}
      >
        <AlertDialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Deseja excluir esta conciliação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              O extrato importado e suas movimentações de conciliação serão
              removidos definitivamente. Os lançamentos financeiros registrados
              na Aurit não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} disabled={processando}>
              {processando ? "Excluindo..." : "Excluir conciliação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Conciliação Bancária"
        href="/wiki/financeiro/conciliacao-bancaria"
      />
    </AppLayout>
  );
}

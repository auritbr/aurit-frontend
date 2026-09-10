import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  QrCode,
  Receipt,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  assinaturaGratuita,
  centralClienteKeys,
  formaPagamentoLabels,
  formatCurrency,
  formatDate,
  formatReferencia,
  formatReferenciaCurta,
  getInvoicePayment,
  getMyInvoice,
  getMyInvoices,
  getMySubscription,
  mensalidadePagavel,
  statusAssinaturaLabels,
  statusMensalidadeLabels,
  type DadosPagamento,
  type Mensalidade,
} from "@/services/centralClienteApi";

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
        {value}
      </p>
    </div>
  );
}

function ErroSecao({
  mensagem,
  onRetry,
}: {
  mensagem: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {mensagem}
      </p>
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 gap-2 px-4"
        onClick={onRetry}
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
      </Button>
    </div>
  );
}

function CampoCopiavel({
  id,
  label,
  value,
  buttonLabel,
  successMessage,
}: {
  id: string;
  label: string;
  value: string;
  buttonLabel: string;
  successMessage: string;
}) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(
        "Não foi possível copiar o código. Selecione o conteúdo e copie manualmente.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        readOnly
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        className="h-9 truncate rounded-[10px] border-border/70 bg-background/70 font-mono text-[12px] backdrop-blur-sm"
      />
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 w-full gap-2 px-4"
        onClick={copiar}
      >
        <Copy className="h-4 w-4" aria-hidden /> {buttonLabel}
      </Button>
    </div>
  );
}

function qrCodeSeguro(value: string | null | undefined) {
  return Boolean(value?.startsWith("data:image/png;base64,"));
}

function urlBoletoSegura(value: string | null | undefined) {
  if (!value) return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function PixContent({ pagamento }: { pagamento: DadosPagamento }) {
  const pix = pagamento.pix;
  const qrDisponivel = qrCodeSeguro(pix?.qrCode);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Pague com Pix</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          Escaneie o QR Code ou copie o código Pix para realizar o pagamento.
        </p>
      </div>

      <div className="flex items-center justify-center rounded-[18px] border border-border/40 bg-background/60 px-4 py-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-md">
        {qrDisponivel ? (
          <img
            src={pix?.qrCode ?? undefined}
            alt={`QR Code Pix da mensalidade de ${formatReferencia(pagamento.referenceMonth)}`}
            className="h-36 w-36 rounded-[10px] bg-white p-2"
          />
        ) : (
          <div className="flex items-center gap-3 py-1 text-left text-muted-foreground">
            <QrCode className="h-10 w-10 shrink-0" aria-hidden />
            <p className="max-w-[260px] text-[12px] leading-relaxed">
              O QR Code Pix não foi disponibilizado para esta cobrança. Utilize
              o código Pix Copia e Cola abaixo.
            </p>
          </div>
        )}
      </div>

      {pix?.copyPaste ? (
        <CampoCopiavel
          id="pixCopiaCola"
          label="Pix Copia e Cola"
          value={pix.copyPaste}
          buttonLabel="Copiar código Pix"
          successMessage="Código Pix copiado."
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          O código Pix desta cobrança não está disponível.
        </p>
      )}
    </div>
  );
}

function BoletoContent({ pagamento }: { pagamento: DadosPagamento }) {
  const boleto = pagamento.boleto;
  const boletoDisponivel = urlBoletoSegura(boleto?.url);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Pague com boleto
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          Copie a linha digitável ou abra o boleto para pagamento.
        </p>
      </div>

      {boleto?.digitableLine ? (
        <CampoCopiavel
          id="boletoLinhaDigitavel"
          label="Linha digitável"
          value={boleto.digitableLine}
          buttonLabel="Copiar linha digitável"
          successMessage="Linha digitável copiada."
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          A linha digitável desta cobrança não está disponível.
        </p>
      )}

      {boleto?.barcode && (
        <CampoCopiavel
          id="boletoCodigoBarras"
          label="Código de barras"
          value={boleto.barcode}
          buttonLabel="Copiar código de barras"
          successMessage="Código de barras copiado."
        />
      )}

      {boletoDisponivel && boleto?.url && (
        <Button
          type="button"
          variant="glassPrimary"
          className="h-9 w-full gap-2 px-4"
          asChild
        >
          <a href={boleto.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden /> Abrir boleto
          </a>
        </Button>
      )}
    </div>
  );
}

export default function CentralCliente() {
  const queryClient = useQueryClient();
  const [pagamentoDe, setPagamentoDe] = useState<Mensalidade | null>(null);
  const [pagamento, setPagamento] = useState<DadosPagamento | null>(null);
  const [detalhesId, setDetalhesId] = useState<number | null>(null);

  const assinaturaQuery = useQuery({
    queryKey: centralClienteKeys.subscription(),
    queryFn: getMySubscription,
    staleTime: 30_000,
    retry: 1,
  });
  const mensalidadesQuery = useQuery({
    queryKey: centralClienteKeys.invoices(),
    queryFn: getMyInvoices,
    staleTime: 15_000,
    retry: 1,
  });
  const detalhesQuery = useQuery({
    queryKey: centralClienteKeys.invoice(detalhesId ?? 0),
    queryFn: () => getMyInvoice(detalhesId as number),
    enabled: detalhesId !== null,
    staleTime: 0,
    retry: 1,
  });
  const statusPagamentoQuery = useQuery({
    queryKey: centralClienteKeys.invoice(pagamentoDe?.id ?? 0),
    queryFn: () => getMyInvoice(pagamentoDe?.id as number),
    enabled: Boolean(
      pagamentoDe && pagamento && mensalidadePagavel(pagamentoDe.status),
    ),
    staleTime: 0,
    retry: 0,
    refetchInterval: (query) => {
      const mensalidade = query.state.data;
      return mensalidade && mensalidadePagavel(mensalidade.status)
        ? 30_000
        : false;
    },
    refetchIntervalInBackground: false,
  });

  const pagamentoMutation = useMutation({
    mutationFn: getInvoicePayment,
    onSuccess: (dados) => {
      setPagamento(dados);
      void queryClient.invalidateQueries({
        queryKey: centralClienteKeys.invoices(),
      });
    },
    onError: () => {
      toast.error(
        "Não foi possível carregar os dados para pagamento. Tente novamente.",
      );
    },
  });

  useEffect(() => {
    const mensalidadeAtualizada = statusPagamentoQuery.data;
    if (
      !pagamentoDe ||
      !mensalidadeAtualizada ||
      mensalidadeAtualizada.status === pagamentoDe.status
    ) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: centralClienteKeys.invoices(),
    });
    void queryClient.invalidateQueries({
      queryKey: centralClienteKeys.subscription(),
    });

    if (mensalidadeAtualizada.status === "PAGO") {
      toast.success("Pagamento confirmado com sucesso.");
    }
    setPagamentoDe(null);
    setPagamento(null);
  }, [pagamentoDe, queryClient, statusPagamentoQuery.data]);

  const assinatura = assinaturaQuery.data;
  const mensalidades = useMemo(
    () => mensalidadesQuery.data ?? [],
    [mensalidadesQuery.data],
  );
  const gratuito = assinatura ? assinaturaGratuita(assinatura) : false;
  const ordenadas = useMemo(
    () =>
      [...mensalidades].sort((a, b) =>
        b.dataVencimento.localeCompare(a.dataVencimento),
      ),
    [mensalidades],
  );
  const proxima = useMemo(() => {
    const abertas = mensalidades
      .filter((item) => mensalidadePagavel(item.status))
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    return (
      abertas[0] ?? ordenadas.find((item) => item.status === "PAGO") ?? null
    );
  }, [mensalidades, ordenadas]);

  const abrirPagamento = (mensalidade: Mensalidade) => {
    if (pagamentoMutation.isPending) return;
    setPagamentoDe(mensalidade);
    setPagamento(null);
    pagamentoMutation.mutate(mensalidade.id);
  };

  const fecharPagamento = () => {
    setPagamentoDe(null);
    setPagamento(null);
    pagamentoMutation.reset();
  };

  const acaoDaMensalidade = (mensalidade: Mensalidade) => {
    if (mensalidadePagavel(mensalidade.status)) {
      const carregando =
        pagamentoMutation.isPending && pagamentoDe?.id === mensalidade.id;
      return (
        <Button
          type="button"
          variant="glassPrimary"
          className="h-8 gap-2 px-3"
          onClick={() => abrirPagamento(mensalidade)}
          disabled={pagamentoMutation.isPending}
        >
          {carregando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="h-3.5 w-3.5" aria-hidden />
          )}
          {carregando ? "Carregando" : "Pagar"}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        variant="glassSecondary"
        className="h-8 gap-2 px-3"
        onClick={() => setDetalhesId(mensalidade.id)}
      >
        <Receipt className="h-3.5 w-3.5" aria-hidden /> Ver detalhes
      </Button>
    );
  };

  const pixDisponivel = Boolean(
    pagamento?.pix?.copyPaste || pagamento?.pix?.qrCode,
  );
  const boletoDisponivel = Boolean(
    pagamento?.boleto?.digitableLine ||
      pagamento?.boleto?.barcode ||
      pagamento?.boleto?.url,
  );

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <ListPageHeader
          title="Central do Cliente"
          tooltip="Nesta página, sua organização ou iniciativa acompanha as informações da assinatura contratada junto à Aurit. Consulte o plano atual, o valor da mensalidade, a data de início da assinatura, a próxima cobrança prevista e o histórico das mensalidades já geradas. Também é possível acompanhar a situação de cada cobrança e, quando houver pagamento, consultar os respectivos dados."
          objective="Acompanhe em um único lugar as informações da assinatura da sua organização ou iniciativa, desde o plano contratado até as mensalidades, vencimentos, cobranças e pagamentos realizados junto à Aurit."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormSectionCard
            icon={BadgeCheck}
            title="Seu plano"
            description="Consulte as principais informações da assinatura contratada junto à Aurit. Nesta seção são apresentados o plano atual, a situação da assinatura, o valor da mensalidade e a data em que a contratação teve início."
          >
            {assinaturaQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : assinaturaQuery.isError || !assinatura ? (
              <ErroSecao
                mensagem="Não foi possível carregar as informações do seu plano."
                onRetry={() => void assinaturaQuery.refetch()}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-semibold leading-tight text-foreground">
                    {assinatura.tipoPlano === "PLANO_GRATUITO"
                      ? "Plano Gratuito"
                      : assinatura.tipoPlano === "PLANO_CORTESIA"
                        ? "Plano Cortesia"
                        : "Plano Pago"}
                  </h3>
                  <StatusPill
                    status={statusAssinaturaLabels[assinatura.status]}
                    ariaLabelPrefix="Situação da assinatura"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem
                    label="Mensalidade"
                    value={
                      gratuito
                        ? "Gratuito"
                        : assinatura.valorMensalidade === null ||
                            assinatura.valorMensalidade <= 0
                          ? "A definir"
                          : `${formatCurrency(assinatura.valorMensalidade)}/mês`
                    }
                  />
                  {!gratuito && (
                    <InfoItem
                      label="Vencimento"
                      value={
                        assinatura.diaVencimento
                          ? `Todo dia ${assinatura.diaVencimento}`
                          : "—"
                      }
                    />
                  )}
                  {!gratuito && (
                    <InfoItem
                      label="Próxima cobrança"
                      value={formatDate(assinatura.proximaCobranca)}
                    />
                  )}
                  <InfoItem
                    label="Início da assinatura"
                    value={formatDate(assinatura.dataCriacao)}
                  />
                </div>
              </div>
            )}
          </FormSectionCard>

          <FormSectionCard
            icon={CalendarDays}
            title="Próxima mensalidade"
            description="Consulte as informações da próxima mensalidade prevista para sua assinatura. Quando houver cobrança, esta seção apresenta o valor e o vencimento que deverão ser acompanhados pela sua organização ou iniciativa."
          >
            {assinaturaQuery.isLoading || mensalidadesQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-40" />
              </div>
            ) : mensalidadesQuery.isError ? (
              <ErroSecao
                mensagem="Não foi possível carregar suas mensalidades."
                onRetry={() => void mensalidadesQuery.refetch()}
              />
            ) : gratuito ? (
              <div className="flex items-start gap-3 rounded-[14px] border border-primary/20 bg-primary/[0.05] px-4 py-3 backdrop-blur-md">
                <span
                  className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-primary/25 bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Você está no plano gratuito
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Seu plano atual não possui cobrança de mensalidade. Caso a
                    assinatura seja alterada futuramente para um plano pago, as
                    próximas cobranças passarão a ser apresentadas nesta seção.
                  </p>
                </div>
              </div>
            ) : !proxima ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Quando houver cobranças vinculadas à sua assinatura, elas
                aparecerão aqui.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    {formatReferencia(proxima.competencia)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-foreground">
                    {formatCurrency(proxima.valor)}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem
                    label="Vencimento"
                    value={formatDate(proxima.dataVencimento)}
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Situação
                    </p>
                    <div className="mt-1">
                      <StatusPill
                        status={statusMensalidadeLabels[proxima.status]}
                        ariaLabelPrefix="Situação da mensalidade"
                      />
                    </div>
                  </div>
                  {proxima.status === "PAGO" && (
                    <InfoItem
                      label="Pago em"
                      value={formatDate(proxima.dataPagamento)}
                    />
                  )}
                </div>
                {proxima.status === "ATRASADO" && (
                  <div className="flex items-start gap-3 rounded-[14px] border border-border/70 bg-muted/30 px-4 py-3 backdrop-blur-md">
                    <span
                      className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-border/70 bg-background/60 text-muted-foreground"
                      aria-hidden
                    >
                      <Info className="h-3.5 w-3.5" strokeWidth={2.1} />
                    </span>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Esta mensalidade está vencida. Utilize uma das opções
                      abaixo para realizar o pagamento.
                    </p>
                  </div>
                )}
                {mensalidadePagavel(proxima.status) ? (
                  <Button
                    type="button"
                    variant="glassPrimary"
                    className="h-9 w-full gap-2 px-4 sm:w-auto"
                    onClick={() => abrirPagamento(proxima)}
                    disabled={pagamentoMutation.isPending}
                  >
                    {pagamentoMutation.isPending &&
                    pagamentoDe?.id === proxima.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CreditCard className="h-4 w-4" aria-hidden />
                    )}
                    {pagamentoMutation.isPending &&
                    pagamentoDe?.id === proxima.id
                      ? "Carregando..."
                      : "Pagar agora"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 w-full gap-2 px-4 sm:w-auto"
                    onClick={() => setDetalhesId(proxima.id)}
                  >
                    <Receipt className="h-4 w-4" aria-hidden /> Ver detalhes
                  </Button>
                )}
              </div>
            )}
          </FormSectionCard>
        </div>

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
              Mensalidades e pagamentos
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Consulte o histórico das mensalidades relacionadas à sua
              assinatura. Nesta seção você pode acompanhar os valores cobrados,
              as datas de vencimento, a situação de cada mensalidade e
              identificar quais cobranças já foram pagas ou ainda precisam de
              acompanhamento.
            </p>
          </div>
          <DataTableCard>
            {mensalidadesQuery.isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3].map((linha) => (
                  <Skeleton key={linha} className="h-10 w-full" />
                ))}
              </div>
            ) : mensalidadesQuery.isError ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar suas mensalidades.
                </p>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={() => void mensalidadesQuery.refetch()}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
                </Button>
              </div>
            ) : gratuito && ordenadas.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-11 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                  <Sparkles className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Você está no plano gratuito
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                    Seu plano atual não possui cobrança de mensalidade. Caso a
                    assinatura seja alterada futuramente para um plano pago, as
                    próximas cobranças passarão a ser apresentadas nesta seção.
                  </p>
                </div>
              </div>
            ) : ordenadas.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhuma mensalidade encontrada"
                emptyDescription="Quando houver cobranças vinculadas à sua assinatura, elas aparecerão aqui."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        {[
                          "Referência",
                          "Vencimento",
                          "Valor",
                          "Pagamento",
                          "Status",
                          "Ações",
                        ].map((coluna) => (
                          <th
                            key={coluna}
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {coluna}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ordenadas.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={formatReferenciaCurta(item.competencia)}
                              bold
                            >
                              {formatReferenciaCurta(item.competencia)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={formatDate(item.dataVencimento)}
                            >
                              {formatDate(item.dataVencimento)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText text={formatCurrency(item.valor)}>
                              {formatCurrency(item.valor)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <TableCellText
                              text={formatDate(item.dataPagamento)}
                              muted={!item.dataPagamento}
                            >
                              {formatDate(item.dataPagamento)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={statusMensalidadeLabels[item.status]}
                              ariaLabelPrefix="Situação da mensalidade"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            {acaoDaMensalidade(item)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {ordenadas.map((item) => (
                    <div key={item.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatReferenciaCurta(item.competencia)}
                          </p>
                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            Vencimento {formatDate(item.dataVencimento)}
                          </p>
                        </div>
                        <StatusPill
                          status={statusMensalidadeLabels[item.status]}
                          ariaLabelPrefix="Situação da mensalidade"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InfoItem
                          label="Valor"
                          value={formatCurrency(item.valor)}
                        />
                        <InfoItem
                          label="Pagamento"
                          value={formatDate(item.dataPagamento)}
                        />
                      </div>
                      <div>{acaoDaMensalidade(item)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </DataTableCard>
        </section>

        <Dialog
          open={Boolean(pagamentoDe)}
          onOpenChange={(aberto) => !aberto && fecharPagamento()}
        >
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden border-border/60 bg-card/90 backdrop-blur-xl sm:max-h-[85vh]">
            <DialogHeader className="shrink-0">
              <DialogTitle>Pagar mensalidade</DialogTitle>
              <DialogDescription>
                Escolha a forma de pagamento e conclua a cobrança da sua
                assinatura.
              </DialogDescription>
            </DialogHeader>
            {pagamentoDe && (
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pb-1 pr-1">
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-[18px] border border-border/40 bg-background/60 p-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-md sm:grid-cols-3">
                  <InfoItem
                    label="Referência"
                    value={formatReferenciaCurta(pagamentoDe.competencia)}
                  />
                  <InfoItem
                    label="Valor"
                    value={formatCurrency(pagamentoDe.valor)}
                  />
                  <InfoItem
                    label="Vencimento"
                    value={formatDate(pagamentoDe.dataVencimento)}
                  />
                </div>
                {pagamentoMutation.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : pagamentoMutation.isError || !pagamento ? (
                  <ErroSecao
                    mensagem="Não foi possível carregar os dados para pagamento. Tente novamente."
                    onRetry={() => abrirPagamento(pagamentoDe)}
                  />
                ) : !pixDisponivel && !boletoDisponivel ? (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Esta cobrança não possui uma forma de pagamento disponível
                    no momento.
                  </p>
                ) : pixDisponivel && boletoDisponivel ? (
                  <Tabs defaultValue="pix">
                    <TabsList className="grid h-9 w-full grid-cols-2">
                      <TabsTrigger value="pix" className="h-8 gap-2">
                        <QrCode className="h-4 w-4" aria-hidden /> Pix
                      </TabsTrigger>
                      <TabsTrigger value="boleto" className="h-8 gap-2">
                        <FileText className="h-4 w-4" aria-hidden /> Boleto
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="pix">
                      <PixContent pagamento={pagamento} />
                    </TabsContent>
                    <TabsContent value="boleto">
                      <BoletoContent pagamento={pagamento} />
                    </TabsContent>
                  </Tabs>
                ) : pixDisponivel ? (
                  <PixContent pagamento={pagamento} />
                ) : (
                  <BoletoContent pagamento={pagamento} />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={detalhesId !== null}
          onOpenChange={(aberto) => !aberto && setDetalhesId(null)}
        >
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-md flex-col overflow-hidden border-border/60 bg-card/90 backdrop-blur-xl sm:max-h-[85vh]">
            <DialogHeader className="shrink-0">
              <DialogTitle>Detalhes do pagamento</DialogTitle>
              <DialogDescription>
                Consulte todas as informações da mensalidade selecionada. Aqui
                são apresentados os dados da cobrança e, quando o pagamento já
                tiver sido realizado, as informações relacionadas à quitação
                daquela mensalidade.
              </DialogDescription>
            </DialogHeader>
            {detalhesQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-8 w-36" />
              </div>
            ) : detalhesQuery.isError || !detalhesQuery.data ? (
              <ErroSecao
                mensagem="Não foi possível carregar os detalhes da mensalidade."
                onRetry={() => void detalhesQuery.refetch()}
              />
            ) : (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-1 pr-1">
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 rounded-[20px] border border-border/40 bg-background/60 p-5 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-md">
                  <InfoItem
                    label="Referência"
                    value={formatReferenciaCurta(
                      detalhesQuery.data.competencia,
                    )}
                  />
                  <InfoItem
                    label="Valor"
                    value={formatCurrency(detalhesQuery.data.valor)}
                  />
                  <InfoItem
                    label="Vencimento"
                    value={formatDate(detalhesQuery.data.dataVencimento)}
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusPill
                        status={
                          statusMensalidadeLabels[detalhesQuery.data.status]
                        }
                        ariaLabelPrefix="Situação da mensalidade"
                      />
                    </div>
                  </div>
                  {detalhesQuery.data.dataPagamento && (
                    <InfoItem
                      label="Pago em"
                      value={formatDate(detalhesQuery.data.dataPagamento)}
                    />
                  )}
                  {detalhesQuery.data.formaPagamento && (
                    <InfoItem
                      label="Forma de pagamento"
                      value={
                        formaPagamentoLabels[
                          detalhesQuery.data.formaPagamento
                        ] ?? detalhesQuery.data.formaPagamento
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Landmark,
  Loader2,
  MinusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatSignedCurrency,
  origemMovimentacaoLabels,
  statusConciliacaoLabels,
  tipoMovimentacaoLabels,
  type MovimentacaoExtrato,
  type RegistroAurit,
} from "@/data/conciliacaoBancaria";

interface Props {
  movimentacao: MovimentacaoExtrato | null;
  somenteLeitura?: boolean;
  processando?: boolean;
  onConciliar: () => void;
  onIgnorar: () => void;
  onReavaliar: () => void;
  onDesfazer: () => void;
  onLocalizar: () => void;
  onVerOrigem: (registro: RegistroAurit) => void;
  onCriarRegistro: () => void;
}
const primary = "h-9 gap-1.5 px-4 text-[12.5px] font-semibold";
const secondary = "h-9 gap-1.5 px-3.5 text-[12.5px] font-semibold";
function Bloco({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-border/70 bg-background/60 p-3.5 backdrop-blur-sm",
        className,
      )}
    >
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </section>
  );
}
function Linha({
  rotulo,
  banco,
  aurit,
  igual,
}: {
  rotulo: string;
  banco: string;
  aurit: string;
  igual: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-[12.5px]">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="flex items-center gap-1.5 text-right">
        <span className="font-medium text-foreground">{banco}</span>
        <span
          className={cn(
            "text-[11px]",
            igual ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {igual ? "=" : "≠"}
        </span>
        <span className="font-medium text-foreground">{aurit}</span>
      </span>
    </div>
  );
}
function Registro({ registro }: { registro: RegistroAurit }) {
  return (
    <div className="space-y-1">
      <p className="text-[14px] font-semibold text-foreground">
        {registro.historico}
      </p>
      <Badge
        variant="outline"
        className="rounded-full border-border/70 bg-muted/40 text-[11px] font-normal"
      >
        {origemMovimentacaoLabels[registro.origemMovimentacao] ?? "Ajuste"}
      </Badge>
      <div className="pt-1 text-[12.5px] text-muted-foreground">
        <p>{formatDate(registro.dataMovimentacao)}</p>
        <p className="font-medium text-foreground">
          {formatCurrency(registro.valor)}
        </p>
        {registro.contaBancariaId && (
          <p className="flex items-center gap-1.5 pt-0.5">
            <Landmark className="h-3 w-3" />
            Conta bancária vinculada
          </p>
        )}
      </div>
    </div>
  );
}

export function PainelConciliacao({
  movimentacao,
  somenteLeitura = false,
  processando = false,
  onConciliar,
  onIgnorar,
  onReavaliar,
  onDesfazer,
  onLocalizar,
  onVerOrigem,
  onCriarRegistro,
}: Props) {
  const [ignorar, setIgnorar] = useState(false);
  const [desfazer, setDesfazer] = useState(false);
  if (!movimentacao)
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-[14px] border border-border/70 bg-card/70 px-6 py-14 text-center backdrop-blur-md">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
          <Search className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Selecione uma movimentação
        </p>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Escolha uma movimentação do extrato para comparar com os registros da
          Aurit e resolver a conciliação.
        </p>
      </div>
    );
  const status = movimentacao.statusConciliacao;
  const registro =
    movimentacao.movimentacaoVinculada ??
    movimentacao.movimentacaoSugerida ??
    null;
  const entrada = movimentacao.tipoMovimentacao === "ENTRADA";
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
  const mesmaData =
    !!registro && registro.dataMovimentacao === movimentacao.dataMovimentacao;
  const mesmoValor =
    !!registro && Math.abs(registro.valor - movimentacao.valor) < 0.005;
  const mesmoTipo =
    !!registro && registro.tipoMovimentacao === movimentacao.tipoMovimentacao;
  return (
    <div className="space-y-3.5 rounded-[14px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill status={statusConciliacaoLabels[status]} size="md" />
        {processando && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>
      <Bloco titulo="Movimentação do banco">
        <p className="text-[14px] font-semibold text-foreground">
          {movimentacao.historicoBancario}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
          <span>{formatDate(movimentacao.dataMovimentacao)}</span>
          <span className="flex items-center gap-1">
            <Icone
              className={cn(
                "h-3 w-3",
                entrada ? "text-emerald-600" : "text-rose-600",
              )}
            />
            {tipoMovimentacaoLabels[movimentacao.tipoMovimentacao]}
          </span>
          {movimentacao.numeroDocumento && (
            <span>Documento {movimentacao.numeroDocumento}</span>
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 text-[18px] font-semibold",
            entrada ? "text-emerald-700" : "text-foreground",
          )}
        >
          {formatSignedCurrency(
            movimentacao.valor,
            movimentacao.tipoMovimentacao,
          )}
        </p>
      </Bloco>
      {status === "SUGERIDA" && registro && (
        <>
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Correspondência encontrada
          </div>
          <Bloco
            titulo="Registro na Aurit"
            className="border-sky-200/70 bg-sky-50/50"
          >
            <Registro registro={registro} />
          </Bloco>
          <Bloco titulo="Comparação">
            <Linha
              rotulo="Data"
              banco={formatDate(movimentacao.dataMovimentacao)}
              aurit={formatDate(registro.dataMovimentacao)}
              igual={mesmaData}
            />
            <Linha
              rotulo="Valor"
              banco={formatCurrency(movimentacao.valor)}
              aurit={formatCurrency(registro.valor)}
              igual={mesmoValor}
            />
            <Linha
              rotulo="Tipo"
              banco={tipoMovimentacaoLabels[movimentacao.tipoMovimentacao]}
              aurit={tipoMovimentacaoLabels[registro.tipoMovimentacao]}
              igual={mesmoTipo}
            />
          </Bloco>
        </>
      )}
      {status === "PENDENTE" && (
        <Bloco titulo="Registro na Aurit">
          <p className="text-[13px] font-semibold text-foreground">
            Nenhuma correspondência encontrada
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            A Aurit não encontrou uma movimentação correspondente para este
            lançamento do extrato.
          </p>
        </Bloco>
      )}
      {status === "DIVERGENTE" && (
        <>
          <Bloco
            titulo="Registro encontrado na Aurit"
            className="border-amber-200/70 bg-amber-50/50"
          >
            {registro ? (
              <Registro registro={registro} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Registro não informado.
              </p>
            )}
          </Bloco>
          <Bloco titulo="Divergências">
            <p className="text-[13px] font-medium text-amber-700">
              Existem dados divergentes nesta correspondência.
            </p>
            {registro && (
              <div className="mt-1 space-y-0.5 text-[12.5px] text-muted-foreground">
                <p>
                  Banco:{" "}
                  <span className="text-foreground">
                    {formatCurrency(movimentacao.valor)} em{" "}
                    {formatDate(movimentacao.dataMovimentacao)}
                  </span>
                </p>
                <p>
                  Aurit:{" "}
                  <span className="text-foreground">
                    {formatCurrency(registro.valor)} em{" "}
                    {formatDate(registro.dataMovimentacao)}
                  </span>
                </p>
              </div>
            )}
          </Bloco>
        </>
      )}
      {status === "CONCILIADA" && (
        <>
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Conciliação confirmada
          </div>
          <Bloco
            titulo="Registro na Aurit"
            className="border-emerald-200/70 bg-emerald-50/50"
          >
            {registro ? (
              <Registro registro={registro} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Registro vinculado não informado.
              </p>
            )}
          </Bloco>
        </>
      )}
      {status === "IGNORADA" && (
        <Bloco titulo="Situação">
          <p className="text-[13px] font-semibold text-foreground">Ignorada</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Esta movimentação foi marcada para não ser conciliada.
          </p>
        </Bloco>
      )}
      {(!somenteLeitura || status === "CONCILIADA") && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {status === "SUGERIDA" && (
            <>
              <Button
                variant="glassPrimary"
                className={primary}
                onClick={onConciliar}
                disabled={processando}
              >
                Conciliar
              </Button>
              <Button
                variant="glassSecondary"
                className={secondary}
                onClick={onLocalizar}
                disabled={processando}
              >
                Localizar outra movimentação
              </Button>
              <Button
                variant="glassDanger"
                className={secondary}
                onClick={() => setIgnorar(true)}
                disabled={processando}
              >
                <MinusCircle className="h-3.5 w-3.5" />
                Ignorar
              </Button>
            </>
          )}
          {status === "PENDENTE" && (
            <>
              <Button
                variant="glassPrimary"
                className={primary}
                onClick={onLocalizar}
                disabled={processando}
              >
                Localizar movimentação
              </Button>
              <Button
                variant="glassSecondary"
                className={secondary}
                onClick={onCriarRegistro}
                disabled={processando}
              >
                Criar{" "}
                {movimentacao.tipoMovimentacao === "SAIDA"
                  ? "conta a pagar"
                  : "conta a receber"}
              </Button>
              <Button
                variant="glassDanger"
                className={secondary}
                onClick={() => setIgnorar(true)}
                disabled={processando}
              >
                <MinusCircle className="h-3.5 w-3.5" />
                Ignorar
              </Button>
            </>
          )}
          {status === "DIVERGENTE" && (
            <>
              {registro && (
                <Button
                  variant="glassSecondary"
                  className={secondary}
                  onClick={() => onVerOrigem(registro)}
                  disabled={processando}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver registro de origem
                </Button>
              )}
              <Button
                variant="glassSecondary"
                className={secondary}
                onClick={onLocalizar}
                disabled={processando}
              >
                Localizar outra movimentação
              </Button>
              <Button
                variant="glassSecondary"
                className={secondary}
                onClick={onReavaliar}
                disabled={processando}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reavaliar correspondência
              </Button>
              <Button
                variant="glassDanger"
                className={secondary}
                onClick={() => setIgnorar(true)}
                disabled={processando}
              >
                <MinusCircle className="h-3.5 w-3.5" />
                Ignorar
              </Button>
            </>
          )}
          {status === "CONCILIADA" && (
            <>
              {registro && (
                <Button
                  variant="glassSecondary"
                  className={secondary}
                  onClick={() => onVerOrigem(registro)}
                  disabled={processando}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver origem
                </Button>
              )}
              <Button
                variant="glassDanger"
                className={secondary}
                onClick={() => setDesfazer(true)}
                disabled={processando}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Desfazer conciliação
              </Button>
            </>
          )}
          {status === "IGNORADA" && (
            <Button
              variant="glassSecondary"
              className={secondary}
              onClick={onReavaliar}
              disabled={processando}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reavaliar
            </Button>
          )}
        </div>
      )}
      <AlertDialog open={ignorar} onOpenChange={setIgnorar}>
        <AlertDialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Ignorar esta movimentação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              A movimentação continuará registrada no extrato, mas não será
              vinculada a um registro financeiro da Aurit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onIgnorar}>
              Ignorar movimentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={desfazer} onOpenChange={setDesfazer}>
        <AlertDialogContent className="rounded-[16px] border-border/70 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Deseja desfazer esta conciliação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              O registro financeiro não será excluído. Apenas o vínculo com esta
              movimentação do extrato será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDesfazer}>
              Desfazer conciliação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

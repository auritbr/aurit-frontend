import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Filter,
  Minus,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import {
  calcularVariacao,
  formatarPeriodo,
  periodoComparacao,
  periodoValido,
  textoVariacao,
  type ModoComparacao,
  type Periodo,
  type SentidoIndicador,
} from "@/lib/periodComparison";
import { filterFieldClass } from "./ReportKit";
export function FilteredByBanner({
  label,
  count,
  onClear,
}: {
  label: string | null;
  count?: number;
  onClear: () => void;
}) {
  return !label ? null : (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-primary/25 bg-primary/5 px-3 py-2 text-[12.5px]"
    >
      <span className="inline-flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-primary" aria-hidden />
        Tabela filtrada pelo indicador <strong>{label}</strong>
        {count !== undefined && ` · ${count} registro(s)`}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        <X className="mr-1 h-3.5 w-3.5" aria-hidden />
        Limpar filtro do indicador
      </Button>
    </div>
  );
}
export function useIndicadorFiltro<K extends string>() {
  const [ativo, setAtivo] = useState<K | null>(null);
  return {
    ativo,
    setAtivo,
    alternar: (k: K) => setAtivo((a) => (a === k ? null : k)),
    limpar: () => setAtivo(null),
  };
}
export interface DrillColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}
export interface DrillState<T> {
  titulo: string;
  descricao?: string;
  rows: T[];
}
export function useDrillDown<T>() {
  const [estado, abrir] = useState<DrillState<T> | null>(null);
  return { estado, abrir, fechar: () => abrir(null) };
}
export function DrillDownSheet<T>({
  estado,
  onClose,
  columns,
  rowKey,
}: {
  estado: DrillState<T> | null;
  onClose: () => void;
  columns: DrillColumn<T>[];
  rowKey: (row: T, i: number) => string;
}) {
  const rows = estado?.rows ?? [];
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(rows, 10, estado);
  return (
    <Sheet
      open={!!estado}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <SheetTitle>{estado?.titulo}</SheetTitle>
          <SheetDescription>
            {estado?.descricao ??
              "Registros que compõem este resultado, considerando os filtros aplicados."}{" "}
            {rows.length} registro(s).
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          {!rows.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r, i) => (
                  <TableRow key={rowKey(r, (currentPage - 1) * pageSize + i)}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>{c.render(r)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {!!rows.length && (
          <div className="border-t px-3 py-2">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={rows.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
        <div className="border-t p-3">
          <Button
            type="button"
            variant="glassSecondary"
            className="w-full"
            onClick={onClose}
          >
            Voltar ao gráfico
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
export interface ComparacaoConfig {
  ativo: boolean;
  modo: ModoComparacao;
  personalizado: Periodo;
}
export const comparacaoInicial: ComparacaoConfig = {
  ativo: false,
  modo: "anterior",
  personalizado: { inicio: "", fim: "" },
};
export function usePeriodoComparacao(
  principal: Partial<Periodo> | null,
  cfg: ComparacaoConfig,
) {
  return useMemo(
    () =>
      cfg.ativo
        ? periodoComparacao(principal, cfg.modo, cfg.personalizado)
        : null,
    [principal, cfg],
  );
}
function DatasComparacao({
  idPrefix,
  periodo,
  onChange,
  labels,
  rotulo,
}: {
  idPrefix: string;
  periodo: Periodo;
  onChange: (p: Periodo) => void;
  labels: readonly [string, string];
  rotulo?: string;
}) {
  if (rotulo) {
    return (
      <div
        role="group"
        aria-label={rotulo}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs text-muted-foreground">{rotulo}:</span>
        <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto">
          {(["inicio", "fim"] as const).map((campo, index) => (
            <Fragment key={campo}>
              {index === 1 && (
                <span aria-hidden className="text-xs text-muted-foreground">
                  a
                </span>
              )}
              <Input
                id={`${idPrefix}-${campo}`}
                type="date"
                aria-label={labels[index]}
                className={cn(
                  filterFieldClass,
                  "min-w-0 flex-1 px-2 text-sm sm:w-[150px] sm:flex-none sm:px-3 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0",
                )}
                value={periodo[campo]}
                onChange={(event) =>
                  onChange({ ...periodo, [campo]: event.target.value })
                }
              />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }
  return (
    <>
      {(["inicio", "fim"] as const).map((campo, index) => {
        const id = `${idPrefix}-${campo}`;
        return (
          <div key={campo} className="min-w-0 space-y-1.5">
            <Label htmlFor={id} className="text-[12.5px]">
              {labels[index]}
            </Label>
            <Input
              id={id}
              type="date"
              className={filterFieldClass}
              value={periodo[campo]}
              onChange={(event) =>
                onChange({ ...periodo, [campo]: event.target.value })
              }
            />
          </div>
        );
      })}
    </>
  );
}

export function PainelComparacao({
  idPrefix,
  comparacao,
  onChange,
  principal,
  className,
  children,
}: {
  idPrefix: string;
  comparacao: ComparacaoConfig;
  onChange: (c: ComparacaoConfig) => void;
  principal?: { periodo: Periodo; onChange: (p: Periodo) => void };
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Comparar períodos"
      className={cn(
        "min-w-0 space-y-3 rounded-[14px] border border-border/70 bg-card/75 p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2">
          <Switch
            id={`${idPrefix}-cmp`}
            className="max-md:!min-h-0"
            checked={comparacao.ativo}
            onCheckedChange={(ativo) => onChange({ ...comparacao, ativo })}
          />
          <Label
            htmlFor={`${idPrefix}-cmp`}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-primary" aria-hidden />
            Comparar períodos
          </Label>
        </div>
        {comparacao.ativo && (
          <Select
            value={comparacao.modo}
            onValueChange={(modo) =>
              onChange({ ...comparacao, modo: modo as ModoComparacao })
            }
          >
            <SelectTrigger
              className={buttonVariants({
                variant: "glassSecondary",
                className:
                  "h-auto min-h-9 w-full min-w-0 max-w-full justify-between gap-2.5 px-4 py-2 text-left text-sm leading-tight sm:w-fit [&>span]:line-clamp-none [&>span]:whitespace-normal",
              })}
              aria-label="Tipo de comparação"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[13px] border-border/70 bg-popover/95 backdrop-blur-md">
              <SelectItem value="anterior">
                Período anterior equivalente
              </SelectItem>
              <SelectItem value="anoAnterior">
                Mesmo período do ano anterior
              </SelectItem>
              <SelectItem value="personalizado">
                Período personalizado
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {comparacao.ativo && principal && (
        <DatasComparacao
          idPrefix={`${idPrefix}-principal`}
          periodo={principal.periodo}
          onChange={principal.onChange}
          labels={["Início do período principal", "Fim do período principal"]}
          rotulo="Período principal"
        />
      )}
      {comparacao.ativo && comparacao.modo === "personalizado" && (
        <DatasComparacao
          idPrefix={`${idPrefix}-personalizado`}
          periodo={comparacao.personalizado}
          onChange={(personalizado) =>
            onChange({ ...comparacao, personalizado })
          }
          labels={["Início da comparação", "Fim da comparação"]}
          rotulo="Período comparado"
        />
      )}
      {comparacao.ativo && children}
    </section>
  );
}

export function AvisoComparacao({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-[13px] border border-dashed border-border/70 bg-background/50 px-3 py-3 text-[12.5px] leading-relaxed text-muted-foreground shadow-[0_1px_3px_-2px_hsl(215_28%_17%_/_0.12)] backdrop-blur-md"
    >
      {children}
    </p>
  );
}

export const avisoPeriodoPrincipal =
  "Informe o início e o fim do período principal para calcular a comparação.";

export function ReferenciaComparacao({ referencia }: { referencia: string }) {
  return (
    <p className="text-[11.5px] text-muted-foreground">
      Data de referência: {referencia}. Os demais filtros do relatório são
      respeitados; a tabela mantém os filtros aplicados.
    </p>
  );
}

export function PeriodoComparacaoFields({
  periodo,
  onPeriodoChange,
  comparacao,
  onComparacaoChange,
  idPrefix,
}: {
  periodo: Periodo;
  onPeriodoChange: (p: Periodo) => void;
  comparacao: ComparacaoConfig;
  onComparacaoChange: (c: ComparacaoConfig) => void;
  idPrefix: string;
}) {
  return (
    <>
      <DatasComparacao
        idPrefix={idPrefix}
        periodo={periodo}
        onChange={onPeriodoChange}
        labels={["Período — início", "Período — fim"]}
      />
      <PainelComparacao
        idPrefix={idPrefix}
        comparacao={comparacao}
        onChange={onComparacaoChange}
        className="col-span-full"
      >
        {!periodoValido(periodo) ? (
          <AvisoComparacao>{avisoPeriodoPrincipal}</AvisoComparacao>
        ) : comparacao.modo === "personalizado" &&
          !periodoValido(comparacao.personalizado) ? (
          <AvisoComparacao>
            Informe um período de comparação válido.
          </AvisoComparacao>
        ) : null}
      </PainelComparacao>
    </>
  );
}
export function ComparacaoResumo({
  principal,
  comparado,
}: {
  principal: Periodo | null;
  comparado: Periodo | null;
}) {
  return comparado ? (
    <p className="mb-3 text-xs text-muted-foreground">
      Comparando{" "}
      <strong>
        {principal ? formatarPeriodo(principal) : "período selecionado"}
      </strong>{" "}
      com <strong>{formatarPeriodo(comparado)}</strong>.
    </p>
  ) : null;
}
export function VariacaoLinha({
  atual,
  anterior,
  sentido = "neutro",
  tipo = "numero",
  formatAnterior,
}: {
  atual: number;
  anterior: number | null;
  sentido?: SentidoIndicador;
  tipo?: "numero" | "percentual";
  formatAnterior?: (v: number) => string;
}) {
  if (anterior === null) return null;
  const v = calcularVariacao(atual, anterior, sentido),
    Icon =
      v.tendencia === "alta"
        ? ArrowUpRight
        : v.tendencia === "queda"
          ? ArrowDownRight
          : Minus;
  return (
    <p
      className={cn(
        "mt-0.5 flex items-center gap-1 text-[11px]",
        v.tom === "positivo"
          ? "text-emerald-700 dark:text-emerald-300"
          : v.tom === "negativo"
            ? "text-rose-700 dark:text-rose-300"
            : "text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {textoVariacao(v, tipo)} · antes{" "}
      {formatAnterior
        ? formatAnterior(anterior)
        : anterior.toLocaleString("pt-BR")}
    </p>
  );
}
export interface SerieComparadaDatum {
  name: string;
  atual: number | null;
  comparado?: number | null;
}
export function ReportComparedLineChart({
  data,
  formatValue,
  labelAtual = "Período principal",
  labelComparado = "Período comparado",
  onSelect,
}: {
  data: SerieComparadaDatum[];
  formatValue?: (v: number) => string;
  labelAtual?: string;
  labelComparado?: string;
  onSelect?: (name: string) => void;
}) {
  if (!data.some((d) => d.atual !== null || d.comparado != null))
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Sem dados para exibir com os filtros aplicados.
      </div>
    );
  const comparado = data.some((d) => d.comparado != null),
    tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 6, right: 10, left: -14, bottom: 4 }}
        onClick={
          onSelect
            ? (e) => {
                if (e?.activeLabel != null) onSelect(String(e.activeLabel));
              }
            : undefined
        }
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatValue ? formatValue(value) : value.toLocaleString("pt-BR"),
            name,
          ]}
          contentStyle={{
            borderRadius: 12,
            background: "hsl(var(--card))",
            fontSize: 12,
          }}
        />
        {comparado && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Line
          type="monotone"
          dataKey="atual"
          name={labelAtual}
          stroke="hsl(var(--primary))"
          strokeWidth={2.2}
          dot={{ r: 3 }}
        />
        {comparado && (
          <Line
            type="monotone"
            dataKey="comparado"
            name={labelComparado}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 4"
            strokeWidth={1.8}
            dot={{ r: 2.5 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
export function IndisponivelInfo({
  titulo,
  motivo,
}: {
  titulo: string;
  motivo: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-[12.5px] font-medium">{titulo}</p>
      <p className="max-w-sm text-[11.5px] text-muted-foreground">{motivo}</p>
    </div>
  );
}
export interface SelecaoGrafico {
  campo: string;
  rotulo: string;
  valor: string;
}
export function useSelecaoGrafico() {
  const [selecao, setSelecao] = useState<SelecaoGrafico | null>(null);
  return {
    selecao,
    selecionar: (campo: string, rotulo: string) => (valor: string) =>
      setSelecao((s) =>
        s?.campo === campo && s.valor === valor
          ? null
          : { campo, rotulo, valor },
      ),
    limpar: () => setSelecao(null),
  };
}
export function SelecaoGraficoBanner({
  selecao,
  count,
  onClear,
}: {
  selecao: SelecaoGrafico | null;
  count?: number;
  onClear: () => void;
}) {
  return (
    <FilteredByBanner
      label={selecao ? `${selecao.rotulo} = ${selecao.valor}` : null}
      count={count}
      onClear={onClear}
    />
  );
}

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Inbox } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  formatDateBR,
  formatValorRelatorio,
  type GrupoRelatorio,
  type Indicador,
  type LinhaRelatorio,
} from "@/data/relatorios";

interface RelatorioHeaderProps {
  title: string;
  tooltip: string;
  description: string;
  nomeEmpresa?: string;
  dataGeracao?: string;
  onRefresh: () => void;
  loading?: boolean;
  extraActions?: ReactNode;
}

export function RelatorioHeader({
  title,
  tooltip,
  description,
  nomeEmpresa,
  dataGeracao,
  onRefresh,
  loading,
  extraActions,
}: RelatorioHeaderProps) {
  return (
    <>
      <div className="mb-3">
        <Link
          to="/relatorios"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Relatórios
        </Link>
      </div>

      <PageTitle
        title={title}
        tooltip={tooltip}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {extraActions}

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar Relatório
            </Button>
          </div>
        }
      />

      <section className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {(nomeEmpresa || dataGeracao) && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {nomeEmpresa && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Organização
                </p>

                <p className="font-medium text-foreground">{nomeEmpresa}</p>
              </div>
            )}

            {dataGeracao && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Data de geração
                </p>

                <p className="font-medium text-foreground">
                  {formatDateBR(dataGeracao)}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

interface IndicadorCardProps {
  indicador: Indicador;
}

export function IndicadorCard({ indicador }: IndicadorCardProps) {
  const valor = formatValorRelatorio(indicador.valor, indicador.chave);

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-sm">
      <p className="text-[11px] font-medium leading-tight text-muted-foreground">
        {indicador.label}
      </p>

      <p className="mt-1.5 break-words text-base font-semibold text-foreground sm:text-lg">
        {valor}
      </p>
    </div>
  );
}

interface GrupoIndicadoresProps {
  grupo: GrupoRelatorio;
}

export function GrupoIndicadores({ grupo }: GrupoIndicadoresProps) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-sm font-semibold tracking-tight text-foreground">
        {grupo.titulo}
      </h2>

      {grupo.indicadores.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum indicador disponível.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {grupo.indicadores.map((ind, i) => (
            <IndicadorCard key={`${ind.chave}-${i}`} indicador={ind} />
          ))}
        </div>
      )}
    </section>
  );
}

interface LinhaRelatorioCardProps {
  linha: LinhaRelatorio;
  highlight?: boolean;
}

export function LinhaRelatorioCard({
  linha,
  highlight,
}: LinhaRelatorioCardProps) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 ${
        highlight ? "border-destructive/40" : "border-border"
      }`}
    >
      <h3
        className={`text-sm font-semibold tracking-tight ${
          highlight ? "text-destructive" : "text-foreground"
        }`}
      >
        {linha.titulo}
      </h3>

      {linha.descricao && (
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
          {linha.descricao}
        </p>
      )}

      {linha.indicadores?.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {linha.indicadores.map((ind, i) => (
            <div
              key={`${ind.chave}-${i}`}
              className="rounded border border-border/70 bg-background px-2.5 py-1.5"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {ind.label}
              </p>

              <p className="break-words text-xs font-medium text-foreground">
                {formatValorRelatorio(ind.valor, ind.chave)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SecaoLinhasRelatorioProps {
  titulo: string;
  items?: LinhaRelatorio[];
  emptyMessage?: string;
  highlight?: (linha: LinhaRelatorio) => boolean;
}

export function SecaoLinhasRelatorio({
  titulo,
  items,
  emptyMessage = "Nenhum registro encontrado para esta seção.",
  highlight,
}: SecaoLinhasRelatorioProps) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-sm font-semibold tracking-tight text-foreground">
        {titulo}
      </h2>

      {!items || items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <Inbox className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />

          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((linha, i) => (
            <LinhaRelatorioCard
              key={i}
              linha={linha}
              highlight={highlight?.(linha)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function RelatorioLoading({
  children = "Carregando relatório...",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />

      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function RelatorioFooterNote() {
  return null;
}

export { AppLayout };
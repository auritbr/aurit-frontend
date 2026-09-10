import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { useSessionBoolean } from "@/components/AdvancedSearchPanel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { isPlanoAccessDenied } from "@/lib/access";
import { getTipoPlanoAtual, isPlanoPagoOuCortesia } from "@/lib/plano";
import type { RelatorioCatalogoItem } from "@/data/relatoriosCatalogo";
import {
  RELATORIOS_AREA_DESTAQUE,
  RELATORIOS_AREAS_TODAS,
  type RelatorioAreaGrupo,
} from "@/data/relatoriosCentral";

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function plural(qtd: number) {
  return qtd === 1 ? "1 relatório" : `${qtd} relatórios`;
}

function PlanoBadge({ plano }: { plano: RelatorioCatalogoItem["plano"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-tight",
        plano === "gratis"
          ? "border-primary/20 bg-primary-soft text-primary"
          : "border-border/70 bg-muted/60 text-muted-foreground",
      )}
    >
      {plano === "gratis" ? "Disponível em todos os planos" : "Plano pago"}
    </span>
  );
}

function RelatorioItem({ item }: { item: RelatorioCatalogoItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={`/relatorios/${item.slug}`}
      className="group flex min-w-0 flex-col gap-2 rounded-[14px] border border-border/60 bg-card/35 px-3 py-3 transition-colors duration-200 hover:border-primary/20 hover:bg-card/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-primary/15 bg-primary-soft transition-colors group-hover:border-primary/30">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-[13.5px] font-semibold leading-snug tracking-tight text-foreground">
              {item.title}
            </h4>
            <PlanoBadge plano={item.plano} />
          </div>
          <p className="mt-1 text-[12px] leading-[1.5] text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 self-start rounded-[10px] border border-primary/25 bg-primary-soft/70 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 sm:ml-[38px]">
        Abrir relatório
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

function ItensGrid({ itens }: { itens: RelatorioCatalogoItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {itens.map((item) => (
        <RelatorioItem key={item.slug} item={item} />
      ))}
    </div>
  );
}

function AreaCard({
  grupo,
  forcarAberto = false,
}: {
  grupo: RelatorioAreaGrupo;
  forcarAberto?: boolean;
}) {
  const [aberto, setAberto] = useSessionBoolean(
    `relatorios-central:${grupo.id}`,
    false,
  );
  const expandido = forcarAberto || aberto;
  const painelId = `area-relatorios-${grupo.id}`;
  const Icon = grupo.icon;

  return (
    <section className="journey-glass min-w-0 rounded-[18px]">
      <h3>
        <button
          type="button"
          aria-expanded={expandido}
          aria-controls={painelId}
          onClick={() => !forcarAberto && setAberto(!aberto)}
          disabled={forcarAberto}
          className="flex w-full items-start gap-3 rounded-[18px] px-4 py-4 text-left transition-colors duration-200 hover:bg-card/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:hover:bg-transparent sm:px-5 motion-reduce:transition-none"
        >
          <span className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-primary/15 bg-primary-soft">
            <Icon
              className="h-[17px] w-[17px] text-primary"
              strokeWidth={2.2}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
                {grupo.titulo}
              </span>
              <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                {plural(grupo.itens.length)}
              </span>
            </span>
            <span className="mt-1 block text-[12.5px] leading-[1.5] text-muted-foreground">
              {grupo.descricao}
            </span>
          </span>
          {!forcarAberto && (
            <span className="mt-[3px] flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="hidden sm:inline">
                {expandido ? "Recolher" : "Expandir"}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                  expandido && "rotate-180",
                )}
              />
            </span>
          )}
        </button>
      </h3>
      {expandido && (
        <div
          id={painelId}
          className="animate-in fade-in-0 slide-in-from-top-1 border-t border-border/50 px-2 pb-3 pt-2 duration-200 motion-reduce:animate-none sm:px-3"
        >
          <ItensGrid itens={grupo.itens} />
        </div>
      )}
    </section>
  );
}

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [planoPremium, setPlanoPremium] = useState(false);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [busca, setBusca] = useState("");
  const podeVisualizar = permissoes.VISUALIZAR;

  const areasVisiveis = useMemo(
    () =>
      RELATORIOS_AREAS_TODAS.map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter(
          (item) => planoPremium || item.plano === "gratis",
        ),
      })).filter((grupo) => grupo.itens.length > 0),
    [planoPremium],
  );
  const destaque = areasVisiveis.find(
    (grupo) => grupo.id === RELATORIOS_AREA_DESTAQUE?.id,
  );
  const demaisAreas = areasVisiveis.filter(
    (grupo) => grupo.id !== destaque?.id,
  );
  const termo = normalizar(busca.trim());
  const resultados = useMemo(() => {
    if (!termo) return [];
    return areasVisiveis
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter((item) =>
          normalizar(
            `${item.title} ${item.description} ${grupo.titulo}`,
          ).includes(termo),
        ),
      }))
      .filter((grupo) => grupo.itens.length > 0);
  }, [areasVisiveis, termo]);
  const totalEncontrados = resultados.reduce(
    (acc, grupo) => acc + grupo.itens.length,
    0,
  );
  const buscando = termo.length > 0;

  useEffect(() => {
    let active = true;
    async function carregarAcesso() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);
        setPlanoPremium(false);
        const permissoesData =
          await getPermissoesUsuarioLogadoPorModulo("RELATORIOS");
        if (!active) return;
        setPermissoes(permissoesData);
        if (!permissoesData.VISUALIZAR) return;
        const tipoPlano = await getTipoPlanoAtual();
        if (active) setPlanoPremium(isPlanoPagoOuCortesia(tipoPlano));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao verificar acesso aos relatórios.";
        if (!active) return;
        if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
        else toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void carregarAcesso();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <PageTitle
            title="Relatórios"
            tooltip="Acesse os relatórios disponíveis para o seu plano."
          />
          <div className="journey-glass rounded-[18px] p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Carregando relatórios...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!podeVisualizar)
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  if (accessDeniedMessage)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Relatórios"
          tooltip="Central de relatórios da organização, organizada por área de gestão. Cada relatório possui sua própria página com tabela completa, busca, seleção de colunas, paginação e exportações em CSV, Excel e PDF."
        />
        <PageObjective
          className="mb-4"
          description="Consulte os relatórios da organização por área de gestão. Selecione um tema para visualizar os relatórios disponíveis, acompanhar informações consolidadas e exportar os dados conforme sua necessidade."
        />
        <div className="journey-glass mb-6 rounded-[16px] p-3 sm:p-3.5">
          <label htmlFor="busca-relatorio" className="sr-only">
            Pesquisar relatório
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="busca-relatorio"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar relatório"
              className="h-10 rounded-[12px] border-border/60 bg-card/60 pl-9 pr-9 text-[13px] backdrop-blur-md placeholder:text-muted-foreground/80 supports-[backdrop-filter]:bg-card/50"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {buscando && (
            <p
              aria-live="polite"
              className="mt-2 px-1 text-[12px] font-medium text-muted-foreground"
            >
              {totalEncontrados === 0
                ? "Nenhum relatório encontrado"
                : `${plural(totalEncontrados)} ${totalEncontrados === 1 ? "encontrado" : "encontrados"}`}
            </p>
          )}
        </div>
        {areasVisiveis.length === 0 ? (
          <div className="journey-glass rounded-[18px] p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhum relatório disponível para este plano.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
              Quando houver relatórios liberados para o seu plano, eles
              aparecerão aqui.
            </p>
          </div>
        ) : buscando ? (
          totalEncontrados === 0 ? (
            <div className="journey-glass flex flex-col items-center gap-2 rounded-[18px] px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-border/60 bg-muted/40">
                <SearchX className="h-5 w-5 text-muted-foreground" />
              </span>
              <p className="text-[14px] font-semibold text-foreground">
                Nenhum relatório encontrado
              </p>
              <p className="max-w-md text-[12.5px] leading-[1.5] text-muted-foreground">
                Revise o termo pesquisado ou consulte os relatórios por área.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resultados.map((grupo) => {
                const Icon = grupo.icon;
                return (
                  <section
                    key={grupo.id}
                    className="journey-glass min-w-0 rounded-[18px]"
                    aria-labelledby={`busca-grupo-${grupo.id}`}
                  >
                    <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary-soft">
                        <Icon
                          className="h-4 w-4 text-primary"
                          strokeWidth={2.2}
                        />
                      </span>
                      <h3
                        id={`busca-grupo-${grupo.id}`}
                        className="text-[14px] font-semibold leading-tight tracking-tight text-foreground"
                      >
                        {grupo.titulo}
                      </h3>
                      <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                        {plural(grupo.itens.length)}
                      </span>
                    </div>
                    <div className="px-2 pb-3 pt-2 sm:px-3">
                      <ItensGrid itens={grupo.itens} />
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {destaque && <AreaCard grupo={destaque} forcarAberto />}
            {demaisAreas.map((grupo) => (
              <AreaCard key={grupo.id} grupo={grupo} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

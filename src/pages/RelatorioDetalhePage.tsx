import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import {
  GrupoIndicadores,
  RelatorioHeader,
  RelatorioLoading,
} from "@/components/relatorios/RelatorioComponents";
import { RelatorioDataTable } from "@/components/relatorios/RelatorioDataTable";
import { RelatorioDetalheCharts } from "@/components/relatorios/RelatorioDetalheCharts";
import { findRelatorioBySlug } from "@/data/relatoriosCatalogo";
import {
  formatDateBR,
  formatValorRelatorio,
  getRelatorioDetalhado,
  RelatorioIndisponivelError,
  resolveRelatorioSlug,
  type RelatorioColunaMeta,
  type RelatorioDetalhadoResponse,
} from "@/data/relatorios";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import type { RelatorioColumn } from "@/lib/relatorioExports";
import {
  configureGenericReportColumns,
  isDefaultGenericReportColumn,
} from "@/report/general/reportColumnConfig";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";

type Row = Record<string, unknown>;

export default function RelatorioDetalhePage() {
  const { slug: rawSlug = "" } = useParams<{ slug: string }>();

  const slug = resolveRelatorioSlug(rawSlug);
  const item = findRelatorioBySlug(slug);

  const [data, setData] = useState<RelatorioDetalhadoResponse<Row> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("RELATORIOS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) {
          setLoadingPermissoes(false);
        }
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    if (!item) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setUnavailable(false);
    setAccessDenied(false);

    try {
      const result = await getRelatorioDetalhado<Row>(slug);

      setData(result);
    } catch (err) {
      if (err instanceof RelatorioIndisponivelError) {
        setUnavailable(true);
        setData(null);
        return;
      }

      const message =
        err instanceof Error ? err.message : "Erro ao carregar relatório.";

      if (isPlanoAccessDenied(message)) {
        setAccessDenied(true);
        setData(null);
        return;
      }

      toast.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [item, loadingPermissoes, podeVisualizar, slug]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refresh = () => void fetchData();
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
  }, [fetchData]);

  const columns = useMemo<RelatorioColumn<Row>[]>(() => {
    return configureGenericReportColumns(
      slug,
      data?.colunas ?? [],
      data?.registros ?? [],
    ).map((coluna) =>
      buildColumnFromMeta(
        coluna,
        !isDefaultGenericReportColumn(
          slug,
          coluna.chave,
          coluna.visivelPorPadrao !== false,
        ),
      ),
    );
  }, [data?.colunas, data?.registros, slug]);

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Link
            to="/relatorios"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Relatórios
          </Link>

          <div className="mt-6 rounded-[16px] border border-dashed border-border/70 bg-card/65 p-10 text-center shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md">
            <p className="text-sm font-medium text-foreground">
              Relatório não encontrado.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Verifique se o endereço acessado está correto.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (accessDenied) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  const title = getTituloRelatorioParaExibicao(slug, data?.titulo, item.title);

  // Textos de interface pertencem ao frontend. O backend fornece somente os
  // dados, metadados de colunas e identificação técnica do relatório.
  const description = item.description;

  const rows = data?.registros ?? [];

  const enablePdfExport = podeGerarPdf && rows.length > 0 && columns.length > 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <RelatorioHeader
          title={title}
          tooltip={item.tooltip}
          description={description}
          nomeEmpresa={data?.nomeEmpresa}
          dataGeracao={data?.dataGeracao}
          onRefresh={fetchData}
          loading={loading}
        />

        {loading && !data && <RelatorioLoading />}

        {!loading && unavailable && (
          <div className="rounded-[16px] border border-dashed border-border/70 bg-card/65 p-10 text-center shadow-[0_2px_12px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md">
            <p className="text-sm font-medium text-foreground">
              Endpoint deste relatório ainda não disponível
            </p>

            <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
              A página está pronta, mas o endpoint real deste módulo ainda não
              respondeu corretamente no backend. Nenhum dado fictício é exibido
              aqui.
            </p>
          </div>
        )}

        {!loading && !unavailable && data && (
          <>
            {data.resumo
              ?.filter((grupo) => !isResumoTotal(grupo))
              .map((grupo, index) => (
                <GrupoIndicadores key={index} grupo={grupo} />
              ))}

            <RelatorioDetalheCharts slug={slug} rows={rows} />

            <RelatorioDataTable
              reportName={item.slug}
              organizacaoNome={data.nomeEmpresa}
              dataGeracao={
                data.dataGeracao ? formatDateBR(data.dataGeracao) : undefined
              }
              rows={rows}
              columns={columns}
              emptyMessage="Nenhum registro encontrado para este relatório. Quando houver dados cadastrados no sistema, eles aparecerão aqui."
              indicadoresPdf={data.resumo?.[0]?.indicadores
                ?.slice(0, 8)
                .map((indicador) => ({
                  label: indicador.label,
                  valor: formatValorRelatorio(indicador.valor, indicador.chave),
                }))}
              enablePdfExport={enablePdfExport}
            />

            {!podeGerarPdf && rows.length > 0 && (
              <div className="mt-4 rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 shadow-[0_2px_10px_-8px_hsl(var(--foreground)/0.16)] backdrop-blur-md dark:text-amber-300">
                Você pode visualizar este relatório, mas não possui permissão
                para gerar PDF.
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function isResumoTotal(grupo: {
  titulo: string;
  indicadores: Array<{ chave: string }>;
}) {
  return (
    grupo.titulo.trim().toLowerCase() === "resumo" &&
    grupo.indicadores.length === 1 &&
    ["total", "total_registros", "totalregistros"].includes(
      grupo.indicadores[0].chave.toLowerCase(),
    )
  );
}

function buildColumnFromMeta(
  meta: RelatorioColunaMeta,
  hiddenByDefault: boolean,
): RelatorioColumn<Row> {
  return {
    key: meta.chave,
    label: meta.label || prettyLabel(meta.chave),
    hiddenByDefault,

    accessor: (row) => formatValorRelatorio(row[meta.chave], meta.chave),

    render: (row) => formatValorRelatorio(row[meta.chave], meta.chave),
  };
}

function getTituloRelatorioParaExibicao(
  slug: string,
  tituloBackend: string | undefined,
  tituloCatalogo: string,
): string {
  if (slug === "aplicacao-de-recursos") {
    return tituloCatalogo || "Aplicação de Recursos";
  }

  return tituloBackend || tituloCatalogo;
}

function prettyLabel(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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
import { findRelatorioBySlug } from "@/data/relatoriosCatalogo";
import {
  formatDateBR,
  formatValorRelatorio,
  getColunasRelatorio,
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
import type { RelatorioColumn } from "@/lib/relatorioExporters";

type Row = Record<string, unknown>;

const SLUGS_COM_ENDERECO = new Set([
  "participantes",
  "colaboradores",
  "integrantes",
]);

const SLUGS_COM_AGENTE = new Set([
  "editais",
  "propostas-editais",
  "resultados-propostas",
  "habilitacoes-propostas",
  "equipe-edital",
  "planejamento-financeiro",
]);

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
        if (active) setLoadingPermissoes(false);
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

      const registrosNormalizados = normalizarRegistrosParaExibicao(
        slug,
        result.registros ?? [],
      );

      const linhasNormalizadas = normalizarRegistrosParaExibicao(
        slug,
        result.linhas ?? [],
      );

      setData({
        ...result,
        registros: registrosNormalizados,
        linhas: linhasNormalizadas,
        colunas: normalizarColunasParaExibicao(
          slug,
          result.colunas ?? [],
          registrosNormalizados,
        ),
      });
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

  const columns = useMemo<RelatorioColumn<Row>[]>(() => {
    const registros = data?.registros ?? [];

    const meta = normalizarColunasParaExibicao(
      slug,
      data?.colunas ?? [],
      registros,
    );

    if (meta.length > 0) {
      return meta.map((coluna) => buildColumnFromMeta(coluna));
    }

    const colunasManuais = getColunasRelatorio(slug, registros);

    if (colunasManuais.length > 0) {
      return normalizarColunasParaExibicao(slug, colunasManuais, registros).map(
        (coluna) => buildColumnFromMeta(coluna),
      );
    }

    const sample = registros[0];

    if (sample) {
      return Object.keys(sample)
        .filter((key) => !isCampoTecnico(key))
        .filter((key) => !isCampoRelacionalOculto(slug, key))
        .map((key) =>
          buildColumnFromMeta({
            chave: key,
            label: prettyLabel(key),
            visivelPorPadrao: true,
          }),
        );
    }

    return [];
  }, [data, slug]);

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

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
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

  const title = data?.titulo || item.title;
  const description = data?.descricao || item.description;
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
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
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
            {data.resumo?.map((grupo, index) => (
              <GrupoIndicadores key={index} grupo={grupo} />
            ))}

            <RelatorioDataTable
              reportName={title}
              organizacaoNome={data.nomeEmpresa}
              dataGeracao={
                data.dataGeracao ? formatDateBR(data.dataGeracao) : undefined
              }
              rows={rows}
              columns={columns}
              searchPlaceholder={item.searchPlaceholder ?? "Buscar..."}
              emptyMessage="Nenhum registro encontrado para este relatório. Quando houver dados cadastrados no sistema, eles aparecerão aqui."
              indicadoresPdf={data.resumo?.[0]?.indicadores
                ?.slice(0, 8)
                .map((indicador) => ({
                  label: indicador.label,
                  valor: formatValorRelatorio(
                    indicador.valor,
                    indicador.chave,
                  ),
                }))}
              enablePdfExport={enablePdfExport}
            />

            {!podeGerarPdf && rows.length > 0 && (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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

function buildColumnFromMeta(meta: RelatorioColunaMeta): RelatorioColumn<Row> {
  return {
    key: meta.chave,
    label: meta.label || prettyLabel(meta.chave),
    hiddenByDefault: meta.visivelPorPadrao === false,
    accessor: (row) =>
      formatValorRelatorio(getValorColuna(row, meta.chave), meta.chave),
    render: (row) =>
      formatValorRelatorio(getValorColuna(row, meta.chave), meta.chave),
  };
}

function normalizarRegistrosParaExibicao(slug: string, registros: Row[]): Row[] {
  return registros.map((registro) => {
    const row: Row = {};

    Object.entries(registro).forEach(([key, value]) => {
      if (isCampoTecnico(key)) return;

      row[key] = value;
    });

    return normalizarAliasesRelatorio(slug, row);
  });
}

function normalizarAliasesRelatorio(slug: string, row: Row): Row {
  const normalized: Row = { ...row };

  const agente =
    row.agente ??
    row.agente_responsavel ??
    row.agenteResponsavel ??
    row.nome_agente ??
    row.nomeAgente ??
    row.agente_cultural ??
    row.agenteCultural;

  if (
    SLUGS_COM_AGENTE.has(slug) &&
    agente !== null &&
    agente !== undefined &&
    String(agente).trim()
  ) {
    normalized.agente = agente;
  }

  const numeroInscricao =
    row.numero_inscricao ??
    row.numeroInscricao ??
    row.inscricao ??
    row.numero_de_inscricao ??
    row.numeroDeInscricao;

  if (
    slug === "editais" &&
    numeroInscricao !== null &&
    numeroInscricao !== undefined &&
    String(numeroInscricao).trim()
  ) {
    normalized.numero_inscricao = numeroInscricao;
  }

  return normalized;
}

function normalizarColunasParaExibicao(
  slug: string,
  colunas: RelatorioColunaMeta[],
  registros: Row[],
): RelatorioColunaMeta[] {
  const manuais = getColunasRelatorio(slug, registros);
  const origem = colunas.length > 0 ? colunas : manuais;

  const map = new Map<string, RelatorioColunaMeta>();

  origem.forEach((coluna) => {
    if (isCampoTecnico(coluna.chave)) return;
    if (isCampoRelacionalOculto(slug, coluna.chave)) return;

    map.set(coluna.chave, {
      ...coluna,
      label: coluna.label || prettyLabel(coluna.chave),
    });
  });

  manuais.forEach((coluna) => {
    if (isCampoTecnico(coluna.chave)) return;
    if (isCampoRelacionalOculto(slug, coluna.chave)) return;

    const existente = map.get(coluna.chave);

    map.set(coluna.chave, {
      ...coluna,
      ...existente,
      label: existente?.label || coluna.label || prettyLabel(coluna.chave),
      tipo: existente?.tipo || coluna.tipo,
      visivelPorPadrao:
        existente?.visivelPorPadrao ?? coluna.visivelPorPadrao ?? true,
    });
  });

  return Array.from(map.values());
}

function isCampoRelacionalOculto(slug: string, key: string): boolean {
  if (slug !== "participantes") return false;

  return [
    "vinculos",
    "participanteAtividades",
    "vinculosAtividades",
    "participante_atividades",
    "vinculos_atividades",
    "matriculas",
  ].includes(key);
}

function getValorColuna(row: Row, chave: string): unknown {
  if (chave === "endereco") {
    return montarEndereco(row);
  }

  if (Object.prototype.hasOwnProperty.call(row, chave)) {
    return row[chave];
  }

  const snake = camelToSnake(chave);

  if (Object.prototype.hasOwnProperty.call(row, snake)) {
    return row[snake];
  }

  const camel = snakeToCamel(chave);

  if (Object.prototype.hasOwnProperty.call(row, camel)) {
    return row[camel];
  }

  return undefined;
}

function montarEndereco(row: Row): string {
  const partes = [
    row.logradouro,
    row.numero,
    row.complemento,
    row.bairro,
    row.cidade,
    row.estado,
    row.cep,
  ]
    .map((value) =>
      value === null || value === undefined ? "" : String(value).trim(),
    )
    .filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : "—";
}

function isCampoTecnico(key: string): boolean {
  const normalized = key.toLowerCase();

  return (
    normalized === "id" ||
    normalized.endsWith("id") ||
    normalized.endsWith("_id") ||
    normalized === "ordem" ||
    normalized.includes("organizacaoid") ||
    normalized.includes("organizacao_id") ||
    normalized.includes("usuarioid") ||
    normalized.includes("usuario_id") ||
    normalized.includes("configuracaoempresaid") ||
    normalized.includes("configuracao_empresa_id")
  );
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

function prettyLabel(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

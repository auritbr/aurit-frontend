import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, FileCheck2, Send, Target } from "lucide-react";
import { toast } from "sonner";
import { type ActiveFilterItem } from "@/components/ActiveFilters";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { StatusPill } from "@/components/StatusPill";
import {
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportLineChart,
  ReportPieChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportStatSkeleton,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";
import {
  produtoGeradoLabel,
  statusPrestacaoContasLabel,
  statusPrestacaoContasOptions,
} from "@/data/prestacaoContas";

interface PrestacaoApi {
  id: number | string;
  projetoId?: number | string | null;
  nomeProjeto?: string | null;
  tituloPropostaEdital?: string | null;
  agenteId?: number | string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  dataEntrega?: string | null;
  statusPrestacaoContas?: string | null;
  prestacaoMetasIds?: Array<number | string> | null;
  atividadeIds?: Array<number | string> | null;
  turmaIds?: Array<number | string> | null;
  planoAulaIds?: Array<number | string> | null;
  eventoCulturalIds?: Array<number | string> | null;
  cronogramaIds?: Array<number | string> | null;
  colaboradorIds?: Array<number | string> | null;
  produtosGerados?: string[] | null;
  disponibilizacaoProdutosPublico?: string | null;
  avaliacaoPublicoAlcancado?: string | null;
  consideracoesFinais?: string | null;
}
interface AgenteApi {
  id: number | string;
  nomePrincipal?: string | null;
  nomeCompleto?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  nome?: string | null;
}
interface PrestacaoMetaApi {
  id: number | string;
  statusCumprimentoMeta?: string | null;
}
interface ReferenceApi {
  id: number | string;
  nomeAtividade?: string | null;
  nomeTurma?: string | null;
  tituloPlanoAula?: string | null;
  nomePlanoAula?: string | null;
  nomeEvento?: string | null;
  tituloEvento?: string | null;
  nomeEtapa?: string | null;
  tituloEtapa?: string | null;
  descricaoEtapa?: string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
}
interface Row {
  id: string;
  projeto: string;
  proposta: string;
  responsavel: string;
  periodoPrestacao: string;
  metasAvaliadas: string;
  metasAvaliadasNumero: number;
  metasCumpridas: number;
  metasParcialmenteCumpridas: number;
  metasNaoCumpridas: number;
  atividades: string;
  turmas: string;
  planosAula: string;
  eventosCulturais: string;
  cronogramas: string;
  colaboradores: string;
  quantidadeProdutos: number;
  produtosGerados: string;
  produtosPublico: boolean;
  avaliacaoPreenchida: boolean;
  consideracoesFinaisPreenchidas: boolean;
  situacao: string;
  situacaoCodigo: string;
  dataEntrega: string;
  dataEntregaIso: string;
  dataInicio: string;
  dataFim: string;
}
type Filters = {
  busca: string;
  projetos: string[];
  responsaveis: string[];
  propostas: string[];
  situacoes: string[];
  periodoDe: string;
  periodoAte: string;
};
const emptyFilters: Filters = {
  busca: "",
  projetos: [],
  responsaveis: [],
  propostas: [],
  situacoes: [],
  periodoDe: "",
  periodoAte: "",
};
const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const date = (value?: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const period = (start?: string | null, end?: string | null) =>
  start || end ? `${date(start)} – ${date(end)}` : "—";
const filled = (value?: string | null) => Boolean(value?.trim());
const count = (value?: unknown[]) => value?.length ?? 0;
const agentName = (item: AgenteApi) =>
  item.nomePrincipal?.trim() ||
  item.nomeCompleto?.trim() ||
  item.nomeFantasia?.trim() ||
  item.razaoSocial?.trim() ||
  item.nome?.trim() ||
  "Responsável não informado";

function referenceNames(items: ReferenceApi[]) {
  return new Map(
    items.map((item) => [
      String(item.id),
      item.nomeAtividade?.trim() ||
        item.nomeTurma?.trim() ||
        item.tituloPlanoAula?.trim() ||
        item.nomePlanoAula?.trim() ||
        item.nomeEvento?.trim() ||
        item.tituloEvento?.trim() ||
        item.nomeEtapa?.trim() ||
        item.tituloEtapa?.trim() ||
        item.descricaoEtapa?.trim() ||
        item.nomeCompleto?.trim() ||
        item.nome?.trim() ||
        "",
    ]),
  );
}
function names(
  ids: Array<number | string> | null | undefined,
  references: Map<string, string>,
) {
  const values = (ids ?? [])
    .map((id) => references.get(String(id)))
    .filter((value): value is string => Boolean(value));
  return values.length ? values.join(", ") : "—";
}
function toRows(
  items: PrestacaoApi[],
  agentes: AgenteApi[],
  metas: PrestacaoMetaApi[],
  references: {
    atividades: ReferenceApi[];
    turmas: ReferenceApi[];
    planos: ReferenceApi[];
    eventos: ReferenceApi[];
    cronogramas: ReferenceApi[];
    colaboradores: ReferenceApi[];
  },
): Row[] {
  const agents = new Map(
    agentes.map((item) => [String(item.id), agentName(item)]),
  );
  const metaStatus = new Map(
    metas.map((item) => [String(item.id), item.statusCumprimentoMeta ?? ""]),
  );
  return items.map((item) => {
    const ids = item.prestacaoMetasIds ?? [];
    const statuses = ids.map((id) => metaStatus.get(String(id)));
    const situacaoCodigo = item.statusPrestacaoContas ?? "NAO_INICIADA";
    return {
      id: String(item.id),
      projeto: item.nomeProjeto?.trim() || "Projeto não informado",
      proposta: item.tituloPropostaEdital?.trim() || "—",
      responsavel:
        agents.get(String(item.agenteId ?? "")) ?? "Responsável não informado",
      periodoPrestacao: period(item.dataInicio, item.dataFim),
      dataInicio: item.dataInicio ?? "",
      dataFim: item.dataFim ?? "",
      dataEntrega: date(item.dataEntrega),
      dataEntregaIso: item.dataEntrega ?? "",
      situacao: statusPrestacaoContasLabel(situacaoCodigo),
      situacaoCodigo,
      metasAvaliadas: ids.length ? String(ids.length) : "—",
      metasAvaliadasNumero: ids.length,
      metasCumpridas: statuses.filter(
        (value) => value === "CUMPRIDA_INTEGRALMENTE",
      ).length,
      metasParcialmenteCumpridas: statuses.filter(
        (value) => value === "CUMPRIDA_PARCIALMENTE",
      ).length,
      metasNaoCumpridas: statuses.filter((value) => value === "NAO_CUMPRIDA")
        .length,
      atividades: names(
        item.atividadeIds,
        referenceNames(references.atividades),
      ),
      turmas: names(item.turmaIds, referenceNames(references.turmas)),
      planosAula: names(item.planoAulaIds, referenceNames(references.planos)),
      eventosCulturais: names(
        item.eventoCulturalIds,
        referenceNames(references.eventos),
      ),
      cronogramas: names(
        item.cronogramaIds,
        referenceNames(references.cronogramas),
      ),
      colaboradores: names(
        item.colaboradorIds,
        referenceNames(references.colaboradores),
      ),
      quantidadeProdutos: count(item.produtosGerados),
      produtosGerados:
        item.produtosGerados?.map(produtoGeradoLabel).join(", ") || "—",
      produtosPublico: filled(item.disponibilizacaoProdutosPublico),
      avaliacaoPreenchida: filled(item.avaliacaoPublicoAlcancado),
      consideracoesFinaisPreenchidas: filled(item.consideracoesFinais),
    };
  });
}

function options(rows: Row[], key: keyof Row) {
  return Array.from(
    new Set(
      rows
        .map((row) => String(row[key] ?? ""))
        .filter((value) => value && value !== "—"),
    ),
  )
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((value) => ({ value, label: value }));
}

function countBySituation(rows: Row[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) =>
    totals.set(row.situacao, (totals.get(row.situacao) ?? 0) + 1),
  );
  return Array.from(totals, ([name, value]) => ({ name, value }));
}

function countByDeliveryMonth(rows: Row[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dataEntregaIso)) return;
    const month = row.dataEntregaIso.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + 1);
  });
  return Array.from(totals, ([month, value]) => ({ month, value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, value }) => ({
      name: `${month.slice(5)}/${month.slice(0, 4)}`,
      value,
    }));
}

const columns: Array<ReportTableColumn<Row> & { group: string }> = [
  {
    key: "projeto",
    pdfKey: "projeto",
    label: "Projeto",
    group: "Identificação",
    alwaysVisible: true,
    className: "min-w-[220px]",
    accessor: (r) => r.projeto,
  },
  {
    key: "responsavel",
    pdfKey: "agente",
    label: "Responsável pela prestação",
    group: "Identificação",
    alwaysVisible: true,
    className: "min-w-[190px]",
    accessor: (r) => r.responsavel,
  },
  {
    key: "periodoPrestacao",
    pdfKey: "periodo_prestacao",
    label: "Período da prestação",
    group: "Identificação",
    className: "min-w-[165px]",
    accessor: (r) => r.periodoPrestacao,
  },
  {
    key: "proposta",
    pdfKey: "proposta_edital",
    label: "Proposta",
    group: "Identificação",
    hiddenByDefault: true,
    className: "min-w-[220px]",
    accessor: (r) => r.proposta,
  },
  {
    key: "metasAvaliadas",
    pdfKey: "metas_avaliadas",
    label: "Metas avaliadas",
    group: "Metas",
    accessor: (r) => r.metasAvaliadas,
    sortValue: (r) => r.metasAvaliadasNumero,
  },
  {
    key: "metasCumpridas",
    pdfKey: "metas_cumpridas",
    label: "Metas cumpridas",
    group: "Metas",
    hiddenByDefault: true,
    accessor: (r) => r.metasCumpridas,
  },
  {
    key: "metasParcialmenteCumpridas",
    pdfKey: "metas_parcialmente_cumpridas",
    label: "Metas parcialmente cumpridas",
    group: "Metas",
    hiddenByDefault: true,
    accessor: (r) => r.metasParcialmenteCumpridas,
  },
  {
    key: "metasNaoCumpridas",
    pdfKey: "metas_nao_cumpridas",
    label: "Metas não cumpridas",
    group: "Metas",
    hiddenByDefault: true,
    accessor: (r) => r.metasNaoCumpridas,
  },
  {
    key: "situacao",
    pdfKey: "status_prestacao_contas",
    label: "Situação",
    group: "Estruturação da prestação",
    accessor: (r) => r.situacao,
    render: (r) => (
      <StatusPill status={r.situacaoCodigo} context="prestacao-contas" />
    ),
  },
  {
    key: "dataEntrega",
    pdfKey: "data_entrega",
    label: "Data de entrega",
    group: "Estruturação da prestação",
    accessor: (r) => r.dataEntrega,
  },
  {
    key: "atividades",
    pdfKey: "atividades",
    label: "Atividades realizadas",
    group: "Execução",
    hiddenByDefault: true,
    accessor: (r) => r.atividades,
  },
  {
    key: "turmas",
    pdfKey: "turmas",
    label: "Turmas",
    group: "Execução",
    hiddenByDefault: true,
    accessor: (r) => r.turmas,
  },
  {
    key: "planosAula",
    pdfKey: "planos_aula",
    label: "Planos de aula",
    group: "Execução",
    hiddenByDefault: true,
    accessor: (r) => r.planosAula,
  },
  {
    key: "eventosCulturais",
    pdfKey: "eventos_culturais",
    label: "Eventos culturais",
    group: "Execução",
    hiddenByDefault: true,
    accessor: (r) => r.eventosCulturais,
  },
  {
    key: "cronogramas",
    pdfKey: "cronogramas",
    label: "Etapas de cronograma",
    group: "Execução",
    hiddenByDefault: true,
    accessor: (r) => r.cronogramas,
  },
  {
    key: "colaboradores",
    pdfKey: "colaboradores",
    label: "Colaboradores vinculados",
    group: "Equipe",
    hiddenByDefault: true,
    accessor: (r) => r.colaboradores,
  },
  {
    key: "quantidadeProdutos",
    pdfKey: "quantidade_produtos",
    label: "Quantidade de produtos",
    group: "Produtos",
    hiddenByDefault: true,
    accessor: (r) => r.quantidadeProdutos,
  },
  {
    key: "produtosGerados",
    pdfKey: "produtos_gerados",
    label: "Produtos gerados",
    group: "Produtos",
    hiddenByDefault: true,
    className: "max-w-[240px] truncate",
    accessor: (r) => r.produtosGerados,
  },
  {
    key: "produtosPublico",
    pdfKey: "produtos_disponibilizados_publico",
    label: "Produtos disponibilizados ao público",
    group: "Produtos",
    hiddenByDefault: true,
    accessor: (r) => (r.produtosPublico ? "Sim" : "Não"),
  },
  {
    key: "avaliacaoPreenchida",
    pdfKey: "avaliacao_execucao",
    label: "Avaliação da execução",
    group: "Avaliação e encerramento",
    hiddenByDefault: true,
    accessor: (r) => (r.avaliacaoPreenchida ? "Preenchida" : "Pendente"),
  },
  {
    key: "consideracoesFinaisPreenchidas",
    pdfKey: "consideracoes_finais_preenchidas",
    label: "Considerações finais preenchidas",
    group: "Avaliação e encerramento",
    hiddenByDefault: true,
    accessor: (r) => (r.consideracoesFinaisPreenchidas ? "Sim" : "Não"),
  },
];

export default function RelatorioPrestacaoContas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        prestacoes,
        agentes,
        metas,
        atividades,
        turmas,
        planos,
        eventos,
        cronogramas,
        colaboradores,
      ] = await Promise.all([
        apiFetch<PrestacaoApi[]>("/prestacoes-contas"),
        apiFetch<AgenteApi[]>("/agentes"),
        apiFetch<PrestacaoMetaApi[]>("/prestacao-metas"),
        apiFetch<ReferenceApi[]>("/atividades"),
        apiFetch<ReferenceApi[]>("/turmas"),
        apiFetch<ReferenceApi[]>("/planos-aula"),
        apiFetch<ReferenceApi[]>("/eventos-culturais"),
        apiFetch<ReferenceApi[]>("/cronogramas"),
        apiFetch<ReferenceApi[]>("/colaboradores"),
      ]);
      setRows(
        toRows(prestacoes, agentes, metas, {
          atividades,
          turmas,
          planos,
          eventos,
          cronogramas,
          colaboradores,
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o relatório.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const refresh = () => void load();
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
  }, [load]);
  const projects = useMemo(() => options(rows, "projeto"), [rows]);
  const responsibles = useMemo(() => options(rows, "responsavel"), [rows]);
  const proposals = useMemo(() => options(rows, "proposta"), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!applied.busca ||
            normalize(
              [row.projeto, row.proposta, row.responsavel, row.situacao].join(
                " ",
              ),
            ).includes(normalize(applied.busca))) &&
          (!applied.projetos.length ||
            applied.projetos.includes(row.projeto)) &&
          (!applied.responsaveis.length ||
            applied.responsaveis.includes(row.responsavel)) &&
          (!applied.propostas.length ||
            applied.propostas.includes(row.proposta)) &&
          (!applied.situacoes.length ||
            applied.situacoes.includes(row.situacaoCodigo)) &&
          (!applied.periodoDe ||
            (!!row.dataFim && row.dataFim >= applied.periodoDe)) &&
          (!applied.periodoAte ||
            (!!row.dataInicio && row.dataInicio <= applied.periodoAte)),
      ),
    [rows, applied],
  );
  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const result: ActiveFilterItem[] = [];
    const remove = <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setApplied((current) => ({ ...current, [key]: value }));
    if (applied.busca)
      result.push({
        id: "busca",
        label: "Busca",
        value: applied.busca,
        onRemove: () => remove("busca", ""),
      });
    (["projetos", "responsaveis", "propostas", "situacoes"] as const).forEach(
      (key) =>
        applied[key].forEach((value) =>
          result.push({
            id: `${key}-${value}`,
            label:
              key === "projetos"
                ? "Projeto"
                : key === "responsaveis"
                  ? "Responsável"
                  : key === "propostas"
                    ? "Proposta"
                    : "Situação",
            value:
              key === "situacoes" ? statusPrestacaoContasLabel(value) : value,
            onRemove: () =>
              remove(
                key,
                applied[key].filter((item) => item !== value),
              ),
          }),
        ),
    );
    if (applied.periodoDe || applied.periodoAte)
      result.push({
        id: "periodo",
        label: "Período da prestação",
        value: `${date(applied.periodoDe)} – ${date(applied.periodoAte)}`,
        onRemove: () =>
          setApplied((current) => ({
            ...current,
            periodoDe: "",
            periodoAte: "",
          })),
      });
    return result;
  }, [applied]);
  return (
    <ReportShell
      title="Prestação de Contas"
      tooltip="Analise a organização e a situação das prestações de contas dos projetos."
      objective="Analise as prestações de contas dos projetos em uma visão consolidada, acompanhando período, responsáveis, organização da prestação, avaliação das metas, situação e demais informações da execução conforme os filtros aplicados."
    >
      <ReportFilterPanel
        storageKey="relatorio-prestacoes-contas"
        activeFilters={activeFilters}
        loading={loading}
        onSubmit={() => setApplied({ ...draft })}
        onClear={() => {
          setDraft(emptyFilters);
          setApplied(emptyFilters);
        }}
      >
        <div>
          <FieldLabel
            htmlFor="prestacao-busca"
            tooltip="Busque por projeto, proposta, responsável ou situação."
          >
            Busca
          </FieldLabel>
          <Input
            id="prestacao-busca"
            value={draft.busca}
            onChange={(e) => setDraft((s) => ({ ...s, busca: e.target.value }))}
            className={filterFieldClass}
            placeholder="Buscar prestação..."
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-projeto"
            tooltip="Filtre pelo projeto vinculado à prestação."
          >
            Projeto
          </FieldLabel>
          <FilterMultiSelect
            id="prestacao-projeto"
            options={projects}
            value={draft.projetos}
            onChange={(projetos) => setDraft((s) => ({ ...s, projetos }))}
            placeholder="Todos os projetos"
            searchable
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-responsavel"
            tooltip="Filtre pelo responsável da prestação."
          >
            Responsável pela prestação
          </FieldLabel>
          <FilterMultiSelect
            id="prestacao-responsavel"
            options={responsibles}
            value={draft.responsaveis}
            onChange={(responsaveis) =>
              setDraft((s) => ({ ...s, responsaveis }))
            }
            placeholder="Todos os responsáveis"
            searchable
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-proposta"
            tooltip="Filtre pela proposta vinculada, quando houver."
          >
            Proposta
          </FieldLabel>
          <FilterMultiSelect
            id="prestacao-proposta"
            options={proposals}
            value={draft.propostas}
            onChange={(propostas) => setDraft((s) => ({ ...s, propostas }))}
            placeholder="Todas as propostas"
            searchable
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-situacao"
            tooltip="Filtre pela situação atual da prestação."
          >
            Situação da prestação
          </FieldLabel>
          <FilterMultiSelect
            id="prestacao-situacao"
            options={statusPrestacaoContasOptions.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            value={draft.situacoes}
            onChange={(situacoes) => setDraft((s) => ({ ...s, situacoes }))}
            placeholder="Todas as situações"
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-periodo-de"
            tooltip="Informe o início do período considerado."
          >
            Período da prestação — de
          </FieldLabel>
          <Input
            id="prestacao-periodo-de"
            type="date"
            value={draft.periodoDe}
            onChange={(e) =>
              setDraft((s) => ({ ...s, periodoDe: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="prestacao-periodo-ate"
            tooltip="Informe o fim do período considerado."
          >
            Período da prestação — até
          </FieldLabel>
          <Input
            id="prestacao-periodo-ate"
            type="date"
            value={draft.periodoAte}
            onChange={(e) =>
              setDraft((s) => ({ ...s, periodoAte: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
      </ReportFilterPanel>
      <ReportStatGrid>
        {loading ? (
          <ReportStatSkeleton count={5} />
        ) : (
          <>
            <ReportStatCard
              icon={FileCheck2}
              label="Prestações"
              valor={String(filtered.length)}
            />
            <ReportStatCard
              icon={BadgeCheck}
              tone="info"
              label="Em andamento"
              valor={String(
                filtered.filter((row) =>
                  [
                    "EM_ELABORACAO",
                    "AGUARDANDO_DOCUMENTOS",
                    "PRONTA_PARA_ENVIO",
                    "EM_ANALISE",
                  ].includes(row.situacaoCodigo),
                ).length,
              )}
            />
            <ReportStatCard
              icon={BadgeCheck}
              tone="success"
              label="Concluídas"
              valor={String(
                filtered.filter((row) =>
                  ["APROVADA", "APROVADA_COM_RESSALVAS", "REPROVADA"].includes(
                    row.situacaoCodigo,
                  ),
                ).length,
              )}
            />
            <ReportStatCard
              icon={Send}
              tone="info"
              label="Enviadas"
              valor={String(
                filtered.filter((row) => row.situacaoCodigo === "ENVIADA")
                  .length,
              )}
            />
            <ReportStatCard
              icon={Target}
              tone="success"
              label="Metas avaliadas"
              valor={String(
                filtered.reduce(
                  (sum, row) => sum + row.metasAvaliadasNumero,
                  0,
                ),
              )}
            />
          </>
        )}
      </ReportStatGrid>
      <ReportChartGrid>
        <ReportChartCard
          title="Situação das prestações de contas"
          description="Veja como as prestações de contas estão distribuídas conforme sua situação atual."
        >
          <ReportPieChart
            reportKey="prestacoes-contas"
            data={countBySituation(filtered)}
          />
        </ReportChartCard>
        <ReportChartCard
          title="Prestações por período"
          description="Acompanhe a quantidade de prestações de contas entregues ao longo dos períodos."
        >
          <ReportLineChart
            reportKey="prestacoes-contas-entregas"
            data={countByDeliveryMonth(filtered)}
          />
        </ReportChartCard>
      </ReportChartGrid>
      <ReportTable
        title="Prestações de contas"
        description={
          loading
            ? "Carregando dados atualizados..."
            : "Resultados consideram os filtros aplicados."
        }
        rows={filtered}
        columns={columns}
        reportName="Relatório de Prestações de Contas"
        rowKey={(row) => row.id}
        emptyMessage={
          loading
            ? "Carregando..."
            : "Nenhuma prestação encontrada com os filtros selecionados."
        }
        pdfExport={{ slug: "prestacoes-contas" }}
      />
    </ReportShell>
  );
}

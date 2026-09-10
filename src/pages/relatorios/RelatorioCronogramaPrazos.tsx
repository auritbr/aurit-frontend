import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  Clock,
  CircleDashed,
  CalendarX,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/FieldLabel";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportPieChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportTable,
  filterFieldClass,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import { DomainStatusPill } from "@/components/DomainStatusPill";
import { domainStatusOptions } from "@/data/status";
import {
  formatDateBr,
  getRelatorioCronogramaPrazos,
  situacaoCronogramaLabel,
  type RelatorioCronogramaItem,
  type RelatorioCronogramaPrazosDTO,
} from "@/data/relatorioCronogramaPrazos";
import { AccessDenied } from "@/components/AccessDenied";
import { AppLayout } from "@/components/AppLayout";
import { isPlanoAccessDenied } from "@/lib/access";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";

const situacoes = domainStatusOptions("cronograma");
interface Filtros {
  busca: string;
  projetoId: string;
  situacoes: string[];
  de: string;
  ate: string;
}
const filtrosIniciais: Filtros = {
  busca: "",
  projetoId: "TODOS",
  situacoes: [],
  de: "",
  ate: "",
};

export default function RelatorioCronogramaPrazos() {
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [aplicados, setAplicados] = useState<Filtros>(filtrosIniciais);
  const [relatorio, setRelatorio] =
    useState<RelatorioCronogramaPrazosDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const requestId = useRef(0);
  const appliedRef = useRef(filtrosIniciais);

  const carregar = useCallback(async (next: Filtros) => {
    const currentRequest = ++requestId.current;

    try {
      setLoading(true);
      const data = await getRelatorioCronogramaPrazos(next);

      if (currentRequest !== requestId.current) return false;

      setRelatorio(data);
      setAccessDenied(false);
      return true;
    } catch (error) {
      if (currentRequest !== requestId.current) return false;

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar o relatório de cronograma e prazos.";
      if (isPlanoAccessDenied(message)) setAccessDenied(true);
      else toast.error(message);
      return false;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar(filtrosIniciais);
  }, [carregar]);
  useEffect(() => {
    const refresh = () => void carregar(appliedRef.current);
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
  }, [carregar]);

  const aplicar = async (next: Filtros, showToast = false) => {
    if (next.de && next.ate && next.de > next.ate) {
      toast.error("A data inicial não pode ser posterior à data final.");
      return;
    }

    setFiltros(next);
    const success = await carregar(next);

    if (success) {
      setAplicados(next);
      appliedRef.current = next;
      if (showToast) toast.success("Filtros aplicados.");
    }
  };

  const linhas = relatorio?.etapas ?? [];
  const projetos = relatorio?.projetosDisponiveis ?? [];
  const porSituacao = (relatorio?.etapasPorSituacao ?? []).map((item) => ({
    name: situacaoCronogramaLabel(item.status),
    value: item.total,
  }));
  const porProjeto = (relatorio?.etapasPorProjeto ?? []).map((item) => ({
    name: item.status,
    value: item.total,
  }));

  const columns = useMemo<ReportTableColumn<RelatorioCronogramaItem>[]>(
    () => [
      { key: "etapa", label: "Etapa", accessor: (row) => row.etapa || "—" },
      {
        key: "atividade",
        label: "Atividade relacionada",
        accessor: (row) => row.atividade || "—",
      },
      {
        key: "projeto",
        label: "Projeto",
        accessor: (row) => row.projeto || "—",
      },
      {
        key: "inicio",
        label: "Início",
        accessor: (row) => formatDateBr(row.inicio),
      },
      {
        key: "fim",
        label: "Término",
        accessor: (row) => formatDateBr(row.fim),
      },
      {
        key: "duracaoDias",
        label: "Duração",
        accessor: (row) =>
          row.duracaoDias ? `${row.duracaoDias} dia(s)` : "—",
      },
      {
        key: "situacao",
        label: "Situação",
        accessor: (row) => situacaoCronogramaLabel(row.situacao),
        render: (row) => (
          <DomainStatusPill
            domain="cronograma"
            status={row.situacao}
            ariaLabelPrefix="Situação"
          />
        ),
      },
      {
        key: "descricao",
        label: "Descrição",
        accessor: (row) => row.descricao || "—",
        notSortable: true,
      },
    ],
    [],
  );

  const activeFilters: ActiveFilterItem[] = [];
  if (aplicados.busca.trim())
    activeFilters.push({
      id: "busca",
      label: "Busca",
      value: aplicados.busca.trim(),
      onRemove: () => void aplicar({ ...aplicados, busca: "" }),
    });
  if (aplicados.projetoId !== "TODOS")
    activeFilters.push({
      id: "projeto",
      label: "Projeto",
      value:
        projetos.find((item) => String(item.id) === aplicados.projetoId)
          ?.nome ?? aplicados.projetoId,
      onRemove: () => void aplicar({ ...aplicados, projetoId: "TODOS" }),
    });
  aplicados.situacoes.forEach((situacao) =>
    activeFilters.push({
      id: `situacao-${situacao}`,
      label: "Situação",
      value: situacaoCronogramaLabel(situacao),
      onRemove: () =>
        void aplicar({
          ...aplicados,
          situacoes: aplicados.situacoes.filter((item) => item !== situacao),
        }),
    }),
  );
  if (aplicados.de)
    activeFilters.push({
      id: "de",
      label: "Início a partir de",
      value: formatDateBr(aplicados.de),
      onRemove: () => void aplicar({ ...aplicados, de: "" }),
    });
  if (aplicados.ate)
    activeFilters.push({
      id: "ate",
      label: "Início até",
      value: formatDateBr(aplicados.ate),
      onRemove: () => void aplicar({ ...aplicados, ate: "" }),
    });

  const indicadoresPdf = [
    { label: "Etapas", valor: String(relatorio?.totalEtapas ?? 0) },
    { label: "Em andamento", valor: String(relatorio?.etapasEmAndamento ?? 0) },
    {
      label: "Não iniciadas",
      valor: String(relatorio?.etapasNaoIniciadas ?? 0),
    },
    {
      label: "Prazo encerrado",
      valor: String(relatorio?.etapasPrazoEncerrado ?? 0),
    },
  ];

  if (accessDenied)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );

  return (
    <ReportShell
      title="Relatório de Cronograma e Prazos"
      tooltip="Etapas do cronograma com datas, duração, situação e projeto vinculado."
      objective="Acompanhe o cronograma de execução da organização identificando etapas não iniciadas, em andamento e com prazo encerrado, com datas, duração e projeto vinculado."
    >
      <ReportFilterPanel
        storageKey="relatorio-cronograma-prazos"
        activeFilters={activeFilters}
        loading={loading}
        onSubmit={() => void aplicar(filtros, true)}
        onClear={() => void aplicar(filtrosIniciais)}
        hidden
      >
        <div>
          <FieldLabel
            htmlFor="f-busca"
            tooltip="Busque pela etapa, atividade relacionada ou projeto."
          >
            Busca
          </FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="f-busca"
              value={filtros.busca}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, busca: e.target.value }))
              }
              placeholder="Buscar etapa..."
              className={`${filterFieldClass} pl-8`}
            />
          </div>
        </div>
        <div>
          <FieldLabel
            htmlFor="f-projeto"
            tooltip="Filtre as etapas por projeto."
          >
            Projeto
          </FieldLabel>
          <Select
            value={filtros.projetoId}
            onValueChange={(value) =>
              setFiltros((prev) => ({ ...prev, projetoId: value }))
            }
          >
            <SelectTrigger id="f-projeto" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              {projetos.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor="f-situacao"
            tooltip="Situação calculada a partir das datas da etapa."
          >
            Situação
          </FieldLabel>
          <FilterMultiSelect
            id="f-situacao"
            placeholder="Todas as situações"
            summaryNoun="situações selecionadas"
            options={situacoes.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            value={filtros.situacoes}
            onChange={(value) =>
              setFiltros((prev) => ({ ...prev, situacoes: value }))
            }
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-de"
            tooltip="Considera etapas iniciadas a partir desta data."
          >
            Início a partir de
          </FieldLabel>
          <Input
            id="f-de"
            type="date"
            value={filtros.de}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, de: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-ate"
            tooltip="Considera etapas iniciadas até esta data."
          >
            Início até
          </FieldLabel>
          <Input
            id="f-ate"
            type="date"
            value={filtros.ate}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, ate: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
      </ReportFilterPanel>

      <ReportStatGrid>
        <ReportStatCard
          icon={CalendarRange}
          tone="primary"
          label="Etapas"
          valor={String(relatorio?.totalEtapas ?? 0)}
        />
        <ReportStatCard
          icon={Clock}
          tone="info"
          label="Em andamento"
          valor={String(relatorio?.etapasEmAndamento ?? 0)}
        />
        <ReportStatCard
          icon={CircleDashed}
          tone="info"
          label="Não iniciadas"
          valor={String(relatorio?.etapasNaoIniciadas ?? 0)}
        />
        <ReportStatCard
          icon={CalendarX}
          tone="warning"
          label="Prazo encerrado"
          valor={String(relatorio?.etapasPrazoEncerrado ?? 0)}
        />
      </ReportStatGrid>

      <ReportChartGrid>
        <ReportChartCard
          title="Etapas por situação"
          description="Situação das etapas conforme os prazos."
        >
          <ReportPieChart data={porSituacao} reportKey="cronograma-prazos" />
        </ReportChartCard>
        <ReportChartCard
          title="Etapas por projeto"
          description="Volume de etapas planejadas em cada projeto."
        >
          <ReportBarChart data={porProjeto} reportKey="cronograma-prazos" />
        </ReportChartCard>
      </ReportChartGrid>

      <ReportTable
        title="Etapas do cronograma"
        rows={linhas}
        columns={columns}
        reportName="cronograma-prazos"
        indicadoresPdf={indicadoresPdf}
        rowKey={(row) => String(row.id)}
        nowrap
        emptyMessage={
          loading && !relatorio
            ? "Carregando etapas do cronograma..."
            : "Nenhuma etapa de cronograma encontrada com os filtros selecionados."
        }
        pdfExport={{
          slug: "cronograma-prazos",
          filters: {
            busca: aplicados.busca || undefined,
            projetoId:
              aplicados.projetoId === "TODOS" ? undefined : aplicados.projetoId,
            situacoes: aplicados.situacoes,
            de: aplicados.de || undefined,
            ate: aplicados.ate || undefined,
          },
          filterLabels: activeFilters.map((filter) => ({
            label: filter.label,
            value: filter.value,
          })),
        }}
      />
    </ReportShell>
  );
}

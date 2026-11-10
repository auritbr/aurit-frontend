import { CalendarRange, CalendarX, CircleDashed, Clock } from "lucide-react";
import {
  BackendReportPage,
  type BackendReportConfig,
} from "@/components/relatorios/BackendReportPage";
import { situacaoCronogramaLabel } from "@/data/relatorioCronogramaPrazos";

const config: BackendReportConfig = {
  endpoint: "cronograma-prazos",
  title: "Relatório de Cronograma e Prazos",
  tooltip:
    "Etapas do cronograma com datas, duração, situação e projeto vinculado.",
  objective:
    "Acompanhe o cronograma de execução da organização identificando etapas não iniciadas, em andamento e com prazo encerrado, com datas, duração e projeto vinculado.",
  tableTitle: "Etapas do cronograma",
  rowsPath: "etapas",
  emptyMessage:
    "Nenhuma etapa de cronograma encontrada com os filtros selecionados.",
  filters: [
    {
      key: "busca",
      type: "search",
      label: "Busca",
      tooltip: "Busque pela etapa, atividade relacionada ou projeto.",
      placeholder: "Buscar etapa...",
      options: () => [],
    },
    {
      key: "projetoId",
      type: "select",
      label: "Projeto",
      tooltip: "Filtre as etapas pelo projeto vinculado.",
      options: (data) =>
        (
          (data?.projetosDisponiveis as
            { id: number; nome: string }[] | undefined) ?? []
        ).map(({ id, nome }) => ({ value: String(id), label: nome })),
    },
    {
      key: "situacoes",
      type: "multi",
      label: "Situação",
      tooltip: "Situação calculada a partir das datas da etapa.",
      options: (data) =>
        ((data?.situacoesDisponiveis as string[] | undefined) ?? []).map(
          (value) => ({ value, label: situacaoCronogramaLabel(value) }),
        ),
    },
    {
      key: "de",
      type: "date",
      label: "Início a partir de",
      tooltip: "Inclui etapas iniciadas a partir desta data.",
      options: () => [],
    },
    {
      key: "ate",
      type: "date",
      label: "Início até",
      tooltip: "Inclui etapas iniciadas até esta data.",
      options: () => [],
    },
  ],
  stats: [
    {
      label: "Etapas",
      path: "totalEtapas",
      icon: CalendarRange,
      tone: "primary",
    },
    {
      label: "Em andamento",
      path: "etapasEmAndamento",
      icon: Clock,
      tone: "info",
    },
    {
      label: "Não iniciadas",
      path: "etapasNaoIniciadas",
      icon: CircleDashed,
      tone: "info",
    },
    {
      label: "Prazo encerrado",
      path: "etapasPrazoEncerrado",
      icon: CalendarX,
      tone: "warning",
    },
  ],
  charts: [
    {
      title: "Etapas por situação",
      description: "Situação das etapas conforme os prazos.",
      path: "etapasPorSituacao",
      type: "pie",
      label: situacaoCronogramaLabel,
      selection: { label: "Situação", values: (row) => row.situacao },
    },
    {
      title: "Etapas por projeto",
      description: "Volume de etapas planejadas em cada projeto.",
      path: "etapasPorProjeto",
      type: "bar",
      label: (value) => value,
      selection: { label: "Projeto", values: (row) => row.projeto },
    },
  ],
  columns: [
    { key: "etapa", label: "Etapa" },
    { key: "atividade", label: "Atividade relacionada", pdfKey: false },
    { key: "projeto", label: "Projeto" },
    { key: "inicio", label: "Início", format: "date" },
    { key: "fim", label: "Término", format: "date" },
    {
      key: "duracaoDias",
      label: "Duração",
      accessor: (row) => (row.duracaoDias ? `${row.duracaoDias} dia(s)` : "—"),
    },
    {
      key: "situacao",
      label: "Situação",
      statusContext: "cronograma",
      accessor: (row) => situacaoCronogramaLabel(String(row.situacao ?? "—")),
    },
    { key: "descricao", label: "Descrição", notSortable: true },
  ],
};

export default function RelatorioCronogramaPrazos() {
  return <BackendReportPage config={config} />;
}

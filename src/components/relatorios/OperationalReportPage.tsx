import { reportFieldLabel } from "@/report/general/reportFieldLabels";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  Image,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { ReportColumnFilterPanel } from "./ReportColumnFilterPanel";
import { useReportColumnFilters } from "@/hooks/useReportColumnFilters";
import { useEvidenceReportFilters } from "@/hooks/useEvidenceReportFilters";
import { EvidenceSearchFields } from "@/components/EvidenceSearchFields";
import type { ReportFilterColumn } from "@/lib/reportColumnFilters";
import {
  ReportFilterPanel,
  filterFieldClass,
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportLineChart,
  ReportPieChart,
  ReportShell,
  ReportStatCard,
  ReportStatGrid,
  ReportStatSkeleton,
  ReportTable,
  type ReportTableColumn,
} from "@/components/relatorios/ReportKit";
import {
  getEvidenciasExecucao,
  getEvidenciasFotograficas,
  getPropostasEditalOptions as getPropostasEvidenciaOptions,
  getAcoesDivulgacaoOptions,
  getPresencasOptions,
  tipoEvidenciaLabel,
  tipoVinculoLabel,
} from "@/data/evidencias";
import {
  getAgentesOptions,
  getPrestacoesContas,
  getPropostasEditalOptions,
  produtosGeradosTexto,
  statusPrestacaoContasLabel,
} from "@/data/prestacaoContas";
import {
  getPrestacaoMetas,
  getMetasProjetoOptions,
  statusCumprimentoLabel,
} from "@/data/prestacaoMetas";
import {
  getEmprestimos,
  estadoConservacaoEmprestimoLabel,
  estadoDevolucaoLabel,
  statusEmprestimoLabel,
  tipoDestinatarioLabel,
} from "@/data/emprestimos";
import { apiFetch } from "@/lib/api";
import { getRelatorioDetalhado, type Indicador } from "@/data/relatorios";

type Kind =
  "evidencias" | "prestacoes-contas" | "prestacoes-metas" | "emprestimos";
type Row = Record<string, string | number> & { id: string; situacao: string };

const date = (value: string) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const text = (value: unknown) =>
  value === "" || value == null ? "—" : String(value);
const localDate = (value: unknown) => {
  const raw = String(value ?? "");
  const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(raw)
    ? `${raw.slice(6)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}`
    : raw;
  const parsed = new Date(`${iso}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const metadata: Record<
  Kind,
  { title: string; tooltip: string; objective: string; table: string }
> = {
  evidencias: {
    title: "Evidências",
    tooltip:
      "Use este relatório para localizar os materiais que demonstram a realização das ações e verificar a qual parte da execução cada evidência foi relacionada.",
    objective:
      "Consulte as evidências registradas e acompanhe seus tipos, vínculos e referências para identificar os materiais utilizados na comprovação das ações realizadas.",
    table: "Evidências registradas",
  },

  "prestacoes-contas": {
    title: "Prestação de Contas",
    tooltip:
      "Use este relatório para acompanhar a preparação e a situação das prestações de contas e consultar os registros utilizados para demonstrar a execução e os resultados dos projetos.",
    objective:
      "Acompanhe as prestações de contas cadastradas e consulte responsáveis, entregas, metas avaliadas, produtos registrados, análises e a situação de cada prestação.",
    table: "Prestações de contas",
  },

  "prestacoes-metas": {
    title: "Cumprimento de Metas",
    tooltip:
      "Use este relatório para comparar o que foi previsto com o que foi realizado em cada meta e identificar resultados cumpridos, parcialmente cumpridos ou que ainda precisam de acompanhamento ou justificativa.",
    objective:
      "Acompanhe o cumprimento das metas comparando as quantidades previstas e executadas, o percentual alcançado, as justificativas e as evidências vinculadas aos resultados.",
    table: "Cumprimento de metas",
  },

  emprestimos: {
    title: "Empréstimos",
    tooltip:
      "Use este relatório para verificar quais bens foram emprestados, quem está responsável por cada um, quando devem ser devolvidos e em quais condições foram entregues ou recebidos de volta.",
    objective:
      "Acompanhe os empréstimos de bens patrimoniais e consulte os bens envolvidos, destinatários, períodos de utilização, prazos de devolução, condições de conservação e situação de cada empréstimo.",
    table: "Empréstimos registrados",
  },
};

async function loadRows(kind: Kind): Promise<Row[]> {
  if (kind === "emprestimos") {
    const [
      emprestimos,
      patrimoniosResponse,
      colaboradoresResponse,
      participantesResponse,
      integrantesResponse,
      projetosResponse,
      propostasResponse,
      atividadesResponse,
      eventosResponse,
    ] = await Promise.all([
      getEmprestimos(),
      apiFetch<unknown>("/patrimonios"),
      apiFetch<unknown>("/colaboradores"),
      apiFetch<unknown>("/participantes"),
      apiFetch<unknown>("/integrantes"),
      apiFetch<unknown>("/projetos"),
      apiFetch<unknown>("/propostas-editais"),
      apiFetch<unknown>("/atividades"),
      apiFetch<unknown>("/eventos-culturais"),
    ]);
    const list = (response: unknown): Record<string, unknown>[] => {
      if (Array.isArray(response)) return response as Record<string, unknown>[];
      if (response && typeof response === "object") {
        const record = response as Record<string, unknown>;
        for (const key of [
          "content",
          "dados",
          "items",
          "registros",
          "resultados",
        ]) {
          if (Array.isArray(record[key]))
            return record[key] as Record<string, unknown>[];
        }
      }
      return [];
    };
    const [
      patrimonios,
      colaboradores,
      participantes,
      integrantes,
      projetos,
      propostas,
      atividades,
      eventos,
    ] = [
      patrimoniosResponse,
      colaboradoresResponse,
      participantesResponse,
      integrantesResponse,
      projetosResponse,
      propostasResponse,
      atividadesResponse,
      eventosResponse,
    ].map(list);
    const name = (
      items: Record<string, unknown>[],
      id: string,
      keys: string[],
    ) => {
      const item = items.find((entry) => String(entry.id) === id);
      if (!item) return undefined;
      const nested = [
        item.patrimonio,
        item.projeto,
        item.propostaEdital,
        item.atividade,
        item.eventoCultural,
      ].filter((value) => value && typeof value === "object") as Record<
        string,
        unknown
      >[];
      return [
        ...keys.map((key) => item[key]),
        ...nested.flatMap((entry) => keys.map((key) => entry[key])),
      ].find((value) => typeof value === "string" && value.trim()) as
        string | undefined;
    };
    return emprestimos.map((item) => {
      const responsavel =
        item.tipoDestinatario === "COLABORADOR"
          ? name(colaboradores, item.colaboradorId, ["nomeCompleto", "nome"])
          : item.tipoDestinatario === "PARTICIPANTE"
            ? name(participantes, item.participanteId, ["nomeCompleto", "nome"])
            : item.tipoDestinatario === "INTEGRANTE"
              ? name(integrantes, item.integranteId, ["nomeCompleto", "nome"])
              : item.destinatarioExterno;
      const vinculos = [
        item.projetoId &&
          `Projeto: ${name(projetos, item.projetoId, ["nomeProjeto", "tituloProjeto", "nome"]) ?? "Registro vinculado"}`,
        item.propostaEditalId &&
          `Proposta: ${name(propostas, item.propostaEditalId, ["tituloProjeto", "nomeProposta", "tituloProposta", "nomeProjeto", "nome"]) ?? "Registro vinculado"}`,
        item.atividadeId &&
          `Atividade: ${name(atividades, item.atividadeId, ["nomeAtividade", "tituloAtividade", "nome"]) ?? "Registro vinculado"}`,
        item.eventoCulturalId &&
          `Evento cultural: ${name(eventos, item.eventoCulturalId, ["nomeEvento", "tituloEvento", "nome"]) ?? "Registro vinculado"}`,
      ]
        .filter(Boolean)
        .join(" · ");
      const patrimonio = name(patrimonios, item.patrimonioId, [
        "nomePatrimonio",
        "tituloPatrimonio",
        "descricaoPatrimonio",
        "nome",
      ]);
      return {
        id: item.id,
        patrimonio_id: item.patrimonioId,
        projeto_id: item.projetoId,
        projeto:
          name(projetos, item.projetoId, [
            "nomeProjeto",
            "tituloProjeto",
            "nome",
          ]) ?? "",
        proposta_id: item.propostaEditalId,
        proposta:
          name(propostas, item.propostaEditalId, [
            "tituloProjeto",
            "nomeProposta",
            "nome",
          ]) ?? "",
        atividade_id: item.atividadeId,
        atividade:
          name(atividades, item.atividadeId, ["nomeAtividade", "nome"]) ?? "",
        evento_id: item.eventoCulturalId,
        evento:
          name(eventos, item.eventoCulturalId, [
            "nomeEvento",
            "tituloEvento",
            "nome",
          ]) ?? "",
        patrimonio: patrimonio || "Patrimônio não localizado",
        responsavel: responsavel || "Responsável não localizado",
        tipoDestinatario: tipoDestinatarioLabel(item.tipoDestinatario),
        vinculo: vinculos || "Sem vínculo",
        emprestimo: item.dataEmprestimo,
        devolucaoPrevista: item.dataPrevistaDevolucao,
        devolucao: item.dataDevolucao,
        conservacao: estadoConservacaoEmprestimoLabel(item.estadoConservacao),
        estadoDevolucao: estadoDevolucaoLabel(item.estadoDevolucao),
        situacao: statusEmprestimoLabel(item.statusEmprestimo),
        observacao: item.observacaoEmprestimo,
      };
    });
  }
  if (kind === "evidencias") {
    const [items, propostas, acoes, presencas, planosResponse, fotografias] =
      await Promise.all([
        getEvidenciasExecucao(),
        getPropostasEvidenciaOptions(),
        getAcoesDivulgacaoOptions(),
        getPresencasOptions(),
        apiFetch<Record<string, unknown>[]>("/planos-aula"),
        getEvidenciasFotograficas(),
      ]);
    const nome = (
      opcoes: { id: string; nome: string }[],
      id: string,
      vazio = "—",
    ) => opcoes.find((opcao) => opcao.id === id)?.nome ?? vazio;
    const planoNome = (id: string) => {
      const plano = planosResponse.find((item) => String(item.id) === id);
      return typeof plano?.tituloPlanoAula === "string"
        ? plano.tituloPlanoAula
        : typeof plano?.nomePlanoAula === "string"
          ? plano.nomePlanoAula
          : "—";
    };
    return fotografias.map((foto) => {
      const item = items.find((item) => String(item.id) === String(foto.id));
      const referencia =
        foto.contexto === "AULA"
          ? [
              foto.atividade?.nome,
              foto.turma?.nome,
              foto.planoAula
                ? `${date(foto.planoAula.dataInicio)} — ${foto.planoAula.nome}`
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          : [foto.eventoCultural?.nome, foto.eventoCultural?.local]
              .filter(Boolean)
              .join(" ");
      return {
        contexto: foto.contexto,
        projeto_id: String(foto.projeto.id),
        atividade_id: String(foto.atividade?.id ?? ""),
        turma_id: String(foto.turma?.id ?? ""),
        evento_id: String(foto.eventoCultural?.id ?? ""),
        data: foto.dataReferencia?.slice(0, 10) ?? "",
        imagens: foto.quantidadeImagens,
        referencia,
        pesquisa: [
          foto.contexto === "AULA" ? "Aula" : "Evento Cultural",
          foto.projeto.nome,
          referencia,
          foto.descricao,
        ].join(" "),
        id: String(foto.id),
        titulo: foto.titulo,
        tipo: tipoEvidenciaLabel(foto.tipoEvidencia),
        vinculo: item
          ? tipoVinculoLabel(item.tipoVinculoEvidencia)
          : foto.contexto === "AULA"
            ? "Plano de aula"
            : "Evento cultural",
        projeto: foto.projeto.nome,
        proposta: nome(propostas, item?.propostaEdital ?? ""),
        planoAula: foto.planoAula?.nome ?? planoNome(item?.planoAula ?? ""),
        atividade: foto.atividade?.nome ?? "—",
        turma: foto.turma?.nome ?? "—",
        evento: foto.eventoCultural?.nome ?? "—",
        acaoDivulgacao: nome(acoes, item?.acaoDivulgacao ?? ""),
        presenca: nome(presencas, item?.presenca ?? ""),
        situacao: foto.contexto === "AULA" ? "Aula" : "Evento Cultural",
        observacao: foto.descricao ?? item?.observacaoEvidencia ?? "",
      };
    });
  }
  if (kind === "prestacoes-contas") {
    const [items, propostas, agentes] = await Promise.all([
      getPrestacoesContas(),
      getPropostasEditalOptions(),
      getAgentesOptions(),
    ]);
    return items.map((item) => ({
      id: item.id,
      proposta:
        propostas.find((proposta) => proposta.id === item.propostaEdital)
          ?.nome ?? "Proposta não localizada",
      responsavel:
        agentes.find((agente) => agente.id === item.agente)?.nome ??
        "Responsável não localizado",
      entrega: date(item.dataEntrega),
      metas: item.prestacaoMetas.length,
      produtos: produtosGeradosTexto(item.produtosGerados),
      situacao: statusPrestacaoContasLabel(item.statusPrestacaoContas),
    }));
  }
  const [items, metas] = await Promise.all([
    getPrestacaoMetas(),
    getMetasProjetoOptions(),
  ]);
  return items.map((item) => ({
    id: item.id,
    meta:
      metas.find((meta) => meta.id === item.metaProjeto)?.tituloMeta ??
      `Meta #${item.metaProjeto}`,
    meta_id: item.metaProjeto,
    executado: item.quantidadeExecutada || "0",
    percentual: Number(item.percentualExecutado ?? 0),
    evidencias: item.evidencias.length,
    situacao: statusCumprimentoLabel(item.statusCumprimentoMeta),
    observacao: item.observacaoCumprimento,
  }));
}

const operationalPdfKeys: Partial<Record<Kind, Record<string, string>>> = {
  evidencias: {
    titulo: "titulo_evidencia",
    tipo: "tipo_evidencia",
    vinculo: "tipo_vinculo_evidencia",
    projeto: "projeto",
    proposta: "proposta_edital",
    planoAula: "plano_aula",
    atividade: "atividade",
    turma: "turma",
    evento: "evento_cultural",
    acaoDivulgacao: "acao_divulgacao",
    presenca: "presenca",
    observacao: "observacao_evidencia",
  },
  "prestacoes-metas": {
    meta: "titulo_meta",
    executado: "quantidade_executada",
    percentual: "percentual_executado",
    evidencias: "quantidade_evidencias",
    observacao: "observacao_cumprimento",
    situacao: "status_cumprimento_meta",
  },
  emprestimos: {
    patrimonio: "patrimonio",
    responsavel: "responsavel_emprestimo",
    tipoDestinatario: "tipo_destinatario_emprestimo",
    vinculo: "vinculo_emprestimo",
    emprestimo: "data_emprestimo",
    devolucaoPrevista: "data_prevista_devolucao",
    devolucao: "data_devolucao",
    conservacao: "estado_conservacao",
    estadoDevolucao: "estado_devolucao",
    observacao: "observacao_emprestimo",
    situacao: "status_emprestimo",
  },
};

function columnsFor(kind: Kind): ReportTableColumn<Row>[] {
  const base: Record<Kind, Array<[string, string]>> = {
    evidencias: [
      ["titulo", "Título"],
      ["tipo", "Tipo"],
      ["vinculo", "Vínculo"],
      ["projeto", "Projeto"],
      ["proposta", "Proposta"],
      ["planoAula", "Plano de aula"],
      ["atividade", "Atividade"],
      ["turma", "Turma"],
      ["evento", "Evento cultural"],
      ["acaoDivulgacao", "Ação de divulgação"],
      ["presenca", "Presença"],
      ["observacao", "Observações"],
    ],
    "prestacoes-contas": [
      ["proposta", "Proposta"],
      ["responsavel", "Responsável"],
      ["entrega", "Entrega"],
      ["metas", "Metas avaliadas"],
      ["produtos", "Produtos"],
    ],
    "prestacoes-metas": [
      ["meta", "Meta"],
      ["executado", "Executado"],
      ["percentual", "% executado"],
      ["evidencias", "Evidências"],
      ["observacao", "Observação"],
    ],
    emprestimos: [
      ["patrimonio", "Patrimônio"],
      ["responsavel", "Responsável"],
      ["tipoDestinatario", "Tipo de destinatário"],
      ["vinculo", "Vínculo"],
      ["emprestimo", "Empréstimo"],
      ["devolucaoPrevista", "Devolução prevista"],
      ["devolucao", "Devolução"],
      ["conservacao", "Conservação"],
      ["estadoDevolucao", "Estado na devolução"],
      ["observacao", "Observações"],
    ],
  };
  const camposLongos: Record<Kind, string[]> = {
    evidencias: [
      "titulo",
      "projeto",
      "proposta",
      "planoAula",
      "atividade",
      "turma",
      "evento",
      "acaoDivulgacao",
      "presenca",
      "observacao",
    ],
    "prestacoes-contas": ["proposta", "responsavel", "produtos"],
    "prestacoes-metas": ["meta", "evidencias", "observacao"],
    emprestimos: ["patrimonio", "responsavel", "vinculo", "observacao"],
  };
  const deveTruncar = (key: string) => camposLongos[kind].includes(key);

  return [
    ...base[kind].map(([key, label], index) => ({
      key,
      label,
      pdfKey: operationalPdfKeys[kind]?.[key],
      alwaysVisible: index < 2,
      hiddenByDefault: key === "observacao",
      accessor: (row: Row) =>
        key === "percentual"
          ? `${Number(row[key] ?? 0).toLocaleString("pt-BR")}%`
          : text(row[key]),
      render: deveTruncar(key)
        ? (row: Row) => {
            const conteudo =
              key === "percentual"
                ? `${Number(row[key] ?? 0).toLocaleString("pt-BR")}%`
                : text(row[key]);
            return (
              <span className="block max-w-[230px] truncate" title={conteudo}>
                {conteudo}
              </span>
            );
          }
        : undefined,
    })),
    ...(kind === "evidencias"
      ? []
      : [
          {
            key: "situacao",
            pdfKey: operationalPdfKeys[kind]?.situacao,
            label: kind === "prestacoes-metas" ? "Cumprimento" : "Situação",
            accessor: (row: Row) => row.situacao,
          },
        ]),
  ];
}

function countBy(rows: Row[], key: string) {
  const counts = rows.reduce((map, row) => {
    const label = String(row[key] || "Não informado");
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  return Array.from(counts, ([name, value]) => ({ name, value }));
}

function countByMonth(rows: Row[], key: string) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const value = localDate(row[key]);
    if (!value) return;
    const month = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    totals.set(month, (totals.get(month) ?? 0) + 1);
  });
  return Array.from(totals, ([month, value]) => ({ month, value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, value }) => ({
      name: `${month.slice(5)}/${month.slice(0, 4)}`,
      value,
    }));
}

const operationalFilterColumns: Record<Kind, ReportFilterColumn[]> = {
  emprestimos: [
    {
      chave: "tipoDestinatario",
      label: reportFieldLabel(
        "emprestimos",
        "tipoDestinatario",
        "Tipo de destinatário",
      ),
      filterType: "multi",
    },
    {
      chave: "patrimonio_id",
      label: reportFieldLabel("emprestimos", "patrimonio_id", "Patrimônio"),
      filterType: "multi",
      optionLabelKey: "patrimonio",
    },
    {
      chave: "projeto_id",
      label: reportFieldLabel("emprestimos", "projeto_id", "Projeto"),
      filterType: "multi",
      optionLabelKey: "projeto",
    },
    {
      chave: "proposta_id",
      label: reportFieldLabel("emprestimos", "proposta_id", "Proposta"),
      filterType: "multi",
      optionLabelKey: "proposta",
    },
    {
      chave: "atividade_id",
      label: reportFieldLabel("emprestimos", "atividade_id", "Atividade"),
      filterType: "multi",
      optionLabelKey: "atividade",
    },
    {
      chave: "evento_id",
      label: reportFieldLabel("emprestimos", "evento_id", "Evento cultural"),
      filterType: "multi",
      optionLabelKey: "evento",
    },
    {
      chave: "emprestimo",
      label: reportFieldLabel(
        "emprestimos",
        "emprestimo",
        "Data do empréstimo",
      ),
      filterType: "date",
    },
    {
      chave: "devolucao",
      label: reportFieldLabel("emprestimos", "devolucao", "Data de devolução"),
      filterType: "date",
    },
    {
      chave: "conservacao",
      label: reportFieldLabel(
        "emprestimos",
        "conservacao",
        "Estado de conservação",
      ),
      filterType: "multi",
    },
    {
      chave: "situacao",
      label: reportFieldLabel("emprestimos", "situacao", "Situação"),
      filterType: "multi",
    },
  ],
  "prestacoes-metas": [
    {
      chave: "meta_id",
      label: reportFieldLabel("prestacoes-metas", "meta_id", "Meta do projeto"),
      filterType: "multi",
      optionLabelKey: "meta",
    },
    {
      chave: "executado",
      label: reportFieldLabel(
        "prestacoes-metas",
        "executado",
        "Quantidade executada",
      ),
      filterType: "multi",
    },
    {
      chave: "situacao",
      label: reportFieldLabel("prestacoes-metas", "situacao", "Situação"),
      filterType: "multi",
    },
  ],
  evidencias: [],
  "prestacoes-contas": [],
};

export function OperationalReportPage({ kind }: { kind: Kind }) {
  const meta = metadata[kind];
  const [rows, setRows] = useState<Row[]>([]);
  const [indicadoresBackend, setIndicadoresBackend] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);
  const columnFilters = useReportColumnFilters(
    kind,
    operationalFilterColumns[kind],
    rows,
  );
  const evidenceFilters = useEvidenceReportFilters(rows);
  const filtered = (
    kind === "evidencias"
      ? evidenceFilters.filteredRows
      : columnFilters.filteredRows
  ) as Row[];
  const activeFilters =
    kind === "evidencias"
      ? evidenceFilters.activeFilters
      : columnFilters.activeFilters;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [linhas, resumo] = await Promise.all([
        loadRows(kind),
        getRelatorioDetalhado(kind).catch(() => null),
      ]);
      setRows(linhas);
      setIndicadoresBackend(
        resumo?.resumo?.flatMap((grupo) => grupo.indicadores) ?? [],
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
  }, [kind]);
  useEffect(() => {
    void load();
  }, [load]);
  const normalizarSituacao = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  const indicador = (chave: string, fallback: string | number) =>
    activeFilters.length
      ? fallback
      : (indicadoresBackend.find((item) => item.chave === chave)?.valor ??
        fallback);
  const cards =
    kind === "evidencias"
      ? [
          [
            "Evidências registradas",
            indicador("evidencias_registradas", filtered.length),
            Image,
            "primary" as const,
          ],
          [
            "Evidências de aula",
            indicador(
              "evidencias_aula",
              filtered.filter((row) =>
                String(row.vinculo).toLowerCase().includes("plano de aula"),
              ).length,
            ),
            ClipboardCheck,
            "info" as const,
          ],
          [
            "Evidências de eventos culturais",
            indicador(
              "evidencias_eventos",
              filtered.filter((row) =>
                String(row.vinculo).toLowerCase().includes("evento cultural"),
              ).length,
            ),
            BadgeCheck,
            "success" as const,
          ],
          [
            "Projetos com evidências",
            indicador(
              "projetos_com_evidencias",
              new Set(
                filtered
                  .map((row) => row.projeto)
                  .filter((value) => value && value !== "—"),
              ).size,
            ),
            Target,
            "neutral" as const,
          ],
          [
            "Fotografias",
            indicador(
              "fotografias",
              filtered.filter(
                (row) => String(row.tipo).toLowerCase() === "foto",
              ).length,
            ),
            Image,
            "warning" as const,
          ],
          [
            "Links relacionados",
            indicador("links_relacionados", 0),
            ClipboardCheck,
            "info" as const,
          ],
        ]
      : kind === "prestacoes-metas"
        ? [
            [
              "Metas avaliadas",
              indicador("metas_avaliadas", filtered.length),
              Target,
              "primary" as const,
            ],
            [
              "Cumpridas",
              indicador(
                "cumpridas",
                filtered.filter((row) =>
                  normalizarSituacao(row.situacao).includes(
                    "CUMPRIDA INTEGRALMENTE",
                  ),
                ).length,
              ),
              BadgeCheck,
              "success" as const,
            ],
            [
              "Parcialmente cumpridas",
              indicador(
                "parcialmente_cumpridas",
                filtered.filter((row) =>
                  normalizarSituacao(row.situacao).includes("PARCIALMENTE"),
                ).length,
              ),
              Target,
              "warning" as const,
            ],
            [
              "Não cumpridas",
              indicador(
                "nao_cumpridas",
                filtered.filter((row) =>
                  normalizarSituacao(row.situacao).includes("NAO CUMPRIDA"),
                ).length,
              ),
              Target,
              "danger" as const,
            ],
            [
              "Não avaliadas",
              indicador("nao_avaliadas", 0),
              ClipboardCheck,
              "neutral" as const,
            ],
            [
              "Percentual de cumprimento",
              `${Number(indicador("percentual_cumprimento", filtered.length ? filtered.reduce((sum, row) => sum + Number(row.percentual ?? 0), 0) / filtered.length : 0)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
              Target,
              "info" as const,
            ],
          ]
        : kind === "emprestimos"
          ? [
              [
                "Empréstimos",
                indicador("emprestimos", filtered.length),
                FileCheck2,
                "primary" as const,
              ],
              [
                "Em aberto",
                indicador(
                  "em_aberto",
                  filtered.filter((row) =>
                    ["EM ANDAMENTO", "ATRASADO"].includes(
                      normalizarSituacao(row.situacao),
                    ),
                  ).length,
                ),
                ClipboardCheck,
                "info" as const,
              ],
              [
                "Devolvidos",
                indicador(
                  "devolvidos",
                  filtered.filter(
                    (row) => normalizarSituacao(row.situacao) === "DEVOLVIDO",
                  ).length,
                ),
                BadgeCheck,
                "success" as const,
              ],
              [
                "Devoluções próximas",
                indicador(
                  "devolucoes_proximas",
                  filtered.filter((row) => {
                    const d = localDate(row.devolucaoPrevista);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const limite = new Date(hoje);
                    limite.setDate(limite.getDate() + 7);
                    return (
                      !row.devolucao &&
                      d !== null &&
                      d >= hoje &&
                      d <= limite &&
                      ["EM ANDAMENTO", "ATRASADO"].includes(
                        normalizarSituacao(row.situacao),
                      )
                    );
                  }).length,
                ),
                Target,
                "warning" as const,
              ],
              [
                "Devoluções atrasadas",
                indicador(
                  "devolucoes_atrasadas",
                  filtered.filter((row) => {
                    const d = localDate(row.devolucaoPrevista);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    return (
                      !row.devolucao &&
                      d !== null &&
                      d < hoje &&
                      ["EM ANDAMENTO", "ATRASADO"].includes(
                        normalizarSituacao(row.situacao),
                      )
                    );
                  }).length,
                ),
                Target,
                "danger" as const,
              ],
              [
                "Bens emprestados",
                indicador(
                  "bens_emprestados",
                  new Set(filtered.map((row) => row.patrimonio).filter(Boolean))
                    .size,
                ),
                FileCheck2,
                "neutral" as const,
              ],
            ]
          : null;
  const tableColumns = useMemo(() => columnsFor(kind), [kind]);
  return (
    <ReportShell
      title={meta.title}
      tooltip={meta.tooltip}
      objective={meta.objective}
    >
      {kind === "evidencias" ? (
        <ReportFilterPanel
          storageKey="relatorio-evidencias"
          activeFilters={activeFilters}
          loading={loading}
          onSubmit={evidenceFilters.apply}
          onClear={evidenceFilters.clear}
        >
          <EvidenceSearchFields
            draft={evidenceFilters.draft}
            setDraftField={evidenceFilters.setDraftField}
            contextoOptions={evidenceFilters.optionGroups.contexto}
            projetoOptions={evidenceFilters.optionGroups.projeto}
            atividadeOptions={evidenceFilters.optionGroups.atividade}
            turmaOptions={evidenceFilters.optionGroups.turma}
            eventoOptions={evidenceFilters.optionGroups.evento}
            inputClass={filterFieldClass}
            loading={loading}
          />
        </ReportFilterPanel>
      ) : (
        <ReportColumnFilterPanel
          scope={kind}
          columns={operationalFilterColumns[kind]}
          rows={rows}
          filters={columnFilters}
          loading={loading}
        />
      )}

      <ReportStatGrid>
        {loading ? (
          <ReportStatSkeleton count={6} />
        ) : cards ? (
          cards.map(([label, value, Icon, tone]) => (
            <ReportStatCard
              key={String(label)}
              icon={Icon as typeof Target}
              tone={
                tone as
                  | "primary"
                  | "success"
                  | "warning"
                  | "danger"
                  | "info"
                  | "neutral"
              }
              label={String(label)}
              valor={String(value)}
            />
          ))
        ) : (
          <>
            <ReportStatCard
              icon={kind === "evidencias" ? Image : FileCheck2}
              label={kind === "evidencias" ? "Evidências" : "Prestações"}
              valor={String(filtered.length)}
            />
            <ReportStatCard
              icon={BadgeCheck}
              tone="success"
              label={
                kind === "evidencias"
                  ? "Projetos vinculados"
                  : "Metas avaliadas"
              }
              valor={String(
                kind === "evidencias"
                  ? new Set(filtered.map((row) => row.projeto).filter(Boolean))
                      .size
                  : filtered.reduce((sum, row) => sum + Number(row.metas), 0),
              )}
            />
            <ReportStatCard
              icon={ClipboardCheck}
              tone="info"
              label="Situações"
              valor={String(new Set(filtered.map((row) => row.situacao)).size)}
            />
          </>
        )}
      </ReportStatGrid>
      {kind === "emprestimos" ? (
        <ReportChartGrid>
          <ReportChartCard
            title="Situação dos empréstimos"
            description="Veja como os empréstimos estão distribuídos conforme sua situação atual."
          >
            <ReportPieChart
              reportKey={kind}
              data={countBy(filtered, "situacao")}
            />
          </ReportChartCard>
          <ReportChartCard
            title="Devoluções previstas por período"
            description="Acompanhe quantos bens possuem devolução prevista ao longo dos períodos para identificar quando os empréstimos deverão ser encerrados."
          >
            <ReportLineChart
              reportKey={`${kind}-devolucoes-previstas`}
              data={countByMonth(filtered, "devolucaoPrevista")}
            />
          </ReportChartCard>
        </ReportChartGrid>
      ) : (
        <ReportChartGrid>
          <ReportChartCard
            title={
              kind === "evidencias"
                ? "Evidências por tipo"
                : kind === "prestacoes-contas"
                  ? "Prestações por situação"
                  : "Metas por cumprimento"
            }
          >
            <ReportBarChart
              reportKey={kind}
              data={countBy(
                filtered,
                kind === "evidencias" ? "tipo" : "situacao",
              )}
            />
          </ReportChartCard>
          <ReportChartCard
            title={
              kind === "evidencias"
                ? "Evidências por vínculo"
                : kind === "prestacoes-contas"
                  ? "Metas avaliadas por prestação"
                  : "% executado por meta"
            }
          >
            <ReportBarChart
              reportKey={`${kind}-detalhe`}
              data={
                kind === "prestacoes-contas"
                  ? filtered.map((row) => ({
                      name: String(row.proposta || "Sem proposta"),
                      value: Number(row.metas ?? 0),
                    }))
                  : kind === "prestacoes-metas"
                    ? filtered.map((row) => ({
                        name: String(row.meta),
                        value: Number(row.percentual ?? 0),
                      }))
                    : countBy(filtered, "vinculo")
              }
            />
          </ReportChartCard>
        </ReportChartGrid>
      )}
      <ReportTable
        sortResetKey={
          kind === "evidencias"
            ? `${evidenceFilters.applied.sortBy}-${evidenceFilters.applied.sortDir}`
            : kind
        }
        title={meta.table}
        description={loading ? "Carregando dados atualizados..." : undefined}
        rows={filtered}
        columns={tableColumns}
        reportName={meta.title}
        rowKey={(row) => row.id}
        emptyMessage={
          loading
            ? "Carregando..."
            : "Nenhum registro encontrado com os filtros selecionados."
        }
        pdfExport={
          kind !== "prestacoes-contas"
            ? {
                slug: kind,
                filters: {
                  ...(kind === "evidencias"
                    ? {
                        rowOrder: {
                          key: "evidencia_id",
                          values: filtered.map((row) => String(row.id)),
                        },
                      }
                    : {}),
                  columnFilters: {
                    [kind === "emprestimos"
                      ? "emprestimo_id"
                      : kind === "prestacoes-metas"
                        ? "prestacao_meta_id"
                        : "evidencia_id"]: {
                      values: filtered.map((row) => String(row.id)),
                    },
                  },
                },
                filterLabels:
                  kind === "evidencias"
                    ? evidenceFilters.filterLabels
                    : columnFilters.filterLabels,
              }
            : undefined
        }
      />
    </ReportShell>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  Image,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  FiltroBusca,
  FiltroSelect,
} from "@/components/relatorios/FinanceiroFilterFields";
import {
  ReportFilterPanel,
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
  getProjetosOptions,
  getPropostasEditalOptions as getPropostasEvidenciaOptions,
  getAtividadesOptions,
  getTurmasOptions,
  getEventosCulturaisOptions,
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
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import { getRelatorioDetalhado, type Indicador } from "@/data/relatorios";

type Kind =
  | "evidencias"
  | "prestacoes-contas"
  | "prestacoes-metas"
  | "emprestimos";
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
        | string
        | undefined;
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
    const [
      items,
      projetos,
      propostas,
      atividades,
      turmas,
      eventos,
      acoes,
      presencas,
      planosResponse,
    ] = await Promise.all([
      getEvidenciasExecucao(),
      getProjetosOptions(),
      getPropostasEvidenciaOptions(),
      getAtividadesOptions(),
      getTurmasOptions(),
      getEventosCulturaisOptions(),
      getAcoesDivulgacaoOptions(),
      getPresencasOptions(),
      apiFetch<Record<string, unknown>[]>("/planos-aula"),
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
    return items.map((item) => ({
      id: item.id,
      titulo: item.tituloEvidencia,
      tipo: tipoEvidenciaLabel(item.tipoEvidencia),
      vinculo: tipoVinculoLabel(item.tipoVinculoEvidencia),
      projeto: nome(projetos, item.projeto),
      proposta: nome(propostas, item.propostaEdital),
      planoAula: planoNome(item.planoAula),
      atividade: nome(atividades, item.atividade),
      turma: nome(turmas, item.turma),
      evento: nome(eventos, item.eventoCultural),
      acaoDivulgacao: nome(acoes, item.acaoDivulgacao),
      presenca: nome(presencas, item.presenca),
      situacao: tipoVinculoLabel(item.tipoVinculoEvidencia),
      observacao: item.observacaoEvidencia,
    }));
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
    executado: item.quantidadeExecutada || "0",
    percentual: Number(item.percentualExecutado ?? 0),
    evidencias: item.evidencias.length,
    situacao: statusCumprimentoLabel(item.statusCumprimentoMeta),
    observacao: item.observacaoCumprimento,
  }));
}

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
    {
      key: "situacao",
      label: kind === "prestacoes-metas" ? "Cumprimento" : "Situação",
      accessor: (row: Row) => row.situacao,
    },
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

export function OperationalReportPage({ kind }: { kind: Kind }) {
  const meta = metadata[kind];
  const [rows, setRows] = useState<Row[]>([]);
  const [indicadoresBackend, setIndicadoresBackend] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ busca: "", situacao: "TODAS" });
  const [applied, setApplied] = useState(draft);
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
  const situacoes = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.situacao)))
        .filter(Boolean)
        .map((value) => ({ value, label: value })),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const busca = applied.busca
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return (
          (!busca ||
            Object.values(row)
              .join(" ")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .includes(busca)) &&
          (applied.situacao === "TODAS" || row.situacao === applied.situacao)
        );
      }),
    [rows, applied],
  );
  const activeFilters: ActiveFilterItem[] = [
    ...(applied.busca
      ? [
          {
            id: "busca",
            label: "Busca",
            value: applied.busca,
            onRemove: () => setApplied((prev) => ({ ...prev, busca: "" })),
          },
        ]
      : []),
    ...(applied.situacao !== "TODAS"
      ? [
          {
            id: "situacao",
            label: "Situação",
            value: applied.situacao,
            onRemove: () =>
              setApplied((prev) => ({ ...prev, situacao: "TODAS" })),
          },
        ]
      : []),
  ];
  const normalizarSituacao = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  const indicador = (chave: string, fallback: string | number) =>
    indicadoresBackend.find((item) => item.chave === chave)?.valor ?? fallback;
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
  const jasperColumns =
    kind === "evidencias"
      ? [
          "titulo_evidencia",
          "tipo_evidencia",
          "tipo_vinculo_evidencia",
          "contexto",
          "descricao",
          "projeto",
          "proposta_edital",
          "plano_aula",
          "atividade",
          "turma",
          "evento_cultural",
          "acao_divulgacao",
          "presenca",
          "situacao",
          "observacao_evidencia",
        ]
      : kind === "prestacoes-contas"
        ? [
            "proposta_edital",
            "agente",
            "data_entrega",
            "metas_avaliadas",
            "produtos_gerados",
            "status_prestacao_contas",
          ]
        : kind === "prestacoes-metas"
          ? [
              "titulo_meta",
              "proposta_edital",
              "descricao_meta",
              "quantidade_prevista",
              "quantidade_executada",
              "percentual_executado",
              "forma_comprovacao",
              "evidencias",
              "status_cumprimento_meta",
              "observacao_cumprimento",
              "justificativa_nao_cumprimento_integral",
            ]
          : [
              "patrimonio",
              "numero_patrimonio",
              "colaborador",
              "participante",
              "integrante",
              "destinatario_externo",
              "tipo_destinatario_emprestimo",
              "projeto",
              "proposta_edital",
              "atividade",
              "evento_cultural",
              "data_emprestimo",
              "data_prevista_devolucao",
              "data_devolucao",
              "estado_conservacao",
              "estado_devolucao",
              "status_emprestimo",
              "observacao_emprestimo",
              "observacao_devolucao",
            ];
  return (
    <ReportShell
      title={meta.title}
      tooltip={meta.tooltip}
      objective={meta.objective}
    >
      <ReportFilterPanel
        storageKey={`relatorio-${kind}`}
        activeFilters={activeFilters}
        loading={loading}
        onSubmit={() => setApplied({ ...draft })}
        onClear={() => {
          const empty = { busca: "", situacao: "TODAS" };
          setDraft(empty);
          setApplied(empty);
        }}
        hidden
      >
        <FiltroBusca
          id={`${kind}-busca`}
          tooltip="Busque em todos os dados do relatório."
          value={draft.busca}
          onChange={(busca) => setDraft((prev) => ({ ...prev, busca }))}
        />
        <FiltroSelect
          id={`${kind}-situacao`}
          label="Situação"
          tooltip="Filtre pela situação do registro."
          value={draft.situacao}
          onChange={(situacao) => setDraft((prev) => ({ ...prev, situacao }))}
          options={situacoes}
          incluirTodos
        />
      </ReportFilterPanel>
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
        title={meta.table}
        description={loading ? "Carregando dados atualizados..." : undefined}
        rows={filtered}
        columns={columnsFor(kind)}
        reportName={meta.title}
        rowKey={(row) => row.id}
        emptyMessage={
          loading
            ? "Carregando..."
            : "Nenhum registro encontrado com os filtros selecionados."
        }
        pdfExport={
          jasperColumns
            ? {
                slug: kind,
                columns: jasperColumns,
                filters: {
                  busca: applied.busca || undefined,
                  situacao:
                    applied.situacao === "TODAS" ? undefined : applied.situacao,
                },
                filterLabels: activeFilters.map((filter) => ({
                  label: filter.label,
                  value: filter.value,
                })),
              }
            : undefined
        }
      />
    </ReportShell>
  );
}

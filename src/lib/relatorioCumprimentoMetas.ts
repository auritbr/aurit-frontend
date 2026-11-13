import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { downloadFile, XLSX_MIME } from "@/lib/downloadFile";
import { buildFileName } from "@/lib/relatorioExports";
import {
  moeda,
  formatarMes,
  percentualSeguro,
  situacaoCumprimentoLabel,
  somarApurado,
  type MetaCalc,
  type PainelProjeto,
} from "@/lib/cumprimentoMetas";

export interface Filtros {
  projetoId: string;
  metaId: string;
  situacoes: string[];
  inicio: string;
  fim: string;
  busca: string;
}
const brDeIso = (iso?: string | null) =>
  iso ? iso.split("-").reverse().join("/") : "";
export const brl = (v: number | null) =>
  v === null ? "Não informado" : moeda(v);
export const qtd = (v: number | null) =>
  v === null ? "Não apurado" : v.toLocaleString("pt-BR");
export const pctFmt = (v: number | null) =>
  v === null
    ? "Não apurado"
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export const mesLabel = formatarMes;

export function linhaDe(m: MetaCalc) {
  return {
    id: m.meta.id,
    projetoId: m.projeto.id,
    projeto: m.projeto.nomeProjeto,
    numero: m.numero,
    titulo: m.meta.tituloMeta,
    descricao: m.meta.descricaoMeta,
    inicio: brDeIso(m.inicio),
    termino: brDeIso(m.termino),
    prevista: m.quantidadePrevista,
    executada: m.quantidadeExecutada,
    diferenca: m.diferenca,
    percentualFisico: m.percentualFisico,
    situacao: m.situacao,
    situacaoLabel: situacaoCumprimentoLabel(m.situacao),
    orcamento: m.orcamentoPrevisto,
    pago: m.valorPago,
    comprometido: m.valorComprometido,
    saldo: m.saldo,
    percentualFinanceiro: m.percentualFinanceiro,
    itens: m.itens,
    entregas: m.entregas
      .filter((r) => r.concluido)
      .map((r) => ({ ...r, id: `${r.tipo}:${r.id}`, data: r.data ?? "" })),
  };
}
export type LinhaMeta = ReturnType<typeof linhaDe>;

export function indicadores(linhas: LinhaMeta[]) {
  const conta = (s: LinhaMeta["situacao"]) =>
    linhas.filter((l) => l.situacao === s).length;
  const total = linhas.length;
  const cumpridas = conta("CUMPRIDA_INTEGRALMENTE");
  const parciais = conta("CUMPRIDA_PARCIALMENTE");
  const naoCumpridas = conta("NAO_CUMPRIDA");
  const apuradas = cumpridas + parciais + naoCumpridas;
  const orcamento = somarApurado(linhas.map((l) => l.orcamento));
  const pago = somarApurado(linhas.map((l) => l.pago));
  return {
    total,
    cumpridas,
    parciais,
    naoCumpridas,
    apuradas,
    andamento: conta("EM_ANDAMENTO"),
    aguardando: conta("AGUARDANDO_AVALIACAO"),
    pctApuradas: percentualSeguro(apuradas, total),
    pctCumpridas: percentualSeguro(cumpridas, total),
    metasComOrcamento: linhas.filter((l) => l.orcamento !== null).length,
    orcamento,
    pago,
    comprometido: somarApurado(linhas.map((l) => l.comprometido)),
    saldo: somarApurado(linhas.map((l) => l.saldo)),
    pctFinanceiro:
      orcamento === null || pago === null
        ? null
        : percentualSeguro(pago, orcamento),
  };
}

export function montarConsolidado(
  painel: PainelProjeto | undefined,
  f: Filtros,
) {
  const termo = f.busca.trim().toLocaleLowerCase("pt-BR");
  const linhas = (painel?.metas ?? [])
    .filter((m) => f.metaId === "TODAS" || m.meta.id === f.metaId)
    .filter((m) => !f.situacoes.length || f.situacoes.includes(m.situacao))
    .filter(
      (m) =>
        !termo ||
        [
          m.meta.tituloMeta,
          m.meta.descricaoMeta,
          m.projeto.nomeProjeto,
          m.meta.tituloPropostaEdital,
        ].some((v) => v?.toLocaleLowerCase("pt-BR").includes(termo)),
    )
    .map(linhaDe);
  const ids = new Set(linhas.map((l) => l.id));
  const entregas = new Map<string, Set<string>>();
  const pagamentos = new Map<string, number>();
  for (const linha of linhas) {
    for (const entrega of linha.entregas) {
      if (!entrega.data) continue;
      const mes = entrega.data.slice(0, 7);
      const ids = entregas.get(mes) ?? new Set<string>();
      ids.add(entrega.id);
      entregas.set(mes, ids);
    }
  }
  for (const p of painel?.pagamentos ?? []) {
    if (ids.has(String(p.metaId)))
      pagamentos.set(p.mes, (pagamentos.get(p.mes) ?? 0) + p.valor);
  }
  const ordenar = <T>(mapa: Map<string, T>, valor: (v: T) => number) =>
    Array.from(mapa, ([mes, v]) => ({ mes, valor: valor(v) })).sort((a, b) =>
      a.mes.localeCompare(b.mes),
    );
  return {
    linhas,
    ind: indicadores(linhas),
    pagamentosMensais: ordenar(pagamentos, (v) => v),
    entregasMensais: ordenar(entregas, (v) => v.size),
    dataReferencia: painel?.dataReferencia,
  };
}
export type Consolidado = ReturnType<typeof montarConsolidado>;

export type TomPonto = "danger" | "warning" | "info" | "success";
export interface Ponto {
  tom: TomPonto;
  titulo: string;
  descricao: string;
  metas: string;
}
export const rotuloMeta = (l: LinhaMeta, multi: boolean) =>
  `${multi ? l.projeto + " · " : ""}Meta ${l.numero}`;
export function pontosAtencao(linhas: LinhaMeta[], hoje?: string) {
  const multi = new Set(linhas.map((l) => l.projetoId)).size > 1;
  const limite = hoje
    ? new Date(Date.parse(hoje) + 60 * 864e5).toISOString().slice(0, 10)
    : "";
  const prazo = (l: LinhaMeta) => l.termino.split("/").reverse().join("-");
  const abaixo = (l: LinhaMeta) =>
    l.executada !== null &&
    l.executada < l.prevista &&
    l.situacao !== "NAO_CUMPRIDA";
  const prazoProximo = (l: LinhaMeta) =>
    Boolean(hoje && prazo(l) >= hoje && prazo(l) <= limite);
  const regras: [TomPonto, string, string, (l: LinhaMeta) => boolean][] = [
    [
      "danger",
      "Orçamento ultrapassado",
      "O valor pago supera o orçamento previsto da meta.",
      (l) => l.orcamento !== null && l.pago !== null && l.pago > l.orcamento,
    ],
    [
      "danger",
      "Meta não cumprida",
      "Prazo encerrado sem atingir a quantidade prevista.",
      (l) => l.situacao === "NAO_CUMPRIDA",
    ],
    [
      "warning",
      "Execução abaixo do previsto com prazo próximo",
      "Faltam entregas e o prazo encerra nos próximos 60 dias.",
      (l) => abaixo(l) && prazoProximo(l),
    ],
    [
      "warning",
      "Execução física abaixo do previsto",
      "Quantidade executada menor que a prevista.",
      (l) => abaixo(l) && !prazoProximo(l),
    ],
    [
      "warning",
      "Compromissos financeiros pendentes",
      "Há valores comprometidos que ainda não foram pagos.",
      (l) => l.comprometido > 0,
    ],
    [
      "info",
      "Planejamento financeiro não informado",
      "Sem orçamento previsto para esta meta.",
      (l) => l.orcamento === null,
    ],
    [
      "info",
      "Execução física não apurada",
      "Sem entregas vinculadas para calcular a execução.",
      (l) => l.executada === null,
    ],
    [
      "success",
      "Meta integralmente cumprida",
      "A execução apurada atingiu o previsto.",
      (l) => l.situacao === "CUMPRIDA_INTEGRALMENTE",
    ],
  ];
  return regras.flatMap(([tom, titulo, descricao, inclui]) => {
    const metas = linhas.filter(inclui).map((l) => rotuloMeta(l, multi));
    return metas.length
      ? [{ tom, titulo, descricao, metas: metas.join(", ") }]
      : [];
  });
}

export function identificacaoProjeto(
  painel: PainelProjeto | undefined,
  id: string,
) {
  const projeto = painel?.projetos.find((p) => p.id === id);
  if (!projeto) return null;
  const propostas = [
    ...new Set(
      painel.metas
        .filter((m) => m.projeto.id === id)
        .map((m) => m.meta.tituloPropostaEdital)
        .filter(Boolean),
    ),
  ];
  const status: Record<string, string> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };
  return {
    nome: projeto.nomeProjeto,
    periodo:
      projeto.dataInicio || projeto.dataFim
        ? `${brDeIso(projeto.dataInicio) || "—"} a ${brDeIso(projeto.dataFim) || "—"}`
        : "Não informado",
    situacao: status[projeto.status] ?? "Não informada",
    proposta: propostas.join(", ") || "Não vinculada",
  };
}

export type TipoRelatorio = "completo" | "fisico" | "financeiro" | "resumo";
export const tiposRelatorio: {
  value: TipoRelatorio;
  label: string;
  descricao: string;
}[] = [
  {
    value: "completo",
    label: "Relatório Completo",
    descricao: "Indicadores, gráficos, demonstrativos e pontos de atenção.",
  },
  {
    value: "fisico",
    label: "Relatório de Execução Física",
    descricao: "Quantidades previstas e executadas, situação e entregas.",
  },
  {
    value: "financeiro",
    label: "Relatório de Execução Financeira",
    descricao: "Orçamento, pagamentos, compromissos e saldos.",
  },
  {
    value: "resumo",
    label: "Resumo Executivo",
    descricao: "Indicadores principais e pontos de atenção.",
  },
];
export interface ContextoRelatorio {
  organizacao: string;
  projeto: string;
  periodo: string;
  emissao: string;
}
export const nomeArquivo = (tipo: TipoRelatorio, ext: string) =>
  buildFileName(`cumprimento-metas-${tipo}`, ext);

const cabFisico = [
  "Projeto",
  "Meta",
  "Prevista",
  "Executada",
  "Diferença",
  "% Executado",
  "Início",
  "Término",
  "Situação",
];
const cabFinanceiro = [
  "Projeto",
  "Meta",
  "Orçamento",
  "Pago",
  "Comprometido",
  "Saldo",
  "% Financeiro",
];
const cabItens = [
  "Projeto",
  "Meta",
  "Item",
  "Quantidade",
  "Valor unitário",
  "Previsto",
  "Pago",
  "Comprometido",
  "Saldo",
];
const metaNome = (l: LinhaMeta) => `${l.numero}. ${l.titulo}`;
const linhaFisica = (l: LinhaMeta) => [
  l.projeto,
  metaNome(l),
  l.prevista,
  l.executada,
  l.diferenca,
  l.percentualFisico,
  l.inicio,
  l.termino,
  l.situacaoLabel,
];
const linhaFinanceira = (l: LinhaMeta) => [
  l.projeto,
  metaNome(l),
  l.orcamento,
  l.pago,
  l.comprometido,
  l.saldo,
  l.percentualFinanceiro,
];
const linhasItens = (linhas: LinhaMeta[]) =>
  linhas.flatMap((l) =>
    l.itens.map((i) => [
      l.projeto,
      metaNome(l),
      i.ativo ? i.nome : `${i.nome} (inativo)`,
      i.quantidade,
      i.valorUnitario,
      i.previsto,
      i.pago,
      i.comprometido,
      i.saldo,
    ]),
  );
const cabEntregas = ["Projeto", "Meta", "Tipo", "Entrega", "Data"];
const linhasEntregas = (linhas: LinhaMeta[]) =>
  linhas.flatMap((l) =>
    l.entregas.map((e) => [
      l.projeto,
      metaNome(l),
      e.tipo,
      e.nome,
      brDeIso(e.data),
    ]),
  );
const cabPontos = ["Situação", "Descrição", "Metas"];
const linhasPontos = (c: Consolidado) =>
  pontosAtencao(c.linhas, c.dataReferencia).map((p) => [
    p.titulo,
    p.descricao,
    p.metas,
  ]);

function resumo(c: Consolidado, fis: boolean, fin: boolean) {
  const i = c.ind;
  return [
    ["Total de metas", i.total],
    ...(fis
      ? [
          ["Cumpridas integralmente", i.cumpridas],
          ["Cumpridas parcialmente", i.parciais],
          ["Não cumpridas", i.naoCumpridas],
          ["Em andamento", i.andamento],
          ["Aguardando avaliação", i.aguardando],
          ["Situação apurada", pctFmt(i.pctApuradas)],
        ]
      : []),
    ...(fin
      ? [
          ["Orçamento previsto", brl(i.orcamento)],
          ["Valor pago", brl(i.pago)],
          ["Comprometido não pago", brl(i.comprometido)],
          ["Saldo orçamentário", brl(i.saldo)],
          ["Execução financeira", pctFmt(i.pctFinanceiro)],
        ]
      : []),
  ];
}

export function gerarPdfCompleto(
  tipo: TipoRelatorio,
  c: Consolidado,
  ctx: ContextoRelatorio,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth(),
    altura = doc.internal.pageSize.getHeight();
  const margem = 38;
  const fis = tipo === "completo" || tipo === "fisico";
  const fin = tipo === "completo" || tipo === "financeiro";
  const titulo = tiposRelatorio.find((t) => t.value === tipo)?.label ?? "";
  let y = 47;
  function texto(texto: string, tamanho: number, negrito = false) {
    doc.setFont("helvetica", negrito ? "bold" : "normal");
    doc.setFontSize(tamanho);
    const linhas: string[] = doc.splitTextToSize(texto, largura - margem * 2);
    doc.text(linhas, margem, y);
    y += linhas.length * (tamanho + 3);
  }
  texto(ctx.organizacao, 14, true);
  texto(`Cumprimento de Metas - ${titulo}`, 12, true);
  texto(
    `Projeto: ${ctx.projeto} | Período: ${ctx.periodo} | Emissão: ${ctx.emissao}`,
    9,
  );
  texto(
    "O período recorta entregas e a evolução mensal de pagamentos. Os totais financeiros representam a posição atual.",
    8,
  );
  y += 12;

  function secao(titulo: string) {
    if (y > altura - 95) {
      doc.addPage();
      y = 45;
    }
    texto(titulo, 11, true);
  }
  function tabela(
    titulo: string,
    colunas: string[],
    dados: (string | number | null)[][],
  ) {
    if (!dados.length) return;
    secao(titulo);
    autoTable(doc, {
      startY: y,
      head: [colunas],
      body: dados.map((r) =>
        r.map((v) => (v == null || v === "" ? "—" : String(v))),
      ),
      margin: { left: margem, right: margem, top: 38, bottom: 38 },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [28, 94, 66] },
      alternateRowStyles: { fillColor: [247, 250, 248] },
    });
    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 23;
  }
  function grafico(
    titulo: string,
    dados: { rotulo: string; valores: number[] }[],
    fmt: (v: number) => string,
  ) {
    if (!dados.length) return;
    secao(titulo);
    const max = Math.max(1, ...dados.flatMap((d) => d.valores));
    for (const d of dados) {
      if (y > altura - 72) {
        doc.addPage();
        y = 45;
      }
      doc.setFontSize(8);
      const rotulo = doc.splitTextToSize(d.rotulo, 185).slice(0, 2);
      doc.text(rotulo, margem, y + 8);
      d.valores.forEach((valor, i) => {
        const w = (Math.max(0, valor) / max) * 400;
        if (i === 0) doc.setFillColor(49, 100, 167);
        else doc.setFillColor(28, 122, 78);
        if (w > 0) doc.rect(margem + 200, y + i * 11, w, 7, "F");
        doc.text(fmt(valor), margem + 205 + w, y + 7 + i * 11);
      });
      y += Math.max(rotulo.length * 10, d.valores.length * 11) + 9;
    }
    y += 10;
  }
  tabela(
    "Indicadores",
    ["Indicador", "Valor"],
    resumo(c, tipo !== "financeiro", tipo !== "fisico"),
  );
  if (fis) {
    grafico(
      "Execução física por meta",
      c.linhas
        .filter((l) => l.percentualFisico !== null)
        .map((l) => ({
          rotulo: `${l.projeto} - ${metaNome(l)}`,
          valores: [l.percentualFisico],
        })),
      pctFmt,
    );
    tabela(
      "Demonstrativo físico",
      cabFisico,
      c.linhas.map((l) => [
        l.projeto,
        metaNome(l),
        qtd(l.prevista),
        qtd(l.executada),
        qtd(l.diferenca),
        pctFmt(l.percentualFisico),
        l.inicio,
        l.termino,
        l.situacaoLabel,
      ]),
    );
    tabela(
      "Entregas concluídas por mês",
      ["Mês", "Entregas"],
      c.entregasMensais.map((e) => [mesLabel(e.mes), e.valor]),
    );
    tabela("Entregas vinculadas", cabEntregas, linhasEntregas(c.linhas));
  }
  if (fin) {
    grafico(
      "Orçamento previsto (azul) e valor pago (verde)",
      c.linhas
        .filter((l) => l.orcamento !== null && l.pago !== null)
        .map((l) => ({
          rotulo: `${l.projeto} - ${metaNome(l)}`,
          valores: [l.orcamento, l.pago],
        })),
      brl,
    );
    tabela(
      "Demonstrativo financeiro",
      cabFinanceiro,
      c.linhas.map((l) => [
        l.projeto,
        metaNome(l),
        brl(l.orcamento),
        brl(l.pago),
        brl(l.comprometido),
        brl(l.saldo),
        pctFmt(l.percentualFinanceiro),
      ]),
    );
    tabela(
      "Pagamentos líquidos por mês",
      ["Mês", "Valor pago"],
      c.pagamentosMensais.map((e) => [mesLabel(e.mes), brl(e.valor)]),
    );
    tabela(
      "Itens orçamentários",
      cabItens,
      linhasItens(c.linhas).map((linha) =>
        linha.map((v, i) => (i >= 4 ? brl(v as number | null) : v)),
      ),
    );
  }
  const pontos =
    tipo === "fisico"
      ? linhasPontos({
          ...c,
          linhas: c.linhas.map((l) => ({
            ...l,
            orcamento: 0,
            pago: null,
            comprometido: null,
          })),
        })
      : tipo === "financeiro"
        ? pontosAtencao(c.linhas, c.dataReferencia)
            .filter((p) =>
              [
                "Orçamento ultrapassado",
                "Compromissos financeiros pendentes",
                "Planejamento financeiro não informado",
              ].includes(p.titulo),
            )
            .map((p) => [p.titulo, p.descricao, p.metas])
        : linhasPontos(c);
  tabela("Pontos de atenção", cabPontos, pontos);
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Aurit | Gestão para organizações culturais e sociais",
      margem,
      altura - 17,
    );
    doc.text(`Página ${p} de ${paginas}`, largura - margem, altura - 17, {
      align: "right",
    });
  }
  return doc;
}

export async function exportarXlsxCompleto(
  c: Consolidado,
  ctx: ContextoRelatorio,
) {
  const wb = XLSX.utils.book_new();
  const aba = (
    nome: string,
    titulos: string[],
    linhas: (string | number | null)[][],
  ) =>
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([titulos, ...linhas]),
      nome,
    );
  const i = c.ind;
  aba(
    "Resumo",
    ["Indicador", "Valor"],
    [
      ["Organização", ctx.organizacao],
      ["Projeto", ctx.projeto],
      ["Período", ctx.periodo],
      ["Emissão", ctx.emissao],
      ...resumo(c, true, false),
      ["Orçamento previsto", i.orcamento],
      ["Pago", i.pago],
      ["Comprometido", i.comprometido],
      ["Saldo", i.saldo],
      ["% Financeiro", i.pctFinanceiro],
    ],
  );
  aba("Execução física", cabFisico, c.linhas.map(linhaFisica));
  aba("Execução financeira", cabFinanceiro, c.linhas.map(linhaFinanceira));
  aba("Itens orçamentários", cabItens, linhasItens(c.linhas));
  aba("Entregas", cabEntregas, linhasEntregas(c.linhas));
  aba(
    "Entregas por mês",
    ["Mês", "Entregas"],
    c.entregasMensais.map((e) => [mesLabel(e.mes), e.valor]),
  );
  aba(
    "Pagamentos por mês",
    ["Mês", "Valor pago"],
    c.pagamentosMensais.map((e) => [mesLabel(e.mes), e.valor]),
  );
  aba("Pontos de atenção", cabPontos, linhasPontos(c));
  await downloadFile(
    new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], {
      type: XLSX_MIME,
    }),
    nomeArquivo("completo", "xlsx"),
  );
}

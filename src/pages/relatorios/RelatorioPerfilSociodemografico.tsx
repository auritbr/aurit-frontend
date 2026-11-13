import { ROTA_PERFIL_SOCIOECONOMICO } from "@/config/rotas";
import { useQuery } from "@tanstack/react-query";
import { getOrganizacaoSelecionadaId } from "@/lib/configuracaoEmpresaStore";
import { usuarioTemPermissao } from "@/lib/permissoes";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Baby,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  GraduationCap,
  HeartHandshake,
  Home,
  Info,
  Landmark,
  Network,
  PiggyBank,
  School,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
  Wifi,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import { AppLayout } from "@/components/AppLayout";
import { FieldLabel } from "@/components/FieldLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReportTab, ReportTabsList } from "@/components/relatorios/ReportTabs";
import { RelatorioDataTable } from "@/components/relatorios/RelatorioDataTable";
import {
  ReportBarChart,
  ReportChartCard,
  ReportChartGrid,
  ReportFilterPanel,
  ReportSerieBarChart,
  ReportShell,
  ReportStatCard,
  ReportValueBarChart,
  filterFieldClass,
} from "@/components/relatorios/ReportKit";
import { StackedHBar } from "@/components/relatorios/CumprimentoMetasCharts";
import {
  EvolucaoEstudosChart,
  EvolucaoRendaChart,
  TransporteAgrupadoChart,
} from "@/components/relatorios/PerfilSociodemograficoCharts";
import type { ActiveFilterItem } from "@/components/ActiveFilters";
import type { RelatorioColumn } from "@/lib/relatorioExports";
import { downloadEstudosSocioeconomicosPdf } from "@/lib/individualReportDownload";
import { getAtividades } from "@/data/atividades";
import { getParticipantes } from "@/data/participantes";
import { getProjetos } from "@/data/projetos";
import { getConfiguracaoEmpresa } from "@/lib/configuracaoEmpresaStore";
import {
  DESPESAS_FIXAS,
  formatBRL,
  listarDetalhesEstudos,
  diasFrequencia,
  parseValor,
  type EstudoSocioeconomico,
  type SimNao,
} from "@/lib/estudosSocioeconomicos";
import {
  FAIXAS_ETARIAS,
  FAIXAS_RENDA,
  NAO_INFORMADO,
  contarCategorias,
  contarMultiplas,
  dataEstudoISO,
  faixaRendaDe,
  filtrarEstudos,
  filtrosPerfilIniciais,
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  listaOuNaoInformado,
  media,
  mediana,
  respostasSimNao,
  selecionarEstudosMaisRecentes,
  simNaoLabel,
  somaConhecida,
  temBeneficioSocial,
  type FiltrosPerfil,
  type LinhaPerfil,
} from "@/lib/perfilSocioeconomico";

import { coresCumprimento as COR } from "@/lib/cumprimentoMetas";

const objetivo =
  "Analise as características dos participantes e de suas famílias a partir dos estudos socioeconômicos cadastrados, acompanhando informações sobre composição familiar, escolaridade, moradia, acesso a serviços, renda e benefícios sociais. Utilize esses dados para conhecer melhor o público atendido e apoiar o planejamento das ações da organização.";
const ajuda = `Nesta página são reunidas e analisadas as informações dos estudos socioeconômicos cadastrados na organização.

Os indicadores e gráficos permitem conhecer características dos participantes e de suas famílias, como faixa etária, escolaridade, composição familiar, condições de moradia, acesso à internet, meios de transporte, benefícios sociais, renda e despesas mensais.

As informações são apresentadas de forma consolidada, permitindo identificar características do público atendido, acompanhar mudanças entre períodos e apoiar a elaboração de projetos, relatórios institucionais e prestações de contas.

Os resultados consideram os estudos disponíveis e os filtros selecionados. Informações não preenchidas não devem ser interpretadas como respostas negativas ou valores iguais a zero.`;
const secao =
  "mb-2.5 mt-6 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground";
const gradeCards =
  "mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 [&_.truncate]:whitespace-normal [&_.truncate]:break-words";
const money = (n: number | null) =>
  n === null ? "Não informado" : formatBRL(n);
const pct = (n: number | null) => formatarPercentual(n);
const ni = (v: string | undefined) => v?.trim() || NAO_INFORMADO;
const energiaLabel = (v: string) =>
  (
    ({
      regularizada: "Ligação regularizada",
      nao_regularizada: "Ligação não regularizada",
    }) as Record<string, string>
  )[v] ?? (v === "nao_informado" ? NAO_INFORMADO : ni(v));
const aguaLabel = (v: string) =>
  (
    ({
      regularizado: "Regularizado",
      nao_regularizado: "Não regularizado",
      fonte_natural: "Fonte natural / cachoeira",
    }) as Record<string, string>
  )[v] ?? (v === "nao_informado" ? NAO_INFORMADO : ni(v));
const pavimentacaoLabel = (v: string) =>
  (
    ({
      pavimentada: "Pavimentada",
      nao_pavimentada: "Não pavimentada",
    }) as Record<string, string>
  )[v] ?? (v === "nao_informado" ? NAO_INFORMADO : ni(v));
const altura = (n: number) => Math.min(340, Math.max(180, n * 36 + 50));
const meses = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const mesLabel = (ym: string) =>
  `${meses[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[14px] border border-dashed border-border/70 bg-card/50 px-4 py-3 text-[12.5px] text-muted-foreground">
      {children}
    </p>
  );
}
function Tabela<T>({
  title,
  description,
  rows,
  columns,
  name,
  org,
  allowExport,
  allowPdf,
  filtrosPdf,
}: {
  title: string;
  description: string;
  rows: T[];
  columns: RelatorioColumn<T>[];
  name: string;
  org: string;
  allowExport: boolean;
  allowPdf: boolean;
  filtrosPdf: { label: string; value: string }[];
}) {
  return (
    <div className="mb-5">
      <h2 className={secao}>{title}</h2>
      <p className="mb-2 text-[11.5px] text-muted-foreground">{description}</p>
      <RelatorioDataTable
        rows={rows}
        columns={columns}
        reportName={name}
        organizacaoNome={org}
        allowExport={allowExport}
        onPdf={
          allowPdf
            ? (linhas, colunas, busca) =>
                downloadEstudosSocioeconomicosPdf(
                  name.replace("estudos-socioeconomicos-", ""),
                  colunas.map((coluna) => coluna.label),
                  linhas.map((linha) =>
                    colunas.map((coluna) =>
                      String(coluna.accessor?.(linha) ?? "—"),
                    ),
                  ),
                  busca.trim()
                    ? [...filtrosPdf, { label: "Busca", value: busca.trim() }]
                    : filtrosPdf,
                )
            : undefined
        }
        sortable
      />
    </div>
  );
}

export default function RelatorioPerfilSociodemografico() {
  const organizacaoId = getOrganizacaoSelecionadaId();
  const acesso = useQuery({
    queryKey: ["acesso-perfil-sociodemografico", organizacaoId],
    queryFn: async () => {
      const [estudos, exportar, gerarPdf, participantes, atividades, projetos] =
        await Promise.all([
          usuarioTemPermissao("ESTUDOS_SOCIOECONOMICOS", "VISUALIZAR"),
          usuarioTemPermissao("RELATORIOS", "BAIXAR"),
          usuarioTemPermissao("RELATORIOS", "GERAR_PDF"),
          usuarioTemPermissao("PARTICIPANTES", "VISUALIZAR"),
          usuarioTemPermissao("ATIVIDADES", "VISUALIZAR"),
          usuarioTemPermissao("PROJETOS", "VISUALIZAR"),
        ]);
      return {
        estudos,
        exportar,
        gerarPdf,
        vinculos: participantes && atividades,
        projetos,
      };
    },
  });
  const dados = useQuery({
    queryKey: ["estudos-socioeconomicos", organizacaoId, "perfil"],
    queryFn: ({ signal }) => listarDetalhesEstudos(signal),
    enabled: acesso.data?.estudos === true,
    gcTime: 0,
  });
  const vinculos = useQuery({
    queryKey: ["estudos-socioeconomicos", organizacaoId, "vinculos-perfil"],
    queryFn: async () => {
      const [participantes, atividades] = await Promise.all([
        getParticipantes(),
        getAtividades(),
      ]);
      return { participantes, atividades };
    },
    enabled: acesso.data?.estudos === true && acesso.data.vinculos,
    gcTime: 0,
  });
  const projetos = useQuery({
    queryKey: ["estudos-socioeconomicos", organizacaoId, "projetos-perfil"],
    queryFn: getProjetos,
    enabled:
      acesso.data?.estudos === true &&
      acesso.data.vinculos &&
      acesso.data.projetos,
    gcTime: 0,
  });
  const [draft, setDraft] = useState<FiltrosPerfil>(filtrosPerfilIniciais);
  const [filtros, setFiltros] = useState<FiltrosPerfil>(filtrosPerfilIniciais);
  const [aba, setAba] = useState("visao-geral");
  const [recorte, setRecorte] = useState<"atual" | "historico">("atual");
  const estudos = dados.data ?? [];
  const participantesBase = useMemo(
    () =>
      [
        ...new Map(
          (dados.data ?? []).map((e) => [
            e.participanteId,
            { id: e.participanteId, nomeCompleto: e.retrato.nomeCompleto },
          ]),
        ).values(),
      ].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR")),
    [dados.data],
  );
  const atividadesBase = vinculos.data?.atividades ?? [];
  const projetosBase = projetos.data ?? [];
  const org = getConfiguracaoEmpresa().nomeEmpresa || "Organização";
  const podeExportar = acesso.data?.exportar === true;

  const historicos = useMemo(
    () =>
      filtrarEstudos(
        estudos,
        filtros,
        false,
        vinculos.data?.participantes ?? [],
        atividadesBase,
      ),
    [estudos, filtros, vinculos.data, atividadesBase],
  );
  const atuais = useMemo(
    () => selecionarEstudosMaisRecentes(historicos),
    [historicos],
  );
  const semPeriodo = useMemo(
    () =>
      filtrarEstudos(
        estudos,
        filtros,
        true,
        vinculos.data?.participantes ?? [],
        atividadesBase,
      ),
    [estudos, filtros, vinculos.data, atividadesBase],
  );
  const atuaisSemPeriodo = useMemo(
    () => selecionarEstudosMaisRecentes(semPeriodo),
    [semPeriodo],
  );
  const aplicar = (n: FiltrosPerfil) => {
    setDraft(n);
    setFiltros(n);
  };

  const activeFilters: ActiveFilterItem[] = [];
  const nomeParticipante = (id: string) =>
    participantesBase.find((p) => p.id === id)?.nomeCompleto ?? id;
  if (filtros.participanteId !== "TODOS")
    activeFilters.push({
      id: "participante",
      label: "Participante",
      value: nomeParticipante(filtros.participanteId),
      onRemove: () => aplicar({ ...filtros, participanteId: "TODOS" }),
    });
  if (filtros.inicio)
    activeFilters.push({
      id: "inicio",
      label: "Período inicial",
      value: filtros.inicio.split("-").reverse().join("/"),
      onRemove: () => aplicar({ ...filtros, inicio: "" }),
    });
  if (filtros.fim)
    activeFilters.push({
      id: "fim",
      label: "Período final",
      value: filtros.fim.split("-").reverse().join("/"),
      onRemove: () => aplicar({ ...filtros, fim: "" }),
    });
  if (filtros.projetoId !== "TODOS")
    activeFilters.push({
      id: "projeto",
      label: "Projeto",
      value:
        projetosBase.find((p) => String(p.id) === filtros.projetoId)
          ?.nomeProjeto ?? filtros.projetoId,
      onRemove: () => aplicar({ ...filtros, projetoId: "TODOS" }),
    });
  if (filtros.atividadeId !== "TODAS")
    activeFilters.push({
      id: "atividade",
      label: "Atividade",
      value:
        atividadesBase.find((a) => a.id === filtros.atividadeId)
          ?.nomeAtividade ?? filtros.atividadeId,
      onRemove: () => aplicar({ ...filtros, atividadeId: "TODAS" }),
    });
  if (filtros.faixaEtaria !== "TODAS")
    activeFilters.push({
      id: "idade",
      label: "Faixa etária",
      value: filtros.faixaEtaria,
      onRemove: () => aplicar({ ...filtros, faixaEtaria: "TODAS" }),
    });

  const filtrosPdf = activeFilters.map(({ label, value }) => ({
    label,
    value,
  }));

  /* Indicadores gerais */
  const rendaMedia = media(atuais.map((l) => l.ind.rendaFamiliar));
  const perCapitaMedia = media(atuais.map((l) => l.ind.rendaPerCapita));
  const mediaFamilia = media(
    atuais
      .filter((l) => l.ind.composicaoCompleta)
      .map((l) => l.ind.pessoasFamilia),
  );
  const beneficios = atuais.map((l) => temBeneficioSocial(l.estudo));
  const beneficiosValidos = beneficios.filter((v): v is boolean => v !== null);
  const internet = respostasSimNao(atuais, (e) => e.acessoInternet);
  const comEstudoPeriodo = filtros.inicio || filtros.fim ? atuais.length : null;

  const evolucao = useMemo(() => {
    const mapa = new Map<string, { estudos: number; ids: Set<string> }>();
    historicos.forEach((l) => {
      const mes = dataEstudoISO(l.estudo.dataEstudo).slice(0, 7);
      if (!mes) return;
      const item = mapa.get(mes) ?? { estudos: 0, ids: new Set<string>() };
      item.estudos++;
      item.ids.add(l.estudo.participanteId);
      mapa.set(mes, item);
    });
    return [...mapa]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({
        name: mesLabel(mes),
        estudos: v.estudos,
        participantes: v.ids.size,
      }));
  }, [historicos]);
  const idades = contarCategorias(
    atuais.map((l) => l.faixaEtaria),
    FAIXAS_ETARIAS,
  );
  const faixasRenda = contarCategorias(
    atuais
      .filter((l) => l.ind.rendaFamiliar !== null)
      .map((l) => faixaRendaDe(l.ind.rendaFamiliar)),
    FAIXAS_RENDA,
    false,
  );

  /* Participantes */
  const idadeMedia = media(atuais.map((l) => l.idade));
  const escolares = atuais.filter(
    (l) => l.idade !== null && l.idade >= 6 && l.idade <= 17,
  ).length;
  const genero = contarCategorias(atuais.map((l) => l.genero));
  const escolaridade = contarCategorias(
    atuais.map((l) => l.estudo.anoEscolar),
    undefined,
    false,
  );
  const diasOrdem = diasFrequencia;
  const dias = contarMultiplas(atuais, (e) => e.diasFrequencia, diasOrdem);

  /* Família */
  const familiasConfirmadas = atuais.filter((l) => l.ind.composicaoCompleta);
  const integrantes = atuais.flatMap((l) =>
    l.estudo.integrantes.filter((i) => !i.proprioParticipante),
  );
  const mediaComRenda = media(
    atuais.map(
      (l) =>
        l.estudo.integrantes.filter(
          (i) => !i.proprioParticipante && parseValor(i.renda) !== null,
        ).length,
    ),
  );
  const tamanhos = contarCategorias(
    atuais.map((l) =>
      l.ind.pessoasFamilia >= 6
        ? "6 pessoas ou mais"
        : `${l.ind.pessoasFamilia} ${l.ind.pessoasFamilia === 1 ? "pessoa" : "pessoas"}`,
    ),
    [
      "1 pessoa",
      "2 pessoas",
      "3 pessoas",
      "4 pessoas",
      "5 pessoas",
      "6 pessoas ou mais",
    ],
    false,
  );
  const trabalho = contarCategorias(
    integrantes.map((i) => i.situacaoTrabalho),
    [
      "Autônomo",
      "CTPS / Concursado",
      "Aposentado / Pensionista",
      "Mercado Informal",
      "Desempregado",
    ],
    false,
  );
  const escolaridadeIntegrantes = contarCategorias(
    integrantes.map((i) => i.escolaridade),
    undefined,
    false,
  );
  const composicaoFamilia = [
    "Composição confirmada",
    "Composição incompleta",
  ].map((name) => ({
    name,
    value: atuais.filter(
      (l) => (name === "Composição confirmada") === l.ind.composicaoCompleta,
    ).length,
  }));

  /* Moradia */
  const condicao = contarCategorias(
    atuais.map((l) => l.estudo.condicaoResidencia),
    [
      "Própria",
      "Alugada",
      "Financiada",
      "Cedida",
      "Invadida / Ocupada",
      "Caseiro",
      "Outra",
    ],
    false,
  );
  const servicoDefs: {
    key: string;
    label: string;
    ler: (e: EstudoSocioeconomico) => SimNao;
  }[] = [
    {
      key: "energia",
      label: "Energia regularizada",
      ler: (e) =>
        e.energia === "regularizada"
          ? "sim"
          : e.energia === "nao_regularizada"
            ? "nao"
            : "",
    },
    {
      key: "agua",
      label: "Água regularizada",
      ler: (e) =>
        e.agua === "regularizado"
          ? "sim"
          : e.agua === "nao_regularizado" || e.agua === "fonte_natural"
            ? "nao"
            : "",
    },
    { key: "esgoto", label: "Rede de esgoto", ler: (e) => e.esgoto },
    { key: "lixo", label: "Coleta de lixo", ler: (e) => e.coletaLixo },
    { key: "internet", label: "Internet", ler: (e) => e.acessoInternet },
    {
      key: "pavimentacao",
      label: "Pavimentação",
      ler: (e) =>
        e.pavimentacao === "pavimentada"
          ? "sim"
          : e.pavimentacao === "nao_pavimentada"
            ? "nao"
            : "",
    },
  ];
  const servicos = servicoDefs.map((s) => ({
    ...s,
    ...respostasSimNao(atuais, s.ler),
  }));
  const acessoServicos = servicos.map((s) => ({
    name: s.label,
    full: s.label,
    sim: s.sim,
    nao: s.nao,
    extra: `${s.validas} respostas válidas · ${pct(s.pct)} com acesso`,
  }));
  const infra = (["fossa", "esgoto", "pavimentacao", "enchentes"] as const)
    .map((key) => {
      const def =
        key === "fossa"
          ? {
              label: "Fossa séptica",
              ler: (e: EstudoSocioeconomico) => e.fossa,
            }
          : key === "esgoto"
            ? {
                label: "Rede de esgoto",
                ler: (e: EstudoSocioeconomico) => e.esgoto,
              }
            : key === "enchentes"
              ? {
                  label: "Enchentes ou alagamentos",
                  ler: (e: EstudoSocioeconomico) => e.enchentes,
                }
              : {
                  label: "Rua pavimentada",
                  ler: (e: EstudoSocioeconomico) =>
                    e.pavimentacao === "pavimentada"
                      ? ("sim" as const)
                      : e.pavimentacao === "nao_pavimentada"
                        ? ("nao" as const)
                        : ("" as const),
                };
      return {
        name: def.label,
        full: def.label,
        ...respostasSimNao(atuais, def.ler),
      };
    })
    .map((s) => ({ ...s, extra: `${s.validas} respostas válidas` }));
  const transporteCategorias = [
    ...new Set(
      atuais.flatMap((l) => [
        ...l.estudo.transporteParticipante,
        ...l.estudo.transporteFamilia,
      ]),
    ),
  ].sort();
  const transportes = transporteCategorias.map((name) => ({
    name,
    participantes: atuais.filter((l) =>
      l.estudo.transporteParticipante.includes(name),
    ).length,
    familias: atuais.filter((l) => l.estudo.transporteFamilia.includes(name))
      .length,
  }));

  /* Renda */
  const rendaPerCapitaMediana = mediana(
    atuais.map((l) => l.ind.rendaPerCapita),
  );
  const totalReceitas = somaConhecida(atuais.map((l) => l.ind.totalReceitas));
  const totalDespesas = somaConhecida(atuais.map((l) => l.ind.totalDespesas));
  const negativos = atuais.filter(
    (l) =>
      !l.ind.saldoMensalParcial &&
      l.ind.resultadoMensal !== null &&
      l.ind.resultadoMensal < 0,
  ).length;
  const rendaPessoa = contarCategorias(
    atuais
      .filter((l) => l.ind.rendaPerCapita !== null)
      .map((l) => faixaRendaDe(l.ind.rendaPerCapita)),
    FAIXAS_RENDA,
    false,
  );
  const despesasCategorias: { name: string; value: number }[] = [
    ...DESPESAS_FIXAS.map(([key, name]) => ({
      name: name as string,
      value:
        somaConhecida(atuais.map((l) => parseValor(l.estudo.despesas[key]))) ??
        0,
    })),
    {
      name: "Outras Despesas",
      value:
        somaConhecida(
          atuais.flatMap((l) =>
            l.estudo.outrasDespesas.map((d) => parseValor(d.valor)),
          ),
        ) ?? 0,
    },
  ].filter((d) => d.value > 0);
  const comparaveis = atuais.filter(
    (l) =>
      l.ind.totalReceitas !== null &&
      !l.ind.receitasParciais &&
      l.ind.despesasCompletas,
  );
  const mediaReceitas = media(comparaveis.map((l) => l.ind.totalReceitas));
  const mediaDespesas = media(comparaveis.map((l) => l.ind.totalDespesas));
  const beneficioDefs: {
    name: string;
    ler: (e: EstudoSocioeconomico) => boolean;
  }[] = [
    { name: "Bolsa Família", ler: (e) => e.bolsaFamilia === "sim" },
    { name: "BPC", ler: (e) => e.bpc === "sim" },
    { name: "Programa Pé-de-Meia", ler: (e) => e.peDeMeia === "sim" },
    {
      name: "Programa Dignidade Pessoal",
      ler: (e) => e.dignidadePessoal === "sim",
    },
    {
      name: "Outros Benefícios",
      ler: (e) => e.outrosBeneficios.some((b) => b.descricao.trim()),
    },
    {
      name: "Outros Auxílios",
      ler: (e) => e.auxilios.some((a) => a.recebe === "sim"),
    },
  ];
  const beneficiosChart = beneficioDefs.map((b) => ({
    name: b.name,
    value: atuais.filter((l) => b.ler(l.estudo)).length,
  }));
  const evolucaoRenda = useMemo(() => {
    const mapa = new Map<string, number[]>();
    historicos.forEach((l) => {
      const mes = dataEstudoISO(l.estudo.dataEstudo).slice(0, 7);
      if (!mes || l.ind.rendaFamiliar === null) return;
      mapa.set(mes, [...(mapa.get(mes) ?? []), l.ind.rendaFamiliar]);
    });
    return [...mapa]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valores]) => ({
        name: mesLabel(mes),
        renda: media(valores) ?? 0,
        respostas: valores.length,
      }));
  }, [historicos]);

  /* Tabelas */
  const baseCols: RelatorioColumn<LinhaPerfil>[] = [
    {
      key: "participante",
      label: "Participante",
      accessor: (r) => r.nome,
      alwaysVisible: true,
    },
    {
      key: "data",
      label: "Data do Estudo",
      accessor: (r) => r.estudo.dataEstudo || "Não informada",
    },
  ];
  const colParticipantes: RelatorioColumn<LinhaPerfil>[] = [
    ...baseCols,
    { key: "idade", label: "Faixa Etária", accessor: (r) => r.faixaEtaria },
    { key: "escola", label: "Escola", accessor: (r) => ni(r.estudo.escola) },
    {
      key: "ano",
      label: "Ano Escolar",
      accessor: (r) => ni(r.estudo.anoEscolar),
    },
    {
      key: "dias",
      label: "Dias de Frequência",
      accessor: (r) => listaOuNaoInformado(r.estudo.diasFrequencia),
    },
  ];
  const colFamilia: RelatorioColumn<LinhaPerfil>[] = [
    ...baseCols,
    {
      key: "pessoas",
      label: "Pessoas na Família",
      accessor: (r) => r.ind.pessoasFamilia,
    },
    {
      key: "confirmada",
      label: "Composição Confirmada",
      accessor: (r) => (r.ind.composicaoCompleta ? "Sim" : "Não"),
    },
    {
      key: "comRenda",
      label: "Integrantes com Renda",
      accessor: (r) =>
        r.estudo.integrantes.filter(
          (i) => !i.proprioParticipante && parseValor(i.renda) !== null,
        ).length,
    },
    {
      key: "renda",
      label: "Renda Familiar",
      accessor: (r) => money(r.ind.rendaFamiliar),
    },
    {
      key: "perCapita",
      label: "Renda Per Capita",
      accessor: (r) => money(r.ind.rendaPerCapita),
    },
  ];
  const colMoradia: RelatorioColumn<LinhaPerfil>[] = [
    ...baseCols,
    {
      key: "condicao",
      label: "Condição da Residência",
      accessor: (r) => ni(r.estudo.condicaoResidencia),
    },
    {
      key: "internet",
      label: "Acesso à Internet",
      accessor: (r) => simNaoLabel(r.estudo.acessoInternet),
    },
    {
      key: "energia",
      label: "Energia Elétrica",
      accessor: (r) => energiaLabel(r.estudo.energia),
    },
    {
      key: "agua",
      label: "Abastecimento de Água",
      accessor: (r) => aguaLabel(r.estudo.agua),
    },
    {
      key: "esgoto",
      label: "Rede de Esgoto",
      accessor: (r) => simNaoLabel(r.estudo.esgoto),
    },
    {
      key: "lixo",
      label: "Coleta de Lixo",
      accessor: (r) => simNaoLabel(r.estudo.coletaLixo),
    },
    {
      key: "pavimentacao",
      label: "Pavimentação",
      accessor: (r) => pavimentacaoLabel(r.estudo.pavimentacao),
    },
    {
      key: "enchentes",
      label: "Enchentes ou Alagamentos",
      accessor: (r) => simNaoLabel(r.estudo.enchentes),
    },
  ];
  const colRenda: RelatorioColumn<LinhaPerfil>[] = [
    ...baseCols,
    {
      key: "pessoas",
      label: "Pessoas na Família",
      accessor: (r) => r.ind.pessoasFamilia,
    },
    {
      key: "renda",
      label: "Renda Familiar",
      accessor: (r) => money(r.ind.rendaFamiliar),
    },
    {
      key: "perCapita",
      label: "Renda Per Capita",
      accessor: (r) => money(r.ind.rendaPerCapita),
    },
    {
      key: "receitas",
      label: "Total de Receitas",
      accessor: (r) => money(r.ind.totalReceitas),
    },
    {
      key: "despesas",
      label: "Total de Despesas",
      accessor: (r) => money(r.ind.totalDespesas),
    },
    {
      key: "saldo",
      label: "Saldo Mensal Estimado",
      accessor: (r) => money(r.ind.resultadoMensal),
    },
    {
      key: "beneficio",
      label: "Recebe Benefício Social",
      accessor: (r) => {
        const b = temBeneficioSocial(r.estudo);
        return b === null ? NAO_INFORMADO : b ? "Sim" : "Não";
      },
    },
  ];
  const colDemonstrativo: RelatorioColumn<LinhaPerfil>[] = [
    ...baseCols.map((c) =>
      c.key === "participante"
        ? {
            ...c,
            render: (r: LinhaPerfil) => (
              <Link
                className="font-medium text-primary hover:underline"
                to={`${ROTA_PERFIL_SOCIOECONOMICO}/${r.estudo.id}`}
              >
                {r.nome}
              </Link>
            ),
          }
        : c,
    ),
    {
      key: "pessoas",
      label: "Pessoas na Família",
      accessor: (r) => r.ind.pessoasFamilia,
    },
    {
      key: "renda",
      label: "Renda Familiar",
      accessor: (r) => money(r.ind.rendaFamiliar),
    },
    {
      key: "perCapita",
      label: "Renda Per Capita",
      accessor: (r) => money(r.ind.rendaPerCapita),
    },
    {
      key: "moradia",
      label: "Condição da Moradia",
      accessor: (r) => ni(r.estudo.condicaoResidencia),
    },
    {
      key: "internet",
      label: "Acesso à Internet",
      accessor: (r) => simNaoLabel(r.estudo.acessoInternet),
    },
    {
      key: "escola",
      label: "Escola",
      accessor: (r) => ni(r.estudo.escola),
      hiddenByDefault: true,
    },
    {
      key: "transporte",
      label: "Transporte do Participante",
      accessor: (r) => listaOuNaoInformado(r.estudo.transporteParticipante),
      hiddenByDefault: true,
    },
    {
      key: "beneficios",
      label: "Benefício Social",
      accessor: (r) => {
        const b = temBeneficioSocial(r.estudo);
        return b === null ? NAO_INFORMADO : b ? "Sim" : "Não";
      },
      hiddenByDefault: true,
    },
  ];

  const pontos = [
    atuais.some((l) => !l.ind.composicaoCompleta)
      ? {
          tom: "warning",
          titulo: "Composição familiar incompleta",
          texto: `${atuais.filter((l) => !l.ind.composicaoCompleta).length} estudo(s) sem confirmação da composição. Médias por pessoa não são calculadas nesses casos.`,
        }
      : null,
    atuais.some((l) => l.ind.rendaFamiliar === null)
      ? {
          tom: "warning",
          titulo: "Renda não informada",
          texto: `${atuais.filter((l) => l.ind.rendaFamiliar === null).length} estudo(s) sem renda familiar calculável. Ausência de informação não representa renda zero.`,
        }
      : null,
    atuais.some((l) => !l.estudo.condicaoResidencia)
      ? {
          tom: "info",
          titulo: "Dados de moradia pendentes",
          texto: `${atuais.filter((l) => !l.estudo.condicaoResidencia).length} estudo(s) sem condição da residência informada.`,
        }
      : null,
    (filtros.inicio || filtros.fim) && semPeriodo.length > historicos.length
      ? {
          tom: "info",
          titulo: "Estudos fora do período",
          texto: `${semPeriodo.length - historicos.length} estudo(s) não entram no recorte atual por estarem fora do período selecionado.`,
        }
      : null,
    atuais.length > 0 && internet.validas < atuais.length
      ? {
          tom: "info",
          titulo: "Cobertura das respostas",
          texto: `Acesso à internet possui ${internet.validas} de ${atuais.length} respostas válidas; o percentual usa apenas esse denominador.`,
        }
      : null,
  ].filter((p): p is { tom: string; titulo: string; texto: string } => !!p);

  if (acesso.data && !acesso.data.estudos)
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  if (acesso.isError || dados.isError)
    return (
      <ReportShell
        title="Estudos Socioeconômicos"
        tooltip={ajuda}
        objective={objetivo}
      >
        <p role="alert">
          Não foi possível carregar os estudos socioeconômicos.
        </p>
        <Button
          onClick={() =>
            void (acesso.isError ? acesso.refetch() : dados.refetch())
          }
        >
          Tentar novamente
        </Button>
      </ReportShell>
    );
  if (acesso.isPending || dados.isPending)
    return (
      <ReportShell
        title="Estudos Socioeconômicos"
        tooltip={ajuda}
        objective={objetivo}
      >
        <p role="status">Carregando estudos socioeconômicos…</p>
      </ReportShell>
    );

  return (
    <ReportShell
      title="Estudos Socioeconômicos"
      tooltip={ajuda}
      objective={objetivo}
    >
      {(vinculos.isError || projetos.isError) && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Alguns filtros estão indisponíveis.
        </p>
      )}
      <ReportFilterPanel
        storageKey="relatorio-perfil-sociodemografico"
        activeFilters={activeFilters}
        onClear={() => aplicar(filtrosPerfilIniciais)}
        onSubmit={() => {
          if (draft.inicio && draft.fim && draft.inicio > draft.fim)
            return toast.error(
              "O período inicial deve ser anterior ao período final.",
            );
          setFiltros(draft);
          toast.success("Filtros aplicados.");
        }}
      >
        <div>
          <FieldLabel
            htmlFor="f-participante"
            tooltip="Consulte um participante ou todos os participantes com estudos no recorte."
          >
            Participante
          </FieldLabel>
          <Select
            value={draft.participanteId}
            onValueChange={(v) =>
              setDraft((f) => ({ ...f, participanteId: v }))
            }
          >
            <SelectTrigger id="f-participante" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os participantes</SelectItem>
              {participantesBase.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor="f-inicio"
            tooltip="Considera estudos realizados a partir desta data."
          >
            Período Inicial
          </FieldLabel>
          <Input
            id="f-inicio"
            type="date"
            value={draft.inicio}
            onChange={(e) =>
              setDraft((f) => ({ ...f, inicio: e.target.value }))
            }
            className={filterFieldClass}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="f-fim"
            tooltip="Considera estudos realizados até esta data; também delimita o critério de estudo atualizado."
          >
            Período Final
          </FieldLabel>
          <Input
            id="f-fim"
            type="date"
            value={draft.fim}
            onChange={(e) => setDraft((f) => ({ ...f, fim: e.target.value }))}
            className={filterFieldClass}
          />
        </div>
        {projetos.data && vinculos.data && (
          <div>
            <FieldLabel
              htmlFor="f-projeto"
              tooltip="Só inclui participantes com matrícula em atividade cujo projeto cadastrado corresponde ao projeto selecionado."
            >
              Projeto
            </FieldLabel>
            <Select
              value={draft.projetoId}
              onValueChange={(v) => setDraft((f) => ({ ...f, projetoId: v }))}
            >
              <SelectTrigger id="f-projeto" className={filterFieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os projetos</SelectItem>
                {projetosBase.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nomeProjeto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {vinculos.data && (
          <div>
            <FieldLabel
              htmlFor="f-atividade"
              tooltip="Filtra exclusivamente pela matrícula existente do participante na atividade."
            >
              Atividade
            </FieldLabel>
            <Select
              value={draft.atividadeId}
              onValueChange={(v) => setDraft((f) => ({ ...f, atividadeId: v }))}
            >
              <SelectTrigger id="f-atividade" className={filterFieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as atividades</SelectItem>
                {atividadesBase.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nomeAtividade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <FieldLabel
            htmlFor="f-idade"
            tooltip="A idade é calculada na data de cada estudo, não na data de hoje."
          >
            Faixa Etária
          </FieldLabel>
          <Select
            value={draft.faixaEtaria}
            onValueChange={(v) => setDraft((f) => ({ ...f, faixaEtaria: v }))}
          >
            <SelectTrigger id="f-idade" className={filterFieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as faixas</SelectItem>
              {FAIXAS_ETARIAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportFilterPanel>

      <Tabs value={aba} onValueChange={setAba} className="mb-6 mt-5">
        <ReportTabsList aria-label="Seções do relatório">
          <ReportTab value="visao-geral">Visão Geral</ReportTab>
          <ReportTab value="participantes">Perfil dos Participantes</ReportTab>
          <ReportTab value="familiar">Composição Familiar</ReportTab>
          <ReportTab value="moradia">Moradia e Infraestrutura</ReportTab>
          <ReportTab value="renda">Renda e Benefícios</ReportTab>
          <ReportTab value="demonstrativo">Demonstrativo</ReportTab>
        </ReportTabsList>

        <TabsContent value="visao-geral" className="mt-0">
          <h2 className={secao + " mt-0"}>
            Visão Geral dos Estudos Socioeconômicos
          </h2>
          <div className={gradeCards}>
            <ReportStatCard
              icon={FileText}
              label="Total de Estudos Cadastrados"
              valor={String(historicos.length)}
              hint="Todos os estudos no período e filtros"
            />
            <ReportStatCard
              icon={Users}
              label="Participantes Avaliados"
              valor={String(atuais.length)}
              hint="Um estudo mais recente por participante"
            />
            <ReportStatCard
              icon={CalendarCheck}
              tone="info"
              label="Participantes com Estudo Atualizado"
              valor={
                comEstudoPeriodo === null
                  ? "Não calculado"
                  : String(comEstudoPeriodo)
              }
              hint={
                comEstudoPeriodo === null
                  ? "Selecione um período de referência"
                  : "Com estudo dentro do período selecionado"
              }
            />
            <ReportStatCard
              icon={UsersRound}
              label="Média de Pessoas por Família"
              valor={formatarNumero(mediaFamilia)}
              hint={`${familiasConfirmadas.length} composições confirmadas`}
            />
            <ReportStatCard
              icon={Wallet}
              label="Renda Familiar Média"
              valor={formatarMoeda(rendaMedia)}
              hint={`${atuais.filter((l) => l.ind.rendaFamiliar !== null).length} respostas válidas`}
            />
            <ReportStatCard
              icon={Coins}
              label="Renda Per Capita Média"
              valor={formatarMoeda(perCapitaMedia)}
              hint="Somente renda e composição válidas"
            />
            <ReportStatCard
              icon={HeartHandshake}
              tone="success"
              label="Famílias com Benefícios Sociais"
              valor={
                beneficiosValidos.length
                  ? String(beneficiosValidos.filter(Boolean).length)
                  : "Não calculado"
              }
              hint={`${beneficiosValidos.length} respostas válidas`}
            />
            <ReportStatCard
              icon={Wifi}
              tone="info"
              label="Participantes com Acesso à Internet"
              valor={pct(internet.pct)}
              hint={`${internet.sim} de ${internet.validas} respostas válidas`}
            />
          </div>
          <ReportChartGrid>
            <ReportChartCard
              title="Evolução dos Estudos Socioeconômicos"
              description="Estudos realizados por mês e participantes distintos; avaliações históricas são preservadas."
            >
              <EvolucaoEstudosChart data={evolucao} />
            </ReportChartCard>
            <ReportChartCard
              title="Distribuição por Faixa Etária"
              description="Participantes únicos no estudo atual; idade calculada na data do estudo."
            >
              <ReportBarChart data={idades} />
            </ReportChartCard>
            <ReportChartCard
              title="Distribuição por Faixa de Renda Familiar"
              description="Intervalos monetários fixos, sem presumir salário mínimo histórico."
              height={altura(faixasRenda.length)}
            >
              <ReportBarChart data={faixasRenda} layout="horizontal" />
            </ReportChartCard>
          </ReportChartGrid>
          <h2 className={secao}>Pontos de Atenção</h2>
          {pontos.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {pontos.map((p) => (
                <div
                  key={p.titulo}
                  className={`flex gap-2.5 rounded-[12px] border px-3 py-2.5 ${p.tom === "warning" ? "border-amber-500/30 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300" : "border-sky-500/25 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300"}`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-[12.5px] font-semibold">{p.titulo}</p>
                    <p className="text-[11.5px] text-foreground/75">
                      {p.texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Vazio>
              Nenhum ponto de atenção identificado com os filtros aplicados.
            </Vazio>
          )}
        </TabsContent>

        <TabsContent value="participantes" className="mt-0">
          <h2 className={secao + " mt-0"}>Indicadores dos Participantes</h2>
          <div className={gradeCards}>
            <ReportStatCard
              icon={Users}
              label="Participantes Avaliados"
              valor={String(atuais.length)}
            />
            <ReportStatCard
              icon={CalendarDays}
              label="Idade Média"
              valor={
                idadeMedia === null
                  ? "Não calculado"
                  : `${formatarNumero(idadeMedia)} anos`
              }
              hint={`${atuais.filter((l) => l.idade !== null).length} datas de nascimento válidas`}
            />
            <ReportStatCard
              icon={Baby}
              label="Participantes em Idade Escolar"
              valor={String(escolares)}
              hint="Idades entre 6 e 17 anos"
            />
            <ReportStatCard
              icon={School}
              label="Participantes com Escola Informada"
              valor={String(
                atuais.filter((l) => l.estudo.escola.trim()).length,
              )}
              hint={`${atuais.length} estudos atuais`}
            />
            <ReportStatCard
              icon={UserCheck}
              label="Participantes com Nome Social Informado"
              valor={String(
                atuais.filter(
                  (l) =>
                    l.estudo.possuiNomeSocial === "sim" &&
                    l.estudo.nomeSocial.trim(),
                ).length,
              )}
              hint="Somente informação declarada"
            />
            <ReportStatCard
              icon={GraduationCap}
              label="Participantes com Dados de Escolaridade"
              valor={String(
                atuais.filter((l) => l.estudo.anoEscolar.trim()).length,
              )}
              hint="Ano ou etapa escolar preenchidos"
            />
          </div>
          <ReportChartGrid>
            <ReportChartCard
              title="Distribuição por Gênero"
              description="Categorias declaradas nos retratos dos estudos; nenhuma inferência é realizada."
            >
              <ReportBarChart data={genero} layout="horizontal" />
            </ReportChartCard>
            <ReportChartCard
              title="Perfil Escolar"
              description="Anos ou etapas escolares informados, sem criar classificações."
              height={altura(escolaridade.length)}
            >
              <ReportBarChart data={escolaridade} layout="horizontal" />
            </ReportChartCard>
            <ReportChartCard
              title="Dias de Frequência Informados"
              description="Múltiplas respostas por participante; não representa presença efetiva no módulo Presenças."
            >
              <ReportBarChart data={dias} />
            </ReportChartCard>
          </ReportChartGrid>
          <Tabela
            title="Demonstrativo do Perfil dos Participantes"
            description="Um participante por linha, usando o estudo mais recente do recorte."
            rows={atuais}
            columns={colParticipantes}
            name="estudos-socioeconomicos-participantes"
            org={org}
            allowExport={podeExportar}
            allowPdf={acesso.data?.gerarPdf === true}
            filtrosPdf={filtrosPdf}
          />
        </TabsContent>

        <TabsContent value="familiar" className="mt-0">
          <h2 className={secao + " mt-0"}>
            Indicadores da Composição Familiar
          </h2>
          <div className={gradeCards}>
            <ReportStatCard
              icon={UsersRound}
              label="Famílias Representadas"
              valor={String(atuais.length)}
              hint="Uma família por estudo atual; não há identificador familiar único"
            />
            <ReportStatCard
              icon={Users}
              label="Total de Integrantes Informados"
              valor={String(integrantes.length)}
              hint="Integrantes familiares, sem o participante"
            />
            <ReportStatCard
              icon={Home}
              label="Média de Pessoas por Família"
              valor={formatarNumero(mediaFamilia)}
              hint="Inclui participante; somente composições confirmadas"
            />
            <ReportStatCard
              icon={CheckCircle2}
              tone="success"
              label="Famílias com Composição Confirmada"
              valor={String(familiasConfirmadas.length)}
              hint={`${atuais.length} famílias representadas`}
            />
            <ReportStatCard
              icon={Info}
              tone="warning"
              label="Famílias com Composição Incompleta"
              valor={String(atuais.length - familiasConfirmadas.length)}
              hint="Não implica ausência de integrantes"
            />
            <ReportStatCard
              icon={Coins}
              label="Média de Integrantes com Renda Informada"
              valor={formatarNumero(mediaComRenda)}
              hint="Integrantes familiares com valor preenchido"
            />
          </div>
          <ReportChartGrid>
            <ReportChartCard
              title="Quantidade de Pessoas por Família"
              description="Participante mais integrantes informados; confira a confirmação no gráfico ao lado."
            >
              <ReportBarChart data={tamanhos} />
            </ReportChartCard>
            <ReportChartCard
              title="Confirmação da Composição Familiar"
              description="Distingue composições confirmadas das ainda incompletas."
            >
              <ReportBarChart data={composicaoFamilia} />
            </ReportChartCard>
            <ReportChartCard
              title="Situação de Trabalho dos Integrantes Familiares"
              description="Somente integrantes familiares, não os participantes."
              height={altura(trabalho.length)}
            >
              <ReportBarChart data={trabalho} layout="horizontal" />
            </ReportChartCard>
            <ReportChartCard
              title="Escolaridade dos Integrantes Familiares"
              description="Categorias informadas no grupo familiar, sem interpretar textos ambíguos."
              height={altura(escolaridadeIntegrantes.length)}
            >
              <ReportBarChart
                data={escolaridadeIntegrantes}
                layout="horizontal"
              />
            </ReportChartCard>
          </ReportChartGrid>
          <Tabela
            title="Demonstrativo da Composição Familiar"
            description="Não exibe nomes ou documentos dos integrantes familiares."
            rows={atuais}
            columns={colFamilia}
            name="estudos-socioeconomicos-composicao-familiar"
            org={org}
            allowExport={podeExportar}
            allowPdf={acesso.data?.gerarPdf === true}
            filtrosPdf={filtrosPdf}
          />
        </TabsContent>

        <TabsContent value="moradia" className="mt-0">
          <h2 className={secao + " mt-0"}>
            Indicadores de Moradia e Infraestrutura
          </h2>
          <div className={gradeCards}>
            {[
              {
                label: "Famílias com Moradia Própria",
                valor: atuais.filter(
                  (l) => l.estudo.condicaoResidencia === "Própria",
                ).length,
                base: atuais.filter((l) => l.estudo.condicaoResidencia).length,
                icon: Home,
              },
              {
                label: "Famílias em Moradia Alugada",
                valor: atuais.filter(
                  (l) => l.estudo.condicaoResidencia === "Alugada",
                ).length,
                base: atuais.filter((l) => l.estudo.condicaoResidencia).length,
                icon: Landmark,
              },
              ...servicos
                .filter((s) =>
                  [
                    "internet",
                    "energia",
                    "esgoto",
                    "lixo",
                    "pavimentacao",
                  ].includes(s.key),
                )
                .map((s) => ({
                  label: `Residências com ${s.label}`,
                  valor: s.sim,
                  base: s.validas,
                  icon: Wifi,
                })),
              {
                label: "Residências com Enchentes ou Alagamentos",
                valor: respostasSimNao(atuais, (e) => e.enchentes).sim,
                base: respostasSimNao(atuais, (e) => e.enchentes).validas,
                icon: AlertTriangle,
              },
            ].map((c) => (
              <ReportStatCard
                key={c.label}
                icon={c.icon}
                label={c.label}
                valor={
                  c.base
                    ? `${c.valor} · ${pct((c.valor / c.base) * 100)}`
                    : "Não calculado"
                }
                hint={`${c.valor} de ${c.base} respostas válidas`}
              />
            ))}
          </div>
          <ReportChartGrid>
            <ReportChartCard
              title="Condição das Residências"
              description="Somente categorias efetivamente cadastradas."
              height={altura(condicao.length)}
            >
              <ReportBarChart data={condicao} layout="horizontal" />
            </ReportChartCard>
            <ReportChartCard
              title="Acesso a Serviços Essenciais"
              description="Sim e não entre respostas válidas; cada indicador informa seu próprio denominador."
              height={altura(acessoServicos.length)}
            >
              <StackedHBar
                expand
                data={acessoServicos}
                series={[
                  { key: "sim", name: "Com acesso", color: COR.sucesso },
                  {
                    key: "nao",
                    name: "Sem acesso informado",
                    color: COR.neutro,
                  },
                ]}
              />
            </ReportChartCard>
            <ReportChartCard
              title="Condições de Infraestrutura"
              description="Existência ou ausência declarada; respostas vazias e não aplicáveis ficam fora da base."
              height={altura(infra.length)}
            >
              <StackedHBar
                data={infra}
                series={[
                  { key: "sim", name: "Sim", color: COR.info },
                  { key: "nao", name: "Não", color: COR.neutro },
                ]}
              />
            </ReportChartCard>
            <ReportChartCard
              title="Meios de Transporte Utilizados"
              description="Múltiplas respostas: uma pessoa ou família pode aparecer em mais de uma categoria."
            >
              <TransporteAgrupadoChart data={transportes} />
            </ReportChartCard>
          </ReportChartGrid>
          <Tabela
            title="Demonstrativo de Moradia e Infraestrutura"
            description="Não exibe endereço completo; respostas ausentes permanecem como não informadas."
            rows={atuais}
            columns={colMoradia}
            name="estudos-socioeconomicos-moradia-infraestrutura"
            org={org}
            allowExport={podeExportar}
            allowPdf={acesso.data?.gerarPdf === true}
            filtrosPdf={filtrosPdf}
          />
        </TabsContent>

        <TabsContent value="renda" className="mt-0">
          <h2 className={secao + " mt-0"}>
            Indicadores Financeiros Declarados
          </h2>
          <p className="mb-3 text-[11.5px] text-muted-foreground">
            Valores declarados nos estudos; não são movimentações do módulo
            Financeiro da organização.
          </p>
          <div className={gradeCards}>
            <ReportStatCard
              icon={Wallet}
              label="Renda Familiar Média"
              valor={formatarMoeda(rendaMedia)}
              hint={`${atuais.filter((l) => l.ind.rendaFamiliar !== null).length} respostas válidas`}
            />
            <ReportStatCard
              icon={Coins}
              label="Renda Per Capita Média"
              valor={formatarMoeda(perCapitaMedia)}
              hint="Renda e composição familiar válidas"
            />
            <ReportStatCard
              icon={PiggyBank}
              label="Mediana da Renda Per Capita"
              valor={formatarMoeda(rendaPerCapitaMediana)}
              hint="Valor central: reduz a influência de rendas muito altas"
            />
            <ReportStatCard
              icon={TrendingUp}
              label="Total de Receitas Mensais Declaradas"
              valor={formatarMoeda(totalReceitas)}
              hint="Soma somente dos estudos com receitas"
            />
            <ReportStatCard
              icon={Coins}
              label="Total de Despesas Mensais Declaradas"
              valor={formatarMoeda(totalDespesas)}
              hint="Soma das despesas preenchidas"
            />
            <ReportStatCard
              icon={HeartHandshake}
              label="Famílias com Benefícios Sociais"
              valor={
                beneficiosValidos.length
                  ? String(beneficiosValidos.filter(Boolean).length)
                  : "Não calculado"
              }
              hint={`${beneficiosValidos.length} respostas válidas`}
            />
            <ReportStatCard
              icon={HeartHandshake}
              label="Famílias com Pensão Alimentícia"
              valor={
                atuais.some(
                  (l) => l.estudo.pensao === "sim" || l.estudo.pensao === "nao",
                )
                  ? String(
                      atuais.filter((l) => l.estudo.pensao === "sim").length,
                    )
                  : "Não calculado"
              }
              hint="Somente declarações positivas"
            />
            <ReportStatCard
              icon={AlertTriangle}
              tone="warning"
              label="Famílias com Saldo Mensal Estimado Negativo"
              valor={
                atuais.some((l) => l.ind.resultadoMensal !== null)
                  ? String(negativos)
                  : "Não calculado"
              }
              hint={`${atuais.filter((l) => l.ind.resultadoMensal !== null).length} estudos com cálculo completo`}
            />
          </div>
          <ReportChartGrid>
            <ReportChartCard
              title="Distribuição da Renda por Pessoa"
              description="Famílias por faixa de renda per capita; valores não calculados não entram como zero."
            >
              <ReportBarChart data={rendaPessoa} />
            </ReportChartCard>
            <ReportChartCard
              title="Composição das Despesas Familiares"
              description="Totais declarados por categoria; campos vazios não são tratados como zero."
              height={altura(despesasCategorias.length)}
            >
              <ReportValueBarChart
                data={despesasCategorias}
                formatValue={(v) => formatBRL(v)}
              />
            </ReportChartCard>
            <ReportChartCard
              title="Receitas e Despesas Mensais"
              description={`Médias dos ${comparaveis.length} estudos com receitas e despesas completas.`}
            >
              <ReportSerieBarChart
                data={
                  mediaReceitas === null || mediaDespesas === null
                    ? []
                    : [
                        {
                          name: "Média mensal",
                          entradas: mediaReceitas,
                          saidas: mediaDespesas,
                        },
                      ]
                }
                formatValue={(v) => formatBRL(v)}
              />
            </ReportChartCard>
            <ReportChartCard
              title="Benefícios Sociais Recebidos"
              description="Uma família pode receber mais de um benefício; as categorias não devem ser somadas."
              height={altura(beneficiosChart.length)}
            >
              <ReportBarChart data={beneficiosChart} layout="horizontal" />
            </ReportChartCard>
            <ReportChartCard
              title="Evolução da Renda Familiar"
              description="Média mensal dos estudos históricos com renda; o público avaliado pode variar entre meses."
            >
              <EvolucaoRendaChart data={evolucaoRenda} />
            </ReportChartCard>
          </ReportChartGrid>
          <Tabela
            title="Demonstrativo de Renda e Benefícios"
            description="Informações financeiras pessoais, disponíveis e exportáveis somente para perfis autorizados."
            rows={atuais}
            columns={colRenda}
            name="estudos-socioeconomicos-renda-beneficios"
            org={org}
            allowExport={podeExportar}
            allowPdf={acesso.data?.gerarPdf === true}
            filtrosPdf={filtrosPdf}
          />
        </TabsContent>

        <TabsContent value="demonstrativo" className="mt-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">
                Consulta dos Estudos
              </h2>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                No perfil atual, cada participante aparece uma vez; no
                histórico, todas as datas são preservadas.
              </p>
            </div>
            <div className="w-full sm:w-56">
              <FieldLabel
                htmlFor="f-recorte"
                tooltip="Alterne entre o estudo mais recente de cada participante e todas as avaliações do período."
              >
                Recorte da consulta
              </FieldLabel>
              <Select
                value={recorte}
                onValueChange={(v) => setRecorte(v as "atual" | "historico")}
              >
                <SelectTrigger id="f-recorte" className={filterFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atual">Perfil atual</SelectItem>
                  <SelectItem value="historico">Estudos históricos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Tabela
            title="Demonstrativo dos Estudos Socioeconômicos"
            description={
              recorte === "atual"
                ? `${atuais.length} participante(s), sem duplicidade; clique no nome para abrir o estudo.`
                : `${historicos.length} estudo(s), incluindo avaliações anteriores; clique no nome para abrir o estudo.`
            }
            rows={recorte === "atual" ? atuais : historicos}
            columns={colDemonstrativo}
            name={`estudos-socioeconomicos-estudos-${recorte}`}
            org={org}
            allowExport={podeExportar}
            allowPdf={acesso.data?.gerarPdf === true}
            filtrosPdf={filtrosPdf}
          />
        </TabsContent>
      </Tabs>
    </ReportShell>
  );
}

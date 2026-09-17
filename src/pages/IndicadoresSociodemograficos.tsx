import { useEffect, useMemo, useState } from "react";
import {
  Users,
  FileText,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Search,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { FieldLabel } from "@/components/FieldLabel";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getAtividadesOptions,
  getParticipantes,
  getTurmasOptions,
  faixaRendaOptions,
  generoOptions,
  racaCorOptions,
  tipoDeficienciaParticipanteOptions,
  tipoNeurodivergenciaOptions,
  statusMatriculaOptions,
  type AtividadeOption,
  type IndicadorItem,
  type IndicadoresSociodemograficos,
  type Participante,
  type TurmaOption,
} from "@/data/participantes";

import { exportToCSV, exportToExcel } from "@/lib/indicadoresExport";

import { downloadGeneralReportPdf } from "@/lib/generalReportPdf";
import { nameWithYear } from "@/lib/entityYear";

import { toast } from "sonner";

type Filtros = {
  ano: string;
  atividadeId: string;
  turmaId: string;
  statusMatricula: string;
  genero: string;
  racaCor: string;
  faixaRenda: string;
  cadunico: string;
  tipoDeficiencia: string;
  tipoNeurodivergencia: string;
  bolsaFamilia: string;
};

type IndicadorExportItem = {
  label: string;
  count: number;
  percentual: number;
};

const TODOS = "TODOS";
const SELECIONE = "SELECIONE";

const FILTROS_INICIAIS: Filtros = {
  ano: TODOS,
  atividadeId: TODOS,
  turmaId: TODOS,
  statusMatricula: TODOS,
  genero: TODOS,
  racaCor: TODOS,
  faixaRenda: TODOS,
  cadunico: TODOS,
  tipoDeficiencia: TODOS,
  tipoNeurodivergencia: TODOS,
  bolsaFamilia: TODOS,
};

const FILTROS_PESQUISA_INICIAIS: Filtros = {
  ...FILTROS_INICIAIS,
  ano: SELECIONE,
  atividadeId: SELECIONE,
  turmaId: SELECIONE,
  statusMatricula: SELECIONE,
  genero: SELECIONE,
  racaCor: SELECIONE,
  faixaRenda: SELECIONE,
  cadunico: SELECIONE,
  tipoDeficiencia: SELECIONE,
  tipoNeurodivergencia: SELECIONE,
  bolsaFamilia: SELECIONE,
};

function normalizarFiltros(filtros: Filtros): Filtros {
  return Object.fromEntries(
    Object.entries(filtros).map(([key, value]) => [
      key,
      value === SELECIONE ? TODOS : value,
    ]),
  ) as Filtros;
}

const categoriaLabels: Record<string, string> = {
  true: "Sim",
  false: "Não",
  TRUE: "Sim",
  FALSE: "Não",
  SIM: "Sim",
  NAO: "Não",

  FEMININO: "Feminino",
  MASCULINO: "Masculino",
  NAO_BINARIO: "Não binário",
  OUTRO: "Outro",
  PREFERE_NAO_INFORMAR: "Prefere não informar",

  BRANCA: "Branca",
  PRETA: "Preta",
  PARDA: "Parda",
  AMARELA: "Amarela",
  INDIGENA: "Indígena",

  SEM_RENDA: "Sem renda",
  ATE_1_SALARIO: "Até 1 salário mínimo",
  DE_1_A_2_SALARIOS: "De 1 a 2 salários mínimos",
  DE_2_A_3_SALARIOS: "De 2 a 3 salários mínimos",
  ACIMA_DE_3_SALARIOS: "Acima de 3 salários mínimos",

  ATE_5_ANOS: "Até 5 anos",
  DE_6_A_12_ANOS: "6 a 12 anos",
  DE_13_A_17_ANOS: "13 a 17 anos",
  DE_18_A_29_ANOS: "18 a 29 anos",
  DE_30_A_59_ANOS: "30 a 59 anos",
  "60_ANOS_OU_MAIS": "60 anos ou mais",

  TEA: "TEA",
  ASPERGER: "Asperger",
  TDAH: "TDAH",
  TOD: "TOD",
  DISLEXIA: "Dislexia",
  DISCALCULIA: "Discalculia",
  DISGRAFIA: "Disgrafia",
  DISPRAXIA: "Dispraxia",
  TOURETTE: "Tourette",
  TOC: "TOC",
  ALTAS_HABILIDADES_SUPERDOTACAO: "Altas habilidades/superdotação",
  TRANSTORNO_PROCESSAMENTO_SENSORIAL: "Transtorno do processamento sensorial",
  TRANSTORNO_PROCESSAMENTO_AUDITIVO: "Transtorno do processamento auditivo",
  OUTRA: "Outra",

  NAO_POSSUI: "Não possui",
  FISICA: "Física",
  AUDITIVA: "Auditiva",
  VISUAL: "Visual",
  INTELECTUAL: "Intelectual",
  PSICOSSOCIAL: "Psicossocial",
  MULTIPLA: "Múltipla",
  TRANSTORNO_ESPECTRO_AUTISTA: "Transtorno do Espectro Autista",

  NAO_INFORMADO: "Não informado",
};

function labelCategoria(value?: string) {
  if (!value) return "Não informado";

  return categoriaLabels[value] ?? value;
}

function anosDisponiveis(): string[] {
  const anoAtual = new Date().getFullYear();

  return Array.from({ length: 8 }, (_, index) => String(anoAtual - index));
}

function converterIndicadores(items: IndicadorItem[]): IndicadorExportItem[] {
  return items.map((item) => ({
    label: labelCategoria(item.categoria),
    count: item.total,
    percentual: Number(item.percentual ?? 0),
  }));
}

function anoDaData(value?: string) {
  if (!value) return "";

  const trimmed = value.trim();

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);

  if (brMatch) {
    return brMatch[3];
  }

  const isoMatch = /^(\d{4})-\d{2}-\d{2}/.exec(trimmed);

  return isoMatch?.[1] ?? "";
}

function normalizarValorFiltro(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");
}

function correspondeAoFiltro(value: string | null | undefined, filtro: string) {
  return (
    filtro === TODOS ||
    normalizarValorFiltro(value) === normalizarValorFiltro(filtro)
  );
}

function listaContemFiltro(
  values: Array<string | null | undefined> | undefined,
  filtro: string,
) {
  return (
    filtro === TODOS ||
    Boolean(values?.some((value) => correspondeAoFiltro(value, filtro)))
  );
}

function participanteAtendeFiltros(
  participante: Participante,
  filtros: Filtros,
) {
  if (!correspondeAoFiltro(participante.genero, filtros.genero)) {
    return false;
  }

  if (!correspondeAoFiltro(participante.racaCor, filtros.racaCor)) {
    return false;
  }

  if (!correspondeAoFiltro(participante.faixaRenda, filtros.faixaRenda)) {
    return false;
  }

  if (
    filtros.cadunico !== TODOS &&
    (participante.possuiCadunico ? "SIM" : "NAO") !== filtros.cadunico
  ) {
    return false;
  }

  if (
    filtros.bolsaFamilia !== TODOS &&
    (participante.possuiBolsaFamilia ? "SIM" : "NAO") !== filtros.bolsaFamilia
  ) {
    return false;
  }

  if (
    filtros.tipoDeficiencia !== TODOS &&
    !listaContemFiltro(participante.tipoDeficiencias, filtros.tipoDeficiencia)
  ) {
    return false;
  }

  if (
    filtros.tipoNeurodivergencia !== TODOS &&
    !listaContemFiltro(
      participante.tipoNeurodivergencias,
      filtros.tipoNeurodivergencia,
    )
  ) {
    return false;
  }

  const filtraVinculo =
    filtros.ano !== TODOS ||
    filtros.atividadeId !== TODOS ||
    filtros.turmaId !== TODOS ||
    filtros.statusMatricula !== TODOS;

  if (!filtraVinculo) {
    return true;
  }

  return participante.vinculos.some((vinculo) => {
    if (
      filtros.ano !== TODOS &&
      anoDaData(vinculo.dataMatricula) !== filtros.ano
    ) {
      return false;
    }

    if (
      filtros.atividadeId !== TODOS &&
      String(vinculo.atividadeId) !== String(filtros.atividadeId)
    ) {
      return false;
    }

    if (
      filtros.turmaId !== TODOS &&
      filtros.turmaId !== SELECIONE &&
      String(vinculo.turmaId ?? "") !== String(filtros.turmaId)
    ) {
      return false;
    }

    if (
      filtros.statusMatricula !== TODOS &&
      !correspondeAoFiltro(vinculo.statusMatricula, filtros.statusMatricula)
    ) {
      return false;
    }

    return true;
  });
}

function mapCountsToIndicadores(counts: Map<string, number>, total: number) {
  return Array.from(counts.entries())
    .map(([categoria, quantidade]) => ({
      categoria,
      total: quantidade,
      percentual: total > 0 ? (quantidade / total) * 100 : 0,
    }))
    .sort(
      (a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria),
    );
}

function montarIndicadoresLista(
  participantes: Participante[],
  getValues: (participante: Participante) => string[] | undefined,
) {
  const counts = new Map<string, number>();

  participantes.forEach((participante) => {
    const values = getValues(participante)?.filter(Boolean);

    const categorias = values?.length ? values : ["NAO_INFORMADO"];

    Array.from(new Set(categorias)).forEach((categoria) => {
      counts.set(categoria, (counts.get(categoria) ?? 0) + 1);
    });
  });

  return mapCountsToIndicadores(counts, participantes.length);
}

function montarIndicadoresBooleanos(
  participantes: Participante[],
  getValue: (participante: Participante) => boolean | undefined,
) {
  const counts = new Map<string, number>();

  participantes.forEach((participante) => {
    const categoria = getValue(participante) ? "SIM" : "NAO";

    counts.set(categoria, (counts.get(categoria) ?? 0) + 1);
  });

  return mapCountsToIndicadores(counts, participantes.length);
}

function montarIndicadoresSimples(
  participantes: Participante[],
  getValue: (participante: Participante) => string | undefined,
) {
  const counts = new Map<string, number>();

  participantes.forEach((participante) => {
    const categoria = getValue(participante) || "NAO_INFORMADO";

    counts.set(categoria, (counts.get(categoria) ?? 0) + 1);
  });

  return mapCountsToIndicadores(counts, participantes.length);
}

function faixaEtaria(dataNascimento?: string) {
  if (!dataNascimento) {
    return "NAO_INFORMADO";
  }

  const partes = dataNascimento.includes("/")
    ? dataNascimento.split("/").reverse()
    : dataNascimento.slice(0, 10).split("-");

  const [ano, mes, dia] = partes.map(Number);

  const nascimento = new Date(ano, mes - 1, dia);

  if (Number.isNaN(nascimento.getTime())) {
    return "NAO_INFORMADO";
  }

  const hoje = new Date();

  let idade = hoje.getFullYear() - nascimento.getFullYear();

  if (
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() &&
      hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }

  if (idade <= 5) {
    return "ATE_5_ANOS";
  }

  if (idade <= 12) {
    return "DE_6_A_12_ANOS";
  }

  if (idade <= 17) {
    return "DE_13_A_17_ANOS";
  }

  if (idade <= 29) {
    return "DE_18_A_29_ANOS";
  }

  if (idade <= 59) {
    return "DE_30_A_59_ANOS";
  }

  return "60_ANOS_OU_MAIS";
}

async function getIndicadoresLocais(
  filtros: Filtros,
): Promise<IndicadoresSociodemograficos> {
  const participantes = (await getParticipantes()).filter((participante) =>
    participanteAtendeFiltros(participante, filtros),
  );

  return {
    totalParticipantes: participantes.length,

    porGenero: montarIndicadoresSimples(participantes, (item) => item.genero),

    porRacaCor: montarIndicadoresSimples(participantes, (item) => item.racaCor),

    porFaixaRenda: montarIndicadoresSimples(
      participantes,
      (item) => item.faixaRenda,
    ),

    porFaixaEtaria: montarIndicadoresSimples(participantes, (item) =>
      faixaEtaria(item.dataNascimento),
    ),

    porTipoDeficiencia: montarIndicadoresLista(
      participantes,
      (participante) => participante.tipoDeficiencias,
    ),

    porTipoNeurodivergencia: montarIndicadoresLista(
      participantes,
      (participante) => participante.tipoNeurodivergencias,
    ),

    porCadunico: montarIndicadoresBooleanos(
      participantes,
      (participante) => participante.possuiCadunico,
    ),

    porBolsaFamilia: montarIndicadoresBooleanos(
      participantes,
      (participante) => participante.possuiBolsaFamilia,
    ),
  };
}

interface IndicadorCardProps {
  title: string;
  itens: IndicadorItem[];
}

function IndicadorCard({ title, itens }: IndicadorCardProps) {
  return (
    <div className="rounded-[16px] border border-border/70 bg-card/75 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>

      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <ul className="space-y-2.5">
          {itens.map((it) => {
            const pct = Number(it.percentual ?? 0);

            return (
              <li key={it.categoria}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {labelCategoria(it.categoria)}
                  </span>

                  <span className="tabular-nums text-muted-foreground">
                    {it.total} • {pct.toFixed(2)}%
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function IndicadoresSociodemograficos() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PESQUISA_INICIAIS);

  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_INICIAIS);

  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);

  const [turmas, setTurmas] = useState<TurmaOption[]>([]);

  const [dados, setDados] = useState<IndicadoresSociodemograficos | null>(null);

  const [loading, setLoading] = useState(true);

  /*
   * A página já inicia com o relatório carregado.
   * FILTROS_INICIAIS utiliza TODOS em todos os campos,
   * portanto nenhum recorte é aplicado na abertura.
   */
  const [hasSearched, setHasSearched] = useState(true);

  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "indicadores:pesquisa-avancada:v2",
    false,
  );

  const [searching, setSearching] = useState(false);

  const anos = useMemo(anosDisponiveis, []);

  const turmasFiltradas = useMemo(() => {
    if (filtros.atividadeId === TODOS || filtros.atividadeId === SELECIONE) {
      return [];
    }

    return turmas.filter(
      (turma) => String(turma.atividadeId) === String(filtros.atividadeId),
    );
  }, [turmas, filtros.atividadeId]);

  useEffect(() => {
    let active = true;

    async function carregarOpcoes() {
      try {
        const [atividadesData, turmasData] = await Promise.all([
          getAtividadesOptions(),
          getTurmasOptions(),
        ]);

        if (!active) {
          return;
        }

        setAtividades(atividadesData);

        setTurmas(turmasData);
      } catch (error) {
        console.error(error);

        toast.error("Não foi possível carregar os filtros do relatório.");
      }
    }

    void carregarOpcoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function carregarRelatorio() {
      try {
        setLoading(true);

        setDados(await getIndicadoresLocais(aplicados));
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o relatório.",
        );
      } finally {
        setLoading(false);
      }
    }

    void carregarRelatorio();
  }, [aplicados]);

  useEffect(() => {
    if (
      filtros.turmaId !== TODOS &&
      filtros.turmaId !== SELECIONE &&
      !turmasFiltradas.find((turma) => String(turma.id) === filtros.turmaId)
    ) {
      setFiltros((f) => ({
        ...f,
        turmaId: TODOS,
      }));
    }
  }, [turmasFiltradas, filtros.turmaId]);

  const total = dados?.totalParticipantes ?? 0;

  const aplicar = (next: Filtros) => {
    const normalizados = normalizarFiltros(next);

    setFiltros(next);

    setAplicados(normalizados);

    setHasSearched(true);

    setSearching(true);

    window.setTimeout(() => setSearching(false), 180);
  };

  /*
   * Limpar agora remove todos os filtros,
   * mas mantém o relatório visível,
   * voltando à consulta completa.
   */
  const limpar = () => {
    setFiltros(FILTROS_PESQUISA_INICIAIS);

    setAplicados(FILTROS_INICIAIS);

    setHasSearched(true);
  };

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const add = (id: keyof Filtros, label: string, value: string) =>
      items.push({
        id,
        label,
        value,
        onRemove: () =>
          aplicar({
            ...aplicados,
            [id]: TODOS,
          }),
      });

    if (aplicados.ano !== TODOS) {
      add("ano", "Ano", aplicados.ano);
    }

    if (aplicados.atividadeId !== TODOS) {
      add(
        "atividadeId",
        "Atividade",
        atividades.find((item) => String(item.id) === aplicados.atividadeId)
          ?.nomeAtividade ?? aplicados.atividadeId,
      );
    }

    if (aplicados.turmaId !== TODOS) {
      add(
        "turmaId",
        "Turma",
        turmas.find((item) => String(item.id) === aplicados.turmaId)
          ?.nomeTurma ?? aplicados.turmaId,
      );
    }

    if (aplicados.statusMatricula !== TODOS) {
      add(
        "statusMatricula",
        "Situação",
        labelCategoria(aplicados.statusMatricula),
      );
    }

    if (aplicados.genero !== TODOS) {
      add("genero", "Gênero", labelCategoria(aplicados.genero));
    }

    if (aplicados.racaCor !== TODOS) {
      add("racaCor", "Raça/cor", labelCategoria(aplicados.racaCor));
    }

    if (aplicados.faixaRenda !== TODOS) {
      add("faixaRenda", "Faixa de renda", labelCategoria(aplicados.faixaRenda));
    }

    if (aplicados.cadunico !== TODOS) {
      add("cadunico", "CadÚnico", labelCategoria(aplicados.cadunico));
    }

    if (aplicados.tipoDeficiencia !== TODOS) {
      add(
        "tipoDeficiencia",
        "Tipo de deficiência",
        labelCategoria(aplicados.tipoDeficiencia),
      );
    }

    if (aplicados.tipoNeurodivergencia !== TODOS) {
      add(
        "tipoNeurodivergencia",
        "Tipo de neurodivergência",
        labelCategoria(aplicados.tipoNeurodivergencia),
      );
    }

    if (aplicados.bolsaFamilia !== TODOS) {
      add(
        "bolsaFamilia",
        "Bolsa Família",
        labelCategoria(aplicados.bolsaFamilia),
      );
    }

    return items;
  }, [aplicados, atividades, turmas]);

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    if (total === 0 || !dados) {
      return;
    }

    const activityName =
      aplicados.atividadeId === TODOS
        ? "Todas"
        : (atividades.find(
            (a) => String(a.id) === String(aplicados.atividadeId),
          )?.nomeAtividade ?? aplicados.atividadeId);

    const turmaName =
      aplicados.turmaId === TODOS
        ? "Todas"
        : (turmas.find((t) => String(t.id) === String(aplicados.turmaId))
            ?.nomeTurma ?? aplicados.turmaId);

    const statusLabel =
      aplicados.statusMatricula === TODOS
        ? "Todos"
        : (statusMatriculaOptions.find(
            (s) => s.value === aplicados.statusMatricula,
          )?.label ?? aplicados.statusMatricula);

    const generoLabel =
      aplicados.genero === TODOS
        ? "Todos"
        : (generoOptions.find((item) => item.value === aplicados.genero)
            ?.label ?? aplicados.genero);

    const racaCorLabel =
      aplicados.racaCor === TODOS
        ? "Todas"
        : (racaCorOptions.find((item) => item.value === aplicados.racaCor)
            ?.label ?? aplicados.racaCor);

    const faixaRendaLabel =
      aplicados.faixaRenda === TODOS
        ? "Todas"
        : (faixaRendaOptions.find((item) => item.value === aplicados.faixaRenda)
            ?.label ?? aplicados.faixaRenda);

    const cadunicoLabel =
      aplicados.cadunico === TODOS
        ? "Todos"
        : labelCategoria(aplicados.cadunico);

    const deficienciaLabel =
      aplicados.tipoDeficiencia === TODOS
        ? "Todas"
        : labelCategoria(aplicados.tipoDeficiencia);

    const neurodivergenciaLabel =
      aplicados.tipoNeurodivergencia === TODOS
        ? "Todas"
        : labelCategoria(aplicados.tipoNeurodivergencia);

    const bolsaFamiliaLabel =
      aplicados.bolsaFamilia === TODOS
        ? "Todos"
        : labelCategoria(aplicados.bolsaFamilia);

    const data = {
      filtros: {
        ano: aplicados.ano === TODOS ? "Todos" : aplicados.ano,

        atividade: activityName,

        turma: turmaName,

        status: statusLabel,

        genero: generoLabel,

        racaCor: racaCorLabel,

        faixaRenda: faixaRendaLabel,

        cadunico: cadunicoLabel,

        tipoDeficiencia: deficienciaLabel,

        tipoNeurodivergencia: neurodivergenciaLabel,

        bolsaFamilia: bolsaFamiliaLabel,
      },

      total,

      indicadores: [
        {
          title: "Perfil por gênero",
          itens: converterIndicadores(dados.porGenero ?? []),
        },

        {
          title: "Perfil por raça/cor",
          itens: converterIndicadores(dados.porRacaCor ?? []),
        },

        {
          title: "Perfil por faixa de renda",
          itens: converterIndicadores(dados.porFaixaRenda ?? []),
        },

        {
          title: "Perfil por faixa etária",
          itens: converterIndicadores(dados.porFaixaEtaria ?? []),
        },

        {
          title: "Perfil por tipo de deficiência",
          itens: converterIndicadores(dados.porTipoDeficiencia ?? []),
        },

        {
          title: "Perfil por tipo de neurodivergência",
          itens: converterIndicadores(dados.porTipoNeurodivergencia ?? []),
        },

        {
          title: "Participantes com CadÚnico",
          itens: converterIndicadores(dados.porCadunico ?? []),
        },

        {
          title: "Participantes com Bolsa Família",
          itens: converterIndicadores(dados.porBolsaFamilia ?? []),
        },
      ],
    };

    // O PDF registra integralmente a pesquisa avançada. Valores não
    // selecionados são normalizados para Todos/Todas, deixando o escopo
    // auditável mesmo quando o arquivo é consultado fora do sistema.
    const filterLabels = [
      { label: "Ano", value: data.filtros.ano },
      { label: "Atividade", value: data.filtros.atividade },
      { label: "Turma", value: data.filtros.turma },
      {
        label: "Situação da matrícula",
        value: data.filtros.status,
      },
      { label: "Gênero", value: data.filtros.genero },
      { label: "Raça/cor", value: data.filtros.racaCor },
      { label: "Faixa de renda", value: data.filtros.faixaRenda },
      { label: "CadÚnico", value: data.filtros.cadunico },
      {
        label: "Tipo de deficiência",
        value: data.filtros.tipoDeficiencia,
      },
      {
        label: "Tipo de neurodivergência",
        value: data.filtros.tipoNeurodivergencia,
      },
      { label: "Bolsa Família", value: data.filtros.bolsaFamilia },
    ];

    if (type === "csv") {
      exportToCSV(data);
    } else if (type === "excel") {
      exportToExcel(data);
    } else {
      void downloadGeneralReportPdf({
        slug: "indicadores-sociodemograficos",
        columns: ["grupo", "categoria", "quantidade", "percentual"],
        filters: {
          ano: aplicados.ano === TODOS ? undefined : aplicados.ano,
          atividadeId:
            aplicados.atividadeId === TODOS ? undefined : aplicados.atividadeId,
          turmaId: aplicados.turmaId === TODOS ? undefined : aplicados.turmaId,
          statusMatricula:
            aplicados.statusMatricula === TODOS
              ? undefined
              : aplicados.statusMatricula,
          genero: aplicados.genero === TODOS ? undefined : aplicados.genero,
          racaCor: aplicados.racaCor === TODOS ? undefined : aplicados.racaCor,
          faixaRenda:
            aplicados.faixaRenda === TODOS ? undefined : aplicados.faixaRenda,
          cadunico:
            aplicados.cadunico === TODOS ? undefined : aplicados.cadunico,
          tipoDeficiencia:
            aplicados.tipoDeficiencia === TODOS
              ? undefined
              : aplicados.tipoDeficiencia,
          tipoNeurodivergencia:
            aplicados.tipoNeurodivergencia === TODOS
              ? undefined
              : aplicados.tipoNeurodivergencia,
          bolsaFamilia:
            aplicados.bolsaFamilia === TODOS
              ? undefined
              : aplicados.bolsaFamilia,
        },
        filterLabels,
      });
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Relatório Sociodemográfico"
          tooltip="Nesta página é apresentado o perfil sociodemográfico dos participantes da organização, permitindo analisar características do público atendido e sua distribuição entre diferentes grupos. Os dados podem ser filtrados por ano, atividade, turma e situação da matrícula para apoiar o acompanhamento das ações, a elaboração de relatórios e as prestações de contas."
        />

        <PageObjective
          className="mb-4"
          description="Analise o perfil sociodemográfico dos participantes considerando características como gênero, raça/cor, renda, faixa etária, deficiência, neurodivergência e participação em programas sociais. Utilize os filtros disponíveis para comparar diferentes recortes do público atendido por ano, atividade, turma e situação da matrícula."
        />

        <div className="mb-5 space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
            title="Pesquisa avançada"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();

                aplicar(filtros);
              }}
              noValidate
            >
              <SearchFilterGrid>
                <FilterSelect
                  label="Ano"
                  id="filtro-ano"
                  value={filtros.ano}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      ano: value,
                    }))
                  }
                  allLabel="Todos"
                  options={anos.map((value) => ({
                    value,
                    label: value,
                  }))}
                />

                <FilterSelect
                  label="Atividade"
                  id="filtro-atividade"
                  value={filtros.atividadeId}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      atividadeId: value,
                      turmaId: SELECIONE,
                    }))
                  }
                  allLabel="Todas"
                  options={atividades.map((item) => ({
                    value: String(item.id),
                    label: item.nomeAtividade,
                  }))}
                />

                <FilterSelect
                  label="Turma"
                  id="filtro-turma"
                  value={filtros.turmaId}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      turmaId: value,
                    }))
                  }
                  allLabel="Todas"
                  options={turmasFiltradas.map((item) => ({
                    value: String(item.id),
                    label: nameWithYear(
                      item.nomeTurma,
                      atividades.find(
                        (atividade) =>
                          String(atividade.id) === String(item.atividadeId),
                      )?.nomeAtividade,
                    ),
                  }))}
                  disabled={
                    filtros.atividadeId === TODOS ||
                    filtros.atividadeId === SELECIONE ||
                    turmasFiltradas.length === 0
                  }
                />

                <FilterSelect
                  label="Situação da matrícula"
                  id="filtro-status"
                  value={filtros.statusMatricula}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      statusMatricula: value,
                    }))
                  }
                  allLabel="Todas"
                  options={[...statusMatriculaOptions]}
                />

                <FilterSelect
                  label="Gênero"
                  id="filtro-genero"
                  value={filtros.genero}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      genero: value,
                    }))
                  }
                  allLabel="Todos"
                  options={[...generoOptions]}
                />

                <FilterSelect
                  label="Raça/cor"
                  id="filtro-raca"
                  value={filtros.racaCor}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      racaCor: value,
                    }))
                  }
                  allLabel="Todas"
                  options={[...racaCorOptions]}
                />

                <FilterSelect
                  label="Faixa de renda"
                  id="filtro-renda"
                  value={filtros.faixaRenda}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      faixaRenda: value,
                    }))
                  }
                  allLabel="Todas"
                  options={[...faixaRendaOptions]}
                />

                <FilterSelect
                  label="CadÚnico"
                  id="filtro-cadunico"
                  value={filtros.cadunico}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      cadunico: value,
                    }))
                  }
                  allLabel="Todos"
                  options={[
                    {
                      value: "SIM",
                      label: "Sim",
                    },
                    {
                      value: "NAO",
                      label: "Não",
                    },
                  ]}
                />

                <FilterSelect
                  label="Tipo de deficiência"
                  id="filtro-deficiencia"
                  value={filtros.tipoDeficiencia}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      tipoDeficiencia: value,
                    }))
                  }
                  allLabel="Todas"
                  options={[...tipoDeficienciaParticipanteOptions]}
                />

                <FilterSelect
                  label="Tipo de neurodivergência"
                  id="filtro-neurodivergencia"
                  value={filtros.tipoNeurodivergencia}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      tipoNeurodivergencia: value,
                    }))
                  }
                  allLabel="Todas"
                  options={[...tipoNeurodivergenciaOptions]}
                />

                <FilterSelect
                  label="Bolsa Família"
                  id="filtro-bolsa-familia"
                  value={filtros.bolsaFamilia}
                  onChange={(value) =>
                    setFiltros((previous) => ({
                      ...previous,
                      bolsaFamilia: value,
                    }))
                  }
                  allLabel="Todos"
                  options={[
                    {
                      value: "SIM",
                      label: "Sim",
                    },
                    {
                      value: "NAO",
                      label: "Não",
                    },
                  ]}
                />
              </SearchFilterGrid>

              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={limpar}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>

                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-4"
                  disabled={searching}
                >
                  <Search className="h-4 w-4" />

                  {searching ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>

          <ActiveFilters items={activeFilters} onClearAll={limpar} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="glassSecondary"
              onClick={() => handleExport("excel")}
              disabled={total === 0 || loading}
              className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>

            <Button
              type="button"
              variant="glassSecondary"
              onClick={() => handleExport("csv")}
              disabled={total === 0 || loading}
              className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>

            <Button
              type="button"
              variant="glassSecondary"
              onClick={() => handleExport("pdf")}
              disabled={total === 0 || loading}
              className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        <section className="hidden">
          <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
            Filtros do relatório
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-ano">Ano</Label>

              <Select
                value={filtros.ano}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    ano: v,
                  }))
                }
              >
                <SelectTrigger id="f-ano">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>

                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-ativ">Atividade</Label>

              <Select
                value={filtros.atividadeId}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    atividadeId: v,
                    turmaId: TODOS,
                  }))
                }
              >
                <SelectTrigger id="f-ativ">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>

                  {atividades.map((atividade) => (
                    <SelectItem key={atividade.id} value={String(atividade.id)}>
                      {atividade.nomeAtividade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-turma">Turma</Label>

              <Select
                value={filtros.turmaId}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    turmaId: v,
                  }))
                }
                disabled={turmasFiltradas.length === 0}
              >
                <SelectTrigger id="f-turma">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>

                  {turmasFiltradas.map((turma) => (
                    <SelectItem key={turma.id} value={String(turma.id)}>
                      {nameWithYear(
                        turma.nomeTurma,
                        atividades.find(
                          (atividade) =>
                            String(atividade.id) ===
                            String(turma.atividadeId),
                        )?.nomeAtividade,
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-status">Status da matrícula</Label>

              <Select
                value={filtros.statusMatricula}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    statusMatricula: v,
                  }))
                }
              >
                <SelectTrigger id="f-status">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>

                  {statusMatriculaOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-genero">Gênero</Label>

              <Select
                value={filtros.genero}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    genero: v,
                  }))
                }
              >
                <SelectTrigger id="f-genero">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>

                  {generoOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-raca-cor">Raça/cor</Label>

              <Select
                value={filtros.racaCor}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    racaCor: v,
                  }))
                }
              >
                <SelectTrigger id="f-raca-cor">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>

                  {racaCorOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-faixa-renda">Faixa de renda</Label>

              <Select
                value={filtros.faixaRenda}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    faixaRenda: v,
                  }))
                }
              >
                <SelectTrigger id="f-faixa-renda">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>

                  {faixaRendaOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-end justify-between gap-2 sm:flex-row sm:items-center">
            <div className="order-2 flex flex-wrap gap-2 sm:order-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={total === 0 || loading}
                className="h-8 text-xs"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                disabled={total === 0 || loading}
                className="h-8 text-xs"
              >
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                Exportar Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={total === 0 || loading}
                className="h-8 text-xs"
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                Exportar PDF
              </Button>
            </div>

            <div className="order-1 flex w-full gap-2 sm:order-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={limpar}
                className="flex-1 sm:flex-none"
              >
                Limpar filtros
              </Button>

              <Button
                onClick={() => aplicar(filtros)}
                className="flex-1 sm:flex-none"
              >
                Gerar relatório
              </Button>
            </div>
          </div>
        </section>

        {hasSearched && (
          <section className="mb-5 rounded-[16px] border border-border/70 bg-card/75 p-3.5 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65 sm:p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-primary/15 bg-primary-soft/60">
                <Users
                  className="h-[18px] w-[18px] text-primary"
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total de participantes encontrados
                </p>

                <p className="text-[22px] font-semibold leading-tight tabular-nums text-foreground">
                  {loading ? "..." : total}
                </p>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-[16px] border border-border/70 bg-card/75 p-8 text-center backdrop-blur-md">
            <p className="text-sm text-muted-foreground">
              Carregando indicadores...
            </p>
          </div>
        ) : total === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border/70 bg-card/60 p-8 text-center backdrop-blur-md">
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <IndicadorCard
              title="Perfil por gênero"
              itens={dados?.porGenero ?? []}
            />

            <IndicadorCard
              title="Perfil por raça/cor"
              itens={dados?.porRacaCor ?? []}
            />

            <IndicadorCard
              title="Perfil por faixa de renda"
              itens={dados?.porFaixaRenda ?? []}
            />

            <IndicadorCard
              title="Perfil por faixa etária"
              itens={dados?.porFaixaEtaria ?? []}
            />

            <IndicadorCard
              title="Perfil por tipo de deficiência"
              itens={dados?.porTipoDeficiencia ?? []}
            />

            <IndicadorCard
              title="Perfil por tipo de neurodivergência"
              itens={dados?.porTipoNeurodivergencia ?? []}
            />

            <IndicadorCard
              title="Participantes com CadÚnico"
              itens={dados?.porCadunico ?? []}
            />

            <IndicadorCard
              title="Participantes com Bolsa Família"
              itens={dados?.porBolsaFamilia ?? []}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function FilterSelect({
  label,
  id,
  value,
  onChange,
  allLabel,
  options,
  disabled,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: readonly {
    value: string;
    label: string;
  }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={SELECIONE}>Selecione</SelectItem>

          <SelectItem value={TODOS}>{allLabel}</SelectItem>

          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

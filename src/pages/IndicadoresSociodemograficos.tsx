import { useEffect, useMemo, useState } from "react";
import { Users, FileText, Download, FileSpreadsheet } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
  getIndicadoresSociodemograficos,
  getTurmasOptions,
  statusMatriculaOptions,
  type AtividadeOption,
  type IndicadorItem,
  type IndicadoresSociodemograficos,
  type TurmaOption,
} from "@/data/participantes";
import { exportToCSV, exportToExcel } from "@/lib/indicadoresExport";
import { exportIndicadoresSociodemograficosPdf } from "@/lib/relatorioExporters";
import { toast } from "sonner";

type Filtros = {
  ano: string;
  atividadeId: string;
  turmaId: string;
  statusMatricula: string;
};

type IndicadorExportItem = {
  label: string;
  count: number;
  percentual: number;
};

const TODOS = "TODOS";

const FILTROS_INICIAIS: Filtros = {
  ano: String(new Date().getFullYear()),
  atividadeId: TODOS,
  turmaId: TODOS,
  statusMatricula: TODOS,
};

const categoriaLabels: Record<string, string> = {
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

interface IndicadorCardProps {
  title: string;
  itens: IndicadorItem[];
}

function IndicadorCard({ title, itens }: IndicadorCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground tracking-tight mb-3">
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
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">
                    {labelCategoria(it.categoria)}
                  </span>

                  <span className="text-muted-foreground tabular-nums">
                    {it.total} • {pct.toFixed(2)}%
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
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
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_INICIAIS);

  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [dados, setDados] = useState<IndicadoresSociodemograficos | null>(null);
  const [loading, setLoading] = useState(true);

  const anos = useMemo(anosDisponiveis, []);

  const turmasFiltradas = useMemo(() => {
    if (filtros.atividadeId === TODOS) return turmas;

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

        if (!active) return;

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

        const response = await getIndicadoresSociodemograficos({
          ano: aplicados.ano === TODOS ? undefined : aplicados.ano,
          atividadeId:
            aplicados.atividadeId === TODOS ? undefined : aplicados.atividadeId,
          turmaId: aplicados.turmaId === TODOS ? undefined : aplicados.turmaId,
          statusMatricula:
            aplicados.statusMatricula === TODOS
              ? undefined
              : aplicados.statusMatricula,
        });

        setDados(response);
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
      !turmasFiltradas.find((turma) => String(turma.id) === filtros.turmaId)
    ) {
      setFiltros((f) => ({ ...f, turmaId: TODOS }));
    }
  }, [turmasFiltradas, filtros.turmaId]);

  const total = dados?.totalParticipantes ?? 0;

  const limpar = () => {
    setFiltros(FILTROS_INICIAIS);
    setAplicados(FILTROS_INICIAIS);
  };

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    if (total === 0 || !dados) return;

    const activityName =
      aplicados.atividadeId === TODOS
        ? "Todas"
        : atividades.find((a) => String(a.id) === String(aplicados.atividadeId))
          ?.nomeAtividade ?? aplicados.atividadeId;

    const turmaName =
      aplicados.turmaId === TODOS
        ? "Todas"
        : turmas.find((t) => String(t.id) === String(aplicados.turmaId))
          ?.nomeTurma ?? aplicados.turmaId;

    const statusLabel =
      aplicados.statusMatricula === TODOS
        ? "Todos"
        : statusMatriculaOptions.find(
          (s) => s.value === aplicados.statusMatricula,
        )?.label ?? aplicados.statusMatricula;

    const data = {
      filtros: {
        ano: aplicados.ano === TODOS ? "Todos" : aplicados.ano,
        atividade: activityName,
        turma: turmaName,
        status: statusLabel,
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
      ],
    };

    if (type === "csv") exportToCSV(data);
    else if (type === "excel") exportToExcel(data);
    else void exportIndicadoresSociodemograficosPdf(data);
  };

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <PageTitle
          title="Relatório Sociodemográfico"
          tooltip="Relatório com o perfil sociodemográfico dos participantes por gênero, raça/cor, faixa de renda e faixa etária com filtros por ano, atividade, turma e status da matrícula."
        />

        <section className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm mb-5">
          <h2 className="text-sm font-semibold text-foreground tracking-tight mb-4">
            Filtros do relatório
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-ano">Ano</Label>

              <Select
                value={filtros.ano}
                onValueChange={(v) => setFiltros((f) => ({ ...f, ano: v }))}
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
                    <SelectItem
                      key={atividade.id}
                      value={String(atividade.id)}
                    >
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
                  setFiltros((f) => ({ ...f, turmaId: v }))
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
                      {turma.nomeTurma}
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
                  setFiltros((f) => ({ ...f, statusMatricula: v }))
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
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-between mt-5 items-end sm:items-center">
            <div className="flex flex-wrap gap-2 order-2 sm:order-1">
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

            <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={limpar}
                className="flex-1 sm:flex-none"
              >
                Limpar filtros
              </Button>

              <Button
                onClick={() => setAplicados(filtros)}
                className="flex-1 sm:flex-none"
              >
                Gerar relatório
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm mb-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary-soft border border-primary/15 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Total de participantes encontrados
              </p>

              <p className="text-2xl font-semibold text-foreground tabular-nums">
                {loading ? "..." : total}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Carregando indicadores...
            </p>
          </div>
        ) : total === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
      </div>
    </AppLayout>
  );
}
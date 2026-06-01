import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  FileSignature,
  FileText,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  Landmark,
  Package,
  PlayCircle,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInicioDados, type InicioDados } from "@/data/inicio";
import { toast } from "sonner";

type EtapaStatus =
  | "NAO_INICIADA"
  | "EM_ANDAMENTO"
  | "COM_PENDENCIAS"
  | "CONCLUIDA";

interface ModuleLink {
  label: string;
  route: string;
  done: boolean;
}

interface JourneyStep {
  key: string;
  title: string;
  description: string;
  modules: ModuleLink[];
  microcopy: string;
  icon: LucideIcon;
  status: EtapaStatus;
}

const statusConfig: Record<
  EtapaStatus,
  {
    label: string;
    icon: LucideIcon;
    badgeClass: string;
    barClass: string;
  }
> = {
  CONCLUIDA: {
    label: "Concluída",
    icon: CheckCircle2,
    badgeClass:
      "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))] border-[hsl(var(--status-active-fg)/0.3)]",
    barClass: "[&>div]:bg-[hsl(var(--status-active-fg))]",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    icon: Clock,
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    barClass: "[&>div]:bg-primary",
  },
  COM_PENDENCIAS: {
    label: "Com pendências",
    icon: AlertTriangle,
    badgeClass:
      "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))] border-[hsl(var(--status-pending-fg)/0.3)]",
    barClass: "[&>div]:bg-[hsl(var(--status-pending-fg))]",
  },
  NAO_INICIADA: {
    label: "Não iniciada",
    icon: Circle,
    badgeClass:
      "bg-[hsl(var(--status-inactive-bg))] text-[hsl(var(--status-inactive-fg))] border-[hsl(var(--status-inactive-fg)/0.3)]",
    barClass: "[&>div]:bg-[hsl(var(--status-inactive-fg)/0.5)]",
  },
};

const initialData: InicioDados = {
  nomeUsuario: "Usuário",
  nomeOrganizacao: "sua organização",
  hasOrganizacao: false,

  totalOrganizacoes: 0,
  totalAgentes: 0,
  totalDiretoria: 0,

  totalParticipantes: 0,
  totalColaboradores: 0,
  totalIntegrantes: 0,

  totalProjetos: 0,
  totalMetasProjeto: 0,
  totalCronogramas: 0,

  totalAtividades: 0,
  totalTurmas: 0,
  totalPresencas: 0,

  totalEventos: 0,
  totalAcoesDivulgacao: 0,
  totalPlanosComunicacao: 0,

  totalEvidencias: 0,

  totalFinanceiros: 0,

  totalPlanejamentosFinanceiros: 0,
  totalEditais: 0,
  totalPropostasEditais: 0,
  totalResultadosPropostas: 0,
  totalHabilitacoesPropostas: 0,
  totalEquipesEditais: 0,

  totalPrestacoesContas: 0,
  totalPrestacoesMetas: 0,

  totalPatrimonios: 0,
  totalEmprestimos: 0,

  totalCurriculos: 0,
  totalTrajetoriasCulturais: 0,

  totalDocumentos: 0,
  documentosAtualizados: 0,
  documentosVencidos: 0,
  documentosPendentes: 0,
};

export default function Inicio() {
  const navigate = useNavigate();

  const [dados, setDados] = useState<InicioDados>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const result = await getInicioDados();

        if (!active) return;

        setDados({
          ...initialData,
          ...result,
        });
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados da página inicial.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, []);

  const documentosOk =
    dados.totalDocumentos > 0 &&
    dados.documentosVencidos === 0 &&
    dados.documentosPendentes === 0;

  const computeStatus = (
    modules: ModuleLink[],
    hasPendencia = false,
  ): EtapaStatus => {
    const doneCount = modules.filter((m) => m.done).length;

    if (doneCount === 0) return "NAO_INICIADA";
    if (hasPendencia) return "COM_PENDENCIAS";
    if (doneCount === modules.length) return "CONCLUIDA";

    return "EM_ANDAMENTO";
  };

  const computePercentual = (modules: ModuleLink[]): number => {
    if (modules.length === 0) return 0;

    const doneCount = modules.filter((m) => m.done).length;

    return Math.round((doneCount / modules.length) * 100);
  };

  const journeySteps = useMemo<JourneyStep[]>(() => {
    const institucionalModules: ModuleLink[] = [
      {
        label: "Dados Institucionais",
        route: "/organizacoes",
        done: dados.hasOrganizacao || dados.totalOrganizacoes > 0,
      },
      {
        label: "Diretoria",
        route: "/diretoria",
        done: dados.totalDiretoria > 0,
      },
      {
        label: "Documentos",
        route: "/documentos",
        done: documentosOk,
      },
      {
        label: "Agentes Culturais",
        route: "/agentes",
        done: dados.totalAgentes > 0,
      },
    ];

    const pessoasModules: ModuleLink[] = [
      {
        label: "Colaboradores",
        route: "/colaboradores",
        done: dados.totalColaboradores > 0,
      },
      {
        label: "Integrantes",
        route: "/integrantes",
        done: dados.totalIntegrantes > 0,
      },
      {
        label: "Participantes",
        route: "/participantes",
        done: dados.totalParticipantes > 0,
      },
    ];

    const trajetoriasModules: ModuleLink[] = [
      {
        label: "Currículos",
        route: "/curriculos",
        done: dados.totalCurriculos > 0,
      },
      {
        label: "Trajetórias Culturais",
        route: "/trajetorias-culturais",
        done: dados.totalTrajetoriasCulturais > 0,
      },
    ];

    const projetosModules: ModuleLink[] = [
      {
        label: "Projetos",
        route: "/projetos",
        done: dados.totalProjetos > 0,
      },
      {
        label: "Metas do Projeto",
        route: "/metas-projeto",
        done: dados.totalMetasProjeto > 0,
      },
      {
        label: "Cronograma",
        route: "/cronograma",
        done: dados.totalCronogramas > 0,
      },
    ];

    const execucaoModules: ModuleLink[] = [
      {
        label: "Atividades",
        route: "/atividades",
        done: dados.totalAtividades > 0,
      },
      {
        label: "Turmas",
        route: "/turmas",
        done: dados.totalTurmas > 0,
      },
      {
        label: "Presenças",
        route: "/presencas",
        done: dados.totalPresencas > 0,
      },
    ];

    const acoesCulturaisModules: ModuleLink[] = [
      {
        label: "Eventos Culturais",
        route: "/eventos-culturais",
        done: dados.totalEventos > 0,
      },
      {
        label: "Ações de Divulgação",
        route: "/acoes-divulgacao",
        done: dados.totalAcoesDivulgacao > 0,
      },
      {
        label: "Execução da Divulgação",
        route: "/plano-comunicacao",
        done: dados.totalPlanosComunicacao > 0,
      },
    ];

    const financeiroModules: ModuleLink[] = [
      {
        label: "Controle Financeiro",
        route: "/financeiro",
        done: dados.totalFinanceiros > 0,
      },
    ];

    const editaisModules: ModuleLink[] = [
      {
        label: "Editais",
        route: "/editais",
        done: dados.totalEditais > 0,
      },
      {
        label: "Propostas de Edital",
        route: "/propostas-edital",
        done: dados.totalPropostasEditais > 0,
      },
      {
        label: "Equipe da Proposta",
        route: "/equipe-edital",
        done: dados.totalEquipesEditais > 0,
      },
      {
        label: "Orçamento da Proposta",
        route: "/planejamento-financeiro",
        done: dados.totalPlanejamentosFinanceiros > 0,
      },
      {
        label: "Resultado da Proposta",
        route: "/resultados-propostas",
        done: dados.totalResultadosPropostas > 0,
      },
      {
        label: "Habilitação Documental",
        route: "/habilitacoes-propostas",
        done: dados.totalHabilitacoesPropostas > 0,
      },
    ];

    const evidenciasModules: ModuleLink[] = [
      {
        label: "Evidências de Execução",
        route: "/evidencias",
        done: dados.totalEvidencias > 0,
      },
    ];

    const prestacaoModules: ModuleLink[] = [
      {
        label: "Prestação de Contas",
        route: "/prestacao-contas",
        done: dados.totalPrestacoesContas > 0,
      },
      {
        label: "Cumprimento de Metas",
        route: "/prestacao-metas",
        done: dados.totalPrestacoesMetas > 0,
      },
    ];

    const patrimonioModules: ModuleLink[] = [
      {
        label: "Patrimônio",
        route: "/patrimonio",
        done: dados.totalPatrimonios > 0,
      },
      {
        label: "Empréstimos",
        route: "/emprestimos",
        done: dados.totalEmprestimos > 0,
      },
    ];

    return [
      {
        key: "institucional",
        title: "Institucional",
        description:
          "Organize a base oficial da sua organização: dados cadastrais, diretoria, documentos e agentes culturais.",
        modules: institucionalModules,
        microcopy:
          "Essa base ajuda a manter informações institucionais corretas para documentos, relatórios, editais e prestação de contas.",
        icon: Landmark,
        status: computeStatus(
          institucionalModules,
          dados.documentosVencidos > 0 || dados.documentosPendentes > 0,
        ),
      },
      {
        key: "pessoas",
        title: "Pessoas",
        description:
          "Cadastre as pessoas que colaboram, integram ou participam das ações da organização.",
        modules: pessoasModules,
        microcopy:
          "Manter esses dados atualizados facilita o acompanhamento de atividades, vínculos, presenças e comprovações.",
        icon: HeartHandshake,
        status: computeStatus(pessoasModules),
      },
      {
        key: "trajetorias",
        title: "Trajetórias",
        description:
          "Registre currículos e trajetórias culturais para demonstrar experiência, atuação na área e vínculo com projetos e ações culturais.",
        modules: trajetoriasModules,
        microcopy:
          "Essas informações ajudam a demonstrar, em editais, que a equipe possui experiência compatível com a proposta e capacidade para executar as ações previstas.",
        icon: RouteIcon,
        status: computeStatus(trajetoriasModules),
      },
      {
        key: "projetos",
        title: "Projetos",
        description:
          "Estruture projetos, metas e cronogramas para organizar o planejamento antes da execução.",
        modules: projetosModules,
        microcopy:
          "Esses registros ajudam a mostrar o que será realizado, como cada etapa será executada e quais resultados a organização pretende entregar.",
        icon: FolderKanban,
        status: computeStatus(projetosModules),
      },
      {
        key: "execucao",
        title: "Execução",
        description:
          "Acompanhe atividades, turmas e presenças para registrar a realização prática das ações previstas no projeto.",
        modules: execucaoModules,
        microcopy:
          "Esses registros ajudam a comprovar a execução do projeto, demonstrar participação do público e apoiar relatórios, monitoramento interno e prestação de contas.",
        icon: PlayCircle,
        status: computeStatus(execucaoModules),
      },
      {
        key: "acoes-culturais",
        title: "Ações Culturais",
        description:
          "Registre eventos culturais, ações de divulgação e execução da divulgação para organizar a mobilização e a visibilidade das iniciativas.",
        modules: acoesCulturaisModules,
        microcopy:
          "Essas informações ajudam a demonstrar o alcance das ações, a mobilização do público e a atuação cultural da organização em editais, relatórios e prestações de contas.",
        icon: Sparkles,
        status: computeStatus(acoesCulturaisModules),
      },
      {
        key: "financeiro",
        title: "Controle Financeiro",
        description:
          "Registre receitas e despesas para acompanhar a gestão financeira da organização e os custos vinculados aos projetos e ações.",
        modules: financeiroModules,
        microcopy:
          "Esses registros fortalecem o controle administrativo, ajudam a acompanhar a aplicação dos recursos e preparam a organização para relatórios, auditorias e prestações de contas.",
        icon: HandCoins,
        status: computeStatus(financeiroModules),
      },
      {
        key: "editais",
        title: "Editais",
        description:
          "Organize editais, propostas, resultados, habilitação documental, equipe da proposta e orçamento da proposta para apoiar inscrições mais claras, coerentes e bem estruturadas.",
        modules: editaisModules,
        microcopy:
          "Esses registros ajudam a acompanhar todo o percurso da inscrição: edital, proposta enviada, resultado divulgado, eventual recurso, habilitação documental, equipe e orçamento.",
        icon: FileSignature,
        status: computeStatus(editaisModules),
      },
      {
        key: "evidencias",
        title: "Evidências",
        description:
          "Registre evidências de execução para comprovar atividades, eventos, presenças, ações de divulgação e entregas realizadas.",
        modules: evidenciasModules,
        microcopy:
          "As evidências conectam a execução real aos relatórios, ajudando a demonstrar o que foi feito por meio de fotos, documentos, listas, vídeos e links.",
        icon: Camera,
        status: computeStatus(evidenciasModules),
      },
      {
        key: "prestacao-contas",
        title: "Prestação de Contas",
        description:
          "Acompanhe prestações de contas e cumprimento de metas para comprovar a execução física, financeira e documental do projeto.",
        modules: prestacaoModules,
        microcopy:
          "Esses registros ajudam a demonstrar o que foi realizado, como os recursos foram utilizados e quais metas foram cumpridas, facilitando relatórios e comprovações.",
        icon: ClipboardCheck,
        status: computeStatus(prestacaoModules),
      },
      {
        key: "patrimonio",
        title: "Patrimônio",
        description:
          "Registre bens, equipamentos e empréstimos para acompanhar o uso e a conservação dos recursos materiais da organização.",
        modules: patrimonioModules,
        microcopy:
          "Esse controle ajuda a acompanhar o uso dos bens, identificar responsáveis, preservar recursos materiais e manter a organização preparada para relatórios, auditorias e prestação de contas.",
        icon: Package,
        status: computeStatus(patrimonioModules),
      },
    ];
  }, [dados, documentosOk]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <section
          className="rounded-xl border bg-card px-5 py-5 shadow-sm"
          aria-labelledby="welcome-title"
        >
          <div className="flex items-start gap-3">

            <div className="min-w-0 space-y-1.5">
              <h1
                id="welcome-title"
                className="text-lg font-semibold text-foreground sm:text-xl"
              >
                Bem-vindo(a), {dados.nomeUsuario}
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                A Aurit reúne, em um só lugar, as informações que sustentam a
                história, a gestão e os próximos passos da sua organização.
              </p>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Aqui, documentos, pessoas, projetos, evidências e registros
                financeiros se conectam para apoiar decisões, preparar editais e
                facilitar prestações de contas com mais clareza e confiança.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="journey-title">
          <header className="space-y-1">
            <h2
              id="journey-title"
              className="text-base font-semibold text-foreground sm:text-lg"
            >
              Sua jornada dentro da Aurit
            </h2>

            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Siga este caminho para estruturar sua organização, acompanhar suas
              ações e se preparar melhor para editais, relatórios e prestações
              de contas.
            </p>
          </header>

          <ol className="space-y-2.5">
            {journeySteps.map((step, index) => {
              const cfg = statusConfig[step.status];
              const StatusIcon = cfg.icon;
              const StepIcon = step.icon;
              const percentual = computePercentual(step.modules);

              return (
                <li key={step.key}>
                  <Card className="overflow-hidden border-border shadow-sm transition-colors hover:border-primary/25">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
                            <StepIcon className="h-3.5 w-3.5" strokeWidth={2} />
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {step.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}
                          >
                            <StatusIcon
                              className="h-2.5 w-2.5"
                              strokeWidth={2.6}
                            />
                            {cfg.label}
                          </span>

                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {percentual}%
                          </span>
                        </div>
                      </div>

                      <Progress
                        value={percentual}
                        className={`h-1 ${cfg.barClass}`}
                      />

                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {step.modules.map((mod) => (
                          <button
                            key={mod.label}
                            type="button"
                            onClick={() => navigate(mod.route)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                          >
                            {mod.done ? (
                              <CheckCircle2
                                className="h-2.5 w-2.5 text-[hsl(var(--status-active-fg))]"
                                strokeWidth={2.6}
                              />
                            ) : (
                              <Circle
                                className="h-2.5 w-2.5 text-muted-foreground/60"
                                strokeWidth={2}
                              />
                            )}

                            {mod.label}
                          </button>
                        ))}
                      </div>

                      <p className="max-w-2xl text-xs leading-5 text-muted-foreground/90">
                        {step.microcopy}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="docs-title">
          <Card
            className="border shadow-sm"
            style={{
              backgroundColor: "hsl(var(--primary-soft))",
              borderColor: "hsl(var(--primary) / 0.18)",
            }}
          >
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                  <FileText className="h-4 w-4" strokeWidth={2} />
                </div>

                <div className="min-w-0 space-y-1">
                  <h2
                    id="docs-title"
                    className="text-sm font-semibold text-foreground sm:text-base"
                  >
                    Mantenha os documentos em dia
                  </h2>

                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Editais, parcerias e prestações de contas costumam exigir
                    documentos atualizados. Organizar atas, certidões,
                    comprovantes e registros institucionais com antecedência
                    evita correria e ajuda a organização a responder
                    oportunidades com mais segurança.
                  </p>

                  {dados.totalDocumentos > 0 && (
                    <p className="pt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold tabular-nums text-foreground">
                        {dados.documentosAtualizados}
                      </span>{" "}
                      atualizados
                      {dados.documentosVencidos > 0 && (
                        <>
                          {" · "}
                          <span className="font-semibold tabular-nums text-[hsl(var(--destructive))]">
                            {dados.documentosVencidos}
                          </span>{" "}
                          vencidos
                        </>
                      )}
                      {dados.documentosPendentes > 0 && (
                        <>
                          {" · "}
                          <span className="font-semibold tabular-nums text-[hsl(var(--status-pending-fg))]">
                            {dados.documentosPendentes}
                          </span>{" "}
                          pendentes
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => navigate("/documentos")}
                size="sm"
                className="sm:flex-shrink-0"
              >
                Ver documentos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <WikiFloatingButton pageTitle="Página Inicial" />
    </AppLayout>
  );
}
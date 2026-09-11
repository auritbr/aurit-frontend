import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Files,
  Loader2,
  FolderKanban,
  PenLine,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import { StatusPill } from "@/components/StatusPill";
import { FormMultiSelect } from "@/components/FormMultiSelect";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DadosAutomaticosHint } from "@/components/prestacao/DadosAutomaticosHint";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import {
  PrestacaoSectionNav,
  type PrestacaoSectionItem,
} from "@/components/prestacao/PrestacaoSectionNav";
import { RegistrosSelecionaveis } from "@/components/prestacao/RegistrosSelecionaveis";
import {
  atualizarPrestacaoContasDetalhada,
  buscarPrestacaoContasDetalhada,
  carregarExecucaoProjeto,
  formatMoeda,
  iniciarPrestacaoContas,
  projetoOptionsPrestacao,
  responsavelOptionsPrestacao,
  type ExecucaoProjeto,
  type PrestacaoAtualizacao,
  type ProjetoOptionPrestacao,
} from "@/lib/prestacaoExecucao";
import {
  produtoGeradoLabel,
  produtoGeradoOptions,
  situacaoIndicaAnalise,
  statusPrestacaoContasLabel,
  statusPrestacaoContasOptions,
} from "@/data/prestacaoContas";

type FormState = PrestacaoAtualizacao & { projetoId: string };

const initialForm: FormState = {
  projetoId: "",
  dataInicio: "",
  dataFim: "",
  dataEntrega: "",
  agenteId: "",
  atividadeIds: [],
  turmaIds: [],
  planoAulaIds: [],
  eventoCulturalIds: [],
  cronogramaIds: [],
  colaboradorIds: [],
  cumprimentoMetaIds: [],
  metas: [],
  produtosGerados: [],
  descricaoExecucao: "",
  resultadosAlcancados: "",
  avaliacaoPublicoAlcancado: "",
  diferencasPlanejadoRealizado: "",
  dificuldadesEncontradas: "",
  providenciasAdotadas: "",
  consideracoesFinais: "",
  disponibilizacaoProdutosPublico: "",
  outrosProdutosGerados: "",
  parecerPrestacaoContas: "",
  observacaoAnalise: "",
  dataAnalise: "",
  statusPrestacaoContas: "NAO_INICIADA",
};

const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);
const dateValue = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function PrestacaoContasForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const viewOnly = Boolean(id) && !location.pathname.endsWith("/editar");
  const [form, setForm] = useState<FormState>(initialForm);
  const [projetos, setProjetos] = useState<ProjetoOptionPrestacao[]>([]);
  const [responsaveis, setResponsaveis] = useState<ProjetoOptionPrestacao[]>(
    [],
  );
  const [execucao, setExecucao] = useState<ExecucaoProjeto | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secaoAtiva, setSecaoAtiva] = useState("periodo-projeto");
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    void projetoOptionsPrestacao()
      .then((items) => active && setProjetos(items))
      .catch(
        (error) =>
          active &&
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os projetos.",
          ),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void responsavelOptionsPrestacao()
      .then((items) => active && setResponsaveis(items))
      .catch(
        (error) =>
          active &&
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os responsáveis.",
          ),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void buscarPrestacaoContasDetalhada(id)
      .then((data) => {
        if (!active) return;
        setForm({
          ...initialForm,
          projetoId: data.projeto.id,
          dataInicio: dateValue(data.dataInicio),
          dataFim: dateValue(data.dataFim),
          dataEntrega: dateValue(data.dataEntrega),
          agenteId: data.responsavel?.id ?? "",
          atividadeIds: ids(data.atividades),
          turmaIds: ids(data.turmas),
          planoAulaIds: ids(data.planosAula),
          eventoCulturalIds: ids(data.eventos),
          cronogramaIds: ids(data.cronograma),
          colaboradorIds: ids(data.colaboradores),
          cumprimentoMetaIds: ids(data.cumprimentosMetas),
          produtosGerados: data.produtosGerados,
          outrosProdutosGerados: data.outrosProdutosGerados,
          disponibilizacaoProdutosPublico: data.disponibilizacaoProdutosPublico,
          descricaoExecucao: data.descricaoExecucao,
          resultadosAlcancados: data.resultadosAlcancados,
          avaliacaoPublicoAlcancado: data.avaliacaoPublicoAlcancado,
          diferencasPlanejadoRealizado: data.diferencasPlanejadoRealizado,
          dificuldadesEncontradas: data.dificuldadesEncontradas,
          providenciasAdotadas: data.providenciasAdotadas,
          consideracoesFinais: data.consideracoesFinais,
          statusPrestacaoContas: data.statusPrestacaoContas,
          parecerPrestacaoContas: data.parecerPrestacaoContas,
          observacaoAnalise: data.observacaoAnalise,
          dataAnalise: dateValue(data.dataAnalise),
        });
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a prestação.",
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const loadRegistros = useCallback(async () => {
    if (!form.projetoId || !form.dataInicio || !form.dataFim) {
      setExecucao(null);
      return;
    }
    setLoadingRegistros(true);
    try {
      const resultado = await carregarExecucaoProjeto({
        projetoId: form.projetoId,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
      });
      setExecucao(resultado);
      setForm((current) => ({
        ...current,
        metas: resultado.metas.map((meta) => {
          const editada = current.metas.find(
            (item) => item.metaProjetoId === meta.id,
          );
          return (
            editada ?? {
              metaProjetoId: meta.id,
              statusCumprimentoMeta:
                meta.cumprimentoId ||
                meta.quantidadeExecutada ||
                meta.observacaoCumprimento
                  ? meta.situacao
                  : "",
              quantidadeExecutada: meta.quantidadeExecutada ?? "",
              observacaoCumprimento: meta.observacaoCumprimento ?? "",
              justificativaNaoCumprimentoIntegral:
                meta.justificativaNaoCumprimentoIntegral ?? "",
              evidenciaIds: meta.evidenciaIds,
            }
          );
        }),
      }));
    } catch (error) {
      setExecucao(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível consolidar os registros do projeto.",
      );
    } finally {
      setLoadingRegistros(false);
    }
  }, [form.projetoId, form.dataInicio, form.dataFim]);

  useEffect(() => {
    void loadRegistros();
  }, [loadRegistros]);

  const sections = useMemo<PrestacaoSectionItem[]>(() => {
    const records =
      form.atividadeIds.length +
      form.turmaIds.length +
      form.eventoCulturalIds.length +
      form.cronogramaIds.length;
    const narrative = [
      form.descricaoExecucao,
      form.resultadosAlcancados,
      form.avaliacaoPublicoAlcancado,
    ].filter(Boolean).length;
    return [
      {
        id: "periodo-projeto",
        label: "Projeto",
        state: form.projetoId ? "completa" : "pendente",
      },
      {
        id: "registros",
        label: "Registros da Execução",
        state: records ? "completa" : "vazia",
      },
      {
        id: "colaboradores",
        label: "Colaboradores",
        state: form.colaboradorIds.length ? "completa" : "vazia",
      },
      {
        id: "participacao",
        label: "Participação",
        state: execucao ? "completa" : "vazia",
      },
      {
        id: "metas",
        label: "Metas e Cumprimento",
        state: execucao?.metas.length ? "completa" : "vazia",
      },
      {
        id: "evidencias",
        label: "Evidências",
        state: execucao?.evidencias.total ? "completa" : "vazia",
      },
      {
        id: "financeiro",
        label: "Execução Financeira",
        state: execucao?.financeiro.possuiDados ? "completa" : "vazia",
      },
      {
        id: "avaliacao",
        label: "Avaliação da Execução",
        state: narrative === 3 ? "completa" : narrative ? "pendente" : "vazia",
      },
      {
        id: "conclusao",
        label: "Considerações Finais",
        state: form.consideracoesFinais ? "completa" : "vazia",
      },
      {
        id: "situacao",
        label: "Situação da Prestação",
        state:
          form.statusPrestacaoContas !== "NAO_INICIADA" ? "completa" : "vazia",
      },
    ];
  }, [execucao, form]);
  const progresso = Math.round(
    (sections.filter((section) => section.state === "completa").length /
      sections.length) *
      100,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id) setSecaoAtiva(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );
    const elements = Object.values(sectionsRef.current).filter(
      (value): value is HTMLElement => Boolean(value),
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (viewOnly || saving) return;
    if (!form.projetoId) {
      toast.error("Informe o projeto da prestação.");
      return;
    }
    setSaving(true);
    try {
      const payload: PrestacaoAtualizacao = {
        ...form,
        dataEntrega: form.dataEntrega || null,
        dataAnalise: form.dataAnalise || null,
      };
      const prestacao = id
        ? await atualizarPrestacaoContasDetalhada(id, payload)
        : await iniciarPrestacaoContas(form.projetoId);
      if (!id) await atualizarPrestacaoContasDetalhada(prestacao.id, payload);
      if (!id) emitJourneyNextStep();
      toast.success("Prestação de contas salva.");
      navigate("/prestacao-contas");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a prestação de contas.",
      );
    } finally {
      setSaving(false);
    }
  };

  const readOnly = (value: string) => (
    <p className="min-h-9 rounded-[11px] border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
      {value || "—"}
    </p>
  );
  const registrosVisiveis = <T extends { id: string }>(
    items: T[],
    selected: string[],
  ) => (viewOnly ? items.filter((item) => selected.includes(item.id)) : items);

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-6xl space-y-4 py-6 sm:py-8">
          <div className="h-8 w-56 animate-pulse rounded-[12px] bg-muted/60" />
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-[18px] bg-muted/40"
            />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 sm:py-8">
        <BackButton to="/prestacao-contas" />
        <ListPageHeader
          title={
            viewOnly
              ? "Prestação de Contas"
              : id
                ? "Prestação de Contas"
                : "Prestação de Contas"
          }
          tooltip="Consolide os registros reais de execução, participação, metas e informações financeiras do período."
          objective="Organize a prestação de contas a partir dos dados já cadastrados no sistema, selecionando apenas os registros que representam a execução do período."
          actions={
            form.statusPrestacaoContas ? (
              <StatusPill
                status={statusPrestacaoContasLabel(form.statusPrestacaoContas)}
                context="prestacao-contas"
                ariaLabelPrefix="Situação da prestação"
              />
            ) : undefined
          }
        />
        {!viewOnly && <FormLegend />}
        <div className="grid min-w-0 gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <PrestacaoSectionNav
              sections={sections}
              activeId={secaoAtiva}
              progresso={progresso}
              onNavigate={(section) => {
                setSecaoAtiva(section);
                sectionsRef.current[section]?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            />
          </div>
          <form onSubmit={submit} className="min-w-0 space-y-5">
            <fieldset
              disabled={viewOnly}
              className="min-w-0 space-y-5 border-0 p-0 disabled:opacity-100"
            >
              <div
                id="periodo-projeto"
                ref={(node) => {
                  sectionsRef.current["periodo-projeto"] = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={FolderKanban}
                  title="Vínculos da Prestação"
                  description="Selecione o projeto que será considerado nesta prestação e o agente cultural responsável pelo seu preenchimento. A partir do projeto, o sistema reúne os registros vinculados para a consolidação da execução."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel
                        required
                        htmlFor="projeto"
                        tooltip="Selecione o projeto cuja execução será apresentada nesta prestação de contas. Ao selecionar o projeto, o sistema carrega os registros vinculados disponíveis para conferência."
                      >
                        Projeto
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(
                          execucao?.projeto.titulo ||
                            projetos.find(
                              (item) => item.value === form.projetoId,
                            )?.label ||
                            "",
                        )
                      ) : (
                        <Select
                          value={form.projetoId}
                          onValueChange={(value) => {
                            const projeto = projetos.find(
                              (item) => item.value === value,
                            );

                            setForm((current) => ({
                              ...current,
                              projetoId: value,
                              dataInicio: projeto?.dataInicio ?? "",
                              dataFim: projeto?.dataFim ?? "",
                            }));
                          }}
                          disabled={Boolean(id)}
                        >
                          <SelectTrigger id="projeto">
                            <SelectValue placeholder="Selecione o projeto" />
                          </SelectTrigger>

                          <SelectContent>
                            {projetos.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="responsavel"
                        tooltip="Selecione o agente cultural que ficará identificado como responsável por esta prestação de contas."
                      >
                        Agente Cultural
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(
                          responsaveis.find(
                            (item) => item.value === form.agenteId,
                          )?.label || "",
                        )
                      ) : (
                        <Select
                          value={form.agenteId || ""}
                          onValueChange={(value) => patch("agenteId", value)}
                        >
                          <SelectTrigger id="responsavel">
                            <SelectValue placeholder="Selecione o agente cultural" />
                          </SelectTrigger>

                          <SelectContent>
                            {responsaveis.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {execucao && !loadingRegistros && (
                    <div className="mt-4">
                      <DadosAutomaticosHint text="Resumo do projeto consolidado automaticamente." />

                      <dl className="mt-2.5 grid gap-x-4 gap-y-2.5 rounded-[14px] border border-border/60 bg-card/60 px-4 py-3 supports-[backdrop-filter]:bg-card/50 sm:grid-cols-2 lg:grid-cols-3">
                        {execucao.resumo.map((campo) => (
                          <div key={campo.label} className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {campo.label}
                            </dt>

                            <dd className="break-words text-[13px] text-foreground">
                              {campo.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="registros"
                ref={(node) => {
                  sectionsRef.current.registros = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={ClipboardList}
                  title="Registros da Execução"
                  description="Selecione os registros que representam o que efetivamente fez parte da execução considerada nesta prestação."
                >
                  <DadosAutomaticosHint className="mb-4" />

                  {!execucao ? (
                    <p className="text-sm text-muted-foreground">
                      Selecione o projeto para carregar os registros
                      disponíveis.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      <RegistrosSelecionaveis
                        titulo="Cronograma"
                        itens={registrosVisiveis(
                          execucao.cronograma,
                          form.cronogramaIds,
                        )}
                        selecionados={viewOnly ? undefined : form.cronogramaIds}
                        onChange={(value) => patch("cronogramaIds", value)}
                        emptyMessage="Nenhuma etapa encontrada no período."
                      />

                      <RegistrosSelecionaveis
                        titulo="Atividades"
                        itens={registrosVisiveis(
                          execucao.atividades,
                          form.atividadeIds,
                        )}
                        selecionados={viewOnly ? undefined : form.atividadeIds}
                        onChange={(value) => patch("atividadeIds", value)}
                        emptyMessage="Nenhuma atividade encontrada no período."
                      />

                      <RegistrosSelecionaveis
                        titulo="Turmas"
                        itens={registrosVisiveis(
                          execucao.turmas,
                          form.turmaIds,
                        )}
                        selecionados={viewOnly ? undefined : form.turmaIds}
                        onChange={(value) => patch("turmaIds", value)}
                        emptyMessage="Nenhuma turma encontrada no período."
                      />

                      <RegistrosSelecionaveis
                        titulo="Planos de Aula"
                        itens={registrosVisiveis(
                          execucao.planosAula,
                          form.planoAulaIds,
                        )}
                        selecionados={viewOnly ? undefined : form.planoAulaIds}
                        onChange={(value) => patch("planoAulaIds", value)}
                        emptyMessage="Nenhum plano de aula encontrado no período."
                      />

                      <RegistrosSelecionaveis
                        titulo="Eventos Culturais"
                        itens={registrosVisiveis(
                          execucao.eventos,
                          form.eventoCulturalIds,
                        )}
                        selecionados={
                          viewOnly ? undefined : form.eventoCulturalIds
                        }
                        onChange={(value) => patch("eventoCulturalIds", value)}
                        emptyMessage="Nenhum evento encontrado no período."
                      />
                    </div>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="colaboradores"
                ref={(node) => {
                  sectionsRef.current.colaboradores = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={Users}
                  title="Colaboradores"
                  description="Confira e selecione as pessoas vinculadas ao projeto que participaram da execução considerada nesta prestação."
                >
                  <DadosAutomaticosHint className="mb-4" />

                  <div className="space-y-5">
                    <RegistrosSelecionaveis
                      titulo="Colaboradores"
                      itens={registrosVisiveis(
                        execucao?.colaboradores ?? [],
                        form.colaboradorIds,
                      )}
                      selecionados={viewOnly ? undefined : form.colaboradorIds}
                      onChange={(value) => patch("colaboradorIds", value)}
                      emptyMessage="Nenhum colaborador foi encontrado."
                    />
                  </div>
                </FormSectionCard>
              </div>

              <div
                id="participacao"
                ref={(node) => {
                  sectionsRef.current.participacao = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={BarChart3}
                  title="Participação e Frequência"
                  description="Acompanhe os dados de participação e frequência consolidados a partir dos registros selecionados para esta prestação."
                >
                  <DadosAutomaticosHint className="mb-4" />

                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryStatCard
                      title="Pessoas Únicas"
                      value={execucao?.participacao.pessoasUnicas ?? 0}
                      icon={Users}
                      variant="info"
                    />

                    <SummaryStatCard
                      title="Participantes"
                      value={execucao?.participacao.participantes ?? 0}
                      icon={Users}
                      variant="info"
                    />

                    <SummaryStatCard
                      title="Presenças Registradas"
                      value={execucao?.participacao.presencasRegistradas ?? 0}
                      icon={CheckCircle2}
                      variant="success"
                    />

                    <SummaryStatCard
                      title="Frequência Média"
                      value={execucao?.participacao.frequenciaMedia ?? "—"}
                      icon={BarChart3}
                      variant="neutral"
                    />

                    <SummaryStatCard
                      title="Vagas Ofertadas"
                      value={execucao?.participacao.vagasOfertadas ?? 0}
                      icon={Users}
                      variant="warning"
                    />

                    <SummaryStatCard
                      title="Turmas"
                      value={execucao?.participacao.turmasConsideradas ?? 0}
                      icon={ClipboardList}
                    />

                    <SummaryStatCard
                      title="Atividades"
                      value={execucao?.participacao.atividadesConsideradas ?? 0}
                      icon={ClipboardList}
                    />
                  </div>

                  {!!execucao?.participacao.detalhe.length && (
                    <details className="mt-4 rounded-[14px] border border-border/60 bg-card/60 px-3.5 py-2.5 supports-[backdrop-filter]:bg-card/50">
                      <summary className="cursor-pointer text-[12.5px] font-medium text-foreground">
                        Detalhar por atividade
                      </summary>

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/60">
                              {[
                                "Atividade",
                                "Presenças",
                                "Presentes",
                                "Frequência",
                              ].map((titulo) => (
                                <th
                                  key={titulo}
                                  className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                  {titulo}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {execucao.participacao.detalhe.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-border/40 last:border-0"
                              >
                                <td className="px-3 py-2 text-[12.5px] text-foreground">
                                  {item.atividade}
                                </td>

                                <td className="px-3 py-2 text-[12.5px] text-muted-foreground">
                                  {item.presencas}
                                </td>

                                <td className="px-3 py-2 text-[12.5px] text-muted-foreground">
                                  {item.presentes}
                                </td>

                                <td className="px-3 py-2 text-[12.5px] font-medium text-foreground">
                                  {item.frequencia}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="metas"
                ref={(node) => {
                  sectionsRef.current.metas = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={Target}
                  title="Metas e Cumprimento"
                  description="Acompanhe o resultado das metas do projeto e confira o percentual e a situação de cumprimento registrados para cada uma."
                >
                  <DadosAutomaticosHint
                    className="mb-4"
                    text="Somente leitura — atualize os dados no módulo Cumprimento de Meta."
                  />

                  {!execucao?.metas.length ? (
                    <p className="rounded-[12px] border border-dashed border-border/70 bg-muted/25 px-3.5 py-3 text-[12.5px] text-muted-foreground">
                      Nenhuma meta cadastrada para este projeto.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-[14px] border border-border/70 bg-card/55 supports-[backdrop-filter]:bg-card/45">
                      {execucao.metas.map((meta) => (
                        <div
                          key={meta.id}
                          className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">
                              {meta.titulo}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {meta.descricao}
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
                            <StatusPill
                              status={meta.situacao}
                              context="prestacao-contas"
                              ariaLabelPrefix="Cumprimento da meta"
                            />

                            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                              {meta.percentualExecutado == null
                                ? "—"
                                : `${meta.percentualExecutado}%`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="evidencias"
                ref={(node) => {
                  sectionsRef.current.evidencias = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={Files}
                  title="Evidências da Execução"
                  description="Consulte os registros que comprovam a realização das ações e ajudam a demonstrar os resultados apresentados nesta prestação."
                >
                  <DadosAutomaticosHint
                    className="mb-4"
                    text="Somente leitura — o envio de arquivos permanece no módulo Evidências."
                  />

                  {execucao?.evidencias.total ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryStatCard
                          title="Total de Evidências"
                          value={execucao.evidencias.total}
                          icon={Files}
                        />

                        <SummaryStatCard
                          title="Metas com Evidência"
                          value={execucao.evidencias.metasComEvidencia}
                          icon={Target}
                          variant="success"
                        />

                        <SummaryStatCard
                          title="Metas sem Evidência"
                          value={execucao.evidencias.metasSemEvidencia}
                          icon={Target}
                          variant="warning"
                        />

                        <SummaryStatCard
                          title="Atividades com Evidência"
                          value={execucao.evidencias.atividadesComEvidencia}
                          icon={ClipboardList}
                        />
                      </div>

                      <ul className="mt-4 space-y-2">
                        {execucao.evidencias.itens.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-[12px] border border-border/60 bg-card/60 px-3 py-2.5 supports-[backdrop-filter]:bg-card/50"
                          >
                            <p className="text-[13px] font-medium leading-snug text-foreground">
                              {item.titulo}
                            </p>

                            <p className="mt-0.5 text-[12px] text-muted-foreground">
                              {item.tipo} · {item.vinculo} · {item.relacionado}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-border/70 bg-muted/25 px-3.5 py-3">
                      <p className="text-[12.5px] text-muted-foreground">
                        Nenhuma evidência relacionada foi encontrada.
                      </p>
                    </div>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="financeiro"
                ref={(node) => {
                  sectionsRef.current.financeiro = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={Wallet}
                  title="Execução Financeira"
                  description="Consolide os cadastros e movimentações financeiras reais relacionados ao projeto e ao período da prestação."
                >
                  <DadosAutomaticosHint className="mb-4" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryStatCard
                      title="A receber"
                      value={formatMoeda(
                        execucao?.financeiro.valorAReceber ?? 0,
                      )}
                      icon={Wallet}
                    />

                    <SummaryStatCard
                      title="Recebido"
                      value={formatMoeda(
                        execucao?.financeiro.valorRecebido ?? 0,
                      )}
                      icon={Wallet}
                      variant="info"
                    />

                    <SummaryStatCard
                      title="Em aberto"
                      value={formatMoeda(
                        (execucao?.financeiro.valorAReceber ?? 0) -
                          (execucao?.financeiro.valorRecebido ?? 0),
                      )}
                      icon={Wallet}
                      variant="success"
                    />

                    <SummaryStatCard
                      title="Total Pago"
                      value={formatMoeda(execucao?.financeiro.totalPago ?? 0)}
                      icon={Wallet}
                    />

                    <SummaryStatCard
                      title="Total Pendente"
                      value={formatMoeda(
                        execucao?.financeiro.totalPendente ?? 0,
                      )}
                      icon={Wallet}
                      variant="warning"
                    />
                  </div>

                  {!!execucao?.financeiro.registros.length && (
                    <div className="mt-4 overflow-x-auto rounded-[14px] border border-border/70 bg-card/55 supports-[backdrop-filter]:bg-card/45">
                      <table className="w-full min-w-[420px]">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/35">
                            {[
                              "Cadastro financeiro",
                              "Registros",
                              "Valor no período",
                            ].map((titulo) => (
                              <th
                                key={titulo}
                                className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                              >
                                {titulo}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {execucao.financeiro.registros.map((registro) => (
                            <tr
                              key={registro.tipo}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="px-4 py-2.5">
                                <StatusPill
                                  status={registro.tipo}
                                  ariaLabelPrefix="Cadastro financeiro"
                                />
                              </td>

                              <td className="whitespace-nowrap px-4 py-2.5 text-[13px] tabular-nums text-foreground">
                                {registro.quantidade}
                              </td>

                              <td className="whitespace-nowrap px-4 py-2.5 text-[13px] tabular-nums text-foreground">
                                {registro.valor > 0
                                  ? formatMoeda(registro.valor)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </FormSectionCard>
              </div>

              <div
                id="avaliacao"
                ref={(node) => {
                  sectionsRef.current.avaliacao = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={PenLine}
                  title="Avaliação da Execução"
                  description="Registre como o projeto foi executado, as situações encontradas durante sua realização e os principais resultados alcançados."
                >
                  <div className="grid gap-4">
                    {[
                      [
                        "descricaoExecucao",
                        "Descrição da Execução",
                        "Descreva como as ações foram executadas.",
                        "Descreva como o projeto foi realizado na prática, considerando as principais ações desenvolvidas durante sua execução.",
                      ],
                      [
                        "diferencasPlanejadoRealizado",
                        "Diferenças entre planejado e realizado",
                        "Descreva alterações relevantes.",
                        "Informe o que foi realizado de forma diferente do que havia sido planejado inicialmente, incluindo alterações de atividades, prazos, público, locais ou outras mudanças relevantes.",
                      ],
                      [
                        "dificuldadesEncontradas",
                        "Dificuldades Encontradas",
                        "Registre os desafios enfrentados.",
                        "Informe as principais dificuldades ou situações que afetaram a execução do projeto.",
                      ],
                      [
                        "providenciasAdotadas",
                        "Providências Adotadas",
                        "Informe as medidas tomadas.",
                        "Descreva as medidas adotadas para resolver ou reduzir as dificuldades encontradas durante a execução.",
                      ],
                      [
                        "resultadosAlcancados",
                        "Resultados Alcançados",
                        "Apresente os resultados observados no período.",
                        "Descreva os principais resultados obtidos com a execução do projeto, considerando o que foi efetivamente realizado e alcançado.",
                      ],
                      [
                        "avaliacaoPublicoAlcancado",
                        "Avaliação do público alcançado",
                        "Informe o alcance e a avaliação do público.",
                        "Descreva como foi o alcance do público previsto e, quando houver informações disponíveis, como o público recebeu ou avaliou as ações realizadas.",
                      ],
                    ].map(([key, label, placeholder, tooltip]) => (
                      <div key={key}>
                        <FieldLabel htmlFor={key} tooltip={tooltip}>
                          {label}
                        </FieldLabel>

                        {viewOnly ? (
                          readOnly(form[key as keyof FormState] as string)
                        ) : (
                          <Textarea
                            id={key}
                            value={form[key as keyof FormState] as string}
                            onChange={(event) =>
                              patch(
                                key as keyof FormState,
                                event.target.value as never,
                              )
                            }
                            placeholder={placeholder}
                            rows={4}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </FormSectionCard>
              </div>

              <div
                id="conclusao"
                ref={(node) => {
                  sectionsRef.current.conclusao = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={FileCheck2}
                  title="Considerações Finais"
                  description="Registre os produtos gerados, como foram disponibilizados ao público e as informações finais relevantes sobre a execução."
                >
                  <div className="space-y-5">
                    <div>
                      <FieldLabel
                        htmlFor="produtosGerados"
                        tooltip="Selecione os produtos que foram efetivamente gerados durante a execução do projeto."
                      >
                        Produtos Gerados
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(
                          form.produtosGerados
                            .map(produtoGeradoLabel)
                            .join(", "),
                        )
                      ) : (
                        <FormMultiSelect
                          id="produtosGerados"
                          options={produtoGeradoOptions}
                          value={form.produtosGerados}
                          onChange={(value) => patch("produtosGerados", value)}
                          placeholder="Selecione os produtos gerados"
                          searchPlaceholder="Pesquisar produto..."
                          emptyMessage="Nenhum produto encontrado."
                        />
                      )}
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="outrosProdutosGerados"
                        tooltip="Informe outros produtos gerados durante a execução que não estejam disponíveis para seleção no campo anterior."
                      >
                        Outros Produtos Gerados
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(form.outrosProdutosGerados)
                      ) : (
                        <Textarea
                          id="outrosProdutosGerados"
                          value={form.outrosProdutosGerados}
                          onChange={(event) =>
                            patch("outrosProdutosGerados", event.target.value)
                          }
                          rows={3}
                        />
                      )}
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="disponibilizacaoProdutosPublico"
                        tooltip="Informe de que forma os produtos gerados foram disponibilizados ou apresentados ao público, quando aplicável."
                      >
                        Disponibilização dos produtos ao público
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(form.disponibilizacaoProdutosPublico)
                      ) : (
                        <Textarea
                          id="disponibilizacaoProdutosPublico"
                          value={form.disponibilizacaoProdutosPublico}
                          onChange={(event) =>
                            patch(
                              "disponibilizacaoProdutosPublico",
                              event.target.value,
                            )
                          }
                          rows={3}
                        />
                      )}
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor="consideracoesFinais"
                        tooltip="Registre informações finais importantes sobre a execução ou os resultados do projeto que ainda não tenham sido apresentadas nos campos anteriores."
                      >
                        Considerações Finais
                      </FieldLabel>

                      {viewOnly ? (
                        readOnly(form.consideracoesFinais)
                      ) : (
                        <Textarea
                          id="consideracoesFinais"
                          value={form.consideracoesFinais}
                          onChange={(event) =>
                            patch("consideracoesFinais", event.target.value)
                          }
                          rows={3}
                        />
                      )}
                    </div>
                  </div>
                </FormSectionCard>
              </div>

              <div
                id="situacao"
                ref={(node) => {
                  sectionsRef.current.situacao = node;
                }}
                className="scroll-mt-24"
              >
                <FormSectionCard
                  icon={ClipboardCheck}
                  title="Situação da Prestação"
                  description="Registre a entrega da prestação e acompanhe sua situação. Quando houver análise, informe também os dados recebidos após a avaliação."
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel
                          htmlFor="dataEntrega"
                          tooltip="Informe a data em que a prestação de contas foi efetivamente entregue ou enviada para análise."
                        >
                          Data de Entrega
                        </FieldLabel>

                        {viewOnly ? (
                          readOnly(form.dataEntrega || "")
                        ) : (
                          <Input
                            id="dataEntrega"
                            type="date"
                            value={form.dataEntrega || ""}
                            onChange={(event) =>
                              patch("dataEntrega", event.target.value)
                            }
                          />
                        )}
                      </div>

                      <div>
                        <FieldLabel
                          htmlFor="status"
                          tooltip="Informe a situação atual da prestação de contas conforme sua etapa de entrega ou análise."
                        >
                          Situação da Prestação
                        </FieldLabel>

                        {viewOnly ? (
                          <StatusPill
                            status={statusPrestacaoContasLabel(
                              form.statusPrestacaoContas,
                            )}
                            context="prestacao-contas"
                          />
                        ) : (
                          <Select
                            value={form.statusPrestacaoContas}
                            onValueChange={(value) =>
                              patch("statusPrestacaoContas", value)
                            }
                          >
                            <SelectTrigger id="status">
                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                              {statusPrestacaoContasOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {situacaoIndicaAnalise(form.statusPrestacaoContas) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel
                            htmlFor="dataAnalise"
                            tooltip="Informe a data em que a prestação de contas foi analisada."
                          >
                            Data da análise
                          </FieldLabel>

                          {viewOnly ? (
                            readOnly(form.dataAnalise || "")
                          ) : (
                            <Input
                              id="dataAnalise"
                              type="date"
                              value={form.dataAnalise || ""}
                              onChange={(event) =>
                                patch("dataAnalise", event.target.value)
                              }
                            />
                          )}
                        </div>

                        <div>
                          <FieldLabel
                            htmlFor="parecer"
                            tooltip="Registre o parecer ou resultado informado após a análise da prestação de contas."
                          >
                            Parecer da prestação
                          </FieldLabel>

                          {viewOnly ? (
                            readOnly(form.parecerPrestacaoContas)
                          ) : (
                            <Textarea
                              id="parecer"
                              value={form.parecerPrestacaoContas}
                              onChange={(event) =>
                                patch(
                                  "parecerPrestacaoContas",
                                  event.target.value,
                                )
                              }
                              rows={3}
                            />
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel
                            htmlFor="observacaoAnalise"
                            tooltip="Registre informações complementares relacionadas à análise da prestação, como orientações, observações ou apontamentos recebidos."
                          >
                            Observação da análise
                          </FieldLabel>

                          {viewOnly ? (
                            readOnly(form.observacaoAnalise)
                          ) : (
                            <Textarea
                              id="observacaoAnalise"
                              value={form.observacaoAnalise}
                              onChange={(event) =>
                                patch("observacaoAnalise", event.target.value)
                              }
                              rows={3}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FormSectionCard>
              </div>

              {!viewOnly && (
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 w-full px-4 sm:w-auto"
                    onClick={() => navigate("/prestacao-contas")}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="glassPrimary"
                    className="h-9 w-full px-5 sm:w-auto"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </fieldset>
          </form>
        </div>
      </div>
      <WikiFloatingButton
        pageTitle="Prestação de contas"
        sections={[
          {
            title: "Registros automáticos",
            content:
              "Atividades, turmas, eventos, participação e os cadastros financeiros são consolidados a partir dos dados cadastrados.",
          },
          {
            title: "Seleção do período",
            content:
              "Escolha apenas os registros que representam a execução no período da prestação.",
          },
          {
            title: "Metas",
            content:
              "O cumprimento das metas é registrado no módulo próprio e fica vinculado à prestação.",
          },
        ]}
      />
    </AppLayout>
  );
}

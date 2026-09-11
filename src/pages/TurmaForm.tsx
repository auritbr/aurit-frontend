import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  BookOpen,
  CalendarClock,
  Plus,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
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
import { MultiSelect } from "@/components/MultiSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getImportConfigForPath } from "@/config/importacoes";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  buildTurmaPayload,
  createTurma,
  criarHorarioTurma,
  diaLabel,
  diasSemana,
  getAtividadesOptions,
  getColaboradoresOptions,
  getTurmaById,
  horarioTurmaChave,
  niveisTurma,
  normalizarHorariosTurma,
  statusTurma,
  updateTurma,
  type AtividadeOption,
  type ColaboradorOption,
  type HorarioTurma,
} from "@/data/turmas";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

interface FormState {
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas: string;
  diaAtividade: string;
  horarios: HorarioTurma[];
  status: string;
  nivelTurma: string;
  atividadeId: string;
  colaboradores: string[];
}

interface TurmaCarregada {
  nomeTurma?: string | null;
  descricaoTurma?: string | null;
  horarioInicio?: string | null;
  horarioFim?: string | null;
  quantidadeVagas?: number | string | null;
  diaAtividade?: string | null;
  horarios?: Array<{
    diaAtividade?: string | null;
    horarioInicio?: string | null;
    horarioFim?: string | null;
  }> | null;
  status?: string | null;
  nivelTurma?: string | null;
  atividadeId?: string | number | null;
  atividadeNome?: string | null;
  nomeAtividade?: string | null;
  colaboradoresIds?: Array<string | number>;
}

const SEM_NIVEL_TURMA = "__SEM_NIVEL_TURMA__";

const initial: FormState = {
  nomeTurma: "",
  descricaoTurma: "",
  horarioInicio: "",
  horarioFim: "",
  quantidadeVagas: "",
  diaAtividade: "",
  horarios: [criarHorarioTurma()],
  status: "",
  nivelTurma: "",
  atividadeId: "",
  colaboradores: [],
};

const onlyDigits = (value: string, max = 5) =>
  value.replace(/\D/g, "").slice(0, max);

function getAtividadeNome(
  atividades: AtividadeOption[],
  atividadeId: string,
  turma?: TurmaCarregada | null,
) {
  return (
    atividades.find((atividade) => String(atividade.id) === String(atividadeId))
      ?.nome ||
    turma?.atividadeNome?.trim() ||
    turma?.nomeAtividade?.trim() ||
    `Atividade ${atividadeId}`
  );
}

export default function TurmaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingTurma, setExistingTurma] = useState<TurmaCarregada | null>(
    null,
  );
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setHorario = <K extends keyof Omit<HorarioTurma, "id">>(
    horarioId: string,
    campo: K,
    value: HorarioTurma[K],
  ) =>
    setForm((prev) => ({
      ...prev,
      horarios: prev.horarios.map((horario) =>
        horario.id === horarioId ? { ...horario, [campo]: value } : horario,
      ),
    }));

  const adicionarHorario = () =>
    setForm((prev) => ({
      ...prev,
      horarios: [...prev.horarios, criarHorarioTurma()],
    }));

  const removerHorario = (horarioId: string) =>
    setForm((prev) => {
      const horarios = prev.horarios.filter(
        (horario) => horario.id !== horarioId,
      );
      return {
        ...prev,
        horarios: horarios.length > 0 ? horarios : [criarHorarioTurma()],
      };
    });

  const atividadeSelectValue =
    form.atividadeId || String(existingTurma?.atividadeId ?? "");

  const atividadesComFallback = useMemo(() => {
    const options = [...atividades];

    const atividadeId =
      form.atividadeId || String(existingTurma?.atividadeId ?? "");

    if (!atividadeId) return options;

    const existe = options.some(
      (atividade) => String(atividade.id) === String(atividadeId),
    );

    if (existe) return options;

    return [
      ...options,
      {
        id: atividadeId,
        nome: getAtividadeNome(atividades, atividadeId, existingTurma),
      },
    ];
  }, [atividades, form.atividadeId, existingTurma]);

  const colaboradoresComFallback = useMemo(() => {
    const missing = form.colaboradores.filter(
      (idColaborador) =>
        idColaborador &&
        !colaboradores.some(
          (colaborador) => String(colaborador.id) === String(idColaborador),
        ),
    );

    if (missing.length === 0) return colaboradores;

    return [
      ...colaboradores,
      ...missing.map((idColaborador) => ({
        id: idColaborador,
        nome: `Colaborador ${idColaborador}`,
      })),
    ];
  }, [colaboradores, form.colaboradores]);

  useImportFormFill("turmas", setForm);

  useEffect(() => {
    if (!form.diaAtividade && !form.horarioInicio && !form.horarioFim) return;
    const primeiro = form.horarios[0];
    if (
      primeiro &&
      (primeiro.diaAtividade || primeiro.horarioInicio || primeiro.horarioFim)
    )
      return;

    setForm((prev) => ({
      ...prev,
      horarios: [
        criarHorarioTurma({
          diaAtividade: prev.diaAtividade,
          horarioInicio: prev.horarioInicio,
          horarioFim: prev.horarioFim,
        }),
        ...prev.horarios.slice(1),
      ],
    }));
  }, [form.diaAtividade, form.horarioInicio, form.horarioFim, form.horarios]);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const [atividadesData, colaboradoresData, turmaData] =
          await Promise.all([
            getAtividadesOptions(),
            getColaboradoresOptions(),
            id || duplicarId
              ? getTurmaById(Number(id ?? duplicarId))
              : Promise.resolve(null),
          ]);

        if (!active) return;

        setAtividades(atividadesData);
        setColaboradores(colaboradoresData);

        if (turmaData) {
          const turma = turmaData as TurmaCarregada;

          const atividadeId = turma.atividadeId
            ? String(turma.atividadeId)
            : "";

          setExistingTurma(duplicarId ? null : { ...turma, atividadeId });

          setForm({
            nomeTurma: duplicarId
              ? `${turma.nomeTurma ?? "Turma"} (cópia)`
              : (turma.nomeTurma ?? ""),
            descricaoTurma: turma.descricaoTurma ?? "",
            horarioInicio: turma.horarioInicio ?? "",
            horarioFim: turma.horarioFim ?? "",
            quantidadeVagas:
              turma.quantidadeVagas !== null &&
              turma.quantidadeVagas !== undefined
                ? String(turma.quantidadeVagas)
                : "",
            diaAtividade: turma.diaAtividade ?? "",
            horarios: (() => {
              const horarios = normalizarHorariosTurma(turma);
              return horarios.length > 0 ? horarios : [criarHorarioTurma()];
            })(),
            status: turma.status ?? "",
            nivelTurma: turma.nivelTurma ?? "",
            atividadeId,
            colaboradores: (turma.colaboradoresIds ?? []).map(String),
          });
        } else {
          setExistingTurma(null);
          setForm(initial);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);

        if (id) navigate("/turmas");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [duplicarId, id, navigate]);

  function getFormComAtividade(): FormState {
    return {
      ...form,
      atividadeId: atividadeSelectValue,
    };
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (visualizando) return;

    const formComAtividade = getFormComAtividade();

    if (!formComAtividade.nomeTurma.trim()) {
      toast.error("Informe o nome da turma.");
      return;
    }

    if (!formComAtividade.descricaoTurma.trim()) {
      toast.error("Informe a descrição da turma.");
      return;
    }

    if (formComAtividade.horarios.length === 0) {
      toast.error("Informe ao menos um dia e horário para a turma.");
      return;
    }

    const horariosVistos = new Set<string>();
    for (let index = 0; index < formComAtividade.horarios.length; index += 1) {
      const horario = formComAtividade.horarios[index];
      const posicao = `${index + 1}º horário`;

      if (!horario.diaAtividade) {
        toast.error(`Selecione o dia da semana do ${posicao}.`);
        return;
      }
      if (!horario.horarioInicio) {
        toast.error(`Informe o horário de início do ${posicao}.`);
        return;
      }
      if (!horario.horarioFim) {
        toast.error(`Informe o horário de término do ${posicao}.`);
        return;
      }
      if (horario.horarioFim <= horario.horarioInicio) {
        toast.error(
          `No ${posicao} (${diaLabel(horario.diaAtividade)}), o horário de término deve ser posterior ao de início.`,
        );
        return;
      }

      const chave = horarioTurmaChave(horario);
      if (horariosVistos.has(chave)) {
        toast.error("Este dia e horário já foram adicionados à turma.");
        return;
      }
      horariosVistos.add(chave);

      const sobreposto = formComAtividade.horarios
        .slice(0, index)
        .some(
          (anterior) =>
            anterior.diaAtividade === horario.diaAtividade &&
            anterior.horarioInicio < horario.horarioFim &&
            horario.horarioInicio < anterior.horarioFim,
        );
      if (sobreposto) {
        toast.error(
          `Existem horários sobrepostos na ${diaLabel(horario.diaAtividade)}.`,
        );
        return;
      }
    }

    if (!formComAtividade.status) {
      toast.error("Selecione o status da turma.");
      return;
    }

    if (!formComAtividade.atividadeId) {
      toast.error("Selecione a atividade.");
      return;
    }

    if (formComAtividade.colaboradores.length === 0) {
      toast.error("Vincule ao menos um colaborador à turma.");
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      const payload = buildTurmaPayload(formComAtividade);

      if (editando && id) {
        await updateTurma(Number(id), payload);
        toast.success("Turma atualizada com sucesso.");
      } else {
        await createTurma(payload);
        emitJourneyNextStep();
        toast.success("Turma salva com sucesso.");
      }

      navigate("/turmas");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a turma.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const colaboradoresOptions = colaboradoresComFallback.map((colaborador) =>
    String(colaborador.id),
  );

  const colaboradorLabel = (idColaborador: string) =>
    colaboradoresComFallback.find(
      (colaborador) => String(colaborador.id) === String(idColaborador),
    )?.nome ?? idColaborador;

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/turmas" />

        <ListPageHeader
          title="Turmas"
          tooltip="Nesta página são cadastradas e acompanhadas as turmas vinculadas às atividades dos projetos, com informações sobre identificação, nível, quantidade de vagas, dias e horários de realização, situação atual e equipe responsável. Esses registros ajudam a organizar os participantes, acompanhar os encontros e presenças e apoiar a execução das atividades."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/turmas")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={BookOpen}
              title="Identificação da turma"
              description="Vincule a turma à atividade em que será oferecida e registre as informações que permitem identificá-la e diferenciá-la das demais turmas dessa atividade."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="atividade"
                    required={!visualizando}
                    tooltip="Selecione a atividade à qual esta turma pertence. A turma funciona como um grupo organizado dentro de uma atividade cadastrada."
                  >
                    Atividade
                  </FieldLabel>

                  <Select
                    value={atividadeSelectValue}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("atividadeId", String(value));
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="atividade">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {atividadesComFallback.map((atividade) => (
                        <SelectItem
                          key={String(atividade.id)}
                          value={String(atividade.id)}
                        >
                          {atividade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="nomeTurma"
                    required={!visualizando}
                    tooltip="Informe um nome curto e claro que permita identificar facilmente esta turma dentro da atividade."
                  >
                    Nome da Turma
                  </FieldLabel>

                  <Input
                    id="nomeTurma"
                    value={form.nomeTurma}
                    onChange={(event) => set("nomeTurma", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoTurma"
                    required={!visualizando}
                    tooltip="Descreva as principais características da turma, como perfil dos participantes, faixa etária, forma de organização ou outras informações que ajudem a diferenciá-la."
                  >
                    Descrição da Turma
                  </FieldLabel>

                  <Textarea
                    id="descricaoTurma"
                    value={form.descricaoTurma}
                    onChange={(event) =>
                      set("descricaoTurma", event.target.value)
                    }
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Settings2}
              title="Organização da turma"
              description="Defina como a turma será organizada em relação ao nível dos participantes e à capacidade de atendimento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nivelTurma"
                    tooltip="Selecione o nível da turma quando a atividade estiver organizada por níveis de aprendizagem ou experiência."
                  >
                    Nível da Turma
                  </FieldLabel>

                  <Select
                    value={form.nivelTurma || SEM_NIVEL_TURMA}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("nivelTurma", value === SEM_NIVEL_TURMA ? "" : value);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="nivelTurma">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={SEM_NIVEL_TURMA}>
                        Não se aplica
                      </SelectItem>

                      {niveisTurma.map((nivel) => (
                        <SelectItem key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="quantidadeVagas"
                    tooltip="Informe a quantidade máxima de participantes que poderão fazer parte desta turma, quando houver limite de vagas."
                  >
                    Quantidade de Vagas
                  </FieldLabel>

                  <Input
                    id="quantidadeVagas"
                    value={form.quantidadeVagas}
                    onChange={(event) =>
                      set("quantidadeVagas", onlyDigits(event.target.value))
                    }
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={CalendarClock}
              title="Horários da turma"
              description="Defina a rotina semanal da turma, registrando os dias e períodos em que os encontros acontecem. Adicione outros horários quando houver mais de um dia ou período de funcionamento."
            >
              <TooltipProvider delayDuration={200}>
                <div className="space-y-3">
                  {form.horarios.map((horario, index) => (
                    <div
                      key={horario.id}
                      className="rounded-[14px] border border-border/60 bg-background/50 p-3 backdrop-blur-sm transition-colors hover:border-primary/25 hover:bg-background/70 sm:p-3.5"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                        <div>
                          <FieldLabel
                            htmlFor={`dia-${horario.id}`}
                            required={!visualizando}
                            tooltip="Selecione o dia da semana em que a atividade da turma acontece neste horário."
                          >
                            Dia da Semana
                          </FieldLabel>

                          <Select
                            value={horario.diaAtividade}
                            onValueChange={(value) =>
                              setHorario(horario.id, "diaAtividade", value)
                            }
                            disabled={bloqueado}
                          >
                            <SelectTrigger id={`dia-${horario.id}`}>
                              <SelectValue placeholder="Selecione o dia" />
                            </SelectTrigger>

                            <SelectContent>
                              {diasSemana.map((dia) => (
                                <SelectItem key={dia.value} value={dia.value}>
                                  {dia.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FieldLabel
                            htmlFor={`inicio-${horario.id}`}
                            required={!visualizando}
                            tooltip="Informe o horário em que a atividade da turma começa neste dia."
                          >
                            Horário de Início
                          </FieldLabel>

                          <Input
                            id={`inicio-${horario.id}`}
                            type="time"
                            value={horario.horarioInicio}
                            onChange={(event) =>
                              setHorario(
                                horario.id,
                                "horarioInicio",
                                event.target.value,
                              )
                            }
                            disabled={bloqueado}
                            readOnly={visualizando}
                          />
                        </div>

                        <div>
                          <FieldLabel
                            htmlFor={`fim-${horario.id}`}
                            required={!visualizando}
                            tooltip="Informe o horário em que a atividade da turma termina neste dia."
                          >
                            Horário de Fim
                          </FieldLabel>

                          <Input
                            id={`fim-${horario.id}`}
                            type="time"
                            value={horario.horarioFim}
                            onChange={(event) =>
                              setHorario(
                                horario.id,
                                "horarioFim",
                                event.target.value,
                              )
                            }
                            disabled={bloqueado}
                            readOnly={visualizando}
                          />
                        </div>

                        <div className="flex sm:pb-1">
                          {!visualizando && form.horarios.length > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => removerHorario(horario.id)}
                                  aria-label={`Remover o ${index + 1}º dia e horário`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border/60 bg-background/60 text-muted-foreground backdrop-blur-sm transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </button>
                              </TooltipTrigger>

                              <TooltipContent
                                side="left"
                                className="max-w-[260px] text-xs"
                              >
                                Remover este dia e horário.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!visualizando && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="glassSecondary"
                          onClick={adicionarHorario}
                          className="h-9 gap-2 px-4"
                          disabled={loading || saving}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Adicionar horário
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent
                        side="right"
                        className="max-w-[280px] text-xs"
                      >
                        Adicionar outro dia e horário para esta turma.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </FormSectionCard>

            <FormSectionCard
              icon={Settings2}
              title="Situação da turma"
              description="Indique a situação atual da turma, considerando se está em funcionamento, ainda está em preparação, já foi concluída ou não está mais em funcionamento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required={!visualizando}
                    tooltip="Selecione a situação atual da turma. Ativa indica que está em funcionamento; Pendente, que ainda está em preparação; Concluída, que suas atividades foram encerradas; e Inativa, que não está em funcionamento no momento."
                  >
                    Situação da Turma
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("status", value);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusTurma.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Users}
              title="Equipe responsável"
              description="Identifique os colaboradores que ficarão responsáveis pela condução, pelo apoio e pelo acompanhamento das atividades desta turma."
            >
              <div className="grid grid-cols-1 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="colaboradores"
                    required={!visualizando}
                    tooltip="Selecione os colaboradores responsáveis pela condução, apoio, coordenação ou acompanhamento das atividades desta turma."
                  >
                    Colaboradores
                  </FieldLabel>

                  <div
                    className={
                      visualizando ? "pointer-events-none opacity-80" : ""
                    }
                  >
                    <MultiSelect
                      id="colaboradores"
                      options={colaboradoresOptions}
                      value={form.colaboradores}
                      onChange={(value) => {
                        if (visualizando) return;
                        set("colaboradores", value);
                      }}
                      getOptionLabel={colaboradorLabel}
                    />
                  </div>
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/turmas")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Turmas"
          href="https://www.aurit.com.br/wiki/execucao/turmas"
        />
      </div>
    </AppLayout>
  );
}

function Field({
  children,
  full,
  className,
}: {
  children: ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}

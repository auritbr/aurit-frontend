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
import { CalendarClock, Link2, FileText } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { PageTitle } from "@/components/PageTitle";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
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
import { Switch } from "@/components/ui/switch";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { MultiSelect } from "@/components/MultiSelect";
import { getImportConfigForPath } from "@/config/importacoes";
import { isPlanoAccessDenied } from "@/lib/access";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { nameWithYear } from "@/lib/entityYear";
import {
  buildPlanoAulaPayload,
  createPlanoAula,
  getAtividadesPlanoAulaOptions,
  getColaboradoresPlanoAulaOptions,
  getPlanoAulaById,
  getTurmasPlanoAulaOptions,
  statusPlanoAulaOptions,
  updatePlanoAula,
  type AtividadeOption,
  type ColaboradorOption,
  type PlanoAula,
  type StatusPlanoAula,
  type TurmaOption,
} from "@/data/planosAula";

function salvarProximaAcaoPlanoAula() {
  emitJourneyNextStep();
}

interface FormState {
  id: string;

  nomePlanoAula: string;

  atividadeId: string;
  atividadeNome: string;

  turmaIds: string[];
  turmaNomes: string[];

  colaboradorId: string;
  colaboradorNome: string;

  dataInicio: string;
  dataFim: string;
  aulaReposicao: boolean;
  statusPlanoAula: StatusPlanoAula;

  conteudo: string;
  observacao: string;
}

const initial: FormState = {
  id: "",

  nomePlanoAula: "",

  atividadeId: "",
  atividadeNome: "",

  turmaIds: [],
  turmaNomes: [],

  colaboradorId: "",
  colaboradorNome: "",

  dataInicio: "",
  dataFim: "",
  aulaReposicao: false,
  statusPlanoAula: "PLANEJADO",

  conteudo: "",
  observacao: "",
};

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }

    return "";
  }

  return String(value);
}

function normalizeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return uniqueStringArray(
    values.map((value) => normalizeId(value)).filter(Boolean),
  );
}

function uniqueStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map(String).filter(Boolean)));
}

function pickText(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeStatusPlanoAula(value: unknown): StatusPlanoAula {
  const status = pickText(value);

  return statusPlanoAulaOptions.some((option) => option.value === status)
    ? (status as StatusPlanoAula)
    : "PLANEJADO";
}

function getTurmaIdsFromRaw(raw: Record<string, unknown>): string[] {
  const ids = [
    ...normalizeIds(raw.turmaIds),
    ...(Array.isArray(raw.turmas)
      ? raw.turmas.map((turma) => normalizeId(asRecord(turma).id))
      : []),
    normalizeId(raw.turmaId ?? raw.turma),
  ];

  return uniqueStringArray(ids);
}

function getTurmaNomesFromRaw(raw: Record<string, unknown>): string[] {
  const nomesFromArray = Array.isArray(raw.turmas)
    ? raw.turmas
        .map((turma) => {
          const turmaRecord = asRecord(turma);
          return pickText(turmaRecord.nomeTurma, turmaRecord.nome);
        })
        .filter(Boolean)
    : [];
  const turma = asRecord(raw.turma);

  const nomes = [
    ...(Array.isArray(raw.turmaNomes) ? raw.turmaNomes.filter(Boolean) : []),
    ...nomesFromArray,
    pickText(raw.turmaNome, turma.nomeTurma, turma.nome),
  ];

  return nomes.filter(Boolean);
}

function mapPlanoAulaToForm(planoAula: PlanoAula): FormState {
  const raw = planoAula as unknown as Record<string, unknown>;
  const atividade = asRecord(raw.atividade);
  const colaborador = asRecord(raw.colaborador);
  const agente = asRecord(colaborador.agente);

  const atividadeId = normalizeId(raw.atividadeId ?? raw.atividade);
  const turmaIds = getTurmaIdsFromRaw(raw);
  const turmaNomes = getTurmaNomesFromRaw(raw);
  const colaboradorId = normalizeId(raw.colaboradorId ?? raw.colaborador);

  const atividadeNome = pickText(
    raw.atividadeNome,
    atividade.nomeAtividade,
    atividade.titulo,
    atividade.nome,
  );

  const colaboradorNome = pickText(
    raw.colaboradorNome,
    colaborador.nome,
    colaborador.nomeCompleto,
    agente.nome,
    agente.nomeCompleto,
  );

  return {
    id: normalizeId(raw.id),

    nomePlanoAula: pickText(raw.nomePlanoAula),

    atividadeId,
    atividadeNome,

    turmaIds,
    turmaNomes,

    colaboradorId,
    colaboradorNome,

    dataInicio: pickText(raw.dataInicio),
    dataFim: pickText(raw.dataFim),
    aulaReposicao: Boolean(raw.aulaReposicao),
    statusPlanoAula: normalizeStatusPlanoAula(raw.statusPlanoAula),

    conteudo: pickText(raw.conteudo),
    observacao: pickText(raw.observacao),
  };
}

function getAtividadeNome(
  atividades: AtividadeOption[],
  atividadeId: string,
  fallback?: string,
) {
  if (!atividadeId) return "";

  return (
    fallback ||
    atividades.find((atividade) => String(atividade.id) === String(atividadeId))
      ?.nomeAtividade ||
    `Atividade ${atividadeId}`
  );
}

function getTurmaNome(
  turmas: TurmaOption[],
  turmaId: string,
  fallback?: string,
) {
  if (!turmaId) return "";

  return (
    fallback ||
    turmas.find((turma) => String(turma.id) === String(turmaId))?.nomeTurma ||
    `Turma ${turmaId}`
  );
}

function getColaboradorNome(
  colaboradores: ColaboradorOption[],
  colaboradorId: string,
  fallback?: string,
) {
  if (!colaboradorId) return "";

  return (
    fallback ||
    colaboradores.find(
      (colaborador) => String(colaborador.id) === String(colaboradorId),
    )?.nome ||
    `Colaborador ${colaboradorId}`
  );
}

function formToPlanoAula(form: FormState): PlanoAula {
  return {
    id: form.id,

    nomePlanoAula: form.nomePlanoAula,

    atividadeId: form.atividadeId,
    atividadeNome: form.atividadeNome,

    turmaId: form.turmaIds[0] || undefined,
    turmaNome: form.turmaNomes[0] || undefined,
    turmaIds: form.turmaIds,
    turmaNomes: form.turmaNomes,

    colaboradorId: form.colaboradorId,
    colaboradorNome: form.colaboradorNome,

    dataInicio: form.dataInicio,
    dataFim: form.dataFim || undefined,
    aulaReposicao: form.aulaReposicao,
    statusPlanoAula: form.statusPlanoAula,

    conteudo: form.conteudo,
    observacao: form.observacao,
  };
}

export default function PlanoAulaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingPlanoAula, setExistingPlanoAula] = useState<PlanoAula | null>(
    null,
  );
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const atividadeOriginalId = String(existingPlanoAula?.atividadeId ?? "");
  const atividadeAtualId = form.atividadeId || atividadeOriginalId;
  const atividadeFoiAlterada = Boolean(
    atividadeOriginalId &&
      form.atividadeId &&
      String(form.atividadeId) !== String(atividadeOriginalId),
  );

  const atividadeSelectValue = atividadeAtualId;

  const turmaIdsSelecionados = uniqueStringArray(
    form.turmaIds.length
      ? form.turmaIds
      : !atividadeFoiAlterada && existingPlanoAula?.turmaIds?.length
        ? existingPlanoAula.turmaIds
        : !atividadeFoiAlterada && existingPlanoAula?.turmaId
          ? [existingPlanoAula.turmaId]
          : [],
  );

  const colaboradorSelectValue =
    form.colaboradorId || String(existingPlanoAula?.colaboradorId ?? "");

  const atividadesOptions = useMemo(() => {
    const options = [...atividades];

    const atividadeId = atividadeAtualId;

    const atividadeNome = getAtividadeNome(
      atividades,
      atividadeId,
      form.atividadeNome || existingPlanoAula?.atividadeNome,
    );

    if (
      atividadeId &&
      !options.some((atividade) => String(atividade.id) === String(atividadeId))
    ) {
      options.unshift({
        id: atividadeId,
        nomeAtividade: atividadeNome,
      });
    }

    return options;
  }, [atividades, atividadeAtualId, form.atividadeNome, existingPlanoAula]);

  const turmasDaAtividade = useMemo(() => {
    const atividadeId = atividadeAtualId;

    if (!atividadeId) return [];

    const atividade = atividadesOptions.find(
      (item) => String(item.id) === String(atividadeId),
    );

    return turmas
      .filter((turma) => String(turma.atividadeId) === String(atividadeId))
      .map((turma) => ({
        ...turma,
        nomeTurma: nameWithYear(turma.nomeTurma, atividade?.nomeAtividade),
      }));
  }, [turmas, atividadeAtualId, atividadesOptions]);

  const turmasOptions = useMemo(() => {
    const options = [...turmasDaAtividade];

    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

    const selectedIds = turmaIdsSelecionados;

    selectedIds.forEach((turmaId, index) => {
      if (!turmaId) return;

      if (!options.some((turma) => String(turma.id) === String(turmaId))) {
        options.unshift({
          id: turmaId,
          nomeTurma: getTurmaNome(
            turmas,
            turmaId,
            form.turmaNomes[index] || existingPlanoAula?.turmaNomes?.[index],
          ),
          atividadeId,
        });
      }
    });

    return options;
  }, [
    turmas,
    turmasDaAtividade,
    form.turmaNomes,
    form.atividadeId,
    turmaIdsSelecionados,
    existingPlanoAula,
  ]);

  const colaboradoresOptions = useMemo(() => {
    const options = [...colaboradores];

    const colaboradorId =
      form.colaboradorId || String(existingPlanoAula?.colaboradorId ?? "");

    const colaboradorNome = getColaboradorNome(
      colaboradores,
      colaboradorId,
      form.colaboradorNome || existingPlanoAula?.colaboradorNome,
    );

    if (
      colaboradorId &&
      !options.some(
        (colaborador) => String(colaborador.id) === String(colaboradorId),
      )
    ) {
      options.unshift({
        id: colaboradorId,
        nome: colaboradorNome,
      });
    }

    return options;
  }, [
    colaboradores,
    form.colaboradorId,
    form.colaboradorNome,
    existingPlanoAula,
  ]);

  const getNomeTurmaPorId = (turmaId: string) => {
    const index = turmaIdsSelecionados.findIndex(
      (idTurma) => String(idTurma) === String(turmaId),
    );

    return getTurmaNome(
      turmasOptions,
      turmaId,
      form.turmaNomes[index] ||
        existingPlanoAula?.turmas?.find(
          (turma) => String(turma.id) === String(turmaId),
        )?.nomeTurma ||
        existingPlanoAula?.turmaNomes?.[index],
    );
  };

  const turmasSelecionadasTexto = turmaIdsSelecionados
    .map((turmaId) => getNomeTurmaPorId(turmaId))
    .filter(Boolean)
    .join(", ");

  const turmasMultiSelectOptions = useMemo(
    () => turmasOptions.map((turma) => String(turma.id)),
    [turmasOptions],
  );

  const turmaLabel = (turmaId: string) =>
    turmasOptions.find((turma) => String(turma.id) === String(turmaId))
      ?.nomeTurma ?? turmaId;

  useImportFormFill("planos-aula", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const [atividadesData, turmasData, colaboradoresData, planoAulaData] =
          await Promise.all([
            getAtividadesPlanoAulaOptions(),
            getTurmasPlanoAulaOptions(),
            getColaboradoresPlanoAulaOptions(),
            id || duplicarId
              ? getPlanoAulaById(Number(id ?? duplicarId))
              : Promise.resolve(null),
          ]);

        if (!active) return;

        setAtividades(atividadesData);
        setTurmas(turmasData);
        setColaboradores(colaboradoresData);

        if (planoAulaData) {
          const mapped = mapPlanoAulaToForm(planoAulaData);

          const atividadeId =
            mapped.atividadeId || String(planoAulaData.atividadeId ?? "");

          const turmaIds = mapped.turmaIds.length
            ? mapped.turmaIds
            : planoAulaData.turmaId
              ? [planoAulaData.turmaId]
              : [];

          const colaboradorId =
            mapped.colaboradorId || String(planoAulaData.colaboradorId ?? "");

          const atividadeNome = getAtividadeNome(
            atividadesData,
            atividadeId,
            mapped.atividadeNome || planoAulaData.atividadeNome,
          );

          const turmaNomes = turmaIds.map((turmaId, index) =>
            getTurmaNome(
              turmasData,
              turmaId,
              mapped.turmaNomes[index] || planoAulaData.turmaNomes?.[index],
            ),
          );

          const colaboradorNome = getColaboradorNome(
            colaboradoresData,
            colaboradorId,
            mapped.colaboradorNome || planoAulaData.colaboradorNome,
          );

          const planoAulaNormalizado: PlanoAula = {
            ...planoAulaData,
            id: mapped.id,
            atividadeId,
            atividadeNome,
            turmaId: turmaIds[0] || undefined,
            turmaNome: turmaNomes[0] || undefined,
            turmaIds,
            turmaNomes,
            colaboradorId,
            colaboradorNome,
          };

          setExistingPlanoAula(planoAulaNormalizado);

          setForm({
            ...mapped,
            id: duplicarId ? "" : mapped.id,
            nomePlanoAula: duplicarId
              ? `Cópia de ${mapped.nomePlanoAula}`
              : mapped.nomePlanoAula,
            atividadeId,
            atividadeNome,
            turmaIds,
            turmaNomes,
            colaboradorId,
            colaboradorNome,
            dataInicio: duplicarId ? "" : mapped.dataInicio,
            dataFim: duplicarId ? "" : mapped.dataFim,
            aulaReposicao: duplicarId ? false : mapped.aulaReposicao,
            statusPlanoAula: duplicarId ? "PLANEJADO" : mapped.statusPlanoAula,
          });
        } else {
          setExistingPlanoAula(null);
          setForm(initial);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar plano de aula.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        console.error(error);
        toast.error(message);

        if (id) {
          navigate("/planos-aula");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, duplicarId, navigate]);

  function getFormComVinculos(): FormState {
    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

    const turmaIds = turmaIdsSelecionados;

    const colaboradorId =
      form.colaboradorId || String(existingPlanoAula?.colaboradorId ?? "");

    const atividadeSelecionada = atividadesOptions.find(
      (atividade) => String(atividade.id) === String(atividadeId),
    );

    const colaboradorSelecionado = colaboradoresOptions.find(
      (colaborador) => String(colaborador.id) === String(colaboradorId),
    );

    return {
      ...form,

      atividadeId,
      atividadeNome:
        form.atividadeNome ||
        atividadeSelecionada?.nomeAtividade ||
        existingPlanoAula?.atividadeNome ||
        "",

      turmaIds,
      turmaNomes: turmaIds.map((turmaId) => getNomeTurmaPorId(turmaId)),

      colaboradorId,
      colaboradorNome:
        form.colaboradorNome ||
        colaboradorSelecionado?.nome ||
        existingPlanoAula?.colaboradorNome ||
        "",
    };
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

    if (!formComVinculos.nomePlanoAula.trim()) {
      toast.error("Informe o nome do plano de aula.");
      return;
    }

    if (!formComVinculos.atividadeId) {
      toast.error("Selecione a atividade.");
      return;
    }

    if (!formComVinculos.turmaIds.length) {
      toast.error("Selecione pelo menos uma turma.");
      return;
    }

    if (!formComVinculos.colaboradorId) {
      toast.error("Selecione o colaborador responsável.");
      return;
    }

    if (!formComVinculos.dataInicio) {
      toast.error("Informe a data de início.");
      return;
    }

    if (!formComVinculos.statusPlanoAula) {
      toast.error("Selecione o status.");
      return;
    }

    if (!formComVinculos.conteudo.trim()) {
      toast.error("Informe o conteúdo previsto.");
      return;
    }

    if (
      formComVinculos.dataFim &&
      formComVinculos.dataFim < formComVinculos.dataInicio
    ) {
      toast.error("A data de fim não pode ser anterior à data de início.");
      return;
    }

    if (
      formComVinculos.statusPlanoAula === "REALIZADO" &&
      !formComVinculos.dataFim
    ) {
      toast.error("Informe a data de fim quando o plano estiver concluído.");
      return;
    }

    if (
      formComVinculos.statusPlanoAula !== "REALIZADO" &&
      formComVinculos.dataFim
    ) {
      toast.error(
        "Plano com data de fim preenchida deve estar como Concluído.",
      );
      return;
    }

    try {
      setSaving(true);

      const planoAula = formToPlanoAula(formComVinculos);
      const payload = buildPlanoAulaPayload(planoAula);

      if (isEdit && id) {
        await updatePlanoAula(Number(id), payload);
        toast.success("Plano de aula atualizado com sucesso.");
      } else {
        await createPlanoAula(payload);
        salvarProximaAcaoPlanoAula();
        toast.success("Plano de aula criado com sucesso.");
      }

      navigate("/planos-aula");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o plano de aula.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

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
        <BackButton to="/planos-aula" />

        <PageTitle
          title={
            visualizando
              ? "Planos de Aula"
              : isEdit
                ? "Planos de Aula"
                : "Planos de Aula"
          }
          tooltip="Nesta página são cadastrados e organizados os planos de aula vinculados às atividades e turmas, com informações sobre conteúdo previsto, período de realização, situação e colaborador responsável. Esses registros ajudam a planejar o que será desenvolvido nos encontros e a acompanhar a realização das aulas."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/planos-aula")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={Link2}
              title="Identificação e vínculo"
              description="Estabeleça o contexto em que este plano de aula será aplicado, vinculando-o à atividade e às turmas correspondentes e identificando o responsável por sua condução."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="atividade"
                    required={!visualizando}
                    tooltip="Informe a atividade à qual este plano de aula está relacionado."
                  >
                    Atividade
                  </FieldLabel>

                  <Select
                    value={atividadeSelectValue || undefined}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      const atividadeSelecionada = atividadesOptions.find(
                        (atividade) => String(atividade.id) === String(value),
                      );

                      setForm((prev) => {
                        const atividadeAnterior =
                          prev.atividadeId ||
                          String(existingPlanoAula?.atividadeId ?? "");

                        const mudouAtividade =
                          Boolean(atividadeAnterior) &&
                          String(atividadeAnterior) !== String(value);

                        return {
                          ...prev,
                          atividadeId: value,
                          atividadeNome:
                            atividadeSelecionada?.nomeAtividade ?? "",
                          turmaIds: mudouAtividade ? [] : prev.turmaIds,
                          turmaNomes: mudouAtividade ? [] : prev.turmaNomes,
                        };
                      });
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="atividade">
                      <SelectValue placeholder="Selecione a atividade" />
                    </SelectTrigger>

                    <SelectContent>
                      {atividadesOptions.map((atividade) => (
                        <SelectItem key={atividade.id} value={atividade.id}>
                          {atividade.nomeAtividade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="turmas"
                    required={!visualizando}
                    tooltip="Informe as turmas nas quais este plano de aula será aplicado. É possível selecionar mais de uma turma vinculada à atividade."
                  >
                    Turmas
                  </FieldLabel>

                  {!atividadeSelectValue && (
                    <p className="rounded-md border border-input bg-background px-3 py-3 text-sm text-muted-foreground">
                      Selecione uma atividade primeiro para visualizar as turmas
                      disponíveis.
                    </p>
                  )}

                  {atividadeSelectValue && turmasOptions.length === 0 && (
                    <p className="rounded-md border border-input bg-background px-3 py-3 text-sm text-muted-foreground">
                      Nenhuma turma cadastrada para a atividade selecionada.
                    </p>
                  )}

                  {atividadeSelectValue && turmasOptions.length > 0 && (
                    <div
                      className={
                        visualizando ? "pointer-events-none opacity-80" : ""
                      }
                    >
                      <MultiSelect
                        id="turmas"
                        options={turmasMultiSelectOptions}
                        value={turmaIdsSelecionados}
                        onChange={(value) => {
                          if (visualizando) return;

                          const turmaIds = value.map(String);

                          setForm((prev) => ({
                            ...prev,
                            turmaIds,
                            turmaNomes: turmaIds.map((turmaId) =>
                              getTurmaNome(turmasOptions, turmaId),
                            ),
                          }));
                        }}
                        getOptionLabel={turmaLabel}
                        placeholder="Selecione as turmas"
                      />
                    </div>
                  )}

                  {!!turmaIdsSelecionados.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Turmas selecionadas: {turmasSelecionadasTexto}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="nomePlanoAula"
                    required={!visualizando}
                    tooltip="Informe um nome curto e claro que permita identificar facilmente este plano de aula."
                  >
                    Nome do Plano de Aula
                  </FieldLabel>

                  <Input
                    id="nomePlanoAula"
                    value={form.nomePlanoAula}
                    onChange={(event) =>
                      set("nomePlanoAula", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="colaboradorResponsavel"
                    required={!visualizando}
                    tooltip="Informe o colaborador responsável pelo planejamento ou pela condução da aula."
                  >
                    Colaborador Responsável
                  </FieldLabel>

                  <Select
                    value={colaboradorSelectValue || undefined}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      const colaboradorSelecionado = colaboradoresOptions.find(
                        (colaborador) =>
                          String(colaborador.id) === String(value),
                      );

                      setForm((prev) => ({
                        ...prev,
                        colaboradorId: value,
                        colaboradorNome: colaboradorSelecionado?.nome ?? "",
                      }));
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="colaboradorResponsavel">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>

                    <SelectContent>
                      {colaboradoresOptions.map((colaborador) => (
                        <SelectItem key={colaborador.id} value={colaborador.id}>
                          {colaborador.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={FileText}
              title="Conteúdo da aula"
              description="Planeje o que será trabalhado durante a aula, registrando os conteúdos, temas, técnicas ou conhecimentos que orientarão sua realização."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="conteudo"
                    required={!visualizando}
                    tooltip="Descreva os conteúdos, temas, técnicas ou conhecimentos que serão trabalhados durante a aula."
                  >
                    Conteúdo Previsto
                  </FieldLabel>

                  <Textarea
                    id="conteudo"
                    placeholder="Descreva o conteúdo previsto para a aula..."
                    className="min-h-[120px]"
                    value={form.conteudo}
                    onChange={(event) => set("conteudo", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={CalendarClock}
              title="Período e situação"
              description="Organize quando este plano será aplicado e acompanhe sua realização, indicando também quando se tratar da reposição de uma aula."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataInicio"
                    required={!visualizando}
                    tooltip="Informe a data prevista ou efetiva de início deste plano de aula."
                  >
                    Data de Início
                  </FieldLabel>

                  <Input
                    id="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(event) => set("dataInicio", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataFim"
                    tooltip="Informe a data de término quando o plano abranger mais de um encontro ou período."
                  >
                    Data de Término
                  </FieldLabel>

                  <Input
                    id="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={(event) => set("dataFim", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch
                      id="aulaReposicao"
                      checked={form.aulaReposicao}
                      onCheckedChange={(checked) => {
                        if (visualizando) return;
                        set("aulaReposicao", checked);
                      }}
                      disabled={bloqueado}
                    />

                    <FieldLabel
                      htmlFor="aulaReposicao"
                      tooltip="Ative esta opção quando o plano corresponder a uma aula realizada para substituir ou repor um encontro que não ocorreu na data originalmente prevista."
                    >
                      Aula de Reposição?
                    </FieldLabel>
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusPlanoAula"
                    required={!visualizando}
                    tooltip="Informe a situação atual do plano de aula. Planejado indica aula prevista; Realizado, aula concluída; e Cancelado, aula que não será realizada."
                  >
                    Situação do Plano de Aula
                  </FieldLabel>

                  <Select
                    value={form.statusPlanoAula}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("statusPlanoAula", value as StatusPlanoAula);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="statusPlanoAula">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusPlanoAulaOptions.map((status) => (
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
              icon={FileText}
              title="Observações"
              description="Registre somente informações complementares que sejam importantes para compreender, preparar ou realizar este plano de aula e que ainda não tenham sido informadas nos campos anteriores."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="observacao"
                    tooltip="Registre informações complementares relevantes para o planejamento ou realização da aula."
                  >
                    Observações
                  </FieldLabel>

                  <Textarea
                    id="observacao"
                    placeholder="Informações complementares..."
                    value={form.observacao}
                    onChange={(event) => set("observacao", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/planos-aula")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving || loading}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Plano de Aula"
          href="/wiki/execucao/plano-de-aula"
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

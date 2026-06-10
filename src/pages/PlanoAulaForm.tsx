import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
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

const SEM_TURMA = "__SEM_TURMA__";

const PLANO_AULA_NEXT_STEP_KEY = "aurit:planos-aula:next-step-card";

interface PlanoAulaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPlanoAula() {
  const card: PlanoAulaNextStepCardData = {
    titulo: "Após cadastrar o plano de aula, organize as turmas",
    descricao:
      "As turmas ajudam a dividir uma atividade em grupos por horário, dia, faixa etária, nível, território ou responsável, facilitando matrículas, acompanhamento dos participantes e registro de presenças.",
    acaoLabel: "Cadastrar turmas",
    acaoUrl: "/turmas/novo",
    acaoSecundariaLabel: "Ver planos de aula",
    acaoSecundariaUrl: "/planos-aula",
    variante: "pendente",
  };

  sessionStorage.setItem(PLANO_AULA_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  id: string;

  atividadeId: string;
  atividadeNome: string;

  turmaId: string;
  turmaNome: string;

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

  atividadeId: "",
  atividadeNome: "",

  turmaId: "",
  turmaNome: "",

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

function pickText(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function mapPlanoAulaToForm(planoAula: PlanoAula): FormState {
  const raw = planoAula as any;

  const atividadeId = normalizeId(raw.atividadeId ?? raw.atividade);
  const turmaId = normalizeId(raw.turmaId ?? raw.turma);
  const colaboradorId = normalizeId(raw.colaboradorId ?? raw.colaborador);

  const atividadeNome = pickText(
    raw.atividadeNome,
    raw.atividade?.nomeAtividade,
    raw.atividade?.titulo,
    raw.atividade?.nome,
  );

  const turmaNome = pickText(
    raw.turmaNome,
    raw.turma?.nomeTurma,
    raw.turma?.nome,
  );

  const colaboradorNome = pickText(
    raw.colaboradorNome,
    raw.colaborador?.nome,
    raw.colaborador?.nomeCompleto,
    raw.colaborador?.agente?.nome,
    raw.colaborador?.agente?.nomeCompleto,
  );

  return {
    id: normalizeId(raw.id),

    atividadeId,
    atividadeNome,

    turmaId,
    turmaNome,

    colaboradorId,
    colaboradorNome,

    dataInicio: raw.dataInicio ?? "",
    dataFim: raw.dataFim ?? "",
    aulaReposicao: Boolean(raw.aulaReposicao),
    statusPlanoAula: raw.statusPlanoAula ?? "PLANEJADO",

    conteudo: raw.conteudo ?? "",
    observacao: raw.observacao ?? "",
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

    atividadeId: form.atividadeId,
    atividadeNome: form.atividadeNome,

    turmaId: form.turmaId || undefined,
    turmaNome: form.turmaNome || undefined,

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

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const atividadeSelectValue =
    form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

  const turmaSelectValue =
    form.turmaId || String(existingPlanoAula?.turmaId ?? "");

  const colaboradorSelectValue =
    form.colaboradorId || String(existingPlanoAula?.colaboradorId ?? "");

  const atividadesOptions = useMemo(() => {
    const options = [...atividades];

    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

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
  }, [atividades, form.atividadeId, form.atividadeNome, existingPlanoAula]);

  const turmasDaAtividade = useMemo(() => {
    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

    if (!atividadeId) return [];

    return turmas.filter(
      (turma) => String(turma.atividadeId) === String(atividadeId),
    );
  }, [turmas, form.atividadeId, existingPlanoAula]);

  const turmasOptions = useMemo(() => {
    const options = [...turmasDaAtividade];

    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

    const turmaId = form.turmaId || String(existingPlanoAula?.turmaId ?? "");

    const turmaNome = getTurmaNome(
      turmas,
      turmaId,
      form.turmaNome || existingPlanoAula?.turmaNome,
    );

    if (
      turmaId &&
      !options.some((turma) => String(turma.id) === String(turmaId))
    ) {
      options.unshift({
        id: turmaId,
        nomeTurma: turmaNome,
        atividadeId,
      });
    }

    return options;
  }, [
    turmas,
    turmasDaAtividade,
    form.turmaId,
    form.turmaNome,
    form.atividadeId,
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

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [atividadesData, turmasData, colaboradoresData, planoAulaData] =
          await Promise.all([
            getAtividadesPlanoAulaOptions(),
            getTurmasPlanoAulaOptions(),
            getColaboradoresPlanoAulaOptions(),
            id ? getPlanoAulaById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setAtividades(atividadesData);
        setTurmas(turmasData);
        setColaboradores(colaboradoresData);

        if (planoAulaData) {
          const mapped = mapPlanoAulaToForm(planoAulaData);

          const atividadeId =
            mapped.atividadeId || String(planoAulaData.atividadeId ?? "");

          const turmaId =
            mapped.turmaId || String(planoAulaData.turmaId ?? "");

          const colaboradorId =
            mapped.colaboradorId || String(planoAulaData.colaboradorId ?? "");

          const atividadeNome = getAtividadeNome(
            atividadesData,
            atividadeId,
            mapped.atividadeNome || planoAulaData.atividadeNome,
          );

          const turmaNome = getTurmaNome(
            turmasData,
            turmaId,
            mapped.turmaNome || planoAulaData.turmaNome,
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
            turmaId: turmaId || undefined,
            turmaNome,
            colaboradorId,
            colaboradorNome,
          };

          setExistingPlanoAula(planoAulaNormalizado);

          setForm({
            ...mapped,
            atividadeId,
            atividadeNome,
            turmaId,
            turmaNome,
            colaboradorId,
            colaboradorNome,
          });
        } else {
          setExistingPlanoAula(null);
          setForm(initial);
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar plano de aula.",
        );

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
  }, [id, navigate]);

  function getFormComVinculos(): FormState {
    const atividadeId =
      form.atividadeId || String(existingPlanoAula?.atividadeId ?? "");

    const turmaId = form.turmaId || String(existingPlanoAula?.turmaId ?? "");

    const colaboradorId =
      form.colaboradorId || String(existingPlanoAula?.colaboradorId ?? "");

    const atividadeSelecionada = atividadesOptions.find(
      (atividade) => String(atividade.id) === String(atividadeId),
    );

    const turmaSelecionada = turmasOptions.find(
      (turma) => String(turma.id) === String(turmaId),
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

      turmaId,
      turmaNome:
        form.turmaNome ||
        turmaSelecionada?.nomeTurma ||
        existingPlanoAula?.turmaNome ||
        "",

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

    if (!formComVinculos.atividadeId) {
      toast.error("Selecione a atividade.");
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
      toast.error("Plano com data de fim preenchida deve estar como Concluído.");
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

      navigate("/planos-aula");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o plano de aula.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/planos-aula")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Plano de Aula"
          tooltip="Preencha os dados do plano de aula para organizar o conteúdo, o período, a atividade e o responsável."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-2 border-b pb-3">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Vínculos e Período
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required={!visualizando}>Atividade</FieldLabel>

                <Select
                  value={atividadeSelectValue || undefined}
                  onValueChange={(value) => {
                    if (visualizando) return;

                    const atividadeSelecionada = atividadesOptions.find(
                      (atividade) => String(atividade.id) === String(value),
                    );

                    setForm((prev) => ({
                      ...prev,
                      atividadeId: value,
                      atividadeNome:
                        atividadeSelecionada?.nomeAtividade ?? "",
                      turmaId: "",
                      turmaNome: "",
                    }));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger>
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
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Turma</FieldLabel>

                <Select
                  value={turmaSelectValue || SEM_TURMA}
                  onValueChange={(value) => {
                    if (visualizando) return;

                    if (value === SEM_TURMA) {
                      setForm((prev) => ({
                        ...prev,
                        turmaId: "",
                        turmaNome: "",
                      }));

                      return;
                    }

                    const turmaSelecionada = turmasOptions.find(
                      (turma) => String(turma.id) === String(value),
                    );

                    setForm((prev) => ({
                      ...prev,
                      turmaId: value,
                      turmaNome: turmaSelecionada?.nomeTurma ?? "",
                    }));
                  }}
                  disabled={bloqueado || !atividadeSelectValue}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        atividadeSelectValue
                          ? "Selecione a turma"
                          : "Selecione uma atividade primeiro"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={SEM_TURMA}>Nenhuma</SelectItem>

                    {turmasOptions.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nomeTurma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel required={!visualizando}>
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
                  <SelectTrigger>
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
              </div>

              <div>
                <FieldLabel required={!visualizando}>Data de Início</FieldLabel>

                <Input
                  type="date"
                  value={form.dataInicio}
                  onChange={(event) => set("dataInicio", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>

              <div>
                <FieldLabel>Data de Fim</FieldLabel>

                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={(event) => set("dataFim", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Switch
                  checked={form.aulaReposicao}
                  onCheckedChange={(checked) => {
                    if (visualizando) return;
                    set("aulaReposicao", checked);
                  }}
                  disabled={bloqueado}
                />

                <FieldLabel>Aula de Reposição?</FieldLabel>
              </div>

              <div>
                <FieldLabel required={!visualizando}>Status</FieldLabel>

                <Select
                  value={form.statusPlanoAula}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("statusPlanoAula", value as StatusPlanoAula);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger>
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
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-2 border-b pb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Conteúdo e Observações
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel required={!visualizando}>
                  Conteúdo previsto
                </FieldLabel>

                <Textarea
                  placeholder="Descreva o conteúdo previsto para a aula..."
                  className="min-h-[120px]"
                  value={form.conteudo}
                  onChange={(event) => set("conteudo", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>

              <div>
                <FieldLabel>Observações</FieldLabel>

                <Textarea
                  placeholder="Informações complementares..."
                  value={form.observacao}
                  onChange={(event) => set("observacao", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/planos-aula")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
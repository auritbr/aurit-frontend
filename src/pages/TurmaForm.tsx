import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarClock, Users } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { MultiSelect } from "@/components/MultiSelect";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  buildTurmaPayload,
  createTurma,
  diasSemana,
  getAtividadesOptions,
  getColaboradoresOptions,
  getTurmaById,
  statusTurma,
  updateTurma,
  type AtividadeOption,
  type ColaboradorOption,
} from "@/data/turmas";
import { toast } from "sonner";

interface FormState {
  nomeTurma: string;
  descricaoTurma: string;
  horarioInicio: string;
  horarioFim: string;
  quantidadeVagas: string;
  diaAtividade: string;
  status: string;
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
  status?: string | null;
  atividadeId?: string | number | null;
  atividadeNome?: string | null;
  nomeAtividade?: string | null;
  colaboradoresIds?: Array<string | number>;
}

const initial: FormState = {
  nomeTurma: "",
  descricaoTurma: "",
  horarioInicio: "",
  horarioFim: "",
  quantidadeVagas: "",
  diaAtividade: "",
  status: "",
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
            id ? getTurmaById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setAtividades(atividadesData);
        setColaboradores(colaboradoresData);

        if (turmaData) {
          const turma = turmaData as TurmaCarregada;

          const atividadeId = turma.atividadeId
            ? String(turma.atividadeId)
            : "";

          setExistingTurma({
            ...turma,
            atividadeId,
          });

          setForm({
            nomeTurma: turma.nomeTurma ?? "",
            descricaoTurma: turma.descricaoTurma ?? "",
            horarioInicio: turma.horarioInicio ?? "",
            horarioFim: turma.horarioFim ?? "",
            quantidadeVagas:
              turma.quantidadeVagas !== null &&
              turma.quantidadeVagas !== undefined
                ? String(turma.quantidadeVagas)
                : "",
            diaAtividade: turma.diaAtividade ?? "",
            status: turma.status ?? "",
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
  }, [id, navigate]);

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

    if (!formComAtividade.horarioInicio) {
      toast.error("Informe o horário de início.");
      return;
    }

    if (!formComAtividade.horarioFim) {
      toast.error("Informe o horário de término.");
      return;
    }

    if (formComAtividade.horarioFim <= formComAtividade.horarioInicio) {
      toast.error("O horário de término deve ser posterior ao de início.");
      return;
    }

    if (!formComAtividade.diaAtividade) {
      toast.error("Selecione o dia da atividade.");
      return;
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
        toast.success("Turma salva com sucesso.");
      }

      navigate("/turmas", {
        state: {
          showNextStepCard: true,
        },
      });
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
        <button
          type="button"
          onClick={() => navigate("/turmas")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Turma"
          tooltip="Cadastre turmas vinculadas às atividades do projeto. Use esta página para organizar grupos por horário, dia, faixa etária, nível, território ou responsável, facilitando o acompanhamento de participantes, presenças e execução das ações."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={BookOpen} title="Dados da turma">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="nomeTurma"
                  required={!visualizando}
                  tooltip="Informe um nome claro para identificar a turma dentro da atividade. Ex.: turma infantil, turma manhã ou turma iniciante."
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
                  tooltip="Descreva as características da turma, como perfil dos participantes, faixa etária, nível, local, objetivo ou forma de organização dentro da atividade. Ex.: Turma voltada para crianças de 8 a 12 anos, com aulas semanais de iniciação musical no período da tarde."
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
          </Section>

          <Section icon={CalendarClock} title="Organização da atividade">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="horarioInicio"
                  required={!visualizando}
                  tooltip="Informe o horário de início dos encontros desta turma. Ex.: 14:00."
                >
                  Horário de Início da Aula
                </FieldLabel>

                <Input
                  id="horarioInicio"
                  type="time"
                  value={form.horarioInicio}
                  onChange={(event) =>
                    set("horarioInicio", event.target.value)
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="horarioFim"
                  required={!visualizando}
                  tooltip="Informe o horário de término dos encontros desta turma. Ex.: 16:00."
                >
                  Horário de Término da Aula
                </FieldLabel>

                <Input
                  id="horarioFim"
                  type="time"
                  value={form.horarioFim}
                  onChange={(event) => set("horarioFim", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="diaAtividade"
                  required={!visualizando}
                  tooltip="Selecione o dia da semana em que esta turma acontece regularmente."
                >
                  Dia da Atividade
                </FieldLabel>

                <Select
                  value={form.diaAtividade}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("diaAtividade", value);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="diaAtividade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {diasSemana.map((dia) => (
                      <SelectItem key={dia.value} value={dia.value}>
                        {dia.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="status"
                  required={!visualizando}
                  tooltip="Indique a situação atual da turma no sistema. Use “Ativo” para turmas em andamento, “Pendente” para turmas em organização ou conferência, “Concluído” para turmas finalizadas conforme previsto e “Inativo” para turmas que não devem mais ser consideradas ativas."
                >
                  Status da Turma
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

              <Field>
                <FieldLabel
                  htmlFor="quantidadeVagas"
                  tooltip="Informe a quantidade máxima de participantes prevista para esta turma. Ex.: 25."
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

              <Field>
                <FieldLabel
                  htmlFor="atividade"
                  required={!visualizando}
                  tooltip="Selecione a atividade à qual esta turma pertence. A turma deve ser usada como uma divisão interna de uma atividade já cadastrada."
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
            </div>
          </Section>

          <Section icon={Users} title="Colaboradores responsáveis">
            <div className="grid grid-cols-1 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="colaboradores"
                  required={!visualizando}
                  tooltip="Selecione os colaboradores responsáveis pela condução, apoio, coordenação, acompanhamento ou registro de presença desta turma."
                >
                  Colaboradores
                </FieldLabel>

                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
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
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/turmas")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
          {title}
        </h2>
      </div>

      {children}
    </Card>
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
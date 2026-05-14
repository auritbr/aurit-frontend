import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Users2, Tags, Link2 } from "lucide-react";
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { MultiSelect } from "@/components/MultiSelect";
import {
  buildAtividadePayload,
  createAtividade,
  getAtividadeById,
  getColaboradoresOptions,
  getProjetosOptions,
  statusAtividade,
  tiposAtividade,
  updateAtividade,
  type Atividade,
  type ColaboradorOption,
  type ProjetoOption,
} from "@/data/atividades";
import { toast } from "sonner";

const ATIVIDADE_NEXT_STEP_KEY = "aurit:atividades:next-step-card";

interface AtividadeNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoAtividade() {
  const card: AtividadeNextStepCardData = {
    titulo: "Após cadastrar as atividades, organize as turmas",
    descricao:
      "As turmas ajudam a dividir uma atividade em grupos por horário, dia, faixa etária, nível, território ou responsável, facilitando matrículas, acompanhamento dos participantes e registro de presenças.",
    acaoLabel: "Cadastrar turmas",
    acaoUrl: "/turmas/novo",
    acaoSecundariaLabel: "Ver atividades",
    acaoSecundariaUrl: "/atividades",
    variante: "pendente",
  };

  sessionStorage.setItem(ATIVIDADE_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  id: string;
  nomeAtividade: string;
  descricaoAtividade: string;
  publicoBeneficiadoAtividade: string;
  localAtividade: string;
  dataInicio: string;
  dataFim: string;
  quantidadeVagas: string;
  tipoAtividade: string;
  status: string;
  projeto: string;
  projetoNome: string;
  colaboradores: string[];
}

const initial: FormState = {
  id: "",
  nomeAtividade: "",
  descricaoAtividade: "",
  publicoBeneficiadoAtividade: "",
  localAtividade: "",
  dataInicio: "",
  dataFim: "",
  quantidadeVagas: "",
  tipoAtividade: "",
  status: "",
  projeto: "",
  projetoNome: "",
  colaboradores: [],
};

const onlyDigits = (v: string, max = 6) => v.replace(/\D/g, "").slice(0, max);

function hojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dataFimPassada(dataFim: string) {
  if (!dataFim) return false;

  return dataFim < hojeIso();
}

function statusPermiteDataFimPassada(status: string) {
  return status === "INATIVO" || status === "CONCLUIDO";
}

function mapAtividadeToForm(atividade: Atividade): FormState {
  return {
    id: atividade.id ?? "",
    nomeAtividade: atividade.nomeAtividade ?? "",
    descricaoAtividade: atividade.descricaoAtividade ?? "",
    publicoBeneficiadoAtividade:
      atividade.publicoBeneficiadoAtividade ?? "",
    localAtividade: atividade.localAtividade ?? "",
    dataInicio: atividade.dataInicio ?? "",
    dataFim: atividade.dataFim ?? "",
    quantidadeVagas: atividade.quantidadeVagas ?? "",
    tipoAtividade: atividade.tipoAtividade ?? "",
    status: atividade.status ?? "",
    projeto: atividade.projetoId ?? "",
    projetoNome: atividade.projetoNome ?? "",
    colaboradores: atividade.colaboradoresIds ?? [],
  };
}

function getProjetoNome(projetos: ProjetoOption[], projetoId: string) {
  return (
    projetos.find((projeto) => String(projeto.id) === String(projetoId))
      ?.nome || `Projeto ${projetoId}`
  );
}

export default function AtividadeForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingAtividade, setExistingAtividade] =
    useState<Atividade | null>(null);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const projetoSelectValue =
    form.projeto || String(existingAtividade?.projetoId ?? "");

  const projetosOptions = useMemo(() => {
    const options = [...projetos];

    const projetoId =
      form.projeto || String(existingAtividade?.projetoId ?? "");

    const projetoNome =
      form.projetoNome ||
      existingAtividade?.projetoNome ||
      getProjetoNome(projetos, projetoId);

    if (
      projetoId &&
      !options.some((projeto) => String(projeto.id) === String(projetoId))
    ) {
      options.unshift({
        id: projetoId,
        nome: projetoNome,
      });
    }

    return options;
  }, [projetos, form.projeto, form.projetoNome, existingAtividade]);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, colaboradoresData, atividadeData] =
          await Promise.all([
            getProjetosOptions(),
            getColaboradoresOptions(),
            id ? getAtividadeById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);

        if (atividadeData) {
          const mapped = mapAtividadeToForm(atividadeData);

          const projetoId =
            mapped.projeto || String(atividadeData.projetoId ?? "");

          const projetoSelecionado = projetosData.find(
            (projeto) => String(projeto.id) === String(projetoId),
          );

          const projetoNome =
            mapped.projetoNome ||
            atividadeData.projetoNome ||
            projetoSelecionado?.nome ||
            (projetoId ? `Projeto ${projetoId}` : "");

          setExistingAtividade({
            ...atividadeData,
            projetoId,
            projetoNome,
          });

          setForm({
            ...mapped,
            projeto: projetoId,
            projetoNome,
          });
        } else {
          setExistingAtividade(null);
          setForm(initial);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.",
        );
        navigate("/atividades");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const colaboradoresOptions = colaboradores.map((c) => c.id);

  const colaboradorLabel = (colaboradorId: string) =>
    colaboradores.find((c) => String(c.id) === String(colaboradorId))?.nome ??
    colaboradorId;

  function getFormComProjeto(): FormState {
    const projetoId =
      form.projeto || String(existingAtividade?.projetoId ?? "");

    const projetoSelecionado = projetosOptions.find(
      (projeto) => String(projeto.id) === String(projetoId),
    );

    return {
      ...form,
      projeto: projetoId,
      projetoNome:
        form.projetoNome ||
        projetoSelecionado?.nome ||
        existingAtividade?.projetoNome ||
        "",
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComProjeto = getFormComProjeto();

    if (!formComProjeto.nomeAtividade.trim()) {
      toast.error("Informe o nome da atividade.");
      return;
    }

    if (!formComProjeto.descricaoAtividade.trim()) {
      toast.error("Informe a descrição da atividade.");
      return;
    }

    if (!formComProjeto.publicoBeneficiadoAtividade.trim()) {
      toast.error("Informe o público beneficiado.");
      return;
    }

    if (!formComProjeto.dataInicio) {
      toast.error("Informe a data de início da atividade.");
      return;
    }

    if (
      formComProjeto.dataInicio &&
      formComProjeto.dataFim &&
      formComProjeto.dataFim < formComProjeto.dataInicio
    ) {
      toast.error("A data de término deve ser posterior à data de início.");
      return;
    }

    if (formComProjeto.status === "CONCLUIDO" && !formComProjeto.dataFim) {
      toast.error(
        "Informe a data de término quando a atividade estiver concluída.",
      );
      return;
    }

    if (
      formComProjeto.dataFim &&
      dataFimPassada(formComProjeto.dataFim) &&
      !statusPermiteDataFimPassada(formComProjeto.status)
    ) {
      toast.error(
        "Atividade com data de término passada deve estar com status Inativo ou Concluído.",
      );
      return;
    }

    if (
      formComProjeto.quantidadeVagas.trim() &&
      Number(formComProjeto.quantidadeVagas) < 0
    ) {
      toast.error("A quantidade de vagas não pode ser negativa.");
      return;
    }

    if (!formComProjeto.tipoAtividade) {
      toast.error("Selecione o tipo de atividade.");
      return;
    }

    if (!formComProjeto.status) {
      toast.error("Selecione o status da atividade.");
      return;
    }

    if (!formComProjeto.projeto) {
      toast.error("Selecione o projeto.");
      return;
    }

    const atividade: Atividade = {
      id: id ?? "",
      nomeAtividade: formComProjeto.nomeAtividade.trim(),
      descricaoAtividade: formComProjeto.descricaoAtividade.trim(),
      publicoBeneficiadoAtividade:
        formComProjeto.publicoBeneficiadoAtividade.trim(),
      localAtividade: formComProjeto.localAtividade.trim(),
      quantidadeVagas: formComProjeto.quantidadeVagas.trim(),
      dataInicio: formComProjeto.dataInicio,
      dataFim: formComProjeto.dataFim,
      tipoAtividade: formComProjeto.tipoAtividade,
      status: formComProjeto.status,
      projetoId: formComProjeto.projeto,
      projetoNome: formComProjeto.projetoNome,
      colaboradoresIds: formComProjeto.colaboradores,
      colaboradoresNomes: [],
    };

    try {
      setSaving(true);

      const payload = buildAtividadePayload(atividade);

      if (isEdit && id) {
        await updateAtividade(Number(id), payload);
        toast.success("Atividade atualizada com sucesso.");
      } else {
        await createAtividade(payload);
        salvarProximaAcaoAtividade();
        toast.success("Atividade salva com sucesso.");
      }

      navigate("/atividades");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a atividade.",
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
          onClick={() => navigate("/atividades")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Atividade"
          tooltip="Cadastre e acompanhe as atividades vinculadas aos projetos da organização. Informe nome, descrição, público atendido, local, período, vagas e equipe envolvida para organizar a execução, registrar presenças, gerar evidências e apoiar relatórios e prestações de contas."
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
          <Section icon={ClipboardList} title="Dados principais">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="nomeAtividade"
                  required
                  tooltip="Informe um nome claro para identificar a atividade dentro do projeto. Ex.: oficina de violão para iniciantes."
                >
                  Nome da Atividade
                </FieldLabel>
                <Input
                  id="nomeAtividade"
                  value={form.nomeAtividade}
                  onChange={(e) => set("nomeAtividade", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="descricaoAtividade"
                  required
                  tooltip="Descreva o que será realizado na atividade, explicando seu objetivo, metodologia, principais ações, conteúdos trabalhados e relação com o projeto. Ex.: Oficina semanal de violão voltada à iniciação musical, com atividades práticas de ritmo, acordes, escuta musical e preparação para apresentação coletiva."
                >
                  Descrição da Atividade
                </FieldLabel>
                <Textarea
                  id="descricaoAtividade"
                  value={form.descricaoAtividade}
                  onChange={(e) => set("descricaoAtividade", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Users2} title="Público, período e vagas">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="publico"
                  required
                  tooltip="Descreva quem será diretamente atendido pela atividade, informando faixa etária, perfil, comunidade, território, grupo prioritário ou vínculo com o projeto. Ex.: Crianças e adolescentes de 8 a 16 anos, moradores do bairro Santa Rita, participantes das oficinas culturais do projeto."
                >
                  Público Beneficiado
                </FieldLabel>
                <Textarea
                  id="publico"
                  value={form.publicoBeneficiadoAtividade}
                  onChange={(e) =>
                    set("publicoBeneficiadoAtividade", e.target.value)
                  }
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="localAtividade"
                  tooltip="Informe onde a atividade será realizada. Pode ser um espaço físico, ambiente digital, instituição parceira, comunidade, bairro ou cidade. Ex.: Ponto de Cultura Viva Vida, Escola Municipal João XXIII, Praça Central ou atividade online."
                >
                  Local da Atividade
                </FieldLabel>
                <Textarea
                  id="localAtividade"
                  value={form.localAtividade}
                  onChange={(e) => set("localAtividade", e.target.value)}
                  rows={2}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataInicio"
                  required
                  tooltip="Informe a data prevista ou efetiva de início da atividade."
                >
                  Data de Início da Atividade
                </FieldLabel>
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => set("dataInicio", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataFim"
                  tooltip="Informe a data prevista ou efetiva de término da atividade, quando houver. Este campo deve ser preenchido quando o status estiver como “Concluído”."
                >
                  Data de Término da Atividade
                </FieldLabel>
                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => set("dataFim", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="vagas"
                  tooltip="Informe a quantidade máxima de participantes que poderão ser atendidos nesta atividade, quando houver limite definido. Ex.: 25."
                >
                  Quantidade de Vagas
                </FieldLabel>
                <Input
                  id="vagas"
                  value={form.quantidadeVagas}
                  onChange={(e) =>
                    set("quantidadeVagas", onlyDigits(e.target.value, 5))
                  }
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Tags} title="Classificação da atividade">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="tipoAtividade"
                  required
                  tooltip="Selecione o tipo que melhor representa a atividade realizada. Ex.: oficina, curso, palestra, seminário, formação continuada ou atividade educativa."
                >
                  Tipo de Atividade
                </FieldLabel>
                <Select
                  value={form.tipoAtividade}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("tipoAtividade", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoAtividade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {tiposAtividade.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="status"
                  required
                  tooltip="Indique a situação atual da atividade no sistema. Use “Ativo” para atividades em execução ou acompanhamento, “Pendente” para atividades em organização ou conferência, “Concluído” para atividades finalizadas conforme previsto e “Inativo” para atividades que não devem mais ser consideradas ativas."
                >
                  Status da Atividade
                </FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("status", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusAtividade.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Link2} title="Vínculos e equipe">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="projeto"
                  required
                  tooltip="Selecione o projeto ao qual esta atividade pertence. Esse vínculo organiza a execução e permite relacionar a atividade a metas, cronograma, presenças, evidências, relatórios e prestação de contas."
                >
                  Projeto
                </FieldLabel>
                <Select
                  value={projetoSelectValue}
                  onValueChange={(v) => {
                    if (visualizando) return;

                    const projetoSelecionado = projetosOptions.find(
                      (projeto) => String(projeto.id) === String(v),
                    );

                    setForm((prev) => ({
                      ...prev,
                      projeto: String(v),
                      projetoNome:
                        projetoSelecionado?.nome ?? prev.projetoNome,
                    }));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetosOptions.map((p) => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="colaboradores"
                  tooltip="Selecione os colaboradores responsáveis pela execução, coordenação, apoio, registro ou acompanhamento da atividade, quando houver. Se a equipe ainda não estiver definida, este campo pode ser preenchido depois."
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
                    onChange={(v) => {
                      if (visualizando) return;
                      set("colaboradores", v);
                    }}
                    getOptionLabel={colaboradorLabel}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/atividades")}
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
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold text-foreground leading-tight uppercase tracking-wide">
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
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  UserCheck,
  Briefcase,
  NotebookPen,
  Info,
} from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import {
  buildEquipeEditalPayload,
  createEquipeEdital,
  updateEquipeEdital,
  formatBRLInput,
  getAgentesOptions,
  getColaboradoresOptions,
  getEquipeEditalById,
  getIntegrantesOptions,
  getPropostasEditalOptions,
  parseBRL,
  type AgenteOption,
  type EquipeEdital,
  type PessoaOption,
  type PropostaEditalOption,
  type TipoPessoaEquipe,
} from "@/data/equipeEdital";
import { toast } from "sonner";

const EQUIPE_EDITAL_NEXT_STEP_KEY = "aurit:equipe-edital:next-step-card";

interface EquipeEditalNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoEquipeEdital() {
  const card: EquipeEditalNextStepCardData = {
    titulo:
      "Após organizar a equipe da proposta, detalhe o orçamento da proposta",
    descricao:
      "O orçamento da proposta ajuda a estruturar os itens previstos, justificativas, quantidades, unidades de medida, valores e vínculos com o projeto ou equipe.",
    acaoLabel: "Cadastrar orçamento",
    acaoUrl: "/planejamento-financeiro",
    acaoSecundariaLabel: "Ver equipe da proposta",
    acaoSecundariaUrl: "/equipe-edital",
    variante: "pendente",
  };

  sessionStorage.setItem(EQUIPE_EDITAL_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  propostaEdital: string;
  agente: string;
  tipoPessoa: TipoPessoaEquipe | "";
  colaborador: string;
  integrante: string;
  funcaoProjeto: string;
  cargaHorariaPrevista: string;
  valorPrevisto: string;
  justificativaFuncao: string;
  miniBiografia: string;
}

const initial: FormState = {
  propostaEdital: "",
  agente: "",
  tipoPessoa: "",
  colaborador: "",
  integrante: "",
  funcaoProjeto: "",
  cargaHorariaPrevista: "",
  valorPrevisto: "",
  justificativaFuncao: "",
  miniBiografia: "",
};

export default function EquipeEditalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [colaboradores, setColaboradores] = useState<PessoaOption[]>([]);
  const [integrantes, setIntegrantes] = useState<PessoaOption[]>([]);

  const bloqueado = visualizando || loading || saving;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let active = true;

    async function carregarTela() {
      try {
        setLoading(true);

        const [
          propostasData,
          agentesData,
          colaboradoresData,
          integrantesData,
          registro,
        ] = await Promise.all([
          getPropostasEditalOptions(),
          getAgentesOptions(),
          getColaboradoresOptions(),
          getIntegrantesOptions(),
          id ? getEquipeEditalById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);
        setAgentes(agentesData);
        setColaboradores(colaboradoresData);
        setIntegrantes(integrantesData);

        if (registro) {
          setForm({
            propostaEdital: registro.propostaEdital ?? "",
            agente: registro.agente ?? "",
            tipoPessoa: registro.tipoPessoa ?? "",
            colaborador: registro.colaborador ?? "",
            integrante: registro.integrante ?? "",
            funcaoProjeto: registro.funcaoProjeto ?? "",
            cargaHorariaPrevista:
              registro.cargaHorariaPrevista != null
                ? String(registro.cargaHorariaPrevista)
                : "",
            valorPrevisto:
              registro.valorPrevisto != null
                ? formatBRLInput(String(Math.round(registro.valorPrevisto * 100)))
                : "",
            justificativaFuncao: registro.justificativaFuncao ?? "",
            miniBiografia: registro.miniBiografia ?? "",
          });
        } else {
          setForm(initial);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar registro.",
        );
        navigate("/equipe-edital");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarTela();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const propostaSelecionadaExiste = useMemo(
    () =>
      !form.propostaEdital ||
      propostas.some((p) => p.id === form.propostaEdital),
    [propostas, form.propostaEdital],
  );

  const agenteSelecionadoExiste = useMemo(
    () => !form.agente || agentes.some((a) => a.id === form.agente),
    [agentes, form.agente],
  );

  const colaboradorSelecionadoExiste = useMemo(
    () =>
      !form.colaborador ||
      colaboradores.some((c) => c.id === form.colaborador),
    [colaboradores, form.colaborador],
  );

  const integranteSelecionadoExiste = useMemo(
    () =>
      !form.integrante ||
      integrantes.some((i) => i.id === form.integrante),
    [integrantes, form.integrante],
  );

  const setTipoPessoa = (t: TipoPessoaEquipe) => {
    if (visualizando) return;

    setForm((p) => ({
      ...p,
      tipoPessoa: t,
      colaborador: t === "COLABORADOR" ? p.colaborador : "",
      integrante: t === "INTEGRANTE" ? p.integrante : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    if (!form.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!form.agente) {
      toast.error("Selecione o agente responsável.");
      return;
    }

    if (!form.tipoPessoa) {
      toast.error("Selecione o tipo de pessoa: colaborador ou integrante.");
      return;
    }

    if (form.tipoPessoa === "COLABORADOR" && !form.colaborador) {
      toast.error("Selecione o colaborador.");
      return;
    }

    if (form.tipoPessoa === "INTEGRANTE" && !form.integrante) {
      toast.error("Selecione o integrante.");
      return;
    }

    if (!form.funcaoProjeto.trim()) {
      toast.error("Informe a função no projeto.");
      return;
    }

    const carga = Number(form.cargaHorariaPrevista);

    if (!Number.isFinite(carga) || carga <= 0) {
      toast.error("Informe uma carga horária prevista maior que zero.");
      return;
    }

    if (!form.valorPrevisto.trim()) {
      toast.error("Informe o valor previsto.");
      return;
    }

    const valor = parseBRL(form.valorPrevisto);

    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Informe um valor previsto válido e não negativo.");
      return;
    }

    if (!form.justificativaFuncao.trim()) {
      toast.error("Informe a justificativa da função.");
      return;
    }

    if (!form.miniBiografia.trim()) {
      toast.error("Informe a mini biografia.");
      return;
    }

    try {
      setSaving(true);

      const equipePayload: EquipeEdital = {
        id: id ?? "",
        propostaEdital: form.propostaEdital,
        agente: form.agente,
        tipoPessoa: form.tipoPessoa as TipoPessoaEquipe,
        colaborador:
          form.tipoPessoa === "COLABORADOR" ? form.colaborador : undefined,
        integrante:
          form.tipoPessoa === "INTEGRANTE" ? form.integrante : undefined,
        funcaoProjeto: form.funcaoProjeto,
        cargaHorariaPrevista: carga,
        valorPrevisto: valor,
        justificativaFuncao: form.justificativaFuncao,
        miniBiografia: form.miniBiografia,
      };

      const payload = buildEquipeEditalPayload(equipePayload);

      if (editando && id) {
        await updateEquipeEdital(Number(id), payload);
        toast.success("Membro da equipe atualizado.");
      } else {
        await createEquipeEdital(payload);
        salvarProximaAcaoEquipeEdital();
        toast.success("Membro da equipe cadastrado.");
      }

      navigate("/equipe-edital");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar registro.",
      );
    } finally {
      setSaving(false);
    }
  };

  const showColaborador = form.tipoPessoa === "COLABORADOR";
  const showIntegrante = form.tipoPessoa === "INTEGRANTE";

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/equipe-edital")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Equipe da Proposta"
          tooltip="Cadastre os membros que farão parte da equipe da proposta de edital, informando vínculo, função, carga horária, valor previsto, justificativa e mini biografia. Essas informações ajudam a compor o plano de trabalho e demonstrar a capacidade de execução do projeto."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />
          <p className="text-[13px] leading-relaxed text-foreground">
            Use esta página para indicar quem atuará na execução da proposta,
            qual será sua responsabilidade, qual dedicação está prevista e por
            que sua participação é necessária para o projeto.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={FileText} title="Dados da proposta">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  required
                  tooltip="Selecione a proposta de edital à qual este membro da equipe será vinculado. Esse vínculo conecta a pessoa ao plano de trabalho, orçamento e execução da proposta."
                >
                  Proposta de Edital
                </FieldLabel>
                <Select
                  value={form.propostaEdital}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("propostaEdital", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="propostaEdital">
                    <SelectValue placeholder="Selecione a proposta" />
                  </SelectTrigger>
                  <SelectContent>
                    {!!form.propostaEdital && !propostaSelecionadaExiste && (
                      <SelectItem value={form.propostaEdital}>
                        Registro atual #{form.propostaEdital}
                      </SelectItem>
                    )}

                    {propostas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="agente"
                  required
                  tooltip="Selecione o agente responsável pela inscrição, representação ou execução do projeto nesta proposta. Em editais, esse agente é quem assume a responsabilidade institucional ou cultural pela proposta."
                >
                  Agente Responsável
                </FieldLabel>
                <Select
                  value={form.agente}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("agente", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="agente">
                    <SelectValue placeholder="Selecione o agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {!!form.agente && !agenteSelecionadoExiste && (
                      <SelectItem value={form.agente}>
                        Registro atual #{form.agente}
                      </SelectItem>
                    )}

                    {agentes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={UserCheck} title="Pessoa vinculada à equipe">
            <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <Info
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                strokeWidth={2.2}
              />
              <span>
                Informe se a pessoa será vinculada como colaborador da
                organização ou como integrante externo. Após escolher o tipo,
                preencha apenas o campo correspondente.
                <strong className="text-foreground">
                  {" "}
                  Escolha apenas uma opção.
                </strong>
              </span>
            </div>

            <div className="mb-4">
              <FieldLabel
                required
                tooltip="Indique se o membro da equipe será selecionado entre os colaboradores da organização ou entre os integrantes externos cadastrados no sistema."
              >
                Tipo de Pessoa
              </FieldLabel>

              <RadioGroup
                value={form.tipoPessoa}
                onValueChange={(v) => setTipoPessoa(v as TipoPessoaEquipe)}
                className="mt-1 flex flex-col gap-3 sm:flex-row sm:gap-6"
                disabled={visualizando}
              >
                <label
                  htmlFor="tp-col"
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${form.tipoPessoa === "COLABORADOR"
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-muted/40"
                    } ${visualizando ? "pointer-events-none opacity-80" : ""}`}
                >
                  <RadioGroupItem value="COLABORADOR" id="tp-col" />
                  <Label htmlFor="tp-col" className="cursor-pointer text-sm">
                    Colaborador
                  </Label>
                </label>

                <label
                  htmlFor="tp-int"
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${form.tipoPessoa === "INTEGRANTE"
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-muted/40"
                    } ${visualizando ? "pointer-events-none opacity-80" : ""}`}
                >
                  <RadioGroupItem value="INTEGRANTE" id="tp-int" />
                  <Label htmlFor="tp-int" className="cursor-pointer text-sm">
                    Integrante
                  </Label>
                </label>
              </RadioGroup>
            </div>

            {showColaborador && (
              <Field>
                <FieldLabel
                  htmlFor="colaborador"
                  required
                  tooltip="Selecione o colaborador da organização que fará parte da equipe desta proposta."
                >
                  Colaborador
                </FieldLabel>
                <Select
                  value={form.colaborador}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("colaborador", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="colaborador">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {!!form.colaborador && !colaboradorSelecionadoExiste && (
                      <SelectItem value={form.colaborador}>
                        Registro atual #{form.colaborador}
                      </SelectItem>
                    )}

                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {showIntegrante && (
              <Field>
                <FieldLabel
                  htmlFor="integrante"
                  required
                  tooltip="Selecione o integrante externo que fará parte da equipe desta proposta."
                >
                  Integrante
                </FieldLabel>
                <Select
                  value={form.integrante}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("integrante", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="integrante">
                    <SelectValue placeholder="Selecione o integrante" />
                  </SelectTrigger>
                  <SelectContent>
                    {!!form.integrante && !integranteSelecionadoExiste && (
                      <SelectItem value={form.integrante}>
                        Registro atual #{form.integrante}
                      </SelectItem>
                    )}

                    {integrantes.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </Section>

          <Section icon={Briefcase} title="Função no projeto">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="funcaoProjeto"
                  required
                  tooltip="Ex.: coordenador geral, oficineiro, produtor cultural, educador, monitor, responsável financeiro, comunicador ou técnico de som."
                >
                  Função no Projeto
                </FieldLabel>
                <Input
                  id="funcaoProjeto"
                  value={form.funcaoProjeto}
                  onChange={(e) => set("funcaoProjeto", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="cargaHorariaPrevista"
                  required
                  tooltip="Informe a carga horária semanal prevista para atuação desta pessoa no projeto. Ex.: 10 horas por semana."
                >
                  Carga Horária Semanal
                </FieldLabel>
                <Input
                  id="cargaHorariaPrevista"
                  inputMode="numeric"
                  value={form.cargaHorariaPrevista}
                  onChange={(e) =>
                    set(
                      "cargaHorariaPrevista",
                      e.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="valorPrevisto"
                  required
                  tooltip="Informe o valor previsto para pagamento desta pessoa na proposta, conforme sua função, carga horária e orçamento do projeto. Quando não houver remuneração prevista, informe R$ 0,00."
                >
                  Valor Previsto
                </FieldLabel>
                <Input
                  id="valorPrevisto"
                  inputMode="numeric"
                  value={form.valorPrevisto}
                  onChange={(e) =>
                    set("valorPrevisto", formatBRLInput(e.target.value))
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={NotebookPen} title="Justificativa e mini biografia">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="justificativaFuncao"
                  required
                  tooltip="Explique por que esta função é necessária para a execução da proposta e como a atuação desta pessoa contribui para as atividades, metas, acompanhamento ou resultados do projeto. Ex.: A função de oficineiro é necessária para conduzir as atividades formativas, acompanhar os participantes e garantir a execução pedagógica das oficinas previstas."
                >
                  Justificativa da Função
                </FieldLabel>
                <Textarea
                  id="justificativaFuncao"
                  value={form.justificativaFuncao}
                  onChange={(e) => set("justificativaFuncao", e.target.value)}
                  rows={4}
                  className="bg-secondary/30 focus:bg-background"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="miniBiografia"
                  required
                  tooltip="Descreva brevemente a trajetória da pessoa, destacando experiências, formações, atuações culturais, competências e relação com a função que exercerá na proposta. Ex.: Educadora musical com atuação em oficinas culturais desde 2018, experiência com crianças e adolescentes e participação em projetos comunitários de formação artística."
                >
                  Mini Biografia
                </FieldLabel>
                <Textarea
                  id="miniBiografia"
                  value={form.miniBiografia}
                  onChange={(e) => set("miniBiografia", e.target.value)}
                  rows={4}
                  className="bg-secondary/30 focus:bg-background"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/equipe-edital")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-40" disabled={saving}>
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
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-2" : ""}>{children}</div>;
}
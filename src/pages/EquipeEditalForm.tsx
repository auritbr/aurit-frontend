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
  getColaboradoresOptions,
  getEquipeEditalById,
  getIntegrantesOptions,
  getPropostasEditalOptions,
  parseBRL,
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
      "Após organizar a equipe da proposta, detalhe o plano de comunicação",
    descricao:
      "O plano de comunicação ajuda a registrar quais materiais serão produzidos, em que quantidade, quais estratégias serão utilizadas, onde esses materiais circularão e em qual período serão divulgados.",
    acaoLabel: "Cadastrar plano de comunicação",
    acaoUrl: "/planos-comunicacao/novo",
    acaoSecundariaLabel: "Ver equipe da proposta",
    acaoSecundariaUrl: "/equipe-edital",
    variante: "pendente",
  };

  sessionStorage.setItem(EQUIPE_EDITAL_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  propostaEdital: string;
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
  tipoPessoa: "",
  colaborador: "",
  integrante: "",
  funcaoProjeto: "",
  cargaHorariaPrevista: "",
  valorPrevisto: "",
  justificativaFuncao: "",
  miniBiografia: "",
};

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaId: string,
) {
  return (
    propostas.find((proposta) => normalizeId(proposta.id) === propostaId)
      ?.nome || `Proposta ${propostaId}`
  );
}

function getPessoaNome(
  pessoas: PessoaOption[],
  pessoaId: string,
  fallback: string,
) {
  return (
    pessoas.find((pessoa) => normalizeId(pessoa.id) === pessoaId)?.nome ||
    `${fallback} ${pessoaId}`
  );
}

export default function EquipeEditalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingEquipe, setExistingEquipe] = useState<EquipeEdital | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [colaboradores, setColaboradores] = useState<PessoaOption[]>([]);
  const [integrantes, setIntegrantes] = useState<PessoaOption[]>([]);

  const bloqueado = visualizando || loading || saving;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const propostaSelectValue =
    form.propostaEdital || normalizeId(existingEquipe?.propostaEdital);

  const colaboradorSelectValue =
    form.colaborador || normalizeId(existingEquipe?.colaborador);

  const integranteSelectValue =
    form.integrante || normalizeId(existingEquipe?.integrante);

  const propostasComFallback = useMemo(() => {
    const options = [...propostas];
    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => normalizeId(proposta.id) === propostaId)
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId),
      });
    }

    return options;
  }, [propostas, propostaSelectValue]);

  const colaboradoresComFallback = useMemo(() => {
    const options = [...colaboradores];
    const colaboradorId = colaboradorSelectValue;

    if (
      colaboradorId &&
      !options.some(
        (colaborador) => normalizeId(colaborador.id) === colaboradorId,
      )
    ) {
      options.unshift({
        id: colaboradorId,
        nome: getPessoaNome(colaboradores, colaboradorId, "Colaborador"),
      });
    }

    return options;
  }, [colaboradores, colaboradorSelectValue]);

  const integrantesComFallback = useMemo(() => {
    const options = [...integrantes];
    const integranteId = integranteSelectValue;

    if (
      integranteId &&
      !options.some(
        (integrante) => normalizeId(integrante.id) === integranteId,
      )
    ) {
      options.unshift({
        id: integranteId,
        nome: getPessoaNome(integrantes, integranteId, "Integrante"),
      });
    }

    return options;
  }, [integrantes, integranteSelectValue]);

  useEffect(() => {
    let active = true;

    async function carregarTela() {
      try {
        setLoading(true);

        const [
          propostasData,
          colaboradoresData,
          integrantesData,
          registro,
        ] = await Promise.all([
          getPropostasEditalOptions(),
          getColaboradoresOptions(),
          getIntegrantesOptions(),
          id ? getEquipeEditalById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);
        setColaboradores(colaboradoresData);
        setIntegrantes(integrantesData);

        if (registro) {
          const propostaEdital = normalizeId(registro.propostaEdital);
          const colaborador = normalizeId(registro.colaborador);
          const integrante = normalizeId(registro.integrante);

          const registroNormalizado: EquipeEdital = {
            ...registro,
            propostaEdital,
            colaborador: colaborador || undefined,
            integrante: integrante || undefined,
          };

          setExistingEquipe(registroNormalizado);

          setForm({
            propostaEdital,
            tipoPessoa: registro.tipoPessoa ?? "",
            colaborador,
            integrante,
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
          setExistingEquipe(null);
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

  const setTipoPessoa = (t: TipoPessoaEquipe) => {
    if (visualizando) return;

    setForm((p) => ({
      ...p,
      tipoPessoa: t,
      colaborador: t === "COLABORADOR" ? colaboradorSelectValue : "",
      integrante: t === "INTEGRANTE" ? integranteSelectValue : "",
    }));
  };

  function getFormComVinculos(): FormState {
    return {
      ...form,
      propostaEdital: propostaSelectValue,
      colaborador:
        form.tipoPessoa === "COLABORADOR" ? colaboradorSelectValue : "",
      integrante:
        form.tipoPessoa === "INTEGRANTE" ? integranteSelectValue : "",
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

    if (!formComVinculos.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!formComVinculos.tipoPessoa) {
      toast.error("Selecione o tipo de pessoa: colaborador ou integrante.");
      return;
    }

    if (
      formComVinculos.tipoPessoa === "COLABORADOR" &&
      !formComVinculos.colaborador
    ) {
      toast.error("Selecione o colaborador.");
      return;
    }

    if (
      formComVinculos.tipoPessoa === "INTEGRANTE" &&
      !formComVinculos.integrante
    ) {
      toast.error("Selecione o integrante.");
      return;
    }

    if (!formComVinculos.funcaoProjeto.trim()) {
      toast.error("Informe a função no projeto.");
      return;
    }

    const carga = Number(formComVinculos.cargaHorariaPrevista);

    if (!Number.isFinite(carga) || carga <= 0) {
      toast.error("Informe uma carga horária prevista maior que zero.");
      return;
    }

    if (!formComVinculos.valorPrevisto.trim()) {
      toast.error("Informe o valor previsto.");
      return;
    }

    const valor = parseBRL(formComVinculos.valorPrevisto);

    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Informe um valor previsto válido e não negativo.");
      return;
    }

    if (!formComVinculos.justificativaFuncao.trim()) {
      toast.error("Informe a justificativa da função.");
      return;
    }

    if (!formComVinculos.miniBiografia.trim()) {
      toast.error("Informe a mini biografia.");
      return;
    }

    try {
      setSaving(true);

      const equipePayload: EquipeEdital = {
        id: id ?? "",
        propostaEdital: formComVinculos.propostaEdital,
        tipoPessoa: formComVinculos.tipoPessoa as TipoPessoaEquipe,
        colaborador:
          formComVinculos.tipoPessoa === "COLABORADOR"
            ? formComVinculos.colaborador
            : undefined,
        integrante:
          formComVinculos.tipoPessoa === "INTEGRANTE"
            ? formComVinculos.integrante
            : undefined,
        funcaoProjeto: formComVinculos.funcaoProjeto,
        cargaHorariaPrevista: carga,
        valorPrevisto: valor,
        justificativaFuncao: formComVinculos.justificativaFuncao,
        miniBiografia: formComVinculos.miniBiografia,
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
                  value={propostaSelectValue}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("propostaEdital", normalizeId(v));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="propostaEdital">
                    <SelectValue placeholder="Selecione a proposta" />
                  </SelectTrigger>
                  <SelectContent>
                    {propostasComFallback.length === 0 ? (
                      <SelectItem value="sem-proposta" disabled>
                        Nenhuma proposta disponível
                      </SelectItem>
                    ) : (
                      propostasComFallback.map((p) => (
                        <SelectItem
                          key={normalizeId(p.id)}
                          value={normalizeId(p.id)}
                        >
                          {p.nome}
                        </SelectItem>
                      ))
                    )}
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
                  value={colaboradorSelectValue}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("colaborador", normalizeId(v));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="colaborador">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoresComFallback.length === 0 ? (
                      <SelectItem value="sem-colaborador" disabled>
                        Nenhum colaborador cadastrado
                      </SelectItem>
                    ) : (
                      colaboradoresComFallback.map((c) => (
                        <SelectItem
                          key={normalizeId(c.id)}
                          value={normalizeId(c.id)}
                        >
                          {c.nome}
                        </SelectItem>
                      ))
                    )}
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
                  value={integranteSelectValue}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("integrante", normalizeId(v));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="integrante">
                    <SelectValue placeholder="Selecione o integrante" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrantesComFallback.length === 0 ? (
                      <SelectItem value="sem-integrante" disabled>
                        Nenhum integrante cadastrado
                      </SelectItem>
                    ) : (
                      integrantesComFallback.map((i) => (
                        <SelectItem
                          key={normalizeId(i.id)}
                          value={normalizeId(i.id)}
                        >
                          {i.nome}
                        </SelectItem>
                      ))
                    )}
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
                  tooltip="Informe a função que esta pessoa exercerá no projeto, de acordo com sua responsabilidade principal. Ex.: coordenador geral, oficineiro, produtor cultural, educador, monitor, responsável financeiro, comunicador ou técnico de som."
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
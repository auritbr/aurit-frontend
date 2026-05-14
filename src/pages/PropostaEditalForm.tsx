import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Accessibility,
  Wallet,
  Building2,
  Users,
  ClipboardList,
  Info,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
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
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  getPropostaEditalById,
  createPropostaEdital,
  updatePropostaEdital,
  getAgentesOptions,
  getProjetosOptions,
  getEditaisOptions,
  getOrganizacoesOptions,
  getEquipesEditaisOptions,
  buildPropostaPayload,
  statusPropostaEditalOptions,
  formatBRLNumber,
  type StatusPropostaEdital,
  type PropostaEdital,
  type SimpleOption,
  type EquipeEditalOption,
} from "@/data/propostasEdital";
import { toast } from "sonner";

const PROPOSTA_EDITAL_NEXT_STEP_KEY =
  "aurit:propostas-edital:next-step-card";

interface PropostaEditalNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

interface FormState {
  tituloProjeto: string;
  resumoProjeto: string;
  justificativaProjeto: string;
  metodologiaExecucao: string;
  democratizacaoAcesso: string;
  acoesAcessibilidade: string;
  impactoEsperado: string;
  valorSolicitado: string;
  valorContrapartida: string;
  dataSubmissao: string;
  statusPropostaEdital: StatusPropostaEdital | "";
  organizacao: string;
  edital: string;
  projeto: string;
  agente: string;
  observacoesInternas: string;
  motivoReprovacao: string;
}

const initial: FormState = {
  tituloProjeto: "",
  resumoProjeto: "",
  justificativaProjeto: "",
  metodologiaExecucao: "",
  democratizacaoAcesso: "",
  acoesAcessibilidade: "",
  impactoEsperado: "",
  valorSolicitado: "",
  valorContrapartida: "",
  dataSubmissao: "",
  statusPropostaEdital: "",
  organizacao: "",
  edital: "",
  projeto: "",
  agente: "",
  observacoesInternas: "",
  motivoReprovacao: "",
};

function salvarProximaAcaoPropostaEdital() {
  const card: PropostaEditalNextStepCardData = {
    titulo: "Após estruturar a proposta, acompanhe a habilitação do projeto",
    descricao:
      "A habilitação ajuda a controlar prazos, envio de documentos, exigências, regularizações e resultado da análise da proposta no edital, sem substituir o cadastro oficial dos documentos da organização.",
    acaoLabel: "Cadastrar habilitação",
    acaoUrl: "/habilitacoes-propostas/novo",
    acaoSecundariaLabel: "Ver propostas",
    acaoSecundariaUrl: "/propostas-edital",
    variante: "pendente",
  };

  sessionStorage.setItem(
    PROPOSTA_EDITAL_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  const value = Number(digits) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseBRL(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");

  return digits ? Number(digits) / 100 : 0;
}

function numberToBRL(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "";
}

function normalizeId(value?: string | number | null) {
  if (value === null || value === undefined) return "";

  return String(value).trim();
}

function shouldRequireDataSubmissao(status: StatusPropostaEdital | "") {
  return status !== "" && status !== "EM_PREPARACAO";
}

function propostaToForm(proposta: PropostaEdital): FormState {
  return {
    tituloProjeto: proposta.tituloProjeto ?? "",
    resumoProjeto: proposta.resumoProjeto ?? "",
    justificativaProjeto: proposta.justificativaProjeto ?? "",
    metodologiaExecucao: proposta.metodologiaExecucao ?? "",
    democratizacaoAcesso: proposta.democratizacaoAcesso ?? "",
    acoesAcessibilidade: proposta.acoesAcessibilidade ?? "",
    impactoEsperado: proposta.impactoEsperado ?? "",
    valorSolicitado: numberToBRL(proposta.valorSolicitado),
    valorContrapartida: numberToBRL(proposta.valorContrapartida),
    dataSubmissao: proposta.dataSubmissao ?? "",
    statusPropostaEdital: proposta.statusPropostaEdital ?? "",
    organizacao: normalizeId(proposta.organizacao),
    edital: normalizeId(proposta.edital),
    projeto: normalizeId(proposta.projeto),
    agente: normalizeId(proposta.agente),
    observacoesInternas: proposta.observacoesInternas ?? "",
    motivoReprovacao: proposta.motivoReprovacao ?? "",
  };
}

function getOptionNome(
  options: SimpleOption[],
  id: string,
  fallback: string,
) {
  return (
    options.find((option) => normalizeId(option.id) === normalizeId(id))?.nome ||
    `${fallback} ${id}`
  );
}

function withSelectedSimpleOption(
  options: SimpleOption[],
  selectedId: string,
  selectedName: string,
  fallback: string,
): SimpleOption[] {
  const value = normalizeId(selectedId);

  if (!value) return options;

  const exists = options.some((option) => normalizeId(option.id) === value);

  if (exists) return options;

  return [
    {
      id: value,
      nome: selectedName || `${fallback} ${value}`,
    },
    ...options,
  ];
}

export default function PropostaEditalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(initial);
  const [existingProposta, setExistingProposta] =
    useState<PropostaEdital | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [organizacoes, setOrganizacoes] = useState<SimpleOption[]>([]);
  const [editais, setEditais] = useState<SimpleOption[]>([]);
  const [projetos, setProjetos] = useState<SimpleOption[]>([]);
  const [agentes, setAgentes] = useState<SimpleOption[]>([]);
  const [equipes, setEquipes] = useState<EquipeEditalOption[]>([]);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const organizacaoSelectValue =
    form.organizacao || normalizeId(existingProposta?.organizacao);

  const editalSelectValue =
    form.edital || normalizeId(existingProposta?.edital);

  const projetoSelectValue =
    form.projeto || normalizeId(existingProposta?.projeto);

  const agenteSelectValue =
    form.agente || normalizeId(existingProposta?.agente);

  const organizacoesComFallback = useMemo(() => {
    return withSelectedSimpleOption(
      organizacoes,
      organizacaoSelectValue,
      getOptionNome(organizacoes, organizacaoSelectValue, "Organização"),
      "Organização",
    );
  }, [organizacoes, organizacaoSelectValue]);

  const editaisComFallback = useMemo(() => {
    return withSelectedSimpleOption(
      editais,
      editalSelectValue,
      getOptionNome(editais, editalSelectValue, "Edital"),
      "Edital",
    );
  }, [editais, editalSelectValue]);

  const projetosComFallback = useMemo(() => {
    return withSelectedSimpleOption(
      projetos,
      projetoSelectValue,
      getOptionNome(projetos, projetoSelectValue, "Projeto"),
      "Projeto",
    );
  }, [projetos, projetoSelectValue]);

  const agentesComFallback = useMemo(() => {
    return withSelectedSimpleOption(
      agentes,
      agenteSelectValue,
      getOptionNome(agentes, agenteSelectValue, "Agente"),
      "Agente",
    );
  }, [agentes, agenteSelectValue]);

  useEffect(() => {
    let active = true;

    async function carregarTudo() {
      try {
        setLoading(true);

        const [orgs, eds, projs, ags, eqs, proposta] = await Promise.all([
          getOrganizacoesOptions(),
          getEditaisOptions(),
          getProjetosOptions(),
          getAgentesOptions(),
          getEquipesEditaisOptions(),
          id ? getPropostaEditalById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setOrganizacoes(orgs);
        setEditais(eds);
        setProjetos(projs);
        setAgentes(ags);
        setEquipes(eqs);

        if (proposta) {
          const formData = propostaToForm(proposta);

          setExistingProposta({
            ...proposta,
            organizacao: formData.organizacao,
            edital: formData.edital,
            projeto: formData.projeto,
            agente: formData.agente,
          });

          setForm(formData);
        } else {
          setExistingProposta(null);

          setForm({
            ...initial,
            organizacao: orgs.length === 1 ? normalizeId(orgs[0].id) : "",
            statusPropostaEdital: "EM_PREPARACAO",
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar proposta.",
        );
        navigate("/propostas-edital");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarTudo();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const equipe = useMemo(() => {
    if (!id) return [];

    return equipes.filter(
      (item) => normalizeId(item.propostaEditalId) === normalizeId(id),
    );
  }, [equipes, id]);

  function getFormComVinculos(): FormState {
    return {
      ...form,
      organizacao: organizacaoSelectValue,
      edital: editalSelectValue,
      projeto: projetoSelectValue,
      agente: agenteSelectValue,
      motivoReprovacao:
        form.statusPropostaEdital === "REPROVADA"
          ? form.motivoReprovacao
          : "",
    };
  }

  function validar(formValidacao: FormState) {
    const required: [keyof FormState, string][] = [
      ["tituloProjeto", "Informe o título do projeto."],
      ["resumoProjeto", "Informe o resumo do projeto."],
      ["justificativaProjeto", "Informe a justificativa."],
      ["metodologiaExecucao", "Informe a metodologia de execução."],
      ["democratizacaoAcesso", "Informe a democratização de acesso."],
      ["acoesAcessibilidade", "Informe as ações de acessibilidade."],
      ["impactoEsperado", "Informe o impacto esperado."],
      ["organizacao", "Selecione a organização."],
      ["edital", "Selecione o edital."],
      ["projeto", "Selecione o projeto base."],
      ["agente", "Selecione o agente responsável."],
      ["statusPropostaEdital", "Selecione o status da proposta."],
    ];

    for (const [key, message] of required) {
      if (!String(formValidacao[key] ?? "").trim()) {
        toast.error(message);
        return false;
      }
    }

    if (!parseBRL(formValidacao.valorSolicitado)) {
      toast.error("Informe o valor solicitado.");
      return false;
    }

    const status = formValidacao.statusPropostaEdital;

    if (!status) {
      toast.error("Selecione o status da proposta.");
      return false;
    }

    if (shouldRequireDataSubmissao(status) && !formValidacao.dataSubmissao) {
      toast.error(
        "Informe a data de submissão para propostas já submetidas ou em andamento.",
      );
      return false;
    }

    if (status === "REPROVADA" && !formValidacao.motivoReprovacao.trim()) {
      toast.error("Informe o motivo da reprovação.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

    if (!validar(formComVinculos)) return;

    try {
      setSaving(true);

      const status = formComVinculos.statusPropostaEdital as StatusPropostaEdital;

      const item: PropostaEdital = {
        id: id ?? "",
        tituloProjeto: formComVinculos.tituloProjeto.trim(),
        resumoProjeto: formComVinculos.resumoProjeto.trim(),
        justificativaProjeto: formComVinculos.justificativaProjeto.trim(),
        metodologiaExecucao: formComVinculos.metodologiaExecucao.trim(),
        democratizacaoAcesso: formComVinculos.democratizacaoAcesso.trim(),
        acoesAcessibilidade: formComVinculos.acoesAcessibilidade.trim(),
        impactoEsperado: formComVinculos.impactoEsperado.trim(),
        valorSolicitado: parseBRL(formComVinculos.valorSolicitado),
        valorContrapartida: formComVinculos.valorContrapartida
          ? parseBRL(formComVinculos.valorContrapartida)
          : undefined,
        dataSubmissao: formComVinculos.dataSubmissao || "",
        statusPropostaEdital: status,
        organizacao: normalizeId(formComVinculos.organizacao),
        edital: normalizeId(formComVinculos.edital),
        projeto: normalizeId(formComVinculos.projeto),
        agente: normalizeId(formComVinculos.agente),
        observacoesInternas: formComVinculos.observacoesInternas.trim(),
        motivoReprovacao:
          status === "REPROVADA"
            ? formComVinculos.motivoReprovacao.trim()
            : "",
        equipesEditaisIds: equipe.map((item) => item.id),
      };

      const payload = buildPropostaPayload(item);

      if (editando && id) {
        await updatePropostaEdital(Number(id), payload);
        toast.success("Proposta atualizada com sucesso.");
      } else {
        await createPropostaEdital(payload);
        salvarProximaAcaoPropostaEdital();
        toast.success("Proposta cadastrada com sucesso.");
      }

      navigate("/propostas-edital");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar proposta.",
      );
    } finally {
      setSaving(false);
    }
  }

  const memberDisplayName = (item: EquipeEditalOption) => {
    if (item.colaboradorId) return `Colaborador #${item.colaboradorId}`;
    if (item.integranteId) return `Integrante #${item.integranteId}`;

    return "—";
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/propostas-edital")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Proposta de Edital
            </h1>

            <HelpTooltip
              text="Cadastre a proposta que será inscrita no edital, reunindo informações do projeto, justificativa, metodologia, acessibilidade, impacto esperado, valores, responsáveis e vínculos institucionais. Esta página ajuda a estruturar a candidatura antes do envio oficial."
              label="Proposta de Edital"
              size="md"
              side="bottom"
              align="start"
            />
          </div>
        </div>

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Use esta página para estruturar a proposta antes do envio oficial ao
            edital. Preencha os textos com atenção, revise valores, responsáveis
            e vínculos institucionais, e mantenha o status atualizado conforme a
            evolução da candidatura.
          </p>
        </div>

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            A <span className="font-semibold">Proposta do Edital</span>{" "}
            representa a candidatura da organização para uma oportunidade
            específica. Ela pode usar um projeto já cadastrado como base, mas
            deve ser ajustada conforme as regras, linguagem e critérios do
            edital selecionado.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={FileText} title="Identificação da proposta">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="tituloProjeto"
                  required
                  tooltip="Informe o título do projeto exatamente como será apresentado no edital. Ex.: Oficinas Culturais no Território."
                >
                  Título do Projeto
                </FieldLabel>

                <Input
                  id="tituloProjeto"
                  value={form.tituloProjeto}
                  onChange={(e) => set("tituloProjeto", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="resumoProjeto"
                  required
                  tooltip="Apresente uma síntese clara da proposta, explicando o que será realizado, para quem, onde, por qual motivo e com qual finalidade."
                >
                  Resumo do Projeto
                </FieldLabel>

                <Textarea
                  id="resumoProjeto"
                  value={form.resumoProjeto}
                  onChange={(e) => set("resumoProjeto", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={BookOpen} title="Conteúdo do projeto">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="justificativaProjeto"
                  required
                  tooltip="Explique por que o projeto é importante, qual necessidade, demanda ou oportunidade cultural ele atende, quem será beneficiado e como contribui para a comunidade, território ou público envolvido."
                >
                  Justificativa
                </FieldLabel>

                <Textarea
                  id="justificativaProjeto"
                  value={form.justificativaProjeto}
                  onChange={(e) => set("justificativaProjeto", e.target.value)}
                  rows={5}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="metodologiaExecucao"
                  required
                  tooltip="Descreva como o projeto será executado na prática, informando etapas, atividades, cronograma, equipe envolvida, forma de organização, acompanhamento e registro das ações."
                >
                  Metodologia de Execução
                </FieldLabel>

                <Textarea
                  id="metodologiaExecucao"
                  value={form.metodologiaExecucao}
                  onChange={(e) => set("metodologiaExecucao", e.target.value)}
                  rows={5}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Accessibility} title="Acesso, acessibilidade e impacto">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="democratizacaoAcesso"
                  required
                  tooltip="Explique como o projeto facilitará o acesso do público às ações culturais, considerando gratuidade, localização, divulgação, acolhimento, público prioritário, horários, território ou redução de barreiras de participação."
                >
                  Democratização de Acesso
                </FieldLabel>

                <Textarea
                  id="democratizacaoAcesso"
                  value={form.democratizacaoAcesso}
                  onChange={(e) => set("democratizacaoAcesso", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="acoesAcessibilidade"
                  required
                  tooltip="Descreva as medidas previstas para ampliar a participação e compreensão do público, considerando acessibilidade física, comunicacional, social, territorial, econômica ou pedagógica."
                >
                  Ações de Acessibilidade
                </FieldLabel>

                <Textarea
                  id="acoesAcessibilidade"
                  value={form.acoesAcessibilidade}
                  onChange={(e) => set("acoesAcessibilidade", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="impactoEsperado"
                  required
                  tooltip="Descreva os efeitos esperados com a realização do projeto, como fortalecimento cultural, participação comunitária, formação de público, desenvolvimento de habilidades, visibilidade, inclusão ou ampliação do acesso à cultura."
                >
                  Impacto Esperado
                </FieldLabel>

                <Textarea
                  id="impactoEsperado"
                  value={form.impactoEsperado}
                  onChange={(e) => set("impactoEsperado", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Wallet} title="Valores e submissão">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="valorSolicitado"
                  required
                  tooltip="Informe o valor que será solicitado ao edital para execução da proposta, conforme orçamento apresentado. Ex.: R$ 50.000,00."
                >
                  Valor Solicitado
                </FieldLabel>

                <Input
                  id="valorSolicitado"
                  inputMode="numeric"
                  value={form.valorSolicitado}
                  onChange={(e) =>
                    set("valorSolicitado", maskBRL(e.target.value))
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="valorContrapartida"
                  tooltip="Informe o valor estimado da contrapartida, quando o edital exigir ou quando a organização oferecer recursos próprios, apoio, serviços, estrutura, equipe ou outras contribuições mensuráveis."
                >
                  Valor de Contrapartida
                </FieldLabel>

                <Input
                  id="valorContrapartida"
                  inputMode="numeric"
                  value={form.valorContrapartida}
                  onChange={(e) =>
                    set("valorContrapartida", maskBRL(e.target.value))
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataSubmissao"
                  tooltip="Informe a data em que a proposta foi enviada, protocolada ou submetida oficialmente ao edital. Para propostas em preparação, esta data pode ficar em branco."
                >
                  Data de Submissão
                </FieldLabel>

                <Input
                  id="dataSubmissao"
                  type="date"
                  value={form.dataSubmissao}
                  onChange={(e) => set("dataSubmissao", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="statusPropostaEdital"
                  required
                  tooltip="Indique a situação atual da proposta. Use “Em preparação” enquanto estiver sendo estruturada, “Submetida” após o envio oficial, “Em habilitação” na fase documental, “Em diligência” quando houver solicitação de ajuste, “Aprovada” quando selecionada, “Suplente” quando estiver em lista de espera, “Reprovada” quando não for selecionada, “Cancelada” quando a proposta for suspensa, “Em execução” durante a realização do projeto, “Em prestação de contas” durante a comprovação e “Finalizada” quando o processo estiver encerrado."
                >
                  Status da Proposta
                </FieldLabel>

                <Select
                  value={form.statusPropostaEdital}
                  onValueChange={(value) => {
                    if (visualizando) return;

                    setForm((prev) => ({
                      ...prev,
                      statusPropostaEdital: value as StatusPropostaEdital,
                      motivoReprovacao:
                        value === "REPROVADA"
                          ? prev.motivoReprovacao
                          : "",
                    }));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="statusPropostaEdital">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusPropostaEditalOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {form.statusPropostaEdital === "REPROVADA" && (
                <Field>
                  <FieldLabel
                    htmlFor="motivoReprovacao"
                    required={!visualizando}
                    tooltip="Informe o motivo oficial ou uma observação interna sobre a reprovação da proposta."
                  >
                    Motivo de Reprovação
                  </FieldLabel>

                  <Textarea
                    id="motivoReprovacao"
                    value={form.motivoReprovacao}
                    onChange={(e) => set("motivoReprovacao", e.target.value)}
                    rows={4}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              )}
            </div>
          </Section>

          <Section icon={Building2} title="Vínculos institucionais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="organizacao"
                  required
                  tooltip="Selecione a organização responsável pela inscrição e execução da proposta."
                >
                  Organização
                </FieldLabel>

                <Select
                  value={organizacaoSelectValue}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("organizacao", normalizeId(value));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="organizacao">
                    <SelectValue placeholder="Selecione a organização" />
                  </SelectTrigger>

                  <SelectContent>
                    {organizacoesComFallback.length === 0 ? (
                      <SelectItem value="sem-organizacao" disabled>
                        Nenhuma organização cadastrada
                      </SelectItem>
                    ) : (
                      organizacoesComFallback.map((organizacao) => (
                        <SelectItem
                          key={normalizeId(organizacao.id)}
                          value={normalizeId(organizacao.id)}
                        >
                          {organizacao.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="edital"
                  required
                  tooltip="Selecione o edital ao qual esta proposta será vinculada. Esse vínculo conecta a candidatura ao processo seletivo correto."
                >
                  Edital
                </FieldLabel>

                <Select
                  value={editalSelectValue}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("edital", normalizeId(value));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="edital">
                    <SelectValue placeholder="Selecione o edital" />
                  </SelectTrigger>

                  <SelectContent>
                    {editaisComFallback.length === 0 ? (
                      <SelectItem value="sem-edital" disabled>
                        Nenhum edital cadastrado
                      </SelectItem>
                    ) : (
                      editaisComFallback.map((edital) => (
                        <SelectItem
                          key={normalizeId(edital.id)}
                          value={normalizeId(edital.id)}
                        >
                          {edital.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="projeto"
                  required
                  tooltip="Selecione o projeto que servirá como referência para esta proposta. Revise e adapte os textos conforme as exigências, critérios e linguagem do edital."
                >
                  Projeto Base
                </FieldLabel>

                <Select
                  value={projetoSelectValue}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("projeto", normalizeId(value));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione o projeto base" />
                  </SelectTrigger>

                  <SelectContent>
                    {projetosComFallback.length === 0 ? (
                      <SelectItem value="sem-projeto" disabled>
                        Nenhum projeto cadastrado
                      </SelectItem>
                    ) : (
                      projetosComFallback.map((projeto) => (
                        <SelectItem
                          key={normalizeId(projeto.id)}
                          value={normalizeId(projeto.id)}
                        >
                          {projeto.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="agente"
                  required
                  tooltip="Selecione o agente cultural responsável pela inscrição ou representação da proposta no edital."
                >
                  Agente Responsável
                </FieldLabel>

                <Select
                  value={agenteSelectValue}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("agente", normalizeId(value));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="agente">
                    <SelectValue placeholder="Selecione o agente" />
                  </SelectTrigger>

                  <SelectContent>
                    {agentesComFallback.length === 0 ? (
                      <SelectItem value="sem-agente" disabled>
                        Nenhum agente cadastrado
                      </SelectItem>
                    ) : (
                      agentesComFallback.map((agente) => (
                        <SelectItem
                          key={normalizeId(agente.id)}
                          value={normalizeId(agente.id)}
                        >
                          {agente.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Users} title="Equipe do edital">
            <p className="mb-3 text-xs text-muted-foreground">
              Após salvar a proposta, acesse o módulo Equipe do Edital para
              cadastrar ou vincular os membros responsáveis.
            </p>

            {isEdit && equipe.length > 0 ? (
              <div className="overflow-hidden rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {[
                        "Nome",
                        "Função",
                        "Carga horária",
                        "Valor previsto",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {equipe.map((item) => (
                      <tr key={item.id} className="border-t border-border/70">
                        <td className="px-3 py-2 text-foreground">
                          {memberDisplayName(item)}
                        </td>

                        <td className="px-3 py-2 text-muted-foreground">
                          {item.funcaoProjeto || "—"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {typeof item.cargaHorariaPrevista === "number"
                            ? `${item.cargaHorariaPrevista}h`
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-foreground">
                          {formatBRLNumber(item.valorPrevisto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? "Nenhum membro vinculado a esta proposta ainda."
                    : "Após salvar a proposta, acesse o módulo Equipe do Edital para cadastrar ou vincular os membros responsáveis."}
                </p>
              </div>
            )}

            {!visualizando && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/equipe-edital/novo${id ? `?proposta=${id}` : ""}`,
                    )
                  }
                >
                  Adicionar membro da equipe
                </Button>

                {isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/equipe-edital?proposta=${id}`)}
                  >
                    Ver equipe vinculada
                  </Button>
                )}
              </div>
            )}
          </Section>

          <Section icon={ClipboardList} title="Observações internas">
            <Field>
              <FieldLabel
                htmlFor="observacoesInternas"
                tooltip="Registre observações internas sobre a proposta, como pendências, ajustes necessários, decisões da equipe, pontos de atenção, diligências, prazos ou informações que não farão parte do texto oficial enviado ao edital."
              >
                Observações Internas
              </FieldLabel>

              <Textarea
                id="observacoesInternas"
                value={form.observacoesInternas}
                onChange={(e) => set("observacoesInternas", e.target.value)}
                rows={3}
                disabled={bloqueado}
                readOnly={visualizando}
              />

              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Campo interno — não faz parte do texto oficial do edital.
              </p>
            </Field>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/propostas-edital")}
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
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
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

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
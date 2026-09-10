import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  BookOpen,
  Accessibility,
  Wallet,
  Link2,
  Users,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { ImportDataButton } from "@/components/ImportDataButton";
import { StatusPill } from "@/components/StatusPill";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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

const PROPOSTA_EDITAL_NEXT_STEP_KEY = "aurit:propostas-edital:next-step-card";
const SELECIONE = "__selecione__";

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
    titulo: "Após estruturar a proposta, organize a equipe do projeto",
    descricao:
      "Com a proposta cadastrada, o próximo passo é vincular os colaboradores que participarão da execução do projeto, definindo funções, responsabilidades e a composição da equipe envolvida.",
    acaoLabel: "Cadastrar equipe da proposta",
    acaoUrl: "/equipe-edital/novo",
    acaoSecundariaLabel: "Ver propostas",
    acaoSecundariaUrl: "/propostas-edital",
    variante: "pendente",
  };

  sessionStorage.setItem(PROPOSTA_EDITAL_NEXT_STEP_KEY, JSON.stringify(card));
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

function getOptionNome(options: SimpleOption[], id: string, fallback: string) {
  return (
    options.find((option) => normalizeId(option.id) === normalizeId(id))
      ?.nome || `${fallback} ${id}`
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

  useImportFormFill("propostas-editais", setForm);

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
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar proposta.",
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
        form.statusPropostaEdital === "REPROVADA" ? form.motivoReprovacao : "",
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
      ["statusPropostaEdital", "Selecione a situação da proposta."],
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
      toast.error("Selecione a situação da proposta.");
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

      const status =
        formComVinculos.statusPropostaEdital as StatusPropostaEdital;

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
          status === "REPROVADA" ? formComVinculos.motivoReprovacao.trim() : "",
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
        error instanceof Error ? error.message : "Erro ao salvar proposta.",
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
        <BackButton to="/propostas-edital" />

        <ListPageHeader
          title="Propostas de Edital"
          tooltip="Nesta página são cadastradas e acompanhadas as propostas que serão apresentadas aos editais, reunindo as informações necessárias para estruturar o projeto, demonstrar sua relevância, planejar sua execução e acompanhar sua participação no processo seletivo. Também podem ser registrados os valores previstos, a equipe envolvida, os responsáveis e as informações de submissão e resultado."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/propostas-edital")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1 — Vínculos da proposta */}
          <Section
            icon={Link2}
            title="Vínculos da proposta"
            description="Defina o contexto em que a proposta será elaborada, relacionando-a à organização que irá apresentá-la, ao edital correspondente e ao projeto que servirá como referência."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="organizacao"
                  required
                  tooltip="Selecione a organização que apresentará a proposta ao edital e será responsável por sua execução caso ela seja selecionada."
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
                  tooltip="Selecione o edital ao qual esta proposta será apresentada. O edital define regras, prazos, valores e exigências que devem ser considerados no preenchimento da proposta."
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
                  tooltip="Selecione o projeto já cadastrado que servirá como base para esta proposta. As informações da proposta podem ser adaptadas para atender às exigências específicas do edital."
                >
                  Projeto de Referência
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
                    <SelectValue placeholder="Selecione o projeto" />
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
            </div>
          </Section>

          {/* 2 — Identificação da proposta */}
          <Section
            icon={FileText}
            title="Identificação da proposta"
            description="Apresente a proposta de forma clara e resumida, permitindo compreender rapidamente qual projeto será submetido ao edital e o que ele pretende realizar."
          >
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="tituloProjeto"
                  required
                  tooltip="Informe o título pelo qual o projeto será apresentado nesta proposta. Ele pode ser igual ao nome do projeto de referência ou adaptado para este edital."
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
                  tooltip="Apresente uma visão geral do projeto, explicando de forma breve o que será realizado, para quem, onde acontecerá e quais resultados se pretende alcançar."
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

          {/* 3 — Conteúdo do projeto */}
          <Section
            icon={BookOpen}
            title="Conteúdo do projeto"
            description="Fundamente a proposta e explique como ela será desenvolvida, demonstrando sua relevância e a forma prevista para colocar as ações em prática."
          >
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="justificativaProjeto"
                  required
                  tooltip="Explique por que o projeto é necessário e relevante. Apresente a situação, necessidade ou oportunidade que motivou a proposta e indique por que a realização do projeto é importante para o público, a comunidade ou o território."
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
                  tooltip="Explique como o projeto será realizado na prática. Descreva as principais etapas, atividades, formas de organização, participação da equipe e como a execução será acompanhada."
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

          {/* 4 — Acesso, acessibilidade e impacto */}
          <Section
            icon={Accessibility}
            title="Acesso, acessibilidade e impacto"
            description="Demonstre como o projeto pretende alcançar e incluir o público e quais mudanças ou benefícios são esperados a partir de sua realização."
          >
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="democratizacaoAcesso"
                  required
                  tooltip="Explique como o projeto ampliará o acesso e facilitará a participação do público. Considere, quando aplicável, gratuidade, localização, horários, divulgação, público prioritário e outras medidas que reduzam barreiras de participação."
                >
                  Democratização do Acesso
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
                  tooltip="Descreva as medidas previstas para permitir a participação de pessoas com diferentes necessidades. Podem incluir Libras, audiodescrição, legendas, acessibilidade física, linguagem simples ou outras adaptações adequadas ao projeto."
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
                  tooltip="Descreva as mudanças, benefícios ou resultados que se espera alcançar com o projeto para o público atendido, a comunidade, o território ou a área de atuação envolvida."
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

          {/* 5 — Valores da proposta */}
          <Section
            icon={Wallet}
            title="Valores da proposta"
            description="Registre os recursos financeiros necessários para viabilizar a proposta, considerando o valor solicitado ao edital e eventual participação financeira da própria organização."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="valorSolicitado"
                  required
                  tooltip="Informe o valor que a organização está solicitando ao edital para executar esta proposta. Esse valor deve ser compatível com o orçamento apresentado."
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
                  tooltip="Informe o valor correspondente aos recursos próprios ou outras contribuições da organização destinadas à realização da proposta, quando o edital exigir ou quando houver contrapartida prevista."
                >
                  Valor da Contrapartida
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
            </div>
          </Section>

          {/* 6 — Equipe da proposta */}
          <Section
            icon={Users}
            title="Equipe da proposta"
            description="Organize as pessoas previstas para participar da execução da proposta, mantendo registradas suas funções, cargas horárias e valores previstos."
          >
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
                    ? "Nenhum integrante vinculado a esta proposta."
                    : "Salve a proposta para adicionar os integrantes da equipe."}
                </p>
              </div>
            )}

            {!visualizando && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="glassSecondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/equipe-edital/novo${id ? `?proposta=${id}` : ""}`,
                    )
                  }
                >
                  Adicionar integrante
                </Button>

                {isEdit && (
                  <Button
                    type="button"
                    variant="glassSecondary"
                    size="sm"
                    onClick={() => navigate(`/equipe-edital?proposta=${id}`)}
                  >
                    Ver equipe
                  </Button>
                )}
              </div>
            )}
          </Section>

          {/* 7 — Acompanhamento da proposta */}
          <Section
            icon={ClipboardList}
            title="Acompanhamento da proposta"
            description="Acompanhe a proposta ao longo do processo do edital, mantendo definido o responsável interno e atualizadas as informações sobre envio e resultado."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="agente"
                  required
                  tooltip="Selecione o agente da organização responsável por acompanhar esta proposta, incluindo inscrição, envio de informações, prazos, diligências e outras etapas relacionadas ao edital."
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
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>

                  <SelectContent>
                    {agentesComFallback.length === 0 ? (
                      <SelectItem value="sem-agente" disabled>
                        Nenhum responsável cadastrado
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

              <Field>
                <FieldLabel
                  htmlFor="dataSubmissao"
                  tooltip="Informe a data em que a proposta foi efetivamente enviada, protocolada ou inscrita no edital. Se a proposta ainda estiver sendo preparada, deixe o campo em branco."
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
                  tooltip="Selecione a situação que representa o momento atual desta proposta, desde sua preparação e envio até as etapas posteriores do processo seletivo. Atualize o campo sempre que houver mudança."
                >
                  Situação da Proposta
                </FieldLabel>

                <Select
                  value={form.statusPropostaEdital || SELECIONE}
                  onValueChange={(value) => {
                    if (visualizando) return;

                    setForm((prev) => ({
                      ...prev,
                      statusPropostaEdital:
                        value === SELECIONE
                          ? ""
                          : (value as StatusPropostaEdital),
                      motivoReprovacao:
                        value === "REPROVADA" ? prev.motivoReprovacao : "",
                    }));
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="statusPropostaEdital">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={SELECIONE}>Selecione</SelectItem>
                    {statusPropostaEditalOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {form.statusPropostaEdital && (
                  <div className="mt-2">
                    <StatusPill
                      status={form.statusPropostaEdital}
                      context="proposta-edital"
                      ariaLabelPrefix="Situação da proposta"
                    />
                  </div>
                )}
              </Field>

              {form.statusPropostaEdital === "REPROVADA" && (
                <Field full>
                  <FieldLabel
                    htmlFor="motivoReprovacao"
                    required
                    tooltip="Informe o motivo apresentado para a reprovação da proposta. Quando não houver justificativa oficial, registre uma informação que ajude a organização a compreender e acompanhar esse resultado."
                  >
                    Motivo da Reprovação
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

          {/* 8 — Observações internas */}
          <Section
            icon={ClipboardList}
            title="Observações internas"
            description="Registre informações de acompanhamento que sejam úteis para a organização, mas que não façam parte do conteúdo oficial apresentado ao edital."
          >
            <Field>
              <FieldLabel
                htmlFor="observacoesInternas"
                tooltip="Registre informações importantes para o acompanhamento interno, como pendências, ajustes necessários, decisões da equipe, diligências, prazos, documentos que ainda precisam ser enviados ou outros pontos de atenção."
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
                Campo de uso interno — não faz parte do conteúdo oficial enviado
                ao edital.
              </p>
            </Field>
          </Section>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/propostas-edital")}
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
          pageTitle="Propostas de Edital"
          href="https://www.aurit.com.br/wiki/editais/propostas-de-edital"
        />
      </div>
    </AppLayout>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <FormSectionCard icon={icon} title={title} description={description}>
      {children}
    </FormSectionCard>
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

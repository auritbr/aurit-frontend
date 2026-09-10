import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CalendarRange,
  ClipboardList,
  Link2,
  Share2,
  Target,
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
import { FormMultiSelect } from "@/components/FormMultiSelect";
import { toast } from "sonner";
import {
  buildPlanoComunicacaoPayload,
  createEmptyPlanoComunicacao,
  createPlanoComunicacao,
  formatosComunicacaoOptions,
  getPlanoComunicacaoById,
  getOrganizacoesOptions,
  getPropostasEditalOptions,
  statusPlanoComunicacaoOptions,
  updatePlanoComunicacao,
  estrategiasDivulgacao,
  estrategiaLabel,
  type PlanoComunicacao,
  type PropostaEditalOption,
  type OrganizacaoOption,
  type StatusPlanoComunicacao,
} from "@/data/planoComunicacao";

const PLANO_COMUNICACAO_NEXT_STEP_KEY =
  "aurit:plano-comunicacao:next-step-card";

interface PlanoComunicacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPlanoComunicacao() {
  const card: PlanoComunicacaoNextStepCardData = {
    titulo:
      "Após cadastrar o plano de comunicação, organize as ações de divulgação",
    descricao:
      "As ações de divulgação ajudam a detalhar como o projeto será comunicado ao público, quais canais serão utilizados, quais resultados são esperados e quais registros poderão compor a prestação de contas.",
    acaoLabel: "Cadastrar ação de divulgação",
    acaoUrl: "/acoes-divulgacao/novo",
    acaoSecundariaLabel: "Ver planos de comunicação",
    acaoSecundariaUrl: "/plano-comunicacao",
    variante: "pendente",
  };

  sessionStorage.setItem(PLANO_COMUNICACAO_NEXT_STEP_KEY, JSON.stringify(card));
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaId: string,
  plano?: PlanoComunicacao | null,
) {
  return (
    propostas.find((proposta) => normalizeId(proposta.id) === propostaId)
      ?.nome ||
    plano?.nomePropostaEdital?.trim?.() ||
    `Proposta vinculada #${propostaId}`
  );
}

export default function PlanoComunicacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<PlanoComunicacao>(() =>
    createEmptyPlanoComunicacao(),
  );
  const [existingPlano, setExistingPlano] = useState<PlanoComunicacao | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);

  const bloqueado = visualizando || loading || saving;

  const propostaSelectValue =
    normalizeId(form.propostaEdital) ||
    normalizeId(existingPlano?.propostaEdital);
  const organizacaoSelectValue =
    normalizeId(form.organizacao) ||
    normalizeId(existingPlano?.organizacao) ||
    normalizeId(organizacoes[0]?.id);

  useImportFormFill("planos-comunicacao", setForm);

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);

        const [propostasData, organizacoesData, registroData] =
          await Promise.all([
            getPropostasEditalOptions(),
            getOrganizacoesOptions(),
            id ? getPlanoComunicacaoById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setPropostas(propostasData);
        setOrganizacoes(organizacoesData);

        if (registroData) {
          const registroNormalizado: PlanoComunicacao = {
            ...registroData,
            organizacao:
              normalizeId(registroData.organizacao) ||
              (organizacoesData.length === 1 ? organizacoesData[0].id : ""),
            propostaEdital: normalizeId(registroData.propostaEdital),
            estrategiasDivulgacao: registroData.estrategiasDivulgacao ?? [],
          };

          setExistingPlano(registroNormalizado);
          setForm(registroNormalizado);
        } else {
          setExistingPlano(null);
          setForm(createEmptyPlanoComunicacao());
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar registro.",
        );
        navigate("/plano-comunicacao");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarDados();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof PlanoComunicacao>(
    key: K,
    value: PlanoComunicacao[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const propostasComFallback = useMemo(() => {
    const options = [...propostas];
    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => normalizeId(proposta.id) === propostaId)
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId, existingPlano),
      });
    }

    return options;
  }, [propostas, propostaSelectValue, existingPlano]);

  const estrategiasSelecionadasLabels = form.estrategiasDivulgacao.map(
    (value) => estrategiaLabel(value),
  );

  const estrategiaOptions = estrategiasDivulgacao.map((item) => item.label);

  function handleEstrategiasChange(labels: string[]) {
    const values = labels
      .map(
        (label) =>
          estrategiasDivulgacao.find((item) => item.label === label)?.value ??
          label,
      )
      .filter(Boolean);

    set(
      "estrategiasDivulgacao",
      values as PlanoComunicacao["estrategiasDivulgacao"],
    );
  }

  function getFormComVinculos(): PlanoComunicacao {
    return {
      ...form,
      organizacao: organizacaoSelectValue,
      propostaEdital: propostaSelectValue,
    };
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

    if (!formComVinculos.nomePlano.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }

    if (!formComVinculos.quantidade.trim()) {
      toast.error("Informe a quantidade.");
      return;
    }

    if (!formComVinculos.objetivoComunicacao.trim()) {
      toast.error("Descreva o objetivo da comunicação.");
      return;
    }

    if (!formComVinculos.publicoAlvoComunicacao.trim()) {
      toast.error("Informe o público-alvo da comunicação.");
      return;
    }

    if (!formComVinculos.formatoPlanoComunicacao.trim()) {
      toast.error("Selecione o formato da comunicação.");
      return;
    }

    if (!formComVinculos.localCirculacaoComunicacao.trim()) {
      toast.error("Informe o local de circulação.");
      return;
    }

    if (formComVinculos.estrategiasDivulgacao.length === 0) {
      toast.error("Selecione ao menos uma estratégia de divulgação.");
      return;
    }

    if (!formComVinculos.dataInicio) {
      toast.error("Informe a data de início.");
      return;
    }

    if (!formComVinculos.dataFim) {
      toast.error("Informe a data de fim.");
      return;
    }

    if (formComVinculos.dataFim < formComVinculos.dataInicio) {
      toast.error("A data de fim não pode ser anterior à data de início.");
      return;
    }

    if (!formComVinculos.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!formComVinculos.organizacao) {
      toast.error("Selecione a organização responsável.");
      return;
    }

    if (!formComVinculos.status) {
      toast.error("Selecione o status do plano.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPlanoComunicacaoPayload(formComVinculos);

      if (editando && id) {
        await updatePlanoComunicacao(Number(id), payload);
        toast.success("Plano de comunicação atualizado com sucesso.");
      } else {
        await createPlanoComunicacao(payload);
        salvarProximaAcaoPlanoComunicacao();
        toast.success("Plano de comunicação cadastrado com sucesso.");
      }

      navigate("/plano-comunicacao");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar plano de comunicação.",
      );
    } finally {
      setSaving(false);
    }
  };

  const tituloPagina = visualizando
    ? "Plano de Comunicação"
    : editando
      ? "Plano de Comunicação"
      : "Plano de Comunicação";

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/plano-comunicacao" />
        <ListPageHeader
          title={tituloPagina}
          tooltip="Nesta página é elaborado o plano de comunicação do projeto apresentado ao edital, definindo o que se pretende alcançar com a comunicação, o público a ser atingido, os formatos e estratégias de divulgação, a quantidade prevista, os canais e locais de divulgação, o período de execução e a situação atual do plano."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/plano-comunicacao")!}
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
            {/* 1 — Vínculos institucionais */}
            <Section
              icon={Link2}
              title="Vínculos institucionais"
              description="Defina a organização responsável pelo plano e o projeto apresentado ao edital ao qual as ações de comunicação estarão relacionadas."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="organizacao"
                    required
                    tooltip="Selecione a organização responsável pelo planejamento e pela realização das ações previstas neste plano de comunicação."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={organizacaoSelectValue}
                    onValueChange={(value) =>
                      set("organizacao", normalizeId(value))
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="organizacao">
                      <SelectValue placeholder="Selecione a organização" />
                    </SelectTrigger>

                    <SelectContent>
                      {organizacoes.map((organizacao) => (
                        <SelectItem key={organizacao.id} value={organizacao.id}>
                          {organizacao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    required
                    tooltip="Selecione o projeto apresentado ao edital para o qual este plano de comunicação será utilizado."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  <Select
                    value={propostaSelectValue}
                    onValueChange={(value) =>
                      set("propostaEdital", normalizeId(value))
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta" />
                    </SelectTrigger>

                    <SelectContent>
                      {propostasComFallback.length === 0 ? (
                        <SelectItem value="sem-proposta" disabled>
                          Nenhuma proposta de edital cadastrada
                        </SelectItem>
                      ) : (
                        propostasComFallback.map((proposta) => (
                          <SelectItem
                            key={normalizeId(proposta.id)}
                            value={normalizeId(proposta.id)}
                          >
                            {proposta.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* 2 — Identificação do plano */}
            <Section
              icon={ClipboardList}
              title="Identificação do plano"
              description="Registre um nome que permita reconhecer este planejamento de comunicação."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomePlano"
                    required
                    tooltip="Informe um nome curto e objetivo que permita identificar facilmente este plano de comunicação."
                  >
                    Nome do Plano
                  </FieldLabel>

                  <Input
                    id="nomePlano"
                    value={form.nomePlano}
                    onChange={(e) => set("nomePlano", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </Section>

            {/* 3 — Objetivo e público-alvo */}
            <Section
              icon={Target}
              title="Objetivo e público-alvo"
              description="Defina o que este plano de comunicação pretende alcançar e identifique o público ao qual suas ações serão direcionadas."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="objetivoComunicacao"
                    required
                    tooltip="Descreva o que se pretende alcançar com este plano de comunicação, como divulgar as atividades, ampliar o alcance do projeto, mobilizar participantes ou fortalecer sua visibilidade."
                  >
                    Objetivo da Comunicação
                  </FieldLabel>

                  <Textarea
                    id="objetivoComunicacao"
                    value={form.objetivoComunicacao}
                    onChange={(e) => set("objetivoComunicacao", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="publicoAlvoComunicacao"
                    required
                    tooltip="Informe quais pessoas ou grupos se pretende alcançar com a comunicação, como participantes do projeto, moradores da comunidade, estudantes, famílias, artistas ou público em geral."
                  >
                    Público-alvo
                  </FieldLabel>

                  <Textarea
                    id="publicoAlvoComunicacao"
                    value={form.publicoAlvoComunicacao}
                    onChange={(e) =>
                      set("publicoAlvoComunicacao", e.target.value)
                    }
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </Section>

            {/* 4 — Estratégias e divulgação */}
            <Section
              icon={Share2}
              title="Estratégias e divulgação"
              description="Planeje como a comunicação chegará ao público, definindo os formatos, as estratégias, os espaços de divulgação e a quantidade de materiais, conteúdos ou ações previstos."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="formatoPlanoComunicacao"
                    required
                    tooltip="Selecione o formato principal previsto para a comunicação, como material gráfico, publicação em rede social, vídeo, rádio, site ou outro formato disponível."
                  >
                    Formato da Comunicação
                  </FieldLabel>

                  <Select
                    value={form.formatoPlanoComunicacao}
                    onValueChange={(value) =>
                      set("formatoPlanoComunicacao", value)
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="formatoPlanoComunicacao">
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>

                    <SelectContent>
                      {formatosComunicacaoOptions.map((formato) => (
                        <SelectItem key={formato} value={formato}>
                          {formato}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="estrategiasDivulgacao"
                    required
                    tooltip="Selecione uma ou mais estratégias que serão utilizadas para divulgar o projeto, como redes sociais, cartazes, rádio, imprensa, parcerias ou mobilização comunitária."
                  >
                    Estratégias de Divulgação
                  </FieldLabel>

                  <div
                    className={
                      visualizando ? "pointer-events-none opacity-80" : ""
                    }
                  >
                    <FormMultiSelect
                      id="estrategiasDivulgacao"
                      options={estrategiasDivulgacao.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      value={form.estrategiasDivulgacao}
                      onChange={(value) =>
                        set(
                          "estrategiasDivulgacao",
                          value as PlanoComunicacao["estrategiasDivulgacao"],
                        )
                      }
                      placeholder="Selecione uma ou mais estratégias"
                      searchPlaceholder="Pesquisar estratégia..."
                      disabled={bloqueado}
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="localCirculacaoComunicacao"
                    required
                    tooltip="Informe onde os materiais ou conteúdos serão divulgados ou distribuídos, como redes sociais, sites, escolas, equipamentos culturais, bairros, comunidades, eventos ou outros espaços."
                  >
                    Canais e locais de divulgação
                  </FieldLabel>

                  <Input
                    id="localCirculacaoComunicacao"
                    value={form.localCirculacaoComunicacao}
                    onChange={(e) =>
                      set("localCirculacaoComunicacao", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                    placeholder="Informe os canais e locais previstos"
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="quantidade"
                    required
                    tooltip="Informe a quantidade total prevista de materiais, conteúdos ou ações de comunicação que serão produzidos ou realizados neste plano. Ex.: 10 cartazes, 5 publicações ou 2 vídeos."
                  >
                    Quantidade Prevista
                  </FieldLabel>

                  <Input
                    id="quantidade"
                    value={form.quantidade}
                    onChange={(e) => set("quantidade", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </Section>

            {/* 5 — Período e situação */}
            <Section
              icon={CalendarRange}
              title="Período e situação"
              description="Organize quando as ações de comunicação deverão acontecer e acompanhe o andamento do plano durante sua execução."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataInicio"
                    required
                    tooltip="Informe a data prevista para o início das ações deste plano de comunicação."
                  >
                    Data de Início
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
                    required
                    tooltip="Informe a data prevista para o encerramento das ações deste plano de comunicação."
                  >
                    Data de Término
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
                    htmlFor="status"
                    required
                    tooltip="Selecione a situação que melhor representa o momento atual deste plano de comunicação."
                  >
                    Situação do Plano
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      set("status", value as StatusPlanoComunicacao)
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusPlanoComunicacaoOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {form.status && (
                    <div className="mt-2">
                      <StatusPill status={form.status} size="md" />
                    </div>
                  )}
                </Field>
              </div>
            </Section>
          </fieldset>

          {visualizando ? (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/plano-comunicacao")}
                disabled={saving}
              >
                Voltar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/plano-comunicacao")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                disabled={saving}
                className="h-9 px-5"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </form>
        <WikiFloatingButton
          pageTitle="Plano de Comunicação"
          href="https://www.aurit.com.br/wiki/editais/plano-de-comunicacao"
        />
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
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
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
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

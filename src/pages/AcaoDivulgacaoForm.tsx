import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Megaphone,
  Target,
  Link2,
  ClipboardList,
  Accessibility,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { useImportFormFill } from "@/hooks/useImportFormFill";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  buildAcaoDivulgacaoPayload,
  createAcaoDivulgacao,
  getAcaoDivulgacaoById,
  getPropostasEditaisOptions,
  updateAcaoDivulgacao,
  statusAcao,
  type AcaoDivulgacao,
  type AcaoStatusApi,
  type PropostaEditalOption,
} from "@/data/acoesDivulgacao";
import { toast } from "sonner";

const ACAO_DIVULGACAO_NEXT_STEP_KEY = "aurit:acoes-divulgacao:next-step-card";

interface AcaoDivulgacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoDivulgacao() {
  const card: AcaoDivulgacaoNextStepCardData = {
    titulo:
      "Após cadastrar a ação de divulgação, detalhe a aplicação dos recursos",
    descricao:
      "A aplicação de recursos ajuda a registrar como os valores da proposta serão utilizados, indicando o que será contratado, comprado ou executado, por que é necessário, em qual período será realizado, como será medido e qual valor está previsto.",
    acaoLabel: "Cadastrar aplicação de recursos",
    acaoUrl: "/aplicacao-de-recursos",
    acaoSecundariaLabel: "Ver ações de divulgação",
    acaoSecundariaUrl: "/acoes-divulgacao",
    variante: "pendente",
  };

  sessionStorage.setItem(ACAO_DIVULGACAO_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  id: string;
  nomeAcao: string;
  descricaoAcao: string;
  realizacaoAcao: string;
  objetivoAcao: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;
  status: AcaoStatusApi | "";
  propostaEditalId: string;
}

const initial: FormState = {
  id: "",
  nomeAcao: "",
  descricaoAcao: "",
  realizacaoAcao: "",
  objetivoAcao: "",
  acoesAcessibilidade: "",
  resultadoEsperado: "",
  produtosGerados: "",
  status: "",
  propostaEditalId: "",
};

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function mapAcaoToForm(acao: AcaoDivulgacao): FormState {
  return {
    id: normalizeId(acao.id),
    nomeAcao: acao.nomeAcao ?? "",
    descricaoAcao: acao.descricaoAcao ?? "",
    realizacaoAcao: acao.realizacaoAcao ?? "",
    objetivoAcao: acao.objetivoAcao ?? "",
    acoesAcessibilidade: acao.acoesAcessibilidade ?? "",
    resultadoEsperado: acao.resultadoEsperado ?? "",
    produtosGerados: acao.produtosGerados ?? "",
    status: acao.status ?? "",
    propostaEditalId: normalizeId(acao.propostaEditalId),
  };
}

function mapFormToAcao(form: FormState): AcaoDivulgacao {
  return {
    id: form.id,
    nomeAcao: form.nomeAcao,
    descricaoAcao: form.descricaoAcao,
    realizacaoAcao: form.realizacaoAcao,
    objetivoAcao: form.objetivoAcao,
    acoesAcessibilidade: form.acoesAcessibilidade,
    resultadoEsperado: form.resultadoEsperado,
    produtosGerados: form.produtosGerados,
    status: form.status || "ATIVO",
    propostaEditalId: form.propostaEditalId,
    nomePropostaEdital: "",
    editalId: "",
    nomeEdital: "",
    projetoId: "",
    nomeProjeto: "",
  };
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaEditalId: string,
  acao?: AcaoDivulgacao | null,
) {
  return (
    propostas.find((proposta) => normalizeId(proposta.id) === propostaEditalId)
      ?.nome ||
    acao?.nomePropostaEdital?.trim() ||
    `Proposta ${propostaEditalId}`
  );
}

export default function AcaoDivulgacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingAcao, setExistingAcao] = useState<AcaoDivulgacao | null>(null);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const propostaSelectValue =
    form.propostaEditalId || normalizeId(existingAcao?.propostaEditalId);

  useImportFormFill("acoes-divulgacao", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [propostasData, acaoData] = await Promise.all([
          getPropostasEditaisOptions(),
          id ? getAcaoDivulgacaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);

        if (acaoData) {
          const acaoNormalizada: AcaoDivulgacao = {
            ...acaoData,
            id: normalizeId(acaoData.id),
            propostaEditalId: normalizeId(acaoData.propostaEditalId),
          };

          setExistingAcao(acaoNormalizada);
          setForm(mapAcaoToForm(acaoNormalizada));
        } else {
          setExistingAcao(null);
          setForm(initial);
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.",
        );

        if (id) {
          navigate("/acoes-divulgacao");
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

  const propostasComFallback = useMemo(() => {
    const options = [...propostas];
    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => normalizeId(proposta.id) === propostaId)
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId, existingAcao),
        editalId: existingAcao?.editalId ?? "",
        edital: existingAcao?.nomeEdital ?? "",
        projetoId: existingAcao?.projetoId ?? "",
        projeto: existingAcao?.nomeProjeto ?? "",
      });
    }

    return options;
  }, [propostas, propostaSelectValue, existingAcao]);

  function getFormComProposta(): FormState {
    return {
      ...form,
      propostaEditalId: propostaSelectValue,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const formComProposta = getFormComProposta();

    if (!formComProposta.nomeAcao.trim()) {
      toast.error("Informe o nome da ação.");
      return;
    }

    if (!formComProposta.descricaoAcao.trim()) {
      toast.error("Informe a descrição da ação.");
      return;
    }

    if (!formComProposta.realizacaoAcao.trim()) {
      toast.error("Informe a realização da ação.");
      return;
    }

    if (!formComProposta.objetivoAcao.trim()) {
      toast.error("Informe o objetivo da ação.");
      return;
    }

    if (!formComProposta.acoesAcessibilidade.trim()) {
      toast.error("Informe as ações de acessibilidade.");
      return;
    }

    if (!formComProposta.resultadoEsperado.trim()) {
      toast.error("Informe o resultado esperado.");
      return;
    }

    if (!formComProposta.produtosGerados.trim()) {
      toast.error("Informe os produtos gerados.");
      return;
    }

    if (!formComProposta.status) {
      toast.error("Selecione o status da ação.");
      return;
    }

    if (!formComProposta.propostaEditalId) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildAcaoDivulgacaoPayload(
        mapFormToAcao(formComProposta),
      );

      if (editando && id) {
        await updateAcaoDivulgacao(Number(id), payload);
        toast.success("Ação de divulgação atualizada com sucesso.");
      } else {
        await createAcaoDivulgacao(payload);
        salvarProximaAcaoDivulgacao();
        toast.success("Ação de divulgação cadastrada com sucesso.");
      }

      navigate("/acoes-divulgacao");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a ação de divulgação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/acoes-divulgacao" />

        <ListPageHeader
          title="Ações de Divulgação"
          tooltip="Nesta página são registradas e acompanhadas as ações de divulgação do projeto apresentado ao edital, com informações sobre sua finalidade, forma de realização, acessibilidade, resultados esperados, produtos previstos e situação atual."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/acoes-divulgacao")!}
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
            {/* 1 — Vínculo da ação */}
            <Section
              icon={Link2}
              title="Vínculo da ação"
              description="Defina a qual projeto apresentado ao edital esta ação de divulgação pertence, para que seu planejamento e seus resultados fiquem relacionados ao contexto correto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    required
                    tooltip="Selecione o projeto apresentado ao edital ao qual esta ação de divulgação está relacionada."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  <Select
                    value={propostaSelectValue}
                    onValueChange={(v) =>
                      set("propostaEditalId", normalizeId(v))
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta de edital" />
                    </SelectTrigger>

                    <SelectContent>
                      {propostasComFallback.length === 0 ? (
                        <SelectItem value="sem-proposta" disabled>
                          Nenhuma proposta disponível
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

            {/* 2 — Dados principais */}
            <Section
              icon={Megaphone}
              title="Dados principais"
              description="Apresente a ação de divulgação, deixando claro o que será realizado, qual é sua finalidade e o que será comunicado ao público."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="nomeAcao"
                    required
                    tooltip="Informe um nome curto e objetivo que permita identificar facilmente a ação de divulgação."
                  >
                    Nome da Ação
                  </FieldLabel>

                  <Input
                    id="nomeAcao"
                    value={form.nomeAcao}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("nomeAcao", e.target.value)}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="objetivoAcao"
                    required
                    tooltip="Descreva o que se pretende alcançar com a ação, como ampliar o público, divulgar o projeto, mobilizar participantes ou fortalecer sua visibilidade."
                  >
                    Objetivo da Ação
                  </FieldLabel>

                  <Textarea
                    id="objetivoAcao"
                    value={form.objetivoAcao}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("objetivoAcao", e.target.value)}
                    rows={3}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoAcao"
                    required
                    tooltip="Apresente as principais características da ação de divulgação, indicando o conteúdo que será comunicado, o público a que se destina e outras informações relevantes."
                  >
                    Descrição da Ação
                  </FieldLabel>

                  <Textarea
                    id="descricaoAcao"
                    value={form.descricaoAcao}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("descricaoAcao", e.target.value)}
                    rows={4}
                  />
                </Field>
              </div>
            </Section>

            {/* 3 — Realização e acessibilidade */}
            <Section
              icon={Accessibility}
              title="Realização e acessibilidade"
              description="Planeje como a ação será colocada em prática e quais medidas serão adotadas para tornar sua comunicação acessível a diferentes públicos."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="realizacaoAcao"
                    required
                    tooltip="Descreva como a ação será realizada na prática, incluindo etapas, responsáveis, canais de divulgação, estratégias utilizadas e forma de execução."
                  >
                    Realização da Ação
                  </FieldLabel>

                  <Textarea
                    id="realizacaoAcao"
                    value={form.realizacaoAcao}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("realizacaoAcao", e.target.value)}
                    rows={4}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="acoesAcessibilidade"
                    required
                    tooltip="Descreva as medidas adotadas para tornar a comunicação acessível a diferentes públicos, como legendas, audiodescrição, Libras, linguagem simples, contraste adequado ou formatos alternativos."
                  >
                    Ações de Acessibilidade
                  </FieldLabel>

                  <Textarea
                    id="acoesAcessibilidade"
                    value={form.acoesAcessibilidade}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("acoesAcessibilidade", e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            </Section>

            {/* 4 — Resultados e produtos */}
            <Section
              icon={Target}
              title="Resultados e produtos"
              description="Defina o que se espera alcançar com a ação e quais materiais, conteúdos ou registros deverão resultar de sua realização."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="resultadoEsperado"
                    required
                    tooltip="Descreva os resultados que se espera alcançar com a ação, como alcance de público, engajamento, mobilização, aumento da visibilidade ou fortalecimento da comunicação do projeto."
                  >
                    Resultado Esperado
                  </FieldLabel>

                  <Textarea
                    id="resultadoEsperado"
                    value={form.resultadoEsperado}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("resultadoEsperado", e.target.value)}
                    rows={3}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="produtosGerados"
                    required
                    tooltip="Informe os materiais, conteúdos ou registros previstos como resultado desta ação, como cards, vídeos, cartazes, publicações, releases, fotografias ou materiais impressos."
                  >
                    Produtos Gerados
                  </FieldLabel>

                  <Textarea
                    id="produtosGerados"
                    value={form.produtosGerados}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    onChange={(e) => set("produtosGerados", e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            </Section>

            {/* 5 — Situação da ação */}
            <Section
              icon={ClipboardList}
              title="Situação da ação"
              description="Acompanhe em que momento da realização esta ação de divulgação se encontra e mantenha sua situação atualizada conforme ela avança."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required
                    tooltip="Informe a situação atual da ação de divulgação para acompanhar seu andamento."
                  >
                    Situação da Ação
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as AcaoStatusApi)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusAcao.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/acoes-divulgacao")}
              disabled={loading || saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={loading || saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Ações de Divulgação"
        href="https://www.aurit.com.br/wiki/acoes-culturais/acoes-de-divulgacao"
      />
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
  children: ReactNode;
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

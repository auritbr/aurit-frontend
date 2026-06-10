import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Megaphone,
  Target,
  Link2,
  PackageCheck,
  type LucideIcon,
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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

const ACAO_DIVULGACAO_NEXT_STEP_KEY =
  "aurit:acoes-divulgacao:next-step-card";

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

  sessionStorage.setItem(
    ACAO_DIVULGACAO_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
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
        <button
          type="button"
          onClick={() => navigate("/acoes-divulgacao")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Ação de Divulgação"
          tooltip="Registre a ação de divulgação vinculada à proposta de edital, descrevendo sua finalidade, forma de realização, acessibilidade, resultados esperados e produtos gerados."
        />

        {!visualizando && <FormLegend />}

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <Section icon={Megaphone} title="Identificação da ação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel htmlFor="nomeAcao" required>
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
                  tooltip="Explique o objetivo da ação, como ampliar o público, dar visibilidade ao projeto, fortalecer a comunicação ou registrar atividades realizadas."
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
                <FieldLabel htmlFor="descricaoAcao" required>
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

              <Field full>
                <FieldLabel
                  htmlFor="realizacaoAcao"
                  required
                  tooltip="Descreva como a ação será realizada na prática: etapas, responsáveis, dinâmica, canais utilizados e forma de execução."
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
            </div>
          </Section>

          <Section icon={Target} title="Acessibilidade, resultados e produtos">
            <div className="grid sm:grid-cols-2 gap-4">

              <Field full>
                <FieldLabel
                  htmlFor="acoesAcessibilidade"
                  required
                  tooltip="Descreva as medidas de acessibilidade adotadas na ação. Ex.: legendas, audiodescrição, linguagem simples, comunicação acessível ou formatos alternativos."
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

              <Field full>
                <FieldLabel
                  htmlFor="resultadoEsperado"
                  required
                  tooltip="Informe os resultados esperados com a ação, como alcance de público, engajamento, visibilidade, mobilização ou geração de registros."
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

              <Field full>
                <FieldLabel
                  htmlFor="produtosGerados"
                  required
                  tooltip="Informe quais produtos ou registros serão gerados pela ação. Ex.: cards, vídeos, cartazes, publicações, releases, relatórios, fotografias ou materiais impressos."
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

          <Section icon={Link2} title="Vínculo e acompanhamento">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="propostaEdital" required>
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

              <Field>
                <FieldLabel htmlFor="status" required>
                  Status
                </FieldLabel>

                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as AcaoStatusApi)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
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

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/acoes-divulgacao")}
              disabled={loading || saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-32"
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
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
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
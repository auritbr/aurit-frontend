import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Megaphone,
  Target,
  Share2,
  Link2,
  PackageCheck,
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
import { MultiSelect } from "@/components/MultiSelect";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import {
  buildAcaoDivulgacaoPayload,
  createAcaoDivulgacao,
  getAcaoDivulgacaoById,
  getColaboradoresOptions,
  getProjetosOptions,
  updateAcaoDivulgacao,
  estrategiasDivulgacao,
  statusAcao,
  estrategiaLabel,
  type AcaoDivulgacao,
  type AcaoStatusApi,
  type ColaboradorOption,
  type ProjetoOption,
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
    titulo: "Após cadastrar as ações de divulgação, registre as evidências",
    descricao:
      "As evidências de divulgação ajudam a comprovar como a ação foi comunicada ao público, reunindo publicações, links, prints, cards, cartazes, vídeos, fotos, materiais gráficos e outros registros importantes para relatórios e prestação de contas.",
    acaoLabel: "Cadastrar evidências",
    acaoUrl: "/plano-comunicacao/novo",
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
  dataInicio: string;
  dataFim: string;
  estrategiasDivulgacao: string[];
  status: AcaoStatusApi | "";
  projetoId: string;
  colaboradoresIds: string[];
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
  dataInicio: "",
  dataFim: "",
  estrategiasDivulgacao: [],
  status: "",
  projetoId: "",
  colaboradoresIds: [],
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
    dataInicio: acao.dataInicio ?? "",
    dataFim: acao.dataFim ?? "",
    estrategiasDivulgacao: acao.estrategiasDivulgacao ?? [],
    status: acao.status ?? "",
    projetoId: normalizeId(acao.projetoId),
    colaboradoresIds: (acao.colaboradoresIds ?? []).map(String),
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
    dataInicio: form.dataInicio,
    dataFim: form.dataFim,
    estrategiasDivulgacao: form.estrategiasDivulgacao,
    status: form.status || "ATIVO",
    projetoId: form.projetoId,
    colaboradoresIds: form.colaboradoresIds,
  };
}

function dataFimPassada(dataFim: string) {
  if (!dataFim) return false;

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return dataFim < `${ano}-${mes}-${dia}`;
}

function statusPermiteDataFimPassada(status: string) {
  return status === "INATIVO" || status === "CONCLUIDO";
}

function getProjetoNome(
  projetos: ProjetoOption[],
  projetoId: string,
  acao?: AcaoDivulgacao | null,
) {
  return (
    projetos.find((projeto) => normalizeId(projeto.id) === projetoId)?.nome ||
    (acao as any)?.projetoNome?.trim?.() ||
    (acao as any)?.nomeProjeto?.trim?.() ||
    `Projeto ${projetoId}`
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
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const projetoSelectValue =
    form.projetoId || normalizeId(existingAcao?.projetoId);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, colaboradoresData, acaoData] = await Promise.all([
          getProjetosOptions(),
          getColaboradoresOptions(),
          id ? getAcaoDivulgacaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);

        if (acaoData) {
          const projetoId = normalizeId(acaoData.projetoId);

          const acaoNormalizada: AcaoDivulgacao = {
            ...acaoData,
            id: normalizeId(acaoData.id),
            projetoId,
            colaboradoresIds: (acaoData.colaboradoresIds ?? []).map(String),
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

  const projetosComFallback = useMemo(() => {
    const options = [...projetos];
    const projetoId = projetoSelectValue;

    if (
      projetoId &&
      !options.some((projeto) => normalizeId(projeto.id) === projetoId)
    ) {
      options.unshift({
        id: projetoId,
        nome: getProjetoNome(projetos, projetoId, existingAcao),
      });
    }

    return options;
  }, [projetos, projetoSelectValue, existingAcao]);

  const colaboradoresComFallback = useMemo(() => {
    const options = [...colaboradores];

    const faltantes = form.colaboradoresIds.filter(
      (colaboradorId) =>
        colaboradorId &&
        !options.some(
          (colaborador) => normalizeId(colaborador.id) === colaboradorId,
        ),
    );

    faltantes.forEach((colaboradorId) => {
      options.push({
        id: colaboradorId,
        nome: `Colaborador ${colaboradorId}`,
      });
    });

    return options;
  }, [colaboradores, form.colaboradoresIds]);

  const estrategiasSelecionadasLabels = form.estrategiasDivulgacao.map(
    (value) => estrategiaLabel(value),
  );

  const estrategiaOptions = estrategiasDivulgacao.map((item) => item.label);

  const colaboradorOptions = colaboradoresComFallback.map(
    (colaborador) => colaborador.nome,
  );

  const colaboradoresSelecionadosLabels = form.colaboradoresIds.map(
    (colaboradorId) =>
      colaboradoresComFallback.find(
        (colaborador) => normalizeId(colaborador.id) === colaboradorId,
      )?.nome ?? colaboradorId,
  );

  function handleEstrategiasChange(labels: string[]) {
    const values = labels
      .map(
        (label) =>
          estrategiasDivulgacao.find((item) => item.label === label)?.value ??
          label,
      )
      .filter(Boolean);

    set("estrategiasDivulgacao", values);
  }

  function handleColaboradoresChange(labels: string[]) {
    const ids = labels
      .map(
        (label) =>
          colaboradoresComFallback.find(
            (colaborador) => colaborador.nome === label,
          )?.id ?? label,
      )
      .map(String)
      .filter(Boolean);

    set("colaboradoresIds", ids);
  }

  function getFormComProjeto(): FormState {
    return {
      ...form,
      projetoId: projetoSelectValue,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const formComProjeto = getFormComProjeto();

    if (!formComProjeto.nomeAcao.trim()) {
      toast.error("Informe o nome da ação.");
      return;
    }

    if (!formComProjeto.descricaoAcao.trim()) {
      toast.error("Informe a descrição da ação.");
      return;
    }

    if (!formComProjeto.realizacaoAcao.trim()) {
      toast.error("Informe a realização da ação.");
      return;
    }

    if (!formComProjeto.objetivoAcao.trim()) {
      toast.error("Informe o objetivo da ação.");
      return;
    }

    if (!formComProjeto.acoesAcessibilidade.trim()) {
      toast.error("Informe as ações de acessibilidade.");
      return;
    }

    if (!formComProjeto.resultadoEsperado.trim()) {
      toast.error("Informe o resultado esperado.");
      return;
    }

    if (!formComProjeto.produtosGerados.trim()) {
      toast.error("Informe os produtos gerados.");
      return;
    }

    if (!formComProjeto.dataInicio) {
      toast.error("Informe a data de início.");
      return;
    }

    if (!formComProjeto.dataFim) {
      toast.error("Informe a data de término.");
      return;
    }

    if (formComProjeto.dataFim < formComProjeto.dataInicio) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return;
    }

    if (
      formComProjeto.dataFim &&
      dataFimPassada(formComProjeto.dataFim) &&
      !statusPermiteDataFimPassada(formComProjeto.status)
    ) {
      toast.error(
        "Ação com data de término passada deve estar com status Inativo ou Concluído.",
      );
      return;
    }

    if (formComProjeto.estrategiasDivulgacao.length === 0) {
      toast.error("Selecione ao menos uma estratégia de divulgação.");
      return;
    }

    if (!formComProjeto.status) {
      toast.error("Selecione o status da ação.");
      return;
    }

    if (!formComProjeto.projetoId) {
      toast.error("Selecione o projeto.");
      return;
    }

    if (formComProjeto.colaboradoresIds.length === 0) {
      toast.error("Vincule ao menos um colaborador responsável pela ação.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildAcaoDivulgacaoPayload(
        mapFormToAcao(formComProjeto),
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
          tooltip="Planeje como as ações culturais serão divulgadas, realizadas e documentadas. Informe estratégias de comunicação, período, responsáveis, produtos gerados e resultados esperados."
        />

        {!visualizando && <FormLegend />}

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Megaphone} title="Dados principais">
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

          <Section icon={Target} title="Objetivo e acessibilidade">
            <div className="grid sm:grid-cols-2 gap-4">
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
            </div>
          </Section>

          <Section icon={PackageCheck} title="Produtos e período">
            <div className="grid sm:grid-cols-2 gap-4">
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

              <Field>
                <FieldLabel htmlFor="dataInicio" required>
                  Data de Início da Ação
                </FieldLabel>
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  disabled={bloqueado}
                  readOnly={visualizando}
                  onChange={(e) => set("dataInicio", e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="dataFim" required>
                  Data de Término da Ação
                </FieldLabel>
                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  disabled={bloqueado}
                  readOnly={visualizando}
                  onChange={(e) => set("dataFim", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Share2} title="Estratégia de divulgação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="estrategiasDivulgacao"
                  required
                  tooltip="Selecione um ou mais meios utilizados para divulgação da ação. Ex.: redes sociais, cartazes, mídia local, rádio, parcerias ou mobilização comunitária."
                >
                  Estratégias de Divulgação
                </FieldLabel>
                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
                >
                  <MultiSelect
                    id="estrategiasDivulgacao"
                    options={estrategiaOptions}
                    value={estrategiasSelecionadasLabels}
                    onChange={handleEstrategiasChange}
                  />
                </div>
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

          <Section icon={Link2} title="Vínculos e equipe">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel htmlFor="projeto" required>
                  Projeto
                </FieldLabel>
                <Select
                  value={projetoSelectValue}
                  onValueChange={(v) => set("projetoId", normalizeId(v))}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetosComFallback.length === 0 ? (
                      <SelectItem value="sem-projeto" disabled>
                        Nenhum projeto disponível
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

              <Field full>
                <FieldLabel htmlFor="colaboradores" required>
                  Colaboradores Responsáveis
                </FieldLabel>
                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
                >
                  <MultiSelect
                    id="colaboradores"
                    options={colaboradorOptions}
                    value={colaboradoresSelecionadosLabels}
                    onChange={handleColaboradoresChange}
                  />
                </div>
              </Field>
            </div>
          </Section>

          {!visualizando && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/acoes-divulgacao")}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button type="submit" className="sm:min-w-32" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}

          {visualizando && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/acoes-divulgacao")}
              >
                Voltar
              </Button>

              {id && (
                <Button
                  type="button"
                  onClick={() => navigate(`/acoes-divulgacao/${id}/editar`)}
                >
                  Editar
                </Button>
              )}
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Cadastro de Ação de Divulgação"
        sections={[
          {
            title: "Como preencher?",
            content:
              "O formulário está dividido em dados principais, objetivo e acessibilidade, produtos e período, estratégia de divulgação e vínculos. Preencha de cima para baixo.",
          },
          {
            title: "Realização da ação",
            content:
              "Explique como a ação será executada na prática, incluindo etapas, canais utilizados, responsáveis e dinâmica de divulgação.",
          },
          {
            title: "Produtos gerados",
            content:
              "Informe os materiais ou registros produzidos pela ação, como cards, vídeos, publicações, cartazes, releases, fotografias ou relatórios.",
          },
          {
            title: "Estratégias de divulgação",
            content:
              "Selecione os meios utilizados para divulgar a ação. Essas informações ajudam a comprovar o planejamento de comunicação do projeto.",
          },
          {
            title: "Vínculos",
            content:
              "Vincule a ação a um projeto e informe os colaboradores responsáveis. Esses vínculos são importantes para relatórios e prestação de contas.",
          },
        ]}
      />
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
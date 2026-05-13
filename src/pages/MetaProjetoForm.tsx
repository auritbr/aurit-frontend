import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, ClipboardCheck, Link2 } from "lucide-react";

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
  buildMetaProjetoPayload,
  createMetaProjeto,
  getMetaProjetoById,
  getMetasProjeto,
  getProjetosOptions,
  getPropostasEditalOptions,
  updateMetaProjeto,
  type MetaProjeto,
  type ProjetoOption,
  type PropostaEditalOption,
} from "@/data/metasProjeto";
import { toast } from "sonner";

const META_PROJETO_NEXT_STEP_KEY = "aurit:metas-projeto:next-step-card";

interface MetaProjetoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoMetaProjeto() {
  const card: MetaProjetoNextStepCardData = {
    titulo: "Após definir as metas, organize o cronograma do projeto",
    descricao:
      "O cronograma ajuda a transformar as metas em etapas de execução, definindo períodos, responsáveis e vínculos com atividades, eventos culturais ou ações de divulgação.",
    acaoLabel: "Cadastrar cronograma",
    acaoUrl: "/cronograma",
    acaoSecundariaLabel: "Ver metas",
    acaoSecundariaUrl: "/metas-projeto",
    variante: "pendente",
  };

  sessionStorage.setItem(META_PROJETO_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  tituloMeta: string;
  descricaoMeta: string;
  quantidadePrevista: string;
  formaComprovacao: string;
  projeto: string;
  propostaEdital: string;
}

const initial: FormState = {
  tituloMeta: "",
  descricaoMeta: "",
  quantidadePrevista: "",
  formaComprovacao: "",
  projeto: "",
  propostaEdital: "",
};

const sanitizeQuantidade = (raw: string) => {
  let value = raw.replace(/[^\d,.]/g, "");
  const firstSeparator = value.search(/[,.]/);

  if (firstSeparator >= 0) {
    const head = value.slice(0, firstSeparator + 1);
    const tail = value.slice(firstSeparator + 1).replace(/[,.]/g, "");
    value = head + tail;
  }

  return value;
};

const parseQuantidade = (value: string) => {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function MetaProjetoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [ordemAtual, setOrdemAtual] = useState<number>(1);

  const bloqueado = visualizando || loading || saving;

  const propostasFiltradas = useMemo(() => {
    if (!form.projeto) return propostas;

    return propostas.filter(
      (proposta) => !proposta.projetoId || proposta.projetoId === form.projeto,
    );
  }, [propostas, form.projeto]);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, propostasData, metaData, metasData] =
          await Promise.all([
            getProjetosOptions(),
            getPropostasEditalOptions(),
            id ? getMetaProjetoById(Number(id)) : Promise.resolve(null),
            id ? Promise.resolve([]) : getMetasProjeto(),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setPropostas(propostasData);

        if (metaData) {
          setForm({
            tituloMeta: metaData.tituloMeta ?? "",
            descricaoMeta: metaData.descricaoMeta ?? "",
            quantidadePrevista:
              metaData.quantidadePrevista != null
                ? String(metaData.quantidadePrevista).replace(".", ",")
                : "",
            formaComprovacao: metaData.formaComprovacao ?? "",
            projeto: metaData.projeto ?? "",
            propostaEdital: metaData.propostaEdital ?? "",
          });

          setOrdemAtual(metaData.ordem || 1);
        } else {
          const maiorOrdem = metasData.reduce(
            (acc, item) => Math.max(acc, Number(item.ordem || 0)),
            0,
          );

          setForm(initial);
          setOrdemAtual(maiorOrdem + 1);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados da meta.",
        );
        navigate("/metas-projeto");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleProjetoChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      projeto: value,
      propostaEdital: "",
    }));
  };

  const handlePropostaChange = (value: string) => {
    if (visualizando) return;

    set("propostaEdital", value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    if (!form.tituloMeta.trim()) {
      toast.error("Informe o título da meta.");
      return;
    }

    if (!form.descricaoMeta.trim()) {
      toast.error("Informe a descrição da meta.");
      return;
    }

    const quantidade = parseQuantidade(form.quantidadePrevista);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("Informe uma quantidade prevista válida e maior que zero.");
      return;
    }

    if (!form.projeto) {
      toast.error("Selecione o projeto da meta.");
      return;
    }

    try {
      setSaving(true);

      const meta: MetaProjeto = {
        id: id ?? "",
        tituloMeta: form.tituloMeta.trim(),
        descricaoMeta: form.descricaoMeta.trim(),
        quantidadePrevista: quantidade,
        formaComprovacao: form.formaComprovacao.trim(),
        ordem: ordemAtual,
        projeto: form.projeto,
        propostaEdital: form.propostaEdital,
      };

      const payload = buildMetaProjetoPayload(meta);

      if (editando && id) {
        await updateMetaProjeto(Number(id), payload);
        toast.success("Meta atualizada com sucesso.");
      } else {
        await createMetaProjeto(payload);
        salvarProximaAcaoMetaProjeto();
        toast.success("Meta cadastrada com sucesso.");
      }

      navigate("/metas-projeto");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar meta.",
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
          onClick={() => navigate("/metas-projeto")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Meta do Projeto
            </h1>

            <HelpTooltip
              text="Cadastre as metas previstas para o projeto, definindo entregas concretas, quantidades esperadas e formas de comprovação. Essas informações ajudam a acompanhar a execução, organizar evidências e preparar relatórios e prestações de contas."
              label="Metas do Projeto"
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

        {!visualizando && <FormLegend />}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Target} title="Dados da meta">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="tituloMeta"
                  required={!visualizando}
                  tooltip="Informe um título curto e claro para identificar a meta. Ex.: realização de oficinas culturais."
                >
                  Título da Meta
                </FieldLabel>

                <Input
                  id="tituloMeta"
                  value={form.tituloMeta}
                  onChange={(e) => set("tituloMeta", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="descricaoMeta"
                  required={!visualizando}
                  tooltip="Descreva a entrega prevista de forma objetiva, explicando o que será realizado e qual resultado mensurável se espera alcançar. Ex.: Realizar 24 oficinas de música para crianças e adolescentes ao longo de 6 meses."
                >
                  Descrição da Meta
                </FieldLabel>

                <Textarea
                  id="descricaoMeta"
                  value={form.descricaoMeta}
                  onChange={(e) => set("descricaoMeta", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="quantidadePrevista"
                  required={!visualizando}
                  tooltip="Informe apenas o número previsto para esta meta. A unidade deve estar clara na descrição da meta ou em campo próprio. Ex.: 24, 3, 50 ou 1."
                >
                  Quantidade Prevista
                </FieldLabel>

                <Input
                  id="quantidadePrevista"
                  inputMode="decimal"
                  value={form.quantidadePrevista}
                  onChange={(e) =>
                    set(
                      "quantidadePrevista",
                      sanitizeQuantidade(e.target.value),
                    )
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={ClipboardCheck} title="Comprovação prevista">
            <Field>
              <FieldLabel
                htmlFor="formaComprovacao"
                tooltip="Descreva quais evidências poderão comprovar o cumprimento da meta, como listas de presença, fotos, vídeos, relatórios, certificados, materiais produzidos ou registros de divulgação."
              >
                Forma de Comprovação
              </FieldLabel>

              <Textarea
                id="formaComprovacao"
                value={form.formaComprovacao}
                onChange={(e) => set("formaComprovacao", e.target.value)}
                rows={3}
                disabled={bloqueado}
                readOnly={visualizando}
              />
            </Field>
          </Section>

          <Section icon={Link2} title="Vínculos">
            <p className="mb-4 text-xs leading-5 text-muted-foreground">
              Toda meta deve estar vinculada a um projeto. A proposta de edital
              é opcional e deve ser selecionada apenas quando a meta também
              fizer parte de uma candidatura específica.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="projeto"
                  required={!visualizando}
                  tooltip="Selecione o projeto ao qual esta meta pertence. Esse vínculo é obrigatório e permite acompanhar a meta dentro da execução geral do projeto."
                >
                  Projeto
                </FieldLabel>

                <Select
                  value={form.projeto}
                  onValueChange={handleProjetoChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>

                  <SelectContent>
                    {projetos.length === 0 ? (
                      <SelectItem value="sem-projeto" disabled>
                        Nenhum projeto disponível
                      </SelectItem>
                    ) : (
                      projetos.map((projeto) => (
                        <SelectItem key={projeto.id} value={projeto.id}>
                          {projeto.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  tooltip="Selecione uma proposta de edital somente se esta meta também estiver vinculada a uma candidatura específica."
                >
                  Proposta de Edital
                </FieldLabel>

                <Select
                  value={form.propostaEdital}
                  onValueChange={handlePropostaChange}
                  disabled={bloqueado || !form.projeto}
                >
                  <SelectTrigger id="propostaEdital">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>

                  <SelectContent>
                    {propostasFiltradas.length === 0 ? (
                      <SelectItem value="sem-proposta" disabled>
                        Nenhuma proposta disponível
                      </SelectItem>
                    ) : (
                      propostasFiltradas.map((proposta) => (
                        <SelectItem key={proposta.id} value={proposta.id}>
                          {proposta.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/metas-projeto")}
              disabled={loading || saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-40"
                disabled={loading || saving}
              >
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

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
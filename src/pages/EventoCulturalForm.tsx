import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  Target,
  Tag,
  Link2,
  CalendarDays,
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { MultiSelect } from "@/components/MultiSelect";
import {
  buildEventoCulturalPayload,
  createEmptyEventoCultural,
  createEventoCultural,
  getColaboradoresOptions,
  getEventoCulturalById,
  getProjetosOptions,
  statusEvento,
  tiposEvento,
  updateEventoCultural,
  type ColaboradorOption,
  type EventoCultural,
  type ProjetoOption,
} from "@/data/eventosCulturais";
import { toast } from "sonner";

const EVENTO_CULTURAL_NEXT_STEP_KEY = "aurit:eventos-culturais:next-step-card";

interface EventoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoEventoCultural() {
  const card: EventoNextStepCardData = {
    titulo: "Após cadastrar os eventos culturais, organize as ações de divulgação",
    descricao:
      "As ações de divulgação ajudam a planejar como o projeto será comunicado ao público, quais estratégias serão utilizadas, quais produtos de comunicação serão gerados e como a organização poderá comprovar a visibilidade das ações.",
    acaoLabel: "Cadastrar ações",
    acaoUrl: "/acoes-divulgacao/novo",
    acaoSecundariaLabel: "Ver eventos",
    acaoSecundariaUrl: "/eventos-culturais",
    variante: "pendente",
  };

  sessionStorage.setItem(EVENTO_CULTURAL_NEXT_STEP_KEY, JSON.stringify(card));
}

export default function EventoCulturalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<EventoCultural>(
    createEmptyEventoCultural(),
  );
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = visualizando || loading || saving;

  const set = <K extends keyof EventoCultural>(
    key: K,
    value: EventoCultural[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, colaboradoresData, eventoData] =
          await Promise.all([
            getProjetosOptions(),
            getColaboradoresOptions(),
            id ? getEventoCulturalById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);

        if (eventoData) {
          setForm(eventoData);
        } else {
          setForm(createEmptyEventoCultural());
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar dados.",
        );

        if (id) {
          navigate("/eventos-culturais");
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

  const colaboradoresOptions = useMemo(
    () => colaboradores.map((colaborador) => colaborador.id),
    [colaboradores],
  );

  const colaboradorLabel = (option: string) =>
    colaboradores.find((colaborador) => colaborador.id === option)?.nome ??
    option;

  function validar() {
    if (!form.nomeEvento.trim()) {
      toast.error("Informe o nome do evento.");
      return false;
    }

    if (!form.descricaoEvento.trim()) {
      toast.error("Informe a descrição do evento.");
      return false;
    }

    if (!form.objetivoEvento.trim()) {
      toast.error("Informe o objetivo do evento.");
      return false;
    }

    if (!form.localEvento.trim()) {
      toast.error("Informe o local do evento.");
      return false;
    }

    if (!form.acoesAcessibilidade.trim()) {
      toast.error("Informe as ações de acessibilidade.");
      return false;
    }

    if (!form.resultadoEsperado.trim()) {
      toast.error("Informe o resultado esperado.");
      return false;
    }

    if (!form.produtoGerado.trim()) {
      toast.error("Informe o produto gerado do evento.");
      return false;
    }

    if (!form.dataEvento) {
      toast.error("Informe a data do evento.");
      return false;
    }

    if (form.dataFim && form.dataFim < form.dataEvento) {
      toast.error("A data de término não pode ser anterior à data do evento.");
      return false;
    }

    if (!form.tipoEvento) {
      toast.error("Selecione o tipo de evento.");
      return false;
    }

    if (!form.status) {
      toast.error("Selecione o status do evento.");
      return false;
    }

    if (!form.projetoId) {
      toast.error("Selecione o projeto.");
      return false;
    }

    if (form.colaboradoresIds.length === 0) {
      toast.error("Vincule ao menos um colaborador ao evento.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (visualizando) return;
    if (!validar()) return;

    try {
      setSaving(true);

      const payload = buildEventoCulturalPayload(form);

      if (editando && id) {
        await updateEventoCultural(Number(id), payload);
        toast.success("Evento cultural atualizado com sucesso.");
      } else {
        await createEventoCultural(payload);
        salvarProximaAcaoEventoCultural();
        toast.success("Evento cultural salvo com sucesso.");
      }

      navigate("/eventos-culturais");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar evento cultural.",
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
          onClick={() => navigate("/eventos-culturais")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Evento Cultural"
          tooltip="Cadastre eventos culturais vinculados ao projeto, como apresentações, mostras, festivais, exposições, encontros ou ações públicas. Informe objetivo, local, período, acessibilidade, resultados esperados e produtos gerados para organizar a execução, gerar evidências e apoiar relatórios e prestações de contas."
        />

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold">Eventos Culturais</span> são ações
            pontuais ou programações abertas ao público, como apresentações,
            mostras, festivais, exposições, rodas, encontros, saraus,
            lançamentos ou celebrações culturais.
          </p>
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
          <Section icon={CalendarRange} title="Dados principais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="nomeEvento"
                  required
                  tooltip="Informe um nome claro para identificar o evento cultural. Ex.: mostra cultural de encerramento, festival de música comunitária ou sarau da primavera."
                >
                  Nome do Evento
                </FieldLabel>

                <Input
                  id="nomeEvento"
                  value={form.nomeEvento}
                  onChange={(event) => set("nomeEvento", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="descricaoEvento"
                  required
                  tooltip="Descreva o evento de forma geral, informando o que será realizado, quais ações farão parte da programação e como ele se relaciona com o projeto. Ex.: Evento de encerramento do projeto com apresentações musicais, mostra dos trabalhos produzidos nas oficinas e participação aberta à comunidade."
                >
                  Descrição do Evento
                </FieldLabel>

                <Textarea
                  id="descricaoEvento"
                  value={form.descricaoEvento}
                  onChange={(event) =>
                    set("descricaoEvento", event.target.value)
                  }
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={CalendarDays} title="Período do evento">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataEvento"
                  required
                  tooltip="Informe a data principal de realização do evento. Ex.: 20/07/2025."
                >
                  Data do Evento
                </FieldLabel>

                <Input
                  id="dataEvento"
                  type="date"
                  value={form.dataEvento}
                  onChange={(event) => set("dataEvento", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataFim"
                  tooltip="Informe a data de término apenas se o evento tiver mais de um dia. Para eventos realizados em um único dia, deixe este campo em branco."
                >
                  Data de Término do Evento
                </FieldLabel>

                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(event) => set("dataFim", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Target} title="Objetivo, local e acessibilidade">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="objetivoEvento"
                  required
                  tooltip="Descreva o propósito principal do evento, indicando o que ele pretende promover, fortalecer ou possibilitar para o público, artistas, comunidade ou território. Ex.: Promover a circulação da produção artística local e fortalecer o vínculo entre os participantes do projeto e a comunidade."
                >
                  Objetivo do Evento
                </FieldLabel>

                <Textarea
                  id="objetivoEvento"
                  value={form.objetivoEvento}
                  onChange={(event) => set("objetivoEvento", event.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="localEvento"
                  required
                  tooltip="Informe o local onde o evento será realizado. Pode ser um espaço cultural, praça, escola, teatro, sede da organização, comunidade, ambiente online ou outro território de realização. Ex.: Praça Central, Teatro Municipal ou Espaço Comunitário."
                >
                  Local do Evento
                </FieldLabel>

                <Input
                  id="localEvento"
                  value={form.localEvento}
                  onChange={(event) => set("localEvento", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="acoesAcessibilidade"
                  required
                  tooltip="Descreva as medidas adotadas para ampliar o acesso e a participação do público, considerando acessibilidade física, comunicacional, social, territorial ou econômica. Ex.: entrada gratuita, local de fácil acesso, apoio da equipe para acolhimento do público, divulgação em linguagem simples, acessibilidade física quando disponível, intérprete de Libras ou adaptação da programação quando necessário."
                >
                  Ações de Acessibilidade
                </FieldLabel>

                <Textarea
                  id="acoesAcessibilidade"
                  value={form.acoesAcessibilidade}
                  onChange={(event) =>
                    set("acoesAcessibilidade", event.target.value)
                  }
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="resultadoEsperado"
                  required
                  tooltip="Informe os efeitos ou contribuições esperadas com a realização do evento, como público alcançado, participação comunitária, visibilidade artística, formação de público, circulação cultural ou fortalecimento do território. Ex.: Ampliar o acesso da comunidade à produção cultural local, fortalecer a participação dos alunos e alcançar aproximadamente 200 pessoas."
                >
                  Resultado Esperado
                </FieldLabel>

                <Textarea
                  id="resultadoEsperado"
                  value={form.resultadoEsperado}
                  onChange={(event) =>
                    set("resultadoEsperado", event.target.value)
                  }
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="produtoGerado"
                  required
                  tooltip="Descreva o que o evento entrega ou gera de forma concreta, como apresentações, mostras, espetáculos, exibições, oficinas abertas, rodas culturais, publicações, registros, materiais ou produtos culturais. Ex.: Mostra cultural com apresentações artísticas, exposição dos trabalhos produzidos nas oficinas e registro fotográfico do evento."
                >
                  Produto Gerado
                </FieldLabel>

                <Textarea
                  id="produtoGerado"
                  value={form.produtoGerado}
                  onChange={(event) => set("produtoGerado", event.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Tag} title="Classificação do evento">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="tipoEvento"
                  required
                  tooltip="Selecione o tipo que melhor representa o evento cultural. Ex.: festival, apresentação musical, mostra, exposição, sarau, espetáculo, roda cultural, seminário ou encontro."
                >
                  Tipo de Evento
                </FieldLabel>

                <Select
                  value={form.tipoEvento}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("tipoEvento", value as EventoCultural["tipoEvento"]);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoEvento">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {tiposEvento.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="status"
                  required
                  tooltip="Indique a situação atual do evento no sistema. Use “Ativo” para eventos em organização ou acompanhamento, “Pendente” para eventos em conferência ou aguardando definição, “Concluído” para eventos já realizados e finalizados e “Inativo” para eventos que não devem mais ser considerados ativos."
                >
                  Status do Evento
                </FieldLabel>

                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("status", value as EventoCultural["status"]);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusEvento.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Link2} title="Vínculos e equipe">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="projetoId"
                  required
                  tooltip="Selecione o projeto ao qual este evento cultural pertence. Esse vínculo conecta o evento ao planejamento, execução, evidências, relatórios e prestação de contas."
                >
                  Projeto
                </FieldLabel>

                <Select
                  value={form.projetoId}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("projetoId", value);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projetoId">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>

                  <SelectContent>
                    {projetos.length === 0 ? (
                      <SelectItem value="sem-projetos" disabled>
                        Nenhum projeto cadastrado
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

              <Field full>
                <FieldLabel
                  htmlFor="colaboradoresIds"
                  required
                  tooltip="Selecione os colaboradores responsáveis pela realização, produção, apoio, registro ou coordenação do evento cultural."
                >
                  Colaboradores
                </FieldLabel>

                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
                >
                  <MultiSelect
                    id="colaboradoresIds"
                    options={colaboradoresOptions}
                    value={form.colaboradoresIds}
                    onChange={(value) => {
                      if (visualizando) return;
                      set("colaboradoresIds", value);
                    }}
                    getOptionLabel={colaboradorLabel}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/eventos-culturais")}
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
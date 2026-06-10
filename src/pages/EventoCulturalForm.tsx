import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
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
    titulo: "Após cadastrar o evento cultural, registre as evidências",
    descricao:
      "As evidências ajudam a comprovar as ações que foram realizadas, reunindo registros como fotos, vídeos, listas de presença, materiais de divulgação, relatos, documentos e outros comprovantes importantes para relatórios, editais e prestação de contas.",
    acaoLabel: "Cadastrar evidências",
    acaoUrl: "/evidencias/novo",
    acaoSecundariaLabel: "Ver eventos",
    acaoSecundariaUrl: "/eventos-culturais",
    variante: "pendente",
  };

  sessionStorage.setItem(EVENTO_CULTURAL_NEXT_STEP_KEY, JSON.stringify(card));
}

function getProjetoNome(
  projetos: ProjetoOption[],
  projetoId: string,
  evento?: EventoCultural | null,
) {
  return (
    projetos.find((projeto) => String(projeto.id) === String(projetoId))
      ?.nome ||
    (evento as any)?.projetoNome?.trim?.() ||
    (evento as any)?.nomeProjeto?.trim?.() ||
    `Projeto ${projetoId}`
  );
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
  const [existingEvento, setExistingEvento] = useState<EventoCultural | null>(
    null,
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

  const projetosSelectValue = useMemo(() => {
    const ids = (form.projetosIds ?? []).filter(Boolean);

    if (ids.length > 0) {
      return ids;
    }

    const projetoId = String(form.projetoId || existingEvento?.projetoId || "");

    return projetoId ? [projetoId] : [];
  }, [form.projetosIds, form.projetoId, existingEvento]);

  const projetosComFallback = useMemo(() => {
    const options = [...projetos];

    projetosSelectValue.forEach((projetoId) => {
      const existe = options.some(
        (projeto) => String(projeto.id) === String(projetoId),
      );

      if (!existe) {
        options.push({
          id: projetoId,
          nome: getProjetoNome(projetos, projetoId, existingEvento),
        });
      }
    });

    return options;
  }, [projetos, projetosSelectValue, existingEvento]);

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
          const projetosIds = (
            eventoData.projetosIds?.length
              ? eventoData.projetosIds
              : eventoData.projetoId
                ? [eventoData.projetoId]
                : []
          ).map(String);

          const projetoId = projetosIds[0] ?? "";

          const eventoNormalizado: EventoCultural = {
            ...eventoData,
            projetoId,
            projetosIds,
            colaboradoresIds: (eventoData.colaboradoresIds ?? []).map(String),
          } as EventoCultural;

          setExistingEvento(eventoNormalizado);
          setForm(eventoNormalizado);
        } else {
          setExistingEvento(null);
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

  const projetosOptions = useMemo(
    () => projetosComFallback.map((projeto) => String(projeto.id)),
    [projetosComFallback],
  );

  const projetoLabel = (option: string) =>
    projetosComFallback.find((projeto) => String(projeto.id) === String(option))
      ?.nome ?? option;

  const colaboradoresOptions = useMemo(
    () => colaboradores.map((colaborador) => String(colaborador.id)),
    [colaboradores],
  );

  const colaboradorLabel = (option: string) =>
    colaboradores.find((colaborador) => String(colaborador.id) === String(option))
      ?.nome ?? option;

  function getFormComProjeto(): EventoCultural {
    return {
      ...form,
      projetoId: projetosSelectValue[0] ?? "",
      projetosIds: projetosSelectValue,
    };
  }

  function validar(evento: EventoCultural) {
    if (!evento.nomeEvento.trim()) {
      toast.error("Informe o nome do evento.");
      return false;
    }

    if (!evento.descricaoEvento.trim()) {
      toast.error("Informe a descrição do evento.");
      return false;
    }

    if (!evento.localEvento.trim()) {
      toast.error("Informe o local do evento.");
      return false;
    }

    if (!evento.dataEvento) {
      toast.error("Informe a data do evento.");
      return false;
    }

    if (evento.dataFim && evento.dataFim < evento.dataEvento) {
      toast.error("A data de término não pode ser anterior à data do evento.");
      return false;
    }

    if (!evento.tipoEvento) {
      toast.error("Selecione o tipo de evento.");
      return false;
    }

    if (!evento.status) {
      toast.error("Selecione o status do evento.");
      return false;
    }

    if (!evento.projetosIds || evento.projetosIds.length === 0) {
      toast.error("Selecione ao menos um projeto.");
      return false;
    }

    if (evento.colaboradoresIds.length === 0) {
      toast.error("Vincule ao menos um colaborador ao evento.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (visualizando) return;

    const formComProjeto = getFormComProjeto();

    if (!validar(formComProjeto)) return;

    try {
      setSaving(true);

      const payload = buildEventoCulturalPayload(formComProjeto);

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
          tooltip="Cadastre eventos culturais vinculados ao projeto, como apresentações, mostras, festivais, exposições, encontros ou ações públicas. Informe descrição, local, período, tipo, status, projeto e equipe responsável para organizar a execução, gerar evidências e apoiar relatórios e prestações de contas."
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
                  htmlFor="projetosIds"
                  required
                  tooltip="Selecione o projeto ou os projetos aos quais este evento cultural pertence. Esse vínculo conecta o evento ao planejamento, execução, evidências, relatórios e prestação de contas."
                >
                  Projetos
                </FieldLabel>

                <div className={bloqueado ? "pointer-events-none opacity-80" : ""}>
                  <MultiSelect
                    id="projetosIds"
                    options={projetosOptions}
                    value={projetosSelectValue}
                    onChange={(value) => {
                      if (visualizando) return;
                      set("projetosIds", value);
                      set("projetoId", value[0] ?? "");
                    }}
                    getOptionLabel={projetoLabel}
                  />
                </div>
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
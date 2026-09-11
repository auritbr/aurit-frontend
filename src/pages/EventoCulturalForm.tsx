import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CalendarRange,
  Tag,
  Link2,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { FormSearchableSelect } from "@/components/FormSearchableSelect";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
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
import { MultiSelect } from "@/components/MultiSelect";
import { getImportConfigForPath } from "@/config/importacoes";
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
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

function salvarProximaAcaoEventoCultural() {
  emitJourneyNextStep();
}

function getProjetoNome(
  projetos: ProjetoOption[],
  projetoId: string,
  evento?: EventoCultural | null,
) {
  const eventoComNomes = evento as
    | (EventoCultural & { projetoNome?: string; nomeProjeto?: string })
    | null
    | undefined;

  return (
    projetos.find((projeto) => String(projeto.id) === String(projetoId))
      ?.nome ||
    eventoComNomes?.projetoNome?.trim() ||
    eventoComNomes?.nomeProjeto?.trim() ||
    `Projeto ${projetoId}`
  );
}

export default function EventoCulturalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<EventoCultural>(createEmptyEventoCultural());
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

  useImportFormFill("eventos-culturais", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, colaboradoresData, eventoData] = await Promise.all(
          [
            getProjetosOptions(),
            getColaboradoresOptions(),
            id || duplicarId
              ? getEventoCulturalById(Number(id ?? duplicarId))
              : Promise.resolve(null),
          ],
        );

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
            id: duplicarId ? "" : eventoData.id,
            nomeEvento: duplicarId
              ? `${eventoData.nomeEvento} (cópia)`
              : eventoData.nomeEvento,
            projetoId,
            projetosIds,
            colaboradoresIds: (eventoData.colaboradoresIds ?? []).map(String),
          } as EventoCultural;

          setExistingEvento(duplicarId ? null : eventoNormalizado);
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
  }, [duplicarId, id, navigate]);

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
    colaboradores.find(
      (colaborador) => String(colaborador.id) === String(option),
    )?.nome ?? option;

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
        <BackButton to="/eventos-culturais" />

        <ListPageHeader
          title="Eventos Culturais"
          tooltip="Nesta página são cadastrados e acompanhados os eventos culturais realizados pela organização, como apresentações, mostras, festivais, exposições, encontros e outras ações públicas. Os registros permitem organizar informações sobre realização, período, situação, projetos relacionados e equipe envolvida, apoiando o acompanhamento dos eventos, a produção de evidências, os relatórios e as prestações de contas."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/eventos-culturais")!}
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
            <Section
              icon={Link2}
              title="Vínculo do evento"
              description="Vincule o evento aos projetos dos quais ele faz parte, permitindo que sua realização seja acompanhada dentro das ações previstas pela organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="projetosIds"
                    required
                    tooltip="Informe o projeto ou os projetos aos quais este evento cultural está relacionado."
                  >
                    Projetos
                  </FieldLabel>

                  <div
                    className={
                      bloqueado ? "pointer-events-none opacity-80" : ""
                    }
                  >
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
              </div>
            </Section>

            <Section
              icon={CalendarRange}
              title="Identificação do evento"
              description="Registre as informações que apresentam o evento e permitem compreender, de forma geral, qual ação cultural será realizada."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomeEvento"
                    required
                    tooltip="Informe um nome curto e claro que permita identificar facilmente o evento cultural."
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

                <Field>
                  <FieldLabel
                    htmlFor="tipoEvento"
                    required
                    tooltip="Informe a opção que melhor representa o formato ou a natureza do evento cultural."
                  >
                    Tipo de Evento
                  </FieldLabel>

                  <FormSearchableSelect
                    id="tipoEvento"
                    value={form.tipoEvento}
                    options={tiposEvento}
                    onChange={(value) => {
                      if (visualizando) return;
                      set("tipoEvento", value as EventoCultural["tipoEvento"]);
                    }}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar tipo de evento..."
                    emptyMessage="Nenhum tipo de evento encontrado."
                    disabled={bloqueado}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoEvento"
                    required
                    tooltip="Descreva o que será realizado no evento, incluindo suas principais características, programação ou finalidade."
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

            <Section
              icon={CalendarDays}
              title="Realização do evento"
              description="Organize como o evento acontecerá, indicando o local de realização e o período previsto ou efetivo para sua execução."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="localEvento"
                    required
                    tooltip="Informe o espaço, endereço, território ou ambiente virtual onde o evento será realizado."
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

                <Field>
                  <FieldLabel
                    htmlFor="dataEvento"
                    required
                    tooltip="Informe a data em que o evento será realizado ou terá início."
                  >
                    Data de Início
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
                    tooltip="Informe a data de término quando o evento ocorrer durante mais de um dia."
                  >
                    Data de Término
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

            <Section
              icon={Tag}
              title="Situação do evento"
              description="Indique em que situação o evento se encontra para acompanhar seu planejamento, realização ou encerramento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required
                    tooltip="Informe a situação atual do evento. Ativo indica que o evento está em organização ou realização; Pendente, que ainda aguarda definições ou providências para avançar; Concluído, que o evento já foi realizado; e Inativo, que não está mais sendo realizado ou acompanhado."
                  >
                    Situação do Evento
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

            <Section
              icon={Link2}
              title="Equipe do evento"
              description="Identifique os colaboradores que participarão da organização e da realização do evento, de acordo com as responsabilidades assumidas por cada integrante da equipe."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="colaboradoresIds"
                    required
                    tooltip="Informe os colaboradores envolvidos na produção, coordenação, execução, apoio ou acompanhamento do evento."
                  >
                    Colaboradores
                  </FieldLabel>

                  <div
                    className={
                      visualizando ? "pointer-events-none opacity-80" : ""
                    }
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
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/eventos-culturais")}
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
          pageTitle="Eventos Culturais"
          href="/wiki/execucao/eventos-culturais"
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

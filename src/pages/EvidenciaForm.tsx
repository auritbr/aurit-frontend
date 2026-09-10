import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  Images,
  Link2,
  MapPin,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
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
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { ImportDataButton } from "@/components/ImportDataButton";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import {
  EvidenciaImagensUploader,
  type NovaImagemEvidencia,
} from "@/components/evidencias/EvidenciaImagensUploader";
import { EvidenciaLinksEditor } from "@/components/evidencias/EvidenciaLinksEditor";
import { EvidenciaGaleria } from "@/components/evidencias/EvidenciaGaleria";
import { EvidenciaResumoContexto } from "@/components/evidencias/EvidenciaResumoContexto";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import {
  createEvidenciaFotografica,
  getAtividadesEvidenciaOptions,
  getEvidenciaFotograficaById,
  getEvidenciaImagemUrl,
  getEventosEvidenciaOptions,
  getPlanosAulaEvidenciaOptions,
  getProjetosOptions,
  getTurmasEvidenciaOptions,
  updateEvidenciaFotografica,
  type ContextoEvidencia,
  type EvidenciaImagem,
  type EvidenciaLink,
  type EvidenciaFotograficaRequest,
} from "@/data/evidencias";

interface FormState {
  contexto: ContextoEvidencia | "";
  projetoId: string;
  atividadeId: string;
  turmaId: string;
  planoAulaId: string;
  eventoCulturalId: string;
  descricao: string;
}

const initialState: FormState = {
  contexto: "",
  projetoId: "",
  atividadeId: "",
  turmaId: "",
  planoAulaId: "",
  eventoCulturalId: "",
  descricao: "",
};

const tooltip =
  "Nesta página são registradas fotografias e links utilizados para comprovar a realização de aulas e eventos culturais. Relacione a evidência aos cadastros já existentes no Sistema Aurit para manter cada material vinculado corretamente à execução do projeto.";

const TOOLTIP_CONTEXTO =
  "Selecione se a evidência foi produzida durante uma aula ou um evento cultural. Essa escolha define quais informações serão solicitadas nas próximas etapas.";

const TOOLTIP_PROJETO =
  "Selecione o projeto ao qual esta evidência pertence. Serão apresentados somente os registros relacionados ao projeto escolhido nas etapas seguintes.";

const TOOLTIP_ATIVIDADE =
  "Selecione a atividade em que a aula foi realizada. As opções apresentadas correspondem às atividades vinculadas ao projeto selecionado.";

const TOOLTIP_TURMA =
  "Selecione a turma em que a evidência foi produzida. Serão apresentadas somente as turmas vinculadas à atividade escolhida.";

const TOOLTIP_PLANO_AULA =
  "Selecione o plano de aula correspondente ao encontro registrado nas fotografias. A data da aula será preenchida automaticamente a partir desse cadastro.";

const TOOLTIP_DATA_AULA =
  "Esta data é preenchida automaticamente a partir do Plano de Aula selecionado e identifica quando o encontro registrado ocorreu.";

const TOOLTIP_EVENTO =
  "Selecione o evento cultural em que a evidência foi produzida. As informações do evento serão recuperadas automaticamente do cadastro existente.";

const TOOLTIP_DESCRICAO =
  "Descreva o que está sendo comprovado por esta evidência. Informe, de forma breve, o momento registrado, a atividade realizada ou outra informação que ajude a compreender as fotografias e os links anexados.";

const contextos = [
  { value: "AULA", label: "Aula" },
  { value: "EVENTO_CULTURAL", label: "Evento Cultural" },
] as const;

const dataBR = (value?: string | null) => {
  if (!value) return "";

  const [a, m, d] = value.slice(0, 10).split("-");

  return a && m && d ? `${d}/${m}/${a}` : value;
};

const periodo = (inicio?: string | null, fim?: string | null) =>
  !inicio
    ? "—"
    : !fim || fim === inicio
      ? dataBR(inicio)
      : `${dataBR(inicio)} a ${dataBR(fim)}`;

const urlValida = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export default function EvidenciaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const evidenciaId = id ? Number(id) : undefined;
  const isView = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && !isView;

  const [form, setForm] = useState<FormState>(initialState);
  const [existingImages, setExistingImages] = useState<EvidenciaImagem[]>([]);
  const [newImages, setNewImages] = useState<NovaImagemEvidencia[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [links, setLinks] = useState<EvidenciaLink[]>([]);

  useImportFormFill("evidencias", setForm);

  const detailQ = useQuery({
    queryKey: ["evidencias", "detalhes", evidenciaId],
    queryFn: () => getEvidenciaFotograficaById(evidenciaId!),
    enabled: !!evidenciaId,
    retry: false,
  });

  const projetosQ = useQuery({
    queryKey: ["evidencias", "projetos"],
    queryFn: getProjetosOptions,
    retry: false,
  });

  const atividadesQ = useQuery({
    queryKey: ["evidencias", "atividades", form.projetoId],
    queryFn: () => getAtividadesEvidenciaOptions(Number(form.projetoId)),
    enabled: form.contexto === "AULA" && !!form.projetoId,
    retry: false,
  });

  const turmasQ = useQuery({
    queryKey: ["evidencias", "turmas", form.atividadeId],
    queryFn: () => getTurmasEvidenciaOptions(Number(form.atividadeId)),
    enabled: form.contexto === "AULA" && !!form.atividadeId,
    retry: false,
  });

  const planosQ = useQuery({
    queryKey: ["evidencias", "planos", form.atividadeId, form.turmaId],
    queryFn: () =>
      getPlanosAulaEvidenciaOptions(
        Number(form.atividadeId),
        Number(form.turmaId),
      ),
    enabled: form.contexto === "AULA" && !!form.atividadeId && !!form.turmaId,
    retry: false,
  });

  const eventosQ = useQuery({
    queryKey: ["evidencias", "eventos", form.projetoId],
    queryFn: () => getEventosEvidenciaOptions(Number(form.projetoId)),
    enabled: form.contexto === "EVENTO_CULTURAL" && !!form.projetoId,
    retry: false,
  });

  useEffect(() => {
    const item = detailQ.data;

    if (!item) return;

    setForm({
      contexto: item.contexto,
      projetoId: String(item.projeto.id),
      atividadeId: item.atividade ? String(item.atividade.id) : "",
      turmaId: item.turma ? String(item.turma.id) : "",
      planoAulaId: item.planoAula ? String(item.planoAula.id) : "",
      eventoCulturalId: item.eventoCultural
        ? String(item.eventoCultural.id)
        : "",
      descricao: item.descricao ?? "",
    });

    setExistingImages(item.imagens ?? []);
    setLinks(item.links ?? []);
    setRemovedImageIds([]);
    setNewImages([]);
  }, [detailQ.data]);

  useEffect(() => {
    const error =
      detailQ.error ??
      projetosQ.error ??
      atividadesQ.error ??
      turmasQ.error ??
      planosQ.error ??
      eventosQ.error;

    if (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados da evidência.",
      );
    }
  }, [
    detailQ.error,
    projetosQ.error,
    atividadesQ.error,
    turmasQ.error,
    planosQ.error,
    eventosQ.error,
  ]);

  const projetos = projetosQ.data ?? [];
  const atividades = atividadesQ.data ?? [];
  const turmas = turmasQ.data ?? [];
  const planos = planosQ.data ?? [];
  const eventos = eventosQ.data ?? [];

  const plano =
    planos.find((item) => item.id === form.planoAulaId) ??
    (detailQ.data?.planoAula
      ? {
          id: String(detailQ.data.planoAula.id),
          nome: detailQ.data.planoAula.nome,
          dataInicio: detailQ.data.planoAula.dataInicio,
          dataFim: detailQ.data.planoAula.dataFim ?? undefined,
          turmaIds: detailQ.data.planoAula.turmas.map((t) => String(t.id)),
        }
      : undefined);

  const evento =
    eventos.find((item) => item.id === form.eventoCulturalId) ??
    (detailQ.data?.eventoCultural
      ? {
          id: String(detailQ.data.eventoCultural.id),
          nome: detailQ.data.eventoCultural.nome,
          dataInicio: detailQ.data.eventoCultural.dataInicio,
          dataFim: detailQ.data.eventoCultural.dataFim ?? undefined,
          descricao: detailQ.data.eventoCultural.descricao ?? undefined,
          local: detailQ.data.eventoCultural.local ?? undefined,
          status: detailQ.data.eventoCultural.status ?? undefined,
        }
      : undefined);

  const projetoNome =
    projetos.find((p) => p.id === form.projetoId)?.nome ??
    detailQ.data?.projeto.nome ??
    "—";

  const atividadeNome =
    atividades.find((a) => a.id === form.atividadeId)?.nome ??
    detailQ.data?.atividade?.nome ??
    "—";

  const turmaNome =
    turmas.find((t) => t.id === form.turmaId)?.nome ??
    detailQ.data?.turma?.nome ??
    "—";

  const imageQueries = useQueries({
    queries: existingImages.map((image) => ({
      queryKey: ["evidencias", evidenciaId, "imagem", image.id],
      queryFn: () => getEvidenciaImagemUrl(evidenciaId!, image.id),
      enabled: !!evidenciaId,
      retry: false,
      staleTime: 4 * 60 * 1000,
    })),
  });

  const existingImagesWithUrls = existingImages.map((image, index) => ({
    ...image,
    visualizacaoUrl: imageQueries[index]?.data,
  }));

  const gallery = existingImages.map((image, index) => ({
    id: image.id,
    nome: image.nomeOriginal,
    url: imageQueries[index]?.data,
  }));

  const setContexto = (contexto: ContextoEvidencia) =>
    setForm((prev) => ({
      ...prev,
      contexto,
      atividadeId: "",
      turmaId: "",
      planoAulaId: "",
      eventoCulturalId: "",
    }));

  const setProjeto = (projetoId: string) =>
    setForm((prev) => ({
      ...prev,
      projetoId,
      atividadeId: "",
      turmaId: "",
      planoAulaId: "",
      eventoCulturalId: "",
    }));

  const setAtividade = (atividadeId: string) =>
    setForm((prev) => ({
      ...prev,
      atividadeId,
      turmaId: "",
      planoAulaId: "",
    }));

  const setTurma = (turmaId: string) =>
    setForm((prev) => ({
      ...prev,
      turmaId,
      planoAulaId: "",
    }));

  const removeExisting = (imageId: number) => {
    setExistingImages((prev) => prev.filter((image) => image.id !== imageId));

    setRemovedImageIds((prev) => [...new Set([...prev, imageId])]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.contexto) {
        throw new Error("Selecione o contexto da evidência.");
      }

      if (!form.projetoId) {
        throw new Error("Selecione um projeto.");
      }

      if (
        form.contexto === "AULA" &&
        (!form.atividadeId || !form.turmaId || !form.planoAulaId)
      ) {
        throw new Error("Selecione a atividade, a turma e o plano de aula.");
      }

      if (form.contexto === "EVENTO_CULTURAL" && !form.eventoCulturalId) {
        throw new Error("Selecione um evento cultural.");
      }

      if (existingImages.length + newImages.length > 10) {
        throw new Error("É possível adicionar até 10 imagens por registro.");
      }

      const validLinks = links.filter(
        (link) => (link.titulo ?? "").trim() || link.url.trim(),
      );

      if (validLinks.some((link) => !urlValida(link.url.trim()))) {
        throw new Error(
          "Informe um endereço válido começando com http:// ou https://.",
        );
      }

      const payload: EvidenciaFotograficaRequest = {
        tituloEvidencia: null,
        contexto: form.contexto,
        tipoEvidencia: "FOTO",
        projetoId: Number(form.projetoId),
        atividadeId: form.contexto === "AULA" ? Number(form.atividadeId) : null,
        turmaId: form.contexto === "AULA" ? Number(form.turmaId) : null,
        planoAulaId: form.contexto === "AULA" ? Number(form.planoAulaId) : null,
        eventoCulturalId:
          form.contexto === "EVENTO_CULTURAL"
            ? Number(form.eventoCulturalId)
            : null,
        descricao: form.descricao.trim() || null,
        links: validLinks.map((link) => ({
          titulo: link.titulo?.trim() || null,
          url: link.url.trim(),
        })),
        removerImagemIds: removedImageIds,
      };

      const files = newImages.map((image) => image.file);

      return isEdit && evidenciaId
        ? updateEvidenciaFotografica(evidenciaId, payload, files)
        : createEvidenciaFotografica(payload, files);
    },

    onSuccess: async (saved) => {
      queryClient.setQueriesData<
        import("@/data/evidencias").EvidenciaFotografica[]
      >(
        {
          queryKey: ["evidencias", "fotograficas"],
        },
        (current) =>
          current
            ? [saved, ...current.filter((item) => item.id !== saved.id)]
            : [saved],
      );

      await queryClient.invalidateQueries({
        queryKey: ["evidencias", "fotograficas"],
        refetchType: "none",
      });

      toast.success(
        isEdit
          ? "Evidência atualizada com sucesso."
          : "Evidência registrada com sucesso.",
      );

      navigate("/evidencias");
    },

    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a evidência.",
      ),
  });

  if (isView) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6 sm:py-8">
          <BackButton to="/evidencias" />

          <FormHeader />

          <FormLegend />

          {detailQ.isLoading ? (
            <Loading text="Carregando evidência..." />
          ) : detailQ.isError || !detailQ.data ? (
            <FormSectionCard icon={Camera} title="Evidência não encontrada">
              <p className="text-[13px] text-muted-foreground">
                Este registro não está mais disponível para a organização
                selecionada.
              </p>
            </FormSectionCard>
          ) : (
            <div className="space-y-5">
              <FormSectionCard
                icon={Target}
                title="Contexto do registro"
                description="Consulte os vínculos da evidência com os cadastros utilizados para identificar onde e quando este registro foi produzido."
              >
                <EvidenciaResumoContexto
                  title={form.contexto === "AULA" ? "Aula" : "Evento Cultural"}
                  items={
                    form.contexto === "AULA"
                      ? [
                          {
                            label: "Projeto",
                            value: projetoNome,
                          },
                          {
                            label: "Atividade",
                            value: atividadeNome,
                          },
                          {
                            label: "Turma",
                            value: turmaNome,
                          },
                          {
                            label: "Plano de Aula",
                            value: plano?.nome ?? "—",
                          },
                          {
                            label: "Data da aula",
                            value: dataBR(plano?.dataInicio) || "—",
                          },
                        ]
                      : [
                          {
                            label: "Projeto",
                            value: projetoNome,
                          },
                          {
                            label: "Evento Cultural",
                            value: evento?.nome ?? "—",
                          },
                          {
                            label: "Data",
                            value: periodo(evento?.dataInicio, evento?.dataFim),
                          },
                          {
                            label: "Local",
                            value: evento?.local ?? "—",
                          },
                          {
                            label: "Descrição do evento",
                            value: evento?.descricao ?? "—",
                          },
                        ]
                  }
                />

                {form.descricao.trim() && (
                  <div className="mt-4">
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Descrição da Evidência
                    </h3>

                    <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed">
                      {form.descricao}
                    </p>
                  </div>
                )}
              </FormSectionCard>

              <FormSectionCard
                icon={Images}
                title="Fotografias"
                description="Consulte as fotografias anexadas para comprovar a realização da ação registrada."
              >
                <EvidenciaGaleria imagens={gallery} />
              </FormSectionCard>

              <FormSectionCard
                icon={Link2}
                title="Links relacionados"
                description="Consulte os links adicionados como complemento da comprovação desta evidência."
              >
                <LinksView links={links} />
              </FormSectionCard>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 px-4"
                  onClick={() => navigate("/evidencias")}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>

        <WikiFloatingButton pageTitle="Evidências" sections={wiki} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/evidencias" />

        <FormHeader />

        <FormLegend />

        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (!saveMutation.isPending) {
              saveMutation.mutate();
            }
          }}
          className="space-y-5"
        >
          <FormSectionCard
            icon={Target}
            title="Onde esta evidência foi produzida"
            description="Identifique primeiro o tipo de ação e o projeto em que este registro foi produzido. A partir dessas informações, o Sistema Aurit apresentará os cadastros relacionados para completar o vínculo da evidência."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="contexto"
                label="Contexto da Evidência"
                tooltip={TOOLTIP_CONTEXTO}
                value={form.contexto}
                onChange={(v) => setContexto(v as ContextoEvidencia)}
                placeholder="Selecione o contexto"
                options={contextos.map((item) => ({
                  id: item.value,
                  nome: item.label,
                }))}
                required
              />

              {form.contexto && (
                <SelectField
                  id="projetoId"
                  label="Projeto"
                  tooltip={TOOLTIP_PROJETO}
                  value={form.projetoId}
                  onChange={setProjeto}
                  placeholder={
                    projetosQ.isLoading
                      ? "Carregando projetos..."
                      : "Selecione um projeto"
                  }
                  options={projetos}
                  disabled={projetosQ.isLoading}
                  required
                />
              )}
            </div>
          </FormSectionCard>

          {form.contexto === "AULA" && (
            <FormSectionCard
              icon={CalendarDays}
              title="Encontro registrado"
              description="Identifique a atividade, a turma e o plano de aula correspondentes ao encontro em que a evidência foi produzida."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  id="atividadeId"
                  label="Atividade"
                  tooltip={TOOLTIP_ATIVIDADE}
                  value={form.atividadeId}
                  onChange={setAtividade}
                  placeholder={
                    !form.projetoId
                      ? "Selecione primeiro um projeto"
                      : atividadesQ.isLoading
                        ? "Carregando atividades..."
                        : "Selecione uma atividade"
                  }
                  options={atividades}
                  disabled={!form.projetoId || atividadesQ.isLoading}
                  required
                />

                <SelectField
                  id="turmaId"
                  label="Turma"
                  tooltip={TOOLTIP_TURMA}
                  value={form.turmaId}
                  onChange={setTurma}
                  placeholder={
                    !form.atividadeId
                      ? "Selecione primeiro uma atividade"
                      : turmasQ.isLoading
                        ? "Carregando turmas..."
                        : "Selecione uma turma"
                  }
                  options={turmas}
                  disabled={!form.atividadeId || turmasQ.isLoading}
                  required
                />

                <SelectField
                  id="planoAulaId"
                  label="Plano de Aula"
                  tooltip={TOOLTIP_PLANO_AULA}
                  value={form.planoAulaId}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      planoAulaId: v,
                    }))
                  }
                  placeholder={
                    !form.turmaId
                      ? "Selecione primeiro uma turma"
                      : planosQ.isLoading
                        ? "Carregando planos de aula..."
                        : "Selecione um plano de aula"
                  }
                  options={planos.map((p) => ({
                    id: p.id,
                    nome: `${dataBR(p.dataInicio)} — ${p.nome || "Aula"}`,
                  }))}
                  disabled={!form.turmaId || planosQ.isLoading}
                  required
                />

                {form.planoAulaId && (
                  <div>
                    <FieldLabel htmlFor="dataAula" tooltip={TOOLTIP_DATA_AULA}>
                      Data da aula
                    </FieldLabel>

                    <Input
                      id="dataAula"
                      value={dataBR(plano?.dataInicio) || "—"}
                      readOnly
                      tabIndex={-1}
                      className="bg-muted/40 text-muted-foreground"
                    />
                  </div>
                )}

                {form.planoAulaId && (
                  <div className="sm:col-span-2">
                    <EvidenciaResumoContexto
                      title="Contexto selecionado"
                      items={[
                        {
                          label: "Projeto",
                          value: projetoNome,
                        },
                        {
                          label: "Atividade",
                          value: atividadeNome,
                        },
                        {
                          label: "Turma",
                          value: turmaNome,
                        },
                        {
                          label: "Plano de Aula",
                          value: plano?.nome ?? "—",
                        },
                        {
                          label: "Data da Aula",
                          value: dataBR(plano?.dataInicio) || "—",
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            </FormSectionCard>
          )}

          {form.contexto === "EVENTO_CULTURAL" && (
            <FormSectionCard
              icon={MapPin}
              title="Evento registrado"
              description="Identifique o evento cultural correspondente para relacionar corretamente as evidências ao registro já existente no Sistema Aurit."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  id="eventoCulturalId"
                  label="Evento Cultural"
                  tooltip={TOOLTIP_EVENTO}
                  value={form.eventoCulturalId}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      eventoCulturalId: v,
                    }))
                  }
                  placeholder={
                    !form.projetoId
                      ? "Selecione primeiro um projeto"
                      : eventosQ.isLoading
                        ? "Carregando eventos..."
                        : "Selecione um evento"
                  }
                  options={eventos.map((e) => ({
                    id: e.id,
                    nome: `${
                      dataBR(e.dataInicio) ? `${dataBR(e.dataInicio)} — ` : ""
                    }${e.nome}`,
                  }))}
                  disabled={!form.projetoId || eventosQ.isLoading}
                  required
                />

                {evento && (
                  <div className="sm:col-span-2">
                    <EvidenciaResumoContexto
                      title="Evento selecionado"
                      items={[
                        {
                          label: "Nome",
                          value: evento.nome,
                        },
                        {
                          label: "Data",
                          value: periodo(evento.dataInicio, evento.dataFim),
                        },
                        {
                          label: "Local",
                          value: evento.local ?? "—",
                        },
                        {
                          label: "Descrição",
                          value: evento.descricao ?? "—",
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            </FormSectionCard>
          )}

          {form.contexto && (
            <>
              <FormSectionCard
                icon={Camera}
                title="Descrição da evidência"
                description="Registre uma breve explicação sobre o que aparece nas evidências e qual momento da execução está sendo demonstrado."
              >
                <FieldLabel htmlFor="descricao" tooltip={TOOLTIP_DESCRICAO}>
                  Descrição da Evidência
                </FieldLabel>

                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      descricao: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </FormSectionCard>

              <FormSectionCard
                icon={Images}
                title="Fotografias"
                description="Adicione fotografias quando estiverem disponíveis. Elas também podem ser incluídas depois, ao editar a evidência."
              >
                <EvidenciaImagensUploader
                  imagensAtuais={existingImagesWithUrls}
                  onRemoverAtual={removeExisting}
                  novasImagens={newImages}
                  onChangeNovas={setNewImages}
                  disabled={saveMutation.isPending}
                />
              </FormSectionCard>

              <FormSectionCard
                icon={Link2}
                title="Links relacionados"
                description="Adicione, quando houver, links que complementem a comprovação da ação, como publicações, vídeos, matérias ou outros conteúdos relacionados."
              >
                <EvidenciaLinksEditor
                  links={links}
                  onChange={setLinks}
                  disabled={saveMutation.isPending}
                />
              </FormSectionCard>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/evidencias")}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="glassPrimary"
              className="h-9 px-5"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Evidências"
        href="/wiki/evidencias/evidencias-de-execucao"
      />
    </AppLayout>
  );
}

function FormHeader() {
  const config = getImportConfigForPath("/evidencias");
  const { pathname } = useLocation();

  const showImport = pathname.endsWith("/novo") || pathname.endsWith("/editar");

  return (
    <ListPageHeader
      title="Evidências"
      tooltip={tooltip}
      actions={
        showImport && config ? (
          <ImportDataButton
            config={config}
            canFillForm
            variant="glassSecondary"
          />
        ) : undefined
      }
    />
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-border/70 bg-card/70 px-6 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SelectField({
  id,
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  options,
  disabled,
  required,
}: {
  id: string;
  label: string;
  tooltip?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{
    id: string;
    nome: string;
  }>;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FieldLabel>

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.length ? (
            options.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.nome}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-2 text-[12.5px] text-muted-foreground">
              Nenhum registro disponível.
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function LinksView({ links }: { links: EvidenciaLink[] }) {
  if (!links.length) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Nenhum link relacionado.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {links.map((link, index) => (
        <li
          key={link.id ?? index}
          className="flex flex-col gap-1 rounded-[12px] border border-border/60 bg-background/60 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="break-words text-[13px] font-medium">
            {link.titulo?.trim() || "Link relacionado"}
          </span>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Abrir link
          </a>
        </li>
      ))}
    </ul>
  );
}

const wiki = [
  {
    title: "Para que serve?",
    content:
      "Registrar fotografias e links que comprovam aulas e eventos culturais.",
  },
  {
    title: "Fotografias",
    content: "Até 10 imagens de 5 MB em JPEG, JPG, PNG ou WEBP.",
  },
  {
    title: "Informações automáticas",
    content:
      "Data da aula, nome, local e descrição do evento vêm dos cadastros existentes.",
  },
];

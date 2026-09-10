import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { User, FileText } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
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
import { GuidanceCard } from "@/components/GuidanceCard";
import { getImportConfigForPath } from "@/config/importacoes";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  createTrajetoriaCultural,
  getColaboradoresOptions,
  getTrajetoriaCulturalById,
  updateTrajetoriaCultural,
  type ColaboradorOption,
} from "@/data/trajetoriasCulturais";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

interface FormState {
  colaboradorId: string;
  colaboradorNome: string;
  textoTrajetoria: string;
}

interface TrajetoriaCarregada {
  colaboradorId?: string | number | null;
  colaboradorNome?: string | null;
  nomeCompleto?: string | null;
  textoTrajetoria?: string | null;
}

const initial: FormState = {
  colaboradorId: "",
  colaboradorNome: "",
  textoTrajetoria: "",
};

const TRAJETORIA_OBJETIVO =
  "Descreva a trajetória cultural e profissional do colaborador em formato de narrativa, apresentando sua história, experiências e evolução ao longo do tempo. Informe como iniciou sua atuação, os caminhos que percorreu, os trabalhos desenvolvidos e sua relação com a cultura, a comunidade e o território.";

const TRAJETORIA_PERGUNTAS = [
  "Como iniciou sua atuação cultural?",
  "Com quem aprendeu ou onde desenvolveu sua formação prática?",
  "De quais grupos, coletivos, instituições ou projetos participou?",
  "Em quais áreas ou linguagens culturais atua?",
  "Com quais públicos desenvolve suas atividades?",
  "Quais resultados, impactos ou contribuições já alcançou?",
  "De que forma sua atuação contribui para a cultura, a comunidade ou o território?",
];

function salvarProximaAcaoTrajetoriaCultural() {
  emitJourneyNextStep();
}

function resolverNomeColaborador(trajetoria?: TrajetoriaCarregada | null) {
  if (!trajetoria) return "";

  return (
    trajetoria.colaboradorNome?.trim() || trajetoria.nomeCompleto?.trim() || ""
  );
}

export default function TrajetoriaCulturalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingTrajetoria, setExistingTrajetoria] =
    useState<TrajetoriaCarregada | null>(null);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const bloqueado = visualizando || loading || saving;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const colaboradorSelectValue =
    form.colaboradorId || String(existingTrajetoria?.colaboradorId ?? "");

  const colaboradoresComFallback = useMemo(() => {
    const options = [...colaboradores];

    const colaboradorId =
      form.colaboradorId || String(existingTrajetoria?.colaboradorId ?? "");

    const colaboradorNome =
      form.colaboradorNome ||
      resolverNomeColaborador(existingTrajetoria) ||
      (colaboradorId ? `Colaborador ${colaboradorId}` : "");

    if (!colaboradorId) {
      return options;
    }

    const existe = options.some(
      (colaborador) => String(colaborador.id) === String(colaboradorId),
    );

    if (!existe) {
      options.unshift({
        id: colaboradorId,
        nome: colaboradorNome,
      });
    }

    return options;
  }, [
    colaboradores,
    form.colaboradorId,
    form.colaboradorNome,
    existingTrajetoria,
  ]);

  useImportFormFill("trajetorias-culturais", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const [colaboradoresData, trajetoriaData] = await Promise.all([
          getColaboradoresOptions(),
          id ? getTrajetoriaCulturalById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setColaboradores(colaboradoresData);

        if (trajetoriaData) {
          const trajetoria = trajetoriaData as TrajetoriaCarregada;

          let colaboradorId = trajetoria.colaboradorId
            ? String(trajetoria.colaboradorId)
            : "";

          const colaboradorNome = resolverNomeColaborador(trajetoria);

          if (!colaboradorId && colaboradorNome) {
            const colaboradorEncontrado = colaboradoresData.find(
              (colaborador) =>
                colaborador.nome.trim().toLowerCase() ===
                colaboradorNome.trim().toLowerCase(),
            );

            colaboradorId = colaboradorEncontrado
              ? String(colaboradorEncontrado.id)
              : "";
          }

          const colaboradorSelecionado = colaboradoresData.find(
            (colaborador) => String(colaborador.id) === String(colaboradorId),
          );

          setExistingTrajetoria({
            ...trajetoria,
            colaboradorId,
            colaboradorNome:
              colaboradorNome || colaboradorSelecionado?.nome || "",
          });

          setForm({
            colaboradorId,
            colaboradorNome:
              colaboradorNome || colaboradorSelecionado?.nome || "",
            textoTrajetoria: trajetoria.textoTrajetoria ?? "",
          });
        } else {
          setExistingTrajetoria(null);
          setForm(initial);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados da trajetória cultural.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);

        if (id) {
          navigate("/trajetorias-culturais");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const colaboradorId =
      form.colaboradorId || String(existingTrajetoria?.colaboradorId ?? "");

    const colaboradorSelecionado = colaboradoresComFallback.find(
      (colaborador) => String(colaborador.id) === String(colaboradorId),
    );

    const formComColaborador: FormState = {
      ...form,
      colaboradorId,
      colaboradorNome:
        form.colaboradorNome ||
        colaboradorSelecionado?.nome ||
        resolverNomeColaborador(existingTrajetoria),
    };

    if (!formComColaborador.colaboradorId) {
      toast.error("Preencha o campo obrigatório: Colaborador.");
      return;
    }

    if (!formComColaborador.textoTrajetoria.trim()) {
      toast.error("Preencha o campo obrigatório: Texto da trajetória.");
      return;
    }

    if (formComColaborador.textoTrajetoria.trim().length < 300) {
      toast.error(
        "A trajetória cultural precisa ter pelo menos 300 caracteres.",
      );
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      const payload = {
        colaboradorId: Number(formComColaborador.colaboradorId),
        textoTrajetoria: formComColaborador.textoTrajetoria.trim(),
      };

      if (editando && id) {
        await updateTrajetoriaCultural(Number(id), payload);
        toast.success("Trajetória cultural atualizada com sucesso.");
      } else {
        await createTrajetoriaCultural(payload);
        salvarProximaAcaoTrajetoriaCultural();
        toast.success("Trajetória cultural cadastrada com sucesso.");
      }

      navigate("/trajetorias-culturais");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar trajetória cultural.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/trajetorias-culturais" />

        <PageTitle
          title="Trajetórias Culturais"
          tooltip="Nesta página é registrada, em formato narrativo, a trajetória profissional e cultural do colaborador, desde o início de sua atuação até o momento atual. O texto pode destacar experiências, áreas de atuação, projetos, realizações, públicos envolvidos e a evolução de sua atuação ao longo do tempo."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/trajetorias-culturais")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        {!visualizando && (
          <GuidanceCard
            className="mb-5"
            description={TRAJETORIA_OBJETIVO}
            text-justify
            listTitle="Perguntas de orientação"
            items={TRAJETORIA_PERGUNTAS}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={User}
              title="Vínculo da trajetória"
              description="Selecione o colaborador ao qual esta trajetória pertence."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="colaborador"
                    required
                    tooltip="Informe o colaborador ao qual as experiências, ações e realizações registradas nesta trajetória se referem."
                  >
                    Colaborador
                  </FieldLabel>

                  <Select
                    value={colaboradorSelectValue}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      const colaboradorSelecionado =
                        colaboradoresComFallback.find(
                          (colaborador) =>
                            String(colaborador.id) === String(value),
                        );

                      setForm((prev) => ({
                        ...prev,
                        colaboradorId: String(value),
                        colaboradorNome:
                          colaboradorSelecionado?.nome ?? prev.colaboradorNome,
                      }));
                    }}
                    disabled={
                      bloqueado || colaboradoresComFallback.length === 0
                    }
                  >
                    <SelectTrigger id="colaborador">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>

                    <SelectContent>
                      {colaboradoresComFallback.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Nenhum colaborador cadastrado
                        </SelectItem>
                      ) : (
                        colaboradoresComFallback.map((colaborador) => (
                          <SelectItem
                            key={String(colaborador.id)}
                            value={String(colaborador.id)}
                          >
                            {colaborador.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={FileText}
              title="Narrativa da trajetória"
              description="Apresente a trajetória do colaborador desde o início de sua atuação até o momento atual, destacando experiências, áreas de atuação, públicos alcançados e principais realizações."
            >
              <Field>
                <FieldLabel
                  htmlFor="textoTrajetoria"
                  required
                  tooltip="Descreva a trajetória em ordem cronológica, começando pelo início da atuação do colaborador e seguindo até o momento atual. Inclua as principais experiências, projetos e ações realizadas, grupos ou organizações dos quais participou, áreas de atuação, públicos envolvidos, resultados ou realizações relevantes e, ao final, sua atuação atual."
                >
                  Texto da Trajetória
                </FieldLabel>

                <Textarea
                  id="textoTrajetoria"
                  value={form.textoTrajetoria}
                  onChange={(e) => set("textoTrajetoria", e.target.value)}
                  className="min-h-[320px] leading-relaxed"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  {form.textoTrajetoria.trim().length} caracteres
                </p>
              </Field>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/trajetorias-culturais")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving || loading}
                aria-busy={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Cadastro de Trajetória Cultural"
          href="/wiki/pessoas/trajetorias-culturais"
        />
      </div>
    </AppLayout>
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

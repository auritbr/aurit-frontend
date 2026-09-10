import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { User, GraduationCap, Sparkles } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { PageTitle } from "@/components/PageTitle";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { CurriculoItemList } from "@/components/CurriculoItemList";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  cleanList,
  createCurriculo,
  dtoToForm,
  formToDto,
  getColaboradoresCurriculo,
  getCurriculoById,
  initialCurriculoFormData,
  updateCurriculo,
  type ColaboradorCurriculoOption,
  type CurriculoDTO,
  type CurriculoFormData,
} from "@/data/curriculos";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

function salvarProximaAcaoCurriculo() {
  emitJourneyNextStep();
}

function resolveNomeColaborador(dto?: CurriculoDTO | null) {
  if (!dto) return "";

  return (
    dto.colaboradorNome?.trim() ||
    dto.nomeCompleto?.trim() ||
    dto.nomeAssinatura?.trim() ||
    ""
  );
}

export default function CurriculoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<CurriculoFormData>({
    ...initialCurriculoFormData,
  });

  const [existingDto, setExistingDto] = useState<CurriculoDTO | null>(null);
  const [colaboradores, setColaboradores] = useState<
    ColaboradorCurriculoOption[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const bloqueado = visualizando || loading || loadingInitialData;

  const set = <K extends keyof CurriculoFormData>(
    k: K,
    v: CurriculoFormData[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  useImportFormFill("curriculos", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoadingInitialData(true);

        const [colaboradoresData, curriculoData] = await Promise.all([
          getColaboradoresCurriculo(),
          id ? getCurriculoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        if (curriculoData) {
          const formData = dtoToForm(curriculoData);

          const colaboradorId = String(
            curriculoData.colaboradorId ?? formData.colaboradorId ?? "",
          );

          const colaboradorNome =
            formData.colaboradorNome ||
            resolveNomeColaborador(curriculoData) ||
            (colaboradorId ? `Colaborador ${colaboradorId}` : "");

          setExistingDto(curriculoData);

          setForm({
            ...formData,
            colaboradorId,
            colaboradorNome,
          });

          setColaboradores(colaboradoresData);
        } else {
          setExistingDto(null);
          setColaboradores(colaboradoresData);
          setForm({ ...initialCurriculoFormData });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao carregar dados.";

        toast.error(message);
        navigate("/curriculos");
      } finally {
        if (active) {
          setLoadingInitialData(false);
        }
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const colaboradoresOptions = useMemo(() => {
    const options = [...colaboradores];

    const colaboradorId =
      form.colaboradorId || String(existingDto?.colaboradorId ?? "");

    const colaboradorNome =
      form.colaboradorNome ||
      resolveNomeColaborador(existingDto) ||
      (colaboradorId ? `Colaborador ${colaboradorId}` : "");

    if (
      colaboradorId &&
      !options.some((c) => String(c.id) === String(colaboradorId))
    ) {
      options.unshift({
        id: colaboradorId,
        nome: colaboradorNome,
      });
    }

    return options;
  }, [colaboradores, form.colaboradorId, form.colaboradorNome, existingDto]);

  const colaboradorSelectValue =
    form.colaboradorId || String(existingDto?.colaboradorId ?? "");

  const listFields: {
    key: keyof CurriculoFormData;
    label: string;
  }[] = useMemo(
    () => [
      { key: "formacaoAcademica", label: "Formação acadêmica" },
      { key: "atuacaoProfissional", label: "Atuação profissional" },
      { key: "experienciasRelevantes", label: "Experiências relevantes" },
      {
        key: "atividadesFormativasParticipacoes",
        label: "Atividades formativas e participações",
      },
      { key: "habilidadesCompetencias", label: "Habilidades e competências" },
      { key: "atuacaoSociocultural", label: "Atuação sociocultural" },
    ],
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const colaboradorId =
      form.colaboradorId || String(existingDto?.colaboradorId ?? "");

    if (!colaboradorId) {
      toast.error("Selecione o colaborador.");
      return;
    }

    const temAlgumItem = listFields.some(
      (f) => cleanList(form[f.key] as string[]).length > 0,
    );

    if (!temAlgumItem) {
      toast.error("Adicione ao menos uma informação no currículo.");
      return;
    }

    try {
      setLoading(true);

      const colaboradorSelecionado = colaboradoresOptions.find(
        (c) => String(c.id) === String(colaboradorId),
      );

      const payload = formToDto(
        {
          ...form,
          colaboradorId,
          colaboradorNome:
            form.colaboradorNome ||
            colaboradorSelecionado?.nome ||
            resolveNomeColaborador(existingDto),
        },
        existingDto ?? undefined,
      );

      if (editando && id) {
        await updateCurriculo(Number(id), payload);
        toast.success("Currículo atualizado com sucesso.");
      } else {
        await createCurriculo(payload);
        salvarProximaAcaoCurriculo();
        toast.success("Currículo cadastrado com sucesso.");
      }

      navigate("/curriculos");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar currículo.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/curriculos" />

        <PageTitle
          title="Currículos"
          tooltip="Nesta página é preenchido o currículo do colaborador com informações sobre formação acadêmica, atuação profissional, experiências socioculturais, atividades formativas e competências. Esses dados ajudam a demonstrar sua trajetória e experiência em projetos, editais e outras ações da organização."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/curriculos")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={User}
              title="Vínculo do currículo"
              description="Selecione o colaborador ao qual este currículo pertence."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="colaborador"
                    required
                    tooltip="Informe o colaborador ao qual as experiências, formações e demais informações deste currículo se referem. Cada colaborador deve possuir apenas um currículo principal."
                  >
                    Colaborador
                  </FieldLabel>

                  <Select
                    value={colaboradorSelectValue}
                    onValueChange={(v) => {
                      if (visualizando) return;

                      const colaboradorSelecionado = colaboradoresOptions.find(
                        (c) => String(c.id) === String(v),
                      );

                      setForm((prev) => ({
                        ...prev,
                        colaboradorId: v,
                        colaboradorNome:
                          colaboradorSelecionado?.nome ?? prev.colaboradorNome,
                      }));
                    }}
                    disabled={bloqueado || colaboradoresOptions.length === 0}
                  >
                    <SelectTrigger id="colaborador">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {colaboradoresOptions.length === 0 ? (
                        <SelectItem value="sem-colaborador" disabled>
                          Nenhum colaborador cadastrado
                        </SelectItem>
                      ) : (
                        colaboradoresOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={GraduationCap}
              title="Formação e atuação profissional"
              description="Registre a formação acadêmica e as principais experiências profissionais do colaborador, começando pelas mais recentes."
            >
              <div className="grid grid-cols-1 gap-5">
                <Field>
                  <FieldLabel
                    htmlFor="formacaoAcademica"
                    required
                    tooltip="Informe cada formação acadêmica separadamente, começando pela mais recente. Indique o curso ou área de formação, a instituição e, quando possível, o ano de conclusão."
                  >
                    Formação Acadêmica
                  </FieldLabel>

                  <CurriculoItemList
                    id="formacaoAcademica"
                    values={form.formacaoAcademica}
                    onChange={(v) => set("formacaoAcademica", v)}
                    placeholder="Ex.: Bacharelado em Música – Universidade X, 2012"
                    disabled={bloqueado}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="atuacaoProfissional"
                    required
                    tooltip="Informe cada experiência profissional separadamente, começando pela mais recente. Indique a função exercida, a organização ou local de atuação e o período correspondente."
                  >
                    Atuação Profissional
                  </FieldLabel>

                  <CurriculoItemList
                    id="atuacaoProfissional"
                    values={form.atuacaoProfissional}
                    onChange={(v) => set("atuacaoProfissional", v)}
                    placeholder="Ex.: Professor de música – Colégio X, desde 2019"
                    disabled={bloqueado}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Sparkles}
              title="Experiências e competências"
              description="Registre atuações socioculturais, atividades formativas, outras experiências relevantes e as principais habilidades desenvolvidas ao longo da trajetória do colaborador."
            >
              <div className="grid grid-cols-1 gap-5">
                <Field>
                  <FieldLabel
                    htmlFor="atuacaoSociocultural"
                    required
                    tooltip="Informe cada experiência de atuação em projetos, grupos, comunidades, movimentos ou ações de caráter social e cultural, começando pelas mais recentes."
                  >
                    Atuação Sociocultural
                  </FieldLabel>

                  <CurriculoItemList
                    id="atuacaoSociocultural"
                    values={form.atuacaoSociocultural}
                    onChange={(v) => set("atuacaoSociocultural", v)}
                    placeholder="Ex.: Oficinas culturais para jovens da comunidade"
                    disabled={bloqueado}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="atividadesFormativasParticipacoes"
                    required
                    tooltip="Informe cursos livres, oficinas, capacitações, seminários, congressos, festivais e outras atividades que contribuíram para a formação ou trajetória do colaborador, começando pelas mais recentes."
                  >
                    Atividades Formativas e Participações
                  </FieldLabel>

                  <CurriculoItemList
                    id="atividadesFormativasParticipacoes"
                    values={form.atividadesFormativasParticipacoes}
                    onChange={(v) =>
                      set("atividadesFormativasParticipacoes", v)
                    }
                    placeholder="Ex.: Oficina de produção cultural – 2024"
                    disabled={bloqueado}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="experienciasRelevantes"
                    required
                    tooltip="Informe outras experiências importantes para a trajetória do colaborador que ainda não tenham sido registradas nos campos anteriores. Cadastre cada experiência separadamente, começando pelas mais recentes."
                  >
                    Experiências Relevantes
                  </FieldLabel>

                  <CurriculoItemList
                    id="experienciasRelevantes"
                    values={form.experienciasRelevantes}
                    onChange={(v) => set("experienciasRelevantes", v)}
                    placeholder="Ex.: Integrante de coletivo cultural com atuação em teatro e música"
                    disabled={bloqueado}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="habilidadesCompetencias"
                    required
                    tooltip="Informe as principais habilidades e competências desenvolvidas pelo colaborador ao longo de sua formação, atuação profissional e demais experiências."
                  >
                    Habilidades e Competências
                  </FieldLabel>

                  <CurriculoItemList
                    id="habilidadesCompetencias"
                    values={form.habilidadesCompetencias}
                    onChange={(v) => set("habilidadesCompetencias", v)}
                    placeholder="Ex.: Regência coral"
                    disabled={bloqueado}
                  />
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/curriculos")}
              disabled={loading}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={loading || loadingInitialData}
                aria-busy={loading}
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Currículos"
          href="/wiki/pessoas/curriculos"
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

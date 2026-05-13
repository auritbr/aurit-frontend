import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, GraduationCap, Sparkles, Info } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
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
import { CurriculoItemList } from "@/components/CurriculoItemList";
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

const CURRICULO_NEXT_STEP_KEY = "aurit:curriculos:next-step-card";

function salvarProximaAcaoCurriculo() {
  const card = {
    titulo: "Após organizar o currículo, escreva a trajetória cultural do colaborador",
    descricao:
      "A trajetória cultural valoriza a história, os saberes e a prática da pessoa no campo cultural, mostrando como sua atuação foi construída ao longo do tempo e quais contribuições ela gera para a cultura, a comunidade e o território.",
    acaoLabel: "Cadastrar trajetórias",
    acaoUrl: "/trajetorias-culturais/novo",
    acaoSecundariaLabel: "Ver currículos",
    acaoSecundariaUrl: "/curriculos",
    variante: "pendente",
  };

  sessionStorage.setItem(CURRICULO_NEXT_STEP_KEY, JSON.stringify(card));
}

export default function CurriculoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<CurriculoFormData>(
    initialCurriculoFormData,
  );
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

        setColaboradores(colaboradoresData);

        if (curriculoData) {
          setExistingDto(curriculoData);
          setForm(dtoToForm(curriculoData));
        } else {
          setExistingDto(null);
          setForm(initialCurriculoFormData);
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

    if (!form.colaboradorId) {
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

      const payload = formToDto(form, existingDto ?? undefined);

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

  if (loadingInitialData) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando currículo...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/curriculos")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Currículo"
          tooltip="Organize a trajetória do colaborador, reunindo formação, experiências, competências e atuações relevantes para projetos, editais e documentos institucionais."
        />

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Preencha as informações com base na{" "}
            <span className="font-semibold">trajetória real</span> do
            colaborador. Registre formações, experiências e atuações de forma
            objetiva, evitando exageros ou informações que não possam ser
            comprovadas quando necessário.
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
          <Section icon={User} title="Identificação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="colaborador"
                  required
                  tooltip="Selecione o colaborador ao qual este currículo pertence. Cada colaborador deve possuir apenas um currículo principal no sistema."
                >
                  Colaborador
                </FieldLabel>

                <Select
                  value={form.colaboradorId}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("colaboradorId", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="colaborador">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={GraduationCap} title="Formação e atuação">
            <div className="grid grid-cols-1 gap-5">
              <Field>
                <FieldLabel
                  htmlFor="formacaoAcademica"
                  tooltip="Registre as formações do colaborador, incluindo formação acadêmica, técnica, cursos livres, oficinas ou formações reconhecidas pela trajetória. Adicione cada formação separadamente, com nome da formação, instituição, grupo, mestre responsável e ano, quando houver. Ex.: Bacharel em Música – Universidade X, 2012."
                >
                  Formação Acadêmica
                </FieldLabel>

                <CurriculoItemList
                  id="formacaoAcademica"
                  values={form.formacaoAcademica}
                  onChange={(v) => set("formacaoAcademica", v)}
                  placeholder="Ex.: Bacharel em Música – Universidade X, 2012"
                  disabled={bloqueado}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="atuacaoProfissional"
                  tooltip="Registre as principais atuações profissionais e culturais do colaborador. Adicione cada experiência separadamente, informando função exercida, instituição, grupo, projeto ou contexto de atuação e período. Ex.: Professor de música no Colégio X, desde 2019."
                >
                  Atuação Profissional
                </FieldLabel>

                <CurriculoItemList
                  id="atuacaoProfissional"
                  values={form.atuacaoProfissional}
                  onChange={(v) => set("atuacaoProfissional", v)}
                  placeholder="Ex.: Professor de música no Colégio X, desde 2019"
                  disabled={bloqueado}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Sparkles} title="Experiências e competências">
            <div className="grid grid-cols-1 gap-5">
              <Field>
                <FieldLabel
                  htmlFor="experienciasRelevantes"
                  tooltip="Registre experiências importantes para demonstrar a trajetória do colaborador, mesmo que não sejam empregos formais. Inclua projetos, grupos, coletivos, espetáculos, oficinas, ações culturais, prêmios, parcerias ou participações relevantes. Ex.: Integrante de coletivo cultural com atuação em teatro e música."
                >
                  Experiências Relevantes
                </FieldLabel>

                <CurriculoItemList
                  id="experienciasRelevantes"
                  values={form.experienciasRelevantes}
                  onChange={(v) => set("experienciasRelevantes", v)}
                  placeholder="Ex.: Integrante de coletivo cultural"
                  disabled={bloqueado}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="atividadesFormativasParticipacoes"
                  tooltip="Registre cursos, oficinas, capacitações, festivais, congressos, seminários, encontros, mostras ou eventos dos quais o colaborador participou como aluno, participante, convidado, oficineiro, palestrante ou artista. Ex.: Festival de Música e Educação – 2019."
                >
                  Atividades Formativas e Participações
                </FieldLabel>

                <CurriculoItemList
                  id="atividadesFormativasParticipacoes"
                  values={form.atividadesFormativasParticipacoes}
                  onChange={(v) =>
                    set("atividadesFormativasParticipacoes", v)
                  }
                  placeholder="Ex.: Festival de Música e Educação – 2019"
                  disabled={bloqueado}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="habilidadesCompetencias"
                  tooltip="Liste habilidades técnicas, artísticas, pedagógicas, culturais ou administrativas do colaborador. Adicione uma habilidade por item. Ex.: regência coral, produção cultural, educação musical."
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

              <Field>
                <FieldLabel
                  htmlFor="atuacaoSociocultural"
                  tooltip="Registre atuações do colaborador em ações culturais, educativas, comunitárias, sociais ou territoriais, especialmente aquelas voltadas à formação, inclusão, acesso à cultura, memória, identidade ou desenvolvimento local. Ex.: ações culturais voltadas à formação de jovens, fortalecimento comunitário, acesso à cultura ou valorização de identidades locais."
                >
                  Atuação Sociocultural
                </FieldLabel>

                <CurriculoItemList
                  id="atuacaoSociocultural"
                  values={form.atuacaoSociocultural}
                  onChange={(v) => set("atuacaoSociocultural", v)}
                  placeholder="Ex.: Ações culturais voltadas à formação de jovens"
                  disabled={bloqueado}
                />
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/curriculos")}
              disabled={loading}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
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
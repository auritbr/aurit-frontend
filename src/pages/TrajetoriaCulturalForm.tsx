import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { isPlanoAccessDenied } from "@/lib/access";
import {
  createTrajetoriaCultural,
  getColaboradoresOptions,
  getTrajetoriaCulturalById,
  updateTrajetoriaCultural,
  type ColaboradorOption,
} from "@/data/trajetoriasCulturais";
import { toast } from "sonner";

const TRAJETORIA_NEXT_STEP_KEY = "aurit:trajetorias-culturais:next-step-card";

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

function salvarProximaAcaoTrajetoriaCultural() {
  const card = {
    titulo:
      "Após registrar as trajetórias culturais, comece a estruturar os projetos",
    descricao:
      "Os projetos organizam objetivos, público atendido, acessibilidade, período, equipe e ações previstas. Esse cadastro ajuda a transformar a atuação da organização em propostas claras para execução, editais, relatórios e prestação de contas.",
    acaoLabel: "Cadastrar projetos",
    acaoUrl: "/projetos/novo",
    acaoSecundariaLabel: "Ver trajetórias",
    acaoSecundariaUrl: "/trajetorias-culturais",
    variante: "pendente",
  };

  sessionStorage.setItem(TRAJETORIA_NEXT_STEP_KEY, JSON.stringify(card));
}

function resolverNomeColaborador(trajetoria?: TrajetoriaCarregada | null) {
  if (!trajetoria) return "";

  return (
    trajetoria.colaboradorNome?.trim() ||
    trajetoria.nomeCompleto?.trim() ||
    ""
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
        <button
          type="button"
          onClick={() => navigate("/trajetorias-culturais")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Trajetória Cultural"
          tooltip="Escreva a trajetória cultural do colaborador em formato narrativo, destacando sua história, experiências, linguagens de atuação, aprendizados, contribuições e evolução ao longo do tempo."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p className="text-justify leading-relaxed">
            Descreva a trajetória cultural do colaborador em formato de texto
            corrido, apresentando sua história com a cultura, os saberes que
            desenvolveu, com quem aprendeu, quais práticas construiu, por onde
            passou e como sua atuação se relaciona com a comunidade, o
            território e as linguagens culturais que desenvolve.
          </p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground/80">
            Para ajudar na escrita, reflita sobre estas perguntas:
          </p>

          <ul className="mt-2 grid list-disc gap-1 pl-5 text-xs marker:text-muted-foreground/60 sm:text-[13px]">
            <li>Como começou sua atuação cultural?</li>
            <li>Com quem aprendeu ou onde se formou na prática?</li>
            <li>
              Em quais grupos, coletivos, instituições, mestres, movimentos ou
              projetos atuou?
            </li>
            <li>Quais linguagens culturais desenvolve?</li>
            <li>Com quais públicos, comunidades ou territórios trabalha?</li>
            <li>
              Quais resultados, impactos, formações ou contribuições sua atuação
              já gerou?
            </li>
            <li>
              Como sua atuação fortalece a cultura, a comunidade ou o
              território?
            </li>
          </ul>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={User} title="Identificação">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="colaborador"
                  required={!visualizando}
                  tooltip="Selecione o colaborador cuja trajetória cultural será registrada. Esse texto ficará vinculado ao cadastro da pessoa e poderá ser utilizado em currículos, propostas de edital, portfólios e relatórios institucionais."
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
                        colaboradorSelecionado?.nome ??
                        prev.colaboradorNome,
                    }));
                  }}
                  disabled={bloqueado || colaboradoresComFallback.length === 0}
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
          </Section>

          <Section icon={FileText} title="Texto da trajetória">
            <Field>
              <FieldLabel
                htmlFor="textoTrajetoria"
                required={!visualizando}
                tooltip="Escreva a trajetória em formato narrativo, contando como a relação com a cultura começou, quais saberes foram aprendidos, quais práticas e linguagens foram desenvolvidas, em quais grupos, projetos ou territórios houve atuação e quais contribuições essa trajetória gerou. Ex.: Minha trajetória cultural começou na infância, a partir do contato com saberes, práticas e experiências que despertaram minha relação com a arte e a cultura. Ao longo do tempo, participei de grupos, projetos e formações que contribuíram para o desenvolvimento da minha atuação..."
              >
                Texto da Trajetória
              </FieldLabel>

              <Textarea
                id="textoTrajetoria"
                value={form.textoTrajetoria}
                onChange={(e) => set("textoTrajetoria", e.target.value)}
                className="min-h-[320px] text-justify leading-relaxed"
                disabled={bloqueado}
                readOnly={visualizando}
              />

              <p className="mt-2 text-xs text-muted-foreground">
                {form.textoTrajetoria.trim().length} caracteres
              </p>
            </Field>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/trajetorias-culturais")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-32"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Trajetórias Culturais"
          href="https://www.aurit.com.br/wiki/trajetorias/trajetorias-culturais"
        />
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
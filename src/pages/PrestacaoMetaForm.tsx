import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  BarChart3,
  ClipboardCheck,
  Paperclip,
  Info,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { ImportDataTitleAction } from "@/components/PageTitle";
import { MultiSelect } from "@/components/MultiSelect";
import {
  getPrestacaoMetaById,
  createPrestacaoMeta,
  updatePrestacaoMeta,
  getMetasProjetoOptions,
  getEvidenciasExecucaoOptions,
  getPrestacaoMetas,
  buildPrestacaoMetaPayload,
  statusCumprimentoOptions,
  type StatusCumprimentoMeta,
  type MetaProjetoOption,
  type EvidenciaOption,
  type PrestacaoMeta,
} from "@/data/prestacaoMetas";
import { toast } from "sonner";

const PRESTACAO_META_NEXT_STEP_KEY = "aurit:prestacao-metas:next-step-card";

interface PrestacaoMetaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPrestacaoMeta() {
  const card: PrestacaoMetaNextStepCardData = {
    titulo:
      "Após registrar o cumprimento das metas, organize a prestação de contas",
    descricao:
      "A prestação de contas ajuda a reunir as informações finais do projeto, como data de entrega, metas executadas, produtos gerados, equipe envolvida, ações de divulgação e resultados alcançados.",
    acaoLabel: "Cadastrar prestação de contas",
    acaoUrl: "/prestacao-contas/novo",
    acaoSecundariaLabel: "Ver cumprimento de metas",
    acaoSecundariaUrl: "/prestacao-metas",
    variante: "pendente",
  };

  sessionStorage.setItem(
    PRESTACAO_META_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

interface FormState {
  metaProjeto: string;
  quantidadeExecutada: string;
  observacaoCumprimento: string;
  statusCumprimentoMeta: StatusCumprimentoMeta | "";
  justificativaNaoCumprimentoIntegral: string;
  evidencias: string[];
}

const initial: FormState = {
  metaProjeto: "",
  quantidadeExecutada: "",
  observacaoCumprimento: "",
  statusCumprimentoMeta: "",
  justificativaNaoCumprimentoIntegral: "",
  evidencias: [],
};

export default function PrestacaoMetaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const [metas, setMetas] = useState<MetaProjetoOption[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaOption[]>([]);
  const [allItems, setAllItems] = useState<PrestacaoMeta[]>([]);

  const bloqueado = loading || saving || visualizando;

  useImportFormFill("prestacoes-metas", setForm);

  useEffect(() => {
    let active = true;

    async function carregarTudo() {
      try {
        setLoading(true);

        const [itemData, metasData, evidenciasData, listaData] =
          await Promise.all([
            id ? getPrestacaoMetaById(Number(id)) : Promise.resolve(null),
            getMetasProjetoOptions(),
            getEvidenciasExecucaoOptions(),
            getPrestacaoMetas(),
          ]);

        if (!active) return;

        const metaId = String(itemData?.metaProjeto ?? "");
        const evidenciasIds = (itemData?.evidencias ?? []).map(String);

        const metasNormalizadas = (metasData ?? [])
          .filter(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id).trim(),
          )
          .map((item) => ({
            id: String(item.id),
            tituloMeta: item.tituloMeta?.trim() || `Meta ${item.id}`,
          }));

        const evidenciasNormalizadas = (evidenciasData ?? [])
          .filter(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id).trim(),
          )
          .map((item) => ({
            id: String(item.id),
            tituloEvidencia:
              item.tituloEvidencia?.trim() || `Evidência ${item.id}`,
          }));

        if (metaId && !metasNormalizadas.some((item) => item.id === metaId)) {
          metasNormalizadas.push({
            id: metaId,
            tituloMeta: `Meta vinculada #${metaId}`,
          });
        }

        evidenciasIds.forEach((evidenciaId) => {
          if (
            evidenciaId &&
            !evidenciasNormalizadas.some((item) => item.id === evidenciaId)
          ) {
            evidenciasNormalizadas.push({
              id: evidenciaId,
              tituloEvidencia: `Evidência vinculada #${evidenciaId}`,
            });
          }
        });

        setMetas(metasNormalizadas);
        setEvidencias(evidenciasNormalizadas);
        setAllItems(listaData ?? []);

        if (itemData) {
          setForm({
            metaProjeto: metaId,
            quantidadeExecutada: itemData.quantidadeExecutada ?? "",
            observacaoCumprimento: itemData.observacaoCumprimento ?? "",
            statusCumprimentoMeta: itemData.statusCumprimentoMeta ?? "",
            justificativaNaoCumprimentoIntegral:
              itemData.justificativaNaoCumprimentoIntegral ?? "",
            evidencias: evidenciasIds,
          });
        } else {
          setForm(initial);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar cumprimento de metas.",
        );

        if (id) {
          navigate("/prestacao-metas");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarTudo();

    return () => {
      active = false;
    };
  }, [id, location.pathname, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isParcial = form.statusCumprimentoMeta === "CUMPRIDA_PARCIALMENTE";
  const isNaoCumprida = form.statusCumprimentoMeta === "NAO_CUMPRIDA";
  const isIntegral = form.statusCumprimentoMeta === "CUMPRIDA_INTEGRALMENTE";

  const justificativaObrigatoria = isParcial || isNaoCumprida;

  const mostrarJustificativa =
    form.statusCumprimentoMeta !== "" && !isIntegral;

  const quantidadeObrigatoria = isIntegral || isParcial;

  const metasComSelecao = useMemo(() => {
    const normalizadas = metas.map((item) => ({
      ...item,
      id: String(item.id),
      tituloMeta: item.tituloMeta?.trim() || `Meta ${item.id}`,
    }));

    if (
      form.metaProjeto &&
      !normalizadas.some(
        (item) => String(item.id) === String(form.metaProjeto),
      )
    ) {
      normalizadas.push({
        id: String(form.metaProjeto),
        tituloMeta: `Meta vinculada #${form.metaProjeto}`,
      });
    }

    return normalizadas;
  }, [metas, form.metaProjeto]);

  const evidenciasComSelecao = useMemo(() => {
    const normalizadas = evidencias.map((item) => ({
      ...item,
      id: String(item.id),
      tituloEvidencia:
        item.tituloEvidencia?.trim() || `Evidência ${item.id}`,
    }));

    const faltantes = form.evidencias
      .filter(
        (id) =>
          id &&
          !normalizadas.some((item) => String(item.id) === String(id)),
      )
      .map((id) => ({
        id: String(id),
        tituloEvidencia: `Evidência vinculada #${id}`,
      }));

    return [...normalizadas, ...faltantes];
  }, [evidencias, form.evidencias]);

  const metaSelecionadaNome = useMemo(() => {
    if (!form.metaProjeto) return "";

    return (
      metasComSelecao.find(
        (item) => String(item.id) === String(form.metaProjeto),
      )?.tituloMeta ?? `Meta vinculada #${form.metaProjeto}`
    );
  }, [metasComSelecao, form.metaProjeto]);

  const statusSelecionadoNome = useMemo(() => {
    if (!form.statusCumprimentoMeta) return "";

    return (
      statusCumprimentoOptions.find(
        (item) => item.value === form.statusCumprimentoMeta,
      )?.label ?? form.statusCumprimentoMeta
    );
  }, [form.statusCumprimentoMeta]);

  const evidenciasOptions = useMemo(
    () => evidenciasComSelecao.map((item) => String(item.id)),
    [evidenciasComSelecao],
  );

  const evidenciaLabel = (id: string) =>
    evidenciasComSelecao.find((item) => String(item.id) === String(id))
      ?.tituloEvidencia ?? `Evidência ${id}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const metaProjetoId = form.metaProjeto.trim();

    if (!metaProjetoId) {
      toast.error("Selecione a meta do projeto.");
      return;
    }

    if (!form.statusCumprimentoMeta) {
      toast.error("Selecione o status de cumprimento.");
      return;
    }

    if (quantidadeObrigatoria && !form.quantidadeExecutada.trim()) {
      toast.error(
        "Informe a quantidade executada quando a meta estiver cumprida ou parcialmente cumprida.",
      );
      return;
    }

    const duplicada = allItems.find(
      (item) =>
        String(item.metaProjeto) === String(metaProjetoId) &&
        String(item.id) !== String(id ?? ""),
    );

    if (duplicada) {
      toast.error("Esta meta já possui um cumprimento cadastrado.");
      return;
    }

    if (
      justificativaObrigatoria &&
      !form.justificativaNaoCumprimentoIntegral.trim()
    ) {
      toast.error(
        isParcial
          ? "Explique por que a meta foi cumprida apenas parcialmente."
          : "Explique por que a meta não foi cumprida.",
      );
      return;
    }

    try {
      setSaving(true);

      const item: PrestacaoMeta = {
        id: id ?? "",
        metaProjeto: metaProjetoId,
        quantidadeExecutada: form.quantidadeExecutada.trim(),
        percentualExecutado: undefined,
        observacaoCumprimento: form.observacaoCumprimento,
        statusCumprimentoMeta: form.statusCumprimentoMeta,
        justificativaNaoCumprimentoIntegral:
          form.justificativaNaoCumprimentoIntegral,
        evidencias: form.evidencias.map(String),
      };

      const payload = buildPrestacaoMetaPayload(item);

      if (editando && id) {
        await updatePrestacaoMeta(Number(id), payload);
        toast.success("Cumprimento de metas atualizado.");
      } else {
        await createPrestacaoMeta(payload);
        salvarProximaAcaoPrestacaoMeta();
        toast.success("Cumprimento de metas cadastrado.");
      }

      navigate("/prestacao-metas", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar cumprimento de metas.",
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
          onClick={() => navigate("/prestacao-metas")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Cumprimento de Metas
            </h1>

            <HelpTooltip
              text="Acompanhe o cumprimento das metas previstas no projeto, comparando o que foi planejado com o que foi executado. Informe a quantidade realizada, o status de cumprimento, observações e evidências que comprovem a execução."
              label="Cumprimento de Metas"
              size="md"
              side="bottom"
              align="start"
            />
            <ImportDataTitleAction show={!visualizando} />
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Use esta página para{" "}
            <span className="font-semibold">comparar</span> o que foi planejado
            com o que foi executado. Selecione a meta prevista, informe o
            resultado alcançado e vincule evidências que comprovem a execução.
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
          <Section icon={Link2} title="Vínculo da meta">
            <Field>
              <FieldLabel
                htmlFor="metaProjeto"
                required
                tooltip="Selecione a meta prevista no projeto que será comparada com o resultado executado."
              >
                Meta do Projeto
              </FieldLabel>

              {visualizando ? (
                <Input
                  id="metaProjeto"
                  value={metaSelecionadaNome || "—"}
                  disabled
                  readOnly
                  className="bg-muted/40 cursor-not-allowed"
                />
              ) : (
                <Select
                  key={`meta-${form.metaProjeto}-${metasComSelecao.length}`}
                  value={String(form.metaProjeto || "")}
                  onValueChange={(value) => set("metaProjeto", String(value))}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="metaProjeto">
                    <SelectValue placeholder="Selecione a meta" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {metasComSelecao.length === 0 ? (
                      <SelectItem value="sem-meta" disabled>
                        Nenhuma meta cadastrada
                      </SelectItem>
                    ) : (
                      metasComSelecao.map((meta) => (
                        <SelectItem
                          key={String(meta.id)}
                          value={String(meta.id)}
                        >
                          {meta.tituloMeta}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </Section>

          <Section icon={BarChart3} title="Resultado executado">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="quantidadeExecutada"
                  required={quantidadeObrigatoria}
                  tooltip="Informe a quantidade efetivamente realizada em relação à meta prevista. Como este campo é textual, você pode informar valores com unidade. Ex.: 8 oficinas, 120 participantes, 3 apresentações, 10 encontros realizados."
                >
                  Quantidade Executada
                </FieldLabel>

                <Input
                  id="quantidadeExecutada"
                  value={form.quantidadeExecutada}
                  onChange={(e) =>
                    set("quantidadeExecutada", e.target.value)
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="observacaoCumprimento"
                  tooltip="Registre informações sobre o cumprimento da meta, explicando resultados alcançados, ajustes realizados, dificuldades, justificativas ou diferenças entre o previsto e o executado."
                >
                  Observação sobre o Cumprimento
                </FieldLabel>

                <Textarea
                  id="observacaoCumprimento"
                  value={form.observacaoCumprimento}
                  onChange={(e) => set("observacaoCumprimento", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={ClipboardCheck} title="Cumprimento da meta">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="statusCumprimentoMeta"
                    required
                    tooltip="Selecione a situação da meta: Cumprida Integralmente quando foi realizada conforme previsto, Cumprida Parcialmente quando apenas parte foi executada, Não cumprida quando não foi realizada e Não se aplica quando a meta não fizer parte deste cumprimento."
                  >
                    Status de Cumprimento
                  </FieldLabel>

                  {visualizando ? (
                    <Input
                      id="statusCumprimentoMeta"
                      value={statusSelecionadoNome || "—"}
                      disabled
                      readOnly
                      className="bg-muted/40 cursor-not-allowed"
                    />
                  ) : (
                    <Select
                      value={form.statusCumprimentoMeta}
                      onValueChange={(value) =>
                        set(
                          "statusCumprimentoMeta",
                          value as StatusCumprimentoMeta,
                        )
                      }
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="statusCumprimentoMeta">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>

                      <SelectContent>
                        {statusCumprimentoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </div>

              {mostrarJustificativa && (
                <Field>
                  <FieldLabel
                    htmlFor="justificativaNaoCumprimentoIntegral"
                    required={justificativaObrigatoria}
                    tooltip="Explique o motivo pelo qual a meta não foi cumprida integralmente, informando dificuldades, alterações, impedimentos, remanejamentos ou fatores que impactaram a execução prevista."
                  >
                    Justificativa quando não cumprida integralmente
                  </FieldLabel>

                  <Textarea
                    id="justificativaNaoCumprimentoIntegral"
                    value={form.justificativaNaoCumprimentoIntegral}
                    onChange={(e) =>
                      set(
                        "justificativaNaoCumprimentoIntegral",
                        e.target.value,
                      )
                    }
                    placeholder={
                      isParcial
                        ? "Explique por que a meta foi cumprida apenas parcialmente..."
                        : isNaoCumprida
                          ? "Explique por que a meta não foi cumprida..."
                          : "Registre observações relevantes..."
                    }
                    rows={3}
                    className={
                      justificativaObrigatoria
                        ? "border-amber-500/40 focus-visible:ring-amber-500/30"
                        : ""
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              )}
            </div>
          </Section>

          <Section icon={Paperclip} title="Evidências">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Selecione as evidências que comprovam o cumprimento desta meta.
            </p>

            <Field>
              <FieldLabel
                htmlFor="evidencias"
                tooltip="Vincule as evidências que comprovam o cumprimento desta meta, como fotos, listas de presença, relatórios, vídeos, documentos, materiais gráficos ou links de publicação."
              >
                Evidências
              </FieldLabel>

              {visualizando ? (
                <div className="min-h-10 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
                  {form.evidencias.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.evidencias.map((evidenciaId) => (
                        <span
                          key={evidenciaId}
                          className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          {evidenciaLabel(evidenciaId)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Nenhuma evidência vinculada.
                    </span>
                  )}
                </div>
              ) : (
                <MultiSelect
                  id="evidencias"
                  options={evidenciasOptions}
                  value={form.evidencias}
                  onChange={(value) =>
                    set(
                      "evidencias",
                      value.filter(Boolean).map(String),
                    )
                  }
                  getOptionLabel={evidenciaLabel}
                />
              )}
            </Field>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/prestacao-metas")}
              disabled={saving}
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
        <WikiFloatingButton
          pageTitle="Cumprimento de Metas"
          href="https://www.aurit.com.br/wiki/prestacao-de-contas/cumprimento-de-metas"
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

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

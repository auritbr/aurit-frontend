import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Link2,
  BarChart3,
  ClipboardCheck,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { FormSectionCard } from "@/components/FormSectionCard";
import { FormMultiSelect } from "@/components/FormMultiSelect";
import { ImportDataButton } from "@/components/ImportDataButton";
import { StatusPill } from "@/components/StatusPill";
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
import { getImportConfigForPath } from "@/config/importacoes";
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

  sessionStorage.setItem(PRESTACAO_META_NEXT_STEP_KEY, JSON.stringify(card));
}

function parseNumeroDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatPercentual(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface FormState {
  metaProjeto: string;
  quantidadeExecutada: string;
  percentualExecutado: string;
  observacaoCumprimento: string;
  statusCumprimentoMeta: StatusCumprimentoMeta | "";
  justificativaNaoCumprimentoIntegral: string;
  evidencias: string[];
}

const initial: FormState = {
  metaProjeto: "",
  quantidadeExecutada: "",
  percentualExecutado: "",
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

        const metasNormalizadas: MetaProjetoOption[] = (metasData ?? [])
          .filter(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id).trim(),
          )
          .map((item) => ({
            id: String(item.id),
            tituloMeta: item.tituloMeta?.trim() || `Meta ${item.id}`,
            quantidadePrevista: item.quantidadePrevista,
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
            percentualExecutado:
              itemData.percentualExecutado == null
                ? ""
                : String(itemData.percentualExecutado).replace(".", ","),
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

  const handleSituacaoChange = (value: StatusCumprimentoMeta) => {
    setForm((prev) => ({
      ...prev,
      statusCumprimentoMeta: value,
      justificativaNaoCumprimentoIntegral:
        value === "CUMPRIDA_PARCIALMENTE" || value === "NAO_CUMPRIDA"
          ? prev.justificativaNaoCumprimentoIntegral
          : "",
    }));
  };

  const isParcial = form.statusCumprimentoMeta === "CUMPRIDA_PARCIALMENTE";
  const isNaoCumprida = form.statusCumprimentoMeta === "NAO_CUMPRIDA";
  const isIntegral = form.statusCumprimentoMeta === "CUMPRIDA_INTEGRALMENTE";

  const justificativaObrigatoria = isParcial || isNaoCumprida;

  const mostrarJustificativa = form.statusCumprimentoMeta !== "" && !isIntegral;

  const quantidadeObrigatoria = isIntegral || isParcial;

  const metaSelecionada = metas.find(
    (item) => String(item.id) === String(form.metaProjeto),
  );
  const quantidadePrevista = metaSelecionada?.quantidadePrevista;
  const quantidadeExecutadaNumero = parseNumeroDecimal(
    form.quantidadeExecutada,
  );
  const percentualCalculado =
    quantidadePrevista !== undefined &&
    quantidadePrevista > 0 &&
    quantidadeExecutadaNumero !== undefined
      ? (quantidadeExecutadaNumero / quantidadePrevista) * 100
      : undefined;
  const percentualNumero =
    percentualCalculado ??
    (form.percentualExecutado.trim()
      ? Number(form.percentualExecutado.replace(",", "."))
      : undefined);

  const alertaCoerencia =
    percentualNumero !== undefined &&
    Number.isFinite(percentualNumero) &&
    ((percentualNumero >= 100 && isNaoCumprida) ||
      (percentualNumero === 0 && isIntegral));

  const metasComSelecao = useMemo(() => {
    const normalizadas = metas.map((item) => ({
      ...item,
      id: String(item.id),
      tituloMeta: item.tituloMeta?.trim() || `Meta ${item.id}`,
    }));

    if (
      form.metaProjeto &&
      !normalizadas.some((item) => String(item.id) === String(form.metaProjeto))
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
      tituloEvidencia: item.tituloEvidencia?.trim() || `Evidência ${item.id}`,
    }));

    const faltantes = form.evidencias
      .filter(
        (id) =>
          id && !normalizadas.some((item) => String(item.id) === String(id)),
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
    () =>
      evidenciasComSelecao.map((item) => ({
        value: String(item.id),
        label: item.tituloEvidencia,
      })),
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

    if (
      percentualNumero !== undefined &&
      (!Number.isFinite(percentualNumero) || percentualNumero < 0)
    ) {
      toast.error(
        "Informe um percentual executado válido, sem valores negativos.",
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
        percentualExecutado: percentualNumero,
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
        <BackButton to="/prestacao-metas" />
        <ListPageHeader
          title={
            visualizando
              ? "Cumprimento de Metas"
              : editando
                ? "Cumprimento de Metas"
                : "Cumprimento de Metas"
          }
          tooltip="Nesta página é registrado e avaliado o cumprimento das metas previstas no projeto, comparando o que foi planejado com os resultados alcançados. Também podem ser vinculadas evidências já cadastradas para comprovar a execução e os resultados de cada meta."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/prestacao-metas")!}
                canFillForm
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section
            icon={Link2}
            title="Vínculo da meta"
            description="Defina qual meta será objeto desta prestação, para que o resultado realizado possa ser comparado com o que foi originalmente previsto no projeto."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="metaProjeto"
                  required
                  tooltip="Selecione a meta do projeto que será avaliada neste registro. Os resultados informados abaixo deverão corresponder ao que estava previsto nessa meta."
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
            </div>
          </Section>

          <Section
            icon={BarChart3}
            title="Resultado alcançado"
            description="Registre o resultado efetivamente alcançado para que o sistema possa compará-lo com a quantidade prevista na meta e demonstrar o nível de execução."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="quantidadeExecutada"
                  required={quantidadeObrigatoria}
                  tooltip="Informe o resultado realizado em quantidade, usando a mesma referência da meta sempre que possível. Ex.: 8 oficinas realizadas, 120 participantes atendidos ou 3 apresentações realizadas."
                >
                  Quantidade Executada
                </FieldLabel>

                <Input
                  id="quantidadeExecutada"
                  inputMode="decimal"
                  value={form.quantidadeExecutada}
                  onChange={(e) =>
                    set(
                      "quantidadeExecutada",
                      e.target.value.replace(/[^\d,.]/g, "").replace(".", ","),
                    )
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="percentualExecutado"
                  tooltip="Calculado automaticamente dividindo a quantidade executada pela quantidade prevista na meta e multiplicando o resultado por 100."
                >
                  Percentual Executado
                </FieldLabel>

                <div className="relative">
                  <Input
                    id="percentualExecutado"
                    value={formatPercentual(percentualNumero)}
                    className="pr-8"
                    disabled
                    readOnly
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                    %
                  </span>
                </div>

                {quantidadePrevista !== undefined && quantidadePrevista > 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Calculado sobre a quantidade prevista de{" "}
                    {quantidadePrevista.toLocaleString("pt-BR")}.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    A meta selecionada precisa ter uma quantidade prevista maior
                    que zero para calcular o percentual.
                  </p>
                )}

                {percentualNumero !== undefined && percentualNumero > 100 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Percentual acima de 100% indica que a meta foi superada.
                  </p>
                )}
              </Field>
            </div>
          </Section>

          <Section
            icon={ClipboardCheck}
            title="Avaliação do cumprimento"
            description="Avalie o cumprimento da meta com base no resultado alcançado e registre as informações necessárias para explicar diferenças entre o que foi previsto e o que foi realizado."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="statusCumprimentoMeta"
                    required
                    tooltip="Selecione a situação que melhor representa o resultado alcançado em comparação com a meta prevista. Considere a quantidade realizada, o percentual executado e demais resultados registrados."
                  >
                    Situação do Cumprimento
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
                        handleSituacaoChange(value as StatusCumprimentoMeta)
                      }
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="statusCumprimentoMeta">
                        <SelectValue placeholder="Selecione a situação" />
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

                  {form.statusCumprimentoMeta && (
                    <div className="mt-2">
                      <StatusPill
                        status={form.statusCumprimentoMeta}
                        context="cumprimento-meta"
                        ariaLabelPrefix="Situação do cumprimento"
                      />
                    </div>
                  )}
                </Field>
              </div>

              {alertaCoerencia && (
                <p className="flex items-start gap-2 rounded-[12px] border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  O percentual informado parece não corresponder à situação
                  selecionada. Revise os dados antes de salvar.
                </p>
              )}

              {mostrarJustificativa && (
                <Field>
                  <FieldLabel
                    htmlFor="justificativaNaoCumprimentoIntegral"
                    required={justificativaObrigatoria}
                    tooltip="Explique por que a meta não foi alcançada integralmente. Informe, quando aplicável, dificuldades encontradas, mudanças ocorridas durante a execução ou outras situações que tenham afetado o resultado."
                  >
                    Justificativa do não cumprimento integral
                  </FieldLabel>

                  <Textarea
                    id="justificativaNaoCumprimentoIntegral"
                    value={form.justificativaNaoCumprimentoIntegral}
                    onChange={(e) =>
                      set("justificativaNaoCumprimentoIntegral", e.target.value)
                    }
                    placeholder={
                      isParcial
                        ? "Explique por que a meta foi cumprida apenas parcialmente..."
                        : isNaoCumprida
                          ? "Explique por que a meta não foi cumprida..."
                          : "Registre a justificativa..."
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

              <Field>
                <FieldLabel
                  htmlFor="observacaoCumprimento"
                  tooltip="Descreva informações importantes sobre o resultado alcançado, como diferenças entre o previsto e o realizado, ajustes feitos durante a execução, dificuldades encontradas ou resultados que mereçam destaque."
                >
                  Observações sobre o Cumprimento
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

          <Section
            icon={Paperclip}
            title="Evidências"
            description="Selecione as evidências já cadastradas que comprovam a execução e os resultados alcançados nesta meta."
          >
            <Field>
              <FieldLabel
                htmlFor="evidencias"
                tooltip="Selecione as evidências já cadastradas no sistema que ajudam a comprovar a execução e os resultados desta meta, como fotos, listas de presença, relatórios, vídeos, documentos, materiais gráficos ou links de publicações."
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
              ) : evidenciasOptions.length === 0 ? (
                <div className="rounded-[12px] border border-border/60 bg-muted/25 px-3 py-2.5">
                  <p className="text-[13px] text-muted-foreground">
                    Nenhuma evidência disponível para vinculação.
                  </p>

                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="mt-2 h-8 px-3 text-[13px]"
                    onClick={() => navigate("/evidencias")}
                  >
                    Cadastrar evidência
                  </Button>
                </div>
              ) : (
                <FormMultiSelect
                  id="evidencias"
                  options={evidenciasOptions}
                  value={form.evidencias}
                  onChange={(value) =>
                    set("evidencias", value.filter(Boolean).map(String))
                  }
                  placeholder="Selecione uma ou mais evidências"
                  searchPlaceholder="Pesquisar evidência..."
                  emptyMessage="Nenhuma evidência encontrada."
                />
              )}
            </Field>
          </Section>

          {visualizando ? (
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/prestacao-metas")}
              >
                Voltar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/prestacao-metas")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={loading || saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
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
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
  );
}

function Field({
  children,
  full,
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-2" : ""}>{children}</div>;
}

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  CalendarRange,
  ClipboardCheck,
  MessageSquareText,
  Info,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
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
import { MultiSelect } from "@/components/MultiSelect";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  getPrestacaoContasById,
  createPrestacaoContas,
  updatePrestacaoContas,
  buildPrestacaoPayload,
  getPropostasEditalOptions,
  getPlanejamentosFinanceirosOptions,
  statusPrestacaoContasOptions,
  createEmptyPrestacaoContas,
  type PrestacaoContas,
  type StatusPrestacaoContas,
  type PropostaEditalOption,
  type PlanejamentoFinanceiroOption,
} from "@/data/prestacaoContas";
import { toast } from "sonner";

const PRESTACAO_CONTAS_NEXT_STEP_KEY =
  "aurit:prestacao-contas:next-step-card";

interface PrestacaoContasNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPrestacaoContas() {
  const card: PrestacaoContasNextStepCardData = {
    titulo:
      "Após acompanhar a prestação de contas, valide o cumprimento das metas",
    descricao:
      "A prestação de metas ajuda a comparar o que foi planejado com o que foi executado, registrando quantidade realizada, status de cumprimento, justificativas e evidências que comprovam os resultados alcançados.",
    acaoLabel: "Cadastrar metas prestadas",
    acaoUrl: "/prestacao-metas/novo",
    acaoSecundariaLabel: "Ver prestações",
    acaoSecundariaUrl: "/prestacao-contas",
    variante: "pendente",
  };

  sessionStorage.setItem(
    PRESTACAO_CONTAS_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

interface FormState {
  propostaEdital: string;
  planejamentosFinanceiros: string[];
  periodoInicio: string;
  periodoFim: string;
  dataEnvio: string;
  dataAprovacao: string;
  statusPrestacaoContas: StatusPrestacaoContas | "";
  parecerInterno: string;
  parecerExterno: string;
  observacoesGerais: string;
}

const initial: FormState = {
  propostaEdital: "",
  planejamentosFinanceiros: [],
  periodoInicio: "",
  periodoFim: "",
  dataEnvio: "",
  dataAprovacao: "",
  statusPrestacaoContas: "",
  parecerInterno: "",
  parecerExterno: "",
  observacoesGerais: "",
};

export default function PrestacaoContasForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [planejamentos, setPlanejamentos] = useState<
    PlanejamentoFinanceiroOption[]
  >([]);

  const bloqueado = loading || saving || visualizando;

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [prestacaoData, propostasData, planejamentosData] =
          await Promise.all([
            id ? getPrestacaoContasById(Number(id)) : Promise.resolve(null),
            getPropostasEditalOptions(),
            getPlanejamentosFinanceirosOptions(),
          ]);

        if (!active) return;

        const propostaId = String(prestacaoData?.propostaEdital ?? "");
        const planejamentosIds = (prestacaoData?.planejamentosFinanceiros ?? [])
          .filter(Boolean)
          .map(String);

        const propostasNormalizadas = (propostasData ?? [])
          .filter(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id).trim() !== "",
          )
          .map((item) => ({
            id: String(item.id),
            nome: item.nome?.trim() || `Proposta ${item.id}`,
          }));

        const planejamentosNormalizados = (planejamentosData ?? [])
          .filter(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id).trim() !== "",
          )
          .map((item) => ({
            id: String(item.id),
            nome: item.nome?.trim() || `Planejamento ${item.id}`,
          }));

        if (
          propostaId &&
          !propostasNormalizadas.some(
            (item) => String(item.id) === String(propostaId),
          )
        ) {
          propostasNormalizadas.push({
            id: propostaId,
            nome: `Proposta vinculada #${propostaId}`,
          });
        }

        planejamentosIds.forEach((planejamentoId) => {
          if (
            planejamentoId &&
            !planejamentosNormalizados.some(
              (item) => String(item.id) === String(planejamentoId),
            )
          ) {
            planejamentosNormalizados.push({
              id: planejamentoId,
              nome: `Planejamento vinculado #${planejamentoId}`,
            });
          }
        });

        setPropostas(propostasNormalizadas);
        setPlanejamentos(planejamentosNormalizados);

        if (prestacaoData) {
          setForm({
            propostaEdital: propostaId,
            planejamentosFinanceiros: planejamentosIds,
            periodoInicio: prestacaoData.periodoInicio ?? "",
            periodoFim: prestacaoData.periodoFim ?? "",
            dataEnvio: prestacaoData.dataEnvio ?? "",
            dataAprovacao: prestacaoData.dataAprovacao ?? "",
            statusPrestacaoContas: prestacaoData.statusPrestacaoContas ?? "",
            parecerInterno: prestacaoData.parecerInterno ?? "",
            parecerExterno: prestacaoData.parecerExterno ?? "",
            observacoesGerais: prestacaoData.observacoesGerais ?? "",
          });
        } else {
          setForm(initial);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar prestação de contas.",
        );

        navigate("/prestacao-contas");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, location.pathname, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const propostasComSelecao = useMemo(() => {
    const normalizadas = propostas.map((item) => ({
      id: String(item.id),
      nome: item.nome?.trim() || `Proposta ${item.id}`,
    }));

    if (
      form.propostaEdital &&
      !normalizadas.some(
        (item) => String(item.id) === String(form.propostaEdital),
      )
    ) {
      normalizadas.push({
        id: String(form.propostaEdital),
        nome: `Proposta vinculada #${form.propostaEdital}`,
      });
    }

    return normalizadas;
  }, [propostas, form.propostaEdital]);

  const planejamentosComSelecao = useMemo(() => {
    const normalizados = planejamentos.map((item) => ({
      id: String(item.id),
      nome: item.nome?.trim() || `Planejamento ${item.id}`,
    }));

    form.planejamentosFinanceiros.forEach((planejamentoId) => {
      if (
        planejamentoId &&
        !normalizados.some(
          (item) => String(item.id) === String(planejamentoId),
        )
      ) {
        normalizados.push({
          id: String(planejamentoId),
          nome: `Planejamento vinculado #${planejamentoId}`,
        });
      }
    });

    return normalizados;
  }, [planejamentos, form.planejamentosFinanceiros]);

  const propostaSelecionadaNome = useMemo(() => {
    if (!form.propostaEdital) return "";

    return (
      propostasComSelecao.find(
        (item) => String(item.id) === String(form.propostaEdital),
      )?.nome ?? `Proposta vinculada #${form.propostaEdital}`
    );
  }, [propostasComSelecao, form.propostaEdital]);

  const statusSelecionadoNome = useMemo(() => {
    if (!form.statusPrestacaoContas) return "";

    return (
      statusPrestacaoContasOptions.find(
        (item) => item.value === form.statusPrestacaoContas,
      )?.label ?? form.statusPrestacaoContas
    );
  }, [form.statusPrestacaoContas]);

  const periodoInvertido = !!(
    form.periodoInicio &&
    form.periodoFim &&
    form.periodoFim < form.periodoInicio
  );

  const envioAntesPeriodo = !!(
    form.periodoInicio &&
    form.dataEnvio &&
    form.dataEnvio < form.periodoInicio
  );

  const aprovacaoAntesEnvio = !!(
    form.dataEnvio &&
    form.dataAprovacao &&
    form.dataAprovacao < form.dataEnvio
  );

  const planejamentosOptions = useMemo(
    () => planejamentosComSelecao.map((item) => String(item.id)),
    [planejamentosComSelecao],
  );

  const planejamentoLabel = (id: string) =>
    planejamentosComSelecao.find((item) => String(item.id) === String(id))
      ?.nome ?? `Planejamento ${id}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const propostaEditalId = String(form.propostaEdital || "").trim();

    if (!propostaEditalId) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (form.planejamentosFinanceiros.length === 0) {
      toast.error("Selecione ao menos um planejamento financeiro.");
      return;
    }

    if (!form.statusPrestacaoContas) {
      toast.error("Selecione o status da prestação.");
      return;
    }

    if (periodoInvertido) {
      toast.error(
        "A data final do período não pode ser anterior à data inicial.",
      );
      return;
    }

    if (envioAntesPeriodo) {
      toast.error("A data de envio não pode ser anterior ao início do período.");
      return;
    }

    if (aprovacaoAntesEnvio) {
      toast.error("A data de aprovação não pode ser anterior à data de envio.");
      return;
    }

    try {
      setSaving(true);

      const prestacaoPayload: PrestacaoContas = {
        ...createEmptyPrestacaoContas(),
        id: id ?? "",
        propostaEdital: propostaEditalId,
        planejamentosFinanceiros: form.planejamentosFinanceiros
          .filter(Boolean)
          .map(String),
        periodoInicio: form.periodoInicio,
        periodoFim: form.periodoFim,
        dataEnvio: form.dataEnvio,
        dataAprovacao: form.dataAprovacao,
        statusPrestacaoContas: form.statusPrestacaoContas,
        parecerInterno: form.parecerInterno,
        parecerExterno: form.parecerExterno,
        observacoesGerais: form.observacoesGerais,
      };

      const payload = buildPrestacaoPayload(prestacaoPayload);

      if (editando && id) {
        await updatePrestacaoContas(Number(id), payload);
        toast.success("Prestação de contas atualizada com sucesso.");
      } else {
        await createPrestacaoContas(payload);
        salvarProximaAcaoPrestacaoContas();
        toast.success("Prestação de contas cadastrada com sucesso.");
      }

      navigate("/prestacao-contas", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar prestação de contas.",
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
          onClick={() => navigate("/prestacao-contas")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Prestação de Contas
            </h1>

            <HelpTooltip
              text="Organize o acompanhamento da prestação de contas do projeto, registrando período, datas de envio e aprovação, pareceres, observações e vínculos com proposta e planejamento financeiro. Esta página ajuda a controlar a situação da prestação e manter o histórico do processo atualizado."
              label="Prestação de contas"
              size="md"
              side="bottom"
              align="start"
            />
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Use esta página para{" "}
            <span className="font-semibold">acompanhar</span> o processo de
            prestação de contas do projeto. Registre períodos, datas
            importantes, pareceres, observações e mantenha o status atualizado
            para facilitar conferências, comprovações e histórico do processo.
          </p>
        </div>

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Você está visualizando estas informações. Para fazer alterações,
            clique em <span className="font-semibold">Editar</span> no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Link2} title="Vínculos da prestação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  required
                  tooltip="Selecione a proposta de edital relacionada a esta prestação de contas. Esse vínculo conecta a prestação ao projeto inscrito, edital, agente responsável, equipe, metas e demais registros da candidatura."
                >
                  Proposta de Edital
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="propostaEdital"
                    value={propostaSelecionadaNome || "—"}
                    disabled
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                  />
                ) : (
                  <Select
                    key={`proposta-${form.propostaEdital}-${propostasComSelecao.length}`}
                    value={String(form.propostaEdital || "")}
                    onValueChange={(value) =>
                      set("propostaEdital", String(value))
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {propostasComSelecao.length === 0 ? (
                        <SelectItem value="sem-proposta" disabled>
                          Nenhuma proposta cadastrada
                        </SelectItem>
                      ) : (
                        propostasComSelecao.map((item) => (
                          <SelectItem
                            key={String(item.id)}
                            value={String(item.id)}
                          >
                            {item.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="planejamentosFinanceiros"
                  required
                  tooltip="Selecione um ou mais itens de planejamento financeiro relacionados a esta prestação de contas. Esse vínculo ajuda a comparar valores previstos, movimentações realizadas, comprovantes e aplicação dos recursos."
                >
                  Planejamentos Financeiros
                </FieldLabel>

                <div
                  className={
                    visualizando ? "pointer-events-none opacity-80" : ""
                  }
                >
                  <MultiSelect
                    id="planejamentosFinanceiros"
                    options={planejamentosOptions}
                    value={form.planejamentosFinanceiros}
                    onChange={(value) => {
                      if (visualizando) return;

                      set(
                        "planejamentosFinanceiros",
                        value.filter(Boolean).map(String),
                      );
                    }}
                    getOptionLabel={planejamentoLabel}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={CalendarRange} title="Período e datas importantes">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="periodoInicio"
                    tooltip="Informe a data inicial do período que será considerado nesta prestação de contas. Pode corresponder ao início da execução, do uso dos recursos ou do período exigido pelo edital."
                  >
                    Período Inicial
                  </FieldLabel>

                  <Input
                    id="periodoInicio"
                    type="date"
                    value={form.periodoInicio}
                    onChange={(e) => set("periodoInicio", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="periodoFim"
                    tooltip="Informe a data final do período considerado nesta prestação de contas. Essa data ajuda a delimitar quais ações, despesas e evidências fazem parte do processo."
                  >
                    Período Final
                  </FieldLabel>

                  <Input
                    id="periodoFim"
                    type="date"
                    value={form.periodoFim}
                    onChange={(e) => set("periodoFim", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    className={
                      periodoInvertido
                        ? "border-amber-500/40 focus-visible:ring-amber-500/30"
                        : ""
                    }
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="dataEnvio"
                    tooltip="Informe a data em que a prestação de contas foi enviada, protocolada ou submetida ao órgão responsável."
                  >
                    Data de Envio
                  </FieldLabel>

                  <Input
                    id="dataEnvio"
                    type="date"
                    value={form.dataEnvio}
                    onChange={(e) => set("dataEnvio", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    className={
                      envioAntesPeriodo
                        ? "border-amber-500/40 focus-visible:ring-amber-500/30"
                        : ""
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataAprovacao"
                    tooltip="Informe a data em que a prestação de contas foi aprovada, quando houver confirmação formal."
                  >
                    Data de Aprovação
                  </FieldLabel>

                  <Input
                    id="dataAprovacao"
                    type="date"
                    value={form.dataAprovacao}
                    onChange={(e) => set("dataAprovacao", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                    className={
                      aprovacaoAntesEnvio
                        ? "border-amber-500/40 focus-visible:ring-amber-500/30"
                        : ""
                    }
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={ClipboardCheck} title="Status e acompanhamento">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="statusPrestacaoContas"
                  required
                  tooltip="Indique a situação atual da prestação de contas, como não iniciada, em elaboração, aguardando documentos, pronta para envio, enviada, em análise, aprovada, aprovada com ressalvas ou reprovada."
                >
                  Status da Prestação
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="statusPrestacaoContas"
                    value={statusSelecionadoNome || "—"}
                    disabled
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                  />
                ) : (
                  <Select
                    key={`status-${form.statusPrestacaoContas}`}
                    value={String(form.statusPrestacaoContas || "")}
                    onValueChange={(value) =>
                      set(
                        "statusPrestacaoContas",
                        value as StatusPrestacaoContas,
                      )
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="statusPrestacaoContas">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {statusPrestacaoContasOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
          </Section>

          <Section icon={MessageSquareText} title="Pareceres e observações">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="parecerInterno"
                  tooltip="Registre a análise interna da organização sobre a prestação de contas, como conferências realizadas, pendências identificadas, justificativas, riscos, ajustes necessários ou avaliação da equipe."
                >
                  Parecer Interno
                </FieldLabel>

                <Textarea
                  id="parecerInterno"
                  value={form.parecerInterno}
                  onChange={(e) => set("parecerInterno", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="parecerExterno"
                  tooltip="Registre o parecer, retorno, diligência, aprovação, ressalva ou observação enviada pelo órgão responsável, patrocinador ou instituição avaliadora."
                >
                  Parecer Externo
                </FieldLabel>

                <Textarea
                  id="parecerExterno"
                  value={form.parecerExterno}
                  onChange={(e) => set("parecerExterno", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="observacoesGerais"
                  tooltip="Registre informações complementares sobre o processo, como contatos, documentos pendentes, justificativas, decisões internas ou próximos passos."
                >
                  Observações Gerais
                </FieldLabel>

                <Textarea
                  id="observacoesGerais"
                  value={form.observacoesGerais}
                  onChange={(e) => set("observacoesGerais", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/prestacao-contas")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-40"
                disabled={saving}
              >
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
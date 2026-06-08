import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarRange,
  ClipboardList,
  Link2,
  Share2,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  buildPlanoComunicacaoPayload,
  createEmptyPlanoComunicacao,
  createPlanoComunicacao,
  formatosComunicacaoOptions,
  getPlanoComunicacaoById,
  getPropostasEditalOptions,
  statusPlanoComunicacaoOptions,
  updatePlanoComunicacao,
  estrategiasDivulgacao,
  estrategiaLabel,
  type PlanoComunicacao,
  type PropostaEditalOption,
  type StatusPlanoComunicacao,
} from "@/data/planoComunicacao";

const PLANO_COMUNICACAO_NEXT_STEP_KEY =
  "aurit:plano-comunicacao:next-step-card";

interface PlanoComunicacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPlanoComunicacao() {
  const card: PlanoComunicacaoNextStepCardData = {
    titulo:
      "Após cadastrar o plano de comunicação, organize as ações de divulgação",
    descricao:
      "As ações de divulgação ajudam a detalhar como o projeto será comunicado ao público, quais canais serão utilizados, quais resultados são esperados e quais registros poderão compor a prestação de contas.",
    acaoLabel: "Cadastrar ação de divulgação",
    acaoUrl: "/acoes-divulgacao/novo",
    acaoSecundariaLabel: "Ver planos de comunicação",
    acaoSecundariaUrl: "/plano-comunicacao",
    variante: "pendente",
  };

  sessionStorage.setItem(
    PLANO_COMUNICACAO_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaId: string,
  plano?: PlanoComunicacao | null,
) {
  return (
    propostas.find((proposta) => normalizeId(proposta.id) === propostaId)
      ?.nome ||
    plano?.nomePropostaEdital?.trim?.() ||
    `Proposta vinculada #${propostaId}`
  );
}

export default function PlanoComunicacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<PlanoComunicacao>(() =>
    createEmptyPlanoComunicacao(),
  );
  const [existingPlano, setExistingPlano] =
    useState<PlanoComunicacao | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);

  const bloqueado = visualizando || loading || saving;

  const propostaSelectValue =
    normalizeId(form.propostaEdital) ||
    normalizeId(existingPlano?.propostaEdital);

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);

        const [propostasData, registroData] = await Promise.all([
          getPropostasEditalOptions(),
          id ? getPlanoComunicacaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);

        if (registroData) {
          const registroNormalizado: PlanoComunicacao = {
            ...registroData,
            propostaEdital: normalizeId(registroData.propostaEdital),
            estrategiasDivulgacao: registroData.estrategiasDivulgacao ?? [],
          };

          setExistingPlano(registroNormalizado);
          setForm(registroNormalizado);
        } else {
          setExistingPlano(null);
          setForm(createEmptyPlanoComunicacao());
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar registro.",
        );
        navigate("/plano-comunicacao");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarDados();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof PlanoComunicacao>(
    key: K,
    value: PlanoComunicacao[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const propostasComFallback = useMemo(() => {
    const options = [...propostas];
    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => normalizeId(proposta.id) === propostaId)
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId, existingPlano),
      });
    }

    return options;
  }, [propostas, propostaSelectValue, existingPlano]);

  const estrategiasSelecionadasLabels = form.estrategiasDivulgacao.map(
    (value) => estrategiaLabel(value),
  );

  const estrategiaOptions = estrategiasDivulgacao.map((item) => item.label);

  function handleEstrategiasChange(labels: string[]) {
    const values = labels
      .map(
        (label) =>
          estrategiasDivulgacao.find((item) => item.label === label)?.value ??
          label,
      )
      .filter(Boolean);

    set(
      "estrategiasDivulgacao",
      values as PlanoComunicacao["estrategiasDivulgacao"],
    );
  }

  function getFormComVinculos(): PlanoComunicacao {
    return {
      ...form,
      propostaEdital: propostaSelectValue,
    };
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

    if (!formComVinculos.nomePlano.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }

    if (!formComVinculos.quantidade.trim()) {
      toast.error("Informe a quantidade.");
      return;
    }

    if (!formComVinculos.formatoPlanoComunicacao.trim()) {
      toast.error("Selecione o formato da comunicação.");
      return;
    }

    if (!formComVinculos.localCirculacaoComunicacao.trim()) {
      toast.error("Informe o local de circulação.");
      return;
    }

    if (formComVinculos.estrategiasDivulgacao.length === 0) {
      toast.error("Selecione ao menos uma estratégia de divulgação.");
      return;
    }

    if (!formComVinculos.dataInicio) {
      toast.error("Informe a data de início.");
      return;
    }

    if (!formComVinculos.dataFim) {
      toast.error("Informe a data de fim.");
      return;
    }

    if (formComVinculos.dataFim < formComVinculos.dataInicio) {
      toast.error("A data de fim não pode ser anterior à data de início.");
      return;
    }

    if (!formComVinculos.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!formComVinculos.status) {
      toast.error("Selecione o status do plano.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPlanoComunicacaoPayload(formComVinculos);

      if (editando && id) {
        await updatePlanoComunicacao(Number(id), payload);
        toast.success("Plano de comunicação atualizado com sucesso.");
      } else {
        await createPlanoComunicacao(payload);
        salvarProximaAcaoPlanoComunicacao();
        toast.success("Plano de comunicação cadastrado com sucesso.");
      }

      navigate("/plano-comunicacao");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar plano de comunicação.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/plano-comunicacao")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Plano de Comunicação"
          tooltip="Registre o plano de comunicação vinculado à proposta de edital, informando formato, quantidade, estratégias de divulgação, período, local de circulação e situação atual."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div
          className="mb-5 flex items-start gap-3 rounded-lg border px-4 py-3.5"
          style={{
            backgroundColor: "hsl(40 90% 96%)",
            borderColor: "hsl(38 80% 70%)",
          }}
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            strokeWidth={2.2}
            style={{ color: "hsl(28 80% 42%)" }}
          />

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Use esta página para detalhar o plano de comunicação da proposta:
            quais materiais serão produzidos, em que quantidade, por quais
            estratégias, onde circularão e em qual período.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={ClipboardList} title="Item, formato e quantidade">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="nomePlano"
                  required={!visualizando}
                  tooltip="Informe um nome para identificar este plano de comunicação. Ex.: Divulgação das oficinas, Campanha de lançamento, Comunicação do evento de encerramento."
                >
                  Nome do Plano
                </FieldLabel>

                <Input
                  id="nomePlano"
                  value={form.nomePlano}
                  onChange={(e) => set("nomePlano", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="formatoPlanoComunicacao"
                  required={!visualizando}
                  tooltip="Selecione o formato principal da comunicação. Ex.: material gráfico, redes sociais, vídeo, rádio, site institucional, WhatsApp ou imprensa local."
                >
                  Formato da Comunicação
                </FieldLabel>

                <Select
                  value={form.formatoPlanoComunicacao}
                  onValueChange={(value) =>
                    set("formatoPlanoComunicacao", value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="formatoPlanoComunicacao">
                    <SelectValue placeholder="Selecione um formato" />
                  </SelectTrigger>

                  <SelectContent>
                    {formatosComunicacaoOptions.map((formato) => (
                      <SelectItem key={formato} value={formato}>
                        {formato}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="quantidade"
                  required={!visualizando}
                  tooltip="Informe a quantidade prevista ou realizada para este formato de comunicação. Ex.: 10 cartazes, 5 publicações, 2 vídeos, 100 panfletos ou 3 chamadas de rádio."
                >
                  Quantidade
                </FieldLabel>

                <Input
                  id="quantidade"
                  value={form.quantidade}
                  onChange={(e) => set("quantidade", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={CalendarRange} title="Período e circulação">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataInicio"
                  required={!visualizando}
                  tooltip="Informe a data prevista ou efetiva de início da execução deste plano de comunicação."
                >
                  Data de Início
                </FieldLabel>

                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => set("dataInicio", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataFim"
                  required={!visualizando}
                  tooltip="Informe a data prevista ou efetiva de encerramento deste plano de comunicação."
                >
                  Data de Fim
                </FieldLabel>

                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => set("dataFim", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="localCirculacaoComunicacao"
                  required={!visualizando}
                  tooltip="Informe onde esta comunicação será divulgada ou distribuída. Pode ser canal digital, espaço físico, território, instituição, mídia ou local de circulação do público."
                >
                  Local de Circulação
                </FieldLabel>

                <Input
                  id="localCirculacaoComunicacao"
                  value={form.localCirculacaoComunicacao}
                  onChange={(e) =>
                    set("localCirculacaoComunicacao", e.target.value)
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Share2} title="Estratégia de divulgação">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="estrategiasDivulgacao"
                  required={!visualizando}
                  tooltip="Selecione um ou mais meios utilizados para divulgação da comunicação. Ex.: redes sociais, cartazes, mídia local, rádio, parcerias, site ou mobilização comunitária."
                >
                  Estratégias de Divulgação
                </FieldLabel>

                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
                >
                  <MultiSelect
                    id="estrategiasDivulgacao"
                    options={estrategiaOptions}
                    value={estrategiasSelecionadasLabels}
                    onChange={handleEstrategiasChange}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={Link2} title="Vínculo e status">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  required={!visualizando}
                  tooltip="Selecione a proposta de edital à qual este plano de comunicação está vinculado."
                >
                  Proposta de Edital
                </FieldLabel>

                <Select
                  value={propostaSelectValue}
                  onValueChange={(value) =>
                    set("propostaEdital", normalizeId(value))
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="propostaEdital">
                    <SelectValue placeholder="Selecione a proposta vinculada" />
                  </SelectTrigger>

                  <SelectContent>
                    {propostasComFallback.length === 0 ? (
                      <SelectItem value="sem-proposta" disabled>
                        Nenhuma proposta de edital cadastrada
                      </SelectItem>
                    ) : (
                      propostasComFallback.map((proposta) => (
                        <SelectItem
                          key={normalizeId(proposta.id)}
                          value={normalizeId(proposta.id)}
                        >
                          {proposta.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="status"
                  required={!visualizando}
                  tooltip="Indique a situação atual deste plano. Use Ativo para registros em execução, Pendente para registros não iniciados ou em conferência, Concluído para finalizados e Inativo para registros que não devem mais ser considerados ativos."
                >
                  Status do Plano
                </FieldLabel>

                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    set("status", value as StatusPlanoComunicacao)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusPlanoComunicacaoOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/plano-comunicacao")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-40" disabled={saving}>
                {saving ? "Salvando..." : "Salvar plano"}
              </Button>
            )}

            {visualizando && id && (
              <Button
                type="button"
                onClick={() => navigate(`/plano-comunicacao/${id}/editar`)}
              >
                Editar
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
  icon: LucideIcon;
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
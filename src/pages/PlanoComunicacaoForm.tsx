import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  ClipboardList,
  CalendarRange,
  Link2,
  CircleDot,
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
import { toast } from "sonner";
import {
  buildPlanoComunicacaoPayload,
  createEmptyPlanoComunicacao,
  createPlanoComunicacao,
  formatosComunicacaoOptions,
  getAcoesDivulgacaoOptions,
  getOrganizacoesOptions,
  getPlanoComunicacaoById,
  statusPlanoComunicacaoOptions,
  updatePlanoComunicacao,
  type AcaoDivulgacaoOption,
  type OrganizacaoOption,
  type PlanoComunicacao,
  type StatusPlanoComunicacao,
} from "@/data/planoComunicacao";

const EXECUCAO_DIVULGACAO_NEXT_STEP_KEY =
  "aurit:plano-comunicacao:next-step-card";

interface ExecucaoDivulgacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoExecucaoDivulgacao() {
  const card: ExecucaoDivulgacaoNextStepCardData = {
    titulo:
      "Após detalhar a execução da divulgação, registre as movimentações financeiras",
    descricao:
      "O financeiro ajuda a acompanhar entradas e saídas vinculadas aos projetos e ações, organizar comprovantes, manter transparência e preparar relatórios e prestações de contas.",
    acaoLabel: "Cadastrar financeiro",
    acaoUrl: "/financeiro/novo",
    acaoSecundariaLabel: "Ver execução da divulgação",
    acaoSecundariaUrl: "/plano-comunicacao",
    variante: "pendente",
  };

  sessionStorage.setItem(
    EXECUCAO_DIVULGACAO_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function getAcaoNome(
  acoes: AcaoDivulgacaoOption[],
  acaoId: string,
  plano?: PlanoComunicacao | null,
) {
  return (
    acoes.find((acao) => normalizeId(acao.id) === acaoId)?.nome ||
    (plano as any)?.nomeAcaoDivulgacao?.trim?.() ||
    (plano as any)?.acaoDivulgacaoNome?.trim?.() ||
    `Ação vinculada #${acaoId}`
  );
}

function getOrganizacaoNome(
  organizacoes: OrganizacaoOption[],
  organizacaoId: string,
  plano?: PlanoComunicacao | null,
) {
  return (
    organizacoes.find((organizacao) => normalizeId(organizacao.id) === organizacaoId)
      ?.nome ||
    (plano as any)?.nomeOrganizacao?.trim?.() ||
    (plano as any)?.organizacaoNome?.trim?.() ||
    `Organização vinculada #${organizacaoId}`
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
  const [acoes, setAcoes] = useState<AcaoDivulgacaoOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);

  const bloqueado = visualizando || loading || saving;

  const acaoSelectValue =
    normalizeId(form.acaoDivulgacao) ||
    normalizeId(existingPlano?.acaoDivulgacao);

  const organizacaoSelectValue =
    normalizeId(form.organizacao) || normalizeId(existingPlano?.organizacao);

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);

        const [acoesData, organizacoesData, registroData] = await Promise.all([
          getAcoesDivulgacaoOptions(),
          getOrganizacoesOptions(),
          id ? getPlanoComunicacaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setAcoes(acoesData);
        setOrganizacoes(organizacoesData);

        if (registroData) {
          const registroNormalizado: PlanoComunicacao = {
            ...registroData,
            acaoDivulgacao: normalizeId(registroData.acaoDivulgacao),
            organizacao: normalizeId(registroData.organizacao),
          };

          setExistingPlano(registroNormalizado);
          setForm(registroNormalizado);
        } else {
          setExistingPlano(null);
          setForm({
            ...createEmptyPlanoComunicacao(),
            organizacao:
              organizacoesData.length === 1
                ? normalizeId(organizacoesData[0].id)
                : "",
          });
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

  const acoesComFallback = useMemo(() => {
    const options = [...acoes];
    const acaoId = acaoSelectValue;

    if (
      acaoId &&
      !options.some((acao) => normalizeId(acao.id) === acaoId)
    ) {
      options.unshift({
        id: acaoId,
        nome: getAcaoNome(acoes, acaoId, existingPlano),
      });
    }

    return options;
  }, [acoes, acaoSelectValue, existingPlano]);

  const organizacoesComFallback = useMemo(() => {
    const options = [...organizacoes];
    const organizacaoId = organizacaoSelectValue;

    if (
      organizacaoId &&
      !options.some(
        (organizacao) => normalizeId(organizacao.id) === organizacaoId,
      )
    ) {
      options.unshift({
        id: organizacaoId,
        nome: getOrganizacaoNome(organizacoes, organizacaoId, existingPlano),
      });
    }

    return options;
  }, [organizacoes, organizacaoSelectValue, existingPlano]);

  function getFormComVinculos(): PlanoComunicacao {
    return {
      ...form,
      acaoDivulgacao: acaoSelectValue,
      organizacao: organizacaoSelectValue,
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComVinculos = getFormComVinculos();

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

    if (!formComVinculos.acaoDivulgacao) {
      toast.error("Selecione a ação de divulgação vinculada.");
      return;
    }

    if (!formComVinculos.status) {
      toast.error("Selecione o status do registro.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPlanoComunicacaoPayload(formComVinculos);

      if (editando && id) {
        await updatePlanoComunicacao(Number(id), payload);
        toast.success("Execução da Divulgação atualizada com sucesso.");
      } else {
        await createPlanoComunicacao(payload);
        salvarProximaAcaoExecucaoDivulgacao();
        toast.success("Execução da Divulgação cadastrada com sucesso.");
      }

      navigate("/plano-comunicacao");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar Execução da Divulgação.",
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
          title="Execução da Divulgação"
          tooltip="Registre como a ação de divulgação será executada na prática, informando formato, quantidade, período, local de circulação, ação vinculada, organização responsável e situação atual do registro."
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
            Use esta página para detalhar como uma ação de divulgação será
            executada na prática: quais materiais serão produzidos, em que
            quantidade, onde circularão, em qual período e qual será a situação
            da execução.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={ClipboardList} title="Informações da execução">
            <div className="grid gap-4 sm:grid-cols-2">
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

              <Field full>
                <FieldLabel
                  htmlFor="localCirculacaoComunicacao"
                  required={!visualizando}
                  tooltip="Informe onde esta comunicação será divulgada ou distribuída. Pode ser um canal digital, espaço físico, território, instituição, mídia ou local de circulação do público. Ex.: Instagram da organização, grupos de WhatsApp da comunidade, escolas parceiras, rádio local, praça central, comércio do bairro ou site institucional."
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

          <Section icon={CalendarRange} title="Período">
            <div className="mb-4 rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              Informe o período em que esta ação de comunicação será
              executada. Esse dado ajuda a relacionar a divulgação ao
              cronograma do projeto e às evidências geradas.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataInicio"
                  required={!visualizando}
                  tooltip="Informe a data prevista ou efetiva de início da execução desta ação de comunicação."
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
                  tooltip="Informe a data prevista ou efetiva de encerramento desta ação de comunicação."
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
            </div>
          </Section>

          <Section icon={Link2} title="Vínculos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="acaoDivulgacao"
                  required={!visualizando}
                  tooltip="Selecione a ação de divulgação à qual esta Execução da Divulgação está vinculada. Esse vínculo conecta a execução prática ao planejamento da divulgação."
                >
                  Ação de Divulgação
                </FieldLabel>

                <Select
                  value={acaoSelectValue}
                  onValueChange={(value) =>
                    set("acaoDivulgacao", normalizeId(value))
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="acaoDivulgacao">
                    <SelectValue placeholder="Selecione a ação vinculada" />
                  </SelectTrigger>

                  <SelectContent>
                    {acoesComFallback.length === 0 ? (
                      <SelectItem value="sem-acao" disabled>
                        Nenhuma ação de divulgação cadastrada
                      </SelectItem>
                    ) : (
                      acoesComFallback.map((acao) => (
                        <SelectItem
                          key={normalizeId(acao.id)}
                          value={normalizeId(acao.id)}
                        >
                          {acao.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="organizacao"
                  tooltip="Selecione a organização responsável por esta execução de comunicação, quando aplicável. Quando não informado, o backend deve vincular pelo tenant da empresa logada."
                >
                  Organização
                </FieldLabel>

                <Select
                  value={organizacaoSelectValue}
                  onValueChange={(value) =>
                    set("organizacao", normalizeId(value))
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="organizacao">
                    <SelectValue placeholder="Vinculada pela empresa logada" />
                  </SelectTrigger>

                  <SelectContent>
                    {organizacoesComFallback.length === 0 ? (
                      <SelectItem value="sem-organizacao" disabled>
                        Nenhuma organização cadastrada
                      </SelectItem>
                    ) : (
                      organizacoesComFallback.map((organizacao) => (
                        <SelectItem
                          key={normalizeId(organizacao.id)}
                          value={normalizeId(organizacao.id)}
                        >
                          {organizacao.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={CircleDot} title="Status">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="status"
                  required={!visualizando}
                  tooltip="Indique a situação atual deste registro de comunicação. Use “Ativo” para ações em execução ou acompanhamento, “Pendente” para ações não iniciadas ou em conferência, “Concluído” para ações finalizadas conforme previsto e “Inativo” para registros que não devem mais ser considerados ativos."
                >
                  Status do Registro
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
                {saving ? "Salvando..." : "Salvar registro"}
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
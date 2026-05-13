import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileSignature,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
import {
  buildHabilitacaoPayload,
  createHabilitacao,
  getAgentesOptions,
  getHabilitacaoById,
  getHabilitacoes,
  getPropostasEditalOptions,
  statusHabilitacaoOptions,
  updateHabilitacao,
  type AgenteOption,
  type Habilitacao,
  type PropostaOption,
  type StatusHabilitacao,
} from "@/data/habilitacao";
import { toast } from "sonner";

const HABILITACAO_NEXT_STEP_KEY =
  "aurit:habilitacoes-propostas:next-step-card";

interface HabilitacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoHabilitacao() {
  const card: HabilitacaoNextStepCardData = {
    titulo:
      "Após acompanhar a habilitação documental, organize a equipe da proposta",
    descricao:
      "A equipe da proposta ajuda a demonstrar quem participará da execução, qual função cada pessoa exercerá, sua carga horária, valor previsto, justificativa e mini biografia.",
    acaoLabel: "Cadastrar equipe",
    acaoUrl: "/equipe-edital/novo",
    acaoSecundariaLabel: "Ver Habilitação Documental",
    acaoSecundariaUrl: "/habilitacoes-propostas",
    variante: "pendente",
  };

  sessionStorage.setItem(HABILITACAO_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  propostaEdital: string;
  agente: string;

  dataInicioHabilitacao: string;
  dataLimiteHabilitacao: string;
  dataEnvioDocumentacao: string;
  dataRetornoAnalise: string;
  dataRegularizacao: string;
  dataConclusaoHabilitacao: string;

  statusHabilitacao: StatusHabilitacao | "";

  exigenciaOuPendencia: string;
  providenciaTomada: string;
  motivoInabilitacao: string;
  observacoes: string;
}

const initial: FormState = {
  propostaEdital: "",
  agente: "",

  dataInicioHabilitacao: "",
  dataLimiteHabilitacao: "",
  dataEnvioDocumentacao: "",
  dataRetornoAnalise: "",
  dataRegularizacao: "",
  dataConclusaoHabilitacao: "",

  statusHabilitacao: "",

  exigenciaOuPendencia: "",
  providenciaTomada: "",
  motivoInabilitacao: "",
  observacoes: "",
};

export default function HabilitacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [propostas, setPropostas] = useState<PropostaOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [habilitacoes, setHabilitacoes] = useState<Habilitacao[]>([]);

  const bloqueado = visualizando || loading || saving;

  useEffect(() => {
    let active = true;

    async function carregarTela() {
      try {
        setLoading(true);

        const [propostasData, agentesData, habilitacoesData, registro] =
          await Promise.all([
            getPropostasEditalOptions(),
            getAgentesOptions(),
            getHabilitacoes(),
            id ? getHabilitacaoById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setPropostas(propostasData);
        setAgentes(agentesData);
        setHabilitacoes(habilitacoesData);

        if (registro) {
          setForm({
            propostaEdital: registro.propostaEdital,
            agente: registro.agente,

            dataInicioHabilitacao: registro.dataInicioHabilitacao ?? "",
            dataLimiteHabilitacao: registro.dataLimiteHabilitacao ?? "",
            dataEnvioDocumentacao: registro.dataEnvioDocumentacao ?? "",
            dataRetornoAnalise: registro.dataRetornoAnalise ?? "",
            dataRegularizacao: registro.dataRegularizacao ?? "",
            dataConclusaoHabilitacao: registro.dataConclusaoHabilitacao ?? "",

            statusHabilitacao: registro.statusHabilitacao,

            exigenciaOuPendencia: registro.exigenciaOuPendencia ?? "",
            providenciaTomada: registro.providenciaTomada ?? "",
            motivoInabilitacao: registro.motivoInabilitacao ?? "",
            observacoes: registro.observacoes ?? "",
          });
        } else {
          setForm(initial);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar Habilitação Documental.";

        toast.error(message);

        if (id) {
          navigate("/habilitacoes-propostas");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarTela();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const propostasDisponiveis = useMemo(() => {
    const ocupadas = new Set(
      habilitacoes
        .filter((habilitacao) => (isEdit ? habilitacao.id !== id : true))
        .map((habilitacao) => habilitacao.propostaEdital),
    );

    return propostas.filter(
      (proposta) =>
        !ocupadas.has(proposta.id) || proposta.id === form.propostaEdital,
    );
  }, [habilitacoes, propostas, isEdit, id, form.propostaEdital]);

  const propostaSelecionadaExiste = useMemo(
    () => propostasDisponiveis.some((p) => p.id === form.propostaEdital),
    [propostasDisponiveis, form.propostaEdital],
  );

  const agenteSelecionadoExiste = useMemo(
    () => agentes.some((a) => a.id === form.agente),
    [agentes, form.agente],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const limiteAntesInicio =
    !!form.dataInicioHabilitacao &&
    !!form.dataLimiteHabilitacao &&
    form.dataLimiteHabilitacao < form.dataInicioHabilitacao;

  const envioAntesInicio =
    !!form.dataInicioHabilitacao &&
    !!form.dataEnvioDocumentacao &&
    form.dataEnvioDocumentacao < form.dataInicioHabilitacao;

  const envioAposLimite =
    !!form.dataLimiteHabilitacao &&
    !!form.dataEnvioDocumentacao &&
    form.dataEnvioDocumentacao > form.dataLimiteHabilitacao;

  const retornoAntesEnvio =
    !!form.dataEnvioDocumentacao &&
    !!form.dataRetornoAnalise &&
    form.dataRetornoAnalise < form.dataEnvioDocumentacao;

  const regularizacaoAntesRetorno =
    !!form.dataRetornoAnalise &&
    !!form.dataRegularizacao &&
    form.dataRegularizacao < form.dataRetornoAnalise;

  const conclusaoAntesInicio =
    !!form.dataInicioHabilitacao &&
    !!form.dataConclusaoHabilitacao &&
    form.dataConclusaoHabilitacao < form.dataInicioHabilitacao;

  const exigePendencia =
    form.statusHabilitacao === "DOCUMENTACAO_PENDENTE" ||
    form.statusHabilitacao === "EM_REGULARIZACAO";

  const exigeProvidencia =
    form.statusHabilitacao === "REGULARIZADO" ||
    form.statusHabilitacao === "RECURSO_ENVIADO";

  const exigeMotivoInabilitacao =
    form.statusHabilitacao === "INABILITADO" ||
    form.statusHabilitacao === "INABILITADA_DEFINITIVO";

  const exigeDataConclusao =
    form.statusHabilitacao === "HABILITADO" ||
    form.statusHabilitacao === "INABILITADO" ||
    form.statusHabilitacao === "HABILITADA_APOS_RECURSO" ||
    form.statusHabilitacao === "INABILITADA_DEFINITIVO" ||
    form.statusHabilitacao === "FINALIZADO" ||
    form.statusHabilitacao === "CANCELADO";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    if (!form.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!form.agente) {
      toast.error("Selecione o agente responsável.");
      return;
    }

    if (!form.statusHabilitacao) {
      toast.error("Selecione o status da Habilitação Documental.");
      return;
    }

    if (
      form.statusHabilitacao === "DOCUMENTACAO_ENVIADA" &&
      !form.dataEnvioDocumentacao
    ) {
      toast.error("Informe a data de envio da documentação.");
      return;
    }

    if (exigePendencia && !form.exigenciaOuPendencia.trim()) {
      toast.error("Informe a exigência ou pendência da habilitação.");
      return;
    }

    if (exigeProvidencia && !form.providenciaTomada.trim()) {
      toast.error("Informe a providência tomada ou o recurso enviado.");
      return;
    }

    if (exigeMotivoInabilitacao && !form.motivoInabilitacao.trim()) {
      toast.error("Informe o motivo da inabilitação.");
      return;
    }

    if (exigeDataConclusao && !form.dataConclusaoHabilitacao) {
      toast.error("Informe a data de conclusão da habilitação.");
      return;
    }

    if (limiteAntesInicio) {
      toast.error("O prazo final não pode ser anterior à data de início.");
      return;
    }

    if (envioAntesInicio) {
      toast.error("A data de envio não pode ser anterior à data de início.");
      return;
    }

    if (retornoAntesEnvio) {
      toast.error(
        "A data de retorno da análise não pode ser anterior à data de envio.",
      );
      return;
    }

    if (regularizacaoAntesRetorno) {
      toast.error(
        "A data de regularização não pode ser anterior à data de retorno da análise.",
      );
      return;
    }

    if (conclusaoAntesInicio) {
      toast.error("A data de conclusão não pode ser anterior à data de início.");
      return;
    }

    try {
      setSaving(true);

      const formData: Habilitacao = {
        id: id ?? "",

        propostaEdital: form.propostaEdital,
        nomePropostaEdital: "",

        agente: form.agente,
        nomeAgente: "",

        dataInicioHabilitacao: form.dataInicioHabilitacao,
        dataLimiteHabilitacao: form.dataLimiteHabilitacao,
        dataEnvioDocumentacao: form.dataEnvioDocumentacao,
        dataRetornoAnalise: form.dataRetornoAnalise,
        dataRegularizacao: form.dataRegularizacao,
        dataConclusaoHabilitacao: form.dataConclusaoHabilitacao,

        statusHabilitacao: form.statusHabilitacao as StatusHabilitacao,

        exigenciaOuPendencia: form.exigenciaOuPendencia,
        providenciaTomada: form.providenciaTomada,
        motivoInabilitacao: form.motivoInabilitacao,
        observacoes: form.observacoes,
      };

      const payload = buildHabilitacaoPayload(formData);

      if (editando && id) {
        await updateHabilitacao(Number(id), payload);
        toast.success("Habilitação Documental atualizada com sucesso.");
      } else {
        await createHabilitacao(payload);
        salvarProximaAcaoHabilitacao();
        toast.success("Habilitação Documental cadastrada com sucesso.");
      }

      navigate("/habilitacoes-propostas");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar Habilitação Documental.";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/habilitacoes-propostas")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Habilitação Documental"
          tooltip="Acompanhe a etapa documental da proposta no edital: convocação, prazo de envio, documentação enviada, análise, exigências, regularizações, recurso documental quando houver e resultado da habilitação."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />
          <p className="text-[13px] leading-relaxed text-foreground">
            Esta página acompanha a etapa de habilitação documental da proposta
            no edital. Use para registrar prazos, envio da documentação, retorno
            da análise, exigências, regularizações, recurso documental quando
            houver e resultado final. Os documentos institucionais devem
            continuar sendo mantidos na página{" "}
            <span className="font-semibold">Documentos</span>.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        {loading ? (
          <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando Habilitação Documental...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section icon={FileSignature} title="Proposta e responsável">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    required
                    tooltip="Selecione a proposta que está passando pela etapa de habilitação documental. Cada proposta deve possuir apenas um registro de habilitação."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  <Select
                    value={form.propostaEdital}
                    onValueChange={(value) => set("propostaEdital", value)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta" />
                    </SelectTrigger>

                    <SelectContent>
                      {!!form.propostaEdital && !propostaSelecionadaExiste && (
                        <SelectItem value={form.propostaEdital}>
                          Proposta vinculada #{form.propostaEdital}
                        </SelectItem>
                      )}

                      {propostasDisponiveis.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Nenhuma proposta disponível
                        </SelectItem>
                      ) : (
                        propostasDisponiveis.map((proposta) => (
                          <SelectItem key={proposta.id} value={proposta.id}>
                            {proposta.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Cada proposta possui apenas uma Habilitação Documental.
                  </p>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="agente"
                    required
                    tooltip="Selecione o agente cultural responsável pela inscrição, habilitação ou representação da proposta no edital."
                  >
                    Agente Responsável
                  </FieldLabel>

                  <Select
                    value={form.agente}
                    onValueChange={(value) => set("agente", value)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="agente">
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>

                    <SelectContent>
                      {!!form.agente && !agenteSelecionadoExiste && (
                        <SelectItem value={form.agente}>
                          Agente vinculado #{form.agente}
                        </SelectItem>
                      )}

                      {agentes.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Nenhum agente cadastrado
                        </SelectItem>
                      ) : (
                        agentes.map((agente) => (
                          <SelectItem key={agente.id} value={agente.id}>
                            {agente.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section icon={CalendarClock} title="Convocação, prazo e envio">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel
                    htmlFor="dataInicioHabilitacao"
                    tooltip="Informe a data de convocação para habilitação ou a data em que a organização iniciou a preparação da documentação."
                  >
                    Data de Convocação/Início
                  </FieldLabel>

                  <Input
                    id="dataInicioHabilitacao"
                    type="date"
                    value={form.dataInicioHabilitacao}
                    onChange={(e) =>
                      set("dataInicioHabilitacao", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataLimiteHabilitacao"
                    tooltip="Informe o prazo final definido pelo edital ou plataforma para envio, correção ou regularização da documentação de habilitação."
                  >
                    Prazo Final da Habilitação
                  </FieldLabel>

                  <Input
                    id="dataLimiteHabilitacao"
                    type="date"
                    value={form.dataLimiteHabilitacao}
                    onChange={(e) =>
                      set("dataLimiteHabilitacao", e.target.value)
                    }
                    className="border-primary/40 bg-primary/[0.03] focus-visible:ring-primary/40"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />

                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Prazo oficial — atenção redobrada.
                  </p>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataEnvioDocumentacao"
                    tooltip="Informe a data em que os documentos de habilitação foram enviados na plataforma, sistema externo ou canal oficial do edital."
                  >
                    Data de Envio da Documentação
                  </FieldLabel>

                  <Input
                    id="dataEnvioDocumentacao"
                    type="date"
                    value={form.dataEnvioDocumentacao}
                    onChange={(e) =>
                      set("dataEnvioDocumentacao", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>

              {(limiteAntesInicio || envioAntesInicio || envioAposLimite) && (
                <div className="mt-4 space-y-2">
                  {limiteAntesInicio && (
                    <Aviso tone="danger">
                      O prazo final da habilitação não pode ser anterior à data
                      de convocação/início.
                    </Aviso>
                  )}

                  {envioAntesInicio && (
                    <Aviso tone="danger">
                      A data de envio da documentação não pode ser anterior à
                      data de convocação/início.
                    </Aviso>
                  )}

                  {envioAposLimite && (
                    <Aviso tone="warning">
                      A data de envio está após o prazo final da habilitação.
                      Verifique se houve prorrogação, reabertura de prazo ou
                      envio em fase de regularização/recurso.
                    </Aviso>
                  )}
                </div>
              )}
            </Section>

            <Section icon={ClipboardList} title="Análise, pendência e recurso">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="statusHabilitacao"
                    required
                    tooltip="Indique a situação atual da habilitação documental. Use este campo para acompanhar preparação, envio, análise, pendência, regularização, recurso documental, habilitação ou inabilitação."
                  >
                    Status da Habilitação
                  </FieldLabel>

                  <Select
                    value={form.statusHabilitacao}
                    onValueChange={(value) =>
                      set("statusHabilitacao", value as StatusHabilitacao)
                    }
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="statusHabilitacao">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {statusHabilitacaoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataRetornoAnalise"
                    tooltip="Informe a data em que houve retorno da análise da habilitação, como exigência, pendência, aprovação documental, inabilitação ou solicitação de regularização."
                  >
                    Data de Retorno da Análise
                  </FieldLabel>

                  <Input
                    id="dataRetornoAnalise"
                    type="date"
                    value={form.dataRetornoAnalise}
                    onChange={(e) =>
                      set("dataRetornoAnalise", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="exigenciaOuPendencia"
                    required={exigePendencia}
                    tooltip="Registre a exigência ou pendência apontada na análise de habilitação, como documento vencido, documento ausente, divergência cadastral, assinatura pendente, conta bancária incorreta ou necessidade de reenvio."
                  >
                    Exigência ou Pendência
                  </FieldLabel>

                  <Textarea
                    id="exigenciaOuPendencia"
                    value={form.exigenciaOuPendencia}
                    onChange={(e) =>
                      set("exigenciaOuPendencia", e.target.value)
                    }
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="providenciaTomada"
                    required={exigeProvidencia}
                    tooltip="Descreva o que foi feito para resolver a exigência ou contestar a análise, como atualização de documento, reenvio na plataforma, correção de informação, contato com o órgão responsável ou envio de recurso documental."
                  >
                    Providência Tomada/Recurso Enviado
                  </FieldLabel>

                  <Textarea
                    id="providenciaTomada"
                    value={form.providenciaTomada}
                    onChange={(e) => set("providenciaTomada", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataRegularizacao"
                    tooltip="Informe a data em que a pendência foi regularizada, corrigida, reenviada ou a data em que o recurso documental foi protocolado."
                  >
                    Data de Regularização/Recurso
                  </FieldLabel>

                  <Input
                    id="dataRegularizacao"
                    type="date"
                    value={form.dataRegularizacao}
                    onChange={(e) => set("dataRegularizacao", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>

              {(retornoAntesEnvio || regularizacaoAntesRetorno) && (
                <div className="mt-4 space-y-2">
                  {retornoAntesEnvio && (
                    <Aviso tone="danger">
                      A data de retorno da análise não pode ser anterior à data
                      de envio da documentação.
                    </Aviso>
                  )}

                  {regularizacaoAntesRetorno && (
                    <Aviso tone="danger">
                      A data de regularização/recurso não pode ser anterior à
                      data de retorno da análise.
                    </Aviso>
                  )}
                </div>
              )}
            </Section>

            <Section icon={CheckCircle2} title="Resultado da habilitação">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataConclusaoHabilitacao"
                    required={exigeDataConclusao}
                    tooltip="Informe a data em que a habilitação documental foi concluída, seja por habilitação, inabilitação, habilitação após recurso, inabilitação definitiva, cancelamento ou encerramento do processo."
                  >
                    Data de Conclusão da Habilitação
                  </FieldLabel>

                  <Input
                    id="dataConclusaoHabilitacao"
                    type="date"
                    value={form.dataConclusaoHabilitacao}
                    onChange={(e) =>
                      set("dataConclusaoHabilitacao", e.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="motivoInabilitacao"
                    required={exigeMotivoInabilitacao}
                    tooltip="Preencha apenas se a proposta tiver sido inabilitada. Informe o motivo apresentado na análise documental ou no resultado definitivo após recurso."
                  >
                    Motivo da Inabilitação
                  </FieldLabel>

                  <Textarea
                    id="motivoInabilitacao"
                    value={form.motivoInabilitacao}
                    onChange={(e) => set("motivoInabilitacao", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="observacoes"
                    tooltip="Registre informações complementares sobre a habilitação documental, como protocolos, publicações oficiais, orientações recebidas, links externos, situação do termo de compromisso, dados bancários ou observações internas."
                  >
                    Observações Gerais
                  </FieldLabel>

                  <Textarea
                    id="observacoes"
                    value={form.observacoes}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={4}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>

              {conclusaoAntesInicio && (
                <div className="mt-4">
                  <Aviso tone="danger">
                    A data de conclusão não pode ser anterior à data de
                    convocação/início.
                  </Aviso>
                </div>
              )}
            </Section>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/habilitacoes-propostas")}
                disabled={saving}
              >
                {visualizando ? "Voltar" : "Cancelar"}
              </Button>

              {!visualizando && (
                <Button type="submit" className="sm:min-w-40" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </form>
        )}
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
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-2" : ""}>{children}</div>;
}

function Aviso({
  tone,
  children,
}: {
  tone: "warning" | "danger";
  children: React.ReactNode;
}) {
  const className =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400";

  return (
    <div
      className={`flex items-start gap-2 rounded border px-3 py-2 text-xs ${className}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />

      <span>{children}</span>
    </div>
  );
}
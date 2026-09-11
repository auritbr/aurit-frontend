import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CalendarClock,
  FileSignature,
  FolderCheck,
  Info,
  MessageSquare,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormMultiSelect } from "@/components/FormMultiSelect";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { useImportFormFill } from "@/hooks/useImportFormFill";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  buildHabilitacaoPayload,
  calcularStatusDocumentoHabilitacao,
  createHabilitacao,
  getAgentesOptions,
  getDocumentosDisponiveis,
  getHabilitacaoById,
  getHabilitacoes,
  getPropostasEditalOptions,
  statusHabilitacaoOptions,
  updateHabilitacao,
  type AgenteOption,
  type DocumentoOption,
  type Habilitacao,
  type PropostaOption,
  type StatusHabilitacao,
} from "@/data/habilitacao";

import { toast } from "sonner";
import { getImportConfigForPath } from "@/config/importacoes";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

interface FormState {
  propostaEdital: string;
  agente: string;
  dataInicioHabilitacao: string;
  dataEnvioDocumentacao: string;
  statusHabilitacao: StatusHabilitacao | "";
  observacoes: string;
  documentos: string[];
}

const initial: FormState = {
  propostaEdital: "",
  agente: "",
  dataInicioHabilitacao: "",
  dataEnvioDocumentacao: "",
  statusHabilitacao: "",
  observacoes: "",
  documentos: [],
};

const normalizeId = (value: unknown) =>
  value == null ? "" : String(value).trim();

export default function HabilitacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const propostaContexto = searchParams.get("proposta") ?? "";

  const visualizando = !!id && !location.pathname.endsWith("/editar");

  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>({
    ...initial,
    propostaEdital: propostaContexto,
  });

  const [propostas, setPropostas] = useState<PropostaOption[]>([]);

  const [agentes, setAgentes] = useState<AgenteOption[]>([]);

  const [documentos, setDocumentos] = useState<DocumentoOption[]>([]);

  const [habilitacoes, setHabilitacoes] = useState<Habilitacao[]>([]);

  const [registro, setRegistro] = useState<Habilitacao | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useImportFormFill("habilitacoes-proposta", setForm);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [
          propostasData,
          agentesData,
          documentosData,
          habilitacoesData,
          registroData,
        ] = await Promise.all([
          getPropostasEditalOptions(),
          getAgentesOptions(),
          getDocumentosDisponiveis(),
          getHabilitacoes(),
          id ? getHabilitacaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);
        setAgentes(agentesData);
        setDocumentos(documentosData);
        setHabilitacoes(habilitacoesData);
        setRegistro(registroData);

        if (registroData) {
          setForm({
            propostaEdital: normalizeId(registroData.propostaEdital),
            agente: normalizeId(registroData.agente),
            dataInicioHabilitacao: registroData.dataInicioHabilitacao ?? "",
            dataEnvioDocumentacao: registroData.dataEnvioDocumentacao ?? "",
            statusHabilitacao: registroData.statusHabilitacao ?? "",
            observacoes: registroData.observacoes ?? "",
            documentos: registroData.documentoIds ?? [],
          });

          return;
        }

        setForm({
          ...initial,
          propostaEdital: propostaContexto,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a habilitação documental.",
        );

        if (id) {
          navigate("/habilitacoes-propostas");
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
  }, [id, navigate, propostaContexto]);

  const propostasDisponiveis = useMemo(() => {
    const selectedId =
      form.propostaEdital || normalizeId(registro?.propostaEdital);
    const ocupadas = new Set(
      habilitacoes
        .filter((item) => normalizeId(item.id) !== normalizeId(id))
        .map((item) => normalizeId(item.propostaEdital)),
    );

    const options = propostas.filter(
      (item) =>
        !ocupadas.has(normalizeId(item.id)) ||
        normalizeId(item.id) === selectedId,
    );

    if (
      selectedId &&
      !options.some((item) => normalizeId(item.id) === selectedId)
    ) {
      options.unshift({
        id: selectedId,
        nome: registro?.nomePropostaEdital || `Proposta ${selectedId}`,
      });
    }

    return options;
  }, [form.propostaEdital, habilitacoes, id, propostas, registro]);

  const agentesComFallback = useMemo(() => {
    const options = [...agentes];
    const selectedId = form.agente || normalizeId(registro?.agente);

    if (
      selectedId &&
      !options.some((item) => normalizeId(item.id) === selectedId)
    ) {
      options.unshift({
        id: selectedId,
        nome: registro?.nomeAgente || `Responsável ${selectedId}`,
      });
    }

    return options;
  }, [agentes, form.agente, registro]);

  const propostaSelectValue =
    form.propostaEdital || normalizeId(registro?.propostaEdital);

  const agenteSelectValue = form.agente || normalizeId(registro?.agente);

  const propostaSelecionadaNome =
    propostasDisponiveis.find(
      (item) => normalizeId(item.id) === propostaSelectValue,
    )?.nome ||
    registro?.nomePropostaEdital ||
    "—";

  const agenteSelecionadoNome =
    agentesComFallback.find(
      (item) => normalizeId(item.id) === agenteSelectValue,
    )?.nome ||
    registro?.nomeAgente ||
    "—";

  const documentosSelecionados = useMemo(
    () =>
      documentos.filter((documento) =>
        form.documentos.includes(normalizeId(documento.id)),
      ),
    [documentos, form.documentos],
  );

  /*
   * O seletor mostra apenas o nome.
   *
   * A situação do documento aparece abaixo, junto ao
   * documento selecionado. Isso evita duplicidade visual
   * e mantém a leitura do multiselect mais simples.
   */
  const documentoOptions = useMemo(
    () =>
      documentos.map((documento) => ({
        value: normalizeId(documento.id),
        label: documento.nome,
      })),
    [documentos],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (visualizando) return;

    // Ao editar, a proposta já pertence ao registro. O fallback evita pedir
    // novamente uma seleção que já está exibida no campo da proposta.
    const propostaEditalSelecionada =
      form.propostaEdital || normalizeId(registro?.propostaEdital);
    const agenteSelecionado = form.agente || normalizeId(registro?.agente);

    if (!propostaEditalSelecionada) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!agenteSelecionado) {
      toast.error("Selecione o responsável pelo acompanhamento.");
      return;
    }

    if (!form.statusHabilitacao) {
      toast.error("Selecione a situação da habilitação.");
      return;
    }

    if (
      form.dataInicioHabilitacao &&
      form.dataEnvioDocumentacao &&
      form.dataEnvioDocumentacao < form.dataInicioHabilitacao
    ) {
      toast.error(
        "A data de envio da documentação não pode ser anterior à data de início da habilitação.",
      );
      return;
    }

    const data: Habilitacao = {
      id: id ?? "",

      propostaEdital: propostaEditalSelecionada,

      nomePropostaEdital: registro?.nomePropostaEdital ?? "",

      agente: agenteSelecionado,

      nomeAgente: registro?.nomeAgente ?? "",

      documentoIds: form.documentos,

      documentos: [],

      dataInicioHabilitacao: form.dataInicioHabilitacao,

      dataEnvioDocumentacao: form.dataEnvioDocumentacao,

      dataLimiteHabilitacao: "",
      dataRetornoAnalise: "",
      dataRegularizacao: "",
      dataConclusaoHabilitacao: "",

      exigenciaOuPendencia: "",
      providenciaTomada: "",
      motivoInabilitacao: "",

      statusHabilitacao: form.statusHabilitacao,

      observacoes: form.observacoes,
    };

    try {
      setSaving(true);

      const payload = buildHabilitacaoPayload(data);

      if (editando && id) {
        await updateHabilitacao(Number(id), payload);

        toast.success("Habilitação documental atualizada com sucesso.");
      } else {
        await createHabilitacao(payload);

        emitJourneyNextStep();
        toast.success("Habilitação documental cadastrada com sucesso.");
      }

      navigate("/habilitacoes-propostas");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a habilitação documental.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/habilitacoes-propostas" />

        <ListPageHeader
          title="Habilitação Documental"
          tooltip="Nesta página são organizados e acompanhados os documentos exigidos para a habilitação do projeto apresentado ao edital. Vincule os documentos já cadastrados no sistema, acompanhe a situação de cada um e registre o andamento da preparação, do envio e da análise da documentação."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/habilitacoes-propostas")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={bloqueado}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            {/* 1 — Proposta e responsável */}
            {/* 1 — Projeto e responsável */}
            <FormSectionCard
              icon={FileSignature}
              title="Projeto e responsável"
              description="Defina qual projeto apresentado ao edital passará pela habilitação documental e quem ficará responsável por acompanhar essa etapa."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    required={!visualizando}
                    tooltip="Selecione o projeto apresentado ao edital cuja documentação será preparada e acompanhada nesta habilitação. Os documentos vinculados abaixo devem corresponder às exigências do edital para esse projeto."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  {visualizando ? (
                    <Input
                      id="propostaEdital"
                      value={propostaSelecionadaNome}
                      disabled
                      readOnly
                      className="bg-muted/40"
                    />
                  ) : (
                    <Select
                      value={propostaSelectValue}
                      onValueChange={(value) => set("propostaEdital", value)}
                      disabled={bloqueado || !!propostaContexto}
                    >
                      <SelectTrigger id="propostaEdital">
                        <SelectValue placeholder="Selecione a proposta" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {propostasDisponiveis.length === 0 ? (
                          <SelectItem value="sem-proposta" disabled>
                            Nenhuma proposta disponível
                          </SelectItem>
                        ) : (
                          propostasDisponiveis.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={normalizeId(item.id)}
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
                    htmlFor="agente"
                    required={!visualizando}
                    tooltip="Selecione a pessoa da organização responsável por acompanhar esta habilitação, incluindo a conferência dos documentos, o envio das informações e as atualizações dessa etapa."
                  >
                    Agente Responsável
                  </FieldLabel>

                  {visualizando ? (
                    <Input
                      id="agente"
                      value={agenteSelecionadoNome}
                      disabled
                      readOnly
                      className="bg-muted/40"
                    />
                  ) : (
                    <Select
                      value={agenteSelectValue}
                      onValueChange={(value) => set("agente", value)}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="agente">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {agentesComFallback.length === 0 ? (
                          <SelectItem value="sem-agente" disabled>
                            Nenhum responsável disponível
                          </SelectItem>
                        ) : (
                          agentesComFallback.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={normalizeId(item.id)}
                            >
                              {item.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </div>
            </FormSectionCard>

            {/* 2 — Documentos da habilitação */}
            <FormSectionCard
              icon={FolderCheck}
              title="Documentos da habilitação"
              description="Reúna os documentos exigidos pelo edital para verificar se a documentação necessária está disponível e em condições de ser apresentada na habilitação."
            >
              <div className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-primary/15 bg-primary-soft/50 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md supports-[backdrop-filter]:bg-primary-soft/40">
                <Info
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                  strokeWidth={2.2}
                  aria-hidden
                />

                <p>
                  Os documentos são selecionados a partir dos cadastros já
                  existentes na área de Documentos da organização. A situação
                  mostrada abaixo é obtida a partir das informações registradas
                  em cada documento.
                </p>
              </div>

              <Field>
                <FieldLabel
                  htmlFor="documentos"
                  tooltip="Selecione os documentos que o edital exige para a habilitação deste projeto. Os documentos precisam estar previamente cadastrados na área de Documentos da organização."
                >
                  Documentos da Habilitação
                </FieldLabel>

                <FormMultiSelect
                  id="documentos"
                  options={documentoOptions}
                  value={form.documentos}
                  onChange={(value) => set("documentos", value)}
                  placeholder="Selecione os documentos"
                  searchPlaceholder="Pesquisar documento..."
                  emptyMessage="Nenhum documento disponível."
                  disabled={bloqueado}
                />
              </Field>

              {documentos.length === 0 ? (
                <div className="mt-4 rounded-[12px] border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
                  <p className="text-xs font-medium text-foreground">
                    Nenhum documento disponível para vinculação.
                  </p>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Cadastre primeiro os documentos da organização para depois
                    vinculá-los à habilitação deste projeto.
                  </p>
                </div>
              ) : documentosSelecionados.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-[12px] border border-border/60 bg-background/55">
                  <div className="border-b border-border/60 bg-muted/35 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Documentos selecionados
                    </p>
                  </div>

                  <div className="divide-y divide-border/50">
                    {documentosSelecionados.map((documento) => (
                      <div
                        key={documento.id}
                        className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-[13px] font-medium text-foreground">
                          {documento.nome}
                        </span>

                        <StatusPill
                          status={calcularStatusDocumentoHabilitacao(documento)}
                          context="documento"
                          ariaLabelPrefix={`Situação de ${documento.nome}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[12px] border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
                  <p className="text-xs font-medium text-foreground">
                    Nenhum documento vinculado a esta habilitação.
                  </p>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Selecione os documentos exigidos pelo edital para acompanhar
                    sua situação durante a habilitação.
                  </p>
                </div>
              )}
            </FormSectionCard>

            {/* 3 — Acompanhamento da habilitação */}
            <FormSectionCard
              icon={CalendarClock}
              title="Acompanhamento da habilitação"
              description="Acompanhe o andamento da habilitação desde o início da preparação dos documentos até seu envio e análise pelo responsável pelo edital."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataInicioHabilitacao"
                    tooltip="Informe a data em que a organização começou a reunir, conferir ou preparar os documentos exigidos para esta habilitação."
                  >
                    Data de Início
                  </FieldLabel>

                  <Input
                    id="dataInicioHabilitacao"
                    type="date"
                    value={form.dataInicioHabilitacao}
                    onChange={(event) =>
                      set("dataInicioHabilitacao", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataEnvioDocumentacao"
                    tooltip="Informe a data em que a documentação exigida foi oficialmente enviada ou protocolada para análise."
                  >
                    Data de Envio da Documentação
                  </FieldLabel>

                  <Input
                    id="dataEnvioDocumentacao"
                    type="date"
                    value={form.dataEnvioDocumentacao}
                    onChange={(event) =>
                      set("dataEnvioDocumentacao", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusHabilitacao"
                    required={!visualizando}
                    tooltip="Selecione a situação que representa o momento atual da habilitação documental. Esse campo deve ser atualizado conforme a documentação avança no processo de preparação, envio e análise."
                  >
                    Situação da Habilitação
                  </FieldLabel>

                  {visualizando ? (
                    <div className="flex h-10 items-center">
                      {form.statusHabilitacao ? (
                        <StatusPill
                          status={form.statusHabilitacao}
                          context="habilitacao"
                          ariaLabelPrefix="Situação da habilitação"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <Select
                        value={form.statusHabilitacao || undefined}
                        onValueChange={(value) =>
                          set("statusHabilitacao", value as StatusHabilitacao)
                        }
                        disabled={bloqueado}
                      >
                        <SelectTrigger id="statusHabilitacao">
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {statusHabilitacaoOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {form.statusHabilitacao && (
                        <div className="mt-2">
                          <StatusPill
                            status={form.statusHabilitacao}
                            context="habilitacao"
                            ariaLabelPrefix="Situação da habilitação"
                          />
                        </div>
                      )}
                    </>
                  )}
                </Field>
              </div>
            </FormSectionCard>

            {/* 4 — Observações */}
            <FormSectionCard
              icon={MessageSquare}
              title="Observações"
              description="Registre informações que ajudem a compreender e acompanhar situações específicas da habilitação que não possuam um campo próprio."
            >
              <Field>
                <FieldLabel
                  htmlFor="observacoes"
                  tooltip="Registre informações complementares sobre a habilitação, como orientações do edital, documentos que precisam de atenção, comunicações recebidas, pendências ou outros pontos importantes para o acompanhamento da documentação."
                >
                  Observações
                </FieldLabel>

                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(event) => set("observacoes", event.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/habilitacoes-propostas")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={loading || saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Habilitação documental"
        href="https://www.aurit.com.br/wiki/editais/habilitacao-documental"
      />
    </AppLayout>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

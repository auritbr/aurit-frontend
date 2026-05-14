import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  FileText,
  MessageSquare,
  Paperclip,
  Scale,
  ExternalLink,
  Upload,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  buildResultadoPropostaPayload,
  createResultadoProposta,
  getDocumentoRecursoDownloadUrl,
  getPropostasEditalOptions,
  getRelatorioAvaliacaoDownloadUrl,
  getResultadoPropostaById,
  getResultadosPropostas,
  parsePontuacao,
  statusResultadoPropostaOptions,
  updateResultadoProposta,
  type PropostaEditalOption,
  type ResultadoProposta,
  type StatusResultadoProposta,
} from "@/data/resultadosPropostas";
import { toast } from "sonner";
import { toastSuccessNext } from "@/lib/nextStepToast";

interface FormState {
  id: string;

  propostaEdital: string;
  nomePropostaEdital: string;

  edital: string;
  nomeEdital: string;

  statusResultadoProposta: StatusResultadoProposta | "";

  dataResultado: string;
  pontuacao: string;

  urlRelatorioAvaliacao: string;
  nomeRelatorioAvaliacao: string;

  recursoInterposto: boolean;

  dataEnvioRecurso: string;
  descricaoRecurso: string;

  urlDocumentoRecurso: string;
  nomeDocumentoRecurso: string;

  observacoes: string;
}

const initial: FormState = {
  id: "",

  propostaEdital: "",
  nomePropostaEdital: "",

  edital: "",
  nomeEdital: "",

  statusResultadoProposta: "",

  dataResultado: "",
  pontuacao: "",

  urlRelatorioAvaliacao: "",
  nomeRelatorioAvaliacao: "",

  recursoInterposto: false,

  dataEnvioRecurso: "",
  descricaoRecurso: "",

  urlDocumentoRecurso: "",
  nomeDocumentoRecurso: "",

  observacoes: "",
};

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function mapToForm(resultado: ResultadoProposta): FormState {
  return {
    id: normalizeId(resultado.id),

    propostaEdital: normalizeId(resultado.propostaEdital),
    nomePropostaEdital: resultado.nomePropostaEdital ?? "",

    edital: normalizeId(resultado.edital),
    nomeEdital: resultado.nomeEdital ?? "",

    statusResultadoProposta: resultado.statusResultadoProposta ?? "",

    dataResultado: resultado.dataResultado ?? "",
    pontuacao:
      resultado.pontuacao === null || resultado.pontuacao === undefined
        ? ""
        : String(resultado.pontuacao),

    urlRelatorioAvaliacao: resultado.urlRelatorioAvaliacao ?? "",
    nomeRelatorioAvaliacao: resultado.nomeRelatorioAvaliacao ?? "",

    recursoInterposto: !!resultado.recursoInterposto,

    dataEnvioRecurso: resultado.dataEnvioRecurso ?? "",
    descricaoRecurso: resultado.descricaoRecurso ?? "",

    urlDocumentoRecurso: resultado.urlDocumentoRecurso ?? "",
    nomeDocumentoRecurso: resultado.nomeDocumentoRecurso ?? "",

    observacoes: resultado.observacoes ?? "",
  };
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaId: string,
  resultado?: ResultadoProposta | null,
) {
  return (
    propostas.find((proposta) => normalizeId(proposta.id) === propostaId)
      ?.nome ||
    resultado?.nomePropostaEdital?.trim() ||
    `Proposta #${propostaId}`
  );
}

function getEditalNome(
  proposta?: PropostaEditalOption | null,
  resultado?: ResultadoProposta | null,
) {
  return (
    proposta?.nomeEdital?.trim() ||
    resultado?.nomeEdital?.trim() ||
    "—"
  );
}

export default function ResultadoPropostaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const editando = !!id && location.pathname.endsWith("/editar");
  const visualizando = !!id && !editando;
  const criando = !id;

  const [form, setForm] = useState<FormState>(initial);
  const [existingResultado, setExistingResultado] =
    useState<ResultadoProposta | null>(null);
  const [novoRelatorio, setNovoRelatorio] = useState<File | null>(null);
  const [novoDocRecurso, setNovoDocRecurso] = useState<File | null>(null);

  const [resultados, setResultados] = useState<ResultadoProposta[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);

  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const relatorioInput = useRef<HTMLInputElement>(null);
  const docRecursoInput = useRef<HTMLInputElement>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;

  const bloqueado =
    visualizando ||
    loading ||
    saving ||
    (!criando && !podeEditar) ||
    (criando && !podeCriar);

  const propostaSelectValue =
    form.propostaEdital || normalizeId(existingResultado?.propostaEdital);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data =
          await getPermissoesUsuarioLogadoPorModulo("RESULTADO_PROPOSTA");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const [propostasData, resultadosData, resultado] = await Promise.all([
          getPropostasEditalOptions(),
          getResultadosPropostas(),
          id ? getResultadoPropostaById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setPropostas(propostasData);
        setResultados(resultadosData);

        if (resultado) {
          const propostaId = normalizeId(resultado.propostaEdital);

          const propostaSelecionada = propostasData.find(
            (proposta) => normalizeId(proposta.id) === propostaId,
          );

          const resultadoNormalizado: ResultadoProposta = {
            ...resultado,
            propostaEdital: propostaId,
            nomePropostaEdital:
              resultado.nomePropostaEdital ||
              propostaSelecionada?.nome ||
              (propostaId ? `Proposta #${propostaId}` : ""),
            nomeEdital:
              resultado.nomeEdital ||
              propostaSelecionada?.nomeEdital ||
              "",
          };

          setExistingResultado(resultadoNormalizado);
          setForm(mapToForm(resultadoNormalizado));
        } else {
          setExistingResultado(null);
          setForm(initial);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar Resultado da Proposta.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);

        if (id) {
          navigate("/resultados-propostas");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarDados();

    return () => {
      active = false;
    };
  }, [id, navigate, loadingPermissoes, podeVisualizar]);

  const propostasDisponiveis = useMemo(() => {
    const ocupadas = new Set(
      resultados
        .filter((resultado) =>
          id ? normalizeId(resultado.id) !== normalizeId(id) : true,
        )
        .map((resultado) => normalizeId(resultado.propostaEdital)),
    );

    return propostas.filter(
      (proposta) =>
        !ocupadas.has(normalizeId(proposta.id)) ||
        normalizeId(proposta.id) === propostaSelectValue,
    );
  }, [id, resultados, propostas, propostaSelectValue]);

  const propostasComFallback = useMemo(() => {
    const options = [...propostasDisponiveis];

    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => normalizeId(proposta.id) === propostaId)
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId, existingResultado),
        nomeEdital:
          existingResultado?.nomeEdital ||
          form.nomeEdital ||
          "Edital vinculado",
      } as PropostaEditalOption);
    }

    return options;
  }, [
    propostasDisponiveis,
    propostas,
    propostaSelectValue,
    existingResultado,
    form.nomeEdital,
  ]);

  const propostaSelecionada = useMemo(
    () =>
      propostasComFallback.find(
        (proposta) => normalizeId(proposta.id) === propostaSelectValue,
      ),
    [propostasComFallback, propostaSelectValue],
  );

  const editalRelacionado =
    form.nomeEdital || getEditalNome(propostaSelecionada, existingResultado);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  function handlePropostaChange(value: string) {
    const propostaSelecionada = propostasComFallback.find(
      (proposta) => normalizeId(proposta.id) === normalizeId(value),
    );

    setForm((prev) => ({
      ...prev,
      propostaEdital: normalizeId(value),
      nomePropostaEdital:
        propostaSelecionada?.nome ||
        prev.nomePropostaEdital ||
        existingResultado?.nomePropostaEdital ||
        "",
      nomeEdital:
        propostaSelecionada?.nomeEdital ||
        prev.nomeEdital ||
        existingResultado?.nomeEdital ||
        "",
    }));
  }

  function getFormComProposta(): FormState {
    return {
      ...form,
      propostaEdital: propostaSelectValue,
      nomePropostaEdital:
        form.nomePropostaEdital ||
        propostaSelecionada?.nome ||
        existingResultado?.nomePropostaEdital ||
        "",
      nomeEdital:
        form.nomeEdital ||
        propostaSelecionada?.nomeEdital ||
        existingResultado?.nomeEdital ||
        "",
    };
  }

  async function abrirRelatorioAvaliacao() {
    const resultadoId = Number(form.id || id);

    if (!resultadoId) {
      toast.error("Resultado da Proposta não identificado.");
      return;
    }

    try {
      const url = await getRelatorioAvaliacaoDownloadUrl(resultadoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao abrir relatório de avaliação.",
      );
    }
  }

  async function abrirDocumentoRecurso() {
    const resultadoId = Number(form.id || id);

    if (!resultadoId) {
      toast.error("Resultado da Proposta não identificado.");
      return;
    }

    try {
      const url = await getDocumentoRecursoDownloadUrl(resultadoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao abrir documento do recurso.",
      );
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (visualizando) return;

    if (criando && !podeCriar) {
      toast.error("Você não possui permissão para criar Resultado da Proposta.");
      return;
    }

    if (editando && !podeEditar) {
      toast.error("Você não possui permissão para editar Resultado da Proposta.");
      return;
    }

    const formComProposta = getFormComProposta();

    if (!formComProposta.propostaEdital) {
      toast.error("Selecione a proposta do edital.");
      return;
    }

    if (!formComProposta.statusResultadoProposta) {
      toast.error("Selecione o status do resultado.");
      return;
    }

    const pontuacao = parsePontuacao(formComProposta.pontuacao);

    if (pontuacao === null) {
      toast.error("Informe a pontuação.");
      return;
    }

    if (pontuacao < 0) {
      toast.error("A pontuação não pode ser negativa.");
      return;
    }

    if (criando && !novoRelatorio) {
      toast.error("Anexe o relatório de avaliação.");
      return;
    }

    if (
      editando &&
      !novoRelatorio &&
      !formComProposta.urlRelatorioAvaliacao
    ) {
      toast.error("Anexe o relatório de avaliação.");
      return;
    }

    if (formComProposta.recursoInterposto) {
      if (!formComProposta.dataEnvioRecurso) {
        toast.error("Informe a data de envio do recurso.");
        return;
      }

      if (!formComProposta.descricaoRecurso.trim()) {
        toast.error("Descreva o recurso interposto.");
        return;
      }

      if (criando && !novoDocRecurso) {
        toast.error("Anexe o documento do recurso.");
        return;
      }

      if (
        editando &&
        !novoDocRecurso &&
        !formComProposta.urlDocumentoRecurso
      ) {
        toast.error("Anexe o documento do recurso.");
        return;
      }
    }

    try {
      setSaving(true);

      const resultado: ResultadoProposta = {
        id: formComProposta.id || id || "",

        propostaEdital: formComProposta.propostaEdital,
        nomePropostaEdital: formComProposta.nomePropostaEdital,

        edital: formComProposta.edital,
        nomeEdital: formComProposta.nomeEdital,

        dataResultado: formComProposta.dataResultado,

        pontuacao,

        urlRelatorioAvaliacao: formComProposta.urlRelatorioAvaliacao,
        nomeRelatorioAvaliacao: formComProposta.nomeRelatorioAvaliacao,

        recursoInterposto: formComProposta.recursoInterposto,

        dataEnvioRecurso: formComProposta.recursoInterposto
          ? formComProposta.dataEnvioRecurso
          : "",
        descricaoRecurso: formComProposta.recursoInterposto
          ? formComProposta.descricaoRecurso
          : "",

        urlDocumentoRecurso: formComProposta.recursoInterposto
          ? formComProposta.urlDocumentoRecurso
          : "",
        nomeDocumentoRecurso: formComProposta.recursoInterposto
          ? formComProposta.nomeDocumentoRecurso
          : "",

        observacoes: formComProposta.observacoes,

        statusResultadoProposta:
          formComProposta.statusResultadoProposta as StatusResultadoProposta,
      };

      const payload = buildResultadoPropostaPayload(resultado);

      if (editando && id) {
        await updateResultadoProposta(
          Number(id),
          payload,
          novoRelatorio,
          novoDocRecurso,
        );

        toastSuccessNext(
          "Resultado da Proposta atualizado com sucesso.",
          navigate,
          "/resultados-propostas",
          formComProposta.statusResultadoProposta === "APROVADO"
            ? {
                label: "Cadastrar habilitação",
                to: "/habilitacoes-propostas/novo",
              }
            : undefined,
        );
      } else {
        await createResultadoProposta(payload, novoRelatorio, novoDocRecurso);

        toastSuccessNext(
          "Resultado da Proposta cadastrado com sucesso.",
          navigate,
          "/resultados-propostas",
          formComProposta.statusResultadoProposta === "APROVADO"
            ? {
                label: "Cadastrar habilitação",
                to: "/habilitacoes-propostas/novo",
              }
            : undefined,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar Resultado da Proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const titulo = "Resultado da Proposta";

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

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
          onClick={() => navigate("/resultados-propostas")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {titulo}
            </h1>

            <HelpTooltip
              text="Registre e acompanhe o resultado das propostas inscritas em editais, incluindo status, pontuação, relatório de avaliação e informações de recurso quando houver."
              label="Resultado da Proposta"
              size="md"
              side="bottom"
              align="start"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Vincule o resultado à proposta, registre a situação, a pontuação e
            anexe o relatório de avaliação. Se houve recurso, registre também os
            dados da contestação.
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
          <Section icon={Award} title="Proposta e Resultado">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  required={!visualizando}
                  tooltip="Vincule este resultado à proposta cadastrada no edital correspondente, mantendo o histórico da inscrição organizado e fácil de acompanhar. Exemplo: se o resultado pertence à proposta “Oficina de Tambor Mineiro”, selecione essa proposta para que o sistema relacione corretamente o resultado ao edital."
                >
                  Proposta do Edital
                </FieldLabel>

                <Select
                  value={propostaSelectValue}
                  onValueChange={handlePropostaChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="propostaEdital">
                    <SelectValue placeholder="Selecione a proposta" />
                  </SelectTrigger>

                  <SelectContent>
                    {propostasComFallback.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Nenhuma proposta disponível
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

                {propostaSelectValue && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Edital relacionado:{" "}
                    <span className="text-foreground">{editalRelacionado}</span>
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="statusResultadoProposta"
                  required={!visualizando}
                  tooltip="Selecione a situação final da proposta após a divulgação do resultado. Essa informação ajuda a acompanhar se a proposta foi aprovada, ficou como suplente ou não foi classificada."
                >
                  Status do Resultado da Proposta
                </FieldLabel>

                <Select
                  value={form.statusResultadoProposta}
                  onValueChange={(value) =>
                    set(
                      "statusResultadoProposta",
                      value as StatusResultadoProposta,
                    )
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="statusResultadoProposta">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusResultadoPropostaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataResultado"
                  tooltip="Informe a data em que o resultado do projeto foi divulgado oficialmente, seja no edital, site da instituição, diário oficial ou plataforma de inscrição."
                >
                  Data do Resultado
                </FieldLabel>

                <Input
                  id="dataResultado"
                  type="date"
                  value={form.dataResultado}
                  onChange={(event) => set("dataResultado", event.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="pontuacao"
                  required={!visualizando}
                  tooltip="Informe a pontuação obtida pela proposta na avaliação. Utilize a nota indicada no resultado oficial, no relatório de avaliação ou no parecer disponibilizado pela comissão avaliadora. Exemplo: se a proposta recebeu nota 84,000 no relatório de avaliação, registre essa pontuação no campo."
                >
                  Pontuação
                </FieldLabel>

                <Input
                  id="pontuacao"
                  inputMode="decimal"
                  value={form.pontuacao}
                  onChange={(event) => set("pontuacao", event.target.value)}
                  placeholder="Ex.: 84,000"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={FileText} title="Relatório de Avaliação">
            <Field>
              <FieldLabel
                required={!visualizando}
                tooltip="Anexe o relatório de avaliação, parecer técnico ou documento oficial que apresenta a análise da proposta, os critérios avaliados e a pontuação recebida. Exemplo: relatório em PDF disponibilizado pela comissão avaliadora com as notas de cada critério."
              >
                Relatório de Avaliação
              </FieldLabel>

              <FileUpload
                inputRef={relatorioInput}
                disabled={bloqueado}
                visualizando={visualizando}
                file={novoRelatorio}
                existingName={form.nomeRelatorioAvaliacao}
                existingUrl={form.urlRelatorioAvaliacao}
                onOpen={abrirRelatorioAvaliacao}
                onPick={(file) => {
                  setNovoRelatorio(file);

                  if (file) {
                    set("nomeRelatorioAvaliacao", file.name);
                  }
                }}
              />
            </Field>
          </Section>

          <Section icon={Scale} title="Recurso">
            <div className="flex items-start gap-3 rounded border border-border bg-muted/20 px-4 py-3">
              <Switch
                id="recursoInterposto"
                checked={form.recursoInterposto}
                onCheckedChange={(value) => {
                  set("recursoInterposto", value);

                  if (!value) {
                    set("dataEnvioRecurso", "");
                    set("descricaoRecurso", "");
                    set("urlDocumentoRecurso", "");
                    set("nomeDocumentoRecurso", "");
                    setNovoDocRecurso(null);
                  }
                }}
                disabled={bloqueado}
              />

              <div className="flex-1">
                <label
                  htmlFor="recursoInterposto"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  Recurso Interposto
                </label>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Marque caso a organização tenha apresentado recurso para
                  solicitar revisão do resultado, da pontuação ou de algum
                  critério da avaliação.
                </p>
              </div>
            </div>

            {form.recursoInterposto ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="dataEnvioRecurso"
                      required={!visualizando}
                      tooltip="Informe a data em que o recurso foi enviado à comissão avaliadora, à plataforma do edital ou ao órgão responsável pela seleção."
                    >
                      Data de Envio do Recurso
                    </FieldLabel>

                    <Input
                      id="dataEnvioRecurso"
                      type="date"
                      value={form.dataEnvioRecurso}
                      onChange={(event) =>
                        set("dataEnvioRecurso", event.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel
                    htmlFor="descricaoRecurso"
                    required={!visualizando}
                    tooltip="Descreva de forma resumida o motivo do recurso, os pontos contestados e os principais argumentos apresentados pela organização para solicitar a revisão."
                  >
                    Descrição do Recurso
                  </FieldLabel>

                  <Textarea
                    id="descricaoRecurso"
                    rows={4}
                    value={form.descricaoRecurso}
                    onChange={(event) =>
                      set("descricaoRecurso", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    required={!visualizando}
                    tooltip="Anexe o documento enviado como recurso, contendo a justificativa formal da contestação, os argumentos apresentados e, se houver, documentos complementares utilizados."
                  >
                    Documento do Recurso
                  </FieldLabel>

                  <FileUpload
                    inputRef={docRecursoInput}
                    disabled={bloqueado}
                    visualizando={visualizando}
                    file={novoDocRecurso}
                    existingName={form.nomeDocumentoRecurso}
                    existingUrl={form.urlDocumentoRecurso}
                    onOpen={abrirDocumentoRecurso}
                    onPick={(file) => {
                      setNovoDocRecurso(file);

                      if (file) {
                        set("nomeDocumentoRecurso", file.name);
                      }
                    }}
                  />
                </Field>
              </div>
            ) : (
              visualizando && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Não houve recurso interposto.
                </p>
              )
            )}
          </Section>

          <Section icon={MessageSquare} title="Observações">
            <Field>
              <FieldLabel
                htmlFor="observacoes"
                tooltip="Registre informações complementares sobre o resultado, avaliação, recurso, resposta da comissão ou próximos passos relacionados à proposta."
              >
                Observações
              </FieldLabel>

              <Textarea
                id="observacoes"
                rows={3}
                value={form.observacoes}
                onChange={(event) => set("observacoes", event.target.value)}
                disabled={bloqueado}
                readOnly={visualizando}
              />
            </Field>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant={visualizando ? "default" : "outline"}
              onClick={() => navigate("/resultados-propostas")}
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
      </div>

      <WikiFloatingButton pageTitle="Resultado da Proposta" />
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

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function FileUpload({
  inputRef,
  disabled,
  visualizando,
  file,
  existingName,
  existingUrl,
  onOpen,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
  visualizando?: boolean;
  file: File | null;
  existingName?: string;
  existingUrl?: string;
  onOpen: () => void | Promise<void>;
  onPick: (file: File | null) => void;
}) {
  const display = file?.name || existingName || "";
  const hasExisting = !!existingUrl && !file;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={display}
          placeholder="Nenhum arquivo anexado"
          disabled
          readOnly
          className="flex-1 cursor-not-allowed bg-muted/40"
        />

        {hasExisting && existingUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onOpen()}
            className="h-10 gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </Button>
        )}

        {!visualizando && (
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-10 gap-1.5"
            disabled={disabled}
          >
            {hasExisting || file ? (
              <Paperclip className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {hasExisting || file ? "Substituir" : "Anexar"}
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
      </div>

      {hasExisting && !visualizando && (
        <p className="text-[11px] text-muted-foreground">
          Já existe um arquivo anexado. Envie um novo arquivo apenas se desejar
          substituí-lo.
        </p>
      )}

      {!hasExisting && !file && !visualizando && (
        <p className="text-[11px] text-muted-foreground">
          Formatos aceitos: PDF, DOC, DOCX, JPG, JPEG e PNG.
        </p>
      )}

      {file && (
        <p className="text-[11px] text-muted-foreground">
          Arquivo selecionado:{" "}
          <span className="font-medium text-foreground">{file.name}</span>
        </p>
      )}
    </div>
  );
}
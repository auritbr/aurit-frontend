import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Award,
  FileText,
  MessageSquare,
  Paperclip,
  Scale,
  ExternalLink,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { StatusPill } from "@/components/StatusPill";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { getImportConfigForPath } from "@/config/importacoes";
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

const RESULTADO_PROPOSTA_NEXT_STEP_KEY =
  "aurit:resultados-propostas:next-step-card";
const PROPOSTA_SELECIONE_VALUE = "__selecionar_proposta__";

interface ResultadoPropostaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoResultadoProposta() {
  const card: ResultadoPropostaNextStepCardData = {
    titulo:
      "Após registrar o resultado da proposta, organize a execução financeira",
    descricao:
      "Cadastre as contas bancárias que serão usadas para acompanhar os recebimentos, pagamentos e movimentações financeiras relacionados à proposta aprovada.",
    acaoLabel: "Cadastrar contas bancárias",
    acaoUrl: "/contas-bancarias/novo",
    acaoSecundariaLabel: "Ver resultados da proposta",
    acaoSecundariaUrl: "/resultados-propostas",
    variante: "pendente",
  };

  sessionStorage.setItem(
    RESULTADO_PROPOSTA_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

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
  return proposta?.nomeEdital?.trim() || resultado?.nomeEdital?.trim() || "—";
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

  useImportFormFill("resultados-proposta", setForm);

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
              resultado.nomeEdital || propostaSelecionada?.nomeEdital || "",
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
    if (value === PROPOSTA_SELECIONE_VALUE) {
      setForm((prev) => ({
        ...prev,
        propostaEdital: "",
        nomePropostaEdital: "",
        edital: "",
        nomeEdital: "",
      }));
      return;
    }

    const propostaSelecionada = propostasComFallback.find(
      (proposta) => normalizeId(proposta.id) === normalizeId(value),
    );

    setForm((prev) => ({
      ...prev,
      propostaEdital: normalizeId(value),
      nomePropostaEdital: propostaSelecionada?.nome ?? "",
      edital: propostaSelecionada?.editalId ?? "",
      nomeEdital: propostaSelecionada?.nomeEdital ?? "",
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
      toast.error(
        "Você não possui permissão para criar Resultado da Proposta.",
      );
      return;
    }

    if (editando && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar Resultado da Proposta.",
      );
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

    if (formComProposta.pontuacao.trim() && pontuacao === null) {
      toast.error("Informe uma pontuação válida.");
      return;
    }

    if (pontuacao !== null && pontuacao < 0) {
      toast.error("A pontuação não pode ser negativa.");
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

      if (editando && !novoDocRecurso && !formComProposta.urlDocumentoRecurso) {
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
        );
      } else {
        await createResultadoProposta(payload, novoRelatorio, novoDocRecurso);
        salvarProximaAcaoResultadoProposta();

        toastSuccessNext(
          "Resultado da Proposta cadastrado com sucesso.",
          navigate,
          "/resultados-propostas",
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

  const titulo = visualizando
    ? "Resultado da Proposta"
    : editando
      ? "Resultado da Proposta"
      : "Resultado da Proposta";

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
        <BackButton to="/resultados-propostas" />

        <ListPageHeader
          title={titulo}
          tooltip="Nesta página são registrados e acompanhados os resultados divulgados para os projetos apresentados aos editais, incluindo a situação obtida no processo seletivo, a pontuação e, quando disponíveis, os documentos de avaliação e as informações relacionadas a eventual recurso."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/resultados-propostas")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            {/* 1 — Proposta e resultado */}
            {/* 1 — Vínculo com o projeto */}
            <Section
              icon={Award}
              title="Vínculo com o projeto"
              description="Selecione o projeto apresentado ao edital cujo resultado será registrado e acompanhado nesta página."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    required
                    tooltip="Selecione o projeto apresentado ao edital cujo resultado será registrado. O edital ao qual ele pertence será identificado automaticamente pelo sistema."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  <Select
                    value={propostaSelectValue}
                    onValueChange={handlePropostaChange}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta de edital" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={PROPOSTA_SELECIONE_VALUE}>
                        Selecione a proposta de edital
                      </SelectItem>
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
                      <span className="text-foreground">
                        {editalRelacionado || "—"}
                      </span>
                    </p>
                  )}
                </Field>
              </div>
            </Section>

            {/* 2 — Resultado do edital */}
            <Section
              icon={Award}
              title="Resultado do edital"
              description="Registre as informações divulgadas oficialmente sobre o resultado do projeto no processo seletivo do edital."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataResultado"
                    tooltip="Informe a data em que o resultado deste projeto foi oficialmente publicado ou comunicado pelo órgão responsável pelo edital."
                  >
                    Data do Resultado
                  </FieldLabel>

                  <Input
                    id="dataResultado"
                    type="date"
                    value={form.dataResultado}
                    onChange={(event) =>
                      set("dataResultado", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusResultadoProposta"
                    required
                    tooltip="Selecione o resultado oficial atribuído ao projeto após a análise. Utilize a informação publicada pelo órgão ou comissão responsável."
                  >
                    Resultado da Proposta
                  </FieldLabel>

                  {visualizando ? (
                    <div className="flex h-10 items-center">
                      <StatusPill
                        status={form.statusResultadoProposta || "—"}
                        context="resultado-proposta"
                        ariaLabelPrefix="Resultado da proposta"
                      />
                    </div>
                  ) : (
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
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>

                      <SelectContent>
                        {statusResultadoPropostaOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="pontuacao"
                    tooltip="Quando houver, informe a pontuação final atribuída ao projeto conforme o resultado, parecer ou relatório de avaliação."
                  >
                    Pontuação
                  </FieldLabel>

                  <Input
                    id="pontuacao"
                    inputMode="decimal"
                    value={form.pontuacao}
                    onChange={(event) => set("pontuacao", event.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </Section>

            {/* 3 — Relatório de avaliação */}
            <Section
              icon={FileText}
              title="Relatório de avaliação"
              description="Mantenha registrado o documento disponibilizado pelo edital com a avaliação realizada sobre o projeto, quando houver."
            >
              <Field>
                <FieldLabel tooltip="Anexe o parecer, relatório, ficha de avaliação ou outro documento oficial que apresente a análise do projeto, incluindo critérios avaliados, justificativas e pontuação, quando essas informações estiverem disponíveis.">
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

            {/* 4 — Recurso */}
            <Section
              icon={Scale}
              title="Recurso"
              description="Registre quando a organização solicitar a revisão do resultado, da pontuação ou da avaliação recebida no processo seletivo."
            >
              <div className="flex items-start gap-3 rounded-[14px] border border-border/70 bg-card/75 px-4 py-3.5 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md transition-colors hover:border-primary/25 supports-[backdrop-filter]:bg-card/60">
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
                    Recurso Apresentado
                  </label>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Marque esta opção quando a organização tiver solicitado
                    oficialmente a revisão do resultado, da pontuação ou de
                    algum ponto da avaliação.
                  </p>
                </div>
              </div>

              {form.recursoInterposto ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel
                        htmlFor="dataEnvioRecurso"
                        required
                        tooltip="Informe a data em que o recurso foi oficialmente enviado ou protocolado junto ao órgão, comissão ou plataforma responsável pelo edital."
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
                      required
                      tooltip="Resuma o que foi contestado no recurso, indicando os pontos da avaliação ou do resultado que a organização pediu para revisar e, quando possível, o que foi solicitado ao órgão responsável."
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
                      required
                      tooltip="Anexe o documento que foi oficialmente enviado como recurso, contendo a justificativa, os argumentos e os pedidos apresentados pela organização."
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
                    Não houve recurso apresentado.
                  </p>
                )
              )}
            </Section>

            {/* 5 — Observações */}
            <Section
              icon={MessageSquare}
              title="Observações"
              description="Registre informações que ajudem a acompanhar situações relacionadas ao resultado, à avaliação ou ao recurso e que não possuam um campo específico."
            >
              <Field>
                <FieldLabel
                  htmlFor="observacoes"
                  tooltip="Registre informações adicionais que não possuam um campo específico, como esclarecimentos sobre o resultado, resposta ao recurso, alterações posteriores, comunicações recebidas ou outros pontos importantes."
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
          </fieldset>

          {visualizando ? (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/resultados-propostas")}
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
                onClick={() => navigate("/resultados-propostas")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton pageTitle="Resultado da Proposta" />
    </AppLayout>
  );
}

function Section({
  icon,
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
    <FormSectionCard icon={icon} title={title} description={description}>
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
  return <div className={full ? "sm:col-span-2" : undefined}>{children}</div>;
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
          className="attachment-file-glass flex-1 cursor-not-allowed"
        />

        {hasExisting && existingUrl && (
          <Button
            type="button"
            variant="glassSecondary"
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
            variant="glassSecondary"
            onClick={() => inputRef.current?.click()}
            className="h-10 gap-1.5"
            disabled={disabled}
          >
            {hasExisting || file ? (
              <Paperclip className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {hasExisting || file ? "Substituir" : "Selecionar arquivo"}
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
        <div className="attachment-file-glass flex min-w-0 items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground">
          <Paperclip className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0">Arquivo selecionado:</span>
          <span className="truncate font-medium text-foreground">
            {file.name}
          </span>
        </div>
      )}
    </div>
  );
}

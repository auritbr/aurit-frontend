import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Paperclip,
  Tag,
  Link2,
  Info,
  Upload,
  X,
  FolderKanban,
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  buildEvidenciaPayload,
  createEmptyEvidencia,
  createEvidenciaExecucao,
  getAcoesDivulgacaoOptions,
  getAtividadesOptions,
  getEvidenciaExecucaoById,
  getEventosCulturaisOptions,
  getEvidenciaArquivoDownloadUrl,
  getNomeArquivoEvidencia,
  getPresencasOptions,
  getProjetosOptions,
  getPropostasEditalOptions,
  getTurmasOptions,
  tiposEvidencia,
  tiposVinculoEvidencia,
  updateEvidenciaExecucao,
  type Evidencia,
  type OptionItem,
  type TipoEvidencia,
  type TipoVinculoEvidencia,
} from "@/data/evidencias";
import { toast } from "sonner";

const MAX_FILE_MB = 10;
const EVIDENCIA_NEXT_STEP_KEY = "aurit:evidencias:next-step-card";

interface EvidenciaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoEvidencia() {
  const card: EvidenciaNextStepCardData = {
    titulo: "Após organizar as evidências, registre os editais",
    descricao:
      "O cadastro de editais ajuda a acompanhar as oportunidades em que a organização participou ou pretende participar, registrando informações como nome do edital, status, data de abertura, data de encerramento, órgão responsável e situação do processo.",
    acaoLabel: "Cadastrar edital",
    acaoUrl: "/editais/novo",
    acaoSecundariaLabel: "Ver evidências",
    acaoSecundariaUrl: "/evidencias",
    variante: "pendente",
  };

  sessionStorage.setItem(EVIDENCIA_NEXT_STEP_KEY, JSON.stringify(card));
}

function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeOption(item: OptionItem): OptionItem {
  return {
    ...item,
    id: String(item.id),
    nome: item.nome?.trim() || `Registro ${item.id}`,
    projetoId:
      item.projetoId !== null && item.projetoId !== undefined
        ? String(item.projetoId)
        : item.projetoId,
  };
}

function normalizeOptions(items: OptionItem[]) {
  return (items ?? [])
    .filter(
      (item) =>
        item.id !== null &&
        item.id !== undefined &&
        String(item.id).trim() !== "",
    )
    .map(normalizeOption);
}

function filtrarPorProjeto(items: OptionItem[], projetoId: string) {
  const projeto = String(projetoId || "").trim();

  if (!projeto) return items;

  return items.filter(
    (item) => !item.projetoId || String(item.projetoId) === projeto,
  );
}

function withSelectedOption(
  items: OptionItem[],
  allItems: OptionItem[],
  selectedId: string,
  fallbackPrefix: string,
) {
  const selected = String(selectedId || "").trim();

  const normalizados = normalizeOptions(items);
  const todosNormalizados = normalizeOptions(allItems);

  if (selected && !normalizados.some((item) => String(item.id) === selected)) {
    const found = todosNormalizados.find((item) => String(item.id) === selected);

    normalizados.push(
      found ?? {
        id: selected,
        nome: `${fallbackPrefix} vinculada #${selected}`,
      },
    );
  }

  return normalizados;
}

export default function EvidenciaForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<Evidencia>(() => createEmptyEvidencia());
  const [existingEvidencia, setExistingEvidencia] =
    useState<Evidencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);

  const [projetos, setProjetos] = useState<OptionItem[]>([]);
  const [propostasEdital, setPropostasEdital] = useState<OptionItem[]>([]);
  const [atividades, setAtividades] = useState<OptionItem[]>([]);
  const [turmas, setTurmas] = useState<OptionItem[]>([]);
  const [eventos, setEventos] = useState<OptionItem[]>([]);
  const [acoes, setAcoes] = useState<OptionItem[]>([]);
  const [presencas, setPresencas] = useState<OptionItem[]>([]);

  const bloqueado = loading || visualizando;

  const set = <K extends keyof Evidencia>(key: K, value: Evidencia[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const projetoSelectValue =
    String(form.projeto || existingEvidencia?.projeto || "");

  const projetoOriginalAtivo =
    !!existingEvidencia &&
    (!form.projeto ||
      String(form.projeto) === String(existingEvidencia.projeto || ""));

  const tipoVinculoSelectValue = String(
    form.tipoVinculoEvidencia ||
      existingEvidencia?.tipoVinculoEvidencia ||
      "",
  ) as TipoVinculoEvidencia | "";

  const tv = tipoVinculoSelectValue;

  const propostaEditalSelectValue = String(
    form.propostaEdital ||
      (projetoOriginalAtivo ? existingEvidencia?.propostaEdital : "") ||
      "",
  );

  const atividadeSelectValue = String(
    form.atividade ||
      (projetoOriginalAtivo ? existingEvidencia?.atividade : "") ||
      "",
  );

  const turmaSelectValue = String(
    form.turma || (projetoOriginalAtivo ? existingEvidencia?.turma : "") || "",
  );

  const eventoCulturalSelectValue = String(
    form.eventoCultural ||
      (projetoOriginalAtivo ? existingEvidencia?.eventoCultural : "") ||
      "",
  );

  const acaoDivulgacaoSelectValue = String(
    form.acaoDivulgacao ||
      (projetoOriginalAtivo ? existingEvidencia?.acaoDivulgacao : "") ||
      "",
  );

  const presencaSelectValue = String(
    form.presenca ||
      (projetoOriginalAtivo ? existingEvidencia?.presenca : "") ||
      "",
  );

  useEffect(() => {
    let active = true;

    async function carregarTudo() {
      try {
        setLoading(true);

        const [
          projetosData,
          propostasEditalData,
          atividadesData,
          turmasData,
          eventosData,
          acoesData,
          presencasData,
          registroData,
        ] = await Promise.all([
          getProjetosOptions(),
          getPropostasEditalOptions(),
          getAtividadesOptions(),
          getTurmasOptions(),
          getEventosCulturaisOptions(),
          getAcoesDivulgacaoOptions(),
          getPresencasOptions(),
          id ? getEvidenciaExecucaoById(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        const projetosNormalizados = normalizeOptions(projetosData);
        const propostasNormalizadas = normalizeOptions(propostasEditalData);
        const atividadesNormalizadas = normalizeOptions(atividadesData);
        const turmasNormalizadas = normalizeOptions(turmasData);
        const eventosNormalizados = normalizeOptions(eventosData);
        const acoesNormalizadas = normalizeOptions(acoesData);
        const presencasNormalizadas = normalizeOptions(presencasData);

        setProjetos(projetosNormalizados);
        setPropostasEdital(propostasNormalizadas);
        setAtividades(atividadesNormalizadas);
        setTurmas(turmasNormalizadas);
        setEventos(eventosNormalizados);
        setAcoes(acoesNormalizadas);
        setPresencas(presencasNormalizadas);

        if (registroData) {
          const registroNormalizado: Evidencia = {
            ...registroData,
            id: registroData.id,
            projeto: String(registroData.projeto || ""),
            propostaEdital: String(registroData.propostaEdital || ""),
            atividade: String(registroData.atividade || ""),
            turma: String(registroData.turma || ""),
            eventoCultural: String(registroData.eventoCultural || ""),
            acaoDivulgacao: String(registroData.acaoDivulgacao || ""),
            presenca: String(registroData.presenca || ""),
            tipoVinculoEvidencia: registroData.tipoVinculoEvidencia,
            urlArquivo: registroData.urlArquivo ?? "",
          };

          setExistingEvidencia(registroNormalizado);
          setForm(registroNormalizado);
        } else {
          setExistingEvidencia(null);
          setForm(createEmptyEvidencia());
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar evidência.",
        );

        if (id) {
          navigate("/evidencias");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarTudo();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const projetosComSelecao = useMemo(
    () => withSelectedOption(projetos, projetos, projetoSelectValue, "Projeto"),
    [projetos, projetoSelectValue],
  );

  const propostasFiltradas = useMemo(() => {
    const filtradas = filtrarPorProjeto(propostasEdital, projetoSelectValue);

    return withSelectedOption(
      filtradas,
      propostasEdital,
      propostaEditalSelectValue,
      "Proposta",
    );
  }, [propostasEdital, projetoSelectValue, propostaEditalSelectValue]);

  const atividadesFiltradas = useMemo(() => {
    const filtradas = filtrarPorProjeto(atividades, projetoSelectValue);

    return withSelectedOption(
      filtradas,
      atividades,
      atividadeSelectValue,
      "Atividade",
    );
  }, [atividades, projetoSelectValue, atividadeSelectValue]);

  const turmasFiltradas = useMemo(() => {
    const filtradas = filtrarPorProjeto(turmas, projetoSelectValue);

    return withSelectedOption(filtradas, turmas, turmaSelectValue, "Turma");
  }, [turmas, projetoSelectValue, turmaSelectValue]);

  const eventosFiltrados = useMemo(() => {
    const filtrados = filtrarPorProjeto(eventos, projetoSelectValue);

    return withSelectedOption(
      filtrados,
      eventos,
      eventoCulturalSelectValue,
      "Evento",
    );
  }, [eventos, projetoSelectValue, eventoCulturalSelectValue]);

  const acoesFiltradas = useMemo(() => {
    const filtradas = filtrarPorProjeto(acoes, projetoSelectValue);

    return withSelectedOption(
      filtradas,
      acoes,
      acaoDivulgacaoSelectValue,
      "Ação",
    );
  }, [acoes, projetoSelectValue, acaoDivulgacaoSelectValue]);

  const presencasFiltradas = useMemo(() => {
    const filtradas = filtrarPorProjeto(presencas, projetoSelectValue);

    return withSelectedOption(
      filtradas,
      presencas,
      presencaSelectValue,
      "Presença",
    );
  }, [presencas, projetoSelectValue, presencaSelectValue]);

  function setProjeto(projetoId: string) {
    setForm((prev) => ({
      ...prev,
      projeto: String(projetoId),
      propostaEdital: "",
      atividade: "",
      turma: "",
      eventoCultural: "",
      acaoDivulgacao: "",
      presenca: "",
    }));
  }

  function setTipoVinculo(tipo: TipoVinculoEvidencia) {
    setForm((prev) => ({
      ...prev,
      tipoVinculoEvidencia: tipo,
      propostaEdital:
        tipo === "PROPOSTA_EDITAL" ? propostaEditalSelectValue : "",
      atividade: tipo === "ATIVIDADE" ? atividadeSelectValue : "",
      turma: tipo === "TURMA" ? turmaSelectValue : "",
      eventoCultural:
        tipo === "EVENTO_CULTURAL" ? eventoCulturalSelectValue : "",
      acaoDivulgacao:
        tipo === "ACAO_DIVULGACAO" ? acaoDivulgacaoSelectValue : "",
      presenca: tipo === "PRESENCA" ? presencaSelectValue : "",
    }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (visualizando) return;

    const file = event.target.files?.[0];

    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > MAX_FILE_MB) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      event.target.value = "";
      return;
    }

    setArquivoFile(file);
    set("urlArquivo", file.name);
  }

  function removeArquivo() {
    if (visualizando) return;

    setArquivoFile(null);
    set("urlArquivo", "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function montarEvidenciaParaEnvio(): Evidencia {
    return {
      ...form,
      projeto: projetoSelectValue,
      tipoVinculoEvidencia: tipoVinculoSelectValue as TipoVinculoEvidencia,
      propostaEdital: propostaEditalSelectValue,
      atividade: atividadeSelectValue,
      turma: turmaSelectValue,
      eventoCultural: eventoCulturalSelectValue,
      acaoDivulgacao: acaoDivulgacaoSelectValue,
      presenca: presencaSelectValue,
    };
  }

  function validar(evidencia: Evidencia) {
    if (!evidencia.tituloEvidencia.trim()) {
      toast.error("Informe o título da evidência.");
      return false;
    }

    if (!evidencia.tipoEvidencia) {
      toast.error("Selecione o tipo de evidência.");
      return false;
    }

    if (!evidencia.tipoVinculoEvidencia) {
      toast.error("Selecione o tipo de vínculo.");
      return false;
    }

    if (!evidencia.projeto) {
      toast.error("Selecione o projeto.");
      return false;
    }

    if (
      evidencia.tipoVinculoEvidencia === "PROPOSTA_EDITAL" &&
      !evidencia.propostaEdital
    ) {
      toast.error("Selecione a proposta de edital correspondente.");
      return false;
    }

    if (evidencia.tipoVinculoEvidencia === "ATIVIDADE" && !evidencia.atividade) {
      toast.error("Selecione a atividade correspondente.");
      return false;
    }

    if (evidencia.tipoVinculoEvidencia === "TURMA" && !evidencia.turma) {
      toast.error("Selecione a turma correspondente.");
      return false;
    }

    if (
      evidencia.tipoVinculoEvidencia === "EVENTO_CULTURAL" &&
      !evidencia.eventoCultural
    ) {
      toast.error("Selecione o evento cultural correspondente.");
      return false;
    }

    if (
      evidencia.tipoVinculoEvidencia === "ACAO_DIVULGACAO" &&
      !evidencia.acaoDivulgacao
    ) {
      toast.error("Selecione a ação de divulgação correspondente.");
      return false;
    }

    if (evidencia.tipoVinculoEvidencia === "PRESENCA" && !evidencia.presenca) {
      toast.error("Selecione a presença correspondente.");
      return false;
    }

    if (!evidencia.urlArquivo.trim() && !evidencia.urlPublicacao.trim()) {
      toast.error("Informe pelo menos um arquivo ou link de publicação.");
      return false;
    }

    if (evidencia.urlPublicacao.trim() && !isUrl(evidencia.urlPublicacao.trim())) {
      toast.error("Informe um link válido com http:// ou https://.");
      return false;
    }

    return true;
  }

  async function handleAbrirArquivo() {
    if (!form.id) {
      toast.error("Evidência não identificada.");
      return;
    }

    if (!form.urlArquivo) {
      toast.info("Nenhum arquivo anexado.");
      return;
    }

    try {
      const urlTemporaria = await getEvidenciaArquivoDownloadUrl(Number(form.id));
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir arquivo.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (visualizando) return;

    const evidenciaParaEnvio = montarEvidenciaParaEnvio();

    if (!validar(evidenciaParaEnvio)) return;

    try {
      setLoading(true);

      const payload = buildEvidenciaPayload(evidenciaParaEnvio);

      if (editando && id) {
        await updateEvidenciaExecucao(Number(id), payload, arquivoFile);
        toast.success("Evidência atualizada com sucesso.");
      } else {
        await createEvidenciaExecucao(payload, arquivoFile);
        salvarProximaAcaoEvidencia();
        toast.success("Evidência cadastrada com sucesso.");
      }

      navigate("/evidencias", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar evidência.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/evidencias")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Evidência
            </h1>

            <HelpTooltip
              text="Registre e organize evidências da execução do projeto e da proposta de edital, como fotos, vídeos, listas de presença, relatórios, materiais gráficos, documentos e links de publicações. Vincule cada evidência ao item que ela comprova para facilitar relatórios, comprovações e prestação de contas."
              label="Evidências de Execução"
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
            Registre aqui fotos, vídeos, listas de presença, documentos,
            materiais gráficos e links que{" "}
            <span className="font-semibold">comprovem a execução</span> das
            ações do projeto. Sempre vincule cada evidência ao item
            correspondente.
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
          <Section icon={FileText} title="Identificação da evidência">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="tituloEvidencia"
                  required
                  tooltip="Informe um título claro para identificar o que esta evidência comprova. Ex.: Fotos da Oficina de Violão — Maio de 2026."
                >
                  Título da Evidência
                </FieldLabel>

                <Input
                  id="tituloEvidencia"
                  value={form.tituloEvidencia}
                  onChange={(event) =>
                    set("tituloEvidencia", event.target.value)
                  }
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="observacaoEvidencia"
                  tooltip="Registre informações complementares sobre a evidência, como contexto, data, local, atividade relacionada, participantes, conteúdo registrado ou observações úteis para relatórios."
                >
                  Observação
                </FieldLabel>

                <Textarea
                  id="observacaoEvidencia"
                  value={form.observacaoEvidencia}
                  onChange={(event) =>
                    set("observacaoEvidencia", event.target.value)
                  }
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Paperclip} title="Arquivo e publicação">
            <div className="space-y-4">
              <Field>
                <FieldLabel tooltip="Anexe o arquivo que comprova a execução da ação, como foto, vídeo, PDF, lista de presença, certificado, relatório, print, material gráfico ou documento.">
                  Arquivo da Evidência
                </FieldLabel>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileChange}
                  disabled={bloqueado}
                />

                {!form.urlArquivo ? (
                  <button
                    type="button"
                    onClick={() =>
                      !visualizando && fileInputRef.current?.click()
                    }
                    disabled={visualizando}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    Clique para anexar um arquivo até 10 MB
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <Paperclip className="h-4 w-4 flex-shrink-0 text-primary" />

                      <span className="truncate text-sm text-foreground">
                        {arquivoFile?.name ||
                          getNomeArquivoEvidencia(form.urlArquivo)}
                      </span>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      {visualizando && !!form.urlArquivo && (
                        <button
                          type="button"
                          onClick={handleAbrirArquivo}
                          className="inline-flex h-7 items-center rounded border border-border px-2 text-xs text-primary hover:bg-primary/5"
                        >
                          Ver arquivo
                        </button>
                      )}

                      {!visualizando && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Substituir
                          </Button>

                          <button
                            type="button"
                            onClick={removeArquivo}
                            aria-label="Remover arquivo"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Formatos aceitos: imagens, vídeos, PDF e documentos. Tamanho
                  máximo: 10 MB.
                </p>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="urlPublicacao"
                  tooltip="Informe o link de publicação, notícia, postagem, vídeo, página, matéria ou registro online relacionado à evidência, quando houver."
                >
                  Link da Publicação
                </FieldLabel>

                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="urlPublicacao"
                    type="url"
                    value={form.urlPublicacao}
                    onChange={(event) =>
                      set("urlPublicacao", event.target.value)
                    }
                    className="pl-9"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={Tag} title="Tipo da evidência">
            <Field>
              <FieldLabel
                htmlFor="tipoEvidencia"
                required
                tooltip="Selecione o tipo de registro que está sendo cadastrado como evidência."
              >
                Tipo de Evidência
              </FieldLabel>

              <Select
                value={String(form.tipoEvidencia || "")}
                onValueChange={(value) =>
                  set("tipoEvidencia", value as TipoEvidencia)
                }
                disabled={bloqueado}
              >
                <SelectTrigger id="tipoEvidencia">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>

                <SelectContent>
                  {tiposEvidencia.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section icon={FolderKanban} title="Projeto">
            <Field>
              <FieldLabel
                htmlFor="projeto"
                required
                tooltip="Selecione o projeto ao qual esta evidência pertence."
              >
                Projeto
              </FieldLabel>

              <Select
                value={projetoSelectValue}
                onValueChange={setProjeto}
                disabled={bloqueado}
              >
                <SelectTrigger id="projeto">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>

                <SelectContent>
                  {projetosComSelecao.map((item) => (
                    <SelectItem key={String(item.id)} value={String(item.id)}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section icon={Link2} title="Vínculo da evidência">
            <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <Info
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                strokeWidth={2.2}
              />

              <span>
                Escolha apenas um vínculo específico para indicar o que esta
                evidência comprova. O sistema aceita somente um vínculo por
                evidência.
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="tipoVinculoEvidencia"
                  required
                  tooltip="Selecione qual parte da execução esta evidência comprova."
                >
                  Tipo de Vínculo
                </FieldLabel>

                <Select
                  value={String(tipoVinculoSelectValue || "")}
                  onValueChange={(value) =>
                    setTipoVinculo(value as TipoVinculoEvidencia)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoVinculoEvidencia">
                    <SelectValue placeholder="Selecione o tipo de vínculo" />
                  </SelectTrigger>

                  <SelectContent>
                    {tiposVinculoEvidencia.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {tv === "PROPOSTA_EDITAL" && (
                <VinculoSelect
                  id="propostaEdital"
                  label="Proposta de Edital"
                  value={propostaEditalSelectValue}
                  options={propostasFiltradas}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("propostaEdital", value)}
                />
              )}

              {tv === "ATIVIDADE" && (
                <VinculoSelect
                  id="atividade"
                  label="Atividade"
                  value={atividadeSelectValue}
                  options={atividadesFiltradas}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("atividade", value)}
                />
              )}

              {tv === "TURMA" && (
                <VinculoSelect
                  id="turma"
                  label="Turma"
                  value={turmaSelectValue}
                  options={turmasFiltradas}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("turma", value)}
                />
              )}

              {tv === "EVENTO_CULTURAL" && (
                <VinculoSelect
                  id="eventoCultural"
                  label="Evento Cultural"
                  value={eventoCulturalSelectValue}
                  options={eventosFiltrados}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("eventoCultural", value)}
                />
              )}

              {tv === "ACAO_DIVULGACAO" && (
                <VinculoSelect
                  id="acaoDivulgacao"
                  label="Ação de Divulgação"
                  value={acaoDivulgacaoSelectValue}
                  options={acoesFiltradas}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("acaoDivulgacao", value)}
                />
              )}

              {tv === "PRESENCA" && (
                <VinculoSelect
                  id="presenca"
                  label="Presença"
                  value={presencaSelectValue}
                  options={presencasFiltradas}
                  disabled={bloqueado || !projetoSelectValue}
                  onChange={(value) => set("presenca", value)}
                />
              )}
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/evidencias")}
              disabled={loading}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function VinculoSelect({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: OptionItem[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>

      <Select
        value={String(value || "")}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
        </SelectTrigger>

        <SelectContent className="max-h-72">
          {options.map((item) => (
            <SelectItem key={String(item.id)} value={String(item.id)}>
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
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
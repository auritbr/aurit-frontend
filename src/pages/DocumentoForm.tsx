import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Upload,
  AlertTriangle,
  X,
  FileText,
  IdCard,
  CalendarClock,
  Paperclip,
  Landmark,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { PageTitle } from "@/components/PageTitle";
import { ImportDataButton } from "@/components/ImportDataButton";
import { BackButton } from "@/components/BackButton";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/FieldLabel";
import { FormSectionCard } from "@/components/FormSectionCard";
import { FormSearchableSelect } from "@/components/FormSearchableSelect";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { FormLegend } from "@/components/FormLegend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildDocumentoPayload,
  createDocumento,
  getDocumentoById,
  getDocumentoDownloadUrl,
  getNomeArquivoDocumento,
  isDocumentoVencido,
  statusDocumentoLabels,
  tipoDocumentoLabels,
  updateDocumento,
  getOrganizacoesDocumento,
  type Documento,
  type StatusDocumento,
  type TipoDocumento,
  type OrganizacaoOption,
} from "@/data/documentos";
import { toast } from "sonner";
import { getImportConfigForPath } from "@/config/importacoes";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

const MAX_FILE_MB = 10;
const TIPO_DOCUMENTO_OUTROS = "OUTROS" as TipoDocumento;

type DocumentoFormState = Omit<
  Documento,
  "tipoDocumento" | "statusDocumento"
> & {
  tipoDocumento: TipoDocumento | "";
  statusDocumento: StatusDocumento | "";
};

const tipoOptions = Object.entries(tipoDocumentoLabels) as [
  TipoDocumento,
  string,
][];

tipoOptions.sort(([, labelA], [, labelB]) =>
  labelA.localeCompare(labelB, "pt-BR", { sensitivity: "base" }),
);

const statusOptions = Object.entries(statusDocumentoLabels) as [
  StatusDocumento,
  string,
][];

function emptyForm(): DocumentoFormState {
  return {
    id: 0,
    tipoDocumento: "",
    statusDocumento: "",
    dataEmissao: "",
    dataValidade: "",
    orgaoEmissor: "",
    organizacaoId: null,
    urlDocumento: "",
    arquivoKey: "",
    observacao: "",
    vencido: false,
    mensagemVencimento: "",
    removerArquivo: false,
  };
}

function salvarProximaAcaoDocumento() {
  emitJourneyNextStep();
}

function isAllowedDocumentoArquivo(file: File) {
  const allowed = ["pdf", "png", "jpg", "jpeg", "webp"];
  const extension = file.name.split(".").pop()?.toLowerCase();

  return !!extension && allowed.includes(extension);
}

export default function DocumentoForm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [form, setForm] = useState<DocumentoFormState>(emptyForm());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const bloqueado = visualizando || loading || saving;
  const mostrarObservacao = form.tipoDocumento === TIPO_DOCUMENTO_OUTROS;
  const validadeNaoSeAplica = form.statusDocumento === "NAO_SE_APLICA";
  const dataValidadeBloqueada = bloqueado || validadeNaoSeAplica;

  const handleStatusDocumentoChange = (value: string) => {
    if (visualizando) return;

    const statusDocumento = value as StatusDocumento;

    update({
      statusDocumento,
      dataValidade:
        statusDocumento === "NAO_SE_APLICA" ? "" : form.dataValidade,
      mensagemVencimento:
        statusDocumento === "NAO_SE_APLICA" ? "" : form.mensagemVencimento,
    });
  };

  useImportFormFill("documentos", setForm);

  useEffect(() => {
    let active = true;

    async function carregarOrganizacoes() {
      try {
        const orgs = await getOrganizacoesDocumento();

        if (!active) return;

        setOrganizacoes(orgs);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar organizações.",
        );
      }
    }

    void carregarOrganizacoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function carregar() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const documento = await getDocumentoById(Number(id));

        if (!active) return;

        setForm({
          ...documento,
          tipoDocumento: documento.tipoDocumento ?? "",
          statusDocumento: documento.statusDocumento ?? "",
          organizacaoId: documento.organizacaoId ?? null,
          observacao: documento.observacao ?? "",
          removerArquivo: false,
        });

        if (documento.urlDocumento) {
          setArquivoNome(getNomeArquivoDocumento(documento.urlDocumento));
        } else {
          setArquivoNome("");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar documento.",
        );
        navigate("/documentos");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const docVencido = useMemo(
    () =>
      form.statusDocumento !== "" &&
      form.statusDocumento !== "NAO_SE_APLICA" &&
      isDocumentoVencido(form as Documento),
    [form],
  );

  const update = (patch: Partial<DocumentoFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleTipoDocumentoChange = (value: string) => {
    if (visualizando) return;

    const tipoDocumento = value as TipoDocumento;

    update({
      tipoDocumento,
      observacao:
        tipoDocumento === TIPO_DOCUMENTO_OUTROS ? (form.observacao ?? "") : "",
    });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (visualizando) return;

    const file = event.target.files?.[0];

    if (!file) return;

    if (!isAllowedDocumentoArquivo(file)) {
      toast.error("Formato não permitido. Envie PDF, PNG, JPG, JPEG ou WEBP.");
      event.target.value = "";
      return;
    }

    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > MAX_FILE_MB) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      event.target.value = "";
      return;
    }

    setArquivo(file);
    setArquivoNome(file.name);
    update({ removerArquivo: false });
  };

  const removeFile = () => {
    if (visualizando) return;

    setArquivo(null);
    setArquivoNome("");
    update({
      urlDocumento: "",
      arquivoKey: "",
      removerArquivo: true,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOrgChange = (orgId: string) => {
    if (visualizando) return;

    const organizacaoId = Number(orgId);

    if (!Number.isFinite(organizacaoId)) {
      update({ organizacaoId: null });
      return;
    }

    update({ organizacaoId });
  };

  const handleAbrirArquivo = async () => {
    if (!form.id) {
      toast.error("Documento não identificado.");
      return;
    }

    if (!form.urlDocumento) {
      toast.info("Nenhum arquivo anexado.");
      return;
    }

    try {
      const urlTemporaria = await getDocumentoDownloadUrl(Number(form.id));
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir arquivo.",
      );
    }
  };

  const handleSave = async () => {
    if (visualizando) return;

    if (!form.tipoDocumento) {
      toast.error("Selecione o tipo de documento.");
      return;
    }

    if (
      form.tipoDocumento === TIPO_DOCUMENTO_OUTROS &&
      !form.observacao?.trim()
    ) {
      toast.error("Informe a observação para especificar o tipo de documento.");
      return;
    }

    if (!form.statusDocumento) {
      toast.error("Selecione o status do documento.");
      return;
    }

    if (!form.organizacaoId) {
      toast.error("Selecione a organização.");
      return;
    }

    if (
      form.dataEmissao &&
      form.dataValidade &&
      form.dataValidade < form.dataEmissao
    ) {
      toast.error(
        "A data de validade não pode ser anterior à data de emissão.",
      );
      return;
    }

    if (
      form.statusDocumento === "ATUALIZADO" &&
      !form.urlDocumento &&
      !arquivo
    ) {
      toast.error(
        "Para marcar o documento como atualizado, anexe um arquivo ou mantenha um arquivo já cadastrado.",
      );
      return;
    }

    try {
      setSaving(true);

      const documentoValido: Documento = {
        ...form,
        tipoDocumento: form.tipoDocumento,
        statusDocumento: form.statusDocumento,
        organizacaoId: form.organizacaoId,
        dataValidade:
          form.statusDocumento === "NAO_SE_APLICA" ? "" : form.dataValidade,
        mensagemVencimento:
          form.statusDocumento === "NAO_SE_APLICA"
            ? ""
            : form.mensagemVencimento,
        observacao:
          form.tipoDocumento === TIPO_DOCUMENTO_OUTROS
            ? (form.observacao?.trim() ?? "")
            : "",
      };

      const payload = buildDocumentoPayload(documentoValido);

      if (editando && form.id) {
        await updateDocumento(form.id, payload, arquivo);
        toast.success("Documento atualizado com sucesso.");
      } else {
        await createDocumento(payload, arquivo);
        salvarProximaAcaoDocumento();
        toast.success("Documento cadastrado com sucesso.");
      }

      window.dispatchEvent(new Event("documentos:changed"));
      navigate("/documentos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar documento.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 pb-24 sm:py-8">
        <BackButton to="/documentos" />

        <PageTitle
          title={
            visualizando ? "Documentos" : editando ? "Documentos" : "Documentos"
          }
          tooltip="Nesta página são cadastrados e acompanhados os documentos da organização, com informações sobre tipo, vínculo institucional, órgão emissor, datas de emissão e validade, situação e arquivo. Esses dados ajudam a manter a documentação institucional organizada e podem ser utilizados em projetos, editais, relatórios e outras áreas do sistema."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/documentos")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <div className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={IdCard}
              title="Identificação do documento"
              description="Informe qual documento está sendo cadastrado."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="tipo"
                    required
                    tooltip="Informe o tipo correspondente ao documento que está sendo cadastrado."
                  >
                    Tipo de Documento
                  </FieldLabel>

                  <FormSearchableSelect
                    id="tipo"
                    value={form.tipoDocumento}
                    options={tipoOptions.map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    onChange={(value) =>
                      handleTipoDocumentoChange(value as TipoDocumento)
                    }
                    placeholder="Selecione"
                    searchPlaceholder="Buscar tipo de documento..."
                    emptyMessage="Nenhum tipo de documento encontrado."
                    disabled={bloqueado}
                  />
                </Field>

                {mostrarObservacao && (
                  <Field full>
                    <FieldLabel
                      htmlFor="observacao"
                      required
                      tooltip="Informe qual documento está sendo cadastrado quando a opção Outros for selecionada no campo Tipo de documento."
                    >
                      Observação
                    </FieldLabel>

                    <Textarea
                      id="observacao"
                      value={form.observacao ?? ""}
                      onChange={(event) =>
                        !visualizando &&
                        update({ observacao: event.target.value })
                      }
                      placeholder="Ex.: Alvará, declaração, autorização, certificado ou outro documento específico."
                      className="min-h-24 resize-y"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>
                )}
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Landmark}
              title="Vínculo institucional"
              description="Informe a organização à qual o documento está vinculado."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="organizacao"
                    required
                    tooltip="Informe a organização responsável pelo documento ou à qual ele se refere diretamente."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={
                      form.organizacaoId !== null &&
                      form.organizacaoId !== undefined
                        ? String(form.organizacaoId)
                        : undefined
                    }
                    onValueChange={handleOrgChange}
                    disabled={bloqueado || organizacoes.length === 0}
                  >
                    <SelectTrigger id="organizacao">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {organizacoes.length === 0 ? (
                        <SelectItem value="sem-organizacoes" disabled>
                          Nenhuma organização cadastrada
                        </SelectItem>
                      ) : (
                        organizacoes.map((organizacao) => (
                          <SelectItem
                            key={organizacao.id}
                            value={String(organizacao.id)}
                          >
                            {organizacao.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={CalendarClock}
              title="Datas e validade"
              description="Informe o órgão responsável pela emissão, as datas do documento e sua situação atual, quando aplicável."
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="orgaoEmissor"
                      tooltip="Informe o órgão, entidade ou instituição responsável pela emissão do documento, quando houver."
                    >
                      Órgão Emissor
                    </FieldLabel>

                    <Input
                      id="orgaoEmissor"
                      value={form.orgaoEmissor ?? ""}
                      onChange={(event) =>
                        !visualizando &&
                        update({ orgaoEmissor: event.target.value })
                      }
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataEmissao"
                      tooltip="Informe a data em que o documento foi emitido ou expedido pelo órgão responsável, quando houver."
                    >
                      Data de Emissão
                    </FieldLabel>

                    <Input
                      id="dataEmissao"
                      type="date"
                      value={form.dataEmissao}
                      onChange={(event) =>
                        !visualizando &&
                        update({ dataEmissao: event.target.value })
                      }
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="status"
                      required
                      tooltip="Informe a situação atual do documento, considerando sua validade, análise ou necessidade de atualização."
                    >
                      Situação do Documento
                    </FieldLabel>

                    <Select
                      value={form.statusDocumento || undefined}
                      onValueChange={handleStatusDocumentoChange}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {statusOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataValidade"
                      tooltip="Informe a data até a qual o documento é válido. Caso o documento não possua prazo de validade, selecione “Não se aplica” em Situação do documento."
                    >
                      Data de Validade
                    </FieldLabel>

                    <Input
                      id="dataValidade"
                      type="date"
                      value={validadeNaoSeAplica ? "" : form.dataValidade}
                      onChange={(event) =>
                        !visualizando &&
                        !validadeNaoSeAplica &&
                        update({ dataValidade: event.target.value })
                      }
                      disabled={dataValidadeBloqueada}
                      readOnly={visualizando}
                    />

                    {validadeNaoSeAplica && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        A data de validade não é necessária quando a situação do
                        documento for Não se aplica.
                      </p>
                    )}
                  </Field>
                </div>

                {docVencido &&
                  form.statusDocumento !== "VENCIDO" &&
                  form.statusDocumento !== "NAO_SE_APLICA" && (
                    <div className="flex items-start gap-2.5 rounded-[12px] border border-destructive/35 bg-gradient-to-br from-destructive/15 via-destructive/10 to-background/45 px-3.5 py-2.5 text-xs shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.20),inset_0_1px_0_hsl(0_0%_100%_/_0.48)] backdrop-blur-md supports-[backdrop-filter]:bg-destructive/10">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />

                      <div className="flex-1">
                        <p className="font-medium text-destructive">
                          Este documento está vencido. Atualize o arquivo,
                          revise a data de validade e salve novamente.
                        </p>

                        {!visualizando && (
                          <button
                            type="button"
                            onClick={() =>
                              update({ statusDocumento: "VENCIDO" })
                            }
                            className="mt-1 text-destructive underline hover:no-underline"
                          >
                            Marcar como vencido
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {form.mensagemVencimento && (
                  <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {form.mensagemVencimento}
                  </div>
                )}
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Paperclip}
              title="Arquivo do documento"
              description="Anexe uma cópia digital do documento cadastrado, quando disponível."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="arquivo"
                    tooltip="Anexe uma cópia digital legível do documento correspondente ao cadastro. São aceitos arquivos em PDF ou imagem."
                  >
                    Arquivo do Documento
                  </FieldLabel>

                  {arquivoNome ? (
                    <div className="attachment-file-glass flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

                        <span className="truncate text-sm text-foreground">
                          {arquivoNome}
                        </span>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        {form.urlDocumento && visualizando && (
                          <button
                            type="button"
                            onClick={handleAbrirArquivo}
                            className="inline-flex h-7 items-center px-2 text-xs text-primary hover:underline"
                          >
                            Abrir
                          </button>
                        )}

                        {!visualizando && (
                          <>
                            <Button
                              type="button"
                              variant="glassSecondary"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Substituir
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={removeFile}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : !visualizando ? (
                    <Button
                      type="button"
                      variant="glassSecondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 gap-2 px-4"
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar arquivo
                    </Button>
                  ) : (
                    <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Nenhum arquivo anexado.
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    id="arquivo"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFile}
                    disabled={visualizando}
                  />

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    PDF, PNG, JPG, JPEG ou WEBP. Tamanho máximo: 10 MB.
                  </p>
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>
        </div>

        <WikiFloatingButton
          pageTitle="Documentos"
          href="/wiki/institucional/documentos"
        />

        {!visualizando && (
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/documentos")}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="glassPrimary"
              onClick={handleSave}
              className="h-9 px-5"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
        {visualizando && (
          <div className="flex pt-2 sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/documentos")}
            >
              Voltar
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Field({
  children,
  full,
  className = "",
}: {
  children: ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className}`}>
      {children}
    </div>
  );
}

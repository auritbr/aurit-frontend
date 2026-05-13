import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Upload,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { FieldLabel } from "@/components/FieldLabel";
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

const DOCUMENTO_NEXT_STEP_KEY = "aurit:documentos:next-step-card";
const MAX_FILE_MB = 10;

interface DocumentoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

type DocumentoFormState = Omit<Documento, "tipoDocumento" | "statusDocumento"> & {
  tipoDocumento: TipoDocumento | "";
  statusDocumento: StatusDocumento | "";
};

const tipoOptions = Object.entries(tipoDocumentoLabels) as [
  TipoDocumento,
  string,
][];

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
    vencido: false,
    mensagemVencimento: "",
    removerArquivo: false,
  };
}

function salvarProximaAcaoDocumento() {
  const card: DocumentoNextStepCardData = {
    titulo: "Após organizar os Documentos, cadastre os Agentes Culturais",
    descricao:
      "O cadastro de agentes culturais ajuda a identificar quem representa iniciativas, projetos ou ações culturais no sistema, facilitando vínculos com editais, propostas, documentos e prestações de contas.",
    acaoLabel: "Cadastrar agentes",
    acaoUrl: "/agentes/novo",
    acaoSecundariaLabel: "Ver documentos",
    acaoSecundariaUrl: "/documentos",
    variante: "pendente",
  };

  sessionStorage.setItem(DOCUMENTO_NEXT_STEP_KEY, JSON.stringify(card));
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
          removerArquivo: false,
        });

        if (documento.urlDocumento) {
          setArquivoNome(getNomeArquivoDocumento(documento.urlDocumento));
        } else {
          setArquivoNome("");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar documento.",
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
      toast.error("A data de validade não pode ser anterior à data de emissão.");
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

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando documento...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 pb-24 sm:py-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/documentos")}
          className="mb-4 -ml-2 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <PageTitle
          title="Documento"
          tooltip="Cadastre e acompanhe os documentos da organização, controlando arquivos, datas de emissão, prazos de validade e situação atual de cada documento."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu {" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Cadastre os documentos da organização e acompanhe sua situação.
          Documentos vencidos, pendentes, incompletos ou desatualizados podem
          comprometer inscrições em editais, habilitações, contratos, relatórios
          e prestações de contas.
        </div>

        {!visualizando && <FormLegend />}

        <section className="mb-5 rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Identificação do Documento
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div>
              <FieldLabel
                htmlFor="tipo"
                required
                tooltip="Selecione o tipo de documento que será cadastrado ou acompanhado pela organização. Ex.: Estatuto, Ata de Eleição, CNPJ, Certidão Negativa, Comprovante de Endereço ou Portfólio Institucional."
              >
                Tipo de Documento
              </FieldLabel>

              <Select
                value={form.tipoDocumento || undefined}
                onValueChange={(value) =>
                  !visualizando &&
                  update({ tipoDocumento: value as TipoDocumento })
                }
                disabled={bloqueado}
              >
                <SelectTrigger id="tipo" className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent className="max-h-72">
                  {tipoOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel
                htmlFor="status"
                required
                tooltip="Indique a situação atual do documento. Use para acompanhar se ele está atualizado, vencido, pendente, em análise ou precisa de revisão."
              >
                Status do Documento
              </FieldLabel>

              <Select
                value={form.statusDocumento || undefined}
                onValueChange={(value) =>
                  !visualizando &&
                  update({ statusDocumento: value as StatusDocumento })
                }
                disabled={bloqueado}
              >
                <SelectTrigger id="status" className="h-9">
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
            </div>
          </div>
        </section>

        <section className="mb-5 rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Emissão e Validade
            </h2>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="dataEmissao">Data de Emissão</FieldLabel>

                <Input
                  id="dataEmissao"
                  type="date"
                  value={form.dataEmissao}
                  onChange={(event) =>
                    !visualizando &&
                    update({ dataEmissao: event.target.value })
                  }
                  className="h-9"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>

              <div>
                <FieldLabel htmlFor="dataValidade">
                  Data de Validade
                </FieldLabel>

                <Input
                  id="dataValidade"
                  type="date"
                  value={form.dataValidade}
                  onChange={(event) =>
                    !visualizando &&
                    update({ dataValidade: event.target.value })
                  }
                  className="h-9"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </div>
            </div>

            {docVencido &&
              form.statusDocumento !== "VENCIDO" &&
              form.statusDocumento !== "NAO_SE_APLICA" && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />

                  <div className="flex-1">
                    <p className="font-medium text-destructive">
                      Este documento está vencido pela data de validade
                      informada.
                    </p>

                    {!visualizando && (
                      <button
                        type="button"
                        onClick={() => update({ statusDocumento: "VENCIDO" })}
                        className="mt-1 text-destructive underline hover:no-underline"
                      >
                        Marcar status como vencido
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
        </section>

        <section className="mb-5 rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Arquivo e Origem do Documento
            </h2>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div>
              <FieldLabel
                htmlFor="arquivo"
                tooltip="Anexe o arquivo digital do documento, preferencialmente em PDF ou imagem, conforme os formatos aceitos pelo sistema."
              >
                Arquivo do Documento
              </FieldLabel>

              {arquivoNome ? (
                <div className="flex items-center justify-between gap-2 rounded border border-border bg-muted/30 px-3 py-2">
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
                          variant="ghost"
                          size="sm"
                          className="h-7"
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
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
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
            </div>

            <div>
              <FieldLabel
                htmlFor="orgaoEmissor"
                tooltip="Informe o órgão, entidade ou instituição responsável pela emissão do documento. Ex.: Receita Federal, prefeitura, cartório, secretaria de cultura, associação ou instituição emissora."
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
                className="h-9"
                disabled={bloqueado}
                readOnly={visualizando}
              />
            </div>
          </div>
        </section>

        <section className="mb-5 rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Organização
            </h2>
          </div>

          <div className="p-4 sm:p-5">
            <div>
              <FieldLabel
                htmlFor="organizacao"
                required
                tooltip="Selecione a organização à qual este documento pertence."
              >
                Organização
              </FieldLabel>

              <Select
                value={
                  form.organizacaoId !== null && form.organizacaoId !== undefined
                    ? String(form.organizacaoId)
                    : undefined
                }
                onValueChange={handleOrgChange}
                disabled={bloqueado || organizacoes.length === 0}
              >
                <SelectTrigger id="organizacao" className="h-9">
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
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/documentos")}
            disabled={saving}
          >
            {visualizando ? "Voltar" : "Cancelar"}
          </Button>

          {!visualizando && (
            <Button
              type="button"
              onClick={handleSave}
              className="gap-2"
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Braces,
  Eye,
  FileSignature,
  FileText,
  History,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { FormLegend } from "@/components/FormLegend";
import { FieldLabel } from "@/components/FieldLabel";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DocumentoRichEditor,
  useDocumentoEditor,
} from "@/components/editor/DocumentoRichEditor";
import { VariaveisPanel } from "@/components/editor/VariaveisPanel";
import {
  atualizarModelo,
  buscarModeloPorId,
  criarModelo,
  excluirModelo,
  listarModelos,
  listarTiposDocumento,
  listarVariaveis,
  ModelosDocumentoError,
  type ModeloDocumentoPayload,
  type SituacaoModelo,
} from "@/data/modeloDocumento";

const inputClass =
  "h-9 rounded-[11px] border-border/70 bg-background/60 text-sm";

const AVISO_TIPO =
  "Selecione o tipo de documento para ver as variáveis compatíveis.";

export default function ModeloDocumentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeloBaseParam = !id ? searchParams.get("modeloBase") : null;
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [tituloDocumento, setTituloDocumento] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [situacao, setSituacao] = useState<SituacaoModelo>("ATIVO");
  const [versaoAtual, setVersaoAtual] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [modeloInicialId, setModeloInicialId] = useState("BRANCO");
  const [modeloOrigemId, setModeloOrigemId] = useState<number | null>(null);

  const editor = useDocumentoEditor(conteudo, setConteudo);

  const { data: tipos = [] } = useQuery({
    queryKey: ["modelos-documento", "tipos"],
    queryFn: listarTiposDocumento,
  });

  const { data: variaveis = [], isLoading: carregandoVariaveis } = useQuery({
    queryKey: ["modelos-documento", "variaveis", tipoDocumento],
    queryFn: () => listarVariaveis(tipoDocumento),
    enabled: !!tipoDocumento,
  });

  const { data: modelo } = useQuery({
    queryKey: ["modelos-documento", id],
    queryFn: () => buscarModeloPorId(id!),
    enabled: isEdit,
  });

  const { data: modelosDisponiveis = [] } = useQuery({
    queryKey: ["modelos-documento"],
    queryFn: listarModelos,
    enabled: !isEdit,
  });

  const { data: modeloBase, isLoading: carregandoModeloBase } = useQuery({
    queryKey: ["modelos-documento", "base", modeloBaseParam],
    queryFn: () => buscarModeloPorId(modeloBaseParam!),
    enabled: !isEdit && !!modeloBaseParam,
  });

  const modelosAuritCompativeis = useMemo(
    () =>
      modelosDisponiveis.filter(
        (item) =>
          item.origem === "AURIT" &&
          item.situacao === "ATIVO" &&
          item.tipoDocumento === tipoDocumento,
      ),
    [modelosDisponiveis, tipoDocumento],
  );

  useEffect(() => {
    if (!modelo) return;
    if (!modelo.editavel) {
      toast.error(
        "Modelos da Aurit são somente para visualização. Use o modelo para criar sua cópia.",
      );
      navigate("/modelos-documento", { replace: true });
      return;
    }
    setNome(modelo.nome ?? "");
    setTipoDocumento(modelo.tipoDocumento ?? "");
    setTituloDocumento(modelo.tituloDocumento ?? "");
    setConteudo(modelo.conteudo ?? "");
    setSituacao(modelo.situacao ?? "ATIVO");
    setVersaoAtual(modelo.versaoAtual ?? null);
  }, [modelo, navigate]);

  const carregarComoBase = (base: typeof modeloBase) => {
    if (!base || base.origem !== "AURIT" || base.situacao !== "ATIVO") {
      toast.error("Este modelo Aurit não está disponível para utilização.");
      return;
    }
    setNome(base.nome ?? "");
    setTipoDocumento(base.tipoDocumento ?? "");
    setTituloDocumento(base.tituloDocumento ?? "");
    setConteudo(base.conteudo ?? "");
    setSituacao("ATIVO");
    setModeloInicialId(String(base.id));
    setModeloOrigemId(base.id);
    setSearchParams({ modeloBase: String(base.id) }, { replace: true });
    toast.success("Modelo carregado.");
  };

  useEffect(() => {
    if (modeloBase) carregarComoBase(modeloBase);
    // O modelo retornado para a URL é carregado apenas uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloBase]);

  const excluirMutation = useMutation({
    mutationFn: () => excluirModelo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos-documento"] });
      toast.success("Modelo apagado.");
      navigate("/modelos-documento", { replace: true });
    },
    onError: (erro) =>
      toast.error(
        erro instanceof ModelosDocumentoError
          ? erro.message
          : "Não foi possível apagar o modelo.",
      ),
  });

  const mutation = useMutation({
    mutationFn: (payload: ModeloDocumentoPayload) =>
      isEdit ? atualizarModelo(id!, payload) : criarModelo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos-documento"] });
      toast.success(
        isEdit
          ? "Modelo de documento atualizado."
          : "Modelo de documento criado com sucesso.",
      );
      navigate("/modelos-documento");
    },
    onError: (erro) =>
      toast.error(
        erro instanceof ModelosDocumentoError
          ? erro.message
          : "Não foi possível salvar o modelo. Tente novamente.",
      ),
  });

  const conteudoVazio = useMemo(
    () => !conteudo.replace(/<[^>]*>/g, "").trim(),
    [conteudo],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !tipoDocumento || !tituloDocumento.trim()) {
      toast.error("Preencha o nome, o tipo e o título do documento.");
      return;
    }
    if (conteudoVazio) {
      toast.error("Escreva o conteúdo do documento antes de salvar.");
      return;
    }
    mutation.mutate({
      nome: nome.trim(),
      tipoDocumento,
      tituloDocumento: tituloDocumento.trim(),
      conteudo,
      situacao,
      modeloOrigemId: isEdit ? undefined : modeloOrigemId,
    });
  };

  const inserirVariavel = (chave: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(chave).run();
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/modelos-documento" />
        <PageTitle
          title={isEdit ? "Layouts de Impressão" : "Layouts de Impressão"}
          tooltip="Nesta página são criados e organizados os modelos utilizados na geração de contratos, termos, declarações e outros documentos da organização. O conteúdo pode ser personalizado e receber informações automáticas já cadastradas na Aurit."
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSectionCard
            icon={FileSignature}
            title="Identificação do modelo"
            description="Informe os dados que identificam este modelo e definem sua utilização no sistema."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel
                  htmlFor="nomeModelo"
                  required
                  tooltip="Informe um nome que permita identificar facilmente este modelo dentro do sistema."
                >
                  Nome do modelo
                </FieldLabel>
                <Input
                  id="nomeModelo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Contrato de colaborador — 2026"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="tipoDocumento"
                  required
                  tooltip="Selecione a finalidade deste modelo, como contrato, termo, declaração ou outro documento disponível."
                >
                  Tipo de documento
                </FieldLabel>
                <Select
                  value={tipoDocumento}
                  onValueChange={(valor) => {
                    setTipoDocumento(valor);
                    setModeloInicialId("BRANCO");
                    setModeloOrigemId(null);
                    setSearchParams({}, { replace: true });
                  }}
                >
                  <SelectTrigger id="tipoDocumento" className={inputClass}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((tipo) => (
                      <SelectItem key={tipo.valor} value={tipo.valor}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isEdit && tipoDocumento && (
                <div className="sm:col-span-2">
                  <FieldLabel
                    htmlFor="modeloInicial"
                    tooltip="Escolha se deseja criar um modelo do zero ou utilizar um modelo disponibilizado pela Aurit como base."
                  >
                    Modelo inicial
                  </FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={modeloInicialId}
                      onValueChange={(valor) => {
                        setModeloInicialId(valor);
                        if (valor === "BRANCO") {
                          setModeloOrigemId(null);
                          setSearchParams({}, { replace: true });
                        }
                      }}
                    >
                      <SelectTrigger id="modeloInicial" className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRANCO">Criar em branco</SelectItem>
                        {modelosAuritCompativeis.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.nome} — modelo Aurit
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {modeloInicialId !== "BRANCO" && (
                      <Button
                        type="button"
                        variant="glassPrimary"
                        className="h-9 shrink-0 px-4"
                        disabled={carregandoModeloBase}
                        onClick={() =>
                          carregarComoBase(
                            modelosAuritCompativeis.find(
                              (item) => String(item.id) === modeloInicialId,
                            ),
                          )
                        }
                      >
                        {carregandoModeloBase
                          ? "Carregando modelo..."
                          : "Usar este modelo"}
                      </Button>
                    )}
                  </div>
                  {modelosAuritCompativeis.length === 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Não há modelo Aurit disponível para este tipo. Você pode
                      criar em branco.
                    </p>
                  )}
                </div>
              )}
              <div>
                <FieldLabel
                  htmlFor="tituloDocumento"
                  required
                  tooltip="Informe o título que será exibido no documento quando ele for gerado."
                >
                  Título do documento
                </FieldLabel>
                <Input
                  id="tituloDocumento"
                  value={tituloDocumento}
                  onChange={(e) => setTituloDocumento(e.target.value)}
                  placeholder="Ex.: Contrato de prestação de serviços"
                  className={inputClass}
                />
              </div>
            </div>
            {isEdit && versaoAtual != null && (
              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <History className="h-3.5 w-3.5" aria-hidden />
                Versão atual: {versaoAtual}
              </p>
            )}
          </FormSectionCard>

          <FormSectionCard
            icon={FileText}
            title="Conteúdo do documento"
            description="Edite o texto que será utilizado na geração do documento. Utilize as ferramentas de formatação e insira informações automáticas da Aurit quando necessário."
          >
            <DocumentoRichEditor
              editor={editor}
              variaveis={variaveis}
              carregandoVariaveis={carregandoVariaveis}
              avisoVariaveis={tipoDocumento ? undefined : AVISO_TIPO}
            />
          </FormSectionCard>

          <FormSectionCard
            icon={Braces}
            title="Variáveis disponíveis"
            description="Use as variáveis para inserir automaticamente informações já cadastradas na Aurit. Ao gerar o documento, elas serão substituídas pelos dados correspondentes."
          >
            <VariaveisPanel
              variaveis={variaveis}
              carregando={carregandoVariaveis}
              aviso={tipoDocumento ? undefined : AVISO_TIPO}
              onInserir={inserirVariavel}
            />
          </FormSectionCard>

          <FormSectionCard
            icon={ToggleLeft}
            title="Situação do modelo"
            description="Defina se este modelo está disponível para utilização na geração de novos documentos."
          >
            <div className="max-w-xs">
              <FieldLabel
                htmlFor="situacaoModelo"
                required
                tooltip="Ativo permite utilizar este modelo na geração de novos documentos. Inativo mantém o modelo e seu histórico registrados, mas impede seu uso em novas gerações."
              >
                Situação do modelo
              </FieldLabel>
              <Select
                value={situacao}
                onValueChange={(v) => setSituacao(v as SituacaoModelo)}
              >
                <SelectTrigger id="situacaoModelo" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSectionCard>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/modelos-documento")}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 gap-2 px-4"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" aria-hidden />
              Visualizar
            </Button>
            <Button
              type="submit"
              variant="glassPrimary"
              className="h-9 px-5"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Salvando..." : "Salvar modelo"}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tituloDocumento || "Prévia do documento"}
            </DialogTitle>
            <DialogDescription>
              Prévia somente leitura do conteúdo do modelo. As variáveis serão
              substituídas pelos dados cadastrados no momento da geração do
              documento.
            </DialogDescription>
          </DialogHeader>
          <div className="documento-folha-area">
            <div className="documento-folha">
              {conteudoVazio ? (
                <p className="text-center text-sm text-muted-foreground">
                  Nenhum conteúdo para visualizar.
                </p>
              ) : (
                <div
                  className="documento-folha-conteudo"
                  dangerouslySetInnerHTML={{ __html: conteudo }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <WikiFloatingButton
        pageTitle="Layouts de Impressão"
        href="/wiki/configuracoes/layouts-de-impressao"
      />
    </AppLayout>
  );
}

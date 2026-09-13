import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CalendarRange,
  Handshake,
  MapPin,
  Paperclip,
  StickyNote,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { EmailInput } from "@/components/EmailInput";
import { PageTitle } from "@/components/PageTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { MultiSelect } from "@/components/MultiSelect";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
  getParceiroById,
  getParceiroDownloadUrl,
  saveParceiro,
  situacaoParceiroOptions,
  tipoParceriaLabel,
  tipoParceriaOptions,
  type ParceiroPayload,
  type StatusParceiro,
  type TipoParceria,
} from "@/data/parceiros";

import {
  enderecoVazio,
  pessoaFisicaVazia,
  pessoaJuridicaVazia,
  tipoPessoaCadastroOptions,
  type EnderecoCadastro,
  type PessoaFisicaCadastro,
  type PessoaJuridicaCadastro,
  type TipoPessoaCadastro,
} from "@/data/pessoaCadastro";

import { estadosBrasil } from "@/data/colaboradores";
import {
  isValidCNPJ,
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskPhone,
  maskRGFlex,
} from "@/lib/masks";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";

const SELECIONE = "__selecione__";

interface FormState {
  tipoPessoa: TipoPessoaCadastro;
  pessoaFisica: PessoaFisicaCadastro;
  pessoaJuridica: PessoaJuridicaCadastro;
  endereco: EnderecoCadastro;
  tipoParcerias: TipoParceria[];
  dataInicioParceria: string;
  dataFimParceria: string;
  descricaoParceria: string;
  contribuicaoParceiro: string;
  contribuicaoOrganizacao: string;
  urlDocumentoParceria: string;
  observacao: string;
  status: StatusParceiro | "";
}

const initial: FormState = {
  tipoPessoa: "PESSOA_FISICA",
  pessoaFisica: pessoaFisicaVazia,
  pessoaJuridica: pessoaJuridicaVazia,
  endereco: enderecoVazio,
  tipoParcerias: [],
  dataInicioParceria: "",
  dataFimParceria: "",
  descricaoParceria: "",
  contribuicaoParceiro: "",
  contribuicaoOrganizacao: "",
  urlDocumentoParceria: "",
  observacao: "",
  status: "",
};

export default function ParceiroForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && !visualizando;

  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(initial);
  const [file, setFile] = useState<File>();
  const [removeFile, setRemoveFile] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const conversionSeed = (
    location.state as { conversionSeed?: { data?: Partial<FormState> } } | null
  )?.conversionSeed;

  useImportFormFill("parceiros", setForm);

  useEffect(() => {
    if (!id) {
      if (conversionSeed?.data) {
        setForm((previous) => ({ ...previous, ...conversionSeed.data }));
      }
      return;
    }

    let active = true;

    getParceiroById(id)
      .then(
        (p) =>
          active &&
          setForm({
            tipoPessoa: p.tipoPessoa,
            pessoaFisica: p.pessoaFisica ?? pessoaFisicaVazia,
            pessoaJuridica: p.pessoaJuridica ?? pessoaJuridicaVazia,
            endereco: p.endereco ?? enderecoVazio,
            tipoParcerias: p.tipoParcerias,
            dataInicioParceria: p.dataInicioParceria,
            dataFimParceria: p.dataFimParceria,
            descricaoParceria: p.descricaoParceria,
            contribuicaoParceiro: p.contribuicaoParceiro,
            contribuicaoOrganizacao: p.contribuicaoOrganizacao,
            urlDocumentoParceria: p.urlDocumentoParceria,
            observacao: p.observacao,
            status: p.status,
          }),
      )
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Erro ao carregar parceiro.",
        );

        navigate("/parceiros");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [conversionSeed?.data, id, navigate]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({
      ...p,
      [k]: v,
    }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      form.tipoPessoa === "PESSOA_FISICA" &&
      !form.pessoaFisica.nomeCompleto.trim()
    ) {
      return toast.error("Informe o nome completo.");
    }

    if (
      form.tipoPessoa === "PESSOA_JURIDICA" &&
      !form.pessoaJuridica.razaoSocial.trim()
    ) {
      return toast.error("Informe a razão social.");
    }

    if (
      form.tipoPessoa === "PESSOA_JURIDICA" &&
      !isValidCNPJ(form.pessoaJuridica.cnpj)
    ) {
      return toast.error("Informe um CNPJ válido.");
    }

    if (!form.tipoParcerias.length) {
      return toast.error("Selecione ao menos um tipo de parceria.");
    }

    if (!form.dataInicioParceria) {
      return toast.error("Informe a data de início.");
    }

    if (!form.status) {
      return toast.error("Selecione a situação da parceria.");
    }

    if (
      form.dataFimParceria &&
      form.dataFimParceria < form.dataInicioParceria
    ) {
      return toast.error("A data final não pode ser anterior à inicial.");
    }

    const payload: ParceiroPayload = {
      ...form,
      status: form.status as StatusParceiro,
      id: isEdit ? id : undefined,
      pessoaFisica:
        form.tipoPessoa === "PESSOA_FISICA" ? form.pessoaFisica : null,
      pessoaJuridica:
        form.tipoPessoa === "PESSOA_JURIDICA" ? form.pessoaJuridica : null,
      documentoFile: file,
      removerDocumentoParceria: removeFile,
    };

    try {
      setSaving(true);

      await saveParceiro(payload);

      if (!isEdit) emitJourneyNextStep();
      toast.success(isEdit ? "Parceiro atualizado." : "Parceiro cadastrado.");

      navigate("/parceiros");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar parceiro.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openFile = async () => {
    if (!id) return;

    try {
      window.open(
        await getParceiroDownloadUrl(id),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir documento.");
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/parceiros" />

        <PageTitle
          title="Parceiros"
          tooltip="Nesta página são cadastrados e acompanhados os parceiros da organização e as parcerias estabelecidas com cada um deles. Os registros ajudam a organizar os compromissos assumidos entre as partes, o período da parceria, as contribuições previstas e os documentos relacionados."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/parceiros")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando parceiro...
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <fieldset
              disabled={visualizando || saving}
              className="m-0 min-w-0 space-y-5 border-0 p-0"
            >
              <ParceiroPessoaFields
                prefix="parceiro"
                {...form}
                onTipoChange={(v) => set("tipoPessoa", v)}
                onPessoaFisicaChange={(v) => set("pessoaFisica", v)}
                onPessoaJuridicaChange={(v) => set("pessoaJuridica", v)}
                onEnderecoChange={(v) => set("endereco", v)}
              />

              <FormSectionCard
                icon={Handshake}
                title="Parceria"
                description="Defina como será a parceria e registre os compromissos assumidos pelo parceiro e pela organização para sua realização."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel
                      htmlFor="tipos"
                      required
                      tooltip="Selecione os tipos que melhor representam esta parceria. Mais de uma opção pode ser selecionada quando diferentes formas de colaboração fizerem parte do acordo."
                    >
                      Tipos de Parceria
                    </FieldLabel>

                    <MultiSelect
                      id="tipos"
                      options={tipoParceriaOptions.map((o) => o.label)}
                      value={form.tipoParcerias.map(tipoParceriaLabel)}
                      onChange={(labels) =>
                        set(
                          "tipoParcerias",
                          labels
                            .map(
                              (label) =>
                                tipoParceriaOptions.find(
                                  (o) => o.label === label,
                                )?.value,
                            )
                            .filter(Boolean) as TipoParceria[],
                        )
                      }
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="descricao"
                      tooltip="Descreva de forma resumida o objetivo da parceria, como ela funcionará e quais ações ou atividades estão previstas."
                    >
                      Descrição da Parceria
                    </FieldLabel>

                    <Textarea
                      id="descricao"
                      rows={3}
                      value={form.descricaoParceria}
                      onChange={(e) => set("descricaoParceria", e.target.value)}
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="cp"
                      tooltip="Descreva o que o parceiro se compromete a oferecer nesta parceria, como recursos financeiros, materiais, serviços, espaços, divulgação, equipe ou outros apoios."
                    >
                      Contribuição do Parceiro
                    </FieldLabel>

                    <Textarea
                      id="cp"
                      rows={3}
                      value={form.contribuicaoParceiro}
                      onChange={(e) =>
                        set("contribuicaoParceiro", e.target.value)
                      }
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="co"
                      tooltip="Descreva o que a organização se compromete a oferecer ou realizar como parte desta parceria, quando houver."
                    >
                      Contribuição da Organização
                    </FieldLabel>

                    <Textarea
                      id="co"
                      rows={3}
                      value={form.contribuicaoOrganizacao}
                      onChange={(e) =>
                        set("contribuicaoOrganizacao", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={CalendarRange}
                title="Vigência"
                description="Defina o período em que a parceria estará válida ou em execução para facilitar seu acompanhamento ao longo do tempo."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="inicio"
                      required
                      tooltip="Informe a data em que a parceria começou ou está prevista para começar."
                    >
                      Data de Início
                    </FieldLabel>

                    <Input
                      id="inicio"
                      type="date"
                      value={form.dataInicioParceria}
                      onChange={(e) =>
                        set("dataInicioParceria", e.target.value)
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="fim"
                      tooltip="Informe a data prevista ou definida para o encerramento da parceria. Se não houver uma data de término estabelecida, deixe este campo em branco."
                    >
                      Data de Fim
                    </FieldLabel>

                    <Input
                      id="fim"
                      type="date"
                      value={form.dataFimParceria}
                      onChange={(e) => set("dataFimParceria", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Paperclip}
                title="Documento da parceria"
                description="Mantenha anexado, quando houver, o documento que formaliza ou registra os compromissos estabelecidos nesta parceria."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel tooltip="Anexe o documento relacionado à parceria, como termo de parceria, acordo, convênio, contrato, carta de compromisso ou outro documento que formalize a relação entre as partes.">
                      Documento da Parceria
                    </FieldLabel>

                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];

                        if (f) {
                          setFile(f);
                          setRemoveFile(false);
                        }
                      }}
                    />

                    {file || form.urlDocumentoParceria ? (
                      <div className="attachment-file-glass mt-2 flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-4 w-4 flex-shrink-0 text-primary" />

                          <span className="truncate text-sm">
                            {file?.name || "Documento anexado"}
                          </span>
                        </div>

                        <div className="flex flex-shrink-0 gap-2">
                          {visualizando && (
                            <Button
                              type="button"
                              variant="glassSecondary"
                              className="h-8"
                              onClick={() => void openFile()}
                            >
                              Abrir
                            </Button>
                          )}

                          {!visualizando && (
                            <>
                              <Button
                                type="button"
                                variant="glassSecondary"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => fileRef.current?.click()}
                              >
                                Substituir
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setFile(undefined);
                                  set("urlDocumentoParceria", "");
                                  setRemoveFile(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      !visualizando && (
                        <Button
                          type="button"
                          variant="glassSecondary"
                          className="mt-2 h-9 gap-2 px-4"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          Selecionar arquivo
                        </Button>
                      )
                    )}

                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Formatos aceitos: PDF, PNG, JPG, JPEG ou WEBP.
                    </p>
                  </Field>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={StickyNote}
                title="Situação e observações"
                description="Mantenha atualizado o andamento da parceria e registre informações complementares importantes para seu acompanhamento."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="status"
                      required
                      tooltip="Selecione a situação atual da parceria para indicar se ela está em andamento, foi encerrada ou se encontra em outra condição disponível no cadastro."
                    >
                      Situação da Parceria
                    </FieldLabel>

                    <Select
                      value={form.status || SELECIONE}
                      onValueChange={(v) =>
                        set(
                          "status",
                          v === SELECIONE ? "" : (v as StatusParceiro),
                        )
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SELECIONE}>Selecione</SelectItem>
                        {situacaoParceiroOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="obs"
                      tooltip="Registre informações importantes sobre a parceria que não possuem um campo próprio, como acordos adicionais, alterações, condições especiais ou informações úteis para seu acompanhamento."
                    >
                      Observações
                    </FieldLabel>

                    <Textarea
                      id="obs"
                      rows={3}
                      value={form.observacao}
                      onChange={(e) => set("observacao", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSectionCard>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/parceiros")}
                disabled={saving}
              >
                {visualizando ? "Voltar" : "Cancelar"}
              </Button>

              {!visualizando && (
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 px-5"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      <WikiFloatingButton
        pageTitle="Parceiros"
        href="/wiki/financeiro/parceiros"
      />
    </AppLayout>
  );
}

function ParceiroPessoaFields({
  prefix,
  tipoPessoa,
  pessoaFisica,
  pessoaJuridica,
  endereco,
  onTipoChange,
  onPessoaFisicaChange,
  onPessoaJuridicaChange,
  onEnderecoChange,
}: {
  prefix: string;
  tipoPessoa: TipoPessoaCadastro;
  pessoaFisica: PessoaFisicaCadastro;
  pessoaJuridica: PessoaJuridicaCadastro;
  endereco: EnderecoCadastro;
  onTipoChange: (v: TipoPessoaCadastro) => void;
  onPessoaFisicaChange: (v: PessoaFisicaCadastro) => void;
  onPessoaJuridicaChange: (v: PessoaJuridicaCadastro) => void;
  onEnderecoChange: (v: EnderecoCadastro) => void;
}) {
  const [cepLoading, setCepLoading] = useState(false);

  const pf = <K extends keyof PessoaFisicaCadastro>(
    key: K,
    value: PessoaFisicaCadastro[K],
  ) =>
    onPessoaFisicaChange({
      ...pessoaFisica,
      [key]: value,
    });

  const pj = <K extends keyof PessoaJuridicaCadastro>(
    key: K,
    value: PessoaJuridicaCadastro[K],
  ) =>
    onPessoaJuridicaChange({
      ...pessoaJuridica,
      [key]: value,
    });

  const end = <K extends keyof EnderecoCadastro>(
    key: K,
    value: EnderecoCadastro[K],
  ) =>
    onEnderecoChange({
      ...endereco,
      [key]: value,
    });

  const buscarCep = async (value: string) => {
    const cep = value.replace(/\D/g, "");

    if (cep.length !== 8 || cepLoading) return;

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

      if (!response.ok) {
        throw new Error();
      }

      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        return toast.error("CEP não encontrado.");
      }

      onEnderecoChange({
        ...endereco,
        cep: maskCEP(cep),
        logradouro: data.logradouro ?? "",
        complemento: endereco.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: parceiroEstado(data.uf ?? "") || endereco.estado,
      });
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <>
      <FormSectionCard
        icon={tipoPessoa === "PESSOA_FISICA" ? UserRound : Building2}
        title="Identificação"
        description="Identifique a pessoa ou instituição com a qual a organização mantém ou pretende estabelecer uma parceria."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel
              htmlFor={`${prefix}-tipo`}
              required
              tooltip="Selecione se o parceiro é uma pessoa física ou uma pessoa jurídica. A escolha define quais dados de identificação serão solicitados no cadastro."
            >
              Tipo de Pessoa
            </FieldLabel>

            <Select
              value={tipoPessoa}
              onValueChange={(v) => onTipoChange(v as TipoPessoaCadastro)}
            >
              <SelectTrigger id={`${prefix}-tipo`}>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {tipoPessoaCadastroOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {tipoPessoa === "PESSOA_FISICA" ? (
            <>
              <Field>
                <ParceiroField
                  id={`${prefix}-nome`}
                  label="Nome Completo"
                  required
                  value={pessoaFisica.nomeCompleto}
                  onChange={(v) => pf("nomeCompleto", v)}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-nascimento`}
                  label="Data de Nascimento"
                  type="date"
                  value={pessoaFisica.dataNascimento}
                  onChange={(v) => pf("dataNascimento", v)}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-cpf`}
                  label="CPF"
                  required
                  value={maskCPF(pessoaFisica.cpf)}
                  onChange={(v) => pf("cpf", maskCPF(v))}
                  maxLength={14}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-rg`}
                  label="RG"
                  value={maskRGFlex(pessoaFisica.rg)}
                  onChange={(v) => pf("rg", maskRGFlex(v))}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-telefone`}
                  label="Telefone"
                  value={pessoaFisica.telefone}
                  onChange={(v) => pf("telefone", maskPhone(v))}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`${prefix}-email`}>E-mail</FieldLabel>

                <EmailInput
                  id={`${prefix}-email`}
                  value={pessoaFisica.email}
                  onValueChange={(v) => pf("email", v)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field>
                <ParceiroField
                  id={`${prefix}-razao`}
                  label="Razão Social"
                  required
                  value={pessoaJuridica.razaoSocial}
                  onChange={(v) => pj("razaoSocial", v)}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-fantasia`}
                  label="Nome Fantasia"
                  value={pessoaJuridica.nomeFantasia}
                  onChange={(v) => pj("nomeFantasia", v)}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-cnpj`}
                  label="CNPJ"
                  required
                  value={maskCNPJ(pessoaJuridica.cnpj)}
                  onChange={(v) => pj("cnpj", maskCNPJ(v))}
                  maxLength={18}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-fundacao`}
                  label="Data de Fundação"
                  type="date"
                  value={pessoaJuridica.dataFundacao}
                  onChange={(v) => pj("dataFundacao", v)}
                />
              </Field>

              <Field>
                <ParceiroField
                  id={`${prefix}-telefone`}
                  label="Telefone"
                  value={pessoaJuridica.telefone}
                  onChange={(v) => pj("telefone", maskPhone(v))}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`${prefix}-email`}>E-mail</FieldLabel>

                <EmailInput
                  id={`${prefix}-email`}
                  value={pessoaJuridica.email}
                  onValueChange={(v) => pj("email", v)}
                />
              </Field>
            </>
          )}
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={MapPin}
        title="Endereço"
        description="Informe o endereço principal do parceiro. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente."
      >
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor={`${prefix}-cep`} required>
              CEP
            </FieldLabel>

            <Input
              id={`${prefix}-cep`}
              value={maskCEP(endereco.cep)}
              maxLength={9}
              onChange={(e) => {
                const v = maskCEP(e.target.value);

                end("cep", v);

                if (v.replace(/\D/g, "").length === 8) {
                  void buscarCep(v);
                }
              }}
            />

            {cepLoading && (
              <p className="mt-1 text-xs text-muted-foreground">
                Buscando endereço...
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <ParceiroField
              id={`${prefix}-logradouro`}
              label="Logradouro"
              required
              value={endereco.logradouro}
              onChange={(v) => end("logradouro", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <ParceiroField
              id={`${prefix}-numero`}
              label="Número"
              required
              value={endereco.numero}
              onChange={(v) => end("numero", v)}
            />
          </div>

          <div className="sm:col-span-4">
            <ParceiroField
              id={`${prefix}-complemento`}
              label="Complemento"
              value={endereco.complemento}
              onChange={(v) => end("complemento", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <ParceiroField
              id={`${prefix}-bairro`}
              label="Bairro"
              required
              value={endereco.bairro}
              onChange={(v) => end("bairro", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <ParceiroField
              id={`${prefix}-cidade`}
              label="Cidade"
              required
              value={endereco.cidade}
              onChange={(v) => end("cidade", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor={`${prefix}-estado`} required>
              Estado
            </FieldLabel>

            <Select
              value={parceiroEstado(endereco.estado)}
              onValueChange={(v) => end("estado", v)}
            >
              <SelectTrigger id={`${prefix}-estado`}>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {estadosBrasil.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSectionCard>
    </>
  );
}

const parceiroUfs: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const parceiroEstado = (value: string) =>
  estadosBrasil.find(
    (e) =>
      e
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase() ===
      (parceiroUfs[value.toUpperCase()] ?? value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
  ) ?? "";

function ParceiroField({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  maxLength,
  placeholder,
  tooltip,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  tooltip?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FieldLabel>

      <Input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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

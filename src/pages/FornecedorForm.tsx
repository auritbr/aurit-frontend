import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  MapPin,
  PackageSearch,
  StickyNote,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { EmailInput } from "@/components/EmailInput";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ImportDataButton } from "@/components/ImportDataButton";
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
  fornecedorTooltip,
  getFornecedorById,
  saveFornecedor,
  situacaoFornecedorOptions,
  tipoFornecedorOptions,
  type StatusFornecedor,
  type TipoFornecedor,
} from "@/data/fornecedores";
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
import { maskCEP, maskCNPJ, maskCPF, maskPhone, maskRGFlex } from "@/lib/masks";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";

const SELECIONE = "__selecione__";

interface FormState {
  tipoPessoa: TipoPessoaCadastro;
  pessoaFisica: PessoaFisicaCadastro;
  pessoaJuridica: PessoaJuridicaCadastro;
  endereco: EnderecoCadastro;
  tipoFornecedor: TipoFornecedor | "";
  status: StatusFornecedor | "";
  observacao: string;
}
const initial: FormState = {
  tipoPessoa: "PESSOA_FISICA",
  pessoaFisica: pessoaFisicaVazia,
  pessoaJuridica: pessoaJuridicaVazia,
  endereco: enderecoVazio,
  tipoFornecedor: "",
  status: "",
  observacao: "",
};

export default function FornecedorForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isView = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && !isView;
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useImportFormFill("fornecedores", setForm);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getFornecedorById(id)
      .then((f) => {
        if (active)
          setForm({
            tipoPessoa: f.tipoPessoa,
            pessoaFisica: f.pessoaFisica ?? pessoaFisicaVazia,
            pessoaJuridica: f.pessoaJuridica ?? pessoaJuridicaVazia,
            endereco: f.endereco ?? enderecoVazio,
            tipoFornecedor: f.tipoFornecedor,
            status: f.status,
            observacao: f.observacao,
          });
      })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Erro ao carregar fornecedor.",
        );
        navigate("/fornecedores");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

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

    if (!form.tipoFornecedor) {
      return toast.error("Selecione o tipo de fornecimento.");
    }

    if (!form.status) {
      return toast.error("Selecione a situação do fornecedor.");
    }

    try {
      setSaving(true);
      await saveFornecedor(
        {
          tipoPessoa: form.tipoPessoa,
          pessoaFisica:
            form.tipoPessoa === "PESSOA_FISICA" ? form.pessoaFisica : null,
          pessoaJuridica:
            form.tipoPessoa === "PESSOA_JURIDICA" ? form.pessoaJuridica : null,
          endereco: form.endereco,
          tipoFornecedor: form.tipoFornecedor,
          status: form.status as StatusFornecedor,
          observacao: form.observacao.trim() || null,
        },
        isEdit ? id : undefined,
      );
      if (!isEdit) emitJourneyNextStep();
      toast.success(
        isEdit ? "Fornecedor atualizado." : "Fornecedor cadastrado.",
      );
      navigate("/fornecedores");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar fornecedor.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton />
        <header className="mb-5 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              {isView
                ? "Fornecedores"
                : isEdit
                  ? "Fornecedores"
                  : "Fornecedores"}
            </h1>
            <HelpTooltip
              text={fornecedorTooltip}
              label="Fornecedores"
              size="md"
              side="bottom"
              align="start"
            />
          </div>
          {!isView && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ImportDataButton
                config={getImportConfigForPath("/fornecedores")!}
                canFillForm
                variant="glassSecondary"
              />
            </div>
          )}
        </header>
        <FormLegend />
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando fornecedor...
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <fieldset
              disabled={isView || saving}
              className="m-0 min-w-0 space-y-5 border-0 p-0"
            >
              <FornecedorPessoaFields form={form} set={set} />
              <FormSectionCard
                icon={PackageSearch}
                title="Tipo de fornecimento"
                description="Informe a principal categoria de produto ou serviço oferecido pelo fornecedor."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel
                      htmlFor="tipoFornecedor"
                      required
                      tooltip="Selecione a categoria que melhor representa o principal tipo de produto ou serviço fornecido à organização."
                    >
                      Tipo de Fornecimento
                    </FieldLabel>

                    <Select
                      value={form.tipoFornecedor}
                      onValueChange={(v) =>
                        set("tipoFornecedor", v as TipoFornecedor)
                      }
                    >
                      <SelectTrigger id="tipoFornecedor">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {tipoFornecedorOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={StickyNote}
                title="Situação e observações"
                description="Informe a situação atual do fornecedor e registre informações importantes para seu acompanhamento."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel
                      htmlFor="status"
                      required
                      tooltip="Selecione a situação atual do fornecedor. Ativo indica que o cadastro pode continuar sendo utilizado normalmente; Inativo mantém as informações registradas, mas indica que o fornecedor não está ativo no momento."
                    >
                      Situação do Fornecedor
                    </FieldLabel>

                    <Select
                      value={form.status || SELECIONE}
                      onValueChange={(v) =>
                        set(
                          "status",
                          v === SELECIONE ? "" : (v as StatusFornecedor),
                        )
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SELECIONE}>Selecione</SelectItem>
                        {situacaoFornecedorOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="observacao"
                      tooltip="Registre informações importantes sobre o fornecedor, como condições de atendimento, tipos de serviço prestados, orientações ou outros detalhes úteis para seu acompanhamento."
                    >
                      Observações
                    </FieldLabel>

                    <Textarea
                      id="observacao"
                      rows={4}
                      value={form.observacao}
                      onChange={(e) => set("observacao", e.target.value)}
                    />
                  </div>
                </div>
              </FormSectionCard>
            </fieldset>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/fornecedores")}
                disabled={saving}
              >
                {isView ? "Voltar" : "Cancelar"}
              </Button>
              {!isView && (
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
        pageTitle="Fornecedores"
        href="/wiki/financeiro/fornecedores"
      />
    </AppLayout>
  );
}

function FornecedorPessoaFields({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const pf = <K extends keyof PessoaFisicaCadastro>(
    key: K,
    value: PessoaFisicaCadastro[K],
  ) => set("pessoaFisica", { ...form.pessoaFisica, [key]: value });
  const pj = <K extends keyof PessoaJuridicaCadastro>(
    key: K,
    value: PessoaJuridicaCadastro[K],
  ) => set("pessoaJuridica", { ...form.pessoaJuridica, [key]: value });
  const end = <K extends keyof EnderecoCadastro>(
    key: K,
    value: EnderecoCadastro[K],
  ) => set("endereco", { ...form.endereco, [key]: value });
  const buscarCep = async (value: string) => {
    const cep = value.replace(/\D/g, "");
    if (cep.length !== 8 || cepLoading) return;
    try {
      setCepLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) return toast.error("CEP não encontrado.");
      set("endereco", {
        ...form.endereco,
        cep: maskCEP(cep),
        logradouro: data.logradouro ?? "",
        complemento: form.endereco.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: estadoNome(data.uf ?? "") || form.endereco.estado,
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
        icon={form.tipoPessoa === "PESSOA_FISICA" ? UserRound : Building2}
        title="Identificação"
        description="Registre as informações necessárias para identificar corretamente a pessoa ou instituição fornecedora e manter seu cadastro individualizado na organização."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor="fornecedor-tipo"
              required
              tooltip="Selecione se o fornecedor é uma pessoa física ou uma pessoa jurídica. A escolha define quais dados de identificação serão solicitados no cadastro."
            >
              Tipo de Pessoa
            </FieldLabel>

            <Select
              value={form.tipoPessoa}
              onValueChange={(v) => set("tipoPessoa", v as TipoPessoaCadastro)}
            >
              <SelectTrigger id="fornecedor-tipo">
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
          </div>

          {form.tipoPessoa === "PESSOA_FISICA" ? (
            <>
              <CadastroField
                id="fornecedor-nome"
                label="Nome Completo"
                required
                value={form.pessoaFisica.nomeCompleto}
                onChange={(v) => pf("nomeCompleto", v)}
              />

              <CadastroField
                id="fornecedor-nascimento"
                label="Data de Nascimento"
                type="date"
                value={form.pessoaFisica.dataNascimento}
                onChange={(v) => pf("dataNascimento", v)}
              />

              <CadastroField
                id="fornecedor-cpf"
                label="CPF"
                required
                value={maskCPF(form.pessoaFisica.cpf)}
                onChange={(v) => pf("cpf", maskCPF(v))}
                maxLength={14}
              />

              <CadastroField
                id="fornecedor-rg"
                label="RG"
                value={maskRGFlex(form.pessoaFisica.rg)}
                onChange={(v) => pf("rg", maskRGFlex(v))}
              />

              <CadastroField
                id="fornecedor-telefone"
                label="Telefone"
                value={form.pessoaFisica.telefone}
                onChange={(v) => pf("telefone", maskPhone(v))}
              />

              <div>
                <FieldLabel
                  htmlFor="fornecedor-email"
                  tooltip="Informe um endereço de e-mail que possa ser utilizado pela organização para entrar em contato com o fornecedor."
                >
                  E-mail
                </FieldLabel>

                <EmailInput
                  id="fornecedor-email"
                  value={form.pessoaFisica.email}
                  onValueChange={(v) => pf("email", v)}
                />
              </div>
            </>
          ) : (
            <>
              <CadastroField
                id="fornecedor-razao"
                label="Razão Social"
                required
                value={form.pessoaJuridica.razaoSocial}
                onChange={(v) => pj("razaoSocial", v)}
              />

              <CadastroField
                id="fornecedor-fantasia"
                label="Nome Fantasia"
                value={form.pessoaJuridica.nomeFantasia}
                onChange={(v) => pj("nomeFantasia", v)}
              />

              <CadastroField
                id="fornecedor-cnpj"
                label="CNPJ"
                required
                value={maskCNPJ(form.pessoaJuridica.cnpj)}
                onChange={(v) => pj("cnpj", maskCNPJ(v))}
                maxLength={18}
              />

              <CadastroField
                id="fornecedor-fundacao"
                label="Data de Fundação"
                type="date"
                value={form.pessoaJuridica.dataFundacao}
                onChange={(v) => pj("dataFundacao", v)}
              />

              <CadastroField
                id="fornecedor-telefone"
                label="Telefone"
                value={form.pessoaJuridica.telefone}
                onChange={(v) => pj("telefone", maskPhone(v))}
              />

              <div>
                <FieldLabel
                  htmlFor="fornecedor-email"
                  tooltip="Informe um endereço de e-mail que possa ser utilizado pela organização para entrar em contato com o fornecedor."
                >
                  E-mail
                </FieldLabel>

                <EmailInput
                  id="fornecedor-email"
                  value={form.pessoaJuridica.email}
                  onValueChange={(v) => pj("email", v)}
                />
              </div>
            </>
          )}
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={MapPin}
        title="Endereço"
        description="Informe o endereço principal do fornecedor. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente."
      >
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="fornecedor-cep" required>
              CEP
            </FieldLabel>

            <Input
              id="fornecedor-cep"
              value={maskCEP(form.endereco.cep)}
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
            <CadastroField
              id="fornecedor-logradouro"
              label="Logradouro"
              required
              value={form.endereco.logradouro}
              onChange={(v) => end("logradouro", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <CadastroField
              id="fornecedor-numero"
              label="Número"
              required
              value={form.endereco.numero}
              onChange={(v) => end("numero", v)}
            />
          </div>

          <div className="sm:col-span-4">
            <CadastroField
              id="fornecedor-complemento"
              label="Complemento"
              value={form.endereco.complemento}
              onChange={(v) => end("complemento", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <CadastroField
              id="fornecedor-bairro"
              label="Bairro"
              required
              value={form.endereco.bairro}
              onChange={(v) => end("bairro", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <CadastroField
              id="fornecedor-cidade"
              label="Cidade"
              required
              value={form.endereco.cidade}
              onChange={(v) => end("cidade", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="fornecedor-estado" required>
              Estado
            </FieldLabel>

            <Select
              value={estadoNome(form.endereco.estado)}
              onValueChange={(v) => end("estado", v)}
            >
              <SelectTrigger id="fornecedor-estado">
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

const ufs: Record<string, string> = {
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
const estadoNome = (value: string) =>
  estadosBrasil.find(
    (e) =>
      e
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase() ===
      (ufs[value.toUpperCase()] ?? value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
  ) ?? "";
function CadastroField({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
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

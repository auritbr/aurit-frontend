import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Compass,
  MapPin,
  StickyNote,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ImportDataButton } from "@/components/ImportDataButton";
import { EmailInput } from "@/components/EmailInput";
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
  doadorTooltip,
  getDoadorById,
  origemDoadorOptions,
  saveDoador,
  situacaoDoadorOptions,
  type OrigemDoador,
  type StatusDoador,
} from "@/data/doadores";

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
  origemDoador: OrigemDoador | "";
  status: StatusDoador | "";
  observacao: string;
}

const initial: FormState = {
  tipoPessoa: "PESSOA_FISICA",
  pessoaFisica: pessoaFisicaVazia,
  pessoaJuridica: pessoaJuridicaVazia,
  endereco: enderecoVazio,
  origemDoador: "",
  status: "",
  observacao: "",
};

const estadosPorUf: Record<string, string> = {
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

const normalizar = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function estadoSelecionado(value: string) {
  const raw = value.trim();

  if (!raw) {
    return "";
  }

  const nome = estadosPorUf[raw.toUpperCase()] ?? raw;

  return (
    estadosBrasil.find((estado) => normalizar(estado) === normalizar(nome)) ??
    ""
  );
}

function DoadorIdentificacaoEssencial({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const pessoaFisica = <K extends keyof PessoaFisicaCadastro>(
    key: K,
    value: PessoaFisicaCadastro[K],
  ) =>
    set("pessoaFisica", {
      ...form.pessoaFisica,
      [key]: value,
    });

  return (
    <FormSectionCard
      icon={UserRound}
      title="Identificação"
      description="Informe apenas os dados essenciais do doador."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="doador-tipo" required>
            Tipo de pessoa
          </FieldLabel>
          <Select
            value={form.tipoPessoa}
            onValueChange={(value) =>
              set("tipoPessoa", value as TipoPessoaCadastro)
            }
          >
            <SelectTrigger id="doador-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipoPessoaCadastroOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.tipoPessoa === "PESSOA_FISICA" ? (
          <>
            <DoadorField
              id="doador-nome"
              label="Nome completo"
              required
              value={form.pessoaFisica.nomeCompleto}
              onChange={(value) => pessoaFisica("nomeCompleto", value)}
            />
            <DoadorField
              id="doador-cpf"
              label="CPF"
              required
              value={maskCPF(form.pessoaFisica.cpf)}
              onChange={(value) => pessoaFisica("cpf", maskCPF(value))}
              inputMode="numeric"
              maxLength={14}
            />
          </>
        ) : (
          <DoadorPessoaJuridicaEssencial form={form} set={set} />
        )}
      </div>
    </FormSectionCard>
  );
}

function DoadorPessoaJuridicaEssencial({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const pessoaJuridica = <K extends keyof PessoaJuridicaCadastro>(
    key: K,
    value: PessoaJuridicaCadastro[K],
  ) =>
    set("pessoaJuridica", {
      ...form.pessoaJuridica,
      [key]: value,
    });

  return (
    <>
      <DoadorField
        id="doador-razao-social"
        label="Razão social"
        required
        value={form.pessoaJuridica.razaoSocial}
        onChange={(value) => pessoaJuridica("razaoSocial", value)}
      />
      <DoadorField
        id="doador-cnpj"
        label="CNPJ"
        required
        value={maskCNPJ(form.pessoaJuridica.cnpj)}
        onChange={(value) => pessoaJuridica("cnpj", maskCNPJ(value))}
        inputMode="numeric"
        maxLength={18}
      />
    </>
  );
}

function DoadorPessoaFields({
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
  ) =>
    set("pessoaFisica", {
      ...form.pessoaFisica,
      [key]: value,
    });

  const pj = <K extends keyof PessoaJuridicaCadastro>(
    key: K,
    value: PessoaJuridicaCadastro[K],
  ) =>
    set("pessoaJuridica", {
      ...form.pessoaJuridica,
      [key]: value,
    });

  const endereco = <K extends keyof EnderecoCadastro>(
    key: K,
    value: EnderecoCadastro[K],
  ) =>
    set("endereco", {
      ...form.endereco,
      [key]: value,
    });

  const buscarCep = async (value: string) => {
    const cep = value.replace(/\D/g, "");

    if (cep.length !== 8 || cepLoading) {
      return;
    }

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

      set("endereco", {
        ...form.endereco,
        cep: maskCEP(cep),
        logradouro: data.logradouro ?? "",
        complemento: form.endereco.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: estadoSelecionado(data.uf ?? "") || form.endereco.estado,
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
        description="Registre as informações necessárias para identificar corretamente quem é o doador."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor="doador-tipo"
              required
              tooltip="Selecione se o doador é uma pessoa física ou uma pessoa jurídica. A escolha define quais dados de identificação serão solicitados no cadastro."
            >
              Tipo de Pessoa
            </FieldLabel>

            <Select
              value={form.tipoPessoa}
              onValueChange={(value) =>
                set("tipoPessoa", value as TipoPessoaCadastro)
              }
            >
              <SelectTrigger id="doador-tipo">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {tipoPessoaCadastroOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.tipoPessoa === "PESSOA_FISICA" ? (
            <>
              <DoadorField
                id="doador-nome"
                label="Nome Completo"
                required
                value={form.pessoaFisica.nomeCompleto}
                onChange={(value) => pf("nomeCompleto", value)}
              />

              <DoadorField
                id="doador-nascimento"
                label="Data de Nascimento"
                type="date"
                value={form.pessoaFisica.dataNascimento}
                onChange={(value) => pf("dataNascimento", value)}
              />

              <DoadorField
                id="doador-cpf"
                label="CPF"
                required
                value={maskCPF(form.pessoaFisica.cpf)}
                onChange={(value) => pf("cpf", maskCPF(value))}
                inputMode="numeric"
                maxLength={14}
              />

              <DoadorField
                id="doador-rg"
                label="RG"
                value={maskRGFlex(form.pessoaFisica.rg)}
                onChange={(value) => pf("rg", maskRGFlex(value))}
              />

              <DoadorField
                id="doador-telefone"
                label="Telefone"
                value={form.pessoaFisica.telefone}
                onChange={(value) => pf("telefone", maskPhone(value))}
              />

              <div>
                <FieldLabel
                  htmlFor="doador-email"
                  tooltip="Informe um endereço de e-mail que possa ser utilizado pela organização para entrar em contato com o doador."
                >
                  E-mail
                </FieldLabel>

                <EmailInput
                  id="doador-email"
                  value={form.pessoaFisica.email}
                  onValueChange={(value) => pf("email", value)}
                  placeholder="nome@exemplo.com"
                />
              </div>
            </>
          ) : (
            <>
              <DoadorField
                id="doador-razao"
                label="Razão Social"
                required
                value={form.pessoaJuridica.razaoSocial}
                onChange={(value) => pj("razaoSocial", value)}
              />

              <DoadorField
                id="doador-fantasia"
                label="Nome Fantasia"
                value={form.pessoaJuridica.nomeFantasia}
                onChange={(value) => pj("nomeFantasia", value)}
              />

              <DoadorField
                id="doador-cnpj"
                label="CNPJ"
                required
                value={maskCNPJ(form.pessoaJuridica.cnpj)}
                onChange={(value) => pj("cnpj", maskCNPJ(value))}
                inputMode="numeric"
                maxLength={18}
              />

              <DoadorField
                id="doador-fundacao"
                label="Data de Fundação"
                type="date"
                value={form.pessoaJuridica.dataFundacao}
                onChange={(value) => pj("dataFundacao", value)}
              />

              <DoadorField
                id="doador-telefone-pj"
                label="Telefone"
                value={form.pessoaJuridica.telefone}
                onChange={(value) => pj("telefone", maskPhone(value))}
              />

              <div>
                <FieldLabel htmlFor="doador-email-pj">E-mail</FieldLabel>
                <EmailInput
                  id="doador-email-pj"
                  value={form.pessoaJuridica.email}
                  onValueChange={(value) => pj("email", value)}
                  placeholder="contato@empresa.com"
                />
              </div>
            </>
          )}
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={MapPin}
        title="Endereço"
        description="Informe o endereço principal do doador. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente."
      >
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="doador-cep" required>
              CEP
            </FieldLabel>

            <Input
              id="doador-cep"
              value={maskCEP(form.endereco.cep)}
              inputMode="numeric"
              maxLength={9}
              onChange={(event) => {
                const value = maskCEP(event.target.value);

                endereco("cep", value);

                if (value.replace(/\D/g, "").length === 8) {
                  void buscarCep(value);
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
            <DoadorField
              id="doador-logradouro"
              label="Logradouro"
              required
              value={form.endereco.logradouro}
              onChange={(value) => endereco("logradouro", value)}
            />
          </div>

          <div className="sm:col-span-2">
            <DoadorField
              id="doador-numero"
              label="Número"
              required
              value={form.endereco.numero}
              onChange={(value) => endereco("numero", value)}
            />
          </div>

          <div className="sm:col-span-4">
            <DoadorField
              id="doador-complemento"
              label="Complemento"
              value={form.endereco.complemento}
              onChange={(value) => endereco("complemento", value)}
            />
          </div>

          <div className="sm:col-span-2">
            <DoadorField
              id="doador-bairro"
              label="Bairro"
              required
              value={form.endereco.bairro}
              onChange={(value) => endereco("bairro", value)}
            />
          </div>

          <div className="sm:col-span-2">
            <DoadorField
              id="doador-cidade"
              label="Cidade"
              required
              value={form.endereco.cidade}
              onChange={(value) => endereco("cidade", value)}
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="doador-estado" required>
              Estado
            </FieldLabel>

            <Select
              value={estadoSelecionado(form.endereco.estado)}
              onValueChange={(value) => endereco("estado", value)}
            >
              <SelectTrigger id="doador-estado">
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

export default function DoadorForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isView = !!id && !location.pathname.endsWith("/editar");

  const isEdit = !!id && !isView;

  const [form, setForm] = useState<FormState>(initial);

  const [loading, setLoading] = useState(!!id);

  const [saving, setSaving] = useState(false);

  useImportFormFill("doadores", setForm);

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    getDoadorById(id)
      .then((d) => {
        if (!active) {
          return;
        }

        setForm({
          tipoPessoa: d.tipoPessoa,
          pessoaFisica: d.pessoaFisica ?? pessoaFisicaVazia,
          pessoaJuridica: d.pessoaJuridica ?? pessoaJuridicaVazia,
          endereco: d.endereco ?? enderecoVazio,
          origemDoador: d.origemDoador,
          status: d.status,
          observacao: d.observacao,
        });
      })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Erro ao carregar doador.",
        );

        navigate("/doadores");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({
      ...p,
      [key]: value,
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.tipoPessoa === "PESSOA_FISICA") {
      if (!form.pessoaFisica.nomeCompleto.trim()) {
        return toast.error("Informe o nome completo.");
      }
      if (form.pessoaFisica.cpf.replace(/\D/g, "").length !== 11) {
        return toast.error("Informe um CPF com 11 dígitos.");
      }
    } else {
      if (!form.pessoaJuridica.razaoSocial.trim()) {
        return toast.error("Informe a razão social.");
      }
      if (form.pessoaJuridica.cnpj.replace(/\D/g, "").length !== 14) {
        return toast.error("Informe um CNPJ com 14 dígitos.");
      }
    }

    try {
      setSaving(true);

      await saveDoador(
        {
          tipoPessoa: form.tipoPessoa,
          pessoaFisica:
            form.tipoPessoa === "PESSOA_FISICA"
              ? {
                  ...pessoaFisicaVazia,
                  nomeCompleto: form.pessoaFisica.nomeCompleto.trim(),
                  cpf: form.pessoaFisica.cpf.replace(/\D/g, ""),
                }
              : null,
          pessoaJuridica:
            form.tipoPessoa === "PESSOA_JURIDICA"
              ? {
                  ...pessoaJuridicaVazia,
                  razaoSocial: form.pessoaJuridica.razaoSocial.trim(),
                  cnpj: form.pessoaJuridica.cnpj.replace(/\D/g, ""),
                }
              : null,
        },
        isEdit ? id : undefined,
      );

      if (!isEdit) emitJourneyNextStep();
      toast.success(isEdit ? "Doador atualizado." : "Doador cadastrado.");

      navigate("/doadores");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar doador.",
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
              {isView ? "Doadores" : isEdit ? "Doadores" : "Doadores"}
            </h1>

            <HelpTooltip
              text={doadorTooltip}
              label="Doadores"
              size="md"
              side="bottom"
              align="start"
            />
          </div>

          {!isView && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ImportDataButton
                config={getImportConfigForPath("/doadores")!}
                canFillForm
                variant="glassSecondary"
              />
            </div>
          )}
        </header>

        <FormLegend />

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando doador...
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <fieldset
              disabled={isView || saving}
              className="m-0 min-w-0 space-y-5 border-0 p-0"
            >
              <DoadorIdentificacaoEssencial form={form} set={set} />

              {false && <FormSectionCard
                icon={Compass}
                title="Origem e situação"
                description="Registre como o doador chegou até a organização e mantenha atualizada sua situação para o acompanhamento das doações."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel
                      htmlFor="origem"
                      tooltip="Selecione como o doador chegou até a organização ou como passou a fazer parte deste cadastro, por exemplo: evento, campanha, indicação, redes sociais, parceiro ou cadastro manual."
                    >
                      Origem do Doador
                    </FieldLabel>

                    <Select
                      value={form.origemDoador || SELECIONE}
                      onValueChange={(v) =>
                        set(
                          "origemDoador",
                          v === SELECIONE ? "" : (v as OrigemDoador),
                        )
                      }
                    >
                      <SelectTrigger id="origem">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SELECIONE}>Selecione</SelectItem>
                        {origemDoadorOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor="status"
                      required
                      tooltip="Selecione a situação atual do doador. Ativo indica que o cadastro pode continuar sendo utilizado normalmente; Inativo mantém as informações registradas, mas indica que o doador não está sendo considerado ativo no momento."
                    >
                      Situação do Doador
                    </FieldLabel>

                    <Select
                      value={form.status || SELECIONE}
                      onValueChange={(v) =>
                        set(
                          "status",
                          v === SELECIONE ? "" : (v as StatusDoador),
                        )
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SELECIONE}>Selecione</SelectItem>
                        {situacaoDoadorOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSectionCard>}

              {false && <FormSectionCard
                icon={StickyNote}
                title="Observações"
                description="Mantenha registradas informações que possam ser úteis para compreender e acompanhar o relacionamento da organização com este doador."
              >
                <FieldLabel
                  htmlFor="observacao"
                  tooltip="Registre informações importantes sobre o doador que ajudem no acompanhamento do cadastro, como interesses, orientações, condições combinadas ou outros detalhes relevantes."
                >
                  Observações
                </FieldLabel>

                <Textarea
                  id="observacao"
                  rows={4}
                  value={form.observacao}
                  onChange={(e) => set("observacao", e.target.value)}
                />
              </FormSectionCard>}
            </fieldset>

            <Actions
              view={isView}
              saving={saving}
              back={() => navigate("/doadores")}
            />
          </form>
        )}
      </div>

      <WikiFloatingButton
        pageTitle="Doadores"
        href="/wiki/financeiro/doadores"
      />
    </AppLayout>
  );
}

function DoadorField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  inputMode,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Actions({
  view,
  saving,
  back,
}: {
  view: boolean;
  saving: boolean;
  back: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 px-4"
        onClick={back}
        disabled={saving}
      >
        {view ? "Voltar" : "Cancelar"}
      </Button>

      {!view && (
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
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Settings as SettingsIcon,
  ImagePlus,
  Trash2,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { ProprietarioLayout } from "@/components/ProprietarioLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { maskCEP, maskPhone } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import { toast } from "sonner";
import {
  fetchConfiguracaoEmpresa,
  fetchConfiguracaoEmpresaLogoUrl,
  createOrUpdateConfiguracaoEmpresa,
  saveConfiguracaoEmpresa,
  type ConfiguracaoEmpresaData,
  type ConfiguracaoEmpresaRequestDTO,
  type TipoPlanoApi,
} from "@/lib/configuracaoEmpresaStore";

const maskDoc = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);

  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  estado?: string;
  erro?: boolean;
}

interface ConfigEmpresaForm {
  id: number | null;
  nomeEmpresa: string;
  slug: string;
  documentoIdentificacao: string;
  emailContato: string;
  telefoneContato: string;
  tipoPlano: TipoPlanoApi | "";
  limiteUsuarios: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  dataCriacao: string;
  dataAtualizacao: string;
  caminhoLogo: string | null;
}

const empty: ConfigEmpresaForm = {
  id: null,
  nomeEmpresa: "",
  slug: "",
  documentoIdentificacao: "",
  emailContato: "",
  telefoneContato: "",
  tipoPlano: "",
  limiteUsuarios: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  dataCriacao: "",
  dataAtualizacao: "",
  caminhoLogo: null,
};

const planos: { value: TipoPlanoApi; label: string }[] = [
  { value: "PLANO_GRATUITO", label: "Plano Gratuito" },
  { value: "PLANO_PAGO", label: "Plano Profissional" },
];

function formatDateTimeBR(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}/${month}/${year}`;
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed);
  const date = new Date(
    isIsoDateTime && !hasTimezone ? `${trimmed}Z` : trimmed,
  );

  if (Number.isNaN(date.getTime())) return value ?? "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function mapUfToEstado(uf?: string): string {
  const mapa: Record<string, string> = {
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

  return uf ? mapa[uf] ?? "" : "";
}

function mapDataToForm(data: ConfiguracaoEmpresaData): ConfigEmpresaForm {
  return {
    id: data.id ?? null,
    nomeEmpresa: data.nomeEmpresa ?? "",
    slug: data.slug ?? "",
    documentoIdentificacao: data.documentoIdentificacao ?? "",
    emailContato: data.emailContato ?? "",
    telefoneContato: data.telefoneContato ?? "",
    tipoPlano: data.tipoPlano ?? "",
    limiteUsuarios: data.limiteUsuarios ?? "",
    cep: data.cep ?? "",
    logradouro: data.logradouro ?? "",
    numero: data.numero ?? "",
    complemento: data.complemento ?? "",
    bairro: data.bairro ?? "",
    cidade: data.cidade ?? "",
    estado: data.estado ?? "",
    caminhoLogo: data.caminhoLogo ?? null,
    dataCriacao: formatDateTimeBR(data.dataCriacao),
    dataAtualizacao: formatDateTimeBR(data.dataAtualizacao),
  };
}

function buildPayload(form: ConfigEmpresaForm): ConfiguracaoEmpresaRequestDTO {
  return {
    nomeEmpresa: form.nomeEmpresa.trim(),
    slug: form.slug,
    caminhoLogo: form.caminhoLogo,
    emailContato: form.emailContato.trim(),
    telefoneContato: form.telefoneContato.trim(),
    documentoIdentificacao: form.documentoIdentificacao.trim(),
    tipoPlano: form.tipoPlano as TipoPlanoApi,
    limiteUsuarios:
      form.tipoPlano === "PLANO_GRATUITO"
        ? 2
        : Number(form.limiteUsuarios || "0"),
    endereco: {
      cep: form.cep.replace(/\D/g, ""),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim() ? Number(form.numero) : null,
      complemento: form.complemento.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),
    },
  };
}

export default function ConfiguracaoEmpresa() {
  const [form, setForm] = useState<ConfigEmpresaForm>(empty);

  const [logoPreview, setLogoPreview] = useState<{
    dataUrl: string;
    name: string;
  } | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const limiteUsuariosReadOnly = useMemo(
    () => form.tipoPlano === "PLANO_GRATUITO",
    [form.tipoPlano],
  );

  const set = <K extends keyof ConfigEmpresaForm>(
    k: K,
    v: ConfigEmpresaForm[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const config = await fetchConfiguracaoEmpresa();
        const mapped = mapDataToForm(config);

        if (!active) return;

        setForm(mapped);

        if (mapped.id && mapped.caminhoLogo) {
          const logoUrl = await fetchConfiguracaoEmpresaLogoUrl(mapped.id);

          if (!active) return;

          if (logoUrl) {
            setLogoPreview({
              dataUrl: logoUrl,
              name: "logo",
            });
          } else {
            setLogoPreview(null);
          }
        } else {
          setLogoPreview(null);
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar configuração da empresa.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (form.tipoPlano === "PLANO_GRATUITO" && form.limiteUsuarios !== "2") {
      set("limiteUsuarios", "2");
    }
  }, [form.tipoPlano]);

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || loading || saving) return;

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro ?? "",
        complemento: prev.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: mapUfToEstado(data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)
    ) {
      toast.error("Envie uma imagem nos formatos PNG, JPG ou WEBP.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 4MB.");
      return;
    }

    setLogoFile(file);

    const reader = new FileReader();

    reader.onload = () =>
      setLogoPreview({
        dataUrl: reader.result as string,
        name: file.name,
      });

    reader.readAsDataURL(file);
  };

  const removerLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    set("caminhoLogo", null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const required: [string, string][] = [
      [form.nomeEmpresa, "Nome da organização"],
      [form.documentoIdentificacao, "CPF/CNPJ da organização"],
      [form.emailContato, "E-mail de contato"],
      [form.telefoneContato, "Telefone de contato"],
      [form.tipoPlano, "Plano contratado"],
      [form.cep, "CEP"],
      [form.logradouro, "Logradouro"],
      [form.numero, "Número"],
      [form.bairro, "Bairro"],
      [form.cidade, "Cidade"],
      [form.estado, "Estado"],
    ];

    const missing = required.find(([v]) => !String(v).trim());

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return;
    }

    if (form.tipoPlano === "PLANO_PAGO" && !form.limiteUsuarios.trim()) {
      toast.error("Preencha o campo: Limite de usuários.");
      return;
    }

    if (form.tipoPlano === "PLANO_PAGO" && Number(form.limiteUsuarios) < 1) {
      toast.error("O limite de usuários deve ser maior que zero.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload(form);

      const saved = await createOrUpdateConfiguracaoEmpresa(
        payload,
        form.id,
        logoFile,
      );

      const mapped = mapDataToForm(saved);

      setForm(mapped);

      if (mapped.id && mapped.caminhoLogo) {
        const logoUrl = await fetchConfiguracaoEmpresaLogoUrl(mapped.id);

        if (logoUrl) {
          setLogoPreview({
            dataUrl: logoUrl,
            name: logoFile?.name ?? "logo",
          });
        } else {
          setLogoPreview(null);
        }
      } else {
        setLogoPreview(null);
      }

      setLogoFile(null);

      saveConfiguracaoEmpresa(saved);

      toast.success("Configurações da empresa salvas com sucesso.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar configuração da empresa.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProprietarioLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <PageTitle
          title="Configuração da Empresa"
          tooltip="Gerencie os dados oficiais da organização utilizados na geração de documentos e relatórios. Informações corretas garantem consistência na prestação de contas e nas inscrições em editais."
        />

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Os dados informados aqui serão utilizados em{" "}
            <span className="font-semibold">
              contratos, relatórios e documentos oficiais
            </span>{" "}
            gerados pelo sistema. Mantenha-os sempre atualizados.
          </p>
        </div>

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Building2} title="Dados Institucionais">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="nomeEmpresa"
                  required
                  tooltip="Informe o nome da organização conforme será exibido em documentos, contratos e relatórios. Ex.: Associação Cultural Arte Viva."
                >
                  Nome da Organização
                </FieldLabel>

                <Input
                  id="nomeEmpresa"
                  value={form.nomeEmpresa}
                  onChange={(e) => set("nomeEmpresa", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="documentoIdentificacao"
                  required
                  tooltip="Informe o CPF ou CNPJ da organização, utilizando apenas números. Ex.: 12345678900 ou 12345678000199."
                >
                  CPF/CNPJ da Organização
                </FieldLabel>

                <Input
                  id="documentoIdentificacao"
                  value={form.documentoIdentificacao}
                  onChange={(e) =>
                    set("documentoIdentificacao", maskDoc(e.target.value))
                  }
                  inputMode="numeric"
                  disabled={loading || saving}
                />
              </Field>
            </div>

            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-primary" strokeWidth={2.2} />

                <h3 className="text-sm font-semibold text-foreground">
                  Logo da Organização
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="h-28 w-28 rounded border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                      <img
                        src={logoPreview.dataUrl}
                        alt="Logo da organização"
                        className="max-h-full max-w-full object-contain"
                        onError={() => {
                          toast.error(
                            "Não foi possível carregar a imagem da logo.",
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-28 rounded border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-6 w-6" strokeWidth={1.8} />
                      <span className="text-[10px] mt-1">Sem logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <FieldLabel
                    htmlFor="caminhoLogo"
                    tooltip="Faça o upload do logotipo da organização. A imagem será utilizada automaticamente em documentos e relatórios gerados pelo sistema."
                  >
                    Logo da Organização
                  </FieldLabel>

                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={loading || saving}
                    >
                      <label htmlFor="caminhoLogo" className="cursor-pointer">
                        <ImagePlus className="h-4 w-4" />
                        {logoPreview ? "Substituir imagem" : "Enviar imagem"}
                      </label>
                    </Button>

                    <input
                      id="caminhoLogo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={loading || saving}
                    />

                    {logoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removerLogo}
                        className="text-muted-foreground"
                        disabled={loading || saving}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>

                  {logoPreview && (
                    <p className="mt-2 text-xs text-muted-foreground truncate">
                      Arquivo: {logoPreview.name}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Esta logo será utilizada em documentos, contratos e
                    relatórios gerados pelo sistema. Formatos aceitos: PNG, JPG
                    ou WEBP (até 4MB).
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section icon={Mail} title="Contato">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="emailContato"
                  required
                  tooltip="Informe um e-mail válido para contato da organização. Ex.: contato@organizacao.org."
                >
                  E-mail de Contato
                </FieldLabel>

                <Input
                  id="emailContato"
                  type="email"
                  value={form.emailContato}
                  onChange={(e) => set("emailContato", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="telefoneContato"
                  required
                  tooltip="Informe um telefone para contato com DDD. Ex.: (32) 99999-0000."
                >
                  Telefone de Contato
                </FieldLabel>

                <Input
                  id="telefoneContato"
                  value={form.telefoneContato}
                  onChange={(e) =>
                    set("telefoneContato", maskPhone(e.target.value))
                  }
                  inputMode="tel"
                  disabled={loading || saving}
                />
              </Field>
            </div>
          </Section>

          <Section icon={SettingsIcon} title="Plano e Acesso">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="tipoPlano"
                  required
                  tooltip="Indica o tipo de plano cadastrado para a empresa no sistema."
                >
                  Plano Contratado
                </FieldLabel>

                <Select
                  value={form.tipoPlano}
                  onValueChange={(v) => set("tipoPlano", v as TipoPlanoApi)}
                  disabled={loading || saving}
                >
                  <SelectTrigger id="tipoPlano">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>

                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="limiteUsuarios"
                  required
                  tooltip="No plano gratuito o limite é fixado em 2 usuários. No plano pago, você pode informar a quantidade permitida."
                >
                  Limite de Usuários
                </FieldLabel>

                <Input
                  id="limiteUsuarios"
                  type="number"
                  min={1}
                  value={form.limiteUsuarios}
                  onChange={(e) => set("limiteUsuarios", e.target.value)}
                  inputMode="numeric"
                  disabled={loading || saving || limiteUsuariosReadOnly}
                />
              </Field>
            </div>
          </Section>

          <Section icon={MapPin} title="Endereço">
            <div className="grid sm:grid-cols-6 gap-4">
              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="cep"
                  required
                  tooltip="Informe o CEP utilizando apenas números. Ex.: 36000000."
                >
                  CEP
                </FieldLabel>

                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => {
                    const cepFormatado = maskCEP(e.target.value);
                    set("cep", cepFormatado);

                    const cepLimpo = cepFormatado.replace(/\D/g, "");
                    if (cepLimpo.length === 8) {
                      void buscarEnderecoPorCep(cepFormatado);
                    }
                  }}
                  inputMode="numeric"
                  disabled={loading || saving}
                />

                {cepLoading && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buscando endereço...
                  </p>
                )}
              </Field>

              <Field className="sm:col-span-4">
                <FieldLabel
                  htmlFor="logradouro"
                  required
                  tooltip="Informe o nome da rua, avenida ou via. Ex.: Rua das Flores."
                >
                  Logradouro
                </FieldLabel>

                <Input
                  id="logradouro"
                  value={form.logradouro}
                  onChange={(e) => set("logradouro", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="numero"
                  required
                  tooltip="Informe o número do imóvel. Ex.: 150."
                >
                  Número
                </FieldLabel>

                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(e) =>
                    set("numero", e.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  disabled={loading || saving}
                />
              </Field>

              <Field className="sm:col-span-4">
                <FieldLabel
                  htmlFor="complemento"
                  tooltip="Adicione informações adicionais, se necessário. Ex.: Sala 02."
                >
                  Complemento
                </FieldLabel>

                <Input
                  id="complemento"
                  value={form.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="bairro"
                  required
                  tooltip="Informe o bairro do endereço. Ex.: Centro."
                >
                  Bairro
                </FieldLabel>

                <Input
                  id="bairro"
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="cidade"
                  required
                  tooltip="Informe a cidade do endereço. Ex.: Juiz de Fora."
                >
                  Cidade
                </FieldLabel>

                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  disabled={loading || saving}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="estado"
                  required
                  tooltip="Selecione o estado correspondente. Ex.: Minas Gerais."
                >
                  Estado
                </FieldLabel>

                <Select
                  value={form.estado}
                  onValueChange={(v) => set("estado", v)}
                  disabled={loading || saving}
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {estadosBrasil.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Info} title="Informações do Sistema">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="dataCriacao"
                  tooltip="Data em que a organização foi cadastrada no sistema. Este campo é gerado automaticamente e não pode ser alterado."
                >
                  Data de Criação
                </FieldLabel>

                <Input
                  id="dataCriacao"
                  value={form.dataCriacao}
                  readOnly
                  disabled
                  className="bg-muted/40 cursor-not-allowed"
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataAtualizacao"
                  tooltip="Data da última atualização realizada nos dados da organização. Este campo é atualizado automaticamente pelo sistema."
                >
                  Última Atualização
                </FieldLabel>

                <Input
                  id="dataAtualizacao"
                  value={form.dataAtualizacao}
                  readOnly
                  disabled
                  className="bg-muted/40 cursor-not-allowed"
                />
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="submit"
              className="sm:min-w-32"
              disabled={loading || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Configuração da Empresa"
        sections={[
          {
            title: "Para que serve esta página?",
            content:
              "Centraliza os dados oficiais da organização — nome, documento, logo, contato, plano e endereço — utilizados em documentos, contratos e relatórios gerados pelo sistema.",
          },
          {
            title: "Dados institucionais",
            content:
              "Informe o nome oficial e o CPF/CNPJ da organização. Esses dados aparecerão em todos os documentos.",
          },
          {
            title: "Logo da organização",
            content:
              "Envie uma imagem. A logo será reutilizada automaticamente em PDFs e relatórios oficiais.",
          },
          {
            title: "Plano e acesso",
            content:
              "No plano gratuito o limite é automaticamente 2 usuários. No plano pago, o limite informado é respeitado.",
          },
          {
            title: "Endereço",
            content:
              "Ao completar o CEP, o sistema tenta preencher logradouro, bairro, cidade e estado automaticamente.",
          },
          {
            title: "Salvando",
            content:
              "Clique em 'Salvar' ao final. As datas de criação e atualização são retornadas pelo backend.",
          },
        ]}
      />
    </ProprietarioLayout>
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
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function Field({
  children,
  full,
  className = "",
}: {
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className}`}>
      {children}
    </div>
  );
}

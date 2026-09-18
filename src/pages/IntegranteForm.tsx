import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  User,
  MapPin,
  Briefcase,
  CalendarClock,
  Building2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { EmailInput } from "@/components/EmailInput";
import { PageTitle } from "@/components/PageTitle";
import { ImportDataButton } from "@/components/ImportDataButton";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { Button } from "@/components/ui/button";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { maskCNPJ, maskCPF, maskPhone, maskCEP, maskDate } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import {
  createIntegrante,
  generosIntegrante,
  getIntegranteById,
  getOrganizacoes,
  racasCoresIntegrante,
  tiposDeficienciaIntegrante,
  tiposPessoaIntegrante,
  tiposVinculoIntegrante,
  updateIntegrante,
  type GeneroApi,
  type IntegranteDTO,
  type IntegranteStatusApi,
  type OrganizacaoOption,
  type RacaCorApi,
  type TipoDeficienciaApi,
  type TipoPessoaIntegranteApi,
  type TipoVinculoIntegranteApi,
} from "@/data/integrantes";
import { toast } from "sonner";
import { getImportConfigForPath } from "@/config/importacoes";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

function salvarProximaAcaoIntegrante() {
  emitJourneyNextStep();
}

interface FormState {
  tipoPessoaIntegrante: TipoPessoaIntegranteApi;
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  cnpj: string;
  nomeSocial: string;
  nomeFantasia: string;
  telefone: string;
  email: string;

  racaCor: RacaCorApi | "";
  genero: GeneroApi | "";
  tipoDeficiencia: TipoDeficienciaApi | "";

  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  funcaoIntegrante: string;
  tipoVinculoIntegrante: TipoVinculoIntegranteApi | "";
  dataEntrada: string;
  dataSaida: string;
  status: IntegranteStatusApi | "";
  organizacaoId: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  estado?: string;
  erro?: boolean;
}

const initial: FormState = {
  tipoPessoaIntegrante: "PESSOA_FISICA",
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  cnpj: "",
  nomeSocial: "",
  nomeFantasia: "",
  telefone: "",
  email: "",

  racaCor: "",
  genero: "",
  tipoDeficiencia: "",

  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",

  funcaoIntegrante: "",
  tipoVinculoIntegrante: "",
  dataEntrada: "",
  dataSaida: "",
  status: "",
  organizacaoId: "",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskRGFlex(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";

  if (digits.length <= 7) {
    if (digits.length <= 1) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}.${digits.slice(4)}`;
  }

  if (digits.length <= 8) {
    return digits.replace(/^(\d{2})(\d{3})(\d{0,3})$/, (_, a, b, c) =>
      c ? `${a}.${b}.${c}` : `${a}.${b}`,
    );
  }

  if (digits.length === 9) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)$/, "$1.$2.$3-$4");
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
}

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

function normalizarChave(value?: string | null) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolverEstadoParaSelect(value?: string | null): string {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  const direto = estadosBrasil.find((estado) => estado === raw);

  if (direto) return direto;

  const rawUpper = raw.toUpperCase();

  if (rawUpper.length === 2) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === rawUpper,
    );

    if (opcaoUf) return opcaoUf;

    const nomeEstado = estadosPorUf[rawUpper];

    if (nomeEstado) {
      const opcaoNome = estadosBrasil.find(
        (estado) => normalizarChave(estado) === normalizarChave(nomeEstado),
      );

      if (opcaoNome) return opcaoNome;
    }
  }

  const ufPorNome = Object.entries(estadosPorUf).find(
    ([, nome]) => normalizarChave(nome) === normalizarChave(raw),
  )?.[0];

  if (ufPorNome) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === ufPorNome,
    );

    if (opcaoUf) return opcaoUf;

    const opcaoNome = estadosBrasil.find(
      (estado) =>
        normalizarChave(estado) === normalizarChave(estadosPorUf[ufPorNome]),
    );

    if (opcaoNome) return opcaoNome;
  }

  const porNomeNormalizado = estadosBrasil.find(
    (estado) => normalizarChave(estado) === normalizarChave(raw),
  );

  return porNomeNormalizado ?? "";
}

function isoToBrDate(value?: string): string {
  if (!value) return "";

  const normalized = value.length >= 10 ? value.slice(0, 10) : value;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return value;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function brToIsoDate(value: string): string {
  const clean = value.trim();
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return clean;

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toInputDate(value?: string): string {
  if (!value) return "";

  return value.length >= 10 ? value.slice(0, 10) : value;
}

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStatusConcluido(status: IntegranteStatusApi | "") {
  return status === "CONCLUIDO";
}

export default function IntegranteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const conversionSeed = (
    location.state as { conversionSeed?: { data?: Partial<FormState> } } | null
  )?.conversionSeed;

  const bloqueado = visualizando || loading || saving;
  const statusConcluido = isStatusConcluido(form.status);
  const pessoaJuridica = form.tipoPessoaIntegrante === "PESSOA_JURIDICA";

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useImportFormFill("integrantes", setForm);

  useEffect(() => {
    let active = true;

    async function carregarDependencias() {
      try {
        const data = await getOrganizacoes();

        if (!active) return;

        setOrganizacoes(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar organizações.";

        toast.error(message);
      }
    }

    void carregarDependencias();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!id || form.organizacaoId || organizacoes.length !== 1) return;
    set("organizacaoId", String(organizacoes[0].id));
  }, [id, form.organizacaoId, organizacoes]);

  useEffect(() => {
    if (!id) {
      if (conversionSeed?.data) {
        setForm((previous) => ({ ...previous, ...conversionSeed.data }));
      }
      setLoading(false);
      return;
    }

    let active = true;

    async function carregarIntegrante() {
      try {
        setLoading(true);

        const data = await getIntegranteById(Number(id));

        if (!active) return;

        setForm({
          tipoPessoaIntegrante: data.tipoPessoaIntegrante || "PESSOA_FISICA",
          nomeCompleto: data.nomeCompleto,
          dataNascimento: isoToBrDate(data.dataNascimento),
          cpf: data.cpf ? maskCPF(data.cpf) : "",
          rg: data.rg,
          cnpj: data.cnpj ? maskCNPJ(data.cnpj) : "",
          nomeSocial: data.nomeSocial,
          nomeFantasia: data.nomeFantasia,
          telefone: data.telefone ? maskPhone(data.telefone) : "",
          email: data.email,

          racaCor: data.racaCor,
          genero: data.genero,
          tipoDeficiencia: data.tipoDeficiencia,

          cep: data.cep ? maskCEP(data.cep) : "",
          logradouro: data.logradouro,
          numero: data.numero === "" ? "" : String(data.numero),
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: resolverEstadoParaSelect(data.estado),

          funcaoIntegrante: data.funcaoIntegrante,
          tipoVinculoIntegrante: data.tipoVinculoIntegrante,
          dataEntrada: toInputDate(data.dataEntrada),
          dataSaida: toInputDate(data.dataSaida),
          status: data.status,
          organizacaoId:
            data.organizacaoId !== "" && data.organizacaoId != null
              ? String(data.organizacaoId)
              : "",
        });
      } catch (error) {
        if (!active) return;

        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar integrante.";

        toast.error(message);
        navigate("/integrantes");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarIntegrante();

    return () => {
      active = false;
    };
  }, [conversionSeed?.data, id, navigate]);

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = onlyDigits(cepFormatado);

    if (cepLimpo.length !== 8 || visualizando) return;

    try {
      setCepLoading(true);

      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );

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
        estado: resolverEstadoParaSelect(data.uf ?? data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  function buildPayload(): IntegranteDTO {
    const payloadPessoa = pessoaJuridica
      ? {
          nomeCompleto: null,
          dataNascimento: null,
          cpf: null,
          rg: null,
          racaCor: null,
          genero: null,
          tipoDeficiencia: null,
          cnpj: onlyDigits(form.cnpj),
          nomeSocial: form.nomeSocial.trim(),
          nomeFantasia: form.nomeFantasia.trim() || null,
        }
      : {
          nomeCompleto: form.nomeCompleto.trim(),
          dataNascimento: brToIsoDate(form.dataNascimento),
          cpf: onlyDigits(form.cpf),
          rg: form.rg.trim() || null,
          racaCor: form.racaCor,
          genero: form.genero,
          tipoDeficiencia: form.tipoDeficiencia,
          cnpj: null,
          nomeSocial: null,
          nomeFantasia: null,
        };

    return {
      id: editando && id ? Number(id) : undefined,
      tipoPessoaIntegrante: form.tipoPessoaIntegrante,
      ...payloadPessoa,
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,

      funcaoIntegrante: form.funcaoIntegrante.trim(),
      tipoVinculoIntegrante: form.tipoVinculoIntegrante || null,
      dataEntrada: form.dataEntrada,
      dataSaida: statusConcluido ? form.dataSaida || null : null,

      cep: onlyDigits(form.cep),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),

      status: form.status as IntegranteStatusApi,

      /*
        Mantido apenas como apoio visual/compatibilidade.
        O backend deve vincular pelo tenant/empresa logada.
      */
      organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
    };
  }

  function validar() {
    if (pessoaJuridica) {
      if (onlyDigits(form.cnpj).length !== 14) {
        toast.error("Informe um CNPJ válido.");
        return false;
      }

      if (!form.nomeSocial.trim()) {
        toast.error("Informe o nome social/razão social.");
        return false;
      }

    } else {
      if (!form.nomeCompleto.trim()) {
        toast.error("Informe o nome completo.");
        return false;
      }

      if (!form.dataNascimento.trim()) {
        toast.error("Informe a data de nascimento.");
        return false;
      }

      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dataNascimento.trim())) {
        toast.error("Informe a data de nascimento no formato dd/mm/aaaa.");
        return false;
      }

      if (onlyDigits(form.cpf).length !== 11) {
        toast.error("Informe um CPF válido.");
        return false;
      }

      if (!form.racaCor) {
        toast.error("Informe a raça/cor.");
        return false;
      }

      if (!form.genero) {
        toast.error("Informe o gênero.");
        return false;
      }

      if (!form.tipoDeficiencia) {
        toast.error("Informe a deficiência.");
        return false;
      }
    }

    if (!form.telefone.trim()) {
      toast.error("Informe o telefone.");
      return false;
    }

    if (form.email.trim() && !isValidEmail(form.email.trim())) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    if (!form.funcaoIntegrante.trim()) {
      toast.error("Informe a função / atuação.");
      return false;
    }

    if (!form.dataEntrada) {
      toast.error("Informe a data de entrada.");
      return false;
    }

    if (!form.status) {
      toast.error("Informe o status.");
      return false;
    }

    if (statusConcluido && !form.dataSaida) {
      toast.error(
        "Informe a data de saída quando o status do integrante for Concluído.",
      );
      return false;
    }

    if (form.dataSaida && form.dataSaida < form.dataEntrada) {
      toast.error("A data de saída não pode ser anterior à data de entrada.");
      return false;
    }

    if (onlyDigits(form.cep).length !== 8) {
      toast.error("Informe um CEP válido.");
      return false;
    }

    if (!form.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return false;
    }

    if (!form.numero.trim()) {
      toast.error("Informe o número do endereço.");
      return false;
    }

    if (!form.bairro.trim()) {
      toast.error("Informe o bairro.");
      return false;
    }

    if (!form.cidade.trim()) {
      toast.error("Informe a cidade.");
      return false;
    }

    if (!form.estado.trim()) {
      toast.error("Informe o estado.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;
    if (!validar()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editando && id) {
        await updateIntegrante(Number(id), payload);
        toast.success("Integrante atualizado com sucesso.");
      } else {
        await createIntegrante(payload);
        salvarProximaAcaoIntegrante();
        toast.success("Integrante salvo com sucesso.");
      }

      navigate("/integrantes");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar integrante.";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/integrantes" />

        <PageTitle
          title="Integrantes"
          tooltip="Nesta página são cadastrados os integrantes vinculados à organização, como artistas, grupos, parceiros culturais, pareceristas ou pessoas envolvidas em projetos, ações e atividades. Também podem ser registrados o tipo de vínculo, a função exercida, o período de participação e a situação atual de cada integrante."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/integrantes")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />
        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={User}
              title="Dados do integrante"
              description="Informe os principais dados de identificação e contato da pessoa ou organização cadastrada como integrante."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="tipoPessoaIntegrante"
                    required
                    tooltip="Informe se o integrante cadastrado é uma pessoa física ou pessoa jurídica. Os campos do formulário serão ajustados de acordo com a opção selecionada."
                  >
                    Tipo de Pessoa
                  </FieldLabel>

                  <Select
                    value={form.tipoPessoaIntegrante}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      set(
                        "tipoPessoaIntegrante",
                        value as TipoPessoaIntegranteApi,
                      );
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="tipoPessoaIntegrante">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {tiposPessoaIntegrante.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {pessoaJuridica ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="nomeSocial" required>
                        Razão Social
                      </FieldLabel>

                      <Input
                        id="nomeSocial"
                        value={form.nomeSocial}
                        onChange={(e) => set("nomeSocial", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="nomeFantasia">
                        Nome Fantasia
                      </FieldLabel>

                      <Input
                        id="nomeFantasia"
                        value={form.nomeFantasia}
                        onChange={(e) => set("nomeFantasia", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="cnpj" required>
                        CNPJ
                      </FieldLabel>

                      <Input
                        id="cnpj"
                        value={form.cnpj}
                        onChange={(e) => set("cnpj", maskCNPJ(e.target.value))}
                        inputMode="numeric"
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="telefone" required>
                        Telefone
                      </FieldLabel>

                      <Input
                        id="telefone"
                        value={form.telefone}
                        onChange={(e) =>
                          set("telefone", maskPhone(e.target.value))
                        }
                        inputMode="tel"
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email">E-mail</FieldLabel>

                      <EmailInput
                        id="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field>
                      <FieldLabel htmlFor="nomeCompleto" required>
                        Nome Completo
                      </FieldLabel>

                      <Input
                        id="nomeCompleto"
                        value={form.nomeCompleto}
                        onChange={(e) => set("nomeCompleto", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="dataNascimento" required>
                        Data de Nascimento
                      </FieldLabel>

                      <Input
                        id="dataNascimento"
                        value={form.dataNascimento}
                        onChange={(e) =>
                          set("dataNascimento", maskDate(e.target.value))
                        }
                        inputMode="numeric"
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="cpf" required>
                        CPF
                      </FieldLabel>

                      <Input
                        id="cpf"
                        value={form.cpf}
                        onChange={(e) => set("cpf", maskCPF(e.target.value))}
                        inputMode="numeric"
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="rg">RG</FieldLabel>

                      <Input
                        id="rg"
                        value={form.rg}
                        onChange={(e) => set("rg", maskRGFlex(e.target.value))}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="racaCor" required>
                        Raça/cor
                      </FieldLabel>

                      <Select
                        value={form.racaCor}
                        onValueChange={(v) => {
                          if (visualizando) return;
                          set("racaCor", v as RacaCorApi);
                        }}
                        disabled={bloqueado}
                      >
                        <SelectTrigger id="racaCor">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent>
                          {racasCoresIntegrante.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="genero" required>
                        Gênero
                      </FieldLabel>

                      <Select
                        value={form.genero}
                        onValueChange={(v) => {
                          if (visualizando) return;
                          set("genero", v as GeneroApi);
                        }}
                        disabled={bloqueado}
                      >
                        <SelectTrigger id="genero">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent>
                          {generosIntegrante.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="tipoDeficiencia"
                        required
                        tooltip="Informe se o integrante possui alguma deficiência e, em caso positivo, selecione o tipo correspondente. Se não possuir, selecione Não possui. Caso essa informação não tenha sido fornecida ou não seja conhecida, selecione Não informado."
                      >
                        Deficiência
                      </FieldLabel>

                      <Select
                        value={form.tipoDeficiencia}
                        onValueChange={(v) => {
                          if (visualizando) return;

                          set("tipoDeficiencia", v as TipoDeficienciaApi);
                        }}
                        disabled={bloqueado}
                      >
                        <SelectTrigger id="tipoDeficiencia">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>

                        <SelectContent className="max-h-72">
                          {tiposDeficienciaIntegrante.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="telefone" required>
                        Telefone
                      </FieldLabel>

                      <Input
                        id="telefone"
                        value={form.telefone}
                        onChange={(e) =>
                          set("telefone", maskPhone(e.target.value))
                        }
                        inputMode="tel"
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email">E-mail</FieldLabel>

                      <EmailInput
                        id="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>
                  </>
                )}
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={MapPin}
              title="Endereço"
              description="Informe o endereço principal do integrante. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente."
            >
              <div className="grid gap-4 sm:grid-cols-6">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cep" required>
                    CEP
                  </FieldLabel>

                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => {
                      if (visualizando) return;

                      const cepFormatado = maskCEP(e.target.value);
                      set("cep", cepFormatado);

                      const cepLimpo = onlyDigits(cepFormatado);

                      if (cepLimpo.length === 8) {
                        void buscarEnderecoPorCep(cepFormatado);
                      }
                    }}
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />

                  {cepLoading && !visualizando && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Buscando endereço...
                    </p>
                  )}
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="logradouro" required>
                    Logradouro
                  </FieldLabel>

                  <Input
                    id="logradouro"
                    value={form.logradouro}
                    onChange={(e) => set("logradouro", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="numero" required>
                    Número
                  </FieldLabel>

                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => set("numero", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                  <Input
                    id="complemento"
                    value={form.complemento}
                    onChange={(e) => set("complemento", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="bairro" required>
                    Bairro
                  </FieldLabel>

                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => set("bairro", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cidade" required>
                    Cidade
                  </FieldLabel>

                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => set("cidade", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="estado" required>
                    Estado
                  </FieldLabel>

                  <Select
                    value={form.estado}
                    onValueChange={(v) => {
                      if (visualizando) return;
                      set("estado", v);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="estado">
                      <SelectValue placeholder="Selecione" />
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
            </FormSectionCard>

            <FormSectionCard
              icon={Building2}
              title="Vínculo institucional"
              description="Informe a organização à qual o integrante está vinculado, o tipo de vínculo e a função exercida."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="organizacaoId"
                    tooltip="Informe a organização junto à qual o integrante atua ou mantém vínculo."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={form.organizacaoId}
                    onValueChange={(v) => {
                      if (visualizando) return;
                      set("organizacaoId", v);
                    }}
                    disabled={bloqueado || organizacoes.length === 0}
                  >
                    <SelectTrigger id="organizacaoId">
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>

                    <SelectContent>
                      {organizacoes.length === 0 ? (
                        <SelectItem value="sem-organizacoes" disabled>
                          Nenhuma organização cadastrada
                        </SelectItem>
                      ) : (
                        organizacoes.map((org) => (
                          <SelectItem key={org.id} value={String(org.id)}>
                            {org.nomeOrganizacao}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoVinculoIntegrante"
                    tooltip="Informe a forma de vínculo ou participação do integrante junto à organização, quando aplicável."
                  >
                    Tipo de Vínculo
                  </FieldLabel>

                  <Select
                    value={form.tipoVinculoIntegrante || "__SELECIONE__"}
                    onValueChange={(v) => {
                      if (visualizando) return;

                      set(
                        "tipoVinculoIntegrante",
                        v === "__SELECIONE__"
                          ? ""
                          : (v as TipoVinculoIntegranteApi),
                      );
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="tipoVinculoIntegrante">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="__SELECIONE__">Selecione</SelectItem>

                      {tiposVinculoIntegrante.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="funcaoIntegrante"
                    required
                    tooltip="Informe a principal função, papel ou forma de atuação do integrante junto à organização e às suas atividades."
                  >
                    Função do Integrante
                  </FieldLabel>

                  <Input
                    id="funcaoIntegrante"
                    value={form.funcaoIntegrante}
                    onChange={(e) => set("funcaoIntegrante", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={CalendarClock}
              title="Período e situação"
              description="Informe quando o vínculo teve início e a situação atual do integrante na organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataEntrada"
                    required
                    tooltip="Informe a data em que o integrante iniciou sua atuação, participação ou vínculo com a organização."
                  >
                    Data de Entrada
                  </FieldLabel>

                  <Input
                    id="dataEntrada"
                    type="date"
                    value={form.dataEntrada}
                    onChange={(e) => set("dataEntrada", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required
                    tooltip="Informe a situação atual do integrante. Ativo indica participação em andamento; Pendente, vínculo ou cadastro em conferência; Concluído, participação finalizada; e Inativo, vínculo que não está mais em exercício."
                  >
                    Situação do Integrante
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(v) => {
                      if (visualizando) return;

                      setForm((prev) => ({
                        ...prev,
                        status: v as IntegranteStatusApi,
                        dataSaida: v === "CONCLUIDO" ? prev.dataSaida : "",
                      }));
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>

                      <SelectItem value="INATIVO">Inativo</SelectItem>

                      <SelectItem value="PENDENTE">Pendente</SelectItem>

                      <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {statusConcluido && (
                  <Field>
                    <FieldLabel
                      htmlFor="dataSaida"
                      required={!visualizando}
                      tooltip="Informe a data em que a participação ou o vínculo do integrante foi encerrado."
                    >
                      Data de Saída
                    </FieldLabel>

                    <Input
                      id="dataSaida"
                      type="date"
                      value={form.dataSaida}
                      onChange={(e) => set("dataSaida", e.target.value)}
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>
                )}
              </div>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/integrantes")}
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
                aria-busy={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>

        <WikiFloatingButton
          pageTitle="Integrantes"
          href="/wiki/pessoas/integrantes"
        />
      </div>
    </AppLayout>
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

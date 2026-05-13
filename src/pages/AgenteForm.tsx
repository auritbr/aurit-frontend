import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Building2,
  UserCog,
  Info,
  Users2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { maskCPF, maskPhone, maskCEP, maskDate, maskRG } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import {
  TipoAgente,
  tipoAgenteLabels,
  tipoAgenteDescricoes,
} from "@/data/agentes";
import { getJsonHeaders } from "@/lib/apiHeaders";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

interface PessoaFisica {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
}

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface PessoaJuridica {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
}

interface Coletivo {
  nome: string;
  dataCriacao: string;
}

interface AgenteDetalhadoDTO {
  id: number;
  tipoAgente: TipoAgente;

  nomeCompleto?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  dataFundacao?: string | null;

  nomeColetivo?: string | null;
  dataCriacaoColetivo?: string | null;

  nomeRepresentante?: string | null;
  dataNascimentoRepresentante?: string | null;
  cpfRepresentante?: string | null;
  rgRepresentante?: string | null;
  telefoneRepresentante?: string | null;
  emailRepresentante?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  organizacaoId?: number | null;
}

interface AgentePayload {
  tipoAgente: TipoAgente;
  pessoaFisica?: PessoaFisica | null;
  pessoaJuridica?: PessoaJuridica | null;
  coletivo?: Coletivo | null;
  representante?: PessoaFisica | null;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: number | null;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
  } | null;
}

const emptyPF: PessoaFisica = {
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",
};

const emptyEnd: Endereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

const emptyPJ: PessoaJuridica = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataFundacao: "",
};

const emptyCol: Coletivo = {
  nome: "",
  dataCriacao: "",
};

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function toDateInput(value?: string | null) {
  if (!value) return "";

  if (value.includes("/")) {
    return value;
  }

  if (value.length >= 10 && value.includes("-")) {
    const [year, month, day] = value.slice(0, 10).split("-");

    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  return value;
}

function limparPessoaFisica(data: PessoaFisica): PessoaFisica {
  return {
    nomeCompleto: data.nomeCompleto.trim(),
    dataNascimento: data.dataNascimento.trim(),
    cpf: onlyDigits(data.cpf),
    rg: data.rg.trim(),
    telefone: data.telefone.trim(),
    email: data.email.trim(),
  };
}

function limparPessoaJuridica(data: PessoaJuridica): PessoaJuridica {
  return {
    razaoSocial: data.razaoSocial.trim(),
    nomeFantasia: data.nomeFantasia.trim(),
    cnpj: onlyDigits(data.cnpj),
    dataFundacao: data.dataFundacao.trim(),
  };
}

function limparColetivo(data: Coletivo): Coletivo {
  return {
    nome: data.nome.trim(),
    dataCriacao: data.dataCriacao.trim(),
  };
}

function limparEndereco(data: Endereco): AgentePayload["endereco"] {
  return {
    cep: onlyDigits(data.cep),
    logradouro: data.logradouro.trim(),
    numero: data.numero.trim() ? Number(data.numero) : null,
    complemento: data.complemento.trim() || null,
    bairro: data.bairro.trim(),
    cidade: data.cidade.trim(),
    estado: data.estado.trim(),
  };
}

function ufToEstadoValue(uf?: string | null) {
  const value = normalizeText(uf).toUpperCase();

  if (!value) return "";

  const encontrado = estadosBrasil.find(
    (estado) => estado.toUpperCase() === value,
  );

  return encontrado ?? value;
}

function buildPayload(
  tipo: TipoAgente,
  pf: PessoaFisica,
  pj: PessoaJuridica,
  coletivo: Coletivo,
  representante: PessoaFisica,
  endereco: Endereco,
): AgentePayload {
  const isPJ =
    tipo === "MEI" ||
    tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS" ||
    tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS";

  const isPF = tipo === "PESSOA_FISICA";
  const isColetivo = tipo === "GRUPO_COLETIVO";

  return {
    tipoAgente: tipo,
    pessoaFisica: isPF ? limparPessoaFisica(pf) : null,
    pessoaJuridica: isPJ ? limparPessoaJuridica(pj) : null,
    coletivo: isColetivo ? limparColetivo(coletivo) : null,
    representante:
      isPJ || isColetivo ? limparPessoaFisica(representante) : null,
    endereco: limparEndereco(endereco),
  };
}

export default function AgenteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [tipo, setTipo] = useState<TipoAgente | "">("");
  const [pf, setPf] = useState<PessoaFisica>(emptyPF);
  const [pj, setPj] = useState<PessoaJuridica>(emptyPJ);
  const [coletivo, setColetivo] = useState<Coletivo>(emptyCol);
  const [representante, setRepresentante] = useState<PessoaFisica>(emptyPF);
  const [endereco, setEndereco] = useState<Endereco>(emptyEnd);

  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(!!id);
  const [loadingCep, setLoadingCep] = useState(false);

  const bloqueado = visualizando || loading || loadingInitialData;

  const setPF = <K extends keyof PessoaFisica>(
    k: K,
    v: PessoaFisica[K],
  ) => setPf((p) => ({ ...p, [k]: v }));

  const setPJ = <K extends keyof PessoaJuridica>(
    k: K,
    v: PessoaJuridica[K],
  ) => setPj((p) => ({ ...p, [k]: v }));

  const setCol = <K extends keyof Coletivo>(k: K, v: Coletivo[K]) =>
    setColetivo((p) => ({ ...p, [k]: v }));

  const setRep = <K extends keyof PessoaFisica>(
    k: K,
    v: PessoaFisica[K],
  ) => setRepresentante((p) => ({ ...p, [k]: v }));

  const setEnd = <K extends keyof Endereco>(k: K, v: Endereco[K]) =>
    setEndereco((p) => ({ ...p, [k]: v }));

  const isPJ =
    tipo === "MEI" ||
    tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS" ||
    tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS";

  const isPF = tipo === "PESSOA_FISICA";
  const isColetivo = tipo === "GRUPO_COLETIVO";

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function carregarAgente() {
      try {
        setLoadingInitialData(true);

        const response = await fetch(`${API_URL}/agentes/${id}/detalhado`, {
          method: "GET",
          headers: getJsonHeaders(),
        });

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const data: AgenteDetalhadoDTO = await response.json();

        if (!active) return;

        setTipo(data.tipoAgente ?? "");

        setPf({
          nomeCompleto: normalizeText(data.nomeCompleto),
          dataNascimento: toDateInput(data.dataNascimento),
          cpf: maskCPF(normalizeText(data.cpf)),
          rg: maskRG(normalizeText(data.rg)),
          telefone: maskPhone(normalizeText(data.telefone)),
          email: normalizeText(data.email),
        });

        setPj({
          razaoSocial: normalizeText(data.razaoSocial),
          nomeFantasia: normalizeText(data.nomeFantasia),
          cnpj: maskCNPJ(normalizeText(data.cnpj)),
          dataFundacao: toDateInput(data.dataFundacao),
        });

        setColetivo({
          nome: normalizeText(data.nomeColetivo),
          dataCriacao: toDateInput(data.dataCriacaoColetivo),
        });

        setRepresentante({
          nomeCompleto: normalizeText(data.nomeRepresentante),
          dataNascimento: toDateInput(data.dataNascimentoRepresentante),
          cpf: maskCPF(normalizeText(data.cpfRepresentante)),
          rg: maskRG(normalizeText(data.rgRepresentante)),
          telefone: maskPhone(normalizeText(data.telefoneRepresentante)),
          email: normalizeText(data.emailRepresentante),
        });

        setEndereco({
          cep: maskCEP(normalizeText(data.cep)),
          logradouro: normalizeText(data.logradouro),
          numero: normalizeText(data.numero),
          complemento: normalizeText(data.complemento),
          bairro: normalizeText(data.bairro),
          cidade: normalizeText(data.cidade),
          estado: ufToEstadoValue(data.estado),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao carregar agente.";

        toast.error(message);
        navigate("/agentes");
      } finally {
        if (active) {
          setLoadingInitialData(false);
        }
      }
    }

    void carregarAgente();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  async function buscarCep(value: string) {
    const cep = onlyDigits(value);

    if (cep.length !== 8 || visualizando) return;

    try {
      setLoadingCep(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      } = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setEndereco((prev) => ({
        ...prev,
        cep: maskCEP(cep),
        logradouro: data.logradouro ?? prev.logradouro,
        bairro: data.bairro ?? prev.bairro,
        cidade: data.localidade ?? prev.cidade,
        estado: ufToEstadoValue(data.uf) || prev.estado,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao consultar CEP.";

      toast.error(message);
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    if (!tipo) {
      toast.error("Selecione o tipo de agente.");
      return;
    }

    try {
      setLoading(true);

      const payload = buildPayload(
        tipo,
        pf,
        pj,
        coletivo,
        representante,
        endereco,
      );

      const response = await fetch(
        editando && id ? `${API_URL}/agentes/${id}` : `${API_URL}/agentes`,
        {
          method: editando && id ? "PUT" : "POST",
          headers: getJsonHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      toast.success(
        editando
          ? "Agente atualizado com sucesso."
          : "Agente cadastrado com sucesso.",
      );

      navigate("/agentes");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar agente.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/agentes")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Agente Cultural"
          tooltip="Cadastre o agente cultural responsável pela iniciativa. O agente é quem responde pelas informações, execução do projeto e prestação de contas."
        />

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold">Agente cultural</span> é a pessoa
            responsável pela iniciativa cultural. É quem responde pelas
            informações, execução do projeto e prestação de contas, mesmo
            quando a atividade está vinculada a uma organização, coletivo ou
            empresa.
          </p>
        </div>

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={UserCog} title="Tipo de agente">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="tipoAgente"
                  required
                  tooltip="Selecione o tipo de agente cultural que será cadastrado."
                >
                  Tipo de agente
                </FieldLabel>

                <Select
                  value={tipo}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    setTipo(v as TipoAgente);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoAgente">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {tipoAgenteLabels[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  disabled={bloqueado}
                  onClick={() => {
                    if (visualizando) return;
                    setTipo(k);
                  }}
                  className={`rounded border px-3 py-2.5 text-left text-[12px] leading-relaxed transition-colors disabled:cursor-default ${
                    tipo === k
                      ? "border-primary/40 bg-primary-soft"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <p className="font-semibold text-foreground text-[12.5px] mb-0.5">
                    {tipoAgenteLabels[k]}
                  </p>

                  <p className="text-muted-foreground">
                    {tipoAgenteDescricoes[k]}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {isPF && (
            <>
              <Section icon={User} title="Dados pessoais">
                <PessoaFisicaFields
                  data={pf}
                  set={setPF}
                  disabled={bloqueado}
                />
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={bloqueado}
                  loadingCep={loadingCep}
                  onCepBlur={buscarCep}
                />
              </Section>
            </>
          )}

          {isPJ && (
            <>
              <Section
                icon={Building2}
                title={
                  tipo === "MEI"
                    ? "Dados da pessoa jurídica"
                    : "Dados da organização"
                }
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field full>
                    <FieldLabel htmlFor="razaoSocial" required>
                      Razão Social
                    </FieldLabel>

                    <Input
                      id="razaoSocial"
                      value={pj.razaoSocial}
                      onChange={(e) =>
                        setPJ("razaoSocial", e.target.value)
                      }
                      disabled={bloqueado}
                    />
                  </Field>

                  <Field full>
                    <FieldLabel htmlFor="nomeFantasia">
                      Nome Fantasia
                    </FieldLabel>

                    <Input
                      id="nomeFantasia"
                      value={pj.nomeFantasia}
                      onChange={(e) =>
                        setPJ("nomeFantasia", e.target.value)
                      }
                      disabled={bloqueado}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cnpj" required>
                      CNPJ
                    </FieldLabel>

                    <Input
                      id="cnpj"
                      value={pj.cnpj}
                      onChange={(e) => setPJ("cnpj", maskCNPJ(e.target.value))}
                      inputMode="numeric"
                      disabled={bloqueado}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="dataFundacao" required>
                      Data de Fundação
                    </FieldLabel>

                    <Input
                      id="dataFundacao"
                      value={pj.dataFundacao}
                      onChange={(e) =>
                        setPJ("dataFundacao", maskDate(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={bloqueado}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={bloqueado}
                  loadingCep={loadingCep}
                  onCepBlur={buscarCep}
                />
              </Section>

              <Section icon={User} title="Dados do representante">
                <PessoaFisicaFields
                  data={representante}
                  set={setRep}
                  prefix="rep"
                  disabled={bloqueado}
                />
              </Section>
            </>
          )}

          {isColetivo && (
            <>
              <Section icon={Users2} title="Dados do coletivo">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field full>
                    <FieldLabel htmlFor="nomeColetivo" required>
                      Nome do Coletivo
                    </FieldLabel>

                    <Input
                      id="nomeColetivo"
                      value={coletivo.nome}
                      onChange={(e) => setCol("nome", e.target.value)}
                      disabled={bloqueado}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="dataCriacao" required>
                      Data de Criação
                    </FieldLabel>

                    <Input
                      id="dataCriacao"
                      value={coletivo.dataCriacao}
                      onChange={(e) =>
                        setCol("dataCriacao", maskDate(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={bloqueado}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={bloqueado}
                  loadingCep={loadingCep}
                  onCepBlur={buscarCep}
                />
              </Section>

              <Section icon={User} title="Dados do representante">
                <PessoaFisicaFields
                  data={representante}
                  set={setRep}
                  prefix="rep"
                  disabled={bloqueado}
                />
              </Section>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/agentes")}
              disabled={loading}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-32"
                disabled={loading || loadingInitialData}
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Cadastro de Agente Cultural"
        sections={[
          {
            title: "O que é um agente cultural?",
            content:
              "É a pessoa responsável pela iniciativa cultural — quem responde pelas informações, execução e prestação de contas.",
          },
          {
            title: "Como escolher o tipo?",
            content:
              "Selecione o tipo que melhor representa o responsável: pessoa física, MEI, pessoa jurídica com fins lucrativos, pessoa jurídica sem fins lucrativos ou coletivo.",
          },
          {
            title: "Quem é o representante?",
            content:
              "Para empresas, organizações ou coletivos, o representante é a pessoa física que responde pela iniciativa.",
          },
          {
            title: "Salvando",
            content:
              "Após preencher os campos obrigatórios, clique em Salvar no final da página.",
          },
        ]}
      />
    </AppLayout>
  );
}

function PessoaFisicaFields({
  data,
  set,
  prefix = "",
  disabled = false,
}: {
  data: PessoaFisica;
  set: <K extends keyof PessoaFisica>(k: K, v: PessoaFisica[K]) => void;
  prefix?: string;
  disabled?: boolean;
}) {
  const id = (s: string) => (prefix ? `${prefix}-${s}` : s);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field full>
        <FieldLabel htmlFor={id("nomeCompleto")} required>
          Nome Completo
        </FieldLabel>

        <Input
          id={id("nomeCompleto")}
          value={data.nomeCompleto}
          onChange={(e) => set("nomeCompleto", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={id("dataNascimento")} required>
          Data de Nascimento
        </FieldLabel>

        <Input
          id={id("dataNascimento")}
          value={data.dataNascimento}
          onChange={(e) => set("dataNascimento", maskDate(e.target.value))}
          inputMode="numeric"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={id("cpf")} required>
          CPF
        </FieldLabel>

        <Input
          id={id("cpf")}
          value={data.cpf}
          onChange={(e) => set("cpf", maskCPF(e.target.value))}
          inputMode="numeric"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel
          htmlFor={id("rg")}
          tooltip="Informe o RG do agente ou representante, quando houver."
        >
          RG
        </FieldLabel>

        <Input
          id={id("rg")}
          value={data.rg}
          onChange={(e) => set("rg", maskRG(e.target.value))}
          inputMode="text"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={id("telefone")} required>
          Telefone
        </FieldLabel>

        <Input
          id={id("telefone")}
          value={data.telefone}
          onChange={(e) => set("telefone", maskPhone(e.target.value))}
          inputMode="tel"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel
          htmlFor={id("email")}
          tooltip="Informe um e-mail válido para contato com o agente ou representante. Este campo pode ser usado em documentos, comunicações e registros institucionais."
        >
          E-mail
        </FieldLabel>

        <Input
          id={id("email")}
          type="email"
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function EnderecoFields({
  data,
  set,
  disabled = false,
  loadingCep = false,
  onCepBlur,
}: {
  data: Endereco;
  set: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
  disabled?: boolean;
  loadingCep?: boolean;
  onCepBlur?: (value: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-6 gap-4">
      <Field className="sm:col-span-2">
        <FieldLabel
          htmlFor="cep"
          required
          tooltip="Digite o CEP para preencher automaticamente logradouro, bairro, cidade e estado quando a informação estiver disponível."
        >
          CEP
        </FieldLabel>

        <Input
          id="cep"
          value={data.cep}
          onChange={(e) => set("cep", maskCEP(e.target.value))}
          onBlur={(e) => onCepBlur?.(e.target.value)}
          inputMode="numeric"
          disabled={disabled || loadingCep}
          placeholder={loadingCep ? "Consultando..." : undefined}
        />
      </Field>

      <Field className="sm:col-span-4">
        <FieldLabel htmlFor="logradouro" required>
          Logradouro
        </FieldLabel>

        <Input
          id="logradouro"
          value={data.logradouro}
          onChange={(e) => set("logradouro", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="numero" required>
          Número
        </FieldLabel>

        <Input
          id="numero"
          value={data.numero}
          onChange={(e) => set("numero", e.target.value)}
          inputMode="numeric"
          disabled={disabled}
        />
      </Field>

      <Field className="sm:col-span-4">
        <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

        <Input
          id="complemento"
          value={data.complemento}
          onChange={(e) => set("complemento", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="bairro" required>
          Bairro
        </FieldLabel>

        <Input
          id="bairro"
          value={data.bairro}
          onChange={(e) => set("bairro", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="cidade" required>
          Cidade
        </FieldLabel>

        <Input
          id="cidade"
          value={data.cidade}
          onChange={(e) => set("cidade", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="estado" required>
          Estado
        </FieldLabel>

        <Select
          value={data.estado}
          onValueChange={(v) => set("estado", v)}
          disabled={disabled}
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
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold text-foreground leading-tight uppercase tracking-wide">
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
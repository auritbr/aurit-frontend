import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import { EmailInput } from "@/components/EmailInput";
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
import { estadosBrasil } from "@/data/colaboradores";
import {
  type TipoAgente,
  tipoAgenteLabels,
  tipoAgenteDescricoes,
  getAgenteDetalhadoById,
  createAgente,
  updateAgente,
  sanitizePessoaFisicaInput,
  sanitizePessoaJuridicaInput,
  sanitizeColetivoInput,
  sanitizeEnderecoInput,
  inputMasks,
  type AgenteRequestDTO,
} from "@/data/agentes";
import { toast } from "sonner";

const AGENTE_NEXT_STEP_KEY = "aurit:agentes:next-step-card";

interface AgenteNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoAgente() {
  const card: AgenteNextStepCardData = {
    titulo: "Após cadastrar os agentes culturais, comece a organizar as pessoas da equipe",
    descricao:
      "Cadastre os colaboradores que atuam na organização para registrar funções, vínculos, carga horária e participação em projetos, atividades e prestações de contas.",
    acaoLabel: "Cadastrar colaboradores",
    acaoUrl: "/colaboradores/novo",
    acaoSecundariaLabel: "Ver agentes",
    acaoSecundariaUrl: "/agentes",
    variante: "pendente",
  };

  sessionStorage.setItem(AGENTE_NEXT_STEP_KEY, JSON.stringify(card));
}

const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

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

interface PessoaFisicaForm {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
}

interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface PessoaJuridicaForm {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
}

interface ColetivoForm {
  nome: string;
  dataCriacao: string;
}

const emptyPF: PessoaFisicaForm = {
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",
};

const emptyEnd: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

const emptyPJ: PessoaJuridicaForm = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataFundacao: "",
};

const emptyCol: ColetivoForm = {
  nome: "",
  dataCriacao: "",
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  estado?: string;
  erro?: boolean;
};

export default function AgenteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isViewMode = !!id && !location.pathname.endsWith("/editar");
  const isEditMode = !!id && location.pathname.endsWith("/editar");

  const [tipo, setTipo] = useState<TipoAgente | "">("");
  const [pf, setPf] = useState<PessoaFisicaForm>(emptyPF);
  const [pj, setPj] = useState<PessoaJuridicaForm>(emptyPJ);
  const [coletivo, setColetivo] = useState<ColetivoForm>(emptyCol);
  const [representante, setRepresentante] = useState<PessoaFisicaForm>(emptyPF);
  const [endereco, setEndereco] = useState<EnderecoForm>(emptyEnd);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const setPF = <K extends keyof PessoaFisicaForm>(
    k: K,
    v: PessoaFisicaForm[K],
  ) => setPf((p) => ({ ...p, [k]: v }));

  const setPJ = <K extends keyof PessoaJuridicaForm>(
    k: K,
    v: PessoaJuridicaForm[K],
  ) => setPj((p) => ({ ...p, [k]: v }));

  const setCol = <K extends keyof ColetivoForm>(
    k: K,
    v: ColetivoForm[K],
  ) => setColetivo((p) => ({ ...p, [k]: v }));

  const setRep = <K extends keyof PessoaFisicaForm>(
    k: K,
    v: PessoaFisicaForm[K],
  ) => setRepresentante((p) => ({ ...p, [k]: v }));

  const setEnd = <K extends keyof EnderecoForm>(
    k: K,
    v: EnderecoForm[K],
  ) => setEndereco((p) => ({ ...p, [k]: v }));

  const isPJ =
    tipo === "MEI" ||
    tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS" ||
    tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS";

  const isPF = tipo === "PESSOA_FISICA";
  const isColetivo = tipo === "GRUPO_COLETIVO";

  async function buscarEnderecoPorCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || isViewMode) return;

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!response.ok) return;

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setEndereco((prev) => ({
        ...prev,
        logradouro: data.logradouro ?? prev.logradouro,
        complemento: prev.complemento || data.complemento || "",
        bairro: data.bairro ?? prev.bairro,
        cidade: data.localidade ?? prev.cidade,
        estado: mapUfToEstado(data.estado) || prev.estado,
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Não foi possível buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  function mapUfToEstado(uf?: string) {
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

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const data = await getAgenteDetalhadoById(Number(id));

        setTipo(data.tipoAgente);

        if (data.tipoAgente === "PESSOA_FISICA") {
          setPf({
            nomeCompleto: data.nomeCompleto ?? "",
            dataNascimento: data.dataNascimento ?? "",
            cpf: data.cpf ?? "",
            rg: data.rg ?? "",
            telefone: data.telefone ?? "",
            email: data.email ?? "",
          });

          setEndereco({
            cep: data.cep ?? "",
            logradouro: data.logradouro ?? "",
            numero: data.numero ?? "",
            complemento: data.complemento ?? "",
            bairro: data.bairro ?? "",
            cidade: data.cidade ?? "",
            estado: data.estado ?? "",
          });
        }

        if (
          data.tipoAgente === "MEI" ||
          data.tipoAgente === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS" ||
          data.tipoAgente === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS"
        ) {
          setPj({
            razaoSocial: data.razaoSocial ?? "",
            nomeFantasia: data.nomeFantasia ?? "",
            cnpj: data.cnpj ?? "",
            dataFundacao: data.dataFundacao ?? "",
          });

          setEndereco({
            cep: data.cep ?? "",
            logradouro: data.logradouro ?? "",
            numero: data.numero ?? "",
            complemento: data.complemento ?? "",
            bairro: data.bairro ?? "",
            cidade: data.cidade ?? "",
            estado: data.estado ?? "",
          });

          setRepresentante({
            nomeCompleto: data.nomeRepresentante ?? "",
            dataNascimento: data.dataNascimentoRepresentante ?? "",
            cpf: data.cpfRepresentante ?? "",
            rg: data.rgRepresentante ?? "",
            telefone: data.telefoneRepresentante ?? "",
            email: data.emailRepresentante ?? "",
          });
        }

        if (data.tipoAgente === "GRUPO_COLETIVO") {
          setColetivo({
            nome: data.nomeColetivo ?? "",
            dataCriacao: data.dataCriacaoColetivo ?? "",
          });

          setEndereco({
            cep: data.cep ?? "",
            logradouro: data.logradouro ?? "",
            numero: data.numero ?? "",
            complemento: data.complemento ?? "",
            bairro: data.bairro ?? "",
            cidade: data.cidade ?? "",
            estado: data.estado ?? "",
          });

          setRepresentante({
            nomeCompleto: data.nomeRepresentante ?? "",
            dataNascimento: data.dataNascimentoRepresentante ?? "",
            cpf: data.cpfRepresentante ?? "",
            rg: data.rgRepresentante ?? "",
            telefone: data.telefoneRepresentante ?? "",
            email: data.emailRepresentante ?? "",
          });
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar agente.",
        );
        navigate("/agentes");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, navigate]);

  function validarEnderecoObrigatorio() {
    if (!endereco.cep.trim()) {
      toast.error("Informe o CEP.");
      return false;
    }

    if (!endereco.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return false;
    }

    if (!endereco.numero.trim()) {
      toast.error("Informe o número.");
      return false;
    }

    if (!endereco.bairro.trim()) {
      toast.error("Informe o bairro.");
      return false;
    }

    if (!endereco.cidade.trim()) {
      toast.error("Informe a cidade.");
      return false;
    }

    if (!endereco.estado.trim()) {
      toast.error("Informe o estado.");
      return false;
    }

    return true;
  }

  function validateForm() {
    if (!tipo) {
      toast.error("Selecione o tipo de agente.");
      return false;
    }

    if (isPF) {
      if (!pf.nomeCompleto.trim()) {
        toast.error("Informe o nome completo.");
        return false;
      }

      if (!pf.dataNascimento.trim()) {
        toast.error("Informe a data de nascimento.");
        return false;
      }

      if (!pf.cpf.trim()) {
        toast.error("Informe o CPF.");
        return false;
      }

      if (!pf.telefone.trim()) {
        toast.error("Informe o telefone.");
        return false;
      }

      if (!validarEnderecoObrigatorio()) {
        return false;
      }
    }

    if (isPJ) {
      if (!pj.razaoSocial.trim()) {
        toast.error("Informe a razão social.");
        return false;
      }

      if (!pj.cnpj.trim()) {
        toast.error("Informe o CNPJ.");
        return false;
      }

      if (!pj.dataFundacao.trim()) {
        toast.error("Informe a data de fundação.");
        return false;
      }

      if (!validarEnderecoObrigatorio()) {
        return false;
      }

      if (!representante.nomeCompleto.trim()) {
        toast.error("Informe o nome do representante.");
        return false;
      }

      if (!representante.dataNascimento.trim()) {
        toast.error("Informe a data de nascimento do representante.");
        return false;
      }

      if (!representante.cpf.trim()) {
        toast.error("Informe o CPF do representante.");
        return false;
      }

      if (!representante.telefone.trim()) {
        toast.error("Informe o telefone do representante.");
        return false;
      }
    }

    if (isColetivo) {
      if (!coletivo.nome.trim()) {
        toast.error("Informe o nome do coletivo.");
        return false;
      }

      if (!coletivo.dataCriacao.trim()) {
        toast.error("Informe a data de criação do coletivo.");
        return false;
      }

      if (!validarEnderecoObrigatorio()) {
        return false;
      }

      if (!representante.nomeCompleto.trim()) {
        toast.error("Informe o nome do representante.");
        return false;
      }

      if (!representante.dataNascimento.trim()) {
        toast.error("Informe a data de nascimento do representante.");
        return false;
      }

      if (!representante.cpf.trim()) {
        toast.error("Informe o CPF do representante.");
        return false;
      }

      if (!representante.telefone.trim()) {
        toast.error("Informe o telefone do representante.");
        return false;
      }
    }

    return true;
  }

  function buildPayload(): AgenteRequestDTO {
    const payload: AgenteRequestDTO = {
      tipoAgente: tipo as TipoAgente,
    };

    if (isPF) {
      payload.pessoaFisica = sanitizePessoaFisicaInput(pf);
      payload.endereco = sanitizeEnderecoInput(endereco);
    }

    if (isPJ) {
      payload.pessoaJuridica = sanitizePessoaJuridicaInput(pj);
      payload.representante = sanitizePessoaFisicaInput(representante);
      payload.endereco = sanitizeEnderecoInput(endereco);
    }

    if (isColetivo) {
      payload.coletivo = sanitizeColetivoInput(coletivo);
      payload.representante = sanitizePessoaFisicaInput(representante);
      payload.endereco = sanitizeEnderecoInput(endereco);
    }

    return payload;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isViewMode) return;

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      if (isEditMode && id) {
        await updateAgente(Number(id), payload);
        toast.success("Agente atualizado com sucesso.");
      } else {
        await createAgente(payload);
        salvarProximaAcaoAgente();
        toast.success("Agente salvo com sucesso.");
      }

      navigate("/agentes");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar agente.",
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
            Carregando agente...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/agentes")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Agente Cultural"
          tooltip="Cadastre o agente cultural responsável pela iniciativa. Esse cadastro identifica quem representa a ação cultural e pode ser utilizado em projetos, editais, documentos e prestações de contas."
        />

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />
          <p className="text-[13px] leading-relaxed text-foreground">
            O <span className="font-semibold">Agente Cultural</span> é quem
            representa a iniciativa cultural. Pode ser uma pessoa física, MEI,
            empresa, organização sem fins lucrativos ou coletivo. Esse cadastro
            ajuda a identificar quem está vinculado aos projetos, editais,
            documentos e prestações de contas.
          </p>
        </div>

        {isViewMode && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!isViewMode && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={UserCog} title="Tipo de agente">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="tipoAgente"
                  required
                  tooltip="Escolha a forma que melhor representa quem será cadastrado como agente cultural: pessoa física, MEI, empresa, organização sem fins lucrativos ou coletivo."
                >
                  Tipo de Agente
                </FieldLabel>

                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo(v as TipoAgente)}
                  disabled={loading || saving || isViewMode}
                >
                  <SelectTrigger id="tipoAgente">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {tipoAgenteLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map((k) => (
                <div
                  key={k}
                  className={`rounded border px-3 py-2.5 text-[12px] leading-relaxed transition-colors ${
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
                </div>
              ))}
            </div>
          </Section>

          {isPF && (
            <>
              <Section icon={User} title="Dados Pessoais">
                <PessoaFisicaFields
                  data={pf}
                  set={setPF}
                  disabled={loading || saving || isViewMode}
                />
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={loading || saving || isViewMode}
                  onCepResolved={buscarEnderecoPorCep}
                  cepLoading={cepLoading}
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
                    ? "Dados da Pessoa Jurídica"
                    : "Dados da Organização"
                }
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="razaoSocial" required>
                      Razão Social
                    </FieldLabel>

                    <Input
                      id="razaoSocial"
                      value={pj.razaoSocial}
                      onChange={(e) => setPJ("razaoSocial", e.target.value)}
                      disabled={loading || saving || isViewMode}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="nomeFantasia">
                      Nome Fantasia
                    </FieldLabel>

                    <Input
                      id="nomeFantasia"
                      value={pj.nomeFantasia}
                      onChange={(e) => setPJ("nomeFantasia", e.target.value)}
                      disabled={loading || saving || isViewMode}
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
                      disabled={loading || saving || isViewMode}
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
                        setPJ("dataFundacao", inputMasks.date(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={loading || saving || isViewMode}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={loading || saving || isViewMode}
                  onCepResolved={buscarEnderecoPorCep}
                  cepLoading={cepLoading}
                />
              </Section>

              <Section icon={User} title="Dados do Representante">
                <PessoaFisicaFields
                  data={representante}
                  set={setRep}
                  prefix="rep"
                  disabled={loading || saving || isViewMode}
                />
              </Section>
            </>
          )}

          {isColetivo && (
            <>
              <Section icon={Users2} title="Dados do coletivo">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="nomeColetivo" required>
                      Nome do Coletivo
                    </FieldLabel>

                    <Input
                      id="nomeColetivo"
                      value={coletivo.nome}
                      onChange={(e) => setCol("nome", e.target.value)}
                      disabled={loading || saving || isViewMode}
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
                        setCol("dataCriacao", inputMasks.date(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={loading || saving || isViewMode}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields
                  data={endereco}
                  set={setEnd}
                  disabled={loading || saving || isViewMode}
                  onCepResolved={buscarEnderecoPorCep}
                  cepLoading={cepLoading}
                />
              </Section>

              <Section icon={User} title="Dados do Representante">
                <PessoaFisicaFields
                  data={representante}
                  set={setRep}
                  prefix="rep"
                  disabled={loading || saving || isViewMode}
                />
              </Section>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/agentes")}
              disabled={loading || saving}
            >
              {isViewMode ? "Voltar" : "Cancelar"}
            </Button>

            {!isViewMode && (
              <Button
                type="submit"
                className="sm:min-w-32"
                disabled={loading || saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function PessoaFisicaFields({
  data,
  set,
  prefix = "",
  disabled = false,
}: {
  data: PessoaFisicaForm;
  set: <K extends keyof PessoaFisicaForm>(k: K, v: PessoaFisicaForm[K]) => void;
  prefix?: string;
  disabled?: boolean;
}) {
  const id = (s: string) => (prefix ? `${prefix}-${s}` : s);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field>
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
          onChange={(e) =>
            set("dataNascimento", inputMasks.date(e.target.value))
          }
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
          onChange={(e) => set("cpf", inputMasks.cpf(e.target.value))}
          inputMode="numeric"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={id("rg")}>RG</FieldLabel>

        <Input
          id={id("rg")}
          value={data.rg}
          onChange={(e) => set("rg", maskRGFlex(e.target.value))}
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
          onChange={(e) => set("telefone", inputMasks.phone(e.target.value))}
          inputMode="tel"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={id("email")}>E-mail</FieldLabel>

        <EmailInput
          id={id("email")}
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
  onCepResolved,
  cepLoading = false,
}: {
  data: EnderecoForm;
  set: <K extends keyof EnderecoForm>(k: K, v: EnderecoForm[K]) => void;
  disabled?: boolean;
  onCepResolved: (cep: string) => Promise<void>;
  cepLoading?: boolean;
}) {
  const handleCepChange = async (value: string) => {
    const cepFormatado = inputMasks.cep(value);
    set("cep", cepFormatado);

    const cepLimpo = cepFormatado.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      await onCepResolved(cepFormatado);
    }
  };

  return (
    <div className="grid sm:grid-cols-6 gap-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="cep" required>
          CEP
        </FieldLabel>

        <Input
          id="cep"
          value={data.cep}
          onChange={(e) => {
            void handleCepChange(e.target.value);
          }}
          inputMode="numeric"
          disabled={disabled}
        />

        {cepLoading && (
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
          onChange={(e) => set("numero", e.target.value.replace(/\D/g, ""))}
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
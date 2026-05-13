import { useEffect, useRef, useState } from "react";
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
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { maskCPF, maskPhone, maskCEP, maskDate } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import {
  TipoAgente,
  tipoAgenteLabels,
  tipoAgenteDescricoes,
} from "@/data/agentes";
import { getJsonHeaders } from "@/lib/apiHeaders";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const AGENTE_NEXT_STEP_KEY = "aurit:agentes:next-step-card";

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
  numero?: string | number | null;
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
    const ufDireta = estadosBrasil.find(
      (estado) => estado.toUpperCase() === rawUpper,
    );

    if (ufDireta) return ufDireta;

    const nomeEstado = estadosPorUf[rawUpper];

    if (nomeEstado) {
      const porNome = estadosBrasil.find(
        (estado) => normalizarChave(estado) === normalizarChave(nomeEstado),
      );

      if (porNome) return porNome;
    }
  }

  const ufPorNome = Object.entries(estadosPorUf).find(
    ([, nome]) => normalizarChave(nome) === normalizarChave(raw),
  )?.[0];

  if (ufPorNome) {
    const opcaoPorUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === ufPorNome,
    );

    if (opcaoPorUf) return opcaoPorUf;

    const opcaoPorNome = estadosBrasil.find(
      (estado) =>
        normalizarChave(estado) === normalizarChave(estadosPorUf[ufPorNome]),
    );

    if (opcaoPorNome) return opcaoPorNome;
  }

  const porNomeNormalizado = estadosBrasil.find(
    (estado) => normalizarChave(estado) === normalizarChave(raw),
  );

  return porNomeNormalizado ?? "";
}

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

function normalizeText(value?: string | number | null) {
  return value === null || value === undefined ? "" : String(value).trim();
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

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function limparPessoaFisica(data: PessoaFisica): PessoaFisica {
  return {
    nomeCompleto: data.nomeCompleto.trim(),
    dataNascimento: data.dataNascimento.trim(),
    cpf: onlyDigits(data.cpf),
    rg: data.rg.trim(),
    telefone: data.telefone.trim(),
    email: data.email.trim().toLowerCase(),
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
    numero: data.numero.trim() ? Number(data.numero.replace(/\D/g, "")) : null,
    complemento: data.complemento.trim() || null,
    bairro: data.bairro.trim(),
    cidade: data.cidade.trim(),
    estado: data.estado.trim(),
  };
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

function salvarProximaAcaoAgente() {
  const card = {
    titulo: "Após cadastrar o agente cultural, organize os projetos vinculados",
    descricao:
      "Com o agente cadastrado, você pode avançar para os projetos, registrando objetivos, público, acessibilidade, equipe responsável e informações importantes para editais e documentos institucionais.",
    acaoLabel: "Cadastrar projetos",
    acaoUrl: "/projetos/novo",
    acaoSecundariaLabel: "Ver agentes",
    acaoSecundariaUrl: "/agentes",
    variante: "pendente",
  };

  sessionStorage.setItem(AGENTE_NEXT_STEP_KEY, JSON.stringify(card));
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

  const ultimoCepConsultadoRef = useRef<string>("");

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
    if (!id) {
      setLoadingInitialData(false);
      return;
    }

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
          rg: maskRGFlex(normalizeText(data.rg)),
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
          rg: maskRGFlex(normalizeText(data.rgRepresentante)),
          telefone: maskPhone(normalizeText(data.telefoneRepresentante)),
          email: normalizeText(data.emailRepresentante),
        });

        const cep = maskCEP(normalizeText(data.cep));

        ultimoCepConsultadoRef.current = onlyDigits(cep);

        setEndereco({
          cep,
          logradouro: normalizeText(data.logradouro),
          numero: normalizeText(data.numero),
          complemento: normalizeText(data.complemento),
          bairro: normalizeText(data.bairro),
          cidade: normalizeText(data.cidade),
          estado: resolverEstadoParaSelect(data.estado),
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

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = onlyDigits(cepFormatado);

    if (cepLimpo.length !== 8 || visualizando) return;

    if (ultimoCepConsultadoRef.current === cepLimpo) return;

    try {
      setLoadingCep(true);
      ultimoCepConsultadoRef.current = cepLimpo;

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setEndereco((prev) => ({
        ...prev,
        cep: maskCEP(cepLimpo),
        logradouro: data.logradouro ?? "",
        complemento: prev.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: resolverEstadoParaSelect(data.uf ?? data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
      ultimoCepConsultadoRef.current = "";
    } finally {
      setLoadingCep(false);
    }
  }

  function validar() {
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

      if (onlyDigits(pf.cpf).length !== 11) {
        toast.error("Informe um CPF válido com 11 dígitos.");
        return false;
      }

      if (!pf.telefone.trim()) {
        toast.error("Informe o telefone.");
        return false;
      }

      if (pf.email && !isValidEmail(pf.email)) {
        toast.error("Informe um e-mail válido.");
        return false;
      }
    }

    if (isPJ) {
      if (!pj.razaoSocial.trim()) {
        toast.error("Informe a razão social.");
        return false;
      }

      if (onlyDigits(pj.cnpj).length !== 14) {
        toast.error("Informe um CNPJ válido com 14 dígitos.");
        return false;
      }

      if (!pj.dataFundacao.trim()) {
        toast.error("Informe a data de fundação.");
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
    }

    if (isPJ || isColetivo) {
      if (!representante.nomeCompleto.trim()) {
        toast.error("Informe o nome do representante.");
        return false;
      }

      if (!representante.dataNascimento.trim()) {
        toast.error("Informe a data de nascimento do representante.");
        return false;
      }

      if (onlyDigits(representante.cpf).length !== 11) {
        toast.error("Informe um CPF válido para o representante.");
        return false;
      }

      if (!representante.telefone.trim()) {
        toast.error("Informe o telefone do representante.");
        return false;
      }

      if (representante.email && !isValidEmail(representante.email)) {
        toast.error("Informe um e-mail válido para o representante.");
        return false;
      }
    }

    if (onlyDigits(endereco.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return false;
    }

    if (!endereco.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return false;
    }

    if (!endereco.numero.trim()) {
      toast.error("Informe o número do endereço.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;
    if (!validar()) return;

    try {
      setLoading(true);

      const payload = buildPayload(
        tipo as TipoAgente,
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

      if (!editando) {
        salvarProximaAcaoAgente();
      }

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

        {loadingInitialData ? (
          <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando agente cultural...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section icon={UserCog} title="Tipo de agente">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="tipoAgente"
                    required
                    tooltip="Selecione o tipo de agente cultural que será cadastrado."
                  >
                    Tipo de Agente
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
                    visualizando={visualizando}
                  />
                </Section>

                <Section icon={MapPin} title="Endereço">
                  <EnderecoFields
                    data={endereco}
                    set={setEnd}
                    disabled={bloqueado}
                    visualizando={visualizando}
                    loadingCep={loadingCep}
                    onCepChange={(cep) => void buscarEnderecoPorCep(cep)}
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
                        onChange={(e) => setPJ("razaoSocial", e.target.value)}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </Field>

                    <Field full>
                      <FieldLabel htmlFor="nomeFantasia">
                        Nome Fantasia
                      </FieldLabel>

                      <Input
                        id="nomeFantasia"
                        value={pj.nomeFantasia}
                        onChange={(e) => setPJ("nomeFantasia", e.target.value)}
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
                        value={pj.cnpj}
                        onChange={(e) => setPJ("cnpj", maskCNPJ(e.target.value))}
                        inputMode="numeric"
                        disabled={bloqueado}
                        readOnly={visualizando}
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
                        readOnly={visualizando}
                      />
                    </Field>
                  </div>
                </Section>

                <Section icon={MapPin} title="Endereço">
                  <EnderecoFields
                    data={endereco}
                    set={setEnd}
                    disabled={bloqueado}
                    visualizando={visualizando}
                    loadingCep={loadingCep}
                    onCepChange={(cep) => void buscarEnderecoPorCep(cep)}
                  />
                </Section>

                <Section icon={User} title="Dados do representante">
                  <PessoaFisicaFields
                    data={representante}
                    set={setRep}
                    prefix="rep"
                    disabled={bloqueado}
                    visualizando={visualizando}
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
                        readOnly={visualizando}
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
                        readOnly={visualizando}
                      />
                    </Field>
                  </div>
                </Section>

                <Section icon={MapPin} title="Endereço">
                  <EnderecoFields
                    data={endereco}
                    set={setEnd}
                    disabled={bloqueado}
                    visualizando={visualizando}
                    loadingCep={loadingCep}
                    onCepChange={(cep) => void buscarEnderecoPorCep(cep)}
                  />
                </Section>

                <Section icon={User} title="Dados do representante">
                  <PessoaFisicaFields
                    data={representante}
                    set={setRep}
                    prefix="rep"
                    disabled={bloqueado}
                    visualizando={visualizando}
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
                  disabled={loading || loadingInitialData || loadingCep}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </form>
        )}
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
  visualizando = false,
}: {
  data: PessoaFisica;
  set: <K extends keyof PessoaFisica>(k: K, v: PessoaFisica[K]) => void;
  prefix?: string;
  disabled?: boolean;
  visualizando?: boolean;
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
          readOnly={visualizando}
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
          readOnly={visualizando}
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
          readOnly={visualizando}
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
          onChange={(e) => set("rg", maskRGFlex(e.target.value))}
          inputMode="numeric"
          disabled={disabled}
          readOnly={visualizando}
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
          readOnly={visualizando}
        />
      </Field>

      <Field>
        <FieldLabel
          htmlFor={id("email")}
          tooltip="Informe um e-mail válido para contato com o agente ou representante. Este campo pode ser usado em documentos, comunicações e registros institucionais."
        >
          E-mail
        </FieldLabel>

        <EmailInput
          id={id("email")}
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
          disabled={disabled}
          readOnly={visualizando}
        />
      </Field>
    </div>
  );
}

function EnderecoFields({
  data,
  set,
  disabled = false,
  visualizando = false,
  loadingCep = false,
  onCepChange,
}: {
  data: Endereco;
  set: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
  disabled?: boolean;
  visualizando?: boolean;
  loadingCep?: boolean;
  onCepChange?: (value: string) => void;
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
          onChange={(e) => {
            if (visualizando) return;

            const cepFormatado = maskCEP(e.target.value);
            set("cep", cepFormatado);

            const cepLimpo = cepFormatado.replace(/\D/g, "");

            if (cepLimpo.length === 8) {
              onCepChange?.(cepFormatado);
            }
          }}
          inputMode="numeric"
          disabled={disabled || loadingCep}
          readOnly={visualizando}
          placeholder={loadingCep ? "Consultando..." : undefined}
        />

        {loadingCep && !visualizando && (
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
          readOnly={visualizando}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="numero" required>
          Número
        </FieldLabel>

        <Input
          id="numero"
          value={data.numero}
          onChange={(e) =>
            set("numero", e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          disabled={disabled}
          readOnly={visualizando}
        />
      </Field>

      <Field className="sm:col-span-4">
        <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

        <Input
          id="complemento"
          value={data.complemento}
          onChange={(e) => set("complemento", e.target.value)}
          disabled={disabled}
          readOnly={visualizando}
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
          readOnly={visualizando}
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
          readOnly={visualizando}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="estado" required>
          Estado
        </FieldLabel>

        <Select
          value={data.estado}
          onValueChange={(v) => {
            if (visualizando) return;
            set("estado", v);
          }}
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
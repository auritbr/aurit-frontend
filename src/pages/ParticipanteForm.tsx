import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  MapPin,
  ShieldCheck,
  Link2,
  Plus,
  Trash2,
  Info,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { maskCPF, maskPhone, maskCEP, maskDate } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import {
  buildParticipantePayload,
  createParticipante,
  getAtividadesOptions,
  getOrganizacoesParticipante,
  getParticipanteById,
  getTurmasOptions,
  isValidBrDate,
  onlyDigits,
  statusParticipante,
  statusMatriculaOptions,
  updateParticipante,
  type AtividadeOption,
  type OrganizacaoOption,
  type Participante,
  type ParticipanteVinculo,
  type TurmaOption,
} from "@/data/participantes";
import { toast } from "sonner";

const SEM_TURMA = "__SEM_TURMA__";
const PARTICIPANTE_NEXT_STEP_KEY = "aurit:participantes:next-step-card";

const STATUS_MATRICULA_FINAIS = [
  "CANCELADO",
  "DESISTENTE",
  "CONCLUIDO",
] as const;

interface ParticipanteNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoParticipante() {
  const card: ParticipanteNextStepCardData = {
    titulo: "Após cadastrar os participantes, organize os currículos da equipe",
    descricao:
      "Os currículos ajudam a registrar formações, experiências, competências e atuações dos colaboradores, fortalecendo a comprovação da capacidade técnica da equipe em projetos, editais e documentos institucionais.",
    acaoLabel: "Cadastrar currículos",
    acaoUrl: "/curriculos/novo",
    acaoSecundariaLabel: "Ver participantes",
    acaoSecundariaUrl: "/participantes",
    variante: "pendente",
  };

  sessionStorage.setItem(PARTICIPANTE_NEXT_STEP_KEY, JSON.stringify(card));
}

interface FormState {
  id: string;

  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;

  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  nomeResponsavel: string;
  cpfResponsavel: string;
  rgResponsavel: string;
  telefoneResponsavel: string;

  status: string;
  organizacaoId: string;

  vinculos: ParticipanteVinculo[];
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  estado?: string;
  erro?: boolean;
}

const novoVinculo = (): ParticipanteVinculo => ({
  atividadeId: "",
  turmaId: "",
  dataMatricula: "",
  atividadeExercida: "",
  statusMatricula: "",
});

const initial: FormState = {
  id: "",

  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",

  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",

  nomeResponsavel: "",
  cpfResponsavel: "",
  rgResponsavel: "",
  telefoneResponsavel: "",

  status: "",
  organizacaoId: "",

  vinculos: [],
};

function isMinor(dataNascimento: string) {
  if (!isValidBrDate(dataNascimento)) return false;

  const digits = onlyDigits(dataNascimento);
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  const birth = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age < 18;
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

function mapParticipanteToForm(participante: Participante): FormState {
  return {
    id: participante.id ?? "",

    nomeCompleto: participante.nomeCompleto ?? "",
    dataNascimento: participante.dataNascimento ?? "",
    cpf: participante.cpf ? maskCPF(participante.cpf) : "",
    rg: participante.rg ?? "",
    telefone: participante.telefone ? maskPhone(participante.telefone) : "",
    email: participante.email ?? "",

    cep: participante.cep ? maskCEP(participante.cep) : "",
    logradouro: participante.logradouro ?? "",
    numero: participante.numero ?? "",
    complemento: participante.complemento ?? "",
    bairro: participante.bairro ?? "",
    cidade: participante.cidade ?? "",
    estado: participante.estado ?? "",

    nomeResponsavel: participante.nomeResponsavel ?? "",
    cpfResponsavel: participante.cpfResponsavel
      ? maskCPF(participante.cpfResponsavel)
      : "",
    rgResponsavel: participante.rgResponsavel ?? "",
    telefoneResponsavel: participante.telefoneResponsavel
      ? maskPhone(participante.telefoneResponsavel)
      : "",

    status: participante.status ?? "",
    organizacaoId: participante.organizacaoId ?? "",

    vinculos: participante.vinculos ?? [],
  };
}

function formToParticipante(form: FormState): Participante {
  return {
    id: form.id,

    nomeCompleto: form.nomeCompleto,
    dataNascimento: form.dataNascimento,
    cpf: form.cpf,
    rg: form.rg,
    telefone: form.telefone,
    email: form.email,

    cep: form.cep,
    logradouro: form.logradouro,
    numero: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: form.estado,

    nomeResponsavel: form.nomeResponsavel,
    cpfResponsavel: form.cpfResponsavel,
    rgResponsavel: form.rgResponsavel,
    telefoneResponsavel: form.telefoneResponsavel,

    status: form.status,
    organizacaoId: form.organizacaoId,

    vinculos: form.vinculos,
  };
}

export default function ParticipanteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setVinculo = (idx: number, patch: Partial<ParticipanteVinculo>) => {
    setForm((p) => ({
      ...p,
      vinculos: p.vinculos.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  };

  const addVinculo = () => {
    if (visualizando) return;

    setForm((p) => ({
      ...p,
      vinculos: [...p.vinculos, novoVinculo()],
    }));
  };

  const removeVinculo = (idx: number) => {
    if (visualizando) return;

    setForm((p) => ({
      ...p,
      vinculos: p.vinculos.filter((_, i) => i !== idx),
    }));
  };

  const turmasPorAtividade = useMemo(
    () => (atividadeId: string) =>
      turmas.filter((t) => t.atividadeId === atividadeId),
    [turmas],
  );

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [atividadesData, turmasData, organizacoesData, participanteData] =
          await Promise.all([
            getAtividadesOptions(),
            getTurmasOptions(),
            getOrganizacoesParticipante(),
            id ? getParticipanteById(Number(id)) : Promise.resolve(null),
          ]);

        if (!active) return;

        setAtividades(atividadesData);
        setTurmas(turmasData);
        setOrganizacoes(organizacoesData);

        if (participanteData) {
          setForm(mapParticipanteToForm(participanteData));
        } else {
          setForm(initial);
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar formulário.",
        );

        if (id) {
          navigate("/participantes");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || visualizando) return;

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    if (!form.nomeCompleto.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }

    if (!form.dataNascimento.trim()) {
      toast.error("Informe a data de nascimento.");
      return;
    }

    if (!isValidBrDate(form.dataNascimento)) {
      toast.error("Informe uma data de nascimento válida.");
      return;
    }

    if (!form.telefone.trim()) {
      toast.error("Informe o telefone.");
      return;
    }

    if (!form.status) {
      toast.error("Selecione o status do participante.");
      return;
    }

    if (!form.cep.trim()) {
      toast.error("Informe o CEP.");
      return;
    }

    if (onlyDigits(form.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (!form.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return;
    }

    if (!form.numero.trim()) {
      toast.error("Informe o número.");
      return;
    }

    if (!form.cidade.trim()) {
      toast.error("Informe a cidade.");
      return;
    }

    if (!form.estado.trim()) {
      toast.error("Selecione o estado.");
      return;
    }

    if (isMinor(form.dataNascimento)) {
      if (!form.nomeResponsavel.trim()) {
        toast.error(
          "Informe o nome do responsável para participante menor de idade.",
        );
        return;
      }

      if (!form.cpfResponsavel.trim()) {
        toast.error(
          "Informe o CPF do responsável para participante menor de idade.",
        );
        return;
      }

      if (!form.telefoneResponsavel.trim()) {
        toast.error(
          "Informe o telefone do responsável para participante menor de idade.",
        );
        return;
      }
    }

    const vinculosPreenchidos = form.vinculos.filter((v) => {
      return (
        v.atividadeId ||
        v.turmaId ||
        v.dataMatricula.trim() ||
        v.atividadeExercida.trim() ||
        v.statusMatricula
      );
    });

    const chavesVinculos = new Set<string>();

    for (let i = 0; i < vinculosPreenchidos.length; i++) {
      const v = vinculosPreenchidos[i];

      if (!v.atividadeId) {
        toast.error(`Selecione a atividade do vínculo ${i + 1}.`);
        return;
      }

      if (!v.atividadeExercida.trim()) {
        toast.error(`Informe a forma de participação do vínculo ${i + 1}.`);
        return;
      }

      if (!v.dataMatricula.trim()) {
        toast.error(`Informe a data da matrícula do vínculo ${i + 1}.`);
        return;
      }

      if (!isValidBrDate(v.dataMatricula)) {
        toast.error(`Informe uma data de matrícula válida no vínculo ${i + 1}.`);
        return;
      }

      if (!v.statusMatricula) {
        toast.error(`Selecione o status da matrícula do vínculo ${i + 1}.`);
        return;
      }

      const chave = `${v.atividadeId}-${v.turmaId || "sem-turma"}`;

      if (chavesVinculos.has(chave)) {
        toast.error(
          `O vínculo ${i + 1} repete uma atividade/turma já informada.`,
        );
        return;
      }

      chavesVinculos.add(chave);
    }

    if (form.status === "CONCLUIDO" && vinculosPreenchidos.length > 0) {
      const indiceInvalido = vinculosPreenchidos.findIndex(
        (v) =>
          !STATUS_MATRICULA_FINAIS.includes(
            v.statusMatricula as (typeof STATUS_MATRICULA_FINAIS)[number],
          ),
      );

      if (indiceInvalido !== -1) {
        toast.error(
          `Para marcar o participante como concluído, a matrícula do vínculo ${
            indiceInvalido + 1
          } precisa estar como Cancelado, Desistente ou Concluído.`,
        );
        return;
      }
    }

    try {
      setSaving(true);

      const participante = formToParticipante({
        ...form,
        vinculos: vinculosPreenchidos,
      });

      const payload = buildParticipantePayload(participante);

      if (isEdit && id) {
        await updateParticipante(Number(id), payload);
        toast.success("Participante atualizado com sucesso.");
      } else {
        await createParticipante(payload);
        salvarProximaAcaoParticipante();
        toast.success("Participante salvo com sucesso.");
      }

      navigate("/participantes");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o participante.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/participantes")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Participante"
          tooltip="Cadastre e acompanhe os participantes da organização. O vínculo com atividades e turmas é opcional e deve ser preenchido apenas quando o participante estiver matriculado ou vinculado a uma ação específica."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="dados">Dados do Participante</TabsTrigger>
              <TabsTrigger value="vinculos">
                Matrículas em Atividades e Turmas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4 space-y-5">
              <Section icon={UserRound} title="Dados pessoais">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="nomeCompleto" required={!visualizando}>
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
                    <FieldLabel
                      htmlFor="dataNascimento"
                      required={!visualizando}
                    >
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
                    <FieldLabel htmlFor="cpf">CPF</FieldLabel>

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
                    <FieldLabel htmlFor="telefone" required={!visualizando}>
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
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="cep" required={!visualizando}>
                      CEP
                    </FieldLabel>

                    <Input
                      id="cep"
                      value={form.cep}
                      onChange={(e) => {
                        if (visualizando) return;

                        const cepFormatado = maskCEP(e.target.value);
                        set("cep", cepFormatado);

                        const cepLimpo = cepFormatado.replace(/\D/g, "");

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
                    <FieldLabel htmlFor="logradouro" required={!visualizando}>
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
                    <FieldLabel htmlFor="numero" required={!visualizando}>
                      Número
                    </FieldLabel>

                    <Input
                      id="numero"
                      value={form.numero}
                      onChange={(e) =>
                        set("numero", onlyDigits(e.target.value))
                      }
                      inputMode="numeric"
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
                    <FieldLabel htmlFor="bairro">Bairro</FieldLabel>

                    <Input
                      id="bairro"
                      value={form.bairro}
                      onChange={(e) => set("bairro", e.target.value)}
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="cidade" required={!visualizando}>
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
                    <FieldLabel htmlFor="estado" required={!visualizando}>
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
              </Section>

              <Section icon={ShieldCheck} title="Responsável e situação">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="nomeResponsavel"
                      tooltip="Informe o nome completo do responsável pelo participante, quando aplicável. Para participantes menores de idade, este campo deve ser preenchido."
                    >
                      Nome do Responsável
                    </FieldLabel>

                    <Input
                      id="nomeResponsavel"
                      value={form.nomeResponsavel}
                      onChange={(e) =>
                        set("nomeResponsavel", e.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="telefoneResponsavel"
                      tooltip="Informe um telefone de contato do responsável, quando aplicável."
                    >
                      Telefone do Responsável
                    </FieldLabel>

                    <Input
                      id="telefoneResponsavel"
                      value={form.telefoneResponsavel}
                      onChange={(e) =>
                        set("telefoneResponsavel", maskPhone(e.target.value))
                      }
                      inputMode="tel"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="cpfResponsavel"
                      tooltip="Informe o CPF do responsável, utilizando apenas números ou a máscara padrão. Para participantes menores de idade, este campo deve ser preenchido. Ex.: 123.456.789-00."
                    >
                      CPF do Responsável
                    </FieldLabel>

                    <Input
                      id="cpfResponsavel"
                      value={form.cpfResponsavel}
                      onChange={(e) =>
                        set("cpfResponsavel", maskCPF(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rgResponsavel">
                      RG do Responsável
                    </FieldLabel>

                    <Input
                      id="rgResponsavel"
                      value={form.rgResponsavel}
                      onChange={(e) =>
                        set("rgResponsavel", maskRGFlex(e.target.value))
                      }
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="status"
                      required={!visualizando}
                      tooltip="Indique a situação atual do participante no sistema. Use “Ativo” para participantes acompanhados pela organização, “Pendente” para cadastros em conferência, “Concluído” para participações finalizadas conforme previsto e “Inativo” para participantes que não devem mais ser considerados ativos."
                    >
                      Status do Participante
                    </FieldLabel>

                    <Select
                      value={form.status}
                      onValueChange={(v) => {
                        if (visualizando) return;
                        set("status", v);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {statusParticipante.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="organizacaoId"
                      tooltip="Selecione a organização à qual este participante está vinculado. Quando não informado, o backend deve vincular pela empresa logada."
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
                        <SelectValue placeholder="Vincular pela empresa logada" />
                      </SelectTrigger>

                      <SelectContent>
                        {organizacoes.length === 0 ? (
                          <SelectItem value="sem-organizacao" disabled>
                            Nenhuma organização cadastrada
                          </SelectItem>
                        ) : (
                          organizacoes.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="vinculos" className="mt-4 space-y-5">
              <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
                <Info
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                  strokeWidth={2.2}
                />

                <p className="text-[13px] leading-relaxed text-foreground">
                  Preencha esta seção apenas quando o participante estiver
                  matriculado ou vinculado a uma atividade específica. Para
                  realizar apenas o cadastro geral do participante, deixe estes
                  campos em branco.
                </p>
              </div>

              <Section
                icon={Link2}
                title="Matrículas em Atividades e Turmas"
                action={
                  !visualizando ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVinculo}
                      className="h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Atividade
                    </Button>
                  ) : null
                }
              >
                <div className="space-y-3">
                  {form.vinculos.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma matrícula vinculada. Utilize a opção{" "}
                      <span className="font-semibold">Adicionar Atividade</span>{" "}
                      para vincular este participante a uma atividade.
                    </p>
                  )}

                  {form.vinculos.map((v, idx) => {
                    const turmasDaAtividade = v.atividadeId
                      ? turmasPorAtividade(v.atividadeId)
                      : [];

                    const semTurmas =
                      !!v.atividadeId && turmasDaAtividade.length === 0;

                    return (
                      <div
                        key={`${idx}-${v.id ?? "novo"}`}
                        className="rounded border border-border bg-muted/20 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Vínculo {idx + 1}
                          </span>

                          {!visualizando && (
                            <button
                              type="button"
                              onClick={() => removeVinculo(idx)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                              aria-label={`Remover vínculo ${idx + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remover
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <FieldLabel
                              htmlFor={`atividade-${idx}`}
                              tooltip="Selecione a atividade apenas quando o participante estiver matriculado ou vinculado a uma ação específica. Para cadastro geral, deixe este campo em branco."
                            >
                              Atividade
                            </FieldLabel>

                            <Select
                              value={v.atividadeId}
                              onValueChange={(val) => {
                                if (visualizando) return;
                                setVinculo(idx, {
                                  atividadeId: val,
                                  turmaId: "",
                                });
                              }}
                              disabled={bloqueado}
                            >
                              <SelectTrigger id={`atividade-${idx}`}>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>

                              <SelectContent>
                                {atividades.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.nomeAtividade}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`turma-${idx}`}
                              tooltip="Selecione a turma específica, caso a atividade possua turmas. Quando não houver turma, deixe como sem turma específica."
                            >
                              Turma
                            </FieldLabel>

                            {semTurmas ? (
                              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                                Não se aplica
                              </div>
                            ) : (
                              <Select
                                value={v.turmaId || SEM_TURMA}
                                onValueChange={(val) => {
                                  if (visualizando) return;

                                  setVinculo(idx, {
                                    turmaId: val === SEM_TURMA ? "" : val,
                                  });
                                }}
                                disabled={bloqueado || !v.atividadeId}
                              >
                                <SelectTrigger id={`turma-${idx}`}>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectItem value={SEM_TURMA}>
                                    Sem turma específica
                                  </SelectItem>

                                  {turmasDaAtividade.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.nomeTurma}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`dataMatricula-${idx}`}
                              tooltip="Informe a data em que o participante foi matriculado ou passou a integrar a atividade ou turma."
                            >
                              Data da Matrícula
                            </FieldLabel>

                            <Input
                              id={`dataMatricula-${idx}`}
                              value={v.dataMatricula}
                              onChange={(e) => {
                                if (visualizando) return;

                                setVinculo(idx, {
                                  dataMatricula: maskDate(e.target.value),
                                });
                              }}
                              inputMode="numeric"
                              disabled={bloqueado}
                              readOnly={visualizando}
                            />
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`status-vinculo-${idx}`}
                              tooltip="Indique a situação da matrícula do participante nesta atividade ou turma. Esse status se refere apenas ao vínculo com a atividade selecionada, não ao cadastro geral do participante."
                            >
                              Status da Matrícula
                            </FieldLabel>

                            <Select
                              value={v.statusMatricula}
                              onValueChange={(val) => {
                                if (visualizando) return;
                                setVinculo(idx, { statusMatricula: val });
                              }}
                              disabled={bloqueado}
                            >
                              <SelectTrigger id={`status-vinculo-${idx}`}>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>

                              <SelectContent>
                                {statusMatriculaOptions.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2 lg:col-span-4">
                            <FieldLabel
                              htmlFor={`atividadeExercida-${idx}`}
                              tooltip="Informe como o participante participa ou atua nesta atividade ou turma. Ex.: aluno de violão, participante da oficina de teatro, coralista, brincante, aprendiz, monitor ou integrante do grupo."
                            >
                              Forma de Participação
                            </FieldLabel>

                            <Input
                              id={`atividadeExercida-${idx}`}
                              value={v.atividadeExercida}
                              onChange={(e) => {
                                if (visualizando) return;

                                setVinculo(idx, {
                                  atividadeExercida: e.target.value,
                                });
                              }}
                              disabled={bloqueado}
                              readOnly={visualizando}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/participantes")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: any;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2.5 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

          <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
            {title}
          </h2>
        </div>

        {action}
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
  children: ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  UserRound,
  MapPin,
  ShieldCheck,
  Link2,
  Plus,
  Trash2,
  Download,
  FilePlus2,
  FileText,
  Upload,
  X,
  Building2,
  CircleHelp,
  ArrowLeftRight,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { EmailInput } from "@/components/EmailInput";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/MultiSelect";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  getParticipanteDocumentoDownloadUrl,
  getTurmasOptions,
  isValidBrDate,
  onlyDigits,
  statusParticipante,
  statusMatriculaOptions,
  updateParticipante,
  generoOptions,
  racaCorOptions,
  faixaRendaOptions,
  niveisTurmaOptions,
  tipoDeficienciaParticipanteOptions,
  tipoDocumentoParticipanteOptions,
  tipoNeurodivergenciaOptions,
  type AtividadeOption,
  type OrganizacaoOption,
  type Participante,
  type ParticipanteVinculo,
  type TurmaOption,
  type TipoDeficienciaParticipante,
  type TipoDocumentoParticipante,
  type TipoNeurodivergencia,
} from "@/data/participantes";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  getPatrimonios,
  estadoConservacaoOptions,
  type Patrimonio,
} from "@/data/patrimonio";
import { getEmprestimos, type Emprestimo } from "@/data/emprestimos";

const SEM_TURMA = "__SEM_TURMA__";
const SEM_NIVEL_TURMA = "__SEM_NIVEL_TURMA__";
const SEM_PATRIMONIO = "__SEM_PATRIMONIO__";
const MAX_FILE_MB = 10;

const STATUS_MATRICULA_FINAIS = [
  "CANCELADO",
  "DESISTENTE",
  "CONCLUIDO",
] as const;

function salvarProximaAcaoParticipante() {
  emitJourneyNextStep();
}

interface FormState {
  id: string;

  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
  genero: string;
  racaCor: string;
  faixaRenda: string;
  possuiCadunico: boolean;
  possuiBolsaFamilia: boolean;
  tipoNeurodivergencias: TipoNeurodivergencia[];
  tipoDeficiencias: TipoDeficienciaParticipante[];
  tipoDocumentoParticipante: TipoDocumentoParticipante | "";
  urlDocumento: string;
  removerDocumento: boolean;

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
  organizacaoNome: string;

  vinculos: ParticipanteVinculo[];
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

const novoVinculo = (): ParticipanteVinculo => ({
  atividadeId: "",
  turmaId: "",
  dataMatricula: "",
  nivelTurma: "",
  statusMatricula: "",
  patrimonioId: "",
});

const initial: FormState = {
  id: "",

  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",
  genero: "",
  racaCor: "",
  faixaRenda: "",
  possuiCadunico: false,
  possuiBolsaFamilia: false,
  tipoNeurodivergencias: [],
  tipoDeficiencias: [],
  tipoDocumentoParticipante: "",
  urlDocumento: "",
  removerDocumento: false,

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
  organizacaoNome: "",

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

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
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

  return uf ? (mapa[uf] ?? "") : "";
}

function normalizarEstado(value?: string): string {
  if (!value) return "";

  const estado = value.trim();

  if (!estado) return "";

  if (estado.length === 2) {
    return mapUfToEstado(estado.toUpperCase());
  }

  const encontrado = estadosBrasil.find(
    (item) =>
      removerAcentos(item).toLowerCase() ===
      removerAcentos(estado).toLowerCase(),
  );

  if (encontrado) return encontrado;

  return formatarNomeEstado(estado);
}

function formatarNomeEstado(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((palavra) => {
      if (["de", "do", "da", "dos", "das"].includes(palavra)) {
        return palavra;
      }

      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

function removerAcentos(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getOrganizacaoId(organizacao?: OrganizacaoOption | null) {
  return organizacao ? String(organizacao.id) : "";
}

function getOrganizacaoNome(organizacao?: OrganizacaoOption | null) {
  return organizacao?.nome ?? "";
}

function mapParticipanteToForm(participante: Participante): FormState {
  return {
    id: participante.id ?? "",

    nomeCompleto: participante.nomeCompleto ?? "",
    dataNascimento: participante.dataNascimento ?? "",
    cpf: participante.cpf ? maskCPF(participante.cpf) : "",
    rg: participante.rg ? maskRGFlex(participante.rg) : "",
    telefone: participante.telefone ? maskPhone(participante.telefone) : "",
    email: participante.email ?? "",
    genero: participante.genero ?? "",
    racaCor: participante.racaCor ?? "",
    faixaRenda: participante.faixaRenda ?? "",
    possuiCadunico: Boolean(participante.possuiCadunico),
    possuiBolsaFamilia: Boolean(participante.possuiBolsaFamilia),
    tipoNeurodivergencias: Array.isArray(participante.tipoNeurodivergencias)
      ? (participante.tipoNeurodivergencias as TipoNeurodivergencia[])
      : participante.tipoNeurodivergencias
        ? [participante.tipoNeurodivergencias as TipoNeurodivergencia]
        : [],
    tipoDeficiencias: Array.isArray(participante.tipoDeficiencias)
      ? (participante.tipoDeficiencias as TipoDeficienciaParticipante[])
      : participante.tipoDeficiencias
        ? [participante.tipoDeficiencias as TipoDeficienciaParticipante]
        : [],
    tipoDocumentoParticipante:
      (participante.tipoDocumentoParticipante as TipoDocumentoParticipante) ??
      "",
    urlDocumento: participante.urlDocumento ?? "",
    removerDocumento: false,

    cep: participante.cep ? maskCEP(participante.cep) : "",
    logradouro: participante.logradouro ?? "",
    numero: participante.numero ?? "",
    complemento: participante.complemento ?? "",
    bairro: participante.bairro ?? "",
    cidade: participante.cidade ?? "",
    estado: normalizarEstado(participante.estado),

    nomeResponsavel: participante.nomeResponsavel ?? "",
    cpfResponsavel: participante.cpfResponsavel
      ? maskCPF(participante.cpfResponsavel)
      : "",
    rgResponsavel: participante.rgResponsavel
      ? maskRGFlex(participante.rgResponsavel)
      : "",
    telefoneResponsavel: participante.telefoneResponsavel
      ? maskPhone(participante.telefoneResponsavel)
      : "",

    status: participante.status ?? "",
    organizacaoId: participante.organizacaoId
      ? String(participante.organizacaoId)
      : "",
    organizacaoNome: participante.organizacaoNome ?? "",

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
    genero: form.genero,
    racaCor: form.racaCor,
    faixaRenda: form.faixaRenda,
    possuiCadunico: form.possuiCadunico,
    possuiBolsaFamilia: form.possuiBolsaFamilia,
    tipoNeurodivergencias: form.tipoNeurodivergencias,
    tipoDeficiencias: form.tipoDeficiencias,
    tipoDocumentoParticipante: form.tipoDocumentoParticipante,
    urlDocumento: form.urlDocumento,
    removerDocumento: form.removerDocumento,

    cep: form.cep,
    logradouro: form.logradouro,
    numero: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: normalizarEstado(form.estado),

    nomeResponsavel: form.nomeResponsavel,
    cpfResponsavel: form.cpfResponsavel,
    rgResponsavel: form.rgResponsavel,
    telefoneResponsavel: form.telefoneResponsavel,

    status: form.status,
    organizacaoId: form.organizacaoId,
    organizacaoNome: form.organizacaoNome,

    vinculos: form.vinculos,
  };
}

function isAllowedDocumentoParticipante(file: File) {
  const allowed = ["pdf", "png", "jpg", "jpeg", "webp"];
  const extension = file.name.split(".").pop()?.toLowerCase();

  return !!extension && allowed.includes(extension);
}

function getNomeArquivoDocumento(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").filter(Boolean).pop();

    return filename ? decodeURIComponent(filename) : "Documento anexado";
  } catch {
    const filename = url.split("/").filter(Boolean).pop();

    return filename ? decodeURIComponent(filename) : "Documento anexado";
  }
}

function dataMatriculaToTimestamp(data?: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data?.trim() ?? "");

  if (!match) return null;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);

  const date = new Date(ano, mes - 1, dia);

  const dataValida =
    date.getFullYear() === ano &&
    date.getMonth() === mes - 1 &&
    date.getDate() === dia;

  return dataValida ? date.getTime() : null;
}

const tipoNeurodivergenciaValues = tipoNeurodivergenciaOptions.map(
  (item) => item.value,
);

const tipoDeficienciaValues = tipoDeficienciaParticipanteOptions.map(
  (item) => item.value,
);

const getTipoNeurodivergenciaLabel = (value: string) =>
  tipoNeurodivergenciaOptions.find((item) => item.value === value)?.label ??
  value;

const getTipoDeficienciaLabel = (value: string) =>
  tipoDeficienciaParticipanteOptions.find((item) => item.value === value)
    ?.label ?? value;

export default function ParticipanteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingParticipante, setExistingParticipante] =
    useState<Participante | null>(null);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [documento, setDocumento] = useState<File | null>(null);
  const [documentoNome, setDocumentoNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const conversionSeed = (
    location.state as { conversionSeed?: { data?: Partial<FormState> } } | null
  )?.conversionSeed;

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
      turmas.filter((t) => String(t.atividadeId) === String(atividadeId)),
    [turmas],
  );

  const turmasAtivasPorAtividade = useMemo(
    () => (atividadeId: string, turmaSelecionadaId?: string) =>
      turmasPorAtividade(atividadeId).filter(
        (turma) =>
          turma.status === "ATIVO" ||
          String(turma.id) === String(turmaSelecionadaId),
      ),
    [turmasPorAtividade],
  );

  const patrimoniosDisponiveis = useMemo(
    () => patrimonios.filter((item) => item.statusPatrimonio !== "BAIXADO"),
    [patrimonios],
  );

  const organizacoesOptions = useMemo(() => {
    const options = [...organizacoes];

    const organizacaoId =
      form.organizacaoId ||
      String(existingParticipante?.organizacaoId ?? "") ||
      String(organizacoes[0]?.id ?? "");

    const organizacaoNome =
      form.organizacaoNome ||
      existingParticipante?.organizacaoNome ||
      organizacoes[0]?.nome ||
      (organizacaoId ? `Organização ${organizacaoId}` : "");

    if (
      organizacaoId &&
      !options.some((org) => String(org.id) === String(organizacaoId))
    ) {
      options.unshift({
        id: organizacaoId,
        nome: organizacaoNome,
      });
    }

    return options;
  }, [
    organizacoes,
    form.organizacaoId,
    form.organizacaoNome,
    existingParticipante,
  ]);

  const organizacaoSelectValue =
    form.organizacaoId ||
    String(existingParticipante?.organizacaoId ?? "") ||
    String(organizacoes[0]?.id ?? "");

  const vinculosOrdenados = useMemo(
    () =>
      form.vinculos
        .map((v, originalIndex) => ({
          v,
          originalIndex,
        }))
        .sort((a, b) => {
          const dataA = dataMatriculaToTimestamp(a.v.dataMatricula);
          const dataB = dataMatriculaToTimestamp(b.v.dataMatricula);

          if (dataA === null && dataB === null) {
            return a.originalIndex - b.originalIndex;
          }

          if (dataA === null) return 1;
          if (dataB === null) return -1;

          return dataB - dataA;
        }),
    [form.vinculos],
  );

  useImportFormFill("participantes", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [
          atividadesData,
          turmasData,
          organizacoesData,
          participanteData,
          patrimoniosData,
          emprestimosData,
        ] = await Promise.all([
          getAtividadesOptions(),
          getTurmasOptions(),
          getOrganizacoesParticipante(),
          id || duplicarId
            ? getParticipanteById(Number(id ?? duplicarId))
            : Promise.resolve(null),
          getPatrimonios().catch(() => [] as Patrimonio[]),
          getEmprestimos().catch(() => [] as Emprestimo[]),
        ]);

        if (!active) return;

        const organizacaoPadrao = organizacoesData[0] ?? null;

        setAtividades(atividadesData);
        setTurmas(turmasData);
        setOrganizacoes(organizacoesData);
        setPatrimonios(patrimoniosData);
        setEmprestimos(emprestimosData);

        if (participanteData) {
          const mapped = mapParticipanteToForm(participanteData);

          setExistingParticipante(duplicarId ? null : participanteData);

          setForm({
            ...mapped,
            id: duplicarId ? "" : mapped.id,
            nomeCompleto: duplicarId
              ? `Cópia de ${mapped.nomeCompleto}`
              : mapped.nomeCompleto,
            cpf: duplicarId ? "" : mapped.cpf,
            urlDocumento: duplicarId ? "" : mapped.urlDocumento,
            vinculos: duplicarId ? [] : mapped.vinculos,
            organizacaoId:
              mapped.organizacaoId || getOrganizacaoId(organizacaoPadrao),
            organizacaoNome:
              mapped.organizacaoNome || getOrganizacaoNome(organizacaoPadrao),
          });
          setDocumento(null);
          setDocumentoNome(
            !duplicarId && mapped.urlDocumento
              ? getNomeArquivoDocumento(mapped.urlDocumento)
              : "",
          );
        } else {
          setExistingParticipante(null);
          setDocumento(null);
          setDocumentoNome("");

          setForm({
            ...initial,
            ...conversionSeed?.data,
            organizacaoId:
              conversionSeed?.data?.organizacaoId ||
              getOrganizacaoId(organizacaoPadrao),
            organizacaoNome:
              conversionSeed?.data?.organizacaoNome ||
              getOrganizacaoNome(organizacaoPadrao),
          });
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar formulário.",
        );

        if (id || duplicarId) {
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
  }, [conversionSeed?.data, duplicarId, id, navigate]);

  const handleDocumentoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (visualizando) return;

    const file = event.target.files?.[0];

    if (!file) return;

    if (!isAllowedDocumentoParticipante(file)) {
      toast.error("Formato não permitido. Envie PDF, PNG, JPG, JPEG ou WEBP.");
      event.target.value = "";
      return;
    }

    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > MAX_FILE_MB) {
      toast.error("O documento deve ter no máximo 10 MB.");
      event.target.value = "";
      return;
    }

    setDocumento(file);
    setDocumentoNome(file.name);
    setForm((prev) => ({
      ...prev,
      removerDocumento: false,
    }));
  };

  const removeDocumento = () => {
    if (visualizando) return;

    setDocumento(null);
    setDocumentoNome("");
    setForm((prev) => ({
      ...prev,
      urlDocumento: "",
      removerDocumento: Boolean(prev.urlDocumento),
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAbrirDocumento = async () => {
    const participanteId = Number(id || form.id);

    if (!participanteId) {
      toast.error("Participante não identificado.");
      return;
    }

    if (!form.urlDocumento) {
      toast.info("Nenhum documento anexado.");
      return;
    }

    try {
      const urlTemporaria =
        await getParticipanteDocumentoDownloadUrl(participanteId);

      window.open(urlTemporaria, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o documento.",
      );
    }
  };

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

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
        estado: mapUfToEstado(data.uf),
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

    const organizacaoId =
      form.organizacaoId ||
      String(existingParticipante?.organizacaoId ?? "") ||
      String(organizacoes[0]?.id ?? "");

    const organizacaoSelecionada = organizacoesOptions.find(
      (org) => String(org.id) === String(organizacaoId),
    );

    const formComOrganizacao: FormState = {
      ...form,
      organizacaoId,
      organizacaoNome:
        form.organizacaoNome ||
        organizacaoSelecionada?.nome ||
        existingParticipante?.organizacaoNome ||
        "",
    };

    if (!formComOrganizacao.nomeCompleto.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }

    if (!formComOrganizacao.dataNascimento.trim()) {
      toast.error("Informe a data de nascimento.");
      return;
    }

    if (!isValidBrDate(formComOrganizacao.dataNascimento)) {
      toast.error("Informe uma data de nascimento válida.");
      return;
    }

    if (!formComOrganizacao.telefone.trim()) {
      toast.error("Informe o telefone.");
      return;
    }

    if (!formComOrganizacao.status) {
      toast.error("Selecione o status do participante.");
      return;
    }

    if (!formComOrganizacao.organizacaoId) {
      toast.error("Selecione a organização.");
      return;
    }

    if (!formComOrganizacao.cep.trim()) {
      toast.error("Informe o CEP.");
      return;
    }

    if (onlyDigits(formComOrganizacao.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (!formComOrganizacao.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return;
    }

    if (!formComOrganizacao.numero.trim()) {
      toast.error("Informe o número.");
      return;
    }

    if (!formComOrganizacao.cidade.trim()) {
      toast.error("Informe a cidade.");
      return;
    }

    if (!formComOrganizacao.estado.trim()) {
      toast.error("Selecione o estado.");
      return;
    }

    if (isMinor(formComOrganizacao.dataNascimento)) {
      if (!formComOrganizacao.nomeResponsavel.trim()) {
        toast.error(
          "Informe o nome do responsável para participante menor de idade.",
        );
        return;
      }

      if (!formComOrganizacao.cpfResponsavel.trim()) {
        toast.error(
          "Informe o CPF do responsável para participante menor de idade.",
        );
        return;
      }

      if (!formComOrganizacao.telefoneResponsavel.trim()) {
        toast.error(
          "Informe o telefone do responsável para participante menor de idade.",
        );
        return;
      }
    }

    const vinculosPreenchidos = formComOrganizacao.vinculos.filter((v) => {
      return (
        v.atividadeId ||
        v.turmaId ||
        v.dataMatricula.trim() ||
        v.nivelTurma ||
        v.statusMatricula ||
        v.patrimonioId
      );
    });

    const chavesVinculos = new Set<string>();

    for (let i = 0; i < vinculosPreenchidos.length; i++) {
      const v = vinculosPreenchidos[i];

      if (!v.atividadeId) {
        toast.error(`Selecione a atividade do vínculo ${i + 1}.`);
        return;
      }

      if (!v.dataMatricula.trim()) {
        toast.error(`Informe a data da matrícula do vínculo ${i + 1}.`);
        return;
      }

      if (!isValidBrDate(v.dataMatricula)) {
        toast.error(
          `Informe uma data de matrícula válida no vínculo ${i + 1}.`,
        );
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

    if (
      formComOrganizacao.status === "CONCLUIDO" &&
      vinculosPreenchidos.length > 0
    ) {
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

      const vinculosNormalizados = vinculosPreenchidos.map((v) => {
        const turmaSelecionada = v.turmaId
          ? turmasPorAtividade(v.atividadeId).find(
              (t) => String(t.id) === String(v.turmaId),
            )
          : null;

        return {
          ...v,
          nivelTurma: turmaSelecionada?.nivelTurma
            ? v.nivelTurma || turmaSelecionada.nivelTurma
            : "",
        };
      });

      const participante = formToParticipante({
        ...formComOrganizacao,
        vinculos: vinculosNormalizados,
      });

      const payload = buildParticipantePayload(participante);

      if (isEdit && id) {
        await updateParticipante(Number(id), payload, documento);
        toast.success("Participante atualizado com sucesso.");
      } else {
        await createParticipante(payload, documento);
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
        <BackButton to="/participantes" />

        <PageTitle
          title="Participantes"
          tooltip="Nesta página são cadastrados e acompanhados os participantes da organização, com informações pessoais, sociais, de acessibilidade, endereço, documentos, responsável legal quando menor de idade e vínculo institucional. A associação com atividades e turmas é opcional e deve ser informada apenas quando o participante fizer parte de uma atividade ou turma específica."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/participantes")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-[12px] border border-border/70 bg-card/70 p-1 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md supports-[backdrop-filter]:bg-card/55 sm:inline-flex sm:w-auto">
              <TabsTrigger
                value="dados"
                className="rounded-[8px] data-[state=active]:bg-background/75 data-[state=active]:backdrop-blur-sm"
              >
                Dados do Participante
              </TabsTrigger>
              <TabsTrigger
                value="vinculos"
                className="rounded-[8px] data-[state=active]:bg-background/75 data-[state=active]:backdrop-blur-sm"
              >
                Matrículas
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
                    <FieldLabel htmlFor="cpf" required={!visualizando}>
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
                    <FieldLabel
                      htmlFor="racaCor"
                      tooltip="Informe a raça ou cor autodeclarada pelo participante. Essa informação pode ser utilizada no acompanhamento do perfil do público atendido, em relatórios, editais e prestações de contas."
                    >
                      Raça/cor
                    </FieldLabel>

                    <Select
                      value={form.racaCor}
                      onValueChange={(v) => {
                        if (visualizando) return;
                        set("racaCor", v);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="racaCor">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {racaCorOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="genero"
                      tooltip="Informe o gênero autodeclarado pelo participante, quando essa informação for necessária para acompanhamento, relatórios, editais ou prestação de contas."
                    >
                      Gênero
                    </FieldLabel>

                    <Select
                      value={form.genero}
                      onValueChange={(v) => {
                        if (visualizando) return;
                        set("genero", v);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="genero">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {generoOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              <Section
                icon={FilePlus2}
                title="Informações sociais e de acessibilidade"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="faixaRenda"
                      tooltip="Informe a faixa de renda familiar declarada pelo participante ou responsável, quando essa informação estiver disponível."
                    >
                      Faixa de Renda Familiar
                    </FieldLabel>

                    <Select
                      value={form.faixaRenda}
                      onValueChange={(v) => {
                        if (visualizando) return;
                        set("faixaRenda", v);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="faixaRenda">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {faixaRendaOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <label
                          htmlFor="possuiCadunico"
                          className="cursor-pointer truncate text-sm text-foreground"
                        >
                          Possui CadÚnico?
                        </label>

                        <InlineTooltip content="Informe se o participante possui inscrição no Cadastro Único. Essa informação pode ser utilizada na identificação do perfil socioeconômico e em projetos, editais ou relatórios." />
                      </div>

                      <Switch
                        id="possuiCadunico"
                        checked={form.possuiCadunico}
                        onCheckedChange={(value) => {
                          if (visualizando) return;
                          set("possuiCadunico", value);
                        }}
                        disabled={bloqueado}
                      />
                    </div>
                  </Field>

                  <Field>
                    <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <label
                          htmlFor="possuiBolsaFamilia"
                          className="cursor-pointer truncate text-sm text-foreground"
                        >
                          Possui Bolsa Família?
                        </label>

                        <InlineTooltip content="Informe se o participante ou sua família recebe o Bolsa Família. Essa informação pode ser utilizada na identificação do perfil socioeconômico e em projetos, editais ou relatórios." />
                      </div>

                      <Switch
                        id="possuiBolsaFamilia"
                        checked={form.possuiBolsaFamilia}
                        onCheckedChange={(value) => {
                          if (visualizando) return;
                          set("possuiBolsaFamilia", value);
                        }}
                        disabled={bloqueado}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="tipoNeurodivergencias"
                      tooltip="Informe as neurodivergências declaradas pelo participante ou responsável, quando houver. Essa informação pode auxiliar no planejamento de acompanhamento, acessibilidade e adaptações necessárias."
                    >
                      Tipos de Neurodivergências
                    </FieldLabel>

                    <div
                      className={
                        bloqueado ? "pointer-events-none opacity-80" : ""
                      }
                    >
                      <MultiSelect
                        id="tipoNeurodivergencias"
                        options={tipoNeurodivergenciaValues}
                        value={form.tipoNeurodivergencias}
                        onChange={(value) => {
                          if (visualizando) return;

                          set(
                            "tipoNeurodivergencias",
                            value as TipoNeurodivergencia[],
                          );
                        }}
                        getOptionLabel={getTipoNeurodivergenciaLabel}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="tipoDeficiencias"
                      tooltip="Informe os tipos de deficiência declarados pelo participante ou responsável, quando houver. Essa informação pode auxiliar no planejamento de acessibilidade, adaptações e acompanhamento das atividades."
                    >
                      Tipos de Deficiência
                    </FieldLabel>

                    <div
                      className={
                        bloqueado ? "pointer-events-none opacity-80" : ""
                      }
                    >
                      <MultiSelect
                        id="tipoDeficiencias"
                        options={tipoDeficienciaValues}
                        value={form.tipoDeficiencias}
                        onChange={(value) => {
                          if (visualizando) return;

                          set(
                            "tipoDeficiencias",
                            value as TipoDeficienciaParticipante[],
                          );
                        }}
                        getOptionLabel={getTipoDeficienciaLabel}
                      />
                    </div>
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
                      onChange={(e) => {
                        if (visualizando) return;
                        set("numero", e.target.value);
                      }}
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
                    <FieldLabel htmlFor="bairro" required={!visualizando}>
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

              <Section icon={ShieldCheck} title="Responsável">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="nomeResponsavel"
                      tooltip="Informe o nome completo do responsável pelo participante, quando aplicável. Para participantes menores de idade, deve ser informado o responsável legal."
                    >
                      Nome do Responsável
                    </FieldLabel>

                    <Input
                      id="nomeResponsavel"
                      value={form.nomeResponsavel}
                      onChange={(e) => set("nomeResponsavel", e.target.value)}
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="cpfResponsavel"
                      tooltip="Informe o CPF do responsável legal, quando aplicável."
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
                      htmlFor="telefoneResponsavel"
                      tooltip="Informe o principal telefone utilizado para contato com o responsável, quando aplicável."
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
                </div>
              </Section>

              <Section icon={Building2} title="Vínculo institucional">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="organizacaoId"
                      tooltip="Informe a organização à qual o participante está vinculado."
                    >
                      Organização
                    </FieldLabel>

                    <Select
                      value={organizacaoSelectValue}
                      onValueChange={(v) => {
                        if (visualizando) return;

                        const organizacaoSelecionada = organizacoesOptions.find(
                          (org) => String(org.id) === String(v),
                        );

                        setForm((prev) => ({
                          ...prev,
                          organizacaoId: String(v),
                          organizacaoNome:
                            organizacaoSelecionada?.nome ??
                            prev.organizacaoNome,
                        }));
                      }}
                      disabled={bloqueado || organizacoesOptions.length === 0}
                    >
                      <SelectTrigger id="organizacaoId">
                        <SelectValue placeholder="Selecione uma organização" />
                      </SelectTrigger>

                      <SelectContent>
                        {organizacoesOptions.length === 0 ? (
                          <SelectItem value="sem-organizacao" disabled>
                            Nenhuma organização cadastrada
                          </SelectItem>
                        ) : (
                          organizacoesOptions.map((org) => (
                            <SelectItem
                              key={String(org.id)}
                              value={String(org.id)}
                            >
                              {org.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="status"
                      required={!visualizando}
                      tooltip="Informe a situação atual do participante. Ativo indica participação em andamento; Pendente, cadastro ou vínculo em conferência; Concluído, participação finalizada; e Inativo, participante que não está mais em acompanhamento."
                    >
                      Situação do Participante
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
                </div>
              </Section>

              <Section icon={FilePlus2} title="Documentos">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="tipoDocumentoParticipante"
                      tooltip="Informe o tipo correspondente ao documento que será anexado ao cadastro do participante."
                    >
                      Tipo de Documento
                    </FieldLabel>

                    <Select
                      value={form.tipoDocumentoParticipante}
                      onValueChange={(value) => {
                        if (visualizando) return;

                        set(
                          "tipoDocumentoParticipante",
                          value as TipoDocumentoParticipante,
                        );
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="tipoDocumentoParticipante">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {tipoDocumentoParticipanteOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="anexoDocumento"
                      tooltip="Anexe o arquivo correspondente ao tipo de documento selecionado."
                    >
                      Arquivo do Documento
                    </FieldLabel>

                    <input
                      ref={fileInputRef}
                      id="anexoDocumento"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleDocumentoFile}
                      disabled={bloqueado}
                    />

                    {documentoNome || form.urlDocumento ? (
                      <div className="attachment-file-glass flex h-10 items-center gap-2 px-3">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />

                        <span
                          className="flex-1 truncate text-sm text-foreground"
                          title={documentoNome || "Documento anexado"}
                        >
                          {documentoNome || "Documento anexado"}
                        </span>

                        {form.urlDocumento && !documento && (
                          <button
                            type="button"
                            onClick={handleAbrirDocumento}
                            disabled={loading || saving}
                            className="text-muted-foreground transition-colors hover:text-primary"
                            aria-label="Baixar ou visualizar documento"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}

                        {!visualizando && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="glassSecondary"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={loading || saving}
                            >
                              Substituir
                            </Button>
                            <button
                              type="button"
                              onClick={removeDocumento}
                              disabled={loading || saving}
                              className="text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="Remover documento"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : visualizando ? (
                      <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                        Nenhum documento anexado
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="h-9 gap-2 px-4"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={bloqueado}
                      >
                        <Upload className="h-4 w-4" />
                        Selecionar arquivo
                      </Button>
                    )}
                  </Field>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="vinculos" className="mt-4 space-y-5">
              <PageObjective
                className="mb-5"
                variant="primary"
                label="Preencha esta seção"
                icon={Link2}
                description=" quando o participante fizer parte de uma atividade ou turma cadastrada na organização. Caso esteja realizando apenas o cadastro geral do participante, não é necessário adicionar vínculos."
              />

              <Section
                icon={Link2}
                title="Vínculos com atividades e turmas"
                action={
                  !visualizando ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVinculo}
                      className="h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar atividade
                    </Button>
                  ) : null
                }
              >
                <div className="space-y-3">
                  {form.vinculos.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atividade vinculada. Utilize a opção{" "}
                      <span className="font-semibold">Adicionar atividade</span>{" "}
                      para registrar a participação em uma atividade ou turma.
                    </p>
                  )}

                  {vinculosOrdenados.map(({ v, originalIndex }, idx) => {
                    const turmasDaAtividade = v.atividadeId
                      ? turmasAtivasPorAtividade(v.atividadeId, v.turmaId)
                      : [];

                    const atividadesParaMatricula = atividades.filter(
                      (atividade) =>
                        atividade.status === "ATIVO" ||
                        String(atividade.id) === String(v.atividadeId),
                    );

                    const semTurmas =
                      !!v.atividadeId && turmasDaAtividade.length === 0;

                    const turmaSelecionada = v.turmaId
                      ? turmasDaAtividade.find(
                          (t) => String(t.id) === String(v.turmaId),
                        )
                      : null;

                    const nivelTurmaDaTurma =
                      turmaSelecionada?.nivelTurma ?? "";

                    const nivelTurmaValue = v.nivelTurma || nivelTurmaDaTurma;

                    const nivelTurmaBloqueado =
                      !v.atividadeId ||
                      semTurmas ||
                      !v.turmaId ||
                      !nivelTurmaDaTurma;

                    const nivelTurmaMensagem = !v.atividadeId
                      ? "Selecione uma atividade"
                      : semTurmas || !v.turmaId
                        ? "Não se aplica"
                        : "Turma sem nível cadastrado";

                    const patrimonioSelecionado = v.patrimonioId
                      ? (patrimoniosDisponiveis.find(
                          (item) => String(item.id) === String(v.patrimonioId),
                        ) ?? null)
                      : null;

                    const emprestimoAtivo = v.patrimonioId
                      ? (emprestimos.find(
                          (item) =>
                            item.patrimonioId === String(v.patrimonioId) &&
                            ["EM_ANDAMENTO", "ATRASADO"].includes(
                              item.statusEmprestimo,
                            ),
                        ) ?? null)
                      : null;

                    return (
                      <div
                        key={`${originalIndex}-${v.id ?? "novo"}`}
                        className="rounded-[12px] border border-border/70 bg-card/70 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/55"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Vínculo {idx + 1}
                          </span>

                          {!visualizando && (
                            <button
                              type="button"
                              onClick={() => removeVinculo(originalIndex)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                              aria-label={`Remover vínculo ${idx + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <FieldLabel
                              htmlFor={`atividade-${originalIndex}`}
                              tooltip="Informe a atividade da qual o participante faz parte."
                            >
                              Atividade
                            </FieldLabel>

                            <Select
                              value={v.atividadeId}
                              onValueChange={(val) => {
                                if (visualizando) return;

                                setVinculo(originalIndex, {
                                  atividadeId: val,
                                  turmaId: "",
                                  nivelTurma: "",
                                });
                              }}
                              disabled={bloqueado}
                            >
                              <SelectTrigger id={`atividade-${originalIndex}`}>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>

                              <SelectContent>
                                {[...atividadesParaMatricula]
                                  .sort((a, b) =>
                                    a.nomeAtividade.localeCompare(
                                      b.nomeAtividade,
                                      "pt-BR",
                                      {
                                        sensitivity: "base",
                                      },
                                    ),
                                  )
                                  .map((a) => (
                                    <SelectItem
                                      key={String(a.id)}
                                      value={String(a.id)}
                                    >
                                      {a.nomeAtividade}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`turma-${originalIndex}`}
                              tooltip="Informe a turma da qual o participante faz parte, quando a atividade estiver organizada em turmas."
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

                                  const turmaSelecionada =
                                    val === SEM_TURMA
                                      ? null
                                      : turmasDaAtividade.find(
                                          (t) => String(t.id) === String(val),
                                        );

                                  setVinculo(originalIndex, {
                                    turmaId: val === SEM_TURMA ? "" : val,
                                    nivelTurma:
                                      turmaSelecionada?.nivelTurma ?? "",
                                  });
                                }}
                                disabled={bloqueado || !v.atividadeId}
                              >
                                <SelectTrigger id={`turma-${originalIndex}`}>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectItem value={SEM_TURMA}>
                                    Sem turma específica
                                  </SelectItem>

                                  {[...turmasDaAtividade]
                                    .sort((a, b) =>
                                      a.nomeTurma.localeCompare(
                                        b.nomeTurma,
                                        "pt-BR",
                                        {
                                          sensitivity: "base",
                                        },
                                      ),
                                    )
                                    .map((t) => (
                                      <SelectItem
                                        key={String(t.id)}
                                        value={String(t.id)}
                                      >
                                        {t.nomeTurma}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <FieldLabel
                              htmlFor={`patrimonio-${originalIndex}`}
                              tooltip="Selecione, quando aplicável, um patrimônio ou equipamento associado ao participante durante suas atividades. O vínculo não registra automaticamente um empréstimo."
                            >
                              Patrimônio Vinculado
                            </FieldLabel>

                            <Select
                              value={v.patrimonioId || SEM_PATRIMONIO}
                              onValueChange={(value) => {
                                if (visualizando) return;
                                setVinculo(originalIndex, {
                                  patrimonioId:
                                    value === SEM_PATRIMONIO ? "" : value,
                                });
                              }}
                              disabled={bloqueado}
                            >
                              <SelectTrigger id={`patrimonio-${originalIndex}`}>
                                <SelectValue placeholder="Selecione um patrimônio" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SEM_PATRIMONIO}>
                                  Selecione
                                </SelectItem>
                                {patrimoniosDisponiveis.map((patrimonio) => (
                                  <SelectItem
                                    key={patrimonio.id}
                                    value={String(patrimonio.id)}
                                  >
                                    {patrimonio.numeroPatrimonio} —{" "}
                                    {patrimonio.nomePatrimonio}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`nivelTurma-${originalIndex}`}
                              tooltip="Informe o nível correspondente à turma do participante. Quando a turma possuir um nível cadastrado, essa informação será preenchida automaticamente."
                            >
                              Nível da Turma
                            </FieldLabel>

                            <Select
                              value={nivelTurmaValue || SEM_NIVEL_TURMA}
                              onValueChange={(val) => {
                                if (visualizando || nivelTurmaBloqueado) return;

                                setVinculo(originalIndex, {
                                  nivelTurma:
                                    val === SEM_NIVEL_TURMA ? "" : val,
                                });
                              }}
                              disabled={bloqueado || nivelTurmaBloqueado}
                            >
                              <SelectTrigger id={`nivelTurma-${originalIndex}`}>
                                <SelectValue placeholder={nivelTurmaMensagem} />
                              </SelectTrigger>

                              <SelectContent>
                                {nivelTurmaBloqueado ? (
                                  <SelectItem value={SEM_NIVEL_TURMA}>
                                    {nivelTurmaMensagem}
                                  </SelectItem>
                                ) : (
                                  niveisTurmaOptions.map((nivel) => (
                                    <SelectItem
                                      key={nivel.value}
                                      value={nivel.value}
                                    >
                                      {nivel.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <FieldLabel
                              htmlFor={`dataMatricula-${originalIndex}`}
                              tooltip="Informe a data em que o participante começou a fazer parte da atividade ou turma."
                            >
                              Data de Matrícula
                            </FieldLabel>

                            <Input
                              id={`dataMatricula-${originalIndex}`}
                              value={v.dataMatricula}
                              onChange={(e) => {
                                if (visualizando) return;

                                setVinculo(originalIndex, {
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
                              htmlFor={`status-vinculo-${originalIndex}`}
                              tooltip="Informe a situação atual da participação do participante nesta atividade ou turma."
                            >
                              Situação da Matrícula
                            </FieldLabel>

                            <Select
                              value={v.statusMatricula}
                              onValueChange={(val) => {
                                if (visualizando) return;

                                setVinculo(originalIndex, {
                                  statusMatricula: val,
                                });
                              }}
                              disabled={bloqueado}
                            >
                              <SelectTrigger
                                id={`status-vinculo-${originalIndex}`}
                              >
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
                        </div>

                        {patrimonioSelecionado && (
                          <PatrimonioVinculoInfo
                            participanteId={id}
                            patrimonio={patrimonioSelecionado}
                            emprestimoAtivo={emprestimoAtivo}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/participantes")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving || loading}
                aria-busy={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>

        <WikiFloatingButton
          pageTitle="Participantes"
          href="https://www.aurit.com.br/wiki/pessoas/participantes"
        />
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
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const descriptions: Record<string, string> = {
    "Dados pessoais":
      "Informe os principais dados pessoais, de identificação e contato do participante.",

    "Informações sociais e de acessibilidade":
      "Informe dados relacionados à situação socioeconômica, programas sociais, acessibilidade e necessidades específicas do participante, quando aplicável.",

    Endereço:
      "Informe o endereço principal do participante. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente.",

    Responsável:
      "Informe os dados do responsável legal pelo participante quando ele for menor de idade. Para participantes maiores de idade, esta seção não precisa ser preenchida.",

    "Vínculo institucional":
      "Informe a organização à qual o participante está vinculado e sua situação atual.",

    Documentos:
      "Selecione o tipo de documento e anexe o arquivo correspondente, quando necessário.",

    "Vínculos com atividades e turmas":
      "Informe as atividades das quais o participante faz parte e, quando aplicável, as turmas correspondentes.",
  };

  return (
    <FormSectionCard
      icon={Icon}
      title={title}
      description={descriptions[title]}
    >
      {action && <div className="mb-4 flex justify-end">{action}</div>}
      {children}
    </FormSectionCard>
  );
}

function PatrimonioVinculoInfo({
  participanteId,
  patrimonio,
  emprestimoAtivo,
}: {
  participanteId?: string;
  patrimonio: Patrimonio;
  emprestimoAtivo: Emprestimo | null;
}) {
  const emprestadoAoParticipante =
    !!participanteId &&
    emprestimoAtivo?.participanteId === String(participanteId);

  const estadoConservacao =
    estadoConservacaoOptions.find(
      (item) => item.value === patrimonio.estadoConservacao,
    )?.label ?? patrimonio.estadoConservacao;

  const params = new URLSearchParams({
    patrimonioId: String(patrimonio.id),
    tipoDestinatario: "PARTICIPANTE",
    participanteId: participanteId ?? "",
    dataEmprestimo: formatarDataAtual(),
    estadoConservacao: patrimonio.estadoConservacao,
    returnTo: participanteId
      ? `/participantes/${participanteId}/editar`
      : "/participantes",
  });

  const actionClass =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border border-primary/25 bg-primary-soft/50 px-3 text-xs font-medium text-primary backdrop-blur-sm transition-colors hover:bg-primary-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-[12px] border border-border/70 bg-background/50 px-3.5 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {patrimonio.numeroPatrimonio} — {patrimonio.nomePatrimonio}
        </p>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Conservação na saída: {estadoConservacao}.{" "}
          {emprestadoAoParticipante
            ? "Empréstimo ativo para este participante."
            : emprestimoAtivo
              ? "Este patrimônio possui empréstimo ativo para outro destinatário."
              : "Nenhum empréstimo ativo registrado."}
        </p>
      </div>

      {participanteId &&
        (emprestadoAoParticipante ? (
          <Link
            to={`/emprestimos/${emprestimoAtivo.id}`}
            className={actionClass}
          >
            <PackageCheck className="h-3.5 w-3.5" aria-hidden />
            Ver empréstimo
          </Link>
        ) : emprestimoAtivo ? null : (
          <Link
            to={`/emprestimos/novo?${params.toString()}`}
            className={actionClass}
            title="Registrar a entrega deste patrimônio ao participante"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
            Registrar empréstimo
          </Link>
        ))}
    </div>
  );
}

function formatarDataAtual() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${hoje.getFullYear()}`;
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

function InlineTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            aria-label="Ajuda sobre o campo"
            tabIndex={0}
          >
            <CircleHelp className="h-3.5 w-3.5" strokeWidth={2.3} />
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs text-xs leading-relaxed"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

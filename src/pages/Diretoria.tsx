import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  FileText,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  FileDown,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { EmailInput } from "@/components/EmailInput";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { maskCEP, maskCPF, maskPhone } from "@/lib/masks";
import {
  converterDiretoriaParaColaborador,
  estadosBrasil,
} from "@/data/colaboradores";
import { exportDiretoriaPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildDiretoriaPayload,
  cargoDiretoriaLabel,
  cargosDiretoria,
  createDiretoria,
  createEmptyDiretoria,
  deleteDiretoria,
  formatDateBR,
  generoDiretoriaLabel,
  generosDiretoria,
  getDiretorias,
  getOrganizacoesDiretoria,
  racaCorDiretoriaLabel,
  racasCoresDiretoria,
  statusDiretoriaLabel,
  statusDiretoriaOptions,
  tipoDeficienciaDiretoriaLabel,
  tiposDeficienciaDiretoria,
  updateDiretoria,
  type DiretoriaData,
  type GeneroApi,
  type OrganizacaoDiretoriaOption,
  type RacaCorApi,
  type TipoDeficienciaApi,
} from "@/lib/diretoriaStore";
import { toast } from "sonner";

type SortKey = "nome" | "cargo" | "inicioMandato" | "fimMandato" | "afastamento" | "status" | "organizacao";

type FormMode = "create" | "edit" | "view";

const DIRETORIA_NEXT_STEP_KEY = "aurit:diretoria:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface DiretoriaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
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

const requiredFields: Array<[keyof DiretoriaData, string]> = [
  ["nomeCompleto", "Nome Completo"],
  ["dataNascimento", "Data de Nascimento"],
  ["cpf", "CPF"],
  ["racaCor", "Raça/Cor"],
  ["genero", "Gênero"],
  ["tipoDeficiencia", "Deficiência"],
  ["telefone", "Telefone"],
  ["cargoDiretoria", "Cargo na Diretoria"],
  ["dataInicioMandato", "Data de Início do Mandato"],
  ["dataFimMandato", "Data de Fim do Mandato"],
  ["statusDiretoria", "Status da Diretoria"],
  ["cep", "CEP"],
  ["logradouro", "Logradouro"],
  ["numero", "Número"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
];

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

const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function limparNumeros(value: string) {
  return value.replace(/\D/g, "");
}

function isStatusEncerrado(status: string) {
  return status?.toUpperCase() === "ENCERRADO";
}

function isStatusAfastado(status: string) {
  return status?.toUpperCase() === "AFASTADO";
}

function salvarProximaAcaoDiretoria() {
  const card: DiretoriaNextStepCardData = {
    titulo: "Após cadastrar a Diretoria, organize os Documentos Institucionais",
    descricao:
      "Documentos atualizados ajudam a comprovar a regularidade da organização e podem ser exigidos em editais, habilitações, contratos, relatórios e prestações de contas.",
    acaoLabel: "Cadastrar documentos",
    acaoUrl: "/documentos",
    acaoSecundariaLabel: "Ver diretoria",
    acaoSecundariaUrl: "/diretoria",
    variante: "pendente",
  };

  sessionStorage.setItem(DIRETORIA_NEXT_STEP_KEY, JSON.stringify(card));
}

export default function Diretoria() {
  const navigate = useNavigate();
  const location = useLocation();
  const [organizacoes, setOrganizacoes] = useState<
    OrganizacaoDiretoriaOption[]
  >([]);
  const [registros, setRegistros] = useState<DiretoriaData[]>([]);
  const [form, setForm] = useState<DiretoriaData>(() =>
    createEmptyDiretoria(),
  );
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<DiretoriaNextStepCardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const tableRef = useRef<HTMLTableElement>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const readOnly = mode === "view";
  const bloqueado = readOnly || saving;

  const statusEncerrado = isStatusEncerrado(form.statusDiretoria);
  const statusAfastado = isStatusAfastado(form.statusDiretoria);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("DIRETORIA");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(DIRETORIA_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DiretoriaNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(DIRETORIA_NEXT_STEP_KEY);

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  useEffect(() => {
    if (loading || showForm) return;

    const params = new URLSearchParams(location.search);
    const editarId = params.get("editar");

    if (!editarId) return;

    const record = registros.find((item) => String(item.id) === editarId);

    if (!record) return;

    if (!podeEditar) {
      toast.error("Você não possui permissão para editar registros da diretoria.");
      navigate("/diretoria", { replace: true });
      return;
    }

    setSelectedId(record.id);
    setForm({
      ...record,
      estado: resolverEstadoParaSelect(record.estado),
    });
    setMode("edit");
    setShowForm(true);
    navigate("/diretoria", { replace: true });
  }, [loading, location.search, navigate, podeEditar, registros, showForm]);

  async function carregar() {
    try {
      setLoading(true);

      const [diretoriasData, organizacoesData] = await Promise.all([
        getDiretorias(),
        getOrganizacoesDiretoria(),
      ]);

      setRegistros(
        diretoriasData.map((item) => ({
          ...item,
          cpf: item.cpf ? maskCPF(item.cpf) : "",
          telefone: item.telefone ? maskPhone(item.telefone) : "",
          cep: item.cep ? maskCEP(item.cep) : "",
          rg: item.rg ? maskRGFlex(item.rg) : "",
          estado: resolverEstadoParaSelect(item.estado),
        })),
      );

      setOrganizacoes(organizacoesData);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os registros da diretoria.",
      );
    } finally {
      setLoading(false);
    }
  }

  const organizacaoNome = (organizacaoId?: string) =>
    organizacaoId
      ? organizacoes.find((entry) => String(entry.id) === String(organizacaoId))
        ?.nome ?? "—"
      : "—";

  const filteredRegistros = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return registros;

    return registros.filter((item) => {
      const organizacao = organizacaoNome(item.organizacaoId);

      return [
        item.nomeCompleto,
        item.cpf,
        item.rg,
        item.telefone,
        item.email,
        racaCorDiretoriaLabel(item.racaCor),
        generoDiretoriaLabel(item.genero),
        tipoDeficienciaDiretoriaLabel(item.tipoDeficiencia),
        cargoDiretoriaLabel(item.cargoDiretoria),
        statusDiretoriaLabel(item.statusDiretoria),
        formatDateBR(item.dataInicioMandato),
        formatDateBR(item.dataFimMandato),
        formatDateBR(item.dataAfastamento),
        organizacao,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [organizacoes, registros, search]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filteredRegistros,
    (item, key: SortKey) => {
      switch (key) {
        case "nome":
          return item.nomeCompleto;
        case "cargo":
          return cargoDiretoriaLabel(item.cargoDiretoria);
        case "inicioMandato":
          return item.dataInicioMandato ?? "";
        case "fimMandato":
          return item.dataFimMandato ?? "";
        case "afastamento":
          return item.dataAfastamento ?? "";
        case "status":
          return statusDiretoriaLabel(item.statusDiretoria);
        case "organizacao":
          return organizacaoNome(item.organizacaoId);
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

  const setField = <K extends keyof DiretoriaData>(
    key: K,
    value: DiretoriaData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openRecord = (record: DiretoriaData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar registros da diretoria.");
      return;
    }

    setSelectedId(record.id);
    setForm({
      ...record,
      estado: resolverEstadoParaSelect(record.estado),
    });
    setMode(nextMode);
    setShowForm(true);
  };

  const handleNew = () => {
    if (!podeCriar) {
      toast.error("Você não possui permissão para criar registros da diretoria.");
      return;
    }

    const novo = createEmptyDiretoria();

    if (organizacoes.length === 1) {
      novo.organizacaoId = organizacoes[0].id;
    }

    setSelectedId(null);
    setForm(novo);
    setMode("create");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setMode("create");
    setSelectedId(null);
    setForm(createEmptyDiretoria());
  };

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir registros da diretoria.");
      setConfirmDeleteId(null);
      return;
    }

    try {
      await deleteDiretoria(Number(confirmDeleteId));

      setRegistros((prev) => prev.filter((item) => item.id !== confirmDeleteId));

      if (selectedId === confirmDeleteId) {
        handleCancel();
      }

      setConfirmDeleteId(null);
      toast.success("Registro da diretoria excluído com sucesso.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o registro da diretoria.",
      );
    }
  };

  async function handleExportPdf(item: DiretoriaData) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportDiretoriaPdf({
      id: item.id,

      nomeCompleto: item.nomeCompleto,
      dataNascimento: item.dataNascimento,

      cpf: item.cpf,
      rg: item.rg,
      telefone: item.telefone,
      email: item.email,

      racaCor: racaCorDiretoriaLabel(item.racaCor),
      genero: generoDiretoriaLabel(item.genero),
      tipoDeficiencia: tipoDeficienciaDiretoriaLabel(item.tipoDeficiencia),

      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,

      cargoDiretoria: cargoDiretoriaLabel(item.cargoDiretoria),
      statusDiretoria: statusDiretoriaLabel(item.statusDiretoria),

      dataInicioMandato: item.dataInicioMandato,
      dataFimMandato: item.dataFimMandato,
      dataAfastamento: item.dataAfastamento,

      organizacao: organizacaoNome(item.organizacaoId),
      observacao: item.observacao,
    } as any);
  }

  async function handleConverterParaColaborador(item: DiretoriaData) {
    try {
      const saved = await converterDiretoriaParaColaborador(item.id);

      toast.success("Registro convertido com sucesso.");
      navigate(`/colaboradores/${saved.id}/editar`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível converter o registro da diretoria.",
      );
    }
  }

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || readOnly) return;

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
        estado: resolverEstadoParaSelect(data.uf ?? data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  const validateForm = () => {
    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? "").trim(),
    );

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return false;
    }

    if (limparNumeros(form.cpf).length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return false;
    }

    if (limparNumeros(form.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    if (
      form.dataInicioMandato &&
      form.dataFimMandato &&
      form.dataFimMandato < form.dataInicioMandato
    ) {
      toast.error("A data fim do mandato não pode ser anterior à data de início.");
      return false;
    }

    if (
      form.dataInicioMandato &&
      form.dataAfastamento &&
      form.dataAfastamento < form.dataInicioMandato
    ) {
      toast.error(
        "A data de afastamento não pode ser anterior à data de início do mandato.",
      );
      return false;
    }

    if (isStatusEncerrado(form.statusDiretoria) && !form.dataFimMandato) {
      toast.error(
        "Informe a data fim do mandato quando o status da diretoria for Encerrado.",
      );
      return false;
    }

    if (isStatusAfastado(form.statusDiretoria) && !form.dataAfastamento) {
      toast.error(
        "Informe a data de afastamento quando o status da diretoria for Afastado.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (readOnly) return;

    if (mode === "create" && !podeCriar) {
      toast.error("Você não possui permissão para criar registros da diretoria.");
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar registros da diretoria.");
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);

      const isCreating = mode === "create";
      const payload = buildDiretoriaPayload(form);

      const saved =
        mode === "edit" && form.id
          ? await updateDiretoria(Number(form.id), payload)
          : await createDiretoria(payload);

      const mapped: DiretoriaData = {
        ...saved,
        cpf: saved.cpf ? maskCPF(saved.cpf) : "",
        telefone: saved.telefone ? maskPhone(saved.telefone) : "",
        cep: saved.cep ? maskCEP(saved.cep) : "",
        rg: saved.rg ? maskRGFlex(saved.rg) : "",
        estado: resolverEstadoParaSelect(saved.estado),
      };

      setRegistros((prev) => {
        if (mode === "edit") {
          return prev.map((item) => (item.id === mapped.id ? mapped : item));
        }

        return [mapped, ...prev];
      });

      if (isCreating) {
        salvarProximaAcaoDiretoria();

        const raw = sessionStorage.getItem(DIRETORIA_NEXT_STEP_KEY);

        if (raw) {
          try {
            const parsed = JSON.parse(raw) as DiretoriaNextStepCardData;
            setNextStepCard(parsed);
          } catch {
            setNextStepCard(null);
          }

          sessionStorage.removeItem(DIRETORIA_NEXT_STEP_KEY);

          window.setTimeout(() => {
            setNextStepCard(null);
          }, NEXT_STEP_DURATION_MS);
        }
      }

      handleCancel();

      toast.success(
        isCreating
          ? "Membro da diretoria cadastrado com sucesso."
          : "Registro da diretoria salvo com sucesso.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o registro da diretoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className={`container ${showForm ? "max-w-4xl" : "max-w-7xl"
          } py-6 sm:py-8`}
      >
        {showForm && (
          <button
            type="button"
            onClick={handleCancel}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        <PageTitle
          title="Diretoria"
          tooltip="Cadastre e acompanhe os membros da diretoria da organização, informando cargo, período de mandato e situação atual. Esses dados ajudam a manter a representação institucional atualizada e podem ser utilizados em documentos oficiais, editais, contratos, relatórios e prestações de contas."
        />

        {!showForm && nextStepCard && (
          <NextStepCard
            titulo={nextStepCard.titulo}
            descricao={nextStepCard.descricao}
            acaoLabel={nextStepCard.acaoLabel}
            acaoUrl={nextStepCard.acaoUrl}
            acaoSecundariaLabel={nextStepCard.acaoSecundariaLabel}
            acaoSecundariaUrl={nextStepCard.acaoSecundariaUrl}
            variante={nextStepCard.variante ?? "pendente"}
            onDismiss={() => setNextStepCard(null)}
          />
        )}

        {showForm ? (
          <>
            {readOnly && (
              <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Esta tela está em modo de visualização. Para alterar os dados,
                utilize a opção Editar disponível no menu{" "}
                <span className="font-semibold">Ações</span>.
              </div>
            )}

            {!readOnly && <FormLegend />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Section icon={UserRound} title="Dados pessoais">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="nomeCompleto" required={!readOnly}>
                      Nome Completo
                    </FieldLabel>

                    <Input
                      id="nomeCompleto"
                      value={form.nomeCompleto}
                      onChange={(e) => setField("nomeCompleto", e.target.value)}
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="dataNascimento" required={!readOnly}>
                      Data de Nascimento
                    </FieldLabel>

                    <Input
                      id="dataNascimento"
                      type="date"
                      value={form.dataNascimento}
                      onChange={(e) =>
                        setField("dataNascimento", e.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cpf" required={!readOnly}>
                      CPF
                    </FieldLabel>

                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => setField("cpf", maskCPF(e.target.value))}
                      inputMode="numeric"
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rg">RG</FieldLabel>

                    <Input
                      id="rg"
                      value={form.rg}
                      onChange={(e) =>
                        setField("rg", maskRGFlex(e.target.value))
                      }
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="racaCor" required={!readOnly}>
                      Raça/Cor
                    </FieldLabel>

                    <Select
                      value={form.racaCor}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("racaCor", value as RacaCorApi);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="racaCor">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {racasCoresDiretoria.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="genero" required={!readOnly}>
                      Gênero
                    </FieldLabel>

                    <Select
                      value={form.genero}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("genero", value as GeneroApi);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="genero">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {generosDiretoria.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="tipoDeficiencia" required={!readOnly}>
                      Deficiência
                    </FieldLabel>

                    <Select
                      value={form.tipoDeficiencia}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("tipoDeficiencia", value as TipoDeficienciaApi);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="tipoDeficiencia">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {tiposDeficienciaDiretoria.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="telefone" required={!readOnly}>
                      Telefone
                    </FieldLabel>

                    <Input
                      id="telefone"
                      value={form.telefone}
                      onChange={(e) =>
                        setField("telefone", maskPhone(e.target.value))
                      }
                      inputMode="tel"
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">E-mail</FieldLabel>

                    <EmailInput
                      id="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      disabled={bloqueado}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="cep" required={!readOnly}>
                      CEP
                    </FieldLabel>

                    <Input
                      id="cep"
                      value={form.cep}
                      onChange={(e) => {
                        if (readOnly) return;

                        const cepFormatado = maskCEP(e.target.value);
                        setField("cep", cepFormatado);

                        const cepLimpo = cepFormatado.replace(/\D/g, "");

                        if (cepLimpo.length === 8) {
                          void buscarEnderecoPorCep(cepFormatado);
                        }
                      }}
                      inputMode="numeric"
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />

                    {cepLoading && !readOnly && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Buscando endereço...
                      </p>
                    )}
                  </Field>

                  <Field className="sm:col-span-4">
                    <FieldLabel htmlFor="logradouro" required={!readOnly}>
                      Logradouro
                    </FieldLabel>

                    <Input
                      id="logradouro"
                      value={form.logradouro}
                      onChange={(e) => setField("logradouro", e.target.value)}
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="numero" required={!readOnly}>
                      Número
                    </FieldLabel>

                    <Input
                      id="numero"
                      value={form.numero}
                      onChange={(e) =>
                        setField(
                          "numero",
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      inputMode="numeric"
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field className="sm:col-span-4">
                    <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                    <Input
                      id="complemento"
                      value={form.complemento}
                      onChange={(e) => setField("complemento", e.target.value)}
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="bairro" required={!readOnly}>
                      Bairro
                    </FieldLabel>

                    <Input
                      id="bairro"
                      value={form.bairro}
                      onChange={(e) => setField("bairro", e.target.value)}
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="cidade" required={!readOnly}>
                      Cidade
                    </FieldLabel>

                    <Input
                      id="cidade"
                      value={form.cidade}
                      onChange={(e) => setField("cidade", e.target.value)}
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="estado" required={!readOnly}>
                      Estado
                    </FieldLabel>

                    <Select
                      value={form.estado}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("estado", value);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {estadosBrasil.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Section icon={Landmark} title="Cargo e mandato">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="cargoDiretoria"
                      required={!readOnly}
                      tooltip="Selecione o cargo exercido pela pessoa na diretoria da organização. Ex.: Presidente, Conselheiro fiscal, Diretor cultural, Coordenador de projetos ou Secretário."
                    >
                      Cargo na Diretoria
                    </FieldLabel>

                    <Select
                      value={form.cargoDiretoria}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("cargoDiretoria", value);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="cargoDiretoria">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {cargosDiretoria.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="statusDiretoria"
                      required={!readOnly}
                      tooltip="Indique a situação atual do membro na diretoria. Use “Ativo” para mandato em exercício, “Encerrado” para mandato finalizado, “Afastado” para afastamento temporário e “Inativo” para vínculos que não devem mais ser considerados ativos."
                    >
                      Status da Diretoria
                    </FieldLabel>

                    <Select
                      value={form.statusDiretoria}
                      onValueChange={(value) => {
                        if (readOnly) return;

                        setForm((prev) => ({
                          ...prev,
                          statusDiretoria: value,
                          dataAfastamento:
                            value.toUpperCase() === "AFASTADO"
                              ? prev.dataAfastamento
                              : "",
                        }));
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="statusDiretoria">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {statusDiretoriaOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataInicioMandato"
                      required={!readOnly}
                      tooltip="Informe a data em que a pessoa iniciou o mandato no cargo da diretoria, conforme ata, eleição, nomeação ou documento equivalente. Ex.: 01/01/2025."
                    >
                      Data de Início do Mandato
                    </FieldLabel>

                    <Input
                      id="dataInicioMandato"
                      type="date"
                      value={form.dataInicioMandato}
                      onChange={(e) =>
                        setField("dataInicioMandato", e.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataFimMandato"
                      required={!readOnly}
                      tooltip="Informe a data prevista ou efetiva de encerramento do mandato. Este campo é obrigatório para todos os membros da diretoria, independentemente do status."
                    >
                      Data de Fim do Mandato
                    </FieldLabel>

                    <Input
                      id="dataFimMandato"
                      type="date"
                      value={form.dataFimMandato}
                      onChange={(e) =>
                        setField("dataFimMandato", e.target.value)
                      }
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>

                  {statusAfastado && (
                    <Field>
                      <FieldLabel
                        htmlFor="dataAfastamento"
                        required={!readOnly}
                        tooltip="Informe a data em que o membro foi afastado da diretoria. Este campo é obrigatório quando o status da diretoria estiver como Afastado."
                      >
                        Data de Afastamento
                      </FieldLabel>

                      <Input
                        id="dataAfastamento"
                        type="date"
                        value={form.dataAfastamento}
                        onChange={(e) =>
                          setField("dataAfastamento", e.target.value)
                        }
                        disabled={bloqueado}
                        readOnly={readOnly}
                      />
                    </Field>
                  )}
                </div>
              </Section>

              <Section icon={FileText} title="Vínculo institucional e observações">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field full>
                    <FieldLabel
                      htmlFor="organizacaoId"
                      tooltip="A organização é definida pela empresa logada. Este campo ajuda apenas na visualização quando houver uma organização cadastrada no tenant."
                    >
                      Organização
                    </FieldLabel>

                    <Select
                      value={form.organizacaoId}
                      onValueChange={(value) => {
                        if (readOnly) return;
                        setField("organizacaoId", value);
                      }}
                      disabled={bloqueado || organizacoes.length === 0}
                    >
                      <SelectTrigger id="organizacaoId">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {organizacoes.map((organizacao) => (
                          <SelectItem
                            key={organizacao.id}
                            value={organizacao.id}
                          >
                            {organizacao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="observacao"
                      tooltip="Registre informações complementares sobre o mandato, como ata de eleição, posse, afastamentos, substituições, reconduções ou observações institucionais relevantes."
                    >
                      Observação
                    </FieldLabel>

                    <Textarea
                      id="observacao"
                      value={form.observacao}
                      onChange={(e) => setField("observacao", e.target.value)}
                      className="min-h-24 resize-y"
                      disabled={bloqueado}
                      readOnly={readOnly}
                    />
                  </Field>
                </div>
              </Section>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {readOnly ? "Voltar" : "Cancelar"}
                </Button>

                {!readOnly && (
                  <Button
                    type="submit"
                    className="sm:min-w-32"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                )}
              </div>
            </form>
          </>
        ) : (
          <div className="rounded border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                  aria-label="Buscar registro da diretoria"
                />
              </div>

              {podeCriar && (
                <Button
                  type="button"
                  onClick={handleNew}
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar Diretoria
                </Button>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table ref={tableRef} className="w-full min-w-[1260px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Ações
                    </th>

                    <SortableHeader
                      label="Nome"
                      sortKey="nome"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Cargo na Diretoria"
                      sortKey="cargo"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Início do Mandato"
                      sortKey="inicioMandato"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Fim do Mandato"
                      sortKey="fimMandato"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Afastamento"
                      sortKey="afastamento"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    <SortableHeader
                      label="Organização"
                      sortKey="organizacao"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    />

                    {podeGerarPdf && (
                      <th
                        className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        data-no-copy
                      >
                        Documento
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {paginated.map((item) => {
                    const organizacao = organizacaoNome(item.organizacaoId);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <div className="flex items-center gap-1">
                            <TableActionIcon
                              icon={Eye}
                              label="Visualizar"
                              onClick={() => openRecord(item, "view")}
                            />

                            {podeEditar && (
                              <TableActionIcon
                                icon={Pencil}
                                label="Editar"
                                onClick={() => openRecord(item, "edit")}
                              />
                            )}

                            {podeCriar && (
                              <TableActionIcon
                                icon={UserPlus}
                                label="Converter em Colaborador"
                                onClick={() =>
                                  void handleConverterParaColaborador(item)
                                }
                              />
                            )}

                            {podeExcluir && (
                              <TableActionIcon
                                icon={Trash2}
                                label="Excluir"
                                variant="danger"
                                onClick={() => setConfirmDeleteId(item.id)}
                              />
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText text={item.nomeCompleto || "—"} bold>
                            {item.nomeCompleto || "—"}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <EnumBadge>
                            {cargoDiretoriaLabel(item.cargoDiretoria)}
                          </EnumBadge>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText
                            text={formatDateBR(item.dataInicioMandato)}
                          >
                            {formatDateBR(item.dataInicioMandato)}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText
                            text={formatDateBR(item.dataFimMandato)}
                            muted={!item.dataFimMandato}
                          >
                            {formatDateBR(item.dataFimMandato)}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText
                            text={formatDateBR(item.dataAfastamento)}
                            muted={!item.dataAfastamento}
                          >
                            {formatDateBR(item.dataAfastamento)}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <EnumBadge>
                            {statusDiretoriaLabel(item.statusDiretoria)}
                          </EnumBadge>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText text={organizacao}>
                            {organizacao}
                          </TableCellText>
                        </td>

                        {podeGerarPdf && (
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleExportPdf(item)}
                              className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Gerar ficha
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {paginated.length === 0 && (
                    <EmptyRow
                      colSpan={podeGerarPdf ? 9 : 8}
                      message="Nenhum registro de diretoria encontrado."
                    />
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {paginated.map((item) => {
                const organizacao = organizacaoNome(item.organizacaoId);

                return (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => openRecord(item, "view")}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() => openRecord(item, "edit")}
                        />
                      )}

                      {podeCriar && (
                        <TableActionIcon
                          icon={UserPlus}
                          label="Converter em Colaborador"
                          onClick={() =>
                            void handleConverterParaColaborador(item)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDeleteId(item.id)}
                        />
                      )}

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(item)}
                          className="ml-auto h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {item.nomeCompleto || "—"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <EnumBadge>
                        {cargoDiretoriaLabel(item.cargoDiretoria)}
                      </EnumBadge>

                      <EnumBadge>
                        {statusDiretoriaLabel(item.statusDiretoria)}
                      </EnumBadge>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Início: {formatDateBR(item.dataInicioMandato)}</p>
                      <p>Término: {formatDateBR(item.dataFimMandato)}</p>
                      <p>Afastamento: {formatDateBR(item.dataAfastamento)}</p>
                      <p>Organização: {organizacao}</p>
                    </div>
                  </div>
                );
              })}

              {paginated.length === 0 && (
                <MobileEmptyState message="Nenhum registro de diretoria encontrado." />
              )}
            </div>

            <TablePagination
              totalItems={sortedItems.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              onCopy={handleCopy}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro da diretoria?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Diretoria"
        href="https://www.aurit.com.br/wiki/institucional/diretoria"
      />
    </AppLayout>
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
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
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

function EnumBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      {children}
    </Badge>
  );
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-16 text-center text-sm text-muted-foreground"
      >
        {message}
      </td>
    </tr>
  );
}

function MobileEmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

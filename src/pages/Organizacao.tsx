import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Landmark,
  Mail,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  UserSquare2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { isPlanoAccessDenied } from "@/lib/access";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { notifyImportReviewSaveSuccess } from "@/lib/importReviewQueue";
import { getImportConfigForPath } from "@/config/importacoes";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { FieldTooltip } from "@/components/FieldTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/EmailInput";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { PageObjective } from "@/components/PageObjective";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { DocumentActionButton } from "@/components/DocumentActionButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { StatusPill } from "@/components/StatusPill";
import { usePagination } from "@/hooks/usePagination";
import { sortOptionsByLabel } from "@/lib/sortOptions";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { FormMultiSelect } from "@/components/FormMultiSelect";
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
import { maskCEP, maskCNPJ, maskCPF, maskPhone, maskRG } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { exportToExcel, exportToCSV } from "@/utils/exportUtils";
import { downloadOrganizacaoReport as exportOrganizacaoPdf } from "@/lib/individualReportDownload";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

interface OrganizacaoData {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
  emailInstitucional: string;
  telefoneInstitucional: string;
  site: string;
  territorioAtuacao: string;
  historicoAtuacao: string;
  nomeRepresentanteLegal: string;
  cpfRepresentanteLegal: string;
  rgRepresentanteLegal: string;
  telefoneRepresentanteLegal: string;
  emailRepresentanteLegal: string;
  tipoAgente: string;
  tipoIniciativaCultural: string;
  areasAtuacao: string[];
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  caminhoLogo: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface OrganizacaoDTO extends Omit<Partial<OrganizacaoData>, "id"> {
  id?: string | number;
  organizacaoId?: string | number;
  idOrganizacao?: string | number;
  areasAtuacao?: string[] | null;
  areaAtuacao?: string | null;
  representanteLegal?: {
    nomeRepresentante?: string | null;
    cpfRepresentante?: string | null;
    rgRepresentante?: string | null;
    telefoneRepresentante?: string | null;
    emailRepresentante?: string | null;
  } | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

type FormMode = "create" | "edit" | "view";
type OrganizacaoForm = Omit<OrganizacaoData, "createdAt" | "updatedAt">;

const tipoAgenteOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa física" },
  { value: "GRUPO_COLETIVO", label: "Grupo / coletivo" },
  { value: "MEI", label: "MEI" },
  {
    value: "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS",
    label: "Pessoa jurídica com fins lucrativos",
  },
  {
    value: "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS",
    label: "Pessoa jurídica sem fins lucrativos",
  },
] as const;

const tipoIniciativaOptions = [
  { value: "PONTO_DE_CULTURA", label: "Ponto de Cultura" },
  { value: "PONTAO_DE_CULTURA", label: "Pontão de Cultura" },
  { value: "ONG_CULTURAL", label: "ONG cultural" },
  { value: "ASSOCIACAO_CULTURAL", label: "Associação cultural" },
  { value: "INSTITUTO", label: "Instituto" },
  { value: "FUNDACAO", label: "Fundação" },
  { value: "OSC", label: "Organização da sociedade civil (OSC)" },
  { value: "OSCIP", label: "OSCIP" },
  { value: "COLETIVO_CULTURAL", label: "Coletivo cultural" },
  { value: "GRUPO_ARTISTICO", label: "Grupo artístico" },
  { value: "GRUPO_DE_CULTURA_POPULAR", label: "Grupo de cultura popular" },
  { value: "GRUPO_DE_CAPOEIRA", label: "Grupo de capoeira" },
  { value: "GRUPO_DE_DANCA", label: "Grupo de dança" },
  { value: "GRUPO_DE_TEATRO", label: "Grupo de teatro" },
  { value: "GRUPO_MUSICAL", label: "Grupo musical" },
  { value: "CORAL", label: "Coral" },
  { value: "FANFARRA", label: "Fanfarra" },
  { value: "ORQUESTRA", label: "Orquestra" },
  { value: "PRODUTORA_CULTURAL", label: "Produtora cultural" },
  { value: "EMPRESA_CULTURAL", label: "Empresa cultural" },
  { value: "AGENCIA_CULTURAL", label: "Agência cultural" },
  { value: "MICROEMPREENDEDOR_CULTURAL", label: "Microempreendedor cultural" },
  { value: "ESPACO_CULTURAL", label: "Espaço cultural" },
  { value: "CENTRO_CULTURAL", label: "Centro cultural" },
  { value: "CASA_DE_CULTURA", label: "Casa de cultura" },
  { value: "EQUIPAMENTO_CULTURAL", label: "Equipamento cultural" },
  { value: "MUSEU", label: "Museu" },
  { value: "BIBLIOTECA_COMUNITARIA", label: "Biblioteca comunitária" },
  { value: "PONTO_DE_LEITURA", label: "Ponto de leitura" },
  { value: "CINECLUBE", label: "Cineclube" },
  { value: "TEATRO", label: "Teatro" },
  { value: "CIRCO", label: "Circo" },
  { value: "GALERIA_DE_ARTE", label: "Galeria de arte" },
  { value: "ESCOLA_DE_SAMBA", label: "Escola de samba" },
  { value: "BLOCO_CARNAVALESCO", label: "Bloco carnavalesco" },
  { value: "FOLIA_DE_REIS", label: "Folia de Reis" },
  { value: "CONGADO", label: "Congado" },
  { value: "MARACATU", label: "Maracatu" },
  {
    value: "TERREIRO_DE_MATRIZ_AFRICANA",
    label: "Terreiro de matriz africana",
  },
  { value: "ORGANIZACAO_RELIGIOSA", label: "Organização religiosa" },
  { value: "COMUNIDADE_TRADICIONAL", label: "Comunidade tradicional" },
  {
    value: "PROJETO_CULTURAL_INDEPENDENTE",
    label: "Projeto cultural independente",
  },
  { value: "REDE_CULTURAL", label: "Rede cultural" },
  { value: "FORUM_CULTURAL", label: "Fórum cultural" },
  { value: "MOVIMENTO_CULTURAL", label: "Movimento cultural" },
  { value: "OUTRO", label: "Outro" },
] as const;

const areaAtuacaoOptions = sortOptionsByLabel([
  { value: "CULTURA_ARTE", label: "Cultura e Arte" },
  { value: "EDUCACAO", label: "Educação" },
  { value: "ASSISTENCIA_SOCIAL", label: "Assistência social" },
  { value: "ESPORTE", label: "Esporte" },
  { value: "MEIO_AMBIENTE", label: "Meio ambiente" },
  { value: "ECONOMIA", label: "Economia" },
  { value: "EMPREENDEDORISMO", label: "Empreendedorismo" },
  { value: "GERACAO_DE_RENDA", label: "Geração de renda" },
  {
    value: "RELIGIOSIDADE_E_ESPIRITUALIDADE",
    label: "Religiosidade e espiritualidade",
  },
  {
    value: "POVOS_E_COMUNIDADES_TRADICIONAIS",
    label: "Povos e comunidades tradicionais",
  },
  { value: "PATRIMONIO_CULTURAL", label: "Patrimônio cultural" },
  { value: "CULTURA_POPULAR", label: "Cultura popular" },
  {
    value: "TRADICOES_DE_MATRIZ_AFRICANA",
    label: "Tradições de matriz africana",
  },
  { value: "DIREITOS_HUMANOS", label: "Direitos humanos" },
  { value: "IGUALDADE_RACIAL", label: "Igualdade racial" },
  { value: "MULHERES", label: "Mulheres" },
  { value: "JUVENTUDE", label: "Juventude" },
  { value: "CRIANCA_E_ADOLESCENTE", label: "Criança e adolescente" },
  { value: "IDOSOS", label: "Pessoas idosas" },
  { value: "PESSOAS_COM_DEFICIENCIA", label: "Pessoas com deficiência" },
  { value: "LGBTQIAPN", label: "LGBTQIAPN+" },
  { value: "SEGURANCA_ALIMENTAR", label: "Segurança alimentar" },
  { value: "HABITACAO", label: "Habitação" },
  { value: "PROTECAO_ANIMAL", label: "Proteção animal" },
  { value: "COMUNICACAO", label: "Comunicação" },
  { value: "TURISMO", label: "Turismo" },
  { value: "PESQUISA", label: "Pesquisa" },
  {
    value: "DESENVOLVIMENTO_COMUNITARIO",
    label: "Desenvolvimento comunitário",
  },
  { value: "CIDADANIA", label: "Cidadania" },
  { value: "POLITICAS_PUBLICAS", label: "Políticas públicas" },
  { value: "SAUDE", label: "Saúde" },
  { value: "TECNOLOGIA", label: "Tecnologia" },
  { value: "OUTRO", label: "Outro" },
] as const);

const optionLabels = {
  tipoAgente: Object.fromEntries(
    tipoAgenteOptions.map((item) => [item.value, item.label]),
  ),
  tipoIniciativaCultural: Object.fromEntries(
    tipoIniciativaOptions.map((item) => [item.value, item.label]),
  ),
  areaAtuacao: Object.fromEntries(
    areaAtuacaoOptions.map((item) => [item.value, item.label]),
  ),
} as const;

function isPessoaFisica(tipo?: string | null) {
  return tipo === "PESSOA_FISICA";
}

function isMei(tipo?: string | null) {
  return tipo === "MEI";
}

function isColetivo(tipo?: string | null) {
  return tipo === "GRUPO_COLETIVO";
}

function isPessoaJuridica(tipo?: string | null) {
  return (
    tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS" ||
    tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS"
  );
}

function deveMostrarRepresentanteLegal(tipo?: string | null) {
  return !isPessoaFisica(tipo);
}

function deveMostrarTerritorioHistorico(tipo?: string | null) {
  return isPessoaJuridica(tipo);
}

function getLabelRazaoSocial(tipo?: string | null) {
  if (isPessoaFisica(tipo)) return "Nome Completo";
  if (isColetivo(tipo)) return "Nome do grupo/coletivo";
  return "Razão Social";
}

function getLabelNomeFantasia(tipo?: string | null) {
  if (isPessoaFisica(tipo)) return "Nome Social ou Artístico";
  if (isColetivo(tipo)) return "Nome de Identificação";
  return "Nome Fantasia";
}

function getLabelDocumentoPrincipal(tipo?: string | null) {
  if (isPessoaFisica(tipo)) return "CPF";
  if (isColetivo(tipo)) return "Documento de Identificação";
  return "CNPJ";
}

function getLabelDataPrincipal(tipo?: string | null) {
  if (isPessoaFisica(tipo)) return "Data de Nascimento";
  if (isColetivo(tipo)) return "Data de Criação";
  return "Data de Fundação";
}

function getLabelEmailPrincipal(tipo?: string | null) {
  if (isPessoaFisica(tipo) || isMei(tipo)) return "E-mail";
  if (isColetivo(tipo)) return "E-mail";
  return "E-mail";
}

function getLabelTelefonePrincipal(tipo?: string | null) {
  if (isPessoaFisica(tipo) || isMei(tipo)) return "Telefone";
  if (isColetivo(tipo)) return "Telefone";
  return "Telefone";
}

function getTituloIdentificacao(tipo?: string | null) {
  if (isPessoaFisica(tipo)) return "Identificação";
  if (isColetivo(tipo)) return "Identificação";
  if (isMei(tipo)) return "Identificação";
  return "Identificação";
}

function getTituloContato(tipo?: string | null) {
  return isPessoaJuridica(tipo) ? "Contato" : "Contato";
}

function getTituloRepresentante(tipo?: string | null) {
  if (isMei(tipo)) return "Representante Legal";
  if (isColetivo(tipo)) return "Representante do coletivo";
  return "Representante Legal";
}

function maskDocumentoPrincipal(value: string, tipo?: string | null) {
  if (isPessoaFisica(tipo)) return maskCPF(value);
  if (isMei(tipo) || isPessoaJuridica(tipo)) return maskCNPJ(value);
  return onlyDigits(value).slice(0, 20);
}

function formatDocumentoTabela(value: string, tipo?: string | null) {
  if (!value || isColetivo(tipo)) return "—";
  if (isPessoaFisica(tipo)) return maskCPF(value);
  if (isMei(tipo) || isPessoaJuridica(tipo)) return maskCNPJ(value);
  return value;
}

function documentoPrincipalValido(tipo: string, documento: string) {
  const digits = onlyDigits(documento);
  if (isPessoaFisica(tipo)) return digits.length === 11;
  if (isMei(tipo) || isPessoaJuridica(tipo)) return digits.length === 14;
  return digits.length >= 5 && digits.length <= 20;
}

function getRequiredFields(
  tipo?: string,
): Array<[keyof OrganizacaoForm, string]> {
  const fields: Array<[keyof OrganizacaoForm, string]> = [
    ["tipoAgente", "Natureza"],
    ["razaoSocial", getLabelRazaoSocial(tipo)],
    ["dataFundacao", getLabelDataPrincipal(tipo)],
    ["emailInstitucional", getLabelEmailPrincipal(tipo)],
    ["telefoneInstitucional", getLabelTelefonePrincipal(tipo)],
    ["tipoIniciativaCultural", "Tipo de iniciativa cultural"],
    ["areasAtuacao", "Áreas de atuação"],
    ["cep", "CEP"],
    ["logradouro", "Logradouro"],
    ["numero", "Número"],
    ["bairro", "Bairro"],
    ["cidade", "Cidade"],
    ["estado", "Estado"],
  ];

  if (!isColetivo(tipo)) {
    fields.push(["cnpj", getLabelDocumentoPrincipal(tipo)]);
  }

  if (deveMostrarTerritorioHistorico(tipo)) {
    fields.push(["territorioAtuacao", "Território de atuação"]);
    fields.push(["historicoAtuacao", "Histórico de atuação institucional"]);
  }

  if (isPessoaFisica(tipo)) {
    fields.push(["rgRepresentanteLegal", "RG"]);
  }

  if (deveMostrarRepresentanteLegal(tipo)) {
    fields.push(["nomeRepresentanteLegal", "Nome do representante"]);
    fields.push(["cpfRepresentanteLegal", "CPF do representante"]);
    fields.push(["rgRepresentanteLegal", "RG do representante"]);
    fields.push(["telefoneRepresentanteLegal", "Telefone do representante"]);
  }

  return fields;
}

const situacaoOptions = [
  { value: "COMPLETO", label: "Completo" },
  { value: "INCOMPLETO", label: "Incompleto" },
] as const;

const situacaoCadastro = (record: OrganizacaoData) =>
  getRequiredFields(record.tipoAgente).every(([key]) =>
    String((record as unknown as Record<string, unknown>)[key] ?? "").trim(),
  )
    ? "COMPLETO"
    : "INCOMPLETO";

const sortByOptions = [
  { value: "nome", label: "Nome da organização" },
  { value: "nomeFantasia", label: "Nome fantasia" },
  { value: "cnpj", label: "CNPJ" },
  { value: "createdAt", label: "Data de cadastro" },
  { value: "updatedAt", label: "Última atualização" },
  { value: "natureza", label: "Natureza da organização" },
  { value: "iniciativa", label: "Tipo de iniciativa cultural" },
  { value: "area", label: "Área de atuação" },
  { value: "situacao", label: "Situação do cadastro" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels = (sortBy: SortBy): Record<SortDir, string> =>
  sortBy === "createdAt" || sortBy === "updatedAt"
    ? { asc: "Mais antigos primeiro", desc: "Mais recentes primeiro" }
    : sortBy === "nome"
      ? { asc: "A–Z", desc: "Z–A" }
      : { asc: "Crescente", desc: "Decrescente" };

interface OrganizacaoFiltros {
  nome: string;
  documento: string;
  responsavel: string;
  natureza: string[];
  iniciativa: string[];
  areas: string[];
  situacao: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

const emptyFiltros: OrganizacaoFiltros = {
  nome: "",
  documento: "",
  responsavel: "",
  natureza: [],
  iniciativa: [],
  areas: [],
  situacao: [],
  sortBy: "nome",
  sortDir: "asc",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const maskDocumento = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
};

const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label || value;

const createEmptyForm = (): OrganizacaoForm => ({
  id: crypto.randomUUID(),
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataFundacao: "",
  emailInstitucional: "",
  telefoneInstitucional: "",
  site: "",
  territorioAtuacao: "",
  historicoAtuacao: "",
  nomeRepresentanteLegal: "",
  cpfRepresentanteLegal: "",
  rgRepresentanteLegal: "",
  telefoneRepresentanteLegal: "",
  emailRepresentanteLegal: "",
  tipoAgente: "",
  tipoIniciativaCultural: "",
  areasAtuacao: [],
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  caminhoLogo: null,
});

const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function parseApiError(response: Response) {
  try {
    const text = await response.text();
    if (!text) return `Erro ${response.status} ao processar a requisição.`;
    try {
      const data = JSON.parse(text) as {
        message?: string;
        mensagem?: string;
        error?: string;
      };
      return data.message || data.mensagem || data.error || text;
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar a requisição.`;
  }
}

function mapOrganizacao(dto: OrganizacaoDTO): OrganizacaoData {
  const representante = dto.representanteLegal;
  return {
    id: String(dto.id ?? dto.organizacaoId ?? dto.idOrganizacao ?? ""),
    razaoSocial: dto.razaoSocial ?? "",
    nomeFantasia: dto.nomeFantasia ?? "",
    cnpj: maskDocumentoPrincipal(dto.cnpj ?? "", dto.tipoAgente),
    dataFundacao: dto.dataFundacao ?? "",
    emailInstitucional: dto.emailInstitucional ?? "",
    telefoneInstitucional: dto.telefoneInstitucional ?? "",
    site: dto.site ?? "",
    territorioAtuacao: dto.territorioAtuacao ?? "",
    historicoAtuacao: dto.historicoAtuacao ?? "",
    nomeRepresentanteLegal:
      dto.nomeRepresentanteLegal ?? representante?.nomeRepresentante ?? "",
    cpfRepresentanteLegal: maskCPF(
      dto.cpfRepresentanteLegal ?? representante?.cpfRepresentante ?? "",
    ),
    rgRepresentanteLegal:
      dto.rgRepresentanteLegal ?? representante?.rgRepresentante ?? "",
    telefoneRepresentanteLegal:
      dto.telefoneRepresentanteLegal ??
      representante?.telefoneRepresentante ??
      "",
    emailRepresentanteLegal:
      dto.emailRepresentanteLegal ?? representante?.emailRepresentante ?? "",
    tipoAgente: dto.tipoAgente ?? "",
    tipoIniciativaCultural: dto.tipoIniciativaCultural ?? "",
    areasAtuacao:
      dto.areasAtuacao ?? (dto.areaAtuacao ? [dto.areaAtuacao] : []),
    cep: dto.cep ?? "",
    logradouro: dto.logradouro ?? "",
    numero: dto.numero ?? "",
    complemento: dto.complemento === "-" ? "" : (dto.complemento ?? ""),
    bairro: dto.bairro ?? "",
    cidade: dto.cidade ?? "",
    estado: dto.estado ?? "",
    caminhoLogo: dto.caminhoLogo ?? null,
    createdAt: dto.createdAt ?? dto.dataCriacao ?? "",
    updatedAt: dto.updatedAt ?? dto.dataAtualizacao ?? "",
  };
}

function buildPayload(form: OrganizacaoForm) {
  const mostraRepresentante = deveMostrarRepresentanteLegal(form.tipoAgente);
  const mostraTerritorio = deveMostrarTerritorioHistorico(form.tipoAgente);
  const cpfRepresentante = onlyDigits(String(form.cpfRepresentanteLegal ?? ""));
  return {
    razaoSocial: form.razaoSocial.trim(),
    nomeFantasia: form.nomeFantasia.trim() || null,
    cnpj: isColetivo(form.tipoAgente) ? "" : onlyDigits(form.cnpj),
    dataFundacao: form.dataFundacao || null,
    emailInstitucional: form.emailInstitucional.trim(),
    telefoneInstitucional: onlyDigits(form.telefoneInstitucional),
    site: form.site.trim() || null,
    territorioAtuacao: mostraTerritorio ? form.territorioAtuacao.trim() : null,
    historicoAtuacao: mostraTerritorio
      ? form.historicoAtuacao.trim() || null
      : null,
    tipoAgente: form.tipoAgente,
    tipoIniciativaCultural: form.tipoIniciativaCultural,
    areasAtuacao: form.areasAtuacao,
    cep: onlyDigits(form.cep),
    logradouro: form.logradouro.trim(),
    numero: form.numero.trim(),
    complemento: form.complemento.trim() || null,
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado,
    rgRepresentanteLegal: isPessoaFisica(form.tipoAgente)
      ? form.rgRepresentanteLegal.trim()
      : undefined,
    representanteLegal: mostraRepresentante
      ? {
          nomeRepresentante: form.nomeRepresentanteLegal.trim(),
          cpfRepresentante,
          rgRepresentante: form.rgRepresentanteLegal.trim(),
          telefoneRepresentante: onlyDigits(form.telefoneRepresentanteLegal),
          emailRepresentante: form.emailRepresentanteLegal.trim() || null,
        }
      : null,
  };
}

export default function Organizacao() {
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoData[]>([]);
  const [form, setForm] = useState<OrganizacaoForm>(createEmptyForm);
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "organizacao:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<OrganizacaoFiltros>(emptyFiltros);
  const [filtros, setFiltros] = useState<OrganizacaoFiltros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [nextStepCard, setNextStepCard] = useState<{
    titulo: string;
    acaoLabel: string;
    acaoUrl: string;
    variante: "pendente";
  } | null>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR || permissoes.GERAR_PDF;

  useImportFormFill("organizacoes", setForm);

  useEffect(() => {
    let active = true;
    void getPermissoesUsuarioLogadoPorModulo("ORGANIZACAO")
      .then((data) => {
        if (active) setPermissoes(data);
      })
      .catch(() => {
        if (active) setPermissoes(permissoesVazias);
      })
      .finally(() => {
        if (active) setLoadingPermissoes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadingPermissoes && podeVisualizar) void carregarOrganizacoes();
    if (!loadingPermissoes && !podeVisualizar) setLoading(false);
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarOrganizacoes(nextSelectedId?: string | null) {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const response = await fetch(`${API_URL}/organizacoes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = (await response.json()) as OrganizacaoDTO[];
      const mapped = (Array.isArray(data) ? data : []).map(mapOrganizacao);
      setOrganizacoes(mapped);
      setSelectedId(nextSelectedId ?? mapped[0]?.id ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados institucionais.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const selectedRecord = useMemo(
    () => organizacoes.find((item) => item.id === selectedId) || null,
    [organizacoes, selectedId],
  );

  const setDraftField = <K extends keyof OrganizacaoFiltros>(
    key: K,
    value: OrganizacaoFiltros[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFiltros = (next: OrganizacaoFiltros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1); // Return to page 1 on filter application
    window.setTimeout(() => setSearching(false), 180);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    applyFiltros(draft);
  };

  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filteredOrganizacoes = useMemo(() => {
    const nome = normalize(filtros.nome);
    const documento = onlyDigits(filtros.documento);
    const responsavel = normalize(filtros.responsavel);

    const result = organizacoes.filter((item) => {
      if (
        nome &&
        ![
          item.razaoSocial,
          item.nomeFantasia,
          item.territorioAtuacao,
          item.historicoAtuacao,
        ]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(nome))
      ) {
        return false;
      }
      if (
        documento &&
        !onlyDigits(`${item.cnpj} ${item.cpfRepresentanteLegal}`).includes(
          documento,
        )
      ) {
        return false;
      }
      if (
        responsavel &&
        !normalize(item.nomeRepresentanteLegal || "").includes(responsavel)
      ) {
        return false;
      }
      if (
        filtros.natureza.length &&
        !filtros.natureza.includes(item.tipoAgente)
      )
        return false;
      if (
        filtros.iniciativa.length &&
        !filtros.iniciativa.includes(item.tipoIniciativaCultural)
      )
        return false;
      if (
        filtros.areas.length &&
        !filtros.areas.some((area) => item.areasAtuacao.includes(area))
      )
        return false;
      if (
        filtros.situacao.length &&
        !filtros.situacao.includes(situacaoCadastro(item))
      )
        return false;
      return true;
    });

    const sortValue = (item: OrganizacaoData) => {
      switch (filtros.sortBy) {
        case "createdAt":
          return item.createdAt || "";
        case "updatedAt":
          return item.updatedAt || item.createdAt || "";
        case "natureza":
          return labelOf(tipoAgenteOptions, item.tipoAgente);
        case "iniciativa":
          return labelOf(tipoIniciativaOptions, item.tipoIniciativaCultural);
        case "area":
          return item.areasAtuacao
            .map((area) => labelOf(areaAtuacaoOptions, area))
            .join(", ");
        case "nomeFantasia":
          return item.nomeFantasia || "";
        case "cnpj":
          return item.cnpj || "";
        case "situacao":
          return labelOf(situacaoOptions, situacaoCadastro(item));
        default:
          return item.razaoSocial || "";
      }
    };

    return [...result].sort((a, b) => {
      const compare = String(sortValue(a)).localeCompare(
        String(sortValue(b)),
        "pt-BR",
        { sensitivity: "base" },
      );
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [organizacoes, filtros]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];
    const removeText = (key: "nome" | "documento" | "responsavel") =>
      applyFiltros({ ...filtros, [key]: "" });
    const removeFromList = (
      key: "natureza" | "iniciativa" | "areas" | "situacao",
      value: string,
    ) =>
      applyFiltros({
        ...filtros,
        [key]: filtros[key].filter((v) => v !== value),
      });

    if (filtros.nome.trim())
      items.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => removeText("nome"),
      });
    if (filtros.documento.trim())
      items.push({
        id: "documento",
        label: "CPF/CNPJ",
        value: filtros.documento.trim(),
        onRemove: () => removeText("documento"),
      });
    if (filtros.responsavel.trim())
      items.push({
        id: "responsavel",
        label: "Responsável",
        value: filtros.responsavel.trim(),
        onRemove: () => removeText("responsavel"),
      });

    filtros.natureza.forEach((value) =>
      items.push({
        id: `natureza-${value}`,
        label: "Natureza",
        value: labelOf(tipoAgenteOptions, value),
        onRemove: () => removeFromList("natureza", value),
      }),
    );
    filtros.iniciativa.forEach((value) =>
      items.push({
        id: `iniciativa-${value}`,
        label: "Iniciativa",
        value: labelOf(tipoIniciativaOptions, value),
        onRemove: () => removeFromList("iniciativa", value),
      }),
    );
    filtros.areas.forEach((value) =>
      items.push({
        id: `area-${value}`,
        label: "Área",
        value: labelOf(areaAtuacaoOptions, value),
        onRemove: () => removeFromList("areas", value),
      }),
    );
    filtros.situacao.forEach((value) =>
      items.push({
        id: `situacao-${value}`,
        label: "Situação",
        value: labelOf(situacaoOptions, value),
        onRemove: () => removeFromList("situacao", value),
      }),
    );

    if (
      filtros.sortBy !== emptyFiltros.sortBy ||
      filtros.sortDir !== emptyFiltros.sortDir
    ) {
      items.push({
        id: "ordenacao",
        label: "Ordenação",
        value: `${labelOf(sortByOptions, filtros.sortBy)} · ${sortDirLabels(filtros.sortBy)[filtros.sortDir]}`,
        onRemove: () =>
          applyFiltros({
            ...filtros,
            sortBy: emptyFiltros.sortBy,
            sortDir: emptyFiltros.sortDir,
          }),
      });
    }

    return items;
    // applyFiltros intentionally reads the latest filter state from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const activeCount = activeFilters.length;
  const filtrosKey = JSON.stringify(filtros);

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginated: pagedOrganizacoes,
  } = usePagination(
    filteredOrganizacoes,
    25,
    filtrosKey + filtros.sortBy + filtros.sortDir,
  );

  const toggleSort = (key: SortBy) => {
    setCurrentPage(1);
    applyFiltros({
      ...filtros,
      sortBy: key,
      sortDir:
        filtros.sortBy === key && filtros.sortDir === "asc" ? "desc" : "asc",
    });
  };

  const SortableTh = ({
    sortKey,
    children,
    className = "",
  }: {
    sortKey: SortBy;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = filtros.sortBy === sortKey;
    const Icon = active
      ? filtros.sortDir === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;
    return (
      <th
        className={`whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${active ? "bg-muted/40 text-foreground" : ""} ${className}`}
        aria-sort={
          active
            ? filtros.sortDir === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <button
          type="button"
          onClick={() => toggleSort(sortKey)}
          title="Ordenar por esta coluna"
          className="inline-flex items-center gap-1.5 rounded-[6px] uppercase tracking-wider transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {children}
          <Icon
            className={`h-3 w-3 shrink-0 ${active ? "text-foreground opacity-90" : "text-muted-foreground/60 opacity-70"}`}
            aria-hidden
          />
        </button>
      </th>
    );
  };

  const navigate = useNavigate();

  const readOnly = mode === "view";
  const mostrarRepresentanteLegal = deveMostrarRepresentanteLegal(
    form.tipoAgente,
  );
  const mostrarTerritorioHistorico = deveMostrarTerritorioHistorico(
    form.tipoAgente,
  );
  const pessoaFisica = isPessoaFisica(form.tipoAgente);

  const setField = <K extends keyof OrganizacaoForm>(
    key: K,
    value: OrganizacaoForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openRecord = (record: OrganizacaoData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error(
        "Você não possui permissão para editar dados institucionais.",
      );
      return;
    }
    const { createdAt, updatedAt, ...rest } = record;
    setSelectedId(record.id);
    setForm(rest);
    setMode(nextMode);
    setShowForm(true);
  };

  const handleNew = () => {
    if (!podeCriar) {
      toast.error(
        "Você não possui permissão para cadastrar dados institucionais.",
      );
      return;
    }
    setMode("create");
    setSelectedId(null);
    setForm(createEmptyForm());
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setMode("create");
    setSelectedId(null);
    setForm(createEmptyForm());
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir este cadastro.");
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/organizacoes/${confirmDeleteId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (!response.ok) throw new Error(await parseApiError(response));
      const wasSelected = selectedId === confirmDeleteId;
      setConfirmDeleteId(null);
      if (wasSelected) handleCancel();
      await carregarOrganizacoes(wasSelected ? null : selectedId);
      toast.success("Organização excluída com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir organização.",
      );
    }
  };

  const handleExportPdf = async (item: OrganizacaoData) => {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportOrganizacaoPdf({
      id: item.id,
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia,
      cnpj: item.cnpj,
      dataFundacao: item.dataFundacao,
      emailInstitucional: item.emailInstitucional,
      telefoneInstitucional: item.telefoneInstitucional,
      site: item.site,
      territorioAtuacao: item.territorioAtuacao,
      historicoAtuacao: item.historicoAtuacao,
      nomeRepresentanteLegal: item.nomeRepresentanteLegal,
      cpfRepresentanteLegal: item.cpfRepresentanteLegal,
      rgRepresentanteLegal: item.rgRepresentanteLegal,
      telefoneRepresentanteLegal: item.telefoneRepresentanteLegal,
      emailRepresentanteLegal: item.emailRepresentanteLegal,
      tipoAgente: labelOf(tipoAgenteOptions, item.tipoAgente),
      tipoIniciativaCultural: labelOf(
        tipoIniciativaOptions,
        item.tipoIniciativaCultural,
      ),
      areaAtuacao: item.areasAtuacao
        .map((area) => labelOf(areaAtuacaoOptions, area))
        .join(", "),
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = getRequiredFields(form.tipoAgente).find(
      ([key]) => !String(form[key] ?? "").trim(),
    );
    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return;
    }

    if (!isValidEmail(form.emailInstitucional)) {
      toast.error("Informe um e-mail institucional válido.");
      return;
    }

    if (
      deveMostrarRepresentanteLegal(form.tipoAgente) &&
      !isValidEmail(form.emailRepresentanteLegal)
    ) {
      toast.error("Informe um e-mail válido para o representante legal.");
      return;
    }

    if (
      !isColetivo(form.tipoAgente) &&
      !documentoPrincipalValido(form.tipoAgente, form.cnpj)
    ) {
      toast.error(
        isPessoaFisica(form.tipoAgente)
          ? "Informe um CPF válido com 11 dígitos."
          : isColetivo(form.tipoAgente)
            ? "Informe um documento de identificação com 5 a 20 dígitos."
            : "Informe um CNPJ válido com 14 dígitos.",
      );
      return;
    }

    const cpfRepresentante = onlyDigits(
      String(form.cpfRepresentanteLegal ?? ""),
    );
    if (
      deveMostrarRepresentanteLegal(form.tipoAgente) &&
      cpfRepresentante.length !== 11
    ) {
      toast.error(
        "O CPF do representante legal precisa ter exatamente 11 dígitos.",
      );
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        mode === "edit" && form.id
          ? `${API_URL}/organizacoes/${form.id}`
          : `${API_URL}/organizacoes`,
        {
          method: mode === "edit" && form.id ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(buildPayload(form)),
        },
      );
      if (!response.ok) throw new Error(await parseApiError(response));
      const saved = mapOrganizacao((await response.json()) as OrganizacaoDTO);
      notifyImportReviewSaveSuccess("organizacoes");
      if (mode === "create") {
        emitJourneyNextStep();
      }
      handleCancel();
      await carregarOrganizacoes(saved.id);
      toast.success(
        mode === "create"
          ? "Organização cadastrada com sucesso."
          : "Organização salva com sucesso.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar organização.";
      if (isPlanoAccessDenied(message)) setAccessDeniedMessage(message);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  async function buscarEnderecoPorCep(cep: string) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8 || readOnly) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      const uf = data.uf?.toUpperCase() ?? "";
      const stateByUf: Record<string, string> = {
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
      setForm((current) => ({
        ...current,
        logradouro: data.logradouro ?? "",
        complemento: current.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: stateByUf[uf] ?? current.estado,
      }));
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    }
  }

  const exportColumns = [
    { header: "Nome principal (Razão Social)", key: "razaoSocial" },
    { header: "Nome complementar (Fantasia)", key: "nomeFantasia" },
    { header: "CPF/CNPJ", key: "documentoLabel" },
    { header: "Natureza da organização", key: "naturezaLabel" },
    { header: "Tipo de iniciativa cultural", key: "iniciativaLabel" },
    { header: "Áreas de atuação cultural", key: "areaLabel" },
    { header: "Responsável", key: "nomeRepresentanteLegal" },
    { header: "Histórico de atuação institucional", key: "historicoAtuacao" },
    { header: "Situação do cadastro", key: "situacaoLabel" },
    { header: "Data de cadastro", key: "createdAt" },
    { header: "Última atualização", key: "updatedAt" },
  ];

  const getExportData = () => {
    return filteredOrganizacoes.map((item) => ({
      ...item,
      documentoLabel: formatDocumentoTabela(item.cnpj, item.tipoAgente),
      naturezaLabel: labelOf(tipoAgenteOptions, item.tipoAgente),
      iniciativaLabel: labelOf(
        tipoIniciativaOptions,
        item.tipoIniciativaCultural,
      ),
      areaLabel: item.areasAtuacao
        .map((area) => labelOf(areaAtuacaoOptions, area))
        .join(", "),
      situacaoLabel: labelOf(situacaoOptions, situacaoCadastro(item)),
    }));
  };

  const handleExportExcel = async () => {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para exportar dados.");
      return;
    }
    try {
      setExportingExcel(true);
      exportToExcel(getExportData(), exportColumns, "dados-institucionais");
      toast.success("Excel gerado com sucesso.");
    } catch (error) {
      toast.error("Não foi possível gerar o arquivo Excel. Tente novamente.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCSV = async () => {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para exportar dados.");
      return;
    }
    try {
      setExportingCSV(true);
      exportToCSV(getExportData(), exportColumns, "dados-institucionais");
      toast.success("CSV gerado com sucesso.");
    } catch (error) {
      toast.error("Não foi possível gerar o arquivo CSV. Tente novamente.");
    } finally {
      setExportingCSV(false);
    }
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied message={accessDeniedMessage} />
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted message="Você não possui permissão para visualizar dados institucionais." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className={`container ${showForm ? "max-w-4xl" : "max-w-7xl"} py-6 sm:py-8`}
      >
        {showForm && <BackButton onClick={handleCancel} />}
        <header className="mb-5 border-b border-border pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Dados Institucionais
              </h1>
              <FieldTooltip
                text="Nesta página são cadastradas e atualizadas as principais informações da organização ou iniciativa cultural. Esses dados poderão ser utilizados automaticamente em projetos, editais, relatórios e outras áreas do sistema."
                fieldLabel="a página Dados Institucionais"
                side="bottom"
              />
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2">
              {showForm && mode !== "view" ? (
                <ImportDataButton
                  config={getImportConfigForPath("/organizacoes")!}
                  canFillForm
                  variant="glassSecondary"
                />
              ) : !showForm ? (
                <>
                  <Button
                    type="button"
                    variant="glassPrimary"
                    onClick={handleNew}
                    className="h-9 gap-2 px-4"
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {!showForm && (
            <PageObjective
              className="mt-4"
              text-justify
              description="Cadastre e mantenha atualizadas as principais informações da organização ou iniciativa cultural. Esses dados poderão ser utilizados automaticamente em projetos, editais, relatórios e outras áreas do sistema."
            />
          )}
        </header>

        {showForm && <FormLegend />}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section
              icon={Landmark}
              title="Perfil Institucional"
              text-justify
              description="Informe como a organização ou iniciativa está constituída, como se caracteriza no setor cultural e em quais áreas desenvolve suas atividades."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="tipoAgente"
                    required
                    tooltip="Informe como a organização ou iniciativa está constituída, como pessoa física, grupo ou coletivo, MEI ou pessoa jurídica."
                  >
                    Natureza
                  </FieldLabel>

                  <Select
                    value={form.tipoAgente}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        tipoAgente: value,
                        cnpj: isColetivo(value)
                          ? ""
                          : maskDocumentoPrincipal(prev.cnpj, value),
                        territorioAtuacao: deveMostrarTerritorioHistorico(value)
                          ? prev.territorioAtuacao
                          : "",
                        historicoAtuacao: deveMostrarTerritorioHistorico(value)
                          ? prev.historicoAtuacao
                          : "",
                        nomeRepresentanteLegal: deveMostrarRepresentanteLegal(
                          value,
                        )
                          ? prev.nomeRepresentanteLegal
                          : "",
                        cpfRepresentanteLegal: deveMostrarRepresentanteLegal(
                          value,
                        )
                          ? prev.cpfRepresentanteLegal
                          : "",
                        rgRepresentanteLegal: deveMostrarRepresentanteLegal(
                          value,
                        )
                          ? prev.rgRepresentanteLegal
                          : "",
                        telefoneRepresentanteLegal:
                          deveMostrarRepresentanteLegal(value)
                            ? prev.telefoneRepresentanteLegal
                            : "",
                        emailRepresentanteLegal: deveMostrarRepresentanteLegal(
                          value,
                        )
                          ? prev.emailRepresentanteLegal
                          : "",
                      }))
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger id="tipoAgente">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {tipoAgenteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoIniciativaCultural"
                    required
                    tooltip="Informe a opção que melhor representa a organização ou iniciativa, considerando sua principal forma de atuação."
                  >
                    Tipo de Iniciativa
                  </FieldLabel>

                  <Select
                    value={form.tipoIniciativaCultural}
                    onValueChange={(value) =>
                      setField("tipoIniciativaCultural", value)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger id="tipoIniciativaCultural">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {tipoIniciativaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="areasAtuacao"
                    required
                    tooltip="Informe todas as áreas culturais em que a organização ou iniciativa desenvolve atividades. É possível selecionar mais de uma opção."
                  >
                    Áreas de Atuação
                  </FieldLabel>

                  <FormMultiSelect
                    id="areasAtuacao"
                    options={areaAtuacaoOptions}
                    value={form.areasAtuacao}
                    onChange={(value) => setField("areasAtuacao", value)}
                    placeholder="Selecione uma ou mais áreas"
                    searchPlaceholder="Pesquisar área"
                    disabled={readOnly}
                    ariaDescription="Áreas de Atuação: campo de seleção múltipla. Selecione uma ou mais áreas."
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={Briefcase}
              title={getTituloIdentificacao(form.tipoAgente)}
              text-justify
              description="Informe os dados oficiais utilizados para identificar a organização ou iniciativa em cadastros, documentos e editais."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="razaoSocial" required>
                    {getLabelRazaoSocial(form.tipoAgente)}
                  </FieldLabel>

                  <Input
                    id="razaoSocial"
                    value={form.razaoSocial}
                    onChange={(e) => setField("razaoSocial", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="nomeFantasia">
                    {getLabelNomeFantasia(form.tipoAgente)}
                  </FieldLabel>

                  <Input
                    id="nomeFantasia"
                    value={form.nomeFantasia}
                    onChange={(e) => setField("nomeFantasia", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                {!isColetivo(form.tipoAgente) && (
                  <Field>
                    <FieldLabel htmlFor="cnpj" required>
                      {getLabelDocumentoPrincipal(form.tipoAgente)}
                    </FieldLabel>

                    <Input
                      id="cnpj"
                      value={form.cnpj}
                      onChange={(e) =>
                        setField(
                          "cnpj",
                          maskDocumentoPrincipal(
                            e.target.value,
                            form.tipoAgente,
                          ),
                        )
                      }
                      onBlur={() =>
                        setField(
                          "cnpj",
                          maskDocumentoPrincipal(form.cnpj, form.tipoAgente),
                        )
                      }
                      inputMode="numeric"
                      maxLength={isPessoaFisica(form.tipoAgente) ? 14 : 18}
                      disabled={readOnly}
                    />
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="dataFundacao" required>
                    {getLabelDataPrincipal(form.tipoAgente)}
                  </FieldLabel>

                  <Input
                    id="dataFundacao"
                    type="date"
                    value={form.dataFundacao}
                    onChange={(e) => setField("dataFundacao", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                {pessoaFisica && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="rgRepresentanteLegal" required>
                        RG
                      </FieldLabel>

                      <Input
                        id="rgRepresentanteLegal"
                        value={form.rgRepresentanteLegal}
                        onChange={(e) =>
                          setField(
                            "rgRepresentanteLegal",
                            maskRG(e.target.value),
                          )
                        }
                        disabled={readOnly}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="telefoneInstitucional" required>
                        Telefone
                      </FieldLabel>

                      <Input
                        id="telefoneInstitucional"
                        value={form.telefoneInstitucional}
                        onChange={(e) =>
                          setField(
                            "telefoneInstitucional",
                            maskPhone(e.target.value),
                          )
                        }
                        inputMode="tel"
                        disabled={readOnly}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="emailInstitucional" required>
                        E-mail
                      </FieldLabel>

                      <Input
                        id="emailInstitucional"
                        type="email"
                        value={form.emailInstitucional}
                        onChange={(e) =>
                          setField("emailInstitucional", e.target.value)
                        }
                        disabled={readOnly}
                      />
                    </Field>
                  </>
                )}
              </div>
            </Section>

            <Section
              icon={MapPin}
              title="Endereço"
              text-justify
              description="Informe o endereço principal da organização ou iniciativa. Ao preencher o CEP, os dados disponíveis serão preenchidos automaticamente."
            >
              <div className="grid gap-4 sm:grid-cols-6">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cep" required>
                    CEP
                  </FieldLabel>

                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => setField("cep", maskCEP(e.target.value))}
                    onBlur={() => void buscarEnderecoPorCep(form.cep)}
                    inputMode="numeric"
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="logradouro" required>
                    Logradouro
                  </FieldLabel>

                  <Input
                    id="logradouro"
                    value={form.logradouro}
                    onChange={(e) => setField("logradouro", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="numero" required>
                    Número
                  </FieldLabel>

                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => setField("numero", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                  <Input
                    id="complemento"
                    value={form.complemento}
                    onChange={(e) => setField("complemento", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="bairro" required>
                    Bairro
                  </FieldLabel>

                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cidade" required>
                    Cidade
                  </FieldLabel>

                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    disabled={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="estado" required>
                    Estado
                  </FieldLabel>

                  <Select
                    value={form.estado}
                    onValueChange={(value) => setField("estado", value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="estado">
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
                </Field>
              </div>
            </Section>

            {!pessoaFisica && (
              <Section
                icon={Mail}
                title={getTituloContato(form.tipoAgente)}
                text-justify
                description="Informe os principais canais de contato utilizados pela organização ou iniciativa."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="emailInstitucional" required>
                      {getLabelEmailPrincipal(form.tipoAgente)}
                    </FieldLabel>

                    <Input
                      id="emailInstitucional"
                      type="email"
                      value={form.emailInstitucional}
                      onChange={(e) =>
                        setField("emailInstitucional", e.target.value)
                      }
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="telefoneInstitucional" required>
                      {getLabelTelefonePrincipal(form.tipoAgente)}
                    </FieldLabel>

                    <Input
                      id="telefoneInstitucional"
                      value={form.telefoneInstitucional}
                      onChange={(e) =>
                        setField(
                          "telefoneInstitucional",
                          maskPhone(e.target.value),
                        )
                      }
                      inputMode="tel"
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="site">Site</FieldLabel>

                    <Input
                      id="site"
                      value={form.site}
                      onChange={(e) => setField("site", e.target.value)}
                      disabled={readOnly}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              </Section>
            )}

            {mostrarRepresentanteLegal && (
              <Section
                icon={UserSquare2}
                title={getTituloRepresentante(form.tipoAgente)}
                text-justify
                description="Informe os dados da pessoa responsável por representar legalmente a organização ou iniciativa."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="nomeRepresentanteLegal" required>
                      Nome Completo
                    </FieldLabel>

                    <Input
                      id="nomeRepresentanteLegal"
                      value={form.nomeRepresentanteLegal}
                      onChange={(e) =>
                        setField("nomeRepresentanteLegal", e.target.value)
                      }
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cpfRepresentanteLegal" required>
                      CPF
                    </FieldLabel>

                    <Input
                      id="cpfRepresentanteLegal"
                      value={form.cpfRepresentanteLegal}
                      onChange={(e) =>
                        setField(
                          "cpfRepresentanteLegal",
                          maskCPF(e.target.value),
                        )
                      }
                      onBlur={() =>
                        setField(
                          "cpfRepresentanteLegal",
                          maskCPF(String(form.cpfRepresentanteLegal ?? "")),
                        )
                      }
                      inputMode="numeric"
                      maxLength={14}
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rgRepresentanteLegal">RG</FieldLabel>

                    <Input
                      id="rgRepresentanteLegal"
                      value={form.rgRepresentanteLegal}
                      onChange={(e) =>
                        setField("rgRepresentanteLegal", maskRG(e.target.value))
                      }
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="telefoneRepresentanteLegal" required>
                      Telefone
                    </FieldLabel>

                    <Input
                      id="telefoneRepresentanteLegal"
                      value={form.telefoneRepresentanteLegal}
                      onChange={(e) =>
                        setField(
                          "telefoneRepresentanteLegal",
                          maskPhone(e.target.value),
                        )
                      }
                      inputMode="tel"
                      disabled={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="emailRepresentanteLegal" required>
                      E-mail
                    </FieldLabel>

                    <EmailInput
                      id="emailRepresentanteLegal"
                      value={form.emailRepresentanteLegal}
                      onChange={(e) =>
                        setField("emailRepresentanteLegal", e.target.value)
                      }
                      disabled={readOnly}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section
              icon={Landmark}
              title="Atuação Institucional"
              text-justify
              description="Informe onde a iniciativa atua e apresente brevemente sua trajetória, experiências e principais atividades desenvolvidas."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="territorioAtuacao"
                    required
                    tooltip="Informe as cidades, comunidades, bairros, territórios ou regiões onde a organização ou iniciativa desenvolve suas atividades."
                  >
                    Território de Atuação
                  </FieldLabel>

                  <Textarea
                    id="territorioAtuacao"
                    value={form.territorioAtuacao}
                    onChange={(e) =>
                      setField("territorioAtuacao", e.target.value)
                    }
                    className="min-h-20 resize-y"
                    disabled={readOnly}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="historicoAtuacao"
                    required
                    tooltip="Informe brevemente a trajetória da organização ou iniciativa, incluindo principais experiências, projetos, atividades realizadas, resultados alcançados e públicos atendidos."
                  >
                    Histórico de Atuação
                  </FieldLabel>

                  <Textarea
                    id="historicoAtuacao"
                    value={form.historicoAtuacao}
                    onChange={(e) =>
                      setField("historicoAtuacao", e.target.value)
                    }
                    className="min-h-28 resize-y"
                    disabled={readOnly}
                  />
                </Field>
              </div>
            </Section>

            {mode !== "view" && (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 px-4"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 px-5"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}

            {mode === "view" && (
              <div className="flex pt-2 sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 px-4"
                  onClick={handleCancel}
                >
                  Voltar
                </Button>
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <AdvancedSearchPanel
              open={panelOpen}
              onOpenChange={setPanelOpen}
              activeCount={activeCount}
            >
              <form onSubmit={handleSearch} noValidate>
                <SearchFilterGrid>
                  <div>
                    <FieldLabel htmlFor="filtroNome">
                      Nome da organização
                    </FieldLabel>
                    <Input
                      id="filtroNome"
                      value={draft.nome}
                      onChange={(e) => setDraftField("nome", e.target.value)}
                      placeholder="Digite o nome principal, razão social ou nome fantasia"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroDocumento">
                      CPF ou CNPJ
                    </FieldLabel>
                    <Input
                      id="filtroDocumento"
                      value={draft.documento}
                      onChange={(e) =>
                        setDraftField(
                          "documento",
                          maskDocumento(e.target.value),
                        )
                      }
                      placeholder="Digite o CPF ou CNPJ"
                      inputMode="numeric"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroResponsavel">
                      Responsável
                    </FieldLabel>
                    <Input
                      id="filtroResponsavel"
                      value={draft.responsavel}
                      onChange={(e) =>
                        setDraftField("responsavel", e.target.value)
                      }
                      placeholder="Digite o nome do responsável"
                      className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroNatureza">
                      Natureza da organização
                    </FieldLabel>
                    <FilterMultiSelect
                      id="filtroNatureza"
                      options={tipoAgenteOptions}
                      value={draft.natureza}
                      onChange={(value) => setDraftField("natureza", value)}
                      placeholder="Todas as naturezas"
                      summaryNoun="naturezas selecionadas"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroIniciativa">
                      Tipo de iniciativa cultural
                    </FieldLabel>
                    <FilterMultiSelect
                      id="filtroIniciativa"
                      options={tipoIniciativaOptions}
                      value={draft.iniciativa}
                      onChange={(value) => setDraftField("iniciativa", value)}
                      placeholder="Todos os tipos"
                      searchable
                      searchPlaceholder="Pesquisar tipo"
                      summaryNoun="tipos selecionados"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroAreas">
                      Áreas de atuação cultural
                    </FieldLabel>
                    <FilterMultiSelect
                      id="filtroAreas"
                      options={areaAtuacaoOptions}
                      value={draft.areas}
                      onChange={(value) => setDraftField("areas", value)}
                      placeholder="Todas as áreas"
                      searchable
                      searchPlaceholder="Pesquisar área"
                      summaryNoun="áreas selecionadas"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroSituacao">
                      Situação do cadastro
                    </FieldLabel>
                    <FilterMultiSelect
                      id="filtroSituacao"
                      options={situacaoOptions}
                      value={draft.situacao}
                      onChange={(value) => setDraftField("situacao", value)}
                      placeholder="Todas as situações"
                      summaryNoun="situações selecionadas"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroSortBy">Ordenar por</FieldLabel>
                    <Select
                      value={draft.sortBy}
                      onValueChange={(value) =>
                        setDraftField("sortBy", value as SortBy)
                      }
                    >
                      <SelectTrigger
                        id="filtroSortBy"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortByOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="filtroSortDir">Ordem</FieldLabel>
                    <Select
                      value={draft.sortDir}
                      onValueChange={(value) =>
                        setDraftField("sortDir", value as SortDir)
                      }
                    >
                      <SelectTrigger
                        id="filtroSortDir"
                        className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">
                          {sortDirLabels(draft.sortBy).asc}
                        </SelectItem>
                        <SelectItem value="desc">
                          {sortDirLabels(draft.sortBy).desc}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </SearchFilterGrid>

                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    className="h-9 gap-2 px-4"
                    onClick={handleClearFiltros}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Limpar filtros
                  </Button>
                  <Button
                    type="submit"
                    variant="glassPrimary"
                    className="h-9 gap-2 px-5"
                    disabled={searching}
                    aria-busy={searching}
                  >
                    {searching ? (
                      <Loader2
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : (
                      <Search className="h-4 w-4" aria-hidden />
                    )}
                    {searching ? "Pesquisando..." : "Pesquisar"}
                  </Button>
                </div>
              </form>
            </AdvancedSearchPanel>

            <ActiveFilters
              items={activeFilters}
              onClearAll={handleClearFiltros}
            />

            <div className="rounded-[14px] border border-border/70 bg-card/75 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/65 overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className="text-[12px] text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {filteredOrganizacoes.length === 0
                    ? "Nenhum registro encontrado"
                    : `${filteredOrganizacoes.length} ${filteredOrganizacoes.length === 1 ? "registro encontrado" : "registros encontrados"}`}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="glassSecondary"
                    onClick={handleExportExcel}
                    disabled={
                      filteredOrganizacoes.length === 0 || exportingExcel
                    }
                    className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                    title={
                      filteredOrganizacoes.length === 0
                        ? "Não há registros para exportar."
                        : "Exportar resultados para Excel"
                    }
                    aria-label="Exportar resultados para Excel"
                  >
                    {exportingExcel ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <FileSpreadsheet
                        className="h-3.5 w-3.5 text-green-600"
                        aria-hidden
                      />
                    )}
                    {exportingExcel ? "Gerando..." : "Excel"}
                  </Button>
                  <Button
                    type="button"
                    variant="glassSecondary"
                    onClick={handleExportCSV}
                    disabled={filteredOrganizacoes.length === 0 || exportingCSV}
                    className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                    title={
                      filteredOrganizacoes.length === 0
                        ? "Não há registros para exportar."
                        : "Exportar resultados para CSV"
                    }
                    aria-label="Exportar resultados para CSV"
                  >
                    {exportingCSV ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <FileDown
                        className="h-3.5 w-3.5 text-blue-600"
                        aria-hidden
                      />
                    )}
                    {exportingCSV ? "Gerando..." : "CSV"}
                  </Button>
                </div>
              </div>

              {filteredOrganizacoes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                    <SearchX className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Nenhuma organização encontrada
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                      Revise os filtros utilizados ou limpe a pesquisa para
                      visualizar todos os cadastros.
                    </p>
                  </div>
                  {activeCount > 0 && (
                    <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="h-9 px-4"
                        onClick={() => setPanelOpen(true)}
                      >
                        Revisar pesquisa
                      </Button>
                      <Button
                        type="button"
                        variant="glassPrimary"
                        className="h-9 gap-2 px-4"
                        onClick={handleClearFiltros}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                          <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Ações
                          </th>
                          <SortableTh sortKey="nome">Razão Social</SortableTh>
                          <SortableTh sortKey="nomeFantasia">
                            Nome Fantasia
                          </SortableTh>
                          <SortableTh sortKey="cnpj">CPF/CNPJ</SortableTh>
                          <SortableTh sortKey="natureza">Natureza</SortableTh>

                          <SortableTh sortKey="iniciativa">
                            Tipo de Iniciativa
                          </SortableTh>
                          <SortableTh sortKey="area">
                            Área de Atuação
                          </SortableTh>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrganizacoes.map((item) => {
                          const tipoAgente =
                            optionLabels.tipoAgente[
                              item.tipoAgente as keyof typeof optionLabels.tipoAgente
                            ] || item.tipoAgente;
                          const tipoIniciativa =
                            optionLabels.tipoIniciativaCultural[
                              item.tipoIniciativaCultural as keyof typeof optionLabels.tipoIniciativaCultural
                            ] || item.tipoIniciativaCultural;
                          const area = item.areasAtuacao
                            .map(
                              (value) =>
                                optionLabels.areaAtuacao[
                                  value as keyof typeof optionLabels.areaAtuacao
                                ] || value,
                            )
                            .join(", ");
                          const documento = formatDocumentoTabela(
                            item.cnpj,
                            item.tipoAgente,
                          );

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25"
                            >
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <RowActionsDropdown
                                  reportEndpoint={
                                    podeBaixar
                                      ? `/organizacoes/${item.id}/relatorio`
                                      : undefined
                                  }
                                  reportFilename={`organizacao-${item.id}.pdf`}
                                  onView={() => openRecord(item, "view")}
                                  onEdit={
                                    podeEditar
                                      ? () => openRecord(item, "edit")
                                      : undefined
                                  }
                                  onDelete={
                                    podeExcluir
                                      ? () => setConfirmDeleteId(item.id)
                                      : undefined
                                  }
                                />
                              </td>

                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText text={item.razaoSocial} bold>
                                  {item.razaoSocial}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={item.nomeFantasia || "—"}
                                  muted={!item.nomeFantasia}
                                >
                                  {item.nomeFantasia || "—"}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={documento}
                                  muted={documento === "—"}
                                >
                                  {documento}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={tipoAgente || "—"}
                                  muted={!tipoAgente}
                                >
                                  {tipoAgente || "—"}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <TableCellText
                                  text={tipoIniciativa || "—"}
                                  muted={!tipoIniciativa}
                                >
                                  {tipoIniciativa || "—"}
                                </TableCellText>
                              </td>
                              <td className="whitespace-nowrap px-6 py-2.5">
                                <div className="flex flex-nowrap gap-1.5">
                                  {item.areasAtuacao.length ? (
                                    <>
                                      {item.areasAtuacao
                                        .slice(0, 2)
                                        .map((value) => (
                                          <StatusPill
                                            key={value}
                                            status={value}
                                            ariaLabelPrefix="Área de atuação"
                                          />
                                        ))}
                                      {item.areasAtuacao.length > 2 && (
                                        <span
                                          className="status-pill status-na"
                                          title={item.areasAtuacao
                                            .slice(2)
                                            .map(
                                              (value) =>
                                                optionLabels.areaAtuacao[
                                                  value as keyof typeof optionLabels.areaAtuacao
                                                ] || value,
                                            )
                                            .join(", ")}
                                        >
                                          +{item.areasAtuacao.length - 2}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[13px] text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {pagedOrganizacoes.map((item) => {
                      const tipoAgente =
                        optionLabels.tipoAgente[
                          item.tipoAgente as keyof typeof optionLabels.tipoAgente
                        ] || item.tipoAgente;
                      const tipoIniciativa =
                        optionLabels.tipoIniciativaCultural[
                          item.tipoIniciativaCultural as keyof typeof optionLabels.tipoIniciativaCultural
                        ] || item.tipoIniciativaCultural;
                      const area = item.areasAtuacao
                        .map(
                          (value) =>
                            optionLabels.areaAtuacao[
                              value as keyof typeof optionLabels.areaAtuacao
                            ] || value,
                        )
                        .join(", ");
                      const documento = formatDocumentoTabela(
                        item.cnpj,
                        item.tipoAgente,
                      );

                      return (
                        <div key={item.id} className="p-4">
                          <div className="mb-3 flex items-center gap-1">
                            <RowActionsDropdown
                              reportEndpoint={
                                podeBaixar
                                  ? `/organizacoes/${item.id}/relatorio`
                                  : undefined
                              }
                              reportFilename={`organizacao-${item.id}.pdf`}
                              onView={() => openRecord(item, "view")}
                              onEdit={
                                podeEditar
                                  ? () => openRecord(item, "edit")
                                  : undefined
                              }
                              onDelete={
                                podeExcluir
                                  ? () => setConfirmDeleteId(item.id)
                                  : undefined
                              }
                            />
                          </div>

                          <p className="font-medium text-foreground">
                            {item.razaoSocial}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.nomeFantasia || documento}
                          </p>
                          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                            {tipoAgente && <p>{tipoAgente}</p>}
                            {tipoIniciativa && <p>{tipoIniciativa}</p>}
                            {area && <p>{area}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <DataTablePagination
                    totalItems={filteredOrganizacoes.length}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    entityLabel="registro"
                    entityLabelPlural="registros"
                    pageSizeLabel="Registros por página"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir organização?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Dados Institucionais"
        href="/wiki/institucional/dados-da-organizacao"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
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

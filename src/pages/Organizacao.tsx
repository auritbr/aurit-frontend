import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Eye,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserSquare2,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { EmailInput } from "@/components/EmailInput";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
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
import { MultiSelect } from "@/components/MultiSelect";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportOrganizacaoPdf } from "@/lib/pdfExporters";
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
import { maskCEP, maskCNPJ, maskCPF, maskPhone } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const ORGANIZACAO_NEXT_STEP_KEY = "aurit:organizacao:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

type SortKey = "nomePrincipal" | "nomeComplementar" | "documento" | "responsavel" | "tipoAgente" | "iniciativa" | "area";

type FormMode = "create" | "edit" | "view";

type TipoAgenteApi =
  | "PESSOA_FISICA"
  | "GRUPO_COLETIVO"
  | "MEI"
  | "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS"
  | "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS";

type TipoIniciativaCulturalApi =
  | "PONTO_DE_CULTURA"
  | "PONTAO_DE_CULTURA"
  | "ONG_CULTURAL"
  | "ASSOCIACAO_CULTURAL"
  | "COLETIVO_CULTURAL"
  | "GRUPO_ARTISTICO"
  | "PRODUTORA_CULTURAL"
  | "ESPACO_CULTURAL"
  | "INSTITUTO"
  | "OUTRO";

type AreaAtuacaoApi =
  | "CULTURA_ARTE"
  | "EDUCACAO"
  | "ASSISTENCIA_SOCIAL"
  | "ESPORTE"
  | "MEIO_AMBIENTE"
  | "ECONOMIA"
  | "DIREITOS_HUMANOS"
  | "SAUDE"
  | "TECNOLOGIA"
  | "OUTRO";

interface OrganizacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

interface RepresentanteLegalDTO {
  id?: number;
  nomeRepresentante?: string | null;
  cpfRepresentante?: string | null;
  rgRepresentante?: string | null;
  telefoneRepresentante?: string | null;
  emailRepresentante?: string | null;
}

interface OrganizacaoDTO {
  id?: number;
  organizacaoId?: number;
  idOrganizacao?: number;

  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  dataFundacao?: string | null;
  emailInstitucional?: string | null;
  telefoneInstitucional?: string | null;
  site?: string | null;
  territorioAtuacao?: string | null;
  historicoAtuacao?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  representanteLegal?: RepresentanteLegalDTO | null;

  tipoAgente?: TipoAgenteApi | string | null;
  tipoIniciativaCultural?: TipoIniciativaCulturalApi | string | null;
  areaAtuacao?: AreaAtuacaoApi | string | null;
  areasAtuacao?: Array<AreaAtuacaoApi | string> | null;
}

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

  representanteLegalId: string;
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

type OrganizacaoForm = OrganizacaoData;

const tipoAgenteOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa Física" },
  { value: "GRUPO_COLETIVO", label: "Grupo / Coletivo" },
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
  { value: "ONG_CULTURAL", label: "ONG Cultural" },
  { value: "ASSOCIACAO_CULTURAL", label: "Associação Cultural" },
  { value: "COLETIVO_CULTURAL", label: "Coletivo Cultural" },
  { value: "GRUPO_ARTISTICO", label: "Grupo Artístico" },
  { value: "PRODUTORA_CULTURAL", label: "Produtora Cultural" },
  { value: "ESPACO_CULTURAL", label: "Espaço Cultural" },
  { value: "INSTITUTO", label: "Instituto" },
  { value: "OUTRO", label: "Outro" },
] as const;

const areaAtuacaoOptions = [
  { value: "CULTURA_ARTE", label: "Cultura e Arte" },
  { value: "EDUCACAO", label: "Educação" },
  { value: "ASSISTENCIA_SOCIAL", label: "Assistência Social" },
  { value: "ESPORTE", label: "Esporte" },
  { value: "MEIO_AMBIENTE", label: "Meio Ambiente" },
  { value: "ECONOMIA", label: "Economia" },
  { value: "DIREITOS_HUMANOS", label: "Direitos Humanos" },
  { value: "SAUDE", label: "Saúde" },
  { value: "TECNOLOGIA", label: "Tecnologia" },
  { value: "OUTRO", label: "Outro" },
] as const;

const optionLabels = {
  tipoAgente: Object.fromEntries(
    tipoAgenteOptions.map((item) => [item.value, item.label]),
  ) as Record<string, string>,
  tipoIniciativaCultural: Object.fromEntries(
    tipoIniciativaOptions.map((item) => [item.value, item.label]),
  ) as Record<string, string>,
  areaAtuacao: Object.fromEntries(
    areaAtuacaoOptions.map((item) => [item.value, item.label]),
  ) as Record<string, string>,
};

const areasAtuacaoOptions = areaAtuacaoOptions.map((option) => option.value);

function getRequiredFields(tipoAgente?: string): Array<[keyof OrganizacaoForm, string]> {
  const fields: Array<[keyof OrganizacaoForm, string]> = [
    ["tipoAgente", "Tipo de Agente"],
    ["razaoSocial", getLabelRazaoSocial(tipoAgente)],
    ["cnpj", getLabelDocumentoPrincipal(tipoAgente)],
    ["dataFundacao", getLabelDataPrincipal(tipoAgente)],
    ["emailInstitucional", getLabelEmailPrincipal(tipoAgente)],
    ["telefoneInstitucional", getLabelTelefonePrincipal(tipoAgente)],
    ["tipoIniciativaCultural", "Tipo de Iniciativa Cultural"],
    ["areasAtuacao", "Área(s) de Atuação"],
    ["cep", "CEP"],
    ["logradouro", "Logradouro"],
    ["numero", "Número"],
    ["bairro", "Bairro"],
    ["cidade", "Cidade"],
    ["estado", "Estado"],
  ];

  if (deveMostrarTerritorioHistorico(tipoAgente)) {
    fields.push(["territorioAtuacao", "Território de Atuação"]);
    fields.push(["historicoAtuacao", "Histórico de Atuação Institucional"]);
  }

  if (deveMostrarRepresentanteLegal(tipoAgente)) {
    fields.push(["nomeRepresentanteLegal", getLabelNomeRepresentante(tipoAgente)]);
    fields.push(["cpfRepresentanteLegal", getLabelCpfRepresentante(tipoAgente)]);
    fields.push(["rgRepresentanteLegal", getLabelRgRepresentante(tipoAgente)]);
    fields.push(["telefoneRepresentanteLegal", getLabelTelefoneRepresentante(tipoAgente)]);
  }

  return fields;
}

const createEmptyForm = (): OrganizacaoForm => ({
  id: "",

  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataFundacao: "",
  emailInstitucional: "",
  telefoneInstitucional: "",
  site: "",
  territorioAtuacao: "",
  historicoAtuacao: "",

  representanteLegalId: "",
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
});

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, "");
}

function maskSite(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function normalizeSiteForPayload(value: string): string | null {
  const site = value.trim().replace(/\s+/g, "");

  if (!site) return null;

  if (/^https?:\/\//i.test(site)) {
    return site;
  }

  return `https://${site}`;
}

function formatSiteForView(value?: string | null): string {
  if (!value) return "";

  return value.replace(/^https?:\/\//i, "");
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

function labelFromMap(map: Record<string, string>, value?: string) {
  if (!value) return "";
  return map[value] ?? value;
}

function labelsFromMap(map: Record<string, string>, values?: string[]) {
  if (!values || values.length === 0) return [];

  return values
    .map((value) => labelFromMap(map, value))
    .filter(Boolean);
}

function formatAreasAtuacao(values?: string[]) {
  return labelsFromMap(optionLabels.areaAtuacao, values).join(", ");
}


function isPessoaFisica(tipoAgente?: string | null) {
  return tipoAgente === "PESSOA_FISICA";
}

function isMei(tipoAgente?: string | null) {
  return tipoAgente === "MEI";
}

function isPessoaJuridica(tipoAgente?: string | null) {
  return (
    tipoAgente === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS" ||
    tipoAgente === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS"
  );
}

function isColetivo(tipoAgente?: string | null) {
  return tipoAgente === "GRUPO_COLETIVO";
}

function deveMostrarRepresentanteLegal(tipoAgente?: string | null) {
  return !isPessoaFisica(tipoAgente);
}

function deveMostrarTerritorioHistorico(tipoAgente?: string | null) {
  return isPessoaJuridica(tipoAgente);
}

function getTituloDadosPrincipais(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Dados Pessoais";
  if (isColetivo(tipoAgente)) return "Dados do Coletivo";
  if (isMei(tipoAgente)) return "Dados do MEI";
  return "Dados Institucionais";
}

function getTituloContato(tipoAgente?: string | null) {
  if (isPessoaJuridica(tipoAgente)) return "Contato e Presença Institucional";
  return "Contato";
}

function getTituloRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "Representante";
  if (isColetivo(tipoAgente)) return "Representante do Coletivo";
  return "Representante legal";
}

function getLabelRazaoSocial(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Nome Completo";
  if (isColetivo(tipoAgente)) return "Nome do Grupo/Coletivo";
  return "Razão Social";
}

function getLabelNomeFantasia(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Nome Social ou Artístico";
  if (isColetivo(tipoAgente)) return "Nome Público do Coletivo";
  return "Nome Fantasia";
}

function getLabelDocumentoPrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "CPF";
  if (isColetivo(tipoAgente)) return "Documento de Identificação";
  return "CNPJ";
}

function getLabelDataPrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Data de Nascimento";
  if (isColetivo(tipoAgente)) return "Data de Criação";
  return "Data de Fundação";
}

function getLabelEmailPrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "E-mail";
  if (isMei(tipoAgente)) return "E-mail";
  if (isColetivo(tipoAgente)) return "E-mail do Coletivo";
  return "E-mail Institucional";
}

function getLabelTelefonePrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Telefone";
  if (isMei(tipoAgente)) return "Telefone";
  if (isColetivo(tipoAgente)) return "Telefone do coletivo";
  return "Telefone Institucional";
}

function getLabelNomeRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "Nome do Representante";
  if (isColetivo(tipoAgente)) return "Nome do Representante Legal";
  return "Nome do Representante Legal";
}

function getLabelCpfRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "CPF do Representante";
  return "CPF do Representante Legal";
}

function getLabelRgRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "RG do Representante";
  return "RG do Representante Legal";
}

function getLabelTelefoneRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "Telefone do Representante";
  return "Telefone do Representante Legal";
}

function getLabelEmailRepresentante(tipoAgente?: string | null) {
  if (isMei(tipoAgente)) return "E-mail do Representante";
  return "E-mail do Representante Legal";
}

function maskDocumentoPrincipal(value: string, tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return maskCPF(value);
  if (isMei(tipoAgente) || isPessoaJuridica(tipoAgente)) return maskCNPJ(value);

  return onlyDigits(value).slice(0, 20);
}

function formatDocumentoPrincipalForView(value?: string | null, tipoAgente?: string | null) {
  if (!value) return "";

  if (isPessoaFisica(tipoAgente)) return maskCPF(value);
  if (isMei(tipoAgente) || isPessoaJuridica(tipoAgente)) return maskCNPJ(value);

  return onlyDigits(value);
}

function getDocumentoPrincipalError(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) return "Informe um CPF válido com 11 dígitos.";
  if (isMei(tipoAgente) || isPessoaJuridica(tipoAgente)) {
    return "Informe um CNPJ válido com 14 dígitos.";
  }

  if (isColetivo(tipoAgente)) {
    return "Informe um documento de identificação com 5 a 20 dígitos.";
  }

  return "Informe um documento principal válido.";
}

function documentoPrincipalValido(tipoAgente: string, documento: string) {
  const digits = onlyDigits(documento);

  if (isPessoaFisica(tipoAgente)) return digits.length === 11;
  if (isMei(tipoAgente) || isPessoaJuridica(tipoAgente)) {
    return digits.length === 14;
  }

  if (isColetivo(tipoAgente)) {
    return digits.length >= 5 && digits.length <= 20;
  }

  return digits.length >= 5 && digits.length <= 20;
}

function getTooltipRazaoSocial(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) {
    return "Informe o nome completo da pessoa física, conforme documento oficial.";
  }

  if (isColetivo(tipoAgente)) {
    return "Informe o nome do grupo ou coletivo cultural.";
  }

  return "Informe a razão social conforme consta no CNPJ, contrato social, estatuto ou documento de constituição.";
}

function getTooltipNomeFantasia(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) {
    return "Informe o nome social, nome artístico ou nome pelo qual o agente é conhecido publicamente, se houver.";
  }

  if (isColetivo(tipoAgente)) {
    return "Informe o nome público ou nome de divulgação do coletivo, se houver.";
  }

  return "Informe o nome pelo qual a organização ou empresa é conhecida publicamente. Caso não tenha, pode repetir a razão social.";
}

function getTooltipDocumentoPrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) {
    return "Informe o CPF da pessoa física utilizando apenas números ou a máscara padrão.";
  }

  if (isColetivo(tipoAgente)) {
    return "Informe o documento de identificação do grupo/coletivo, utilizando apenas números.";
  }

  return "Informe o CNPJ utilizando apenas números ou a máscara padrão.";
}

function getTooltipDataPrincipal(tipoAgente?: string | null) {
  if (isPessoaFisica(tipoAgente)) {
    return "Informe a data de nascimento da pessoa física.";
  }

  if (isColetivo(tipoAgente)) {
    return "Informe a data de criação ou início de atuação do grupo/coletivo.";
  }

  return "Informe a data de fundação ou abertura formal.";
}

function mapOrganizacao(dto: OrganizacaoDTO): OrganizacaoData {
  return {
    id: String(dto.id ?? dto.organizacaoId ?? dto.idOrganizacao ?? ""),

    razaoSocial: dto.razaoSocial ?? "",
    nomeFantasia: dto.nomeFantasia ?? "",
    cnpj: formatDocumentoPrincipalForView(dto.cnpj, dto.tipoAgente),
    dataFundacao: dto.dataFundacao ?? "",
    emailInstitucional: dto.emailInstitucional ?? "",
    telefoneInstitucional: dto.telefoneInstitucional
      ? maskPhone(dto.telefoneInstitucional)
      : "",
    site: formatSiteForView(dto.site),
    territorioAtuacao: dto.territorioAtuacao ?? "",
    historicoAtuacao: dto.historicoAtuacao ?? "",

    representanteLegalId: String(dto.representanteLegal?.id ?? ""),
    nomeRepresentanteLegal: dto.representanteLegal?.nomeRepresentante ?? "",
    cpfRepresentanteLegal: dto.representanteLegal?.cpfRepresentante
      ? maskCPF(dto.representanteLegal.cpfRepresentante)
      : "",
    rgRepresentanteLegal: dto.representanteLegal?.rgRepresentante
      ? maskRGFlex(dto.representanteLegal.rgRepresentante)
      : "",
    telefoneRepresentanteLegal: dto.representanteLegal?.telefoneRepresentante
      ? maskPhone(dto.representanteLegal.telefoneRepresentante)
      : "",
    emailRepresentanteLegal: dto.representanteLegal?.emailRepresentante ?? "",

    tipoAgente: dto.tipoAgente ?? "",
    tipoIniciativaCultural: dto.tipoIniciativaCultural ?? "",
    areasAtuacao: dto.areasAtuacao?.length
      ? dto.areasAtuacao.map(String)
      : dto.areaAtuacao
        ? [String(dto.areaAtuacao)]
        : [],

    cep: dto.cep ? maskCEP(dto.cep) : "",
    logradouro: dto.logradouro ?? "",
    numero: dto.numero != null ? String(dto.numero) : "",
    complemento: dto.complemento ?? "",
    bairro: dto.bairro ?? "",
    cidade: dto.cidade ?? "",
    estado: resolverEstadoParaSelect(dto.estado),
  };
}

function buildPayload(form: OrganizacaoForm): OrganizacaoDTO {
  const mostraRepresentante = deveMostrarRepresentanteLegal(form.tipoAgente);
  const mostraTerritorioHistorico = deveMostrarTerritorioHistorico(form.tipoAgente);

  return {
    id: form.id ? Number(form.id) : undefined,

    razaoSocial: form.razaoSocial.trim(),
    nomeFantasia: form.nomeFantasia.trim() || null,
    cnpj: onlyDigits(form.cnpj),
    dataFundacao: form.dataFundacao,
    emailInstitucional: normalizeEmailInput(form.emailInstitucional),
    telefoneInstitucional: form.telefoneInstitucional.trim(),
    site: normalizeSiteForPayload(form.site),
    territorioAtuacao: mostraTerritorioHistorico
      ? form.territorioAtuacao.trim()
      : null,
    historicoAtuacao: mostraTerritorioHistorico
      ? form.historicoAtuacao.trim()
      : null,

    representanteLegal: mostraRepresentante
      ? {
          id: form.representanteLegalId
            ? Number(form.representanteLegalId)
            : undefined,
          nomeRepresentante: form.nomeRepresentanteLegal.trim(),
          cpfRepresentante: onlyDigits(form.cpfRepresentanteLegal),
          rgRepresentante: form.rgRepresentanteLegal.trim(),
          telefoneRepresentante: form.telefoneRepresentanteLegal.trim(),
          emailRepresentante:
            normalizeEmailInput(form.emailRepresentanteLegal) || null,
        }
      : null,

    tipoAgente: form.tipoAgente,
    tipoIniciativaCultural: form.tipoIniciativaCultural,
    areasAtuacao: form.areasAtuacao,

    cep: onlyDigits(form.cep),
    logradouro: form.logradouro.trim(),
    numero: Number(form.numero),
    complemento: form.complemento.trim() || null,
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado.trim(),
  };
}

function salvarProximaAcaoOrganizacao() {
  const card: OrganizacaoNextStepCardData = {
    titulo: "Agora complete os cadastros principais",
    descricao:
      "Após salvar os dados institucionais, mantenha atualizados os demais cadastros conforme a realidade da atuação.",
    acaoLabel: "Ir para diretoria",
    acaoUrl: "/diretoria",
    acaoSecundariaLabel: "Ver cadastros",
    acaoSecundariaUrl: "/organizacoes",
    variante: "pendente",
  };

  sessionStorage.setItem(ORGANIZACAO_NEXT_STEP_KEY, JSON.stringify(card));
}

export default function Organizacao() {
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoData[]>([]);
  const [form, setForm] = useState<OrganizacaoForm>(createEmptyForm);
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [nextStepCard, setNextStepCard] =
    useState<OrganizacaoNextStepCardData | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const tableRef = useRef<HTMLTableElement>(null);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const visualizando = mode === "view";
  const readOnly = visualizando;

  const tipoAgenteSelecionado = form.tipoAgente;
  const mostrarRepresentanteLegal =
    deveMostrarRepresentanteLegal(tipoAgenteSelecionado);
  const mostrarTerritorioHistorico =
    deveMostrarTerritorioHistorico(tipoAgenteSelecionado);

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("ORGANIZACAO");

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
    const raw = sessionStorage.getItem(ORGANIZACAO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as OrganizacaoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(ORGANIZACAO_NEXT_STEP_KEY);

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

    void carregarOrganizacoes();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarOrganizacoes(nextSelectedId?: string | null) {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const response = await fetch(`${API_URL}/organizacoes`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data: OrganizacaoDTO[] = await response.json();
      const mapped = (Array.isArray(data) ? data : []).map(mapOrganizacao);

      setOrganizacoes(mapped);

      const resolvedSelectedId = nextSelectedId ?? mapped[0]?.id ?? null;
      setSelectedId(resolvedSelectedId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados institucionais.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrganizacoes = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return organizacoes;

    return organizacoes.filter((item) => {
      const tipoAgente = labelFromMap(optionLabels.tipoAgente, item.tipoAgente);
      const tipoIniciativa = labelFromMap(
        optionLabels.tipoIniciativaCultural,
        item.tipoIniciativaCultural,
      );
      const area = formatAreasAtuacao(item.areasAtuacao);

      return [
        item.razaoSocial,
        item.nomeFantasia,
        item.cnpj,
        item.emailInstitucional,
        item.telefoneInstitucional,
        item.site,
        item.nomeRepresentanteLegal,
        tipoAgente,
        tipoIniciativa,
        area,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [organizacoes, search]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filteredOrganizacoes,
    (item, key: SortKey) => {
      switch (key) {
        case "nomePrincipal":
          return item.razaoSocial;
        case "nomeComplementar":
          return item.nomeFantasia ?? "";
        case "documento":
          return item.cnpj;
        case "responsavel":
          return item.nomeRepresentanteLegal ?? "";
        case "tipoAgente":
          return labelFromMap(optionLabels.tipoAgente, item.tipoAgente);
        case "iniciativa":
          return labelFromMap(
            optionLabels.tipoIniciativaCultural,
            item.tipoIniciativaCultural,
          );
        case "area":
          return formatAreasAtuacao(item.areasAtuacao);
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const setField = <K extends keyof OrganizacaoForm>(
    key: K,
    value: OrganizacaoForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openRecord = (record: OrganizacaoData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar dados institucionais.");
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
      toast.error("Você não possui permissão para cadastrar dados institucionais.");
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
      setConfirmDeleteId(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/organizacoes/${confirmDeleteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const wasSelected = selectedId === confirmDeleteId;

      setConfirmDeleteId(null);

      if (wasSelected) {
        handleCancel();
      }

      await carregarOrganizacoes(wasSelected ? null : selectedId);

      toast.success("Cadastro excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir cadastro.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDeleteId(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  async function handleExportPdf(item: OrganizacaoData) {
    if (!podeGerarPdf) {
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

      tipoAgente: labelFromMap(optionLabels.tipoAgente, item.tipoAgente),
      tipoIniciativaCultural: labelFromMap(
        optionLabels.tipoIniciativaCultural,
        item.tipoIniciativaCultural,
      ),
      areaAtuacao: formatAreasAtuacao(item.areasAtuacao),

      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,
    });
  }

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = onlyDigits(cepFormatado);

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

  const validarFormulario = () => {
    const missing = getRequiredFields(form.tipoAgente).find(([key]) => {
      const value = form[key];

      if (Array.isArray(value)) {
        return value.length === 0;
      }

      return !String(value ?? "").trim();
    });

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return false;
    }

    if (!documentoPrincipalValido(form.tipoAgente, form.cnpj)) {
      toast.error(getDocumentoPrincipalError(form.tipoAgente));
      return false;
    }

    if (
      mostrarRepresentanteLegal &&
      onlyDigits(form.cpfRepresentanteLegal).length !== 11
    ) {
      toast.error("Informe um CPF válido para o representante.");
      return false;
    }

    if (onlyDigits(form.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return false;
    }

    if (!isValidEmail(form.emailInstitucional)) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    if (
      mostrarRepresentanteLegal &&
      !isValidEmail(form.emailRepresentanteLegal)
    ) {
      toast.error("Informe um e-mail válido para o representante.");
      return false;
    }

    if (!/^\d+$/.test(form.numero.trim())) {
      toast.error("Informe um número de endereço válido.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    if (mode === "create" && !podeCriar) {
      toast.error("Você não possui permissão para cadastrar dados institucionais.");
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar dados institucionais.");
      return;
    }

    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const isCreating = mode === "create";
      const payload = buildPayload(form);

      const response = await fetch(
        mode === "edit" && form.id
          ? `${API_URL}/organizacoes/${form.id}`
          : `${API_URL}/organizacoes`,
        {
          method: mode === "edit" && form.id ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const savedDto: OrganizacaoDTO = await response.json();
      const saved = mapOrganizacao(savedDto);

      if (isCreating) {
        salvarProximaAcaoOrganizacao();
      }

      setShowForm(false);
      setMode("create");
      setForm(createEmptyForm());

      await carregarOrganizacoes(saved.id);

      if (isCreating) {
        const raw = sessionStorage.getItem(ORGANIZACAO_NEXT_STEP_KEY);

        if (raw) {
          try {
            const parsed = JSON.parse(raw) as OrganizacaoNextStepCardData;
            setNextStepCard(parsed);
          } catch {
            setNextStepCard(null);
          }

          sessionStorage.removeItem(ORGANIZACAO_NEXT_STEP_KEY);

          window.setTimeout(() => {
            setNextStepCard(null);
          }, NEXT_STEP_DURATION_MS);
        }
      }

      toast.success(
        isCreating
          ? "Dados institucionais cadastrados com sucesso."
          : "Dados institucionais salvos com sucesso.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar dados institucionais.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
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

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
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
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        <PageTitle
          title="Dados Institucionais"
          tooltip="Cadastre as informações oficiais do agente, organização, coletivo ou iniciativa cultural. Esses dados serão utilizados em documentos, relatórios, editais, prestações de contas e demais registros institucionais do sistema."
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

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {showForm && <FormLegend />}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section icon={Landmark} title="Perfil Institucional">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel
                    htmlFor="tipoAgente"
                    required={!visualizando}
                    tooltip="Selecione o tipo que melhor representa este agente cultural ou instituição. Ex.: pessoa jurídica sem fins lucrativos, MEI, pessoa física ou grupo/coletivo."
                  >
                    Tipo de Agente
                  </FieldLabel>

                  <Select
                    value={form.tipoAgente}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      setForm((prev) => ({
                        ...prev,
                        tipoAgente: value,
                        cnpj: maskDocumentoPrincipal(prev.cnpj, value),
                        territorioAtuacao: deveMostrarTerritorioHistorico(value)
                          ? prev.territorioAtuacao
                          : "",
                        historicoAtuacao: deveMostrarTerritorioHistorico(value)
                          ? prev.historicoAtuacao
                          : "",
                        representanteLegalId: deveMostrarRepresentanteLegal(value)
                          ? prev.representanteLegalId
                          : "",
                        nomeRepresentanteLegal: deveMostrarRepresentanteLegal(value)
                          ? prev.nomeRepresentanteLegal
                          : "",
                        cpfRepresentanteLegal: deveMostrarRepresentanteLegal(value)
                          ? prev.cpfRepresentanteLegal
                          : "",
                        rgRepresentanteLegal: deveMostrarRepresentanteLegal(value)
                          ? prev.rgRepresentanteLegal
                          : "",
                        telefoneRepresentanteLegal:
                          deveMostrarRepresentanteLegal(value)
                            ? prev.telefoneRepresentanteLegal
                            : "",
                        emailRepresentanteLegal:
                          deveMostrarRepresentanteLegal(value)
                            ? prev.emailRepresentanteLegal
                            : "",
                      }));
                    }}
                    disabled={readOnly || saving}
                  >
                    <SelectTrigger id="tipoAgente">
                      <SelectValue placeholder="Selecione" />
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
                    required={!visualizando}
                    tooltip="Selecione a categoria que melhor representa a atuação cultural do agente, coletivo ou instituição. Essa informação auxilia na organização do cadastro, identificação da iniciativa cultural e geração de relatórios e documentos institucionais. Ex.: Ponto de Cultura, coletivo cultural, associação cultural, grupo artístico ou produtora cultural."
                  >
                    Tipo de Iniciativa Cultural
                  </FieldLabel>

                  <Select
                    value={form.tipoIniciativaCultural}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      setField("tipoIniciativaCultural", value);
                    }}
                    disabled={readOnly || saving}
                  >
                    <SelectTrigger id="tipoIniciativaCultural">
                      <SelectValue placeholder="Selecione" />
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
                    required={!visualizando}
                    tooltip="Selecione uma ou mais áreas de atuação da organização. Ex.: Cultura e Arte, Educação, Assistência Social ou Direitos Humanos."
                  >
                    Áreas de Atuação
                  </FieldLabel>

                  <div
                    className={visualizando ? "pointer-events-none opacity-80" : ""}
                  >
                    <MultiSelect
                      id="areasAtuacao"
                      options={areasAtuacaoOptions}
                      value={form.areasAtuacao}
                      onChange={(value) => {
                        if (visualizando) return;
                        setField(
                          "areasAtuacao",
                          value.filter(Boolean).map(String),
                        );
                      }}
                      getOptionLabel={(option) =>
                        labelFromMap(optionLabels.areaAtuacao, option) || option
                      }
                    />
                  </div>
                </Field>
              </div>
            </Section>


            <Section icon={Building2} title={getTituloDadosPrincipais(tipoAgenteSelecionado)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="razaoSocial"
                    required={!visualizando}
                    tooltip={getTooltipRazaoSocial(tipoAgenteSelecionado)}
                  >
                    {getLabelRazaoSocial(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="razaoSocial"
                    value={form.razaoSocial}
                    onChange={(e) => setField("razaoSocial", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="nomeFantasia"
                    tooltip={getTooltipNomeFantasia(tipoAgenteSelecionado)}
                  >
                    {getLabelNomeFantasia(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="nomeFantasia"
                    value={form.nomeFantasia}
                    onChange={(e) => setField("nomeFantasia", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="cnpj"
                    required={!visualizando}
                    tooltip={getTooltipDocumentoPrincipal(tipoAgenteSelecionado)}
                  >
                    {getLabelDocumentoPrincipal(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="cnpj"
                    value={form.cnpj}
                    onChange={(e) =>
                      setField(
                        "cnpj",
                        maskDocumentoPrincipal(
                          e.target.value,
                          tipoAgenteSelecionado,
                        ),
                      )
                    }
                    inputMode="numeric"
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataFundacao"
                    required={!visualizando}
                    tooltip={getTooltipDataPrincipal(tipoAgenteSelecionado)}
                  >
                    {getLabelDataPrincipal(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="dataFundacao"
                    type="date"
                    value={form.dataFundacao}
                    onChange={(e) => setField("dataFundacao", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={Mail} title={getTituloContato(tipoAgenteSelecionado)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="emailInstitucional"
                    required={!visualizando}
                    tooltip="Informe o e-mail principal de contato. Esse contato pode ser usado em documentos, relatórios, inscrições em editais e comunicações oficiais."
                  >
                    {getLabelEmailPrincipal(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <EmailInput
                    id="emailInstitucional"
                    value={form.emailInstitucional}
                    onChange={(e) =>
                      setField("emailInstitucional", e.target.value)
                    }
                    disabled={readOnly || saving}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="telefoneInstitucional"
                    required={!visualizando}
                    tooltip="Informe o telefone principal de contato. Ex.: telefone fixo, celular ou WhatsApp usado oficialmente."
                  >
                    {getLabelTelefonePrincipal(tipoAgenteSelecionado)}
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
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="site"
                    tooltip="Informe o site, página institucional, portfólio online ou link público de apresentação, se houver. Ex.: trupencanta.org.br ou https://trupencanta.org.br."
                  >
                    Site
                  </FieldLabel>

                  <Input
                    id="site"
                    type="text"
                    inputMode="url"
                    value={form.site}
                    onChange={(e) => setField("site", e.target.value)}
                    onBlur={(e) => {
                      if (readOnly) return;
                      setField("site", maskSite(e.target.value));
                    }}
                    autoComplete="url"
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                {mostrarTerritorioHistorico && (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor="territorioAtuacao"
                        required={!visualizando}
                        tooltip="Descreva os bairros, comunidades, cidades ou regiões onde a organização atua ou já realizou ações. Ex.: Atuação em bairros de Juiz de Fora e comunidades rurais da Zona da Mata Mineira."
                      >
                        Território de Atuação
                      </FieldLabel>

                      <Textarea
                        id="territorioAtuacao"
                        value={form.territorioAtuacao}
                        onChange={(e) =>
                          setField("territorioAtuacao", e.target.value)
                        }
                        className="min-h-10 resize-y"
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>

                    <Field full>
                      <FieldLabel
                        htmlFor="historicoAtuacao"
                        required={!visualizando}
                        tooltip="Descreva a trajetória da organização, destacando quando iniciou suas atividades, principais ações realizadas, públicos atendidos, parcerias, conquistas e contribuições para o território. Ex.: Desde 2021, a organização desenvolve oficinas, apresentações e ações culturais voltadas para crianças, jovens e famílias da comunidade."
                      >
                        Histórico de Atuação Institucional
                      </FieldLabel>

                      <Textarea
                        id="historicoAtuacao"
                        value={form.historicoAtuacao}
                        onChange={(e) =>
                          setField("historicoAtuacao", e.target.value)
                        }
                        className="min-h-24 resize-y"
                        disabled={readOnly || saving}
                        readOnly={readOnly}
                      />
                    </Field>
                  </>
                )}
              </div>
            </Section>

            {mostrarRepresentanteLegal && (
            <Section icon={UserSquare2} title={getTituloRepresentante(tipoAgenteSelecionado)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomeRepresentanteLegal"
                    required={!visualizando}
                    tooltip="Informe o nome completo da pessoa representante, conforme documento oficial."
                  >
                    {getLabelNomeRepresentante(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="nomeRepresentanteLegal"
                    value={form.nomeRepresentanteLegal}
                    onChange={(e) =>
                      setField("nomeRepresentanteLegal", e.target.value)
                    }
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="cpfRepresentanteLegal"
                    required={!visualizando}
                    tooltip="Informe o CPF do representante utilizando apenas números ou a máscara padrão."
                  >
                    {getLabelCpfRepresentante(tipoAgenteSelecionado)}
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
                    inputMode="numeric"
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="rgRepresentanteLegal"
                    required={!visualizando}
                    tooltip="Informe o RG do representante conforme documento oficial."
                  >
                    {getLabelRgRepresentante(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <Input
                    id="rgRepresentanteLegal"
                    value={form.rgRepresentanteLegal}
                    onChange={(e) =>
                      setField(
                        "rgRepresentanteLegal",
                        maskRGFlex(e.target.value),
                      )
                    }
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="telefoneRepresentanteLegal"
                    required={!visualizando}
                    tooltip="Informe um telefone de contato do representante. Ex.: celular ou WhatsApp utilizado para comunicações oficiais."
                  >
                    {getLabelTelefoneRepresentante(tipoAgenteSelecionado)}
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
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="emailRepresentanteLegal"
                    tooltip="Informe o e-mail do representante, se houver. Esse campo pode ser usado em documentos, contratos, editais e comunicações formais."
                  >
                    {getLabelEmailRepresentante(tipoAgenteSelecionado)}
                  </FieldLabel>

                  <EmailInput
                    id="emailRepresentanteLegal"
                    value={form.emailRepresentanteLegal}
                    onChange={(e) =>
                      setField("emailRepresentanteLegal", e.target.value)
                    }
                    disabled={readOnly || saving}
                  />
                </Field>
              </div>
            </Section>

            )}

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
                      if (readOnly) return;

                      const cepFormatado = maskCEP(e.target.value);
                      setField("cep", cepFormatado);

                      const cepLimpo = onlyDigits(cepFormatado);

                      if (cepLimpo.length === 8) {
                        void buscarEnderecoPorCep(cepFormatado);
                      }
                    }}
                    inputMode="numeric"
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />

                  {cepLoading && !readOnly && (
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
                    onChange={(e) => setField("logradouro", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
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
                      setField(
                        "numero",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-4">
                  <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                  <Input
                    id="complemento"
                    value={form.complemento}
                    onChange={(e) => setField("complemento", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="bairro" required={!visualizando}>
                    Bairro
                  </FieldLabel>

                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cidade" required={!visualizando}>
                    Cidade
                  </FieldLabel>

                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    disabled={readOnly || saving}
                    readOnly={readOnly}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="estado" required={!visualizando}>
                    Estado
                  </FieldLabel>

                  <Select
                    value={form.estado}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      setField("estado", value);
                    }}
                    disabled={readOnly || saving}
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

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
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
        ) : (
          <div className="rounded border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                  aria-label="Buscar dados institucionais"
                />
              </div>

              {podeCriar && (
                <Button type="button" onClick={handleNew} className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Cadastrar dados
                </Button>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table ref={tableRef} className="w-full min-w-[1320px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Ações
                    </th>

                    <SortableHeader
                    label="Nome principal"
                    sortKey="nomePrincipal"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Nome complementar"
                    sortKey="nomeComplementar"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Documento"
                    sortKey="documento"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Responsável"
                    sortKey="responsavel"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Tipo de Agente"
                    sortKey="tipoAgente"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Iniciativa Cultural"
                    sortKey="iniciativa"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="w-[200px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                    <SortableHeader
                    label="Área de Atuação"
                    sortKey="area"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="w-[200px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
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
                    const tipoAgente = labelFromMap(
                      optionLabels.tipoAgente,
                      item.tipoAgente,
                    );

                    const tipoIniciativa = labelFromMap(
                      optionLabels.tipoIniciativaCultural,
                      item.tipoIniciativaCultural,
                    );

                    const area = formatAreasAtuacao(item.areasAtuacao);

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
                          <TableCellText text={item.cnpj}>
                            {item.cnpj}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <TableCellText
                            text={item.nomeRepresentanteLegal || "—"}
                            muted={!item.nomeRepresentanteLegal}
                          >
                            {item.nomeRepresentanteLegal || "—"}
                          </TableCellText>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <EnumBadge>{tipoAgente || "—"}</EnumBadge>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <EnumBadge>{tipoIniciativa || "—"}</EnumBadge>
                        </td>

                        <td className="whitespace-nowrap px-6 py-2.5">
                          <EnumBadge>{area || "—"}</EnumBadge>
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
                      message="Nenhum cadastro encontrado."
                    />
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {paginated.length === 0 ? (
                <MobileEmptyState message="Nenhum cadastro encontrado." />
              ) : (
                paginated.map((item) => {
                  const tipoAgente = labelFromMap(
                    optionLabels.tipoAgente,
                    item.tipoAgente,
                  );

                  const tipoIniciativa = labelFromMap(
                    optionLabels.tipoIniciativaCultural,
                    item.tipoIniciativaCultural,
                  );

                  const area = formatAreasAtuacao(item.areasAtuacao);

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
                        {item.razaoSocial}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.nomeFantasia || item.cnpj}
                      </p>

                      {item.nomeRepresentanteLegal && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Representante: {item.nomeRepresentanteLegal}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        {tipoAgente && <EnumBadge>{tipoAgente}</EnumBadge>}
                        {tipoIniciativa && (
                          <EnumBadge>{tipoIniciativa}</EnumBadge>
                        )}
                        {area && <EnumBadge>{area}</EnumBadge>}
                      </div>
                    </div>
                  );
                })
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
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso existam documentos,
              diretoria, colaboradores, integrantes, editais ou outros registros
              vinculados, o backend pode impedir a exclusão para preservar o
              histórico do cadastro.
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
        pageTitle="Dados Institucionais"
        href="https://www.aurit.com.br/wiki/institucional/dados-da-organizacao"
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
    <div className={`${full ? "sm:col-span-full" : ""} ${className}`}>
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
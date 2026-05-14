import { generateInstitutionalPdf, fmtList, type PdfClause } from "./pdfGenerator";
import type { Turma } from "@/data/turmas";
import { statusTurmaLabel, diaLabel } from "@/data/turmas";
import {
  statusProjetoLabel,
  areaAtuacaoLabel,
} from "@/data/projetos";
import { tipoEventoLabel, statusValueToLabel as evtStatus } from "@/data/eventosCulturais";
import {
  estrategiaLabel,
  statusValueToLabel as acaoStatus,
} from "@/data/acoesDivulgacao";
import type { CurriculoListItem } from "@/data/curriculos";
import type { TrajetoriaCultural } from "@/data/trajetoriasCulturais";
import {
  tipoAgenteLabels,
  type TipoAgente,
} from "@/data/agentes";
import type { Participante } from "@/data/participantes";
import {
  tipoPatrimonioLabel,
  estadoConservacaoLabel,
  statusPatrimonioLabel,
} from "@/data/patrimonio";
import {
  aplicacoesFinanceiro,
  formasPagamento,
  statusFinanceiro,
  tiposOperacao,
  labelFromList,
} from "@/data/financeiro";
import {
  statusValueToLabel,
  tipoLabel,
} from "@/data/atividades";
import type { Emprestimo } from "@/data/emprestimos";
import { getConfiguracaoEmpresa } from "./configuracaoEmpresaStore";
import type { AgenteDetalhadoResponseDTO } from "@/data/agentes";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const PLACEHOLDER = "Não se aplica";

const v = (s?: string | number | null) =>
  s !== null && s !== undefined && String(s).trim() !== ""
    ? String(s).trim()
    : PLACEHOLDER;

const dataPorExtenso = () =>
  new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatBRL = (n?: number | null) =>
  n == null
    ? PLACEHOLDER
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDateBR(date?: string | null) {
  if (!date) return PLACEHOLDER;

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function formatPercent(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return PLACEHOLDER;
  }

  const raw = String(value).trim();

  if (raw.includes("%")) return raw;

  return `${raw}%`;
}

function safeList(items?: string[] | null) {
  return items && items.length > 0 ? fmtList(items) : [PLACEHOLDER];
}

function labelOrValue(value?: string | null) {
  return v(value);
}


// =====================================================================
// TIPOS LOCAIS PARA PDF
// =====================================================================

type PrestacaoContasPdf = {
  id: string | number;

  propostaEdital?: string | null;
  planejamentosFinanceiros?: string | string[] | null;

  periodoInicio?: string | null;
  periodoFim?: string | null;
  dataEnvio?: string | null;
  dataAprovacao?: string | null;

  statusPrestacaoContas?: string | null;

  parecerInterno?: string | null;
  parecerExterno?: string | null;
  observacoesGerais?: string | null;
};

type PrestacaoMetasPdf = {
  id: string | number;

  prestacaoContas?: string | null;
  metaProjeto?: string | null;

  quantidadeExecutada?: string | number | null;
  observacaoCumprimento?: string | null;
  statusCumprimentoMeta?: string | null;

  evidencias?: string[] | null;
};

type EvidenciaExecucaoPdf = {
  id: string | number;

  tituloEvidencia?: string | null;
  observacaoEvidencia?: string | null;

  urlArquivo?: string | null;
  urlPublicacao?: string | null;

  tipoEvidencia?: string | null;

  projeto?: string | null;

  tipoVinculoEvidencia?: string | null;
  vinculoRelacionado?: string | null;

  propostaEdital?: string | null;
  atividade?: string | null;
  turma?: string | null;
  eventoCultural?: string | null;
  acaoDivulgacao?: string | null;
  presenca?: string | null;
};

type EditalPdf = {
  id: string | number;

  nomeEdital?: string | null;
  numeroEdital?: string | null;
  numeroInscricao?: string | null;
  anoEdital?: string | number | null;

  orgaoResponsavel?: string | null;
  linkEdital?: string | null;

  dataAbertura?: string | null;
  dataEncerramento?: string | null;
  dataResultado?: string | null;

  valorTotalDisponivel?: string | number | null;

  esferaEdital?: string | null;
  statusEdital?: string | null;

  observacao?: string | null;
  organizacao?: string | null;
  agente?: string | null;
};

type FinanceiroPdf = {
  id: string | number;

  organizacao?: string | null;
  numeroDocumento?: string | null;
  descricao?: string | null;

  dataPagamento?: string | null;
  dataVencimento?: string | null;

  colaborador?: string | null;
  nomePessoa?: string | null;
  cpfCnpj?: string | null;

  valor?: string | number | null;
  observacao?: string | null;

  tipoOperacaoFinanceira?: string | null;
  formaPagamento?: string | null;

  aplicacaoFinanceiro?: string | null;
  aplicacaoFinanceira?: string | null;

  statusFinanceiro?: string | null;

  planejamentoFinanceiro?: string | null;
  projeto?: string | null;
  atividade?: string | null;
  eventoCultural?: string | null;
  acaoDivulgacao?: string | null;
};


type PlanejamentoFinanceiroPdf = {
  id: string | number;

  nomePlanejamento?: string | null;
  justificativaPlanejamento?: string | null;

  quantidade?: string | number | null;
  unidadeMedida?: string | null;

  valorUnitario?: string | number | null;
  valorTotal?: string | number | null;

  propostaEdital?: string | null;
  equipeEdital?: string | null;
};

type PropostaEditalPdf = {
  id: string | number;

  tituloProjeto?: string | null;
  resumoProjeto?: string | null;

  justificativa?: string | null;
  justificativaProjeto?: string | null;

  metodologiaExecucao?: string | null;
  metodologia?: string | null;

  democratizacaoAcesso?: string | null;

  acoesAcessibilidade?: string | null;
  acessibilidade?: string | null;

  impactoEsperado?: string | null;

  valorSolicitado?: string | number | null;
  valorContrapartida?: string | number | null;

  dataSubmissao?: string | null;
  statusPropostaEdital?: string | null;
  motivoReprovacao?: string | null;

  organizacao?: string | null;
  edital?: string | null;
  projeto?: string | null;
  projetoBase?: string | null;
  agente?: string | null;
  agenteResponsavel?: string | null;

  equipeEdital?: string[] | string | null;
};

type DiretoriaPdf = {
  id: string | number;

  nomeCompleto?: string | null;
  dataNascimento?: string | null;

  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  cargoDiretoria?: string | null;
  statusDiretoria?: string | null;

  dataInicioMandato?: string | null;
  dataFimMandato?: string | null;
  dataAfastamento?: string | null;

  organizacao?: string | null;
  observacao?: string | null;
};

type HabilitacaoPdf = {
  id: string | number;

  propostaEdital?: string | null;
  agenteResponsavel?: string | null;

  dataInicioHabilitacao?: string | null;
  dataFinalEnvio?: string | null;
  dataLimiteHabilitacao?: string | null;
  dataEnvioDocumentacao?: string | null;

  statusHabilitacao?: string | null;

  dataRetornoAnalise?: string | null;
  exigenciaOuPendencia?: string | null;
  providenciaTomada?: string | null;
  dataRegularizacao?: string | null;
  dataConclusaoHabilitacao?: string | null;

  publicacaoOficial?: string | null;

  motivoInabilitacao?: string | null;
  observacoes?: string | null;
};

type EquipeEditalPdf = {
  id: string | number;

  propostaEdital?: string | null;
  agente?: string | null;

  tipoPessoa?: string | null;
  colaborador?: string | null;
  integrante?: string | null;
  pessoa?: string | null;

  funcaoProjeto?: string | null;
  cargaHorariaSemanal?: string | number | null;
  cargaHorariaPrevista?: string | number | null;
  valorPrevisto?: string | number | null;

  justificativaFuncao?: string | null;
  miniBiografia?: string | null;
};

type PlanoComunicacaoPdf = {
  id: string | number;

  quantidade?: string | number | null;
  formatoPlanoComunicacao?: string | null;
  localCirculacaoComunicacao?: string | null;

  dataInicio?: string | null;
  dataFim?: string | null;

  acaoDivulgacao?: string | null;
  organizacao?: string | null;
  status?: string | null;
};


type AtividadePdf = {
  id: string | number;
  nomeAtividade?: string | null;
  tipoAtividade?: string | null;
  status?: string | null;
  projeto?: string | null;
  local?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  quantidadeVagas?: string | number | null;
  publicoBeneficiadoAtividade?: string | null;
  descricao?: string | null;
  colaboradores?: string[] | null;
};

type ProjetoPdf = {
  id: string | number;

  nomeProjeto?: string | null;
  descricao?: string | null;
  objetivoGeral?: string | null;
  publicoAlvo?: string | null;
  acoesAcessibilidade?: string | null;
  localExecucao?: string | null;

  dataInicio?: string | null;
  dataFim?: string | null;

  status?: string | null;
  areaAtuacao?: string | null;
  origemProjeto?: string | null;

  objetivosEspecificos?: string[] | string | null;

  organizacao?: string | null;
  colaboradores?: string[] | string | null;
};

type EventoCulturalPdf = {
  id: string | number;

  nomeEvento: string;
  descricaoEvento: string;
  dataEvento: string;
  dataFim?: string | null;
  objetivoEvento: string;
  localEvento: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtoGerado: string;
  tipoEvento: any;
  status: any;
  projeto: string;
  colaboradores: string[];
};

type AcaoDivulgacaoPdf = {
  id: string | number;

  nomeAcao: string;
  descricaoAcao: string;
  objetivoAcao: string;
  realizacaoAcao: string;
  dataInicio: string;
  dataFim: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;

  status: any;
  projeto: string;
  colaboradores: string[];

  estrategiasDivulgacao?: string[];
  estrategiaDivulgacao?: string[];
};

type MetaProjetoPdf = {
  id: string | number;

  tituloMeta?: string | null;
  descricaoMeta?: string | null;
  quantidadePrevista?: string | number | null;
  formaComprovacao?: string | null;

  projeto?: string | null;
  propostaEdital?: string | null;
};


type PatrimonioPdf = {
  id: string | number;
  numeroPatrimonio: string;
  nomePatrimonio: string;
  dataAquisicao: string;
  descricaoPatrimonio: string;
  valorPatrimonio?: number | null;
  tipoPatrimonio: string;
  estadoConservacao: string;
  statusPatrimonio: string;
};

type ColaboradorPdf = {
  id: string | number;
  nomeCompleto?: string;
  nome?: string;
  email?: string;
  funcaoColaborador?: string;
  funcao?: string;
  tipoVinculo?: string;
  tipoVinculoLabel?: string;
  rg?: string;
  cpf?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string | number;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cargaHorariaSemanal?: number | string;
  dataInicioVinculo?: string;
  dataFimVinculo?: string;
};

type RepresentanteLegalPdf = {
  id?: number;
  nomeRepresentante?: string | null;
  cpfRepresentante?: string | null;
  rgRepresentante?: string | null;
  telefoneRepresentante?: string | null;
  emailRepresentante?: string | null;
};

type OrganizacaoPdf = {
  id?: string | number;
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
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  tipoAgente?: string | null;
  tipoIniciativaCultural?: string | null;
  areaAtuacao?: string | null;

  representanteLegal?: RepresentanteLegalPdf | null;

  nomeRepresentanteLegal?: string | null;
  cpfRepresentanteLegal?: string | null;
  rgRepresentanteLegal?: string | null;
  telefoneRepresentanteLegal?: string | null;
  emailRepresentanteLegal?: string | null;
};

type IntegrantePdf = {
  id: string | number;

  nomeCompleto?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  organizacao?: string | null;
  funcaoIntegrante?: string | null;
  dataEntrada?: string | null;
  dataSaida?: string | null;
  status?: string | null;
};

type IntegranteApi = {
  id: number;
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
};

type PatrimonioApi = {
  id: number;

  numeroPatrimonio: string;
  nomePatrimonio: string;

  dataAquisicao?: string | null;
  descricaoPatrimonio?: string | null;
  valorPatrimonio?: number | null;

  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  urlNotaFiscal?: string | null;

  tipoPatrimonio: string;
  estadoConservacao: string;
  statusPatrimonio?: string | null;

  organizacaoId?: number | null;
  projetoId?: number | null;
};

// =====================================================================
// HELPERS GERAIS
// =====================================================================

function onlyDigits(value?: string | number | null) {
  return value == null ? "" : String(value).replace(/\D/g, "");
}

function formatCpfCnpj(value?: string | number | null) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  return v(value);
}

function formatCep(value?: string | number | null) {
  const digits = onlyDigits(value);

  if (digits.length === 8) {
    return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }

  return v(value);
}

function formatCidadeEstado(cidade?: string | null, estado?: string | null) {
  return [cidade, estado].filter(Boolean).join(" - ") || PLACEHOLDER;
}

function formatEnderecoCompleto(data: {
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}) {
  return [
    data.logradouro,
    data.numero ? `nº ${data.numero}` : "",
    data.complemento ? `(${data.complemento})` : "",
    data.bairro,
    [data.cidade, data.estado].filter(Boolean).join(" - "),
    data.cep ? `CEP ${formatCep(data.cep)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function getColaboradorDisplayName(c: Partial<ColaboradorPdf> | undefined | null) {
  if (!c) return PLACEHOLDER;
  return c.nomeCompleto ?? c.nome ?? PLACEHOLDER;
}

function getColaboradorFuncao(c: Partial<ColaboradorPdf> | undefined | null) {
  if (!c) return PLACEHOLDER;
  return c.funcaoColaborador ?? c.funcao ?? PLACEHOLDER;
}

function getColaboradorEmail(c: Partial<ColaboradorPdf> | undefined | null) {
  if (!c) return PLACEHOLDER;
  return c.email ?? PLACEHOLDER;
}

function getColaboradorTipoVinculo(c: Partial<ColaboradorPdf> | undefined | null) {
  if (!c) return PLACEHOLDER;
  return c.tipoVinculoLabel ?? c.tipoVinculo ?? PLACEHOLDER;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// =====================================================================
// ORGANIZAÇÃO OFICIAL DOS DOCUMENTOS
// =====================================================================

function fallbackOrganizacaoFromEmpresa(): OrganizacaoPdf {
  const empresa = getConfiguracaoEmpresa();

  return {
    razaoSocial: empresa.nomeEmpresa,
    nomeFantasia: empresa.nomeEmpresa,
    cnpj: empresa.documentoIdentificacao,
    emailInstitucional: empresa.emailContato,
    telefoneInstitucional: empresa.telefoneContato,
    cep: empresa.cep,
    logradouro: empresa.logradouro,
    numero: empresa.numero,
    complemento: empresa.complemento,
    bairro: empresa.bairro,
    cidade: empresa.cidade,
    estado: empresa.estado,
    representanteLegal: null,
  };
}

async function buscarOrganizacaoPrincipal(): Promise<OrganizacaoPdf> {
  try {
    const response = await fetch(`${API_URL}/organizacoes`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return fallbackOrganizacaoFromEmpresa();
    }

    const data = await parseJsonSafe<OrganizacaoPdf[]>(response);

    if (!Array.isArray(data) || data.length === 0) {
      return fallbackOrganizacaoFromEmpresa();
    }

    return data[0];
  } catch (error) {
    console.error("Erro ao buscar organização para o PDF:", error);
    return fallbackOrganizacaoFromEmpresa();
  }
}

function getNomeInstitucional(org: OrganizacaoPdf) {
  return v(org.razaoSocial || org.nomeFantasia);
}

function getRazaoSocialInstitucional(org: OrganizacaoPdf) {
  return v(org.razaoSocial || org.nomeFantasia);
}

function getCnpjInstitucional(org: OrganizacaoPdf) {
  return formatCpfCnpj(org.cnpj);
}

function getEnderecoInstitucional(org: OrganizacaoPdf) {
  return v(
    formatEnderecoCompleto({
      logradouro: org.logradouro,
      numero: org.numero,
      complemento: org.complemento,
      bairro: org.bairro,
      cidade: org.cidade,
      estado: org.estado,
      cep: org.cep,
    }),
  );
}

function getMunicipioUFInstitucional(org: OrganizacaoPdf) {
  return formatCidadeEstado(org.cidade, org.estado);
}

function getRepresentanteNome(org: OrganizacaoPdf) {
  return v(org.representanteLegal?.nomeRepresentante);
}

function getRepresentanteCpf(org: OrganizacaoPdf) {
  return formatCpfCnpj(org.representanteLegal?.cpfRepresentante);
}

function getRepresentanteRg(org: OrganizacaoPdf) {
  return v(org.representanteLegal?.rgRepresentante);
}

function getRepresentanteTelefone(org: OrganizacaoPdf) {
  return v(org.representanteLegal?.telefoneRepresentante);
}

function getRepresentanteEmail(org: OrganizacaoPdf) {
  return v(org.representanteLegal?.emailRepresentante);
}

// =====================================================================
// BUSCAS AUXILIARES
// =====================================================================

async function buscarColaboradorPorId(
  colaboradorId?: string | number | null,
): Promise<{ nome: string; cpf?: string; rg?: string }> {
  if (!colaboradorId) return { nome: PLACEHOLDER };

  try {
    const response = await fetch(`${API_URL}/colaboradores/${colaboradorId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return { nome: PLACEHOLDER };

    const c = await parseJsonSafe<any>(response);

    return {
      nome: c?.nomeCompleto ?? PLACEHOLDER,
      cpf: c?.cpf ?? undefined,
      rg: c?.rg ?? undefined,
    };
  } catch (error) {
    console.error("Erro ao buscar colaborador para o PDF:", error);
    return { nome: PLACEHOLDER };
  }
}

async function buscarParticipantePorId(
  participanteId?: string | number | null,
): Promise<{ nome: string; cpf?: string; rg?: string }> {
  if (!participanteId) return { nome: PLACEHOLDER };

  try {
    const response = await fetch(`${API_URL}/participantes/${participanteId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return { nome: PLACEHOLDER };

    const p = await parseJsonSafe<any>(response);

    return {
      nome: p?.nomeCompleto ?? PLACEHOLDER,
      cpf: p?.cpf ?? undefined,
      rg: p?.rg ?? undefined,
    };
  } catch (error) {
    console.error("Erro ao buscar participante para o PDF:", error);
    return { nome: PLACEHOLDER };
  }
}

async function buscarIntegrantePorId(
  integranteId?: string | number | null,
): Promise<{ nome: string; cpf?: string; rg?: string }> {
  if (!integranteId) return { nome: PLACEHOLDER };

  try {
    const response = await fetch(`${API_URL}/integrantes/${integranteId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return { nome: PLACEHOLDER };

    const i = await parseJsonSafe<IntegranteApi>(response);

    return {
      nome: i?.nomeCompleto ?? PLACEHOLDER,
      cpf: i?.cpf ?? undefined,
      rg: i?.rg ?? undefined,
    };
  } catch (error) {
    console.error("Erro ao buscar integrante para o PDF:", error);
    return { nome: PLACEHOLDER };
  }
}

async function buscarPatrimonioPorId(
  patrimonioId?: string | number | null,
): Promise<PatrimonioApi | null> {
  if (!patrimonioId) return null;

  try {
    const response = await fetch(`${API_URL}/patrimonios/${patrimonioId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return null;
    return await parseJsonSafe<PatrimonioApi>(response);
  } catch (error) {
    console.error("Erro ao buscar patrimônio para o PDF:", error);
    return null;
  }
}

// =====================================================================
// TURMA
// =====================================================================

export async function exportTurmaPdf(t: Turma) {
  const ATIVIDADE =
    (t as any).atividadeNome?.trim?.() ||
    (t as any).atividade?.trim?.() ||
    PLACEHOLDER;

  const DESCRICAO =
    (t as any).descricaoTurma?.trim?.() || PLACEHOLDER;

  const DIA_ATIVIDADE = (t as any).diaAtividade
    ? diaLabel((t as any).diaAtividade)
    : PLACEHOLDER;

  const HORARIO_INICIO =
    (t as any).horarioInicio?.trim?.() || PLACEHOLDER;

  const HORARIO_FIM =
    (t as any).horarioFim?.trim?.() || PLACEHOLDER;

  const QUANTIDADE_VAGAS =
    (t as any).quantidadeVagas !== null &&
      (t as any).quantidadeVagas !== undefined &&
      String((t as any).quantidadeVagas).trim() !== ""
      ? String((t as any).quantidadeVagas)
      : PLACEHOLDER;

  const COLABORADORES = fmtList(
    (t as any).colaboradoresNomes ??
    (t as any).colaboradores ??
    [],
  );

  await generateInstitutionalPdf({
    title: "Ficha de Turma",
    documentNumber: `TUR-${String(t.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação da Turma",
        fields: [
          {
            label: "Nome da Turma",
            value: v((t as any).nomeTurma),
          },
          {
            label: "Status",
            value: statusTurmaLabel((t as any).status),
          },
        ],
      },
      {
        title: "2. Vínculo da Turma",
        fields: [
          {
            label: "Atividade Vinculada",
            value: ATIVIDADE,
          },
        ],
      },
      {
        title: "3. Informações da Turma",
        fields: [
          {
            label: "Dia da Atividade",
            value: DIA_ATIVIDADE,
          },
          {
            label: "Horário de Início",
            value: HORARIO_INICIO,
          },
          {
            label: "Horário de Término",
            value: HORARIO_FIM,
          },
          {
            label: "Quantidade de Vagas",
            value: QUANTIDADE_VAGAS,
          },
        ],
      },
      {
        title: "4. Descrição da Turma",
        justifiedParagraphs: [DESCRICAO],
      },
      {
        title: "5. Responsáveis / Colaboradores",
        list: {
          items: COLABORADORES.length > 0 ? COLABORADORES : [PLACEHOLDER],
        },
      },
    ],
  });
}

// =====================================================================
// PROJETO
// =====================================================================

export async function exportProjetoPdf(p: ProjetoPdf) {
  const NOME_PROJETO = p.nomeProjeto?.trim() || PLACEHOLDER;

  const DESCRICAO = p.descricao?.trim() || PLACEHOLDER;

  const OBJETIVO_GERAL = p.objetivoGeral?.trim() || PLACEHOLDER;

  const PUBLICO_ALVO = p.publicoAlvo?.trim() || PLACEHOLDER;

  const ACOES_ACESSIBILIDADE =
    p.acoesAcessibilidade?.trim() || PLACEHOLDER;

  const LOCAL_EXECUCAO = p.localExecucao?.trim() || PLACEHOLDER;

  const STATUS_PROJETO =
    p.status && String(p.status).trim()
      ? statusValueToLabel(p.status as any)
      : PLACEHOLDER;

  const AREA_ATUACAO =
    p.areaAtuacao && String(p.areaAtuacao).trim()
      ? areaAtuacaoLabel(p.areaAtuacao as any)
      : PLACEHOLDER;

  const ORIGEM_PROJETO =
    p.origemProjeto?.trim() || PLACEHOLDER;

  const ORGANIZACAO = p.organizacao?.trim() || PLACEHOLDER;

  const OBJETIVOS_ESPECIFICOS = Array.isArray(p.objetivosEspecificos)
    ? p.objetivosEspecificos
      .map((item) => item?.trim())
      .filter(Boolean)
      .map((item, index) => `${index + 1}º Objetivo Específico: ${item}`)
    : p.objetivosEspecificos?.trim()
      ? [`1º Objetivo Específico: ${p.objetivosEspecificos.trim()}`]
      : [PLACEHOLDER];

  const COLABORADORES = Array.isArray(p.colaboradores)
    ? p.colaboradores.map((item) => item?.trim()).filter(Boolean)
    : p.colaboradores?.trim()
      ? [p.colaboradores.trim()]
      : [];

  await generateInstitutionalPdf({
    title: "Ficha de Projeto",
    documentNumber: `PRJ-${String(p.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação do Projeto",
        fields: [
          {
            label: "Nome do Projeto",
            value: NOME_PROJETO,
          },
          {
            label: "Organização",
            value: ORGANIZACAO,
          },
          {
            label: "Status do Projeto",
            value: STATUS_PROJETO,
          },
          {
            label: "Área de Atuação",
            value: AREA_ATUACAO,
          },
          {
            label: "Origem do Projeto",
            value: ORIGEM_PROJETO,
          },
        ],
      },
      {
        title: "2. Informações de Execução",
        fields: [
          {
            label: "Público-alvo",
            value: PUBLICO_ALVO,
          },
          {
            label: "Local de Execução",
            value: LOCAL_EXECUCAO,
          },
          {
            label: "Data de Início do Projeto",
            value: formatDateBR(p.dataInicio),
          },
          {
            label: "Data de Término do Projeto",
            value: formatDateBR(p.dataFim),
          },
        ],
      },
      {
        title: "3. Descrição",
        justifiedParagraphs: [DESCRICAO],
      },
      {
        title: "4. Objetivo Geral",
        justifiedParagraphs: [OBJETIVO_GERAL],
      },
      {
        title: "5. Objetivos Específicos",
        list: {
          items: OBJETIVOS_ESPECIFICOS,
        },
      },
      {
        title: "6. Público-alvo",
        justifiedParagraphs: [PUBLICO_ALVO],
      },
      {
        title: "7. Ações de Acessibilidade",
        justifiedParagraphs: [ACOES_ACESSIBILIDADE],
      },
      {
        title: "8. Colaboradores",
        list: {
          items:
            COLABORADORES.length > 0
              ? COLABORADORES
              : [PLACEHOLDER],
        },
      },
    ],
  });
}

// =====================================================================
// EVENTO CULTURAL
// =====================================================================

export async function exportEventoCulturalPdf(e: EventoCulturalPdf) {
  await generateInstitutionalPdf({
    title: "Ficha de Evento Cultural",
    documentNumber: `EVT-${String(e.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Dados Gerais do Evento",
        fields: [
          {
            label: "Nome do Evento",
            value: e.nomeEvento,
          },
          {
            label: "Tipo de Evento",
            value: tipoEventoLabel(e.tipoEvento),
          },
          {
            label: "Status do Evento",
            value: evtStatus(e.status),
          },
          {
            label: "Projeto",
            value: e.projeto,
          },
        ],
      },
      {
        title: "2. Período e Local de Realização",
        fields: [
          {
            label: "Data do Evento",
            value: formatDateBR(e.dataEvento),
          },
          {
            label: "Data de Término do Evento",
            value: formatDateBR(e.dataFim),
          },
          {
            label: "Local do Evento",
            value: e.localEvento,
          },
        ],
      },
      {
        title: "3. Descrição do Evento",
        justifiedParagraphs: e.descricaoEvento
          ? [e.descricaoEvento]
          : [PLACEHOLDER],
      },
      {
        title: "4. Objetivo do Evento",
        justifiedParagraphs: e.objetivoEvento
          ? [e.objetivoEvento]
          : [PLACEHOLDER],
      },
      {
        title: "5. Ações de Acessibilidade",
        justifiedParagraphs: e.acoesAcessibilidade
          ? [e.acoesAcessibilidade]
          : [PLACEHOLDER],
      },
      {
        title: "6. Resultado Esperado",
        justifiedParagraphs: e.resultadoEsperado
          ? [e.resultadoEsperado]
          : [PLACEHOLDER],
      },
      {
        title: "7. Produto Gerado",
        justifiedParagraphs: e.produtoGerado
          ? [e.produtoGerado]
          : [PLACEHOLDER],
      },
      {
        title: "8. Equipe Envolvida",
        list: {
          items: fmtList(e.colaboradores),
        },
      },
    ],
  });
}

// =====================================================================
// AÇÃO DE DIVULGAÇÃO
// =====================================================================

export async function exportAcaoDivulgacaoPdf(a: AcaoDivulgacaoPdf) {
  const estrategias = a.estrategiasDivulgacao ?? a.estrategiaDivulgacao ?? [];

  await generateInstitutionalPdf({
    title: "Ficha de Ação de Divulgação",
    documentNumber: `ADV-${String(a.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Dados Gerais da Ação",
        fields: [
          {
            label: "Nome da Ação",
            value: a.nomeAcao,
          },
          {
            label: "Status da Ação",
            value: acaoStatus(a.status),
          },
          {
            label: "Projeto",
            value: a.projeto,
          },
        ],
      },
      {
        title: "2. Período e Realização",
        fields: [
          {
            label: "Realização da Ação",
            value: a.realizacaoAcao,
          },
          {
            label: "Data de Início da Ação",
            value: formatDateBR(a.dataInicio),
          },
          {
            label: "Data de Término da Ação",
            value: formatDateBR(a.dataFim),
          },
        ],
      },
      {
        title: "3. Descrição da Ação",
        justifiedParagraphs: a.descricaoAcao
          ? [a.descricaoAcao]
          : [PLACEHOLDER],
      },
      {
        title: "4. Objetivo da Ação",
        justifiedParagraphs: a.objetivoAcao
          ? [a.objetivoAcao]
          : [PLACEHOLDER],
      },
      {
        title: "5. Ações de Acessibilidade",
        justifiedParagraphs: a.acoesAcessibilidade
          ? [a.acoesAcessibilidade]
          : [PLACEHOLDER],
      },
      {
        title: "6. Resultado Esperado",
        justifiedParagraphs: a.resultadoEsperado
          ? [a.resultadoEsperado]
          : [PLACEHOLDER],
      },
      {
        title: "7. Produtos Gerados",
        justifiedParagraphs: a.produtosGerados
          ? [a.produtosGerados]
          : [PLACEHOLDER],
      },
      {
        title: "8. Estratégias de Divulgação",
        list: {
          items: estrategias.length
            ? estrategias.map(estrategiaLabel)
            : [PLACEHOLDER],
        },
      },
      {
        title: "9. Equipe Envolvida",
        list: {
          items: fmtList(a.colaboradores),
        },
      },
    ],
  });
}

// =====================================================================
// CURRÍCULO
// =====================================================================

export async function exportCurriculoPdf(c: CurriculoListItem) {
  await generateInstitutionalPdf({
    title: "Currículo Profissional",
    documentNumber: `CUR-${String(c.id).padStart(4, "0")}`,
    sections: [
      { centeredHeading: c.nomeCompleto ?? PLACEHOLDER },
      { title: "Formação acadêmica", list: { items: fmtList(c.formacaoAcademica) } },
      { title: "Atuação profissional", list: { items: fmtList(c.atuacaoProfissional) } },
      { title: "Experiências relevantes", list: { items: fmtList(c.experienciasRelevantes) } },
      {
        title: "Atividades formativas e participações",
        list: { items: fmtList(c.atividadesFormativasParticipacoes) },
      },
      { title: "Habilidades e competências", list: { items: fmtList(c.habilidadesCompetencias) } },
      { title: "Atuação sociocultural", list: { items: fmtList(c.atuacaoSociocultural) } },
    ],
  });
}

// =====================================================================
// TRAJETÓRIA CULTURAL
// =====================================================================

export async function exportTrajetoriaCulturalPdf(t: TrajetoriaCultural) {
  const textoNormalizado = (t.textoTrajetoria ?? "").replace(/\r\n/g, "\n");

  const paragraphs = textoNormalizado
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  await generateInstitutionalPdf({
    title: "Trajetória Cultural",
    documentNumber: `TRJ-${String(t.id).padStart(4, "0")}`,
    sections: [
      { centeredHeading: t.nomeCompleto || "—" },
      {
        justifiedParagraphs:
          paragraphs.length > 0 ? paragraphs : ["—"],
      },
    ],
  });
}

// =====================================================================
// TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ
// =====================================================================

export async function exportTermoImagemPdf(p: Participante) {
  const org = await buscarOrganizacaoPrincipal();

  const enderecoParticipante = formatEnderecoCompleto({
    logradouro: (p as any).logradouro,
    numero: (p as any).numero,
    complemento: (p as any).complemento,
    bairro: (p as any).bairro,
    cidade: (p as any).cidade,
    estado: (p as any).estado,
    cep: (p as any).cep,
  });

  const NOME = v((p as any).nomeCompleto);
  const RG = v((p as any).rg);
  const CPF = formatCpfCnpj((p as any).cpf);
  const ENDERECO = v(enderecoParticipante);
  const TELEFONE = v((p as any).telefone);
  const NOME_INST = getNomeInstitucional(org);
  const CNPJ_INST = getCnpjInstitucional(org);
  const municipioUF = getMunicipioUFInstitucional(org);

  const clauses: PdfClause[] = [
    {
      titulo: "Cláusula Primeira – Do Objeto da Autorização",
      itens: [
        `1.1. O presente termo tem por objeto a autorização, concedida pelo(a) AUTORIZANTE acima qualificado(a), do uso de sua imagem e voz, captadas por meio de fotografias, filmagens, gravações de áudio e vídeo, em todas as ações, atividades, eventos e materiais relacionados às finalidades institucionais, culturais e educativas da instituição ${NOME_INST}.`,
        `1.2. A autorização abrange o uso da imagem e voz do(a) AUTORIZANTE em quaisquer mídias, físicas ou digitais, incluindo, mas não se limitando a: redes sociais, sites institucionais, materiais gráficos, relatórios, prestações de contas, vídeos institucionais, exposições, publicações em editais e plataformas de divulgação cultural.`,
      ],
    },
    {
      titulo: "Cláusula Segunda – Da Finalidade",
      itens: [
        `2.1. As imagens e gravações poderão ser utilizadas exclusivamente para fins institucionais, educativos, culturais, de divulgação e de prestação de contas, sem qualquer finalidade comercial direta ou intenção de lucro a partir da imagem cedida.`,
      ],
    },
    {
      titulo: "Cláusula Terceira – Da Gratuidade",
      itens: [
        `3.1. Esta autorização é concedida em caráter gratuito, não cabendo ao(à) AUTORIZANTE qualquer remuneração, indenização ou contrapartida financeira pelo uso de sua imagem e voz nos termos aqui descritos.`,
      ],
    },
    {
      titulo: "Cláusula Quarta – Da Vigência",
      itens: [
        `4.1. A presente autorização tem prazo de vigência indeterminado, podendo ser revogada a qualquer tempo mediante comunicação formal e por escrito à instituição, preservados os usos já realizados até a data da revogação.`,
      ],
    },
    {
      titulo: "Cláusula Quinta – Das Declarações",
      itens: [
        `5.1. O(a) AUTORIZANTE declara estar ciente de todo o conteúdo deste Termo, concordando integralmente com seus termos, e reconhece que a instituição poderá editar, adaptar e reproduzir o material captado, desde que respeitada a finalidade aqui descrita e a integridade moral do(a) AUTORIZANTE.`,
        `5.2. Por estar de acordo com os termos acima, firma o(a) AUTORIZANTE a presente autorização, podendo ser contatado(a), quando necessário, pelo telefone ${TELEFONE}.`,
      ],
    },
  ];

  await generateInstitutionalPdf({
    title: "Termo de Autorização de Uso de Imagem e Voz",
    documentNumber: `TIV-${String((p as any).id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          `Eu, ${NOME}, portador(a) do RG nº ${RG} e do CPF nº ${CPF}, residente e domiciliado(a) em ${ENDERECO}, AUTORIZO, de forma gratuita e por prazo indeterminado, a instituição ${NOME_INST}, inscrita no CNPJ sob o nº ${CNPJ_INST}, a utilizar minha imagem e voz nos termos das cláusulas a seguir.`,
        ],
      },
      { clauses },
      { rightAlignedLine: `${municipioUF}, ${dataPorExtenso()}.` },
      {
        signature: {
          nome: NOME,
          cpf: (p as any).cpf,
          rotulo: "AUTORIZANTE",
        },
      },
    ],
  });
}

// =====================================================================
// FICHA DE PATRIMÔNIO
// =====================================================================

export async function exportPatrimonioPdf(p: PatrimonioPdf) {
  const org = await buscarOrganizacaoPrincipal();

  const NOME_INST = getNomeInstitucional(org);

  const patrimonio = p as PatrimonioPdf & {
    organizacao?: string | null;
    projeto?: string | null;
    marca?: string | null;
    modelo?: string | null;
    numeroSerie?: string | null;
  };

  const ORGANIZACAO = v(patrimonio.organizacao || NOME_INST);
  const PROJETO = v(patrimonio.projeto);

  const MARCA = v(patrimonio.marca);
  const MODELO = v(patrimonio.modelo);
  const NUMERO_SERIE = v(patrimonio.numeroSerie);

  const DESCRICAO = v(patrimonio.descricaoPatrimonio);

  await generateInstitutionalPdf({
    title: "Ficha de Patrimônio",
    documentNumber: `PAT-${String(patrimonio.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Vinculação Institucional",
        fields: [
          {
            label: "Organização",
            value: ORGANIZACAO,
          },
          {
            label: "Projeto",
            value: PROJETO,
          },
        ],
      },
      {
        title: "2. Identificação do Bem",
        fields: [
          {
            label: "Número do Patrimônio",
            value: patrimonio.numeroPatrimonio,
          },
          {
            label: "Nome do Patrimônio",
            value: patrimonio.nomePatrimonio,
          },
          {
            label: "Marca",
            value: MARCA,
          },
          {
            label: "Modelo",
            value: MODELO,
          },
          {
            label: "Número de Série",
            value: NUMERO_SERIE,
          },
        ],
      },
      {
        title: "3. Dados do Bem",
        fields: [
          {
            label: "Data de Aquisição",
            value: formatDateBR(patrimonio.dataAquisicao),
          },
          {
            label: "Valor do Patrimônio",
            value: formatBRL(patrimonio.valorPatrimonio),
          },
          {
            label: "Descrição do Patrimônio",
            value: DESCRICAO,
          },
        ],
      },
      {
        title: "4. Classificação e Situação",
        fields: [
          {
            label: "Tipo de Patrimônio",
            value: tipoPatrimonioLabel(patrimonio.tipoPatrimonio),
          },
          {
            label: "Estado de Conservação",
            value: estadoConservacaoLabel(patrimonio.estadoConservacao),
          },
          {
            label: "Status do Patrimônio",
            value: statusPatrimonioLabel(patrimonio.statusPatrimonio),
          },
        ],
      },
    ],
  });
}

// =====================================================================
// TERMO DE EMPRÉSTIMO E RESPONSABILIDADE DE BEM
// =====================================================================

async function destinatarioInfo(
  e: Emprestimo,
): Promise<{ nome: string; cpf?: string; rg?: string }> {
  switch ((e as any).tipoDestinatario) {
    case "COLABORADOR":
      return buscarColaboradorPorId((e as any).colaboradorId);

    case "PARTICIPANTE":
      return buscarParticipantePorId((e as any).participanteId);

    case "INTEGRANTE":
      return buscarIntegrantePorId((e as any).integranteId);

    case "EXTERNO":
      return { nome: (e as any).destinatarioExterno ?? PLACEHOLDER };

    default:
      return { nome: PLACEHOLDER };
  }
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

async function buscarNomePorId(
  endpoint: string,
  id?: string | number | null,
  camposPossiveis: string[] = ["nome"],
): Promise<string> {
  if (!hasValue(id)) return "";

  try {
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.warn(`Não foi possível buscar ${endpoint}/${id}`);
      return "";
    }

    const data = await parseJsonSafe<any>(response);

    if (!data) return "";

    for (const campo of camposPossiveis) {
      if (hasValue(data[campo])) {
        return String(data[campo]).trim();
      }
    }

    return "";
  } catch (error) {
    console.error(`Erro ao buscar ${endpoint}/${id} para o PDF:`, error);
    return "";
  }
}

async function buildContextoEmprestimoFields(e: Emprestimo) {
  const data = e as any;

  const fields: { label: string; value: string }[] = [];

  const projetoId = data.projetoId ?? data.projeto;
  const propostaEditalId = data.propostaEditalId ?? data.propostaEdital;
  const atividadeId = data.atividadeId ?? data.atividade;
  const eventoCulturalId = data.eventoCulturalId ?? data.eventoCultural;

  const [projetoNome, propostaEditalNome, atividadeNome, eventoCulturalNome] =
    await Promise.all([
      buscarNomePorId("projetos", projetoId, [
        "nomeProjeto",
        "nome",
        "titulo",
      ]),

      buscarNomePorId("propostas-editais", propostaEditalId, [
        "tituloProjeto",
        "titulo",
        "nome",
      ]),

      buscarNomePorId("atividades", atividadeId, [
        "nomeAtividade",
        "nome",
        "titulo",
      ]),

      buscarNomePorId("eventos-culturais", eventoCulturalId, [
        "nomeEvento",
        "nome",
        "titulo",
      ]),
    ]);

  if (hasValue(projetoNome)) {
    fields.push({
      label: "Projeto",
      value: projetoNome,
    });
  }

  if (hasValue(propostaEditalNome)) {
    fields.push({
      label: "Proposta de Edital",
      value: propostaEditalNome,
    });
  }

  if (hasValue(atividadeNome)) {
    fields.push({
      label: "Atividade",
      value: atividadeNome,
    });
  }

  if (hasValue(eventoCulturalNome)) {
    fields.push({
      label: "Evento Cultural",
      value: eventoCulturalNome,
    });
  }

  if (!fields.length) {
    fields.push({
      label: "Contexto do Empréstimo",
      value: "Não informado",
    });
  }

  return fields;
}

export async function exportTermoEmprestimoPdf(e: Emprestimo) {
  const org = await buscarOrganizacaoPrincipal();
  const patrimonio = await buscarPatrimonioPorId((e as any).patrimonioId);
  const dest = await destinatarioInfo(e);

  const contextoEmprestimoFields = await buildContextoEmprestimoFields(e);

  const NOME_INST = getNomeInstitucional(org);
  const CNPJ = getCnpjInstitucional(org);
  const ENDERECO_INST = getEnderecoInstitucional(org);
  const municipioUF = getMunicipioUFInstitucional(org);

  const REPRESENTANTE = getRepresentanteNome(org);
  const CPF_REPR = getRepresentanteCpf(org);

  const NOME_RESP = v(dest.nome);
  const CPF_RESP = formatCpfCnpj(dest.cpf);
  const RG_RESP = v(dest.rg);

  const NOME_BEM = v(patrimonio?.nomePatrimonio);
  const NUM_BEM = v(patrimonio?.numeroPatrimonio);

  const CATEGORIA = patrimonio
    ? tipoPatrimonioLabel(patrimonio.tipoPatrimonio)
    : PLACEHOLDER;

  const CONSERV = patrimonio
    ? estadoConservacaoLabel(
      (e as any).estadoConservacao || patrimonio.estadoConservacao,
    )
    : PLACEHOLDER;

  const DATA_EMP = formatDateBR((e as any).dataEmprestimo);

  const OBS_TXT = (e as any).observacaoEmprestimo?.trim() || PLACEHOLDER;

  const introCedente = `Pelo presente instrumento particular, de um lado, ${NOME_INST}, inscrita no CNPJ sob o nº ${CNPJ}, com sede na ${ENDERECO_INST}, neste ato representada por ${REPRESENTANTE}, inscrito no CPF sob o nº ${CPF_REPR}, doravante denominada simplesmente CEDENTE.`;

  const introResponsavel = `De outro lado, ${NOME_RESP}, portador(a) do CPF nº ${CPF_RESP} e RG nº ${RG_RESP}, doravante denominado(a) simplesmente RESPONSÁVEL.`;

  const introFechamento = `As partes acima identificadas firmam o presente TERMO DE EMPRÉSTIMO E RESPONSABILIDADE DE BEM, mediante as cláusulas e condições seguintes.`;

  const clauses: PdfClause[] = [
    {
      titulo: "CLÁUSULA PRIMEIRA – DO OBJETO",
      itens: [
        `1.1. O presente termo tem por objeto o empréstimo temporário do bem de propriedade, posse, guarda ou responsabilidade da CEDENTE, abaixo identificado:`,

        `Bem / Patrimônio: ${NOME_BEM}`,

        `Identificação Patrimonial: ${NUM_BEM}`,

        `Categoria: ${CATEGORIA}`,

        `Estado de conservação na saída: ${CONSERV}`,

        `Data do empréstimo: ${DATA_EMP}`,

        `1.2. O bem ora emprestado é entregue ao(à) RESPONSÁVEL para uso temporário, vinculado às atividades institucionais, culturais, educativas, administrativas, operacionais ou comunitárias autorizadas pela CEDENTE.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEGUNDA – DO CONTEXTO DO EMPRÉSTIMO",
      itens: [
        `2.1. O empréstimo do bem poderá estar vinculado ao contexto institucional indicado abaixo, para fins de controle interno, rastreabilidade, organização patrimonial e acompanhamento da utilização do bem:`,

        ...contextoEmprestimoFields.map(
          (field) => `${field.label}: ${field.value}`,
        ),

        `2.2. A indicação do contexto do empréstimo não altera a responsabilidade do(a) RESPONSÁVEL pela guarda, conservação, uso adequado e devolução do bem, nos termos deste instrumento.`,
      ],
    },
    {
      titulo: "CLÁUSULA TERCEIRA – DA GUARDA E RESPONSABILIDADE",
      itens: [
        `3.1. Ao receber o bem descrito neste termo, o(a) RESPONSÁVEL declara estar ciente de seu estado de conservação e compromete-se a zelar por sua guarda, conservação e utilização adequada durante todo o período do empréstimo.`,

        `3.2. O(a) RESPONSÁVEL obriga-se a utilizar o bem exclusivamente para a finalidade autorizada, não podendo transferi-lo, emprestá-lo a terceiros, cedê-lo ou destiná-lo a uso diverso sem autorização prévia da CEDENTE.`,

        `3.3. O(a) RESPONSÁVEL compromete-se a devolver o bem nas mesmas condições em que o recebeu, ressalvado o desgaste natural decorrente do uso regular e adequado.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUARTA – DA DEVOLUÇÃO",
      itens: [
        `4.1. O bem deverá ser devolvido à CEDENTE na data ajustada entre as partes ou tão logo seja solicitado pela instituição, em caso de necessidade institucional, encerramento da atividade, encerramento do contexto de uso ou descumprimento das condições deste termo.`,

        `4.2. No ato da devolução, será verificado o estado de conservação do bem, a fim de registrar eventual dano, extravio, avaria, ausência de acessórios ou qualquer outra alteração relevante.`,

        `4.3. A devolução do bem não impede a posterior apuração de responsabilidade, caso sejam identificados danos, perdas, extravios ou irregularidades relacionados ao período em que o bem esteve sob guarda do(a) RESPONSÁVEL.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUINTA – DOS DANOS, PERDAS E EXTRAVIOS",
      itens: [
        `5.1. O(a) RESPONSÁVEL responderá por danos causados ao bem, bem como por perda, extravio, destruição ou uso indevido, quando constatado dolo, culpa, negligência, imprudência ou imperícia em sua guarda ou utilização.`,

        `5.2. Na hipótese prevista na cláusula anterior, a CEDENTE poderá adotar as medidas cabíveis para reparação do prejuízo, inclusive solicitação de reposição do bem, conserto, restituição de item equivalente ou ressarcimento correspondente, observada a análise do caso concreto.`,

        `5.3. Caso o bem possua acessórios, peças, documentos, capas, cabos, carregadores, suportes ou demais itens vinculados, estes deverão ser devolvidos juntamente com o bem principal, nas condições em que foram entregues, ressalvado o desgaste natural decorrente do uso regular.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEXTA – DAS OBSERVAÇÕES",
      itens: [
        `6.1. Observações adicionais sobre o bem, condições do empréstimo, acessórios, particularidades ou registros complementares:`,

        OBS_TXT,
      ],
    },
    {
      titulo: "CLÁUSULA SÉTIMA – DAS DISPOSIÇÕES FINAIS",
      itens: [
        `7.1. O presente termo possui caráter de controle interno, responsabilidade e registro de empréstimo de bem, produzindo efeitos a partir da data de sua assinatura.`,

        `7.2. O(a) RESPONSÁVEL declara que recebeu o bem descrito neste termo em condições compatíveis com o estado de conservação registrado, comprometendo-se a observar integralmente as condições aqui estabelecidas.`,

        `7.3. A tolerância de qualquer das partes quanto ao descumprimento de obrigação prevista neste termo não constituirá renúncia de direito, alteração contratual ou autorização para descumprimentos futuros.`,

        `7.4. Este termo é firmado em 2 (duas) vias de igual teor e forma, para os devidos efeitos.`,
      ],
    },
  ];

  await generateInstitutionalPdf({
    title: "Termo de Empréstimo e Responsabilidade de Bem",
    documentNumber: `TEB-${String((e as any).id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          introCedente,
          introResponsavel,
          introFechamento,
        ],
      },
      { clauses },
      {
        rightAlignedLine: `${municipioUF}, ${dataPorExtenso()}.`,
      },
      {
        signatures: [
          {
            rotulo: "CEDENTE",
            linhas: [
              NOME_INST,
              `Representante legal: ${REPRESENTANTE}`,
              `CPF: ${CPF_REPR}`,
            ],
          },
          {
            rotulo: "RESPONSÁVEL PELO EMPRÉSTIMO",
            linhas: [NOME_RESP, `CPF: ${CPF_RESP}`],
          },
        ],
      },
    ],
  });
}

// =====================================================================
// TERMO DE RESPONSABILIDADE E DECLARAÇÃO DO AGENTE CULTURAL
// =====================================================================

export async function exportTermoAgentePdf(a: AgenteDetalhadoResponseDTO) {
  const org = await buscarOrganizacaoPrincipal();

  const tipo = a.tipoAgente;
  const tipoLabel = tipoAgenteLabels[tipo as TipoAgente] ?? tipo;

  const isPF = tipo === "PESSOA_FISICA";
  const isPJ =
    tipo === "MEI" ||
    tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS" ||
    tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS";

  const NOME_AGENTE = v(
    isPF
      ? a.nomeCompleto
      : a.nomeRepresentante || a.razaoSocial || a.nomeFantasia || a.nomeColetivo,
  );

  const NOME_ENTE = v(
    isPF
      ? a.nomeCompleto
      : a.razaoSocial || a.nomeFantasia || a.nomeColetivo,
  );

  const CPF = formatCpfCnpj(
    isPF ? a.cpf : a.cpfRepresentante,
  );

  const RG = v(
    isPF ? a.rg : a.rgRepresentante,
  );

  const CNPJ = formatCpfCnpj(
    isPJ ? a.cnpj : PLACEHOLDER,
  );

  const CPF_OU_CNPJ = formatCpfCnpj(
    isPF
      ? a.cpf
      : isPJ
        ? a.cnpj
        : a.cpfRepresentante,
  );

  const NOME_INST = getNomeInstitucional(org);
  const municipioUF = getMunicipioUFInstitucional(org);
  const NUM_VIAS = "2";

  const intro = isPF
    ? `Eu, ${NOME_AGENTE}, inscrito(a) no CPF sob o nº ${CPF} e RG nº ${RG}, doravante denominado(a) simplesmente AGENTE CULTURAL, declaro, para os devidos fins, que:`
    : `Eu, ${NOME_AGENTE}, inscrito(a) no CPF sob o nº ${CPF} e RG nº ${RG}, na qualidade de representante legal da ${NOME_ENTE}${isPJ ? `, inscrita no CNPJ sob o nº ${CNPJ}` : ""}, doravante denominado(a) simplesmente AGENTE CULTURAL, declaro, para os devidos fins, que:`;

  const clauses: PdfClause[] = [
    {
      titulo: "Cláusula Primeira – Da Identificação e da Condição do Agente",
      itens: [
        `1.1. O presente termo refere-se ao cadastro e à atuação do(a) AGENTE CULTURAL perante ${NOME_INST}, na condição de:`,
        `Pessoa Física;`,
        `Microempreendedor Individual (MEI);`,
        `Pessoa Jurídica sem fins lucrativos;`,
        `Pessoa Jurídica com fins lucrativos; ou`,
        `Coletivo Cultural.`,
        `1.2. O(A) AGENTE CULTURAL declara que atua em nome próprio ou, quando aplicável, na condição de representante legal, responsável ou referência de grupo, coletivo, organização, empresa ou iniciativa cultural, assumindo a responsabilidade pelas informações prestadas e pelos atos praticados no âmbito de sua vinculação institucional.`,
      ],
    },
    {
      titulo: "Cláusula Segunda – Da Veracidade das Informações",
      itens: [
        `2.1. O(A) AGENTE CULTURAL declara que todas as informações, documentos e dados fornecidos no cadastro, formulários, registros e documentos vinculados à sua atuação são verdadeiros, completos e atualizados, responsabilizando-se civil, administrativa e legalmente por sua exatidão.`,
        `2.2. O(A) AGENTE CULTURAL compromete-se a comunicar eventual alteração de dados cadastrais, documentais ou de representação sempre que necessário.`,
      ],
    },
    {
      titulo: "Cláusula Terceira – Da Responsabilidade pela Representação",
      itens: [
        `3.1. Quando atuar em nome de coletivo cultural, organização, associação, empresa, instituto, grupo informal ou qualquer outra iniciativa coletiva, o(a) AGENTE CULTURAL declara possuir legitimidade, anuência ou responsabilidade reconhecida para representar o respectivo ente no âmbito das ações, projetos, atividades, inscrições, prestações de contas, registros e demais procedimentos relacionados.`,
        `3.2. No caso de coletivo cultural sem personalidade jurídica própria, o(a) AGENTE RESPONSÁVEL declara atuar como referência do grupo, assumindo a interlocução institucional e a responsabilidade pelas informações apresentadas em nome do coletivo, sem prejuízo das responsabilidades dos demais integrantes.`,
      ],
    },
    {
      titulo: "Cláusula Quarta – Das Obrigações do Agente Responsável",
      itens: [
        `4.1. Constituem obrigações do(a) AGENTE CULTURAL:`,
        `a) manter atualizados seus dados e documentos cadastrais;`,
        `b) prestar informações verdadeiras e compatíveis com a realidade da atuação cultural, institucional, profissional ou coletiva declarada;`,
        `c) acompanhar e cumprir as exigências relacionadas aos projetos, ações, atividades, programas, editais, registros e demais iniciativas das quais participe;`,
        `d) observar os princípios da boa-fé, transparência, responsabilidade e regularidade documental;`,
        `e) responder pelas informações prestadas e pelos documentos apresentados no âmbito de sua atuação.`,
      ],
    },
    {
      titulo: "Cláusula Quinta – Da Finalidade do Termo",
      itens: [
        `5.1. O presente termo tem por finalidade formalizar a responsabilidade do(a) AGENTE CULTURAL perante a organização e/ou sistema utilizado, servindo como registro de ciência, compromisso e declaração quanto à regularidade das informações, da representação exercida e da atuação vinculada às atividades culturais, sociais, institucionais, administrativas ou formativas cadastradas.`,
      ],
    },
    {
      titulo: "Cláusula Sexta – Da Proteção de Dados Pessoais",
      itens: [
        `6.1. O tratamento dos dados pessoais e documentais informados no âmbito deste termo observará a legislação aplicável, especialmente a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), sendo realizado para finalidades legítimas relacionadas ao cadastro, à identificação, à formalização documental, à gestão administrativa, à execução de atividades e ao cumprimento de obrigações legais e institucionais.`,
      ],
    },
    {
      titulo: "Cláusula Sétima – Das Disposições Finais",
      itens: [
        `7.1. O(A) AGENTE CULTURAL declara ter lido integralmente este termo, compreendido seu conteúdo e concordado com suas disposições.`,
        `7.2. O presente termo poderá ser utilizado para fins de registro institucional, controle interno, formalização de vínculo cadastral e composição documental perante projetos, ações, atividades, programas, editais e demais instrumentos administrativos correlatos.`,
        `7.3. Este termo é firmado em ${NUM_VIAS} (duas) via(s) de igual teor e forma, para os devidos efeitos.`,
      ],
    },
  ];

  await generateInstitutionalPdf({
    title: "Termo de Responsabilidade e Declaração do Agente Cultural",
    documentNumber: `TAC-${String(a.id).padStart(4, "0")}`,
    sections: [
      { justifiedParagraphs: [intro] },
      { clauses },
      { rightAlignedLine: `${municipioUF}, ${dataPorExtenso()}.` },
      {
        signatures: [
          {
            rotulo: "Agente Cultural",
            linhas: [
              `Nome: ${NOME_AGENTE}`,
              `Tipo de Agente: ${tipoLabel}`,
              `CPF/CNPJ: ${CPF_OU_CNPJ}`,
            ],
          },
        ],
      },
    ],
  });
}

// =====================================================================
// COLABORADOR
// =====================================================================

export async function exportTermoColaboradorPdf(c: ColaboradorPdf) {
  const tipo = String(c.tipoVinculo ?? "").toUpperCase();

  if (tipo === "VOLUNTARIO" || getColaboradorTipoVinculo(c) === "Voluntário") {
    return await exportTermoVoluntarioPdf(c);
  }

  return await exportContratoPrestacaoPdf(c);
}

async function exportTermoVoluntarioPdf(c: ColaboradorPdf) {
  const org = await buscarOrganizacaoPrincipal();

  const NOME = v(getColaboradorDisplayName(c));
  const EMAIL = v(getColaboradorEmail(c));
  const FUNCAO = v(getColaboradorFuncao(c));

  const NOME_INST = getNomeInstitucional(org);
  const CNPJ = getCnpjInstitucional(org);
  const ENDERECO_INST = getEnderecoInstitucional(org);
  const municipioUF = getMunicipioUFInstitucional(org);

  const REPRESENTANTE = getRepresentanteNome(org);
  const CARGO_REPR = "representante legal";
  const RG_REPR = getRepresentanteRg(org);
  const CPF_REPR = getRepresentanteCpf(org);

  const RG_VOL = v(c.rg);
  const CPF_VOL = formatCpfCnpj(c.cpf);
  const ENDERECO_VOL = v(
    formatEnderecoCompleto({
      logradouro: c.logradouro,
      numero: c.numero,
      complemento: c.complemento,
      bairro: c.bairro,
      cidade: c.cidade,
      estado: c.estado,
      cep: c.cep,
    }),
  );

  const TELEFONE_VOL = v(c.telefone);

  const ATIVIDADES = `${FUNCAO} — atividades institucionais, sociais, culturais, educativas, formativas, recreativas, administrativas ou comunitárias correlatas, conforme orientação da INSTITUIÇÃO.`;

  const CARGA_HORARIA = v(
    c.cargaHorariaSemanal != null ? `${c.cargaHorariaSemanal}` : null,
  );

  const LOCAL_ATUACAO = ENDERECO_INST;

  const introInstituicao = `Pelo presente instrumento particular, de um lado, ${NOME_INST}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${CNPJ}, com sede em ${ENDERECO_INST}, neste ato representada por ${REPRESENTANTE}, ${CARGO_REPR}, portador do RG nº ${RG_REPR} e inscrito no CPF sob o nº ${CPF_REPR}, doravante denominada simplesmente INSTITUIÇÃO.`;

  const introVoluntario = `De outro lado, ${NOME}, portador(a) do RG nº ${RG_VOL} e inscrito(a) no CPF sob o nº ${CPF_VOL}, residente e domiciliado(a) em ${ENDERECO_VOL}, doravante denominado(a) simplesmente PESSOA VOLUNTÁRIA.`;

  const introFechamento = `As partes acima identificadas resolvem celebrar o presente TERMO DE ADESÃO AO SERVIÇO VOLUNTÁRIO, com fundamento na Lei nº 9.608, de 18 de fevereiro de 1998, mediante as cláusulas e condições seguintes.`;

  const clauses: PdfClause[] = [
    {
      titulo: "CLÁUSULA PRIMEIRA – DO OBJETO",
      itens: [
        `1.1. O presente termo tem por objeto formalizar a adesão da PESSOA VOLUNTÁRIA ao serviço voluntário prestado junto à INSTITUIÇÃO, mediante a realização das seguintes atividades:`,
        ATIVIDADES,
        `1.2. As atividades voluntárias serão desenvolvidas no contexto das ações institucionais, sociais, culturais, educativas, formativas, recreativas, administrativas ou comunitárias promovidas pela INSTITUIÇÃO, conforme a natureza da atuação ajustada entre as partes.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEGUNDA – DA NATUREZA DO SERVIÇO VOLUNTÁRIO",
      itens: [
        `2.1. O serviço voluntário objeto deste termo é prestado de forma espontânea e gratuita, não gerando vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária, tributária ou afim entre as partes, nos termos da legislação aplicável.`,
        `2.2. A PESSOA VOLUNTÁRIA declara estar ciente de que sua atuação possui caráter exclusivamente voluntário, sem percepção de remuneração, salário, contraprestação financeira ou qualquer vantagem econômica pelo serviço prestado.`,
      ],
    },
    {
      titulo: "CLÁUSULA TERCEIRA – DA JORNADA, PERIODICIDADE E LOCAL DE ATUAÇÃO",
      itens: [
        `3.1. O serviço voluntário será prestado com carga horária semanal estimada de ${CARGA_HORARIA} horas, em horários previamente ajustados entre as partes.`,
        `3.2. As atividades serão realizadas em ${LOCAL_ATUACAO}, podendo haver ajustes de dias, horários ou local conforme a necessidade da INSTITUIÇÃO e a disponibilidade da PESSOA VOLUNTÁRIA, de comum acordo entre as partes.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA PESSOA VOLUNTÁRIA",
      itens: [
        `4.1. Constituem obrigações da PESSOA VOLUNTÁRIA:`,
        `a) desempenhar as atividades assumidas com zelo, responsabilidade, boa-fé e respeito às finalidades da INSTITUIÇÃO;`,
        `b) observar os horários, orientações e regras internas aplicáveis à atividade desempenhada;`,
        `c) zelar pelos bens, equipamentos, materiais e espaços utilizados no exercício de sua atuação;`,
        `d) manter conduta ética, respeitosa e compatível com o ambiente institucional e com o público atendido;`,
        `e) comunicar à INSTITUIÇÃO eventual impossibilidade de comparecimento ou continuidade das atividades voluntárias;`,
        `f) devolver, quando solicitado, bens, materiais, documentos, crachás, equipamentos ou quaisquer itens entregues para o exercício da atividade.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUINTA – DAS OBRIGAÇÕES DA INSTITUIÇÃO",
      itens: [
        `5.1. Constituem obrigações da INSTITUIÇÃO:`,
        `a) orientar a PESSOA VOLUNTÁRIA quanto às atividades a serem desenvolvidas;`,
        `b) oferecer, quando cabível, as condições mínimas necessárias à realização da atividade voluntária;`,
        `c) informar as normas internas, procedimentos e cuidados relacionados à atuação voluntária;`,
        `d) manter registro formal da adesão da PESSOA VOLUNTÁRIA ao serviço voluntário.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEXTA – DO USO DE BENS, MATERIAIS E PATRIMÔNIO",
      itens: [
        `6.1. A PESSOA VOLUNTÁRIA compromete-se a zelar pela conservação do patrimônio, dos materiais, dos equipamentos e dos recursos disponibilizados pela INSTITUIÇÃO, sendo vedado seu uso para fins particulares ou estranhos às atividades institucionais.`,
        `6.2. A PESSOA VOLUNTÁRIA responderá civil e penalmente pelos danos que causar, por dolo ou culpa, aos bens que estejam sob sua guarda ou responsabilidade, sem prejuízo das medidas cabíveis.`,
      ],
    },
    {
      titulo: "CLÁUSULA SÉTIMA – DAS NORMAS INTERNAS E DA CONDUTA",
      itens: [
        `7.1. A PESSOA VOLUNTÁRIA declara estar ciente de que sua atuação estará sujeita às normas internas da INSTITUIÇÃO, aos regulamentos aplicáveis às atividades desenvolvidas e às orientações institucionais pertinentes.`,
        `7.2. Sempre que a atividade envolver contato com crianças, adolescentes, idosos, pessoas em situação de vulnerabilidade ou público em geral, a PESSOA VOLUNTÁRIA compromete-se a manter postura compatível com os princípios de respeito, proteção, ética e cuidado institucional.`,
      ],
    },
    {
      titulo: "CLÁUSULA OITAVA – DO RESSARCIMENTO DE DESPESAS",
      itens: [
        `8.1. Eventuais despesas realizadas pela PESSOA VOLUNTÁRIA no desempenho das atividades poderão ser ressarcidas pela INSTITUIÇÃO, desde que previamente autorizadas e devidamente comprovadas, na forma da legislação aplicável.`,
        `8.2. O eventual ressarcimento de despesas não possui natureza remuneratória e não descaracteriza o serviço voluntário.`,
      ],
    },
    {
      titulo: "CLÁUSULA NONA – DO PRAZO DE VIGÊNCIA",
      itens: [
        `9.1. O presente termo vigorará por prazo indeterminado, a partir da data de sua assinatura, enquanto houver interesse das partes na continuidade da atividade voluntária.`,
      ],
    },
    {
      titulo: "CLÁUSULA DÉCIMA – DO ENCERRAMENTO",
      itens: [
        `10.1. O presente termo poderá ser encerrado a qualquer tempo por qualquer das partes, mediante comunicação por escrito, sem que disso decorra qualquer direito a indenização, remuneração ou compensação de natureza trabalhista, previdenciária, tributária ou afim.`,
        `10.2. Encerrada a atuação voluntária, a PESSOA VOLUNTÁRIA deverá restituir à INSTITUIÇÃO, se houver, os materiais, documentos, equipamentos ou bens que lhe tenham sido confiados.`,
      ],
    },
    {
      titulo: "CLÁUSULA DÉCIMA PRIMEIRA – DA PROTEÇÃO DE DADOS PESSOAIS",
      itens: [
        `11.1. Os dados pessoais informados neste termo poderão ser tratados pela INSTITUIÇÃO para fins de cadastro, organização interna, controle de atuação voluntária, formalização documental e cumprimento de obrigações institucionais e legais, observada a legislação aplicável, especialmente a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD).`,
      ],
    },
    {
      titulo: "CLÁUSULA DÉCIMA SEGUNDA – DO FORO",
      itens: [
        `12.1. Fica eleito o foro da Comarca de ${municipioUF}, para dirimir eventuais controvérsias oriundas deste termo, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
      ],
    },
  ];

  await generateInstitutionalPdf({
    title: "Termo de Adesão ao Serviço Voluntário",
    documentNumber: `TAV-${String(c.id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          introInstituicao,
          introVoluntario,
          introFechamento,
        ],
      },
      { clauses },
      {
        justifiedParagraphs: [
          `E, por estarem justas e acordadas, as partes assinam o presente termo em 2 (duas) vias de igual teor e forma.`,
        ],
      },
      {
        rightAlignedLine: `${municipioUF}, ${dataPorExtenso()}.`,
      },
      {
        signatures: [
          {
            rotulo: "PESSOA VOLUNTÁRIA",
            linhas: [`Nome: ${NOME}`, `CPF: ${CPF_VOL}`],
          },
          {
            rotulo: "INSTITUIÇÃO",
            linhas: [
              NOME_INST,
              `Representante legal: ${REPRESENTANTE}`,
              `CPF: ${CPF_REPR}`,
            ],
          },
        ],
      },
    ],
  });
}

async function exportContratoPrestacaoPdf(c: ColaboradorPdf) {
  const org = await buscarOrganizacaoPrincipal();

  const NOME = v(getColaboradorDisplayName(c));
  const FUNCAO = v(getColaboradorFuncao(c));

  const NOME_INST = getNomeInstitucional(org);
  const RAZAO_SOCIAL = getRazaoSocialInstitucional(org);
  const CNPJ = getCnpjInstitucional(org);
  const ENDERECO_INST = getEnderecoInstitucional(org);
  const municipioUF = getMunicipioUFInstitucional(org);

  const REPRESENTANTE = getRepresentanteNome(org);
  const RG_REPR = getRepresentanteRg(org);
  const CPF_REPR = getRepresentanteCpf(org);

  const PH = "[___________]";

  const RG_CONTR = v(c.rg);
  const CPF_CONTR = formatCpfCnpj(c.cpf);
  const ENDERECO_CONTR = v(
    formatEnderecoCompleto({
      logradouro: c.logradouro,
      numero: c.numero,
      complemento: c.complemento,
      bairro: c.bairro,
      cidade: c.cidade,
      estado: c.estado,
      cep: c.cep,
    }),
  );

  const DATA_INI = v(c.dataInicioVinculo);
  const DATA_FIM = v(c.dataFimVinculo);
  const LOCAL_PRESTACAO = ENDERECO_INST;
  const CARGA_HORARIA = v(c.cargaHorariaSemanal != null ? `${c.cargaHorariaSemanal}` : null);
  const DESCRICAO_ATUACAO = `atividades inerentes à função de ${FUNCAO}, conforme planejamento institucional`;

  const introCabecalho = `Pelo presente instrumento particular, de um lado:`;
  const introContratante = `CONTRATANTE: ${RAZAO_SOCIAL}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${CNPJ}, com sede em ${ENDERECO_INST}, neste ato representada por seu(sua) representante legal ${REPRESENTANTE}, portador(a) do RG nº ${RG_REPR} e inscrito(a) no CPF sob o nº ${CPF_REPR}, doravante denominada simplesmente CONTRATANTE;`;
  const introContratado = `CONTRATADO: ${NOME}, portador(a) do RG nº ${RG_CONTR} e inscrito(a) no CPF sob o nº ${CPF_CONTR}, residente e domiciliado(a) em ${ENDERECO_CONTR}, doravante denominado(a) simplesmente CONTRATADO(A);`;
  const introFecha = `têm entre si justo e contratado o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que se regerá pelas cláusulas e condições seguintes.`;

  const clauses: PdfClause[] = [
    {
      titulo: "CLÁUSULA PRIMEIRA – DO OBJETO",
      itens: [
        `1.1. O presente contrato tem por objeto a prestação de serviços de ${FUNCAO}, a serem executados pelo(a) CONTRATADO(A) no âmbito das atividades promovidas pela CONTRATANTE.`,
        `1.2. Os serviços compreendem, de forma exemplificativa e conforme aplicável ao caso concreto: ${DESCRICAO_ATUACAO}.`,
        `1.3. As atividades serão realizadas de acordo com o planejamento, cronograma e orientações definidos em comum acordo entre as partes, observadas as necessidades institucionais, pedagógicas, culturais, artísticas ou operacionais da CONTRATANTE.`,
        `1.4. Caso a prestação dos serviços resulte na produção de materiais, conteúdos, relatórios, registros, documentos, produtos artísticos, pedagógicos ou audiovisuais, estes poderão ser utilizados pela CONTRATANTE para fins institucionais, educacionais, culturais, de memória, transparência e divulgação de suas ações, sempre respeitados os créditos de autoria quando cabíveis.`,
        `1.5. Salvo previsão expressa em contrário, considera-se que toda a execução necessária ao cumprimento do objeto contratado já está compreendida no valor pactuado neste instrumento, não sendo devido qualquer pagamento adicional pela entrega dos produtos ou resultados previstos.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEGUNDA – DO PERÍODO, LOCAL E DA EXECUÇÃO DOS SERVIÇOS",
      itens: [
        `2.1. Os serviços serão prestados no período de ${DATA_INI} a ${DATA_FIM}, nos dias e horários previamente definidos entre as partes.`,
        `2.2. As atividades serão executadas em ${LOCAL_PRESTACAO}, podendo, se necessário e mediante ajuste entre as partes, ocorrer em outro local, formato híbrido ou remoto, desde que isso não prejudique o objeto contratado.`,
        `2.3. A carga horária total estimada para a execução dos serviços será de ${CARGA_HORARIA} horas semanais, podendo ser distribuída conforme a natureza da atividade.`,
        `2.4. Eventuais alterações de datas, horários ou local de realização deverão ser comunicadas com antecedência razoável entre as partes.`,
      ],
    },
    {
      titulo: "CLÁUSULA TERCEIRA – DO VALOR E DA FORMA DE PAGAMENTO",
      itens: [
        `3.1. Pela prestação dos serviços objeto deste contrato, a CONTRATANTE pagará ao(à) CONTRATADO(A) o valor previamente acordado entre as partes, conforme as condições comerciais definidas para a execução dos serviços contratados.`,
        `3.2. O valor poderá ser estabelecido por serviço, diária, hora/aula, carga horária, etapa, atividade ou outra forma de remuneração ajustada entre as partes, de acordo com a natureza da contratação e com o planejamento da execução.`,
        `3.3. O pagamento será realizado pela CONTRATANTE em conformidade com o cronograma, forma e condições previamente acordados entre as partes, podendo ocorrer em parcela única ou em parcelas, mediante transferência bancária, PIX, dinheiro, boleto ou outro meio aceito pelas partes.`,
        `3.4. O pagamento poderá estar condicionado à comprovação da execução dos serviços, à entrega das atividades previstas e, quando necessário, à apresentação de recibo, nota fiscal, relatório, lista de presença, registro de execução ou documento equivalente.`,
        `3.5. Os dados para pagamento serão informados pelo(a) CONTRATADO(A), que se responsabiliza por sua exatidão.`,
        `3.6. Salvo ajuste expresso em contrário, despesas com transporte, alimentação, hospedagem, materiais próprios ou quaisquer outros custos do(a) CONTRATADO(A) correrão por sua conta, não estando incluídas no valor pactuado.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO(A) CONTRATADO(A)",
      itens: [
        `Constituem obrigações do(a) CONTRATADO(A), além de outras previstas neste instrumento:`,
        `a) executar os serviços contratados com zelo, diligência, boa-fé, qualidade técnica e observância das orientações pactuadas;`,
        `b) cumprir os dias, horários, carga horária e demais condições ajustadas para a realização das atividades;`,
        `c) manter conduta ética, respeitosa e compatível com o ambiente institucional e com o público atendido pela CONTRATANTE;`,
        `d) zelar pelos bens, materiais, equipamentos e espaços colocados à sua disposição, responsabilizando-se por danos causados por dolo ou culpa;`,
        `e) comunicar previamente qualquer fato que possa impedir ou prejudicar a adequada execução dos serviços;`,
        `f) apresentar, quando solicitado, documentos, registros, relatórios, listas de presença, comprovantes ou outros elementos vinculados à atividade desenvolvida;`,
        `g) observar, quando aplicável, normas internas da instituição relacionadas à proteção de crianças, adolescentes, públicos vulneráveis, uso de imagem, segurança e organização das atividades.`,
      ],
    },
    {
      titulo: "CLÁUSULA QUINTA – DAS OBRIGAÇÕES DA CONTRATANTE",
      itens: [
        `Constituem obrigações da CONTRATANTE:`,
        `a) disponibilizar, quando necessário, as informações, orientações, infraestrutura e condições mínimas para a execução dos serviços;`,
        `b) efetuar o pagamento na forma e prazo estabelecidos neste contrato;`,
        `c) comunicar ao(à) CONTRATADO(A), com antecedência razoável, eventuais alterações relevantes no cronograma ou nas condições de execução;`,
        `d) oferecer o apoio institucional e logístico que tiver sido expressamente assumido para a realização das atividades.`,
      ],
    },
    {
      titulo: "CLÁUSULA SEXTA – DA AUTONOMIA E DA INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO",
      itens: [
        `6.1. O presente contrato tem natureza estritamente civil, não estabelecendo entre as partes qualquer vínculo empregatício, societário, associativo, previdenciário ou de subordinação jurídica típica das relações de trabalho.`,
        `6.2. O(A) CONTRATADO(A) executará suas atividades com autonomia técnica e profissional, responsabilizando-se integralmente pelos encargos fiscais, tributários, previdenciários e demais obrigações legais decorrentes de sua atuação.`,
        `6.3. A eventual definição de datas, horários, local de realização ou diretrizes gerais de execução não descaracteriza a natureza autônoma da prestação de serviços ora contratada.`,
      ],
    },
    {
      titulo: "CLÁUSULA SÉTIMA – DO USO DE IMAGEM, VOZ, NOME E MATERIAIS PRODUZIDOS",
      itens: [
        `7.1. Quando a execução do objeto envolver registros fotográficos, audiovisuais, sonoros, documentais ou similares, o(a) CONTRATADO(A) autoriza, de forma não exclusiva e sem ônus adicional, a utilização de sua imagem, voz, nome e referência profissional pela CONTRATANTE, exclusivamente para fins institucionais, culturais, educativos, informativos, de prestação de contas, memória e divulgação de atividades.`,
        `7.2. A utilização mencionada nesta cláusula deverá guardar relação com as ações desenvolvidas pela CONTRATANTE, vedado qualquer uso que exponha indevidamente a imagem ou a honra do(a) CONTRATADO(A).`,
        `7.3. Os materiais, relatórios, registros, conteúdos ou produtos elaborados no âmbito deste contrato poderão ser utilizados pela CONTRATANTE para as finalidades diretamente relacionadas ao seu objeto social e às atividades vinculadas ao projeto, ação, oficina, curso ou serviço contratado, resguardados os créditos de autoria quando cabíveis.`,
      ],
    },
    {
      titulo: "CLÁUSULA OITAVA – DA RESCISÃO",
      itens: [
        `8.1. O presente contrato poderá ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação prévia por escrito com antecedência mínima de 30 dias.`,
        `8.2. Na hipótese de rescisão após o início da execução dos serviços, será devido ao(à) CONTRATADO(A) apenas o valor proporcional às atividades efetivamente realizadas até a data da rescisão, desde que devidamente comprovadas.`,
        `8.3. Constituem motivos para rescisão imediata, independentemente de aviso prévio:`,
        `a) descumprimento de cláusulas contratuais;`,
        `b) conduta incompatível com a natureza da atividade ou com os princípios institucionais da CONTRATANTE;`,
        `c) abandono, interrupção injustificada ou execução inadequada dos serviços;`,
        `d) prática de ato que cause prejuízo material, moral, institucional ou reputacional à outra parte.`,
        `8.4. A rescisão não afasta a responsabilidade das partes por obrigações já vencidas ou por eventuais danos decorrentes de descumprimento contratual.`,
      ],
    },
    {
      titulo: "CLÁUSULA NONA – DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS",
      itens: [
        `9.1. O(A) CONTRATADO(A) compromete-se a manter sigilo sobre informações internas, administrativas, estratégicas, pedagógicas, financeiras ou institucionais da CONTRATANTE a que tiver acesso em razão deste contrato, não podendo divulgá-las ou utilizá-las para finalidade diversa da execução do objeto contratado.`,
        `9.2. Caso haja tratamento de dados pessoais no contexto da prestação dos serviços, as partes comprometem-se a observar a legislação aplicável, em especial a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), utilizando tais dados apenas na medida necessária à execução deste contrato e ao cumprimento de obrigações legais e institucionais.`,
      ],
    },
    {
      titulo: "CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS",
      itens: [
        `10.1. A eventual tolerância de uma parte para com a outra quanto ao descumprimento de qualquer obrigação prevista neste contrato não implicará renúncia de direito nem novação, constituindo mera liberalidade.`,
        `10.2. Qualquer alteração nas condições deste contrato somente terá validade se realizada por escrito e assinada pelas partes.`,
        `10.3. Este contrato obriga as partes, seus herdeiros e sucessores, na forma da lei.`,
      ],
    },
    {
      titulo: "CLÁUSULA DÉCIMA PRIMEIRA – DO FORO",
      itens: [
        `11.1. Fica eleito o foro da Comarca de ${municipioUF}, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias oriundas deste contrato.`,
      ],
    },
  ];

  await generateInstitutionalPdf({
    title: "Contrato de Prestação de Serviços",
    documentNumber: `CPS-${String(c.id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          introCabecalho,
          introContratante,
          introContratado,
          introFecha,
        ],
      },
      { clauses },
      {
        justifiedParagraphs: [
          `E, por estarem assim justas e contratadas, firmam o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com 2 (duas) testemunhas.`,
        ],
      },
      { rightAlignedLine: `${municipioUF}, ${dataPorExtenso()}.` },
      {
        signatures: [
          {
            rotulo: "CONTRATANTE",
            linhas: [
              NOME_INST,
              `Representante Legal: ${REPRESENTANTE}`,
              `CPF: ${CPF_REPR}`,
            ],
          },
          {
            rotulo: "CONTRATADO(A)",
            linhas: [
              NOME,
              `Função: ${FUNCAO}`,
              `CPF: ${CPF_CONTR}`,
            ],
          },
        ],
      },
    ],
  });
}

// =====================================================================
// PRESTAÇÃO DE CONTAS
// =====================================================================

export async function exportPrestacaoContasPdf(p: PrestacaoContasPdf) {
  const PLANEJAMENTOS =
    Array.isArray(p.planejamentosFinanceiros)
      ? p.planejamentosFinanceiros.length > 0
        ? p.planejamentosFinanceiros
        : [PLACEHOLDER]
      : p.planejamentosFinanceiros?.trim()
        ? [p.planejamentosFinanceiros.trim()]
        : [PLACEHOLDER];

  const STATUS = v(p.statusPrestacaoContas);

  const DATA_APROVACAO =
    STATUS.toLowerCase().includes("reprovada") ||
      STATUS.toLowerCase().includes("reprovado")
      ? "Prestação de contas não aprovada."
      : formatDateBR(p.dataAprovacao);

  await generateInstitutionalPdf({
    title: "Ficha de Prestação de Contas",
    documentNumber: `PCT-${String(p.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Vínculos da Prestação",
        fields: [
          {
            label: "Proposta de Edital",
            value: v(p.propostaEdital),
          },
          {
            label: "Status da Prestação",
            value: STATUS,
          },
        ],
      },
      {
        title: "2. Planejamentos Financeiros",
        list: {
          items: PLANEJAMENTOS,
        },
      },
      {
        title: "3. Período e Datas",
        fields: [
          {
            label: "Período Inicial",
            value: formatDateBR(p.periodoInicio),
          },
          {
            label: "Período Final",
            value: formatDateBR(p.periodoFim),
          },
          {
            label: "Data de Envio",
            value: formatDateBR(p.dataEnvio),
          },
          {
            label: "Data de Aprovação",
            value: DATA_APROVACAO,
          },
        ],
      },
      {
        title: "4. Parecer Interno",
        justifiedParagraphs: p.parecerInterno
          ? [p.parecerInterno]
          : [PLACEHOLDER],
      },
      {
        title: "5. Parecer Externo",
        justifiedParagraphs: p.parecerExterno
          ? [p.parecerExterno]
          : [PLACEHOLDER],
      },
      {
        title: "6. Observações Gerais",
        justifiedParagraphs: p.observacoesGerais
          ? [p.observacoesGerais]
          : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// PRESTAÇÃO DE METAS
// =====================================================================

export async function exportPrestacaoMetasPdf(m: PrestacaoMetasPdf) {
  const EVIDENCIAS =
    m.evidencias && m.evidencias.length > 0 ? m.evidencias : [PLACEHOLDER];

  await generateInstitutionalPdf({
    title: "Ficha de Cumprimento de Meta",
    documentNumber: `MET-${String(m.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Vínculos da Prestação",
        fields: [
          {
            label: "Prestação de Contas",
            value: v(m.prestacaoContas),
          },
          {
            label: "Meta do Projeto",
            value: v(m.metaProjeto),
          },
        ],
      },
      {
        title: "2. Resultado",
        fields: [
          {
            label: "Quantidade Executada",
            value: v(m.quantidadeExecutada),
          },
          {
            label: "Status de Cumprimento",
            value: v(m.statusCumprimentoMeta),
          },
        ],
      },
      {
        title: "3. Observação sobre o Cumprimento",
        justifiedParagraphs: m.observacaoCumprimento
          ? [m.observacaoCumprimento]
          : [PLACEHOLDER],
      },
      {
        title: "4. Evidências",
        list: {
          items: EVIDENCIAS,
        },
      },
    ],
  });
}

// =====================================================================
// EVIDÊNCIA DE EXECUÇÃO
// =====================================================================

export async function exportEvidenciaExecucaoPdf(e: EvidenciaExecucaoPdf) {
  const TIPO_VINCULO = labelOrValue(e.tipoVinculoEvidencia);

  const VINCULO_RELACIONADO =
    e.vinculoRelacionado?.trim() ||
    e.propostaEdital?.trim() ||
    e.atividade?.trim() ||
    e.turma?.trim() ||
    e.eventoCultural?.trim() ||
    e.acaoDivulgacao?.trim() ||
    e.presenca?.trim() ||
    PLACEHOLDER;

  await generateInstitutionalPdf({
    title: "Ficha de Evidência de Execução",
    documentNumber: `EVD-${String(e.id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          `A presente ficha registra, para fins de comprovação, rastreabilidade, organização documental e prestação de contas, as informações relativas à evidência de execução indicada abaixo.`,
        ],
      },
      {
        title: "1. Identificação da Evidência",
        fields: [
          {
            label: "Título da Evidência",
            value: v(e.tituloEvidencia),
          },
          {
            label: "Tipo de Evidência",
            value: labelOrValue(e.tipoEvidencia),
          },
          {
            label: "Projeto",
            value: v(e.projeto),
          },
        ],
      },
      {
        title: "2. Vínculo da Evidência",
        fields: [
          {
            label: "Tipo de Vínculo",
            value: TIPO_VINCULO,
          },
          {
            label: "Vínculo Relacionado",
            value: VINCULO_RELACIONADO,
          },
        ],
      },
      {
        title: "3. Arquivo e Publicação",
        fields: [
          {
            label: "Arquivo da Evidência",
            value: v(e.urlArquivo),
          },
          {
            label: "Link da Publicação",
            value: v(e.urlPublicacao),
          },
        ],
      },
      {
        title: "4. Observação",
        justifiedParagraphs: e.observacaoEvidencia
          ? [e.observacaoEvidencia]
          : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// EDITAL
// =====================================================================

export async function exportEditalPdf(e: EditalPdf) {
  await generateInstitutionalPdf({
    title: "Ficha de Edital",
    documentNumber: `EDT-${String(e.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação do Edital",
        fields: [
          {
            label: "Nome do Edital",
            value: v(e.nomeEdital),
          },
          {
            label: "Número do Edital",
            value: v(e.numeroEdital),
          },
          {
            label: "Número de Inscrição",
            value: v(e.numeroInscricao),
          },
          {
            label: "Ano do Edital",
            value: v(e.anoEdital),
          },
          {
            label: "Órgão Responsável",
            value: v(e.orgaoResponsavel),
          },
          {
            label: "Link do Edital",
            value: v(e.linkEdital),
          },
        ],
      },
      {
        title: "2. Datas do Edital",
        fields: [
          {
            label: "Data de Abertura",
            value: formatDateBR(e.dataAbertura),
          },
          {
            label: "Data de Encerramento",
            value: formatDateBR(e.dataEncerramento),
          },
          {
            label: "Data do Resultado",
            value: formatDateBR(e.dataResultado),
          },
        ],
      },
      {
        title: "3. Valores e Classificação",
        fields: [
          {
            label: "Valor Total Disponível",
            value: v(e.valorTotalDisponivel),
          },
          {
            label: "Esfera do Edital",
            value: v(e.esferaEdital),
          },
          {
            label: "Status do Edital",
            value: v(e.statusEdital),
          },
        ],
      },
      {
        title: "4. Vínculos Institucionais",
        fields: [
          {
            label: "Organização",
            value: v(e.organizacao),
          },
          {
            label: "Agente Responsável",
            value: v(e.agente),
          },
        ],
      },
      {
        title: "5. Observação",
        justifiedParagraphs: e.observacao ? [e.observacao] : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// PROPOSTA DE EDITAL
// =====================================================================

export async function exportPropostaEditalPdf(p: PropostaEditalPdf) {
  const STATUS = v(p.statusPropostaEdital);

  const isReprovada =
    STATUS.toLowerCase().includes("reprovada") ||
    STATUS.toLowerCase().includes("reprovado");

  const JUSTIFICATIVA =
    p.justificativa?.trim() ||
    p.justificativaProjeto?.trim() ||
    PLACEHOLDER;

  const METODOLOGIA =
    p.metodologiaExecucao?.trim() ||
    p.metodologia?.trim() ||
    PLACEHOLDER;

  const ACESSIBILIDADE =
    p.acoesAcessibilidade?.trim() ||
    p.acessibilidade?.trim() ||
    PLACEHOLDER;

  const PROJETO_BASE =
    p.projetoBase?.trim() ||
    p.projeto?.trim() ||
    PLACEHOLDER;

  const AGENTE_RESPONSAVEL =
    p.agenteResponsavel?.trim() ||
    p.agente?.trim() ||
    PLACEHOLDER;

  const EQUIPE_EDITAL =
    Array.isArray(p.equipeEdital)
      ? p.equipeEdital.length > 0
        ? p.equipeEdital
        : [PLACEHOLDER]
      : p.equipeEdital?.trim()
        ? [p.equipeEdital.trim()]
        : [PLACEHOLDER];

  const sections: any[] = [
    {
      title: "1. Identificação da Proposta",
      fields: [
        {
          label: "Título do Projeto",
          value: v(p.tituloProjeto),
        },
        {
          label: "Organização",
          value: v(p.organizacao),
        },
        {
          label: "Edital",
          value: v(p.edital),
        },
        {
          label: "Projeto Base",
          value: PROJETO_BASE,
        },
        {
          label: "Agente Responsável",
          value: AGENTE_RESPONSAVEL,
        },
      ],
    },
    {
      title: "2. Dados Financeiros e Submissão",
      fields: [
        {
          label: "Valor Solicitado",
          value: v(p.valorSolicitado),
        },
        {
          label: "Valor de Contrapartida",
          value: v(p.valorContrapartida),
        },
        {
          label: "Data de Submissão",
          value: formatDateBR(p.dataSubmissao),
        },
        {
          label: "Status da Proposta",
          value: STATUS,
        },
      ],
    },
    {
      title: "3. Resumo do Projeto",
      justifiedParagraphs: p.resumoProjeto
        ? [p.resumoProjeto]
        : [PLACEHOLDER],
    },
    {
      title: "4. Justificativa",
      justifiedParagraphs:
        JUSTIFICATIVA !== PLACEHOLDER ? [JUSTIFICATIVA] : [PLACEHOLDER],
    },
    {
      title: "5. Metodologia de Execução",
      justifiedParagraphs:
        METODOLOGIA !== PLACEHOLDER ? [METODOLOGIA] : [PLACEHOLDER],
    },
    {
      title: "6. Democratização de Acesso",
      justifiedParagraphs: p.democratizacaoAcesso
        ? [p.democratizacaoAcesso]
        : [PLACEHOLDER],
    },
    {
      title: "7. Ações de Acessibilidade",
      justifiedParagraphs:
        ACESSIBILIDADE !== PLACEHOLDER ? [ACESSIBILIDADE] : [PLACEHOLDER],
    },
    {
      title: "8. Impacto Esperado",
      justifiedParagraphs: p.impactoEsperado
        ? [p.impactoEsperado]
        : [PLACEHOLDER],
    },
    {
      title: "9. Equipe do Edital",
      list: {
        items: EQUIPE_EDITAL,
      },
    },
  ];

  if (isReprovada) {
    sections.push({
      title: "10. Motivo de Reprovação",
      justifiedParagraphs: p.motivoReprovacao
        ? [p.motivoReprovacao]
        : [PLACEHOLDER],
    });
  }

  await generateInstitutionalPdf({
    title: "Ficha de Proposta de Edital",
    documentNumber: `PED-${String(p.id).padStart(4, "0")}`,
    sections,
  });
}

export async function exportHabilitacaoPdf(h: HabilitacaoPdf) {
  const DATA_FINAL_ENVIO =
    h.dataFinalEnvio || h.dataLimiteHabilitacao || null;

  await generateInstitutionalPdf({
    title: "Ficha de Habilitação da Proposta",
    documentNumber: `HAB-${String(h.id).padStart(4, "0")}`,
    sections: [
      {
        justifiedParagraphs: [
          `A presente ficha registra, para fins de acompanhamento institucional, organização documental e rastreabilidade, as informações relacionadas à fase de habilitação da proposta indicada abaixo.`,
        ],
      },
      {
        title: "1. Vínculo da Habilitação",
        fields: [
          {
            label: "Proposta de Edital",
            value: v(h.propostaEdital),
          },
          {
            label: "Agente Responsável",
            value: v(h.agenteResponsavel),
          },
        ],
      },
      {
        title: "2. Prazos e Envio",
        fields: [
          {
            label: "Data de Início",
            value: formatDateBR(h.dataInicioHabilitacao),
          },
          {
            label: "Data Final do Envio",
            value: formatDateBR(DATA_FINAL_ENVIO),
          },
          {
            label: "Data de Envio",
            value: formatDateBR(h.dataEnvioDocumentacao),
          },
          {
            label: "Status da Habilitação",
            value: v(h.statusHabilitacao),
          },
        ],
      },
      {
        title: "3. Análise e Regularização",
        fields: [
          {
            label: "Data de Retorno da Análise",
            value: formatDateBR(h.dataRetornoAnalise),
          },
          {
            label: "Data de Regularização",
            value: formatDateBR(h.dataRegularizacao),
          },
          {
            label: "Data de Conclusão",
            value: formatDateBR(h.dataConclusaoHabilitacao),
          },
        ],
      },
      {
        title: "4. Exigência ou Pendência",
        justifiedParagraphs: h.exigenciaOuPendencia
          ? [h.exigenciaOuPendencia]
          : [PLACEHOLDER],
      },
      {
        title: "5. Providência Tomada",
        justifiedParagraphs: h.providenciaTomada
          ? [h.providenciaTomada]
          : [PLACEHOLDER],
      },
      {
        title: "6. Motivo de Inabilitação",
        justifiedParagraphs: h.motivoInabilitacao
          ? [h.motivoInabilitacao]
          : [PLACEHOLDER],
      },
      {
        title: "7. Publicação Oficial",
        justifiedParagraphs: h.publicacaoOficial
          ? [h.publicacaoOficial]
          : [PLACEHOLDER],
      },
      {
        title: "8. Observações",
        justifiedParagraphs: h.observacoes ? [h.observacoes] : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// EQUIPE DO EDITAL
// =====================================================================

export async function exportEquipeEditalPdf(e: EquipeEditalPdf) {
  const TIPO_PESSOA = v(e.tipoPessoa);

  const isColaborador = TIPO_PESSOA.toLowerCase().includes("colaborador");
  const isIntegrante = TIPO_PESSOA.toLowerCase().includes("integrante");

  const PESSOA_SELECIONADA = v(e.colaborador || e.integrante || e.pessoa);

  const CARGA_HORARIA_VALOR =
    e.cargaHorariaSemanal ?? e.cargaHorariaPrevista;

  const CARGA_HORARIA =
    CARGA_HORARIA_VALOR !== null &&
      CARGA_HORARIA_VALOR !== undefined &&
      String(CARGA_HORARIA_VALOR).trim() !== ""
      ? `${CARGA_HORARIA_VALOR}h`
      : PLACEHOLDER;

  const JUSTIFICATIVA = e.justificativaFuncao?.trim() || PLACEHOLDER;

  const identificacaoPessoaFields = [
    {
      label: "Tipo de Pessoa",
      value: TIPO_PESSOA,
    },
    ...(isColaborador
      ? [
        {
          label: "Colaborador",
          value: PESSOA_SELECIONADA,
        },
      ]
      : []),
    ...(isIntegrante
      ? [
        {
          label: "Integrante",
          value: PESSOA_SELECIONADA,
        },
      ]
      : []),
    ...(!isColaborador && !isIntegrante
      ? [
        {
          label: "Pessoa",
          value: PESSOA_SELECIONADA,
        },
      ]
      : []),
  ];

  await generateInstitutionalPdf({
    title: "Ficha de Equipe do Edital",
    documentNumber: `EQE-${String(e.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Vínculo com a Proposta",
        fields: [
          {
            label: "Proposta de Edital",
            value: v(e.propostaEdital),
          },
          {
            label: "Agente Responsável",
            value: v(e.agente),
          },
        ],
      },
      {
        title: "2. Identificação da Pessoa",
        fields: identificacaoPessoaFields,
      },
      {
        title: "3. Função e Atuação no Projeto",
        fields: [
          {
            label: "Função no Projeto",
            value: v(e.funcaoProjeto),
          },
          {
            label: "Carga Horária Semanal",
            value: CARGA_HORARIA,
          },
          {
            label: "Valor Previsto",
            value: v(e.valorPrevisto),
          },
        ],
      },
      {
        title: "4. Justificativa da Função",
        justifiedParagraphs:
          JUSTIFICATIVA !== PLACEHOLDER ? [JUSTIFICATIVA] : [PLACEHOLDER],
      },
      {
        title: "5. Mini Biografia",
        justifiedParagraphs: e.miniBiografia
          ? [e.miniBiografia]
          : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// PLANO DE COMUNICAÇÃO
// =====================================================================

export async function exportPlanoComunicacaoPdf(p: PlanoComunicacaoPdf) {
  await generateInstitutionalPdf({
    title: "Ficha de Plano de Comunicação",
    documentNumber: `PLC-${String(p.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação do Plano de Comunicação",
        fields: [
          {
            label: "Quantidade",
            value: v(p.quantidade),
          },
          {
            label: "Formato da Comunicação",
            value: v(p.formatoPlanoComunicacao),
          },
          {
            label: "Local de Circulação",
            value: v(p.localCirculacaoComunicacao),
          },
        ],
      },
      {
        title: "2. Período de Execução",
        fields: [
          {
            label: "Data de Início",
            value: formatDateBR(p.dataInicio),
          },
          {
            label: "Data de Fim",
            value: formatDateBR(p.dataFim),
          },
        ],
      },
      {
        title: "3. Vínculos Institucionais",
        fields: [
          {
            label: "Ação de Divulgação",
            value: v(p.acaoDivulgacao),
          },
          {
            label: "Organização",
            value: v(p.organizacao),
          },
          {
            label: "Status do Registro",
            value: v(p.status),
          },
        ],
      },
    ],
  });
}

// =====================================================================
// ATIVIDADE
// =====================================================================

export async function exportAtividadePdf(a: AtividadePdf) {
  const NOME_ATIVIDADE = a.nomeAtividade?.trim() || PLACEHOLDER;

  const TIPO_ATIVIDADE = a.tipoAtividade
    ? tipoLabel(a.tipoAtividade as any)
    : PLACEHOLDER;

  const STATUS_ATIVIDADE = a.status
    ? statusValueToLabel(a.status as any)
    : PLACEHOLDER;

  const PROJETO = a.projeto?.trim() || PLACEHOLDER;

  const LOCAL_ATIVIDADE = a.local?.trim() || PLACEHOLDER;

  const DATA_INICIO = formatDateBR(a.dataInicio);

  const DATA_FIM = formatDateBR(a.dataFim);

  const QUANTIDADE_VAGAS =
    a.quantidadeVagas !== null &&
      a.quantidadeVagas !== undefined &&
      String(a.quantidadeVagas).trim() !== ""
      ? String(a.quantidadeVagas)
      : PLACEHOLDER;

  const PUBLICO_BENEFICIADO =
    a.publicoBeneficiadoAtividade?.trim() || PLACEHOLDER;

  const DESCRICAO = a.descricao?.trim() || PLACEHOLDER;

  const COLABORADORES = fmtList(a.colaboradores ?? []);

  await generateInstitutionalPdf({
    title: "Ficha de Atividade",
    documentNumber: `ATV-${String(a.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação da Atividade",
        fields: [
          {
            label: "Nome da Atividade",
            value: NOME_ATIVIDADE,
          },
          {
            label: "Tipo de Atividade",
            value: TIPO_ATIVIDADE,
          },
          {
            label: "Status da Atividade",
            value: STATUS_ATIVIDADE,
          },
          {
            label: "Projeto",
            value: PROJETO,
          },
        ],
      },
      {
        title: "2. Período e Local",
        fields: [
          {
            label: "Data de Início da Atividade",
            value: DATA_INICIO,
          },
          {
            label: "Data de Término da Atividade",
            value: DATA_FIM,
          },
          {
            label: "Local da Atividade",
            value: LOCAL_ATIVIDADE,
          },
          {
            label: "Quantidade de Vagas",
            value: QUANTIDADE_VAGAS,
          },
        ],
      },
      {
        title: "3. Público Beneficiado",
        justifiedParagraphs: [PUBLICO_BENEFICIADO],
      },
      {
        title: "4. Descrição da Atividade",
        justifiedParagraphs: [DESCRICAO],
      },
      {
        title: "5. Colaboradores",
        list: {
          items: COLABORADORES.length > 0 ? COLABORADORES : [PLACEHOLDER],
        },
      },
    ],
  });
}

// =====================================================================
// PLANEJAMENTO FINANCEIRO
// =====================================================================

export async function exportPlanejamentoFinanceiroPdf(
  p: PlanejamentoFinanceiroPdf,
) {
  await generateInstitutionalPdf({
    title: "Ficha de Planejamento Financeiro",
    documentNumber: `PLF-${String(p.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação do Item",
        fields: [
          {
            label: "Item do Planejamento",
            value: v(p.nomePlanejamento),
          },
          {
            label: "Proposta de Edital",
            value: v(p.propostaEdital),
          },
          {
            label: "Equipe do Edital",
            value: v(p.equipeEdital),
          },
        ],
      },
      {
        title: "2. Quantidade e Valores",
        fields: [
          {
            label: "Quantidade",
            value: v(p.quantidade),
          },
          {
            label: "Unidade de Medida",
            value: v(p.unidadeMedida),
          },
          {
            label: "Valor Unitário",
            value: v(p.valorUnitario),
          },
          {
            label: "Valor Total",
            value: v(p.valorTotal),
          },
        ],
      },
      {
        title: "3. Justificativa",
        justifiedParagraphs: p.justificativaPlanejamento
          ? [p.justificativaPlanejamento]
          : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// FINANCEIRO
// =====================================================================

export async function exportFinanceiroPdf(f: FinanceiroPdf) {
  const APLICACAO_FINANCEIRA = labelFromList(
    aplicacoesFinanceiro,
    f.aplicacaoFinanceiro || f.aplicacaoFinanceira || "",
  );

  const TIPO_OPERACAO = labelFromList(
    tiposOperacao,
    f.tipoOperacaoFinanceira || "",
  );

  const FORMA_PAGAMENTO = labelFromList(
    formasPagamento,
    f.formaPagamento || "",
  );

  const STATUS_FINANCEIRO = labelFromList(
    statusFinanceiro,
    f.statusFinanceiro || "",
  );

  const pessoaFields =
    f.colaborador && String(f.colaborador).trim()
      ? [
        {
          label: "Colaborador",
          value: v(f.colaborador),
        },
      ]
      : [
        {
          label: "Nome da Pessoa",
          value: v(f.nomePessoa),
        },
      ];

  const vinculosFields = [
    f.planejamentoFinanceiro?.trim()
      ? {
        label: "Planejamento Financeiro",
        value: f.planejamentoFinanceiro,
      }
      : null,

    f.projeto?.trim()
      ? {
        label: "Projeto",
        value: f.projeto,
      }
      : null,

    f.atividade?.trim()
      ? {
        label: "Atividade",
        value: f.atividade,
      }
      : null,

    f.eventoCultural?.trim()
      ? {
        label: "Evento Cultural",
        value: f.eventoCultural,
      }
      : null,

    f.acaoDivulgacao?.trim()
      ? {
        label: "Ação de Divulgação",
        value: f.acaoDivulgacao,
      }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const sections: any[] = [
    {
      title: "1. Identificação da Movimentação",
      fields: [
        {
          label: "Organização",
          value: v(f.organizacao),
        },
        {
          label: "Número do Documento",
          value: v(f.numeroDocumento),
        },
        {
          label: "Descrição",
          value: v(f.descricao),
        },
      ],
    },
    {
      title: "2. Datas",
      fields: [
        {
          label: "Data do Pagamento",
          value: formatDateBR(f.dataPagamento),
        },
        {
          label: "Data de Vencimento",
          value: formatDateBR(f.dataVencimento),
        },
      ],
    },
    {
      title: "3. Responsável / Favorecido",
      fields: [
        ...pessoaFields,
        {
          label: "CPF/CNPJ",
          value: v(f.cpfCnpj),
        },
      ],
    },
    {
      title: "4. Dados Financeiros",
      fields: [
        {
          label: "Valor",
          value: v(f.valor),
        },
        {
          label: "Tipo de Operação",
          value: v(TIPO_OPERACAO),
        },
        {
          label: "Forma de Pagamento",
          value: v(FORMA_PAGAMENTO),
        },
        {
          label: "Aplicação Financeira",
          value: v(APLICACAO_FINANCEIRA),
        },
        {
          label: "Status Financeiro",
          value: v(STATUS_FINANCEIRO),
        },
      ],
    },
  ];

  if (vinculosFields.length > 0) {
    sections.push({
      title: "5. Vínculos da Movimentação",
      fields: vinculosFields,
    });
  }

  sections.push({
    title: vinculosFields.length > 0 ? "6. Observação" : "5. Observação",
    justifiedParagraphs: f.observacao ? [f.observacao] : [PLACEHOLDER],
  });

  await generateInstitutionalPdf({
    title: "Ficha Financeira",
    documentNumber: `FIN-${String(f.id).padStart(4, "0")}`,
    sections,
  });
}

// =====================================================================
// META DO PROJETO
// =====================================================================

export async function exportMetaProjetoPdf(m: MetaProjetoPdf) {
  const TITULO_META = m.tituloMeta?.trim() || PLACEHOLDER;

  const DESCRICAO_META = m.descricaoMeta?.trim() || PLACEHOLDER;

  const QUANTIDADE_PREVISTA =
    m.quantidadePrevista !== null &&
      m.quantidadePrevista !== undefined &&
      String(m.quantidadePrevista).trim() !== ""
      ? String(m.quantidadePrevista)
      : PLACEHOLDER;

  const FORMA_COMPROVACAO = m.formaComprovacao?.trim() || PLACEHOLDER;

  const PROJETO = m.projeto?.trim() || PLACEHOLDER;

  const PROPOSTA_EDITAL = m.propostaEdital?.trim() || PLACEHOLDER;

  await generateInstitutionalPdf({
    title: "Ficha de Meta do Projeto",
    documentNumber: `MET-${String(m.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Identificação da Meta",
        fields: [
          {
            label: "Título da Meta",
            value: TITULO_META,
          },
          {
            label: "Quantidade Prevista",
            value: QUANTIDADE_PREVISTA,
          },
          {
            label: "Projeto",
            value: PROJETO,
          },
          {
            label: "Proposta de Edital",
            value: PROPOSTA_EDITAL,
          },
        ],
      },
      {
        title: "2. Descrição da Meta",
        justifiedParagraphs: [DESCRICAO_META],
      },
      {
        title: "3. Forma de Comprovação",
        justifiedParagraphs: [FORMA_COMPROVACAO],
      },
    ],
  });
}

// =====================================================================
// DIRETORIA
// =====================================================================

export async function exportDiretoriaPdf(d: DiretoriaPdf) {
  const statusNormalizado = String(d.statusDiretoria ?? "")
    .trim()
    .toUpperCase();

  const exibirDataAfastamento =
    statusNormalizado === "AFASTADO" ||
    statusNormalizado === "AFASTADA";

  const camposCargoMandato = [
    {
      label: "Cargo na Diretoria",
      value: v(d.cargoDiretoria),
    },
    {
      label: "Status da Diretoria",
      value: v(d.statusDiretoria),
    },
    {
      label: "Data de Início do Mandato",
      value: formatDateBR(d.dataInicioMandato),
    },
    {
      label: "Data de Fim do Mandato",
      value: formatDateBR(d.dataFimMandato),
    },
  ];

  if (exibirDataAfastamento) {
    camposCargoMandato.push({
      label: "Data de Afastamento",
      value: formatDateBR(d.dataAfastamento),
    });
  }

  await generateInstitutionalPdf({
    title: "Ficha de Diretoria",
    documentNumber: `DIR-${String(d.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Dados Pessoais",
        fields: [
          {
            label: "Nome Completo",
            value: v(d.nomeCompleto),
          },
          {
            label: "Data de Nascimento",
            value: formatDateBR(d.dataNascimento),
          },
          {
            label: "CPF",
            value: v(d.cpf),
          },
          {
            label: "RG",
            value: v(d.rg),
          },
          {
            label: "Telefone",
            value: v(d.telefone),
          },
          {
            label: "E-mail",
            value: v(d.email),
          },
        ],
      },
      {
        title: "2. Endereço",
        fields: [
          {
            label: "CEP",
            value: v(d.cep),
          },
          {
            label: "Logradouro",
            value: v(d.logradouro),
          },
          {
            label: "Número",
            value: v(d.numero),
          },
          {
            label: "Complemento",
            value: v(d.complemento),
          },
          {
            label: "Bairro",
            value: v(d.bairro),
          },
          {
            label: "Cidade",
            value: v(d.cidade),
          },
          {
            label: "Estado",
            value: v(d.estado),
          },
        ],
      },
      {
        title: "3. Cargo e Mandato",
        fields: camposCargoMandato,
      },
      {
        title: "4. Vínculo Institucional",
        fields: [
          {
            label: "Organização",
            value: v(d.organizacao),
          },
        ],
      },
      {
        title: "5. Observação",
        justifiedParagraphs: d.observacao ? [d.observacao] : [PLACEHOLDER],
      },
    ],
  });
}

// =====================================================================
// ORGANIZAÇÃO
// =====================================================================

export async function exportOrganizacaoPdf(o: OrganizacaoPdf) {
  const REPRESENTANTE = o.representanteLegal;

  const DOCUMENT_NUMBER = `ORG-${String(o.id ?? "").padStart(4, "0")}`;


  const NOME_REPRESENTANTE =
    o.nomeRepresentanteLegal ||
    REPRESENTANTE?.nomeRepresentante ||
    PLACEHOLDER;

  const CPF_REPRESENTANTE =
    o.cpfRepresentanteLegal ||
    REPRESENTANTE?.cpfRepresentante ||
    PLACEHOLDER;

  const RG_REPRESENTANTE =
    o.rgRepresentanteLegal ||
    REPRESENTANTE?.rgRepresentante ||
    PLACEHOLDER;

  const TELEFONE_REPRESENTANTE =
    o.telefoneRepresentanteLegal ||
    REPRESENTANTE?.telefoneRepresentante ||
    PLACEHOLDER;

  const EMAIL_REPRESENTANTE =
    o.emailRepresentanteLegal ||
    REPRESENTANTE?.emailRepresentante ||
    PLACEHOLDER;

  await generateInstitutionalPdf({
    title: "Ficha da Organização",
    documentNumber: DOCUMENT_NUMBER,
    sections: [
      {
        title: "1. Dados Institucionais",
        fields: [
          {
            label: "Razão Social",
            value: v(o.razaoSocial),
          },
          {
            label: "Nome Fantasia",
            value: v(o.nomeFantasia),
          },
          {
            label: "CNPJ",
            value: v(o.cnpj),
          },
          {
            label: "Data de Fundação",
            value: formatDateBR(o.dataFundacao),
          },
        ],
      },
      {
        title: "2. Contato e Presença Institucional",
        fields: [
          {
            label: "E-mail Institucional",
            value: v(o.emailInstitucional),
          },
          {
            label: "Telefone Institucional",
            value: v(o.telefoneInstitucional),
          },
          {
            label: "Site",
            value: v(o.site),
          },
        ],
      },
      {
        title: "3. Atuação da Organização",
        fields: [
          {
            label: "Território de Atuação",
            value: v(o.territorioAtuacao),
          },
        ],
      },
      {
        title: "4. Histórico de Atuação da Organização",
        justifiedParagraphs: o.historicoAtuacao
          ? [o.historicoAtuacao]
          : [PLACEHOLDER],
      },
      {
        title: "5. Representante Legal",
        fields: [
          {
            label: "Nome do Representante Legal",
            value: v(NOME_REPRESENTANTE),
          },
          {
            label: "CPF do Representante Legal",
            value: v(CPF_REPRESENTANTE),
          },
          {
            label: "RG do Representante Legal",
            value: v(RG_REPRESENTANTE),
          },
          {
            label: "Telefone do Representante Legal",
            value: v(TELEFONE_REPRESENTANTE),
          },
          {
            label: "E-mail do Representante Legal",
            value: v(EMAIL_REPRESENTANTE),
          },
        ],
      },
      {
        title: "6. Perfil Institucional",
        fields: [
          {
            label: "Tipo de Agente",
            value: v(o.tipoAgente),
          },
          {
            label: "Tipo de Iniciativa Cultural",
            value: v(o.tipoIniciativaCultural),
          },
          {
            label: "Área de Atuação",
            value: v(o.areaAtuacao),
          },
        ],
      },
      {
        title: "7. Endereço",
        fields: [
          {
            label: "CEP",
            value: v(o.cep),
          },
          {
            label: "Logradouro",
            value: v(o.logradouro),
          },
          {
            label: "Número",
            value: v(o.numero),
          },
          {
            label: "Complemento",
            value: v(o.complemento),
          },
          {
            label: "Bairro",
            value: v(o.bairro),
          },
          {
            label: "Cidade",
            value: v(o.cidade),
          },
          {
            label: "Estado",
            value: v(o.estado),
          },
        ],
      },
    ],
  });
}

// =====================================================================
// INTEGRANTE
// =====================================================================

export async function exportIntegrantePdf(i: IntegrantePdf) {
  const statusNormalizado = String(i.status ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  const mostrarDataSaida =
    statusNormalizado === "CONCLUIDO" || statusNormalizado === "CONCLUIDO";

  const vinculoFields = [
    {
      label: "Organização",
      value: v(i.organizacao),
    },
    {
      label: "Função / Atuação",
      value: v(i.funcaoIntegrante),
    },
    {
      label: "Data de Entrada",
      value: formatDateBR(i.dataEntrada),
    },
    ...(mostrarDataSaida
      ? [
        {
          label: "Data de Saída",
          value: formatDateBR(i.dataSaida),
        },
      ]
      : []),
    {
      label: "Status do Integrante",
      value: v(i.status),
    },
  ];

  await generateInstitutionalPdf({
    title: "Ficha de Integrante",
    documentNumber: `INT-${String(i.id).padStart(4, "0")}`,
    sections: [
      {
        title: "1. Dados Pessoais",
        fields: [
          {
            label: "Nome Completo",
            value: v(i.nomeCompleto),
          },
          {
            label: "Data de Nascimento",
            value: formatDateBR(i.dataNascimento),
          },
          {
            label: "CPF",
            value: v(i.cpf),
          },
          {
            label: "RG",
            value: v(i.rg),
          },
          {
            label: "Telefone",
            value: v(i.telefone),
          },
          {
            label: "E-mail",
            value: v(i.email),
          },
        ],
      },
      {
        title: "2. Endereço",
        fields: [
          {
            label: "CEP",
            value: v(i.cep),
          },
          {
            label: "Logradouro",
            value: v(i.logradouro),
          },
          {
            label: "Número",
            value: v(i.numero),
          },
          {
            label: "Complemento",
            value: v(i.complemento),
          },
          {
            label: "Bairro",
            value: v(i.bairro),
          },
          {
            label: "Cidade",
            value: v(i.cidade),
          },
          {
            label: "Estado",
            value: v(i.estado),
          },
        ],
      },
      {
        title: "3. Vínculo Institucional",
        fields: vinculoFields,
      },
    ],
  });
}
import { apiFetch } from "@/lib/api";
import type { StatusDomain } from "@/data/status";
import { areaAtuacaoLabel } from "@/data/projetos";
import { tipoDocumentoLabels, type TipoDocumento } from "@/data/documentos";

export type Prioridade = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
export const prioridadeLabel: Record<Prioridade, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export interface Pendencia {
  id: string;
  modulo: string;
  registro: string;
  descricao: string;
  prioridade: Prioridade;
  prazo: Date | null;
  responsavel: string;
  domain?: StatusDomain;
  status?: string;
  href: string;
}

export interface AgendaItem {
  id: string;
  data: Date;
  titulo: string;
  tipo: string;
  modulo: string;
  vinculo: string;
  responsavel: string;
  domain?: StatusDomain;
  status?: string;
  href: string;
}

export interface ProjetoResumo {
  id: string;
  nome: string;
  status: string;
  area: string;
  inicio: Date | null;
  fim: Date | null;
  metas: number;
  metasConcluidas: number;
  atividades: number;
  turmas: number;
  participantes: number;
  progresso: number;
  atrasado: boolean;
  href: string;
}

export interface ExecucaoItem {
  id: string;
  atividade: string;
  tipo: string;
  projeto: string;
  status: string;
  turmas: number;
  participantes: number;
  presencas: number;
  frequencia: number | null;
  evidencias: number;
  inicio: Date | null;
  fim: Date | null;
  href: string;
}

export interface RegularidadeItem {
  id: string;
  tipo: string;
  status: string;
  validade: Date | null;
  situacao: "VIGENTE" | "VENCIDO" | "SEM_VALIDADE";
  diasRestantes: number | null;
  arquivo: boolean;
  href: string;
}

export interface PatrimonioItem {
  id: string;
  numero: string;
  nome: string;
  tipo: string;
  estado: string;
  status: string;
  valor: number;
  emprestadoPara: string;
  devolucao: Date | null;
  atrasado: boolean;
  href: string;
}

export interface PublicoDistribuicao {
  name: string;
  value: number;
}
export interface PublicoResumo {
  total: number;
  ativos: number;
  pendentes: number;
  comCadUnico: number;
  comBolsaFamilia: number;
  porGenero: PublicoDistribuicao[];
  porRaca: PublicoDistribuicao[];
  porFaixaEtaria: PublicoDistribuicao[];
  porRenda: PublicoDistribuicao[];
}

export interface ImpactoResumo {
  participantesAtendidos: number;
  atividadesRealizadas: number;
  eventosRealizados: number;
  acoesDivulgacao: number;
  evidencias: number;
  frequenciaMedia: number | null;
  metasCumpridas: number;
  metasTotal: number;
  porTipoEvidencia: PublicoDistribuicao[];
  porTipoAtividade: PublicoDistribuicao[];
}

export interface VisaoGeralResumo {
  projetosAtivos: number;
  projetosTotal: number;
  atividadesAtivas: number;
  turmasAtivas: number;
  participantesAtivos: number;
  pendenciasCriticas: number;
  pendenciasTotal: number;
  documentosVencidos: number;
  documentosVigentes: number;
  compromissos30Dias: number;
  bensEmprestados: number;
  frequenciaMedia: number | null;
  progressoMedio: number;
  statusProjetos: PublicoDistribuicao[];
  pendenciasPorModulo: PublicoDistribuicao[];
}

export interface DashboardCentralSnapshot {
  pendencias: Pendencia[];
  agenda: AgendaItem[];
  projetos: ProjetoResumo[];
  execucao: ExecucaoItem[];
  regularidade: RegularidadeItem[];
  patrimonio: PatrimonioItem[];
  publico: PublicoResumo;
  impacto: ImpactoResumo;
  visaoGeral: VisaoGeralResumo;
  atividades: { id: string; nome: string }[];
}

interface DistribuicaoDTO {
  label: string;
  valor: number;
}
interface PendenciaDTO extends Omit<Pendencia, "prazo" | "domain" | "href"> {
  prazo: string | null;
  dominioStatus?: string;
  rotaFrontend?: string;
}
interface AgendaDTO extends Omit<AgendaItem, "data" | "domain" | "href"> {
  data: string;
  dominioStatus?: string;
  rotaFrontend?: string;
}
interface ProjetoDTO
  extends Omit<ProjetoResumo, "id" | "inicio" | "fim" | "href"> {
  id: number;
  inicio: string | null;
  fim: string | null;
  rotaFrontend?: string;
}
interface ExecucaoDTO
  extends Omit<ExecucaoItem, "id" | "inicio" | "fim" | "href"> {
  id: number;
  inicio: string | null;
  fim: string | null;
  rotaFrontend?: string;
}
interface RegularidadeDTO
  extends Omit<RegularidadeItem, "id" | "validade" | "arquivo" | "href"> {
  id: number;
  validade: string | null;
  arquivoAnexado: boolean;
  rotaFrontend?: string;
}
interface PatrimonioDTO
  extends Omit<PatrimonioItem, "id" | "devolucao" | "href"> {
  id: number;
  devolucao: string | null;
  rotaFrontend?: string;
}
interface PublicoDTO
  extends Omit<
    PublicoResumo,
    "porGenero" | "porRaca" | "porFaixaEtaria" | "porRenda"
  > {
  porGenero: DistribuicaoDTO[];
  porRaca: DistribuicaoDTO[];
  porFaixaEtaria: DistribuicaoDTO[];
  porRenda: DistribuicaoDTO[];
}
interface ImpactoDTO
  extends Omit<
    ImpactoResumo,
    "eventosRealizados" | "porTipoEvidencia" | "porTipoAtividade"
  > {
  eventosCulturais: number;
  porTipoEvidencia: DistribuicaoDTO[];
  porTipoAtividade: DistribuicaoDTO[];
}
interface VisaoGeralDTO
  extends Omit<VisaoGeralResumo, "statusProjetos" | "pendenciasPorModulo"> {
  statusProjetos: DistribuicaoDTO[];
  pendenciasPorModulo: DistribuicaoDTO[];
}

const enumWords: Record<string, string> = {
  nao: "não",
  execucao: "execução",
  analise: "análise",
  revisao: "revisão",
  concluido: "concluído",
  concluida: "concluída",
  genero: "gênero",
  patrimonio: "patrimônio",
  evidencia: "evidência",
  evidencias: "evidências",
  cronogramas: "cronogramas",
  documentos: "documentos",
  atividades: "atividades",
};

export function dashboardLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Não informado";
  if (!raw.includes("_") && raw !== raw.toUpperCase()) return raw;
  const words = raw
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => enumWords[word] ?? word);
  return words.length
    ? `${words[0][0].toUpperCase()}${words[0].slice(1)}${words.length > 1 ? ` ${words.slice(1).join(" ")}` : ""}`
    : "Não informado";
}

const distribution = (items?: DistribuicaoDTO[]): PublicoDistribuicao[] =>
  (items ?? [])
    .filter((item) => item.valor > 0)
    .map((item) => ({
      name: dashboardLabel(item.label),
      value: Number(item.valor ?? 0),
    }));

const frontendRoute = (route: string | undefined, fallback: string) =>
  (route || fallback)
    .replace(/^\/patrimonios(?=\/|$)/, "/patrimonio")
    .replace(/^\/cronogramas(?=\/|$)/, "/cronograma");

const documentLabel = (value: string) =>
  tipoDocumentoLabels[value as TipoDocumento] ?? dashboardLabel(value);

const projectAreasLabel = (value?: string) =>
  value
    ?.split(",")
    .map((area) => areaAtuacaoLabel(area.trim()) || dashboardLabel(area))
    .join(", ") || "—";

export const parseData = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
};
export const hoje = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
export const fmtData = (date?: Date | null) =>
  date ? date.toLocaleDateString("pt-BR") : "—";

function mapPublico(dto: PublicoDTO): PublicoResumo {
  return {
    ...dto,
    porGenero: distribution(dto.porGenero),
    porRaca: distribution(dto.porRaca),
    porFaixaEtaria: distribution(dto.porFaixaEtaria),
    porRenda: distribution(dto.porRenda),
  };
}

function mapDocumentTitle(title: string) {
  const prefix = "Validade: ";
  return title.startsWith(prefix)
    ? `${prefix}${documentLabel(title.slice(prefix.length))}`
    : title;
}

export async function loadPublicoAtividade(
  atividadeId?: string,
): Promise<PublicoResumo> {
  const query = atividadeId
    ? `?atividadeId=${encodeURIComponent(atividadeId)}`
    : "";
  return mapPublico(
    await apiFetch<PublicoDTO>(`/dashboard/publico${query}`, {
      cache: "no-store",
    }),
  );
}

export async function loadDashboardCentral(): Promise<DashboardCentralSnapshot> {
  const [
    visao,
    pendenciasDTO,
    agendaDTO,
    projetosDTO,
    execucaoDTO,
    publicoDTO,
    impactoDTO,
    regularidadeDTO,
    patrimonioDTO,
  ] = await Promise.all([
    apiFetch<VisaoGeralDTO>("/dashboard/visao-geral", { cache: "no-store" }),
    apiFetch<PendenciaDTO[]>("/dashboard/pendencias", { cache: "no-store" }),
    apiFetch<AgendaDTO[]>("/dashboard/agenda", { cache: "no-store" }),
    apiFetch<ProjetoDTO[]>("/dashboard/projetos-detalhados", {
      cache: "no-store",
    }),
    apiFetch<ExecucaoDTO[]>("/dashboard/execucao", { cache: "no-store" }),
    apiFetch<PublicoDTO>("/dashboard/publico", { cache: "no-store" }),
    apiFetch<ImpactoDTO>("/dashboard/impacto", { cache: "no-store" }),
    apiFetch<RegularidadeDTO[]>("/dashboard/regularidade", {
      cache: "no-store",
    }),
    apiFetch<PatrimonioDTO[]>("/dashboard/patrimonio", { cache: "no-store" }),
  ]);

  const execucao = execucaoDTO.map(
    (item): ExecucaoItem => ({
      ...item,
      id: String(item.id),
      tipo: dashboardLabel(item.tipo),
      inicio: parseData(item.inicio),
      fim: parseData(item.fim),
      href: frontendRoute(item.rotaFrontend, `/atividades/${item.id}`),
    }),
  );

  return {
    pendencias: pendenciasDTO.map((item) => ({
      ...item,
      modulo: dashboardLabel(item.modulo),
      registro:
        item.dominioStatus === "documento"
          ? documentLabel(item.registro)
          : dashboardLabel(item.registro),
      prazo: parseData(item.prazo),
      domain: item.dominioStatus as StatusDomain | undefined,
      href: frontendRoute(item.rotaFrontend, "/dashboard?secao=pendencias"),
    })),
    agenda: agendaDTO
      .map((item) => ({
        ...item,
        data: parseData(item.data)!,
        titulo:
          item.dominioStatus === "documento"
            ? mapDocumentTitle(item.titulo)
            : item.titulo,
        tipo: dashboardLabel(item.tipo),
        modulo: dashboardLabel(item.modulo),
        vinculo:
          item.dominioStatus === "documento"
            ? documentLabel(item.vinculo)
            : item.vinculo,
        domain: item.dominioStatus as StatusDomain | undefined,
        href: frontendRoute(item.rotaFrontend, "/dashboard?secao=agenda"),
      }))
      .filter((item) => item.data),
    projetos: projetosDTO.map((item) => ({
      ...item,
      id: String(item.id),
      area: projectAreasLabel(item.area),
      inicio: parseData(item.inicio),
      fim: parseData(item.fim),
      href: frontendRoute(item.rotaFrontend, `/projetos/${item.id}`),
    })),
    execucao,
    publico: mapPublico(publicoDTO),
    impacto: {
      ...impactoDTO,
      eventosRealizados: impactoDTO.eventosCulturais,
      frequenciaMedia: impactoDTO.frequenciaMedia ?? null,
      porTipoEvidencia: distribution(impactoDTO.porTipoEvidencia),
      porTipoAtividade: distribution(impactoDTO.porTipoAtividade),
    },
    regularidade: regularidadeDTO.map((item) => ({
      ...item,
      id: String(item.id),
      tipo: documentLabel(item.tipo),
      validade: parseData(item.validade),
      arquivo: item.arquivoAnexado,
      href: frontendRoute(item.rotaFrontend, "/documentos"),
    })),
    patrimonio: patrimonioDTO.map((item) => ({
      ...item,
      id: String(item.id),
      tipo: dashboardLabel(item.tipo),
      estado: dashboardLabel(item.estado),
      valor: Number(item.valor ?? 0),
      emprestadoPara: item.emprestadoPara || "—",
      devolucao: parseData(item.devolucao),
      href: frontendRoute(item.rotaFrontend, `/patrimonio/${item.id}`),
    })),
    visaoGeral: {
      ...visao,
      frequenciaMedia: visao.frequenciaMedia ?? null,
      statusProjetos: distribution(visao.statusProjetos),
      pendenciasPorModulo: distribution(visao.pendenciasPorModulo),
    },
    atividades: execucao.map((item) => ({ id: item.id, nome: item.atividade })),
  };
}

import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const statusPropostaEditalOptions = [
  { value: "EM_PREPARACAO", label: "Em preparação" },
  { value: "SUBMETIDA", label: "Submetida" },
  { value: "EM_HABILITACAO", label: "Em habilitação" },
  { value: "EM_DILIGENCIA", label: "Em diligência" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "SUPLENTE", label: "Suplente" },
  { value: "REPROVADA", label: "Reprovada" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "EM_EXECUCAO", label: "Em execução" },
  { value: "EM_PRESTACAO_DE_CONTAS", label: "Em prestação de contas" },
  { value: "FINALIZADA", label: "Finalizada" },
] as const;

export type StatusPropostaEdital =
  (typeof statusPropostaEditalOptions)[number]["value"];

export const statusPropostaEditalLabel = (value?: string) =>
  statusPropostaEditalOptions.find((item) => item.value === value)?.label ??
  "—";

export const statusPropostaEditalTone = (
  value?: string,
): "neutral" | "info" | "warning" | "success" | "danger" => {
  switch (value) {
    case "APROVADA":
    case "FINALIZADA":
      return "success";

    case "REPROVADA":
    case "CANCELADA":
      return "danger";

    case "EM_PREPARACAO":
    case "SUPLENTE":
    case "EM_DILIGENCIA":
      return "warning";

    case "SUBMETIDA":
    case "EM_HABILITACAO":
    case "EM_EXECUCAO":
    case "EM_PRESTACAO_DE_CONTAS":
      return "info";

    default:
      return "neutral";
  }
};

export interface PropostaEditalDTO {
  id?: number;
  tituloProjeto: string;
  resumoProjeto: string;
  justificativaProjeto: string;
  metodologiaExecucao: string;
  democratizacaoAcesso: string;
  acoesAcessibilidade: string;
  impactoEsperado: string;
  observacoesInternas?: string | null;
  motivoReprovacao?: string | null;
  valorSolicitado: number;
  valorContrapartida?: number | null;
  dataSubmissao?: string | null;
  statusPropostaEdital: StatusPropostaEdital;

  organizacaoId?: number | string | null;
  editalId?: number | string | null;
  projetoId?: number | string | null;
  agenteId?: number | string | null;
  equipesEditaisIds?: Array<number | string> | null;

  organizacao?: { id?: number | string } | number | string | null;
  edital?: { id?: number | string } | number | string | null;
  projeto?: { id?: number | string } | number | string | null;
  agente?: { id?: number | string } | number | string | null;
  equipesEditais?: Array<{ id?: number | string } | number | string> | null;
}

export interface PropostaEdital {
  id: string;
  tituloProjeto: string;
  resumoProjeto: string;
  justificativaProjeto: string;
  metodologiaExecucao: string;
  democratizacaoAcesso: string;
  acoesAcessibilidade: string;
  impactoEsperado: string;
  valorSolicitado: number;
  valorContrapartida?: number;
  dataSubmissao: string;
  statusPropostaEdital: StatusPropostaEdital;
  organizacao: string;
  edital: string;
  projeto: string;
  agente: string;
  observacoesInternas: string;
  motivoReprovacao: string;
  equipesEditaisIds: string[];
}

export interface SimpleOption {
  id: string;
  nome: string;
}

export interface EquipeEditalOption {
  id: string;
  propostaEditalId?: string;
  colaboradorId?: string;
  integranteId?: string;
  funcaoProjeto?: string;
  cargaHorariaPrevista?: number;
  valorPrevisto?: number;
}

interface AgenteApi {
  id?: number | string;
  nomePrincipal?: string | null;
  nomeCompleto?: string | null;
  nomeColetivo?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  nome?: string | null;
}

interface ProjetoApi {
  id?: number | string;
  nomeProjeto?: string | null;
  nome?: string | null;
  titulo?: string | null;
}

interface EditalApi {
  id?: number | string;
  nomeEdital?: string | null;
  tituloEdital?: string | null;
  nome?: string | null;
  titulo?: string | null;
}

interface OrganizacaoApi {
  id?: number | string;
  nomeOrganizacao?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  nome?: string | null;
}

interface EquipeEditalApi {
  id?: number | string;
  propostaEditalId?: number | string | null;
  propostaEdital?: { id?: number | string } | number | string | null;
  colaboradorId?: number | string | null;
  colaborador?: { id?: number | string } | number | string | null;
  integranteId?: number | string | null;
  integrante?: { id?: number | string } | number | string | null;
  funcaoProjeto?: string | null;
  cargaHorariaPrevista?: number | string | null;
  valorPrevisto?: number | string | null;
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }
  }

  return String(value);
}

function normalizeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeIdsList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map(normalizeId).filter(Boolean);
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
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

export function formatDateBr(iso?: string) {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

export function formatBRLNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "—";
}

export function mapProposta(dto: PropostaEditalDTO): PropostaEdital {
  const organizacaoId = normalizeId(dto.organizacaoId ?? dto.organizacao);
  const editalId = normalizeId(dto.editalId ?? dto.edital);
  const projetoId = normalizeId(dto.projetoId ?? dto.projeto);
  const agenteId = normalizeId(dto.agenteId ?? dto.agente);

  const equipesIds = normalizeIdsList(
    dto.equipesEditaisIds ?? dto.equipesEditais ?? [],
  );

  return {
    id: normalizeId(dto.id),
    tituloProjeto: dto.tituloProjeto ?? "",
    resumoProjeto: dto.resumoProjeto ?? "",
    justificativaProjeto: dto.justificativaProjeto ?? "",
    metodologiaExecucao: dto.metodologiaExecucao ?? "",
    democratizacaoAcesso: dto.democratizacaoAcesso ?? "",
    acoesAcessibilidade: dto.acoesAcessibilidade ?? "",
    impactoEsperado: dto.impactoEsperado ?? "",
    observacoesInternas: dto.observacoesInternas ?? "",
    motivoReprovacao: dto.motivoReprovacao ?? "",
    valorSolicitado: Number(dto.valorSolicitado ?? 0),
    valorContrapartida: normalizeNumber(dto.valorContrapartida),
    dataSubmissao: dto.dataSubmissao ?? "",
    statusPropostaEdital: dto.statusPropostaEdital ?? "EM_PREPARACAO",
    organizacao: organizacaoId,
    edital: editalId,
    projeto: projetoId,
    agente: agenteId,
    equipesEditaisIds: equipesIds,
  };
}

export function buildPropostaPayload(
  item: PropostaEdital,
): PropostaEditalDTO {
  return {
    id: item.id ? Number(item.id) : undefined,
    tituloProjeto: item.tituloProjeto.trim(),
    resumoProjeto: item.resumoProjeto.trim(),
    justificativaProjeto: item.justificativaProjeto.trim(),
    metodologiaExecucao: item.metodologiaExecucao.trim(),
    democratizacaoAcesso: item.democratizacaoAcesso.trim(),
    acoesAcessibilidade: item.acoesAcessibilidade.trim(),
    impactoEsperado: item.impactoEsperado.trim(),
    observacoesInternas: item.observacoesInternas?.trim() || null,
    motivoReprovacao: item.motivoReprovacao?.trim() || null,
    valorSolicitado: Number(item.valorSolicitado || 0),
    valorContrapartida:
      typeof item.valorContrapartida === "number" &&
      Number.isFinite(item.valorContrapartida)
        ? item.valorContrapartida
        : null,
    dataSubmissao: item.dataSubmissao?.trim() || null,
    statusPropostaEdital: item.statusPropostaEdital,
    organizacaoId: item.organizacao ? Number(item.organizacao) : null,
    editalId: item.edital ? Number(item.edital) : null,
    projetoId: item.projeto ? Number(item.projeto) : null,
    agenteId: item.agente ? Number(item.agente) : null,
    equipesEditaisIds: (item.equipesEditaisIds ?? [])
      .filter(Boolean)
      .map(Number)
      .filter((id) => Number.isFinite(id)),
  };
}

export async function getPropostasEditais(): Promise<PropostaEdital[]> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapProposta);
}

export async function getPropostaEditalById(
  id: number,
): Promise<PropostaEdital> {
  const response = await fetch(`${API_URL}/propostas-editais/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalDTO = await response.json();

  return mapProposta(data);
}

export async function createPropostaEdital(
  payload: PropostaEditalDTO,
): Promise<PropostaEdital> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalDTO = await response.json();

  return mapProposta(data);
}

export async function updatePropostaEdital(
  id: number,
  payload: PropostaEditalDTO,
): Promise<PropostaEdital> {
  const response = await fetch(`${API_URL}/propostas-editais/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalDTO = await response.json();

  return mapProposta(data);
}

export async function deletePropostaEdital(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/propostas-editais/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getAgentesOptions(): Promise<SimpleOption[]> {
  const response = await fetch(`${API_URL}/agentes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomePrincipal,
            item.nomeCompleto,
            item.nomeColetivo,
            item.nomeFantasia,
            item.razaoSocial,
            item.nome,
          ) || `Agente ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getProjetosOptions(): Promise<SimpleOption[]> {
  const response = await fetch(`${API_URL}/projetos`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ProjetoApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(item.nomeProjeto, item.nome, item.titulo) ||
          `Projeto ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getEditaisOptions(): Promise<SimpleOption[]> {
  const response = await fetch(`${API_URL}/editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EditalApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(item.nomeEdital, item.tituloEdital, item.nome, item.titulo) ||
          `Edital ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getOrganizacoesOptions(): Promise<SimpleOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: OrganizacaoApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.nomeOrganizacao,
            item.razaoSocial,
            item.nomeFantasia,
            item.nome,
          ) || `Organização ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getEquipesEditaisOptions(): Promise<EquipeEditalOption[]> {
  const response = await fetch(`${API_URL}/equipes-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EquipeEditalApi[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const id = normalizeId(item.id);
      const propostaEditalId = normalizeId(
        item.propostaEditalId ?? item.propostaEdital,
      );
      const colaboradorId = normalizeId(item.colaboradorId ?? item.colaborador);
      const integranteId = normalizeId(item.integranteId ?? item.integrante);
      const cargaHorariaPrevista = normalizeNumber(item.cargaHorariaPrevista);
      const valorPrevisto = normalizeNumber(item.valorPrevisto);

      return {
        id,
        propostaEditalId: propostaEditalId || undefined,
        colaboradorId: colaboradorId || undefined,
        integranteId: integranteId || undefined,
        funcaoProjeto: item.funcaoProjeto ?? "",
        cargaHorariaPrevista,
        valorPrevisto,
      };
    })
    .filter((item) => item.id);
}
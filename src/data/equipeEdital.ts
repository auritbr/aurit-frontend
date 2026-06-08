import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type TipoPessoaEquipe = "COLABORADOR" | "INTEGRANTE";

export interface EquipeEditalDTO {
  id?: number;
  ordem?: number | null;
  funcaoProjeto: string;
  cargaHorariaPrevista: number;
  valorPrevisto: number;
  coordenadorProjeto?: boolean | null;
  responsavelTecnico?: boolean | null;
  justificativaFuncao: string;
  miniBiografia: string;
  colaboradorId?: number | null;
  integranteId?: number | null;
  propostaEditalId: number;
}

export interface EquipeEdital {
  id: string;
  ordem?: number | null;
  propostaEdital: string;
  tipoPessoa: TipoPessoaEquipe;
  colaborador?: string;
  integrante?: string;
  funcaoProjeto: string;
  cargaHorariaPrevista: number;
  valorPrevisto: number;
  justificativaFuncao: string;
  miniBiografia: string;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
}

export interface PessoaOption {
  id: string;
  nome: string;
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
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

function parseMoneyToNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const n = Number(normalized);

    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export const tipoPessoaLabel = (t?: TipoPessoaEquipe | string) => {
  if (t === "COLABORADOR") return "Colaborador";
  if (t === "INTEGRANTE") return "Integrante";
  return "—";
};

export const formatBRL = (v?: number) => {
  const value = typeof v === "number" && Number.isFinite(v) ? v : 0;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const formatBRLInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  const num = parseInt(digits, 10) / 100;

  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const parseBRL = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return 0;

  return parseInt(digits, 10) / 100;
};

export function mapEquipeEdital(dto: EquipeEditalDTO): EquipeEdital {
  const colaboradorId = normalizeId(dto.colaboradorId);
  const integranteId = normalizeId(dto.integranteId);

  const hasColaborador = !!colaboradorId;
  const hasIntegrante = !!integranteId;

  return {
    id: normalizeId(dto.id),
    ordem: dto.ordem ?? null,
    propostaEdital: normalizeId(dto.propostaEditalId),
    tipoPessoa: hasColaborador && !hasIntegrante ? "COLABORADOR" : "INTEGRANTE",
    colaborador: hasColaborador ? colaboradorId : undefined,
    integrante: hasIntegrante ? integranteId : undefined,
    funcaoProjeto: dto.funcaoProjeto ?? "",
    cargaHorariaPrevista: dto.cargaHorariaPrevista ?? 0,
    valorPrevisto: parseMoneyToNumber(dto.valorPrevisto),
    justificativaFuncao: dto.justificativaFuncao ?? "",
    miniBiografia: dto.miniBiografia ?? "",
  };
}

export function buildEquipeEditalPayload(form: EquipeEdital): EquipeEditalDTO {
  return {
    id: form.id ? Number(form.id) : undefined,
    ordem: form.ordem ?? null,
    funcaoProjeto: form.funcaoProjeto.trim(),
    cargaHorariaPrevista: Number(form.cargaHorariaPrevista),
    valorPrevisto: Number(form.valorPrevisto),
    justificativaFuncao: form.justificativaFuncao.trim(),
    miniBiografia: form.miniBiografia.trim(),
    propostaEditalId: Number(form.propostaEdital),
    colaboradorId:
      form.tipoPessoa === "COLABORADOR" && form.colaborador
        ? Number(form.colaborador)
        : null,
    integranteId:
      form.tipoPessoa === "INTEGRANTE" && form.integrante
        ? Number(form.integrante)
        : null,
  };
}

export async function getEquipesEditais(): Promise<EquipeEdital[]> {
  const response = await fetch(`${API_URL}/equipes-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EquipeEditalDTO[] = await response.json();

  return (data ?? []).map(mapEquipeEdital);
}

export async function getEquipeEditalById(id: number): Promise<EquipeEdital> {
  const response = await fetch(`${API_URL}/equipes-editais/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EquipeEditalDTO = await response.json();

  return mapEquipeEdital(data);
}

export async function createEquipeEdital(
  payload: EquipeEditalDTO,
): Promise<EquipeEdital> {
  const response = await fetch(`${API_URL}/equipes-editais`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EquipeEditalDTO = await response.json();

  return mapEquipeEdital(data);
}

export async function updateEquipeEdital(
  id: number,
  payload: EquipeEditalDTO,
): Promise<EquipeEdital> {
  const response = await fetch(`${API_URL}/equipes-editais/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: EquipeEditalDTO = await response.json();

  return mapEquipeEdital(data);
}

export async function deleteEquipeEdital(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/equipes-editais/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

type PropostaEditalApi = {
  id?: number;
  tituloProjeto?: string;
  nomeProposta?: string;
  nomeEdital?: string;
  titulo?: string;
  nome?: string;
};

type ColaboradorApi = {
  id?: number;
  nomeCompleto?: string;
  nome?: string;
};

type IntegranteApi = {
  id?: number;
  nomeCompleto?: string;
  nome?: string;
};

export async function getPropostasEditalOptions(): Promise<
  PropostaEditalOption[]
> {
  const response = await fetch(`${API_URL}/propostas-editais`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PropostaEditalApi[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(
            item.tituloProjeto,
            item.nomeProposta,
            item.nomeEdital,
            item.titulo,
            item.nome,
          ) || `Proposta ${item.id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getColaboradoresOptions(): Promise<PessoaOption[]> {
  const response = await fetch(`${API_URL}/colaboradores`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: ColaboradorApi[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome:
          pickText(item.nomeCompleto, item.nome) || `Colaborador ${item.id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getIntegrantesOptions(): Promise<PessoaOption[]> {
  const response = await fetch(`${API_URL}/integrantes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: IntegranteApi[] = await response.json();

  return (data ?? [])
    .map((item) => {
      const id = normalizeId(item.id);

      return {
        id,
        nome: pickText(item.nomeCompleto, item.nome) || `Integrante ${item.id}`,
      };
    })
    .filter((item) => item.id);
}
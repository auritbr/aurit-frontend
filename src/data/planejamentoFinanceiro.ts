import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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

export const planejamentoFinanceiroQuantidadeError =
  "A quantidade deve ser maior que zero.";

export const planejamentoFinanceiroValorUnitarioError =
  "O valor unitário deve ser maior que zero.";

export const planejamentoFinanceiroValorTotalError =
  "O valor total não corresponde à multiplicação dos valores informados.";

export const unidadeMedidaOptions = [
  { value: "MÊS", label: "Mês" },
  { value: "UNIDADE", label: "Unidade" },
  { value: "SERVIÇO", label: "Serviço" },
  { value: "HORA", label: "Hora" },
  { value: "DIÁRIA", label: "Diária" },
  { value: "SEMANA", label: "Semana" },
  { value: "AULA", label: "Aula" },
  { value: "OFICINA", label: "Oficina" },
  { value: "APRESENTAÇÃO", label: "Apresentação" },
  { value: "PACOTE", label: "Pacote" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const unidadeMedidaLabel = (value?: string) =>
  unidadeMedidaOptions.find((u) => u.value === value)?.label ?? value ?? "—";

export function parseCurrencyInput(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const clean = value.trim();

  if (!clean) return 0;

  const digits = clean.replace(/\D/g, "");

  return digits ? Number(digits) / 100 : 0;
}

export function formatCurrencyInput(value: string) {
  const amount = parseCurrencyInput(value);

  if (!amount) return "";

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "";

  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const formatCurrencyBR = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export interface PlanejamentoFinanceiroDTO {
  id?: number;
  nomePlanejamento: string;
  justificativaPlanejamento: string;
  quantidade: number | null;
  unidadeMedida: string;
  valorUnitario: number | null;
  valorTotal: number | null;
  propostaEditalId: number | null;
  equipeEditalId: number | null;
}

export interface PlanejamentoFinanceiroData {
  id: string;
  nomePlanejamento: string;
  justificativaPlanejamento: string;
  quantidade: string;
  unidadeMedida: string;
  valorUnitario: string;
  valorTotal: string;
  propostaEditalId: string;
  equipeEditalId: string;
}

export interface PropostaEditalOption {
  id: string;
  tituloProjeto: string;
}

export interface EquipeEditalOption {
  id: string;
  nome: string;
  funcao: string;
  propostaEditalId: string;
}

interface PropostaEditalApi {
  id?: number | string;
  tituloProjeto?: string;
  nomeProposta?: string;
  nomeEdital?: string;
  titulo?: string;
  nome?: string;
}

interface EquipeEditalApi {
  id?: number | string;
  colaboradorId?: number | string | null;
  integranteId?: number | string | null;
  propostaEditalId?: number | string | null;
  funcaoProjeto?: string;
}

interface PessoaApi {
  id?: number | string;
  nomeCompleto?: string;
  nome?: string;
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

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function createEmptyPlanejamentoFinanceiro(): PlanejamentoFinanceiroData {
  return {
    id: "",
    nomePlanejamento: "",
    justificativaPlanejamento: "",
    quantidade: "",
    unidadeMedida: "",
    valorUnitario: "",
    valorTotal: "",
    propostaEditalId: "",
    equipeEditalId: "",
  };
}

export function mapPlanejamentoFinanceiro(
  dto: PlanejamentoFinanceiroDTO,
): PlanejamentoFinanceiroData {
  return {
    id: String(dto.id ?? ""),
    nomePlanejamento: dto.nomePlanejamento ?? "",
    justificativaPlanejamento: dto.justificativaPlanejamento ?? "",
    quantidade: dto.quantidade != null ? String(dto.quantidade) : "",
    unidadeMedida: dto.unidadeMedida ?? "",
    valorUnitario:
      dto.valorUnitario != null ? formatCurrencyValue(dto.valorUnitario) : "",
    valorTotal: dto.valorTotal != null ? formatCurrencyValue(dto.valorTotal) : "",
    propostaEditalId:
      dto.propostaEditalId != null ? String(dto.propostaEditalId) : "",
    equipeEditalId:
      dto.equipeEditalId != null ? String(dto.equipeEditalId) : "",
  };
}

export function buildPlanejamentoFinanceiroPayload(
  form: PlanejamentoFinanceiroData,
): PlanejamentoFinanceiroDTO {
  return {
    id: form.id ? Number(form.id) : undefined,
    nomePlanejamento: form.nomePlanejamento.trim(),
    justificativaPlanejamento: form.justificativaPlanejamento.trim(),
    quantidade: form.quantidade ? Number(form.quantidade) : null,
    unidadeMedida: form.unidadeMedida,
    valorUnitario: form.valorUnitario
      ? parseCurrencyInput(form.valorUnitario)
      : null,
    valorTotal: form.valorTotal ? parseCurrencyInput(form.valorTotal) : null,
    propostaEditalId: form.propostaEditalId
      ? Number(form.propostaEditalId)
      : null,
    equipeEditalId: form.equipeEditalId ? Number(form.equipeEditalId) : null,
  };
}

export async function getPlanejamentosFinanceiros(): Promise<
  PlanejamentoFinanceiroData[]
> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanejamentoFinanceiroDTO[] = await response.json();

  return (data ?? []).map(mapPlanejamentoFinanceiro);
}

export async function getPlanejamentoFinanceiroById(
  id: number,
): Promise<PlanejamentoFinanceiroData> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanejamentoFinanceiroDTO = await response.json();

  return mapPlanejamentoFinanceiro(data);
}

export async function createPlanejamentoFinanceiro(
  payload: PlanejamentoFinanceiroDTO,
): Promise<PlanejamentoFinanceiroData> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanejamentoFinanceiroDTO = await response.json();

  return mapPlanejamentoFinanceiro(data);
}

export async function updatePlanejamentoFinanceiro(
  id: number,
  payload: PlanejamentoFinanceiroDTO,
): Promise<PlanejamentoFinanceiroData> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PlanejamentoFinanceiroDTO = await response.json();

  return mapPlanejamentoFinanceiro(data);
}

export async function deletePlanejamentoFinanceiro(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/planejamentos-financeiros/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

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
    .map((item) => ({
      id: normalizeId(item.id),
      tituloProjeto:
        pickText(
          item.tituloProjeto,
          item.nomeProposta,
          item.nomeEdital,
          item.titulo,
          item.nome,
        ) || `Proposta ${item.id}`,
    }))
    .filter((item) => item.id);
}

export async function getEquipesEditalOptions(): Promise<EquipeEditalOption[]> {
  const [equipesRes, colaboradoresRes, integrantesRes] = await Promise.all([
    fetch(`${API_URL}/equipes-editais`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${API_URL}/colaboradores`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${API_URL}/integrantes`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
  ]);

  if (!equipesRes.ok) {
    throw new Error(await parseError(equipesRes));
  }

  if (!colaboradoresRes.ok) {
    throw new Error(await parseError(colaboradoresRes));
  }

  if (!integrantesRes.ok) {
    throw new Error(await parseError(integrantesRes));
  }

  const equipesData: EquipeEditalApi[] = await equipesRes.json();
  const colaboradoresData: PessoaApi[] = await colaboradoresRes.json();
  const integrantesData: PessoaApi[] = await integrantesRes.json();

  const colaboradoresMap = new Map(
    (colaboradoresData ?? [])
      .map((item) => {
        const id = normalizeId(item.id);
        const nome =
          pickText(item.nomeCompleto, item.nome) || `Colaborador ${id}`;

        return id ? [id, nome] : null;
      })
      .filter(Boolean) as Array<[string, string]>,
  );

  const integrantesMap = new Map(
    (integrantesData ?? [])
      .map((item) => {
        const id = normalizeId(item.id);
        const nome =
          pickText(item.nomeCompleto, item.nome) || `Integrante ${id}`;

        return id ? [id, nome] : null;
      })
      .filter(Boolean) as Array<[string, string]>,
  );

  return (equipesData ?? [])
    .map((equipe) => {
      const id = normalizeId(equipe.id);
      const colaboradorId = normalizeId(equipe.colaboradorId);
      const integranteId = normalizeId(equipe.integranteId);

      const nome =
        (colaboradorId && colaboradoresMap.get(colaboradorId)) ||
        (integranteId && integrantesMap.get(integranteId)) ||
        `Membro da equipe ${id}`;

      return {
        id,
        nome,
        funcao: equipe.funcaoProjeto?.trim() || "",
        propostaEditalId: normalizeId(equipe.propostaEditalId),
      };
    })
    .filter((item) => item.id);
}
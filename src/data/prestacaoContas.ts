import { getJsonHeaders } from "@/lib/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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

export const produtoGeradoOptions = [
  { value: "PUBLICACAO", label: "Publicação" },
  { value: "LIVRO", label: "Livro" },
  { value: "CATALOGO", label: "Catálogo" },
  { value: "LIVE_TRANSMISSAO_ONLINE", label: "Live (transmissão on-line)" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "DOCUMENTARIO", label: "Documentário" },
  { value: "FILME", label: "Filme" },
  { value: "RELATORIO_PESQUISA", label: "Relatório de pesquisa" },
  { value: "PRODUCAO_MUSICAL", label: "Produção musical" },
  { value: "JOGO", label: "Jogo" },
  { value: "ARTESANATO", label: "Artesanato" },
  { value: "OBRAS", label: "Obras" },
  { value: "ESPETACULO", label: "Espetáculo" },
  { value: "SHOW_MUSICAL", label: "Show musical" },
  { value: "SITE", label: "Site" },
  { value: "MUSICA", label: "Música" },
  { value: "OUTROS", label: "Outros" },
] as const;

export type ProdutoGerado = (typeof produtoGeradoOptions)[number]["value"];

export const produtoGeradoLabel = (value?: string | null) =>
  produtoGeradoOptions.find((item) => item.value === value)?.label ??
  value ??
  "—";

export function produtosGeradosTexto(values?: string[] | null) {
  if (!values || values.length === 0) return "—";

  return values.map(produtoGeradoLabel).join(", ");
}

export interface PrestacaoContasMetaDTO {
  id?: number | string | null;
  metaProjetoId?: number | string | null;

  metaProjeto?: {
    id?: number | string | null;
    tituloMeta?: string | null;
    descricaoMeta?: string | null;
    propostaEditalId?: number | string | null;
    propostaEdital?: {
      id?: number | string | null;
    } | null;
  } | null;
}

export interface PrestacaoContasDTO {
  id?: number | string | null;

  dataEntrega?: string | null;

  resumoResultados?: string | null;
  outrosProdutosGerados?: string | null;
  disponibilizacaoProdutosPublico?: string | null;
  resultadosGeradosProjeto?: string | null;

  produtosGerados?: ProdutoGerado[] | string[] | null;
  prestacaoMetas?: PrestacaoContasMetaDTO[] | null;

  equipeProjetoIds?: Array<number | string> | null;
  acoesDivulgacaoIds?: Array<number | string> | null;

  propostaEditalId?: number | string | null;
  agenteId?: number | string | null;

  propostaEdital?: {
    id?: number | string | null;
    tituloProjeto?: string | null;
    nomeProjeto?: string | null;
    nomeProposta?: string | null;
    tituloProposta?: string | null;
    nomeEdital?: string | null;
    titulo?: string | null;
    nome?: string | null;
  } | null;

  agente?: {
    id?: number | string | null;
    nomePrincipal?: string | null;
    nomeCompleto?: string | null;
    nomeFantasia?: string | null;
    razaoSocial?: string | null;
    nome?: string | null;
  } | null;

  equipeProjeto?: Array<{
    id?: number | string | null;
    funcaoProjeto?: string | null;
    colaboradorId?: number | string | null;
    integranteId?: number | string | null;
    colaborador?: {
      id?: number | string | null;
      nomeCompleto?: string | null;
      nome?: string | null;
    } | null;
    integrante?: {
      id?: number | string | null;
      nomeCompleto?: string | null;
      nome?: string | null;
    } | null;
  }> | null;

  acoesDivulgacao?: Array<{
    id?: number | string | null;
    nomeAcao?: string | null;
  }> | null;
}

export interface PrestacaoMetaForm {
  id: string;
  metaProjetoId: string;
}

export interface PrestacaoContas {
  id: string;
  propostaEdital: string;
  agente: string;
  dataEntrega: string;

  prestacaoMetas: PrestacaoMetaForm[];
  produtosGerados: ProdutoGerado[];
  outrosProdutosGerados: string;

  disponibilizacaoProdutosPublico: string;
  resultadosGeradosProjeto: string;
  resumoResultados: string;

  equipeProjeto: string[];
  acoesDivulgacao: string[];
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
}

export interface AgenteOption {
  id: string;
  nome: string;
}

export interface PrestacaoMetaOption {
  id: string;
  nome: string;
  metaProjetoId: string;
  propostaEditalId: string;
}

export interface EquipeProjetoOption {
  id: string;
  nome: string;
  funcao: string;
  propostaEditalId: string;
}

export interface AcaoDivulgacaoOption {
  id: string;
  nome: string;
  propostaEditalId: string;
}

interface PropostaEditalApiResponse {
  id?: number | string | null;
  tituloProjeto?: string | null;
  nomeProjeto?: string | null;
  nomeProposta?: string | null;
  tituloProposta?: string | null;
  nomeEdital?: string | null;
  titulo?: string | null;
  nome?: string | null;
}

interface AgenteApiResponse {
  id?: number | string | null;
  nomePrincipal?: string | null;
  nomeCompleto?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  nome?: string | null;
}

interface PrestacaoMetaApiResponse {
  id?: number | string | null;
  metaProjetoId?: number | string | null;
  statusCumprimentoMeta?: string | null;
  metaProjeto?: {
    id?: number | string | null;
    tituloMeta?: string | null;
    descricaoMeta?: string | null;
    propostaEditalId?: number | string | null;
    propostaEdital?: {
      id?: number | string | null;
    } | null;
  } | null;
}

interface EquipeEditalApiResponse {
  id?: number | string | null;
  funcaoProjeto?: string | null;
  colaboradorId?: number | string | null;
  integranteId?: number | string | null;
  propostaEditalId?: number | string | null;
  propostaEdital?: {
    id?: number | string | null;
  } | null;
  colaborador?: {
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  } | null;
  integrante?: {
    id?: number | string | null;
    nomeCompleto?: string | null;
    nome?: string | null;
  } | null;
}

interface PessoaApiResponse {
  id?: number | string | null;
  nomeCompleto?: string | null;
  nome?: string | null;
}

interface AcaoDivulgacaoApiResponse {
  id?: number | string | null;
  nomeAcao?: string | null;
  propostaEditalId?: number | string | null;
  propostaEdital?: {
    id?: number | string | null;
  } | null;
}

function isoOrEmpty(value?: string | null) {
  return value ?? "";
}

function toIdString(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.id !== null && record.id !== undefined) {
      return String(record.id);
    }
  }

  return String(value);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pickFirstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeNumberList(values: string[]) {
  return values
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

function extractIdsFromObjects(
  items?: Array<{ id?: number | string | null }> | null,
) {
  if (!items || items.length === 0) return [];

  return uniqueStrings(items.map((item) => toIdString(item.id)));
}

function extractEquipeIds(dto: PrestacaoContasDTO) {
  if (Array.isArray(dto.equipeProjetoIds)) {
    return uniqueStrings(dto.equipeProjetoIds.map(toIdString));
  }

  return extractIdsFromObjects(dto.equipeProjeto);
}

function extractAcoesIds(dto: PrestacaoContasDTO) {
  if (Array.isArray(dto.acoesDivulgacaoIds)) {
    return uniqueStrings(dto.acoesDivulgacaoIds.map(toIdString));
  }

  return extractIdsFromObjects(dto.acoesDivulgacao);
}

function mapPrestacaoMeta(dto: PrestacaoContasMetaDTO): PrestacaoMetaForm {
  const metaProjetoId = dto.metaProjetoId ?? dto.metaProjeto?.id ?? null;

  return {
    id: toIdString(dto.id),
    metaProjetoId: toIdString(metaProjetoId),
  };
}

export function createEmptyPrestacaoContas(): PrestacaoContas {
  return {
    id: "",
    propostaEdital: "",
    agente: "",
    dataEntrega: "",
    prestacaoMetas: [],
    produtosGerados: [],
    outrosProdutosGerados: "",
    disponibilizacaoProdutosPublico: "",
    resultadosGeradosProjeto: "",
    resumoResultados: "",
    equipeProjeto: [],
    acoesDivulgacao: [],
  };
}

export function createEmptyPrestacaoMeta(
  prestacaoMetaId = "",
  metaProjetoId = "",
): PrestacaoMetaForm {
  return {
    id: prestacaoMetaId,
    metaProjetoId,
  };
}

export function formatDateBr(iso?: string | null) {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

export function mapPrestacao(dto: PrestacaoContasDTO): PrestacaoContas {
  const propostaId = dto.propostaEditalId ?? dto.propostaEdital?.id ?? null;
  const agenteId = dto.agenteId ?? dto.agente?.id ?? null;

  return {
    id: toIdString(dto.id),
    propostaEdital: toIdString(propostaId),
    agente: toIdString(agenteId),
    dataEntrega: isoOrEmpty(dto.dataEntrega),
    prestacaoMetas: (dto.prestacaoMetas ?? []).map(mapPrestacaoMeta),
    produtosGerados: (dto.produtosGerados ?? []) as ProdutoGerado[],
    outrosProdutosGerados: dto.outrosProdutosGerados ?? "",
    disponibilizacaoProdutosPublico:
      dto.disponibilizacaoProdutosPublico ?? "",
    resultadosGeradosProjeto: dto.resultadosGeradosProjeto ?? "",
    resumoResultados: dto.resumoResultados ?? "",
    equipeProjeto: extractEquipeIds(dto),
    acoesDivulgacao: extractAcoesIds(dto),
  };
}

export function buildPrestacaoPayload(
  prestacao: PrestacaoContas,
): PrestacaoContasDTO {
  return {
    id: prestacao.id ? Number(prestacao.id) : undefined,
    dataEntrega: prestacao.dataEntrega || null,
    propostaEditalId: prestacao.propostaEdital
      ? Number(prestacao.propostaEdital)
      : null,
    agenteId: prestacao.agente ? Number(prestacao.agente) : null,
    prestacaoMetas: prestacao.prestacaoMetas.map((meta) => ({
      id: meta.id ? Number(meta.id) : undefined,
    })),
    produtosGerados: prestacao.produtosGerados,
    outrosProdutosGerados:
      prestacao.outrosProdutosGerados.trim() || null,
    disponibilizacaoProdutosPublico:
      prestacao.disponibilizacaoProdutosPublico.trim() || null,
    resultadosGeradosProjeto:
      prestacao.resultadosGeradosProjeto.trim() || null,
    resumoResultados: prestacao.resumoResultados.trim() || null,
    equipeProjetoIds: normalizeNumberList(prestacao.equipeProjeto),
    acoesDivulgacaoIds: normalizeNumberList(prestacao.acoesDivulgacao),
  };
}

export async function getPrestacoesContas(): Promise<PrestacaoContas[]> {
  const response = await fetch(`${API_URL}/prestacoes-contas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO[] = await response.json();

  return (Array.isArray(data) ? data : []).map(mapPrestacao);
}

export async function getPrestacaoContasById(
  id: number,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function createPrestacaoContas(
  payload: PrestacaoContasDTO,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function updatePrestacaoContas(
  id: number,
  payload: PrestacaoContasDTO,
): Promise<PrestacaoContas> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoContasDTO = await response.json();

  return mapPrestacao(data);
}

export async function deletePrestacaoContas(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prestacoes-contas/${id}`, {
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

  const data: PropostaEditalApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);

      return {
        id,
        nome:
          pickFirstText(
            item.nomeProposta,
            item.tituloProposta,
            item.nomeProjeto,
            item.tituloProjeto,
            item.nomeEdital,
            item.titulo,
            item.nome,
          ) || `Proposta ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getAgentesOptions(): Promise<AgenteOption[]> {
  const response = await fetch(`${API_URL}/agentes`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AgenteApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);

      return {
        id,
        nome:
          pickFirstText(
            item.nomePrincipal,
            item.nomeCompleto,
            item.nomeFantasia,
            item.razaoSocial,
            item.nome,
          ) || `Agente ${id}`,
      };
    })
    .filter((item) => item.id);
}

export async function getPrestacaoMetasOptions(): Promise<
  PrestacaoMetaOption[]
> {
  const response = await fetch(`${API_URL}/prestacao-metas`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: PrestacaoMetaApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);
      const metaProjetoId = toIdString(
        item.metaProjetoId ?? item.metaProjeto?.id,
      );
      const propostaEditalId = toIdString(
        item.metaProjeto?.propostaEditalId ??
          item.metaProjeto?.propostaEdital?.id,
      );

      const nome =
        pickFirstText(
          item.metaProjeto?.tituloMeta,
          item.metaProjeto?.descricaoMeta,
        ) || `Prestação de meta ${id}`;

      return {
        id,
        nome,
        metaProjetoId,
        propostaEditalId,
      };
    })
    .filter((item) => item.id);
}

export async function getEquipeProjetoOptions(): Promise<
  EquipeProjetoOption[]
> {
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

  const equipesData: EquipeEditalApiResponse[] = await equipesRes.json();
  const colaboradoresData: PessoaApiResponse[] = await colaboradoresRes.json();
  const integrantesData: PessoaApiResponse[] = await integrantesRes.json();

  const colaboradoresMap = new Map(
    (colaboradoresData ?? [])
      .map((item) => {
        const id = toIdString(item.id);
        const nome =
          pickFirstText(item.nomeCompleto, item.nome) ||
          `Colaborador ${id}`;

        return id ? [id, nome] : null;
      })
      .filter(Boolean) as Array<[string, string]>,
  );

  const integrantesMap = new Map(
    (integrantesData ?? [])
      .map((item) => {
        const id = toIdString(item.id);
        const nome =
          pickFirstText(item.nomeCompleto, item.nome) || `Integrante ${id}`;

        return id ? [id, nome] : null;
      })
      .filter(Boolean) as Array<[string, string]>,
  );

  return (equipesData ?? [])
    .map((item) => {
      const id = toIdString(item.id);
      const colaboradorId = toIdString(
        item.colaboradorId ?? item.colaborador?.id,
      );
      const integranteId = toIdString(
        item.integranteId ?? item.integrante?.id,
      );
      const propostaEditalId = toIdString(
        item.propostaEditalId ?? item.propostaEdital?.id,
      );

      const nome =
        (colaboradorId && colaboradoresMap.get(colaboradorId)) ||
        (integranteId && integrantesMap.get(integranteId)) ||
        pickFirstText(
          item.colaborador?.nomeCompleto,
          item.colaborador?.nome,
          item.integrante?.nomeCompleto,
          item.integrante?.nome,
        ) ||
        `Membro ${id}`;

      return {
        id,
        nome,
        funcao: item.funcaoProjeto?.trim() || "",
        propostaEditalId,
      };
    })
    .filter((item) => item.id);
}

export async function getAcoesDivulgacaoOptions(): Promise<
  AcaoDivulgacaoOption[]
> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoApiResponse[] = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.id !== null && item.id !== undefined)
    .map((item) => {
      const id = toIdString(item.id);
      const propostaEditalId = toIdString(
        item.propostaEditalId ?? item.propostaEdital?.id,
      );

      return {
        id,
        propostaEditalId,
        nome: item.nomeAcao?.trim() || `Ação de divulgação ${id}`,
      };
    })
    .filter((item) => item.id);
}
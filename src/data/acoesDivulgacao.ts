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

      if (typeof json === "string") {
        return json;
      }

      if (json.message) {
        return json.message;
      }

      if (json.error) {
        return json.error;
      }

      return text;
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export type AcaoStatusApi = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";
export type AcaoStatusLabel = "Ativo" | "Inativo" | "Pendente" | "Concluído";

export const statusAcao = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export interface AcaoDivulgacaoDTO {
  id?: number;

  nomeAcao: string;
  descricaoAcao: string;
  realizacaoAcao: string;
  objetivoAcao: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;

  status: AcaoStatusApi;

  propostaEditalId: number;
  nomePropostaEdital?: string;
  tituloPropostaEdital?: string;
  tituloProjeto?: string;

  editalId?: number;
  nomeEdital?: string;

  projetoId?: number;
  nomeProjeto?: string;
}

export interface AcaoDivulgacao {
  id: string;

  nomeAcao: string;
  descricaoAcao: string;
  realizacaoAcao: string;
  objetivoAcao: string;
  acoesAcessibilidade: string;
  resultadoEsperado: string;
  produtosGerados: string;

  status: AcaoStatusApi;

  propostaEditalId: string;
  nomePropostaEdital: string;

  editalId: string;
  nomeEdital: string;

  projetoId: string;
  nomeProjeto: string;
}

export interface PropostaEditalOption {
  id: string;
  nome: string;
  editalId: string;
  edital: string;
  projetoId: string;
  projeto: string;
}

interface PropostaEditalApiResponse {
  id?: number;
  tituloProjeto?: string;
  nomePropostaEdital?: string;
  tituloPropostaEdital?: string;

  editalId?: number;
  nomeEdital?: string;

  projetoId?: number;
  nomeProjeto?: string;
}

export function mapAcaoDivulgacao(dto: AcaoDivulgacaoDTO): AcaoDivulgacao {
  return {
    id: String(dto.id ?? ""),

    nomeAcao: dto.nomeAcao ?? "",
    descricaoAcao: dto.descricaoAcao ?? "",
    realizacaoAcao: dto.realizacaoAcao ?? "",
    objetivoAcao: dto.objetivoAcao ?? "",
    acoesAcessibilidade: dto.acoesAcessibilidade ?? "",
    resultadoEsperado: dto.resultadoEsperado ?? "",
    produtosGerados: dto.produtosGerados ?? "",

    status: dto.status ?? "ATIVO",

    propostaEditalId:
      dto.propostaEditalId != null ? String(dto.propostaEditalId) : "",

    nomePropostaEdital:
      dto.nomePropostaEdital?.trim() ||
      dto.tituloPropostaEdital?.trim() ||
      dto.tituloProjeto?.trim() ||
      "",

    editalId: dto.editalId != null ? String(dto.editalId) : "",
    nomeEdital: dto.nomeEdital?.trim() || "",

    projetoId: dto.projetoId != null ? String(dto.projetoId) : "",
    nomeProjeto: dto.nomeProjeto?.trim() || "",
  };
}

export function buildAcaoDivulgacaoPayload(
  acao: AcaoDivulgacao,
): AcaoDivulgacaoDTO {
  return {
    id: acao.id ? Number(acao.id) : undefined,

    nomeAcao: acao.nomeAcao.trim(),
    descricaoAcao: acao.descricaoAcao.trim(),
    realizacaoAcao: acao.realizacaoAcao.trim(),
    objetivoAcao: acao.objetivoAcao.trim(),
    acoesAcessibilidade: acao.acoesAcessibilidade.trim(),
    resultadoEsperado: acao.resultadoEsperado.trim(),
    produtosGerados: acao.produtosGerados.trim(),

    status: acao.status,
    propostaEditalId: Number(acao.propostaEditalId),
  };
}

export function statusValueToLabel(
  status: AcaoStatusApi | string,
): AcaoStatusLabel {
  const map: Record<AcaoStatusApi, AcaoStatusLabel> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
  };

  return map[status as AcaoStatusApi] ?? "Ativo";
}

export function propostaNomeAcao(
  id?: string,
  propostas: PropostaEditalOption[] = [],
  acao?: AcaoDivulgacao,
) {
  if (acao?.nomePropostaEdital) {
    return acao.nomePropostaEdital;
  }

  if (!id) {
    return "—";
  }

  return propostas.find((item) => item.id === id)?.nome ?? `Proposta ${id}`;
}

export function editalNomeAcao(
  id?: string,
  propostas: PropostaEditalOption[] = [],
  acao?: AcaoDivulgacao,
) {
  if (acao?.nomeEdital) {
    return acao.nomeEdital;
  }

  if (!id) {
    return "—";
  }

  return propostas.find((item) => item.id === id)?.edital || "—";
}

export function projetoNomeAcao(
  id?: string,
  propostas: PropostaEditalOption[] = [],
  acao?: AcaoDivulgacao,
) {
  if (acao?.nomeProjeto) {
    return acao.nomeProjeto;
  }

  if (!id) {
    return "—";
  }

  return propostas.find((item) => item.id === id)?.projeto || "—";
}

export async function getAcoesDivulgacao(): Promise<AcaoDivulgacao[]> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO[] = await response.json();

  return (data ?? []).map(mapAcaoDivulgacao);
}

export async function getAcaoDivulgacaoById(
  id: number,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function createAcaoDivulgacao(
  payload: AcaoDivulgacaoDTO,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      nomeAcao: payload.nomeAcao,
      descricaoAcao: payload.descricaoAcao,
      realizacaoAcao: payload.realizacaoAcao,
      objetivoAcao: payload.objetivoAcao,
      acoesAcessibilidade: payload.acoesAcessibilidade,
      resultadoEsperado: payload.resultadoEsperado,
      produtosGerados: payload.produtosGerados,
      status: payload.status,
      propostaEditalId: payload.propostaEditalId,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function updateAcaoDivulgacao(
  id: number,
  payload: AcaoDivulgacaoDTO,
): Promise<AcaoDivulgacao> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      nomeAcao: payload.nomeAcao,
      descricaoAcao: payload.descricaoAcao,
      realizacaoAcao: payload.realizacaoAcao,
      objetivoAcao: payload.objetivoAcao,
      acoesAcessibilidade: payload.acoesAcessibilidade,
      resultadoEsperado: payload.resultadoEsperado,
      produtosGerados: payload.produtosGerados,
      status: payload.status,
      propostaEditalId: payload.propostaEditalId,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: AcaoDivulgacaoDTO = await response.json();

  return mapAcaoDivulgacao(data);
}

export async function deleteAcaoDivulgacao(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/acoes-divulgacao/${id}`, {
    method: "DELETE",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function getPropostasEditaisOptions(): Promise<
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

  return (data ?? [])
    .filter((item) => item.id != null)
    .map((item) => ({
      id: String(item.id),
      nome:
        item.tituloProjeto?.trim() ||
        item.nomePropostaEdital?.trim() ||
        item.tituloPropostaEdital?.trim() ||
        `Proposta ${item.id}`,
      editalId: item.editalId != null ? String(item.editalId) : "",
      edital: item.nomeEdital?.trim() || "",
      projetoId: item.projetoId != null ? String(item.projetoId) : "",
      projeto: item.nomeProjeto?.trim() || "",
    }));
}
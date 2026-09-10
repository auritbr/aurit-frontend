import { apiFetch, ApiError } from "@/lib/api";

export type SituacaoModelo = "ATIVO" | "INATIVO";
export type OrigemModeloDocumento = "AURIT" | "ORGANIZACAO";

export interface ModeloDocumento {
  id: number;
  nome: string;
  tipoDocumento: string;
  tituloDocumento: string;
  conteudo: string;
  versaoAtual: number;
  situacao: SituacaoModelo;
  organizacaoId: number | null;
  origem: OrigemModeloDocumento;
  editavel: boolean;
  personalizavel: boolean;
  codigo?: string | null;
  modeloOrigemId?: number | null;
  versaoModeloOrigem?: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ModeloDocumentoPayload {
  nome: string;
  tipoDocumento: string;
  tituloDocumento: string;
  conteudo: string;
  situacao: SituacaoModelo;
  modeloOrigemId?: number | null;
}

interface ModeloDocumentoResponse {
  id: number;
  nome: string;
  tipoModeloDocumento: string;
  titulo: string;
  conteudo: string;
  versaoAtual: number;
  ativo: boolean;
  organizacaoId: number | null;
  origem: OrigemModeloDocumento;
  editavel: boolean;
  personalizavel: boolean;
  codigo?: string | null;
  modeloOrigemId?: number | null;
  versaoModeloOrigem?: number | null;
  dataCriacao: string;
  dataAtualizacao: string;
}

interface GrupoVariaveisResponse {
  grupo: string;
  variaveis: Array<{ label: string; chave: string }>;
}

export interface VariavelDocumento {
  grupo: string;
  nome: string;
  descricao?: string;
  chave: string;
}

export interface TipoDocumentoOption {
  valor: string;
  nome: string;
}

export class ModelosDocumentoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelosDocumentoError";
  }
}

export function classificarModelo(
  modelo: Pick<ModeloDocumento, "origem" | "modeloOrigemId">,
) {
  return modelo.origem === "AURIT" || modelo.modeloOrigemId
    ? "Modelo Aurit"
    : "Meu modelo";
}

const tipos: TipoDocumentoOption[] = [
  { valor: "CONTRATO_COLABORADOR", nome: "Contrato de Prestação de Serviço" },
  { valor: "CONTRATO_PARECERISTA", nome: "Contrato de Parecerista" },
  { valor: "TERMO_INTEGRANTE", nome: "Termo de Integrante" },
  { valor: "TERMO_PARTICIPANTE", nome: "Termo de Participante" },
  { valor: "TERMO_VOLUNTARIADO", nome: "Termo Voluntário" },
  { valor: "TERMO_EMPRESTIMO", nome: "Contrato de Empréstimo de Patrimônio" },
  { valor: "RECIBO_EMPRESTIMO", nome: "Recibo de Empréstimo" },
  {
    valor: "RECIBO_DEVOLUCAO_EMPRESTIMO",
    nome: "Recibo de Devolução de Empréstimo",
  },
  { valor: "RECIBO_CONTA_PAGAR", nome: "Recibo de Conta a Pagar" },
  { valor: "RECIBO_CONTA_RECEBER", nome: "Recibo de Conta a Receber" },
  { valor: "RECIBO_DOACAO", nome: "Recibo de Doação" },
  { valor: "AUTORIZACAO_USO_IMAGEM", nome: "Autorização de Uso de Imagem" },
  { valor: "DECLARACAO_PARTICIPACAO", nome: "Declaração de Participação" },
  { valor: "DECLARACAO_DIRETORIA", nome: "Declaração da Diretoria" },
  { valor: "DECLARACAO", nome: "Declaração" },
  { valor: "OUTRO", nome: "Outro" },
];

function mapearModelo(modelo: ModeloDocumentoResponse): ModeloDocumento {
  return {
    id: modelo.id,
    nome: modelo.nome,
    tipoDocumento: modelo.tipoModeloDocumento,
    tituloDocumento: modelo.titulo,
    conteudo: modelo.conteudo,
    versaoAtual: modelo.versaoAtual,
    situacao: modelo.ativo ? "ATIVO" : "INATIVO",
    organizacaoId: modelo.organizacaoId,
    origem: modelo.origem,
    editavel: modelo.editavel,
    personalizavel: modelo.personalizavel,
    codigo: modelo.codigo,
    modeloOrigemId: modelo.modeloOrigemId,
    versaoModeloOrigem: modelo.versaoModeloOrigem,
    criadoEm: modelo.dataCriacao,
    atualizadoEm: modelo.dataAtualizacao,
  };
}

function mapearPayload(payload: ModeloDocumentoPayload) {
  return {
    nome: payload.nome,
    tipoModeloDocumento: payload.tipoDocumento,
    titulo: payload.tituloDocumento,
    conteudo: payload.conteudo,
    ativo: payload.situacao === "ATIVO",
    modeloOrigemId: payload.modeloOrigemId ?? null,
  };
}

async function executar<T>(acao: () => Promise<T>): Promise<T> {
  try {
    return await acao();
  } catch (error) {
    throw new ModelosDocumentoError(
      error instanceof ApiError || error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.",
    );
  }
}

export async function listarModelos(): Promise<ModeloDocumento[]> {
  return executar(async () =>
    (await apiFetch<ModeloDocumentoResponse[]>("/modelos-documentos")).map(
      mapearModelo,
    ),
  );
}

export async function buscarModeloPorId(
  id: string | number,
): Promise<ModeloDocumento> {
  return executar(async () =>
    mapearModelo(
      await apiFetch<ModeloDocumentoResponse>(`/modelos-documentos/${id}`),
    ),
  );
}

export async function criarModelo(
  payload: ModeloDocumentoPayload,
): Promise<ModeloDocumento> {
  return executar(async () =>
    mapearModelo(
      await apiFetch<ModeloDocumentoResponse>("/modelos-documentos", {
        method: "POST",
        body: JSON.stringify(mapearPayload(payload)),
      }),
    ),
  );
}

export async function atualizarModelo(
  id: string | number,
  payload: ModeloDocumentoPayload,
): Promise<ModeloDocumento> {
  return executar(async () =>
    mapearModelo(
      await apiFetch<ModeloDocumentoResponse>(`/modelos-documentos/${id}`, {
        method: "PUT",
        body: JSON.stringify(mapearPayload(payload)),
      }),
    ),
  );
}

export async function excluirModelo(id: string | number): Promise<void> {
  return executar(() =>
    apiFetch<void>(`/modelos-documentos/${id}`, { method: "DELETE" }),
  );
}

export async function alterarSituacaoModelo(
  id: string | number,
  situacao: SituacaoModelo,
): Promise<ModeloDocumento> {
  const modelo = await buscarModeloPorId(id);
  return atualizarModelo(id, { ...modelo, situacao });
}

export async function listarTiposDocumento(): Promise<TipoDocumentoOption[]> {
  return tipos;
}

export async function listarVariaveis(
  tipoDocumento?: string,
): Promise<VariavelDocumento[]> {
  return executar(async () => {
    const query = tipoDocumento
      ? `?tipoDocumento=${encodeURIComponent(tipoDocumento)}`
      : "";
    const grupos = await apiFetch<GrupoVariaveisResponse[]>(
      `/documentos/variaveis${query}`,
    );
    return grupos.flatMap((grupo) =>
      grupo.variaveis.map((variavel) => ({
        grupo: grupo.grupo,
        nome: variavel.label,
        descricao: variavel.chave,
        chave: variavel.chave,
      })),
    );
  });
}

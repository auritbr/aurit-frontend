import { apiFetch } from "@/lib/api";

export const tiposAcompanhamento = [
  { valor: "ACOMPANHAMENTO_GERAL", descricao: "Acompanhamento Geral" },
  {
    valor: "COMPORTAMENTO_E_CONVIVENCIA",
    descricao: "Comportamento e Convivência",
  },
  { valor: "FREQUENCIA", descricao: "Frequência" },
  { valor: "DESISTENCIA", descricao: "Desistência" },
  { valor: "ENCERRAMENTO_DO_VINCULO", descricao: "Encerramento do Vínculo" },
  { valor: "OUTROS", descricao: "Outros" },
] as const;

export type TipoAcompanhamento = (typeof tiposAcompanhamento)[number]["valor"];

export interface DadosAcompanhamento {
  tipoRegistro: TipoAcompanhamento | null;
  dataPresenca: string | null;
  atividadeId: number | null;
  observacoes: string | null;
}

export interface RegistroAcompanhamento extends DadosAcompanhamento {
  id: number;
  participanteId: number;
  atividadeNome: string | null;
  criadoEm: string;
}

export interface RascunhoAcompanhamento extends DadosAcompanhamento {
  id: string;
}

export interface OpcoesAcompanhamento {
  tipos: readonly { valor: TipoAcompanhamento; descricao: string }[];
  datasPresenca: string[];
  atividades: { id: number; nome: string }[];
}

const caminho = (participanteId: string) =>
  `/participantes/${participanteId}/acompanhamentos`;

export function listarAcompanhamentos(
  participanteId: string,
  signal?: AbortSignal,
) {
  return apiFetch<RegistroAcompanhamento[]>(caminho(participanteId), {
    signal,
  });
}

export function buscarOpcoesAcompanhamento(
  participanteId: string,
  signal?: AbortSignal,
) {
  return apiFetch<OpcoesAcompanhamento>(`${caminho(participanteId)}/opcoes`, {
    signal,
  });
}

export function salvarAcompanhamento(
  participanteId: string,
  dados: DadosAcompanhamento,
  registroId?: number,
) {
  const { tipoRegistro, dataPresenca, atividadeId, observacoes } = dados;
  return apiFetch<RegistroAcompanhamento>(
    registroId === undefined
      ? caminho(participanteId)
      : `${caminho(participanteId)}/${registroId}`,
    {
      method: registroId === undefined ? "POST" : "PUT",
      body: JSON.stringify({
        tipoRegistro,
        dataPresenca,
        atividadeId,
        observacoes,
      }),
    },
  );
}

export function excluirAcompanhamento(
  participanteId: string,
  registroId: number,
) {
  return apiFetch<void>(`${caminho(participanteId)}/${registroId}`, {
    method: "DELETE",
  });
}

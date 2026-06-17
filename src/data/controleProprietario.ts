import { apiFetch } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";

export type TipoPlano =
  | "PLANO_GRATUITO"
  | "PLANO_PAGO"
  | "PLANO_CORTESIA";

export type TipoPlanoVisual = TipoPlano;

export type StatusControleProprietario = "ATIVO" | "INATIVO";

export type StatusUsuarioPlataforma = "ATIVO" | "INATIVO";

export type UserRoleEmpresa = "ADMIN" | "USER";

export type StatusPagamento = "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO";

export type FormaPagamento = "PIX" | "BOLETO" | "CARTAO" | "TRANSFERENCIA";

export type TipoLogAcesso =
  | "LOGIN_SUCESSO"
  | "LOGIN_FALHA"
  | "LOGOUT"
  | "CRIACAO"
  | "EDICAO"
  | "EXCLUSAO"
  | "VISUALIZACAO"
  | "ALTERACAO_STATUS"
  | "GERACAO_DOCUMENTO"
  | "ACESSO_NEGADO"
  | "TOKEN_INVALIDO"
  | "ACAO_SISTEMA";

export interface EmpresaControle {
  id: number;
  configuracaoEmpresaId: number;
  nomeEmpresa: string;
  slug: string;
  documentoIdentificacao: string;
  emailContato: string;
  telefoneContato: string;
  tipoPlano: TipoPlano;
  planoCortesia?: boolean;
  statusControleProprietario: StatusControleProprietario;
  totalUsuarios: number;
  limiteUsuarios: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface CriarEmpresaProprietarioPayload {
  nomeEmpresa: string;
  slug: string;
  documentoIdentificacao: string;
  emailContato: string;
  telefoneContato: string;
  tipoPlano: TipoPlano;
  limiteUsuarios?: number;
  nomeAdministrador: string;
  loginAdministrador: string;
  senhaInicial: string;
}

export interface UsuarioEmpresa {
  id: number;
  name: string;
  login: string;
  userRole: UserRoleEmpresa;
  statusUsuario: StatusUsuarioPlataforma;
}

export interface AtualizarUsuarioEmpresaPayload {
  userRole: UserRoleEmpresa;
  statusUsuario: StatusUsuarioPlataforma;
}

export interface PagamentoEmpresa {
  id: number;
  valor: number;
  competencia: string;
  dataVencimento: string;
  dataPagamento: string | null;
  statusPagamento: StatusPagamento;
  formaPagamento: FormaPagamento | null;
  referenciaExterna: string | null;
  observacao: string | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export interface SalvarPagamentoPayload {
  valor: number;
  competencia: string;
  dataVencimento: string;
  dataPagamento: string | null;
  statusPagamento: StatusPagamento;
  formaPagamento: FormaPagamento | null;
  referenciaExterna: string | null;
  observacao: string | null;
}

export interface LogAcessoEmpresa {
  id: number;
  configuracaoEmpresaId: number | null;
  nomeEmpresa: string | null;
  tipoLogAcesso: TipoLogAcesso;
  usuarioId: number | null;
  nomeUsuario: string | null;
  loginInformado: string | null;
  ip: string | null;
  userAgent: string | null;
  detalhe: string | null;
  dataEvento: string;
}

export const PLANO_LABELS: Record<TipoPlanoVisual, string> = {
  PLANO_GRATUITO: "Gratuito",
  PLANO_PAGO: "Pago",
  PLANO_CORTESIA: "Cortesia",
};

export function getPlanoVisualEmpresa(
  empresa: Pick<EmpresaControle, "tipoPlano" | "planoCortesia">,
): TipoPlanoVisual {
  if (
    empresa.tipoPlano === "PLANO_CORTESIA" ||
    (empresa.tipoPlano === "PLANO_PAGO" && empresa.planoCortesia)
  ) {
    return "PLANO_CORTESIA";
  }

  return empresa.tipoPlano;
}

export const ROLE_LABELS: Record<UserRoleEmpresa, string> = {
  ADMIN: "Administrador",
  USER: "Usuário",
};

export const STATUS_USUARIO_LABELS: Record<StatusUsuarioPlataforma, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export const STATUS_EMPRESA_LABELS: Record<StatusControleProprietario, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export const STATUS_PAGAMENTO_LABELS: Record<StatusPagamento, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

export const TIPO_LOG_LABELS: Record<TipoLogAcesso, string> = {
  LOGIN_SUCESSO: "Login realizado",
  LOGIN_FALHA: "Falha no login",
  LOGOUT: "Logout",
  CRIACAO: "Criação",
  EDICAO: "Edição",
  EXCLUSAO: "Exclusão",
  VISUALIZACAO: "Visualização",
  ALTERACAO_STATUS: "Alteração de status",
  GERACAO_DOCUMENTO: "Geração de documento",
  ACESSO_NEGADO: "Acesso negado",
  TOKEN_INVALIDO: "Token inválido",
  ACAO_SISTEMA: "Ação do sistema",
};

export const TIPO_LOG_BADGE_VARIANTS: Record<
  TipoLogAcesso,
  "default" | "success" | "warning" | "danger" | "info" | "muted"
> = {
  LOGIN_SUCESSO: "success",
  LOGIN_FALHA: "danger",
  LOGOUT: "muted",
  CRIACAO: "success",
  EDICAO: "warning",
  EXCLUSAO: "danger",
  VISUALIZACAO: "info",
  ALTERACAO_STATUS: "warning",
  GERACAO_DOCUMENTO: "info",
  ACESSO_NEGADO: "danger",
  TOKEN_INVALIDO: "danger",
  ACAO_SISTEMA: "default",
};

export function getTipoLogLabel(tipo?: TipoLogAcesso | string | null): string {
  if (!tipo) return "—";

  return TIPO_LOG_LABELS[tipo as TipoLogAcesso] ?? tipo;
}

export function gerarSlug(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function criarEmpresaComAdmin(
  payload: CriarEmpresaProprietarioPayload,
) {
  return apiFetch<EmpresaControle>("/controle-proprietario/empresas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listarEmpresasControle() {
  return apiFetch<EmpresaControle[]>("/controle-proprietario/empresas");
}

export async function buscarEmpresaControle(id: number) {
  return apiFetch<EmpresaControle>(`/controle-proprietario/empresas/${id}`);
}

export async function alterarPlanoEmpresa(
  id: number,
  tipoPlano: TipoPlano,
  limiteUsuarios?: number,
) {
  const path = `/controle-proprietario/empresas/${id}/plano`;
  const payload =
    tipoPlano === "PLANO_CORTESIA"
      ? { tipoPlano }
      : {
          tipoPlano,
          limiteUsuarios,
        };

  if (
    import.meta.env.DEV ||
    localStorage.getItem("debugControleProprietario") === "true"
  ) {
    console.debug("[controle-proprietario] alterar plano", {
      method: "PATCH",
      path,
      controleId: id,
      payload,
      hasAuthorizationHeader: Boolean(getStoredToken()),
    });
  }

  return apiFetch<EmpresaControle>(
    path,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function alterarStatusEmpresa(
  id: number,
  statusControleProprietario: StatusControleProprietario,
) {
  return apiFetch<EmpresaControle>(
    `/controle-proprietario/empresas/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ statusControleProprietario }),
    },
  );
}

export async function listarUsuariosEmpresa(id: number) {
  return apiFetch<UsuarioEmpresa[]>(
    `/controle-proprietario/empresas/${id}/usuarios`,
  );
}

export async function atualizarUsuarioEmpresa(
  controleId: number,
  usuarioId: number,
  payload: AtualizarUsuarioEmpresaPayload,
) {
  return apiFetch<UsuarioEmpresa>(
    `/controle-proprietario/empresas/${controleId}/usuarios/${usuarioId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function listarPagamentosEmpresa(id: number) {
  return apiFetch<PagamentoEmpresa[]>(
    `/controle-proprietario/empresas/${id}/pagamentos`,
  );
}

export async function registrarPagamentoEmpresa(
  id: number,
  payload: SalvarPagamentoPayload,
) {
  return apiFetch<PagamentoEmpresa>(
    `/controle-proprietario/empresas/${id}/pagamentos`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function atualizarPagamentoEmpresa(
  controleId: number,
  pagamentoId: number,
  payload: SalvarPagamentoPayload,
) {
  return apiFetch<PagamentoEmpresa>(
    `/controle-proprietario/empresas/${controleId}/pagamentos/${pagamentoId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function excluirPagamentoEmpresa(
  controleId: number,
  pagamentoId: number,
) {
  return apiFetch<void>(
    `/controle-proprietario/empresas/${controleId}/pagamentos/${pagamentoId}`,
    {
      method: "DELETE",
    },
  );
}

export async function listarLogsEmpresa(id: number) {
  return apiFetch<LogAcessoEmpresa[]>(
    `/controle-proprietario/empresas/${id}/logs`,
  );
}

export async function listarLogsGerais() {
  return apiFetch<LogAcessoEmpresa[]>("/controle-proprietario/logs");
}
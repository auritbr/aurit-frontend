import {
  getAuthHeaders,
  getUsuarioLogado,
  limparSessaoUsuario,
  type UsuarioLogado,
} from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type ModuloPermissao =
  | "DASHBOARD"
  | "ORGANIZACAO"
  | "DIRETORIA"
  | "DOCUMENTOS"
  | "AGENTES_CULTURAIS"
  | "COLABORADORES"
  | "INTEGRANTES"
  | "PARTICIPANTES"
  | "PROJETOS"
  | "METAS_PROJETO"
  | "CRONOGRAMA"
  | "ATIVIDADES"
  | "TURMAS"
  | "PRESENCAS"
  | "EDITAIS"
  | "PROPOSTAS_EDITAL"
  | "EQUIPE_EDITAL"
  | "RESULTADO_PROPOSTA"
  | "HABILITACOES_PROPOSTAS"
  | "HABILITACAO"
  | "EVENTOS_CULTURAIS"
  | "ACOES_DIVULGACAO"
  | "PLANO_COMUNICACAO"
  | "EVIDENCIAS"
  | "PLANEJAMENTO_FINANCEIRO"
  | "FINANCEIRO"
  | "PRESTACAO_CONTAS"
  | "PRESTACAO_METAS"
  | "PATRIMONIO"
  | "EMPRESTIMOS"
  | "CURRICULOS"
  | "TRAJETORIAS_CULTURAIS"
  | "RELATORIOS"
  | "USUARIOS"
  | "CONFIGURACOES";

export type AcaoPermissao =
  | "VISUALIZAR"
  | "CRIAR"
  | "EDITAR"
  | "EXCLUIR"
  | "BAIXAR"
  | "GERAR_PDF"
  | "ALTERAR_STATUS";

export interface RequiredPermission {
  modulo: ModuloPermissao;
  acao: AcaoPermissao;
}

export interface PermissoesModulo {
  VISUALIZAR: boolean;
  CRIAR: boolean;
  EDITAR: boolean;
  EXCLUIR: boolean;
  BAIXAR: boolean;
  GERAR_PDF: boolean;
  ALTERAR_STATUS: boolean;
}

export const permissoesVazias: PermissoesModulo = {
  VISUALIZAR: false,
  CRIAR: false,
  EDITAR: false,
  EXCLUIR: false,
  BAIXAR: false,
  GERAR_PDF: false,
  ALTERAR_STATUS: false,
};

export const permissoesTotais: PermissoesModulo = {
  VISUALIZAR: true,
  CRIAR: true,
  EDITAR: true,
  EXCLUIR: true,
  BAIXAR: true,
  GERAR_PDF: true,
  ALTERAR_STATUS: true,
};

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (response.status === 401 || response.status === 403) {
      return text || "Acesso não autorizado.";
    }

    return text || `Erro ${response.status} ao verificar permissão.`;
  } catch {
    return `Erro ${response.status} ao verificar permissão.`;
  }
}

export async function getUsuarioAtual(): Promise<UsuarioLogado> {
  return getUsuarioLogado();
}

export async function verificarPermissaoUsuario(
  usuarioId: number | string,
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<boolean> {
  const params = new URLSearchParams({
    modulo,
    acao,
  });

  const response = await fetch(
    `${API_URL}/usuarios-permissoes/${usuarioId}/verificar?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  if (response.status === 401) {
    limparSessaoUsuario();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return Boolean(await response.json());
}

export async function usuarioTemPermissao(
  modulo: ModuloPermissao,
  acao: AcaoPermissao = "VISUALIZAR",
): Promise<boolean> {
  const usuario = await getUsuarioLogado();

  if (!usuario.id) {
    return false;
  }

  if (usuario.statusUsuario === "INATIVO") {
    limparSessaoUsuario();
    return false;
  }

  if (
    usuario.userRole === "ADMIN" ||
    usuario.userRole === "ADMIN_PROPRIETARIO"
  ) {
    return true;
  }

  return verificarPermissaoUsuario(usuario.id, modulo, acao);
}

export async function getPermissoesUsuarioLogadoPorModulo(
  modulo: ModuloPermissao,
): Promise<PermissoesModulo> {
  const usuario = await getUsuarioLogado();

  if (!usuario.id) {
    return permissoesVazias;
  }

  if (usuario.statusUsuario === "INATIVO") {
    limparSessaoUsuario();
    return permissoesVazias;
  }

  if (
    usuario.userRole === "ADMIN" ||
    usuario.userRole === "ADMIN_PROPRIETARIO"
  ) {
    return permissoesTotais;
  }

  const [
    VISUALIZAR,
    CRIAR,
    EDITAR,
    EXCLUIR,
    BAIXAR,
    GERAR_PDF,
    ALTERAR_STATUS,
  ] = await Promise.all([
    verificarPermissaoUsuario(usuario.id, modulo, "VISUALIZAR"),
    verificarPermissaoUsuario(usuario.id, modulo, "CRIAR"),
    verificarPermissaoUsuario(usuario.id, modulo, "EDITAR"),
    verificarPermissaoUsuario(usuario.id, modulo, "EXCLUIR"),
    verificarPermissaoUsuario(usuario.id, modulo, "BAIXAR"),
    verificarPermissaoUsuario(usuario.id, modulo, "GERAR_PDF"),
    verificarPermissaoUsuario(usuario.id, modulo, "ALTERAR_STATUS"),
  ]);

  return {
    VISUALIZAR,
    CRIAR,
    EDITAR,
    EXCLUIR,
    BAIXAR,
    GERAR_PDF,
    ALTERAR_STATUS,
  };
}

export async function usuarioPodeVisualizar(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "VISUALIZAR");
}

export async function usuarioPodeCriar(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "CRIAR");
}

export async function usuarioPodeEditar(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "EDITAR");
}

export async function usuarioPodeExcluir(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "EXCLUIR");
}

export async function usuarioPodeBaixar(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "BAIXAR");
}

export async function usuarioPodeGerarPdf(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "GERAR_PDF");
}

export async function usuarioPodeAlterarStatus(
  modulo: ModuloPermissao,
): Promise<boolean> {
  return usuarioTemPermissao(modulo, "ALTERAR_STATUS");
}
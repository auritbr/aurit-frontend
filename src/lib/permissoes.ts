import {
  getAuthHeaders,
  getUsuarioLogado,
  limparSessaoUsuario,
  usuarioLogadoEhAdmin,
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
  | "PLANOS_AULA"
  | "PRESENCAS"
  | "EDITAIS"
  | "PROPOSTAS_EDITAL"
  | "EQUIPE_EDITAL"
  | "RESULTADO_PROPOSTA"
  | "HABILITACAO"
  | "EVENTOS_CULTURAIS"
  | "ACOES_DIVULGACAO"
  | "PLANO_COMUNICACAO"
  | "EVIDENCIAS"
  | "PLANEJAMENTO_FINANCEIRO"
  | "FINANCEIRO"
  | "PAINEL_FINANCEIRO"
  | "CONTAS_BANCARIAS"
  | "CONTAS_PAGAR"
  | "CONTAS_RECEBER"
  | "TRANSFERENCIAS_BANCARIAS"
  | "MOVIMENTACOES_BANCARIAS"
  | "CONCILIACOES_BANCARIAS"
  | "FLUXO_CAIXA"
  | "DOACOES"
  | "DOADORES"
  | "FORNECEDORES"
  | "PARCEIROS"
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

function parsePermissaoResponse(data: unknown): boolean {
  if (typeof data === "boolean") {
    return data;
  }

  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;
  const value = obj.permitido ?? obj.allowed ?? obj.temPermissao;

  return typeof value === "boolean" ? value : false;
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

  return parsePermissaoResponse(await response.json());
}

export async function verificarPermissaoUsuarioLogado(
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<boolean> {
  const params = new URLSearchParams({
    modulo,
    acao,
  });

  const response = await fetch(
    `${API_URL}/usuarios-permissoes/me/verificar?${params.toString()}`,
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

  return parsePermissaoResponse(await response.json());
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

  if (usuarioLogadoEhAdmin()) {
    return true;
  }

  return verificarPermissaoUsuarioLogado(modulo, acao);
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

  if (usuarioLogadoEhAdmin()) {
    return permissoesTotais;
  }

  const params = new URLSearchParams({ modulo });
  const response = await fetch(
    `${API_URL}/usuarios-permissoes/me/permissoes?${params.toString()}`,
    { method: "GET", headers: getAuthHeaders() },
  );

  if (response.status === 401) {
    limparSessaoUsuario();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as Partial<PermissoesModulo>;
  return {
    VISUALIZAR: data.VISUALIZAR === true,
    CRIAR: data.CRIAR === true,
    EDITAR: data.EDITAR === true,
    EXCLUIR: data.EXCLUIR === true,
    BAIXAR: data.BAIXAR === true,
    GERAR_PDF: data.GERAR_PDF === true,
    ALTERAR_STATUS: data.ALTERAR_STATUS === true,
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

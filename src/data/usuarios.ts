import { apiFetch } from "@/lib/api";

export type UserRole = "USER" | "ADMIN" | "ADMIN_PROPRIETARIO";
export type StatusUsuario = "ATIVO" | "INATIVO";

export interface Usuario {
  id: string;
  name: string;
  login: string;
  password?: string;
  userRole: UserRole;
  statusUsuario: StatusUsuario;
  configuracaoEmpresaId?: string;
}

export const userRoleLabel: Record<UserRole, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  ADMIN_PROPRIETARIO: "Administrador Proprietário",
};

export const statusUsuarioLabel: Record<StatusUsuario, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export interface UsuarioDTO {
  id: number;
  name: string;
  login: string;
  password?: string | null;
  userRole: UserRole;
  statusUsuario: StatusUsuario;
  configuracaoEmpresaId?: number | null;
}

interface UsuarioStorage {
  id?: number;
  name?: string;
  login?: string;
  userRole?: UserRole | string;
  statusUsuario?: StatusUsuario | string;
  configuracaoEmpresaId?: number | null;
}

interface ConfiguracaoEmpresaDTO {
  id: number;
  nomeEmpresa?: string;
  tipoPlano?:
    | "PLANO_GRATUITO"
    | "PLANO_PAGO"
    | "PLANO_CORTESIA"
    | string
    | null;
  limiteUsuarios?: number | null;
}

export interface ConfiguracaoEmpresaOption {
  id: string;
  nome: string;
  tipoPlano?: string | null;
  limiteUsuarios?: number | null;
}

function getUsuarioLogadoStorage(): UsuarioStorage | null {
  const raw =
    localStorage.getItem("usuarioLogado") ||
    sessionStorage.getItem("usuarioLogado");

  if (!raw) return null;

  try {
    return JSON.parse(raw) as UsuarioStorage;
  } catch {
    return null;
  }
}

function mapUsuarioDtoToUsuario(dto: UsuarioDTO): Usuario {
  return {
    id: String(dto.id),
    name: dto.name ?? "",
    login: dto.login ?? "",
    userRole: dto.userRole,
    statusUsuario: dto.statusUsuario,
    configuracaoEmpresaId:
      dto.configuracaoEmpresaId != null
        ? String(dto.configuracaoEmpresaId)
        : undefined,
  };
}

async function getConfiguracoesEmpresa(): Promise<ConfiguracaoEmpresaDTO[]> {
  return apiFetch<ConfiguracaoEmpresaDTO[]>("/configuracoes-empresa", {
    method: "GET",
  });
}

export async function getConfiguracoesEmpresaOptions(): Promise<
  ConfiguracaoEmpresaOption[]
> {
  const data = await getConfiguracoesEmpresa();

  return (data ?? []).map((item) => ({
    id: String(item.id),
    nome: item.nomeEmpresa ?? `Empresa ${item.id}`,
    tipoPlano: item.tipoPlano ?? null,
    limiteUsuarios: item.limiteUsuarios ?? null,
  }));
}

async function resolveConfiguracaoEmpresaId(
  usuario?: Partial<Usuario>,
): Promise<number | undefined> {
  if (usuario?.configuracaoEmpresaId) {
    return Number(usuario.configuracaoEmpresaId);
  }

  const usuarioStorage = getUsuarioLogadoStorage();

  if (usuarioStorage?.configuracaoEmpresaId != null) {
    return Number(usuarioStorage.configuracaoEmpresaId);
  }

  try {
    const configuracoes = await getConfiguracoesEmpresa();
    const first = configuracoes?.[0];

    if (first?.id != null) {
      return Number(first.id);
    }
  } catch {
    // backend valida depois
  }

  return undefined;
}

async function getConfiguracaoEmpresaAtual(
  configuracaoEmpresaId?: number,
): Promise<ConfiguracaoEmpresaDTO | null> {
  try {
    const configuracoes = await getConfiguracoesEmpresa();

    if (configuracaoEmpresaId != null) {
      return (
        configuracoes.find(
          (c) => Number(c.id) === Number(configuracaoEmpresaId),
        ) ?? null
      );
    }

    return configuracoes?.[0] ?? null;
  } catch {
    return null;
  }
}

function mapUsuarioToPayload(
  usuario: Partial<Usuario>,
  configuracaoEmpresaId?: number,
) {
  return {
    name: usuario.name?.trim() ?? "",
    login: usuario.login?.trim() ?? "",
    password: usuario.password ?? undefined,
    userRole: usuario.userRole,
    statusUsuario: usuario.statusUsuario,
    configuracaoEmpresaId:
      usuario.configuracaoEmpresaId != null
        ? Number(usuario.configuracaoEmpresaId)
        : configuracaoEmpresaId,
  };
}

async function validarLimitePlanoAntesDeCriar(configuracaoEmpresaId?: number) {
  if (configuracaoEmpresaId == null) return;

  const configuracao = await getConfiguracaoEmpresaAtual(configuracaoEmpresaId);

  if (!configuracao) return;

  const limite =
    configuracao.tipoPlano === "PLANO_GRATUITO"
      ? 2
      : configuracao.limiteUsuarios ?? null;

  if (!limite) return;

  const usuarios = await getUsuarios();

  const totalDaEmpresa = usuarios.filter(
    (u) => Number(u.configuracaoEmpresaId) === Number(configuracaoEmpresaId),
  ).length;

  if (totalDaEmpresa >= limite) {
    if (configuracao.tipoPlano === "PLANO_GRATUITO") {
      throw new Error(
        "O plano gratuito permite no máximo 2 usuários. Para cadastrar mais usuários, atualize para o plano pago.",
      );
    }

    throw new Error(
      "O limite de usuários da configuração da empresa foi atingido.",
    );
  }
}

export async function getUsuarios(): Promise<Usuario[]> {
  const data = await apiFetch<UsuarioDTO[]>("/usuarios", {
    method: "GET",
  });

  return (data ?? []).map(mapUsuarioDtoToUsuario);
}

export async function getUsuarioById(id: string): Promise<Usuario | undefined> {
  try {
    const data = await apiFetch<UsuarioDTO>(`/usuarios/${id}`, {
      method: "GET",
    });

    return mapUsuarioDtoToUsuario(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return undefined;
    }

    throw error;
  }
}

export async function createUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
  const configuracaoEmpresaId = await resolveConfiguracaoEmpresaId(usuario);

  await validarLimitePlanoAntesDeCriar(configuracaoEmpresaId);

  const data = await apiFetch<UsuarioDTO>("/usuarios", {
    method: "POST",
    body: JSON.stringify(mapUsuarioToPayload(usuario, configuracaoEmpresaId)),
  });

  return mapUsuarioDtoToUsuario(data);
}

export async function updateUsuario(
  id: string,
  usuario: Partial<Usuario>,
): Promise<Usuario> {
  const configuracaoEmpresaId = await resolveConfiguracaoEmpresaId(usuario);

  const data = await apiFetch<UsuarioDTO>(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapUsuarioToPayload(usuario, configuracaoEmpresaId)),
  });

  return mapUsuarioDtoToUsuario(data);
}

export async function deleteUsuario(id: string): Promise<void> {
  await apiFetch<void>(`/usuarios/${id}`, {
    method: "DELETE",
  });
}

export async function alterarStatusUsuario(
  id: string,
  status: StatusUsuario,
): Promise<Usuario> {
  const data = await apiFetch<UsuarioDTO>(
    `/usuarios/${id}/status?status=${status}`,
    {
      method: "PATCH",
    },
  );

  return mapUsuarioDtoToUsuario(data);
}

export async function isLoginDuplicated(
  login: string,
  ignoreId?: string,
): Promise<boolean> {
  const usuarios = await getUsuarios();
  const normalized = login.trim().toLowerCase();

  return usuarios.some(
    (u) => u.login.trim().toLowerCase() === normalized && u.id !== ignoreId,
  );
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "A senha deve conter no mínimo 8 caracteres.";
  if (!/[a-z]/.test(pw)) return "A senha deve conter pelo menos 1 letra minúscula.";
  if (!/[A-Z]/.test(pw)) return "A senha deve conter pelo menos 1 letra maiúscula.";
  if (!/\d/.test(pw)) return "A senha deve conter pelo menos 1 número.";
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return "A senha deve conter pelo menos 1 caractere especial.";
  }

  return null;
}

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
  | "CRONOGRAMA"
  | "ATIVIDADES"
  | "TURMAS"
  | "PRESENCAS"
  | "EDITAIS"
  | "PROPOSTAS_EDITAL"
  | "HABILITACAO"
  | "EVENTOS_CULTURAIS"
  | "ACOES_DIVULGACAO"
  | "EVIDENCIAS"
  | "PLANEJAMENTO_FINANCEIRO"
  | "FINANCEIRO"
  | "PRESTACAO_CONTAS"
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

export const moduloLabel: Record<ModuloPermissao, string> = {
  DASHBOARD: "Dashboard",
  ORGANIZACAO: "Organização",
  DIRETORIA: "Diretoria",
  DOCUMENTOS: "Documentos",
  AGENTES_CULTURAIS: "Agentes culturais",
  COLABORADORES: "Colaboradores",
  INTEGRANTES: "Integrantes",
  PARTICIPANTES: "Participantes",
  PROJETOS: "Projetos",
  CRONOGRAMA: "Cronograma",
  ATIVIDADES: "Atividades",
  TURMAS: "Turmas",
  PRESENCAS: "Presenças",
  EDITAIS: "Editais",
  PROPOSTAS_EDITAL: "Propostas de edital",
  HABILITACAO: "Habilitação",
  EVENTOS_CULTURAIS: "Eventos culturais",
  ACOES_DIVULGACAO: "Ações de divulgação",
  EVIDENCIAS: "Evidências",
  PLANEJAMENTO_FINANCEIRO: "Planejamento financeiro",
  FINANCEIRO: "Financeiro",
  PRESTACAO_CONTAS: "Prestação de contas",
  PATRIMONIO: "Patrimônio",
  EMPRESTIMOS: "Empréstimos",
  CURRICULOS: "Currículos",
  TRAJETORIAS_CULTURAIS: "Trajetórias culturais",
  RELATORIOS: "Relatórios",
  USUARIOS: "Usuários",
  CONFIGURACOES: "Configurações",
};

export const acaoLabel: Record<AcaoPermissao, string> = {
  VISUALIZAR: "Visualizar",
  CRIAR: "Criar",
  EDITAR: "Editar",
  EXCLUIR: "Excluir",
  BAIXAR: "Baixar",
  GERAR_PDF: "Gerar PDF",
  ALTERAR_STATUS: "Alterar status",
};

export const ACOES: AcaoPermissao[] = [
  "VISUALIZAR",
  "CRIAR",
  "EDITAR",
  "EXCLUIR",
  "BAIXAR",
  "GERAR_PDF",
  "ALTERAR_STATUS",
];

export interface ModuloGrupo {
  title: string;
  modulos: ModuloPermissao[];
}

export const GRUPOS_MODULOS: ModuloGrupo[] = [
  { title: "Visão geral", modulos: ["DASHBOARD"] },
  { title: "Organização", modulos: ["ORGANIZACAO", "DIRETORIA", "DOCUMENTOS"] },
  {
    title: "Pessoas",
    modulos: ["AGENTES_CULTURAIS", "COLABORADORES", "INTEGRANTES", "PARTICIPANTES"],
  },
  {
    title: "Projetos e execução",
    modulos: ["PROJETOS", "CRONOGRAMA", "ATIVIDADES", "TURMAS", "PRESENCAS"],
  },
  { title: "Editais", modulos: ["EDITAIS", "PROPOSTAS_EDITAL", "HABILITACAO"] },
  {
    title: "Ações culturais",
    modulos: ["EVENTOS_CULTURAIS", "ACOES_DIVULGACAO", "EVIDENCIAS"],
  },
  { title: "Financeiro", modulos: ["PLANEJAMENTO_FINANCEIRO", "FINANCEIRO"] },
  { title: "Prestação de contas", modulos: ["PRESTACAO_CONTAS"] },
  { title: "Patrimônio", modulos: ["PATRIMONIO", "EMPRESTIMOS"] },
  { title: "Trajetórias", modulos: ["CURRICULOS", "TRAJETORIAS_CULTURAIS"] },
  {
    title: "Relatórios e configurações",
    modulos: ["RELATORIOS", "USUARIOS", "CONFIGURACOES"],
  },
];

export interface UsuarioPermissao {
  id?: string;
  usuarioId: string;
  moduloPermissao: ModuloPermissao;
  acaoPermissao: AcaoPermissao;
  permitido: boolean;
}

interface UsuarioPermissaoDTO {
  id?: number;
  usuarioId: number;
  modulo: ModuloPermissao;
  acao: AcaoPermissao;
  permitido: boolean;
}

interface UsuarioPermissoesUpdateDTO {
  usuarioId: number;
  permissoes: UsuarioPermissaoDTO[];
}

function mapPermissaoDtoToPermissao(dto: UsuarioPermissaoDTO): UsuarioPermissao {
  return {
    id: dto.id != null ? String(dto.id) : undefined,
    usuarioId: String(dto.usuarioId),
    moduloPermissao: dto.modulo,
    acaoPermissao: dto.acao,
    permitido: !!dto.permitido,
  };
}

export async function getPermissoes(
  usuarioId: string,
): Promise<UsuarioPermissao[]> {
  const data = await apiFetch<UsuarioPermissaoDTO[]>(
    `/usuarios-permissoes/${usuarioId}`,
    {
      method: "GET",
    },
  );

  return data.map(mapPermissaoDtoToPermissao);
}

export async function savePermissoes(
  usuarioId: string,
  perms: UsuarioPermissao[],
): Promise<UsuarioPermissao[]> {
  const payload: UsuarioPermissoesUpdateDTO = {
    usuarioId: Number(usuarioId),
    permissoes: perms.map((p) => ({
      id: p.id != null ? Number(p.id) : undefined,
      usuarioId: Number(usuarioId),
      modulo: p.moduloPermissao,
      acao: p.acaoPermissao,
      permitido: !!p.permitido,
    })),
  };

  const data = await apiFetch<UsuarioPermissaoDTO[]>(
    `/usuarios-permissoes/${usuarioId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return data.map(mapPermissaoDtoToPermissao);
}

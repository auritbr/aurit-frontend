import { getUsuarioLogadoStorage } from "@/lib/auth";
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

export interface ConfiguracaoEmpresaOption {
  id: string;
  nome: string;
  tipoPlano?: string | null;
  limiteUsuarios?: number | null;
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

interface ConfiguracaoEmpresaDTO {
  id: number;
  nomeEmpresa?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  tipoPlano?: "PLANO_GRATUITO" | "PLANO_PAGO" | string | null;
  limiteUsuarios?: number | null;
}

export interface TrocarSenhaPayload {
  senhaAtual: string;
  novaSenha: string;
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

function configuracaoNome(dto: ConfiguracaoEmpresaDTO): string {
  return (
    dto.nomeEmpresa?.trim() ||
    dto.nomeFantasia?.trim() ||
    dto.razaoSocial?.trim() ||
    `Empresa ${dto.id}`
  );
}

function mapUsuarioToPayload(usuario: Partial<Usuario>) {
  return {
    name: usuario.name?.trim() ?? "",
    login: usuario.login?.trim() ?? "",
    password: usuario.password ?? undefined,
    userRole: usuario.userRole,
    statusUsuario: usuario.statusUsuario,
  };
}

export async function getConfiguracoesEmpresaOptions(): Promise<
  ConfiguracaoEmpresaOption[]
> {
  const data = await apiFetch<ConfiguracaoEmpresaDTO[]>(
    "/configuracoes-empresa",
    {
      method: "GET",
    },
  );

  return (data ?? []).map((item) => ({
    id: String(item.id),
    nome: configuracaoNome(item),
    tipoPlano: item.tipoPlano,
    limiteUsuarios: item.limiteUsuarios,
  }));
}

async function getConfiguracoesEmpresa(): Promise<ConfiguracaoEmpresaDTO[]> {
  return apiFetch<ConfiguracaoEmpresaDTO[]>("/configuracoes-empresa", {
    method: "GET",
  });
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
    const message = error instanceof Error ? error.message : "";

    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return undefined;
    }

    throw error;
  }
}

export async function createUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
  const usuarioLogado = getUsuarioLogadoStorage();

  if (!usuarioLogado?.configuracaoEmpresaId) {
    throw new Error(
      "Não foi possível identificar a configuração da empresa do usuário logado.",
    );
  }

  await validarLimitePlanoAntesDeCriar(usuarioLogado.configuracaoEmpresaId);

  const data = await apiFetch<UsuarioDTO>("/usuarios", {
    method: "POST",
    body: JSON.stringify(mapUsuarioToPayload(usuario)),
  });

  return mapUsuarioDtoToUsuario(data);
}

export async function updateUsuario(
  id: string,
  usuario: Partial<Usuario>,
): Promise<Usuario> {
  const data = await apiFetch<UsuarioDTO>(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapUsuarioToPayload(usuario)),
  });

  return mapUsuarioDtoToUsuario(data);
}

export async function trocarSenhaUsuario(
  payload: TrocarSenhaPayload,
): Promise<void> {
  await apiFetch<void>("/usuarios/trocar-senha", {
    method: "POST",
    body: JSON.stringify({
      senhaAtual: payload.senhaAtual,
      novaSenha: payload.novaSenha,
    }),
  });
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

  if (!/[a-z]/.test(pw)) {
    return "A senha deve conter pelo menos 1 letra minúscula.";
  }

  if (!/[A-Z]/.test(pw)) {
    return "A senha deve conter pelo menos 1 letra maiúscula.";
  }

  if (!/\d/.test(pw)) {
    return "A senha deve conter pelo menos 1 número.";
  }

  if (!/[^A-Za-z0-9]/.test(pw)) {
    return "A senha deve conter pelo menos 1 caractere especial.";
  }

  return null;
}

/* ===========================
   PERMISSÕES
   =========================== */

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
  | "HABILITACOES_PROPOSTAS"
  | "RESULTADO_PROPOSTA"
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
  METAS_PROJETO: "Metas do projeto",
  CRONOGRAMA: "Cronograma",
  ATIVIDADES: "Atividades",
  TURMAS: "Turmas",
  PRESENCAS: "Presenças",
  EDITAIS: "Editais",
  PROPOSTAS_EDITAL: "Propostas de edital",
  EQUIPE_EDITAL: "Equipe do edital",
  HABILITACOES_PROPOSTAS: "Habilitações de propostas",
  RESULTADO_PROPOSTA: "Resultado da Proposta",
  HABILITACAO: "Habilitação",
  EVENTOS_CULTURAIS: "Eventos culturais",
  ACOES_DIVULGACAO: "Ações de divulgação",
  PLANO_COMUNICACAO: "Plano de comunicação",
  EVIDENCIAS: "Evidências",
  PLANEJAMENTO_FINANCEIRO: "Planejamento financeiro",
  FINANCEIRO: "Financeiro",
  PRESTACAO_CONTAS: "Prestação de contas",
  PRESTACAO_METAS: "Prestação de metas",
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
  {
    title: "Visão geral",
    modulos: ["DASHBOARD"],
  },
  {
    title: "Organização",
    modulos: ["ORGANIZACAO", "DIRETORIA", "DOCUMENTOS"],
  },
  {
    title: "Pessoas",
    modulos: [
      "AGENTES_CULTURAIS",
      "COLABORADORES",
      "INTEGRANTES",
      "PARTICIPANTES",
    ],
  },
  {
    title: "Projetos e execução",
    modulos: [
      "PROJETOS",
      "METAS_PROJETO",
      "CRONOGRAMA",
      "ATIVIDADES",
      "TURMAS",
      "PRESENCAS",
    ],
  },
  {
    title: "Editais",
    modulos: [
      "EDITAIS",
      "PROPOSTAS_EDITAL",
      "RESULTADO_PROPOSTA",
      "EQUIPE_EDITAL",
      "HABILITACOES_PROPOSTAS",
      "HABILITACAO",
    ],
  },
  {
    title: "Ações culturais",
    modulos: [
      "EVENTOS_CULTURAIS",
      "ACOES_DIVULGACAO",
      "PLANO_COMUNICACAO",
      "EVIDENCIAS",
    ],
  },
  {
    title: "Financeiro",
    modulos: ["PLANEJAMENTO_FINANCEIRO", "FINANCEIRO"],
  },
  {
    title: "Prestação de contas",
    modulos: ["PRESTACAO_CONTAS", "PRESTACAO_METAS"],
  },
  {
    title: "Patrimônio",
    modulos: ["PATRIMONIO", "EMPRESTIMOS"],
  },
  {
    title: "Trajetórias",
    modulos: ["CURRICULOS", "TRAJETORIAS_CULTURAIS"],
  },
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

  return (data ?? []).map(mapPermissaoDtoToPermissao);
}

export async function savePermissoes(
  usuarioId: string,
  perms: UsuarioPermissao[],
): Promise<UsuarioPermissao[]> {
  const payload: UsuarioPermissoesUpdateDTO = {
    usuarioId: Number(usuarioId),
    permissoes: perms.map((p) => ({
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

  return (data ?? []).map(mapPermissaoDtoToPermissao);
}
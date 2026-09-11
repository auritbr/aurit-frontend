import { apiFetch } from "@/lib/api";
import { LIMITE_USUARIOS_PLANO_GRATUITO } from "@/lib/plano";

export type UserRole = "USER" | "ADMIN" | "ADMIN_PROPRIETARIO";
export type StatusUsuario = "ATIVO" | "INATIVO";

export interface Usuario {
  id: string;
  name: string;
  login: string;
  email?: string | null;
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
  email?: string | null;
  password?: string | null;
  userRole: UserRole;
  statusUsuario: StatusUsuario;
  configuracaoEmpresaId?: number | null;
}

interface UsuarioStorage {
  id?: number;
  name?: string;
  login?: string;
  email?: string | null;
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
    email: dto.email ?? null,
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
    email: usuario.email?.trim().toLowerCase() || undefined,
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
      ? LIMITE_USUARIOS_PLANO_GRATUITO
      : (configuracao.limiteUsuarios ?? null);

  if (!limite) return;

  const usuarios = await getUsuarios();

  const totalDaEmpresa = usuarios.filter(
    (u) => Number(u.configuracaoEmpresaId) === Number(configuracaoEmpresaId),
  ).length;

  if (totalDaEmpresa >= limite) {
    if (configuracao.tipoPlano === "PLANO_GRATUITO") {
      throw new Error(
        `O plano gratuito permite no máximo ${LIMITE_USUARIOS_PLANO_GRATUITO} usuários. Para cadastrar mais usuários, atualize para o plano pago.`,
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

export async function createUsuario(
  usuario: Partial<Usuario>,
): Promise<Usuario> {
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
  if (!/[a-z]/.test(pw))
    return "A senha deve conter pelo menos 1 letra minúscula.";
  if (!/[A-Z]/.test(pw))
    return "A senha deve conter pelo menos 1 letra maiúscula.";
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
  | "CONFIGURACOES"
  | "CENTRAL_CLIENTE";

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
  PLANOS_AULA: "Planos de aula",
  PRESENCAS: "Presenças",
  EDITAIS: "Editais",
  PROPOSTAS_EDITAL: "Propostas de edital",
  EQUIPE_EDITAL: "Equipe da proposta",
  RESULTADO_PROPOSTA: "Resultado da proposta",
  HABILITACAO: "Habilitação",
  EVENTOS_CULTURAIS: "Eventos culturais",
  ACOES_DIVULGACAO: "Ações de divulgação",
  PLANO_COMUNICACAO: "Plano de comunicação",
  EVIDENCIAS: "Evidências",
  PLANEJAMENTO_FINANCEIRO: "Planejamento financeiro",
  FINANCEIRO: "Lançamentos financeiros",
  PAINEL_FINANCEIRO: "Painel financeiro",
  CONTAS_BANCARIAS: "Contas bancárias",
  CONTAS_PAGAR: "Contas a pagar",
  CONTAS_RECEBER: "Contas a receber",
  TRANSFERENCIAS_BANCARIAS: "Transferências bancárias",
  MOVIMENTACOES_BANCARIAS: "Movimentações bancárias",
  CONCILIACOES_BANCARIAS: "Conciliação bancária",
  FLUXO_CAIXA: "Fluxo de caixa",
  DOACOES: "Doações",
  DOADORES: "Doadores",
  FORNECEDORES: "Fornecedores",
  PARCEIROS: "Parceiros",
  PRESTACAO_CONTAS: "Prestação de contas",
  PRESTACAO_METAS: "Cumprimento de metas",
  PATRIMONIO: "Patrimônio",
  EMPRESTIMOS: "Empréstimos",
  CURRICULOS: "Currículos",
  TRAJETORIAS_CULTURAIS: "Trajetórias culturais",
  RELATORIOS: "Relatórios",
  USUARIOS: "Usuários",
  CONFIGURACOES: "Configurações",
  CENTRAL_CLIENTE: "Central do Cliente",
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
      "PLANOS_AULA",
      "PRESENCAS",
    ],
  },
  {
    title: "Editais",
    modulos: [
      "EDITAIS",
      "PROPOSTAS_EDITAL",
      "EQUIPE_EDITAL",
      "RESULTADO_PROPOSTA",
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
    modulos: [
      "PLANEJAMENTO_FINANCEIRO",
      "PAINEL_FINANCEIRO",
      "FINANCEIRO",
      "CONTAS_BANCARIAS",
      "CONTAS_PAGAR",
      "CONTAS_RECEBER",
      "TRANSFERENCIAS_BANCARIAS",
      "MOVIMENTACOES_BANCARIAS",
      "CONCILIACOES_BANCARIAS",
      "FLUXO_CAIXA",
      "DOACOES",
      "DOADORES",
      "FORNECEDORES",
      "PARCEIROS",
    ],
  },
  {
    title: "Prestação de contas",
    modulos: ["PRESTACAO_CONTAS", "PRESTACAO_METAS"],
  },
  { title: "Patrimônio", modulos: ["PATRIMONIO", "EMPRESTIMOS"] },
  { title: "Trajetórias", modulos: ["CURRICULOS", "TRAJETORIAS_CULTURAIS"] },
  {
    title: "Relatórios e configurações",
    modulos: ["RELATORIOS", "USUARIOS", "CONFIGURACOES", "CENTRAL_CLIENTE"],
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

function mapPermissaoDtoToPermissao(
  dto: UsuarioPermissaoDTO,
): UsuarioPermissao {
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

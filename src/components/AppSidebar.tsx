import {
  LayoutDashboard,
  Home,
  Settings,
  Building2,
  Wallet,
  Package,
  ChevronRight,
  Briefcase,
  HeartHandshake,
  Archive,
  FileBarChart2,
  Route,
  Sparkles,
  Landmark,
  PlayCircle,
  FileSignature,
  FileCheck2,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { AuritLogo } from "@/components/AuritLogo";
import { useState, useEffect, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type TipoPlano = "PLANO_GRATUITO" | "PLANO_PAGO" | string;

type SubItem = {
  title: string;
  url: string;
  paidOnly?: boolean;
};

type MenuGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: SubItem[];
  paidOnly?: boolean;
  ownerOnly?: boolean;
};

type DirectItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  url: string;
  paidOnly?: boolean;
};

interface UsuarioLogadoStorage {
  id?: number;
  name?: string;
  login?: string;
  userRole?: string;
  statusUsuario?: string;
  configuracaoEmpresaId?: number | string | null;
}

interface ConfiguracaoEmpresaDTO {
  id?: number;
  tipoPlano?: TipoPlano | null;
}

const directInicio: DirectItem = {
  id: "inicio",
  title: "Início",
  icon: Home,
  url: "/",
};

const directDashboard: DirectItem = {
  id: "dashboard",
  title: "Dashboard",
  icon: LayoutDashboard,
  url: "/dashboard",
};

const groups: MenuGroup[] = [
  {
    id: "institucional",
    title: "Institucional",
    icon: Landmark,
    items: [
      { title: "Dados da Organização", url: "/organizacoes" },
      { title: "Diretoria", url: "/diretoria" },
      { title: "Documentos", url: "/documentos", paidOnly: true },
      { title: "Agentes Culturais", url: "/agentes" },
    ],
  },
  {
    id: "pessoas",
    title: "Pessoas",
    icon: HeartHandshake,
    items: [
      { title: "Colaboradores", url: "/colaboradores" },
      { title: "Integrantes", url: "/integrantes" },
      { title: "Participantes", url: "/participantes" },
    ],
  },
  {
    id: "trajetorias",
    title: "Trajetórias",
    icon: Route,
    paidOnly: true,
    items: [
      { title: "Currículos", url: "/curriculos" },
      { title: "Trajetórias Culturais", url: "/trajetorias-culturais" },
    ],
  },
  {
    id: "projetos",
    title: "Projetos",
    icon: Briefcase,
    items: [
      { title: "Projetos", url: "/projetos" },
      { title: "Metas do Projeto", url: "/metas-projeto", paidOnly: true },
      { title: "Cronograma do Projeto", url: "/cronograma" },
    ],
  },
  {
    id: "execucao",
    title: "Execução",
    icon: PlayCircle,
    items: [
      { title: "Atividades", url: "/atividades" },
      { title: "Turmas", url: "/turmas" },
      { title: "Presenças", url: "/presencas" },
    ],
  },
  {
    id: "acoes-culturais",
    title: "Ações Culturais",
    icon: Sparkles,
    items: [
      { title: "Eventos Culturais", url: "/eventos-culturais" },
      { title: "Ações de Divulgação", url: "/acoes-divulgacao" },
      {
        title: "Execução da Divulgação",
        url: "/plano-comunicacao",
        paidOnly: true,
      },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    paidOnly: true,
    items: [{ title: "Controle Financeiro", url: "/financeiro" }],
  },
  {
    id: "editais",
    title: "Editais",
    icon: FileSignature,
    paidOnly: true,
    items: [
      { title: "Editais", url: "/editais" },
      { title: "Propostas de Edital", url: "/propostas-edital" },
      { title: "Equipe da Proposta", url: "/equipe-edital" },
      { title: "Orçamento da Proposta", url: "/planejamento-financeiro" },
      { title: "Resultado da Proposta", url: "/resultados-propostas" },
      { title: "Habilitação Documental", url: "/habilitacoes-propostas" },
    ],
  },
  {
    id: "evidencias",
    title: "Evidências",
    icon: FileCheck2,
    paidOnly: true,
    items: [{ title: "Evidências de Execução", url: "/evidencias" }],
  },
  {
    id: "prestacao-contas",
    title: "Prestação de Contas",
    icon: ClipboardCheck,
    paidOnly: true,
    items: [
      { title: "Prestação de Contas", url: "/prestacao-contas" },
      { title: "Cumprimento de Metas", url: "/prestacao-metas" },
    ],
  },
  {
    id: "patrimonio",
    title: "Patrimônio",
    icon: Package,
    paidOnly: true,
    items: [
      { title: "Patrimônio", url: "/patrimonio" },
      { title: "Empréstimos", url: "/emprestimos" },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: FileBarChart2,
    paidOnly: true,
    items: [{ title: "Relatórios", url: "/relatorios" }],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    items: [{ title: "Usuários", url: "/usuarios" }],
  },
  {
    id: "admin-plataforma",
    title: "Admin Plataforma",
    icon: Archive,
    ownerOnly: true,
    items: [
      {
        title: "Controle de Empresas",
        url: "/controle-proprietario/empresas",
      },
      {
        title: "Configuração da Empresa",
        url: "/configuracoes/empresa",
      },
    ],
  },
];

function getStoredToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

function getAuthHeaders() {
  const token = getStoredToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getUsuarioLogadoStorage(): UsuarioLogadoStorage | null {
  const raw =
    localStorage.getItem("usuarioLogado") ||
    sessionStorage.getItem("usuarioLogado");

  if (!raw) return null;

  try {
    return JSON.parse(raw) as UsuarioLogadoStorage;
  } catch {
    return null;
  }
}

async function getTipoPlanoAtual(): Promise<TipoPlano | null> {
  const usuario = getUsuarioLogadoStorage();

  const configuracaoEmpresaId =
    usuario?.configuracaoEmpresaId != null
      ? String(usuario.configuracaoEmpresaId)
      : "";

  const response = await fetch(`${API_URL}/configuracoes-empresa`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const data: ConfiguracaoEmpresaDTO[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  if (configuracaoEmpresaId) {
    const found = data.find(
      (item) => String(item.id) === configuracaoEmpresaId,
    );

    if (found?.tipoPlano) {
      return found.tipoPlano;
    }
  }

  return data[0]?.tipoPlano ?? null;
}

function getVisibleGroups(
  allGroups: MenuGroup[],
  isFreePlan: boolean,
  isOwner: boolean,
) {
  return allGroups
    .filter((group) => {
      if (group.ownerOnly && !isOwner) return false;
      if (isFreePlan && group.paidOnly) return false;

      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isFreePlan && item.paidOnly) return false;

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const [tipoPlano, setTipoPlano] = useState<TipoPlano | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);

  const usuarioLogado = getUsuarioLogadoStorage();
  const isOwner = usuarioLogado?.userRole === "ADMIN_PROPRIETARIO";

  const isFreePlan = planLoaded && tipoPlano === "PLANO_GRATUITO";

  const visibleGroups = useMemo(
    () => getVisibleGroups(groups, isFreePlan, isOwner),
    [isFreePlan, isOwner],
  );

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const groupHasActive = (group: MenuGroup) =>
    group.items.some((item) => isActive(item.url));

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function carregarPlano() {
      try {
        const plano = await getTipoPlanoAtual();

        if (!active) return;

        setTipoPlano(plano);
      } catch {
        if (!active) return;

        setTipoPlano(null);
      } finally {
        if (active) {
          setPlanLoaded(true);
        }
      }
    }

    void carregarPlano();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };

      visibleGroups.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = groupHasActive(group);
        }

        if (groupHasActive(group)) {
          next[group.id] = true;
        }
      });

      return next;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups.length, location.pathname]);

  const toggle = (id: string) =>
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
<SidebarHeader className="border-b border-sidebar-border px-4 py-4">
  <div className="flex items-center justify-center">
    <AuritLogo size="md" withBackground={false} />
  </div>
</SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] font-semibold uppercase tracking-wider px-3">
              Menu
            </SidebarGroupLabel>
          )}

          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 mt-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-9">
                  <NavLink
                    to={directInicio.url}
                    end
                    className={() =>
                      `flex items-center gap-2.5 rounded px-3 transition-colors text-sm ${isActive(directInicio.url)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-2 border-transparent"
                      }`
                    }
                  >
                    <directInicio.icon
                      className="h-4 w-4 flex-shrink-0"
                      strokeWidth={2}
                    />

                    {!collapsed && <span>{directInicio.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-9">
                  <NavLink
                    to={directDashboard.url}
                    className={() =>
                      `flex items-center gap-2.5 rounded px-3 transition-colors text-sm ${isActive(directDashboard.url)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-2 border-transparent"
                      }`
                    }
                  >
                    <directDashboard.icon
                      className="h-4 w-4 flex-shrink-0"
                      strokeWidth={2}
                    />

                    {!collapsed && <span>{directDashboard.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {visibleGroups.map((group) => {
                const open = openMap[group.id];
                const activeInGroup = groupHasActive(group);

                if (collapsed) {
                  return (
                    <SidebarMenuItem key={group.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild className="h-9">
                            <NavLink
                              to={group.items[0].url}
                              className={() =>
                                `flex items-center justify-center rounded px-3 transition-colors ${activeInGroup
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 border-l-2 border-transparent"
                                }`
                              }
                            >
                              <group.icon
                                className="h-4 w-4 flex-shrink-0"
                                strokeWidth={2}
                              />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>

                        <TooltipContent side="right">
                          {group.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={group.id}>
                    <Collapsible
                      open={!!open}
                      onOpenChange={() => toggle(group.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={`group/trigger flex w-full items-center gap-2.5 rounded px-3 h-9 text-sm transition-colors border-l-2 ${activeInGroup
                            ? "bg-sidebar-accent/40 text-sidebar-accent-foreground border-sidebar-primary/60"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                            }`}
                        >
                          <group.icon
                            className="h-4 w-4 flex-shrink-0"
                            strokeWidth={2}
                          />

                          <span className="flex-1 text-left">
                            {group.title}
                          </span>

                          <ChevronRight
                            className={`h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform duration-200 ${open ? "rotate-90" : ""
                              }`}
                            strokeWidth={2.2}
                          />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <ul className="mt-0.5 ml-[22px] border-l border-sidebar-border/60 pl-2 flex flex-col gap-0.5 py-1">
                          {group.items.map((sub) => (
                            <li key={sub.url}>
                              <NavLink
                                to={sub.url}
                                className={() =>
                                  `flex items-center rounded px-2.5 h-8 text-[13px] transition-colors ${isActive(sub.url)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                                  }`
                                }
                              >
                                {sub.title}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
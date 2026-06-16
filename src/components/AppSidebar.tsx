import {
  LayoutDashboard,
  Home,
  Settings,
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
  LifeBuoy,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { AuritLogo } from "@/components/AuritLogo";
import { useState, useEffect, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import { type TipoPlano } from "@/lib/plano";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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

type Section = {
  id: string;
  directs?: DirectItem[];
  groups?: MenuGroup[];
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

const sections: Section[] = [
  {
    id: "visao-geral",
    directs: [
      {
        id: "inicio",
        title: "Início",
        icon: Home,
        url: "/",
      },
      {
        id: "dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
        url: "/dashboard",
      },
    ],
  },
  {
    id: "organizacao-equipe",
    groups: [
      {
        id: "institucional",
        title: "Institucional",
        icon: Landmark,
        items: [
          { title: "Dados Institucionais", url: "/organizacoes" },
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
    ],
  },
  {
    id: "projetos-execucao",
    groups: [
      {
        id: "projetos",
        title: "Projetos",
        icon: Briefcase,
        items: [
          { title: "Projetos", url: "/projetos" },
          { title: "Metas do Projeto", url: "/metas-projeto", paidOnly: true },
          { title: "Cronograma do Projeto", url: "/cronograma", paidOnly: true },
        ],
      },
      {
        id: "execucao",
        title: "Execução",
        icon: PlayCircle,
        items: [
          { title: "Atividades", url: "/atividades" },
          { title: "Plano de Aula", url: "/planos-aula", paidOnly: true },
          { title: "Turmas", url: "/turmas" },
          { title: "Presenças", url: "/presencas" },
        ],
      },
      {
        id: "acoes-culturais",
        title: "Ações Culturais",
        icon: Sparkles,
        items: [{ title: "Eventos Culturais", url: "/eventos-culturais" }],
      },
      {
        id: "evidencias",
        title: "Evidências",
        icon: FileCheck2,
        paidOnly: true,
        items: [{ title: "Evidências de Execução", url: "/evidencias" }],
      },
    ],
  },
  {
    id: "editais",
    groups: [
      {
        id: "editais",
        title: "Editais",
        icon: FileSignature,
        paidOnly: true,
        items: [
          { title: "Editais", url: "/editais" },
          { title: "Propostas de Edital", url: "/propostas-edital" },
          { title: "Equipe da Proposta", url: "/equipe-edital" },
          { title: "Plano de Comunicação", url: "/plano-comunicacao" },
          { title: "Ações de Divulgação", url: "/acoes-divulgacao" },
          { title: "Aplicação de Recursos", url: "/aplicacao-de-recursos" },
          { title: "Resultado da Proposta", url: "/resultados-propostas" },
          { title: "Habilitação Documental", url: "/habilitacoes-propostas" },
        ],
      },
    ],
  },
  {
    id: "financeiro-prestacao",
    groups: [
      {
        id: "financeiro",
        title: "Financeiro",
        icon: Wallet,
        paidOnly: true,
        items: [{ title: "Controle Financeiro", url: "/financeiro" }],
      },
      {
        id: "prestacao-contas",
        title: "Prestação de Contas",
        icon: ClipboardCheck,
        paidOnly: true,
        items: [
          { title: "Cumprimento de Metas", url: "/prestacao-metas" },
          { title: "Prestação de Contas", url: "/prestacao-contas" },
        ],
      },
    ],
  },
  {
    id: "patrimonio-trajetorias",
    groups: [
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
    ],
  },
  {
    id: "relatorios",
    groups: [
      {
        id: "relatorios",
        title: "Relatórios",
        icon: FileBarChart2,
        items: [
          { title: "Relatórios", url: "/relatorios" },
          {
            title: "Relatório Sociodemográfico",
            url: "/relatorios/indicadores-sociodemograficos",
          },
          { title: "Relatório de Presenças", url: "/relatorios/presencas" },
        ],
      },
    ],
  },
  {
    id: "administracao",
    groups: [
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

function getVisibleSections(
  allSections: Section[],
  isFreePlan: boolean,
  isOwner: boolean,
): Section[] {
  return allSections
    .map((section) => {
      const directs =
        section.directs?.filter((direct) => {
          if (isFreePlan && direct.paidOnly) return false;
          return true;
        }) ?? [];

      const groups =
        section.groups
          ?.filter((group) => {
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
          .filter((group) => group.items.length > 0) ?? [];

      return {
        ...section,
        directs,
        groups,
      };
    })
    .filter(
      (section) =>
        (section.directs && section.directs.length > 0) ||
        (section.groups && section.groups.length > 0),
    );
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

  const visibleSections = useMemo(
    () => getVisibleSections(sections, isFreePlan, isOwner),
    [isFreePlan, isOwner],
  );

  const visibleGroups = useMemo(
    () => visibleSections.flatMap((section) => section.groups ?? []),
    [visibleSections],
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

  const renderDirect = (direct: DirectItem) => {
    const active = isActive(direct.url);

    const content = (
      <NavLink
        to={direct.url}
        end={direct.url === "/"}
        className={() =>
          `group/item flex items-center ${collapsed ? "justify-center" : "gap-3"
          } rounded-lg ${collapsed ? "h-9 w-9 mx-auto" : "h-9 px-2.5"
          } text-[13px] transition-all duration-150 ${active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm shadow-black/20"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          }`
        }
      >
        <direct.icon
          className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/65 group-hover/item:text-sidebar-foreground"
            }`}
          strokeWidth={1.85}
        />

        {!collapsed && <span className="truncate">{direct.title}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <SidebarMenuItem key={direct.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild className="h-9 p-0">
                {content}
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">{direct.title}</TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={direct.id}>
        <SidebarMenuButton asChild className="h-9 p-0">
          {content}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (group: MenuGroup) => {
    const open = openMap[group.id];
    const activeInGroup = groupHasActive(group);

    if (collapsed) {
      return (
        <SidebarMenuItem key={group.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild className="h-9 p-0">
                <NavLink
                  to={group.items[0].url}
                  className={() =>
                    `flex h-9 w-9 mx-auto items-center justify-center rounded-lg transition-all ${activeInGroup
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/20"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50"
                    }`
                  }
                >
                  <group.icon
                    className={`h-[16px] w-[16px] ${activeInGroup
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/60"
                      }`}
                    strokeWidth={1.85}
                  />
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">{group.title}</TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={group.id}>
        <Collapsible open={!!open} onOpenChange={() => toggle(group.id)}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={`group/trigger flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] transition-all duration-150 ${activeInGroup
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                }`}
            >
              <group.icon
                className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${activeInGroup
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 group-hover/trigger:text-sidebar-foreground/90"
                  }`}
                strokeWidth={1.85}
              />

              <span
                className={`flex-1 truncate text-left ${activeInGroup ? "font-medium" : "font-normal"
                  }`}
              >
                {group.title}
              </span>

              <ChevronRight
                className={`h-3 w-3 text-sidebar-foreground/35 transition-transform duration-200 ${open ? "rotate-90 text-sidebar-foreground/55" : ""
                  }`}
                strokeWidth={2}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <ul className="relative ml-[18px] mt-0.5 flex flex-col gap-px py-1 pl-3 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-border/50">
              {group.items.map((sub) => {
                const active = isActive(sub.url);

                return (
                  <li key={sub.url}>
                    <NavLink
                      to={sub.url}
                      className={() =>
                        `relative flex h-7 items-center rounded-md px-2.5 text-[12.5px] transition-colors ${active
                          ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium before:absolute before:-left-3 before:top-1/2 before:h-3.5 before:w-px before:-translate-y-1/2 before:bg-sidebar-primary"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <span className="truncate">{sub.title}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      <SidebarHeader className="px-4 pt-5 pb-4">
        <div className="flex w-full items-center justify-center">
          <AuritLogo size="md" withBackground={false} />
        </div>

        {!collapsed && (
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
        )}
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll px-2 py-2">
        {visibleSections.map((section, index) => (
          <SidebarGroup
            key={section.id}
            className={index === 0 ? "pt-1" : "pt-2"}
          >
            {collapsed && index > 0 && (
              <div className="mx-3 my-2 h-px bg-sidebar-border/40" />
            )}

            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                {section.directs?.map(renderDirect)}
                {section.groups?.map(renderGroup)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              >
                <LifeBuoy className="h-[16px] w-[16px]" strokeWidth={1.85} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Suporte Aurit</TooltipContent>
          </Tooltip>
        ) : (
          <div className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/25 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
                <LifeBuoy className="h-[14px] w-[14px]" strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-tight text-sidebar-accent-foreground">
                  Precisa de ajuda?
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-sidebar-foreground/55">
                  Acesse a wiki ou fale com o suporte.
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

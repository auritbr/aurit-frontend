import {
  House,
  FilePenLine,
  CircleDollarSign,
  ReceiptText,
  ChevronRight,
  Warehouse,
  Gauge,
  ChartNoAxesCombined,
  SlidersHorizontal,
  UserRoundCog,
  Building2,
  FolderKanban,
  Activity,
  ShieldCheck,
  BadgeCheck,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { AuritLogo } from "@/components/AuritLogo";

import {
  SidebarSearch,
  highlightMenuTitle,
  normalizeMenuTerm,
} from "@/components/SidebarSearch";

import { type TipoPlano } from "@/lib/plano";

import { usuarioTemPermissao, type ModuloPermissao } from "@/lib/permissoes";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/* ============================================================
   PERMISSÕES
   ============================================================ */

const PERMISSAO_POR_ROTA: Record<string, ModuloPermissao> = {
  "/": "DASHBOARD",
  "/dashboard": "DASHBOARD",

  "/organizacoes": "ORGANIZACAO",
  "/diretoria": "DIRETORIA",
  "/documentos": "DOCUMENTOS",
  "/modelos-documento": "DOCUMENTOS",
  "/agentes": "AGENTES_CULTURAIS",

  "/colaboradores": "COLABORADORES",
  "/integrantes": "INTEGRANTES",
  "/participantes": "PARTICIPANTES",

  "/curriculos": "CURRICULOS",
  "/trajetorias-culturais": "TRAJETORIAS_CULTURAIS",

  "/projetos": "PROJETOS",
  "/metas-projeto": "METAS_PROJETO",
  "/cronograma": "CRONOGRAMA",

  "/atividades": "ATIVIDADES",
  "/turmas": "TURMAS",
  "/planos-aula": "PLANOS_AULA",
  "/presencas": "PRESENCAS",
  "/eventos-culturais": "EVENTOS_CULTURAIS",

  "/evidencias": "EVIDENCIAS",

  "/editais": "EDITAIS",
  "/propostas-edital": "PROPOSTAS_EDITAL",
  "/equipe-edital": "EQUIPE_EDITAL",
  "/plano-comunicacao": "PLANO_COMUNICACAO",
  "/acoes-divulgacao": "ACOES_DIVULGACAO",
  "/aplicacao-de-recursos": "PLANEJAMENTO_FINANCEIRO",
  "/resultados-propostas": "RESULTADO_PROPOSTA",
  "/habilitacoes-propostas": "HABILITACAO",

  "/financeiro": "FINANCEIRO",
  "/painel-financeiro": "PAINEL_FINANCEIRO",
  "/contas-bancarias": "CONTAS_BANCARIAS",
  "/contas-pagar": "CONTAS_PAGAR",
  "/contas-receber": "CONTAS_RECEBER",
  "/doadores": "DOADORES",
  "/doacoes": "DOACOES",
  "/fornecedores": "FORNECEDORES",
  "/parceiros": "PARCEIROS",
  "/transferencias-bancarias": "TRANSFERENCIAS_BANCARIAS",
  "/movimentacoes-bancarias": "MOVIMENTACOES_BANCARIAS",
  "/conciliacao-bancaria": "CONCILIACOES_BANCARIAS",
  "/fluxo-caixa": "FLUXO_CAIXA",

  "/prestacao-metas": "PRESTACAO_METAS",
  "/prestacao-contas": "PRESTACAO_CONTAS",

  "/patrimonio": "PATRIMONIO",
  "/emprestimos": "EMPRESTIMOS",

  "/relatorios": "RELATORIOS",

  "/usuarios": "USUARIOS",
  "/configuracoes/central-do-cliente": "CENTRAL_CLIENTE",
  "/alertas-email": "CONFIGURACOES",
  "/configuracoes/notificacoes": "CONFIGURACOES",
};

/* ============================================================
   TIPOS
   ============================================================ */

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

interface PlanoAtualDTO {
  tipoPlano?: TipoPlano | null;
}

/* ============================================================
   MENU
   ============================================================ */

const sections: Section[] = [
  {
    id: "visao-geral",
    directs: [
      {
        id: "inicio",
        title: "Início",
        icon: House,
        url: "/",
      },
      {
        id: "dashboard",
        title: "Dashboard",
        icon: Gauge,
        url: "/dashboard",
      },
    ],
  },

  {
    id: "institucional-pessoas",
    groups: [
      {
        id: "institucional",
        title: "Institucional",
        icon: Building2,
        items: [
          { title: "Dados Institucionais", url: "/organizacoes" },
          { title: "Diretoria", url: "/diretoria" },
          { title: "Documentos", url: "/documentos", paidOnly: true },
          { title: "Agentes Culturais", url: "/agentes" },
        ],
      },

      {
        id: "pessoas-trajetorias",
        title: "Pessoas e Trajetórias",
        icon: UserRoundCog,
        items: [
          { title: "Colaboradores", url: "/colaboradores" },
          { title: "Integrantes", url: "/integrantes" },
          { title: "Participantes", url: "/participantes" },
          { title: "Currículos", url: "/curriculos", paidOnly: true },
          {
            title: "Trajetórias Culturais",
            url: "/trajetorias-culturais",
            paidOnly: true,
          },
        ],
      },
    ],
  },

  {
    id: "projetos-execucao",
    groups: [
      {
        id: "projetos-planejamento",
        title: "Projetos e Planejamento",
        icon: FolderKanban,
        items: [
          { title: "Projetos", url: "/projetos" },
          {
            title: "Metas do Projeto",
            url: "/metas-projeto",
            paidOnly: true,
          },
          {
            title: "Cronograma do Projeto",
            url: "/cronograma",
            paidOnly: true,
          },
        ],
      },

      {
        id: "execucao",
        title: "Execução",
        icon: Activity,
        items: [
          { title: "Atividades", url: "/atividades" },
          { title: "Turmas", url: "/turmas" },
          {
            title: "Plano de Aula",
            url: "/planos-aula",
            paidOnly: true,
          },
          { title: "Presenças", url: "/presencas" },
          {
            title: "Eventos Culturais",
            url: "/eventos-culturais",
          },
        ],
      },

      {
        id: "evidencias",
        title: "Evidências",
        icon: BadgeCheck,
        paidOnly: true,
        items: [
          {
            title: "Evidências",
            url: "/evidencias",
          },
        ],
      },
    ],
  },

  {
    id: "editais",
    groups: [
      {
        id: "editais-propostas",
        title: "Editais e Propostas",
        icon: FilePenLine,
        paidOnly: true,
        items: [
          { title: "Editais", url: "/editais" },
          { title: "Propostas de Edital", url: "/propostas-edital" },
          { title: "Equipe da Proposta", url: "/equipe-edital" },
          {
            title: "Plano de Comunicação",
            url: "/plano-comunicacao",
          },
          {
            title: "Ações de Divulgação",
            url: "/acoes-divulgacao",
          },
          {
            title: "Aplicação de Recursos",
            url: "/aplicacao-de-recursos",
          },
          {
            title: "Habilitação Documental",
            url: "/habilitacoes-propostas",
          },
          {
            title: "Resultado da Proposta",
            url: "/resultados-propostas",
          },
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
        icon: CircleDollarSign,
        paidOnly: true,
        items: [
          {
            title: "Painel Financeiro",
            url: "/painel-financeiro",
          },
          {
            title: "Controle Financeiro",
            url: "/financeiro",
          },
          {
            title: "Contas Bancárias",
            url: "/contas-bancarias",
          },

          {
            title: "Fornecedores",
            url: "/fornecedores",
          },
          {
            title: "Doadores",
            url: "/doadores",
          },
          {
            title: "Parceiros",
            url: "/parceiros",
          },

          {
            title: "Contas a Pagar",
            url: "/contas-pagar",
          },
          {
            title: "Contas a Receber",
            url: "/contas-receber",
          },
          {
            title: "Doações",
            url: "/doacoes",
          },

          {
            title: "Transferências Bancárias",
            url: "/transferencias-bancarias",
          },
          {
            title: "Movimentações Bancárias",
            url: "/movimentacoes-bancarias",
          },
          {
            title: "Conciliação Bancária",
            url: "/conciliacao-bancaria",
          },
          {
            title: "Fluxo de Caixa",
            url: "/fluxo-caixa",
          },
        ],
      },

      {
        id: "prestacao-contas",
        title: "Prestação de Contas",
        icon: ReceiptText,
        paidOnly: true,
        items: [
          {
            title: "Cumprimento de Metas",
            url: "/prestacao-metas",
          },
          {
            title: "Prestação de Contas",
            url: "/prestacao-contas",
          },
        ],
      },
    ],
  },

  {
    id: "patrimonio",
    groups: [
      {
        id: "patrimonio",
        title: "Patrimônio",
        icon: Warehouse,
        paidOnly: true,
        items: [
          { title: "Patrimônios", url: "/patrimonio" },
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
        icon: ChartNoAxesCombined,
        items: [
          {
            title: "Central de Relatórios",
            url: "/relatorios",
          },
          {
            title: "Sociodemográfico",
            url: "/relatorios/indicadores-sociodemograficos",
          },
          {
            title: "Presenças",
            url: "/relatorios/presencas",
          },
          {
            title: "Participação",
            url: "/relatorios/participantes",
          },
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
        icon: SlidersHorizontal,
        items: [
          {
            title: "Central do Cliente",
            url: "/configuracoes/central-do-cliente",
          },
          { title: "Usuários", url: "/usuarios" },
          {
            title: "Alertas por e-mail",
            url: "/alertas-email",
          },
          {
            title: "Notificações",
            url: "/configuracoes/notificacoes",
          },
          {
            title: "Layouts de impressão",
            url: "/modelos-documento",
            paidOnly: true,
          },
        ],
      },

      {
        id: "admin-plataforma",
        title: "Admin Plataforma",
        icon: ShieldCheck,
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

/* ============================================================
   AUTENTICAÇÃO / PLANO
   ============================================================ */

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
  const response = await fetch(`${API_URL}/configuracoes-empresa/me/plano`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PlanoAtualDTO;
  return data?.tipoPlano ?? null;
}

/* ============================================================
   FILTRO DE PLANO/PERMISSÃO
   ============================================================ */

function getVisibleSections(
  allSections: Section[],
  isFreePlan: boolean,
  isOwner: boolean,
  permissoes: Partial<Record<ModuloPermissao, boolean>>,
  permissionsLoaded: boolean,
): Section[] {
  return allSections
    .map((section) => {
      const directs =
        section.directs?.filter((direct) => {
          if (isFreePlan && direct.paidOnly) return false;

          const modulo = PERMISSAO_POR_ROTA[direct.url];

          if (permissionsLoaded && modulo && permissoes[modulo] !== true) {
            return false;
          }

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

              const modulo = PERMISSAO_POR_ROTA[item.url];

              if (permissionsLoaded && modulo && permissoes[modulo] !== true) {
                return false;
              }

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

/* ============================================================
   ESTILIZAÇÃO EXATA DO LOVABLE
   ============================================================ */

/** Cápsula de ícone usada no estado recolhido. */
const collapsedIconBox =
  "sb-item relative z-10 flex h-9 w-9 pointer-events-auto items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70";

/** Linha padrão da lista (ERP): altura consistente, ícone à esquerda, texto completo. */
const rowBase =
  "sb-item sb-row flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] leading-[1.25] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring/70";

/** Ícone com indicador circular liquid glass quando ativo. */
function RowIcon({
  icon: Icon,
  active,
}: {
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <span
      className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full ${
        active ? "sb-icon-glass" : ""
      }`}
    >
      <Icon
        className={`h-[17px] w-[17px] ${
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/60"
        }`}
        strokeWidth={1.8}
      />
    </span>
  );
}

/** URL da central de ajuda. */
const WIKI_URL = "https://www.aurit.com.br/wiki";

/* ============================================================
   APP SIDEBAR
   ============================================================ */

export function AppSidebar() {
  const { state, isMobile, setOpenMobile, setOpen } = useSidebar();

  const collapsed = !isMobile && state === "collapsed";

  const location = useLocation();
  const navigate = useNavigate();

  /* ==========================================================
     BACK / REGRAS FUNCIONAIS ORIGINAIS
     ========================================================== */

  const [tipoPlano, setTipoPlano] = useState<TipoPlano | null>(null);

  const [planLoaded, setPlanLoaded] = useState(false);

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const [permissoes, setPermissoes] = useState<
    Partial<Record<ModuloPermissao, boolean>>
  >({});

  const usuarioLogado = getUsuarioLogadoStorage();

  const isOwner = usuarioLogado?.userRole === "ADMIN_PROPRIETARIO";

  const isFreePlan = planLoaded && tipoPlano === "PLANO_GRATUITO";

  const permissionFilteredSections = useMemo(
    () =>
      getVisibleSections(
        sections,
        isFreePlan,
        isOwner,
        permissoes,
        permissionsLoaded,
      ),
    [isFreePlan, isOwner, permissoes, permissionsLoaded],
  );

  /* ==========================================================
     BUSCA NOVA DO LOVABLE
     ========================================================== */

  const [query, setQuery] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);

  const searching = normalizeMenuTerm(query).length > 0;

  const term = normalizeMenuTerm(query);

  const matches = (text: string) => normalizeMenuTerm(text).includes(term);

  /*
   * IMPORTANTE:
   * A busca trabalha SOMENTE sobre os itens
   * que já passaram por plano/permissão.
   */
  const visibleSections = useMemo(() => {
    if (!searching) {
      return permissionFilteredSections;
    }

    return permissionFilteredSections
      .map((section) => {
        const directs = (section.directs ?? []).filter((direct) =>
          matches(direct.title),
        );

        const groups = (section.groups ?? [])
          .map((group) => {
            const groupMatch = matches(group.title);

            const items = groupMatch
              ? group.items
              : group.items.filter((item) => matches(item.title));

            return items.length || groupMatch
              ? {
                  ...group,
                  items,
                }
              : null;
          })
          .filter((group): group is MenuGroup => group !== null);

        return directs.length || groups.length
          ? {
              ...section,
              directs,
              groups,
            }
          : null;
      })
      .filter(
        (section): section is NonNullable<typeof section> => section !== null,
      );
  }, [permissionFilteredSections, searching, term]);

  const noResults = searching && visibleSections.length === 0;

  const label = (text: string) =>
    searching ? highlightMenuTitle(text, query) : text;

  /* ==========================================================
     ACTIVE
     ========================================================== */

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const groupHasActive = (group: MenuGroup) =>
    group.items.some((item) => isActive(item.url));

  const allVisibleGroups = useMemo(
    () => permissionFilteredSections.flatMap((section) => section.groups ?? []),
    [permissionFilteredSections],
  );

  /*
   * Accordion Lovable:
   * um grupo aberto por vez.
   */
  const [openId, setOpenId] = useState<string | null>(() => {
    return allVisibleGroups.find((group) => groupHasActive(group))?.id ?? null;
  });

  useEffect(() => {
    const current = allVisibleGroups.find((group) => groupHasActive(group));

    if (current) {
      setOpenId(current.id);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, allVisibleGroups.length]);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const closeMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  /* ==========================================================
     CARREGAMENTO DO PLANO
     ========================================================== */

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

  /* ==========================================================
     CARREGAMENTO DAS PERMISSÕES
     ========================================================== */

  useEffect(() => {
    let active = true;

    const modulos = Array.from(new Set(Object.values(PERMISSAO_POR_ROTA)));

    async function carregarPermissoes() {
      try {
        const resultados = await Promise.all(
          modulos.map(
            async (modulo) =>
              [modulo, await usuarioTemPermissao(modulo)] as const,
          ),
        );

        if (active) {
          setPermissoes(Object.fromEntries(resultados));
        }
      } catch {
        if (active) {
          setPermissoes({});
        }
      } finally {
        if (active) {
          setPermissionsLoaded(true);
        }
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
     ITENS DIRETOS
     ESTILIZAÇÃO LOVABLE
     ========================================================== */

  const renderDirect = (direct: DirectItem) => {
    const active = isActive(direct.url);

    if (collapsed) {
      return (
        <SidebarMenuItem key={direct.id} className="flex justify-center">
          <NavLink
            to={direct.url}
            end={direct.url === "/"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate(direct.url);
            }}
            aria-current={active ? "page" : undefined}
            aria-label={direct.title}
            title={direct.title}
            className={`${collapsedIconBox} ${
              active
                ? "sb-icon-glass text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            }`}
          >
            <direct.icon
              className={`h-[18px] w-[18px] ${
                active ? "text-sidebar-accent-foreground" : ""
              }`}
              strokeWidth={1.8}
            />
          </NavLink>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={direct.id}>
        <SidebarMenuButton asChild className="h-auto rounded-none p-0">
          <NavLink
            to={direct.url}
            end={direct.url === "/"}
            onClick={closeMobile}
            aria-current={active ? "page" : undefined}
            className={`${rowBase} group/item ${
              active
                ? "sb-item-active font-semibold text-sidebar-accent-foreground"
                : "font-medium text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
            }`}
          >
            <RowIcon icon={direct.icon} active={active} />

            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              {label(direct.title)}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  /* ==========================================================
     SUBMENU
     ESTILIZAÇÃO LOVABLE
     ========================================================== */

  const renderSubList = (group: MenuGroup, variant: "inline" | "floating") => (
    <ul
      className={
        variant === "inline"
          ? "sb-group-open flex flex-col pb-1"
          : "flex flex-col gap-px"
      }
    >
      {group.items.map((sub) => {
        const active = isActive(sub.url);

        return (
          <li key={sub.url}>
            <NavLink
              to={sub.url}
              onClick={closeMobile}
              aria-current={active ? "page" : undefined}
              className={`sb-item flex items-center py-[6px] leading-[1.3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring/70 ${
                variant === "inline"
                  ? "pl-[38px] pr-2.5 text-[12.5px]"
                  : "rounded-[7px] px-2.5 text-[13px]"
              } ${
                active
                  ? "sb-subitem-active font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/65 hover:text-sidebar-accent-foreground"
              }`}
            >
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {label(sub.title)}
              </span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  /* ==========================================================
     GRUPO RECOLHIDO
     ESTILIZAÇÃO LOVABLE
     ========================================================== */

  const renderCollapsedGroup = (group: MenuGroup) => {
    const activeInGroup = groupHasActive(group);

    return (
      <SidebarMenuItem key={group.id} className="flex justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              aria-label={group.title}
              aria-haspopup="menu"
              title={group.title}
              className={`${collapsedIconBox} ${
                activeInGroup
                  ? "sb-icon-glass text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
              }`}
            >
              <group.icon
                className={`h-[18px] w-[18px] ${
                  activeInGroup ? "text-sidebar-accent-foreground" : ""
                }`}
                strokeWidth={1.8}
              />
            </button>
          </PopoverTrigger>

          <PopoverContent
            onOpenAutoFocus={(event) => event.preventDefault()}
            side="right"
            align="start"
            sideOffset={10}
            collisionPadding={12}
            className="w-[246px] rounded-[10px] border-sidebar-border/60 bg-sidebar p-1.5 text-sidebar-foreground shadow-[0_14px_34px_-18px_hsl(0_0%_0%_/_0.5)]"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              {group.title}
            </p>

            {renderSubList(group, "floating")}
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    );
  };

  /* ==========================================================
     GRUPO NORMAL
     ESTILIZAÇÃO LOVABLE
     ========================================================== */

  const renderGroup = (group: MenuGroup) => {
    if (collapsed) {
      return renderCollapsedGroup(group);
    }

    const open = searching ? true : openId === group.id;

    const activeInGroup = groupHasActive(group);

    return (
      <SidebarMenuItem key={group.id}>
        <Collapsible
          open={open}
          onOpenChange={() => {
            if (!searching) {
              toggle(group.id);
            }
          }}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-expanded={open}
              className={`${rowBase} group/trigger ${
                activeInGroup || open
                  ? "font-semibold text-sidebar-accent-foreground"
                  : "font-medium text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
              }`}
            >
              <RowIcon icon={group.icon} active={activeInGroup} />

              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {label(group.title)}
              </span>

              <ChevronRight
                className={`h-3.5 w-3.5 flex-shrink-0 text-sidebar-foreground/35 transition-transform duration-200 motion-reduce:transition-none ${
                  open ? "rotate-90 text-sidebar-foreground/55" : ""
                }`}
                strokeWidth={2}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            {renderSubList(group, "inline")}
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  /* ==========================================================
     RENDER
     EXATAMENTE NA ESTRUTURA VISUAL DO LOVABLE
     ========================================================== */

  return (
    <Sidebar
      id="app-sidebar"
      collapsible="icon"
      className="border-r border-sidebar-border/50 [&_[data-sidebar=sidebar]]:bg-sidebar"
    >
      {/* =====================================================
          LOGO + BUSCA
          ===================================================== */}

      <SidebarHeader
        className={`sb-brand gap-6 ${
          collapsed ? "items-center px-0 pb-2 pt-3" : "px-2.5 pb-2.5 pt-3"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1.5">
          <AuritLogo size={collapsed ? "sm" : "md"} showText={false} />
        </div>

        <SidebarSearch
          value={query}
          onChange={setQuery}
          collapsed={collapsed}
          autoFocus={focusSearch}
          onExpand={() => {
            setOpen(true);
            setFocusSearch(true);
          }}
        />
      </SidebarHeader>

      {/* =====================================================
          MENU
          ===================================================== */}

      <SidebarContent
        className={`sidebar-scroll overflow-x-hidden border-t border-sidebar-border/30 ${
          collapsed ? "px-0 pt-1" : "px-0"
        }`}
      >
        {noResults && (
          <p className="px-3 py-4 text-[12.5px] leading-relaxed text-sidebar-foreground/60">
            Nenhum item encontrado no menu.
          </p>
        )}

        {visibleSections.map((section) => (
          <SidebarGroup key={section.id} className="px-0 py-0">
            <SidebarGroupContent>
              <SidebarMenu
                className={collapsed ? "items-center gap-1 py-1" : "gap-0"}
              >
                {section.directs?.map(renderDirect)}

                {section.groups?.map(renderGroup)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* =====================================================
    WIKI
    ====================================================== */}

      <SidebarFooter
        className={`border-t border-sidebar-border/40 p-0 ${
          collapsed ? "items-center py-2" : ""
        }`}
      >
        <a
          href="https://www.aurit.com.br/wiki"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
          aria-label="Wiki da Aurit"
          title="Wiki da Aurit"
          className={
            collapsed
              ? `${collapsedIconBox} text-sidebar-foreground/70 hover:text-sidebar-accent-foreground`
              : `${rowBase} sb-row-last font-medium text-sidebar-foreground/75 hover:text-sidebar-accent-foreground`
          }
        >
          {collapsed ? (
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.8} />
          ) : (
            <>
              <RowIcon icon={BookOpen} active={false} />

              <span className="min-w-0 flex-1">Wiki da Aurit</span>
            </>
          )}
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}

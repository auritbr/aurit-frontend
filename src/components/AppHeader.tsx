import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleHelp, CreditCard, PanelLeft, Settings } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { AlertasPopover } from "@/components/AlertasPopover";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { toast } from "sonner";
import { usuarioTemPermissao } from "@/lib/permissoes";
import { userRoleLabel, type UserRole } from "@/data/usuarios";
import {
  getUsuarioLogado,
  limparSessaoUsuario,
  type UsuarioLogado,
} from "@/lib/auth";

type HeaderUser = {
  name: string;
  perfil: string;
  iniciais: string;
};

function mapUsuarioToHeaderUser(usuario?: UsuarioLogado | null): HeaderUser {
  return {
    name: usuario?.name?.trim() || "Usuário",
    perfil:
      userRoleLabel[usuario?.userRole as UserRole] ?? usuario?.userRole ?? "",
    iniciais: (usuario?.name ?? "Usuário")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase(),
  };
}

function SidebarToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? false : state === "expanded";

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={expanded ? "Recolher menu lateral" : "Expandir menu lateral"}
      aria-expanded={expanded}
      aria-controls="app-sidebar"
      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[11px] border border-border/70 bg-card/70 text-muted-foreground backdrop-blur-md shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.5)] transition-[background-color,color,transform] duration-150 hover:bg-card hover:text-foreground active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <PanelLeft className="h-[17px] w-[17px]" strokeWidth={1.9} />
    </button>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<HeaderUser>({
    name: "",
    perfil: "",
    iniciais: "",
  });
  const [loadingUser, setLoadingUser] = useState(true);
  const [podeConfigurar, setPodeConfigurar] = useState(false);
  const [podeAcessarCentralCliente, setPodeAcessarCentralCliente] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        setLoadingUser(true);
        const usuario = await getUsuarioLogado();
        if (active) {
          setUser(mapUsuarioToHeaderUser(usuario));
          const [configuracoesUsuario, centralCliente] = await Promise.all([
            usuarioTemPermissao("USUARIOS", "VISUALIZAR").catch(
              () => false,
            ),
            usuarioTemPermissao("CENTRAL_CLIENTE", "VISUALIZAR").catch(
              () => false,
            ),
          ]);
          if (!active) return;
          setPodeConfigurar(configuracoesUsuario);
          setPodeAcessarCentralCliente(centralCliente);
        }
      } catch (error) {
        console.error("Erro ao buscar usuário logado:", error);
        limparSessaoUsuario();
        if (active) navigate("/login", { replace: true });
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    void loadUser();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    limparSessaoUsuario();
    toast.success("Sessão encerrada.");
    navigate("/login", { replace: true });
  };

  const displayName = loadingUser ? "Carregando..." : user.name;
  const displayPerfil = loadingUser ? "" : user.perfil;
  const wikiUrl = "https://www.aurit.com.br/wiki";
  const configuracoesPath = "/usuario";

  return (
    <header className="sticky left-0 right-0 top-0 z-40 flex h-[var(--app-header-height)] w-full flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card/85 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 shadow-[0_1px_2px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.45)] sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarToggle />
        <div className="hidden h-5 w-px bg-border/70 sm:block" />
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Central de Ajuda da Aurit"
          title="Central de Ajuda da Aurit"
          className="header-action-glass inline-flex h-[34px] items-center gap-1.5 rounded-[11px] px-2.5"
        >
          <CircleHelp className="h-[17px] w-[17px]" strokeWidth={1.9} />
          <span className="hidden text-[12.5px] font-medium lg:inline">
            Ajuda
          </span>
        </a>
        {podeAcessarCentralCliente ? (
          <Link
            to="/configuracoes/central-do-cliente"
            aria-label="Central do Cliente"
            title="Central do Cliente"
            className="header-action-glass inline-flex h-[34px] items-center gap-1.5 rounded-[11px] px-2.5"
          >
            <CreditCard className="h-[17px] w-[17px]" strokeWidth={1.9} />
            <span className="hidden text-[12.5px] font-medium lg:inline">
              Central do Cliente
            </span>
          </Link>
        ) : null}
        {podeConfigurar ? (
          <Link
            to={configuracoesPath}
            aria-label="Configurações"
            title="Configurações"
            className="header-action-glass inline-flex h-[34px] items-center gap-1.5 rounded-[11px] px-2.5"
          >
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.9} />
            <span className="hidden text-[12.5px] font-medium lg:inline">
              Configurações
            </span>
          </Link>
        ) : null}
        <AlertasPopover />
        <div className="mx-0.5 hidden h-5 w-px bg-border/70 sm:block" />
        <UserProfileMenu
          name={displayName}
          perfil={displayPerfil}
          iniciais={user.iniciais}
          settingsPath={podeConfigurar ? configuracoesPath : undefined}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { AuritLogo } from "@/components/AuritLogo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AlertasPopover } from "@/components/AlertasPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import {
  getUsuarioLogado,
  limparSessaoUsuario,
  type UsuarioLogado,
} from "@/lib/auth";

type HeaderUser = {
  name: string;
  email: string;
};

function mapUsuarioToHeaderUser(usuario?: UsuarioLogado | null): HeaderUser {
  return {
    name: usuario?.name?.trim() || "Usuário",
    email: usuario?.login?.trim() || "",
  };
}

export function AppHeader() {
  const navigate = useNavigate();

  const [user, setUser] = useState<HeaderUser>({
    name: "",
    email: "",
  });

  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        setLoadingUser(true);

        const usuario = await getUsuarioLogado();

        if (!active) return;

        setUser(mapUsuarioToHeaderUser(usuario));
      } catch (error) {
        console.error("Erro ao buscar usuário logado:", error);

        limparSessaoUsuario();

        if (active) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (active) {
          setLoadingUser(false);
        }
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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center">
          <AuritLogo size="md" withBackground={false} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AlertasPopover />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary-soft">
              <UserIcon className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>

            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-medium text-foreground">
                {loadingUser ? "Carregando..." : user.name}
              </p>

              <p className="text-[11px] text-muted-foreground">
                {loadingUser ? "" : user.email}
              </p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">
                {loadingUser ? "Carregando..." : user.name}
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {loadingUser ? "" : user.email}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

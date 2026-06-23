import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuritLogo } from "@/components/AuritLogo";

import { Button } from "@/components/ui/button";
import { limparSessaoUsuario, getUsuarioLogadoStorage } from "@/lib/auth";

export function ProprietarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const usuario = getUsuarioLogadoStorage();

  function handleLogout() {
    limparSessaoUsuario();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between px-5">
        <div className="flex items-center gap-2 min-w-0">

          <div className="flex items-center">
            <AuritLogo size="md" withBackground={false} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-foreground truncate max-w-[220px]">
              {usuario?.name ?? "Administrador"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Proprietário da plataforma
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
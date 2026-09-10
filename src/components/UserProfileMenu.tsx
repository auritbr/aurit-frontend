import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserProfileMenuProps {
  name: string;
  perfil?: string;
  iniciais?: string;
  avatarUrl?: string;
  settingsPath?: string;
  onLogout: () => void;
}

export function UserProfileMenu({
  name,
  perfil,
  iniciais,
  avatarUrl,
  settingsPath,
  onLogout,
}: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`Menu do usuário ${name}`}
        title={name}
        className="group flex h-[38px] max-w-[230px] items-center gap-2 rounded-[15px] border border-border/70 bg-card/70 pl-2 pr-2 backdrop-blur-md shadow-[0_1px_2px_-1px_hsl(215_28%_17%_/_0.10),inset_0_1px_0_0_hsl(0_0%_100%_/_0.5)] transition-[background-color,box-shadow] duration-150 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=open]:bg-card data-[state=open]:ring-1 data-[state=open]:ring-primary/25"
      >
        <span className="hidden min-w-0 flex-1 text-right leading-tight md:block">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {name}
          </span>
          {perfil ? (
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {perfil}
            </span>
          ) : null}
        </span>
        <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-primary-soft text-[11.5px] font-semibold tracking-[0.02em] text-primary shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.55)]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto de ${name}`}
              className="h-full w-full object-cover"
            />
          ) : iniciais ? (
            iniciais
          ) : (
            <UserIcon className="h-[15px] w-[15px]" strokeWidth={2} />
          )}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
          strokeWidth={2}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 rounded-[15px] border-border/70 bg-popover/95 p-1.5 shadow-[0_16px_40px_-18px_hsl(215_28%_17%_/_0.35)] backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 font-normal">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {name}
          </p>
          {perfil ? (
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {perfil}
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/70" />
        {settingsPath ? (
          <DropdownMenuItem
            onClick={() => navigate(settingsPath)}
            className="cursor-pointer rounded-[10px] px-2 py-2 text-[13px]"
          >
            <Settings className="mr-2 h-4 w-4" strokeWidth={2} />
            Configurações
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer rounded-[10px] px-2 py-2 text-[13px] text-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={2} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

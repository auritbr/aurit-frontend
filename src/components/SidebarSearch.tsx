import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Normaliza texto para busca (sem acentos, minúsculo). */
export function normalizeMenuTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Destaca de forma sutil o termo encontrado dentro de um título do menu. */
export function highlightMenuTitle(title: string, query: string) {
  const q = normalizeMenuTerm(query);
  if (!q) return title;
  const base = normalizeMenuTerm(title);
  const at = base.indexOf(q);
  if (at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <span className="rounded-[3px] bg-sidebar-primary/25 text-sidebar-accent-foreground">
        {title.slice(at, at + q.length)}
      </span>
      {title.slice(at + q.length)}
    </>
  );
}

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Estado recolhido: mostra apenas a lupa. */
  collapsed?: boolean;
  /** Expande o sidebar ao clicar na lupa no modo recolhido. */
  onExpand?: () => void;
  /** Foca o campo automaticamente após expandir. */
  autoFocus?: boolean;
}

/**
 * Campo "Buscar no menu" — liquid glass sutil sobre a cor-base do sidebar.
 * Busca exclusivamente itens de navegação (módulos, submenus e páginas).
 */
export function SidebarSearch({
  value,
  onChange,
  collapsed = false,
  onExpand,
  autoFocus = false,
}: SidebarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !collapsed) inputRef.current?.focus();
  }, [autoFocus, collapsed]);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Acesso rápido"
            onClick={onExpand}
            className="sb-item flex h-9 w-9 items-center justify-center rounded-[9px] text-sidebar-foreground/70 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70"
          >
            <Search className="h-[19px] w-[19px]" strokeWidth={1.9} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Acesso rápido</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="sb-search relative flex items-center rounded-[8px]">
      <Search
        className="pointer-events-none absolute left-2.5 h-[15px] w-[15px] text-sidebar-foreground/50"
        strokeWidth={2}
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        placeholder="Acesso rápido"
        aria-label="Acesso rápido"
        className="h-8 w-full min-w-0 rounded-[8px] bg-transparent pl-8 pr-8 text-[13px] text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-[8px] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

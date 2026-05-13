import * as React from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const EMAIL_DOMAIN_SUGGESTIONS = [
  "@gmail.com",
  "@outlook.com",
  "@outlook.com.br",
  "@hotmail.com",
  "@hotmail.com.br",
  "@yahoo.com",
  "@yahoo.com.br",
  "@icloud.com",
  "@me.com",
  "@live.com",
  "@msn.com",
  "@uol.com.br",
  "@bol.com.br",
  "@terra.com.br",
  "@ig.com.br",
] as const;

/**
 * Gera sugestões de e-mail com base no que foi digitado.
 * - Exige pelo menos 2 caracteres no "local" (antes do @).
 * - Sem "@": sugere local + cada domínio padrão.
 * - Com "@" parcial: filtra domínios compatíveis.
 * - Com domínio já completo (ex.: usuario@ong.org.br): não sugere nada.
 */
export function getEmailSuggestions(value: string): string[] {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return [];
  const atIndex = v.indexOf("@");
  const local = atIndex === -1 ? v : v.slice(0, atIndex);
  if (local.length < 2) return [];

  if (atIndex === -1) {
    return EMAIL_DOMAIN_SUGGESTIONS.map((d) => `${local}${d}`);
  }

  const domainPart = v.slice(atIndex); // inclui "@"
  const afterAt = domainPart.slice(1);
  // Domínio já parece completo — não sugerir.
  if (afterAt.includes(".") && (afterAt.split(".").pop() ?? "").length >= 2) {
    return [];
  }
  const matches = EMAIL_DOMAIN_SUGGESTIONS.filter((d) =>
    d.startsWith(domainPart),
  );
  return matches.map((d) => `${local}${d}`);
}

export interface EmailInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "list" | "onChange"> {
  /** Mantém compatibilidade com formulários existentes (evento padrão). */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Callback opcional que recebe apenas o valor (string). */
  onValueChange?: (value: string) => void;
}

/**
 * Input de e-mail com sugestões de domínios comuns em um dropdown customizado.
 * Não usar para campos institucionais — esses possuem tratamento próprio.
 */
export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  (
    {
      id,
      value,
      placeholder,
      autoComplete,
      onChange,
      onValueChange,
      onFocus,
      onBlur,
      className,
      disabled,
      readOnly,
      ...rest
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const blurTimer = React.useRef<number | null>(null);

    const suggestions = React.useMemo(
      () => getEmailSuggestions(typeof value === "string" ? value : ""),
      [value],
    );

    React.useEffect(() => {
      setActiveIndex(-1);
    }, [value]);

    React.useEffect(
      () => () => {
        if (blurTimer.current) window.clearTimeout(blurTimer.current);
      },
      [],
    );

    const showList = open && !disabled && !readOnly && suggestions.length > 0;

    const fireChange = (newValue: string) => {
      if (onValueChange) onValueChange(newValue);
      if (onChange) {
        const synthetic = {
          target: { value: newValue, id: id ?? "" },
          currentTarget: { value: newValue, id: id ?? "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(synthetic);
      }
    };

    const handleSelect = (s: string) => {
      fireChange(s);
      setOpen(false);
      setActiveIndex(-1);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (!showList) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={ref}
          id={id}
          type="email"
          value={value}
          autoComplete={autoComplete ?? "email"}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
          onFocus={(e) => {
            setOpen(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            // pequeno delay para permitir o clique numa sugestão
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
            onBlur?.(e);
          }}
          onChange={(e) => {
            setOpen(true);
            if (onValueChange) onValueChange(e.target.value);
            onChange?.(e);
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={showList}
          {...rest}
        />
        {showList && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-md animate-in fade-in-0 zoom-in-95"
            // evita que o blur do input dispare antes do click
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.slice(0, 5).map((s, idx) => (
              <li
                key={s}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(s)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  idx === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
EmailInput.displayName = "EmailInput";
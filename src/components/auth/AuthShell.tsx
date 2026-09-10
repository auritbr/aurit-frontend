import { useState, type ReactNode } from "react";
import { Check, Circle, Eye, EyeOff, LockKeyhole } from "lucide-react";

import { AuritLogo } from "@/components/AuritLogo";
import { politicaSenhaBackend, type PoliticaSenha } from "@/lib/authApi";

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <div className="login-page-shell relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="login-background-glow login-background-glow--bottom"
      />
      <div
        aria-hidden
        className="login-background-glow login-background-glow--top"
      />
      <div
        aria-hidden
        className="login-background-glow login-background-glow--soft"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[410px]">
          <div className="login-panel-glass rounded-[22px] px-7 py-8 sm:px-9 sm:py-9">
            {children}
          </div>
          <div className="mt-5 flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground">
            <nav
              aria-label="Links de ajuda e legais"
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
            >
              <a href="/wiki" className="transition-colors hover:text-primary">
                Ajuda
              </a>
              <a
                href="https://www.aurit.com.br/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                Política de Privacidade
              </a>
              <a
                href="https://www.aurit.com.br/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                Termos de Uso
              </a>
            </nav>
            <span>
              © {new Date().getFullYear()} Aurit · Português (Brasil)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex justify-center ${compact ? "mb-3" : "mb-4"}`}>
      <AuritLogo size={compact ? "md" : "lg"} withBackground={false} />
    </div>
  );
}

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="mb-6 mt-5 text-center">
      <h1 className="login-panel-title text-[18px] font-semibold tracking-tight">
        {title}
      </h1>
      <div className="login-panel-subtitle mt-1 text-[12px] leading-relaxed">
        {description}
      </div>
    </div>
  );
}

export function AuthField({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="login-field">
        <span className="login-field-icon" aria-hidden>
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

export function AuthSubmit({
  children,
  loading,
  loadingLabel,
  disabled = false,
}: {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="login-submit-glass mt-5 h-[44px] w-full rounded-[8px] text-[13px] font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

export function senhaAtendePolitica(
  senha: string,
  politica: PoliticaSenha = politicaSenhaBackend,
) {
  return {
    minimo: senha.length >= politica.minimoCaracteres,
    maiuscula: !politica.exigeMaiuscula || /[A-Z]/.test(senha),
    minuscula: !politica.exigeMinuscula || /[a-z]/.test(senha),
    numero: !politica.exigeNumero || /[0-9]/.test(senha),
    especial: !politica.exigeEspecial || /[^A-Za-z0-9]/.test(senha),
  };
}

export function NovaSenhaFields({
  novaSenha,
  confirmarSenha,
  onNovaSenha,
  onConfirmarSenha,
  disabled = false,
}: {
  novaSenha: string;
  confirmarSenha: string;
  onNovaSenha: (value: string) => void;
  onConfirmarSenha: (value: string) => void;
  disabled?: boolean;
}) {
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const regras = senhaAtendePolitica(novaSenha);
  const divergente = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;
  const regraItens = [
    [regras.minimo, "Mínimo de 8 caracteres"],
    [regras.maiuscula, "Letra maiúscula"],
    [regras.minuscula, "Letra minúscula"],
    [regras.numero, "Número"],
    [regras.especial, "Caractere especial"],
  ] as const;
  return (
    <>
      <PasswordField
        id="nova-senha"
        label="Nova senha"
        placeholder="Nova senha"
        value={novaSenha}
        onChange={onNovaSenha}
        visible={mostrarNova}
        onToggle={() => setMostrarNova((valor) => !valor)}
        disabled={disabled}
      />
      <ul
        id="password-requirements"
        aria-live="polite"
        className="mt-3 grid grid-cols-1 gap-1.5 rounded-[10px] border border-border/70 bg-muted/40 p-3 text-[11.5px] sm:grid-cols-2"
      >
        {regraItens.map(([ok, label]) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 ${ok ? "text-primary" : "text-muted-foreground"}`}
          >
            {ok ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            ) : (
              <Circle className="h-3 w-3" strokeWidth={2} aria-hidden />
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <PasswordField
          id="confirmar-senha"
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          value={confirmarSenha}
          onChange={onConfirmarSenha}
          visible={mostrarConfirmar}
          onToggle={() => setMostrarConfirmar((valor) => !valor)}
          disabled={disabled}
        />
      </div>
      {divergente && (
        <p
          role="alert"
          className="mt-2 text-[11.5px] font-medium text-destructive"
        >
          As senhas informadas não coincidem.
        </p>
      )}
    </>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <AuthField id={id} label={label} icon={<LockKeyhole className="h-4 w-4" />}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        placeholder={placeholder}
        aria-describedby={
          id === "nova-senha" ? "password-requirements" : undefined
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="login-field-input"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          visible
            ? `Ocultar ${label.toLowerCase()}`
            : `Mostrar ${label.toLowerCase()}`
        }
        className="login-field-toggle focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
      >
        {visible ? (
          <EyeOff className="h-[15px] w-[15px]" />
        ) : (
          <Eye className="h-[15px] w-[15px]" />
        )}
      </button>
    </AuthField>
  );
}

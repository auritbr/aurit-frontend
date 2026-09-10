import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import {
  AuthField,
  AuthHeading,
  AuthLogo,
  AuthPage,
  AuthSubmit,
} from "@/components/auth/AuthShell";
import { esqueciSenha } from "@/lib/authApi";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    const valor = email.trim().toLowerCase();
    if (!emailRegex.test(valor)) {
      setErro("Informe um e-mail válido, como nome@exemplo.com.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await esqueciSenha(valor);
      setEnviado(true);
    } catch (error) {
      // Não expõe a existência da conta. Apenas uma indisponibilidade real é útil ao usuário.
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar as instruções.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthPage>
      <AuthLogo compact />
      {enviado ? (
        <>
          <AuthHeading
            title="Recuperar senha"
            description="Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha."
          />
          <Link
            to="/login"
            className="login-submit-glass inline-flex h-[44px] w-full items-center justify-center rounded-[8px] text-[13px] font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Voltar ao login
          </Link>
        </>
      ) : (
        <>
          <AuthHeading
            title="Recuperar senha"
            description="Informe o e-mail cadastrado na sua conta para receber as instruções de redefinição."
          />
          <form onSubmit={enviar} className="space-y-3" noValidate>
            <AuthField
              id="recuperar-email"
              label="E-mail"
              icon={<Mail className="h-4 w-4" />}
            >
              <input
                id="recuperar-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErro(null);
                }}
                className="login-field-input"
                disabled={enviando}
              />
            </AuthField>
            {erro && (
              <p
                role="alert"
                className="text-[11.5px] font-medium text-destructive"
              >
                {erro}
              </p>
            )}
            <AuthSubmit
              loading={enviando}
              loadingLabel="Enviando instruções..."
            >
              Enviar instruções
            </AuthSubmit>
            <div className="text-center">
              <Link
                to="/login"
                className="login-forgot-link rounded text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Voltar ao login
              </Link>
            </div>
          </form>
        </>
      )}
    </AuthPage>
  );
}

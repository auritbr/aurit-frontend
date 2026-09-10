import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  AuthField,
  AuthLogo,
  AuthPage,
  AuthSubmit,
} from "@/components/auth/AuthShell";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { PrimeiroAcessoFlow } from "@/components/auth/PrimeiroAcessoFlow";
import {
  getStoredUserRole,
  isAuthenticated,
  isFirstAccessPending,
  isLocalhost,
  aplicarRespostaLogin,
  loginComGoogle,
  loginUsuario,
} from "@/lib/auth";

const redirectByRole = (role?: string | null) =>
  role === "ADMIN_PROPRIETARIO" ? "/controle-proprietario/empresas" : "/";

export default function Login() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(isFirstAccessPending());

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirectByRole(getStoredUserRole()), { replace: true });
    }
  }, [navigate]);

  async function entrar(event: React.FormEvent) {
    event.preventDefault();
    if (!identificador.trim() || !senha) {
      setErro("Informe seu e-mail ou usuário e a senha.");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await loginUsuario(identificador, senha);
      setSenha("");
      if (resposta.primeiroAcessoPendente) {
        setPrimeiroAcesso(true);
        return;
      }
      toast.success("Acesso realizado com sucesso.");
      navigate(redirectByRole(resposta.usuario.userRole), { replace: true });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function concluirLoginGoogle(
    respostaBackend: Awaited<ReturnType<typeof loginComGoogle>>,
  ) {
    if (carregando || carregandoGoogle) return;
    setCarregandoGoogle(true);
    setErro(null);
    try {
      const resposta = aplicarRespostaLogin(respostaBackend);
      if (resposta.primeiroAcessoPendente) {
        // O backend normalmente não devolve esse estado para Google. Ainda
        // assim, respeitamos o contrato de autenticação sem liberar módulos.
        setPrimeiroAcesso(true);
        return;
      }
      toast.success("Acesso realizado com sucesso.");
      navigate(redirectByRole(resposta.usuario.userRole), { replace: true });
    } catch (error) {
      setErro(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível acessar esta organização com essa conta.",
      );
    } finally {
      setCarregandoGoogle(false);
    }
  }

  // Localhost já é uma origem autorizada no cliente OAuth. Iniciar o fluxo
  // aqui preserva o gesto do clique original e evita que o navegador bloqueie
  // uma segunda janela aberta a partir do popup técnico.
  async function concluirCodigoGoogleLocal(codigo: string) {
    if (carregando || carregandoGoogle) return;
    setCarregandoGoogle(true);
    setErro(null);
    try {
      const respostaBackend = await loginComGoogle(codigo);
      const resposta = aplicarRespostaLogin(respostaBackend);
      if (resposta.primeiroAcessoPendente) {
        setPrimeiroAcesso(true);
        return;
      }
      toast.success("Acesso realizado com sucesso.");
      navigate(redirectByRole(resposta.usuario.userRole), { replace: true });
    } catch (error) {
      setErro(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível acessar esta organização com essa conta.",
      );
    } finally {
      setCarregandoGoogle(false);
    }
  }

  return (
    <AuthPage>
      {primeiroAcesso ? (
        <PrimeiroAcessoFlow
          onConcluido={() =>
            navigate(redirectByRole(getStoredUserRole()), { replace: true })
          }
          onCancelar={() => setPrimeiroAcesso(false)}
        />
      ) : (
        <>
          <h1 className="sr-only">Acessar a Aurit</h1>
          <AuthLogo />
          <form onSubmit={entrar} className="mt-7 space-y-3" noValidate>
            <AuthField
              id="identificador"
              label="E-mail ou usuário"
              icon={<UserRound className="h-4 w-4" />}
            >
              <input
                id="identificador"
                type="text"
                autoComplete="username"
                placeholder="Digite seu e-mail ou usuário"
                value={identificador}
                onChange={(event) => {
                  setIdentificador(event.target.value);
                  setErro(null);
                }}
                className="login-field-input"
                disabled={carregando || carregandoGoogle}
              />
            </AuthField>
            <div>
              <AuthField
                id="senha"
                label="Senha"
                icon={<LockKeyhole className="h-4 w-4" />}
              >
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(event) => {
                    setSenha(event.target.value);
                    setErro(null);
                  }}
                  className="login-field-input"
                  disabled={carregando || carregandoGoogle}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="login-field-toggle focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  disabled={carregando || carregandoGoogle}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-[15px] w-[15px]" />
                  ) : (
                    <Eye className="h-[15px] w-[15px]" />
                  )}
                </button>
              </AuthField>
              <div className="mt-2.5">
                <Link
                  to="/recuperar-senha"
                  className="login-forgot-link rounded text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>
            {erro && (
              <p
                role="alert"
                className="text-[11.5px] font-medium text-destructive"
              >
                {erro}
              </p>
            )}
            <AuthSubmit
              loading={carregando}
              loadingLabel="Entrando..."
              disabled={carregandoGoogle}
            >
              Entrar
            </AuthSubmit>
            <GoogleLoginButton
              processando={carregandoGoogle}
              desabilitado={carregando}
              onErro={setErro}
              onAuthorizationCode={
                isLocalhost() ? concluirCodigoGoogleLocal : undefined
              }
              onSucessoPopup={isLocalhost() ? undefined : concluirLoginGoogle}
            />
          </form>
        </>
      )}
    </AuthPage>
  );
}

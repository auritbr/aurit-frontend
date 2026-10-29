import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  AuthField,
  AuthLogo,
  AuthPage,
  AuthSubmit,
} from "@/components/auth/AuthShell";
import { NativeGoogleLoginButton } from "@/components/auth/NativeGoogleLoginButton";
import {
  isNativeGoogleLoginAvailable,
  isNativeGoogleLoginCancelled,
  obterGoogleIdTokenNativo,
  limparSelecaoContaGoogle,
} from "@/lib/nativeGoogleAuth";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { PrimeiroAcessoFlow } from "@/components/auth/PrimeiroAcessoFlow";
import {
  getStoredUserRole,
  setMobileTenantSlug,
  limparSessaoUsuario,
  isAuthenticated,
  isFirstAccessPending,
  isLocalhost,
  aplicarRespostaLogin,
  loginComGoogle,
  loginUsuario,
} from "@/lib/auth";

import {
  autenticarMobile,
  aplicarLoginMobile,
  organizacoesParaEscolha,
  type CredenciaisMobile,
  type OrganizacaoMobile,
  type MobileLoginResponse,
} from "@/lib/mobileLogin";
import { isNativeApp } from "@/lib/native";

const redirectByRole = (role?: string | null) =>
  role === "ADMIN_PROPRIETARIO" ? "/controle-proprietario/empresas" : "/";

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const native = isNativeApp();
  const [escolha, setEscolha] = useState<{
    credenciais: CredenciaisMobile;
    organizacoes: OrganizacaoMobile[];
  } | null>(null);

  useEffect(() => {
    if (!escolha) return;
    const timer = window.setTimeout(
      () => {
        setEscolha(null);
        setSenha("");
        setErro("Seu acesso expirou. Entre novamente.");
      },
      5 * 60 * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [escolha]);
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
      if (native) {
        prepararLoginMobile();
        const credenciais: CredenciaisMobile = {
          tipo: "senha",
          identificador,
          senha,
        };
        receberLoginMobile(await autenticarMobile(credenciais), credenciais);
        return;
      }
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

  function prepararLoginMobile() {
    queryClient.clear();
    limparSessaoUsuario();
    setMobileTenantSlug("");
    setEscolha(null);
  }

  function receberLoginMobile(
    data: MobileLoginResponse,
    credenciais: CredenciaisMobile,
  ) {
    if (!data.token) {
      setEscolha({ credenciais, organizacoes: organizacoesParaEscolha(data) });
      setSenha("");
      return;
    }
    const resposta = aplicarLoginMobile(data);
    setEscolha(null);
    setSenha("");
    if (resposta.primeiroAcessoPendente) {
      setPrimeiroAcesso(true);
      return;
    }
    toast.success("Acesso realizado com sucesso.");
    navigate(redirectByRole(resposta.usuario.userRole), { replace: true });
  }

  async function escolherOrganizacao(slug: string) {
    if (!escolha || carregando || carregandoGoogle) return;
    const { credenciais } = escolha;
    setCarregando(true);
    setErro(null);
    try {
      const data = await autenticarMobile(credenciais, slug);
      if (!data.token)
        throw new Error("Não foi possível concluir o acesso. Entre novamente.");
      receberLoginMobile(data, credenciais);
    } catch {
      setEscolha(null);
      setSenha("");
      setErro("Não foi possível acessar essa organização. Entre novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function cancelarEscolha() {
    setEscolha(null);
    setSenha("");
    setErro(null);
    void limparSelecaoContaGoogle();
  }

  async function entrarGoogleNativo() {
    if (carregando || carregandoGoogle) return;
    prepararLoginMobile();
    setCarregandoGoogle(true);
    setErro(null);
    try {
      const idToken = await obterGoogleIdTokenNativo();
      const credenciais: CredenciaisMobile = { tipo: "google", idToken };
      receberLoginMobile(await autenticarMobile(credenciais), credenciais);
    } catch (error) {
      if (!isNativeGoogleLoginCancelled(error)) {
        setErro(
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível entrar com o Google.",
        );
      }
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
      <div data-mobile-data-page="account">
        {primeiroAcesso ? (
          <PrimeiroAcessoFlow
            onConcluido={() =>
              navigate(redirectByRole(getStoredUserRole()), { replace: true })
            }
            onCancelar={() => setPrimeiroAcesso(false)}
          />
        ) : escolha ? (
          <>
            <AuthLogo />
            <h1 className="mt-5 text-lg font-semibold">
              Escolha sua organização
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você tem acesso a mais de uma organização. Selecione onde deseja
              entrar.
            </p>
            <div className="mt-5 space-y-3">
              {escolha.organizacoes.map((organizacao) => (
                <button
                  key={organizacao.slug}
                  type="button"
                  onClick={() => void escolherOrganizacao(organizacao.slug)}
                  disabled={carregando}
                  className="login-submit-glass flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm disabled:opacity-60"
                >
                  <Building2 className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">
                    {organizacao.nome}
                  </span>
                </button>
              ))}
            </div>
            {carregando && (
              <p role="status" className="mt-3 text-sm">
                Entrando...
              </p>
            )}
            <button
              type="button"
              onClick={cancelarEscolha}
              disabled={carregando}
              className="login-forgot-link mt-5 min-h-11 text-sm"
            >
              Voltar ao login
            </button>
          </>
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
                    aria-label={
                      mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                    }
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
              {native && isNativeGoogleLoginAvailable() && (
                <NativeGoogleLoginButton
                  processando={carregandoGoogle}
                  desabilitado={carregando}
                  onClick={entrarGoogleNativo}
                />
              )}
              {!native && (
                <GoogleLoginButton
                  processando={carregandoGoogle}
                  desabilitado={carregando}
                  onErro={setErro}
                  onAuthorizationCode={
                    isLocalhost() ? concluirCodigoGoogleLocal : undefined
                  }
                  onSucessoPopup={
                    isLocalhost() ? undefined : concluirLoginGoogle
                  }
                />
              )}
            </form>
          </>
        )}
      </div>
    </AuthPage>
  );
}

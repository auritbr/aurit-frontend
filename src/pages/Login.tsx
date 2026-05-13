import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { AuritLogo } from "@/components/AuritLogo";
import { loginUsuario, isAuthenticated, getStoredUserRole } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RecoveryStep = "request" | "reset" | "done";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function passwordRules(pwd: string) {
  return {
    min: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Usuário ou senha inválidos.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

function getRedirectByRole(userRole?: string | null) {
  if (userRole === "ADMIN_PROPRIETARIO") {
    return "/controle-proprietario/empresas";
  }

  return "/";
}

export default function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("request");
  const [recoveryLogin, setRecoveryLogin] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [loadingTroca, setLoadingTroca] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const userRole = getStoredUserRole();

      navigate(getRedirectByRole(userRole), { replace: true });
    }
  }, [navigate]);

  const rules = useMemo(() => passwordRules(novaSenha), [novaSenha]);

  const allRulesMet =
    rules.min && rules.upper && rules.lower && rules.number && rules.special;

  function resetRecoveryState() {
    setRecoveryStep("request");
    setRecoveryLogin("");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setShowSenhaAtual(false);
    setShowNovaSenha(false);
    setLoadingTroca(false);
  }

  function handleRecoveryOpenChange(open: boolean) {
    setRecoveryOpen(open);

    if (!open) {
      resetRecoveryState();
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const login = usuario.trim();

    if (!login || !senha.trim()) {
      toast.error("Usuário e senha são obrigatórios.");
      return;
    }

    try {
      setLoadingLogin(true);

      const { usuario: usuarioLogado } = await loginUsuario(
        login,
        senha,
        lembrar,
      );

      toast.success("Acesso realizado com sucesso.");

      navigate(getRedirectByRole(usuarioLogado.userRole), { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setLoadingLogin(false);
    }
  };

  const openRecovery = () => {
    resetRecoveryState();
    setRecoveryLogin(usuario.trim());
    setRecoveryOpen(true);
  };

  const handleRequestRecovery = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryLogin.trim()) {
      toast.error("Informe seu usuário para continuar.");
      return;
    }

    setRecoveryStep("reset");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const login = recoveryLogin.trim();

    if (!login) {
      toast.error("Informe o usuário.");
      return;
    }

    if (!senhaAtual.trim()) {
      toast.error("Informe a senha atual.");
      return;
    }

    if (!novaSenha.trim()) {
      toast.error("Informe a nova senha.");
      return;
    }

    if (!allRulesMet) {
      toast.error("A nova senha não atende a todos os critérios.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    if (senhaAtual === novaSenha) {
      toast.error("A nova senha deve ser diferente da senha atual.");
      return;
    }

    try {
      setLoadingTroca(true);

      const response = await fetch(`${API_URL}/usuarios/trocar-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login,
          senhaAtual,
          novaSenha,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      toast.success("Senha alterada com sucesso.");

      setUsuario(login);
      setSenha("");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setRecoveryStep("done");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setLoadingTroca(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40"
        />

        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 1px, transparent 1px), radial-gradient(circle at 80% 80%, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="w-full max-w-sm relative z-10">
          {/* Marca centralizada */}
          <div className="mb-4 flex justify-center">
            <AuritLogo size="lg" withBackground={false} />
          </div>

          {/* Card de login */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-7">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                Acesse o sistema
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com seu usuário e senha para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label
                  htmlFor="usuario"
                  className="text-sm font-medium text-foreground"
                >
                  Usuário
                </Label>

                <div className="relative mt-1.5">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="usuario"
                    type="text"
                    autoComplete="username"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className="pl-9"
                    disabled={loadingLogin}
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="senha"
                  className="text-sm font-medium text-foreground"
                >
                  Senha
                </Label>

                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-9 pr-10"
                    disabled={loadingLogin}
                  />

                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2.5 top-1/2 rounded p-1 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {showSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <Checkbox
                    id="lembrar"
                    checked={lembrar}
                    onCheckedChange={(v) => setLembrar(v === true)}
                    disabled={loadingLogin}
                  />

                  <span className="text-sm text-foreground">
                    Lembrar acesso
                  </span>
                </label>

                <button
                  type="button"
                  onClick={openRecovery}
                  disabled={loadingLogin}
                  className="rounded text-sm font-medium text-primary hover:text-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="mt-2 h-10 w-full font-medium"
                disabled={loadingLogin}
              >
                {loadingLogin ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Ao acessar, você concorda com os termos de uso e política de
            privacidade.
          </p>

          <p className="mt-2 text-center text-[11px] text-muted-foreground/80">
            © {new Date().getFullYear()} Aurit
          </p>
        </div>
      </div>

      <Dialog open={recoveryOpen} onOpenChange={handleRecoveryOpenChange}>
        <DialogContent className="max-w-md">
          {recoveryStep === "request" && (
            <>
              <DialogHeader>
                <DialogTitle>Trocar senha</DialogTitle>

                <DialogDescription>
                  Informe seu usuário para continuar com a alteração de senha.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleRequestRecovery} className="mt-2 space-y-4">
                <div>
                  <Label
                    htmlFor="recovery-login"
                    className="text-sm font-medium text-foreground"
                  >
                    Usuário
                  </Label>

                  <div className="relative mt-1.5">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="recovery-login"
                      type="text"
                      value={recoveryLogin}
                      onChange={(e) => setRecoveryLogin(e.target.value)}
                      className="pl-9"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecoveryOpen(false)}
                  >
                    Cancelar
                  </Button>

                  <Button type="submit">Continuar</Button>
                </div>
              </form>
            </>
          )}

          {recoveryStep === "reset" && (
            <>
              <DialogHeader>
                <DialogTitle>Definir nova senha</DialogTitle>

                <DialogDescription>
                  Informe sua senha atual e depois defina a nova senha.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleResetPassword} className="mt-2 space-y-4">
                <div>
                  <Label
                    htmlFor="senha-atual"
                    className="text-sm font-medium text-foreground"
                  >
                    Senha atual
                  </Label>

                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="senha-atual"
                      type={showSenhaAtual ? "text" : "password"}
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      className="pl-9 pr-10"
                      disabled={loadingTroca}
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowSenhaAtual((v) => !v)}
                      aria-label={
                        showSenhaAtual
                          ? "Ocultar senha atual"
                          : "Mostrar senha atual"
                      }
                      className="absolute right-2.5 top-1/2 rounded p-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSenhaAtual ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="nova-senha"
                    className="text-sm font-medium text-foreground"
                  >
                    Nova senha
                  </Label>

                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="nova-senha"
                      type={showNovaSenha ? "text" : "password"}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="pl-9 pr-10"
                      disabled={loadingTroca}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNovaSenha((v) => !v)}
                      aria-label={
                        showNovaSenha
                          ? "Ocultar nova senha"
                          : "Mostrar nova senha"
                      }
                      className="absolute right-2.5 top-1/2 rounded p-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNovaSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="confirmar-senha"
                    className="text-sm font-medium text-foreground"
                  >
                    Confirmar nova senha
                  </Label>

                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="confirmar-senha"
                      type={showNovaSenha ? "text" : "password"}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="pl-9"
                      disabled={loadingTroca}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <ul className="grid grid-cols-1 gap-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs sm:grid-cols-2">
                  <RuleItem ok={rules.min} label="Mínimo de 8 caracteres" />
                  <RuleItem ok={rules.upper} label="Letra maiúscula" />
                  <RuleItem ok={rules.lower} label="Letra minúscula" />
                  <RuleItem ok={rules.number} label="Número" />
                  <RuleItem ok={rules.special} label="Caractere especial" />
                </ul>

                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRecoveryStep("request")}
                    className="text-muted-foreground"
                    disabled={loadingTroca}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>

                  <Button type="submit" disabled={loadingTroca}>
                    {loadingTroca ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {recoveryStep === "done" && (
            <>
              <DialogHeader>
                <DialogTitle>Senha alterada</DialogTitle>

                <DialogDescription>
                  Sua nova senha foi cadastrada com sucesso. Você já pode
                  acessar o sistema com as novas credenciais.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setRecoveryOpen(false)}>Concluir</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 ${ok ? "text-[hsl(var(--status-active-fg))]" : "text-muted-foreground"
        }`}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}

      <span>{label}</span>
    </li>
  );
}
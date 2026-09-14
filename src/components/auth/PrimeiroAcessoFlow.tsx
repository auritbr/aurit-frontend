import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import {
  aplicarRespostaAutenticacao,
  atualizarPrimeiroAcessoStorage,
  getPrimeiroAcessoStorage,
  getStoredToken,
  logoutUsuario,
} from "@/lib/auth";
import {
  confirmarCodigoEmail,
  definirSenhaPrimeiroAcesso,
  solicitarConfirmacaoEmail,
} from "@/lib/authApi";
import {
  AuthField,
  AuthHeading,
  AuthLogo,
  AuthSubmit,
  NovaSenhaFields,
  senhaAtendePolitica,
} from "@/components/auth/AuthShell";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function mensagemCodigo(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("expir"))
    return "Este código expirou. Solicite um novo código.";
  if (
    message.includes("tentativ") ||
    message.includes("limite") ||
    message.includes("60 segundos")
  )
    return "Este código não pode mais ser utilizado agora. Solicite um novo código quando disponível.";
  if (message.includes("invál") || message.includes("inval"))
    return "Código inválido. Confira os números e tente novamente.";
  return error instanceof Error
    ? error.message
    : "Não foi possível confirmar o código.";
}

export function PrimeiroAcessoFlow({
  onConcluido,
  onCancelar,
}: {
  onConcluido: () => void;
  onCancelar: () => void;
}) {
  const navigate = useNavigate();
  const primeiroAcesso = getPrimeiroAcessoStorage() ?? {
    etapa: "CONFIRMAR_EMAIL" as const,
  };
  const [etapa, setEtapa] = useState(primeiroAcesso.etapa);
  const [email, setEmail] = useState(primeiroAcesso.email ?? "");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reenvioDisponivelEm, setReenvioDisponivelEm] = useState<number | null>(
    null,
  );
  const [agora, setAgora] = useState(Date.now());

  const segundosRestantes = useMemo(
    () =>
      reenvioDisponivelEm
        ? Math.max(0, Math.ceil((reenvioDisponivelEm - agora) / 1000))
        : 0,
    [agora, reenvioDisponivelEm],
  );

  useEffect(() => {
    if (!segundosRestantes) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [segundosRestantes]);

  const alterarEtapa = (proxima: typeof etapa) => {
    setEtapa(proxima);
    atualizarPrimeiroAcessoStorage({ etapa: proxima, email });
  };

  async function sairDoPrimeiroAcesso(
    destino: "/login" | "/recuperar-senha" = "/login",
  ) {
    if (carregando) return;
    setCarregando(true);
    try {
      await logoutUsuario(false);
    } finally {
      onCancelar();
      navigate(destino, { replace: true });
    }
  }

  async function enviarCodigo(event?: React.FormEvent) {
    event?.preventDefault();
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailRegex.test(emailNormalizado)) {
      setErro("Informe um e-mail válido, como nome@exemplo.com.");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      await solicitarConfirmacaoEmail(emailNormalizado, getStoredToken());
      setEmail(emailNormalizado);
      atualizarPrimeiroAcessoStorage({
        email: emailNormalizado,
        etapa: "CONFIRMAR_CODIGO",
      });
      setEtapa("CONFIRMAR_CODIGO");
      setCodigo("");
      setReenvioDisponivelEm(Date.now() + 60_000);
      toast.success("Código enviado para seu e-mail.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o código.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarCodigo(event: React.FormEvent) {
    event.preventDefault();
    if (codigo.length !== 6) {
      setErro("Informe os 6 dígitos do código.");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await confirmarCodigoEmail(codigo, getStoredToken());
      const estado = aplicarRespostaAutenticacao(resposta, { email });
      if (estado.primeiroAcessoPendente && estado.etapa === "TROCAR_SENHA") {
        setEtapa("TROCAR_SENHA");
        toast.success("E-mail confirmado com sucesso.");
        return;
      }
      if (estado.primeiroAcessoPendente) {
		throw new Error("Não foi possível concluir a confirmação do e-mail.");
	  }
      toast.success("E-mail confirmado com sucesso.");
      onConcluido();
    } catch (error) {
      setErro(mensagemCodigo(error));
    } finally {
      setCarregando(false);
    }
  }

  async function definirSenha(event: React.FormEvent) {
    event.preventDefault();
    if (!Object.values(senhaAtendePolitica(novaSenha)).every(Boolean)) {
      setErro("A nova senha ainda não atende aos requisitos.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não coincidem.");
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const resposta = await definirSenhaPrimeiroAcesso(
        novaSenha,
        confirmarSenha,
        getStoredToken(),
      );
      const estado = aplicarRespostaAutenticacao(resposta, { email });
      if (estado.primeiroAcessoPendente) {
        throw new Error("Não foi possível concluir a definição da senha.");
      }
      toast.success("Senha definida com sucesso.");
      onConcluido();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível definir a nova senha.",
      );
    } finally {
      setCarregando(false);
    }
  }

  if (etapa === "CONFIRMAR_EMAIL")
    return (
      <>
        <AuthLogo compact />
        <AuthHeading
          title="Confirme seu e-mail"
          description="Para continuar, informe o e-mail que será utilizado para acessar sua conta e recuperar sua senha."
        />
        <form onSubmit={enviarCodigo} className="space-y-3" noValidate>
          <AuthField
            id="primeiro-acesso-email"
            label="E-mail"
            icon={<Mail className="h-4 w-4" />}
          >
            <input
              id="primeiro-acesso-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="login-field-input"
              disabled={carregando}
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
          <p className="text-[11.5px] text-muted-foreground">
            Enviaremos um código de confirmação para este endereço.
          </p>
          <AuthSubmit loading={carregando} loadingLabel="Enviando código...">
            Enviar código
          </AuthSubmit>
          <div className="flex justify-center gap-4 pt-1 text-[12px]">
            <button
              type="button"
              onClick={() => void sairDoPrimeiroAcesso()}
              disabled={carregando}
              className="login-forgot-link rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void sairDoPrimeiroAcesso("/recuperar-senha")}
              disabled={carregando}
              className="login-forgot-link rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Trocar senha
            </button>
          </div>
        </form>
      </>
    );

  if (etapa === "CONFIRMAR_CODIGO")
    return (
      <>
        <AuthLogo compact />
        <AuthHeading
          title="Verifique seu e-mail"
          description={
            <>
              Enviamos um código de 6 dígitos para:
              <br />
              <span className="text-[11.5px]">{email}</span>
            </>
          }
        />
        <form onSubmit={confirmarCodigo} className="space-y-4" noValidate>
          <input
            aria-label="Código de confirmação de 6 dígitos"
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={codigo}
            onChange={(event) => {
              setCodigo(event.target.value.replace(/\D/g, ""));
              setErro(null);
            }}
            className="mx-auto block h-12 w-full max-w-[250px] rounded-[8px] border border-border/70 bg-background/60 px-3 text-center text-lg tracking-[0.45em] outline-none focus:ring-2 focus:ring-ring/40"
            disabled={carregando}
          />
          {erro && (
            <p
              role="alert"
              className="text-center text-[11.5px] font-medium text-destructive"
            >
              {erro}
            </p>
          )}
          <AuthSubmit
            loading={carregando}
            loadingLabel="Confirmando..."
            disabled={codigo.length !== 6}
          >
            Confirmar código
          </AuthSubmit>
          <div className="flex flex-col items-center gap-2 text-[11.5px] text-muted-foreground">
            <span>Não recebeu o código?</span>
            {segundosRestantes > 0 ? (
              <span>
                Reenviar código em 00:
                {String(segundosRestantes).padStart(2, "0")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void enviarCodigo()}
                disabled={carregando}
                className="login-forgot-link rounded text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Reenviar código
              </button>
            )}
            <button
              type="button"
              onClick={() => alterarEtapa("CONFIRMAR_EMAIL")}
              disabled={carregando}
              className="login-forgot-link rounded text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Alterar e-mail
            </button>
            <button
              type="button"
              onClick={() => void sairDoPrimeiroAcesso()}
              disabled={carregando}
              className="login-forgot-link rounded text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Cancelar
            </button>
          </div>
        </form>
      </>
    );

  if (etapa === "TROCAR_SENHA")
    return (
      <>
        <AuthLogo compact />
        <AuthHeading
          title="Defina uma nova senha"
          description="Para concluir seu primeiro acesso, substitua a senha inicial por uma senha pessoal."
        />
        <form onSubmit={definirSenha} className="space-y-3" noValidate>
          <NovaSenhaFields
            novaSenha={novaSenha}
            confirmarSenha={confirmarSenha}
            onNovaSenha={(valor) => {
              setNovaSenha(valor);
              setErro(null);
            }}
            onConfirmarSenha={(valor) => {
              setConfirmarSenha(valor);
              setErro(null);
            }}
            disabled={carregando}
          />
          {erro && (
            <p
              role="alert"
              className="text-[11.5px] font-medium text-destructive"
            >
              {erro}
            </p>
          )}
          <AuthSubmit loading={carregando} loadingLabel="Definindo senha...">
            Concluir acesso
          </AuthSubmit>
        </form>
      </>
    );

  return null;
}

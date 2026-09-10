import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AuthHeading,
  AuthLogo,
  AuthPage,
  AuthSubmit,
  NovaSenhaFields,
  senhaAtendePolitica,
} from "@/components/auth/AuthShell";
import {
  AuthApiError,
  redefinirSenha,
  validarTokenRedefinicao,
} from "@/lib/authApi";

type Estado = "VALIDANDO" | "VALIDO" | "INVALIDO" | "EXPIRADO" | "CONCLUIDO";

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [estado, setEstado] = useState<Estado>("VALIDANDO");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!token) {
      setEstado("INVALIDO");
      return;
    }
    validarTokenRedefinicao(token)
      .then(() => {
        if (ativo) setEstado("VALIDO");
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        const texto = error instanceof Error ? error.message.toLowerCase() : "";
        setEstado(texto.includes("expir") ? "EXPIRADO" : "INVALIDO");
      });
    return () => {
      ativo = false;
    };
  }, [token]);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!Object.values(senhaAtendePolitica(novaSenha)).every(Boolean)) {
      setErro("A nova senha ainda não atende aos requisitos.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não coincidem.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await redefinirSenha(token, novaSenha, confirmarSenha);
      setEstado("CONCLUIDO");
      toast.success("Senha redefinida com sucesso.");
    } catch (error) {
      const texto = error instanceof Error ? error.message.toLowerCase() : "";
      if (texto.includes("expir")) setEstado("EXPIRADO");
      else
        setErro(
          error instanceof AuthApiError
            ? error.message
            : "Não foi possível redefinir a senha.",
        );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthPage>
      <AuthLogo compact />
      {estado === "VALIDANDO" && (
        <div className="py-4 text-center" role="status">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          <p className="login-panel-subtitle mt-2 text-[12px]">
            Validando link...
          </p>
        </div>
      )}
      {(estado === "INVALIDO" || estado === "EXPIRADO") && (
        <>
          <AuthHeading
            title="Redefinir senha"
            description={
              estado === "EXPIRADO"
                ? "Este link expirou. Solicite uma nova redefinição de senha."
                : "Este link de redefinição não é válido."
            }
          />
          <Link
            to="/recuperar-senha"
            className="login-submit-glass inline-flex h-[44px] w-full items-center justify-center rounded-[8px] text-[13px] font-semibold tracking-wide"
          >
            Solicitar novo link
          </Link>
        </>
      )}
      {estado === "VALIDO" && (
        <>
          <AuthHeading
            title="Defina uma nova senha"
            description="Defina a nova senha que será utilizada para acessar a Aurit."
          />
          <form onSubmit={salvar} className="space-y-3" noValidate>
            <NovaSenhaFields
              novaSenha={novaSenha}
              confirmarSenha={confirmarSenha}
              onNovaSenha={setNovaSenha}
              onConfirmarSenha={setConfirmarSenha}
              disabled={enviando}
            />
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
              loadingLabel="Redefinindo senha..."
              disabled={
                !novaSenha ||
                novaSenha !== confirmarSenha ||
                !Object.values(senhaAtendePolitica(novaSenha)).every(Boolean)
              }
            >
              Redefinir senha
            </AuthSubmit>
          </form>
        </>
      )}
      {estado === "CONCLUIDO" && (
        <>
          <AuthHeading
            title="Senha redefinida com sucesso."
            description="Você já pode acessar a Aurit."
          />
          <Link
            to="/login"
            className="login-submit-glass inline-flex h-[44px] w-full items-center justify-center rounded-[8px] text-[13px] font-semibold tracking-wide"
          >
            Entrar na Aurit
          </Link>
        </>
      )}
    </AuthPage>
  );
}

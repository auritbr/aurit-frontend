import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeGoogleAuthPlugin {
  signIn(): Promise<{ idToken: string }>;
  clearCredentialState(): Promise<void>;
}

const NativeGoogleAuth =
  registerPlugin<NativeGoogleAuthPlugin>("AuritGoogleAuth");

export function isNativeGoogleLoginAvailable(): boolean {
  return (
    Capacitor.getPlatform() === "android" &&
    Capacitor.isPluginAvailable("AuritGoogleAuth")
  );
}

export async function obterGoogleIdTokenNativo(): Promise<string> {
  if (!isNativeGoogleLoginAvailable()) {
    throw new Error(
      "O acesso com Google não está disponível neste aplicativo.",
    );
  }
  const { idToken } = await NativeGoogleAuth.signIn();
  if (!idToken?.trim() || idToken.length > 16384) {
    throw new Error("Não foi possível obter a credencial do Google.");
  }
  return idToken;
}

export function isNativeGoogleLoginCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "SIGN_IN_CANCELLED"
  );
}

export async function limparSelecaoContaGoogle(): Promise<void> {
  if (!isNativeGoogleLoginAvailable()) return;
  // Uma falha no provedor não deve impedir o encerramento da sessão Aurit.
  await NativeGoogleAuth.clearCredentialState().catch(() => undefined);
}

package br.com.aurit.app;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/** Ponte local: apenas obtém a credencial; a autenticação é validada pelo backend. */
@CapacitorPlugin(name = "AuritGoogleAuth")
public class AuritGoogleAuthPlugin extends Plugin {
    // Os acessos a estes campos são feitos na thread principal.
    private PluginCall pendingSignIn;
    private CancellationSignal cancellation;

    @PluginMethod
    public void signIn(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pendingSignIn != null) {
                call.reject("Já existe um acesso com Google em andamento.", "SIGN_IN_BUSY");
                return;
            }
            String clientId = getConfig().getString("serverClientId", "").trim();
            if (clientId.isEmpty() || getActivity().isFinishing() || getActivity().isDestroyed()) {
                call.reject("O acesso com Google não está disponível agora.", "SIGN_IN_UNAVAILABLE");
                return;
            }
            pendingSignIn = call;
            cancellation = new CancellationSignal();
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                CredentialManager.create(getContext()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, cancellation,
                    ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse result) {
                            if (pendingSignIn != call) return;
                            try {
                                Credential credential = result.getCredential();
                                if (!(credential instanceof CustomCredential)
                                    || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    rejectSignIn(call, "Resposta inválida do Google. Tente novamente.", "SIGN_IN_INVALID_RESPONSE");
                                    return;
                                }
                                String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                if (idToken.isBlank() || idToken.length() > 16384) {
                                    rejectSignIn(call, "Resposta inválida do Google. Tente novamente.", "SIGN_IN_INVALID_RESPONSE");
                                    return;
                                }
                                pendingSignIn = null;
                                cancellation = null;
                                // Não persistir nem registrar o token Google. O JS o envia ao backend.
                                JSObject response = new JSObject();
                                response.put("idToken", idToken);
                                call.resolve(response);
                            } catch (Exception ignored) {
                                rejectSignIn(call, "Não foi possível ler a resposta do Google.", "SIGN_IN_INVALID_RESPONSE");
                            }
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            if (error instanceof GetCredentialCancellationException) {
                                rejectSignIn(call, "Acesso com Google cancelado.", "SIGN_IN_CANCELLED");
                            } else if (error instanceof NoCredentialException) {
                                rejectSignIn(call, "Adicione uma conta Google ao dispositivo e tente novamente.", "SIGN_IN_NO_CREDENTIAL");
                            } else {
                                rejectSignIn(call, "Não foi possível entrar com o Google. Tente novamente.", "SIGN_IN_FAILED");
                            }
                        }
                    }
                );
            } catch (Exception ignored) {
                rejectSignIn(call, "Não foi possível abrir o acesso com Google.", "SIGN_IN_FAILED");
            }
        });
    }

    private void rejectSignIn(PluginCall call, String message, String code) {
        if (pendingSignIn != call) return;
        pendingSignIn = null;
        cancellation = null;
        // Mensagens controladas: exceções do provedor podem conter dados sensíveis.
        call.reject(message, code);
    }

    @PluginMethod
    public void clearCredentialState(PluginCall call) {
        try {
            CredentialManager.create(getContext()).clearCredentialStateAsync(
                new ClearCredentialStateRequest(), null, ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void result) { call.resolve(); }

                    @Override
                    public void onError(ClearCredentialException error) {
                        call.reject("Não foi possível limpar a seleção da conta Google.", "SIGN_OUT_FAILED");
                    }
                }
            );
        } catch (Exception ignored) {
            call.reject("Não foi possível limpar a seleção da conta Google.", "SIGN_OUT_FAILED");
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (pendingSignIn != null) {
            PluginCall call = pendingSignIn;
            CancellationSignal signal = cancellation;
            rejectSignIn(call, "Acesso com Google cancelado.", "SIGN_IN_CANCELLED");
            if (signal != null) signal.cancel();
        }
        super.handleOnDestroy();
    }
}

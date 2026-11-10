package br.com.aurit.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "AuritFileDownload")
public class AuritFileDownloadPlugin extends Plugin {
    private boolean choosingDestination;

    @PluginMethod
    public void save(PluginCall call) {
        String name = call.getString("name", "").trim();
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (name.isEmpty() || call.getString("data", "").isEmpty()) {
            call.reject("Arquivo vazio ou sem nome.");
            return;
        }

        Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType(mimeType);
        picker.putExtra(Intent.EXTRA_TITLE, name);
        getActivity().runOnUiThread(() -> {
            if (choosingDestination) {
                call.reject("Conclua o download aberto antes de iniciar outro.");
                return;
            }
            choosingDestination = true;
            try {
                startActivityForResult(call, picker, "saveResult");
            } catch (RuntimeException exception) {
                choosingDestination = false;
                call.reject("Não foi possível abrir o seletor de arquivos.");
            }
        });
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        choosingDestination = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.resolve();
            return;
        }

        Uri destination = result.getData() == null ? null : result.getData().getData();
        if (destination == null) {
            call.reject("O Android não retornou um destino para o arquivo.");
            return;
        }

        getBridge().execute(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(destination)) {
                if (output == null) throw new IOException("Destino indisponível");
                output.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            } catch (IOException | IllegalArgumentException | SecurityException exception) {
                call.reject("Não foi possível salvar o arquivo.");
                return;
            }
            call.resolve();
        });
    }
}

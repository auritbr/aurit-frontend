package br.com.aurit.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AuritGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

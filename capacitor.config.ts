import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.aurit.app",
  appName: "Aurit",
  webDir: "dist-mobile",
  loggingBehavior: "none",
  server: {
    hostname: "localhost",
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SystemBars: { insetsHandling: "native" },
    AuritGoogleAuth: {
      serverClientId:
        "600786194492-32tnf0m5262pos3ajpikg5mk76pqnq35.apps.googleusercontent.com",
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "android") {
    const { VITE_API_URL } = loadEnv(mode, process.cwd(), "VITE_");
    const api = new URL(VITE_API_URL);
    if (
      api.protocol !== "https:" ||
      ["localhost", "127.0.0.1"].includes(api.hostname)
    ) {
      throw new Error(
        "O aplicativo Android exige uma API pública HTTPS em VITE_API_URL.",
      );
    }
  }
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});

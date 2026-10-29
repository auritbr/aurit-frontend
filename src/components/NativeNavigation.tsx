import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/** Preserva o comportamento do navegador; trata o botão voltar somente no app. */
export function NativeNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (pathname === "/" || pathname === "/login") {
        void App.minimizeApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate, pathname]);

  return null;
}

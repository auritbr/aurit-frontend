import { useEffect } from "react";

const VLIBRAS_SCRIPT_ID = "vlibras-widget-script";
const VLIBRAS_APP_URL = "https://vlibras.gov.br/app";

export function VLibrasWidget() {
  useEffect(() => {
    if (window.__vlibrasWidgetInitialized) return;

    let attempts = 0;
    let retryId: number | undefined;

    const initWidget = () => {
      if (window.__vlibrasWidgetInitialized) return true;
      if (!window.VLibras?.Widget) return false;

      new window.VLibras.Widget(VLIBRAS_APP_URL);
      window.__vlibrasWidgetInitialized = true;
      return true;
    };

    const retryInitWidget = () => {
      if (initWidget()) return;

      retryId = window.setInterval(() => {
        attempts += 1;

        if (initWidget() || attempts >= 40) {
          window.clearInterval(retryId);
        }
      }, 250);
    };

    const existingScript = document.getElementById(
      VLIBRAS_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      retryInitWidget();
      existingScript.addEventListener("load", retryInitWidget, { once: true });

      return () => {
        if (retryId) window.clearInterval(retryId);
        existingScript.removeEventListener("load", retryInitWidget);
      };
    }

    const script = document.createElement("script");
    script.id = VLIBRAS_SCRIPT_ID;
    script.src = `${VLIBRAS_APP_URL}/vlibras-plugin.js`;
    script.async = true;
    script.onload = retryInitWidget;

    document.body.appendChild(script);

    return () => {
      if (retryId) window.clearInterval(retryId);
    };
  }, []);

  return (
    <div {...{ vw: "" }} className="enabled aurit-vlibras-widget">
      <div {...{ "vw-access-button": "" }} className="active" />
      <div {...{ "vw-plugin-wrapper": "" }}>
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}

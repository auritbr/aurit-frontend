import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
    __vlibrasWidgetInstance?: unknown;
  }
}

const SCRIPT_ID = "vlibras-script";
const VL_URL = "https://vlibras.gov.br/app";

export default function VLibras() {
  const location = useLocation();

  useEffect(() => {
    function removeOldContainer() {
      const oldContainer = document.querySelector("[vw]");
      if (oldContainer) {
        oldContainer.remove();
      }
    }

    function createContainer() {
      const container = document.createElement("div");
      container.setAttribute("vw", "");
      container.className = "enabled";

      container.innerHTML = `
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      `;

      document.body.appendChild(container);
    }

    function initVLibras() {
      try {
        if (!window.VLibras) return;

        window.__vlibrasWidgetInstance = new window.VLibras.Widget(VL_URL);
      } catch (error) {
        console.warn("VLibras init failed:", error);
      }
    }

    function setupVLibras() {
      removeOldContainer();
      createContainer();

      const existingScript = document.getElementById(
        SCRIPT_ID
      ) as HTMLScriptElement | null;

      if (existingScript) {
        initVLibras();
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `${VL_URL}/vlibras-plugin.js`;
      script.async = true;
      script.onload = initVLibras;
      script.onerror = () => {
        console.warn("Não foi possível carregar o script do VLibras.");
      };

      document.body.appendChild(script);
    }

    const timer = window.setTimeout(() => {
      setupVLibras();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.pathname]);

  return null;
}
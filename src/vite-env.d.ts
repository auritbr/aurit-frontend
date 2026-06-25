/// <reference types="vite/client" />

interface Window {
  resetInactivityTimer?: () => void;
  __vlibrasWidgetInitialized?: boolean;
  VLibras?: {
    Widget: new (appUrl: string) => unknown;
  };
}

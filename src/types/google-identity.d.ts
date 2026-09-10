/**
 * Tipagem mínima do Google Identity Services para o OAuth Code Model.
 * A Aurit utiliza apenas o popup OAuth oficial, que devolve um código de
 * autorização ao backend.
 */
export interface GoogleCodeResponse {
  code?: string;
  scope?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleCodeClientError {
  type: "popup_failed_to_open" | "popup_closed" | "unknown";
}

export interface GoogleCodeClientConfiguration {
  client_id: string;
  scope: string;
  callback: (response: GoogleCodeResponse) => void;
  ux_mode?: "popup" | "redirect";
  select_account?: boolean;
  error_callback?: (error: GoogleCodeClientError) => void;
}

export interface GoogleCodeClient {
  requestCode: () => void;
}

export interface GoogleAccountsOAuth2 {
  initCodeClient: (config: GoogleCodeClientConfiguration) => GoogleCodeClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOAuth2;
      };
    };
  }
}

export {};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `Erro ${response.status} ao processar requisição.`;
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

export interface DashboardResumoDTO {
  nomeOrganizacao: string;

  possuiOrganizacao: boolean;
  possuiEquipe: boolean;
  possuiProjetos: boolean;
  possuiExecucao: boolean;
  documentosProntos: boolean;
  possuiFinanceiro: boolean;
  prontoParaEdital: boolean;
  prontoParaPrestacao: boolean;

  totalParticipantes: number;
  totalColaboradores: number;
  totalIntegrantes: number;
  totalProjetos: number;
  totalAtividades: number;
  totalEventosCulturais: number;
  totalAcoesDivulgacao: number;
  totalFinanceiros: number;
  totalDocumentosAtualizados: number;
  totalDocumentosVencidos: number;
}

export async function getDashboardResumo(): Promise<DashboardResumoDTO> {
  const response = await fetch(`${API_URL}/dashboard/resumo`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
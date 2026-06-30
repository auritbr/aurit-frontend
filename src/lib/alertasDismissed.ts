const ALERTAS_DISPENSADOS_STORAGE_KEY = "aurit:alertas-popover:dispensados";

export const ALERTAS_DISPENSADOS_EVENT = "aurit:alertas-dispensados";

export function alertaDocumentoId(id: number | string) {
  return `doc-${id}`;
}

export function alertaEditalId(id: number | string) {
  return `ed-${id}`;
}

export function alertaEmprestimoId(id: number | string) {
  return `emp-${id}`;
}

export function alertaAusenciaId(params: {
  participanteId: number | string;
  atividadeId: number | string;
  turmaId?: number | string | null;
  turmaNome?: string | null;
  quantidade: number | string;
  ultimaAusencia: string;
}) {
  return `presenca-${params.participanteId}-${params.atividadeId}-${
    params.turmaId ?? params.turmaNome ?? "sem-turma"
  }-${params.quantidade}-${params.ultimaAusencia}`;
}

export function getAlertasDispensados() {
  try {
    const raw = localStorage.getItem(ALERTAS_DISPENSADOS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function setAlertasDispensados(ids: string[]) {
  try {
    localStorage.setItem(
      ALERTAS_DISPENSADOS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids))),
    );
  } catch {
    // Se o storage falhar, os alertas continuam funcionando na sessão atual.
  }
}

export function addAlertasDispensados(ids: string[]) {
  if (ids.length === 0) return;

  setAlertasDispensados([...getAlertasDispensados(), ...ids]);
  window.dispatchEvent(new Event(ALERTAS_DISPENSADOS_EVENT));
  window.dispatchEvent(new Event("storage"));
}

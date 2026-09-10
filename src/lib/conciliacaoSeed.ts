const KEY = "aurit:conciliacao-bancaria:novo-registro";

export interface ConciliacaoSeed {
  nome: string;
  valor: string;
  data: string;
  contaBancariaId: string;
}

export function setConciliacaoSeed(
  tipo: "conta-pagar" | "conta-receber",
  data: ConciliacaoSeed,
) {
  sessionStorage.setItem(KEY, JSON.stringify({ tipo, data }));
}

export function getConciliacaoSeed() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as {
      tipo: "conta-pagar" | "conta-receber";
      data: ConciliacaoSeed;
    };
  } catch {
    return null;
  }
}

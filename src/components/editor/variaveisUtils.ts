import type { VariavelDocumento } from "@/data/modeloDocumento";

export interface GrupoVariaveis {
  grupo: string;
  itens: VariavelDocumento[];
}

const normalize = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Agrupa as variáveis pelo grupo informado pelo backend e aplica a busca
 * pelo nome amigável (também considera descrição e chave como apoio).
 */
export function agruparVariaveis(
  variaveis: VariavelDocumento[],
  busca = "",
): GrupoVariaveis[] {
  const termo = normalize(busca);
  const filtradas = termo
    ? variaveis.filter(
        (v) =>
          normalize(v.nome).includes(termo) ||
          normalize(v.grupo).includes(termo) ||
          normalize(v.descricao || "").includes(termo) ||
          normalize(v.chave).includes(termo),
      )
    : variaveis;

  const mapa = new Map<string, VariavelDocumento[]>();
  filtradas.forEach((v) => {
    const grupo = v.grupo || "Outras";
    const atual = mapa.get(grupo) || [];
    atual.push(v);
    mapa.set(grupo, atual);
  });

  return [...mapa.entries()].map(([grupo, itens]) => ({ grupo, itens }));
}

/** Nome amigável de uma chave, quando encontrada na lista do backend. */
export function nomeAmigavelDaChave(
  chave: string,
  variaveis: VariavelDocumento[],
): string | undefined {
  return variaveis.find((v) => v.chave === chave)?.nome;
}

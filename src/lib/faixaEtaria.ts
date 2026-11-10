import type { IndicadorItem } from "@/data/participantes";

export const faixasEtarias = [
  {
    categoria: "DE_0_A_6_ANOS",
    label: "Primeira infância (de 0 a 6 anos)",
    limite: 6,
  },
  {
    categoria: "DE_7_A_13_ANOS",
    label: "Crianças (de 7 a 13 anos)",
    limite: 13,
  },
  {
    categoria: "DE_14_A_17_ANOS",
    label: "Adolescentes (de 14 a 17 anos)",
    limite: 17,
  },
  {
    categoria: "DE_18_A_29_ANOS",
    label: "Jovens (de 18 a 29 anos)",
    limite: 29,
  },
  {
    categoria: "DE_30_A_59_ANOS",
    label: "Adultos (de 30 a 59 anos)",
    limite: 59,
  },
  {
    categoria: "DE_60_A_79_ANOS",
    label: "Idosos (de 60 a 79 anos)",
    limite: 79,
  },
  {
    categoria: "80_ANOS_OU_MAIS",
    label: "Idosos em Idade Avançada (de 80 anos ou mais)",
    limite: Infinity,
  },
] as const;

export function faixaEtaria(
  dataNascimento?: string,
  hoje = new Date(),
): string {
  if (!dataNascimento) return "NAO_INFORMADO";
  const partes = dataNascimento.includes("/")
    ? dataNascimento.split("/").reverse()
    : dataNascimento.slice(0, 10).split("-");
  if (partes.length !== 3 || partes.some((parte) => !/^\d+$/.test(parte)))
    return "NAO_INFORMADO";
  const [ano, mes, dia] = partes.map(Number);
  const nascimento = new Date(ano, mes - 1, dia);
  if (
    Number.isNaN(nascimento.getTime()) ||
    nascimento.getFullYear() !== ano ||
    nascimento.getMonth() !== mes - 1 ||
    nascimento.getDate() !== dia ||
    nascimento > hoje
  )
    return "NAO_INFORMADO";
  let idade = hoje.getFullYear() - ano;
  if (
    hoje.getMonth() < mes - 1 ||
    (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)
  )
    idade--;
  return (
    faixasEtarias.find((faixa) => idade <= faixa.limite)?.categoria ??
    "NAO_INFORMADO"
  );
}

export function ordenarFaixasEtarias(
  itens: readonly IndicadorItem[],
): IndicadorItem[] {
  const porCategoria = new Map(itens.map((item) => [item.categoria, item]));
  return [
    ...faixasEtarias.map(
      ({ categoria }) =>
        porCategoria.get(categoria) ?? { categoria, total: 0, percentual: 0 },
    ),
    ...itens.filter(
      (item) =>
        !faixasEtarias.some((faixa) => faixa.categoria === item.categoria),
    ),
  ];
}

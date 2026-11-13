import type { Atividade } from "@/data/atividades";
import type { Participante } from "@/data/participantes";
import {
  dataEstudoISO,
  formatBRL,
  generoLabel,
  type EstudoSocioeconomico,
  type Indicadores,
  type SimNao,
} from "@/lib/estudosSocioeconomicos";

export { dataEstudoISO };
export const NAO_INFORMADO = "Não informado";
export const FAIXAS_ETARIAS = [
  "0 a 5 anos",
  "6 a 11 anos",
  "12 a 17 anos",
  "18 a 29 anos",
  "30 a 59 anos",
  "60 anos ou mais",
] as const;
export const FAIXAS_RENDA = [
  "Até R$ 500",
  "R$ 500,01 a R$ 1.000",
  "R$ 1.000,01 a R$ 2.000",
  "R$ 2.000,01 a R$ 5.000",
  "Acima de R$ 5.000",
] as const;
export interface FiltrosPerfil {
  participanteId: string;
  inicio: string;
  fim: string;
  projetoId: string;
  atividadeId: string;
  faixaEtaria: string;
}
export const filtrosPerfilIniciais: FiltrosPerfil = {
  participanteId: "TODOS",
  inicio: "",
  fim: "",
  projetoId: "TODOS",
  atividadeId: "TODAS",
  faixaEtaria: "TODAS",
};
export interface LinhaPerfil {
  estudo: EstudoSocioeconomico;
  ind: Indicadores;
  nome: string;
  idade: number | null;
  faixaEtaria: string;
  genero: string;
}
const faixaEtariaDe = (idade: number | null) =>
  idade === null
    ? NAO_INFORMADO
    : FAIXAS_ETARIAS[
        [5, 11, 17, 29, 59].filter((limite) => idade > limite).length
      ];
export const faixaRendaDe = (valor: number | null) =>
  valor === null
    ? NAO_INFORMADO
    : FAIXAS_RENDA[
        [500, 1000, 2000, 5000].filter((limite) => valor > limite).length
      ];

export function filtrarEstudos(
  estudos: EstudoSocioeconomico[],
  f: FiltrosPerfil,
  ignorarPeriodo: boolean,
  participantes: Pick<Participante, "id" | "vinculos">[],
  atividades: Atividade[],
): LinhaPerfil[] {
  const vinculos = new Map(participantes.map((p) => [p.id, p.vinculos]));
  const projetos = new Map(atividades.map((a) => [a.id, a.projetoId]));
  return estudos.flatMap((estudo) => {
    const faixaEtaria = faixaEtariaDe(estudo.idade);
    if (
      f.participanteId !== "TODOS" &&
      estudo.participanteId !== f.participanteId
    )
      return [];
    if (f.faixaEtaria !== "TODAS" && faixaEtaria !== f.faixaEtaria) return [];
    if (f.projetoId !== "TODOS" || f.atividadeId !== "TODAS") {
      const corresponde = vinculos
        .get(estudo.participanteId)
        ?.some(
          (v) =>
            (f.atividadeId === "TODAS" || f.atividadeId === v.atividadeId) &&
            (f.projetoId === "TODOS" ||
              f.projetoId === projetos.get(v.atividadeId)),
        );
      if (!corresponde) return [];
    }
    const data = dataEstudoISO(estudo.dataEstudo);
    if (
      !ignorarPeriodo &&
      ((f.inicio && (!data || data < f.inicio)) ||
        (f.fim && (!data || data > f.fim)))
    )
      return [];
    return [
      {
        estudo,
        ind: estudo.indicadores,
        idade: estudo.idade,
        faixaEtaria,
        nome: estudo.retrato.nomeCompleto || NAO_INFORMADO,
        genero:
          generoLabel(estudo.sexo) || estudo.retrato.genero || NAO_INFORMADO,
      },
    ];
  });
}

export function selecionarEstudosMaisRecentes(
  linhas: LinhaPerfil[],
): LinhaPerfil[] {
  const ordenadas = [...linhas].sort(
    (a, b) =>
      dataEstudoISO(b.estudo.dataEstudo).localeCompare(
        dataEstudoISO(a.estudo.dataEstudo),
      ) || b.estudo.criadoEm.localeCompare(a.estudo.criadoEm),
  );
  const vistos = new Set<string>();
  return ordenadas.filter(({ estudo }) => {
    if (vistos.has(estudo.participanteId)) return false;
    vistos.add(estudo.participanteId);
    return true;
  });
}
const validos = (valores: (number | null)[]) =>
  valores.filter((v): v is number => v !== null && Number.isFinite(v));
export function media(valores: (number | null)[]) {
  const nums = validos(valores);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}
export function mediana(valores: (number | null)[]) {
  const nums = validos(valores).sort((a, b) => a - b);
  if (!nums.length) return null;
  const meio = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[meio] : (nums[meio - 1] + nums[meio]) / 2;
}
export function somaConhecida(valores: (number | null)[]) {
  const nums = validos(valores);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}
export function respostasSimNao(
  linhas: LinhaPerfil[],
  ler: (e: EstudoSocioeconomico) => SimNao,
) {
  const valores = linhas
    .map((l) => ler(l.estudo))
    .filter((v) => v === "sim" || v === "nao");
  const sim = valores.filter((v) => v === "sim").length;
  return {
    sim,
    nao: valores.length - sim,
    validas: valores.length,
    pct: valores.length ? (sim / valores.length) * 100 : null,
  };
}
export function contarCategorias(
  valores: (string | null | undefined)[],
  ordem?: readonly string[],
  incluirNaoInformado = true,
) {
  const contagem = new Map<string, number>();
  for (const valor of valores) {
    const nome = valor?.trim() || NAO_INFORMADO;
    if (incluirNaoInformado || nome !== NAO_INFORMADO)
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  const rank = (nome: string) =>
    ordem?.includes(nome) ? ordem.indexOf(nome) : Infinity;
  return [...contagem]
    .map(([name, value]) => ({ name, value }))
    .sort(
      (a, b) =>
        rank(a.name) - rank(b.name) ||
        b.value - a.value ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}
export const contarMultiplas = (
  linhas: LinhaPerfil[],
  ler: (e: EstudoSocioeconomico) => string[],
  ordem?: readonly string[],
) =>
  contarCategorias(
    linhas.flatMap((l) => ler(l.estudo)),
    ordem,
    false,
  );
export function temBeneficioSocial(e: EstudoSocioeconomico) {
  const respostas = [
    e.bolsaFamilia,
    e.bpc,
    e.peDeMeia,
    e.dignidadePessoal,
    e.pensao,
    ...e.auxilios.map((a) => a.recebe),
  ];
  if (
    respostas.includes("sim") ||
    e.outrosBeneficios.some((b) => b.descricao.trim())
  )
    return true;
  return respostas.includes("nao") ? false : null;
}
export const formatarMoeda = (valor: number | null) =>
  valor === null ? "Não calculado" : formatBRL(valor);
export const formatarNumero = (valor: number | null, casas = 1) =>
  valor === null
    ? "Não calculado"
    : valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
export const formatarPercentual = (valor: number | null) =>
  valor === null ? "Não calculado" : formatarNumero(valor) + "%";
export const simNaoLabel = (valor: SimNao) =>
  valor === "sim" ? "Sim" : valor === "nao" ? "Não" : NAO_INFORMADO;
export const listaOuNaoInformado = (valores: string[]) =>
  valores.length ? valores.join(", ") : NAO_INFORMADO;

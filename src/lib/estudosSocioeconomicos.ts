import { apiFetch } from "@/lib/api";
import { generoOptions } from "@/data/participantes";

const endpoint = "/estudos-socioeconomicos";
export type SimNao = "" | "sim" | "nao";
export const diasFrequencia = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
];
export const DESPESAS_FIXAS = [
  ["agua", "Água", "agua"],
  ["energia", "Energia elétrica", "energiaEletrica"],
  ["alimentacao", "Alimentação", "alimentacao"],
  ["emprestimos", "Empréstimos / Contas mensais", "emprestimosContasMensais"],
  ["aluguel", "Aluguel", "aluguel"],
  ["internet", "Internet", "internet"],
  ["medicacao", "Medicação", "medicacao"],
  ["impostos", "Impostos", "impostos"],
  ["educacao", "Educação", "educacao"],
  ["transporte", "Transporte", "transporte"],
] as const;
const comodos = [
  "quartos",
  "salas",
  "cozinhas",
  "banheiros",
  "garagens",
  "lavanderias",
] as const;
type Campos<T extends readonly string[]> = Record<T[number], string>;
type Item = { id: string; descricao: string; valor: string };
type Familiar = {
  id: string;
  nome: string;
  parentesco: string;
  dataNascimento: string;
  idadeDeclarada: string;
  ocupacao: string;
  escolaridade: string;
  renda: string;
  situacaoTrabalho: string;
  proprioParticipante?: boolean;
  idadeNoEstudo?: number | null;
};
export type RetratoParticipante = Record<
  | "nomeCompleto"
  | "dataNascimento"
  | "cpf"
  | "rg"
  | "genero"
  | "endereco"
  | "bairro"
  | "cep"
  | "telefone"
  | "email",
  string
>;

export function estudoVazio() {
  return {
    participanteId: "",
    dataEstudo: new Date().toLocaleDateString("pt-BR"),
    possuiNomeSocial: "" as SimNao,
    nomeSocial: "",
    sexo: "",
    nis: "",
    whatsapp: "",
    contatoRecados: "",
    etnia: "",
    diasFrequencia: [] as string[],
    escola: "",
    anoEscolar: "",
    moraCom: "",
    moraComOutro: "",
    condicaoResidencia: "",
    comodos: Object.fromEntries(comodos.map((k) => [k, ""])) as Campos<
      typeof comodos
    >,
    acessoInternet: "" as SimNao,
    meiosInternet: [] as string[],
    utensilios: [] as string[],
    energia: "",
    agua: "",
    fossa: "" as SimNao,
    esgoto: "" as SimNao,
    coletaLixo: "" as SimNao,
    pavimentacao: "",
    enchentes: "" as SimNao,
    obsInfraestrutura: "",
    transporteParticipante: [] as string[],
    transporteFamilia: [] as string[],
    possuiVeiculo: "" as SimNao,
    veiculoMarcaAno: "",
    maisDeUmVeiculo: "" as SimNao,
    integrantes: [] as Familiar[],
    composicaoCompleta: false,
    bolsaFamilia: "" as SimNao,
    bpc: "" as SimNao,
    bpcValor: "",
    outrosBeneficios: [] as Item[],
    peDeMeia: "" as SimNao,
    dignidadePessoal: "" as SimNao,
    reclusao: "" as SimNao,
    reclusaoQuem: "",
    tratamentoSaude: "" as SimNao,
    tratamentoQuem: "",
    auxilios: [] as (Item & { recebe: SimNao })[],
    pensao: "" as SimNao,
    pensaoQuemRecebe: "",
    pensaoValor: "",
    despesas: Object.fromEntries(
      DESPESAS_FIXAS.map(([k]) => [k, ""]),
    ) as Record<(typeof DESPESAS_FIXAS)[number][0], string>,
    outrasDespesas: [] as Item[],
    receitas: [] as Item[],
    obsFinanceiras: "",
    observacoes: "",
  };
}
export type DadosEstudo = ReturnType<typeof estudoVazio>;
export type Indicadores = {
  totalReceitas: number | null;
  receitasParciais: boolean;
  totalDespesas: number | null;
  despesasCompletas: boolean;
  rendaFamiliar: number | null;
  pessoasFamilia: number;
  composicaoCompleta: boolean;
  rendaPerCapita: number | null;
  resultadoMensal: number | null;
  saldoMensalParcial: boolean;
};
export type EstudoSocioeconomico = DadosEstudo & {
  id: string;
  ativo: boolean;
  situacao: "RASCUNHO" | "CONCLUIDO";
  retrato: RetratoParticipante;
  idade: number | null;
  indicadores: Indicadores;
  criadoEm: string;
  atualizadoEm: string | null;
};

export const dataBR = (iso?: string | null) =>
  iso ? iso.split("-").reverse().join("/") : "";
export function dataEstudoISO(br: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return "";
  const iso = [m[3], m[2], m[1]].join("-");
  const data = new Date(iso + "T12:00:00Z");
  return Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
export function idadeDe(br: string, referencia: string): number | null {
  const nascimento = dataEstudoISO(br);
  if (!nascimento || !referencia || nascimento > referencia) return null;
  return (
    Number(referencia.slice(0, 4)) -
    Number(nascimento.slice(0, 4)) -
    Number(referencia.slice(5) < nascimento.slice(5))
  );
}
export const generoLabel = (v?: string | null) =>
  generoOptions.find((o) => o.value === v)?.label ?? v ?? "";
export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function parseValor(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const dinheiro = (n: number | null | undefined) =>
  n == null
    ? ""
    : n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export const maskMoeda = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 15);
  return digits ? dinheiro(Number(digits) / 100) : "";
};
const simNao = (v?: boolean | null): SimNao =>
  v == null ? "" : v ? "sim" : "nao";
const booleano = (v: SimNao) => (v === "" ? null : v === "sim");
function opcoes(mapa: Record<string, string>) {
  return {
    ler: (v?: string | null) => (v ? (mapa[v] ?? "") : ""),
    gravar: (v: string) => Object.keys(mapa).find((k) => mapa[k] === v) ?? null,
    lista: (v?: string[] | null) =>
      (v ?? []).map((k) => mapa[k]).filter(Boolean),
    gravarLista: (v: string[]) =>
      Object.keys(mapa).filter((k) => v.includes(mapa[k])),
  };
}
const dias = opcoes(
  Object.fromEntries(
    ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"].map((k, i) => [
      k + "_FEIRA",
      diasFrequencia[i],
    ]),
  ),
);
const mora = opcoes({
  FAMILIA: "Família",
  SOZINHO: "Sozinho",
  PARENTES: "Parentes",
  INSTITUICAO: "Instituição",
  OUTRO: "Outro",
});
const residencia = opcoes({
  ALUGADA: "Alugada",
  PROPRIA: "Própria",
  FINANCIADA: "Financiada",
  CEDIDA: "Cedida",
  INVADIDA_OCUPADA: "Invadida / Ocupada",
  CASEIRO: "Caseiro",
  OUTRA: "Outra",
});
const meios = opcoes({
  CELULAR_PROPRIO: "Celular próprio",
  CELULAR_RESPONSAVEL: "Celular do pai, mãe ou responsável",
  COMPUTADOR_PROPRIO: "Computador próprio",
});
const utensilios = opcoes({
  GELADEIRA: "Geladeira",
  FREEZER: "Freezer",
  MICRO_ONDAS: "Micro-ondas",
  TELEVISOR: "Televisor",
  MAQUINA_LAVAR_TANQUINHO: "Máquina de lavar roupas / tanquinho",
});
const energia = opcoes({
  REGULARIZADA: "regularizada",
  NAO_REGULARIZADA: "nao_regularizada",
  NAO_INFORMADO: "nao_informado",
});
const agua = opcoes({
  REGULARIZADO: "regularizado",
  NAO_REGULARIZADO: "nao_regularizado",
  FONTE_NATURAL_CACHOEIRA: "fonte_natural",
  NAO_INFORMADO: "nao_informado",
});
const pavimento = opcoes({
  PAVIMENTADA: "pavimentada",
  NAO_PAVIMENTADA: "nao_pavimentada",
  NAO_INFORMADO: "nao_informado",
});
const transporte = opcoes({
  BICICLETA: "Bicicleta",
  A_PE: "A pé",
  ONIBUS: "Ônibus",
  VEICULO_PROPRIO: "Veículo próprio",
});
const trabalho = opcoes({
  AUTONOMO: "Autônomo",
  CTPS_CONCURSADO: "CTPS / Concursado",
  APOSENTADO_PENSIONISTA: "Aposentado / Pensionista",
  MERCADO_INFORMAL: "Mercado Informal",
  DESEMPREGADO: "Desempregado",
});
const inteiro = (v: string) => (v === "" ? null : Number(v));
const texto = (v: string) => v.trim() || null;
const gravarItem = (item: Item) => ({
  id: item.id.startsWith("novo-") ? null : item.id,
  descricao: texto(item.descricao),
  valorMensal: parseValor(item.valor),
});

function gravacao(f: DadosEstudo, id?: string) {
  return {
    participanteId: id ? undefined : Number(f.participanteId),
    dataEstudo: dataEstudoISO(f.dataEstudo) || null,
    dados: {
      identificacaoComplementar: {
        nomeSocial: texto(f.nomeSocial),
        sexo: texto(f.sexo),
        nis: texto(f.nis),
        whatsapp: texto(f.whatsapp),
      },
      complementares: {
        utilizaNomeSocial: booleano(f.possuiNomeSocial),
        contatoRecados: texto(f.contatoRecados),
        etnia: texto(f.etnia),
        diasFrequencia: dias.gravarLista(f.diasFrequencia),
        escola: texto(f.escola),
        anoEscolar: texto(f.anoEscolar),
      },
      composicaoFamiliarConfirmada: f.composicaoCompleta,
      habitacao: {
        moraCom: mora.gravar(f.moraCom),
        descricaoMoraCom: texto(f.moraComOutro),
        condicaoResidencia: residencia.gravar(f.condicaoResidencia),
        ...Object.fromEntries(comodos.map((k) => [k, inteiro(f.comodos[k])])),
        acessoInternet: booleano(f.acessoInternet),
        meiosInternet: meios.gravarLista(f.meiosInternet),
        utensiliosDomesticos: utensilios.gravarLista(f.utensilios),
      },
      infraestrutura: {
        energiaEletrica: energia.gravar(f.energia),
        abastecimentoAgua: agua.gravar(f.agua),
        fossaSeptica: booleano(f.fossa),
        redeEsgoto: booleano(f.esgoto),
        coletaLixo: booleano(f.coletaLixo),
        pavimentacao: pavimento.gravar(f.pavimentacao),
        enchentesAlagamentos: booleano(f.enchentes),
        observacoes: texto(f.obsInfraestrutura),
      },
      transporte: {
        transporteParticipante: transporte.gravarLista(
          f.transporteParticipante,
        ),
        transporteFamilia: transporte.gravarLista(f.transporteFamilia),
        possuiVeiculo: booleano(f.possuiVeiculo),
        marcaAnoVeiculo: texto(f.veiculoMarcaAno),
        possuiMaisDeUmVeiculo: booleano(f.maisDeUmVeiculo),
      },
      beneficios: {
        bolsaFamilia: booleano(f.bolsaFamilia),
        bpc: booleano(f.bpc),
        valorBpc: parseValor(f.bpcValor),
        peDeMeia: booleano(f.peDeMeia),
        dignidadePessoal: booleano(f.dignidadePessoal),
        familiarEmReclusao: booleano(f.reclusao),
        identificacaoFamiliarEmReclusao: texto(f.reclusaoQuem),
        familiarEmTratamento: booleano(f.tratamentoSaude),
        identificacaoFamiliarEmTratamento: texto(f.tratamentoQuem),
        recebePensaoAlimenticia: booleano(f.pensao),
        beneficiarioPensao: texto(f.pensaoQuemRecebe),
        valorPensao: parseValor(f.pensaoValor),
      },
      despesas: Object.fromEntries(
        DESPESAS_FIXAS.map(([k, , api]) => [api, parseValor(f.despesas[k])]),
      ),
      observacoesReceitasDespesas: texto(f.obsFinanceiras),
      observacoesEstudo: texto(f.observacoes),
    },
    familiares: f.integrantes.map((m) => ({
      id: m.id.startsWith("novo-") ? null : m.id,
      nomeCompleto: texto(m.nome),
      parentesco: texto(m.parentesco),
      dataNascimento: dataEstudoISO(m.dataNascimento) || null,
      idadeDeclarada: inteiro(m.idadeDeclarada),
      ocupacao: texto(m.ocupacao),
      escolaridade: texto(m.escolaridade),
      rendaMensal: parseValor(m.renda),
      situacaoTrabalho: trabalho.gravar(m.situacaoTrabalho),
    })),
    outrosBeneficios: f.outrosBeneficios.map(gravarItem),
    auxiliosAdicionais: f.auxilios.map((a) => ({
      ...gravarItem(a),
      recebe: booleano(a.recebe),
    })),
    receitas: f.receitas.map(gravarItem),
    outrasDespesas: f.outrasDespesas.map(gravarItem),
  };
}

type Opcional<T> = T extends object
  ? { [K in keyof T]?: Opcional<T[K]> | null }
  : T;
type Gravacao = ReturnType<typeof gravacao>;
type ValorAPI = {
  id: string;
  descricao: string | null;
  valorMensal: number | null;
};
type IndicadoresAPI = {
  totalReceitas: number | null;
  receitasParciais: boolean;
  totalDespesas: number | null;
  despesasParciais: boolean;
  rendaFamiliar: number | null;
  quantidadePessoasFamilia: number;
  composicaoFamiliarCompleta: boolean;
  rendaPerCapita: number | null;
  saldoMensalEstimadoDeclarado: number | null;
  saldoMensalParcial: boolean;
};
type DetalheAPI = {
  id: string;
  participanteId: number;
  dataEstudo: string | null;
  ativo: boolean;
  situacao: "RASCUNHO" | "CONCLUIDO";
  idade: number | null;
  identificacao: Opcional<
    Omit<RetratoParticipante, "endereco" | "bairro" | "cep"> & {
      endereco: Record<
        | "logradouro"
        | "numero"
        | "complemento"
        | "bairro"
        | "cidade"
        | "estado"
        | "cep",
        string
      >;
    }
  >;
  dados?: Opcional<Gravacao["dados"]> | null;
  familiares: {
    dados: Opcional<Gravacao["familiares"][number]> & { id: string };
    proprioParticipante: boolean;
    idade: number | null;
  }[];
  outrosBeneficios: ValorAPI[];
  auxiliosAdicionais: (ValorAPI & { recebe: boolean | null })[];
  receitas: ValorAPI[];
  outrasDespesas: ValorAPI[];
  indicadores: IndicadoresAPI;
  criadoEm: string;
  atualizadoEm: string | null;
};
export type ResumoEstudo = {
  id: string;
  participanteId: number;
  nomeParticipante: string;
  dataEstudo: string | null;
  quantidadePessoasFamilia: number;
  composicaoFamiliarCompleta: boolean;
  rendaFamiliar: number | null;
  rendaPerCapita: number | null;
  ativo: boolean;
  situacao: "RASCUNHO" | "CONCLUIDO";
};
type Pagina = { registros: ResumoEstudo[]; total: number };

function lerIndicadores(i: IndicadoresAPI): Indicadores {
  return {
    totalReceitas: i.totalReceitas,
    receitasParciais: i.receitasParciais,
    totalDespesas: i.totalDespesas,
    despesasCompletas: !i.despesasParciais,
    rendaFamiliar: i.rendaFamiliar,
    pessoasFamilia: i.quantidadePessoasFamilia,
    composicaoCompleta: i.composicaoFamiliarCompleta,
    rendaPerCapita: i.rendaPerCapita,
    resultadoMensal: i.saldoMensalEstimadoDeclarado,
    saldoMensalParcial: i.saldoMensalParcial,
  };
}

const lerItem = (v: ValorAPI) => ({
  id: v.id,
  descricao: v.descricao ?? "",
  valor: dinheiro(v.valorMensal),
});
const lista = (v?: (string | null | undefined)[] | null) =>
  (v ?? []).filter((k): k is string => typeof k === "string");

function lerEstudo(e: DetalheAPI): EstudoSocioeconomico {
  const d = e.dados;
  const c = d?.complementares;
  const ic = d?.identificacaoComplementar;
  const h = d?.habitacao;
  const i = d?.infraestrutura;
  const t = d?.transporte;
  const b = d?.beneficios;
  const p = e.identificacao;
  const end = p.endereco;
  return {
    id: e.id,
    participanteId: String(e.participanteId),
    dataEstudo: dataBR(e.dataEstudo),
    ativo: e.ativo,
    situacao: e.situacao,
    idade: e.idade,
    indicadores: lerIndicadores(e.indicadores),
    criadoEm: e.criadoEm,
    atualizadoEm: e.atualizadoEm,
    retrato: {
      nomeCompleto: p.nomeCompleto ?? "",
      dataNascimento: dataBR(p.dataNascimento),
      cpf: p.cpf ?? "",
      rg: p.rg ?? "",
      genero: generoLabel(p.genero),
      endereco: [
        end?.logradouro,
        end?.numero,
        end?.complemento,
        [end?.cidade, end?.estado].filter(Boolean).join("/"),
      ]
        .filter(Boolean)
        .join(", "),
      bairro: end?.bairro ?? "",
      cep: end?.cep ?? "",
      telefone: p.telefone ?? "",
      email: p.email ?? "",
    },
    possuiNomeSocial: simNao(c?.utilizaNomeSocial),
    nomeSocial: ic?.nomeSocial ?? "",
    sexo: ic?.sexo ?? "",
    nis: ic?.nis ?? "",
    whatsapp: ic?.whatsapp ?? "",
    contatoRecados: c?.contatoRecados ?? "",
    etnia: c?.etnia ?? "",
    diasFrequencia: dias.lista(lista(c?.diasFrequencia)),
    escola: c?.escola ?? "",
    anoEscolar: c?.anoEscolar ?? "",
    moraCom: mora.ler(h?.moraCom),
    moraComOutro: h?.descricaoMoraCom ?? "",
    condicaoResidencia: residencia.ler(h?.condicaoResidencia),
    comodos: Object.fromEntries(
      comodos.map((k) => [k, String(h?.[k] ?? "")]),
    ) as DadosEstudo["comodos"],
    acessoInternet: simNao(h?.acessoInternet),
    meiosInternet: meios.lista(lista(h?.meiosInternet)),
    utensilios: utensilios.lista(lista(h?.utensiliosDomesticos)),
    energia: energia.ler(i?.energiaEletrica),
    agua: agua.ler(i?.abastecimentoAgua),
    fossa: simNao(i?.fossaSeptica),
    esgoto: simNao(i?.redeEsgoto),
    coletaLixo: simNao(i?.coletaLixo),
    pavimentacao: pavimento.ler(i?.pavimentacao),
    enchentes: simNao(i?.enchentesAlagamentos),
    obsInfraestrutura: i?.observacoes ?? "",
    transporteParticipante: transporte.lista(lista(t?.transporteParticipante)),
    transporteFamilia: transporte.lista(lista(t?.transporteFamilia)),
    possuiVeiculo: simNao(t?.possuiVeiculo),
    veiculoMarcaAno: t?.marcaAnoVeiculo ?? "",
    maisDeUmVeiculo: simNao(t?.possuiMaisDeUmVeiculo),
    integrantes: e.familiares.map(
      ({ dados: m, proprioParticipante, idade }) => ({
        id: m.id,
        nome: m.nomeCompleto ?? "",
        parentesco: m.parentesco ?? "",
        dataNascimento: dataBR(m.dataNascimento),
        idadeDeclarada: String(m.idadeDeclarada ?? ""),
        ocupacao: m.ocupacao ?? "",
        escolaridade: m.escolaridade ?? "",
        renda: dinheiro(m.rendaMensal),
        situacaoTrabalho: trabalho.ler(m.situacaoTrabalho),
        proprioParticipante,
        idadeNoEstudo: idade,
      }),
    ),
    composicaoCompleta: d?.composicaoFamiliarConfirmada === true,
    bolsaFamilia: simNao(b?.bolsaFamilia),
    bpc: simNao(b?.bpc),
    bpcValor: dinheiro(b?.valorBpc),
    peDeMeia: simNao(b?.peDeMeia),
    dignidadePessoal: simNao(b?.dignidadePessoal),
    reclusao: simNao(b?.familiarEmReclusao),
    reclusaoQuem: b?.identificacaoFamiliarEmReclusao ?? "",
    tratamentoSaude: simNao(b?.familiarEmTratamento),
    tratamentoQuem: b?.identificacaoFamiliarEmTratamento ?? "",
    pensao: simNao(b?.recebePensaoAlimenticia),
    pensaoQuemRecebe: b?.beneficiarioPensao ?? "",
    pensaoValor: dinheiro(b?.valorPensao),
    outrosBeneficios: e.outrosBeneficios.map(lerItem),
    auxilios: e.auxiliosAdicionais.map((a) => ({
      ...lerItem(a),
      recebe: simNao(a.recebe),
    })),
    receitas: e.receitas.map(lerItem),
    outrasDespesas: e.outrasDespesas.map(lerItem),
    despesas: Object.fromEntries(
      DESPESAS_FIXAS.map(([k, , api]) => [k, dinheiro(d?.despesas?.[api])]),
    ) as DadosEstudo["despesas"],
    obsFinanceiras: d?.observacoesReceitasDespesas ?? "",
    observacoes: d?.observacoesEstudo ?? "",
  };
}

export async function listarEstudos({
  participanteId,
  incluirInativos = false,
  signal,
}: {
  participanteId?: string;
  incluirInativos?: boolean;
  signal?: AbortSignal;
} = {}) {
  const registros: ResumoEstudo[] = [];
  const tamanho = 100;
  const params = new URLSearchParams({
    tamanho: String(tamanho),
    incluirInativos: String(incluirInativos),
  });
  if (participanteId) params.set("participanteId", participanteId);
  for (let pagina = 0; ; pagina++) {
    signal?.throwIfAborted();
    params.set("pagina", String(pagina));
    const resposta = await apiFetch<Pagina>(endpoint + "?" + params, {
      signal,
    });
    registros.push(...resposta.registros);
    if (
      resposta.registros.length < tamanho ||
      (pagina + 1) * tamanho >= resposta.total
    )
      return registros;
  }
}
export async function obterEstudo(id: string, signal?: AbortSignal) {
  return lerEstudo(
    await apiFetch<DetalheAPI>(endpoint + "/" + encodeURIComponent(id), {
      signal,
    }),
  );
}
export async function obterDetalhesEstudos(
  ids: string[],
  signal?: AbortSignal,
) {
  const detalhes: EstudoSocioeconomico[] = [];
  for (let i = 0; i < ids.length; i += 6) {
    signal?.throwIfAborted();
    detalhes.push(
      ...(await Promise.all(
        ids.slice(i, i + 6).map((id) => obterEstudo(id, signal)),
      )),
    );
  }
  return detalhes;
}
export async function listarDetalhesEstudos(signal?: AbortSignal) {
  const resumos = await listarEstudos({ signal });
  const detalhes = await obterDetalhesEstudos(
    resumos.map((e) => e.id),
    signal,
  );
  return detalhes.filter((e) => e.ativo);
}
export async function salvarEstudo(dados: DadosEstudo, id?: string) {
  const response = await apiFetch<DetalheAPI>(
    id ? endpoint + "/" + encodeURIComponent(id) : endpoint,
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gravacao(dados, id)),
    },
  );
  return lerEstudo(response);
}
export function inativarEstudo(id: string) {
  return apiFetch<void>(endpoint + "/" + encodeURIComponent(id), {
    method: "DELETE",
  });
}
export function concluirEstudo(id: string) {
  return apiFetch<DetalheAPI>(
    endpoint + "/" + encodeURIComponent(id) + "/concluir",
    {
      method: "POST",
    },
  ).then(lerEstudo);
}
export function reabrirEstudo(id: string) {
  return apiFetch<DetalheAPI>(
    endpoint + "/" + encodeURIComponent(id) + "/reabrir",
    {
      method: "POST",
    },
  ).then(lerEstudo);
}

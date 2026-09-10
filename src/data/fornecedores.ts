import { apiFetch } from "@/lib/api";
import type {
  EnderecoCadastro,
  PessoaFisicaCadastro,
  PessoaJuridicaCadastro,
  TipoPessoaCadastro,
} from "@/data/pessoaCadastro";
import {
  formatEnderecoCadastro,
  formatPessoaFisicaCadastro,
  formatPessoaJuridicaCadastro,
} from "@/data/pessoaCadastro";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";

export type TipoPessoa = TipoPessoaCadastro;
export type StatusFornecedor = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";
export const tipoFornecedorValues = [
  "ALIMENTACAO",
  "TRANSPORTE",
  "HOSPEDAGEM",
  "LOCACAO_DE_ESPACO",
  "LOCACAO_DE_EQUIPAMENTOS",
  "MATERIAL_DE_CONSUMO",
  "MATERIAL_DE_ESCRITORIO",
  "MATERIAL_PEDAGOGICO",
  "MATERIAL_GRAFICO",
  "MATERIAL_DE_LIMPEZA",
  "MATERIAL_DE_CONSTRUCAO",
  "EQUIPAMENTOS",
  "INFORMATICA",
  "TECNOLOGIA",
  "INTERNET_E_TELECOMUNICACOES",
  "SOFTWARE_E_SISTEMAS",
  "SERVICOS_CONTABEIS",
  "SERVICOS_JURIDICOS",
  "CONSULTORIA",
  "ASSESSORIA",
  "COMUNICACAO",
  "PUBLICIDADE_E_PROPAGANDA",
  "DESIGN_GRAFICO",
  "FOTOGRAFIA",
  "AUDIOVISUAL",
  "IMPRESSAO_E_GRAFICA",
  "PRODUCAO_CULTURAL",
  "PRODUCAO_DE_EVENTOS",
  "SONORIZACAO",
  "ILUMINACAO",
  "PALCO_E_ESTRUTURA",
  "DECORACAO",
  "SEGURANCA",
  "LIMPEZA",
  "MANUTENCAO",
  "SERVICOS_ELETRICOS",
  "SERVICOS_HIDRAULICOS",
  "SERVICOS_DE_CONSTRUCAO",
  "FRETE_E_LOGISTICA",
  "COMBUSTIVEL",
  "VEICULOS",
  "PASSAGENS",
  "SERVICOS_BANCARIOS",
  "SEGUROS",
  "SAUDE",
  "EDUCACAO_E_CAPACITACAO",
  "ARTISTAS_E_PROFISSIONAIS_DA_CULTURA",
  "SERVICOS_TECNICOS",
  "SERVICOS_ADMINISTRATIVOS",
  "UNIFORMES_E_VESTUARIO",
  "BRINDES_E_MATERIAIS_PROMOCIONAIS",
  "MOBILIARIO",
  "UTENSILIOS",
  "GENEROS_ALIMENTICIOS",
  "OUTRO",
] as const;
export type TipoFornecedor = (typeof tipoFornecedorValues)[number];

export interface Fornecedor {
  id: string;
  observacao: string;
  status: StatusFornecedor;
  tipoFornecedor: TipoFornecedor | "";
  pessoaFisicaId: string;
  pessoaJuridicaId: string;
  organizacaoId: string;
  tipoPessoa: TipoPessoa;
  nomeFornecedor: string;
  documentoFornecedor: string;
  telefone: string;
  email: string;
  pessoaFisica: PessoaFisicaCadastro | null;
  pessoaJuridica: PessoaJuridicaCadastro | null;
  endereco: EnderecoCadastro | null;
}
export interface FornecedorPayload {
  observacao: string | null;
  status: StatusFornecedor;
  tipoFornecedor: TipoFornecedor | null;
  tipoPessoa: TipoPessoa;
  pessoaFisica: PessoaFisicaCadastro | null;
  pessoaJuridica: PessoaJuridicaCadastro | null;
  endereco: EnderecoCadastro | null;
}
interface FornecedorDTO {
  id?: number | null;
  observacao?: string | null;
  status?: StatusFornecedor | null;
  tipoFornecedor?: TipoFornecedor | null;
  pessoaFisicaId?: number | null;
  pessoaJuridicaId?: number | null;
  organizacaoId?: number | null;
  tipoPessoa?: TipoPessoa;
  nomeFornecedor?: string;
  documentoFornecedor?: string;
  telefone?: string;
  email?: string;
  pessoaFisica?: PessoaFisicaCadastro;
  pessoaJuridica?: PessoaJuridicaCadastro;
  endereco?: EnderecoCadastro;
}
const toId = (value: unknown) => (value == null ? "" : String(value));

const mapFornecedorDTO = (d: FornecedorDTO): Fornecedor => ({
  id: toId(d.id),
  observacao: d.observacao ?? "",
  status: d.status ?? "ATIVO",
  tipoFornecedor: d.tipoFornecedor ?? "",
  pessoaFisicaId: toId(d.pessoaFisicaId),
  pessoaJuridicaId: toId(d.pessoaJuridicaId),
  organizacaoId: toId(d.organizacaoId),
  tipoPessoa:
    d.tipoPessoa ?? (d.pessoaJuridicaId ? "PESSOA_JURIDICA" : "PESSOA_FISICA"),
  nomeFornecedor: d.nomeFornecedor ?? `Fornecedor ${d.id ?? ""}`,
  documentoFornecedor: maskCpfCnpj(d.documentoFornecedor ?? ""),
  telefone: maskPhone(d.telefone ?? ""),
  email: d.email ?? "",
  pessoaFisica: formatPessoaFisicaCadastro(d.pessoaFisica),
  pessoaJuridica: formatPessoaJuridicaCadastro(d.pessoaJuridica),
  endereco: formatEnderecoCadastro(d.endereco),
});

const humanize = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((p) =>
      ["de", "da", "do", "e"].includes(p)
        ? p
        : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join(" ");
export const tipoFornecedorOptions = tipoFornecedorValues.map((value) => ({
  value,
  label: humanize(value),
}));
export const situacaoFornecedorOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;
export const tipoPessoaOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa Física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa Jurídica" },
] as const;
export const fornecedorObjetivo =
  "Cadastre e mantenha atualizadas as informações dos fornecedores da organização para facilitar sua identificação, o contato e a utilização desses cadastros nas compras, contratações e demais processos relacionados ao fornecimento de produtos ou serviços.";
export const fornecedorTooltip =
  "Nesta página são cadastradas e acompanhadas as pessoas ou empresas que fornecem produtos ou serviços para a organização. Esses registros ajudam a manter as informações dos fornecedores organizadas e disponíveis para consultas, contratações, compras e demais rotinas administrativas e financeiras.";
export const tipoPessoaFornecedor = (f: Fornecedor): TipoPessoa => f.tipoPessoa;
export const nomeFornecedor = (f: Fornecedor) => f.nomeFornecedor;
export const tipoFornecedorLabel = (v?: string) =>
  tipoFornecedorOptions.find((o) => o.value === v)?.label ??
  (v ? humanize(v) : "—");
export const situacaoFornecedorLabel = (v?: string) =>
  situacaoFornecedorOptions.find((o) => o.value === v)?.label ?? v ?? "—";
export const tipoPessoaLabel = (v?: string) =>
  tipoPessoaOptions.find((o) => o.value === v)?.label ?? v ?? "—";

export async function getFornecedores() {
  return (
    await apiFetch<FornecedorDTO[]>("/fornecedores", { cache: "no-store" })
  ).map(mapFornecedorDTO);
}
export async function getFornecedorById(value: string | number) {
  return mapFornecedorDTO(
    await apiFetch<FornecedorDTO>(`/fornecedores/${value}`, {
      cache: "no-store",
    }),
  );
}
export async function saveFornecedor(
  payload: FornecedorPayload,
  value?: string,
) {
  return mapFornecedorDTO(
    await apiFetch<FornecedorDTO>(
      value ? `/fornecedores/${value}` : "/fornecedores",
      {
        method: value ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    ),
  );
}
export async function deleteFornecedor(value: string) {
  await apiFetch<void>(`/fornecedores/${value}`, { method: "DELETE" });
}

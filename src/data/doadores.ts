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
export type StatusDoador = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";
export type OrigemDoador =
  | "SITE"
  | "CADASTRO_MANUAL"
  | "IMPORTACAO"
  | "EVENTO"
  | "CAMPANHA"
  | "INDICACAO"
  | "REDES_SOCIAIS"
  | "PARCEIRO"
  | "OUTRO";

export interface Doador {
  id: string;
  observacao: string;
  status: StatusDoador;
  origemDoador: OrigemDoador | "";
  pessoaFisicaId: string;
  pessoaJuridicaId: string;
  organizacaoId: string;
  nomeDoador: string;
  tipoPessoa: TipoPessoa;
  documentoDoador: string;
  telefone: string;
  email: string;
  pessoaFisica: PessoaFisicaCadastro | null;
  pessoaJuridica: PessoaJuridicaCadastro | null;
  endereco: EnderecoCadastro | null;
}

export interface DoadorPayload {
  tipoPessoa: TipoPessoa;
  pessoaFisica: PessoaFisicaCadastro | null;
  pessoaJuridica: PessoaJuridicaCadastro | null;
}

interface DoadorDTO {
  id?: number | null;
  observacao?: string | null;
  status?: StatusDoador | null;
  origemDoador?: OrigemDoador | null;
  pessoaFisicaId?: number | null;
  pessoaJuridicaId?: number | null;
  organizacaoId?: number | null;
  nomeDoador?: string | null;
  tipoPessoa?: TipoPessoa | null;
  documentoDoador?: string | null;
  telefone?: string | null;
  email?: string | null;
  pessoaFisica?: PessoaFisicaCadastro | null;
  pessoaJuridica?: PessoaJuridicaCadastro | null;
  endereco?: EnderecoCadastro | null;
}

const id = (value: unknown) => (value == null ? "" : String(value));

function fromDTO(dto: DoadorDTO): Doador {
  return {
    id: id(dto.id),
    observacao: dto.observacao ?? "",
    status: dto.status ?? "ATIVO",
    origemDoador: dto.origemDoador ?? "",
    pessoaFisicaId: id(dto.pessoaFisicaId),
    pessoaJuridicaId: id(dto.pessoaJuridicaId),
    organizacaoId: id(dto.organizacaoId),
    nomeDoador: dto.nomeDoador?.trim() || `Doador ${dto.id ?? ""}`,
    tipoPessoa:
      dto.tipoPessoa ??
      (dto.pessoaJuridicaId ? "PESSOA_JURIDICA" : "PESSOA_FISICA"),
    documentoDoador: maskCpfCnpj(dto.documentoDoador ?? ""),
    telefone: maskPhone(dto.telefone ?? ""),
    email: dto.email ?? "",
    pessoaFisica: formatPessoaFisicaCadastro(dto.pessoaFisica),
    pessoaJuridica: formatPessoaJuridicaCadastro(dto.pessoaJuridica),
    endereco: formatEnderecoCadastro(dto.endereco),
  };
}

export const doadorObjetivo =
  "Cadastre e mantenha atualizadas as informações dos doadores da organização para facilitar sua identificação, o relacionamento com cada pessoa ou instituição e o acompanhamento das doações realizadas.";
export const doadorTooltip =
  "Nesta página são cadastradas e acompanhadas as pessoas ou instituições que realizam doações para a organização. Esses registros ajudam a manter as informações dos doadores organizadas e facilitam o acompanhamento das contribuições ao longo do tempo.";

export const tipoPessoaOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa Física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa Jurídica" },
] as const;

export const origemDoadorOptions = [
  { value: "SITE", label: "Site" },
  { value: "CADASTRO_MANUAL", label: "Cadastro Manual" },
  { value: "IMPORTACAO", label: "Importação" },
  { value: "EVENTO", label: "Evento" },
  { value: "CAMPANHA", label: "Campanha" },
  { value: "INDICACAO", label: "Indicação" },
  { value: "REDES_SOCIAIS", label: "Redes Sociais" },
  { value: "PARCEIRO", label: "Parceiro" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const situacaoDoadorOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const tipoPessoaDoador = (d: Doador): TipoPessoa => d.tipoPessoa;
export const tipoPessoaLabel = (v?: string) =>
  tipoPessoaOptions.find((o) => o.value === v)?.label ?? v ?? "—";
export const origemDoadorLabel = (v?: string) =>
  origemDoadorOptions.find((o) => o.value === v)?.label ?? v ?? "—";
export const situacaoDoadorLabel = (v?: string) =>
  situacaoDoadorOptions.find((o) => o.value === v)?.label ?? v ?? "—";

export async function getDoadores(): Promise<Doador[]> {
  return (await apiFetch<DoadorDTO[]>("/doadores", { cache: "no-store" })).map(
    fromDTO,
  );
}

export async function getDoadorById(
  doadorId: string | number,
): Promise<Doador> {
  return fromDTO(
    await apiFetch<DoadorDTO>(`/doadores/${doadorId}`, { cache: "no-store" }),
  );
}

export async function saveDoador(
  payload: DoadorPayload,
  doadorId?: string,
): Promise<Doador> {
  return fromDTO(
    await apiFetch<DoadorDTO>(
      doadorId ? `/doadores/${doadorId}` : "/doadores",
      {
        method: doadorId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    ),
  );
}

export async function deleteDoador(doadorId: string): Promise<void> {
  await apiFetch<void>(`/doadores/${doadorId}`, { method: "DELETE" });
}

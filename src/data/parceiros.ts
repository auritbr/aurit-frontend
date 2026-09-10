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
export type StatusParceiro = "ATIVO" | "INATIVO" | "PENDENTE" | "CONCLUIDO";
export const tipoParceriaValues = [
  "INSTITUCIONAL",
  "FINANCEIRA",
  "TECNICA",
  "CULTURAL",
  "EDUCACIONAL",
  "SOCIAL",
  "COMERCIAL",
  "APOIO",
  "PATROCINIO",
  "COOPERACAO",
  "CESSAO_DE_ESPACO",
  "CESSAO_DE_EQUIPAMENTO",
  "DIVULGACAO",
  "VOLUNTARIADO",
  "OUTRA",
] as const;
export type TipoParceria = (typeof tipoParceriaValues)[number];
export interface Parceiro {
  id: string;
  dataInicioParceria: string;
  dataFimParceria: string;
  descricaoParceria: string;
  contribuicaoParceiro: string;
  contribuicaoOrganizacao: string;
  urlDocumentoParceria: string;
  observacao: string;
  status: StatusParceiro;
  tipoParcerias: TipoParceria[];
  pessoaFisicaId: string;
  pessoaJuridicaId: string;
  organizacaoId: string;
  tipoPessoa: TipoPessoa;
  nomeParceiro: string;
  documentoParceiro: string;
  telefone: string;
  email: string;
  pessoaFisica: PessoaFisicaCadastro | null;
  pessoaJuridica: PessoaJuridicaCadastro | null;
  endereco: EnderecoCadastro | null;
}
export interface ParceiroPayload
  extends Omit<
    Parceiro,
    | "id"
    | "organizacaoId"
    | "pessoaFisicaId"
    | "pessoaJuridicaId"
    | "nomeParceiro"
    | "documentoParceiro"
    | "telefone"
    | "email"
  > {
  id?: string;
  documentoFile?: File;
  removerDocumentoParceria?: boolean;
}
interface ParceiroDTO {
  id?: number;
  dataInicioParceria?: string;
  dataFimParceria?: string;
  descricaoParceria?: string;
  contribuicaoParceiro?: string;
  contribuicaoOrganizacao?: string;
  urlDocumentoParceria?: string;
  observacao?: string;
  status?: StatusParceiro;
  tipoParcerias?: TipoParceria[];
  pessoaFisicaId?: number;
  pessoaJuridicaId?: number;
  organizacaoId?: number;
  removerDocumentoParceria?: boolean;
  tipoPessoa?: TipoPessoa;
  nomeParceiro?: string;
  documentoParceiro?: string;
  telefone?: string;
  email?: string;
  pessoaFisica?: PessoaFisicaCadastro;
  pessoaJuridica?: PessoaJuridicaCadastro;
  endereco?: EnderecoCadastro;
}
const toId = (value: unknown) => (value == null ? "" : String(value));

const mapParceiroDTO = (d: ParceiroDTO): Parceiro => ({
  id: toId(d.id),
  dataInicioParceria: d.dataInicioParceria ?? "",
  dataFimParceria: d.dataFimParceria ?? "",
  descricaoParceria: d.descricaoParceria ?? "",
  contribuicaoParceiro: d.contribuicaoParceiro ?? "",
  contribuicaoOrganizacao: d.contribuicaoOrganizacao ?? "",
  urlDocumentoParceria: d.urlDocumentoParceria ?? "",
  observacao: d.observacao ?? "",
  status: d.status ?? "ATIVO",
  tipoParcerias: d.tipoParcerias ?? [],
  pessoaFisicaId: toId(d.pessoaFisicaId),
  pessoaJuridicaId: toId(d.pessoaJuridicaId),
  organizacaoId: toId(d.organizacaoId),
  tipoPessoa:
    d.tipoPessoa ?? (d.pessoaJuridicaId ? "PESSOA_JURIDICA" : "PESSOA_FISICA"),
  nomeParceiro: d.nomeParceiro ?? `Parceiro ${d.id ?? ""}`,
  documentoParceiro: maskCpfCnpj(d.documentoParceiro ?? ""),
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
      ["de", "da", "do", "e"].includes(p) ? p : p[0].toUpperCase() + p.slice(1),
    )
    .join(" ");
export const tipoParceriaOptions = tipoParceriaValues.map((value) => ({
  value,
  label: humanize(value),
}));
export const situacaoParceiroOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;
export const tipoPessoaOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa jurídica" },
] as const;
export const parceiroObjetivo =
  "Cadastre e acompanhe as parcerias da organização, mantendo organizadas as informações sobre os parceiros, os compromissos assumidos por cada parte, a vigência e os documentos que formalizam ou registram a parceria.";
export const parceiroTooltip =
  "Nesta página são cadastrados e acompanhados os parceiros da organização e as parcerias estabelecidas com cada um deles. Os registros ajudam a organizar os compromissos assumidos entre as partes, o período da parceria, as contribuições previstas e os documentos relacionados.";
export const tipoPessoaParceiro = (p: Parceiro): TipoPessoa => p.tipoPessoa;
export const nomeParceiro = (p: Parceiro) => p.nomeParceiro;
export const tipoPessoaLabel = (v?: string) =>
  tipoPessoaOptions.find((o) => o.value === v)?.label ?? v ?? "—";
export const tipoParceriaLabel = (v?: string) =>
  tipoParceriaOptions.find((o) => o.value === v)?.label ??
  (v ? humanize(v) : "—");
export const situacaoParceiroLabel = (v?: string) =>
  situacaoParceiroOptions.find((o) => o.value === v)?.label ?? v ?? "—";
export const formatDateBr = (v?: string) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";
export async function getParceiros() {
  return (
    await apiFetch<ParceiroDTO[]>("/parceiros", { cache: "no-store" })
  ).map(mapParceiroDTO);
}
export async function getParceiroById(value: string | number) {
  return mapParceiroDTO(
    await apiFetch<ParceiroDTO>(`/parceiros/${value}`, { cache: "no-store" }),
  );
}
export async function saveParceiro(form: ParceiroPayload) {
  const dados: ParceiroDTO = {
    dataInicioParceria: form.dataInicioParceria,
    dataFimParceria: form.dataFimParceria || undefined,
    descricaoParceria: form.descricaoParceria.trim(),
    contribuicaoParceiro: form.contribuicaoParceiro.trim(),
    contribuicaoOrganizacao: form.contribuicaoOrganizacao.trim(),
    urlDocumentoParceria: form.urlDocumentoParceria || undefined,
    removerDocumentoParceria: form.removerDocumentoParceria,
    observacao: form.observacao.trim(),
    status: form.status,
    tipoParcerias: form.tipoParcerias,
    tipoPessoa: form.tipoPessoa,
    pessoaFisica: form.pessoaFisica ?? undefined,
    pessoaJuridica: form.pessoaJuridica ?? undefined,
    endereco: form.endereco ?? undefined,
  };
  if (form.documentoFile) {
    const body = new FormData();
    body.append("dados", JSON.stringify(dados));
    body.append("documento", form.documentoFile);
    return mapParceiroDTO(
      await apiFetch<ParceiroDTO>(
        form.id ? `/parceiros/${form.id}` : "/parceiros",
        {
          method: form.id ? "PUT" : "POST",
          body,
        },
      ),
    );
  }
  return mapParceiroDTO(
    await apiFetch<ParceiroDTO>(
      form.id ? `/parceiros/${form.id}` : "/parceiros",
      {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify(dados),
      },
    ),
  );
}
export async function deleteParceiro(value: string) {
  await apiFetch<void>(`/parceiros/${value}`, { method: "DELETE" });
}
export async function getParceiroDownloadUrl(value: string) {
  return apiFetch<string>(`/parceiros/${value}/download`);
}

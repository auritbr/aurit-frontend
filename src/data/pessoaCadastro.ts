export type TipoPessoaCadastro = "PESSOA_FISICA" | "PESSOA_JURIDICA";

export interface PessoaFisicaCadastro {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
}

export interface PessoaJuridicaCadastro {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dataFundacao: string;
  telefone: string;
  email: string;
}

export interface EnderecoCadastro {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const pessoaFisicaVazia: PessoaFisicaCadastro = {
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",
};
export const pessoaJuridicaVazia: PessoaJuridicaCadastro = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataFundacao: "",
  telefone: "",
  email: "",
};
export const enderecoVazio: EnderecoCadastro = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export const tipoPessoaCadastroOptions = [
  { value: "PESSOA_FISICA", label: "Pessoa física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa jurídica" },
] as const;

export function enderecoPreenchido(endereco: EnderecoCadastro) {
  return Object.values(endereco).some((value) => value.trim());
}

export const formatPessoaFisicaCadastro = (
  pessoa?: PessoaFisicaCadastro | null,
): PessoaFisicaCadastro | null =>
  pessoa
    ? {
        ...pessoa,
        cpf: maskCPF(pessoa.cpf ?? ""),
        rg: maskRGFlex(pessoa.rg ?? ""),
        telefone: maskPhone(pessoa.telefone ?? ""),
      }
    : null;

export const formatPessoaJuridicaCadastro = (
  pessoa?: PessoaJuridicaCadastro | null,
): PessoaJuridicaCadastro | null =>
  pessoa
    ? {
        ...pessoa,
        cnpj: maskCNPJ(pessoa.cnpj ?? ""),
        telefone: maskPhone(pessoa.telefone ?? ""),
      }
    : null;

export const formatEnderecoCadastro = (
  endereco?: EnderecoCadastro | null,
): EnderecoCadastro | null =>
  endereco ? { ...endereco, cep: maskCEP(endereco.cep ?? "") } : null;
import { maskCEP, maskCNPJ, maskCPF, maskPhone, maskRGFlex } from "@/lib/masks";

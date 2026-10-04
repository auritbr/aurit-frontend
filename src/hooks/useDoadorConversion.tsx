import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConvertConfirmDialog } from "@/components/ConvertConfirmDialog";
import type { RowActionItem } from "@/components/RowActionsDropdown";
import type { Colaborador } from "@/data/colaboradores";
import type { Integrante } from "@/data/integrantes";
import type { Participante } from "@/data/participantes";
import type { Parceiro } from "@/data/parceiros";
import type { Fornecedor } from "@/data/fornecedores";
import { enderecoVazio, pessoaFisicaVazia, pessoaJuridicaVazia } from "@/data/pessoaCadastro";

type CadastroOrigem = Colaborador | Integrante | Participante | Parceiro | Fornecedor;

const dataISO = (value = "") =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split("/").reverse().join("-") : value;

export function useDoadorConversion(sourceLabel: string) {
  const navigate = useNavigate();
  const [item, setItem] = useState<CadastroOrigem | null>(null);

  const doadorAction = (cadastro: CadastroOrigem): RowActionItem => ({
    label: "Converter em doador",
    icon: UserPlus,
    onClick: () => setItem(cadastro),
  });

  const confirmar = () => {
    if (!item) return;
    const data = "tipoPessoa" in item
      ? {
          tipoPessoa: item.tipoPessoa,
          pessoaFisica: item.pessoaFisica ?? pessoaFisicaVazia,
          pessoaJuridica: item.pessoaJuridica ?? pessoaJuridicaVazia,
          endereco: item.endereco ?? enderecoVazio,
          observacao: item.observacao,
        }
      : {
          tipoPessoa: "tipoPessoaIntegrante" in item ? item.tipoPessoaIntegrante : "PESSOA_FISICA",
          pessoaFisica: {
            nomeCompleto: item.nomeCompleto,
            dataNascimento: dataISO(item.dataNascimento),
            cpf: item.cpf ?? "",
            rg: item.rg ?? "",
            telefone: item.telefone ?? "",
            email: item.email ?? "",
          },
          pessoaJuridica: "tipoPessoaIntegrante" in item ? {
            ...pessoaJuridicaVazia,
            razaoSocial: item.nomeSocial,
            nomeFantasia: item.nomeFantasia,
            cnpj: item.cnpj,
            telefone: item.telefone,
            email: item.email,
          } : pessoaJuridicaVazia,
          endereco: {
            cep: item.cep ?? "",
            logradouro: item.logradouro ?? "",
            numero: item.numero ?? "",
            complemento: item.complemento ?? "",
            bairro: item.bairro ?? "",
            cidade: item.cidade ?? "",
            estado: item.estado ?? "",
          },
        };
    setItem(null);
    navigate("/doadores/novo", {
      state: { conversionSeed: { origem: sourceLabel, data: { ...data, origemDoador: "CADASTRO_MANUAL", status: "ATIVO" } } },
    });
    toast.success("Dados carregados. Revise o cadastro e clique em Salvar.");
  };

  const doadorDialog = (
    <ConvertConfirmDialog
      open={!!item}
      onOpenChange={(open) => { if (!open) setItem(null); }}
      sourceLabel={sourceLabel}
      targetLabel="Doador"
      onConfirm={confirmar}
    />
  );

  return { doadorAction, doadorDialog };
}

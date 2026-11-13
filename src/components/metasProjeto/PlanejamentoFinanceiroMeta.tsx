import { Calculator } from "lucide-react";
import { FieldLabel } from "@/components/FieldLabel";
import { FormSectionCard } from "@/components/FormSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModulePermissionContext } from "@/contexts/ModulePermissionContext";
import {
  formatCurrencyInput,
  formatCurrencyValue,
} from "@/data/planejamentoFinanceiro";
import type { PlanejamentoMeta } from "./planejamentoMeta";

interface Props {
  dados: PlanejamentoMeta;
  alterar: (dados: PlanejamentoMeta) => void;
  bloqueado: boolean;
  temPlanejamento: boolean;
  temItensMultiplos: boolean;
  valorLegado: boolean;
  consultando: boolean;
  erroConsulta: string;
  recarregar: () => void;
}

export function PlanejamentoFinanceiroMeta({
  dados,
  alterar,
  bloqueado,
  temPlanejamento,
  temItensMultiplos,
  valorLegado,
  consultando,
  erroConsulta,
  recarregar,
}: Props) {
  const { permissoes } = useModulePermissionContext();
  const podeGravar = temPlanejamento ? permissoes.EDITAR : permissoes.CRIAR;
  const desabilitado = bloqueado || !podeGravar || temItensMultiplos;
  return (
    <FormSectionCard
      icon={Calculator}
      title="Planejamento Financeiro da Meta"
      description="Informe o valor financeiro previsto para a realização desta meta e, quando houver, as datas estimadas para utilização dos recursos. Essas informações serão utilizadas para acompanhar a execução financeira e comparar os valores planejados com os efetivamente pagos durante o projeto."
    >
      {consultando && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando planejamento financeiro...
        </p>
      )}
      {erroConsulta && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {erroConsulta}
          </p>
          <Button
            type="button"
            variant="glassSecondary"
            size="sm"
            onClick={recarregar}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {!consultando && !erroConsulta && (
        <>
          {temItensMultiplos && (
            <p className="mb-4 text-sm text-muted-foreground">
              Este orçamento tem mais de um item cadastrado. O valor consolidado
              está disponível para consulta.
            </p>
          )}
          {valorLegado && !temItensMultiplos && (
            <p className="mb-4 text-sm text-muted-foreground">
              O valor estimado vem do orçamento cadastrado anteriormente. As
              datas podem ser atualizadas.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <FieldLabel
                htmlFor="meta-valor-estimado"
                tooltip="Informe o valor total, em reais, destinado à realização desta meta, conforme previsto no orçamento ou plano de trabalho do projeto. Considere todos os recursos necessários para sua execução, como contratação de profissionais, materiais, serviços e outras despesas. Esse valor servirá de referência para acompanhar a utilização dos recursos financeiros."
              >
                Valor Estimado
              </FieldLabel>
              <Input
                id="meta-valor-estimado"
                inputMode="decimal"
                placeholder="0,00"
                value={dados.valorEstimado}
                disabled={desabilitado || valorLegado}
                onChange={(e) => {
                  const valor = e.target.value;
                  alterar({
                    ...dados,
                    valorEstimado:
                      formatCurrencyInput(valor) ||
                      (/\d/.test(valor) ? formatCurrencyValue(0) : ""),
                  });
                }}
              />
            </div>
            <div className="min-w-0">
              <FieldLabel
                htmlFor="meta-planejamento-inicio"
                tooltip="Informe a data prevista para começar a utilizar os recursos financeiros destinados a esta meta. Essa data pode corresponder ao início das contratações, aquisições ou outras despesas necessárias para sua realização. Caso ainda não exista uma previsão definida, o campo poderá permanecer em branco."
              >
                Data de Início
              </FieldLabel>
              <Input
                id="meta-planejamento-inicio"
                type="date"
                className="min-w-0"
                value={dados.inicio}
                disabled={desabilitado}
                onChange={(e) => alterar({ ...dados, inicio: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <FieldLabel
                htmlFor="meta-planejamento-termino"
                tooltip="Informe a data prevista para concluir a utilização dos recursos financeiros destinados a esta meta. Essa informação ajuda a identificar o período planejado para a realização das despesas e acompanhar sua execução. Caso ainda não exista uma previsão definida, o campo poderá permanecer em branco."
              >
                Data de Término
              </FieldLabel>
              <Input
                id="meta-planejamento-termino"
                type="date"
                className="min-w-0"
                value={dados.termino}
                disabled={desabilitado}
                onChange={(e) => alterar({ ...dados, termino: e.target.value })}
              />
            </div>
          </div>
        </>
      )}
    </FormSectionCard>
  );
}

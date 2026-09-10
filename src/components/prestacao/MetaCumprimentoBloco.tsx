import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormMultiSelect } from "@/components/FormMultiSelect";
import { StatusPill } from "@/components/StatusPill";
import {
  statusCumprimentoOptions,
  exigeJustificativaNaoCumprimento,
  formatPercentualExecutado,
  formatQuantidadeExecutada,
} from "@/data/prestacaoMetas";
import type { MetaExecucao } from "@/lib/prestacaoExecucao";

export interface MetaCumprimentoValor {
  statusCumprimentoMeta: string;
  quantidadeExecutada: string;
  observacaoCumprimento: string;
  justificativaNaoCumprimentoIntegral: string;
  evidencias: string[];
}

export const metaCumprimentoVazio: MetaCumprimentoValor = {
  statusCumprimentoMeta: "",
  quantidadeExecutada: "",
  observacaoCumprimento: "",
  justificativaNaoCumprimentoIntegral: "",
  evidencias: [],
};

/**
 * Bloco de avaliação de uma meta: dados previstos (somente leitura, vindos do
 * cadastro de metas) + registro de cumprimento (PrestacaoMeta).
 */
export function MetaCumprimentoBloco({
  meta,
  valor,
  onChange,
  disabled,
}: {
  meta: MetaExecucao;
  valor: MetaCumprimentoValor;
  onChange: (valor: MetaCumprimentoValor) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof MetaCumprimentoValor>(
    k: K,
    v: MetaCumprimentoValor[K],
  ) => onChange({ ...valor, [k]: v });

  const exigeJustificativa = exigeJustificativaNaoCumprimento(
    valor.statusCumprimentoMeta,
  );

  const camposPrevistos = [
    { label: "Quantidade prevista", value: meta.quantidadePrevista },
    { label: "Unidade", value: meta.unidade },
    { label: "Prazo", value: meta.prazo },
    { label: "Situação da meta", value: meta.situacao },
    ...(meta.quantidadeExecutada
      ? [
          {
            label: "Quantidade executada",
            value: formatQuantidadeExecutada(meta.quantidadeExecutada),
          },
        ]
      : []),
    ...(typeof meta.percentualExecutado === "number"
      ? [
          {
            label: "Percentual executado",
            value: formatPercentualExecutado(meta.percentualExecutado),
          },
        ]
      : []),
  ];

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold leading-snug text-foreground">
          {meta.titulo}
        </h3>
        <StatusPill
          status={valor.statusCumprimentoMeta || "PENDENTE"}
          context="cumprimento-meta"
          ariaLabelPrefix="Situação do cumprimento"
          wrap
        />
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        {meta.descricao}
      </p>

      <dl className="mt-3 grid gap-x-4 gap-y-2 rounded-[12px] border border-border/60 bg-muted/25 px-3.5 py-3 sm:grid-cols-2 lg:grid-cols-3">
        {camposPrevistos.map((c) => (
          <div key={c.label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {c.label}
            </dt>
            <dd className="break-words text-[12.5px] text-foreground">
              {c.value}
            </dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Forma de comprovação
          </dt>
          <dd className="break-words text-[12.5px] text-foreground">
            {meta.formaComprovacao}
          </dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor={`meta-status-${meta.id}`}
            required
            tooltip="Informe como esta meta foi cumprida durante o período desta prestação."
          >
            Situação do cumprimento
          </FieldLabel>
          <Select
            value={valor.statusCumprimentoMeta}
            onValueChange={(v) => set("statusCumprimentoMeta", v)}
            disabled={disabled}
          >
            <SelectTrigger id={`meta-status-${meta.id}`}>
              <SelectValue placeholder="Selecione a situação" />
            </SelectTrigger>
            <SelectContent>
              {statusCumprimentoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel
            htmlFor={`meta-quantidade-${meta.id}`}
            required={
              valor.statusCumprimentoMeta === "CUMPRIDA_INTEGRALMENTE" ||
              valor.statusCumprimentoMeta === "CUMPRIDA_PARCIALMENTE"
            }
            tooltip="Informe a quantidade efetivamente realizada para que o percentual da meta seja calculado pelo backend."
          >
            Quantidade executada
          </FieldLabel>
          <Input
            id={`meta-quantidade-${meta.id}`}
            inputMode="decimal"
            value={valor.quantidadeExecutada}
            onChange={(event) => set("quantidadeExecutada", event.target.value)}
            placeholder="0"
            disabled={disabled}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor={`meta-evidencias-${meta.id}`}
            tooltip="Selecione, entre as evidências já registradas para o projeto, as que comprovam o resultado desta meta."
          >
            Evidências
          </FieldLabel>
          {meta.evidenciasDisponiveis.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-border/70 bg-muted/25 px-3 py-2.5 text-[12.5px] text-muted-foreground">
              Nenhuma evidência relacionada foi encontrada para este projeto.
            </p>
          ) : (
            <FormMultiSelect
              id={`meta-evidencias-${meta.id}`}
              options={meta.evidenciasDisponiveis}
              value={valor.evidencias}
              onChange={(v) => set("evidencias", v)}
              placeholder="Selecione uma ou mais evidências"
              searchPlaceholder="Pesquisar evidência..."
              emptyMessage="Nenhuma evidência encontrada."
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <FieldLabel
            htmlFor={`meta-observacao-${meta.id}`}
            tooltip="Explique o resultado alcançado e, quando houver diferença em relação ao previsto, registre os motivos."
          >
            Observações sobre o cumprimento
          </FieldLabel>
          <Textarea
            id={`meta-observacao-${meta.id}`}
            value={valor.observacaoCumprimento}
            onChange={(e) => set("observacaoCumprimento", e.target.value)}
            placeholder="Explique o resultado alcançado nesta meta."
            rows={3}
            disabled={disabled}
          />
        </div>

        {exigeJustificativa && (
          <div className="sm:col-span-2">
            <FieldLabel
              htmlFor={`meta-justificativa-${meta.id}`}
              required
              tooltip="Como a meta não foi cumprida integralmente, registre os motivos e o que foi feito a respeito."
            >
              Justificativa do não cumprimento integral
            </FieldLabel>
            <Textarea
              id={`meta-justificativa-${meta.id}`}
              value={valor.justificativaNaoCumprimentoIntegral}
              onChange={(e) =>
                set("justificativaNaoCumprimentoIntegral", e.target.value)
              }
              placeholder="Descreva os motivos do não cumprimento integral da meta."
              rows={3}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}

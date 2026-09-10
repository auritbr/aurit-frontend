import { AlertTriangle, ArrowRight, FileCheck2, FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusCountBadge } from "@/components/StatusCountBadge";
import type { DocumentosResumo } from "@/data/journey";

export interface DocumentsAttentionCardProps {
  resumo: DocumentosResumo;
  onNavigate: (route: string) => void;
}

/** Resumo documental permanente, com destaque quando há itens que exigem atenção. */
export function DocumentsAttentionCard({
  resumo,
  onNavigate,
}: DocumentsAttentionCardProps) {
  const exigeAtencao = resumo.vencidos > 0 || resumo.pendentes > 0;
  const possuiDocumentos = resumo.total > 0;
  const Icon = exigeAtencao
    ? AlertTriangle
    : possuiDocumentos
      ? FileCheck2
      : FilePlus2;
  const mensagem =
    resumo.vencidos > 0
      ? `${resumo.vencidos} ${resumo.vencidos === 1 ? "documento vencido precisa" : "documentos vencidos precisam"} de atenção.`
      : resumo.pendentes > 0
        ? `${resumo.pendentes} ${resumo.pendentes === 1 ? "documento pendente precisa" : "documentos pendentes precisam"} de atenção.`
        : possuiDocumentos
          ? "Os documentos cadastrados estão em dia."
          : "Cadastre os documentos da organização para acompanhar pendências e vencimentos.";

  return (
    <section
      className="journey-glass flex flex-col gap-3 rounded-[18px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-labelledby="docs-attention-title"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[11px] border border-border/70 ${
            exigeAtencao
              ? "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))]"
              : "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))]"
          }`}
        >
          <Icon className="h-[16px] w-[16px]" strokeWidth={2.2} />
        </span>

        <div className="min-w-0">
          <h2
            id="docs-attention-title"
            className="text-[13.5px] font-semibold text-foreground"
          >
            Documentos da organização
          </h2>
          <p className="text-[12px] leading-[1.4] text-muted-foreground">
            {mensagem}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
            {resumo.vencidos > 0 && (
              <StatusCountBadge
                count={resumo.vencidos}
                label={resumo.vencidos === 1 ? "vencido" : "vencidos"}
                aria-label={`${resumo.vencidos} ${
                  resumo.vencidos === 1
                    ? "documento vencido"
                    : "documentos vencidos"
                }`}
              />
            )}
            {resumo.pendentes > 0 && (
              <StatusCountBadge
                count={resumo.pendentes}
                variant="success"
                label={resumo.pendentes === 1 ? "pendente" : "pendentes"}
                showIcon={false}
                aria-label={`${resumo.pendentes} ${
                  resumo.pendentes === 1
                    ? "documento pendente"
                    : "documentos pendentes"
                }`}
              />
            )}
            {!exigeAtencao && possuiDocumentos && (
              <StatusCountBadge
                count={resumo.atualizados}
                variant="neutral"
                label={resumo.atualizados === 1 ? "atualizado" : "atualizados"}
                showIcon={false}
                aria-label={`${resumo.atualizados} ${resumo.atualizados === 1 ? "documento atualizado" : "documentos atualizados"}`}
              />
            )}
          </div>
        </div>
      </div>

      <Button
        variant="glassCompact"
        className="h-9 w-auto self-start gap-[7px] px-[14px] text-[13px] font-semibold sm:flex-shrink-0 sm:self-auto [&_svg]:h-4 [&_svg]:w-4"
        onClick={() => onNavigate("/documentos")}
      >
        {possuiDocumentos ? "Ver documentos" : "Cadastrar documentos"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

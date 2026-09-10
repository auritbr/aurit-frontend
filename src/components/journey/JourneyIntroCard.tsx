import { Route } from "lucide-react";

import { DashboardCard } from "@/components/journey/DashboardCard";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { DocumentosResumo, JourneyModule } from "@/data/journey";

export interface JourneyIntroCardProps {
  modules: JourneyModule[];
  documentos: DocumentosResumo;
}

/** Introdução compacta da jornada, com o progresso geral e o resumo contextual. */
export function JourneyIntroCard({
  modules,
  documentos,
}: JourneyIntroCardProps) {
  const concluidos = modules.filter((m) => m.state === "CONCLUIDO").length;
  const andamento = modules.filter((m) => m.state === "EM_ANDAMENTO").length;
  const pendencias = modules.filter(
    (m) => m.state === "COM_PENDENCIAS" || m.state === "PRECISA_ATENCAO",
  ).length;
  const naoIniciados = modules.filter((m) => m.state === "NAO_INICIADO").length;
  const percentualGeral = modules.length
    ? Math.round(
        modules.reduce((acc, m) => acc + m.percentual, 0) / modules.length,
      )
    : 0;

  const plural = (n: number, singular: string, pluralWord: string) =>
    n === 1 ? singular : pluralWord;

  const modulosResumo = [
    concluidos > 0 &&
      `${concluidos} ${plural(concluidos, "módulo concluído", "módulos concluídos")}`,
    andamento > 0 &&
      `${andamento} ${plural(andamento, "módulo em andamento", "módulos em andamento")}`,
    pendencias > 0 &&
      `${pendencias} ${plural(pendencias, "módulo com pendência", "módulos com pendências")}`,
    naoIniciados > 0 &&
      `${naoIniciados} ${plural(naoIniciados, "módulo não iniciado", "módulos não iniciados")}`,
  ].filter(Boolean) as string[];

  const documentosResumo = [
    documentos.vencidos > 0 &&
      `${documentos.vencidos} ${plural(
        documentos.vencidos,
        "documento vencido",
        "documentos vencidos",
      )}`,
    documentos.pendentes > 0 &&
      `${documentos.pendentes} ${plural(
        documentos.pendentes,
        "documento pendente",
        "documentos pendentes",
      )}`,
  ].filter(Boolean) as string[];

  return (
    <DashboardCard
      className="flex h-auto min-h-0 flex-col gap-3 px-[18px] py-[15px] sm:px-[20px] lg:flex-row lg:items-center lg:justify-between lg:gap-6"
      aria-labelledby="journey-title"
    >
      <div className="flex min-w-0 items-start gap-[11px]">
        <span
          aria-hidden="true"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] border border-border/70 bg-primary-soft text-primary"
        >
          <Route className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2
            id="journey-title"
            className="text-[15px] font-semibold leading-[1.3] text-foreground"
          >
            Sua jornada dentro da Aurit
          </h2>
          <p className="text-[13px] leading-[1.45] text-muted-foreground text-justify">
            Siga este caminho para estruturar sua organização, acompanhar suas
            ações e manter as informações organizadas para editais, relatórios e
            prestações de contas.{" "}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 lg:flex-shrink-0">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary-soft text-[13px] font-semibold text-primary tabular-nums">
          {percentualGeral}%
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12.5px] font-semibold text-foreground">
              Progresso da organização
            </p>
            <HelpTooltip
              text-justify
              text="Este percentual representa o avanço geral da organização na jornada da Aurit. Ele é calculado a partir do preenchimento das informações e cadastros de cada módulo, considerando também etapas que ainda estão em andamento."
              label="Progresso da organização"
              side="bottom"
              align="end"
              contentClassName="w-max max-w-[calc(100vw-32px)] sm:max-w-[300px] rounded-lg px-2.5 py-1.5 text-xs leading-[1.4]"
            />
          </div>
          {modulosResumo.length > 0 && (
            <p className="text-[12px] leading-[1.45] text-muted-foreground">
              {modulosResumo.join(" · ")}
            </p>
          )}
          {documentosResumo.length > 0 && (
            <p className="text-[11.5px] leading-[1.45] text-muted-foreground/80">
              {documentosResumo.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

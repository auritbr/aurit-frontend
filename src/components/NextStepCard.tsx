import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextStepCardProps {
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  acaoUrl?: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
  label?: string;
  onDismiss?: () => void;
}

export function NextStepCard({
  titulo,
  descricao,
  acaoLabel,
  acaoUrl,
  acaoSecundariaLabel,
  acaoSecundariaUrl,
  variante = "pendente",
  label,
  onDismiss,
}: NextStepCardProps) {
  const styles = {
    pendente: {
      container:
        "border-[#D8B37A]/70 bg-[#FFF8EC] shadow-[0_14px_34px_-26px_hsl(35_45%_34%_/_0.32),0_0_0_1px_hsl(35_45%_34%_/_0.045)] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[#B7792A]/85",
      iconWrap:
        "border-[#E3C99E] bg-white text-[#9A6323] shadow-sm",
      labelColor: "text-[#8A5A24]",
      titleColor: "text-slate-900",
      descriptionColor: "text-slate-600",
      dismissColor:
        "text-[#8A5A24]/65 hover:bg-[#FFF3DD] hover:text-[#754A1D]",
      primaryButton:
        "bg-[#8A5A24] text-white shadow-sm shadow-[#8A5A24]/10 hover:bg-[#754A1D] focus-visible:ring-[#8A5A24]",
      secondaryButton:
        "border-[#D8B37A] bg-white/80 text-[#8A5A24] hover:bg-[#FFF3DD] hover:text-[#754A1D]",
      Icon: Sparkles,
      label: "Próxima ação recomendada",
    },

    atencao: {
      container:
        "border-amber-200/90 bg-amber-50/55 shadow-[0_14px_34px_-26px_hsl(38_65%_38%_/_0.30),0_0_0_1px_hsl(38_65%_38%_/_0.04)] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-amber-500/80",
      iconWrap:
        "border-amber-200 bg-white text-amber-700 shadow-sm",
      labelColor: "text-amber-800",
      titleColor: "text-slate-900",
      descriptionColor: "text-slate-600",
      dismissColor:
        "text-amber-700/70 hover:bg-amber-100/70 hover:text-amber-900",
      primaryButton:
        "bg-amber-700 text-white shadow-sm shadow-amber-900/10 hover:bg-amber-800 focus-visible:ring-amber-500",
      secondaryButton:
        "border-amber-300 bg-white/80 text-amber-800 hover:bg-amber-50 hover:text-amber-950",
      Icon: AlertTriangle,
      label: "Sugestão de melhoria",
    },

    concluido: {
      container:
        "border-emerald-200/90 bg-emerald-50/45 shadow-[0_12px_30px_-24px_hsl(152_64%_32%_/_0.28),0_0_0_1px_hsl(152_64%_32%_/_0.04)] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-600/75",
      iconWrap:
        "border-emerald-200 bg-white text-emerald-700 shadow-sm",
      labelColor: "text-emerald-700",
      titleColor: "text-slate-900",
      descriptionColor: "text-slate-600",
      dismissColor:
        "text-emerald-700/70 hover:bg-emerald-100/70 hover:text-emerald-900",
      primaryButton:
        "bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-800 focus-visible:ring-emerald-500",
      secondaryButton:
        "border-emerald-300 bg-white/80 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950",
      Icon: CheckCircle2,
      label: "Tudo pronto",
    },

    prioridade: {
      container:
        "border-red-200/90 bg-white shadow-[0_16px_40px_-24px_hsl(215_28%_17%_/_0.30),0_0_0_1px_hsl(0_72%_45%_/_0.045)] before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:bg-red-500",
      iconWrap:
        "border-red-200 bg-red-50 text-red-600 shadow-sm",
      labelColor: "text-red-700",
      titleColor: "text-slate-900",
      descriptionColor: "text-slate-600",
      dismissColor:
        "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
      primaryButton:
        "bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700 focus-visible:ring-red-500",
      secondaryButton:
        "border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-900",
      Icon: AlertTriangle,
      label: "Ação importante",
    },
  }[variante];

  const Icon = styles.Icon;
  const labelFinal = label || styles.label;

  return (
    <div
      className={`
        relative mb-5 flex flex-col gap-3 overflow-hidden rounded-lg border p-4
        sm:flex-row sm:items-center sm:gap-4
        ${styles.container}
      `}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar recomendação"
          className={`
            absolute right-2 top-2 rounded p-1 transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${styles.dismissColor}
          `}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        className={`
          flex h-10 w-10 shrink-0 items-center justify-center rounded-md border
          ${styles.iconWrap}
        `}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1 pr-4">
        <p
          className={`
            mb-0.5 text-[10px] font-bold uppercase tracking-wider
            ${styles.labelColor}
          `}
        >
          {labelFinal}
        </p>

        <p className={`text-sm font-semibold ${styles.titleColor}`}>
          {titulo}
        </p>

        <p className={`mt-0.5 text-xs leading-relaxed ${styles.descriptionColor}`}>
          {descricao}
        </p>
      </div>

      {(acaoLabel && acaoUrl) || (acaoSecundariaLabel && acaoSecundariaUrl) ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {acaoSecundariaLabel && acaoSecundariaUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className={`h-8 ${styles.secondaryButton}`}
            >
              <Link to={acaoSecundariaUrl}>{acaoSecundariaLabel}</Link>
            </Button>
          )}

          {acaoLabel && acaoUrl && (
            <Button asChild size="sm" className={`h-8 ${styles.primaryButton}`}>
              <Link to={acaoUrl}>
                {acaoLabel}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
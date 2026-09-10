import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionDescription } from "@/components/SectionDescription";

interface FormSectionCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Container padrão das seções de formulário, com acabamento
 * "liquid glass" leve e discreto. Reutilizável em todas as páginas.
 */
export function FormSectionCard({
  icon: Icon,
  title,
  description,
  className,
  children,
}: FormSectionCardProps) {
  return (
    <section
      className={cn("form-section-glass rounded-[18px] p-5 sm:p-6", className)}
    >
      <div className="mb-5 border-b form-section-glass-divider pb-3.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              className="h-4 w-4 flex-shrink-0 text-primary"
              strokeWidth={2.2}
              aria-hidden
            />
          )}
          <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
            {title}
          </h2>
        </div>
        {description && (
          <SectionDescription text={description} className="mt-2" />
        )}
      </div>
      {children}
    </section>
  );
}

export default FormSectionCard;

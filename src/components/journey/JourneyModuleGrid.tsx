import { JourneyConnector } from "@/components/journey/JourneyConnector";
import { JourneyModuleCard } from "@/components/journey/JourneyModuleCard";
import { stepLabel } from "@/components/journey/journeyStatus";
import type { JourneyModule } from "@/data/journey";

export interface JourneyModuleGridProps {
  modules: JourneyModule[];
  onOpenModule: (key: string) => void;
}

/** Grade de módulos da jornada em três colunas no desktop, com conectores discretos. */
export function JourneyModuleGrid({
  modules,
  onOpenModule,
}: JourneyModuleGridProps) {
  return (
    <ol className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 min-[560px]:gap-5 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-7">
      {modules.map((module, index) => {
        const isLast = index === modules.length - 1;
        const endsRow = (index + 1) % 3 === 0;

        return (
          <li key={module.key} className="relative h-full">
            <JourneyModuleCard
              step={stepLabel(index)}
              icon={module.icon}
              title={module.title}
              shortDescription={module.description}
              percentage={module.percentual}
              status={module.state}
              onOpen={() => onOpenModule(module.key)}
            />
            {!isLast && !endsRow && <JourneyConnector />}
          </li>
        );
      })}
    </ol>
  );
}

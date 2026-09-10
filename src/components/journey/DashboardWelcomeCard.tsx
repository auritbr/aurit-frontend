import { DashboardCard } from "@/components/journey/DashboardCard";

export interface DashboardWelcomeCardProps {
  userName: string;
}

/** Card de boas-vindas no topo da dashboard. */
export function DashboardWelcomeCard({ userName }: DashboardWelcomeCardProps) {
  return (
    <DashboardCard
      className="flex h-auto min-h-0 flex-col gap-[8px] px-5 py-[15px] sm:px-6"
      aria-labelledby="welcome-title"
    >
      <h1
        id="welcome-title"
        className="break-words text-[18px] font-bold leading-[1.25] text-foreground sm:text-[19px] lg:text-[20px]"
      >
        Olá, {userName}
      </h1>

      <div className="flex flex-col gap-[7px] text-justify">
        <p className="text-[13px] font-normal leading-[1.45] text-muted-foreground sm:text-[13.5px]">
          A Aurit reúne, em um só lugar, as diferentes áreas da gestão da sua
          organização, facilitando o acesso às informações, aos processos e às
          atividades desenvolvidas.
        </p>

        <p className="text-[13px] font-normal leading-[1.45] text-muted-foreground sm:text-[13.5px]">
          Documentos, pessoas, projetos, editais, evidências, informações
          financeiras e prestações de contas se conectam para apoiar a tomada de
          decisões e fortalecer a organização institucional.
        </p>
      </div>
    </DashboardCard>
  );
}

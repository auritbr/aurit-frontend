export type StatusDomain =
  | "cronograma"
  | "atividade"
  | "turma"
  | "projeto"
  | "documento"
  | "validade-documento";

const domains: Record<StatusDomain, { value: string; label: string }[]> = {
  cronograma: [
    { value: "NAO_INICIADA", label: "Não iniciada" },
    { value: "EM_ANDAMENTO", label: "Em andamento" },
    { value: "PRAZO_ENCERRADO", label: "Prazo encerrado" },
  ],
  atividade: [
    { value: "ATIVO", label: "Ativo" },
    { value: "NAO_INICIADA", label: "Não iniciada" },
    { value: "EM_ANDAMENTO", label: "Em andamento" },
    { value: "EM_EXECUCAO", label: "Em execução" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "CONCLUIDO", label: "Concluído" },
    { value: "INATIVO", label: "Inativo" },
  ],
  turma: [
    { value: "ATIVO", label: "Ativo" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "CONCLUIDO", label: "Concluído" },
    { value: "INATIVO", label: "Inativo" },
  ],
  projeto: [
    { value: "ATIVO", label: "Ativo" },
    { value: "NAO_INICIADO", label: "Não iniciado" },
    { value: "NAO_INICIADA", label: "Não iniciada" },
    { value: "EM_ANDAMENTO", label: "Em andamento" },
    { value: "EM_EXECUCAO", label: "Em execução" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "CONCLUIDO", label: "Concluído" },
    { value: "INATIVO", label: "Inativo" },
  ],
  documento: [
    { value: "ATUALIZADO", label: "Atualizado" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "EM_ANALISE", label: "Em análise" },
    { value: "NECESSITA_REVISAO", label: "Necessita revisão" },
    { value: "VENCIDO", label: "Vencido" },
    { value: "NAO_SE_APLICA", label: "Não se aplica" },
  ],
  "validade-documento": [
    { value: "VIGENTE", label: "Vigente" },
    { value: "VENCIDO", label: "Vencido" },
    { value: "SEM_VALIDADE", label: "Sem validade" },
  ],
};

export function domainStatusOptions(domain: StatusDomain) {
  return domains[domain] ?? [];
}

export function domainStatusLabel(domain: StatusDomain, value: string) {
  return (
    domainStatusOptions(domain).find((option) => option.value === value)
      ?.label ??
    value
      .toLowerCase()
      .split("_")
      .map((part, index) =>
        index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
      )
      .join(" ")
  );
}

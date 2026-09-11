/** Canal de eventos do popup global de próxima etapa. */
export interface NextStepPopupPayload {
  message: string;
  buttonLabel: string;
  to: string;
}

export interface NextStepDefinition {
  buttonLabel: string;
  to: string;
}

/**
 * Ordem única da jornada de cadastro. O host do popup a aplica inclusive aos
 * formulários legados que ainda gravam o próximo passo no sessionStorage.
 */
const JOURNEY: Array<{ paths: string[]; next?: NextStepDefinition }> = [
  {
    paths: ["/organizacao", "/organizacoes"],
    next: { buttonLabel: "Cadastrar diretoria", to: "/diretoria" },
  },
  {
    paths: ["/diretoria"],
    next: { buttonLabel: "Cadastrar documentos", to: "/documentos/novo" },
  },
  {
    paths: ["/documentos"],
    next: { buttonLabel: "Cadastrar agentes culturais", to: "/agentes/novo" },
  },
  {
    paths: ["/agentes"],
    next: { buttonLabel: "Cadastrar colaboradores", to: "/colaboradores/novo" },
  },
  {
    paths: ["/colaboradores"],
    next: { buttonLabel: "Cadastrar integrantes", to: "/integrantes/novo" },
  },
  {
    paths: ["/integrantes"],
    next: { buttonLabel: "Cadastrar participantes", to: "/participantes/novo" },
  },
  {
    paths: ["/participantes"],
    next: { buttonLabel: "Cadastrar currículos", to: "/curriculos/novo" },
  },
  {
    paths: ["/curriculos"],
    next: {
      buttonLabel: "Cadastrar trajetórias culturais",
      to: "/trajetorias-culturais/novo",
    },
  },
  {
    paths: ["/trajetorias-culturais"],
    next: { buttonLabel: "Cadastrar projetos", to: "/projetos/novo" },
  },
  {
    paths: ["/projetos"],
    next: {
      buttonLabel: "Cadastrar metas do projeto",
      to: "/metas-projeto/novo",
    },
  },
  {
    paths: ["/metas-projeto"],
    next: {
      buttonLabel: "Cadastrar cronograma do projeto",
      to: "/cronograma",
    },
  },
  {
    paths: ["/cronograma"],
    next: { buttonLabel: "Cadastrar atividades", to: "/atividades/novo" },
  },
  {
    paths: ["/atividades"],
    next: { buttonLabel: "Cadastrar turmas", to: "/turmas/novo" },
  },
  {
    paths: ["/turmas"],
    next: { buttonLabel: "Cadastrar plano de aula", to: "/planos-aula/novo" },
  },
  {
    paths: ["/planos-aula"],
    next: { buttonLabel: "Registrar presenças", to: "/presencas" },
  },
  {
    paths: ["/presencas"],
    next: {
      buttonLabel: "Cadastrar eventos culturais",
      to: "/eventos-culturais/novo",
    },
  },
  {
    paths: ["/eventos-culturais"],
    next: { buttonLabel: "Cadastrar evidências", to: "/evidencias/novo" },
  },
  {
    paths: ["/evidencias"],
    next: { buttonLabel: "Cadastrar editais", to: "/editais/novo" },
  },
  {
    paths: ["/editais"],
    next: {
      buttonLabel: "Cadastrar propostas de edital",
      to: "/propostas-editais/novo",
    },
  },
  {
    paths: ["/propostas-editais"],
    next: {
      buttonLabel: "Cadastrar equipe da proposta",
      to: "/equipe-edital/novo",
    },
  },
  {
    paths: ["/equipe-edital"],
    next: {
      buttonLabel: "Cadastrar plano de comunicação",
      to: "/planos-comunicacao/novo",
    },
  },
  {
    paths: ["/planos-comunicacao"],
    next: {
      buttonLabel: "Cadastrar ações de divulgação",
      to: "/acoes-divulgacao/novo",
    },
  },
  {
    paths: ["/acoes-divulgacao"],
    next: {
      buttonLabel: "Cadastrar aplicação de recursos",
      to: "/aplicacao-de-recursos",
    },
  },
  {
    paths: ["/aplicacao-de-recursos", "/planejamento-financeiro"],
    next: {
      buttonLabel: "Cadastrar habilitação documental",
      to: "/habilitacoes-propostas/novo",
    },
  },
  {
    paths: ["/habilitacoes-propostas"],
    next: {
      buttonLabel: "Cadastrar resultado da proposta",
      to: "/resultados-propostas/novo",
    },
  },
  {
    paths: ["/resultados-propostas"],
    next: {
      buttonLabel: "Cadastrar contas bancárias",
      to: "/contas-bancarias/novo",
    },
  },
  {
    paths: ["/financeiro"],
    next: {
      buttonLabel: "Cadastrar contas bancárias",
      to: "/contas-bancarias/novo",
    },
  },
  {
    paths: ["/contas-bancarias"],
    next: { buttonLabel: "Cadastrar fornecedores", to: "/fornecedores/novo" },
  },
  {
    paths: ["/fornecedores"],
    next: { buttonLabel: "Cadastrar doadores", to: "/doadores/novo" },
  },
  {
    paths: ["/doadores"],
    next: { buttonLabel: "Cadastrar parceiros", to: "/parceiros/novo" },
  },
  {
    paths: ["/parceiros"],
    next: { buttonLabel: "Cadastrar contas a pagar", to: "/contas-pagar/novo" },
  },
  {
    paths: ["/contas-pagar"],
    next: {
      buttonLabel: "Cadastrar contas a receber",
      to: "/contas-receber/novo",
    },
  },
  {
    paths: ["/contas-receber"],
    next: { buttonLabel: "Cadastrar doações", to: "/doacoes/novo" },
  },
  {
    paths: ["/doacoes"],
    next: {
      buttonLabel: "Cadastrar transferências bancárias",
      to: "/transferencias-bancarias/novo",
    },
  },
  {
    paths: ["/transferencias-bancarias"],
    next: {
      buttonLabel: "Consultar movimentações bancárias",
      to: "/movimentacoes-bancarias",
    },
  },
  {
    paths: ["/movimentacoes-bancarias"],
    next: {
      buttonLabel: "Realizar conciliação bancária",
      to: "/conciliacao-bancaria",
    },
  },
  {
    paths: ["/conciliacao-bancaria"],
    next: { buttonLabel: "Consultar fluxo de caixa", to: "/fluxo-caixa" },
  },
  {
    paths: ["/fluxo-caixa"],
    next: {
      buttonLabel: "Cadastrar cumprimento de metas",
      to: "/prestacao-metas/novo",
    },
  },
  {
    paths: ["/prestacao-metas"],
    next: {
      buttonLabel: "Cadastrar prestação de contas",
      to: "/prestacao-contas/novo",
    },
  },
  {
    paths: ["/prestacao-contas"],
    next: { buttonLabel: "Cadastrar patrimônios", to: "/patrimonio/novo" },
  },
  {
    paths: ["/patrimonio"],
    next: { buttonLabel: "Cadastrar empréstimos", to: "/emprestimos/novo" },
  },
];

export function nextStepForPath(pathname: string): NextStepDefinition | null {
  const normalized = pathname
    .replace(/\/(novo|editar)$/, "")
    .replace(/\/[^/]+$/, (segment) => (/^\/\d+$/.test(segment) ? "" : segment));
  return (
    JOURNEY.find((step) =>
      step.paths.some(
        (path) => normalized === path || normalized.startsWith(`${path}/`),
      ),
    )?.next ?? null
  );
}

type Listener = (payload: NextStepPopupPayload) => void;

const listeners = new Set<Listener>();

export function subscribeNextStepPopup(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitNextStepPopup(payload: NextStepPopupPayload): void {
  listeners.forEach((listener) => listener(payload));
}

/**
 * Dispara a próxima etapa oficial a partir da rota que acabou de concluir um
 * cadastro. O popup é mantido pelo host global durante um minuto, inclusive
 * após a navegação de volta para a listagem.
 */
export function emitJourneyNextStep(pathname?: string): void {
  const currentPath =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  const next = nextStepForPath(currentPath);
  if (!next) return;

  emitNextStepPopup({
    message: nextStepMessage(next.buttonLabel),
    ...next,
  });
}

export function imperativoFrase(label: string): string {
  const limpo = label.trim().replace(/\.$/, "");
  if (!limpo) return limpo;

  const [primeira, ...resto] = limpo.split(/\s+/);
  const verbo = primeira.toLowerCase();
  let imperativo = verbo;

  if (/ar$/.test(verbo)) imperativo = `${verbo.slice(0, -2)}e`;
  else if (/(er|ir)$/.test(verbo)) imperativo = `${verbo.slice(0, -2)}a`;

  return [imperativo, ...resto].join(" ");
}

export function nextStepMessage(label: string): string {
  return `Sua organização está avançando. Agora, ${imperativoFrase(label)}.`;
}

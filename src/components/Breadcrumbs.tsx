import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment, useMemo } from "react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  colaboradores: "Colaboradores",
  atividades: "Atividades",
  diretoria: "Diretoria",
  agentes: "Agente Cultural",
  financeiro: "Controle Financeiro",
  "acoes-divulgacao": "Ações de Divulgação",
  "eventos-culturais": "Eventos Culturais",
  participantes: "Participantes",
  turmas: "Turmas",
  presencas: "Presenças",
  documentos: "Documentos",
  projetos: "Projetos",
  integrantes: "Integrantes",
  patrimonio: "Patrimônio",
  emprestimos: "Empréstimos",
  relatorios: "Relatórios",
  curriculos: "Currículos",
  "trajetorias-culturais": "Trajetória Cultural",
  configuracoes: "Configurações",
  empresa: "Empresa",
  novo: "Novo",
  editar: "Editar",
  organizacoes: "Dados da Organização",
  "metas-projeto": "Metas do Projeto",
  cronograma: "Cronograma do Projeto",
  editais: "Editais",
  "propostas-edital": "Proposta de Edital",
  "habilitacoes-propostas": "Habilitação Documental",
  "equipe-edital": "Equipe da Proposta",
  "plano-comunicacao": "Execução da Divulgação",
  "planejamento-financeiro": "Orçamento da Proposta",
  evidencias: "Evidências de Execução",
  "resultados-propostas": "Resultado da Proposta",
  "prestacao-contas": "Prestação de Contas",
  "prestacao-metas": "Cumprimento de Metas",
  usuarios: "Usuários"
};

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();

  const crumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const items: { label: string; to?: string; isLast: boolean }[] = [
      { label: "Início", to: "/", isLast: segments.length === 0 },
    ];

    let acc = "";
    segments.forEach((seg, idx) => {
      acc += `/${seg}`;
      const isLast = idx === segments.length - 1;
      let label = SEGMENT_LABELS[seg];

      if (!label) {
        // Likely an :id segment → "Visualizar" (or "Editar" handled by next segment)
        if (params.id && seg === params.id) {
          // If it's the last, it's a view page. Otherwise it's a parent of /editar.
          label = isLast ? "Visualizar" : "Detalhes";
        } else {
          label = decodeURIComponent(seg);
        }
      }

      items.push({ label, to: isLast ? undefined : acc, isLast });
    });

    return items;
  }, [location.pathname, params.id]);

  if (crumbs.length <= 1 && location.pathname === "/") {
    // On dashboard root, still show a single crumb for consistency
  }

  return (
    <nav aria-label="breadcrumb" className="px-4 sm:px-6 lg:px-8 pt-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && (
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              </li>
            )}
            <li className="flex items-center">
              {c.to ? (
                <Link
                  to={c.to}
                  className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {i === 0 && <Home className="h-3 w-3" />}
                  <span>{c.label}</span>
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="inline-flex items-center gap-1 font-medium text-foreground"
                >
                  {i === 0 && <Home className="h-3 w-3" />}
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

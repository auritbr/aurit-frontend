import { Fragment, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/* ===============================================================
   LABELS DOS SEGMENTOS
================================================================ */

const SEGMENT_LABELS: Record<string, string> = {
  /* -------------------------------------------------------------
     Geral
  ------------------------------------------------------------- */

  dashboard: "Dashboard",
  novo: "Novo",
  editar: "Editar",
  visualizar: "Visualizar",
  detalhes: "Detalhes",

  /* -------------------------------------------------------------
     Institucional
  ------------------------------------------------------------- */

  organizacoes: "Dados Institucionais",
  diretoria: "Diretoria",
  documentos: "Documentos",
  agentes: "Agentes Culturais",
  "agentes-culturais": "Agentes Culturais",

  /* -------------------------------------------------------------
     Pessoas e Trajetórias
  ------------------------------------------------------------- */

  colaboradores: "Colaboradores",
  integrantes: "Integrantes",
  participantes: "Participantes",
  "participantes-geral": "Participantes",
  curriculos: "Currículos",
  "trajetorias-culturais": "Trajetórias Culturais",

  /* -------------------------------------------------------------
     Projetos e Planejamento
  ------------------------------------------------------------- */

  projetos: "Projetos",
  "metas-projeto": "Metas do Projeto",
  cronograma: "Cronograma do Projeto",
  cronogramas: "Cronograma do Projeto",
  "cronograma-projeto": "Cronograma do Projeto",
  "plano-trabalho": "Plano de Trabalho",

  /* -------------------------------------------------------------
     Execução
  ------------------------------------------------------------- */

  atividades: "Atividades",
  turmas: "Turmas",
  "planos-aula": "Planos de Aula",
  presencas: "Presenças",
  "eventos-culturais": "Eventos Culturais",

  /* -------------------------------------------------------------
     Evidências
  ------------------------------------------------------------- */

  evidencias: "Evidências",
  "evidencias-execucao": "Evidências",

  /* -------------------------------------------------------------
     Editais e Propostas
  ------------------------------------------------------------- */

  editais: "Editais",

  "propostas-edital": "Propostas de Edital",
  "propostas-editais": "Propostas de Edital",

  "equipe-edital": "Equipe da Proposta",
  "equipe-proposta": "Equipe da Proposta",

  "plano-comunicacao": "Plano de Comunicação",
  "planos-comunicacao": "Plano de Comunicação",

  "acoes-divulgacao": "Ações de Divulgação",

  "aplicacao-de-recursos": "Aplicação de Recursos",
  "planejamento-financeiro": "Aplicação de Recursos",

  "habilitacoes-propostas": "Habilitação Documental",
  "habilitacao-documental": "Habilitação Documental",

  "resultados-propostas": "Resultado da Proposta",
  "resultado-proposta": "Resultado da Proposta",

  /* -------------------------------------------------------------
     Financeiro
  ------------------------------------------------------------- */

  financeiro: "Financeiro",
  "painel-financeiro": "Painel Financeiro",

  "contas-bancarias": "Contas Bancárias",

  doadores: "Doadores",
  doacoes: "Doações",

  fornecedores: "Fornecedores",
  parceiros: "Parceiros",

  "contas-pagar": "Contas a Pagar",
  "contas-receber": "Contas a Receber",

  "transferencias-bancarias": "Transferências Bancárias",
  "movimentacoes-bancarias": "Movimentações Bancárias",

  "movimentacoes-financeiras": "Movimentações Bancárias",

  "receitas-despesas-categoria": "Receitas e Despesas",

  "saldos-contas-bancarias": "Contas Bancárias",

  "doacoes-recebidas": "Doações",

  "fornecedores-pagamentos": "Fornecedores",

  "extrato-bancario": "Extrato Bancário",
  "fluxo-caixa": "Fluxo de Caixa",

  "centro-custo": "Centro de Custo",
  "centros-custo": "Centro de Custo",

  "conciliacao-bancaria": "Conciliação Bancária",

  /* -------------------------------------------------------------
     Prestação de Contas
  ------------------------------------------------------------- */

  "prestacao-contas": "Prestação de Contas",
  "prestacoes-contas": "Prestação de Contas",

  "prestacao-metas": "Cumprimento de Metas",
  "prestacoes-metas": "Cumprimento de Metas",

  /* -------------------------------------------------------------
     Patrimônio
  ------------------------------------------------------------- */

  patrimonio: "Patrimônios",
  patrimonios: "Patrimônios",
  emprestimos: "Empréstimos",

  /* -------------------------------------------------------------
     Relatórios
  ------------------------------------------------------------- */

  relatorios: "Relatórios",
  "relatorios-gerenciais": "Relatórios Gerenciais",

  "indicadores-sociodemograficos": "Relatório Sociodemográfico",
  "relatorio-sociodemografico": "Relatório Sociodemográfico",

  "relatorio-presencas": "Relatório de Presenças",
  "relatorio-participacao": "Relatório de Participação",

  "geral-projetos": "Geral de Projetos",
  "execucao-atividades": "Execução das Atividades",
  "turmas-atendimento": "Turmas e Atendimento",
  "metas-resultados": "Metas e Resultados",
  "cronograma-prazos": "Cronograma e Prazos",
  "impacto-social-cultural": "Impacto Social e Cultural",
  "institucional-organizacao": "Institucional da Organização",
  "regularidade-documental": "Regularidade Documental",

  /* -------------------------------------------------------------
     Exportações
  ------------------------------------------------------------- */

  exportacoes: "Exportações",
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF",

  /* -------------------------------------------------------------
     Configurações
  ------------------------------------------------------------- */

  configuracoes: "Configurações",

  empresa: "Empresa",
  organizacao: "Organização",

  usuarios: "Usuários",

  notificacoes: "Notificações",
  "alertas-email": "Alertas por e-mail",
  whatsapp: "WhatsApp",

  "modelos-documento": "Layouts de Impressão",
  layout: "Layout",

  aparencia: "Aparência",
  permissoes: "Permissões",

  "central-do-cliente": "Central do Cliente",

  /* -------------------------------------------------------------
     Importações
  ------------------------------------------------------------- */

  importacoes: "Importações",
  importar: "Importar",

  /* -------------------------------------------------------------
     Ajuda
  ------------------------------------------------------------- */

  wiki: "Wiki",
  ajuda: "Ajuda",
};

interface BreadcrumbItem {
  label: string;
  to?: string;
  isLast: boolean;
}

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();

  const crumbs = useMemo<BreadcrumbItem[]>(() => {
    const segments = location.pathname.split("/").filter(Boolean);

    const items: BreadcrumbItem[] = [
      {
        label: "Início",
        to: "/",
        isLast: segments.length === 0,
      },
    ];

    let accumulatedPath = "";

    segments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`;

      const isLast = index === segments.length - 1;

      let label = SEGMENT_LABELS[segment];

      if (!label) {
        if (params.id && segment === params.id) {
          label = isLast ? "Visualizar" : "Detalhes";
        } else {
          label = decodeURIComponent(segment);
        }
      }

      items.push({
        label,
        to: isLast ? undefined : accumulatedPath,
        isLast,
      });
    });

    return items;
  }, [location.pathname, params.id]);

  return (
    <nav aria-label="breadcrumb" className="px-4 pt-4 sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {/* Separador */}

            {index > 0 && (
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              </li>
            )}

            {/* Item */}

            <li className="flex items-center">
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                >
                  {index === 0 && <Home className="h-3 w-3" />}

                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="inline-flex items-center gap-1 font-medium text-foreground"
                >
                  {index === 0 && <Home className="h-3 w-3" />}

                  <span>{crumb.label}</span>
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

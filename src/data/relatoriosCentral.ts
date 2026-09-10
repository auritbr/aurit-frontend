// Organização visual da central de relatórios. Os itens continuam sendo
// definidos exclusivamente pelo catálogo: esta camada só os reagrupa.
import {
  Activity,
  BadgeCheck,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  FolderKanban,
  Landmark,
  Layers,
  Megaphone,
  Users,
  WalletCards,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  RELATORIOS_FLAT,
  type RelatorioCatalogoItem,
} from "@/data/relatoriosCatalogo";

export interface RelatorioAreaGrupo {
  id: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  itens: RelatorioCatalogoItem[];
}

interface AreaDef {
  id: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  slugs: string[];
}

const AREAS: AreaDef[] = [
  {
    id: "gerenciais",
    titulo: "Relatórios Gerenciais",
    descricao:
      "Análises consolidadas para acompanhar a gestão, a execução e os resultados da organização.",
    icon: ChartNoAxesCombined,
    slugs: [
      "geral-projetos",
      "execucao-atividades",
      "turmas-atendimento",
      "metas-resultados",
      "cronograma-prazos",
      "impacto-social-cultural",
      "institucional-organizacao",
      "regularidade-documental",
      "receitas-despesas-categoria",
    ],
  },
  {
    id: "institucional",
    titulo: "Institucional",
    descricao:
      "Informações oficiais, estrutura administrativa e regularidade da organização.",
    icon: Landmark,
    slugs: ["diretoria", "documentos", "agentes"],
  },

  {
    id: "pessoas-trajetorias",
    titulo: "Pessoas e Trajetórias",
    descricao:
      "Cadastros, vínculos, participação e trajetória das pessoas relacionadas à organização ou iniciativa.",
    icon: Users,
    slugs: ["colaboradores", "integrantes", "participantes-geral"],
  },

  {
    id: "projetos-planejamento",
    titulo: "Projetos e Planejamento",
    descricao:
      "Planejamento, metas, cronogramas e acompanhamento dos projetos desenvolvidos pela organização.",
    icon: FolderKanban,
    slugs: ["projetos", "metas-projeto", "cronogramas"],
  },

  {
    id: "execucao",
    titulo: "Execução",
    descricao:
      "Atividades, turmas, planos de aula, presenças e eventos realizados durante a execução dos projetos.",
    icon: Activity,
    slugs: ["atividades", "turmas", "planos-aula", "eventos-culturais"],
  },

  {
    id: "evidencias",
    titulo: "Evidências",
    descricao:
      "Registros que demonstram e comprovam a realização das ações e atividades planejadas.",
    icon: BadgeCheck,
    slugs: ["evidencias"],
  },

  {
    id: "editais-propostas",
    titulo: "Editais e Propostas",
    descricao:
      "Oportunidades, propostas, equipes, comunicação, aplicação de recursos, habilitação e resultados.",
    icon: BookOpen,
    slugs: [
      "editais",
      "propostas-editais",
      "equipe-edital",
      "planos-comunicacao",
      "acoes-divulgacao",
      "aplicacao-de-recursos",
      "habilitacoes-propostas",
      "resultados-propostas",
    ],
  },

  {
    id: "financeiro",
    titulo: "Financeiro",
    descricao:
      "Contas, fornecedores, doadores, parceiros, pagamentos, recebimentos, doações e movimentações financeiras.",
    icon: WalletCards,
    slugs: [
      "saldos-contas-bancarias",
      "fornecedores-pagamentos",
      "doadores",
      "parceiros",
      "contas-pagar",
      "contas-receber",
      "doacoes-recebidas",
      "transferencias-bancarias",
      "movimentacoes-financeiras",
      "conciliacao-bancaria",
      "fluxo-caixa",
    ],
  },

  {
    id: "prestacao-contas",
    titulo: "Prestação de Contas",
    descricao:
      "Cumprimento de metas, consolidação das informações e acompanhamento das prestações de contas.",
    icon: ClipboardCheck,
    slugs: ["prestacoes-metas", "prestacoes-contas"],
  },

  {
    id: "patrimonio",
    titulo: "Patrimônio",
    descricao:
      "Bens patrimoniais, condições de conservação e empréstimos realizados.",
    icon: Warehouse,
    slugs: ["patrimonios", "emprestimos"],
  },
];

const bySlug = new Map(RELATORIOS_FLAT.map((item) => [item.slug, item]));
const usados = new Set<string>();
const grupos: RelatorioAreaGrupo[] = AREAS.map((area) => ({
  id: area.id,
  titulo: area.titulo,
  descricao: area.descricao,
  icon: area.icon,
  itens: area.slugs
    .map((slug) => {
      const item = bySlug.get(slug);
      if (item) usados.add(slug);
      return item;
    })
    .filter((item): item is RelatorioCatalogoItem => Boolean(item)),
})).filter((grupo) => grupo.itens.length > 0);

const restantes = RELATORIOS_FLAT.filter((item) => !usados.has(item.slug));
if (restantes.length > 0) {
  grupos.push({
    id: "outros",
    titulo: "Outros Relatórios",
    descricao: "Demais relatórios disponíveis na organização.",
    icon: Layers,
    itens: restantes,
  });
}

export const RELATORIOS_AREA_DESTAQUE = grupos[0];
export const RELATORIOS_AREAS = grupos.slice(1);
export const RELATORIOS_AREAS_TODAS = grupos;

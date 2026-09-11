/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type ModuloPermissao,
  type PermissoesModulo,
} from "@/lib/permissoes";

const ROTAS_POR_MODULO: ReadonlyArray<readonly [string, ModuloPermissao]> = [
  ["/configuracoes/central-do-cliente", "CENTRAL_CLIENTE"],
  ["/configuracoes", "CONFIGURACOES"],
  ["/alertas-email", "CONFIGURACOES"],
  ["/painel-financeiro", "PAINEL_FINANCEIRO"],
  ["/contas-bancarias", "CONTAS_BANCARIAS"],
  ["/contas-pagar", "CONTAS_PAGAR"],
  ["/contas-receber", "CONTAS_RECEBER"],
  ["/transferencias-bancarias", "TRANSFERENCIAS_BANCARIAS"],
  ["/movimentacoes-bancarias", "MOVIMENTACOES_BANCARIAS"],
  ["/conciliacao-bancaria", "CONCILIACOES_BANCARIAS"],
  ["/fluxo-caixa", "FLUXO_CAIXA"],
  ["/planejamento-financeiro", "PLANEJAMENTO_FINANCEIRO"],
  ["/aplicacao-de-recursos", "PLANEJAMENTO_FINANCEIRO"],
  ["/metas-projeto", "METAS_PROJETO"],
  ["/planos-aula", "PLANOS_AULA"],
  ["/propostas-edital", "PROPOSTAS_EDITAL"],
  ["/equipe-edital", "EQUIPE_EDITAL"],
  ["/resultados-propostas", "RESULTADO_PROPOSTA"],
  ["/habilitacoes-propostas", "HABILITACAO"],
  ["/habilitacao", "HABILITACAO"],
  ["/plano-comunicacao", "PLANO_COMUNICACAO"],
  ["/acoes-divulgacao", "ACOES_DIVULGACAO"],
  ["/eventos-culturais", "EVENTOS_CULTURAIS"],
  ["/prestacao-contas", "PRESTACAO_CONTAS"],
  ["/prestacao-metas", "PRESTACAO_METAS"],
  ["/trajetorias-culturais", "TRAJETORIAS_CULTURAIS"],
  ["/curriculos", "CURRICULOS"],
  ["/emprestimos", "EMPRESTIMOS"],
  ["/patrimonio", "PATRIMONIO"],
  ["/documentos", "DOCUMENTOS"],
  ["/modelos-documento", "DOCUMENTOS"],
  ["/editais", "EDITAIS"],
  ["/agentes", "AGENTES_CULTURAIS"],
  ["/colaboradores", "COLABORADORES"],
  ["/integrantes", "INTEGRANTES"],
  ["/participantes", "PARTICIPANTES"],
  ["/cronograma", "CRONOGRAMA"],
  ["/atividades", "ATIVIDADES"],
  ["/turmas", "TURMAS"],
  ["/presencas", "PRESENCAS"],
  ["/projetos", "PROJETOS"],
  ["/diretoria", "DIRETORIA"],
  ["/organizacoes", "ORGANIZACAO"],
  ["/evidencias", "EVIDENCIAS"],
  ["/doacoes", "DOACOES"],
  ["/doadores", "DOADORES"],
  ["/fornecedores", "FORNECEDORES"],
  ["/parceiros", "PARCEIROS"],
  ["/financeiro", "FINANCEIRO"],
  ["/relatorios", "RELATORIOS"],
  ["/usuarios", "USUARIOS"],
  ["/dashboard", "DASHBOARD"],
  ["/", "DASHBOARD"],
];

export function moduloDaRotaAtual(pathname: string): ModuloPermissao | null {
  const rota = ROTAS_POR_MODULO.find(([prefixo]) =>
    prefixo === "/"
      ? pathname === "/"
      : pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );

  return rota?.[1] ?? null;
}

interface ModulePermissionContextValue {
  modulo: ModuloPermissao | null;
  carregando: boolean;
  permissoes: PermissoesModulo;
}

const ModulePermissionContext = createContext<ModulePermissionContextValue>({
  modulo: null,
  carregando: false,
  permissoes: permissoesVazias,
});

export function ModulePermissionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const modulo = useMemo(() => moduloDaRotaAtual(pathname), [pathname]);
  const [carregando, setCarregando] = useState(Boolean(modulo));
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  useEffect(() => {
    let ativo = true;

    if (!modulo) {
      setCarregando(false);
      setPermissoes(permissoesVazias);
      return () => {
        ativo = false;
      };
    }

    setCarregando(true);
    setPermissoes(permissoesVazias);

    void getPermissoesUsuarioLogadoPorModulo(modulo)
      .then((resultado) => {
        if (ativo) setPermissoes(resultado);
      })
      .catch(() => {
        if (ativo) setPermissoes(permissoesVazias);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [modulo]);

  return (
    <ModulePermissionContext.Provider
      value={{ modulo, carregando, permissoes }}
    >
      {children}
    </ModulePermissionContext.Provider>
  );
}

export function useModulePermissionContext() {
  return useContext(ModulePermissionContext);
}

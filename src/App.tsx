import { useEffect, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProprietarioRoute from "@/components/ProprietarioRoute";
import TenantRoute from "@/components/TenantRoute";

import ProtectedRouteWithPermission, {
  type RequiredPermission,
} from "@/components/ProtectedRouteWithPermission";
import PublicRoute from "@/components/PublicRoute";
import { AccessDenied } from "@/components/AccessDenied";
import {
  getUsuarioLogadoStorage,
  isAuthenticated,
  limparSessaoUsuario,
} from "@/lib/auth";
import {
  logoutEvent,
  startInactivityMonitoring,
  stopInactivityMonitoring,
} from "@/lib/inactivityLogout";
import { NextStepPopupHost } from "./components/NextStepPopup";
import { PlanNetworkGuard } from "@/components/PlanNetworkGuard";

import Dashboard from "./pages/Dashboard.tsx";
import Inicio from "./pages/Inicio.tsx";

import Colaboradores from "./pages/Colaboradores.tsx";
import ColaboradorForm from "./pages/ColaboradorForm.tsx";

import Atividades from "./pages/Atividades.tsx";
import AtividadeForm from "./pages/AtividadeForm.tsx";

import Agentes from "./pages/Agentes.tsx";
import AgenteForm from "./pages/AgenteForm.tsx";

import Financeiro from "./pages/Financeiro.tsx";
import PainelFinanceiro from "./pages/PainelFinanceiro.tsx";
import FinanceiroForm from "./pages/FinanceiroForm.tsx";
import ContasBancarias from "./pages/ContaBancaria.tsx";
import ContaBancariaForm from "./pages/ContaBancariaForm.tsx";
import ContasPagar from "./pages/ContasPagar.tsx";
import ContaPagarForm from "./pages/ContaPagarForm.tsx";
import ContaReceber from "./pages/ContaReceber.tsx";
import ContaReceberForm from "./pages/ContaReceberForm.tsx";
import TransferenciasBancarias from "./pages/TransferenciasBancarias.tsx";
import TransferenciaBancariaForm from "./pages/TransferenciaBancariaForm.tsx";
import MovimentacaoBancaria from "./pages/MovimentacaoBancaria.tsx";
import FluxoCaixa from "./pages/FluxoCaixa.tsx";
import ConciliacaoBancaria from "./pages/ConciliacaoBancaria.tsx";
import Doacoes from "./pages/Doacao.tsx";
import DoacaoForm from "./pages/DoacaoForm.tsx";
import Doadores from "./pages/Doador.tsx";
import DoadorForm from "./pages/DoadorForm.tsx";
import Fornecedores from "./pages/Fornecedor.tsx";
import FornecedorForm from "./pages/FornecedorForm.tsx";
import Parceiros from "./pages/Parceiro.tsx";
import ParceiroForm from "./pages/ParceiroForm.tsx";

import AcoesDivulgacao from "./pages/AcoesDivulgacao.tsx";
import AcaoDivulgacaoForm from "./pages/AcaoDivulgacaoForm.tsx";

import PlanoComunicacao from "./pages/PlanoComunicacao.tsx";
import PlanoComunicacaoForm from "./pages/PlanoComunicacaoForm.tsx";

import EventosCulturais from "./pages/EventosCulturais.tsx";
import EventoCulturalForm from "./pages/EventoCulturalForm.tsx";

import Participantes from "./pages/Participantes.tsx";
import ParticipanteForm from "./pages/ParticipanteForm.tsx";

import Turmas from "./pages/Turmas.tsx";
import TurmaForm from "./pages/TurmaForm.tsx";

import Presencas from "./pages/Presencas.tsx";

import PlanoAula from "./pages/PlanoAula.tsx";
import PlanoAulaForm from "./pages/PlanoAulaForm.tsx";

import Documentos from "./pages/Documentos.tsx";
import DocumentoForm from "./pages/DocumentoForm.tsx";
import ModelosDocumento from "./pages/ModeloDocumento.tsx";
import ModeloDocumentoForm from "./pages/ModeloDocumentoForm.tsx";

import Evidencias from "./pages/Evidencias.tsx";
import EvidenciaForm from "./pages/EvidenciaForm.tsx";

import MetasProjeto from "./pages/MetasProjeto.tsx";
import MetaProjetoForm from "./pages/MetaProjetoForm.tsx";

import PrestacaoMetas from "./pages/PrestacaoMetas.tsx";
import PrestacaoMetaForm from "./pages/PrestacaoMetaForm.tsx";

import PrestacaoContas from "./pages/PrestacaoContas.tsx";
import PrestacaoContasForm from "./pages/PrestacaoContasForm.tsx";

import Projetos from "./pages/Projetos.tsx";
import ProjetoForm from "./pages/ProjetoForm.tsx";
import PlanoTrabalhoPage from "./pages/PlanoTrabalho.tsx";

import Integrantes from "./pages/Integrantes.tsx";
import IntegranteForm from "./pages/IntegranteForm.tsx";

import Patrimonio from "./pages/Patrimonio.tsx";
import PatrimonioForm from "./pages/PatrimonioForm.tsx";

import Emprestimos from "./pages/Emprestimos.tsx";
import EmprestimoForm from "./pages/EmprestimoForm.tsx";

import Curriculos from "./pages/Curriculos.tsx";
import CurriculoForm from "./pages/CurriculoForm.tsx";

import TrajetoriasCulturais from "./pages/TrajetoriasCulturais.tsx";
import TrajetoriaCulturalForm from "./pages/TrajetoriaCulturalForm.tsx";

import Relatorios from "./pages/Relatorios.tsx";
import RelatorioGeralPage from "./pages/RelatorioGeralPage.tsx";
import RelatorioParticipacaoPresencaPage from "./pages/RelatorioParticipacaoPresencaPage.tsx";
import RelatorioProjetosExecucaoPage from "./pages/RelatorioProjetosExecucaoPage.tsx";
import RelatorioFinanceiroPatrimonioPage from "./pages/RelatorioFinanceiroPatrimonioPage.tsx";
import RelatorioInstitucionalDocumentalPage from "./pages/RelatorioInstitucionalDocumentalPage.tsx";
import RelatorioDetalhePage from "./pages/RelatorioDetalhePage.tsx";
import IndicadoresSociodemograficos from "@/pages/IndicadoresSociodemograficos.tsx";
import RelatorioPresencas from "./pages/RelatorioPresencas.tsx";
import RelatorioParticipantes from "./pages/RelatorioParticipantes.tsx";
import RelatorioCronogramaPrazos from "./pages/relatorios/RelatorioCronogramaPrazos.tsx";
import RelatorioExecucaoAtividades from "./pages/relatorios/RelatorioExecucaoAtividades.tsx";
import RelatorioGeralProjetos from "./pages/relatorios/RelatorioGeralProjetos.tsx";
import RelatorioImpactoSocialCultural from "./pages/relatorios/RelatorioImpactoSocialCultural.tsx";
import RelatorioInstitucionalOrganizacao from "./pages/relatorios/RelatorioInstitucionalOrganizacao.tsx";
import RelatorioMetasResultados from "./pages/relatorios/RelatorioMetasResultados.tsx";
import RelatorioRegularidadeDocumental from "./pages/relatorios/RelatorioRegularidadeDocumental.tsx";
import RelatorioTurmasAtendimento from "./pages/relatorios/RelatorioTurmasAtendimento.tsx";
import RelatorioEvidencias from "./pages/relatorios/RelatorioEvidencias.tsx";
import RelatorioPrestacaoContas from "./pages/relatorios/RelatorioPrestacaoContas.tsx";
import RelatorioCumprimentoMetas from "./pages/relatorios/RelatorioCumprimentoMetas.tsx";
import RelatorioEmprestimos from "./pages/relatorios/RelatorioEmprestimos.tsx";
import RelatorioFluxoCaixa from "./pages/relatorios/financeiro/RelatorioFluxoCaixa.tsx";
import RelatorioMovimentacoesFinanceiras from "./pages/relatorios/financeiro/RelatorioMovimentacoesFinanceiras.tsx";
import RelatorioReceitasDespesasCategoria from "./pages/relatorios/financeiro/RelatorioReceitasDespesasCategoria.tsx";
import RelatorioSaldosContasBancarias from "./pages/relatorios/financeiro/RelatorioSaldosContasBancarias.tsx";
import RelatorioContasPagarRel from "./pages/relatorios/financeiro/RelatorioContasPagarRel.tsx";
import RelatorioContasReceberRel from "./pages/relatorios/financeiro/RelatorioContasReceberRel.tsx";
import RelatorioConciliacaoBancariaRel from "./pages/relatorios/financeiro/RelatorioConciliacaoBancariaRel.tsx";
import RelatorioTransferenciasBancarias from "./pages/relatorios/financeiro/RelatorioTransferenciasBancarias.tsx";
import RelatorioDoacoesRecebidas from "./pages/relatorios/financeiro/RelatorioDoacoesRecebidas.tsx";
import RelatorioFornecedoresPagamentos from "./pages/relatorios/financeiro/RelatorioFornecedoresPagamentos.tsx";
import RelatorioDoadores from "./pages/relatorios/financeiro/RelatorioDoadores.tsx";
import RelatorioParceiros from "./pages/relatorios/financeiro/RelatorioParceiros.tsx";

import ConfiguracaoEmpresa from "./pages/ConfiguracaoEmpresa.tsx";
import CentralCliente from "./pages/CentralCliente.tsx";

import Editais from "./pages/Editais.tsx";

import PropostasEdital from "./pages/PropostasEdital.tsx";
import PropostaEditalForm from "./pages/PropostaEditalForm.tsx";

import ResultadosPropostas from "./pages/ResultadosPropostas.tsx";
import ResultadoPropostaForm from "./pages/ResultadoPropostaForm.tsx";

import EquipeEdital from "./pages/EquipeEdital.tsx";
import EquipeEditalForm from "./pages/EquipeEditalForm.tsx";

import Habilitacao from "./pages/Habilitacao.tsx";
import HabilitacaoForm from "./pages/HabilitacaoForm.tsx";

import Cronograma from "./pages/Cronograma.tsx";
import PlanejamentoFinanceiro from "./pages/PlanejamentoFinanceiro.tsx";

import Organizacao from "./pages/Organizacao.tsx";
import Diretoria from "./pages/Diretoria.tsx";

import ControleEmpresas from "./pages/ControleEmpresas.tsx";
import ControleEmpresaDetalhe from "./pages/ControleEmpresaDetalhe.tsx";
import ConfiguracaoEmpresaProprietario from "./pages/ConfiguracaoEmpresaProprietario.tsx";

import Login from "./pages/Login.tsx";
import LoginGoogle from "./pages/LoginGoogle.tsx";
import RecuperarSenha from "./pages/RecuperarSenha.tsx";
import AtivarConta from "./pages/AtivarConta.tsx";
import RedefinirSenha from "./pages/RedefinirSenha.tsx";

import Usuarios from "./pages/Usuarios.tsx";
import UsuarioForm from "./pages/UsuarioForm.tsx";
import UsuarioPermissoes from "./pages/UsuarioPermissoes.tsx";
import AlertasEmail from "./pages/AlertasEmail.tsx";
import Notificacoes from "./pages/Notificacoes.tsx";

const queryClient = new QueryClient();

const P = {
  visualizar: "VISUALIZAR",
  criar: "CRIAR",
  editar: "EDITAR",
} as const;

const permission = (
  modulo: RequiredPermission["modulo"],
  acao: RequiredPermission["acao"] = P.visualizar,
): RequiredPermission => ({
  modulo,
  acao,
});

function protectedPage(
  element: ReactElement,
  requiredPermission?: RequiredPermission,
) {
  return (
    <TenantRoute>
      <ProtectedRouteWithPermission requiredPermission={requiredPermission}>
        {element}
      </ProtectedRouteWithPermission>
    </TenantRoute>
  );
}

function protectedProprietarioPage(element: ReactElement) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const usuario = getUsuarioLogadoStorage();

  if (usuario?.userRole !== "ADMIN_PROPRIETARIO") {
    return <AccessDenied />;
  }

  return element;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      stopInactivityMonitoring();
      return;
    }

    function handleAutoLogout() {
      limparSessaoUsuario();
      stopInactivityMonitoring();
      navigate("/login", { replace: true });
    }

    window.addEventListener(logoutEvent, handleAutoLogout);
    startInactivityMonitoring();

    return () => {
      window.removeEventListener(logoutEvent, handleAutoLogout);
      stopInactivityMonitoring();
    };
  }, [navigate, location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/login/google" element={<LoginGoogle />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/esqueci-senha" element={<RecuperarSenha />} />
        <Route path="/ativar-conta" element={<AtivarConta />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route
          path="/"
          element={protectedPage(<Inicio />, permission("DASHBOARD"))}
        />

        <Route
          path="/dashboard"
          element={protectedPage(<Dashboard />, permission("DASHBOARD"))}
        />

        <Route
          path="/colaboradores"
          element={protectedPage(
            <Colaboradores />,
            permission("COLABORADORES"),
          )}
        />
        <Route
          path="/colaboradores/novo"
          element={protectedPage(
            <ColaboradorForm />,
            permission("COLABORADORES", "CRIAR"),
          )}
        />
        <Route
          path="/colaboradores/:id"
          element={protectedPage(
            <ColaboradorForm />,
            permission("COLABORADORES"),
          )}
        />
        <Route
          path="/colaboradores/:id/editar"
          element={protectedPage(
            <ColaboradorForm />,
            permission("COLABORADORES", "EDITAR"),
          )}
        />

        <Route
          path="/atividades"
          element={protectedPage(<Atividades />, permission("ATIVIDADES"))}
        />
        <Route
          path="/atividades/novo"
          element={protectedPage(
            <AtividadeForm />,
            permission("ATIVIDADES", "CRIAR"),
          )}
        />
        <Route
          path="/atividades/:id"
          element={protectedPage(<AtividadeForm />, permission("ATIVIDADES"))}
        />
        <Route
          path="/atividades/:id/editar"
          element={protectedPage(
            <AtividadeForm />,
            permission("ATIVIDADES", "EDITAR"),
          )}
        />

        <Route
          path="/agentes"
          element={protectedPage(<Agentes />, permission("AGENTES_CULTURAIS"))}
        />
        <Route
          path="/agentes/novo"
          element={protectedPage(
            <AgenteForm />,
            permission("AGENTES_CULTURAIS", "CRIAR"),
          )}
        />
        <Route
          path="/agentes/:id"
          element={protectedPage(
            <AgenteForm />,
            permission("AGENTES_CULTURAIS"),
          )}
        />
        <Route
          path="/agentes/:id/editar"
          element={protectedPage(
            <AgenteForm />,
            permission("AGENTES_CULTURAIS", "EDITAR"),
          )}
        />

        <Route
          path="/painel-financeiro"
          element={protectedPage(
            <PainelFinanceiro />,
            permission("PAINEL_FINANCEIRO"),
          )}
        />
        <Route
          path="/financeiro"
          element={protectedPage(<Financeiro />, permission("FINANCEIRO"))}
        />
        <Route
          path="/financeiro/novo"
          element={protectedPage(
            <FinanceiroForm />,
            permission("FINANCEIRO", "CRIAR"),
          )}
        />
        <Route
          path="/financeiro/:id"
          element={protectedPage(<FinanceiroForm />, permission("FINANCEIRO"))}
        />
        <Route
          path="/financeiro/:id/editar"
          element={protectedPage(
            <FinanceiroForm />,
            permission("FINANCEIRO", "EDITAR"),
          )}
        />

        <Route
          path="/contas-bancarias"
          element={protectedPage(
            <ContasBancarias />,
            permission("CONTAS_BANCARIAS"),
          )}
        />
        <Route
          path="/contas-bancarias/novo"
          element={protectedPage(
            <ContaBancariaForm />,
            permission("CONTAS_BANCARIAS", "CRIAR"),
          )}
        />
        <Route
          path="/contas-bancarias/:id"
          element={protectedPage(
            <ContaBancariaForm />,
            permission("CONTAS_BANCARIAS"),
          )}
        />
        <Route
          path="/contas-bancarias/:id/editar"
          element={protectedPage(
            <ContaBancariaForm />,
            permission("CONTAS_BANCARIAS", "EDITAR"),
          )}
        />
        <Route
          path="/contas-pagar"
          element={protectedPage(<ContasPagar />, permission("CONTAS_PAGAR"))}
        />
        <Route
          path="/contas-pagar/novo"
          element={protectedPage(
            <ContaPagarForm />,
            permission("CONTAS_PAGAR", "CRIAR"),
          )}
        />
        <Route
          path="/contas-pagar/:id"
          element={protectedPage(
            <ContaPagarForm />,
            permission("CONTAS_PAGAR"),
          )}
        />
        <Route
          path="/contas-pagar/:id/editar"
          element={protectedPage(
            <ContaPagarForm />,
            permission("CONTAS_PAGAR", "EDITAR"),
          )}
        />
        <Route
          path="/contas-receber"
          element={protectedPage(
            <ContaReceber />,
            permission("CONTAS_RECEBER"),
          )}
        />
        <Route
          path="/contas-receber/novo"
          element={protectedPage(
            <ContaReceberForm />,
            permission("CONTAS_RECEBER", "CRIAR"),
          )}
        />
        <Route
          path="/contas-receber/:id"
          element={protectedPage(
            <ContaReceberForm />,
            permission("CONTAS_RECEBER"),
          )}
        />
        <Route
          path="/contas-receber/:id/editar"
          element={protectedPage(
            <ContaReceberForm />,
            permission("CONTAS_RECEBER", "EDITAR"),
          )}
        />
        <Route
          path="/doacoes"
          element={protectedPage(<Doacoes />, permission("DOACOES"))}
        />
        <Route
          path="/doacoes/novo"
          element={protectedPage(
            <DoacaoForm />,
            permission("DOACOES", "CRIAR"),
          )}
        />
        <Route
          path="/doacoes/:id"
          element={protectedPage(<DoacaoForm />, permission("DOACOES"))}
        />
        <Route
          path="/doacoes/:id/editar"
          element={protectedPage(
            <DoacaoForm />,
            permission("DOACOES", "EDITAR"),
          )}
        />
        <Route
          path="/doadores"
          element={protectedPage(<Doadores />, permission("DOADORES"))}
        />
        <Route
          path="/doadores/novo"
          element={protectedPage(
            <DoadorForm />,
            permission("DOADORES", "CRIAR"),
          )}
        />
        <Route
          path="/doadores/:id"
          element={protectedPage(<DoadorForm />, permission("DOADORES"))}
        />
        <Route
          path="/doadores/:id/editar"
          element={protectedPage(
            <DoadorForm />,
            permission("DOADORES", "EDITAR"),
          )}
        />
        <Route
          path="/fornecedores"
          element={protectedPage(<Fornecedores />, permission("FORNECEDORES"))}
        />
        <Route
          path="/fornecedores/novo"
          element={protectedPage(
            <FornecedorForm />,
            permission("FORNECEDORES", "CRIAR"),
          )}
        />
        <Route
          path="/fornecedores/:id"
          element={protectedPage(
            <FornecedorForm />,
            permission("FORNECEDORES"),
          )}
        />
        <Route
          path="/fornecedores/:id/editar"
          element={protectedPage(
            <FornecedorForm />,
            permission("FORNECEDORES", "EDITAR"),
          )}
        />
        <Route
          path="/parceiros"
          element={protectedPage(<Parceiros />, permission("PARCEIROS"))}
        />
        <Route
          path="/parceiros/novo"
          element={protectedPage(
            <ParceiroForm />,
            permission("PARCEIROS", "CRIAR"),
          )}
        />
        <Route
          path="/parceiros/:id"
          element={protectedPage(<ParceiroForm />, permission("PARCEIROS"))}
        />
        <Route
          path="/parceiros/:id/editar"
          element={protectedPage(
            <ParceiroForm />,
            permission("PARCEIROS", "EDITAR"),
          )}
        />
        <Route
          path="/transferencias-bancarias"
          element={protectedPage(
            <TransferenciasBancarias />,
            permission("TRANSFERENCIAS_BANCARIAS"),
          )}
        />
        <Route
          path="/transferencias-bancarias/novo"
          element={protectedPage(
            <TransferenciaBancariaForm />,
            permission("TRANSFERENCIAS_BANCARIAS", "CRIAR"),
          )}
        />
        <Route
          path="/transferencias-bancarias/:id"
          element={protectedPage(
            <TransferenciaBancariaForm />,
            permission("TRANSFERENCIAS_BANCARIAS"),
          )}
        />
        <Route
          path="/transferencias-bancarias/:id/editar"
          element={protectedPage(
            <TransferenciaBancariaForm />,
            permission("TRANSFERENCIAS_BANCARIAS", "EDITAR"),
          )}
        />
        <Route
          path="/movimentacoes-bancarias"
          element={protectedPage(
            <MovimentacaoBancaria />,
            permission("MOVIMENTACOES_BANCARIAS"),
          )}
        />
        <Route
          path="/fluxo-caixa"
          element={protectedPage(<FluxoCaixa />, permission("FLUXO_CAIXA"))}
        />
        <Route
          path="/conciliacao-bancaria"
          element={protectedPage(
            <ConciliacaoBancaria />,
            permission("CONCILIACOES_BANCARIAS"),
          )}
        />

        <Route
          path="/acoes-divulgacao"
          element={protectedPage(
            <AcoesDivulgacao />,
            permission("ACOES_DIVULGACAO"),
          )}
        />
        <Route
          path="/acoes-divulgacao/novo"
          element={protectedPage(
            <AcaoDivulgacaoForm />,
            permission("ACOES_DIVULGACAO", "CRIAR"),
          )}
        />
        <Route
          path="/acoes-divulgacao/:id"
          element={protectedPage(
            <AcaoDivulgacaoForm />,
            permission("ACOES_DIVULGACAO"),
          )}
        />
        <Route
          path="/acoes-divulgacao/:id/editar"
          element={protectedPage(
            <AcaoDivulgacaoForm />,
            permission("ACOES_DIVULGACAO", "EDITAR"),
          )}
        />

        <Route
          path="/plano-comunicacao"
          element={protectedPage(
            <PlanoComunicacao />,
            permission("PLANO_COMUNICACAO"),
          )}
        />
        <Route
          path="/plano-comunicacao/novo"
          element={protectedPage(
            <PlanoComunicacaoForm />,
            permission("PLANO_COMUNICACAO", "CRIAR"),
          )}
        />
        <Route
          path="/plano-comunicacao/:id"
          element={protectedPage(
            <PlanoComunicacaoForm />,
            permission("PLANO_COMUNICACAO"),
          )}
        />
        <Route
          path="/plano-comunicacao/:id/editar"
          element={protectedPage(
            <PlanoComunicacaoForm />,
            permission("PLANO_COMUNICACAO", "EDITAR"),
          )}
        />

        <Route
          path="/eventos-culturais"
          element={protectedPage(
            <EventosCulturais />,
            permission("EVENTOS_CULTURAIS"),
          )}
        />
        <Route
          path="/eventos-culturais/novo"
          element={protectedPage(
            <EventoCulturalForm />,
            permission("EVENTOS_CULTURAIS", "CRIAR"),
          )}
        />
        <Route
          path="/eventos-culturais/:id"
          element={protectedPage(
            <EventoCulturalForm />,
            permission("EVENTOS_CULTURAIS"),
          )}
        />
        <Route
          path="/eventos-culturais/:id/editar"
          element={protectedPage(
            <EventoCulturalForm />,
            permission("EVENTOS_CULTURAIS", "EDITAR"),
          )}
        />

        <Route
          path="/participantes"
          element={protectedPage(
            <Participantes />,
            permission("PARTICIPANTES"),
          )}
        />
        <Route
          path="/participantes/novo"
          element={protectedPage(
            <ParticipanteForm />,
            permission("PARTICIPANTES", "CRIAR"),
          )}
        />
        <Route
          path="/participantes/:id"
          element={protectedPage(
            <ParticipanteForm />,
            permission("PARTICIPANTES"),
          )}
        />
        <Route
          path="/participantes/:id/editar"
          element={protectedPage(
            <ParticipanteForm />,
            permission("PARTICIPANTES", "EDITAR"),
          )}
        />

        <Route
          path="/turmas"
          element={protectedPage(<Turmas />, permission("TURMAS"))}
        />
        <Route
          path="/turmas/novo"
          element={protectedPage(<TurmaForm />, permission("TURMAS", "CRIAR"))}
        />
        <Route
          path="/turmas/:id"
          element={protectedPage(<TurmaForm />, permission("TURMAS"))}
        />
        <Route
          path="/turmas/:id/editar"
          element={protectedPage(<TurmaForm />, permission("TURMAS", "EDITAR"))}
        />

        <Route
          path="/presencas"
          element={protectedPage(<Presencas />, permission("PRESENCAS"))}
        />

        <Route
          path="/planos-aula"
          element={protectedPage(<PlanoAula />, permission("PLANOS_AULA"))}
        />
        <Route
          path="/planos-aula/novo"
          element={protectedPage(
            <PlanoAulaForm />,
            permission("PLANOS_AULA", "CRIAR"),
          )}
        />
        <Route
          path="/planos-aula/:id"
          element={protectedPage(<PlanoAulaForm />, permission("PLANOS_AULA"))}
        />
        <Route
          path="/planos-aula/:id/editar"
          element={protectedPage(
            <PlanoAulaForm />,
            permission("PLANOS_AULA", "EDITAR"),
          )}
        />

        <Route
          path="/documentos"
          element={protectedPage(<Documentos />, permission("DOCUMENTOS"))}
        />
        <Route
          path="/documentos/novo"
          element={protectedPage(
            <DocumentoForm />,
            permission("DOCUMENTOS", "CRIAR"),
          )}
        />
        <Route
          path="/documentos/:id"
          element={protectedPage(<DocumentoForm />, permission("DOCUMENTOS"))}
        />
        <Route
          path="/documentos/:id/editar"
          element={protectedPage(
            <DocumentoForm />,
            permission("DOCUMENTOS", "EDITAR"),
          )}
        />
        <Route
          path="/modelos-documento"
          element={protectedPage(
            <ModelosDocumento />,
            permission("DOCUMENTOS"),
          )}
        />
        <Route
          path="/modelos-documento/novo"
          element={protectedPage(
            <ModeloDocumentoForm />,
            permission("DOCUMENTOS", "CRIAR"),
          )}
        />
        <Route
          path="/modelos-documento/:id/editar"
          element={protectedPage(
            <ModeloDocumentoForm />,
            permission("DOCUMENTOS", "EDITAR"),
          )}
        />

        <Route
          path="/evidencias"
          element={protectedPage(<Evidencias />, permission("EVIDENCIAS"))}
        />
        <Route
          path="/evidencias/novo"
          element={protectedPage(
            <EvidenciaForm />,
            permission("EVIDENCIAS", "CRIAR"),
          )}
        />
        <Route
          path="/evidencias/:id"
          element={protectedPage(<EvidenciaForm />, permission("EVIDENCIAS"))}
        />
        <Route
          path="/evidencias/:id/editar"
          element={protectedPage(
            <EvidenciaForm />,
            permission("EVIDENCIAS", "EDITAR"),
          )}
        />

        <Route
          path="/editais"
          element={protectedPage(<Editais />, permission("EDITAIS"))}
        />

        <Route
          path="/propostas-edital"
          element={protectedPage(
            <PropostasEdital />,
            permission("PROPOSTAS_EDITAL"),
          )}
        />
        <Route
          path="/propostas-edital/novo"
          element={protectedPage(
            <PropostaEditalForm />,
            permission("PROPOSTAS_EDITAL", "CRIAR"),
          )}
        />
        <Route
          path="/propostas-edital/:id"
          element={protectedPage(
            <PropostaEditalForm />,
            permission("PROPOSTAS_EDITAL"),
          )}
        />
        <Route
          path="/propostas-edital/:id/editar"
          element={protectedPage(
            <PropostaEditalForm />,
            permission("PROPOSTAS_EDITAL", "EDITAR"),
          )}
        />

        <Route
          path="/resultados-propostas"
          element={protectedPage(
            <ResultadosPropostas />,
            permission("RESULTADO_PROPOSTA"),
          )}
        />
        <Route
          path="/resultados-propostas/novo"
          element={protectedPage(
            <ResultadoPropostaForm />,
            permission("RESULTADO_PROPOSTA", "CRIAR"),
          )}
        />
        <Route
          path="/resultados-propostas/:id"
          element={protectedPage(
            <ResultadoPropostaForm />,
            permission("RESULTADO_PROPOSTA"),
          )}
        />
        <Route
          path="/resultados-propostas/:id/editar"
          element={protectedPage(
            <ResultadoPropostaForm />,
            permission("RESULTADO_PROPOSTA", "EDITAR"),
          )}
        />

        <Route
          path="/equipe-edital"
          element={protectedPage(<EquipeEdital />, permission("EQUIPE_EDITAL"))}
        />
        <Route
          path="/equipe-edital/novo"
          element={protectedPage(
            <EquipeEditalForm />,
            permission("EQUIPE_EDITAL", "CRIAR"),
          )}
        />
        <Route
          path="/equipe-edital/:id"
          element={protectedPage(
            <EquipeEditalForm />,
            permission("EQUIPE_EDITAL"),
          )}
        />
        <Route
          path="/equipe-edital/:id/editar"
          element={protectedPage(
            <EquipeEditalForm />,
            permission("EQUIPE_EDITAL", "EDITAR"),
          )}
        />

        <Route
          path="/habilitacoes-propostas"
          element={protectedPage(<Habilitacao />, permission("HABILITACAO"))}
        />
        <Route
          path="/habilitacoes-propostas/novo"
          element={protectedPage(
            <HabilitacaoForm />,
            permission("HABILITACAO", "CRIAR"),
          )}
        />
        <Route
          path="/habilitacoes-propostas/:id"
          element={protectedPage(
            <HabilitacaoForm />,
            permission("HABILITACAO"),
          )}
        />
        <Route
          path="/habilitacoes-propostas/:id/editar"
          element={protectedPage(
            <HabilitacaoForm />,
            permission("HABILITACAO", "EDITAR"),
          )}
        />

        <Route
          path="/habilitacao"
          element={<Navigate to="/habilitacoes-propostas" replace />}
        />
        <Route
          path="/habilitacao/novo"
          element={<Navigate to="/habilitacoes-propostas/novo" replace />}
        />

        <Route
          path="/cronograma"
          element={protectedPage(<Cronograma />, permission("CRONOGRAMA"))}
        />

        <Route
          path="/aplicacao-de-recursos"
          element={protectedPage(
            <PlanejamentoFinanceiro />,
            permission("PLANEJAMENTO_FINANCEIRO"),
          )}
        />

        <Route
          path="/metas-projeto"
          element={protectedPage(<MetasProjeto />, permission("METAS_PROJETO"))}
        />
        <Route
          path="/metas-projeto/novo"
          element={protectedPage(
            <MetaProjetoForm />,
            permission("METAS_PROJETO", "CRIAR"),
          )}
        />
        <Route
          path="/metas-projeto/:id"
          element={protectedPage(
            <MetaProjetoForm />,
            permission("METAS_PROJETO"),
          )}
        />
        <Route
          path="/metas-projeto/:id/editar"
          element={protectedPage(
            <MetaProjetoForm />,
            permission("METAS_PROJETO", "EDITAR"),
          )}
        />

        <Route
          path="/prestacao-metas"
          element={protectedPage(
            <PrestacaoMetas />,
            permission("PRESTACAO_METAS"),
          )}
        />
        <Route
          path="/prestacao-metas/novo"
          element={protectedPage(
            <PrestacaoMetaForm />,
            permission("PRESTACAO_METAS", "CRIAR"),
          )}
        />
        <Route
          path="/prestacao-metas/:id"
          element={protectedPage(
            <PrestacaoMetaForm />,
            permission("PRESTACAO_METAS"),
          )}
        />
        <Route
          path="/prestacao-metas/:id/editar"
          element={protectedPage(
            <PrestacaoMetaForm />,
            permission("PRESTACAO_METAS", "EDITAR"),
          )}
        />

        <Route
          path="/prestacao-contas"
          element={protectedPage(
            <PrestacaoContas />,
            permission("PRESTACAO_CONTAS"),
          )}
        />
        <Route
          path="/prestacao-contas/novo"
          element={protectedPage(
            <PrestacaoContasForm />,
            permission("PRESTACAO_CONTAS", "CRIAR"),
          )}
        />
        <Route
          path="/prestacao-contas/:id"
          element={protectedPage(
            <PrestacaoContasForm />,
            permission("PRESTACAO_CONTAS"),
          )}
        />
        <Route
          path="/prestacao-contas/:id/editar"
          element={protectedPage(
            <PrestacaoContasForm />,
            permission("PRESTACAO_CONTAS", "EDITAR"),
          )}
        />

        <Route
          path="/projetos"
          element={protectedPage(<Projetos />, permission("PROJETOS"))}
        />
        <Route
          path="/projetos/novo"
          element={protectedPage(
            <ProjetoForm />,
            permission("PROJETOS", "CRIAR"),
          )}
        />
        <Route
          path="/projetos/:id"
          element={protectedPage(<ProjetoForm />, permission("PROJETOS"))}
        />
        <Route
          path="/projetos/:id/editar"
          element={protectedPage(
            <ProjetoForm />,
            permission("PROJETOS", "EDITAR"),
          )}
        />
        <Route
          path="/projetos/:id/plano-trabalho"
          element={protectedPage(<PlanoTrabalhoPage />, permission("PROJETOS"))}
        />

        <Route
          path="/integrantes"
          element={protectedPage(<Integrantes />, permission("INTEGRANTES"))}
        />
        <Route
          path="/integrantes/novo"
          element={protectedPage(
            <IntegranteForm />,
            permission("INTEGRANTES", "CRIAR"),
          )}
        />
        <Route
          path="/integrantes/:id"
          element={protectedPage(<IntegranteForm />, permission("INTEGRANTES"))}
        />
        <Route
          path="/integrantes/:id/editar"
          element={protectedPage(
            <IntegranteForm />,
            permission("INTEGRANTES", "EDITAR"),
          )}
        />

        <Route
          path="/patrimonio"
          element={protectedPage(<Patrimonio />, permission("PATRIMONIO"))}
        />
        <Route
          path="/patrimonio/novo"
          element={protectedPage(
            <PatrimonioForm />,
            permission("PATRIMONIO", "CRIAR"),
          )}
        />
        <Route
          path="/patrimonio/:id"
          element={protectedPage(<PatrimonioForm />, permission("PATRIMONIO"))}
        />
        <Route
          path="/patrimonio/:id/editar"
          element={protectedPage(
            <PatrimonioForm />,
            permission("PATRIMONIO", "EDITAR"),
          )}
        />

        <Route
          path="/emprestimos"
          element={protectedPage(<Emprestimos />, permission("EMPRESTIMOS"))}
        />
        <Route
          path="/emprestimos/novo"
          element={protectedPage(
            <EmprestimoForm />,
            permission("EMPRESTIMOS", "CRIAR"),
          )}
        />
        <Route
          path="/emprestimos/:id"
          element={protectedPage(<EmprestimoForm />, permission("EMPRESTIMOS"))}
        />
        <Route
          path="/emprestimos/:id/editar"
          element={protectedPage(
            <EmprestimoForm />,
            permission("EMPRESTIMOS", "EDITAR"),
          )}
        />

        <Route
          path="/curriculos"
          element={protectedPage(<Curriculos />, permission("CURRICULOS"))}
        />
        <Route
          path="/curriculos/novo"
          element={protectedPage(
            <CurriculoForm />,
            permission("CURRICULOS", "CRIAR"),
          )}
        />
        <Route
          path="/curriculos/:id"
          element={protectedPage(<CurriculoForm />, permission("CURRICULOS"))}
        />
        <Route
          path="/curriculos/:id/editar"
          element={protectedPage(
            <CurriculoForm />,
            permission("CURRICULOS", "EDITAR"),
          )}
        />

        <Route
          path="/trajetorias-culturais"
          element={protectedPage(
            <TrajetoriasCulturais />,
            permission("TRAJETORIAS_CULTURAIS"),
          )}
        />
        <Route
          path="/trajetorias-culturais/novo"
          element={protectedPage(
            <TrajetoriaCulturalForm />,
            permission("TRAJETORIAS_CULTURAIS", "CRIAR"),
          )}
        />
        <Route
          path="/trajetorias-culturais/:id"
          element={protectedPage(
            <TrajetoriaCulturalForm />,
            permission("TRAJETORIAS_CULTURAIS"),
          )}
        />
        <Route
          path="/trajetorias-culturais/:id/editar"
          element={protectedPage(
            <TrajetoriaCulturalForm />,
            permission("TRAJETORIAS_CULTURAIS", "EDITAR"),
          )}
        />

        <Route
          path="/relatorios"
          element={protectedPage(<Relatorios />, permission("RELATORIOS"))}
        />
        <Route
          path="/relatorios/geral"
          element={protectedPage(
            <RelatorioGeralPage />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/participacao-presenca"
          element={protectedPage(
            <RelatorioParticipacaoPresencaPage />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/projetos-execucao"
          element={protectedPage(
            <RelatorioProjetosExecucaoPage />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/financeiro-patrimonio"
          element={protectedPage(
            <RelatorioFinanceiroPatrimonioPage />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/institucional-documental"
          element={protectedPage(
            <RelatorioInstitucionalDocumentalPage />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/indicadores-sociodemograficos"
          element={protectedPage(
            <IndicadoresSociodemograficos />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/presencas"
          element={protectedPage(
            <RelatorioPresencas />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/participantes"
          element={protectedPage(
            <RelatorioParticipantes />,
            permission("RELATORIOS"),
          )}
        />

        <Route
          path="/relatorios/cronograma-prazos"
          element={protectedPage(
            <RelatorioCronogramaPrazos />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/execucao-atividades"
          element={protectedPage(
            <RelatorioExecucaoAtividades />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/geral-projetos"
          element={protectedPage(
            <RelatorioGeralProjetos />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/impacto-social-cultural"
          element={protectedPage(
            <RelatorioImpactoSocialCultural />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/institucional-organizacao"
          element={protectedPage(
            <RelatorioInstitucionalOrganizacao />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/metas-resultados"
          element={protectedPage(
            <RelatorioMetasResultados />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/regularidade-documental"
          element={protectedPage(
            <RelatorioRegularidadeDocumental />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/turmas-atendimento"
          element={protectedPage(
            <RelatorioTurmasAtendimento />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/evidencias"
          element={protectedPage(
            <RelatorioEvidencias />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/prestacoes-contas"
          element={protectedPage(
            <RelatorioPrestacaoContas />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/prestacoes-metas"
          element={protectedPage(
            <RelatorioCumprimentoMetas />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/emprestimos"
          element={protectedPage(
            <RelatorioEmprestimos />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/fluxo-caixa"
          element={protectedPage(
            <RelatorioFluxoCaixa />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/movimentacoes-financeiras"
          element={protectedPage(
            <RelatorioMovimentacoesFinanceiras />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/receitas-despesas-categoria"
          element={protectedPage(
            <RelatorioReceitasDespesasCategoria />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/saldos-contas-bancarias"
          element={protectedPage(
            <RelatorioSaldosContasBancarias />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/contas-pagar"
          element={protectedPage(
            <RelatorioContasPagarRel />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/contas-receber"
          element={protectedPage(
            <RelatorioContasReceberRel />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/conciliacao-bancaria"
          element={protectedPage(
            <RelatorioConciliacaoBancariaRel />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/transferencias-bancarias"
          element={protectedPage(
            <RelatorioTransferenciasBancarias />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/doacoes-recebidas"
          element={protectedPage(
            <RelatorioDoacoesRecebidas />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/fornecedores-pagamentos"
          element={protectedPage(
            <RelatorioFornecedoresPagamentos />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/doadores"
          element={protectedPage(
            <RelatorioDoadores />,
            permission("RELATORIOS"),
          )}
        />
        <Route
          path="/relatorios/parceiros"
          element={protectedPage(
            <RelatorioParceiros />,
            permission("RELATORIOS"),
          )}
        />

        <Route
          path="/relatorios/:slug"
          element={protectedPage(
            <RelatorioDetalhePage />,
            permission("RELATORIOS"),
          )}
        />

        <Route
          path="/configuracoes/empresa"
          element={protectedPage(
            <ConfiguracaoEmpresa />,
            permission("CONFIGURACOES"),
          )}
        />

        <Route
          path="/configuracoes/central-do-cliente"
          element={protectedPage(
            <CentralCliente />,
            permission("CENTRAL_CLIENTE"),
          )}
        />

        <Route
          path="/organizacoes"
          element={protectedPage(<Organizacao />, permission("ORGANIZACAO"))}
        />

        <Route
          path="/diretoria"
          element={protectedPage(<Diretoria />, permission("DIRETORIA"))}
        />

        <Route
          path="/controle-proprietario/empresas"
          element={
            <ProprietarioRoute>
              <ControleEmpresas />
            </ProprietarioRoute>
          }
        />

        <Route
          path="/controle-proprietario/empresas/:id"
          element={
            <ProprietarioRoute>
              <ControleEmpresaDetalhe />
            </ProprietarioRoute>
          }
        />

        <Route
          path="/controle-proprietario/empresas/:empresaId/configuracao/:configuracaoEmpresaId"
          element={
            <ProprietarioRoute>
              <ConfiguracaoEmpresaProprietario />
            </ProprietarioRoute>
          }
        />

        <Route
          path="/usuario"
          element={protectedPage(
            <Navigate to="/usuarios" replace />,
            permission("USUARIOS"),
          )}
        />
        <Route
          path="/usuarios"
          element={protectedPage(<Usuarios />, permission("USUARIOS"))}
        />
        <Route
          path="/usuarios/novo"
          element={protectedPage(
            <UsuarioForm />,
            permission("USUARIOS", "CRIAR"),
          )}
        />
        <Route
          path="/usuarios/:id"
          element={protectedPage(<UsuarioForm />, permission("USUARIOS"))}
        />
        <Route
          path="/usuarios/:id/editar"
          element={protectedPage(
            <UsuarioForm />,
            permission("USUARIOS", "EDITAR"),
          )}
        />
        <Route
          path="/usuarios/:id/permissoes"
          element={protectedPage(
            <UsuarioPermissoes />,
            permission("USUARIOS", "EDITAR"),
          )}
        />

        <Route
          path="/alertas-email"
          element={protectedPage(<AlertasEmail />, permission("CONFIGURACOES"))}
        />

        <Route
          path="/configuracoes/notificacoes"
          element={protectedPage(<Notificacoes />, permission("CONFIGURACOES"))}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={150}>
      <Toaster />
      <Sonner position="top-right" richColors />

      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <PlanNetworkGuard />
        <AppRoutes />
        <NextStepPopupHost />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

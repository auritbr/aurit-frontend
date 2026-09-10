import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DashboardWelcomeCard } from "@/components/journey/DashboardWelcomeCard";
import { DocumentsAttentionCard } from "@/components/journey/DocumentsAttentionCard";
import { JourneyIntroCard } from "@/components/journey/JourneyIntroCard";
import { JourneyModuleGrid } from "@/components/journey/JourneyModuleGrid";
import { JourneyModuleModal } from "@/components/journey/JourneyModuleModal";
import { stepLabel } from "@/components/journey/journeyStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { buildJourneyModules, getDocumentosResumo } from "@/data/journey";
import { getInicioDados, type InicioDados } from "@/data/inicio";

const initialData: InicioDados = {
  nomeUsuario: "Usuário",
  nomeOrganizacao: "sua organização",
  hasOrganizacao: false,
  totalOrganizacoes: 0,
  totalAgentes: 0,
  totalDiretoria: 0,
  totalParticipantes: 0,
  totalColaboradores: 0,
  totalIntegrantes: 0,
  totalProjetos: 0,
  totalMetasProjeto: 0,
  totalAtividades: 0,
  totalPlanosAula: 0,
  totalTurmas: 0,
  totalPresencas: 0,
  totalCronogramas: 0,
  totalEventos: 0,
  totalAcoesDivulgacao: 0,
  totalPlanosComunicacao: 0,
  totalEvidencias: 0,
  totalFinanceiros: 0,
  totalContasBancarias: 0,
  totalContasPagar: 0,
  totalContasReceber: 0,
  totalTransferenciasBancarias: 0,
  totalMovimentacoesBancarias: 0,
  totalConciliacoesBancarias: 0,
  totalDoadores: 0,
  totalDoacoes: 0,
  totalFornecedores: 0,
  totalParceiros: 0,
  totalPlanejamentosFinanceiros: 0,
  totalEditais: 0,
  totalPropostasEditais: 0,
  totalResultadosPropostas: 0,
  totalHabilitacoesPropostas: 0,
  totalEquipesEditais: 0,
  totalPrestacoesContas: 0,
  totalPrestacoesMetas: 0,
  totalPatrimonios: 0,
  totalEmprestimos: 0,
  totalCurriculos: 0,
  totalTrajetoriasCulturais: 0,
  totalDocumentos: 0,
  documentosAtualizados: 0,
  documentosVencidos: 0,
  documentosPendentes: 0,
};

export default function Inicio() {
  const navigate = useNavigate();
  const [dados, setDados] = useState<InicioDados>(initialData);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        const result = await getInicioDados();
        if (active) setDados({ ...initialData, ...result });
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados da página inicial.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();
    return () => {
      active = false;
    };
  }, []);

  const modules = useMemo(() => buildJourneyModules(dados), [dados]);
  const documentos = useMemo(() => getDocumentosResumo(dados), [dados]);
  const openIndex = modules.findIndex((module) => module.key === openKey);
  const openModule = openIndex >= 0 ? modules[openIndex] : null;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div
            className="space-y-[22px]"
            aria-label="Carregando página inicial"
          >
            <Skeleton className="h-28 rounded-[20px]" />
            <Skeleton className="h-24 rounded-[20px]" />
            <div className="grid gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-44 rounded-[20px]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <DashboardWelcomeCard userName={dados.nomeUsuario} />

            <div className="mt-[14px]">
              <JourneyIntroCard modules={modules} documentos={documentos} />
            </div>

            <section
              aria-labelledby="journey-modules-title"
              className="mt-[22px]"
            >
              <h2 id="journey-modules-title" className="sr-only">
                Módulos da jornada
              </h2>
              <JourneyModuleGrid modules={modules} onOpenModule={setOpenKey} />
            </section>

            <div className="mt-[22px]">
              <DocumentsAttentionCard
                resumo={documentos}
                onNavigate={navigate}
              />
            </div>
          </>
        )}
      </div>

      <JourneyModuleModal
        module={openModule}
        step={openIndex >= 0 ? stepLabel(openIndex) : ""}
        open={openModule !== null}
        onOpenChange={(open) => !open && setOpenKey(null)}
        onNavigate={navigate}
      />

      <WikiFloatingButton pageTitle="Página Inicial" />
    </AppLayout>
  );
}

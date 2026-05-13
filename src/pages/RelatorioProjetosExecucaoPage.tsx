import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import {
  RelatorioHeader,
  GrupoIndicadores,
  SecaoLinhasRelatorio,
  RelatorioLoading,
} from "@/components/relatorios/RelatorioComponents";
import {
  getRelatorioProjetosExecucao,
  type RelatorioProjetosExecucao,
} from "@/data/relatorios";
import { isPlanoAccessDenied } from "@/lib/access";

export default function RelatorioProjetosExecucaoPage() {
  const [data, setData] = useState<RelatorioProjetosExecucao | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getRelatorioProjetosExecucao();

      setData(result);
      setAccessDeniedMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar relatório.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <RelatorioHeader
          title="Projetos e Execução"
          tooltip="Visualize o andamento dos projetos, etapas de execução, eventos culturais, propostas de edital e prestações de contas."
          description="Este relatório consolida informações sobre planejamento e execução dos projetos, permitindo acompanhar cronogramas, ações culturais, propostas submetidas e situação das prestações de contas."
          nomeEmpresa={data?.nomeEmpresa}
          dataGeracao={data?.dataGeracao}
          onRefresh={fetchData}
          loading={loading}
        />

        {loading && !data && <RelatorioLoading />}

        {data && (
          <div>
            {data.resumo?.map((g, i) => <GrupoIndicadores key={i} grupo={g} />)}

            <SecaoLinhasRelatorio titulo="Projetos" items={data.projetos} />

            <SecaoLinhasRelatorio
              titulo="Cronogramas"
              items={data.cronogramas}
            />

            <SecaoLinhasRelatorio
              titulo="Eventos culturais"
              items={data.eventosCulturais}
            />

            <SecaoLinhasRelatorio
              titulo="Propostas de edital"
              items={data.propostasEditais}
            />

            <SecaoLinhasRelatorio
              titulo="Prestações de contas"
              items={data.prestacoesContas}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
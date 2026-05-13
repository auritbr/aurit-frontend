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
  getRelatorioParticipacaoPresenca,
  type RelatorioParticipacaoPresenca,
} from "@/data/relatorios";
import { isPlanoAccessDenied } from "@/lib/access";

export default function RelatorioParticipacaoPresencaPage() {
  const [data, setData] = useState<RelatorioParticipacaoPresenca | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getRelatorioParticipacaoPresenca();

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
          title="Participação e Presença"
          tooltip="Acompanhe atividades, turmas, registros de presença e indicadores de participação dos beneficiários."
          description="Este relatório ajuda a acompanhar a participação do público nas atividades da organização, reunindo dados de atividades, turmas, chamadas e percentual geral de presença."
          nomeEmpresa={data?.nomeEmpresa}
          dataGeracao={data?.dataGeracao}
          onRefresh={fetchData}
          loading={loading}
        />

        {loading && !data && <RelatorioLoading />}

        {data && (
          <div>
            {data.resumo?.map((g, i) => <GrupoIndicadores key={i} grupo={g} />)}

            <SecaoLinhasRelatorio titulo="Atividades" items={data.atividades} />

            <SecaoLinhasRelatorio titulo="Turmas" items={data.turmas} />

            <SecaoLinhasRelatorio titulo="Presenças" items={data.presencas} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
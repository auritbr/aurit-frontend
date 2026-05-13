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
  getRelatorioInstitucionalDocumental,
  type RelatorioInstitucionalDocumental,
  type LinhaRelatorio,
} from "@/data/relatorios";
import { isPlanoAccessDenied } from "@/lib/access";

const isDocumentoVencido = (linha: LinhaRelatorio): boolean => {
  return !!linha.indicadores?.find((ind) => {
    const chave = ind.chave?.toLowerCase();

    return (
      (chave === "vencido" || chave === "documentovencido") &&
      ind.valor === true
    );
  });
};

export default function RelatorioInstitucionalDocumentalPage() {
  const [data, setData] = useState<RelatorioInstitucionalDocumental | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getRelatorioInstitucionalDocumental();

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
          title="Institucional e Documental"
          tooltip="Consulte documentos institucionais, equipe, integrantes e trajetórias culturais da organização."
          description="Este relatório ajuda a acompanhar a estrutura institucional da organização, documentos cadastrados, situação documental, equipe, integrantes e trajetórias culturais registradas."
          nomeEmpresa={data?.nomeEmpresa}
          dataGeracao={data?.dataGeracao}
          onRefresh={fetchData}
          loading={loading}
        />

        {loading && !data && <RelatorioLoading />}

        {data && (
          <div>
            {data.resumo?.map((g, i) => <GrupoIndicadores key={i} grupo={g} />)}

            <SecaoLinhasRelatorio
              titulo="Documentos"
              items={data.documentos}
              highlight={isDocumentoVencido}
            />

            <SecaoLinhasRelatorio
              titulo="Colaboradores"
              items={data.colaboradores}
            />

            <SecaoLinhasRelatorio
              titulo="Integrantes"
              items={data.integrantes}
            />

            <SecaoLinhasRelatorio
              titulo="Trajetórias culturais"
              items={data.trajetoriasCulturais}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
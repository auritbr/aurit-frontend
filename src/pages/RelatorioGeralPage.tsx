import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import {
  RelatorioHeader,
  GrupoIndicadores,
  RelatorioLoading,
} from "@/components/relatorios/RelatorioComponents";
import {
  formatDateBR,
  getRelatorioGeral,
  type RelatorioGeral,
} from "@/data/relatorios";
import { Button } from "@/components/ui/button";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportRelatorioGeralPdf } from "@/lib/relatorioExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";

export default function RelatorioGeralPage() {
  const [data, setData] = useState<RelatorioGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("RELATORIOS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const result = await getRelatorioGeral();

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
  }, [loadingPermissoes, podeVisualizar]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handlePdf = () => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    if (!data) {
      toast.warning("Não há dados para gerar o PDF.");
      return;
    }

    try {
      exportRelatorioGeralPdf({
        reportName: "Relatório Geral",
        nomeEmpresa: data.nomeEmpresa,
        dataGeracao: data.dataGeracao
          ? formatDateBR(data.dataGeracao)
          : undefined,
        grupos: data.grupos ?? [],
      });

      toast.success("PDF do relatório geral gerado com sucesso.");
    } catch {
      toast.error("Falha ao gerar PDF do relatório geral.");
    }
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Carregando relatório geral...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

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
          title="Relatório Geral"
          tooltip="Apresenta uma visão consolidada da organização, reunindo indicadores principais de gestão, execução, documentação, financeiro, editais, prestação de contas e patrimônio."
          description="Este relatório oferece uma visão rápida da situação geral da organização. Ele ajuda a acompanhar a estrutura institucional, projetos, atividades, documentos, financeiro, patrimônio, editais e prestação de contas em um único lugar."
          nomeEmpresa={data?.nomeEmpresa}
          dataGeracao={data?.dataGeracao}
          onRefresh={fetchData}
          loading={loading}
          extraActions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handlePdf}
              disabled={loading || !data || !podeGerarPdf}
              title={
                !podeGerarPdf
                  ? "Você não possui permissão para gerar PDF."
                  : undefined
              }
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          }
        />

        {loading && !data && <RelatorioLoading />}

        {data && (
          <div>
            {data.grupos?.length ? (
              data.grupos.map((grupo, index) => (
                <GrupoIndicadores key={index} grupo={grupo} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum indicador disponível para este relatório.
              </p>
            )}

            {!podeGerarPdf && (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Você pode visualizar este relatório, mas não possui permissão
                para gerar PDF.
              </div>
            )}
          </div>
        )}
      </div>

      <WikiFloatingButton pageTitle="Relatório Geral" />
    </AppLayout>
  );
}
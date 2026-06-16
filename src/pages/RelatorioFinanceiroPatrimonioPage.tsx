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
  getRelatorioFinanceiroPatrimonio,
  type RelatorioFinanceiroPatrimonio,
} from "@/data/relatorios";
import { isPlanoAccessDenied } from "@/lib/access";

export default function RelatorioFinanceiroPatrimonioPage() {
  const [data, setData] = useState<RelatorioFinanceiroPatrimonio | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getRelatorioFinanceiroPatrimonio();

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
          title="Financeiro e Patrimônio"
          tooltip="Acompanhe movimentações financeiras, aplicação de resursos, patrimônio e empréstimos de bens."
          description="Este relatório reúne dados financeiros e patrimoniais para apoiar o acompanhamento de entradas, saídas, saldo, bens adquiridos e empréstimos realizados pela organização."
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
              titulo="Movimentações financeiras"
              items={data.movimentacoesFinanceiras}
            />

            <SecaoLinhasRelatorio
              titulo="Planejamentos financeiros"
              items={data.planejamentosFinanceiros}
            />

            <SecaoLinhasRelatorio titulo="Patrimônios" items={data.patrimonios} />

            <SecaoLinhasRelatorio titulo="Empréstimos" items={data.emprestimos} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
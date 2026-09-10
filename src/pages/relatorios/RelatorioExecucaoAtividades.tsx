import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { execucaoAtividadesConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioExecucaoAtividades() {
  return <BackendReportPage config={execucaoAtividadesConfig} />;
}

import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { regularidadeDocumentalConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioRegularidadeDocumental() {
  return <BackendReportPage config={regularidadeDocumentalConfig} />;
}

import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { impactoSocialConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioImpactoSocialCultural() {
  return <BackendReportPage config={impactoSocialConfig} />;
}

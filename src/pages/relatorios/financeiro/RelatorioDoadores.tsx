import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { doadoresConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioDoadores() {
  return <BackendReportPage config={doadoresConfig} />;
}

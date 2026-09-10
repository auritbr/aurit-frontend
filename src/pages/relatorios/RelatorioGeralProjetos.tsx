import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { geralProjetosConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioGeralProjetos() {
  return <BackendReportPage config={geralProjetosConfig} />;
}

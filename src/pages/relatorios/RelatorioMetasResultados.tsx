import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { metasResultadosConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioMetasResultados() {
  return <BackendReportPage config={metasResultadosConfig} />;
}

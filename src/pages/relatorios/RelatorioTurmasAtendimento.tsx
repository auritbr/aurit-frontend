import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { turmasAtendimentoConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioTurmasAtendimento() {
  return <BackendReportPage config={turmasAtendimentoConfig} />;
}

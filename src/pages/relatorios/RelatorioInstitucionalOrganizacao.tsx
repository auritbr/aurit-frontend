import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { institucionalOrganizacaoConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioInstitucionalOrganizacao() {
  return <BackendReportPage config={institucionalOrganizacaoConfig} />;
}

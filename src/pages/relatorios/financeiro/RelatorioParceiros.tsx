import { BackendReportPage } from "@/components/relatorios/BackendReportPage";
import { parceirosConfig } from "@/data/relatoriosBackendConfigs";

export default function RelatorioParceiros() {
  return <BackendReportPage config={parceirosConfig} />;
}

import { getEventosCulturais } from "@/data/eventosCulturais";
import { getParticipantes } from "@/data/participantes";
import { getRegistrosPresenca } from "@/data/relatorioPresencas";
import {
  getRelatorio,
  type RelatorioImpactoSocial,
} from "@/data/relatoriosEspecializados";

export async function getDadosImpactoSocial() {
  const relatorio = await getRelatorio<RelatorioImpactoSocial>(
    "impacto-social-cultural",
  );
  const [perfis, frequencia, eventos] = await Promise.allSettled([
    getParticipantes(),
    getRegistrosPresenca(),
    getEventosCulturais(),
  ]);
  return { relatorio, perfis, frequencia, eventos };
}

export type DadosImpactoSocial = Awaited<
  ReturnType<typeof getDadosImpactoSocial>
>;

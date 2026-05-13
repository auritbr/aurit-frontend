import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { isPlanoAccessDenied } from "@/lib/access";
import { RELATORIOS_CATALOGO } from "@/data/relatoriosCatalogo";
import { getRelatorioGeral } from "@/data/relatorios";

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const podeVisualizar = permissoes.VISUALIZAR;

  useEffect(() => {
    let active = true;

    async function carregarAcesso() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const permissoesData =
          await getPermissoesUsuarioLogadoPorModulo("RELATORIOS");

        if (!active) return;

        setPermissoes(permissoesData);

        if (!permissoesData.VISUALIZAR) {
          return;
        }

        await getRelatorioGeral();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao verificar acesso aos relatórios.";

        if (!active) return;

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarAcesso();

    return () => {
      active = false;
    };
  }, []);

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageTitle
          title="Relatórios"
          tooltip="Acesse os relatórios da organização em um só lugar, seguindo a mesma jornada do menu lateral: visão geral, organização, equipe, projetos, ações culturais, editais, financeiro, prestação de contas, patrimônio e trajetórias."
        />

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Esta área reúne os relatórios da organização seguindo a mesma lógica
          de navegação do sistema. O{" "}
          <strong className="text-foreground">Relatório Geral</strong> oferece
          uma visão consolidada dos principais indicadores. Os demais relatórios
          detalhados permitem consultar dados completos, buscar informações,
          ajustar colunas e exportar em CSV, Excel ou PDF.
        </div>

        <div className="space-y-8">
          {RELATORIOS_CATALOGO.map((grupo) => (
            <section key={grupo.id}>
              <div className="mb-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  {grupo.titulo}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {grupo.itens.map((item) => {
                  const Icon = item.icon;
                  const href = `/relatorios/${item.slug}`;

                  return (
                    <Link
                      key={item.slug}
                      to={href}
                      className="group flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary-soft">
                          <Icon
                            className="h-4 w-4 text-primary"
                            strokeWidth={2.2}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold tracking-tight text-foreground">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <p className="mt-2.5 flex-1 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-all group-hover:gap-2">
                        Abrir relatório
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <WikiFloatingButton pageTitle="Relatórios" />
    </AppLayout>
  );
}
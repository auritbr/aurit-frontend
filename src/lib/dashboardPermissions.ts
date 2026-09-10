import { useCallback, useEffect, useState } from "react";
import type { ModuloPermissao } from "@/data/usuarios";
import { usuarioTemPermissao } from "@/lib/permissoes";

const DASHBOARD_MODULES: ModuloPermissao[] = [
  "DASHBOARD",
  "DOCUMENTOS",
  "PROJETOS",
  "CRONOGRAMA",
  "EVIDENCIAS",
  "PRESENCAS",
  "EMPRESTIMOS",
  "PARTICIPANTES",
  "COLABORADORES",
  "INTEGRANTES",
  "DIRETORIA",
  "ATIVIDADES",
  "EVENTOS_CULTURAIS",
  "ACOES_DIVULGACAO",
  "FINANCEIRO",
  "EDITAIS",
  "TURMAS",
  "RELATORIOS",
  "PATRIMONIO",
];

/** Permissões de visualização usadas pelas seções da central de acompanhamento. */
export function useModuleAccess() {
  const [allowed, setAllowed] = useState<
    Partial<Record<ModuloPermissao, boolean>>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void Promise.allSettled(
      DASHBOARD_MODULES.map(async (module) => ({
        module,
        allowed: await usuarioTemPermissao(module, "VISUALIZAR"),
      })),
    ).then((results) => {
      if (!active) return;

      const entries = results.map((result, index) =>
        result.status === "fulfilled"
          ? [result.value.module, result.value.allowed]
          : [DASHBOARD_MODULES[index], false],
      );

      setAllowed(
        Object.fromEntries(entries) as Partial<
          Record<ModuloPermissao, boolean>
        >,
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const can = useCallback(
    (module: ModuloPermissao) => allowed[module] === true,
    [allowed],
  );
  const canAny = useCallback(
    (modules: ModuloPermissao[]) =>
      modules.some((module) => allowed[module] === true),
    [allowed],
  );

  return { allowed, can, canAny, loading };
}

import { useEffect, useState } from "react";
import { usuarioTemPermissaoFrontend } from "@/data/permissoes";
import {
  type AcaoPermissao,
  type ModuloPermissao,
} from "@/data/usuarios";

export function usePermissao(
  modulo: ModuloPermissao,
  acao: AcaoPermissao = "VISUALIZAR",
) {
  const [permitido, setPermitido] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const result = await usuarioTemPermissaoFrontend(modulo, acao);

        if (active) {
          setPermitido(result);
        }
      } catch {
        if (active) {
          setPermitido(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [modulo, acao]);

  return {
    permitido,
    loading,
  };
}
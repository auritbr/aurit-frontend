import { getUsuarioLogadoStorage } from "@/lib/auth";
import {
  getPermissoes,
  type AcaoPermissao,
  type ModuloPermissao,
} from "@/data/usuarios";

export async function usuarioTemPermissaoFrontend(
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<boolean> {
  const usuario = getUsuarioLogadoStorage();

  if (!usuario?.id) return false;

  if (usuario.statusUsuario === "INATIVO") return false;

  if (
    usuario.userRole === "ADMIN_PROPRIETARIO" ||
    usuario.userRole === "ADMIN"
  ) {
    return true;
  }

  const permissoes = await getPermissoes(String(usuario.id));

  return permissoes.some(
    (p) =>
      p.moduloPermissao === modulo &&
      p.acaoPermissao === acao &&
      p.permitido === true,
  );
}
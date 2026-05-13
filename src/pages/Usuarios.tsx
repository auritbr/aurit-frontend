import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Power,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getUsuarios,
  deleteUsuario,
  alterarStatusUsuario,
  getConfiguracoesEmpresaOptions,
  type ConfiguracaoEmpresaOption,
  type Usuario,
  userRoleLabel,
  statusUsuarioLabel,
} from "@/data/usuarios";

const statusTone: Record<string, string> = {
  ATIVO:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  INATIVO: "border-border bg-muted text-muted-foreground",
};

const roleTone: Record<string, string> = {
  ADMIN: "border-primary/20 bg-primary/10 text-primary",
  USER: "border-border bg-muted text-foreground",
  ADMIN_PROPRIETARIO:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
};

export default function Usuarios() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [items, setItems] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<ConfiguracaoEmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeAlterarStatus = permissoes.ALTERAR_STATUS || permissoes.EDITAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("USUARIOS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void loadUsuarios();
  }, [loadingPermissoes, podeVisualizar]);

  async function loadUsuarios() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [usuariosData, empresasData] = await Promise.all([
        getUsuarios(),
        getConfiguracoesEmpresaOptions(),
      ]);

      setItems(usuariosData);
      setEmpresas(empresasData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar usuários.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const empresaNome = (id?: string) =>
    id
      ? empresas.find((empresa) => empresa.id === id)?.nome ??
      "Empresa não encontrada"
      : "Sem empresa vinculada";

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((usuario) =>
      [
        usuario.name,
        usuario.login,
        userRoleLabel[usuario.userRole],
        statusUsuarioLabel[usuario.statusUsuario],
        empresaNome(usuario.configuracaoEmpresaId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, items, empresas]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, search);

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir usuários.");
      setConfirmDelete(null);
      return;
    }

    const target = items.find((item) => item.id === confirmDelete);

    if (target?.userRole === "ADMIN_PROPRIETARIO") {
      toast.error("Não é possível excluir o administrador proprietário.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteUsuario(confirmDelete);

      setItems((prev) => prev.filter((usuario) => usuario.id !== confirmDelete));
      toast.success("Usuário excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir usuário.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    if (!podeAlterarStatus) {
      toast.error("Você não possui permissão para alterar status de usuários.");
      return;
    }

    if (usuario.userRole === "ADMIN_PROPRIETARIO") {
      toast.error(
        "Não é possível alterar o status do administrador proprietário.",
      );
      return;
    }

    const nextStatus = usuario.statusUsuario === "ATIVO" ? "INATIVO" : "ATIVO";

    try {
      setChangingStatusId(usuario.id);
      setAccessDeniedMessage(null);

      const updated = await alterarStatusUsuario(usuario.id, nextStatus);

      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );

      toast.success(
        `Usuário ${updated.statusUsuario === "ATIVO" ? "ativado" : "inativado"
        }.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao alterar status do usuário.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setChangingStatusId(null);
    }
  };
  
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
      <div className="container max-w-7xl py-6 sm:py-8">
        <PageTitle
          title="Usuários"
          tooltip="Cadastre e gerencie os usuários que terão acesso ao sistema. Defina empresa vinculada, perfil, status e permissões de acesso."
        />

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Gerencie os acessos da sua organização. Usuários sem empresa vinculada
          podem ter problemas com plano, limites e permissões.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar usuário"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/usuarios/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar usuário
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[180px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Login
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Empresa
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Perfil
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((usuario) => {
                  const semEmpresa = !usuario.configuracaoEmpresaId;
                  const isProprietario =
                    usuario.userRole === "ADMIN_PROPRIETARIO";

                  return (
                    <tr
                      key={usuario.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/usuarios/${usuario.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/usuarios/${usuario.id}/editar`)
                              }
                            />
                          )}

                          {podeEditar && (
                            <TableActionIcon
                              icon={ShieldCheck}
                              label="Permissões"
                              onClick={() =>
                                navigate(`/usuarios/${usuario.id}/permissoes`)
                              }
                            />
                          )}

                          {podeAlterarStatus && !isProprietario && (
                            <TableActionIcon
                              icon={Power}
                              label={
                                usuario.statusUsuario === "ATIVO"
                                  ? "Inativar"
                                  : "Ativar"
                              }
                              onClick={() => {
                                if (changingStatusId === usuario.id) return;
                                void handleToggleStatus(usuario);
                              }}
                            />
                          )}

                          {podeExcluir && !isProprietario && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(usuario.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={usuario.name} bold>
                          {usuario.name}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {usuario.login}
                      </td>

                      <td className="px-6 py-2.5">
                        <span
                          className={`text-[13px] ${semEmpresa
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                            }`}
                        >
                          {empresaNome(usuario.configuracaoEmpresaId)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${roleTone[usuario.userRole]
                            }`}
                        >
                          {userRoleLabel[usuario.userRole]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusTone[usuario.statusUsuario]
                            }`}
                        >
                          {statusUsuarioLabel[usuario.statusUsuario]}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum usuário encontrado.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum usuário encontrado.
                </p>
              </div>
            ) : (
              paginated.map((usuario) => {
                const semEmpresa = !usuario.configuracaoEmpresaId;
                const isProprietario =
                  usuario.userRole === "ADMIN_PROPRIETARIO";

                return (
                  <div key={usuario.id} className="p-4">
                    <div className="mb-3 flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/usuarios/${usuario.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/usuarios/${usuario.id}/editar`)
                          }
                        />
                      )}

                      {podeEditar && (
                        <TableActionIcon
                          icon={ShieldCheck}
                          label="Permissões"
                          onClick={() =>
                            navigate(`/usuarios/${usuario.id}/permissoes`)
                          }
                        />
                      )}

                      {podeAlterarStatus && !isProprietario && (
                        <TableActionIcon
                          icon={Power}
                          label={
                            usuario.statusUsuario === "ATIVO"
                              ? "Inativar"
                              : "Ativar"
                          }
                          onClick={() => {
                            if (changingStatusId === usuario.id) return;
                            void handleToggleStatus(usuario);
                          }}
                        />
                      )}

                      {podeExcluir && !isProprietario && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(usuario.id)}
                        />
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {usuario.name}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {usuario.login}
                    </p>

                    <p
                      className={`mt-1 text-xs ${semEmpresa
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                        }`}
                    >
                      {empresaNome(usuario.configuracaoEmpresaId)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${roleTone[usuario.userRole]
                          }`}
                      >
                        {userRoleLabel[usuario.userRole]}
                      </span>

                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusTone[usuario.statusUsuario]
                          }`}
                      >
                        {statusUsuarioLabel[usuario.statusUsuario]}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <TablePagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onCopy={handleCopy}
          />
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o usuário esteja vinculado a
              permissões, registros ou histórico do sistema, o backend pode
              impedir a exclusão para preservar a integridade dos dados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton pageTitle="Usuários" />
    </AppLayout>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Power, ShieldCheck, RotateCcw } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { StatusPill } from "@/components/StatusPill";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { SortableTh } from "@/components/list/SortableTh";
import {
  AdvancedSearchPanel,
  SearchFilterGrid,
  useSessionBoolean,
} from "@/components/AdvancedSearchPanel";
import {
  ActiveFilters,
  type ActiveFilterItem,
} from "@/components/ActiveFilters";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { FieldLabel } from "@/components/FieldLabel";
import { DataTablePagination } from "@/components/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { isPlanoAccessDenied } from "@/lib/access";
import { getUsuarioLogadoStorage } from "@/lib/auth";
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
  getUsuarioById,
  deleteUsuario,
  alterarStatusUsuario,
  getConfiguracoesEmpresaOptions,
  type ConfiguracaoEmpresaOption,
  type Usuario,
  userRoleLabel,
  statusUsuarioLabel,
} from "@/data/usuarios";

const perfilOptions = [
  { value: "USER", label: userRoleLabel.USER },
  { value: "ADMIN", label: userRoleLabel.ADMIN },
  { value: "ADMIN_PROPRIETARIO", label: userRoleLabel.ADMIN_PROPRIETARIO },
];

const statusOptions = [
  { value: "ATIVO", label: statusUsuarioLabel.ATIVO },
  { value: "INATIVO", label: statusUsuarioLabel.INATIVO },
];

const sortByOptions = [
  { value: "name", label: "Nome" },
  { value: "login", label: "Usuário (login)" },
  { value: "empresa", label: "Organização" },
  { value: "userRole", label: "Perfil de acesso" },
  { value: "statusUsuario", label: "Status" },
] as const;

type SortBy = (typeof sortByOptions)[number]["value"];
type SortDir = "asc" | "desc";

const sortDirLabels: Record<SortDir, string> = { asc: "A–Z", desc: "Z–A" };
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label || value;

interface Filtros {
  nome: string;
  login: string;
  perfil: string[];
  status: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

function FilterField({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel tooltip={tooltip}>{label}</FieldLabel>
      {children}
    </div>
  );
}

const emptyFiltros: Filtros = {
  nome: "",
  login: "",
  perfil: [],
  status: [],
  sortBy: "name",
  sortDir: "asc",
};

export default function Usuarios() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<ConfiguracaoEmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [panelOpen, setPanelOpen] = useSessionBoolean(
    "usuarios:pesquisa-avancada",
    false,
  );
  const [draft, setDraft] = useState<Filtros>(emptyFiltros);
  const [filtros, setFiltros] = useState<Filtros>(emptyFiltros);
  const [searching, setSearching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const usuarioLogado = getUsuarioLogadoStorage();
  const isUsuarioComum = usuarioLogado?.userRole === "USER";

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

        const usuarioAtual = getUsuarioLogadoStorage();

        if (usuarioAtual?.userRole === "USER") {
          if (!active) return;

          setPermissoes({
            ...permissoesVazias,
            VISUALIZAR: true,
            EDITAR: true,
          });

          return;
        }

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

      const usuarioAtual = getUsuarioLogadoStorage();

      if (usuarioAtual?.userRole === "USER") {
        if (!usuarioAtual.id) {
          throw new Error("Usuário logado não identificado.");
        }

        const usuarioData = await getUsuarioById(String(usuarioAtual.id));

        setItems(usuarioData ? [usuarioData] : []);
        setEmpresas([]);

        return;
      }

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

  const empresaNome = (id?: string) => {
    if (isUsuarioComum) {
      return id ? "Organização vinculada" : "Sem organização vinculada";
    }

    return id
      ? (empresas.find((empresa) => empresa.id === id)?.nome ??
          "Empresa não encontrada")
      : "Sem empresa vinculada";
  };

  const setDraftField = <K extends keyof Filtros>(key: K, value: Filtros[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const applyFiltros = (next: Filtros) => {
    setDraft(next);
    setSearching(true);
    setFiltros(next);
    setCurrentPage(1);
    window.setTimeout(() => setSearching(false), 180);
  };
  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searching) applyFiltros(draft);
  };
  const handleClearFiltros = () => applyFiltros(emptyFiltros);

  const filtered = useMemo(() => {
    const nome = normalize(filtros.nome);
    const login = normalize(filtros.login);
    const result = items.filter((usuario) => {
      if (nome && !normalize(usuario.name).includes(nome)) return false;
      if (login && !normalize(usuario.login).includes(login)) return false;
      if (filtros.perfil.length && !filtros.perfil.includes(usuario.userRole))
        return false;
      if (
        filtros.status.length &&
        !filtros.status.includes(usuario.statusUsuario)
      )
        return false;
      return true;
    });
    const sortValue = (usuario: Usuario) => {
      switch (filtros.sortBy) {
        case "login":
          return usuario.login;
        case "empresa":
          return empresaNome(usuario.configuracaoEmpresaId);
        case "userRole":
          return userRoleLabel[usuario.userRole];
        case "statusUsuario":
          return statusUsuarioLabel[usuario.statusUsuario];
        default:
          return usuario.name;
      }
    };
    return [...result].sort((a, b) => {
      const compare = sortValue(a).localeCompare(sortValue(b), "pt-BR", {
        sensitivity: "base",
      });
      return filtros.sortDir === "asc" ? compare : -compare;
    });
  }, [items, filtros, empresas, isUsuarioComum]);

  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    if (filtros.nome.trim())
      list.push({
        id: "nome",
        label: "Nome",
        value: filtros.nome.trim(),
        onRemove: () => applyFiltros({ ...filtros, nome: "" }),
      });
    if (filtros.login.trim())
      list.push({
        id: "login",
        label: "Usuário",
        value: filtros.login.trim(),
        onRemove: () => applyFiltros({ ...filtros, login: "" }),
      });
    filtros.perfil.forEach((value) =>
      list.push({
        id: `perfil-${value}`,
        label: "Perfil",
        value: labelOf(perfilOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            perfil: filtros.perfil.filter((item) => item !== value),
          }),
      }),
    );
    filtros.status.forEach((value) =>
      list.push({
        id: `status-${value}`,
        label: "Status",
        value: labelOf(statusOptions, value),
        onRemove: () =>
          applyFiltros({
            ...filtros,
            status: filtros.status.filter((item) => item !== value),
          }),
      }),
    );
    return list;
  }, [filtros]);

  const filtrosKey = JSON.stringify(filtros);
  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, filtrosKey);
  const toggleSort = (sortBy: SortBy) =>
    applyFiltros({
      ...filtros,
      sortBy,
      sortDir:
        filtros.sortBy === sortBy && filtros.sortDir === "asc" ? "desc" : "asc",
    });

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

      setItems((prev) =>
        prev.filter((usuario) => usuario.id !== confirmDelete),
      );
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
        `Usuário ${
          updated.statusUsuario === "ATIVO" ? "ativado" : "inativado"
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

  const usuarioActions = (usuario: Usuario) => {
    const isProprietario = usuario.userRole === "ADMIN_PROPRIETARIO";
    const isProprioUsuario =
      usuarioLogado?.id != null &&
      String(usuarioLogado.id) === String(usuario.id);
    const podeVisualizarLinha = !isUsuarioComum || isProprioUsuario;
    const podeEditarLinha = isUsuarioComum ? isProprioUsuario : podeEditar;
    return {
      viewTo: podeVisualizarLinha ? `/usuarios/${usuario.id}` : undefined,
      editTo: podeEditarLinha ? `/usuarios/${usuario.id}/editar` : undefined,
      onDelete:
        !isUsuarioComum && podeExcluir && !isProprietario
          ? () => setConfirmDelete(usuario.id)
          : undefined,
      extraItems: [
        ...(!isUsuarioComum && podeEditar
          ? [
              {
                label: "Permissões",
                icon: ShieldCheck,
                to: `/usuarios/${usuario.id}/permissoes`,
              },
            ]
          : []),
        ...(!isUsuarioComum && podeAlterarStatus && !isProprietario
          ? [
              {
                label:
                  usuario.statusUsuario === "ATIVO" ? "Inativar" : "Ativar",
                icon: Power,
                disabled: changingStatusId === usuario.id,
                onClick: () => void handleToggleStatus(usuario),
              },
            ]
          : []),
      ],
    };
  };

  const UsuarioRow = ({
    usuario,
    mobile,
  }: {
    usuario: Usuario;
    mobile: boolean;
  }) => {
    const actions = usuarioActions(usuario);
    const empresa = empresaNome(usuario.configuracaoEmpresaId);
    if (mobile)
      return (
        <div className="p-4">
          <div className="mb-3">
            <RowActionsDropdown {...actions} />
          </div>
          <p className="font-medium text-foreground">{usuario.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {usuario.login}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{empresa}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground">
              {userRoleLabel[usuario.userRole]}
            </span>
            <StatusPill
              status={usuario.statusUsuario}
              ariaLabelPrefix="Status do usuário"
            />
          </div>
        </div>
      );
    return (
      <tr className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/25">
        <td className="whitespace-nowrap px-6 py-2.5">
          <RowActionsDropdown {...actions} />
        </td>
        <td className="whitespace-nowrap px-6 py-2.5">
          <TableCellText text={usuario.name} bold>
            {usuario.name}
          </TableCellText>
        </td>
        <td className="whitespace-nowrap px-6 py-2.5">
          <TableCellText text={usuario.login}>{usuario.login}</TableCellText>
        </td>
        <td className="whitespace-nowrap px-6 py-2.5">
          <TableCellText text={empresa} muted={!usuario.configuracaoEmpresaId}>
            {empresa}
          </TableCellText>
        </td>
        <td className="whitespace-nowrap px-6 py-2.5">
          <TableCellText text={userRoleLabel[usuario.userRole]}>
            {userRoleLabel[usuario.userRole]}
          </TableCellText>
        </td>
        <td className="whitespace-nowrap px-6 py-2.5">
          <StatusPill
            status={usuario.statusUsuario}
            ariaLabelPrefix="Status do usuário"
          />
        </td>
      </tr>
    );
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-8">
          <p className="text-sm text-muted-foreground">
            Carregando usuários...
          </p>
        </div>
      </AppLayout>
    );
  }

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
        <ListPageHeader
          title="Usuários"
          tooltip="Cadastre e gerencie os usuários que terão acesso ao sistema. Defina perfil, status e controle quem pode utilizar a plataforma."
          objective="Gerencie os acessos da sua organização. Usuários ativos podem entrar no sistema, enquanto usuários inativos ficam impedidos de acessar até nova liberação."
          actions={
            !isUsuarioComum && podeCriar ? (
              <Button
                type="button"
                variant="glassPrimary"
                onClick={() => navigate("/usuarios/novo")}
                className="h-9 gap-2 px-4"
              >
                <Plus className="h-4 w-4" />
                Cadastrar usuário
              </Button>
            ) : undefined
          }
        />
        <div className="space-y-4">
          <AdvancedSearchPanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            activeCount={activeFilters.length}
          >
            <form onSubmit={handleSearch} noValidate>
              <SearchFilterGrid>
                <FilterField
                  label="Nome"
                  tooltip="Digite o nome do usuário cadastrado."
                >
                  <Input
                    value={draft.nome}
                    onChange={(event) =>
                      setDraftField("nome", event.target.value)
                    }
                    placeholder="Digite o nome do usuário"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </FilterField>
                <FilterField
                  label="Usuário (login)"
                  tooltip="Digite o login utilizado para acessar o sistema."
                >
                  <Input
                    value={draft.login}
                    onChange={(event) =>
                      setDraftField("login", event.target.value)
                    }
                    placeholder="Ex.: maria.silva"
                    className="h-9 rounded-[10px] border-border/70 bg-background/70 backdrop-blur-sm"
                  />
                </FilterField>
                <FilterField
                  label="Perfil de acesso"
                  tooltip="Selecione um ou mais perfis de acesso."
                >
                  <FilterMultiSelect
                    options={perfilOptions}
                    value={draft.perfil}
                    onChange={(value) => setDraftField("perfil", value)}
                    placeholder="Todos os perfis"
                    summaryNoun="perfis selecionados"
                  />
                </FilterField>
                <FilterField
                  label="Status"
                  tooltip="Selecione o status do usuário no sistema."
                >
                  <FilterMultiSelect
                    options={statusOptions}
                    value={draft.status}
                    onChange={(value) => setDraftField("status", value)}
                    placeholder="Todos os status"
                    summaryNoun="status selecionados"
                  />
                </FilterField>
              </SearchFilterGrid>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-3.5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 gap-2 px-4"
                  onClick={handleClearFiltros}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar filtros
                </Button>
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  disabled={searching}
                >
                  <Search className="h-4 w-4" />
                  {searching ? "Pesquisando..." : "Pesquisar"}
                </Button>
              </div>
            </form>
          </AdvancedSearchPanel>
          <ActiveFilters
            items={activeFilters}
            onClearAll={handleClearFiltros}
          />
          <DataTableCard>
            <DataTableToolbar
              total={filtered.length}
              reportTo="/relatorios"
              exportColumns={[
                { header: "Nome", key: "name" },
                { header: "Login", key: "login" },
                { header: "Organização", key: "empresa" },
                { header: "Perfil", key: "perfil" },
                { header: "Status", key: "status" },
              ]}
              getExportData={() =>
                filtered.map((usuario) => ({
                  name: usuario.name,
                  login: usuario.login,
                  empresa: empresaNome(usuario.configuracaoEmpresaId),
                  perfil: userRoleLabel[usuario.userRole],
                  status: statusUsuarioLabel[usuario.statusUsuario],
                }))
              }
              exportFilename="usuarios"
              canExport={permissoes.BAIXAR}
            />
            {filtered.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum usuário encontrado."
                emptyDescription="Cadastre o primeiro usuário para liberar o acesso ao sistema."
                activeCount={activeFilters.length}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full w-max">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        <th className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                        <SortableTh
                          sortKey="name"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Nome
                        </SortableTh>
                        <SortableTh
                          sortKey="login"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Usuário
                        </SortableTh>
                        <SortableTh
                          sortKey="empresa"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Organização
                        </SortableTh>
                        <SortableTh
                          sortKey="userRole"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Perfil
                        </SortableTh>
                        <SortableTh
                          sortKey="statusUsuario"
                          activeKey={filtros.sortBy}
                          dir={filtros.sortDir}
                          onSort={toggleSort}
                        >
                          Status
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((usuario) => (
                        <UsuarioRow
                          key={usuario.id}
                          usuario={usuario}
                          mobile={false}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {paginated.map((usuario) => (
                    <UsuarioRow key={usuario.id} usuario={usuario} mobile />
                  ))}
                </div>
                <DataTablePagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="usuário"
                  entityLabelPlural="usuários"
                  pageSizeLabel="Registros por página"
                />
              </>
            )}
          </DataTableCard>
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

      <WikiFloatingButton
        pageTitle="Usuários"
        href="/wiki/configuracoes/usuarios"
      />
    </AppLayout>
  );
}

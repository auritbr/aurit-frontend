import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, CheckSquare, Square, Eye } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { toast } from "sonner";
import {
  getUsuarioById,
  getPermissoes,
  savePermissoes,
  GRUPOS_MODULOS,
  ACOES,
  moduloLabel,
  acaoLabel,
  userRoleLabel,
  statusUsuarioLabel,
  type ModuloPermissao,
  type AcaoPermissao,
  type UsuarioPermissao,
  type Usuario,
} from "@/data/usuarios";

type PermState = Record<ModuloPermissao, Record<AcaoPermissao, boolean>>;

function emptyState(): PermState {
  const state = {} as PermState;

  GRUPOS_MODULOS.forEach((grupo) => {
    grupo.modulos.forEach((modulo) => {
      state[modulo] = {
        VISUALIZAR: false,
        CRIAR: false,
        EDITAR: false,
        EXCLUIR: false,
        BAIXAR: false,
        GERAR_PDF: false,
        ALTERAR_STATUS: false,
      };
    });
  });

  return state;
}

function applyPermissoesToState(permissoes: UsuarioPermissao[]) {
  const next = emptyState();

  permissoes.forEach((permissao) => {
    if (
      next[permissao.moduloPermissao] &&
      permissao.acaoPermissao in next[permissao.moduloPermissao]
    ) {
      next[permissao.moduloPermissao][permissao.acaoPermissao] =
        permissao.permitido;
    }
  });

  return next;
}

export default function UsuarioPermissoes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [usuario, setUsuario] = useState<Usuario | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perms, setPerms] = useState<PermState>(() => emptyState());
  const [hasExisting, setHasExisting] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoesUsuarioLogado, setPermissoesUsuarioLogado] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeEditarPermissoes = permissoesUsuarioLogado.EDITAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoesDoLogado() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("USUARIOS");

        if (!active) return;

        setPermissoesUsuarioLogado(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoesUsuarioLogado(permissoesVazias);
      } finally {
        if (active) setLoadingPermissoes(false);
      }
    }

    void carregarPermissoesDoLogado();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (loadingPermissoes) return;

      if (!podeEditarPermissoes) {
        setLoading(false);
        return;
      }

      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const [usuarioData, existing] = await Promise.all([
          getUsuarioById(id),
          getPermissoes(id),
        ]);

        if (!active) return;

        if (!usuarioData) {
          toast.error("Usuário não encontrado.");
          navigate("/usuarios");
          return;
        }

        setUsuario(usuarioData);
        setHasExisting(existing.length > 0);
        setPerms(applyPermissoesToState(existing));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar permissões.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id, navigate, loadingPermissoes, podeEditarPermissoes]);

  const isProprietario = usuario?.userRole === "ADMIN_PROPRIETARIO";
  const readOnly = isProprietario;

  const toggle = (
    modulo: ModuloPermissao,
    acao: AcaoPermissao,
    value: boolean,
  ) => {
    if (readOnly) return;

    setPerms((prev) => {
      const next = {
        ...prev,
        [modulo]: {
          ...prev[modulo],
        },
      };

      next[modulo][acao] = value;

      if (value && acao !== "VISUALIZAR") {
        next[modulo].VISUALIZAR = true;
      }

      return next;
    });
  };

  const setAll = (value: boolean) => {
    if (readOnly) return;

    setPerms((prev) => {
      const next = { ...prev };

      (Object.keys(next) as ModuloPermissao[]).forEach((modulo) => {
        next[modulo] = { ...next[modulo] };

        ACOES.forEach((acao) => {
          next[modulo][acao] = value;
        });
      });

      return next;
    });
  };

  const setReadOnlyAll = () => {
    if (readOnly) return;

    setPerms((prev) => {
      const next = { ...prev };

      (Object.keys(next) as ModuloPermissao[]).forEach((modulo) => {
        next[modulo] = {
          VISUALIZAR: true,
          CRIAR: false,
          EDITAR: false,
          EXCLUIR: false,
          BAIXAR: false,
          GERAR_PDF: false,
          ALTERAR_STATUS: false,
        };
      });

      return next;
    });
  };

  const handleSave = async () => {
    if (!usuario) return;

    if (readOnly) {
      toast.error(
        "As permissões do administrador proprietário não podem ser alteradas.",
      );
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      const list: UsuarioPermissao[] = [];

      (Object.keys(perms) as ModuloPermissao[]).forEach((modulo) => {
        ACOES.forEach((acao) => {
          list.push({
            usuarioId: usuario.id,
            moduloPermissao: modulo,
            acaoPermissao: acao,
            permitido: !!perms[modulo][acao],
          });
        });
      });

      const saved = await savePermissoes(usuario.id, list);

      setPerms(applyPermissoesToState(saved));
      setHasExisting(true);

      toast.success("Permissões salvas com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar permissões.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando permissões...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!podeEditarPermissoes) {
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

  if (!usuario) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-8">
          <p className="text-sm text-muted-foreground">
            Usuário não encontrado.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/usuarios")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Permissões do usuário"
          tooltip="Defina quais módulos e ações este usuário poderá acessar no sistema."
        />

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Use esta área para controlar o acesso do usuário por módulo. Marque as
          ações permitidas, como visualizar, criar, editar, excluir, baixar,
          gerar PDF ou alterar status.
        </div>

        <div className="mb-5 rounded border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-foreground">{usuario.name}</p>
              <p className="text-xs text-muted-foreground">{usuario.login}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              Perfil:{" "}
              <span className="font-medium text-foreground">
                {userRoleLabel[usuario.userRole]}
              </span>
            </span>

            <span>
              Status:{" "}
              <span className="font-medium text-foreground">
                {statusUsuarioLabel[usuario.statusUsuario]}
              </span>
            </span>
          </div>
        </div>

        {isProprietario && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            As permissões do administrador proprietário não podem ser alteradas.
          </div>
        )}

        {usuario.userRole === "ADMIN" && (
          <div className="mb-4 rounded border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            Administradores podem ter acesso amplo ao sistema. Caso o backend
            esteja configurado para respeitar permissões por módulo, as opções
            abaixo definirão o acesso real deste usuário.
          </div>
        )}

        {!hasExisting && !readOnly && (
          <div className="mb-4 rounded border border-border bg-card px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              Este usuário ainda não possui permissões configuradas.
            </p>

            <p className="text-muted-foreground mt-0.5">
              Defina abaixo quais módulos e ações ele poderá acessar.
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAll(true)}
              className="gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Marcar tudo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAll(false)}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Desmarcar tudo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setReadOnlyAll}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Permissão somente leitura
            </Button>
          </div>
        )}

        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 sticky top-0">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5 min-w-[220px]">
                    Módulo
                  </th>

                  {ACOES.map((acao) => (
                    <th
                      key={acao}
                      className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5 whitespace-nowrap"
                    >
                      {acaoLabel[acao]}
                    </th>
                  ))}
                </tr>
              </thead>

              {GRUPOS_MODULOS.map((grupo) => (
                <tbody key={grupo.title}>
                  <tr className="bg-muted/20">
                    <td
                      colSpan={ACOES.length + 1}
                      className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {grupo.title}
                    </td>
                  </tr>

                  {grupo.modulos.map((modulo) => (
                    <tr
                      key={modulo}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-foreground">
                        {moduloLabel[modulo]}
                      </td>

                      {ACOES.map((acao) => (
                        <td key={acao} className="px-3 py-2 text-center">
                          <Checkbox
                            checked={!!perms[modulo]?.[acao]}
                            onCheckedChange={(value) =>
                              toggle(modulo, acao, !!value)
                            }
                            disabled={readOnly || saving}
                            aria-label={`${acaoLabel[acao]} em ${moduloLabel[modulo]}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/usuarios")}
          >
            Voltar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="sm:min-w-32"
            disabled={readOnly || saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
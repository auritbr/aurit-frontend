import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, CheckSquare, Square, Eye, Layers } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/StatusPill";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { isPlanoAccessDenied } from "@/lib/access";
import { getPlanoLabel } from "@/lib/plano";
import {
  getPermissoesUsuarioLogadoPorModulo,
  limparCachePermissoes,
  permissoesVazias,
  verificarPermissaoUsuarioLogado,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  getUsuarioById,
  getPermissoes,
  savePermissoes,
  getConfiguracoesEmpresaOptions,
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

const MODULOS_PLANO_GRATUITO: ModuloPermissao[] = [
  "DASHBOARD",

  "ORGANIZACAO",
  "DIRETORIA",
  "AGENTES_CULTURAIS",

  "COLABORADORES",
  "INTEGRANTES",
  "PARTICIPANTES",

  "PROJETOS",
  "CRONOGRAMA",

  "ATIVIDADES",
  "TURMAS",
  "PRESENCAS",

  "EVENTOS_CULTURAIS",
  "ACOES_DIVULGACAO",

  "CENTRAL_CLIENTE",

  "USUARIOS",
];

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

  // Usuários configurados antes da criação da Central do Cliente ainda usam
  // Configurações como regra de origem no backend. Espelhamos essa decisão na
  // tela até que uma permissão explícita para a Central seja salva.
  const centralClienteConfigurada = permissoes.some(
    (permissao) => permissao.moduloPermissao === "CENTRAL_CLIENTE",
  );

  if (!centralClienteConfigurada) {
    next.CENTRAL_CLIENTE = { ...next.CONFIGURACOES };
  }

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
  const [tipoPlano, setTipoPlano] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [permissoesUsuarioLogado, setPermissoesUsuarioLogado] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeEditarPermissoes = permissoesUsuarioLogado.EDITAR;

  const gruposModulosVisiveis = useMemo(() => {
    if (tipoPlano !== "PLANO_GRATUITO") {
      return GRUPOS_MODULOS;
    }

    return GRUPOS_MODULOS.map((grupo) => ({
      ...grupo,
      modulos: grupo.modulos.filter((modulo) =>
        MODULOS_PLANO_GRATUITO.includes(modulo),
      ),
    })).filter((grupo) => grupo.modulos.length > 0);
  }, [tipoPlano]);

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

        const [usuarioData, existing, empresasData] = await Promise.all([
          getUsuarioById(id),
          getPermissoes(id),
          getConfiguracoesEmpresaOptions(),
        ]);

        if (!active) return;

        if (!usuarioData) {
          toast.error("Usuário não encontrado.");
          navigate("/usuarios");
          return;
        }

        const empresaUsuario = empresasData.find(
          (empresa) => empresa.id === usuarioData.configuracaoEmpresaId,
        );

        setUsuario(usuarioData);
        setTipoPlano(empresaUsuario?.tipoPlano ?? null);
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
  const isAdministrador = usuario?.userRole === "ADMIN";
  // Administradores possuem acesso total no frontend e no backend. Manter uma
  // matriz editável para esse perfil seria enganoso, pois ela não altera o
  // acesso efetivo.
  const readOnly = isProprietario || isAdministrador;

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

    const modulosPermitidos =
      tipoPlano === "PLANO_GRATUITO"
        ? MODULOS_PLANO_GRATUITO
        : (Object.keys(perms) as ModuloPermissao[]);

    setPerms((prev) => {
      const next = { ...prev };

      modulosPermitidos.forEach((modulo) => {
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

    const modulosPermitidos =
      tipoPlano === "PLANO_GRATUITO"
        ? MODULOS_PLANO_GRATUITO
        : (Object.keys(perms) as ModuloPermissao[]);

    setPerms((prev) => {
      const next = { ...prev };

      modulosPermitidos.forEach((modulo) => {
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

  const setModulo = (modulo: ModuloPermissao, value: boolean) => {
    if (readOnly) return;
    setPerms((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        ...Object.fromEntries(ACOES.map((acao) => [acao, value])),
      },
    }));
  };

  const moduloCount = (modulo: ModuloPermissao) =>
    ACOES.filter((acao) => perms[modulo]?.[acao]).length;

  const handleSave = async () => {
    if (!usuario) return;

    if (readOnly) {
      toast.error(
        isAdministrador
          ? "Administradores possuem acesso total e não utilizam permissões granulares."
          : "As permissões do administrador proprietário não podem ser alteradas.",
      );
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      const podeSalvarPermissoes = await verificarPermissaoUsuarioLogado(
        "USUARIOS",
        "EDITAR",
      );

      if (!podeSalvarPermissoes) {
        toast.error(
          "Você não possui permissão para editar permissões de usuários.",
        );
        return;
      }

      const modulosParaSalvar =
        tipoPlano === "PLANO_GRATUITO"
          ? MODULOS_PLANO_GRATUITO
          : (Object.keys(perms) as ModuloPermissao[]);

      const list: UsuarioPermissao[] = [];

      modulosParaSalvar.forEach((modulo) => {
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

      limparCachePermissoes();
      setPerms(applyPermissoesToState(saved));
      setHasExisting(true);

      toast.success("Permissões salvas com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar permissões.";

      if (error instanceof ApiError && error.status === 403) {
        console.error("PUT de permissões negado pelo backend:", {
          status: error.status,
          url: error.url,
          path: error.path,
          body: error.body || error.message,
        });
      }

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
        <div className="container max-w-4xl py-8">
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
        <AccessDenied />
      </AppLayout>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessNotPermitted message={accessDeniedMessage} />
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
        <BackButton to="/usuarios" />

        <PageTitle
          title="Permissões"
          tooltip="Nesta página são definidas as permissões de acesso do usuário no Sistema Aurit. Configure quais módulos ele poderá acessar e quais ações poderá realizar em cada área, de acordo com os recursos disponíveis no plano da organização."
        />

        <div className="mb-5 rounded-[14px] border border-border/70 bg-card/75 px-4 py-3 text-[13px] text-muted-foreground backdrop-blur-md">
          Defina o nível de acesso deste usuário em cada módulo do sistema.
          Marque apenas as ações que ele deverá poder realizar, como visualizar,
          criar, editar, excluir, baixar arquivos, gerar PDF ou alterar status.
        </div>

        {tipoPlano === "PLANO_GRATUITO" && (
          <div className="mb-5 rounded-[14px] border border-amber-400/40 bg-amber-400/[0.12] px-4 py-3 text-[13px] leading-relaxed text-amber-900 backdrop-blur-md dark:text-amber-200">
            Esta organização está no plano gratuito. Por isso, apenas os módulos
            disponíveis neste plano podem ter permissões configuradas.
          </div>
        )}

        <div className="mb-5 form-section-glass flex flex-col gap-3 rounded-[18px] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-foreground">{usuario.name}</p>
              <p className="text-xs text-muted-foreground">{usuario.login}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 backdrop-blur-sm">
              Perfil:{" "}
              <span className="font-medium text-foreground">
                {userRoleLabel[usuario.userRole]}
              </span>
            </span>

            <StatusPill
              status={usuario.statusUsuario}
              ariaLabelPrefix="Status do usuário"
            />

            {tipoPlano && (
              <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 backdrop-blur-sm">
                Plano:{" "}
                <span className="font-medium text-foreground">
                  {getPlanoLabel(tipoPlano)}
                </span>
              </span>
            )}
          </div>
        </div>

        {isProprietario && (
          <div className="mb-4 rounded-[14px] border border-amber-400/40 bg-amber-400/[0.12] px-4 py-3 text-[13px] leading-relaxed text-amber-900 backdrop-blur-md dark:text-amber-200">
            As permissões do administrador proprietário não podem ser alteradas.
          </div>
        )}

        {isAdministrador && (
          <div className="mb-4 rounded-[14px] border border-primary/20 bg-primary/[0.06] px-4 py-3 text-[13px] leading-relaxed text-foreground backdrop-blur-md">
            Administradores possuem acesso total aos módulos e ações disponíveis
            para a organização. Por isso, as permissões granulares deste perfil
            não são editáveis.
          </div>
        )}

        {!hasExisting && !readOnly && (
          <div className="mb-4 rounded-[14px] border border-border/70 bg-card/70 px-4 py-3 text-[13px] backdrop-blur-md">
            <p className="font-medium text-foreground">
              Este usuário ainda não possui permissões configuradas.
            </p>

            <p className="text-muted-foreground mt-0.5">
              Defina abaixo quais módulos e ações ele poderá acessar.
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="glassSecondary"
              onClick={() => setAll(true)}
              className="gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Marcar tudo
            </Button>

            <Button
              type="button"
              variant="glassSecondary"
              onClick={() => setAll(false)}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Desmarcar tudo
            </Button>

            <Button
              type="button"
              variant="glassSecondary"
              onClick={setReadOnlyAll}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Permissão somente leitura
            </Button>
          </div>
        )}

        <div className="space-y-5">
          {gruposModulosVisiveis.map((grupo) => (
            <FormSectionCard
              key={grupo.title}
              icon={Layers}
              title={grupo.title}
            >
              <div className="space-y-3">
                {grupo.modulos.map((modulo) => {
                  const marcadas = moduloCount(modulo);
                  const todas = marcadas === ACOES.length;
                  return (
                    <div
                      key={modulo}
                      className="rounded-[14px] border border-border/70 bg-background/50 p-3.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40"
                    >
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">
                            {moduloLabel[modulo]}
                          </p>
                          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {marcadas} de {ACOES.length}
                          </span>
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setModulo(modulo, !todas)}
                            className="rounded-[8px] px-1.5 py-0.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {todas ? "Desmarcar módulo" : "Marcar módulo"}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {ACOES.map((acao) => {
                          const checked = !!perms[modulo]?.[acao];
                          return (
                            <label
                              key={acao}
                              className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-2 text-[13px] transition-colors ${checked ? "border-primary/30 bg-primary/[0.08] text-foreground" : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"} ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggle(modulo, acao, !!value)
                                }
                                disabled={readOnly || saving}
                                aria-label={`${acaoLabel[acao]} em ${moduloLabel[modulo]}`}
                              />
                              <span className={checked ? "font-medium" : ""}>
                                {acaoLabel[acao]}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSectionCard>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="glassSecondary"
            className="h-9 px-4"
            onClick={() => navigate("/usuarios")}
          >
            Voltar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            variant="glassPrimary"
            className="h-9 px-5"
            disabled={readOnly || saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
      <WikiFloatingButton
        pageTitle="Permissões"
        href="/wiki/configuracoes/permissoes"
      />
    </AppLayout>
  );
}

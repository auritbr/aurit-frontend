import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { PermissionGuard } from "@/components/PermissionGuard";
import { isPlanoAccessDenied } from "@/lib/access";
import { toast } from "sonner";
import {
  getUsuarioById,
  isLoginDuplicated,
  validatePasswordStrength,
  createUsuario,
  updateUsuario,
  getConfiguracoesEmpresaOptions,
  type ConfiguracaoEmpresaOption,
  type Usuario,
  type UserRole,
  type StatusUsuario,
  userRoleLabel,
  statusUsuarioLabel,
} from "@/data/usuarios";
import { getUsuarioLogadoStorage } from "@/lib/auth";

interface FormState {
  name: string;
  login: string;
  password: string;
  userRole: "" | UserRole;
  statusUsuario: "" | StatusUsuario;
  configuracaoEmpresaId: string;
}

const initial: FormState = {
  name: "",
  login: "",
  password: "",
  userRole: "",
  statusUsuario: "ATIVO",
  configuracaoEmpresaId: "",
};

export default function UsuarioForm() {
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const criando = !id;

  const acao = criando ? "CRIAR" : editando ? "EDITAR" : "VISUALIZAR";

  return (
    <PermissionGuard modulo="USUARIOS" acao={acao}>
      <UsuarioFormContent />
    </PermissionGuard>
  );
}

function UsuarioFormContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const criando = !id;

  const [existing, setExisting] = useState<Usuario | undefined>(undefined);
  const [empresas, setEmpresas] = useState<ConfiguracaoEmpresaOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  const isProprietario = existing?.userRole === "ADMIN_PROPRIETARIO";
  const bloqueado = loading || saving || visualizando;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const usuarioLogado = getUsuarioLogadoStorage();

        const [empresasData, usuarioData] = await Promise.all([
          getConfiguracoesEmpresaOptions(),
          id ? getUsuarioById(id) : Promise.resolve(undefined),
        ]);

        if (!active) return;

        setEmpresas(empresasData);

        if (id && !usuarioData) {
          toast.error("Usuário não encontrado.");
          navigate("/usuarios");
          return;
        }

        if (usuarioData) {
          setExisting(usuarioData);

          setForm({
            name: usuarioData.name,
            login: usuarioData.login,
            password: "",
            userRole: usuarioData.userRole,
            statusUsuario: usuarioData.statusUsuario,
            configuracaoEmpresaId: usuarioData.configuracaoEmpresaId ?? "",
          });
        } else {
          setExisting(undefined);

          const configuracaoEmpresaId =
            usuarioLogado?.configuracaoEmpresaId != null
              ? String(usuarioLogado.configuracaoEmpresaId)
              : empresasData.length === 1
                ? empresasData[0].id
                : "";

          setForm({
            ...initial,
            configuracaoEmpresaId,
            userRole: "USER",
            statusUsuario: "ATIVO",
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados do usuário.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

        toast.error(message);
        navigate("/usuarios");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const empresaNome = (idEmpresa?: string) =>
    idEmpresa
      ? empresas.find((empresa) => empresa.id === idEmpresa)?.nome ??
      "Configuração da empresa"
      : "Configuração da empresa vinculada";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (visualizando) return;

    if (!form.name.trim()) {
      toast.error("Informe o nome do usuário.");
      return;
    }

    if (!form.login.trim()) {
      toast.error("Informe o login.");
      return;
    }

    if (!form.userRole) {
      toast.error("Selecione o perfil de acesso.");
      return;
    }

    if (!form.statusUsuario) {
      toast.error("Selecione o status do usuário.");
      return;
    }

    if (!form.configuracaoEmpresaId) {
      toast.error("Não foi possível identificar a configuração da empresa.");
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      const duplicated = await isLoginDuplicated(form.login, existing?.id);

      if (duplicated) {
        toast.error("Este login já está em uso. Escolha outro.");
        return;
      }

      if (criando) {
        if (!form.password) {
          toast.error("Informe a senha.");
          return;
        }

        const passwordError = validatePasswordStrength(form.password);

        if (passwordError) {
          toast.error(passwordError);
          return;
        }

        await createUsuario({
          name: form.name.trim(),
          login: form.login.trim(),
          password: form.password,
          userRole: form.userRole as UserRole,
          statusUsuario: form.statusUsuario as StatusUsuario,
          configuracaoEmpresaId: form.configuracaoEmpresaId,
        });

        toast.success("Usuário cadastrado com sucesso.");
      }

      if (editando) {
        if (!existing) {
          toast.error("Usuário não encontrado.");
          return;
        }

        if (form.password) {
          const passwordError = validatePasswordStrength(form.password);

          if (passwordError) {
            toast.error(passwordError);
            return;
          }
        }

        await updateUsuario(existing.id, {
          name: form.name.trim(),
          login: form.login.trim(),
          ...(form.password ? { password: form.password } : {}),
          userRole: isProprietario
            ? existing.userRole
            : (form.userRole as UserRole),
          statusUsuario: isProprietario
            ? existing.statusUsuario
            : (form.statusUsuario as StatusUsuario),
          configuracaoEmpresaId: form.configuracaoEmpresaId,
        });

        toast.success("Usuário atualizado com sucesso.");
      }

      navigate("/usuarios");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar usuário.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-3xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/usuarios")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Usuário"
          tooltip="Cadastre e gerencie os usuários que terão acesso ao sistema. Defina perfil, status e permissões de acesso."
        />

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Gerencie os acessos da sua organização. O vínculo com a configuração
          da empresa é definido automaticamente pelo sistema.
        </div>

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && (
          <div className="mb-4 rounded border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            No plano gratuito, é permitido cadastrar usuários respeitando o
            limite total definido para a configuração da empresa.
          </div>
        )}

        {isProprietario && !visualizando && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            O administrador proprietário não pode ter perfil nem status
            alterados.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={User} title="Dados do usuário">
            <Field>
              <FieldLabel
                htmlFor="name"
                required={!visualizando}
                tooltip="Informe o nome da pessoa que utilizará o sistema. Ex.: Maria Silva."
              >
                Nome do Usuário
              </FieldLabel>

              <Input
                id="name"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                disabled={bloqueado}
                readOnly={visualizando}
              />
            </Field>
          </Section>

          <Section icon={Building2} title="Configuração vinculada">
            <Field>
              <FieldLabel
                htmlFor="configuracaoEmpresaId"
                tooltip="O usuário será vinculado automaticamente à configuração da empresa da organização logada."
              >
                Configuração da Empresa
              </FieldLabel>

              <Input
                id="configuracaoEmpresaId"
                value={empresaNome(form.configuracaoEmpresaId)}
                disabled
                readOnly
                className="bg-muted/40 cursor-not-allowed"
              />

              <p className="mt-1.5 text-xs text-muted-foreground">
                Este vínculo é definido automaticamente pelo sistema.
              </p>
            </Field>
          </Section>

          <Section icon={KeyRound} title="Acesso ao sistema">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="login"
                  required={!visualizando}
                  tooltip="Informe o login que será utilizado para acessar o sistema. Ele deve ser único."
                >
                  Login
                </FieldLabel>

                <Input
                  id="login"
                  value={form.login}
                  onChange={(event) => set("login", event.target.value)}
                  autoComplete="off"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              {!visualizando && (
                <Field>
                  <FieldLabel
                    htmlFor="password"
                    required={criando}
                    tooltip="A senha deve conter no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial."
                  >
                    Senha
                  </FieldLabel>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) =>
                        set("password", event.target.value)
                      }
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={saving}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {editando && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Preencha apenas se desejar alterar a senha.
                    </p>
                  )}
                </Field>
              )}
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Perfil e status">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="userRole"
                  required={!visualizando}
                  tooltip="Defina o nível de acesso do usuário no sistema."
                >
                  Perfil de Acesso
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="userRole"
                    value={
                      form.userRole
                        ? userRoleLabel[form.userRole as UserRole]
                        : "—"
                    }
                    disabled
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                  />
                ) : (
                  <Select
                    value={form.userRole}
                    onValueChange={(value) => set("userRole", value as UserRole)}
                    disabled={isProprietario || saving}
                  >
                    <SelectTrigger id="userRole">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {isProprietario && (
                        <SelectItem value="ADMIN_PROPRIETARIO">
                          Administrador Proprietário
                        </SelectItem>
                      )}

                      <SelectItem value="USER">Usuário</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="statusUsuario" required={!visualizando}>
                  Status do Usuário
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="statusUsuario"
                    value={
                      form.statusUsuario
                        ? statusUsuarioLabel[
                        form.statusUsuario as StatusUsuario
                        ]
                        : "—"
                    }
                    disabled
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                  />
                ) : (
                  <Select
                    value={form.statusUsuario}
                    onValueChange={(value) =>
                      set("statusUsuario", value as StatusUsuario)
                    }
                    disabled={isProprietario || saving}
                  >
                    <SelectTrigger id="statusUsuario">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/usuarios")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold text-foreground leading-tight uppercase tracking-wide">
          {title}
        </h2>
      </div>

      {children}
    </Card>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
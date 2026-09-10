import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  User,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { PermissionGuard } from "@/components/PermissionGuard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
  email: string;
  password: string;
  userRole: "" | UserRole;
  statusUsuario: "" | StatusUsuario;
  configuracaoEmpresaId: string;
}

const initial: FormState = {
  name: "",
  login: "",
  email: "",
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
  const usuarioLogado = getUsuarioLogadoStorage();

  const modoProprioUsuario =
    usuarioLogado?.userRole === "USER" &&
    !!id &&
    usuarioLogado.id != null &&
    String(usuarioLogado.id) === String(id) &&
    !criando;

  if (modoProprioUsuario) {
    return <UsuarioFormContent modoProprioUsuario />;
  }

  return (
    <PermissionGuard modulo="USUARIOS" acao={acao}>
      <UsuarioFormContent />
    </PermissionGuard>
  );
}

function UsuarioFormContent({
  modoProprioUsuario = false,
}: {
  modoProprioUsuario?: boolean;
}) {
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
  const bloqueiaPerfilStatus = isProprietario || modoProprioUsuario;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setAccessDeniedMessage(null);

        const usuarioLogado = getUsuarioLogadoStorage();

        let empresasData: ConfiguracaoEmpresaOption[] = [];
        let usuarioData: Usuario | undefined = undefined;

        if (modoProprioUsuario) {
          usuarioData = id ? await getUsuarioById(id) : undefined;
        } else {
          const result = await Promise.all([
            getConfiguracoesEmpresaOptions(),
            id ? getUsuarioById(id) : Promise.resolve(undefined),
          ]);

          empresasData = result[0];
          usuarioData = result[1];
        }

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
            email: usuarioData.email ?? "",
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
  }, [id, navigate, modoProprioUsuario]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const empresaNome = (idEmpresa?: string) => {
    if (modoProprioUsuario) {
      return idEmpresa ? "Organização vinculada" : "Organização vinculada";
    }

    return idEmpresa
      ? (empresas.find((empresa) => empresa.id === idEmpresa)?.nome ??
          "Configuração da empresa")
      : "Configuração da empresa vinculada";
  };

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

    if (criando && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(form.email.trim())) {
      toast.error("Informe um e-mail válido.");
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

    if (!modoProprioUsuario && !form.configuracaoEmpresaId) {
      toast.error("Não foi possível identificar a configuração da empresa.");
      return;
    }

    try {
      setSaving(true);
      setAccessDeniedMessage(null);

      if (!modoProprioUsuario) {
        const duplicated = await isLoginDuplicated(form.login, existing?.id);

        if (duplicated) {
          toast.error("Este login já está em uso. Escolha outro.");
          return;
        }
      }

      if (criando) {
        await createUsuario({
          name: form.name.trim(),
          login: form.login.trim(),
          email: form.email.trim().toLowerCase(),
          userRole: form.userRole as UserRole,
          statusUsuario: form.statusUsuario as StatusUsuario,
          configuracaoEmpresaId: form.configuracaoEmpresaId,
        });

        toast.success(
          "Usuário cadastrado. Enviamos o link de ativação para o e-mail informado.",
        );
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
          login: modoProprioUsuario ? existing.login : form.login.trim(),
          email: existing.email,
          ...(form.password ? { password: form.password } : {}),
          userRole:
            isProprietario || modoProprioUsuario
              ? existing.userRole
              : (form.userRole as UserRole),
          statusUsuario:
            isProprietario || modoProprioUsuario
              ? existing.statusUsuario
              : (form.statusUsuario as StatusUsuario),
          ...(form.configuracaoEmpresaId
            ? { configuracaoEmpresaId: form.configuracaoEmpresaId }
            : {}),
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
        <BackButton to="/usuarios" />

        <PageTitle
          title={visualizando ? "Usuário" : editando ? "Usuário" : "Usuário"}
          tooltip="Cadastre e gerencie os usuários que terão acesso ao sistema. Defina perfil, status e permissões de acesso."
        />

        {visualizando && (
          <div className="mb-5 rounded-[14px] border border-amber-400/40 bg-amber-400/[0.12] px-4 py-3 text-[13px] leading-relaxed text-amber-900 backdrop-blur-md dark:text-amber-200">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {isProprietario && !visualizando && (
          <div className="mb-4 rounded-[14px] border border-amber-400/40 bg-amber-400/[0.12] px-4 py-3 text-[13px] leading-relaxed text-amber-900 backdrop-blur-md dark:text-amber-200">
            O administrador proprietário não pode ter perfil nem status
            alterados.
          </div>
        )}

        {modoProprioUsuario && !visualizando && (
          <div className="mb-4 rounded-[14px] border border-amber-400/40 bg-amber-400/[0.12] px-4 py-3 text-[13px] leading-relaxed text-amber-900 backdrop-blur-md dark:text-amber-200">
            Você pode alterar apenas seus próprios dados permitidos. Perfil,
            status, login e organização são definidos pela administração.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section
            icon={User}
            title="Dados do usuário"
            description="Informe o nome da pessoa que utilizará o sistema."
          >
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

          <Section
            icon={Building2}
            title="Configuração vinculada"
            description="O vínculo com a organização é definido automaticamente pelo sistema."
          >
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

          <Section
            icon={KeyRound}
            title="Acesso ao sistema"
            description={
              criando
                ? "Informe o login e o e-mail. A pessoa receberá um link para criar a própria senha."
                : "Gerencie os dados de acesso à plataforma."
            }
          >
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
                  disabled={bloqueado || modoProprioUsuario}
                  readOnly={visualizando || modoProprioUsuario}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="email"
                  required={criando}
                  tooltip="O link de ativação será enviado para este endereço."
                >
                  E-mail
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                  autoComplete="email"
                  disabled={bloqueado || !criando}
                  readOnly={visualizando || !criando}
                />
                {criando && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    A pessoa definirá a senha pelo link de ativação enviado por
                    e-mail.
                  </p>
                )}
              </Field>

              {!visualizando && !criando && (
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
                      onChange={(event) => set("password", event.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={saving}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
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

          <Section
            icon={ShieldCheck}
            title="Perfil e status"
            description="Defina o nível de acesso e se o usuário pode entrar no sistema."
          >
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
                    onValueChange={(value) =>
                      set("userRole", value as UserRole)
                    }
                    disabled={bloqueiaPerfilStatus || saving}
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
                    disabled={bloqueiaPerfilStatus || saving}
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

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/usuarios")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>
      <WikiFloatingButton
        pageTitle="Usuários"
        href="/wiki/configuracoes/usuarios"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

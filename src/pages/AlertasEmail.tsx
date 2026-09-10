import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { EmailInput } from "@/components/EmailInput";
import { FieldLabel } from "@/components/FieldLabel";
import { Switch } from "@/components/ui/switch";
import { isPlanoGratuitoAtual } from "@/lib/plano";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertasEmailError,
  atualizarDestinatario,
  criarDestinatario,
  excluirDestinatario,
  listarDestinatarios,
  type DestinatarioAlerta,
} from "@/data/alertasEmail";

const emailValido = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const mensagemErro = (error: unknown, fallback: string) =>
  error instanceof AlertasEmailError && error.message
    ? error.message
    : fallback;

const TOOLTIP_EMAIL =
  "Informe o endereço de e-mail que deverá receber os alertas automáticos da organização.";

const AUXILIAR_SWITCH =
  "Quando desativado, este endereço permanecerá cadastrado, mas não receberá novos alertas.";

export default function AlertasEmail() {
  const [destinatarios, setDestinatarios] = useState<DestinatarioAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [planoGratuito, setPlanoGratuito] = useState(false);

  // Formulário inline de criação
  const [novoAberto, setNovoAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const novoInputRef = useRef<HTMLInputElement>(null);

  // Edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [editErro, setEditErro] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [paraExcluir, setParaExcluir] = useState<DestinatarioAlerta | null>(
    null,
  );
  const [excluindo, setExcluindo] = useState(false);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [itens, gratuito] = await Promise.all([
        listarDestinatarios(),
        isPlanoGratuitoAtual(),
      ]);
      setDestinatarios(itens);
      setPlanoGratuito(gratuito);
    } catch (error) {
      toast.error(
        mensagemErro(
          error,
          "Não foi possível carregar os destinatários dos alertas.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const totalAtivos = useMemo(
    () => destinatarios.filter((item) => item.ativo).length,
    [destinatarios],
  );

  const abrirNovo = () => {
    setEditandoId(null);
    setEmail("");
    setAtivo(true);
    setErroEmail(null);
    setNovoAberto(true);
    window.setTimeout(() => novoInputRef.current?.focus(), 60);
  };

  const fecharNovo = () => {
    setNovoAberto(false);
    setEmail("");
    setAtivo(true);
    setErroEmail(null);
  };

  const handleSalvar = async () => {
    const valor = email.trim();
    if (!valor) {
      setErroEmail("Informe o endereço de e-mail.");
      return;
    }
    if (!emailValido(valor)) {
      setErroEmail(
        "Informe um e-mail válido, como exemplo@organizacao.org.br.",
      );
      return;
    }
    setErroEmail(null);
    setSalvando(true);
    try {
      await criarDestinatario({ email: valor, ativo });
      toast.success("E-mail adicionado aos destinatários de alertas.");
      fecharNovo();
      await carregar();
    } catch (error) {
      const mensagem = mensagemErro(
        error,
        "Não foi possível salvar o e-mail. Tente novamente.",
      );
      setErroEmail(mensagem);
      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (destinatario: DestinatarioAlerta) => {
    setNovoAberto(false);
    setEditandoId(String(destinatario.id));
    setEditEmail(destinatario.email);
    setEditAtivo(destinatario.ativo);
    setEditErro(null);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditEmail("");
    setEditErro(null);
  };

  const handleSalvarEdicao = async (destinatario: DestinatarioAlerta) => {
    const valor = editEmail.trim();
    if (!valor) {
      setEditErro("Informe o endereço de e-mail.");
      return;
    }
    if (!emailValido(valor)) {
      setEditErro("Informe um e-mail válido, como exemplo@organizacao.org.br.");
      return;
    }
    setEditErro(null);
    setSalvandoEdicao(true);
    try {
      await atualizarDestinatario(destinatario.id, {
        email: valor,
        ativo: editAtivo,
      });
      toast.success("E-mail atualizado com sucesso.");
      cancelarEdicao();
      await carregar();
    } catch (error) {
      const mensagem = mensagemErro(
        error,
        "Não foi possível salvar o e-mail. Tente novamente.",
      );
      setEditErro(mensagem);
      toast.error(mensagem);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluir = async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await excluirDestinatario(paraExcluir.id);
      toast.success("E-mail excluído dos destinatários de alertas.");
      setParaExcluir(null);
      await carregar();
    } catch (error) {
      toast.error(
        mensagemErro(
          error,
          "Não foi possível excluir o e-mail. Tente novamente.",
        ),
      );
    } finally {
      setExcluindo(false);
    }
  };

  const handleToggle = async (
    destinatario: DestinatarioAlerta,
    proximo: boolean,
  ) => {
    setAlternandoId(String(destinatario.id));
    setDestinatarios((atual) =>
      atual.map((item) =>
        String(item.id) === String(destinatario.id)
          ? { ...item, ativo: proximo }
          : item,
      ),
    );
    try {
      await atualizarDestinatario(destinatario.id, {
        email: destinatario.email,
        ativo: proximo,
      });
      toast.success(
        proximo
          ? "Este e-mail voltará a receber os alertas."
          : "Este e-mail não receberá novos alertas.",
      );
      await carregar();
    } catch (error) {
      toast.error(
        mensagemErro(
          error,
          "Não foi possível atualizar o recebimento de alertas.",
        ),
      );
      await carregar();
    } finally {
      setAlternandoId(null);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl py-6 sm:py-8">
        <ListPageHeader
          title="Alertas por e-mail"
          tooltip="Nesta página são cadastrados os endereços de e-mail que receberão os alertas automáticos do Sistema Aurit. Esses alertas ajudam a acompanhar prazos, vencimentos e outras informações importantes registradas pela organização."
          objective="Cadastre e mantenha atualizados os endereços de e-mail que devem receber os alertas automáticos do Sistema Aurit, garantindo que as informações importantes sejam enviadas aos responsáveis pelo acompanhamento."
          actions={
            <Button
              type="button"
              variant="glassPrimary"
              className="h-9 gap-2 px-4"
              onClick={abrirNovo}
            >
              <Plus className="h-4 w-4" />
              Adicionar e-mail
            </Button>
          }
        />

        {planoGratuito && (
          <div className="mb-5 rounded-[14px] border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950 backdrop-blur-md">
            No plano gratuito, os alertas de documentos, empréstimos e editais
            não são enviados. Os avisos de aniversários e de três faltas
            consecutivas permanecem disponíveis.
          </div>
        )}

        {novoAberto && (
          <section
            aria-label="Novo destinatário"
            className="mb-5 rounded-[15px] border border-border/60 bg-card/60 px-4 py-4 backdrop-blur-sm transition-all duration-200 supports-[backdrop-filter]:bg-card/50 animate-in fade-in-0 slide-in-from-top-1 sm:px-5"
          >
            <h2 className="mb-3.5 text-sm font-semibold text-foreground">
              Novo destinatário
            </h2>

            <div className="space-y-4">
              <div className="max-w-md">
                <FieldLabel
                  htmlFor="alerta-email"
                  required
                  tooltip={TOOLTIP_EMAIL}
                >
                  E-mail
                </FieldLabel>
                <EmailInput
                  ref={novoInputRef}
                  id="alerta-email"
                  value={email}
                  placeholder="exemplo@organizacao.org.br"
                  aria-invalid={erroEmail ? true : undefined}
                  onValueChange={(valor) => {
                    setEmail(valor);
                    if (erroEmail) setErroEmail(null);
                  }}
                />
                {erroEmail && (
                  <p className="mt-1.5 text-[12.5px] text-destructive">
                    {erroEmail}
                  </p>
                )}
              </div>

              <div className="flex items-start justify-between gap-4 rounded-[13px] border border-border/50 bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                  <FieldLabel htmlFor="alerta-ativo">
                    Receber alertas
                  </FieldLabel>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {AUXILIAR_SWITCH}
                  </p>
                </div>
                <Switch
                  id="alerta-ativo"
                  checked={ativo}
                  onCheckedChange={setAtivo}
                  className="mt-1 shrink-0"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-9 px-4"
                  onClick={fecharNovo}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="glassPrimary"
                  className="h-9 gap-2 px-5"
                  onClick={() => void handleSalvar()}
                  disabled={salvando}
                  aria-busy={salvando}
                >
                  {salvando && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </section>
        )}

        <FormSectionCard
          icon={Mail}
          title="Destinatários dos alertas"
          description="Informe um ou mais endereços de e-mail que devem receber os alertas automáticos enviados pelo Sistema Aurit."
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando destinatários...
            </div>
          ) : destinatarios.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                <Mail className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Nenhum e-mail cadastrado
                </p>
                <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Adicione pelo menos um endereço de e-mail para começar a
                  receber os alertas automáticos da Aurit.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ul
                className="flex flex-col gap-2.5"
                aria-label="Destinatários dos alertas"
              >
                {destinatarios.map((destinatario) => {
                  const id = String(destinatario.id);
                  const emEdicao = editandoId === id;
                  return (
                    <li
                      key={id}
                      className="rounded-[13px] border border-border/60 bg-card/70 px-4 py-3 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.07),inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)] backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-card/60 hover:border-border"
                    >
                      {emEdicao ? (
                        <div className="space-y-3">
                          <div className="max-w-md">
                            <FieldLabel
                              htmlFor={`edit-email-${id}`}
                              required
                              tooltip={TOOLTIP_EMAIL}
                            >
                              E-mail
                            </FieldLabel>
                            <EmailInput
                              id={`edit-email-${id}`}
                              value={editEmail}
                              placeholder="exemplo@organizacao.org.br"
                              aria-invalid={editErro ? true : undefined}
                              onValueChange={(valor) => {
                                setEditEmail(valor);
                                if (editErro) setEditErro(null);
                              }}
                            />
                            {editErro && (
                              <p className="mt-1.5 text-[12.5px] text-destructive">
                                {editErro}
                              </p>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-4 rounded-[13px] border border-border/50 bg-muted/20 px-4 py-3">
                            <div className="min-w-0">
                              <FieldLabel htmlFor={`edit-ativo-${id}`}>
                                Receber alertas
                              </FieldLabel>
                              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                                {AUXILIAR_SWITCH}
                              </p>
                            </div>
                            <Switch
                              id={`edit-ativo-${id}`}
                              checked={editAtivo}
                              onCheckedChange={setEditAtivo}
                              className="mt-1 shrink-0"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="glassSecondary"
                              className="h-9 px-4"
                              onClick={cancelarEdicao}
                              disabled={salvandoEdicao}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="glassPrimary"
                              className="h-9 gap-2 px-5"
                              onClick={() =>
                                void handleSalvarEdicao(destinatario)
                              }
                              disabled={salvandoEdicao}
                              aria-busy={salvandoEdicao}
                            >
                              {salvandoEdicao && (
                                <Loader2
                                  className="h-4 w-4 animate-spin"
                                  aria-hidden
                                />
                              )}
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary"
                              aria-hidden
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 break-all text-[13.5px] font-medium text-foreground">
                              {destinatario.email}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <div className="flex items-center gap-2.5">
                              <StatusPill
                                status={
                                  destinatario.ativo ? "ATIVO" : "INATIVO"
                                }
                              />
                              <Switch
                                checked={destinatario.ativo}
                                disabled={alternandoId === id}
                                onCheckedChange={(valor) =>
                                  void handleToggle(destinatario, valor)
                                }
                                aria-label={`Receber alertas em ${destinatario.email}`}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="glassGhost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => abrirEdicao(destinatario)}
                                    aria-label={`Editar ${destinatario.email}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar e-mail</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="glassGhost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setParaExcluir(destinatario)}
                                    aria-label={`Excluir ${destinatario.email}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir e-mail</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                {totalAtivos === 1
                  ? "1 e-mail ativo receberá os alertas automáticos da organização."
                  : `${totalAtivos} e-mails ativos receberão os alertas automáticos da organização.`}
              </p>
            </>
          )}
        </FormSectionCard>
      </div>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(open) =>
          !open && !excluindo ? setParaExcluir(null) : undefined
        }
      >
        <AlertDialogContent className="sm:max-w-[380px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Excluir e-mail
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Este endereço deixará de receber os alertas automáticos da
              organização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleExcluir();
              }}
              disabled={excluindo}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WikiFloatingButton
        pageTitle="Alertas por e-mail"
        href="/wiki/configuracoes/alertas-por-email"
      />
    </AppLayout>
  );
}

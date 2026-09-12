import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Cake,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  MessageCircle,
  Megaphone,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Smartphone,
  Trash2,
  User,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { FieldLabel } from "@/components/FieldLabel";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { maskPhone } from "@/lib/masks";
import { isPlanoGratuitoAtual } from "@/lib/plano";
import {
  adicionarDestinatarioWhatsapp,
  atualizarDestinatarioWhatsapp,
  enviarMensagemTeste,
  formatarDataEnvio,
  formatarTelefoneWhatsapp,
  getConfiguracaoWhatsapp,
  getDestinatariosWhatsapp,
  getHistoricoNotificacoes,
  salvarConfiguracaoWhatsapp,
  removerDestinatarioWhatsapp,
  telefoneWhatsappValido,
  type DestinatarioWhatsapp,
  type NotificacaoEnviada,
} from "@/data/notificacoesWhatsapp";

const TOOLTIP_NOME =
  "Informe o nome da pessoa responsável pelo recebimento das notificações da organização. Esse nome poderá ser utilizado para identificar o responsável e personalizar as mensagens enviadas pelo Sistema Aurit.";

const TOOLTIP_TELEFONE =
  "Informe o número de WhatsApp que receberá as notificações automáticas do Sistema Aurit. Inclua o DDD e certifique-se de que o número esteja ativo e apto a receber mensagens.";

const avisosAutomaticos = [
  {
    icon: FileText,
    titulo: "Validade de documentos",
    descricao:
      "Avisos sobre documentos que possuem data de validade cadastrada, ajudando a acompanhar vencimentos e providenciar atualizações dentro do prazo.",
    prazos: ["10 dias antes", "5 dias antes", "No dia do vencimento"],
    planoPago: true,
  },

  {
    icon: Package,
    titulo: "Empréstimos",
    descricao:
      "Avisos sobre a data prevista para devolução de bens patrimoniais emprestados, facilitando o acompanhamento dos empréstimos em andamento.",
    prazos: [
      "10 dias antes",
      "5 dias antes",
      "Na data prevista para devolução",
    ],
    planoPago: true,
  },

  {
    icon: Megaphone,
    titulo: "Editais",
    descricao:
      "Avisos sobre o encerramento do período de inscrição dos editais cadastrados, ajudando a acompanhar os prazos das oportunidades de interesse.",
    prazos: ["10 dias antes", "5 dias antes", "No dia do encerramento"],
    planoPago: true,
  },

  {
    icon: Cake,
    titulo: "Aniversários",
    descricao:
      "Avisos de aniversário das pessoas que possuem data de nascimento cadastrada no Sistema Aurit.",
    prazos: ["No dia do aniversário"],
    planoPago: false,
  },

  {
    icon: UserX,
    titulo: "Frequência dos participantes",
    descricao:
      "Aviso enviado quando um participante matriculado completa três faltas consecutivas na mesma atividade e turma, facilitando o acompanhamento da frequência.",
    prazos: ["Ao completar 3 faltas consecutivas"],
    planoPago: false,
  },
];

export default function Notificacoes() {
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [editandoTelefonePrincipal, setEditandoTelefonePrincipal] =
    useState(false);
  const [feedbackTeste, setFeedbackTeste] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);
  const [historico, setHistorico] = useState<NotificacaoEnviada[]>([]);
  const [destinatarios, setDestinatarios] = useState<DestinatarioWhatsapp[]>([]);
  const [telefoneDestinatario, setTelefoneDestinatario] = useState("");
  const [erroTelefoneDestinatario, setErroTelefoneDestinatario] =
    useState<string | null>(null);
  const [salvandoDestinatario, setSalvandoDestinatario] = useState(false);
  const [destinatarioEmTesteId, setDestinatarioEmTesteId] = useState<number | null>(null);
  const [destinatarioEmEdicaoId, setDestinatarioEmEdicaoId] =
    useState<number | null>(null);
  const [telefoneDestinatarioEmEdicao, setTelefoneDestinatarioEmEdicao] =
    useState("");
  const [erroEdicaoDestinatario, setErroEdicaoDestinatario] =
    useState<string | null>(null);
  const [erroEdicaoPrincipal, setErroEdicaoPrincipal] = useState<string | null>(
    null,
  );
  const [planoGratuito, setPlanoGratuito] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento(false);
    try {
      const [config, notificacoes, destinatariosCarregados, gratuito] = await Promise.all([
        getConfiguracaoWhatsapp(),
        getHistoricoNotificacoes(),
        getDestinatariosWhatsapp(),
        isPlanoGratuitoAtual(),
      ]);
      setNomeResponsavel(config.nomeResponsavel ?? "");
      setTelefone(formatarTelefoneWhatsapp(config.telefoneWhatsapp));
      setAtivo(Boolean(config.ativo));
      setHistorico(notificacoes);
      setDestinatarios(destinatariosCarregados);
      setPlanoGratuito(gratuito);
    } catch (error) {
      setErroCarregamento(true);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as notificações.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const primeiroNome = useMemo(
    () => nomeResponsavel.trim().split(/\s+/)[0] || "responsável",
    [nomeResponsavel],
  );
  const avisosDisponiveis = useMemo(
    () =>
      avisosAutomaticos.filter((aviso) => !planoGratuito || !aviso.planoPago),
    [planoGratuito],
  );

  const telefoneJaCadastrado = (
    telefoneParaValidar: string,
    idIgnorado?: number,
  ) => {
    const normalizar = (valor: string) =>
      valor.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    const telefoneNormalizado = normalizar(telefoneParaValidar);

    if (!telefoneNormalizado) return false;
    if (normalizar(telefone) === telefoneNormalizado) return true;

    return destinatarios.some(
      (destinatario) =>
        destinatario.id !== idIgnorado &&
        normalizar(destinatario.telefoneWhatsapp) === telefoneNormalizado,
    );
  };

  const validar = () => {
    let valido = true;
    if (!nomeResponsavel.trim()) {
      setErroNome("Informe o nome da pessoa responsável.");
      valido = false;
    }
    if (!telefoneWhatsappValido(telefone)) {
      setErroTelefone(
        "Informe um número de WhatsApp válido com DDD, como (00) 00000-0000.",
      );
      valido = false;
    }
    return valido;
  };

  const handleSalvar = async () => {
    setErroNome(null);
    setErroTelefone(null);
    if (!validar()) return;
    setSalvando(true);
    try {
      const config = await salvarConfiguracaoWhatsapp({
        nomeResponsavel: nomeResponsavel.trim(),
        telefoneWhatsapp: telefone,
        ativo,
      });
      setNomeResponsavel(config.nomeResponsavel);
      setTelefone(formatarTelefoneWhatsapp(config.telefoneWhatsapp));
      setAtivo(config.ativo);
      toast.success("Configurações de notificações salvas com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleTeste = async () => {
    setFeedbackTeste(null);
    setErroNome(null);
    setErroTelefone(null);
    if (!validar()) {
      setFeedbackTeste({
        tipo: "erro",
        texto:
          "Não foi possível enviar a mensagem de teste. Verifique os dados informados e tente novamente.",
      });
      return;
    }
    setTestando(true);
    try {
      await enviarMensagemTeste(nomeResponsavel.trim(), telefone);
      setHistorico(await getHistoricoNotificacoes());
      setFeedbackTeste({
        tipo: "ok",
        texto: "Mensagem de teste enviada com sucesso.",
      });
      toast.success("Mensagem de teste enviada com sucesso.");
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem de teste.";
      setFeedbackTeste({ tipo: "erro", texto });
      toast.error(texto);
    } finally {
      setTestando(false);
    }
  };

  const handleAdicionarDestinatario = async () => {
    if (!telefoneWhatsappValido(telefoneDestinatario)) {
      setErroTelefoneDestinatario(
        "Informe um número de WhatsApp válido com DDD.",
      );
      return;
    }
    if (telefoneJaCadastrado(telefoneDestinatario)) {
      setErroTelefoneDestinatario(
        "Este telefone já está cadastrado para receber notificações.",
      );
      return;
    }
    setErroTelefoneDestinatario(null);

    if (!telefoneWhatsappValido(telefone)) {
      setTelefone(telefoneDestinatario);
      setAtivo(true);
      setTelefoneDestinatario("");
      toast.success("Telefone principal adicionado. Salve as configurações para concluir.");
      return;
    }

    setSalvandoDestinatario(true);
    try {
      const destinatario = await adicionarDestinatarioWhatsapp({
        // O backend ainda exige um nome para o destinatário. A tela possui um
        // responsável único, portanto ele é usado para identificar os novos números.
        nome: nomeResponsavel.trim() || "Responsável",
        telefoneWhatsapp: telefoneDestinatario,
        ativo: true,
      });
      setDestinatarios((atuais) =>
        [...atuais, destinatario].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setTelefoneDestinatario("");
      toast.success("Telefone adicional cadastrado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o destinatário.",
      );
    } finally {
      setSalvandoDestinatario(false);
    }
  };

  const salvarTelefonePrincipal = () => {
    if (!telefoneWhatsappValido(telefone)) {
      setErroEdicaoPrincipal("Informe um número de WhatsApp válido com DDD.");
      return;
    }
    const telefoneNormalizado = telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    if (
      destinatarios.some(
        (destinatario) =>
          destinatario.telefoneWhatsapp
            .replace(/\D/g, "")
            .replace(/^55(?=\d{10,11}$)/, "") === telefoneNormalizado,
      )
    ) {
      setErroEdicaoPrincipal(
        "Este telefone já está cadastrado para receber notificações.",
      );
      return;
    }
    setErroEdicaoPrincipal(null);
    setEditandoTelefonePrincipal(false);
  };

  const iniciarEdicaoDestinatario = (destinatario: DestinatarioWhatsapp) => {
    setDestinatarioEmEdicaoId(destinatario.id);
    setTelefoneDestinatarioEmEdicao(
      formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp),
    );
    setErroEdicaoDestinatario(null);
  };

  const cancelarEdicaoDestinatario = () => {
    setDestinatarioEmEdicaoId(null);
    setTelefoneDestinatarioEmEdicao("");
    setErroEdicaoDestinatario(null);
  };

  const handleSalvarEdicaoDestinatario = async (
    destinatario: DestinatarioWhatsapp,
  ) => {
    if (!telefoneWhatsappValido(telefoneDestinatarioEmEdicao)) {
      setErroEdicaoDestinatario(
        "Informe um número de WhatsApp válido com DDD.",
      );
      return;
    }
    if (telefoneJaCadastrado(telefoneDestinatarioEmEdicao, destinatario.id)) {
      setErroEdicaoDestinatario(
        "Este telefone já está cadastrado para receber notificações.",
      );
      return;
    }

    try {
      const atualizado = await atualizarDestinatarioWhatsapp(destinatario.id, {
        nome: destinatario.nome,
        telefoneWhatsapp: telefoneDestinatarioEmEdicao,
        ativo: destinatario.ativo,
      });
      setDestinatarios((atuais) =>
        atuais.map((item) => (item.id === atualizado.id ? atualizado : item)),
      );
      cancelarEdicaoDestinatario();
      toast.success("Telefone atualizado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o destinatário.",
      );
    }
  };

  const handleSituacaoDestinatario = async (destinatario: DestinatarioWhatsapp, ativo: boolean) => {
    try {
      const atualizado = await atualizarDestinatarioWhatsapp(destinatario.id, {
        nome: destinatario.nome,
        telefoneWhatsapp: destinatario.telefoneWhatsapp,
        ativo,
      });
      setDestinatarios((atuais) => atuais.map((item) => item.id === atualizado.id ? atualizado : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o destinatário.");
    }
  };

  const handleTesteDestinatario = async (destinatario: DestinatarioWhatsapp) => {
    setDestinatarioEmTesteId(destinatario.id);
    try {
      await enviarMensagemTeste(destinatario.nome, destinatario.telefoneWhatsapp);
      setHistorico(await getHistoricoNotificacoes());
      toast.success(`Mensagem de teste enviada para ${destinatario.nome}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem de teste.",
      );
    } finally {
      setDestinatarioEmTesteId(null);
    }
  };

  const handleRemoverDestinatario = async (destinatario: DestinatarioWhatsapp) => {
    try {
      await removerDestinatarioWhatsapp(destinatario.id);
      setDestinatarios((atuais) => atuais.filter((item) => item.id !== destinatario.id));
      toast.success("Destinatário removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o destinatário.");
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl py-6 sm:py-8">
        <ListPageHeader
          title="Notificações"
          tooltip="Nesta página são configurados a pessoa responsável e o número de WhatsApp que receberá os avisos automáticos enviados pelo Sistema Aurit. Esses avisos ajudam a acompanhar prazos, vencimentos, aniversários e outras informações importantes registradas no sistema."
          objective="Defina quem será responsável pelo recebimento das notificações e mantenha atualizado o número de WhatsApp utilizado para receber os avisos automáticos do Sistema Aurit."
        />

        {carregando ? (
          <div className="flex items-center justify-center gap-2 rounded-[18px] border border-border/70 bg-card/70 px-6 py-14 text-sm text-muted-foreground backdrop-blur-md">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando
            configurações de notificações...
          </div>
        ) : erroCarregamento ? (
          <div className="flex flex-col items-center gap-3 rounded-[18px] border border-border/70 bg-card/70 px-6 py-12 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-foreground">
              Não foi possível carregar as configurações de notificações.
            </p>
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 gap-2 px-4"
              onClick={() => void carregar()}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <FormSectionCard
              icon={MessageCircle}
              title="WhatsApp para notificações"
              description="Defina a pessoa responsável pelo acompanhamento das notificações e informe o número de WhatsApp que receberá os avisos automáticos enviados pelo Sistema Aurit."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor="nome-responsavel"
                    required
                    tooltip={TOOLTIP_NOME}
                  >
                    Nome do Responsável
                  </FieldLabel>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="nome-responsavel"
                      value={nomeResponsavel}
                      onChange={(event) => {
                        setNomeResponsavel(event.target.value);
                        if (erroNome) setErroNome(null);
                      }}
                      maxLength={120}
                      aria-invalid={erroNome ? true : undefined}
                      aria-describedby={erroNome ? "erro-nome" : undefined}
                      className="pl-9"
                    />
                  </div>
                  {erroNome && (
                    <p
                      id="erro-nome"
                      className="mt-1.5 text-[12.5px] text-destructive"
                    >
                      {erroNome}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel htmlFor="telefone-destinatario" tooltip={TOOLTIP_TELEFONE}>
                    Adicionar telefone
                  </FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Smartphone
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="telefone-destinatario"
                        value={telefoneDestinatario}
                        inputMode="tel"
                        onChange={(event) => {
                          setTelefoneDestinatario(maskPhone(event.target.value));
                          if (erroTelefoneDestinatario) {
                            setErroTelefoneDestinatario(null);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAdicionarDestinatario();
                          }
                        }}
                        placeholder="(00) 00000-0000"
                        aria-invalid={erroTelefoneDestinatario ? true : undefined}
                        aria-describedby={
                          erroTelefoneDestinatario
                            ? "erro-telefone-destinatario"
                            : undefined
                        }
                        className="pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-10 shrink-0 gap-1.5 px-3.5"
                      onClick={() => void handleAdicionarDestinatario()}
                      disabled={salvandoDestinatario}
                    >
                      {salvandoDestinatario ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Plus className="h-4 w-4" aria-hidden />
                      )}
                      Adicionar telefone
                    </Button>
                  </div>
                  {erroTelefoneDestinatario && (
                    <p
                      id="erro-telefone-destinatario"
                      className="mt-1.5 text-[12.5px] text-destructive"
                    >
                      {erroTelefoneDestinatario}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-semibold text-foreground">
                    Telefones que recebem notificações
                  </h3>
                  {(telefoneWhatsappValido(telefone) || destinatarios.length > 0) && (
                    <span className="text-[12px] text-muted-foreground">
                      {destinatarios.length + (telefoneWhatsappValido(telefone) ? 1 : 0)} cadastrado
                      {destinatarios.length + (telefoneWhatsappValido(telefone) ? 1 : 0) > 1
                        ? "s"
                        : ""}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  {!telefoneWhatsappValido(telefone) && destinatarios.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-[13px] border border-dashed border-border/70 bg-muted/20 px-5 py-7 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground">
                        <Smartphone className="h-[17px] w-[17px]" aria-hidden />
                      </span>
                      <p className="text-[13px] font-medium text-foreground">
                        Nenhum telefone cadastrado para receber notificações por WhatsApp.
                      </p>
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="mt-1 h-9 gap-1.5 px-3.5"
                        onClick={() => document.getElementById("telefone-destinatario")?.focus()}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Adicionar o primeiro número
                      </Button>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2" aria-label="Telefones cadastrados">
                      {telefoneWhatsappValido(telefone) && (
                        <li className="rounded-[13px] border border-border/60 bg-card/70 px-3.5 py-2.5 backdrop-blur-sm">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                            {editandoTelefonePrincipal ? (
                              <div className="min-w-0 flex-1 sm:max-w-[240px]">
                                <label className="sr-only" htmlFor="editar-telefone-principal">
                                  Editar telefone principal
                                </label>
                                <Input
                                  id="editar-telefone-principal"
                                  value={telefone}
                                  inputMode="tel"
                                  autoFocus
                                  onChange={(event) => {
                                    setTelefone(maskPhone(event.target.value));
                                    if (erroEdicaoPrincipal) setErroEdicaoPrincipal(null);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      salvarTelefonePrincipal();
                                    }
                                    if (event.key === "Escape") {
                                      setEditandoTelefonePrincipal(false);
                                      setErroEdicaoPrincipal(null);
                                    }
                                  }}
                                  aria-invalid={erroEdicaoPrincipal ? true : undefined}
                                  className="h-9"
                                />
                                {erroEdicaoPrincipal && (
                                  <p className="mt-1.5 text-[12.5px] text-destructive">
                                    {erroEdicaoPrincipal}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex min-w-0 items-center gap-2.5">
                                <Smartphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                <span className="text-[13.5px] font-medium text-foreground">
                                  {formatarTelefoneWhatsapp(telefone)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">Principal</span>
                                <StatusPill status={ativo ? "ATIVO" : "INATIVO"} />
                              </div>
                            )}
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              {editandoTelefonePrincipal ? (
                                <>
                                  <Button type="button" variant="glassPrimary" className="h-8 px-3 text-[12.5px]" onClick={salvarTelefonePrincipal}>
                                    Salvar
                                  </Button>
                                  <Button type="button" variant="ghost" className="h-8 gap-1 px-2.5 text-[12.5px]" onClick={() => { setEditandoTelefonePrincipal(false); setErroEdicaoPrincipal(null); }}>
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Switch checked={ativo} onCheckedChange={setAtivo} aria-label={`${ativo ? "Desativar" : "Ativar"} notificações para ${formatarTelefoneWhatsapp(telefone)}`} />
                                  <Button type="button" variant="glassSecondary" className="h-8 gap-1.5 px-2.5 text-[12.5px]" onClick={() => void handleTeste()} disabled={testando} aria-busy={testando}>
                                    {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
                                    {testando ? "Enviando..." : "Testar"}
                                  </Button>
                                  <Button type="button" variant="ghost" className="h-8 gap-1 px-2.5 text-[12.5px]" onClick={() => setEditandoTelefonePrincipal(true)}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                    Editar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      )}
                      {destinatarios.map((destinatario) => (
                    <li key={destinatario.id} className="rounded-[13px] border border-border/60 bg-card/70 px-3.5 py-2.5 backdrop-blur-sm">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        {destinatarioEmEdicaoId === destinatario.id ? (
                          <>
                            <label className="sr-only" htmlFor={`editar-destinatario-${destinatario.id}`}>
                              Editar telefone adicional
                            </label>
                            <Input
                              id={`editar-destinatario-${destinatario.id}`}
                              value={telefoneDestinatarioEmEdicao}
                              inputMode="tel"
                              autoFocus
                              onChange={(event) => {
                                setTelefoneDestinatarioEmEdicao(maskPhone(event.target.value));
                                if (erroEdicaoDestinatario) setErroEdicaoDestinatario(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleSalvarEdicaoDestinatario(destinatario);
                                }
                                if (event.key === "Escape") cancelarEdicaoDestinatario();
                              }}
                              aria-invalid={erroEdicaoDestinatario ? true : undefined}
                              className="h-9 max-w-[260px]"
                            />
                            {erroEdicaoDestinatario && (
                              <p className="mt-1.5 text-[12.5px] text-destructive">
                                {erroEdicaoDestinatario}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Smartphone className="h-3.5 w-3.5" aria-hidden />
                            {formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {destinatarioEmEdicaoId === destinatario.id ? (
                          <>
                            <Button
                              type="button"
                              variant="glassSecondary"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => void handleSalvarEdicaoDestinatario(destinatario)}
                            >
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 px-2.5"
                              onClick={cancelarEdicaoDestinatario}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <StatusPill status={destinatario.ativo ? "ATIVO" : "INATIVO"} />
                            <Switch
                              checked={destinatario.ativo}
                              onCheckedChange={(ativo) => void handleSituacaoDestinatario(destinatario, ativo)}
                              aria-label={destinatario.ativo ? `Desativar ${formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp)}` : `Ativar ${formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp)}`}
                            />
                            <Button
                              type="button"
                              variant="glassSecondary"
                              size="sm"
                              className="h-8 gap-1.5 px-2.5"
                              onClick={() => void handleTesteDestinatario(destinatario)}
                              disabled={destinatarioEmTesteId === destinatario.id}
                              aria-busy={destinatarioEmTesteId === destinatario.id}
                            >
                              {destinatarioEmTesteId === destinatario.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Send className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Testar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => iniciarEdicaoDestinatario(destinatario)}
                              aria-label={`Editar ${formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp)}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => void handleRemoverDestinatario(destinatario)}
                              aria-label={`Remover ${formatarTelefoneWhatsapp(destinatario.telefoneWhatsapp)}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </>
                        )}
                      </div>
                      </div>
                    </li>
                      ))}
                    </ul>
                  )}
                </div>
                {feedbackTeste && (
                  <p
                    role="status"
                    className={`mt-3 flex items-start gap-2 rounded-[11px] border px-3 py-2 text-[12.5px] leading-relaxed ${feedbackTeste.tipo === "ok" ? "border-border/60 bg-muted/25 text-foreground" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
                  >
                    {feedbackTeste.tipo === "ok" && (
                      <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {feedbackTeste.texto}
                  </p>
                )}
              </div>
            </FormSectionCard>

            <section
              aria-labelledby="titulo-envios"
              className="wa-accent-surface rounded-[18px] p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  className="wa-icon-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  aria-hidden
                >
                  <MessageCircle
                    className="h-[18px] w-[18px]"
                    strokeWidth={2.1}
                  />
                </span>
                <div className="min-w-0">
                  <h2
                    id="titulo-envios"
                    className="text-sm font-semibold leading-tight text-foreground"
                  >
                    Como os envios automáticos funcionam
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {planoGratuito
                      ? "No plano gratuito, o WhatsApp recebe avisos de aniversários e de três faltas consecutivas. Alertas de documentos, empréstimos e editais estão disponíveis no plano pago."
                      : "Quando o número estiver ativo, o Sistema Aurit enviará automaticamente as notificações para o WhatsApp informado, de acordo com os prazos definidos para cada tipo de acompanhamento."}
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {avisosDisponiveis.map((aviso) => (
                  <li
                    key={aviso.titulo}
                    className="wa-accent-item rounded-[13px] px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <aviso.icon
                        className="h-4 w-4 shrink-0 text-primary"
                        strokeWidth={2.1}
                        aria-hidden
                      />
                      <h3 className="text-[13.5px] font-semibold text-foreground">
                        {aviso.titulo}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {aviso.descricao}
                    </p>
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Prazo
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {aviso.prazos.map((prazo) => (
                          <li
                            key={prazo}
                            className="rounded-full border border-border/60 bg-background/60 px-2.5 py-[3px] text-[11.5px] font-medium text-foreground/80"
                          >
                            {prazo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-border/50 pt-4">
                <h3 className="text-[13.5px] font-semibold text-foreground">
                  Exemplo de notificação
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  Veja como um aviso poderá chegar no WhatsApp informado.
                </p>
                <div className="mt-3 flex items-start gap-2.5">
                  <span
                    className="wa-icon-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    aria-hidden
                  >
                    <MessageCircle
                      className="h-[14px] w-[14px]"
                      strokeWidth={2.2}
                    />
                  </span>
                  <div className="wa-bubble max-w-md rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5">
                    <p className="text-[13px] leading-relaxed">
                      Olá, {primeiroNome}! O documento Certidão Negativa
                      Municipal vence no dia 05/09/2026. Atualize-o no Sistema
                      Aurit.
                    </p>
                    <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] opacity-70">
                      08:00 <CheckCircle2 className="h-3 w-3" aria-hidden />
                      <span className="sr-only">Mensagem entregue</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <FormSectionCard
              icon={History}
              title="Últimas notificações"
              description="Acompanhe os envios automáticos mais recentes realizados pelo sistema."
            >
              {historico.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                    <BellRing className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Nenhuma notificação foi enviada até o momento.
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                      Quando os avisos automáticos começarem a ser enviados,
                      eles aparecerão aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-[13px] border border-border/60 md:block">
                    <table className="w-full text-left text-[13px]">
                      <caption className="sr-only">
                        Últimas notificações enviadas pelo sistema
                      </caption>
                      <thead className="bg-muted/30 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Data
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Notificação
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Referência
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Situação
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-border/50"
                          >
                            <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                              {formatarDataEnvio(
                                item.dataEnvio ?? item.dataTentativa,
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {item.tipoNotificacaoDescricao}
                            </td>
                            <td className="px-4 py-2.5 text-foreground/85">
                              {item.referencia}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusPill status={item.situacao} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul
                    className="flex flex-col gap-2.5 md:hidden"
                    aria-label="Últimas notificações"
                  >
                    {historico.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-[13px] border border-border/60 bg-card/70 px-4 py-3 backdrop-blur-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-foreground">
                              {item.tipoNotificacaoDescricao}
                            </p>
                            <p className="mt-0.5 break-words text-[12.5px] text-foreground/85">
                              {item.referencia}
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {formatarDataEnvio(
                                item.dataEnvio ?? item.dataTentativa,
                              )}
                            </p>
                          </div>
                          <StatusPill status={item.situacao} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </FormSectionCard>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassPrimary"
                className="h-9 w-full px-5 sm:w-auto"
                onClick={() => void handleSalvar()}
                disabled={salvando}
                aria-busy={salvando}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <WikiFloatingButton
        pageTitle="Notificações"
        href="/wiki/configuracoes/notificacoes"
      />
    </AppLayout>
  );
}

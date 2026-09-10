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
  RotateCcw,
  Send,
  Smartphone,
  User,
  UserX,
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
import { FieldTooltip } from "@/components/FieldTooltip";
import { maskPhone } from "@/lib/masks";
import { isPlanoGratuitoAtual } from "@/lib/plano";
import {
  enviarMensagemTeste,
  formatarDataEnvio,
  formatarTelefoneWhatsapp,
  getConfiguracaoWhatsapp,
  getHistoricoNotificacoes,
  salvarConfiguracaoWhatsapp,
  telefoneWhatsappValido,
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
  const [feedbackTeste, setFeedbackTeste] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);
  const [historico, setHistorico] = useState<NotificacaoEnviada[]>([]);
  const [planoGratuito, setPlanoGratuito] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento(false);
    try {
      const [config, notificacoes, gratuito] = await Promise.all([
        getConfiguracaoWhatsapp(),
        getHistoricoNotificacoes(),
        isPlanoGratuitoAtual(),
      ]);
      setNomeResponsavel(config.nomeResponsavel ?? "");
      setTelefone(formatarTelefoneWhatsapp(config.telefoneWhatsapp));
      setAtivo(Boolean(config.ativo));
      setHistorico(notificacoes);
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
                  <FieldLabel
                    htmlFor="telefone-whatsapp"
                    required
                    tooltip={TOOLTIP_TELEFONE}
                  >
                    Número do WhatsApp
                  </FieldLabel>
                  <div className="relative">
                    <Smartphone
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="telefone-whatsapp"
                      value={telefone}
                      inputMode="tel"
                      onChange={(event) => {
                        setTelefone(maskPhone(event.target.value));
                        if (erroTelefone) setErroTelefone(null);
                      }}
                      aria-invalid={erroTelefone ? true : undefined}
                      aria-describedby={
                        erroTelefone ? "erro-telefone" : undefined
                      }
                      className="pl-9"
                    />
                  </div>
                  {erroTelefone && (
                    <p
                      id="erro-telefone"
                      className="mt-1.5 text-[12.5px] text-destructive"
                    >
                      {erroTelefone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-[13px] border border-border/60 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <FieldLabel htmlFor="situacao-whatsapp">Situação</FieldLabel>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {ativo
                      ? planoGratuito
                        ? "Este número está ativo para receber avisos de aniversários e de três faltas consecutivas."
                        : "Este número está ativo para receber os avisos automáticos disponíveis no plano da organização."
                      : "Este número está inativo e não receberá nenhuma notificação."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <StatusPill status={ativo ? "ATIVO" : "INATIVO"} />
                  <Switch
                    id="situacao-whatsapp"
                    checked={ativo}
                    onCheckedChange={setAtivo}
                    aria-label={
                      ativo
                        ? "Número ativo para receber notificações"
                        : "Número inativo"
                    }
                  />
                  <FieldTooltip
                    text={
                      planoGratuito
                        ? "No plano gratuito, este número recebe avisos de aniversários e de três faltas consecutivas. Alertas de documentos, empréstimos e editais requerem o plano pago."
                        : "Quando estiver ativo, este número recebe os avisos automáticos disponíveis no plano da organização."
                    }
                    fieldLabel="Situação"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                  Use este recurso para confirmar se o número informado está
                  configurado corretamente e pode receber as notificações
                  enviadas pelo Sistema Aurit.
                </p>
                <Button
                  type="button"
                  variant="glassSecondary"
                  className="h-10 w-full gap-2 px-4 sm:w-auto"
                  onClick={() => void handleTeste()}
                  disabled={testando}
                  aria-busy={testando}
                >
                  {testando ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                  {testando ? "Enviando..." : "Enviar mensagem de teste"}
                </Button>
              </div>
              {feedbackTeste && (
                <p
                  role="status"
                  className={`mt-3 flex items-start gap-2 rounded-[11px] border px-3 py-2 text-[12.5px] leading-relaxed ${feedbackTeste.tipo === "ok" ? "border-border/60 bg-muted/25 text-foreground" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
                >
                  {feedbackTeste.tipo === "ok" && (
                    <CheckCircle2
                      className="mt-[1px] h-4 w-4 shrink-0"
                      aria-hidden
                    />
                  )}
                  {feedbackTeste.texto}
                </p>
              )}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  HandHeart,
  UserRound,
  Coins,
  Target,
  Paperclip,
  StickyNote,
  Info,
  Upload,
  X,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { HelpTooltip } from "@/components/HelpTooltip";
import { ImportDataButton } from "@/components/ImportDataButton";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { maskMoney } from "@/data/contasReceber";
import { nomeBancoLabel } from "@/data/contasBancarias";
import {
  doacaoTooltip,
  tiposDoacao,
  statusDoacaoOptions,
  tiposComQuantidadeObrigatoria,
  valorFormatado,
  getDoacaoById,
  getDoacaoOptions,
  getDoacaoDownloadUrl,
  saveDoacao,
  type DoacaoPayload,
  type TipoDoacao,
  type StatusDoacao,
  type Option,
} from "@/data/doacoes";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";
import { toastSuccessNext } from "@/lib/nextStepToast";
import { getImportConfigForPath } from "@/config/importacoes";
import { useImportFormFill } from "@/hooks/useImportFormFill";

const MAX_FILE_MB = 10;
const SEM_VINCULO = "__nenhum__";
const SELECIONE = "__selecione__";

interface FormState {
  nomeDoacao: string;
  tipoDoacao: TipoDoacao | "";
  dataDoacao: string;
  descricaoDoacao: string;
  valorDoacao: string;
  quantidade: string;
  unidadeMedida: string;
  urlComprovante: string;
  observacao: string;
  statusDoacao: StatusDoacao | "";
  organizacao: string;
  doador: string;
  projeto: string;
  atividade: string;
  eventoCultural: string;
  contaBancaria: string;
}

interface DestinacaoCarregada {
  projeto: string;
  atividade: string;
  eventoCultural: string;
}

const initial: FormState = {
  nomeDoacao: "",
  tipoDoacao: "",
  dataDoacao: "",
  descricaoDoacao: "",
  valorDoacao: "",
  quantidade: "",
  unidadeMedida: "",
  urlComprovante: "",
  observacao: "",
  statusDoacao: "",
  organizacao: "",
  doador: "",
  projeto: "",
  atividade: "",
  eventoCultural: "",
  contaBancaria: "",
};

export default function DoacaoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isView = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && !isView;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(initial);
  /** Vínculo financeiro já existente (criado pelo backend). */
  const [contasReceber, setContasReceber] = useState<string | undefined>();
  const [tipoOriginal, setTipoOriginal] = useState<TipoDoacao | "">("");
  const [doadorCarregado, setDoadorCarregado] = useState<Option | null>(null);
  const [doadores, setDoadores] = useState<Option[]>([]);
  const [projetos, setProjetos] = useState<Option[]>([]);
  const [atividades, setAtividades] = useState<Option[]>([]);
  const [eventos, setEventos] = useState<Option[]>([]);
  const [destinacaoCarregada, setDestinacaoCarregada] =
    useState<DestinacaoCarregada>({
      projeto: "",
      atividade: "",
      eventoCultural: "",
    });
  const [contasBancarias, setContasBancarias] = useState<Option[]>([]);
  const [comprovanteFile, setComprovanteFile] = useState<File>();
  const [removerComprovante, setRemoverComprovante] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  useImportFormFill("doacoes", setForm);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getDoacaoOptions(),
      id ? getDoacaoById(id) : Promise.resolve(null),
    ])
      .then(([options, found]) => {
        if (!active) return;
        setDoadores(options.doadores);
        setProjetos(options.projetos);
        setAtividades(options.atividades);
        setEventos(options.eventos);
        setContasBancarias(options.contasBancarias);
        if (found) {
          const incluirOpcaoVinculada = (
            opcoes: Option[],
            vinculoId: string,
            nome: string | undefined,
            projetoId?: string,
          ) =>
            vinculoId && !opcoes.some((opcao) => opcao.id === vinculoId)
              ? [
                  ...opcoes,
                  {
                    id: vinculoId,
                    nome: nome?.trim() || `Registro ${vinculoId}`,
                    projetoId,
                  },
                ]
              : opcoes;
          setProjetos(
            incluirOpcaoVinculada(
              options.projetos,
              found.projeto,
              found.nomeProjeto,
            ),
          );
          setAtividades(
            incluirOpcaoVinculada(
              options.atividades,
              found.atividade,
              found.nomeAtividade,
              found.projeto,
            ),
          );
          setEventos(
            incluirOpcaoVinculada(
              options.eventos,
              found.eventoCultural,
              found.nomeEventoCultural,
              found.projeto,
            ),
          );
          setDestinacaoCarregada({
            projeto: found.nomeProjeto ?? "",
            atividade: found.nomeAtividade ?? "",
            eventoCultural: found.nomeEventoCultural ?? "",
          });
          const doadorResolvido =
            found.doador ||
            options.doadores.find(
              (doador) =>
                found.nomeDoador?.trim() &&
                doador.nome
                  .trim()
                  .localeCompare(found.nomeDoador.trim(), "pt-BR", {
                    sensitivity: "base",
                  }) === 0,
            )?.id ||
            "";
          const opcaoDoador = doadorResolvido
            ? {
                id: doadorResolvido,
                nome:
                  found.nomeDoador?.trim() ||
                  options.doadores.find(
                    (doador) => doador.id === doadorResolvido,
                  )?.nome ||
                  `Doador ${doadorResolvido}`,
              }
            : null;
          setDoadorCarregado(opcaoDoador);
          if (
            opcaoDoador &&
            !options.doadores.some((doador) => doador.id === doadorResolvido)
          ) {
            setDoadores((prev) => [...prev, opcaoDoador]);
          }
          setForm({
            nomeDoacao: found.nomeDoacao,
            tipoDoacao: found.tipoDoacao,
            dataDoacao: found.dataDoacao,
            descricaoDoacao: found.descricaoDoacao,
            valorDoacao: found.valorDoacao,
            quantidade: found.quantidade,
            unidadeMedida: found.unidadeMedida,
            urlComprovante: found.urlComprovante,
            observacao: found.observacao,
            statusDoacao: found.statusDoacao,
            organizacao: found.organizacao,
            doador: doadorResolvido,
            projeto: found.projeto,
            atividade: found.atividade,
            eventoCultural: found.eventoCultural,
            contaBancaria: found.contaBancaria,
          });
          setContasReceber(found.contasReceber || undefined);
          setTipoOriginal(found.tipoDoacao);
        }
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar doação.",
        );
        navigate("/doacoes");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    if (isView) return;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const setTipo = (t: TipoDoacao) => {
    if (isView) return;
    setForm((p) => ({
      ...p,
      tipoDoacao: t,
      quantidade: t === "FINANCEIRA" ? "" : p.quantidade,
      unidadeMedida: t === "FINANCEIRA" ? "" : p.unidadeMedida,
    }));
  };

  const atividadeOptions = useMemo(
    () =>
      atividades.filter(
        (item) =>
          !form.projeto || !item.projetoId || item.projetoId === form.projeto,
      ),
    [atividades, form.projeto],
  );

  const eventoPertenceAoProjeto = (evento: Option, projetoId: string) =>
    !projetoId ||
    !evento.projetosIds?.length ||
    evento.projetosIds.includes(projetoId);

  const eventoOptionsFiltrados = useMemo(
    () =>
      eventos.filter((evento) => eventoPertenceAoProjeto(evento, form.projeto)),
    [eventos, form.projeto],
  );

  const incluirVinculoSelecionado = (
    opcoes: Option[],
    vinculoId: string,
    nome: string,
    projetoId?: string,
  ) =>
    vinculoId && !opcoes.some((opcao) => opcao.id === vinculoId)
      ? [
          ...opcoes,
          { id: vinculoId, nome: nome || `Registro ${vinculoId}`, projetoId },
        ]
      : opcoes;

  // As opções podem ser filtradas ou carregadas após a doação. Mantemos o
  // vínculo já salvo na lista de renderização para ele nunca voltar a parecer
  // "Sem vínculo" durante a edição ou visualização.
  const projetoOptions = useMemo(
    () =>
      incluirVinculoSelecionado(
        projetos,
        form.projeto,
        destinacaoCarregada.projeto,
      ),
    [projetos, form.projeto, destinacaoCarregada.projeto],
  );
  const atividadeOptionsComVinculo = useMemo(
    () =>
      incluirVinculoSelecionado(
        atividadeOptions,
        form.atividade,
        destinacaoCarregada.atividade,
        form.projeto,
      ),
    [
      atividadeOptions,
      form.atividade,
      destinacaoCarregada.atividade,
      form.projeto,
    ],
  );
  const eventoOptions = useMemo(
    () =>
      incluirVinculoSelecionado(
        eventoOptionsFiltrados,
        form.eventoCultural,
        destinacaoCarregada.eventoCultural,
        form.projeto,
      ),
    [
      eventoOptionsFiltrados,
      form.eventoCultural,
      destinacaoCarregada.eventoCultural,
      form.projeto,
    ],
  );
  const nomeDaOpcao = (opcoes: Option[], vinculoId: string, fallback: string) =>
    opcoes.find((opcao) => opcao.id === vinculoId)?.nome || fallback;
  const projetoExibido = nomeDaOpcao(
    projetoOptions,
    form.projeto,
    destinacaoCarregada.projeto,
  );
  const atividadeExibida = nomeDaOpcao(
    atividadeOptionsComVinculo,
    form.atividade,
    destinacaoCarregada.atividade,
  );
  const eventoExibido = nomeDaOpcao(
    eventoOptions,
    form.eventoCultural,
    destinacaoCarregada.eventoCultural,
  );

  // Mantém o vínculo retornado pela doação como fonte de verdade durante a
  // edição, inclusive quando a lista de opções é carregada sem esse registro.
  const doadorSelectValue = form.doador || doadorCarregado?.id || "";

  const isFinanceira = form.tipoDoacao === "FINANCEIRA";
  const quantidadeObrigatoria =
    !!form.tipoDoacao &&
    tiposComQuantidadeObrigatoria.includes(form.tipoDoacao as TipoDoacao);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size / (1024 * 1024) > MAX_FILE_MB) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      e.target.value = "";
      return;
    }
    set("urlComprovante", file.name);
    setComprovanteFile(file);
    setRemoverComprovante(false);
  };

  const removeArquivo = () => {
    if (isView) return;
    set("urlComprovante", "");
    setComprovanteFile(undefined);
    setRemoverComprovante(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const abrirComprovante = async (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    if (!id) return;
    try {
      window.location.href = await getDoacaoDownloadUrl(id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir comprovante.",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeDoacao.trim())
      return toast.error("Informe o nome da doação.");
    if (!form.tipoDoacao) return toast.error("Selecione o tipo de doação.");
    if (!form.dataDoacao) return toast.error("Informe a data da doação.");
    if (!form.descricaoDoacao.trim()) return toast.error("Descreva a doação.");
    if (!doadorSelectValue) return toast.error("Selecione o doador.");
    if (!form.statusDoacao)
      return toast.error("Selecione a situação da doação.");

    if (isFinanceira && !form.valorDoacao.trim())
      return toast.error("Informe o valor da doação financeira.");
    if (isFinanceira && form.statusDoacao === "RECEBIDA" && !form.contaBancaria)
      return toast.error(
        "Selecione a conta bancária em que a doação foi recebida.",
      );
    if (quantidadeObrigatoria && !form.quantidade.trim())
      return toast.error("Informe a quantidade doada.");
    if (quantidadeObrigatoria && !form.unidadeMedida.trim())
      return toast.error("Informe a unidade de medida da doação.");

    // Alteração de tipo com registro financeiro existente: confirmação explícita.
    if (
      isEdit &&
      contasReceber &&
      tipoOriginal === "FINANCEIRA" &&
      !isFinanceira
    ) {
      const confirmar = window.confirm(
        "Esta doação possui um recebimento relacionado no Financeiro. Ao alterar o tipo, o registro financeiro será tratado conforme as regras do Financeiro. Deseja continuar?",
      );
      if (!confirmar) return;
    }

    try {
      setSaving(true);
      const payload: DoacaoPayload = {
        id,
        nomeDoacao: form.nomeDoacao,
        tipoDoacao: form.tipoDoacao as TipoDoacao,
        dataDoacao: form.dataDoacao,
        descricaoDoacao: form.descricaoDoacao,
        valorDoacao: form.valorDoacao,
        quantidade: form.quantidade,
        unidadeMedida: form.unidadeMedida,
        urlComprovante: form.urlComprovante,
        observacao: form.observacao,
        statusDoacao: form.statusDoacao as StatusDoacao,
        organizacao: form.organizacao,
        doador: doadorSelectValue,
        contasReceber: contasReceber ?? "",
        contaBancaria: form.contaBancaria,
        projeto: form.projeto,
        atividade: form.atividade,
        eventoCultural: form.eventoCultural,
        comprovanteFile,
        removerComprovante,
      };

      const salva = await saveDoacao(payload);
      const mensagem = isEdit ? "Doação atualizada." : "Doação cadastrada.";
      if (isFinanceira && salva.contasReceber)
        toastSuccessNext(mensagem, navigate, "/doacoes", {
          label: "Ver conta a receber",
          to: `/contas-receber/${salva.contasReceber}`,
        });
      else {
        if (!isEdit) emitJourneyNextStep();
        toastSuccessNext(mensagem, navigate, "/doacoes");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar doação.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton />
        <header className="mb-5 border-b border-border pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {isView ? "Doações" : isEdit ? "Doações" : "Doações"}
              </h1>
              <HelpTooltip
                text={doacaoTooltip}
                label="Doações"
                size="md"
                side="bottom"
                align="start"
                contentClassName="max-w-[calc(100vw-32px)] sm:max-w-[300px] px-2.5 py-1.5 text-xs leading-relaxed"
              />
            </div>
            {!isView && (
              <div className="flex flex-wrap items-center gap-2">
                <ImportDataButton
                  config={getImportConfigForPath("/doacoes")!}
                  canFillForm
                  variant="glassSecondary"
                />
              </div>
            )}
          </div>
        </header>

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={isView || loading || saving}
            className={`m-0 min-w-0 space-y-5 border-0 p-0 ${isView ? "pointer-events-none" : ""}`}
          >
            {/* 1 — Identificação da doação */}
            <FormSectionCard
              icon={HandHeart}
              title="Identificação da doação"
              description="Registre quem realizará a contribuição e as informações necessárias para identificar e compreender esta doação."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor="doador"
                    required
                    tooltip="Selecione o doador responsável por esta contribuição. Os dados de identificação e contato são mantidos no cadastro de Doadores."
                  >
                    Doador
                  </FieldLabel>

                  <Select
                    value={doadorSelectValue}
                    onValueChange={(v) => set("doador", v)}
                  >
                    <SelectTrigger id="doador">
                      <SelectValue placeholder="Selecione o doador" />
                    </SelectTrigger>

                    <SelectContent>
                      {doadores.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel
                    htmlFor="tipoDoacao"
                    required
                    tooltip="Selecione o tipo de contribuição realizada ou prevista, como doação financeira, material, serviço, equipamento ou alimento."
                  >
                    Tipo de Doação
                  </FieldLabel>

                  <Select
                    value={form.tipoDoacao}
                    onValueChange={(v) => setTipo(v as TipoDoacao)}
                  >
                    <SelectTrigger id="tipoDoacao">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>

                    <SelectContent>
                      {tiposDoacao.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel
                    htmlFor="nomeDoacao"
                    required
                    tooltip="Informe um nome curto e claro que permita reconhecer facilmente esta doação. Ex.: Doação para manutenção das oficinas ou Doação de materiais escolares."
                  >
                    Nome da Doação
                  </FieldLabel>

                  <Input
                    id="nomeDoacao"
                    value={form.nomeDoacao}
                    onChange={(e) => set("nomeDoacao", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel
                    htmlFor="dataDoacao"
                    required
                    tooltip="Informe a data prevista para a doação ou, quando ela já tiver ocorrido, a data em que foi efetivamente realizada."
                  >
                    Data da Doação
                  </FieldLabel>

                  <Input
                    id="dataDoacao"
                    type="date"
                    value={form.dataDoacao}
                    onChange={(e) => set("dataDoacao", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel
                    htmlFor="descricaoDoacao"
                    required
                    tooltip="Descreva o que está sendo doado e informe características importantes que ajudem a compreender a contribuição, como quantidade, finalidade, condições ou composição."
                  >
                    Descrição da Doação
                  </FieldLabel>

                  <Textarea
                    id="descricaoDoacao"
                    rows={3}
                    value={form.descricaoDoacao}
                    onChange={(e) => set("descricaoDoacao", e.target.value)}
                  />
                </div>
              </div>
            </FormSectionCard>

            {/* 2 — Valor da doação — somente financeira */}
            {form.tipoDoacao === "FINANCEIRA" && (
              <FormSectionCard
                icon={Coins}
                title="Valor da doação"
                description="Registre o valor da contribuição financeira para que seu recebimento possa ser acompanhado também nas rotinas financeiras da Aurit."
              >
                <div className="space-y-4">
                  <div className="sm:max-w-xs">
                    <FieldLabel
                      htmlFor="valorDoacao"
                      required
                      tooltip="Informe o valor da contribuição financeira realizada ou prevista."
                    >
                      Valor da Doação
                    </FieldLabel>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                        R$
                      </span>

                      <Input
                        id="valorDoacao"
                        inputMode="numeric"
                        value={form.valorDoacao}
                        onChange={(e) =>
                          set("valorDoacao", maskMoney(e.target.value))
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <InfoBlock>
                    A doação financeira será integrada automaticamente ao
                    Financeiro. Enquanto estiver pendente, ficará registrada
                    como valor a receber. Quando for recebida, o recebimento
                    será registrado na conta bancária informada.
                  </InfoBlock>
                </div>
              </FormSectionCard>
            )}

            {/* 3 — Detalhes da contribuição — somente não financeira */}
            {form.tipoDoacao && !isFinanceira && (
              <FormSectionCard
                icon={Coins}
                title="Detalhes da contribuição"
                description="Registre a quantidade da contribuição e, quando possível, seu valor aproximado para manter uma referência do que será ou foi recebido pela organização."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel
                      htmlFor="quantidade"
                      required={quantidadeObrigatoria}
                      tooltip="Informe a quantidade correspondente à doação, de acordo com a forma utilizada para medi-la. Ex.: 50 unidades, 20 kg, 10 horas ou 5 caixas."
                    >
                      Quantidade
                    </FieldLabel>

                    <Input
                      id="quantidade"
                      inputMode="decimal"
                      value={form.quantidade}
                      onChange={(e) =>
                        set(
                          "quantidade",
                          e.target.value.replace(/[^\d.,]/g, ""),
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor="unidadeMedida"
                      required={quantidadeObrigatoria}
                      tooltip="Informe como a quantidade da doação é medida. Ex.: unidades, peças, quilos, litros, caixas, cestas ou horas."
                    >
                      Unidade de Medida
                    </FieldLabel>

                    <Input
                      id="unidadeMedida"
                      value={form.unidadeMedida}
                      onChange={(e) => set("unidadeMedida", e.target.value)}
                    />
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor="valorEstimado"
                      tooltip="Informe, quando possível, o valor aproximado desta doação. O preenchimento é opcional e serve como referência para a organização."
                    >
                      Valor Estimado
                    </FieldLabel>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                        R$
                      </span>

                      <Input
                        id="valorEstimado"
                        inputMode="numeric"
                        value={form.valorDoacao}
                        onChange={(e) =>
                          set("valorDoacao", maskMoney(e.target.value))
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </FormSectionCard>
            )}

            {/* 4 — Destinação */}
            <FormSectionCard
              icon={Target}
              title="Destinação"
              description="Relacione a contribuição às ações em que ela será utilizada quando houver uma finalidade específica definida pela organização."
            >
              <InfoBlock className="mb-4">
                Os vínculos abaixo servem para indicar onde a doação será
                utilizada. Quando houver um projeto relacionado, selecione-o
                primeiro para facilitar a identificação da atividade
                correspondente. Se a doação não estiver destinada a uma ação
                específica, mantenha as opções como sem vínculo.
              </InfoBlock>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor="projeto"
                    tooltip="Selecione o projeto ao qual esta doação será destinada ou no qual será utilizada, quando houver."
                  >
                    Projeto
                  </FieldLabel>

                  {isView ? (
                    <Input
                      id="projeto"
                      readOnly
                      value={projetoExibido || "Sem vínculo com projeto"}
                    />
                  ) : (
                    <Select
                      value={form.projeto || SEM_VINCULO}
                      onValueChange={(v) => {
                        const projeto = v === SEM_VINCULO ? "" : v;
                        setForm((p) => ({
                          ...p,
                          projeto,
                          atividade:
                            atividades.find(
                              (atividade) => atividade.id === p.atividade,
                            )?.projetoId === projeto
                              ? p.atividade
                              : "",
                          eventoCultural:
                            eventos.find(
                              (evento) => evento.id === p.eventoCultural,
                            ) &&
                            eventoPertenceAoProjeto(
                              eventos.find(
                                (evento) => evento.id === p.eventoCultural,
                              )!,
                              projeto,
                            )
                              ? p.eventoCultural
                              : "",
                        }));
                      }}
                    >
                      <SelectTrigger id="projeto">
                        <span className="truncate text-left">
                          {projetoExibido || "Sem vínculo com projeto"}
                        </span>
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SEM_VINCULO}>
                          Sem vínculo com projeto
                        </SelectItem>

                        {projetoOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <FieldLabel
                    htmlFor="atividade"
                    tooltip="Selecione a atividade em que esta doação será utilizada, quando houver. Quando um projeto estiver selecionado, as atividades relacionadas a ele aparecem primeiro."
                  >
                    Atividade
                  </FieldLabel>

                  {isView ? (
                    <Input
                      id="atividade"
                      readOnly
                      value={atividadeExibida || "Sem vínculo com atividade"}
                    />
                  ) : (
                    <Select
                      value={form.atividade || SEM_VINCULO}
                      onValueChange={(v) => {
                        const atividade = v === SEM_VINCULO ? "" : v;
                        const atividadeSelecionada = atividades.find(
                          (item) => item.id === atividade,
                        );
                        setForm((p) => ({
                          ...p,
                          atividade,
                          // A atividade define inequivocamente seu projeto.
                          // Enviar ambos evita que um deles desapareça ao salvar.
                          projeto: atividadeSelecionada?.projetoId || p.projeto,
                        }));
                      }}
                    >
                      <SelectTrigger id="atividade">
                        <span className="truncate text-left">
                          {atividadeExibida || "Sem vínculo com atividade"}
                        </span>
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SEM_VINCULO}>
                          Sem vínculo com atividade
                        </SelectItem>

                        {atividadeOptionsComVinculo.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <FieldLabel
                    htmlFor="eventoCultural"
                    tooltip="Selecione o evento cultural em que esta doação será utilizada, quando houver."
                  >
                    Evento Cultural
                  </FieldLabel>

                  {isView ? (
                    <Input
                      id="eventoCultural"
                      readOnly
                      value={eventoExibido || "Sem vínculo com evento"}
                    />
                  ) : (
                    <Select
                      value={form.eventoCultural || SEM_VINCULO}
                      onValueChange={(v) => {
                        const eventoCultural = v === SEM_VINCULO ? "" : v;
                        const eventoSelecionado = eventos.find(
                          (item) => item.id === eventoCultural,
                        );
                        setForm((p) => ({
                          ...p,
                          eventoCultural,
                          // Só completamos o projeto para evento com um único
                          // projeto associado; em eventos compartilhados a
                          // escolha continua explícita pelo usuário.
                          projeto:
                            !p.projeto &&
                            eventoSelecionado?.projetosIds?.length === 1
                              ? eventoSelecionado.projetosIds[0]
                              : p.projeto,
                        }));
                      }}
                    >
                      <SelectTrigger id="eventoCultural">
                        <span className="truncate text-left">
                          {eventoExibido || "Sem vínculo com evento"}
                        </span>
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SEM_VINCULO}>
                          Sem vínculo com evento
                        </SelectItem>

                        {eventoOptions.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </FormSectionCard>

            {/* 5 — Recebimento e comprovante */}
            <FormSectionCard
              icon={Paperclip}
              title="Recebimento e comprovante"
              description="Acompanhe a entrega da contribuição à organização e mantenha registrado, quando disponível, o documento utilizado para comprová-la."
            >
              <div className="space-y-4">
                <div className="sm:max-w-xs">
                  <FieldLabel
                    htmlFor="statusDoacao"
                    required
                    tooltip="Selecione a situação atual da doação. Pendente indica que a contribuição ainda é aguardada; Recebida indica que ela já foi efetivamente entregue à organização; Cancelada indica que a doação não será mais realizada."
                  >
                    Situação da Doação
                  </FieldLabel>

                  <Select
                    value={form.statusDoacao || SELECIONE}
                    onValueChange={(v) =>
                      set(
                        "statusDoacao",
                        v === SELECIONE ? "" : (v as StatusDoacao),
                      )
                    }
                  >
                    <SelectTrigger id="statusDoacao">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={SELECIONE}>Selecione</SelectItem>
                      {statusDoacaoOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isFinanceira && form.statusDoacao === "RECEBIDA" && (
                  <div className="sm:max-w-md">
                    <FieldLabel
                      htmlFor="contaBancaria"
                      required
                      tooltip="Selecione a conta bancária em que o valor desta doação foi efetivamente recebido."
                    >
                      Conta bancária de recebimento
                    </FieldLabel>

                    <Select
                      value={form.contaBancaria}
                      onValueChange={(value) => set("contaBancaria", value)}
                    >
                      <SelectTrigger id="contaBancaria">
                        <SelectValue placeholder="Selecione a conta em que a doação foi recebida" />
                      </SelectTrigger>

                      <SelectContent>
                        {contasBancarias.length === 0 ? (
                          <SelectItem value="sem-conta" disabled>
                            Nenhuma conta bancária disponível
                          </SelectItem>
                        ) : (
                          contasBancarias.map((conta) => (
                            <SelectItem key={conta.id} value={conta.id}>
                              {conta.nome} · {nomeBancoLabel(conta.nomeBanco)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <FieldLabel tooltip="Anexe um recibo, termo de doação, comprovante de transferência ou outro documento que ajude a registrar ou comprovar esta doação, quando disponível.">
                    Comprovante da Doação
                  </FieldLabel>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleFileChange}
                  />

                  {!form.urlComprovante ? (
                    <Button
                      type="button"
                      variant="glassSecondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 gap-2 px-4"
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar arquivo
                    </Button>
                  ) : (
                    <div className="attachment-file-glass flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <Paperclip className="h-4 w-4 flex-shrink-0 text-primary" />

                        <span className="truncate text-sm text-foreground">
                          {form.urlComprovante}
                        </span>
                      </div>

                      {isView && id && (
                        <a
                          href="#"
                          onClick={abrirComprovante}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-border px-2 text-xs text-primary hover:bg-primary/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir
                        </a>
                      )}

                      {!isView && (
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="glassSecondary"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Substituir
                          </Button>

                          <button
                            type="button"
                            onClick={removeArquivo}
                            aria-label="Remover comprovante"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Formatos aceitos: PNG, JPG, JPEG, WEBP ou PDF. Tamanho
                    máximo: 10 MB.
                  </p>
                </div>
              </div>
            </FormSectionCard>

            {/* Registro financeiro — apenas na visualização, quando houver vínculo */}
            {isView && contasReceber && form.tipoDoacao === "FINANCEIRA" && (
              <FormSectionCard
                icon={Wallet}
                title="Registro financeiro"
                description="Acompanhe os registros financeiros gerados automaticamente a partir desta doação."
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <Info
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                      strokeWidth={2.2}
                    />

                    <span>
                      Esta doação financeira gerou uma conta a receber no
                      Financeiro
                      {form.valorDoacao
                        ? ` no valor de ${valorFormatado(form.valorDoacao)}`
                        : ""}
                      . Quando o valor é efetivamente recebido, o recebimento
                      também passa a compor as movimentações da conta bancária
                      correspondente.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={() =>
                        navigate(`/contas-receber/${contasReceber}`)
                      }
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Ver conta a receber
                    </Button>

                    {form.statusDoacao === "RECEBIDA" && form.contaBancaria && (
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="h-9 gap-2 px-4"
                        onClick={() =>
                          navigate(
                            `/movimentacoes-bancarias?contaBancariaId=${form.contaBancaria}`,
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        Ver movimentação
                      </Button>
                    )}
                  </div>
                </div>
              </FormSectionCard>
            )}

            {/* 6 — Observações */}
            <FormSectionCard
              icon={StickyNote}
              title="Observações"
              description="Mantenha registradas informações que sejam importantes para compreender ou acompanhar esta doação e que não possuam um campo próprio."
            >
              <FieldLabel
                htmlFor="observacao"
                tooltip="Registre informações relevantes sobre a doação, como condições combinadas, orientações do doador, detalhes da entrega ou outros pontos importantes para seu acompanhamento."
              >
                Observações
              </FieldLabel>

              <Textarea
                id="observacao"
                rows={3}
                value={form.observacao}
                onChange={(e) => set("observacao", e.target.value)}
              />
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/doacoes")}
              disabled={saving}
            >
              {isView ? "Voltar" : "Cancelar"}
            </Button>
            {!isView && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving || loading}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </div>

      <WikiFloatingButton pageTitle="Doações" href="/wiki/financeiro/doacoes" />
    </AppLayout>
  );
}

function InfoBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-[12px] border border-primary/15 bg-primary-soft/50 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md supports-[backdrop-filter]:bg-primary-soft/40 ${className ?? ""}`}
    >
      <Info
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
        strokeWidth={2.2}
      />
      <span>{children}</span>
    </div>
  );
}

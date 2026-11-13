import { useEffect, useState } from "react";
import { ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/FieldLabel";
import { FormSectionCard } from "@/components/FormSectionCard";
import { PageObjective } from "@/components/PageObjective";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useModulePermissionContext } from "@/contexts/ModulePermissionContext";
import {
  buscarOpcoesAcompanhamento,
  excluirAcompanhamento,
  listarAcompanhamentos,
  salvarAcompanhamento,
  tiposAcompanhamento,
  type DadosAcompanhamento,
  type OpcoesAcompanhamento,
  type RascunhoAcompanhamento,
  type RegistroAcompanhamento,
  type TipoAcompanhamento,
} from "@/lib/historicoAcompanhamento";
import { formatarDataBR } from "@/lib/trajetoriaParticipante";

const NENHUM = "__nenhum__";
const NOVO = "novo";
const cardRegistroClass =
  "rounded-[12px] border border-border/70 bg-card/70 p-4 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-card/55";
const registroVazio: DadosAcompanhamento = {
  tipoRegistro: null,
  dataPresenca: null,
  atividadeId: null,
  observacoes: null,
};
const dataLocal = new Intl.DateTimeFormat("pt-BR");

type Registro = RegistroAcompanhamento | RascunhoAcompanhamento;

function dataDoRegistro(registro: Registro) {
  return "criadoEm" in registro
    ? dataLocal.format(new Date(registro.criadoEm))
    : "Pendente de salvar";
}

interface Props {
  participanteId?: string;
  readOnly: boolean;
  iniciarEmEdicao: boolean;
  disabled: boolean;
  pendentes: RascunhoAcompanhamento[];
  atividadesVinculadas: OpcoesAcompanhamento["atividades"];
  onPendentesChange: React.Dispatch<
    React.SetStateAction<RascunhoAcompanhamento[]>
  >;
}

export function HistoricoAcompanhamentoTab({
  participanteId,
  readOnly,
  iniciarEmEdicao,
  disabled,
  pendentes,
  atividadesVinculadas,
  onPendentesChange,
}: Props) {
  const { permissoes } = useModulePermissionContext();
  const [salvos, setSalvos] = useState<RegistroAcompanhamento[]>([]);
  const [opcoes, setOpcoes] = useState<OpcoesAcompanhamento | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [edicoes, setEdicoes] = useState<
    Partial<Record<string | number, DadosAcompanhamento | null>>
  >({});
  const [excluir, setExcluir] = useState<Registro | null>(null);
  const [salvandoId, setSalvandoId] = useState<Registro["id"] | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!participanteId) return;

    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      listarAcompanhamentos(participanteId, signal),
      buscarOpcoesAcompanhamento(participanteId, signal),
    ])
      .then(([registros, opcoes]) => {
        if (signal.aborted) return;
        setSalvos(registros);
        setOpcoes(opcoes);
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o acompanhamento.",
        );
      });
    return () => controller.abort();
  }, [participanteId, tentativa]);

  const registros = participanteId ? salvos : [...pendentes].reverse();
  const tipos = opcoes?.tipos ?? tiposAcompanhamento;
  const atividades = opcoes?.atividades ?? atividadesVinculadas;
  const carregando = Boolean(participanteId && !opcoes && !erro);
  const ocupado = salvandoId !== null || excluindo;
  const bloqueado = ocupado || disabled || readOnly;
  const podeCriar = !readOnly && (!participanteId || permissoes.CRIAR);
  const podeEditar = !readOnly && (!participanteId || permissoes.EDITAR);
  const podeExcluir = !readOnly && (!participanteId || permissoes.EXCLUIR);

  const datas = opcoes?.datasPresenca ?? [];
  const novoRegistro = edicoes[NOVO];

  function nomeAtividade(registro: Registro | undefined, id: number) {
    return (
      (registro && "atividadeNome" in registro
        ? registro.atividadeNome
        : null) ||
      atividades.find((a) => a.id === id)?.nome ||
      "Atividade vinculada"
    );
  }

  function definirEdicao(
    id: Registro["id"],
    dados: DadosAcompanhamento | null,
  ) {
    setEdicoes((atuais) => ({ ...atuais, [id]: dados }));
  }

  async function salvar(dados: DadosAcompanhamento, registro?: Registro) {
    if (bloqueado || !(registro ? podeEditar : podeCriar)) return;

    const payload = {
      ...dados,
      observacoes: dados.observacoes?.trim() || null,
    };
    if (
      !payload.tipoRegistro &&
      !payload.dataPresenca &&
      !payload.atividadeId &&
      !payload.observacoes
    ) {
      toast.error("Informe ao menos uma informação para salvar o registro.");
      return;
    }

    const id = registro?.id ?? NOVO;
    setSalvandoId(id);
    try {
      if (participanteId) {
        const atualizado = await salvarAcompanhamento(
          participanteId,
          payload,
          typeof registro?.id === "number" ? registro.id : undefined,
        );
        setSalvos((lista) =>
          registro
            ? lista.map((item) =>
                item.id === atualizado.id ? atualizado : item,
              )
            : [atualizado, ...lista],
        );
      } else {
        const rascunho = {
          ...payload,
          id:
            typeof registro?.id === "string"
              ? registro.id
              : crypto.randomUUID(),
        };
        onPendentesChange((lista) =>
          registro
            ? lista.map((item) => (item.id === rascunho.id ? rascunho : item))
            : [...lista, rascunho],
        );
      }
      toast.success(
        participanteId
          ? "Registro de acompanhamento salvo."
          : "Registro adicionado ao cadastro.",
      );
      definirEdicao(id, null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o registro.",
      );
    } finally {
      setSalvandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluir || bloqueado || !podeExcluir) return;
    const { id } = excluir;
    setExcluindo(true);
    try {
      if (participanteId && typeof id === "number") {
        await excluirAcompanhamento(participanteId, id);
        setSalvos((lista) => lista.filter((item) => item.id !== id));
      } else {
        onPendentesChange((lista) => lista.filter((item) => item.id !== id));
      }
      definirEdicao(id, null);
      setExcluir(null);
      toast.success("Registro excluído.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o registro.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  function renderEditor(
    titulo: string,
    d: DadosAcompanhamento,
    registro?: Registro,
  ) {
    const id = registro?.id ?? NOVO;
    const idCampo = `hist-edicao-${id}`;
    const atividadeAtual = d.atividadeId;
    const atividadesEdicao =
      atividadeAtual != null && !atividades.some((a) => a.id === atividadeAtual)
        ? [
            ...atividades,
            {
              id: atividadeAtual,
              nome: nomeAtividade(registro, atividadeAtual),
            },
          ]
        : atividades;
    const dataAtual = d.dataPresenca;
    const datasEdicao =
      dataAtual && !datas.includes(dataAtual) ? [dataAtual, ...datas] : datas;

    function alterarDados(patch: Partial<DadosAcompanhamento>) {
      setEdicoes((atuais) => ({
        ...atuais,
        [id]: { ...(atuais[id] ?? d), ...patch },
      }));
    }

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {titulo}
          </h3>
          <div className="flex items-center gap-3">
            {registro && podeExcluir && (
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => setExcluir(registro)}
                className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50 sm:min-h-0 sm:px-0"
                aria-label={`Excluir ${titulo.toLowerCase()}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Excluir
              </button>
            )}
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => definirEdicao(id, null)}
              className="inline-flex min-h-11 items-center px-2 text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:px-0"
              aria-label="Cancelar edição do registro"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 lg:col-span-2">
            <FieldLabel
              htmlFor={`${idCampo}-tipo`}
              tooltip="Selecione o assunto da informação que deseja registrar, como acompanhamento geral, comportamento, frequência, desistência ou encerramento da participação."
            >
              Tipo de Registro
            </FieldLabel>
            <Select
              value={d.tipoRegistro ?? NENHUM}
              disabled={bloqueado}
              onValueChange={(valor) =>
                alterarDados({
                  tipoRegistro:
                    valor === NENHUM ? null : (valor as TipoAcompanhamento),
                  dataPresenca: valor === "FREQUENCIA" ? d.dataPresenca : null,
                  atividadeId: valor === "DESISTENCIA" ? d.atividadeId : null,
                })
              }
            >
              <SelectTrigger id={`${idCampo}-tipo`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Não informado</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo.valor} value={tipo.valor}>
                    {tipo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(d.tipoRegistro === "FREQUENCIA" || d.dataPresenca) && (
            <div>
              <FieldLabel
                htmlFor={datasEdicao.length ? `${idCampo}-presenca` : undefined}
                tooltip="Selecione uma presença já cadastrada para relacioná-la a este acompanhamento. Não é necessário informar a data novamente."
              >
                Selecionar Presença
              </FieldLabel>
              {datasEdicao.length ? (
                <Select
                  value={d.dataPresenca ?? NENHUM}
                  disabled={bloqueado}
                  onValueChange={(valor) =>
                    alterarDados({
                      dataPresenca: valor === NENHUM ? null : valor,
                    })
                  }
                >
                  <SelectTrigger id={`${idCampo}-presenca`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhuma</SelectItem>
                    {datasEdicao.map((data) => (
                      <SelectItem key={data} value={data}>
                        {formatarDataBR(data) ?? data}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {participanteId
                    ? "Nenhum registro de presença disponível para este participante."
                    : "As datas de presença ficam disponíveis após o cadastro."}
                </p>
              )}
            </div>
          )}

          {(d.tipoRegistro === "DESISTENCIA" || d.atividadeId != null) && (
            <div>
              <FieldLabel
                htmlFor={
                  atividadesEdicao.length ? `${idCampo}-atividade` : undefined
                }
                tooltip="Selecione a atividade da qual o participante desistiu. Se a desistência não estiver relacionada a uma atividade específica, deixe o campo em branco."
              >
                Atividade
              </FieldLabel>
              {atividadesEdicao.length ? (
                <Select
                  value={d.atividadeId?.toString() ?? NENHUM}
                  disabled={bloqueado}
                  onValueChange={(valor) =>
                    alterarDados({
                      atividadeId: valor === NENHUM ? null : Number(valor),
                    })
                  }
                >
                  <SelectTrigger id={`${idCampo}-atividade`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Desistência geral</SelectItem>
                    {atividadesEdicao.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhuma matrícula registrada para este participante.
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <FieldLabel
              htmlFor={`${idCampo}-desc`}
              tooltip="Descreva o que aconteceu ou a informação que deseja guardar. Você pode registrar dificuldades, motivos de desistência, situações de convivência e outras informações relevantes."
            >
              Informações Complementares
            </FieldLabel>
            <Textarea
              id={`${idCampo}-desc`}
              rows={3}
              disabled={bloqueado}
              value={d.observacoes ?? ""}
              onChange={(e) => alterarDados({ observacoes: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="glassSecondary"
            className="h-9 px-4"
            disabled={bloqueado}
            onClick={() => definirEdicao(id, null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="glassPrimary"
            className="h-9 px-4"
            disabled={bloqueado}
            onClick={() => void salvar(d, registro)}
          >
            {salvandoId === id ? "Salvando..." : "Salvar registro"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageObjective
        variant="primary"
        label="Preencha esta seção"
        icon={ClipboardList}
        description="quando desejar registrar informações sobre a trajetória e o acompanhamento do participante na organização."
      />

      <FormSectionCard
        icon={ClipboardList}
        title="Acompanhamento"
        description="Registre informações sobre o acompanhamento, a participação e os acontecimentos relevantes durante a trajetória do participante na organização."
        tooltip="Utilize esta seção para registrar informações importantes sobre a participação da pessoa na organização. Os registros ficam organizados por data e podem ser consultados posteriormente."
      >
        {carregando && (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando registros...
          </p>
        )}
        {erro && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
            <Button
              type="button"
              variant="glassSecondary"
              size="sm"
              onClick={() => {
                setErro("");
                setTentativa((valor) => valor + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {!carregando && !erro && (
          <div className="space-y-4">
            {podeCriar && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={bloqueado || !!novoRegistro}
                  onClick={() => definirEdicao(NOVO, registroVazio)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Adicionar
                  registro
                </Button>
              </div>
            )}

            {podeCriar && novoRegistro && (
              <div className={cardRegistroClass}>
                {renderEditor("Novo registro", novoRegistro)}
              </div>
            )}

            {registros.length === 0 && !novoRegistro && (
              <p className="text-sm text-muted-foreground">
                Nenhum registro de acompanhamento cadastrado.
                {podeCriar && (
                  <>
                    {" "}
                    Utilize a opção{" "}
                    <span className="font-semibold">
                      Adicionar registro
                    </span>{" "}
                    para incluir informações sobre o participante.
                  </>
                )}
              </p>
            )}

            {registros.length > 0 && (
              <ul className="space-y-3">
                {registros.map((registro, indice) => {
                  const edicao = edicoes[registro.id];
                  const dados =
                    edicao === undefined && iniciarEmEdicao ? registro : edicao;
                  if (podeEditar && dados) {
                    return (
                      <li key={registro.id} className={cardRegistroClass}>
                        {renderEditor(
                          `Registro ${indice + 1}`,
                          dados,
                          registro,
                        )}
                      </li>
                    );
                  }

                  const tipo = tipos.find(
                    ({ valor }) => valor === registro.tipoRegistro,
                  )?.descricao;
                  const idCampo = `hist-registro-${registro.id}`;
                  return (
                    <li key={registro.id} className={cardRegistroClass}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Registro {indice + 1}
                        </h3>
                        {(podeEditar || podeExcluir) && (
                          <div className="flex items-center gap-3">
                            {podeEditar && (
                              <button
                                type="button"
                                className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-50 sm:min-h-0 sm:px-0"
                                aria-label={`Editar registro ${indice + 1}`}
                                disabled={bloqueado}
                                onClick={() =>
                                  definirEdicao(registro.id, registro)
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                Editar
                              </button>
                            )}
                            {podeExcluir && (
                              <button
                                type="button"
                                className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50 sm:min-h-0 sm:px-0"
                                aria-label={`Excluir registro ${indice + 1}`}
                                disabled={bloqueado}
                                onClick={() => setExcluir(registro)}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="min-w-0 lg:col-span-2">
                          <FieldLabel htmlFor={`${idCampo}-tipo`}>
                            Tipo de Registro
                          </FieldLabel>
                          <output
                            id={`${idCampo}-tipo`}
                            aria-live="off"
                            className="flex min-h-10 cursor-not-allowed items-center break-words rounded-md border border-input bg-background px-3 py-2 text-base opacity-50 md:text-sm"
                          >
                            <span className="min-w-0">
                              {tipo ?? "Não informado"}
                            </span>
                          </output>
                        </div>
                        <div>
                          <FieldLabel htmlFor={`${idCampo}-data`}>
                            Data do Registro
                          </FieldLabel>
                          <Input
                            id={`${idCampo}-data`}
                            value={dataDoRegistro(registro)}
                            disabled
                          />
                        </div>
                        {(registro.tipoRegistro === "FREQUENCIA" ||
                          registro.dataPresenca) && (
                          <div>
                            <FieldLabel htmlFor={`${idCampo}-presenca`}>
                              Data da Presença
                            </FieldLabel>
                            <Input
                              id={`${idCampo}-presenca`}
                              value={
                                formatarDataBR(registro.dataPresenca) ??
                                "Não informada"
                              }
                              disabled
                            />
                          </div>
                        )}
                        {(registro.tipoRegistro === "DESISTENCIA" ||
                          registro.atividadeId != null) && (
                          <div>
                            <FieldLabel htmlFor={`${idCampo}-atividade`}>
                              Atividade
                            </FieldLabel>
                            <Input
                              id={`${idCampo}-atividade`}
                              value={
                                registro.atividadeId == null
                                  ? "Desistência geral"
                                  : nomeAtividade(
                                      registro,
                                      registro.atividadeId,
                                    )
                              }
                              disabled
                            />
                          </div>
                        )}
                        <div className="sm:col-span-2 lg:col-span-4">
                          <FieldLabel htmlFor={`${idCampo}-desc`}>
                            Informações Complementares
                          </FieldLabel>
                          <Textarea
                            id={`${idCampo}-desc`}
                            rows={3}
                            value={registro.observacoes ?? ""}
                            disabled
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </FormSectionCard>

      <AlertDialog
        open={!!excluir}
        onOpenChange={(aberto) => {
          if (!aberto && !ocupado) setExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro de acompanhamento será removido do histórico do
              participante. Presenças e matrículas não são alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bloqueado}
              onClick={(evento) => {
                evento.preventDefault();
                void confirmarExclusao();
              }}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

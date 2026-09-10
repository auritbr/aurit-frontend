import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  ListChecks,
  Search,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AttendanceStatusSelector } from "@/components/AttendanceStatusSelector";
import { FieldTooltip } from "@/components/FieldTooltip";
import { FormSectionCard } from "@/components/FormSectionCard";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { FormLegend } from "@/components/FormLegend";
import { FieldLabel } from "@/components/FieldLabel";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
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
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  createPresenca,
  getParticipantesVinculadosPresenca,
  getPresencasBaseData,
  statusPresenca,
  type AtividadeOption,
  type ParticipanteApiDTO,
  type ParticipanteRow,
  type PlanoAulaOption,
  type PresencaPayload,
  type StatusPresencaValue,
  type TurmaOption,
} from "@/data/presencas";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

const SEM_TURMA = "__SEM_TURMA__";
const SEM_PLANO_AULA = "__SEM_PLANO_AULA__";
const NEXT_STEP_DURATION_MS = 60_000;
const statusAjuda =
  "Presente: a aula ocorreu e o participante compareceu. Ausente: a aula ocorreu, mas o participante não compareceu. Não teve aula: a aula prevista não foi realizada. Feriado: a aula não ocorreu por causa de feriado.";

interface PresencaNextStepCardData {
  titulo: string;
  acaoLabel: string;
  acaoUrl: string;
  variante?: "pendente" | "atencao" | "concluido";
}

const presencaNextStepCard: PresencaNextStepCardData = {
  titulo: "Após registrar presenças, organize os eventos culturais",
  acaoLabel: "Cadastrar eventos",
  acaoUrl: "/eventos-culturais/novo",
  variante: "pendente",
};

const anosOptions = (() => {
  const atual = new Date().getFullYear();
  const inicio = 2000;
  const fim = atual + 5;

  return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
})();

export default function Presencas() {
  const [atividadeId, setAtividadeId] = useState<string>("");
  const [turmaId, setTurmaId] = useState<string>("");
  const [planoAulaId, setPlanoAulaId] = useState<string>("");
  const [searched, setSearched] = useState(false);

  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));
  const [dataAula, setDataAula] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [rows, setRows] = useState<ParticipanteRow[]>([]);
  const [nextStepCard, setNextStepCard] =
    useState<PresencaNextStepCardData | null>(null);

  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [planosAula, setPlanosAula] = useState<PlanoAulaOption[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteApiDTO[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;

  const turmasDaAtividade = useMemo(
    () =>
      atividadeId
        ? turmas.filter((turma) => turma.atividadeId === atividadeId)
        : [],
    [atividadeId, turmas],
  );

  const planosAulaDisponiveis = useMemo(() => {
    if (!atividadeId) return [];

    return planosAula.filter((plano) => {
      if (plano.atividadeId !== atividadeId) return false;

      if (turmaId) {
        if (!plano.turmaIds.includes(turmaId)) return false;
      } else if (plano.turmaIds.length > 0) {
        return false;
      }

      if (dataAula) {
        if (plano.dataInicio && dataAula < plano.dataInicio) {
          return false;
        }

        if (plano.dataFim && dataAula > plano.dataFim) {
          return false;
        }
      }

      return true;
    });
  }, [atividadeId, turmaId, dataAula, planosAula]);

  const atividadeSelecionada = useMemo(
    () => atividades.find((atividade) => atividade.id === atividadeId),
    [atividadeId, atividades],
  );

  const turmaSelecionada = useMemo(
    () => turmas.find((turma) => turma.id === turmaId),
    [turmaId, turmas],
  );

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("PRESENCAS");

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
    if (!nextStepCard) return;

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nextStepCard]);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoadingBase(false);
      return;
    }

    void carregarDadosBase();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarDadosBase() {
    try {
      setLoadingBase(true);

      const data = await getPresencasBaseData();

      setAtividades(data.atividades);
      setTurmas(data.turmas);
      setPlanosAula(data.planosAula);
      setParticipantes(data.participantes);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a página.";

      console.error(error);
      toast.error(message);
    } finally {
      setLoadingBase(false);
    }
  }

  const handleAtividadeChange = (value: string) => {
    setAtividadeId(value);
    setTurmaId("");
    setPlanoAulaId("");
    setSearched(false);
    setRows([]);
    setNextStepCard(null);
  };

  const handleTurmaChange = (value: string) => {
    setTurmaId(value === SEM_TURMA ? "" : value);
    setPlanoAulaId("");
    setSearched(false);
    setRows([]);
    setNextStepCard(null);
  };

  const handlePlanoAulaChange = (value: string) => {
    setPlanoAulaId(value === SEM_PLANO_AULA ? "" : value);
  };

  const handleDataAulaChange = (value: string) => {
    setDataAula(value);
    setPlanoAulaId("");

    const year = value ? value.split("-")[0] : "";

    if (year && anosOptions.includes(Number(year))) {
      setAno(year);
    }
  };

  const handleBuscar = () => {
    if (!atividadeId) {
      toast.error("Selecione uma atividade para buscar.");
      return;
    }

    const nextRows = getParticipantesVinculadosPresenca({
      participantes,
      atividadeId,
      turmaId,
    });

    if (nextRows.length === 0) {
      toast.warning(
        turmaId
          ? "Nenhum participante vinculado encontrado para esta turma."
          : "Nenhum participante vinculado diretamente a esta atividade foi encontrado.",
      );
    }

    setRows(nextRows);
    setSearched(true);
    setNextStepCard(null);
  };

  const updateStatus = (id: string, status: StatusPresencaValue) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row)),
    );
  };

  const marcarTodos = (status: StatusPresencaValue) => {
    setRows((prev) => prev.map((row) => ({ ...row, status })));
  };

  const handleSalvar = async () => {
    if (!podeCriar) {
      toast.error("Você não possui permissão para registrar presenças.");
      return;
    }

    if (!atividadeId) {
      toast.error("Selecione a atividade.");
      return;
    }

    if (!ano) {
      toast.error("Informe o ano da aula.");
      return;
    }

    if (!dataAula) {
      toast.error("Informe a data da aula.");
      return;
    }

    if (rows.length === 0) {
      toast.error("Nenhum participante para registrar.");
      return;
    }

    const participantesUnicos = new Set(rows.map((row) => row.id));

    if (participantesUnicos.size !== rows.length) {
      toast.error("Há participantes duplicados na chamada.");
      return;
    }

    const payload: PresencaPayload = {
      ano: Number(ano),
      dataPresenca: dataAula,
      observacaoAula: observacao.trim(),
      atividadeId: Number(atividadeId),
      turmaId: turmaId ? Number(turmaId) : null,
      planoAulaId: planoAulaId ? Number(planoAulaId) : null,
      participantes: rows.map((row) => ({
        participanteId: Number(row.id),
        statusPresenca: row.status,
      })),
    };

    try {
      setSaving(true);

      await createPresenca(payload);

      toast.success("Presença registrada com sucesso.");

      emitJourneyNextStep();
      setObservacao("");
      setDataAula("");
      setPlanoAulaId("");
      setRows([]);
      setSearched(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a presença.";

      console.error(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <PageTitle
          title="Presenças"
          tooltip="Nesta página são registradas e acompanhadas as presenças dos participantes nos encontros das atividades e turmas da organização, com possibilidade de relacionar o registro ao plano de aula correspondente. Esses dados ajudam a controlar a frequência, acompanhar a participação e manter o histórico dos encontros realizados."
        />

        <PageObjective
          className="mb-4"
          description="Registre e acompanhe a presença dos participantes nos encontros das atividades e turmas, relacionando cada registro à data e, quando houver, ao plano de aula correspondente. Essas informações apoiam o controle de frequência, o acompanhamento da participação, a geração de relatórios e a comprovação das ações realizadas."
        />

        <FormLegend />

        <div className="space-y-5">
          <FormSectionCard
            icon={Search}
            title="Buscar participantes"
            description="Defina a atividade e a turma correspondente para localizar os participantes que deverão fazer parte deste registro de presença."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-5">
                <FieldLabel
                  htmlFor="presencaAtividade"
                  required
                  tooltip="Informe a atividade para a qual será realizado o registro de presença."
                >
                  Atividade
                </FieldLabel>

                <Select
                  value={atividadeId}
                  onValueChange={handleAtividadeChange}
                  disabled={loadingBase}
                >
                  <SelectTrigger id="presencaAtividade">
                    <SelectValue
                      placeholder={loadingBase ? "Carregando..." : "Selecione"}
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {atividades.length === 0 ? (
                      <SelectItem value="sem-atividade" disabled>
                        Nenhuma atividade cadastrada
                      </SelectItem>
                    ) : (
                      atividades.map((atividade) => (
                        <SelectItem key={atividade.id} value={atividade.id}>
                          {atividade.nomeAtividade}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-5">
                <FieldLabel
                  htmlFor="presencaTurma"
                  tooltip="Informe a turma quando o registro de presença corresponder a um grupo específico da atividade."
                >
                  Turma
                </FieldLabel>

                <Select
                  value={turmaId || SEM_TURMA}
                  onValueChange={handleTurmaChange}
                  disabled={loadingBase || !atividadeId}
                >
                  <SelectTrigger id="presencaTurma">
                    <SelectValue
                      placeholder={
                        !atividadeId
                          ? "Selecione uma atividade"
                          : turmasDaAtividade.length === 0
                            ? "Esta atividade não possui turmas"
                            : "Selecione"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={SEM_TURMA}>
                      Sem turma específica
                    </SelectItem>

                    {turmasDaAtividade.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nomeTurma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex md:col-span-2 md:items-end">
                <Button
                  type="button"
                  variant="glassPrimary"
                  onClick={handleBuscar}
                  className="h-9 px-4"
                  disabled={loadingBase}
                >
                  Buscar
                </Button>
              </div>
            </div>
          </FormSectionCard>

          {searched && (
            <>
              <FormSectionCard
                icon={CalendarDays}
                title="Dados da Aula"
                description="Identifique o encontro ao qual este registro de presença corresponde e, quando houver, relacione o plano de aula utilizado."
              >
                {(atividadeSelecionada || turmaSelecionada) && (
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    {atividadeSelecionada?.nomeAtividade ?? ""}
                    {turmaSelecionada ? ` · ${turmaSelecionada.nomeTurma}` : ""}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <FieldLabel
                      htmlFor="presencaAno"
                      required
                      tooltip="Informe o ano de referência deste registro de presença."
                    >
                      Ano
                    </FieldLabel>

                    <Select value={ano} onValueChange={setAno}>
                      <SelectTrigger id="presencaAno">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {anosOptions.map((anoOption) => (
                          <SelectItem key={anoOption} value={String(anoOption)}>
                            {anoOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3">
                    <FieldLabel
                      htmlFor="presencaData"
                      required
                      tooltip="Informe a data em que o encontro, aula ou atividade foi realizado ou estava previsto."
                    >
                      Data da Aula
                    </FieldLabel>

                    <Input
                      id="presencaData"
                      type="date"
                      value={dataAula}
                      onChange={(e) => handleDataAulaChange(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-6">
                    <FieldLabel
                      htmlFor="presencaPlanoAula"
                      tooltip="Informe o plano de aula relacionado a este encontro, quando houver. O vínculo ajuda a relacionar o conteúdo planejado ao registro de presença."
                    >
                      Plano de Aula
                    </FieldLabel>

                    <Select
                      value={planoAulaId || SEM_PLANO_AULA}
                      onValueChange={handlePlanoAulaChange}
                      disabled={loadingBase || !atividadeId}
                    >
                      <SelectTrigger id="presencaPlanoAula">
                        <SelectValue
                          placeholder={
                            planosAulaDisponiveis.length === 0
                              ? "Nenhum plano compatível encontrado"
                              : "Selecione"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={SEM_PLANO_AULA}>
                          Sem plano de aula vinculado
                        </SelectItem>

                        {planosAulaDisponiveis.map((plano) => (
                          <SelectItem key={plano.id} value={plano.id}>
                            {plano.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {atividadeId && planosAulaDisponiveis.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nenhum plano de aula compatível com a atividade, turma e
                        data informadas.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-12">
                    <FieldLabel
                      htmlFor="presencaObservacao"
                      tooltip="Registre informações complementares sobre o encontro, como alterações, ocorrências, reposições ou outras informações relevantes."
                    >
                      Observação
                    </FieldLabel>

                    <Textarea
                      id="presencaObservacao"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={ListChecks}
                title={`Lista de Presença (${rows.length})`}
                description="Registre a situação de cada participante neste encontro, indicando se esteve presente, ausente ou se o encontro não ocorreu."
              >
                {rows.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-8 rounded-[10px] px-2.5 text-[12px]"
                      onClick={() => marcarTodos("PRESENTE")}
                    >
                      Marcar todos como Presente
                    </Button>

                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-8 rounded-[10px] px-2.5 text-[12px]"
                      onClick={() => marcarTodos("AUSENTE")}
                    >
                      Marcar todos como Ausente
                    </Button>

                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-8 rounded-[10px] px-2.5 text-[12px]"
                      onClick={() => marcarTodos("NAO_TEVE_AULA")}
                    >
                      Marcar todos como Não teve aula
                    </Button>

                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-8 rounded-[10px] px-2.5 text-[12px]"
                      onClick={() => marcarTodos("FERIADO")}
                    >
                      Marcar todos como Feriado
                    </Button>

                    <FieldTooltip
                      text={statusAjuda}
                      fieldLabel="as situações de presença"
                      side="bottom"
                    />
                  </div>
                )}

                {rows.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                    <p className="mt-3 text-sm text-muted-foreground">
                      Nenhum participante vinculado a esta atividade/turma.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-hidden rounded-[12px] border border-border/60 md:block">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                              <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Participante
                              </th>

                              <th className="w-[460px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  Status
                                  <span className="text-destructive">*</span>
                                  <FieldTooltip
                                    text={statusAjuda}
                                    fieldLabel="o status de presença"
                                    side="bottom"
                                  />
                                </span>
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {rows.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                              >
                                <td className="px-6 py-2 text-[13px] text-foreground">
                                  {row.nome}
                                </td>

                                <td className="px-6 py-2">
                                  <AttendanceStatusSelector
                                    value={row.status}
                                    onChange={(value) => {
                                      if (podeCriar) {
                                        updateStatus(row.id, value);
                                      }
                                    }}
                                    options={statusPresenca}
                                    ariaLabel={`Status de presença de ${row.nome}`}
                                    className={
                                      !podeCriar
                                        ? "pointer-events-none opacity-70"
                                        : undefined
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60 overflow-hidden rounded-[12px] border border-border/60 md:hidden">
                      {rows.map((row) => (
                        <div key={row.id} className="p-4">
                          <p className="mb-2 text-sm font-medium text-foreground">
                            {row.nome}
                          </p>

                          <AttendanceStatusSelector
                            value={row.status}
                            onChange={(value) => {
                              if (podeCriar) {
                                updateStatus(row.id, value);
                              }
                            }}
                            options={statusPresenca}
                            ariaLabel={`Status de presença de ${row.nome}`}
                            className={
                              !podeCriar
                                ? "pointer-events-none opacity-70"
                                : undefined
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </FormSectionCard>

              {podeCriar && (
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="glassPrimary"
                    onClick={handleSalvar}
                    className="h-9 px-5"
                    disabled={saving || rows.length === 0}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}

              {!podeCriar && rows.length > 0 && (
                <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Você pode visualizar os participantes, mas não possui
                  permissão para registrar presença.
                </div>
              )}
            </>
          )}

          {!searched && (
            <div className="rounded-[16px] border border-dashed border-border/70 bg-card/60 p-10 text-center backdrop-blur-md supports-[backdrop-filter]:bg-card/50">
              <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />

              <p className="mt-3 text-sm text-muted-foreground">
                Selecione uma atividade e clique em{" "}
                <strong className="text-foreground">Buscar</strong> para
                carregar os participantes.
              </p>
            </div>
          )}
        </div>
      </div>

      <WikiFloatingButton
        pageTitle="Presenças"
        href="https://www.aurit.com.br/wiki/execucao/presencas"
      />
    </AppLayout>
  );
}

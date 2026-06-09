import { useEffect, useMemo, useState } from "react";
import { Search, Save, ClipboardCheck, Users } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { FormLegend } from "@/components/FormLegend";
import { FieldLabel } from "@/components/FieldLabel";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { NextStepCard } from "@/components/NextStepCard";
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
import { isPlanoAccessDenied } from "@/lib/access";
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

const SEM_TURMA = "__SEM_TURMA__";
const SEM_PLANO_AULA = "__SEM_PLANO_AULA__";
const NEXT_STEP_DURATION_MS = 60_000;

interface PresencaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const presencaNextStepCard: PresencaNextStepCardData = {
  titulo: "Após registrar presenças, organize os eventos culturais",
  descricao:
    "Os eventos culturais registram ações públicas do projeto, como apresentações, mostras, festivais, exposições ou encontros. Esses registros ajudam a comprovar a realização das ações, o alcance do público e os resultados culturais gerados.",
  acaoLabel: "Cadastrar eventos",
  acaoUrl: "/eventos-culturais/novo",
  acaoSecundariaLabel: "Ver presenças",
  acaoSecundariaUrl: "/presencas",
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
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
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
        if (plano.turmaId !== turmaId) return false;
      } else if (plano.turmaId) {
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
      setAccessDeniedMessage(null);

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

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

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

      setNextStepCard(presencaNextStepCard);
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

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

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

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <PageTitle
          title="Presenças"
          tooltip="Registre a presença dos participantes nas atividades e turmas da organização. Utilize este espaço para acompanhar frequências, comprovar encontros realizados e manter um histórico confiável da execução das ações."
        />

        {nextStepCard && (
          <NextStepCard
            titulo={nextStepCard.titulo}
            descricao={nextStepCard.descricao}
            acaoLabel={nextStepCard.acaoLabel}
            acaoUrl={nextStepCard.acaoUrl}
            acaoSecundariaLabel={nextStepCard.acaoSecundariaLabel}
            acaoSecundariaUrl={nextStepCard.acaoSecundariaUrl}
            variante={nextStepCard.variante ?? "pendente"}
            onDismiss={() => setNextStepCard(null)}
          />
        )}

        <FormLegend />

        <div className="rounded border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Buscar Participantes
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Selecione a atividade e, se houver, a turma para carregar os
              participantes vinculados.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">
            <div className="md:col-span-5">
              <FieldLabel
                required
                tooltip="Selecione a atividade para carregar os participantes vinculados e registrar a presença deste encontro, oficina, aula ou ação."
              >
                Atividade
              </FieldLabel>

              <Select
                value={atividadeId}
                onValueChange={handleAtividadeChange}
                disabled={loadingBase}
              >
                <SelectTrigger>
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
                tooltip="Selecione uma turma quando a atividade estiver organizada por grupos, horários, faixas etárias ou níveis diferentes. Se a chamada for geral da atividade, deixe como “sem turma específica”."
              >
                Turma
              </FieldLabel>

              <Select
                value={turmaId || SEM_TURMA}
                onValueChange={handleTurmaChange}
                disabled={loadingBase || !atividadeId}
              >
                <SelectTrigger>
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
                onClick={handleBuscar}
                className="w-full gap-2"
                disabled={loadingBase}
              >
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          </div>
        </div>

        {searched && (
          <>
            <div className="mt-5 rounded border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Dados da Aula
                </h2>

                {(atividadeSelecionada || turmaSelecionada) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {atividadeSelecionada?.nomeAtividade}
                    {turmaSelecionada ? ` · ${turmaSelecionada.nomeTurma}` : ""}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">
                <div className="md:col-span-2">
                  <FieldLabel required>Ano</FieldLabel>

                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger>
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
                  <FieldLabel required>Data do Encontro</FieldLabel>

                  <Input
                    type="date"
                    value={dataAula}
                    onChange={(e) => handleDataAulaChange(e.target.value)}
                  />
                </div>

                <div className="md:col-span-7">
                  <FieldLabel tooltip="Vincule o plano de aula planejado para este encontro. A lista é filtrada pela atividade, turma e data informadas. O vínculo é opcional, mas ajuda a comprovar o que foi planejado e executado.">
                    Plano de Aula
                  </FieldLabel>

                  <Select
                    value={planoAulaId || SEM_PLANO_AULA}
                    onValueChange={handlePlanoAulaChange}
                    disabled={loadingBase || !atividadeId}
                  >
                    <SelectTrigger>
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
                  <FieldLabel tooltip="Registre informações importantes sobre este encontro, como conteúdo trabalhado, justificativas de ausência, alterações de horário, ocorrências, reposições ou observações relevantes para relatórios.">
                    Observação
                  </FieldLabel>

                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded border border-border bg-card">
              <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Participantes ({rows.length})
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Marque a situação de presença de cada participante neste
                    encontro.
                  </p>
                </div>

                {rows.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => marcarTodos("PRESENTE")}
                    >
                      Marcar todos como Presente
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => marcarTodos("AUSENTE")}
                    >
                      Marcar todos como Ausente
                    </Button>
                  </div>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum participante vinculado a esta atividade/turma.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Participante
                          </th>

                          <th className="w-[280px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Status <span className="text-destructive">*</span>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-6 py-2 text-[13px] text-foreground">
                              {row.nome}
                            </td>

                            <td className="px-6 py-2">
                              <Select
                                value={row.status}
                                onValueChange={(value) =>
                                  updateStatus(
                                    row.id,
                                    value as StatusPresencaValue,
                                  )
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                  {statusPresenca.map((status) => (
                                    <SelectItem
                                      key={status.value}
                                      value={status.value}
                                    >
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {rows.map((row) => (
                      <div key={row.id} className="p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">
                          {row.nome}
                        </p>

                        <Select
                          value={row.status}
                          onValueChange={(value) =>
                            updateStatus(row.id, value as StatusPresencaValue)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {statusPresenca.map((status) => (
                              <SelectItem
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {podeCriar && (
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleSalvar}
                  className="gap-2"
                  disabled={saving || rows.length === 0}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}

            {!podeCriar && rows.length > 0 && (
              <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Você pode visualizar os participantes, mas não possui permissão
                para registrar presença.
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="mt-5 rounded border border-dashed border-border bg-muted/30 p-10 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />

            <p className="mt-3 text-sm text-muted-foreground">
              Selecione uma atividade e clique em{" "}
              <strong className="text-foreground">Buscar</strong> para carregar
              os participantes.
            </p>
          </div>
        )}
      </div>

      <WikiFloatingButton
        pageTitle="Presenças"
        href="https://www.aurit.com.br/wiki/execucao/presencas"
      />
    </AppLayout>
  );
}
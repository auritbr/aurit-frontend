import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSignature,
  Eye,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpTooltip } from "@/components/HelpTooltip";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportHabilitacaoPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  agenteNomeHabilitacao,
  deleteHabilitacao,
  formatDateBr,
  getAgentesOptions,
  getHabilitacoes,
  getPropostasEditalOptions,
  propostaNomeHabilitacao,
  statusHabilitacaoLabel,
  statusHabilitacaoTone,
  type AgenteOption,
  type Habilitacao,
  type PropostaOption,
} from "@/data/habilitacao";
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
import { toast } from "sonner";

const HABILITACAO_NEXT_STEP_KEY =
  "aurit:habilitacoes-propostas:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface HabilitacaoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  success:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

function StatusBadge({ value }: { value: string }) {
  const tone = statusHabilitacaoTone(value);

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-medium ${toneClass[tone] ?? toneClass.neutral
        }`}
    >
      {statusHabilitacaoLabel(value)}
    </span>
  );
}

export default function HabilitacaoPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Habilitacao[]>([]);
  const [propostas, setPropostas] = useState<PropostaOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<HabilitacaoNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo(
          "HABILITACOES_PROPOSTAS",
        );

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
    const raw = sessionStorage.getItem(HABILITACAO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as HabilitacaoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(HABILITACAO_NEXT_STEP_KEY);

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregarDados();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [habilitacoesData, propostasData, agentesData] = await Promise.all([
        getHabilitacoes(),
        getPropostasEditalOptions(),
        getAgentesOptions(),
      ]);

      setItems(habilitacoesData);
      setPropostas(propostasData);
      setAgentes(agentesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar habilitações documentais.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((habilitacao) =>
      [
        propostaNomeHabilitacao(
          habilitacao.propostaEdital,
          propostas,
          habilitacao.nomePropostaEdital,
        ),
        agenteNomeHabilitacao(
          habilitacao.agente,
          agentes,
          habilitacao.nomeAgente,
        ),
        statusHabilitacaoLabel(habilitacao.statusHabilitacao),
        formatDateBr(habilitacao.dataInicioHabilitacao),
        formatDateBr(habilitacao.dataLimiteHabilitacao),
        formatDateBr(habilitacao.dataEnvioDocumentacao),
        formatDateBr(habilitacao.dataRetornoAnalise),
        formatDateBr(habilitacao.dataRegularizacao),
        formatDateBr(habilitacao.dataConclusaoHabilitacao),
        habilitacao.exigenciaOuPendencia,
        habilitacao.providenciaTomada,
        habilitacao.motivoInabilitacao,
        habilitacao.observacoes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, items, propostas, agentes]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, search);

  const handleCopy = async () => {
    const { ok, rows } = await copyTableFromRef(tableRef.current);

    if (!ok || rows === 0) {
      toast.error("Não há dados para copiar.");
      return;
    }

    toast.success("Dados copiados com sucesso.");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error(
        "Você não possui permissão para remover habilitações documentais.",
      );
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteHabilitacao(Number(confirmDelete));

      setItems((prev) =>
        prev.filter((habilitacao) => habilitacao.id !== confirmDelete),
      );

      toast.success("Habilitação Documental removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover Habilitação Documental.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  async function handleExportPdf(habilitacao: Habilitacao) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const proposta = propostaNomeHabilitacao(
      habilitacao.propostaEdital,
      propostas,
      habilitacao.nomePropostaEdital,
    );

    const agente = agenteNomeHabilitacao(
      habilitacao.agente,
      agentes,
      habilitacao.nomeAgente,
    );

    await exportHabilitacaoPdf({
      id: habilitacao.id,
      propostaEdital: proposta,
      agenteResponsavel: agente,

      dataInicioHabilitacao: habilitacao.dataInicioHabilitacao,
      dataFinalEnvio: habilitacao.dataLimiteHabilitacao,
      dataLimiteHabilitacao: habilitacao.dataLimiteHabilitacao,
      dataEnvioDocumentacao: habilitacao.dataEnvioDocumentacao,

      statusHabilitacao: statusHabilitacaoLabel(
        habilitacao.statusHabilitacao,
      ),

      dataRetornoAnalise: habilitacao.dataRetornoAnalise,
      exigenciaOuPendencia: habilitacao.exigenciaOuPendencia,
      providenciaTomada: habilitacao.providenciaTomada,
      dataRegularizacao: habilitacao.dataRegularizacao,
      dataConclusaoHabilitacao: habilitacao.dataConclusaoHabilitacao,

      motivoInabilitacao: habilitacao.motivoInabilitacao,
      observacoes: habilitacao.observacoes,
    } as any);
  }

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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Habilitação Documental
              </h1>

              <HelpTooltip
                text="Acompanhe a fase de habilitação documental das propostas inscritas em editais. Registre prazos, envio da documentação, exigências, regularizações e resultado da análise. Os documentos devem ser cadastrados e atualizados na página Documentos."
                label="Habilitação Documental"
                size="md"
                side="bottom"
                align="start"
              />
            </div>
          </div>
        </div>

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

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar Habilitação Documental"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/habilitacoes-propostas/novo")}
                className="h-9 gap-2 self-start"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Habilitação
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1380px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Proposta de edital
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Agente responsável
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data limite
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Envio
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Retorno
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Regularização
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Conclusão
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((habilitacao) => {
                  const proposta = propostaNomeHabilitacao(
                    habilitacao.propostaEdital,
                    propostas,
                    habilitacao.nomePropostaEdital,
                  );

                  const agente = agenteNomeHabilitacao(
                    habilitacao.agente,
                    agentes,
                    habilitacao.nomeAgente,
                  );

                  return (
                    <tr
                      key={habilitacao.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() =>
                              navigate(
                                `/habilitacoes-propostas/${habilitacao.id}`,
                              )
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/habilitacoes-propostas/${habilitacao.id}/editar`,
                                )
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(habilitacao.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={proposta} bold>
                          {proposta}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={agente} muted>
                          {agente}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span className="text-sm font-medium text-foreground">
                          {formatDateBr(habilitacao.dataLimiteHabilitacao)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(habilitacao.dataEnvioDocumentacao)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(habilitacao.dataRetornoAnalise)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(habilitacao.dataRegularizacao)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDateBr(
                          habilitacao.dataConclusaoHabilitacao,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusBadge value={habilitacao.statusHabilitacao} />
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(habilitacao)}
                            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Gerar ficha
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <EmptyRow
                    message="Nenhuma Habilitação Documental cadastrada."
                    colspan={podeGerarPdf ? 10 : 9}
                  />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <MobileEmptyState message="Nenhuma Habilitação Documental encontrada." />
            ) : (
              paginated.map((habilitacao) => (
                <div key={habilitacao.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() =>
                          navigate(
                            `/habilitacoes-propostas/${habilitacao.id}`,
                          )
                        }
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(
                              `/habilitacoes-propostas/${habilitacao.id}/editar`,
                            )
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(habilitacao.id)}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge value={habilitacao.statusHabilitacao} />

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(habilitacao)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="font-medium text-foreground">
                    {propostaNomeHabilitacao(
                      habilitacao.propostaEdital,
                      propostas,
                      habilitacao.nomePropostaEdital,
                    )}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {agenteNomeHabilitacao(
                      habilitacao.agente,
                      agentes,
                      habilitacao.nomeAgente,
                    )}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Limite</p>
                      <p className="font-medium text-foreground">
                        {formatDateBr(habilitacao.dataLimiteHabilitacao)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Envio</p>
                      <p className="text-foreground">
                        {formatDateBr(habilitacao.dataEnvioDocumentacao)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Retorno</p>
                      <p className="text-foreground">
                        {formatDateBr(habilitacao.dataRetornoAnalise)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Conclusão</p>
                      <p className="text-foreground">
                        {formatDateBr(
                          habilitacao.dataConclusaoHabilitacao,
                        )}
                      </p>
                    </div>
                  </div>

                  {(habilitacao.exigenciaOuPendencia ||
                    habilitacao.motivoInabilitacao) && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {habilitacao.exigenciaOuPendencia ||
                          habilitacao.motivoInabilitacao}
                      </p>
                    )}
                </div>
              ))
            )}
          </div>

          <TablePagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onCopy={handleCopy}
          />
        </div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover Habilitação Documental?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton pageTitle="Habilitação Documental" />
    </AppLayout>
  );
}

function EmptyRow({
  message,
  colspan,
}: {
  message: string;
  colspan: number;
}) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </td>
    </tr>
  );
}

function MobileEmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center">
      <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/40" />

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
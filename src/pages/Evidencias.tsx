import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Camera,
  ExternalLink,
  Paperclip,
  Eye,
  ShieldCheck,
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
import { exportEvidenciaExecucaoPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
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
  deleteEvidenciaExecucao,
  getAcoesDivulgacaoOptions,
  getAtividadesOptions,
  getEvidenciasExecucao,
  getEvidenciaArquivoDownloadUrl,
  getEventosCulturaisOptions,
  getPresencasOptions,
  getProjetosOptions,
  getPropostasEditalOptions,
  getTurmasOptions,
  optionName,
  tipoEvidenciaLabel,
  tipoVinculoLabel,
  vinculoRelacionadoTexto,
  type Evidencia,
  type OptionItem,
} from "@/data/evidencias";
import { toast } from "sonner";

const EVIDENCIA_NEXT_STEP_KEY = "aurit:evidencias:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface EvidenciaNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function EvidenciasPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<EvidenciaNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const [projetos, setProjetos] = useState<OptionItem[]>([]);
  const [propostasEdital, setPropostasEdital] = useState<OptionItem[]>([]);
  const [atividades, setAtividades] = useState<OptionItem[]>([]);
  const [turmas, setTurmas] = useState<OptionItem[]>([]);
  const [eventos, setEventos] = useState<OptionItem[]>([]);
  const [acoes, setAcoes] = useState<OptionItem[]>([]);
  const [presencas, setPresencas] = useState<OptionItem[]>([]);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR || permissoes.GERAR_PDF;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("EVIDENCIAS");

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
    const raw = sessionStorage.getItem(EVIDENCIA_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as EvidenciaNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EVIDENCIA_NEXT_STEP_KEY);

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

      const [
        evidenciasData,
        projetosData,
        propostasEditalData,
        atividadesData,
        turmasData,
        eventosData,
        acoesData,
        presencasData,
      ] = await Promise.all([
        getEvidenciasExecucao(),
        getProjetosOptions(),
        getPropostasEditalOptions(),
        getAtividadesOptions(),
        getTurmasOptions(),
        getEventosCulturaisOptions(),
        getAcoesDivulgacaoOptions(),
        getPresencasOptions(),
      ]);

      setItems(evidenciasData);
      setProjetos(projetosData);
      setPropostasEdital(propostasEditalData);
      setAtividades(atividadesData);
      setTurmas(turmasData);
      setEventos(eventosData);
      setAcoes(acoesData);
      setPresencas(presencasData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar evidências.";

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

    return items.filter((item) => {
      const projeto = optionName(projetos, item.projeto);
      const propostaEdital = optionName(propostasEdital, item.propostaEdital);

      const vinculo = vinculoRelacionadoTexto(item, {
        propostasEdital,
        atividades,
        turmas,
        eventos,
        acoes,
        presencas,
      });

      return [
        item.tituloEvidencia,
        tipoEvidenciaLabel(item.tipoEvidencia),
        tipoVinculoLabel(item.tipoVinculoEvidencia),
        projeto,
        propostaEdital,
        vinculo,
        item.observacaoEvidencia,
        item.urlPublicacao,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [
    search,
    items,
    projetos,
    propostasEdital,
    atividades,
    turmas,
    eventos,
    acoes,
    presencas,
  ]);

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

  async function handleDelete() {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para remover evidências.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEvidenciaExecucao(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Evidência removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover evidência.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  async function handleAbrirArquivo(item: Evidencia) {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para abrir arquivos de evidências.");
      return;
    }

    if (!item.urlArquivo) {
      toast.info("Nenhum arquivo disponível para esta evidência.");
      return;
    }

    try {
      const urlTemporaria = await getEvidenciaArquivoDownloadUrl(Number(item.id));
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir arquivo.",
      );
    }
  }

  async function handleExportPdf(item: Evidencia) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const projeto = optionName(projetos, item.projeto);

    const vinculoRelacionado = vinculoRelacionadoTexto(item, {
      propostasEdital,
      atividades,
      turmas,
      eventos,
      acoes,
      presencas,
    });

    await exportEvidenciaExecucaoPdf({
      id: item.id,
      tituloEvidencia: item.tituloEvidencia?.trim() || "(Sem título)",
      observacaoEvidencia: item.observacaoEvidencia,

      urlArquivo: item.urlArquivo
        ? await getEvidenciaArquivoDownloadUrl(Number(item.id))
        : "",
      urlPublicacao: item.urlPublicacao,

      tipoEvidencia: tipoEvidenciaLabel(item.tipoEvidencia),

      projeto,

      tipoVinculoEvidencia: tipoVinculoLabel(item.tipoVinculoEvidencia),
      vinculoRelacionado,

      propostaEdital: optionName(propostasEdital, item.propostaEdital),
      atividade: optionName(atividades, item.atividade),
      turma: optionName(turmas, item.turma),
      eventoCultural: optionName(eventos, item.eventoCultural),
      acaoDivulgacao: optionName(acoes, item.acaoDivulgacao),
      presenca: optionName(presencas, item.presenca),
    });
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
        <div className="mb-5 rounded-lg border border-border bg-secondary/40 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                Prestação de Contas
              </span>

              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Evidências de Execução
                </h1>

                <HelpTooltip
                  text="Registre e organize evidências da execução do projeto e da proposta de edital, como fotos, vídeos, listas de presença, relatórios, materiais gráficos, documentos e links de publicações. Vincule cada evidência ao item que ela comprova para facilitar relatórios, comprovações e prestação de contas."
                  label="Evidências de execução"
                  size="md"
                  side="bottom"
                  align="start"
                />
              </div>
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

        <div className="mb-5 rounded border border-border bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Registre aqui fotos, vídeos, listas de presença, documentos, materiais
          gráficos e links que comprovem a execução das ações do projeto. Sempre
          vincule cada evidência ao item correspondente, como proposta de edital,
          atividade, turma, presença, evento cultural ou ação de divulgação.
        </div>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar evidência"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/evidencias/novo")}
                className="h-9 gap-2 self-start"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Evidência
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1320px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Título
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de evidência
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de vínculo
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Projeto
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vínculo relacionado
                  </th>

                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Arquivo
                  </th>

                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Link da publicação
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
                {paginated.map((item) => {
                  const titulo =
                    item.tituloEvidencia?.trim() || "(Sem título)";
                  const projeto = optionName(projetos, item.projeto);
                  const vinculo = vinculoRelacionadoTexto(item, {
                    propostasEdital,
                    atividades,
                    turmas,
                    eventos,
                    acoes,
                    presencas,
                  });

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/evidencias/${item.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/evidencias/${item.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(item.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={titulo} bold>
                          {titulo}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={tipoEvidenciaLabel(item.tipoEvidencia)}
                          muted
                        >
                          {tipoEvidenciaLabel(item.tipoEvidencia)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={tipoVinculoLabel(item.tipoVinculoEvidencia)}
                          muted
                        >
                          {tipoVinculoLabel(item.tipoVinculoEvidencia)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={projeto} muted>
                          {projeto}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={vinculo}>{vinculo}</TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        {podeBaixar && item.urlArquivo ? (
                          <button
                            type="button"
                            onClick={() => void handleAbrirArquivo(item)}
                            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Ver arquivo
                          </button>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        {podeBaixar && item.urlPublicacao ? (
                          <a
                            href={item.urlPublicacao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir link
                          </a>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(item)}
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
                  <EmptyRow colspan={podeGerarPdf ? 9 : 8} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Camera className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma evidência encontrada.
                </p>
              </div>
            ) : (
              paginated.map((item) => {
                const vinculo = vinculoRelacionadoTexto(item, {
                  propostasEdital,
                  atividades,
                  turmas,
                  eventos,
                  acoes,
                  presencas,
                });

                return (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/evidencias/${item.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/evidencias/${item.id}/editar`)
                            }
                          />
                        )}

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(item.id)}
                          />
                        )}
                      </div>

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(item)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {item.tituloEvidencia?.trim() || "(Sem título)"}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tipoEvidenciaLabel(item.tipoEvidencia)} ·{" "}
                      {tipoVinculoLabel(item.tipoVinculoEvidencia)}
                    </p>

                    <p className="mt-2 text-sm text-foreground">
                      {optionName(projetos, item.projeto)}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Vínculo: {vinculo}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {podeBaixar && item.urlArquivo && (
                        <button
                          type="button"
                          onClick={() => void handleAbrirArquivo(item)}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Arquivo
                        </button>
                      )}

                      {podeBaixar && item.urlPublicacao && (
                        <a
                          href={item.urlPublicacao}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Publicação
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
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
            <AlertDialogTitle>Remover evidência?</AlertDialogTitle>

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

      <WikiFloatingButton
        pageTitle="Evidências de Execução"
        href="https://www.aurit.com.br/wiki/evidencias/evidencias-de-execucao"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <Camera className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma evidência encontrada.
        </p>
      </td>
    </tr>
  );
}
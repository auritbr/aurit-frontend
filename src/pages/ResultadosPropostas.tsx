import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Award,
  FileText,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/PageTitle";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportResultadoPropostaPdf } from "@/lib/pdfExporters";
import { getTipoPlanoAtual } from "@/lib/plano";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteResultadoProposta,
  editalNomeResultado,
  formatDateBr,
  formatPontuacao,
  getPropostasEditalOptions,
  getResultadosPropostas,
  propostaNomeResultado,
  statusResultadoPropostaLabel,
  statusResultadoPropostaTone,
  type PropostaEditalOption,
  type ResultadoProposta,
} from "@/data/resultadosPropostas";
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

type SortKey = "proposta" | "edital" | "status" | "pontuacao" | "dataResultado" | "recurso" | "relatorio";

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))] border-[hsl(var(--status-pending-fg)/0.3)]",
  success:
    "bg-[hsl(var(--status-active-bg))] text-[hsl(var(--status-active-fg))] border-[hsl(var(--status-active-fg)/0.3)]",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

function StatusBadge({ value }: { value: string }) {
  const tone = statusResultadoPropostaTone(value);

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${toneClass[tone] ?? toneClass.neutral
        }`}
    >
      {statusResultadoPropostaLabel(value)}
    </span>
  );
}

export default function ResultadosPropostas() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ResultadoProposta[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
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
        setAccessDeniedMessage(null);

        const data =
          await getPermissoesUsuarioLogadoPorModulo("RESULTADO_PROPOSTA");

        if (!active) return;

        setPermissoes(data);

        const tipoPlano = await getTipoPlanoAtual();

        if (!active) return;

        if (tipoPlano === "PLANO_GRATUITO") {
          setAccessDeniedMessage(
            "Este módulo está disponível apenas no plano pago.",
          );
          return;
        }

        if (!data.VISUALIZAR) {
          return;
        }
      } catch (error) {
        console.error(error);

        if (!active) return;

        const message =
          error instanceof Error
            ? error.message
            : "Erro ao verificar acesso aos resultados da proposta.";

        if (isPlanoAccessDenied(message)) {
          setAccessDeniedMessage(message);
          return;
        }

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
    if (loadingPermissoes) return;

    if (accessDeniedMessage) {
      setLoading(false);
      return;
    }

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregarDados();
  }, [accessDeniedMessage, loadingPermissoes, podeVisualizar]);

  async function carregarDados() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [resultadosData, propostasData] = await Promise.all([
        getResultadosPropostas(),
        getPropostasEditalOptions(),
      ]);

      setItems(resultadosData);
      setPropostas(propostasData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar Resultados da Proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaNome = (item: ResultadoProposta) =>
    propostaNomeResultado(
      item.propostaEdital,
      propostas,
      item.nomePropostaEdital,
    );

  const editalNome = (item: ResultadoProposta) =>
    editalNomeResultado(item.propostaEdital, propostas, item.nomeEdital);

  const getDataEnvioRecurso = (item: ResultadoProposta) =>
    (item as any).dataEnvioRecurso ??
    (item as any).dataRecurso ??
    (item as any).dataInterposicaoRecurso ??
    null;

  const getDescricaoRecurso = (item: ResultadoProposta) =>
    (item as any).descricaoRecurso ??
    (item as any).justificativaRecurso ??
    (item as any).observacaoRecurso ??
    null;

  const getDocumentoRecurso = (item: ResultadoProposta) =>
    (item as any).documentoRecurso ??
    (item as any).urlDocumentoRecurso ??
    (item as any).urlRecurso ??
    (item as any).arquivoRecurso ??
    null;

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) =>
      [
        propostaNome(item),
        editalNome(item),
        statusResultadoPropostaLabel(item.statusResultadoProposta),
        formatPontuacao(item.pontuacao),
        formatDateBr(item.dataResultado),
        item.recursoInterposto ? "sim recurso" : "não sem recurso",
        item.urlRelatorioAvaliacao ? "anexado relatório" : "sem relatório",
        item.observacoes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, items, propostas]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "proposta":
          return propostaNome(item);
        case "edital":
          return editalNome(item);
        case "status":
          return statusResultadoPropostaLabel(item.statusResultadoProposta);
        case "pontuacao":
          return Number(item.pontuacao || 0);
        case "dataResultado":
          return item.dataResultado ?? "";
        case "recurso":
          return item.recursoInterposto;
        case "relatorio":
          return item.urlRelatorioAvaliacao ? "Anexado" : "Sem relatório";
        default:
          return "";
      }
    },
  );

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(sortedItems, 25, search);

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
      toast.error("Você não possui permissão para excluir Resultado da Proposta.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteResultadoProposta(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Resultado da Proposta excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir Resultado da Proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  async function handleExportPdf(item: ResultadoProposta) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    try {
      await exportResultadoPropostaPdf({
        id: item.id,
        propostaEdital: propostaNome(item),
        statusResultadoProposta: statusResultadoPropostaLabel(
          item.statusResultadoProposta,
        ),
        dataResultado: item.dataResultado,
        pontuacao: item.pontuacao,

        abriuRecurso: item.recursoInterposto,
        recursoAberto: item.recursoInterposto,

        dataEnvioRecurso: getDataEnvioRecurso(item),
        descricaoRecurso: getDescricaoRecurso(item),
        documentoRecurso: getDocumentoRecurso(item),

        observacoes: item.observacoes,
      });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a ficha do resultado da proposta.");
    }
  }

  if (accessDeniedMessage) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

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
          title="Resultado da Proposta"
          tooltip="Registre e acompanhe o resultado das propostas inscritas em editais, incluindo status, pontuação, relatório de avaliação e informações de recurso quando houver."
        />

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar resultado"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/resultados-propostas/novo")}
                className="h-9 gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Resultado
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <SortableHeader
                    label="Proposta"
                    sortKey="proposta"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Edital"
                    sortKey="edital"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Pontuação"
                    sortKey="pontuacao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Data do resultado"
                    sortKey="dataResultado"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Recurso"
                    sortKey="recurso"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Relatório de avaliação"
                    sortKey="relatorio"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

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
                  const proposta = propostaNome(item);
                  const edital = editalNome(item);

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
                            onClick={() =>
                              navigate(`/resultados-propostas/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/resultados-propostas/${item.id}/editar`,
                                )
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
                        <TableCellText text={proposta} bold>
                          {proposta}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={edital} muted>
                          {edital}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusBadge value={item.statusResultadoProposta} />
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span className="text-sm font-medium text-foreground">
                          {formatPontuacao(item.pontuacao)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.dataResultado)}
                          muted
                        >
                          {formatDateBr(item.dataResultado)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span className="text-sm text-foreground">
                          {item.recursoInterposto ? "Sim" : "Não"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <span
                          className={`text-sm ${item.urlRelatorioAvaliacao
                            ? "text-foreground"
                            : "text-muted-foreground"
                            }`}
                        >
                          {item.urlRelatorioAvaliacao
                            ? "Anexado"
                            : "Não anexado"}
                        </span>
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
                  <tr>
                    <td
                      colSpan={podeGerarPdf ? 9 : 8}
                      className="px-5 py-16 text-center"
                    >
                      <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum Resultado da Proposta cadastrado.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum Resultado da Proposta cadastrado.
                </p>
              </div>
            ) : (
              paginated.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() =>
                          navigate(`/resultados-propostas/${item.id}`)
                        }
                      />

                      {podeGerarPdf && (
                        <TableActionIcon
                          icon={FileDown}
                          label="Gerar ficha"
                          onClick={() => void handleExportPdf(item)}
                        />
                      )}

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(
                              `/resultados-propostas/${item.id}/editar`,
                            )
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

                    <StatusBadge value={item.statusResultadoProposta} />
                  </div>

                  <p className="font-medium text-foreground">
                    {propostaNome(item)}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {editalNome(item)}
                  </p>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Pontuação</p>

                      <p className="font-medium text-foreground">
                        {formatPontuacao(item.pontuacao)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Resultado</p>

                      <p className="text-foreground">
                        {formatDateBr(item.dataResultado)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Recurso</p>

                      <p className="text-foreground">
                        {item.recursoInterposto ? "Sim" : "Não"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="h-3 w-3" />

                    {item.urlRelatorioAvaliacao
                      ? "Relatório anexado"
                      : "Sem relatório anexado"}
                  </p>

                  {podeGerarPdf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleExportPdf(item)}
                      className="mt-3 h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Gerar ficha
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          <TablePagination
            totalItems={sortedItems.length}
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
            <AlertDialogTitle>Excluir Resultado da Proposta?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O resultado, a pontuação e os
              vínculos com relatório de avaliação e recurso deixarão de aparecer
              no acompanhamento da proposta.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton
        pageTitle="Resultado da Proposta"
        href="https://www.aurit.com.br/wiki/editais/resultado-da-proposta"
      />
    </AppLayout>
  );
}

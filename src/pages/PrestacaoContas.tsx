import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ClipboardCheck,
  Paperclip,
  Eye,
  FileDown,
  Target
} from "lucide-react";

import { PageInfoCard } from "@/components/PageInfoCard";
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
import { exportPrestacaoContasPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  getPrestacoesContas,
  deletePrestacaoContas,
  getPropostasEditalOptions,
  getAgentesOptions,
  getPrestacaoMetasOptions,
  getEquipeProjetoOptions,
  getAcoesDivulgacaoOptions,
  produtosGeradosTexto,
  produtoGeradoLabel,
  formatDateBr,
  type PrestacaoContas,
  type PropostaEditalOption,
  type AgenteOption,
  type PrestacaoMetaOption,
  type EquipeProjetoOption,
  type AcaoDivulgacaoOption,
} from "@/data/prestacaoContas";
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

const PRESTACAO_CONTAS_NEXT_STEP_KEY =
  "aurit:prestacao-contas:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PrestacaoContasNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function PrestacaoContasPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PrestacaoContas[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [prestacaoMetas, setPrestacaoMetas] = useState<PrestacaoMetaOption[]>(
    [],
  );
  const [equipeProjeto, setEquipeProjeto] = useState<EquipeProjetoOption[]>([]);
  const [acoesDivulgacao, setAcoesDivulgacao] = useState<
    AcaoDivulgacaoOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PrestacaoContasNextStepCardData | null>(null);
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

        const data =
          await getPermissoesUsuarioLogadoPorModulo("PRESTACAO_CONTAS");

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
    const raw = sessionStorage.getItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PrestacaoContasNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PRESTACAO_CONTAS_NEXT_STEP_KEY);

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
        prestacoesData,
        propostasData,
        agentesData,
        prestacaoMetasData,
        equipeData,
        acoesData,
      ] = await Promise.all([
        getPrestacoesContas(),
        getPropostasEditalOptions(),
        getAgentesOptions(),
        getPrestacaoMetasOptions(),
        getEquipeProjetoOptions(),
        getAcoesDivulgacaoOptions(),
      ]);

      setItems(prestacoesData);
      setPropostas(propostasData);
      setAgentes(agentesData);
      setPrestacaoMetas(prestacaoMetasData);
      setEquipeProjeto(equipeData);
      setAcoesDivulgacao(acoesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar prestações de contas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaEditalNome = (id?: string) =>
    id
      ? propostas.find((item) => String(item.id) === String(id))?.nome ?? "—"
      : "—";

  const agenteNome = (id?: string) =>
    id
      ? agentes.find((item) => String(item.id) === String(id))?.nome ?? "—"
      : "—";

  const prestacaoMetaNome = (id?: string) =>
    id
      ? prestacaoMetas.find((item) => String(item.id) === String(id))?.nome ??
      `Prestação de meta ${id}`
      : "—";

  const equipeNome = (id?: string) => {
    if (!id) return "—";

    const item = equipeProjeto.find((entry) => String(entry.id) === String(id));

    if (!item) return `Membro ${id}`;

    return item.funcao ? `${item.nome} — ${item.funcao}` : item.nome;
  };

  const acaoDivulgacaoNome = (id?: string) =>
    id
      ? acoesDivulgacao.find((item) => String(item.id) === String(id))?.nome ??
      `Ação ${id}`
      : "—";

  const prestacaoMetasTexto = (item: PrestacaoContas) => {
    if (!item.prestacaoMetas || item.prestacaoMetas.length === 0) return "—";

    return item.prestacaoMetas
      .map((meta) => prestacaoMetaNome(meta.id))
      .join(", ");
  };

  const equipeProjetoTexto = (ids?: string[]) => {
    if (!ids || ids.length === 0) return "—";

    return ids.map((id) => equipeNome(id)).join(", ");
  };

  const acoesDivulgacaoTexto = (ids?: string[]) => {
    if (!ids || ids.length === 0) return "—";

    return ids.map((id) => acaoDivulgacaoNome(id)).join(", ");
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((item) => {
      const proposta = propostaEditalNome(item.propostaEdital).toLowerCase();
      const agente = agenteNome(item.agente).toLowerCase();
      const prestacoesMetasTexto = prestacaoMetasTexto(item).toLowerCase();
      const produtosTexto = produtosGeradosTexto(item.produtosGerados)
        .toLowerCase();
      const equipeTexto = equipeProjetoTexto(item.equipeProjeto).toLowerCase();
      const acoesTexto = acoesDivulgacaoTexto(
        item.acoesDivulgacao,
      ).toLowerCase();

      return [
        proposta,
        agente,
        prestacoesMetasTexto,
        produtosTexto,
        equipeTexto,
        acoesTexto,
        formatDateBr(item.dataEntrega),
        item.outrosProdutosGerados,
        item.disponibilizacaoProdutosPublico,
        item.resultadosGeradosProjeto,
        item.resumoResultados,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [
    search,
    items,
    propostas,
    agentes,
    prestacaoMetas,
    equipeProjeto,
    acoesDivulgacao,
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
      toast.error("Você não possui permissão para excluir prestação de contas.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePrestacaoContas(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Prestação de contas removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao remover prestação de contas.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  async function handleExportPdf(item: PrestacaoContas) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportPrestacaoContasPdf({
      id: item.id,
      propostaEdital: propostaEditalNome(item.propostaEdital),
      agente: agenteNome(item.agente),
      dataEntrega: item.dataEntrega,
      produtosGerados: item.produtosGerados.map(produtoGeradoLabel),
      outrosProdutosGerados: item.outrosProdutosGerados,
      prestacaoMetas: item.prestacaoMetas.map((meta) =>
        prestacaoMetaNome(meta.id),
      ),
      equipeProjeto: item.equipeProjeto.map(equipeNome),
      acoesDivulgacao: item.acoesDivulgacao.map(acaoDivulgacaoNome),
      disponibilizacaoProdutosPublico:
        item.disponibilizacaoProdutosPublico,
      resultadosGeradosProjeto: item.resultadosGeradosProjeto,
      resumoResultados: item.resumoResultados,
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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Prestação de Contas
              </h1>

              <HelpTooltip
                text="Organize o relatório de entrega da execução cultural, vinculando a prestação à proposta de edital, agente responsável, prestações de metas já cadastradas, produtos gerados, equipe do projeto, ações de divulgação e resumo dos resultados."
                label="Prestação de Contas"
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

        <PageInfoCard
          description="Use esta página para registrar o relatório de entrega da prestação de
          contas, reunindo data de entrega, prestações de metas já cadastradas,
          produtos gerados, equipe envolvida, ações de divulgação e resultados
          alcançados pelo projeto."
          icon={Target}
        />

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar prestação de contas"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/prestacao-contas/novo")}
                className="h-9 gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Prestação
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1320px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Ações",
                    "Proposta de edital",
                    "Agente",
                    "Data de entrega",
                    "Produtos gerados",
                    "Prestações de metas",
                    "Equipe do projeto",
                    "Ações de divulgação",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy={header === "Ações" ? true : undefined}
                    >
                      {header}
                    </th>
                  ))}

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
                  const proposta = propostaEditalNome(item.propostaEdital);
                  const agente = agenteNome(item.agente);
                  const produtos = produtosGeradosTexto(item.produtosGerados);
                  const prestacoesMetasTexto = prestacaoMetasTexto(item);
                  const equipeTexto = equipeProjetoTexto(item.equipeProjeto);
                  const acoesTexto = acoesDivulgacaoTexto(
                    item.acoesDivulgacao,
                  );

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
                              navigate(`/prestacao-contas/${item.id}`)
                            }
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(
                                  `/prestacao-contas/${item.id}/editar`,
                                )
                              }
                            />
                          )}

                          <TableActionIcon
                            icon={ClipboardCheck}
                            label="Ver prestações de metas"
                            onClick={() => navigate("/prestacao-metas")}
                          />

                          <TableActionIcon
                            icon={Paperclip}
                            label="Ver evidências"
                            onClick={() => navigate("/evidencias")}
                          />

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
                        <TableCellText text={agente} muted>
                          {agente}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={formatDateBr(item.dataEntrega)}
                          muted
                        >
                          {formatDateBr(item.dataEntrega)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={produtos} muted>
                          {produtos}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={prestacoesMetasTexto} muted>
                          {prestacoesMetasTexto}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={equipeTexto} muted>
                          {equipeTexto}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={acoesTexto} muted>
                          {acoesTexto}
                        </TableCellText>
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
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma prestação de contas cadastrada.
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
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma prestação encontrada.
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
                        onClick={() => navigate(`/prestacao-contas/${item.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/prestacao-contas/${item.id}/editar`)
                          }
                        />
                      )}

                      <TableActionIcon
                        icon={ClipboardCheck}
                        label="Ver prestações de metas"
                        onClick={() => navigate("/prestacao-metas")}
                      />

                      <TableActionIcon
                        icon={Paperclip}
                        label="Ver evidências"
                        onClick={() => navigate("/evidencias")}
                      />

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
                    {propostaEditalNome(item.propostaEdital)}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Agente: {agenteNome(item.agente)}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Entrega:{" "}
                      <span className="text-foreground">
                        {formatDateBr(item.dataEntrega)}
                      </span>
                    </span>

                    <span>
                      Produtos:{" "}
                      <span className="text-foreground">
                        {produtosGeradosTexto(item.produtosGerados)}
                      </span>
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {item.resumoResultados || "Sem resumo informado."}
                  </p>
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
            <AlertDialogTitle>Remover prestação de contas?</AlertDialogTitle>

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
        pageTitle="Prestação de Contas"
        href="https://www.aurit.com.br/wiki/prestacao-de-contas/prestacao-de-contas"
      />
    </AppLayout>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FolderKanban,
  FileDown,
} from "lucide-react";

import { exportProjetoPdf } from "@/lib/pdfExporters";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill, type Status } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import { getColaboradores, type Colaborador } from "@/data/colaboradores";
import {
  areaAtuacaoLabel,
  deleteProjeto,
  getOrganizacoes,
  getProjetos,
  origemProjetoLabel,
  statusProjetoLabel,
  type OrganizacaoOption,
  type Projeto,
} from "@/data/projetos";
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

const PROJETO_NEXT_STEP_KEY = "aurit:projetos:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface ProjetoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function Projetos() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Projeto[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<ProjetoNextStepCardData | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("PROJETOS");

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
    const raw = sessionStorage.getItem(PROJETO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ProjetoNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PROJETO_NEXT_STEP_KEY);

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

      const [projetosData, organizacoesData, colaboradoresData] =
        await Promise.all([
          getProjetos(),
          getOrganizacoes(),
          getColaboradores(),
        ]);

      setItems(projetosData);
      setOrganizacoes(organizacoesData);
      setColaboradores(colaboradoresData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar projetos.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const nomeOrganizacao = (organizacaoId: number | null) =>
    organizacaoId
      ? organizacoes.find((o) => Number(o.id) === Number(organizacaoId))
        ?.nome ?? "—"
      : "—";

  const nomesColaboradores = (ids: number[] = []) =>
    ids
      .map((id) => {
        const colaborador = colaboradores.find(
          (c) => String(c.id) === String(id),
        );

        return colaborador?.nomeCompleto;
      })
      .filter((nome): nome is string => Boolean(nome));

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((p) => {
      const organizacao = nomeOrganizacao(p.organizacaoId).toLowerCase();
      const area = areaAtuacaoLabel(p.areaAtuacao).toLowerCase();
      const status = statusProjetoLabel(p.status).toLowerCase();
      const origem = origemProjetoLabel(p.origemProjeto).toLowerCase();
      const equipe = nomesColaboradores(p.colaboradoresIds)
        .join(" ")
        .toLowerCase();

      return (
        p.nomeProjeto.toLowerCase().includes(s) ||
        p.descricao.toLowerCase().includes(s) ||
        p.objetivoGeral.toLowerCase().includes(s) ||
        p.publicoAlvo.toLowerCase().includes(s) ||
        p.localExecucao.toLowerCase().includes(s) ||
        organizacao.includes(s) ||
        area.includes(s) ||
        status.includes(s) ||
        origem.includes(s) ||
        equipe.includes(s) ||
        (p.acoesAcessibilidade ?? "").toLowerCase().includes(s)
      );
    });
  }, [search, items, organizacoes, colaboradores]);

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
      toast.error("Você não possui permissão para excluir projetos.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteProjeto(confirmDelete);

      setItems((prev) => prev.filter((p) => p.id !== confirmDelete));
      toast.success("Projeto excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir projeto.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const projetoPdfData = (p: Projeto) => ({
    id: String(p.id),
    nomeProjeto: p.nomeProjeto,
    descricao: p.descricao,
    objetivoGeral: p.objetivoGeral,
    publicoAlvo: p.publicoAlvo,
    acoesAcessibilidade: p.acoesAcessibilidade,
    localExecucao: p.localExecucao,
    dataInicio: p.dataInicio,
    dataFim: p.dataFim,
    status: statusProjetoLabel(p.status),
    areaAtuacao: areaAtuacaoLabel(p.areaAtuacao),
    origemProjeto: origemProjetoLabel(p.origemProjeto),
    organizacao: nomeOrganizacao(p.organizacaoId),
    colaboradores: nomesColaboradores(p.colaboradoresIds),
    objetivosEspecificos: p.objetivos.map((o) => o.objetivoEspecifico),
  });

  async function handleExportPdf(p: Projeto) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportProjetoPdf(projetoPdfData(p));
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
        <PageTitle
          title="Projetos"
          tooltip="Cadastre e acompanhe os projetos culturais da organização, reunindo proposta, objetivos, público atendido, acessibilidade, local de execução, equipe, origem e período. Esses dados ajudam a estruturar atividades, cronogramas, relatórios, evidências e prestações de contas."
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

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar projeto"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/projetos/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Projeto
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[140px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome do projeto
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Área de atuação
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Origem
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organização
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data de início
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data de término
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[140px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/projetos/${p.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/projetos/${p.id}/editar`)
                            }
                          />
                        )}

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(p.id)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={p.nomeProjeto} bold>
                        {p.nomeProjeto}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                      {areaAtuacaoLabel(p.areaAtuacao)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                      {origemProjetoLabel(p.origemProjeto)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <StatusPill
                        status={statusProjetoLabel(p.status) as Status}
                      />
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={nomeOrganizacao(p.organizacaoId)}>
                        {nomeOrganizacao(p.organizacaoId)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                      {p.dataInicio || "—"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                      {p.dataFim || "—"}
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(p)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Gerar ficha
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {paginated.length === 0 && (
                  <EmptyRow colspan={podeGerarPdf ? 9 : 8} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum projeto encontrado.
                </p>
              </div>
            ) : (
              paginated.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/projetos/${p.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() => navigate(`/projetos/${p.id}/editar`)}
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(p.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(p)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">{p.nomeProjeto}</p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {areaAtuacaoLabel(p.areaAtuacao)} ·{" "}
                    {origemProjetoLabel(p.origemProjeto)} ·{" "}
                    {nomeOrganizacao(p.organizacaoId)}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill
                      status={statusProjetoLabel(p.status) as Status}
                    />

                    <span className="text-xs text-muted-foreground">
                      {p.dataInicio || "—"} — {p.dataFim || "—"}
                    </span>
                  </div>
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
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o projeto esteja vinculado a
              metas, cronogramas, atividades, eventos ou prestações de contas, o
              backend pode impedir a exclusão para preservar o histórico.
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
        pageTitle="Projetos"
        href="https://www.aurit.com.br/wiki/projetos/projetos"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum projeto encontrado.
        </p>
      </td>
    </tr>
  );
}
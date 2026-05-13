import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  CalendarDays,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NextStepCard } from "@/components/NextStepCard";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { exportAtividadePdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteAtividade,
  formatDateBr,
  getAtividades,
  getColaboradoresOptions,
  getProjetosOptions,
  statusValueToLabel,
  tipoLabel,
  type Atividade,
  type ColaboradorOption,
  type ProjetoOption,
} from "@/data/atividades";
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

const ATIVIDADE_NEXT_STEP_KEY = "aurit:atividades:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface AtividadeNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma atividade encontrada.
        </p>
      </td>
    </tr>
  );
}

export default function Atividades() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Atividade[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [nextStepCard, setNextStepCard] =
    useState<AtividadeNextStepCardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("ATIVIDADES");

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
    const raw = sessionStorage.getItem(ATIVIDADE_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AtividadeNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(ATIVIDADE_NEXT_STEP_KEY);

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    async function carregar() {
      try {
        setLoading(true);

        const [atividadesData, projetosData, colaboradoresData] =
          await Promise.all([
            getAtividades(),
            getProjetosOptions(),
            getColaboradoresOptions(),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);

        const projetosMap = new Map(projetosData.map((p) => [p.id, p.nome]));

        const colaboradoresMap = new Map(
          colaboradoresData.map((c) => [c.id, c.nome]),
        );

        const mapped = atividadesData.map((atividade) => ({
          ...atividade,
          projetoNome: projetosMap.get(atividade.projetoId) ?? "—",
          colaboradoresNomes: atividade.colaboradoresIds.map(
            (colaboradorId) =>
              colaboradoresMap.get(colaboradorId) ?? `ID ${colaboradorId}`,
          ),
        }));

        setItems(mapped);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as atividades.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [loadingPermissoes, podeVisualizar]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter(
      (a) =>
        a.nomeAtividade.toLowerCase().includes(s) ||
        (a.projetoNome ?? "").toLowerCase().includes(s) ||
        (a.localAtividade ?? "").toLowerCase().includes(s) ||
        tipoLabel(a.tipoAtividade).toLowerCase().includes(s) ||
        statusValueToLabel(a.status).toLowerCase().includes(s) ||
        formatDateBr(a.dataInicio).toLowerCase().includes(s) ||
        formatDateBr(a.dataFim).toLowerCase().includes(s) ||
        a.colaboradoresNomes.join(" ").toLowerCase().includes(s),
    );
  }, [search, items]);

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
      toast.error("Você não possui permissão para excluir atividades.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteAtividade(Number(confirmDelete));

      setItems((prev) => prev.filter((a) => a.id !== confirmDelete));
      toast.success("Atividade excluída com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a atividade.",
      );
    }
  };

  const handleExportPdf = async (atividade: Atividade) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportAtividadePdf({
      id: atividade.id,
      nomeAtividade: atividade.nomeAtividade,
      tipoAtividade: atividade.tipoAtividade,
      status: atividade.status,
      projeto: atividade.projetoNome ?? "—",
      local: atividade.localAtividade,
      dataInicio: atividade.dataInicio,
      dataFim: atividade.dataFim,
      quantidadeVagas: atividade.quantidadeVagas,
      publicoBeneficiadoAtividade: atividade.publicoBeneficiadoAtividade,
      descricao: atividade.descricaoAtividade,
      colaboradores: atividade.colaboradoresNomes ?? [],
    });
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando atividades...
          </p>
        </div>
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
          title="Atividades"
          tooltip="Cadastre e acompanhe as atividades vinculadas aos projetos da organização. Informe nome, descrição, público atendido, local, período, vagas e equipe envolvida para organizar a execução, registrar presenças, gerar evidências e apoiar relatórios e prestações de contas."
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

        <div className="bg-card border border-border rounded">
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                aria-label="Buscar atividade"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/atividades/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Atividade
              </Button>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table ref={tableRef} className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 w-[170px] whitespace-nowrap"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Nome da atividade
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Tipo de atividade
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Data de início
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Data de término
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Status
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Projeto
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap">
                    Colaboradores
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 whitespace-nowrap w-[140px]"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((a) => {
                  const colabsTxt = a.colaboradoresNomes.join(", ");

                  return (
                    <tr
                      key={a.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/atividades/${a.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/atividades/${a.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(a.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <TableCellText text={a.nomeAtividade} bold>
                          {a.nomeAtividade}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5 text-[13px] text-foreground whitespace-nowrap">
                        {tipoLabel(a.tipoAtividade)}
                      </td>

                      <td className="px-6 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatDateBr(a.dataInicio)}
                      </td>

                      <td className="px-6 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatDateBr(a.dataFim)}
                      </td>

                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <StatusPill status={statusValueToLabel(a.status)} />
                      </td>

                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <TableCellText text={a.projetoNome ?? "—"}>
                          {a.projetoNome ?? "—"}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5 whitespace-nowrap">
                        {colabsTxt ? (
                          <TableCellText text={colabsTxt} muted>
                            {colabsTxt}
                          </TableCellText>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      {podeGerarPdf && (
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(a)}
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

          <div className="md:hidden divide-y divide-border">
            {paginated.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-center gap-1 mb-3">
                  <TableActionIcon
                    icon={Eye}
                    label="Visualizar"
                    onClick={() => navigate(`/atividades/${a.id}`)}
                  />

                  {podeEditar && (
                    <TableActionIcon
                      icon={Pencil}
                      label="Editar"
                      onClick={() => navigate(`/atividades/${a.id}/editar`)}
                    />
                  )}

                  <TableActionIcon
                    icon={FileText}
                    label="Abrir contrato"
                    onClick={() => navigate(`/atividades/${a.id}/contratos`)}
                  />

                  {podeGerarPdf && (
                    <TableActionIcon
                      icon={FileDown}
                      label="Gerar PDF"
                      onClick={() => void handleExportPdf(a)}
                    />
                  )}

                  {podeExcluir && (
                    <TableActionIcon
                      icon={Trash2}
                      label="Excluir"
                      variant="danger"
                      onClick={() => setConfirmDelete(a.id)}
                    />
                  )}
                </div>

                <p className="font-medium text-foreground">{a.nomeAtividade}</p>

                <p className="text-xs text-muted-foreground mt-0.5">
                  {tipoLabel(a.tipoAtividade)} · {formatDateBr(a.dataInicio)} –{" "}
                  {formatDateBr(a.dataFim)}
                </p>

                <p className="text-sm text-foreground mt-2">
                  {a.projetoNome ?? "—"}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusPill status={statusValueToLabel(a.status)} />

                  <span className="text-xs text-muted-foreground line-clamp-1">
                    • {a.colaboradoresNomes.join(", ") || "Sem colaboradores"}
                  </span>
                </div>
              </div>
            ))}

            {paginated.length === 0 && (
              <div className="p-10 text-center">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma atividade encontrada.
                </p>
              </div>
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>

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
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WikiFloatingButton pageTitle="Atividades" />
    </AppLayout>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
  FileDown,
  Target
} from "lucide-react";

import { PageInfoCard } from "@/components/PageInfoCard";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { useSortableData } from "@/hooks/useSortableData";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportEquipeEditalPdf } from "@/lib/pdfExporters";
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
  deleteEquipeEdital,
  formatBRL,
  getColaboradoresOptions,
  getEquipesEditais,
  getIntegrantesOptions,
  getPropostasEditalOptions,
  tipoPessoaLabel,
  type EquipeEdital,
  type PessoaOption,
  type PropostaEditalOption,
} from "@/data/equipeEdital";
import { toast } from "sonner";

type SortKey = "pessoa" | "tipo" | "funcao" | "cargaHoraria" | "valor" | "proposta";

const EQUIPE_EDITAL_NEXT_STEP_KEY = "aurit:equipe-edital:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface EquipeEditalNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function EquipeEditalPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<EquipeEdital[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [colaboradores, setColaboradores] = useState<PessoaOption[]>([]);
  const [integrantes, setIntegrantes] = useState<PessoaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<EquipeEditalNextStepCardData | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("EQUIPE_EDITAL");

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
    const raw = sessionStorage.getItem(EQUIPE_EDITAL_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as EquipeEditalNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EQUIPE_EDITAL_NEXT_STEP_KEY);

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
        equipesData,
        propostasData,
        colaboradoresData,
        integrantesData,
      ] = await Promise.all([
        getEquipesEditais(),
        getPropostasEditalOptions(),
        getColaboradoresOptions(),
        getIntegrantesOptions(),
      ]);

      setItems(equipesData);
      setPropostas(propostasData);
      setColaboradores(colaboradoresData);
      setIntegrantes(integrantesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar equipe da proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const propostaNome = (id?: string) =>
    id
      ? propostas.find((p) => String(p.id) === String(id))?.nome ?? "—"
      : "—";

  const pessoaNome = (m: EquipeEdital) => {
    if (m.tipoPessoa === "COLABORADOR") {
      return m.colaborador
        ? colaboradores.find((c) => String(c.id) === String(m.colaborador))
          ?.nome ?? "—"
        : "—";
    }

    return m.integrante
      ? integrantes.find((i) => String(i.id) === String(m.integrante))?.nome ??
      "—"
      : "—";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((m) => {
      const pessoa = pessoaNome(m).toLowerCase();
      const funcao = (m.funcaoProjeto ?? "").toLowerCase();
      const proposta = propostaNome(m.propostaEdital).toLowerCase();
      const tipo = tipoPessoaLabel(m.tipoPessoa).toLowerCase();
      const valor = formatBRL(m.valorPrevisto).toLowerCase();
      const miniBio = (m.miniBiografia ?? "").toLowerCase();

      return [pessoa, funcao, proposta, tipo, valor, miniBio]
        .join(" ")
        .includes(s);
    });
  }, [search, items, propostas, colaboradores, integrantes]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (item, key: SortKey) => {
      switch (key) {
        case "pessoa":
          return pessoaNome(item);
        case "tipo":
          return tipoPessoaLabel(item.tipoPessoa);
        case "funcao":
          return item.funcaoProjeto ?? "";
        case "cargaHoraria":
          return Number(item.cargaHorariaPrevista || 0);
        case "valor":
          return Number(item.valorPrevisto || 0);
        case "proposta":
          return propostaNome(item.propostaEdital);
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
      toast.error("Você não possui permissão para remover membros da equipe.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEquipeEdital(Number(confirmDelete));

      setItems((prev) => prev.filter((m) => m.id !== confirmDelete));
      toast.success("Membro da equipe removido com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover membro.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  };

  async function handleExportPdf(m: EquipeEdital) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const tipoPessoa = tipoPessoaLabel(m.tipoPessoa);
    const pessoa = pessoaNome(m);

    await exportEquipeEditalPdf({
      id: m.id,
      propostaEdital: propostaNome(m.propostaEdital),

      tipoPessoa,
      colaborador: m.tipoPessoa === "COLABORADOR" ? pessoa : "",
      integrante: m.tipoPessoa === "INTEGRANTE" ? pessoa : "",
      pessoa,

      funcaoProjeto: m.funcaoProjeto,
      cargaHorariaSemanal: m.cargaHorariaPrevista,
      valorPrevisto: formatBRL(m.valorPrevisto),

      justificativaFuncao: m.justificativaFuncao,
      miniBiografia: m.miniBiografia,
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
        <PageTitle
          title="Equipe da Proposta"
          tooltip="Cadastre os membros que farão parte da equipe da proposta de edital, informando vínculo, função, carga horária, valor previsto, justificativa e mini biografia. Essas informações ajudam a compor o plano de trabalho e demonstrar a capacidade de execução do projeto."
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

        <PageInfoCard
          description="Esta área reúne as pessoas que atuarão na proposta de edital. Informe
          a função de cada membro, sua contribuição para o projeto, carga horária
          prevista, valor planejado e vínculo com a proposta."
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
                aria-label="Buscar membro da equipe"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/equipe-edital/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Equipe
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <SortableHeader
                    label="Pessoa"
                    sortKey="pessoa"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Tipo"
                    sortKey="tipo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Função no projeto"
                    sortKey="funcao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Carga horária"
                    sortKey="cargaHoraria"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Valor previsto"
                    sortKey="valor"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Proposta de edital"
                    sortKey="proposta"
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
                {paginated.map((m) => {
                  const pessoa = pessoaNome(m);
                  const proposta = propostaNome(m.propostaEdital);

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/equipe-edital/${m.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/equipe-edital/${m.id}/editar`)
                              }
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDelete(m.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={pessoa} bold>
                          {pessoa}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={tipoPessoaLabel(m.tipoPessoa)}
                          muted
                        >
                          {tipoPessoaLabel(m.tipoPessoa)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={m.funcaoProjeto || "—"}>
                          {m.funcaoProjeto || "—"}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={`${m.cargaHorariaPrevista}h`}
                          muted
                        >
                          {m.cargaHorariaPrevista}h
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={formatBRL(m.valorPrevisto)} bold>
                          {formatBRL(m.valorPrevisto)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={proposta} muted>
                          {proposta}
                        </TableCellText>
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(m)}
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
                      colSpan={podeGerarPdf ? 8 : 7}
                      className="px-5 py-16 text-center"
                    >
                      <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum membro de equipe cadastrado.
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
                <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum membro encontrado.
                </p>
              </div>
            ) : (
              paginated.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/equipe-edital/${m.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/equipe-edital/${m.id}/editar`)
                          }
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(m.id)}
                        />
                      )}
                    </div>

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(m)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">{pessoaNome(m)}</p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tipoPessoaLabel(m.tipoPessoa)} ·{" "}
                    {m.funcaoProjeto || "Função não informada"}
                  </p>

                  <p className="mt-2 text-sm text-foreground">
                    {propostaNome(m.propostaEdital)}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{m.cargaHorariaPrevista}h</span>

                    <span className="font-medium text-foreground">
                      {formatBRL(m.valorPrevisto)}
                    </span>
                  </div>
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
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da equipe?</AlertDialogTitle>

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
        pageTitle="Equipe da Proposta"
        href="https://www.aurit.com.br/wiki/editais/equipe-da-proposta"
      />
    </AppLayout>
  );
}
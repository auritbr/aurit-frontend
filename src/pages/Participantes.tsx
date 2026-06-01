import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  UserRound,
  FileSignature,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
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
import {
  deleteParticipante,
  getAtividadesOptions,
  getOrganizacoesParticipante,
  getParticipantes,
  getTurmasOptions,
  statusValueToLabel,
  statusMatriculaValueToLabel,
  type AtividadeOption,
  type OrganizacaoOption,
  type Participante,
  type TurmaOption,
} from "@/data/participantes";
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
import { exportTermoImagemPdf } from "@/lib/pdfExporters";
import { toast } from "sonner";

const PARTICIPANTE_NEXT_STEP_KEY = "aurit:participantes:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface ParticipanteNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function Participantes() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Participante[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<ParticipanteNextStepCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("PARTICIPANTES");

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
    const raw = sessionStorage.getItem(PARTICIPANTE_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ParticipanteNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PARTICIPANTE_NEXT_STEP_KEY);

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

    void loadAll();
  }, [loadingPermissoes, podeVisualizar]);

  async function loadAll() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [
        participantesData,
        atividadesData,
        turmasData,
        organizacoesData,
      ] = await Promise.all([
        getParticipantes(),
        getAtividadesOptions(),
        getTurmasOptions(),
        getOrganizacoesParticipante(),
      ]);

      setItems(participantesData);
      setAtividades(atividadesData);
      setTurmas(turmasData);
      setOrganizacoes(organizacoesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os participantes.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      console.error(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const atividadeNome = (id?: string) =>
    id ? atividades.find((a) => a.id === id)?.nomeAtividade ?? id : "";

  const turmaNome = (id?: string) =>
    id ? turmas.find((t) => t.id === id)?.nomeTurma ?? id : "";

  const organizacaoNome = (id?: string) =>
    id ? organizacoes.find((o) => o.id === id)?.nome ?? "—" : "—";

  const formatVinculos = (vs: Participante["vinculos"]) =>
    vs
      .filter((v) => v.atividadeId)
      .map((v) => {
        const atividade = atividadeNome(v.atividadeId);
        const turma = turmaNome(v.turmaId);
        const statusMatricula = v.statusMatricula
          ? statusMatriculaValueToLabel(v.statusMatricula)
          : "";

        const base = turma ? `${atividade} (${turma})` : atividade;

        return statusMatricula ? `${base} - ${statusMatricula}` : base;
      })
      .join(", ");

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((p) => {
      const organizacao = organizacaoNome(p.organizacaoId).toLowerCase();
      const vinculos = formatVinculos(p.vinculos).toLowerCase();
      const status = statusValueToLabel(p.status).toLowerCase();

      return [
        p.nomeCompleto,
        p.nomeResponsavel ?? "",
        p.telefone ?? "",
        p.email ?? "",
        p.cpf ?? "",
        p.rg ?? "",
        organizacao,
        vinculos,
        status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [search, items, atividades, turmas, organizacoes]);

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
      toast.error("Você não possui permissão para excluir participantes.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteParticipante(Number(confirmDelete));

      setItems((prev) => prev.filter((p) => p.id !== confirmDelete));
      toast.success("Participante excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o participante.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  const handleTermo = (id: string) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar termo.");
      return;
    }

    const participante = items.find((item) => item.id === id);

    if (!participante) {
      toast.error("Participante não encontrado.");
      return;
    }

    exportTermoImagemPdf(participante);
    toast.success("Termo de autorização gerado em PDF.");
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
          title="Participantes"
          tooltip="Cadastre e acompanhe os participantes da organização. O vínculo com atividades e turmas é opcional e deve ser preenchido apenas quando o participante estiver matriculado ou vinculado a uma ação específica."
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
                aria-label="Buscar participante"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/participantes/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Participante
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome do Participante
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organização
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Telefone
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Responsável
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Matrículas
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[200px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Termo de Consentimento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((p) => {
                  const vinculos = formatVinculos(p.vinculos);
                  const organizacao = organizacaoNome(p.organizacaoId);

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/participantes/${p.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/participantes/${p.id}/editar`)
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
                        <TableCellText text={p.nomeCompleto} bold>
                          {p.nomeCompleto}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <StatusPill status={statusValueToLabel(p.status) as any} />
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText
                          text={organizacao}
                          muted={organizacao === "—"}
                        >
                          {organizacao}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {p.telefone || "—"}
                      </td>

                      <td className="px-6 py-2.5">
                        {p.nomeResponsavel ? (
                          <TableCellText text={p.nomeResponsavel} muted>
                            {p.nomeResponsavel}
                          </TableCellText>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-2.5">
                        {vinculos ? (
                          <TableCellText text={vinculos} muted>
                            {vinculos}
                          </TableCellText>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTermo(p.id)}
                            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <FileSignature className="h-3.5 w-3.5" />
                            Gerar termo
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <EmptyRow colspan={podeGerarPdf ? 8 : 7} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <UserRound className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum participante encontrado.
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
                        onClick={() => navigate(`/participantes/${p.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/participantes/${p.id}/editar`)
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

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTermo(p.id)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        Termo
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">{p.nomeCompleto}</p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Organização: {organizacaoNome(p.organizacaoId)}
                  </p>

                  {p.nomeResponsavel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Resp.: {p.nomeResponsavel}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={statusValueToLabel(p.status) as any} />

                    <span className="text-xs text-muted-foreground">
                      • {formatVinculos(p.vinculos) || "Sem vínculos"}
                    </span>
                  </div>

                  {p.telefone && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Telefone: {p.telefone}
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
            <AlertDialogTitle>Excluir participante?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o participante esteja
              vinculado a presenças, atividades, turmas ou outros registros, o
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
        pageTitle="Participantes"
        href="https://www.aurit.com.br/wiki/pessoas/participantes"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <UserRound className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum participante encontrado.
        </p>
      </td>
    </tr>
  );
}
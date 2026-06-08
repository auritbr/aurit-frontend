import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  UsersRound,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
import { exportIntegrantePdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  deleteIntegrante,
  generoValueToLabel,
  getIntegrantes,
  getOrganizacoes,
  racaCorValueToLabel,
  statusValueToLabel,
  tipoDeficienciaValueToLabel,
  type Integrante,
  type OrganizacaoOption,
} from "@/data/integrantes";
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

const INTEGRANTE_NEXT_STEP_KEY = "aurit:integrantes:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface IntegranteNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

export default function Integrantes() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Integrante[]>([]);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nextStepCard, setNextStepCard] =
    useState<IntegranteNextStepCardData | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("INTEGRANTES");

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
    const raw = sessionStorage.getItem(INTEGRANTE_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as IntegranteNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(INTEGRANTE_NEXT_STEP_KEY);

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

    void carregarIntegrantes();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregarIntegrantes() {
    try {
      setLoading(true);

      const [integrantesData, organizacoesData] = await Promise.all([
        getIntegrantes(),
        getOrganizacoes(),
      ]);

      setItems(integrantesData);
      setOrganizacoes(organizacoesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar integrantes.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const organizacaoNome = (integrante: Integrante) => {
    if (!integrante.organizacaoId) return "Não se aplica";

    return (
      organizacoes.find(
        (organizacao) =>
          String(organizacao.id) === String(integrante.organizacaoId),
      )?.nomeOrganizacao ?? `Organização ${integrante.organizacaoId}`
    );
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((i) =>
      [
        i.nomeCompleto,
        i.funcaoIntegrante,
        statusValueToLabel(i.status),
        racaCorValueToLabel(i.racaCor),
        generoValueToLabel(i.genero),
        tipoDeficienciaValueToLabel(i.tipoDeficiencia),
        i.email,
        i.telefone,
        i.cpf,
        i.rg,
        organizacaoNome(i),
        i.dataEntrada,
        i.dataSaida,
        i.cidade,
        i.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [search, items, organizacoes]);

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
    if (confirmDelete == null) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir integrantes.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteIntegrante(confirmDelete);

      setItems((prev) => prev.filter((i) => i.id !== confirmDelete));
      toast.success("Integrante excluído com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir integrante.";

      toast.error(message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const statusLabel = (status: string) => statusValueToLabel(status) as Status;

  async function handleExportPdf(i: Integrante) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportIntegrantePdf({
      id: i.id,

      nomeCompleto: i.nomeCompleto,
      dataNascimento: i.dataNascimento,
      cpf: i.cpf,
      rg: i.rg,
      telefone: i.telefone,
      email: i.email,

      racaCor: racaCorValueToLabel(i.racaCor),
      genero: generoValueToLabel(i.genero),
      tipoDeficiencia: tipoDeficienciaValueToLabel(i.tipoDeficiencia),

      cep: i.cep,
      logradouro: i.logradouro,
      numero: i.numero,
      complemento: i.complemento,
      bairro: i.bairro,
      cidade: i.cidade,
      estado: i.estado,

      organizacao: organizacaoNome(i),
      funcaoIntegrante: i.funcaoIntegrante,
      dataEntrada: i.dataEntrada,
      dataSaida: i.dataSaida,
      status: statusValueToLabel(i.status),
    } as any);
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
          title="Integrantes"
          tooltip="Cadastre integrantes que atuam junto à organização, mas que não fazem parte da equipe fixa nem do cadastro de participantes. Este registro pode incluir artistas, parceiros culturais ou pessoas vinculadas a ações específicas."
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
                aria-label="Buscar integrante"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/integrantes/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar Integrante
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[140px] px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Função / atuação
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organização
                  </th>

                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                {paginated.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/integrantes/${i.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/integrantes/${i.id}/editar`)
                            }
                          />
                        )}

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(i.id)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={i.nomeCompleto || "—"} bold>
                        {i.nomeCompleto || "—"}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={i.funcaoIntegrante || "—"}
                        muted={!i.funcaoIntegrante}
                      >
                        {i.funcaoIntegrante || "—"}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={organizacaoNome(i)} muted>
                        {organizacaoNome(i)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <StatusPill status={statusLabel(i.status)} />
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(i)}
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
                  <EmptyRow colspan={podeGerarPdf ? 6 : 5} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum integrante encontrado.
                </p>
              </div>
            ) : (
              paginated.map((i) => (
                <div key={i.id} className="p-4">
                  <div className="mb-3 flex items-center gap-1">
                    <TableActionIcon
                      icon={Eye}
                      label="Visualizar"
                      onClick={() => navigate(`/integrantes/${i.id}`)}
                    />

                    {podeEditar && (
                      <TableActionIcon
                        icon={Pencil}
                        label="Editar"
                        onClick={() => navigate(`/integrantes/${i.id}/editar`)}
                      />
                    )}

                    {podeExcluir && (
                      <TableActionIcon
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                        onClick={() => setConfirmDelete(i.id)}
                      />
                    )}

                    {podeGerarPdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportPdf(i)}
                        className="ml-auto h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">{i.nomeCompleto}</p>

                  {i.funcaoIntegrante && (
                    <p className="mt-2 text-sm text-foreground">
                      {i.funcaoIntegrante}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizacaoNome(i)}
                  </p>

                  <div className="mt-2">
                    <StatusPill status={statusLabel(i.status)} />
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
            <AlertDialogTitle>Excluir integrante?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o integrante esteja
              vinculado a equipe de edital, ações ou outros registros, o backend
              pode impedir a exclusão para preservar o histórico.
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
        pageTitle="Integrantes"
        href="https://www.aurit.com.br/wiki/pessoas/integrantes"
      />
    </AppLayout>
  );
}

function EmptyRow({ colspan }: { colspan: number }) {
  return (
    <tr>
      <td colSpan={colspan} className="px-5 py-16 text-center">
        <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum integrante encontrado.
        </p>
      </td>
    </tr>
  );
}
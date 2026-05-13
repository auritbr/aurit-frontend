import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ArrowLeftRight,
  FileSignature,
} from "lucide-react";

import { exportTermoEmprestimoPdf } from "@/lib/pdfExporters";
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
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  estadoConservacaoEmprestimoLabel,
  statusEmprestimoLabel,
  estadoDevolucaoLabel,
  getEmprestimos,
  deleteEmprestimo,
  tipoDestinatarioLabel,
  type Emprestimo,
} from "@/data/emprestimos";
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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

interface PatrimonioApiDTO {
  id: number;
  numeroPatrimonio: string;
  nomePatrimonio: string;
}

interface ColaboradorApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ParticipanteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface IntegranteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ProjetoApiDTO {
  id: number;
  nomeProjeto: string;
}

interface PropostaEditalApiDTO {
  id: number;
  tituloProjeto?: string;
  nomeProposta?: string;
  tituloProposta?: string;
  nomeProjeto?: string;
}

interface AtividadeApiDTO {
  id: number;
  nomeAtividade: string;
}

interface EventoCulturalApiDTO {
  id: number;
  nomeEvento: string;
}

interface LookupItem {
  id: string;
  nome: string;
  extra?: string;
}

function statusClass(status: string) {
  switch (status) {
    case "EM_ANDAMENTO":
      return "status-pill status-pending";
    case "DEVOLVIDO":
      return "status-pill status-active";
    case "ATRASADO":
      return "status-pill status-pending";
    case "CANCELADO":
      return "status-pill status-inactive";
    default:
      return "status-pill status-inactive";
  }
}

function conservacaoClass(status: string) {
  switch (status) {
    case "NOVO":
      return "status-pill status-active";
    case "USADO":
      return "status-pill status-done";
    case "DANIFICADO":
      return "status-pill status-pending";
    case "INUTILIZADO":
      return "status-pill status-inactive";
    case "CONSERVADO":
      return "status-pill status-active";
    default:
      return "status-pill status-inactive";
  }
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export default function Emprestimos() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Emprestimo[]>([]);

  const [patrimonios, setPatrimonios] = useState<LookupItem[]>([]);
  const [colaboradores, setColaboradores] = useState<LookupItem[]>([]);
  const [participantes, setParticipantes] = useState<LookupItem[]>([]);
  const [integrantes, setIntegrantes] = useState<LookupItem[]>([]);

  const [projetos, setProjetos] = useState<LookupItem[]>([]);
  const [propostasEdital, setPropostasEdital] = useState<LookupItem[]>([]);
  const [atividades, setAtividades] = useState<LookupItem[]>([]);
  const [eventosCulturais, setEventosCulturais] = useState<LookupItem[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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

        const data = await getPermissoesUsuarioLogadoPorModulo("EMPRESTIMOS");

        if (!active) return;

        setPermissoes(data);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setPermissoes(permissoesVazias);
      } finally {
        if (active) {
          setLoadingPermissoes(false);
        }
      }
    }

    void carregarPermissoes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPermissoes) return;

    if (!podeVisualizar) {
      setLoading(false);
      return;
    }

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [
        emprestimosData,
        patrimoniosRes,
        colaboradoresRes,
        participantesRes,
        integrantesRes,
        projetosRes,
        propostasEditalRes,
        atividadesRes,
        eventosCulturaisRes,
      ] = await Promise.all([
        getEmprestimos(),
        fetch(`${API_URL}/patrimonios`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/colaboradores`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/participantes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/integrantes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/projetos`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/propostas-editais`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/atividades`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/eventos-culturais`, { headers: getAuthHeaders() }),
      ]);

      if (!patrimoniosRes.ok) {
        throw new Error(await parseError(patrimoniosRes));
      }

      if (!colaboradoresRes.ok) {
        throw new Error(await parseError(colaboradoresRes));
      }

      if (!participantesRes.ok) {
        throw new Error(await parseError(participantesRes));
      }

      if (!integrantesRes.ok) {
        throw new Error(await parseError(integrantesRes));
      }

      if (!projetosRes.ok) {
        throw new Error(await parseError(projetosRes));
      }

      if (!propostasEditalRes.ok) {
        throw new Error(await parseError(propostasEditalRes));
      }

      if (!atividadesRes.ok) {
        throw new Error(await parseError(atividadesRes));
      }

      if (!eventosCulturaisRes.ok) {
        throw new Error(await parseError(eventosCulturaisRes));
      }

      const patrimoniosData: PatrimonioApiDTO[] =
        await patrimoniosRes.json();

      const colaboradoresData: ColaboradorApiDTO[] =
        await colaboradoresRes.json();

      const participantesData: ParticipanteApiDTO[] =
        await participantesRes.json();

      const integrantesData: IntegranteApiDTO[] = await integrantesRes.json();

      const projetosData: ProjetoApiDTO[] = await projetosRes.json();

      const propostasEditalData: PropostaEditalApiDTO[] =
        await propostasEditalRes.json();

      const atividadesData: AtividadeApiDTO[] = await atividadesRes.json();

      const eventosCulturaisData: EventoCulturalApiDTO[] =
        await eventosCulturaisRes.json();

      setItems(emprestimosData);

      setPatrimonios(
        (patrimoniosData ?? []).map((patrimonio) => ({
          id: String(patrimonio.id),
          nome: patrimonio.nomePatrimonio,
          extra: patrimonio.numeroPatrimonio,
        })),
      );

      setColaboradores(
        (colaboradoresData ?? []).map((colaborador) => ({
          id: String(colaborador.id),
          nome: colaborador.nomeCompleto,
        })),
      );

      setParticipantes(
        (participantesData ?? []).map((participante) => ({
          id: String(participante.id),
          nome: participante.nomeCompleto,
        })),
      );

      setIntegrantes(
        (integrantesData ?? []).map((integrante) => ({
          id: String(integrante.id),
          nome: integrante.nomeCompleto,
        })),
      );

      setProjetos(
        (projetosData ?? []).map((projeto) => ({
          id: String(projeto.id),
          nome: projeto.nomeProjeto,
        })),
      );

      setPropostasEdital(
        (propostasEditalData ?? []).map((proposta) => ({
          id: String(proposta.id),
          nome:
            pickText(
              proposta.tituloProjeto,
              proposta.nomeProposta,
              proposta.tituloProposta,
              proposta.nomeProjeto,
            ) || `Proposta ${proposta.id}`,
        })),
      );

      setAtividades(
        (atividadesData ?? []).map((atividade) => ({
          id: String(atividade.id),
          nome: atividade.nomeAtividade,
        })),
      );

      setEventosCulturais(
        (eventosCulturaisData ?? []).map((evento) => ({
          id: String(evento.id),
          nome: evento.nomeEvento,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os empréstimos.";

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

  const patrimonioLabel = (id: string) => {
    const patrimonio = patrimonios.find((item) => item.id === id);

    return patrimonio ? `${patrimonio.extra} — ${patrimonio.nome}` : "—";
  };

  const destinatarioLabel = (emprestimo: Emprestimo): string => {
    switch (emprestimo.tipoDestinatario) {
      case "COLABORADOR":
        return (
          colaboradores.find((item) => item.id === emprestimo.colaboradorId)
            ?.nome ?? "—"
        );

      case "PARTICIPANTE":
        return (
          participantes.find((item) => item.id === emprestimo.participanteId)
            ?.nome ?? "—"
        );

      case "INTEGRANTE":
        return (
          integrantes.find((item) => item.id === emprestimo.integranteId)
            ?.nome ?? "—"
        );

      case "DESTINATARIO_EXTERNO":
        return emprestimo.destinatarioExterno || "—";

      default:
        return "—";
    }
  };

  const projetoLabel = (id: string) =>
    projetos.find((item) => item.id === id)?.nome ?? "";

  const propostaEditalLabel = (id: string) =>
    propostasEdital.find((item) => item.id === id)?.nome ?? "";

  const atividadeLabel = (id: string) =>
    atividades.find((item) => item.id === id)?.nome ?? "";

  const eventoCulturalLabel = (id: string) =>
    eventosCulturais.find((item) => item.id === id)?.nome ?? "";

  const contextoLabel = (emprestimo: Emprestimo) => {
    const partes = [
      emprestimo.projetoId
        ? `Projeto: ${projetoLabel(emprestimo.projetoId)}`
        : "",

      emprestimo.propostaEditalId
        ? `Proposta: ${propostaEditalLabel(emprestimo.propostaEditalId)}`
        : "",

      emprestimo.atividadeId
        ? `Atividade: ${atividadeLabel(emprestimo.atividadeId)}`
        : "",

      emprestimo.eventoCulturalId
        ? `Evento: ${eventoCulturalLabel(emprestimo.eventoCulturalId)}`
        : "",
    ].filter(Boolean);

    return partes.length > 0 ? partes.join(" • ") : "—";
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) => {
      const patrimonio = patrimonioLabel(item.patrimonioId).toLowerCase();
      const destinatario = destinatarioLabel(item).toLowerCase();
      const status = statusEmprestimoLabel(item.statusEmprestimo).toLowerCase();

      const tipoDestinatario = tipoDestinatarioLabel(
        item.tipoDestinatario,
      ).toLowerCase();

      const conservacao = estadoConservacaoEmprestimoLabel(
        item.estadoConservacao,
      ).toLowerCase();

      const devolucao = item.estadoDevolucao
        ? estadoDevolucaoLabel(item.estadoDevolucao).toLowerCase()
        : "";

      const contexto = contextoLabel(item).toLowerCase();

      return (
        patrimonio.includes(term) ||
        destinatario.includes(term) ||
        status.includes(term) ||
        tipoDestinatario.includes(term) ||
        conservacao.includes(term) ||
        devolucao.includes(term) ||
        contexto.includes(term) ||
        item.dataEmprestimo.toLowerCase().includes(term) ||
        item.dataPrevistaDevolucao.toLowerCase().includes(term) ||
        item.dataDevolucao.toLowerCase().includes(term)
      );
    });
  }, [
    search,
    items,
    patrimonios,
    colaboradores,
    participantes,
    integrantes,
    projetos,
    propostasEdital,
    atividades,
    eventosCulturais,
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

  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir empréstimos.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteEmprestimo(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Empréstimo excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o empréstimo.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  };

  const handleExportTermo = async (emprestimo: Emprestimo) => {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar termo de empréstimo.");
      return;
    }

    await exportTermoEmprestimoPdf(emprestimo);
  };

  if (loadingPermissoes || loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">
            Carregando empréstimos...
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
          title="Empréstimos"
          tooltip="Registre e acompanhe o empréstimo de bens da organização, informando quem recebeu, datas, estado de conservação, contexto de uso, observações e situação da devolução."
        />

        <div className="rounded border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
                aria-label="Buscar empréstimo"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/emprestimos/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Registrar Empréstimo
              </Button>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table ref={tableRef} className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="w-[120px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Patrimônio
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Destinatário
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Empréstimo
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Previsão
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Devolução
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Conservação
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado na devolução
                  </th>

                  <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contexto
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[180px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() => navigate(`/emprestimos/${item.id}`)}
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(`/emprestimos/${item.id}/editar`)
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

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={patrimonioLabel(item.patrimonioId)}
                        bold
                      >
                        {patrimonioLabel(item.patrimonioId)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText text={destinatarioLabel(item)}>
                        {destinatarioLabel(item)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={tipoDestinatarioLabel(item.tipoDestinatario)}
                        muted
                      >
                        {tipoDestinatarioLabel(item.tipoDestinatario)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText text={item.dataEmprestimo}>
                        {item.dataEmprestimo}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={item.dataPrevistaDevolucao || "—"}
                        muted={!item.dataPrevistaDevolucao}
                      >
                        {item.dataPrevistaDevolucao || "—"}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={item.dataDevolucao || "—"}
                        muted={!item.dataDevolucao}
                      >
                        {item.dataDevolucao || "—"}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <span className={conservacaoClass(item.estadoConservacao)}>
                        {estadoConservacaoEmprestimoLabel(
                          item.estadoConservacao,
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <span className={statusClass(item.statusEmprestimo)}>
                        {statusEmprestimoLabel(item.statusEmprestimo)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      {item.statusEmprestimo === "DEVOLVIDO" &&
                        item.estadoDevolucao ? (
                        <span className={conservacaoClass(item.estadoDevolucao)}>
                          {estadoDevolucaoLabel(item.estadoDevolucao)}
                        </span>
                      ) : (
                        <TableCellText text="Não devolvido" muted>
                          Não devolvido
                        </TableCellText>
                      )}
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={contextoLabel(item)} muted>
                        {contextoLabel(item)}
                      </TableCellText>
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportTermo(item)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <FileSignature className="h-3.5 w-3.5" />
                          Gerar termo
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {paginated.length === 0 && (
                  <EmptyRow colSpan={podeGerarPdf ? 12 : 11} />
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum empréstimo encontrado.
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
                        onClick={() => navigate(`/emprestimos/${item.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/emprestimos/${item.id}/editar`)
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
                        onClick={() => void handleExportTermo(item)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        Termo
                      </Button>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {patrimonioLabel(item.patrimonioId)}
                  </p>

                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Para: {destinatarioLabel(item)}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {tipoDestinatarioLabel(item.tipoDestinatario)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={conservacaoClass(item.estadoConservacao)}>
                      {estadoConservacaoEmprestimoLabel(
                        item.estadoConservacao,
                      )}
                    </span>

                    <span className={statusClass(item.statusEmprestimo)}>
                      {statusEmprestimoLabel(item.statusEmprestimo)}
                    </span>

                    {item.statusEmprestimo === "DEVOLVIDO" &&
                      item.estadoDevolucao && (
                        <span className={conservacaoClass(item.estadoDevolucao)}>
                          Devolução: {estadoDevolucaoLabel(item.estadoDevolucao)}
                        </span>
                      )}
                  </div>

                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p>Empréstimo: {item.dataEmprestimo || "—"}</p>
                    <p>Previsão: {item.dataPrevistaDevolucao || "—"}</p>
                    <p>Devolução: {item.dataDevolucao || "—"}</p>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {contextoLabel(item)}
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
            <AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Empréstimos" />
    </AppLayout>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum empréstimo encontrado.
        </p>
      </td>
    </tr>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Handshake,
  Eye,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { ProprietarioLayout } from "@/components/ProprietarioLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { LIMITE_USUARIOS_PLANO_GRATUITO } from "@/lib/plano";
import {
  PlanoBadge,
  RoleBadge,
  StatusEmpresaBadge,
  StatusPagamentoBadge,
  StatusUsuarioBadge,
  TipoLogBadge,
} from "@/components/PlatformBadge";

import {
  alterarPlanoEmpresa,
  alterarStatusEmpresa,
  atualizarPagamentoEmpresa,
  atualizarUsuarioEmpresa,
  buscarEmpresaControle,
  excluirPagamentoEmpresa,
  getPlanoVisualEmpresa,
  listarLogsEmpresa,
  listarPagamentosEmpresa,
  listarUsuariosEmpresa,
  PLANO_LABELS,
  registrarPagamentoEmpresa,
  ROLE_LABELS,
  type EmpresaControle,
  type FormaPagamento,
  type LogAcessoEmpresa,
  type PagamentoEmpresa,
  type SalvarPagamentoPayload,
  type StatusControleProprietario,
  type StatusPagamento,
  type StatusUsuarioPlataforma,
  type TipoPlanoVisual,
  type UserRoleEmpresa,
  type UsuarioEmpresa,
} from "@/data/controleProprietario";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];

  if (dateOnly) {
    const [year, month, day] = dateOnly.split("-");
    return `${day}/${month}/${year}`;
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("pt-BR");
}

function getCompetenciaOrder(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const trimmed = value.trim();

  const matchIso = trimmed.match(/^(\d{4})-(\d{2})$/);

  if (matchIso) {
    return Number(matchIso[1]) * 100 + Number(matchIso[2]);
  }

  const matchBr = trimmed.match(/^(\d{2})\/(\d{4})$/);

  if (matchBr) {
    return Number(matchBr[2]) * 100 + Number(matchBr[1]);
  }

  return Number.MAX_SAFE_INTEGER;
}

function ordenarPagamentosPorCompetencia(
  pagamentos: PagamentoEmpresa[],
): PagamentoEmpresa[] {
  return [...pagamentos].sort((a, b) => {
    const byCompetencia =
      getCompetenciaOrder(a.competencia) - getCompetenciaOrder(b.competencia);

    if (byCompetencia !== 0) return byCompetencia;

    return a.id - b.id;
  });
}

function formatCompetencia(value: string | null | undefined) {
  if (!value) return "—";

  const trimmed = value.trim();
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})$/);

  if (matchIso) {
    return `${matchIso[2]}/${matchIso[1]}`;
  }

  const matchBr = trimmed.match(/^(\d{2})\/(\d{4})$/);

  if (matchBr) {
    return trimmed;
  }

  return trimmed;
}

function maskCompetencia(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseCompetenciaToApi(value: string) {
  const trimmed = value.trim();

  const matchBr = trimmed.match(/^(\d{2})\/(\d{4})$/);

  if (matchBr) {
    return `${matchBr[2]}-${matchBr[1]}`;
  }

  const matchIso = trimmed.match(/^(\d{4})-(\d{2})$/);

  if (matchIso) {
    return trimmed;
  }

  return trimmed;
}

function isCompetenciaValida(value: string) {
  const competenciaApi = parseCompetenciaToApi(value);
  const match = competenciaApi.match(/^(\d{4})-(\d{2})$/);

  if (!match) return false;

  const mes = Number(match[2]);

  return mes >= 1 && mes <= 12;
}

const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  PIX: "Pix",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
};

function formatFormaPagamento(value: FormaPagamento | null | undefined) {
  if (!value) return "—";

  return FORMA_PAGAMENTO_LABELS[value] ?? value;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

function diffCalendarDays(start: Date, end: Date) {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  return Math.floor((endUtc - startUtc) / 86400000);
}

function getDiasAtrasoPagamento(pagamento: PagamentoEmpresa) {
  const vencimento = parseDateOnly(pagamento.dataVencimento);

  if (!vencimento) return "—";

  const dataReferencia = parseDateOnly(pagamento.dataPagamento) ?? new Date();
  const dias = Math.max(0, diffCalendarDays(vencimento, dataReferencia));

  if (dias === 0) return "0";

  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function formatBRL(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const initialPagamento: SalvarPagamentoPayload = {
  valor: 0,
  competencia: "",
  dataVencimento: "",
  dataPagamento: null,
  statusPagamento: "PENDENTE",
  formaPagamento: null,
  referenciaExterna: null,
  observacao: null,
};

export default function ControleEmpresaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const empresaId = Number(id);

  const [empresa, setEmpresa] = useState<EmpresaControle | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoEmpresa[]>([]);
  const [logs, setLogs] = useState<LogAcessoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  const [planoOpen, setPlanoOpen] = useState(false);
  const [novoPlano, setNovoPlano] = useState<TipoPlanoVisual | "">("");
  const [novoLimiteUsuarios, setNovoLimiteUsuarios] = useState<number>(10);

  const [confirmStatus, setConfirmStatus] =
    useState<StatusControleProprietario | null>(null);

  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [editingPgto, setEditingPgto] = useState<PagamentoEmpresa | null>(null);
  const [viewPgto, setViewPgto] = useState<PagamentoEmpresa | null>(null);
  const [confirmDeletePgto, setConfirmDeletePgto] = useState<number | null>(
    null,
  );

  const [novoPgto, setNovoPgto] =
    useState<SalvarPagamentoPayload>(initialPagamento);

  const [editUser, setEditUser] = useState<UsuarioEmpresa | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRoleEmpresa>("USER");
  const [editUserStatus, setEditUserStatus] =
    useState<StatusUsuarioPlataforma>("ATIVO");

  const usuariosPagination = usePagination(usuarios, 10, "");
  const pagamentosOrdenados = useMemo(
    () => ordenarPagamentosPorCompetencia(pagamentos),
    [pagamentos],
  );

  const pagamentosPagination = usePagination(pagamentosOrdenados, 10, "");
  const logsPagination = usePagination(logs, 10, "");

  async function carregarDados() {
    if (!empresaId || Number.isNaN(empresaId)) {
      setEmpresa(null);
      setUsuarios([]);
      setPagamentos([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const empresaData = await buscarEmpresaControle(empresaId);

      if (!empresaData) {
        setEmpresa(null);
        setUsuarios([]);
        setPagamentos([]);
        setLogs([]);
        return;
      }

      setEmpresa(empresaData);

      const controleId = empresaData.id;

      const [usuariosData, pagamentosData, logsData] = await Promise.all([
        listarUsuariosEmpresa(controleId),
        listarPagamentosEmpresa(controleId),
        listarLogsEmpresa(controleId),
      ]);

      setUsuarios(usuariosData);
      setPagamentos(pagamentosData);
      setLogs(logsData);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os detalhes da empresa.");

      setEmpresa(null);
      setUsuarios([]);
      setPagamentos([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, [empresaId]);

  async function handleAlterarPlano() {
    if (!empresa || !novoPlano) return;

    try {
      const atualizada = await alterarPlanoEmpresa(
        empresa.id,
        novoPlano,
        novoPlano === "PLANO_GRATUITO"
          ? LIMITE_USUARIOS_PLANO_GRATUITO
          : novoLimiteUsuarios,
      );

      setEmpresa(atualizada);
      setPlanoOpen(false);
      setNovoPlano("");

      toast.success(`Plano alterado para ${PLANO_LABELS[novoPlano]}.`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar plano.",
      );
    }
  }

  async function handleAlterarStatus() {
    if (!empresa || !confirmStatus) return;

    const novoStatus = confirmStatus;

    try {
      const atualizada = await alterarStatusEmpresa(empresa.id, novoStatus);

      setEmpresa(atualizada);
      setConfirmStatus(null);

      if (novoStatus === "INATIVO") {
        setUsuarios((prev) =>
          prev.map((usuario) => ({
            ...usuario,
            statusUsuario: "INATIVO",
          })),
        );

        usuariosPagination.setCurrentPage(1);

        toast.success("Empresa inativada e usuários desligados.");
        return;
      }

      const usuariosAtualizados = await listarUsuariosEmpresa(empresa.id);
      setUsuarios(usuariosAtualizados);
      usuariosPagination.setCurrentPage(1);

      toast.success("Empresa ativada.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar status.",
      );
    }
  }

  function openNovoPagamento() {
    setEditingPgto(null);
    setNovoPgto(initialPagamento);
    setPagamentoOpen(true);
  }

  function openEditarPagamento(p: PagamentoEmpresa) {
    setEditingPgto(p);

    setNovoPgto({
      valor: p.valor,
      competencia: formatCompetencia(p.competencia) === "—" ? "" : formatCompetencia(p.competencia),
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      statusPagamento: p.statusPagamento,
      formaPagamento: p.formaPagamento,
      referenciaExterna: p.referenciaExterna,
      observacao: p.observacao,
    });

    setPagamentoOpen(true);
  }

  async function handleSalvarPagamento() {
    if (!empresa) return;

    if (!novoPgto.valor && novoPgto.valor !== 0) {
      toast.error("Informe o valor.");
      return;
    }

    if (!novoPgto.competencia.trim()) {
      toast.error("Informe a competência.");
      return;
    }

    if (!isCompetenciaValida(novoPgto.competencia)) {
      toast.error("Informe a competência no formato MM/AAAA. Ex.: 01/2026.");
      return;
    }

    if (!novoPgto.dataVencimento.trim()) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const pagamentoPayload: SalvarPagamentoPayload = {
      ...novoPgto,
      competencia: parseCompetenciaToApi(novoPgto.competencia),
    };

    try {
      if (editingPgto) {
        const atualizado = await atualizarPagamentoEmpresa(
          empresa.id,
          editingPgto.id,
          pagamentoPayload,
        );

        setPagamentos((prev) =>
          prev.map((p) => (p.id === atualizado.id ? atualizado : p)),
        );

        toast.success("Pagamento atualizado.");
      } else {
        const criado = await registrarPagamentoEmpresa(empresa.id, pagamentoPayload);

        setPagamentos((prev) => [criado, ...prev]);
        pagamentosPagination.setCurrentPage(1);

        toast.success("Pagamento registrado.");
      }

      setPagamentoOpen(false);
      setEditingPgto(null);
      setNovoPgto(initialPagamento);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar pagamento.",
      );
    }
  }

  async function handleDeletePagamento() {
    if (!empresa || confirmDeletePgto == null) return;

    try {
      await excluirPagamentoEmpresa(empresa.id, confirmDeletePgto);

      setPagamentos((prev) => prev.filter((p) => p.id !== confirmDeletePgto));
      setConfirmDeletePgto(null);

      toast.success("Pagamento excluído.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir pagamento.",
      );
    }
  }

  function openEditarUsuario(usuario: UsuarioEmpresa) {
    setEditUser(usuario);
    setEditUserRole(usuario.userRole);
    setEditUserStatus(usuario.statusUsuario);
  }

  async function handleSaveUser() {
    if (!empresa || !editUser) return;

    try {
      const atualizado = await atualizarUsuarioEmpresa(empresa.id, editUser.id, {
        userRole: editUserRole,
        statusUsuario: editUserStatus,
      });

      setUsuarios((prev) =>
        prev.map((u) => (u.id === atualizado.id ? atualizado : u)),
      );

      setEditUser(null);

      toast.success("Usuário atualizado.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar usuário.",
      );
    }
  }

  if (loading) {
    return (
      <ProprietarioLayout>
        <div className="container max-w-[1400px] py-6 sm:py-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 h-8 text-muted-foreground"
            onClick={() => navigate("/controle-proprietario/empresas")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Controle de Empresas
          </Button>

          <div className="rounded border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Carregando dados da empresa...
            </p>
          </div>
        </div>
      </ProprietarioLayout>
    );
  }

  if (!empresa) {
    return (
      <ProprietarioLayout>
        <div className="container max-w-[1400px] py-6 sm:py-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 h-8 text-muted-foreground"
            onClick={() => navigate("/controle-proprietario/empresas")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Controle de Empresas
          </Button>

          <div className="rounded border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">
              Empresa não encontrada
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Não foi possível carregar os dados desta empresa.
            </p>
          </div>
        </div>
      </ProprietarioLayout>
    );
  }

  const statusControleProprietario =
    empresa.statusControleProprietario ?? "ATIVO";

  const blocked = statusControleProprietario === "INATIVO";

  return (
    <ProprietarioLayout>
      <div className="container max-w-[1400px] py-6 sm:py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 h-8 text-muted-foreground"
          onClick={() => navigate("/controle-proprietario/empresas")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Controle de Empresas
        </Button>

        <PageTitle
          title={`Empresa: ${empresa.nomeEmpresa}`}
          tooltip="Detalhes da empresa cliente: dados gerais, usuários, pagamentos e logs de acesso."
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() =>
                  navigate(
                    `/controle-proprietario/empresas/${empresa.id}/configuracao/${empresa.configuracaoEmpresaId}`,
                  )
                }
              >
                <Settings className="h-3.5 w-3.5" />
                Editar Configuração
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  setNovoPlano(getPlanoVisualEmpresa(empresa));
                  setNovoLimiteUsuarios(empresa.limiteUsuarios);
                  setPlanoOpen(true);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Alterar plano
              </Button>

              {blocked ? (
                <Button
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => setConfirmStatus("ATIVO")}
                >
                  <Power className="h-3.5 w-3.5" />
                  Ativar Empresa
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => setConfirmStatus("INATIVO")}
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  Inativar Empresa
                </Button>
              )}
            </div>
          }
        />

        <p className="-mt-3 mb-4 text-xs text-muted-foreground font-mono">
          {empresa.slug}.aurit.com.br
        </p>

        {blocked && (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 px-4 py-2.5 text-[13px] text-rose-700 dark:text-rose-300">
            Esta empresa está <strong>bloqueada</strong>. Os usuários vinculados
            não conseguem acessar o sistema.
          </div>
        )}

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="h-auto bg-muted/60 p-1">
            <TabsTrigger value="info" className="text-[13px]">
              Informações Gerais
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="text-[13px]">
              Usuários ({usuarios.length})
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="text-[13px]">
              Pagamentos ({pagamentos.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-[13px]">
              Logs de Acesso ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card border border-border rounded p-5">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">

                <div>
                  <h3 className="font-semibold text-foreground">
                    {empresa.nomeEmpresa}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ID Interno: {empresa.id} · Configuração #
                    {empresa.configuracaoEmpresaId}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                <InfoRow
                  label="Subdomínio"
                  value={`${empresa.slug}.aurit.com.br`}
                />
                <InfoRow
                  label="Documento"
                  value={empresa.documentoIdentificacao}
                />
                <InfoRow label="E-mail" value={empresa.emailContato} />
                <InfoRow label="Telefone" value={empresa.telefoneContato} />
                <InfoRow
                  label="Plano atual"
                  value={<PlanoBadge plano={getPlanoVisualEmpresa(empresa)} />}
                />
                <InfoRow
                  label="Status"
                  value={
                    <StatusEmpresaBadge status={statusControleProprietario} />
                  }
                />
                <InfoRow
                  label="Limite de Usuários"
                  value={`${empresa.totalUsuarios} / ${empresa.limiteUsuarios}`}
                />
                <InfoRow
                  label="Data de Criação"
                  value={formatDateTime(empresa.dataCriacao)}
                />
                <InfoRow
                  label="Última Atualização"
                  value={formatDateTime(empresa.dataAtualizacao)}
                />
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-4">
            <div className="bg-card border border-border rounded">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Nome
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Login
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Perfil
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap w-[120px]">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosPagination.paginated.map((u) => {
                      const inativo = u.statusUsuario === "INATIVO";

                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-border/70 last:border-0 hover:bg-muted/30 ${inativo ? "opacity-70" : ""
                            }`}
                        >
                          <td className="px-5 py-2.5 font-medium text-foreground whitespace-nowrap">
                            {u.name}
                          </td>
                          <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                            {u.login}
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <RoleBadge role={u.userRole} />
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <StatusUsuarioBadge status={u.statusUsuario} />
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <TableActionIcon
                                icon={UserCog}
                                label="Editar usuário"
                                onClick={() => openEditarUsuario(u)}
                              />
                              <TableActionIcon
                                icon={ShieldCheck}
                                label="Editar permissões"
                                onClick={() => openEditarUsuario(u)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {usuarios.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-muted-foreground"
                        >
                          Nenhum usuário vinculado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={usuarios.length}
                currentPage={usuariosPagination.currentPage}
                pageSize={usuariosPagination.pageSize}
                onPageChange={usuariosPagination.setCurrentPage}
                onPageSizeChange={usuariosPagination.setPageSize}
              />
            </div>
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-4">
            <div className="bg-card border border-border rounded">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Histórico de pagamentos
                </h3>

                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={openNovoPagamento}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar pagamento
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap w-[140px]">
                        Ações
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Competência
                      </th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Valor
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Vencimento
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Pagamento
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Forma
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Dias de atraso
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagamentosPagination.paginated.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <TableActionIcon
                              icon={Eye}
                              label="Visualizar"
                              onClick={() => setViewPgto(p)}
                            />
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() => openEditarPagamento(p)}
                            />
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDeletePgto(p.id)}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap font-medium text-foreground">
                          {formatCompetencia(p.competencia)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-right tabular-nums">
                          {formatBRL(p.valor)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDate(p.dataVencimento)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <StatusPagamentoBadge status={p.statusPagamento} />
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDate(p.dataPagamento)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatFormaPagamento(p.formaPagamento)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                          {getDiasAtrasoPagamento(p)}
                        </td>
                      </tr>
                    ))}

                    {pagamentos.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-10 text-center text-muted-foreground"
                        >
                          Nenhum pagamento registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={pagamentos.length}
                currentPage={pagamentosPagination.currentPage}
                pageSize={pagamentosPagination.pageSize}
                onPageChange={pagamentosPagination.setCurrentPage}
                onPageSizeChange={pagamentosPagination.setPageSize}
              />
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="bg-card border border-border rounded">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Tipo
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Usuário
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Login
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        IP
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        User Agent
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5">
                        Detalhe
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                        Data/Hora
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {logsPagination.paginated.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <TipoLogBadge tipo={l.tipoLogAcesso} />
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-foreground">
                          {l.nomeUsuario ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {l.loginInformado ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground font-mono text-[12px]">
                          {l.ip ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {l.userAgent ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 text-muted-foreground">
                          {l.detalhe ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(l.dataEvento)}
                        </td>
                      </tr>
                    ))}

                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-muted-foreground"
                        >
                          Nenhum log encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={logs.length}
                currentPage={logsPagination.currentPage}
                pageSize={logsPagination.pageSize}
                onPageChange={logsPagination.setCurrentPage}
                onPageSizeChange={logsPagination.setPageSize}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={planoOpen} onOpenChange={setPlanoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano da empresa</DialogTitle>
            <DialogDescription>
              Plano atual:{" "}
              <strong>{PLANO_LABELS[getPlanoVisualEmpresa(empresa)]}</strong>.
              Selecione o novo plano abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo plano</Label>
              <Select
                value={novoPlano}
                onValueChange={(v) => {
                  const plano = v as TipoPlanoVisual;

                  setNovoPlano(plano);

                  if (plano === "PLANO_GRATUITO") {
                    setNovoLimiteUsuarios(LIMITE_USUARIOS_PLANO_GRATUITO);
                  } else if (!novoLimiteUsuarios || novoLimiteUsuarios < 1) {
                    setNovoLimiteUsuarios(10);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANO_GRATUITO">Gratuito</SelectItem>
                  <SelectItem value="PLANO_CORTESIA">Cortesia</SelectItem>
                  <SelectItem value="PLANO_PAGO">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Limite de usuários</Label>
              <Input
                type="number"
                min={
                  novoPlano === "PLANO_GRATUITO"
                    ? LIMITE_USUARIOS_PLANO_GRATUITO
                    : 1
                }
                disabled={novoPlano === "PLANO_GRATUITO"}
                value={novoLimiteUsuarios}
                onChange={(e) => setNovoLimiteUsuarios(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAlterarPlano} disabled={!novoPlano}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmStatus}
        onOpenChange={(o) => !o && setConfirmStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus === "ATIVO"
                ? "Ativar Empresa?"
                : "Inativar Empresa e desligar usuários?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus === "ATIVO"
                ? "A empresa voltará a ficar ativa. Os usuários não serão reativados automaticamente; caso necessário, reative cada usuário na aba Usuários."
                : "A empresa será bloqueada e todos os usuários vinculados serão marcados como inativos, perdendo o acesso ao sistema imediatamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlterarStatus}
              className={
                confirmStatus === "INATIVO"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmStatus === "ATIVO" ? "Ativar" : "Inativar e desligar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={pagamentoOpen} onOpenChange={setPagamentoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPgto ? "Editar pagamento" : "Registrar pagamento"}
            </DialogTitle>
            <DialogDescription>
              Informe os dados do pagamento da empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={novoPgto.valor}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    valor: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Competência (MM/AAAA)</Label>
              <Input
                value={novoPgto.competencia}
                inputMode="numeric"
                maxLength={7}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    competencia: maskCompetencia(e.target.value),
                  })
                }
                placeholder="01/2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data de vencimento</Label>
              <Input
                type="date"
                value={novoPgto.dataVencimento}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    dataVencimento: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data de pagamento</Label>
              <Input
                type="date"
                value={novoPgto.dataPagamento ?? ""}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    dataPagamento: e.target.value || null,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={novoPgto.statusPagamento}
                onValueChange={(v) =>
                  setNovoPgto({
                    ...novoPgto,
                    statusPagamento: v as StatusPagamento,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="ATRASADO">Atrasado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={novoPgto.formaPagamento ?? ""}
                onValueChange={(v) =>
                  setNovoPgto({
                    ...novoPgto,
                    formaPagamento: v as FormaPagamento,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">Pix</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Referência externa</Label>
              <Input
                value={novoPgto.referenciaExterna ?? ""}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    referenciaExterna: e.target.value || null,
                  })
                }
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observação</Label>
              <Textarea
                rows={3}
                value={novoPgto.observacao ?? ""}
                onChange={(e) =>
                  setNovoPgto({
                    ...novoPgto,
                    observacao: e.target.value || null,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarPagamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewPgto}
        onOpenChange={(open) => !open && setViewPgto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do pagamento</DialogTitle>
            <DialogDescription>
              Informações registradas para esta cobrança.
            </DialogDescription>
          </DialogHeader>

          {viewPgto && (
            <dl className="grid grid-cols-1 gap-3 text-[13px]">
              <InfoRow label="Competência" value={formatCompetencia(viewPgto.competencia)} />
              <InfoRow label="Valor" value={formatBRL(viewPgto.valor)} />
              <InfoRow
                label="Vencimento"
                value={formatDate(viewPgto.dataVencimento)}
              />
              <InfoRow
                label="Pagamento"
                value={formatDate(viewPgto.dataPagamento)}
              />
              <InfoRow
                label="Status"
                value={
                  <StatusPagamentoBadge status={viewPgto.statusPagamento} />
                }
              />
              <InfoRow label="Forma" value={formatFormaPagamento(viewPgto.formaPagamento)} />
              <InfoRow label="Dias de atraso" value={getDiasAtrasoPagamento(viewPgto)} />
              <InfoRow
                label="Referência"
                value={viewPgto.referenciaExterna ?? "—"}
              />
              <InfoRow label="Observação" value={viewPgto.observacao ?? "—"} />
            </dl>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPgto(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeletePgto != null}
        onOpenChange={(o) => !o && setConfirmDeletePgto(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o pagamento do histórico da empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePagamento}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Altere o perfil e o status do usuário vinculado à empresa.
            </DialogDescription>
          </DialogHeader>

          {editUser && (
            <div className="space-y-4">
              <div className="rounded border border-border p-3 bg-muted/30">
                <p className="text-sm font-medium text-foreground">
                  {editUser.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {editUser.login}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select
                  value={editUserRole}
                  onValueChange={(v) => setEditUserRole(v as UserRoleEmpresa)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                    <SelectItem value="USER">{ROLE_LABELS.USER}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editUserStatus}
                  onValueChange={(v) =>
                    setEditUserStatus(v as StatusUsuarioPlataforma)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProprietarioLayout>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <dt className="text-muted-foreground min-w-[140px]">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

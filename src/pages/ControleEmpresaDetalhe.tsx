import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  ExternalLink,
  FileText,
  History,
  Landmark,
  Layers3,
  LogIn,
  Plus,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Settings,
  Settings2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { LIMITE_USUARIOS_PLANO_GRATUITO } from "@/lib/plano";
import { maskMoney, parseMoney } from "@/data/contasPagar";
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
  atualizarAssinaturaCobranca,
  atualizarPagamentoEmpresa,
  atualizarConfiguracaoCobranca,
  atualizarUsuarioEmpresa,
  buscarEmpresaControle,
  cancelarMensalidadeCora,
  conciliarMensalidadeCora,
  consultarConfiguracaoCobranca,
  consultarAssinaturaCobranca,
  consultarStatusIntegracaoCora,
  consultarCobrancaCora,
  emitirCobrancaCora,
  excluirPagamentoEmpresa,
  getPlanoVisualEmpresa,
  listarLogsEmpresa,
  listarMensalidadesCora,
  listarUsuariosEmpresa,
  PLANO_LABELS,
  testarIntegracaoCora,
  ROLE_LABELS,
  type EmpresaControle,
  type AssinaturaCobranca,
  type ConfiguracaoCobranca,
  type DadosPagamentoCora,
  type FormaPagamento,
  type LogAcessoEmpresa,
  type PagamentoEmpresa,
  type SalvarPagamentoPayload,
  type StatusControleProprietario,
  type StatusIntegracaoCora,
  type StatusPagamento,
  type StatusUsuarioPlataforma,
  type TipoPlanoVisual,
  type UserRoleEmpresa,
  type UsuarioEmpresa,
} from "@/data/controleProprietario";

type SummaryTone = "neutral" | "primary" | "success" | "muted";

const summaryToneClasses: Record<SummaryTone, string> = {
  neutral: "border-border/70 bg-muted/50 text-foreground/70",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-primary/20 bg-primary/[0.07] text-primary",
  muted: "border-border/60 bg-muted/40 text-muted-foreground",
};

function SummaryCard({
  label,
  value,
  content,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value?: React.ReactNode;
  content?: React.ReactNode;
  icon: LucideIcon;
  tone?: SummaryTone;
}) {
  return (
    <div className="flex h-full min-h-[86px] items-start gap-3 rounded-[16px] border border-border/70 bg-card/75 px-4 py-3.5 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.30)] backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-card/60 hover:border-border">
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border",
          summaryToneClasses[tone],
        )}
        aria-hidden
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        {value !== undefined ? (
          <p className="text-[22px] font-semibold leading-none tabular-nums text-foreground">
            {value}
          </p>
        ) : (
          content
        )}
        <p className="mt-1.5 truncate text-[12.5px] font-medium leading-tight text-foreground/80">
          {label}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b form-section-glass-divider px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-border/70 bg-muted/50 text-foreground/70"
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

const thBase =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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

function formatMoneyInput(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarEntradaMonetaria(value: string) {
  const somenteNumerosEVirgula = value.replace(/[^\d,]/g, "");
  const [inteiro = "", ...partesDecimais] = somenteNumerosEVirgula.split(",");

  if (partesDecimais.length === 0) return inteiro;

  return `${inteiro || "0"},${partesDecimais.join("").slice(0, 2)}`;
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
  const [cobrancaConfigOpen, setCobrancaConfigOpen] = useState(false);
  const [cobrancaConfig, setCobrancaConfig] =
    useState<ConfiguracaoCobranca | null>(null);
  const [statusCora, setStatusCora] = useState<StatusIntegracaoCora | null>(
    null,
  );
  const [salvandoCobranca, setSalvandoCobranca] = useState(false);
  const [testandoCora, setTestandoCora] = useState(false);
  const [processandoCobrancaId, setProcessandoCobrancaId] = useState<
    number | null
  >(null);
  const [dadosCora, setDadosCora] = useState<DadosPagamentoCora | null>(null);
  const [assinaturaOpen, setAssinaturaOpen] = useState(false);
  const [assinatura, setAssinatura] = useState<AssinaturaCobranca | null>(null);
  const [valorAssinaturaInput, setValorAssinaturaInput] = useState("");
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  const [novoPgto, setNovoPgto] =
    useState<SalvarPagamentoPayload>(initialPagamento);
  const [valorPagamentoInput, setValorPagamentoInput] = useState("");

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

  function abrirConfiguracaoAssinatura() {
    setValorAssinaturaInput(
      assinatura?.valorMensalidade == null
        ? ""
        : formatMoneyInput(assinatura.valorMensalidade),
    );
    setAssinaturaOpen(true);
  }

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

      const [usuariosData, pagamentosData, logsData, assinaturaData] =
        await Promise.all([
          listarUsuariosEmpresa(controleId),
          listarMensalidadesCora(controleId),
          listarLogsEmpresa(controleId),
          consultarAssinaturaCobranca(controleId),
        ]);

      setUsuarios(usuariosData);
      setPagamentos(pagamentosData);
      setLogs(logsData);
      setAssinatura(assinaturaData);
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

  function openEditarPagamento(p: PagamentoEmpresa) {
    setEditingPgto(p);

    setNovoPgto({
      valor: p.valor,
      competencia:
        formatCompetencia(p.competencia) === "—"
          ? ""
          : formatCompetencia(p.competencia),
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      statusPagamento: p.statusPagamento,
      formaPagamento: p.formaPagamento,
      referenciaExterna: p.referenciaExterna,
      observacao: p.observacao,
    });
    setValorPagamentoInput(formatMoneyInput(p.valor));

    setPagamentoOpen(true);
  }

  async function handleSalvarPagamento() {
    if (!empresa || !editingPgto) return;

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
      const atualizado = await atualizarPagamentoEmpresa(
        empresa.id,
        editingPgto.id,
        pagamentoPayload,
      );

      setPagamentos((prev) =>
        prev.map((p) => (p.id === atualizado.id ? atualizado : p)),
      );

      toast.success("Pagamento atualizado.");

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
      const pagamento = pagamentos.find(
        (item) => item.id === confirmDeletePgto,
      );

      if (pagamento?.coraInvoiceId) {
        await cancelarMensalidadeCora(confirmDeletePgto);
        setPagamentos((prev) =>
          prev.map((item) =>
            item.id === confirmDeletePgto
              ? { ...item, statusPagamento: "CANCELADO" }
              : item,
          ),
        );
        toast.success("Cobrança Cora cancelada.");
      } else {
        await excluirPagamentoEmpresa(empresa.id, confirmDeletePgto);
        setPagamentos((prev) => prev.filter((p) => p.id !== confirmDeletePgto));
        toast.success("Mensalidade excluída.");
      }
      setConfirmDeletePgto(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir pagamento.",
      );
    }
  }

  async function abrirConfiguracaoCobranca() {
    try {
      const [configuracao, status] = await Promise.all([
        consultarConfiguracaoCobranca(),
        consultarStatusIntegracaoCora(),
      ]);
      setCobrancaConfig(configuracao);
      setStatusCora(status);
      setCobrancaConfigOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a configuração da Cora.",
      );
    }
  }

  async function salvarAssinatura() {
    if (!assinatura || salvandoAssinatura) return;
    if (
      assinatura.tipoPlano === "PLANO_PAGO" &&
      !assinatura.isentoCobranca &&
      (assinatura.valorMensalidade === null || assinatura.valorMensalidade <= 0)
    ) {
      toast.error("Informe o valor mensal de uma assinatura paga.");
      return;
    }
    if (
      assinatura.cobrancaAutomatica &&
      !assinatura.isentoCobranca &&
      (!assinatura.diaVencimento || assinatura.diaVencimento < 1)
    ) {
      toast.error("Informe o dia de vencimento para a cobrança automática.");
      return;
    }
    try {
      setSalvandoAssinatura(true);
      const atualizada = await atualizarAssinaturaCobranca(assinatura.id, {
        tipoPlano: assinatura.tipoPlano,
        status: assinatura.status,
        valorMensalidade: assinatura.valorMensalidade,
        dataInicio: assinatura.dataInicio,
        diaVencimento: assinatura.diaVencimento,
        proximaCobranca: assinatura.proximaCobranca,
        cobrancaAutomatica: assinatura.cobrancaAutomatica,
        isentoCobranca: assinatura.isentoCobranca,
        motivoIsencao: assinatura.motivoIsencao,
        dataEncerramento: assinatura.dataEncerramento,
        observacaoInterna: assinatura.observacaoInterna,
      });
      setAssinatura(atualizada);
      setAssinaturaOpen(false);
      toast.success("Assinatura configurada para cobrança.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a assinatura.",
      );
    } finally {
      setSalvandoAssinatura(false);
    }
  }

  async function salvarConfiguracaoCobranca() {
    if (!cobrancaConfig || salvandoCobranca) return;
    try {
      setSalvandoCobranca(true);
      const atualizada = await atualizarConfiguracaoCobranca({
        integracaoPagamentoHabilitada:
          cobrancaConfig.integracaoPagamentoHabilitada,
        cobrancaHabilitada: cobrancaConfig.cobrancaHabilitada,
        geracaoAutomaticaHabilitada: cobrancaConfig.geracaoAutomaticaHabilitada,
        diaVencimentoPadrao: cobrancaConfig.diaVencimentoPadrao,
        diasGeracaoAntesVencimento: cobrancaConfig.diasGeracaoAntesVencimento,
        atualizacaoVencidosHabilitada:
          cobrancaConfig.atualizacaoVencidosHabilitada,
        conciliacaoAutomaticaHabilitada:
          cobrancaConfig.conciliacaoAutomaticaHabilitada,
        permitirPix: cobrancaConfig.permitirPix,
        permitirBoleto: cobrancaConfig.permitirBoleto,
      });
      setCobrancaConfig(atualizada);
      toast.success("Configuração de cobrança atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a configuração de cobrança.",
      );
    } finally {
      setSalvandoCobranca(false);
    }
  }

  async function testarCora() {
    if (testandoCora) return;
    try {
      setTestandoCora(true);
      const resultado = await testarIntegracaoCora();
      const status = await consultarStatusIntegracaoCora();
      setStatusCora(status);
      if (resultado.success) toast.success(resultado.message);
      else toast.error(resultado.message);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível testar a integração com a Cora.",
      );
    } finally {
      setTestandoCora(false);
    }
  }

  async function emitirCobranca(pagamento: PagamentoEmpresa) {
    if (processandoCobrancaId !== null) return;
    try {
      setProcessandoCobrancaId(pagamento.id);
      const dados = await emitirCobrancaCora(pagamento.id);
      setDadosCora(dados);
      await carregarDados();
      toast.success("Cobrança Cora pronta para pagamento.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível emitir a cobrança na Cora.",
      );
    } finally {
      setProcessandoCobrancaId(null);
    }
  }

  async function abrirCobrancaCora(pagamento: PagamentoEmpresa) {
    if (pagamento.coraInvoiceId) {
      if (processandoCobrancaId !== null) return;
      try {
        setProcessandoCobrancaId(pagamento.id);
        setDadosCora(await consultarCobrancaCora(pagamento.id));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados da cobrança Cora.",
        );
      } finally {
        setProcessandoCobrancaId(null);
      }
      return;
    }
    await emitirCobranca(pagamento);
  }

  async function conciliarCobranca(pagamento: PagamentoEmpresa) {
    if (processandoCobrancaId !== null) return;
    try {
      setProcessandoCobrancaId(pagamento.id);
      const atualizado = await conciliarMensalidadeCora(pagamento.id);
      setPagamentos((prev) =>
        prev.map((item) => (item.id === atualizado.id ? atualizado : item)),
      );
      toast.success("Cobrança conciliada com a Cora.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível conciliar a cobrança.",
      );
    } finally {
      setProcessandoCobrancaId(null);
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
      const atualizado = await atualizarUsuarioEmpresa(
        empresa.id,
        editUser.id,
        {
          userRole: editUserRole,
          statusUsuario: editUserStatus,
        },
      );

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
          variant="glassGhost"
          size="compact"
          className="mb-3 -ml-1 gap-1.5 text-muted-foreground"
          onClick={() => navigate("/controle-proprietario/empresas")}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Controle de Empresas
        </Button>

        <PageTitle
          title={`Empresa: ${empresa.nomeEmpresa}`}
          tooltip="Detalhes da empresa cliente: dados gerais, usuários, pagamentos e logs de acesso."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="glassSecondary"
                size="compact"
                className="gap-1.5"
                onClick={() =>
                  navigate(
                    `/controle-proprietario/empresas/${empresa.id}/configuracao/${empresa.configuracaoEmpresaId}`,
                  )
                }
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
                Editar Configuração
              </Button>

              <Button
                variant="glassSecondary"
                size="compact"
                className="gap-1.5"
                onClick={() => {
                  setNovoPlano(getPlanoVisualEmpresa(empresa));
                  setNovoLimiteUsuarios(empresa.limiteUsuarios);
                  setPlanoOpen(true);
                }}
              >
                <Settings2 className="h-4 w-4" strokeWidth={2} />
                Alterar plano
              </Button>

              {blocked ? (
                <Button
                  variant="glassPrimary"
                  size="compact"
                  className="gap-1.5"
                  onClick={() => setConfirmStatus("ATIVO")}
                >
                  <Power className="h-4 w-4" strokeWidth={2} />
                  Ativar Empresa
                </Button>
              ) : (
                <Button
                  variant="glassDanger"
                  size="compact"
                  className="gap-1.5"
                  onClick={() => setConfirmStatus("INATIVO")}
                >
                  <PowerOff className="h-4 w-4" strokeWidth={2} />
                  Inativar Empresa
                </Button>
              )}
            </div>
          }
        />

        <p className="-mt-3 mb-4 font-mono text-xs text-muted-foreground">
          {empresa.slug}.aurit.com.br
        </p>

        {blocked && (
          <div className="mb-4 flex items-start gap-2.5 rounded-[14px] border border-destructive/25 bg-destructive/[0.07] px-4 py-3 text-[13px] text-destructive backdrop-blur-md">
            <PowerOff
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            <span>
              Esta empresa está <strong>inativa</strong>. Os usuários vinculados
              não conseguem acessar o sistema.
            </span>
          </div>
        )}

        {(() => {
          const ultimoPgto = pagamentos
            .slice()
            .sort((a, b) =>
              (b.dataVencimento ?? "").localeCompare(a.dataVencimento ?? ""),
            )[0];
          const ultimoLog = logs
            .slice()
            .sort((a, b) =>
              (b.dataEvento ?? "").localeCompare(a.dataEvento ?? ""),
            )[0];
          const ativos = usuarios.filter(
            (usuario) => usuario.statusUsuario === "ATIVO",
          ).length;
          return (
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                label="Plano"
                icon={Layers3}
                tone="primary"
                content={<PlanoBadge plano={getPlanoVisualEmpresa(empresa)} />}
              />
              <SummaryCard
                label="Usuários ativos"
                icon={UsersRound}
                value={
                  <>
                    {ativos}
                    <span className="font-normal text-muted-foreground">
                      /{empresa.limiteUsuarios}
                    </span>
                  </>
                }
              />
              <SummaryCard
                label="Último pagamento"
                icon={FileText}
                content={
                  <p className="text-[13.5px] font-medium leading-tight text-foreground">
                    {ultimoPgto
                      ? `${formatBRL(ultimoPgto.valor)} · ${formatCompetencia(ultimoPgto.competencia)}`
                      : "—"}
                  </p>
                }
              />
              <SummaryCard
                label="Último acesso"
                icon={CalendarClock}
                tone="muted"
                content={
                  <p className="text-[13.5px] font-medium leading-tight text-foreground">
                    {ultimoLog ? formatDateTime(ultimoLog.dataEvento) : "—"}
                  </p>
                }
              />
            </div>
          );
        })()}

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="h-auto rounded-[14px] border border-border/70 bg-card/70 p-1 backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
            <TabsTrigger value="info" className="rounded-[10px] text-[13px]">
              Informações Gerais
            </TabsTrigger>
            <TabsTrigger
              value="usuarios"
              className="rounded-[10px] text-[13px]"
            >
              Usuários ({usuarios.length})
            </TabsTrigger>
            <TabsTrigger
              value="pagamentos"
              className="rounded-[10px] text-[13px]"
            >
              Pagamentos ({pagamentos.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-[10px] text-[13px]">
              Logs de Acesso ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <section className="form-section-glass rounded-[18px] p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b form-section-glass-divider pb-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/25 bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Landmark className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {empresa.nomeEmpresa}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ID Interno: {empresa.id} · Configuração #
                    {empresa.configuracaoEmpresaId}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-[13px] md:grid-cols-2">
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
            </section>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-4">
            <section className="form-section-glass overflow-hidden rounded-[18px]">
              <SectionHeader
                icon={UsersRound}
                title="Usuários vinculados"
                description="Perfis e situação dos usuários da organização."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b form-section-glass-divider bg-muted/30">
                      <th className={thBase}>Nome</th>
                      <th className={thBase}>Login</th>
                      <th className={thBase}>Perfil</th>
                      <th className={thBase}>Status</th>
                      <th className={cn(thBase, "w-[120px]")}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosPagination.paginated.map((u) => {
                      const inativo = u.statusUsuario === "INATIVO";

                      return (
                        <tr
                          key={u.id}
                          className={cn(
                            "border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25",
                            inativo && "opacity-70",
                          )}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                            {u.name}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {u.login}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <RoleBadge role={u.userRole} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusUsuarioBadge status={u.statusUsuario} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <RowActionsDropdown
                              onEdit={() => openEditarUsuario(u)}
                              extraItems={[
                                {
                                  label: "Editar permissões",
                                  icon: ShieldCheck,
                                  onClick: () => openEditarUsuario(u),
                                },
                              ]}
                            />
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
            </section>
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-4">
            <section className="form-section-glass overflow-hidden rounded-[18px]">
              <SectionHeader
                icon={FileText}
                title="Mensalidades e cobranças"
                description="Mensalidades locais, emissão Cora, Pix, boleto e situação de pagamento da organização."
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="glassSecondary"
                      size="compact"
                      className="gap-1.5"
                      onClick={abrirConfiguracaoAssinatura}
                    >
                      <CalendarClock className="h-4 w-4" strokeWidth={2} />
                      Configurar assinatura
                    </Button>
                    <Button
                      variant="glassSecondary"
                      size="compact"
                      className="gap-1.5"
                      onClick={abrirConfiguracaoCobranca}
                    >
                      <Settings className="h-4 w-4" strokeWidth={2} />
                      Configurar Cora
                    </Button>
                  </div>
                }
              />

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b form-section-glass-divider bg-muted/30">
                      <th className={cn(thBase, "w-[140px]")}>Ações</th>
                      <th className={thBase}>Competência</th>
                      <th className={cn(thBase, "text-right")}>Valor</th>
                      <th className={thBase}>Vencimento</th>
                      <th className={thBase}>Status</th>
                      <th className={thBase}>Pagamento</th>
                      <th className={thBase}>Forma</th>
                      <th className={thBase}>Cora</th>
                      <th className={thBase}>Dias de atraso</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagamentosPagination.paginated.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                      >
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <RowActionsDropdown
                            onView={() => setViewPgto(p)}
                            onEdit={
                              p.coraInvoiceId
                                ? undefined
                                : () => openEditarPagamento(p)
                            }
                            onDelete={() => setConfirmDeletePgto(p.id)}
                            extraItems={[
                              ...(p.coraInvoiceId
                                ? [
                                    {
                                      label: "Ver Pix e boleto",
                                      icon: FileText,
                                      disabled: processandoCobrancaId !== null,
                                      onClick: () => abrirCobrancaCora(p),
                                    },
                                  ]
                                : p.statusPagamento !== "PAGO" &&
                                    p.statusPagamento !== "CANCELADO"
                                  ? [
                                      {
                                        label: "Emitir na Cora",
                                        icon: FileText,
                                        disabled: processandoCobrancaId !== null,
                                        onClick: () => abrirCobrancaCora(p),
                                      },
                                    ]
                                  : []),
                              ...(p.coraInvoiceId
                                ? [
                                    {
                                      label: "Conciliar pagamento",
                                      icon: RefreshCw,
                                      disabled: processandoCobrancaId !== null,
                                      onClick: () => conciliarCobranca(p),
                                    },
                                  ]
                                : []),
                            ]}
                          />
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
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {p.coraInvoiceId ? "Emitida" : "Não emitida"}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                          {getDiasAtrasoPagamento(p)}
                        </td>
                      </tr>
                    ))}

                    {pagamentos.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
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
            </section>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <section className="form-section-glass overflow-hidden rounded-[18px]">
              <SectionHeader
                icon={LogIn}
                title="Logs de acesso"
                description="Tentativas de login, logout e detalhes técnicos dos acessos."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b form-section-glass-divider bg-muted/30">
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
                        className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
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
            </section>
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
            <Button
              variant="glassSecondary"
              onClick={() => setPlanoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="glassPrimary"
              onClick={handleAlterarPlano}
              disabled={!novoPlano}
            >
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

      <Dialog open={assinaturaOpen} onOpenChange={setAssinaturaOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Configurar assinatura da empresa</DialogTitle>
            <DialogDescription>
              Defina os dados que permitem gerar as mensalidades desta empresa.
              A Cora só recebe cobranças depois que a assinatura estiver paga,
              ativa e com cobrança automática habilitada.
            </DialogDescription>
          </DialogHeader>
          {assinatura && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Plano</Label>
                  <Select
                    value={assinatura.tipoPlano}
                    onValueChange={(value) =>
                      setAssinatura((atual) =>
                        atual
                          ? { ...atual, tipoPlano: value as TipoPlanoVisual }
                          : atual,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANO_GRATUITO">Gratuito</SelectItem>
                      <SelectItem value="PLANO_CORTESIA">Cortesia</SelectItem>
                      <SelectItem value="PLANO_PAGO">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor mensal (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorAssinaturaInput}
                    disabled={
                      assinatura.isentoCobranca ||
                      assinatura.tipoPlano !== "PLANO_PAGO"
                    }
                    onChange={(event) => {
                      const valorDigitado = normalizarEntradaMonetaria(
                        event.target.value,
                      );
                      setValorAssinaturaInput(valorDigitado);
                      setAssinatura((atual) =>
                        atual
                          ? {
                              ...atual,
                              valorMensalidade:
                                valorDigitado === ""
                                  ? null
                                  : parseMoney(valorDigitado),
                            }
                          : atual,
                      );
                    }}
                    onBlur={() => {
                      if (!valorAssinaturaInput) return;
                      setValorAssinaturaInput(
                        formatMoneyInput(parseMoney(valorAssinaturaInput)),
                      );
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dia de vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={assinatura.diaVencimento ?? ""}
                    disabled={
                      assinatura.isentoCobranca ||
                      !assinatura.cobrancaAutomatica
                    }
                    onChange={(event) =>
                      setAssinatura((atual) =>
                        atual
                          ? {
                              ...atual,
                              diaVencimento:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }
                          : atual,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Início cadastral</Label>
                  <Input readOnly value={formatDate(assinatura.dataCriacao)} />
                </div>
              </div>
              <label className="flex items-center gap-2 rounded-[10px] border border-border/60 bg-background/50 px-3 py-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={assinatura.cobrancaAutomatica}
                  onChange={(event) =>
                    setAssinatura((atual) =>
                      atual
                        ? { ...atual, cobrancaAutomatica: event.target.checked }
                        : atual,
                    )
                  }
                />
                Gerar mensalidades automaticamente
              </label>
              <label className="flex items-center gap-2 rounded-[10px] border border-border/60 bg-background/50 px-3 py-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={assinatura.isentoCobranca}
                  onChange={(event) =>
                    setAssinatura((atual) =>
                      atual
                        ? { ...atual, isentoCobranca: event.target.checked }
                        : atual,
                    )
                  }
                />
                Assinatura isenta de cobrança
              </label>
              {assinatura.isentoCobranca && (
                <div className="space-y-1.5">
                  <Label>Motivo da isenção</Label>
                  <Textarea
                    rows={2}
                    value={assinatura.motivoIsencao ?? ""}
                    onChange={(event) =>
                      setAssinatura((atual) =>
                        atual
                          ? {
                              ...atual,
                              motivoIsencao: event.target.value || null,
                            }
                          : atual,
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="glassSecondary"
              onClick={() => setAssinaturaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="glassPrimary"
              onClick={salvarAssinatura}
              disabled={salvandoAssinatura || !assinatura}
            >
              {salvandoAssinatura ? "Salvando..." : "Salvar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cobrancaConfigOpen} onOpenChange={setCobrancaConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuração global de cobrança Cora</DialogTitle>
            <DialogDescription>
              Esta configuração é única para toda a Aurit. As credenciais e os
              certificados continuam somente no ambiente seguro do servidor.
            </DialogDescription>
          </DialogHeader>

          {cobrancaConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-[14px] border border-border/70 bg-muted/30 p-3 text-[12px] sm:grid-cols-2">
                <p>
                  Ambiente: <strong>{statusCora?.environment ?? "—"}</strong>
                </p>
                <p>
                  Integração:{" "}
                  <strong>{statusCora?.integrationStatus ?? "—"}</strong>
                </p>
                <p>
                  Certificado:{" "}
                  <strong>
                    {statusCora?.certificateConfigured
                      ? "configurado"
                      : "não encontrado"}
                  </strong>
                </p>
                <p>
                  Chave privada:{" "}
                  <strong>
                    {statusCora?.privateKeyConfigured
                      ? "configurada"
                      : "não encontrada"}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  [
                    "integracaoPagamentoHabilitada",
                    "Integração Cora habilitada",
                  ],
                  ["cobrancaHabilitada", "Emissão de cobrança habilitada"],
                  [
                    "geracaoAutomaticaHabilitada",
                    "Geração automática de mensalidades",
                  ],
                  ["conciliacaoAutomaticaHabilitada", "Conciliação automática"],
                  [
                    "atualizacaoVencidosHabilitada",
                    "Atualizar mensalidades vencidas",
                  ],
                  ["permitirPix", "Permitir Pix"],
                  ["permitirBoleto", "Permitir boleto"],
                ].map(([campo, rotulo]) => {
                  const chave = campo as keyof ConfiguracaoCobranca;
                  return (
                    <label
                      key={campo}
                      className="flex items-center gap-2 rounded-[10px] border border-border/60 bg-background/50 px-3 py-2.5 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(cobrancaConfig[chave])}
                        onChange={(event) =>
                          setCobrancaConfig((atual) =>
                            atual
                              ? { ...atual, [chave]: event.target.checked }
                              : atual,
                          )
                        }
                      />
                      {rotulo}
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Dia padrão de vencimento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={cobrancaConfig.diaVencimentoPadrao}
                    onChange={(event) =>
                      setCobrancaConfig((atual) =>
                        atual
                          ? {
                              ...atual,
                              diaVencimentoPadrao: Number(event.target.value),
                            }
                          : atual,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dias antes do vencimento para gerar</Label>
                  <Input
                    type="number"
                    min={0}
                    max={31}
                    value={cobrancaConfig.diasGeracaoAntesVencimento}
                    onChange={(event) =>
                      setCobrancaConfig((atual) =>
                        atual
                          ? {
                              ...atual,
                              diasGeracaoAntesVencimento: Number(
                                event.target.value,
                              ),
                            }
                          : atual,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="glassSecondary"
              onClick={testarCora}
              disabled={testandoCora}
            >
              {testandoCora ? "Testando conexão..." : "Testar conexão"}
            </Button>
            <Button
              variant="glassSecondary"
              onClick={() => setCobrancaConfigOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="glassPrimary"
              onClick={salvarConfiguracaoCobranca}
              disabled={salvandoCobranca || !cobrancaConfig}
            >
              {salvandoCobranca ? "Salvando..." : "Salvar configuração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!dadosCora}
        onOpenChange={(open) => !open && setDadosCora(null)}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden border-border/60 bg-card/90 backdrop-blur-xl sm:max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Dados da cobrança Cora</DialogTitle>
            <DialogDescription>
              Consulte as opções de pagamento disponíveis para esta mensalidade.
            </DialogDescription>
          </DialogHeader>
          {dadosCora && (
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pb-1 pr-1">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-[18px] border border-border/40 bg-background/60 p-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-md sm:grid-cols-3">
                <CoraInfoItem
                  label="Referência"
                  value={formatCompetencia(dadosCora.referenceMonth)}
                />
                <CoraInfoItem label="Valor" value={formatBRL(dadosCora.amount)} />
                <CoraInfoItem
                  label="Vencimento"
                  value={formatDate(dadosCora.dueDate)}
                />
              </div>
              {temPixCora(dadosCora) && temBoletoCora(dadosCora) ? (
                <Tabs defaultValue="pix">
                  <TabsList className="grid h-9 w-full grid-cols-2">
                    <TabsTrigger value="pix" className="h-8 gap-2">
                      <QrCode className="h-4 w-4" aria-hidden /> Pix
                    </TabsTrigger>
                    <TabsTrigger value="boleto" className="h-8 gap-2">
                      <FileText className="h-4 w-4" aria-hidden /> Boleto
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pix">
                    <PixCoraContent dados={dadosCora} />
                  </TabsContent>
                  <TabsContent value="boleto">
                    <BoletoCoraContent dados={dadosCora} />
                  </TabsContent>
                </Tabs>
              ) : temPixCora(dadosCora) ? (
                <PixCoraContent dados={dadosCora} />
              ) : temBoletoCora(dadosCora) ? (
                <BoletoCoraContent dados={dadosCora} />
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Esta cobrança não possui uma forma de pagamento disponível no momento.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                type="text"
                inputMode="decimal"
                value={valorPagamentoInput}
                placeholder="0,00"
                onChange={(e) => {
                  const valorFormatado = maskMoney(e.target.value);
                  setValorPagamentoInput(valorFormatado);
                  setNovoPgto({
                    ...novoPgto,
                    valor: parseMoney(valorFormatado),
                  });
                }}
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
            <Button
              variant="glassSecondary"
              onClick={() => setPagamentoOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="glassPrimary" onClick={handleSalvarPagamento}>
              Salvar
            </Button>
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
              <InfoRow
                label="Competência"
                value={formatCompetencia(viewPgto.competencia)}
              />
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
              <InfoRow
                label="Forma"
                value={formatFormaPagamento(viewPgto.formaPagamento)}
              />
              <InfoRow
                label="Dias de atraso"
                value={getDiasAtrasoPagamento(viewPgto)}
              />
              <InfoRow
                label="Referência"
                value={viewPgto.referenciaExterna ?? "—"}
              />
              <InfoRow label="Observação" value={viewPgto.observacao ?? "—"} />
            </dl>
          )}

          <DialogFooter>
            <Button variant="glassSecondary" onClick={() => setViewPgto(null)}>
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
            <AlertDialogTitle>
              {pagamentos.find((item) => item.id === confirmDeletePgto)
                ?.coraInvoiceId
                ? "Cancelar cobrança Cora?"
                : "Excluir mensalidade?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pagamentos.find((item) => item.id === confirmDeletePgto)
                ?.coraInvoiceId
                ? "A cobrança será cancelada na Cora e a mensalidade permanecerá registrada como cancelada."
                : "Esta ação removerá a mensalidade ainda não emitida do histórico da empresa."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePagamento}
              className="bg-destructive hover:bg-destructive/90"
            >
              {pagamentos.find((item) => item.id === confirmDeletePgto)
                ?.coraInvoiceId
                ? "Cancelar cobrança"
                : "Excluir"}
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
            <Button variant="glassSecondary" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button variant="glassPrimary" onClick={handleSaveUser}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProprietarioLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <dt className="text-muted-foreground min-w-[140px]">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CoraInfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
        {value}
      </p>
    </div>
  );
}

function CampoCoraCopiavel({
  id,
  label,
  value,
  buttonLabel,
  successMessage,
}: {
  id: string;
  label: string;
  value: string;
  buttonLabel: string;
  successMessage: string;
}) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(
        "Não foi possível copiar o código. Selecione o conteúdo e copie manualmente.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        readOnly
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        className="h-9 truncate rounded-[10px] border-border/70 bg-background/70 font-mono text-[12px] backdrop-blur-sm"
      />
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 w-full gap-2 px-4"
        onClick={copiar}
      >
        <Copy className="h-4 w-4" aria-hidden /> {buttonLabel}
      </Button>
    </div>
  );
}

function qrCodeCoraSeguro(value: string | null | undefined) {
  return Boolean(value?.startsWith("data:image/png;base64,"));
}

function urlBoletoCoraSegura(value: string | null | undefined) {
  if (!value) return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function temPixCora(dados: DadosPagamentoCora) {
  return Boolean(dados.pix?.copyPaste || qrCodeCoraSeguro(dados.pix?.qrCode));
}

function temBoletoCora(dados: DadosPagamentoCora) {
  return Boolean(
    dados.boleto?.digitableLine ||
      dados.boleto?.barcode ||
      urlBoletoCoraSegura(dados.boleto?.url),
  );
}

function PixCoraContent({ dados }: { dados: DadosPagamentoCora }) {
  const qrDisponivel = qrCodeCoraSeguro(dados.pix?.qrCode);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Pague com Pix</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          Escaneie o QR Code ou copie o código Pix para realizar o pagamento.
        </p>
      </div>
      <div className="flex items-center justify-center rounded-[18px] border border-border/40 bg-background/60 px-4 py-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-md">
        {qrDisponivel ? (
          <img
            src={dados.pix?.qrCode ?? undefined}
            alt="QR Code Pix da cobrança"
            className="h-36 w-36 rounded-[10px] bg-white p-2"
          />
        ) : (
          <div className="flex items-center gap-3 py-1 text-left text-muted-foreground">
            <QrCode className="h-10 w-10 shrink-0" aria-hidden />
            <p className="max-w-[260px] text-[12px] leading-relaxed">
              O QR Code Pix não foi disponibilizado para esta cobrança. Utilize o
              código Pix Copia e Cola abaixo.
            </p>
          </div>
        )}
      </div>
      {dados.pix?.copyPaste ? (
        <CampoCoraCopiavel
          id="coraPixCopiaCola"
          label="Pix Copia e Cola"
          value={dados.pix.copyPaste}
          buttonLabel="Copiar código Pix"
          successMessage="Código Pix copiado."
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          O código Pix desta cobrança não está disponível.
        </p>
      )}
    </div>
  );
}

function BoletoCoraContent({ dados }: { dados: DadosPagamentoCora }) {
  const boletoDisponivel = urlBoletoCoraSegura(dados.boleto?.url);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Pague com boleto</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          Copie a linha digitável ou abra o boleto para pagamento.
        </p>
      </div>
      {dados.boleto?.digitableLine ? (
        <CampoCoraCopiavel
          id="coraLinhaDigitavel"
          label="Linha digitável"
          value={dados.boleto.digitableLine}
          buttonLabel="Copiar linha digitável"
          successMessage="Linha digitável copiada."
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          A linha digitável desta cobrança não está disponível.
        </p>
      )}
      {dados.boleto?.barcode && (
        <CampoCoraCopiavel
          id="coraCodigoBarras"
          label="Código de barras"
          value={dados.boleto.barcode}
          buttonLabel="Copiar código de barras"
          successMessage="Código de barras copiado."
        />
      )}
      {boletoDisponivel && dados.boleto?.url && (
        <Button
          type="button"
          variant="glassPrimary"
          className="h-9 w-full gap-2 px-4"
          asChild
        >
          <a href={dados.boleto.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden /> Abrir boleto
          </a>
        </Button>
      )}
    </div>
  );
}

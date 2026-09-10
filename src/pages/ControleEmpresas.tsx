import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleCheck,
  Plus,
  CircleSlash,
  FileDown,
  Eye,
  FileSpreadsheet,
  Gift,
  Globe2,
  History,
  Layers3,
  ListFilter,
  PackageCheck,
  Search,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { ProprietarioLayout } from "@/components/ProprietarioLayout";
import { PageTitle } from "@/components/PageTitle";
import { PageObjective } from "@/components/PageObjective";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/EmailInput";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { LIMITE_USUARIOS_PLANO_GRATUITO } from "@/lib/plano";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlanoBadge,
  StatusEmpresaBadge,
  TipoLogBadge,
} from "@/components/PlatformBadge";

import {
  criarEmpresaComAdmin,
  getPlanoVisualEmpresa,
  listarEmpresasControle,
  listarLogsGerais,
  listarPagamentosEmpresa,
  PLANO_LABELS,
  type CriarEmpresaProprietarioPayload,
  type EmpresaControle,
  type LogAcessoEmpresa,
  type PagamentoEmpresa,
  type StatusControleProprietario,
  type TipoPlanoVisual,
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

  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function resolverVencimento(pagamentos: PagamentoEmpresa[] | undefined) {
  if (!pagamentos?.length) return null;

  const emAberto = pagamentos
    .filter(
      (pagamento) =>
        pagamento.statusPagamento === "PENDENTE" ||
        pagamento.statusPagamento === "ATRASADO",
    )
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  if (emAberto.length > 0) return emAberto[0];

  return [...pagamentos].sort((a, b) =>
    b.dataVencimento.localeCompare(a.dataVencimento),
  )[0];
}

function gerarSlug(valor: string) {
  return valor
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTelefoneBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function getEmailInputValue(
  valueOrEvent: string | ChangeEvent<HTMLInputElement>,
) {
  if (typeof valueOrEvent === "string") {
    return valueOrEvent;
  }

  return valueOrEvent.target.value;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "info" | "purple";
}) {
  const toneClasses = {
    default: "border-border/70 bg-muted/50 text-foreground/70",
    success: "border-primary/20 bg-primary/[0.07] text-primary",
    danger: "border-border/60 bg-muted/40 text-muted-foreground",
    info: "border-border/70 bg-muted/50 text-foreground/70",
    purple: "border-primary/20 bg-primary/[0.07] text-primary",
  };

  return (
    <div className="flex h-full min-h-[86px] items-start gap-3 rounded-[16px] border border-border/70 bg-card/75 px-4 py-3.5 shadow-[0_1px_3px_-1px_hsl(215_28%_17%_/_0.08),inset_0_1px_0_0_hsl(0_0%_100%_/_0.30)] backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-card/60 hover:border-border">
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] border ${toneClasses[tone]}`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[22px] font-semibold leading-none text-foreground tabular-nums">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[12.5px] font-medium leading-tight text-foreground/80">
          {label}
        </p>
      </div>
    </div>
  );
}

const thBase =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

type NovaEmpresaProprietarioForm = Omit<
  CriarEmpresaProprietarioPayload,
  "tipoPlano"
> & {
  tipoPlano: TipoPlanoVisual;
};

const initialNovaEmpresa: NovaEmpresaProprietarioForm = {
  nomeEmpresa: "",
  slug: "",
  documentoIdentificacao: "",
  emailContato: "",
  telefoneContato: "",
  tipoPlano: "PLANO_PAGO",
  limiteUsuarios: 10,
  nomeAdministrador: "",
  loginAdministrador: "",
  senhaInicial: "",
};

function downloadArquivo(conteudo: BlobPart, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function ControleEmpresas() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "TODOS" | StatusControleProprietario
  >("TODOS");
  const [planoFilter, setPlanoFilter] = useState<"TODOS" | TipoPlanoVisual>(
    "TODOS",
  );

  const [empresas, setEmpresas] = useState<EmpresaControle[]>([]);
  const [logs, setLogs] = useState<LogAcessoEmpresa[]>([]);
  const [pagamentos, setPagamentos] = useState<
    Record<number, PagamentoEmpresa[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [criarOpen, setCriarOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [novaEmpresa, setNovaEmpresa] =
    useState<NovaEmpresaProprietarioForm>(initialNovaEmpresa);

  async function carregarDados() {
    try {
      setLoading(true);

      const empresasData = await listarEmpresasControle();
      setEmpresas(empresasData);

      const pagamentosData = await Promise.all(
        empresasData.map(async (empresa) => {
          try {
            return [
              empresa.id,
              await listarPagamentosEmpresa(empresa.id),
            ] as const;
          } catch (error) {
            console.error(error);
            return [empresa.id, []] as const;
          }
        }),
      );
      setPagamentos(Object.fromEntries(pagamentosData));

      try {
        const logsData = await listarLogsGerais();
        setLogs(logsData);
      } catch (error) {
        console.error(error);
        setLogs([]);
        toast.error("Não foi possível carregar os logs gerais recentes.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar o controle de empresas.");
      setEmpresas([]);
      setPagamentos({});
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const resumo = useMemo(() => {
    const empresasAtivas = empresas.filter(
      (e) => e.statusControleProprietario === "ATIVO",
    );

    const ativas = empresasAtivas.length;

    const inativas = empresas.filter(
      (e) => e.statusControleProprietario === "INATIVO",
    ).length;

    const usuariosTotais = empresasAtivas.reduce(
      (acc, e) => acc + Number(e.totalUsuarios || 0),
      0,
    );

    const gratuito = empresasAtivas.filter(
      (e) => getPlanoVisualEmpresa(e) === "PLANO_GRATUITO",
    ).length;

    const pago = empresasAtivas.filter(
      (e) => getPlanoVisualEmpresa(e) === "PLANO_PAGO",
    ).length;

    const cortesia = empresasAtivas.filter(
      (e) => getPlanoVisualEmpresa(e) === "PLANO_CORTESIA",
    ).length;

    return {
      total: ativas,
      ativas,
      inativas,
      usuariosTotais,
      gratuito,
      pago,
      cortesia,
    };
  }, [empresas]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    return empresas.filter((e) => {
      if (
        statusFilter !== "TODOS" &&
        e.statusControleProprietario !== statusFilter
      ) {
        return false;
      }

      if (planoFilter !== "TODOS" && getPlanoVisualEmpresa(e) !== planoFilter) {
        return false;
      }

      if (!s) return true;

      return (
        e.nomeEmpresa.toLowerCase().includes(s) ||
        e.slug.toLowerCase().includes(s) ||
        e.documentoIdentificacao.toLowerCase().includes(s) ||
        e.emailContato.toLowerCase().includes(s)
      );
    });
  }, [empresas, planoFilter, search, statusFilter]);

  const empresasPagination = usePagination(
    filtered,
    10,
    `${search}-${statusFilter}-${planoFilter}`,
  );

  const logsPagination = usePagination(logs, 10, "");

  function handleNomeEmpresaChange(value: string) {
    setNovaEmpresa((prev) => ({
      ...prev,
      nomeEmpresa: value,
      slug: slugTouched ? prev.slug : gerarSlug(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);

    setNovaEmpresa((prev) => ({
      ...prev,
      slug: gerarSlug(value),
    }));
  }

  function handlePlanoChange(value: TipoPlanoVisual) {
    setNovaEmpresa((prev) => ({
      ...prev,
      tipoPlano: value,
      limiteUsuarios:
        value === "PLANO_GRATUITO"
          ? LIMITE_USUARIOS_PLANO_GRATUITO
          : prev.limiteUsuarios && prev.limiteUsuarios > 0
            ? prev.limiteUsuarios
            : 10,
    }));
  }

  function resetarModal() {
    setCriarOpen(false);
    setSlugTouched(false);
    setNovaEmpresa(initialNovaEmpresa);
  }

  async function handleCriarEmpresa() {
    if (!novaEmpresa.nomeEmpresa.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    if (!novaEmpresa.slug.trim()) {
      toast.error("Informe o subdomínio da empresa.");
      return;
    }

    if (!novaEmpresa.documentoIdentificacao.trim()) {
      toast.error("Informe o documento da empresa.");
      return;
    }

    if (!novaEmpresa.emailContato.trim()) {
      toast.error("Informe o e-mail de contato.");
      return;
    }

    if (!novaEmpresa.telefoneContato.trim()) {
      toast.error("Informe o telefone de contato.");
      return;
    }

    if (!novaEmpresa.nomeAdministrador.trim()) {
      toast.error("Informe o nome do administrador da ONG.");
      return;
    }

    if (!novaEmpresa.loginAdministrador.trim()) {
      toast.error("Informe o login do administrador da ONG.");
      return;
    }

    if (!novaEmpresa.senhaInicial.trim()) {
      toast.error("Informe a senha inicial.");
      return;
    }

    if (
      novaEmpresa.tipoPlano !== "PLANO_GRATUITO" &&
      (!novaEmpresa.limiteUsuarios || novaEmpresa.limiteUsuarios < 1)
    ) {
      toast.error("Informe um limite de usuários válido.");
      return;
    }

    try {
      setCreating(true);

      const payload: CriarEmpresaProprietarioPayload = {
        ...novaEmpresa,
        nomeEmpresa: novaEmpresa.nomeEmpresa.trim(),
        slug: gerarSlug(novaEmpresa.slug),
        documentoIdentificacao: novaEmpresa.documentoIdentificacao.trim(),
        emailContato: novaEmpresa.emailContato.trim(),
        telefoneContato: novaEmpresa.telefoneContato.trim(),
        nomeAdministrador: novaEmpresa.nomeAdministrador.trim(),
        loginAdministrador: novaEmpresa.loginAdministrador.trim(),
        tipoPlano: novaEmpresa.tipoPlano,
        limiteUsuarios:
          novaEmpresa.tipoPlano === "PLANO_GRATUITO"
            ? LIMITE_USUARIOS_PLANO_GRATUITO
            : novaEmpresa.limiteUsuarios || 10,
      };

      const criada = await criarEmpresaComAdmin(payload);

      setEmpresas((prev) => [criada, ...prev]);
      setPagamentos((prev) => ({ ...prev, [criada.id]: [] }));
      empresasPagination.setCurrentPage(1);
      resetarModal();

      toast.success("Empresa criada com o primeiro administrador.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar empresa.",
      );
    } finally {
      setCreating(false);
    }
  }

  function buildExportRows() {
    return filtered.map((e) => ({
      Empresa: e.nomeEmpresa,
      Subdominio: `${e.slug}.aurit.com.br`,
      "Data de Criacao": formatDateTime(e.dataCriacao),
      Plano: PLANO_LABELS[getPlanoVisualEmpresa(e)],
      Vencimento: formatDate(
        resolverVencimento(pagamentos[e.id])?.dataVencimento,
      ),
      Status: e.statusControleProprietario === "ATIVO" ? "Ativo" : "Inativo",
      Usuarios: `${e.totalUsuarios}/${e.limiteUsuarios}`,
      "Ultima Atualizacao": formatDateTime(e.dataAtualizacao),
    }));
  }

  function exportarCsv() {
    const rows = buildExportRows();

    if (rows.length === 0) {
      toast.error("Não há empresas para exportar.");
      return;
    }

    const headers = Object.keys(rows[0]) as Array<keyof (typeof rows)[number]>;
    const csv = [
      headers,
      ...rows.map((row) => headers.map((header) => row[header] ?? "")),
    ]
      .map((linha) =>
        linha
          .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");

    downloadArquivo(
      "\uFEFF" + csv,
      "controle-empresas.csv",
      "text/csv;charset=utf-8;",
    );
    toast.success("CSV gerado com sucesso.");
  }

  function exportarExcel() {
    const rows = buildExportRows();

    if (rows.length === 0) {
      toast.error("Não há empresas para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, "controle-empresas.xlsx");
    toast.success("Excel gerado com sucesso.");
  }

  return (
    <ProprietarioLayout>
      <div className="container max-w-[1400px] py-6 sm:py-8">
        <PageTitle
          title="Controle de Organizações"
          tooltip="Nesta página são cadastradas e administradas as organizações clientes da plataforma, permitindo acompanhar seus dados, planos, acessos, quantidade de usuários, vencimentos e situação de cada organização."
          actions={
            <Button
              variant="glassPrimary"
              size="compact"
              className="h-9 gap-2 px-4"
              onClick={() => setCriarOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Cadastrar organizacão
            </Button>
          }
        />

        <PageObjective
          className="mb-6"
          description="Gerencie as organizações clientes da plataforma, acompanhando seus dados, planos, acessos, usuários, vencimentos e situação cadastral."
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <SummaryCard
            label="Organizações"
            value={resumo.total}
            icon={Building2}
            tone="info"
          />
          <SummaryCard
            label="Ativas"
            value={resumo.ativas}
            icon={CircleCheck}
            tone="success"
          />
          <SummaryCard
            label="Inativas"
            value={resumo.inativas}
            icon={CircleSlash}
            tone="danger"
          />
          <SummaryCard
            label="Usuários"
            value={resumo.usuariosTotais}
            icon={UsersRound}
            tone="info"
          />
          <SummaryCard
            label="Gratuito"
            value={resumo.gratuito}
            icon={Layers3}
          />
          <SummaryCard
            label="Cortesia"
            value={resumo.cortesia}
            icon={Gift}
            tone="purple"
          />
          <SummaryCard
            label="Pago"
            value={resumo.pago}
            icon={PackageCheck}
            tone="success"
          />
        </div>

        <section className="form-section-glass overflow-hidden rounded-[18px]">
          <div className="flex flex-col items-start justify-between gap-3 border-b form-section-glass-divider px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
            <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative w-full max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-[12px] border-border/70 bg-background/60 pl-9 backdrop-blur-md transition-colors focus-visible:border-primary/40 supports-[backdrop-filter]:bg-background/50"
                  aria-label="Buscar empresa"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as "TODOS" | StatusControleProprietario)
                }
              >
                <SelectTrigger className="h-9 w-full gap-2 rounded-[12px] border-border/70 bg-background/60 backdrop-blur-md transition-colors hover:border-border supports-[backdrop-filter]:bg-background/50 sm:w-[180px]">
                  <ListFilter
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="INATIVO">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={planoFilter}
                onValueChange={(v) =>
                  setPlanoFilter(v as "TODOS" | TipoPlanoVisual)
                }
              >
                <SelectTrigger className="h-9 w-full gap-2 rounded-[12px] border-border/70 bg-background/60 backdrop-blur-md transition-colors hover:border-border supports-[backdrop-filter]:bg-background/50 sm:w-[180px]">
                  <SlidersHorizontal
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Planos</SelectItem>
                  <SelectItem value="PLANO_GRATUITO">Gratuito</SelectItem>
                  <SelectItem value="PLANO_CORTESIA">Cortesia</SelectItem>
                  <SelectItem value="PLANO_PAGO">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                onClick={exportarExcel}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                Excel
              </Button>
              <Button
                type="button"
                variant="glassSecondary"
                className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium"
                onClick={exportarCsv}
              >
                <FileDown className="h-3.5 w-3.5 text-blue-600" />
                CSV
              </Button>
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] border border-border/60 bg-background/55 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-md">
                <Building2
                  className="h-3.5 w-3.5"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="font-medium text-foreground">
                  {filtered.length}
                </span>{" "}
                de {empresas.length} empresas
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-[13px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 backdrop-blur-md">
                  <th className={thBase}>Empresa</th>
                  <th className={thBase}>Subdomínio</th>
                  <th className={thBase}>Data de criação</th>
                  <th className={thBase}>Plano</th>
                  <th className={thBase}>Vencimento</th>
                  <th className={thBase}>Status</th>
                  <th className={cn(thBase, "text-center")}>Usuários</th>
                  <th className={cn(thBase, "text-right")}>Detalhes</th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  empresasPagination.paginated.map((e) => {
                    const blocked = e.statusControleProprietario === "INATIVO";
                    const vencimento = resolverVencimento(pagamentos[e.id]);
                    const dataVencimento = vencimento?.dataVencimento
                      ? new Date(`${vencimento.dataVencimento}T00:00:00`)
                      : null;
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const vencido =
                      !!dataVencimento &&
                      (vencimento?.statusPagamento === "PENDENTE" ||
                        vencimento?.statusPagamento === "ATRASADO") &&
                      dataVencimento < hoje;

                    return (
                      <tr
                        key={e.id}
                        className={cn(
                          "border-b border-border/50 transition-colors last:border-0",
                          blocked
                            ? "bg-muted/30 hover:bg-muted/50"
                            : "hover:bg-muted/25",
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center">
                            <span
                              className={cn(
                                "max-w-[260px] truncate text-[13.5px] font-semibold",
                                blocked
                                  ? "text-muted-foreground"
                                  : "text-foreground",
                              )}
                              title={e.nomeEmpresa}
                            >
                              {e.nomeEmpresa}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-muted-foreground">
                          <span className="inline-flex max-w-[220px] items-center gap-1.5">
                            <Globe2
                              className="h-3.5 w-3.5 shrink-0"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span
                              className="truncate font-mono text-[12px]"
                              title={`${e.slug}.aurit.com.br`}
                            >
                              {e.slug}.aurit.com.br
                            </span>
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                          {formatDate(e.dataCriacao)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          <PlanoBadge plano={getPlanoVisualEmpresa(e)} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          {vencimento ? (
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                vencido
                                  ? "font-medium text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <CalendarClock
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                              {formatDate(vencimento.dataVencimento)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          <StatusEmpresaBadge
                            status={e.statusControleProprietario}
                          />
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-center tabular-nums">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <UsersRound
                              className="h-3.5 w-3.5"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span>
                              <span className="font-medium text-foreground">
                                {e.totalUsuarios}
                              </span>
                              <span>/{e.limiteUsuarios}</span>
                            </span>
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="glassSecondary"
                                className="h-8 gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium"
                                onClick={() =>
                                  navigate(
                                    `/controle-proprietario/empresas/${e.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" strokeWidth={2} />
                                Ver empresa
                                <ArrowUpRight
                                  className="h-3.5 w-3.5 text-muted-foreground"
                                  strokeWidth={2}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              Ver empresa
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Building2
                        className="mx-auto h-9 w-9 text-muted-foreground/40"
                        strokeWidth={1.8}
                      />
                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma empresa encontrada.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            totalItems={filtered.length}
            currentPage={empresasPagination.currentPage}
            pageSize={empresasPagination.pageSize}
            onPageChange={empresasPagination.setCurrentPage}
            onPageSizeChange={empresasPagination.setPageSize}
          />
        </section>

        <section className="form-section-glass mt-6 overflow-hidden rounded-[18px]">
          <div className="border-b form-section-glass-divider px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <History
                className="h-4 w-4 flex-shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
                Logs gerais recentes
              </h2>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Atividade recente de acesso em toda a plataforma.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 backdrop-blur-md">
                  <th className={thBase}>Tipo</th>
                  <th className={thBase}>Empresa</th>
                  <th className={thBase}>Usuário</th>
                  <th className={thBase}>Login</th>
                  <th className={thBase}>IP</th>
                  <th className={thBase}>Data/Hora</th>
                  <th className={thBase}>Detalhe</th>
                </tr>
              </thead>

              <tbody>
                {logsPagination.paginated.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <TipoLogBadge tipo={l.tipoLogAcesso} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {l.nomeEmpresa ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {l.nomeUsuario ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {l.loginInformado ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] text-muted-foreground">
                      {l.ip ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(l.dataEvento)}
                    </td>
                    <td className="max-w-[320px] truncate whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {l.detalhe ?? "—"}
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
      </div>

      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Organização</DialogTitle>
            <DialogDescription>
              Cadastre a organização cliente e crie o primeiro usuário
              administrador da ONG.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Dados da Organização
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome da Organização *</Label>
                  <Input
                    value={novaEmpresa.nomeEmpresa}
                    onChange={(e) => handleNomeEmpresaChange(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Subdomínio *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={novaEmpresa.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      .aurit.com.br
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Acesso:{" "}
                    <span className="font-mono">
                      {novaEmpresa.slug || "instituto-cultural"}.aurit.com.br
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Documento CPF/CNPJ *</Label>
                  <Input
                    value={novaEmpresa.documentoIdentificacao}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        documentoIdentificacao: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Telefone *</Label>
                  <Input
                    value={novaEmpresa.telefoneContato}
                    inputMode="tel"
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        telefoneContato: formatTelefoneBR(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>E-mail de Contato *</Label>
                  <EmailInput
                    value={novaEmpresa.emailContato}
                    onChange={(valueOrEvent) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        emailContato: getEmailInputValue(valueOrEvent),
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Plano
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Plano *</Label>
                  <Select
                    value={novaEmpresa.tipoPlano}
                    onValueChange={(v) =>
                      handlePlanoChange(v as TipoPlanoVisual)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANO_GRATUITO">
                        {PLANO_LABELS.PLANO_GRATUITO}
                      </SelectItem>
                      <SelectItem value="PLANO_PAGO">
                        {PLANO_LABELS.PLANO_PAGO}
                      </SelectItem>
                      <SelectItem value="PLANO_CORTESIA">
                        {PLANO_LABELS.PLANO_CORTESIA}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Limite de Usuários *</Label>
                  <Input
                    type="number"
                    min={
                      novaEmpresa.tipoPlano === "PLANO_GRATUITO"
                        ? LIMITE_USUARIOS_PLANO_GRATUITO
                        : 1
                    }
                    disabled={novaEmpresa.tipoPlano === "PLANO_GRATUITO"}
                    value={novaEmpresa.limiteUsuarios ?? ""}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        limiteUsuarios: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      })
                    }
                  />

                  {novaEmpresa.tipoPlano === "PLANO_GRATUITO" && (
                    <p className="text-[11px] text-muted-foreground">
                      O plano gratuito possui limite fixo de{" "}
                      {LIMITE_USUARIOS_PLANO_GRATUITO} usuários.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="border-t border-border pt-4">
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Administrador Inicial da ONG
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Este será o primeiro usuário ADMIN da organização. Depois, ele
                  poderá acessar o sistema da ONG e criar os demais usuários
                  conforme o limite do plano.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome do administrador *</Label>
                  <Input
                    value={novaEmpresa.nomeAdministrador}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        nomeAdministrador: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Login do Administrador *</Label>
                  <Input
                    value={novaEmpresa.loginAdministrador}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        loginAdministrador: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Senha Inicial *</Label>
                  <Input
                    type="password"
                    value={novaEmpresa.senhaInicial}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        senhaInicial: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button
              variant="glassSecondary"
              onClick={resetarModal}
              disabled={creating}
            >
              Cancelar
            </Button>

            <Button
              variant="glassPrimary"
              onClick={handleCriarEmpresa}
              disabled={creating}
            >
              {creating ? "Criando..." : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProprietarioLayout>
  );
}

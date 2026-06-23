import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentType,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Gift,
  Plus,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { ProprietarioLayout } from "@/components/ProprietarioLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/EmailInput";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
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
  PLANO_LABELS,
  type CriarEmpresaProprietarioPayload,
  type EmpresaControle,
  type LogAcessoEmpresa,
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

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
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

function getEmailInputValue(valueOrEvent: string | ChangeEvent<HTMLInputElement>) {
  if (typeof valueOrEvent === "string") {
    return valueOrEvent;
  }

  return valueOrEvent.target.value;
}

function getEmpresaLogKey(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "";

  return String(value);
}

function getEmpresaNomeLogKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "danger" | "info" | "purple";
}) {
  const toneClasses = {
    default: "text-muted-foreground bg-muted",
    success:
      "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    danger:
      "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    info: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/30",
    purple:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900",

  };

  return (
    <div className="bg-card border border-border rounded p-4 flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded flex items-center justify-center flex-shrink-0 ${toneClasses[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
          {label}
        </p>
        <p className="text-lg font-semibold text-foreground tabular-nums leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] =
    useState<"TODOS" | StatusControleProprietario>("TODOS");
  const [planoFilter, setPlanoFilter] =
    useState<"TODOS" | TipoPlanoVisual>("TODOS");

  const [empresas, setEmpresas] = useState<EmpresaControle[]>([]);
  const [logs, setLogs] = useState<LogAcessoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [criarOpen, setCriarOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [novaEmpresa, setNovaEmpresa] =
    useState<NovaEmpresaProprietarioForm>(initialNovaEmpresa);

  async function carregarDados() {
    try {
      setLoading(true);

      const [empresasData, logsData] = await Promise.all([
        listarEmpresasControle(),
        listarLogsGerais(),
      ]);

      setEmpresas(empresasData);
      setLogs(logsData);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar o controle de empresas.");
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

  const ultimoAcessoPorEmpresa = useMemo(() => {
    const porConfiguracao = new Map<string, string>();
    const porNome = new Map<string, string>();

    logs.forEach((log) => {
      if (log.tipoLogAcesso !== "LOGIN_SUCESSO") return;

      const timestamp = getTimestamp(log.dataEvento);

      if (!timestamp) return;

      const atual = log.dataEvento;
      const configuracaoKey = getEmpresaLogKey(log.configuracaoEmpresaId);
      const nomeKey = getEmpresaNomeLogKey(log.nomeEmpresa);

      if (configuracaoKey) {
        const existente = porConfiguracao.get(configuracaoKey);

        if (!existente || timestamp > getTimestamp(existente)) {
          porConfiguracao.set(configuracaoKey, atual);
        }
      }

      if (nomeKey) {
        const existente = porNome.get(nomeKey);

        if (!existente || timestamp > getTimestamp(existente)) {
          porNome.set(nomeKey, atual);
        }
      }
    });

    return { porConfiguracao, porNome };
  }, [logs]);

  function getUltimoAcessoDireto(empresa: EmpresaControle) {
    const camposPossiveis = [
      "ultimoAcesso",
      "dataUltimoAcesso",
      "ultimaDataAcesso",
      "ultimoAcessoEm",
      "ultimoLogin",
      "dataUltimoLogin",
      "lastAccessAt",
      "lastLoginAt",
    ];

    const empresaRecord = empresa as unknown as Record<string, unknown>;

    return (
      camposPossiveis
        .map((campo) => empresaRecord[campo])
        .find((valor): valor is string =>
          typeof valor === "string" && getTimestamp(valor) > 0,
        ) ?? null
    );
  }

  function getUltimoAcessoEmpresa(empresa: EmpresaControle) {
    const acessoDireto = getUltimoAcessoDireto(empresa);

    if (acessoDireto) return acessoDireto;

    const configuracaoKey = getEmpresaLogKey(empresa.configuracaoEmpresaId);
    const nomeKey = getEmpresaNomeLogKey(empresa.nomeEmpresa);

    return (
      (configuracaoKey
        ? ultimoAcessoPorEmpresa.porConfiguracao.get(configuracaoKey)
        : undefined) ??
      ultimoAcessoPorEmpresa.porNome.get(nomeKey) ??
      null
    );
  }

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
          ? 2
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
            ? 2
            : novaEmpresa.limiteUsuarios || 10,
      };

      const criada = await criarEmpresaComAdmin(payload);

      setEmpresas((prev) => [criada, ...prev]);
      empresasPagination.setCurrentPage(1);
      resetarModal();

      toast.success("Empresa criada com o primeiro administrador.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar empresa.");
    } finally {
      setCreating(false);
    }
  }

  function buildExportRows() {
    return filtered.map((e) => ({
      Empresa: e.nomeEmpresa,
      Subdominio: `${e.slug}.aurit.com.br`,
      Documento: e.documentoIdentificacao,
      Email: e.emailContato,
      Telefone: e.telefoneContato,
      Plano: PLANO_LABELS[getPlanoVisualEmpresa(e)],
      Status: e.statusControleProprietario === "ATIVO" ? "Ativo" : "Inativo",
      Usuarios: `${e.totalUsuarios}/${e.limiteUsuarios}`,
      "Ultimo Acesso": formatDateTime(getUltimoAcessoEmpresa(e)),
      "Data de Criacao": formatDateTime(e.dataCriacao),
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
          title="Controle de Empresas"
          tooltip="Gerencie as organizações clientes da plataforma, seus planos, acessos, usuários e registros administrativos."
          description="Gerencie as organizações clientes da plataforma, seus planos, acessos, usuários e registros administrativos."
          actions={
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setCriarOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova empresa
            </Button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-5">
          <SummaryCard label="Total" value={resumo.total} icon={Building2} />
          <SummaryCard
            label="Ativas"
            value={resumo.ativas}
            icon={CheckCircle2}
            tone="success"
          />
          <SummaryCard
            label="Inativas"
            value={resumo.inativas}
            icon={XCircle}
            tone="danger"
          />
          <SummaryCard
            label="Usuários"
            value={resumo.usuariosTotais}
            icon={Users}
            tone="info"
          />
          <SummaryCard
            label="Gratuito"
            value={resumo.gratuito}
            icon={Sparkles}
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
            icon={Sparkles}
            tone="success"
          />
        </div>

        <div className="bg-card border border-border rounded">
          <div className="flex flex-col lg:flex-row gap-3 px-5 py-4 border-b border-border items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                  aria-label="Buscar empresa"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as "TODOS" | StatusControleProprietario)
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={exportarCsv}
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={exportarExcel}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </Button>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                <span className="font-medium text-foreground">
                  {filtered.length}
                </span>{" "}
                de {empresas.length} empresas
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Empresa
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Subdomínio
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Documento
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    E-mail
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Telefone
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Plano
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Usuários
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Último acesso
                  </th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Detalhes
                  </th>
                </tr>
              </thead>

              <tbody>

                {!loading &&
                  empresasPagination.paginated.map((e) => {
                    const blocked = e.statusControleProprietario === "INATIVO";

                    return (
                      <tr
                        key={e.id}
                        className={`border-b border-border/70 last:border-0 transition-colors ${blocked
                          ? "bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/60"
                          : "hover:bg-muted/30"
                          }`}
                      >
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>

                            <span
                              className={`font-medium ${blocked
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                                }`}
                            >
                              {e.nomeEmpresa}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground font-mono text-[12px]">
                          {e.slug}.aurit.com.br
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {e.documentoIdentificacao}
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {e.emailContato}
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {e.telefoneContato}
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap">
                          <PlanoBadge plano={getPlanoVisualEmpresa(e)} />
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap">
                          <StatusEmpresaBadge
                            status={e.statusControleProprietario}
                          />
                        </td>

                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          <span className="font-medium text-foreground">
                            {e.totalUsuarios}
                          </span>
                          <span className="text-muted-foreground">
                            /{e.limiteUsuarios}
                          </span>
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(getUltimoAcessoEmpresa(e))}
                        </td>

                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() =>
                              navigate(`/controle-proprietario/empresas/${e.id}`)
                            }
                          >
                            Ver Organização
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
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
        </div>

        <div className="bg-card border border-border rounded mt-6">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">
              Logs gerais recentes
            </h2>
            <span className="text-xs text-muted-foreground ml-1">
              — atividade recente em toda a plataforma
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Tipo
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Empresa
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
                    Data/Hora
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                    Detalhe
                  </th>
                </tr>
              </thead>

              <tbody>
                {logsPagination.paginated.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <TipoLogBadge tipo={l.tipoLogAcesso} />
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-foreground">
                      {l.nomeEmpresa ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {l.nomeUsuario ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {l.loginInformado ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground font-mono text-[12px]">
                      {l.ip ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(l.dataEvento)}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground max-w-[320px] truncate">
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
        </div>
      </div>

      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    onValueChange={(v) => handlePlanoChange(v as TipoPlanoVisual)}
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
                    min={novaEmpresa.tipoPlano === "PLANO_GRATUITO" ? 2 : 1}
                    disabled={novaEmpresa.tipoPlano === "PLANO_GRATUITO"}
                    value={novaEmpresa.limiteUsuarios ?? ""}
                    onChange={(e) =>
                      setNovaEmpresa({
                        ...novaEmpresa,
                        limiteUsuarios: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />

                  {novaEmpresa.tipoPlano === "PLANO_GRATUITO" && (
                    <p className="text-[11px] text-muted-foreground">
                      O plano gratuito possui limite fixo de 2 usuários.
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
            <Button variant="outline" onClick={resetarModal} disabled={creating}>
              Cancelar
            </Button>

            <Button onClick={handleCriarEmpresa} disabled={creating}>
              {creating ? "Criando..." : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProprietarioLayout>
  );
}
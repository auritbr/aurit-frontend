import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Download,
  Wallet,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { AccessDenied } from "@/components/AccessDenied";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { isPlanoAccessDenied } from "@/lib/access";
import { exportFinanceiroPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  formasPagamento,
  aplicacoesFinanceiro,
  labelFromList,
  formatCurrency,
  formatDateBR,
  getFinanceiros,
  getFinanceiroComprovanteDownloadUrl,
  deleteFinanceiro,
  type Financeiro,
} from "@/data/financeiro";
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

const FINANCEIRO_NEXT_STEP_KEY = "aurit:financeiro:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface FinanceiroNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

interface ProjetoOption {
  id: string;
  nome: string;
}

interface ColaboradorOption {
  id: string;
  nome: string;
}

interface OrganizacaoOption {
  id: string;
  nome: string;
}

interface PlanejamentoFinanceiroOption {
  id: string;
  nome: string;
}

interface AtividadeOption {
  id: string;
  nome: string;
}

interface EventoCulturalOption {
  id: string;
  nome: string;
}

interface AcaoDivulgacaoOption {
  id: string;
  nome: string;
}

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
    return text || `Erro ${response.status} ao processar requisição.`;
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
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

function getFinanceiroId(item: Financeiro, ...keys: string[]) {
  for (const key of keys) {
    const value = (item as any)[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function tipoOperacaoLabel(value?: string) {
  switch (value) {
    case "ENTRADA":
      return "Entrada";
    case "SAIDA":
      return "Saída";
    default:
      return value || "—";
  }
}

function statusFinanceiroLabel(value?: string) {
  switch (value) {
    case "PENDENTE":
      return "Pendente";
    case "LIQUIDADO":
      return "Liquidado";
    case "VENCIDO":
      return "Vencido";
    case "CANCELADO":
      return "Cancelado";
    default:
      return value || "—";
  }
}

function aplicacaoFinanceiraLabel(value?: string) {
  return labelFromList(aplicacoesFinanceiro, value);
}

export default function FinanceiroPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [projeto, setProjeto] = useState<string>("ALL");
  const [items, setItems] = useState<Financeiro[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [planejamentos, setPlanejamentos] = useState<
    PlanejamentoFinanceiroOption[]
  >([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [eventos, setEventos] = useState<EventoCulturalOption[]>([]);
  const [acoes, setAcoes] = useState<AcaoDivulgacaoOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<FinanceiroNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeBaixar = permissoes.BAIXAR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("FINANCEIRO");

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
    const raw = sessionStorage.getItem(FINANCEIRO_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as FinanceiroNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(FINANCEIRO_NEXT_STEP_KEY);

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

    void carregar();
  }, [loadingPermissoes, podeVisualizar]);

  async function carregar() {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);

      const [
        financeirosData,
        organizacoesRes,
        projetosRes,
        colaboradoresRes,
        planejamentosRes,
        atividadesRes,
        eventosRes,
        acoesRes,
      ] = await Promise.all([
        getFinanceiros(),
        fetch(`${API_URL}/organizacoes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/projetos`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/colaboradores`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/planejamentos-financeiros`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/atividades`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/eventos-culturais`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/acoes-divulgacao`, { headers: getAuthHeaders() }),
      ]);

      const responses = [
        organizacoesRes,
        projetosRes,
        colaboradoresRes,
        planejamentosRes,
        atividadesRes,
        eventosRes,
        acoesRes,
      ];

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
      }

      const organizacoesData = await organizacoesRes.json();
      const projetosData = await projetosRes.json();
      const colaboradoresData = await colaboradoresRes.json();
      const planejamentosData = await planejamentosRes.json();
      const atividadesData = await atividadesRes.json();
      const eventosData = await eventosRes.json();
      const acoesData = await acoesRes.json();

      setItems(financeirosData);

      setOrganizacoes(
        (organizacoesData ?? []).map((o: any) => ({
          id: String(o.id),
          nome:
            o.razaoSocial?.trim() ||
            o.nomeFantasia?.trim() ||
            o.nomeOrganizacao?.trim() ||
            o.nome?.trim() ||
            `Organização ${o.id}`,
        })),
      );

      setProjetos(
        (projetosData ?? []).map((p: any) => ({
          id: String(p.id),
          nome:
            p.nomeProjeto?.trim() ||
            p.tituloProjeto?.trim() ||
            p.nome?.trim() ||
            `Projeto ${p.id}`,
        })),
      );

      setColaboradores(
        (colaboradoresData ?? []).map((c: any) => ({
          id: String(c.id),
          nome:
            c.nomeCompleto?.trim() ||
            c.nome?.trim() ||
            c.nomeColaborador?.trim() ||
            `Colaborador ${c.id}`,
        })),
      );

      setPlanejamentos(
        (planejamentosData ?? []).map((p: any) => ({
          id: String(p.id),
          nome:
            p.nomePlanejamento?.trim() ||
            p.itemPlanejamento?.trim() ||
            p.nome?.trim() ||
            `Planejamento ${p.id}`,
        })),
      );

      setAtividades(
        (atividadesData ?? []).map((a: any) => ({
          id: String(a.id),
          nome:
            a.nomeAtividade?.trim() ||
            a.nome?.trim() ||
            a.titulo?.trim() ||
            `Atividade ${a.id}`,
        })),
      );

      setEventos(
        (eventosData ?? []).map((e: any) => ({
          id: String(e.id),
          nome:
            e.nomeEvento?.trim() ||
            e.nome?.trim() ||
            e.titulo?.trim() ||
            `Evento ${e.id}`,
        })),
      );

      setAcoes(
        (acoesData ?? []).map((a: any) => ({
          id: String(a.id),
          nome:
            a.nomeAcao?.trim() ||
            a.tituloAcao?.trim() ||
            a.nome?.trim() ||
            `Ação ${a.id}`,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar lançamentos do controle financeiro.";

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

  const projetoNome = (id?: string) =>
    id ? projetos.find((p) => p.id === id)?.nome ?? "—" : "—";

  const organizacaoNome = (id?: string) =>
    id ? organizacoes.find((o) => o.id === id)?.nome ?? "—" : "—";

  const colaboradorNome = (id?: string) =>
    id ? colaboradores.find((c) => c.id === id)?.nome ?? "—" : "—";

  const planejamentoNome = (id?: string) =>
    id ? planejamentos.find((p) => p.id === id)?.nome ?? "—" : "—";

  const atividadeNome = (id?: string) =>
    id ? atividades.find((a) => a.id === id)?.nome ?? "—" : "—";

  const eventoNome = (id?: string) =>
    id ? eventos.find((e) => e.id === id)?.nome ?? "—" : "—";

  const acaoNome = (id?: string) =>
    id ? acoes.find((a) => a.id === id)?.nome ?? "—" : "—";

  const pessoaLabel = (item: Financeiro) =>
    item.colaboradorId
      ? colaboradorNome(item.colaboradorId)
      : item.nomePessoa || "—";

  const scoped = useMemo(
    () =>
      projeto === "ALL"
        ? items
        : items.filter((item) => item.projetoId === projeto),
    [items, projeto],
  );

  const summary = useMemo(() => {
    const entradas = scoped
      .filter((item) => item.tipoOperacaoFinanceira === "ENTRADA")
      .reduce((acc, item) => acc + item.valor, 0);

    const saidas = scoped
      .filter((item) => item.tipoOperacaoFinanceira === "SAIDA")
      .reduce((acc, item) => acc + item.valor, 0);

    const pendentes = scoped
      .filter((item) => item.statusFinanceiro === "PENDENTE")
      .reduce((acc, item) => acc + item.valor, 0);

    return { entradas, saidas, pendentes, saldo: entradas - saidas };
  }, [scoped]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return scoped;

    return scoped.filter((item) => {
      const planejamentoId = getFinanceiroId(
        item,
        "planejamentoFinanceiroId",
        "planejamentoId",
      );
      const atividadeId = getFinanceiroId(item, "atividadeId");
      const eventoId = getFinanceiroId(
        item,
        "eventoCulturalId",
        "eventoId",
      );
      const acaoId = getFinanceiroId(
        item,
        "acaoDivulgacaoId",
        "acaoId",
      );

      return (
        (item.numeroDocumento ?? "").toLowerCase().includes(s) ||
        (item.descricao ?? "").toLowerCase().includes(s) ||
        pessoaLabel(item).toLowerCase().includes(s) ||
        projetoNome(item.projetoId).toLowerCase().includes(s) ||
        organizacaoNome(item.organizacaoId).toLowerCase().includes(s) ||
        planejamentoNome(planejamentoId).toLowerCase().includes(s) ||
        atividadeNome(atividadeId).toLowerCase().includes(s) ||
        eventoNome(eventoId).toLowerCase().includes(s) ||
        acaoNome(acaoId).toLowerCase().includes(s) ||
        formatDateBR(item.dataPagamento).toLowerCase().includes(s) ||
        formatCurrency(item.valor).toLowerCase().includes(s) ||
        labelFromList(formasPagamento, item.formaPagamento)
          .toLowerCase()
          .includes(s)
      );
    });
  }, [
    search,
    scoped,
    projetos,
    colaboradores,
    organizacoes,
    planejamentos,
    atividades,
    eventos,
    acoes,
  ]);

  const { currentPage, pageSize, setCurrentPage, setPageSize, paginated } =
    usePagination(filtered, 25, `${search}-${projeto}`);

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
      toast.error("Você não possui permissão para excluir lançamentos do controle financeiro.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deleteFinanceiro(Number(confirmDelete));

      setItems((prev) => prev.filter((item) => item.id !== confirmDelete));
      toast.success("Lançamento do controle financeiro excluído com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir lançamento do controle financeiro.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      console.error(error);
      toast.error(message);
    }
  }

  async function handleDownload(item: Financeiro) {
    if (!podeBaixar) {
      toast.error("Você não possui permissão para baixar comprovantes.");
      return;
    }

    if (!item.id || !item.urlComprovante) {
      toast.info("Nenhum comprovante disponível para este lançamento do controle financeiro.");
      return;
    }

    try {
      const urlTemporaria = await getFinanceiroComprovanteDownloadUrl(item.id);
      window.open(urlTemporaria, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao abrir comprovante do controle financeiro.",
      );
    }
  }

  async function handleExportPdf(item: Financeiro) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    const planejamentoId = getFinanceiroId(
      item,
      "planejamentoFinanceiroId",
      "planejamentoId",
    );
    const atividadeId = getFinanceiroId(item, "atividadeId");
    const eventoId = getFinanceiroId(item, "eventoCulturalId", "eventoId");
    const acaoId = getFinanceiroId(item, "acaoDivulgacaoId", "acaoId");

    let comprovanteUrl = "";

    if (item.id && item.urlComprovante) {
      try {
        comprovanteUrl = await getFinanceiroComprovanteDownloadUrl(item.id);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao gerar link do comprovante do controle financeiro.",
        );
        return;
      }
    }

    await exportFinanceiroPdf({
      id: item.id,

      organizacao: organizacaoNome(item.organizacaoId),
      numeroDocumento: item.numeroDocumento,
      descricao: item.descricao,
      comprovante: comprovanteUrl,

      dataPagamento: item.dataPagamento,
      dataVencimento: (item as any).dataVencimento,

      colaborador: item.colaboradorId
        ? colaboradorNome(item.colaboradorId)
        : "",
      nomePessoa: item.colaboradorId ? "" : item.nomePessoa,
      cpfCnpj: (item as any).cpfCnpj || (item as any).cpfCNPJ,

      valor: formatCurrency(item.valor),
      observacao: (item as any).observacao,

      tipoOperacaoFinanceira: tipoOperacaoLabel(
        item.tipoOperacaoFinanceira,
      ),
      formaPagamento: labelFromList(formasPagamento, item.formaPagamento),
      aplicacaoFinanceiro: aplicacaoFinanceiraLabel(
        (item as any).aplicacaoFinanceiro,
      ),
      statusFinanceiro: statusFinanceiroLabel(item.statusFinanceiro),

      planejamentoFinanceiro: planejamentoId
        ? planejamentoNome(planejamentoId)
        : "",
      projeto: item.projetoId ? projetoNome(item.projetoId) : "",
      atividade: atividadeId ? atividadeNome(atividadeId) : "",
      eventoCultural: eventoId ? eventoNome(eventoId) : "",
      acaoDivulgacao: acaoId ? acaoNome(acaoId) : "",
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
          title="Controle Financeiro"
          tooltip="Registre entradas e saídas financeiras da organização no controle financeiro. Use os vínculos apenas quando a movimentação estiver diretamente relacionada a projeto, planejamento, atividade, evento cultural ou ação de divulgação. Para despesas administrativas, como luz, internet, aluguel e taxas, deixe os vínculos de execução em branco e detalhe a finalidade na descrição ou observação."
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

        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtrar por projeto
          </label>

          <Select value={projeto} onValueChange={setProjeto}>
            <SelectTrigger className="h-9 w-full sm:w-80">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">Todos os projetos</SelectItem>

              {projetos.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            label="Total de entradas"
            value={summary.entradas}
            Icon={ArrowUpRight}
            accent="text-emerald-600"
          />

          <SummaryCard
            label="Total de saídas"
            value={summary.saidas}
            Icon={ArrowDownRight}
            accent="text-rose-600"
          />

          <SummaryCard
            label="Saldo"
            value={summary.saldo}
            Icon={Wallet}
            accent={summary.saldo >= 0 ? "text-primary" : "text-rose-600"}
          />

          <SummaryCard
            label="Total pendente"
            value={summary.pendentes}
            Icon={Clock}
            accent="text-amber-600"
          />
        </div>

        <div className="bg-card border border-border rounded">
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                aria-label="Buscar lançamento do controle financeiro"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/financeiro/novo")}
                className="h-9 gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Cadastrar lançamento
              </Button>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table ref={tableRef} className="w-full min-w-[1320px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5 w-[170px]"
                    data-no-copy
                  >
                    Ações
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Data
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Tipo
                  </th>

                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Valor
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Status
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Projeto
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Pessoa
                  </th>

                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5">
                    Forma
                  </th>

                  {podeGerarPdf && (
                    <th
                      className="w-[140px] text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-2.5"
                      data-no-copy
                    >
                      Documento
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.map((item) => {
                  const hasComprovante = !!item.urlComprovante;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-1">
                          <TableActionIcon
                            icon={Eye}
                            label="Visualizar"
                            onClick={() => navigate(`/financeiro/${item.id}`)}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() =>
                                navigate(`/financeiro/${item.id}/editar`)
                              }
                            />
                          )}

                          {podeBaixar && hasComprovante ? (
                            <TableActionIcon
                              icon={Download}
                              label="Baixar comprovante"
                              onClick={() => void handleDownload(item)}
                            />
                          ) : (
                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>
                                <span className="h-6 w-6 rounded inline-flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">
                                  <Download
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2}
                                  />
                                </span>
                              </TooltipTrigger>

                              <TooltipContent>
                                {podeBaixar
                                  ? "Sem comprovante disponível"
                                  : "Sem permissão para baixar"}
                              </TooltipContent>
                            </Tooltip>
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

                      <td className="px-6 py-2.5 text-[13px] text-foreground whitespace-nowrap">
                        {formatDateBR(item.dataPagamento)}
                      </td>

                      <td className="px-6 py-2.5 text-[13px] whitespace-nowrap">
                        <OperacaoBadge tipo={item.tipoOperacaoFinanceira} />
                      </td>

                      <td
                        className={`px-6 py-2.5 text-[13px] font-medium text-right whitespace-nowrap ${item.tipoOperacaoFinanceira === "ENTRADA"
                            ? "text-emerald-600"
                            : "text-foreground"
                          }`}
                      >
                        {item.tipoOperacaoFinanceira === "SAIDA" ? "− " : ""}
                        {formatCurrency(item.valor)}
                      </td>

                      <td className="px-6 py-2.5">
                        <FinanceStatusPill status={item.statusFinanceiro} />
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText
                          text={projetoNome(item.projetoId)}
                          muted={!item.projetoId}
                        >
                          {projetoNome(item.projetoId)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5">
                        <TableCellText text={pessoaLabel(item)} muted>
                          {pessoaLabel(item)}
                        </TableCellText>
                      </td>

                      <td className="px-6 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {labelFromList(formasPagamento, item.formaPagamento)}
                      </td>

                      {podeGerarPdf && (
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExportPdf(item)}
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
                      colSpan={podeGerarPdf ? 9 : 8}
                      className="px-5 py-16 text-center"
                    >
                      <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum lançamento do controle financeiro encontrado.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border">
            {paginated.map((item) => {
              const hasComprovante = !!item.urlComprovante;

              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => navigate(`/financeiro/${item.id}`)}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(`/financeiro/${item.id}/editar`)
                          }
                        />
                      )}

                      {podeBaixar && hasComprovante ? (
                        <TableActionIcon
                          icon={Download}
                          label="Baixar comprovante"
                          onClick={() => void handleDownload(item)}
                        />
                      ) : (
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                            <span className="h-6 w-6 rounded inline-flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">
                              <Download
                                className="h-3.5 w-3.5"
                                strokeWidth={2}
                              />
                            </span>
                          </TooltipTrigger>

                          <TooltipContent>
                            {podeBaixar
                              ? "Sem comprovante disponível"
                              : "Sem permissão para baixar"}
                          </TooltipContent>
                        </Tooltip>
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
                        onClick={() => void handleExportPdf(item)}
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <OperacaoBadge tipo={item.tipoOperacaoFinanceira} />

                    <span
                      className={`text-sm font-semibold ${item.tipoOperacaoFinanceira === "ENTRADA"
                          ? "text-emerald-600"
                          : "text-foreground"
                        }`}
                    >
                      {item.tipoOperacaoFinanceira === "SAIDA" ? "− " : ""}
                      {formatCurrency(item.valor)}
                    </span>
                  </div>

                  <p className="font-medium text-foreground text-sm mt-2 truncate">
                    {item.projetoId
                      ? projetoNome(item.projetoId)
                      : "Sem projeto vinculado"}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {pessoaLabel(item)} ·{" "}
                    {labelFromList(formasPagamento, item.formaPagamento)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <FinanceStatusPill status={item.statusFinanceiro} />

                    <span className="text-xs text-muted-foreground">
                      {formatDateBR(item.dataPagamento)}
                    </span>
                  </div>
                </div>
              );
            })}

            {paginated.length === 0 && (
              <div className="p-10 text-center">
                <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum lançamento do controle financeiro encontrado.
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
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento do controle financeiro?</AlertDialogTitle>

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

      <WikiFloatingButton pageTitle="Controle Financeiro" />
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: any;
  accent: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        <Icon className={`h-4 w-4 ${accent}`} strokeWidth={2.2} />
      </div>

      <p className={`text-lg font-semibold leading-tight ${accent}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function OperacaoBadge({ tipo }: { tipo: "ENTRADA" | "SAIDA" }) {
  const isEntrada = tipo === "ENTRADA";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${isEntrada
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
        }`}
    >
      {isEntrada ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}

      {isEntrada ? "Entrada" : "Saída"}
    </span>
  );
}

function FinanceStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    PENDENTE: {
      label: "Pendente",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: Clock,
    },
    LIQUIDADO: {
      label: "Liquidado",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    },
    VENCIDO: {
      label: "Vencido",
      cls: "bg-destructive/10 text-destructive border-destructive/20",
      Icon: AlertTriangle,
    },
  };

  const cfg = map[status] ?? map.PENDENTE;
  const { Icon } = cfg;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}
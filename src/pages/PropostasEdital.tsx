import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users,
  FileSignature,
  ClipboardCheck,
  FileDown,
} from "lucide-react";

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
import { exportPropostaEditalPdf } from "@/lib/pdfExporters";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";
import {
  getPropostasEditais,
  deletePropostaEdital,
  getAgentesOptions,
  getProjetosOptions,
  getEditaisOptions,
  getOrganizacoesOptions,
  statusPropostaEditalLabel,
  statusPropostaEditalTone,
  formatDateBr,
  formatBRLNumber,
  type PropostaEdital,
  type SimpleOption,
} from "@/data/propostasEdital";
import {
  getEquipesEditais,
  getColaboradoresOptions as getColaboradoresEquipeOptions,
  getIntegrantesOptions as getIntegrantesEquipeOptions,
  tipoPessoaLabel as tipoPessoaEquipeLabel,
  type EquipeEdital,
  type PessoaOption,
} from "@/data/equipeEdital";
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

type SortKey = "titulo" | "edital" | "projeto" | "agente" | "valor" | "submissao" | "status";

const PROPOSTA_EDITAL_NEXT_STEP_KEY =
  "aurit:propostas-edital:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

interface PropostaEditalNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  success:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${toneClass[statusPropostaEditalTone(value)] ?? toneClass.neutral
        }`}
    >
      {statusPropostaEditalLabel(value)}
    </span>
  );
}

export default function PropostasEdital() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PropostaEdital[]>([]);
  const [agentes, setAgentes] = useState<SimpleOption[]>([]);
  const [projetos, setProjetos] = useState<SimpleOption[]>([]);
  const [editais, setEditais] = useState<SimpleOption[]>([]);
  const [organizacoes, setOrganizacoes] = useState<SimpleOption[]>([]);
  const [equipesEdital, setEquipesEdital] = useState<EquipeEdital[]>([]);
  const [colaboradoresEquipe, setColaboradoresEquipe] = useState<
    PessoaOption[]
  >([]);
  const [integrantesEquipe, setIntegrantesEquipe] = useState<PessoaOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );
  const [nextStepCard, setNextStepCard] =
    useState<PropostaEditalNextStepCardData | null>(null);
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

        const data =
          await getPermissoesUsuarioLogadoPorModulo("PROPOSTAS_EDITAL");

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
    const raw = sessionStorage.getItem(PROPOSTA_EDITAL_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PropostaEditalNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(PROPOSTA_EDITAL_NEXT_STEP_KEY);

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
        propostasData,
        agentesData,
        projetosData,
        editaisData,
        organizacoesData,
        equipesData,
        colaboradoresEquipeData,
        integrantesEquipeData,
      ] = await Promise.all([
        getPropostasEditais(),
        getAgentesOptions(),
        getProjetosOptions(),
        getEditaisOptions(),
        getOrganizacoesOptions(),
        getEquipesEditais(),
        getColaboradoresEquipeOptions(),
        getIntegrantesEquipeOptions(),
      ]);

      setItems(propostasData);
      setAgentes(agentesData);
      setProjetos(projetosData);
      setEditais(editaisData);
      setOrganizacoes(organizacoesData);
      setEquipesEdital(equipesData);
      setColaboradoresEquipe(colaboradoresEquipeData);
      setIntegrantesEquipe(integrantesEquipeData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar propostas de edital.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const agenteNomeById = (id?: string) =>
    id ? agentes.find((a) => String(a.id) === String(id))?.nome ?? "—" : "—";

  const projetoNomeById = (id?: string) =>
    id ? projetos.find((p) => String(p.id) === String(id))?.nome ?? "—" : "—";

  const editalNome = (id?: string) =>
    id ? editais.find((e) => String(e.id) === String(id))?.nome ?? "—" : "—";

  const organizacaoNomeById = (id?: string | number | null) =>
    id
      ? organizacoes.find((o) => String(o.id) === String(id))?.nome ??
      `Organização ${id}`
      : "—";

  const pessoaEquipeNome = (membro: EquipeEdital) => {
    if (membro.tipoPessoa === "COLABORADOR") {
      return membro.colaborador
        ? colaboradoresEquipe.find(
          (c) => String(c.id) === String(membro.colaborador),
        )?.nome ?? "—"
        : "—";
    }

    if (membro.tipoPessoa === "INTEGRANTE") {
      return membro.integrante
        ? integrantesEquipe.find(
          (i) => String(i.id) === String(membro.integrante),
        )?.nome ?? "—"
        : "—";
    }

    return "—";
  };

  const equipeDaProposta = (propostaId?: string | number | null) => {
    if (!propostaId) return [];

    return equipesEdital
      .filter((membro) => String(membro.propostaEdital) === String(propostaId))
      .map((membro) => {
        const pessoa = pessoaEquipeNome(membro);
        const tipoPessoa = tipoPessoaEquipeLabel(membro.tipoPessoa);
        const funcao = membro.funcaoProjeto || "Função não informada";
        const carga =
          membro.cargaHorariaPrevista !== null &&
            membro.cargaHorariaPrevista !== undefined
            ? `${membro.cargaHorariaPrevista}h`
            : "Carga horária não informada";

        return `${pessoa} — ${tipoPessoa} — ${funcao} — ${carga}`;
      })
      .filter((item) => item && !item.startsWith("—"));
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return items;

    return items.filter((proposta) =>
      [
        proposta.tituloProjeto,
        proposta.resumoProjeto,
        proposta.justificativaProjeto,
        proposta.metodologiaExecucao,
        proposta.democratizacaoAcesso,
        proposta.acoesAcessibilidade,
        proposta.impactoEsperado,
        editalNome(proposta.edital),
        agenteNomeById(proposta.agente),
        projetoNomeById(proposta.projeto),
        organizacaoNomeById(proposta.organizacao),
        statusPropostaEditalLabel(proposta.statusPropostaEdital),
        formatBRLNumber(proposta.valorSolicitado),
        formatDateBr(proposta.dataSubmissao),
        proposta.motivoReprovacao,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [search, items, agentes, projetos, editais, organizacoes]);


  const { sortConfig, sortedItems, handleSort } = useSortableData(
    filtered,
    (proposta, key: SortKey) => {
      switch (key) {
        case "titulo":
          return proposta.tituloProjeto;
        case "edital":
          return editalNome(proposta.edital);
        case "projeto":
          return projetoNomeById(proposta.projeto);
        case "agente":
          return agenteNomeById(proposta.agente);
        case "valor":
          return Number(proposta.valorSolicitado || 0);
        case "submissao":
          return proposta.dataSubmissao ?? "";
        case "status":
          return statusPropostaEditalLabel(proposta.statusPropostaEdital);
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

  async function handleDelete() {
    if (!confirmDelete) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir propostas de edital.");
      setConfirmDelete(null);
      return;
    }

    try {
      await deletePropostaEdital(Number(confirmDelete));

      setItems((prev) => prev.filter((p) => p.id !== confirmDelete));
      toast.success("Proposta removida com sucesso.");
      setConfirmDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover proposta.";

      if (isPlanoAccessDenied(message)) {
        setAccessDeniedMessage(message);
        setConfirmDelete(null);
        return;
      }

      toast.error(message);
    }
  }

  async function handleExportPdf(proposta: PropostaEdital) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportPropostaEditalPdf({
      id: proposta.id,

      tituloProjeto: proposta.tituloProjeto,
      resumoProjeto: proposta.resumoProjeto,
      justificativa: proposta.justificativaProjeto,
      metodologiaExecucao: proposta.metodologiaExecucao,
      democratizacaoAcesso: proposta.democratizacaoAcesso,
      acoesAcessibilidade: proposta.acoesAcessibilidade,
      impactoEsperado: proposta.impactoEsperado,

      valorSolicitado: formatBRLNumber(proposta.valorSolicitado),
      valorContrapartida:
        proposta.valorContrapartida !== null &&
          proposta.valorContrapartida !== undefined
          ? formatBRLNumber(proposta.valorContrapartida)
          : "",

      dataSubmissao: proposta.dataSubmissao,
      statusPropostaEdital: statusPropostaEditalLabel(
        proposta.statusPropostaEdital,
      ),
      motivoReprovacao: proposta.motivoReprovacao,

      organizacao: organizacaoNomeById(proposta.organizacao),
      edital: editalNome(proposta.edital),
      projetoBase: projetoNomeById(proposta.projeto),
      agenteResponsavel: agenteNomeById(proposta.agente),

      equipeEdital: equipeDaProposta(proposta.id),
    } as any);
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
          title="Proposta de Edital"
          tooltip="Cadastre a proposta que será inscrita no edital, reunindo informações do projeto, justificativa, metodologia, acessibilidade, impacto esperado, valores, responsáveis e vínculos institucionais. Esta página ajuda a estruturar a candidatura antes do envio oficial."
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
                aria-label="Buscar proposta"
              />
            </div>

            {podeCriar && (
              <Button
                onClick={() => navigate("/propostas-edital/novo")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Proposta
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
                    label="Título do projeto"
                    sortKey="titulo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Edital"
                    sortKey="edital"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Projeto base"
                    sortKey="projeto"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Agente responsável"
                    sortKey="agente"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Valor solicitado"
                    sortKey="valor"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Data de submissão"
                    sortKey="submissao"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  />

                  <SortableHeader
                    label="Status da proposta"
                    sortKey="status"
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
                {paginated.map((proposta) => (
                  <tr
                    key={proposta.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5">
                      <div className="flex items-center gap-1">
                        <TableActionIcon
                          icon={Eye}
                          label="Visualizar"
                          onClick={() =>
                            navigate(`/propostas-edital/${proposta.id}`)
                          }
                        />

                        {podeEditar && (
                          <TableActionIcon
                            icon={Pencil}
                            label="Editar"
                            onClick={() =>
                              navigate(
                                `/propostas-edital/${proposta.id}/editar`,
                              )
                            }
                          />
                        )}

                        <TableActionIcon
                          icon={Users}
                          label="Ver equipe"
                          onClick={() =>
                            navigate(`/equipe-edital?proposta=${proposta.id}`)
                          }
                        />

                        <TableActionIcon
                          icon={ClipboardCheck}
                          label="Ver habilitação"
                          onClick={() =>
                            navigate(
                              `/habilitacoes-propostas?proposta=${proposta.id}`,
                            )
                          }
                        />

                        {podeExcluir && (
                          <TableActionIcon
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => setConfirmDelete(proposta.id)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={proposta.tituloProjeto} bold>
                        {proposta.tituloProjeto}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText text={editalNome(proposta.edital)} muted>
                        {editalNome(proposta.edital)}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={projetoNomeById(proposta.projeto)}
                        muted
                      >
                        {projetoNomeById(proposta.projeto)}
                      </TableCellText>
                    </td>

                    <td className="px-6 py-2.5">
                      <TableCellText
                        text={agenteNomeById(proposta.agente)}
                        muted
                      >
                        {agenteNomeById(proposta.agente)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatBRLNumber(proposta.valorSolicitado)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <TableCellText
                        text={formatDateBr(proposta.dataSubmissao)}
                        muted
                      >
                        {formatDateBr(proposta.dataSubmissao)}
                      </TableCellText>
                    </td>

                    <td className="whitespace-nowrap px-6 py-2.5">
                      <StatusBadge value={proposta.statusPropostaEdital} />
                    </td>

                    {podeGerarPdf && (
                      <td className="whitespace-nowrap px-6 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(proposta)}
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
                  <tr>
                    <td
                      colSpan={podeGerarPdf ? 9 : 8}
                      className="px-5 py-16 text-center"
                    >
                      <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma proposta cadastrada.
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
                <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/40" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma proposta encontrada.
                </p>
              </div>
            ) : (
              paginated.map((proposta) => (
                <div key={proposta.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() =>
                          navigate(`/propostas-edital/${proposta.id}`)
                        }
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() =>
                            navigate(
                              `/propostas-edital/${proposta.id}/editar`,
                            )
                          }
                        />
                      )}

                      <TableActionIcon
                        icon={Users}
                        label="Ver equipe"
                        onClick={() =>
                          navigate(`/equipe-edital?proposta=${proposta.id}`)
                        }
                      />

                      <TableActionIcon
                        icon={ClipboardCheck}
                        label="Ver habilitação"
                        onClick={() =>
                          navigate(
                            `/habilitacoes-propostas?proposta=${proposta.id}`,
                          )
                        }
                      />

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDelete(proposta.id)}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge value={proposta.statusPropostaEdital} />

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(proposta)}
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="font-medium text-foreground">
                    {proposta.tituloProjeto}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {editalNome(proposta.edital)}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Projeto base</p>
                      <p className="text-foreground">
                        {projetoNomeById(proposta.projeto)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Agente</p>
                      <p className="text-foreground">
                        {agenteNomeById(proposta.agente)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Valor solicitado</p>
                      <p className="font-medium tabular-nums text-foreground">
                        {formatBRLNumber(proposta.valorSolicitado)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Submissão</p>
                      <p className="text-foreground">
                        {formatDateBr(proposta.dataSubmissao)}
                      </p>
                    </div>
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
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover proposta?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso a proposta esteja vinculada
              a habilitação, equipe, planejamento financeiro ou prestação de
              contas, o backend pode impedir a exclusão para preservar o
              histórico.
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
        pageTitle="Propostas de Edital"
        href="https://www.aurit.com.br/wiki/editais/propostas-de-edital"
      />
    </AppLayout>
  );
}
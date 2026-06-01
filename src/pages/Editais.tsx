import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleDollarSign,
  Eye,
  FileStack,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  Info,
  FileDown,
  UserRound,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { TableActionIcon } from "@/components/TableActionIcon";
import { TableCellText } from "@/components/TableCellText";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { TablePagination } from "@/components/TablePagination";
import { NextStepCard } from "@/components/NextStepCard";
import { usePagination } from "@/hooks/usePagination";
import { copyTableFromRef } from "@/lib/copyTableDom";
import { exportEditalPdf } from "@/lib/pdfExporters";
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
  buildEditalPayload,
  createEdital,
  createEmptyEdital,
  deleteEdital,
  getEditais,
  type EditalData,
  esferaEditalLabel,
  esferaEditalOptions,
  statusEditalLabel,
  statusEditalOptions,
  updateEdital,
} from "@/data/editais";
import {
  getAgentesOptions,
  type SimpleOption,
} from "@/data/propostasEdital";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const EDITAIS_NEXT_STEP_KEY = "aurit:editais:next-step-card";
const NEXT_STEP_DURATION_MS = 60_000;

type FormMode = "create" | "edit" | "view";
type EditalForm = EditalData;

interface OrganizacaoOption {
  id: string;
  nome: string;
}

interface EditaisNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

const requiredFields: Array<[keyof EditalForm, string]> = [
  ["nomeEdital", "Nome do edital"],
  ["orgaoResponsavel", "Órgão responsável"],
  ["anoEdital", "Ano do edital"],
  ["esferaEdital", "Esfera do edital"],
  ["statusEdital", "Status do edital"],
  ["agenteId", "Agente responsável"],
];

function criarProximaAcaoEdital(): EditaisNextStepCardData {
  return {
    titulo: "Após cadastrar o edital, estruture a proposta de participação",
    descricao:
      "A proposta de edital reúne o projeto inscrito, agente responsável, justificativa, metodologia, acessibilidade, impacto esperado, valores e vínculos institucionais.",
    acaoLabel: "Cadastrar proposta",
    acaoUrl: "/propostas-edital/novo",
    acaoSecundariaLabel: "Ver editais",
    acaoSecundariaUrl: "/editais",
    variante: "pendente",
  };
}

function salvarProximaAcaoEdital() {
  sessionStorage.setItem(
    EDITAIS_NEXT_STEP_KEY,
    JSON.stringify(criarProximaAcaoEdital()),
  );
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

function pickFirstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

async function getOrganizacoesOptions(): Promise<OrganizacaoOption[]> {
  const response = await fetch(`${API_URL}/organizacoes`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json();

  return (Array.isArray(data) ? data : [])
    .filter((item: any) => item.id !== null && item.id !== undefined)
    .map((item: any) => ({
      id: String(item.id),
      nome:
        pickFirstText(
          item.nomeFantasia,
          item.razaoSocial,
          item.nomeOrganizacao,
          item.nome,
        ) || `Organização ${item.id}`,
    }));
}

const onlyDigits = (value: string, max = 4) =>
  value.replace(/\D/g, "").slice(0, max);

const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const number = Number(digits) / 100;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value?: string) => {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function Editais() {
  const tableRef = useRef<HTMLTableElement>(null);

  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [agentes, setAgentes] = useState<SimpleOption[]>([]);
  const [items, setItems] = useState<EditalData[]>([]);
  const [form, setForm] = useState<EditalForm>(() => createEmptyEdital());
  const [mode, setMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextStepCard, setNextStepCard] =
    useState<EditaisNextStepCardData | null>(null);
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  const podeVisualizar = permissoes.VISUALIZAR;
  const podeCriar = permissoes.CRIAR;
  const podeEditar = permissoes.EDITAR;
  const podeExcluir = permissoes.EXCLUIR;
  const podeGerarPdf = permissoes.GERAR_PDF || permissoes.BAIXAR;

  const readOnly = mode === "view";

  const setField = <K extends keyof EditalForm>(
    key: K,
    value: EditalForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let active = true;

    async function carregarPermissoes() {
      try {
        setLoadingPermissoes(true);

        const data = await getPermissoesUsuarioLogadoPorModulo("EDITAIS");

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
    const raw = sessionStorage.getItem(EDITAIS_NEXT_STEP_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as EditaisNextStepCardData;
      setNextStepCard(parsed);
    } catch {
      setNextStepCard(null);
    }

    sessionStorage.removeItem(EDITAIS_NEXT_STEP_KEY);
  }, []);

  useEffect(() => {
    if (!nextStepCard) return;

    const timer = window.setTimeout(() => {
      setNextStepCard(null);
    }, NEXT_STEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nextStepCard]);

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

      const [editaisData, organizacoesData, agentesData] = await Promise.all([
        getEditais(),
        getOrganizacoesOptions(),
        getAgentesOptions(),
      ]);

      setItems(editaisData);
      setOrganizacoes(organizacoesData);

      setAgentes(
        (agentesData ?? [])
          .map((agente) => ({
            id: String(agente.id),
            nome: agente.nome?.trim() || `Agente ${agente.id}`,
          }))
          .filter((agente) => agente.id),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar editais.",
      );
    } finally {
      setLoading(false);
    }
  }

  const nomeOrganizacao = (organizacaoId: string) =>
    organizacaoId
      ? organizacoes.find((entry) => String(entry.id) === String(organizacaoId))
        ?.nome ?? "—"
      : "—";

  const nomeAgente = (agenteId: string) =>
    agenteId
      ? agentes.find((entry) => String(entry.id) === String(agenteId))?.nome ??
      "—"
      : "—";

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return items;

    return items.filter((item) => {
      return [
        item.nomeEdital,
        item.numeroEdital,
        item.numeroInscricao,
        item.orgaoResponsavel,
        item.anoEdital,
        esferaEditalLabel(item.esferaEdital),
        statusEditalLabel(item.statusEdital),
        nomeOrganizacao(item.organizacaoId),
        nomeAgente(item.agenteId),
        formatDate(item.dataAbertura),
        formatDate(item.dataEncerramento),
        formatDate(item.dataResultado),
        item.valorTotalDisponivel,
        item.observacao,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, organizacoes, agentes, search]);

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

  const handleNew = () => {
    if (!podeCriar) {
      toast.error("Você não possui permissão para criar editais.");
      return;
    }

    setSelectedId(null);
    setForm(createEmptyEdital());
    setMode("create");
    setShowForm(true);
    setNextStepCard(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedId(null);
    setMode("create");
    setForm(createEmptyEdital());
  };

  const openRecord = (record: EditalData, nextMode: FormMode) => {
    if (nextMode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar editais.");
      return;
    }

    setSelectedId(record.id);
    setForm(record);
    setMode(nextMode);
    setShowForm(true);
    setNextStepCard(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (readOnly) return;

    if (mode === "create" && !podeCriar) {
      toast.error("Você não possui permissão para criar editais.");
      return;
    }

    if (mode === "edit" && !podeEditar) {
      toast.error("Você não possui permissão para editar editais.");
      return;
    }

    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? "").trim(),
    );

    if (missing) {
      toast.error(`Preencha o campo: ${missing[1]}.`);
      return;
    }

    if (form.anoEdital.length !== 4) {
      toast.error("Informe um ano válido para o edital. Ex.: 2026.");
      return;
    }

    if (
      form.linkEdital.trim() &&
      !/^https?:\/\//i.test(form.linkEdital.trim())
    ) {
      toast.error("Informe um link válido, começando com http:// ou https://.");
      return;
    }

    if (
      form.dataAbertura &&
      form.dataEncerramento &&
      form.dataEncerramento < form.dataAbertura
    ) {
      toast.error(
        "A data de encerramento não pode ser anterior à data de abertura.",
      );
      return;
    }

    if (
      form.dataResultado &&
      form.dataAbertura &&
      form.dataResultado < form.dataAbertura
    ) {
      toast.error(
        "A data de resultado não pode ser anterior à data de abertura.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = buildEditalPayload(form);

      if (mode === "edit" && selectedId) {
        await updateEdital(Number(selectedId), payload);
        toast.success("Edital salvo com sucesso.");
      } else {
        await createEdital(payload);
        salvarProximaAcaoEdital();
        setNextStepCard(criarProximaAcaoEdital());
        toast.success("Edital cadastrado com sucesso.");
      }

      await carregarDados();
      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar edital.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    if (!podeExcluir) {
      toast.error("Você não possui permissão para excluir editais.");
      setConfirmDeleteId(null);
      return;
    }

    try {
      await deleteEdital(Number(confirmDeleteId));
      await carregarDados();

      if (selectedId === confirmDeleteId) {
        handleCancel();
      }

      setConfirmDeleteId(null);
      toast.success("Edital excluído com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir edital.",
      );
    }
  };

  async function handleExportPdf(item: EditalData) {
    if (!podeGerarPdf) {
      toast.error("Você não possui permissão para gerar PDF.");
      return;
    }

    await exportEditalPdf({
      id: item.id,

      nomeEdital: item.nomeEdital,
      numeroEdital: item.numeroEdital,
      numeroInscricao: item.numeroInscricao,
      anoEdital: item.anoEdital,

      orgaoResponsavel: item.orgaoResponsavel,
      linkEdital: item.linkEdital,

      dataAbertura: item.dataAbertura,
      dataEncerramento: item.dataEncerramento,
      dataResultado: item.dataResultado,

      valorTotalDisponivel: item.valorTotalDisponivel,

      esferaEdital: esferaEditalLabel(item.esferaEdital),
      statusEdital: statusEditalLabel(item.statusEdital),

      observacao: item.observacao,
      organizacao: nomeOrganizacao(item.organizacaoId),
      agente: nomeAgente(item.agenteId),
    });
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
      <div
        className={`container ${showForm ? "max-w-4xl" : "max-w-7xl"
          } py-6 sm:py-8`}
      >
        {showForm && (
          <button
            type="button"
            onClick={handleCancel}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        <PageTitle
          title="Editais"
          tooltip="Cadastre e acompanhe editais, chamadas públicas e oportunidades mapeadas pela organização. Registre órgão responsável, ano, datas, valores, status, número de inscrição, agente responsável e observações para manter o histórico institucional e orientar futuras propostas."
        />

        {!showForm && nextStepCard && (
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

        {showForm ? (
          <>
            {readOnly && (
              <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Esta tela está em modo de visualização. Para alterar os dados,
                utilize a opção Editar disponível no menu{" "}
                <span className="font-semibold">Ações</span>.
              </div>
            )}

            <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
              <Info
                className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
                strokeWidth={2.2}
              />

              <p className="text-[13px] leading-relaxed text-foreground">
                Esta página registra o{" "}
                <span className="font-semibold">edital</span> como oportunidade
                ou processo seletivo. Para detalhar o projeto inscrito, agente
                proponente, equipe, orçamento, status da inscrição ou resultado
                da participação, utilize a página de Propostas de Edital.
              </p>
            </div>

            {!readOnly && <FormLegend />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Section icon={FileStack} title="Dados do edital">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="nomeEdital"
                      required={!readOnly}
                      tooltip="Informe o nome completo do edital conforme aparece no documento oficial. Ex.: Edital 04/2026 – Execução Cultural."
                    >
                      Nome do Edital
                    </FieldLabel>

                    <Input
                      id="nomeEdital"
                      value={form.nomeEdital}
                      onChange={(e) => setField("nomeEdital", e.target.value)}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="numeroEdital"
                      tooltip="Informe o número oficial do edital, chamada pública ou processo seletivo, quando houver. Ex.: 04/2026."
                    >
                      Número do Edital
                    </FieldLabel>

                    <Input
                      id="numeroEdital"
                      value={form.numeroEdital}
                      onChange={(e) => setField("numeroEdital", e.target.value)}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="numeroInscricao"
                      tooltip="Informe o número de inscrição, protocolo ou identificação da participação neste edital, quando houver."
                    >
                      Número de Inscrição
                    </FieldLabel>

                    <Input
                      id="numeroInscricao"
                      value={form.numeroInscricao}
                      onChange={(e) =>
                        setField("numeroInscricao", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="anoEdital"
                      required={!readOnly}
                      tooltip="Informe o ano de referência ou publicação do edital. Ex.: 2026."
                    >
                      Ano do Edital
                    </FieldLabel>

                    <Input
                      id="anoEdital"
                      value={form.anoEdital}
                      onChange={(e) =>
                        setField("anoEdital", onlyDigits(e.target.value))
                      }
                      inputMode="numeric"
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="orgaoResponsavel"
                      required={!readOnly}
                      tooltip="Informe o órgão, instituição, secretaria, fundação, empresa ou entidade responsável pela publicação do edital. Ex.: Secretaria Municipal de Cultura, Ministério da Cultura, fundação cultural ou instituto patrocinador."
                    >
                      Órgão Responsável
                    </FieldLabel>

                    <Input
                      id="orgaoResponsavel"
                      value={form.orgaoResponsavel}
                      onChange={(e) =>
                        setField("orgaoResponsavel", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="linkEdital"
                      tooltip="Informe o link oficial do edital, chamada pública ou página de inscrição, se houver."
                    >
                      Link do Edital
                    </FieldLabel>

                    <Input
                      id="linkEdital"
                      value={form.linkEdital}
                      onChange={(e) => setField("linkEdital", e.target.value)}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={CircleDollarSign} title="Acompanhamento e valores">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="dataAbertura"
                      tooltip="Informe a data de abertura das inscrições ou do início do período de acompanhamento do edital."
                    >
                      Data de Abertura
                    </FieldLabel>

                    <Input
                      id="dataAbertura"
                      type="date"
                      value={form.dataAbertura}
                      onChange={(e) =>
                        setField("dataAbertura", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataEncerramento"
                      tooltip="Informe a data de encerramento das inscrições do edital, quando houver."
                    >
                      Data de Encerramento
                    </FieldLabel>

                    <Input
                      id="dataEncerramento"
                      type="date"
                      value={form.dataEncerramento}
                      onChange={(e) =>
                        setField("dataEncerramento", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="dataResultado"
                      tooltip="Informe a data prevista ou divulgada do resultado do edital."
                    >
                      Data do Resultado
                    </FieldLabel>

                    <Input
                      id="dataResultado"
                      type="date"
                      value={form.dataResultado}
                      onChange={(e) =>
                        setField("dataResultado", e.target.value)
                      }
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="valorTotalDisponivel"
                      tooltip="Informe o valor total disponibilizado pelo edital como um todo, quando essa informação constar no documento oficial. Não confunda com o valor solicitado por uma proposta específica."
                    >
                      Valor Total Disponível
                    </FieldLabel>

                    <Input
                      id="valorTotalDisponivel"
                      value={form.valorTotalDisponivel}
                      onChange={(e) =>
                        setField(
                          "valorTotalDisponivel",
                          formatCurrency(e.target.value),
                        )
                      }
                      inputMode="decimal"
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="esferaEdital"
                      required={!readOnly}
                      tooltip="Selecione a esfera ou origem institucional do edital. Use “Municipal”, “Estadual” ou “Federal” para editais públicos; “Privado” para oportunidades de empresas, institutos ou fundações privadas; “Internacional” para chamadas de fora do país; e “Outro” quando nenhuma opção representar corretamente o edital."
                    >
                      Esfera do Edital
                    </FieldLabel>

                    <Select
                      value={form.esferaEdital}
                      onValueChange={(value) =>
                        setField("esferaEdital", value)
                      }
                      disabled={readOnly || saving}
                    >
                      <SelectTrigger id="esferaEdital">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {esferaEditalOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="statusEdital"
                      required={!readOnly}
                      tooltip="Indique a situação atual do edital no sistema. Use “Mapeado” para oportunidades identificadas, “Aberto” para editais com inscrições disponíveis, “Em Análise” quando o processo estiver em avaliação, “Resultado Publicado” quando houver divulgação oficial do resultado, “Encerrado” quando o prazo ou processo tiver terminado, “Cancelado” quando o edital for suspenso ou cancelado e “Arquivado” para manter o registro sem acompanhamento ativo."
                    >
                      Status do Edital
                    </FieldLabel>

                    <Select
                      value={form.statusEdital}
                      onValueChange={(value) =>
                        setField("statusEdital", value)
                      }
                      disabled={readOnly || saving}
                    >
                      <SelectTrigger id="statusEdital">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {statusEditalOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="observacao"
                      tooltip="Registre informações importantes sobre o edital, como pendências, documentos exigidos, etapas do processo, contatos, prazos internos ou observações gerais."
                    >
                      Observação
                    </FieldLabel>

                    <Textarea
                      id="observacao"
                      value={form.observacao}
                      onChange={(e) => setField("observacao", e.target.value)}
                      rows={4}
                      disabled={readOnly || saving}
                      readOnly={readOnly}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={Landmark} title="Vinculação institucional">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="organizacao"
                      tooltip="Selecione a organização vinculada ao edital, quando necessário. Caso não informe, o backend poderá resolver o vínculo pela empresa logada."
                    >
                      Organização
                    </FieldLabel>

                    <Select
                      value={form.organizacaoId || "NONE"}
                      onValueChange={(value) =>
                        setField(
                          "organizacaoId",
                          value === "NONE" ? "" : value,
                        )
                      }
                      disabled={readOnly || saving || organizacoes.length === 0}
                    >
                      <SelectTrigger id="organizacao">
                        <SelectValue placeholder="Selecione uma organização" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="NONE">
                          Selecione
                        </SelectItem>

                        {organizacoes.length === 0 ? (
                          <SelectItem value="sem-organizacao" disabled>
                            Nenhuma organização cadastrada
                          </SelectItem>
                        ) : (
                          organizacoes.map((organizacao) => (
                            <SelectItem
                              key={organizacao.id}
                              value={organizacao.id}
                            >
                              {organizacao.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="agente"
                      required={!readOnly}
                      tooltip="Selecione o agente responsável vinculado ao edital. Esse vínculo identifica quem responde ou acompanha institucionalmente esta oportunidade."
                    >
                      Agente Responsável
                    </FieldLabel>

                    <Select
                      value={form.agenteId}
                      onValueChange={(value) => setField("agenteId", value)}
                      disabled={readOnly || saving || agentes.length === 0}
                    >
                      <SelectTrigger id="agente">
                        <SelectValue placeholder="Selecione um agente" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {agentes.length === 0 ? (
                          <SelectItem value="sem-agente" disabled>
                            Nenhum agente cadastrado
                          </SelectItem>
                        ) : (
                          agentes.map((agente) => (
                            <SelectItem key={agente.id} value={agente.id}>
                              {agente.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  {readOnly ? "Voltar" : "Cancelar"}
                </Button>

                {!readOnly && (
                  <Button
                    type="submit"
                    className="sm:min-w-32"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                )}
              </div>
            </form>
          </>
        ) : (
          <div className="bg-card border border-border rounded">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                  aria-label="Buscar edital"
                />
              </div>

              {podeCriar && (
                <Button onClick={handleNew} className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Cadastrar Edital
                </Button>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table ref={tableRef} className="w-full min-w-[1480px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      className="w-[140px] whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      data-no-copy
                    >
                      Ações
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome do Edital
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Número do Edital
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Número de Inscrição
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Órgão Responsável
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ano
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Esfera
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status do Edital
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Organização
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Agente Responsável
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Data de Abertura
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Data de Encerramento
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Data do Resultado
                    </th>

                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Valor Total Disponível
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
                            onClick={() => openRecord(item, "view")}
                          />

                          {podeEditar && (
                            <TableActionIcon
                              icon={Pencil}
                              label="Editar"
                              onClick={() => openRecord(item, "edit")}
                            />
                          )}

                          {podeExcluir && (
                            <TableActionIcon
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => setConfirmDeleteId(item.id)}
                            />
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={item.nomeEdital} bold>
                          {item.nomeEdital}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {item.numeroEdital || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {item.numeroInscricao || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={item.orgaoResponsavel}>
                          {item.orgaoResponsavel}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {item.anoEdital}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                        {esferaEditalLabel(item.esferaEdital)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] font-medium text-foreground">
                        {statusEditalLabel(item.statusEdital)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText
                          text={nomeOrganizacao(item.organizacaoId)}
                        >
                          {nomeOrganizacao(item.organizacaoId)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5">
                        <TableCellText text={nomeAgente(item.agenteId)}>
                          {nomeAgente(item.agenteId)}
                        </TableCellText>
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDate(item.dataAbertura)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDate(item.dataEncerramento)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {formatDate(item.dataResultado)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-muted-foreground">
                        {item.valorTotalDisponivel || "—"}
                      </td>

                      {podeGerarPdf && (
                        <td className="whitespace-nowrap px-6 py-2.5">
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
                  ))}

                  {paginated.length === 0 && (
                    <EmptyRow colSpan={podeGerarPdf ? 15 : 14} />
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {paginated.length === 0 ? (
                <div className="p-10 text-center">
                  <FileStack className="mx-auto h-10 w-10 text-muted-foreground/40" />

                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum edital encontrado.
                  </p>
                </div>
              ) : (
                paginated.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="mb-3 flex items-center gap-1">
                      <TableActionIcon
                        icon={Eye}
                        label="Visualizar"
                        onClick={() => openRecord(item, "view")}
                      />

                      {podeEditar && (
                        <TableActionIcon
                          icon={Pencil}
                          label="Editar"
                          onClick={() => openRecord(item, "edit")}
                        />
                      )}

                      {podeExcluir && (
                        <TableActionIcon
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDeleteId(item.id)}
                        />
                      )}

                      {podeGerarPdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleExportPdf(item)}
                          className="ml-auto h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>

                    <p className="font-medium text-foreground">
                      {item.nomeEdital}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.numeroEdital || "Sem número"} ·{" "}
                      {item.numeroInscricao
                        ? `Inscrição ${item.numeroInscricao}`
                        : "Sem inscrição"}{" "}
                      · {item.orgaoResponsavel}
                    </p>

                    <p className="mt-2 text-sm text-foreground">
                      {nomeOrganizacao(item.organizacaoId)}
                    </p>

                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="h-3 w-3" />
                      {nomeAgente(item.agenteId)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.anoEdital}</span>
                      <span>• {esferaEditalLabel(item.esferaEdital)}</span>
                      <span>• {statusEditalLabel(item.statusEdital)}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Abertura: {formatDate(item.dataAbertura)}</span>
                      <span>
                        •{" "}
                        {item.valorTotalDisponivel ||
                          "Valor total não informado"}
                      </span>
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
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir edital?</AlertDialogTitle>

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

      <WikiFloatingButton
        pageTitle="Editais"
        href="https://www.aurit.com.br/wiki/editais/editais"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
          {title}
        </h2>
      </div>

      {children}
    </Card>
  );
}

function Field({
  children,
  full,
  className,
}: {
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <FileStack className="mx-auto h-10 w-10 text-muted-foreground/40" />

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum edital encontrado.
        </p>
      </td>
    </tr>
  );
}